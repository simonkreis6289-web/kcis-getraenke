const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const harness=read('tests/v230-player-rows.cjs');
const {app,tv,fullApp}=new Function('require','__dirname',harness.slice(0,harness.indexOf('const keys='))+
  ';return {app,tv,fullApp};')(require,__dirname);

test('actual tablet and TV share running, paused, reloaded and finalized game time',{timeout:60000},async()=>{
 const a=await app();
 let time=Date.parse('2026-11-18T18:00:00Z');
 const setClock=target=>{target.c.window.KCSharedClock={...target.c.window.KCSharedClock,now:()=>time,timerNow:()=>time};};
 setClock(a);
 a.run("hindernisSettings={target:20,baseCents:100,rules:[]}");
 a.c.showSideTab('spiele','hindernis');
 await a.c.indStart('hindernis',a.c.gameSetupNames('hindernis')[0]);
 assert.equal(a.c.indGet('hindernis').stopwatch?.runningSince,time);
 assert(await a.c.KCSharedSync.waitForUpload());
 const dashboard=tv(a.db);
 vm.runInContext(read('js/game-stopwatch.js')+'\nlastGamePaint=null;',dashboard.c);
 setClock(dashboard);
 const display=dashboard.document.getElementById('tv-game-stopwatch');
 const appClock=target=>target.document.querySelector('#tab-hindernis .game-stopwatch');
 const check=(target,value,label)=>{
   target.c.KCGameStopwatchApp.render();
   dashboard.update();
   dashboard.c.window.dashboardTest.paint();
   vm.runInContext('paintDashboardExtras()',dashboard.c);
   for(const clock of [appClock(target),display]){
     assert(!clock.hidden,clock.id||'app stopwatch');
     assert.equal(clock.querySelector('time').textContent,value);
     assert.equal(clock.querySelector('[data-stopwatch-label]').textContent,label);
   }
 };
 assert.equal(a.document.querySelector('[data-game-pause=hindernis]').nextElementSibling.dataset.gameNext,'hindernis');
 time+=11500;
 check(a,'00:11','Spielzeit');
 await a.document.querySelector('[data-game-pause=hindernis]').onclick();
 assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(a.db.root().hindernisState.stopwatch.elapsedMs,11500);
 time+=90000;
 check(a,'00:11','Pausiert');

 const reopened=fullApp(a.db);
 await reopened.select();
 setClock(reopened);
 reopened.c.showSideTab('spiele','hindernis');
 check(reopened,'00:11','Pausiert');
 await reopened.document.querySelector('[data-game-pause=hindernis]').onclick();
 time+=9500;
 const roll=pins=>reopened.c.indAction('hindernis','throw',{kind:'pins',pins});
 for(const pins of [9,9,9,9,9,9,9,9,2])await roll(pins);
 assert(reopened.c.indGet('hindernis').readyToFinish);
 await reopened.c.indAction('hindernis','finish');
 assert(await reopened.c.KCSharedSync.waitForUpload());
 assert.equal(a.db.root().strafenHistory.find(row=>row.gameKey==='hindernis').durationMs,21000);
 const pdf=reopened.run('JSON.parse(JSON.stringify(getStrafenSnapshot()))');
 assert.equal(pdf.history.find(row=>row.gameKey==='hindernis').durationMs,21000);
 time+=30000;
 check(reopened,'00:21','Spieldauer');
 assert(reopened.document.querySelector('[data-game-pause=hindernis]').disabled);
});

