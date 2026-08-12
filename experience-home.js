(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MEDIA = '/data/media.json';
  const LOGO = '/assets/branding/ssl-logo-primary.png';
  let homePlayer = null;
  let loopTimer = null;

  async function json(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(url);
    return r.json();
  }

  function leaders(league) {
    return Object.entries(league?.standings || {}).map(([tier, rows]) => {
      const r = rows?.[0];
      return r ? `<a class="division-leader-card" href="/standings/#${esc(tier)}" data-tilt><span>${esc(tier)}</span><strong>${esc(r.team)}</strong><small>${esc(r.franchise || '')}</small><b>${esc(r.wins)}-${esc(r.losses)}</b></a>` : '';
    }).join('');
  }

  function twitchTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = Math.floor(value % 60);
    return `${h}h${m}m${s}s`;
  }

  function loadTwitchPlayer() {
    if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://player.twitch.tv/js/embed/v1.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Twitch), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://player.twitch.tv/js/embed/v1.js';
      script.async = true;
      script.onload = () => resolve(window.Twitch);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function fallbackLoop(stage, feature) {
    stage.innerHTML = `<a class="hero-loop-shell hero-loop-fallback" href="/watch/" style="--hero-loop-poster:url('${esc(feature.thumbnail || '/assets/branding/ssl-social-card.svg')}')"><span class="hero-loop-badge">FEATURED GAMEPLAY</span><img class="hero-loop-logo" src="${LOGO}" alt=""><span class="hero-loop-play">▶</span><div class="hero-loop-meta"><small>${esc(feature.label || 'SSL FEATURED MOMENT')}</small><strong>${esc(feature.title || 'Watch the Showdown')}</strong><span>Open the Watch Room →</span></div></a>`;
  }

  function scheduleLoop(feature) {
    clearTimeout(loopTimer);
    const duration = Math.max(8, Number(feature.duration_seconds) || 24);
    loopTimer = window.setTimeout(() => {
      if (!homePlayer || document.hidden) return;
      try {
        homePlayer.seek(Number(feature.vod_offset_seconds) || 0);
        homePlayer.setMuted(true);
        homePlayer.play();
      } catch {}
      scheduleLoop(feature);
    }, duration * 1000);
  }

  async function mountHeroLoop(media) {
    if (document.body.dataset.page !== 'home' || $('#ssl-home-loop-player')) return;
    const stage = $('.competition-stage');
    const feature = media?.home_feature || {};
    if (!stage || !feature.video_id) return;

    stage.classList.add('has-loop');
    stage.innerHTML = `<div class="hero-loop-shell"><div id="ssl-home-loop-player" class="hero-loop-player" aria-label="Looping featured Supersonic Showdown League gameplay"></div><div class="hero-loop-poster" style="--hero-loop-poster:url('${esc(feature.thumbnail || '/assets/branding/ssl-social-card.svg')}')"></div><div class="hero-loop-shade" aria-hidden="true"></div><span class="hero-loop-badge"><i></i> FEATURED GAMEPLAY · AUTOPLAY LOOP</span><img class="hero-loop-logo" src="${LOGO}" alt="Supersonic Showdown League"><div class="hero-loop-meta"><small>${esc(feature.label || 'SSL FEATURED MOMENT')}</small><strong>${esc(feature.title || 'Watch the Showdown')}</strong><span>Muted loop · full broadcast and live stream in the Watch Room</span></div><a class="hero-loop-open" href="/watch/">WATCH NOW →</a></div>`;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection?.saveData;
    if (reduced || saveData) return;

    try {
      await loadTwitchPlayer();
      if (!window.Twitch?.Player) throw new Error('Twitch unavailable');
      homePlayer = new Twitch.Player('ssl-home-loop-player', {
        video: String(feature.video_id),
        time: twitchTime(feature.vod_offset_seconds),
        parent: [window.location.hostname || 'showdown2v2.live'],
        width: '100%',
        height: '100%',
        autoplay: true,
        muted: true
      });
      homePlayer.addEventListener(Twitch.Player.READY, () => {
        try {
          homePlayer.setMuted(true);
          homePlayer.seek(Number(feature.vod_offset_seconds) || 0);
          homePlayer.play();
        } catch {}
      });
      homePlayer.addEventListener(Twitch.Player.PLAYING, () => {
        $('.hero-loop-poster', stage)?.classList.add('is-playing');
        scheduleLoop(feature);
      });
      document.addEventListener('visibilitychange', () => {
        if (!homePlayer) return;
        if (document.hidden) {
          clearTimeout(loopTimer);
          try { homePlayer.pause(); } catch {}
        } else {
          try {
            homePlayer.setMuted(true);
            homePlayer.seek(Number(feature.vod_offset_seconds) || 0);
            homePlayer.play();
          } catch {}
          scheduleLoop(feature);
        }
      });
    } catch {
      fallbackLoop(stage, feature);
    }
  }

  function mountPlayerWorld(league, profile) {
    if (document.body.dataset.page !== 'home' || $('#player-world')) return;
    const anchor = $$('.section').find(s => /Match center/i.test(s.textContent || ''));
    if (!anchor) return;
    const p = profile?.player || {}, season = profile?.season || {}, stats = season?.stats || {};
    const x = document.createElement('section');
    x.id = 'player-world';
    x.className = 'section player-world reveal-on-scroll';
    x.innerHTML = `<div class="wrap"><div class="section-head player-world-head"><div><p class="eyebrow">The league is the players</p><h2>EVERY NAME BUILDS THE WORLD.</h2><p>Teams create the rivalry. Players create the moments. SSL puts competitive identity, performance, and progression at the center of the league.</p></div><a class="btn ghost" href="/players/">Explore player cards</a></div><div class="player-world-grid"><a class="spotlight-player" href="/players/" data-tilt><div class="spotlight-orbit"></div><div class="spotlight-id"><span>${esc(p.initials || 'SSL')}</span></div><div class="spotlight-copy"><span class="spotlight-tier">${esc(p.tier || 'Featured player')}</span><h3>${esc(p.gamertag || 'SSL PLAYER')}</h3><p>${esc(p.team || '')} · ${esc(p.role || 'Player')}</p><small>${esc(p.eligibility_label || '')}</small></div><div class="spotlight-stats"><span><small>SLP</small><b>${esc(season.slp ?? '—')}</b></span><span><small>Goals</small><b>${esc(stats.goals ?? '—')}</b></span><span><small>Assists</small><b>${esc(stats.assists ?? '—')}</b></span><span><small>Saves</small><b>${esc(stats.saves ?? '—')}</b></span></div><div class="spotlight-footer"><span>PLAYER SPOTLIGHT</span><strong>OPEN CARD →</strong></div></a><div class="division-radar"><div class="division-radar-head"><span class="eyebrow">Current division leaders</span><strong>Six ladders. Six targets.</strong></div><div class="division-leader-grid">${leaders(league)}</div><div class="division-radar-foot"><a href="/standings/">Full standings →</a><a href="/teams/">Meet every team →</a></div></div></div></div>`;
    anchor.insertAdjacentElement('beforebegin', x);
  }

  async function start() {
    if (document.body.dataset.page !== 'home') return;
    try {
      const [league, profile, media] = await Promise.all([
        json('/data/league.json'),
        json('/data/player-card-hitman.json'),
        json(MEDIA)
      ]);
      mountHeroLoop(media);
      mountPlayerWorld(league, profile);
    } catch {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
