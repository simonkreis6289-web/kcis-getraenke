const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function core(html='<html></html>'){
 const c={Intl,Date,console,document:parseHTML(html).document,addEventListener(){},setInterval(){},requestAnimationFrame:()=>1};c.window=c;vm.createContext(c);
 for(const p of ['cash-book','cash-overview'])vm.runInContext(read('js/'+p+'.js'),c);return c;
}
const members=[{name:'A',present:true},{name:'B',present:false},{name:'C'},{name:'Inactive',inactive:true},{name:'Guest',isGuest:true},{name:'Drinker',isDrinksOnly:true}];
const entries=[{id:'current',category:'strafen',date:'2026-11-12',members:[{name:'A',chargedCents:9000},{name:'B',chargedCents:3000},{name:'Inactive',chargedCents:50000},{name:'Archived',chargedCents:40000},{name:'Drinker',chargedCents:20000}],guests:[{name:'Guest',chargedCents:70000},{name:'A',chargedCents:20000}]}];
const row=(m,n,guest=false)=>m.rows.find(r=>r.name===n&&r.isGuest===guest);
test('average includes only current active members, including absent members and zero totals',()=>{
 const c=core(),O=c.KCCashOverview,m=O.model(entries,null,[],members,{},'2026-11-16');
 assert.equal(m.averageCount,3);assert.equal(m.averageTotal,4000);assert.equal(row(m,'A').deviation,5000);assert.equal(row(m,'B').deviation,-1000);assert.equal(row(m,'C').deviation,-4000);
 for(const [name,guest] of [['Inactive',false],['Guest',true],['Archived',false],['Drinker',false],['A',true]])assert.equal(row(m,name,guest).deviation,null,name);
 assert.equal(m.income,212000,'comparison does not remove any historical money from the cash balance');
 const unassigned=O.model([{...entries[0],totals:{grandTotal:2130}}],null,[],members,{},'2026-11-16');assert.equal(unassigned.rows.find(r=>r.unassigned).deviation,null);assert.equal(unassigned.averageTotal,4000);
});
test('cash-year date boundaries apply to the average and receipts, expenses and opening balance do not change it',()=>{
 const c=core(),O=c.KCCashOverview,old={id:'old',category:'strafen',date:'2026-10-01',members:[{name:'A',chargedCents:100000}]},payments={payments:[{id:'income_one',personName:'A',amountCents:50000,date:'2026-11-13',description:'Einzahlung',kind:'single'}]};
 const m=O.model([old,...entries],{startDate:'2026-11-01',openingCents:99900},[{id:'expense',category:'expense',amountCents:90000,date:'2026-11-13'}],members,payments,'2026-11-16');
 assert.equal(m.averageTotal,4000);assert.equal(row(m,'A').deviation,5000);assert.equal(row(m,'A').saldo,41000);assert.equal(m.paid,50000);
 const all=O.model([old,...entries],null,[],members,{},'2026-11-16');assert.equal(all.averageTotal,37333);assert.equal(row(all,'A').deviation,71667,'differences subtract the displayed, cent-rounded average');
});
test('red/green signed differences, neutral equality and excluded rows render in the shared table',()=>{
 const c=core(),O=c.KCCashOverview,m=O.model(entries,null,[],members,{},'2026-11-16'),doc=parseHTML(O.table(m)).document;
 const lines=[...doc.querySelectorAll('tbody tr')],find=n=>lines.find(tr=>tr.querySelector('th').textContent===n);
 assert.equal(find('A').querySelector('.cash-deviation-above').textContent,'+50,00 €');assert.equal(find('B').querySelector('.cash-deviation-below').textContent,'-10,00 €');assert.equal(find('Inactive').querySelector('.cash-year-deviation').textContent,'—');
 const equal=O.model([{id:'equal',date:'2026-11-12',members:[{name:'A',chargedCents:3000},{name:'B',chargedCents:3000}]}],null,[],members.slice(0,2),{},'2026-11-16');
 assert.equal(parseHTML(O.table(equal)).document.querySelector('.cash-deviation-neutral').textContent,'0,00 €');
 assert(doc.querySelector('.cash-average-note').textContent.includes('3 aktiven Mitgliedern'));const width=doc.querySelector('thead tr').children.length;for(const tr of doc.querySelectorAll('tbody tr,tfoot tr'))assert.equal(tr.children.length,width);
});
test('no active members yields no average, and no archives yields zero for active members without NaN',()=>{
 const c=core(),O=c.KCCashOverview,none=O.model(entries,null,[],members.slice(3),{},'2026-11-16');assert.equal(none.averageTotal,null);assert.equal(none.averageCount,0);assert(none.rows.every(r=>r.deviation===null));assert(!O.summary(none).includes('NaN'));assert.equal(parseHTML(O.summary(none)).document.querySelector('div:last-child strong').textContent,'—');
 const empty=O.model([],null,[],members,{},'2026-11-16');assert.equal(empty.averageTotal,0);assert.equal(empty.averageCount,3);assert(empty.rows.every(r=>r.deviation===0));
});
test('app and live dashboard show the same average and recalculate when a member becomes inactive',()=>{
 const a=core(read('getraenke-abrechnung.html'));Object.assign(a,{persons:members,cashHistoryEntries:entries,cashHistoryClub:'club',cashExpenseEntries:[],cashBookSettings:null,ACTIVE_CLUB:'club',getClubFirestoreId:()=> 'club'});a.renderCashBook();
 const appCard=[...a.document.querySelectorAll('#cash-book-summary>div')].find(n=>n.querySelector('span').textContent==='Durchschnitt Gesamt');assert.equal(appCard.querySelector('strong').textContent,'40,00 €');
 const d=core(read('dashboard.html'));let receive;d.firestoreApi={subscribeCashBookEntries:(_club,fn)=>{receive=fn;return ()=>{};}};vm.runInContext(read('js/cash-dashboard.js'),d);
 const state={persons:members,dashboardCashView:{open:true,mode:'cash'}};d.KCCashDashboard.update(state,'club');receive(entries);
 const tvCard=()=>[...d.document.querySelectorAll('#cash-dashboard-summary>div')].find(n=>n.querySelector('span').textContent==='Durchschnitt Gesamt');assert.equal(tvCard().querySelector('strong').textContent,'40,00 €');assert.equal(d.document.getElementById('cash-dashboard-scroll').innerHTML,a.document.getElementById('cash-year-table').innerHTML);
 const next=members.map(p=>p.name==='C'?{...p,inactive:true}:p);d.KCCashDashboard.update({...state,persons:next},'club');assert.equal(tvCard().querySelector('strong').textContent,'60,00 €');assert(d.document.querySelector('.cash-average-note').textContent.includes('2 aktiven Mitgliedern'));
});
