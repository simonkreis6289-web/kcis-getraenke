const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const previous=read('tests/v187-regression.cjs'),fixture=new Function('require','__dirname',previous.slice(0,previous.indexOf("test('every start"))+';return fixture;')(require,__dirname);
function historical(){
 const {document}=parseHTML(read('getraenke-abrechnung.html')),people=[{name:'Zoe'},{name:'anna'},{name:'Ben',inactive:true},{name:'Gast',isGuest:true},{name:'Trinken',isDrinksOnly:true}];
 const c={window:{},document,persons:people,ACTIVE_CLUB:'Testclub',STRAFEN:[{key:'gosse',label:'Gosse'},{key:'klingel',label:'Klingel'}],strafPrices:{gosse:.1,klingel:2},monatsbeitrag:30,STRAFEN_LIMIT:10,timePenaltySettings:{},escapeCashText:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),showToast(){},confirm:()=>true,navigator:{onLine:true},crypto:require('node:crypto').webcrypto,console,getClubFirestoreId:()=> 'testclub',refreshCashHistory:async()=>{}};
 for(const el of document.querySelectorAll('input,button'))el.focus=()=>{};
 vm.createContext(c);for(const file of ['js/birthdays.js','js/historical-evenings.js']){vm.runInContext(read(file),c);Object.assign(c,c.window);}c.openHistoricalEvening();return {c,document,people,d:vm.runInContext('historicalDraft',c)};
}
function snap(f){return f.c.KCHistorical.snapshot(f.d,{today:'2026-11-10'});}
test('new backfills list only active keglers alphabetically and keep live member data unchanged',()=>{
 const f=historical(),before=plain(f.people);assert.deepEqual(plain(f.d.rows.map(r=>r.name)),['anna','Gast','Zoe']);assert.deepEqual([...f.document.querySelectorAll('.historical-roster-row strong')].map(x=>x.textContent),['anna','Gast','Zoe']);assert.deepEqual(plain(f.people),before);
});
test('multiple free reasons stay individual in the normal PDF snapshot; cap and on-top amounts sum in cents',()=>{
 const f=historical();f.c.markHistoricalPresent();const r=f.d.rows[0];r.counts.klingel=4;r.freeItems=[{reason:'Wette',amount:'3,25',onTop:false},{reason:'Einsatz',amount:'2.75',onTop:false},{reason:'Zuschlag',amount:'1.01',onTop:true}];const p=snap(f).members[0];assert.equal(p.penaltyTotal,11.01);assert.equal(p.total,41.01);assert.deepEqual(plain(p.freeStrafen),[{reason:'Wette',amount:3.25,onTop:false},{reason:'Einsatz',amount:2.75,onTop:false},{reason:'Zuschlag',amount:1.01,onTop:true}]);assert.equal(snap(f).manualDraft.rows[0].freeItems.length,3);
 for(const bad of [{reason:'',amount:'2',onTop:false},{reason:'Wette',amount:'-2',onTop:false},{reason:'Wette',amount:'1.001',onTop:false}]){r.freeItems=[bad];assert.throws(()=>snap(f));}
});
test('old drafts migrate without duplicate charges and preserve explicitly archived participants',()=>{
 const f=historical(),old={...plain(f.d),rows:[{...plain(f.d.rows[0]),status:'present',normalExtra:'2',onTopExtra:'3',freeItems:undefined},{name:'Ben',included:false,counts:{}},{name:'Ben alt',included:true,status:'present',counts:{}}]};const upgraded=f.c.KCHistorical.upgrade(old,[{name:'Ben',inactive:true},{name:'Ben alt',inactive:true}]);assert.equal(upgraded.rows.length,2);assert.equal(upgraded.rows[0].freeItems.length,2);assert.deepEqual(plain(f.c.KCHistorical.upgrade(upgraded).rows),plain(upgraded.rows));assert.equal(old.rows[0].normalExtra,'2');
});
test('actual editor adds, edits, sums and removes separate amounts without a horizontal member matrix',()=>{
 const f=historical(),c=f.c; c.markHistoricalPresent();c.selectHistoricalPerson(0);c.addHistoricalFreeItem();c.addHistoricalFreeItem();
 function edit(i,key,value){const el=f.document.querySelector('[data-free-item="'+i+'"] [data-free-field="'+key+'"]');el.value=value;c.changeHistoricalInput({target:el});}
 edit(0,'reason','Wette gewonnen');edit(0,'amount','2.20');edit(1,'reason','Extra');edit(1,'amount','1.30');assert.equal(f.document.querySelector('[data-historical-total="0"]').textContent.replace(/\s/g,''),'33,50€');assert.equal(snap(f).members[0].freeStrafen.length,2);c.removeHistoricalFreeItem(0);assert.equal(snap(f).members[0].total,31.3);assert(!f.document.querySelector('#historical-body'));
});
test('actual archive submission sends individual free rows to the normal generator and saves a reopenable draft',async()=>{
 const f=historical(),c=f.c;c.markHistoricalPresent();f.d.rows[0].freeItems=[{reason:'Wette A',amount:'2',onTop:false},{reason:'Wette B',amount:'3',onTop:true}];let generated,saved,downloaded;
 c.generateStrafenPDF=async s=>(generated=s,{save:name=>downloaded=name});c.window.firestoreApi={saveHistoricalStrafenEvent:async(_,id,payload)=>{saved=payload;return 1;}};await c.submitHistoricalEvening({preventDefault(){}});assert.equal(generated.members[0].freeStrafen.length,2);assert.equal(saved.manualDraft.rows[0].freeItems[1].reason,'Wette B');assert(downloaded.endsWith('.pdf'));assert(f.document.getElementById('historical-evening-modal').classList.contains('hidden'));
});
function darts(){const f=fixture();vm.runInContext(read('js/game-inputs.js'),f.c);f.c.startDartsGame();f.c.getPenaltyKeyByType=t=>t;f.c.changeMultipleSyncedPersonCounters=async()=>true;return f;}
function selected(f){return f.document.querySelector('#tab-darts .gi-options [aria-pressed=true]').textContent;}
test('Darts alternates after actual bookings, persists its turn, allows override and retains the top finish button across reset',async()=>{
 const f=darts(),c=f.c;assert.equal(selected(f),'Wand');await c.gameInputThrow('darts',2);assert.equal(selected(f),'TV');await c.gameInputThrow('darts',3);assert.equal(selected(f),'Wand');c.gameInputTeam('darts','T2');await c.gameInputThrow('darts',4);assert.equal(c.dartsState.roundThrows.T2.length,2);assert.equal(selected(f),'Wand');c.dartsState=plain(c.dartsState);c.renderDarts();assert.equal(selected(f),'Wand');
 const button=f.document.querySelector('#tab-darts>.game-input-panel>button[onclick="finishDartsRound()"]');assert(button);assert(!button.disabled);assert(button.previousElementSibling.classList.contains('game-pinpad'));c.resetDartsGame();c.startDartsGame();assert.equal(f.document.querySelectorAll('#tab-darts button[onclick="finishDartsRound()"]').length,1);assert(f.document.querySelector('#tab-darts>.game-input-panel>button[onclick="finishDartsRound()"]'));
});
test('Darts special throws advance only after a successful personal booking, for all four special types',async()=>{
 for(const [pins,gosse,type] of [[9,false,'9er'],[12,false,'kranz'],[0,true,'gosse'],[0,false,'durchgeworfen']]){
  const f=darts(),c=f.c;if(type==='durchgeworfen'){c.dartsThrowTeam='T1';c.openDartsPenaltyPlayerModal(type,'T1',0);}else await c.gameInputThrow('darts',pins,gosse);assert.equal(selected(f),'Wand');
  f.document.getElementById('darts-penalty-player-select').value='A';c.changeMultipleSyncedPersonCounters=async()=>false;await c.confirmDartsPenaltyPlayer();assert.equal(selected(f),'Wand');assert.equal(c.dartsState.roundThrows.T1.length,0);c.changeMultipleSyncedPersonCounters=async()=>true;await c.confirmDartsPenaltyPlayer();assert.equal(selected(f),'TV');assert.equal(c.dartsState.roundThrows.T1.length,1);
 }
});
test('Tannenbaum winner adds exactly 5 to the losing team, undo/restore revoke it and settlement includes it once',()=>{
 const f=fixture(),c=f.c;c.startTannenbaumSetup();c.tannenbaumState.teams.T1.remaining=Object.fromEntries(Object.keys(c.TANNENBAUM_BASE).map(k=>[k,0]));c.tannenbaumState.teams.T1.remaining[1]=1;c.tannenbaumThrowTeam='T1';c.handleTannenbaumThrow(1);assert.equal(c.tannenbaumState.teams.T2.bonus,5);c.syncTannenbaumWinnerBonus();assert.equal(c.tannenbaumState.teams.T2.bonus,5);c.undoLastTannenbaumThrow();assert.equal(c.tannenbaumState.teams.T2.bonus,0);assert.equal(c.tannenbaumState.teams.T1.finished,false);c.tannenbaumThrowTeam='T1';c.handleTannenbaumThrow(1);const expected=c.getTannenbaumOpenNumbersTotal('T2').total+5;c.finishTannenbaumGame();assert.equal(c.strafenHistory[0].bonus.T2,5);assert.equal(c.strafenHistory[0].totals.T2,expected);assert(c.strafenHistory[0].assignedTo.filter(p=>p.team==='T2').every(p=>p.amount===expected));
});
test('lottery next throw follows the drawn starter and frozen seat rotation across columns and a remote roundtrip',async()=>{
 const f=darts(),c=f.c;await c.startLotterieGameFinal('B');c.lotterieState.columns=[1,2];const expected=['B','D','C','A','Gast'];assert.deepEqual(plain(c.getLotteriePlayers().map(p=>p.name)),expected);
 for(let col=0;col<2;col++)for(const name of expected){assert.deepEqual(plain(c.gameInputTarget()),{name,col});c.lotterieState.throws[name][col]=0;}
 assert.equal(c.gameInputTarget(),null);c.seatingOrder.reverse();const payload=c.getLiveLotteriePayload();c.applyLiveLotterieState({state:plain(payload)});assert.deepEqual(plain(c.getLotteriePlayers().map(p=>p.name)),expected);
});
function extract(name,next){const source=read('dashboard.html'),a=source.indexOf('function '+name+'('),b=source.indexOf('\nfunction '+next+'(',a);return source.slice(a,b);}
test('automatic dashboard selection honors Darts start even while older games remain active, and honors manual mode',()=>{
 const env={state:{dashboardActiveGame:'darts'},games:['tannenbaum','darts','lotterie'],$:()=>({value:'auto'}),gameState:k=>({active:true,startedAt:k==='tannenbaum'?'2026-11-11':'2026-11-10'}),liveGames:{}};const chosen=new Function('e','with(e){'+extract('chosenGame','node')+';return chosenGame;}')(env);assert.equal(chosen(),'darts');env.$=()=>({value:'lotterie'});assert.equal(chosen(),'lotterie');
});
test('dashboard shows TV left and Wand right with their own scores, without mutating game state',()=>{
 const env={state:{groupSettings:{T1:{name:'Wand'},T2:{name:'TV'}}},seatingLive:null,safe:String,numeric:Number,dashboardTeamColor:()=> '#111',sichernDashboardThrower:()=>'',fmt:new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'})};
 for(const [name,next,data,selector] of [['renderDartsBoard','renderHausBoard',{scores:{T1:111,T2:222}},'.dart-card .dart-team'],['renderTorBoard','paintGame',{scores:{T1:1,T2:2}},'.tor-tv-team>span'],['renderSichernBoard','renderTorBoard',{mode:'team',order:['T1','T2'],secured:{T1:1,T2:2}},'.tv-board>div>div>strong:first-child']]){
  const render=new Function('e','with(e){'+extract(name,next)+';return '+name+';}')(env),before=plain(data),doc=parseHTML(render(data)).document,teams=[...doc.querySelectorAll(selector)].map(x=>x.textContent);assert.deepEqual(teams,['TV','Wand'],name);assert.deepEqual(data,before);
 }
});
test('mirrored starter draws show the same timed frame and winner, expire and render hostile names as text',()=>{
 const {document}=parseHTML('<div id="tv-starter-draw"><div id="tv-draw-title"></div><div id="tv-draw-value"></div><div id="tv-draw-status"></div></div>'),c={window:{},document,crypto:require('node:crypto').webcrypto,persistState(){}};vm.createContext(c);vm.runInContext(read('js/starter-draw.js'),c);const d={kind:'player',title:'Startspieler',startedAt:1000,interval:110,steps:18,frames:['A','B','C'],winner:'B'};assert.equal(c.window.KCStarterDraw.frame(d,1330).value,'A');assert.equal(c.window.KCStarterDraw.frame(d,2980).value,'B');assert(c.window.KCStarterDraw.frame(d,2980).done);assert.equal(c.window.KCStarterDraw.frame(d,10000),null);const active=c.beginDashboardDraw({...d,winner:'<img src=x>'});c.paintDashboardDraw({...active,startedAt:Date.now()-2000});assert.equal(document.getElementById('tv-draw-value').textContent,'<img src=x>');assert(!document.querySelector('img'));c.cancelDashboardDraw('other');assert(c.window.kcDashboardDraw);c.cancelDashboardDraw(active.id);assert.equal(c.window.kcDashboardDraw,null);
});
function resultModule(f){vm.runInContext(read('js/game-results.js'),f.c);return f.c.window.KCGameResults;}
test('history records tied team loser ranks with frozen team/player names and no duplicate monetary booking',()=>{
 const f=fixture(),g=resultModule(f),s={id:'race_unique',finished:true,teams:[{id:'R1',name:'Sieger',players:['A','B']},{id:'R2',name:'Team 2',players:['C']},{id:'R3',name:'Team 3',players:['D','Gast']}],winners:['R1'],teamLoserGroups:[{teamIds:['R2','R3']}],scores:{R1:30,R2:10,R3:10}};
 const before=plain(s),list=g.append([],'sechstage',s,{server:true});assert.deepEqual(plain(list[0].ranking),[{rank:1,team:'Team 2',names:['C']},{rank:1,team:'Team 3',names:['D','Gast']}]);assert.equal(g.append(list,'sechstage',s).length,1);assert.deepEqual(plain(s),before);assert(g.markup(list[0]).includes('Team 3 · D, Gast'));assert(!g.markup(list[0]).includes('onclick'));
});
test('real Darts and Fuchsjagd finishes add one named result and existing Mensch/Hausnummer/fast-button entries render',async()=>{
 const f=fixture(),c=f.c,g=resultModule(f);c.changeMultipleSyncedPersonCounters=async()=>true;c.getFirstLoserStrafeKey=()=> 'loser';c.startDartsGame();c.dartsState.scores.T1=1;c.dartsState.roundThrows.T1=[{hit:'2',value:2}];c.finishDartsRound();assert.equal(c.strafenHistory.length,1);assert.deepEqual(plain(c.strafenHistory[0].ranking),[{rank:1,team:'TV',names:['C','Gast','D']}]);c.finishDartsRound();assert.equal(c.strafenHistory.length,1);
 c.fuchsjagdState={active:true,fox:'A',hunters:['B','C'],startedAt:'unique'};await c.finishFuchsjagd(true,'');assert.deepEqual(plain(c.strafenHistory[0].ranking),[{rank:1,names:['B','C']}]);
 for(const type of ['mensch','haushoch','haustief']){const html=g.markup({type,ranking:[{names:['A'],rank:1},{names:['B'],rank:2},{names:['C'],rank:3}]});for(const name of ['1. Verlierer','2. Verlierer','3. Verlierer'])assert(html.includes(name));}
 const html=g.markup({type:'teamspiel_strafe',spieltyp:'Darts',loser:'T1',teamName:'Wand',members:['A','<img>']});assert(html.includes('Wand · A, &lt;img&gt;'));assert(!parseHTML(html).document.querySelector('img'));
});
test('real six-days transaction stores the result atomically, repeats idempotently and protects it against stale general saves',async()=>{
 const source=read('tests/v178-regression.cjs'),lib=new Function('require','__dirname',source.slice(0,source.indexOf("test('two partners"))+';return {api,fullRace,request,evening};')(require,__dirname),state=lib.fullRace(),f=lib.api({sechstageState:state});vm.runInContext(read('js/game-results.js'),f.c);
 const request=lib.request(state,'finish'),result=await f.c.transactSechsGame.call(f.c,'club',request);assert.equal(result.gameResultsHistory.length,1);assert.equal(f.root().strafenHistory.length,1);assert.equal(result.gameResultsHistory[0].ranking[0].rank,1);const before=f.writes();await f.c.transactSechsGame.call(f.c,'club',request);assert.equal(f.writes(),before);assert.equal(f.root().strafenHistory.length,1);
 await f.c.saveClubState.call(f.c,'club',{currentEveningStartedAt:lib.evening,strafenHistory:[]});assert.equal(f.root().strafenHistory.length,1);
});
test('duplicate Darts special-throw confirmation waits for one booking and switches exactly once',async()=>{
 const f=darts(),c=f.c;await c.gameInputThrow('darts',9);f.document.getElementById('darts-penalty-player-select').value='A';let release,calls=0;c.changeMultipleSyncedPersonCounters=async()=>{calls++;return new Promise(resolve=>release=resolve);};const first=c.confirmDartsPenaltyPlayer();await c.confirmDartsPenaltyPlayer();assert.equal(calls,1);assert.equal(selected(f),'Wand');release(true);await first;assert.equal(c.dartsState.roundThrows.T1.length,1);assert.equal(selected(f),'TV');
});
