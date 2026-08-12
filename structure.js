(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tierOrder = ['Mythic','Legend','Elite','Contender','Rookie','Amateur'];
  const franchiseOrder = ['D20','SP','GWS','FRZ','GLO','FCT'];
  const franchiseMeta = {
    D20:{name:'D20',slug:'d20',logo:'/assets/franchises/D20.png',color:'#D4AF37'},
    SP:{name:'Solace Path',slug:'solace-path',logo:'/assets/franchises/SP.png',color:'#8B5CF6'},
    GWS:{name:'GraveWardens',slug:'gravewardens',logo:'/assets/franchises/GWS.png',color:'#55D68B'},
    FRZ:{name:'Frozen',slug:'frozen',logo:'/assets/franchises/FZN.png',color:'#49C7FF'},
    GLO:{name:'Glow Stick Gang',slug:'glow-stick-gang',logo:'/assets/franchises/GLO.png',color:'#FF69B4'},
    FCT:{name:'Ficticious Esports',slug:'ficticious-esports',logo:'/assets/franchises/FCT.png',color:'#FF9F43'}
  };

  async function getJson(url) {
    const r = await fetch(url, {cache:'no-store'});
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  }

  function currentSection() {
    const path = location.pathname;
    if (path.startsWith('/franchises/') || path.startsWith('/players/') || path.startsWith('/matches/') || path.startsWith('/standings/') || path.startsWith('/stats/')) return 'competition';
    if (path.startsWith('/league/') || path.startsWith('/how-it-works/') || path.startsWith('/history/')) return 'league';
    return '';
  }

  function mountNavigation() {
    const nav = $('.navlinks');
    if (!nav || nav.dataset.grouped === 'true') return;
    const path = location.pathname;
    const current = currentSection();
    nav.dataset.grouped = 'true';
    nav.innerHTML = `
      <a href="/" ${path==='/'?'aria-current="page"':''}>Home</a>
      <div class="nav-group ${current==='competition'?'is-current':''}">
        <button class="nav-group-toggle" type="button" aria-expanded="false" aria-haspopup="true">Competition <span aria-hidden="true">▾</span></button>
        <div class="nav-dropdown" role="menu">
          <a role="menuitem" href="/matches/">Matches</a>
          <a role="menuitem" href="/standings/">Standings</a>
          <a role="menuitem" href="/franchises/">Franchises</a>
          <a role="menuitem" href="/players/">Players</a>
          <a role="menuitem" href="/stats/">Stats</a>
        </div>
      </div>
      <div class="nav-group ${current==='league'?'is-current':''}">
        <button class="nav-group-toggle" type="button" aria-expanded="false" aria-haspopup="true">League <span aria-hidden="true">▾</span></button>
        <div class="nav-dropdown" role="menu">
          <a role="menuitem" href="/league/">League Format</a>
          <a role="menuitem" href="/how-it-works/">How It Works</a>
          <a role="menuitem" href="/history/">History</a>
        </div>
      </div>
      <a href="/news/" ${path.startsWith('/news/')?'aria-current="page"':''}>News</a>
      <a href="/watch/" ${path.startsWith('/watch/')?'aria-current="page"':''}>Watch</a>`;
    $$('.nav-group-toggle', nav).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = btn.closest('.nav-group');
        const open = !group.classList.contains('open');
        $$('.nav-group.open', nav).forEach(g => {
          g.classList.remove('open');
          $('.nav-group-toggle', g)?.setAttribute('aria-expanded','false');
        });
        group.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          btn.closest('.nav-group').classList.add('open');
          btn.setAttribute('aria-expanded','true');
          $('.nav-dropdown a', btn.closest('.nav-group'))?.focus();
        }
      });
    });
    document.addEventListener('click', () => {
      $$('.nav-group.open', nav).forEach(g => {
        g.classList.remove('open');
        $('.nav-group-toggle', g)?.setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      $$('.nav-group.open', nav).forEach(g => {
        g.classList.remove('open');
        const b = $('.nav-group-toggle', g);
        b?.setAttribute('aria-expanded','false');
        b?.focus();
      });
    });
  }

  function rewireLegacyLinks() {
    $$('a[href="/teams/"]').forEach(a => {
      a.href = '/franchises/';
      const t = (a.textContent || '').trim();
      if (/browse teams/i.test(t)) a.textContent = 'Browse franchises';
      else if (/team directory/i.test(t)) a.textContent = 'FRANCHISE DIRECTORY →';
      else if (t === 'Teams') a.textContent = 'Franchises';
    });
    $$('a[href="/league/"]').forEach(a => {
      if (/how it works/i.test(a.textContent || '')) a.href = '/how-it-works/';
    });
  }

  function standingFor(league, team, tier) {
    const rows = league?.standings?.[String(tier || '').toLowerCase()] || [];
    return rows.find(r => r.team === team) || null;
  }

  function franchiseTeams(league, tag) {
    return (league?.teams || []).filter(t => t.franchise_tag === tag).sort((a,b)=>tierOrder.indexOf(a.tier)-tierOrder.indexOf(b.tier));
  }

  function franchiseStats(league, tag) {
    const rows = franchiseTeams(league, tag).map(t => standingFor(league,t.name,t.tier)).filter(Boolean);
    return rows.reduce((a,r) => ({
      wins:a.wins+(Number(r.wins)||0), losses:a.losses+(Number(r.losses)||0),
      gf:a.gf+(Number(r.goals_for)||0), ga:a.ga+(Number(r.goals_against)||0),
      leaders:a.leaders+(Number(r.rank)===1?1:0)
    }), {wins:0,losses:0,gf:0,ga:0,leaders:0});
  }

  function franchiseCard(league, roster, tag) {
    const m = franchiseMeta[tag], stats = franchiseStats(league,tag);
    const teams = franchiseTeams(league,tag);
    const count = roster.filter(p=>p.franchise_tag===tag).length;
    const top = teams.map(t=>({t,r:standingFor(league,t.name,t.tier)})).sort((a,b)=>(a.r?.rank||99)-(b.r?.rank||99))[0];
    const cardSummary = top?.r ? `${top.t.name} leads ${m.name} at #${top.r.rank} in ${top.t.tier}. The six teams are ${stats.wins}-${stats.losses} in combined series play.` : `${m.name} fields six division teams with ${count} players on the current roster.`;
    return `<a class="franchise-card" href="/franchises/${m.slug}/" style="--franchise:${m.color}" data-tilt>
      <div class="franchise-card-mark"><img src="${m.logo}" alt="${esc(m.name)} logo" loading="lazy" decoding="async"><span>${tag}</span></div>
      <div class="franchise-card-copy"><span class="eyebrow">${tag} · ${count} current players</span><h2>${esc(m.name)}</h2>
      <p>${esc(cardSummary)}</p></div>
      <div class="franchise-card-stats">
        <span><small>Series</small><b>${stats.wins}-${stats.losses}</b></span>
        <span><small>Division leaders</small><b>${stats.leaders}</b></span>
        <span><small>Current roster</small><b>${count}</b></span>
        <span><small>Best current seed</small><b>${top?.r ? '#'+top.r.rank : '—'}</b></span>
      </div><strong class="franchise-card-cta">OPEN FRANCHISE →</strong></a>`;
  }

  async function mountFranchiseDirectory() {
    const root = $('#franchise-directory');
    if (!root) return;
    try {
      const [league, rosterData] = await Promise.all([getJson('/data/league.json'),getJson('/data/roster.json')]);
      root.innerHTML = franchiseOrder.map(tag => franchiseCard(league, rosterData.players || [], tag)).join('');
    } catch {
      root.innerHTML = '<div class="data-state"><strong>Franchise data is temporarily unavailable.</strong> Refresh to try again.</div>';
    }
  }

  function teamRow(league, t) {
    const r = standingFor(league,t.name,t.tier);
    return `<article class="franchise-team-row" style="--team-color:${esc(t.color || '#49C7FF')}">
      <div><span class="tier-pill tier-${esc(t.tier.toLowerCase())}">${esc(t.tier)}</span><strong>${esc(t.name)}</strong></div>
      <span><small>Rank</small><b>${r ? '#'+esc(r.rank) : '—'}</b></span>
      <span><small>Record</small><b>${r ? `${esc(r.wins)}-${esc(r.losses)}` : '—'}</b></span>
      <span><small>Games</small><b>${r ? `${esc(r.games_won)}-${esc(r.games_lost)}` : '—'}</b></span>
      <span><small>Goal diff</small><b>${r ? (Number(r.differential)>0?'+':'')+esc(r.differential) : '—'}</b></span>
    </article>`;
  }

  async function mountFranchiseProfile() {
    const root = $('#franchise-profile');
    if (!root) return;
    const tag = root.dataset.franchise;
    const m = franchiseMeta[tag];
    if (!m) return;
    try {
      const [league, rosterData] = await Promise.all([getJson('/data/league.json'),getJson('/data/roster.json')]);
      const teams = franchiseTeams(league, tag), stats = franchiseStats(league,tag);
      const roster = (rosterData.players || []).filter(p=>p.franchise_tag===tag);
      const top = teams.map(t=>({t,r:standingFor(league,t.name,t.tier)})).sort((a,b)=>(a.r?.rank||99)-(b.r?.rank||99))[0];
      const profileSummary = top?.r ? `${m.name} is ${stats.wins}-${stats.losses} in combined series play across six divisions, led by ${top.t.name} at #${top.r.rank} in ${top.t.tier}.` : `${m.name} fields one team in every SSL division with ${roster.length} players on the current roster.`;
      document.title = `${m.name} Franchise | Supersonic Showdown League`;
      root.innerHTML = `<div class="franchise-profile-head" style="--franchise:${m.color}">
        <img src="${m.logo}" alt="${esc(m.name)} logo" decoding="async">
        <div><span class="eyebrow">${tag} · Supersonic Showdown League</span><h1>${esc(m.name)}</h1>
        <p>${esc(profileSummary)}</p>
        <div class="franchise-profile-actions"><a class="btn ghost" href="/franchises/">← All franchises</a><a class="btn primary" href="/players/?franchise=${tag}">View roster</a></div></div>
      </div>
      <div class="franchise-summary">
        <span><small>Combined series</small><b>${stats.wins}-${stats.losses}</b></span>
        <span><small>Goals for</small><b>${stats.gf}</b></span>
        <span><small>Goals against</small><b>${stats.ga}</b></span>
        <span><small>Goal differential</small><b>${stats.gf-stats.ga>0?'+':''}${stats.gf-stats.ga}</b></span>
        <span><small>Division leaders</small><b>${stats.leaders}</b></span>
        <span><small>Roster shown</small><b>${roster.length}</b></span>
      </div>
      <section class="franchise-teams"><div class="section-head"><div><p class="eyebrow">Six divisions</p><h2>Current teams.</h2></div></div>${teams.map(t=>teamRow(league,t)).join('')}</section>
      <section class="franchise-roster-preview"><div class="section-head"><div><p class="eyebrow">Current roster</p><h2>${esc(m.name)} players.</h2><p>Players currently representing ${esc(m.name)} across SSL.</p></div><a class="btn ghost" href="/players/?franchise=${tag}">Open full player cards</a></div>
      <div class="roster-chip-grid">${roster.map(p=>`<a href="/players/?player=${encodeURIComponent(p.gamertag)}" class="roster-chip"><strong>${esc(p.gamertag)}</strong><span>${esc(p.tier)} · ${esc(p.team)}${p.role==='Captain'?' · Captain':''}</span></a>`).join('')}</div></section>`;
    } catch {
      root.innerHTML = '<div class="data-state"><strong>Franchise profile is temporarily unavailable.</strong> Refresh to try again.</div>';
    }
  }

  function playerTeamData(league,p) {
    return standingFor(league,p.team,p.tier) || {};
  }

  function playerTierColor(tier) {
    return ({Mythic:'#FF69B4',Legend:'#BD7CFF',Elite:'#49C7FF',Contender:'#FF9F43',Rookie:'#55D68B',Amateur:'#FF8A80'})[tier] || '#F7FBFF';
  }

  function playerCard(p, league) {
    const r = playerTeamData(league,p);
    const m = franchiseMeta[p.franchise_tag] || {};
    const season = league?.season?.name || 'Current season';
    const week = league?.season?.week ? `Week ${league.season.week}` : 'Current week';
    const standing = r.rank ? `#${esc(r.rank)}` : 'N/A';
    const teamRecord = r.wins != null ? `${esc(r.wins)}-${esc(r.losses)} team series` : 'Current team tier standing';
    const tierColor = playerTierColor(p.tier);
    const initials = String(p.gamertag || 'SSL').trim().split(/\s+/).map(part=>part[0]||'').join('').slice(0,2).toUpperCase() || 'SSL';
    const seasonStats = [['GOALS','—'],['ASSISTS','—'],['SAVES','—'],['SHOTS','—'],['SCORE','—'],['MVPS','—'],['SERIES WIN %','—']];
    const careerStats = [['GAMES','—'],['WINS','—'],['GOALS','—'],['ASSISTS','—'],['SAVES','—'],['SHOTS','—'],['TOTAL SCORE','—'],['MVPS','—'],['WIN %','—']];
    return `<article class="fixed-player-card player-card-v5" style="--franchise:${m.color || '#49C7FF'};--tier-color:${tierColor}" aria-label="Player Card V5 for ${esc(p.gamertag)}">
      <div class="v5-top-rule" aria-hidden="true"><span></span></div>
      <header class="v5-header">
        <div class="v5-brand-lockup"><img src="/assets/branding/ssl-logo.svg" alt="" aria-hidden="true"><div><strong><i>S</i>UPERSONIC <i>S</i>HOWDOWN</strong><b><i>L</i>EAGUE <em>2</em><u>v</u><em>2</em></b></div></div>
        <div class="v5-profile-title">PLAYER PROFILE</div>
        <div class="v5-context"><strong>${esc(season)} · ${esc(week)}</strong><span>CURRENT SSL PROFILE</span></div>
      </header>
      <div class="v5-divider"></div>
      <div class="v5-card-body">
        <aside class="v5-identity-rail">
          <div class="v5-identity-media"><div class="v5-avatar" aria-label="Avatar unavailable"><span>${esc(initials)}</span></div><div class="v5-franchise-mark"><img src="${m.logo || '/assets/branding/ssl-logo.svg'}" alt="${esc(p.franchise)} logo"></div></div>
          <span class="v5-kicker">PLAYER</span><h2>${esc(p.gamertag)}</h2><strong class="v5-teamline">${esc(p.franchise)} — ${esc(p.team)}</strong><span class="v5-role">${esc(p.role || 'Player')}</span>
          <div class="v5-status"><span></span>CURRENT ROSTER</div>
          <div class="v5-meta-list"><div><small>TRACKER</small><b>—</b></div><div><small>ROSTER</small><b>Active</b></div><div><small>SLP</small><b>—</b></div><div><small>IRON MAN</small><b>—</b></div></div>
          <p class="v5-identity-note">${esc(p.gamertag)} represents ${esc(p.team)} in the ${esc(p.tier)} division.</p>
        </aside>
        <section class="v5-overview-panel">
          <div class="v5-summary-row">
            <div class="v5-summary-cell"><small>CURRENT TIER</small><strong style="color:var(--tier-color)">${esc(String(p.tier || 'Unknown').toUpperCase())}</strong><span>SSL competitive tier</span></div>
            <div class="v5-summary-cell"><small>LOCKED MMR</small><strong>—</strong><span>Not listed</span></div>
            <div class="v5-summary-cell"><small>LEAGUE STANDING</small><strong>${standing}</strong><span>${teamRecord}</span></div>
            <div class="v5-summary-cell"><small>RECENT RECORD</small><strong>—</strong><span>Individual results</span></div>
          </div>
          <div class="v5-awards-strip"><strong>AWARDS</strong><span>Season honors</span><b>—</b><small>PLAYER HONORS</small></div>
          <div class="v5-performance-panel"><div class="v5-panel-head"><strong>SEASON PERFORMANCE</strong><span>${esc(season)} · ${esc(week)}</span></div><div class="v5-season-stats">${seasonStats.map(([label,value])=>`<div><b>${value}</b><small>${label}</small></div>`).join('')}</div></div>
          <div class="v5-career-panel"><div class="v5-panel-head"><strong>ALL-TIME CAREER PERFORMANCE</strong><span>ALL RECORDED SSL SEASONS</span></div><div class="v5-career-stats">${careerStats.map(([label,value])=>`<div><b>${value}</b><small>${label}</small></div>`).join('')}</div></div>
        </section>
      </div>
      <footer class="v5-footer"><span>${esc(p.franchise)} · ${esc(p.team)} · ${esc(p.tier)} division</span><b>V5 · OVERVIEW</b></footer>
    </article>`;
  }

  async function mountPlayers() {
    const root = $('#player-experience');
    if (!root) return;
    try {
      const [league, rosterData] = await Promise.all([getJson('/data/league.json'),getJson('/data/roster.json')]);
      const all = rosterData.players || [];
      root.innerHTML = `<div class="player-browser">
        <aside class="roster-panel">
          <div class="roster-controls">
            <label><span>Find player</span><input id="roster-search" class="searchbox" type="search" placeholder="Search gamertag, team, franchise" autocomplete="off"></label>
            <div class="roster-selects"><label><span>Franchise</span><select id="roster-franchise"><option value="">All franchises</option>${franchiseOrder.map(t=>`<option value="${t}">${esc(franchiseMeta[t].name)}</option>`).join('')}</select></label>
            <label><span>Division</span><select id="roster-tier"><option value="">All divisions</option>${tierOrder.map(t=>`<option>${t}</option>`).join('')}</select></label></div>
          </div>
          <div class="roster-count" aria-live="polite"></div><div class="roster-list" role="listbox" aria-label="Current SSL roster"></div>
        </aside><section class="player-card-stage" aria-live="polite"></section>
      </div>`;
      const list = $('.roster-list',root), stage = $('.player-card-stage',root), count = $('.roster-count',root);
      const search = $('#roster-search'), franchise = $('#roster-franchise'), tier = $('#roster-tier');
      const params = new URLSearchParams(location.search);
      if (params.get('franchise') && franchiseMeta[params.get('franchise')]) franchise.value=params.get('franchise');
      let selected = params.get('player') || all[0]?.gamertag || '';

      function filtered() {
        const q = search.value.trim().toLowerCase(), f=franchise.value, t=tier.value;
        return all.filter(p => (!f || p.franchise_tag===f) && (!t || p.tier===t) &&
          (!q || [p.gamertag,p.team,p.franchise,p.tier,p.role].join(' ').toLowerCase().includes(q)));
      }
      function selectPlayer(name, push=true) {
        const p = all.find(x=>x.gamertag===name) || filtered()[0] || all[0];
        if (!p) return;
        selected=p.gamertag;
        stage.innerHTML=playerCard(p,league);
        $$('.roster-player',list).forEach(b=>{
          const on=b.dataset.player===selected;
          b.classList.toggle('active',on);
          b.setAttribute('aria-selected',String(on));
        });
        if (push) {
          const u=new URL(location.href);u.searchParams.set('player',selected);
          if (franchise.value) u.searchParams.set('franchise',franchise.value); else u.searchParams.delete('franchise');
          history.replaceState({},'',u.pathname+u.search);
        }
      }
      function renderList() {
        const rows=filtered();
        count.textContent=`${rows.length} of ${all.length} current roster assignments`;
        list.innerHTML=rows.map(p=>`<button type="button" class="roster-player" role="option" aria-selected="${p.gamertag===selected}" data-player="${esc(p.gamertag)}">
          <span class="roster-avatar">${esc(p.gamertag.slice(0,2).toUpperCase())}</span><span><strong>${esc(p.gamertag)}</strong><small>${esc(p.franchise_tag)} · ${esc(p.team)} · ${esc(p.tier)}${p.role==='Captain'?' · CAPT':''}</small></span></button>`).join('');
        $$('.roster-player',list).forEach(b=>b.addEventListener('click',()=>selectPlayer(b.dataset.player)));
        if (!rows.some(p=>p.gamertag===selected) && rows[0]) selectPlayer(rows[0].gamertag);
        else selectPlayer(selected,false);
      }
      [search,franchise,tier].forEach(el=>el.addEventListener(el===search?'input':'change',renderList));
      renderList();
    } catch {
      root.innerHTML='<div class="data-state"><strong>The live roster could not be loaded.</strong> Refresh to try again.</div>';
    }
  }

  function updateHomeLanguage() {
    if (document.body.dataset.page !== 'home') return;
    const explore = $$('.feature-card').find(a => /Meet the field/i.test(a.textContent || ''));
    if (explore) {
      $('.num',explore) && ($('.num',explore).textContent='FRANCHISES');
      $('h3',explore) && ($('h3',explore).textContent='Meet the organizations');
      const p=$('p',explore); if(p) p.textContent='Explore all six franchises, their division teams, current records, and rosters.';
    }
  }

  function init() {
    mountNavigation();
    rewireLegacyLinks();
    updateHomeLanguage();
    mountFranchiseDirectory();
    mountFranchiseProfile();
    mountPlayers();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();