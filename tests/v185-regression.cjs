const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{parseHTML}=require('linkedom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
let sequence=0;const request=(action='open',gameKey='sechstage',token='rules_session_one')=>({action,gameKey,token,opId:'rules_test_'+(++sequence)});
function server(initial={}){
 const data=new Map([['clubs/club/state/current',{persons:[],...plain(initial)}]]),listeners=new Map();let version=0,writes=0,failBefore=false,failAfter=false;
 const env={db:{},window:{},doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=> 'server'};
 const runTransaction=async(_,callback)=>{for(let retry=0;retry<12;retry++){
  if(failBefore)throw Error('Network unavailable');const observed=version,pending=[];let writing=false;
  const out=await callback({get:async key=>{assert(!writing);return {exists:()=>data.has(key),data:()=>plain(data.get(key))};},set:(key,value,opts)=>{writing=true;pending.push(()=>{data.set(key,opts?.merge?{...data.get(key),...plain(value)}:plain(value));writes++;});}});
  if(version!==observed)continue;pending.forEach(fn=>fn());if(pending.length){version++;for(const fn of listeners.values())fn();}if(failAfter){failAfter=false;throw Error('Response lost');}return out;
 }throw Error('retry limit');};env.runTransaction=runTransaction;
 const api={};for(const method of ['setDashboardRules','saveClubState']){const src=read('js/firebase.js'),a=src.indexOf('  async '+method+'('),b=src.indexOf('\n  },',a);api[method]=new Function('env','with(env){return ({'+src.slice(a,b+4)+'}).'+method+';}')(env);}
 return {api,data,root:(club='club')=>data.get('clubs/'+club+'/state/current'),writes:()=>writes,offline:value=>failBefore=value,loseResponse:()=>failAfter=true,subscribe:(club,callback)=>{const id=++sequence;listeners.set(id,()=>callback(plain(data.get('clubs/'+club+'/state/current'))));callback(plain(data.get('clubs/'+club+'/state/current')));return ()=>listeners.delete(id);}};
}
function context(html){
 const {document,window:dom}=parseHTML(html),events={},timers=new Map();Object.defineProperty(document,'activeElement',{value:null,writable:true});
 const c={document,window:{addEventListener:(name,fn)=>(events[name]??=[]).push(fn)},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,console:{error(){},warn(){},log(){}},setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++sequence,clearInterval(){},ACTIVE_CLUB:'Club',getClubFirestoreId:name=>name==='Club B'?'club-b':'club'};
 vm.createContext(c);vm.runInContext(read('js/game-rules.js'),c);c.KCGameRules=c.window.KCGameRules;return {c,document,events,timers,dom};
}
function app(store){const f=context(read('getraenke-abrechnung.html'));f.c.window.firestoreApi=store.api;vm.runInContext(read('js/games/sechstage.js'),f.c);vm.runInContext(read('js/games/table-games-ui.js'),f.c);return f;}
function dashboard(store){
 const f=context(read('dashboard.html')),api={subscribeToClubState:(club,callback)=>store.subscribe(club,callback),subscribeToSeatingLive:()=>()=>{},subscribeToLiveGameState:()=>()=>{},subscribeToLivePersons:()=>()=>{},loadClubState:async club=>plain(store.root(club))};
 Object.assign(f.c,{localStorage:{getItem:()=>null,setItem(){}},location:{search:''},URLSearchParams,requestAnimationFrame(){},window:{...f.c.window,firestoreApi:api}});
 vm.runInContext(read('js/birthdays.js'),f.c);f.c.KCBirthdays=f.c.window.KCBirthdays;
 const html=read('dashboard.html'),start=html.indexOf('<script type="module">')+22,end=html.indexOf('</script>',start),script=html.slice(start,end).replace("import './js/firebase.js';",'').replace('void bootstrap();','window.dashboardTest={connect,unsubscribe,paint};');
 vm.runInContext(script,f.c);return f;
}
async function settle(c){for(let i=0;i<10;i++){await Promise.resolve();const updates=vm.runInContext('[...kcRulesUpdates.values()].map(x=>x.running)',c);if(updates.every(x=>!x))return;}await new Promise(resolve=>setImmediate(resolve));}

test('opening and closing rules changes only the managed viewer state, leaving game data intact',async()=>{
 const saved={blackjackState:{id:'game'},sechstageState:{score:42},penaltyStatsLog:[{id:'throw'}],persons:[{name:'A'}]},s=server(saved),open=request();await s.api.setDashboardRules('club',open);const value=s.root().dashboardRules;
 assert(value.open);assert.equal(value.gameKey,'sechstage');assert.equal(value.revision,1);for(const [key,v] of Object.entries(saved))assert.deepEqual(s.root()[key],v);
 await s.api.setDashboardRules('club',request('close'));assert.equal(s.root().dashboardRules.open,false);assert.equal(s.root().dashboardRules.revision,2);
});
test('duplicate open and close requests are idempotent, even after a lost response',async()=>{
 const s=server(),open=request();s.loseResponse();await assert.rejects(()=>s.api.setDashboardRules('club',open),/lost/);await s.api.setDashboardRules('club',open);assert.equal(s.writes(),1);
 const close=request('close');await s.api.setDashboardRules('club',close);await s.api.setDashboardRules('club',close);await s.api.setDashboardRules('club',open);assert.equal(s.writes(),2);assert.equal(s.root().dashboardRules.open,false);
});
test('an older controller cannot close a later popup, including one for the same game',async()=>{
 const s=server();await s.api.setDashboardRules('club',request());await s.api.setDashboardRules('club',request('open','sechstage','rules_session_two'));await s.api.setDashboardRules('club',request('close'));
 assert.equal(s.root().dashboardRules.token,'rules_session_two');assert.equal(s.root().dashboardRules.open,true);assert.equal(s.writes(),2);
});
test('invalid games, actions and identifiers never write HTML or modify viewer state',async()=>{
 const s=server();for(const change of [{gameKey:'blackjack'},{gameKey:'__proto__'},{action:'script'},{token:'<script>'},{opId:'invalid'}])await assert.rejects(()=>s.api.setDashboardRules('club',{...request(),...change}),/Ungültig/);
 assert.equal(s.writes(),0);assert.equal(s.root().dashboardRules,undefined);
});
test('regular state saves cannot overwrite the managed open or closed popup',async()=>{
 const s=server();await s.api.setDashboardRules('club',request());await s.api.saveClubState('club',{persons:[],dashboardRules:{open:false}});assert.equal(s.root().dashboardRules.open,true);
 await s.api.setDashboardRules('club',request('close'));await s.api.saveClubState('club',{persons:[],dashboardRules:{open:true}});assert.equal(s.root().dashboardRules.open,false);
});
test('simultaneous duplicate opens create one revision and unrelated clubs remain separate',async()=>{
 const s=server(),open=request();await Promise.all([s.api.setDashboardRules('club',open),s.api.setDashboardRules('club',open)]);assert.equal(s.writes(),1);
 await s.api.setDashboardRules('club-b',request('open','gluecksspirale','rules_session_other'));assert.equal(s.root('club').dashboardRules.gameKey,'sechstage');assert.equal(s.root('club-b').dashboardRules.gameKey,'gluecksspirale');
});
test('both app popups and the dashboard render identical shared rule content',()=>{
 const a=context(read('getraenke-abrechnung.html')),d=context(read('dashboard.html'));
 for(const [key,prefix] of [['sechstage','sechs'],['gluecksspirale','spiral']]){
  d.c.KCGameRules.renderDashboard({open:true,gameKey:key,token:key});const app=a.document.getElementById(prefix+'-rules-content'),tv=d.document.getElementById('dashboard-rules-content');assert.equal(app.innerHTML,tv.innerHTML);
  for(const text of ['Einzelteam','1. Verlierer +1','2. Verlierer +1','3. Verlierer +1'])assert(tv.textContent.includes(text));assert(!tv.querySelector('script'));
 }
});
test('the dashboard uses an unscaled full-screen dialog, preserves scroll during updates and closes cleanly',()=>{
 const f=context(read('dashboard.html')),overlay=f.document.getElementById('dashboard-rules-overlay'),main=f.document.querySelector('main.dashboard'),scroll=f.document.getElementById('dashboard-rules-scroll');assert(overlay.hidden);assert(!main.contains(overlay));
 const value={open:true,gameKey:'sechstage',token:'one'};f.c.KCGameRules.renderDashboard(value);assert(!overlay.hidden);assert(main.hasAttribute('inert'));assert.equal(main.getAttribute('aria-hidden'),'true');scroll.scrollTop=123;f.c.KCGameRules.renderDashboard({...value,revision:10});assert.equal(scroll.scrollTop,123);
 f.c.KCGameRules.renderDashboard({...value,gameKey:'gluecksspirale',token:'two'});assert.equal(scroll.scrollTop,0);assert.match(f.document.getElementById('dashboard-rules-title').textContent,/Glücksspirale/);assert(!overlay.querySelector('button'));
 f.c.KCGameRules.renderDashboard({open:false});assert(overlay.hidden);assert(!main.hasAttribute('inert'));assert(!f.document.documentElement.classList.contains('kc-rules-visible'));
 f.c.KCGameRules.renderDashboard({open:true,gameKey:'__proto__'});assert(overlay.hidden);
});
test('real app info buttons and close handlers drive the real dashboard subscription for both games',async()=>{
 const s=server(),a=app(s),d=dashboard(s);d.c.window.dashboardTest.connect('club','Club');
 for(const [open,close,prefix] of [['openSechsRules','closeSechsRules','sechs'],['openSpiralRules','closeSpiralRules','spiral']]){
  a.c[open]();await settle(a.c);assert(!a.document.getElementById(prefix+'-rules-modal').classList.contains('hidden'));assert(!d.document.getElementById('dashboard-rules-overlay').hidden);
  a.c[close]();await settle(a.c);assert(a.document.getElementById(prefix+'-rules-modal').classList.contains('hidden'));assert(d.document.getElementById('dashboard-rules-overlay').hidden);
 }
});
test('Escape and clicking the modal backdrop also close the dashboard popup',async()=>{
 const s=server(),a=app(s),d=dashboard(s);d.c.window.dashboardTest.connect('club','Club');
 for(const [open,prefix] of [['openSechsRules','sechs'],['openSpiralRules','spiral']]){
  a.c[open]();await settle(a.c);a.document.dispatchEvent(new a.dom.Event('keydown',{bubbles:true}));const event=new a.dom.Event('keydown',{bubbles:true});Object.defineProperty(event,'key',{value:'Escape'});a.document.dispatchEvent(event);await settle(a.c);assert(d.document.getElementById('dashboard-rules-overlay').hidden);
  a.c[open]();await settle(a.c);const modal=a.document.getElementById(prefix+'-rules-modal'),handler=modal.getAttribute('onclick');vm.runInContext('(function(event){'+handler+'}).call(document.getElementById("'+prefix+'-rules-modal"),{target:document.getElementById("'+prefix+'-rules-modal")})',a.c);await settle(a.c);assert(d.document.getElementById('dashboard-rules-overlay').hidden);
 }
});
test('switching rule games keeps one local popup and an old close cannot hide the new one',async()=>{
 const s=server(),a=app(s),d=dashboard(s);d.c.window.dashboardTest.connect('club','Club');a.c.openSechsRules();await settle(a.c);a.c.openSpiralRules();await settle(a.c);assert(a.document.getElementById('sechs-rules-modal').classList.contains('hidden'));assert.equal(s.root().dashboardRules.gameKey,'gluecksspirale');
 a.c.closeSechsRules();await settle(a.c);assert(s.root().dashboardRules.open);assert(!d.document.getElementById('dashboard-rules-overlay').hidden);
});
test('rapid open-close waits for the open request and ends closed without an abandoned retry',async()=>{
 const s=server(),a=app(s);let release;const actual=s.api.setDashboardRules;s.api.setDashboardRules=async(...args)=>{if(!release)await new Promise(resolve=>release=resolve);return actual(...args);};a.c.openSechsRules();a.c.closeSechsRules();release();await settle(a.c);assert.equal(s.root().dashboardRules.open,false);assert.equal(a.timers.size,0);
});
test('offline open-close coalesces to closed; reopening syncs after connectivity returns',async()=>{
 const s=server(),a=app(s);a.c.navigator.onLine=false;a.c.openSechsRules();a.c.closeSechsRules();assert.equal(s.writes(),0);a.c.navigator.onLine=true;for(const fn of a.events.online)fn();await settle(a.c);assert(!s.root().dashboardRules?.open);
 a.c.navigator.onLine=false;a.c.openSpiralRules();a.c.navigator.onLine=true;for(const fn of a.events.online)fn();await settle(a.c);assert.equal(s.root().dashboardRules.gameKey,'gluecksspirale');assert(s.root().dashboardRules.open);
});
test('failed open with a lost response can be closed before retry without reopening the dashboard',async()=>{
 const s=server(),a=app(s);s.loseResponse();a.c.openSechsRules();await settle(a.c);assert(s.root().dashboardRules.open);assert(a.timers.size);a.c.closeSechsRules();await settle(a.c);assert.equal(s.root().dashboardRules.open,false);assert.equal(a.timers.size,0);
});
test('failed close retries automatically and a club change closes only the old club',async()=>{
 const s=server(),a=app(s);a.c.openSechsRules();await settle(a.c);s.offline(true);a.c.closeSechsRules();await settle(a.c);assert(s.root().dashboardRules.open);s.offline(false);for(const fn of a.timers.values())fn();await settle(a.c);assert.equal(s.root().dashboardRules.open,false);
 a.c.openSpiralRules();await settle(a.c);a.c.kcClosePublishedRules();a.c.ACTIVE_CLUB='Club B';a.c.openSechsRules();await settle(a.c);assert.equal(s.root().dashboardRules.open,false);assert(s.root('club-b').dashboardRules.open);
});
test('dashboard reset or changing clubs clears rules from the previous club',async()=>{
 const s=server(),d=dashboard(s);await s.api.setDashboardRules('club',request());d.c.window.dashboardTest.connect('club','Club');assert(!d.document.getElementById('dashboard-rules-overlay').hidden);d.c.window.dashboardTest.connect('club-b','Club B');assert(d.document.getElementById('dashboard-rules-overlay').hidden);
 d.c.window.dashboardTest.connect('club','Club');assert(!d.document.getElementById('dashboard-rules-overlay').hidden);d.c.window.dashboardTest.unsubscribe();assert(d.document.getElementById('dashboard-rules-overlay').hidden);
});
