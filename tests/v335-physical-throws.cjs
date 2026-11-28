const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(p,'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const c={window:null,Date,Intl,document:parseHTML('<html><body></body></html>').document};c.window=c;vm.createContext(c);
for(const file of ['js/evening-counters.js','js/games/plusminus-score.js','js/kranz-policy.js','js/games/club-games-core.js','js/games/extra-core.js','js/games/individual-core.js','js/games/table-games-core.js','js/games/sechstage-core.js','js/game-fine-policy.js','js/shared-sync-core.js','js/hotfix-recovery.js','js/penalty-booking-toasts.js','js/birthdays.js','js/cash-book.js','js/cash-overview.js'])vm.runInContext(read(file),c);
const P=c.KCThrows,M=c.KCEveningCounters,C=c.KCSharedCore,day='2026-11-28T19:00:00Z';
const people=['A','B','C','Gast'].map((name,i)=>({name,present:true,isGuest:i===3,tisch:i%2?'T2':'T1',strafen:{}}));
const catalog=[{key:'g',label:'Gosse'},{key:'n',label:'9er'},{key:'k',label:'Kranz'},{key:'d',label:'Durchgeworfen'},...Array.from({length:3},(_,i)=>({key:'l'+(i+1),label:(i+1)+'. Verlierer'}))];
const ctx={people,catalog,now:day,eveningStartedAt:day,groups:{T1:{name:'Wand'},T2:{name:'TV'}}};
const kinds=[['miss',0,{gutters:0,nines:0,wreaths:0,throws:1,pins:0},'d'],['gosse',0,{gutters:1,nines:0,wreaths:0,throws:1,pins:0},'g'],['pins',5,{gutters:0,nines:0,wreaths:0,throws:1,pins:5},null],['pins',9,{gutters:0,nines:1,wreaths:0,throws:1,pins:9},'n'],['kranz',0,{gutters:0,nines:0,wreaths:1,throws:1,pins:8},'k']];
let id=0;
for(const key of [...c.KCExtraGames.keys,'siebener','hindernis', 'blackjack','gluecksspirale','sechstage'])test(key+': all physical types, separate catalog prices, counters, undo and replay receipts',()=>{
 const engine=key==='sechstage'?c.KCSixDays:['blackjack','gluecksspirale'].includes(key)?c.KCTableGames:c.KCExtraGames.keys.includes(key)?c.KCExtraGames:c.KCIndividual;
 for(const [kind,pins,expected,penaltyKey] of kinds){
  let s=engine.empty(key);
  const req=(action,fields={})=>({gameKey:key,action,opId:(key==='sechstage'?'six_':['blackjack','gluecksspirale'].includes(key)?'table_':'ind_')+'v335_'+(++id),gameId:['blackjack','gluecksspirale'].includes(key)?'game_v335':'indgame_v335',raceId:'race_v335',expectedRevision:s.revision||0,...fields});
  const run=(action,fields={})=>{const r=req(action,fields),before=s,out=engine.command(before,r,ctx);s=out.state;return {before,request:r,effects:engine.effects(before,s,r,ctx)};};
  const config=c.KCExtraGames.keys.includes(key)?engine.defaults(key):key==='hindernis'?{target:100,baseCents:100,rules:[]}:{};
  run('start',{players:people.map(p=>p.name),teams:[{players:['A','B']},{players:['C','Gast']}],target:50,config,startTeam:'T1',kranzRule:{mode:'fixed',value:9},kranzValue:9});
  if(key==='lottokoenig')run('randomNumbers',{tickets:people.map(()=>({numbers:[1,2,10,20,30,40]}))});
  if(key==='ballermann')run('timerStart');
  const beforeStats={currentEveningStartedAt:day,persons:people,eveningCounters:M.empty(),personalThrows:{schema:1,partial:false,rows:[],excluded:[]},[key+'State']:copy(s)};
  const out=run('throw',{kind,pins,kranzValue:9,...(kind==='pins'&&['swingerclub','tageskurs'].includes(key)?{knocked:Array.from({length:pins},(_,i)=>i+1)}:{})});
  const e=s.history.at(-1),physical=copy(e.physicalThrow);assert.deepEqual(copy(P.stats(physical)),expected,key+' '+kind);
  const thrower=e.name;
  assert.deepEqual(copy(out.effects.changes.filter(x=>catalog.slice(0,4).some(p=>p.key===x.key)).map(x=>x.key)),penaltyKey?Array(kind==='gosse'?1:3).fill(penaltyKey):[]);
  if(penaltyKey)assert(out.effects.changes.every(x=>kind==='gosse'?x.personName===thrower:x.personName!==thrower));
  const after={...copy(beforeStats),[key+'State']:copy(s)};after.eveningCounters=M.transition(beforeStats,after,[key]);assert.deepEqual(copy(after.eveningCounters),expected);
  assert.deepEqual(copy(after.personalThrows.rows.find(r=>r.name===thrower)),{name:thrower,...expected});
  const repeated=engine.command(s,out.request,ctx);assert(repeated.repeat);assert.deepEqual(copy(repeated.state),copy(s));
  const undo=run('undo');const final={...copy(after),[key+'State']:copy(s)};final.eveningCounters=M.transition(after,final,[key]);assert.deepEqual(copy(final.eveningCounters),copy(M.empty()));assert.equal(final.personalThrows.rows.length,0);
  for(const x of out.effects.changes)assert(undo.effects.changes.some(y=>y.personName===x.personName&&y.key===x.key&&y.delta===-x.delta));
 }
});
test('canonical zero, gutter and wreath are distinct and the saved score cannot change physical stats',()=>{
 assert.deepEqual(copy(P.physical(0)),{kind:'durchgeworfen',pins:0});
 for(const value of [0,8,9,12])assert.deepEqual(copy(M.throws('haustief',{rows:{A:[{value,gameValue:9,physicalThrow:P.physical(0,'gosse')}]}})),[kinds[1][2]]);
 for(const value of [0,8,9,12])assert.deepEqual(copy(M.throws('plusminus',{rows:{A:[{value,physicalThrow:P.physical(12,'kranz')}]}})),[kinds[4][2]]);
});
test('unassigned team throws count only globally and rewind without affecting any personal row',()=>{
 const before={currentEveningStartedAt:day,persons:people,eveningCounters:M.empty(),personalThrows:{schema:1,rows:[],excluded:[]},tannenbaumState:{startedAt:day,active:true,history:[]}};
 const after=copy(before);after.tannenbaumState.history=[{id:'teamthrow',number:0,physicalThrow:P.physical(0),specialType:'durchgeworfen'}];after.eveningCounters=M.transition(before,after,['tannenbaum']);assert.equal(after.eveningCounters.throws,1);assert.equal(after.personalThrows.rows.length,0);
 const undone=copy(after);undone.tannenbaumState.history=[];undone.eveningCounters=M.transition(after,undone,['tannenbaum']);assert.equal(undone.eveningCounters.throws,0);
});
test('automatic initialization recovery leaves the completed 27 November snapshot untouched',()=>{
 const root={currentEveningStartedAt:'2026-11-27T18:17:01.250Z',persons:people,haustiefState:{finished:true,rows:{A:[{value:9}]}},eveningCounters:{nines:10},strafenHistory:[{id:'old',assigned:[{name:'A',rank:1}]}]};const saved=copy(root);assert.equal(c.KCHotfixRecovery.recover(root,C,{automatic:true}),root);assert.deepEqual(root,saved);
});
test('shared plusminus scorer keeps the existing zero-division rule and finite negative results',()=>{
 for(const last of [0,1,9]){const r=c.KCPlusminus.compute([1,1,9,9,last].map(value=>({value})));assert(r.complete);assert(Number.isFinite(r.result));assert.equal(r.divisionByZero,last===0);}
});
test('guest payments appear in exactly one guest row and affect cash without monthly contributions',()=>{
 const payments={payments:[{id:'income_guest',personName:'Gast',personId:'GastID',isGuest:true,amountCents:2300,date:'2026-11-28',description:'Kegelabend',kind:'single'}]};
 const entries=[{id:'archive',date:'2026-11-27',category:'strafen',total:20,guests:[{name:'Gast',total:20}],members:[]}];
 const model=c.KCCashOverview.model(entries,null,[],people,payments,'2026-11-28'),guest=model.rows.filter(r=>r.name==='Gast');assert.equal(guest.length,1);assert(guest[0].isGuest);assert.equal(guest[0].paid,2300);assert.equal(guest[0].plan,0);assert.equal(model.summary.actualBalance,2300);assert.equal(payments.payments.length,1);
 assert(!c.KCCashOverview.validPayment({...payments.payments[0],kind:'standing'}));
});
const evening='2026-11-28T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLowerCase());
const src=read('tests/v215-shared-sync.cjs'),factory=src.slice(src.indexOf('function database('),src.indexOf("test('two devices increment"))+src.slice(src.indexOf('function fullApp('),src.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
test('real low house through, gutter, nine and wreath with value 9 persist correctly, reload and undo',async()=>{
 const root=initial();root.STRAFEN=catalog;root.strafPrices={g:.5,n:1,k:2,d:3,l1:1,l2:1,l3:1};root.persons.forEach(p=>p.strafen={});
 const db=database({[rootPath]:root}),a=fullApp(db);await a.select();await a.c.startHausGame('tief');
 for(const [pins,gutter,place] of [[0,false,0],[0,true,0],[9,false,1]])await a.c.hausThrow('tief',pins,gutter,place);
 assert(await a.c.KCSharedSync.waitForUpload());let s=db.root().haustiefState;
 assert.equal(s.rows.A[0].gameValue,0);assert.equal(s.rows.B[0].gameValue,9);assert.equal(s.rows.A[1].gameValue,9);
 assert.deepEqual(copy(db.root().eveningCounters),{gutters:1,nines:1,wreaths:0,throws:3,pins:9});assert.equal(db.root().persons[1].strafen.d,1);assert.equal(db.root().persons[1].strafen.g,1);assert.equal(db.root().persons[1].strafen.n,1);
 const toast=a.document.getElementById('penalty-booking-toasts');assert(toast);assert.match(toast.textContent,/Durchgeworfen|9er|Gosse/);
 const b=fullApp(db);await b.select();assert(!b.document.getElementById('penalty-booking-toasts'));assert.deepEqual(copy(b.run('haustiefState.rows')),copy(s.rows));
 await b.c.undoHausThrow('tief');assert(await b.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().persons[1].strafen.n,0);
});
test('guest income actual Firebase API supports insert, edit and deletion without roster mutations',async()=>{
 const root=initial();root.persons.push({...copy(root.persons[0]),name:'Gast',isGuest:true});const db=database({[rootPath]:root}),a=fullApp(db);await a.select();const roster=copy(a.run('getFirestoreState().persons'));
 let revision=0;const payment={id:'income_guest335',personName:'Gast',isGuest:true,personId:'guest335',amountCents:1500,date:'2026-11-28',description:'Gastzahlung',kind:'single'};
 async function run(action,changes={}){const result=await a.c.firestoreApi.updateCashIncome('club',{action,expectedRevision:revision,opId:'cash_test_'+(++id),payment,...changes});revision=result.revision;assert(await a.c.KCSharedSync.waitForUpload());return result;}
 let value=await run('upsert');assert.equal(value.payments[0].personName,'Gast');assert(value.payments[0].isGuest);assert(value.payments[0].personId);payment.amountCents=1700;value=await run('upsert');assert.equal(value.payments.length,1);assert.equal(value.payments[0].amountCents,1700);value=await run('delete',{id:payment.id});assert.equal(value.payments.length,0);assert.deepEqual(db.root().persons,roster);
});
for(const key of ['haushoch','haustief','plusminus','mensch','sichern','fuchsjagd','lotterie','tiberius','tannenbaum','darts','tor'])test(key+': actual legacy controller books every physical type and undo restores game, money and both statistics',async()=>{
 const root=initial();root.currentEveningStartedAt=day;root.STRAFEN=catalog;root.strafPrices={g:.5,n:1,k:2,d:3,l1:1,l2:1,l3:1};root.persons.forEach((p,i)=>{p.strafen={};p.tisch=i?'T2':'T1';});root.dartsState={active:false};
 const db=database({[rootPath]:root}),a=fullApp(db);await a.select();a.c.KCKranzUI={...a.c.KCKranzUI,select:async()=>9};
 const starts={haushoch:()=>a.c.startHausGame('hoch'),haustief:()=>a.c.startHausGame('tief'),plusminus:()=>a.c.startPlusminusGame(),mensch:()=>a.c.startMenschGameFinal('A'),sichern:()=>a.c.startSichernGame(),fuchsjagd:()=>a.c.startFuchsjagdGame(),lotterie:()=>a.c.startLotterieGameFinal('A'),tiberius:()=>a.c.startTiberiusGameFinal('A'),tannenbaum:()=>a.c.startTannenbaumSetup(),darts:()=>a.c.startDartsGame(),tor:()=>a.c.startTorGame()};
 await starts[key]();if(key==='tor')a.run("torState.coinPending=false;torState.current='T1';persistState()");
 assert(a.run(key+'State.active'),key+' started');
 for(const [kind,pins,expected,penaltyKey] of kinds){
  const before=copy(a.run('getFirestoreState()'));
  if(key.startsWith('haus'))await a.c.hausThrow(key==='haushoch'?'hoch':'tief',kind==='kranz'?12:pins,kind==='gosse',0);
  else if(key==='plusminus')await a.c.applyPlusminusThrow(kind==='kranz'?12:pins,kind==='gosse');
  else if(['mensch','sichern','fuchsjagd'].includes(key))await a.c[{mensch:'applyMenschThrow',sichern:'sichernThrow',fuchsjagd:'applyFuchsjagdThrow'}[key]](kind==='kranz'?12:pins,kind==='miss'?'miss':'');
  else if(key==='lotterie'){a.run("lotterieEdit={person:'A',colIndex:0}");await a.c.confirmLotterieThrow(kind==='kranz'?12:pins,null,kind==='miss'?'miss':'');}
  else if(key==='tiberius')await a.c.handleTiberiusThrow(kind==='miss'?'durchgeworfen':kind==='kranz'?12:pins);
  else if(['tannenbaum','darts'].includes(key)){
   await a.c.gameInputThrow(key,kind==='kranz'?12:pins,kind==='gosse');
   if(penaltyKey){a.document.getElementById(key+'-penalty-player-select').value='A';await a.c[key==='darts'?'confirmDartsPenaltyPlayer':'confirmTannenbaumPenaltyPlayer']();}
  }else{
   if(kind==='pins')a.run('torState.selected='+JSON.stringify(Array.from({length:pins},(_,i)=>i+1)));
   const pending=a.c.torThrow(kind);for(let i=0;i<30&&!a.document.querySelector('.tor-person-backdrop')&&penaltyKey;i++)await new Promise(r=>setImmediate(r));
   if(penaltyKey){const modal=a.document.querySelector('.tor-person-backdrop');assert(modal);const buttons=[...modal.querySelectorAll('button')];buttons[0].onclick();buttons.find(b=>/Buchen/.test(b.textContent)).onclick();}
   await pending;
  }
  const after=copy(a.run('getFirestoreState()'));assert.equal(after.eveningCounters.throws,1,key+' '+kind+' throw recorded');assert.deepEqual(after.eveningCounters,expected,key+' '+kind+' physical metrics');
  if(penaltyKey){assert.equal(after.persons.find(p=>p.name===(kind==='gosse'?'A':'B')).strafen[penaltyKey],1,key+' '+kind+' fine');}
  if(['tannenbaum','darts','tor'].includes(key)&&!penaltyKey)assert.equal(after.personalThrows.rows.length,0,key+' unassigned normal throw');else assert.equal(after.personalThrows.rows.find(p=>p.name==='A').throws,1,key+' personal throw');
  const undo={haushoch:()=>a.c.undoHausThrow('hoch'),haustief:()=>a.c.undoHausThrow('tief'),plusminus:()=>a.c.undoPlusminusThrow(),mensch:()=>a.c.undoMenschThrow(),sichern:()=>a.c.undoSichernThrow(),fuchsjagd:()=>a.c.undoFuchsjagdThrow(),lotterie:()=>a.c.undoLotterieThrow(),tiberius:()=>a.c.undoLastTiberiusThrow(),tannenbaum:()=>a.c.undoLastTannenbaumThrow(),darts:()=>a.c.undoDartsAction(),tor:()=>a.c.undoTorThrow()};await undo[key]();
  const reverted=copy(a.run('getFirestoreState()'));assert.deepEqual(reverted.eveningCounters,copy(M.empty()),key+' '+kind+' undo counters');assert.equal(reverted.personalThrows.rows.length,0,key+' '+kind+' undo personal');assert(reverted.persons.every(p=>Object.values(p.strafen).every(n=>n===0)),key+' '+kind+' undo fines');
 }
 assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.throws,0);
});
test('plusminus ranks a gutter below a clean negative result, corrects losers and does not add a throw',async()=>{
 const root=initial();root.currentEveningStartedAt=day;root.STRAFEN=catalog;root.strafPrices={g:.5,n:1,k:2,d:3,l1:1,l2:1,l3:1};root.persons.forEach(p=>p.strafen={});const db=database({[rootPath]:root}),a=fullApp(db);await a.select();await a.c.startPlusminusGame();
 for(const [n,g] of [[1,false],[9,false],[1,false],[9,false],[9,false],[0,true],[9,false],[9,false],[1,false],[1,false]])await a.c.applyPlusminusThrow(n,g);
 assert(await a.c.KCSharedSync.waitForUpload());let s=db.root().plusminusState;assert(s.finished);assert.deepEqual(s.history[0].winnerNames,['A']);assert.equal(s.history[0].assigned[0].name,'B');assert.equal(db.root().eveningCounters.throws,10);
 a.c.openPlusminusSlotEdit('B',2);await a.c.confirmPlusminusSlotEdit(0,false);assert(await a.c.KCSharedSync.waitForUpload());s=db.root().plusminusState;assert.deepEqual(s.history[0].winnerNames,['B']);assert.equal(s.history[0].assigned[0].name,'A');assert.equal(db.root().eveningCounters.gutters,0);assert.equal(db.root().eveningCounters.throws,10);assert.equal(db.root().persons[0].strafen.d,1);assert.equal(db.root().persons[1].strafen.g,0);
});
test('booking toasts animate the actual full row, group recipients, deduplicate acknowledgments and count refunds down',()=>{
 const {document}=parseHTML('<html><body></body></html>'),timers=new Map(),frames=new Map();let n=0,at=0;
 const t={window:null,document,Intl,console,ACTIVE_CLUB:'Club',performance:{now:()=>at},setTimeout:fn=>{timers.set(++n,fn);return n;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++n,fn);return n;},cancelAnimationFrame:id=>frames.delete(id),getAvatarHtml:()=>'<span class="person-avatar">A</span>'};t.window=t;vm.createContext(t);for(const f of ['js/game-fine-policy.js','js/penalty-booking-toasts.js'])vm.runInContext(read(f),t);
 const root={currentEveningStartedAt:day,STRAFEN:catalog,strafPrices:{g:.5,n:1,k:2,d:3},persons:Array.from({length:10},(_,i)=>({name:'P'+i,strafTotal:0,strafen:{g:0,n:0,k:0,d:0},freeStrafen:[],gameFineBase:{otherNormalCents:0,otherTopCents:0,kingCents:0}}))},after=copy(root);after.syncOperation='sync_toast';after.persons.forEach(p=>{p.strafen.n=1;p.strafTotal=1;});
 t.KCPenaltyBookingToasts.committed(root,after);let host=document.getElementById('penalty-booking-toasts');assert.equal(host.querySelectorAll('article').length,6);assert.equal(host.querySelectorAll('article:first-child [data-booking-to]').length,catalog.length+3);assert.equal(host.querySelector('article:first-child [data-booking-from="0"][data-booking-to="1"]').textContent,'0');
 at=1000;for(const fn of [...frames.values()])fn(at);assert.equal(host.querySelector('[data-booking-to="1"]').textContent,'1');const html=host.innerHTML;t.KCPenaltyBookingToasts.committed(root,after);assert.equal(host.innerHTML,html);assert.equal(timers.size,1);
 const next=timers.values().next().value;timers.clear();next();host=document.getElementById('penalty-booking-toasts');assert.equal(host.querySelectorAll('article').length,4);assert.match(host.textContent,/P9/);
 for(const fn of [...timers.values()])fn();timers.clear();const refund=copy(after);refund.syncOperation='sync_refund';refund.persons[0].strafen.n=0;refund.persons[0].strafTotal=0;t.KCPenaltyBookingToasts.committed(after,refund);host=document.getElementById('penalty-booking-toasts');assert.match(host.textContent,/-1,00/);assert(host.querySelector('[data-booking-from="1"][data-booking-to="0"]'));
 const free=copy(refund);free.syncOperation='sync_free';free.persons[0].freeStrafen.push({id:'manual',amount:2,reason:'Manuell'});free.persons[0].strafTotal=2;const diff=t.KCPenaltyBookingToasts.diff(refund,free);assert.equal(diff[0].columns.find(c=>c.key==='free').value,200);
 assert.equal(t.KCPenaltyBookingToasts.diff(after,{...refund,currentEveningStartedAt:'new'}).length,0);
});
test('app-only booking toasts and both TV entry pages retain navigation, rotation and light design without Hauptapp button',()=>{
 const app=read('getraenke-abrechnung.html');assert(app.includes('js/penalty-booking-toasts.js'));
 for(const file of ['dashboard.html','dashboard-compat.html']){const html=read(file),{document}=parseHTML(html);assert(![...document.querySelectorAll('a,button')].some(el=>el.textContent.trim()==='Hauptapp'));assert(document.getElementById('fullscreen-btn'));assert(document.getElementById('game-select'));assert(!html.includes('js/penalty-booking-toasts.js'));assert(html.includes('css/dashboard-light.css'));}
});
test('actual Swinger Club Kranz button uses its physical rack rule without an unsupported numeric-value chooser',async()=>{
 const root=initial();root.currentEveningStartedAt=day;root.dartsState={active:false};root.persons.push({...copy(root.persons[0]),name:'C'});root.persons.forEach((p,i)=>p.tisch=i%2?'T2':'T1');
 const db=database({[rootPath]:root}),a=fullApp(db);await a.select();await a.c.indStart('swingerclub');assert(a.c.indGet('swingerclub').active);
 const button=[...a.document.querySelectorAll('#tab-swingerclub button')].find(b=>b.textContent==='Kranz (8)');assert(button);assert(!button.disabled);await a.run(button.getAttribute('onclick'));assert(await a.c.KCSharedSync.waitForUpload());
 const s=db.root().swingerclubState;assert.equal(s.history.at(-1).kind,'kranz');assert.deepEqual(s.history.at(-1).physicalThrow,{kind:'kranz',pins:8});assert.equal(db.root().eveningCounters.wreaths,1);assert.equal(db.root().eveningCounters.nines,0);assert.equal(db.root().eveningCounters.pins,8);
 await a.c.indAction('swingerclub','undo');assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.throws,0);
});
