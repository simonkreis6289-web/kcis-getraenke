/* Tor: Abräumen im Team, zwei Tore Vorsprung ab fünf. */
function createTorState(){return {active:false,finished:false,startedAt:'',coinPending:false,coinWinner:'',current:'T1',scores:{T1:0,T2:0},standing:[1,2,3,4,5,6,7,8,9],selected:[],teams:{T1:[],T2:[]},teamTurns:{T1:0,T2:0},history:[],winner:'',message:'',busy:false};}
function ensureTorState(){if(!torState||typeof torState!=='object')torState=createTorState();}
function torEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function torCurrentThrower(){ensureTorState();const s=torState,team=s.current,arr=s.teams[team]||[];return arr.length?arr[(s.teamTurns[team]||0)%arr.length]:'';}
function startTorGame(){
 const teams={T1:getSichernTeamPlayers('T1'),T2:getSichernTeamPlayers('T2')};
 if(!teams.T1.length||!teams.T2.length){showToast('Für Tor müssen beide Teams Spieler haben','error');return;}
 torState={...createTorState(),teams,active:true,coinPending:true,startedAt:new Date().toISOString()};
 dashboardActiveGame='tor';renderTorGame();persistState();
 // Münzwurf mit wechselnden Teamfarben; das Ergebnis wird erst nach der Animation übernommen.
 let ticks=0;const result=document.getElementById('tor-coin-result');
 const timer=setInterval(()=>{if(!torState?.coinPending){clearInterval(timer);return;}if(result)result.textContent=(ticks++%2?'🪙 '+getGroupLabel('T1'):'🪙 '+getGroupLabel('T2'));if(ticks>=14){clearInterval(timer);const winner=Math.random()<.5?'T1':'T2';torState.current=winner;torState.coinWinner=winner;torState.coinPending=false;renderTorGame();persistState();}},90);
}
function torTogglePin(n){ensureTorState();const s=torState;if(!s.active||s.coinPending||s.busy||!s.standing.includes(n))return;s.selected=s.selected.includes(n)?s.selected.filter(x=>x!==n):[...s.selected,n];renderTorGame();}
function torOther(t){return t==='T1'?'T2':'T1';}
async function torThrow(kind='pins'){
 ensureTorState();const s=torState;if(!s.active||s.coinPending||s.busy)return;
 const team=s.current,thrower=torCurrentThrower();if(!thrower)return;
 const hit=kind==='pins'?s.selected.slice():[];
 if(kind==='pins'&&!hit.length){showToast('Kegel auswählen oder Vorbei/Gosse drücken','error');return;}
 const isGosse=kind==='gosse';const knocked=hit.length;
 s.busy=true;
 try{
   // Strafregeln für Gosse und 9er analog zu anderen Spielen.
   if(isGosse||knocked===9){if(!(await changeSoloThrowPenalty(thrower,null,{pins:isGosse?0:9,isGosse})))return;}
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
function renderTorGame(){
 const el=document.getElementById('tor-board');if(!el)return;ensureTorState();const s=torState;
 const card=k=>`<div class="tor-team ${s.active&&s.current===k?'tor-active':''}" style="--tor-color:${torEscape(getGroupColor(k))}"><small>${torEscape(getGroupLabel(k))}</small><strong>${s.scores[k]||0}</strong><span>${s.active&&s.current===k?'🎳 Am Zug':''}</span></div>`;
 const pins=[7,8,9,4,5,6,1,2,3].map(n=>`<button type="button" data-pin="${n}" class="tor-pin ${s.standing.includes(n)?'standing':'down'} ${s.selected.includes(n)?'selected':''}" ${!s.active||s.coinPending||!s.standing.includes(n)?'disabled':''} onclick="torTogglePin(${n})" aria-pressed="${s.selected.includes(n)}">${s.standing.includes(n)?n:'·'}</button>`).join('');
 el.innerHTML=`<div class="tor-layout"><div class="tor-scoreboard">${card('T1')}<div class="tor-vs">⚽ TOR<small>Bis mindestens 5 · 2 Tore Vorsprung</small></div>${card('T2')}</div>${s.coinPending?`<div class="tor-turn" id="tor-coin-result">🪙 Wer beginnt?</div>`:s.active?`<div class="tor-turn">🎳 ${torEscape(torCurrentThrower())} · ${torEscape(getGroupLabel(s.current))} am Wurf</div>`:`<div class="tor-turn">${torEscape(s.message||'Neues Spiel starten')}</div>`}<div class="tor-pins">${pins}</div><div class="tor-remaining">${s.standing.length} von 9 Kegeln stehen · ${s.selected.length} zum Abräumen ausgewählt</div>${s.active&&!s.coinPending?`<div class="tor-actions"><button class="primary-btn" onclick="torThrow('pins')" ${!s.selected.length?'disabled':''}>🎳 Treffer bestätigen</button><button class="secondary-btn" onclick="torThrow('miss')">↪ Vorbeigeworfen</button><button class="secondary-btn" onclick="torThrow('gosse')">💀 Gosse</button></div>`:''}<div class="tor-history">${s.history.slice(-5).reverse().map(h=>`<div>${torEscape(getGroupLabel(h.team))} · ${torEscape(h.thrower)}: ${h.kind==='gosse'?'Gosse':h.kind==='miss'?'Vorbei':h.pins+' Kegel'}</div>`).join('')}</div></div>`;
}
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.tor={id:'tor',title:'Tor',ready:true};
