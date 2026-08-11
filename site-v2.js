(function loadGoogleAnalytics() {
  const measurementId = 'G-N4H6G9T2L2';

  if (window.gtag || document.querySelector(`script[src*="${measurementId}"]`)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId);
})();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DISCORD = 'https://discord.gg/efdQJsceKb';
const LIVE_REFRESH_MS = 60_000;
const IDLE_REFRESH_MS = 300_000;
const DYNAMIC_PAGES = new Set(['home', 'matches', 'standings', 'stats', 'history']);

const pages = [
  ['home', 'Home', '/'],
  ['matches', 'Matches', '/matches/'],
  ['standings', 'Standings', '/standings/'],
  ['teams', 'Teams', '/teams/'],
  ['players', 'Players', '/players/'],
  ['stats', 'Stats', '/stats/'],
  ['history', 'History', '/history/'],
  ['league', 'League', '/league/'],
  ['news', 'News', '/news/'],
];

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const esc = value => String(value ?? '—').replace(/[&<>"']/g, char => ESCAPE_MAP[char]);
const norm = value => String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const phaseLabel = value => String(value ?? '').trim().replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
const tierCode = tier => ({
  mythic: 'MYT',
  legend: 'LEG',
  elite: 'ELI',
  contender: 'CON',
  rookie: 'ROO',
  amateur: 'AMA',
}[String(tier).toLowerCase()] || String(tier).slice(0, 3).toUpperCase());

const dateLabel = value => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const brand = () => `<img class="brand-logo" src="/assets/branding/ssl-logo.svg" alt=""><span class="brand-wordmark"><b><span class="orange">S</span>UPERSONIC <span class="orange">S</span>HOWDOWN</b><strong><span class="orange">L</span>EAGUE <span class="orange">2</span><span class="blue">v</span><span class="orange">2</span></strong></span>`;

function loadFixStyles() {
  if (document.querySelector('link[href="/competition-fixes.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/competition-fixes.css';
  document.head.appendChild(link);
}

function shell() {
  const current = document.body.dataset.page || 'home';
  document.body.insertAdjacentHTML('afterbegin', `<a class="skip-link" href="#main">Skip to content</a><div class="statusbar"><div class="wrap statusbar-in"><div class="left"><span class="brand-status">Supersonic Showdown League 2v2</span><span class="hide-mobile">Saturday match night · US-East</span></div><span class="mono">showdown2v2.live</span></div></div><header class="site-header"><div class="wrap nav"><a class="brand brand-lockup" href="/" aria-label="Supersonic Showdown League 2v2 home">${brand()}</a><button class="mobile-toggle" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="navlinks" aria-label="Primary navigation">${pages.map(([id, label, url]) => `<a href="${url}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav><div class="nav-actions"><a class="btn primary" href="${DISCORD}" target="_blank" rel="noopener noreferrer">Join Discord</a></div></div></header>`);
  document.body.insertAdjacentHTML('beforeend', `<footer class="site-footer"><div class="wrap footer-grid"><div><a class="brand brand-lockup" href="/" aria-label="Supersonic Showdown League 2v2 home">${brand()}</a><p class="legal">Independent community competition. Not affiliated with, endorsed by, or sponsored by Psyonix or Epic Games.</p><p class="footer-meta">© 2026 Supersonic Showdown League 2v2</p></div><nav class="footer-nav" aria-label="Footer navigation">${pages.slice(1).map(([, label, url]) => `<a href="${url}">${label}</a>`).join('')}</nav></div></footer>`);
}

function nav() {
  const button = $('.mobile-toggle');
  const links = $('.navlinks');
  if (!button || !links) return;

  const close = () => {
    links.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
  };

  button.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });

  links.addEventListener('click', event => {
    if (event.target.matches('a')) close();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
}

function tabs() {
  const buttons = $$('.tab[data-tier]');
  buttons.forEach(button => {
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(button.classList.contains('active')));
    button.addEventListener('click', () => {
      buttons.forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      renderStandings(button.dataset.tier);
    });
  });
}

let league = {};
let refreshTimer = null;
let refreshInFlight = false;
let lastSnapshotStamp = null;

const standingsRows = () => Object.entries(league.standings || {}).flatMap(([tier, rows]) => (rows || []).map(row => ({ ...row, tier })));

const scopedMatches = () => {
  const rows = [...(league.match_night?.matches || [])];
  const currentPhase = norm(league.season?.status);
  const currentWeek = Number(league.season?.week) || 0;
  if (!currentPhase && !currentWeek) return rows;

  const phaseRows = currentPhase ? rows.filter(match => norm(match.phase) === currentPhase) : rows;
  if (currentWeek) {
    const weekRows = phaseRows.filter(match => Number(match.week) === currentWeek);
    if (weekRows.length) return weekRows;
  }
  return phaseRows;
};

const finalMatches = () => scopedMatches().filter(match => norm(match.status) === 'final');

const matchMeta = match => {
  const bits = [];
  if (match.week) bits.push(`Week ${match.week}`);
  if (match.date) bits.push(dateLabel(match.date));
  if (match.phase) bits.push(phaseLabel(match.phase));
  return bits.join(' · ');
};

const orderedMatches = () => [...scopedMatches()].sort((a, b) => {
  const dateDelta = String(b.date || '').localeCompare(String(a.date || ''));
  if (dateDelta) return dateDelta;
  return Number(norm(a.status) === 'final') - Number(norm(b.status) === 'final');
});

function renderStandings(tier = 'mythic') {
  const body = $('#standings-body');
  if (!body) return;
  const rows = league.standings?.[tier] || [];
  if (!rows.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="8">No standings have been published for this division.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((row, index) => `<tr><td class="rank">${esc(row.rank ?? index + 1)}</td><td><strong>${esc(row.team)}</strong></td><td>${esc(row.wins)}</td><td>${esc(row.losses)}</td><td>${esc(row.win_pct)}</td><td>${esc(row.goals_for)}</td><td>${esc(row.goals_against)}</td><td>${esc(row.differential)}</td></tr>`).join('');
}

function renderMatches() {
  const box = $('#match-list');
  if (!box) return;
  const rows = orderedMatches().slice(0, 18);
  if (!rows.length) {
    box.innerHTML = '<div class="data-state"><strong>No current-week match slate is in the public feed.</strong><br>Use Discord for current scheduling and match-night coordination.</div>';
    return;
  }
  box.innerHTML = rows.map(match => `<div class="match-row"><div class="match-meta"><span class="tierlabel">${esc(match.tier)}</span><span class="match-sub">${esc(matchMeta(match) || 'League match')}</span></div><span class="tname">${esc(match.home)}</span><span class="scorebox">${esc(match.score || 'VS')}</span><span class="tname away">${esc(match.away)}</span><span class="state">${esc(match.status)}</span></div>`).join('');
}

function renderTeams() {
  const grid = $('#team-grid');
  if (!grid) return;
  const rows = league.teams || [];
  grid.innerHTML = rows.length
    ? rows.map(team => `<article class="card team-card" data-filterable style="--team-color:${esc(team.color || '#32C8FF')}"><div class="team-logo">${team.logo ? `<img src="${esc(team.logo)}" alt="${esc(team.franchise)} logo">` : esc(team.franchise_tag || 'SSL')}</div><span class="eyebrow">${esc(team.tier)}</span><h3>${esc(team.name)}</h3><div class="team-meta">${esc(team.franchise)}</div></article>`).join('')
    : '<div class="data-state" style="grid-column:1/-1"><strong>No public teams are listed for the current season.</strong></div>';
}

function renderPlayers() {
  const grid = $('#player-grid');
  if (!grid) return;
  const rows = league.players || [];
  if (rows.length) {
    grid.innerHTML = rows.map(player => `<article class="card player-tile" data-filterable><span class="eyebrow">${esc(player.tier)}</span><h3>${esc(player.gamertag)}</h3><div class="player-meta">${esc(player.team)} · ${esc(player.role || 'Player')}</div></article>`).join('');
    return;
  }
  grid.innerHTML = `<article class="card player-card-live" style="grid-column:1/-1"><span class="eyebrow">Available in Discord</span><h3>SSL player cards are active.</h3><p>Open a player profile through the SSL Bot to view league identity, team and tier, eligibility, season and career performance, latest match details, and awards.</p><div class="page-actions"><a class="btn primary" href="${DISCORD}" target="_blank" rel="noopener noreferrer">Open Discord</a><a class="btn ghost" href="/teams/">Browse current teams</a></div><p class="muted">Player names are published on this page only when the public roster export includes them. The card experience itself is available through the bot now.</p></article>`;
}

function renderPower() {
  const box = $('#power-list');
  if (!box) return;
  let rows = league.power_rankings || [];
  if (rows.length) {
    box.innerHTML = rows.map((row, index) => `<div class="leader-row"><span class="pos">${String(index + 1).padStart(2, '0')}</span><div><b>${esc(row.team)}</b><span>${esc(row.note || '')}</span></div><div class="value">${esc(row.score)}</div></div>`).join('');
    return;
  }
  rows = Object.entries(league.standings || {}).map(([tier, list]) => ({ tier, team: list?.[0]?.team, wins: list?.[0]?.wins, losses: list?.[0]?.losses })).filter(row => row.team);
  box.innerHTML = rows.map(row => `<div class="leader-row"><span class="pos division-code">${esc(tierCode(row.tier))}</span><div><b>${esc(row.team)}</b><span>${esc(phaseLabel(row.tier))} division leader</span></div><div class="value">${esc(row.wins)}-${esc(row.losses)}</div></div>`).join('');
}

function renderSeasonSummary() {
  const box = $('#season-summary');
  if (!box) return;
  const rows = standingsRows();
  const leaders = [...rows].sort((a, b) => (b.wins - a.wins) || (b.differential - a.differential));
  const top = leaders[0];
  box.innerHTML = `<div class="leader-row"><span class="pos">S</span><div><b>${esc(league.season?.name || 'Current season')}</b><span>${esc(phaseLabel(league.season?.status || 'active'))}</span></div><div class="value">Week ${esc(league.season?.week || '—')}</div></div><div class="leader-row"><span class="pos">T</span><div><b>${esc((league.teams || []).length)} teams</b><span>Across six divisions</span></div><div class="value">2v2</div></div><div class="leader-row"><span class="pos">M</span><div><b>${esc(finalMatches().length)} posted results</b><span>Current-week public results</span></div><div class="value">Final</div></div>${top ? `<div class="leader-row"><span class="pos">W</span><div><b>${esc(top.team)}</b><span>Most wins in the current table</span></div><div class="value">${esc(top.wins)}-${esc(top.losses)}</div></div>` : ''}`;
}

function renderHistory() {
  const box = $('#champion-list');
  if (!box) return;
  const rows = league.champions || [];
  if (rows.length) {
    box.innerHTML = rows.map(champion => `<article class="card record-card"><span>${esc(champion.season)}</span><b>${esc(champion.team)}</b><div class="muted">${esc(champion.tier || 'League champion')}</div></article>`).join('');
  } else {
    box.innerHTML = `<article class="card record-card"><span>Current competition</span><b>${esc(league.season?.name || 'Current season')}</b><div class="muted">Week ${esc(league.season?.week || '—')} · ${esc(phaseLabel(league.season?.status || 'active'))}</div></article><article class="card record-card"><span>Current week</span><b>${esc(finalMatches().length)} final results</b><div class="muted">Completed series currently present in the public feed</div></article>`;
  }

  const summary = $('#history-summary');
  if (!summary) return;
  const leaders = Object.entries(league.standings || {}).map(([tier, list]) => ({ tier, team: list?.[0]?.team, record: list?.[0] ? `${list[0].wins}-${list[0].losses}` : '—' })).filter(item => item.team);
  summary.innerHTML = leaders.map(item => `<article class="card record-card"><span>${esc(phaseLabel(item.tier))} leader</span><b>${esc(item.team)}</b><div class="muted">${esc(item.record)}</div></article>`).join('');
}

function renderNews() {
  const box = $('#news-grid');
  const rows = league.news || [];
  if (!box || !rows.length) return;
  box.innerHTML = rows.slice(0, 9).map((item, index) => `<article class="card news-card${index === 0 ? ' feature' : ''}"><span class="eyebrow">${esc(item.category || 'League news')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary)}</p><time>${esc(item.date)}</time></article>`).join('');
}

function filter() {
  const input = $('[data-filter]');
  if (!input) return;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    $$('[data-filterable]').forEach(card => {
      card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
    });
  });
}

function renderDynamic() {
  renderMatches();
  renderStandings($('.tab.active[data-tier]')?.dataset.tier || 'mythic');
  renderPower();
  renderSeasonSummary();
  renderHistory();
}

function renderAll() {
  renderDynamic();
  renderTeams();
  renderPlayers();
  renderNews();
}

const snapshotStamp = data => data?.generated_at || JSON.stringify([data?.season, data?.match_night, data?.standings]);
const dynamicPage = () => DYNAMIC_PAGES.has(document.body.dataset.page || 'home');

async function fetchSnapshot(cacheBust = false) {
  const suffix = cacheBust ? `?live=${Date.now()}` : '';
  const response = await fetch(`/data/league.json${suffix}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('league data unavailable');
  return response.json();
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (!dynamicPage()) return;
  const delay = league.match_night?.active ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
  refreshTimer = setTimeout(refreshLeague, delay);
}

async function refreshLeague() {
  if (refreshInFlight) return;
  if (document.hidden || !dynamicPage()) {
    scheduleRefresh();
    return;
  }

  refreshInFlight = true;
  try {
    const next = await fetchSnapshot(true);
    const stamp = snapshotStamp(next);
    if (stamp !== lastSnapshotStamp) {
      league = next;
      lastSnapshotStamp = stamp;
      renderDynamic();
    }
  } catch {
    // Keep the last known public snapshot on screen if a refresh fails.
  } finally {
    refreshInFlight = false;
    scheduleRefresh();
  }
}

async function start() {
  loadFixStyles();
  shell();
  nav();
  tabs();
  filter();

  try {
    league = await fetchSnapshot(false);
  } catch {
    league = {};
  }

  lastSnapshotStamp = snapshotStamp(league);
  renderAll();
  scheduleRefresh();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && dynamicPage()) {
    clearTimeout(refreshTimer);
    refreshLeague();
  }
});

start();
