const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+name.toLowerCase();
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"));
const {database,initial,apiClient,context}=new Function('read','copy','assert','vm','require','evening','rootPath','personPath',factory+';return {database,initial,apiClient,context};')(read,copy,assert,vm,require,evening,rootPath,personPath);
const cs=read('tests/v220-clock.cjs'),clockHelpers=new Function('require','__dirname',cs.slice(0,cs.indexOf("test('two clocks"))+';return {clock,sync,epoch};')(require,__dirname),{clock,sync,epoch}=clockHelpers;
const ds=read('tests/v185-regression.cjs'),start=ds.indexOf('function context(html){'),end=ds.indexOf('async function settle(',start),dashboard=new Function('read','vm','parseHTML','assert','require','let sequence=0;'+ds.slice(start,end)+';return dashboard;')(read,vm,parseHTML,assert,require);

test('six seconds between clock capture and commit do not become six seconds of countdown drift',async()=>{
 const tablet=clock(0),tv=clock(6000);await sync(tablet);await sync(tv);tablet.set(1000);
 const sample={...tablet.clock.captureTablet(),sequence:1,serverAt:{seconds:(epoch+7000)/1000}};
 assert.equal(sample.serverTime,epoch+1000);tablet.set(7600);tv.set(7600);assert(tv.clock.followTablet(sample));
 const timer={active:true,running:true,start:new Date(epoch).toISOString(),remaining:60};assert.equal(tv.clock.timerNow(),tablet.clock.now());assert.equal(tv.clock.seconds(timer),tablet.clock.seconds(timer));assert.equal(tv.clock.seconds(timer),53);
 for(const f of [tablet,tv]){const c={window:{KCSharedClock:f.clock}};vm.createContext(c);vm.runInContext(read('js/games/extra-core.js'),c);assert.equal(c.window.KCExtraGames.remaining({timer:{running:true,endsAt:epoch+60000}}),52400);}
 tablet.set(9400);tv.set(9400);assert.equal(tv.clock.seconds(timer),tablet.clock.seconds(timer));assert.equal(tv.clock.seconds({...timer,running:false,remaining:23}),23);
});
test('a snapshot received before viewer clock calibration catches up without waiting for another heartbeat',async()=>{
 const f=clock(6000);f.clock.followTablet({time:epoch-11000,serverTime:epoch-6000,sequence:4,serverAt:{seconds:epoch/1000}});assert.equal(f.clock.timerNow(),epoch-11000);await sync(f);assert.equal(f.clock.timerNow(),f.clock.now()-5000);f.set(2600);assert.equal(f.clock.timerNow(),epoch-2400);assert.equal(f.clock.followTablet({time:0,sequence:3}),false);
});
test('tablet uploads retain the simultaneous clock reference and update person/seating mirrors without reading them',async()=>{
 const db=database({[rootPath]:initial()}),c=apiClient(db);await c.firestoreApi.initializeSharedState('club',{},'sync_latency_init');const reads=[],run=db.sdk.runTransaction;
 // The adapter captures its SDK at creation, so install the read probe on a fresh client.
 db.sdk.runTransaction=(database,fn,options)=>run(database,tx=>fn({...tx,get:ref=>{reads.push(ref);return tx.get(ref);}}),options);
 const a=apiClient(db);a.KCSharedClock={captureTablet:()=>({time:epoch-5000,serverTime:epoch}),now:()=>epoch-5000};const state=a.KCSharedCore.clean(db.root());state.persons[0].drinks.beer=3;state.seatingOrder[0]='A';
 await a.firestoreApi.commitTabletBatch('club',{sequence:1,state,documents:[]},context(db,'commitTabletBatch'));
 assert.equal(db.root().tabletClock.serverTime,epoch);assert.equal(db.root().tabletClock.time,epoch-5000);assert.equal(db.root().persons[0].drinks.beer,3);assert.equal(db.data.get(personPath('A')).drinks.beer,3);assert.equal(db.data.get('clubs/club/live/seating').seatingOrder[0],'A');assert.equal(reads.filter(p=>p.includes('/livePersons/')||p.includes('/live/seating')).length,0);assert.equal(reads.length,2,'only root and receipt reads for a drink/seating batch');
});
test('loading a newer booking does not wait for a separate clock calibration request',async()=>{
 const db=database({[rootPath]:initial()}),c=apiClient(db);let resolve;const clockRequest=new Promise(r=>resolve=r);c.KCSharedClock={useClub:()=>clockRequest};const value=await Promise.race([c.firestoreApi.loadClubState('club'),new Promise((_,reject)=>setImmediate(()=>reject(Error('booking blocked by clock request'))))]);assert.equal(value.persons[0].name,'A');resolve(true);
});
test('canonical root snapshots detach legacy listeners, ignore late mirror events and paint one time per revision',()=>{
 let receive;const root={...initial(),syncProtocol:1,syncRevision:1};const d=dashboard({root:()=>root,subscribe:(_,fn)=>{receive=fn;return ()=>{};}}),channels=[];const api=d.c.window.firestoreApi;
 const listen=(...args)=>{const row={callback:args.find(x=>typeof x==='function'),stopped:false};channels.push(row);return ()=>row.stopped=true;};for(const k of ['subscribeToSeatingLive','subscribeToLiveGameState','subscribeToLivePersons'])api[k]=listen;
 vm.runInContext('var paints=0;var originalPaint=paint;paint=function(){paints++;return originalPaint()};',d.c);d.c.window.dashboardTest.connect('club','Club');assert(channels.length>0);receive(copy(root));assert(channels.every(x=>x.stopped));assert.equal(d.c.paints,1);for(const row of channels)row.callback(null);assert.equal(d.c.paints,1);receive(copy(root));assert.equal(d.c.paints,1,'metadata-only duplicate does not rebuild the page');const next=copy(root);next.syncRevision++;next.persons[0].drinks.beer=2;receive(next);assert.equal(d.c.paints,2);assert(d.document.getElementById('drinks-total').textContent.includes('4,00'));receive(copy(root));assert.equal(d.c.paints,2,'older snapshots cannot roll back a new booking');
});
test('a new drink updates the money immediately while preserving an unchanged game board DOM',()=>{
 let receive;const root={...initial(),syncProtocol:1,syncRevision:1,dashboardActiveGame:'mensch',menschState:{active:true,playerOrder:['A','B'],currentIndex:0,scores:{A:4,B:0},throws:{}}};const d=dashboard({root:()=>root,subscribe:(_,fn)=>{receive=fn;fn(copy(root));return ()=>{};}});Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});d.c.window.dashboardTest.connect('club','Club');const board=d.document.getElementById('game-body').firstChild;assert(board);const next=copy(root);next.syncRevision++;next.persons[0].drinks.beer=1;receive(copy(next));assert(d.document.getElementById('drinks-total').textContent.includes('2,00'));assert.equal(d.document.getElementById('game-body').firstChild,board,'no board rebuild, zoom or table layout for an unrelated drink');next.syncRevision++;next.menschState.scores.B=5;next.menschState.currentIndex=1;receive(copy(next));assert.notEqual(d.document.getElementById('game-body').firstChild,board,'a real throw does rebuild the board');assert(d.document.getElementById('game-body').textContent.includes('5'));
});
