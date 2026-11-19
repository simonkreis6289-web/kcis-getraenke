const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+name.toLowerCase();
class FakeBroadcastChannel{static channels=new Map();constructor(name){this.name=name;const set=FakeBroadcastChannel.channels.get(name)||new Set();set.add(this);FakeBroadcastChannel.channels.set(name,set);}postMessage(value){for(const target of FakeBroadcastChannel.channels.get(this.name)||[])if(target!==this)queueMicrotask(()=>{if(!target.closed)target.onmessage?.({data:copy(value)});});}close(){this.closed=true;FakeBroadcastChannel.channels.get(this.name)?.delete(this);}}
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true,BroadcastChannel:FakeBroadcastChannel');
const {database,initial,apiClient,context,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath','FakeBroadcastChannel',factory+';return {database,initial,apiClient,context,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath,FakeBroadcastChannel);
const ds=read('tests/v185-regression.cjs'),start=ds.indexOf('function context(html){'),end=ds.indexOf('async function settle(',start),dashboard=new Function('read','vm','parseHTML','assert','require','let sequence=0;'+ds.slice(start,end)+';return dashboard;')(read,vm,parseHTML,assert,require);
const tick=()=>new Promise(r=>setImmediate(r));
test('the fast buttons and Tiberius show throw popups over the direct link while Firebase cannot save',async()=>{
 const root=initial(),now=Date.now();
 root.penaltyStatsLog=Array.from({length:70},(_,i)=>({id:'old-'+i,type:'gosse',thrower:'B',eveningStartedAt:evening,createdAt:new Date(now-60000-i*1000).toISOString()}));
 const db=database({[rootPath]:root}),a=fullApp(db);
 await a.select();
 const d=dashboard({root:()=>db.root(),subscribe:(_,fn)=>{fn(db.root());return ()=>{};}});
 d.c.window.BroadcastChannel=FakeBroadcastChannel;
 d.document.querySelector('main.dashboard .stage').getBoundingClientRect=()=>({left:0,width:800});
 for(const name of ['dashboard-link','dashboard-layout','dashboard-layout-tv'])vm.runInContext(read('js/'+name+'.js'),d.c);
 const tv=d.c.window.KCDashboardLayoutTV;
 d.c.window.KCDashboardLayoutTV={apply(){},highlight(){},ticker(){},feed:tv.feed};
 Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});
 d.c.window.dashboardTest.connect('club','Club');
 try{
  db.fail(true);
  for(const [type,label] of [['gosse','Gosse'],['9er','Alle Neune'],['kranz','Kranz'],['durchgeworfen','Durchgeworfen']]){
   const fastButton=a.document.querySelector(`.quick-penalty-bar button[onclick="openPenaltyQuick('${type}')"]`);
   assert(fastButton);
   a.run(fastButton.getAttribute('onclick'));
   a.document.querySelector('.quick-penalty-person-btn[data-person-name="A"]').onclick();
   await a.c.confirmQuickPenalty();
   await tick();
   assert.equal(a.run('penaltyStatsLog[0].type'),type,'tablet records the fast-button throw');
   assert.equal(vm.runInContext('state.penaltyStatsLog[0].type',d.c),type,'TV receives the fast-button throw');
   const popup=d.document.getElementById('dashboard-throw-popup');
   assert(popup&&!popup.hidden);
   assert.match(popup.textContent,new RegExp(label+'.*A'));
  }
  a.run('tiberiusState.targets=[50];tiberiusState.columnCount=1;tiberiusState.targetsGenerated=true');
  await a.c.startTiberiusGameFinal('A');
  for(const [value,type,label,thrower] of [[0,'gosse','Gosse','A'],[9,'9er','Alle Neune','B'],[12,'Kranz','Kranz','A'],['durchgeworfen','durchgeworfen','Durchgeworfen','B']]){
   await a.c.handleTiberiusThrow(value);
   await tick();
   assert.equal(vm.runInContext('state.penaltyStatsLog[0].type',d.c),type);
   const popup=d.document.getElementById('dashboard-throw-popup');
   assert(popup&&!popup.hidden);
   assert.match(popup.textContent,new RegExp(label+'.*'+thrower));
  }
  assert.equal(db.root().penaltyStatsLog.length,70);
 }finally{
  d.c.window.dashboardTest.unsubscribe();
  a.c.KCTabletSync.begin('other');
 }
});
test('the statutes dashboard button opens, pages and closes over the direct link despite stale Firebase state',async()=>{
 const root=initial(),path='clubs/club/documents/statutes',db=database({[rootPath]:root,[path]:{text:'§ 1 – Satzung',revision:2}});
 const a=fullApp(db);
 await a.select();
 const d=dashboard({root:()=>db.root(),subscribe:(_,fn)=>{fn(db.root());return ()=>{};}});
 d.c.window.BroadcastChannel=FakeBroadcastChannel;
 d.c.window.removeEventListener=()=>{};
 d.c.window.firestoreApi.subscribeClubContent=(_,kind,fn)=>{fn(db.data.get('clubs/club/documents/'+kind));return ()=>{};};
 for(const name of ['dashboard-link','club-content','club-content-pager','club-content-dashboard'])vm.runInContext(read('js/'+name+'.js'),d.c);
 Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});
 d.c.window.dashboardTest.connect('club','Club');
 try{
  a.c.KCClubContentApp.render();
  db.fail(true);
  const button=a.document.getElementById('club-statutes-dashboard'),overlay=d.document.getElementById('club-content-dashboard');
  assert.equal(button.disabled,false);
  assert(await a.run(button.getAttribute('onclick')));
  await tick();
  assert.equal(overlay.hidden,false);
  assert.equal(overlay.dataset.contentKind,'statutes');
  db.deliver();
  assert.equal(button.getAttribute('aria-pressed'),'true');
  assert(await a.c.KCClubContentApp.turn('statutes',1));
  await tick();
  assert.equal(vm.runInContext('state.dashboardClubContent.turn',d.c),1);
  assert(await a.run(button.getAttribute('onclick')));
  await tick();
  assert.equal(overlay.hidden,true);
  assert.equal(button.getAttribute('aria-pressed'),'false');
  assert.equal(db.root().dashboardClubContent,undefined);
 }finally{
  d.c.window.dashboardTest.unsubscribe();
  a.c.KCTabletSync.begin('other');
 }
});
test('direct display carries drinks, throws and timer pause while cloud upload is blocked; old cloud snapshots cannot undo it',{timeout:60000},async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();let receive;const d=dashboard({root:()=>db.root(),subscribe:(_,fn)=>{receive=fn;fn(db.root());return ()=>{};}});d.c.window.BroadcastChannel=FakeBroadcastChannel;vm.runInContext(read('js/dashboard-link.js'),d.c);Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});d.c.window.dashboardTest.connect('club','Club');
 db.fail(true);await a.c.changeDrink('A','beer',1);await tick();assert.equal(db.root().persons[0].drinks.beer,0);assert(d.document.getElementById('drinks-total').textContent.includes('2,00'));
 a.document.getElementById('team-countdown-minutes').value='1';a.c.saveTeamCountdownDuration();await a.c.startTeamStopwatch();await tick();assert.equal(vm.runInContext('state.teamStopwatchRunning',d.c),true);await a.c.pauseTeamStopwatch();await tick();assert.equal(vm.runInContext('state.teamStopwatchRunning',d.c),false);assert.equal(vm.runInContext('state.teamCountdownRemainingBefore',d.c),a.run('teamCountdownRemainingBefore'));
 await a.c.startMenschGameFinal('A');await a.c.applyMenschThrow(4);await tick();assert(d.document.getElementById('game-title').textContent.includes('Mensch'));assert.equal(vm.runInContext('state.menschState.scores.A',d.c),4);receive(db.root());assert.equal(vm.runInContext('state.menschState.scores.A',d.c),4);assert.equal(await a.c.KCSharedSync.waitForUpload(),false);assert.equal(db.root().menschState,undefined);
 db.fail(false);assert(await a.c.KCSharedSync.reconnect());receive(db.root());assert.equal(vm.runInContext('directFrame',d.c),null);assert.equal(db.root().persons[0].drinks.beer,1);assert.equal(db.root().menschState.scores.A,4);d.c.window.dashboardTest.unsubscribe();a.c.KCTabletSync.begin('other');
});
test('a new evening uses the previous canonical identifier, clears every game and can be followed immediately by another booking',{timeout:60000},async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();await a.c.changeDrink('A','beer',1);assert(await a.c.KCSharedSync.waitForUpload());const old=db.root().currentEveningStartedAt;assert.equal(await a.c.startNewKegelabend(),true);assert(await a.c.KCSharedSync.waitForUpload());assert.notEqual(db.root().currentEveningStartedAt,old);assert(db.root().seatingOrder.every(x=>x===''));assert(db.root().dashboardGameOverview.open);assert.equal(db.root().persons[0].drinks.beer,0);const c=apiClient(db);await assert.rejects(c.firestoreApi.startNewEvening('club',{expectedEvening:old,opId:'evening_rejected_stale',payload:{currentEveningStartedAt:new Date().toISOString()}},context(db,'startNewEvening')),/inzwischen gewechselt/);await a.c.changeDrink('A','beer',1);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[0].drinks.beer,1);a.c.KCTabletSync.begin('other');
});
test('team drink dropdown excludes solo games and bills the actual cross-side pair; round metadata survives PDF snapshots',{timeout:60000},async()=>{
 const root=initial();root.persons=['A','B','C','D'].map((name,i)=>({...copy(root.persons[0]),name,tisch:i%2?'T2':'T1'}));const db=database({[rootPath]:root}),a=fullApp(db);await a.select();a.run("sechstageState=KCSixDays.command(KCSixDays.empty(),{action:'start',opId:'six_pair_start',expectedRevision:0,raceId:'race_drink_pair',teams:[{players:['A','B']},{players:['C','D']}],bonus:false},{now:new Date().toISOString(),eveningStartedAt:currentEveningStartedAt,people:persons}).state;renderAll();persistState()");
 const select=a.document.getElementById('spieltyp-select');Object.defineProperty(select,'value',{value:'Ballermann 6',writable:true,configurable:true});const options=[...select.querySelectorAll('option')].map(x=>x.value);assert(!options.includes('17 + 4 / Blackjack'));assert(!options.includes('Poker'));for(const name of ['Sechs-Tage-Rennen','Glücksspirale','Parteienspiel','Ballermann 6','Tannenbaum'])assert(options.includes(name));select.value='Sechs-Tage-Rennen';a.c.changeTeamGameSelection();const pair=a.c.getDrinkTeamChoices()[0];assert.deepEqual(copy(pair.members.map(p=>p.name)),['A','B']);a.c.selectLoser(pair.id);a.document.getElementById('team-drink-reason').value='round';a.c.changeTeamDrink('beer',3);a.c.addSpiel();assert.deepEqual(copy(a.run('spiele[0].members')),['A','B']);assert.equal(a.run('persons.find(p=>p.name==="A").teamExtra'),3);assert.equal(a.run('persons.find(p=>p.name==="B").teamExtra'),3);assert.equal(a.run('persons.find(p=>p.name==="C").teamExtra'),0);assert.equal(a.run('getDrinksSnapshot().spiele[0].teamName'),'A + B');assert(a.run('getDrinksSnapshot().spiele[0].roundGiven'));assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[1].teamExtra,3);
 select.value='Sechs-Tage-Rennen';a.c.changeTeamGameSelection();a.c.selectLoser(pair.id);a.c.changeTeamDrink('beer',1);a.run('persons.find(p=>p.name==="B").left=true');a.c.addSpiel();assert.equal(a.run('spiele.length'),1,'missing partner never silently charges the remaining player');
 a.run("persons.find(p=>p.name==='B').left=false;gluecksspiraleState=KCTableGames.command(KCTableGames.empty('gluecksspirale'),{action:'start',gameKey:'gluecksspirale',opId:'table_drink_pairs',gameId:'game_drink_pairs',expectedRevision:0,target:50,teams:[{players:['A','D']},{players:['B','C']}]},{now:new Date().toISOString(),eveningStartedAt:currentEveningStartedAt,people:persons}).state");select.value='Glücksspirale';a.c.changeTeamGameSelection();assert.deepEqual(copy(a.c.getDrinkTeamChoices()[0].members.map(p=>p.name)),['A','D']);a.c.KCTabletSync.begin('other');
});
test('peer signaling stays outside accounting state and a stale answer cannot replace a newer offer',async()=>{
 const db=database({[rootPath]:initial()}),c=apiClient(db);await c.firestoreApi.initializeSharedState('club',{},'sync_peer_init');const root=copy(db.root());await c.firestoreApi.sendDashboardSignal('club',{action:'offer',viewerId:'viewer_one',connectionId:'connection_one',description:{type:'offer',sdp:'v=0 offer'}});await c.firestoreApi.sendDashboardSignal('club',{action:'offer',viewerId:'viewer_one',connectionId:'connection_two',description:{type:'offer',sdp:'v=0 offer 2'}});assert.equal(await c.firestoreApi.sendDashboardSignal('club',{action:'answer',viewerId:'viewer_one',connectionId:'connection_one',source:'publisher',description:{type:'answer',sdp:'v=0 stale'}}),false);const key='clubs/club/documents/dashboard_link_viewer_one';assert.equal(db.data.get(key).answer,null);await c.firestoreApi.sendDashboardSignal('club',{action:'answer',viewerId:'viewer_one',connectionId:'connection_two',source:'publisher',description:{type:'answer',sdp:'v=0 answer'}});assert.equal(db.data.get(key).answer.sdp,'v=0 answer');assert.deepEqual(db.root(),root);assert.equal(db.data.get(key).syncRevision,undefined);
});
test('display frames omit persistence history and cannot roll back a confirmed sequence or cross into an unrelated evening',()=>{
 const w={};new Function('window',read('js/dashboard-link.js'))(w);const link=w.KCDashboardLink,base={tabletSequence:10,currentEveningStartedAt:'old',eveningResetRevision:2,persons:[{name:'A'}],strafenHistory:[{id:'book'}]},frame={sequence:11,baseEvening:'old',state:{persons:[{name:'B'}],currentEveningStartedAt:'new',eveningResetRevision:3},clock:{time:100}};assert.equal(link.reconcile(base,{...frame,sequence:9}),base);assert.equal(link.reconcile({...base,currentEveningStartedAt:'unrelated'},frame).currentEveningStartedAt,'unrelated');const view=link.reconcile(base,frame);assert.equal(view.currentEveningStartedAt,'new');assert.deepEqual(view.strafenHistory,base.strafenHistory);const compact=link.project({...base,strafenHistory:[{large:'x'}],menschState:{scores:{A:4},undoStack:[{huge:'x'}],commands:['x'],receipts:['x']}});assert(!compact.strafenHistory);assert(!compact.menschState.undoStack);assert(!compact.menschState.commands);assert.equal(compact.menschState.scores.A,4);
});

