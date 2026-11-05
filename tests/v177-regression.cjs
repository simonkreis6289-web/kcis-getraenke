const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['js/birthdays.js','js/kegel-calendar.js']){vm.runInContext(read(file),ctx);Object.assign(ctx,ctx.window);}
const calendar=ctx.KCKegelCalendar,today='2026-11-05';
const event=(id,date,extra={})=>({id,type:'kegeln',date,time:'20:00',note:'',...extra});
const state=events=>({clubTermine:events,clubTerminGruende:[{id:'kegeln'},{id:'tour'}]});
const ensure=(s,date=today)=>calendar.perform(s,{action:'ensure',today:date});
function api(initial={}){
 let data=structuredClone(initial),version=0,writes=0;
 const c={db:{},window:{KCKegelCalendar:calendar},serverTimestamp:()=> 'server',doc:(_, ...parts)=>parts.join('/')};
 c.runTransaction=async(_,callback)=>{
  for(let tries=0;tries<8;tries++){
   const observed=version,pending=[];
   const result=await callback({get:async()=>({exists:()=>true,data:()=>structuredClone(data)}),set:(ref,value,options)=>pending.push(()=>{data=options?.merge?{...data,...structuredClone(value)}:structuredClone(value);version++;writes++;})});
   if(observed!==version)continue;pending.forEach(write=>write());return result;
  }throw Error('transaction retry limit');
 };
 vm.createContext(c);const source=read('js/firebase.js');
 for(const name of ['saveClubState','updateClubCalendar']){const start=source.indexOf('  async '+name+'('),end=source.indexOf('\n  },',start);vm.runInContext(source.slice(start,end).replace('async '+name,'async function '+name)+'\n}',c);}
 return {c,data:()=>data,writes:()=>writes,legacyUpload:payload=>{data={...data,...structuredClone(payload)};version++;}};
}
test('generates Fridays every 28 calendar days at 20:00 through one year ahead, including winter/summer time',()=>{
 const result=ensure(state([event('existing','2026-11-27')]));
 assert.equal(result.clubKegelSerie.anchorDate,'2026-11-27');assert.equal(result.clubTermine.length,13);
 const dates=result.clubTermine.map(e=>e.date).sort();
 assert(dates.every(date=>calendar.friday(date)&&date>=today&&date<=calendar.through(today)));
 for(let i=1;i<dates.length;i++)assert.equal(calendar.timestamp(dates[i])-calendar.timestamp(dates[i-1]),28*86400000);
 assert(result.clubTermine.every(e=>e.time==='20:00'));
});
test('fallback is the previously shown November 27 date, while a club with an existing Friday keeps its own rhythm',()=>{
 assert.equal(ensure(state([])).clubKegelSerie.anchorDate,'2026-11-27');
 assert.equal(ensure(state([event('other','2026-11-13')])).clubKegelSerie.anchorDate,'2026-11-13');
});
test('existing dates, notes and changed times are adopted; a holiday exception replaces its original slot',()=>{
 const result=ensure(state([event('first','2026-11-27',{time:'19:30',note:'Bleibt erhalten'}),event('christmas','2026-12-30',{note:'Wurstknobeln'})]));
 const first=result.clubTermine.find(e=>e.id==='first'),holiday=result.clubTermine.find(e=>e.id==='christmas');
 assert.equal(first.time,'19:30');assert.equal(first.note,'Bleibt erhalten');assert.equal(holiday.seriesDate,'2026-12-25');
 assert(!result.clubTermine.some(e=>e.date==='2026-12-25'));assert.equal(result.clubTermine.filter(e=>e.seriesDate==='2026-12-25').length,1);
});
test('an existing exact slot takes precedence over an extra nearby manual evening',()=>{
 const result=ensure(state([event('first','2026-11-27'),event('extra','2026-12-30'),event('exact','2026-12-25')]));
 assert.equal(result.clubTermine.find(e=>e.id==='exact').seriesDate,'2026-12-25');assert.equal(result.clubTermine.find(e=>e.id==='extra').seriesDate,undefined);
});
test('moving a generated evening to another day, time or event type never recreates its original slot or shifts later slots',()=>{
 const before=ensure(state([])),source=before.clubTermine[0],later=before.clubTermine[1].date;
 const edited=calendar.perform(before,{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'tour',date:'2026-12-02',time:'18:15',note:'Verschoben'}});
 const after=ensure(edited,'2026-11-06'),moved=after.clubTermine.find(e=>e.id===source.id);
 assert.equal(moved.seriesDate,'2026-11-27');assert.equal(moved.date,'2026-12-02');assert.equal(moved.time,'18:15');assert.equal(moved.type,'tour');assert.equal(moved.note,'Verschoben');
 assert(!after.clubTermine.some(e=>e.date==='2026-11-27'));assert(after.clubTermine.some(e=>e.date===later));
});
test('deleting a series event is permanent across repeated starts and horizon extensions',()=>{
 const initial=ensure(state([])),source=initial.clubTermine[0];
 const deleted=calendar.perform(initial,{action:'delete',id:source.id,expectedRevision:1,today});
 for(const date of [today,'2026-11-06','2026-12-01','2027-01-01']){
  const next=ensure(deleted,date);assert(!next.clubTermine.some(e=>e.id===source.id));assert(next.clubKegelSerie.issuedDates.includes('2026-11-27'));
 }
});
test('moving beyond the horizon still consumes only the original slot',()=>{
 const initial=ensure(state([])),source=initial.clubTermine[0];
 const edited=calendar.perform(initial,{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'kegeln',date:'2028-03-01',time:'20:00',note:''}});
 const result=ensure(edited,'2027-01-01');assert.equal(result.clubTermine.filter(e=>e.id===source.id).length,1);assert(!result.clubTermine.some(e=>e.date===source.date));
});
test('repeated generation is idempotent, preserves past entries and adds only newly eligible dates',()=>{
 const initial=ensure(state([event('past','2026-10-30')])),again=ensure(initial);
 assert.deepEqual(plain(again),plain(initial));const later=ensure(initial,'2026-12-10');
 assert(later.clubTermine.some(e=>e.id==='past'));assert(later.clubTermine.length>initial.clubTermine.length);
 assert.equal(new Set(later.clubTermine.map(e=>e.id)).size,later.clubTermine.length);
});
test('leap-day horizon is calendar-year based and includes a slot exactly on its end date',()=>{
 assert.equal(calendar.through('2028-02-29'),'2029-02-28');
 const result=ensure(state([event('anchor','2026-11-06')]),'2026-11-05');
 assert(result.clubTermine.some(e=>e.date==='2027-11-05'));
});
test('manual add/edit/delete keeps IDs stable, detects conflicts and validates actual dates and times',()=>{
 let current=ensure(state([]));const request={action:'add',id:'kc_manual_test',today,event:{type:'tour',date:'2026-11-08',time:'10:00',note:'Ausflug'}};
 current=calendar.perform(current,request);assert.deepEqual(plain(calendar.perform(current,request)),plain(current));
 assert.throws(()=>calendar.perform(current,{...request,id:'kc_manual_duplicate'}),/bereits ein Termin/);
 assert.throws(()=>calendar.perform(current,{action:'edit',id:'kc_manual_test',expectedRevision:0,today,event:request.event}),/inzwischen geändert/);
 for(const fields of [{date:'2026-02-30'},{time:'24:00'},{type:'geburtstag'}])assert.throws(()=>calendar.perform(current,{...request,id:'kc_manual_invalid',event:{...request.event,...fields}}));
 const removed=calendar.perform(current,{action:'delete',id:'kc_manual_test',expectedRevision:1,today});assert(!removed.clubTermine.some(e=>e.id==='kc_manual_test'));
});
test('two simultaneous starts create one series, and unchanged starts perform no additional writes',async()=>{
 const {c,data,writes}=api(state([]));await Promise.all([c.updateClubCalendar('club',{action:'ensure',today}),c.updateClubCalendar('club',{action:'ensure',today})]);
 assert.equal(data().clubTermine.length,13);assert.equal(writes(),1);await c.updateClubCalendar('club',{action:'ensure',today});assert.equal(writes(),1);
});
test('a stale ordinary state upload cannot restore a moved or deleted event or overwrite series metadata',async()=>{
 const {c,data}=api(state([])),original=await c.updateClubCalendar('club',{action:'ensure',today}),source=original.clubTermine[0];
 await c.updateClubCalendar('club',{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'kegeln',date:'2026-12-02',time:'21:00',note:'Bleibt'}});
 await c.saveClubState('club',{...plain(original),persons:[{name:'Anna'}]});assert.equal(data().clubTermine.find(e=>e.id===source.id).date,'2026-12-02');
 await c.updateClubCalendar('club',{action:'delete',id:source.id,expectedRevision:2,today});
 await c.saveClubState('club',plain(original));await c.updateClubCalendar('club',{action:'ensure',today});
 assert(!data().clubTermine.some(e=>e.id===source.id));assert(data().clubKegelSerie.issuedDates.includes(source.seriesDate));assert.equal(data().persons[0].name,'Anna');
});
test('concurrent edits cannot overwrite a newer event revision',async()=>{
 const {c,data}=api(state([])),initial=await c.updateClubCalendar('club',{action:'ensure',today}),source=initial.clubTermine[0];
 await c.updateClubCalendar('club',{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'kegeln',date:'2026-12-01',time:'21:00',note:'Aktuell'}});
 await assert.rejects(c.updateClubCalendar('club',{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'kegeln',date:'2026-12-03',time:'20:00',note:'Veraltet'}}),/inzwischen geändert/);
 assert.equal(data().clubTermine.find(e=>e.id===source.id).date,'2026-12-01');
});
test('legacy member birthday claims still persist without allowing stale calendar uploads',async()=>{
 const birthday={id:'birthday',type:'geburtstag',date:'1989-11-06',note:'Anna'},initial=state([birthday]);const {c,data}=api(initial);
 const first=await c.updateClubCalendar('club',{action:'ensure',today}),revision=first.calendarRevision;
 await c.saveClubState('club',{clubTermine:[{...birthday,memberBirthdayName:'Anna'}],persons:[{name:'Anna',birthDate:'1989-11-06'}]});
 assert.equal(data().clubTermine.find(e=>e.id==='birthday').memberBirthdayName,'Anna');assert.equal(data().calendarRevision,revision+1);assert.equal(data().clubTermine.filter(e=>e.type==='kegeln').length,13);
 await c.saveClubState('club',initial);assert.equal(data().clubTermine.find(e=>e.id==='birthday').memberBirthdayName,'Anna');
});
test('a legacy local calendar seeds only a server state with no calendar; explicit server emptiness wins',async()=>{
 const bootstrap=[event('existing','2026-11-13')],a=api({persons:[{name:'Anna'}]});
 await a.c.updateClubCalendar('club',{action:'ensure',today,bootstrapEvents:bootstrap});assert.equal(a.data().clubKegelSerie.anchorDate,'2026-11-13');
 const b=api({clubTermine:[]});await b.c.updateClubCalendar('club',{action:'ensure',today,bootstrapEvents:bootstrap});assert.equal(b.data().clubKegelSerie.anchorDate,'2026-11-27');
});
test('planning never mutates the source entries or series metadata',()=>{
 const source=state([event('old','2026-11-27')]),before=JSON.stringify(source);ensure(source);assert.equal(JSON.stringify(source),before);
});
test('a state upload from the old app cannot destroy authoritative calendar edits or deleted-slot memory',async()=>{
 const store=api(state([])),{c,data}=store,initial=await c.updateClubCalendar('club',{action:'ensure',today}),source=initial.clubTermine[0];
 await c.updateClubCalendar('club',{action:'edit',id:source.id,expectedRevision:1,today,event:{type:'kegeln',date:'2026-12-02',time:'21:00',note:'Verlegt'}});
 store.legacyUpload({clubTermine:[]});
 assert.equal(data().clubCalendarData.clubTermine.find(e=>e.id===source.id).date,'2026-12-02');
 await c.updateClubCalendar('club',{action:'ensure',today});assert.equal(data().clubTermine.find(e=>e.id===source.id).date,'2026-12-02');
 await c.updateClubCalendar('club',{action:'delete',id:source.id,expectedRevision:2,today});store.legacyUpload({clubTermine:initial.clubTermine});
 await c.updateClubCalendar('club',{action:'ensure',today});assert(!data().clubTermine.some(e=>e.id===source.id));assert(data().clubKegelSerie.issuedDates.includes(source.seriesDate));
});
