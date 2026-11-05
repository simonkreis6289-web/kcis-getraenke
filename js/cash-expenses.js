/* Abschlussgebühr und sonstige Ausgaben. Bahngebühren gehören genau zu einem Abschluss. */
let strafenCloseDraft=null,strafenCloseBusy=false;
let cashExpenseDraft=null,cashExpenseBusy=false;

function parseCashExpenseAmount(value,allowZero=false){
  const text=String(value??'').trim();
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw new Error('Bitte einen gültigen Eurobetrag mit höchstens zwei Nachkommastellen eingeben.');
  const cents=KCCashBook.money(text);
  if(!Number.isSafeInteger(cents)||cents<0||(!allowZero&&cents===0))throw new Error(allowZero?'Bitte einen Betrag ab 0 € eingeben.':'Bitte einen Betrag größer als 0 € eingeben.');
  return cents;
}

async function openStrafenCloseDialog(){
  if(strafenCloseBusy||!ACTIVE_CLUB)return;
  const missing=getMissingMemberStatuses();
  if(missing.length){showToast('Status fehlt: '+missing.join(', '),'error');return;}
  if(!navigator.onLine||!window.firestoreApi?.saveStrafenClosure){showToast('Für den Abschluss bitte eine Verbindung herstellen.','error');return;}
  const club=ACTIVE_CLUB,startedAt=currentEveningStartedAt||'',date=KCBirthdays.today();
  const archiveId='strafen_abend_'+String(startedAt||date).replace(/[^a-zA-Z0-9_-]/g,'_');
  strafenCloseBusy=true;
  try{
    const seconds=getBahnElapsedSeconds(),calculatedCents=KCCashBook.money(calcBahnPreis(seconds));
    const existing=await window.firestoreApi.loadArchivedStrafenEvent(getClubFirestoreId(club),archiveId);
    if(ACTIVE_CLUB!==club||(currentEveningStartedAt||'')!==startedAt)throw new Error('Kegelabend wurde gewechselt. Bitte erneut öffnen.');
    strafenCloseDraft={club,startedAt,archiveStartedAt:existing?.eveningStartedAt||startedAt||new Date().toISOString(),archiveId,seconds,calculatedCents,rate:bahnPreisProStunde,
      revision:existing?(existing.ledgerRevision||0):null,safeName:getSafePdfClubName()};
    document.getElementById('close-lane-fee').value=((existing?.laneCostCents??calculatedCents)/100).toFixed(2);
    document.getElementById('close-lane-calculation').textContent='Aktuell berechnet: '+cashBookCurrency(calculatedCents)+' · '+formatDuration(seconds)+' · '+Math.ceil(seconds/3600)+' angefangene Stunden à '+cashBookCurrency(KCCashBook.money(bahnPreisProStunde))+'. Den endgültigen Betrag kannst du ändern.';
    document.getElementById('close-lane-excluded').checked=!!existing?.laneExpenseExcluded;
    document.getElementById('close-lane-excluded-label').hidden=!existing?.laneExpenseExcluded;
    document.getElementById('close-lane-existing').textContent=existing?'Dieser Abend ist bereits abgeschlossen. PDF und Bahngebühr werden aktualisiert; es entsteht keine zweite Ausgabe.':'';
    document.getElementById('str-closure-modal').classList.remove('hidden');
    document.getElementById('close-lane-fee').focus();
  }catch(error){console.error(error);showToast('Abschluss konnte nicht vorbereitet werden: '+error.message,'error');}
  finally{strafenCloseBusy=false;}
}
function closeStrafenCloseDialog(){
  if(strafenCloseBusy)return;
  strafenCloseDraft=null;document.getElementById('str-closure-modal')?.classList.add('hidden');
}
async function submitStrafenClose(event){
  event?.preventDefault();const draft=strafenCloseDraft;if(strafenCloseBusy||!draft)return;
  let cents;
  try{cents=parseCashExpenseAmount(document.getElementById('close-lane-fee').value,true);}catch(error){showToast(error.message,'error');return;}
  if(ACTIVE_CLUB!==draft.club||(currentEveningStartedAt||'')!==draft.startedAt){showToast('Kegelabend wurde gewechselt. Bitte erneut öffnen.','error');return;}
  if(!navigator.onLine){showToast('Für den Abschluss bitte eine Verbindung herstellen.','error');return;}
  const missing=getMissingMemberStatuses();if(missing.length){showToast('Status fehlt: '+missing.join(', '),'error');return;}
  strafenCloseBusy=true;let archived=false;
  const controls=[...document.querySelectorAll('#str-closure-modal input, #str-closure-modal button')];controls.forEach(el=>el.disabled=true);
  try{
    const snapshot={...getStrafenSnapshot(),laneCostCents:cents,laneExpenseExcluded:document.getElementById('close-lane-excluded').checked,
      laneElapsedSeconds:draft.seconds,laneHourlyRate:draft.rate,laneCalculatedCents:draft.calculatedCents};
    const pdf=await generateStrafenPDF(snapshot);
    draft.revision=await archiveStrafenEvent(snapshot,draft);archived=true;
    pdf.save(draft.safeName+'_Strafenabrechnung_'+KCBirthdays.today()+'.pdf');
    strafenCloseDraft=null;document.getElementById('str-closure-modal').classList.add('hidden');
    showToast('Strafen-PDF erstellt; Abschluss und Bahngebühr gespeichert','success');
  }catch(error){console.error(error);showToast((archived?'Abschluss gespeichert. PDF bitte erneut erstellen: ':'Abschluss konnte nicht gespeichert werden: ')+error.message,'error');}
  finally{strafenCloseBusy=false;controls.forEach(el=>el.disabled=false);if(archived)await refreshCashHistory();}
}

