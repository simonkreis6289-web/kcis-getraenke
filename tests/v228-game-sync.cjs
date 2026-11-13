const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
const source=read('tests/v215-shared-sync.cjs'),factory=source.slice(source.indexOf('function database('),source.indexOf("test('two devices increment"))+source.slice(source.indexOf('function fullApp('),source.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,apiClient,context,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,apiClient,context,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
function audit(db,label){if(process.env.KC_FIRESTORE_AUDIT_OUTPUT)fs.appendFileSync(process.env.KC_FIRESTORE_AUDIT_OUTPUT,JSON.stringify({label,documents:[...db.data]})+'\n');}
function roster(){const root=initial();root.dartsState={active:false};root.persons=['A','B','C','D'].map((name,i)=>({...copy(root.persons[0]),name,tisch:i%2?'T2':'T1'}));root.STRAFEN.push({key:'l2',label:'2. Verlierer'},{key:'l3',label:'3. Verlierer'});Object.assign(root.strafPrices,{l2:1,l3:1});return root;}
let seq=0;
async function modern(key,players=['A','B','C','D']){
 const db=database({[rootPath]:roster()}),c=apiClient(db);await c.firestoreApi.initializeSharedState('club',{},'sync_audit_init');
 const six=key==='sechstage',table=['blackjack','gluecksspirale'].includes(key),method=six?'transactSechsGame':table?'transactTableGame':'transactIndividualGame',engine=six?c.KCSixDays:table?c.KCTableGames:c.KCExtraGames.keys.includes(key)?c.KCExtraGames:c.KCIndividual;
 let clock=Date.now();c.KCSharedClock={now:()=>clock};
 const state=()=>db.root()[key+'State']||engine.empty(key);
 async function run(action,fields={}){const s=state(),req={gameKey:key,action,opId:(six?'six_':table?'table_':'ind_')+'audit_'+(++seq),expectedRevision:s.revision,gameId:(table?'game_':'indgame_')+'audit',raceId:'race_audit',eveningStartedAt:evening,...fields};await c.firestoreApi[method]('club',req,context(db,method));return req;}
 const config=c.KCExtraGames.keys.includes(key)?{...c.KCExtraGames.defaults(key),...({bergundtal:{rounds:1},lattenzaun:{slats:3},guterschnitt:{targets:[3]},parteienspiel:{rounds:1},dreieuro:{throws:1},ebbeflut:{rounds:1},hochsprung:{targets:[12]},pfaelzer:{rounds:1,strichCents:10,tieThrows:1},tausend:{rounds:1}}[key]||{})}:key==='hindernis'?{target:20,baseCents:100,rules:[]}:{};
 await run('start',{players,teams:[{players:['A','B']},{players:['C','D']}],cards:false,target:10,config,startTeam:'T1'});
 const roll=pins=>run('throw',{kind:'pins',pins});
 if(six){for(let i=0;i<60&&!state().readyToFinish;i++)await roll(state().teamIndex===0?2:1);await run('finish');}
 else if(key==='blackjack'){for(let i=0;i<players.length;i++){await roll(3+i);await run('stand');}for(const name of players)await run('card',{playerName:name,value:2});await run('finish');}
 else if(key==='gluecksspirale'){for(const pins of [6,4,1,1])await roll(pins);await run('finish');}
 else if(key==='siebener'){for(const column of [7,14,21,28,35,42,49])for(const name of players){await roll(3);await roll(4);await run('place',{column});}await run('finish');}
 else if(key==='hindernis'){for(let i=0;i<20&&!state().finished;i++)await roll(7);}
 else if(key==='bergundtal'){for(let i=0;i<players.length;i++){await roll(6);await roll(i+2);}await run('finish');}
 else if(key==='ballermann'){for(let i=0;i<2;i++){await run('timerStart');await roll(6+i);clock+=state().config.seconds*1000+1;await run('expire');}}
 else if(key==='lattenzaun'){await roll(2);await roll(7);}
 else if(key==='guterschnitt')await roll(3);
 else if(key==='parteienspiel'){for(const pins of [6,3,5,2])await roll(pins);}
 else if(key==='dreieuro'||key==='ebbeflut'){for(const pins of [2,4,6,8])await roll(pins);}
 else if(key==='hochsprung'){for(const pins of [2,2,2,4,4,4,6,6,7,5])await roll(pins);}
 else if(key==='poker'){for(const hand of [[1,2,3,4,5],[7,7,7,6,4],[2,2,5,7,8],[1,3,5,7,9]])for(const pins of hand)await roll(pins);for(const name of players)await run('exchange',{indices:[]});}
 else if(key==='pfaelzer'){for(const pins of [1,2,3,4,1,2,1,2])await roll(pins);for(let round=0;round<4&&state().phase==='tiebreak';round++){for(let i=0,n=state().tiePlayers.length;i<n;i++)await roll(2+i);}}
 else if(key==='tausend'){for(const pins of [1,2,3,2,3,4,3,4,5,4,5,6]){await roll(pins);if(state().pendingArrange)await run('arrange',{order:[0,1,2]});}}
 assert(state().finished,key+' must reach its real finish');
 return {db,c,state,run,method};
}
for(const key of ['sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend'])test(key+': every real turn and the completed result persist to Firestore, then further bookings still work', {timeout:60000},async()=>{
 const {db,c,state}=await modern(key);assert(db.root().strafenHistory.some(e=>e.gameKey===key||e.type===key),key+' result receipt');
 for(const p of db.root().persons)assert.deepEqual(db.data.get(personPath(p.name)).strafen,p.strafen);
 assert.deepEqual(db.data.get('clubs/club/liveGames/'+key).state,state());
 const before=copy(db.root().strafenHistory);await c.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(db,'changeLivePersonCounter'));assert.equal(db.root().persons[0].drinks.beer,1);assert.deepEqual(db.root().strafenHistory,before);audit(db,key);assertDashboard(db,key);
});
const dashSource=read('tests/v185-regression.cjs'),start=dashSource.indexOf('function context(html){'),end=dashSource.indexOf('async function settle(',start),dashboard=new Function('read','vm','parseHTML','assert','require','let sequence=0;const plain=x=>JSON.parse(JSON.stringify(x));'+dashSource.slice(start,end)+';return dashboard;')(read,vm,parseHTML,assert,require);
async function classicApp(key){const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();if(key==='pfaelzer'){a.document.getElementById('round-pfaelzer-rounds').value='1';a.document.getElementById('round-pfaelzer-strichCents').value='0.15';assert(await a.c.saveRoundSettings(key));}if(key==='tausend'){a.document.getElementById('round-tausend-rounds').value='1';assert(await a.c.saveRoundSettings(key));}await a.c.indStart(key);return {...a,db};}
async function completeClassic(a,key){const roll=pins=>a.c.indAction(key,'throw',{kind:'pins',pins});if(key==='poker'){for(const pins of [1,2,3,4,5,7,7,7,6,4])await roll(pins);await a.c.confirmPokerExchange();await a.c.confirmPokerExchange();}else if(key==='pfaelzer'){for(const pins of [4,6,6,5])await roll(pins);}else{for(const pins of [1,2,3,4,5,6]){await roll(pins);if(a.c.indGet(key).pendingArrange)await a.c.indAction(key,'arrange',{order:[0,1,2]});}}assert(a.c.indGet(key).finished);}
function legacyGroups(x){if(Array.isArray(x))return x.map(legacyGroups);if(!x||typeof x!=='object')return x;return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='rankingGroups'?v.map(g=>Array.isArray(g)?g:g.names):legacyGroups(v)]));}
for(const key of ['poker','pfaelzer','tausend'])test(key+': recover an old blocked inflight result plus newer pending drinks, without dropping or doubling any fee', {timeout:60000},async()=>{
 const a=await classicApp(key);assert(await a.c.KCSharedSync.waitForUpload());a.db.fail(true);await completeClassic(a,key);assert.equal(await a.c.KCSharedSync.waitForUpload(),false);await a.c.changeDrink('A','beer',1);const expected=copy(a.run('getFirestoreState()')),saved=legacyGroups(JSON.parse(a.storage.get('kcis_tablet_outbox_club')));assert(saved.inflight&&saved.pending);saved.pending.documents.push({path:'clubs/club/test/legacy',value:{syncRevision:17,archived:{rankingGroups:[['A'],['B']]},amountCents:123}});a.storage.set('kcis_tablet_outbox_club',JSON.stringify(saved));a.db.fail(false);
 const b=fullApp(a.db);for(const [k,v] of a.storage)b.storage.set(k,v);await b.select();assert(await b.c.KCSharedSync.waitForUpload());const root=a.db.root();assert.equal(root.persons[0].drinks.beer,1);assert.deepEqual(root.persons.map(p=>p.strafen),expected.persons.map(p=>p.strafen));assert.deepEqual(root.individualGameLedger,expected.individualGameLedger);assert.deepEqual(root.strafenHistory,expected.strafenHistory);assert.equal(root.strafenHistory.filter(e=>e.gameKey===key).length,1);assert.deepEqual(root[key+'State'].rankingGroups,expected[key+'State'].rankingGroups);assert.deepEqual(a.db.data.get('clubs/club/test/legacy').archived,{rankingGroups:[{names:['A']},{names:['B']}]});assert.equal(a.db.data.get('clubs/club/test/legacy').amountCents,123);
 const settled=copy(root.persons);assert(await b.c.KCSharedSync.reconnect());assert.deepEqual(a.db.root().persons,settled);assert.equal(JSON.parse(b.storage.get('kcis_tablet_outbox_club')).inflight,null);audit(a.db,key+' recovered outbox');
});
for(const key of ['poker','pfaelzer','tausend'])test(key+': the automatic TV renders the final result, survives response loss, and follows the next drink and game', {timeout:60000},async()=>{
 const a=await classicApp(key);let receive;const d=dashboard({root:()=>a.db.root(),subscribe:(_,cb)=>{receive=cb;cb(a.db.root());return ()=>{};}});for(const f of ['js/kranz-policy.js','js/games/extra-core.js','js/games/extra-view.js','js/game-overview.js']){vm.runInContext(read(f),d.c);Object.assign(d.c,d.c.window);}Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});d.c.window.dashboardTest.connect('club','Test');
 await completeClassic(a,key);a.db.lose();assert.equal(await a.c.KCSharedSync.waitForUpload(),false);const booked=copy(a.db.root().persons);receive(a.db.root());assert(d.document.getElementById('game-title').textContent.includes(a.c.KCGameOverview.catalog.find(g=>g.key===key).title));assert(d.document.getElementById('game-body').textContent.includes('A'));assert(await a.c.KCSharedSync.reconnect());assert.deepEqual(a.db.root().persons,booked);await a.c.changeDrink('A','beer',1);assert(await a.c.KCSharedSync.waitForUpload());receive(a.db.root());assert(d.document.getElementById('drinks').textContent.includes('2,00'));
 await a.c.indStart('ebbeflut');assert(await a.c.KCSharedSync.waitForUpload());receive(a.db.root());assert(d.document.getElementById('game-title').textContent.includes('Ebbe'));audit(a.db,key+' TV follow-up');
});

