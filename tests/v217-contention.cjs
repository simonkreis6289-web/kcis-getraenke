const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const old=fs.readFileSync(path.join(__dirname,'v215-shared-sync.cjs'),'utf8'),prefix=old.slice(0,old.indexOf("test('two devices"));
const {prepared,context,copy,rootPath}=new Function('require','__dirname',prefix+';return {prepared,context,copy,rootPath};')(require,__dirname);
const person='clubs/club/livePersons/a',coded=code=>Object.assign(Error('simulated '+code),{code});
function increment(db){return async tx=>{const snap=await tx.get(person),p=snap.data(),value=p.drinks.beer+1;tx.set(person,{name:'A',drinks:{...p.drinks,beer:value}},{merge:true});return value;};}
function transport(f,run,delay=async()=>{}){return f.a.KCSharedTransport.create({...f.db.sdk,runTransaction:run,db:{},core:f.core,policy:f.a.KCGameFinePolicy,delay});}
test('a permission failure accompanied by a newer root retries the same operation against fresh counters',async()=>{
 const f=await prepared(),native=f.db.sdk.runTransaction,ctx=context(f.db,'changeLivePersonCounter');let calls=0,waits=0;
 const run=async(d,fn,options)=>{assert.equal(options.maxAttempts,10);calls++;return native(d,async tx=>{const value=await fn(tx);if(calls===1){await f.b.firestoreApi.changeLivePersonCounter('club','A','drinks','beer',1,context(f.db,'changeLivePersonCounter'));throw coded('permission-denied');}return value;});};
 const value=await transport(f,run,async()=>waits++).transaction('club',ctx,increment(f.db));assert.equal(value,2);assert.equal(f.db.root().persons[0].drinks.beer,2);assert.equal(calls,2);assert.equal(waits,1);assert.equal([...f.db.data.keys()].filter(k=>k.endsWith('/'+ctx.opId)).length,1);
});
test('a genuine permission denial with an unchanged root is returned once without weakening rules',async()=>{
 const f=await prepared(),native=f.db.sdk.runTransaction;let calls=0;const run=(d,fn)=>{calls++;return native(d,async tx=>{await fn(tx);throw coded('permission-denied');});};
 await assert.rejects(transport(f,run).transaction('club',context(f.db,'changeLivePersonCounter'),increment(f.db)),e=>e.code==='permission-denied');assert.equal(calls,1);assert.equal(f.db.root().persons[0].drinks.beer,0);
});
test('exhausted SDK contention attempts are retried only a bounded number of times',async()=>{
 const f=await prepared();let calls=0;const run=async()=>{calls++;throw coded('aborted');};await assert.rejects(transport(f,run).transaction('club',context(f.db,'changeLivePersonCounter'),increment(f.db)),e=>e.code==='aborted');assert.equal(calls,4);assert.equal(f.db.root().persons[0].drinks.beer,0);
});
test('an unavailable acknowledgement is recovered from the committed receipt without a second booking',async()=>{
 const f=await prepared(),native=f.db.sdk.runTransaction;let calls=0;const run=async(d,fn,opts)=>{calls++;const out=await native(d,fn,opts);throw coded('unavailable');};const value=await transport(f,run).transaction('club',context(f.db,'changeLivePersonCounter'),increment(f.db));assert.equal(value,1);assert.equal(calls,1);assert.equal(f.db.root().persons[0].drinks.beer,1);
});
test('a retry never bypasses the stale-game check or commits partial penalties',async()=>{
 const f=await prepared(),base=f.db.root(),desired=copy(base);desired.dartsState.throws.push({id:'own'});desired.persons[0].strafen.gosse=1;const ops=f.core.diff(base,desired,{includeLive:true}),native=f.db.sdk.runTransaction;let calls=0;
 const run=(d,fn)=>{calls++;return native(d,async tx=>{const value=await fn(tx);if(calls===1){const other=copy(base);other.dartsState.throws.push({id:'other'});await f.b.firestoreApi.commitSharedChanges('club',{operations:f.core.diff(base,other)},context(f.db,'commitSharedChanges',base));throw coded('aborted');}return value;});};
 await assert.rejects(transport(f,run).changes('club',{operations:ops,legacy:true},context(f.db,'commitSharedChanges',base)),e=>e.code==='sync-conflict');assert.equal(f.db.root().dartsState.throws[0].id,'other');assert.equal(f.db.root().persons[0].strafen.gosse,0);
});
