const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

function fixture(reduced=false){
 const {document}=parseHTML('<html><body></body></html>');
 let serial=0;
 const timers=new Map();
 const ctx={document,console,Date,Event:class Event{constructor(type){this.type=type;}},AbortController,
  setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),
  setInterval:()=>1,requestAnimationFrame:fn=>fn(),matchMedia:()=>({matches:reduced}),dispatchEvent(){}};
 const runTimer=ms=>{
  const task=[...timers].find(([,timer])=>timer.ms===ms);
  assert(task,'expected timer at '+ms+' ms');timers.delete(task[0]);task[1].fn();
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('js/football-live.js'),ctx);
 const box=()=>document.getElementById('dashboard-football-toast');
 const digits=()=>[...box().querySelectorAll('.football-goal-digit')];
 return {ctx,live:ctx.KCFootballLive,box,digits,points:()=>digits().map(d=>d.textContent),runTimer};
}

const home={teamName:'Borussia Dortmund',shortName:'BVB',teamIconUrl:'https://example.org/bvb.png'};
const away={teamName:'FC Schalke 04',shortName:'S04',teamIconUrl:'https://example.org/s04.png'};

test('live toast shows both full names and crests, then increments and highlights only the scoring side',async()=>{
 const f=fixture();
 let goals=[],revision=0;
 const match={matchID:1,matchDateTimeUTC:new Date(Date.now()-60000).toISOString(),leagueShortcut:'bl1',team1:home,team2:away,matchResults:[]};
 f.ctx.fetch=async url=>({ok:true,json:async()=>url.includes('getcurrentgroup')?{groupOrderID:10}:url.includes('getlastchangedate')?revision:[{...match,goals}]});
 f.live.configure({bl1:true,demo:{active:true,id:'old-demo',league:'bl1',home:5,away:2}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.live.ticker().length,1);
 assert.equal(f.live.ticker()[0][0],'football-bl1-1');
 goals=[{matchMinute:12,scoreTeam1:1,scoreTeam2:0}];revision++;
 await f.live.refresh();
 const box=f.box();
 assert.equal(box.style.left,'50%');assert.equal(box.style.width,'calc(100vw - 32px)');
 assert.deepEqual([...box.querySelectorAll('.football-goal-club-name')].map(n=>n.textContent),[home.teamName,away.teamName]);
 assert.deepEqual([...box.querySelectorAll('img')].map(n=>n.src),[home.teamIconUrl,away.teamIconUrl]);
 assert.match(box.querySelector('.football-goal-heading').textContent,/12′/);
 assert.deepEqual(f.points(),['0','0']);
 f.runTimer(550);
 assert.deepEqual(f.points(),['1','0']);
 assert(f.digits()[0].classList.contains('football-goal-pop'));
 assert(!f.digits()[1].classList.contains('football-goal-pop'));
 goals.push({matchMinute:23,scoreTeam1:1,scoreTeam2:1});revision++;
 await f.live.refresh();
 assert.deepEqual(f.points(),['1','0']);
 f.runTimer(550);
 assert.deepEqual(f.points(),['1','1']);
 assert(!f.digits()[0].classList.contains('football-goal-pop'));
 assert(f.digits()[1].classList.contains('football-goal-pop'));
 const logo=box.querySelectorAll('img')[1],crest=logo.parentElement;logo.onerror();
 assert(!crest.querySelector('.dashboard-football-crest-fallback').hidden);
});

test('live goal uses its reported minute and scorer, including stoppage time and reduced motion',async()=>{
 const f=fixture(true);
 let goals=[],version=0;
 const match={matchID:7,matchDateTimeUTC:new Date(Date.now()-100*60000).toISOString(),leagueShortcut:'bl1',team1:home,team2:away,matchResults:[]};
 f.ctx.fetch=async url=>({ok:true,json:async()=>url.includes('getcurrentgroup')?{groupOrderID:10}:url.includes('getlastchangedate')?version:[{...match,goals}]});
 f.live.configure({bl1:true});await new Promise(resolve=>setImmediate(resolve));
 goals=[{matchMinute:'90+3',scoreTeam1:0,scoreTeam2:1,goalGetterName:'Torschütze'}];version++;
 await f.live.refresh();
 assert.deepEqual(f.points(),['0','1']);
 assert.match(f.box().textContent,/90\+3′/);
 assert.match(f.box().textContent,/Torschütze/);
 assert(!f.box().querySelector('.football-goal-pop'));
});

test('main app link with the club crest appears among the footer buttons on both dashboards',()=>{
 for(const file of ['dashboard.html','dashboard-compat.html']){
  const {document}=parseHTML(read(file));
  const link=document.querySelector('.dashboard-footer .header-actions a.dashboard-main-app');
  assert.equal(link.getAttribute('href'),'getraenke-abrechnung.html');
  assert.equal(link.getAttribute('aria-label'),'Zurück zur Hauptapp');
  assert.equal(link.querySelector('img').getAttribute('src'),'clubbilder/invaliden-schwadron.jpg');
 }
});
