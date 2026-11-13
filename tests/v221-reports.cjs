const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
const source=read('tests/v215-shared-sync.cjs'),factory=source.slice(source.indexOf('function database('),source.indexOf("test('two devices increment"))+source.slice(source.indexOf('function fullApp('),source.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,apiClient,context,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,apiClient,context,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
function core(){const c={console,Intl,Date,document:{addEventListener(){}},window:{}};c.window=c;vm.createContext(c);for(const p of ['birthdays','cash-book','cash-overview','penalty-statistics','activity-reports'])vm.runInContext(read('js/'+p+'.js'),c);return c;}
const c=core(),R=c.KCActivityReports,O=c.KCCashOverview,stats=c.KCPenaltyStats;
const payment=(more={})=>({id:'income_one',personName:'A',amountCents:7000,date:'2026-11-12',description:'Einzahlung',kind:'single',...more});
test('actual receipts and automatic monthly payments produce signed balances',()=>{
 const entries=[{id:'a',category:'strafen',date:'2026-11-12',members:[{name:'A',total:50},{name:'B',total:20}]}];
 const orders={orders:[{id:'standing_b',personName:'B',amountCents:1000,interval:'monthly',startDate:'2026-11-01'}],payments:[payment()]};
 const m=O.model(entries,null,[],[{name:'A'},{name:'B'}],orders,'2026-11-13');
 assert.equal(m.rows.find(r=>r.name==='A').saldo,2000);assert.equal(m.rows.find(r=>r.name==='B').saldo,-1000);assert.equal(m.summary.balance,7000);assert.equal(m.summary.actualBalance,8000);
 const doc=parseHTML(O.table(m)).document;assert(doc.querySelector('.cash-negative').textContent.includes('-10,00'));assert(doc.querySelector('.cash-positive').textContent.includes('20,00'));assert(!doc.querySelector('tbody small'));assert(doc.querySelector('thead').textContent.includes('Bisher bezahlt'));
});
test('income and debt use the same cash-year boundary and keep general receipts out of member balances',()=>{
 const orders={payments:[payment({date:'2026-10-01'}),payment({id:'income_new',date:'2026-11-12',amountCents:500,personName:''})]};
 const m=O.model([], {startDate:'2026-11-01',openingCents:1000},[],[{name:'A'}],orders,'2026-11-13');assert.equal(m.paid,500);assert.equal(m.summary.actualBalance,1500);assert.equal(m.rows[0].paid,0);
});
test('income mutations preserve plans, retry exactly once, reject duplicates and stale updates',async()=>{
 const db=database({[rootPath]:initial()}),api=apiClient(db);api.KCCashOverview=O;
 await api.firestoreApi.initializeSharedState('club',{},'sync_init_income');
 const order={id:'standing_a',personName:'A',amountCents:3000,interval:'weekly',startDate:'2026-01-01'};
 await api.firestoreApi.updateCashStandingOrders('club',{action:'upsert',order,expectedRevision:0,opId:'cash_standing'},context(db,'updateCashStandingOrders'));
 const request={action:'upsert',payment:payment({kind:'standing',orderId:'standing_a'}),expectedRevision:1,opId:'cash_income'},ctx=context(db,'updateCashIncome');
 await api.firestoreApi.updateCashIncome('club',request,ctx);await api.firestoreApi.updateCashIncome('club',request,ctx);assert.equal(db.root().cashStandingOrders.payments.length,1);assert.equal(db.root().cashStandingOrders.orders.length,1);
 await assert.rejects(api.firestoreApi.updateCashIncome('club',{...request,opId:'cash_dup',expectedRevision:2,payment:payment({id:'income_two',kind:'standing',orderId:'standing_a'})},context(db,'updateCashIncome')),/bereits/);
 await assert.rejects(api.firestoreApi.updateCashIncome('club',{...request,opId:'cash_stale'},context(db,'updateCashIncome')),/inzwischen/);
 await api.firestoreApi.updateCashStandingOrders('club',{action:'delete',id:'standing_a',expectedRevision:2,opId:'cash_remove_order'},context(db,'updateCashStandingOrders'));assert.equal(db.root().cashStandingOrders.payments.length,1);
 await api.firestoreApi.updateCashIncome('club',{action:'delete',id:'income_one',expectedRevision:3,opId:'cash_remove_income'},context(db,'updateCashIncome'));assert.equal(db.root().cashStandingOrders.payments.length,0);
});
test('correcting a receipt preserves its original timestamp for a precise cash reset boundary',async()=>{
 const root=initial(),date=O.today(),incurredAt=date+'T00:00:00Z';root.cashStandingOrders={revision:1,payments:[{...payment({date}),incurredAt}]};
 const db=database({[rootPath]:root}),api=apiClient(db);api.KCCashOverview=O;await api.firestoreApi.initializeSharedState('club',{},'sync_init_edit');
 await api.firestoreApi.updateCashIncome('club',{action:'upsert',payment:payment({date,amountCents:6000}),expectedRevision:1,opId:'cash_edit'},context(db,'updateCashIncome'));
 assert.equal(db.root().cashStandingOrders.payments[0].incurredAt,incurredAt);assert.equal(db.root().cashStandingOrders.payments[0].amountCents,6000);
});
test('own throw logs and loss counters are independent of the special-throw fines on other players',()=>{
 const catalog=[{key:'nine',label:'9er / Kranz'},{key:'l1',label:'1. Verlierer'},{key:'l2',label:'2. Verlierer'},{key:'l3',label:'3. Verlierer'}];
 const data=stats.build({catalog,archives:[{id:'a',category:'strafen',date:'2026-11-12',eveningStartedAt:evening,members:[{name:'A',strafen:{nine:0,l1:2}},{name:'B',strafen:{nine:8,l2:1,l3:3}}]}],logs:[{id:'one',eveningStartedAt:evening,thrower:'A',type:'9er'},{id:'two',eveningStartedAt:evening,thrower:'A',type:'kranz'}],statementsOnly:true,archivedOnly:true});
 const rows=stats.summary(data),a=rows.find(r=>r.name==='A'),b=rows.find(r=>r.name==='B');assert.equal(a.nine,1);assert.equal(a.kranz,1);assert.equal(a.loser1,2);assert.equal(b.nine,0);assert.equal(b.kranz,0);assert.equal(b.loser2,1);assert.equal(b.loser3,3);
 const baseline=stats.baseline({...data,currentKey:data.sessions[0].key}),reset=stats.summary(data,{settings:{mode:'now',startAt:'2026-11-12T20:00:00Z',baseline}});assert.equal(reset.find(r=>r.name==='A').nine,0);assert.equal(reset.find(r=>r.name==='A').loser1||0,0);
});
test('drink statistics deduplicate re-exported evenings, retain historical prices and exclude unclosed tests',()=>{
 const entry={id:'one',category:'getraenke',eveningStartedAt:evening,date:'2026-11-12T20:00:00Z',closedAt:'2026-11-12T20:00:00Z',drinks:[{key:'beer',label:'Bier',price:2}],persons:[{name:'A',drinks:{beer:2},total:4},{name:'Gast',drinks:{beer:1},total:2}]};
 const newer={...copy(entry),id:'two',closedAt:'2026-11-12T21:00:00Z'};newer.persons[0].drinks.beer=3;newer.persons[0].total=6;
 const data=R.drinkData([entry,newer,{...entry,category:'strafen'},{...entry,id:'test',status:'deleted'}]),rows=R.drinkSummary(data);assert.equal(data.sessions.length,1);assert.equal(rows.find(p=>p.name==='A').units,3);assert.equal(rows.find(p=>p.name==='A').cents,600);assert.equal(rows.find(p=>p.name==='Gast').units,1);
 const baseline=R.drinkSession(entry),reset=R.drinkSummary(data,{settings:{mode:'now',startAt:'2026-11-12T20:30:00Z',baseline}});assert.equal(reset.find(p=>p.name==='A').units,1);assert.equal(reset.find(p=>p.name==='A').cents,200);
 assert.equal(R.drinkSummary(data,{custom:true,from:'2026-11-13'}).length,0);
});
test('all twenty panels retain exactly one common abort button after repeated layout passes',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();
 for(const key of a.c.KCSharedCore.games){const panel=a.document.getElementById('tab-'+key);assert(panel,key);const old=a.c.gameSetupState;a.c.gameSetupState=()=>({active:true});const original=a.document.createElement('button');original.textContent='Spiel abbrechen';panel.append(original);
 a.c.applyGameInputLayout(key);a.c.applyGameInputLayout(key);const buttons=[...panel.querySelectorAll('button')].filter(b=>/Spiel abbrechen/i.test(b.textContent));assert.equal(buttons.length,1,key);assert(buttons[0].hasAttribute('data-abort-game'),key);a.c.gameSetupState=old;
 }
});
test('category dropdowns cover every game and navigation removes only administration sidebar children',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();a.c.renderGamePropertyTabs();const select=a.document.getElementById('game-property-select');assert(select);const listed=new Set();for(const category of a.c.KCGameOverview.categories){a.c.showGamePropertyCategory(category.key);for(const option of select.querySelectorAll('option')){assert.equal(a.c.KCGameOverview.category(option.value),category.key);listed.add(option.value);}}for(const key of a.c.KCSharedCore.games)assert(listed.has(key),key);
 assert.equal(a.document.querySelector('[data-main="verwaltung"] .side-submenu'),null);a.c.toggleSideMenu('verwaltung');assert(!a.document.getElementById('main-verwaltung').classList.contains('hidden'));
 assert.equal(a.document.querySelectorAll('.quick-penalty-bar button[onclick="openFreeStrafeModal()"]' ).length,1);assert.equal(a.document.querySelectorAll('#tab-strafen-uebersicht button[onclick="openFreeStrafeModal()"]' ).length,0);
 assert(a.document.querySelector('#billing-panel-income #cash-standing-form'));
});
test('short game-start summaries show the configured Kranz and target without starting a game',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();a.run("extraGameSettings={...extraGameSettings,kranzRules:{sichern:{mode:'fixed',value:8}}}");const rows=copy(a.c.KCStartReview.settings('sichern'));assert(rows.some(([k,v])=>k==='Kranz'&&v==='8 Holz'));assert(rows.some(([k,v])=>/Zielpunktzahl/.test(k)&&String(v)==='69'));const button=a.document.querySelector('[onclick="startHausGame(\'hoch\')"]');assert.equal(a.c.KCStartReview.key(button),'haushoch');assert.equal(a.c.gameSetupState('sichern').active,false);
});
test('dashboard report command carries the selected period and does not mutate bookings',async()=>{
 const db=database({[rootPath]:initial()}),api=apiClient(db);api.KCBirthdays=c.KCBirthdays;await api.firestoreApi.initializeSharedState('club',{},'sync_init_report');const before=db.root().persons;
 await api.firestoreApi.setCashDashboardView('club',{open:true,mode:'drinks',custom:true,from:'2026-01-01',to:'2026-11-12',expectedRevision:0,opId:'cash_drinks'},context(db,'setCashDashboardView'));
 assert.equal(db.root().dashboardCashView.mode,'drinks');assert.equal(db.root().dashboardCashView.from,'2026-01-01');assert.deepEqual(db.root().persons,before);
});
test('drink and penalty restart boundaries are independent and survive both settings updates',async()=>{
 const value=initial();value.persons[0].drinks.beer=3;value.penaltyStatsSettings={mode:'date',startDate:'2026-01-01',revision:2};
 const db=database({[rootPath]:value}),api=apiClient(db);api.KCPenaltyStats=stats;api.KCActivityReports=R;
 await api.firestoreApi.initializeSharedState('club',{},'sync_init_cycles');
 const settings=await api.firestoreApi.updatePenaltyStatsSettings('club',{scope:'drinks',id:'stats_drinks',mode:'now',expectedRevision:0},context(db,'updatePenaltyStatsSettings'));
 assert.equal(settings.baseline.people.find(p=>p.name==='A').units,3);assert.equal(db.root().penaltyStatsSettings.startDate,'2026-01-01');assert.equal(db.root().penaltyStatsSettings.revision,2);
 await api.firestoreApi.updatePenaltyStatsSettings('club',{id:'stats_penalties',mode:'date',startDate:'2026-02-01',expectedRevision:2},context(db,'updatePenaltyStatsSettings'));
 assert.equal(db.root().penaltyStatsSettings.drinks.revision,1);assert.equal(db.root().penaltyStatsSettings.startDate,'2026-02-01');
});
test('each dashboard report uses actual archive data and changes cleanly between report modes',()=>{
 const f=core(),{document}=parseHTML(read('dashboard.html'));f.document=document;f.window=f;f.addEventListener=()=>{};f.setInterval=()=>0;f.requestAnimationFrame=()=>1;let receive;
 f.firestoreApi={subscribeCashBookEntries:(_club,fn)=>{receive=fn;return ()=>{};}};
 vm.runInContext(read('js/cash-dashboard.js'),f);
 const root={...initial(),penaltyStatsSettings:null,persons:[{name:'A',present:true,drinks:{beer:2},strafen:{gosse:1},strafTotal:3}],strafenHistory:[]};
 const entries=[{id:'fine',category:'strafen',eveningStartedAt:evening,date:'2026-11-12',members:[{name:'A',status:'present',total:30,strafen:{gosse:2}}],strafen:[{key:'gosse',label:'Gosse'}]},{id:'drink',category:'getraenke',date:'2026-11-12',eveningStartedAt:evening,drinks:[{key:'beer',label:'Bier',price:2}],persons:[{name:'A',drinks:{beer:5},total:10}]}];
 for(const mode of ['cash','summary','penalties','drinks','games']){f.KCCashDashboard.update({...root,dashboardCashView:{open:true,mode}},'club');receive(entries);assert(!document.getElementById('cash-dashboard-overlay').hidden,mode);assert(document.querySelector('#cash-dashboard-scroll table'),mode);assert(!document.getElementById('cash-dashboard-scroll').textContent.includes('undefined'),mode);}
 f.KCCashDashboard.update({...root,dashboardCashView:{open:true,mode:'drinks'}},'club');assert(document.getElementById('cash-dashboard-title').textContent.includes('Getränke'));assert(document.getElementById('cash-dashboard-scroll').textContent.includes('10,00'));
 f.KCCashDashboard.update({...root,dashboardCashView:{open:false}},'club');assert(document.getElementById('cash-dashboard-overlay').hidden);
});
test('the start click opens review, allows settings edits and starts only after explicit confirmation',async()=>{
 const clickHandlers=[],parse=html=>{const result=parseHTML(html),add=result.document.addEventListener.bind(result.document);result.document.addEventListener=(name,fn,opts)=>{if(name==='click'&&opts===true)clickHandlers.push(fn);return add(name,fn,opts);};return result;};
 const make=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parse,require,evening,rootPath,personPath),db=make.database({[rootPath]:make.initial()}),a=make.fullApp(db);await a.select();
 const button=a.document.querySelector('[onclick="startHausGame(\'hoch\')"]');let starts=0;button.onclick=()=>starts++;
 const handler=clickHandlers.find(fn=>String(fn).includes('pending={key:game'));assert(handler);handler({target:button,preventDefault(){},stopImmediatePropagation(){}});assert.equal(starts,0);assert(a.document.getElementById('start-review-title'));
 a.document.querySelector('[data-edit]').click();assert(a.document.querySelector('.start-review-return'));assert(!a.document.getElementById('tab-spiele-einstellungen').classList.contains('hidden'));assert.equal(starts,0);
 a.document.querySelector('.start-review-return').click();a.document.querySelector('[data-start]').click();assert.equal(starts,1);assert.equal(a.document.getElementById('start-review-title'),null);
});
test('Darts and Tannenbaum undo remove the exact own Kranz event and its associated fines',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();a.run("persons[0].tisch='T1';persons[1].tisch='T2';extraGameSettings={...extraGameSettings,kranzRules:{darts:{mode:'fixed',value:8},tannenbaum:{mode:'fixed',value:8}}};persistState()");
 await a.c.startDartsGame();a.c.openDartsPenaltyPlayerModal('kranz','T1',8);a.document.getElementById('darts-penalty-player-select').value='A';await a.c.confirmDartsPenaltyPlayer();assert.equal(a.run('penaltyStatsLog.length'),1);assert.equal(a.run('persons[1].strafen.nine'),1);await a.c.deleteDartsThrow('T1',0);assert.equal(a.run('penaltyStatsLog.length'),0);assert.equal(a.run('persons[1].strafen.nine'),0);
 await a.c.startTannenbaumSetup();a.c.openTannenbaumPenaltyPlayerModal('kranz','T1',null);a.document.getElementById('tannenbaum-penalty-player-select').value='A';await a.c.confirmTannenbaumPenaltyPlayer();assert.equal(a.run('penaltyStatsLog.length'),1);assert.equal(a.run('persons[1].strafen.nine'),1);await a.c.undoLastTannenbaumThrow();assert.equal(a.run('penaltyStatsLog.length'),0);assert.equal(a.run('persons[1].strafen.nine'),0);
});
test('correcting a Lotterie Kranz to a nine and then a normal throw does not accumulate own hits',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();a.run("extraGameSettings={...extraGameSettings,kranzRules:{lotterie:{mode:'fixed',value:8}}};persistState()");a.document.getElementById('lotterie-column-count').value='1';await a.c.prepareLotterieColumns();await a.c.startLotterieGameFinal('A');
 for(const [value,type,length] of [[12,'kranz',1],[9,'9er',1],[4,'',0]]){a.run("lotterieEdit={person:'A',colIndex:0}");await a.c.confirmLotterieThrow(value);assert.equal(a.run('penaltyStatsLog.length'),length);if(type)assert.equal(a.run('penaltyStatsLog[0].type.toLowerCase()'),type);}
 assert.equal(a.run('persons[1].strafen.nine'),0);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().penaltyStatsLog.length,0);
});
