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
 c.window=c;vm.createContext(c);vm.runInContext(read('js/games/tiberius.js'),c);
 await c.handleTiberiusThrow(9);
 assert.equal(c.tiberiusState.score,9);assert.equal(c.tiberiusState.currentPlayerIndex,1);assert.equal(c.tiberiusState.pendingHit,null);
 assert.deepEqual(plain(c.tiberiusState.penalties[0].payers),['Simon','Nico']);
 assert.equal(people[0].strafen.special,0);assert.equal(people[1].strafen.special,1);
 await c.handleTiberiusThrow(0);assert.equal(people[1].strafen.gosse,1);assert.equal(c.tiberiusState.currentPlayerIndex,2);
 await c.handleTiberiusThrow(9);assert.equal(c.tiberiusState.currentPlayerIndex,0);assert.equal(c.tiberiusState.score,18);
 assert.equal(c.tiberiusState.penalties[1].mode,'over');
 assert.equal(c.tiberiusState.penalties[2].mode,'exact');
 assert.deepEqual(plain(c.tiberiusState.penalties[2].payers),['Peter','Simon']);
 assert.equal(stats.length,2);
 await c.undoLastTiberiusThrow();
 assert.equal(c.tiberiusState.score,9);assert.equal(c.tiberiusState.currentPlayerIndex,2);assert.equal(people[0].strafen.special,1);
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
 c.window=c;vm.createContext(c);vm.runInContext(read('js/games/tiberius.js'),c);
 await c.handleTiberiusThrow(0);
 assert.equal(c.tiberiusState.score,0);assert.equal(c.tiberiusState.throws.length,0);assert.match(messages.join(' '),/Firebase/);
});
test('server authoritative skip actions do not charge scores or penalties and can be undone',()=>{
 const people=['A','B','C','D'].map(name=>({name,present:true,tisch:name<'C'?'T1':'T2'})),catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},{key:'loser',label:'1. Verlierer'}],ctx={people,catalog,now:'2026-11-18T08:00:00Z',eveningStartedAt:'2026-11-18T07:00:00Z'};
 for(const [file,key,config] of [['js/games/individual-core.js','hindernis',null],['js/games/extra-core.js','pfaelzer',null]]){
  const global=engine(file),g=file.includes('individual-core')?global.KCIndividual:global.KCExtraGames;
  let sequence=0,s=g.empty(key);const send=(action,fields={})=>{const req={gameKey:key,gameId:s.id||'indgame_nexttest',expectedRevision:s.revision,opId:'ind_nexttest_'+(++sequence),action,...fields};s=g.command(s,req,ctx).state;return s;};
  send('start',{players:['A','B','C'],config:{...g.defaults(key),...(key==='pfaelzer'?{rounds:2}:{} )}});
  const original=plain(s.scores),before=s.index;
  send('next');assert.equal(s.index,(before+1)%3,file);assert.deepEqual(plain(s.scores),original);
  assert.equal(s.history.at(-1).action,'next');send('undo');assert.equal(s.index,before,file);
  assert.deepEqual(plain(s.scores),original);assert.deepEqual(plain(s.bookings),[]);
 }
});
test('game header actions occupy the title line, with no duplicate next button and TV turn highlight',()=>{
 const js=read('js/game-inputs.js'),css=read('css/game-inputs.css'),tv=read('dashboard.html');
 assert.match(js,/function gameNextThrower\(key\)/);
 assert.match(js,/title\.append\(toolbar\)/);
 assert.match(js,/\[data-game-next\]/);
 assert.match(css,/game-title-with-actions/);
 assert.match(tv,/tiberius-active-row/);
 assert.match(tv,/function tiberiusFunnyName\(name\)/);
 assert.match(tv,/function retryRoot\(\)/);
});