test('data-channel negotiation, chunk reassembly and backpressure send the latest view without per-throw cloud writes',async()=>{
 const pcs=new Map(),timers=new Map(),sent=[];let id=0;
 class Channel{constructor(){this.readyState='connecting';this.bufferedAmount=0;}send(data){assert.equal(this.readyState,'open');sent.push(data.length);queueMicrotask(()=>this.other?.onmessage?.({data}));}close(){if(this.readyState==='closed')return;this.readyState='closed';this.onclose?.();}}
 class Peer{constructor(){this.id=String(++id);pcs.set(this.id,this);this.connectionState='new';this.iceGatheringState='complete';}createDataChannel(){return this.channel=new Channel();}async createOffer(){return {type:'offer',sdp:this.id};}async createAnswer(){return {type:'answer',sdp:this.id};}async setLocalDescription(d){this.localDescription=d;}async setRemoteDescription(d){this.remoteDescription=d;this.partner=pcs.get(d.sdp);if(d.type==='offer'){this.channel=new Channel();this.channel.other=this.partner.channel;this.partner.channel.other=this.channel;this.ondatachannel({channel:this.channel});}else{this.channel.readyState=this.partner.channel.readyState='open';this.connectionState=this.partner.connectionState='connected';this.channel.onopen?.();this.partner.channel.onopen?.();}}close(){if(this.connectionState==='closed')return;this.connectionState='closed';this.channel?.close();this.onconnectionstatechange?.();}}
 const w={RTCPeerConnection:Peer},module=new Function('window','crypto','setInterval','clearInterval',read('js/dashboard-link.js')+';return window.KCDashboardLink;')(w,require('node:crypto').webcrypto,fn=>{const key=++id;timers.set(key,fn);return key;},key=>timers.delete(key));let offers,answers,record;const writes=[],api={subscribeDashboardOffers:(_,fn)=>{offers=fn;return ()=>{};},subscribeDashboardAnswer:(_,who,fn)=>{answers=fn;return ()=>{};},sendDashboardSignal:async(_,r)=>{writes.push(r);record=r.action==='offer'?{...r,offer:r.description,expiresAt:Date.now()+120000}:{...record,answer:r.description};if(r.action==='offer')offers([record]);else await answers(record);return true;}};
 const publisher=module.create({role:'publisher',club:'club',api}),frames=[],viewer=module.create({role:'viewer',club:'club',api,getBase:()=>({syncProtocol:1}),onFrame:f=>frames.push(f)});publisher.publish({persons:[{name:'A'}],currentEveningStartedAt:evening},1,evening);for(const fn of [...timers.values()])fn();for(let n=0;n<8;n++)await tick();assert.equal(frames.at(-1)?.sequence,1);assert.equal(writes.length,2);const measurement=await publisher.test();assert.equal(measurement.via,'webrtc');assert(measurement.ms>=0);
 const sending=[...pcs.values()].find(p=>p.remoteDescription?.type==='offer').channel;sending.bufferedAmount=300000;publisher.publish({persons:[{name:'A',avatarData:'x'.repeat(200000)}]},2,evening);publisher.publish({persons:[{name:'A',avatarData:'y'.repeat(200000)}],teamStopwatchRunning:false,menschState:{scores:{A:7}}},3,evening);await tick();assert.equal(frames.at(-1).sequence,1);sending.bufferedAmount=0;sending.onbufferedamountlow();for(let n=0;n<5;n++)await tick();assert.equal(frames.at(-1).sequence,3);assert.equal(frames.at(-1).state.persons[0].avatarData.length,200000);assert.equal(frames.at(-1).state.teamStopwatchRunning,false);assert.equal(frames.at(-1).state.menschState.scores.A,7);assert(sent.length>20);assert(Math.max(...sent)<50000);assert.equal(writes.length,2,'throws and pauses never enter the signaling transaction queue');publisher.close();viewer.close();assert.equal(timers.size,0);
});
test('an unavailable peer implementation leaves the existing cloud path usable without an unhandled rejection',async()=>{
 const timers=[],w={RTCPeerConnection:class{constructor(){throw Error('TV does not support peer channels');}}},module=new Function('window','crypto','setInterval','clearInterval',read('js/dashboard-link.js')+';return window.KCDashboardLink;')(w,require('node:crypto').webcrypto,fn=>{timers.push(fn);return timers.length;},()=>{});let offers;const api={subscribeDashboardOffers:(_,fn)=>{offers=fn;return ()=>{};},subscribeDashboardAnswer:()=>()=>{},sendDashboardSignal:async()=>{throw Error('must not write a broken offer');}};const publisher=module.create({role:'publisher',club:'club',api}),viewer=module.create({role:'viewer',club:'club',api,getBase:()=>({syncProtocol:1})});publisher.publish({persons:[]},1,evening);offers([{viewerId:'viewer',connectionId:'connection',expiresAt:Date.now()+10000,offer:{type:'offer',sdp:'x'}}]);for(const fn of timers)fn();await tick();publisher.close();viewer.close();
});

