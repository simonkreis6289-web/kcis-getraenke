/* KC Invaliden Schwadron – Fuchsjagd. Würfe werden im gemeinsamen Clubzustand gespeichert. */
function createFuchsjagdState(){return {active:false,finished:false,fox:'',hunters:[],score:0,phase:'start',startThrows:0,hunterIndex:0,round:0,throws:[],result:'',penaltiesBooked:false,startedAt:''};}
function ensureFuchsjagdState(){if(!fuchsjagdState||typeof fuchsjagdState!=='object')fuchsjagdState=createFuchsjagdState();if(!Array.isArray(fuchsjagdState.hunters))fuchsjagdState.hunters=[];if(!Array.isArray(fuchsjagdState.throws))fuchsjagdState.throws=[];}
function getFuchsjagdPlayers(){return getActivePlayersForSoloGame();}
function startFuchsjagdGame(){
  const fox=document.getElementById('fuchs-select')?.value;
  const participants=getFuchsjagdPlayers();
  if(!fox||!participants.some(p=>p.name===fox)||participants.length<2){showToast('Fuchs auswählen und mindestens zwei Spieler anwesend melden','error');return;}
  fuchsjagdState={...createFuchsjagdState(),active:true,fox,hunters:participants.filter(p=>p.name!==fox).map(p=>p.name),startedAt:new Date().toISOString()};
  if(typeof dashboardActiveGame!=='undefined')dashboardActiveGame='fuchsjagd';
  renderFuchsjagdGame();persistState();
}
function fuchsjagdCurrentThrower(){ensureFuchsjagdState();let s=fuchsjagdState;if(!s.active)return '';return s.phase==='start'||s.phase==='fox'||s.phase==='finalFox'?s.fox:s.hunters[s.hunterIndex]||'';}
async function applyFuchsjagdThrow(pins){
 ensureFuchsjagdState();let s=fuchsjagdState;if(!s.active||s.busy)return;
 pins=Number(pins);if(!Number.isInteger(pins)||pins<0||pins>12)return;
 const thrower=fuchsjagdCurrentThrower();if(!thrower)return;
 s.busy=true;
 try{
   // Die identische Strafbuchung wie bei Mensch / +−×÷. 9er/Kranz: 1 € für alle anderen; Gosse: Werfer.
   if(!(await changeSoloThrowPenalty(thrower,null,{pins,isGosse:pins===0})))return;
   let delta=s.phase==='hunt'?-pins:pins;
   s.score+=delta;
   s.throws.push({name:thrower,pins,delta,score:s.score,at:new Date().toISOString()});
   if(s.phase==='start'){
     s.startThrows++;
     if(s.startThrows===2)s.phase='hunt';
   }else if(s.phase==='hunt'){
     if(s.score<=0){await finishFuchsjagd(false,thrower);return;}
     s.phase='fox';
   }else{
     if(s.phase==='finalFox'){await finishFuchsjagd(true,'');return;}
     s.hunterIndex++;
     s.round++;
     if(s.hunterIndex>=s.hunters.length){s.phase='finalFox';}
     else s.phase='hunt';
   }
   renderFuchsjagdGame();persistState();
 }catch(e){console.error('Fuchsjagd',e);showToast('Wurf konnte nicht gespeichert werden','error')}
 finally{s.busy=false;}
}
async function finishFuchsjagd(escaped,killer){
 const s=fuchsjagdState;
 const losers=escaped?s.hunters.slice():[s.fox];
 const key=getFirstLoserStrafeKey();
 if(!key){showToast('Strafe „1. Verlierer“ fehlt. Abschluss nicht möglich.','error');return false;}
 const changes=losers.map(personName=>({personName,category:'strafen',key,delta:1}));
 if(!(await changeMultipleSyncedPersonCounters(changes,'🦊 Fuchsjagd abgeschlossen')))return false;
 s.active=false;s.finished=true;s.penaltiesBooked=true;
 s.result=escaped?`Fuchs ${s.fox} entkommen · alle Jäger 1. Verlierer +1`:`Fuchs ${s.fox} erlegt durch ${killer} · 1. Verlierer +1`;
 renderAll();persistState();showToast(s.result,'success');return true;
}
async function undoFuchsjagdThrow(){
 ensureFuchsjagdState();let s=fuchsjagdState;if(s.busy||!s.throws.length||s.finished){showToast('Rückgängig nach Spielabschluss nicht möglich','error');return;}
 const last=s.throws[s.throws.length-1];s.busy=true;
 try{
  if(!(await changeSoloThrowPenalty(last.name,{pins:last.pins,isGosse:last.pins===0},null)))return;
  s.throws.pop();
  // Aus Wurfprotokoll rekonstruieren: vermeidet Fehler bei der Wechselreihenfolge.
  const history=s.throws.slice(),fox=s.fox,hunters=s.hunters.slice(),startedAt=s.startedAt;
  fuchsjagdState={...createFuchsjagdState(),fox,hunters,active:true,startedAt};
  const t=fuchsjagdState;
  for(const x of history){t.score+=x.delta;t.throws.push(x);if(t.phase==='start'){t.startThrows++;if(t.startThrows===2)t.phase='hunt';}else if(t.phase==='hunt')t.phase='fox';else{t.hunterIndex++;t.round++;t.phase=t.hunterIndex<hunters.length?'hunt':'finalFox';}}
  renderFuchsjagdGame();persistState();
 }finally{fuchsjagdState.busy=false;}
}
function renderFuchsjagdGame(){
 const el=document.getElementById('fuchs-board'),select=document.getElementById('fuchs-select');if(!el)return;
 ensureFuchsjagdState();const s=fuchsjagdState;
 if(select){const names=getFuchsjagdPlayers().map(p=>p.name),keep=select.value||s.fox;select.innerHTML=names.map(n=>`<option value="${escapeFuchs(n)}">${escapeFuchs(n)}</option>`).join('');if(names.includes(keep))select.value=keep;}
 const turn=s.active?fuchsjagdCurrentThrower():'–';
 const phase=s.phase==='start'?`Startwurf ${s.startThrows+1}/2`:s.phase==='hunt'?'Jäger zieht ab':s.phase==='finalFox'?'Letzter Wurf des Fuchses':s.phase==='fox'?'Fuchs addiert':'Spiel beendet';
 const rows=s.throws.slice().reverse().map((x,i)=>`<tr><td>${s.throws.length-i}</td><td>${escapeFuchs(x.name)}</td><td>${x.pins===12?'Kranz':x.pins===0?'Gosse':x.pins}</td><td class="${x.delta>=0?'fox-plus':'fox-minus'}">${x.delta>0?'+':''}${x.delta}</td><td><strong>${x.score}</strong></td></tr>`).join('');
 const actions=s.active?`<div class="fox-actions">${Array.from({length:10},(_,i)=>`<button class="btn" type="button" onclick="applyFuchsjagdThrow(${i})">${i}</button>`).join('')}<button class="btn fox-special" type="button" onclick="applyFuchsjagdThrow(12)">🎳 Kranz</button><button class="btn fox-special" type="button" onclick="undoFuchsjagdThrow()">↶ Rückgängig</button></div>`:'';
 el.innerHTML=`<div class="fox-layout"><div class="fox-top"><div class="fox-stat"><small>🦊 Fuchs</small><strong>${escapeFuchs(s.fox||'Noch keiner')}</strong></div><div class="fox-stat fox-score"><small>Aktueller Vorsprung</small><strong>${s.score} Holz</strong></div><div class="fox-stat"><small>Am Wurf</small><strong>${escapeFuchs(turn)}</strong></div></div>${s.active?`<div class="fox-turn">${escapeFuchs(phase)} · ${s.phase==='hunt'?`Jäger ${s.hunterIndex+1} von ${s.hunters.length}`:`${s.hunters.length} Jäger insgesamt`}</div>`:''}${s.result?`<div class="fox-result">🏁 ${escapeFuchs(s.result)}</div>`:''}${actions}<div class="fox-table-wrap"><table class="fox-table"><thead><tr><th>#</th><th>Werfer</th><th>Holz</th><th>+/−</th><th>Vorsprung</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Noch keine Würfe</td></tr>'}</tbody></table></div></div>`;
}
function escapeFuchs(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.fuchsjagd={id:'fuchsjagd',title:'Fuchsjagd',ready:true};
