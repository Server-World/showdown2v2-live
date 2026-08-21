const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  session: null,
  csrf: "",
  bootstrap: null,
  context: "personal",
  selectedTier: "Legend",
  selectedFranchise: "",
  currentData: null,
  channels: [],
  selectedChannel: "",
  streamAbort: null,
  pollTimer: null,
};

const contextCopy = {
  personal: ["PERSONAL COMMAND CENTER", "Your SSL Command Center", "Your roster, match, career, availability, and league tools in one live surface."],
  tier: ["TIER COMMAND CENTER", "Tier Command Center", "Live standings, leaders, match state, and tier-level league intelligence."],
  franchise: ["FRANCHISE COMMAND CENTER", "Franchise Command Center", "Roster structure, operational health, and authorized franchise tools."],
  league: ["LEAGUE COMMAND CENTER", "League Command Center", "Cross-tier game-day, integrity, and administrative league operations."],
};

function activityHeaders() {
  return window.sslActivitySession ? { "X-SSL-Activity-Session": window.sslActivitySession } : {};
}

async function api(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  for (const [name, headerValue] of Object.entries(activityHeaders())) headers.set(name, headerValue);
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-SSL-CSRF", state.csrf);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...options, method, headers, cache: "no-store" });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : { message: await response.text().catch(() => "") };
  if (!response.ok) {
    const error = new Error(payload.message || payload.status || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function val(input, fallback = "—") {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input);
}

function number(input) {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function setConnection(online, label = online ? "Live" : "Offline") {
  $("#cc-live-dot").classList.toggle("offline", !online);
  $("#cc-live-label").textContent = label;
}

function setAlert(message = "", kind = "") {
  const box = $("#cc-alert");
  if (!message) {
    box.hidden = true;
    box.textContent = "";
    box.className = "cc-alert";
    return;
  }
  box.hidden = false;
  box.className = `cc-alert${kind === "error" ? " error" : ""}`;
  box.textContent = message;
}

function setTool(title, kicker = "SSL TOOL") {
  $("#cc-tool-kicker").textContent = kicker;
  $("#cc-tool-title").textContent = title;
  clear($("#cc-tool-body"));
  $("#cc-tool-drawer").hidden = false;
  $("#cc-tool-drawer").scrollIntoView({ behavior: "smooth", block: "nearest" });
  return $("#cc-tool-body");
}

function closeTool() {
  $("#cc-tool-drawer").hidden = true;
  clear($("#cc-tool-body"));
}

function appendStat(parent, label, stat) {
  const card = el("div", "cc-stat");
  card.append(el("b", "", stat), el("span", "", label));
  parent.append(card);
}

function panel(title, kicker = "LIVE") {
  const article = el("article", "cc-panel");
  article.append(el("span", "cc-kicker", kicker), el("h3", "", title));
  return article;
}

function listRow(left, right = "") {
  const row = el("div", "cc-list-row");
  row.append(el("strong", "", left), el("span", "", right));
  return row;
}

function profilePlayer() {
  return state.bootstrap?.profile?.player || {};
}

function currentFranchiseGuess() {
  const player = profilePlayer();
  return val(player.franchise_tag || player.franchise || state.selectedFranchise, "").trim();
}

function matchHq() {
  return state.bootstrap?.match_hq || {};
}

function showSignedIn(session, bootstrap) {
  const user = bootstrap?.session_user || session.user || {};
  $("#cc-avatar").src = user.avatar_url || "/assets/branding/ssl-logo.svg";
  $("#cc-avatar").alt = user.display_name || user.name || "SSL member";
  $("#cc-user-name").textContent = user.display_name || user.name || "SSL Member";
  $("#cc-user-role").textContent = bootstrap?.scope?.role || "Member";
  $("#cc-league-nav").hidden = !bootstrap?.scope?.is_admin;
  $("#cc-logout").hidden = Boolean(session.activity);
}

function renderTierChips(tiers = []) {
  const box = $("#cc-tier-list");
  clear(box);
  for (const tier of tiers) {
    const button = el("button", `cc-tier-chip${tier === state.selectedTier ? " active" : ""}`, tier);
    button.type = "button";
    button.addEventListener("click", () => {
      state.selectedTier = tier;
      openContext("tier");
    });
    box.append(button);
  }
}

function actionDescription(id) {
  const descriptions = {
    ask_ssl: "Ask the league using role-scoped canonical SSL data.",
    view_standings: "Open current tier standings and records.",
    view_roster: "Open a franchise roster workspace.",
    career_passport: "Review current and career SSL history.",
    milestones: "See earned and upcoming milestones plus league records.",
    scenario_lab: "Model read-only standings outcomes without changing league state.",
    scout_opponent: "Open factual opponent intelligence for your active matchup.",
    match_hq: "Open live Match HQ readiness and match state.",
    set_availability: "Save your own availability for an approved matchup.",
    transaction_preview: "Preview roster legality without executing a transaction.",
    franchise_health: "Review roster, cap, and operational franchise findings.",
    schedule_optimizer: "Find the best overlap from submitted player availability.",
    league_operations: "Open cross-tier administrative status.",
    state_integrity: "Review silent drift findings; no autonomous competitive repairs.",
    game_day: "Review current-week match readiness and blockers.",
    ops_diagnostics: "Use the canonical Discord diagnostics command.",
  };
  return descriptions[id] || "Open this authorized SSL function.";
}

function renderActions(capabilities = []) {
  const box = $("#cc-actions");
  clear(box);
  if (!capabilities.length) {
    box.append(el("p", "cc-muted", "No command-center actions are available for this role/context."));
    return;
  }
  for (const capability of capabilities) {
    const button = el("button", "cc-action-card");
    button.type = "button";
    button.dataset.mode = capability.mode || "web";
    const mode = el("span", "mode", capability.mode === "discord" ? "DISCORD CANONICAL" : capability.write ? "AUTHORIZED WRITE" : "LIVE TOOL");
    button.append(
      mode,
      el("b", "", capability.label || capability.id),
      el("small", "", capability.reason || capability.confirmation || actionDescription(capability.id)),
    );
    button.addEventListener("click", () => openCapability(capability));
    box.append(button);
  }
}

function renderPersonal(data) {
  const grid = $("#cc-dashboard");
  clear(grid);
  const playerData = data.profile?.player || {};
  const identity = panel("Player Identity", "YOUR SSL PROFILE");
  identity.append(el("p", "", playerData.name ? `${playerData.name} · ${val(playerData.tier)}` : data.profile?.message || "No registered player profile linked."));
  const stats = el("div", "cc-stat-grid");
  appendStat(stats, "MMR", val(playerData.mmr));
  appendStat(stats, "Franchise", val(playerData.franchise));
  appendStat(stats, "Eligibility", val(playerData.eligibility));
  identity.append(stats);
  grid.append(identity);

  const hq = panel("Match HQ", "GAME DAY");
  const match = data.match_hq || {};
  if (match.status === "ok") {
    hq.append(el("p", "", `${val(match.home)} vs ${val(match.away)} · Week ${val(match.played_week || match.week)} · ${val(match.tier)}`));
    const hqStats = el("div", "cc-stat-grid");
    appendStat(hqStats, "Check-in", match.checkin_complete ? "Ready" : "Pending");
    appendStat(hqStats, "Replays", number(match.replays_uploaded));
    appendStat(hqStats, "Status", val(match.phase || match.status));
    hq.append(hqStats);
  } else hq.append(el("p", "cc-muted", match.message || "No active Match HQ found."));
  grid.append(hq);

  const career = panel("Career Passport", "YOUR LEGACY");
  const careerData = data.career || {};
  if (careerData.status === "ok") {
    const current = careerData.current_season || {};
    const all = careerData.career || {};
    const statsBox = el("div", "cc-stat-grid");
    appendStat(statsBox, "Career GP", number(all.games_played));
    appendStat(statsBox, "Career Goals", number(all.goals));
    appendStat(statsBox, "Season Goals", number(current.goals));
    appendStat(statsBox, "Assists", number(all.assists));
    appendStat(statsBox, "Saves", number(all.saves));
    appendStat(statsBox, "MVPs", number(all.mvps));
    career.append(statsBox);
  } else career.append(el("p", "cc-muted", careerData.message || "Career history is unavailable."));
  grid.append(career);

  const upcoming = panel("Upcoming Matches", "SCHEDULE");
  upcoming.classList.add("wide");
  const matches = data.upcoming?.matches || [];
  const list = el("div", "cc-list");
  for (const row of matches.slice(0, 8)) list.append(listRow(`Week ${val(row.week)} · ${val(row.home)} vs ${val(row.away)}`, val(row.tier)));
  if (!matches.length) list.append(el("p", "cc-muted", "No upcoming approved matches found."));
  upcoming.append(list);
  grid.append(upcoming);
}

function renderTier(data) {
  const grid = $("#cc-dashboard");
  clear(grid);
  const standings = panel(`${data.tier} Standings`, "TIER TABLE");
  const list = el("div", "cc-list");
  for (const [index, row] of (data.standings?.rows || []).slice(0, 12).entries()) {
    const name = row.team_name || row.team || row.franchise_name || "Team";
    list.append(listRow(`${index + 1}. ${name}`, `${number(row.wins)}-${number(row.losses)}`));
  }
  if (!list.children.length) list.append(el("p", "cc-muted", "No standings rows available."));
  standings.append(list);
  grid.append(standings);

  const leaders = panel(`${data.tier} Leaders`, "PLAYER LEADERS");
  const leaderList = el("div", "cc-list");
  for (const row of (data.leaders || []).slice(0, 8)) leaderList.append(listRow(`${val(row.franchise_tag, "")} ${val(row.player)}`.trim(), `G ${number(row.goals)} · A ${number(row.assists)} · S ${number(row.saves)}`));
  if (!leaderList.children.length) leaderList.append(el("p", "cc-muted", "No leader data available."));
  leaders.append(leaderList);
  grid.append(leaders);

  const matches = panel(`${data.tier} Match Board`, "LIVE MATCH STATE");
  matches.classList.add("wide");
  const matchList = el("div", "cc-list");
  for (const row of (data.matches || []).slice(0, 16)) {
    const teams = `${val(row.home_tag, "")} ${val(row.home)} vs ${val(row.away_tag, "")} ${val(row.away)}`.replace(/\s+/g, " ").trim();
    matchList.append(listRow(`W${val(row.week)} · ${teams}`, val(row.match_status || row.schedule_status)));
  }
  if (!matchList.children.length) matchList.append(el("p", "cc-muted", "No approved tier matches found."));
  matches.append(matchList);
  grid.append(matches);
}

function renderFranchise(data) {
  const grid = $("#cc-dashboard");
  clear(grid);
  const roster = data.roster || {};
  const franchise = roster.franchise || {};
  const rosterPanel = panel(`${val(franchise.tag, "")} ${val(franchise.name, "Franchise")}`.trim(), "FRANCHISE ROSTER");
  rosterPanel.classList.add("wide");
  for (const team of roster.teams || []) {
    rosterPanel.append(listRow(`${val(team.tier)} · ${val(team.team_name)}`, `${(team.players || []).length} players`));
    const playerList = el("div", "cc-list");
    for (const player of team.players || []) playerList.append(listRow(val(player.name), `${val(player.position)} · MMR ${val(player.mmr)}`));
    rosterPanel.append(playerList);
  }
  grid.append(rosterPanel);

  if (data.health?.status === "ok") {
    const health = panel("Franchise Health", "OPERATIONS");
    health.append(el("p", "", `Overall: ${val(data.health.overall).replaceAll("_", " ")}`));
    const findings = el("div", "cc-list");
    for (const finding of data.health.findings || []) findings.append(listRow(val(finding.code), val(finding.summary)));
    if (!findings.children.length) findings.append(el("p", "cc-muted", "No current operational findings."));
    health.append(findings);
    grid.append(health);
  }
}

function renderLeague(data) {
  const grid = $("#cc-dashboard");
  clear(grid);
  const settings = panel("League State", "ADMIN");
  const meta = el("div", "cc-stat-grid");
  appendStat(meta, "Season", val(data.settings?.season_number));
  appendStat(meta, "Week", val(data.settings?.match_played_week));
  appendStat(meta, "Phase", val(data.settings?.phase));
  settings.append(meta);
  grid.append(settings);

  const game = panel("Game-Day Operations", "CURRENT WEEK");
  const summary = data.game_day?.summary || {};
  const gameStats = el("div", "cc-stat-grid");
  appendStat(gameStats, "HQ Ready", number(summary.hq_ready));
  appendStat(gameStats, "Final", number(summary.finalized));
  appendStat(gameStats, "Blocked", number(summary.blocked));
  appendStat(gameStats, "Missing HQ", number(summary.missing_hq));
  game.append(gameStats);
  grid.append(game);

  const integrity = panel("State Integrity", "RECONCILIATION");
  const findings = data.integrity?.open_findings || [];
  integrity.append(el("p", "", `${findings.length} open findings · competitive repairs are never automatic.`));
  const integrityList = el("div", "cc-list");
  for (const row of findings.slice(0, 8)) integrityList.append(listRow(val(row.domain), val(row.summary)));
  integrity.append(integrityList);
  grid.append(integrity);

  const tiers = panel("All Tiers", "LEAGUE TABLE");
  tiers.classList.add("wide");
  const tierList = el("div", "cc-list");
  for (const row of data.tiers || []) {
    const leader = row.leader || {};
    tierList.append(listRow(row.tier, `${val(leader.team_name || leader.team || leader.franchise_name)} · ${number(leader.wins)}-${number(leader.losses)}`));
  }
  tiers.append(tierList);
  grid.append(tiers);
}

function renderContext(data) {
  state.currentData = data;
  renderActions(data.capabilities || state.bootstrap?.capabilities || []);
  if (state.context === "personal") renderPersonal(data);
  if (state.context === "tier") renderTier(data);
  if (state.context === "franchise") renderFranchise(data);
  if (state.context === "league") renderLeague(data);
  $("#cc-sync-time").textContent = `Synced ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

async function loadContext(context) {
  setAlert();
  const [kicker, title, copy] = contextCopy[context] || contextCopy.personal;
  $("#cc-context-kicker").textContent = kicker;
  $("#cc-context-title").textContent = context === "tier" ? `${state.selectedTier} Command Center` : context === "franchise" && state.selectedFranchise ? `${state.selectedFranchise} Command Center` : title;
  $("#cc-context-copy").textContent = copy;
  try {
    let data;
    if (context === "personal") data = state.bootstrap = await api("/api/ssl/v1/bootstrap");
    if (context === "tier") data = await api(`/api/ssl/v1/tier/${encodeURIComponent(state.selectedTier)}`);
    if (context === "franchise") {
      const query = state.selectedFranchise || currentFranchiseGuess();
      if (!query) throw new Error("Enter a franchise tag or name first.");
      state.selectedFranchise = query;
      data = await api(`/api/ssl/v1/franchise/${encodeURIComponent(query)}`);
    }
    if (context === "league") data = await api("/api/ssl/v1/league");
    renderContext(data);
    setConnection(true, "Live");
  } catch (error) {
    setConnection(false, "Degraded");
    setAlert(error.message || "Could not load this command-center context.", "error");
  }
}

async function openContext(context) {
  if (context === "league" && !state.bootstrap?.scope?.is_admin) return;
  state.context = context;
  $$(".cc-nav-item").forEach((button) => button.classList.toggle("active", button.dataset.context === context));
  renderTierChips(state.bootstrap?.tiers || []);
  closeTool();
  await loadContext(context);
}

function resultBox(parent, data) {
  const box = el("div", "cc-result-box");
  box.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  parent.append(box);
  return box;
}

function createField(labelText, name, options = {}) {
  const wrapper = el("div", `cc-field${options.full ? " full" : ""}`);
  const label = el("label", "", labelText);
  const input = document.createElement(options.tag || "input");
  input.name = name;
  input.id = `cc-tool-${name}`;
  if (options.type) input.type = options.type;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.value !== undefined) input.value = options.value;
  if (options.required) input.required = true;
  if (options.maxLength) input.maxLength = options.maxLength;
  if (options.options) {
    for (const [optionValue, text] of options.options) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = text;
      input.append(option);
    }
  }
  wrapper.append(label, input);
  return { wrapper, input };
}

function openStaticData(title, data, kicker = "LIVE DATA") {
  resultBox(setTool(title, kicker), data);
}

async function openCapability(capability) {
  const id = capability.id;
  if (capability.mode === "discord") return openDiscordCanonical(capability);
  if (id === "ask_ssl") return $("#cc-ask-input").focus();
  if (id === "view_standings") return openContext("tier");
  if (id === "view_roster") {
    const guess = currentFranchiseGuess();
    if (guess) state.selectedFranchise = guess;
    return openContext("franchise");
  }
  if (id === "career_passport") return openStaticData("Career Passport", state.bootstrap?.career || { status: "unavailable" });
  if (id === "milestones") return openStaticData("Milestones & Records", state.bootstrap?.milestones || { status: "unavailable" });
  if (id === "match_hq") return openStaticData("Match HQ", state.bootstrap?.match_hq || { status: "unavailable" }, "GAME DAY");
  if (id === "scenario_lab") return openScenarioTool();
  if (id === "scout_opponent") return openScoutTool();
  if (id === "set_availability") return openAvailabilityTool();
  if (id === "transaction_preview") return openTransactionTool();
  if (id === "franchise_health") {
    const query = state.selectedFranchise || currentFranchiseGuess();
    if (query) {
      state.selectedFranchise = query;
      return openContext("franchise");
    }
  }
  if (id === "schedule_optimizer") return openScheduleOptimizer();
  if (id === "league_operations") return openContext("league");
  if (id === "state_integrity") return openStaticData("State Integrity", state.currentData?.integrity || { status: "Open the League Command Center first." });
  if (id === "game_day") return openStaticData("Game-Day Operations", state.currentData?.game_day || { status: "Open the League Command Center first." });
  openStaticData(capability.label || id, { status: "available", note: actionDescription(id) });
}

async function openDiscordCanonical(capability) {
  const body = setTool(capability.label, "DISCORD CANONICAL ACTION");
  body.append(el("p", "", capability.reason || "This action stays in Discord because the canonical audited workflow owns the competitive mutation."));
  const hq = matchHq();
  const config = await api("/api/config").catch(() => ({}));
  const threadId = String(hq.thread_id || "").trim();
  if (threadId && config.guild_id) {
    const link = el("a", "cc-button primary", "Open Match HQ in Discord");
    link.href = `https://discord.com/channels/${encodeURIComponent(config.guild_id)}/${encodeURIComponent(threadId)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    body.append(link);
  } else if (capability.id === "ops_diagnostics") {
    body.append(el("div", "cc-result-box", "Run `/ops diagnostics` in the SSL Discord server."));
  } else body.append(el("div", "cc-result-box", "Open the active Match HQ thread in Discord to perform this action."));
}

function openScenarioTool() {
  const body = setTool("Scenario Lab", "READ-ONLY WHAT-IF");
  const form = el("form", "cc-form-grid");
  const team = createField("Franchise tag/name or team", "scenario-team", { placeholder: "Blank = my team" });
  const tier = createField("Tier", "scenario-tier", { placeholder: state.selectedTier });
  const outcome = createField("Force next result", "scenario-outcome", { tag: "select", options: [["none", "No forced result"], ["win", "Win next match"], ["loss", "Lose next match"]] });
  const actions = el("div", "cc-form-actions");
  const submit = el("button", "cc-button primary", "Run Scenario");
  submit.type = "submit";
  actions.append(submit);
  form.append(team.wrapper, tier.wrapper, outcome.wrapper, actions);
  body.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const data = await api("/api/ssl/v1/scenario", { method: "POST", body: JSON.stringify({ team: team.input.value, tier: tier.input.value, outcome: outcome.input.value }) });
      const existing = body.querySelector(".cc-result-box");
      if (existing) existing.remove();
      resultBox(body, data);
    } catch (error) { setAlert(error.message, "error"); }
    finally { submit.disabled = false; }
  });
}

