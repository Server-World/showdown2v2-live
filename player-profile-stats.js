(() => {
  'use strict';

  const root = document.getElementById('player-experience');
  if (!root) return;

  const fmt = value => value == null || value === ''
    ? '—'
    : (Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—');
  const fmtPercent = value => value == null || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  const statCell = (label, value, isPercent = false) =>
    `<div><b>${isPercent ? fmtPercent(value) : fmt(value)}</b><small>${label}</small></div>`;

  let profiles = new Map();
  let generatedAt = null;

  function key(value) {
    return String(value || '').trim().toLowerCase();
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function safeAvatarUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('/assets/player-avatars/')) return raw;
    try {
      const url = new URL(raw, location.origin);
      if (url.protocol !== 'https:') return null;
      if (url.hostname === 'cdn.discordapp.com' || url.hostname === 'media.discordapp.net') {
        return url.href;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function snapshotState() {
    if (!generatedAt) {
      return { badge: 'PROFILE', note: 'StatBot public player profile snapshot.' };
    }
    const when = new Date(generatedAt);
    if (Number.isNaN(when.getTime())) {
      return { badge: 'PROFILE', note: 'StatBot public player profile snapshot.' };
    }
    const ageMinutes = Math.max(0, (Date.now() - when.getTime()) / 60000);
    const stamp = when.toLocaleString();
    if (ageMinutes <= 15) return { badge: 'LIVE', note: `StatBot verified · updated ${stamp}.` };
    if (ageMinutes <= 120) return { badge: 'UPDATED', note: `StatBot snapshot · updated ${stamp}.` };
    return { badge: 'STALE', note: `StatBot snapshot is older than expected · last updated ${stamp}.` };
  }

  function ironManLabel(profile) {
    const badge = String(profile?.iron_man_badge || '').trim() ||
      (profile?.iron_man_gold ? 'Gold' : profile?.iron_man_blue ? 'Blue' : 'None');
    const weeks = profile?.iron_man_weeks;
    const target = profile?.iron_man_target;
    if (weeks != null && target != null) return `${badge} · ${fmt(weeks)}/${fmt(target)}`;
    if (weeks != null) return `${badge} · ${fmt(weeks)} wks`;
    return badge || 'None';
  }

  function applyAvatar(container, profile, gamertag) {
    if (!container || !profile) return;
    const url = safeAvatarUrl(profile.avatar_url);
    if (!url) return;
    if (container.dataset.avatarUrl === url) return;
    container.innerHTML = `<img src="${esc(url)}" alt="${esc(gamertag)} player avatar" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
    container.classList.add('has-discord-avatar');
    container.dataset.avatarUrl = url;
  }

  function applyDirectoryAvatars() {
    root.querySelectorAll('.roster-player[data-player], .featured-player[data-player]').forEach(button => {
      const gamertag = button.dataset.player || '';
      const profile = profiles.get(key(gamertag));
      if (!profile) return;
      const avatar = button.querySelector('.roster-avatar');
      applyAvatar(avatar, profile, gamertag);
    });
  }

  function markFallbackCard(card) {
    const strip = card?.querySelector('.v5-awards-strip');
    if (!strip) return;
    const live = strip.querySelector('b');
    const small = strip.querySelector('small');
    if (live?.textContent === 'LIVE') live.textContent = 'ROSTER';
    if (small) small.textContent = 'SNAPSHOT';
    const note = card.querySelector('.v5-identity-note');
    if (note && !card.classList.contains('has-profile-data')) {
      note.textContent = 'Current public roster snapshot; StatBot player totals are not attached to this profile yet.';
    }
  }

  function applyProfile() {
    applyDirectoryAvatars();

    const card = root.querySelector('.player-card-v5.roster-profile');
    if (!card) return;

    const gamertag = card.querySelector('.v5-identity-rail h2')?.textContent?.trim();
    const profile = profiles.get(key(gamertag));
    if (!profile) {
      markFallbackCard(card);
      return;
    }
    if (card.dataset.liveStats === key(gamertag) && card.dataset.snapshotAt === String(generatedAt || '')) return;

    const seasonStats = [
      ['GOALS', profile.season_goals],
      ['ASSISTS', profile.season_assists],
      ['SAVES', profile.season_saves],
      ['SHOTS', profile.season_shots],
      ['SCORE', profile.season_score],
      ['MVPS', profile.season_mvps],
      ['SERIES WIN %', profile.season_win_pct, true]
    ];
    const careerStats = [
      ['GAMES', profile.career_games],
      ['WINS', profile.career_wins],
      ['GOALS', profile.career_goals],
      ['ASSISTS', profile.career_assists],
      ['SAVES', profile.career_saves],
      ['SHOTS', profile.career_shots],
      ['TOTAL SCORE', profile.career_score],
      ['MVPS', profile.career_mvps],
      ['WIN %', profile.career_win_pct, true]
    ];

    const headerContext = card.querySelector('.v5-context');
    if (headerContext) {
      const season = profile.season_number != null ? `SEASON ${profile.season_number}` : 'CURRENT SEASON';
      const week = profile.week_number != null ? ` · WEEK ${profile.week_number}` : '';
      const strong = headerContext.querySelector('strong');
      const span = headerContext.querySelector('span');
      if (strong) strong.textContent = `${season}${week}`;
      if (span) span.textContent = 'SSL BOT LEAGUE DATA';
    }

    const avatar = card.querySelector('.v5-avatar');
    applyAvatar(avatar, profile, gamertag || profile.gamertag || 'Player');

    const identityTeam = card.querySelector('.v5-teamline');
    if (identityTeam) {
      const franchise = profile.franchise || profile.franchise_tag || 'SSL';
      const team = profile.team || 'Free Agent';
      identityTeam.textContent = `${franchise} — ${team}`;
    }

    const role = card.querySelector('.v5-role');
    if (role && profile.roster_role) role.textContent = String(profile.roster_role);

    const status = card.querySelector('.v5-status');
    if (status && profile.eligibility_label) {
      status.lastChild.textContent = String(profile.eligibility_label).toUpperCase();
      const state = key(profile.eligibility_label);
      status.classList.toggle('is-ineligible', state.includes('ineligible') || state.includes('suspended') || state === 'inactive');
    }

    const metaRows = [...card.querySelectorAll('.v5-meta-list > div')];
    const meta = [
      ['TRACKER', profile.tracker_status || 'Not provided'],
      ['ROSTER', profile.roster_status || 'Verified'],
      ['SLP', fmt(profile.slp)],
      ['IRON MAN', ironManLabel(profile)]
    ];
    metaRows.slice(0, 4).forEach((row, index) => {
      const label = row.querySelector('small');
      const value = row.querySelector('b');
      if (label) label.textContent = meta[index][0];
      if (value) value.textContent = meta[index][1];
    });

    const summary = [...card.querySelectorAll('.v5-summary-row .v5-summary-cell')];
    if (summary.length >= 4) {
      const tier = String(profile.tier || '').trim() || summary[0].querySelector('strong')?.textContent?.trim() || 'UNKNOWN';
      summary[0].innerHTML = `<small>CURRENT TIER</small><strong style="color:var(--tier-color)">${esc(tier.toUpperCase())}</strong><span>SSL competitive tier</span>`;
      summary[1].innerHTML = `<small>LOCKED MMR</small><strong>${fmt(profile.mmr)}</strong><span>${profile.mmr_is_locked === false ? 'Final MMR fallback' : 'Locked for current profile'}</span>`;
      summary[2].innerHTML = `<small>LEAGUE STANDING</small><strong>${esc(profile.league_standing || 'N/A')}</strong><span>Current team tier standing</span>`;
      summary[3].innerHTML = `<small>RECENT RECORD</small><strong>${esc(profile.recent_record || '—')}</strong><span>Last five verified finalized series</span>`;
    }

    const strip = card.querySelector('.v5-awards-strip');
    if (strip) {
      const count = Math.max(0, Number(profile.awards_count || 0));
      const strong = strip.querySelector('strong');
      const span = strip.querySelector('span');
      const badge = strip.querySelector('b');
      const small = strip.querySelector('small');
      if (strong) strong.textContent = 'AWARDS';
      if (span) span.textContent = 'Recorded SSL honors';
      if (badge) badge.textContent = String(count).padStart(2, '0');
      if (small) small.textContent = 'OPEN AWARDS';
    }

    const seasonPanel = card.querySelector('.v5-performance-panel');
    const careerPanel = card.querySelector('.v5-career-panel');
    const seasonPending = seasonPanel?.querySelector('.v5-profile-pending');
    const careerPending = careerPanel?.querySelector('.v5-profile-pending');

    if (seasonPending) {
      seasonPending.outerHTML = `<div class="v5-season-stats">${seasonStats.map(([label, value, isPercent]) => statCell(label, value, isPercent)).join('')}</div>`;
    } else {
      const grid = seasonPanel?.querySelector('.v5-season-stats');
      if (grid) grid.innerHTML = seasonStats.map(([label, value, isPercent]) => statCell(label, value, isPercent)).join('');
    }
    if (careerPending) {
      careerPending.outerHTML = `<div class="v5-career-stats">${careerStats.map(([label, value, isPercent]) => statCell(label, value, isPercent)).join('')}</div>`;
    } else {
      const grid = careerPanel?.querySelector('.v5-career-stats');
      if (grid) grid.innerHTML = careerStats.map(([label, value, isPercent]) => statCell(label, value, isPercent)).join('');
    }

    const seasonHead = seasonPanel?.querySelector('.v5-panel-head span');
    if (seasonHead) seasonHead.textContent = `RECORDED SERIES · ${fmt(profile.season_series)}`;
    const careerHead = careerPanel?.querySelector('.v5-panel-head span');
    if (careerHead) careerHead.textContent = 'ALL RECORDED SSL SEASONS';

    const freshness = snapshotState();
    const note = card.querySelector('.v5-identity-note');
    if (note) note.textContent = freshness.note;

    const footer = card.querySelector('.v5-footer span');
    if (footer) footer.textContent = 'Server-authoritative SSL data · current season and recorded career totals';

    card.classList.add('has-profile-data');
    card.dataset.liveStats = key(gamertag);
    card.dataset.snapshotAt = String(generatedAt || '');
    card.dataset.freshness = freshness.badge.toLowerCase();
  }

  async function loadProfiles() {
    try {
      const response = await fetch('/data/player-profiles.json', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const rows = Array.isArray(payload?.players) ? payload.players : [];
      generatedAt = payload?.generated_at || null;
      profiles = new Map(rows.filter(row => row?.gamertag).map(row => [key(row.gamertag), row]));
      applyProfile();
    } catch (error) {
      console.warn('Public player profiles unavailable:', error);
    }
  }

  const observer = new MutationObserver(() => applyProfile());
  observer.observe(root, { childList: true, subtree: true });
  loadProfiles();
})();
