const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sources=Object.fromEntries(['js/games/table-games-core.js','js/firebase.js'].map(p=>[p,read(p)]));
// Reuse the transaction simulator and action helpers; every assertion below exercises current source.
const previous=read('tests/v179-regression.cjs'),begin=previous.indexOf('async function runV179Tests('),end=previous.indexOf("\n test(",begin);
assert(begin>=0&&end>begin);
const setup=new Function('return ('+previous.slice(begin,end)+'\n return {api,req,step,start,roll,stand,reveal,soloTotals,game,ctx,exported};})')()(sources);
const table=async()=>setup;
const keys=entry=>entry.map(x=>[x.personName,x.key,x.delta]);
async function prepareLive(totals){
 const h=await table(),store=h.api();let s=h.game.empty('blackjack');
 const send=async(action,fields={})=>{
   const request=h.req(s,action,fields),result=await store.api.transactTableGame('club',request);s=result.state;return {request,result};
 };
 await send('start',{players:totals.map((_,i)=>String.fromCharCode(65+i))});
 for(const total of totals){
   let wood=total-2;while(wood>0){const pins=Math.min(9,wood);await send('throw',{kind:'pins',pins});wood-=pins;}
   await send('stand');
 }
 return {h,store,send,state:()=>s};
}
test('25/13/17/21: the overthrow extra and three placement penalties are separate and additive',async()=>{
 const {store,send,state}=await prepareLive([25,13,17,21]);
 for(let i=0;i<4;i++)await send('card',{value:2});
 assert.equal(store.person('A').strafen.loser1,1);
 assert.deepEqual(state().scores,{A:25,B:13,C:17,D:21});
 const {request}=await send('finish');
 assert.equal(store.person('A').strafen.loser1,2);
 assert.equal(store.person('B').strafen.loser2,1);
 assert.equal(store.person('C').strafen.loser3,1);
 assert.equal(store.person('D')?.strafen.loser1||0,0);
 assert.deepEqual(state().winners,['D']);
 await store.api.transactTableGame('club',request);
 assert.equal(store.person('A').strafen.loser1,2);
});
test('a card is rejected until every player has explicitly stopped',async()=>{
 const h=await table();let s=h.start('blackjack');
 assert.throws(()=>h.step(s,'card',{value:7}),/Zuerst/);
 s=h.stand(s);assert.throws(()=>h.step(s,'card',{value:7}),/Zuerst/);
 s=h.stand(s);assert.equal(h.game.blackjackPhase(s),'cards');
 assert.throws(()=>h.roll(s,1),/gestoppt/);
 assert.throws(()=>h.stand(s),/gestoppt/);
});
test('reaching 21 or exceeding it before a card reveal never stops or charges automatically',async()=>{
 const h=await table();let s=h.start('blackjack');
 for(const pins of [9,9,3,4])s=h.roll(s,pins);
 assert.equal(s.wood.A,25);assert.equal(h.game.currentName(s),'A');
 assert.deepEqual(s.cardValues,{});assert.deepEqual(s.stopped,[]);
 assert(!s.history.some(e=>e.bustPenalty));
});
test('each overthrow is charged when its card is revealed; valid cards are free',async()=>{
 const {store,send}=await prepareLive([25,24,13,21]);
 await send('card',{value:2});assert.equal(store.person('A').strafen.loser1,1);
 await send('card',{value:2});assert.equal(store.person('B').strafen.loser1,1);
 await send('card',{value:2});assert.equal(store.person('C')?.strafen.loser1||0,0);
 await send('card',{value:2});assert.equal(store.person('D')?.strafen.loser1||0,0);
});
test('different overthrows rank highest total first, then the lowest non-bust total',async()=>{
 const h=await table(),s=h.soloTotals([25,24,13,21]),out=h.step(s,'finish');
 assert.deepEqual(keys(out.effect.changes),[['A','loser1',1],['B','loser2',1],['C','loser3',1]]);
});
test('ties share their rank and only the first three losing ranks are charged',async()=>{
 const h=await table(),same=h.step(h.soloTotals([25,25,13,21]),'finish');
 assert.deepEqual(keys(same.effect.changes),[['A','loser1',1],['B','loser1',1],['C','loser2',1]]);
 const distinct=h.step(h.soloTotals([25,13,17,18,21]),'finish');
 assert.deepEqual(keys(distinct.effect.changes),[['A','loser1',1],['B','loser2',1],['C','loser3',1]]);
});
test('all busts receive their automatic extra, even if there is no valid winner',async()=>{
 const {store,send,state}=await prepareLive([25,25]);
 await send('card',{value:2});await send('card',{value:2});await send('finish');
 assert.deepEqual(state().winners,[]);
 assert.equal(store.person('A').strafen.loser1,2);assert.equal(store.person('B').strafen.loser1,2);
});
test('undoing an overthrow card removes its exact extra and returns to the same card',async()=>{
 const {h,store,send,state}=await prepareLive([25,13]);
 await send('card',{value:2});assert.equal(store.person('A').strafen.loser1,1);
 await send('undo');assert.equal(store.person('A').strafen.loser1,0);
 assert.equal(h.game.currentName(state()),'A');assert.deepEqual(state().cardValues,{});
 await send('card',{value:3});assert.equal(store.person('A').strafen.loser1,1);
 assert.equal(state().scores.A,26);
});
test('undoing the last card reopens reveal and prevents premature finish',async()=>{
 const {h,send,state}=await prepareLive([13,17]);
 await send('card',{value:2});await send('card',{value:2});assert(state().readyToFinish);
 await send('undo');assert(!state().readyToFinish);assert.equal(h.game.currentName(state()),'B');
 await assert.rejects(()=>send('finish'),/Zuerst/);
});
test('undo across the final stop returns from reveal to the last player without cards',async()=>{
 const h=await table();let s=h.stand(h.stand(h.start('blackjack')));
 s=h.step(s,'undo').state;assert.equal(h.game.blackjackPhase(s),'throwing');
 assert.equal(h.game.currentName(s),'B');assert.deepEqual(s.cardValues,{});
 s=h.roll(s,4);assert.equal(s.wood.B,4);
});
test('failed card saves cannot charge or reveal partially; retry charges once',async()=>{
 const {h,store,state}=await prepareLive([25,13]),s=state(),request=h.req(s,'card',{value:2});
 store.fail(true);await assert.rejects(()=>store.api.transactTableGame('club',request),/Network/);
 assert.deepEqual(store.root().blackjackState.cardValues,{});
 assert.equal(store.person('A')?.strafen.loser1||0,0);
 store.fail(false);await store.api.transactTableGame('club',request);await store.api.transactTableGame('club',request);
 assert.equal(store.person('A').strafen.loser1,1);
});
test('simultaneous duplicate reveals have a single extra charge',async()=>{
 const {h,store,state}=await prepareLive([25,13]),request=h.req(state(),'card',{value:2});
 const results=await Promise.all([store.api.transactTableGame('club',request),store.api.transactTableGame('club',request)]);
 assert.equal(results.filter(r=>r.repeat).length,1);assert.equal(store.person('A').strafen.loser1,1);
});
test('a missing overthrow fine rejects the card and its game changes atomically',async()=>{
 const {h,store,state}=await prepareLive([25,13]);
 store.data.set('clubs/club/state/current',{...store.root(),STRAFEN:[]});
 await assert.rejects(()=>store.api.transactTableGame('club',h.req(state(),'card',{value:2})),/Verlierer/);
 assert.deepEqual(store.root().blackjackState.cardValues,{});
});
test('revealing is still possible for a participant who left after bowling',async()=>{
 const {h,store,state}=await prepareLive([25,13]);
 store.data.set('clubs/club/state/current',{...store.root(),persons:store.root().persons.map(p=>p.name==='A'?{...p,left:true}:p)});
 await store.api.transactTableGame('club',h.req(state(),'card',{value:2}));
 assert.equal(store.person('A').strafen.loser1,1);
});
test('legacy active rounds require reset and never silently reinterpret old booked actions',async()=>{
 const h=await table(),s=h.start('blackjack');delete s.rulesVersion;
 assert.throws(()=>h.step(s,'throw',{kind:'pins',pins:1}),/Regeln/);
 assert.throws(()=>h.step(s,'finish'),/Regeln/);
 const store=h.api({blackjackState:s});store.data.set('clubs/club/livePersons/a',{name:'A',strafen:{loser1:5}});
 const reset=await store.api.transactTableGame('club',h.req(s,'reset'));
 assert.equal(reset.state.id,'');assert.equal(store.person('A').strafen.loser1,5);
});
test('the board distinguishes the extra fine and placement fine in the finished table',async()=>{
 const h=await table(),out=h.step(h.soloTotals([25,13,17,21]),'finish');
 const html=h.exported.renderTableGameBoard(out.state);
 assert(html.includes('Über 21: 1. Verlierer +1'));assert(html.includes('Platzierung: 1. Verlierer +1'));
 assert(html.includes('Platzierung: 2. Verlierer +1'));assert(html.includes('Platzierung: 3. Verlierer +1'));
 assert(!html.includes('🔒'));assert(!read('js/games/table-games-ui.js').includes('id="blackjack-cards"'));
});
