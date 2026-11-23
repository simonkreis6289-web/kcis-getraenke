const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const sdk=require('firebase/firestore');

test('the deployed signaling API negotiates and probes with fractional server time under the actual rules',
 {skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-kcis-station',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const db=env.unauthenticatedContext().firestore(),now=Date.now()+.375;
  const target=sdk.doc(db,'clubs','signal-club','documents','dashboard_link_tv');
  const raw={kind:'dashboardLink',viewerId:'tv',connectionId:'first',offer:{type:'offer',sdp:'v=0 offer'},answer:null,expiresAt:now+120000};
  // Reproduce the reported rejection without weakening the rules.
  await assertFails(sdk.setDoc(target,raw));
  await env.withSecurityRulesDisabled(async context=>{
   await sdk.setDoc(sdk.doc(context.firestore(),'clubs','signal-club','stationControl','current'),{uid:'theke'});
   await sdk.setDoc(sdk.doc(context.firestore(),'clubs','signal-club','state','current'),{syncProtocol:1,syncRevision:4,persons:[{name:'Simon'}]});
  });
  const source=fs.readFileSync('js/firebase.js','utf8').replace(/^import[\s\S]*?from .*?;\s*/gm,'');
  const api=new Function('window','sdk',
   'const {initializeApp,getFirestore,doc,setDoc,getDoc,getDocFromServer,deleteDoc,onSnapshot,serverTimestamp,collection,getDocs,runTransaction}=sdk;\n'+source+'\nreturn window.firestoreApi;')(
    {KCSharedClock:{configure(){},now:()=>now}}, {...sdk,initializeApp:()=>({}),getFirestore:()=>db});
  const signal=(action,connectionId)=>api.sendDashboardSignal('signal-club',{
   action,viewerId:'tv',connectionId,source:'tablet',description:{type:action,sdp:'v=0 '+action}});
  assert.equal(await assertSucceeds(signal('offer','first')),true);
  assert(Number.isSafeInteger((await sdk.getDocFromServer(target)).data().expiresAt));
  assert.equal(await assertSucceeds(signal('offer','second')),true);
  assert.equal(await signal('answer','first'),false,'a stale answer cannot replace a fresh offer');
  assert.equal(await assertSucceeds(signal('answer','second')),true);
  const saved=(await sdk.getDocFromServer(target)).data();
  assert.equal(saved.connectionId,'second');assert.equal(saved.answer.type,'answer');
  for(const kind of ['presence','ping','pong']){
   assert.equal(await assertSucceeds(api.sendDashboardDiagnostic('signal-club',{kind,id:'probe',webrtc:true})),true);
   const row=(await sdk.getDocFromServer(sdk.doc(db,'clubs','signal-club','documents','dashboard_diagnostic_'+(kind==='presence'?'presence':'probe')))).data();
   assert.equal(row.kind,kind);assert(Number.isSafeInteger(row.expiresAt));
  }
  assert.deepEqual((await sdk.getDocFromServer(sdk.doc(db,'clubs','signal-club','state','current'))).data(),
   {syncProtocol:1,syncRevision:4,persons:[{name:'Simon'}]});
 }finally{await env.cleanup();}
});
