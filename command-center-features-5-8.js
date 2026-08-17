const FEATURES_5_8 = new Map([
  ['Scenario Lab', 'scenario'],
  ['Transaction Simulator', 'transaction'],
  ['Set Availability', 'availability'],
  ['Scheduling Optimizer', 'optimizer'],
  ['Scout Opponent', 'scout'],
]);

let sessionCache = null;

function activityHeaders58() {
  return window.sslActivitySession ? { 'X-SSL-Activity-Session': window.sslActivitySession } : {};
}

async function session58() {
  if (!sessionCache) sessionCache = await api58('/api/session');
  return sessionCache;
}

async function api58(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  for (const [name, value] of Object.entries(activityHeaders58())) headers.set(name, value);
  if (!['GET', 'HEAD'].includes(method)) {
    const session = await session58();
    headers.set('X-SSL-CSRF', session.csrf || '');
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...options, method, headers, cache: 'no-store' });
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { message: await response.text().catch(() => '') };
  if (!response.ok) throw new Error(payload.message || payload.status || `Request failed (${response.status})`);
  return payload;
}

function el58(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== '') node.textContent = String(text);
  return node;
}

function clear58(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function val58(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function num58(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : '0';
}

function title58(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function drawer58(title, kicker) {
  const drawer = document.querySelector('#cc-tool-drawer');
  document.querySelector('#cc-tool-title').textContent = title;
  document.querySelector('#cc-tool-kicker').textContent = kicker;
  const body = document.querySelector('#cc-tool-body');
  clear58(body);
  drawer.hidden = false;
  drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return body;
}

function alert58(parent, text, error = false) {
  parent.append(el58('div', `cc-alert${error ? ' error' : ''}`, text));
}

function hero58(parent, kicker, title, copy = '') {
  const hero = el58('section', 'f58-hero');
  hero.append(el58('span', 'cc-kicker', kicker), el58('h3', '', title));
  if (copy) hero.append(el58('p', 'cc-muted', copy));
  parent.append(hero);
}

function stats58(parent, entries) {
  const grid = el58('div', 'f58-stat-grid');
  for (const [label, value] of entries) {
    const card = el58('div', 'f58-stat');
    card.append(el58('strong', '', value), el58('span', '', label));
    grid.append(card);
  }
  parent.append(grid);
}

function row58(left, right = '', badge = '') {
  const row = el58('div', 'f58-row');
  const leftWrap = el58('div');
  leftWrap.append(el58('strong', '', left));
  if (badge) leftWrap.append(el58('small', 'f58-badge', badge));
  row.append(leftWrap, el58('span', '', right));
  return row;
}

function section58(parent, title, rows = [], empty = 'No current data.') {
  const section = el58('section', 'f58-section');
  section.append(el58('h3', '', title));
  const list = el58('div', 'f58-list');
  if (rows.length) rows.forEach((row) => list.append(row));
  else list.append(el58('p', 'cc-muted', empty));
  section.append(list);
  parent.append(section);
}

function field58(label, name, options = {}) {
  const wrap = el58('label', `f58-field${options.full ? ' full' : ''}`);
  wrap.append(el58('span', '', label));
  let input;
  if (options.select) {
    input = document.createElement('select');
    for (const [value, text] of options.select) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      input.append(option);
    }
  } else if (options.textarea) {
    input = document.createElement('textarea');
    input.rows = options.rows || 3;
  } else {
    input = document.createElement('input');
    input.type = options.type || 'text';
  }
  input.name = name;
  input.placeholder = options.placeholder || '';
  if (options.value !== undefined && options.value !== null) input.value = options.value;
  if (options.required) input.required = true;
  if (options.maxLength) input.maxLength = options.maxLength;
  wrap.append(input);
  if (options.help) wrap.append(el58('small', 'cc-muted', options.help));
  return { wrap, input };
}

function formActions58(primaryText) {
  const actions = el58('div', 'f58-actions');
  const submit = el58('button', 'cc-button primary', primaryText);
  submit.type = 'submit';
  actions.append(submit);
  return { actions, submit };
}

async function bootstrap58() {
  return api58('/api/ssl/v1/bootstrap');
}

function renderScenario58(body, data) {
  if (data.status !== 'ok') {
    alert58(body, data.message || `Scenario Lab returned ${val58(data.status)}.`, true);
    if (data.matches?.length) section58(body, 'Matching teams', data.matches.map((item) => row58(item)));
    return;
  }
  const team = data.team || {};
  const current = data.current || {};
  const range = data.series_win_range || {};
  const envelope = data.rank_envelope || {};
  const proof = data.proof || {};
  hero58(
    body,
    'FEATURE 05 · READ-ONLY WHAT-IF',
    `${val58(team.franchise_tag, '')} ${val58(team.team_name)}`.trim(),
    `${val58(team.tier)} · Current rank #${val58(current.rank)} · Series ${num58(current.wins)}-${num58(current.losses)}`,
  );
  stats58(body, [
    ['Series-win range', `${num58(range.min)}–${num58(range.max)}`],
    ['Best rank', `#${val58(envelope.best)}`],
    ['Worst rank', `#${val58(envelope.worst)}`],
    ['Proof mode', title58(proof.mode || 'unknown')],
    ['Outcomes tested', num58(proof.combinations_considered)],
    ['Tiebreak status', data.tiebreak_uncertain ? 'Uncertain' : 'Resolved by series wins'],
  ]);
  if (data.forced) {
    section58(body, 'Forced selected series', [
      row58(`Week ${val58(data.forced.week)} · ${val58(data.forced.home)} vs ${val58(data.forced.away)}`, title58(data.forced.outcome), `Schedule ${val58(data.forced.schedule_id)}`),
    ]);
  }
  section58(
    body,
    'Remaining selected-team series',
    (data.remaining_matches || []).map((match) => row58(
      `Week ${val58(match.week)} · ${val58(match.home)} vs ${val58(match.away)}`,
      `Schedule ${val58(match.schedule_id)}`,
    )),
    'No approved unresolved series remain for this team.',
  );
  const boundary = el58('p', 'f58-boundary', data.interpretation || 'Scenario Lab never changes standings or schedules.');
  body.append(boundary);
}

async function openScenario58() {
  const body = drawer58('Scenario Lab', 'FEATURE 05 · STANDINGS SCENARIOS');
  const bootstrap = await bootstrap58().catch(() => ({}));
  const profile = bootstrap.profile?.player || {};
  const hq = bootstrap.match_hq || {};
  const form = el58('form', 'f58-form');
  const team = field58('Team / franchise', 'team', { placeholder: 'Blank = my team' });
  const tier = field58('Tier', 'tier', { value: profile.tier || hq.tier || '', placeholder: 'Legend' });
  const outcome = field58('Force selected series', 'outcome', { select: [['none', 'No forced result'], ['win', 'Win'], ['loss', 'Loss']] });
  const schedule = field58('Schedule ID (optional)', 'schedule_id', { value: hq.schedule_id || '', placeholder: 'Exact remaining series ID', help: 'Blank forces your next remaining series when Win/Loss is selected.' });
  const { actions, submit } = formActions58('Run Scenario');
  form.append(team.wrap, tier.wrap, outcome.wrap, schedule.wrap, actions);
  body.append(form);
  const result = el58('div', 'f58-result');
  body.append(result);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    clear58(result);
    try {
      const payload = await api58('/api/ssl/v1/scenario', {
        method: 'POST',
        body: JSON.stringify({
          team: team.input.value.trim(),
          tier: tier.input.value.trim(),
          outcome: outcome.input.value,
          schedule_id: schedule.input.value.trim() ? Number(schedule.input.value.trim()) : null,
        }),
      });
      renderScenario58(result, payload);
    } catch (error) {
      alert58(result, error.message, true);
    } finally {
      submit.disabled = false;
    }
  });
}

