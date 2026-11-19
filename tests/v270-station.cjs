const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {randomUUID}=require('node:crypto');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const evening='2026-11-12T19:00:00Z',rootPath='clubs/club/state/current',personPath=name=>'clubs/club/livePersons/'+name.toLowerCase();
const helpers=read('tests/v215-shared-sync.cjs'),start=helpers.indexOf("test('two devices increment");
const fixture=helpers.slice(helpers.indexOf('function database('),start)
 +helpers.slice(helpers.indexOf('function fullApp('),helpers.indexOf("test('the complete app boots")).replace('KC_TABLET_MODE:false','KC_TABLET_MODE:true');
const {database,initial,fullApp}=new Function('read','copy','assert','vm','parseHTML','require','evening','rootPath','personPath',fixture+';return {database,initial,fullApp};')(read,copy,assert,vm,parseHTML,require,evening,rootPath,personPath);

test('tablet station commands share the normal drinks ledger, serialize parallel edits, survive retry and stop at the evening boundary',async()=>{
 const seed=initial();seed.RUNDEN_GRUENDE=['Geburtstag'];
 seed.persons[0].tisch='T1';seed.persons[1].tisch='T2';
 const config={uid:'station-phone',generation:'generation-one'};
 const controlPath='clubs/club/stationControl/current';
 const db=database({[rootPath]:seed,[controlPath]:config}),app=fullApp(db);await app.select();
 const submit=(kind,payload,values={})=>{
  const id='station_'+randomUUID();db.data.set('clubs/club/stationCommands/'+id,{...config,kind,payload,evening,status:'queued',createdAt:'server-time',...values});
  return id;
 };
 const receipt=id=>db.data.get('clubs/club/stationCommands/'+id);
 const process=id=>app.c.firestoreApi.processDrinkStationCommand('club',id);
 const drink=submit('drink',{person:'A',drinks:{beer:2}});
 await Promise.all([process(drink),app.c.changeDrink('A','beer',1)]);
 assert.equal(app.run("persons.find(p=>p.name==='A').drinks.beer"),3);
 assert.equal(receipt(drink).status,'queued','tablet must wait for real Firebase confirmation');
 db.lose();assert.equal(await app.c.KCTabletSync.waitForUpload(),false);
 assert(await app.c.KCTabletSync.reconnect());
 assert.equal(receipt(drink).status,'applied');
 assert.equal(receipt(drink).createdAt,'server-time');
 await process(drink);assert(await app.c.KCTabletSync.waitForUpload());
 assert.equal(db.root().persons[0].drinks.beer,3);
 assert.equal(db.data.get(personPath('A')).drinks.beer,3);

 const round=submit('round',{person:'A',reason:'Geburtstag',recipients:['B'],drinks:{beer:2}});
 await process(round);assert(await app.c.KCTabletSync.waitForUpload());
 assert.deepEqual(db.root().persons[0].rounds[0].recipients,['B']);
 assert.equal(db.root().persons[0].roundExtra,4);
 const game=app.c.KCDrinkLedger.games(db.root()).find(x=>x.category==='sides');
 const team=submit('team',{game:game.key,team:'T2',members:['B'],drinks:{beer:1}});
 await process(team);assert(await app.c.KCTabletSync.waitForUpload());
 assert.equal(db.root().persons[1].teamExtra,2);
 assert.equal(db.root().spiele[0].stationBookingId,team);
 const snapshot=copy(app.run('getDrinksSnapshot()'));
 assert.equal(snapshot.persons[0].total,10);
 assert.equal(snapshot.persons[1].total,2);
 for(const target of [drink,round,team]){
  await process(submit('undo',{target}));assert(await app.c.KCTabletSync.waitForUpload());
  assert.equal(receipt(target).status,'reversed');
 }
 assert.equal(db.root().persons[0].drinks.beer,1);
 assert.equal(db.root().persons[0].roundExtra,0);
 assert.equal(db.root().persons[1].teamExtra,0);
 await process(submit('undo',{target:drink}));assert(await app.c.KCTabletSync.waitForUpload());
 assert.equal(db.root().persons[0].drinks.beer,1);
 const revoked=submit('drink',{person:'A',drinks:{beer:2}},{generation:'older'});
 await process(revoked);assert(await app.c.KCTabletSync.waitForUpload());assert.equal(receipt(revoked).status,'rejected');
 await app.c.firestoreApi.closeDrinkStationEvening('club');assert(await app.c.KCTabletSync.waitForUpload());
 const closed=submit('drink',{person:'A',drinks:{beer:2}});
 await process(closed);assert(await app.c.KCTabletSync.waitForUpload());assert.equal(receipt(closed).status,'rejected');
 assert(await app.c.startNewKegelabend());assert(await app.c.KCTabletSync.waitForUpload());
 const delayed=submit('drink',{person:'A',drinks:{beer:2}});
 await process(delayed);assert(await app.c.KCTabletSync.waitForUpload());assert.equal(receipt(delayed).status,'rejected');
 assert.equal(db.root().persons[0].drinks.beer,0);
});

