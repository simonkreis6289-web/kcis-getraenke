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
 const f=ui(),app=f.c.KCClubContentApp,d=f.document,alert=d.getElementById('club-notes-alert');assert(alert.hidden);
 app.edit('notes');f.flush();select(d.getElementById('club-notes-priority'),'high');d.getElementById('club-notes-priority').dispatchEvent(new f.window.Event('change',{bubbles:true}));
 const input=d.getElementById('club-notes-text');input.value='Monatsbeitrag besprechen';input.selectionStart=input.value.length;input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
 assert(await app.save('notes'));f.flush();const saved=f.store.get('A','notes').items[0];assert.equal(saved.priority,'high');assert(!alert.hidden);assert(alert.textContent.includes('❗ Besprechen · 1'));
 let picker=d.querySelector('[data-note-priority]');select(picker,'low');picker.dispatchEvent(new f.window.Event('change',{bubbles:true}));await tick();f.flush();assert.equal(f.store.get('A','notes').items[0].priority,'low');assert(alert.textContent.includes('📝 Notizen · 1'));assert(!alert.classList.contains('is-important'));
 assert(await app.setPriority(saved.id,'normal'));assert(await app.done(saved.id,true));f.flush();assert(alert.hidden);
 assert(await app.setPriority(saved.id,'high'));f.flush();assert(alert.hidden);assert(await app.done(saved.id,false));f.flush();assert(alert.classList.contains('is-important'));
 assert(await app.remove(saved.id));f.flush();assert(alert.hidden);
 app.edit('notes');f.flush();assert.equal(d.getElementById('club-notes-priority').value,'normal');app.cancel('notes');app.stop();assert(alert.hidden);
});
test('existing legacy note can be promoted without recreating it; offline controls and club boundaries remain safe',async()=>{
 const f=ui(),app=f.c.KCClubContentApp,d=f.document;f.store.put('clubs/A/documents/notes',{items:[note('old')],revision:1});f.flush();assert.equal(d.querySelector('[data-note-priority]').value,'normal');
 assert(await app.setPriority('note_old','high'));f.flush();assert.equal(f.store.get('A','notes').items.length,1);assert(!d.getElementById('club-notes-alert').hidden);
 f.c.navigator.onLine=false;f.window.dispatchEvent(new f.window.Event('offline'));assert(d.querySelector('[data-note-priority]').disabled);assert.equal(await app.setPriority('note_old','low'),false);
 app.stop();f.c.ACTIVE_CLUB='B';app.render();f.flush();assert(d.getElementById('club-notes-alert').hidden);
});
test('dashboard alerts subscribe without opening notes and update live while overlays open and close',()=>{
 const f=ui({dashboard:true}),dash=f.c.KCClubContentDashboard,d=f.document,alert=d.getElementById('club-notes-alert');
 dash.update({},'A');assert(alert.hidden);f.store.put('clubs/A/documents/notes',{items:[note('normal'),note('low','low'),note('done','high',true)],revision:1});assert(alert.hidden);
 f.store.put('clubs/A/documents/notes',{items:[note('high','high')],revision:2});assert(!alert.hidden);assert(alert.textContent.includes('❗ 1'));assert(d.getElementById('club-content-dashboard').hidden);
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
