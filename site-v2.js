const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const DISCORD = 'https://discord.gg/efdQJsceKb';
const LIVE_REFRESH_MS = 60_000;
const IDLE_REFRESH_MS = 300_000;
const DYNAMIC_PAGES = new Set(['home', 'matches', 'standings', 'teams', 'players', 'stats', 'history', 'news']);

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
const displayZone = value => String(value ?? '').replace(/\b(?:EST|EDT)\b/g, 'ET');
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

const snapshotDateLabel = value => {
  if (!value) return 'Public snapshot';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Public snapshot';
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const brand = () => `<img class="brand-logo" src="/assets/branding/ssl-logo.svg" alt=""><span class="brand-wordmark"><b><span class="orange">S</span>UPERSONIC <span class="orange">S</span>HOWDOWN</b><strong><span class="orange">L</span>EAGUE <span class="orange">2</span><span class="blue">v</span><span class="orange">2</span></strong></span>`;

function loadEnhancementStyles() {
  for (const href of ['/competition-fixes.css', '/site-audit.css']) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

function pushAnalytics(event, detail = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, page_path: window.location.pathname, ...detail });
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

function analytics() {
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const locationName = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content';
    if (href.includes('discord.gg')) {
      pushAnalytics('join_discord', { link_location: locationName, link_text: link.textContent.trim() });
    } else if (href.startsWith('/matches')) {
      pushAnalytics('view_match_center', { link_location: locationName });
    } else if (href.startsWith('/players')) {
      pushAnalytics('view_players', { link_location: locationName });
    } else if (href.startsWith('/teams')) {
      pushAnalytics('view_teams', { link_location: locationName });
    } else if (/twitch\.tv/i.test(href)) {
      pushAnalytics('watch_twitch', { link_location: locationName, destination: href });
    }
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
      pushAnalytics('change_standings_division', { division: button.dataset.tier });
    });
  });
}

let league = {};
let refreshTimer = null;
let refreshInFlight = false;
let lastSnapshotStamp = null;

const standingsRows = () => Object.entries(league.standings || {}).flatMap(([tier, rows]) => (rows || []).map(row => ({ ...row, tier })));
const allMatches = () => [...(league.match_night?.matches || [])];

function seasonPhase() {
  const explicit = norm(league.season?.phase);
  if (explicit) return explicit;
  const status = norm(league.season?.status);
  const phases = ['regular_season', 'preseason', 'postseason', 'playoffs', 'playoff', 'championship'];
  return phases.find(phase => status.includes(phase)) || '';
}

function seasonStateLabel() {
  const raw = norm(league.season?.status);
  const phase = seasonPhase();
  const locked = raw.includes('locked');
  const base = phase ? phaseLabel(phase) : phaseLabel(raw || 'active');
  return locked && !/locked/i.test(base) ? `${base} · Locked` : base;
}

function strictCurrentMatches() {
  let rows = allMatches();
  const phase = seasonPhase();
  const week = Number(league.season?.week) || 0;
  if (phase) {
    rows = rows.filter(match => norm(match.phase) === phase);
  }
  if (week) {
    rows = rows.filter(match => Number(match.week) === week);
  }
  return rows;
}

function displayMatchScope() {
  const current = strictCurrentMatches();
  if (current.length) return { rows: current, mode: 'current' };

  const phase = seasonPhase();
  if (phase) {
    const phaseRows = allMatches().filter(match => norm(match.phase) === phase);
    if (phaseRows.length) return { rows: phaseRows, mode: 'phase' };
  }

  return { rows: allMatches(), mode: 'recent' };
}

const currentWeekFinals = () => strictCurrentMatches().filter(match => norm(match.status) === 'final');
const recordedFinals = () => allMatches().filter(match => norm(match.status) === 'final');

const matchMeta = match => {
  const bits = [];
  if (match.week) bits.push(`Week ${match.week}`);
  if (match.date) bits.push(dateLabel(match.date));
  if (match.time) bits.push(displayZone(match.time));
  if (match.phase) bits.push(phaseLabel(match.phase));
  return bits.join(' · ');
};

const orderedMatches = rows => [...rows].sort((a, b) => {
  const dateDelta = String(b.date || '').localeCompare(String(a.date || ''));
  if (dateDelta) return dateDelta;
  return String(b.time || '').localeCompare(String(a.time || ''));
});

