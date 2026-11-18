/* Gemeinsame App-Eingabe oberhalb des Spielstands. Bestehende Buchungswege bleiben erhalten. */
const gameInputBusy={};
const gameInputTeams={tannenbaum:'T1',darts:'T1'},gameInputPlaces={hoch:null,tief:null};
function giEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function gameInputButton(label,action,pin){return '<button type="button" '+(pin?'data-pin="'+pin+'" ':'')+'onclick="'+giEscape(action)+'">'+label+'</button>';}
function gameInputNumbers(action,kranz=12,kranzLabel=null){return Array.from({length:9},(_,i)=>gameInputButton(String(i+1),action(i+1,false),i+1)).join('')+gameInputButton('Gosse',action(0,true))+gameInputButton(kranzLabel||'Kranz'+(kranz===8?' (8 Holz)':''),action(kranz,false));}
function gameInputCurrentTeam(key){if(key==='tannenbaum'){ensureTannenbaumState();return tannenbaumState.currentTeam;}if(key==='darts'){ensureDartsState();return dartsState.currentTeam;}return gameInputTeams[key];}
function gameInputTeam(key,team){if(!['T1','T2'].includes(team)||gameInputBusy[key])return;gameInputTeams[key]=team;if(key==='tannenbaum'){ensureTannenbaumState();tannenbaumState.currentTeam=team;persistState();}if(key==='darts'){ensureDartsState();dartsState.currentTeam=team;persistState();}applyGameInputLayout(key);}
function gameInputPlace(mode,place){const s=ensureHausState(mode),name=s.playerOrder[s.currentPlayerIndex];if(!s.active||s.rows[name]?.[place])return;gameInputPlaces[mode]=place;applyGameInputLayout(hausId(mode));}
function gameInputTarget(){
 const s=lotterieState,names=getLotteriePlayers().map(p=>p.name),remaining=[];
 for(let col=0;col<(s.columns||[]).length;col++)for(const name of names)
  if(s.throws[name]?.[col]===null||s.throws[name]?.[col]===undefined)remaining.push({name,col});
 return remaining.length?remaining[(Math.max(0,Number(s.manualCursor)||0))%remaining.length]:null;
}

