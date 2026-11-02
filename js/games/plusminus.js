function createPlusminusState() {
  return {
    active: false,
    finished: false,
    playerOrder: [],
    currentPlayerIndex: 0,
    currentThrowIndex: 0,
    selectedSlot: 0,
    rows: {},
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
  plusminusState.finished = false;
  plusminusState.currentPlayerIndex = 0;
  plusminusState.currentThrowIndex = 0;
  plusminusState.selectedSlot=0;
  plusminusState.startedAt = new Date().toISOString();
  plusminusState.rows = {};
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
  plusminusState.busy=true;
  try{
    const kind=isGosse?'gosse':pins===9?'9er':pins===12?'kranz':null;
    if(kind&&!(await bookSoloSpecialThrow(player.name,pins,kind)))return;
    row[slot]={value:pins,isGosse:!!isGosse};plusminusState.rows[player.name]=row;
    let i=plusminusState.currentPlayerIndex+1;
    if(i>=players.length)i=0;
    let hops=0;
    while(hops<players.length&&(plusminusState.rows[players[i].name]||[]).every(Boolean)) {i=(i+1)%players.length;hops++;}
    const completed=players.every(p=>(plusminusState.rows[p.name]||[]).every(Boolean));
    plusminusState.currentPlayerIndex=i;
    if(completed){finishPlusminusGame();return;}
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

function resolvePlusminusValue(slotIndex, slot, partialBefore, smart) {
  if (!slot) return null;
  if (!slot.isGosse) return parseInt(slot.value || 0, 10) || 0;
  if (!smart) return [0, 0, 9, 0, 9][slotIndex];
  if (slotIndex === 0 || slotIndex === 1) return 0;
  if (slotIndex === 2) return 9;
  if (slotIndex === 3) return partialBefore < 0 ? 9 : 0;
  if (slotIndex === 4) return partialBefore < 0 ? 1 : 9;
  return 0;
}

function computePlusminusResult(row, smart = false) {
  const steps = [];
  let a = resolvePlusminusValue(0, row[0], 0, smart);
  let b = resolvePlusminusValue(1, row[1], a, smart);
  if (a === null || b === null) return { complete: false, result: null, display: '—' };
  let value = a + b;
  steps.push(`${a} + ${b} = ${value}`);
  let c = resolvePlusminusValue(2, row[2], value, smart);
  if (c === null) return { complete: false, result: null, display: '—' };
  value = value - c;
  steps.push(`− ${c} = ${value}`);
  let d = resolvePlusminusValue(3, row[3], value, smart);
  if (d === null) return { complete: false, result: null, display: '—' };
  value = value * d;
  steps.push(`× ${d} = ${value}`);
  let e = resolvePlusminusValue(4, row[4], value, smart);
  if (e === null) return { complete: false, result: null, display: '—' };
  value = e === 0 ? 0 : value / e;
  steps.push(`÷ ${e} = ${value}`);
  return { complete: true, result: value, display: String(value), steps };
}

function finishPlusminusGame() {
  const players = getPlusminusPlayers();
  plusminusState.active = false;
  plusminusState.customOrder = !!plusminusState.restoreCustomOrder;
  plusminusState.finished = true;
  const results = players.map(player => ({
    name: player.name,
    ...computePlusminusResult(plusminusState.rows[player.name] || [], plusminusState.smartGosse)
  })).sort((a, b) => (b.result ?? -Infinity) - (a.result ?? -Infinity));
  const entry = {
    id: 'plusminus_' + Date.now(),
    type: 'plusminus',
    createdAt: new Date().toISOString(),
    smartGosse: !!plusminusState.smartGosse,
    rows: JSON.parse(JSON.stringify(plusminusState.rows)),
    results
  };
  plusminusState.history.unshift(entry);
  renderPlusminusGame();
  persistState();
  showToast('➕ Spiel abgeschlossen', 'success');
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
  if(!plusminusState.active){board.innerHTML='<div class="game-placeholder-card">Spieler nach Sitzordnung. Nach dem Start wählt der aktive Spieler sein gewünschtes Kästchen selbst.</div>';}
  else{
    const current=players[plusminusState.currentPlayerIndex];
    board.innerHTML=`<div class="game-throw-toolbar"><strong>🎳 ${current?.name||'—'} · Kästchen ${plusminusState.selectedSlot+1} wählen</strong>${[1,2,3,4,5,6,7,8,9,12].map(n=>`<button class="pinpad-btn" onclick="applyPlusminusThrow(${n},false)">${n===12?'Kranz':n}</button>`).join('')}<button class="pinpad-btn special" onclick="applyPlusminusThrow(0,true)">Gosse</button></div>
    <div class="game-compact-wrap"><table class="game-compact-table"><thead><tr><th>Spieler</th><th>① +</th><th>② −</th><th>③ ×</th><th>④ ÷</th><th>⑤</th><th>Ergebnis</th></tr></thead><tbody>
    ${players.map((p,i)=>{const row=plusminusState.rows[p.name]||Array(5).fill(null);const result=computePlusminusResult(row,plusminusState.smartGosse);return `<tr class="${i===plusminusState.currentPlayerIndex?'current':''}"><td>${p.name}</td>${row.map((slot,j)=>`<td><button class="game-slot ${slot?'filled':''} ${i===plusminusState.currentPlayerIndex&&j===plusminusState.selectedSlot?'selected':''}" onclick="${i===plusminusState.currentPlayerIndex?`choosePlusminusSlot(${j})`:''}" ${i!==plusminusState.currentPlayerIndex||slot?'disabled':''}>${slot?(slot.isGosse?'G':slot.value):'+'}</button></td>`).join('')}<td class="game-compact-score">${result.complete?Number(result.result.toFixed(2)).toLocaleString('de-DE'):'—'}</td></tr>`;}).join('')}
    </tbody></table></div><div class="game-compact-note">Jeder Spieler hat fünf Würfe, die er auf seine freien Kästchen verteilt. Berechnung immer von links nach rechts.</div>`;
  }
  history.innerHTML=(plusminusState.history||[]).map(entry=>`<div class="spiel-card"><div class="spiel-info"><strong>➕ Spiel abgeschlossen</strong><div class="spiel-detail">${(entry.results||[]).map((x,i)=>`${i+1}. ${x.name}: ${x.display}`).join(' · ')}</div></div></div>`).join('')||'<div class="game-compact-note">Noch kein Verlauf.</div>';
}