test('without WebRTC the TV reports Firebase presence and echoes a real round-trip probe',async()=>{
 const listeners=new Map(),intervals=new Set(),writes=[];
 let elapsed=0;
 const api={
  subscribeDashboardDiagnostic(club,channel,fn){
   assert.equal(club,'club');
   if(!listeners.has(channel))listeners.set(channel,new Set());
   listeners.get(channel).add(fn);
   return ()=>listeners.get(channel).delete(fn);
  },
  async sendDashboardDiagnostic(club,request){
   assert.equal(club,'club');
   writes.push(request.kind);
   if(request.kind==='pong')elapsed+=37;
   const channel=request.kind==='presence'?'presence':'probe';
   for(const fn of listeners.get(channel)||[])fn({...request,expiresAt:Date.now()+15000});
   return true;
  }
 };
 const window={navigator:{onLine:true},performance:{now:()=>elapsed}};
 const link=new Function('window','crypto','setInterval','clearInterval',read('js/dashboard-link.js')+';return window.KCDashboardLink;')(
  window,require('node:crypto').webcrypto,fn=>{intervals.add(fn);return fn;},fn=>intervals.delete(fn));
 const statuses=[],base=()=>({syncProtocol:1,tabletSequence:0});
 const publisher=link.create({role:'publisher',club:'club',api,getBase:base,onStatus:value=>statuses.push(value)});
 const viewer=link.create({role:'viewer',club:'club',api,getBase:base});
 try{
  for(const poll of intervals)poll();
  await tick();
  assert.equal(statuses.at(-1).mode,'firebase');
  assert.equal(statuses.at(-1).tvWebrtc,false);
  assert.equal(statuses.at(-1).direct,false);
  assert.deepEqual(await publisher.test(),{via:'firebase',route:null,ms:37});
  assert.deepEqual(writes,['presence','ping','pong']);
 }finally{publisher.close();viewer.close();}
});

