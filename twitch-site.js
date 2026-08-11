(() => {
  'use strict';

  const TWITCH_URL = 'https://www.twitch.tv/supersonicshowdownleague';
  const WATCH_PATH = '/watch/';

  function push(event, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, ...detail });
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

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href === WATCH_PATH || href === TWITCH_URL || /twitch\.tv\/supersonicshowdownleague/i.test(href)) {
      push(href === WATCH_PATH ? 'view_twitch_hub' : 'twitch_external_click', {
        destination: href,
        link_text: link.textContent.trim(),
        link_location: link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'content'
      });
    }
  });

  addWatchLinks();
  const observer = new MutationObserver(addWatchLinks);
  observer.observe(document.body, { childList: true, subtree: true });
})();
