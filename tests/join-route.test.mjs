import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const config = JSON.parse(fs.readFileSync(new URL('../join-config.json', import.meta.url), 'utf8'));
const html = fs.readFileSync(new URL('../join/index.html', import.meta.url), 'utf8');

const expectedSources = ['website', 'twitch', 'partner', 'social', 'referral', 'event', 'direct'];

test('join destination is centralized and restricted to Discord HTTPS', () => {
  const destination = new URL(config.discord_invite);
  assert.equal(destination.protocol, 'https:');
  assert.ok(['discord.gg', 'www.discord.gg', 'discord.com', 'www.discord.com'].includes(destination.hostname));
  assert.deepEqual(config.allowed_sources, expectedSources);
  assert.equal(config.default_source, 'direct');
  assert.equal(html.includes('https://discord.gg/'), false, 'join page must not duplicate the configured invite');
  assert.match(html, /fetch\(configUrl/);
});

test('join route records attribution before redirect and has a failure-safe', () => {
  assert.match(html, /event:\s*'join_discord'/);
  assert.match(html, /join_source:\s*source/);
  assert.match(html, /join_campaign:\s*campaign/);
  assert.match(html, /window\.setTimeout\(\(\) => window\.location\.replace\(destination\), 650\)/);
  assert.match(html, /Discord could not be opened automatically/);
  assert.match(html, /allowed\.has\(requestedSource\)/);
});
