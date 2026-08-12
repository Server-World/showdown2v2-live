(() => {
  const app = document.getElementById('player-card-app');
  if (!app) return;

  const source = app.dataset.playerSource;
  const tierClass = value => `tier-${String(value || '').toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const esc = value => String(value ?? '—').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—';
  const sourceLabel = data => ['review_fixture', 'featured_sample'].includes(data.record_type) ? 'Featured player' : 'Player profile';

  const track = (event, detail = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, ...detail });
  };

  const stats = (obj, order) => order.map(([key, label]) => `
    <div class="pc-stat">
      <b>${fmt(obj?.[key])}</b>
      <small>${esc(label)}</small>
    </div>`).join('');

  function matchView(data) {
    const match = data.latest_match;
    if (!match) {
      return `
        <div class="pc-empty-state pc-match-empty">
          <div class="pc-empty-kicker">LATEST MATCH</div>
          <div class="pc-empty-mark" aria-hidden="true">M</div>
          <h4>No recent match is listed for this profile.</h4>
          <p>Recent opponent, result, and box score details will appear here when available.</p>
          <div class="pc-empty-fields" aria-label="Fields supported by this view">
            <span>Series result</span><span>Opponent</span><span>Box score</span><span>Match date</span>
          </div>
          <a class="pc-inline-action" href="https://discord.gg/efdQJsceKb" target="_blank" rel="noopener noreferrer">Open SSL in Discord →</a>
        </div>`;
    }

    return `
      <div class="pc-match-live">
        <div class="pc-match-score">
          <div><small>${esc(match.home_label || 'TEAM')}</small><strong>${esc(match.home || data.player.team)}</strong></div>
          <b>${esc(match.score || 'VS')}</b>
          <div class="right"><small>${esc(match.away_label || 'OPPONENT')}</small><strong>${esc(match.away)}</strong></div>
        </div>
        <div class="pc-match-meta">
          <span>${esc(match.result || '')}</span><span>${esc(match.date || '')}</span><span>${esc(match.phase || '')}</span>
        </div>
      </div>`;
  }

  function awardsView(data) {
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    if (!achievements.length) {
      return `
        <div class="pc-empty-state">
          <div class="pc-empty-kicker">AWARDS & BADGES</div>
          <div class="pc-empty-mark" aria-hidden="true">A</div>
          <h4>No awards are listed for this profile.</h4>
          <p>Season honors will appear here when available.</p>
        </div>`;
    }

    return `
      <div class="pc-achievement-head">
        <div><small>KNOWN PERFORMANCE MARKERS</small><h4>Awards & badges</h4></div>
        <strong>${String(achievements.length).padStart(2, '0')}</strong>
      </div>
      <div class="pc-achievement-grid">
        ${achievements.map(item => `
          <article class="pc-achievement ${esc(item.kind || 'badge')}">
            <div class="pc-achievement-mark" aria-hidden="true"></div>
            <small>${esc(item.label)}</small>
            <strong>${esc(item.value)}</strong>
            <p>${esc(item.detail || '')}</p>
          </article>`).join('')}
      </div>
      <div class="pc-award-note">Only values present in the player-card data source are rendered here.</div>`;
  }

  function template(data) {
    const p = data.player || {};
    const season = data.season || {};
    const career = data.career || {};
    const iron = season.iron_man || {};
    const tClass = tierClass(p.tier);

    return `
      <article class="pc-card" aria-labelledby="pc-player-name">
        <div class="pc-topline" aria-hidden="true"></div>

        <header class="pc-card-header">
          <a class="pc-brand" href="/" aria-label="Supersonic Showdown League 2v2 home">
            <img src="/assets/branding/ssl-logo.svg" alt="">
            <span>
              <b><i>S</i>UPERSONIC <i>S</i>HOWDOWN</b>
              <strong><i>L</i>EAGUE <i>2</i><em>v</em><i>2</i></strong>
            </span>
          </a>
          <div class="pc-card-title"><strong>PLAYER PROFILE</strong><small>COMPETITIVE IDENTITY</small></div>
          <div class="pc-context"><strong>${esc(season.name || 'Current season')} · WEEK ${String(season.week || '—').padStart(2, '0')}</strong><small>PLAYER CARD V5 · WEB EDITION</small></div>
        </header>

        <div class="pc-card-body">
          <aside class="pc-identity">
            <div class="pc-visuals">
              <div>
                <span class="pc-label">PLAYER</span>
                <div class="pc-avatar" aria-hidden="true">${esc(p.initials || 'SSL')}</div>
              </div>
              <div>
                <span class="pc-label">FRANCHISE</span>
                <div class="pc-crest ${tClass}" aria-hidden="true"><span>${esc(p.franchise_tag || 'SSL')}</span></div>
              </div>
            </div>

            <div class="pc-tier ${tClass}">${esc(p.tier)}</div>
            <h3 id="pc-player-name">${esc(p.gamertag)}</h3>
            <p class="pc-team">${esc(p.franchise)} · ${esc(p.team)}</p>
            <p class="pc-role">${esc(p.role)} · ${esc(p.roster_status)}</p>

            <div class="pc-status ${p.eligible ? '' : 'ineligible'}">
              <i aria-hidden="true"></i><span>${esc(p.eligibility_label || (p.eligible ? 'Eligible to play' : 'Ineligible'))}</span>
            </div>

            <dl class="pc-meta">
              <div><dt>Locked MMR</dt><dd class="${tClass}">${fmt(p.locked_mmr)}</dd></div>
              <div><dt>Tracker</dt><dd>${esc(p.tracker)}</dd></div>
              <div><dt>Roster</dt><dd>${esc(p.role)}</dd></div>
              <div><dt>Profile source</dt><dd>${esc(sourceLabel(data))}</dd></div>
            </dl>

            <div class="pc-source-tag"><i aria-hidden="true"></i><span>${esc(data.source_label || sourceLabel(data))}</span></div>
          </aside>

          <section class="pc-content" aria-label="${esc(p.gamertag)} profile details">
            <div class="pc-tabs" role="tablist" aria-label="Player profile sections">
              <button type="button" class="pc-tab active" data-card-tab="overview" aria-selected="true">Overview</button>
              <button type="button" class="pc-tab" data-card-tab="match" aria-selected="false">Latest Match</button>
              <button type="button" class="pc-tab" data-card-tab="awards" aria-selected="false">Awards</button>
            </div>

            <div class="pc-view active" data-card-view="overview">
              <div class="pc-summary">
                <div><small>CURRENT TIER</small><strong class="${tClass}">${esc(p.tier)}</strong><span>SSL division</span></div>
                <div><small>LOCKED MMR</small><strong>${fmt(p.locked_mmr)}</strong><span>Locked value</span></div>
                <div><small>SLP</small><strong>${fmt(season.slp)}</strong><span>Season league points</span></div>
                <div><small>IRON MAN</small><strong>${fmt(iron.current)} / ${fmt(iron.target)}</strong><span>${esc(iron.badge || '—')}</span></div>
              </div>

              <section class="pc-panel">
                <div class="pc-panel-head"><h4>Season performance</h4><span>${esc(season.name || 'Current season')}</span></div>
                <div class="pc-season-grid">
                  ${stats(season.stats, [['games','Games'],['goals','Goals'],['assists','Assists'],['saves','Saves'],['shots','Shots'],['score','Score'],['mvps','MVPs']])}
                </div>
              </section>

              <section class="pc-panel pc-career-panel">
                <div class="pc-panel-head"><h4>Career performance</h4><span>Recorded totals</span></div>
                <div class="pc-career-grid">
                  ${stats(career, [['games','Games'],['wins','Wins'],['losses','Losses'],['goals','Goals'],['assists','Assists'],['saves','Saves'],['shots','Shots'],['score','Score'],['mvps','MVPs']])}
                </div>
              </section>

              <div class="pc-data-note">
                <span>PROFILE DATA</span>
                <p>A focused view of competitive identity, season performance, career totals, matches, and awards.</p>
              </div>
            </div>

            <div class="pc-view" data-card-view="match" hidden>${matchView(data)}</div>
            <div class="pc-view" data-card-view="awards" hidden>${awardsView(data)}</div>
          </section>
        </div>

        <footer class="pc-card-footer">
          <span>${esc(p.gamertag)} · ${esc(data.source_label || sourceLabel(data))}</span>
          <span>Official SSL player profile</span>
        </footer>
      </article>`;
  }

  function wire(data) {
    const tabs = [...app.querySelectorAll('[data-card-tab]')];
    const views = [...app.querySelectorAll('[data-card-view]')];

    const activate = (tab, shouldTrack = true) => {
      const key = tab.dataset.cardTab;
      tabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      views.forEach(view => {
        const active = view.dataset.cardView === key;
        view.classList.toggle('active', active);
        view.hidden = !active;
      });
      if (shouldTrack) track('player_card_tab', { player: data.player?.gamertag || 'unknown', tab: key });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        tabs[next].focus();
        activate(tabs[next]);
      });
    });

    if (tabs[0]) activate(tabs[0], false);
  }

  async function init() {
    try {
      const response = await fetch(source, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data?.player?.gamertag) throw new Error('Player record is incomplete');
      app.innerHTML = template(data);
      wire(data);
    } catch (error) {
      console.error('Player card load failed:', error);
      app.innerHTML = `
        <div class="pc-error">
          <strong>Player profile unavailable.</strong>
          <span>The structured player-card data could not be loaded. SSL Bot remains available in Discord.</span>
          <a href="https://discord.gg/efdQJsceKb" target="_blank" rel="noopener noreferrer">Open Discord →</a>
        </div>`;
    }
  }

  init();
})();
