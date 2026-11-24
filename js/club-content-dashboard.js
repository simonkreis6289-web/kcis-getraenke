/* Clubunterlagen belegen die ganze Dashboard-Fläche, mit lokalem und fernbedientem Blättern. */
(() => {
 let club='',kind='',session='',turn=0,epoch=0,off=null,pager=null,current=null,directStamp='';
 let notesClub='',notesEpoch=0,notesOff=null,notesCloud=null,notesDirect=null;
 const revision=value=>Number(value?.revision)||0;
 function paintNotesAlert(){window.KCClubContent.noteAlert(document.getElementById('club-notes-alert'),(notesDirect||notesCloud)?.items,true);}
 function resetNotesAlert(){notesEpoch++;notesOff?.();notesOff=null;notesClub='';notesCloud=null;notesDirect=null;paintNotesAlert();}
 function updateNotesAlert(state,clubId){
  if(!clubId){resetNotesAlert();return;}
  if(notesClub!==clubId){resetNotesAlert();notesClub=clubId;}
  // Notes remain subscribed while games, tables or another club document are on screen.
  if(!notesOff&&window.firestoreApi?.subscribeClubContent){const token=notesEpoch;notesOff=window.firestoreApi.subscribeClubContent(clubId,'notes',value=>{if(token!==notesEpoch)return;notesCloud=value;if(notesDirect&&revision(value)>=revision(notesDirect))notesDirect=null;paintNotesAlert();},()=>{});}
  const documents=state?.directClubDocuments;
  if(documents&&Object.prototype.hasOwnProperty.call(documents,'notes')){
   const value=documents.notes;
   if(value&&revision(value)>revision(notesCloud)&&revision(value)>=revision(notesDirect))notesDirect=value;
  }
  paintNotesAlert();
 }
 const overlay=()=>document.getElementById('club-content-dashboard');
 function inert(){const main=document.querySelector('main.dashboard'),visible=['club-content-dashboard','cash-dashboard-overlay','dashboard-rules-overlay'].some(id=>{const el=document.getElementById(id);return el&&!el.hidden;});if(main){main.toggleAttribute('inert',visible);if(visible)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}}
 function resetOverlay(){epoch++;off?.();pager?.destroy();off=null;club='';kind='';session='';turn=0;current=null;directStamp='';pager=null;const box=overlay();if(box)box.hidden=true;inert();}
 function reset(){resetOverlay();resetNotesAlert();}
 function renderContent(value){
  const data=window.KCClubContent.value(kind,value);
  pager.update(kind==='notes'?data.items:kind==='penalties'&&window.KCPenaltyTable?data.table:data.text);
 }
 function update(state,clubId){
  updateNotesAlert(state,clubId);
  const view=state?.dashboardClubContent,box=overlay();if(!box)return;
  if(!view?.open||!['notes','statutes','penalties'].includes(view.kind)){if(club)resetOverlay();else{box.hidden=true;inert();}return;}
  const changed=club!==clubId||kind!==view.kind||session!==view.session;
  if(changed){resetOverlay();club=clubId;kind=view.kind;session=view.session;turn=Number(view.turn)||0;box.hidden=false;box.dataset.contentKind=kind;
   document.getElementById('club-content-dashboard-title').textContent=kind==='notes'?'📝 Clubnotizen':kind==='penalties'?'💶 Strafentabelle':'📜 Satzung';
   document.getElementById('club-content-dashboard-help').textContent=kind==='notes'?'Offene Notizen zuerst · Erledigte ausgegraut am Ende · Zuletzt abgehakt zuerst':'In der App unter Info → '+(kind==='penalties'?'Strafentabelle':'Satzung')+' bearbeiten und schließen';
   const reader=document.getElementById('club-content-dashboard-reader');reader.querySelector('[data-content-body]').setAttribute('aria-label',kind==='notes'?'Notizen':kind==='penalties'?'Strafentabelle':'Satzung');pager=window.KCContentPager.create(reader,{notes:kind==='notes',penalties:kind==='penalties'&&!!window.KCPenaltyTable,penaltyDashboard:kind==='penalties'});const token=epoch;
   document.getElementById('club-content-dashboard-status').textContent='Wird geladen …';
   if(window.firestoreApi?.subscribeClubContent)off=window.firestoreApi.subscribeClubContent(club,kind,value=>{if(token!==epoch)return;current=value;if(directStamp&&(Number(value?.revision)||0)<(Number(JSON.parse(directStamp)?.revision)||0))return;directStamp='';document.getElementById('club-content-dashboard-status').textContent='';renderContent(current);},()=>{if(token===epoch)document.getElementById('club-content-dashboard-status').textContent='Verbindung unterbrochen · Letzter geladener Stand';});
   else document.getElementById('club-content-dashboard-status').textContent='Bitte das Dashboard aktualisieren.';
  }
  const content=state.directClubDocuments,local=content&&Object.prototype.hasOwnProperty.call(content,kind);
  const localValue=local?content[kind]:null;
  // A confirmed root and its document can arrive in separate listener callbacks.
  const retain=directStamp&&!local&&(Number(current?.revision)||0)<(Number(JSON.parse(directStamp)?.revision)||0);
  const nextStamp=local?JSON.stringify(localValue):retain?directStamp:'';
  if(nextStamp!==directStamp){
   directStamp=nextStamp;
   renderContent(local?content[kind]:current);
   document.getElementById('club-content-dashboard-status').textContent=local?'Vom Tablet · Cloudbestätigung ausstehend':'';
  }
  box.hidden=false;if(Number(view.turn)!==turn){turn=Number(view.turn)||0;pager?.turn(view.delta===-1?-1:1);}inert();
 }
 window.KCClubContentDashboard=Object.freeze({update,reset});
})();
