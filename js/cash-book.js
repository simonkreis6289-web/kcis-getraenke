/* V171: target cash balance from archived fine/fee statements, in cents. */
(() => {
  function money(value) {
    const number=typeof value==='number'?value:Number(String(value??'').replace(',','.'));
    return Number.isFinite(number)?Math.round(number*100):0;
  }
  function date(entry){
    if(entry.eveningStartedAt&&Number.isFinite(Date.parse(entry.eveningStartedAt))){
      const parts=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(entry.eveningStartedAt));
      const get=type=>parts.find(p=>p.type===type).value;return get('year')+'-'+get('month')+'-'+get('day');
    }
    return String(entry.date||entry.closedAt||'').slice(0,10);
  }
  function total(entry){
    if(entry.totals?.grandTotal!=null&&Number.isFinite(Number(entry.totals.grandTotal)))return money(entry.totals.grandTotal);
    return [...(entry.members||[]),...(entry.guests||[])].reduce((sum,p)=>sum+(Number.isSafeInteger(p.chargedCents)?p.chargedCents:money(p.total)),0);
  }
  function summary(entries,settings){
    const config=settings||{},seen=new Set();
    const selected=entries.filter(entry=>{
      if(entry.id&&seen.has(entry.id))return false;
      if(entry.id)seen.add(entry.id);
      if(config.mode==='now'&&config.startAt){
        const stamp=Date.parse(entry.eveningStartedAt||entry.closedAt||entry.date||'');
        return Number.isFinite(stamp)&&stamp>=Date.parse(config.startAt);
      }
      return !config.startDate||date(entry)>=config.startDate;
    });
    const opening=Number.isSafeInteger(config.openingCents)?config.openingCents:0;
    const income=selected.reduce((sum,entry)=>sum+total(entry),0);
    return {opening,income,balance:opening+income,count:selected.length};
  }
  window.KCCashBook=Object.freeze({money,date,total,summary});
})();
let cashBookBusy=false,cashBookDialogClub='',cashBookDialogVersion='';
function cashBookCurrency(cents){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);}
function renderCashBook(){
  const box=document.getElementById('cash-book-summary');if(!box)return;
  const ready=cashHistoryClub===getClubFirestoreId(ACTIVE_CLUB);
  const totals=KCCashBook.summary(ready?cashHistoryEntries:[],cashBookSettings),config=cashBookSettings;
  const start=!config?'Alle gespeicherten Abschlüsse':config.mode==='now'?'Seit '+new Date(config.startAt).toLocaleString('de-DE'):'Seit '+String(config.startDate).split('-').reverse().join('.');
  box.replaceChildren();
  for(const [label,value] of [['Kassenstand (Soll)',ready?cashBookCurrency(totals.balance):'Archiv wird benötigt'],['Startbetrag',cashBookCurrency(totals.opening)],['Abschlüsse seit Neustart',ready?cashBookCurrency(totals.income):'–']]){
    const item=document.createElement('div'),small=document.createElement('span'),strong=document.createElement('strong');
    small.textContent=label;strong.textContent=value;item.append(small,strong);box.append(item);
  }
  document.getElementById('cash-book-period').textContent=start+(ready?' · '+totals.count+' Abschlüsse':'');
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
  if(!confirm('Soll-Kassenstand jetzt auf 0,00 € setzen?\n\nStartbetrag und bisherige Abschlüsse zählen ab jetzt nicht mehr zum Sollstand. Alle archivierten Kegelabende bleiben erhalten.'))return;
  const now=new Date();await storeCashBookSettings({mode:'now',startDate:KCBirthdays.today(now),startAt:now.toISOString(),openingCents:0,updatedAt:now.toISOString()});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCashBookSettings();});
