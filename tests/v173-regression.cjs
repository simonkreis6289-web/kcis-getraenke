const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),context={window:{},document:{addEventListener(){}},console};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'js/cash-book.js'),'utf8'),context);
const cash=context.window.KCCashBook,plain=value=>JSON.parse(JSON.stringify(value));
const entry=(id,date,members,extra={})=>({id,date,members,...extra});
const amount=(name,total)=>({name,total});

test('year table and balance use exactly the same date boundary and opening amount stays separate',()=>{
  const entries=[entry('old','2026-10-31',[amount('Anna',9)]),entry('first','2026-11-01',[amount('Anna',20.29)]),entry('second','2026-11-05',[amount('Ben',30.10)])];
  const settings={mode:'date',startDate:'2026-11-01',openingCents:12345};
  const table=cash.matrix(entries,settings),summary=cash.summary(entries,settings);
  assert.deepEqual(plain(table.columns.map(c=>c.id)),['first','second']);
  assert.equal(table.income,5039);assert.equal(table.income,summary.income);assert.equal(summary.balance,17384);
  assert.equal(table.rows.reduce((sum,row)=>sum+row.total,0),table.income);
});
test('reset now immediately clears the table and subsequent evenings start a fresh table',()=>{
  const settings={mode:'now',startAt:'2026-11-05T12:00:00Z',openingCents:0};
  const old=entry('old','2026-11-05',[amount('Anna',10)],{eveningStartedAt:'2026-11-04T19:00:00Z',closedAt:'2026-11-05T13:00:00Z'});
  assert.equal(cash.matrix([old],settings).columns.length,0);
  const next=entry('new','2026-11-06',[amount('Anna',15)],{eveningStartedAt:'2026-11-06T19:00:00Z'});
  const table=cash.matrix([old,next],settings);assert.equal(table.columns.length,1);assert.equal(table.income,1500);
});
test('late backfills use the evening date; historical date corrections rebuild the period',()=>{
  const entries=[entry('backfill','2026-10-20',[amount('Anna',25)],{kind:'backfill',eveningStartedAt:'2026-10-20T20:00:00+02:00',closedAt:'2026-11-05T15:00:00Z'}),entry('cancelled','2026-11-02',[amount('Anna',50)],{kind:'cancelled'})];
  assert.equal(cash.matrix(entries,{mode:'date',startDate:'2026-11-01'}).income,5000);
  assert.equal(cash.matrix(entries,{mode:'date',startDate:'2026-10-01'}).income,7500);
  assert.equal(cash.matrix(entries,{mode:'now',startAt:'2026-11-01T00:00:00Z'}).income,5000);
});
test('cells distinguish unrecorded members from a recorded zero and retain historical members and guests',()=>{
  const entries=[entry('a','2026-11-01',[amount('Anna',0),amount('Früheres Mitglied',30)],{guests:[amount('Anna',2)]})];
  const roster=[{name:'Anna'},{name:'Ben'},{name:'Inaktiv',inactive:true},{name:'Trinkgast',isDrinksOnly:true},{name:'Gast',isGuest:true}];
  const table=cash.matrix(entries,null,roster);
  assert.equal(table.rows.find(r=>r.name==='Anna'&&!r.isGuest).values[0],0);
  assert.equal(table.rows.find(r=>r.name==='Ben').values[0],null);
  assert.equal(table.rows.find(r=>r.name==='Früheres Mitglied').total,3000);
  assert.equal(table.rows.find(r=>r.name==='Anna'&&r.isGuest).total,200);
  assert(!table.rows.some(r=>['Inaktiv','Trinkgast','Gast'].includes(r.name)));
});
test('same-day closures remain separate, repeated IDs are counted once, and columns sort chronologically',()=>{
  const a=entry('a','2026-11-01',[amount('Anna',10)]),b=entry('b','2026-11-01',[amount('Anna',20)]),c=entry('c','2026-11-05',[amount('Anna',30)]);
  const table=cash.matrix([c,b,a,a],null);
  assert.deepEqual(plain(table.columns.map(c=>c.id)),['a','b','c']);
  assert.deepEqual(plain(table.rows[0].values),[1000,2000,3000]);assert.equal(table.income,6000);
});
test('legacy cents and component amounts are supported; unallocated amounts reconcile with cash balance',()=>{
  const entries=[entry('a','2026-11-01',[{name:'Anna',chargedCents:5029},{name:'Ben',penaltyTotal:2.3,monthlyFee:10}]),entry('b','2026-11-02',[],{totals:{grandTotal:20}}),entry('c','2026-11-03',[amount('Anna',5)],{totals:{grandTotal:4}})];
  const table=cash.matrix(entries,null),remainder=table.rows.find(r=>r.unassigned);
  assert.deepEqual(plain(remainder.values),[null,2000,-100]);assert.equal(remainder.total,1900);
  assert.equal(table.rows.reduce((sum,row)=>sum+row.total,0),cash.summary(entries,null).income);
  assert.equal(table.income,8659);
});
test('deleting or correcting an archive entry recalculates cells and totals without keeping stale columns',()=>{
  const a=entry('a','2026-11-01',[amount('Anna',10)]),b=entry('b','2026-11-05',[amount('Anna',20)]);
  assert.equal(cash.matrix([a,b],null).rows[0].total,3000);
  assert.equal(cash.matrix([a],null).rows[0].total,1000);
  const corrected={...a,members:[amount('Anna',12.34)]};
  assert.equal(cash.matrix([corrected],null).income,1234);
});
test('matrix leaves archives and roster untouched and normalizes whitespace and case in names',()=>{
  const entries=[entry('a','2026-11-01',[amount('  Anna   Kreis ',1)]),entry('b','2026-11-05',[amount('ANNA KREIS',2)])],roster=[{name:'Anna Kreis'}];
  const before=JSON.stringify({entries,roster}),table=cash.matrix(entries,null,roster);
  assert.equal(table.rows.length,1);assert.equal(table.rows[0].name,'Anna Kreis');assert.equal(table.rows[0].total,300);
  assert.equal(JSON.stringify({entries,roster}),before);
});