function renderTransaction58(body, data) {
  if (data.status !== 'ok') {
    alert58(body, data.message || `Transaction preview returned ${val58(data.status)}.`, true);
    if (data.matches?.length) section58(body, 'Matches', data.matches.map((item) => row58(item)));
    return;
  }
  const legal = Boolean(data.legal_preview);
  const player = data.player || {};
  const target = data.target || {};
  hero58(
    body,
    legal ? 'PREVIEW PASSES' : 'PREVIEW BLOCKED',
    `${title58(data.action)} · ${val58(player.name)}`,
    `${val58(target.tag, '')} ${val58(target.team, target.franchise)} · ${val58(target.tier)} · Phase ${title58(data.phase)}`,
  );
  const projection = data.projection || {};
  stats58(body, [
    ['Roster after', `${num58(projection.projected_roster_count ?? projection.roster_count)} / ${num58(projection.roster_limit)}`],
    ['Salary after', num58(projection.projected_salary)],
    ['Salary cap', projection.salary_cap === null || projection.salary_cap === undefined ? 'Not configured' : num58(projection.salary_cap)],
    ['Cap remaining', projection.cap_remaining_after === null || projection.cap_remaining_after === undefined ? '—' : num58(projection.cap_remaining_after)],
    ['Canonical recheck', data.requires_canonical_confirmation ? 'Required' : 'Still required at execution'],
  ]);
  if (data.replacement) {
    section58(body, 'Replacement slot', [
      row58(val58(data.replacement.outgoing_player), `OUT ${num58(data.replacement.outgoing_mmr)} → IN ${num58(data.replacement.incoming_mmr)}`),
    ]);
  }
  if (data.counterparty) {
    const cp = data.counterparty;
    const cpProjection = data.counterparty_projection || {};
    section58(body, 'Trade counterparty', [
      row58(val58(cp.name), `${val58(cp.current_franchise)} · ${val58(cp.current_tier)} · MMR ${num58(cp.mmr)}`),
      row58('Counterparty salary after', `${num58(cpProjection.projected_salary)} / ${cpProjection.salary_cap === null || cpProjection.salary_cap === undefined ? '—' : num58(cpProjection.salary_cap)}`),
    ]);
  }
  section58(body, 'Blockers', (data.blockers || []).map((item) => row58(item)), 'No deterministic blockers found in this preview.');
  section58(body, 'Revalidation notes', (data.warnings || []).map((item) => row58(item)), 'No additional preview warnings.');
  body.append(el58('p', 'f58-boundary', `Preview only. Use ${val58(data.canonical_command, 'the canonical roster command')} to execute; it revalidates current state before mutation.`));
}

