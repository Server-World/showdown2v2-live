(()=>{
  const tabs=[...document.querySelectorAll('[data-card-tab]')];
  const views=[...document.querySelectorAll('[data-card-view]')];
  if(!tabs.length||!views.length)return;

  const tiers=[
    ['MYTHIC','tier-mythic'],['LEGEND','tier-legend'],['ELITE','tier-elite'],
    ['CONTENDER','tier-contender'],['ROOKIE','tier-rookie'],['AMATEUR','tier-amateur']
  ];
  let eligible=true;
  let locked=true;
  let tierIndex=1;

  const activate=tab=>{
    const key=tab.dataset.cardTab;
    tabs.forEach(item=>{
      const active=item===tab;
      item.classList.toggle('active',active);
      item.setAttribute('aria-selected',String(active));
      item.tabIndex=active?0:-1;
    });
    views.forEach(view=>{
      const active=view.dataset.cardView===key;
      view.classList.toggle('active',active);
      view.hidden=!active;
    });
  };

  tabs.forEach((tab,index)=>{
    tab.setAttribute('role','tab');
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
      event.preventDefault();
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      tabs[next].focus();
      activate(tabs[next]);
    });
  });

  const eligibilityButton=document.querySelector('[data-demo-action="eligibility"]');
  const eligibilityBox=document.getElementById('v5-eligibility');
  const eligibilityText=document.getElementById('v5-eligibility-text');
  eligibilityButton?.addEventListener('click',()=>{
    eligible=!eligible;
    eligibilityBox?.classList.toggle('ineligible',!eligible);
    if(eligibilityText)eligibilityText.textContent=eligible?'ELIGIBLE TO PLAY':'INELIGIBLE — PREVIEW';
    eligibilityButton.setAttribute('aria-pressed',String(!eligible));
  });

  const mmrButton=document.querySelector('[data-demo-action="mmr"]');
  const mmrValue=document.getElementById('v5-mmr-value');
  const mmrSub=document.getElementById('v5-mmr-sub');
  const metaMmr=document.getElementById('v5-meta-mmr');
  mmrButton?.addEventListener('click',()=>{
    locked=!locked;
    const value=locked?'1475':'1462*';
    if(mmrValue){mmrValue.textContent=value;mmrValue.classList.toggle('v5-unlocked',!locked)}
    if(metaMmr){metaMmr.textContent=value;metaMmr.classList.toggle('v5-unlocked',!locked)}
    if(mmrSub)mmrSub.textContent=locked?'Locked value available':'final_MMR fallback preview';
    mmrButton.setAttribute('aria-pressed',String(!locked));
  });

  const tierButton=document.querySelector('[data-demo-action="tier"]');
  const tierTargets=[document.getElementById('v5-tier-label'),document.getElementById('v5-current-tier')].filter(Boolean);
  tierButton?.addEventListener('click',()=>{
    tierIndex=(tierIndex+1)%tiers.length;
    const [label,className]=tiers[tierIndex];
    tierTargets.forEach(target=>{
      target.classList.remove(...tiers.map(([,cls])=>cls));
      target.classList.add(className);
      target.textContent=label.charAt(0)+label.slice(1).toLowerCase();
    });
  });

  activate(tabs.find(tab=>tab.classList.contains('active'))||tabs[0]);
})();