async function openScoutTool() {
  const body = setTool("Opponent Scout Card", "FACTUAL INTELLIGENCE");
  body.append(el("p", "cc-muted", "Loading the opponent tied to your authorized active matchup…"));
  try {
    const data = await api("/api/ssl/v1/scout");
    clear(body);
    resultBox(body, data);
  } catch (error) {
    clear(body);
    body.append(el("div", "cc-alert error", error.message));
  }
}

function openTransactionTool() {
  const body = setTool("Transaction Simulator", "PREVIEW ONLY");
  const form = el("form", "cc-form-grid");
  const action = createField("Action", "tx-action", { tag: "select", options: [["sign", "Sign"], ["claim", "Claim"], ["release", "Release"], ["sub", "Sub"], ["sub_up", "Sub-up"], ["trade", "Trade"]] });
  const player = createField("Player", "tx-player", { placeholder: "Exact SSL player name", required: true });
  const franchise = createField("Franchise", "tx-franchise", { placeholder: currentFranchiseGuess() || "FZN", required: true });
  const tier = createField("Tier", "tx-tier", { placeholder: state.selectedTier || "Legend", required: true });
  const actions = el("div", "cc-form-actions");
  const submit = el("button", "cc-button primary", "Preview Transaction");
  submit.type = "submit";
  actions.append(submit);
  form.append(action.wrapper, player.wrapper, franchise.wrapper, tier.wrapper, actions);
  body.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const data = await api("/api/ssl/v1/transaction/preview", { method: "POST", body: JSON.stringify({ action: action.input.value, player: player.input.value, franchise: franchise.input.value, tier: tier.input.value }) });
      const existing = body.querySelector(".cc-result-box");
      if (existing) existing.remove();
      resultBox(body, data);
    } catch (error) { setAlert(error.message, "error"); }
    finally { submit.disabled = false; }
  });
}

