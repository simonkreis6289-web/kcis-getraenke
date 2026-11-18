const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const {document}=parseHTML(read('dashboard.html')),timers=new Map();let now=Date.parse('2026-11-16T20:00:00Z'),id=0;
 class Clock extends Date{static now(){return now;}}
 const c={document,Date:Clock,Intl,console,requestAnimationFrame:()=>0,addEventListener(){},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms,ms});return id;},clearTimeout:n=>timers.delete(n)};c.window=c;vm.createContext(c);
 for(const f of ['birthdays','dashboard-layout','dashboard-layout-tv'])vm.runInContext(read('js/'+f+'.js'),c);
 return {c,document,timers,model:c.KCDashboardLayout,tv:c.KCDashboardLayoutTV,now:()=>now,advance(ms){now+=ms;const due=[...timers].filter(([,v])=>v.at<=now);for(const [n,v] of due){if(timers.delete(n))v.fn();}}};
}
test('direct TV link retains fresh throw popups in a long mixed-order log',()=>{
 const f=setup();
 vm.runInContext(read('js/dashboard-link.js'),f.c);
 const link=f.c.KCDashboardLink,club='club',evening='2026-11-16T19:00:00Z';
 const event=(id,type,at=f.now())=>({id,type,thrower:'Marius',eveningStartedAt:evening,createdAt:new Date(at).toISOString()});
 const old=Array.from({length:70},(_,index)=>event('old-'+index,'gosse',f.now()-40000-index*1000));
 const cloud={currentEveningStartedAt:evening,tabletSequence:10,dashboardSettings:{popupSeconds:3},penaltyStatsLog:old};
 f.tv.feed(cloud,club,f.now());
 let log=[...old],sequence=10;
 for(const [type,label] of [['gosse','Gosse'],['kranz','Kranz'],['9er','Alle Neune']]){
  f.advance(100);
  const latest=event(type,type);
  log=type==='kranz'?[...log,latest]:[latest,...log];
  const state=link.project({...cloud,penaltyStatsLog:log});
  assert.equal(state.penaltyStatsLog.length,64);
  assert.equal(state.penaltyStatsLog[0].id,type);
  const direct=link.reconcile(cloud,{sequence:++sequence,baseEvening:evening,state});
  f.tv.feed(direct,club,f.now());
  const popup=f.document.getElementById('dashboard-throw-popup');
  assert.equal(popup.hidden,false);
  assert(popup.textContent.includes(label));
 }
 assert.equal(cloud.penaltyStatsLog.length,70);
});
test('settings migrate old values and normalize durations and safe bounded custom messages',()=>{
 const {model:M}=setup(),s=M.normalize({panels:{drinks:{seconds:0},fines:{seconds:1000},gutters:{seconds:'bad'}},popupSeconds:-5,tickerMessages:[{id:'<bad>',text:'  Hi\n there <img>  ',enabled:false},{id:'<bad>',text:'x'.repeat(600)}]});
 assert.equal(s.panels.drinks.seconds,1);assert.equal(s.panels.fines.seconds,300);assert.equal(s.panels.gutters.seconds,5);assert.equal(s.popupSeconds,0);assert.equal(s.tickerMessages[0].text,'Hi there <img>');assert.equal(s.tickerMessages[1].text.length,500);assert.equal(s.tickerMessages[0].enabled,false);assert.notEqual(s.tickerMessages[0].id,s.tickerMessages[1].id);
 assert.equal(M.normalize(null).popupSeconds,3);assert.equal(M.normalize({tickerMessages:Array(25).fill({})}).tickerMessages.length,20);
});
test('every selection and slot combination retains enabled tables exactly once without swapping shared positions',()=>{
 const {model:M}=setup();
 for(let mask=0;mask<16;mask++)for(let assignment=0;assignment<256;assignment++){
  const s=M.defaults();M.keys.forEach((key,i)=>{s.panels[key].enabled=!!(mask&(1<<i));s.panels[key].position=M.slots[(assignment>>(2*i))&3];});const before=copy(s),r=M.resolve(s),enabled=M.keys.filter(k=>s.panels[k].enabled),visible=Object.values(r.groups).flat();
  assert.deepEqual([...visible].sort(),[...enabled].sort());assert.deepEqual(copy(s),before);if(enabled.length===2)assert.equal(r.right.length,0);if(enabled.length===1)assert.equal(Object.values(r.groups).filter(g=>g.length).length,1);
 }
 const stacked=M.move(M.defaults(),'seating','left-top');assert.equal(stacked.panels.drinks.position,'left-top');assert.equal(stacked.panels.seating.position,'left-top');
});
test('three tables rotate at their individual 3/5/10 second boundaries and occupy full side height',()=>{
 const f=setup(),s=f.model.defaults();s.transitionSeconds=0;for(const k of f.model.keys)s.panels[k].position='left-top';s.panels.seating.enabled=false;[s.panels.drinks.seconds,s.panels.fines.seconds,s.panels.gutters.seconds]=[3,5,10];
 const before=copy(s),original=Object.fromEntries(f.model.keys.map(k=>[k,f.document.getElementById('dashboard-panel-'+k)]));f.tv.apply(s);
 const active=()=>[...f.document.querySelectorAll('.side .panel')].filter(p=>!p.hidden).map(p=>p.id);
 assert(f.document.querySelector('.side.left').classList.contains('dashboard-side-full'));assert(f.document.querySelector('.side.right').hidden);assert.equal(f.document.querySelector('.side.left').children.length,1);assert.deepEqual(active(),['dashboard-panel-drinks']);
 f.advance(2999);assert.deepEqual(active(),['dashboard-panel-drinks']);f.advance(1);assert.deepEqual(active(),['dashboard-panel-fines']);f.advance(2000);f.tv.apply(s);assert.deepEqual(active(),['dashboard-panel-fines'],'bookings do not reset rotation');
 f.advance(3000);assert.deepEqual(active(),['dashboard-panel-gutters']);f.advance(10000);assert.deepEqual(active(),['dashboard-panel-drinks']);
 for(const k of f.model.keys)assert.equal(f.document.getElementById('dashboard-panel-'+k),original[k]);assert.deepEqual(copy(s),before);
 s.panels.gutters.position='left-bottom';f.tv.apply(s);assert(!f.document.querySelector('.side.left').classList.contains('dashboard-side-full'));assert.equal(f.document.querySelector('.side.left').children.length,2);
 s.panels.drinks.enabled=false;s.panels.fines.enabled=false;f.tv.apply(s);assert.equal(f.timers.size,0,'single table stops rotation timer');
});
test('opposite sides rotate independently and an empty top slot gives the bottom stack full height',()=>{
 const f=setup(),s=f.model.defaults();s.panels.drinks.position=s.panels.fines.position='left-bottom';s.panels.gutters.position=s.panels.seating.position='right-top';s.panels.drinks.seconds=3;s.panels.fines.seconds=5;s.panels.gutters.seconds=10;s.panels.seating.seconds=2;f.tv.apply(s);
 const active=side=>f.document.querySelector('#dashboard-slot-'+side).dataset.activePanel;
 assert(f.document.querySelector('.side.left').classList.contains('dashboard-side-full'));assert(f.document.querySelector('.side.right').classList.contains('dashboard-side-full'));
 f.advance(3000);assert.equal(active('left-bottom'),'fines');assert.equal(active('right-top'),'gutters');f.advance(7000);assert.equal(active('right-top'),'seating');assert.equal(active('left-bottom'),'drinks');
});
test('only enabled custom ticker messages appear, safely escaped and without restarting on bookings',()=>{
 const f=setup(),root={dashboardSettings:{tickerMessages:[{id:'first',text:'Hallo <img src=x>',enabled:true},{id:'hidden',text:'Geheim',enabled:false},{id:'blank',text:'   ',enabled:true},{id:'second',text:'Noch ein Text',enabled:true}]}};
 f.tv.ticker(root);const track=f.document.getElementById('dashboard-ticker-track'),first=track.firstElementChild;
 assert(track.textContent.includes('Hallo <img src=x>'));assert(track.textContent.includes('Noch ein Text'));assert(!track.textContent.includes('Geheim'));assert(!track.querySelector('img'));assert.equal(f.document.querySelectorAll('#dashboard-message-first').length,1);
 f.tv.ticker({...root,persons:[{name:'A',drinks:{beer:1}}]});assert.equal(track.firstElementChild,first);
 root.dashboardSettings.tickerMessages.splice(0,1);f.tv.ticker(root);assert(!track.textContent.includes('Hallo'));assert(track.textContent.includes('Noch ein Text'));
});
test('throw popups handle fresh gutter/wreath/nine events once, duration/disable, evening boundaries and stale replay',()=>{
 const f=setup(),root={currentEveningStartedAt:'2026-11-16T19:00:00Z',dashboardSettings:{popupSeconds:5},penaltyStatsLog:[]},event=(id,type='gosse',extras={})=>({id,type,thrower:'Marius <img>',createdAt:new Date(f.now()).toISOString(),eveningStartedAt:root.currentEveningStartedAt,...extras});
 root.penaltyStatsLog=[event('old')];f.tv.feed(root,'club',f.now());assert(!f.document.getElementById('dashboard-throw-popup'));
 for(const [id,type,label] of [['a','gosse','Gosse'],['b','kranz','Kranz'],['c','9er','Alle Neune']]){
  root.penaltyStatsLog.unshift(event(id,type));f.tv.feed(root,'club',f.now());const box=f.document.getElementById('dashboard-throw-popup');assert(!box.hidden);assert(box.textContent.includes(label));assert(box.textContent.includes('Marius <img>'));assert(!box.querySelector('img'));f.advance(4999);assert(!box.hidden);f.advance(1);assert(box.classList.contains('toast-leaving'));f.advance(420);assert(box.hidden);f.tv.feed(root,'club',f.now());assert(box.hidden,'confirmed repeats must not replay');
 }
 root.penaltyStatsLog.unshift(event('stale','gosse',{createdAt:new Date(f.now()-31000).toISOString()}));f.tv.feed(root,'club',f.now());assert(f.document.getElementById('dashboard-throw-popup').hidden);
 root.dashboardSettings.popupSeconds=0;root.penaltyStatsLog.unshift(event('off'));f.tv.feed(root,'club',f.now());assert(f.document.getElementById('dashboard-throw-popup').hidden);root.dashboardSettings.popupSeconds=2;f.tv.feed(root,'club',f.now());assert(f.document.getElementById('dashboard-throw-popup').hidden);
 root.currentEveningStartedAt='2026-11-16T20:05:00Z';root.penaltyStatsLog=[event('next-old')];f.tv.feed(root,'club',f.now());assert(f.document.getElementById('dashboard-throw-popup').hidden);
 root.penaltyStatsLog.unshift(event('next-new'));f.tv.feed(root,'club',f.now());assert(!f.document.getElementById('dashboard-throw-popup').hidden);f.advance(2000);f.advance(420);assert(f.document.getElementById('dashboard-throw-popup').hidden);
});
const source=read('tests/v230-player-rows.cjs'),{app,tv,fullApp}=new Function('require','__dirname',source.slice(0,source.indexOf('const keys='))+';return {app,tv,fullApp};')(require,__dirname);
test('real app saves messages, panel durations and popup duration across reload and new evening',{timeout:60000},async()=>{
 const a=await app(),doc=a.document;doc.getElementById('dashboard-ticker-add').onclick();let row=doc.querySelector('.dashboard-ticker-message');row.querySelector('textarea').value='Eigener Text';row.querySelector('textarea').oninput();
 doc.getElementById('dashboard-ticker-add').onclick();row=doc.querySelector('.dashboard-ticker-message:last-child');row.querySelector('textarea').value='Ausblenden';row.querySelector('textarea').oninput();row.querySelector('input').checked=false;row.querySelector('input').onchange();
 const seconds=doc.getElementById('dashboard-seconds-fines');seconds.value='10';seconds.oninput();const popup=doc.getElementById('dashboard-popup-seconds');popup.value='4';popup.oninput();assert(await a.c.KCDashboardSettingsApp.save());assert(await a.c.KCSharedSync.waitForUpload());
 const saved=copy(a.db.root().dashboardSettings);assert.equal(saved.panels.fines.seconds,10);assert.equal(saved.popupSeconds,4);assert.equal(saved.tickerMessages.length,2);assert.equal(saved.tickerMessages[1].enabled,false);
 const b=fullApp(a.db);await b.select();assert.equal(b.document.querySelector('.dashboard-ticker-message textarea').value,'Eigener Text');assert(await b.c.startNewKegelabend());assert(await b.c.KCSharedSync.waitForUpload());assert.deepEqual(a.db.root().dashboardSettings,saved);
 const remove=b.document.querySelector('.dashboard-ticker-message button');remove.onclick();assert(await b.c.KCDashboardSettingsApp.save());assert(await b.c.KCSharedSync.waitForUpload());assert.equal(a.db.root().dashboardSettings.tickerMessages.length,1);
});
test('Lattenzaun dashboard marks the actual next thrower, preserves last-throw-first order and clears on finish',{timeout:60000},async()=>{
 const a=await app();await a.c.indStart('lattenzaun');assert(await a.c.KCSharedSync.waitForUpload());const d=tv(a.db);
 const names=()=>[...d.document.querySelectorAll('.extra-fence-row')].map(x=>x.querySelector('.extra-fence-name').textContent),marked=()=>[...d.document.querySelectorAll('.extra-fence-next-thrower')].map(x=>x.querySelector('.extra-fence-name').textContent);
 d.update();assert.deepEqual(marked(),['A']);
 await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:6});assert(await a.c.KCSharedSync.waitForUpload());d.update();assert.equal(names()[0],'A');assert.deepEqual(marked(),['B']);assert(d.document.querySelector('.extra-fence-next-thrower').getAttribute('aria-label').includes('Als Nächstes'));assert(!a.document.querySelector('.extra-fence-next-thrower'));
 await a.c.indAction('lattenzaun','throw',{kind:'pins',pins:4});assert(await a.c.KCSharedSync.waitForUpload());d.update();assert.equal(names()[0],'B');assert.deepEqual(marked(),['C']);
 const state=copy(a.db.root().lattenzaunState);state.active=false;state.finished=true;const {document}=parseHTML(d.c.renderExtraGameBoard(state,{dashboard:true}));assert.equal(document.querySelectorAll('.extra-fence-next-thrower').length,0);
});


