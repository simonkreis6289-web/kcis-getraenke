const IND_KEYS=['siebener','hindernis'];
let indDrafts={},indPending={},indBusy={},indAdd=false,indAddStamp='',indSettingsDraft=null,indSettingsClub='',indSettingsSaved='',indSettingsBusy=false,indRulesFocus=null;
function indGet(key){return key==='siebener'?siebenerState:hindernisState;}
function indSet(key,s){if(key==='siebener')siebenerState=s;else hindernisState=s;}
function indEnsure(){for(const key of IND_KEYS){const s=indGet(key);if(!s||!Array.isArray(s.history)||(s.eveningStartedAt&&currentEveningStartedAt&&s.eveningStartedAt!==currentEveningStartedAt))indSet(key,KCIndividual.empty(key));}for(const name of ['7er-Spiel','Hindernislauf'])if(!SPIELE_KATALOG.includes(name))SPIELE_KATALOG.push(name);}
function applyIndividualServerStates(data){
 if(data.currentEveningStartedAt&&currentEveningStartedAt&&data.currentEveningStartedAt!==currentEveningStartedAt)return;
 if(Number(data.individualGameRevision||0)<Number(individualGameRevision||0))return;
 for(const key of IND_KEYS)if(data[key+'State']&&Number(data[key+'State'].revision||0)>=Number(indGet(key)?.revision||0))indSet(key,JSON.parse(JSON.stringify(data[key+'State'])));
 if(Array.isArray(data.individualGameLedger))individualGameLedger=JSON.parse(JSON.stringify(data.individualGameLedger));individualGameRevision=Number(data.individualGameRevision)||0;
 if(Array.isArray(data.penaltyStatsLog))penaltyStatsLog=[...data.penaltyStatsLog.filter(e=>e.individualGameId),...penaltyStatsLog.filter(e=>!e.individualGameId)];
 renderIndividualGames();if(typeof renderStrafen==='function')renderStrafen();if(typeof updateStats==='function')updateStats();
}
function indPeople(){return typeof tablePlayers==='function'?tablePlayers():getActivePlayersForSoloGame();}
function indDraft(key){const stamp=ACTIVE_CLUB+'|'+currentEveningStartedAt;if(indDrafts[key]?.stamp!==stamp)indDrafts[key]={stamp,names:indPeople().map(p=>p.name)};const active=new Set(indPeople().map(p=>p.name));indDrafts[key].names=indDrafts[key].names.filter(n=>active.has(n));return indDrafts[key];}
function indToggle(key,index){if(indBusy[key]||indPending[key])return;const name=indPeople()[index]?.name;if(!name)return;const d=indDraft(key);d.names=d.names.includes(name)?d.names.filter(n=>n!==name):[...d.names,name];renderIndividualGame(key);}
function indMove(key,index,delta){if(indBusy[key]||indPending[key])return;const d=indDraft(key),next=index+delta;if(next<0||next>=d.names.length)return;[d.names[index],d.names[next]]=[d.names[next],d.names[index]];renderIndividualGame(key);}
async function indRun(key,action,fields={}){
 if(!IND_KEYS.includes(key)||indBusy[key]||!ACTIVE_CLUB)return;
 if(!navigator.onLine||!window.firestoreApi?.transactIndividualGame){showToast('Zum Spielen bitte verbinden','error');return;}
 const club=ACTIVE_CLUB;if(indPending[key]?.club!==club)indPending[key]=null;
 if(!indPending[key])indPending[key]={club,request:{gameKey:key,gameId:fields.gameId||indGet(key).id,expectedRevision:indGet(key).revision,opId:'ind_'+crypto.randomUUID(),now:new Date().toISOString(),eveningStartedAt:currentEveningStartedAt||'',clubName:club,action,...fields}};
 const pending=indPending[key];indBusy[key]=true;renderIndividualGame(key);let rejected=false;
 try{
  if(action==='start'&&typeof saveToFirestore==='function'&&!(await saveToFirestore(false)))throw Error('Teilnehmer konnten nicht synchronisiert werden');
  const result=await window.firestoreApi.transactIndividualGame(getClubFirestoreId(club),pending.request);if(ACTIVE_CLUB!==club)return;
  if(currentEveningStartedAt&&currentEveningStartedAt!==result.eveningStartedAt)return;
  currentEveningStartedAt=result.eveningStartedAt;
  if(Number(result.individualGameRevision)>=Number(individualGameRevision||0)){
    applyIndividualServerStates({[key+'State']:result.state,individualGameLedger:result.ledger,individualGameRevision:result.individualGameRevision,penaltyStatsLog:result.gameStats});
    for(const x of result.counters)applyConfirmedLiveCounter(x.personName,x.category,x.key,x.value);dashboardActiveGame=key;
  }
  indPending[key]=null;persistState();renderAll();if(action==='finish')showToast('Spiel abgeschlossen und Beträge gebucht','success');
 }catch(error){if(ACTIVE_CLUB===club){if(error.code==='individual-game-rejected'){indPending[key]=null;rejected=true;}else pending.error=error.message;showToast(error.message,'error');}}
 finally{indBusy[key]=false;renderIndividualGame(key);}
 if(rejected)await indReload(key);
}
function indAction(key,action,fields={}){if(!indPending[key])return indRun(key,action,fields);}
function indStart(key){const d=indDraft(key);return indRun(key,'start',{gameId:'indgame_'+crypto.randomUUID(),players:d.names,config:KCIndividual.settings(hindernisSettings)});}
function indRetry(key){const p=indPending[key];if(p)return indRun(key,p.request.action);}
async function indReload(key){
 if(indBusy[key]||!ACTIVE_CLUB||!navigator.onLine)return;const club=ACTIVE_CLUB;indBusy[key]=true;renderIndividualGame(key);
 try{const data=await window.firestoreApi.loadClubState(getClubFirestoreId(club));if(ACTIVE_CLUB!==club)return;if(indPending[key]&&data?.[key+'State']?.commands.includes(indPending[key].request.opId)){indBusy[key]=false;return await indRetry(key);}indPending[key]=null;if(data.currentEveningStartedAt!==currentEveningStartedAt){await loadFromFirestore();return;}applyIndividualServerStates(data);}
 catch(error){showToast('Serverstand konnte nicht geladen werden: '+error.message,'error');}finally{indBusy[key]=false;renderIndividualGame(key);}
}
function indReset(key){if(indBusy[key]||indPending[key])return;if(confirm('Neues Spiel vorbereiten? Bereits gebuchte Beträge und Wurfstrafen bleiben erhalten.'))return indRun(key,'reset');}
function indUseAdd(value){indAdd=!!value;renderIndividualGame('siebener');}
function indPlace(column){return indAction('siebener','place',{column,add:indAdd});}
function renderIndividualGames(){indEnsure();for(const key of IND_KEYS)renderIndividualGame(key);renderHurdleSettings();}
function renderIndividualGame(key){
 const setup=document.getElementById(key+'-setup'),box=document.getElementById(key+'-board');if(!setup||!box)return;indEnsure();const s=indGet(key),seven=key==='siebener',pending=indPending[key],busy=!!(indBusy[key]||pending),disabled=busy?'disabled':'';
 setup.classList.toggle('hidden',!!s.id);
 if(!s.id){const d=indDraft(key),valid=d.names.length>=2,config=KCIndividual.settings(hindernisSettings);setup.innerHTML='<h3>Kegler und Reihenfolge wählen</h3><div class="kc-avatar-picker">'+indPeople().map((p,i)=>'<button type="button" class="kc-avatar-option '+(d.names.includes(p.name)?'selected':'')+'" '+disabled+' onclick="indToggle(\''+key+'\','+i+')">'+sixAvatar(p.name)+'</button>').join('')+'</div><div class="ind-order">'+d.names.map((n,i)=>'<div><span>'+(i+1)+'. '+indEscape(n)+'</span><button type="button" '+disabled+' onclick="indMove(\''+key+'\','+i+',-1)">↑</button><button type="button" '+disabled+' onclick="indMove(\''+key+'\','+i+',1)">↓</button></div>').join('')+'</div><p>'+(seven?'Sechs freie Spalten · 10 Cent je Abweichungspunkt · einmal pro Person addieren.':'Ziel '+config.target+' · Grundbetrag '+indEuro(config.baseCents)+' · '+config.rules.filter(r=>r.enabled).length+' aktive Hindernisse. Verteilung unter Spiele → Einstellungen prüfen.')+'</p><button type="button" class="primary-btn" '+(busy||!valid?'disabled':'')+' onclick="indStart(\''+key+'\')">🎳 Spiel starten</button>';}
 let controls='';
 if(s.active&&!s.readyToFinish){
  if(seven&&s.turn.length===2){const name=KCIndividual.current(s),stamp=s.id+'|'+s.index+'|'+s.round;if(indAddStamp!==stamp){indAddStamp=stamp;indAdd=false;}if(s.addUsed[name])indAdd=false;const value=indAdd?s.turn[0]+s.turn[1]:s.turn[0]*s.turn[1];controls='<div class="ind-place"><strong>'+s.turn.join(indAdd?' + ':' × ')+' = '+value+'</strong><label><input type="checkbox" '+(indAdd?'checked ':'')+(s.addUsed[name]||busy?'disabled':'')+' onchange="indUseAdd(this.checked)"> Einmal addieren'+(s.addUsed[name]?' · bereits verwendet':'')+'</label><div class="ind-actions">'+KCIndividual.columns.filter(c=>!Object.hasOwn(s.sheet[name],c)).map(c=>'<button type="button" '+disabled+' onclick="indPlace('+c+')">'+c+'<small>'+indEuro(Math.abs(c-value)*10)+'</small></button>').join('')+'</div></div>';
  }else if(s.pendingChoice)controls='<div class="ind-actions"><strong>Neustart vermeiden?</strong><button type="button" '+disabled+' onclick="indAction(\'hindernis\',\'choose\',{choice:\'reset\'})">Zurück auf 0</button><button type="button" '+disabled+' onclick="indAction(\'hindernis\',\'choose\',{choice:\'pay\'})">1 € zahlen</button></div>';
  else controls='<div class="ind-actions ind-pinpad">'+Array.from({length:9},(_,i)=>'<button type="button" '+disabled+' onclick="indAction(\''+key+'\',\'throw\',{kind:\'pins\',pins:'+(i+1)+'})">'+(i+1)+'</button>').join('')+['miss','gosse','kranz'].map((kind,i)=>'<button type="button" '+disabled+' onclick="indAction(\''+key+'\',\'throw\',{kind:\''+kind+'\'})">'+['Vorbei','Gosse','Kranz ('+(seven?8:12)+')'][i]+'</button>').join('')+'</div>';
 }
 if(s.active)controls+='<div class="ind-actions"><button type="button" '+(busy||!s.history.length?'disabled':'')+' onclick="indAction(\''+key+'\',\'undo\')">↩ Letzte Aktion zurücknehmen</button>'+(s.readyToFinish?'<button type="button" class="primary-btn" '+disabled+' onclick="indAction(\''+key+'\',\'finish\')">🏁 Abschließen und Beträge buchen</button>':'')+'</div>';
 const error=pending?.error?'<div class="tg-error">'+indEscape(pending.error)+'<div class="ind-actions"><button type="button" '+(indBusy[key]?'disabled':'')+' onclick="indRetry(\''+key+'\')">Erneut versuchen</button><button type="button" '+(indBusy[key]?'disabled':'')+' onclick="indReload(\''+key+'\')">Serverstand laden</button></div></div>':'';
 box.innerHTML=error+renderIndividualBoard(s,{controls})+(s.id?'<button type="button" class="secondary-btn" '+disabled+' onclick="indReset(\''+key+'\')">'+(s.finished?'Neues Spiel vorbereiten':'Spiel abbrechen')+'</button>':'');
}
function renderHurdleSettings(){
 const target=document.getElementById('hurdle-target');if(!target)return;const saved=KCIndividual.settings(hindernisSettings),stamp=JSON.stringify(saved);
 if(indSettingsClub!==ACTIVE_CLUB||indSettingsSaved!==stamp){indSettingsClub=ACTIVE_CLUB;indSettingsSaved=stamp;indSettingsDraft=saved;target.value=saved.target;document.getElementById('hurdle-base').value=(saved.baseCents/100).toFixed(2);document.getElementById('hurdle-settings-status').textContent='';}
 document.getElementById('hurdle-rules-edit').innerHTML=indSettingsDraft.rules.map((r,i)=>'<label class="ind-rule-option"><input type="checkbox" '+(r.enabled?'checked':'')+(indSettingsBusy?' disabled':'')+' onchange="indToggleRule('+i+',this.checked)"><strong>'+r.from+(r.to!==r.from?'–'+r.to:'')+'</strong><span>'+indEscape(KCIndividual.ruleLabel(r))+'</span></label>').join('');
 for(const id of ['hurdle-target','hurdle-base','hurdle-save','hurdle-shuffle'])document.getElementById(id).disabled=indSettingsBusy;
}
function indRebuildRules(){const target=Number(document.getElementById('hurdle-target').value);try{indSettingsDraft={...indSettingsDraft,target,rules:KCIndividual.makeRules(target)};renderHurdleSettings();}catch(error){showToast(error.message,'error');}}
function indToggleRule(index,value){if(indSettingsDraft?.rules[index])indSettingsDraft.rules[index].enabled=!!value;}
async function saveHurdleSettings(){
 if(indSettingsBusy||!ACTIVE_CLUB)return false;const target=Number(document.getElementById('hurdle-target').value),text=document.getElementById('hurdle-base').value.replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(text)){showToast('Gültigen Grundbetrag eingeben','error');return false;}const config={...indSettingsDraft,target,baseCents:Math.round(Number(text)*100)};
 if(!KCIndividual.validSettings(config)||target!==indSettingsDraft.target){showToast('Ziel (20–500), Betrag (0–100 €) und Verteilung prüfen','error');return false;}
 const club=ACTIVE_CLUB;hindernisSettings=JSON.parse(JSON.stringify(config));indSettingsBusy=true;persistState();renderIndividualGames();const status=document.getElementById('hurdle-settings-status');status.textContent='Wird gespeichert …';
 try{const saved=navigator.onLine?await saveToFirestore(false):false;if(ACTIVE_CLUB===club)status.textContent=saved?'Für neue Spiele gespeichert.':'Lokal gespeichert. Cloud-Abgleich ausstehend.';return saved;}catch(error){if(ACTIVE_CLUB===club)status.textContent='Lokal gespeichert. Cloud-Abgleich fehlgeschlagen.';return false;}finally{indSettingsBusy=false;renderHurdleSettings();}
}
function openIndividualRules(key){if(key==='hindernis')document.getElementById(key+'-rules-content').innerHTML=KCGameRules.content(key,indGet(key)?.id?indGet(key).config:hindernisSettings);indRulesFocus=document.activeElement;document.getElementById(key+'-rules-modal').classList.remove('hidden');document.getElementById(key+'-rules-close').focus();kcPublishGameRules(key,true);}
function closeIndividualRules(key){kcPublishGameRules(key,false);document.getElementById(key+'-rules-modal').classList.add('hidden');indRulesFocus?.focus();}
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const key of IND_KEYS)if(document.getElementById(key+'-rules-modal')&&!document.getElementById(key+'-rules-modal').classList.contains('hidden'))closeIndividualRules(key);});