function openAvailabilityTool() {
  const body = setTool("Match Availability", "YOUR PREFERENCE");
  const hq = matchHq();
  const form = el("form", "cc-form-grid");
  const schedule = createField("Schedule ID", "availability-schedule", { value: hq.schedule_id || "", required: true });
  const start = createField("Available from", "availability-start", { placeholder: "2026-08-22 7:00 PM", required: true });
  const end = createField("Available until", "availability-end", { placeholder: "2026-08-22 10:00 PM", required: true });
  const timezone = createField("Timezone", "availability-timezone", { value: "America/New_York", required: true });
  const note = createField("Note", "availability-note", { tag: "textarea", full: true, placeholder: "Optional", maxLength: 240 });
  const actions = el("div", "cc-form-actions");
  const clearButton = el("button", "cc-button ghost", "Clear Mine");
  clearButton.type = "button";
  const submit = el("button", "cc-button primary", "Save Availability");
  submit.type = "submit";
  actions.append(clearButton, submit);
  form.append(schedule.wrapper, timezone.wrapper, start.wrapper, end.wrapper, note.wrapper, actions);
  body.append(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const data = await api("/api/ssl/v1/availability", { method: "POST", body: JSON.stringify({ schedule_id: schedule.input.value, start: start.input.value, end: end.input.value, timezone: timezone.input.value, note: note.input.value }) });
      const existing = body.querySelector(".cc-result-box");
      if (existing) existing.remove();
      resultBox(body, data);
    } catch (error) { setAlert(error.message, "error"); }
    finally { submit.disabled = false; }
  });
  clearButton.addEventListener("click", async () => {
    if (!schedule.input.value) return;
    clearButton.disabled = true;
    try {
      const data = await api("/api/ssl/v1/availability", { method: "DELETE", body: JSON.stringify({ schedule_id: schedule.input.value }) });
      const existing = body.querySelector(".cc-result-box");
      if (existing) existing.remove();
      resultBox(body, data);
    } catch (error) { setAlert(error.message, "error"); }
    finally { clearButton.disabled = false; }
  });
}

