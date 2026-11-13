/* Vollflächige Dashboard-Jahresübersicht, unabhängig von den seitlichen Spieltabellen. */
(() => {
 let currentClub='',unsubscribe=null,entries=null,error='',currentState=null,signature='',generation=0,frame=0;
 const box=()=>document.getElementById('cash-dashboard-overlay');
 function fit(){
  frame=0;const overlay=box(),area=document.getElementById('cash-dashboard-scroll'),table=area?.querySelector('table');if(!overlay||overlay.hidden||!table||!area.clientWidth||!area.clientHeight)return;
  const style=getComputedStyle(area),roomW=area.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-4,roomH=area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-4;
  // Die Tabelle behält immer die volle Breite. Bei vielen Zeilen wird nur
  // die Höhe reduziert; eine Zoom-Skalierung würde rechts Leerraum erzeugen.
  table.style.zoom='1';table.style.width='100%';
  const rows=table.querySelectorAll('tr').length,rowHeight=Math.max(16,Math.min(48,(roomH-32)/Math.max(1,rows)));
  table.style.setProperty('--report-row-height',rowHeight+'px');
  table.style.fontSize=Math.max(10,Math.min(20,rowHeight*.46,roomW/Math.max(1,table.querySelector('tr')?.children.length||1)/7))+'px';
 }

 function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
 function reset(){generation++;unsubscribe?.();unsubscribe=null;entries=null;currentClub='';currentState=null;signature='';error='';render();}
 function render(){
  const overlay=box();if(!overlay)return;const visible=!!currentState?.dashboardCashView?.open;overlay.hidden=!visible;
  const main=document.querySelector('main.dashboard'),rules=!!document.getElementById('dashboard-rules-overlay')&&!document.getElementById('dashboard-rules-overlay').hidden;
  if(main){main.toggleAttribute('inert',visible||rules);if(visible||rules)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}
  if(!visible){signature='';return;}
  const area=document.getElementById('cash-dashboard-scroll');
  if(entries===null||error){area.textContent=error||'Jahresübersicht wird geladen …';document.getElementById('cash-dashboard-summary').replaceChildren();document.getElementById('cash-dashboard-period').textContent='';signature='';return;}
  const mode=currentState.dashboardCashView?.mode||'cash',view=currentState.dashboardCashView||{},range={custom:view.custom===true,from:view.from||'',to:view.to||''};
  const labels={cash:'📊 Jahresübersicht & Kasse',summary:'🎳 Abendzusammenfassung',penalties:'📊 Strafen- und Wurfstatistik',drinks:'🍻 Getränkestatistik',games:'🎮 Spielstatistik'};
  document.getElementById('cash-dashboard-title').textContent=labels[mode]||labels.cash;
  let html='',summary='',period='';
  try{
   if(mode==='cash'){
    const m=window.KCCashOverview.model(entries.filter(e=>e.category==='strafen'),currentState.cashBookSettings,entries.filter(e=>e.category==='expense'),currentState.persons||[],currentState.cashStandingOrders);
    html=window.KCCashOverview.table(m);summary=window.KCCashOverview.summary(m);period=m.period;
   }else if(mode==='summary'){
    const value=window.KCActivityReports.evening(currentState);html=value.html;summary=value.summary;period='Aktueller Abend · laufender Stand';
   }else if(mode==='drinks'){
    const data=window.KCActivityReports.drinkData(entries),rows=window.KCActivityReports.drinkSummary(data,{...range,settings:currentState.penaltyStatsSettings?.drinks,people:currentState.persons||[]});
    html=window.KCActivityReports.table(rows,[...data.catalog.map(d=>({...d,drink:true})),{key:'units',label:'Getränke gesamt'},{key:'cents',label:'Betrag inkl. Runden / Teams',money:true}],'Nur archivierte Getränkeabschlüsse');
   }else{
    const rows=mode==='games'?window.KCActivityReports.games(currentState,entries,range):window.KCActivityReports.penaltyRows(currentState,entries,range);
    html=window.KCActivityReports.table(rows,mode==='games'?[{key:'played',label:'Spiele'},{key:'won',label:'Siege'},...window.KCActivityReports.penaltyColumns]:window.KCActivityReports.penaltyColumns,'Nur PDF-Abschlüsse und nachgetragene Abende');
   }
   if(!period){const settings=mode==='drinks'?currentState.penaltyStatsSettings?.drinks:currentState.penaltyStatsSettings;period=range.custom?'Zeitraum: '+(range.from||'Anfang')+' bis '+(range.to||'heute'):settings?.mode==='now'?'Zählbeginn: '+new Date(settings.startAt).toLocaleString('de-DE'):settings?.startDate?'Seit '+settings.startDate.split('-').reverse().join('.'):'Gesamte gespeicherte Historie';}
  }catch(e){html='<p>'+window.KCActivityReports.esc(e.message)+'</p>';}
  const stamp=JSON.stringify({html,summary,period});if(signature===stamp)return;signature=stamp;
  document.getElementById('cash-dashboard-summary').innerHTML=summary;area.innerHTML=html;document.getElementById('cash-dashboard-period').textContent=period;
  const note=overlay.querySelector('.cash-dashboard-note');if(note)note.textContent=mode==='cash'?'Bisher bezahlt = gebuchte Eingänge. Rotes Minus = offen, positiver Saldo = Guthaben. Daueraufträge sind bis zur Buchung eine Planung.':mode==='summary'?'Vorschau des laufenden Kegelabends. Diese Anzeige löst keinen Abschluss und keine Buchung aus.':'Die Statistik berücksichtigt ausschließlich abgerechnete und nachgetragene Abende. Testabende zählen nicht.';
  schedule();
 }
 function update(state,club){
  if(!state?.dashboardCashView?.open){if(currentClub||currentState)reset();else render();return;}
  if(currentClub!==club){reset();currentClub=club;currentState=state;const epoch=generation;
   if(!window.firestoreApi?.subscribeCashBookEntries){error='Archivzugriff nicht verfügbar. Dashboard bitte aktualisieren.';render();return;}
   try{unsubscribe=window.firestoreApi.subscribeCashBookEntries(club,values=>{if(epoch!==generation||club!==currentClub)return;entries=values;error='';render();},()=>{if(epoch!==generation)return;error='Archiv konnte nicht geladen werden. Ansicht in der App schließen und erneut öffnen.';render();});}catch(e){error='Archiv konnte nicht geladen werden. Ansicht in der App schließen und erneut öffnen.';}
  }
  currentState=state;render();
 }
 window.KCCashDashboard=Object.freeze({update,reset,fit});window.addEventListener('resize',schedule);document.addEventListener('fullscreenchange',schedule);document.fonts?.ready?.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
 if(typeof ResizeObserver==='function'){const area=document.getElementById('cash-dashboard-scroll');if(area)new ResizeObserver(schedule).observe(area);}
 setInterval(()=>{if(currentState?.dashboardCashView?.open)render();},60000);
})();
