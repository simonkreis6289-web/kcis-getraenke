const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(p,'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLowerCase());
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
const data=read('tests/v332-physical-statistics.cjs');
const legacyFixture=new Function('copy','M','confirmedEvening','startedAt',data.slice(data.indexOf('function fixture()'),data.indexOf("test('confirmed score"))+';return fixture();');
async function setup(){
 const seed=fullApp(database({[rootPath]:initial()}));
 const root={...initial(),...legacyFixture(copy,seed.c.KCEveningCounters,'2026-11-27T18:17:01.250Z','2026-11-27T19:35:58.800Z'),syncInitialized:true,syncProtocol:1,syncRevision:3,syncOperation:'sync_previous',tabletSequence:10};
 root.persons=root.persons.map(p=>({...p,present:true,drinks:{beer:0}}));
 const db=database({[rootPath]:root}),a=fullApp(db),recovery=a.c.KCHotfixRecovery;
 a.c.KCHotfixRecovery=null;await a.select();
 // Simulate the already deployed V332 recovery, rather than V335 initialization.
 a.c.KCHotfixRecovery={...recovery,recover:(root,core)=>recovery.recover(root,core)};
 a.c.navigator.onLine=false;
 await a.c.startHausGame('hoch');await a.c.hausThrow('hoch',4,false,0);
 await a.c.changeDrink('A','beer',1);
 const queued=copy(JSON.parse(a.storage.get('kcis_tablet_outbox_club')).pending.state);
 await a.c.firestoreApi.initializeSharedState('club',{},'sync_repair332');
 assert.equal(db.root().eveningCounters.nines,0);
 return {a,db,queued};
}
test('a statistics-only cloud repair preserves unconfirmed throws and drinks after reload and updates the visible counter',async()=>{
 const {a,db,queued}=await setup(),b=fullApp(db);
 for(const [k,v] of a.storage)b.storage.set(k,v);
 await b.select();assert(await b.c.KCSharedSync.waitForUpload());
 assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.pins,13);assert.equal(db.root().eveningCounters.throws,7);
 assert.deepEqual(db.root().persons,queued.persons);assert.equal(db.root().persons[0].drinks.beer,1);
 assert.equal(b.run('eveningCounters.nines'),0);assert.equal(b.run('eveningCounters.pins'),13);
 assert.equal(db.root().haushochState.rows.A[0].physicalThrow.pins,4);
 assert.equal(db.root().haustiefState.rows.A[0].physicalThrow.kind,'gosse');
 const commits=db.commits();assert(await b.c.KCSharedSync.reconnect());assert.equal(db.commits(),commits);
});
test('queued batches crossing the repair remain correct when new input arrives during the upload',async()=>{
 const {a,db}=await setup(),api=a.c.KCSharedSync.originalApi,native=api.commitTabletBatch;
 let release,entered;api.commitTabletBatch=async(...args)=>{if(!entered){entered=true;await new Promise(r=>release=r);}return native(...args);};
 a.c.navigator.onLine=true;const upload=a.c.KCSharedSync.reconnect();
 for(let i=0;i<20&&!entered;i++)await new Promise(r=>setImmediate(r));assert(entered);
 await a.c.hausThrow('hoch',5,false,0);await a.c.changeDrink('B','beer',1);release();
 assert(await upload);assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.pins,18);assert.equal(db.root().eveningCounters.throws,8);
 assert.equal(db.root().persons[0].drinks.beer,1);assert.equal(db.root().persons[1].drinks.beer,1);assert.equal(a.run('eveningCounters.nines'),0);
});
test('an unrelated cloud change still blocks the stale outbox and preserves both saved states',async()=>{
 const {a,db}=await setup();const cloud=db.data.get(rootPath);cloud.syncRevision++;cloud.syncOperation='sync_other';cloud.persons[1].drinks.beer=2;
 const saved=copy(db.root());a.c.navigator.onLine=true;
 assert.equal(await a.c.KCSharedSync.reconnect(),false);assert.deepEqual(db.root(),saved);
 assert(JSON.parse(a.storage.get('kcis_tablet_outbox_club')).inflight);assert.match(a.c.KCSharedSync.diagnostics().error,/sync-conflict/);
});
test('a queued successor uses its confirmed predecessor receipt when the repair interrupts the chain',async()=>{
 const {a,db}=await setup(),key='kcis_tablet_outbox_club',outbox=JSON.parse(a.storage.get(key));
 outbox.pending.baseOperation='sync_predecessor';outbox.pending.baseRevision=2;
 db.data.set('clubs/club/syncCommands/sync_predecessor',{result:{sequence:10,revision:3}});
 a.storage.set(key,JSON.stringify(outbox));const b=fullApp(db);for(const [k,v] of a.storage)b.storage.set(k,v);
 await b.select();assert(await b.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.pins,13);assert.equal(db.root().persons[0].drinks.beer,1);
});
test('a missing predecessor receipt cannot authorize crossing a cloud revision',async()=>{
 const {a,db}=await setup(),key='kcis_tablet_outbox_club',outbox=JSON.parse(a.storage.get(key));
 outbox.pending.baseOperation='sync_missing';a.storage.set(key,JSON.stringify(outbox));
 const saved=copy(db.root()),b=fullApp(db);for(const [k,v] of a.storage)b.storage.set(k,v);
 await b.select();assert.equal(await b.c.KCSharedSync.waitForUpload(),false);assert.deepEqual(db.root(),saved);assert(JSON.parse(b.storage.get(key)).inflight);
});
