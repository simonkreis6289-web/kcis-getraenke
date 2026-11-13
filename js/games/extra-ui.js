let extraGameStates={},extraGameSettings={},extraSetup={},extraKranzPending=null,extraSettingsStamp='',extraSettingsBusy=false;
function extraGet(key){return extraGameStates[key]||null;}
function extraSet(key,state){extraGameStates[key]=state;}
function extraSnapshot(){return {...Object.fromEntries(KCExtraGames.keys.map(k=>[k+'State',extraGet(k)])),extraGameSettings};}
function extraRestore(data){extraGameStates=Object.fromEntries(KCExtraGames.keys.map(k=>[k,data[k+'State']||null]));extraGameSettings=data.extraGameSettings||{};extraSetup={};}
function extraConfig(key){return KCExtraGames.settings(key,extraGameSettings[key]);}
function extraDraft(key){const stamp=ACTIVE_CLUB+'|'+currentEveningStartedAt;return extraSetup[key]?.stamp===stamp?extraSetup[key]:(extraSetup[key]={stamp,startTeam:key==='parteienspiel'?'':'T1',starter:''});}
function extraStart(key){
 const names=indDraft(key).names,d=extraDraft(key);if(['ballermann','parteienspiel'].includes(key)&&typeof gameSetupCheckGroups==='function'&&!gameSetupCheckGroups(key))return;
 if(key==='parteienspiel'&&!['T1','T2'].includes(d.startTeam))return extraDraw(key);
 return indRun(key,'start',{gameId:'indgame_'+crypto.randomUUID(),players:names,config:extraConfig(key),startTeam:d.startTeam,starter:names.includes(d.starter)?d.starter:names[0]});
}
function extraChooseTeam(team){if(!['T1','T2'].includes(team)||indBusy.ballermann)return;extraDraft('ballermann').startTeam=team;renderIndividualGame('ballermann');}
function extraDraw(key){
 if(indBusy[key]||indPending[key]||indGet(key)?.id)return;if(key==='parteienspiel'&&typeof gameSetupCheckGroups==='function'&&!gameSetupCheckGroups(key))return;const club=ACTIVE_CLUB,stamp=currentEveningStartedAt,d=extraDraft(key),names=indDraft(key).names;
 const teams=['T1','T2'].map((t,i)=>'Gruppe '+(i+1)+' · '+(typeof getGroupLabel==='function'?getGroupLabel(t):t));
 if(typeof openSoloStartDraw!=='function')return;
 openSoloStartDraw({kind:['ballermann','parteienspiel'].includes(key)?'team':'player',subtitle:['ballermann','parteienspiel'].includes(key)?'Welche Seite beginnt?':'Wer beginnt?',players:['ballermann','parteienspiel'].includes(key)?teams:names,title:key==='parteienspiel'?'⚖️ Startseite':key==='ballermann'?'🏖️ Startmannschaft':'🎲 Startspieler',onConfirm:winner=>{
  if(ACTIVE_CLUB!==club||currentEveningStartedAt!==stamp||indGet(key)?.id||indBusy[key]||indPending[key])return;
  const choices=['ballermann','parteienspiel'].includes(key)?teams:indDraft(key).names;
  if(!choices.includes(winner)){showToast('Teilnehmer geändert. Bitte erneut auslosen.','error');return;}
  if(['ballermann','parteienspiel'].includes(key))d.startTeam=teams.indexOf(winner)===0?'T1':'T2';else d.starter=winner;
  return extraStart(key);
 }});
}
function extraThrow(key,kind,pins){
 const s=indGet(key);if(!s?.active||indPending[key]||indBusy[key])return;
 if(kind==='kranz'&&!window.KCKranzUI&&s.config.kranzMode==='choose'){extraKranzPending={key,id:s.id,revision:s.revision,club:ACTIVE_CLUB};document.getElementById('extra-kranz-modal').classList.remove('hidden');document.getElementById('extra-kranz-choices').innerHTML=[1,2,3,4,5,6,7,8,9,12].map(value=>'<button type="button" class="kranz-value-btn'+([8,12].includes(value)?' kranz-value-featured':'')+'" onclick="extraChooseKranz('+value+')" aria-label="Kranz mit '+value+' Holz werten"><strong>'+value+'</strong><span>Holz</span></button>').join('');return;}
 return indAction(key,'throw',{kind,...(kind==='pins'?{pins}:{})});
}
function extraCancelKranz(){extraKranzPending=null;document.getElementById('extra-kranz-modal')?.classList.add('hidden');}
function extraChooseKranz(value){const p=extraKranzPending;extraCancelKranz();if(!p)return;const s=indGet(p.key);if(ACTIVE_CLUB!==p.club||s.id!==p.id||s.revision!==p.revision){showToast('Spielstand geändert. Kranz erneut wählen.','error');return;}return indAction(p.key,'throw',{kind:'kranz',kranzValue:value});}
function renderExtraGame(key){
 const setup=document.getElementById(key+'-setup'),box=document.getElementById(key+'-board');if(!setup||!box)return;const g=KCExtraGames,s=indGet(key),busy=!!(indBusy[key]||indPending[key]),disabled=busy?'disabled':'',d=extraDraft(key),config=extraConfig(key),label=t=>typeof getGroupLabel==='function'?getGroupLabel(t):t;
 setup.classList.toggle('hidden',!!s.id);
 if(!s.id){setup.innerHTML=(typeof gameSetupMarkup==='function'?gameSetupMarkup(key,{busy}):'<p>'+indDraft(key).names.map(indEscape).join(' · ')+'</p>')+(key==='ballermann'?'<div class="ind-actions">'+['T1','T2'].map(t=>'<button type="button" '+disabled+' aria-pressed="'+(d.startTeam===t)+'" onclick="extraChooseTeam(\''+t+'\')">'+indEscape(label(t))+' beginnt</button>').join('')+'</div>':'')+'<div class="ind-actions"><button type="button" '+disabled+' onclick="extraDraw(\''+key+'\')">🎲 '+(key==='parteienspiel'?'Startseite':key==='ballermann'?'Startmannschaft':'Startspieler')+' auslosen</button></div><p>'+(window.KCRoundGames?.keys.includes(key)?window.KCRoundGames.summary(key,config):key==='bergundtal'?config.rounds+' Durchgänge · je zwei Würfe · negative Differenzen zählen':key==='ballermann'?extraClockText(config.seconds*1000)+' je Mannschaft · Gruppe 1 gegen Gruppe 2':key==='guterschnitt'?config.targets.length+' Ziele · '+config.targets.join(' → '):config.slats+' Latten · '+indEuro(config.slatCents)+' je Latte · sofortiges Ende beim ersten vollen Zaun')+(d.starter?' · Start: '+indEscape(d.starter):'')+'</p><button type="button" class="primary-btn" '+(busy||indDraft(key).names.length<2||key==='hochsprung'&&!config.targets.length?'disabled':'')+' onclick="indStart(\''+key+'\')">🎳 Spiel starten</button>';}
 let controls='';
 if(s.active){
  let mayThrow=!s.readyToFinish;if(key==='ballermann')mayThrow=s.timer.running&&(g.remaining(s)>0||!s.timer.lastThrowUsed);
  controls='<div class="extra-controls">';
  if(key==='ballermann'){
   const expired=s.timer.running&&g.remaining(s)===0;
   if(expired)controls+='<p class="ind-help" data-extra-last-throw>'+(!s.timer.lastThrowUsed?'⏱ Zeit abgelaufen · Jetzt noch den letzten Wurf eingeben.':'Letzter Wurf gebucht · Mannschaft wird abgeschlossen.')+'</p><div class="ind-actions"><button type="button" '+disabled+' onclick="indAction(\'ballermann\',\'expire\')">'+(s.phase===0?'Ohne weiteren Wurf zur nächsten Mannschaft':'Ohne weiteren Wurf abschließen')+'</button></div>';
   else controls+='<div class="ind-actions">'+(s.timer.running?'<button type="button" '+disabled+' onclick="indAction(\'ballermann\',\'pause\')">⏸ Zeit pausieren</button>':'<button type="button" class="primary-btn" '+disabled+' onclick="indAction(\'ballermann\',\'timerStart\')">▶ '+indEscape(s.teamNames[g.team(s)])+' · Zeit starten</button>')+'</div>';
  }
  if(mayThrow)controls+='<div class="ind-actions ind-pinpad">'+Array.from({length:9},(_,i)=>'<button type="button" '+disabled+' onclick="extraThrow(\''+key+'\',\'pins\','+(i+1)+')">'+(i+1)+'</button>').join('')+['gosse','miss','kranz'].map((kind,i)=>'<button type="button" '+disabled+' onclick="extraThrow(\''+key+'\',\''+kind+'\')">'+[key==='bergundtal'&&s.config.gutterHigh!==undefined?'Gosse ('+(s.turn.length===0?s.config.gutterHigh:s.config.gutterLow)+')':'Gosse','Vorbei',window.KCKranzUI?KCKranzUI.label(key,s):s.config.kranzMode==='choose'?'Kranz (Wert wählen)':key==='guterschnitt'&&s.config.kranzMode==='target'?'Kranz (Ziel '+s.config.targets[s.scores[g.current(s)]]+')':'Kranz ('+s.config.kranzValue+')'][i]+'</button>').join('')+'</div>';
  controls+='<div class="ind-actions"><button type="button" '+(busy||!s.history.length?'disabled':'')+' onclick="indAction(\''+key+'\',\'undo\')">↩ Letzte Aktion zurücknehmen</button>'+(s.readyToFinish?'<button type="button" class="primary-btn" '+disabled+' onclick="indAction(\''+key+'\',\'finish\')">🏁 Spiel abschließen</button>':'')+'</div></div>';
 }else if(s.finished&&['lattenzaun','guterschnitt',...KCExtraGames.keys.filter(k=>window.KCRoundGames?.keys.includes(k))].includes(key))controls='<div class="extra-controls ind-actions"><button type="button" '+disabled+' onclick="indAction(\''+key+'\',\'undo\')">↩ Letzten Wurf und Abrechnung zurücknehmen</button></div>';
 const p=indPending[key],error=p?.error?'<div class="tg-error">'+indEscape(p.error)+'<button type="button" '+(indBusy[key]?'disabled':'')+' onclick="indRetry(\''+key+'\')">Erneut versuchen</button><button type="button" '+(indBusy[key]?'disabled':'')+' onclick="indReload(\''+key+'\')">Serverstand laden</button></div>':'';
 box.innerHTML=error+renderExtraGameBoard(s,{controls})+(s.id?'<button type="button" class="secondary-btn" '+disabled+' onclick="indReset(\''+key+'\')">'+(s.finished?'Neues Spiel vorbereiten':'Spiel abbrechen')+'</button>':'');
}
function renderExtraSettings(){
 if(typeof renderRoundSettings==='function')renderRoundSettings();
 if(window.KCKranzUI)KCKranzUI.render();
 if(typeof renderRaceKranzSettings==='function')renderRaceKranzSettings();
 const stamp=ACTIVE_CLUB+'|'+JSON.stringify(extraGameSettings);if(stamp===extraSettingsStamp)return;extraSettingsStamp=stamp;
 if(typeof renderGoodCutSettings==='function')renderGoodCutSettings();for(const key of KCExtraGames.keys){if(key==='guterschnitt'||window.KCRoundGames?.keys.includes(key))continue;const c=extraConfig(key);for(const field of ['rounds','seconds','slats','slatCents','kranzValue','gutterHigh','gutterLow']){const el=document.getElementById('extra-'+key+'-'+field);if(el)el.value=field==='slatCents'?(c[field]/100).toFixed(2):c[field];}const mode=document.getElementById('extra-'+key+'-kranzMode');if(mode)mode.value=c.kranzMode==='choose'?'choose':[8,12].includes(c.kranzValue)?String(c.kranzValue):'custom';extraKranzMode(key);}
}
function extraKranzMode(key){const el=document.getElementById('extra-'+key+'-custom');if(el)el.hidden=document.getElementById('extra-'+key+'-kranzMode').value!=='custom';}
async function saveExtraSettings(key){
 if(extraSettingsBusy||!ACTIVE_CLUB)return false;const val=f=>document.getElementById('extra-'+key+'-'+f)?.value,mode=val('kranzMode'),amount=val('slatCents'),c={kranzMode:mode==='choose'?'choose':'fixed',kranzValue:mode==='custom'?Number(val('kranzValue')):mode==='choose'?8:Number(mode),...(key==='bergundtal'?{rounds:Number(val('rounds')),gutterHigh:val('gutterHigh')===''?NaN:Number(val('gutterHigh')),gutterLow:val('gutterLow')===''?NaN:Number(val('gutterLow'))}:key==='ballermann'?{seconds:Number(val('seconds'))}:{slats:Number(val('slats')),slatCents:/^\d+(?:[.,]\d{1,2})?$/.test(amount)?Math.round(Number(amount.replace(',','.'))*100):-1})};
 if(!['8','12','custom','choose'].includes(mode)||!KCExtraGames.validSettings(key,c)){showToast('Einstellungen prüfen: Durchgänge 1–50, Zeit 1–3600 Sekunden, Latten 1–50, Preis 0–0,20 €, Kranz 1–12, Gosse bei Berg und Tal jeweils 0–12.','error');return false;}
 const club=ACTIVE_CLUB;extraGameSettings={...extraGameSettings,[key]:c};extraSettingsBusy=true;persistState();for(const button of document.querySelectorAll('[data-extra-settings-save]'))button.disabled=true;
 try{const saved=navigator.onLine?await saveToFirestore(false):false;if(ACTIVE_CLUB===club)document.getElementById('extra-'+key+'-status').textContent=saved?'Für neue Spiele gespeichert.':'Lokal gespeichert; Cloud-Abgleich ausstehend.';return saved;}catch(error){if(ACTIVE_CLUB===club)document.getElementById('extra-'+key+'-status').textContent='Lokal gespeichert; Cloud-Abgleich fehlgeschlagen.';return false;}finally{extraSettingsBusy=false;for(const button of document.querySelectorAll('[data-extra-settings-save]'))button.disabled=false;renderExtraSettings();}
}
function extraTick(){
 const s=typeof indGet==='function'?indGet('ballermann'):null;if(!s?.id)return;const ms=KCExtraGames.remaining(s);for(const clock of document.querySelectorAll('[data-extra-clock]'))if(clock.dataset.extraClock===s.id){clock.querySelector('[data-extra-time]').textContent=extraClockText(ms);clock.classList.toggle('urgent',s.timer.running&&ms<=10000);clock.querySelector('[data-extra-clock-status]').textContent=s.finished?'Beendet':s.timer.running?(ms>0?'Zeit läuft':s.timer.lastThrowUsed?'Letzter Wurf gebucht':'Zeit abgelaufen · Ein letzter Wurf möglich'):'Bereit · Zeit in der App starten';}
 if(s.active&&s.timer.running&&ms===0&&!s.timer.lastThrowUsed&&!document.querySelector('[data-extra-last-throw]'))renderIndividualGame('ballermann');
 if(s.active&&s.timer.running&&ms===0&&s.timer.lastThrowUsed&&!indBusy.ballermann&&!indPending.ballermann&&navigator.onLine)void indAction('ballermann','expire');
}
setInterval(extraTick,200);window.addEventListener('online',extraTick);document.addEventListener('visibilitychange',extraTick);document.addEventListener('keydown',e=>{if(e.key==='Escape')extraCancelKranz();});
