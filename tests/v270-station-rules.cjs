const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDocFromServer,setDoc,serverTimestamp,Timestamp,writeBatch,runTransaction}=require('firebase/firestore');

test('Firestore enforces pairing, a single authorized device, protected totals, receipt transitions and the evening boundary',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-kcis-station',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const operator=env.authenticatedContext('operator',{kcOperator:true}).firestore();
  const first=env.authenticatedContext('first').firestore(),second=env.authenticatedContext('second').firestore(),stranger=env.unauthenticatedContext().firestore();
  const ref=(db,...pieces)=>doc(db,'clubs','club',...pieces);
  const evening='2026-11-19T18:00:00Z',code='a'.repeat(64),key='b'.repeat(64),code2='c'.repeat(64),key2='d'.repeat(64);
  const pair=(db,value)=>ref(db,'stationPairings',value);
  const control=db=>ref(db,'stationControl','current');
  const state=db=>ref(db,'state','current');
  const booking=(db,id)=>ref(db,'stationCommands',id||'station_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  const draft=(uid,generation,e=evening)=>({uid,generation,evening:e,kind:'drink',payload:{person:'Alex',drinks:{beer:1}},status:'queued',createdAt:serverTimestamp()});
  const challenge=(at=240000)=>({status:'open',uid:'',label:'',expiresAt:Timestamp.fromMillis(Date.now()+at)});
  const grant=(uid,generation,label,pairingCode)=>({uid,generation,label,pairingCode,pairedAt:serverTimestamp()});
  const sync=(db,revision,extra={})=>{
   const operation='sync_'+revision,batch=writeBatch(db),fields={syncProtocol:1,syncRevision:revision,syncOperation:operation,updatedAt:serverTimestamp()};
   batch.set(state(db),{...fields,...extra},{merge:true});
   batch.set(ref(db,'syncCommands',operation),{commandId:operation,createdAt:serverTimestamp()});
   return {batch,fields};
  };
  await env.withSecurityRulesDisabled(async context=>{
   await setDoc(state(context.firestore()),{syncProtocol:1,syncRevision:1,currentEveningStartedAt:evening,persons:[{name:'Alex',present:true,drinks:{beer:0}}]});
  });
  await assertSucceeds(sync(stranger,2).batch.commit());
  await assertFails(setDoc(booking(first),draft('first',key)));
  await assertFails(setDoc(pair(first,code),challenge()));
  await assertFails(setDoc(pair(operator,code),challenge(-2500)));
  await assertSucceeds(setDoc(pair(operator,code),challenge()));
  await assertFails(setDoc(control(operator),grant('first',key,'Theke',code)));
  await assertSucceeds(runTransaction(first,async tx=>{
   await tx.get(pair(first,code));tx.update(pair(first,code),{status:'requested',uid:'first',label:'Theke'});
  }));
  await assertFails(getDocFromServer(pair(second,code)));
  await assertFails(setDoc(pair(first,code),{status:'approved'},{merge:true}));
  const approval=writeBatch(operator);
  approval.set(control(operator),grant('first',key,'Theke',code));
  approval.update(pair(operator,code),{status:'approved'});
  await assertSucceeds(approval.commit());
  await assertSucceeds(getDocFromServer(control(first)));
  await assertFails(getDocFromServer(control(second)));
  await assertFails(sync(stranger,3,{persons:[]}).batch.commit());
  await assertFails(sync(first,3,{persons:[]}).batch.commit());
  await assertSucceeds(getDocFromServer(state(stranger)));
  await assertSucceeds(setDoc(ref(stranger,'documents','dashboard_diagnostic_presence'),{
   kind:'presence',id:'tv',webrtc:true,expiresAt:Date.now()+60000}));
  await assertFails(setDoc(ref(first,'documents','dashboard_diagnostic_presence'),{
   kind:'presence',id:'tv',webrtc:true,expiresAt:Date.now()+60000,persons:[]}));
  await assertFails(setDoc(booking(first),draft('first','wrong')));
  await assertFails(setDoc(booking(first),{...draft('first',key),payload:{drinks:{beer:1},person:'Alex',extra:true}}));
  await assertFails(setDoc(booking(first),draft('first',key,'earlier')));
  await assertSucceeds(runTransaction(first,async tx=>{
   const saved=await tx.get(booking(first));assert(!saved.exists());tx.set(booking(first),draft('first',key));
  }));
  await assertFails(getDocFromServer(booking(second)));
  await assertFails(setDoc(booking(first),{status:'applied'},{merge:true}));
  await assertFails(setDoc(booking(first),draft('first',key)));
  const applied=sync(operator,3,{persons:[{name:'Alex',present:true,drinks:{beer:1}}]});
  applied.batch.update(booking(operator),{...applied.fields,status:'applied',result:{description:'Bier'}});
  await assertSucceeds(applied.batch.commit());
  assert.equal((await getDocFromServer(booking(first))).data().status,'applied');
  const undone=sync(operator,4,{persons:[{name:'Alex',present:true,drinks:{beer:0}}]});
  undone.batch.update(booking(operator),{...undone.fields,status:'reversed'});
  await assertSucceeds(undone.batch.commit());
  const repeated=sync(operator,5);
  repeated.batch.update(booking(operator),{...repeated.fields,status:'reversed'});
  await assertFails(repeated.batch.commit());
  const newKinds=[
   ['round',{person:'Alex',reason:'Geburtstag',drinks:{beer:1}}],
   ['group',{drinks:{beer:1},recipients:{beer:['Alex']}}],
   ['adjust',{person:'Alex',drink:'beer',expected:1,quantity:0}]
  ];
  for(const [index,[kind,payload]] of newKinds.entries()){
   const id='station_0000000'+index+'-bbbb-cccc-dddd-eeeeeeeeeeee';
   const entry={...draft('first',key),kind,payload};
   await assertFails(setDoc(booking(second,id),{...entry,uid:'second'}));
   await assertFails(setDoc(booking(first,id),{...entry,payload:{...payload,paid:500}}));
   await assertSucceeds(setDoc(booking(first,id),entry));
   await assertFails(setDoc(booking(first,id),{status:'applied'},{merge:true}));
  }
  const adjustID='station_aaaaaaaa-0000-0000-0000-dddddddddddd';
  await assertFails(setDoc(booking(first,adjustID),{...draft('first',key),kind:'adjust',payload:{person:'Alex',drink:'beer',expected:5,quantity:0}}));
  await assertSucceeds(sync(operator,5,{stationClosedEvening:evening}).batch.commit());
  const nextID='station_bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
  await assertFails(setDoc(booking(first,nextID),draft('first',key)));
  const tomorrow='2026-12-01T18:00:00Z';
  await assertSucceeds(sync(operator,6,{currentEveningStartedAt:tomorrow}).batch.commit());
  await assertSucceeds(setDoc(pair(operator,code2),challenge()));
  await assertSucceeds(setDoc(pair(second,code2),{status:'requested',uid:'second',label:'Zweite Theke'},{merge:true}));
  const replace=writeBatch(operator);
  replace.set(control(operator),grant('second',key2,'Zweite Theke',code2));
  replace.update(pair(operator,code2),{status:'approved'});
  await assertSucceeds(replace.commit());
  await assertFails(setDoc(booking(first,nextID),draft('first',key,tomorrow)));
  await assertSucceeds(setDoc(booking(second,nextID),draft('second',key2,tomorrow)));
  await assertSucceeds(setDoc(control(operator),grant('','e'.repeat(64),'','')));
  await assertFails(sync(stranger,7).batch.commit());
  for(const [kind,payload] of newKinds)
   await assertFails(setDoc(booking(second,'station_cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee'),{...draft('second',key2,tomorrow),kind,payload}));
 }finally{await env.cleanup();}
});