function matchContext(mode) {
  const week = league.season?.week;
  if (mode === 'current') return `<div class="match-context current"><strong>${esc(league.season?.name || 'Current season')} · Week ${esc(week || '—')}</strong><span>Current published match slate and results.</span></div>`;
  if (mode === 'phase') return `<div class="match-context"><strong>${esc(seasonStateLabel())}</strong><span>No Week ${esc(week || '—')} slate is published yet; showing the latest matches from this phase.</span></div>`;
  return `<div class="match-context"><strong>Latest recorded results</strong><span>No current-week slate is published in the public feed yet.</span></div>`;
}

function renderStandings(tier = 'mythic') {
  const body = $('#standings-body');
  if (!body) return;
  const rows = league.standings?.[tier] || [];
  if (!rows.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="8">No standings have been published for this division.</td></tr>';
    return;
  }
  body.innerHTML = rows.map((row, index) => `<tr${index === 0 ? ' class="division-leader"' : ''}><td class="rank">${esc(row.rank ?? index + 1)}</td><td><strong>${esc(row.team)}</strong><small class="table-franchise">${esc(row.franchise || '')}</small></td><td>${esc(row.wins)}</td><td>${esc(row.losses)}</td><td>${esc(row.win_pct)}</td><td>${esc(row.goals_for)}</td><td>${esc(row.goals_against)}</td><td>${esc(row.differential)}</td></tr>`).join('');
}

function renderMatches() {
  const box = $('#match-list');
  if (!box) return;
  const scope = displayMatchScope();
  const rows = orderedMatches(scope.rows).slice(0, 18);
  if (!rows.length) {
    box.innerHTML = '<div class="data-state"><strong>No match records are available in the public feed yet.</strong><br>Use Discord for scheduling and match-night coordination.</div>';
    return;
  }
  box.innerHTML = matchContext(scope.mode) + rows.map(match => `<div class="match-row"><div class="match-meta"><span class="tierlabel">${esc(match.tier)}</span><span class="match-sub">${esc(matchMeta(match) || 'League match')}</span></div><span class="tname">${esc(match.home)}</span><span class="scorebox">${esc(match.score || 'VS')}</span><span class="tname away">${esc(match.away)}</span><span class="state">${esc(match.status)}</span></div>`).join('');
}

function teamStanding(team) {
  const target = norm(team?.name);
  if (!target) return null;
  for (const [tier, rows] of Object.entries(league.standings || {})) {
    const row = (rows || []).find(item => norm(item.team) === target);
    if (row) return { ...row, tier };
  }
  return null;
}

function renderTeams() {
  const grid = $('#team-grid');
  if (!grid) return;
  const rows = league.teams || [];
  grid.innerHTML = rows.length
    ? rows.map(team => {
        const standing = teamStanding(team);
        const logo = team.logo ? `<img src="${esc(team.logo)}" alt="${esc(team.franchise)} logo" loading="lazy" decoding="async">` : esc(team.franchise_tag || 'SSL');
        const rank = standing?.rank ? `#${standing.rank}` : '—';
        const record = standing ? `${standing.wins}-${standing.losses}` : '—';
        const diff = standing?.differential == null ? '—' : Number(standing.differential) > 0 ? `+${standing.differential}` : standing.differential;
        return `<article class="card team-card" data-filterable style="--team-color:${esc(team.color || '#32C8FF')}" aria-label="${esc(team.name)}, ${esc(team.tier)} division"><div class="team-card-head"><div class="team-logo">${logo}</div><span class="team-rank">${esc(rank)}</span></div><div class="team-card-title"><span class="eyebrow">${esc(team.tier)}</span><h3>${esc(team.name)}</h3><div class="team-meta">${esc(team.franchise)}</div></div><div class="team-card-stats"><span><small>Record</small><b>${esc(record)}</b></span><span><small>Rank</small><b>${esc(rank)}</b></span><span><small>Diff</small><b>${esc(diff)}</b></span></div></article>`;
      }).join('')
    : '<div class="data-state" style="grid-column:1/-1"><strong>No public teams are listed for the current season.</strong></div>';
}