test('legacy Tannenbaum records each stopwatch round and skips countdown rounds',{timeout:60000},async()=>{
 const a=await app();
 let time=Date.parse('2026-11-18T18:00:00Z');
 a.c.KCSharedClock={...a.c.KCSharedClock,now:()=>time};
 a.c.showSideTab('spiele','tannenbaum');
 await a.c.startTannenbaumSetup();
 assert.equal(a.run('tannenbaumState.stopwatch.runningSince'),time);
 time+=3601000;
 await a.document.querySelector('[data-game-pause=tannenbaum]').onclick();
 time+=60000;
 await a.c.finishTannenbaumGame();
 assert(await a.c.KCSharedSync.waitForUpload());
 const first=a.db.root().strafenHistory.find(row=>row.type==='tannenbaum');
 assert.equal(first.durationMs,3601000);
 assert.equal(a.c.KCGameStopwatch.format(first.durationMs),'01:00:01');

 a.run('teamStopwatchActive=true;persistState()');
 await a.c.startTannenbaumSetup();
 assert.equal(a.run('tannenbaumState.stopwatch'),null);
 time+=3000;
 await a.c.finishTannenbaumGame();
 assert(await a.c.KCSharedSync.waitForUpload());
 const results=a.db.root().strafenHistory.filter(row=>row.type==='tannenbaum');
 assert.equal(results.length,2);
 assert(!Object.hasOwn(results.find(row=>row.id!==first.id),'durationMs'));
 assert.equal(a.c.KCGameStopwatch.clock('ballermann',{active:true,startedAt:new Date(time).toISOString()}),null);
});

test('table games, six-day races and lotterie start separate clocks; abort clears only its clock',{timeout:60000},async()=>{
 const a=await app();
 const start=Date.parse('2026-11-18T18:00:00Z');
 let time=start;
 a.c.KCSharedClock={...a.c.KCSharedClock,now:()=>time};
 await a.c.startTableGame('blackjack');
 time+=3000;
 await a.c.startSechsGame();
 time+=4000;
 await a.c.startLotterieGameFinal('A');
 assert.equal(a.c.gameSetupState('blackjack').stopwatch?.runningSince,start);
 assert.equal(a.c.gameSetupState('sechstage').stopwatch?.runningSince,start+3000);
 assert.equal(a.c.gameSetupState('lotterie').stopwatch?.runningSince,start+7000);

 a.c.showSideTab('spiele','lotterie');
 time+=5000;
 await a.document.querySelector('[data-game-pause=lotterie]').onclick();
 assert.equal(a.c.gameSetupState('lotterie').stopwatch.elapsedMs,5000);
 await a.c.cancelCurrentGame('lotterie');
 assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(a.db.root().lotterieState.stopwatch,null);
 assert(a.document.querySelector('#tab-lotterie .game-stopwatch').hidden);
 assert(!a.db.root().strafenHistory.some(row=>(row.gameKey||row.type)==='lotterie'));
 assert.equal(a.db.root().sechstageState.stopwatch.runningSince,start+3000);
});

test('a stale or repeated toggle cannot flip the current mode, and undo starts a fresh running segment',()=>{
 const c={window:{}};vm.createContext(c);vm.runInContext(read('js/game-stopwatch.js'),c);
 const timer=c.window.KCGameStopwatch,active={id:'game',active:true,stopwatch:timer.advance('poker',null,{active:true},{at:1000,newRound:true})};
 const request={gameId:'game',runningSince:1000,elapsedMs:0};
 const paused=timer.toggle('poker',active,false,request,5000);
 assert.equal(timer.elapsed(paused,15000),4000);
 assert.throws(()=>timer.toggle('poker',{...active,stopwatch:paused},false,request,7000),/inzwischen/);
 const done=timer.advance('poker',active,{id:'game',finished:true},{at:6000});
 const undone=timer.advance('poker',{id:'game',finished:true,stopwatch:done},active,{at:12000});
 assert.equal(timer.elapsed(undone,15000),8000);
 const donePaused=timer.advance('poker',{...active,stopwatch:paused},{id:'game',finished:true},{at:9000});
 const stillPaused=timer.advance('poker',{id:'game',finished:true,stopwatch:donePaused},active,{at:15000});
 assert.equal(timer.elapsed(stillPaused,20000),4000);
 assert.equal(stillPaused.runningSince,null);
});
