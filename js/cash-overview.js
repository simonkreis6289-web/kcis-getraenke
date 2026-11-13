/* Jahresübersicht mit tatsächlichen Eingängen und getrennter Dauerauftragsplanung; Beträge in Cent. */
(() => {
 const intervals={weekly:{label:'wöchentlich',days:7},fortnightly:{label:'alle 2 Wochen',days:14},fourweekly:{label:'alle 4 Wochen',days:28},monthly:{label:'monatlich',months:1},quarterly:{label:'vierteljährlich',months:3},yearly:{label:'jährlich',months:12}};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const euro=c=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(c/100);
 const key=n=>String(n||'').trim().normalize('NFKC').toLocaleLowerCase('de');
 function day(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s&&d.getUTCFullYear()>=1900&&d.getUTCFullYear()<=2200?d:null;}
 function today(now=new Date()){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),v=t=>p.find(x=>x.type===t).value;return v('year')+'-'+v('month')+'-'+v('day');}
 function validOrder(o){return !!(o&&/^standing_[a-zA-Z0-9_-]{1,100}$/.test(o.id)&&typeof o.personName==='string'&&o.personName.trim()&&o.personName.length<=150&&Number.isSafeInteger(o.amountCents)&&o.amountCents>0&&o.amountCents<=10000000&&Object.hasOwn(intervals,o.interval)&&day(o.startDate)&&(!o.endDate||day(o.endDate)&&o.endDate>=o.startDate));}
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
  const book=window.KCCashBook,list=(orders?.orders||[]).filter(validOrder),payments=(orders?.payments||[]).filter(p=>validPayment(p)&&p.date<=until),selected=book.periodEntries(payments,settings),m=book.matrix(entries,settings,[...people,...list.map(o=>({name:o.personName})),...selected.filter(p=>p.personName).map(p=>({name:p.personName}))]),s=book.statement(entries,settings,expenses);
  const rows=m.rows.map(r=>{const plan=r.isGuest||r.unassigned?0:list.filter(o=>key(o.personName)===key(r.name)).reduce((sum,o)=>sum+planned(o,settings,until),0),paid=r.isGuest||r.unassigned?0:selected.filter(p=>p.personName&&key(p.personName)===key(r.name)).reduce((sum,p)=>sum+p.amountCents,0);return {...r,plan,paid,saldo:paid-r.total,open:Math.max(0,r.total-paid),credit:Math.max(0,paid-r.total)};});
  const paid=selected.reduce((sum,p)=>sum+p.amountCents,0);
  return {...m,rows,summary:{...s,received:paid,actualBalance:s.opening+paid-s.spending},paid,saldo:rows.reduce((sum,r)=>sum+r.saldo,0),planned:rows.reduce((a,r)=>a+r.plan,0),open:rows.reduce((a,r)=>a+r.open,0),credit:rows.reduce((a,r)=>a+r.credit,0),until,period:!settings?'Alle gespeicherten Abschlüsse':settings.mode==='now'?'Seit '+new Date(settings.startAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):'Seit '+settings.startDate.split('-').reverse().join('.')};
 }
 function table(m){
  const seen=new Map(),counts=new Map();for(const c of m.columns)seen.set(c.date,(seen.get(c.date)||0)+1);
  const heads=m.columns.map(c=>{const n=(counts.get(c.date)||0)+1;counts.set(c.date,n);return '<th scope="col">'+esc(c.date.split('-').reverse().join('.'))+(seen.get(c.date)>1?'<small>Abschluss '+n+'</small>':'')+(c.kind==='cancelled'?'<small>Ausgefallen</small>':'')+'</th>';}).join('');
  const rows=m.rows.map(r=>'<tr'+(r.unassigned?' class="cash-year-unassigned"':'')+'><th scope="row">'+esc(r.name)+(r.isGuest?'<small>Gastkegler</small>':'')+'</th>'+r.values.map(v=>'<td>'+(v===null?'—':euro(v))+'</td>').join('')+'<td class="cash-year-sum">'+euro(r.total)+'</td><td class="cash-year-paid">'+euro(r.paid)+'</td><td class="cash-plan-open '+(r.saldo<0?'cash-negative':'cash-positive')+'">'+euro(r.saldo)+'</td></tr>').join('');
  return '<table class="cash-year-table"><caption>Abgerechnete Strafen und Monatsbeiträge je Person und Termin</caption><thead><tr><th scope="col">Name</th>'+heads+'<th scope="col">Gesamt</th><th scope="col">Bisher bezahlt</th><th scope="col">Bezahlstatus<small>− offen / + Guthaben</small></th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><th scope="row">Gesamt je Termin</th>'+m.columns.map(c=>'<td>'+euro(c.total)+'</td>').join('')+'<td>'+euro(m.income)+'</td><td>'+euro(m.rows.reduce((s,r)=>s+r.paid,0))+'</td><td>'+euro(m.saldo)+'</td></tr></tfoot></table>';
 }
 function summary(m){return [['Kassenstand (Soll)',m.summary.balance],['Startbetrag',m.summary.opening],['Strafen & Beiträge',m.summary.income],['Ausgaben',m.summary.spending],['Bisher eingegangen',m.paid],['Kassenstand (Ist)',m.summary.actualBalance]].map(([label,value])=>'<div><span>'+esc(label)+'</span><strong>'+euro(value)+'</strong></div>').join('');}
 function validPayment(p){return !!(p&&/^income_[a-zA-Z0-9_-]{1,120}$/.test(p.id)&&typeof p.personName==='string'&&p.personName.length<=150&&Number.isSafeInteger(p.amountCents)&&p.amountCents>0&&p.amountCents<=10000000&&day(p.date)&&typeof p.description==='string'&&p.description.trim()&&p.description.length<=300&&['single','standing'].includes(p.kind)&&(!p.orderId||/^standing_[a-zA-Z0-9_-]{1,100}$/.test(p.orderId)));}
 window.KCCashOverview=Object.freeze({intervals,validOrder,validPayment,planned,model,table,summary,today,esc,euro,key});
})();