async function openTransaction58() {
  const body = drawer58('Transaction Simulator', 'FEATURE 06 · GM PREFLIGHT');
  const bootstrap = await bootstrap58().catch(() => ({}));
  const profile = bootstrap.profile?.player || {};
  const form = el58('form', 'f58-form');
  const action = field58('Action', 'action', { select: [['sign', 'Sign'], ['claim', 'Claim'], ['release', 'Release'], ['sub', 'Sub'], ['sub_up', 'Sub-up'], ['trade', 'Trade']] });
  const player = field58('Player', 'player', { required: true, placeholder: 'Exact SSL player name' });
  const franchise = field58('Franchise', 'franchise', { required: true, value: profile.franchise_tag || profile.franchise || '', placeholder: 'FZN' });
  const tier = field58('Tier', 'tier', { required: true, value: profile.tier || '', placeholder: 'Legend' });
  const outPlayer = field58('Outgoing player', 'out_player', { placeholder: 'For Sub / Sub-up', help: 'Provides exact replacement-slot and cap preflight.' });
  const counterparty = field58('Trade counterparty player', 'counterparty_player', { placeholder: 'Required for Trade', help: 'Projects both roster/cap states.' });
  const { actions, submit } = formActions58('Preview Transaction');
  form.append(action.wrap, player.wrap, franchise.wrap, tier.wrap, outPlayer.wrap, counterparty.wrap, actions);
  body.append(form);
  const result = el58('div', 'f58-result');
  body.append(result);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    clear58(result);
    try {
      const payload = await api58('/api/ssl/v1/transaction/preview', {
        method: 'POST',
        body: JSON.stringify({
          action: action.input.value,
          player: player.input.value.trim(),
          franchise: franchise.input.value.trim(),
          tier: tier.input.value.trim(),
          out_player: outPlayer.input.value.trim(),
          counterparty_player: counterparty.input.value.trim(),
        }),
      });
      renderTransaction58(result, payload);
    } catch (error) {
      alert58(result, error.message, true);
    } finally {
      submit.disabled = false;
    }
  });
}

function availabilityRows58(saved) {
  if (!saved) return [];
  const start = saved.available_start ? new Date(saved.available_start).toLocaleString() : '—';
  const end = saved.available_end ? new Date(saved.available_end).toLocaleString() : '—';
  return [
    row58('Saved window', `${start} → ${end}`),
    row58('Timezone label', val58(saved.timezone_label)),
    row58('Note', val58(saved.note, 'No note')),
  ];
}

