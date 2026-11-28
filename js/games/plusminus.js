function createPlusminusState() {
  return {
    active: false,
    finished: false,
    playerOrder: [],
    currentPlayerIndex: 0,
    currentThrowIndex: 0,
    selectedSlot: 0,
    rows: {},
    undoStack: [],
    editTarget: null,
    smartGosse: false,
    history: [],
    startedAt: ''
  };
}

function ensurePlusminusState() {
  if (!plusminusState) plusminusState = createPlusminusState();
  if (!Array.isArray(plusminusState.playerOrder)) plusminusState.playerOrder = [];
  if (!plusminusState.rows || typeof plusminusState.rows !== 'object') plusminusState.rows = {};
  if (!Array.isArray(plusminusState.history)) plusminusState.history = [];
  if (!Array.isArray(plusminusState.undoStack)) plusminusState.undoStack = [];
  plusminusState.active = !!plusminusState.active;
  plusminusState.finished = !!plusminusState.finished;
  plusminusState.currentPlayerIndex = parseInt(plusminusState.currentPlayerIndex || 0, 10) || 0;
  plusminusState.currentThrowIndex = parseInt(plusminusState.currentThrowIndex || 0, 10) || 0;
  plusminusState.selectedSlot = parseInt(plusminusState.selectedSlot || 0,10)||0;
  plusminusState.smartGosse = !!plusminusState.smartGosse;
}

function getPlusminusPlayers() {
  const names=getSoloNames('plusminus');
  const active=getActivePlayersForSoloGame();
  return names.map(name=>active.find(p=>p.name===name)).filter(Boolean);
}

function movePlusminusOrder(index,delta) { moveSoloName('plusminus',index,delta); }

function resetPlusminusOrder() {
  plusminusState.playerOrder = getActivePlayersForSoloGame().map(p => p.name);
  renderPlusminusOrderEditor();
  persistState();
}

function renderPlusminusOrderEditor() { renderSoloOrderSettings('plusminus'); }

function togglePlusminusSmartGosse() {
  ensurePlusminusState();
  plusminusState.smartGosse = !!document.getElementById('plusminus-smart-gosse')?.checked;
  renderPlusminusGame();
  persistState();
}

function startPlusminusGame() {
  const players = getPlusminusPlayers();
  if (!players.length) {
    showToast('Keine anwesenden Spieler vorhanden', 'error');
    return;
  }
  ensurePlusminusState();
  plusminusState.playerOrder = getSoloNames('plusminus');
  plusminusState.restoreCustomOrder = !!plusminusState.customOrder;
  plusminusState.customOrder = true;
  plusminusState.active = true;
  dashboardActiveGame = "plusminus";
  plusminusState.finished = false;
  plusminusState.currentPlayerIndex = 0;
  plusminusState.currentThrowIndex = 0;
  plusminusState.selectedSlot=0;
  plusminusState.startedAt = new Date().toISOString();
  plusminusState.physicalRulesVersion=1;
  plusminusState.rows = {};
  plusminusState.undoStack = [];
  plusminusState.editTarget = null;
  players.forEach(player => {
    plusminusState.rows[player.name] = Array.from({ length: 5 }, () => null);
  });
  renderPlusminusGame();
  persistState();
}

async function applyPlusminusThrow(value,isGosse=false) {
  ensurePlusminusState();const players=getPlusminusPlayers();
  if(!plusminusState.active||!players.length||plusminusState.busy)return;
  const player=players[plusminusState.currentPlayerIndex];if(!player)return;
  const row=plusminusState.rows[player.name]||Array(5).fill(null);
  const slot=plusminusState.selectedSlot;
  if(slot<0||slot>4||row[slot]){showToast('Bitte ein freies Kästchen wählen','error');return;}
  const pins=Number(value);if(!Number.isInteger(pins)||pins<0||pins>12)return;
  const scored=pins===12&&window.KCKranzUI?await KCKranzUI.select('plusminus'):pins;if(scored===null)return;
  plusminusState.busy=true;
  try{
    const roll={value:pins,isGosse:!!isGosse,...(pins===12?{kranzValue:scored}:{})};
    if(!(await changeSoloThrowPenalty(player.name,null,roll)))return;
    plusminusState.undoStack.push({player:player.name,slot,oldIndex:plusminusState.currentPlayerIndex,oldSelectedSlot:plusminusState.selectedSlot});
    row[slot]=roll;plusminusState.rows[player.name]=row;
    let i=plusminusState.currentPlayerIndex+1;
    if(i>=players.length)i=0;
    let hops=0;
    while(hops<players.length&&(plusminusState.rows[players[i].name]||[]).every(Boolean)) {i=(i+1)%players.length;hops++;}
    const completed=players.every(p=>(plusminusState.rows[p.name]||[]).every(Boolean));
    plusminusState.currentPlayerIndex=i;
    if(completed){await finishPlusminusGame();return;}
    const next=plusminusState.rows[players[i].name]||[];
    plusminusState.selectedSlot=next.findIndex(x=>!x);
    renderPlusminusGame();persistState();
  }catch(error){console.error(error);showToast('Wurf fehlgeschlagen','error');}
  finally{plusminusState.busy=false;}
}
function choosePlusminusSlot(index){
  if(!plusminusState.active)return;
  const p=getPlusminusPlayers()[plusminusState.currentPlayerIndex];if(!p)return;
  if(plusminusState.rows[p.name]?.[index]){showToast('Dieses Kästchen ist bereits belegt','error');return;}
  plusminusState.selectedSlot=index;renderPlusminusGame();
}

