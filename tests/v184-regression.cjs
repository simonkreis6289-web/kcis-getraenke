const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const sources=Object.fromEntries(['js/games/table-games-core.js','js/firebase.js'].map(p=>[p,read(p)]));
const previous=read('tests/v179-regression.cjs'),begin=previous.indexOf('async function runV179Tests('),end=previous.indexOf('\n test(',begin);
const h=new Function('return ('+previous.slice(begin,end).replace('async function','function')+'\n return {api,req,step,start,roll,stand,reveal,soloTotals,game,ctx,exported};})')()(sources),g=h.game;
const custom={jack:5,queen:6,king:7,ace:[2,12]};
const ready=()=>h.reveal(h.stand(h.stand(h.start('blackjack'))));
async function live(wood=[18,10],settings){
 const store=h.api();let state=g.empty('blackjack');
 const send=async(action,fields={})=>{const request=h.req(state,action,fields),out=await store.api.transactTableGame('club',request);state=out.state;return {request,out};};
 await send('start',{players:['A','B'],...(settings?{cardSettings:settings}:{})});
 for(const n of wood){let left=n;while(left>0){const pins=Math.min(9,left);await send('throw',{kind:'pins',pins});left-=pins;}await send('stand');}
 return {store,send,state:()=>state};
}
test('face cards use the game settings; old numeric cards retain their exact stored value',()=>{
 let s=h.start('blackjack',{cardSettings:custom});s=h.stand(h.stand(s));s=h.step(s,'card',{value:'J'}).state;assert.equal(s.scores.A,5);s=h.step(s,'card',{value:'K'}).state;assert.equal(s.scores.B,7);
 assert.equal(g.cardTotal(10,'Q',custom),16);assert.equal(g.cardTotal(10,3,custom),13);assert.equal(g.cardTotal(10,'K'),14);
 assert.equal(g.cardLabel('A',custom),'Ass (2/12)');assert.equal(g.cardLabel('J',custom),'Bube (5)');
});
test('ace supports a single fixed value or either order of two values, including both busting',()=>{
 for(const ace of [[2,12],[12,2]]){const settings={...custom,ace};assert.equal(g.cardTotal(9,'A',settings),21);assert.equal(g.cardTotal(10,'A',settings),12);assert.equal(g.cardTotal(20,'A',settings),22);}
 assert.equal(g.cardTotal(10,'A',{...custom,ace:[11]}),21);assert.equal(g.cardTotal(11,'A',{...custom,ace:[11]}),22);assert.equal(g.cardTotal(20,'A',{...custom,ace:[0]}),20);
});
test('invalid game card settings are rejected without mutating the old game',()=>{
 const base=g.empty('blackjack'),saved=plain(base);
 for(const settings of [{...custom,jack:-1},{...custom,queen:22},{...custom,king:1.5},{...custom,ace:[]},{...custom,ace:[1,1]},{...custom,ace:[1,2,3]},{...custom,ace:['1']},{...custom,ace:[Infinity]}])assert.throws(()=>h.step(base,'start',{players:['A','B'],cardSettings:settings}),/Kartenwerte/);
 assert.deepEqual(plain(base),saved);
});
test('game captures a copy of the settings and undo keeps that captured valuation',()=>{
 const settings=plain(custom);let s=h.start('blackjack',{cardSettings:settings});settings.jack=20;s=h.stand(h.stand(s));s=h.step(s,'card',{value:'J'}).state;s=h.step(s,'card',{value:'Q'}).state;s=h.step(s,'undo').state;
 assert.equal(s.cardSettings.jack,5);assert.equal(s.scores.A,5);assert.equal(g.currentName(s),'B');
});
test('correcting an earlier card keeps every throw and stop and leaves the next reveal in place',()=>{
 let s=h.start('blackjack',{players:['A','B','C']});s=h.roll(s,4);s=h.stand(s);s=h.roll(s,8);s=h.stand(s);s=h.stand(s);s=h.step(s,'card',{value:'J'}).state;s=h.step(s,'card',{value:'Q'}).state;
 const wood=plain(s.wood),stopped=plain(s.stopped);s=h.step(s,'card',{playerName:'A',value:'K'}).state;
 assert.deepEqual(plain(s.wood),wood);assert.deepEqual(plain(s.stopped),stopped);assert.equal(s.cardValues.B,'Q');assert.equal(g.currentName(s),'C');assert.equal(g.blackjackPhase(s),'cards');assert.equal(s.scores.A,8);
});
test('a fully revealed round accepts any card correction and stays ready without another throw',()=>{
 let s=ready();s=h.step(s,'card',{playerName:'A',value:'K'}).state;assert.equal(s.readyToFinish,true);assert.equal(g.blackjackPhase(s),'ready');assert.equal(s.scores.A,4);
 assert.throws(()=>h.roll(s,1),/beendet/);assert.throws(()=>h.stand(s),/beendet/);
});
test('the completed stop list keeps reveal active even if an older client left currentIndex stale',()=>{
 let s=h.stand(h.stand(h.start('blackjack')));s.currentIndex=0;assert.equal(g.blackjackPhase(s),'cards');s=h.step(s,'card',{value:'Q'}).state;assert.equal(s.cardValues.A,'Q');
});
test('changing bust to safe refunds only the extra; changing back charges once with idempotent retries',async()=>{
 const {store,send,state}=await live();await send('card',{value:'K'});await send('card',{value:'J'});assert.equal(store.person('A').strafen.loser1,1);
 const safe=await send('card',{playerName:'A',value:'J'});assert.equal(state().scores.A,20);assert.equal(store.person('A').strafen.loser1,0);await store.api.transactTableGame('club',safe.request);assert.equal(store.person('A').strafen.loser1,0);
 const bust=await send('card',{playerName:'A',value:'K'});await store.api.transactTableGame('club',bust.request);assert.equal(store.person('A').strafen.loser1,1);assert.equal(state().scores.A,22);
});
test('bust-to-bust and safe-to-safe corrections do not charge an extra fine',async()=>{
 const {store,send}=await live([20,10]);await send('card',{value:'Q'});await send('card',{value:'J'});await send('card',{playerName:'A',value:'K'});await send('card',{playerName:'B',value:'Q'});
 assert.equal(store.person('A').strafen.loser1,1);assert.equal(store.person('B')?.strafen.loser1||0,0);
});
test('undo correction restores the exact earlier card and reverses the refund without changing wood',async()=>{
 const {store,send,state}=await live();await send('card',{value:'K'});await send('card',{value:'J'});await send('card',{playerName:'A',value:'J'});await send('undo');
 assert.equal(state().cardValues.A,'K');assert.equal(state().cardValues.B,'J');assert.equal(state().wood.A,18);assert(state().readyToFinish);assert.equal(store.person('A').strafen.loser1,1);
});
test('finish ranks the corrected totals and finished games reject further card changes',async()=>{
 const {store,send,state}=await live();await send('card',{value:'K'});await send('card',{value:'J'});await send('card',{playerName:'A',value:'J'});await send('finish');
 assert.deepEqual(state().winners,['A']);assert.equal(store.person('A').strafen.loser1,0);assert.equal(store.person('B').strafen.loser1,1);await assert.rejects(()=>send('card',{playerName:'A',value:'K'}),/beendet/);
 const html=h.exported.renderTableGameBoard(state());assert(!html.includes('Über 21:'));assert(html.includes('Bube (2)'));assert(!html.includes('tableEditCard'));
});
test('invalid players, future reveals and card edits during throwing cannot modify the game',()=>{
 const s=h.stand(h.stand(h.start('blackjack'))),saved=plain(s);
 for(const fields of [{playerName:'nobody',value:'J'},{playerName:'B',value:'J'},{playerName:'A',value:'bad'}])assert.throws(()=>h.step(s,'card',fields),/Kartenwert/);
 assert.deepEqual(plain(s),saved);assert.throws(()=>h.step(h.start('blackjack'),'card',{playerName:'A',value:'J'}),/Zuerst/);
});
test('concurrent different corrections reject the stale request and duplicate corrections commit once',async()=>{
 const {store,send,state}=await live();await send('card',{value:'K'});await send('card',{value:'J'});const a=h.req(state(),'card',{playerName:'A',value:'J'}),b=h.req(state(),'card',{playerName:'A',value:'Q'});
 const results=await Promise.allSettled([store.api.transactTableGame('club',a),store.api.transactTableGame('club',b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
 await store.api.transactTableGame('club',a);assert.equal(store.person('A').strafen.loser1,0);
});
test('failed correction writes nothing; retry after success does not repeat the refund',async()=>{
 const {store,send,state}=await live();await send('card',{value:'K'});await send('card',{value:'J'});const request=h.req(state(),'card',{playerName:'A',value:'J'});
 store.fail(true);await assert.rejects(()=>store.api.transactTableGame('club',request),/Network/);assert.equal(store.person('A').strafen.loser1,1);assert.equal(store.root().blackjackState.cardValues.A,'K');
 store.fail(false);await store.api.transactTableGame('club',request);await store.api.transactTableGame('club',request);assert.equal(store.person('A').strafen.loser1,0);
});

function ui(){
 const {parseHTML}=require('linkedom'),{document}=parseHTML(read('getraenke-abrechnung.html'));
 Object.defineProperty(document,'activeElement',{value:null,writable:true});const people=['A','B'].map(name=>({name,present:true,strafen:{}})),store=h.api({persons:people}),log={persist:0,saves:0,toasts:[]};
 const c={window:{},document,ACTIVE_CLUB:'Club A',currentEveningStartedAt:h.ctx.eveningStartedAt,SPIELE_KATALOG:[],gluecksspiraleSettings:{target:50},blackjackSettings:g.cardSettings(),blackjackState:null,gluecksspiraleState:null,persons:people,penaltyStatsLog:[],dashboardActiveGame:null,navigator:{onLine:true},crypto:require('node:crypto').webcrypto,console:{error(){}},confirm:()=>true,getActivePlayersForSoloGame:()=>people,getGlobalSeatOrder:()=>people.map(p=>p.name),getClubFirestoreId:()=> 'club',showToast:(m,t)=>log.toasts.push([m,t]),persistState:()=>log.persist++,applyConfirmedLiveCounter(){}};
 c.saveImpl=async()=>true;c.saveToFirestore=async()=>{log.saves++;return c.saveImpl();};vm.createContext(c);vm.runInContext(read('js/games/table-games-core.js'),c);c.KCTableGames=c.window.KCTableGames;c.sixAvatar=n=>c.tableEscape(n);
 vm.runInContext(read('js/games/table-games-ui.js'),c);vm.runInContext(read('js/games/blackjack.js'),c);c.renderAll=()=>c.renderTableGames();c.window.firestoreApi={...store.api,loadClubState:async()=>plain(store.root())};c.renderTableGames();
 const field=name=>document.getElementById('blackjack-value-'+name),set=(values=custom,dual=values.ace.length===2)=>{for(const k of ['jack','queen','king'])field(k).value=values[k];field('ace').value=values.ace[0];field('ace-second').value=values.ace[1]??11;document.getElementById('blackjack-ace-dual').checked=dual;c.toggleBlackjackAceMode();};
 return {c,document,field,set,log,store};
}
test('actual HTML settings save custom values, support one ace value and show clear offline status',async()=>{
 const f=ui();f.set();assert.equal(await f.c.saveBlackjackSettings(),true);assert.deepEqual(plain(f.c.blackjackSettings),custom);assert.equal(f.log.persist,1);assert.equal(f.log.saves,1);
 f.set({...custom,ace:[11]});assert.equal(f.field('ace-second').disabled,true);assert.equal(await f.c.saveBlackjackSettings(),true);assert.deepEqual(plain(f.c.blackjackSettings.ace),[11]);
 f.c.navigator.onLine=false;f.set({...custom,jack:8});assert.equal(await f.c.saveBlackjackSettings(),false);assert.equal(f.c.blackjackSettings.jack,8);assert.match(f.document.getElementById('blackjack-settings-status').textContent,/Lokal/);
});
test('invalid settings do not persist and unsaved drafts survive unrelated live renders',async()=>{
 const f=ui();f.set();f.c.renderTableGames();assert.equal(f.field('jack').value,'5');assert.equal(f.c.blackjackSettings.jack,2);
 for(const value of ['','-1','22','1.5','invalid']){f.set();f.field('jack').value=value;assert.equal(await f.c.saveBlackjackSettings(),false);assert.equal(f.c.blackjackSettings.jack,2);}
 f.set({...custom,ace:[11,11]});assert.equal(await f.c.saveBlackjackSettings(),false);assert.equal(f.log.persist,0);assert.equal(f.log.saves,0);
});
test('save failure and a club switch unlock controls without overwriting the new club settings',async()=>{
 const f=ui();f.c.saveImpl=async()=>{throw Error('network');};f.set();assert.equal(await f.c.saveBlackjackSettings(),false);assert.match(f.document.getElementById('blackjack-settings-status').textContent,/fehlgeschlagen/);assert.equal(f.document.getElementById('blackjack-settings-save').disabled,false);
 let finish;f.c.saveImpl=()=>new Promise(resolve=>finish=resolve);f.set({...custom,jack:8});const saving=f.c.saveBlackjackSettings();assert.equal(await f.c.saveBlackjackSettings(),false);
 f.c.ACTIVE_CLUB='Club B';f.c.blackjackSettings=g.cardSettings();f.c.renderTableGames();assert.equal(f.field('jack').value,'2');finish(true);await saving;assert.equal(f.c.blackjackSettings.jack,2);assert.equal(f.document.getElementById('blackjack-settings-status').textContent,'');
});
test('actual HTML card correction replaces a completed card directly and never renders another throw pad',async()=>{
 const {c,document,store}=ui();await c.startBlackjackGame();for(const n of [9,9])await c.tableAction('blackjack','throw',{kind:'pins',pins:n});await c.tableAction('blackjack','stand');await c.tableAction('blackjack','stand');
 let box=document.getElementById('blackjack-board');assert.equal(box.querySelectorAll('.bj-card-choice').length,8);assert(!box.innerHTML.includes('tg-pinpad'));assert(box.innerHTML.indexOf('bj-card-picker')<box.innerHTML.indexOf('tg-table-scroll'));
 for(const word of ['🃏','Bube','👸','Dame','👑','König','🅰️','Ass'])assert(box.innerHTML.includes(word));
 await c.tableCard('K');await c.tableCard('J');assert(c.blackjackState.readyToFinish);assert.equal(store.person('A').strafen.loser1,1);assert.equal(box.querySelectorAll('.bj-card-edit').length,2);
 c.tableEditCard(0);assert.equal(box.querySelectorAll('.bj-card-choice').length,8);assert(!box.innerHTML.includes('tg-pinpad'));await c.tableCard('J');assert.equal(c.blackjackState.cardValues.A,'J');assert.equal(c.blackjackState.scores.A,20);assert(c.blackjackState.readyToFinish);assert.equal(store.person('A').strafen.loser1,0);assert(!box.innerHTML.includes('Über 21:'));
 for(const el of box.querySelectorAll('[onclick]'))new Function('event',el.getAttribute('onclick'));
});
test('running UI game retains its captured settings; a new start uses the new defaults',async()=>{
 const {c,set}=ui();await c.startBlackjackGame();set();await c.saveBlackjackSettings();assert.equal(c.blackjackState.cardSettings.jack,2);await c.tableAction('blackjack','stand');await c.tableAction('blackjack','stand');await c.tableCard('J');assert.equal(c.blackjackState.scores.A,2);
 await c.tableReset('blackjack');await c.startBlackjackGame();assert.equal(c.blackjackState.cardSettings.jack,5);
});
test('a rejected stale UI action reloads server state and permits entering a fresh card',async()=>{
 const {c,document,store}=ui();await c.startBlackjackGame();await c.tableAction('blackjack','stand');await c.tableAction('blackjack','stand');await c.tableCard('J');
 const remote=store.root().blackjackState;await store.api.transactTableGame('club',h.req(remote,'card',{value:'Q'}));await c.tableCard('K');
 assert(c.blackjackState.readyToFinish);assert.equal(c.blackjackState.cardValues.B,'Q');assert(!document.getElementById('blackjack-board').innerHTML.includes('Aktion noch nicht bestätigt'));c.tableEditCard(1);await c.tableCard('K');assert.equal(c.blackjackState.cardValues.B,'K');
});
test('settings survive the actual local/cloud snapshots and club switching',async()=>{
 const src=read('tests/v182-regression.cjs'),start=src.indexOf('function persistence(){'),end=src.indexOf("\ntest('actual local",start),p=new Function('read','assert',src.slice(start,end)+';return persistence();')(read,assert);
 p.env.blackjackSettings=plain(custom);assert.deepEqual(p.getSerializableState().blackjackSettings,custom);assert.deepEqual(p.getFirestoreState().blackjackSettings,custom);p.syncCurrentClubToStore();p.env.blackjackSettings=g.cardSettings();await p.selectClub('Club A');assert.deepEqual(p.env.blackjackSettings,custom);
 p.applyLoadedState({persons:[],blackjackSettings:{...custom,ace:[11]}});assert.deepEqual(p.env.blackjackSettings.ace,[11]);p.applyLoadedState({persons:[]});assert.deepEqual(p.env.blackjackSettings,g.cardSettings());
});
test('UI correction retry after a lost response refunds once and keeps the card editor recoverable',async()=>{
 const {c,document,store}=ui();await c.startBlackjackGame();for(const pins of [9,9])await c.tableAction('blackjack','throw',{kind:'pins',pins});await c.tableAction('blackjack','stand');await c.tableAction('blackjack','stand');await c.tableCard('K');await c.tableCard('J');
 const original=c.window.firestoreApi.transactTableGame;let once=true;c.window.firestoreApi.transactTableGame=async(...args)=>{const out=await original.apply(c.window.firestoreApi,args);if(once){once=false;throw Error('Response lost');}return out;};
 c.tableEditCard(0);await c.tableCard('J');assert.equal(store.person('A').strafen.loser1,0);assert(document.getElementById('blackjack-board').innerHTML.includes('Erneut versuchen'));
 await c.tableRetry('blackjack');assert.equal(c.blackjackState.cardValues.A,'J');assert(c.blackjackState.readyToFinish);assert.equal(store.person('A').strafen.loser1,0);assert(!document.getElementById('blackjack-board').innerHTML.includes('Aktion noch nicht bestätigt'));
});
