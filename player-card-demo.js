(() => {
  const app = document.getElementById('player-card-app');
  if (!app) return;

  const source = app.dataset.playerSource;
  const TIERS = ['Mythic', 'Legend', 'Elite', 'Contender', 'Rookie', 'Amateur'];
  const tierClass = value => `tier-${String(value || '').toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const esc = value => String(value ?? '—').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-US') : '—';

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
          <h4>No verified match record is published for this card.</h4>
          <p>The interaction is active. When the approved public player feed exposes a finalized match, this view will populate the opponent, series result, player box score, and match metadata automatically.</p>
          <div class="pc-empty-fields" aria-label="Fields this view supports">
            <span>Series result</span><span>Opponent</span><span>Box score</span><span>Match date</span>
          </div>
          <a class="pc-inline-action" href="https://discord.gg/efdQJsceKb" target="_blank" rel="noopener noreferrer">Open the authoritative profile in Discord →</a>
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
          <h4>No approved awards are available in this fixture.</h4>
          <p>This view remains interactive and will populate only from approved award data.</p>
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
      <div class="pc-award-note">Only values present in the player-card data source are rendered here. No placeholder honors are invented.</div>`;
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

            <div class="pc-tier ${tClass}" data-bind="tier">${esc(p.tier)}</div>
            <h3 id="pc-player-name">${esc(p.gamertag)}</h3>
            <p class="pc-team">${esc(p.franchise)} · ${esc(p.team)}</p>
            <p class="pc-role">${esc(p.role)} · ${esc(p.roster_status)}</p>

            <div class="pc-status ${p.eligible ? '' : 'ineligible'}" data-bind="eligibility">
              <i aria-hidden="true"></i><span>${esc(p.eligibility_label || (p.eligible ? 'Eligible to play' : 'Ineligible'))}</span>
            </div>

            <dl class="pc-meta">
              <div><dt>Locked MMR</dt><dd class="${tClass}" data-bind="mmr">${fmt(p.locked_mmr)}</dd></div>
              <div><dt>Tracker</dt><dd>${esc(p.tracker)}</dd></div>
              <div><dt>Roster</dt><dd>${esc(p.role)}</dd></div>
              <div><dt>Profile source</dt><dd>${esc(data.record_type === 'review_fixture' ? 'Review fixture' : 'Public feed')}</dd></div>
            </dl>

            <div class="pc-source-tag"><i aria-hidden="true"></i><span>${esc(data.source_label || 'Player data')}</span></div>
          </aside>

          <section class="pc-content" aria-label="${esc(p.gamertag)} profile details">
            <div class="pc-tabs" role="tablist" aria-label="Player profile sections">
              <button type="button" class="pc-tab active" data-card-tab="overview" aria-selected="true">Overview</button>
              <button type="button" class="pc-tab" data-card-tab="match" aria-selected="false">Latest Match</button>
              <button type="button" class="pc-tab" data-card-tab="awards" aria-selected="false">Awards</button>
            </div>

            <div class="pc-view active" data-card-view="overview">
              <div class="pc-summary">
                <div><small>CURRENT TIER</small><strong class="${tClass}" data-bind="summary-tier">${esc(p.tier)}</strong><span>SSL division</span></div>
                <div><small>LOCKED MMR</small><strong data-bind="summary-mmr">${fmt(p.locked_mmr)}</strong><span data-bind="mmr-source">Locked value</span></div>
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
                <p>This web card is generated from one structured player record. Tabs never inject unrelated sample players or placeholder awards.</p>
              </div>
            </div>

            <div class="pc-view" data-card-view="match" hidden>
              ${matchView(data)}
            </div>

            <div class="pc-view" data-card-view="awards" hidden>
              ${awardsView(data)}
            </div>
          </section>
        </div>

        <footer class="pc-card-footer">
          <span>${esc(p.gamertag)} · ${esc(data.source_label || 'Player profile')}</span>
          <span>${esc(data.authoritative_source || 'SSL Bot + PostgreSQL')} remains authoritative</span>
        </footer>
      </article>

      <details class="pc-lab">
        <summary>
          <span><b>Design review controls</b><small>Prototype state testing — hidden during normal browsing</small></span>
          <i aria-hidden="true">+</i>
        </summary>
        <div class="pc-lab-body">
          <p>These controls test V5 visual states only. Closing this panel resets the featured card to HI7MAN305's supplied review values.</p>
          <div class="pc-lab-actions">
            <button type="button" data-demo-action="eligibility">Toggle eligibility</button>
            <button type="button" data-demo-action="mmr">Toggle MMR source</button>
            <button type="button" data-demo-action="tier">Cycle tier color</button>
            <button type="button" data-demo-action="reset">Reset Hitman</button>
          </div>
        </div>
      </details>`;
  }

  function wire(data) {
    const tabs = [...app.querySelectorAll('[data-card-tab]')];
    const views = [...app.querySelectorAll('[data-card-view]')];

    const activate = tab => {
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

    const base = {
      eligible: Boolean(data.player?.eligible),
      eligibilityLabel: data.player?.eligibility_label || 'Eligible to play',
      tier: data.player?.tier || 'Legend',
      mmr: data.player?.locked_mmr
    };
    let preview = { ...base };

    const status = app.querySelector('[data-bind="eligibility"]');
    const tierTargets = [...app.querySelectorAll('[data-bind="tier"], [data-bind="summary-tier"]')];
    const mmrTargets = [...app.querySelectorAll('[data-bind="mmr"], [data-bind="summary-mmr"]')];
    const mmrSource = app.querySelector('[data-bind="mmr-source"]');

    const renderPreview = () => {
      if (status) {
        status.classList.toggle('ineligible', !preview.eligible);
        const text = status.querySelector('span');
        if (text) text.textContent = preview.eligible ? base.eligibilityLabel : 'Ineligible — design preview';
      }

      const allTierClasses = TIERS.map(tierClass);
      tierTargets.forEach(target => {
        target.classList.remove(...allTierClasses);
        target.classList.add(tierClass(preview.tier));
        target.textContent = preview.tier;
      });

      mmrTargets.forEach(target => {
        target.textContent = preview.mmr == null ? '—' : fmt(preview.mmr);
        target.classList.toggle('pc-unlocked', preview.mmr == null);
      });
      if (mmrSource) mmrSource.textContent = preview.mmr == null ? 'Fallback unavailable' : 'Locked value';
    };

    const lab = app.querySelector('.pc-lab');
    lab?.addEventListener('toggle', () => {
      if (!lab.open) {
        preview = { ...base };
        renderPreview();
      }
    });

    app.querySelector('[data-demo-action="eligibility"]')?.addEventListener('click', () => {
      preview.eligible = !preview.eligible;
      renderPreview();
    });

    app.querySelector('[data-demo-action="mmr"]')?.addEventListener('click', () => {
      preview.mmr = preview.mmr == null ? base.mmr : null;
      renderPreview();
    });

    app.querySelector('[data-demo-action="tier"]')?.addEventListener('click', () => {
      const current = Math.max(0, TIERS.indexOf(preview.tier));
      preview.tier = TIERS[(current + 1) % TIERS.length];
      renderPreview();
    });

    app.querySelector('[data-demo-action="reset"]')?.addEventListener('click', () => {
      preview = { ...base };
      renderPreview();
    });

    activate(tabs[0]);
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
