/* Gemeinsame kompakte Startansicht: alle aktiven Kegler, optionales Umordnen, Teams pro Spiel. */
const GAME_SETUP_KEYS=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun'];
const gameSetupDrafts=new Map();
function gsEscape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function gameSetupPeople(){return getActivePlayersForSoloGame().filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly);}
function gameSetupBaseOrder(){const active=gameSetupPeople().map(p=>p.name),seats=typeof getGlobalSeatOrder==='function'?getGlobalSeatOrder():active;return [...new Set([...seats.filter(n=>active.includes(n)),...active])];}
function gameSetupDraft(key){
 const stamp=String(ACTIVE_CLUB)+'|'+String(typeof currentEveningStartedAt==='undefined'?'':currentEveningStartedAt)+'|'+key,names=gameSetupBaseOrder();
 if(!gameSetupDrafts.has(stamp))gameSetupDrafts.set(stamp,{names,editing:false,teams:null,roster:names.slice().sort().join('\u0000'),fox:''});
 const d=gameSetupDrafts.get(stamp),roster=names.slice().sort().join('\u0000');
 if(d.roster!==roster){d.teams=null;d.roster=roster;}
 d.names=d.editing?[...d.names.filter(n=>names.includes(n)),...names.filter(n=>!d.names.includes(n))]:names;
 return d;
}
function gameSetupNames(key){return gameSetupDraft(key).names.slice();}
function gameSetupState(key){
 if(typeof tableGameGet==='function'&&['blackjack','gluecksspirale'].includes(key))return tableGameGet(key);
 if(typeof indGet==='function'&&['bergundtal','ballermann','lattenzaun'].includes(key))return indGet(key);
 if(typeof indGet==='function'&&['siebener','hindernis'].includes(key))return indGet(key);
 const state={tannenbaum:typeof tannenbaumState==='undefined'?null:tannenbaumState,darts:typeof dartsState==='undefined'?null:dartsState,lotterie:typeof lotterieState==='undefined'?null:lotterieState,tiberius:typeof tiberiusState==='undefined'?null:tiberiusState,mensch:typeof menschState==='undefined'?null:menschState,plusminus:typeof plusminusState==='undefined'?null:plusminusState,haushoch:typeof haushochState==='undefined'?null:haushochState,haustief:typeof haustiefState==='undefined'?null:haustiefState,sichern:typeof sichernState==='undefined'?null:sichernState,fuchsjagd:typeof fuchsjagdState==='undefined'?null:fuchsjagdState,tor:typeof torState==='undefined'?null:torState,sechstage:typeof sechstageState==='undefined'?null:sechstageState};return state[key];
}
function gameSetupMode(key){return ['sechstage','gluecksspirale'].includes(key)?'pairs':['tannenbaum','darts','tor','ballermann'].includes(key)||key==='sichern'&&document.getElementById('sichern-mode')?.value==='team'?'teams':'solo';}
function gameSetupLocked(key){const s=gameSetupState(key);return !!(s?.active||s?.id||key==='tannenbaum'&&s?.history?.length);}
function gameSetupTeams(key){
 const d=gameSetupDraft(key),names=d.names,mode=gameSetupMode(key);
 if(mode!=='pairs'){
  const people=new Map(gameSetupPeople().map(p=>[p.name,p]));
  return ['T1','T2'].map(team=>names.filter(n=>people.get(n)?.tisch===team));
 }
 if(d.teams&&d.teams.flat().length===names.length&&d.teams.flat().every(n=>names.includes(n))&&new Set(d.teams.flat()).size===names.length)return d.teams.map(t=>t.slice());
 d.teams=Array.from({length:Math.ceil(names.length/2)},(_,i)=>names.slice(i*2,i*2+2));
 return d.teams.map(t=>t.slice());
}
function gameSetupGroupError(key){
 const teams=gameSetupTeams(key),assigned=new Set(teams.flat()),missing=gameSetupNames(key).filter(n=>!assigned.has(n));
 if(missing.length)return 'Bitte zuerst unter „Gruppen“ zuordnen: '+missing.join(', ');
 if(teams.some(team=>!team.length))return 'Bitte unter „Gruppen“ beide Mannschaften besetzen.';
 return '';
}
function gameSetupCheckGroups(key){const error=gameSetupGroupError(key);if(error)showToast(error,'error');return !error;}
function gameSetupTeamMap(key){const teams=gameSetupTeams(key);return {T1:teams[0]||[],T2:teams[1]||[]};}
function gameTeamNames(key,team){const s=gameSetupState(key),frozen=s?.participantTeams;if(frozen&&gameSetupLocked(key)&&Array.isArray(frozen[team]))return frozen[team].slice();return gameSetupTeamMap(key)[team]||[];}
function gameSetupRefresh(key){
 if(key==='sechstage'&&typeof renderSechsGame==='function')renderSechsGame();
 else if(['blackjack','gluecksspirale'].includes(key)&&typeof renderTableGame==='function')renderTableGame(key);
 else if(['siebener','hindernis','bergundtal','ballermann','lattenzaun'].includes(key)&&typeof renderIndividualGame==='function')renderIndividualGame(key);
 else{if(typeof renderAll==='function')renderAll();else renderCommonGameSetups();}
}
function gameSetupToggle(key,checked){if(gameSetupLocked(key))return;const d=gameSetupDraft(key);d.editing=!!checked;if(!checked){d.names=gameSetupBaseOrder();d.teams=null;}gameSetupRefresh(key);}
function gameSetupMove(key,index,delta){
 if(gameSetupLocked(key))return;const d=gameSetupDraft(key),next=index+delta;if(!d.editing||next<0||next>=d.names.length)return;
 [d.names[index],d.names[next]]=[d.names[next],d.names[index]];
 if(gameSetupMode(key)==='pairs')d.teams=Array.from({length:Math.ceil(d.names.length/2)},(_,i)=>d.names.slice(i*2,i*2+2));
 else if(d.teams)d.teams=d.teams.map(t=>d.names.filter(n=>t.includes(n)));
 gameSetupRefresh(key);
}
function gameSetupDrawTeams(key){
 if(gameSetupLocked(key)||gameSetupMode(key)!=='pairs')return;const d=gameSetupDraft(key),names=d.names.slice();for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
 d.teams=Array.from({length:Math.ceil(names.length/2)},(_,i)=>names.slice(i*2,i*2+2));gameSetupRefresh(key);
}
function gameSetupAvatar(name){const person=gameSetupPeople().find(p=>p.name===name),initials=name.trim().split(/\s+/).map(s=>s[0]||'').join('').slice(0,2).toUpperCase(),file=name.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'');return '<span class="gs-avatar" aria-hidden="true"><span>'+gsEscape(initials)+'</span>'+(!person?.isGuest?'<img alt="" src="'+gsEscape(person?.avatarData||'bilder/'+file+'.jpg')+'" onerror="this.remove()">':'')+'</span>';}
function gameSetupFox(index){if(gameSetupLocked('fuchsjagd'))return;gameSetupDraft('fuchsjagd').fox=gameSetupNames('fuchsjagd')[index]||'';gameSetupRefresh('fuchsjagd');}
function gameSetupMarkup(key,{busy=false}={}){
 if(gameSetupLocked(key))return '';
 const d=gameSetupDraft(key),names=d.names,locked=gameSetupLocked(key)||busy,mode=gameSetupMode(key),disabled=locked?'disabled':'';
 const chip=(n,i,controls=false)=>'<div class="gs-chip"><small class="gs-place">'+(i+1)+'</small>'+gameSetupAvatar(n)+'<span class="gs-name" title="'+gsEscape(n)+'">'+gsEscape(n)+'</span>'+(controls?'<span class="gs-moves"><button type="button" '+(locked||i===0?'disabled':'')+' aria-label="'+gsEscape(n)+' nach vorne" onclick="gameSetupMove(\''+key+'\','+i+',-1)">↑</button><button type="button" '+(locked||i===names.length-1?'disabled':'')+' aria-label="'+gsEscape(n)+' nach hinten" onclick="gameSetupMove(\''+key+'\','+i+',1)">↓</button></span>':'')+'</div>';
 let html='<section class="gs-setup" data-game-setup="'+key+'"><div class="gs-heading"><strong>🪑 Sitzreihenfolge</strong><small>Alle '+names.length+' aktiven Kegler spielen mit</small></div><label class="gs-edit"><input type="checkbox" '+(d.editing?'checked ':'')+disabled+' onchange="gameSetupToggle(\''+key+'\',this.checked)"> Reihenfolge ändern</label><div class="gs-order">'+names.map((n,i)=>chip(n,i,d.editing&&!locked)).join('')+'</div>';
 if(mode!=='solo'){
  const s=gameSetupState(key),frozen=s?.participantTeams,teams=locked&&s?.teams&&['sechstage','gluecksspirale'].includes(key)?s.teams.map(t=>t.players):locked&&s?.teams&&['sichern','tor'].includes(key)?[s.teams.T1||[],s.teams.T2||[]]:locked&&frozen?[frozen.T1,frozen.T2]:gameSetupTeams(key);
  html+='<div class="gs-team-actions"><strong>'+(mode==='pairs'?'Zweierteams':'Gruppe 1 gegen Gruppe 2')+'</strong>'+(mode==='pairs'?'<button type="button" class="secondary-btn" '+(locked||names.length<2?'disabled':'')+' onclick="gameSetupDrawTeams(\''+key+'\')">🎲 Teams auslosen</button>':'<small>Einteilung aus „Gruppen“</small>')+'</div><div class="gs-teams">'+teams.map((team,i)=>'<div class="gs-team"><strong>'+(mode==='pairs'?'Team '+(i+1)+(team.length===1?' · Einzelteam':''):(typeof getGroupLabel==='function'?gsEscape(getGroupLabel(i===0?'T1':'T2')):'Team '+(i+1)))+'</strong><div class="gs-order">'+team.map(n=>chip(n,names.indexOf(n))).join('')+'</div></div>').join('')+'</div>';
  if(mode==='teams'){const error=gameSetupGroupError(key);if(error)html+='<p class="gs-group-warning" role="status">'+gsEscape(error)+'</p>';}
 }
 if(key==='fuchsjagd'){
  if(!names.includes(d.fox))d.fox=names[0]||'';
  html+='<div class="gs-role"><strong>🦊 Fuchs wählen</strong><div class="gs-order">'+names.map((n,i)=>'<button type="button" class="gs-role-choice '+(n===d.fox?'selected':'')+'" '+disabled+' onclick="gameSetupFox('+i+')">'+gameSetupAvatar(n)+'<span>'+gsEscape(n)+'</span></button>').join('')+'</div></div>';
 }
 return html+'</section>';
}
function renderCommonGameSetups(){
 for(const key of GAME_SETUP_KEYS){
  const hidden=gameSetupLocked(key),box=document.getElementById('common-setup-'+key)||document.getElementById(key+'-order-editor');
  if(box){box.hidden=hidden;box.classList.toggle('hidden',hidden);box.innerHTML=hidden?'':gameSetupMarkup(key);}
  const panel=document.querySelector('[data-game-start-panel="'+key+'"]');if(panel){panel.hidden=hidden;panel.classList.toggle('hidden',hidden);}
 }
}
function startTannenbaumSetup(){if(!gameSetupCheckGroups('tannenbaum'))return;if(tannenbaumState?.history?.length&&!confirm('Neuen Tannenbaum starten? Bisherige Würfe werden zurückgesetzt.'))return;tannenbaumState=createTannenbaumState();tannenbaumState.participantTeams=gameSetupTeamMap('tannenbaum');tannenbaumState.active=true;tannenbaumState.startedAt=new Date().toISOString();dashboardActiveGame='tannenbaum';renderAll();persistState();}
let gamePropertySelected='hindernis';
function renderGamePropertyTabs(){
 const tabs=document.getElementById('game-properties-tabs');if(!tabs)return;
 const panels=[...document.querySelectorAll('[data-game-property]')];if(!panels.some(p=>p.dataset.gameProperty===gamePropertySelected))gamePropertySelected=panels[0]?.dataset.gameProperty||'';
 for(const panel of panels){const selected=panel.dataset.gameProperty===gamePropertySelected;panel.hidden=!selected;panel.setAttribute('tabindex','0');}
 for(const button of tabs.querySelectorAll('[data-game-property-tab]')){const selected=button.dataset.gamePropertyTab===gamePropertySelected;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
}
function showGameProperty(key,focus=false){if(!document.querySelector('[data-game-property="'+key+'"]'))return;gamePropertySelected=key;renderGamePropertyTabs();if(focus){const button=document.querySelector('[data-game-property-tab="'+key+'"]');button?.focus();button?.scrollIntoView?.({block:'nearest',inline:'nearest'});}}
function gamePropertyKeydown(event){
 const buttons=[...document.querySelectorAll('#game-properties-tabs [data-game-property-tab]')],index=buttons.indexOf(document.activeElement);if(index<0)return;
 const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index-1+buttons.length)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;if(next===null)return;event.preventDefault();showGameProperty(buttons[next].dataset.gamePropertyTab,true);
}
