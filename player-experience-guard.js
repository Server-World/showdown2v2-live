(() => {
  'use strict';

  const root = document.getElementById('player-experience');
  if (!root) return;

  let repairing = false;
  const hasCorrectRenderer = () => Boolean(
    root.querySelector('.player-card-stage .has-profile-data, .player-card-stage .roster-profile')
  );
  const hasLegacyRenderer = () => Boolean(root.querySelector('.player-browser')) && !hasCorrectRenderer();

  const repair = () => {
    if (repairing || !hasLegacyRenderer()) return;
    repairing = true;
    const script = document.createElement('script');
    script.src = `/player-experience-fix.js?repair=${Date.now()}`;
    script.async = false;
    const done = () => { repairing = false; };
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', done, { once: true });
    document.head.appendChild(script);
  };

  const observer = new MutationObserver(() => queueMicrotask(repair));
  observer.observe(root, { childList: true, subtree: true });
  queueMicrotask(repair);
})();