function renderOptimizer58(parent, data) {
  if (data.status !== 'ok') {
    alert58(parent, data.message || `Scheduling optimizer returned ${val58(data.status)}.`, true);
    return;
  }
  const match = data.match || {};
  const responses = data.responses || {};
  hero58(parent, 'FEATURE 07 · AVAILABILITY OVERLAP', `${val58(match.home)} vs ${val58(match.away)}`, `Week ${val58(match.week)} · ${val58(match.tier)} · Schedule ${val58(data.schedule_id)}`);
  stats58(parent, [
    ['Home responses', `${num58(responses.home)} / ${num58(responses.home_total)}`],
    ['Away responses', `${num58(responses.away)} / ${num58(responses.away_total)}`],
    ['Missing', num58(responses.missing)],
    ['Window', `${num58(data.optimizer?.window_minutes || 60)} min`],
  ]);
  section58(
    parent,
    'Best overlap windows',
    (data.options || []).slice(0, 8).map((option, index) => row58(
      `${index + 1}. ${new Date(option.start_utc).toLocaleString()} → ${new Date(option.end_utc).toLocaleTimeString()}`,
      `Home ${num58(option.home_available)} · Away ${num58(option.away_available)}`,
    )),
    'Not enough overlapping submitted availability yet.',
  );
  parent.append(el58('p', 'f58-boundary', 'Optimizer suggestions only. Saving availability or viewing overlap options never changes the official generated schedule.'));
}

async function openAvailability58(optimizerOnly = false) {
  const body = drawer58(optimizerOnly ? 'Scheduling Optimizer' : 'Match Availability', `FEATURE 07 · ${optimizerOnly ? 'OPTIMIZER' : 'YOUR PREFERENCE'}`);
  let bootstrap = {};
  try { bootstrap = await bootstrap58(); } catch { /* handled below */ }
  const scheduleId = bootstrap.match_hq?.schedule_id || '';

  if (!optimizerOnly) {
    const form = el58('form', 'f58-form');
    const schedule = field58('Schedule ID', 'schedule_id', { required: true, value: scheduleId, placeholder: 'Active Match HQ schedule' });
    const timezone = field58('Timezone', 'timezone', { required: true, value: 'America/New_York', help: 'Discord timestamps and explicit ISO offsets are also accepted.' });
    const start = field58('Available from', 'start', { required: true, placeholder: '2026-08-22 7:00 PM or <t:...:F>' });
    const end = field58('Available until', 'end', { required: true, placeholder: '2026-08-22 10:00 PM or ISO offset' });
    const note = field58('Note', 'note', { textarea: true, full: true, maxLength: 240, placeholder: 'Optional' });
    const actions = el58('div', 'f58-actions');
    const clearButton = el58('button', 'cc-button ghost', 'Clear Mine');
    clearButton.type = 'button';
    const save = el58('button', 'cc-button primary', 'Save Availability');
    save.type = 'submit';
    actions.append(clearButton, save);
    form.append(schedule.wrap, timezone.wrap, start.wrap, end.wrap, note.wrap, actions);
    body.append(form);
    const savedBox = el58('div', 'f58-result');
    body.append(savedBox);

    const refreshSaved = async () => {
      clear58(savedBox);
      if (!schedule.input.value.trim()) return;
      try {
        const data = await api58(`/api/ssl/v1/availability?schedule_id=${encodeURIComponent(schedule.input.value.trim())}`);
        section58(savedBox, 'Your saved availability', availabilityRows58(data.availability), 'No availability saved for this match yet.');
      } catch (error) {
        alert58(savedBox, error.message, true);
      }
    };
    await refreshSaved();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        const data = await api58('/api/ssl/v1/availability', {
          method: 'POST',
          body: JSON.stringify({
            schedule_id: schedule.input.value.trim(),
            start: start.input.value.trim(),
            end: end.input.value.trim(),
            timezone: timezone.input.value.trim(),
            note: note.input.value.trim(),
          }),
        });
        if (data.status !== 'ok') throw new Error(data.message || data.status);
        await refreshSaved();
      } catch (error) {
        alert58(savedBox, error.message, true);
      } finally {
        save.disabled = false;
      }
    });
    clearButton.addEventListener('click', async () => {
      if (!schedule.input.value.trim()) return;
      clearButton.disabled = true;
      try {
        await api58('/api/ssl/v1/availability', {
          method: 'DELETE',
          body: JSON.stringify({ schedule_id: schedule.input.value.trim() }),
        });
        await refreshSaved();
      } catch (error) {
        alert58(savedBox, error.message, true);
      } finally {
        clearButton.disabled = false;
      }
    });
  }

  const optimizer = el58('div', 'f58-result');
  body.append(optimizer);
  try {
    const suffix = scheduleId ? `?schedule_id=${encodeURIComponent(scheduleId)}` : '';
    renderOptimizer58(optimizer, await api58(`/api/ssl/v1/availability/options${suffix}`));
  } catch (error) {
    alert58(optimizer, error.message, true);
  }
}

