const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
function core(){const c={window:{},Intl,Date};c.window=c;vm.createContext(c);for(const f of ['js/kranz-policy.js','js/games/extra-core.js','js/games/extra-view.js'])vm.runInContext(read(f),c);return c;}
const c=core(),G=c.KCExtraGames,newKeys=['parteienspiel','dreieuro','ebbeflut','hochsprung'],catalog=[{key:'gosse',label:'Gosse'},{key:'nine',label:'9er / Kranz'},...[1,2,3].map(n=>({key:'l'+n,label:n+'. Verlierer'}))],people=['A','B','C','D'].map((name,i)=>({name,present:true,tisch:i%2?'T2':'T1',strafen:{}})),ctx={people,catalog,now:evening,eveningStartedAt:evening,club:'Club',groups:{T1:{name:'Wand'},T2:{name:'TV'}}};let seq=0;
function step(s,action,fields={}){const request={gameKey:s.gameKey,gameId:s.id||'indgame_test',action,opId:'ind_test_'+(++seq),expectedRevision:s.revision,...fields},out=G.command(s,request,ctx),effect=out.repeat?{changes:[],added:[],removed:[]}:G.effects(s,out.state,request,ctx);return {...out,effect,request};}
function start(key,config={},players=['A','B']){return step(G.empty(key),'start',{players,config:{...G.defaults(key),...config}}).state;}
function roll(s,pins,kind='pins'){return step(s,'throw',{kind,pins,...(kind==='kranz'?{kranzValue:pins}:{})});}
test('Parteienspiel credits only round differences and closes after equal complete rounds',()=>{
 let s=start('parteienspiel',{rounds:2},['A','B','C','D']);for(const n of [5,8,4,3])s=roll(s,n).state;assert.deepEqual(copy(s.scores),{T1:0,T2:2});assert.equal(s.round,2);assert.equal(s.roundResults[0].totals.T1,9);
 let out;for(const n of [4,4,4,4]){out=roll(s,n);s=out.state;}assert(s.finished);assert.deepEqual(copy(s.winners),['T2']);assert.deepEqual(copy(out.effect.changes.filter(p=>p.key==='l1')),[{personName:'A',key:'l1',delta:1},{personName:'C',key:'l1',delta:1}]);
});
test('Parteienspiel minimum-round variant waits until the configured lead exists at a round boundary',()=>{
 let s=start('parteienspiel',{mode:'lead',rounds:2,lead:3});for(const n of [4,6,5,4])s=roll(s,n).state;assert(s.active);assert.equal(s.round,3);s=roll(s,8).state;assert(s.active);s=roll(s,4).state;assert(s.finished);assert.deepEqual(copy(s.scores),{T1:5,T2:2});
 let tie=start('parteienspiel',{rounds:1});tie=roll(roll(tie,4).state,4).state;assert.deepEqual(copy(tie.winners),['T1','T2']);assert.equal(tie.loserGroups.length,0);
});
test('3-Euro-Spiel uses adjustable prices, adds the exception surcharge and books only positive final balances',()=>{
 let s=start('dreieuro',{throws:2,startCents:100,pinCents:10,penaltyCents:50});s=roll(s,5).state;assert.equal(s.scores.A,150);s=roll(s,9).state;
 // A fixed Kranz is separately valued and is not a physical five.
 s=roll(s,8,'kranz').state;assert.equal(s.scores.A,70);const out=roll(s,0,'gosse');assert(out.state.finished);assert.deepEqual(copy(out.effect.moneyAdded.map(x=>[x.personName,x.amountCents])),[['A',70],['B',60]]);assert.equal(out.state.finishPenalties.length,0);assert.equal(out.state.loserGroups.length,0);
 let negative=start('dreieuro',{throws:1,startCents:0});negative=roll(negative,9).state;const end=roll(negative,9);assert.equal(end.state.bookings.length,0);assert.equal(end.effect.moneyAdded.length,0);assert.equal(end.state.winners.length,2);
});
test('Ebbe und Flut preserves half points and applies 3/5 after the throw but 7 immediately',()=>{
 let s=start('ebbeflut',{rounds:3}),events=[];for(const n of [3,5,7,3,5,7]){const out=roll(s,n);s=out.state;events.push(s.history.at(-1));}
 assert.deepEqual(events.map(e=>e.result),[3,2.5,14,6,2.5,14]);assert.deepEqual(copy(s.scores),{A:19.5,B:22.5});assert.equal(s.tide,'flut');assert(s.finished);assert.deepEqual(copy(s.winners),['B']);
 let ranks=start('ebbeflut',{rounds:1},['A','B','C','D']),out;for(const n of [2,4,6,8]){out=roll(ranks,n);ranks=out.state;}assert.deepEqual(copy(out.effect.changes.filter(p=>/^l/.test(p.key))),[{personName:'A',key:'l1',delta:1},{personName:'B',key:'l2',delta:1},{personName:'C',key:'l3',delta:1}]);
});
test('Hochsprung accepts 0–7 hurdles as settings and rejects starting with zero or unreachable targets',()=>{
 assert(G.validSettings('hochsprung',{...G.defaults('hochsprung'),targets:[]}));assert.throws(()=>start('hochsprung',{targets:[]}),/mindestens eine Hürde/);
 for(const targets of [Array(8).fill(12),[0],[37],[12.5]])assert(!G.validSettings('hochsprung',{...G.defaults('hochsprung'),targets}));
});
test('Hochsprung first-hurdle elimination costs 7 × 3 × 10 cents and the sole survivor continues all hurdles',()=>{
 let s=start('hochsprung'),out;for(const n of [3,3,3]){out=roll(s,n);s=out.state;}assert(s.jumps.A.eliminated);assert.equal(s.jumps.A.feeCents,210);assert(s.active);assert.equal(s.bookings.length,0);assert.equal(out.effect.moneyAdded.length,0);
 for(const [n,kind] of [[8,'kranz'],[4,'pins'],[7,'pins'],[7,'pins'],[8,'pins'],[8,'pins'],[9,'pins'],[8,'pins'],[9,'pins'],[9,'pins'],[8,'kranz'],[8,'pins'],[3,'pins'],[8,'kranz'],[8,'pins'],[4,'pins']]){out=roll(s,n,kind);s=out.state;}
 assert(s.finished);assert.deepEqual(copy(s.winners),['B']);assert.equal(s.jumps.B.cleared,7);assert.equal(s.jumps.B.feeCents,0);assert.deepEqual(copy(out.effect.moneyAdded.map(p=>[p.personName,p.amountCents])),[['A',210]]);assert.equal(out.effect.changes.filter(p=>p.key==='l1'&&p.personName==='A').length,1);
});
test('Hochsprung ties on the failed hurdle use total actual throws; every eliminated player receives first loser',()=>{
 let s=start('hochsprung',{targets:[8,20]});for(const [n,k] of [[8,'kranz'],[4,'pins'],[4,'pins'],[6,'pins'],[6,'pins'],[6,'pins'],[6,'pins'],[6,'pins'],[6,'pins']])s=roll(s,n,k).state;
 assert(s.finished);assert.deepEqual(copy(s.winners),['A']);assert.equal(s.jumps.A.totalThrows,4);assert.equal(s.jumps.B.totalThrows,5);assert.deepEqual(copy(s.finishPenalties.map(p=>p.personName)),['A','B']);assert.deepEqual(copy(s.bookings.map(p=>p.amountCents)),[20,20]);
 const undo=step(s,'undo');assert(undo.state.active);assert.equal(undo.state.bookings.length,0);assert.equal(undo.effect.moneyRemoved.length,2);assert.equal(undo.effect.changes.filter(p=>p.key==='l1'&&p.delta===-1).length,2);
});
test('new games freeze their own config, keep Kranz distinct from a numerical trigger and replay throws exactly once',()=>{
 for(const key of newKeys){const config={...G.defaults(key),...(key==='hochsprung'?{targets:[12]}:{}),kranzMode:'choose'},s=step(G.empty(key),'start',{players:['A','B'],config}).state;
  assert.throws(()=>roll(s,0,'kranz'),/Kranzwert/);const out=roll(s,5,'kranz');assert.equal(out.state.history[0].pins,5);if(key==='dreieuro')assert.equal(out.state.scores.A,250);if(key==='ebbeflut')assert.equal(out.state.tide,'normal');const repeat=G.command(out.state,out.request,ctx);assert(repeat.repeat);assert.equal(repeat.state.history.length,1);config.kranzValue=12;assert.equal(out.state.config.kranzValue,8);
 }
});
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,apiClient,context,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,apiClient,context,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
test('the real app starts, renders and uploads all four games with one input and one abort button',async()=>{
 for(const key of newKeys){const root=initial();root.persons[0].tisch='T1';root.persons[1].tisch='T2';const db=database({[rootPath]:root}),a=fullApp(db);await a.select();await a.c.indStart(key);assert.equal(a.run('dashboardActiveGame'),key);assert(a.c.indGet(key).active,key);const panel=a.document.getElementById('tab-'+key);assert(panel.querySelector('.game-input-panel'),key);assert.equal(panel.querySelectorAll('[data-abort-game]').length,1,key);await a.c.indAction(key,'throw',{kind:'pins',pins:4});assert.equal(a.c.indGet(key).history.length,1,key);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root()[key+'State'].history.length,1);await a.c.cancelCurrentGame(key);assert.equal(a.c.indGet(key).active,false);assert.equal(a.run('strafenHistory.length'),0);}
});
test('3-Euro-Spiel commits fees under OnTop exactly once and undo removes its fees and result together',async()=>{
 const root=initial();root.STRAFEN=catalog;root.strafPrices={gosse:.5,nine:1,l1:1,l2:1,l3:1};root.persons[0].strafen.gosse=60;root.gameOptions={onTopEligible:['dreieuro'],randomEligible:newKeys};
 const db=database({[rootPath]:root}),api=apiClient(db),config={...G.defaults('dreieuro'),throws:1};await api.firestoreApi.initializeSharedState('club',{},'sync_euro_init');const baseline=db.root().persons[0].strafTotal;let n=0;
 async function run(action,fields={}){const state=db.root().dreieuroState||G.empty('dreieuro'),request={gameKey:'dreieuro',gameId:'indgame_euro',expectedRevision:state.revision,eveningStartedAt:evening,opId:'ind_euro_'+(++n),action,...fields},ctx=context(db,'transactIndividualGame');return {result:await api.firestoreApi.transactIndividualGame('club',request,ctx),request,ctx};}
 await run('start',{players:['A','B'],config,onTop:true});await run('throw',{kind:'pins',pins:1});const last=await run('throw',{kind:'pins',pins:2});assert.equal(db.root().individualGameLedger.length,2);assert.equal(db.root().persons[0].strafTotal,baseline+2.9);assert.equal(db.root().strafenHistory.filter(e=>e.gameKey==='dreieuro').length,1);
 await api.firestoreApi.transactIndividualGame('club',last.request,last.ctx);assert.equal(db.root().individualGameLedger.length,2);await run('undo');assert.equal(db.root().individualGameLedger.length,0);assert.equal(db.root().persons[0].strafTotal,baseline);assert.equal(db.root().strafenHistory.filter(e=>e.gameKey==='dreieuro').length,0);
});
test('Hochsprung posts both first-loser counters and exact missing-pin fees at completion, then refunds both on undo',async()=>{
 const root=initial();root.STRAFEN=catalog;root.strafPrices={gosse:.5,nine:1,l1:1,l2:1,l3:1};const db=database({[rootPath]:root}),api=apiClient(db);await api.firestoreApi.initializeSharedState('club',{},'sync_jump_init');let n=0;
 async function run(action,fields={}){const state=db.root().hochsprungState||G.empty('hochsprung');return api.firestoreApi.transactIndividualGame('club',{gameKey:'hochsprung',gameId:'indgame_jump',expectedRevision:state.revision,eveningStartedAt:evening,opId:'ind_jump_'+(++n),action,...fields},context(db,'transactIndividualGame'));}
 await run('start',{players:['A','B'],config:{...G.defaults('hochsprung'),targets:[8,20]}});for(const pins of [8,4,4,6,6,6,6,6,6])await run('throw',{kind:'pins',pins});assert.equal(db.root().individualGameLedger.reduce((s,p)=>s+p.amountCents,0),40);assert(db.root().persons.every(p=>p.strafen.l1===1));assert(db.root().persons.every(p=>p.strafTotal===1.2));const entry=db.root().strafenHistory.find(e=>e.gameKey==='hochsprung');assert.equal(entry.jumpResults.A.totalThrows,4);assert.equal(entry.jumpResults.B.totalThrows,5);
 await run('undo');assert.equal(db.root().individualGameLedger.length,0);assert(db.root().persons.every(p=>p.strafen.l1===0));assert.equal(db.root().hochsprungState.active,true);
});
test('Hochsprung settings support zero and seven target fields; navigation hides other game panels and settings freeze at start',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();const count=a.document.getElementById('round-hochsprung-count');assert.equal(Number(count.getAttribute('max')),7);count.value='0';a.c.roundTargetsChanged();assert(await a.c.saveRoundSettings('hochsprung'));assert.equal(a.c.extraConfig('hochsprung').targets.length,0);assert(a.document.querySelector('#hochsprung-setup button[onclick="indStart(\'hochsprung\')"]').disabled);
 count.value='7';a.c.roundTargetsChanged();for(let i=0;i<7;i++)a.document.getElementById('round-hochsprung-target-'+i).value=String(10+i);assert(await a.c.saveRoundSettings('hochsprung'));assert.equal(a.c.extraConfig('hochsprung').targets.length,7);a.c.showSideTab('spiele','hochsprung');a.c.showSideTab('spiele','ebbeflut');assert(a.document.getElementById('tab-hochsprung').classList.contains('hidden'));assert(!a.document.getElementById('tab-ebbeflut').classList.contains('hidden'));
 await a.c.indStart('hochsprung');assert.equal(a.c.indGet('hochsprung').config.targets[0],10);a.document.getElementById('round-hochsprung-target-0').value='12';assert(await a.c.saveRoundSettings('hochsprung'));assert.equal(a.c.indGet('hochsprung').config.targets[0],10);assert.equal(a.c.extraConfig('hochsprung').targets[0],12);
});
test('new game settings save round variants and euro prices and keep each game independent',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();const input=(key,name,value)=>{const el=a.document.getElementById('round-'+key+'-'+name);if(el.tagName==='SELECT')Object.defineProperty(el,'value',{value,writable:true,configurable:true});else el.value=value;};
 input('parteienspiel','mode','lead');input('parteienspiel','rounds','3');input('parteienspiel','lead','8');assert(await a.c.saveRoundSettings('parteienspiel'));assert.equal(a.c.extraConfig('parteienspiel').mode,'lead');assert.equal(a.c.extraConfig('parteienspiel').rounds,3);assert.equal(a.c.extraConfig('parteienspiel').lead,8);
 for(const [name,value] of Object.entries({throws:'7',startCents:'4.50',pinCents:'0.15',penaltyCents:'0.75'}))input('dreieuro',name,value);assert(await a.c.saveRoundSettings('dreieuro'));assert.deepEqual(copy(a.c.extraConfig('dreieuro')),{kranzMode:'fixed',kranzValue:8,throws:7,startCents:450,pinCents:15,penaltyCents:75});
 input('ebbeflut','rounds','9');assert(await a.c.saveRoundSettings('ebbeflut'));assert.equal(a.c.extraConfig('ebbeflut').rounds,9);assert.equal(a.c.extraConfig('parteienspiel').rounds,3);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().extraGameSettings.dreieuro.pinCents,15);
});
