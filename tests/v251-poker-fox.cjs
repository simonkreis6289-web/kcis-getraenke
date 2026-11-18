const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {parseHTML}=require('linkedom');
function fixture(){
 const {document}=parseHTML('<html><body><div id="fuchs-board"></div><select id="fuchs-select"></select></body></html>');
 const persons=['A','B','C'].map(name=>({name,present:true,left:false})),penalties=[],reverse=[];
 const context={window:{},document,Date,console,showToast(){},persistState(){},renderAll(){},renderCommonGameSetups(){},getFirstLoserStrafeKey:()=> 'loser',
  getActivePlayersForSoloGame:()=>persons,gameSetupNames:()=>persons.map(p=>p.name),
  changeSoloThrowPenalty:async(n,a,b)=>{(b?penalties:reverse).push({n,a,b});return true;},
  changeMultipleSyncedPersonCounters:async changes=>{context.finalCharges=changes;return true;},
  recordCompletedGame:(key,s)=>{context.result={key,losers:s.loserNames.slice()};},fuchsjagdState:null};
 context.window=context;vm.createContext(context);vm.runInContext(read('js/games/fuchsjagd.js'),context);
 return {c:context,persons,penalties,reverse,document};
}
test('fox race: each participant runs once, killed fox stays at station, only shortest run gets loser charge',async()=>{
 const f=fixture(),c=f.c;c.startFuchsjagdGame();
 assert.deepEqual([...c.fuchsjagdState.order],['A','B','C']);
 assert.equal(c.fuchsjagdState.fox,'A');
 // Fox A begins with 1+1, hunter B catches with 3 -> station 1.
 await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(3);
 assert.equal(c.fuchsjagdState.fox,'B');assert.equal(c.fuchsjagdState.results[0].station,1);
 // Fox B survives A, then is caught by C -> station 2.
 await c.applyFuchsjagdThrow(4);await c.applyFuchsjagdThrow(4);await c.applyFuchsjagdThrow(1);
 assert.equal(c.fuchsjagdState.hunterIndex,1);
 await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(9);
 assert.equal(c.fuchsjagdState.fox,'C');assert.equal(c.fuchsjagdState.results[1].station,2);
 // Fox C survives both hunters.
 await c.applyFuchsjagdThrow(9);await c.applyFuchsjagdThrow(9);await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(1);
 assert(c.fuchsjagdState.finished);assert.deepEqual(JSON.parse(JSON.stringify(c.fuchsjagdState.results.map(r=>r.station))),[1,2,3]);
 assert.deepEqual(Array.from(c.finalCharges,x=>x.personName),['A']);
 assert.equal(c.finalCharges[0].key,'loser');
 assert.equal(c.result.key,'fuchsjagd');
});
test('fox race undo across fox change restores prior fox, previous score and special Gosse penalty',async()=>{
 const {c,reverse}=fixture();c.startFuchsjagdGame();
 await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(1);await c.applyFuchsjagdThrow(0);
 assert.equal(c.fuchsjagdState.fox,'A');
 await c.applyFuchsjagdThrow(1); // fox adds before the next hunter
 await c.applyFuchsjagdThrow(4);
 assert.equal(c.fuchsjagdState.fox,'B');
 await c.undoFuchsjagdThrow();
 assert.equal(c.fuchsjagdState.fox,'A');
 assert.equal(c.fuchsjagdState.phase,'hunt');
 assert.equal(c.fuchsjagdState.results.length,0);
 assert.equal(c.fuchsjagdState.throws.length,4);
 assert.equal(reverse.at(-1).n,'C');
 await c.undoFuchsjagdThrow();
 assert.equal(c.fuchsjagdState.throws.length,3);
 await c.undoFuchsjagdThrow();
 assert.equal(c.fuchsjagdState.throws.length,2);
 assert.equal(reverse.at(-1).n,'B');
 assert.equal(reverse.at(-1).a.isGosse,true);
});
test('Poker rankings match engine strength ordering, rendered in app and dashboard from same view',()=>{
 const {document}=parseHTML('<html><body></body></html>'),context={window:{},document};
 context.window=context;context.KCPlayerRows={order:n=>n};vm.createContext(context);
 vm.runInContext(read('js/games/extra-core.js'),context);
 vm.runInContext(read('js/games/extra-view.js'),context);
 const g=context.KCRoundGames;
 const hands=[[1,2,3,5,7],[4,4,2,5,7],[4,4,6,6,2],[5,5,5,2,8],[3,3,3,7,7],[9,9,9,9,2],[2,3,4,5,6],[8,8,8,8,8]];
 for(let level=0;level<8;level++)assert.equal(g.pokerHand(hands[level].map(pins=>({pins}))).level,level);
 const s={gameKey:'poker',id:'poker1',players:['A','B'],active:true,finished:false,phase:'deal',index:0,
  config:g.defaults('poker'),hands:{A:[],B:[]},exchanges:{},rows:{A:[],B:[]},turn:[],scores:{},winners:[],rankingGroups:[]};
 const html=context.renderExtraGameBoard(s),wrap=document.createElement('section');wrap.innerHTML=html;
 const items=[...wrap.querySelectorAll('.poker-ranking-item')];
 assert.equal(items.length,8);
 assert.deepEqual(items.map(x=>x.querySelector('strong').textContent),['Fünfling','Straße','Vierling','Full House','Drilling','Doppelzwilling','Zwilling','Nichts']);
 assert.equal(wrap.querySelectorAll('.classic-table-and-ranking>.poker-ranking-panel').length,1);
});


test('Fuchsjagd clears visible throws on FIRST throw of each new hunter in app and TV, retains whole history and supports undo',async()=>{
 const {c,document}=fixture();c.startFuchsjagdGame();
 await c.applyFuchsjagdThrow(6);await c.applyFuchsjagdThrow(6);
 assert.equal(c.fuchsjagdState.throws.length,2);
 assert.equal(c.fuchsjagdState.tableStartIndex,0);
 await c.applyFuchsjagdThrow(1); // hunter B starts
 assert.equal(c.fuchsjagdState.tableStartIndex,2);
 assert.equal(c.fuchsjagdState.throws.length,3);
 assert.equal(document.querySelectorAll('#fuchs-board tbody tr').length,1);
 assert.equal(document.querySelector('#fuchs-board tbody tr td:nth-child(2)').textContent,'B');
 assert.equal(c.fuchsjagdState.phase,'fox');
 await c.applyFuchsjagdThrow(3); // fox A continues; table stays visible
 assert.equal(document.querySelectorAll('#fuchs-board tbody tr').length,2);
 assert.equal(c.fuchsjagdState.tableStartIndex,2);
 await c.applyFuchsjagdThrow(1); // new hunter C clears again
 assert.equal(c.fuchsjagdState.tableStartIndex,4);
 assert.equal(c.fuchsjagdState.throws.length,5);
 assert.equal(document.querySelectorAll('#fuchs-board tbody tr').length,1);
 await c.undoFuchsjagdThrow(); // recover prior displayed section
 assert.equal(c.fuchsjagdState.throws.length,4);
 assert.equal(c.fuchsjagdState.tableStartIndex,2);
 assert.equal(document.querySelectorAll('#fuchs-board tbody tr').length,2);
 const tv=read('dashboard.html');
 const m=tv.slice(tv.indexOf('function renderFuchsjagdBoard('),tv.indexOf('function sichernDashboardThrower('));
 assert.match(m,/visibleThrows=\(d\.throws\|\|\[\]\)\.slice/);
 assert.match(m,/d\.tableStartIndex/);
});