async function gameInputThrow(key,pins,gosse=false){
 const s=gameSetupState(key);if(!s?.active||s.busy||gameInputBusy[key])return;
 gameInputBusy[key]=true;applyGameInputLayout(key);
 try{return await dispatchGameInputThrow(key,pins,gosse);}
 finally{gameInputBusy[key]=false;applyGameInputLayout(key);}
}
function dispatchGameInputThrow(key,pins,gosse=false){
 const s=gameSetupState(key);
 if(key==='lotterie'){const target=gameInputTarget();if(!target)return;lotterieEdit={person:target.name,colIndex:target.col};return confirmLotterieThrow(pins);}
 if(key==='tiberius')return handleTiberiusThrow(pins);
 if(key==='haushoch'||key==='haustief'){const mode=key==='haushoch'?'hoch':'tief',name=s.playerOrder[s.currentPlayerIndex],free=(s.rows[name]||[]).map((v,i)=>v?null:i).filter(v=>v!==null),place=free.includes(gameInputPlaces[mode])?gameInputPlaces[mode]:free[0];return hausThrow(mode,pins,gosse,place);}
 const team=gameInputCurrentTeam(key);
 if(key==='tannenbaum'){
  tannenbaumThrowTeam=team;
  if(gosse||pins===9||pins===12)return openTannenbaumPenaltyPlayerModal(gosse?'gosse':pins===9?'9er':'kranz',team,pins===9?9:null);
  return handleTannenbaumThrow(pins);
 }
 if(key==='darts'){
  dartsThrowTeam=team;
  if(gosse||pins===9||pins===12)return openDartsPenaltyPlayerModal(gosse?'gosse':pins===9?'9er':'kranz',team,gosse?0:pins===9?s.valueMap[9]??9:s.valueMap.kranz??50);
  return handleDartsThrow(String(pins));
 }
}
function legacyGameInput(key){
 const s=gameSetupState(key);let context='',options='',numbers='';
 if(['tannenbaum','darts'].includes(key)){
  const team=gameInputCurrentTeam(key);context=giEscape(getGroupLabel(team));
  options='<div class="gi-options">'+['T1','T2'].map(t=>'<button type="button" aria-pressed="'+(t===team)+'" onclick="gameInputTeam(\''+key+'\',\''+t+'\')">'+giEscape(getGroupLabel(t))+'</button>').join('')+'</div>';
 }else if(key==='lotterie'){
  const target=gameInputTarget();if(!target)return '<p>'+(s.columns.length?'Alle Würfe erfasst – Lotterie abschließen.':'Spaltenbeträge festlegen, um Würfe einzutragen.')+'</p>';
  context=giEscape(target.name)+' · Spalte '+(target.col+1);
 }else if(key==='tiberius')context=giEscape(typeof tiberiusThrower==='function'?tiberiusFunnyName(tiberiusThrower()):'Tiberius')+' · '+Number(s.score||0)+' Punkte';
 else{
  const mode=key==='haushoch'?'hoch':'tief',name=s.playerOrder[s.currentPlayerIndex],row=s.rows[name]||[],free=row.map((v,i)=>v?null:i).filter(v=>v!==null);
  if(!free.length)return '';
  if(!free.includes(gameInputPlaces[mode]))gameInputPlaces[mode]=free[0];
  context=giEscape(name)+' · Stelle wählen';options='<div class="gi-options">'+['Hunderter','Zehner','Einer'].map((label,i)=>'<button type="button" '+(row[i]?'disabled':'')+' aria-pressed="'+(gameInputPlaces[mode]===i)+'" onclick="gameInputPlace(\''+mode+'\','+i+')">'+label+'</button>').join('')+'</div>';
 }
 numbers=gameInputNumbers((pins,gosse)=>'gameInputThrow(\''+key+'\','+pins+','+gosse+')',12,window.KCKranzUI?KCKranzUI.label(key,s):null);
 if(key==='darts')numbers+=gameInputButton('Durchgeworfen',"dartsThrowTeam=gameInputCurrentTeam('darts');openDartsPenaltyPlayerModal('durchgeworfen',dartsThrowTeam,0)");
 if(key==='tiberius')numbers+=gameInputButton('Durchgeworfen',"handleTiberiusThrow('durchgeworfen')");
 return '<div class="gi-turn"><span class="gi-turn-label">Am Wurf</span><strong>'+context+'</strong>'+(['tannenbaum','darts'].includes(key)?'<small>Teamwechsel automatisch nach jedem Wurf</small>':'')+'</div>'+options+'<div class="gi-source-pinpad">'+numbers+'</div>';
}
function buildGameThrowKeypad(buttons){
 const pad=document.createElement('div'),numbers=document.createElement('div'),specials=document.createElement('div'),extras=document.createElement('div');pad.className='game-pinpad';numbers.className='game-pinpad-numbers';specials.className='game-pinpad-specials';extras.className='game-pinpad-extras';const digits=new Map(),kinds=new Map();let miss=null;
 for(const button of buttons){const text=button.textContent.trim(),lower=text.toLocaleLowerCase('de'),match=(button.firstChild?.nodeType===3?button.firstChild.textContent.trim():text).match(/^(\d+)(?:er)?(?:\s|\/|$)/),pin=button.dataset.pin!==undefined?Number(button.dataset.pin):match?Number(match[1]):NaN;button.type='button';button.classList.add('gi-throw');
  if(/gosse|^g$/.test(lower)){kinds.set('gosse',button);continue;}if(/kranz/.test(lower)){kinds.set('kranz',button);continue;}if(/vorbei|fehlwurf/.test(lower)){miss=button;continue;}
  if(Number.isInteger(pin)&&pin>=0&&pin<=9){digits.set(pin,button);continue;}extras.append(button);
 }
 if(!digits.has(0)){const source=miss||kinds.get('gosse');if(source){const zero=miss||source.cloneNode(true);if(!miss)zero.onclick=source.onclick;zero.removeAttribute('id');digits.set(0,zero);}}
 for(const n of [1,2,3,4,5,6,7,8,9,0]){let button=digits.get(n);if(!button){button=document.createElement('button');button.type='button';button.disabled=true;button.className='gi-throw';}button.dataset.pin=String(n);button.classList.add('gi-throw');button.setAttribute('aria-label',n+' Holz');button.innerHTML='<span class="game-pin-circle" aria-hidden="true">'+n+'</span><span class="game-pin-caption">Holz</span>';numbers.append(button);}
 for(const kind of ['gosse','kranz']){let button=kinds.get(kind);if(!button){button=document.createElement('button');button.type='button';button.className='gi-throw';button.disabled=true;}const text=button.textContent,detail=text.match(/\([^)]*\)|\d+\s*Punkte/);button.dataset.throwKind=kind;button.setAttribute('aria-label',kind==='gosse'?'Gosse':'Kranz');button.innerHTML='<strong>'+(kind==='gosse'?'Gosse':'Kranz')+'</strong>'+(detail?'<small>'+giEscape(detail[0])+'</small>':'');specials.append(button);}
 pad.append(numbers,specials);if(extras.children.length)pad.append(extras);return pad;
}
function normalizeGameThrowDialog(modal,selector){
 if(!modal)return;const source=modal.querySelector(selector)||modal.querySelector('[data-phone-pad]');if(!source||source.querySelector(':scope > .game-pinpad'))return;const buttons=[...source.querySelectorAll('button')];if(!buttons.length)return;
 modal.classList.add('game-throw-dialog');const card=modal.querySelector('.modal,.haus-modal-card');if(card){card.classList.add('game-throw-dialog-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');}
 source.className='game-throw-dialog-pad';source.removeAttribute('style');source.dataset.phonePad='true';source.replaceChildren(buildGameThrowKeypad(buttons));
}
function installGameThrowDialogs(){
 const entries={hausOpenThrowModal:['haus-throw-modal','.haus-modal-grid'],openDartsThrowModal:['darts-throw-modal','#darts-number-grid'],openTannenbaumThrowModal:['tannenbaum-throw-modal','#tannenbaum-number-grid'],openLotterieThrowModal:['lotterie-throw-modal','#lotterie-number-grid'],openTiberiusThrowModal:['tiberius-throw-modal','#tiberius-number-grid'],openPlusminusSlotEdit:['plusminus-edit-modal','.pinpad-grid']};
 for(const [name,[id,selector]] of Object.entries(entries)){const original=globalThis[name];if(typeof original!=='function'||original.gameThrowDialog)continue;const wrapped=function(...args){const result=original.apply(this,args);normalizeGameThrowDialog(document.getElementById(id),selector);return result;};wrapped.gameThrowDialog=true;globalThis[name]=wrapped;}
}
function normalizeGamePinpad(card){
 const selectors=['.gi-source-pinpad button','.six-pinpad button','.tg-pinpad button','.ind-pinpad button','.game-throw-toolbar .pinpad-btn','.sichern-buttons button[onclick^="sichernThrow("]','.fox-actions button[onclick^="applyFuchsjagdThrow("]'];
 const buttons=[...card.querySelectorAll(selectors.join(','))];if(!buttons.length)return;card.append(buildGameThrowKeypad(buttons));for(const node of card.querySelectorAll('.gi-source-pinpad,.six-pinpad,.tg-pinpad,.ind-pinpad'))if(!node.children.length)node.remove();
}
async function cancelCurrentGame(key){
 const s=gameSetupState(key);if(!s?.active||!ACTIVE_CLUB)return;
 if(!confirm('Spiel abbrechen? Es werden keine Abschluss- oder Verliererbeträge gebucht. Bereits gebuchte Einzelstrafen bleiben erhalten.'))return;
 try{await window.firestoreApi.cancelGame(getClubFirestoreId(ACTIVE_CLUB),{gameKey:key});renderAll();persistState();showToast('Spiel abgebrochen · keine Abschlussbuchung.','success');}
 catch(error){showToast('Abbruch nicht gespeichert: '+error.message,'error');}
}
const gameDashboardBusy=new Set();
async function showGameOnDashboard(key){
 if(gameDashboardBusy.has(key)||!ACTIVE_CLUB||!window.KCGameOverview?.catalog.some(g=>g.key===key))return false;
 const s=gameSetupState(key);if(!s||!s.active&&!s.finished&&!s.id&&!s.startedAt&&!s.history?.length)return false;
 if((!navigator.onLine&&!window.KCTabletSync?.directConnected)||!window.firestoreApi?.setDashboardGameOverview){showToast('Zum Anzeigen auf dem Dashboard bitte verbinden.','error');return false;}
 const club=ACTIVE_CLUB;gameDashboardBusy.add(key);applyGameInputLayout(key);
 try{
  const state=window.KCSharedSync?.server||getFirestoreState();
  await window.firestoreApi.setDashboardGameOverview(getClubFirestoreId(club),{open:false,gameKey:key,expectedRevision:Number(state.dashboardGameOverview?.revision)||0,opId:'overview_'+crypto.randomUUID()});
  if(ACTIVE_CLUB!==club)return false;showToast('Spiel wird auf dem Dashboard angezeigt.','success');return true;
 }catch(error){if(ACTIVE_CLUB===club)showToast(error.message||'Dashboard konnte nicht umgeschaltet werden.','error');return false;}
 finally{gameDashboardBusy.delete(key);if(ACTIVE_CLUB===club)applyGameInputLayout(key);}
}
const GAME_NEXT_SERVER=new Set(['blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend']);
async function gameNextThrower(key){
 const s=gameSetupState(key);if(!s?.active||s.finished){showToast('Zuerst das Spiel starten','error');return false;}
 if(window.KCSharedSync&&!window.KCSharedSync.ready){showToast('Verbindung nicht bestätigt. Bitte zuerst synchronisieren.','error');return false;}
 if(s.busy||s.closing||gameInputBusy[key]||window.KCSharedSync?.inUnit){showToast('Erst die laufende Wurfaktion abschließen.','error');return false;}
 try{
  if(GAME_NEXT_SERVER.has(key))return ['blackjack','gluecksspirale'].includes(key)?tableAction(key,'next'):indAction(key,'next');
  if(key==='sechstage')return sechsRun('next');
  if(key==='tiberius')return tiberiusNextThrower();
  if(['tannenbaum','darts'].includes(key)){
   if(key==='darts'&&(pendingDartsPenalty||dartsPenaltyBusy)||key==='tannenbaum'&&(pendingTannenbaumPenaltyThrow||pendingTannenbaumKranzChoice)){
    showToast('Erst die offene Wurfauswahl abschließen.','error');return false;
   }
   const next=gameInputCurrentTeam(key)==='T1'?'T2':'T1';
   gameInputTeam(key,next);return true;
  }
  if(key==='lotterie'){
   const names=getLotteriePlayers().map(p=>p.name),left=[];
   for(let col=0;col<(s.columns||[]).length;col++)for(const name of names)if(s.throws[name]?.[col]==null)left.push({name,col});
   const cursor=(Number(s.manualCursor)||0)%Math.max(1,left.length);
   const offset=left.slice(cursor+1).concat(left.slice(0,cursor)).findIndex(turn=>turn.name!==left[cursor]?.name);
   if(offset<0){showToast('Kein weiterer offener Werfer','error');return false;}
   s.manualCursor=(cursor+offset+1)%left.length;
  }else if(key==='mensch'){
   if(!s.playerOrder?.length)return false;s.currentIndex=((Number(s.currentIndex)||0)+1)%s.playerOrder.length;
  }else if(key==='plusminus'){
   if(!s.playerOrder?.length)return false;
   if(s.currentThrowIndex>0&&s.currentThrowIndex<5){showToast('Die angefangene Fünfer-Reihe zuerst abschließen oder rückgängig machen','error');return false;}
   s.currentPlayerIndex=((Number(s.currentPlayerIndex)||0)+1)%s.playerOrder.length;
  }else if(['haushoch','haustief'].includes(key)){
   const mode=key==='haushoch'?'hoch':'tief';hausNextPlayer(mode);
  }else if(key==='sichern'){
   if(s.turnThrows?.length){showToast('Angefangene Wurfrunde zuerst sichern oder rückgängig machen','error');return false;}
   if(!s.order?.length)return false;s.currentIndex=((Number(s.currentIndex)||0)+1)%s.order.length;
  }else if(key==='tor'){
   if(s.coinPending||s.busy){showToast('Erst die Auslosung oder Buchung abschließen','error');return false;}
   s.selected=[];s.current=s.current==='T1'?'T2':'T1';
  }else if(key==='fuchsjagd')return fuchsjagdNextThrower();
  else{showToast('Spiel unterstützt noch kein sicheres manuelles Weiterschalten','error');return false;}
  persistState();renderAll();return true;
 }catch(error){showToast('Nächster Werfer: '+(error?.message||error),'error');return false;}
}
function renderGameDashboardButton(key,panel,s){
 const title=panel.querySelector(':scope > .section-title,:scope > .tg-page-title,:scope > .six-page-title');
 const buttons=[...panel.querySelectorAll('[data-game-dashboard]')];
 let dashboard=buttons.shift();buttons.forEach(el=>el.remove());
 let toolbar=panel.querySelector('.game-dashboard-toolbar');
 if(!toolbar){toolbar=document.createElement('div');toolbar.className='game-dashboard-toolbar';}
 if(title){title.classList.add('game-title-with-actions');if(toolbar.parentElement!==title)title.append(toolbar);}
 else if(toolbar.parentElement!==panel)panel.prepend(toolbar);
 if(!dashboard){
  dashboard=document.createElement('button');dashboard.type='button';
  dashboard.className='secondary-btn game-dashboard-button';dashboard.dataset.gameDashboard=key;
  dashboard.textContent='📺 Auf Dashboard anzeigen';dashboard.onclick=()=>showGameOnDashboard(key);
 }
 if(dashboard.parentElement!==toolbar)toolbar.append(dashboard);
 let next=toolbar.querySelector('[data-game-next]');
 if(!next){next=document.createElement('button');next.type='button';next.className='game-next-button';next.dataset.gameNext=key;next.textContent='➡ Nächster Werfer';next.onclick=()=>gameNextThrower(key);}
 if(next.parentElement!==toolbar)toolbar.insertBefore(next,dashboard);
 window.KCGameStopwatchApp?.attach(toolbar,next,key,s);
 const available=!!(s&&(s.active||s.finished||s.id||s.startedAt||s.history?.length));
 dashboard.disabled=!available||gameDashboardBusy.has(key)||window.navigator?.onLine===false&&!window.KCTabletSync?.directConnected;
 dashboard.title=available?'Dieses Spiel wieder auf dem TV anzeigen':'Zuerst das Spiel starten';
 next.disabled=!s?.active||!!s?.finished||gameInputBusy[key]||window.KCSharedSync&&!window.KCSharedSync.ready;
 next.title=s?.active?'Ohne Wurf zum nächsten Spieler oder Team weiterschalten':'Zuerst das Spiel starten';
 if(key==='tiberius'){
  let undo=toolbar.querySelector('[data-game-undo]');
  if(!undo){
   undo=document.createElement('button');undo.type='button';undo.className='game-next-button';
   undo.dataset.gameUndo=key;undo.textContent='↩ Letzten Wurf rückgängig';
   undo.onclick=async()=>{
    if(undo.disabled||gameInputBusy[key]||window.KCSharedSync?.inUnit)return;
    gameInputBusy[key]=true;applyGameInputLayout(key);
    try{await undoLastTiberiusThrow();}
    finally{gameInputBusy[key]=false;applyGameInputLayout(key);}
   };
   toolbar.insertBefore(undo,toolbar.querySelector('[data-game-pause]')||next);
  }
  undo.disabled=next.disabled||!s?.undoStack?.length;
 }
}

