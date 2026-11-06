const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const previous=read('tests/v187-regression.cjs'),gameFixture=new Function('require','__dirname',previous.slice(0,previous.indexOf("test('every start"))+';return fixture;')(require,__dirname);
function viewer({width=1450,height=700,limits={1:19,2:29,3:25},horizontal=false}={}){
 const {document,window:dom}=parseHTML(read('dashboard.html')),events={},frames=new Map(),fontsEvents={},viewportEvents={},observed=[];let frameId=0,fontReady;
 const fonts={ready:{then:fn=>{fontReady=fn;}},addEventListener:(name,fn)=>fontsEvents[name]=fn};Object.defineProperty(document,'fonts',{value:fonts});
 const box=document.getElementById('dashboard-rules-scroll'),text=document.getElementById('dashboard-rules-content'),size={width,height},metrics={limits,horizontal};
 const limit=()=>metrics.limits[Number(text.style.columnCount)||1],over=()=>parseFloat(text.style.fontSize)>limit();
 for(const el of [box,text]){Object.defineProperty(el,'clientWidth',{get:()=>size.width});Object.defineProperty(el,'clientHeight',{get:()=>size.height});}
 Object.defineProperty(text,'scrollHeight',{get:()=>size.height+(over()&&!metrics.horizontal?100:0)});Object.defineProperty(text,'scrollWidth',{get:()=>size.width+(over()&&metrics.horizontal?100:0)});
 const c={document,window:{addEventListener:(key,fn)=>(events[key]??=[]).push(fn),requestAnimationFrame:fn=>{const id=++frameId;frames.set(id,fn);return id;},visualViewport:{addEventListener:(key,fn)=>viewportEvents[key]=fn},ResizeObserver:class{constructor(fn){this.notify=fn;observed.push(this);}observe(el){this.element=el;}}},console,crypto:require('node:crypto').webcrypto};
 vm.createContext(c);vm.runInContext(read('js/games/individual-core.js'),c);vm.runInContext(read('js/game-rules.js'),c);
 return {c,document,dom,box,text,size,metrics,events,frames,fontsEvents,viewportEvents,observed,fontReady:()=>fontReady(),flush:()=>{for(const [id,fn] of [...frames]){frames.delete(id);fn();}},open:(gameKey='sechstage',token=gameKey,config)=>c.window.KCGameRules.renderDashboard({gameKey,open:true,token,rulesConfig:config})};
}
test('all four complete rule popups fit measured bounds and keep their text, including all obstacle rows',()=>{
 for(const key of ['sechstage','gluecksspirale','siebener','hindernis']){
  const f=viewer();f.open(key);assert.equal(f.text.innerHTML,f.c.window.KCGameRules.content(key));assert(parseFloat(f.text.style.fontSize)<=29);assert(parseFloat(f.text.style.fontSize)>28);assert.equal(f.text.style.columnCount,'2');assert(f.text.scrollHeight<=f.text.clientHeight);assert(f.text.scrollWidth<=f.text.clientWidth);
  if(key==='hindernis')assert.equal(f.text.querySelectorAll('tbody tr').length,17);
 }
});
test('horizontal column overflow also shrinks the font instead of cutting rules off',()=>{const f=viewer({horizontal:true});f.open('hindernis');assert(parseFloat(f.text.style.fontSize)<29);assert.equal(f.text.scrollWidth,f.text.clientWidth);assert.equal(f.text.querySelectorAll('tbody tr').length,17);});
test('font fit handles one, two or three columns and maximizes readable type within its cap',()=>{
 for(const [width,limits,columns] of [[500,{1:14,2:30,3:40},1],[1200,{1:18,2:23,3:30},2],[1800,{1:19,2:26,3:34},3]]){
  const f=viewer({width,limits});f.open();assert.equal(Number(f.text.style.columnCount),columns);assert(parseFloat(f.text.style.fontSize)<=limits[columns]);assert(parseFloat(f.text.style.fontSize)>limits[columns]-.5);
 }
 const f=viewer({width:1800,limits:{1:90,2:90,3:90}});f.open();assert.equal(f.text.style.columnCount,'1');assert(parseFloat(f.text.style.fontSize)<=42);
});
test('resize, viewport, fullscreen and font loading trigger a new fit; duplicate events share one frame',()=>{
 const f=viewer();f.open();f.flush();const original=parseFloat(f.text.style.fontSize);f.metrics.limits={1:11,2:16,3:18};f.size.width=600;
 for(const fn of f.events.resize)fn();f.viewportEvents.resize();f.document.dispatchEvent(new f.dom.Event('fullscreenchange'));f.fontReady();f.fontsEvents.loadingdone();assert.equal(f.frames.size,1);f.flush();assert(parseFloat(f.text.style.fontSize)<original);assert.equal(f.text.style.columnCount,'1');assert(parseFloat(f.text.style.fontSize)<=11);
 f.size.width=1800;f.metrics.limits={1:20,2:30,3:35};f.observed[0].notify();f.flush();assert.equal(f.text.style.columnCount,'3');assert(parseFloat(f.text.style.fontSize)>34);assert.equal(f.observed.length,1);
});
test('reopening another rule set refits, while closing and unrelated sync updates preserve the rule session',()=>{
 const f=viewer();f.open();f.flush();const previous=parseFloat(f.text.style.fontSize);f.open();assert.equal(f.frames.size,0);assert.equal(parseFloat(f.text.style.fontSize),previous);
 f.c.window.KCGameRules.renderDashboard({open:false});assert(f.document.getElementById('dashboard-rules-overlay').hidden);assert(!f.document.querySelector('main.dashboard').hasAttribute('inert'));
 f.metrics.limits={1:10,2:15,3:20};f.open('hindernis');assert(parseFloat(f.text.style.fontSize)<previous);assert.equal(f.text.querySelectorAll('tbody tr').length,17);
});
test('hidden viewers and the main app do not run measurement work or modify app popup typography',()=>{
 const f=viewer();for(const fn of f.events.resize)fn();f.flush();assert.equal(f.text.style.fontSize,undefined);assert.equal(f.observed.length,0);
 const {document}=parseHTML(read('getraenke-abrechnung.html')),c={document,window:{addEventListener(){}},crypto:require('node:crypto').webcrypto};vm.createContext(c);vm.runInContext(read('js/game-rules.js'),c);c.window.KCGameRules.renderDashboard({open:true,gameKey:'sechstage'});assert.equal(document.getElementById('sechs-rules-content').style.fontSize,undefined);
});
test('dashboard rule layout uses a bounded body and scalable text/table spacing without deleting or clipping individual text nodes',()=>{
 const css=read('css/game-rules.css');assert(css.includes('column-fill:balance'));assert.match(css,/#dashboard-rules-scroll\{[^}]*overflow:hidden/);assert.match(css,/#dashboard-rules-content\{[^}]*height:100%/);assert.match(css,/#dashboard-rules-content \.rules-obstacle-table th[^}]*font:inherit/);assert(!css.includes('line-clamp'));assert(!css.includes('text-overflow:ellipsis'));
});
const boxFor=(document,key)=>document.getElementById('common-setup-'+key)||document.getElementById(key+'-order-editor')||document.getElementById(key==='sechstage'?'sechs-start-card':['siebener','hindernis'].includes(key)?key+'-setup':key+'-start-card');
async function start(c,key){
 if(key==='tannenbaum')c.startTannenbaumSetup();else if(key==='darts')c.startDartsGame();else if(key==='lotterie')await c.startLotterieGameFinal('C');else if(key==='tiberius')c.startTiberiusGameFinal('C');else if(key==='mensch')c.startMenschGameFinal('C');else if(key==='plusminus')c.startPlusminusGame();else if(key==='haushoch'||key==='haustief')c.startHausGame(key==='haushoch'?'hoch':'tief');else if(key==='sichern')c.startSichernGame();else if(key==='fuchsjagd')c.startFuchsjagdGame();else if(key==='tor')c.startTorGame();else if(key==='sechstage')await c.startSechsGame();else if(['blackjack','gluecksspirale'].includes(key))await c.startTableGame(key);else await c.indStart(key);
}
test('every actual game start removes the seating and team preparation, immediately including Tor coin toss',async()=>{
 for(const key of ['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis']){
  const {c,document}=gameFixture();assert(boxFor(document,key).querySelector('.gs-setup'),key+' before start');await start(c,key);assert(c.gameSetupState(key).active,key);assert.equal(c.gameSetupMarkup(key),'',key);const setup=boxFor(document,key);assert(setup.hidden||setup.classList.contains('hidden')||!setup.querySelector('.gs-setup'),key+' after start');
  const panel=document.querySelector('[data-game-start-panel="'+key+'"]');if(panel)assert(panel.hidden,key+' full start panel');
  if(key==='tor')assert(c.torState.coinPending);
 }
});
test('incoming active states hide setup and a reset restores it without changing players or frozen teams',()=>{
 for(const key of ['tannenbaum','darts','tor','fuchsjagd','haushoch','haustief']){
  const {c,document}=gameFixture(),state=c.gameSetupState(key);state.active=true;state.participantTeams={T1:['C','A'],T2:['Gast','B','D']};c.renderCommonGameSetups();if(['haushoch','haustief'].includes(key))c.renderSoloOrderSettings(key);assert(boxFor(document,key).hidden);assert.equal(state.participantTeams.T1[0],'C');state.active=false;state.history=[];c.renderCommonGameSetups();if(['haushoch','haustief'].includes(key))c.renderSoloOrderSettings(key);assert(!boxFor(document,key).hidden);assert(boxFor(document,key).querySelector('.gs-order'));
 }
});
test('Sichern form styles no longer give seat numbers a full chip width and names stay on one line',()=>{
 const {document}=gameFixture(),style=document.getElementById('sichern-style-v127').textContent,css=read('css/game-starts.css'),place=document.querySelector('#common-setup-sichern .gs-place'),name=document.querySelector('#common-setup-sichern .gs-name');
 const {parse}=require('cssom'),rules=parse(style).cssRules;
 for(const rule of rules)if(rule.style?.getPropertyValue('flex-basis')==='100%')assert(!place.matches(rule.selectorText),rule.selectorText);
 const textRule=[...parse(css).cssRules].find(r=>r.selectorText==='.gs-name');assert.equal(textRule.style.getPropertyValue('white-space'),'nowrap');assert(name.hasAttribute('title'));assert.equal(name.getAttribute('title'),name.textContent);
 const chipRule=[...parse(css).cssRules].find(r=>r.selectorText==='.gs-chip');assert.equal(chipRule.style.getPropertyValue('flex'),'0 0 auto');
});
