const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(p,'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const c={window:null,Date,Intl};c.window=c;vm.createContext(c);
for(const file of ['evening-counters','game-fine-policy','game-results','shared-sync-core','hotfix-recovery'])vm.runInContext(read('js/'+file+'.js'),c);
const M=c.KCEveningCounters,P=c.KCGameFinePolicy,C=c.KCSharedCore;
test('lottery receipts distinguish a real wreath from its 9, 8, 0 or 12 game value',()=>{
 for(const value of [0,8,9,12]){
  const state={id:'game',throws:{A:[value]},throwMeta:{A:[{penaltyType:'kranz'}]}};
  assert.deepEqual(copy(M.throws('lotterie',state)),[{gutters:0,nines:0,wreaths:1,throws:1,pins:8}]);
 }
 const s={rows:{A:[{value:9,isGosse:true},{value:9},{value:12,kranzValue:0}]}};
 for(const key of ['haushoch','haustief'])assert.deepEqual(copy(M.throws(key,s)),[{gutters:1,nines:0,wreaths:0,throws:1,pins:0},{gutters:0,nines:1,wreaths:0,throws:1,pins:9},{gutters:0,nines:0,wreaths:1,throws:1,pins:8}]);
});
test('two equal legacy charges are matched to two receipts, never collapsed or doubled',()=>{
 const state={currentEveningStartedAt:'night',strafenHistory:[{id:'one',type:'lotterie',assignedTo:[{name:'A',amount:5.1}]},{id:'two',type:'lotterie',assignedTo:[{name:'A',amount:5.1}]}],STRAFEN:[],STRAFEN_LIMIT:30};
 const person={name:'A',freeStrafen:[{id:'free',reason:'Lotterie',amount:5.1}]};
 assert.equal(P.legacyMissing(person,state).length,1);
 assert.equal(P.parts(person,state).normal,1020);
 assert.equal(P.applyTotals([person],state)[0].strafTotal,10.2);
 person.freeStrafen.push({id:'free2',reason:'Lotterie',amount:5.1});assert.equal(P.legacyMissing(person,state).length,0);assert.equal(P.parts(person,state).normal,1020);
});
test('recovery restores only missing stable money receipts and corrects counted raw statistics once',()=>{
 const source={currentEveningStartedAt:'night',persons:[{name:'A',strafen:{manual:7},freeStrafen:[]}],individualGameLedger:[],hausnummerSettings:{tief:{neun:0,kranz:0,gosse:0}},lotterieState:{id:'lotto',throws:{A:[9]},throwMeta:{A:[{penaltyType:'kranz'}]}},eveningCounters:{gutters:0,nines:1,wreaths:0,throws:1,pins:9},personalThrows:{schema:1,rows:[{name:'A',gutters:0,nines:1,wreaths:0,throws:1,pins:9}],excluded:[]},pfaelzerState:{id:'game',finished:true,eveningStartedAt:'night',bookings:[{id:'receipt',personName:'A',amountCents:150,eveningStartedAt:'night',gameId:'game',gameKey:'pfaelzer',reason:'Pfälzerspiel · Striche'}]}};
 const recovered=c.KCHotfixRecovery.recover(source,C);
 assert.equal(recovered.hausnummerSettings.tief.gosse,9);assert.equal(recovered.individualGameLedger.length,1);
 assert.deepEqual(copy(recovered.eveningCounters),{gutters:0,nines:0,wreaths:1,throws:1,pins:8});assert.equal(recovered.personalThrows.rows[0].pins,8);
 assert.deepEqual(copy(recovered.persons),source.persons);assert.deepEqual(copy(recovered.pfaelzerState),source.pfaelzerState);
 assert.deepEqual(copy(c.KCHotfixRecovery.recover(recovered,C)),copy(recovered));assert.equal(source.hausnummerSettings.tief.gosse,0);
 const edited=copy(source);edited.eveningCounterExcluded=M.exclude(edited,C.games,['pins','nines']);edited.personalThrows.excluded=M.entries('lotterie',edited.lotterieState).map(x=>x[0]);const fixed=c.KCHotfixRecovery.recover(edited,C);assert.equal(fixed.eveningCounters.pins,9);assert.equal(fixed.personalThrows.rows[0].pins,9);
});
test('solo undo reverses final loser penalties and uses raw pins rather than the replacement score',async()=>{
 const calls=[],stats=[];const s={window:{},penaltyStatsLog:[],currentEveningStartedAt:'night',getPenaltyKeyByType:k=>k,getActivePlayersForSoloGame:()=>[{name:'A'},{name:'B'}],showToast(){},changeMultipleSyncedPersonCounters:async rows=>{calls.push(copy(rows));return true;},normalizePenaltyStatsType:x=>x,addPenaltyStatsEntry:(...x)=>stats.push(x)};vm.createContext(s);vm.runInContext(read('js/games/seating.js'),s);
 await s.changeSoloThrowPenalty('A',{pins:9,rawPins:0,isGosse:true},null,[{personName:'B',key:'l1',delta:1}]);
 assert.deepEqual(calls[0],[{personName:'A',category:'strafen',key:'gosse',delta:-1},{personName:'B',category:'strafen',key:'l1',delta:-1}]);
});
const evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
for(const mode of ['hoch','tief'])test('real '+mode+' Hausnummer books raw throws, losers, total and undo together',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();
 a.run("hausnummerSettings.tief.gosse=0;persistState()");await a.c.startHausGame(mode);
 const names=a.run('hausState("'+mode+'").playerOrder.slice()');
 for(const [pins,place] of [[0,0],[1,0],[9,1],[2,1],[12,2],[3,2]])await a.c.hausThrow(mode,pins,pins===0,place);
 assert(await a.c.KCSharedSync.waitForUpload());let root=db.root(),s=root[mode==='hoch'?'haushochState':'haustiefState'];assert(s.finished);
 assert.equal(a.run('hausThrowValue("'+mode+'",{value:0,isGosse:true})'),mode==='hoch'?0:9);
 assert.deepEqual(copy(root.eveningCounters),{gutters:1,nines:1,wreaths:1,throws:6,pins:23});
 assert.equal(root.persons.find(p=>p.name===names[0]).strafen.gosse,1);assert.equal(root.persons.find(p=>p.name===names[1]).strafen.nine,2);
 const result=s.history[0],loser=result.assigned[0];assert.equal(root.persons.find(p=>p.name===loser.name).strafen[loser.key],1);
 const stat=root.personalThrows.rows.find(x=>x.name===names[0]);assert.equal(stat.pins,17);assert.equal(stat.gutters,1);assert.equal(stat.nines,1);assert.equal(stat.wreaths,1);
 assert(a.document.querySelector('[onclick="undoHausThrow(\''+mode+'\')"]'));
 await a.c.undoHausThrow(mode);assert(await a.c.KCSharedSync.waitForUpload());root=db.root();assert.equal(root.persons.find(p=>p.name===loser.name).strafen[loser.key],0);assert.equal(root.eveningCounters.throws,5);assert.equal(root.eveningCounters.pins,20);
 await a.c.undoHausThrow(mode);assert(await a.c.KCSharedSync.waitForUpload());root=db.root();assert.equal(root.eveningCounters.wreaths,0);assert.equal(root.eveningCounters.pins,12);assert.equal(root.persons.find(p=>p.name===names[1]).strafen.nine,1);
});
test('real Pfälzerspiel result is present in free amounts, charged once and removed on undo',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();a.document.getElementById('round-pfaelzer-rounds').value='1';a.document.getElementById('round-pfaelzer-strichCents').value='0.15';assert(await a.c.saveRoundSettings('pfaelzer'));await a.c.indStart('pfaelzer');for(const pins of [4,6,6])await a.c.indAction('pfaelzer','throw',{kind:'pins',pins});await a.c.indAction('pfaelzer','throw',{kind:'miss'});assert(await a.c.KCSharedSync.waitForUpload());
 const ledger=db.root().individualGameLedger;assert.equal(ledger.length,1);assert.equal(ledger[0].amountCents,30);const person=db.root().persons.find(p=>p.name===ledger[0].personName);assert.equal(person.strafTotal,.3);assert.match(a.document.getElementById('strafen-body').innerHTML,/Pfälzerspiel/);assert.match(a.document.getElementById('strafen-body').innerHTML,/0,30/);
 await a.c.indAction('pfaelzer','undo');assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().individualGameLedger.length,0);assert.equal(db.root().persons.find(p=>p.name===person.name).strafTotal,0);
});
test('real plusminus completion books losers, correction moves the rank, undo removes it',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();await a.c.startPlusminusGame();
 for(let i=0;i<5;i++){await a.c.applyPlusminusThrow(2);await a.c.applyPlusminusThrow(1);}
 assert(await a.c.KCSharedSync.waitForUpload());let result=db.root().plusminusState.history[0];assert.equal(result.assigned[0].name,'B');assert.equal(db.root().persons[1].strafen.loser,1);
 await a.c.finishPlusminusGame();assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[1].strafen.loser,1);
 a.c.openPlusminusSlotEdit('A',2);await a.c.confirmPlusminusSlotEdit(9);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[0].strafen.loser,1);assert.equal(db.root().persons[1].strafen.loser,0);assert.equal(db.root().persons[1].strafen.nine,1);
 await a.c.undoPlusminusThrow();assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[0].strafen.loser,0);assert.equal(db.root().eveningCounters.throws,9);
});
test('already initialized Firebase data receives one recovery without changing its evening or resetting games',async()=>{
 const root=initial();root.syncInitialized=true;root.syncProtocol=1;root.syncRevision=4;root.syncOperation='sync_before';root.hausnummerSettings={tief:{neun:0,kranz:0,gosse:0}};root.haustiefState={active:true,startedAt:evening,rows:{A:[{value:0,isGosse:true},null,null]},playerOrder:['A','B'],currentPlayerIndex:1};
 const db=database({[rootPath]:root}),a=fullApp(db);await a.select();const saved=copy(db.root());assert.equal(saved.hotfix331.schema,1);assert.equal(saved.hausnummerSettings.tief.gosse,9);assert.deepEqual(saved.haustiefState,root.haustiefState);assert.equal(saved.currentEveningStartedAt,root.currentEveningStartedAt);assert.deepEqual(saved.persons.map(p=>p.strafen),root.persons.map(p=>p.strafen));
 await a.c.firestoreApi.initializeSharedState('club',{},'sync_retry_hotfix');assert.equal(db.root().syncRevision,saved.syncRevision);
});

test('manual personal-stat correction survives sync and subsequent raw throw undo',async()=>{
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();await a.c.startHausGame('hoch');await a.c.hausThrow('hoch',0,true,0);
 a.c.KCHotfixRecovery.editPersonal();const form=a.document.querySelector('#personal-correction-modal form');assert.equal(form.querySelector('select').value,'A');
 for(const [key,n] of Object.entries({gutters:1,nines:1,wreaths:0,throws:2,pins:9}))form.querySelector('[name="'+key+'"]').value=String(n);
 form.onsubmit({preventDefault(){}});assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().personalThrows.rows.find(x=>x.name==='A').pins,9);
 await a.c.undoHausThrow('hoch');assert(await a.c.KCSharedSync.waitForUpload());const row=db.root().personalThrows.rows.find(x=>x.name==='A');assert.equal(row.throws,1);assert.equal(row.gutters,0);assert.equal(row.nines,1);assert.equal(row.pins,9);assert.equal(db.root().persons[0].strafen.gosse,0);
});