function allCashExpenses(){return KCCashBook.expenses(cashHistoryEntries,cashExpenseEntries);}
function renderCashExpenses(ready=cashHistoryClub===getClubFirestoreId(ACTIVE_CLUB),start=''){
  const list=document.getElementById('cash-expense-list');if(!list)return;
  document.getElementById('cash-expense-period').textContent=start||document.getElementById('cash-book-period').textContent;
  if(!ready){list.innerHTML='<p class="cash-help">Ausgaben werden mit dem Kassenarchiv geladen.</p>';return;}
  const all=allCashExpenses(),showAll=document.getElementById('cash-expense-filter').value==='all';
  const entries=(showAll?all:KCCashBook.periodEntries(all,cashBookSettings)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  if(!entries.length){list.innerHTML='<p class="cash-help">'+(showAll?'Noch keine Ausgaben vorhanden.':'Keine Ausgaben im aktuellen Kegeljahr.')+'</p>';return;}
  const esc=escapeCashText;
  list.innerHTML='<div class="cash-table-scroller"><table class="cash-table"><thead><tr><th>Datum</th><th>Ausgabe</th><th>Betrag</th><th>Aktionen</th></tr></thead><tbody>'+entries.map(entry=>{
    const id=encodeURIComponent(entry.id).replace(/'/g,'%27');
    return '<tr><td>'+esc(entry.date.split('-').reverse().join('.'))+'</td><td>'+esc(entry.description)+'<small class="cash-expense-source">'+(entry.automatic?'Automatisch aus Kegelabend':'Manuell erfasst')+'</small></td><td>'+cashBookCurrency(entry.amountCents)+'</td><td><div class="cash-entry-actions"><button type="button" class="secondary-btn" onclick="openCashExpense(decodeURIComponent(\''+id+'\'))">✏️ Bearbeiten</button><button type="button" class="cash-delete-btn" onclick="removeCashExpense(decodeURIComponent(\''+id+'\'))">🗑️ Löschen</button></div></td></tr>';
  }).join('')+'</tbody><tfoot><tr><th colspan="2">Summe der angezeigten Ausgaben</th><td>'+cashBookCurrency(entries.reduce((sum,entry)=>sum+entry.amountCents,0))+'</td><td></td></tr></tfoot></table></div>';
}
function openCashExpense(id=''){
  if(cashExpenseBusy||!ACTIVE_CLUB)return;
  if(cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB)){showToast('Bitte das Kassenarchiv zuerst aktualisieren.','error');return;}
  const existing=id?allCashExpenses().find(entry=>entry.id===id):null;
  if(id&&!existing){showToast('Ausgabe nicht mehr vorhanden. Bitte aktualisieren.','error');return;}
  cashExpenseDraft={club:ACTIVE_CLUB,existing,id:existing?.sourceId||'expense_manual_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)),revision:existing?(existing.ledgerRevision||0):null};
  document.getElementById('cash-expense-title').textContent=existing?'Ausgabe bearbeiten':'Ausgabe erfassen';
  document.getElementById('cash-expense-date').value=existing?.date||KCBirthdays.today();
  document.getElementById('cash-expense-date').max=KCBirthdays.today();
  document.getElementById('cash-expense-description').value=existing?.description||'';
  document.getElementById('cash-expense-description').disabled=!!existing?.automatic;
  document.getElementById('cash-expense-amount').value=existing?(existing.amountCents/100).toFixed(2):'';
  document.getElementById('cash-expense-help').textContent=existing?.automatic?'Diese Bahngebühr ist mit dem Abschluss verknüpft. Änderungen gelten auch für eine erneut erstellte PDF; heruntergeladene PDFs bleiben unverändert.':'Diese Ausgabe wird vom Soll-Kassenstand des zugehörigen Kegeljahres abgezogen.';
  document.getElementById('cash-expense-modal').classList.remove('hidden');
  document.getElementById('cash-expense-amount').focus();
}
function closeCashExpense(){if(!cashExpenseBusy){cashExpenseDraft=null;document.getElementById('cash-expense-modal')?.classList.add('hidden');}}
async function saveCashExpenseFromForm(event){
  event?.preventDefault();const draft=cashExpenseDraft;if(cashExpenseBusy||!draft)return;
  if(ACTIVE_CLUB!==draft.club){showToast('Club gewechselt. Bitte erneut öffnen.','error');return;}
  if(!navigator.onLine||!window.firestoreApi?.saveCashExpense){showToast('Zum Speichern bitte eine Verbindung herstellen.','error');return;}
  const date=document.getElementById('cash-expense-date').value,description=document.getElementById('cash-expense-description').value.trim();
  let amountCents;
  try{amountCents=parseCashExpenseAmount(document.getElementById('cash-expense-amount').value,!!draft.existing?.automatic);}catch(error){showToast(error.message,'error');return;}
  if(!KCBirthdays.parse(date)||date>KCBirthdays.today()||!description||description.length>120){showToast('Bitte Datum und Bezeichnung prüfen.','error');return;}
  const incurredAt=draft.existing?.date===date?draft.existing.incurredAt:(date===KCBirthdays.today()?new Date().toISOString():date+'T12:00:00');
  const payload={date,description,amountCents,incurredAt};
  cashExpenseBusy=true;const controls=[...document.querySelectorAll('#cash-expense-modal input, #cash-expense-modal button')];controls.forEach(el=>el.disabled=true);
  try{
    const clubId=getClubFirestoreId(draft.club);
    if(draft.existing?.automatic)await window.firestoreApi.updateLaneExpense(clubId,draft.id,payload,draft.revision);
    else draft.revision=await window.firestoreApi.saveCashExpense(clubId,draft.id,payload,draft.revision);
    cashExpenseDraft=null;document.getElementById('cash-expense-modal').classList.add('hidden');showToast('Ausgabe gespeichert','success');
    if(ACTIVE_CLUB===draft.club)await refreshCashHistory();
  }catch(error){console.error(error);showToast('Ausgabe konnte nicht gespeichert werden: '+error.message,'error');}
  finally{cashExpenseBusy=false;controls.forEach(el=>el.disabled=false);document.getElementById('cash-expense-description').disabled=!!cashExpenseDraft?.existing?.automatic;}
}
async function removeCashExpense(id){
  if(cashExpenseBusy||!ACTIVE_CLUB||cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB))return;
  const entry=allCashExpenses().find(item=>item.id===id);if(!entry)return;
  if(!navigator.onLine){showToast('Zum Löschen bitte eine Verbindung herstellen.','error');return;}
  const detail=entry.automatic?'Der Kegelabend bleibt archiviert. Seine Bahngebühr wird aus den Ausgaben entfernt; vorhandene PDFs bleiben unverändert.':'Die Ausgabe wird dauerhaft entfernt.';
  if(!confirm(entry.description+' ('+cashBookCurrency(entry.amountCents)+') löschen?\n\n'+detail))return;
  cashExpenseBusy=true;const club=ACTIVE_CLUB;
  try{
    const clubId=getClubFirestoreId(club);
    if(entry.automatic)await window.firestoreApi.updateLaneExpense(clubId,entry.sourceId,{remove:true},entry.ledgerRevision||0);
    else await window.firestoreApi.deleteCashExpense(clubId,entry.sourceId,entry.ledgerRevision||0);
    if(ACTIVE_CLUB===club)await refreshCashHistory();showToast('Ausgabe gelöscht','success');
  }catch(error){console.error(error);showToast('Ausgabe konnte nicht gelöscht werden: '+error.message,'error');}
  finally{cashExpenseBusy=false;}
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeStrafenCloseDialog();closeCashExpense();}});