function renderPlayers() {
  const grid = $('#player-grid');
  if (!grid) return;
  const rows = league.players || [];
  if (rows.length) {
    grid.innerHTML = rows.map(player => `<article class="card player-tile" data-filterable><span class="eyebrow">${esc(player.tier)}</span><h3>${esc(player.gamertag)}</h3><div class="player-meta">${esc(player.team)} · ${esc(player.role || 'Player')}</div><div class="player-card-stats"><span>${esc(player.eligible === false ? 'Eligibility pending' : 'League profile')}</span>${player.slp != null ? `<b>${esc(player.slp)} SLP</b>` : ''}</div></article>`).join('');
    return;
  }
  grid.innerHTML = `<article class="card player-card-live" style="grid-column:1/-1"><span class="eyebrow">Authoritative profiles</span><h3>Player cards are available through SSL Bot.</h3><p>The public roster directory is not included in the current website export. The featured profile above demonstrates the web card, while Discord remains authoritative for registered identity, roster, eligibility, statistics, match records, and awards.</p><div class="page-actions"><a class="btn primary" href="${DISCORD}" target="_blank" rel="noopener noreferrer">Open SSL Bot in Discord</a><a class="btn ghost" href="/teams/">Browse current teams</a></div></article>`;
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
  const leaders = [...rows].sort((a, b) => (Number(b.wins) - Number(a.wins)) || (Number(a.losses) - Number(b.losses)) || (Number(b.differential) - Number(a.differential)));
  const top = leaders[0];
  const currentFinals = currentWeekFinals();
  const finals = currentFinals.length ? currentFinals : recordedFinals();
  const resultLabel = currentFinals.length ? 'Current-week public finals' : 'Recorded public finals';
  box.innerHTML = `<div class="leader-row"><span class="pos">S</span><div><b>${esc(league.season?.name || 'Current season')}</b><span>${esc(seasonStateLabel())}</span></div><div class="value">Week ${esc(league.season?.week || '—')}</div></div><div class="leader-row"><span class="pos">T</span><div><b>${esc((league.teams || []).length)} teams</b><span>Across six divisions</span></div><div class="value">2v2</div></div><div class="leader-row"><span class="pos">M</span><div><b>${esc(finals.length)} posted results</b><span>${esc(resultLabel)}</span></div><div class="value">Final</div></div>${top ? `<div class="leader-row"><span class="pos">W</span><div><b>${esc(top.team)}</b><span>Strongest current record</span></div><div class="value">${esc(top.wins)}-${esc(top.losses)}</div></div>` : ''}`;
}

function renderStatHighlights() {
  if ((document.body.dataset.page || '') !== 'stats') return;
  const anchor = $('.leader-grid');
  if (!anchor) return;
  let grid = $('#stat-highlights');
  if (!grid) {
    grid = document.createElement('div');
    grid.id = 'stat-highlights';
    grid.className = 'insight-grid';
    anchor.insertAdjacentElement('afterend', grid);
  }
  const rows = standingsRows().filter(row => row.team);
  if (!rows.length) {
    grid.innerHTML = '<div class="data-state" style="grid-column:1/-1">Team performance highlights will appear when standings are published.</div>';
    return;
  }
  const bestRecord = [...rows].sort((a, b) => (Number(b.wins) - Number(a.wins)) || (Number(a.losses) - Number(b.losses)) || (Number(b.differential) - Number(a.differential)))[0];
  const bestOffense = [...rows].sort((a, b) => Number(b.goals_for) - Number(a.goals_for))[0];
  const bestDiff = [...rows].sort((a, b) => Number(b.differential) - Number(a.differential))[0];
  const undefeated = rows.filter(row => Number(row.losses) === 0).length;
  grid.innerHTML = `<article class="card insight-card"><span>Best record</span><strong>${esc(bestRecord.team)}</strong><b>${esc(bestRecord.wins)}-${esc(bestRecord.losses)}</b><small>${esc(phaseLabel(bestRecord.tier))}</small></article><article class="card insight-card"><span>Most goals</span><strong>${esc(bestOffense.team)}</strong><b>${esc(bestOffense.goals_for)} GF</b><small>${esc(phaseLabel(bestOffense.tier))}</small></article><article class="card insight-card"><span>Best differential</span><strong>${esc(bestDiff.team)}</strong><b>${Number(bestDiff.differential) > 0 ? '+' : ''}${esc(bestDiff.differential)}</b><small>${esc(phaseLabel(bestDiff.tier))}</small></article><article class="card insight-card"><span>Undefeated</span><strong>${esc(undefeated)} teams</strong><b>${esc(rows.length)} ranked</b><small>${esc(snapshotDateLabel(league.generated_at))}</small></article>`;
}