async function openScheduleOptimizer() {
  const body = setTool("Scheduling Optimizer", "AVAILABILITY OVERLAP");
  const scheduleId = matchHq().schedule_id;
  try {
    const suffix = scheduleId ? `?schedule_id=${encodeURIComponent(scheduleId)}` : "";
    resultBox(body, await api(`/api/ssl/v1/availability/options${suffix}`));
  } catch (error) {
    body.append(el("div", "cc-alert error", error.message));
  }
}

async function askSSL(question) {
  const log = $("#cc-ask-log");
  log.append(el("div", "cc-user-message", question));
  const waiting = el("div", "cc-assistant-message", "Ask SSL is checking live league data…");
  log.append(waiting);
  log.scrollTop = log.scrollHeight;
  try {
    const data = await api("/api/ssl/v1/ask", { method: "POST", body: JSON.stringify({ question }) });
    waiting.textContent = data.answer || "Ask SSL returned no answer.";
  } catch (error) {
    waiting.textContent = `Ask SSL unavailable: ${error.message}`;
  }
  log.scrollTop = log.scrollHeight;
}

function setChatEnabled(canSend) {
  $("#cc-chat-input").disabled = !canSend;
  $("#cc-chat-send").disabled = !canSend;
  $("#cc-chat-live").textContent = state.channels.length ? "LIVE" : "OFFLINE";
  $("#cc-chat-live").classList.toggle("muted", !state.channels.length);
}

