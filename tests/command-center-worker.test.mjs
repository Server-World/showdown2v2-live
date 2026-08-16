import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { __test } from '../worker/index.mjs';

const secret = 'test-secret-long-enough-for-hmac';

function futurePayload(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { sub: '123456789', username: 'Tester', iat: now, exp: now + 60, ...overrides };
}

test('signed sessions round-trip and reject tampering', async () => {
  const token = await __test.signPayload(secret, futurePayload());
  const payload = await __test.verifyPayload(secret, token);
  assert.equal(payload.sub, '123456789');
  assert.equal(await __test.verifyPayload(secret, `${token}x`), null);
});

test('expired sessions are rejected', async () => {
  const token = await __test.signPayload(secret, futurePayload({ exp: 1 }));
  assert.equal(await __test.verifyPayload(secret, token), null);
});

test('cookie parser returns named values', () => {
  const request = new Request('https://showdown2v2.live/', {
    headers: { Cookie: '__Host-ssl_session=abc%2E123; theme=dark' },
  });
  const cookies = __test.parseCookies(request);
  assert.equal(cookies['__Host-ssl_session'], 'abc.123');
  assert.equal(cookies.theme, 'dark');
});

test('SSL proxy path cannot override configured origin', () => {
  const env = { SSL_API_BASE_URL: 'https://bridge.example.internal/base/' };
  const request = new Request('https://showdown2v2.live/api/ssl/v1/tier/Legend?x=1');
  assert.equal(
    __test.upstreamUrl(env, request),
    'https://bridge.example.internal/base/v1/tier/Legend?x=1',
  );
});

test('constant-time comparison helper has exact semantics', () => {
  assert.equal(__test.constantTimeTextEqual('abc', 'abc'), true);
  assert.equal(__test.constantTimeTextEqual('abc', 'abd'), false);
  assert.equal(__test.constantTimeTextEqual('abc', 'abcd'), false);
});

test('unauthenticated SSL proxy is denied before reaching upstream', async () => {
  const response = await worker.fetch(
    new Request('https://showdown2v2.live/api/ssl/v1/bootstrap'),
    { ASSETS: { fetch: () => new Response('asset') } },
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { status: 'unauthenticated' });
});

test('cross-origin logout is rejected', async () => {
  const response = await worker.fetch(
    new Request('https://showdown2v2.live/api/auth/logout', {
      method: 'POST',
      headers: { Origin: 'https://attacker.example' },
    }),
    { ASSETS: { fetch: () => new Response('asset') } },
  );
  assert.equal(response.status, 403);
});

test('public config never exposes secret values', async () => {
  const response = await worker.fetch(
    new Request('https://showdown2v2.live/api/config'),
    {
      DISCORD_CLIENT_ID: 'public-client',
      SSL_DISCORD_GUILD_ID: 'guild-1',
      SSL_ACTIVITY_ENABLED: 'true',
      DISCORD_CLIENT_SECRET: 'do-not-leak',
      SSL_WEB_BRIDGE_TOKEN: 'do-not-leak-either',
      ASSETS: { fetch: () => new Response('asset') },
    },
  );
  const body = await response.json();
  assert.deepEqual(body, {
    discord_client_id: 'public-client',
    guild_id: 'guild-1',
    activity_enabled: true,
  });
});
