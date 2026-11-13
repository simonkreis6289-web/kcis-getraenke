/* Kassenstand und Jahresübersicht aus denselben archivierten Abschlüssen, in Cent. */
(() => {
  function money(value) {
    const number=typeof value==='number'?value:Number(String(value??'').replace(',','.'));
    return Number.isFinite(number)?Math.round(number*100):0;
  }
  function date(entry){
    if(entry.category==='expense')return String(entry.date||'').slice(0,10);
    if(entry.eveningStartedAt&&Number.isFinite(Date.parse(entry.eveningStartedAt))){
      const parts=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(entry.eveningStartedAt));
      const get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');
    }
    return String(entry.date||entry.closedAt||'').slice(0,10);
  }
  function total(entry){
    if(entry.totals?.grandTotal!=null&&Number.isFinite(Number(entry.totals.grandTotal)))return money(entry.totals.grandTotal);
    return [...(entry.members||[]),...(entry.guests||[])].reduce((sum,p)=>sum+personTotal(p),0);
  }
  function personTotal(person){
    if(Number.isSafeInteger(person.chargedCents))return person.chargedCents;
    if(person.total!=null&&Number.isFinite(Number(person.total)))return money(person.total);
    return (Number.isSafeInteger(person.penaltyCents)?person.penaltyCents:money(person.penaltyTotal))+
      (Number.isSafeInteger(person.feeCents)?person.feeCents:money(person.monthlyFee));
  }
  function periodEntries(entries,settings){
    const config=settings||{},seen=new Set();
    return entries.filter(entry=>{
      if(entry.id&&seen.has(entry.id))return false;
      if(entry.id)seen.add(entry.id);
      if(config.mode==='now'&&config.startAt){
        const stamp=Date.parse(entry.incurredAt||entry.eveningStartedAt||entry.closedAt||entry.date||'');
        return Number.isFinite(stamp)&&stamp>=Date.parse(config.startAt);
      }
      return !config.startDate||date(entry)>=config.startDate;
    });
  }
  function summary(entries,settings){
    const config=settings||{},selected=periodEntries(entries,config);
    const opening=Number.isSafeInteger(config.openingCents)?config.openingCents:0;
    const income=selected.reduce((sum,entry)=>sum+total(entry),0);
    return {opening,income,balance:opening+income,count:selected.length};
  }
  function matrix(entries,settings,roster=[]){
    const columns=periodEntries(entries,settings).map(entry=>({id:entry.id||'',date:date(entry),kind:entry.kind||'',total:total(entry),entry}))
      .sort((a,b)=>a.date.localeCompare(b.date)||String(a.entry.eveningStartedAt||a.entry.closedAt||'').localeCompare(String(b.entry.eveningStartedAt||b.entry.closedAt||''))||a.id.localeCompare(b.id));
    const byName=new Map();
    function rowFor(person,isGuest){
      const name=String(person.name||'').trim().replace(/\s+/g,' ');
      const key=(isGuest?'guest:':'member:')+name.normalize('NFKC').toLocaleLowerCase('de');
      if(!byName.has(key))byName.set(key,{name:name||'Ohne Namen',isGuest,values:columns.map(()=>null),total:0});
      return byName.get(key);
    }
    roster.filter(p=>!p.isGuest&&!p.isDrinksOnly&&!p.inactive).forEach(p=>rowFor(p,false));
    const remainder=columns.map(()=>null);
    columns.forEach((column,index)=>{
      let assigned=0;
      for(const [people,isGuest] of [[column.entry.members||[],false],[column.entry.guests||[],true]]){
        for(const person of people){
          const value=personTotal(person),row=rowFor(person,isGuest);
          row.values[index]=(row.values[index]??0)+value;row.total+=value;assigned+=value;
        }
      }
      if(column.total!==assigned)remainder[index]=column.total-assigned;
    });
    const rows=[...byName.values()].sort((a,b)=>Number(a.isGuest)-Number(b.isGuest)||a.name.localeCompare(b.name,'de',{sensitivity:'base'}));
    if(remainder.some(value=>value!==null))rows.push({name:'Nicht zugeordnet',unassigned:true,isGuest:false,values:remainder,total:remainder.reduce((sum,value)=>sum+(value||0),0)});
    return {columns:columns.map(({entry,...column})=>column),rows,income:columns.reduce((sum,column)=>sum+column.total,0)};
  }
  function expenses(archives,manual=[]){
    const automatic=periodEntries(archives,null).filter(entry=>entry.id&&!entry.laneExpenseExcluded&&Number.isSafeInteger(entry.laneCostCents)&&entry.laneCostCents>=0).map(entry=>({
      id:'lane:'+entry.id,sourceId:entry.id,automatic:true,category:'expense',description:'Bahngebühr',
      date:entry.laneExpenseDate||date(entry),incurredAt:entry.laneExpenseIncurredAt||entry.eveningStartedAt||entry.closedAt||entry.date,
      amountCents:entry.laneCostCents,ledgerRevision:entry.ledgerRevision||0
    }));
    return [...automatic,...periodEntries(manual,null).filter(entry=>entry.category==='expense'&&Number.isSafeInteger(entry.amountCents)&&entry.amountCents>0).map(entry=>({...entry,automatic:false,sourceId:entry.id}))];
  }
  function statement(archives,settings,manual=[]){
    const income=summary(archives,settings),selected=periodEntries(expenses(archives,manual),settings);
    const spending=selected.reduce((sum,entry)=>sum+entry.amountCents,0);
    return {...income,spending,expenseCount:selected.length,balance:income.balance-spending};
  }
  window.KCCashBook=Object.freeze({money,date,total,personTotal,periodEntries,summary,matrix,expenses,statement});
})();
let cashBookBusy=false,cashBookDialogClub='',cashBookDialogVersion='';
function cashBookCurrency(cents){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);}
function renderCashBook(){
  const box=document.getElementById('cash-book-summary');if(!box)return;
  const ready=cashHistoryClub===getClubFirestoreId(ACTIVE_CLUB);
  const totals=KCCashBook.statement(ready?cashHistoryEntries:[],cashBookSettings,ready?cashExpenseEntries:[]),config=cashBookSettings;
  const start=!config?'Alle gespeicherten Abschlüsse':config.mode==='now'?'Seit '+new Date(config.startAt).toLocaleString('de-DE'):'Seit '+String(config.startDate).split('-').reverse().join('.');
  const actual=window.KCCashOverview?.model(ready?cashHistoryEntries:[],cashBookSettings,ready?cashExpenseEntries:[],persons,typeof cashAccountingOrders==='undefined'?null:cashAccountingOrders);
  box.replaceChildren();
  for(const [label,value] of [['Kassenstand (Soll)',ready?cashBookCurrency(totals.balance):'Archiv wird benötigt'],['Startbetrag',cashBookCurrency(totals.opening)],['Abschlüsse seit Neustart',ready?cashBookCurrency(totals.income):'–'],['Ausgaben seit Neustart',ready?cashBookCurrency(totals.spending):'–'],['Gebuchte Einnahmen',ready?cashBookCurrency(actual?.paid||0):'–'],['Kassenstand (Ist)',ready?cashBookCurrency(actual?.summary.actualBalance||0):'–']]){
    const item=document.createElement('div'),small=document.createElement('span'),strong=document.createElement('strong');
    small.textContent=label;strong.textContent=value;item.append(small,strong);box.append(item);
  }
  document.getElementById('cash-book-period').textContent=start+(ready?' · '+totals.count+' Abschlüsse · '+totals.expenseCount+' Ausgaben':'');
  renderCashYearOverview(ready,start);
  if(typeof renderCashExpenses==='function')renderCashExpenses(ready,start);
  if(typeof renderCashAccounting==='function')renderCashAccounting();
}

