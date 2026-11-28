const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function engine(file){const c={window:{},Date};c.window=c;vm.createContext(c);vm.runInContext(read(file),c);return c;}
test('Tiberius books exact and overrun targets, special throws and advances one synchronized player',async()=>{
 const {document}=parseHTML('<html><body><div id="tiberius-throw-modal"></div><div id="tiberius-thrower-modal"></div><div id="tiberius-hit-modal"></div></body></html>');
 const people=['Peter','Simon','Nico'].map(name=>({name,present:true,strafen:{gosse:0,special:0}})),stats=[],writes=[];
 const c={window:{},document,Date,console,persons:people,tiberiusState:{active:true,finished:false,score:0,playerOrder:people.map(p=>p.name),currentPlayerIndex:0,targets:[9,12,18],penalties:{},throws:[],undoStack:[]},tiberiusSettings:{minPins:10,maxPins:80},penaltyStatsLog:[],
  getSoloNames:()=>people.map(p=>p.name),getActivePlayersForSoloGame:()=>people,ensureTiberiusState(){},getGosseStrafeKey:()=> 'gosse',getKranzStrafeKey:()=> 'special',
  addPenaltyStatsEntry:(...args)=>stats.push(args),renderAll(){},persistState(){},showToast(){},getFirstLoserStrafeKey:()=> 'loser',
  changeMultipleSyncedPersonCounters:async changes=>{writes.push(plain(changes));for(const x of changes){const p=people.find(v=>v.name===x.personName);p.strafen[x.key]+=x.delta;}return true;}};
 c.window=c;vm.createContext(c);vm.runInContext(read('js/evening-counters.js'),c);c.getPenaltyKeyByType=()=> 'special';vm.runInContext(read('js/games/tiberius.js'),c);
 await c.handleTiberiusThrow(9);
 assert.equal(c.tiberiusState.score,9);assert.equal(c.tiberiusState.currentPlayerIndex,1);assert.equal(c.tiberiusState.pendingHit,null);
 assert.deepEqual(plain(c.tiberiusState.penalties[0].payers),['Simon','Nico']);
 assert.equal(people[0].strafen.special,0);assert.equal(people[1].strafen.special,1);
 await c.handleTiberiusThrow(0);assert.equal(people[1].strafen.gosse,1);assert.equal(c.tiberiusState.currentPlayerIndex,2);
 await c.handleTiberiusThrow(9);assert.equal(c.tiberiusState.currentPlayerIndex,0);assert.equal(c.tiberiusState.score,18);
 assert.equal(c.tiberiusState.penalties[1].mode,'over');
 assert.equal(c.tiberiusState.penalties[2].mode,'exact');
 assert.deepEqual(plain(c.tiberiusState.penalties[2].payers),['Peter','Simon']);
 assert.deepEqual(plain(stats.map(([type,name])=>[type,name])),[['9er','Peter'],['gosse','Simon'],['9er','Nico']]);
 await c.undoLastTiberiusThrow();
 assert.equal(c.tiberiusState.score,9);assert.equal(c.tiberiusState.currentPlayerIndex,2);assert.equal(people[0].strafen.special,0);
 await c.handleTiberiusThrow(1);assert.equal(c.tiberiusState.currentPlayerIndex,0);
 await c.handleTiberiusThrow(1);assert.equal(c.tiberiusState.currentPlayerIndex,1);
 assert.equal(c.tiberiusState.pendingHit,null);
 assert.notEqual(c.tiberiusFunnyName('Peter'),'Peter');assert.notEqual(c.tiberiusFunnyName('Simon'),'Simon');
});
test('Tiberius blocks booking when cloud sync is unavailable, without mutating score or counters',async()=>{
 const {document}=parseHTML('<html><body><div id="tiberius-throw-modal"></div><div id="tiberius-thrower-modal"></div><div id="tiberius-hit-modal"></div></body></html>');
 const people=[{name:'Peter',present:true,strafen:{gosse:0}}],messages=[];
 const c={window:{},document,Date,console,persons:people,tiberiusState:{active:true,score:0,playerOrder:['Peter'],targets:[10],penalties:{},throws:[],undoStack:[]},tiberiusSettings:{},penaltyStatsLog:[],getSoloNames:()=>['Peter'],getActivePlayersForSoloGame:()=>people,ensureTiberiusState(){},getGosseStrafeKey:()=> 'gosse',getKranzStrafeKey:()=> 'special',
 renderAll(){},persistState(){},showToast:m=>messages.push(m),KCSharedSync:{ready:false},changeMultipleSyncedPersonCounters:async()=>{throw Error('Must not be called');}};
 c.window=c;vm.createContext(c);vm.runInContext(read('js/evening-counters.js'),c);c.getPenaltyKeyByType=()=> 'special';vm.runInContext(read('js/games/tiberius.js'),c);
 await c.handleTiberiusThrow(0);
 assert.equal(c.tiberiusState.score,0);assert.equal(c.tiberiusState.throws.length,0);assert.match(messages.join(' '),/Firebase/);
});
test('old Tiberius uploads with oversized undo snapshots are compacted without dropping throws, results or statistics',()=>{
 const c=engine('js/shared-sync-core.js'),core=c.KCSharedCore;
 const penaltyStatsLog=Array.from({length:425},(_,i)=>({id:'stat_'+i,thrower:'A',type:'9er',punished:['B','C','D','E','F','G','H','I'],createdAt:'2026-11-18T08:00:00.000Z',club:'Kegelclub Stammdaten',note:'x'.repeat(300)}));
 const playerOrder=['A','B','C','D','E','F','G','H','I'],throws=playerOrder.slice(0,6).map((_,i)=>({rawValue:3,value:3,oldScore:i*3,newScore:i*3+3,createdAt:'2026-11-18T08:01:00.000Z'}));
 const tiberiusState={active:true,playerOrder,throws,penalties:{},undoStack:throws.map((_,i)=>({score:i*3,throws:throws.slice(0,i),penalties:{},personsStrafen:[],penaltyStatsLog:plain(penaltyStatsLog)}))};
 const queued={opId:'sync_existing',sequence:8,state:{tiberiusState,penaltyStatsLog}};
 assert(Buffer.byteLength(JSON.stringify(queued.state))>1048576);
 const fixed=plain(core.normalizeGameData(queued));
 assert(Buffer.byteLength(JSON.stringify(fixed.state))<250000);
 assert.equal(fixed.opId,queued.opId);assert.equal(fixed.sequence,8);
 assert.deepEqual(fixed.state.penaltyStatsLog,penaltyStatsLog);
 assert.deepEqual(fixed.state.tiberiusState.throws,throws);
 assert.equal(fixed.state.tiberiusState.currentPlayerIndex,6);
 assert.deepEqual(fixed.state.tiberiusState.undoStack.map(u=>u.throwCount),[0,1,2,3,4,5]);
 assert.deepEqual(plain(core.normalizeGameData(fixed)),fixed);
});
test('server authoritative skip actions do not charge scores or penalties and can be undone',()=>{
 const people=['A','B','C','D'].map(name=>({name,present:true,tisch:name<'C'?'T1':'T2'})),catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},{key:'loser',label:'1. Verlierer'}],ctx={people,catalog,now:'2026-11-18T08:00:00Z',eveningStartedAt:'2026-11-18T07:00:00Z'};
 for(const [file,key,config] of [['js/games/individual-core.js','hindernis',null],['js/games/extra-core.js','pfaelzer',null]]){
  const global=engine(file),g=file.includes('individual-core')?global.KCIndividual:global.KCExtraGames;
  let sequence=0,s=g.empty(key);const send=(action,fields={})=>{const req={gameKey:key,gameId:s.id||'indgame_nexttest',expectedRevision:s.revision,opId:'ind_nexttest_'+(++sequence),action,...fields};s=g.command(s,req,ctx).state;return s;};
  send('start',{players:['A','B','C'],config:{...g.defaults(key),...(key==='pfaelzer'?{rounds:2}:{} )}});
  const original=plain(s.scores),before=g.current(s);
  send('next');assert.notEqual(g.current(s),before,file);assert.deepEqual(plain(s.scores),original);
  assert.equal(s.history.at(-1).action,'next');send('undo');assert.equal(g.current(s),before,file);
  assert.deepEqual(plain(s.scores),original);assert.deepEqual(plain(s.bookings),[]);
 }
});
test('game header actions occupy the title line, with no duplicate next button and TV turn highlight',()=>{
 const js=read('js/game-inputs.js'),css=read('css/game-inputs.css'),tv=read('dashboard.html');
 assert.match(js,/function gameNextThrower\(key\)/);
 assert.match(js,/\[data-game-next\]/);
 assert.match(css,/\.game-title-with-actions::after\s*\{[^}]*order:1/);
 assert.match(css,/\.game-dashboard-toolbar\s*\{[^}]*order:2/);
 assert.match(tv,/tiberius-active-row/);
 assert.match(tv,/function tiberiusFunnyName\(name\)/);
 assert.match(tv,/function retryRoot\(\)/);
});
