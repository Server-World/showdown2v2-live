const FEATURE_LABELS = new Map([
  ['Match HQ', 'match_hq'],
  ['Career Passport', 'career_passport'],
  ['Milestones & Records', 'milestones'],
]);

function activityHeaders() {
  return window.sslActivitySession ? { 'X-SSL-Activity-Session': window.sslActivitySession } : {};
}

async function getJson(path) {
  const response = await fetch(path, {
    headers: { Accept: 'application/json', ...activityHeaders() },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.status || `Request failed (${response.status})`);
  return payload;
}

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== '') element.textContent = String(text);
  return element;
}

function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function value(input, fallback = '—') {
  if (input === null || input === undefined || input === '') return fallback;
  return String(input);
}

function number(input) {
  const parsed = Number(input || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '0';
}

function prettyMetric(metric = '') {
  return String(metric).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function openDrawer(title, kicker) {
  const drawer = document.querySelector('#cc-tool-drawer');
  const body = document.querySelector('#cc-tool-body');
  document.querySelector('#cc-tool-title').textContent = title;
  document.querySelector('#cc-tool-kicker').textContent = kicker;
  clear(body);
  drawer.hidden = false;
  drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return body;
}

function addStatGrid(parent, stats) {
  const grid = node('div', 'f24-stat-grid');
  for (const [label, stat] of stats) {
    const card = node('div', 'f24-stat-card');
    card.append(node('strong', '', stat), node('span', '', label));
    grid.append(card);
  }
  parent.append(grid);
}

function addSection(parent, title, items = []) {
  const section = node('section', 'f24-section');
  section.append(node('h3', '', title));
  if (!items.length) {
    section.append(node('p', 'cc-muted', 'No recorded data.'));
  } else {
    const list = node('div', 'f24-list');
    for (const item of items) list.append(item);
    section.append(list);
  }
  parent.append(section);
}

function textRow(left, right = '') {
  const row = node('div', 'f24-row');
  row.append(node('strong', '', left), node('span', '', right));
  return row;
}

function statusPill(label, active, warning = false) {
  return node('span', `f24-pill ${active ? (warning ? 'warn' : 'ok') : 'idle'}`, `${active ? '●' : '○'} ${label}`);
}

async function renderMatchHQ(data) {
  const body = openDrawer('Match HQ', 'FEATURE 02 · GAME-DAY HEADQUARTERS');
  if (data?.status !== 'ok') {
    body.append(node('div', 'cc-alert', data?.message || 'No active Match HQ is linked to your current SSL role.'));
    const readiness = data?.readiness || {};
    if (readiness.missing_match_hq_count) {
      body.append(node('p', 'cc-muted', `Admin readiness: ${readiness.missing_match_hq_count} current-week approved schedule(s) are missing a canonical Match HQ.`));
    }
    return;
  }

  const hero = node('section', 'f24-hero');
  hero.append(
    node('span', 'cc-kicker', `WEEK ${value(data.played_week)} · ${value(data.tier)}`),
    node('h3', '', `${value(data.home)} vs ${value(data.away)}`),
    node('p', 'cc-muted', `${value(data.date)} · ${value(data.time)} · ${value(data.phase || data.match_status)}`),
  );
  body.append(hero);

  const progress = node('div', 'f24-pill-row');
  progress.append(
    statusPill('Check-in', Boolean(data.checkin_complete)),
    statusPill('Home report', Boolean(data.home_reported)),
    statusPill('Away report', Boolean(data.away_reported)),
    statusPill('Reports agree', Boolean(data.reports_match)),
    statusPill('Replay conflict', Boolean(data.replay_conflict), true),
    statusPill('Dispute', Boolean(data.dispute_open), true),
    statusPill('Forfeit', Boolean(data.forfeit_requested), true),
  );
  body.append(progress);

  addStatGrid(body, [
    ['Replays uploaded', number(data.replays_uploaded)],
    ['Parsed successfully', number(data.replays_parsed_ok)],
    ['Match status', value(data.match_status)],
    ['Thread', data.thread_id ? 'Available' : 'Missing'],
  ]);

  if (data.lobby_authorized) {
    const lobby = node('section', 'f24-section sensitive');
    lobby.append(node('h3', '', 'Authorized lobby credentials'));
    const creds = node('div', 'f24-credentials');
    creds.append(textRow('Lobby name', value(data.lobby_name)), textRow('Password', value(data.lobby_password)));
    lobby.append(creds, node('p', 'cc-muted', 'Visible only because SSL Bot revalidated your current match/staff authorization.'));
    body.append(lobby);
  }

  if (data.thread_id) {
    try {
      const config = await getJson('/api/config');
      if (config.guild_id) {
        const link = node('a', 'cc-button primary', 'Open canonical Match HQ in Discord');
        link.href = `https://discord.com/channels/${encodeURIComponent(config.guild_id)}/${encodeURIComponent(data.thread_id)}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        body.append(link);
      }
    } catch {
      // The structured status remains useful even if the optional deep-link config is unavailable.
    }
  }

  body.append(node('p', 'f24-boundary', 'Score reporting, disputes, forfeits, replay finalization, and other competitive mutations remain in the canonical Discord Match HQ workflow.'));
}

function renderCareerPassport(data) {
  const body = openDrawer('Career Passport', 'FEATURE 03 · PLAYER LEGACY');
  if (data?.status !== 'ok') {
    body.append(node('div', 'cc-alert', data?.message || 'Career history is unavailable for this player.'));
    return;
  }

  const profile = data.profile || {};
  const career = data.career || {};
  const current = data.current_season || {};
  const meta = data.career_meta || {};
  const hero = node('section', 'f24-hero');
  hero.append(
    node('span', 'cc-kicker', 'SSL CAREER IDENTITY'),
    node('h3', '', value(data.player)),
    node('p', 'cc-muted', `${value(profile.franchise, 'Free Agent')} · ${value(profile.tier)} · ${number(meta.seasons_played)} season(s)`),
  );
  body.append(hero);

  addStatGrid(body, [
    ['Career W-L', `${number(career.wins)}-${number(career.losses)}`],
    ['Games played', number(career.games_played)],
    ['Goals', number(career.goals)],
    ['Assists', number(career.assists)],
    ['Saves', number(career.saves)],
    ['MVPs', number(career.mvps)],
    ['Shots', number(career.shots)],
    ['Score', number(career.score)],
  ]);

  addSection(body, 'Current season', [
    textRow('Production', `GP ${number(current.games_played)} · G ${number(current.goals)} · A ${number(current.assists)} · S ${number(current.saves)} · MVP ${number(current.mvps)}`),
    textRow('Score', number(current.score)),
  ]);

  const seasonRows = (data.seasons || []).slice(0, 12).map((season) =>
    textRow(`Season ${value(season.season_number)}`, `${number(season.wins)}-${number(season.losses)} · GP ${number(season.games_played)} · G ${number(season.goals)} · A ${number(season.assists)} · S ${number(season.saves)}`),
  );
  addSection(body, 'Season-by-season history', seasonRows);

  const honorRows = [];
  for (const honor of (data.honors || []).slice(0, 8)) honorRows.push(textRow(`${value(honor.honor_symbol, '★')} ${value(honor.honor_name)}`, `S${value(honor.season_number)} · ${value(honor.tier_name)}`));
  for (const award of (data.awards || []).slice(0, 8)) honorRows.push(textRow(`🏆 ${value(award.award_name)}`, `S${value(award.season_number)} · ${value(award.tier_name)}`));
  for (const achievement of (data.achievements || []).slice(0, 8)) honorRows.push(textRow(`⭐ ${value(achievement.achievement_name)}`, `S${value(achievement.season)} · ${value(achievement.tier)}`));
  addSection(body, 'Honors & achievements', honorRows);

  const slp = data.slp || {};
  const iron = data.iron_man || {};
  const trophies = data.trophies || {};
  addStatGrid(body, [
    ['Trophies', number(trophies.total_trophies)],
    ['SLP current', number(slp.current)],
    ['SLP all-time', number(slp.all_time)],
    ['Iron Man weeks', number(iron.weeks_completed)],
  ]);

  const movement = (data.recent_transactions || []).slice(0, 8).map((row) =>
    textRow(value(row.label), `${String(row.occurred_at || '').slice(0, 10) || '—'} · ${value(row.status)}`),
  );
  addSection(body, 'Recent career movement', movement);
  if (data.data_note) body.append(node('p', 'f24-boundary', data.data_note));
}

function milestoneProgressRow(item) {
  const wrapper = node('div', 'f24-milestone');
  const header = node('div', 'f24-row');
  header.append(node('strong', '', `${prettyMetric(item.metric)} · ${number(item.threshold)}`), node('span', '', `${number(item.value)} / ${number(item.threshold)}`));
  const track = node('div', 'f24-progress');
  const fill = node('span');
  const valueNow = Number(item.value || 0);
  const threshold = Math.max(1, Number(item.threshold || 1));
  fill.style.width = `${Math.max(0, Math.min(100, (valueNow / threshold) * 100))}%`;
  track.append(fill);
  wrapper.append(header, track);
  if (item.remaining !== undefined) wrapper.append(node('small', 'cc-muted', `${number(item.remaining)} remaining`));
  return wrapper;
}

function recordRows(records = [], prefix = '') {
  return records.map((record) => {
    const leaders = (record.leaders || []).map((leader) => value(leader.player)).join(', ');
    const tier = record.tier ? ` · ${record.tier}` : '';
    return textRow(`${prefix}${prettyMetric(record.metric)}${tier}`, `${number(record.value)} · ${leaders || 'No leader listed'}`);
  });
}

function renderMilestones(data) {
  const body = openDrawer('Milestones & Records', 'FEATURE 04 · RECORD BOOK');
  if (data?.status !== 'ok') {
    body.append(node('div', 'cc-alert', data?.message || 'Milestone data is unavailable.'));
    return;
  }

  const closest = data.closest_milestone || (data.next || [])[0];
  const hero = node('section', 'f24-hero');
  hero.append(
    node('span', 'cc-kicker', 'DETERMINISTIC ACHIEVEMENT ENGINE'),
    node('h3', '', value(data.player)),
    node('p', 'cc-muted', closest ? `Closest milestone: ${prettyMetric(closest.metric)} ${number(closest.threshold)} · ${number(closest.remaining)} remaining` : 'All configured milestones in the current definition set are earned.'),
  );
  body.append(hero);

  addStatGrid(body, [
    ['Earned milestones', number(data.earned_count ?? (data.earned || []).length)],
    ['Records held', number((data.record_holds || []).length)],
    ['Trophies', number(data.trophy_count)],
    ['Next milestones', number((data.next || []).length)],
  ]);

  const nextSection = node('section', 'f24-section');
  nextSection.append(node('h3', '', 'Progress to next milestones'));
  const nextList = node('div', 'f24-list');
  for (const item of (data.next || []).slice(0, 8)) nextList.append(milestoneProgressRow(item));
  if (!nextList.children.length) nextList.append(node('p', 'cc-muted', 'No remaining configured milestone thresholds.'));
  nextSection.append(nextList);
  body.append(nextSection);

  const held = (data.record_holds || []).map((record) => textRow(`${record.scope.replaceAll('_', ' ')} · ${prettyMetric(record.metric)}`, `${record.tier ? `${record.tier} · ` : ''}${number(record.value)}`));
  addSection(body, 'Records currently held', held);
  addSection(body, 'All-time career records', recordRows(data.records || []));
  addSection(body, 'Current-season records', recordRows(data.current_season_records || []));
  addSection(body, 'Current-tier records', recordRows(data.current_tier_records || []));

  const honors = data.honors || {};
  const honorRows = [
    ...(honors.hall_of_fame || []).map((row) => textRow(`${value(row.symbol, '★')} ${value(row.name)}`, `S${value(row.season)} · ${value(row.tier)}`)),
    ...(honors.awards || []).map((row) => textRow(`🏆 ${value(row.name)}`, `S${value(row.season)} · ${value(row.tier)}`)),
    ...(honors.achievements || []).map((row) => textRow(`⭐ ${value(row.name)}`, `S${value(row.season)} · ${value(row.tier)}`)),
  ];
  addSection(body, 'Recorded honors', honorRows.slice(0, 18));
  body.append(node('p', 'f24-boundary', 'Opening this surface performs zero writes. Milestone keys are deterministic; any future persistence/announcement hook must remain idempotent and separately audited.'));
}

async function interceptFeature(event) {
  const button = event.target.closest('.cc-action-card');
  if (!button) return;
  const label = button.querySelector('b')?.textContent?.trim() || '';
  const feature = FEATURE_LABELS.get(label);
  if (!feature) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const body = openDrawer(label, `LOADING FEATURE ${feature === 'match_hq' ? '02' : feature === 'career_passport' ? '03' : '04'}`);
  body.append(node('p', 'cc-muted', 'Refreshing authoritative SSL data…'));

  try {
    const bootstrap = await getJson('/api/ssl/v1/bootstrap');
    if (feature === 'match_hq') await renderMatchHQ(bootstrap.match_hq || { status: 'not_found' });
    if (feature === 'career_passport') renderCareerPassport(bootstrap.career || { status: 'not_found' });
    if (feature === 'milestones') renderMilestones(bootstrap.milestones || { status: 'not_found' });
  } catch (error) {
    const target = openDrawer(label, 'SSL TOOL');
    target.append(node('div', 'cc-alert error', error.message || 'Unable to load this SSL feature.'));
  }
}

document.addEventListener('click', interceptFeature, true);
