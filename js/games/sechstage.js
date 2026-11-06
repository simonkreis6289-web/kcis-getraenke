let sechsSetup={club:'',selected:[],teams:[],bonus:false},sechsAssignment=null,sechsPending=null,sechsBusy=false,sechsRulesFocus=null;
function createSechstageState(){return KCSixDays.empty();}
function ensureSechstageState(){
  if(!sechstageState||typeof sechstageState!=='object'||!Array.isArray(sechstageState.teams))sechstageState=createSechstageState();
  if(sechstageState.eveningStartedAt&&currentEveningStartedAt&&sechstageState.eveningStartedAt!==currentEveningStartedAt)sechstageState=createSechstageState();
  if(!SPIELE_KATALOG.includes('Sechs-Tage-Rennen'))SPIELE_KATALOG.push('Sechs-Tage-Rennen');
}
function applySechsServerState(value){
  if(!value||!Array.isArray(value.teams))return false;
  if(!currentEveningStartedAt&&value.eveningStartedAt)currentEveningStartedAt=value.eveningStartedAt;
  if(value.eveningStartedAt&&currentEveningStartedAt&&value.eveningStartedAt!==currentEveningStartedAt)return false;
  if(sechstageState?.eveningStartedAt===value.eveningStartedAt&&Number(value.revision)<Number(sechstageState?.revision||0))return false;
  sechstageState=JSON.parse(JSON.stringify(value));renderSechsGame();return true;
}
function sechsPlayers(){
  const active=getActivePlayersForSoloGame(),ordered=typeof getGlobalSeatOrder==='function'?getGlobalSeatOrder():active.map(p=>p.name);
  return [...new Set([...ordered,...active.map(p=>p.name)])].map(name=>active.find(p=>p.name===name)).filter(Boolean);
}
function sixAvatar(name){
  const person=persons.find(p=>p.name===name),initials=name.trim().split(/\s+/).map(part=>part[0]||'').join('').toUpperCase().slice(0,2);
  const file=name.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'');
  return '<span class="kc-avatar-image">'+(person?.isGuest?sixEscape(initials):'<img alt="" src="bilder/'+file+'.jpg" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>'+sixEscape(initials)+'</span>')+'</span><span>'+sixEscape(name)+'</span>';
}
function sechsTogglePlayer(index){if(sechsBusy||sechsPending)return;const name=sechsPlayers()[index]?.name;if(!name)return;sechsSetup.selected=sechsSetup.selected.includes(name)?sechsSetup.selected.filter(n=>n!==name):[...sechsSetup.selected,name];sechsSetup.teams=[];renderSechsGame();}
function sechsBuildTeams(random=false){
  if(sechsBusy||sechsPending)return;
  const names=sechsPlayers().filter(p=>sechsSetup.selected.includes(p.name)).map(p=>p.name);
  if(names.length<3||names.length>16){showToast('Bitte 3 bis 16 Kegler auswählen','error');return;}
  if(random)for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  sechsSetup.teams=Array.from({length:Math.ceil(names.length/2)},(_,i)=>({players:names.slice(i*2,i*2+2)}));renderSechsGame();
}
function sechsOpenAssignment(teamIndex,playerIndex){
  if(sechsBusy||sechsPending)return;sechsAssignment={teamIndex,playerIndex,choice:''};
  document.getElementById('sechs-assignment-title').textContent='Team '+(teamIndex+1)+' · Spieler '+(playerIndex+1)+' wählen';
  const grid=document.getElementById('sechs-assignment-grid');
  grid.innerHTML=sechsSetup.teams.flatMap(t=>t.players).map((name,i)=>'<button type="button" class="kc-avatar-option" onclick="sechsChooseAssignment('+i+')">'+sixAvatar(name)+'</button>').join('');
  document.getElementById('sechs-assignment-modal').classList.remove('hidden');
}
function sechsChooseAssignment(index){
  if(!sechsAssignment)return;sechsAssignment.choice=sechsSetup.teams.flatMap(t=>t.players)[index]||'';
  [...document.querySelectorAll('#sechs-assignment-grid button')].forEach((button,i)=>button.classList.toggle('selected',i===index));
}
function sechsConfirmAssignment(){
  const draft=sechsAssignment;if(!draft?.choice){showToast('Bitte einen Spieler auswählen','error');return;}
  const target=sechsSetup.teams[draft.teamIndex].players,old=target[draft.playerIndex];
  for(const team of sechsSetup.teams){const index=team.players.indexOf(draft.choice);if(index>=0)team.players[index]=old;}
  target[draft.playerIndex]=draft.choice;sechsCloseAssignment();renderSechsGame();
}
function sechsCloseAssignment(){sechsAssignment=null;document.getElementById('sechs-assignment-modal')?.classList.add('hidden');}
async function sechsRun(action,fields={}){
  if(sechsBusy||!ACTIVE_CLUB)return;
  if(!navigator.onLine||!window.firestoreApi?.transactSechsGame){showToast('Für das Rennen bitte eine Verbindung herstellen.','error');return;}
  const club=ACTIVE_CLUB;
  if(sechsPending&&sechsPending.club!==club)sechsPending=null;
  if(!sechsPending)sechsPending={club,request:{action,...fields,raceId:fields.raceId||sechstageState.id,expectedRevision:Number(sechstageState.revision)||0,opId:'six_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)),now:new Date().toISOString(),eveningStartedAt:currentEveningStartedAt||'',clubName:club}};
  const pending=sechsPending;sechsBusy=true;renderSechsGame();
  try{
    if(action==='start'&&typeof saveToFirestore==='function'&&!(await saveToFirestore(false)))throw new Error('Teilnehmer konnten nicht synchronisiert werden');
    const result=await window.firestoreApi.transactSechsGame(getClubFirestoreId(club),pending.request);
    if(ACTIVE_CLUB!==club)return;
    if(currentEveningStartedAt&&currentEveningStartedAt!==result.eveningStartedAt)return;
    currentEveningStartedAt=result.eveningStartedAt;
    applySechsServerState(result.state);dashboardActiveGame='sechstage';
    for(const item of result.counters||[])if(typeof applyConfirmedLiveCounter==='function')applyConfirmedLiveCounter(item.personName,item.category,item.key,item.value);
    const removed=new Set(result.removed||[]),added=result.added||[],ids=new Set(added.map(e=>e.id));
    penaltyStatsLog=[...(result.gameStats||added),...(penaltyStatsLog||[]).filter(e=>!e.sixDaysRaceId&&!removed.has(e.id)&&!ids.has(e.id))];
    sechsPending=null;
    persistState();try{renderAll();}catch(error){console.error('Rennanzeige',error);renderSechsGame();}
    if(action==='finish')showToast('Rennen abgeschlossen – Verliererstrafe einmal gebucht','success');
  }catch(error){console.error('Sechs-Tage-Rennen',error);if(ACTIVE_CLUB===club){sechsPending.error=error.message;showToast(error.message,'error');}}
  finally{sechsBusy=false;if(ACTIVE_CLUB!==club)sechsPending=null;renderSechsGame();}
}
async function startSechsGame(){
  ensureSechstageState();if(sechsSetup.teams.length<2){showToast('Bitte zuerst die Zweierteams bilden','error');return;}
  sechsSetup.bonus=!!document.getElementById('sechs-bonus')?.checked;
  await sechsRun('start',{teams:sechsSetup.teams,bonus:sechsSetup.bonus,raceId:'race_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2))});
}
function sechsThrow(kind,pins=0){if(!sechsPending)return sechsRun('throw',{kind,pins});}
function sechsSelectThrower(index){if(!sechsPending)return sechsRun('select',{playerIndex:index});}
function undoSechsThrow(){if(!sechsPending)return sechsRun('undo');}
function finishSechsGame(){if(!sechsPending)return sechsRun('finish');}
function resetSechsGame(){if(sechsBusy||sechsPending)return;if(!confirm('Neues Rennen vorbereiten? Bereits gebuchte Wurf- und Verliererstrafen bleiben erhalten.'))return;return sechsRun('reset');}
function retrySechsCommand(){if(sechsPending)return sechsRun(sechsPending.request.action);}
async function reloadSechsGame(){
  if(sechsBusy||!ACTIVE_CLUB||!navigator.onLine)return;sechsBusy=true;const club=ACTIVE_CLUB;
  try{
    const data=await window.firestoreApi.loadClubState(getClubFirestoreId(club));if(ACTIVE_CLUB!==club)return;
    const current=data?.sechstageState;
    if(sechsPending&&current?.commands?.includes(sechsPending.request.opId)){sechsBusy=false;await retrySechsCommand();return;}
    sechsPending=null;if(current)applySechsServerState(current);else sechstageState=createSechstageState();
    showToast('Serverstand übernommen. Nicht gespeicherte Aktion kann neu eingegeben werden.','success');
  }catch(error){showToast('Spielstand konnte nicht geladen werden: '+error.message,'error');}
  finally{sechsBusy=false;renderSechsGame();}
}
function renderSechsGame(){
  const setup=document.getElementById('sechs-start-card'),box=document.getElementById('sechs-board');if(!setup||!box)return;ensureSechstageState();
  const active=sechsPlayers();
  if(sechsSetup.club!==ACTIVE_CLUB)sechsSetup={club:ACTIVE_CLUB,selected:active.map(p=>p.name),teams:[],bonus:false};
  setup.classList.toggle('hidden',!!sechstageState.id);
  if(!sechstageState.id){
    const names=new Set(active.map(p=>p.name));sechsSetup.selected=sechsSetup.selected.filter(name=>names.has(name));
    if(sechsSetup.teams.some(t=>t.players.some(name=>!names.has(name))))sechsSetup.teams=[];
    const count=sechsSetup.selected.length,valid=count>=3&&count<=16;
    setup.innerHTML='<h3>Zweierteams zusammenstellen</h3><p>3 bis 16 anwesende Kegler auswählen. Bei ungerader Anzahl spielt einer als Einzelteam mit allen vier Teamwürfen; niemand muss aussetzen.</p><div class="kc-avatar-picker six-player-grid">'+active.map((p,i)=>'<button type="button" class="kc-avatar-option '+(sechsSetup.selected.includes(p.name)?'selected':'')+'" aria-pressed="'+sechsSetup.selected.includes(p.name)+'" onclick="sechsTogglePlayer('+i+')">'+sixAvatar(p.name)+'</button>').join('')+'</div><p>'+count+' ausgewählt'+(valid?'':' · Bitte 3 bis 16 wählen')+'</p><div class="six-actions"><button type="button" class="secondary-btn" onclick="sechsBuildTeams()" '+(!valid?'disabled':'')+'>Teams bilden</button><button type="button" class="secondary-btn" onclick="sechsBuildTeams(true)" '+(!valid?'disabled':'')+'>🎲 Zweierteams auslosen</button></div><div class="six-pairs">'+sechsSetup.teams.map((t,i)=>'<div class="six-pair"><strong>Team '+(i+1)+(t.players.length===1?' · Einzelteam':'')+'</strong><div>'+t.players.map((name,j)=>'<button type="button" class="kc-avatar-option" onclick="sechsOpenAssignment('+i+','+j+')">'+sixAvatar(name)+'</button>').join('')+'</div></div>').join('')+'</div><label class="six-check"><input type="checkbox" id="sechs-bonus" '+(sechsSetup.bonus?'checked':'')+' onchange="sechsSetup.bonus=this.checked"> Tagessiegerbonus: +2 Holz vor dem Tagesmultiplikator</label><button type="button" class="primary-btn" onclick="startSechsGame()" '+(sechsSetup.teams.length<2?'disabled':'')+'>🏁 Sechs-Tage-Rennen starten</button>';
  }
  const s=sechstageState,blocked=sechsBusy||!!sechsPending,disabled=blocked?'disabled':'';
  let controls='';
  if(s.active&&!s.readyToFinish){
    const team=KCSixDays.team(s);
    controls='<div class="six-player-turn">'+team.players.map((name,i)=>'<button type="button" class="kc-avatar-option '+(s.turn.playerIndex===i?'selected':'')+'" '+(blocked||s.turn.used[i]>=KCSixDays.quota(team)?'disabled':'')+' onclick="sechsSelectThrower('+i+')">'+sixAvatar(name)+'<small>'+s.turn.used[i]+' / '+KCSixDays.quota(team)+' Würfe</small></button>').join('')+'</div><div class="six-actions six-pinpad">'+Array.from({length:s.turn.standing},(_,i)=>'<button type="button" class="pinpad-btn" '+disabled+' onclick="sechsThrow(\'pins\','+(i+1)+')">'+(i+1)+'</button>').join('')+'<button type="button" class="secondary-btn" '+disabled+' onclick="sechsThrow(\'miss\')">Vorbei</button><button type="button" class="secondary-btn" '+disabled+' onclick="sechsThrow(\'gosse\')">Gosse</button><button type="button" class="secondary-btn" '+(blocked||s.turn.standing!==9?'disabled':'')+' onclick="sechsThrow(\'kranz\')">Kranz (8 Holz)</button></div>';
  }
  box.innerHTML=renderSixDaysBoard(s)+(sechsBusy?'<p role="status">⏳ Spielaktion wird gespeichert …</p>':'')+(sechsPending?.error?'<div class="six-error" role="alert">Aktion noch nicht bestätigt: '+sixEscape(sechsPending.error)+'<div class="six-actions"><button type="button" class="primary-btn" onclick="retrySechsCommand()">Erneut versuchen</button><button type="button" class="secondary-btn" onclick="reloadSechsGame()">Serverstand laden</button></div></div>':'')+controls+(s.active?'<div class="six-actions"><button type="button" class="secondary-btn" '+(blocked||!s.history.length?'disabled':'')+' onclick="undoSechsThrow()">↩ Wurf zurücknehmen</button>'+(s.readyToFinish?'<button type="button" class="primary-btn" '+disabled+' onclick="finishSechsGame()">🏁 Rennen abschließen und Verlierer buchen</button>':'')+'</div>':'')+(s.id?'<button type="button" class="secondary-btn" '+disabled+' onclick="resetSechsGame()">'+(s.finished?'Neues Rennen vorbereiten':'Rennen abbrechen')+'</button>':'')+(s.history.length?'<details class="six-history"><summary>Letzte Würfe</summary>'+s.history.slice(-12).reverse().map(entry=>'<div>Tag '+entry.day+' · '+sixEscape(entry.name)+' · '+(entry.kind==='gosse'?'Gosse':entry.kind==='miss'?'Vorbei':entry.kind==='kranz'?'Kranz':entry.pins+' Holz')+'</div>').join('')+'</details>':'');
  if(blocked)setup.querySelectorAll('button,input').forEach(el=>el.disabled=true);
}
function openSechsRules(){sechsRulesFocus=document.activeElement;document.getElementById('sechs-rules-modal').classList.remove('hidden');document.getElementById('sechs-rules-close').focus();}
function closeSechsRules(){document.getElementById('sechs-rules-modal')?.classList.add('hidden');sechsRulesFocus?.focus();}
document.addEventListener('keydown',event=>{
  const modal=document.getElementById('sechs-rules-modal');
  if(modal&&!modal.classList.contains('hidden')){
    if(event.key==='Escape'){event.preventDefault();closeSechsRules();}
    if(event.key==='Tab'){const focusable=[...modal.querySelectorAll('button,a[href]')];const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  }else if(event.key==='Escape')sechsCloseAssignment();
});
window.KCGameModules=window.KCGameModules||{};window.KCGameModules.sechstage={id:'sechstage',title:'Sechs-Tage-Rennen',ready:true};
