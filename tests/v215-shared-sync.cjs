const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const evening='2026-11-12T19:00:00Z';
const rootPath='clubs/club/state/current';
const personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
function database(initial={}){
 const data=new Map(Object.entries(initial));let version=0,fail=false,lost=false,commits=0;
 const watches=new Set();
 const snap=key=>({exists:()=>data.has(key),data:()=>copy(data.get(key))});
 const sdk={initializeApp:()=>({}),getFirestore:()=>({}),doc:(_, ...p)=>p.join('/'),collection:(_, ...p)=>p.join('/'),serverTimestamp:()=>({serverTime:true}),
  getDoc:async key=>snap(key),getDocFromServer:async key=>{if(fail)throw Error('Network');return snap(key);},getDocs:async key=>({docs:[...data.keys()].filter(k=>k.startsWith(key+'/')&&k.slice(key.length+1).indexOf('/')<0).map(k=>({id:k.split('/').at(-1),data:()=>copy(data.get(k))}))}),
  onSnapshot:(key,...rest)=>{const callback=rest.find(x=>typeof x==='function');watches.add({key,callback});return ()=>{};},
  runTransaction:async(_,fn)=>{for(let n=0;n<50;n++){if(fail)throw Error('Network');const rev=version,pending=[];let writing=false;const out=await fn({get:async key=>{assert(!writing,'all Firestore reads must precede writes');await Promise.resolve();return snap(key);},set:(key,value,options)=>{writing=true;pending.push(()=>data.set(key,options?.merge?{...data.get(key),...copy(value)}:copy(value)));},delete:key=>{writing=true;pending.push(()=>data.delete(key));}});if(rev!==version)continue;pending.forEach(fn=>fn());if(pending.length){version++;commits++;}if(lost){lost=false;throw Error('Response lost');}return out;}throw Error('retry limit');},
  setDoc:()=>{throw Error('unguarded write');},deleteDoc:()=>{throw Error('unguarded delete');}};
 return {data,sdk,root:()=>copy(data.get(rootPath)),fail:x=>fail=x,lose:()=>lost=true,commits:()=>commits,deliver(){for(const {key,callback} of watches){if(key.endsWith('/current'))callback({...snap(key),metadata:{fromCache:false,hasPendingWrites:false}});}}};
}
const person=name=>({name,present:true,attendanceStatus:'present',drinks:{beer:0},strafen:{gosse:0,nine:0,loser:0},freeStrafen:[],rounds:[],tannenbaumCharges:[],paid:0,boughtThrows:0});
function initial(){return {persons:['A','B'].map(person),currentEveningStartedAt:evening,DRINKS:[{key:'beer',label:'Bier'}],prices:{beer:2},STRAFEN:[{key:'gosse',label:'Gosse'},{key:'nine',label:'9er / Kranz'},{key:'loser',label:'1. Verlierer'}],strafPrices:{gosse:0.5,nine:1,loser:1},STRAFEN_LIMIT:30,penaltyStatsLog:[],strafenHistory:[],spiele:[],seatingOrder:Array(16).fill(''),groupSettings:{T1:{label:'1'},T2:{label:'2'}},dartsState:{active:true,currentTeam:'T1',throws:[]}};}
function apiClient(db){
 const c={...db.sdk,console,window:{},setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto};c.window=c;vm.createContext(c);
 for(const p of ['js/game-fine-policy.js','js/shared-sync-core.js','js/shared-sync-transport.js','js/games/sechstage-core.js','js/games/table-games-core.js','js/games/individual-core.js','js/games/extra-core.js','js/game-options.js','js/club-content.js','js/game-results.js']){
  let src=read(p);if(p==='js/game-options.js')src=src.slice(0,src.indexOf('})();')+5);vm.runInContext(src,c,{filename:p});
 }
 let src=read('js/firebase.js').replace(/^import[\s\S]*?from .*?;\s*/gm,'').replace(/if \(typeof startApp === "function"\) \{[\s\S]*?\}/,'');
 vm.runInContext(src,c,{filename:'firebase.js'});return c;
}
async function prepared(initialRoot=initial()){
 const db=database({[rootPath]:copy(initialRoot)}),a=apiClient(db),b=apiClient(db);
 await a.firestoreApi.initializeSharedState('club',{},'sync_initialize');
 return {db,a,b,core:a.KCSharedCore};
}
let seq=0;
const context=(db,method,base=db.root())=>({opId:'sync_test_'+(++seq),method,base:copy(base),eveningStartedAt:base.currentEveningStartedAt||'',sideOperations:[]});
test('two devices increment the same drink without lost writes; the root and live mirror are identical',async()=>{
 const {db,a,b}=await prepared(),base=db.root();await Promise.all([a,b].map(c=>c.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter',base))));
 assert.equal(db.root().persons[0].drinks.beer,2);assert.equal(db.data.get(personPath('A')).drinks.beer,2);assert.equal(db.root().syncRevision,3);
});
test('independent settings and member fields merge; a conflicting field fails without writes',async()=>{
 const {db,a,b,core}=await prepared(),base=db.root(),one=copy(base),two=copy(base);one.prices.beer=3;two.persons[1].birthDate='1990-01-01';
 await Promise.all([[a,one],[b,two]].map(([c,next])=>c.firestoreApi.commitSharedChanges('club',{operations:core.diff(base,next)},context(db,'commitSharedChanges',base))));
 assert.equal(db.root().prices.beer,3);assert.equal(db.root().persons[1].birthDate,'1990-01-01');const count=db.commits();two.prices.beer=4;
 await assert.rejects(b.firestoreApi.commitSharedChanges('club',{operations:core.diff(base,two)},context(db,'commitSharedChanges',base)),/Inzwischen/);assert.equal(db.commits(),count);
});
test('a same-game race commits one game and its complete penalties, with no partial effects',async()=>{
 const {db,a,b,core}=await prepared(),base=db.root(),next=copy(base);next.dartsState.throws.push({id:'throw_one',value:0});next.persons[0].strafen.gosse=1;next.penaltyStatsLog.push({id:'stat_one',type:'gosse'});
 const ops=core.diff(base,next,{includeLive:true});const out=await Promise.allSettled([a,b].map(c=>c.firestoreApi.commitSharedChanges('club',{operations:ops,legacy:true},context(db,'commitSharedChanges',base))));
 assert.equal(out.filter(x=>x.status==='fulfilled').length,1);assert.equal(db.root().persons[0].strafen.gosse,1);assert.equal(db.root().penaltyStatsLog.length,1);assert.equal(db.data.get('clubs/club/liveGames/darts').state.throws.length,1);
});
test('an acknowledged operation can be retried after response loss without a second counter or game effect',async()=>{
 const {db,a}=await prepared(),ctx=context(db,'changeLivePersonCounter');db.lose();await assert.rejects(a.firestoreApi.changeLivePersonCounter('club','A','strafen','gosse',1,ctx),/Response lost/);assert.equal(db.root().persons[0].strafen.gosse,1);
 assert.equal(await a.firestoreApi.changeLivePersonCounter('club','A','strafen','gosse',1,ctx),1);assert.equal(db.root().persons[0].strafen.gosse,1);assert(await a.firestoreApi.getSharedReceipt('club',ctx.opId));
});
test('a stale status form preserves parallel counters and independent status changes',async()=>{
 const {db,a,b}=await prepared(),base=db.root(),ctx=context(db,'saveLivePersonStatus',base);await b.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter',base));
 await a.firestoreApi.saveLivePersonStatus('club','A',{...person('A'),left:true},ctx);assert.equal(db.root().persons[0].left,true);assert.equal(db.root().persons[0].drinks.beer,1);
 const same=copy(base);await assert.rejects(b.firestoreApi.saveLivePersonStatus('club','A',{...person('A'),left:false,tisch:'T2'},context(db,'saveLivePersonStatus',same)),/Inzwischen/);
});
test('separate member insertions and per-member free charges survive concurrently',async()=>{
 const {db,a,b,core}=await prepared(),base=db.root();const one=copy(base),two=copy(base);one.persons.push(person('Gast 1'));two.persons.push(person('Gast 2'));
 await Promise.all([[a,one],[b,two]].map(([c,next])=>c.firestoreApi.commitSharedChanges('club',{operations:core.diff(base,next)},context(db,'commitSharedChanges',base))));assert.equal(db.root().persons.length,4);
 await Promise.all([a,b].map((c,i)=>c.firestoreApi.addLivePersonFreeStrafe('club','A',{id:'free_'+i,amount:1,reason:'Test'},context(db,'addLivePersonFreeStrafe'))));assert.equal(db.root().persons[0].freeStrafen.length,2);
});
test('the shared protocol rejects bulk snapshots and missing command contexts',async()=>{
 const {db,a}=await prepared(),base=db.root();await assert.rejects(a.firestoreApi.saveClubState('club',initial(),context(db,'saveClubState')),/Vollständige/);await assert.rejects(a.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1),/veraltet/);assert.deepEqual(db.root(),base);
});
test('new-evening retry recovers its receipt before checking the old evening and rejects stale entries',async()=>{
 const {db,a}=await prepared(),base=db.root(),ctx=context(db,'startNewEvening'),payload={...copy(base),currentEveningStartedAt:'2026-12-01T19:00:00Z'},req={opId:'evening_test',expectedEvening:evening,payload};db.lose();await assert.rejects(a.firestoreApi.startNewEvening('club',req,ctx),/Response lost/);assert.equal(db.root().currentEveningStartedAt,payload.currentEveningStartedAt);
 await a.firestoreApi.startNewEvening('club',req,ctx);assert.equal(db.root().eveningResetRevision,1);await assert.rejects(a.firestoreApi.changeLivePersonCounter('club','A','strafen','gosse',1,context(db,'changeLivePersonCounter',base)),/Inzwischen/);assert.equal(db.root().persons[0].strafen.gosse,0);
});
module.exports={database,apiClient,prepared,initial,context,copy,rootPath,read};
function fullApp(db){
 const {document}=parseHTML(read('getraenke-abrechnung.html')),storage=new Map(),events=new Map(),timers=new Map();let ti=0;
 const c={...db.sdk,MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}disconnect(){}},Audio:class{play(){return Promise.resolve();}pause(){}},document,console:{log(){},warn(){},error:console.error},crypto:require('node:crypto').webcrypto,navigator:{onLine:true},location:{search:'',href:'https://example.test/getraenke-abrechnung.html'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},setTimeout:(fn,ms)=>{timers.set(++ti,{fn,ms});return ti;},clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},URL,URLSearchParams,Blob,Intl,performance,confirm:()=>true,alert(){},addEventListener:(key,fn)=>{if(!events.has(key))events.set(key,[]);events.get(key).push(fn);},removeEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=>'',display:'block'}),scrollTo(){}};c.window=c;c.globalThis=c;vm.createContext(c);
 for(const el of document.querySelectorAll('form'))el.reset=()=>{};
 // linkedom implements select.value as a getter only.
 for(const el of document.querySelectorAll('select'))Object.defineProperty(el,'value',{configurable:true,get(){const o=[...this.querySelectorAll('option')].find(x=>x.selected);return o?.value||this.querySelector('option')?.value||'';},set(v){for(const o of this.querySelectorAll('option'))o.selected=o.value===String(v);}});
 for(const script of document.querySelectorAll('script[src]')){const p=script.getAttribute('src').split('?')[0];if(!p.startsWith('js/'))continue;let src=read(p);if(p==='js/firebase.js')src=src.replace(/^import[\s\S]*?from .*?;\s*/gm,'').replace(/if \(typeof startApp === "function"\) \{[\s\S]*?\}/,'');vm.runInContext(src,c,{filename:p});}
 vm.runInContext("appReady=true;CLUBS={'Club':createEmptyClubData()};ACTIVE_CLUB=null;",c);
 return {c,document,storage,events,timers,run:code=>vm.runInContext(code,c),select:()=>c.selectClub('Club')};
}
test('the complete app boots from the server, never uploads a stale cache, and listens to canonical revisions',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);app.run("CLUBS.Club.persons=[{name:'OLD CACHE',drinks:{beer:900}}]");await app.select();assert(app.c.KCSharedSync.ready);assert.deepEqual(app.run('persons.map(p=>p.name)').join(','),'A,B');
 const other=apiClient(db);await other.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter'));db.deliver();assert.equal(app.run("persons[0].drinks.beer"),1);assert.equal(app.document.querySelector('#shared-sync-status').dataset.mode,'ready');
});
test('the complete app refuses to upload local data when the server is unavailable',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);app.run("CLUBS.Club.persons=[{name:'OLD CACHE'}]");db.fail(true);await app.select();assert(!app.c.KCSharedSync.ready);assert.equal(db.commits(),0);assert.equal(db.root().persons[0].name,'A');assert.equal(await app.c.saveToFirestore(false),false);
 db.fail(false);await app.c.KCSharedSync.reconnect();assert(app.c.KCSharedSync.ready);assert.equal(app.run('persons[0].name'),'A');assert.equal(db.commits(),1);assert.equal(db.root().syncInitialized,true);
});
test('the complete app sends targeted member changes and reconciles a concurrent second device edit',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);await app.select();const other=apiClient(db);
 app.run("persons[0].memberRole='cashier';persistState()");await other.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter'));db.deliver();assert.equal(app.run('persons[0].memberRole'),'cashier');await app.c.KCSharedSync.flush();assert.equal(db.root().persons[0].memberRole,'cashier');assert.equal(db.root().persons[0].drinks.beer,1);
});
test('the complete legacy house-number controller commits throws and special fines together',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);await app.select();app.run("persons[0].tisch='T1';persons[1].tisch='T2';persistState()");await app.c.KCSharedSync.flush();
 await app.c.startHausGame('hoch');assert(db.root().haushochState.active);const name=db.root().haushochState.playerOrder[0];await app.c.hausThrow('hoch',0,true,0);assert.equal(db.root().haushochState.rows[name][0].isGosse,true);assert.equal(db.root().persons.find(p=>p.name===name).strafen.gosse,1);assert.equal(app.c.KCSharedSync.ready,true);
});
test('a stale open profile is rejected even after the listener has refreshed the underlying person',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);await app.select();app.c.openMemberProfile('A');const other=apiClient(db),base=db.root(),next=copy(base);next.persons[0].birthDate='1980-01-01';await other.firestoreApi.commitSharedChanges('club',{operations:other.KCSharedCore.diff(base,next)},context(db,'commitSharedChanges',base));db.deliver();
 app.document.getElementById('member-profile-birthdate').value='1990-01-01';app.document.getElementById('member-profile-since').value='';app.document.getElementById('member-profile-role').value='member';
 app.document.querySelector('#member-profile-modal form').dispatchEvent(new (parseHTML('<html/>').window.Event)('submit',{bubbles:true,cancelable:true}));await app.c.saveMemberProfile({preventDefault(){}});assert.equal(db.root().persons[0].birthDate,'1980-01-01');
});
test('the complete app recovers a lost drink acknowledgement exactly once',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);await app.select();db.lose();await app.c.changeSyncedPersonCounter('A','drinks','beer',1);assert(!app.c.KCSharedSync.ready);assert.equal(db.root().persons[0].drinks.beer,1);await app.c.KCSharedSync.reconnect();assert(app.c.KCSharedSync.ready);assert.equal(db.root().persons[0].drinks.beer,1);assert.equal(app.run('persons[0].drinks.beer'),1);
});
test('modern individual game commands and legacy counters share the same canonical root',async()=>{
 const {db,a,b}=await prepared();const request={gameKey:'guterschnitt',gameId:'indgame_test_cut',expectedRevision:0,opId:'ind_test_start',action:'start',players:['A','B'],config:{...a.KCExtraGames.defaults('guterschnitt'),targets:[3,5]},eveningStartedAt:evening};const first=await a.firestoreApi.transactIndividualGame('club',request,context(db,'transactIndividualGame'));
 await Promise.all([a.firestoreApi.transactIndividualGame('club',{...request,action:'throw',expectedRevision:first.state.revision,opId:'ind_test_throw',kind:'gosse'},context(db,'transactIndividualGame')),b.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter'))]);assert.equal(db.root().persons[0].drinks.beer,1);assert.equal(db.root().persons[0].strafen.gosse,1);assert.equal(db.root().guterschnittState.history.length,1);assert.equal(db.data.get('clubs/club/liveGames/guterschnitt').state.history.length,1);
});
test('stale archive deletion and accidental archive replacement are rejected',async()=>{
 const {db,a}=await prepared();const key='clubs/club/archive/strafen_abend_one';db.data.set(key,{category:'strafen',ledgerRevision:2});await assert.rejects(a.firestoreApi.deleteArchivedStrafenEvent('club','strafen_abend_one',1,context(db,'deleteArchivedStrafenEvent')),/inzwischen/);assert(db.data.has(key));await assert.rejects(a.firestoreApi.archiveClubEvent('club','strafen_abend_one',{category:'strafen'},context(db,'archiveClubEvent')),/Inzwischen/);await a.firestoreApi.deleteArchivedStrafenEvent('club','strafen_abend_one',2,context(db,'deleteArchivedStrafenEvent'));assert(!db.data.has(key));
});
test('a pending targeted change survives a temporary offline period before its first send',async()=>{
 const db=database({[rootPath]:initial()}),app=fullApp(db);await app.select();app.run("persons[0].memberRole='cashier';persistState()");app.c.navigator.onLine=false;for(const fn of app.events.get('offline')||[])fn();assert(!app.c.KCSharedSync.ready);app.c.navigator.onLine=true;await app.c.KCSharedSync.reconnect();assert.equal(db.root().persons[0].memberRole,'cashier');assert(app.c.KCSharedSync.ready);
});
test('initialization mirrors recalculated totals and seating, and cannot recreate old cached people',async()=>{
 const value=initial();value.persons[0].strafen.gosse=3;value.seatingOrder[0]='A';const {db}=await prepared(value);assert.equal(db.root().persons[0].strafTotal,4.5);assert.equal(db.data.get(personPath('A')).strafTotal,4.5);assert.equal(db.data.get('clubs/club/live/seating').seatingOrder[0],'A');
});
test('a new person supplied by the actual API retains profile data in the same canonical command',async()=>{
 const {db,a,core}=await prepared(),base=db.root(),next=copy(base),p={...person('Gast 1'),isGuest:true,avatarData:'data:picture'};next.persons.push(p);const ctx=context(db,'saveLivePerson');ctx.sideOperations=core.diff(base,next);await a.firestoreApi.saveLivePerson('club',p.name,p,ctx);assert.equal(db.root().persons.find(x=>x.name===p.name).avatarData,'data:picture');assert.equal(db.data.get(personPath(p.name)).avatarData,'data:picture');
});
test('two complete apps competing for the same house-number throw preserve exactly one throw and penalty',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();await a.c.startHausGame('hoch');const b=fullApp(db);await b.select();const name=db.root().haushochState.playerOrder[0];await Promise.all([a.c.hausThrow('hoch',0,true,0),b.c.hausThrow('hoch',9,false,0)]);assert.equal(db.root().haushochState.undoStack.length,1);const row=db.root().haushochState.rows[name][0];assert(row);const count=db.root().persons.find(p=>p.name===name).strafen.gosse;assert.equal(count,row.isGosse?1:0);assert.equal(db.root().persons.reduce((n,p)=>n+p.strafen.nine,0),row.isGosse?0:1);
});
test('independent changes from a stale status form keep a newer payment and arrival time',async()=>{
 const value=initial();Object.assign(value.persons[0],{left:false,arrivalTime:'20:00',tisch:'T1'});const {db,a,b}=await prepared(value),base=db.root();await a.firestoreApi.saveLivePersonPayment('club','A',4,context(db,'saveLivePersonPayment',base));await b.firestoreApi.saveLivePersonStatus('club','A',{...base.persons[0],arrivalTime:'20:15'},context(db,'saveLivePersonStatus',base));assert.equal(db.root().persons[0].paid,4);assert.equal(db.root().persons[0].arrivalTime,'20:15');
});
test('the canonical fine calculation matches the app for time fines, cap, OnTop and tied gutter kings',async()=>{
 const value=initial();value.STRAFEN.push({key:'late',label:'Verspätung'},{key:'early',label:'Früher gegangen'});Object.assign(value.strafPrices,{late:1,early:1});value.timePenaltySettings={startTime:'20:00',endTime:'23:00'};Object.assign(value.persons[0],{arrivalTime:'20:16',leftEarlyAt:'22:45',freeStrafen:[{id:'fee',reason:'Zusatz',amount:40},{id:'top',reason:'Zusatz',amount:2,onTop:true}]});value.persons[0].strafen.gosse=2;value.persons[1].strafen.gosse=2;const db=database({[rootPath]:value}),app=fullApp(db);await app.select();for(const p of db.root().persons){const amount=app.run('calcPersonStrafenTotalCapped(persons.find(p=>p.name==='+JSON.stringify(p.name)+'))');assert.equal(p.strafTotal,amount);}
});
test('new evening clears both seating documents and opens the dashboard overview in the same transaction',async()=>{
 const value=initial();value.seatingOrder[0]='A';value.dashboardGameOverview={open:false,revision:4};const db=database({[rootPath]:value}),app=fullApp(db);await app.select();assert(await app.c.startNewKegelabend());const state=db.root();assert(state.seatingOrder.every(x=>x===''));assert(db.data.get('clubs/club/live/seating').seatingOrder.every(x=>x===''));assert(state.dashboardGameOverview.open);assert.equal(state.dashboardGameOverview.revision,5);assert.equal(state.dashboardActiveGame,null);
 const w={};new Function('window',read('js/game-overview.js'))(w);assert(w.KCGameOverview.visible(state));assert(!state.dartsState.active);
 const {document}=parseHTML('<html><body><div id="dashboard-seating"></div></body></html>'),source=read('dashboard.html'),start=source.indexOf('function renderDashboardSeating('),end=source.indexOf('\nfunction ',start+1);const fn=new Function('state','seatingLive','document','$',source.slice(start,end)+';return renderDashboardSeating;')(state,{seatingOrder:['A']},document,id=>document.getElementById(id));fn(state.persons);assert.equal(document.querySelectorAll('.tv-seat.taken').length,0);
});
test('an idempotent no-op API still commits pending independent changes atomically',async()=>{
 const {db,a,core}=await prepared(),base=db.root(),next=copy(base);next.persons[0].memberRole='cashier';const ctx=context(db,'setDashboardRules');ctx.sideOperations=core.diff(base,next);
 // The underlying handler intentionally makes no writes, as repeated modern
 // commands may do. The pending member edit must still reach the root/mirror.
 const transport=a.KCSharedTransport.create({...db.sdk,db:{},core,policy:a.KCGameFinePolicy});await transport.transaction('club',ctx,async()=>({repeat:true}));assert.equal(db.root().persons[0].memberRole,'cashier');assert.equal(db.data.get(personPath('A')).memberRole,'cashier');
});
