const tierLabels={mythic:'MYTHIC',legend:'LEGEND',elite:'ELITE',contender:'CONTENDER',rookie:'ROOKIE',amateur:'AMATEUR'};
let leagueData=null;
const esc=value=>String(value??'—').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
function renderStandings(tier){
  const body=document.getElementById('standings-body');
  const label=tierLabels[tier]||String(tier).toUpperCase();
  const rows=leagueData?.standings?.[tier]||[];
  if(!rows.length){body.innerHTML=`<tr class="empty-row"><td colspan="9">${label} standings are waiting for the verified league export. No placeholder records are being invented.</td></tr>`;return;}
  body.innerHTML=rows.map((r,i)=>`<tr><td class="rank">${esc(r.rank??i+1)}</td><td><strong>${esc(r.team)}</strong></td><td>${esc(r.wins)}</td><td>${esc(r.losses)}</td><td>${esc(r.win_pct)}</td><td>${esc(r.goals_for)}</td><td>${esc(r.goals_against)}</td><td>${esc(r.differential)}</td><td>${esc(r.streak)}</td></tr>`).join('');
}
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderStandings(btn.dataset.tier);}));
fetch('./data/league.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(`league feed ${r.status}`))).then(data=>{leagueData=data;renderStandings(document.querySelector('.tab.active')?.dataset.tier||'mythic');}).catch(()=>{leagueData=null;});
