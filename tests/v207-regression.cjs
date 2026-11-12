const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const policy=new Function('window',read('js/game-fine-policy.js')+';return window.KCGameFinePolicy;')({});
const catalog=[{key:'normal',label:'Andere Strafe'},...Array.from({length:3},(_,i)=>({key:'loser'+(i+1),label:(i+1)+'. Verlierer'}))],evening='2026-11-11T18:00:00Z';
const state=(extra={})=>({STRAFEN:catalog,strafPrices:{normal:1,loser1:1,loser2:.5,loser3:.2},STRAFEN_LIMIT:30,currentEveningStartedAt:evening,individualGameLedger:[],strafenHistory:[],...extra});
const person=(normal=28,extra={})=>({name:'A',present:true,strafen:{normal},gameFineBase:{otherNormalCents:0,otherTopCents:0,kingCents:0},...extra});
const fee=(key='siebener',amountCents=650)=>({id:'fee_'+key,personName:'A',gameKey:key,reason:policy.titles[key],amountCents,onTop:true,eveningStartedAt:evening});
const total=(p,s)=>policy.applyTotals([p],s)[0].strafTotal;
test('all 20 games default to capped, including old forcibly OnTop ledger entries',()=>{
 assert.equal(Object.keys(policy.titles).length,20);
 for(const key of Object.keys(policy.titles)){assert(!policy.enabled({},key));const s=state({individualGameLedger:[fee(key)]});assert.equal(total(person(),s),30,key);s.gameFineSettings={[key]:true};assert.equal(total(person(),s),['haushoch','haustief'].includes(key)?30:34.5,key);}
});
test('cap and Gossenkönig stay separate; below the cap OnTop never duplicates a charge',()=>{
 const p=person(28,{gameFineBase:{otherNormalCents:0,otherTopCents:0,kingCents:300}}),s=state({individualGameLedger:[fee()]});assert.equal(total(p,s),33);s.gameFineSettings={siebener:true};assert.equal(total(p,s),37.5);
 for(const onTop of [false,true])assert.equal(total(person(20),state({individualGameLedger:[fee()],gameFineSettings:{siebener:onTop}})),26.5);
});
test('only the selected game bypasses the cap and stale evenings never contribute',()=>{
 const s=state({individualGameLedger:[fee(),fee('hindernis',300),{...fee('lattenzaun',1000),eveningStartedAt:'old'}],gameFineSettings:{hindernis:true}});assert.equal(total(person(),s),33);assert.equal(total(person(),{...s,gameFineSettings:{siebener:true}}),36.5);
});
test('Tannenbaum, Lotterie, Tiberius, manual extras and explicit king charges are classified once',()=>{
 const p=person(28,{tannenbaumCharges:[{amount:5,onTop:true}],freeStrafen:[{reason:'Lotterie',amount:5.1,onTop:true},{reason:'Gossenkönig',amount:3,onTop:false},{reason:'Spende',amount:2,onTop:true}]}),s=state({strafenHistory:[{type:'lotterie',assignedTo:[{name:'A',amount:5.1,onTop:true}]},{type:'tiberius',assignedTo:[{name:'A',amount:4,onTop:true}]}]});
 assert.equal(total(p,s),35);assert.equal(policy.charges(p,s).filter(x=>x.gameKey==='lotterie').length,1);s.gameFineSettings={tannenbaum:true,tiberius:true};assert.equal(total(p,s),44);assert.equal(total(p,{...s,gameFineSettings:{}}),35);
});
test('loser counters move out of the normal pool without creating a second penalty',()=>{
 const history=[{id:'darts',type:'game_result',gameKey:'darts',ranking:[{rank:1,names:['A','B']}] }],s=state({strafenHistory:history,gameFineSettings:{darts:true}});
 assert.equal(total(person(34,{strafen:{normal:34,loser1:1}}),s),31);assert.equal(total(person(28,{strafen:{normal:28,loser1:1}}),s),29);assert.equal(total(person(34,{strafen:{normal:34,loser1:0}}),s),30);
 s.strafenHistory=[...history,...history];assert.equal(policy.transfers(person(34,{strafen:{normal:34,loser1:1}}),s).amountCents,100);
});
test('exact counter receipts retain blackjack bust and placement penalties; active bust transfers once',()=>{
 const p=person(34,{strafen:{normal:34,loser1:2}}),s=state({gameFineSettings:{blackjack:true},strafenHistory:[{id:'bj',type:'game_result',gameKey:'blackjack',counterCharges:[{personName:'A',key:'loser1',delta:2}]}]});assert.equal(total(p,s),32);
 s.strafenHistory=[];s.blackjackState={active:true,history:[{action:'card',name:'A',bustPenalty:true}]};assert.equal(total(p,s),31);s.blackjackState.history.push({action:'card',name:'A',bustPenalty:false});assert.equal(total(p,s),30);
});
test('policy evaluation leaves the source ledger, settings and archived snapshots untouched',()=>{const p=person(),s=state({individualGameLedger:[fee()]}),before=JSON.stringify({p,s});policy.applyTotals([p],s);assert.equal(JSON.stringify({p,s}),before);});
const legacy=read('tests/v186-regression.cjs'),prefix=legacy.slice(0,legacy.indexOf("test('7er")).replace('return {api,data,root:','return {env,api,data,root:');
const fixtures=new Function('require','__dirname',prefix+';return {server,g,start,singleRule,req};')(require,__dirname);
function server(initial={}){const st=fixtures.server({...state(),persons:[person()],...initial});st.env.window.KCGameFinePolicy=policy;st.env.window.KCGameResults=new Function('window',read('js/game-results.js')+';return window.KCGameResults;')({});const src=read('js/firebase.js'),a=src.indexOf('  async updateGameFineSettings('),b=src.indexOf('\n  },',a);st.api.updateGameFineSettings=new Function('env','with(env){return ({'+src.slice(a,b+4)+'}).updateGameFineSettings;}')(st.env);return st;}
let op=0;const setting=(gameKey,onTop)=>({gameKey,onTop,opId:'fine_test_'+(++op)});
test('actual atomic settings recalculate dashboard totals and a stale state upload cannot revert them',async()=>{
 const st=server({individualGameLedger:[fee()],hindernisState:{revision:1,eveningStartedAt:evening},individualGameRevision:2,dashboardActiveGame:'lattenzaun'}),r=setting('siebener',true);await st.api.updateGameFineSettings('club',r);assert.equal(st.root().persons[0].strafTotal,34.5);await st.api.updateGameFineSettings('club',r);assert.equal(st.root().gameFineSettingsRevision,1);
 await st.api.saveClubState('club',{persons:[person()],currentEveningStartedAt:evening,gameFineSettings:{},gameFineSettingsRevision:0,dashboardActiveGame:'tannenbaum',individualGameRevision:0});assert.equal(st.root().persons[0].strafTotal,34.5);assert(st.root().gameFineSettings.siebener);assert.equal(st.root().dashboardActiveGame,'lattenzaun');await st.api.updateGameFineSettings('club',setting('siebener',false));assert.equal(st.root().persons[0].strafTotal,30);
});
test('simultaneous per-game settings merge and a failed transaction never partially changes totals',async()=>{
 const st=server({individualGameLedger:[fee(),fee('hindernis',300)]});await Promise.all([st.api.updateGameFineSettings('club',setting('siebener',true)),st.api.updateGameFineSettings('club',setting('hindernis',true))]);assert.deepEqual(st.root().gameFineSettings,{siebener:true,hindernis:true});assert.equal(st.root().persons[0].strafTotal,37.5);st.fail(true);await assert.rejects(()=>st.api.updateGameFineSettings('club',setting('siebener',false)));assert(st.root().gameFineSettings.siebener);assert.equal(st.root().persons[0].strafTotal,37.5);
});
test('live loser counters remain authoritative when an older app state is uploaded',async()=>{
 const st=server({persons:[person(34)],strafenHistory:[{id:'game',gameKey:'darts',type:'game_result',ranking:[{names:['A'],rank:1}]}]});st.data.set('clubs/club/livePersons/a',{name:'A',strafen:{normal:34,loser1:1}});await st.api.updateGameFineSettings('club',setting('darts',true));assert.equal(st.root().persons[0].strafTotal,31);await st.api.saveClubState('club',{persons:[person(34)],currentEveningStartedAt:evening});assert.equal(st.root().persons[0].strafTotal,31);
});
test('actual hurdle money booking and undo honor the cap with and without OnTop',async()=>{
 for(const onTop of [false,true]){const s=fixtures.singleRule('pay11',10),st=server({persons:[person(30),{...person(0),name:'B'}],currentEveningStartedAt:s.eveningStartedAt,hindernisState:s,gameFineSettings:{hindernis:onTop},hindernisState:{...s,gameFineFrozen:true,onTop}}),r=fixtures.req(s,'throw',{kind:'pins',pins:1}),out=await st.api.transactIndividualGame('club',r);assert.equal(st.root().persons[0].strafTotal,onTop?30.2:30);await st.api.transactIndividualGame('club',r);assert.equal(st.root().individualGameLedger.length,1);await st.api.transactIndividualGame('club',fixtures.req(out.state,'undo'));assert.equal(st.root().persons[0].strafTotal,30);assert.equal(st.root().individualGameLedger.length,0);}
});
function ui(){const {document}=parseHTML(read('getraenke-abrechnung.html')),st=server(),c={document,navigator:{onLine:true},ACTIVE_CLUB:'Club',getClubFirestoreId:()=> 'club',crypto:require('node:crypto').webcrypto,window:{addEventListener(){},firestoreApi:{...st.api,subscribeToClubState:(_,cb)=>{cb(st.root());return ()=>{};}}},KCGameFinePolicy:policy,strafenHistory:[],STRAFEN:catalog,strafPrices:state().strafPrices,STRAFEN_LIMIT:30,currentEveningStartedAt:evening,persistState(){},showToast(){},saveToFirestore:async()=>true,renderAll:()=>c.renderGameFineSettings()};vm.createContext(c);vm.runInContext(read('js/game-fine-settings.js'),c);c.renderGameFineSettings();return {c,document,st};}
test('actual UI exposes all eligible default-off settings and syncs the legacy and inline controls',async()=>{
 const {c,document:d}=ui();assert.equal(d.querySelectorAll('#game-fine-settings-grid input').length,18);for(const i of d.querySelectorAll('[data-game-fine]')){assert(!i.checked);assert(!i.disabled);}assert.equal(d.querySelectorAll('[data-game-fine-panel]').length,18);assert(await c.setGameFineOnTop('tannenbaum',true));assert(d.getElementById('tannenbaum-ontop-check').checked);for(const i of d.querySelectorAll('[data-game-fine="tannenbaum"]'))assert(i.checked);assert(!d.querySelector('[data-game-fine="siebener"]').checked);
});
test('a failed or offline setting restores the displayed value and a delayed result cannot cross clubs',async()=>{
 const {c,document:d,st}=ui();st.fail(true);assert.equal(await c.setGameFineOnTop('siebener',true),false);assert(!d.querySelector('[data-game-fine="siebener"]').checked);c.navigator.onLine=false;assert.equal(await c.setGameFineOnTop('siebener',true),false);c.navigator.onLine=true;st.fail(false);let release;c.window.firestoreApi.updateGameFineSettings=async()=>{await new Promise(r=>release=r);return {gameFineSettings:{siebener:true},gameFineSettingsRevision:1};};const pending=c.setGameFineOnTop('siebener',true);await new Promise(r=>setImmediate(r));c.ACTIVE_CLUB='Other';c.resetGameFineSettings();release();assert.equal(await pending,false);assert.deepEqual(plain(vm.runInContext('gameFineSettings',c)),{});
});
test('dashboard loads the new renderer and includes all new games in the actual selector',()=>{
 const {document:d}=parseHTML(read('dashboard.html'));for(const key of ['bergundtal','ballermann','lattenzaun'])assert(d.querySelector('#game-select option[value="'+key+'"]'),key);for(const src of ['js/games/extra-core.js','js/games/extra-view.js'])assert([...d.querySelectorAll('script[src]')].some(s=>s.getAttribute('src').startsWith(src)));
});
function appFinance(){
 const app=read('js/app.js'),a=app.indexOf('function getMissingGameCharges('),b=app.indexOf('\nfunction calcHighestPresentStrafenTotal',a),env={...state(),persons:[person(28,{freeStrafen:[],tannenbaumCharges:[]})],KCGameFinePolicy:policy,getLateStrafeKey:()=>null,getEarlyLeaveStrafeKey:()=>null,getGosseKings:()=>[],getClubFirestoreId:()=> 'club',ACTIVE_CLUB:'Testclub',monatsbeitrag:30,document:{addEventListener(){}},window:{addEventListener(){}},navigator:{onLine:true}};
 vm.createContext(env);vm.runInContext(read('js/game-fine-settings.js'),env);env.getPersonTannenbaumTotal=p=>(p.tannenbaumCharges||[]).filter(x=>!env.gameFineOnTop(x,'tannenbaum')).reduce((n,x)=>n+x.amount,0);vm.runInContext(app.slice(a,b),env);env.normalizeAttendanceStatus=()=> 'present';env.ATTENDANCE_STATUS={PRESENT:'present',EXCUSED:'excused',UNEXCUSED:'unexcused'};vm.runInContext(read('js/strafe-pdf.js'),env);return env;
}
test('actual app totals, cloud calculation basis and frozen PDF snapshot agree in both modes',()=>{
 const c=appFinance(),p=c.persons[0];c.individualGameLedger=[fee()];c.strafenHistory=[{id:'result',type:'game_result',gameKey:'siebener',title:'7er-Spiel',amounts:[{name:'A',amountCents:650}]}];
 assert.equal(c.calcPersonStrafenTotalCapped(p),30);assert.deepEqual(plain(c.gameFineBase(p)),{otherNormalCents:0,otherTopCents:0,kingCents:0});const capped=c.getStrafenSnapshot();assert.equal(capped.members[0].penaltyTotal,30);assert.equal(capped.members[0].total,60);assert(!capped.members[0].freeStrafen[0].onTop);
 c.applyGameFineSettings({gameFineSettings:{siebener:true},gameFineSettingsRevision:1});assert.equal(c.calcPersonStrafenTotalCapped(p),34.5);assert.deepEqual(plain(c.gameFineBase(p)),{otherNormalCents:0,otherTopCents:0,kingCents:0});const top=c.getStrafenSnapshot();assert.equal(top.members[0].total,64.5);assert(top.members[0].freeStrafen[0].onTop);assert(top.history[0].gameFineOnTop);assert.equal(capped.members[0].total,60);assert(!capped.history[0].gameFineOnTop);
});
test('the actual app moves legacy Tannenbaum fees and loser counters once, preserving time and manual fees',()=>{
 const c=appFinance(),p=c.persons[0];p.strafen={normal:34,loser1:1};p.tannenbaumCharges=[{amount:5,onTop:true}];p.freeStrafen=[{reason:'Anderer Zuschlag',amount:2,onTop:true}];c.strafenHistory=[{id:'darts',type:'game_result',gameKey:'darts',ranking:[{rank:1,names:['A']}]}];c.applyGameFineSettings({gameFineSettings:{darts:true,tannenbaum:true},gameFineSettingsRevision:1});assert.equal(c.calcPersonStrafenTotalCapped(p),38);assert.deepEqual(plain(c.gameFineBase(p)),{otherNormalCents:0,otherTopCents:0,kingCents:0});assert.equal(total({...p,gameFineBase:plain(c.gameFineBase(p))},{...state(),gameFineSettings:{darts:true,tannenbaum:true},strafenHistory:c.strafenHistory}),38);
});
test('changing policy never replaces current free fees with an older live-person copy',async()=>{const p=person(28,{freeStrafen:[{reason:'Tiberius',amount:4,onTop:false}] }),st=server({persons:[p]});st.data.set('clubs/club/livePersons/a',{name:'A',strafen:{normal:28},freeStrafen:[]});await st.api.updateGameFineSettings('club',setting('tiberius',true));assert.equal(st.root().persons[0].freeStrafen.length,1);assert.equal(st.root().persons[0].strafTotal,32);});
