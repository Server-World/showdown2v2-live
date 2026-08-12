(() => {
  const styles=['/experience.css','/experience-home.css','/experience-fixes.css','/brand-shell-fix.css','/structure.css','/player-experience-fix.css'];
  styles.forEach(href=>{if(!document.querySelector(`link[href="${href}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);}});
  const scripts=['/experience-countdown.js','/experience-home.js','/experience-motion.js','/brand-shell-fix.js','/structure.js','/player-experience-fix.js','/player-experience-guard.js','/player-profile-stats.js'];
  scripts.forEach(src=>{if(!document.querySelector(`script[src="${src}"]`)){const s=document.createElement('script');s.src=src;s.async=false;document.head.appendChild(s);}});
})();