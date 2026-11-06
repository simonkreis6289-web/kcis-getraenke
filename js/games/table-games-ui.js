/* Oberfläche für die beiden Spiele; die Spielzustände kommen aus Firestore-Transaktionen. */
const TABLE_GAME_KEYS=['blackjack','gluecksspirale'];
let tableDrafts={},tablePending={},tableBusy={},tableAssignment=null,tableRulesFocus=null;
function tableGameGet(key){return key==='blackjack'?blackjackState:gluecksspiraleState;}
function tableGameSet(key,state){if(key==='blackjack')blackjackState=state;else gluecksspiraleState=state;}
function createBlackjackState(){return KCTableGames.empty('blackjack');}
function createGluecksspiraleState(){return KCTableGames.empty('gluecksspirale');}
function ensureTableGames(){
  for(const key of TABLE_GAME_KEYS){const s=tableGameGet(key);if(!s||!Array.isArray(s.history)||(s.eveningStartedAt&&currentEveningStartedAt&&s.eveningStartedAt!==currentEveningStartedAt))tableGameSet(key,KCTableGames.empty(key));}
  for(const name of ['17 + 4 / Blackjack','Glücksspirale'])if(!SPIELE_KATALOG.includes(name))SPIELE_KATALOG.push(name);
}
function applyTableServerStates(state){
  if(!state)return;
  for(const key of TABLE_GAME_KEYS){
    const value=state[key+'State'];if(!value||!Array.isArray(value.history))continue;
    if(!currentEveningStartedAt&&value.eveningStartedAt)currentEveningStartedAt=value.eveningStartedAt;
    if(value.eveningStartedAt&&currentEveningStartedAt&&value.eveningStartedAt!==currentEveningStartedAt)continue;
    const local=tableGameGet(key);
    if(local?.eveningStartedAt===value.eveningStartedAt&&Number(value.revision)<Number(local.revision||0))continue;
    tableGameSet(key,JSON.parse(JSON.stringify(value)));
  }
  renderTableGames();
}
function tablePlayers(){
  const active=getActivePlayersForSoloGame(),order=typeof getGlobalSeatOrder==='function'?getGlobalSeatOrder():[];
  return [...new Set([...order,...active.map(p=>p.name)])].map(n=>active.find(p=>p.name===n)).filter(Boolean);
}
function tableDraft(key){
  const stamp=ACTIVE_CLUB+'|'+(currentEveningStartedAt||'');
  if(tableDrafts[key]?.stamp!==stamp)tableDrafts[key]={stamp,selected:tablePlayers().map(p=>p.name),teams:[],cards:false,target:50};
  return tableDrafts[key];
}
function tableToggle(key,index){
  if(tableBusy[key]||tablePending[key])return;
  const name=tablePlayers()[index]?.name;if(!name)return;
  const d=tableDraft(key);d.selected=d.selected.includes(name)?d.selected.filter(n=>n!==name):[...d.selected,name];d.teams=[];renderTableGame(key);
}
function tableMove(index,delta){
  const d=tableDraft('blackjack'),next=index+delta;if(tableBusy.blackjack||tablePending.blackjack||next<0||next>=d.selected.length)return;
  [d.selected[index],d.selected[next]]=[d.selected[next],d.selected[index]];renderTableGame('blackjack');
}
function tableDrawStarter(){
  if(tableBusy.blackjack||tablePending.blackjack)return;
  const d=tableDraft('blackjack');if(d.selected.length<2)return;
  const index=Math.floor(Math.random()*d.selected.length);d.selected=[...d.selected.slice(index),...d.selected.slice(0,index)];renderTableGame('blackjack');showToast('🎲 '+d.selected[0]+' beginnt','success');
}
function tableBuildPairs(random=false){
  const key='gluecksspirale';if(tableBusy[key]||tablePending[key])return;
  const d=tableDraft(key),names=d.selected.slice();
  if(names.length<4||names.length>16||names.length%2){showToast('Bitte eine gerade Anzahl von 4 bis 16 Keglern auswählen','error');return;}
  if(random)for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  d.teams=Array.from({length:names.length/2},(_,i)=>({players:names.slice(i*2,i*2+2)}));renderTableGame(key);
}
function tableOpenAssignment(team,index){
  if(tableBusy.gluecksspirale||tablePending.gluecksspirale)return;
  tableAssignment={team,index,choice:''};
  document.getElementById('table-assignment-title').textContent='Team '+(team+1)+' · Partner wählen';
  document.getElementById('table-assignment-grid').innerHTML=tableDraft('gluecksspirale').teams.flatMap(t=>t.players).map((n,i)=>'<button type="button" class="kc-avatar-option" onclick="tableChooseAssignment('+i+')">'+sixAvatar(n)+'</button>').join('');
  document.getElementById('table-assignment-modal').classList.remove('hidden');
}
function tableChooseAssignment(index){
  if(!tableAssignment)return;tableAssignment.choice=tableDraft('gluecksspirale').teams.flatMap(t=>t.players)[index]||'';
  [...document.querySelectorAll('#table-assignment-grid button')].forEach((b,i)=>b.classList.toggle('selected',i===index));
}
function tableConfirmAssignment(){
  const a=tableAssignment;if(!a?.choice){showToast('Bitte einen Partner auswählen','error');return;}
  const pairs=tableDraft('gluecksspirale').teams,target=pairs[a.team].players,old=target[a.index];
  for(const team of pairs){const i=team.players.indexOf(a.choice);if(i>=0)team.players[i]=old;}
  target[a.index]=a.choice;tableCloseAssignment();renderTableGame('gluecksspirale');
}
function tableCloseAssignment(){tableAssignment=null;document.getElementById('table-assignment-modal')?.classList.add('hidden');}
async function tableRun(key,action,fields={}){
  if(!TABLE_GAME_KEYS.includes(key)||tableBusy[key]||!ACTIVE_CLUB)return;
  if(!navigator.onLine||!window.firestoreApi?.transactTableGame){showToast('Zum Spielen bitte eine Verbindung herstellen','error');return;}
  const club=ACTIVE_CLUB,evening=currentEveningStartedAt||'';
  if(tablePending[key]?.club!==club)tablePending[key]=null;
  if(!tablePending[key])tablePending[key]={club,request:{action,...fields,gameKey:key,gameId:fields.gameId||tableGameGet(key).id,expectedRevision:Number(tableGameGet(key).revision)||0,opId:'table_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)),now:new Date().toISOString(),eveningStartedAt:evening,clubName:club}};
  const pending=tablePending[key];tableBusy[key]=true;renderTableGame(key);
  try{
    if(action==='start'&&typeof saveToFirestore==='function'&&!(await saveToFirestore(false)))throw Error('Teilnehmer konnten nicht synchronisiert werden');
    const result=await window.firestoreApi.transactTableGame(getClubFirestoreId(club),pending.request);
    if(ACTIVE_CLUB!==club||(currentEveningStartedAt&&currentEveningStartedAt!==result.eveningStartedAt))return;
    currentEveningStartedAt=result.eveningStartedAt;
    applyTableServerStates({[key+'State']:result.state});dashboardActiveGame=key;
    for(const item of result.counters||[])applyConfirmedLiveCounter(item.personName,item.category,item.key,item.value);
    penaltyStatsLog=[...(result.gameStats||[]),...(penaltyStatsLog||[]).filter(e=>!e.tableGameId)];
    tablePending[key]=null;persistState();try{renderAll();}catch(error){console.error(error);renderTableGames();}
    if(action==='finish')showToast('Spiel abgeschlossen – Verlierer-Strafen gebucht','success');
  }catch(error){console.error(key,error);if(ACTIVE_CLUB===club&&tablePending[key]){tablePending[key].error=error.message;showToast(error.message,'error');}}
  finally{tableBusy[key]=false;if(ACTIVE_CLUB!==club||(currentEveningStartedAt&&currentEveningStartedAt!==evening&&evening))tablePending[key]=null;renderTableGame(key);}
}
async function startTableGame(key){
  const d=tableDraft(key);
  return tableRun(key,'start',{gameId:'game_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)),players:d.selected,teams:d.teams,cards:d.cards,target:Number(d.target)});
}
function tableAction(key,action,fields={}){if(!tablePending[key])return tableRun(key,action,fields);}
function tableCard(value){return tableAction('blackjack','card',{value:value==='A'?'A':Number(value)});}
function tableReset(key){
  if(tableBusy[key]||tablePending[key])return;
  if(confirm('Neues Spiel vorbereiten? Bereits gebuchte Wurf- und Verliererstrafen bleiben erhalten.'))return tableRun(key,'reset');
}
function tableRetry(key){const p=tablePending[key];if(p)return tableRun(key,p.request.action);}
async function tableReload(key){
  if(tableBusy[key]||!ACTIVE_CLUB||!navigator.onLine)return;
  const club=ACTIVE_CLUB;tableBusy[key]=true;renderTableGame(key);
  try{
    const state=await window.firestoreApi.loadClubState(getClubFirestoreId(club));if(ACTIVE_CLUB!==club)return;
    const remote=state?.[key+'State'];
    if(tablePending[key]&&remote?.commands?.includes(tablePending[key].request.opId)){tableBusy[key]=false;await tableRetry(key);return;}
    tablePending[key]=null;
    if(state?.currentEveningStartedAt&&state.currentEveningStartedAt!==currentEveningStartedAt){await loadFromFirestore();return;}
    if(remote)applyTableServerStates(state);else tableGameSet(key,KCTableGames.empty(key));
    showToast('Serverstand übernommen. Nicht gespeicherte Aktion kann neu eingegeben werden.','success');
  }catch(error){showToast('Spielstand konnte nicht geladen werden: '+error.message,'error');}
  finally{tableBusy[key]=false;renderTableGame(key);}
}
function renderTableGames(){for(const key of TABLE_GAME_KEYS)renderTableGame(key);}
function renderTableGame(key){
  const setup=document.getElementById(key+'-start-card'),box=document.getElementById(key+'-board');if(!setup||!box)return;
  ensureTableGames();const s=tableGameGet(key),spiral=key==='gluecksspirale',draft=tableDraft(key),active=tablePlayers();
  if(tablePending[key]&&(tablePending[key].club!==ACTIVE_CLUB||(tablePending[key].request.eveningStartedAt&&currentEveningStartedAt&&tablePending[key].request.eveningStartedAt!==currentEveningStartedAt)))tablePending[key]=null;
  const pending=tablePending[key],blocked=tableBusy[key]||!!pending,disabled=blocked?'disabled':'';
  setup.classList.toggle('hidden',!!s.id);
  if(!s.id){
    const names=new Set(active.map(p=>p.name));draft.selected=draft.selected.filter(n=>names.has(n));
    if(draft.teams.some(t=>t.players.some(n=>!names.has(n))))draft.teams=[];
    const count=draft.selected.length,valid=count>=(spiral?4:2)&&count<=16&&(!spiral||count%2===0);
    let html='<h3>'+ (spiral?'Zweierteams bilden':'Kegler und Reihenfolge wählen')+'</h3><p>'+count+' ausgewählt'+(valid?'':' · Bitte '+(spiral?'4 bis 16 Kegler in gerader Anzahl':'2 bis 16 Kegler')+' wählen')+'</p><div class="kc-avatar-picker tg-player-grid">'+active.map((p,i)=>'<button type="button" class="kc-avatar-option '+(draft.selected.includes(p.name)?'selected':'')+'" aria-pressed="'+draft.selected.includes(p.name)+'" onclick="tableToggle(\''+key+'\','+i+')">'+sixAvatar(p.name)+'</button>').join('')+'</div>';
    if(spiral){
      html+='<div class="tg-actions"><button type="button" class="secondary-btn" onclick="tableBuildPairs()" '+(!valid?'disabled':'')+'>Teams bilden</button><button type="button" class="secondary-btn" onclick="tableBuildPairs(true)" '+(!valid?'disabled':'')+'>🎲 Teams auslosen</button></div><div class="tg-pairs">'+draft.teams.map((t,i)=>'<div class="tg-pair"><strong>Team '+(i+1)+'</strong>'+t.players.map((n,j)=>'<button type="button" class="kc-avatar-option" onclick="tableOpenAssignment('+i+','+j+')">'+sixAvatar(n)+'</button>').join('')+'</div>').join('')+'</div><label class="tg-setting">Ziel (Holz)<input type="number" id="gluecksspirale-target" min="10" max="1000" value="'+draft.target+'" onchange="tableDraft(\'gluecksspirale\').target=this.value"></label>';
    }else{
      html+='<div class="tg-order">'+draft.selected.map((n,i)=>'<div><span>'+(i+1)+'. '+tableEscape(n)+'</span><button type="button" class="secondary-btn" aria-label="Spieler nach oben" onclick="tableMove('+i+',-1)" '+(i===0?'disabled':'')+'>↑</button><button type="button" class="secondary-btn" aria-label="Spieler nach unten" onclick="tableMove('+i+',1)" '+(i===count-1?'disabled':'')+'>↓</button></div>').join('')+'</div><div class="tg-actions"><button type="button" class="secondary-btn" onclick="tableDrawStarter()" '+(!valid?'disabled':'')+'>🎲 Startspieler auslosen</button></div><label class="tg-setting"><input type="checkbox" id="blackjack-cards" '+(draft.cards?'checked':'')+' onchange="tableDraft(\'blackjack\').cards=this.checked"> Mit Startkarte (echte Skatkarte erfassen)</label>';
    }
    setup.innerHTML=html+'<button type="button" class="primary-btn" onclick="startTableGame(\''+key+'\')" '+(!valid||(spiral&&draft.teams.length<2)?'disabled':'')+'>🎳 '+(spiral?'Glücksspirale':'17 + 4')+' starten</button>';
    if(blocked)setup.querySelectorAll('button,input').forEach(e=>e.disabled=true);
  }
  let controls='';
  if(s.active&&!s.readyToFinish){
    if(!spiral&&s.cards&&!Object.hasOwn(s.cardValues,KCTableGames.currentName(s))){
      controls='<div class="tg-card-input"><strong>Startkarte für '+tableEscape(KCTableGames.currentName(s))+'</strong><p>Die Karte bleibt auf dem Dashboard bis zum Ende verdeckt.</p><div class="tg-actions">'+[['A','Ass (1/11)'],[2,'Bube (2)'],[3,'Dame (3)'],[4,'König (4)'],[7,'7'],[8,'8'],[9,'9'],[10,'10']].map(([value,label])=>'<button type="button" class="secondary-btn" '+disabled+' onclick="tableCard(\''+value+'\')">'+label+'</button>').join('')+'</div></div>';
    }else{
      if(!spiral){const name=KCTableGames.currentName(s);controls+='<div class="tg-private-score">Aktuell: <strong>'+KCTableGames.totals(s)[name]+' / 21</strong>'+(s.cards?' · Karte '+(s.cardValues[name]==='A'?'Ass':s.cardValues[name]):'')+'</div>';}
      controls+='<div class="tg-actions tg-pinpad">'+Array.from({length:9},(_,i)=>'<button type="button" class="pinpad-btn" '+disabled+' onclick="tableAction(\''+key+'\',\'throw\',{kind:\'pins\',pins:'+(i+1)+'})">'+(i+1)+'</button>').join('')+'<button type="button" class="secondary-btn" '+disabled+' onclick="tableAction(\''+key+'\',\'throw\',{kind:\'miss\'})">Vorbei</button><button type="button" class="secondary-btn" '+disabled+' onclick="tableAction(\''+key+'\',\'throw\',{kind:\'gosse\'})">Gosse</button><button type="button" class="secondary-btn" '+disabled+' onclick="tableAction(\''+key+'\',\'throw\',{kind:\'kranz\'})">Kranz (8 Holz)</button></div>'+(!spiral?'<button type="button" class="primary-btn" '+disabled+' onclick="tableAction(\'blackjack\',\'stand\')">✋ Stehen bleiben</button>':'');
    }
  }
  const error=pending?.error?'<div class="tg-error" role="alert">Aktion noch nicht bestätigt: '+tableEscape(pending.error)+'<div class="tg-actions"><button type="button" class="primary-btn" '+(tableBusy[key]?'disabled':'')+' onclick="tableRetry(\''+key+'\')">Erneut versuchen</button><button type="button" class="secondary-btn" '+(tableBusy[key]?'disabled':'')+' onclick="tableReload(\''+key+'\')">Serverstand laden</button></div></div>':'';
  box.innerHTML=renderTableGameBoard(s)+(tableBusy[key]?'<p role="status">⏳ Spielaktion wird gespeichert …</p>':'')+error+controls+(s.active?'<div class="tg-actions"><button type="button" class="secondary-btn" '+(blocked||!s.history.length?'disabled':'')+' onclick="tableAction(\''+key+'\',\'undo\')">↩ Letzte Aktion zurücknehmen</button>'+(s.readyToFinish?'<button type="button" class="primary-btn" '+disabled+' onclick="tableAction(\''+key+'\',\'finish\')">🏁 Abschließen und Verlierer buchen</button>':'')+'</div>':'')+(s.id?'<button type="button" class="secondary-btn" '+disabled+' onclick="tableReset(\''+key+'\')">'+(s.finished?'Neues Spiel vorbereiten':'Spiel abbrechen')+'</button>':'')+(s.history.length?'<details class="tg-history"><summary>Letzte Aktionen</summary>'+s.history.slice(-16).reverse().map(e=>'<div>'+tableEscape(e.name)+' · '+(e.action==='stand'?'Stehen geblieben':e.action==='card'?'Startkarte erfasst':e.kind==='gosse'?'Gosse':e.kind==='miss'?'Vorbei':e.kind==='kranz'?'Kranz (8 Holz)':e.pins+' Holz')+'</div>').join('')+'</details>':'');
}
function openSpiralRules(){tableRulesFocus=document.activeElement;document.getElementById('spiral-rules-modal').classList.remove('hidden');document.getElementById('spiral-rules-close').focus();}
function closeSpiralRules(){document.getElementById('spiral-rules-modal')?.classList.add('hidden');tableRulesFocus?.focus();}
document.addEventListener('keydown',event=>{
  const modal=document.getElementById('spiral-rules-modal');if(modal&&!modal.classList.contains('hidden')){
    if(event.key==='Escape'){event.preventDefault();closeSpiralRules();}
    if(event.key==='Tab'){const els=[...modal.querySelectorAll('button,a[href]')],first=els[0],last=els[els.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  }else if(event.key==='Escape')tableCloseAssignment();
});
