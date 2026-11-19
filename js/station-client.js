import {getApp, initializeApp} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import {getAuth, onIdTokenChanged, signInAnonymously, signInWithEmailAndPassword,
 signOut} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {collection, doc, getDocFromServer, getFirestore, limit, onSnapshot, orderBy, query,
 runTransaction, serverTimestamp, setDoc, Timestamp, where} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

export const validClub=club=>/^[a-zA-Z0-9_-]{1,120}$/.test(club||'');
export const validCode=code=>/^[a-f0-9]{64}$/.test(code||'');
const challenge=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
// The main app and its Firestore connection use the same default Firebase app.
export async function tabletFirebaseAuth(){
 const app=getApp(),auth=getAuth(app);
 await auth.authStateReady();
 const identity=auth.currentUser;
 const token=identity?await identity.getIdTokenResult():null;
 return {projectId:app.options.projectId,authenticated:!!identity,kcOperator:token?.claims.kcOperator===true};
}

const confirmed=(listener,snapshot)=>{if(!snapshot.metadata.fromCache&&!snapshot.metadata.hasPendingWrites)listener(snapshot);};

export function stationClient(device=false){
 const app=device?initializeApp(getApp().options,'kc-drink-device'):getApp();
 const auth=getAuth(app),db=getFirestore(app);
 const clubRef=(club,...path)=>{
  if(!validClub(club))throw Error('Ungültiger Club.');
  return doc(db,'clubs',club,...path);
 };
 const control=club=>clubRef(club,'stationControl','current');
 const pairing=(club,code)=>{
  if(!validCode(code))throw Error('Ungültiger Kopplungscode.');
  return clubRef(club,'stationPairings',code);
 };
 const command=(club,id)=>clubRef(club,'stationCommands',id);
 const place=club=>collection(db,'clubs',club,'stationCommands');
 const value=snap=>snap.exists()?snap.data():null;
 const watch=(ref,next,error)=>onSnapshot(ref,{includeMetadataChanges:true},snap=>confirmed(next,snap),error);
 const watchDoc=(ref,next,error)=>watch(ref,snap=>next(value(snap)),error);
 async function user(){
  await auth.authStateReady();
  if(auth.currentUser)return auth.currentUser;
  if(!device)throw Error('Bitte als Spielleitung anmelden.');
  return (await signInAnonymously(auth)).user;
 }
 return {
  user,signIn:(email,password)=>signInWithEmailAndPassword(auth,email,password),
  signOut:()=>signOut(auth),onAuth:next=>onIdTokenChanged(auth,next),
  watchControl:(club,next,error)=>watchDoc(control(club),next,error),
  watchPairing:(club,code,next,error)=>watchDoc(pairing(club,code),next,error),
  watchPresence:(club,next,error)=>watchDoc(clubRef(club,'stationPresence','current'),next,error),
  watchRoot:(club,next,error,offline)=>onSnapshot(clubRef(club,'state','current'),{includeMetadataChanges:true},snapshot=>{
   if(snapshot.metadata.fromCache)offline?.();
   else confirmed(row=>next(value(row)),snapshot);
  },error),
  watchQueued:(club,next,error)=>watch(query(place(club),where('status','==','queued'),limit(20)),
   snap=>next(snap.docs.map(row=>({id:row.id,...row.data()}))),error),
  watchRecent:(club,next,error)=>watch(query(place(club),orderBy('createdAt','desc'),limit(30)),
   snap=>next(snap.docs.map(row=>({id:row.id,...row.data()}))),error),
  watchCommand:(club,id,next,error)=>watchDoc(command(club,id),next,error),
  async createPairing(club){
   await user();
   const code=challenge();
   await setDoc(pairing(club,code),{status:'open',uid:'',label:'',expiresAt:Timestamp.fromMillis(Date.now()+240000)});
   return code;
  },
  async requestPairing(club,code,label){
   const identity=await user(),ref=pairing(club,code);
   return runTransaction(db,async tx=>{
    const existing=value(await tx.get(ref));
    if(existing?.uid===identity.uid&&['requested','approved'].includes(existing.status))return;
    if(existing?.status!=='open'||existing.expiresAt.toMillis()<=Date.now())throw Error('Kopplungscode ungültig oder abgelaufen.');
    tx.update(ref,{status:'requested',uid:identity.uid,label});
   });
  },
  async approve(club,code,approved){
   const ref=pairing(club,code);
   return runTransaction(db,async tx=>{
    const existing=value(await tx.get(ref));
    if(existing?.status!=='requested'||existing.expiresAt.toMillis()<=Date.now())throw Error('Kopplungsanfrage abgelaufen.');
    if(approved)tx.set(control(club),{uid:existing.uid,label:existing.label,generation:challenge(),pairedAt:serverTimestamp(),pairingCode:code});
    tx.update(ref,{status:approved?'approved':'rejected'});
   });
  },
  async revoke(club){await setDoc(control(club),{uid:'',label:'',generation:challenge(),pairedAt:serverTimestamp(),pairingCode:''});},
  async heartbeat(club,configuration){
   const identity=await user();
   await setDoc(clubRef(club,'stationPresence','current'),{uid:identity.uid,generation:configuration.generation,at:serverTimestamp()});
  },
  async submit(club,id,entry){
   const identity=await user(),ref=command(club,id);
   return runTransaction(db,async tx=>{
    const existing=value(await tx.get(ref));
    if(existing){
     if(existing.uid!==identity.uid)throw Error('Die Buchungs-ID ist bereits vergeben.');
     return existing;
    }
    tx.set(ref,{...entry,uid:identity.uid,status:'queued',createdAt:serverTimestamp()});
    return null;
   });
  },
  async readCommand(club,id){return value(await getDocFromServer(command(club,id)));},
  async readControl(club){return value(await getDocFromServer(control(club)));}
 };
}
