const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:null,Intl,Date};c.window=c;vm.createContext(c);
for(const file of ['birthdays','evening-counters','evening-counter-view','penalty-statistics','shared-sync-core','dashboard-layout','dashboard-link'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),c);
const M=c.KCEveningCounters,G=c.KCSharedCore.games,copy=x=>JSON.parse(JSON.stringify(x)),empty=()=>copy(M.empty());
const initial=()=>({currentEveningStartedAt:'2026-11-27T19:00:00Z',persons:[{name:'A',present:true},{name:'B',present:true,isGuest:true}],eveningCounters:empty(),personalThrows:{schema:1,rows:[],partial:false,excluded:[]}});
function change(a,fn){const b=copy(a);fn(b);b.eveningCounters=M.transition(a,b,G);return b;}
const row=(s,name)=>copy(s.personalThrows.rows.find(r=>r.name===name)||null);
test('all games use the recorded individual thrower; team-only entries never invent one',()=>{
 for(const key of G){
  const entry={id:'roll',action:'throw',kind:'kranz',pins:12,name:'B'},state={id:'game',active:true,history:[entry]};
  if(key==='lotterie')state.throws={B:[12]};
  if(['haushoch','haustief','plusminus'].includes(key))state.rows={B:[{value:12}]};
  if(key==='mensch')state.throws={B:[{rawPins:12,pins:1}]};
  if(key==='tiberius')state.throws=[{rawValue:12,value:2,thrower:'B'}];
  if(key==='fuchsjagd')state.throws=[{rawPins:12,pins:3,name:'B'}];
  if(key==='sichern')state.throwHistory=[{rawPins:12,pins:9,name:'B'},{saved:true,name:'A'}];
  if(key==='tannenbaum')state.history=[{number:4,specialType:'kranz',thrower:'B'},{type:'manual-restore',number:9}];
  if(key==='darts'){state.history=[];state.roundThrows={T1:[{hit:'kranz',value:99,thrower:'B'}]};}
  const a=initial(),b=change(a,x=>x[key+'State']=state);
  assert.deepEqual(row(b,'B'),{name:'B',gutters:0,nines:0,wreaths:1,throws:1,pins:8},key);
  assert.equal(row(b,'A'),null,key);
  assert.deepEqual(row(change(b,()=>{}),'B'),row(b,'B'),key+' duplicate');
  const undone=change(b,x=>x[key+'State']={id:'game',active:true});assert.equal(row(undone,'B'),null,key+' undo');
  const cancelled=change(b,x=>x[key+'State']={id:'',active:false});assert.deepEqual(row(cancelled,'B'),row(b,'B'),key+' cancel');
 }
 let a=initial();a=change(a,x=>x.dartsState={id:'d',active:true,roundThrows:{T1:[{hit:'7'}]}});
 a=change(a,x=>x.torState={id:'t',active:true,history:[{team:'T1',pins:4,kind:'pins'}]});
 assert.equal(a.eveningCounters.pins,11);assert.equal(a.personalThrows.rows.length,0);
});
test('manual log counts actual thrower rather than recipients; corrections and game replacement preserve physical totals',()=>{
 let a=initial();a=change(a,x=>x.lotterieState={id:'1',active:true,throws:{A:[9]}});
 a=change(a,x=>x.lotterieState.throws.A[0]=12);
 a=change(a,x=>x.penaltyStatsLog=[{id:'manual',type:'9er',eveningCounterManual:true,thrower:'B',punished:['A'],eveningStartedAt:a.currentEveningStartedAt},{id:'game',type:'kranz',thrower:'B',punished:['A']}]);
 assert.deepEqual(row(a,'A'),{name:'A',gutters:0,nines:0,wreaths:1,throws:1,pins:8});
 assert.equal(row(a,'B').nines,1);
 a=change(a,x=>x.lotterieState={id:'2',active:true,throws:{A:[3]}});
 assert.equal(row(a,'A').pins,11);
 a=change(a,x=>x.eveningCounters=empty());assert.equal(row(a,'A').pins,11);
 const archive=copy(M.personalArchive(a.personalThrows));a=change(a,x=>{x.currentEveningStartedAt='2026-12-25T19:00:00Z';x.eveningResetOp='reset';});
 assert.equal(a.personalThrows.rows.length,0);assert.equal(a.personalThrows.partial,false);assert.equal(archive.rows[0].pins,11);
});
test('migration never guesses old throws, but tracks new ones and their undo',()=>{
 let a=initial();delete a.personalThrows;a.lotterieState={id:'old',active:true,throws:{A:[9]}};
 a=change(a,x=>x.lotterieState.throws.A.push(4));
 assert.equal(a.personalThrows.partial,true);assert.equal(row(a,'A').pins,4);
 a=change(a,x=>x.lotterieState.throws.A[0]=12);assert.equal(row(a,'A').pins,4);
 a=change(a,x=>x.lotterieState.throws.A.pop());assert.equal(row(a,'A'),null);
});
test('darts closure and reopen preserve named throw exactly once',()=>{
 let a=initial();a=change(a,x=>x.dartsState={id:'d',active:true,roundThrows:{T1:[{hit:'9er',thrower:'A'}]}});
 const original=copy(a.dartsState.roundThrows);
 a=change(a,x=>{x.dartsState.history=[{undoSnapshot:{roundThrows:original}}];x.dartsState.roundThrows={};});
 assert.equal(row(a,'A').nines,1);
 a=change(a,x=>{x.dartsState.history=[];x.dartsState.roundThrows=original;});assert.equal(row(a,'A').nines,1);
});
test('annual uses only archive snapshots, deduplicates, flags historic and partial evenings, and honors resets',()=>{
 const day='2026-11-27T19:00:00Z',base={category:'strafen',status:'closed',members:[{name:'A',status:'present'}],eveningStartedAt:day,date:day,closedAt:'2026-11-27T22:00:00Z'};
 const recorded={...base,personalThrows:{schema:1,partial:false,rows:[{name:'A',gutters:1,nines:1,wreaths:1,throws:3,pins:17}]}};
 const historic={...base,eveningStartedAt:'2026-10-30T19:00:00Z',members:[{name:'A',status:'present'},{name:'B',status:'present'}]};
 const dup={...recorded,closedAt:'2026-11-27T21:00:00Z'};
 const annual=(settings,custom=false,from='',to='')=>copy(c.KCPersonalThrowsView.annual([recorded,historic,dup,{...base,category:'drinks'}],settings,custom,from,to,[]));
 let data=annual(null);const a=data.rows.find(r=>r.name==='A'),b=data.rows.find(r=>r.name==='B');assert.equal(a.pins,17);assert.equal(a.perThrow,17/3);assert.equal(a.best,17);assert.equal(a.perEvening,17);assert.equal(a.missing,1);assert.equal(b.pins,undefined);assert.equal(b.coverage,'Nicht erfasst');assert.equal(data.unknown,1);
 data=annual({mode:'date',startDate:'2026-11-01'});assert.equal(data.rows.length,1);assert.equal(data.unknown,0);
 const baseline={schema:1,rows:[{name:'A',gutters:1,nines:1,wreaths:0,throws:2,pins:9}]};
 data=annual({mode:'now',startAt:'2026-11-27T20:00:00Z',baseline:{sessionKey:c.KCPenaltyStats.key(day,'2026-11-27'),personalThrows:baseline}});
 assert.equal(data.rows[0].pins,8);assert.equal(data.rows[0].throws,1);assert.equal(data.rows[0].wreaths,1);
});
test('direct dashboard projection transfers personal values without recalculating and rejects stale sequence',()=>{
 let root=initial();root=change(root,x=>x.lotterieState={id:'g',throws:{A:[9]}});const link=c.KCDashboardLink;
 const firebase={...initial(),currentEveningStartedAt:root.currentEveningStartedAt,tabletSequence:2,syncRevision:5};
 const frame={sequence:3,baseEvening:root.currentEveningStartedAt,baseRevision:5,state:link.project(root)};
 assert.equal(row(link.reconcile(firebase,frame),'A').pins,9);
 assert.equal(row(link.reconcile({...firebase,tabletSequence:3},frame),'A'),null);
});
test('TV leaderboard renders ranks, avatars, player colors, attributed total and permanent scope notice',()=>{
 const {parseHTML}=require('linkedom'),{document}=parseHTML(fs.readFileSync('dashboard.html','utf8'));
 const tv={window:null,document,Intl,Date};tv.window=tv;vm.createContext(tv);
 for(const file of ['evening-counters','evening-counter-view','player-colors'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),tv);
 const people=[{name:'A',present:true,playerColor:'#123456'},{name:'B',present:true,isGuest:true,playerColor:'#654321'}];
 const value={schema:1,partial:false,rows:[{name:'A',nines:1,wreaths:0,pins:9},{name:'B',nines:0,wreaths:2,pins:16}]};
 tv.KCPersonalThrowsView.tv(value,people,()=>document.createElement('img'));
 const panel=document.getElementById('dashboard-panel-personal');
 assert.deepEqual([...panel.querySelectorAll('tbody tr')].map(r=>r.dataset.personalName),['B','A']);
 assert.equal(panel.querySelectorAll('img').length,2);assert.match(panel.querySelector('tbody th').style.borderLeft,/#654321/);
 assert.equal(panel.querySelector('tfoot td:last-child').textContent,'25');
 assert.match(panel.textContent,/Teamwürfe ohne festen Werfer sind nicht enthalten/);
 value.rows[0].pins=20;tv.KCPersonalThrowsView.tv(value,people,()=>document.createElement('img'));
 assert.deepEqual([...panel.querySelectorAll('tbody tr')].map(r=>r.dataset.personalName),['A','B']);
});