test('rounds without recipients, multi-person drinks and guarded corrections share tablet accounting',async()=>{
 const seed=initial();seed.RUNDEN_GRUENDE=['Geburtstag'];
 seed.persons[0].paid=12;
 const control={uid:'phone',generation:'g'};
 const db=database({[rootPath]:seed,'clubs/club/stationControl/current':control}),app=fullApp(db);
 await app.select();
 const receipts=()=>db.root().stationEvents;
 const toast=app.document.getElementById('toast');
 async function run(kind,payload,status='applied'){
  const id='station_'+randomUUID(),path='clubs/club/stationCommands/'+id;
  db.data.set(path,{...control,kind,payload,evening,status:'queued',createdAt:'server-time'});
  await app.c.firestoreApi.processDrinkStationCommand('club',id);
  assert(await app.c.KCTabletSync.waitForUpload());
  assert.equal(db.data.get(path).status,status);
  return id;
 }
 await run('round',{person:'A',reason:'Geburtstag',drinks:{beer:2}});
 assert.deepEqual(db.root().persons[0].rounds[0].recipients,[]);
 assert.equal(db.root().persons[0].roundExtra,4);
 const group=await run('group',{drinks:{beer:2},recipients:{beer:['A','B']}});
 assert.deepEqual(db.root().persons.map(row=>row.drinks.beer),[1,1]);
 assert.equal(receipts().at(-1).id,group);
 assert.match(toast.textContent,/KC Theke.*2 × Bier/);
 await run('group',{drinks:{beer:2},recipients:{beer:['A','A']}},'rejected');
 assert.deepEqual(db.root().persons.map(row=>row.drinks.beer),[1,1]);
 const edited=await run('adjust',{person:'A',drink:'beer',expected:1,quantity:0});
 assert.equal(db.root().persons[0].paid,12);
 assert.equal(db.root().persons[0].drinks.beer,0);
 await run('adjust',{person:'A',drink:'beer',expected:1,quantity:2},'rejected');
 assert.equal(receipts().at(-1).id,edited);
 assert.equal(db.root().persons[0].drinks.beer,0);
 await run('undo',{target:edited});
 await run('undo',{target:group});
 assert.deepEqual(db.root().persons.map(row=>row.drinks.beer),[0,0]);
 assert.equal(db.root().persons[0].paid,12);
});