test('offline reload opens the durable queue and can accept the next booking before Firebase returns',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();
 db.fail(true);
 await a.c.changeDrink('A','beer',1);
 assert.equal(await a.c.KCSharedSync.waitForUpload(),false);
 const b=fullApp(db);
 for(const [key,value] of a.storage)b.storage.set(key,value);
 b.c.navigator.onLine=false;
 await b.select();
 assert.equal(b.c.KCSharedSync.ready,true);
 assert.equal(b.run('persons[0].drinks.beer'),1);
 await b.c.changeDrink('A','beer',1);
 assert.equal(b.run('persons[0].drinks.beer'),2);
 assert.equal(db.root().persons[0].drinks.beer,0);
 db.fail(false);b.c.navigator.onLine=true;
 assert(await b.c.KCSharedSync.reconnect());
 assert.equal(db.root().persons[0].drinks.beer,2);
 assert(Number.isFinite(b.c.KCSharedSync.diagnostics().lastConfirmedAt));
});

test('older TV build has the same dashboard shell and parses as an ES2018 application',()=>{
 const {parse}=require('acorn'),modern=read('dashboard.html'),older=read('dashboard-compat.html');
 const withoutScripts=html=>html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/\s+/g,' ').trim();
 assert.equal(withoutScripts(older),withoutScripts(modern));
 for(const name of ['polyfills','firebase','dashboard']){
  assert.match(older,new RegExp('src="tv-compat/'+name+'\\.js'));
  assert.doesNotThrow(()=>parse(read('tv-compat/'+name+'.js'),{ecmaVersion:2018}));
 }
 assert.match(modern,/dashboard-compat\.html/);
});
