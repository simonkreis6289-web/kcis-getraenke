const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
const scope={window:{}};vm.createContext(scope);vm.runInContext(read('js/games/sechstage-core.js'),scope);Object.assign(scope,scope.window);
const game=scope.KCSixDays,evening='2026-11-05T18:00:00Z',now='2026-11-05T20:00:00Z';let sequence=0;
const people=['A','B','C','D','E','F'].map(name=>({name,present:true,strafen:{}}));
people.push({name:'Gast',isGuest:true,present:true,strafen:{}},{name:'Trinker',isDrinksOnly:true,present:true},{name:'Inaktiv',inactive:true,present:true},{name:'Weg',left:true,present:true});
const catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},{key:'loser',label:'1. Verlierer'}];
const context={people,catalog,now,eveningStartedAt:evening,club:'Club'};
const teams=[{players:['A','B']},{players:['C','D']}];
function request(state,action,fields={}){return {action,raceId:state.id||'race_test',expectedRevision:state.revision||0,opId:'six_test_'+(++sequence),eveningStartedAt:evening,now,...fields};}
function step(state,action,fields={},settings=context){const req=request(state,action,fields),result=game.command(state,req,settings);const effect=game.effects(state,result.state,req,settings);return {state:result.state,effect,request:req};}
function started(bonus=false,pairs=teams){return step(game.empty(),'start',{teams:pairs,bonus,raceId:'race_test'}).state;}
function fullRace(bonus=false,equal=false){let s=started(bonus);while(!s.readyToFinish){s=step(s,'throw',{kind:'pins',pins:equal?1:s.teamIndex===0?9:1}).state;}return s;}
function api(initial={}){
 const data=new Map([['clubs/club/state/current',{currentEveningStartedAt:evening,persons:structuredClone(people),STRAFEN:structuredClone(catalog),penaltyStatsLog:[],...structuredClone(initial)}]]);let version=0,writes=0,fail=false;
 const c={db:{},window:{KCSixDays:game},serverTimestamp:()=> 'server',doc:(_, ...parts)=>parts.join('/'),getLivePersonId:name=>encodeURIComponent(name.trim().toLowerCase())};
 c.runTransaction=async(_,callback)=>{
  for(let retry=0;retry<8;retry++){
   if(fail)throw Error('Test: Speichern fehlgeschlagen');const observed=version,pending=[];let writing=false;
   const result=await callback({get:async key=>{assert.equal(writing,false,'all reads precede writes');return {exists:()=>data.has(key),data:()=>structuredClone(data.get(key))};},set:(key,value,opts)=>{writing=true;pending.push(()=>{data.set(key,opts?.merge?{...(data.get(key)||{}),...structuredClone(value)}:structuredClone(value));writes++;});}});
   if(observed!==version)continue;pending.forEach(f=>f());if(pending.length)version++;return result;
  }throw Error('transaction retry limit');
 };
 vm.createContext(c);const source=read('js/firebase.js');
 for(const name of ['transactSechsGame','saveClubState']){const begin=source.indexOf('  async '+name+'('),end=source.indexOf('\n  },',begin);vm.runInContext(source.slice(begin,end).replace('async '+name,'async function '+name)+'\n}',c);}
 return {c,data,root:()=>data.get('clubs/club/state/current'),writes:()=>writes,fail:value=>fail=value,person:name=>data.get('clubs/club/livePersons/'+c.getLivePersonId(name))};
}
test('two partners each throw twice; four throws keep a team together, then the next team starts with a full rack',()=>{
 let s=started();const names=[];for(let i=0;i<4;i++){names.push(game.thrower(s));s=step(s,'throw',{kind:'pins',pins:1}).state;}
 assert.deepEqual(names,['A','B','A','B']);assert.equal(s.teamIndex,1);assert.equal(game.thrower(s),'C');assert.equal(s.turn.standing,9);assert.equal(s.rounds[0].wood.R1,4);
});
test('partners may choose their own order, but neither may throw three times',()=>{
 let s=started();s=step(s,'throw',{kind:'pins',pins:1}).state;s=step(s,'select',{playerIndex:0}).state;s=step(s,'throw',{kind:'pins',pins:1}).state;
 assert.equal(game.thrower(s),'B');assert.throws(()=>step(s,'select',{playerIndex:0}),/zweimal/);s=step(s,'throw',{kind:'pins',pins:1}).state;assert.equal(game.thrower(s),'B');
});
test('clearing all pins restores nine within the same four-throw turn',()=>{
 let s=started();s=step(s,'throw',{kind:'pins',pins:9}).state;assert.equal(s.turn.standing,9);assert.equal(s.turn.wood,9);assert.equal(s.teamIndex,0);
 s=step(s,'throw',{kind:'pins',pins:4}).state;assert.equal(s.turn.standing,5);assert.throws(()=>step(s,'throw',{kind:'pins',pins:6}),/stehenden Kegel/);
});
test('kranz scores eight, leaves the king, and books the special fine rather than a normal nine',()=>{
 let s=started();const result=step(s,'throw',{kind:'kranz'});s=result.state;assert.equal(s.turn.wood,8);assert.equal(s.turn.standing,1);assert.equal(result.effect.added[0].type,'kranz');
 assert.throws(()=>step(s,'throw',{kind:'kranz'}),/volle Bild/);s=step(s,'throw',{kind:'pins',pins:1}).state;assert.equal(s.turn.wood,9);assert.equal(s.turn.standing,9);
});
test('miss and gosse both use a throw without knocking pins; only gosse books the thrower',()=>{
 let s=started();const miss=step(s,'throw',{kind:'miss'});assert.equal(miss.effect.changes.length,0);s=miss.state;
 const gutter=step(s,'throw',{kind:'gosse'});assert.equal(gutter.state.turn.standing,9);assert.equal(gutter.state.turn.wood,0);assert.equal(gutter.effect.changes[0].personName,'B');assert.equal(gutter.effect.changes.length,1);
});
test('day multipliers are 1 through 6 and a complete six-day race has exactly 48 throws for two teams',()=>{
 const s=fullRace();assert.equal(s.history.length,48);assert.equal(s.scores.R1,756);assert.equal(s.scores.R2,84);assert.equal(s.rounds[5].points.R1,216);assert(s.readyToFinish);assert(!s.finished);
 assert.throws(()=>step(s,'throw',{kind:'pins',pins:1}),/sechs Tage/);
});
test('optional daily bonus is added before multiplication and tied day winners all receive it',()=>{
 const unequal=fullRace(true);assert.equal(unequal.scores.R1,798);assert.equal(unequal.scores.R2,84);
 const equal=fullRace(true,true);assert.equal(equal.scores.R1,126);assert.equal(equal.scores.R2,126);assert.equal(equal.rounds[5].bonusWinners.length,2);
});
test('shared overall winners receive no loss penalty, while every player on a losing team gets one',()=>{
 const tie=step(fullRace(false,true),'finish');assert.equal(tie.state.winners.length,2);assert.equal(tie.effect.changes.length,0);
 const winner=step(fullRace(),'finish');assert.deepEqual(Array.from(winner.state.winners),['R1']);assert.deepEqual(Array.from(winner.effect.changes,c=>c.personName),['C','D']);assert(winner.effect.changes.every(c=>c.key==='loser'&&c.delta===1));
});
test('undo replays points and bonus correctly across a team/day boundary, restoring the actual last thrower',()=>{
 let s=started(true);for(let i=0;i<8;i++)s=step(s,'throw',{kind:'pins',pins:1}).state;
 assert.equal(s.roundIndex,1);assert.equal(s.scores.R1,6);s=step(s,'undo').state;
 assert.equal(s.roundIndex,0);assert.equal(s.teamIndex,1);assert.equal(game.thrower(s),'D');assert.equal(s.turn.used[1],1);assert(!s.rounds[0].complete);assert.equal(s.scores.R1,4);
});
test('undo reverses the originally booked special penalties, even if attendance has since changed',()=>{
 const first=step(started(),'throw',{kind:'pins',pins:9});const changed={...context,people:[]};const undone=step(first.state,'undo',{},changed);
 assert.deepEqual(plain(undone.effect.changes),plain(first.effect.changes.map(c=>({...c,delta:-1}))));assert.equal(undone.state.history.length,0);assert.equal(undone.effect.removed[0],first.effect.added[0].id);
});
test('selection excludes absent/inactive/drinks-only people, rejects duplicate partners and requires at least two pairs',()=>{
 for(const names of [[{players:['A','B']}],[{players:['A','A']},{players:['C','D']}],[{players:['A','B']},{players:['C','Trinker']}],[{players:['A','B']},{players:['C','Inaktiv']}]])assert.throws(()=>started(false,names));
 const s=started(false,[{players:['A','Gast']},{players:['C','D']}]);assert.equal(s.teams[0].players[1],'Gast');
});
test('multi-team play has one turn per team each day and 72 throws for three pairs',()=>{
 let s=started(false,[...teams,{players:['E','F']}]);while(!s.readyToFinish)s=step(s,'throw',{kind:'pins',pins:1}).state;
 assert.equal(s.history.length,72);assert.equal(s.rounds.length,6);assert(s.teams.every(t=>s.scores[t.id]===84));
});
test('the largest supported race stays comfortably below Firestore document size limits',()=>{
 const names=Array.from({length:16},(_,i)=>'Player '+i),settings={...context,people:names.map(name=>({name,present:true})),catalog};
 const pairs=Array.from({length:8},(_,i)=>({players:names.slice(i*2,i*2+2)}));let s=step(game.empty(),'start',{teams:pairs,bonus:true,raceId:'race_large'},settings).state,stats=[];
 while(!s.readyToFinish){const result=step(s,'throw',{kind:'pins',pins:9},settings);s=result.state;s.receipts=[...s.receipts,{id:result.request.opId,changes:result.effect.changes}].slice(-64);stats.push(...result.effect.added);}
 assert.equal(s.history.length,192);assert.equal(s.teams.length,8);assert(Buffer.byteLength(JSON.stringify({sechstageState:s,penaltyStatsLog:stats}))<600000);
});
test('finishing and undo are unavailable at the wrong phase, and rejected penalty metadata cannot consume a throw',()=>{
 assert.throws(()=>step(started(),'finish'),/alle sechs/);assert.throws(()=>step(started(),'undo'),/Noch kein Wurf/);
 assert.throws(()=>step(started(),'throw',{kind:'gosse'},{...context,catalog:[]}),/Strafenart/);
 const finished=step(fullRace(),'finish').state;assert.throws(()=>step(finished,'undo'),/bereits beendet/);
});
test('transaction saves points and special counters atomically, rejects impossible throws without writes, and removes exact stats on undo',async()=>{
 const store=api();let s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state;
 const before=store.writes();await assert.rejects(store.c.transactSechsGame('club',request(s,'throw',{kind:'pins',pins:10})),/stehenden Kegel/);assert.equal(store.writes(),before);
 s=(await store.c.transactSechsGame('club',request(s,'throw',{kind:'pins',pins:9}))).state;
 assert.equal(store.person('C').strafen.special,1);assert.equal(store.person('Gast').strafen.special,1);assert.equal(store.person('Trinker'),undefined);assert.equal(store.root().penaltyStatsLog.length,1);
 s=(await store.c.transactSechsGame('club',request(s,'undo'))).state;assert.equal(store.person('C').strafen.special,0);assert.equal(store.root().penaltyStatsLog.length,0);assert.equal(s.history.length,0);
});
test('a repeated or simultaneous identical throw request cannot double-book fines or points',async()=>{
 const store=api();const s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state,req=request(s,'throw',{kind:'gosse'});
 const results=await Promise.all([store.c.transactSechsGame('club',req),store.c.transactSechsGame('club',req)]);
 assert.equal(store.root().sechstageState.history.length,1);assert.equal(store.person('A').strafen.gosse,1);assert(results.some(r=>r.repeat));
 const repeat=await store.c.transactSechsGame('club',req);assert.equal(repeat.counters[0].value,1);assert.equal(repeat.gameStats.length,1);
});
test('two different stale client requests cannot both advance the game',async()=>{
 const store=api();const s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state;
 const results=await Promise.allSettled([store.c.transactSechsGame('club',request(s,'throw',{kind:'pins',pins:1})),store.c.transactSechsGame('club',request(s,'throw',{kind:'pins',pins:2}))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.root().sechstageState.history.length,1);
});
test('failed persistence leaves both game and counters unchanged, while a reload retains the next partner',async()=>{
 const store=api();let s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state;
 const req=request(s,'throw',{kind:'gosse'});store.fail(true);await assert.rejects(store.c.transactSechsGame('club',req));assert.equal(store.root().sechstageState.history.length,0);assert.equal(store.person('A'),undefined);
 store.fail(false);s=(await store.c.transactSechsGame('club',req)).state;assert.equal(game.thrower(plain(s)),'B');assert.equal(store.person('A').strafen.gosse,1);
});
test('manual counter changes below the original delta prevent an unsafe undo without changing points',async()=>{
 const store=api();let s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state;
 s=(await store.c.transactSechsGame('club',request(s,'throw',{kind:'gosse'}))).state;store.data.get('clubs/club/livePersons/a').strafen.gosse=0;
 await assert.rejects(store.c.transactSechsGame('club',request(s,'undo')),/Strafzähler/);assert.equal(store.root().sechstageState.history.length,1);
});
test('closure books all losing partners exactly once and a repeated finish cannot increase their counters',async()=>{
 const played=fullRace(),store=api({sechstageState:plain(played)}),req=request(played,'finish');
 await store.c.transactSechsGame('club',req);await store.c.transactSechsGame('club',req);
 assert.equal(store.person('C').strafen.loser,1);assert.equal(store.person('D').strafen.loser,1);assert(store.root().sechstageState.finished);
});
test('a stale generic upload cannot revert the race or restore undone game stats',async()=>{
 const store=api();let s=(await store.c.transactSechsGame('club',request(game.empty(),'start',{raceId:'race_api',teams}))).state;const stale=plain(s);
 s=(await store.c.transactSechsGame('club',request(s,'throw',{kind:'gosse'}))).state;const oldStats=plain(store.root().penaltyStatsLog);
 s=(await store.c.transactSechsGame('club',request(s,'undo'))).state;
 await store.c.saveClubState('club',{currentEveningStartedAt:evening,sechstageState:stale,penaltyStatsLog:oldStats});
 assert.equal(store.root().sechstageState.revision,s.revision);assert.equal(store.root().penaltyStatsLog.length,0);
});
test('switching Kegelabend rejects old commands, and the first race can establish a missing evening identity',async()=>{
 const store=api();await assert.rejects(store.c.transactSechsGame('club',{...request(game.empty(),'start',{raceId:'race_api',teams}),eveningStartedAt:'old-evening'}),/Kegelabend/);
 const empty=api({currentEveningStartedAt:null});const result=await empty.c.transactSechsGame('club',{...request(game.empty(),'start',{raceId:'race_new',teams}),eveningStartedAt:''});
 assert.equal(Date.parse(result.eveningStartedAt),Date.parse(now));assert.equal(Date.parse(empty.root().currentEveningStartedAt),Date.parse(now));
});
test('an unconfirmed initial start can be retried even after the server establishes the evening identity',async()=>{
 const store=api({currentEveningStartedAt:null}),req={...request(game.empty(),'start',{raceId:'race_new',teams}),eveningStartedAt:''};
 const first=await store.c.transactSechsGame('club',req);const again=await store.c.transactSechsGame('club',req);assert(again.repeat);assert.equal(first.state.id,again.state.id);assert.equal(again.state.revision,1);
 await store.c.saveClubState('club',{currentEveningStartedAt:null,sechstageState:game.empty(),penaltyStatsLog:[]});assert.equal(store.root().sechstageState.id,'race_new');assert.equal(store.root().currentEveningStartedAt,first.eveningStartedAt);
});
test('rules are directly available through an accessible top-right button and include every implemented core rule',()=>{
 const html=read('getraenke-abrechnung.html');assert.match(html,/class="six-info-button"[^>]*onclick="openSechsRules\(\)"[^>]*aria-label=/);
 for(const id of ['sechs-rules-modal','sechs-rules-title','sechs-rules-close','tab-sechstage'])assert(html.includes('id="'+id+'"'));
 for(const phrase of ['Jeder Partner wirft zweimal','×6','Tagessiegerbonus','acht Holz','1. Verlierer +1','Bei Gleichstand'])assert(html.includes(phrase),phrase);
});
test('shared app/dashboard board renders race totals and escapes member names',()=>{
 const s=started(false,[{players:['A','Gast']},{players:['C','D']}]);s.teams[0].players[0]='<script>bad</script>';const html=scope.renderSixDaysBoard(s);
 assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('Tag 1 von 6'));assert(html.includes('six-score-table'));
});
test('club cache and real club selection preserve the race, evening identity and special-throw history',async()=>{
 const source=read('js/clubs.js'),begin=source.indexOf('function syncCurrentClubToStore()'),end=source.indexOf('\nfunction saveClubSystem',begin),body=source.slice(begin,end);
 const selectedStart=source.indexOf('async function selectClub('),selectedEnd=source.indexOf('\nfunction updateAppHeader',selectedStart),selection=source.slice(selectedStart,selectedEnd);
 const builtins=new Set(['JSON','Number','String','Math','Object','Array','Date','undefined','parseFloat','parseInt','isNaN','isFinite']);
 const c=Object.fromEntries([...((body+selection).matchAll(/\b[a-zA-Z_]\w*\b/g))].filter(m=>!builtins.has(m[0])).map(m=>[m[0],null]));
 Object.assign(c,{ACTIVE_CLUB:'Club',CLUBS:{Club:{avatar:''}},persons:[{name:'A',strafen:{}}],cashBookSettings:null,currentEveningStartedAt:evening,penaltyStatsLog:[{id:'stat',sixDaysRaceId:'race_test'}],sechstageState:plain(started()),calcPersonStrafenTotalCapped:()=>0,console,window:{firestoreApi:{}},document:{getElementById:()=>({style:{},classList:{add(){},remove(){}}})}});
 for(const name of ['createEmptyClubData','createTannenbaumState','createLotterieState','createTiberiusState','createDartsState','createBlackjackState','createGluecksspiraleState'])c[name]=()=>({});
 for(const name of ['ensureTannenbaumState','ensureLotterieState','ensureTiberiusState','ensureDartsState','hydrateState','renderAll','updateAppHeader'])c[name]=()=>{};
 c.getClubFirestoreId=()=> 'club';c.loadFromFirestore=async()=>false;c.saveToFirestore=async()=>true;c.startLivePersonSync=async()=>{};
 vm.createContext(c);vm.runInContext(body+'\n'+selection,c);c.syncCurrentClubToStore();
 assert.equal(c.CLUBS.Club.currentEveningStartedAt,evening);assert.equal(c.CLUBS.Club.sechstageState.id,'race_test');assert.equal(c.CLUBS.Club.penaltyStatsLog.length,1);
 c.currentEveningStartedAt=null;c.sechstageState=null;c.penaltyStatsLog=[];await c.selectClub('Club');
 assert.equal(c.currentEveningStartedAt,evening);assert.equal(c.sechstageState.id,'race_test');assert.equal(c.penaltyStatsLog[0].id,'stat');
});
