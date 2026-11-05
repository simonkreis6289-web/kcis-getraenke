const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function context(files,extra={}){
  const ctx={window:{},document:{addEventListener(){}},console,...extra};vm.createContext(ctx);
  for(const file of files){vm.runInContext(source(file),ctx);Object.assign(ctx,ctx.window);}
  return ctx;
}
const dates=context(['js/birthdays.js']).KCBirthdays;
const cash=context(['js/cash-book.js']).KCCashBook;

test('birthdays: today, annual rollover and Berlin timezone',()=>{
  assert.equal(dates.next('1989-11-06','2026-11-05'),'2026-11-06');
  assert.equal(dates.next('1989-11-06','2026-11-06'),'2026-11-06');
  assert.equal(dates.next('1989-11-06','2026-11-07'),'2027-11-06');
  assert.equal(dates.next('1989-01-02','2026-12-31'),'2027-01-02');
  assert.equal(dates.today(new Date('2026-12-31T23:30:00Z')),'2027-01-01');
});
test('birthdays: leap dates and invalid dates',()=>{
  assert.equal(dates.next('2000-02-29','2027-01-01'),'2027-02-28');
  assert.equal(dates.next('2000-02-29','2028-01-01'),'2028-02-29');
  assert.equal(dates.parse('2026-02-29'),null);
  assert.equal(dates.parse('1980-02-30'),null);
});
test('birthdays: members need not be present, guests/drink guests excluded',()=>{
  const people=[{name:'Anna',birthDate:'1990-01-02',present:false},{name:'Ben',birthDate:'1990-01-03',isGuest:true},{name:'Clara',birthDate:'1990-01-04',isDrinksOnly:true}];
  const events=dates.events(people,[],'2026-12-30','2027-01-05');
  assert.equal(events.length,1);assert.equal(events[0].date,'2027-01-02');assert.equal(events[0].note,'Anna');
});
test('birthdays: legacy entries repeat, duplicates suppressed, input untouched',()=>{
  const people=[{name:'Anna',birthDate:'1980-11-06'}];
  const old=[{id:'one',type:'geburtstag',date:'2020-11-06',note:'Anna'},{id:'two',type:'geburtstag',date:'2020-12-01',note:'Ben'},{id:'three',type:'kegeln',date:'2026-11-27'}];
  const before=JSON.stringify(old),events=dates.events(people,old,'2026-11-05');
  assert.equal(events.length,2);assert.equal(events[1].date,'2026-12-01');assert.equal(JSON.stringify(old),before);
  assert.equal(dates.events([{name:'Anna',birthDate:''}],[{...old[0],memberBirthdayName:'Anna'}],'2026-11-05').length,0);
});

const entries=[
  {id:'old',date:'2026-10-20',closedAt:'2026-10-20T22:00:00Z',totals:{grandTotal:100}},
  {id:'a',date:'2026-11-04',closedAt:'2026-11-04T22:00:00Z',totals:{grandTotal:341}},
  {id:'b',date:'2026-11-04',closedAt:'2026-11-04T23:00:00Z',totals:{grandTotal:657.85}},
  {id:'c',date:'2026-11-06',eveningStartedAt:'2026-11-06T18:00:00Z',closedAt:'2026-11-06T22:00:00Z',totals:{grandTotal:0.29}}
];
test('cash: opening amount plus statements, inclusive chosen date, cents exact',()=>{
  assert.deepEqual(plain(cash.summary(entries,{mode:'date',startDate:'2026-11-04',openingCents:5000})),{opening:5000,income:99914,balance:104914,count:3});
  assert.equal(cash.money('0,29'),29);
});
test('cash: reset now, future statements, retrospective date correction',()=>{
  const reset={mode:'now',startAt:'2026-11-05T10:00:00Z',openingCents:0};
  assert.equal(cash.summary(entries.slice(0,3),reset).balance,0);
  assert.equal(cash.summary(entries,reset).balance,29);
  assert.equal(cash.summary(entries,{mode:'date',startDate:'2026-10-01',openingCents:0}).balance,109914);
});
test('cash: use evening start where known, do not count the same archive ID twice',()=>{
  const oldEvening={id:'late',date:'2026-11-04',eveningStartedAt:'2026-11-04T18:00:00Z',closedAt:'2026-11-05T12:00:00Z',totals:{grandTotal:5}};
  assert.equal(cash.summary([oldEvening],{mode:'now',startAt:'2026-11-05T10:00:00Z'}).balance,0);
  assert.equal(cash.summary([entries[1],entries[1]],null).balance,34100);
});
test('cash: deleted statements drop from balance, different statements on one date remain separate',()=>{
  const settings={mode:'date',startDate:'2026-11-04',openingCents:5000};
  assert.equal(cash.summary(entries.filter(e=>e.id!=='b'),settings).balance,39129);
  assert.equal(cash.summary(entries,settings).count,3);
});
test('cash: cancelled evenings and legacy snapshots without totals',()=>{
  assert.equal(cash.total({members:[{chargedCents:5000},{chargedCents:5000}]}),10000);
  assert.equal(cash.total({members:[{total:30.10}],guests:[{total:2.30}]}),3240);
  assert.equal(cash.total({totals:{grandTotal:0},members:[{total:99}]}),0);
});
test('cash: a statement exported after midnight belongs to the evening it started',()=>{
  const entry={id:'night',date:'2026-11-05',eveningStartedAt:'2026-11-04T19:00:00Z',closedAt:'2026-11-05T00:30:00Z',totals:{grandTotal:100}};
  assert.equal(cash.date(entry),'2026-11-04');
  assert.equal(cash.summary([entry],{mode:'date',startDate:'2026-11-05'}).balance,0);
});

