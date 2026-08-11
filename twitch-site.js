(() => {
  'use strict';

  const TWITCH_URL = 'https://www.twitch.tv/supersonicshowdownleague';
  const WATCH_PATH = '/watch/';
  const MEDIA_PATH = '/data/media.json';
  const PARENT = 'showdown2v2.live';
  let mediaPromise = null;
  let twitchScriptPromise = null;

  function push(event, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, ...detail });
  }

  function loadMediaStyles() {
    if (document.querySelector('link[href="/media.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/media.css';
    document.head.appendChild(link);
  }

  function mediaData() {
    if (!mediaPromise) {
      mediaPromise = fetch(MEDIA_PATH, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error('media catalog unavailable');
        return response.json();
      });
    }
    return mediaPromise;
  }

  function loadTwitchPlayer() {
    if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
    if (twitchScriptPromise) return twitchScriptPromise;
    twitchScriptPromise = new Promise((resolve, reject) => {
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
    return twitchScriptPromise;
  }

  function addWatchLinks() {
    const nav = document.querySelector('.navlinks');
    if (nav && !nav.querySelector('[data-twitch-nav]')) {
      const link = document.createElement('a');
      link.href = WATCH_PATH;
      link.dataset.twitchNav = 'true';
      link.textContent = 'Watch';
      if (document.body.dataset.page === 'watch') link.setAttribute('aria-current', 'page');
      nav.appendChild(link);
    }

    const actions = document.querySelector('.nav-actions');
    if (actions && !actions.querySelector('[data-twitch-action]')) {
      const link = document.createElement('a');
      link.className = 'btn ghost twitch-nav-action';
      link.href = WATCH_PATH;
      link.dataset.twitchAction = 'true';
      link.textContent = 'Watch SSL';
      actions.insertBefore(link, actions.firstChild);
    }

    const footer = document.querySelector('.footer-nav');
    if (footer && !footer.querySelector('[data-twitch-footer]')) {
      const link = document.createElement('a');
      link.href = WATCH_PATH;
      link.dataset.twitchFooter = 'true';
      link.textContent = 'Watch';
      footer.insertBefore(link, footer.firstChild);
    }

    const statusActions = document.querySelector('#competition-status-band .status-actions');
    if (statusActions && !statusActions.querySelector('[data-twitch-status]')) {
      const link = document.createElement('a');
      link.className = 'btn primary twitch-status-action';
      link.href = WATCH_PATH;
      link.dataset.twitchStatus = 'true';
      link.textContent = 'Watch SSL';
      statusActions.insertBefore(link, statusActions.firstChild);
    }
  }

  function secondsToTwitchTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    return `${hours}h${minutes}m${secs}s`;
  }

  function homeFallback(stage, feature) {
    stage.innerHTML = '';
    const link = document.createElement('a');
    link.className = 'home-media-poster';
    link.href = feature.clip_url || WATCH_PATH;
    link.style.backgroundImage = `url("${feature.thumbnail}")`;
    link.innerHTML = '<span>▶ Watch featured highlight</span>';
    stage.appendChild(link);
  }

  async function mountHomeMedia() {
    if ((document.body.dataset.page || '') !== 'home') return;
    const panel = document.querySelector('.competition-panel');
    if (!panel || panel.querySelector('[data-home-media]')) return;

    let catalog;
    try {
      catalog = await mediaData();
    } catch {
      return;
    }
    const feature = catalog.home_feature;
    if (!feature?.thumbnail) return;

    const shell = document.createElement('div');
    shell.className = 'home-media-reel';
    shell.dataset.homeMedia = 'true';
    shell.innerHTML = `<div class="home-media-stage" data-media-stage></div><div class="home-media-meta"><strong>${feature.label || 'Featured SSL highlight'}</strong><a href="${WATCH_PATH}#highlights">Video library →</a></div>`;

    const copy = panel.querySelector('.competition-copy');
    if (copy) copy.insertAdjacentElement('afterend', shell);
    else panel.prepend(shell);

    const stage = shell.querySelector('[data-media-stage]');
    homeFallback(stage, feature);

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia?.('(max-width: 760px)').matches;
    if (reducedMotion || small || !feature.video_id || !feature.vod_offset_seconds) return;

    let mounted = false;
    let player = null;
    let timer = null;
    let visible = true;

    const stopTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const scheduleLoop = () => {
      stopTimer();
      timer = setTimeout(() => {
        if (!player || document.hidden || !visible) return;
        try {
          player.seek(Number(feature.vod_offset_seconds));
          player.play();
        } catch {}
        scheduleLoop();
      }, Math.max(8000, (Number(feature.duration_seconds) || 20) * 1000));
    };

    const mount = async () => {
      if (mounted || stage.clientWidth < 400) return;
      mounted = true;
      try {
        await loadTwitchPlayer();
        stage.innerHTML = '<div id="ssl-home-highlight" style="width:100%;height:100%"></div>';
        player = new Twitch.Player('ssl-home-highlight', {
          video: String(feature.video_id),
          time: feature.time || secondsToTwitchTime(feature.vod_offset_seconds),
          parent: [PARENT],
          width: '100%',
          height: '100%',
          autoplay: true,
          muted: true
        });
        player.addEventListener(Twitch.Player.READY, () => {
          try { player.setMuted(true); } catch {}
          push('home_highlight_ready', { clip_id: feature.clip_id, video_id: feature.video_id });
        });
        player.addEventListener(Twitch.Player.PLAYING, scheduleLoop);
      } catch {
        mounted = false;
        homeFallback(stage, feature);
      }
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = Boolean(entries[0]?.isIntersecting);
        if (visible) {
          mount();
          try { player?.play(); } catch {}
          if (player) scheduleLoop();
        } else {
          stopTimer();
          try { player?.pause(); } catch {}
        }
      }, { rootMargin: '180px 0px', threshold: .2 });
      observer.observe(stage);
    } else {
      mount();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopTimer();
        try { player?.pause(); } catch {}
      } else if (visible && player) {
        try { player.play(); } catch {}
        scheduleLoop();
      }
    });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href === WATCH_PATH || href.startsWith(`${WATCH_PATH}#`) || href === TWITCH_URL || /twitch\.tv\/supersonicshowdownleague/i.test(href)) {
      push(href.startsWith(WATCH_PATH) ? 'view_twitch_hub' : 'twitch_external_click', {
        destination: href,
        link_text: link.textContent.trim(),
        link_location: link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content'
      });
    }
  });

  loadMediaStyles();
  addWatchLinks();
  mountHomeMedia();
  const observer = new MutationObserver(() => {
    addWatchLinks();
    mountHomeMedia();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();