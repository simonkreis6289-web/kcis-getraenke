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
 const appCard=[...a.document.querySelectorAll('#cash-book-summary>div')].find(n=>n.querySelector('span').textContent==='Durchschnitt Gesamt');assert.equal(appCard.querySelector('strong').textContent,'40,00 €');assert.equal(a.document.querySelector('#cash-year-table tfoot .cash-year-average strong').textContent,'40,00 €');assert.equal(a.document.querySelector('tfoot .cash-year-average small').textContent,'Ø Gesamt');assert(a.document.querySelector('.cash-year-average').title.includes('3 aktiven Mitgliedern'));
 const d=core(read('dashboard.html'));let receive;d.firestoreApi={subscribeCashBookEntries:(_club,fn)=>{receive=fn;return ()=>{};}};vm.runInContext(read('js/cash-dashboard.js'),d);
 const state={persons:members,dashboardCashView:{open:true,mode:'cash'}};d.KCCashDashboard.update(state,'club');receive(entries);
 const tvCard=()=>[...d.document.querySelectorAll('#cash-dashboard-summary>div')].find(n=>n.querySelector('span').textContent==='Durchschnitt Gesamt');assert.equal(tvCard().querySelector('strong').textContent,'40,00 €');assert.equal(d.document.querySelector('#cash-dashboard-scroll table').outerHTML,a.document.querySelector('#cash-year-table table').outerHTML);
 const next=members.map(p=>p.name==='C'?{...p,inactive:true}:p);d.KCCashDashboard.update({...state,persons:next},'club');assert.equal(tvCard().querySelector('strong').textContent,'60,00 €');assert(d.document.querySelector('.cash-average-note').textContent.includes('2 aktiven Mitgliedern'));
});
test('each evening shows its active-member mean and signed small difference below the large amount, alongside the overall footer average',()=>{
 const c=core(),O=c.KCCashOverview,people=[{name:'A'},{name:'B'},{name:'C'},{name:'Inactive',inactive:true}],data=[{id:'one',date:'2026-10-31',members:[{name:'A',chargedCents:3880},{name:'B',chargedCents:3400},{name:'C',chargedCents:3589},{name:'Inactive',chargedCents:100000}],guests:[{name:'Guest',chargedCents:500000}]},{id:'two',date:'2026-11-12',members:[{name:'A',chargedCents:100},{name:'B',chargedCents:200},{name:'C',chargedCents:300}]}],m=O.model(data,null,[],people,{},'2026-11-16'),doc=parseHTML(O.table(m)).document;
 assert.deepEqual(Array.from(m.columns,col=>col.averageTotal),[3623,200]);assert.equal(m.averageTotal,3823);
 const line=[...doc.querySelectorAll('tbody tr')].find(r=>r.querySelector('th').textContent==='A'),cells=line.querySelectorAll('.cash-year-evening');assert.equal(cells[0].querySelector('.cash-evening-amount').textContent,'38,80 €');assert.equal(cells[0].querySelector('.cash-evening-comparison').textContent,'Schnitt 36,23 € | +2,57 €');assert.equal(cells[0].querySelector('.cash-deviation-above').textContent,'+2,57 €');assert.equal(cells[1].querySelector('.cash-deviation-below').textContent,'-1,00 €');assert.equal(doc.querySelector('tfoot .cash-year-average strong').textContent,'38,23 €');
 for(const name of ['Inactive','Guest']){const row=[...doc.querySelectorAll('tbody tr')].find(r=>r.querySelector('th').textContent.startsWith(name));assert(!row.querySelector('.cash-evening-comparison'));}
 const filtered=O.model(data,{startDate:'2026-11-01'},[],people,{},'2026-11-16');assert.equal(filtered.columns.length,1);assert.equal(filtered.columns[0].averageTotal,200);assert.equal(filtered.averageTotal,200);
});
