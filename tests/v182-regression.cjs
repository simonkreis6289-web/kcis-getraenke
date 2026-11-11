const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const nodes={},document={activeElement:null,getElementById:id=>nodes[id]||null,querySelectorAll:()=>[],addEventListener(){}};
 for(const id of ['blackjack-start-card','blackjack-board','gluecksspirale-start-card','gluecksspirale-board','spiral-settings-target','spiral-settings-save','spiral-settings-status','spiral-hub-target']){
  const attrs={},classes=new Set();nodes[id]={value:'50',dataset:{},textContent:'',innerHTML:'',disabled:false,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],getAttribute:k=>attrs[k],classList:{toggle:(k,v)=>v?classes.add(k):classes.delete(k)},querySelectorAll:()=>[]};
 }
 const people=['A','B','C'].map(name=>({name,present:true,strafen:{}})),log={persist:0,saves:0,requests:[],toasts:[]};
 const c={window:{},document,ACTIVE_CLUB:'Club A',currentEveningStartedAt:'2026-11-06T18:00:00Z',SPIELE_KATALOG:[],gluecksspiraleSettings:{target:50},persons:people,blackjackState:null,gluecksspiraleState:null,penaltyStatsLog:[],dashboardActiveGame:null,navigator:{onLine:true},crypto:require('node:crypto').webcrypto,console:{error(){}},confirm:()=>true,getActivePlayersForSoloGame:()=>people,getGlobalSeatOrder:()=>people.map(p=>p.name),getClubFirestoreId:()=> 'club',showToast:(m,t)=>log.toasts.push([m,t]),persistState:()=>log.persist++,applyConfirmedLiveCounter(){}};
 c.saveImpl=async()=>true;c.saveToFirestore=async()=>{log.saves++;return c.saveImpl();};
 vm.createContext(c);vm.runInContext(read('js/games/table-games-core.js'),c);c.KCTableGames=c.window.KCTableGames;c.sixAvatar=n=>c.tableEscape(n);
 vm.runInContext(read('js/games/table-games-ui.js'),c);c.renderAll=()=>c.renderTableGames();
 c.window.firestoreApi={transactTableGame:async(_,request)=>{
  log.requests.push(plain(request));const before=c.tableGameGet(request.gameKey),ctx={people,catalog:[],now:request.now,eveningStartedAt:c.currentEveningStartedAt,club:c.ACTIVE_CLUB},out=c.KCTableGames.command(before,request,ctx);
  return {state:out.state,eveningStartedAt:c.currentEveningStartedAt,counters:[],gameStats:[]};
 }};
 c.renderTableGames();return {c,nodes,log};
}
test('new clubs and legacy data use 50; valid stored club targets survive normalization',()=>{
 const {c}=fixture();assert.equal(c.getSpiralTarget(),50);
 for(const target of [10,75,1000,'80']){c.gluecksspiraleSettings={target};c.ensureTableGames();assert.equal(c.getSpiralTarget(),Number(target));}
 for(const value of [null,{}, {target:9},{target:1001},{target:50.5},{target:'invalid'}]){c.gluecksspiraleSettings=value;c.ensureTableGames();assert.equal(c.getSpiralTarget(),50);}
});
test('rendering preserves an unsaved input during live updates, including after blur',()=>{
 const {c,nodes}=fixture(),input=nodes['spiral-settings-target'];input.value='75';c.document.activeElement=input;c.renderTableGames();assert.equal(input.value,'75');
 c.document.activeElement=null;c.renderTableGames();assert.equal(input.value,'75');assert.equal(c.getSpiralTarget(),50);
});
test('save stores the target locally and sends the club state to Firestore',async()=>{
 const {c,nodes,log}=fixture();nodes['spiral-settings-target'].value='75';assert.equal(await c.saveSpiralSettings(),true);
 assert.equal(c.getSpiralTarget(),75);assert.equal(log.persist,1);assert.equal(log.saves,1);assert.match(nodes['spiral-settings-status'].textContent,/Gespeichert: 75/);assert.equal(nodes['spiral-settings-save'].disabled,false);
});
test('invalid targets do not alter saved settings or call persistence',async()=>{
 for(const input of ['','9','1001','50.5','invalid']){
  const {c,nodes,log}=fixture();nodes['spiral-settings-target'].value=input;assert.equal(await c.saveSpiralSettings(),false);assert.equal(c.getSpiralTarget(),50);assert.equal(log.persist,0);assert.equal(log.saves,0);assert.equal(nodes['spiral-settings-target'].getAttribute('aria-invalid'),'true');
 }
});
test('offline saving retains the local default and clearly reports local storage',async()=>{
 const {c,nodes,log}=fixture();c.navigator.onLine=false;nodes['spiral-settings-target'].value='75';assert.equal(await c.saveSpiralSettings(),false);
 assert.equal(c.getSpiralTarget(),75);assert.equal(log.persist,1);assert.equal(log.saves,0);assert.match(nodes['spiral-settings-status'].textContent,/Lokal gespeichert/);
});
test('a failed cloud save keeps the local value and unlocks the save button',async()=>{
 const {c,nodes}=fixture();c.saveImpl=async()=>{throw Error('offline');};nodes['spiral-settings-target'].value='75';assert.equal(await c.saveSpiralSettings(),false);
 assert.equal(c.getSpiralTarget(),75);assert.match(nodes['spiral-settings-status'].textContent,/fehlgeschlagen/);assert.equal(nodes['spiral-settings-save'].disabled,false);
});
test('double tapping save sends one request',async()=>{
 const {c,nodes,log}=fixture();let finish;c.saveImpl=()=>new Promise(resolve=>finish=resolve);
 nodes['spiral-settings-target'].value='75';const first=c.saveSpiralSettings();assert.equal(nodes['spiral-settings-save'].disabled,true);
 assert.equal(await c.saveSpiralSettings(),false);assert.equal(log.saves,1);finish(true);assert.equal(await first,true);assert.equal(nodes['spiral-settings-save'].disabled,false);
});
test('switching clubs clears the previous input and pending save cannot overwrite the new club',async()=>{
 const {c,nodes}=fixture();let finish;c.saveImpl=()=>new Promise(resolve=>finish=resolve);nodes['spiral-settings-target'].value='75';const pending=c.saveSpiralSettings();
 c.ACTIVE_CLUB='Club B';c.gluecksspiraleSettings={target:90};c.renderSpiralSettings();assert.equal(nodes['spiral-settings-target'].value,'90');assert.equal(nodes['spiral-settings-status'].textContent,'');
 finish(true);await pending;assert.equal(c.getSpiralTarget(),90);assert.equal(nodes['spiral-settings-status'].textContent,'');assert.equal(nodes['spiral-settings-save'].disabled,false);
});
test('a running game keeps its captured target, while the next start uses the saved default',async()=>{
 const {c,nodes,log}=fixture();c.tableBuildPairs();await c.startTableGame('gluecksspirale');assert.equal(c.gluecksspiraleState.target,50);const id=c.gluecksspiraleState.id;
 nodes['spiral-settings-target'].value='75';await c.saveSpiralSettings();assert.equal(c.gluecksspiraleState.target,50);assert.equal(c.gluecksspiraleState.id,id);
 await c.tableReset('gluecksspirale');c.tableDraft('gluecksspirale').target=10;await c.startTableGame('gluecksspirale');
 assert.equal(c.gluecksspiraleState.target,75);assert.equal(log.requests.at(-1).target,75);assert(nodes['gluecksspirale-start-card'].innerHTML.includes('75 Holz'));assert(!nodes['gluecksspirale-start-card'].innerHTML.includes('id="gluecksspirale-target"'));
});
test('the game page and hub show the saved default rather than a hardcoded 50',async()=>{
 const {c,nodes}=fixture();nodes['spiral-settings-target'].value='80';await c.saveSpiralSettings();assert.equal(nodes['spiral-hub-target'].textContent,'80');assert(nodes['gluecksspirale-start-card'].innerHTML.includes('80 Holz'));
});
test('configured 75 starts the final round; 83 beats 78 even though both teams exceed the goal',async()=>{
 const {c,nodes}=fixture();nodes['spiral-settings-target'].value='75';await c.saveSpiralSettings();c.tableBuildPairs();await c.startTableGame('gluecksspirale');
 for(const end of [[0,0],[2,3]]){
  for(let i=0;i<6;i++)for(const pins of [6,7])await c.tableAction('gluecksspirale','throw',{kind:'pins',pins});
  for(const pins of end)await c.tableAction('gluecksspirale','throw',pins?{kind:'pins',pins}:{kind:'miss'});
 }
 assert.equal(c.gluecksspiraleState.finalRound,1);assert.equal(c.gluecksspiraleState.readyToFinish,true);assert.deepEqual(plain(c.gluecksspiraleState.scores),{G1:78,G2:83});
 await c.tableAction('gluecksspirale','finish');assert.deepEqual(plain(c.gluecksspiraleState.winners),['G2']);
});
function persistence(){
 const app=read('js/app.js'),clubs=read('js/clubs.js');
 function extract(source,name){const start=source.indexOf('function '+name+'('),end=name==='selectClub'?source.indexOf('\nfunction updateAppHeader',start):source.indexOf('\n}\n',start)+2;assert(start>=0&&end>start);return source.slice(start,end);}
 const names=['getSerializableState','getFirestoreState','applyLoadedState'],source=names.map(name=>extract(app,name)).join('\n')+'\n'+extract(clubs,'syncCurrentClubToStore')+'\nasync '+extract(clubs,'selectClub');
 const builtins=new Set(['JSON','Number','String','Math','Object','Array','Date','undefined','parseFloat','parseInt','isNaN','isFinite']);
 const env=Object.fromEntries([...source.matchAll(/\b[a-zA-Z_]\w*\b/g)].filter(m=>!builtins.has(m[0])).map(m=>[m[0],null]));
 for(const m of source.matchAll(/(?<![.\w])([a-zA-Z_]\w*)\(/g))if(!builtins.has(m[1]))env[m[1]]=()=>({});
 Object.assign(env,{window:{firestoreApi:{}},document:{getElementById:()=>({style:{},classList:{add(){},remove(){}}})},console:{log(){},error(){}},ACTIVE_CLUB:'Club A',CLUBS:{'Club A':{avatar:''}},persons:[],getFirestorePersonsWithFineTotals:()=>[],getTodayMeta:()=>({}),HAUS_DEFAULTS:{hoch:{},tief:{}},TANNENBAUM_DEFAULT_BASE:{},KCTableGames:new Function('window',read('js/games/table-games-core.js')+';return window.KCTableGames;')({}),gluecksspiraleSettings:{target:75},sechstageState:{},blackjackState:{},gluecksspiraleState:{},penaltyStatsLog:[],SPIELE_KATALOG:[],DRINKS:[],normalizeGroupColorKey:x=>x,loadFromFirestore:async()=>false,saveToFirestore:async()=>true,startLivePersonSync:async()=>{},getClubFirestoreId:()=> 'club'});
 const functions=new Function('env','with(env){'+source+';return {getSerializableState,getFirestoreState,applyLoadedState,syncCurrentClubToStore,selectClub};}')(env);
 return {env,...functions};
}
test('actual local and Firestore snapshots contain the club target',()=>{
 const p=persistence();assert.deepEqual(p.getSerializableState().gluecksspiraleSettings,{target:75});assert.deepEqual(p.getFirestoreState().gluecksspiraleSettings,{target:75});
});
test('actual Firestore loading restores the target and defaults missing legacy settings to 50',()=>{
 const p=persistence();p.applyLoadedState({persons:[],gluecksspiraleSettings:{target:90}});assert.equal(p.env.gluecksspiraleSettings.target,90);
 p.applyLoadedState({persons:[]});assert.equal(p.env.gluecksspiraleSettings.target,50);
});
test('actual club cache and club selection restore their own target after switching',async()=>{
 const p=persistence();p.syncCurrentClubToStore();assert.equal(p.env.CLUBS['Club A'].gluecksspiraleSettings.target,75);
 p.env.gluecksspiraleSettings={target:90};await p.selectClub('Club A');assert.equal(p.env.gluecksspiraleSettings.target,75);
 p.env.CLUBS['Club B']={avatar:''};await p.selectClub('Club B');assert.equal(p.env.gluecksspiraleSettings.target,50);
});
test('the reorganized settings retain every existing control and use accessible card headings',()=>{
 const html=read('getraenke-abrechnung.html'),part=html.slice(html.indexOf('id="tab-spiele-einstellungen"'),html.indexOf('<!-- VERWALTUNG -->'));
 for(const id of ['haus-hoch-neun','haus-hoch-kranz','haus-hoch-gosse','haus-tief-neun','haus-tief-kranz','haus-tief-gosse','tannenbaum-settings-grid','tannenbaum-ontop-check','tannenbaum-hard-rule-check','lotterie-min-amount','lotterie-max-amount','tiberius-min-pins','tiberius-max-pins','spiral-settings-target'])assert(part.includes('id="'+id+'"'),id);
 assert.equal((part.match(/class="game-settings-card/g)||[]).length,12);assert.equal((part.match(/aria-labelledby=/g)||[]).length,12);assert(!part.includes('style='));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