function renderChatMessage(message) {
  const box = el("div", "cc-chat-message");
  const header = document.createElement("header");
  header.append(
    el("strong", "", message.author?.name || "Discord member"),
    el("time", "", message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""),
  );
  box.append(header, el("p", "", message.content || ""));
  $("#cc-chat-log").append(box);
}

async function loadMessages() {
  if (!state.selectedChannel) return;
  const log = $("#cc-chat-log");
  clear(log);
  log.append(el("p", "cc-muted", "Loading Discord…"));
  try {
    const data = await api(`/api/ssl/v1/chat/${encodeURIComponent(state.selectedChannel)}/messages?limit=35`);
    clear(log);
    for (const message of data.messages || []) renderChatMessage(message);
    if (!(data.messages || []).length) log.append(el("p", "cc-muted", "No recent messages."));
    log.scrollTop = log.scrollHeight;
  } catch (error) {
    log.textContent = `Could not load Discord messages: ${error.message}`;
  }
}

async function loadChannels() {
  try {
    const data = await api("/api/ssl/v1/chat/channels");
    state.channels = data.channels || [];
    const select = $("#cc-chat-channel");
    clear(select);
    if (!state.channels.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No approved channels";
      select.append(option);
      setChatEnabled(false);
      return;
    }
    for (const channel of state.channels) {
      const option = document.createElement("option");
      option.value = channel.id;
      option.textContent = `#${channel.name}`;
      select.append(option);
    }
    state.selectedChannel = state.channels[0].id;
    select.value = state.selectedChannel;
    setChatEnabled(Boolean(state.channels[0].can_send));
    await loadMessages();
  } catch (error) {
    $("#cc-chat-log").textContent = `Discord chat unavailable: ${error.message}`;
    setChatEnabled(false);
  }
}

