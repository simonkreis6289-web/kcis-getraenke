/* Steuerung der Dashboard-Ansicht und geplanter Daueraufträge, getrennt von Zahlungseingängen. */
let cashAccountingClub='',cashAccountingUnsub=null,cashAccountingReady=false,cashAccountingBusy=false,cashAccountingView=null,cashAccountingOrders=null,cashAccountingGeneration=0,cashStandingAutoBusy=false;
function cashAccountingId(prefix){return prefix+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));}
function stopCashAccountingSync(){cashStandingAutoBusy=false;cashAccountingGeneration++;cashAccountingUnsub?.();cashAccountingUnsub=null;cashAccountingClub='';cashAccountingReady=false;cashAccountingView=null;cashAccountingOrders=null;cashAccountingBusy=false;if(typeof cancelCashIncome==='function')cancelCashIncome();document.getElementById('cash-standing-form')?.reset();}
function renderCashAccounting(){
 const button=document.getElementById('cash-dashboard-toggle');if(!button)return;
 const club=ACTIVE_CLUB?getClubFirestoreId(ACTIVE_CLUB):'';
 if(club!==cashAccountingClub){stopCashAccountingSync();cashAccountingClub=club;const epoch=cashAccountingGeneration;
  if(club&&window.firestoreApi?.subscribeToClubState){cashAccountingUnsub=window.firestoreApi.subscribeToClubState(club,state=>{if(club!==cashAccountingClub||epoch!==cashAccountingGeneration)return;const local=window.KCSharedSync?.server;cashAccountingView=Number(local?.dashboardCashView?.revision||0)>=Number(state?.dashboardCashView?.revision||0)?local?.dashboardCashView||state?.dashboardCashView||null:state?.dashboardCashView||null;cashAccountingOrders=Number(local?.cashStandingOrders?.revision||0)>=Number(state?.cashStandingOrders?.revision||0)?local?.cashStandingOrders||state?.cashStandingOrders||null:state?.cashStandingOrders||null;cashAccountingReady=true;renderCashAccounting();if(typeof renderCashBook==='function')renderCashBook();},()=>{if(club===cashAccountingClub&&epoch===cashAccountingGeneration){cashAccountingReady=false;renderCashAccounting();showToast('Abrechnungssteuerung konnte nicht geladen werden.','error');}});}
 }
 if(cashAccountingReady)void ensureCashStandingIncome();
 const open=!!cashAccountingView?.open&&(!cashAccountingView.mode||cashAccountingView.mode==='cash');button.textContent=open?'📺 Jahresübersicht auf Dashboard schließen':'📺 Jahresübersicht auf Dashboard anzeigen';button.setAttribute('aria-pressed',String(open));button.disabled=cashAccountingBusy||!cashAccountingReady;
 const select=document.getElementById('cash-standing-person');if(!select)return;const selected=select.value;
 select.innerHTML='<option value="">Mitglied wählen</option>'+persons.filter(p=>!p.isGuest&&!p.isDrinksOnly).map(p=>'<option value="'+KCCashOverview.esc(p.name)+'">'+KCCashOverview.esc(p.name)+(p.inactive?' (inaktiv)':'')+'</option>').join('');select.value=selected;
 if(typeof renderCashIncome==='function')renderCashIncome();
 const form=document.getElementById('cash-standing-form');for(const el of form.querySelectorAll('input,select,button'))el.disabled=cashAccountingBusy||!cashAccountingReady;
 const start=document.getElementById('cash-standing-start');if(!start.value)start.value=KCCashOverview.today().slice(0,7);
 document.getElementById('cash-standing-list').innerHTML=(cashAccountingOrders?.orders||[]).map(o=>'<div class="cash-standing-row"><span><strong>'+KCCashOverview.esc(o.personName)+'</strong> · '+(window.KCPaymentVisibility?.text(o.personName,KCCashOverview.euro(o.amountCents),persons)||KCCashOverview.euro(o.amountCents))+' '+KCCashOverview.intervals[o.interval].label+'<small>Ab '+o.startDate.split('-').reverse().join('.')+(o.endDate?' bis '+o.endDate.split('-').reverse().join('.'):'')+'</small></span><span class="cash-auto-badge">↻ Automatisch am 1.</span><button type="button" '+(cashAccountingBusy?'disabled':'')+' onclick="deleteCashStandingOrder(\''+o.id+'\')">Entfernen</button></div>').join('')||'<p class="cash-help">Noch keine Daueraufträge hinterlegt.</p>';
}
function selectCashStandingMember(){const o=cashAccountingOrders?.orders?.find(o=>o.personName===document.getElementById('cash-standing-person').value);document.getElementById('cash-standing-amount').value=o?(o.amountCents/100).toFixed(2):'';document.getElementById('cash-standing-interval').value=o?.interval||'monthly';document.getElementById('cash-standing-start').value=(o?.startDate||KCCashOverview.today()).slice(0,7);document.getElementById('cash-standing-end').value=o?.endDate||'';}
async function cashAccountingRequest(method,request){
 if(cashAccountingBusy||!cashAccountingReady||!ACTIVE_CLUB)return false;
 if(!navigator.onLine||!window.firestoreApi?.[method]){showToast('Zum Speichern bitte verbinden.','error');return false;}
 const club=cashAccountingClub,epoch=cashAccountingGeneration;cashAccountingBusy=true;renderCashAccounting();
 try{const result=await window.firestoreApi[method](club,{...request,opId:cashAccountingId('cash_')});if(club!==cashAccountingClub||epoch!==cashAccountingGeneration)return false;if(method==='setCashDashboardView')cashAccountingView=result;else cashAccountingOrders=result;renderCashBook();return true;}
 catch(error){if(club===cashAccountingClub&&epoch===cashAccountingGeneration)showToast(error.message||'Änderung konnte nicht gespeichert werden.','error');return false;}
 finally{if(club===cashAccountingClub&&epoch===cashAccountingGeneration){cashAccountingBusy=false;renderCashAccounting();}}
}
function toggleCashDashboard(){const view=window.KCSharedSync?.server?.dashboardCashView||cashAccountingView;return cashAccountingRequest('setCashDashboardView',{open:!(view?.open&&(!view.mode||view.mode==='cash')),mode:'cash',expectedRevision:Number(view?.revision||0)});}
async function saveCashStandingOrder(event){
 event?.preventDefault();const personName=document.getElementById('cash-standing-person').value,old=cashAccountingOrders?.orders?.find(o=>o.personName===personName),raw=document.getElementById('cash-standing-amount').value;
 const order={id:old?.id||cashAccountingId('standing_'),personName,amountCents:/^\d+(?:[.,]\d{1,2})?$/.test(raw)?KCCashBook.money(raw):0,interval:'monthly',startDate:document.getElementById('cash-standing-start').value.slice(0,7)+'-01',endDate:document.getElementById('cash-standing-end').value};
 if(!KCCashOverview.validOrder(order)){showToast('Bitte Mitglied, gültigen Betrag, Rhythmus und Zeitraum eingeben.','error');return false;}
 const ok=await cashAccountingRequest('updateCashStandingOrders',{action:'upsert',order,expectedRevision:Number(cashAccountingOrders?.revision||0)});if(ok)showToast('Dauerauftrag gespeichert · fällige Monatsbeiträge werden automatisch gebucht.','success');return ok;
}
function deleteCashStandingOrder(id){return cashAccountingRequest('updateCashStandingOrders',{action:'delete',id,expectedRevision:Number(cashAccountingOrders?.revision||0)});}

