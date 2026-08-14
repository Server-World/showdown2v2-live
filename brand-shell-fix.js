(() => {
  'use strict';

  const CURRENT_LOGO = '/assets/branding/ssl-logo-primary.png';
  const LEGACY_LOGO = '/assets/branding/ssl-logo.svg';

  function brandMarkup() {
    return `<img class="brand-logo brand-logo-current" src="${CURRENT_LOGO}" alt="" width="192" height="192" decoding="async"><span class="brand-wordmark brand-wordmark-current"><b><i>S</i>UPERSONIC <i>S</i>HOWDOWN</b><strong><i>L</i>EAGUE <em>2</em><u>v</u><em>2</em></strong></span>`;
  }

  function replaceLegacyImages(root = document) {
    root.querySelectorAll?.('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      if (!src.includes('ssl-logo.svg')) return;
      img.setAttribute('src', CURRENT_LOGO);
      img.setAttribute('width', '192');
      img.setAttribute('height', '192');
      img.removeAttribute('fetchpriority');
    });
  }

  function normalizeHeadBranding() {
    document.querySelectorAll('link[rel~="icon"]').forEach(link => {
      link.setAttribute('href', CURRENT_LOGO);
      link.setAttribute('type', 'image/png');
    });

    document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href.includes('ssl-logo.svg')) return;
      link.setAttribute('href', CURRENT_LOGO);
      link.setAttribute('type', 'image/png');
    });

    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      const source = script.textContent || '';
      if (!source.includes('ssl-logo.svg')) return;
      script.textContent = source.replaceAll(LEGACY_LOGO, CURRENT_LOGO);
    });
  }

  function normalizeShellBranding() {
    document.querySelectorAll('.brand-lockup').forEach(lockup => {
      if (lockup.dataset.currentBrand === 'true') return;
      lockup.dataset.currentBrand = 'true';
      lockup.innerHTML = brandMarkup();
    });
  }

  function removeDuplicateChrome() {
    document.querySelectorAll('.statusbar').forEach(node => node.remove());

    if (document.body?.dataset.page === 'home') {
      document.querySelectorAll('#competition-status-band').forEach(node => node.remove());
    }
  }

  function apply() {
    normalizeHeadBranding();
    normalizeShellBranding();
    replaceLegacyImages(document);
    removeDuplicateChrome();
  }

  apply();

  const observer = new MutationObserver(mutations => {
    let needsApply = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length || mutation.type === 'attributes') {
        needsApply = true;
        break;
      }
    }
    if (needsApply) apply();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
  }
})();