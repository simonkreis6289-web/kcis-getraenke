/* KC Invaliden Schwadron – Sichern V127. Spielstand im Club-Firestore-State. */
function createSichernState(){return {active:false,finished:false,mode:'solo',target:69,order:[],teams:{},teamTurns:{},teamTurnVersion:2,secured:{},open:{},currentIndex:0,turnThrows:[],throwHistory:[],undo:[],winner:'',ranking:[],message:'',startedAt:''};}
function migrateSichernTeamTurns(state,teams){
  state.teamTurns={...(state.teamTurns||{})};
  for(const [key,players] of Object.entries(teams||{})){
    if(!players.length)continue;
    const last=(state.throwHistory||[]).slice().reverse().find(entry=>!entry.saved&&entry.key===key&&players.includes(entry.name));
    state.teamTurns[key]=last?(players.indexOf(last.name)+1)%players.length:Math.max(0,Math.trunc(Number(state.teamTurns[key])||0))%players.length;
  }
  state.teamTurnVersion=2;
}
function ensureSichernState(){
  if(!sichernState||typeof sichernState!=='object')sichernState=createSichernState();
  for(const k of ['order','turnThrows','throwHistory','undo','ranking'])if(!Array.isArray(sichernState[k]))sichernState[k]=[];
  for(const k of ['teams','teamTurns','secured','open'])if(!sichernState[k]||typeof sichernState[k]!=='object')sichernState[k]={};
  if(sichernState.mode==='team'&&sichernState.teamTurnVersion!==2){
    migrateSichernTeamTurns(sichernState,sichernState.teams);
    for(const step of sichernState.undo)if(step?.before&&step.before.teamTurnVersion!==2)migrateSichernTeamTurns(step.before,sichernState.teams);
  }
  if(sichernState.mode!=='team')sichernState.teamTurnVersion=2;
}
function sichernEscape(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function sichernOrderedPlayers(){
  const active=getActivePlayersForSoloGame();
  const byName=new Map(active.map(p=>[p.name,p]));
  const preferred=(typeof getSoloNames==='function'?getSoloNames('sichern'):active.map(p=>p.name));
  const ordered=preferred.map(name=>byName.get(name)).filter(Boolean);
  const missing=active.filter(p=>!ordered.some(x=>x.name===p.name));
  return [...ordered,...missing];
}
function getSichernTeamPlayers(teamKey){
  if(typeof gameSetupTeamMap==='function')return (sichernState?.active?sichernState.teams:gameSetupTeamMap('sichern'))[teamKey]||[];
  const active=sichernOrderedPlayers();
  const activeNames=new Set(active.map(p=>p.name));
  const fallback=active.filter(p=>normalizeTisch?.(p.tisch)===teamKey).map(p=>p.name);
  const seats=(Array.isArray(seatingOrder)?seatingOrder:[])
    .map((name,idx)=>({name,place:idx+1}))
    .filter(x=>x.name&&activeNames.has(x.name))
    .filter(x=>teamKey==='T1'?x.place>=9:x.place<=8)
    .map(x=>x.name);
  const merged=[...new Set([...seats,...fallback])];
  return merged;
}
function sichernCurrent(){ensureSichernState();return sichernState.order[sichernState.currentIndex]||'';}
function sichernTeamLabel(key){return key==='T1'?getGroupLabel('T1'):key==='T2'?getGroupLabel('T2'):key;}
function sichernThrower(){const s=sichernState,k=sichernCurrent();if(s.mode==='solo')return k;const players=s.teams[k]||[];return players[((Number(s.teamTurns[k])||0)%players.length)]||'';}
function startSichernGame(){
  const mode=document.getElementById('sichern-mode')?.value==='team'?'team':'solo';
  const target=Math.max(1,Math.min(999,parseInt(document.getElementById('sichern-target')?.value,10)||69));
  const players=sichernOrderedPlayers();
  if(players.length<2){showToast('Mindestens zwei anwesende Kegler erforderlich','error');return;}
  let order=[],teams={};
  if(mode==='team'){
    if(typeof gameSetupCheckGroups==='function'&&!gameSetupCheckGroups('sichern'))return;
    teams=typeof gameSetupTeamMap==='function'?gameSetupTeamMap('sichern'):{T1:getSichernTeamPlayers('T1'),T2:getSichernTeamPlayers('T2')};
    if(!teams.T1.length||!teams.T2.length){showToast('Für Teamspiel müssen beide Teams besetzt sein','error');return;}
    order=['T1','T2'];
  }else{
    order=players.map(p=>p.name);
  }
  sichernState={...createSichernState(),active:true,mode,target,order,teams,startedAt:new Date().toISOString()};
  for(const key of order){sichernState.secured[key]=0;sichernState.open[key]=0;sichernState.teamTurns[key]=0;}
  if(typeof dashboardActiveGame!=='undefined')dashboardActiveGame='sichern';
  renderSichernGame();persistState();
}
function sichernSnapshot(){const s=sichernState;return {secured:{...s.secured},open:{...s.open},teamTurns:{...s.teamTurns},teamTurnVersion:s.teamTurnVersion,currentIndex:s.currentIndex,turnThrows:s.turnThrows.slice(),throwHistory:s.throwHistory.slice(),finished:s.finished,active:s.active,winner:s.winner,ranking:Array.isArray(s.ranking)?s.ranking.slice():[],message:s.message};}
function sichernAdvance(){const s=sichernState;s.turnThrows=[];s.currentIndex=(s.currentIndex+1)%s.order.length;}
async function sichernThrow(pins){
  ensureSichernState();const s=sichernState;if(!s.active||s.busy)return;
  pins=Number(pins);if(!Number.isInteger(pins)||pins<0||pins>12)return;
  const key=sichernCurrent(),name=sichernThrower();if(!name)return;
  const scored=pins===12&&window.KCKranzUI?await KCKranzUI.select('sichern'):pins;if(scored===null)return;
  s.busy=true;
  try{
    if(typeof changeSoloThrowPenalty==='function'){
      if(!(await changeSoloThrowPenalty(name,null,{pins,isGosse:pins===0})))return;
    }
    s.undo.push({before:sichernSnapshot(),name,pins});
    const rawPins=pins;pins=scored;
    // Jeder gebuchte Wurf verbraucht genau einen Platz in der Teamreihenfolge.
    // Beim Sichern/Teamwechsel bleibt der nächste Spieler vorgemerkt.
    if(s.mode==='team')s.teamTurns[key]=((Number(s.teamTurns[key])||0)+1)%s.teams[key].length;
    const fail=pins===0||pins===5;
    if(fail){
      s.open[key]=0;
      s.throwHistory.push({name,key,pins,rawPins,failed:true,total:s.secured[key],at:new Date().toISOString()});
      sichernAdvance();
    }else{
      s.open[key]=(Number(s.open[key])||0)+pins;
      s.turnThrows.push({name,pins});
      const total=(Number(s.secured[key])||0)+(Number(s.open[key])||0);
      s.throwHistory.push({name,key,pins,rawPins,failed:false,total,at:new Date().toISOString()});
      if(total>=s.target){
        // Der letzte Wurf muss auch bei einer fehlgeschlagenen Strafbuchung erhalten bleiben.
        persistState();
        const completed=await finishSichernGame(key);
        if(!completed){renderSichernGame();showToast('Ziel erreicht, Abschluss noch offen. Über „Spiel abschließen“ erneut versuchen.','error');}
        return;
      }
    }
    renderSichernGame();persistState();
  }catch(e){console.error('Sichern-Wurf',e);showToast('Wurf konnte nicht gespeichert werden','error');}
  finally{s.busy=false;}
}
function sichernSave(){
  ensureSichernState();const s=sichernState;if(!s.active||s.busy||!s.turnThrows.length){showToast('Erst mindestens einen gültigen Wurf machen','error');return;}
  const key=sichernCurrent();
  s.undo.push({before:sichernSnapshot(),saved:true});
  s.secured[key]=(Number(s.secured[key])||0)+(Number(s.open[key])||0);
  s.open[key]=0;
  s.throwHistory.push({name:s.mode==='team'?sichernTeamLabel(key):key,key,saved:true,total:s.secured[key],at:new Date().toISOString()});
  sichernAdvance();renderSichernGame();persistState();
}
async function finishSichernGame(winner){
  const s=sichernState;if(!s.active||s.finished||s.closing)return false;s.closing=true;
  try{
    let changes=[],ranking=[];
    if(s.mode==='team'){
      const loser=s.order.find(k=>k!==winner);
      const penaltyKey=getFirstLoserStrafeKey();
      if(!penaltyKey){showToast('1. Verlierer-Strafe fehlt','error');return false;}
      changes=(s.teams[loser]||[]).map(personName=>({personName,category:'strafen',key:penaltyKey,delta:1}));
      ranking=[{rank:1,names:s.teams[loser]||[],score:(s.secured[loser]||0)+(s.open[loser]||0)}];
    } else {
      const scores=Object.fromEntries(s.order.map(k=>[k,(Number(s.secured[k])||0)+(Number(s.open[k])||0)]));
      const groups=getMenschLoserGroups(winner,scores,s.order.map(name=>({name})));
      ranking=groups.map((g,i)=>({...g,rank:i+1}));
      for(const g of ranking.slice(0,3)){
        const penaltyKey=getLoserPenaltyKeyByRank(g.rank);
        if(!penaltyKey){showToast(g.rank+'. Verlierer-Strafe fehlt','error');return false;}
        for(const personName of g.names)changes.push({personName,category:'strafen',key:penaltyKey,delta:1});
      }
    }
    if(changes.length&&!(await changeMultipleSyncedPersonCounters(changes,'🔒 Sichern abgeschlossen')))return false;
    s.winner=winner;s.ranking=ranking;s.message=(s.mode==='team'?sichernTeamLabel(winner):winner)+' gewinnt!';s.finished=true;s.active=false;
    if(typeof recordCompletedGame==='function')recordCompletedGame('sichern',s);
    // Abschlussergebnis vor dem Rendering speichern, damit eine fremde Renderfunktion
    // den Abschluss nicht blockieren kann.
    persistState();
    try{renderAll();}catch(renderError){console.error('Sichern: Abschlussanzeige',renderError);renderSichernGame();}
    showToast('🔒 '+s.message,'success');return true;
  }catch(error){
    console.error('Sichern: Abschluss fehlgeschlagen',error);
    showToast('Abschluss nicht möglich. Spielstand bleibt erhalten.','error');
    return false;
  }finally{s.closing=false;}
}
async function undoSichernThrow(){
  ensureSichernState();const s=sichernState;if(!s.active||s.busy||!s.undo.length)return;
  const step=s.undo[s.undo.length-1];s.busy=true;
  try{
    if(step.name&&typeof changeSoloThrowPenalty==='function'){
      if(!(await changeSoloThrowPenalty(step.name,{pins:step.pins,isGosse:step.pins===0},null)))return;
    }
    s.undo.pop();Object.assign(s,step.before);renderSichernGame();persistState();
  }finally{s.busy=false;}
}
function renderSichernGame(){
  if(typeof renderCommonGameSetups==='function')renderCommonGameSetups();
  const board=document.getElementById('sichern-board');if(!board)return;ensureSichernState();const s=sichernState;
  const setup=document.getElementById('sichern-start-card');if(setup)setup.classList.toggle('hidden',s.active);
  const mode=document.getElementById('sichern-mode');if(mode){const hint=document.getElementById('sichern-team-hint');if(hint)hint.textContent=mode.value==='team'?'Teams folgen der Sitzordnung. Nach jedem Wurf ist der Nächste im Team dran. Nach dem Sichern spielt das andere Team; die Spielerreihenfolge bleibt vorgemerkt.':'Die Reihenfolge folgt der Sitzordnung bzw. Spielerreihenfolge.';}
  const teamName=k=>s.mode==='team'?sichernTeamLabel(k):k;
  const cards=(s.order||[]).map(k=>{const secured=Number(s.secured[k])||0,open=Number(s.open[k])||0,total=secured+open;return `<div class="sichern-card ${s.active&&k===sichernCurrent()?'sichern-current':''}"><div class="sichern-card-top"><strong>${sichernEscape(teamName(k))}</strong><b>${total} / ${s.target}</b></div><div class="sichern-stat-row"><span>🔒 Gesichert</span><span>${secured}</span></div><div class="sichern-stat-row"><span>📦 Offen</span><span>+${open}</span></div><div class="sichern-progress"><i style="width:${Math.min(100,total/s.target*100)}%"></i></div>${s.mode==='team'?`<small>${(s.teams[k]||[]).map(sichernEscape).join(' · ')}</small>`:''}</div>`;}).join('');
  const needsFinish=s.active&&s.order.some(k=>(Number(s.secured[k])||0)+(Number(s.open[k])||0)>=s.target);
  const controls=s.active?`<div class="sichern-controls"><div class="sichern-turnline"><b>🎳 ${sichernEscape(sichernThrower())}</b><span>am Wurf · ${sichernEscape(teamName(sichernCurrent()))}</span></div><div class="sichern-buttons"><button class="pinpad-btn special gosse" type="button" onclick="sichernThrow(0)">Gosse</button>${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pinpad-btn" type="button" onclick="sichernThrow(${n})">${n}</button>`).join('')}<button class="pinpad-btn special kranz" type="button" onclick="sichernThrow(12)">Kranz</button><button class="primary-btn" type="button" onclick="sichernSave()">🔒 Sichern</button><button class="secondary-btn" type="button" onclick="undoSichernThrow()">↩ Rückgängig</button></div>${needsFinish?`<button type="button" class="primary-btn" style="margin-top:10px" onclick="finishSichernGame(sichernState.order.find(k=>(Number(sichernState.secured[k])||0)+(Number(sichernState.open[k])||0)>=sichernState.target))">🏁 Spiel abschließen</button>`:``}<div class="sichern-help">${s.mode==='team'?'Nach jedem Wurf wechselt der Spieler im Team. Beim Sichern wechselt das Team und setzt später beim nächsten Spieler fort. ':''}Bei <b>Gosse</b> oder <b>5</b> fällt der offene Stand auf den zuletzt gesicherten Wert zurück. <b>9er</b> und <b>Kranz</b> zählen strafmäßig wie in den anderen Spielen.</div></div>`:'';
  const rows=s.throwHistory.slice(-12).reverse().map(x=>`<tr><td>${sichernEscape(x.name)}</td><td>${x.saved?'🔒 gesichert':x.pins===0?'Gosse':(x.rawPins??x.pins)===12?'Kranz ('+x.pins+')':x.pins}</td><td>${x.failed?'❌ Rückfall':x.saved?'✓':x.total}</td></tr>`).join('');
  board.innerHTML=`${s.finished?`<div class="sichern-win">🏆 ${sichernEscape(s.message)}${s.ranking.length?`<small>${s.ranking.map(g=>g.rank+'. Verlierer: '+g.names.join(', ')).join(' · ')}</small>`:''}</div>`:''}${!s.order.length?'<div class="game-placeholder-card">Modus und Ziel wählen, dann Spiel starten.</div>':`<div class="sichern-grid">${cards}</div>`}${controls}${s.order.length?`<div class="sichern-history"><strong>Wurfverlauf</strong><table><thead><tr><th>Spieler</th><th>Wurf</th><th>Stand</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Noch keine Würfe</td></tr>'}</tbody></table></div>`:''}`;
}
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.sichern={id:'sichern',title:'Sichern',ready:true};