function renderScout58(body, data) {
  if (data.status !== 'ok') {
    alert58(body, data.message || `Scout Card returned ${val58(data.status)}.`, true);
    return;
  }
  const opponent = data.opponent || {};
  const standing = data.standings || {};
  hero58(body, 'FEATURE 08 · FACTUAL OPPONENT INTELLIGENCE', `${val58(opponent.tag, '')} ${val58(opponent.team)}`.trim(), `${val58(opponent.tier)} · Rank #${val58(standing.rank)} · Series ${num58(standing.wins)}-${num58(standing.losses)}`);
  const totals = data.team_totals || {};
  stats58(body, [
    ['Games', num58(totals.games)],
    ['Goals', num58(totals.goals)],
    ['Assists', num58(totals.assists)],
    ['Saves', num58(totals.saves)],
    ['Score', num58(totals.score)],
    ['MVPs', num58(totals.mvps)],
  ]);
  section58(body, 'Current roster', (data.roster || []).map((player) => row58(val58(player.player), `MMR ${num58(player.mmr)}`)));
  const metricRows = [];
  for (const [metric, leaders] of Object.entries(data.metric_leaders || {})) {
    const names = (leaders || []).map((leader) => `${val58(leader.player)} (${num58(leader.value)})`).join(', ');
    metricRows.push(row58(title58(metric), names || '—'));
  }
  section58(body, 'Current statistical leaders', metricRows);
  section58(body, 'Recent finalized form', (data.recent_form || []).map((match) => row58(`Week ${val58(match.week)} · ${val58(match.opponent)}`, `${val58(match.result)} ${val58(match.score)}`)));
  const h2h = data.head_to_head || {};
  section58(body, 'Head-to-head this season', [
    row58('Series', `${num58(h2h.caller_wins)}-${num58(h2h.opponent_wins)} · ${num58(h2h.series_played)} played`),
    ...(h2h.recent || []).map((match) => row58(`Week ${val58(match.week)} · ${val58(match.home)} vs ${val58(match.away)}`, `${val58(match.score)} · ${title58(match.winner)}`)),
  ]);
  const power = data.power_ranking || {};
  const match = data.match_context || {};
  section58(body, 'Context', [
    row58('Latest stored power rank', power.available ? `#${val58(power.rank)}` : 'Not available'),
    row58('Current Match HQ', match.schedule_id ? `Week ${val58(match.week)} · ${title58(match.status)} · ${match.checkin_complete ? 'Checked in' : 'Check-in pending'}` : 'No active H2H Match HQ'),
  ]);
  body.append(el58('p', 'f58-boundary', data.note || 'Factual SSL data only. No generated tactical or psychological claims.'));
  if (data.privacy) body.append(el58('p', 'cc-muted', data.privacy));
}

async function openScout58() {
  const body = drawer58('Opponent Scout Card', 'FEATURE 08 · LIVE FACTUAL DATA');
  body.append(el58('p', 'cc-muted', 'Loading your next authorized opponent…'));
  try {
    const data = await api58('/api/ssl/v1/scout');
    clear58(body);
    renderScout58(body, data);
  } catch (error) {
    clear58(body);
    alert58(body, error.message, true);
  }
}

async function intercept58(event) {
  const button = event.target.closest('.cc-action-card');
  if (!button) return;
  const label = button.querySelector('b')?.textContent?.trim() || '';
  const feature = FEATURES_5_8.get(label);
  if (!feature) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    if (feature === 'scenario') return await openScenario58();
    if (feature === 'transaction') return await openTransaction58();
    if (feature === 'availability') return await openAvailability58(false);
    if (feature === 'optimizer') return await openAvailability58(true);
    if (feature === 'scout') return await openScout58();
  } catch (error) {
    const body = drawer58(label, 'SSL TOOL');
    alert58(body, error.message || 'Unable to load this SSL feature.', true);
  }
}

document.addEventListener('click', intercept58, true);