async function ensureCashStandingIncome(){
 if(cashStandingAutoBusy||cashAccountingBusy||!cashAccountingReady||!cashAccountingClub||!navigator.onLine||!window.firestoreApi?.ensureCashStandingIncome)return false;
 const before=cashAccountingOrders||{},settled=KCCashOverview.settleOrders(before);if(settled===before)return true;
 const target=cashAccountingClub,epoch=cashAccountingGeneration;cashStandingAutoBusy=true;
 try{const value=await window.firestoreApi.ensureCashStandingIncome(target,{opId:cashAccountingId('cash_')});if(target!==cashAccountingClub||epoch!==cashAccountingGeneration)return false;if(Number(value.revision||0)>=Number(cashAccountingOrders?.revision||0))cashAccountingOrders=value;renderCashBook();return true;}
 catch(error){if(target===cashAccountingClub&&epoch===cashAccountingGeneration)showToast('Monatsbuchungen ausstehend: '+error.message,'error');return false;}
 finally{if(target===cashAccountingClub&&epoch===cashAccountingGeneration)cashStandingAutoBusy=false;}
}
if(typeof setInterval==='function')setInterval(()=>void ensureCashStandingIncome(),60000);
window.addEventListener?.('focus',()=>void ensureCashStandingIncome());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void ensureCashStandingIncome();});