function deleteAPI(category='strafen'){
  const firebase=source('js/firebase.js');
  const start=firebase.indexOf('  async deleteArchivedStrafenEvent('),end=firebase.indexOf('\n  },',start);
  let reads=0,deletes=0;
  const ctx={doc:(...args)=>args,db:{},getDoc:async()=>{reads++;return{exists:()=>true,data:()=>({category})}},deleteDoc:async()=>{deletes++}};
  vm.createContext(ctx);vm.runInContext(firebase.slice(start,end).replace('async deleteArchivedStrafenEvent','async function remove')+'\n}',ctx);
  return {ctx,counts:()=>({reads,deletes})};
}
test('archive deletion accepts IDs produced by current and old exports',async()=>{
  for(const id of ['strafen_abend_2026-11-04T18_00_00_000Z','strafen_2026-11-04T18:00:00.000Z','cancelled_2026-11-04']){
    const {ctx,counts}=deleteAPI();await ctx.remove('club',id);assert.equal(counts().deletes,1);
  }
});
test('archive deletion rejects wrong categories and path injection',async()=>{
  const wrong=deleteAPI('getraenke');await assert.rejects(wrong.ctx.remove('club','strafen_abend_x'));assert.equal(wrong.counts().deletes,0);
  const invalid=deleteAPI();await assert.rejects(invalid.ctx.remove('club','../other'));assert.deepEqual(invalid.counts(),{reads:0,deletes:0});
});

function profileContext(){
  const nodes={};const get=id=>nodes[id]||(nodes[id]={value:'',textContent:'',disabled:false,focus(){},classList:{add(){},remove(){},contains(){return false}}});
  let saved,local;
  const ctx=context(['js/birthdays.js','js/member-profiles.js'],{
    document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){},activeElement:null},
    persons:[{name:'Anna'}],clubTermine:[{type:'geburtstag',date:'2026-11-06',note:'Anna'}],ACTIVE_CLUB:'club',navigator:{onLine:true},lastLocalChangeAt:1,
    persistState(){local=JSON.stringify({persons:ctx.persons,clubTermine:ctx.clubTermine})},
    saveToFirestore:async()=>{saved=JSON.stringify({persons:ctx.persons,clubTermine:ctx.clubTermine});return true},
    renderMemberManagement(){},kcRenderTermine(){},showToast(){}
  });ctx.window.firestoreApi={};return {ctx,get,saved:()=>saved,local:()=>local};
}
test('member profile saves birth date and claims matching legacy entry in local/cloud state',async()=>{
  const {ctx,get,saved,local}=profileContext();ctx.openMemberProfile('Anna');get('member-profile-birthdate').value='1989-11-06';await ctx.saveMemberProfile();
  assert.equal(ctx.persons[0].birthDate,'1989-11-06');assert.equal(ctx.clubTermine[0].memberBirthdayName,'Anna');assert.equal(saved(),local());
});
test('member profile rejects future dates and clearing does not revive the legacy birthday',async()=>{
  const {ctx,get}=profileContext();ctx.openMemberProfile('Anna');get('member-profile-birthdate').value='2999-01-01';await ctx.saveMemberProfile();assert.equal(ctx.persons[0].birthDate,undefined);
  get('member-profile-birthdate').value='1989-11-06';await ctx.saveMemberProfile();ctx.openMemberProfile('Anna');get('member-profile-birthdate').value='';await ctx.saveMemberProfile();
  assert.equal(ctx.KCBirthdays.events(ctx.persons,ctx.clubTermine,'2026-11-05').length,0);
});

function settingsContext(success=true,online=true){
  const nodes={};let writes=0;
  const ctx=context(['js/birthdays.js','js/cash-book.js'],{
    document:{addEventListener(){},getElementById(id){if(id==='cash-book-summary')return null;return nodes[id]||(nodes[id]={});},querySelectorAll:()=>[],querySelector:()=>({value:'keep'})},
    console:{error(){}},ACTIVE_CLUB:'club',cashBookSettings:{mode:'date',startDate:'2026-10-01',openingCents:5000},navigator:{onLine:online},lastLocalChangeAt:1,
    persistState(){},saveToFirestore:async()=>{writes++;return success},showToast(){}
  });ctx.window.firestoreApi={};return {ctx,writes:()=>writes};
}
test('cash settings retain the old period on save failure and require a connection',async()=>{
  const failed=settingsContext(false);const previous=JSON.stringify(failed.ctx.cashBookSettings);
  assert.equal(await failed.ctx.storeCashBookSettings({mode:'date',startDate:'2026-11-01',openingCents:0}),false);
  assert.equal(JSON.stringify(failed.ctx.cashBookSettings),previous);
  const offline=settingsContext(true,false);assert.equal(await offline.ctx.storeCashBookSettings({openingCents:0}),false);assert.equal(offline.writes(),0);
});
test('cash settings save independently of archived statements',async()=>{
  const {ctx,writes}=settingsContext();
  const next={mode:'date',startDate:'2026-11-01',openingCents:12345};
  assert.equal(await ctx.storeCashBookSettings(next),true);assert.equal(ctx.cashBookSettings,next);assert.equal(writes(),1);
});
test('member profile save failure preserves prior birthday and manual events',async()=>{
  const {ctx,get}=profileContext();ctx.console={error(){}};ctx.saveToFirestore=async()=>false;
  ctx.openMemberProfile('Anna');get('member-profile-birthdate').value='1989-11-06';await ctx.saveMemberProfile();
  assert.equal(ctx.persons[0].birthDate,undefined);assert.equal(ctx.clubTermine[0].memberBirthdayName,undefined);assert.equal(ctx.lastLocalChangeAt,1);
});
