/* V105: Sitzordnung für alle Einzelspiele */
const SOLO_GAME_IDS = ['lotterie','tiberius','mensch','plusminus','sichern','haushoch','haustief'];
function seatingActiveNames() {return getActivePlayersForSoloGame().map(p => p.name);}
function getGlobalSeatOrder() {
  const active = seatingActiveNames();
  // Tischumlauf: Platz 1 unten links -> 8 oben links -> 9 oben rechts -> 16 unten rechts.
  const seated = Array.isArray(seatingOrder) ? seatingOrder.slice(0,16).filter(name => name && active.includes(name)) : [];
  return [...new Set([...seated, ...active])];
}
function getSoloState(id) {return ({lotterie:lotterieState,tiberius:tiberiusState,mensch:menschState,plusminus:plusminusState,sichern:sichernState,haushoch:haushochState,haustief:haustiefState})[id];}
function getSoloNames(id) {
  const active = seatingActiveNames(), state = getSoloState(id);
  if(typeof gameSetupNames==='function'&&!state?.active)return gameSetupNames(id);
  const custom = state && state.customOrder && Array.isArray(state.playerOrder) ? state.playerOrder : [];
  const preferred = custom.length ? custom : getGlobalSeatOrder();
  return [...new Set([...preferred.filter(name => active.includes(name)),...active])];
}
function moveSoloName(id,index,delta) {
  const state=getSoloState(id); if(!state||!state.customOrder)return;
  const arr=getSoloNames(id), target=index+delta;
  if(target<0||target>=arr.length)return;
  [arr[index],arr[target]]=[arr[target],arr[index]];
  state.playerOrder=arr; persistState();renderAll();
}
function toggleSoloOrderOverride(id) {
  const state=getSoloState(id);if(!state)return;
  const checked=!!document.getElementById(id+'-custom-order')?.checked;
  if(checked&&!state.customOrder)state.playerOrder=getGlobalSeatOrder();
  state.customOrder=checked;
  persistState();renderAll();
}
function renderSoloOrderSettings(id) {
  if(typeof gameSetupMarkup==='function'){const box=document.getElementById(id+'-order-editor');if(box){const hidden=gameSetupLocked(id);box.hidden=hidden;box.classList.toggle('hidden',hidden);box.innerHTML=hidden?'':gameSetupMarkup(id);}return;}
  const state=getSoloState(id),check=document.getElementById(id+'-custom-order'),editor=document.getElementById(id+'-order-editor');
  if(!state||!editor)return;
  if(check)check.checked=!!state.customOrder;
  editor.classList.toggle('hidden',!state.customOrder||!!state.active);
  if(!state.customOrder||state.active)return;
  const names=getSoloNames(id);
  editor.innerHTML='<div class="game-order-editor-title">Abweichende Reihenfolge</div><div class="game-order-list">'+names.map((name,i)=>
    `<div class="game-order-item"><div class="game-order-item-name">${i+1}. ${name.replaceAll('&','&amp;').replaceAll('<','&lt;')}</div><div class="game-order-actions"><button class="order-move-btn" onclick="moveSoloName('${id}',${i},-1)">↑</button><button class="order-move-btn" onclick="moveSoloName('${id}',${i},1)">↓</button></div></div>`).join('')+'</div>';
}
function renderSeatingOrder() {
  const left=document.getElementById('seating-left'),right=document.getElementById('seating-right');
  if(!left||!right)return;
  const t2=document.getElementById('seating-t2-name'),t1=document.getElementById('seating-t1-name');
  if(t2)t2.textContent=getGroupLabel('T2');if(t1)t1.textContent=getGroupLabel('T1');
  if(!Array.isArray(seatingOrder))seatingOrder=Array(16).fill('');
  const button=(n)=>{const name=seatingOrder[n-1]||'frei';return `<button class="seating-chair ${name==='frei'?'':'occupied'}" onclick="chooseSeat(${n})"><strong>${n}</strong><span>${name.replaceAll('&','&amp;').replaceAll('<','&lt;')}</span></button>`;};
  left.innerHTML=Array.from({length:8},(_,i)=>button(8-i)).join('');
  right.innerHTML=Array.from({length:8},(_,i)=>button(9+i)).join('');
}
// Aenderungen unabhaengig vom gesamten Club-Spielstand publizieren.
let seatingLiveWriteQueue = Promise.resolve();
function publishSeatingLive() {
  if (!ACTIVE_CLUB || !navigator.onLine || !window.firestoreApi?.saveSeatingLive) return;
  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  const payload = {
    seatingOrder: [...seatingOrder],
    groupSettings: JSON.parse(JSON.stringify(groupSettings)),
    updatedClientAt: Date.now(),
    updatedClientId: typeof CLIENT_ID !== 'undefined' ? CLIENT_ID : ''
  };
  seatingLiveWriteQueue = seatingLiveWriteQueue.catch(() => {}).then(() =>
    window.firestoreApi.saveSeatingLive(clubId, payload)
  ).catch(e => console.error('Sitzordnung-Live-Speicherung fehlgeschlagen:', e));
}
let seatingEditPlace=0;