test('ticker visibility and larger font are normalized independently of football and panel layout',()=>{
 const f=setup(),M=f.model;
 assert.equal(M.normalize(null).tickerEnabled,true);
 assert.equal(M.normalize(null).tickerFontSize,18);
 assert.equal(M.normalize({tickerEnabled:false,tickerFontSize:100}).tickerFontSize,30);
 assert.equal(M.normalize({tickerFontSize:1}).tickerFontSize,12);
 const root={dashboardSettings:{tickerEnabled:false,tickerFontSize:24}};
 f.tv.ticker(root);
 const ticker=f.document.getElementById('dashboard-ticker'),footer=f.document.querySelector('.dashboard-footer');
 assert(ticker.hidden);
 assert(footer);
 assert.equal(f.document.querySelector('main.dashboard').style.getPropertyValue('--ticker-row-height'),'34px');
 root.dashboardSettings.tickerEnabled=true;
 f.tv.ticker(root);
 assert.equal(ticker.hidden,false);
 assert.equal(ticker.style.getPropertyValue('--ticker-font-size'),'24px');
 assert.equal(f.document.querySelector('main.dashboard').style.getPropertyValue('--ticker-row-height'),'44px');
 assert(footer.querySelector('.header-actions'));
});


test('ticker chips use configured colors and keep text as safe text nodes',()=>{
 const f=setup(),root={dashboardSettings:{tickerColors:{birthdays:'#123456',tour:'#fedcba',kegeln:'#112233',bl1:'#334455'},tickerMessages:[{id:'custom',text:'Hallo <script>alert(1)</script>',color:'#abcdef',enabled:true}]}};
 f.tv.ticker(root);
 const track=f.document.getElementById('dashboard-ticker-track');
 const birthday=f.document.getElementById('kc-next-birthdays'),custom=f.document.getElementById('dashboard-message-custom');
 assert(birthday.classList.contains('dashboard-ticker-chip'));
 assert.equal(birthday.style.backgroundColor,'#123456');
 assert.equal(custom.style.backgroundColor,'#abcdef');
 assert.match(custom.textContent,/Hallo <script>/);
 assert.equal(track.querySelector('script'),null);
 const normalized=f.model.normalize({tickerColors:{birthdays:'url(bad)'},tickerMessages:[{text:'abc',color:'red'}]});
 assert.equal(normalized.tickerColors.birthdays,'#fce7f3');
 assert(/^#[0-9a-f]{6}$/.test(normalized.tickerMessages[0].color));
 assert.equal(f.model.normalize({football:{events:{goal:false,halftime:false}}}).football.events.goal,false);
 assert.equal(f.model.normalize({football:{events:{red:true,secondYellow:true}}}).football.events.red,false);
});


test('two ticker lanes split independently, preserve their tracks and use the configured width',()=>{
 const f=setup(),settings=f.model.defaults();
 settings.tickerStreams.leftPercent=65;
 f.c.KCFootballLive={configure(){},ticker(){return [['football-bl1-123','⚽ BVB 2:1 S04'],['football-bl2-321','⚽ Zweite Liga 0:0']];}};
 const original=f.document.getElementById('dashboard-ticker-track');
 f.tv.ticker({dashboardSettings:settings});
 const region=f.document.getElementById('dashboard-ticker-region'),club=f.document.getElementById('dashboard-ticker'),football=f.document.getElementById('dashboard-football-ticker');
 assert(!region.hidden);
 assert.equal(club.parentNode.id,'dashboard-ticker-slot-left');
 assert.equal(football.parentNode.id,'dashboard-ticker-slot-right');
 assert.equal(region.style.gridTemplateColumns,'65fr 35fr');
 assert(f.document.getElementById('dashboard-ticker-track')===original);
 assert(!club.hidden&&!football.hidden);
 assert(!original.textContent.includes('BVB 2:1 S04'));
 assert(f.document.getElementById('dashboard-football-ticker-track').textContent.includes('BVB 2:1 S04'));
 settings.tickerStreams.football.enabled=false;f.tv.ticker({dashboardSettings:settings});
 assert(f.document.getElementById('dashboard-ticker-slot-right').hidden);
 assert(!club.hidden);
 settings.tickerStreams.football.enabled=true;
 settings.tickerStreams.club.position='right';
 f.tv.ticker({dashboardSettings:settings});
 assert.equal(club.parentNode.id,'dashboard-ticker-slot-right');
 assert(f.document.getElementById('dashboard-ticker-slot-left').hidden);
});
test('two ticker streams on same side alternate with per-stream dwell and stop when disabled',()=>{
 const f=setup(),settings=f.model.defaults();
 settings.tickerStreams.club.position='left';settings.tickerStreams.football.position='left';
 settings.tickerStreams.club.seconds=3;settings.tickerStreams.football.seconds=5;
 f.tv.ticker({dashboardSettings:settings});
 const club=f.document.getElementById('dashboard-ticker'),football=f.document.getElementById('dashboard-football-ticker');
 assert.equal(club.hidden,false);assert.equal(football.hidden,true);
 f.advance(3000);assert.equal(club.hidden,true);assert.equal(football.hidden,false);
 f.advance(5000);assert.equal(club.hidden,false);assert.equal(football.hidden,true);
 settings.tickerStreams.club.enabled=false;f.tv.ticker({dashboardSettings:settings});
 assert(club.hidden);assert(!football.hidden);
 settings.tickerEnabled=false;f.tv.ticker({dashboardSettings:settings});
 assert(f.document.getElementById('dashboard-ticker-region').hidden);
 assert(f.document.querySelector('.dashboard-footer .header-actions'));
});
test('ticker stream settings migrate old ticker enabled state and bound invalid inputs',()=>{
 const {model}=setup();
 const fallback=model.normalize({tickerEnabled:false});
 assert.equal(fallback.tickerStreams.club.enabled,false);
 assert.equal(fallback.tickerStreams.football.position,'right');
 const settings=model.normalize({tickerStreams:{club:{position:'bad',seconds:0},football:{enabled:false,position:'left',seconds:500},leftPercent:99}});
 assert.equal(settings.tickerStreams.club.position,'left');
 assert.equal(settings.tickerStreams.club.seconds,2);
 assert.equal(settings.tickerStreams.football.seconds,120);
 assert.equal(settings.tickerStreams.football.enabled,false);
 assert.equal(settings.tickerStreams.leftPercent,75);
});