function renderHistory() {
  const box = $('#champion-list');
  if (!box) return;
  const rows = league.champions || [];
  if (rows.length) {
    box.innerHTML = rows.map(champion => `<article class="card record-card"><span>${esc(champion.season)}</span><b>${esc(champion.team)}</b><div class="muted">${esc(champion.tier || 'League champion')}</div></article>`).join('');
  } else {
    box.innerHTML = `<article class="card record-card"><span>Current competition</span><b>${esc(league.season?.name || 'Current season')}</b><div class="muted">Week ${esc(league.season?.week || '—')} · ${esc(seasonStateLabel())}</div></article><article class="card record-card"><span>Championship archive</span><b>Not yet published</b><div class="muted">Verified champions will appear here when the public feed includes them.</div></article>`;
  }

  const summary = $('#history-summary');
  if (summary) {
    const leaders = Object.entries(league.standings || {}).map(([tier, list]) => ({ tier, team: list?.[0]?.team, record: list?.[0] ? `${list[0].wins}-${list[0].losses}` : '—' })).filter(item => item.team);
    summary.innerHTML = leaders.map(item => `<article class="card record-card"><span>${esc(phaseLabel(item.tier))} leader</span><b>${esc(item.team)}</b><div class="muted">${esc(item.record)}</div></article>`).join('');
  }

  renderHistoryResults();
}

function renderHistoryResults() {
  if ((document.body.dataset.page || '') !== 'history') return;
  const main = $('#main');
  if (!main) return;
  let section = $('#history-results-section');
  if (!section) {
    section = document.createElement('section');
    section.id = 'history-results-section';
    section.className = 'section';
    section.innerHTML = `<div class="wrap"><div class="section-head"><div><p class="eyebrow">Recorded results</p><h2>Recent match archive.</h2><p>Final series retained in the current public competition snapshot.</p></div></div><div id="history-results" class="history-result-grid"></div></div>`;
    main.appendChild(section);
  }
  const grid = $('#history-results');
  if (!grid) return;
  const finals = orderedMatches(recordedFinals()).slice(0, 9);
  grid.innerHTML = finals.length ? finals.map(match => `<article class="card result-card"><div><span class="eyebrow">${esc(match.tier || 'League')}</span><small>${esc(matchMeta(match))}</small></div><strong>${esc(match.home)} <b>${esc(match.score || 'VS')}</b> ${esc(match.away)}</strong></article>`).join('') : '<div class="data-state" style="grid-column:1/-1">No final match records are published yet.</div>';
}

function derivedNews() {
  const rows = standingsRows();
  const leaders = Object.entries(league.standings || {}).map(([tier, list]) => ({ tier, row: list?.[0] })).filter(item => item.row);
  const latest = orderedMatches(recordedFinals())[0];
  const competition = league.competition || {};
  const cards = [
    {
      category: 'Season update',
      title: `${league.season?.name || 'Current season'} · Week ${league.season?.week || '—'}`,
      summary: `${seasonStateLabel()}. ${rows.length || (league.teams || []).length} ranked team entries are published across six divisions.`,
      date: snapshotDateLabel(league.generated_at),
    },
  ];
  if (leaders.length) {
    cards.push({
      category: 'Standings',
      title: 'Division leaders are set.',
      summary: leaders.map(item => `${phaseLabel(item.tier)}: ${item.row.team}`).join(' · '),
      date: snapshotDateLabel(league.generated_at),
    });
  }
  if (latest) {
    cards.push({
      category: 'Latest result',
      title: `${latest.home} ${latest.score || 'vs'} ${latest.away}`,
      summary: `${latest.tier || 'League'} · ${matchMeta(latest)}`,
      date: latest.date ? dateLabel(latest.date) : snapshotDateLabel(league.generated_at),
    });
  }
  cards.push({
    category: 'Broadcast',
    title: `Official stream · ${displayZone(competition.official_stream_time || '9:30 PM ET')}`,
    summary: `${competition.official_stream_day || 'Saturday'} featured games follow the primary match window.`,
    date: 'Weekly schedule',
  });
  return cards;
}

