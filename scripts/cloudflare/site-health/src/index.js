const DEFAULT_ORIGIN = 'https://showdown2v2.live';

const OK_PATHS = [
  '/', '/matches/', '/standings/', '/teams/', '/players/', '/stats/', '/history/',
  '/league/', '/news/', '/watch/', '/franchises/', '/join/', '/join-config.json',
  '/robots.txt', '/sitemap.xml',
  '/data/league.json', '/data/media.json', '/data/player-card-hitman.json', '/data/roster.json',
];

const PROTECTED_PATHS = [
  '/CNAME', '/.github/', '/scripts/', '/docs/', '/.wrangler/', '/cf-local.log',
  '/data/twitch.json', '/data/.twitch-refresh.enc', '/data/twitch-control.json',
  '/data/twitch-device-approval.json', '/data/twitch-bootstrap.json',
];

const JSON_FEEDS = new Set([
  '/join-config.json',
  '/data/league.json', '/data/media.json', '/data/player-card-hitman.json', '/data/roster.json',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectedStatus(path) {
  return PROTECTED_PATHS.includes(path) ? 404 : 200;
}

function requiredHomepageMarkers(text) {
  const markers = ['GTM-P65S83G6', 'application/ld+json', 'autoplay', 'muted', 'loop'];
  return markers.filter((marker) => !text.includes(marker));
}

function validateJoinConfig(text) {
  try {
    const config = JSON.parse(text);
    const destination = new URL(config.discord_invite || '');
    const allowedHosts = new Set(['discord.gg', 'www.discord.gg', 'discord.com', 'www.discord.com']);
    if (destination.protocol !== 'https:' || !allowedHosts.has(destination.hostname)) {
      return '/join-config.json: Discord destination is not an approved HTTPS host';
    }
    const sources = Array.isArray(config.allowed_sources) ? config.allowed_sources : [];
    if (!sources.includes('website') || !sources.includes('direct')) {
      return '/join-config.json: required website/direct attribution sources missing';
    }
    if (!sources.includes(config.default_source)) {
      return '/join-config.json: default_source is not present in allowed_sources';
    }
    return null;
  } catch {
    return '/join-config.json: response is not a valid join configuration';
  }
}

function validateJoinPage(text) {
  const markers = ['GTM-P65S83G6', '/join-config.json', "event: 'join_discord'", 'join_source', 'window.location.replace(destination)'];
  const missing = markers.filter((marker) => !text.includes(marker));
  return missing.length ? `/join/: required join marker missing: ${missing.join(', ')}` : null;
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { cache: 'no-store', ...options });
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    }
    await sleep(1000);
  }
  throw lastError || new Error('fetch failed');
}

async function checkPath(origin, path) {
  try {
    const response = await fetchWithRetry(`${origin}${path}`, { redirect: 'manual' });
    const expected = expectedStatus(path);
    if (response.status !== expected) return `${path}: expected HTTP ${expected}, got ${response.status}`;

    if (JSON_FEEDS.has(path) && response.status === 200) {
      const text = await response.text();
      try { JSON.parse(text); } catch { return `${path}: response is not valid JSON`; }
      if (path === '/join-config.json') return validateJoinConfig(text);
    }

    if (path === '/join/' && response.status === 200) {
      return validateJoinPage(await response.text());
    }

    if (path === '/robots.txt' && response.status === 200) {
      const text = await response.text();
      if (!text.includes('Sitemap:')) return '/robots.txt: Sitemap directive missing';
    }

    if (path === '/sitemap.xml' && response.status === 200) {
      const text = await response.text();
      if (!text.includes('https://showdown2v2.live/')) return '/sitemap.xml: canonical production URLs missing';
    }
    return null;
  } catch (error) {
    return `${path}: ${String(error)}`;
  }
}

async function checkHomepage(origin) {
  try {
    const response = await fetchWithRetry(`${origin}/`, { redirect: 'manual' });
    if (response.status !== 200) return [`/: expected HTTP 200, got ${response.status}`];
    const text = await response.text();
    return requiredHomepageMarkers(text).map((marker) => `/: required homepage marker missing: ${marker}`);
  } catch (error) {
    return [`/: ${String(error)}`];
  }
}

async function checkWwwRedirect() {
  try {
    const response = await fetchWithRetry('https://www.showdown2v2.live/players/?health=1', { redirect: 'manual' });
    if (response.status !== 301) return `www redirect: expected HTTP 301, got ${response.status}`;
    const location = response.headers.get('location') || '';
    if (location !== 'https://showdown2v2.live/players/?health=1') {
      return `www redirect: expected preserved path/query, got ${location || '(missing Location)'}`;
    }
    return null;
  } catch (error) {
    return `www redirect: ${String(error)}`;
  }
}

async function runBatched(items, batchSize, fn) {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    results.push(...await Promise.all(items.slice(index, index + batchSize).map(fn)));
  }
  return results;
}

async function runHealthCheck(env) {
  const origin = String(env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
  const paths = [...OK_PATHS.slice(1), ...PROTECTED_PATHS];
  const failures = (await runBatched(paths, 5, (path) => checkPath(origin, path))).filter(Boolean);
  failures.push(...await checkHomepage(origin));
  const wwwFailure = await checkWwwRedirect();
  if (wwwFailure) failures.push(wwwFailure);

  const summary = {
    event: 'ssl_site_health',
    checkedAt: new Date().toISOString(),
    healthy: failures.length === 0,
    failureCount: failures.length,
    failures,
  };
  console.log(JSON.stringify(summary));
  return summary;
}

export default {
  async scheduled(_controller, env) {
    const summary = await runHealthCheck(env);
    if (!summary.healthy) {
      throw new Error(`SSL site health failed: ${summary.failures.slice(0, 5).join(' | ')}`);
    }
  },
};

export { expectedStatus, requiredHomepageMarkers, validateJoinConfig, validateJoinPage, runHealthCheck };
