const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../js/football-live.js'),'utf8');
const instant=()=>({matchID:1,matchDateTimeUTC:new Date(Date.now()+60000).toISOString(),leagueShortcut:'bl2',team1:{shortName:'B'},team2:{shortName:'C'},matchResults:[],goals:[]});
function fixture(fetch){
 const events=[];
 const ctx={window:{},document:{hidden:false},Date,Event:class{constructor(type){this.type=type;}},AbortController,setTimeout:(fn)=>42,clearTimeout(){},setInterval:()=>31,
 fetch,console:{warn:(...args)=>events.push(args)},};
 ctx.window=ctx;ctx.dispatchEvent=()=>{};vm.createContext(ctx);vm.runInContext(src,ctx);
 return {app:ctx.KCFootballLive,events};
}
test('Bundesliga: the estimate follows kickoff, re-anchors on a new goal, pauses at halftime and stops at fulltime',()=>{
 const {app}=fixture(),start=Date.parse('2026-11-21T14:30:00Z'),at=min=>start+min*60000;
 const match={...instant(),matchDateTimeUTC:new Date(start).toISOString()};
 let clock=app.observeClock(null,match,at(-1));
 assert.equal(app.clockLabel(match,clock,at(-1)),'');
 assert.equal(app.clockLabel(match,clock,at(30)),'≈31′');
 match.goals=[{goalID:1,matchMinute:25,scoreTeam1:1,scoreTeam2:0}];
 clock=app.observeClock(clock,match,at(31));
 assert.equal(app.clockLabel(match,clock,at(31)),'≈25′');
 clock=app.observeClock(clock,match,at(33));
 assert.equal(app.clockLabel(match,clock,at(33)),'≈27′');
 match.matchResults=[{resultTypeID:1,pointsTeam1:1,pointsTeam2:0}];
 clock=app.observeClock(clock,match,at(47));
 assert.equal(app.clockLabel(match,clock,at(60)),'Halbzeit');
 assert.equal(app.clockLabel(match,clock,at(62)),'≈46′');
 match.goals=[...match.goals,{goalID:2,matchMinute:52,scoreTeam1:1,scoreTeam2:1}];
 clock=app.observeClock(clock,match,at(65));
 assert.equal(app.clockLabel(match,clock,at(67)),'≈54′');
 match.matchIsFinished=true;
 assert.equal(app.clockLabel(match,clock,at(107)),'');
});
test('Bundesliga: a pending league request does not prevent the other league from loading',async()=>{
 const calls=[];
 let rejectFirstLeague;
 const f=fixture(async url=>{
  calls.push(url);
  if(url.includes('/getcurrentgroup/bl1'))return new Promise((_,reject)=>{rejectFirstLeague=reject;});
  if(url.includes('/getcurrentgroup/bl2'))return {ok:true,json:async()=>({groupOrderID:10})};
  if(url.includes('/getlastchangedate/bl2'))return {ok:true,json:async()=>('2026-11-18')};
  if(url.includes('/getmatchdata/bl2'))return {ok:true,json:async()=>[instant()]};
  throw Error('Unexpected URL '+url);
 });
 f.app.configure({bl1:true,bl2:true});
 for(let i=0;i<10&&!f.app.ticker().length;i++)await new Promise(r=>setImmediate(r));
 assert.equal(f.app.ticker().length,1);
 assert.match(f.app.ticker()[0][1],/2\. BL/);
 assert.equal(f.app.status().bl1,undefined);
 rejectFirstLeague(TypeError('Failed to fetch'));
 await new Promise(r=>setImmediate(r));
 assert.equal(f.app.status().bl1.tries,1);
 assert.equal(f.app.status().bl2,undefined);
});
test('Bundesliga: change-date failure falls back to the matchday endpoint',async()=>{
 const urls=[];
 const f=fixture(async url=>{
  urls.push(url);
  if(url.includes('/getcurrentgroup'))return {ok:true,json:async()=>({groupOrderID:10})};
  if(url.includes('/getlastchangedate'))throw TypeError('Failed to fetch');
  if(url.includes('/getmatchdata'))return {ok:true,json:async()=>[instant()]};
  throw Error('unknown endpoint');
 });
 f.app.configure({bl2:true});
 for(let i=0;i<10&&!f.app.ticker().length;i++)await new Promise(r=>setImmediate(r));
 assert.equal(f.app.ticker().length,1);
 assert.equal(f.app.status().bl2,undefined);
 assert(urls.some(x=>x.includes('/getmatchdata/bl2')));
});
test('Bundesliga: rate-limited warnings, exponential retry and recovery status',async()=>{
 let fail=true,calls=0;
 const f=fixture(async url=>{
  calls++;
  if(fail)throw TypeError('Failed to fetch');
  if(url.includes('getcurrentgroup'))return {ok:true,json:async()=>({groupOrderID:10})};
  if(url.includes('getlastchangedate'))return {ok:true,json:async()=>('stamp')};
  return {ok:true,json:async()=>[instant()]};
 });
 f.app.configure({bl2:true});
 for(let i=0;i<10&&!f.app.status().bl2;i++)await new Promise(r=>setImmediate(r));
 assert.equal(f.app.status().bl2.tries,1);
 await f.app.refresh();assert.equal(f.app.status().bl2.tries,1);
 assert.equal(f.events.length,1);
});