async function sendChat(content) {
  const data = await api(`/api/ssl/v1/chat/${encodeURIComponent(state.selectedChannel)}/messages`, { method: "POST", body: JSON.stringify({ content }) });
  if (data.message) {
    renderChatMessage(data.message);
    $("#cc-chat-log").scrollTop = $("#cc-chat-log").scrollHeight;
  }
}

async function startLiveStream() {
  if (state.streamAbort) state.streamAbort.abort();
  const abort = new AbortController();
  state.streamAbort = abort;
  const headers = new Headers({ Accept: "text/event-stream", ...activityHeaders() });
  try {
    const response = await fetch("/api/ssl/v1/events", { headers, cache: "no-store", signal: abort.signal });
    if (!response.ok || !response.body) throw new Error("Live stream unavailable");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(chunk, { stream: true });
      const packets = buffer.split("\n\n");
      buffer = packets.pop() || "";
      for (const packet of packets) {
        const dataLine = packet.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        let liveEvent;
        try { liveEvent = JSON.parse(dataLine.slice(6)); } catch { continue; }
        if (liveEvent.type === "discord_message" && String(liveEvent.channel_id) === String(state.selectedChannel) && liveEvent.message) {
          renderChatMessage(liveEvent.message);
          $("#cc-chat-log").scrollTop = $("#cc-chat-log").scrollHeight;
        }
        if (liveEvent.type === "availability_updated") $("#cc-sync-time").textContent = "Live update received";
      }
    }
  } catch (error) {
    if (!abort.signal.aborted) console.warn("SSL SSE stream unavailable; polling remains active", error);
  }
}

