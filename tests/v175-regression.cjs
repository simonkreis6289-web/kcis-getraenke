const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={window:{},document:{addEventListener(){}},console};vm.createContext(context);
for(const file of ['js/birthdays.js','js/cash-book.js','js/historical-evenings.js','js/cash-expenses.js']){vm.runInContext(read(file),context);Object.assign(context,context.window);}
const cash=context.KCCashBook;
const fine=(id,date,total,lane,extra={})=>({id,category:'strafen',date,totals:{grandTotal:total},...(lane==null?{}:{laneCostCents:lane}),...extra});
const manual=(id,date,cents,extra={})=>({id,category:'expense',description:'Geschenk',date,incurredAt:date+'T12:00:00',amountCents:cents,...extra});
function api(){
 const data=new Map(),ctx={db:{},console,serverTimestamp:()=> 'server',doc:(_, ...parts)=>parts.join('/')};
 const snap=key=>({exists:()=>data.has(key),data:()=>structuredClone(data.get(key))});
 ctx.runTransaction=async(_,callback)=>{const pending=[];const result=await callback({get:async key=>snap(key),set:(key,value)=>pending.push(()=>data.set(key,structuredClone(value))),delete:key=>pending.push(()=>data.delete(key))});pending.forEach(write=>write());return result;};
 vm.createContext(ctx);const source=read('js/firebase.js');
 for(const name of ['saveStrafenClosure','saveCashExpense','updateLaneExpense','deleteCashExpense','saveHistoricalStrafenEvent']){
  const start=source.indexOf('  async '+name+'('),end=source.indexOf('\n  },',start);
  vm.runInContext(source.slice(start,end).replace('async '+name,'async function '+name)+'\n}',ctx);
 }
 return {data,ctx,key:id=>'clubs/club/archive/'+id};
}

