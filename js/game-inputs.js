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
 const s=lotterieState,names=getLotteriePlayers().map(p=>p.name);
 // Pro Spalte startet derselbe ausgeloste Spieler, danach im eingefrorenen Tischumlauf.
 for(let col=0;col<s.columns.length;col++)for(const name of names)if(s.throws[name]?.[col]===null||s.throws[name]?.[col]===undefined)return {name,col};
 return null;
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
 }else if(key==='tiberius')context='Tiberius · '+Number(s.score||0)+' Punkte';
 else{
  const mode=key==='haushoch'?'hoch':'tief',name=s.playerOrder[s.currentPlayerIndex],row=s.rows[name]||[],free=row.map((v,i)=>v?null:i).filter(v=>v!==null);
  if(!free.length)return '';
  if(!free.includes(gameInputPlaces[mode]))gameInputPlaces[mode]=free[0];
  context=giEscape(name)+' · Stelle wählen';options='<div class="gi-options">'+['Hunderter','Zehner','Einer'].map((label,i)=>'<button type="button" '+(row[i]?'disabled':'')+' aria-pressed="'+(gameInputPlaces[mode]===i)+'" onclick="gameInputPlace(\''+mode+'\','+i+')">'+label+'</button>').join('')+'</div>';
 }
 numbers=gameInputNumbers((pins,gosse)=>'gameInputThrow(\''+key+'\','+pins+','+gosse+')',12,window.KCKranzUI?KCKranzUI.label(key,s):null);
 if(key==='darts')numbers+=gameInputButton('Durchgeworfen',"dartsThrowTeam=gameInputCurrentTeam('darts');openDartsPenaltyPlayerModal('durchgeworfen',dartsThrowTeam,0)");
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
 if(!modal)return;const source=modal.querySelector(selector);if(!source||source.dataset.phonePad)return;const buttons=[...source.querySelectorAll('button')];if(!buttons.length)return;
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
function applyGameInputLayout(key){
 const panel=document.getElementById('tab-'+key);if(!panel)return;
 const s=gameSetupState(key);window.KCGameOptionsApp?.capture(key,s);
 // Nur dieser gemeinsame Abbruchweg darf während eines laufenden Spiels sichtbar sein.
 for(const button of panel.querySelectorAll('button'))if(!button.hasAttribute('data-abort-game')&&/Spiel abbrechen/i.test(button.textContent))button.remove();
 const aborts=[...panel.querySelectorAll('[data-abort-game]')];let abort=aborts.shift();aborts.forEach(button=>button.remove());
 if(s?.active){if(!abort){abort=document.createElement('button');abort.type='button';abort.className='secondary-btn game-abort-button';abort.dataset.abortGame=key;abort.textContent='✕ Spiel abbrechen';abort.onclick=()=>cancelCurrentGame(key);panel.append(abort);}}else abort?.remove();const old=panel.querySelector(':scope > .game-input-panel');
 if(['haushoch','haustief'].includes(key)){old?.remove();return;}
 if(!s?.active){if(key==='darts'){const finish=old?.querySelector('button[onclick="finishDartsRound()"]');if(finish)document.getElementById('darts-game-area')?.append(finish);}old?.remove();for(const el of panel.querySelectorAll('[data-game-input-hidden]')){el.classList.remove('gi-original-input');el.removeAttribute('data-game-input-hidden');}return;}
 const card=document.createElement('section');card.className='game-input-panel';card.dataset.gameInput=key;card.setAttribute('aria-label','Wurfeingabe');
 const heading=document.createElement('h3');heading.className='gi-heading';heading.textContent='🎳 Wurf eingeben';card.append(heading);
 if(['tannenbaum','darts','lotterie','tiberius','haushoch','haustief'].includes(key)){
  const content=document.createElement('div');content.innerHTML=legacyGameInput(key);card.append(content);
  if(key==='tannenbaum'||key==='darts')for(const button of panel.querySelectorAll('button[onclick^="open'+(key==='darts'?'Darts':'Tannenbaum')+'ThrowModal("]')){const row=button.parentElement;row.dataset.gameInputHidden='true';row.classList.add('gi-original-input');}
  if(key==='tiberius')for(const button of panel.querySelectorAll('button[onclick="openTiberiusThrowModal()"]')){button.dataset.gameInputHidden='true';button.classList.add('gi-original-input');}
 }else{
  const board=document.getElementById(key==='sechstage'?'sechs-board':key==='fuchsjagd'?'fuchs-board':key+'-board');if(!board){old?.remove();return;}
  const selectors={sechstage:'.six-turnline,.six-player-turn,.six-pinpad,.six-actions:has(button[onclick="undoSechsThrow()"])',blackjack:'.tg-turn,.bj-controls',gluecksspirale:'.tg-spiral-turn,.tg-spiral-booking',bergundtal:'.extra-turn,.extra-controls',ballermann:'.extra-turn,.extra-controls',lattenzaun:'.extra-turn,.extra-controls',guterschnitt:'.extra-turn,.extra-controls',siebener:'.ind-turn,.ind-place,.ind-actions',hindernis:'.ind-turn,.ind-actions',mensch:'.game-throw-toolbar',plusminus:'.game-throw-toolbar',sichern:'.sichern-controls',fuchsjagd:'.fox-turn,.fox-actions',tor:'.tor-turn,.tor-pins,.tor-remaining,.tor-actions'};
  const found=[...board.querySelectorAll(selectors[key]||'.game-throw-toolbar')],nodes=found.filter(node=>!found.some(other=>other!==node&&other.contains(node)));
  if(!nodes.length){if(old)return;else return;}
  for(const node of nodes)card.append(node);
 }
 normalizeGamePinpad(card);if(key==='darts'){const finish=panel.querySelector('button[onclick="finishDartsRound()"]');if(finish){finish.type='button';finish.disabled=!!gameInputBusy[key]||!!s.busy;card.append(finish);}}if(gameInputBusy[key])for(const button of card.querySelectorAll('button'))button.disabled=true;old?.remove();
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
