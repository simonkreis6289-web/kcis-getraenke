const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(p,'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const c={window:null,Date,Intl};c.window=c;vm.createContext(c);for(const file of ['evening-counters','shared-sync-core','game-fine-policy','hotfix-recovery'])vm.runInContext(read('js/'+file+'.js'),c);
const M=c.KCEveningCounters,C=c.KCSharedCore,R=c.KCHotfixRecovery;
const confirmedEvening='2026-11-27T18:17:01.250Z',startedAt='2026-11-27T19:35:58.800Z';
function fixture(){
 const rows={A:[{value:9,isGosse:false,penaltyBooking:{kind:'9er',statId:'a',key:'nine',punished:['B']}},{value:0,isGosse:false,penaltyBooking:{kind:'gosse',statId:'b',key:'gosse',punished:['A']}},{value:0,isGosse:true}],B:[{value:1,isGosse:false},{value:9,isGosse:false},{value:12,kranzValue:0}]};
 const game={startedAt,rows,finished:true,active:false,history:[]},totals=M.empty(),people={};for(const [,stats,name] of M.entries('haustief',game)){people[name]??=M.empty();for(const metric of M.keys){totals[metric]+=stats[metric];people[name][metric]+=stats[metric];}}
 const result={id:'result',createdAt:'2026-11-27T19:43:27.941Z',type:'haustief',rows:copy(rows),winner:'A',assigned:[{name:'B',key:'loser',rank:1}],results:[{name:'A',number:909},{name:'B',number:190}]};game.history=[copy(result)];
 return {currentEveningStartedAt:confirmedEvening,hotfix331:{schema:1},hausnummerSettings:{tief:{neun:9,kranz:0,gosse:9}},haustiefState:game,strafenHistory:[result],eveningCounters:copy(totals),personalThrows:{schema:1,partial:false,excluded:[],rows:Object.entries(people).map(([name,s])=>({name,...s}))},persons:[{name:'A',strafen:{gosse:2,nine:3},freeStrafen:[{id:'manual',amount:4}]},{name:'B',strafen:{loser:1},strafTotal:17}],individualGameLedger:[{id:'fee',amountCents:123}],penaltyStatsLog:[{id:'a',type:'9er',thrower:'A',punished:['B']},{id:'b',type:'gosse',thrower:'A',punished:['A']}]};
}
test('confirmed score digits become physical throws without rewriting financial data or results',()=>{
 const before=fixture(),after=R.recover(before,C);assert.deepEqual(copy(after.eveningCounters),{gutters:4,nines:0,wreaths:1,throws:6,pins:9});
 assert.deepEqual(copy(after.persons),before.persons);assert.deepEqual(copy(after.individualGameLedger),before.individualGameLedger);assert.deepEqual(copy(after.strafenHistory[0].assigned),before.strafenHistory[0].assigned);assert.deepEqual(copy(after.strafenHistory[0].results),before.strafenHistory[0].results);
 assert.equal(after.haustiefState.rows.A[0].physicalThrow.kind,'gosse');assert.equal(after.haustiefState.rows.A[0].gameValue,9);assert.equal(after.haustiefState.rows.A[1].physicalThrow.kind,'gosse');assert.equal(after.haustiefState.rows.A[1].gameValue,0);assert.equal(after.penaltyStatsLog[0].type,'gosse');assert.deepEqual(copy(after.penaltyStatsLog[0].punished),['B']);assert.equal(after.hausnummerSettings.tief.neun,0);
 assert.deepEqual(copy(R.recover(after,C)),copy(after));assert.equal(before.haustiefState.rows.A[0].physicalThrow,undefined);
});
test('a previous zeroing of bogus score-nines never subtracts them again and never invents true nines',()=>{
 const before=fixture();before.eveningCounterExcluded=M.exclude(before,C.games,['nines']);before.eveningCounters.nines=0;const after=R.recover(before,C);
 assert.equal(after.eveningCounters.nines,0);assert.equal(after.personalThrows.rows.reduce((n,r)=>n+r.nines,0),0);assert.equal(after.eveningCounterExcluded.nines.length,0);
 const undone=copy(after);undone.haustiefState.rows.A[0]=null;undone.eveningCounters=M.transition(after,undone,C.games);assert.equal(undone.eveningCounters.gutters,3);assert.equal(undone.eveningCounters.nines,0);assert.equal(undone.eveningCounters.throws,5);
});
test('recovery is limited to the confirmed evening and also works after the game has been replaced',()=>{
 const other=fixture();other.currentEveningStartedAt='other';assert.equal(R.recover(other,C),other);
 const replaced=fixture();replaced.haustiefState={startedAt:'new-game',active:true,rows:{A:[{value:4}]},history:[]};const saved=copy(replaced.haustiefState),after=R.recover(replaced,C);assert.deepEqual(copy(after.haustiefState),saved);assert.equal(after.strafenHistory[0].rows.A[0].physicalThrow.kind,'gosse');
});
test('explicit physical kinds override scores and misses never create nines in any counter',()=>{
 for(const key of ['haushoch','haustief','plusminus']){
  const stats=M.throws(key,{rows:{A:[{value:9,gameValue:9,isGosse:false,physicalThrow:{kind:'gosse',pins:0}},{value:0,gameValue:0,physicalThrow:{kind:'9er',pins:9}},{value:12,gameValue:0,physicalThrow:{kind:'kranz',pins:8}}]}});
  assert.deepEqual(copy(stats),[{gutters:1,nines:0,wreaths:0,throws:1,pins:0},{gutters:0,nines:1,wreaths:0,throws:1,pins:9},{gutters:0,nines:0,wreaths:1,throws:1,pins:8}]);
 }
 assert.equal(M.roll(9,'miss').nines,0);assert.equal(M.roll(9,'durchgeworfen').nines,0);
});
const evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLowerCase());
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
test('real low-house dialog stores the physical gutter/nine and undo reverses exactly one throw',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();await a.c.startHausGame('tief');
 a.c.hausOpenThrowModal('tief',0,0);let modal=a.document.getElementById('haus-throw-modal');assert.match(modal.textContent,/Gosse/);assert.match(modal.textContent,/Neuner/);assert.equal(modal.querySelector('[data-throw-label="Neuner"] .game-pin-circle').textContent,'0');
 const gutter=modal.querySelector('.game-pinpad-specials [data-throw-kind="gosse"]');assert(gutter);await gutter.onclick();assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(db.root().haustiefState.rows.A[0].physicalThrow.kind,'gosse');assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.gutters,1);assert.equal(db.root().eveningCounters.pins,0);
 a.c.hausOpenThrowModal('tief',1,0);modal=a.document.getElementById('haus-throw-modal');await modal.querySelector('[data-throw-label="Neuner"]').onclick();assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().haustiefState.rows.B[0].physicalThrow.kind,'9er');assert.equal(a.c.hausThrowValue('tief',db.root().haustiefState.rows.B[0]),0);assert.equal(db.root().eveningCounters.nines,1);assert.equal(db.root().eveningCounters.pins,9);
 await a.c.undoHausThrow('tief');assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.throws,1);
});
test('Firebase initialization repairs root and game mirror once without changing penalty counters',async()=>{
 const root={...initial(),...fixture(),syncInitialized:true,syncProtocol:1,syncRevision:3,syncOperation:'sync_previous'};root.persons=root.persons.map(p=>({...p,present:true}));
 const db=database({[rootPath]:root}),a=fullApp(db);await a.select();assert.equal(db.root().eveningCounters.pins,9);assert.deepEqual(db.root().persons,root.persons);
 assert.equal(db.data.get('clubs/club/liveGames/haustief').state.rows.A[0].physicalThrow.kind,'gosse');assert.equal(db.root().haustiefState.rows.A[0].gameValue,9);
 const revision=db.root().syncRevision;await a.c.firestoreApi.initializeSharedState('club',{},'sync_332_repeat');assert.equal(db.root().syncRevision,revision);
});

test('the sole genuine nine in a different game survives while both old score-nine groups are corrected',()=>{
 const source=fixture(),plusRow={value:9,isGosse:false};source.plusminusState={startedAt:'2026-11-27T19:46:52.259Z',rows:{A:[plusRow]},active:false,finished:true,history:[]};
 source.siebenerState={id:'real-nine',history:[{action:'throw',kind:'pins',pins:9,name:'B'}]};source.eveningCounters.nines+=2;source.eveningCounters.throws+=2;source.eveningCounters.pins+=18;
 for(const name of ['A','B']){const row=source.personalThrows.rows.find(x=>x.name===name);row.nines++;row.throws++;row.pins+=9;}
 const actual=copy(source.siebenerState),after=R.recover(source,C);assert.deepEqual(copy(after.eveningCounters),{gutters:5,nines:1,wreaths:1,throws:8,pins:18});assert.deepEqual(copy(after.siebenerState),actual);assert.equal(after.personalThrows.rows.find(x=>x.name==='A').nines,0);assert.equal(after.personalThrows.rows.find(x=>x.name==='B').nines,1);assert.deepEqual(copy(after.persons),source.persons);
});
