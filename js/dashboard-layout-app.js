/* Dashboard-Einstellungen werden beim Club gespeichert und direkt zum TV übertragen. */
(() => {
 const M=window.KCDashboardLayout;let draft=null,stamp='',busy=false;
 const host=()=>document.getElementById('dashboard-layout-settings');
 const slotNames={'left-top':'Links oben','left-bottom':'Links unten','right-top':'Rechts oben','right-bottom':'Rechts unten'};
 function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 function preview(r){
  const box=element('div',undefined,'dashboard-layout-preview');box.setAttribute('aria-label','Vorschau der Dashboard-Anordnung');
  for(const side of ['left','stage','right']){
   const occupied=side==='stage'?[]:M.slots.filter(slot=>slot.startsWith(side)&&r.groups[slot].length);if(side!=='stage'&&!occupied.length)continue;
   const column=element('div',undefined,'dashboard-preview-'+side);
   if(side==='stage')column.append(element('span','Spielfeld'));
   else for(const slot of occupied){const item=element('span');item.append(element('b',slotNames[slot]));for(const key of r.groups[slot])item.append(element('small',M.labels[key]+(r.groups[slot].length>1?' · '+r.settings.panels[key].seconds+' s':'')));column.append(item);}box.append(column);
  }return box;
 }
 function duration(id,value,min,max,oninput){const input=element('input');input.type='number';input.id=id;input.min=String(min);input.max=String(max);input.step='1';input.value=String(value);input.disabled=busy;input.oninput=()=>oninput(input.value);return input;}
 function draw(){
  const frame=host();if(!frame||!draft)return;const r=M.resolve(draft);draft=r.settings;
  const open=new Set([...frame.querySelectorAll('details[open]')].map(panel=>panel.dataset.dashboardSection));
  const firstDraw=!frame.firstChild;
  frame.replaceChildren();
  function section(key,title){
   const panel=element('details',undefined,'dashboard-settings-section');
   panel.dataset.dashboardSection=key;
   panel.open=open.has(key)||(firstDraw&&key==='layout');
   const content=element('div',undefined,'dashboard-settings-section-body');
   panel.append(element('summary',title),content);frame.append(panel);return content;
  }
  let box=section('layout','Tabellen und Anordnung');
  box.append(element('p','Anzeigen am selben Platz wechseln automatisch. Die Anzeigedauer gilt je Tabelle. Ist oben oder unten frei, nutzt der belegte Platz die ganze Höhe. Zwei aktivierte Tabellen stehen links.'));
  const rows=element('div',undefined,'dashboard-layout-options');
  for(const key of ['fines','drinks','gutters','seating']){
   const row=element('div',undefined,'dashboard-layout-option'),label=element('label'),check=element('input');check.type='checkbox';check.id='dashboard-show-'+key;check.checked=draft.panels[key].enabled;check.disabled=busy;check.onchange=()=>{draft.panels[key].enabled=check.checked;draw();};label.append(check,document.createTextNode(M.labels[key]));row.append(label);
   const select=element('select');select.id='dashboard-position-'+key;select.setAttribute('aria-label','Position '+M.labels[key]);select.disabled=busy||!check.checked;select.hidden=!check.checked;
   const positions=r.count===1?['left-top','right-top']:r.count===2?['left-top','left-bottom']:M.slots;
   for(const slot of positions){const option=element('option',r.count===1?(slot.startsWith('left')?'Links · volle Höhe':'Rechts · volle Höhe'):slotNames[slot]);option.value=slot;option.selected=slot===draft.panels[key].position;select.append(option);}select.value=draft.panels[key].position;select.onchange=()=>{draft=M.move(draft,key,select.value);draw();};row.append(select);
   const dwell=element('label',undefined,'dashboard-dwell');dwell.hidden=!check.checked;const input=duration('dashboard-seconds-'+key,draft.panels[key].seconds,1,300,v=>draft.panels[key].seconds=v);input.setAttribute('aria-label','Anzeigedauer '+M.labels[key]+' in Sekunden');dwell.append(input,document.createTextNode('Sekunden'));row.append(dwell);rows.append(row);
  }box.append(rows,preview(r));
  for(const [side,title] of [['left','links'],['right','rechts']]){
   const id='dashboard-table-width-'+side,label=element('label',undefined,'dashboard-popup-option');
   label.htmlFor=id;
   label.append(document.createTextNode('Tabellenbreite '+title+' '),duration(id,draft.tableWidth[side],10,35,v=>draft.tableWidth[side]=v),document.createTextNode(' % der Dashboardbreite'));
   box.append(label);
  }
  const fadeLabel=element('label',undefined,'dashboard-popup-option');fadeLabel.htmlFor='dashboard-transition-seconds';const fade=element('input');fade.type='number';fade.id='dashboard-transition-seconds';fade.min='0';fade.max='3';fade.step='0.1';fade.value=String(draft.transitionSeconds);fade.disabled=busy;fade.oninput=()=>draft.transitionSeconds=fade.value;fadeLabel.append(document.createTextNode('Sanfter Tabellenwechsel · Übergangszeit '),fade,document.createTextNode(' Sekunden (0 = sofort, Standard 0,6 s)'));box.append(fadeLabel);
  box=section('player-rows','Spielerzeilen in App und Dashboard');
  box.append(element('p','Gilt für Spieltabellen mit wechselnder Wurfreihenfolge. Mit 0 Sekunden entfällt die jeweilige Pause oder Bewegung.'));
  for(const [key,id,title] of [
   ['holdSeconds','game-row-hold-seconds','Verweildauer nach dem Wurf'],
   ['moveSeconds','game-row-move-seconds','Dauer der Zeilenbewegung']
  ]){
   const label=element('label',undefined,'dashboard-popup-option');
   label.htmlFor=id;
   const input=duration(id,draft.playerRows[key],0,M.rowTimingLimits[key],value=>draft.playerRows[key]=value);
   input.step='0.1';
   label.append(document.createTextNode(title+' '),input,document.createTextNode(' Sekunden'));
   box.append(label);
  }
  box=section('ticker','Laufschriften und eigene Texte');
  const tickerOptions=element('div',undefined,'dashboard-ticker-options');
  const showTicker=element('label',undefined,'dashboard-popup-option'),tickerCheck=element('input');tickerCheck.type='checkbox';tickerCheck.id='dashboard-ticker-enabled';tickerCheck.checked=draft.tickerEnabled;tickerCheck.disabled=busy;tickerCheck.onchange=()=>{draft.tickerEnabled=tickerCheck.checked;draw();};showTicker.append(tickerCheck,document.createTextNode('Laufschrift auf dem Dashboard anzeigen'));tickerOptions.append(showTicker);
  const fontLabel=element('label',undefined,'dashboard-popup-option'),tickerFont=duration('dashboard-ticker-font-size',draft.tickerFontSize,12,30,v=>draft.tickerFontSize=v);fontLabel.htmlFor='dashboard-ticker-font-size';tickerFont.disabled=busy||!draft.tickerEnabled;fontLabel.append(document.createTextNode('Schriftgröße '),tickerFont,document.createTextNode(' px (12 bis 30, Standard 18)'));tickerOptions.append(fontLabel);box.append(tickerOptions);
  const streamBox=element('div',undefined,'dashboard-ticker-stream-settings');
  streamBox.append(element('p','Club-Infos und Bundesliga haben eigene Laufbänder. Je Seite links/rechts positionieren. Liegen beide auf derselben Seite, wechseln sie nach ihren individuellen Anzeigedauern. Eine einzelne Laufschrift nutzt die volle verfügbare Breite.'));
  for(const [key,label] of [['club','🎳 Clubinfos, Termine und Geburtstage'],['football','⚽ Bundesliga-Ergebnisse']]){
   const config=draft.tickerStreams[key],line=element('div',undefined,'dashboard-ticker-stream-row'),toggleLabel=element('label'),toggle=element('input');
   toggle.type='checkbox';toggle.id='dashboard-ticker-stream-'+key;toggle.checked=config.enabled;toggle.disabled=busy||!draft.tickerEnabled;
   toggle.onchange=()=>{config.enabled=toggle.checked;draw();};toggleLabel.append(toggle,document.createTextNode(label));line.append(toggleLabel);
   const position=element('select');position.id='dashboard-ticker-position-'+key;position.disabled=busy||!draft.tickerEnabled||!config.enabled;
   for(const [id,caption] of [['left','Links'],['right','Rechts']]){const option=element('option',caption);option.value=id;position.append(option);}position.value=config.position;position.onchange=()=>{config.position=position.value;draw();};line.append(position);
   const dwell=element('label',undefined,'dashboard-popup-option');dwell.append(document.createTextNode('Wechsel nach '),duration('dashboard-ticker-seconds-'+key,config.seconds,2,120,v=>config.seconds=v),document.createTextNode(' s'));
   dwell.hidden=!config.enabled||!(draft.tickerStreams.club.enabled&&draft.tickerStreams.football.enabled&&draft.tickerStreams.club.position===draft.tickerStreams.football.position);
   line.append(dwell);streamBox.append(line);
  }
  const splitLabel=element('label',undefined,'dashboard-popup-option');splitLabel.append(document.createTextNode('Breite links bei zwei nebeneinanderliegenden Laufbändern: '),duration('dashboard-ticker-left-percent',draft.tickerStreams.leftPercent,25,75,v=>draft.tickerStreams.leftPercent=v),document.createTextNode(' %'));
  splitLabel.hidden=!(draft.tickerStreams.club.enabled&&draft.tickerStreams.football.enabled&&draft.tickerStreams.club.position!==draft.tickerStreams.football.position);
  streamBox.append(splitLabel);box.append(streamBox);
  box.append(element('h3','Farben der Lauftext-Kacheln'),element('p','Jeder Bereich bekommt eine eigene Hintergrundfarbe. Die Textfarbe wird automatisch gut lesbar gewählt.'));
  const palette=element('div',undefined,'dashboard-ticker-palette');
  for(const [key,name] of Object.entries(M.tickerTypes)){
   const label=element('label',undefined,'dashboard-ticker-color-row'),color=element('input');color.type='color';color.id='dashboard-ticker-color-'+key;color.value=draft.tickerColors[key];color.disabled=busy;color.setAttribute('aria-label','Kachelfarbe '+name);color.oninput=()=>{draft.tickerColors[key]=color.value;};label.append(document.createTextNode(name),color);palette.append(label);
  }
  box.append(palette);
  box.append(element('h3','Eigene Laufbandtexte'),element('p','Aktivierte Texte laufen nach den Terminen im Laufband. Bis zu 20 Texte mit jeweils 500 Zeichen.'));
  const messages=element('div',undefined,'dashboard-ticker-messages');
  for(const message of draft.tickerMessages){
   const row=element('div',undefined,'dashboard-ticker-message'),enabled=element('input');enabled.type='checkbox';enabled.checked=message.enabled;enabled.disabled=busy;enabled.setAttribute('aria-label','Text im Laufband anzeigen');enabled.onchange=()=>message.enabled=enabled.checked;
   const text=element('textarea');text.rows=2;text.maxLength=500;text.value=message.text;text.disabled=busy;text.setAttribute('aria-label','Laufbandtext');text.oninput=()=>message.text=text.value;
   const color=element('input');color.type='color';color.className='dashboard-ticker-custom-color';color.value=message.color;color.disabled=busy;color.setAttribute('aria-label','Kachelfarbe für eigenen Lauftext');color.oninput=()=>message.color=color.value;
   const remove=element('button','Löschen','secondary-btn');remove.type='button';remove.disabled=busy;remove.setAttribute('aria-label','Laufbandtext löschen');remove.onclick=()=>{draft.tickerMessages=draft.tickerMessages.filter(m=>m.id!==message.id);draw();};row.append(enabled,text,color,remove);messages.append(row);
  }
  const add=element('button','+ Text hinzufügen','secondary-btn');add.type='button';add.id='dashboard-ticker-add';add.disabled=busy||draft.tickerMessages.length>=20;add.onclick=()=>{draft.tickerMessages.push({id:'text-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),text:'',enabled:true,color:M.tickerPalette[draft.tickerMessages.length%M.tickerPalette.length]});draw();box.querySelector('.dashboard-ticker-message:last-child textarea')?.focus();};box.append(messages,add);
  box=section('notifications','Wurfmeldungen und Toasts');
  box.append(element('h3','Wurf-Popups'));const popupLabel=element('label',undefined,'dashboard-popup-option');popupLabel.htmlFor='dashboard-popup-seconds';popupLabel.append(document.createTextNode('Gosse, Kranz und Alle Neune anzeigen für '),duration('dashboard-popup-seconds',draft.popupSeconds,0,30,v=>draft.popupSeconds=v),document.createTextNode(' Sekunden · 0 = aus'));box.append(popupLabel);
  box.append(element('h3','Lottokönig'));
  for(const [key,title] of [['hit','Animation bei Treffern'],['miss','Animation bei übersprungenen Zielzahlen']]){
   const id='dashboard-lotto-animation-'+key,label=element('label',undefined,'dashboard-popup-option');
   const input=duration(id,draft.lottoAnimations[key],0,M.lottoAnimationMax,value=>draft.lottoAnimations[key]=value);
   input.step='0.1';label.htmlFor=id;
   label.append(document.createTextNode(title+' '),input,document.createTextNode(' Sekunden · 0 = aus'));
   box.append(label);
  }
  box.append(element('h3','Mensch ärgere dich nicht'));
  const menschDuration=element('label',undefined,'dashboard-popup-option');
  menschDuration.htmlFor='dashboard-mensch-popup-seconds';
  menschDuration.append(document.createTextNode('Rauswurf-Popup anzeigen für '),
   duration(menschDuration.htmlFor,draft.menschPopup.seconds,0,30,value=>draft.menschPopup.seconds=value),
   document.createTextNode(' Sekunden · 0 = aus'));
  const menschColor=element('label',undefined,'dashboard-popup-option'),menschPicker=element('input');
  menschPicker.type='color';menschPicker.id='dashboard-mensch-popup-color';menschPicker.value=draft.menschPopup.color;menschPicker.disabled=busy;
  menschPicker.oninput=()=>{draft.menschPopup.color=menschPicker.value;};
  menschColor.htmlFor=menschPicker.id;menschColor.append(document.createTextNode('Hintergrundfarbe des Rauswurf-Popups '),menschPicker);
  box.append(menschDuration,menschColor);
  box.append(element('h3','Weitere TV-Toasts'),element('p','Neue Meldungen erscheinen erst nach einer tatsächlichen Änderung. Beim Öffnen des Dashboards werden alte Ereignisse nicht nachgespielt.'));
  for(const [key,title] of [['arrival','👋 Mitglied/Gast wird als Da markiert'],['departure','🚪 Mitglied/Gast wird als weg markiert'],['round','🍻 Eine Person gibt eine Runde (Prost!)'],['loser','🏅 1., 2. oder 3. Verlierer'],['teamLoss','🏆 Verliererteam'],['station','🍺 KC Theke · Buchungen']]){
   const line=element('div',undefined,'dashboard-event-toast-color-row'),label=element('label',undefined,'dashboard-popup-option'),checkbox=element('input');
   checkbox.type='checkbox';checkbox.checked=draft.eventToasts[key];checkbox.disabled=busy;checkbox.id='dashboard-event-toast-'+key;
   checkbox.onchange=()=>{draft.eventToasts[key]=checkbox.checked;draw();};
   label.append(checkbox,document.createTextNode(title));
   const picker=element('input');picker.type='color';picker.id='dashboard-event-toast-color-'+key;
   picker.value=draft.eventToasts.colors[key];picker.disabled=busy||!draft.eventToasts[key];
   picker.setAttribute('aria-label','Toast-Hintergrundfarbe '+title);
   picker.oninput=()=>{draft.eventToasts.colors[key]=picker.value;};
   line.append(label,picker);box.append(line);
  }
  const eventDuration=element('label',undefined,'dashboard-popup-option');eventDuration.htmlFor='dashboard-event-toast-seconds';
  eventDuration.append(document.createTextNode('Diese Toasts anzeigen für '),duration('dashboard-event-toast-seconds',draft.eventToasts.seconds,0,30,v=>draft.eventToasts.seconds=v),document.createTextNode(' Sekunden · 0 = aus'));box.append(eventDuration);
  box=section('football','Bundesliga');
  box.append(element('p','OpenLigaDB liefert Spielstände und bestätigte Ereignisse. Die angezeigte Spielminute ist eine Schätzung.'));
  for(const [key,name] of [['bl1','1. Bundesliga'],['bl2','2. Bundesliga']]){const label=element('label',undefined,'dashboard-popup-option'),check=element('input');check.type='checkbox';check.checked=draft.football[key];check.disabled=busy;check.onchange=()=>draft.football[key]=check.checked;label.append(check,document.createTextNode(name+' im Laufband anzeigen'));box.append(label);}
  const goalLabel=element('label',undefined,'dashboard-popup-option');goalLabel.append(document.createTextNode('Ereignismeldungen anzeigen für '),duration('dashboard-goal-seconds',draft.football.goalToastSeconds,0,30,v=>draft.football.goalToastSeconds=v),document.createTextNode(' Sekunden · 0 = aus'));box.append(goalLabel);
  box.append(element('h3','Bundesliga-Ereignisse'),element('p','Tor, Halbzeit und Abpfiff aus erkannten Datenänderungen; Anstoßzeit nach Spielplan, nicht als offiziell bestätigter Anpfiff. Karten benötigen eine zusätzliche Live-Ereignisquelle.'));
  for(const [key,label,available] of [['goal','⚽ Tor',true],['kickoff','▶ Geplante Anstoßzeit erreicht',true],['halftime','⏸ Halbzeitstand eingetragen',true],['fulltime','■ Spielende bestätigt',true],['red','🟥 Rote Karte (Datenquelle fehlt)',false],['secondYellow','🟨🟥 Gelb-Rote Karte (Datenquelle fehlt)',false]]){
   const line=element('label',undefined,'dashboard-popup-option'),check=element('input');check.type='checkbox';check.checked=!!draft.football.events[key];check.disabled=busy||!available;check.setAttribute('aria-label',label);check.onchange=()=>draft.football.events[key]=check.checked;line.append(check,document.createTextNode(label));box.append(line);
  }
  box.append(element('h3','🧪 Bundesliga-Testspiel'),element('p','Nur Simulation: BVB gegen Schalke. Starten, Tore buchen und auf dem TV die Laufschrift sowie den Tor-Toast prüfen. Keine echten Ergebnisse oder Strafen werden verändert.'));
  const demoRow=element('div',undefined,'dashboard-layout-actions'),demo=draft.football.demo;
  const makeTestButton=(caption,id,action)=>{const button=element('button',caption,'secondary-btn');button.type='button';button.id=id;button.disabled=busy;button.onclick=async()=>{action();draw();await store();};demoRow.append(button);};
  if(!demo?.active){makeTestButton('▶ Testspiel starten (0:0)','dashboard-demo-start',()=>{draft.football.demo={active:true,id:'demo-'+Date.now().toString(36),league:'bl1',home:0,away:0};});}
  else {
   box.append(element('p','🧪 BVB '+demo.home+':'+demo.away+' Schalke · simuliertes Spiel'));
   makeTestButton('⚽ Tor BVB','dashboard-demo-home',()=>{draft.football.demo.home++;});
   makeTestButton('⚽ Tor Schalke','dashboard-demo-away',()=>{draft.football.demo.away++;});
   makeTestButton('■ Testspiel beenden','dashboard-demo-stop',()=>{draft.football.demo=null;});
  }
  box.append(demoRow);
  box=section('connection','Verbindungsdiagnose');
  const diagnostics=element('dl',undefined,'dashboard-connection-diagnostics');
  for(const [field,label] of [['transport','Übertragungsweg'],['tablet','WebRTC am Tablet'],['tv','WebRTC am TV'],
   ['path','Netzwerkpfad'],['cloud','Firebase'],['pending','Ausstehende Schreibvorgänge'],['confirmed','Letzte bestätigte Speicherung']]){
   const value=element('dd','—');value.dataset.syncDiagnostic=field;diagnostics.append(element('dt',label),value);
  }
  const test=element('button','Verbindung testen','secondary-btn');
  test.id='dashboard-connection-test';test.type='button';test.disabled=true;
  test.onclick=()=>window.KCTabletSync?.testConnection();
  const measurement=element('p','Noch nicht gemessen.');measurement.id='dashboard-connection-result';measurement.setAttribute('role','status');
  box.append(diagnostics,test,measurement);
  window.KCTabletSync?.status();
  const actions=element('div',undefined,'dashboard-layout-actions'),reset=element('button','Standard wiederherstellen','secondary-btn');reset.type='button';reset.disabled=busy;reset.onclick=()=>{draft={...draft,panels:M.defaults().panels};draw();};const save=element('button',busy?'Wird gespeichert …':'💾 Dashboard-Einstellungen speichern','primary-btn');save.type='button';save.id='dashboard-layout-save';save.disabled=busy;save.onclick=store;actions.append(reset,save);const status=element('p');status.id='dashboard-layout-status';status.setAttribute('role','status');frame.append(actions,status);
 }
 function render(){const box=host();if(!box)return;const value=typeof dashboardSettings==='undefined'?null:dashboardSettings,next=String(typeof ACTIVE_CLUB==='undefined'?'':ACTIVE_CLUB)+'|'+JSON.stringify(value);if(next===stamp&&draft)return;stamp=next;draft=M.resolve(value).settings;draw();}
 async function store(){
  if(busy||!ACTIVE_CLUB)return false;if(!navigator.onLine){document.getElementById('dashboard-layout-status').textContent='Zum Übertragen der Einstellungen bitte verbinden.';return false;}
  const before=dashboardSettings,club=ACTIVE_CLUB;dashboardSettings=M.resolve(draft).settings;busy=true;draw();
  try{persistState();if(!(await saveToFirestore(false)))throw Error('Einstellungen konnten nicht bestätigt werden.');if(ACTIVE_CLUB===club){stamp='';render();document.getElementById('dashboard-layout-status').textContent='Gespeichert · wird auf dem Dashboard übernommen.';}return true;}
  catch(error){if(ACTIVE_CLUB===club){dashboardSettings=window.KCSharedSync?.server?.dashboardSettings??before;document.getElementById('dashboard-layout-status').textContent=error.message;}return false;}
  finally{busy=false;stamp='';const message=document.getElementById('dashboard-layout-status')?.textContent;render();if(ACTIVE_CLUB===club)document.getElementById('dashboard-layout-status').textContent=message||'';}
 }
 window.KCDashboardSettingsApp=Object.freeze({render,save:store});render();
})();
