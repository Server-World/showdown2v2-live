(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LOGO='/assets/branding/ssl-logo-primary.png';
  let loopTimer=null;

  async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url);return r.json();}
  function leaders(league){return Object.entries(league?.standings||{}).map(([tier,rows])=>{const r=rows?.[0];return r?`<a class="division-leader-card" href="/standings/#${esc(tier)}" data-tilt><span>${esc(tier)}</span><strong>${esc(r.team)}</strong><small>${esc(r.franchise||'')}</small><b>${esc(r.wins)}-${esc(r.losses)}</b></a>`:'';}).join('');}

  function clipSrc(feature){
    const parent=encodeURIComponent(window.location.hostname||'showdown2v2.live');
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(feature.clip_id)}&parent=${parent}&autoplay=true&muted=true`;
  }
  function startClipLoop(stage,feature){
    const frame=$('#ssl-home-loop-frame',stage),poster=$('.hero-loop-poster',stage);
    if(!frame)return;
    const restart=()=>{if(document.hidden)return;frame.src='about:blank';requestAnimationFrame(()=>{frame.src=clipSrc(feature);});};
    frame.addEventListener('load',()=>{if(frame.src==='about:blank')return;window.setTimeout(()=>poster?.classList.add('is-playing'),650);});
    frame.src=clipSrc(feature);
    clearInterval(loopTimer);
    loopTimer=window.setInterval(restart,Math.max(9000,(Number(feature.duration_seconds)||24)*1000+500));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)restart();});
  }
  function mountHeroLoop(media){
    if(document.body.dataset.page!=='home'||$('#ssl-home-loop-frame'))return;
    const stage=$('.competition-stage'),feature=media?.home_feature||{};
    if(!stage||!feature.clip_id)return;
    stage.classList.add('has-loop');
    stage.innerHTML=`<div class="hero-loop-shell">
      <iframe id="ssl-home-loop-frame" class="hero-loop-player" title="Looping featured Supersonic Showdown League gameplay" allow="autoplay; fullscreen" scrolling="no" frameborder="0"></iframe>
      <div class="hero-loop-poster" style="--hero-loop-poster:url('${esc(feature.thumbnail||'/assets/branding/ssl-social-card.svg')}')"></div>
      <div class="hero-loop-shade" aria-hidden="true"></div><span class="hero-loop-badge"><i></i> FEATURED GAMEPLAY · MUTED LOOP</span>
      <img class="hero-loop-logo" src="${LOGO}" alt="Supersonic Showdown League">
      <div class="hero-loop-meta"><small>${esc(feature.label||'SSL FEATURED MOMENT')}</small><strong>${esc(feature.title||'Watch the Showdown')}</strong><span>Muted highlight loop · full broadcast and live stream in the Watch Room</span></div>
      <a class="hero-loop-open" href="/watch/">WATCH NOW →</a></div>`;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,saveData=navigator.connection?.saveData;
    if(reduced||saveData)return;
    startClipLoop(stage,feature);
  }
  function mountPlayerWorld(league,profile){
    if(document.body.dataset.page!=='home'||$('#player-world'))return;
    const anchor=$$('.section').find(s=>/Match center/i.test(s.textContent||''));if(!anchor)return;
    const p=profile?.player||{},season=profile?.season||{},stats=season?.stats||{};
    const x=document.createElement('section');x.id='player-world';x.className='section player-world reveal-on-scroll';
    x.innerHTML=`<div class="wrap"><div class="section-head player-world-head"><div><p class="eyebrow">The league is the players</p><h2>EVERY NAME BUILDS THE WORLD.</h2><p>Teams create the rivalry. Players create the moments. SSL puts competitive identity, performance, and progression at the center of the league.</p></div><a class="btn ghost" href="/players/">Explore the roster</a></div><div class="player-world-grid"><a class="spotlight-player" href="/players/" data-tilt><div class="spotlight-orbit"></div><div class="spotlight-id"><span>${esc(p.initials||'SSL')}</span></div><div class="spotlight-copy"><span class="spotlight-tier">${esc(p.tier||'Featured player')}</span><h3>${esc(p.gamertag||'SSL PLAYER')}</h3><p>${esc(p.team||'')} · ${esc(p.role||'Player')}</p><small>${esc(p.eligibility_label||'')}</small></div><div class="spotlight-stats"><span><small>SLP</small><b>${esc(season.slp??'—')}</b></span><span><small>Goals</small><b>${esc(stats.goals??'—')}</b></span><span><small>Assists</small><b>${esc(stats.assists??'—')}</b></span><span><small>Saves</small><b>${esc(stats.saves??'—')}</b></span></div><div class="spotlight-footer"><span>PLAYER SPOTLIGHT</span><strong>OPEN ROSTER →</strong></div></a><div class="division-radar"><div class="division-radar-head"><span class="eyebrow">Current division leaders</span><strong>Six ladders. Six targets.</strong></div><div class="division-leader-grid">${leaders(league)}</div><div class="division-radar-foot"><a href="/standings/">Full standings →</a><a href="/franchises/">Meet every franchise →</a></div></div></div></div>`;
    anchor.insertAdjacentElement('beforebegin',x);
  }
  async function start(){if(document.body.dataset.page!=='home')return;try{const [league,profile,media]=await Promise.all([json('/data/league.json'),json('/data/player-card-hitman.json'),json('/data/media.json')]);mountHeroLoop(media);mountPlayerWorld(league,profile);}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();