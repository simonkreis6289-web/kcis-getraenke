import {stationClient} from './station-client.js';

const $=id=>document.getElementById('kc-station-'+id);
const client=stationClient();
let club='', signedIn=false, control=null, pairing=null, presence=null, code='', busy=false, draining=false;
let queue=[], stops=[], stopPairing=null, managementError='';
const errorText=error=>error?.code==='permission-denied'?'Firebase hat den Zugriff verweigert. Prüfe die Spielleitungsfreigabe und die Firestore-Regeln.':error?.message||'Firebase antwortet nicht.';
const time=value=>value?.toMillis?.()||0;
const date=value=>value?new Date(value).toLocaleString('de-DE'):'—';
function selectedClub(){return typeof ACTIVE_CLUB!=='undefined'&&ACTIVE_CLUB?getClubFirestoreId(ACTIVE_CLUB):'';}
function render(){
 const fresh=control?.uid&&presence?.uid===control.uid&&presence.generation===control.generation?time(presence.at):0;
 $('login').hidden=signedIn;
 $('management').hidden=!signedIn;
 $('status').textContent=managementError||(!signedIn?'Mit einem freigegebenen Spielleitungskonto anmelden.':
  !club?'Bitte einen Club öffnen.':control?.uid?(control.label||'Getränkehandy')+' · '+(Date.now()-fresh<85000?'Verbunden':'Kein aktueller Kontakt'):'Kein Getränkehandy freigegeben');
 $('last').textContent=date(fresh);
 $('pair').disabled=busy||!signedIn||!club||!navigator.onLine;
 $('revoke').disabled=busy||!control?.uid||!navigator.onLine;
 $('reset').disabled=busy||!signedIn||!club;
 $('signout').disabled=busy;
 const valid=pairing&&time(pairing.expiresAt)>Date.now()&&['open','requested'].includes(pairing.status);
 $('challenge').hidden=!valid;
 $('approve').hidden=pairing?.status!=='requested';
 $('reject').hidden=pairing?.status!=='requested';
 $('approve').disabled=busy;$('reject').disabled=busy;
 $('request').textContent=pairing?.status==='requested'?'Anfrage von '+pairing.label+' · bitte am Tablet bestätigen.':
  'Mit dem Getränkehandy scannen. Gültig bis '+date(time(pairing?.expiresAt))+'.';
}
function drawCode(){
 const url=new URL('getraenkestation.html',location.href);
 url.hash=new URLSearchParams({club,code}).toString();
 const qr=window.qrcode(0,'M');
 qr.addData(url.href);qr.make();
 const canvas=$('qr'),cells=qr.getModuleCount(),scale=5,pad=4;
 canvas.width=canvas.height=(cells+pad*2)*scale;
 const context=canvas.getContext('2d');
 context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
 context.fillStyle='#142747';
 for(let y=0;y<cells;y++)for(let x=0;x<cells;x++)if(qr.isDark(y,x))context.fillRect((x+pad)*scale,(y+pad)*scale,scale,scale);
 $('link').href=url.href;
}
function watchPairing(){
 stopPairing?.();stopPairing=null;pairing=null;
 if(!code)return;
 drawCode();
 stopPairing=client.watchPairing(club,code,value=>{
  pairing=value;
  if(['approved','rejected'].includes(value?.status))localStorage.removeItem('kc-station-pairing-'+club);
  render();
 },error=>{managementError=errorText(error);render();});
}
function connect(){
 const next=signedIn?selectedClub():'';
 if(next===club)return;
 for(const stop of stops)stop();
 stops=[];stopPairing?.();stopPairing=null;pairing=null;control=null;presence=null;queue=[];code='';club=next;
 if(club){
  code=localStorage.getItem('kc-station-pairing-'+club)||'';
  watchPairing();
  const failed=error=>{managementError=errorText(error);render();};
  stops=[
   client.watchControl(club,value=>{control=value;managementError='';render();void drain();},failed),
   client.watchPresence(club,value=>{presence=value;render();},failed),
   client.watchQueued(club,value=>{queue=value;void drain();},failed)
  ];
 }
 render();
}
async function flush(){
 if(!window.KCTabletSync?.ready||!(await window.KCTabletSync.waitForUpload()))throw Error('Offene Tablet-Buchungen müssen zuerst von Firebase bestätigt werden.');
}
async function drain(){
 if(draining||busy||!club||club!==selectedClub()||!control||!queue.length||!navigator.onLine||
    !window.KCTabletSync?.ready||window.kcEveningResetBusy)return;
 const target=club,id=queue[0].id;
 draining=true;
 try{
  await flush();
  if(club!==target||selectedClub()!==target||busy||window.kcEveningResetBusy)return;
  await window.firestoreApi.processDrinkStationCommand(target,id);
  await flush();
  queue=queue.filter(row=>row.id!==id||target!==club);
  if(target===club&&selectedClub()===target)renderAll();
 }catch(error){if(target===club)managementError=errorText(error);}
 finally{draining=false;render();}
}
async function action(fn){
 if(busy)return;
 busy=true;managementError='';render();
 try{await fn();}
 catch(error){managementError=errorText(error);}
 finally{busy=false;render();void drain();}
}
$('login').addEventListener('submit',event=>{
 event.preventDefault();
 void action(async()=>{
  const password=$('password');
  try{
   const credential=await client.signIn($('email').value.trim(),password.value);
   const token=await credential.user.getIdTokenResult(true);
   if(token.claims.kcOperator!==true){await client.signOut();throw Error('Dieses Konto hat keine Spielleitungsfreigabe.');}
  }finally{password.value='';}
 });
});
$('signout').onclick=()=>action(async()=>{if(control)await flush();await client.signOut();});
$('pair').onclick=()=>action(async()=>{
 const target=club;
 const next=await client.createPairing(target);
 if(target!==club)return;
 code=next;localStorage.setItem('kc-station-pairing-'+club,code);watchPairing();
});
$('approve').onclick=()=>action(async()=>{await flush();await client.approve(club,code,true);});
$('reject').onclick=()=>action(()=>client.approve(club,code,false));
$('revoke').onclick=()=>{if(confirm('Buchungsrechte des Getränkehandys widerrufen?'))void action(async()=>{await flush();await client.revoke(club);});};
$('reset').onclick=()=>action(async()=>{
 if(control?.uid){await flush();await client.revoke(club);}
 if(pairing?.status==='requested'&&time(pairing.expiresAt)>Date.now())await client.approve(club,code,false);
 localStorage.removeItem('kc-station-pairing-'+club);code='';watchPairing();
});
client.onAuth(async identity=>{
 signedIn=!!identity&&(await identity.getIdTokenResult()).claims.kcOperator===true;
 connect();
 if(signedIn)void window.KCTabletSync?.reconnect();
});
window.KCStationAdmin={
 show(){connect();render();},
 async beforeClose(){
  try{
   if(!signedIn||!selectedClub())return true;
   const configured=await client.readControl(selectedClub());
   if(!configured)return true;
   busy=true;render();
   await flush();
   await window.firestoreApi.closeDrinkStationEvening(selectedClub());
   await flush();
   return true;
  }catch(error){showToast(errorText(error),'error');return false;}
  finally{busy=false;render();}
 }
};
setInterval(()=>{connect();if(club)render();void drain();},3000);
