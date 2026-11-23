/* Setup, numbered pin input and house settings for the four club games. */
const clubGameDrafts=new Map();
function clubGameDraft(s){
 const key=ACTIVE_CLUB+'|'+s.gameKey,draft=clubGameDrafts.get(key);
 if(draft?.id===s.id&&draft.revision===s.revision)return draft;
 const next={id:s.id,revision:s.revision,selected:[],pairs:[],partner:''};
 clubGameDrafts.set(key,next);return next;
}
function swingerMembers(names,current=''){
 return names.map(n=>'<span class="swinger-member'+(n===current?' is-thrower':'')+'">'+sixAvatar(n)+'</span>').join('');
}
function swingerAppTeams(s){
 const throwing=s.active&&s.phase!=='pairs',current=window.KCClubGames.current(s);
 return '<section class="swinger-team-board" aria-label="Teams der Runde"><h3>Teams · Runde '+(s.phase==='pairs'?s.round-1:s.round)+'</h3>'+
  '<div class="swinger-team-grid">'+s.pairs.map((team,i)=>{
   const active=throwing&&i===s.index,done=!throwing||i<s.index,used=done?s.config.throws:active?s.pairThrows:0;
   return '<article class="swinger-team'+(active?' is-current':'')+'" data-swinger-team="'+i+'"><div class="swinger-team-top">'+
    '<strong>Team '+(i+1)+(team.names.length===1?' <span class="swinger-solo">1er-Team</span>':'')+
    '</strong><small>'+(active?'Am Wurf':done?'Fertig':i===s.index+1?'Als Nächstes':'Wartet')+'</small></div>'+
    '<div class="swinger-members">'+swingerMembers(team.names,active?current:'')+'</div>'+
    '<div class="swinger-team-foot"><progress aria-label="Würfe erledigt" max="'+s.config.throws+'" value="'+used+'"></progress>'+
    '<b>'+team.points+' Holz</b></div></article>';
  }).join('')+'</div></section>';
}
function swingerAppTurn(s,d,disabled){
 const current=window.KCClubGames.current(s),team=s.pairs[s.index];
 return '<div class="swinger-turn"><header><div><small>Team '+(s.index+1)+(team.names.length===1?' · 1er-Team':'')+'</small>'+
  '<strong>'+clubGameEscape(current)+' am Wurf</strong></div><div class="swinger-progress"><span>Runde <b>'+s.round+' / '+s.config.rounds+'</b></span>'+
  '<span>Wurf <b>'+(s.pairThrows+1)+' / '+s.config.throws+'</b></span></div></header>'+
  '<div class="swinger-lane-layout"><div class="swinger-lane"><strong>Gefallene Kegel antippen</strong>'+
  clubGameRack({standing:s.standing,selected:d.selected,buttons:true,disabled:!!disabled})+
  '<span class="swinger-lane-caption">'+s.standing.length+' stehen noch</span></div>'+
  '<div class="swinger-booking"><div class="swinger-member-line">'+swingerMembers(team.names,current)+'</div>'+
  '<p><b>'+team.points+'</b> Holz für das Team</p><div class="swinger-throw-count" aria-live="polite"><strong data-swinger-picked>'+d.selected.length+'</strong> ausgewählt</div>'+
  '<div class="ind-actions"><button type="button" data-club-book-pins class="primary-btn" '+(disabled||!d.selected.length?'disabled':'')+' onclick="clubGameBookPins(\'swingerclub\')">Wurf buchen</button>'+
  '<button type="button" '+disabled+' onclick="indAction(\'swingerclub\',\'throw\',{kind:\'gosse\'})">Gosse</button></div></div></div></div>';
}
function swingerAppPairs(s,d,disabled){
 const remaining=s.players.filter(n=>!d.pairs.some(t=>t.names.includes(n)));
 const showSingle=s.players.length%2&&!d.pairs.some(t=>t.names.length===1)&&d.partner;
 const first=s.splitPairs[0].names,needsNew=new Set(s.splitPairs.flatMap(t=>t.names));
 const esc=clubGameEscape;
 return '<div class="swinger-pairing"><header class="swinger-first-choice"><div><small>Runde '+s.round+' / '+s.config.rounds+' · Partnerwechsel</small>'+
  '<strong>'+first.map(esc).join(' &amp; ')+'</strong><span>'+ (first.length===1?'darf':'dürfen')+' zuerst wählen</span></div>'+
  '<span>Schwächstes Team der Vorrunde</span></header>'+
  '<div class="swinger-pair-layout"><div><h3>Spieler wählen <small>'+remaining.length+' offen</small></h3>'+
  '<div class="kc-avatar-picker">'+remaining.map(n=>'<button type="button" class="kc-avatar-option '+(d.partner===n?'selected':'')+'" aria-pressed="'+(d.partner===n)+'" '+disabled+
   ' onclick="clubGamePairPick('+s.players.indexOf(n)+')">'+sixAvatar(n)+(needsNew.has(n)?'<small>Partnerwechsel</small>':'')+'</button>').join('')+'</div></div>'+
  '<div><h3>Neue Teams <small>'+d.pairs.length+' / '+Math.ceil(s.players.length/2)+'</small></h3>'+
  '<div class="swinger-pair-list">'+d.pairs.map((t,i)=>'<div><small>Team '+(i+1)+(t.names.length===1?' · 1er-Team':'')+'</small>'+
   '<div class="swinger-members">'+swingerMembers(t.names)+'</div></div>').join('')+'</div></div></div>'+
  '<div class="ind-actions">'+(showSingle?'<button type="button" onclick="clubGamePickSingle()" '+disabled+'>Als 1er-Team übernehmen</button>':'')+
  '<button type="button" onclick="clubGameClearPairs()" '+disabled+'>Auswahl zurücksetzen</button>'+
  '<button type="button" class="primary-btn" '+(disabled||remaining.length?'disabled':'')+' onclick="clubGameCommitPairs()">Neue Teams übernehmen</button></div></div>';
}
function clubGameControls(key,s,disabled){
 const g=window.KCClubGames,d=clubGameDraft(s),esc=clubGameEscape;
 if(s.phase==='numbers'){
  const n=g.current(s),ready=g.validTicket(d.selected);
  return '<div class="club-game-choices"><strong>Sechs Glückszahlen für '+esc(n)+'</strong><p>Mindestens eine Zahl je Zehnerblock wählen.</p>'+
   Array.from({length:5},(_,block)=>'<div class="club-lotto-choices" aria-label="'+Math.max(1,block*10)+' bis '+(block*10+9)+'">'+
    Array.from({length:10},(_,i)=>block*10+i).filter(v=>v>0).map(v=>'<button type="button" '+disabled+' aria-pressed="'+d.selected.includes(v)+'" data-lotto-number="'+v+'" onclick="clubGameLottoPick('+v+',this)">'+v+'</button>').join('')+'</div>').join('')+
    '<div class="ind-actions club-lotto-action"><button class="primary-btn" type="button" data-club-ticket-submit '+(disabled||!ready?'disabled':'')+' onclick="clubGameCommitTicket()">Zahlen übernehmen</button>'+
   '<button class="secondary-btn" type="button" data-club-ticket-random '+disabled+' onclick="clubGameRandomTicket()">Zufallszahlen</button>'+
   '<span data-club-ticket-status aria-live="polite">'+clubGameTicketStatus(d.selected)+'</span></div></div>';
 }
 if(key==='swingerclub')return s.phase==='pairs'?swingerAppPairs(s,d,disabled):swingerAppTurn(s,d,disabled);
 if(g.physical(key)){
  const prices=s.config.pinCents;
  return '<div class="club-game-choices"><strong>Gefallene Kegel antippen</strong>'+
   clubGameRack({selected:d.selected,prices,buttons:true,disabled:!!disabled})+
   '<div class="ind-actions"><button type="button" data-club-book-pins class="primary-btn" '+(disabled||!d.selected.length?'disabled':'')+' onclick="clubGameBookPins(\''+key+'\')">Wurf buchen</button>'+
   '<button type="button" '+disabled+' onclick="indAction(\''+key+'\',\'throw\',{kind:\'gosse\'})">Gosse</button>'+
   (key==='tageskurs'?'<button type="button" '+disabled+' onclick="clubGameBookPins(\'tageskurs\',true)">Alle Neune</button><button type="button" '+disabled+' onclick="indRun(\'tageskurs\',\'throw\',{kind:\'kranz\'})">👑 Kranz</button>':'')+'</div></div>';
 }
 return '';
}
function clubGameTicketStatus(selected){
 const missing=selected.length===6&&!window.KCClubGames.validTicket(selected);
 return selected.length+' / 6 ausgewählt'+(missing?' · In jedem Zehnerblock muss mindestens eine Zahl markiert sein.':'');
}
function clubGameLottoPick(n,button){
 const s=indGet('lottokoenig');
 if(!s?.active||s.phase!=='numbers'||indBusy.lottokoenig||indPending.lottokoenig)return;
 const d=clubGameDraft(s),i=d.selected.indexOf(n);
 if(i>=0)d.selected.splice(i,1);
 else if(d.selected.length<6)d.selected.push(n);
 button.setAttribute('aria-pressed',String(d.selected.includes(n)));
 const panel=document.getElementById('tab-lottokoenig');
 panel.querySelector('[data-club-ticket-submit]').disabled=!window.KCClubGames.validTicket(d.selected);
 panel.querySelector('[data-club-ticket-status]').textContent=clubGameTicketStatus(d.selected);
}
function clubGameRandomTicket(){
 const s=indGet('lottokoenig');
 if(!s?.active||s.phase!=='numbers'||indBusy.lottokoenig||indPending.lottokoenig)return;
 const selected=clubGameDraft(s).selected=window.KCClubGames.randomTicket();
 const panel=document.getElementById('tab-lottokoenig');
 for(const button of panel.querySelectorAll('[data-lotto-number]')){
  button.setAttribute('aria-pressed',String(selected.includes(Number(button.dataset.lottoNumber))));
 }
 panel.querySelector('[data-club-ticket-submit]').disabled=false;
 panel.querySelector('[data-club-ticket-status]').textContent=clubGameTicketStatus(selected);
}
function clubGameRandomTickets(){
 const s=indGet('lottokoenig');
 if(!s?.active||s.phase!=='numbers'||indBusy.lottokoenig||indPending.lottokoenig)return;
 const tickets=s.players.map(()=>({numbers:window.KCClubGames.randomTicket()}));
 return indAction('lottokoenig','randomNumbers',{tickets});
}
function clubGameCommitTicket(){
 const s=indGet('lottokoenig');
 if(!s?.active||s.phase!=='numbers')return;
 const numbers=clubGameDraft(s).selected.slice();
 if(!window.KCClubGames.validTicket(numbers))return;
 return indAction('lottokoenig','numbers',{numbers});
}
function clubGamePairPick(index){
 const s=indGet('swingerclub'),d=clubGameDraft(s),name=s.players[index];
 if(!name||d.pairs.some(t=>t.names.includes(name)))return;
 if(d.partner===name)d.partner='';
 else if(!d.partner)d.partner=name;
 else{
  if(s.splitPairs.some(t=>t.names.length===2&&t.names.includes(name)&&t.names.includes(d.partner))){showToast('Dieses Paar muss wechseln.','error');return;}
  d.pairs.push({names:[d.partner,name]});d.partner='';
 }
 renderIndividualGame('swingerclub');
}
function clubGamePickSingle(){
 const s=indGet('swingerclub'),d=clubGameDraft(s);
 if(!d.partner||s.players.length%2!==1||d.pairs.some(t=>t.names.length===1))return;
 if(s.splitPairs.some(t=>t.names.length===1&&t.names[0]===d.partner)){showToast('Dieses Einzelteam muss einen Partner bekommen.','error');return;}
 d.pairs.push({names:[d.partner]});d.partner='';renderIndividualGame('swingerclub');
}
function clubGameClearPairs(){const d=clubGameDraft(indGet('swingerclub'));d.pairs=[];d.partner='';renderIndividualGame('swingerclub');}
function clubGameCommitPairs(){return indAction('swingerclub','pairs',{pairs:clubGameDraft(indGet('swingerclub')).pairs});}
function clubGameTogglePin(n,button){
 const panel=button.closest('[data-game-input]')||button.closest('[data-extra-game]'),key=panel.dataset.gameInput||panel.dataset.extraGame,d=clubGameDraft(indGet(key));
 const i=d.selected.indexOf(n);if(i<0)d.selected.push(n);else d.selected.splice(i,1);
 button.setAttribute('aria-pressed',String(d.selected.includes(n)));button.classList.toggle('is-selected',d.selected.includes(n));
 panel.querySelector('[data-club-book-pins]').disabled=!d.selected.length;
 const counter=panel.querySelector('[data-swinger-picked]');
 if(counter)counter.textContent=String(d.selected.length);
}
function clubGameBookPins(key,all=false){
 return indAction(key,'throw',{kind:'pins',knocked:all?window.KCClubGames.pins.slice():clubGameDraft(indGet(key)).selected.slice()});
}
function updateAbschreibungValuation(select){
 for(const field of select.closest('#game-property-abschreibung').querySelectorAll('[data-abschreibung-valuation]'))
  field.hidden=field.dataset.abschreibungValuation!==select.value;
}
function renderClubGameSettings(){
 const g=window.KCClubGames,rack=document.querySelector('[data-tageskurs-settings-rack]');
 if(rack&&!rack.firstElementChild)rack.innerHTML=clubGameRack();
 for(const key of g.keys){
  const panel=document.getElementById('game-property-'+key);if(!panel||panel.contains(document.activeElement))continue;
  const config=extraConfig(key);
  for(const el of panel.querySelectorAll('[data-abschreibung-self-pin]'))el.checked=g.selfPins(config).includes(Number(el.dataset.abschreibungSelfPin));
  for(const el of panel.querySelectorAll('[data-club-setting]')){
   const field=el.dataset.clubSetting,value=el.dataset.pinIndex===undefined?config[field]:config[field][Number(el.dataset.pinIndex)];
   if(el.type==='checkbox')el.checked=value;else el.value=value;
  }
  if(key==='abschreibung'){
   const select=panel.querySelector('[data-club-setting="valuation"]');
   if(select)updateAbschreibungValuation(select);
  }
 }
}
async function saveClubGameSettings(key){
 if(extraSettingsBusy||!ACTIVE_CLUB)return false;
 const g=window.KCClubGames,panel=document.getElementById('game-property-'+key),config=extraConfig(key);
 for(const el of panel.querySelectorAll('[data-club-setting]')){
  const valuation=el.closest('[data-abschreibung-valuation]')?.dataset.abschreibungValuation;
  if(valuation&&valuation!==config.valuation)continue;
  const field=el.dataset.clubSetting,value=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?NaN:Number(el.value)):el.value;
  if(el.dataset.pinIndex===undefined)config[field]=value;else config[field][Number(el.dataset.pinIndex)]=value;
 }
 if(key==='abschreibung')config.selfPins=[...panel.querySelectorAll('[data-abschreibung-self-pin]')]
  .filter(el=>el.checked).map(el=>Number(el.dataset.abschreibungSelfPin));
 if(!g.validSettings(key,config)){showToast('Bitte die Werte und Grenzen prüfen.','error');return false;}
 const club=ACTIVE_CLUB;extraGameSettings={...extraGameSettings,[key]:config};extraSettingsBusy=true;persistState();
 try{
  const saved=await saveToFirestore(false);
  if(ACTIVE_CLUB===club)showToast(saved?'Für neue Spiele gespeichert.':'Lokal gespeichert. Cloud-Abgleich ausstehend.',saved?'success':'error');
  return saved;
 }catch(error){if(ACTIVE_CLUB===club)showToast('Cloud-Abgleich fehlgeschlagen: '+error.message,'error');return false;}
 finally{extraSettingsBusy=false;}
}