async function undoPlusminusThrow() {
  ensurePlusminusState();
  if (plusminusState.busy || !plusminusState.undoStack.length) {showToast('Kein Wurf zum Rückgängigmachen vorhanden','error');return;}
  const last=plusminusState.undoStack[plusminusState.undoStack.length-1];
  const slot=plusminusState.rows[last.player]?.[last.slot];
  if(!slot)return;
  plusminusState.busy=true;
  try {
    if(!(await changeSoloThrowPenalty(last.player,slot,null,plusminusState.finished?(plusminusState.history[0]?.assigned||[]).map(x=>({personName:x.name,key:x.key,delta:1})):[])))return;
    if(plusminusState.finished){
      plusminusState.finished=false;
      plusminusState.active=true;
      plusminusState.customOrder=true;
      const removed=plusminusState.history.shift();
      if(Array.isArray(strafenHistory))strafenHistory=strafenHistory.filter(e=>e.id!==removed?.id);
    }
    plusminusState.rows[last.player][last.slot]=null;
    plusminusState.currentPlayerIndex=last.oldIndex;
    plusminusState.selectedSlot=last.oldSelectedSlot;
    plusminusState.undoStack.pop();
    plusminusState.busy=false;
    renderAll();persistState();showToast('↩ Letzter Wurf zurückgenommen','success');
  } catch(error) {console.error(error);showToast('Rücknahme fehlgeschlagen','error');}
  finally {plusminusState.busy=false;}
}

function openPlusminusSlotEdit(name, slotIndex) {
  if(plusminusState.busy)return;
  const old=plusminusState.rows?.[name]?.[slotIndex];
  if(!old){showToast('Kästchen ist noch leer','error');return;}
  plusminusState.editTarget={name,slotIndex};
  const modal=document.getElementById('plusminus-edit-modal');
  if(!modal)return;
  document.getElementById('plusminus-edit-sub').textContent=`${name} · Kästchen ${slotIndex+1} · bislang ${old.isGosse?'Gosse':old.value}`;
  modal.classList.remove('hidden');
}
function closePlusminusSlotEdit(){
  document.getElementById('plusminus-edit-modal')?.classList.add('hidden');
  plusminusState.editTarget=null;
}
async function confirmPlusminusSlotEdit(value,isGosse=false) {
  ensurePlusminusState();
  const target=plusminusState.editTarget;
  if(!target||plusminusState.busy)return;
  const old=plusminusState.rows?.[target.name]?.[target.slotIndex];
  if(!old)return;
  const updated={value:Number(value),isGosse:!!isGosse};
  if(updated.value===12&&window.KCKranzUI){const scored=await KCKranzUI.select('plusminus');if(scored===null)return;updated.kranzValue=scored;}
  if(old.value===updated.value&&old.kranzValue===updated.kranzValue&&!!old.isGosse===updated.isGosse){closePlusminusSlotEdit();return;}
  plusminusState.busy=true;
  try {
    const result=plusminusState.finished?plusminusState.history[0]:null;
    const correctedRows={...plusminusState.rows,[target.name]:plusminusState.rows[target.name].map((x,i)=>i===target.slotIndex?updated:x)};
    const assigned=result?plusminusAssigned(plusminusResults(correctedRows)):[];
    const rebook=result?[...(result.assigned||[]).map(x=>({personName:x.name,key:x.key,delta:1})),...assigned.map(x=>({personName:x.name,key:x.key,delta:-1}))]:[];
    if(!(await changeSoloThrowPenalty(target.name,old,updated,rebook)))return;
    if(result){const ranked=plusminusResults(correctedRows);result.winnerNames=ranked.filter(r=>plusminusScoreKey(r)===plusminusScoreKey(ranked[0])).map(r=>r.name);result.assigned=assigned;result.ranking=[1,2,3].map(rank=>({rank,names:assigned.filter(x=>x.rank===rank).map(x=>x.name)})).filter(x=>x.names.length);}
    plusminusState.rows[target.name][target.slotIndex]=updated;
    // Falls das bearbeitete Feld der letzte eingegebene Wurf war, auch
    // die Undo-Information erhalten; beim Rückgängigmachen gilt der neue Wert.
    if(plusminusState.finished&&plusminusState.history[0]?.type==='plusminus'){
      const players=getPlusminusPlayers();
      const entry=plusminusState.history[0];
      entry.rows=JSON.parse(JSON.stringify(plusminusState.rows));
      entry.results=players.map(player=>({name:player.name,...computePlusminusResult(plusminusState.rows[player.name]||[],plusminusState.smartGosse)}))
        .sort(plusminusCompare);
      const archived=strafenHistory.findIndex(e=>e.id===entry.id);if(archived>=0)strafenHistory[archived]=JSON.parse(JSON.stringify(entry));
    }
    closePlusminusSlotEdit();plusminusState.busy=false;renderAll();persistState();
    showToast('✅ Kästchen korrigiert','success');
  }catch(error){console.error(error);showToast('Korrektur fehlgeschlagen','error');}
  finally {plusminusState.busy=false;}
}

