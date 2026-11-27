const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+name.toLowerCase();
const source=read('tests/v215-shared-sync.cjs'),factory=source.slice(source.indexOf('function database('),source.indexOf("test('two devices increment"))+source.slice(source.indexOf('function fullApp('),source.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
const dashSrc=read('tests/v185-regression.cjs'),a=dashSrc.indexOf('function context(html){'),b=dashSrc.indexOf('async function settle(',a),dashboard=new Function('read','vm','parseHTML','assert','require','let sequence=0;const plain=x=>JSON.parse(JSON.stringify(x));'+dashSrc.slice(a,b)+';return dashboard;')(read,vm,parseHTML,assert,require);
async function app(){const root=initial();root.dartsState={active:false};root.persons=['A','B','C','D'].map((name,i)=>({...copy(root.persons[0]),name,tisch:i%2?'T2':'T1'}));const db=database({[rootPath]:root}),a=fullApp(db);await a.select();a.run("extraGameSettings.hochsprung={...KCExtraGames.defaults('hochsprung'),targets:[12,14]};extraGameSettings.guterschnitt={...KCExtraGames.defaults('guterschnitt'),targets:[2,3]};extraGameSettings.lattenzaun={...KCExtraGames.defaults('lattenzaun'),slats:21};hindernisSettings={target:30,baseCents:100,rules:[]}");return {...a,db};}
function tv(db){let receive;const d=dashboard({root:()=>db.root(),subscribe:(_,cb)=>{receive=cb;cb(db.root());return ()=>{};}});for(const f of ['js/game-player-rows.js','js/kranz-policy.js','js/games/extra-core.js','js/games/extra-view.js','js/games/individual-core.js','js/games/individual-view.js','js/games/table-games-core.js','js/game-overview.js']){vm.runInContext(read(f),d.c);Object.assign(d.c,d.c.window);}Object.defineProperty(d.document.getElementById('game-select'),'value',{value:'auto',writable:true});d.c.window.dashboardTest.connect('club','Test');return {...d,update:()=>receive(db.root())};}
function names(document,selector){return [...document.querySelectorAll(selector)].map(row=>{const cell=row.matches('strong')?row:row.querySelector('th,td'),clone=cell.cloneNode(true);for(const small of clone.querySelectorAll('small'))small.remove();return clone.textContent.replace(/🎳 Am Wurf/g,'').trim();});}
function selectors(key){return key==='lattenzaun'?['#tab-lattenzaun .extra-fence-row>div:first-child>strong','#game-body .extra-fence-row>div:first-child>strong']:key==='sichern'?['#sichern-board .sichern-card-top>strong','#game-body .tv-board>div[style*="grid-template-columns"]>div>strong:first-child']:[key==='blackjack'?'#tab-blackjack .tg-table-scroll tbody tr':key==='mensch'||key==='plusminus'?'#tab-'+key+' .game-compact-table tbody tr':'#tab-'+key+' .ind-table tbody tr','#game-body table:first-of-type tbody tr'];}
async function check(a,d,key,expected){assert(await a.c.KCSharedSync.waitForUpload());d.update();const [one,two]=selectors(key);assert.deepEqual(names(a.document,one),expected,key+' app');assert.deepEqual(names(d.document,two),expected,key+' dashboard');const before=copy(a.run('getFirestoreState()'));a.c.renderAll();d.c.window.dashboardTest.paint();assert.deepEqual(copy(a.run('getFirestoreState()')),before,'rendering must not mutate persisted data');assert(!a.document.querySelector('#tab-'+key+' tr.ind-current,#tab-'+key+' tr.current,#tab-'+key+' .sichern-current,#tab-'+key+' .extra-current'));if(key==='siebener'){
 const active=d.document.querySelector('#game-body tr.ind-current');
 assert.equal(active?.dataset.playerRow,expected[0]);
 assert.equal(active.getAttribute('aria-current'),'true');
 const s=a.c.indGet(key),open=a.c.KCIndividual.sevenColumns(s).filter(number=>!s.sheet[expected[0]][number]);
 assert.deepEqual([...d.document.querySelectorAll('.ind-seven-open b')].map(chip=>Number(chip.textContent)),Array.from(open));
 }else assert(!d.document.querySelector('#game-body tr.ind-current,#game-body tr.tg-current,#game-body .tv-current'));
 const s=a.c.gameSetupState(key),order=s.players||s.playerOrder||s.order;assert.deepEqual(copy(order),['A','B','C','D'],'frozen order is unchanged');}
const keys=['mensch','plusminus','sichern','blackjack','siebener','hindernis','bergundtal','guterschnitt','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend','lattenzaun'];
for(const key of keys)test(key+': real app and TV move rows with the actual turn, preserve inputs and undo to the original order',{timeout:60000},async()=>{
 const a=await app();if(key==='mensch')await a.c.startMenschGameFinal('A');else if(key==='plusminus')await a.c.startPlusminusGame();else if(key==='sichern'){a.document.getElementById('sichern-mode').value='solo';await a.c.startSichernGame();}else if(key==='blackjack')await a.c.startTableGame(key);else await a.c.indStart(key,key==='hindernis'?a.c.gameSetupNames(key)[0]:null);const d=tv(a.db);if(key==='lattenzaun')d.c.window.matchMedia=()=>({matches:true});await check(a,d,key,['A','B','C','D']);
 const roll=pins=>a.c.indAction(key,'throw',{kind:'pins',pins});
 if(key==='mensch'){
  const field=name=>Number(d.document.querySelector('[data-mensch-player="'+name+'"]').closest('[data-mensch-position]').dataset.menschPosition);
  const track=d.document.querySelector('.mensch-track');
  const fields=[...track.querySelectorAll('.mensch-field')];
  assert.equal(fields.length,36);
  assert.equal(new Set(fields.map(cell=>cell.style.gridColumn+'/'+cell.style.gridRow)).size,36);
  const cell=number=>[fields[number-1].style.gridColumn,fields[number-1].style.gridRow];
  assert.deepEqual([cell(1),cell(10),cell(19),cell(28),cell(36)],[['1','1'],['10','1'],['10','10'],['1','10'],['1','2']]);
  assert(fields[35].classList.contains('mensch-goal'));
  assert.deepEqual(['A','B','C','D'].map(field),[0,0,0,0]);
  assert.equal(track.querySelector('.mensch-active-field').dataset.menschPosition,'0');
  const portrait=track.querySelector('[data-mensch-player="A"] .mensch-pawn-head img');
  assert.match(portrait.getAttribute('src'),/^bilder\/a\.jpg$/);
  for(let i=0;i<4;i++)portrait.onerror();
  assert.equal(track.querySelector('[data-mensch-player="A"] .mensch-pawn-head').textContent,'A');
  await a.c.applyMenschThrow(6);await check(a,d,key,['A','B','C','D']);
  assert.equal(field('A'),6);
  assert.equal(d.document.querySelector('.mensch-active-field').dataset.menschPosition,'6');
  assert.equal(d.document.querySelector('.mensch-pawn.is-current').dataset.menschPlayer,'A');
  await a.c.applyMenschThrow(1);assert(await a.c.KCSharedSync.waitForUpload());d.update();
  assert.equal(field('A'),7);
  assert.equal(d.document.querySelector('.mensch-pawn.is-current').dataset.menschPlayer,'B');
  await a.c.applyMenschThrow(7);assert(await a.c.KCSharedSync.waitForUpload());d.update();
  assert.deepEqual(['A','B'].map(field),[0,7]);
  await a.c.undoMenschThrow();assert(await a.c.KCSharedSync.waitForUpload());d.update();
  assert.deepEqual(['A','B'].map(field),[7,0]);
 }
 else if(key==='plusminus')await a.c.applyPlusminusThrow(4);
 else if(key==='sichern'){await a.c.sichernThrow(4);await check(a,d,key,['A','B','C','D']);await a.c.sichernSave();}
 else if(key==='blackjack'){await a.c.tableAction(key,'throw',{kind:'pins',pins:4});await check(a,d,key,['A','B','C','D']);await a.c.tableAction(key,'stand');}
 else if(key==='siebener'){
  const assertTurn=async message=>{
   assert(await a.c.KCSharedSync.waitForUpload());d.update();
   assert(a.document.querySelector('#tab-siebener .ind-turn').textContent.includes(message));
   assert(d.document.querySelector('#game-body .ind-turn').textContent.includes(message));
  };
  await roll(5);await assertTurn('1 / 2 Würfe · 5');
  await a.c.indAction(key,'undo');await assertTurn('0 / 2 Würfe');
  await roll(3);await roll(4);await check(a,d,key,['A','B','C','D']);await a.c.indAction(key,'place',{column:7});
  await assertTurn('0 / 2 Würfe');
 }
 else if(key==='bergundtal'){
  await roll(6);await check(a,d,key,['A','B','C','D']);
  assert.equal(d.document.querySelector('.berg-tal-shot.is-high strong').textContent,'6');
  assert.equal(d.document.querySelector('.berg-tal-shot.is-low strong').textContent,'—');
  assert(!a.document.querySelector('.berg-tal-tv-throws'));
  await roll(3);
 }
 else if(key==='hochsprung'){for(const n of [4,4,4])await roll(n);}
 else if(key==='poker'){for(const n of [1,2,3,4])await roll(n);await check(a,d,key,['A','B','C','D']);await roll(5);}
 else if(key==='tausend'){for(const n of [1,2,3])await roll(n);await check(a,d,key,['A','B','C','D']);await a.c.indAction(key,'arrange',{order:[0,1,2]});}
 else if(key==='lattenzaun'){await roll(4);await check(a,d,key,['A','B','C','D']);await roll(6);}
 else await roll(4);
 await check(a,d,key,['B','C','D','A']);
 if(key==='lattenzaun'){for(const doc of [a.document,d.document])assert.equal(doc.querySelector('.extra-fence-last b').textContent,'6 Holz');}
 if(key==='bergundtal'){
  assert.equal(d.document.querySelector('.berg-tal-shot.is-result strong').textContent,'+3');
  assert.match(d.document.querySelector('.berg-tal-tv-throws h3').textContent,/Letzter Durchgang · A/);
 }
 if(key==='hochsprung'){
  assert.match(d.document.querySelector('.jump-tv-meter').textContent,/12 Holz.*Latte · 12/);
  await roll(2);assert(await a.c.KCSharedSync.waitForUpload());d.update();
  assert.match(d.document.querySelector('.jump-tv-meter').textContent,/^2 Holz.*Latte · 12/);
  for(const n of [2,2])await roll(n);await check(a,d,key,['C','D','A','B']);assert.equal(a.c.indGet(key).jumps.B.feeCents,120);await a.c.indAction(key,'undo');await check(a,d,key,['B','C','D','A']);assert.equal(a.c.indGet(key).jumps.B.feeCents,0);for(let i=0;i<3;i++)await a.c.indAction(key,'undo');}
 else if(key==='mensch')await a.c.undoMenschThrow();
 else if(key==='plusminus'){const first=a.document.querySelector('#tab-plusminus tbody tr');assert.equal(first.querySelector('td').textContent,'B');const free=[...first.querySelectorAll('.game-slot')].filter(x=>!x.disabled);assert.equal(free.length,5);assert(!a.document.querySelectorAll('#tab-plusminus tbody tr')[3].querySelector('.game-slot:not(.filled):not([disabled])'));await a.c.undoPlusminusThrow();}
 else if(key==='sichern')await a.c.undoSichernThrow();
 else if(key==='blackjack')await a.c.tableAction(key,'undo');
 else await a.c.indAction(key,'undo');
 await check(a,d,key,['A','B','C','D']);
});
test('Blackjack card editing follows the named player after card reveal rotates the table',{timeout:60000},async()=>{const a=await app();await a.c.startTableGame('blackjack');for(const name of ['A','B','C','D']){await a.c.tableAction('blackjack','throw',{kind:'pins',pins:4});await a.c.tableAction('blackjack','stand');}const d=tv(a.db);await a.c.tableAction('blackjack','card',{value:2});await check(a,d,'blackjack',['B','C','D','A']);const row=[...a.document.querySelectorAll('#tab-blackjack .tg-table-scroll tbody tr')].find(r=>r.querySelector('th').textContent==='A');assert.equal(row.querySelector('.bj-card-edit').getAttribute('onclick'),'tableEditCard(0)');await a.c.tableAction('blackjack','card',{value:3});await check(a,d,'blackjack',['C','D','A','B']);const rowB=[...a.document.querySelectorAll('#tab-blackjack .tg-table-scroll tbody tr')].find(r=>r.querySelector('th').textContent==='B');assert.equal(rowB.querySelector('.bj-card-edit').getAttribute('onclick'),'tableEditCard(1)');});
test('house-number tables keep their existing seat order even when the next player is B',{timeout:60000},async()=>{const a=await app(),d=tv(a.db);for(const mode of ['hoch','tief']){await a.c.startHausGame(mode);await a.c.hausThrow(mode,4,false,0);assert(await a.c.KCSharedSync.waitForUpload());d.update();const key='haus'+mode;assert.deepEqual(names(a.document,'#tab-'+key+' tbody tr'),['A','B','C','D']);assert.deepEqual(names(d.document,'#game-body .haus-player strong'),['A','B','C','D']);assert.equal(d.document.querySelector('#game-body .haus-score-row.is-current').dataset.hausName,'B');assert.equal(a.c.gameSetupState(key).currentPlayerIndex,1);}});

test('animated rows show the new booking in place, then slide into the game’s requested order',()=>{
 const {document}=parseHTML('<html><body><main></main></body></html>');
 const clock=new Map(),animations=[],window={};let serial=0,reduce=false,time=0,moveSeconds=1.2;
 vm.runInNewContext(read('js/game-player-rows.js'),{window,document});
 const {group,row,createMotion}=window.KCPlayerRows;
 const update=createMotion({schedule(fn,ms){const id=++serial;clock.set(id,{fn,ms});return id;},
  cancel:id=>clock.delete(id),reduced:()=>reduce,now:()=>time,timing:()=>({holdSeconds:1.9,moveSeconds})});
 const root=document.querySelector('main');
 function render(key,order,turn,values={},options={}){
  root.innerHTML='<table><tbody'+group(key,{id:'game'}, {turn,...options})+'>'+
   order.map(name=>'<tr'+row(name)+'><th>'+name+'</th><td>'+(values[name]||0)+'</td></tr>').join('')+'</tbody></table>';
  const body=root.querySelector('tbody');body.getClientRects=()=>[{}];if(options.extraHold)body.dataset.playerExtraHold=String(options.extraHold);
  for(const item of body.children){
   item.getBoundingClientRect=()=>({left:0,top:[...body.children].indexOf(item)*50});
   item.animate=(frames,settings)=>{const playback={currentTime:0};animations.push([item.dataset.playerRow,frames,settings,playback]);return playback;};
  }
  update(body);return body;
 }
 const names=body=>[...body.children].map(element=>element.dataset.playerRow);
 const release=()=>{const [id,entry]=[...clock.entries()][0];clock.delete(id);entry.fn();};
 render('mensch',['A','B','C'],1);
 let body=render('mensch',['B','C','A'],2,{A:7});
 assert.deepEqual(names(body),['A','B','C']);assert.equal(body.firstElementChild.lastElementChild.textContent,'7');
 assert.equal([...clock.values()][0].ms,1900);assert.equal(animations.length,0);
 time=300;
 body=render('mensch',['B','C','A'],2,{A:7});
 assert.equal(clock.size,1);assert.equal([...clock.values()][0].ms,1600);assert.deepEqual(names(body),['A','B','C']);
 time=1900;
 release();
 assert.deepEqual(names(body),['B','C','A']);
 assert.equal(animations.find(entry=>entry[0]==='A')[1].length,3);
 assert.equal(animations.find(entry=>entry[0]==='A')[2].duration,1200);
 assert(animations.some(entry=>entry[0]==='B'&&entry[1][0].transform==='translate(0px,50px)'));
 time+=300;
 body=render('mensch',['B','C','A'],2,{A:7});
 assert.equal(animations.at(-1)[3].currentTime,300);assert.deepEqual(names(body),['B','C','A']);
 render('lattenzaun',['A','B','C'],3);
 body=render('lattenzaun',['C','A','B'],4);
 assert.deepEqual(names(body),['A','B','C']);release();
 assert.deepEqual(names(body),['C','A','B']);
 render('lattenzaun',['A','B','C'],5);
 body=render('lattenzaun',['C','A','B'],4);
 assert.equal(clock.size,0);assert.deepEqual(names(body),['C','A','B']);
 reduce=true;
 body=render('lattenzaun',['B','C','A'],5);
 assert.equal(clock.size,0);assert.deepEqual(names(body),['B','C','A']);
 reduce=false;
 const beforeSimple=animations.length;
 render('abschreibung',['C','A','B'],1,{}, {simpleMotion:true});
 body=render('abschreibung',['A','B','C'],2,{C:96}, {simpleMotion:true});
 assert.equal(body.firstElementChild.dataset.playerRow,'C');
 assert.equal(body.firstElementChild.lastElementChild.textContent,'96');
 assert.equal([...clock.values()][0].ms,1900);
 release();
 assert.deepEqual(names(body),['A','B','C']);
 assert(animations.length>beforeSimple);
 assert(animations.slice(beforeSimple).every(entry=>entry[1].length===2&&entry[2].duration===220));
 render('lottokoenig',['A','B','C'],1);
 body=render('lottokoenig',['B','C','A'],2,{A:9},{extraHold:3700});
 assert.deepEqual(names(body),['A','B','C']);
 assert.equal([...clock.values()][0].ms,5600);
 release();assert.deepEqual(names(body),['B','C','A']);
 moveSeconds=0;
 const animated=animations.length;
 render('abschreibung',['A','B','C'],3,{}, {motionOnly:true});
 body=render('abschreibung',['B','C','A'],4,{}, {motionOnly:true});
 assert.equal([...clock.values()][0].ms,0);release();
 assert.deepEqual(names(body),['B','C','A']);
 assert.equal(animations.length,animated);
});

test('Pfälzerspiel flashes a strike increase beside every affected tally without replaying it on reload or undo',()=>{
 const {document}=parseHTML('<html><body><main></main></body></html>'),window={};
 let time=0,serial=0;
 const timers=new Map();
 vm.runInNewContext(read('js/game-player-rows.js'),{window,document});
 const {group,row,createMotion}=window.KCPlayerRows;
 const update=createMotion({now:()=>time,schedule(fn,ms){timers.set(++serial,{fn,at:time+ms});return serial;},
  cancel:id=>timers.delete(id),reduced:()=>true});
 const root=document.querySelector('main');
 function render(turn,counts){
  root.innerHTML='<table><tbody'+group('pfaelzer',{id:'game'},{turn})+'>'+
   ['A','B','C'].map((name,i)=>'<tr'+row(name)+'><th>'+name+'</th><td><span data-pfaelzer-gain="'+counts[i]+'" hidden></span></td></tr>').join('')+'</tbody></table>';
  const body=root.querySelector('tbody');body.getClientRects=()=>[{}];update(body);
  return [...body.querySelectorAll('[data-pfaelzer-gain]:not([hidden])')].map(node=>[node.closest('tr').dataset.playerRow,node.textContent]);
 }
 assert.deepEqual(render(3,[0,1,0]),[]);
 assert.deepEqual(render(4,[1,2,0]),[['A','+1'],['B','+1']]);
 time=500;
 assert.deepEqual(render(4,[1,2,0]),[['A','+1'],['B','+1']]);
 assert.equal(timers.size,1);
 assert.equal([...timers.values()][0].at,1300);
 time=1300;
 for(const [id,{fn}] of timers){timers.delete(id);fn();}
 assert.equal(root.querySelectorAll('[data-pfaelzer-gain]:not([hidden])').length,0);
 assert.deepEqual(render(3,[0,1,0]),[]);
 assert.deepEqual(render(4,[0,1,1]),[['C','+1']]);
 assert.deepEqual(render(3,[0,1,0]),[]);
});

test('TV scores keep counting across a redraw and never jump back when rows move',()=>{
 const {document}=parseHTML('<html><body><main data-score-game="abschreibung"></main></body></html>');
 const frames=[],window={};let time=0;
 vm.runInNewContext(read('js/game-player-rows.js'),{window,document});
 const {score,createCounters}=window.KCPlayerRows;
 const paint=createCounters({request:callback=>frames.push(callback),now:()=>time});
 const board=document.querySelector('main');
 board.getClientRects=()=>[{}];
 const render=(a,b,reverse=false)=>{
  const items=['<b'+score('A')+'>'+a+'</b>','<b'+score('B')+'>'+b+'</b>'];
  board.innerHTML=(reverse?items.reverse():items).join('');
  paint(board);return board.querySelectorAll('[data-tv-score]');
 };
 const flush=()=>frames.splice(0).forEach(callback=>callback());
 render(100,43);let scores=render(90,51);
 assert.deepEqual([...scores].map(n=>n.textContent),['100','43']);
 time=220;flush();
 assert.deepEqual([...scores].map(n=>n.textContent),['95','47']);
 scores=render(90,51);
 assert.deepEqual([...scores].map(n=>n.textContent),['95','47']);
 time=450;flush();
 assert.deepEqual([...scores].map(n=>n.textContent),['90','51']);
 scores=render(90,51,true);
 assert.deepEqual([...scores].map(n=>n.textContent),['51','90']);
 assert.equal(frames.length,0);
});

test('Hochsprung TV animates the new height once and keeps the animation phase on a redraw',()=>{
 const readFile=read('js/games/extra-view.js'),ctx={window:{}};
 vm.createContext(ctx);vm.runInContext(readFile,ctx);
 const fill=(id,from)=>parseHTML('<div class="jump-tv-fill" data-jump-throw="'+id+'" data-jump-turn="'+(id==='a'?1:2)+'" data-jump-from="'+from+'"></div>').document.querySelector('div');
 const before=fill('a','0%'),after=fill('b','25%');
 ctx.animateJumpMeter(before,after,1000);
 assert(after.classList.contains('jump-tv-fill-moving'));
 assert.equal(after.style.getPropertyValue('--jump-from'),'25%');
 const redrawn=fill('b','25%');ctx.animateJumpMeter(after,redrawn,1200);
 assert.equal(redrawn.style.getPropertyValue('--jump-delay'),'-200ms');
 const still=fill('b','25%');ctx.animateJumpMeter(redrawn,still,1700);
 assert(!still.classList.contains('jump-tv-fill-moving'));
 const undone=fill('a','0%');ctx.animateJumpMeter(after,undone,1250);assert(!undone.classList.contains('jump-tv-fill-moving'));
 assert.match(read('css/individual-games.css'),/#game-body \.jump-tv-fit-board/);
});
