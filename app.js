const tiers={mythic:'MYTHIC',legend:'LEGEND',elite:'ELITE',contender:'CONTENDER',rookie:'ROOKIE',amateur:'AMATEUR'};
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const tier=tiers[btn.dataset.tier]||btn.dataset.tier.toUpperCase();
  document.getElementById('standings-body').innerHTML=`<tr class="empty-row"><td colspan="9">${tier} standings are waiting for the verified league export. No placeholder records are being invented.</td></tr>`;
}));
