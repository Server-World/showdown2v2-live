const params = new URLSearchParams(window.location.search);
const looksEmbedded = params.has("frame_id") || params.has("instance_id") || params.has("channel_id");

window.sslActivitySession = null;
window.sslDiscordSdk = null;
window.sslActivityAuthPromise = (async () => {
  if (!looksEmbedded) return null;

  let config;
  try {
    const response = await fetch("/api/config", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    config = await response.json();
  } catch {
    return null;
  }
  if (!config?.activity_enabled || !config?.discord_client_id) return null;

  try {
    const { DiscordSDK } = await import("https://cdn.jsdelivr.net/npm/@discord/embedded-app-sdk@2.5.0/+esm");
    const sdk = new DiscordSDK(config.discord_client_id);
    await sdk.ready();
    const authorization = await sdk.commands.authorize({
      client_id: config.discord_client_id,
      response_type: "code",
      state: "ssl-command-center",
      prompt: "none",
      scope: ["identify"],
    });
    if (!authorization?.code) throw new Error("Discord Activity did not return an authorization code.");

    const response = await fetch("/api/auth/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: authorization.code }),
    });
    if (!response.ok) throw new Error("Activity authentication exchange failed.");
    const auth = await response.json();
    if (!auth?.access_token || !auth?.web_session) throw new Error("Activity authentication was incomplete.");

    await sdk.commands.authenticate({ access_token: auth.access_token });
    window.sslActivitySession = auth.web_session;
    window.sslDiscordSdk = sdk;
    document.documentElement.dataset.sslActivity = "true";
    return auth;
  } catch (error) {
    console.warn("SSL Activity bootstrap unavailable", error);
    return null;
  }
})();