function startPollingFallback() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    if (document.hidden) return;
    if (state.selectedChannel) await loadMessages();
    await loadContext(state.context);
  }, 30000);
}

async function initialize() {
  await (window.sslActivityAuthPromise || Promise.resolve(null));
  let session;
  try {
    session = await api("/api/session");
  } catch {
    $("#cc-auth").hidden = false;
    $("#cc-app").hidden = true;
    const reason = new URLSearchParams(location.search).get("error");
    if (reason) {
      $("#cc-auth-error").hidden = false;
      $("#cc-auth-error").textContent = reason;
    }
    setConnection(false, "Sign in required");
    return;
  }
  state.session = session;
  state.csrf = session.csrf || "";
  $("#cc-auth").hidden = true;
  $("#cc-app").hidden = false;
  try {
    state.bootstrap = await api("/api/ssl/v1/bootstrap");
    if (profilePlayer().tier) state.selectedTier = profilePlayer().tier;
    const franchise = currentFranchiseGuess();
    if (franchise) {
      state.selectedFranchise = franchise;
      $("#cc-franchise-input").value = franchise;
    }
    showSignedIn(session, state.bootstrap);
    renderTierChips(state.bootstrap.tiers || []);
    renderContext(state.bootstrap);
    setConnection(true, "Live");
    await loadChannels();
    startLiveStream();
    startPollingFallback();
  } catch (error) {
    setConnection(false, "Degraded");
    setAlert(error.message || "SSL live service is unavailable.", "error");
  }
}

