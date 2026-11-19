const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),copy=value=>JSON.parse(JSON.stringify(value));
const evening='2026-11-19T18:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+name.toLowerCase();
const c={window:null};c.window=c;vm.createContext(c);
for(const file of ['js/kranz-policy.js','js/games/club-games-core.js','js/games/extra-core.js','js/games/club-games-view.js'])vm.runInContext(read(file),c);
const g=c.KCClubGames,core=c.KCExtraGames;
const people=['A','B','C','D','E','F'].map(name=>({name,present:true}));
const catalog=[{key:'gosse',label:'Gosse'},{key:'nine',label:'9er / Kranz'},...['loser','loser2','loser3'].map((key,i)=>({key,label:(i+1)+'. Verlierer'}))];
function game(gameKey,config={},players=people.map(x=>x.name)){
 let state=core.empty(gameKey),seq=0;
 const ctx={people,catalog,now:evening,eveningStartedAt:evening};
 function run(action,fields={}){
  const req={gameKey,action,gameId:'indgame_fixture',expectedRevision:state.revision,opId:'ind_test_'+(++seq),...fields};
  const before=state;
  state=core.command(state,req,ctx).state;
  return core.effects(before,state,req,ctx);
 }
 run('start',{players,config:{...g.defaults(gameKey),...config},...(gameKey==='abschreibung'?{kranzRule:{mode:'choose'}}:{})});
 return {get s(){return state;},run,roll(kind,pins){return run('throw',{kind,pins});}};
}
test('Abschreibung charges only eliminated ranks, skips them, and safely reverses the charge when undoing',()=>{
 const f=game('abschreibung',{startPoints:9,lastPlace:5},['A','B','C','D','E','F']);
 f.roll('pins',6);assert.equal(f.s.scores.A,3);
 const first=f.run('throw',{kind:'kranz',kranzValue:11});
 assert.equal(first.moneyAdded[0].amountCents,300);
 assert.equal(first.moneyAdded[0].personName,'A');
 assert.equal(f.s.eliminated[0].place,6);
 f.roll('pins',9);assert.equal(f.s.scores.B,0);
 assert(f.s.finished);
 assert.deepEqual(copy(f.s.winners),['C','D','E','F']);
 assert.deepEqual(copy(f.run('undo').moneyRemoved),['indcharge_indgame_fixture_finish_1']);
 assert(f.s.active);
 assert.equal(g.current(f.s),'C');
 const wood=game('abschreibung',{woodRequired:true},['A','B']);
 wood.roll('gosse');assert.equal(g.current(wood.s),'A');assert.equal(wood.s.scores.A,100);
});
test('Lottokönig follows the ordered tickets and penalizes nonqualifiers before qualified players',()=>{
 const f=game('lottokoenig',{},['A','B','C','D']);
 assert.throws(()=>f.run('numbers',{numbers:[1,2,3,4,12,40]}),/Zehnerblock/);
 const ticket=[4,12,20,28,36,44];
 for(const name of ['A','B','C','D']){assert.equal(g.current(f.s),name);f.run('numbers',{numbers:ticket});}
 assert.equal(f.s.phase,'throw');
 let last;
 for(let i=0;i<13;i++)for(const [name,count] of [['A',4],['B',5],['C',3],['D',2]]){
  assert.equal(g.current(f.s),name);
  last=f.roll('pins',count);
 }
 assert(f.s.finished);assert.deepEqual(copy(f.s.winners),['A']);
 assert.deepEqual(copy(f.s.loserGroups),[{rank:1,names:['C']},{rank:2,names:['D']},{rank:3,names:['B']}]);
 assert.deepEqual(copy(last.changes.map(x=>x.key)),['loser','loser2','loser3']);
 const html=parseHTML(c.renderClubGameBoard(f.s)).document;
 assert(html.querySelector('.club-lotto-balls .is-hit'));
 f.run('undo');assert.equal(g.current(f.s),'D');
});
test('Tageskurs calculates and replays only the standing pins at configured prices',()=>{
 const f=game('tageskurs',{pinCents:[101,20,30,40,50,60,70,80,90],divisor:2},['A','B']);
 assert.throws(()=>f.run('throw',{kind:'pins',knocked:[2,2]}),/gefallenen Kegel/);
 const first=f.run('throw',{kind:'pins',knocked:[2,3,4,5,6,7,8,9]});
 assert.equal(first.moneyAdded[0].amountCents,51);
 f.run('throw',{kind:'pins',knocked:[1,2,3,4,5,6,7,8,9]});
 assert(f.s.finished);assert.equal(f.s.bookings.length,1);
 const view=parseHTML(c.renderClubGameBoard(f.s)).document;
 assert.equal(view.querySelectorAll('.club-game-pin.is-down').length,9);
 f.run('undo');assert.equal(g.current(f.s),'B');assert.equal(f.s.bookings.length,1);
});
test('Swinger Club alternates throws, requires new partners and books 1./2./3. by individual totals',()=>{
 const f=game('swingerclub',{rounds:2,throws:2},['A','B','C','D','E','F']);
 const roll=n=>f.run('throw',{kind:'pins',knocked:f.s.standing.slice(0,n)});
 for(const [p,n] of [['A',2],['B',1],['C',2],['D',2],['E',2],['F',3]]){assert.equal(g.current(f.s),p);roll(n);}
 assert.equal(f.s.phase,'pairs');
 assert.throws(()=>f.run('pairs',{pairs:[{names:['A','B']},{names:['C','D']},{names:['E','F']}]}),/neue Partner/);
 f.run('pairs',{pairs:[{names:['A','C']},{names:['B','E']},{names:['D','F']}]});
 for(const n of [1,1,2,2,3,3])roll(n);
 assert(f.s.finished);assert.deepEqual(copy(f.s.scores),{A:5,B:7,C:6,D:10,E:9,F:11});
 assert.deepEqual(copy(f.s.loserGroups),[{rank:1,names:['A']},{rank:2,names:['C']},{rank:3,names:['B']}]);
 f.run('undo');assert.equal(g.current(f.s),'F');
 assert.deepEqual(copy(f.s.standing),[4,5,6,7,8,9]);
});
const harness=read('tests/v215-shared-sync.cjs');
const fixture=harness.slice(harness.indexOf('function database('),harness.indexOf("test('two devices increment"))+
 harness.slice(harness.indexOf('function fullApp('),harness.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',fixture+';return {database,initial,fullApp};')(read,value=>value===undefined?undefined:copy(value),assert,vm,parseHTML,require,evening,rootPath,personPath);
test('actual app mounts all four games and saves a Tageskurs booking through the shared outbox',async()=>{
 const seed=initial();seed.persons.push({...seed.persons[0],name:'C'},{...seed.persons[1],name:'D'});
 const db=database({[rootPath]:seed}),a=fullApp(db);await a.select();
 const divisor=a.document.querySelector('#game-property-tageskurs [data-club-setting="divisor"]');
 divisor.value='3';assert(await a.c.saveClubGameSettings('tageskurs'));
 assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(db.root().extraGameSettings.tageskurs.divisor,3);
 for(const key of g.keys){
  a.c.showSideTab('spiele',key);
  assert(!a.document.getElementById('tab-'+key).classList.contains('hidden'));
  a.c.openIndividualRules(key);assert.match(a.document.getElementById(key+'-rules-content').textContent,/Regelgrundlage/);a.c.closeIndividualRules(key);
  await a.c.indStart(key);
  assert(a.c.indGet(key).active,key);
  assert(a.document.querySelector('#tab-'+key+' .game-input-panel'),key);
 }
 a.c.showSideTab('spiele','tageskurs');
 const pin=a.document.querySelector('#tab-tageskurs button[data-club-pin="9"]');
 a.c.clubGameTogglePin(9,pin);
 await a.c.clubGameBookPins('tageskurs');
 assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(db.root().tageskursState.history[0].pins,1);
 assert.equal(db.root().individualGameLedger.find(x=>x.gameKey==='tageskurs').amountCents,120);
 assert(db.data.has('clubs/club/liveGames/tageskurs'));
});
