(() => {
  'use strict';
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  function reveal(){const t=$$('.section,.broadcast-gateway,.watch-hype,.card,.competition-panel').filter(e=>!e.classList.contains('reveal-ready'));t.forEach(e=>e.classList.add('reveal-ready'));if(!('IntersectionObserver'in window)||matchMedia('(prefers-reduced-motion:reduce)').matches){t.forEach(e=>e.classList.add('is-visible'));return;}const o=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('is-visible');o.unobserve(x.target);}}),{threshold:.08,rootMargin:'80px 0px'});t.forEach(e=>o.observe(e));}
  function tilt(){if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;$$('[data-tilt],.feature-card,.team-card,.media-card').forEach(c=>{if(c.dataset.tiltReady)return;c.dataset.tiltReady='true';c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.setProperty('--rx',`${(-y*3.5).toFixed(2)}deg`);c.style.setProperty('--ry',`${(x*4.5).toFixed(2)}deg`);});c.addEventListener('pointerleave',()=>{c.style.removeProperty('--rx');c.style.removeProperty('--ry');});});}
  function start(){reveal();tilt();const o=new MutationObserver(()=>{reveal();tilt();});o.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
