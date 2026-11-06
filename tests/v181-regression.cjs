const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const scope={window:{}};vm.createContext(scope);
for(const p of ['js/games/sechstage-core.js','js/games/table-games-core.js'])vm.runInContext(read(p),scope);
Object.assign(scope,scope.window);
const people=Array.from({length:16},(_,i)=>({name:String.fromCharCode(65+i),present:true,strafen:{}}));
const catalog=[{key:'gosse',label:'Gosse'},{key:'special',label:'9er / Kranz'},...[1,2,3].map(rank=>({key:'loser'+rank,label:rank+'. Verlierer'}))];
const context={people,catalog,now:'2026-11-06T20:00:00Z',eveningStartedAt:'2026-11-06T18:00:00Z',club:'Club'};
let sequence=0;
function adapter(key,teams){
 const six=key==='six',game=six?scope.KCSixDays:scope.KCTableGames;
 let state=six?game.empty():game.empty('gluecksspirale');
 function request(action,fields={}){
  return {...context,gameKey:'gluecksspirale',raceId:state.id||'race_test',gameId:state.id||'game_test',opId:(six?'six_':'table_')+'v181_'+(++sequence),expectedRevision:state.revision||0,...fields,action};
 }
 function step(action,fields={},ctx=context){
  const req=request(action,fields),before=state,out=game.command(before,req,ctx),effect=out.repeat?{changes:[],added:[],removed:[]}:game.effects(before,out.state,req,ctx);
  state=out.state;return {state:plain(state),effect:plain(effect),request:req};
 }
 step('start',{teams:teams.map(players=>({players})),target:10});
 return {game,six,state:()=>plain(state),step,request,throw:(pins=1,kind='pins')=>step('throw',{pins,kind})};
}
function complete(key,teams,woodByTeam){
 const a=adapter(key,teams);
 if(a.six){
  while(!a.state().readyToFinish){const s=a.state(),used=s.turn.used[0]+s.turn.used[1];a.throw(used===0?woodByTeam[s.teamIndex]:0,used===0?'pins':'miss');}
 }else{
  for(const wood of woodByTeam){a.throw(wood/2);a.throw(wood/2);}
 }
 return a;
}
function apiFor(key,initial={}){
 const six=key==='six',data=new Map([['clubs/club/state/current',{currentEveningStartedAt:context.eveningStartedAt,persons:plain(people),STRAFEN:catalog,penaltyStatsLog:[],...initial}]]);let revision=0,writes=0,failed=false;
 const env={db:{},window:{KCSixDays:scope.KCSixDays,KCTableGames:scope.KCTableGames},doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=> 'server'};
 env.runTransaction=async(_,fn)=>{
  for(let tries=0;tries<12;tries++){
   if(failed)throw Error('Network failure');const observed=revision,pending=[];let writing=false;
   const out=await fn({get:async key=>{assert.equal(writing,false);return {exists:()=>data.has(key),data:()=>data.has(key)?plain(data.get(key)):undefined};},set:(key,value,opts)=>{writing=true;pending.push(()=>{data.set(key,opts?.merge?{...(data.get(key)||{}),...plain(value)}:plain(value));writes++;});}});
   if(observed!==revision)continue;pending.forEach(fn=>fn());if(pending.length)revision++;return out;
  }throw Error('Transaction retry limit');
 };
 const name=six?'transactSechsGame':'transactTableGame',source=read('js/firebase.js'),i=source.indexOf('  async '+name+'('),end=source.indexOf('\n  },',i);
 const api={getLivePersonId:n=>encodeURIComponent(n.trim().toLowerCase())};
 api[name]=new Function('env','with(env){return ({'+source.slice(i,end+4)+'}).'+name+';}')(env);
 return {data,root:()=>data.get('clubs/club/state/current'),send:req=>api[name]('club',req),person:n=>data.get('clubs/club/livePersons/'+api.getLivePersonId(n)),writes:()=>writes,fail:value=>failed=value};
}
const pairs=[['A','B'],['C','D'],['E','F'],['G','H']];
for(const key of ['six','spiral']){
 test(key+': worst three team scores receive ranks 1, 2, 3, per real member',()=>{
  const a=complete(key,pairs,key==='six'?[1,2,3,4]:[2,4,6,10]),out=a.step('finish');
  assert.deepEqual(out.effect.changes.map(c=>[c.personName,c.key]),[['A','loser1'],['B','loser1'],['C','loser2'],['D','loser2'],['E','loser3'],['F','loser3']]);
  assert.equal(out.state.teamLoserGroups.length,3);
 });
 test(key+': tied teams share a dense rank and shared winners stay free',()=>{
  const a=complete(key,pairs,key==='six'?[1,1,4,4]:[2,2,10,10]),out=a.step('finish');
  assert.deepEqual(out.effect.changes.map(c=>[c.personName,c.key]),[['A','loser1'],['B','loser1'],['C','loser1'],['D','loser1']]);assert.equal(out.state.winners.length,2);
 });
 test(key+': a fourth losing rank is not charged',()=>{
  const a=complete(key,[...pairs,['I','J']],key==='six'?[1,2,3,4,5]:[2,4,6,8,10]),out=a.step('finish');
  assert(!out.effect.changes.some(c=>['G','H','I','J'].includes(c.personName)));
 });
 test(key+': the single team receives its losing rank once, never as two virtual people',()=>{
  const a=complete(key,[['G'],['A','B'],['C','D'],['E','F']],key==='six'?[1,2,3,4]:[2,4,6,10]),out=a.step('finish');
  assert.deepEqual(out.effect.changes.filter(c=>c.personName==='G'),[{personName:'G',key:'loser1',delta:1}]);
  assert.equal(out.effect.changes.length,5);
 });
 test(key+': three players form one pair and one single team',()=>{
  const a=adapter(key,[['A','B'],['C']]);assert.equal(a.state().teams.length,2);assert.deepEqual(a.state().teams.flatMap(t=>t.players),['A','B','C']);
 });
 test(key+': multiple singles, missing players and duplicated names are rejected',()=>{
  for(const teams of [[['A'],['B']],[['A'],['B'],['C','D']],[['A','B'],[]],[['A','B'],['A']]])assert.throws(()=>adapter(key,teams));
 });
 test(key+': all fifteen players are retained in seven pairs and one single team',()=>{
  const names=people.slice(0,15).map(p=>p.name),teams=Array.from({length:8},(_,i)=>names.slice(2*i,2*i+2)),a=adapter(key,teams);
  assert.deepEqual(a.state().teams.flatMap(t=>t.players),names);assert.equal(a.state().teams.filter(t=>t.players.length===1).length,1);
 });
 test(key+': completed rank bookings are idempotent, including a single team',async()=>{
  const a=complete(key,[['G'],['A','B'],['C','D'],['E','F']],key==='six'?[1,2,3,4]:[2,4,6,10]),state=a.state(),store=apiFor(key,{[key==='six'?'sechstageState':'gluecksspiraleState']:state});
  const req=a.request('finish');await store.send(req);const writes=store.writes();const result=await store.send(req);
  assert(result.repeat);assert.equal(store.writes(),writes);assert.equal(store.person('G').strafen.loser1,1);assert.equal(store.person('A').strafen.loser2,1);assert.equal(store.person('C').strafen.loser3,1);
 });
 test(key+': missing second-loser catalog rolls back every rank and game completion',async()=>{
  const a=complete(key,pairs,key==='six'?[1,2,3,4]:[2,4,6,10]),field=key==='six'?'sechstageState':'gluecksspiraleState',store=apiFor(key,{[field]:a.state(),STRAFEN:catalog.filter(c=>c.key!=='loser2')});
  await assert.rejects(()=>store.send(a.request('finish')),/2.*Verlierer/);assert.equal(store.writes(),0);assert(!store.root()[field].finished);
 });
 test(key+': failed finish can be retried without partial single-team fines',async()=>{
  const a=complete(key,[['G'],['A','B'],['C','D'],['E','F']],key==='six'?[1,2,3,4]:[2,4,6,10]),store=apiFor(key,{[key==='six'?'sechstageState':'gluecksspiraleState']:a.state()}),req=a.request('finish');
  store.fail(true);await assert.rejects(()=>store.send(req),/Network/);assert.equal(store.writes(),0);store.fail(false);await store.send(req);assert.equal(store.person('G').strafen.loser1,1);
 });
 test(key+': a single thrower receives and reverses only their own gutter penalty',()=>{
  const a=adapter(key,[['A'],['B','C']]),out=a.throw(0,'gosse');assert.deepEqual(out.effect.changes,[{personName:'A',key:'gosse',delta:1}]);
  const undo=a.step('undo');assert.deepEqual(undo.effect.changes,[{personName:'A',key:'gosse',delta:-1}]);assert.equal(a.game.currentName?a.game.currentName(a.state()):a.game.thrower(a.state()),'A');
 });
}
test('six: a single player takes all four throws and undo restores throw four',()=>{
 const a=adapter('six',[['A'],['B','C']]);
 for(let i=0;i<4;i++){assert.equal(a.game.thrower(a.state()),'A');a.throw(1);}
 assert.equal(a.game.thrower(a.state()),'B');a.step('undo');assert.equal(a.game.thrower(a.state()),'A');assert.deepEqual(a.state().turn.used,[3,0]);
 a.throw(1);assert.equal(a.state().teamIndex,1);
});
test('six: the single player remains selectable for the third and fourth throw, with no phantom partner',()=>{
 const a=adapter('six',[['A'],['B','C']]);a.throw(1);a.throw(1);a.step('select',{playerIndex:0});a.throw(1);a.step('select',{playerIndex:0});
 assert.throws(()=>a.step('select',{playerIndex:1}));assert.equal(a.game.thrower(a.state()),'A');
});
test('six: a full six-day game gives the single player 24 throws and each paired member 12',()=>{
 const a=complete('six',[['A'],['B','C']],[1,2]),counts={};
 for(const e of a.state().history)counts[e.name]=(counts[e.name]||0)+1;
 assert.deepEqual(counts,{A:24,B:12,C:12});
});
test('spiral: a single player takes both throws and every bonus pair',()=>{
 const a=adapter('spiral',[['A'],['B','C']]);
 a.throw(6);assert.equal(a.game.currentName(a.state()),'A');a.throw(7);assert.equal(a.game.currentName(a.state()),'A');
 a.throw(1);a.throw(1);assert.equal(a.game.currentName(a.state()),'B');assert.equal(a.state().scores.G1,15);
 a.step('undo');assert.equal(a.game.currentName(a.state()),'A');assert.deepEqual(a.state().turn.pins,[1]);
});
test('compact spiral board puts booking controls before team cards and collapses round details',()=>{
 const a=adapter('spiral',pairs),html=scope.renderTableGameBoard(a.state(),{controls:'<button>BOOK</button>'});
 assert(html.indexOf('BOOK')<html.indexOf('tg-spiral-teams'));assert(html.includes('tg-spiral-rounds'));assert(!/<details[^>]*\bopen\b/.test(html));assert(!html.includes('tg-table-scroll'));
 assert(html.includes('tg-spiral-team'));assert(html.includes('A / B'));
 assert(/<details[^>]*\bopen\b/.test(scope.renderTableGameBoard(a.state(),{detailsOpen:true})));
});
test('both boards label the solo team and actual ranked team penalties',()=>{
 for(const key of ['six','spiral']){
  const a=complete(key,[['G'],['A','B'],['C','D'],['E','F']],key==='six'?[1,2,3,4]:[2,4,6,10]),out=a.step('finish');
  const html=key==='six'?scope.renderSixDaysBoard(out.state):scope.renderTableGameBoard(out.state);
  for(const text of ['Einzelteam','1. Verlierer +1','2. Verlierer +1','3. Verlierer +1'])assert(html.includes(text),text);
 }
});
function ui(size){
 const nodes={},document={activeElement:null,getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],addEventListener(){}};
 for(const id of ['sechs-start-card','sechs-board','sechs-assignment-modal','sechs-assignment-title','sechs-assignment-grid','blackjack-start-card','blackjack-board','gluecksspirale-start-card','gluecksspirale-board','table-assignment-modal','table-assignment-title','table-assignment-grid']){
  const classes=new Set();let markup='';
  nodes[id]={textContent:'',classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},querySelectorAll:()=>[],focus(){}};
  Object.defineProperty(nodes[id],'innerHTML',{get:()=>markup,set:value=>{for(const m of value.matchAll(/\bon(?:click|change|error)="([^"]*)"/g))new Function('event',m[1]);markup=value;}});
 }
 const roster=plain(people.slice(0,size)),c={window:{},document,persons:roster,ACTIVE_CLUB:'Club',currentEveningStartedAt:context.eveningStartedAt,SPIELE_KATALOG:[],sechstageState:null,blackjackState:null,gluecksspiraleState:null,showToast(){},getActivePlayersForSoloGame:()=>roster,getGlobalSeatOrder:()=>roster.map(p=>p.name)};
 vm.createContext(c);
 for(const p of ['js/games/sechstage-core.js','js/games/table-games-core.js','js/games/sechstage.js','js/games/table-games-ui.js']){vm.runInContext(read(p),c);Object.assign(c,c.window);}
 c.renderSechsGame();c.renderTableGames();return {c,nodes};
}
for(const count of [3,5,7,15]){
 test('both team selection forms retain all '+count+' participants in ordered and random teams',()=>{
  const {c}=ui(count),expected=people.slice(0,count).map(p=>p.name).sort();
  for(const random of [false,true]){
   c.sechsBuildTeams(random);c.tableBuildPairs(random);
   for(const value of [vm.runInContext('sechsSetup.teams',c),c.tableDraft('gluecksspirale').teams]){
    const teams=plain(value);assert.deepEqual(teams.flatMap(t=>t.players).sort(),expected);
    assert.equal(teams.length,Math.ceil(count/2));assert.equal(teams.filter(t=>t.players.length===1).length,1);
   }
  }
  const last=Math.ceil(count/2)-1;
  c.sechsOpenAssignment(last,0);c.sechsChooseAssignment(0);c.sechsConfirmAssignment();
  c.tableOpenAssignment(last,0);c.tableChooseAssignment(0);c.tableConfirmAssignment();
  for(const value of [vm.runInContext('sechsSetup.teams',c),c.tableDraft('gluecksspirale').teams]){
   assert.deepEqual(plain(value).flatMap(t=>t.players).sort(),expected);
   assert.equal(value[last].players.length,1);
  }
 });
}
test('the active single-player UI shows four six-day throws and spiral controls above its score cards',()=>{
 const {c,nodes}=ui(3);
 c.sechstageState=adapter('six',[['A'],['B','C']]).state();c.renderSechsGame();
 assert(nodes['sechs-board'].innerHTML.includes('0 / 4 Würfe'));
 c.gluecksspiraleState=adapter('spiral',[['A'],['B','C']]).state();c.renderTableGame('gluecksspirale');
 const html=nodes['gluecksspirale-board'].innerHTML;
 assert(html.indexOf('tableAction')<html.indexOf('tg-spiral-teams'));assert(html.includes('Einzelteam'));
});
test('both rule popups describe solo quotas and all three losing ranks',()=>{
 const html=read('getraenke-abrechnung.html');
 for(const id of ['spiral-rules-modal','sechs-rules-modal']){
  const start=html.indexOf('id="'+id+'"'),next=html.indexOf('<div class="modal-overlay',start+10),part=html.slice(start,next);
  for(const text of ['Einzelteam','1. Verlierer +1','2. Verlierer +1','3. Verlierer +1'])assert(part.includes(text),id+': '+text);
 }
});