$("#cc-refresh").addEventListener("click", () => loadContext(state.context));
$("#cc-tool-close").addEventListener("click", closeTool);
$$(".cc-nav-item").forEach((button) => button.addEventListener("click", () => openContext(button.dataset.context)));
$("#cc-franchise-go").addEventListener("click", () => {
  const query = $("#cc-franchise-input").value.trim();
  if (!query) return;
  state.selectedFranchise = query;
  openContext("franchise");
});
$("#cc-franchise-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#cc-franchise-go").click();
  }
});
$("#cc-ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#cc-ask-input");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  await askSSL(question);
});
$("#cc-chat-channel").addEventListener("change", async (event) => {
  state.selectedChannel = event.target.value;
  const channel = state.channels.find((row) => String(row.id) === String(state.selectedChannel));
  setChatEnabled(Boolean(channel?.can_send));
  await loadMessages();
});
$("#cc-chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#cc-chat-input");
  const content = input.value.trim();
  if (!content) return;
  $("#cc-chat-send").disabled = true;
  try {
    await sendChat(content);
    input.value = "";
  } catch (error) {
    setAlert(error.message, "error");
  } finally {
    const channel = state.channels.find((row) => String(row.id) === String(state.selectedChannel));
    $("#cc-chat-send").disabled = !channel?.can_send;
  }
});
$("#cc-logout").addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: activityHeaders() });
  } finally {
    location.href = "/command-center/";
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.session) loadContext(state.context);
});

initialize();