function resolvePlusminusValue(...args){return KCPlusminus.value(...args);}
function computePlusminusResult(...args){return KCPlusminus.compute(...args);}

function plusminusResults(rows=plusminusState.rows){
  return plusminusState.playerOrder.map(name=>({name,...computePlusminusResult(rows[name]||[],plusminusState.smartGosse)})).sort(plusminusCompare);
}
function plusminusScoreKey(x){return plusminusState.physicalRulesVersion&&x.gutter?'gosse':String(x.result);}
function plusminusCompare(a,b){return plusminusState.physicalRulesVersion&&!!a.gutter!==!!b.gutter?Number(!!a.gutter)-Number(!!b.gutter):(b.result??-Infinity)-(a.result??-Infinity);}
function plusminusAssigned(results){
 const best=plusminusScoreKey(results[0]||{}),losers=results.filter(x=>plusminusScoreKey(x)!==best).slice().sort((a,b)=>plusminusCompare(b,a)),groups=[];
 for(const x of losers){const k=plusminusScoreKey(x);let g=groups.find(g=>g.key===k);if(!g){g={key:k,names:[]};groups.push(g);}g.names.push(x.name);}
 return groups.slice(0,3).flatMap((g,i)=>g.names.map(name=>({name,rank:i+1,key:getLoserPenaltyKeyByRank(i+1)})));
}
async function finishPlusminusGame() {
  if(!plusminusState.active||plusminusState.finished||plusminusState.finishing)return;
  plusminusState.finishing=true;
  try{
  const players = getPlusminusPlayers();
  const results=plusminusResults();
  if(results.some(x=>!x.complete)){showToast('Zuerst alle Würfe eintragen','error');return false;}
  const assigned=plusminusAssigned(results);
  if(assigned.some(x=>!x.key)){showToast('Verlierer-Strafart fehlt','error');persistState();return false;}
  if(assigned.length&&!(await changeMultipleSyncedPersonCounters(assigned.map(x=>({personName:x.name,category:'strafen',key:x.key,delta:1}))))){persistState();return false;}
  plusminusState.active=false;plusminusState.finished=true;
  plusminusState.customOrder=!!plusminusState.restoreCustomOrder;
  const entry = {
    id: 'plusminus_' + Date.now(),
    type: 'plusminus',
    assigned,ranking:[1,2,3].map(rank=>({rank,names:assigned.filter(x=>x.rank===rank).map(x=>x.name)})).filter(x=>x.names.length),
      participants: players.map(p=>p.name),winnerNames: results.length&&results[0].result!=null?results.filter(r=>plusminusScoreKey(r)===plusminusScoreKey(results[0])).map(r=>r.name):[],
    createdAt: new Date().toISOString(),
    smartGosse: !!plusminusState.smartGosse,
    rows: JSON.parse(JSON.stringify(plusminusState.rows)),
    results
  };
  plusminusState.history.unshift(entry);
  if(!Array.isArray(strafenHistory))strafenHistory=[];strafenHistory.unshift(entry);
  renderPlusminusGame();
  persistState();
  showToast('➕ Spiel abgeschlossen und Verlierer gebucht', 'success');
  return true;
  }finally{plusminusState.finishing=false;}
}