test('station PWA has distinct install identity, standalone display, icons and offline route',()=>{
 const manifest=JSON.parse(read('station.webmanifest')),main=JSON.parse(read('manifest.json'));
 assert.equal(manifest.name,'KC Getränkestation');assert.equal(manifest.display,'standalone');
 assert.notEqual(manifest.start_url,main.start_url);assert.notEqual(manifest.id,main.id||main.start_url);
 const html=read('getraenkestation.html'),{document}=parseHTML(html);
 assert.equal(document.querySelector('link[rel="manifest"]').getAttribute('href'),'station.webmanifest');
 assert.equal(document.querySelectorAll('#station-nav button').length,6);
 assert.match(read('sw.js'),/station\?'\.\/getraenkestation\.html':'\.\/'/);
 for(const icon of manifest.icons){
  const png=fs.readFileSync(path.join(__dirname,'..',icon.src));
  const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
});

test('station UI pairs, locks offline, stores one durable ID and confirms only the final Firebase receipt',async()=>{
 const {document}=parseHTML(read('getraenkestation.html'));
 const code='a'.repeat(64),storage=new Map(),events={},callbacks={};
 const subscriptions={pairing:null,control:null,root:null,history:null,command:null};
 let sent=[],confirmation=null;
 const noop=()=>{};
 const client={
  user:async()=>({uid:'device'}),
  requestPairing:async(...args)=>{callbacks.called=args;},
  watchPairing:(club,key,fn)=>{subscriptions.pairing=fn;return noop;},
  watchControl:(club,fn)=>{subscriptions.control=fn;return noop;},
  watchRoot:(club,fn)=>{subscriptions.root=fn;return noop;},
  watchRecent:(club,fn)=>{subscriptions.history=fn;return noop;},
  watchCommand:(club,id,fn)=>{subscriptions.command=fn;return noop;},
  heartbeat:async()=>{},
  submit:async(club,id,entry)=>{sent.push({club,id,entry});return confirmation;},
  readCommand:async()=>confirmation
 };
 const c={document,navigator:{onLine:true},location:{hash:'#club=club&code='+code},URLSearchParams,Intl,
  crypto:require('node:crypto').webcrypto,console,confirm:()=>true,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  addEventListener:(key,callback)=>{events[key]=callback;},setInterval:()=>0,setTimeout:()=>0,clearTimeout:noop,
  validClub:club=>club==='club',validCode:key=>key===code,stationClient:()=>client};
 c.window=c;vm.createContext(c);
 for(const file of ['js/game-overview.js','js/team-drink-games.js','js/drink-ledger.js','js/station-entry.js'])
  vm.runInContext(read(file).replace(/^import .*?;\n/m,''),c,{filename:file});
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 await tick();
 const status=()=>document.getElementById('station-status').textContent;
 assert(!document.getElementById('station-pair-form').hidden);
 document.getElementById('station-pair-form').dispatchEvent(new document.defaultView.Event('submit',{cancelable:true}));
 await tick();
 assert.deepEqual(callbacks.called,['club',code,'Getränkehandy']);
 assert.match(status(),/Kopplung angefragt/);
 subscriptions.pairing({status:'approved'});
 subscriptions.control({uid:'device',generation:'generation'});
 const snapshot=initial();
 subscriptions.root(snapshot);
 assert.match(status(),/Verbunden/);
 assert.equal(document.querySelectorAll('.station-person').length,2);
 document.querySelector('.station-person').onclick();
 document.querySelector('button[aria-label="Bier mehr"]').onclick();
 const book=()=>[...document.querySelectorAll('button')].find(el=>el.textContent==='Buchen');
 c.navigator.onLine=false;events.offline();
 assert.match(status(),/Offline/);assert(book().disabled);
 c.navigator.onLine=true;events.online();
 subscriptions.control({uid:'device',generation:'generation'});subscriptions.root(snapshot);
 assert(!book().disabled);
 const b=book();b.onclick();b.onclick();await tick();
 assert.equal(sent.length,1);
 assert.match(status(),/ausstehend/);assert(document.getElementById('station-feedback').hidden);
 const durable=JSON.parse(storage.get('kc-theke-pending-v1'));
 assert.equal(durable.id,sent[0].id);
 assert.equal(sent[0].entry.payload.drinks.beer,1);
 events.online();await tick();
 assert.equal(sent.at(-1).id,durable.id);
 // Start a fresh page with the persisted device and receipt ID.
 const restarted=parseHTML(read('getraenkestation.html')).document;
 const next={...c,document:restarted,location:{hash:''}};next.window=next;
 vm.createContext(next);
 for(const file of ['js/game-overview.js','js/team-drink-games.js','js/drink-ledger.js','js/station-entry.js'])
  vm.runInContext(read(file).replace(/^import .*?;\n/m,''),next,{filename:file});
 await tick();subscriptions.control({uid:'device',generation:'generation'});subscriptions.root(snapshot);
 assert.equal(sent.at(-1).id,durable.id);
 assert.match(restarted.getElementById('station-status').textContent,/ausstehend/);
 confirmation={status:'applied',result:{description:'A · 1 × Bier'}};
 subscriptions.command(confirmation);
 assert.equal(storage.has('kc-theke-pending-v1'),false);
 assert.match(restarted.getElementById('station-feedback').textContent,/1 × Bier/);
 const findButton=text=>[...restarted.querySelectorAll('button')].find(el=>el.textContent===text);
 const newRoot=initial();newRoot.persons[0].paid=12;newRoot.persons[0].drinks.beer=2;
 newRoot.RUNDEN_GRUENDE=['Geburtstag'];subscriptions.root(newRoot);
 restarted.querySelector('[data-view="round"]').onclick();
 restarted.querySelector('.station-person').onclick();
 assert(!restarted.getElementById('station-content').textContent.includes('Empfänger'));
 assert(restarted.querySelector('button[aria-label="Bier mehr"]'));
 restarted.querySelector('[data-view="account"]').onclick();
 const selector=restarted.querySelector('#station-content select');
 selector.querySelector('option[value="A"]').selected=true;selector.onchange();
 assert.match(restarted.getElementById('station-content').textContent,/Bezahlt laut Haupt-App/);
 assert.equal(restarted.querySelector('button[aria-label="Bier weniger"]'),null);
 findButton('Getränke bearbeiten').onclick();
 assert(restarted.querySelector('button[aria-label="Bier weniger"]'));
 findButton('Bearbeitung sperren').onclick();
 assert.equal(restarted.querySelector('button[aria-label="Bier weniger"]'),null);
 newRoot.persons.push(...['C','D','E','F','G','H'].map(name=>({name,present:true})));
 subscriptions.root(newRoot);
 restarted.querySelector('[data-view="group"]').onclick();
 for(let i=0;i<6;i++)restarted.querySelector('button[aria-label="Bier mehr"]').onclick();
 const groupBook=()=>findButton('Buchen');
 for(let i=0;i<6;i++){
  assert(groupBook().disabled);
  restarted.querySelectorAll('.station-allocation .station-person')[i].onclick();
 }
 assert(!groupBook().disabled);
 confirmation=null;
 groupBook().onclick();await tick();
 assert.equal(sent.at(-1).entry.kind,'group');
 assert.deepEqual(copy(sent.at(-1).entry.payload),{drinks:{beer:6},recipients:{beer:['A','B','C','D','E','F']}});
 const kept=JSON.parse(storage.get('kc-theke-pending-v1'));
 const retry=()=>findButton('Status prüfen / erneut senden');
 client.submit=async()=>{throw Object.assign(Error('permission-denied'),{code:'permission-denied'});};
 retry().onclick();await tick();
 assert.match(restarted.getElementById('station-pending').textContent,/V272-Firestore-Regeln/);
 assert.equal(JSON.parse(storage.get('kc-theke-pending-v1')).id,kept.id);
 assert(!findButton('Nicht gebuchten Auftrag verwerfen'));

 let timeout;
 next.setTimeout=(fn,ms)=>{if(ms===8000)timeout=fn;return 1;};
 client.submit=()=>new Promise(()=>{});
 retry().onclick();
 assert(retry().disabled);
 timeout();await tick();
 assert(!retry().disabled);
 assert.equal(JSON.parse(storage.get('kc-theke-pending-v1')).id,kept.id);

 subscriptions.control(null);
 assert(restarted.getElementById('station-workspace').hidden);
 assert(!restarted.getElementById('station-pending').hidden);
 assert(!retry().disabled);
 client.submit=async(club,id)=>{assert.equal(id,kept.id);return {status:'applied',result:{description:'6 × Bier'}};};
 retry().onclick();await tick();
 assert(restarted.getElementById('station-pending').hidden);
 assert(!storage.has('kc-theke-pending-v1'));


});
