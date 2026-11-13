/* Statistikfilter und TV-Steuerung verwenden dieselben Modelle wie das Dashboard. */
(() => {
 let custom=false,busy=false,club='';
 const R=window.KCActivityReports;
 function state(){return {...(window.KCSharedSync?.server||{}),...getFirestoreState()};}
 function range(){return {custom,from:document.getElementById('drink-stats-from')?.value||'',to:document.getElementById('drink-stats-to')?.value||''};}
 function renderGames(){
  const area=document.getElementById('game-stats-table');if(!area||!ACTIVE_CLUB)return;
  const ready=typeof cashHistoryClub!=='undefined'&&cashHistoryClub===getClubFirestoreId(ACTIVE_CLUB);
  if(!ready){area.innerHTML='<p>Archiv wird geladen …</p>';return;}
  try{const q=getPenaltyStatsRange();area.innerHTML=R.table(R.games(state(),cashHistoryEntries,{custom:penaltyStatsCustom,...q}),[{key:'played',label:'Spiele'},{key:'won',label:'Siege'},...R.penaltyColumns],'Spielstatistik · abgerechnete Abende');}catch(e){area.textContent=e.message;}
 }
 function render(){
  if(!ACTIVE_CLUB)return;if(club!==ACTIVE_CLUB){club=ACTIVE_CLUB;custom=false;for(const id of ['drink-stats-from','drink-stats-to'])if(document.getElementById(id))document.getElementById(id).value='';}
  const area=document.getElementById('drink-stats-table'),start=document.getElementById('drink-stats-start'),settings=penaltyStatsSettings?.drinks;
  if(start&&document.activeElement!==start)start.value=settings?.startDate||KCBirthdays.today();
  const period=document.getElementById('drink-stats-period');if(period)period.textContent=custom?'Freier Zeitraum':settings?.mode==='now'?'Seit '+new Date(settings.startAt).toLocaleString('de-DE') : settings?.startDate?'Seit '+settings.startDate.split('-').reverse().join('.'):'Alle Getränke-PDF-Abschlüsse';
  if(area){if(cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB))area.innerHTML='<p>Getränkeabschlüsse werden geladen …</p>';else try{const data=R.drinkData(drinkHistoryEntries),rows=R.drinkSummary(data,{...range(),settings,people:persons});area.innerHTML=R.table(rows,[...data.catalog.map(d=>({...d,drink:true})),{key:'units',label:'Getränke gesamt'},{key:'cents',label:'Betrag inkl. Runden / Teamspiele',money:true}],'Getränkestatistik · abgerechnete Abende');}catch(e){area.textContent=e.message;}}
  const preview=document.getElementById('evening-summary-preview');if(preview){const report=R.evening(state());preview.innerHTML='<div class="cash-dashboard-summary">'+report.summary+'</div>'+report.html;}
  renderGames();
 }
 function selectRange(mode){custom=mode!=='cycle';const today=KCBirthdays.today(),from=document.getElementById('drink-stats-from'),to=document.getElementById('drink-stats-to');if(mode==='today'){from.value=today;to.value=today;}if(mode==='month'){from.value=today.slice(0,7)+'-01';to.value=today;}if(mode==='all'){from.value='';to.value='';}render();}
 async function reset(mode){
  if(busy||!ACTIVE_CLUB)return false;const startDate=document.getElementById('drink-stats-start').value;
  if(mode==='date'&&!KCBirthdays.parse(startDate)){showToast('Bitte einen gültigen Starttermin wählen.','error');return false;}
  if(mode==='now'&&!confirm('Getränkestatistik ab jetzt auf 0 setzen? Die gespeicherten Abschlüsse bleiben erhalten.'))return false;
  busy=true;const target=ACTIVE_CLUB;try{const value=await firestoreApi.updatePenaltyStatsSettings(getClubFirestoreId(target),{scope:'drinks',id:'stats_'+crypto.randomUUID(),mode,startDate,expectedRevision:Number(penaltyStatsSettings?.drinks?.revision)||0});if(ACTIVE_CLUB!==target)return false;penaltyStatsSettings={...(penaltyStatsSettings||{}),drinks:value};custom=false;persistState();render();showToast('Zählbeginn der Getränke gespeichert.','success');return true;}catch(e){showToast(e.message,'error');return false;}finally{busy=false;}
 }
 async function show(mode){
  if(!ACTIVE_CLUB)return false;const current=KCSharedSync?.server?.dashboardCashView||cashAccountingView||{},q=mode==='drinks'?range():{custom:penaltyStatsCustom,...getPenaltyStatsRange()};
  try{const value=await firestoreApi.setCashDashboardView(getClubFirestoreId(ACTIVE_CLUB),{open:!(current.open&&(current.mode||'cash')===mode),mode,...q,expectedRevision:Number(current.revision)||0,opId:'cash_'+crypto.randomUUID()});cashAccountingView=value;renderCashAccounting();return true;}catch(e){showToast(e.message,'error');return false;}
 }
 window.KCReportApp=Object.freeze({render,renderGames,selectRange,reset,show});
})();
