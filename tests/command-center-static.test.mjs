import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../command-center/index.html', import.meta.url), 'utf8');
const client = await readFile(new URL('../command-center.js', import.meta.url), 'utf8');
const featureClient = await readFile(new URL('../command-center-features-2-4.js', import.meta.url), 'utf8');
const feature58Client = await readFile(new URL('../command-center-features-5-8.js', import.meta.url), 'utf8');
const feature912Client = await readFile(new URL('../command-center-features-9-12.js', import.meta.url), 'utf8');
const activity = await readFile(new URL('../command-center-activity.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../command-center.css', import.meta.url), 'utf8');
const featureCss = await readFile(new URL('../command-center-features-2-4.css', import.meta.url), 'utf8');
const feature58Css = await readFile(new URL('../command-center-features-5-8.css', import.meta.url), 'utf8');
const feature912Css = await readFile(new URL('../command-center-features-9-12.css', import.meta.url), 'utf8');
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

test('features 5-8 are wired as structured command-center tools', () => {
  assert.match(html, /command-center-features-5-8\.css/);
  assert.match(html, /command-center-features-5-8\.js/);
  assert.match(feature58Client, /Scenario Lab/);
  assert.match(feature58Client, /Transaction Simulator/);
  assert.match(feature58Client, /Set Availability/);
  assert.match(feature58Client, /Scheduling Optimizer/);
  assert.match(feature58Client, /Scout Opponent/);
  assert.match(feature58Client, /\/api\/ssl\/v1\/scenario/);
  assert.match(feature58Client, /\/api\/ssl\/v1\/transaction\/preview/);
  assert.match(feature58Client, /\/api\/ssl\/v1\/availability\?schedule_id=/);
  assert.match(feature58Client, /\/api\/ssl\/v1\/availability\/options/);
  assert.match(feature58Client, /\/api\/ssl\/v1\/scout/);
  assert.match(feature58Client, /out_player/);
  assert.match(feature58Client, /counterparty_player/);
  assert.match(feature58Client, /schedule_id/);
  assert.doesNotMatch(feature58Client, /innerHTML\s*=/);
});

test('feature 5-8 browser copy preserves server-authoritative boundaries', () => {
  assert.match(feature58Client, /Scenario Lab never changes standings or schedules/);
  assert.match(feature58Client, /Preview only/);
  assert.match(feature58Client, /never changes the official generated schedule/);
  assert.match(feature58Client, /Factual SSL data only/);
  assert.match(feature58Client, /Tiebreak status/);
  assert.match(feature58Client, /records|roster|salary/i);
});

test('Scout recent finalized form uses the canonical matchup payload key', () => {
  assert.match(feature58Client, /match\.matchup/);
  assert.doesNotMatch(feature58Client, /match\.opponent/);
});

test('feature 5-8 presentation is responsive and structured', () => {
  assert.match(feature58Css, /\.f58-form/);
  assert.match(feature58Css, /\.f58-stat-grid/);
  assert.match(feature58Css, /\.f58-boundary/);
  assert.match(feature58Css, /@media \(max-width: 680px\)/);
});

test('features 9-12 are wired as structured command-center surfaces', () => {
  assert.match(html, /command-center-features-9-12\.css/);
  assert.match(html, /command-center-features-9-12\.js/);
  assert.match(feature912Client, /Franchise Health/);
  assert.match(feature912Client, /State Integrity/);
  assert.match(feature912Client, /Game-Day Operations/);
  assert.match(feature912Client, /Ask SSL/);
  assert.match(feature912Client, /\/api\/ssl\/v1\/franchise\//);
  assert.match(feature912Client, /\/api\/ssl\/v1\/league/);
  assert.doesNotMatch(feature912Client, /innerHTML\s*=/);
});

test('features 9-12 preserve authority, provider, repair and broadcast-safe boundaries', () => {
  assert.match(feature912Client, /never auto-fixes/);
  assert.match(feature912Client, /Competitive repair remains a human-controlled canonical workflow/);
  assert.match(feature912Client, /not a second match engine/);
  assert.match(feature912Client, /Automatic detection is allowed/);
  assert.match(feature912Client, /Broadcast-safe ready/);
  assert.match(feature912Client, /never private lobby credentials/);
  assert.match(html, /GROQCLOUD/);
  assert.doesNotMatch(feature912Client, /XAI_API_KEY|GROG_LLM_API_KEY|GROQ_API_KEY/);
});

test('features 9-12 presentation is responsive and structured', () => {
  assert.match(feature912Css, /\.f912-stat-grid/);
  assert.match(feature912Css, /\.f912-row/);
  assert.match(feature912Css, /\.f912-boundary/);
  assert.match(feature912Css, /@media \(max-width: 620px\)/);
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
  assert.doesNotMatch(feature58Client, /SSL_WEB_BRIDGE_TOKEN|DISCORD_CLIENT_SECRET|SESSION_SIGNING_SECRET/);
  assert.doesNotMatch(feature912Client, /SSL_WEB_BRIDGE_TOKEN|DISCORD_CLIENT_SECRET|SESSION_SIGNING_SECRET|GROQ_API_KEY|GROG_LLM_API_KEY/);
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