function applyGameInputLayout(key){
 const panel=document.getElementById('tab-'+key);if(!panel)return;
 const s=gameSetupState(key);window.KCGameOptionsApp?.capture(key,s);renderGameDashboardButton(key,panel,s);
 // Nur dieser gemeinsame Abbruchweg darf während eines laufenden Spiels sichtbar sein.
 for(const button of panel.querySelectorAll('button'))if(!button.hasAttribute('data-abort-game')&&/Spiel abbrechen/i.test(button.textContent))button.remove();
 const aborts=[...panel.querySelectorAll('[data-abort-game]')];let abort=aborts.shift();aborts.forEach(button=>button.remove());
 if(s?.active){if(!abort){abort=document.createElement('button');abort.type='button';abort.className='secondary-btn game-abort-button';abort.dataset.abortGame=key;abort.textContent='✕ Spiel abbrechen';abort.onclick=()=>cancelCurrentGame(key);panel.append(abort);}}else abort?.remove();const old=panel.querySelector(':scope > .game-input-panel');
 if(['haushoch','haustief','lotterie'].includes(key)){old?.remove();return;}
 if(!s?.active){if(key==='darts'){const actions=old?.querySelector('.darts-round-actions');if(actions)document.getElementById('darts-game-area')?.append(actions);}old?.remove();for(const el of panel.querySelectorAll('[data-game-input-hidden]')){el.classList.remove('gi-original-input');el.removeAttribute('data-game-input-hidden');}return;}
 const card=document.createElement('section');card.className='game-input-panel';card.dataset.gameInput=key;card.setAttribute('aria-label','Wurfeingabe');
 const heading=document.createElement('h3');heading.className='gi-heading';heading.textContent='🎳 Wurf eingeben';card.append(heading);
 if(['tannenbaum','darts','lotterie','tiberius','haushoch','haustief'].includes(key)){
  const content=document.createElement('div');content.innerHTML=legacyGameInput(key);card.append(content);
  if(key==='tannenbaum'||key==='darts')for(const button of panel.querySelectorAll('button[onclick^="open'+(key==='darts'?'Darts':'Tannenbaum')+'ThrowModal("]')){const row=button.parentElement;row.dataset.gameInputHidden='true';row.classList.add('gi-original-input');}
  if(key==='tiberius')for(const button of panel.querySelectorAll('button[onclick="openTiberiusThrowModal()"]')){button.dataset.gameInputHidden='true';button.classList.add('gi-original-input');}
 }else{
  const board=document.getElementById(key==='sechstage'?'sechs-board':key==='fuchsjagd'?'fuchs-board':key+'-board');if(!board){old?.remove();return;}
  const selectors={poker:'.extra-turn,.extra-controls',pfaelzer:'.extra-turn,.extra-controls',tausend:'.extra-turn,.extra-controls',parteienspiel:'.extra-turn,.extra-controls',dreieuro:'.extra-turn,.extra-controls',ebbeflut:'.extra-turn,.extra-controls',hochsprung:'.extra-turn,.extra-controls',sechstage:'.six-turnline,.six-player-turn,.six-pinpad,.six-actions:has(button[onclick="undoSechsThrow()"])',blackjack:'.tg-turn,.bj-controls',gluecksspirale:'.tg-spiral-turn,.tg-spiral-booking',bergundtal:'.extra-turn,.extra-controls',ballermann:'.extra-turn,.extra-controls',lattenzaun:'.extra-turn,.extra-controls',guterschnitt:'.extra-turn,.extra-controls',siebener:'.ind-turn,.ind-place,.ind-actions',hindernis:'.ind-turn,.ind-actions',mensch:'.game-throw-toolbar',plusminus:'.game-throw-toolbar',sichern:'.sichern-controls',fuchsjagd:'.fox-turn,.fox-actions',tor:'.tor-turn,.tor-pins,.tor-remaining,.tor-actions'};
  const found=[...board.querySelectorAll(selectors[key]||'.game-throw-toolbar')],nodes=found.filter(node=>!found.some(other=>other!==node&&other.contains(node)));
  if(!nodes.length){if(old)return;else return;}
  for(const node of nodes)card.append(node);
 }
 normalizeGamePinpad(card);if(key==='darts'){const actions=panel.querySelector('.darts-round-actions');if(actions){const finish=actions.querySelector('button[onclick="finishDartsRound()"]');if(finish){finish.type='button';finish.disabled=!!gameInputBusy[key]||!!s.busy;}card.append(actions);}}if(gameInputBusy[key])for(const button of card.querySelectorAll('button'))button.disabled=true;old?.remove();
 const title=panel.querySelector(':scope > .section-title,:scope > .tg-page-title,:scope > .six-page-title');
 if(title)title.after(card);else panel.prepend(card);
}
// Jeder Renderer wird nach seinem regulären DOM-Aufbau ergänzt, auch bei Live-Updates.
function installGameInputLayouts(){
 const entries={renderTannenbaum:()=> 'tannenbaum',renderDarts:()=> 'darts',renderLotterie:()=> 'lotterie',renderTiberius:()=> 'tiberius',renderMenschGame:()=> 'mensch',renderPlusminusGame:()=> 'plusminus',renderHausGame:mode=>hausId(mode),renderFuchsjagdGame:()=> 'fuchsjagd',renderSichernGame:()=> 'sichern',renderTorGame:()=> 'tor',renderSechsGame:()=> 'sechstage',renderTableGame:key=>key,renderIndividualGame:key=>key};
 for(const [name,key] of Object.entries(entries)){const render=globalThis[name];if(typeof render!=='function'||render.gameInputLayout)continue;const wrapped=function(...args){const result=render.apply(this,args);applyGameInputLayout(key(...args));return result;};wrapped.gameInputLayout=true;globalThis[name]=wrapped;}
}
installGameInputLayouts();

installGameThrowDialogs();
