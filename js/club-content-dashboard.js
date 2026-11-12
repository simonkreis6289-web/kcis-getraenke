/* Clubunterlagen belegen die ganze Dashboard-Fläche, mit lokalem und fernbedientem Blättern. */
(() => {
 let club='',kind='',session='',turn=0,epoch=0,off=null,pager=null,current=null;
 const overlay=()=>document.getElementById('club-content-dashboard');
 function inert(){const main=document.querySelector('main.dashboard'),visible=['club-content-dashboard','cash-dashboard-overlay','dashboard-rules-overlay'].some(id=>{const el=document.getElementById(id);return el&&!el.hidden;});if(main){main.toggleAttribute('inert',visible);if(visible)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}}
 function reset(){epoch++;off?.();pager?.destroy();off=null;club='';kind='';session='';turn=0;current=null;pager=null;const box=overlay();if(box)box.hidden=true;inert();}
 function update(state,clubId){
  const view=state?.dashboardClubContent,box=overlay();if(!box)return;
  if(!view?.open||!['notes','statutes','penalties'].includes(view.kind)){if(club)reset();else{box.hidden=true;inert();}return;}
  const changed=club!==clubId||kind!==view.kind||session!==view.session;
  if(changed){reset();club=clubId;kind=view.kind;session=view.session;turn=Number(view.turn)||0;box.hidden=false;box.dataset.contentKind=kind;
   document.getElementById('club-content-dashboard-title').textContent=kind==='notes'?'📝 Clubnotizen':kind==='penalties'?'💶 Strafentabelle':'📜 Satzung';
   document.getElementById('club-content-dashboard-help').textContent=kind==='notes'?'Offene Notizen zuerst · Erledigte am Ende · Jeweils älteste zuerst':'In der App unter Info → '+(kind==='penalties'?'Strafentabelle':'Satzung')+' bearbeiten und schließen';
   const reader=document.getElementById('club-content-dashboard-reader');reader.querySelector('[data-content-body]').setAttribute('aria-label',kind==='notes'?'Notizen':kind==='penalties'?'Strafentabelle':'Satzung');pager=window.KCContentPager.create(reader,{notes:kind==='notes',penalties:kind==='penalties'&&!!window.KCPenaltyTable});const token=epoch;
   document.getElementById('club-content-dashboard-status').textContent='Wird geladen …';
   if(window.firestoreApi?.subscribeClubContent)off=window.firestoreApi.subscribeClubContent(club,kind,value=>{if(token!==epoch)return;current=value;document.getElementById('club-content-dashboard-status').textContent='';const data=window.KCClubContent.value(kind,current);pager.update(kind==='notes'?data.items:kind==='penalties'&&window.KCPenaltyTable?data.table:data.text);},()=>{if(token===epoch)document.getElementById('club-content-dashboard-status').textContent='Verbindung unterbrochen · Letzter geladener Stand';});
   else document.getElementById('club-content-dashboard-status').textContent='Bitte das Dashboard aktualisieren.';
  }
  box.hidden=false;if(Number(view.turn)!==turn){turn=Number(view.turn)||0;pager?.turn(view.delta===-1?-1:1);}inert();
 }
 window.KCClubContentDashboard=Object.freeze({update,reset});
})();