test('lane price charges each started hour, including exact boundaries and fractional hourly rates',()=>{
 const source=read('js/app.js'),start=source.indexOf('function calcBahnPreis('),end=source.indexOf('\nfunction ',start+10);
 const ctx={seconds:0,bahnPreisProStunde:12.5};ctx.getBahnElapsedSeconds=()=>ctx.seconds;vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 for(const [seconds,price] of [[0,0],[1,12.5],[1800,12.5],[3599,12.5],[3600,12.5],[3601,25],[7200,25],[7201,37.5]]){ctx.seconds=seconds;assert.equal(ctx.calcBahnPreis(),price);}
});
test('cash balance subtracts manual and automatic expenses without changing member amounts',()=>{
 const archive=[fine('a','2026-11-01',100,2000)],expenses=[manual('expense_manual_a','2026-11-02',529)];
 const statement=cash.statement(archive,{openingCents:5000},expenses);
 assert.equal(statement.income,10000);assert.equal(statement.spending,2529);assert.equal(statement.balance,12471);assert.equal(statement.expenseCount,2);
 assert.equal(cash.matrix(archive,null).income,10000);
});
test('reset uses identical date/time boundaries for income and lane fees; manual expenses follow their expense time',()=>{
 const old=fine('old','2026-11-04',100,2000,{eveningStartedAt:'2026-11-04T19:00:00Z',closedAt:'2026-11-05T15:00:00Z'});
 const next=fine('next','2026-11-06',100,3000,{eveningStartedAt:'2026-11-06T19:00:00Z'});
 const expenses=[manual('expense_manual_old','2026-11-05',500,{incurredAt:'2026-11-05T09:00:00Z'}),manual('expense_manual_new','2026-11-05',700,{incurredAt:'2026-11-05T13:00:00Z'})];
 const result=cash.statement([old,next],{mode:'now',startAt:'2026-11-05T12:00:00Z'},expenses);
 assert.equal(result.income,10000);assert.equal(result.spending,3700);assert.equal(result.balance,6300);
 assert.equal(cash.statement([old,next],{mode:'date',startDate:'2026-11-06'},expenses).spending,3000);
});
test('repeated closure IDs book the lane once; deleting an evening removes its lane expense automatically',()=>{
 const a=fine('a','2026-11-01',100,2000);
 assert.equal(cash.statement([a,a],null).spending,2000);
 assert.equal(cash.statement([],null).spending,0);
 assert.equal(cash.statement([{...a,laneExpenseExcluded:true}],null).spending,0);
 assert.equal(cash.statement([fine('legacy','2026-11-01',100)],null).spending,0);
});
test('manual expenses can exceed income, and an expense date correction changes its accounting period',()=>{
 const e=manual('expense_manual_a','2026-10-31',10000);
 assert.equal(cash.statement([],{mode:'date',startDate:'2026-11-01'},[e]).balance,0);
 assert.equal(cash.statement([],{mode:'date',startDate:'2026-11-01'},[{...e,date:'2026-11-01'}]).balance,-10000);
});
test('money input rejects empty, negative, fractional-cent, infinite and excessive amounts',()=>{
 for(const value of ['', '-1','1.001','Infinity','9007199254740992','no'])assert.throws(()=>context.parseCashExpenseAmount(value,true));
 assert.throws(()=>context.parseCashExpenseAmount('0'));
 assert.equal(context.parseCashExpenseAmount('0',true),0);assert.equal(context.parseCashExpenseAmount('12,34'),1234);
});
test('closure stores chosen lane fee and revenue in one versioned record; retries update rather than duplicate',async()=>{
 const {data,ctx,key}=api(),id='strafen_abend_test',payload={category:'strafen',laneCostCents:3500,totals:{grandTotal:100}};
 assert.equal(await ctx.saveStrafenClosure('club',id,payload,null),1);assert.equal(data.size,1);
 await assert.rejects(ctx.saveStrafenClosure('club',id,payload,null),/inzwischen/);
 assert.equal(await ctx.saveStrafenClosure('club',id,{...payload,laneCostCents:4000},1),2);
 assert.equal(data.get(key(id)).laneCostCents,4000);assert.equal(data.size,1);
 await assert.rejects(ctx.saveStrafenClosure('club',id,payload,1),/inzwischen/);
});
test('manual expense create, correction and deletion are revision checked and cannot overwrite fine records',async()=>{
 const {data,ctx,key}=api(),id='expense_manual_test',payload=manual(id,'2026-11-01',2500);
 assert.equal(await ctx.saveCashExpense('club',id,payload,null),1);
 assert.equal(await ctx.saveCashExpense('club',id,{...payload,amountCents:2600},1),2);
 await assert.rejects(ctx.deleteCashExpense('club',id,1),/inzwischen/);await ctx.deleteCashExpense('club',id,2);assert.equal(data.size,0);
 data.set(key(id),{category:'strafen',ledgerRevision:0});await assert.rejects(ctx.saveCashExpense('club',id,payload,0),/inzwischen/);
 await assert.rejects(ctx.saveCashExpense('club','../bad',payload,null),/Ungültige/);
});
test('editing or removing an automatic expense keeps its archived income and invalidates a stale closure',async()=>{
 const {data,ctx,key}=api(),id='strafen_abend_test';
 await ctx.saveStrafenClosure('club',id,{category:'strafen',laneCostCents:2000,totals:{grandTotal:100}},null);
 await ctx.updateLaneExpense('club',id,{amountCents:3500,date:'2026-11-01',incurredAt:'2026-11-01T20:00:00'},1);
 assert.equal(data.get(key(id)).laneCostCents,3500);assert.equal(data.get(key(id)).totals.grandTotal,100);
 await assert.rejects(ctx.saveStrafenClosure('club',id,{category:'strafen',laneCostCents:2000},1),/inzwischen/);
 await ctx.updateLaneExpense('club',id,{remove:true},2);
 assert.equal(data.get(key(id)).laneExpenseExcluded,true);assert.equal(data.get(key(id)).laneCostCents,3500);
 assert.equal(cash.statement([{...data.get(key(id)),id}],null).balance,10000);
});
test('editing a backfilled lane fee updates its draft and prevents stale historical writes',async()=>{
 const {data,ctx,key}=api(),id='strafen_nachtrag_test',payload={category:'strafen',kind:'backfill',laneCostCents:1000,manualDraft:{laneFee:'10.00'},totals:{grandTotal:100}};
 await ctx.saveHistoricalStrafenEvent('club',id,payload,null);
 await ctx.updateLaneExpense('club',id,{amountCents:1234,date:'2026-11-01',incurredAt:'2026-11-01T20:00:00'},1);
 assert.equal(data.get(key(id)).manualDraft.laneFee,'12.34');assert.equal(data.get(key(id)).manualRevision,2);
 await assert.rejects(ctx.saveHistoricalStrafenEvent('club',id,payload,1),/inzwischen/);
});
test('historical optional lane fees do not affect individual totals, and cancelled evenings do not book a lane fee',()=>{
 const engine=context.KCHistorical,d=engine.create('backfill',[{name:'Anna'}],[],{}, {monthlyFee:10});d.date='2026-11-01';d.rows[0].status='present';
 assert.equal(engine.snapshot(d).laneCostCents,undefined);d.laneFee='25.50';const s=engine.snapshot(d);
 assert.equal(s.laneCostCents,2550);assert.equal(s.totals.grandTotal,10);
 d.mode='cancelled';assert.equal(engine.snapshot(d).laneCostCents,undefined);
});
test('clearing a historical lane fee removes its automatic expense while preserving income',async()=>{
 const {data,ctx,key}=api(),id='strafen_nachtrag_test',payload={category:'strafen',kind:'backfill',date:'2026-11-01',laneCostCents:1000,totals:{grandTotal:100}};
 await ctx.saveHistoricalStrafenEvent('club',id,payload,null);
 await ctx.saveHistoricalStrafenEvent('club',id,{...payload,laneCostCents:null},1);
 const result=cash.statement([{...data.get(key(id)),id}],null);assert.equal(result.spending,0);assert.equal(result.balance,10000);
});
test('expense APIs reject negative amounts, invalid calendar dates and cross-category edits',async()=>{
 const {data,ctx,key}=api(),id='expense_manual_test',payload=manual(id,'2026-11-01',2000);
 await assert.rejects(ctx.saveCashExpense('club',id,{...payload,amountCents:-1},null),/Ungültige/);
 for(const date of ['2026-02-30','2026-13-01'])await assert.rejects(ctx.saveCashExpense('club',id,{...payload,date},null),/Ungültige/);
 await assert.rejects(ctx.saveStrafenClosure('club','strafen_abend_test',{category:'strafen',laneCostCents:-1},null),/Ungültige/);
 data.set(key(id),{category:'getraenke',laneCostCents:1000,ledgerRevision:0});
 await assert.rejects(ctx.updateLaneExpense('club',id,{remove:true},0),/keine Bahngebühr/);
 assert.equal(data.get(key(id)).category,'getraenke');
});
