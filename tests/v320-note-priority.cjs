const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{parseHTML}=require('linkedom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const model=new Function('window',read('js/club-content.js')+';return window.KCClubContent;')({});let sequence=0;
const req=(fields,revision=0)=>({...fields,opId:'content_v320_'+(++sequence),expectedRevision:revision});
const old=read('tests/v205-regression.cjs'),a=old.indexOf('function server(){'),b=old.indexOf("test('actual app",a),baseUi=new Function('read','assert','vm','parseHTML','require','copy','model','req','test',old.slice(a,b)+';return ui;')(read,assert,vm,parseHTML,require,copy,model,req,()=>{});
const note=(id,priority,done=false)=>({id:'note_'+id,text:'Thema '+id,createdAt:'2026-11-24T14:00:00Z',...(priority?{priority}:{}),done});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function ui(options){
 const f=baseUi(options),proto=f.window.HTMLSelectElement.prototype,descriptor=Object.getOwnPropertyDescriptor(proto,'value');
 // linkedom exposes only a getter; browsers also support assigning select.value.
 Object.defineProperty(proto,'value',{...descriptor,set(value){for(const option of this.querySelectorAll('option'))option.removeAttribute('selected');this.querySelector('option[value="'+value+'"]')?.setAttribute('selected','');}});
 return f;
}
function select(el,value){el.value=value;}
test('legacy notes default to normal; priority changes preserve text, date and completion and reject stale writes',()=>{
 const legacy=note('legacy'),before={items:[legacy],revision:3};assert.equal(model.priority(legacy),'normal');
 const request=req({action:'priority',id:legacy.id,priority:'high'},3),saved=model.change('notes',before,request);
 assert.equal(saved.items[0].priority,'high');assert.equal(saved.items[0].text,legacy.text);assert.equal(saved.items[0].createdAt,legacy.createdAt);assert.equal(saved.items[0].done,false);assert.equal(legacy.priority,undefined);
 assert.equal(model.change('notes',saved,request),saved);assert.throws(()=>model.change('notes',saved,req({action:'priority',id:legacy.id,priority:'low'},3)),/Inzwischen/);
 for(const priority of ['urgent','',null])assert.throws(()=>model.change('notes',before,req({action:'priority',id:legacy.id,priority},3)),/Priorität/);
 assert.throws(()=>model.change('notes',before,req({action:'priority',id:'note_missing',priority:'high'},3)),/gefunden/);
});
test('real app creates with chosen priority and updates existing notes and header through Firestore',async()=>{
 const f=ui(),app=f.c.KCClubContentApp,d=f.document,alert=d.getElementById('club-notes-alert');assert(!alert.hidden);assert.equal(alert.dataset.priority,'clear');
 app.edit('notes');f.flush();select(d.getElementById('club-notes-priority'),'high');d.getElementById('club-notes-priority').dispatchEvent(new f.window.Event('change',{bubbles:true}));
 const input=d.getElementById('club-notes-text');input.value='Monatsbeitrag besprechen';input.selectionStart=input.value.length;input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
 assert(await app.save('notes'));f.flush();const saved=f.store.get('A','notes').items[0];assert.equal(saved.priority,'high');assert(!alert.hidden);assert.equal(alert.textContent,'!');assert.equal(alert.dataset.priority,'high');
 let picker=d.querySelector('[data-note-priority]');select(picker,'low');picker.dispatchEvent(new f.window.Event('change',{bubbles:true}));await tick();f.flush();assert.equal(f.store.get('A','notes').items[0].priority,'low');assert.equal(alert.textContent,'i');assert.equal(alert.dataset.priority,'low');assert(!alert.classList.contains('is-important'));
 assert(await app.setPriority(saved.id,'normal'));assert(await app.done(saved.id,true));f.flush();assert(!alert.hidden);assert.equal(alert.dataset.priority,'clear');
 assert(await app.setPriority(saved.id,'high'));f.flush();assert(!alert.hidden);assert.equal(alert.dataset.priority,'clear');assert(await app.done(saved.id,false));f.flush();assert(alert.classList.contains('is-important'));
 assert(await app.remove(saved.id));f.flush();assert(!alert.hidden);assert.equal(alert.dataset.priority,'clear');
 app.edit('notes');f.flush();assert.equal(d.getElementById('club-notes-priority').value,'normal');app.cancel('notes');app.stop();assert(!alert.hidden);assert.equal(alert.dataset.priority,'clear');
});
test('existing legacy note can be promoted without recreating it; offline controls and club boundaries remain safe',async()=>{
 const f=ui(),app=f.c.KCClubContentApp,d=f.document;f.store.put('clubs/A/documents/notes',{items:[note('old')],revision:1});f.flush();assert.equal(d.querySelector('[data-note-priority]').value,'normal');
 assert(await app.setPriority('note_old','high'));f.flush();assert.equal(f.store.get('A','notes').items.length,1);assert(!d.getElementById('club-notes-alert').hidden);
 f.c.navigator.onLine=false;f.window.dispatchEvent(new f.window.Event('offline'));assert(d.querySelector('[data-note-priority]').disabled);assert.equal(await app.setPriority('note_old','low'),false);
 app.stop();f.c.ACTIVE_CLUB='B';app.render();f.flush();assert.equal(d.getElementById('club-notes-alert').dataset.priority,'clear');
});
test('dashboard alerts subscribe without opening notes and update live while overlays open and close',()=>{
 const f=ui({dashboard:true}),dash=f.c.KCClubContentDashboard,d=f.document,alert=d.getElementById('club-notes-alert');
 dash.update({},'A');assert(alert.hidden);f.store.put('clubs/A/documents/notes',{items:[note('normal'),note('low','low'),note('done','high',true)],revision:1});assert(alert.hidden);
 f.store.put('clubs/A/documents/notes',{items:[note('high','high')],revision:2});assert(!alert.hidden);assert.equal(alert.textContent,'!');assert(d.getElementById('club-content-dashboard').hidden);
 dash.update({dashboardClubContent:{kind:'statutes',open:true,session:'content_test',turn:0}},'A');f.flush();dash.update({},'A');f.flush();assert(!alert.hidden);
 f.store.put('clubs/A/documents/notes',{items:[note('high','low')],revision:3});assert(alert.hidden);
 f.store.put('clubs/A/documents/notes',{items:[note('high','high')],revision:4});assert(!alert.hidden);
 dash.update({},'B');assert(alert.hidden);f.store.put('clubs/A/documents/notes',{items:[note('another','high')],revision:5});assert(alert.hidden);dash.reset();assert(alert.hidden);
});
test('direct tablet alerts survive older cloud snapshots and clear on confirmed completion and deletion',()=>{
 const f=ui({dashboard:true}),dash=f.c.KCClubContentDashboard,alert=f.document.getElementById('club-notes-alert');
 const initial={items:[note('topic','normal')],revision:1};f.store.put('clubs/A/documents/notes',initial);dash.update({},'A');assert(alert.hidden);
 const pending={items:[note('topic','high')],revision:2};dash.update({directClubDocuments:{notes:pending}},'A');assert(!alert.hidden);dash.update({},'A');assert(!alert.hidden);f.store.put('clubs/A/documents/notes',initial);assert(!alert.hidden);
 f.store.put('clubs/A/documents/notes',pending);assert(!alert.hidden);
 dash.update({directClubDocuments:{notes:{items:[note('topic','high',true)],revision:3}}},'A');assert(alert.hidden);f.store.put('clubs/A/documents/notes',pending);assert(alert.hidden);
 f.store.put('clubs/A/documents/notes',{items:[],revision:4});assert(alert.hidden);dash.reset();
});

test('compact app symbol sits before the crest and follows the highest open priority',()=>{
 const f=ui(),d=f.document,alert=d.getElementById('club-notes-alert');
 assert.equal(alert.nextElementSibling.id,'app-club-crest');assert.equal(alert.textContent,'✓');assert.equal(alert.dataset.priority,'clear');
 const rows=[note('low','low'),note('normal','normal'),note('high','high')];
 for(const [items,level,symbol] of [[rows,'high','!'],[rows.slice(0,2),'normal','!'],[rows.slice(0,1),'low','i'],[rows.map(n=>({...n,done:true})),'clear','✓']]){
  model.noteAlert(alert,items);assert(!alert.hidden);assert.equal(alert.dataset.priority,level);assert.equal(alert.textContent,symbol);assert(alert.getAttribute('aria-label'));
 }
});

test('checking notes preserves every item and sorts completed notes newest completion first, including after restoring',()=>{
 const first=note('old','high'),second={...note('new','normal'),createdAt:'2026-11-24T15:00:00Z'},open={...note('open','low'),createdAt:'2026-11-24T16:00:00Z'};
 let state={items:[first,second,open],revision:0};
 const done=(id,checked,at)=>{state=model.change('notes',state,req({action:'done',id,done:checked},state.revision),at);};
 done(second.id,true,'2026-11-24T17:00:00Z');done(first.id,true,'2026-11-24T18:00:00Z');
 assert.deepEqual(copy(state.items).map(n=>n.id),[open.id,first.id,second.id]);assert.equal(state.items.length,3);assert.equal(state.items[1].text,first.text);assert.equal(state.items[1].createdAt,first.createdAt);assert(model.noteMarkup(state.items[1],first.text).includes('is-done'));
 const pages=model.notePages(state.items,()=>true);assert.deepEqual(copy(pages[0]).map(f=>f.note.id),[open.id,first.id,second.id]);
 done(second.id,false,'2026-11-24T19:00:00Z');assert.deepEqual(copy(state.items).map(n=>n.id),[second.id,open.id,first.id]);assert.equal(state.items[0].completedAt,'');
 const command=req({action:'done',id:second.id,done:true},state.revision);state=model.change('notes',state,command,'2026-11-24T20:00:00Z');assert.deepEqual(copy(state.items).map(n=>n.id),[open.id,second.id,first.id]);assert.equal(model.change('notes',state,command,'2026-11-25T20:00:00Z'),state);
 done(second.id,true,'2026-11-25T21:00:00Z');assert.equal(state.items[1].completedAt,'2026-11-24T20:00:00Z');
 const legacy=[{...first,done:true},{...second,done:true},open];assert.deepEqual(copy(model.sort(legacy)).map(n=>n.id),[open.id,second.id,first.id]);assert.equal(legacy.length,3);
});

test('open notes follow priority before creation date while completed notes follow completion date only',()=>{
 const low={...note('low','low'),createdAt:'2026-11-01T10:00:00Z'},normal=note('normal','normal'),high={...note('high','high'),createdAt:'2026-11-24T18:00:00Z'},olderHigh={...note('olderhigh','high'),createdAt:'2026-11-24T17:00:00Z'};
 const doneHigh={...note('donehigh','high',true),completedAt:'2026-11-24T18:00:00Z'},doneLow={...note('donelow','low',true),completedAt:'2026-11-24T19:00:00Z'},legacy=note('legacy');
 const items=[doneHigh,low,high,normal,doneLow,olderHigh,legacy],before=copy(items),expected=[olderHigh.id,high.id,legacy.id,normal.id,low.id,doneLow.id,doneHigh.id];
 assert.deepEqual(copy(model.sort(items)).map(n=>n.id),expected);assert.deepEqual(copy(items),before);
 assert.deepEqual(copy(model.notePages(items,()=>true)[0]).map(f=>f.note.id),expected);
 let state={items,revision:0};state=model.change('notes',state,req({action:'priority',id:low.id,priority:'high'}));assert.equal(state.items[0].id,low.id);
 state=model.change('notes',state,req({action:'done',id:low.id,done:true},state.revision),'2026-11-24T20:00:00Z');assert.equal(state.items.find(n=>n.done).id,low.id);
});
