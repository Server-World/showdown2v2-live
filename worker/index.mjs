const DISCORD_API = "https://discord.com/api/v10";
const SESSION_COOKIE = "__Host-ssl_session";
const OAUTH_STATE_COOKIE = "__Host-ssl_oauth_state";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const STATE_TTL_SECONDS = 10 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function constantTimeTextEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function signPayload(secret, payload) {
  const encoded = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(secret, encoded);
  return `${encoded}.${signature}`;
}

async function verifyPayload(secret, token) {
  if (!token || !token.includes(".")) return null;
  const [encoded, signature] = token.split(".", 2);
  const expected = await hmac(secret, encoded);
  if (!constantTimeTextEqual(signature, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(decoder.decode(fromB64url(encoded)));
  } catch {
    return null;
  }
  if (!payload || Number(payload.exp || 0) <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const out = {};
  for (const pair of cookieHeader.split(";")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    out[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return out;
}

function cookie(name, value, { maxAge = null, sameSite = "Lax" } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "Secure",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];
  if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

function clearCookie(name) {
  return `${name}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function requiredEnv(env, names) {
  return names.filter((name) => !String(env[name] || "").trim());
}

function avatarUrl(user) {
  if (!user?.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
}

async function exchangeDiscordCode(env, code, redirectUri = "") {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
  });
  if (redirectUri) body.set("redirect_uri", redirectUri);
  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Discord token exchange rejected (${response.status})`);
  return response.json();
}

async function discordUser(accessToken) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Discord identity request rejected (${response.status})`);
  return response.json();
}

async function buildSession(env, user) {
  const now = Math.floor(Date.now() / 1000);
  return signPayload(env.SESSION_SIGNING_SECRET, {
    sub: String(user.id),
    username: String(user.global_name || user.username || "Discord member").slice(0, 100),
    avatar: user.avatar || null,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
}

async function csrfForSession(env, sessionToken) {
  return hmac(env.SESSION_SIGNING_SECRET, `csrf:${sessionToken}`);
}

async function getAuth(env, request) {
  const activityToken = request.headers.get("X-SSL-Activity-Session") || "";
  if (activityToken) {
    const payload = await verifyPayload(env.SESSION_SIGNING_SECRET, activityToken);
    if (payload) return { token: activityToken, payload, activity: true };
  }
  const token = parseCookies(request)[SESSION_COOKIE] || "";
  const payload = await verifyPayload(env.SESSION_SIGNING_SECRET, token);
  return payload ? { token, payload, activity: false } : null;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

async function requireWriteGuard(env, request, auth) {
  if (!sameOrigin(request)) return false;
  const supplied = request.headers.get("X-SSL-CSRF") || "";
  const expected = await csrfForSession(env, auth.token);
  return constantTimeTextEqual(supplied, expected);
}

function upstreamUrl(env, request) {
  const url = new URL(request.url);
  const prefix = "/api/ssl/";
  const relative = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : "";
  const base = String(env.SSL_API_BASE_URL || "").replace(/\/+$/g, "");
  return `${base}/${relative}${url.search}`;
}

async function proxyToSSL(env, request) {
  const auth = await getAuth(env, request);
  if (!auth) return json({ status: "unauthenticated" }, 401);
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (!(await requireWriteGuard(env, request, auth))) {
      return json({ status: "forbidden", message: "CSRF/origin validation failed." }, 403);
    }
  }
  if (requiredEnv(env, ["SSL_API_BASE_URL", "SSL_WEB_BRIDGE_TOKEN"]).length) {
    return json({ status: "unavailable", message: "SSL live bridge is not configured." }, 503);
  }

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${env.SSL_WEB_BRIDGE_TOKEN}`);
  headers.set("X-SSL-User-ID", auth.payload.sub);
  headers.set("X-SSL-Request-ID", request.headers.get("CF-Ray") || crypto.randomUUID());
  if (request.headers.get("Content-Type")) headers.set("Content-Type", request.headers.get("Content-Type"));

  let upstream;
  try {
    upstream = await fetch(upstreamUrl(env, request), {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
  } catch {
    return json({ status: "unavailable", message: "SSL live service is temporarily unreachable." }, 503);
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  const requestId = upstream.headers.get("X-SSL-Request-ID");
  if (requestId) responseHeaders.set("X-SSL-Request-ID", requestId);
  if ((contentType || "").startsWith("text/event-stream")) responseHeaders.set("Connection", "keep-alive");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

async function authLogin(env) {
  const missing = requiredEnv(env, [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "SESSION_SIGNING_SECRET",
  ]);
  if (missing.length) return json({ status: "unavailable", missing }, 503);
  const state = randomToken();
  const now = Math.floor(Date.now() / 1000);
  const stateToken = await signPayload(env.SESSION_SIGNING_SECRET, { state, exp: now + STATE_TTL_SECONDS });
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", env.DISCORD_REDIRECT_URI);
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "consent");
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": cookie(OAUTH_STATE_COOKIE, stateToken, { maxAge: STATE_TTL_SECONDS }),
      "Cache-Control": "no-store",
    },
  });
}

async function authCallback(env, request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const stateToken = parseCookies(request)[OAUTH_STATE_COOKIE] || "";
  const statePayload = await verifyPayload(env.SESSION_SIGNING_SECRET, stateToken);
  if (!code || !state || !statePayload || statePayload.state !== state) {
    return json({ status: "forbidden", message: "Discord OAuth state validation failed." }, 403);
  }
  try {
    const token = await exchangeDiscordCode(env, code, env.DISCORD_REDIRECT_URI);
    const user = await discordUser(token.access_token);
    const session = await buildSession(env, user);
    return new Response(null, {
      status: 302,
      headers: [
        ["Location", "/command-center/"],
        ["Set-Cookie", cookie(SESSION_COOKIE, session, { maxAge: SESSION_TTL_SECONDS })],
        ["Set-Cookie", clearCookie(OAUTH_STATE_COOKIE)],
        ["Cache-Control", "no-store"],
      ],
    });
  } catch {
    return json({ status: "unavailable", message: "Discord sign-in could not be completed." }, 502);
  }
}

async function activityAuth(env, request) {
  if (!sameOrigin(request)) return json({ status: "forbidden" }, 403);
  const missing = requiredEnv(env, ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "SESSION_SIGNING_SECRET"]);
  if (missing.length) return json({ status: "unavailable", missing }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ status: "invalid_request" }, 400);
  }
  const code = String(body?.code || "").trim();
  if (!code) return json({ status: "invalid_request", message: "code is required" }, 400);
  try {
    // The Embedded App SDK handles its redirect internally; Discord's official
    // Activity flow exchanges the returned code without redirect_uri.
    const token = await exchangeDiscordCode(env, code);
    const user = await discordUser(token.access_token);
    const webSession = await buildSession(env, user);
    return json({
      status: "ok",
      access_token: token.access_token,
      expires_in: token.expires_in,
      web_session: webSession,
      user: {
        id: String(user.id),
        name: String(user.global_name || user.username || "Discord member"),
        avatar_url: avatarUrl(user),
      },
    });
  } catch {
    return json({ status: "unavailable", message: "Discord Activity authentication failed." }, 502);
  }
}

