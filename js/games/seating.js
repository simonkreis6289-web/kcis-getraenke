/* V105: Sitzordnung für alle Einzelspiele */
const SOLO_GAME_IDS = ['lotterie','tiberius','mensch','plusminus'];
function seatingActiveNames() {return getActivePlayersForSoloGame().map(p => p.name);}
function getGlobalSeatOrder() {
  const active = seatingActiveNames();
  const seated = (seatingOrder || []).filter(name => name && active.includes(name));
  return [...new Set([...seated, ...active])];
}
function getSoloState(id) {return ({lotterie:lotterieState,tiberius:tiberiusState,mensch:menschState,plusminus:plusminusState})[id];}
function getSoloNames(id) {
  const active = seatingActiveNames(), state = getSoloState(id);
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
let seatingEditPlace=0;
function chooseSeat(number) {
  seatingEditPlace=number;
  const sel=document.getElementById('seating-choice-person');if(!sel)return;
  document.getElementById('seating-choice-title').textContent=`🪑 Platz ${number} belegen`;
  const people=persons.filter(p=>p.present&&!p.left&&!p.drinkOnly);
  sel.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Platz freilassen';sel.appendChild(empty);
  people.forEach(p=>{const option=document.createElement('option');option.value=p.name;option.textContent=p.name;sel.appendChild(option);});
  sel.value=seatingOrder[number-1]||'';
  document.getElementById('seating-choice-modal')?.classList.remove('hidden');
}
function closeSeatChoice(){document.getElementById('seating-choice-modal')?.classList.add('hidden');seatingEditPlace=0;}
function confirmSeatChoice() {
  if(!seatingEditPlace)return;
  const name=document.getElementById('seating-choice-person').value;
  if(name){
    const already=seatingOrder.indexOf(name);if(already!==-1)seatingOrder[already]='';
    const person=persons.find(p=>p.name===name);
    if(person)person.tisch=seatingEditPlace<=8?'T2':'T1';
  }
  seatingOrder[seatingEditPlace-1]=name;
  closeSeatChoice();persistState();renderAll();
}
function clearSeatingOrder() {
  if(!confirm('Alle 16 Sitzplätze leeren?'))return;
  seatingOrder=Array(16).fill('');persistState();renderAll();
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
