(() => {
  'use strict';

  const root = document.getElementById('player-experience');
  if (!root) return;

  const fmt = value => value == null || value === '' ? '—' : (Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—');
  const statCell = (label, value) => `<div><b>${fmt(value)}</b><small>${label}</small></div>`;
  let profiles = new Map();
  let generatedAt = null;

  function key(value) {
    return String(value || '').trim().toLowerCase();
  }

  function freshnessLabel() {
    if (!generatedAt) return 'StatBot verified public player profile.';
    const when = new Date(generatedAt);
    if (Number.isNaN(when.getTime())) return 'StatBot verified public player profile.';
    return `StatBot verified public player profile · updated ${when.toLocaleString()}.`;
  }

  function applyProfile() {
    const card = root.querySelector('.player-card-v5.roster-profile');
    if (!card) return;

    const gamertag = card.querySelector('.v5-identity-rail h2')?.textContent?.trim();
    const profile = profiles.get(key(gamertag));
    if (!profile) return;
    if (card.dataset.liveStats === key(gamertag)) return;

    const seasonStats = [
      ['GAMES', profile.season_games],
      ['GOALS', profile.season_goals],
      ['ASSISTS', profile.season_assists],
      ['SAVES', profile.season_saves],
      ['SHOTS', profile.season_shots],
      ['SCORE', profile.season_score],
      ['MVPS', profile.season_mvps]
    ];
    const careerStats = [
      ['GAMES', profile.career_games],
      ['WINS', profile.career_wins],
      ['LOSSES', profile.career_losses],
      ['GOALS', profile.career_goals],
      ['ASSISTS', profile.career_assists],
      ['SAVES', profile.career_saves],
      ['SHOTS', profile.career_shots],
      ['TOTAL SCORE', profile.career_score],
      ['MVPS', profile.career_mvps]
    ];

    const seasonPanel = card.querySelector('.v5-performance-panel');
    const careerPanel = card.querySelector('.v5-career-panel');
    const seasonPending = seasonPanel?.querySelector('.v5-profile-pending');
    const careerPending = careerPanel?.querySelector('.v5-profile-pending');

    if (seasonPending) {
      seasonPending.outerHTML = `<div class="v5-season-stats">${seasonStats.map(([label, value]) => statCell(label, value)).join('')}</div>`;
    }
    if (careerPending) {
      careerPending.outerHTML = `<div class="v5-career-stats">${careerStats.map(([label, value]) => statCell(label, value)).join('')}</div>`;
    }

    const summary = [...card.querySelectorAll('.v5-summary-row .v5-summary-cell')];
    if (summary.length >= 4) {
      const standing = summary[1].querySelector('strong')?.textContent?.trim() || '—';
      const record = summary[2].querySelector('strong')?.textContent?.trim() || '—';
      summary[1].innerHTML = `<small>LOCKED MMR</small><strong>${fmt(profile.mmr)}</strong><span>Public StatBot value</span>`;
      summary[2].innerHTML = `<small>SLP</small><strong>${fmt(profile.slp)}</strong><span>Season league points</span>`;
      summary[3].innerHTML = `<small>TEAM STANDING</small><strong>${standing}</strong><span>${record} team series</span>`;
    }

    const strip = card.querySelector('.v5-awards-strip');
    if (strip) {
      const label = profile.iron_man_gold
        ? 'GOLD IRON MAN'
        : profile.iron_man_blue
          ? 'BLUE IRON MAN'
          : profile.iron_man_weeks != null
            ? `${fmt(profile.iron_man_weeks)} WKS IRON MAN`
            : 'PUBLIC PROFILE';
      const span = strip.querySelector('span');
      const live = strip.querySelector('b');
      const small = strip.querySelector('small');
      if (span) span.textContent = 'StatBot verified player data';
      if (live) live.textContent = 'LIVE';
      if (small) small.textContent = label;
    }

    const note = card.querySelector('.v5-identity-note');
    if (note) note.textContent = freshnessLabel();

    const careerHead = careerPanel?.querySelector('.v5-panel-head span');
    if (careerHead) careerHead.textContent = 'RECORDED SSL TOTALS';

    card.classList.add('has-profile-data');
    card.dataset.liveStats = key(gamertag);
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