function renderNews() {
  const box = $('#news-grid');
  if (!box) return;
  const rows = (league.news || []).length ? league.news : derivedNews();
  box.innerHTML = rows.slice(0, 9).map((item, index) => `<article class="card news-card${index === 0 ? ' feature' : ''}"><span class="eyebrow">${esc(item.category || 'League news')}</span><h3>${esc(item.title)}</h3><p>${esc(displayZone(item.summary))}</p><time>${esc(displayZone(item.date))}</time></article>`).join('');
}

function renderHomeStatus() {
  if ((document.body.dataset.page || '') !== 'home') return;
  const hero = $('.hero.brand-hero');
  if (!hero) return;
  let section = $('#competition-status-band');
  if (!section) {
    section = document.createElement('section');
    section.id = 'competition-status-band';
    section.className = 'competition-status-band';
    hero.insertAdjacentElement('afterend', section);
  }
  const competition = league.competition || {};
  section.innerHTML = `<div class="wrap competition-status-grid"><div class="status-primary"><span class="live-dot" aria-hidden="true"></span><div><small>Current competition</small><strong>${esc(league.season?.name || 'Season')} · Week ${esc(league.season?.week || '—')}</strong><span>${esc(seasonStateLabel())}</span></div></div><div class="status-item"><small>Match night</small><strong>${esc(competition.core_match_day || 'Saturday')} · ${esc(displayZone(competition.core_match_time || '8:00 PM ET'))}</strong><span>${esc(competition.default_region || 'US-East')}</span></div><div class="status-item"><small>Official stream</small><strong>${esc(competition.official_stream_day || 'Saturday')} · ${esc(displayZone(competition.official_stream_time || '9:30 PM ET'))}</strong><span>Featured league games</span></div><div class="status-item"><small>Field</small><strong>${esc((league.teams || []).length || 36)} teams · 6 divisions</strong><span>${esc(snapshotDateLabel(league.generated_at))}</span></div><div class="status-actions"><a class="btn ghost" href="/matches/">Match Center</a><a class="btn primary" href="${DISCORD}" target="_blank" rel="noopener noreferrer">Join Discord</a></div></div>`;
}

function renderStatusbar() {
  const title = $('.brand-status');
  const detail = $('.statusbar .hide-mobile');
  if (title && league.season) title.textContent = `${league.season.name || 'Supersonic Showdown'} · Week ${league.season.week || '—'}`;
  if (detail) {
    const competition = league.competition || {};
    detail.textContent = `${competition.core_match_day || 'Saturday'} match night · ${displayZone(competition.core_match_time || '8:00 PM ET')} · ${competition.default_region || 'US-East'}`;
  }
}

function normalizeTimezoneCopy(root = document.body) {
  if (!root || typeof NodeFilter === 'undefined') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (/\b(?:EST|EDT)\b/.test(node.nodeValue || '')) node.nodeValue = displayZone(node.nodeValue);
  });
}

function filter() {
  const input = $('[data-filter]');
  if (!input) return;
  let analyticsTimer = null;
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    $$('[data-filterable]').forEach(card => {
      card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
    });
    clearTimeout(analyticsTimer);
    if (query.length >= 2) {
      analyticsTimer = setTimeout(() => pushAnalytics('team_search', { query_length: query.length }), 700);
    }
  });
}

function renderDynamic() {
  renderMatches();
  renderStandings($('.tab.active[data-tier]')?.dataset.tier || 'mythic');
  renderPower();
  renderSeasonSummary();
  renderStatHighlights();
  renderHistory();
  renderHomeStatus();
  renderStatusbar();
}

function renderAll() {
  renderDynamic();
  renderTeams();
  renderPlayers();
  renderNews();
  normalizeTimezoneCopy();
}

const snapshotStamp = data => data?.generated_at || JSON.stringify([data?.season, data?.match_night, data?.standings, data?.teams, data?.players, data?.news]);
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
      renderAll();
    }
  } catch {
    // Keep the last known public snapshot on screen if a refresh fails.
  } finally {
    refreshInFlight = false;
    scheduleRefresh();
  }
}

async function start() {
  loadEnhancementStyles();
  shell();
  nav();
  tabs();
  analytics();
  filter();
  normalizeTimezoneCopy();

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