// Platz 1–8 = T2 (links), Platz 9–16 = T1 (rechts).
function getSeatTeam(place) {
  return place <= 8 ? 'T2' : 'T1';
}

function availablePeopleForSeat(place) {
  const team = getSeatTeam(place);
  const currentName = seatingOrder[place - 1] || '';
  return persons
    .filter(p => p.present && !p.left && !p.inactive && !p.isDrinksOnly)
    .filter(p => normalizeTisch(p.tisch) === team)
    .filter(p => {
      const existing = seatingOrder.indexOf(p.name);
      // Der bereits auf diesem Stuhl sitzende Spieler bleibt zur Bearbeitung auswählbar.
      return existing === -1 || (existing === place - 1 && p.name === currentName);
    })
    .sort((a,b) => a.name.localeCompare(b.name, 'de'));
}

let seatingSelectedName = '';
function chooseSeat(number) {
  if (!Number.isInteger(number) || number < 1 || number > 16) return;
  seatingEditPlace = number;
  const teamName = getGroupLabel(getSeatTeam(number));
  const title = document.getElementById('seating-choice-title');
  if (title) title.textContent = `🪑 Platz ${number} (${teamName}) belegen`;
  const info = document.getElementById('seating-choice-info');
  if (info) info.textContent = `Nur anwesende Spieler aus ${teamName}, die noch keinen anderen Sitzplatz belegen.`;
  seatingSelectedName = seatingOrder[number - 1] || '';
  const grid = document.getElementById('seating-choice-grid');
  if (!grid) return;
  const people = availablePeopleForSeat(number);
  const escapeText = v => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  grid.innerHTML = '';
  people.forEach(person => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-penalty-person-btn' + (person.name === seatingSelectedName ? ' selected' : '');
    btn.innerHTML = getAvatarHtml(person.name).replace(/class="person-avatar[^"]*"/, 'class="quick-penalty-avatar"') + `<span>${escapeText(person.name)}</span>`;
    btn.onclick = () => {
      seatingSelectedName = person.name;
      grid.querySelectorAll('button').forEach(el => el.classList.toggle('selected', el === btn));
    };
    grid.appendChild(btn);
  });
  if (!people.length && info) info.textContent = `Für ${teamName} ist kein weiterer freier Spieler verfügbar. Du kannst den Platz leeren.`;
  document.getElementById('seating-choice-modal')?.classList.remove('hidden');
}
function clearSeatChoiceSelection() {
  seatingSelectedName = '';
  document.querySelectorAll('#seating-choice-grid button').forEach(el => el.classList.remove('selected'));
}
function closeSeatChoice() {
  document.getElementById('seating-choice-modal')?.classList.add('hidden');
  seatingEditPlace = 0;
  seatingSelectedName = '';
}
function confirmSeatChoice() {
  if (!seatingEditPlace) return;
  const name = seatingSelectedName;
  if (name && !availablePeopleForSeat(seatingEditPlace).some(p => p.name === name)) {
    showToast('Spieler ist bereits gesetzt oder gehört zur anderen Gruppe', 'error');
    chooseSeat(seatingEditPlace);
    return;
  }
  seatingOrder[seatingEditPlace - 1] = name;
  closeSeatChoice();
  persistState();
  publishSeatingLive();
  renderAll();
}
function randomizeSeatingOrder(){
 if(!confirm('Anwesende Kegler zufällig auf die Plätze ihrer Teams verteilen? Die bisherige Sitzordnung wird ersetzt.'))return;
 const next=Array(16).fill('');
 for(const [team,start] of [['T2',0],['T1',8]]){
  const names=persons.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly&&normalizeTisch(p.tisch)===team).map(p=>p.name);
  for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  names.slice(0,8).forEach((name,i)=>next[start+i]=name);
  if(names.length>8)showToast('Mehr als 8 Spieler in '+getGroupLabel(team)+': Nicht alle haben Platz','error');
 }
 seatingOrder=next;persistState();publishSeatingLive();renderAll();showToast('🎲 Sitzordnung zufällig verteilt','success');
}
function clearSeatingOrder() {
  if(!confirm('Alle 16 Sitzplätze leeren?'))return;
  seatingOrder=Array(16).fill('');persistState();publishSeatingLive();renderAll();
}
function shouldDrawSoloStart(id) {return !!document.getElementById(id+'-random-starter')?.checked;}
function prepareSoloStarter(id, callback) {
  const players=getSoloNames(id);
  if(!players.length){showToast('Keine aktiven Kegler vorhanden','error');return;}
  if(!shouldDrawSoloStart(id)){callback(players[0]);return;}
  openSoloStartDraw({title:'🎲 Startspieler',subtitle:'Wer beginnt?',players,onConfirm:callback});
}
let soloPinPenaltyBusy=false;
async function bookSoloSpecialThrow(name,pins,kind) {
  if(!['gosse','9er','kranz'].includes(kind))return true;
  if(soloPinPenaltyBusy)return false;
  const key=getPenaltyKeyByType(kind);
  if(!key){showToast('Strafenart '+kind+' nicht angelegt','error');return false;}
  const punished=kind==='gosse'?[name]:getActivePlayersForSoloGame().filter(p=>p.name!==name).map(p=>p.name);
  if(!punished.length)return true;
  soloPinPenaltyBusy=true;
  try {
    const changes=punished.map(personName=>({personName,category:'strafen',key,delta:1}));
    const result=await changeMultipleSyncedPersonCounters(changes);
    if(!result)return false;
    addPenaltyStatsEntry(kind,name,punished);
    return true;
  }finally{soloPinPenaltyBusy=false;}
}


