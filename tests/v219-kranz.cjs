const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
// Reuse the real app / optimistic Firestore transaction harness without registering its tests twice.
const src=read('tests/v215-shared-sync.cjs'),harness=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment")),appCode=src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots"));
const {database,initial,apiClient,context,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',harness.replace("['js/game-fine-policy.js'","['js/kranz-policy.js','js/game-fine-policy.js'")+appCode+';return {database,initial,apiClient,context,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
const people=['A','B','C','D'].map((name,i)=>({name,present:true,tisch:i<2?'T1':'T2'})),catalog=[{key:'gosse',label:'Gosse'},{key:'nine',label:'9er / Kranz'}],ctx={people,catalog,now:evening,eveningStartedAt:evening,groups:{},club:'Club'};
let sequence=0;
function engines(){const c={console};c.window=c;vm.createContext(c);for(const p of ['js/kranz-policy.js','js/games/sechstage-core.js','js/games/table-games-core.js','js/games/individual-core.js','js/games/extra-core.js'])vm.runInContext(read(p),c);return c;}
function game(c,key,rule){
 const core=key==='sechstage'?c.KCSixDays:['blackjack','gluecksspirale'].includes(key)?c.KCTableGames:['siebener','hindernis'].includes(key)?c.KCIndividual:c.KCExtraGames;
 let state=core.empty(key);
 function run(action,fields={}){const request={gameKey:key,action,opId:(key==='sechstage'?'six_':['blackjack','gluecksspirale'].includes(key)?'table_':'ind_')+'test_'+(++sequence),expectedRevision:state.revision,raceId:state.id,gameId:state.id,...fields},before=state;const out=core.command(state,request,ctx);state=out.state;return {state,request,before};}
 run('start',{raceId:'race_test',gameId:(['blackjack','gluecksspirale'].includes(key)?'game_':'indgame_')+'test',players:people.map(p=>p.name),teams:[{players:['A','B']},{players:['C','D']}],target:50,config:c.KCExtraGames.keys.includes(key)?core.defaults(key):c.KCIndividual.defaults(),kranzRule:rule,startTeam:'T1'});
 if(key==='ballermann')run('timerStart');
 return {run,get state(){return state;},core};
}
test('all twenty-four games support the common rule; previous special values and good-cut target survive migration',()=>{
 const c=engines(),p=c.KCKranzPolicy;assert.equal(p.keys.length,24);
 for(const key of p.keys)for(const rule of [{mode:'fixed',value:8},{mode:'fixed',value:12},{mode:'choose'}]){const root={extraGameSettings:{kranzRules:{[key]:rule}}};assert.deepEqual(copy(p.configured(root,key)),rule);assert.equal(p.resolve(rule,6),rule.mode==='choose'?6:rule.value);}
 assert.equal(p.configured({dartsState:{valueMap:{kranz:50}}},'darts').value,50);assert.equal(p.configured({},'haustief').value,0);assert.equal(p.configured({extraGameSettings:{guterschnitt:{kranzMode:'target'}}},'guterschnitt').mode,'target');assert.throws(()=>p.resolve({mode:'choose'},10),/Kranzwert/);assert.throws(()=>p.resolve({mode:'choose'}),/Kranzwert/);
});
for(const key of ['sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt'])test(key+': 8 / 12 / chosen value retain Kranz identity and survive undo/reload',()=>{
 const c=engines();for(const rule of [{mode:'fixed',value:8},{mode:'fixed',value:12},{mode:'choose'}]){
  const g=game(c,key,rule),first=g.run('throw',{kind:'kranz',kranzValue:7}),expected=rule.mode==='choose'?7:rule.value,e=first.state.history.at(-1);assert.equal(e.pins,expected);assert.equal(e.kind,'kranz');
  const effect=g.core.effects(first.before,first.state,first.request,ctx);assert.equal(effect.added[0].type,'kranz');assert.equal(effect.changes.length,3);
  if(key==='sechstage')assert.equal(g.state.turn.standing,9);
  const afterFirst=copy(g.state);g.run('throw',{kind:'miss'});g.run('undo');assert.deepEqual(copy(g.state.history),afterFirst.history);assert.deepEqual(copy(g.state.kranzRule),rule);assert.equal(g.state.history.at(-1).pins,expected);
  if(rule.mode==='choose')assert.throws(()=>g.run('throw',{kind:'kranz'}),/Kranzwert/);
 }
});
test('good-cut target rule still hits the current configured target',()=>{const c=engines(),g=game(c,'guterschnitt',{mode:'target'}),target=g.state.config.targets[0];g.run('throw',{kind:'kranz'});assert.equal(g.state.history[0].pins,target);assert.equal(g.state.history[0].hit,true);});
async function app(settings={}){const value=initial();value.extraGameSettings={kranzRules:settings};value.persons.forEach((p,i)=>p.tisch=i?'T2':'T1');const db=database({[rootPath]:value}),a=fullApp(db);await a.select();return {...a,db};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function selectValue(el,value){for(const o of el.querySelectorAll('option')){if(o.value===String(value))o.setAttribute('selected','');else o.removeAttribute('selected');}}
async function answer(a,number){for(let i=0;i<10&&!a.document.querySelector('.kc-kranz-backdrop');i++)await flush();const b=[...a.document.querySelectorAll('.kc-kranz-choices button')].find(b=>Number(b.textContent)===number);assert(b,'Kranz dialog is visible');b.click();}
test('actual app exposes one per-game control for all twenty-four games and persists a choice across devices',async()=>{
 const a=await app();assert.equal(a.document.querySelectorAll('[id^="kranz-rule-"]').length,24);for(const el of a.document.querySelectorAll('[id^="kranz-rule-"]'))assert(['8','12','choose'].every(v=>[...el.options].some(o=>o.value===v)));
 const el=a.document.getElementById('kranz-rule-sechstage');selectValue(el,'choose');await a.c.KCKranzUI.save('sechstage');assert.equal(a.db.root().extraGameSettings.kranzRules.sechstage.mode,'choose');
 const b=fullApp(a.db);await b.select();assert.equal(b.document.getElementById('kranz-rule-sechstage').value,'choose');
});
test('legacy Hausnummer stores the selected score separately, books one Kranz, and undoes both',async()=>{
 const a=await app({haushoch:{mode:'choose'}});await a.c.startHausGame('hoch');assert.equal(a.db.root().haushochState.kranzRule.mode,'choose');const pending=a.c.hausThrow('hoch',12,false,0);await answer(a,8);await pending;const saved=a.db.root(),name=saved.haushochState.playerOrder[0],entry=saved.haushochState.rows[name][0];assert.equal(entry.value,12);assert.equal(entry.kranzValue,8);assert.equal(saved.persons.find(p=>p.name!==name).strafen.nine,1);assert.equal(saved.penaltyStatsLog.at(-1).type,'kranz');assert.equal(a.run("hausThrowValue('hoch',haushochState.rows[haushochState.playerOrder[0]][0])"),8);
 await a.c.undoHausThrow('hoch');assert.equal(a.db.root().haushochState.rows[name][0],null);assert.equal(a.db.root().persons.find(p=>p.name!==name).strafen.nine,0);
});
test('cancelling or receiving a stale Kranz choice never books a partial throw or penalty',async()=>{
 const a=await app({haushoch:{mode:'choose'}});await a.c.startHausGame('hoch');const before=copy(a.db.root());let p=a.c.hausThrow('hoch',12,false,0);for(let i=0;i<8;i++)await flush();a.c.KCKranzUI.cancel();await p;assert.deepEqual(a.db.root(),before);
 p=a.c.KCKranzUI.select('haushoch');a.run('haushochState.currentPlayerIndex=1');await answer(a,9);assert.equal(await p,null);assert.deepEqual(a.db.root(),before);
});
test('new settings do not change a running legacy game and the next game freezes the new value',async()=>{
 const a=await app({haushoch:{mode:'fixed',value:8}});await a.c.startHausGame('hoch');const el=a.document.getElementById('kranz-rule-haushoch');selectValue(el,'12');await a.c.KCKranzUI.save('haushoch');assert.equal(a.db.root().extraGameSettings.kranzRules.haushoch.value,12,'setting was saved');await a.c.hausThrow('hoch',12,false,0);const name=a.db.root().haushochState.playerOrder[0];assert.equal(a.db.root().haushochState.rows[name][0].kranzValue,8);await a.c.startHausGame('hoch');assert.equal(a.db.root().haushochState.kranzRule.value,12);
});
test('the real six-days API freezes the canonical choice, requires a selected value and repeats safely',async()=>{
 const v=initial();v.persons.push({...v.persons[0],name:'C'},{...v.persons[0],name:'D'});v.extraGameSettings={kranzRules:{sechstage:{mode:'choose'}}};const db=database({[rootPath]:v}),c=apiClient(db);await c.firestoreApi.initializeSharedState('club',{},'sync_init');
 const start={action:'start',raceId:'race_live',opId:'six_live_start',expectedRevision:0,eveningStartedAt:evening,teams:[{players:['A','B']},{players:['C','D']}],kranzRule:{mode:'fixed',value:12}};
 let out=await c.firestoreApi.transactSechsGame('club',start,context(db,'transactSechsGame'));assert.equal(out.state.kranzRule.mode,'choose');const req={action:'throw',raceId:'race_live',opId:'six_live_throw',expectedRevision:out.state.revision,eveningStartedAt:evening,kind:'kranz'};
 await assert.rejects(c.firestoreApi.transactSechsGame('club',req,context(db,'transactSechsGame')),/Kranzwert/);req.kranzValue=9;const sync=context(db,'transactSechsGame');out=await c.firestoreApi.transactSechsGame('club',req,sync);assert.equal(out.state.history[0].pins,9);assert.equal(out.state.turn.standing,9);assert.equal(out.added[0].type,'kranz');await c.firestoreApi.transactSechsGame('club',req,sync);assert.equal(db.root().sechstageState.history.length,1);assert.equal(db.root().persons[1].strafen.nine,1);
});
test('classic solo games score a Kranz as 8 while their undo reverses the Kranz penalty',async()=>{
 const a=await app(Object.fromEntries(['mensch','plusminus','sichern','fuchsjagd'].map(k=>[k,{mode:'fixed',value:8}])));
 for(const [key,start,play,undo,score] of [
  ['mensch',"startMenschGameFinal('A')",'applyMenschThrow(12)','undoMenschThrow()',"menschState.scores.A"],
  ['plusminus','startPlusminusGame()','applyPlusminusThrow(12)','undoPlusminusThrow()',"resolvePlusminusValue(0,plusminusState.rows.A[0],0,false)"],
  ['sichern','startSichernGame()','sichernThrow(12)','undoSichernThrow()',"sichernState.open.A"],
  ['fuchsjagd','startFuchsjagdGame()','applyFuchsjagdThrow(12)','undoFuchsjagdThrow()',"fuchsjagdState.score"]
 ]){await a.run(start);assert.equal(a.db.root()[key+'State'].kranzRule.value,8,key+' frozen rule');const before=a.db.root().persons[1].strafen.nine;await a.run(play);assert.equal(a.run(score),8,key+' score');assert.equal(a.db.root().persons[1].strafen.nine,before+1,key+' penalty');await a.run(undo);assert.equal(a.db.root().persons[1].strafen.nine,before,key+' undo');}
});
test('Darts and Tannenbaum retain the thrower and Kranz penalty with fixed 8',async()=>{
 const a=await app({darts:{mode:'fixed',value:8},tannenbaum:{mode:'fixed',value:8}});
 await a.c.startDartsGame();a.c.openDartsPenaltyPlayerModal('kranz','T1',50);selectValue(a.document.getElementById('darts-penalty-player-select'),'A');await a.c.confirmDartsPenaltyPlayer();assert.equal(a.db.root().dartsState.roundThrows.T1[0].value,8);assert.equal(a.db.root().dartsState.roundThrows.T1[0].hit,'kranz');
 await a.c.startTannenbaumSetup();a.c.openTannenbaumPenaltyPlayerModal('kranz','T1',null);selectValue(a.document.getElementById('tannenbaum-penalty-player-select'),'A');await a.c.confirmTannenbaumPenaltyPlayer();const h=a.db.root().tannenbaumState.history[0];assert.equal(h.specialType,'kranz');assert.equal(h.number,8);assert.equal(h.thrower,'A');assert.equal(a.db.root().persons[1].strafen.nine,2);
});
test('Lotterie and Tiberius keep a Kranz distinct from a numerical nine',async()=>{
 const a=await app({lotterie:{mode:'fixed',value:8},tiberius:{mode:'fixed',value:8}});
 a.document.getElementById('lotterie-column-count').value='1';await a.c.prepareLotterieColumns();await a.c.startLotterieGameFinal('A');a.run("lotterieEdit={person:'A',colIndex:0}");await a.c.confirmLotterieThrow(12);assert.equal(a.db.root().lotterieState.throws.A[0],8);assert.equal(a.db.root().lotterieState.throwMeta.A[0].penaltyType,'kranz');
 a.document.getElementById('tiberius-column-count').value='1';await a.c.prepareTiberiusColumns();await a.c.startTiberiusGameFinal('A');await a.c.handleTiberiusThrow(12);assert.equal(a.db.root().tiberiusState.score,8);selectValue(a.document.getElementById('tiberius-thrower-select'),'A');await a.c.confirmTiberiusThrower();assert.equal(a.db.root().persons[1].strafen.nine,2);assert.equal(a.db.root().penaltyStatsLog.at(-1).type.toLowerCase(),'kranz');
});
test('low house number uses the chosen score and Tor keeps its one-goal clearing rule',async()=>{
 const a=await app({haustief:{mode:'fixed',value:12},tor:{mode:'fixed',value:8}});await a.c.startHausGame('tief');await a.c.hausThrow('tief',12,false,0);assert.equal(a.db.root().haustiefState.rows.A[0].kranzValue,12);
 await a.c.startTorGame();a.run('torState.coinPending=false;persistState()');await a.c.KCSharedSync.flush();const p=a.c.torThrow('kranz');for(let i=0;i<10&&!a.document.querySelector('.tor-person-backdrop');i++)await flush();const buttons=[...a.document.querySelectorAll('.tor-person-backdrop button')];assert(buttons.length);buttons[0].click();buttons.find(b=>b.textContent.includes('Buchen')).click();await p;assert.equal(a.db.root().torState.scores.T1,1);assert.equal(a.db.root().torState.history[0].kranzValue,8);assert.equal(a.db.root().torState.history[0].kind,'kranz');assert.equal(a.db.root().torState.standing.length,9);
});
test('a free Kranz correction changes the score without doubling its fine and undo refunds it',async()=>{
 const a=await app({plusminus:{mode:'choose'}});await a.c.startPlusminusGame();let p=a.c.applyPlusminusThrow(12);await answer(a,8);await p;a.c.openPlusminusSlotEdit('A',0);p=a.c.confirmPlusminusSlotEdit(12);await answer(a,9);await p;assert.equal(a.db.root().plusminusState.rows.A[0].kranzValue,9);assert.equal(a.db.root().persons[1].strafen.nine,1);await a.c.undoPlusminusThrow();assert.equal(a.db.root().persons[1].strafen.nine,0);
});
