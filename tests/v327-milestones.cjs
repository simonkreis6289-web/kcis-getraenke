const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);
for(const p of ['js/evening-counters.js','js/dashboard-layout.js'])vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
const M=ctx.window.KCEveningCounters;
const clone=x=>JSON.parse(JSON.stringify(x));
const config={items:[{id:'cross',pins:500,mode:'cross',enabled:true,text:'500 Kegel!',color:'#ffcc00',seconds:6},{id:'exact',pins:500,mode:'exact',enabled:true}],repeated:{enabled:true}};
function start(pins){return {currentEveningStartedAt:'evening',eveningCounters:{...M.empty(),pins},dashboardSettings:{milestoneToasts:config},lotterieState:{id:'game',active:true,throws:{Simon:[]}}};}
function change(a,fn){const b=clone(a);fn(b);b.eveningCounters=M.transition(a,b,['lotterie']);return b;}
test('crossing records player, text, color, duration; exact skips overshoot and duplicates are suppressed',()=>{
 let a=start(496),b=change(a,x=>x.lotterieState.throws.Simon.push(7));
 assert.equal(b.eveningCounters.pins,503);assert.equal(b.eveningMilestones.events.length,1);
 const e=b.eveningMilestones.events[0];assert.equal(e.name,'Simon');assert.equal(e.text,'500 Kegel!');assert.equal(e.color,'#ffcc00');assert.equal(e.seconds,6);
 b=change(b,()=>{});assert.equal(b.eveningMilestones.events.length,1);
 b=change(b,x=>x.lotterieState.throws.Simon.pop());b=change(b,x=>x.lotterieState.throws.Simon.push(7));assert.equal(b.eveningMilestones.events.length,1);
});
test('exact and repeated digits, preload and corrections do not create events',()=>{
 let a=start(494),b=change(a,x=>x.lotterieState.throws.Simon.push(6));assert.equal(b.eveningMilestones.events.length,2);
 a=start(106);b=change(a,x=>x.lotterieState.throws.Simon.push(5));assert.equal(b.eveningMilestones.events[0].id,'repeated:111');
 a=start(100);b=change(a,x=>x.eveningCounters.pins=111);assert.equal(b.eveningMilestones.events.length,0);
 b=change(b,x=>x.lotterieState.throws.Simon.push(1));b=change(b,x=>x.lotterieState.throws.Simon[0]=9);assert.equal(b.eveningMilestones.events.length,0);
});
test('new evening clears ledger, keeps settings',()=>{
 let a=start(496),b=change(a,x=>x.lotterieState.throws.Simon.push(7));b=change(b,x=>{x.currentEveningStartedAt='new';x.eveningResetOp='new';});
 assert.equal(b.eveningMilestones.events.length,0);assert.equal(b.eveningMilestones.seen.length,0);assert.equal(b.dashboardSettings.milestoneToasts.items.length,2);
});
test('settings preserve custom values',()=>{
 const c=ctx.window.KCDashboardLayout.normalize({milestoneToasts:config}).milestoneToasts;
 assert.equal(c.items[0].pins,500);assert.equal(c.items[0].mode,'cross');assert.equal(c.repeated.enabled,true);
});
test('house boards sort only at finish, respect mode, ties and loser labels',()=>{
 const {parseHTML}=require('linkedom'),html=fs.readFileSync('dashboard.html','utf8');
 const source=html.slice(html.indexOf('function renderHausBoard('),html.indexOf('function houseOrigins('));
 const c={state:{},safe:x=>String(x),dashboardPlayerAttr:n=>' data-dashboard-player="'+n+'"'};vm.createContext(c);vm.runInContext(source,c);
 const row=n=>String(n).split('').map(value=>({value:Number(value)}));
 const d={playerOrder:['A','B','C'],currentPlayerIndex:1,rows:{A:row(123),B:row(321),C:row(123)},history:[{assigned:[{name:'A',rank:1},{name:'C',rank:1}]}]};
 const board=mode=>parseHTML(c.renderHausBoard(d,mode)).document;
 const names=doc=>[...doc.querySelectorAll('[data-haus-name]')].map(x=>x.dataset.hausName);
 assert.deepEqual(names(board('hoch')),['A','B','C']);assert.equal(board('hoch').querySelector('.is-current').dataset.hausName,'B');
 d.finished=true;assert.deepEqual(names(board('hoch')),['B','A','C']);assert.equal(board('hoch').querySelector('.is-winner').dataset.hausName,'B');
 assert.match(board('hoch').querySelector('[data-haus-name=A]').textContent,/1\. Verlierer/);
 assert.deepEqual(names(board('tief')),['A','C','B']);assert.equal(board('tief').querySelectorAll('.is-winner').length,2);
 d.finished=false;assert.deepEqual(names(board('hoch')),['A','B','C']);
});
test('dashboard consumes live milestone once even when state is repeated',()=>{
 const {parseHTML}=require('linkedom'),{document}=parseHTML('<html><body></body></html>');
 let timers=[];const c={document,Date,requestAnimationFrame:f=>f(),setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:()=>{}};c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync('js/dashboard-event-toasts.js','utf8'),c);
 const root={persons:[{name:'Simon',isGuest:true}],currentEveningStartedAt:'e',eveningMilestones:{events:[]}};
 const t=Date.now(),feed=()=>c.KCClubToasts.feed(root,'club',t);
 feed();root.eveningMilestones.events.push({id:'cross:1',at:t,name:'Simon',pins:500,text:'Treffer',color:'#ffcc00',seconds:5});feed();
 const box=document.getElementById('dashboard-club-event-toast');assert.match(box.textContent,/Treffer/);assert.match(box.textContent,/Simon/);assert.ok(box.querySelector('.kc-toast-avatar'));
 feed();timers.shift()();timers.shift()();assert.equal(box.hidden,true);feed();assert.equal(box.hidden,true);
});
test('team throw asks for a person only for a new milestone',()=>{
 let a=start(496);assert.equal(M.needsThrower(a,2),false);assert.equal(M.needsThrower(a,4),true);
 const b=change(a,x=>x.lotterieState.throws.Simon.push(7));const undone=change(b,x=>x.lotterieState.throws.Simon.pop());assert.equal(M.needsThrower(undone,7),false);
 assert.equal(M.needsThrower(start(106),5),true);assert.equal(M.needsThrower(start(106),0),false);
});