async function sessionInfo(env, request) {
  const auth = await getAuth(env, request);
  if (!auth) return json({ authenticated: false }, 401);
  const csrf = await csrfForSession(env, auth.token);
  const avatar = auth.payload.avatar
    ? `https://cdn.discordapp.com/avatars/${auth.payload.sub}/${auth.payload.avatar}.webp?size=128`
    : null;
  return json({
    authenticated: true,
    csrf,
    activity: auth.activity,
    user: { id: auth.payload.sub, name: auth.payload.username, avatar_url: avatar },
  });
}

function logout(request) {
  if (!sameOrigin(request)) return json({ status: "forbidden" }, 403);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/command-center/",
      "Set-Cookie": clearCookie(SESSION_COOKIE),
      "Cache-Control": "no-store",
    },
  });
}

function publicConfig(env) {
  return json({
    discord_client_id: String(env.DISCORD_CLIENT_ID || ""),
    guild_id: String(env.SSL_DISCORD_GUILD_ID || ""),
    activity_enabled: String(env.SSL_ACTIVITY_ENABLED || "").toLowerCase() === "true",
  });
}

function addSecurityHeaders(response) {
  const next = new Response(response.body, response);
  next.headers.set("X-Content-Type-Options", "nosniff");
  next.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https://cdn.discordapp.com https://media.discordapp.net",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "connect-src 'self' https://discord.com https://cdn.discordapp.com",
      "frame-ancestors https://discord.com https://*.discord.com",
      "base-uri 'self'",
      "form-action 'self' https://discord.com",
    ].join("; "),
  );
  return next;
}

export const __test = {
  b64url,
  fromB64url,
  signPayload,
  verifyPayload,
  parseCookies,
  constantTimeTextEqual,
  upstreamUrl,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/auth/login" && request.method === "GET") return authLogin(env);
    if (url.pathname === "/api/auth/callback" && request.method === "GET") return authCallback(env, request);
    if (url.pathname === "/api/auth/activity" && request.method === "POST") return activityAuth(env, request);
    if (url.pathname === "/api/auth/logout" && request.method === "POST") return logout(request);
    if (url.pathname === "/api/session" && request.method === "GET") return sessionInfo(env, request);
    if (url.pathname === "/api/config" && request.method === "GET") return publicConfig(env);
    if (url.pathname.startsWith("/api/ssl/")) return proxyToSSL(env, request);
    const response = await env.ASSETS.fetch(request);
    return addSecurityHeaders(response);
  },
};