function resetPlusminusGame() {
  if (!confirm('+ − × ÷ wirklich neu starten?')) return;
  plusminusState = createPlusminusState();
  renderPlusminusGame();
  persistState();
}

function renderPlusminusGame(){
  ensurePlusminusState();renderSoloOrderSettings('plusminus');
  const setup=document.getElementById('plusminus-start-card'),board=document.getElementById('plusminus-board'),history=document.getElementById('plusminus-history-list');
  const check=document.getElementById('plusminus-smart-gosse');if(check)check.checked=!!plusminusState.smartGosse;
  if(!setup||!board||!history)return;
  setup.classList.toggle('hidden',!!plusminusState.active);
  const players=getPlusminusPlayers();
  if(!plusminusState.active&&!plusminusState.finished){board.innerHTML='<div class="game-placeholder-card">Spieler nach Sitzordnung. Nach dem Start wählt der aktive Spieler sein gewünschtes Kästchen selbst.</div>';}
  else{
    const current=players[plusminusState.currentPlayerIndex];
    const rowPlayers=window.KCPlayerRows?.order(players,current?.name,{running:plusminusState.active&&!plusminusState.finished,unavailable:p=>plusminusState.rows[p.name]?.length===5&&plusminusState.rows[p.name].every(Boolean)})||players;
    board.innerHTML=`<div class="game-throw-toolbar"><strong>${plusminusState.finished?'🏁 Spiel beendet':'🎳 '+(current?.name||'—')+' · Kästchen '+(plusminusState.selectedSlot+1)+' wählen'}</strong><button class="secondary-btn" onclick="undoPlusminusThrow()" ${plusminusState.undoStack.length?'':'disabled'}>↩ Letzten Wurf</button>${plusminusState.active?`${[0,1,2,3,4,5,6,7,8,9,12].map(n=>`<button class="pinpad-btn" onclick="applyPlusminusThrow(${n},false)">${n===12?'Kranz':n}</button>`).join('')}<button class="pinpad-btn special" onclick="applyPlusminusThrow(0,true)">Gosse</button>`:''}</div>
    ${plusminusState.active&&players.every(p=>(plusminusState.rows[p.name]||[]).length===5&&(plusminusState.rows[p.name]||[]).every(Boolean))?'<button type="button" onclick="finishPlusminusGame()">Abschluss erneut buchen</button>':''}
    <div class="game-compact-wrap"><table class="game-compact-table plusminus-table"><thead><tr><th>Spieler</th>${['①','②','③','④','⑤'].map((label,j)=>`<th>${label}</th>${j<4?`<th class="pm-operator">${['+','−','×','÷'][j]}</th>`:''}`).join('')}<th>Ergebnis</th></tr></thead><tbody${globalThis.window?.KCPlayerRows?.group?.('plusminus',plusminusState,{turn:plusminusState.undoStack.length})||''}>
    ${rowPlayers.map(p=>{const row=plusminusState.rows[p.name]||Array(5).fill(null);const result=computePlusminusResult(row,plusminusState.smartGosse);return `<tr${globalThis.window?.KCPlayerRows?.row?.(p.name)||''}><td>${p.name}</td>${row.map((slot,j)=>`<td><button class="game-slot ${slot?'filled':''} ${p.name===current?.name&&j===plusminusState.selectedSlot?'selected':''}" onclick="${slot?`openPlusminusSlotEdit(${JSON.stringify(p.name)},${j})`:(plusminusState.active&&p.name===current?.name?`choosePlusminusSlot(${j})`:'')}" ${!slot&&(!plusminusState.active||p.name!==current?.name)?'disabled':''}>${slot?(slot.isGosse?'G':slot.kranzValue??slot.value):'—'}</button></td>${j<4?`<td class="pm-operator">${['+','−','×','÷'][j]}</td>`:''}`).join('')}<td class="game-compact-score">${result.complete?Number(result.result.toFixed(2)).toLocaleString('de-DE'):'—'}</td></tr>`;}).join('')}
    </tbody></table></div><div class="game-compact-note">Zum Korrigieren ein belegtes Kästchen antippen. Es zählt kein zusätzlicher Wurf. Die Strafbuchungen werden angepasst.</div>`;
  }
  history.innerHTML=(plusminusState.history||[]).map(entry=>`<div class="spiel-card"><div class="spiel-info"><strong>➕ Spiel abgeschlossen</strong><div class="spiel-detail">${(entry.results||[]).map((x,i)=>`${i+1}. ${x.name}: ${x.display}`).join(' · ')}</div></div></div>`).join('')||'<div class="game-compact-note">Noch kein Verlauf.</div>';
}
