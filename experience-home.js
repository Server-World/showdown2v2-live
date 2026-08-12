(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LOGO='/assets/branding/ssl-logo-primary.png';
  const HOME_VIDEO='/assets/video/ssl-home-loop.mp4';

  async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url);return r.json();}
  function leaders(league){return Object.entries(league?.standings||{}).map(([tier,rows])=>{const r=rows?.[0];return r?`<a class="division-leader-card" href="/standings/#${esc(tier)}" data-tilt><span>${esc(tier)}</span><strong>${esc(r.team)}</strong><small>${esc(r.franchise||'')}</small><b>${esc(r.wins)}-${esc(r.losses)}</b></a>`:'';}).join('');}

  function ensureHeroVideo(){
    const video=$('#ssl-home-video');
    if(!video)return false;
    video.defaultMuted=true;
    video.muted=true;
    video.autoplay=true;
    video.loop=true;
    video.playsInline=true;
    video.setAttribute('muted','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    const play=()=>{
      video.defaultMuted=true;
      video.muted=true;
      const promise=video.play();
      if(promise&&typeof promise.catch==='function')promise.catch(()=>{});
    };
    if(video.readyState>=2)play();
    else video.addEventListener('canplay',play,{once:true});
    window.addEventListener('pageshow',play,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)play();});
    return true;
  }
  function mountPlayerWorld(league,profile){
    if(document.body.dataset.page!=='home'||$('#player-world'))return;
    const anchor=$$('.section').find(s=>/Match center/i.test(s.textContent||''));if(!anchor)return;
    const p=profile?.player||{},season=profile?.season||{},stats=season?.stats||{};
    const x=document.createElement('section');x.id='player-world';x.className='section player-world reveal-on-scroll';
    x.innerHTML=`<div class="wrap"><div class="section-head player-world-head"><div><p class="eyebrow">The league is the players</p><h2>EVERY NAME BUILDS THE WORLD.</h2><p>Teams create the rivalry. Players create the moments. SSL puts competitive identity, performance, and progression at the center of the league.</p></div><a class="btn ghost" href="/players/">Explore the roster</a></div><div class="player-world-grid"><a class="spotlight-player" href="/players/" data-tilt><div class="spotlight-orbit"></div><div class="spotlight-id"><span>${esc(p.initials||'SSL')}</span></div><div class="spotlight-copy"><span class="spotlight-tier">${esc(p.tier||'Featured player')}</span><h3>${esc(p.gamertag||'SSL PLAYER')}</h3><p>${esc(p.team||'')} · ${esc(p.role||'Player')}</p><small>${esc(p.eligibility_label||'')}</small></div><div class="spotlight-stats"><span><small>SLP</small><b>${esc(season.slp??'—')}</b></span><span><small>Goals</small><b>${esc(stats.goals??'—')}</b></span><span><small>Assists</small><b>${esc(stats.assists??'—')}</b></span><span><small>Saves</small><b>${esc(stats.saves??'—')}</b></span></div><div class="spotlight-footer"><span>PLAYER SPOTLIGHT</span><strong>OPEN ROSTER →</strong></div></a><div class="division-radar"><div class="division-radar-head"><span class="eyebrow">Current division leaders</span><strong>Six ladders. Six targets.</strong></div><div class="division-leader-grid">${leaders(league)}</div><div class="division-radar-foot"><a href="/standings/">Full standings →</a><a href="/franchises/">Meet every franchise →</a></div></div></div></div>`;
    anchor.insertAdjacentElement('beforebegin',x);
  }
  async function start(){if(document.body.dataset.page!=='home')return;ensureHeroVideo();try{const [league,profile]=await Promise.all([json('/data/league.json'),json('/data/player-card-hitman.json')]);mountPlayerWorld(league,profile);}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();