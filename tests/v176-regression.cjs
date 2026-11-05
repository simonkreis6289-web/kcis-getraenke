const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function game(mode='team'){
 const people=[{name:'A',tisch:'T1'},{name:'B',tisch:'T1'},{name:'C',tisch:'T1'},{name:'D',tisch:'T2'},{name:'E',tisch:'T2'}];
 const penalties=[],saved=[],groupPenalties=[];
 const ctx={window:{},document:{getElementById:id=>id==='sichern-mode'?{value:mode}:id==='sichern-target'?{value:'999'}:null},console,
  sichernState:null,seatingOrder:['D','E','','','','','','','A','B','C'],getActivePlayersForSoloGame:()=>people,getSoloNames:()=>people.map(p=>p.name),normalizeTisch:v=>v,getGroupLabel:k=>k,
  showToast(){},persistState:()=>saved.push(JSON.parse(JSON.stringify(ctx.sichernState))),renderAll(){},
  changeSoloThrowPenalty:async(name,before,after)=>{penalties.push({name,before,after});return true;},getFirstLoserStrafeKey:()=> 'loser',changeMultipleSyncedPersonCounters:async changes=>{groupPenalties.push(changes);return true;}};
 vm.createContext(ctx);vm.runInContext(read('js/games/sichern.js'),ctx);ctx.startSichernGame();return {ctx,penalties,saved,groupPenalties};
}
test('team players alternate after each throw, bank changes only the team, and each team resumes its next player',async()=>{
 const {ctx}=game();assert.equal(ctx.sichernThrower(),'A');
 await ctx.sichernThrow(1);assert.equal(ctx.sichernCurrent(),'T1');assert.equal(ctx.sichernThrower(),'B');
 await ctx.sichernThrow(2);assert.equal(ctx.sichernThrower(),'C');ctx.sichernSave();
 assert.equal(ctx.sichernState.secured.T1,3);assert.equal(ctx.sichernThrower(),'D');
 await ctx.sichernThrow(6);assert.equal(ctx.sichernThrower(),'E');ctx.sichernSave();
 assert.equal(ctx.sichernCurrent(),'T1');assert.equal(ctx.sichernThrower(),'C');
 await ctx.sichernThrow(3);assert.equal(ctx.sichernThrower(),'A');ctx.sichernSave();
 assert.equal(ctx.sichernThrower(),'E');
});
test('several full team cycles keep the same team and accumulate points until it banks',async()=>{
 const {ctx}=game();for(const pins of [1,2,3,4,6,7,8])await ctx.sichernThrow(pins);
 assert.equal(ctx.sichernCurrent(),'T1');assert.equal(ctx.sichernThrower(),'B');assert.equal(ctx.sichernState.open.T1,31);
 assert.deepEqual(Array.from(ctx.sichernState.throwHistory,x=>x.name),['A','B','C','A','B','C','A']);
 ctx.sichernSave();assert.equal(ctx.sichernState.secured.T1,31);assert.equal(ctx.sichernThrower(),'D');
});
test('gosse and five consume that player once, clear open points and pass to the other team',async()=>{
 const {ctx,penalties}=game();await ctx.sichernThrow(2);await ctx.sichernThrow(0);
 assert.equal(penalties[1].name,'B');assert.equal(penalties[1].after.isGosse,true);
 assert.equal(ctx.sichernState.open.T1,0);assert.equal(ctx.sichernState.teamTurns.T1,2);assert.equal(ctx.sichernThrower(),'D');
 await ctx.sichernThrow(5);assert.equal(ctx.sichernThrower(),'C');await ctx.sichernThrow(1);ctx.sichernSave();assert.equal(ctx.sichernThrower(),'E');
});
test('undo restores points, team and both team cursors, including banking and failed throws',async()=>{
 const {ctx}=game();await ctx.sichernThrow(1);await ctx.sichernThrow(2);ctx.sichernSave();
 await ctx.undoSichernThrow();assert.equal(ctx.sichernCurrent(),'T1');assert.equal(ctx.sichernThrower(),'C');assert.equal(ctx.sichernState.open.T1,3);
 await ctx.undoSichernThrow();assert.equal(ctx.sichernThrower(),'B');assert.equal(ctx.sichernState.open.T1,1);
 await ctx.sichernThrow(0);assert.equal(ctx.sichernThrower(),'D');await ctx.undoSichernThrow();assert.equal(ctx.sichernCurrent(),'T1');assert.equal(ctx.sichernThrower(),'B');assert.equal(ctx.sichernState.open.T1,1);
});
test('invalid throws and rejected penalty bookings do not advance or create undo/history entries',async()=>{
 const {ctx}=game();for(const pins of [-1,13,1.5])await ctx.sichernThrow(pins);
 ctx.changeSoloThrowPenalty=async()=>false;await ctx.sichernThrow(9);
 assert.equal(ctx.sichernThrower(),'A');assert.equal(ctx.sichernState.throwHistory.length,0);assert.equal(ctx.sichernState.undo.length,0);
});
test('the penalty belongs to the actual thrower, including nine and kranz; a rapid second tap is ignored',async()=>{
 const {ctx,penalties}=game();await ctx.sichernThrow(9);await ctx.sichernThrow(12);
 assert.deepEqual(penalties.map(p=>p.name),['A','B']);assert.equal(penalties[1].after.pins,12);
 let release;ctx.changeSoloThrowPenalty=()=>new Promise(resolve=>release=resolve);
 const pending=ctx.sichernThrow(3);await ctx.sichernThrow(4);release(true);await pending;
 assert.equal(ctx.sichernState.throwHistory.length,3);assert.equal(ctx.sichernThrower(),'A');
});
test('a failed penalty reversal does not rewind the cursor or remove its throw',async()=>{
 const {ctx}=game();await ctx.sichernThrow(2);ctx.changeSoloThrowPenalty=async()=>false;await ctx.undoSichernThrow();
 assert.equal(ctx.sichernThrower(),'B');assert.equal(ctx.sichernState.throwHistory.length,1);
});
test('solo mode retains the same player until banking, then advances to the next individual',async()=>{
 const {ctx}=game('solo');delete ctx.sichernState.teamTurnVersion;await ctx.sichernThrow(1);await ctx.sichernThrow(2);assert.equal(ctx.sichernThrower(),'A');assert.equal(ctx.sichernState.undo[0].before.teamTurnVersion,2);ctx.sichernSave();assert.equal(ctx.sichernThrower(),'B');
});
test('one-person teams keep their sole player while the other team rotates normally',async()=>{
 const {ctx}=game();ctx.sichernState.teams.T1=['A'];await ctx.sichernThrow(1);await ctx.sichernThrow(2);assert.equal(ctx.sichernThrower(),'A');ctx.sichernSave();
 await ctx.sichernThrow(3);assert.equal(ctx.sichernThrower(),'E');ctx.sichernSave();assert.equal(ctx.sichernThrower(),'A');
});
test('reaching the target still books the loser team and preserves the next-player cursor',async()=>{
 const {ctx,groupPenalties}=game();ctx.sichernState.target=3;await ctx.sichernThrow(3);
 assert.equal(ctx.sichernState.finished,true);assert.equal(ctx.sichernState.winner,'T1');assert.equal(ctx.sichernState.teamTurns.T1,1);
 assert.deepEqual(Array.from(groupPenalties[0],p=>p.personName),['D','E']);
});
test('running legacy games and their undo states continue after the last actual thrower in each team',async()=>{
 const {ctx}=game(),s=ctx.sichernState;delete s.teamTurnVersion;
 s.throwHistory=[{name:'A',key:'T1',pins:2},{name:'A',key:'T1',pins:3}];s.open.T1=5;s.turnThrows=[{name:'A',pins:2},{name:'A',pins:3}];
 s.undo=[{name:'A',pins:3,before:{secured:{T1:0,T2:0},open:{T1:2,T2:0},teamTurns:{T1:0,T2:0},currentIndex:0,throwHistory:[{name:'A',key:'T1',pins:2}],turnThrows:[{name:'A',pins:2}]}}];
 ctx.ensureSichernState();assert.equal(ctx.sichernThrower(),'B');assert.equal(s.teamTurnVersion,2);
 await ctx.undoSichernThrow();assert.equal(ctx.sichernThrower(),'B');assert.equal(s.open.T1,2);
});
test('local and Firestore serialization retain team positions but exclude transient busy flags',()=>{
 const source=read('js/app.js');
 for(const name of ['getSerializableState','getFirestoreState']){
  const start=source.indexOf('function '+name+'()'),end=source.indexOf('\n}',start)+2,body=source.slice(start,end);
  const globals=Object.fromEntries([...body.matchAll(/\b[a-zA-Z_]\w*\b/g)].map(m=>[m[0],null]));
  globals.sichernState={active:true,mode:'team',teamTurns:{T1:2,T2:1},busy:true,closing:true};
  globals.recalcTeamExtras=()=>{};globals.getTodayMeta=()=>({});globals.getFirestorePersonsWithFineTotals=()=>[];globals.window={};
  vm.createContext(globals);vm.runInContext(body,globals);const result=globals[name]().sichernState;
  assert.equal(result.teamTurns.T1,2);assert.equal(result.teamTurns.T2,1);assert.equal(result.busy,false);assert.equal(result.closing,false);assert.equal(globals.sichernState.busy,true);
 }
});
test('dashboard and app agree on the next player in current and legacy game states',async()=>{
 const html=read('dashboard.html'),start=html.indexOf('function sichernDashboardThrower('),end=html.indexOf('\nfunction renderSichernBoard',start);
 const tv={};vm.createContext(tv);vm.runInContext(html.slice(start,end),tv);
 const {ctx}=game();await ctx.sichernThrow(1);await ctx.sichernThrow(2);
 assert.equal(tv.sichernDashboardThrower(ctx.sichernState,ctx.sichernCurrent()),ctx.sichernThrower());
 const legacy={mode:'team',teams:{T1:['A','B','C']},teamTurns:{T1:0},throwHistory:[{name:'A',key:'T1',pins:2}]};
 assert.equal(tv.sichernDashboardThrower(legacy,'T1'),'B');
});
