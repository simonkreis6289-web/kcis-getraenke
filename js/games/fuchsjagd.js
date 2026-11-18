/* KC Invaliden Schwadron – Fuchsjagd. Würfe werden im gemeinsamen Clubzustand gespeichert. */
function createFuchsjagdState(){
 return {active:false,finished:false,fox:'',hunters:[],order:[],foxIndex:0,results:[],score:0,phase:'start',startThrows:0,hunterIndex:0,round:0,throws:[],result:'',penaltiesBooked:false,startedAt:'',tableStartIndex:0,visibleHunterFoxIndex:-1,visibleHunterIndex:-1};
}
function ensureFuchsjagdState(){
 if(!fuchsjagdState||typeof fuchsjagdState!=='object')fuchsjagdState=createFuchsjagdState();
 if(!Array.isArray(fuchsjagdState.hunters))fuchsjagdState.hunters=[];
 if(!Array.isArray(fuchsjagdState.throws))fuchsjagdState.throws=[];
 if(!Array.isArray(fuchsjagdState.order))fuchsjagdState.order=[];
 if(!Array.isArray(fuchsjagdState.results))fuchsjagdState.results=[];
}
function getFuchsjagdPlayers(){const active=getActivePlayersForSoloGame();return typeof gameSetupNames==='function'?gameSetupNames('fuchsjagd').map(n=>active.find(p=>p.name===n)).filter(Boolean):active;}
function fuchsjagdRotateRoster(names,first){const i=names.indexOf(first);return i<0?names.slice():names.slice(i).concat(names.slice(0,i));}
function fuchsjagdSetFox(s,index){
 s.foxIndex=index;s.fox=s.order[index];s.hunters=s.order.filter(n=>n!==s.fox);
 s.score=0;s.phase='start';s.startThrows=0;s.hunterIndex=0;s.round=0;
}
function startFuchsjagdGame(){
 const participants=getFuchsjagdPlayers(),fox=participants[0]?.name;
 if(!fox||!participants.some(p=>p.name===fox)||participants.length<2){showToast('Fuchs auswählen und mindestens zwei Spieler anwesend melden','error');return;}
 const s=createFuchsjagdState();s.order=fuchsjagdRotateRoster(participants.map(p=>p.name),fox);s.active=true;s.startedAt=new Date().toISOString();
 fuchsjagdSetFox(s,0);fuchsjagdState=s;
 if(typeof dashboardActiveGame!=='undefined')dashboardActiveGame='fuchsjagd';
 renderFuchsjagdGame();persistState();
}
function fuchsjagdCurrentThrower(){
 ensureFuchsjagdState();const s=fuchsjagdState;
 return !s.active?'':s.phase==='hunt'?s.hunters[s.hunterIndex]||'':s.fox;
}
// Jeder abgeschlossene Jäger-Wurf mit positivem Fuchsvorsprung ist eine bestandene Station.
// Station 1 ist der Start; mit N Personen sind maximal N-1 Jäger zu überstehen.
function fuchsjagdDistance(s){return Math.min(Math.max(1,s.order.length),s.hunterIndex+1);}
function fuchsjagdSnapshot(s){
 const {throws,busy,finishPenalties,...rest}=s;
 return JSON.parse(JSON.stringify(rest));
}
function fuchsjagdRestore(s,before){for(const key of Object.keys(s))if(!['throws','busy'].includes(key))delete s[key];Object.assign(s,JSON.parse(JSON.stringify(before)));}
function fuchsjagdApplyThrow(s,pins,scored,thrower,at){
 const before=fuchsjagdSnapshot(s),delta=s.phase==='hunt'?-scored:scored;
 // Die Tabelle beginnt mit dem ERSTEN Wurf eines neuen Jaegers neu.
 // Wuerfe bleiben vollständig gespeichert fuer Undo, Statistik und Verliererwertung.
 if(s.phase==='hunt'&&(s.visibleHunterFoxIndex!==s.foxIndex||s.visibleHunterIndex!==s.hunterIndex)){
  s.tableStartIndex=s.throws.length;
  s.visibleHunterFoxIndex=s.foxIndex;
  s.visibleHunterIndex=s.hunterIndex;
 }
 s.score+=delta;
 s.throws.push({name:thrower,fox:s.fox,foxIndex:s.foxIndex,pins:scored,rawPins:pins,delta,score:s.score,at,before});
 let outcome=null;
 if(s.phase==='start'){
  s.startThrows++;
  if(s.startThrows===2)s.phase='hunt';
 }else if(s.phase==='hunt'){
  if(s.score<=0)outcome={escaped:false,caughtBy:thrower,station:fuchsjagdDistance(s)};
  else{
   s.hunterIndex++;
   if(s.hunterIndex>=s.hunters.length)outcome={escaped:true,caughtBy:'',station:s.order.length};
   else{s.phase='fox';s.round++;}
  }
 }else s.phase='hunt';
 if(outcome){
  s.results.push({fox:s.fox,station:outcome.station,escaped:outcome.escaped,caughtBy:outcome.caughtBy});
  if(s.foxIndex+1<s.order.length)fuchsjagdSetFox(s,s.foxIndex+1);
  else return 'complete';
  return 'nextFox';
 }
 return 'continue';
}
async function fuchsjagdFinalize(s){
 const minimum=Math.min(...s.results.map(r=>r.station));
 const losers=s.results.filter(r=>r.station===minimum).map(r=>r.fox);
 const key=getFirstLoserStrafeKey();
 if(!key){showToast('Strafe „1. Verlierer“ fehlt. Abschluss nicht möglich.','error');return false;}
 const changes=losers.map(personName=>({personName,category:'strafen',key,delta:1}));
 if(!(await changeMultipleSyncedPersonCounters(changes,'🦊 Fuchsjagd: 1. Verlierer nach Strecke')))return false;
 s.active=false;s.finished=true;s.penaltiesBooked=true;s.finishPenalties=changes;
 s.loserNames=losers;s.winnerNames=s.results.filter(r=>r.station===Math.max(...s.results.map(x=>x.station))).map(r=>r.fox);
 s.result='Fuchsjagd beendet · 1. Verlierer: '+losers.join(', ')+' (Station '+minimum+')';
 if(typeof recordCompletedGame==='function')recordCompletedGame('fuchsjagd',s);
 return true;
}
async function applyFuchsjagdThrow(pins){
 ensureFuchsjagdState();const s=fuchsjagdState;if(!s.active||s.busy)return;
 pins=Number(pins);if(!Number.isInteger(pins)||pins<0||pins>12)return;
 const thrower=fuchsjagdCurrentThrower();if(!thrower)return;
 const scored=pins===12&&window.KCKranzUI?await KCKranzUI.select('fuchsjagd'):pins;if(scored===null)return;
 s.busy=true;
 try{
  if(!(await changeSoloThrowPenalty(thrower,null,{pins,isGosse:pins===0})))return;
  const status=fuchsjagdApplyThrow(s,pins,scored,thrower,new Date().toISOString());
  if(status==='complete'&&!(await fuchsjagdFinalize(s))){
   const last=s.throws.pop();fuchsjagdRestore(s,last.before);
   if(!(await changeSoloThrowPenalty(thrower,{pins,isGosse:pins===0},null)))showToast('Abschluss fehlgeschlagen: Wurfstrafe bitte überprüfen','error');
   return;
  }
  if(status==='nextFox')showToast('🦊 Nächster Fuchs: '+s.fox,'success');
  if(status==='complete')showToast(s.result,'success');
  renderFuchsjagdGame();persistState();
 }catch(e){console.error('Fuchsjagd',e);showToast('Wurf konnte nicht gespeichert werden','error');}
 finally{s.busy=false;}
}
async function fuchsjagdNextThrower(){
 ensureFuchsjagdState();const s=fuchsjagdState;
 if(!s.active||s.busy||s.finished)return false;
 const who=fuchsjagdCurrentThrower();
 if(!who)return false;
 s.busy=true;
 try{
  const result=fuchsjagdApplyThrow(s,0,0,who,new Date().toISOString());
  s.throws[s.throws.length-1].skipped=true;
  if(result==='complete'&&!(await fuchsjagdFinalize(s))){
   const last=s.throws.pop();fuchsjagdRestore(s,last.before);
   showToast('Fuchsjagd konnte nicht abgeschlossen werden','error');return false;
  }
  renderFuchsjagdGame();persistState();
  showToast('➡ '+who+' übersprungen · als Nächstes: '+(fuchsjagdCurrentThrower()||'Spielende'),'success');
  return true;
 }finally{s.busy=false;}
}
async function undoFuchsjagdThrow(){
 ensureFuchsjagdState();const s=fuchsjagdState;
 if(s.busy||!s.throws.length||s.finished){showToast('Rückgängig nach Spielabschluss nicht möglich','error');return;}
 const last=s.throws[s.throws.length-1];
 if(!last.before){showToast('Älterer Wurf kann nicht sicher zurückgenommen werden','error');return;}
 s.busy=true;
 try{
  if(!last.skipped&&!(await changeSoloThrowPenalty(last.name,{pins:last.rawPins??last.pins,isGosse:(last.rawPins??last.pins)===0},null)))return;
  s.throws.pop();fuchsjagdRestore(s,last.before);
  renderFuchsjagdGame();persistState();
 }finally{s.busy=false;}
}
function renderFuchsjagdGame(){
 if(typeof renderCommonGameSetups==='function')renderCommonGameSetups();
 const el=document.getElementById('fuchs-board'),select=document.getElementById('fuchs-select');if(!el)return;
 ensureFuchsjagdState();const s=fuchsjagdState;
 if(select){const names=getFuchsjagdPlayers().map(p=>p.name),keep=select.value||s.fox;select.innerHTML=names.map(n=>`<option value="${escapeFuchs(n)}">${escapeFuchs(n)}</option>`).join('');if(names.includes(keep))select.value=keep;}
 const turn=s.active?fuchsjagdCurrentThrower():'–';
 const phase=s.phase==='start'?`Startwurf ${s.startThrows+1}/2`:s.phase==='hunt'?'Jäger zieht ab':s.phase==='fox'?'Fuchs addiert':'Spiel beendet';
 const ranking=s.results.map(r=>`<li><strong>${escapeFuchs(r.fox)}</strong> · Station ${r.station}/${s.order.length} ${r.escaped?'🏁 durchgelaufen':'🦊 erlegt von '+escapeFuchs(r.caughtBy)}</li>`).join('');
 const progress=s.order.length?`<div class="fox-game-progress"><strong>Fuchs ${s.foxIndex+1} von ${s.order.length}</strong><ol>${ranking}</ol></div>`:'';
 const visible=s.throws.slice(Math.min(s.throws.length,Math.max(0,Number(s.tableStartIndex)||0)));
 const rows=visible.slice().reverse().map((x,i)=>`<tr><td>${visible.length-i}</td><td>${escapeFuchs(x.name)}</td><td>${(x.rawPins??x.pins)===12?'Kranz ('+x.pins+')':x.pins===0?'Gosse':x.pins}</td><td class="${x.delta>=0?'fox-plus':'fox-minus'}">${x.delta>0?'+':''}${x.delta}</td><td><strong>${x.score}</strong></td></tr>`).join('');
 const actions=s.active?`<div class="fox-actions">${Array.from({length:9},(_,i)=>`<button class="btn" type="button" onclick="applyFuchsjagdThrow(${i+1})">${i+1}</button>`).join('')}<button class="btn fox-special fox-gosse" type="button" onclick="applyFuchsjagdThrow(0)">💀 Gosse</button><button class="btn fox-special" type="button" onclick="applyFuchsjagdThrow(12)">🎳 Kranz</button><button class="secondary-btn fox-undo" type="button" onclick="undoFuchsjagdThrow()" ${s.throws.length?'':'disabled'}>↩ Rückgängig</button></div>`:'';
 el.innerHTML=`<div class="fox-layout"><div class="fox-top"><div class="fox-stat"><small>🦊 Fuchs</small><strong>${escapeFuchs(s.fox||'Noch keiner')}</strong></div><div class="fox-stat fox-score"><small>Aktueller Vorsprung</small><strong>${s.score} Holz</strong></div><div class="fox-stat"><small>Am Wurf</small><strong>${escapeFuchs(turn)}</strong></div></div>${s.active?`<div class="fox-turn">${escapeFuchs(phase)} · ${s.phase==='hunt'?`Jäger ${s.hunterIndex+1} von ${s.hunters.length}`:`${s.hunters.length} Jäger insgesamt`}</div>`:''}${s.result?`<div class="fox-result">🏁 ${escapeFuchs(s.result)}</div>`:''}${actions}${progress}<div class="fox-table-wrap"><table class="fox-table"><thead><tr><th>#</th><th>Werfer</th><th>Holz</th><th>+/−</th><th>Vorsprung</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Noch keine Würfe</td></tr>'}</tbody></table></div></div>`;
}
function escapeFuchs(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.fuchsjagd={id:'fuchsjagd',title:'Fuchsjagd',ready:true};
