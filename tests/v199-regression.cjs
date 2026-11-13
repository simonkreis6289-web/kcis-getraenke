const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function core(){const c={window:{},document:{addEventListener(){}},Intl,Date};vm.createContext(c);vm.runInContext(read('js/cash-book.js'),c);vm.runInContext(read('js/cash-overview.js'),c);return c.window;}
const {KCCashOverview:overview,KCCashBook:book}=core(),order=(extra={})=>({id:'standing_test',personName:'A',amountCents:2000,interval:'monthly',startDate:'2026-01-31',endDate:'',...extra});
const previous=read('tests/v185-regression.cjs'),a=previous.indexOf('function server('),b=previous.indexOf('\nfunction context(',a),server=new Function('read','plain','assert','overview','let sequence=0;'+previous.slice(a,b).replace('window:{}','window:{KCCashOverview:overview}').replace("['setDashboardRules','saveClubState']","['setCashDashboardView','updateCashStandingOrders','saveClubState']")+';return server;')(read,plain,assert,overview);
const req=(open,revision,id)=>({open,expectedRevision:revision,opId:'cash_'+id});

test('standing-order periods anchor month ends, leap days and week rhythms without drifting',()=>{
 assert.equal(overview.planned(order(),null,'2026-02-28'),4000);assert.equal(overview.planned(order(),null,'2026-03-30'),4000);assert.equal(overview.planned(order(),null,'2026-03-31'),6000);
 assert.equal(overview.planned(order({startDate:'2024-02-29',interval:'yearly'}),null,'2025-02-28'),4000);assert.equal(overview.planned(order({startDate:'2024-02-29',interval:'yearly'}),null,'2028-02-28'),8000);
 for(const [interval,end,count] of [['weekly','2026-01-15',3],['fortnightly','2026-01-29',3],['fourweekly','2026-02-26',3],['quarterly','2026-07-01',3]])assert.equal(overview.planned(order({interval,startDate:'2026-01-01'}),null,end),count*2000);
});
test('plans respect first/last due dates, cash-year resets, Berlin date boundaries and invalid inputs',()=>{
 assert.equal(overview.planned(order(),null,'2026-01-30'),0);assert.equal(overview.planned(order({endDate:'2026-02-28'}),null,'2026-05-31'),4000);
 assert.equal(overview.planned(order(),{startDate:'2026-02-01'},'2026-03-31'),4000);
 assert.equal(overview.planned(order({interval:'weekly',startDate:'2026-01-01'}),{mode:'now',startAt:'2026-01-07T23:30:00Z'},'2026-01-08'),0);
 assert.equal(overview.planned(order({interval:'weekly',startDate:'2026-01-01'}),{mode:'now',startAt:'2026-01-07T23:30:00Z'},'2026-01-15'),2000);
 for(const change of [{amountCents:0},{amountCents:1.5},{amountCents:10000001},{interval:'daily'},{startDate:'2026-02-30'},{endDate:'2026-01-01'},{id:'bad'}])assert(!overview.validOrder(order(change)));
});
test('planned contributions stay separate from confirmed payments and do not change the Soll cash balance or archives',()=>{
 const entries=[{id:'a',category:'strafen',date:'2026-02-01',members:[{name:'A',total:50},{name:'B',total:10}],totals:{grandTotal:60},laneCostCents:500}],settings={startDate:'2026-01-01',openingCents:1000},orders={orders:[order(),order({id:'standing_b',personName:'B',amountCents:1500})]},before=JSON.stringify(entries);
 const m=overview.model(entries,settings,[],[{name:'A'},{name:'B'},{name:'Gast',isGuest:true}],orders,'2026-02-28');assert.equal(m.summary.balance,6500);assert.equal(m.open,6000);assert.equal(m.credit,0);assert.equal(m.planned,7000);assert.equal(m.rows.find(r=>r.name==='A').open,5000);assert.equal(m.rows.find(r=>r.name==='B').credit,0);assert.equal(JSON.stringify(entries),before);
 const doc=parseHTML(overview.table(m)).document;assert(doc.querySelector('caption'));assert(doc.querySelector('.cash-plan-open').textContent.includes('-50,00'));assert(overview.table(m).includes('Bisher bezahlt'));
 const evil=overview.model([],null,[],[{name:'<img onerror=x>'}],null,'2026-01-01');assert(!parseHTML(overview.table(evil)).document.querySelector('img'));
});
test('dashboard toggle is atomic, idempotent, conflict-safe and protected from generic state saves',async()=>{
 const s=server({persons:[{name:'A'}],tannenbaumState:{history:[1]}}),open=req(true,0,'open');await s.api.setCashDashboardView('club',open);assert(s.root().dashboardCashView.open);await s.api.setCashDashboardView('club',open);assert.equal(s.writes(),1);
 await assert.rejects(()=>s.api.setCashDashboardView('club',req(false,0,'stale')),/inzwischen/);await s.api.saveClubState('club',{persons:[{name:'A'}],dashboardCashView:{open:false}});assert(s.root().dashboardCashView.open);
 await s.api.setCashDashboardView('club',req(false,1,'close'));assert(!s.root().dashboardCashView.open);await s.api.setCashDashboardView('club',open);assert(!s.root().dashboardCashView.open);
 s.offline(true);await assert.rejects(()=>s.api.setCashDashboardView('club',req(true,2,'offline')));assert(!s.root().dashboardCashView.open);
});
test('standing orders validate members, reject duplicates/stale edits and survive unrelated state saves',async()=>{
 const s=server({persons:[{name:'A'},{name:'Gast',isGuest:true}]}),r={action:'upsert',order:order(),expectedRevision:0,opId:'cash_order'};await s.api.updateCashStandingOrders('club',r);await s.api.updateCashStandingOrders('club',r);assert.equal(s.writes(),1);
 await assert.rejects(()=>s.api.updateCashStandingOrders('club',{...r,opId:'cash_stale'}),/inzwischen/);
 await assert.rejects(()=>s.api.updateCashStandingOrders('club',{...r,expectedRevision:1,opId:'cash_dup',order:order({id:'standing_new'})}),/bereits/);
 await assert.rejects(()=>s.api.updateCashStandingOrders('club',{...r,expectedRevision:1,opId:'cash_guest',order:order({personName:'Gast'})}),/Mitglied/);
 await s.api.saveClubState('club',{persons:[{name:'A'}],cashStandingOrders:{orders:[]}});assert.equal(s.root().cashStandingOrders.orders.length,1);
 await s.api.updateCashStandingOrders('club',{action:'delete',id:'standing_test',expectedRevision:1,opId:'cash_delete'});assert.equal(s.root().cashStandingOrders.orders.length,0);
});
function app(s){
 const {document}=parseHTML(read('getraenke-abrechnung.html'));document.getElementById('cash-standing-form').reset=()=>{};for(const el of document.querySelectorAll('select'))Object.defineProperty(el,'value',{value:'',writable:true});
 const c={window:{firestoreApi:{...s.api,subscribeToClubState:(club,cb)=>s.subscribe(club,cb)}},document,ACTIVE_CLUB:'Club',getClubFirestoreId:()=> 'club',persons:[{name:'A'}],cashHistoryClub:'club',cashHistoryEntries:[{id:'one',category:'strafen',date:'2026-01-01',members:[{name:'A',total:50}]}],cashExpenseEntries:[],cashBookSettings:null,navigator:{onLine:true},crypto:require('node:crypto').webcrypto,showToast(){},escapeCashText:overview.esc,console};vm.createContext(c);
 for(const file of ['cash-book','cash-overview','cash-accounting']){vm.runInContext(read('js/'+file+'.js'),c);Object.assign(c,c.window);}c.renderCashBook();return {c,document};
}
test('actual app button opens and closes the remote view, saves a member plan and updates the year table',async()=>{
 const s=server({persons:[{name:'A'}]}),f=app(s),c=f.c,doc=f.document;assert(!doc.getElementById('cash-dashboard-toggle').disabled);
 await c.toggleCashDashboard();assert.equal(doc.getElementById('cash-dashboard-toggle').getAttribute('aria-pressed'),'true');assert(s.root().dashboardCashView.open);await c.toggleCashDashboard();assert(!s.root().dashboardCashView.open);
 for(const [id,value] of [['person','A'],['amount','20.00'],['interval','monthly'],['start','2026-01-01'],['end','']])doc.getElementById('cash-standing-'+id).value=value;
 assert(await c.saveCashStandingOrder());assert.equal(s.root().cashStandingOrders.orders[0].amountCents,2000);assert(doc.getElementById('cash-year-table').textContent.includes('Bezahlstatus'));assert(doc.getElementById('cash-standing-list').textContent.includes('monatlich'));
 await c.deleteCashStandingOrder(s.root().cashStandingOrders.orders[0].id);assert.equal(s.root().cashStandingOrders.orders.length,0);
});
function dashboard(){
 const {document}=parseHTML(read('dashboard.html')),callbacks=[],frames=[];let stops=0;
 const c={document,window:{KCCashBook:book,KCCashOverview:overview,firestoreApi:{subscribeCashBookEntries:(club,ok,bad)=>{callbacks.push({club,ok,bad});return ()=>stops++;}},addEventListener(){}},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},setInterval(){}};vm.createContext(c);vm.runInContext(read('js/cash-dashboard.js'),c);return {c,document,callbacks,stops:()=>stops};
}
test('full-width dashboard view live-loads archives, refreshes values and discards old-club callbacks on close',()=>{
 const f=dashboard(),api=f.c.window.KCCashDashboard,state={dashboardCashView:{open:true},persons:[{name:'A'}]};api.update(state,'club');const overlay=f.document.getElementById('cash-dashboard-overlay');assert(!overlay.hidden);assert(f.document.querySelector('main.dashboard').hasAttribute('inert'));assert(!overlay.closest('main.dashboard'));
 f.callbacks[0].ok([{id:'a',category:'strafen',date:'2026-01-01',members:[{name:'A',total:50}]}]);assert(overlay.textContent.includes('50,00'));f.callbacks[0].ok([{id:'a',category:'strafen',date:'2026-01-01',members:[{name:'A',total:60}]}]);assert(overlay.textContent.includes('60,00'));
 api.update({dashboardCashView:{open:false}},'club');assert(overlay.hidden);assert.equal(f.stops(),1);assert(!f.document.querySelector('main.dashboard').hasAttribute('inert'));
 api.update(state,'club-b');f.callbacks[0].ok([{id:'leak',category:'strafen',date:'2026-01-01',members:[{name:'Old club',total:999}]}]);assert(!overlay.textContent.includes('Old club'));f.callbacks[1].bad();assert(overlay.textContent.includes('nicht geladen'));
 const css=read('css/cash-overview.css');assert.match(css,/#cash-dashboard-overlay\{position:fixed;inset:0/);
});
test('dashboard fitting accounts for panel padding and keeps the final column inside the available area',()=>{
 const f=dashboard();f.c.window.KCCashDashboard.update({dashboardCashView:{open:true},persons:[{name:'A'}]},'club');f.callbacks[0].ok([{id:'a',category:'strafen',date:'2026-01-01',members:[{name:'A',total:50}]}]);
 const area=f.document.getElementById('cash-dashboard-scroll'),table=area.querySelector('table');Object.defineProperty(area,'clientWidth',{value:1000});Object.defineProperty(area,'clientHeight',{value:600});f.c.getComputedStyle=()=>({paddingLeft:'8',paddingRight:'8',paddingTop:'8',paddingBottom:'8'});table.getBoundingClientRect=()=>({width:2000*Number(table.style.zoom||1),height:900*Number(table.style.zoom||1)});f.c.window.KCCashDashboard.fit();assert.equal(table.style.width,'100%');assert.equal(Number(table.style.zoom),1);assert(parseFloat(table.style.getPropertyValue('--report-row-height'))<=48);assert(parseFloat(table.style.fontSize)>=10);
});
