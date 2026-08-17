const FEATURES_9_12 = new Map([
  ['Franchise Health', 'health'],
  ['State Integrity', 'integrity'],
  ['Game-Day Operations', 'game_day'],
  ['Ask SSL', 'ask_ssl'],
]);

function activityHeaders912() {
  return window.sslActivitySession ? { 'X-SSL-Activity-Session': window.sslActivitySession } : {};
}

async function api912(path) {
  const headers = new Headers({ Accept: 'application/json' });
  for (const [name, value] of Object.entries(activityHeaders912())) headers.set(name, value);
  const response = await fetch(path, { method: 'GET', headers, cache: 'no-store' });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { message: await response.text().catch(() => '') };
  if (!response.ok) throw new Error(payload.message || payload.status || `Request failed (${response.status})`);
  return payload;
}

function el912(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = String(text);
  return node;
}

function clear912(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function val912(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function num912(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function title912(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date912(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function drawer912(title, kicker) {
  const drawer = document.querySelector('#cc-tool-drawer');
  const titleNode = document.querySelector('#cc-tool-title');
  const kickerNode = document.querySelector('#cc-tool-kicker');
  const body = document.querySelector('#cc-tool-body');
  if (!drawer || !titleNode || !kickerNode || !body) throw new Error('Command Center tool drawer is unavailable.');
  titleNode.textContent = title;
  kickerNode.textContent = kicker;
  clear912(body);
  drawer.hidden = false;
  drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return body;
}

function alert912(parent, text, error = false) {
  parent.append(el912('div', `cc-alert${error ? ' error' : ''}`, text));
}

function hero912(parent, kicker, title, copy = '') {
  const hero = el912('section', 'f912-hero');
  hero.append(el912('span', 'cc-kicker', kicker), el912('h3', '', title));
  if (copy) hero.append(el912('p', 'cc-muted', copy));
  parent.append(hero);
}

function stats912(parent, rows) {
  const grid = el912('div', 'f912-stat-grid');
  for (const [label, value] of rows) {
    const card = el912('div', 'f912-stat');
    card.append(el912('strong', '', value), el912('span', '', label));
    grid.append(card);
  }
  parent.append(grid);
}

function severity912(value) {
  const token = String(value || 'info').toLowerCase();
  if (['critical', 'error'].includes(token)) return 'critical';
  if (token === 'warning') return 'warning';
  return 'info';
}

function row912(left, right = '', severity = '') {
  const row = el912('div', `f912-row${severity ? ` ${severity}` : ''}`);
  row.append(el912('strong', '', left), el912('span', '', right));
  return row;
}

function section912(parent, title, rows = [], empty = 'No current data.') {
  const section = el912('section', 'f912-section');
  section.append(el912('h3', '', title));
  const list = el912('div', 'f912-list');
  if (rows.length) rows.forEach((row) => list.append(row));
  else list.append(el912('p', 'cc-muted', empty));
  section.append(list);
  parent.append(section);
}

async function ownFranchise912() {
  const typed = document.querySelector('#cc-franchise-input')?.value?.trim();
  if (typed) return typed;
  const bootstrap = await api912('/api/ssl/v1/bootstrap');
  const player = bootstrap.profile?.player || {};
  return String(player.franchise_tag || player.franchise || '').trim();
}

function renderHealth912(body, data) {
  if (data.status !== 'ok') {
    alert912(body, data.message || `Franchise Health returned ${val912(data.status)}.`, true);
    return;
  }
  const franchise = data.franchise || {};
  hero912(
    body,
    'FEATURE 09 · PROACTIVE OPERATIONS',
    `${val912(franchise.tag, '')} ${val912(franchise.name, 'Franchise Health')}`.trim(),
    `Overall: ${title912(data.overall || 'unknown')} · read-only deterministic checks`,
  );

  const teams = data.teams || [];
  const rostered = teams.reduce((sum, team) => sum + Number(team.roster_count || 0), 0);
  const rosterCapacity = teams.reduce((sum, team) => sum + Number(team.roster_limit || 0), 0);
  const errors = (data.findings || []).filter((item) => ['critical', 'error'].includes(String(item.severity || '').toLowerCase())).length;
  const warnings = (data.findings || []).filter((item) => String(item.severity || '').toLowerCase() === 'warning').length;
  stats912(body, [
    ['Tier teams', num912(teams.length)],
    ['Rostered', `${num912(rostered)} / ${num912(rosterCapacity)}`],
    ['Action required', num912(errors)],
    ['Warnings', num912(warnings)],
  ]);

  section912(
    body,
    'Roster and salary health',
    teams.map((team) => row912(
      `${val912(team.tier)} · ${val912(team.team)}`,
      `${num912(team.roster_count)}/${num912(team.roster_limit)} players · salary ${num912(team.salary)} / ${team.cap === null || team.cap === undefined ? 'cap not configured' : num912(team.cap)}`,
    )),
    'No team health rows are available.',
  );

  section912(
    body,
    'Operational findings',
    (data.findings || []).map((finding) => {
      const action = finding.action ? ` · Next: ${finding.action}` : '';
      return row912(
        val912(finding.code, 'Finding'),
        `${val912(finding.summary)}${action}`,
        severity912(finding.severity),
      );
    }),
    'No current operational findings. Franchise Health is clear.',
  );
  body.append(el912('p', 'f912-boundary', 'Franchise Health never auto-fixes roster ownership, eligibility, match results, standings, or other competitive state. Use the canonical SSL workflow for any correction.'));
}

async function openHealth912() {
  const body = drawer912('Franchise Health', 'FEATURE 09 · OPERATIONS HEALTH');
  body.append(el912('p', 'cc-muted', 'Loading authorized franchise health…'));
  try {
    const franchise = await ownFranchise912();
    if (!franchise) throw new Error('No authorized franchise could be resolved for this account.');
    const data = await api912(`/api/ssl/v1/franchise/${encodeURIComponent(franchise)}`);
    clear912(body);
    if (!data.health) {
      alert912(body, 'Franchise Health is not available for this role/franchise context.', true);
      return;
    }
    renderHealth912(body, data.health);
  } catch (error) {
    clear912(body);
    alert912(body, error.message || 'Unable to load Franchise Health.', true);
  }
}

function renderIntegrity912(body, data) {
  if (data.status !== 'ok') {
    alert912(body, data.message || `State Integrity returned ${val912(data.status)}.`, true);
    return;
  }
  const run = data.last_run || {};
  const findings = data.open_findings || [];
  const severe = findings.filter((item) => ['critical', 'error'].includes(String(item.severity || '').toLowerCase())).length;
  hero912(
    body,
    'FEATURE 10 · SILENT-DRIFT DETECTION',
    'State Integrity / Reconciliation',
    'PostgreSQL remains competitive authority. The worker detects drift and records bounded evidence; it does not autonomously rewrite competitive truth.',
  );
  stats912(body, [
    ['Last run', title912(run.status || 'not run')],
    ['Checks', num912(run.checks_run)],
    ['Open findings', num912(findings.length)],
    ['Critical / error', num912(severe)],
  ]);
  section912(body, 'Latest scan', [
    row912('Completed', date912(run.completed_at || run.started_at)),
    row912('Findings seen', num912(run.findings_seen)),
    row912('Source version', val912(run.source_version, 'Not recorded')),
  ]);
  section912(
    body,
    'Open reconciliation findings',
    findings.map((finding) => row912(
      `${val912(finding.domain, 'integrity')} · ${val912(finding.classification, 'finding')}`,
      `${val912(finding.summary)} · occurrences ${num912(finding.occurrences)}${finding.repair_action ? ` · operator path: ${finding.repair_action}` : ''}`,
      severity912(finding.severity),
    )),
    'No open integrity drift is currently recorded.',
  );
  body.append(el912('p', 'f912-boundary', 'Automatic detection is allowed. Competitive repair remains a human-controlled canonical workflow. Browser users cannot invoke SQL, shell, arbitrary Discord mutations, or reconciliation repairs.'));
}

async function openIntegrity912() {
  const body = drawer912('State Integrity', 'FEATURE 10 · RECONCILIATION');
  body.append(el912('p', 'cc-muted', 'Loading league integrity status…'));
  try {
    const league = await api912('/api/ssl/v1/league');
    clear912(body);
    renderIntegrity912(body, league.integrity || { status: 'unavailable', message: 'Integrity status is unavailable.' });
  } catch (error) {
    clear912(body);
    alert912(body, error.message || 'Unable to load State Integrity.', true);
  }
}

function gameFlags912(match) {
  const flags = [];
  if (match.dispute) flags.push('dispute');
  if (match.forfeit) flags.push('forfeit');
  if (match.replay_conflict) flags.push('replay conflict');
  if (match.replay_complete) flags.push('replays complete');
  return flags.join(' · ') || 'no blockers flagged';
}

function renderGameDay912(body, data) {
  if (data.status !== 'ok') {
    alert912(body, data.message || `Game-Day Operations returned ${val912(data.status)}.`, true);
    return;
  }
  const summary = data.summary || {};
  const matches = data.matches || [];
  hero912(
    body,
    'FEATURE 11 · GAME-DAY ORCHESTRATION',
    `Played Week ${val912(data.week)}`,
    'One readiness console over the canonical Match HQ lifecycle. Result reporting, disputes, forfeits, replay processing, finalization, and standings mutation remain in the audited Discord workflows.',
  );
  stats912(body, [
    ['HQ ready', num912(summary.hq_ready)],
    ['Checked in', num912(summary.checked_in)],
    ['Reported', num912(summary.reported)],
    ['Finalized', num912(summary.finalized)],
    ['Blocked', num912(summary.blocked)],
    ['Missing HQ', num912(summary.missing_hq)],
  ]);
  section912(
    body,
    'Current-week match board',
    matches.map((match) => row912(
      `${val912(match.tier)} · ${val912(match.home)} vs ${val912(match.away)}`,
      `Schedule ${val912(match.schedule_id)} · ${title912(match.stage)} · ${gameFlags912(match)}`,
      match.stage === 'blocked' || match.stage === 'missing_hq' ? 'warning' : '',
    )),
    'No authorized current-week matches are available.',
  );
  body.append(el912('p', 'f912-boundary', 'Game-Day Operations is an orchestration/readiness surface, not a second match engine. All competitive mutations remain in canonical Match HQ controls.'));
}

async function openGameDay912() {
  const body = drawer912('Game-Day Operations', 'FEATURE 11 · CURRENT WEEK');
  body.append(el912('p', 'cc-muted', 'Loading current-week game-day readiness…'));
  try {
    const league = await api912('/api/ssl/v1/league');
    clear912(body);
    renderGameDay912(body, league.game_day || { status: 'unavailable', message: 'Game-Day status is unavailable.' });
  } catch (error) {
    clear912(body);
    alert912(body, error.message || 'Unable to load Game-Day Operations.', true);
  }
}

function focusAskSSL912() {
  const panel = document.querySelector('.ask-panel');
  const input = document.querySelector('#cc-ask-input');
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (input) {
    input.focus();
    if (!input.value) input.placeholder = 'Ask about league state, rules, eligibility, scenarios, scheduling, franchise health, integrity, or game-day status…';
  }
}

async function intercept912(event) {
  const button = event.target.closest('.cc-action-card');
  if (!button) return;
  const label = button.querySelector('b')?.textContent?.trim() || '';
  const feature = FEATURES_9_12.get(label);
  if (!feature) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (feature === 'ask_ssl') return focusAskSSL912();
  if (feature === 'health') return openHealth912();
  if (feature === 'integrity') return openIntegrity912();
  if (feature === 'game_day') return openGameDay912();
}

document.addEventListener('click', intercept912, true);
