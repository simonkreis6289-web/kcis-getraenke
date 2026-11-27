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
test('all 4096 assignments of six tables preserve their individually selected positions',()=>{
 for(let assignment=0;assignment<4096;assignment++){
  const settings=L.defaults();
  for(const [i,key] of L.keys.entries()){settings.panels[key].enabled=true;settings.panels[key].position=L.slots[(assignment>>(2*i))&3];settings.panels[key].seconds=i+1;}
  settings.rotationPair=['drinks','seating']; // ignored legacy V324 setting
  const resolved=L.resolve(settings);
  for(const slot of L.slots){
   const expected=L.keys.filter(key=>settings.panels[key].position===slot);
   assert.deepEqual(plain(resolved.groups[slot]),plain(expected));
   let elapsed=0;
   for(const key of expected){assert.equal(L.cycle(resolved.groups[slot],resolved.settings,elapsed).key,key);elapsed+=settings.panels[key].seconds*1000;}
   if(expected.length)assert.equal(L.cycle(resolved.groups[slot],resolved.settings,elapsed).key,expected[0]);
  }
  assert(!Object.hasOwn(resolved.settings,'rotationPair'));
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
test('changing one table position never moves any other table when all six are enabled',()=>{
 const s=L.defaults();for(const key of L.keys)s.panels[key].enabled=true;
 let target=s;
 for(const key of L.keys){const before=target;target=L.move(target,key,'left-top');for(const other of L.keys.filter(k=>k!==key))assert.equal(target.panels[other].position,before.panels[other].position);}
 assert.equal(L.resolve(target).groups['left-top'].length,6);
 target=L.move(target,'seating','left-bottom');
 assert.equal(L.resolve(target).groups['left-top'].length,5);
 assert.deepEqual(plain(L.resolve(target).groups['left-bottom']),['seating']);
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
 const personal=()=>plain(a.run('personalThrows'));
 await a.c.indStart('bergundtal');
 await a.c.indAction('bergundtal','throw',{kind:'pins',pins:9});
 assert.deepEqual(counts(),{gutters:0,nines:1,wreaths:0,throws:1,pins:9});
 assert.equal(personal().rows.reduce((n,p)=>n+p.nines,0),1);
 await a.c.indAction('bergundtal','undo');
 assert.deepEqual(counts(),empty());assert.equal(personal().rows.length,0);
 await a.c.indAction('bergundtal','throw',{kind:'pins',pins:3});
 await a.c.startHausGame('hoch');await a.c.hausThrow('hoch',0,true,0);
 assert.deepEqual(counts(),{gutters:1,nines:0,wreaths:0,throws:2,pins:3});
 assert.equal(a.document.querySelector('.kc-counter-app [data-evening-counter=pins]').textContent,'3');
 await a.c.KCSharedSync.waitForUpload();assert.deepEqual(db.root().eveningCounters,counts());assert.deepEqual(db.root().personalThrows,personal());
 assert.deepEqual(plain(a.c.getStrafenSnapshot().personalThrows.rows),personal().rows);
 a.c.KCEveningCounterView.edit();
 assert.equal(a.document.querySelectorAll('#evening-counter-editor .kc-counter-edit-icon svg').length,5);assert.equal(a.document.querySelectorAll('#evening-counter-editor button.kc-counter-edit-reset').length,5);
 const input=a.document.querySelector('#evening-counter-editor input[name=pins]');input.value='42';input.oninput();
 await a.document.querySelector('[data-counter-save]').onclick();
 assert.equal(counts().pins,42);
 assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().eveningCounters.pins,42);
 await a.c.undoHausThrow('hoch');assert.equal(counts().throws,1);assert.equal(counts().gutters,0);assert.equal(counts().pins,42);
 a.c.openPenaltyQuick('gosse');a.run("quickPenaltySelectedPersons.add('A')");await a.c.confirmQuickPenalty();assert.equal(counts().gutters,1);assert.equal(counts().throws,2);assert.equal(counts().pins,42);
 a.c.KCEveningCounterView.edit();a.document.querySelector('[data-counter-reset]').onclick();await a.document.querySelector('[data-counter-save]').onclick();assert.deepEqual(counts(),empty());
 const settings=a.document.getElementById('dashboard-show-counters');settings.checked=true;settings.onchange();assert.equal(a.document.getElementById('dashboard-rotation-pair-0'),null);const personalToggle=a.document.getElementById('dashboard-show-personal');personalToggle.checked=true;personalToggle.onchange();for(const key of a.c.KCDashboardLayout.keys){const select=a.document.getElementById('dashboard-position-'+key);for(const option of select.querySelectorAll('option')){if(option.value==='left-top')option.setAttribute('selected','');else option.removeAttribute('selected');}select.onchange();}assert(await a.c.KCDashboardSettingsApp.save());assert(await a.c.KCSharedSync.waitForUpload());assert.equal(db.root().dashboardSettings.panels.counters.enabled,true);assert(Object.values(db.root().dashboardSettings.panels).every(p=>p.position==='left-top'));
 assert(await a.c.startNewKegelabend());assert.deepEqual(counts(),empty());assert.deepEqual(personal().rows,[]);assert.equal(personal().partial,false);
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
