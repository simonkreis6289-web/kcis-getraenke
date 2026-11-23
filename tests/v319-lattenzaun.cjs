const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const src=read('tests/v230-player-rows.cjs'),{app,tv}=new Function('require','__dirname',src.slice(0,src.indexOf('const keys='))+';return {app,tv};')(require,__dirname);
const marked=doc=>doc.querySelector('.extra-fence-next-thrower .extra-fence-name strong')?.textContent;

test('Lattenzaun shares personal row colors and current-player marking in app and TV, including Next and Undo',{timeout:60000},async()=>{
 const a=await app();
 a.run("persons.find(p=>p.name==='A').playerColor='#fde100';persons.find(p=>p.name==='B').playerColor='#004d9d';persistState()");
 assert(await a.c.KCSharedSync.waitForUpload());
 await a.c.indStart('lattenzaun');assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db);
 d.c.window.matchMedia=()=>({matches:true});d.update();
 const verify=name=>{
  for(const doc of [a.document,d.document]){
   assert.equal(marked(doc),name);
   assert.equal(doc.querySelector('.extra-fence-next-thrower').getAttribute('aria-current'),'true');
   for(const [player,color] of [['A','#fde100'],['B','#004d9d']]){
    const row=[...doc.querySelectorAll('.extra-fence-row')].find(row=>row.querySelector('strong').textContent===player);
    assert.equal(row.style.getPropertyValue('--player-chart-color'),color);
    assert.match(row.style.getPropertyValue('--player-chart-fill'),/^#[a-f0-9]{6}$/);
   }
  }
 };
 verify('A');
 await a.c.gameNextThrower('lattenzaun');assert(await a.c.KCSharedSync.waitForUpload());d.update();verify('B');
 for(const doc of [a.document,d.document])assert.equal(doc.querySelector('.extra-fence-row strong').textContent,'B');
 assert.equal(a.db.root().lattenzaunState.previous,null);assert(a.db.root().lattenzaunState.history.every(e=>e.action==='next'));
 await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:6});assert(await a.c.KCSharedSync.waitForUpload());d.update();verify('C');
 const before=copy(a.db.root().lattenzaunState);
 await a.c.gameNextThrower('lattenzaun');assert(await a.c.KCSharedSync.waitForUpload());d.update();verify('D');
 for(const doc of [a.document,d.document])assert.equal(doc.querySelector('.extra-fence-row strong').textContent,'D');
 assert.deepEqual(a.db.root().lattenzaunState.previous,before.previous);assert.deepEqual(a.db.root().lattenzaunState.scores,before.scores);
 await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:4});assert(await a.c.KCSharedSync.waitForUpload());
 assert.equal(a.db.root().lattenzaunState.scores.D,2,'the skipped turn keeps B’s six as the real comparison throw');
 await a.c.indAction('lattenzaun','undo');await a.c.indAction('lattenzaun','undo');assert(await a.c.KCSharedSync.waitForUpload());d.update();verify('C');
 const finished={...copy(a.db.root().lattenzaunState),active:false,finished:true};
 for(const dashboard of [false,true])assert.equal(parseHTML(a.c.renderExtraGameBoard(finished,{dashboard})).document.querySelector('.extra-fence-next-thrower'),null);
 a.c.KCTabletSync.begin('other');
});

test('Next triggers an immediate row flight from the shared renderer before any new throw',()=>{
 const c={Intl,Date};c.window=c;vm.createContext(c);
 for(const file of ['js/player-colors.js','js/game-player-rows.js','js/kranz-policy.js','js/games/extra-core.js','js/games/extra-view.js'])vm.runInContext(read(file),c);
 const people=['A','B','C','D'].map(name=>({name,present:true})),ctx={people,catalog:[],now:'2026-11-23T19:00:00Z',eveningStartedAt:'2026-11-23T19:00:00Z'};
 let s=c.KCExtraGames.command(c.KCExtraGames.empty('lattenzaun'),{gameKey:'lattenzaun',action:'start',gameId:'indgame_fence',opId:'ind_start_fence',expectedRevision:0,players:people.map(p=>p.name),config:c.KCExtraGames.defaults('lattenzaun')},ctx).state;
 const {document}=parseHTML('<html><body><main></main></body></html>'),tasks=new Map(),animations=[];let id=0;
 c.document=document;
 const update=c.KCPlayerRows.createMotion({schedule(fn,delay){tasks.set(++id,{fn,delay});return id;},cancel:key=>tasks.delete(key),reduced:()=>false,timing:()=>({holdSeconds:2,moveSeconds:.8})});
 const render=()=>{
  const main=document.querySelector('main');main.innerHTML=c.renderExtraGameBoard(s);
  const parent=main.querySelector('.extra-fences');parent.getClientRects=()=>[{}];
  [...parent.children].forEach((row,index)=>{row.getBoundingClientRect=()=>({left:0,top:[...parent.children].indexOf(row)*64});row.animate=frames=>{animations.push(frames);return {};};});
  update(parent);return parent;
 };
 render();s=c.KCExtraGames.command(s,{gameKey:'lattenzaun',gameId:s.id,action:'next',opId:'ind_next_fence',expectedRevision:s.revision},ctx).state;
 const parent=render();assert.equal(tasks.size,1);const task=[...tasks.values()][0];assert.equal(task.delay,0);
 task.fn();assert.deepEqual([...parent.children].map(row=>row.dataset.playerRow),['B','C','D','A']);assert(animations.length>0);
 assert.equal(parent.querySelector('[aria-current="true"]').dataset.playerRow,'B');
 assert.equal(s.previous,null);assert.equal(s.history.length,1);
});