function renderCashYearOverview(ready,start){
  const box=document.getElementById('cash-year-table'),period=document.getElementById('cash-year-period');
  if(!box)return;
  period.textContent=start;
  if(!ready){box.innerHTML='<p class="cash-help">Die Jahresübersicht wird mit dem Archiv geladen.</p>';return;}
  if(window.KCCashOverview){box.innerHTML=window.KCCashOverview.table(window.KCCashOverview.model(cashHistoryEntries,cashBookSettings,cashExpenseEntries,persons,typeof cashAccountingOrders==='undefined'?null:cashAccountingOrders));return;}
  const matrix=KCCashBook.matrix(cashHistoryEntries,cashBookSettings,persons),esc=escapeCashText;
  if(!matrix.columns.length){box.innerHTML='<p class="cash-help">Seit dem Neustart sind noch keine abgeschlossenen Kegelabende vorhanden.</p>';return;}
  const dates=new Map();matrix.columns.forEach(column=>dates.set(column.date,(dates.get(column.date)||0)+1));
  const counters=new Map();
  const headings=matrix.columns.map(column=>{
    const number=(counters.get(column.date)||0)+1;counters.set(column.date,number);
    const day=/^\d{4}-\d{2}-\d{2}$/.test(column.date)?column.date.split('-').reverse().join('.'):'Datum unbekannt';
    return '<th scope="col">'+esc(day)+(dates.get(column.date)>1?'<small>Abschluss '+number+'</small>':'')+(column.kind==='cancelled'?'<small>Ausgefallen</small>':'')+'</th>';
  }).join('');
  const rows=matrix.rows.map(row=>'<tr'+(row.unassigned?' class="cash-year-unassigned"':'')+'><th scope="row">'+esc(row.name)+(row.isGuest?'<small>Gastkegler</small>':'')+'</th>'+row.values.map(value=>'<td>'+(value===null?'—':cashBookCurrency(value))+'</td>').join('')+'<td class="cash-year-sum">'+cashBookCurrency(row.total)+'</td></tr>').join('');
  box.innerHTML='<table class="cash-year-table"><caption class="cash-help">Abgerechnete Strafen und Monatsbeiträge je Person und Termin</caption><thead><tr><th scope="col">Name</th>'+headings+'<th scope="col">Gesamt</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th scope="row">Gesamt je Termin</th>'+matrix.columns.map(column=>'<td>'+cashBookCurrency(column.total)+'</td>').join('')+'<td>'+cashBookCurrency(matrix.income)+'</td></tr></tfoot></table>'+(matrix.rows.some(row=>row.unassigned)?'<p class="cash-help">„Nicht zugeordnet“ zeigt Beträge älterer Abschlüsse, für die keine passenden Einzelbeträge gespeichert sind.</p>':'');
}

