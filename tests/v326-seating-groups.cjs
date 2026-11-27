const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(p,'utf8'),copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+encodeURIComponent(name.toLocaleLowerCase('de'));
const source=read('tests/v215-shared-sync.cjs'),factory=source.slice(source.indexOf('function database('),source.indexOf("test('two devices increment"))+source.slice(source.indexOf('function fullApp('),source.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',factory+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);
function fixture(){
 const root=initial();root.seatingOrder=Array(16).fill('');root.persons=['A','B','C','D','E'].map(name=>({...copy(root.persons[0]),name,tisch:''}));
 root.persons.push({...copy(root.persons[0]),name:'Drinker',isDrinksOnly:true,tisch:''});
 return database({[rootPath]:root});
}
test('combined tablet view assigns seats and teams, swaps across sides, supports both selection directions and synchronizes atomically',{timeout:60000},async()=>{
 const db=fixture(),a=fullApp(db);await a.select();
 a.c.showSideTab('organisation','gruppen');
 assert(!a.document.getElementById('tab-sitzordnung').classList.contains('hidden'));
 assert.equal(a.document.getElementById('tab-gruppen'),null);
 assert.equal(a.document.querySelectorAll('#seat-plan-pool button').length,5);
 assert.equal(a.document.querySelectorAll('#seating-left button').length,8);
 assert.equal(a.document.querySelectorAll('#seating-right button').length,8);
 const seat=n=>a.document.querySelector('[aria-label^="Platz '+n+':"]');
 const pick=name=>a.document.querySelector('#seat-plan-pool button[aria-label^="'+name+' ·"]');
 const current=()=>copy(a.run('getFirestoreState()')),team=(s,n)=>s.persons.find(p=>p.name===n).tisch;
 pick('A').onclick();seat(1).onclick();
 seat(9).onclick();pick('B').onclick();
 let s=current();assert.equal(s.seatingOrder[0],'A');assert.equal(s.seatingOrder[8],'B');assert.equal(team(s,'A'),'T2');assert.equal(team(s,'B'),'T1');
 assert(pick('A').classList.contains('is-seated'));assert(pick('B').classList.contains('is-seated'));
 seat(1).onclick();seat(9).onclick();s=current();
 assert.equal(s.seatingOrder[0],'B');assert.equal(s.seatingOrder[8],'A');assert.equal(team(s,'B'),'T2');assert.equal(team(s,'A'),'T1');
 assert(await a.c.KCSharedSync.waitForUpload());
 assert.deepEqual(db.root().seatingOrder,s.seatingOrder);assert.equal(team(db.root(),'A'),'T1');assert.equal(team(db.root(),'B'),'T2');
 assert.equal(db.data.get(personPath('A')).tisch,'T1');assert.equal(db.data.get(personPath('B')).tisch,'T2');
 assert.deepEqual(db.data.get('clubs/club/live/seating').seatingOrder,s.seatingOrder);
 pick('A').onclick();a.run(a.document.getElementById('seat-plan-group-t2').getAttribute('onclick'));
 s=current();assert.equal(team(s,'A'),'T2');assert(s.seatingOrder.slice(0,8).includes('A'));assert(!s.seatingOrder.slice(8).includes('A'));
 pick('A').onclick();a.run(a.document.getElementById('seat-plan-clear-one').getAttribute('onclick'));
 s=current();assert(!s.seatingOrder.includes('A'));assert.equal(team(s,'A'),'T2');
 pick('C').onclick();a.run(a.document.getElementById('seat-plan-group-t1').getAttribute('onclick'));assert.equal(team(current(),'C'),'T1');assert(!current().seatingOrder.includes('C'));
 a.c.seatPlanRandomGroups();s=current();assert(s.persons.filter(p=>!p.isDrinksOnly).every(p=>p.tisch));assert.equal(team(s,'Drinker'),'');
 a.c.randomizeSeatingOrder();s=current();assert.equal(s.seatingOrder.filter(Boolean).length,5);assert.equal(new Set(s.seatingOrder.filter(Boolean)).size,5);
 for(const [i,name] of s.seatingOrder.entries())if(name)assert.equal(team(s,name),i<8?'T2':'T1');
 assert(await a.c.KCSharedSync.waitForUpload());
 const b=fullApp(db);await b.select();assert.deepEqual(copy(b.run('seatingOrder')),s.seatingOrder);
 b.c.clearSeatingOrder();assert(copy(b.run('seatingOrder')).every(x=>x===''));assert(await b.c.KCSharedSync.waitForUpload());assert(db.root().seatingOrder.every(x=>x===''));
});
test('balancing odd groups reaches a one-player difference without losing seats or creating duplicates',{timeout:60000},async()=>{
 const db=fixture(),a=fullApp(db);await a.select();
 for(const [i,name] of ['A','B','C','D','E'].entries()){a.c.seatPlanPickPerson(name);a.c.seatPlanPickPlace(i+1);}
 a.c.seatPlanBalance();
 const s=copy(a.run('getFirestoreState()')),team=n=>s.persons.find(p=>p.name===n).tisch;
 assert.equal(s.persons.filter(p=>p.tisch==='T2').length,3);assert.equal(s.persons.filter(p=>p.tisch==='T1').length,2);
 assert.equal(s.seatingOrder.filter(Boolean).length,5);assert.equal(new Set(s.seatingOrder.filter(Boolean)).size,5);
 for(const [i,name] of s.seatingOrder.entries())if(name)assert.equal(team(name),i<8?'T2':'T1');
 assert(await a.c.KCSharedSync.waitForUpload());assert.deepEqual(db.root().seatingOrder,s.seatingOrder);
 // Newly arrived and unassigned players are included by the one-click seat draw.
 a.run("persons.find(p=>p.name==='E').tisch='';seatingOrder=seatingOrder.map(n=>n==='E'?'':n);persistState()");
 a.c.randomizeSeatingOrder();const newState=copy(a.run('getFirestoreState()'));assert.equal(newState.seatingOrder.filter(Boolean).length,5);assert(newState.persons.find(p=>p.name==='E').tisch);
});
test('status bar counters each have their own background and high-contrast icon styles',()=>{
 const css=read('css/evening-counters.css');assert.match(css,/\.kc-counter-app \.kc-counter\{[^}]*background:#f2f7fc/);assert.match(css,/\.kc-counter-app \.kc-counter-gutters svg\{color:#bd3f39/);
});
