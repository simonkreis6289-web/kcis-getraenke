const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const firestore=require('firebase/firestore');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

function tabletApi(db){
 const context={...firestore,initializeApp:()=>({}),getFirestore:()=>db,setTimeout,clearTimeout,console};
 context.window=context;
 for(const name of ['js/shared-sync-core.js','js/shared-sync-transport.js','js/firebase.js']){
  const script=read(name).replace(/^import[\s\S]*?from .*?;\s*/gm,'');
  new Function('sdk','with(sdk){'+script+'\n}')(context);
 }
 return context.firestoreApi;
}

test('the real tablet SDK commits saved V269/V270 batches with active station protection', {skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-kcis-station',firestore:{rules:read('firestore.rules')}});
 try{
  const operator=env.authenticatedContext('operator',{kcOperator:true}).firestore();
  const ref=(db,...pieces)=>firestore.doc(db,'clubs','regression271',...pieces);
  const person=i=>({name:'Gast '+i,present:true,drinks:{beer:0}});
  const root={syncProtocol:1,syncRevision:1805,tabletSequence:5700,syncInitialized:true,currentEveningStartedAt:'2026-11-19T18:00:00Z',
   persons:Array.from({length:14},(_,i)=>person(i)),DRINKS:[{key:'beer',label:'Bier'}],prices:{beer:2}};
  const stationId='station_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const timestamp=firestore.Timestamp.fromMillis(1795111800000);
  const entry={uid:'station',generation:'valid',kind:'drink',payload:{person:'Gast 0',drinks:{beer:1}},status:'queued',createdAt:timestamp,evening:root.currentEveningStartedAt};
  await env.withSecurityRulesDisabled(async c=>{
   const db=c.firestore(),batch=firestore.writeBatch(db);
   batch.set(ref(db,'state','current'),root);
   batch.set(ref(db,'stationControl','current'),{uid:'station',generation:'valid'});
   batch.set(ref(db,'stationCommands',stationId),entry);
   batch.set(ref(db,'archive','older'),{category:'strafen',createdAt:timestamp});
   await batch.commit();
  });
  const target=ref(operator,'state','current');
  const context=opId=>({method:'commitTabletBatch',opId,eveningStartedAt:root.currentEveningStartedAt,base:{},sideOperations:[],metaBase:{}});
  const api=tabletApi(operator);
  const v269={sequence:5701,baseSequence:5700,state:{...root,persons:root.persons.map(p=>({...p,drinks:{beer:1}}))},
   documents:[{path:'clubs/regression271/archive/older',deleted:true}]};
  const denied=context('sync_saved_5701');
  await assert.rejects(
   tabletApi(env.unauthenticatedContext().firestore()).commitTabletBatch('regression271',v269,denied),
   {code:'permission-denied'}
  );
  assert.equal(denied.permissionDiagnostic.phase,'commit');
  assert(denied.permissionDiagnostic.operations.some(op=>op.path===target.path&&op.operation==='set'));
  assert.equal((await firestore.getDocFromServer(target)).data().tabletSequence,5700);
  const concurrentId='station_bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
  const station=env.authenticatedContext('station').firestore();
  const [confirmed]=await Promise.all([
   api.commitTabletBatch('regression271',v269,context('sync_saved_5701')),
   firestore.setDoc(ref(station,'stationCommands',concurrentId),{...entry,createdAt:firestore.serverTimestamp()})
  ]);
  assert.deepEqual({...confirmed},{sequence:5701});
  assert.equal((await firestore.getDocFromServer(ref(operator,'stationCommands',concurrentId))).data().status,'queued');
  const dto=JSON.parse(JSON.stringify(entry));
  const v270={sequence:5709,baseSequence:5701,state:{...v269.state,persons:v269.state.persons.map((p,i)=>i===0?{...p,drinks:{beer:2}}:p)},
   documents:[{path:'clubs/regression271/stationCommands/'+stationId,value:{...dto,status:'applied',result:{description:'1 × Bier'}}}]};
  const receipt=()=>firestore.getDocFromServer(ref(operator,'stationCommands',stationId));
  assert.deepEqual({...await api.commitTabletBatch('regression271',v270,context('sync_saved_5709'))},{sequence:5709});
  assert.deepEqual({...await api.commitTabletBatch('regression271',v270,context('sync_saved_5709'))},{sequence:5709});
  assert((await receipt()).data().createdAt.isEqual(timestamp));
  const saved=(await firestore.getDocFromServer(target)).data();
  assert.equal(saved.syncRevision,1807);assert.equal(saved.tabletSequence,5709);assert.equal(saved.persons[0].drinks.beer,2);
  assert.equal((await receipt()).data().status,'applied');
  assert.equal((await firestore.getDocFromServer(ref(operator,'archive','older'))).exists(),false);
  await assert.rejects(api.commitTabletBatch('regression271',v269,context('sync_saved_stale')),{code:'sync-conflict'});
  assert.equal((await firestore.getDocFromServer(target)).data().persons[0].drinks.beer,2);

  const reverse={sequence:5710,baseSequence:5709,state:{...saved,persons:saved.persons.map((p,i)=>
   i===0?{...p,drinks:{beer:1}}:p
  )},documents:[{path:'clubs/regression271/stationCommands/'+stationId,value:{status:'reversed'}}]};
  await api.commitTabletBatch('regression271',reverse,context('sync_saved_reverse'));
  const reversed=(await receipt()).data();
  assert.equal(reversed.status,'reversed');
  assert(reversed.createdAt.isEqual(timestamp));
  assert.deepEqual(reversed.result,{description:'1 × Bier'});
  assert.equal((await firestore.getDocFromServer(target)).data().syncRevision,1808);
 }finally{await env.cleanup();}
});
