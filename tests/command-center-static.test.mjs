import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../command-center/index.html', import.meta.url), 'utf8');
const client = await readFile(new URL('../command-center.js', import.meta.url), 'utf8');
const featureClient = await readFile(new URL('../command-center-features-2-4.js', import.meta.url), 'utf8');
const activity = await readFile(new URL('../command-center-activity.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../command-center.css', import.meta.url), 'utf8');
const featureCss = await readFile(new URL('../command-center-features-2-4.css', import.meta.url), 'utf8');
const worker = await readFile(new URL('../worker/index.mjs', import.meta.url), 'utf8');
const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const assetsIgnore = await readFile(new URL('../.assetsignore', import.meta.url), 'utf8');

test('command center exposes personal, tier, franchise and admin contexts', () => {
  assert.match(html, /My Command Center/);
  assert.match(html, /Tier Command Center/);
  assert.match(html, /Franchise Command Center/);
  assert.match(html, /League Command Center/);
  assert.match(html, /League Chat/);
  assert.match(html, /Ask SSL/);
});

test('client consumes server-owned capabilities and bounded live routes', () => {
  assert.match(client, /data\.capabilities/);
  assert.match(client, /\/api\/ssl\/v1\/scenario/);
  assert.match(client, /\/api\/ssl\/v1\/transaction\/preview/);
  assert.match(client, /\/api\/ssl\/v1\/availability/);
  assert.match(client, /\/api\/ssl\/v1\/chat\/channels/);
  assert.match(client, /\/api\/ssl\/v1\/events/);
  assert.doesNotMatch(client, /innerHTML\s*=/);
});

test('features 2-4 are wired as dedicated command-center surfaces', () => {
  assert.match(html, /command-center-features-2-4\.css/);
  assert.match(html, /command-center-features-2-4\.js/);
  assert.match(featureClient, /Match HQ/);
  assert.match(featureClient, /Career Passport/);
  assert.match(featureClient, /Milestones & Records/);
  assert.match(featureClient, /\/api\/ssl\/v1\/bootstrap/);
  assert.match(featureClient, /lobby_authorized/);
  assert.match(featureClient, /canonical Discord Match HQ workflow/);
  assert.match(featureClient, /performs zero writes/);
  assert.doesNotMatch(featureClient, /innerHTML\s*=/);
});

test('features 2-4 presentation includes responsive milestone and status treatment', () => {
  assert.match(featureCss, /\.f24-progress/);
  assert.match(featureCss, /\.f24-pill/);
  assert.match(featureCss, /\.f24-section\.sensitive/);
  assert.match(featureCss, /@media \(max-width: 640px\)/);
});

test('Activity shell uses a pinned Discord Embedded App SDK', () => {
  assert.match(activity, /embedded-app-sdk@2\.5\.0/);
  assert.match(activity, /commands\.authorize/);
  assert.match(activity, /commands\.authenticate/);
  assert.doesNotMatch(html, /type="importmap"/);
});

test('Worker keeps secrets server-side and uses signed sessions plus CSRF', () => {
  assert.match(worker, /SESSION_SIGNING_SECRET/);
  assert.match(worker, /SSL_WEB_BRIDGE_TOKEN/);
  assert.match(worker, /X-SSL-CSRF/);
  assert.match(worker, /X-SSL-User-ID/);
  assert.match(worker, /SameSite=/);
  assert.match(worker, /HttpOnly/);
  assert.match(worker, /Secure/);
  assert.doesNotMatch(html, /SSL_WEB_BRIDGE_TOKEN|DISCORD_CLIENT_SECRET|SESSION_SIGNING_SECRET/);
  assert.doesNotMatch(client, /SSL_WEB_BRIDGE_TOKEN|DISCORD_CLIENT_SECRET|SESSION_SIGNING_SECRET/);
  assert.doesNotMatch(featureClient, /SSL_WEB_BRIDGE_TOKEN|DISCORD_CLIENT_SECRET|SESSION_SIGNING_SECRET/);
});

test('Wrangler routes API and command center through Worker while excluding server files', () => {
  const config = JSON.parse(wrangler);
  assert.equal(config.main, 'worker/index.mjs');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.ok(config.assets.run_worker_first.includes('/api/*'));
  assert.ok(config.assets.run_worker_first.includes('/command-center/*'));
  assert.match(assetsIgnore, /^worker\/$/m);
  assert.match(assetsIgnore, /^tests\/$/m);
});

test('browser presentation is responsive and provider-correct', () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(html, /GROQCLOUD/);
  assert.doesNotMatch(html, /Available · Grok/);
});
