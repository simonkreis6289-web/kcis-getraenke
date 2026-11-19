/* Setup, numbered pin input and house settings for the four club games. */
const clubGameDrafts=new Map();
function clubGameDraft(s){
 const key=ACTIVE_CLUB+'|'+s.gameKey,draft=clubGameDrafts.get(key);
 if(draft?.id===s.id&&draft.revision===s.revision)return draft;
 const next={id:s.id,revision:s.revision,selected:[],pairs:[],partner:''};
 clubGameDrafts.set(key,next);return next;
}
function clubGameControls(key,s,disabled){
 const g=window.KCClubGames,d=clubGameDraft(s),esc=clubGameEscape;
 if(s.phase==='numbers'){
  const n=g.current(s);
  return '<div class="club-game-choices"><strong>Sechs Glückszahlen für '+esc(n)+'</strong><p>Mindestens eine Zahl je Zehnerblock wählen.</p>'+
   Array.from({length:5},(_,block)=>'<div class="club-lotto-choices" aria-label="'+block*10+' bis '+(block*10+9)+'">'+
    Array.from({length:10},(_,i)=>block*10+i).map(v=>'<button type="button" '+disabled+' aria-pressed="'+d.selected.includes(v)+'" onclick="clubGameLottoPick('+v+',this)">'+v+'</button>').join('')+'</div>').join('')+
    '<button class="primary-btn" type="button" data-club-ticket-submit disabled onclick="clubGameCommitTicket()">Zahlen übernehmen</button></div>';
 }
 if(s.phase==='pairs'){
  const remaining=s.players.filter(n=>!d.pairs.some(t=>t.names.includes(n)));
  return '<div class="club-game-choices"><strong>Neue Zweierteams · schwächstes Paar wählt zuerst</strong><p>Wähle jeweils zwei Namen. Beide Spieler aus dem besten und dem schwächsten Paar brauchen einen neuen Partner.</p>'+
   '<div class="kc-avatar-picker">'+remaining.map(n=>'<button type="button" class="kc-avatar-option '+(d.partner===n?'selected':'')+'" '+disabled+
    ' onclick="clubGamePairPick('+s.players.indexOf(n)+')">'+sixAvatar(n)+'</button>').join('')+'</div>'+
   '<ol>'+d.pairs.map(t=>'<li>'+t.names.map(esc).join(' + ')+'</li>').join('')+'</ol>'+
   '<div class="ind-actions"><button type="button" onclick="clubGameClearPairs()" '+disabled+'>Auswahl zurücksetzen</button>'+
    '<button type="button" class="primary-btn" '+(disabled||remaining.length?'disabled':'')+' onclick="clubGameCommitPairs()">Neue Paare übernehmen</button></div></div>';
 }
 if(g.physical(key)){
  const standing=key==='swingerclub'?s.standing:g.pins,prices=key==='tageskurs'?s.config.pinCents:undefined;
  return '<div class="club-game-choices"><strong>Gefallene Kegel antippen</strong>'+
   clubGameRack({standing,selected:d.selected,prices,buttons:true,disabled:!!disabled})+
   '<div class="ind-actions"><button type="button" data-club-book-pins class="primary-btn" '+(disabled||!d.selected.length?'disabled':'')+' onclick="clubGameBookPins(\''+key+'\')">Wurf buchen</button>'+
   '<button type="button" '+disabled+' onclick="indAction(\''+key+'\',\'throw\',{kind:\'gosse\'})">Gosse</button>'+
   (key==='tageskurs'?'<button type="button" '+disabled+' onclick="clubGameBookPins(\'tageskurs\',true)">Alle Neune</button>':'')+'</div></div>';
 }
 return '';
}
function clubGameLottoPick(n,button){
 const d=clubGameDraft(indGet('lottokoenig')),i=d.selected.indexOf(n);
 if(i>=0)d.selected.splice(i,1);
 else if(d.selected.length<6)d.selected.push(n);
 button.setAttribute('aria-pressed',String(d.selected.includes(n)));
 document.querySelector('#tab-lottokoenig [data-club-ticket-submit]').disabled=!window.KCClubGames.validTicket(d.selected);
}
function clubGameCommitTicket(){return indAction('lottokoenig','numbers',{numbers:clubGameDraft(indGet('lottokoenig')).selected.slice()});}
function clubGamePairPick(index){
 const s=indGet('swingerclub'),d=clubGameDraft(s),name=s.players[index];
 if(!name||d.pairs.some(t=>t.names.includes(name)))return;
 if(d.partner===name)d.partner='';
 else if(!d.partner)d.partner=name;
 else{
  if(s.splitPairs.some(t=>t.names.includes(name)&&t.names.includes(d.partner))){showToast('Dieses Paar muss wechseln.','error');return;}
  d.pairs.push({names:[d.partner,name]});d.partner='';
 }
 renderIndividualGame('swingerclub');
}
function clubGameClearPairs(){const d=clubGameDraft(indGet('swingerclub'));d.pairs=[];d.partner='';renderIndividualGame('swingerclub');}
function clubGameCommitPairs(){return indAction('swingerclub','pairs',{pairs:clubGameDraft(indGet('swingerclub')).pairs});}
function clubGameTogglePin(n,button){
 const panel=button.closest('[data-game-input]')||button.closest('[data-extra-game]'),key=panel.dataset.gameInput||panel.dataset.extraGame,d=clubGameDraft(indGet(key));
 const i=d.selected.indexOf(n);if(i<0)d.selected.push(n);else d.selected.splice(i,1);
 button.setAttribute('aria-pressed',String(d.selected.includes(n)));button.classList.toggle('is-selected',d.selected.includes(n));
 panel.querySelector('[data-club-book-pins]').disabled=!d.selected.length;
}
function clubGameBookPins(key,all=false){
 return indAction(key,'throw',{kind:'pins',knocked:all?window.KCClubGames.pins.slice():clubGameDraft(indGet(key)).selected.slice()});
}
function renderClubGameSettings(){
 const g=window.KCClubGames;
 for(const key of g.keys){
  const panel=document.getElementById('game-property-'+key);if(!panel||panel.contains(document.activeElement))continue;
  const config=extraConfig(key);
  for(const el of panel.querySelectorAll('[data-club-setting]')){
   const field=el.dataset.clubSetting,value=el.dataset.pinIndex===undefined?config[field]:config[field][Number(el.dataset.pinIndex)];
   if(el.type==='checkbox')el.checked=value;else el.value=value;
  }
 }
}
async function saveClubGameSettings(key){
 if(extraSettingsBusy||!ACTIVE_CLUB)return false;
 const g=window.KCClubGames,panel=document.getElementById('game-property-'+key),config=extraConfig(key);
 for(const el of panel.querySelectorAll('[data-club-setting]')){
  const field=el.dataset.clubSetting,value=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?NaN:Number(el.value)):el.value;
  if(el.dataset.pinIndex===undefined)config[field]=value;else config[field][Number(el.dataset.pinIndex)]=value;
 }
 if(!g.validSettings(key,config)){showToast('Bitte die Werte und Grenzen prüfen.','error');return false;}
 const club=ACTIVE_CLUB;extraGameSettings={...extraGameSettings,[key]:config};extraSettingsBusy=true;persistState();
 try{
  const saved=await saveToFirestore(false);
  if(ACTIVE_CLUB===club)showToast(saved?'Für neue Spiele gespeichert.':'Lokal gespeichert. Cloud-Abgleich ausstehend.',saved?'success':'error');
  return saved;
 }catch(error){if(ACTIVE_CLUB===club)showToast('Cloud-Abgleich fehlgeschlagen: '+error.message,'error');return false;}
 finally{extraSettingsBusy=false;}
}
