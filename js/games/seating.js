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
  const custom = state && (state.active || state.customOrder) && Array.isArray(state.playerOrder) ? state.playerOrder : [];
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
// The combined screen keeps the physical seating and default table groups in one atomic snapshot.
let seatPlanSelectedName='',seatPlanSelectedPlace=0,seatPlanScope='';
function seatPlanPeople(){return persons.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly);}
function seatPlanSnapshot(){
  const people=seatPlanPeople(),teams=new Map(people.map(p=>[p.name,normalizeTisch(p.tisch)]));
  const seen=new Set();const seats=Array.from({length:16},(_,i)=>{const name=seatingOrder?.[i]||'';if(!teams.has(name)||seen.has(name))return '';seen.add(name);return name;});
  return {seats,teams};
}
function seatPlanScopeCheck(){
 const scope=String(typeof ACTIVE_CLUB==='undefined'?'':ACTIVE_CLUB)+'|'+String(typeof currentEveningStartedAt==='undefined'?'':currentEveningStartedAt||'');
 if(scope!==seatPlanScope){seatPlanScope=scope;seatPlanSelectedName='';seatPlanSelectedPlace=0;}
}
function seatPlanSelected(snapshot=seatPlanSnapshot()){
 const name=seatPlanSelectedName||snapshot.seats[seatPlanSelectedPlace-1]||'';
 return snapshot.teams.has(name)?name:'';
}
function seatPlanCancel(){seatPlanSelectedName='';seatPlanSelectedPlace=0;renderSeatingOrder();}
function seatPlanCommit(next,message){
 if(window.KCSharedSync&&(!KCSharedSync.ready||KCSharedSync.inUnit||KCSharedSync.working)){showToast('Sitzordnung kann gerade nicht gespeichert werden','error');return false;}
 // All person status and seating changes enter the same shared-sync/outbox write.
 for(const p of seatPlanPeople())if(next.teams.has(p.name))p.tisch=next.teams.get(p.name);
 seatingOrder=next.seats.slice();
 seatPlanSelectedName='';seatPlanSelectedPlace=0;
 persistState();if(!window.KCSharedSync)publishSeatingLive();renderAll();
 if(message)showToast(message,'success');return true;
}
function seatPlanPlace(snapshot,name,place){
 if(!snapshot.teams.has(name)||!Number.isInteger(place)||place<1||place>16)return false;
 const dest=place-1,source=snapshot.seats.indexOf(name),other=snapshot.seats[dest];
 if(source===dest)return false;
 if(source>=0){snapshot.seats[source]=other;if(snapshot.teams.has(other))snapshot.teams.set(other,getSeatTeam(source+1));}
 // An unseated player may replace an occupied seat; the displaced player stays in the group and returns to the pool.
 snapshot.seats[dest]=name;snapshot.teams.set(name,getSeatTeam(place));
 return true;
}
function seatPlanMoveGroup(snapshot,name,team){
 if(!snapshot.teams.has(name)||!['T1','T2',''].includes(team))return false;
 const old=snapshot.teams.get(name),seat=snapshot.seats.indexOf(name);
 if(old===team&&(seat<0||getSeatTeam(seat+1)===team))return false;
 snapshot.teams.set(name,team);
 if(seat>=0&&getSeatTeam(seat+1)!==team){
  snapshot.seats[seat]='';
  const free=team?snapshot.seats.findIndex((n,i)=>!n&&getSeatTeam(i+1)===team):-1;
  if(free>=0)snapshot.seats[free]=name;
 }
 return true;
}
function seatPlanPickPerson(name){
 seatPlanScopeCheck();const snapshot=seatPlanSnapshot();if(!snapshot.teams.has(name))return;
 if(seatPlanSelectedPlace){const place=seatPlanSelectedPlace;if(seatPlanPlace(snapshot,name,place))seatPlanCommit(snapshot);else seatPlanCancel();return;}
 seatPlanSelectedName=seatPlanSelectedName===name?'':name;renderSeatingOrder();
}
function seatPlanPickPlace(place){
 seatPlanScopeCheck();const snapshot=seatPlanSnapshot(),name=seatPlanSelected(snapshot);
 if(name){if(seatPlanPlace(snapshot,name,place))seatPlanCommit(snapshot);else seatPlanCancel();return;}
 seatPlanSelectedPlace=seatPlanSelectedPlace===place?0:place;seatPlanSelectedName='';renderSeatingOrder();
}
function seatPlanAssignGroup(team){
 const snapshot=seatPlanSnapshot(),name=seatPlanSelected(snapshot);
 if(name&&seatPlanMoveGroup(snapshot,name,team))seatPlanCommit(snapshot);else seatPlanCancel();
}
function seatPlanClearOne(){
 const snapshot=seatPlanSnapshot(),name=seatPlanSelected(snapshot),index=snapshot.seats.indexOf(name);
 if(name&&index>=0){snapshot.seats[index]='';seatPlanCommit(snapshot);}else seatPlanCancel();
}
function seatPlanShuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function seatPlanAllocateUnassigned(snapshot){
 const pending=seatPlanShuffle([...snapshot.teams.keys()].filter(n=>!snapshot.teams.get(n)));
 const count=t=>[...snapshot.teams.values()].filter(v=>v===t).length;
 for(const name of pending)seatPlanMoveGroup(snapshot,name,count('T1')<=count('T2')?'T1':'T2');
 return pending.length;
}
function seatPlanRandomGroups(){
 const snapshot=seatPlanSnapshot();
 if(!seatPlanAllocateUnassigned(snapshot)){showToast('Alle Anwesenden sind bereits zugewiesen','success');return;}
 seatPlanCommit(snapshot,'🎲 Gruppen zufällig verteilt');
}
function seatPlanBalance(){
 const snapshot=seatPlanSnapshot(),teams=t=>[...snapshot.teams.keys()].filter(n=>snapshot.teams.get(n)===t);
 const a=teams('T1'),b=teams('T2'),difference=Math.abs(a.length-b.length);
 if(difference<=1){showToast('⚖️ Gruppen sind bestmöglich ausgeglichen','success');return;}
 const source=a.length>b.length?'T1':'T2',target=source==='T1'?'T2':'T1';
 for(const name of seatPlanShuffle(teams(source)).slice(0,Math.floor(difference/2)))seatPlanMoveGroup(snapshot,name,target);
 seatPlanCommit(snapshot,'⚖️ Gruppen ausgeglichen');
}
function renderSeatingOrder() {
 const left=document.getElementById('seating-left'),right=document.getElementById('seating-right');
 if(!left||!right)return;
 seatPlanScopeCheck();
 if(!Array.isArray(seatingOrder))seatingOrder=Array(16).fill('');
 const snapshot=seatPlanSnapshot(),pool=document.getElementById('seat-plan-pool');
 if(!pool){ // Older embedded views retain the original seat chooser.
  const button=n=>{const el=document.createElement('button');el.className='seating-chair';el.textContent=n+' · '+(snapshot.seats[n-1]||'frei');el.onclick=()=>chooseSeat(n);return el;};
  left.replaceChildren(...Array.from({length:8},(_,i)=>button(8-i)));right.replaceChildren(...Array.from({length:8},(_,i)=>button(9+i)));return;
 }
 const text=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
 const selected=seatPlanSelected(snapshot),selectedSeat=selected?snapshot.seats.indexOf(selected)+1:seatPlanSelectedPlace;
 if(seatPlanSelectedName&&!snapshot.teams.has(seatPlanSelectedName))seatPlanSelectedName='';
 for(const team of ['T1','T2']){
  const suffix=team.toLowerCase(),count=[...snapshot.teams.values()].filter(v=>v===team).length;
  text('seating-'+suffix+'-name',getGroupLabel(team));text('seat-plan-'+suffix+'-count',count+' Kegler');
  text('seat-plan-group-'+suffix,getGroupLabel(team));
 }
 const nameText=name=>{const person=persons.find(p=>p.name===name);return person?.gameAlias||name;};
 const avatar=name=>{const el=document.createElement('span');el.className='seat-plan-avatar';el.innerHTML=getAvatarHtml(name);return el;};
 const label=value=>{const el=document.createElement('span');el.className='seat-plan-name';el.textContent=value;return el;};
 const button=n=>{
  const name=snapshot.seats[n-1],el=document.createElement('button');el.type='button';el.className='seating-chair'+(name?' occupied':'')+(n===selectedSeat?' seat-selected':'');
  el.setAttribute('aria-pressed',String(n===selectedSeat));el.setAttribute('aria-label','Platz '+n+': '+(name||'frei'));
  const number=document.createElement('strong');number.textContent=n;el.append(number);
  if(name)el.append(avatar(name),label(nameText(name)));else el.append(label('Frei'));
  el.onclick=()=>seatPlanPickPlace(n);return el;
 };
 left.replaceChildren(...Array.from({length:8},(_,i)=>button(8-i)));right.replaceChildren(...Array.from({length:8},(_,i)=>button(9+i)));
 pool.replaceChildren();
 const people=seatPlanPeople().slice().sort((a,b)=>a.name.localeCompare(b.name,'de'));
 for(const person of people){
  const name=person.name,place=snapshot.seats.indexOf(name)+1,team=snapshot.teams.get(name),el=document.createElement('button');
  el.type='button';el.className='seat-pool-person'+(place?' is-seated':'')+(name===selected?' seat-selected':'')+(team?' team-'+team.toLowerCase():'');
  el.setAttribute('aria-pressed',String(name===selected));el.setAttribute('aria-label',name+(place?' · Platz '+place:' · ohne Sitzplatz'));
  const info=document.createElement('small');info.textContent=place?'✓ Platz '+place:team?(groupSettings[team]?.name||team):'Ohne Gruppe';
  el.append(avatar(name),label(nameText(name)),info);el.onclick=()=>seatPlanPickPerson(name);pool.append(el);
 }
 if(!people.length)pool.textContent='Noch keine anwesenden Kegler.';
 const seated=people.filter(p=>snapshot.seats.includes(p.name)).length;
 text('seat-plan-progress',seated+' / '+people.length+' sitzen');
 text('seat-plan-selection',selected?nameText(selected)+' ausgewählt · Zielplatz oder Gruppe wählen':selectedSeat?'Platz '+selectedSeat+' ausgewählt · Spieler wählen':'Spieler oder Platz auswählen');
 for(const id of ['seat-plan-group-t1','seat-plan-group-t2','seat-plan-group-none','seat-plan-clear-one','seat-plan-cancel']){const el=document.getElementById(id);if(el)el.disabled=id==='seat-plan-cancel'?!selected&&!selectedSeat:id==='seat-plan-clear-one'?!selected||!snapshot.seats.includes(selected):!selected;}
}
// Aenderungen unabhaengig vom gesamten Club-Spielstand publizieren.
let seatingLiveWriteQueue = Promise.resolve();
function publishSeatingLive() {
  if(window.KCSharedSync){persistState();return;}
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
 const combined=!!document.getElementById('seat-plan-pool');
 if(!confirm(combined?'Anwesende zufällig platzieren? Bereits zugewiesene Gruppen bleiben erhalten. Freie Kegler werden automatisch aufgeteilt.':'Anwesende Kegler zufällig auf die Plätze ihrer Teams verteilen? Die bisherige Sitzordnung wird ersetzt.'))return;
 if(combined){
  const snapshot=seatPlanSnapshot();seatPlanAllocateUnassigned(snapshot);snapshot.seats=Array(16).fill('');
  for(const [team,start] of [['T2',0],['T1',8]]){
   const names=seatPlanShuffle([...snapshot.teams.keys()].filter(name=>snapshot.teams.get(name)===team));
   names.slice(0,8).forEach((name,i)=>snapshot.seats[start+i]=name);
   if(names.length>8)showToast('Mehr als 8 Spieler in '+getGroupLabel(team)+': Nicht alle haben Platz','error');
  }
  seatPlanCommit(snapshot,'🎲 Sitzordnung zufällig verteilt');return;
 }
 const next=Array(16).fill('');
 for(const [team,start] of [['T2',0],['T1',8]]){
  const names=seatPlanShuffle(persons.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly&&normalizeTisch(p.tisch)===team).map(p=>p.name));
  names.slice(0,8).forEach((name,i)=>next[start+i]=name);
  if(names.length>8)showToast('Mehr als 8 Spieler in '+getGroupLabel(team)+': Nicht alle haben Platz','error');
 }
 seatingOrder=next;persistState();publishSeatingLive();renderAll();showToast('🎲 Sitzordnung zufällig verteilt','success');
}
function clearSeatingOrder() {
  if(!confirm('Alle 16 Sitzplätze leeren?'))return;
  if(document.getElementById('seat-plan-pool')){const snapshot=seatPlanSnapshot();snapshot.seats=Array(16).fill('');seatPlanCommit(snapshot);return;}
 seatingOrder=Array(16).fill('');persistState();publishSeatingLive();renderAll();
}
function shouldDrawSoloStart(id) {return !!document.getElementById(id+'-random-starter')?.checked;}
function prepareSoloStarter(id, callback, forceDraw=false) {
  const players=getSoloNames(id);
  if(!players.length){showToast('Keine aktiven Kegler vorhanden','error');return;}
  if(!forceDraw&&!shouldDrawSoloStart(id)){callback(players[0]);return;}
  openSoloStartDraw({title:'🎲 Startspieler',subtitle:'Wer beginnt?',players,onConfirm:callback});
}
let soloPinPenaltyBusy=false;
async function bookSoloSpecialThrow(name,pins,kind) {
  if(!['gosse','9er','kranz','durchgeworfen'].includes(kind))return true;
  if(soloPinPenaltyBusy)return false;
  const key=getPenaltyKeyByType(kind);
  if(!key){showToast('Strafenart '+kind+' nicht angelegt','error');return false;}
  const punished=kind==='gosse'?[name]:getActivePlayersForSoloGame().filter(p=>p.name!==name).map(p=>p.name);
  if(!punished.length){addPenaltyStatsEntry(kind,name,[]);return true;}
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
function getSoloThrowPenalty(name, value, isGosse, physicalThrow=null) {
  const kind = window.KCThrows ? KCThrows.penalty(physicalThrow||KCThrows.physical(value,isGosse?'gosse':undefined)) : isGosse || value === 0 ? 'gosse' : value === 9 ? '9er' : value === 12 ? 'kranz' : null;
  if (!kind) return null;
  const key = getPenaltyKeyByType(kind);
  if (!key) return { kind, key: null, punished: [] };
  const punished = kind === 'gosse' ? [name] : getActivePlayersForSoloGame().filter(p => p.name !== name).map(p => p.name);
  return { kind, key, punished };
}
function removeOneSoloStatsEntry(name, kind, statId) {
  if (!Array.isArray(penaltyStatsLog)) return;
  const index = penaltyStatsLog.findIndex(x => statId?x.id===statId:x.thrower===name&&(!x.eveningStartedAt||x.eveningStartedAt===currentEveningStartedAt)&&normalizePenaltyStatsType(x.type)===normalizePenaltyStatsType(kind));
  if (index >= 0) penaltyStatsLog.splice(index, 1);
}
async function changeSoloThrowPenalty(name, oldThrow, newThrow, finishPenalties=[]) {
  // Beim Korrigieren alle Straf-Deltas in EINEM synchronisierten Schreibvorgang buchen.
  const oldValue = oldThrow ? Number(oldThrow.rawPins ?? oldThrow.pins ?? oldThrow.value) : null;
  const newValue = newThrow ? Number(newThrow.rawPins ?? newThrow.pins ?? newThrow.value) : null;
  const oldPenalty = oldThrow ? oldThrow.penaltyBooking || getSoloThrowPenalty(name, oldValue, !!oldThrow.isGosse,oldThrow.physicalThrow) : null;
  if(newThrow&&window.KCThrows&&!newThrow.physicalThrow)newThrow.physicalThrow=KCThrows.physical(newValue,newThrow.kind||(newThrow.isGosse?'gosse':undefined));
  const newPenalty = newThrow ? getSoloThrowPenalty(name, newValue, !!newThrow.isGosse,newThrow.physicalThrow) : null;
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
  for(const charge of finishPenalties){
    if(!charge.key){showToast('Verlierer-Strafart fehlt','error');return false;}
    add({key:charge.key,punished:[charge.personName]},-Number(charge.delta||1));
  }
  const changes = [...deltas.entries()].filter(([,delta])=>delta!==0).map(([id,delta])=>{
    const [personName,key]=JSON.parse(id);
    return {personName,category:'strafen',key,delta};
  });
  if (changes.length && !(await changeMultipleSyncedPersonCounters(changes,'',{reverse:changes.every(change=>change.delta<0)}))) return false;
  if (oldPenalty?.kind) removeOneSoloStatsEntry(name,oldPenalty.kind,oldPenalty.statId);
  if (newPenalty?.kind) {
    const stat=addPenaltyStatsEntry(newPenalty.kind,name,newPenalty.punished);
    newThrow.penaltyBooking={...newPenalty,statId:stat?.id||null};
  }
  return true;
}
