const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../js/football-live.js'),'utf8');
const instant=()=>({matchID:1,matchDateTimeUTC:new Date(Date.now()+60000).toISOString(),leagueShortcut:'bl2',team1:{shortName:'B'},team2:{shortName:'C'},matchResults:[],goals:[]});
function fixture(fetch,clock=Date){
 const events=[];
 const ctx={window:{},document:{hidden:false},Date:clock,Event:class{constructor(type){this.type=type;}},AbortController,setTimeout:(fn)=>42,clearTimeout(){},setInterval:()=>31,
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

test('Bundesliga: final scores expire after two hours and repeated polls do not extend their display',async()=>{
 let now=Date.parse('2026-11-21T16:26:00Z');
 class Clock extends Date{static now(){return now;}}
 const start=now-116*60000;
 const match={...instant(),matchDateTimeUTC:new Date(start).toISOString()};
 let matches=[match,{...match,matchID:2,matchIsFinished:true}],revision=0;
 const f=fixture(async url=>({ok:true,json:async()=>url.includes('getcurrentgroup')?{groupOrderID:10}:url.includes('getlastchangedate')?revision:matches}),Clock);
 f.app.configure({bl2:true});await new Promise(resolve=>setImmediate(resolve));
 assert(f.app.ticker(start+224*60000).some(row=>row[0]==='football-bl2-2'));
 assert(!f.app.ticker(start+225*60000).some(row=>row[0]==='football-bl2-2'));
 matches=[{...match,matchIsFinished:true},matches[1]];revision++;
 await f.app.refresh();
 const expires=now+120*60000;
 assert(f.app.ticker(expires-1).some(row=>row[0]==='football-bl2-1'&&row[1].includes('(Ende)')));
 assert(!f.app.ticker(expires).some(row=>row[0]==='football-bl2-1'));
 revision++;now+=5*60000;await f.app.refresh();
 assert(!f.app.ticker(expires).some(row=>row[0]==='football-bl2-1'));
});

test('Bundesliga: live games without a minute follow timed peers at the same kickoff',async()=>{
 const now=Date.parse('2026-11-21T15:03:00Z');
 class Clock extends Date{static now(){return now;}}
 const start=now-33*60000;
 const match={...instant(),matchDateTimeUTC:new Date(start).toISOString()};
 const timed={...match,matchID:2,goals:[{goalID:1,matchMinute:27,scoreTeam1:1,scoreTeam2:0}]};
 const different={...match,matchID:3,matchDateTimeUTC:new Date(start-15*60000).toISOString()};
 const finished={...timed,matchID:4,matchIsFinished:true,goals:[{matchMinute:80,scoreTeam1:1,scoreTeam2:0}]};
 let phase=0;
 const f=fixture(async url=>({ok:true,json:async()=>url.includes('getcurrentgroup')?{groupOrderID:10}:url.includes('getlastchangedate')?phase:[match,phase?{...timed,matchResults:[{resultTypeID:1,pointsTeam1:1,pointsTeam2:0}]}:timed,different,finished]}),Clock);
 f.app.configure({bl2:true});await new Promise(resolve=>setImmediate(resolve));
 const at=start+33*60000,minute=(id,now)=>f.app.ticker(now).find(row=>row[0]==='football-bl2-'+id)?.[2];
 assert.equal(minute(1,at),'≈33′');
 assert.equal(minute(1,at+2*60000),minute(2,at+2*60000));
 assert.equal(minute(3,at+2*60000),'≈45+6′');
 phase++;await f.app.refresh();
 assert.equal(minute(1,now),'≈Halbzeit');
 assert.equal(minute(1,now+16*60000),'≈47′');
});