// V108: Gegenbuchungen fuer korrigierte Solospiel-Wuerfe.
function getSoloThrowPenalty(name, value, isGosse) {
  const kind = isGosse || value === 0 ? 'gosse' : value === 9 ? '9er' : value === 12 ? 'kranz' : null;
  if (!kind) return null;
  const key = getPenaltyKeyByType(kind);
  if (!key) return { kind, key: null, punished: [] };
  const punished = kind === 'gosse' ? [name] : getActivePlayersForSoloGame().filter(p => p.name !== name).map(p => p.name);
  return { kind, key, punished };
}
function removeOneSoloStatsEntry(name, kind) {
  if (!Array.isArray(penaltyStatsLog)) return;
  const index = penaltyStatsLog.findIndex(x => x.thrower === name && normalizePenaltyStatsType(x.type) === normalizePenaltyStatsType(kind));
  if (index >= 0) penaltyStatsLog.splice(index, 1);
}
async function changeSoloThrowPenalty(name, oldThrow, newThrow) {
  // Beim Korrigieren alle Straf-Deltas in EINEM synchronisierten Schreibvorgang buchen.
  const oldValue = oldThrow ? Number(oldThrow.pins ?? oldThrow.value) : null;
  const newValue = newThrow ? Number(newThrow.pins ?? newThrow.value) : null;
  const oldPenalty = oldThrow ? getSoloThrowPenalty(name, oldValue, !!oldThrow.isGosse) : null;
  const newPenalty = newThrow ? getSoloThrowPenalty(name, newValue, !!newThrow.isGosse) : null;
  if (newPenalty && !newPenalty.key) { showToast('Strafenart nicht vorhanden: '+newPenalty.kind,'error'); return false; }
  if (oldPenalty && !oldPenalty.key) { showToast('Alte Strafenart nicht mehr vorhanden: '+oldPenalty.kind,'error'); return false; }
  const deltas = new Map();
  const add = (penalty, amount) => {
    if (!penalty?.key) return;
    for (const personName of penalty.punished) {
      const id = JSON.stringify([personName,penalty.key]);
      deltas.set(id,(deltas.get(id)||0)+amount);
    }
  };
  add(oldPenalty,-1); add(newPenalty,1);
  const changes = [...deltas.entries()].filter(([,delta])=>delta!==0).map(([id,delta])=>{
    const [personName,key]=JSON.parse(id);
    return {personName,category:'strafen',key,delta};
  });
  if (changes.length && !(await changeMultipleSyncedPersonCounters(changes))) return false;
  if (oldPenalty?.kind) removeOneSoloStatsEntry(name,oldPenalty.kind);
  if (newPenalty?.kind) addPenaltyStatsEntry(newPenalty.kind,name,newPenalty.punished);
  return true;
}
