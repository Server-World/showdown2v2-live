(() => {
  'use strict';

  const TWITCH_URL = 'https://www.twitch.tv/supersonicshowdownleague';
  const WATCH_PATH = '/watch/';

  function push(event, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, page_path: window.location.pathname, ...detail });
  }

  function ensureStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function ensureScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function makeLink(text, href, className, attr) {
    const link = document.createElement('a');
    link.href = href;
    if (className) link.className = className;
    if (attr) link.dataset[attr] = 'true';
    link.textContent = text;
    return link;
  }

  function addWatchLinks() {
    const nav = document.querySelector('.navlinks');
    if (nav && !nav.querySelector('[data-twitch-nav]')) {
      const link = makeLink('Watch', WATCH_PATH, '', 'twitchNav');
      if (document.body.dataset.page === 'watch') link.setAttribute('aria-current', 'page');
      nav.appendChild(link);
    }

    const actions = document.querySelector('.nav-actions');
    if (actions && !actions.querySelector('[data-twitch-action]')) {
      const link = makeLink('Watch SSL', WATCH_PATH, 'btn ghost twitch-nav-action', 'twitchAction');
      actions.insertBefore(link, actions.firstChild);
    }

    const footer = document.querySelector('.footer-nav');
    if (footer && !footer.querySelector('[data-twitch-footer]')) {
      const link = makeLink('Watch', WATCH_PATH, '', 'twitchFooter');
      footer.insertBefore(link, footer.firstChild);
    }

    const statusActions = document.querySelector('#competition-status-band .status-actions');
    if (statusActions && !statusActions.querySelector('[data-twitch-status]')) {
      const link = makeLink('Watch SSL', WATCH_PATH, 'btn primary twitch-status-action', 'twitchStatus');
      statusActions.insertBefore(link, statusActions.firstChild);
    }
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

  ensureStyle('/media.css');
  ensureScript('/experience.js');
  addWatchLinks();

  const observer = new MutationObserver(addWatchLinks);
  observer.observe(document.body, { childList: true, subtree: true });
})();
