/* Jahresübersicht mit tatsächlichen Eingängen und getrennter Dauerauftragsplanung; Beträge in Cent. */
(() => {
 const intervals={weekly:{label:'wöchentlich',days:7},fortnightly:{label:'alle 2 Wochen',days:14},fourweekly:{label:'alle 4 Wochen',days:28},monthly:{label:'monatlich',months:1},quarterly:{label:'vierteljährlich',months:3},yearly:{label:'jährlich',months:12}};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const euro=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
 const key=n=>String(n||'').trim().normalize('NFKC').toLocaleLowerCase('de');
 function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&d.getUTCFullYear()>=1900&&d.getUTCFullYear()<=2200?d:null;}
 function today(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),v=t=>p.find(x=>x.type===t).value;return v('year')+'-'+v('month')+'-'+v('day');}
 function validOrder(o){return !!(o&&/^standing_[a-zA-Z0-9_-]{1,100}$/.test(o.id)&&typeof o.personName==='string'&&o.personName.trim()&&o.personName.length<=150&&Number.isSafeInteger(o.amountCents)&&o.amountCents>0&&o.amountCents<=10000000&&Object.hasOwn(intervals,o.interval)&&day(o.startDate)&&(!o.endDate||day(o.endDate)&&o.endDate>=o.startDate));}
 function dueKey(orderId,date){return orderId+'|'+date.slice(0,7);}
 function midnight(date){
  const utc=Date.parse(date+'T00:00:00Z'),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)),v=t=>Number(parts.find(p=>p.type===t).value);
  const shown=Date.UTC(v('year'),v('month')-1,v('day'),v('hour'),v('minute'),v('second'));return new Date(utc-(shown-utc)).toISOString();
 }
 function settleOrders(source={},until=today()){
  if(!day(until))throw Error('Ungültiger Buchungstag');
  const payments=(source.payments||[]).slice(),blocked=new Set(source.suppressedDues||[]),covered=new Set(payments.filter(p=>p.kind==='standing').map(p=>key(p.personName)+'|'+String(p.date).slice(0,7)));let changed=false;
  for(const o of (source.orders||[]).filter(validOrder)){
   // Monatsbeiträge haben stets den Ersten als Buchungstag. Andere Alt-Rhythmen
   // bleiben gespeichert und werden beim nächsten Bearbeiten auf monatlich umgestellt.
   if(o.interval!=='monthly')continue;
   const start=day(o.startDate),last=o.endDate&&o.endDate<until?o.endDate:until;
   for(let i=0;i<3612;i++){
    const date=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+i,1)).toISOString().slice(0,10);if(date>last)break;
    const monthKey=key(o.personName)+'|'+date.slice(0,7);
    if(blocked.has(dueKey(o.id,date))||covered.has(monthKey))continue;
    const id='income_auto_'+o.id.slice(9)+'_'+date;
    if(payments.some(p=>p.id===id))continue;
    payments.push({id,personName:o.personName,amountCents:o.amountCents,date,incurredAt:midnight(date),description:'Dauerauftrag · '+date.slice(0,7).split('-').reverse().join('.'),kind:'standing',orderId:o.id,automatic:true});covered.add(monthKey);changed=true;
   }
  }
  return changed?{...source,payments}:source;
 }
 function planned(o,settings,until=today()){
  if(!validOrder(o)||!day(until))return 0;
  const start=day(o.startDate),rule=intervals[o.interval],lower=settings?.mode==='now'&&Number.isFinite(Date.parse(settings.startAt))?today(new Date(settings.startAt)):settings?.startDate||'',upper=o.endDate&&o.endDate<until?o.endDate:until;let count=0;
  for(let i=0;i<16000;i++){
   let due;if(rule.days)due=new Date(start.getTime()+i*rule.days*86400000);else{const month=start.getUTCMonth()+i*rule.months,y=start.getUTCFullYear()+Math.floor(month/12),m=month%12,last=new Date(Date.UTC(y,m+1,0)).getUTCDate();due=new Date(Date.UTC(y,m,Math.min(start.getUTCDate(),last)));}
   const date=due.toISOString().slice(0,10);if(date>upper)break;
   if((!lower||date>=lower)&&!(settings?.mode==='now'&&date===lower))count++;
  }
  return count*o.amountCents;
 }
 function model(entries,settings,expenses,people,orders,until=today()){
  orders=settleOrders(orders||{},until);
  const book=window.KCCashBook,list=(orders?.orders||[]).filter(validOrder),payments=(orders?.payments||[]).filter(p=>validPayment(p)&&p.date<=until),selected=book.periodEntries(payments,settings),m=book.matrix(entries,settings,[...people,...list.map(o=>({name:o.personName})),...selected.filter(p=>p.personName).map(p=>({name:p.personName}))]),s=book.statement(entries,settings,expenses);
  const rows=m.rows.map(r=>{const plan=r.isGuest||r.unassigned?0:list.filter(o=>key(o.personName)===key(r.name)).reduce((sum,o)=>sum+planned(o,settings,until),0),paid=r.isGuest||r.unassigned?0:selected.filter(p=>p.personName&&key(p.personName)===key(r.name)).reduce((sum,p)=>sum+p.amountCents,0);return {...r,paymentVisible:!people.some(p=>key(p.name)===key(r.name)&&p.showPaymentStatus===false),plan,paid,saldo:paid-r.total,open:Math.max(0,r.total-paid),credit:Math.max(0,paid-r.total)};});
  // Nur der aktuelle aktive Mitgliederbestand zählt, unabhängig von Anwesenheit,
  // Zahlungseingängen und zusätzlichen Archiv-/Dauerauftragsnamen.
  const memberKey=n=>key(String(n||'').trim().replace(/\s+/g,' '));
  const activeNames=new Set(people.filter(p=>!p.inactive&&!p.isGuest&&!p.isDrinksOnly).map(p=>memberKey(p.name)).filter(Boolean));
  const activeRows=rows.filter(r=>!r.isGuest&&!r.unassigned&&activeNames.has(memberKey(r.name)));
  const averageCount=activeRows.length,columns=m.columns.map((column,i)=>({...column,averageTotal:activeRows.length?Math.round(activeRows.reduce((sum,r)=>sum+(r.values[i]??0),0)/activeRows.length):null})),averageTotal=averageCount?Math.round(activeRows.reduce((sum,r)=>sum+r.total,0)/averageCount):null;
  for(const r of rows)r.deviation=averageTotal!==null&&activeRows.includes(r)?r.total-averageTotal:null;
  const paid=selected.reduce((sum,p)=>sum+p.amountCents,0);
  return {...m,columns,rows,averageTotal,averageCount,paymentHidden:rows.some(r=>r.paymentVisible===false),summary:{...s,received:paid,actualBalance:s.opening+paid-s.spending},paid,saldo:rows.reduce((sum,r)=>sum+r.saldo,0),planned:rows.reduce((a,r)=>a+r.plan,0),open:rows.reduce((a,r)=>a+r.open,0),credit:rows.reduce((a,r)=>a+r.credit,0),until,period:!settings?'Alle gespeicherten Abschlüsse':settings.mode==='now'?'Seit '+new Date(settings.startAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):'Seit '+settings.startDate.split('-').reverse().join('.')};
 }
 function averageLabel(m){return 'Durchschnitt aus '+m.averageCount+' aktiven Mitgliedern · Strafen und Monatsbeiträge; ohne Gäste und inaktive Mitglieder.';}
 function deviationCell(r){
  if(r.deviation===null||r.deviation===undefined)return '<td class="cash-year-deviation cash-deviation-neutral" title="Kein Vergleich: nur aktive Mitglieder">—</td>';
  const value=r.deviation,kind=value>0?'above':value<0?'below':'neutral';
  return '<td class="cash-year-deviation cash-deviation-'+kind+'" title="'+(value>0?'Über dem Durchschnitt':value<0?'Unter dem Durchschnitt':'Genau im Durchschnitt')+'">'+(value>0?'+':'')+euro(value)+'</td>';
 }
 function eveningCell(value,row,column){
  if(value===null)return '<td>—</td>';
  const average=column.averageTotal,compared=row.deviation!==null&&row.deviation!==undefined&&average!==null&&average!==undefined,diff=compared?value-average:0;
  return '<td class="cash-year-evening"><strong class="cash-evening-amount">'+euro(value)+'</strong>'+(compared?'<small class="cash-evening-comparison">Schnitt '+euro(average)+' | <span class="cash-deviation-'+(diff>0?'above':diff<0?'below':'neutral')+'">'+(diff>0?'+':'')+euro(diff)+'</span></small>':'')+'</td>';
 }
 function table(m){
  const seen=new Map(),counts=new Map();for(const c of m.columns)seen.set(c.date,(seen.get(c.date)||0)+1);
  const heads=m.columns.map(c=>{const n=(counts.get(c.date)||0)+1;counts.set(c.date,n);return '<th scope="col">'+esc(c.date.split('-').reverse().join('.'))+(seen.get(c.date)>1?'<small>Abschluss '+n+'</small>':'')+(c.kind==='cancelled'?'<span class="cash-cancelled" title="Ausgefallen" aria-label="Ausgefallen">✕</span>':'')+'</th>';}).join('');
  const rows=m.rows.map(r=>'<tr'+(r.unassigned?' class="cash-year-unassigned"':'')+'><th scope="row">'+esc(r.name)+(r.isGuest?'<small>Gastkegler</small>':'')+'</th>'+r.values.map((v,i)=>eveningCell(v,r,m.columns[i])).join('')+'<td class="cash-year-sum">'+euro(r.total)+'</td>'+deviationCell(r)+'<td class="cash-year-paid">'+(r.paymentVisible===false?'*':euro(r.paid))+'</td><td class="cash-plan-open '+(r.paymentVisible===false?'cash-masked':r.saldo<0?'cash-negative':'cash-positive')+'">'+(r.paymentVisible===false?'*':euro(r.saldo))+'</td></tr>').join('');
  return '<table class="cash-year-table"><caption>Abgerechnete Strafen und Monatsbeiträge je Person und Termin</caption><thead><tr><th scope="col">Name</th>'+heads+'<th scope="col">Gesamt</th><th scope="col">Differenz zum Ø<small>aktive Mitglieder</small></th><th scope="col">Bisher bezahlt</th><th scope="col">Bezahlstatus<small>− offen / + Guthaben</small></th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th scope="row">Gesamt je Termin</th>'+m.columns.map(c=>'<td>'+euro(c.total)+'</td>').join('')+'<td>'+euro(m.income)+'</td><td class="cash-year-average" title="'+esc(averageLabel(m))+'"><small>Ø Gesamt</small><strong>'+(m.averageTotal===null?'—':euro(m.averageTotal))+'</strong></td><td>'+(m.paymentHidden?'*':euro(m.rows.reduce((s,r)=>s+r.paid,0)))+'</td><td>'+(m.paymentHidden?'*':euro(m.saldo))+'</td></tr></tfoot></table><p class="cash-average-note">'+esc(averageLabel(m))+'</p>';
 }
 function summary(m){return [['Kassenstand (Soll)',m.summary.balance],['Startbetrag',m.summary.opening],['Strafen & Beiträge',m.summary.income],['Ausgaben',m.summary.spending],['Bisher eingegangen',m.paid],['Kassenstand (Ist)',m.summary.actualBalance],['Durchschnitt Gesamt',m.averageTotal]].map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+((label==='Bisher eingegangen'||label==='Kassenstand (Ist)')&&m.paymentHidden?'*':value===null?'—':euro(value))+'</strong></div>').join('');}
 function validPayment(p){return !!(p&&/^income_[a-zA-Z0-9_-]{1,120}$/.test(p.id)&&typeof p.personName==='string'&&p.personName.length<=150&&Number.isSafeInteger(p.amountCents)&&p.amountCents>0&&p.amountCents<=10000000&&day(p.date)&&typeof p.description==='string'&&p.description.trim()&&p.description.length<=300&&['single','standing'].includes(p.kind)&&(!p.orderId||/^standing_[a-zA-Z0-9_-]{1,100}$/.test(p.orderId)));}
 window.KCCashOverview=Object.freeze({intervals,validOrder,validPayment,planned,settleOrders,dueKey,midnight,model,table,summary,today,esc,euro,key,averageLabel});
})();