function assertDashboard(db,key){
 const root=copy(db.root());root.dashboardGameOverview={open:false};root.dashboardActiveGame=key;
 const d=dashboard({root:()=>root,subscribe:(_,cb)=>{cb(root);return ()=>{};}});
 for(const f of ['js/kranz-policy.js','js/games/sechstage-core.js','js/games/table-games-core.js','js/games/individual-core.js','js/games/individual-view.js','js/games/extra-core.js','js/games/extra-view.js','js/game-overview.js']){vm.runInContext(read(f),d.c);Object.assign(d.c,d.c.window);}
 Object.defineProperty(d.document.getElementById('game-select'),'value',{value:key,writable:true});d.c.window.dashboardTest.connect('club','Test');
 assert(!d.document.querySelector('#game-body .placeholder'),key+' TV renders a game');assert(d.document.getElementById('game-body').textContent.includes('A'),key+' TV renders participants');
}
const legacyCases={
 tannenbaum:async a=>{await a.c.startTannenbaumSetup();await a.c.finishTannenbaumGame();},
 darts:async a=>{await a.c.startDartsGame();a.run('dartsState.scores.T1=1;dartsState.roundThrows.T1=[{value:2,thrower:"A",createdAt:new Date().toISOString()}]');await a.c.finishDartsRound();},
 lotterie:async a=>{await a.c.startLotterieGameFinal('A');a.run('lotterieState.columns=[1,2,3,4];for(const [i,n] of ["A","B","C","D"].entries())lotterieState.throws[n]=[i+1,i+2,i+3,i+4]');await a.c.finishLotterieGame();},
 tiberius:async a=>{a.run('tiberiusState.columnCount=1');await a.c.startTiberiusGameFinal('A');await a.c.finishTiberiusGame();},
 mensch:async a=>{await a.c.startMenschGameFinal('A');a.run('menschState.scores={A:36,B:6,C:4,D:2}');await a.c.finishMenschGame('A');},
 plusminus:async a=>{await a.c.startPlusminusGame();a.run('for(const n of ["A","B","C","D"])plusminusState.rows[n]=[1,2,3,4,5].map(value=>({value,isGosse:false}))');await a.c.finishPlusminusGame();},
 haushoch:async a=>{await a.c.startHausGame('hoch');for(let i=0;i<12;i++)await a.c.hausThrow('hoch',1+i%4,false,Math.floor(i/4));},
 haustief:async a=>{await a.c.startHausGame('tief');for(let i=0;i<12;i++)await a.c.hausThrow('tief',1+i%4,false,Math.floor(i/4));},
 sichern:async a=>{await a.c.startSichernGame();a.run('sichernState.secured.A=sichernState.target');await a.c.finishSichernGame('A');},
 fuchsjagd:async a=>{await a.c.startFuchsjagdGame();await a.c.finishFuchsjagd(true);},
 tor:async a=>{await a.c.startTorGame();a.run('Object.assign(torState,{coinPending:false,current:"T1",standing:[1],selected:[1],scores:{T1:4,T2:0}})');await a.c.torThrow('pins');}
};
for(const [key,complete] of Object.entries(legacyCases))test(key+': legacy completion, tablet upload, TV result and subsequent booking stay connected', {timeout:60000},async()=>{
 const db=database({[rootPath]:roster()}),a=fullApp(db);await a.select();await complete(a);const s=a.c.gameSetupState(key);assert(!s.active||key==='tannenbaum',key+' completes');assert(await a.c.KCSharedSync.waitForUpload());const root=db.root();assert(root.strafenHistory.some(e=>e.gameKey===key||e.type===key),key+' has a final result');const saved=copy(root.strafenHistory);await a.c.changeDrink('A','beer',1);assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().persons[0].drinks.beer,1);assert.deepEqual(db.root().strafenHistory,saved);audit(db,key);assertDashboard(db,key);
});

