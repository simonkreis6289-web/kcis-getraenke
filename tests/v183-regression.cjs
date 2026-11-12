const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=x=>JSON.parse(JSON.stringify(x));
const c={window:{}};vm.createContext(c);
for(const p of ['js/birthdays.js','js/kegel-calendar.js','js/penalty-statistics.js']){vm.runInContext(read(p),c);Object.assign(c,c.window);}
const calendar=c.KCKegelCalendar,stats=c.KCPenaltyStats,today='2026-11-06',evening='2026-11-06T19:00:00Z';
const people=[{name:'A',present:true,strafen:{g:3}},{name:'B',present:true,strafen:{g:1}}],catalog=[{key:'g',label:'Gosse'},{key:'king',label:'Gossenkönig'},{key:'fine',label:'9er/Kranz'}];
const log=(id,type='9er',thrower='A',extra={})=>({id,type,thrower,eveningStartedAt:evening,eventDate:today,createdAt:'2026-11-06T20:00:00Z',...extra});
const data=extra=>stats.build({people,catalog,eveningStartedAt:evening,today,...extra});
const rows=(d,extra={})=>plain(stats.summary(d,{people,...extra})),row=(result,name='A')=>result.find(p=>p.name===name);
const entry=(id,date,extra={})=>({id,type:'kegeln',date,time:'20:00',...extra});
const ensure=state=>calendar.perform(state,{action:'ensure',today});
const reconfigure=(state,extra={})=>calendar.perform(state,{action:'reconfigure',id:'kc_schedule_test',expectedRevision:state.calendarRevision||0,today,config:{intervalWeeks:3,weekday:6,anchorDate:'2026-11-07',time:'19:30'},...extra});
test('three-week Saturday series replaces all future kegeln and preserves past, tours and birthdays',()=>{
 const old=ensure({clubTermine:[entry('past','2026-10-30'),entry('manual','2026-11-21',{note:'Alte Ausnahme'}),entry('tour','2026-12-01',{type:'tour'}),entry('birthday','2026-11-10',{type:'geburtstag'})]});
 const next=reconfigure({...old,calendarRevision:4});
 assert(next.clubTermine.some(e=>e.id==='past'));assert(next.clubTermine.some(e=>e.id==='tour'));assert(next.clubTermine.some(e=>e.id==='birthday'));assert(!next.clubTermine.some(e=>e.id==='manual'));
 const upcoming=next.clubTermine.filter(e=>e.type==='kegeln'&&e.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
 assert.equal(upcoming[0].date,'2026-11-07');assert(upcoming.every(e=>new Date(calendar.timestamp(e.date)).getUTCDay()===6&&e.time==='19:30'));
 for(let i=1;i<upcoming.length;i++)assert.equal(calendar.timestamp(upcoming[i].date)-calendar.timestamp(upcoming[i-1].date),21*86400000);
});
test('new series is stable across restarts and extends only its own rhythm',()=>{
 const first=reconfigure(ensure({clubTermine:[]}));assert.deepEqual(plain(ensure(first)),plain(first));
 const later=calendar.perform(first,{action:'ensure',today:'2027-01-01'});assert(later.clubTermine.length>first.clubTermine.length);assert(later.clubTermine.filter(e=>e.type==='kegeln').every(e=>e.time==='19:30'));
});
test('new series permits one-off edits and permanent deletions without duplicates',()=>{
 let s=reconfigure(ensure({clubTermine:[]})),e=s.clubTermine.find(e=>e.date==='2026-11-28');
 s=calendar.perform(s,{action:'edit',id:e.id,expectedRevision:1,today,event:{type:'kegeln',date:'2026-11-29',time:'18:00',note:'Verlegt'}});
 assert(!ensure(s).clubTermine.some(e=>e.date==='2026-11-28'));assert(ensure(s).clubTermine.some(e=>e.date==='2026-11-29'));
 s=calendar.perform(s,{action:'delete',id:e.id,expectedRevision:2,today});assert(!ensure(s).clubTermine.some(x=>x.id===e.id));
});
test('reconfigure retries are idempotent but stale different changes are rejected',()=>{
 const state={...ensure({clubTermine:[]}),calendarRevision:5},first=reconfigure(state);
 assert.deepEqual(plain(reconfigure({...first,calendarRevision:6},{expectedRevision:5})),plain(first));
 assert.throws(()=>reconfigure({...first,calendarRevision:6},{id:'kc_schedule_other',expectedRevision:5}),/inzwischen/);
});
test('series has fresh event IDs so an old edit cannot alter a replacement event',()=>{
 const before=ensure({clubTermine:[]}),next=reconfigure(before,{config:{intervalWeeks:4,weekday:5,anchorDate:'2026-11-27',time:'20:00'}});
 assert(!next.clubTermine.some(e=>e.id===before.clubTermine[0].id));
 assert.throws(()=>calendar.perform(next,{action:'delete',id:before.clubTermine[0].id,expectedRevision:1,today}),/gelöscht/);
});
test('invalid weekdays, intervals, dates and times do not mutate calendar data',()=>{
 const before=ensure({clubTermine:[]}),copy=JSON.stringify(before);
 for(const change of [{intervalWeeks:0},{intervalWeeks:53},{intervalWeeks:2.5},{weekday:5},{anchorDate:'2026-11-01'},{anchorDate:'2026-02-30'},{time:'24:00'}])assert.throws(()=>reconfigure(before,{config:{intervalWeeks:3,weekday:6,anchorDate:'2026-11-07',time:'20:00',...change}}));
 assert.equal(JSON.stringify(before),copy);
});
test('every weekday and a weekly interval remain valid across winter and summer time',()=>{
 for(let day=0;day<7;day++){
  const start=new Date(calendar.timestamp(today)+((day-5+7)%7)*86400000).toISOString().slice(0,10);
  const next=reconfigure({clubTermine:[]},{id:'kc_schedule_day'+day,config:{intervalWeeks:1,weekday:day,anchorDate:start,time:'20:00'}});
  assert(next.clubTermine.length>=52);assert(next.clubTermine.every(e=>new Date(calendar.timestamp(e.date)).getUTCDay()===day));
 }
});
test('live stats count attendance once, use gutter counters, and count special throws on the thrower',()=>{
 const result=rows(data({logs:[log('one'),log('kranz','kranz','B'),log('gutter','gosse')]}));
 assert.deepEqual(row(result),{name:'A',present:1,gosse:3,nine:1,kranz:0});assert.equal(row(result,'B').kranz,1);
});
test('duplicate throw IDs count once and through throws belong to 9er',()=>{
 const e=log('same');assert.equal(row(rows(data({logs:[e,e,log('through','durchgeworfen')]}))).nine,2);
});
test('gutter counters do not include the gossenkoenig or another player special-fine counters',()=>{
 const result=rows(data({people:[{name:'A',present:true,strafen:{g:2,king:10,fine:12}}]}));assert.equal(row(result).gosse,2);assert.equal(row(result).nine,0);
});
test('archived and live representations of the same evening are not added twice',()=>{
 const archive={id:'closure',category:'strafen',eveningStartedAt:evening,strafen:catalog,members:[{name:'A',status:'present',strafen:{g:3}}]};
 const result=rows(data({archives:[archive,{...archive,id:'duplicate'}],evenings:[{date:today,attendees:['A']}],logs:[log('one')]}));
 assert.equal(row(result).present,1);assert.equal(row(result).gosse,3);assert.equal(row(result).nine,1);
});
test('two distinct evenings on one calendar day each count as one attendance',()=>{
 const second='2026-11-06T22:00:00Z',result=rows(data({evenings:[{eveningStartedAt:evening,date:today,attendees:['A']},{eveningStartedAt:second,date:today,attendees:['A']}]}));
 assert.equal(row(result).present,2);
});
test('cancelled events do not count as attendance or gutters',()=>{
 const result=rows(stats.build({people:[],archives:[{kind:'cancelled',date:today,members:[{name:'A',status:'present',strafen:{g:8}}],strafen:catalog}],today}));assert(result.every(p=>p.present===0&&p.gosse===0&&p.nine===0&&p.kranz===0));
});
test('backfilled attendance and gutters enter statistics without interpreting fines on others as their own 9ers',()=>{
 const result=rows(stats.build({people:[],archives:[{id:'backfill',kind:'backfill',date:today,strafen:catalog,members:[{name:'A',status:'present',strafen:{g:4,fine:9}}]}],today}));
 assert.deepEqual(row(result),{name:'A',present:1,gosse:4,nine:0,kranz:0});
});
test('current counter corrections take precedence over stale archived gutter counts',()=>{
 const result=rows(data({archives:[{id:'old',eveningStartedAt:evening,strafen:catalog,members:[{name:'A',status:'present',strafen:{g:8}}]}]}));assert.equal(row(result).gosse,3);
});
test('a throw record proves attendance when no old attendance snapshot exists',()=>{
 const result=rows(stats.build({people:[],logs:[log('proof')],today}));assert.equal(row(result).present,1);
});
test('date start is inclusive and free ranges can still access pre-restart history',()=>{
 const d=data({logs:[log('old','9er','A',{eveningStartedAt:'2026-10-01T18:00:00Z',eventDate:'2026-10-01'})]});
 assert.equal(row(rows(d,{settings:{mode:'date',startDate:today}})).nine,0);
 assert.equal(row(rows(d,{settings:{mode:'date',startDate:today},custom:true,from:'2026-10-01',to:'2026-10-01'})).nine,1);
});
test('now reset is exactly zero during an ongoing evening, then counts only the new deltas',()=>{
 const before=data({logs:[log('one')]}),settings={mode:'now',startAt:'2026-11-06T20:30:00Z',baseline:plain(stats.baseline(before))};
 assert.deepEqual(row(rows(before,{settings})),{name:'A',present:0,gosse:0,nine:0,kranz:0});
 const after=data({people:[{name:'A',present:true,strafen:{g:5}},people[1]],logs:[log('one'),log('two')]});
 assert.deepEqual(row(rows(after,{settings})),{name:'A',present:0,gosse:2,nine:1,kranz:0});
});
test('arrival after a reset counts once; attendance already captured at reset stays zero',()=>{
 const before=data({people:[people[0]]}),settings={mode:'now',startAt:'2026-11-06T20:30:00Z',baseline:plain(stats.baseline(before))};
 const result=rows(data(),{settings});assert.equal(row(result).present,0);assert.equal(row(result,'B').present,1);
});
test('a later evening starts counting attendance again after a now reset',()=>{
 const before=data(),settings={mode:'now',startAt:'2026-11-06T20:30:00Z',baseline:plain(stats.baseline(before))};
 const result=rows(data({eveningStartedAt:'2026-11-07T19:00:00Z',today:'2026-11-07'}),{settings});assert.equal(row(result).present,1);assert.equal(row(result).gosse,3);
});
test('post-reset contributions from the old evening stay counted after starting another evening',()=>{
 const before=data(),settings={mode:'now',startAt:'2026-11-06T20:30:00Z',baseline:plain(stats.baseline(before))};
 const d=data({people:[{name:'A',present:true,strafen:{g:1}}],eveningStartedAt:'2026-11-07T19:00:00Z',today:'2026-11-07',evenings:[{date:today,eveningStartedAt:evening,attendees:['A'],statsPeople:[{name:'A',present:1,gosse:6,nine:0,kranz:0}]}]});
 assert.equal(row(rows(d,{settings})).gosse,4);assert.equal(row(rows(d,{settings})).present,1);
});
test('counter decrements after reset cannot make statistics negative',()=>{
 const before=data(),settings={mode:'now',startAt:'2026-11-06T20:30:00Z',baseline:plain(stats.baseline(before))};
 assert.equal(row(rows(data({people:[{name:'A',present:true,strafen:{g:1}}]}),{settings})).gosse,0);
});
test('Berlin dates include late-night events correctly and invalid ranges are rejected',()=>{
 assert.equal(stats.date('2026-11-06T23:30:00Z'),'2026-11-07');assert.equal(stats.date('2026-02-30'),'');
 assert.throws(()=>rows(data(),{custom:true,from:'2026-12-01',to:'2026-11-01'}),/Zeitraum/);
});
test('backfilled Berlin timestamps and equivalent UTC evening IDs denote the same session',()=>{
 assert.equal(stats.key('2026-11-06T20:00:00',today),stats.key('2026-11-06T19:00:00Z',today));
 assert.equal(stats.key('2027-07-02T20:00:00','2027-07-02'),stats.key('2027-07-02T18:00:00Z','2027-07-02'));
});
test('statistics calculations preserve all input arrays and settings',()=>{
 const input={people,catalog,evenings:[],logs:[log('one')],today},copy=JSON.stringify(input);stats.build(input);assert.equal(JSON.stringify(input),copy);
});
function api(initial={}){
 const store=new Map([['clubs/club/state/current',{persons:plain(people),STRAFEN:catalog,penaltyStatsLog:[log('one')],currentEveningStartedAt:evening,...initial}]]);let version=0,writes=0,fail=false;
 const env={db:{},window:{KCPenaltyStats:stats,KCKegelCalendar:calendar},doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=> 'server'};
 env.runTransaction=async(_,fn)=>{
  for(let i=0;i<10;i++){
   if(fail)throw Error('network');const old=version,pending=[];let writing=false;
   const value=await fn({get:async key=>{assert(!writing);return {exists:()=>store.has(key),data:()=>store.has(key)?plain(store.get(key)):undefined};},set:(key,value,opts)=>{writing=true;pending.push(()=>{store.set(key,opts?.merge?{...(store.get(key)||{}),...plain(value)}:plain(value));writes++;});}});
   if(old!==version)continue;pending.forEach(f=>f());if(pending.length)version++;return value;
  }throw Error('retry limit');
 };
 const object={getLivePersonId:name=>encodeURIComponent(name.trim().toLowerCase())},source=read('js/firebase.js');
 for(const name of ['saveClubState','updateClubCalendar','updatePenaltyStatsSettings']){const i=source.indexOf('  async '+name+'('),end=source.indexOf('\n  },',i);object[name]=new Function('env','with(env){return ({'+source.slice(i,end+4)+'}).'+name+';}')(env);}
 return {object,store,root:()=>store.get('clubs/club/state/current'),writes:()=>writes,fail:v=>fail=v};
}
test('stats restart saves its baseline from canonical live counters, not stale state snapshots',async()=>{
 const s=api();s.store.set('clubs/club/livePersons/a',{name:'A',present:true,strafen:{g:7}});
 const config=await s.object.updatePenaltyStatsSettings('club',{id:'stats_now',expectedRevision:0,mode:'now'});
 assert.equal(config.baseline.people.find(p=>p.name==='A').gosse,7);assert.equal(config.revision,1);
 assert.equal(s.root().penaltyStatsLog.length,1);
});
test('duplicate reset requests and simultaneous reset clicks write once',async()=>{
 const s=api(),request={id:'stats_now',expectedRevision:0,mode:'now'};
 const values=await Promise.all([s.object.updatePenaltyStatsSettings('club',request),s.object.updatePenaltyStatsSettings('club',request)]);
 assert.equal(s.writes(),1);assert.deepEqual(plain(values[0]),plain(values[1]));
});
test('stale different resets cannot overwrite the active start',async()=>{
 const s=api();await s.object.updatePenaltyStatsSettings('club',{id:'stats_first',expectedRevision:0,mode:'date',startDate:'2026-10-01'});
 await assert.rejects(()=>s.object.updatePenaltyStatsSettings('club',{id:'stats_stale',expectedRevision:0,mode:'now'}),/inzwischen/);
 assert.equal(s.root().penaltyStatsSettings.startDate,'2026-10-01');
});
test('ordinary stale state uploads cannot roll back stats restart settings',async()=>{
 const s=api(),config=await s.object.updatePenaltyStatsSettings('club',{id:'stats_start',expectedRevision:0,mode:'date',startDate:'2026-10-01'});
 await s.object.saveClubState('club',{penaltyStatsSettings:null});assert.deepEqual(s.root().penaltyStatsSettings,config);
});
test('failed resets and invalid dates do not clear any data or change settings',async()=>{
 const s=api();s.fail(true);await assert.rejects(()=>s.object.updatePenaltyStatsSettings('club',{id:'stats_fail',expectedRevision:0,mode:'now'}),/network/);s.fail(false);
 await assert.rejects(()=>s.object.updatePenaltyStatsSettings('club',{id:'stats_bad',expectedRevision:0,mode:'date',startDate:'2026-02-30'}));
 assert.equal(s.writes(),0);assert.equal(s.root().penaltyStatsLog.length,1);
});
test('calendar replacement is atomic and a stale general upload cannot restore its old dates',async()=>{
 const s=api({clubTermine:[]}),first=await s.object.updateClubCalendar('club',{action:'ensure',today});
 const request={action:'reconfigure',id:'kc_schedule_server',expectedRevision:first.calendarRevision,today,config:{intervalWeeks:3,weekday:6,anchorDate:'2026-11-07',time:'19:00'}};
 const second=await s.object.updateClubCalendar('club',request),retry=await s.object.updateClubCalendar('club',request);assert.deepEqual(second,retry);
 await s.object.saveClubState('club',first);assert.equal(s.root().clubKegelSerie.intervalWeeks,3);assert(s.root().clubTermine.every(e=>e.time==='19:00'));
});
test('settings headers explicitly override global sticky dark headers with readable colors',()=>{
 const css=read('css/game-settings.css');assert(css.includes('position:static'));assert(css.includes('background:#edf3fc;color:#16263f'));assert(css.includes('justify-content:flex-start'));
});
test('new statistics UI exposes cycle and custom range without deleting its history',()=>{
 const script=read('js/penalty-statistics.js'),html=read('getraenke-abrechnung.html');
 for(const id of ['penalty-stats-start','penalty-stats-period','penalty-stats-from','penalty-stats-to','penalty-stats-body','kc-series-weeks','kc-series-weekday','kc-series-first','kc-series-time'])assert(html.includes('id="'+id+'"'));
 assert(!script.includes('penaltyStatsLog = []'));assert(!script.includes('kegelAbende = []'));
 assert(html.indexOf('js/penalty-statistics.js')<html.indexOf('src="js/firebase.js'));
});
test('automatic evening backups stay distinct but are excluded from the PDF-only statistics',()=>{
 const source=read('js/app.js'),start=source.indexOf('function archiveCurrentKegelabendForStats()'),end=source.indexOf('\nasync function loadFromFirestore()',start);
 const env={window:{},persons:plain(people),STRAFEN:catalog,kegelAbende:[],penaltyStatsLog:[log('one')],penaltyStatsSettings:null,currentEveningStartedAt:evening,ACTIVE_CLUB:'Club',getClubFirestoreId:()=> 'club'};
 vm.createContext(env);for(const file of ['js/birthdays.js','js/penalty-statistics.js']){vm.runInContext(read(file),env);Object.assign(env,env.window);}
 vm.runInContext(source.slice(start,end),env);env.archiveCurrentKegelabendForStats();
 env.currentEveningStartedAt='2026-11-06T22:00:00Z';env.persons.forEach(p=>p.strafen.g=0);env.archiveCurrentKegelabendForStats();env.archiveCurrentKegelabendForStats();
 assert.equal(env.kegelAbende.length,2);const shown=plain(env.KCPenaltyStats.summary(env.penaltyStatsSource(),{people:env.persons}));assert.equal(row(shown).present,0);assert.equal(row(shown).gosse,0);
 const result=plain(env.KCPenaltyStats.summary(env.penaltyStatsSource(true),{people:env.persons}));
 assert.equal(row(result).present,2);assert.equal(row(result).gosse,3);assert.equal(row(result).nine,1);
});
test('real local/cloud snapshots and club cache retain the independent statistics start',async()=>{
 const source=read('tests/v182-regression.cjs'),start=source.indexOf('function persistence(){'),end=source.indexOf("\ntest('actual local",start);
 const setup=new Function('read','assert','return ('+source.slice(start,end)+');')(read,assert),p=setup();
 p.env.penaltyStatsSettings={mode:'date',startDate:'2026-10-01',revision:2};p.env.kegelAbende=[];
 assert.equal(p.getSerializableState().penaltyStatsSettings.startDate,'2026-10-01');assert.equal(p.getFirestoreState().penaltyStatsSettings.revision,2);
 p.syncCurrentClubToStore();p.env.penaltyStatsSettings=null;await p.selectClub('Club A');assert.equal(p.env.penaltyStatsSettings.startDate,'2026-10-01');
});
