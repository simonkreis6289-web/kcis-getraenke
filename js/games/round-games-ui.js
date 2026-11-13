function roundAmountCents(value){const text=String(value??'').trim().replace(',','.').replace(/^\./,'0.');return /^\d+(?:\.\d{1,2})?$/.test(text)?Math.round(Number(text)*100):-1;}
function roundSettingsError(key){return ({parteienspiel:'Bitte Runden (1–100) und Vorsprung prüfen.',dreieuro:'Bitte Wurfzahl und Beträge mit höchstens zwei Nachkommastellen prüfen.',ebbeflut:'Bitte eine Rundenzahl von 1 bis 100 eingeben.',hochsprung:'Bitte gültige Spieleinstellungen eingeben. Hürdenanzahl 0–7, Zielzahlen 1–36.',poker:'Bitte maximal tauschbare Würfe zwischen 0 und 5 wählen.',pfaelzer:'Bitte Runden (1–50), Strichbetrag (0–100 €) und Stechwürfe (1–9) prüfen. Beträge wie 0,20 oder ,2 sind erlaubt.',tausend:'Bitte Runden (1–9), Ziel (1–9999) und Gossenwert (0–9) prüfen.'})[key]||'Bitte Spieleinstellungen prüfen.';}
/* Einstellfelder für die vier Rundenspiele, im bestehenden Dropdown. */
let roundSettingsStamp='';
function roundTargetsChanged(){
 const box=document.getElementById('round-hochsprung-targets'),count=Number(document.getElementById('round-hochsprung-count')?.value);if(!box||!Number.isInteger(count)||count<0||count>7)return;
 const old=[...box.querySelectorAll('input')].map(input=>input.value),saved=extraConfig('hochsprung').targets,defaults=KCRoundGames.defaults('hochsprung').targets;
 box.innerHTML=Array.from({length:count},(_,i)=>'<label class="game-settings-field">Hürde '+(i+1)+'<input type="number" id="round-hochsprung-target-'+i+'" min="1" max="36" step="1" value="'+Number(old[i]||saved[i]||defaults[i])+'"></label>').join('');
}
function installRoundSettings(){
 const container=document.querySelector('.game-settings-grid'),tabs=document.getElementById('game-properties-tabs');if(!container||!tabs)return;
 const field=(key,name,label,min,max,money=false)=>'<label class="game-settings-field">'+label+'<input type="number" id="round-'+key+'-'+name+'" min="'+min+'" max="'+max+'" step="'+(money?'.01':'1')+'"></label>';
 for(const key of KCRoundGames.keys){
  if(document.getElementById('round-'+key+'-fields'))continue;
  let panel=document.getElementById('game-property-'+key);if(!panel){panel=document.createElement('section');panel.id='game-property-'+key;panel.dataset.gameProperty=key;panel.className='game-settings-card';panel.hidden=true;panel.setAttribute('role','tabpanel');container.append(panel);}
  const fields=document.createElement('div');fields.id='round-'+key+'-fields';fields.className='round-settings-fields';
  let html='<h3>'+KCRoundGames.icons[key]+' '+KCRoundGames.titles[key]+'</h3>';
  if(key==='parteienspiel')html+='<label class="game-settings-field">Variante<select id="round-parteienspiel-mode"><option value="fixed">Feste Rundenzahl</option><option value="lead">Mindestrunden und Vorsprung</option></select></label>'+field(key,'rounds','Runden / Mindestrunden',1,100)+field(key,'lead','Nötiger Vorsprung (Punkte)',1,10000);
  else if(key==='dreieuro')html+=field(key,'throws','Würfe je Kegler',1,100)+field(key,'startCents','Startbetrag (€)',0,1000,true)+field(key,'pinCents','Abzug je Pin (€)',0,100,true)+field(key,'penaltyCents','Zuschlag bei geworfener 5 / Gosse (€)',0,1000,true);
  else if(key==='ebbeflut')html+=field(key,'rounds','Runden',1,100);
  else if(key==='poker')html+=field(key,'maxExchange','Maximal tauschbare Würfe',0,5);
  else if(key==='pfaelzer')html+=field(key,'rounds','Runden nach der Zahlenvergabe',1,50)+field(key,'strichCents','Betrag pro Strich (€), 0 = ohne Betrag',0,100,true)+field(key,'tieThrows','Würfe pro Stechen',1,9);
  else if(key==='tausend')html+=field(key,'rounds','Runden à drei Würfe',1,9)+field(key,'target','Zielsumme',1,9999)+field(key,'gutterValue','Gossenwert',0,9)+'<p>Rundenfolge: freie Anordnung, rechts nach links, links nach rechts. Bei mehr als drei Runden wiederholt sich die Folge. Kranz zählt hier 0–9.</p>';
  else html+='<label class="game-settings-field">Anzahl Hürden (0–7)<input type="number" id="round-hochsprung-count" min="0" max="7" step="1" onchange="roundTargetsChanged()"></label><div id="round-hochsprung-targets" class="round-targets"></div>'+field(key,'missingPinCents','Betrag je fehlendem Pin (€)',0,100,true)+'<p>0 Hürden: Spielstart deaktiviert. Höchstens drei Würfe pro Hürde. Bei sieben Hürden zählt ein Ausscheiden an der ersten mit Faktor 7, an der letzten mit Faktor 1.</p>';
  fields.innerHTML=html+'<button type="button" class="primary-btn" data-round-settings-save onclick="saveRoundSettings(\''+key+'\')">💾 Einstellungen speichern</button><p id="round-'+key+'-status" role="status"></p>';panel.append(fields);
  if(!tabs.querySelector('[data-game-property-tab="'+key+'"]')){const b=document.createElement('button');b.type='button';b.id='game-property-tab-'+key;b.dataset.gamePropertyTab=key;b.textContent=KCRoundGames.icons[key]+' '+KCRoundGames.titles[key];b.onclick=()=>showGameProperty(key);tabs.append(b);}
 }
}
function renderRoundSettings(){
 installRoundSettings();const stamp=ACTIVE_CLUB+'|'+JSON.stringify(extraGameSettings);if(stamp===roundSettingsStamp)return;roundSettingsStamp=stamp;
 for(const key of KCRoundGames.keys){const c=extraConfig(key);for(const [name,value] of Object.entries(c)){const input=document.getElementById('round-'+key+'-'+name);if(input&&document.activeElement!==input)input.value=name.endsWith('Cents')?(value/100).toFixed(2):value;}
  if(key==='hochsprung'){document.getElementById('round-hochsprung-count').value=c.targets.length;document.getElementById('round-hochsprung-targets').replaceChildren();roundTargetsChanged();}
 }
}
async function saveRoundSettings(key){
 if(extraSettingsBusy||!ACTIVE_CLUB)return false;
 const before=extraConfig(key),value=name=>document.getElementById('round-'+key+'-'+name)?.value,integer=name=>Number(value(name)),cents=name=>roundAmountCents(value(name));
 const config={kranzMode:before.kranzMode,kranzValue:before.kranzValue,...(key==='parteienspiel'?{mode:value('mode'),rounds:integer('rounds'),lead:integer('lead')}:key==='dreieuro'?{throws:integer('throws'),startCents:cents('startCents'),pinCents:cents('pinCents'),penaltyCents:cents('penaltyCents')}:key==='ebbeflut'?{rounds:integer('rounds')}:key==='poker'?{maxExchange:integer('maxExchange')}:key==='pfaelzer'?{rounds:integer('rounds'),strichCents:cents('strichCents'),tieThrows:integer('tieThrows')}:key==='tausend'?{rounds:integer('rounds'),target:integer('target'),gutterValue:integer('gutterValue')}:{targets:Array.from({length:Math.max(0,Math.min(7,integer('count')))},(_,i)=>integer('target-'+i)),missingPinCents:cents('missingPinCents')})};
 if(key==='hochsprung'&&(!Number.isInteger(integer('count'))||integer('count')<0||integer('count')>7)||!KCExtraGames.validSettings(key,config)){showToast(roundSettingsError(key),'error');return false;}
 const club=ACTIVE_CLUB,old=extraGameSettings;extraSettingsBusy=true;extraGameSettings={...extraGameSettings,[key]:config};persistState();
 try{if(!(await saveToFirestore(false)))throw Error('Einstellungen konnten nicht gespeichert werden.');if(club===ACTIVE_CLUB)document.getElementById('round-'+key+'-status').textContent='Für neue Spiele gespeichert.';return true;}
 catch(error){if(club===ACTIVE_CLUB)extraGameSettings=window.KCSharedSync?.server?.extraGameSettings||old;showToast(error.message,'error');return false;}
 finally{extraSettingsBusy=false;roundSettingsStamp='';renderRoundSettings();renderIndividualGame(key);}
}
function openRoundRules(key){
 let overlay=document.getElementById(key+'-rules-modal');if(!overlay){overlay=document.createElement('div');overlay.id=key+'-rules-modal';overlay.className='modal-overlay hidden';overlay.innerHTML='<section class="modal round-rules-modal" role="dialog" aria-modal="true" aria-label="Spielregeln"><h3>'+KCRoundGames.icons[key]+' '+KCRoundGames.titles[key]+'</h3><div data-round-rules-content></div><button type="button" class="secondary-btn" onclick="closeRoundRules(\''+key+'\')">Schließen</button></section>';document.body.append(overlay);}
 const s=indGet(key);overlay.querySelector('[data-round-rules-content]').innerHTML=KCGameRules.content(key,s?.id?s.config:extraConfig(key));overlay.classList.remove('hidden');kcPublishGameRules(key,true);overlay.querySelector('button').focus();
}
function closeRoundRules(key){document.getElementById(key+'-rules-modal')?.classList.add('hidden');kcPublishGameRules(key,false);}
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const key of KCRoundGames.keys){const modal=document.getElementById(key+'-rules-modal');if(modal&&!modal.classList.contains('hidden'))closeRoundRules(key);}});
installRoundSettings();