test('legacy group migration preserves proofs and amounts, is idempotent and leaves its input untouched',()=>{
 const c={window:{}};vm.createContext(c);vm.runInContext(read('js/shared-sync-core.js'),c);
 const input={syncRevision:17,sequence:8,opId:'sync_original',state:{pokerState:{rankingGroups:[['A','B'],['C']],winners:['C'],finishPenalties:[{personName:'A',delta:1}]}},documents:[{path:'clubs/club/archive/one',value:{rankingGroups:[['A']],amountCents:210,updatedAt:{serverTime:true}}}]},before=copy(input),out=copy(c.window.KCSharedCore.normalizeGameData(input));
 assert.deepEqual(input,before);assert.equal(out.syncRevision,17);assert.equal(out.sequence,8);assert.equal(out.opId,'sync_original');assert.deepEqual(out.state.pokerState.rankingGroups,[{names:['A','B']},{names:['C']}]);assert.deepEqual(out.state.pokerState.finishPenalties,input.state.pokerState.finishPenalties);assert.equal(out.documents[0].value.amountCents,210);assert.deepEqual(out.documents[0].value.updatedAt,{serverTime:true});assert.deepEqual(copy(c.window.KCSharedCore.normalizeGameData(out)),out);
});

test('a pre-update Pfälzerspiel playoff continues from legacy groups and keeps its winner and loser ranks',()=>{
 const c={window:{},Date};c.window=c;vm.createContext(c);vm.runInContext(read('js/games/extra-core.js'),c);const G=c.KCExtraGames,ctx={people:roster().persons,catalog:roster().STRAFEN,now:evening,eveningStartedAt:evening};let s=G.empty('pfaelzer'),n=0;
 const run=(action,fields={})=>s=G.command(s,{gameKey:'pfaelzer',gameId:'indgame_legacy',opId:'ind_legacy_'+(++n),expectedRevision:s.revision,action,...fields},ctx).state;
 run('start',{players:['A','B'],config:{...G.defaults('pfaelzer'),rounds:1,tieThrows:1}});for(const pins of [3,4,3,4])run('throw',{kind:'pins',pins});assert.equal(s.phase,'tiebreak');s=legacyGroups(s);const before=copy(s);run('throw',{kind:'pins',pins:8});assert.deepEqual(before.rankingGroups,[['A','B']]);assert.deepEqual(copy(s.rankingGroups),[{names:['A','B']}]);run('throw',{kind:'pins',pins:7});assert(s.finished);assert.deepEqual(copy(s.winners),['A']);assert.deepEqual(copy(s.loserGroups),[{rank:1,names:['B']}]);
});
