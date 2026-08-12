(() => {
  'use strict';

  const root = document.getElementById('player-experience');
  if (!root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—';
  const tierOrder = ['Mythic','Legend','Elite','Contender','Rookie','Amateur'];
  const franchiseOrder = ['D20','SP','GWS','FRZ','GLO','FCT'];
  const franchiseMeta = {
    D20:{name:'D20',logo:'/assets/franchises/D20.png',color:'#D4AF37'},
    SP:{name:'Solace Path',logo:'/assets/franchises/SP.png',color:'#8B5CF6'},
    GWS:{name:'GraveWardens',logo:'/assets/franchises/GWS.png',color:'#55D68B'},
    FRZ:{name:'Frozen',logo:'/assets/franchises/FZN.png',color:'#49C7FF'},
    GLO:{name:'Glow Stick Gang',logo:'/assets/franchises/GLO.png',color:'#FF69B4'},
    FCT:{name:'Ficticious Esports',logo:'/assets/franchises/FCT.png',color:'#FF9F43'}
  };

  async function getJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  function tierColor(tier) {
    return ({Mythic:'#FF69B4',Legend:'#BD7CFF',Elite:'#49C7FF',Contender:'#FF9F43',Rookie:'#55D68B',Amateur:'#FF8A80'})[tier] || '#F7FBFF';
  }

  function standingFor(league, player) {
    const rows = league?.standings?.[String(player?.tier || '').toLowerCase()] || [];
    return rows.find(row => row.team === player?.team) || null;
  }

  function initialsFor(player) {
    return String(player?.initials || player?.gamertag || 'SSL').trim().split(/\s+/)
      .map(part => part[0] || '').join('').slice(0, 2).toUpperCase() || 'SSL';
  }

  function richCard(player, league, profile) {
    const standing = standingFor(league, player);
    const franchise = franchiseMeta[player.franchise_tag] || {};
    const season = profile?.season || {};
    const stats = season.stats || {};
    const career = profile?.career || {};
    const iron = season.iron_man || {};
    const achievements = Array.isArray(profile?.achievements) ? profile.achievements : [];
    const seasonName = season.name || league?.season?.name || 'Current season';
    const weekNumber = season.week || league?.season?.week;
    const week = weekNumber ? `Week ${weekNumber}` : 'Current week';
    const tColor = tierColor(player.tier);
    const teamRank = standing?.rank ? `#${standing.rank}` : '—';
    const teamRecord = standing ? `${standing.wins}-${standing.losses}` : '—';
    const ironValue = iron.current != null && iron.target != null ? `${fmt(iron.current)} / ${fmt(iron.target)}` : '—';
    const seasonStats = [
      ['GAMES', stats.games], ['GOALS', stats.goals], ['ASSISTS', stats.assists], ['SAVES', stats.saves],
      ['SHOTS', stats.shots], ['SCORE', stats.score], ['MVPS', stats.mvps]
    ];
    const careerStats = [
      ['GAMES', career.games], ['WINS', career.wins], ['LOSSES', career.losses], ['GOALS', career.goals],
      ['ASSISTS', career.assists], ['SAVES', career.saves], ['SHOTS', career.shots], ['TOTAL SCORE', career.score], ['MVPS', career.mvps]
    ];

    return `<article class="fixed-player-card player-card-v5 has-profile-data" style="--franchise:${franchise.color || '#49C7FF'};--tier-color:${tColor}" aria-label="Player Card V5 for ${esc(player.gamertag)}">
      <div class="v5-top-rule" aria-hidden="true"><span></span></div>
      <header class="v5-header">
        <div class="v5-brand-lockup"><img src="/assets/branding/ssl-logo.svg" alt="" aria-hidden="true"><div><strong><i>S</i>UPERSONIC <i>S</i>HOWDOWN</strong><b><i>L</i>EAGUE <em>2</em><u>v</u><em>2</em></b></div></div>
        <div class="v5-profile-title">PLAYER PROFILE</div>
        <div class="v5-context"><strong>${esc(seasonName)} · ${esc(week)}</strong><span>PLAYER CARD V5 · WEB EDITION</span></div>
      </header>
      <div class="v5-divider"></div>
      <div class="v5-card-body">
        <aside class="v5-identity-rail">
          <div class="v5-identity-media"><div class="v5-avatar"><span>${esc(initialsFor(player))}</span></div><div class="v5-franchise-mark"><img src="${esc(franchise.logo || '/assets/branding/ssl-logo.svg')}" alt="${esc(player.franchise || franchise.name || 'SSL')} logo"></div></div>
          <span class="v5-kicker">PLAYER</span><h2>${esc(player.gamertag)}</h2><strong class="v5-teamline">${esc(player.franchise || franchise.name || 'SSL')} — ${esc(player.team || 'Featured profile')}</strong><span class="v5-role">${esc(player.role || 'Player')}</span>
          <div class="v5-status${player.eligible === false ? ' is-ineligible' : ''}"><span></span>${esc(player.eligibility_label || (player.eligible === false ? 'Eligibility pending' : 'CURRENT ROSTER'))}</div>
          <div class="v5-meta-list"><div><small>TRACKER</small><b>${esc(player.tracker || 'Available in SSL Bot')}</b></div><div><small>ROSTER</small><b>${esc(player.roster_status || 'Active roster')}</b></div><div><small>SLP</small><b>${fmt(season.slp)}</b></div><div><small>IRON MAN</small><b>${esc(ironValue)}</b></div></div>
          <p class="v5-identity-note">${esc(profile?.source_label || 'Featured public player profile')}</p>
        </aside>
        <section class="v5-overview-panel">
          <div class="v5-summary-row">
            <div class="v5-summary-cell"><small>CURRENT TIER</small><strong style="color:var(--tier-color)">${esc(String(player.tier || 'Unknown').toUpperCase())}</strong><span>SSL competitive tier</span></div>
            <div class="v5-summary-cell"><small>LOCKED MMR</small><strong>${fmt(player.locked_mmr)}</strong><span>Public profile value</span></div>
            <div class="v5-summary-cell"><small>SLP</small><strong>${fmt(season.slp)}</strong><span>Season league points</span></div>
            <div class="v5-summary-cell"><small>TEAM STANDING</small><strong>${esc(teamRank)}</strong><span>${standing ? `${esc(teamRecord)} team series` : 'Not in current public table'}</span></div>
          </div>
          <div class="v5-awards-strip"><strong>AWARDS</strong><span>${achievements.length ? esc(achievements[0]?.label || 'Season honors') : 'Season honors'}</span><b>${achievements.length || '—'}</b><small>${iron.badge ? esc(iron.badge) : 'PLAYER HONORS'}</small></div>
          <div class="v5-performance-panel"><div class="v5-panel-head"><strong>SEASON PERFORMANCE</strong><span>${esc(seasonName)} · ${esc(week)}</span></div><div class="v5-season-stats">${seasonStats.map(([label,value])=>`<div><b>${fmt(value)}</b><small>${label}</small></div>`).join('')}</div></div>
          <div class="v5-career-panel"><div class="v5-panel-head"><strong>ALL-TIME CAREER PERFORMANCE</strong><span>RECORDED SSL TOTALS</span></div><div class="v5-career-stats">${careerStats.map(([label,value])=>`<div><b>${fmt(value)}</b><small>${label}</small></div>`).join('')}</div></div>
        </section>
      </div>
      <footer class="v5-footer"><span>${esc(player.gamertag)} · ${esc(profile?.source_label || 'Featured player profile')}</span><b>V5 · OVERVIEW</b></footer>
    </article>`;
  }

  function rosterCard(player, league) {
    const standing = standingFor(league, player);
    const franchise = franchiseMeta[player.franchise_tag] || {};
    const seasonName = league?.season?.name || 'Current season';
    const week = league?.season?.week ? `Week ${league.season.week}` : 'Current week';
    const tColor = tierColor(player.tier);
    const teamRank = standing?.rank ? `#${standing.rank}` : '—';
    const teamRecord = standing ? `${standing.wins}-${standing.losses}` : '—';
    const goalDiff = standing?.differential != null ? `${Number(standing.differential) > 0 ? '+' : ''}${standing.differential}` : '—';

    return `<article class="fixed-player-card player-card-v5 roster-profile" style="--franchise:${franchise.color || '#49C7FF'};--tier-color:${tColor}" aria-label="Player Card V5 for ${esc(player.gamertag)}">
      <div class="v5-top-rule" aria-hidden="true"><span></span></div>
      <header class="v5-header">
        <div class="v5-brand-lockup"><img src="/assets/branding/ssl-logo.svg" alt="" aria-hidden="true"><div><strong><i>S</i>UPERSONIC <i>S</i>HOWDOWN</strong><b><i>L</i>EAGUE <em>2</em><u>v</u><em>2</em></b></div></div>
        <div class="v5-profile-title">PLAYER PROFILE</div>
        <div class="v5-context"><strong>${esc(seasonName)} · ${esc(week)}</strong><span>CURRENT SSL ROSTER</span></div>
      </header>
      <div class="v5-divider"></div>
      <div class="v5-card-body">
        <aside class="v5-identity-rail">
          <div class="v5-identity-media"><div class="v5-avatar"><span>${esc(initialsFor(player))}</span></div><div class="v5-franchise-mark"><img src="${esc(franchise.logo || '/assets/branding/ssl-logo.svg')}" alt="${esc(player.franchise || franchise.name || 'SSL')} logo"></div></div>
          <span class="v5-kicker">PLAYER</span><h2>${esc(player.gamertag)}</h2><strong class="v5-teamline">${esc(player.franchise || franchise.name || 'SSL')} — ${esc(player.team)}</strong><span class="v5-role">${esc(player.role || 'Player')}</span>
          <div class="v5-status"><span></span>CURRENT ROSTER</div>
          <div class="v5-meta-list"><div><small>DIVISION</small><b>${esc(player.tier)}</b></div><div><small>ROSTER ROLE</small><b>${esc(player.role || 'Player')}</b></div><div><small>TEAM SEED</small><b>${esc(teamRank)}</b></div><div><small>TEAM SERIES</small><b>${esc(teamRecord)}</b></div></div>
          <p class="v5-identity-note">Current public roster assignment.</p>
        </aside>
        <section class="v5-overview-panel">
          <div class="v5-summary-row">
            <div class="v5-summary-cell"><small>CURRENT TIER</small><strong style="color:var(--tier-color)">${esc(String(player.tier || 'Unknown').toUpperCase())}</strong><span>SSL competitive tier</span></div>
            <div class="v5-summary-cell"><small>TEAM STANDING</small><strong>${esc(teamRank)}</strong><span>Current division table</span></div>
            <div class="v5-summary-cell"><small>TEAM RECORD</small><strong>${esc(teamRecord)}</strong><span>Series W-L</span></div>
            <div class="v5-summary-cell"><small>GOAL DIFF</small><strong>${esc(goalDiff)}</strong><span>Current team differential</span></div>
          </div>
          <div class="v5-awards-strip"><strong>PLAYER DATA</strong><span>Public roster profile</span><b>LIVE</b><small>${esc(player.franchise_tag || 'SSL')}</small></div>
          <div class="v5-performance-panel"><div class="v5-panel-head"><strong>SEASON PERFORMANCE</strong><span>${esc(seasonName)} · ${esc(week)}</span></div><div class="v5-profile-pending"><strong>Individual season statistics are not published for this profile yet.</strong><span>Roster identity and current team standing are shown above.</span></div></div>
          <div class="v5-career-panel"><div class="v5-panel-head"><strong>ALL-TIME CAREER PERFORMANCE</strong><span>PUBLIC PROFILE</span></div><div class="v5-profile-pending"><strong>Career totals are not published for this profile yet.</strong><span>Use the featured HI7MAN305 V5 sample to preview the fully populated card.</span></div></div>
        </section>
      </div>
      <footer class="v5-footer"><span>${esc(player.franchise)} · ${esc(player.team)} · ${esc(player.tier)} division</span><b>V5 · OVERVIEW</b></footer>
    </article>`;
  }

  async function mount() {
    const results = await Promise.allSettled([
      getJson('/data/roster.json'),
      getJson('/data/league.json'),
      getJson('/data/player-card-hitman.json')
    ]);

    const rosterData = results[0].status === 'fulfilled' ? results[0].value : null;
    const league = results[1].status === 'fulfilled' ? results[1].value : {};
    const featured = results[2].status === 'fulfilled' ? results[2].value : null;

    if (!rosterData || !Array.isArray(rosterData.players)) {
      root.innerHTML = '<div class="data-state"><strong>The current roster could not be loaded.</strong><br>Refresh the page to try again.</div>';
      return;
    }

    const all = rosterData.players;
    const featuredName = featured?.player?.gamertag || '';
    root.innerHTML = `<div class="player-browser">
      <aside class="roster-panel">
        ${featuredName ? `<div class="featured-profile-block"><span class="eyebrow">Featured V5 sample</span><button type="button" class="featured-player" data-player="${esc(featuredName)}"><span class="roster-avatar">${esc(initialsFor(featured.player))}</span><span><strong>${esc(featuredName)}</strong><small>Fully populated player-card preview</small></span></button></div>` : ''}
        <div class="roster-controls">
          <label><span>Find player</span><input id="roster-search" class="searchbox" type="search" placeholder="Search gamertag, team, franchise" autocomplete="off"></label>
          <div class="roster-selects"><label><span>Franchise</span><select id="roster-franchise"><option value="">All franchises</option>${franchiseOrder.map(tag=>`<option value="${tag}">${esc(franchiseMeta[tag].name)}</option>`).join('')}</select></label>
          <label><span>Division</span><select id="roster-tier"><option value="">All divisions</option>${tierOrder.map(t=>`<option>${t}</option>`).join('')}</select></label></div>
        </div>
        <div class="roster-count" aria-live="polite"></div><div class="roster-list" role="listbox" aria-label="Current SSL roster"></div>
      </aside><section class="player-card-stage" aria-live="polite"></section>
    </div>`;

    const list = $('.roster-list', root);
    const stage = $('.player-card-stage', root);
    const count = $('.roster-count', root);
    const search = $('#roster-search', root);
    const franchise = $('#roster-franchise', root);
    const tier = $('#roster-tier', root);
    const featuredButton = $('.featured-player', root);
    const params = new URLSearchParams(location.search);
    if (params.get('franchise') && franchiseMeta[params.get('franchise')]) franchise.value = params.get('franchise');
    let selected = params.get('player') || featuredName || all[0]?.gamertag || '';

    function filtered() {
      const q = search.value.trim().toLowerCase();
      const f = franchise.value;
      const t = tier.value;
      return all.filter(player => (!f || player.franchise_tag === f) && (!t || player.tier === t) &&
        (!q || [player.gamertag, player.team, player.franchise, player.tier, player.role].join(' ').toLowerCase().includes(q)));
    }

    function setUrl(name) {
      const url = new URL(location.href);
      url.searchParams.set('player', name);
      if (franchise.value) url.searchParams.set('franchise', franchise.value); else url.searchParams.delete('franchise');
      history.replaceState({}, '', url.pathname + url.search);
    }

    function selectPlayer(name, push = true) {
      const isFeatured = featuredName && name === featuredName;
      let player = isFeatured ? featured.player : all.find(item => item.gamertag === name);
      if (!player) player = filtered()[0] || all[0];
      if (!player) return;
      selected = player.gamertag;
      const useFeatured = featuredName && selected === featuredName;
      stage.innerHTML = useFeatured ? richCard(featured.player, league, featured) : rosterCard(player, league);
      $$('.roster-player', list).forEach(button => {
        const active = !useFeatured && button.dataset.player === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      if (featuredButton) {
        featuredButton.classList.toggle('active', useFeatured);
        featuredButton.setAttribute('aria-pressed', String(useFeatured));
      }
      if (push) setUrl(selected);
    }

    function renderList() {
      const rows = filtered();
      count.textContent = `${rows.length} of ${all.length} current roster assignments`;
      list.innerHTML = rows.map(player => `<button type="button" class="roster-player" role="option" aria-selected="${player.gamertag === selected}" data-player="${esc(player.gamertag)}">
        <span class="roster-avatar">${esc(String(player.gamertag || 'SS').slice(0,2).toUpperCase())}</span><span><strong>${esc(player.gamertag)}</strong><small>${esc(player.franchise_tag)} · ${esc(player.team)} · ${esc(player.tier)}${player.role === 'Captain' ? ' · CAPT' : ''}</small></span></button>`).join('');
      $$('.roster-player', list).forEach(button => button.addEventListener('click', () => selectPlayer(button.dataset.player)));
      if (selected === featuredName) selectPlayer(selected, false);
      else if (!rows.some(player => player.gamertag === selected) && rows[0]) selectPlayer(rows[0].gamertag);
      else selectPlayer(selected, false);
    }

    featuredButton?.addEventListener('click', () => selectPlayer(featuredName));
    [search, franchise, tier].forEach(control => control.addEventListener(control === search ? 'input' : 'change', renderList));
    renderList();
  }

  mount().catch(error => {
    console.error('Player experience failed:', error);
    root.innerHTML = '<div class="data-state"><strong>The player directory could not be loaded.</strong><br>Refresh the page to try again.</div>';
  });
})();
