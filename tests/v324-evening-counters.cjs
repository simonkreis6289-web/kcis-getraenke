const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context={window:{}};
vm.createContext(context);
for(const path of ['js/evening-counters.js','js/dashboard-layout.js','js/shared-sync-core.js'])vm.runInContext(fs.readFileSync(path,'utf8'),context);
const M=context.window.KCEveningCounters,L=context.window.KCDashboardLayout,G=context.window.KCSharedCore.games;
const plain=x=>JSON.parse(JSON.stringify(x));
const empty=()=>plain(M.empty());
const root=(key,state,counts=empty())=>({eveningCounters:counts,[key+'State']:state});
const update=(a,b)=>plain(M.transition(a,b,G));
test('all five metrics reflect actual pins, not game scoring',()=>{
 assert.deepEqual(plain(M.roll(12,'kranz')),{gutters:0,nines:0,wreaths:1,throws:1,pins:8});
 assert.deepEqual(plain(M.roll(9,'kranz')),{gutters:0,nines:0,wreaths:1,throws:1,pins:8});
 assert.deepEqual(plain(M.roll(9,'gosse')),{gutters:1,nines:0,wreaths:0,throws:1,pins:0});
 assert.deepEqual(plain(M.roll(0,'miss')),{gutters:0,nines:0,wreaths:0,throws:1,pins:0});
});
test('every game extracts physical throws, ignores non-throw actions and supports undo',()=>{
 for(const key of G){
  const entry={action:'throw',kind:'kranz',pins:12};
  let state={id:'game',active:true,history:[entry,{action:'next'}]};
  if(key==='sechstage'||key==='tor')state.history=[entry];
  if(key==='lotterie')state.throws={A:[12]};
  if(['haushoch','haustief','plusminus'].includes(key))state.rows={A:[{value:12}]};
  if(key==='mensch')state.throws={A:[{rawPins:12,pins:2}]};
  if(key==='tiberius')state.throws=[{rawValue:12,value:1}];
  if(key==='fuchsjagd')state.throws=[{rawPins:12,pins:3}];
  if(key==='sichern')state.throwHistory=[{rawPins:12,pins:9},{saved:true}];
  if(key==='tannenbaum')state.history=[{number:9,specialType:'kranz'},{type:'manual-restore',number:9}];
  if(key==='darts'){state.history=[];state.roundThrows={T1:[{hit:'kranz',value:99}]};}
  const a=root(key,{id:'game',active:true}),b=root(key,state);
  b.eveningCounters=update(a,b);
  assert.deepEqual(b.eveningCounters,{gutters:0,nines:0,wreaths:1,throws:1,pins:8},key);
  assert.deepEqual(update(b,b),b.eveningCounters,key+' duplicate');
  assert.deepEqual(update(b,root(key,{id:'game',active:true},b.eveningCounters)),empty(),key+' undo');
  assert.deepEqual(update(b,root(key,{id:'',active:false},b.eveningCounters)),b.eveningCounters,key+' reset game');
 }
});
test('correction replaces previous value without adding a throw',()=>{
 const a=root('lotterie',{id:'1',throws:{A:[9]}},{gutters:0,nines:1,wreaths:0,throws:1,pins:9});
 const b=root('lotterie',{id:'1',throws:{A:[12]}},a.eveningCounters);
 assert.deepEqual(update(a,b),{gutters:0,nines:0,wreaths:1,throws:1,pins:8});
});
test('darts round closure and reopening do not duplicate or remove throws',()=>{
 const a=root('darts',{startedAt:'1',active:true,roundThrows:{T1:[{hit:'7',value:15}]}},{gutters:0,nines:0,wreaths:0,throws:1,pins:7});
 const b=root('darts',{startedAt:'1',active:true,history:[{undoSnapshot:{roundThrows:a.dartsState.roundThrows}}],roundThrows:{}},a.eveningCounters);
 assert.deepEqual(update(a,b),a.eveningCounters);
 assert.deepEqual(update(b,a),a.eveningCounters);
});
test('manual special throws are distinct from penalty recipients and reset on new evening',()=>{
 const a={eveningCounters:empty(),penaltyStatsLog:[],currentEveningStartedAt:'1'};
 const b={...a,penaltyStatsLog:[{id:'a',type:'Kranz',eveningCounterManual:true,eveningStartedAt:'1',punished:['A','B']},{id:'b',type:'9er',eveningStartedAt:'1'}]};
 b.eveningCounters=update(a,b);
 assert.deepEqual(b.eveningCounters,{gutters:0,nines:0,wreaths:1,throws:1,pins:8});
 assert.deepEqual(update(b,{...b,eveningResetOp:'new',currentEveningStartedAt:'2'}),empty());
});
test('five active panels occupy four slots with exactly one configurable pair',()=>{
 for(const a of L.keys)for(const b of L.keys){
  if(a===b)continue;
  const settings=L.defaults();for(const key of L.keys)settings.panels[key].enabled=true;
  settings.rotationPair=[a,b];settings.panels[a].seconds=3;settings.panels[b].seconds=8;
  const resolved=L.resolve(settings),groups=Object.values(resolved.groups);
  assert.deepEqual(groups.map(x=>x.length).sort(),[1,1,1,2]);
  const pair=groups.find(x=>x.length===2);
  assert.deepEqual([...pair].sort(),[a,b].sort());
  assert.notEqual(L.cycle(pair,resolved.settings,0).key,L.cycle(pair,resolved.settings,resolved.settings.panels[pair[0]].seconds*1000).key);
 }
 assert.equal(L.resolve(null).count,4);
});
test('direct link forwards all counters and Firebase wins over stale direct data',()=>{
 vm.runInContext(fs.readFileSync('js/dashboard-link.js','utf8'),context);
 const direct=context.window.KCDashboardLink;
 const firebase={currentEveningStartedAt:'night',tabletSequence:3,syncRevision:5,eveningCounters:empty()};
 const next={...firebase,eveningCounters:{gutters:1,nines:2,wreaths:3,throws:10,pins:42}};
 const frame={sequence:4,baseEvening:'night',baseRevision:5,state:direct.project(next)};
 assert.deepEqual(plain(direct.reconcile(firebase,frame).eveningCounters),next.eveningCounters);
 assert.deepEqual(plain(direct.reconcile({...firebase,tabletSequence:4},frame).eveningCounters),empty());
});
test('dashboard panel moves swap groups with five enabled',()=>{
 const s=L.defaults();for(const k of L.keys)s.panels[k].enabled=true;
 s.rotationPair=['counters','gutters'];
 const target=L.move(s,'seating','right-top');
 assert.equal(target.panels.seating.position,'right-top');
 assert.equal(target.panels.counters.position,target.panels.gutters.position);
 assert.deepEqual(Object.values(L.resolve(target).groups).map(x=>x.length).sort(),[1,1,1,2]);
});
test('individual resets exclude old throws from subsequent correction and undo, not new rolls',()=>{
 const a=root('lotterie',{id:'g',throws:{A:[9]}},{gutters:0,nines:1,wreaths:0,throws:1,pins:9});
 const reset={...a,eveningCounters:{...a.eveningCounters,pins:100,nines:0},eveningCounterExcluded:M.exclude(a,G,['pins','nines'])};
 reset.eveningCounters=update(a,reset);
 const edited={...reset,lotterieState:{id:'g',throws:{A:[12,9]}}};
 edited.eveningCounters=update(reset,edited);
 assert.deepEqual(edited.eveningCounters,{gutters:0,nines:1,wreaths:1,throws:2,pins:109});
 const undone={...edited,lotterieState:{id:'g',throws:{A:[null,9]}}};
 undone.eveningCounters=update(edited,undone);
 assert.deepEqual(undone.eveningCounters,{gutters:0,nines:1,wreaths:0,throws:1,pins:109});
 const replacement={...undone,lotterieState:{id:'g',throws:{A:[9,9]}}};
 assert.deepEqual(update(undone,replacement),{gutters:0,nines:2,wreaths:0,throws:2,pins:118});
});
test('actual tablet UI books, corrects, resets and uploads counters to Firebase exactly once',{timeout:60000},async()=>{
 const {parseHTML}=require('linkedom'),read=p=>fs.readFileSync(p,'utf8'),copy=x=>x===undefined?undefined:plain(x),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
 const source=read('tests/v215-shared-sync.cjs'),factory=source.slice(source.indexOf('function database('),source.indexOf("test('two devices increment"))+source.slice(source.indexOf('function fullApp('),source.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
 const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
 const db=database({[rootPath]:initial()}),a=fullApp(db);await a.select();
 const counts=()=>plain(a.run('eveningCounters'));
 await a.c.indStart('bergundtal');
 await a.c.indAction('bergundtal','throw',{kind:'pins',pins:9});
 assert.deepEqual(counts(),{gutters:0,nines:1,wreaths:0,throws:1,pins:9});
 await a.c.indAction('bergundtal','undo');
 assert.deepEqual(counts(),empty());
 await a.c.indAction('bergundtal','throw',{kind:'pins',pins:3});
 await a.c.startHausGame('hoch');await a.c.hausThrow('hoch',0,true,0);
 assert.deepEqual(counts(),{gutters:1,nines:0,wreaths:0,throws:2,pins:3});
 assert.equal(a.document.querySelector('.kc-counter-app [data-evening-counter=pins]').textContent,'3');
 await a.c.KCSharedSync.waitForUpload();assert.deepEqual(db.root().eveningCounters,counts());
 a.c.KCEveningCounterView.edit();
 const input=a.document.querySelector('#evening-counter-editor input[name=pins]');input.value='42';input.oninput();
 await a.document.querySelector('[data-counter-save]').onclick();
 assert.equal(counts().pins,42);
 assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.pins,42);
 await a.c.undoHausThrow('hoch');assert.equal(counts().throws,1);assert.equal(counts().gutters,0);assert.equal(counts().pins,42);
 a.c.openPenaltyQuick('gosse');a.run("quickPenaltySelectedPersons.add('A')");await a.c.confirmQuickPenalty();assert.equal(counts().gutters,1);assert.equal(counts().throws,2);assert.equal(counts().pins,42);
 a.c.KCEveningCounterView.edit();a.document.querySelector('[data-counter-reset]').onclick();await a.document.querySelector('[data-counter-save]').onclick();assert.deepEqual(counts(),empty());
 const settings=a.document.getElementById('dashboard-show-counters');settings.checked=true;settings.onchange();assert(a.document.getElementById('dashboard-rotation-pair-0'));assert(await a.c.KCDashboardSettingsApp.save());assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().dashboardSettings.panels.counters.enabled,true);
 assert(await a.c.startNewKegelabend());assert.deepEqual(counts(),empty());
 assert(await a.c.KCSharedSync.waitForUpload());assert.deepEqual(db.root().eveningCounters,empty());assert.equal(db.root().dashboardSettings.panels.counters.enabled,true);
});
test('TV paints five individual SVG pictograms and animates only increasing values',()=>{
 const {parseHTML}=require('linkedom'),{document}=parseHTML(fs.readFileSync('dashboard.html','utf8'));
 const ctx={document,console,Intl,Date,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(){},addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);
 for(const name of ['evening-counters','evening-counter-view','dashboard-layout','dashboard-layout-tv'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
 const settings=ctx.KCDashboardLayout.defaults();for(const key of ctx.KCDashboardLayout.keys)settings.panels[key].enabled=true;
 ctx.KCDashboardLayoutTV.apply(settings);
 assert.equal(document.querySelectorAll('.side .panel:not([hidden])').length,4);
 ctx.KCEveningCounterView.paint(empty());const panel=document.getElementById('dashboard-panel-counters');
 assert.equal(panel.querySelectorAll('svg').length,5);
 const pins=panel.querySelector('[data-evening-counter=pins]');
 ctx.KCEveningCounterView.paint({...empty(),pins:8});
 assert.equal(pins.textContent,'8');assert(pins.classList.contains('counter-up'));
 ctx.KCEveningCounterView.paint(empty());assert.equal(pins.textContent,'0');assert(!pins.classList.contains('counter-up'));
});
