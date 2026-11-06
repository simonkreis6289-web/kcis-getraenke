const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const sources=Object.fromEntries(["js/game-rules.js","js/games/table-games-core.js","js/games/table-games-ui.js","js/games/sechstage-core.js","js/firebase.js","js/app.js","js/clubs.js","js/persons.js","js/strafe-pdf.js","getraenke-abrechnung.html","dashboard.html"].map(p=>[p,fs.readFileSync(path.join(root,p),'utf8')]));
async function runV179Tests(sources){
 const results=[],tests=[];
 const ok=(value,message='Assertion failed')=>{if(!value)throw Error(message);};
 const eq=(actual,expected)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Expected '+JSON.stringify(expected)+'; received '+JSON.stringify(actual));};
 const throws=(fn,pattern)=>{let error;try{fn();}catch(e){error=e;}ok(error,'Expected rejection');if(pattern)ok(pattern.test(error.message),error.message);};
 const rejects=async(fn,pattern)=>{let error;try{await fn();}catch(e){error=e;}ok(error,'Expected rejection');if(pattern)ok(pattern.test(error.message),error.message);};
 const test=(name,fn)=>tests.push({name,fn});
 const window={};const exported=new Function('window',sources['js/games/table-games-core.js']+';const KCTableGames=window.KCTableGames;return {renderTableGameBoard,tableEscape};')(window);
 const game=window.KCTableGames,evening='2026-11-06T18:00:00Z',now='2026-11-06T20:00:00Z';
 const people=['A','B','C','D','E','F'].map(name=>({name,present:true,strafen:{}}));
 people.push({name:'Gast',present:true,isGuest:true},{name:'Trinker',present:true,isDrinksOnly:true},{name:'Weg',present:true,left:true},{name:'Inaktiv',present:true,inactive:true});
 const catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},...Array.from({length:3},(_,i)=>({key:'loser'+(i+1),label:(i+1)+'. Verlierer'}))];
 const ctx={people,catalog,now,eveningStartedAt:evening,club:'Club'};
 let sequence=0;
 const req=(s,action,fields={})=>({gameKey:s.gameKey,gameId:s.id||'game_test',expectedRevision:s.revision||0,opId:'table_test_'+(++sequence),now,eveningStartedAt:evening,...fields,action});
 const step=(s,action,fields={},context=ctx)=>{const request=req(s,action,fields),r=game.command(s,request,context),effect=game.effects(s,r.state,request,context);return {state:r.state,effect,request};};
 const start=(key,fields={})=>step(game.empty(key),'start',{players:['A','B'],teams:[{players:['A','B']},{players:['C','D']}],target:50,cards:false,...fields}).state;
 const roll=(s,pins=1,kind='pins')=>step(s,'throw',{pins,kind}).state;
 const stand=s=>step(s,'stand').state;
 const spiral=()=>start('gluecksspirale');
 const twentyOne=(s,pins)=>{for(const n of pins)s=roll(s,n);return s;};
 const reveal=(s,cards=s.players.map(()=>2))=>{for(const value of cards)s=step(s,'card',{value}).state;return s;};
 const soloTotals=values=>{
   let s=start('blackjack',{players:values.map((_,i)=>String.fromCharCode(65+i))});
   for(const value of values){let wood=value-2;while(wood>0){const pins=Math.min(9,wood);s=roll(s,pins);wood-=pins;}s=stand(s);}
   return reveal(s);
 };

 function api(initial={}){
   const data=new Map([['clubs/club/state/current',{currentEveningStartedAt:evening,persons:JSON.parse(JSON.stringify(people)),STRAFEN:catalog,penaltyStatsLog:[],...JSON.parse(JSON.stringify(initial))}]]);
   let version=0,writeCount=0,fail=false;
   const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
   const transaction=async(_,callback)=>{
    for(let retry=0;retry<12;retry++){
     if(fail)throw Error('Network failed');const observed=version,pending=[];let writing=false;
     const result=await callback({get:async key=>{ok(!writing,'Firestore reads must precede all writes');return {exists:()=>data.has(key),data:()=>clone(data.get(key))};},set:(key,value,opts)=>{writing=true;pending.push(()=>{data.set(key,opts?.merge?{...(data.get(key)||{}),...clone(value)}:clone(value));writeCount++;});}});
     if(observed!==version)continue;
     pending.forEach(f=>f());if(pending.length)version++;return result;
    }throw Error('Transaction retry limit');
   };
   const env={db:{},window:{KCTableGames:game},doc:(_, ...parts)=>parts.join('/'),runTransaction:transaction,serverTimestamp:()=> 'server'};
   const object={getLivePersonId:name=>encodeURIComponent(name.trim().toLowerCase())};
   for(const name of ['transactTableGame','saveClubState']){
    const src=sources['js/firebase.js'],i=src.indexOf('  async '+name+'('),end=src.indexOf('\n  },',i),method=src.slice(i,end+4);
    ok(i>=0&&end>i,'API method missing');
    object[name]=new Function('env','with(env){return ({'+method+'}).'+name+';}')(env);
   }
   return {api:object,data,root:()=>data.get('clubs/club/state/current'),person:name=>data.get('clubs/club/livePersons/'+object.getLivePersonId(name)),writes:()=>writeCount,fail:value=>fail=value};
 }
 test('17+4 starts with hidden cards and the selected order',()=>{const s=start('blackjack');eq(s.players,['A','B']);eq(game.currentName(s),'A');eq(s.cards,true);eq(game.blackjackPhase(s),'throwing');});
 test('an ace adapts from 11 to 1 when revealed after the throws',()=>{eq(game.cardTotal(9,'A'),20);eq(game.cardTotal(11,'A'),12);eq(game.cardTotal(20,'A'),21);});
 test('throwing and stopping precede every card reveal',()=>{let s=start('blackjack');throws(()=>step(s,'card',{value:7}),/Zuerst/);s=roll(s,3);s=stand(s);throws(()=>step(s,'card',{value:7}),/Zuerst/);eq(game.currentName(s),'B');});
 test('all allowed Skat values are recorded after everyone stops',()=>{for(const value of ['A','J','Q','K',2,3,4,7,8,9,10])eq(step(stand(stand(start('blackjack'))),'card',{value}).state.cardValues.A,value);for(const value of [0,1,5,6,11,12,'invalid'])throws(()=>step(stand(stand(start('blackjack'))),'card',{value}),/Kartenwert/);});
 test('undo of a revealed card permits correcting the same person',()=>{let s=step(stand(stand(start('blackjack'))),'card',{value:7}).state;eq(game.currentName(s),'B');s=step(s,'undo').state;ok(!Object.hasOwn(s.cardValues,'A'));eq(game.currentName(s),'A');s=step(s,'card',{value:8}).state;eq(s.cardValues.A,8);});
 test('17+4 permits any number of throws until stand',()=>{let s=start('blackjack');for(let i=0;i<10;i++)s=roll(s,1);eq(game.currentName(s),'A');eq(s.scores.A,10);s=stand(s);eq(game.currentName(s),'B');});
 test('21 wood does not stop a player automatically',()=>{const s=twentyOne(start('blackjack'),[9,9,3]);eq(s.scores.A,21);eq(game.currentName(s),'A');eq(s.stopped,[]);});
 test('more than 21 wood still waits for explicit Stopp',()=>{let s=twentyOne(start('blackjack'),[9,9,4]);eq(s.scores.A,22);eq(game.currentName(s),'A');s=roll(s,1);eq(s.wood.A,23);});
 test('cards are added after the completed throwing phase',()=>{let s=roll(start('blackjack'),9);s=stand(s);s=roll(s,1);s=stand(s);s=step(s,'card',{value:'A'}).state;eq(s.scores.A,20);eq(game.currentName(s),'B');});
 test('everyone must stop and every card must be revealed before finish',()=>{let s=start('blackjack');throws(()=>step(s,'finish'),/Zuerst/);s=stand(stand(s));ok(!s.readyToFinish);eq(game.blackjackPhase(s),'cards');throws(()=>roll(s,1),/gestoppt/);s=reveal(s);ok(s.readyToFinish);throws(()=>roll(s,1),/beendet/);});
 test('highest final score under 22 wins and supports shared winners',()=>{const out=step(soloTotals([20,20,11]),'finish');eq(out.state.winners,['A','B']);eq(out.effect.changes,[{personName:'C',key:'loser1',delta:1}]);});
 test('all busts get extra fines; final overthrows rank worst score first',()=>{const s=soloTotals([24,29]),out=step(s,'finish');eq(out.state.winners,[]);eq(s.history.filter(e=>e.bustPenalty).map(e=>e.name),['A','B']);eq(out.effect.changes.map(x=>[x.personName,x.key]),[['B','loser1'],['A','loser2']]);});
 test('blackjack placement ranks remain dense and worst-first',()=>{const out=step(soloTotals([21,24,7,7,10]),'finish');eq(out.effect.changes.map(x=>[x.personName,x.key]),[['B','loser1'],['C','loser2'],['D','loser2'],['E','loser3']]);});
 test('missing placement catalog entries reject the entire finish',()=>{const s=soloTotals([5,7]);throws(()=>step(s,'finish',{}, {...ctx,catalog:[]}),/Verlierer/);});
 test('undo of a 21-wood throw keeps the same player and restores 18',()=>{let s=twentyOne(start('blackjack'),[9,9,3]);s=step(s,'undo').state;eq(game.currentName(s),'A');eq(s.scores.A,18);eq(s.stopped,[]);});
 test('undo stand returns to the previous player',()=>{let s=roll(start('blackjack'),7);s=stand(s);s=step(s,'undo').state;eq(game.currentName(s),'A');eq(s.scores.A,7);});
 test('spiral defaults to 50 and has two partners per team',()=>{const s=spiral();eq(s.target,50);eq(game.currentName(s),'A');eq(s.teams.length,2);});
 test('spiral alternates partners within every pair of throws',()=>{let s=spiral();s=roll(s,6);eq(game.currentName(s),'B');s=roll(s,7);eq(game.currentName(s),'A');eq(s.currentIndex,0);eq(s.scores.G1,13);});
 test('exactly 13 grants another pair, while 12 ends the series',()=>{let s=roll(roll(spiral(),6),7);eq(s.currentIndex,0);s=roll(roll(s,6),6);eq(s.currentIndex,1);eq(s.scores.G1,25);});
 test('bonus pairs can chain repeatedly with no fixed round cap',()=>{let s=spiral();for(let i=0;i<10;i++)s=roll(roll(s,7),6);eq(s.currentIndex,0);eq(s.scores.G1,130);eq(s.round,1);eq(s.finalRound,1);ok(!s.readyToFinish);});
 test('every throw is in the full rack, so 9 after 9 is valid',()=>{let s=roll(roll(spiral(),9),9);eq(s.scores.G1,18);eq(s.turn.pins,[]);});
 test('crossing the target does not cut the current pair short',()=>{let s=start('gluecksspirale',{target:10});s=roll(roll(s,7),6);eq(s.finalRound,1);s=roll(s,1);ok(!s.readyToFinish);eq(game.currentName(s),'B');});
 test('all teams complete the final round; a later team may overtake the first',()=>{let s=start('gluecksspirale',{target:10});s=roll(roll(s,6),4);eq(s.currentIndex,1);s=roll(roll(s,7),7);eq(s.currentIndex,1);s=roll(roll(s,1),1);ok(s.readyToFinish);const out=step(s,'finish');eq(out.state.winners,['G2']);eq(out.effect.changes.map(x=>x.personName),['A','B']);});
 test('shared winning teams incur no loser fine',()=>{let s=start('gluecksspirale',{target:10});for(const pins of [6,4,6,4])s=roll(s,pins);const out=step(s,'finish');eq(out.state.winners,['G1','G2']);eq(out.effect.changes.length,0);});
 test('normal round advances only after all teams have had a turn',()=>{let s=spiral();for(const pins of [1,1,2,2])s=roll(s,pins);eq(s.round,2);eq(s.currentIndex,0);eq(s.rounds[0].wood,{G1:2,G2:4});});
 test('undo crosses a normal round boundary correctly',()=>{let s=spiral();for(let i=0;i<4;i++)s=roll(s,1);s=step(s,'undo').state;eq(s.round,1);eq(s.currentIndex,1);eq(game.currentName(s),'D');eq(s.turn.pins,[1]);eq(s.rounds.length,1);});
 test('undo can remove the final-round trigger',()=>{let s=start('gluecksspirale',{target:10});s=roll(roll(s,6),4);eq(s.finalRound,1);s=step(s,'undo').state;eq(s.finalRound,0);eq(s.scores.G1,6);});
 test('undo after final opponent restores the active turn',()=>{let s=start('gluecksspirale',{target:10});for(const pins of [6,4,6,4])s=roll(s,pins);s=step(s,'undo').state;ok(!s.readyToFinish);eq(game.currentName(s),'D');eq(s.scores.G2,6);});
 test('target values outside 10–1000 and multiple single teams are rejected',()=>{for(const target of [0,9,1001,50.5,NaN])throws(()=>start('gluecksspirale',{target}));ok(start('gluecksspirale',{teams:[{players:['A','B']},{players:['C']}]}).active);throws(()=>start('gluecksspirale',{teams:[{players:['A']},{players:['B']},{players:['C','D']}]}));});
 test('Kranz is eight wood in both games and records the correct statistic',()=>{for(const key of ['blackjack','gluecksspirale']){const out=step(start(key),'throw',{kind:'kranz'});eq(out.effect.added[0].type,'kranz');eq(out.effect.added[0].thrower,'A');eq(out.state.gameKey==='blackjack'?out.state.wood.A:out.state.scores.G1,8);}});
 test('Gosse books the thrower, while Vorbei only uses a throw',()=>{for(const key of ['blackjack','gluecksspirale']){const s=start(key);eq(step(s,'throw',{kind:'miss'}).effect.changes,[]);eq(step(s,'throw',{kind:'gosse'}).effect.changes,[{personName:'A',key:'gosse',delta:1}]);}});
 test('nine and Kranz punish only eligible other people, including guests',()=>{const out=step(spiral(),'throw',{kind:'pins',pins:9});eq(out.effect.changes.map(x=>x.personName),['B','C','D','E','F','Gast']);});
 test('undo reverses exactly the historical people and keys after attendance changes',()=>{const out=step(spiral(),'throw',{kind:'pins',pins:9});const undo=step(out.state,'undo',{}, {...ctx,people:[{name:'A',present:true}],catalog:[]});eq(undo.effect.changes,out.effect.changes.map(x=>({...x,delta:-1})));eq(undo.effect.removed,[out.effect.added[0].id]);});
 test('duplicate operation IDs are idempotent',()=>{const s=spiral(),out=step(s,'throw',{kind:'gosse'}),retry=game.command(out.state,out.request,ctx);ok(retry.repeat);eq(retry.state.history.length,1);});
 test('outdated revisions reject conflicting concurrent actions',()=>{const s=spiral(),request=req(s,'throw',{kind:'pins',pins:1}),after=roll(s,2);throws(()=>game.command(after,request,ctx),/inzwischen/);});
 test('wrong game identifiers and invalid operations are rejected',()=>{const s=spiral();throws(()=>step(s,'throw',{gameId:'game_other',kind:'pins',pins:1}),/gewechselt/);throws(()=>step(s,'throw',{opId:'invalid',kind:'pins',pins:1}),/Spielaktion/);throws(()=>step(s,'stand'),/Ungültig/);});
 test('ineligible participants, duplicates, malformed and oversized groups are rejected',()=>{for(const name of ['Trinker','Weg','Inaktiv'])throws(()=>start('blackjack',{players:['A',name]}),/aktiv/);throws(()=>start('blackjack',{players:['A',' a ']}));throws(()=>start('blackjack',{players:['A']}));throws(()=>start('blackjack',{players:Array.from({length:17},(_,i)=>'P'+i)}));});
 test('a guest is a valid participant and a player who left cannot throw',()=>{ok(start('blackjack',{players:['A','Gast']}).active);throws(()=>step(start('blackjack'),'throw',{kind:'pins',pins:1},{...ctx,people:people.map(p=>p.name==='A'?{...p,left:true}:p)}),/nicht mehr aktiv/);});
 test('finished games cannot be charged again with a different operation',()=>{let s=reveal(stand(stand(start('blackjack'))));s=step(s,'finish').state;throws(()=>step(s,'finish'),/beendet/);throws(()=>step(s,'undo'),/beendet/);});
 test('reset preserves monotonic revisions and starts a fresh game',()=>{let s=roll(spiral(),1);const previous=s.revision;s=step(s,'reset').state;eq(s.id,'');eq(s.revision,previous+1);eq(s.history,[]);s=step(s,'start',{gameId:'game_next',teams:[{players:['A','B']},{players:['C','D']}],target:50}).state;eq(s.id,'game_next');eq(s.revision,previous+2);});
 test('dashboard hides unrevealed cards and totals during throwing',()=>{const s=roll(start('blackjack'),7),html=exported.renderTableGameBoard(s);ok(html.includes('🂠'));ok(html.includes('🔒'));ok(!html.includes('<td>7</td><td>7'));});
 test('dashboard displays each card and total as it is revealed',()=>{let s=stand(stand(start('blackjack')));s=step(s,'card',{value:7}).state;let html=exported.renderTableGameBoard(s);ok(html.includes('<td>7</td>'));ok(html.includes('🔒'));s=step(s,'card',{value:8}).state;html=exported.renderTableGameBoard(s);ok(!html.includes('🔒'));ok(html.includes('<td>8</td>'));});
 test('names in game and team display are HTML escaped',()=>{const s=spiral();s.teams[0].players[0]='<img src=x onerror=evil()>';const html=exported.renderTableGameBoard(s);ok(!html.includes('<img'));ok(html.includes('&lt;img'));eq(exported.tableEscape('"&<>'), '&quot;&amp;&lt;&gt;');});
 test('transaction writes the game, special fine and statistics atomically',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});const out=await store.api.transactTableGame('club',req(s,'throw',{kind:'gosse'}));eq(store.person('A').strafen.gosse,1);eq(store.root().gluecksspiraleState.history.length,1);eq(out.gameStats.length,1);eq(store.root().dashboardActiveGame,'gluecksspirale');});
 test('retry after lost response returns canonical counters without double charging',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});const request=req(s,'throw',{kind:'gosse'});await store.api.transactTableGame('club',request);const count=store.writes(),out=await store.api.transactTableGame('club',request);ok(out.repeat);eq(store.writes(),count);eq(store.person('A').strafen.gosse,1);eq(out.counters[0].value,1);});
 test('failed transactions leave both game and fine unchanged',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});store.fail(true);await rejects(()=>store.api.transactTableGame('club',req(s,'throw',{kind:'gosse'})),/Network/);eq(store.root().gluecksspiraleState.history.length,0);eq(store.writes(),0);});
 test('concurrent duplicate actions charge once',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});const request=req(s,'throw',{kind:'gosse'});const out=await Promise.all([store.api.transactTableGame('club',request),store.api.transactTableGame('club',request)]);eq(store.person('A').strafen.gosse,1);eq(out.filter(r=>r.repeat).length,1);});
 test('concurrent conflicting actions save one result and reject the stale action',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});const out=await Promise.allSettled([store.api.transactTableGame('club',req(s,'throw',{kind:'gosse'})),store.api.transactTableGame('club',req(s,'throw',{kind:'pins',pins:2}))]);eq(out.filter(r=>r.status==='fulfilled').length,1);eq(store.root().gluecksspiraleState.history.length,1);});
 test('undo persists the reverse counters and removes only its own statistic',async()=>{const store=api({penaltyStatsLog:[{id:'other',type:'gosse'}]}),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});let out=await store.api.transactTableGame('club',req(s,'throw',{kind:'gosse'}));out=await store.api.transactTableGame('club',req(out.state,'undo'));eq(store.person('A').strafen.gosse,0);eq(out.gameStats,[]);eq(store.root().penaltyStatsLog.map(x=>x.id),['other']);});
 test('negative undo counters roll back the game as well',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s});const out=await store.api.transactTableGame('club',req(s,'throw',{kind:'gosse'}));store.data.set('clubs/club/livePersons/a',{name:'A',strafen:{gosse:0}});await rejects(()=>store.api.transactTableGame('club',req(out.state,'undo')),/Strafzähler/);eq(store.root().gluecksspiraleState.history.length,1);});
 test('stale general uploads cannot erase either new game or their statistics',async()=>{const store=api(),s=spiral();store.data.set('clubs/club/state/current',{...store.root(),gluecksspiraleState:s,blackjackState:start('blackjack'),sechstageState:{revision:4,eveningStartedAt:evening},penaltyStatsLog:[{id:'six',sixDaysRaceId:'race_x'},{id:'table',tableGameId:'game_test'}]});await store.api.saveClubState('club',{currentEveningStartedAt:evening,gluecksspiraleState:game.empty('gluecksspirale'),blackjackState:game.empty('blackjack'),sechstageState:{},penaltyStatsLog:[]});eq(store.root().gluecksspiraleState.id,s.id);eq(store.root().blackjackState.id,'game_test');eq(store.root().sechstageState.revision,4);eq(store.root().penaltyStatsLog.length,2);});
 test('a genuinely newer evening can clear games and statistics',async()=>{const store=api({gluecksspiraleState:spiral(),penaltyStatsLog:[{id:'old',tableGameId:'x'}]});await store.api.saveClubState('club',{currentEveningStartedAt:'2026-11-07T20:00:00Z',gluecksspiraleState:game.empty('gluecksspirale'),penaltyStatsLog:[]});eq(store.root().gluecksspiraleState.id,'');eq(store.root().penaltyStatsLog,[]);});
 test('old evening actions cannot change the current evening',async()=>{const store=api({currentEveningStartedAt:'2026-11-07T20:00:00Z',gluecksspiraleState:spiral()});await rejects(()=>store.api.transactTableGame('club',req(spiral(),'throw',{kind:'pins',pins:1})),/Kegelabend/);eq(store.writes(),0);});
 test('the first start establishes an evening and safely accepts the same retry',async()=>{const store=api({currentEveningStartedAt:null}),s=game.empty('blackjack'),request=req(s,'start',{players:['A','B'],cards:false,eveningStartedAt:''});const a=await store.api.transactTableGame('club',request),b=await store.api.transactTableGame('club',request);ok(a.eveningStartedAt);ok(b.repeat);eq(b.state.revision,1);});
 test('blackjack and spiral updates do not overwrite one another',async()=>{const store=api({blackjackState:start('blackjack'),gluecksspiraleState:spiral()});await Promise.all([store.api.transactTableGame('club',req(store.root().blackjackState,'throw',{kind:'gosse'})),store.api.transactTableGame('club',req(store.root().gluecksspiraleState,'throw',{kind:'gosse'}))]);eq(store.root().blackjackState.history.length,1);eq(store.root().gluecksspiraleState.history.length,1);eq(store.person('A').strafen.gosse,2);eq(store.root().penaltyStatsLog.length,2);});
 test('transactional finish is idempotent and reset does not refund prior fines',async()=>{let s=start('gluecksspirale',{target:10});for(const n of [6,4,1,1])s=roll(s,n);const store=api({gluecksspiraleState:s}),request=req(s,'finish');const out=await store.api.transactTableGame('club',request);await store.api.transactTableGame('club',request);eq(store.person('C').strafen.loser1,1);eq(store.person('D').strafen.loser1,1);await store.api.transactTableGame('club',req(out.state,'reset'));eq(store.person('C').strafen.loser1,1);eq(store.root().gluecksspiraleState.id,'');});
 test('missing fine catalog rejects an entire transaction without partial writes',async()=>{const store=api({STRAFEN:[],gluecksspiraleState:spiral()});await rejects(()=>store.api.transactTableGame('club',req(spiral(),'throw',{kind:'gosse'})),/Strafenart/);eq(store.writes(),0);});
 test('both HTML pages load the shared engine before using it',()=>{for(const page of ['getraenke-abrechnung.html','dashboard.html']){const html=sources[page];ok(html.includes('js/games/table-games-core.js'));ok(html.includes('css/table-games.css'));if(page==='getraenke-abrechnung.html')ok(html.indexOf('js/games/table-games-core.js')<html.indexOf('js/games/table-games-ui.js'));}});
 test('only spiral has the requested new rules popup',()=>{const html=sources['getraenke-abrechnung.html'];ok(html.includes('id="spiral-rules-modal"'));ok(html.includes('aria-label="Spielregeln für Glücksspirale"'));ok(!html.includes('blackjack-rules'));for(const phrase of ['13 Holz','50 Holz','Zusatzwürfe','gleich oft','1. Verlierer +1'])ok(sources['js/game-rules.js'].includes(phrase),phrase);});
 test('dashboard and navigation register both games',()=>{for(const key of ['blackjack','gluecksspirale']){ok(sources['dashboard.html'].includes('value="'+key+'"'));ok(sources['js/app.js'].includes("'"+key+"'"));ok(sources['getraenke-abrechnung.html'].includes('id="tab-'+key+'"'));ok(sources['js/clubs.js'].includes(key+'State: JSON.parse'));}});
 test('both states are included in local and cloud snapshots and evening reset',()=>{const a=sources['js/app.js'];for(const key of ['blackjack','gluecksspirale']){eq((a.match(new RegExp('    '+key+'State,','g'))||[]).length,2);ok(a.includes(key+'State = create'));}ok(sources['js/clubs.js'].includes('applyTableServerStates(state)'));});
 test('all HTML IDs are unique and no new rule modal is inside a hidden game page',()=>{const html=sources['getraenke-abrechnung.html'],ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);eq(ids.length,new Set(ids).size);ok(html.indexOf('id="spiral-rules-modal"')>html.indexOf('id="tab-sechstage"'));});

 test('the existing six-day transaction still works and preserves both kinds of statistics',async()=>{
   const sixWindow={};new Function('window',sources['js/games/sechstage-core.js'])(sixWindow);
   const six=sixWindow.KCSixDays;
   const startReq={action:'start',raceId:'race_regression',opId:'six_reg_start',expectedRevision:0,teams:[{players:['A','B']},{players:['C','D']}],now,eveningStartedAt:evening};
   let s=six.command(six.empty(),startReq,ctx).state;
   const store=api({sechstageState:s,penaltyStatsLog:[{id:'table_existing',tableGameId:'game_other'}]});
   // The real method shares exactly the same transactional storage helper as the new games.
   const source=sources['js/firebase.js'],i=source.indexOf('  async transactSechsGame('),end=source.indexOf('\n  },',i);
   let version=0;
   const env={db:{},window:{KCSixDays:six},serverTimestamp:()=> 'server',doc:(_, ...p)=>p.join('/'),runTransaction:async(_,fn)=>{
    const pending=[];let writing=false;const result=await fn({get:async key=>{ok(!writing);return {exists:()=>store.data.has(key),data:()=>JSON.parse(JSON.stringify(store.data.get(key)))};},set:(key,value,opts)=>{writing=true;pending.push(()=>store.data.set(key,opts?.merge?{...(store.data.get(key)||{}),...value}:value));}});pending.forEach(f=>f());version++;return result;
   }};
   store.api.transactSechsGame=new Function('env','with(env){return ({'+source.slice(i,end+4)+'}).transactSechsGame;}')(env);
   const request={action:'throw',raceId:s.id,opId:'six_reg_throw',expectedRevision:s.revision,kind:'gosse',now,eveningStartedAt:evening};
   const out=await store.api.transactSechsGame('club',request);
   eq(store.person('A').strafen.gosse,1);eq(out.gameStats.length,1);ok(store.root().penaltyStatsLog.some(e=>e.id==='table_existing'));
   await store.api.saveClubState('club',{currentEveningStartedAt:evening,sechstageState:s,penaltyStatsLog:[]});
   eq(store.root().sechstageState.history.length,1);eq(store.root().penaltyStatsLog.length,2);
 });
 test('calendar revisions and edited dates survive a game-state upload',async()=>{
   const calendar={calendarRevision:8,clubTermine:[{id:'event1',type:'kegeln',date:'2026-12-05',time:'19:00',seriesSlot:'slot1'}],clubKegelSerie:{id:'series'}};
   const store=api({...calendar,clubCalendarData:calendar,blackjackState:start('blackjack')});
   const saved=await store.api.saveClubState('club',{currentEveningStartedAt:evening,blackjackState:game.empty('blackjack'),clubTermine:[{id:'event1',type:'kegeln',date:'2026-12-04',time:'20:00'}],calendarRevision:2});
   eq(saved.clubTermine[0].date,'2026-12-05');eq(store.root().calendarRevision,8);eq(store.root().blackjackState.id,'game_test');
 });
 test('new games accept all sixteen players and eight teams with a bounded saved state',()=>{
   const all=Array.from({length:16},(_,i)=>({name:'P'+i,present:true})),pairs=Array.from({length:8},(_,i)=>({players:[all[2*i].name,all[2*i+1].name]}));
   let s=step(game.empty('gluecksspirale'),'start',{teams:pairs,target:10},{...ctx,people:all}).state;
   for(let i=0;i<16;i++)s=step(s,'throw',{kind:'pins',pins:i<2?5:1},{...ctx,people:all}).state;
   ok(s.readyToFinish);eq(s.teams.length,8);ok(JSON.stringify(s).length<30000);
   let solo=step(game.empty('blackjack'),'start',{players:all.map(p=>p.name)},{...ctx,people:all}).state;
   for(let i=0;i<16;i++)solo=step(solo,'stand',{}, {...ctx,people:all}).state;ok(!solo.readyToFinish);for(let i=0;i<16;i++)solo=step(solo,'card',{value:2},{...ctx,people:all}).state;ok(solo.readyToFinish);
 });
 test('special property names are safe when cards are revealed at the end',()=>{
   const names=['__proto__','constructor'],people=names.map(name=>({name,present:true})),context={...ctx,people};
   let s=step(game.empty('blackjack'),'start',{players:names},context).state;
   for(const pins of [9,9,2])s=step(s,'throw',{kind:'pins',pins},context).state;
   s=step(s,'stand',{},context).state;s=step(s,'stand',{},context).state;s=step(s,'card',{value:'A'},context).state;
   eq(s.cardValues.__proto__,'A');eq(s.scores.__proto__,21);eq(game.currentName(s),'constructor');
 });
 test('malformed throws cannot change either game',()=>{
   for(const key of ['blackjack','gluecksspirale'])for(const pins of [-1,0,10,12,NaN,Infinity,1.5])throws(()=>step(start(key),'throw',{kind:'pins',pins}));
 });
 test('the actual club cache and selection restore both games and the evening identity',async()=>{
   const source=sources['js/clubs.js'],i=source.indexOf('function syncCurrentClubToStore()'),end=source.indexOf('\nfunction saveClubSystem',i),sync=source.slice(i,end);
   const j=source.indexOf('async function selectClub('),e=source.indexOf('\nfunction updateAppHeader',j),select=source.slice(j,e);
   const builtin=new Set(['JSON','Number','String','Math','Object','Array','Date','undefined','parseFloat','parseInt','isNaN','isFinite']);
   const env=Object.fromEntries([...(sync+select).matchAll(/\b[a-zA-Z_]\w*\b/g)].filter(m=>!builtin.has(m[0])).map(m=>[m[0],null]));
   Object.assign(env,{KCTableGames:game,ACTIVE_CLUB:'Club',CLUBS:{Club:{avatar:''}},persons:[{name:'A',strafen:{}}],currentEveningStartedAt:evening,penaltyStatsLog:[{id:'stat',tableGameId:'game_test'}],sechstageState:{},blackjackState:start('blackjack'),gluecksspiraleState:spiral(),calcPersonStrafenTotalCapped:()=>0,console:{log(){},error(){}},window:{firestoreApi:{}},document:{getElementById:()=>({style:{},classList:{add(){},remove(){}}})}});
   for(const name of ['createEmptyClubData','createTannenbaumState','createLotterieState','createTiberiusState','createDartsState','createSechstageState'])env[name]=()=>({});
   env.createBlackjackState=()=>game.empty('blackjack');env.createGluecksspiraleState=()=>game.empty('gluecksspirale');
   for(const name of ['ensureTannenbaumState','ensureLotterieState','ensureTiberiusState','ensureDartsState','hydrateState','renderAll','updateAppHeader'])env[name]=()=>{};
   env.getClubFirestoreId=()=> 'club';env.loadFromFirestore=async()=>false;env.saveToFirestore=async()=>true;env.startLivePersonSync=async()=>{};
   const api=new Function('env','with(env){'+sync+'\n'+select+';return {syncCurrentClubToStore,selectClub};}')(env);
   api.syncCurrentClubToStore();eq(env.CLUBS.Club.blackjackState.id,'game_test');eq(env.CLUBS.Club.gluecksspiraleState.id,'game_test');
   env.blackjackState=null;env.gluecksspiraleState=null;env.currentEveningStartedAt=null;await api.selectClub('Club');
   eq(env.blackjackState.id,'game_test');eq(env.gluecksspiraleState.id,'game_test');eq(env.currentEveningStartedAt,evening);eq(env.penaltyStatsLog[0].id,'stat');
 });


 test('dashboard automatically shows each new game and keeps its confirmed result visible',()=>{
   const source=sources['dashboard.html'],i=source.indexOf('function chosenGame()'),end=source.indexOf('\nfunction node(',i);
   const context={state:{dashboardActiveGame:'blackjack'},games:['tannenbaum','blackjack','gluecksspirale'],liveGames:{},$:_=>({value:'auto'}),gameState:key=>key==='blackjack'?{id:'game_current',finished:true}:key==='tannenbaum'?{id:'old',active:true,startedAt:'2027-01-01'}:null};
   const choose=new Function('env','with(env){'+source.slice(i,end)+';return chosenGame;}')(context);
   eq(choose(),'blackjack');context.state.dashboardActiveGame='gluecksspirale';context.gameState=key=>key==='gluecksspirale'?{id:'game_spiral',active:true}:null;eq(choose(),'gluecksspirale');
 });
 test('confirmed new-game counters enter the existing PDF snapshot and local live cache',()=>{
   const people=[{name:'A',present:true,strafen:{}}],env={persons:people,livePersonCounters:new Map()};
   const p=sources['js/persons.js'],i=p.indexOf('function applyConfirmedLiveCounter('),end=p.indexOf('\n}\n',i);
   const apply=new Function('env','with(env){'+p.slice(i,end+2)+';return applyConfirmedLiveCounter;}')(env);
   apply('A','strafen','gosse',2);apply('A','strafen','loser1',1);eq(env.livePersonCounters.get('A').strafen,{gosse:2,loser1:1});
   Object.assign(env,{getPresentMemberPenaltyMaximum:()=>0,getPdfAttendanceStatus:()=> 'present',getPdfAttendanceStatusLabel:()=> 'Anwesend',getMissingGameCharges:()=>[],getGosseKings:()=>[],calcPersonStrafenTotalCapped:()=>3,getMemberPdfPenaltyTotal:()=>3,monatsbeitrag:30,ACTIVE_CLUB:'Club',STRAFEN:catalog,strafPrices:{gosse:1,loser1:1},strafenHistory:[]});
   const pdf=sources['js/strafe-pdf.js'],begin=pdf.indexOf('function getStrafenSnapshot()'),last=pdf.indexOf('\nasync function generateStrafenPDF',begin);
   const snapshot=new Function('env','with(env){'+pdf.slice(begin,last)+';return getStrafenSnapshot;}')(env)();
   eq(snapshot.members[0].strafen,{gosse:2,loser1:1});eq(snapshot.members[0].total,33);
 });

 for(const item of tests){try{await item.fn();results.push({name:item.name,pass:true});}catch(e){results.push({name:item.name,pass:false,error:e.message,stack:e.stack});}}
 return results;
}
async function runV179UiTest(sources){
 const ok=(v,m)=>{if(!v)throw Error(m||'UI assertion failed');},eq=(a,b)=>ok(JSON.stringify(a)===JSON.stringify(b),JSON.stringify(a)+' !== '+JSON.stringify(b));
 const coreWindow={};const shared=new Function('window',sources['js/games/table-games-core.js']+';const KCTableGames=window.KCTableGames;return {renderTableGameBoard,tableEscape};')(coreWindow);
 const nodes={},listeners={},document={activeElement:null,getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn};
 function node(id){
  const classes=new Set(id.endsWith('modal')?['hidden']:[]),el={id,innerHTML:'',textContent:'',style:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,value)=>{if(value===undefined)value=!classes.has(x);if(value)classes.add(x);else classes.delete(x);}},querySelectorAll:()=>[],focus:()=>{document.activeElement=el;}};
  let markup='';
  Object.defineProperty(el,'innerHTML',{get:()=>markup,set:value=>{for(const m of String(value).matchAll(/\bon(?:click|change|error)="([^"]*)"/g))new Function('event',m[1]);markup=value;}});
  nodes[id]=el;return el;
 }
 for(const id of ['blackjack-start-card','blackjack-board','gluecksspirale-start-card','gluecksspirale-board','table-assignment-title','table-assignment-grid','table-assignment-modal','spiral-rules-modal','spiral-rules-close'])node(id);
 const people=['A','B','C','D','Gast'].map(name=>({name,present:true}));people[4].isGuest=true;
 const env={window:{firestoreApi:{}},document,KCTableGames:coreWindow.KCTableGames,...shared,ACTIVE_CLUB:'Club',currentEveningStartedAt:'2026-11-06T18:00:00Z',persons:people,SPIELE_KATALOG:[],gluecksspiraleSettings:{target:50},blackjackState:null,gluecksspiraleState:null,dashboardActiveGame:null,penaltyStatsLog:[],navigator:{onLine:true},crypto:{randomUUID:()=>String(Math.random()).slice(2)},getActivePlayersForSoloGame:()=>people,getGlobalSeatOrder:()=>people.map(p=>p.name),sixAvatar:name=>shared.tableEscape(name),showToast:()=>{},getClubFirestoreId:()=> 'club',applyConfirmedLiveCounter:()=>{},persistState:()=>{},saveToFirestore:async()=>true,confirm:()=>true,console:{error(){}}};
 const ui=new Function('env','with(env){'+sources['js/games/table-games-ui.js']+';return {renderTableGames,renderTableGame,tableDraft,tableToggle,tableMove,tableDrawStarter,tableBuildPairs,tableOpenAssignment,tableChooseAssignment,tableConfirmAssignment,tableCloseAssignment,tableAction,tableCard,startTableGame,tableRetry,tableReload,tableReset,openSpiralRules,closeSpiralRules,applyTableServerStates,ensureTableGames,getPending:key=>tablePending[key]};}')(env);
 const game=env.KCTableGames,catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},{key:'loser1',label:'1. Verlierer'},{key:'loser2',label:'2. Verlierer'},{key:'loser3',label:'3. Verlierer'}],server={blackjackState:game.empty('blackjack'),gluecksspiraleState:game.empty('gluecksspirale'),currentEveningStartedAt:env.currentEveningStartedAt},stats=[],counters=new Map();let failBefore=false,failAfter=false,lastRequest=null;
 env.window.firestoreApi.transactTableGame=async(_,request)=>{
   lastRequest=request;if(failBefore){failBefore=false;throw Error('Network before commit');}
   const before=server[request.gameKey+'State'],context={people,catalog,now:request.now,eveningStartedAt:server.currentEveningStartedAt,club:'Club'},out=game.command(before,request,context),effect=out.repeat?{changes:[],added:[],removed:[]}:game.effects(before,out.state,request,context);
   if(!out.repeat){server[request.gameKey+'State']=out.state;stats.push(...effect.added);for(const id of effect.removed){const i=stats.findIndex(s=>s.id===id);if(i>=0)stats.splice(i,1);}for(const change of effect.changes){const id=change.personName+'/'+change.key;counters.set(id,(counters.get(id)||0)+change.delta);}}
   if(failAfter){failAfter=false;throw Error('Network after commit');}
   return {state:JSON.parse(JSON.stringify(server[request.gameKey+'State'])),eveningStartedAt:server.currentEveningStartedAt,counters:[],gameStats:JSON.parse(JSON.stringify(stats)),repeat:out.repeat};
 };
 env.window.firestoreApi.loadClubState=async()=>JSON.parse(JSON.stringify(server));
 ui.renderTableGames();ok(nodes['blackjack-start-card'].innerHTML.includes('17 + 4'));ok(nodes['gluecksspirale-start-card'].innerHTML.includes('5 ausgewählt'));
 ui.tableBuildPairs();eq(ui.tableDraft('gluecksspirale').teams.length,3);eq(ui.tableDraft('gluecksspirale').teams[2].players,['Gast']);
 ui.tableToggle('gluecksspirale',4);ui.tableBuildPairs();eq(ui.tableDraft('gluecksspirale').teams.map(t=>t.players),[['A','B'],['C','D']]);
 ui.tableOpenAssignment(0,1);ok(!nodes['table-assignment-modal'].classList.contains('hidden'));ui.tableChooseAssignment(2);ui.tableConfirmAssignment();eq(ui.tableDraft('gluecksspirale').teams.map(t=>t.players),[['A','C'],['B','D']]);ok(nodes['table-assignment-modal'].classList.contains('hidden'));
 const initialFocus=node('info');document.activeElement=initialFocus;ui.openSpiralRules();ok(!nodes['spiral-rules-modal'].classList.contains('hidden'));eq(document.activeElement.id,'spiral-rules-close');listeners.keydown({key:'Escape',preventDefault(){}});ok(nodes['spiral-rules-modal'].classList.contains('hidden'));eq(document.activeElement.id,'info');
 env.gluecksspiraleSettings={target:10};await ui.startTableGame('gluecksspirale');ok(env.gluecksspiraleState.active);ok(nodes['gluecksspirale-start-card'].classList.contains('hidden'));eq(env.dashboardActiveGame,'gluecksspirale');
 failBefore=true;await ui.tableAction('gluecksspirale','throw',{kind:'gosse'});ok(ui.getPending('gluecksspirale'));ok(nodes['gluecksspirale-board'].innerHTML.includes('Erneut versuchen'));const op=lastRequest.opId;await ui.tableRetry('gluecksspirale');eq(lastRequest.opId,op);eq(counters.get('A/gosse'),1);eq(env.penaltyStatsLog.length,1);
 await ui.tableAction('gluecksspirale','undo');eq(counters.get('A/gosse'),0);eq(env.penaltyStatsLog.length,0);eq(game.currentName(env.gluecksspiraleState),'A');
 failAfter=true;await ui.tableAction('gluecksspirale','throw',{kind:'gosse'});ok(ui.getPending('gluecksspirale'));await ui.tableReload('gluecksspirale');eq(counters.get('A/gosse'),1);ok(!ui.getPending('gluecksspirale'));eq(env.penaltyStatsLog.length,1);
 await ui.tableAction('gluecksspirale','undo');
 for(const pins of [6,4,1,1])await ui.tableAction('gluecksspirale','throw',{kind:'pins',pins});
 ok(env.gluecksspiraleState.readyToFinish);ok(nodes['gluecksspirale-board'].innerHTML.includes('Abschließen und Verlierer buchen'));await ui.tableAction('gluecksspirale','finish');eq(env.gluecksspiraleState.winners,['G1']);eq(counters.get('B/loser1'),1);eq(counters.get('D/loser1'),1);
 await ui.tableReset('gluecksspirale');eq(env.gluecksspiraleState.id,'');eq(counters.get('B/loser1'),1);
 ui.tableToggle('blackjack',4);ui.tableToggle('blackjack',3);ui.tableToggle('blackjack',2);ui.tableMove(0,1);eq(ui.tableDraft('blackjack').selected,['B','A']);ui.tableMove(1,-1);await ui.startTableGame('blackjack');
 ok(!nodes['blackjack-board'].innerHTML.includes('Karte für A aufdecken'));ok(nodes['blackjack-board'].innerHTML.includes('Stopp – nächster Spieler'));
 await ui.tableAction('blackjack','throw',{kind:'pins',pins:9});await ui.tableAction('blackjack','stand');await ui.tableAction('blackjack','throw',{kind:'pins',pins:6});await ui.tableAction('blackjack','stand');
 ok(nodes['blackjack-board'].innerHTML.includes('Karte für A aufdecken'));await ui.tableCard('A');ok(nodes['blackjack-board'].innerHTML.includes('Karte für B aufdecken'));await ui.tableCard('7');
 ok(env.blackjackState.readyToFinish);ok(!shared.renderTableGameBoard(env.blackjackState).includes('🔒'));await ui.tableAction('blackjack','finish');eq(env.blackjackState.winners,['A']);eq(counters.get('B/loser1'),2);eq(env.dashboardActiveGame,'blackjack');

 const revision=env.blackjackState.revision;ui.applyTableServerStates({blackjackState:{...env.blackjackState,revision:revision-1,finished:false}});eq(env.blackjackState.revision,revision);ok(env.blackjackState.finished);
 env.currentEveningStartedAt='2026-11-07T18:00:00Z';ui.ensureTableGames();eq(env.blackjackState.id,'');eq(env.gluecksspiraleState.id,'');
 return {assertions:'complete UI flow',spiralThrows:4,blackjackCards:true,retryBeforeCommit:true,retryAfterCommit:true,undoCounters:true,finishCounters:true};
}

test('V179: Spielmechanik, Transaktionen und Integration',async t=>{
 const results=await runV179Tests(sources);
 for(const result of results)await t.test(result.name,()=>assert.ok(result.pass,result.error+'\n'+result.stack));
});
test('V179: vollständige Formularabläufe im DOM-Modell',async()=>{await runV179UiTest(sources);});

