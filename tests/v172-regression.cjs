const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx={window:{},document:{addEventListener(){}},console};vm.createContext(ctx);
for(const p of ['js/birthdays.js','js/historical-evenings.js']){vm.runInContext(read(p),ctx);Object.assign(ctx,ctx.window);}
const engine=ctx.KCHistorical;
const people=[{name:'Anna',strafen:{neun:99},present:true},{name:'Ben'},{name:'Clara'},{name:'Gast',isGuest:true},{name:'Inaktiv',inactive:true},{name:'Trinkgast',isDrinksOnly:true}];
const catalog=[{key:'gosse',label:'Gosse'},{key:'neun',label:'Neuner'},{key:'late',label:'Verspätet'},{key:'early',label:'Zu früh gegangen'},{key:'loser',label:'1. Verlierer'}];
const prices={gosse:.5,neun:1,late:2,early:2,loser:3};
function draft(mode='backfill'){
 const d=engine.create(mode,people,catalog,prices,{monthlyFee:10,limit:30,startTime:'20:00',endTime:'23:00'});d.date='2026-10-20';return d;
}
const snapshot=d=>engine.snapshot(d,{club:'Testclub',today:'2026-11-05'});
test('cancelled evening: 50 per selected member, no dues or individual fines',()=>{
 const d=draft('cancelled');const s=snapshot(d);
 assert.equal(s.members.length,3);assert.equal(s.guests.length,0);assert.equal(s.totals.grandTotal,150);assert.equal(s.totals.memberFeeTotal,0);
 assert(s.members.every(p=>p.total===50&&Object.values(p.strafen).every(n=>n===0)));
 d.rows.find(p=>p.name==='Inaktiv').included=true;assert.equal(snapshot(d).totals.grandTotal,200);
});
test('played evening: statuses, highest member penalty, fees and guests',()=>{
 const d=draft();d.rows[0].status='present';d.rows[0].counts.gosse=2;d.rows[0].counts.neun=2;
 d.rows[1].status='excused';d.rows[2].status='unexcused';d.rows[3].included=true;d.rows[3].status='present';d.rows[3].counts.loser=1;
 const s=snapshot(d);assert.equal(s.highestPresent,6);assert.equal(s.members[0].total,16);assert.equal(s.members[1].total,18);assert.equal(s.members[2].total,38);assert.equal(s.guests[0].total,3);assert.equal(s.totals.grandTotal,75);
});
test('cap applies before on-top amounts; historical rates are independent',()=>{
 const d=draft();d.rows.forEach(p=>p.included=false);const a=d.rows[0];a.included=true;a.status='present';a.counts.neun=20;a.normalExtra='4';a.onTopExtra='2';d.limit='5';
 assert.equal(snapshot(d).members[0].penaltyTotal,7);assert.equal(snapshot(d).members[0].total,17);
 d.limit='100';d.catalog.find(s=>s.key==='neun').price='2.25';assert.equal(snapshot(d).members[0].penaltyTotal,51);
});
test('arrival and leaving counts replace manual time counters instead of adding twice',()=>{
 const d=draft();d.rows.forEach(p=>p.included=false);const a=d.rows[0];a.included=true;a.status='present';a.arrivalTime='20:16';a.leftEarlyAt='22:50';a.counts.late=9;
 const p=snapshot(d).members[0];assert.equal(p.strafen.late,2);assert.equal(p.strafen.early,1);assert.equal(p.penaltyTotal,6);assert.equal(p.latePdfData.amount,4);
 assert.equal(engine.quarters('early','00:15','20:00','00:30'),1);assert.equal(engine.quarters('late','00:10','20:00','00:30'),17);
});
test('drafts and snapshots never change live counts, prices, attendance or the draft',()=>{
 const before=JSON.stringify({people,catalog,prices}),d=draft();d.rows.forEach(p=>p.included=false);d.rows[0].included=true;d.rows[0].status='present';d.rows[0].counts.neun=1;
 const beforeDraft=JSON.stringify(d),s=snapshot(d);s.members[0].strafen.neun=4;
 assert.equal(JSON.stringify(d),beforeDraft);assert.equal(JSON.stringify({people,catalog,prices}),before);assert.equal(d.rows[0].counts.neun,1);assert.equal(s.history.length,0);
});
test('recorded data retains the selected date and all custom rows and penalties',()=>{
 const d=draft();d.rows.forEach(p=>p.included=false);d.rows.push({name:'Früheres Mitglied',isGuest:false,included:true,status:'present',counts:{custom:3},normalExtra:'0',onTopExtra:'0',arrivalTime:'',leftEarlyAt:''});
 d.catalog.push({key:'custom',label:'Alte Strafart',price:'1.25'});const s=snapshot(d);
 assert.equal(s.date.slice(0,10),'2026-10-20');assert.equal(s.members[0].name,'Früheres Mitglied');assert.equal(s.members[0].penaltyTotal,3.75);assert.equal(s.manualDraft.catalog.at(-1).price,'1.25');
});
test('unknown statuses, empty rosters, duplicate names, invalid dates and fractional counts fail validation',()=>{
 assert.throws(()=>snapshot(draft()),/Anwesenheitsstatus/);
 const d=draft('cancelled');d.rows.forEach(p=>p.included=false);assert.throws(()=>snapshot(d),/Mindestens/);
 const duplicate=draft('cancelled');duplicate.rows[1].name='anna';assert.throws(()=>snapshot(duplicate),/doppelt/);
 const invalid=draft('cancelled');invalid.date='2026-02-30';assert.throws(()=>snapshot(invalid),/Datum/);
 invalid.date='2999-01-01';assert.throws(()=>snapshot(invalid),/Datum/);
 const counts=draft();counts.rows.forEach(p=>p.included=false);counts.rows[0].included=true;counts.rows[0].status='present';counts.rows[0].counts.neun=1.5;assert.throws(()=>snapshot(counts),/ganze Zahl/);
});
function api(){
 const data=new Map();let writes=0;
 const c={db:{},doc:(db,...parts)=>parts.join('/'),serverTimestamp:()=>1,runTransaction:async(db,run)=>run({get:async ref=>({exists:()=>data.has(ref),data:()=>data.get(ref)}),set:(ref,value)=>{data.set(ref,value);writes++;},delete:ref=>data.delete(ref)})};
 vm.createContext(c);const s=read('js/firebase.js'),a=s.indexOf('  async saveHistoricalStrafenEvent('),b=s.indexOf('\n  },',a);
 vm.runInContext(s.slice(a,b).replace('async saveHistoricalStrafenEvent','async function save')+'\n}',c);
 return {c,data,writes:()=>writes};
}
const payload={category:'strafen',kind:'backfill',totals:{grandTotal:10}};
test('archive retries use one ID and concurrent edits are rejected',async()=>{
 const {c,data,writes}=api(),id='strafen_nachtrag_test';
 assert.equal(await c.save('club',id,payload,null),1);assert.equal(data.size,1);
 await assert.rejects(c.save('club',id,payload,null),/inzwischen/);assert.equal(writes(),1);
 assert.equal(await c.save('club',id,{...payload,totals:{grandTotal:20}},1),2);assert.equal(data.size,1);
 await assert.rejects(c.save('club',id,payload,1),/inzwischen/);assert.equal(writes(),2);
});
test('cancelled date corrections move one archive entry without duplicating the cash balance',async()=>{
 const {c,data}=api(),old='cancelled_2026-10-20',next='cancelled_2026-10-21',p={...payload,kind:'cancelled'};
 await c.save('club',old,p,null);assert.equal(await c.save('club',next,p,1,old),2);
 assert.equal(data.size,1);assert(!data.has('clubs/club/archive/'+old));assert(data.has('clubs/club/archive/'+next));
});
test('archive category and path guards reject unrelated records',async()=>{
 const {c,data}=api();data.set('clubs/club/archive/strafen_nachtrag_test',{category:'getraenke'});
 await assert.rejects(c.save('club','strafen_nachtrag_test',payload,0),/kein Strafenabschluss/);
 await assert.rejects(c.save('club','../elsewhere',payload,null),/Ungültiger/);
});