function showBillingTab(key,focus=false){
  const target=document.getElementById('billing-panel-'+key);if(!target)return;
  document.querySelectorAll('[data-billing-tab]').forEach(button=>{
    const selected=button.dataset.billingTab===key;
    button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
    if(selected&&focus)button.focus();
  });
  document.querySelectorAll('[data-billing-panel]').forEach(panel=>panel.hidden=panel!==target);
}
function billingTabKeydown(event){
  const keys=[...document.querySelectorAll('[data-billing-tab]')].map(button=>button.dataset.billingTab),index=keys.indexOf(event.target.dataset.billingTab);
  if(index<0)return;
  const next=event.key==='ArrowRight'?(index+1)%keys.length:event.key==='ArrowLeft'?(index+keys.length-1)%keys.length:event.key==='Home'?0:event.key==='End'?keys.length-1:null;
  if(next===null)return;event.preventDefault();showBillingTab(keys[next],true);
}
function openCashBookSettings(){
  if(!ACTIVE_CLUB||cashBookBusy)return;
  cashBookDialogClub=ACTIVE_CLUB;cashBookDialogVersion=JSON.stringify(cashBookSettings);
  document.getElementById('cash-book-opening').value=((cashBookSettings?.openingCents||0)/100).toFixed(2);
  document.getElementById('cash-book-start-date').value=cashBookSettings?.startDate||KCBirthdays.today();
  document.getElementById('cash-book-start-date').max=KCBirthdays.today();
  document.getElementById('cash-book-keep').disabled=!cashBookSettings;
  document.querySelector('#cash-book-modal input[name="cash-book-mode"][value="'+(cashBookSettings?'keep':'date')+'"]').checked=true;
  updateCashBookMode();document.getElementById('cash-book-modal').classList.remove('hidden');document.getElementById('cash-book-opening').focus();
}
function closeCashBookSettings(){if(!cashBookBusy)document.getElementById('cash-book-modal')?.classList.add('hidden');}
function updateCashBookMode(){
  const mode=document.querySelector('#cash-book-modal input[name="cash-book-mode"]:checked')?.value;
  document.getElementById('cash-book-start-date').disabled=mode!=='date';
  document.getElementById('cash-book-start-date').required=mode==='date';
}
async function storeCashBookSettings(next){
  if(cashBookBusy||!ACTIVE_CLUB)return false;
  if(!navigator.onLine||!window.firestoreApi){showToast('Für Änderungen am Kegeljahr bitte eine Verbindung herstellen.','error');return false;}
  cashBookBusy=true;
  const club=ACTIVE_CLUB,previous=cashBookSettings,previousChange=lastLocalChangeAt;
  const controls=[...document.querySelectorAll('#cash-book-modal button, #cash-book-modal input')];controls.forEach(el=>el.disabled=true);
  try{
    cashBookSettings=next;lastLocalChangeAt=Date.now();
    if(!(await saveToFirestore(false)))throw new Error('Kassenjahr konnte nicht synchronisiert werden');
    persistState();
    if(ACTIVE_CLUB===club)renderCashBook();
    showToast('Kassenjahr und Startbetrag gespeichert','success');return true;
  }catch(error){
    if(ACTIVE_CLUB===club){cashBookSettings=previous;lastLocalChangeAt=previousChange;if(typeof saveClubSystem==='function')saveClubSystem();renderCashBook();}
    console.error(error);showToast('Kassenjahr konnte nicht gespeichert werden. Bitte erneut versuchen.','error');return false;
  }finally{cashBookBusy=false;controls.forEach(el=>el.disabled=false);document.getElementById('cash-book-keep').disabled=!cashBookSettings;updateCashBookMode();}
}
async function saveCashBookSettings(event){
  event?.preventDefault();if(cashBookBusy)return;
  if(cashBookDialogClub!==ACTIVE_CLUB||cashBookDialogVersion!==JSON.stringify(cashBookSettings)){showToast('Das Kassenjahr wurde inzwischen geändert. Bitte das Fenster erneut öffnen.','error');return;}
  const value=document.getElementById('cash-book-opening').value;
  if(!/^\d+(?:[.,]\d{1,2})?$/.test(value)||!Number.isSafeInteger(KCCashBook.money(value))){showToast('Bitte einen gültigen Startbetrag eingeben.','error');return;}
  const mode=document.querySelector('#cash-book-modal input[name="cash-book-mode"]:checked')?.value;
  const startDate=document.getElementById('cash-book-start-date').value;
  if(mode==='date'&&(!KCBirthdays.parse(startDate)||startDate>KCBirthdays.today())){showToast('Bitte ein gültiges Datum bis heute auswählen.','error');return;}
  const now=new Date(),next={...(mode==='keep'?cashBookSettings:{}),openingCents:KCCashBook.money(value),updatedAt:now.toISOString()};
  if(mode!=='keep')Object.assign(next,{mode,startDate:mode==='now'?KCBirthdays.today(now):startDate,startAt:mode==='now'?now.toISOString():''});
  if(await storeCashBookSettings(next))closeCashBookSettings();
}
async function zeroCashBook(){
  if(cashBookBusy||!ACTIVE_CLUB)return;
  if(!confirm('Soll-Kassenstand jetzt auf 0,00 € setzen?\n\nStartbetrag, bisherige Abschlüsse und bisherige Ausgaben zählen ab jetzt nicht mehr zum Sollstand. Alle Abschlüsse und Ausgaben bleiben gespeichert.'))return;
  const now=new Date();await storeCashBookSettings({mode:'now',startDate:KCBirthdays.today(now),startAt:now.toISOString(),openingCents:0,updatedAt:now.toISOString()});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCashBookSettings();});

