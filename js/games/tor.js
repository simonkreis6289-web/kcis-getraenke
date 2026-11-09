/* Tor: Abräumen im Team, zwei Tore Vorsprung ab fünf. */
function createTorState(){return {active:false,finished:false,startedAt:'',coinPending:false,coinWinner:'',current:'T1',scores:{T1:0,T2:0},standing:[1,2,3,4,5,6,7,8,9],selected:[],teams:{T1:[],T2:[]},teamTurns:{T1:0,T2:0},history:[],winner:'',message:'',busy:false};}
function ensureTorState(){if(!torState||typeof torState!=='object')torState=createTorState();}
function torEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// Tor ist ein Teamspiel: der Werfer wird nur bei einer persönlichen Strafe gewählt.
function torChoosePenaltyPlayer(team, reason) {
 return new Promise(resolve => {
  const names=(torState?.teams?.[team]||[]).filter(name=>persons.some(p=>p.name===name&&p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly));
  if(!names.length){showToast('Keine anwesenden Spieler für '+getGroupLabel(team),'error');resolve(null);return;}
  const backdrop=document.createElement('div');backdrop.className='tor-person-backdrop';
  backdrop.style.cssText='position:fixed;inset:0;z-index:99999;background:#0009;display:grid;place-items:center;padding:16px';
  const modal=document.createElement('div');modal.style.cssText='background:#fff;color:#182035;border-radius:16px;padding:20px;width:min(560px,100%);max-height:90vh;overflow:auto';
  const heading=document.createElement('h3');heading.textContent=reason+' · '+getGroupLabel(team)+' · Wer hat geworfen?';modal.append(heading);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:10px;margin:15px 0';
  let selected=null;const buttons=[];
  names.forEach(name=>{const b=document.createElement('button');b.type='button';b.style.cssText='border:2px solid #33405b;border-radius:12px;background:white;padding:9px;display:grid;justify-items:center;gap:5px;color:#17213a;font-weight:700';const img=document.createElement('img');img.alt='';img.style.cssText='width:65px;height:65px;border-radius:50%;object-fit:cover';img.src='bilder/'+name.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'')+'.jpg';img.onerror=()=>img.replaceWith(document.createTextNode('👤'));if(persons.some(p=>p.name===name&&p.isGuest)){const initials=document.createElement('span');initials.textContent=name.trim().split(/\s+/).map(part=>part[0]||'').join('').toUpperCase().slice(0,2);initials.style.cssText='width:65px;height:65px;border-radius:50%;display:grid;place-items:center;background:#e7eaf2;color:#243657;font-size:24px;font-weight:800';b.append(initials,document.createTextNode(name));}else{b.append(img,document.createTextNode(name));}b.onclick=()=>{selected=name;buttons.forEach(x=>x.style.borderColor='#33405b');b.style.borderColor='#11a452';};buttons.push(b);grid.append(b);});modal.append(grid);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;justify-content:flex-end';
  const done=v=>{backdrop.remove();resolve(v);};
  const cancel=document.createElement('button');cancel.textContent='Abbrechen';cancel.onclick=()=>done(null);
  const ok=document.createElement('button');ok.textContent='✓ Buchen';ok.style.cssText='background:#09c900;padding:10px 18px;border-radius:8px';ok.onclick=()=>{if(!selected){showToast('Bitte Spieler auswählen','error');return;}done(selected);};actions.append(cancel,ok);modal.append(actions);backdrop.append(modal);document.body.append(backdrop);
 });
}
function startTorGame(){
 if(typeof gameSetupCheckGroups==='function'&&!gameSetupCheckGroups('tor'))return;
 const teams=typeof gameSetupTeamMap==='function'?gameSetupTeamMap('tor'):{T1:getSichernTeamPlayers('T1'),T2:getSichernTeamPlayers('T2')};
 if(!teams.T1.length||!teams.T2.length){showToast('Für Tor müssen beide Teams Spieler haben','error');return;}
 torState={...createTorState(),teams,active:true,coinPending:true,startedAt:new Date().toISOString()};
 dashboardActiveGame='tor';renderTorGame();persistState();
 // Münzwurf mit wechselnden Teamfarben; das Ergebnis wird erst nach der Animation übernommen.
 let ticks=0;const result=document.getElementById('tor-coin-result');
 const timer=setInterval(()=>{if(!torState?.coinPending){clearInterval(timer);return;}if(result)result.textContent=(ticks++%2?'🪙 '+getGroupLabel('T1'):'🪙 '+getGroupLabel('T2'));if(ticks>=14){clearInterval(timer);const winner=Math.random()<.5?'T1':'T2';torState.current=winner;torState.coinWinner=winner;torState.coinPending=false;renderTorGame();if(typeof announceDashboardStarter==='function')announceDashboardStarter('🪙 '+getGroupLabel(winner)+' beginnt!');persistState();}},90);
}
function torTogglePin(n){ensureTorState();const s=torState;if(!s.active||s.coinPending||s.busy||!s.standing.includes(n))return;s.selected=s.selected.includes(n)?s.selected.filter(x=>x!==n):[...s.selected,n];renderTorGame();}
function torOther(t){return t==='T1'?'T2':'T1';}
async function torThrow(kind='pins'){
 ensureTorState();const s=torState;if(!s.active||s.coinPending||s.busy)return;
 const team=s.current;
 const hit=kind==='kranz'?s.standing.slice():kind==='pins'?s.selected.slice():[];
 if(kind==='pins'&&!hit.length){showToast('Kegel auswählen oder Vorbei/Gosse drücken','error');return;}
 const isGosse=kind==='gosse';const knocked=hit.length;
 s.busy=true;
 const personalPenalty=isGosse||kind==='kranz'||knocked===9;
 const thrower=personalPenalty?await torChoosePenaltyPlayer(team,isGosse?'Gosse':kind==='kranz'?'Kranz':'9er'):'';
 if(personalPenalty&&!thrower){s.busy=false;return;}
 try{
   // Strafregeln für Gosse und 9er analog zu anderen Spielen.
   if(personalPenalty){if(!(await changeSoloThrowPenalty(thrower,null,{pins:isGosse?0:kind==='kranz'?12:9,isGosse})))return;}
   s.standing=s.standing.filter(n=>!hit.includes(n));s.selected=[];
   s.history.push({team,thrower,kind,hit,pins:knocked,at:new Date().toISOString()});
   s.teamTurns[team]=(s.teamTurns[team]||0)+1;
   if(!s.standing.length){
     s.scores[team]++;
     const other=torOther(team);
     if(s.scores[team]>=5&&s.scores[team]-s.scores[other]>=2){
       const key=getFirstLoserStrafeKey();
       if(!key){showToast('Strafe „1. Verlierer“ fehlt','error');s.history.pop();s.scores[team]--;s.standing=[1,2,3,4,5,6,7,8,9];return;}
       const changes=s.teams[other].map(personName=>({personName,category:'strafen',key,delta:1}));
       if(!(await changeMultipleSyncedPersonCounters(changes,'⚽ Tor: Verliererteam'))) {s.history.pop();s.scores[team]--;s.standing=[1,2,3,4,5,6,7,8,9];return;}
       s.active=false;s.finished=true;s.winner=team;s.message=getGroupLabel(team)+' gewinnt! '+getGroupLabel(other)+': 1. Verlierer +1 pro Spieler';
     }else{s.standing=[1,2,3,4,5,6,7,8,9];s.current=other;}
   }else if(!knocked){s.current=torOther(team);}
   dashboardActiveGame='tor';renderTorGame();persistState();
 }catch(e){console.error('Tor',e);showToast('Tor-Wurf konnte nicht gespeichert werden','error');}
 finally{s.busy=false;}
}
function renderTorGame(){if(typeof renderCommonGameSetups==='function')renderCommonGameSetups();
 const el=document.getElementById('tor-board');if(!el)return;ensureTorState();const s=torState;
 const card=k=>`<div class="tor-team ${s.active&&s.current===k?'tor-active':''}" style="--tor-color:${torEscape(getGroupColor(k))}"><small>${torEscape(getGroupLabel(k))}</small><strong>${s.scores[k]||0}</strong><span>${s.active&&s.current===k?'🎳 Am Zug':''}</span></div>`;
 const pins=[7,8,9,4,5,6,1,2,3].map(n=>`<button type="button" data-pin="${n}" class="tor-pin ${s.standing.includes(n)?'standing':'down'} ${s.selected.includes(n)?'selected':''}" ${!s.active||s.coinPending||!s.standing.includes(n)?'disabled':''} onclick="torTogglePin(${n})" aria-pressed="${s.selected.includes(n)}">${s.standing.includes(n)?n:''}</button>`).join('');
 el.innerHTML=`<div class="tor-layout"><div class="tor-scoreboard">${card('T1')}<div class="tor-vs">⚽ TOR<small>Bis mindestens 5 · 2 Tore Vorsprung</small></div>${card('T2')}</div>${s.coinPending?`<div class="tor-turn" id="tor-coin-result">🪙 Wer beginnt?</div>`:s.active?`<div class="tor-turn">🎳 ${torEscape(getGroupLabel(s.current))} am Wurf</div>`:`<div class="tor-turn">${torEscape(s.message||'Neues Spiel starten')}</div>`}<div class="tor-pins">${pins}</div><div class="tor-remaining">${s.standing.length} von 9 Kegeln stehen · ${s.selected.length} zum Abräumen ausgewählt</div>${s.active&&!s.coinPending?`<div class="tor-actions"><button class="primary-btn" onclick="torThrow('pins')" ${!s.selected.length?'disabled':''}>🎳 Treffer bestätigen</button><button class="secondary-btn" onclick="torThrow('miss')">↪ Vorbeigeworfen</button><button class="secondary-btn" onclick="torThrow('gosse')">💀 Gosse</button><button class="secondary-btn" onclick="torThrow('kranz')" ${s.standing.length===9?'':'disabled'}>👑 Kranz</button></div>`:''}<div class="tor-history">${s.history.slice(-5).reverse().map(h=>`<div>${torEscape(getGroupLabel(h.team))} · ${h.thrower?torEscape(h.thrower)+': ':''}${h.kind==='gosse'?'Gosse':h.kind==='miss'?'Vorbei':h.kind==='kranz'?'Kranz':h.pins+' Kegel'}</div>`).join('')}</div></div>`;
}
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.tor={id:'tor',title:'Tor',ready:true};
