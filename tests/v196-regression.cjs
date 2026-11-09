const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const previous=read('tests/v187-regression.cjs'),fixture=new Function('require','__dirname',previous.slice(0,previous.indexOf("test('every start"))+';return fixture;')(require,__dirname);
function ui(){
 const f=fixture(),source=read('js/games/tannenbaum.js'),a=source.indexOf('function renderTannenbaum()'),b=source.indexOf('\n}\n',a)+2;
 vm.runInContext(source.slice(a,b),f.c);vm.runInContext(read('js/game-inputs.js'),f.c);
 f.c.getPenaltyKeyByType=type=>type;f.c.changeMultipleSyncedPersonCounters=async()=>true;
 f.c.startTannenbaumSetup();f.c.renderTannenbaum();return f;
}
function selected(f){return f.document.querySelector('#tab-tannenbaum .gi-options [aria-pressed=true]').textContent;}
function choosePlayer(f){f.document.getElementById('tannenbaum-penalty-player-select').value=f.c.gameTeamNames('tannenbaum',f.c.tannenbaumState.currentTeam)[0];}

test('Tannenbaum alternates on actual normal bookings, allows manual selection and restores the thrower on undo',async()=>{
 const f=ui(),c=f.c;assert.equal(selected(f),'Wand');await c.gameInputThrow('tannenbaum',2);assert.equal(c.tannenbaumState.history[0].team,'T1');assert.equal(selected(f),'TV');await c.gameInputThrow('tannenbaum',3);assert.equal(c.tannenbaumState.history[0].team,'T2');assert.equal(selected(f),'Wand');
 c.gameInputTeam('tannenbaum','T2');assert.equal(selected(f),'TV');await c.gameInputThrow('tannenbaum',4);assert.equal(c.tannenbaumState.history[0].team,'T2');assert.equal(selected(f),'Wand');c.undoLastTannenbaumThrow();assert.equal(selected(f),'TV');assert.equal(c.tannenbaumState.teams.T2.remaining[4],4);
});

test('9er, Gosse and Kranz switch only after the complete successful special-throw booking',async()=>{
 for(const [pins,gosse,type] of [[9,false,'9er'],[0,true,'gosse'],[12,false,'kranz']]){
  const f=ui(),c=f.c;await c.gameInputThrow('tannenbaum',pins,gosse);assert.equal(selected(f),'Wand');assert.equal(c.tannenbaumState.history.length,0);choosePlayer(f);await c.confirmTannenbaumPenaltyPlayer();
  if(type==='kranz'){assert.equal(selected(f),'Wand');assert.equal(c.tannenbaumState.history.length,0);await c.confirmTannenbaumKranzNumber(5);}
  assert.equal(selected(f),'TV',type);assert.equal(c.tannenbaumState.history.length,1);assert.equal(c.tannenbaumState.history[0].team,'T1');
  assert.equal(type==='gosse'?c.tannenbaumState.history[0].type:c.tannenbaumState.history[0].specialType,type==='gosse'?'penalty-gosse':type);
 }
});

test('cancelling a dialog, missing a player or failed penalty persistence does not advance the team',async()=>{
 const f=ui(),c=f.c;await c.gameInputThrow('tannenbaum',9);await c.confirmTannenbaumPenaltyPlayer();assert.equal(selected(f),'Wand');choosePlayer(f);c.changeMultipleSyncedPersonCounters=async()=>false;await c.confirmTannenbaumPenaltyPlayer();assert.equal(selected(f),'Wand');assert.equal(c.tannenbaumState.history.length,0);c.closeTannenbaumPenaltyPlayerModal();assert.equal(c.tannenbaumState.currentTeam,'T1');
 await c.gameInputThrow('tannenbaum',12);choosePlayer(f);await c.confirmTannenbaumPenaltyPlayer();c.closeTannenbaumKranzNumberModal();assert.equal(c.tannenbaumState.currentTeam,'T1');
});

test('current team survives serialization and incoming renders; legacy games infer the next team and new games start at T1',async()=>{
 const f=ui(),c=f.c;await c.gameInputThrow('tannenbaum',1);const saved=JSON.stringify(c.tannenbaumState);c.tannenbaumState=JSON.parse(saved);c.renderTannenbaum();assert.equal(selected(f),'TV');
 delete c.tannenbaumState.currentTeam;c.tannenbaumState.history.unshift({team:'T2',type:'manual-restore'});c.renderTannenbaum();assert.equal(selected(f),'TV');c.startTannenbaumSetup();c.renderTannenbaum();assert.equal(selected(f),'Wand');
});

test('a pending special throw remains assigned to its captured team despite a manual override',async()=>{
 const f=ui(),c=f.c;await c.gameInputThrow('tannenbaum',9);choosePlayer(f);c.gameInputTeam('tannenbaum','T2');await c.confirmTannenbaumPenaltyPlayer();assert.equal(c.tannenbaumState.history[0].team,'T1');assert.equal(c.tannenbaumState.teams.T1.remaining[9],0);assert.equal(selected(f),'TV');
});
