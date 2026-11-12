/* Notizen und Satzung: separate Club-Dokumente, Live-Abgleich und seitenweiser Editor. */
(() => {
 const model=window.KCClubContent,$=id=>document.getElementById(id);
 let club='',epoch=0,unsubs=[],data={},ready={},view=null,viewReady=false,busy=false,message='',frame=0;
 const readers={},editors={},drafts={},pending=new Map();
 const id=prefix=>prefix+(crypto.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
 function cache(){try{localStorage.setItem('kcis_club_content_'+club,JSON.stringify(data));}catch(e){/* Ein voller lokaler Cache verändert keine Cloud-Daten. */}}
 function stop(){epoch++;for(const off of unsubs)off?.();unsubs=[];club='';data={};ready={};view=null;viewReady=false;busy=false;message='';pending.clear();for(const key of ['notes','statutes','penalties']){delete drafts[key];readers[key]?.reset();}renderPanels();}
 function connect(){
  const target=typeof ACTIVE_CLUB!=='undefined'&&ACTIVE_CLUB?getClubFirestoreId(ACTIVE_CLUB):'';
  if(target===club&&(unsubs.length||!window.firestoreApi?.subscribeClubContent))return;if(club)stop();if(!target)return;club=target;const token=epoch;
  try{data=JSON.parse(localStorage.getItem('kcis_club_content_'+club)||'{}');}catch(e){data={};}
  if(!window.firestoreApi?.subscribeClubContent||!window.firestoreApi?.subscribeToClubState){message='Clubunterlagen werden verbunden. Bei Bedarf die App aktualisieren.';return;}
  for(const kind of ['notes','statutes','penalties'])unsubs.push(window.firestoreApi.subscribeClubContent(club,kind,value=>{if(token!==epoch||club!==target)return;data[kind]=value||null;ready[kind]=true;cache();renderPanels();},()=>{if(token!==epoch||club!==target)return;ready[kind]=false;message='Verbindung zu den Clubunterlagen unterbrochen. Gespeicherte Inhalte bleiben sichtbar.';renderPanels();}));
  unsubs.push(window.firestoreApi.subscribeToClubState(club,state=>{if(token!==epoch||club!==target)return;view=state?.dashboardClubContent||null;viewReady=true;renderPanels();},()=>{if(token!==epoch||club!==target)return;viewReady=false;renderPanels();}));
 }
 function initialize(){
  for(const kind of ['notes','statutes','penalties']){
   const root=$('club-'+kind+'-reader'),editor=$('club-'+kind+'-editor');if(!root||readers[kind])continue;
   readers[kind]=window.KCContentPager.create(root,{notes:kind==='notes',penalties:kind==='penalties'&&!!window.KCPenaltyTable,controls:kind==='notes',onPage:()=>renderButtons(kind)});
   editors[kind]=(kind==='penalties'&&window.KCPenaltyTable?window.KCPenaltyTable:window.KCContentPager).editor(editor,{formatted:kind!=='notes',onInput:()=>{if(drafts[kind])drafts[kind].changed=true;renderButtons(kind);}});
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;for(const kind of ['notes','statutes','penalties']){const stage=$('club-'+kind+'-stage');if(!stage||!stage.getClientRects().length)continue;const height=Math.max(200,window.innerHeight-stage.getBoundingClientRect().top-32)+'px';if(stage.style.height!==height)stage.style.height=height;if(typeof ResizeObserver!=='function'){readers[kind]?.schedule();editors[kind]?.schedule();}}});}
 function renderButtons(kind){
  const open=!!(view?.open&&view.kind===kind),button=$('club-'+kind+'-dashboard');if(!button)return;
  button.textContent=open?'📺 Auf Dashboard schließen':'📺 Auf Dashboard anzeigen';button.setAttribute('aria-pressed',String(open));button.disabled=busy||!viewReady||!navigator.onLine;
  const remote=$('club-'+kind+'-remote');remote.hidden=!open;for(const b of remote.querySelectorAll('button'))b.disabled=busy||!viewReady||!navigator.onLine;
  const save=$('club-'+kind+'-save'),length=editors[kind]?.text.length||0,limit=kind==='notes'?10000:100000;
  if(save)save.disabled=busy||!ready[kind]||!navigator.onLine||length>limit||kind==='notes'&&!editors[kind]?.text.trim();
  const count=$('club-'+kind+'-characters');if(count)count.textContent=length.toLocaleString('de-DE')+' / '+limit.toLocaleString('de-DE')+' Zeichen';
  const start=$('club-'+kind+'-edit');if(start){start.disabled=busy||!ready[kind]||!navigator.onLine;start.hidden=!!drafts[kind];}
  for(const control of $('club-'+kind+'-reader')?.querySelectorAll('[data-note-done],[data-note-delete]')||[])control.disabled=busy||!ready[kind]||!navigator.onLine;
  editors[kind]?.setBusy(busy);
  const cancel=$('club-'+kind+'-cancel');if(cancel)cancel.disabled=busy;
 }
 function renderPanels(){
  initialize();for(const kind of ['notes','statutes','penalties']){
   const root=$('club-'+kind+'-reader');if(!root)continue;const current=model.value(kind,data[kind]),editing=!!drafts[kind];
   if(kind!=='notes'){
    const stage=$('club-'+kind+'-stage');stage.classList.toggle('is-editing-statutes',editing);document.body.classList.toggle('club-statutes-is-editing',!!(drafts.statutes||drafts.penalties));
    if(editing){stage.setAttribute('role','dialog');stage.setAttribute('aria-modal','true');}else{stage.removeAttribute('role');stage.removeAttribute('aria-modal');}
   }
   root.hidden=editing;$('club-'+kind+'-editor').hidden=!editing;readers[kind].pause(editing);readers[kind].update(kind==='notes'?current.items:kind==='penalties'&&window.KCPenaltyTable?current.table:current.text);
   if(kind==='notes')$('club-notes-summary').textContent=current.items.filter(n=>!n.done).length+' offen · '+current.items.filter(n=>n.done).length+' erledigt · Älteste zuerst';
   $('club-'+kind+'-status').textContent=message||(!navigator.onLine?'Offline · Gespeicherte Inhalte lesen; Änderungen nach dem Verbinden.':!ready[kind]?'Clubunterlagen werden geladen …':editing&&current.revision!==drafts[kind].revision?'Auf einem anderen Gerät geändert. Dein Entwurf bleibt erhalten.':busy?'Wird gespeichert …':'');
   renderButtons(kind);
  }schedule();
 }
 function render(){initialize();connect();renderPanels();}
 async function request(method,kind,fields,revision){
  if(busy||!club||!navigator.onLine||!window.firestoreApi?.[method])return false;
  const target=club,token=epoch,key=method+'|'+kind+'|'+JSON.stringify(fields);let req=pending.get(key);
  if(!req){req={...fields,kind,expectedRevision:revision,opId:id('content_')};pending.set(key,req);}
  busy=true;message='';renderPanels();
  try{const result=await window.firestoreApi[method](target,req);if(token!==epoch||target!==club)return false;
   if(method==='setClubContentDashboard')view=result;else{data[kind]=result;cache();}pending.delete(key);return true;
  }catch(error){if(token===epoch&&target===club){message=error.message||'Speichern fehlgeschlagen. Bitte erneut versuchen.';if(/inzwischen/.test(message))pending.delete(key);}return false;}
  finally{if(token===epoch&&target===club){busy=false;renderPanels();}}
 }
 function edit(kind){if(busy||!ready[kind]||!navigator.onLine)return;const current=model.value(kind,data[kind]);drafts[kind]={revision:current.revision,id:kind==='notes'?id('note_'):null};message='';renderPanels();editors[kind].open(kind==='notes'?'':kind==='penalties'&&window.KCPenaltyTable?current.table:current.text);renderButtons(kind);schedule();requestAnimationFrame(()=>editors[kind].focus());}
 function cancel(kind){if(busy)return;if(drafts[kind]?.changed&&!confirm('Ungespeicherten Entwurf verwerfen?'))return;delete drafts[kind];message='';renderPanels();}
 async function save(kind){const draft=drafts[kind];if(!draft||busy)return false;const fields=kind==='notes'?{action:'add',id:draft.id,text:editors[kind].text}:{action:'save',text:editors[kind].text,...(kind==='penalties'&&editors[kind].table?{table:editors[kind].table}:{})};
  const target=club,token=epoch,ok=await request('updateClubContent',kind,fields,kind==='notes'?model.value('notes',data.notes).revision:draft.revision);if(ok&&target===club&&token===epoch){delete drafts[kind];message='Gespeichert.';if(kind==='notes')readers.notes.showNote(draft.id);renderPanels();}return ok;
 }
 async function done(noteId,checked){if(!ready.notes)return false;return request('updateClubContent','notes',{action:'done',id:noteId,done:checked},model.value('notes',data.notes).revision);}
 async function remove(noteId){if(!ready.notes||busy||!confirm('Diese Notiz wirklich löschen?'))return false;return request('updateClubContent','notes',{action:'delete',id:noteId},model.value('notes',data.notes).revision);}
 function toggle(kind){return request('setClubContentDashboard',kind,{action:view?.open&&view.kind===kind?'close':'open'},Number(view?.revision)||0);}
 function turn(kind,delta){return request('setClubContentDashboard',kind,{action:'turn',delta},Number(view?.revision)||0);}
 function infoTab(key){const keys=['dashboard','statutes','penalties'];if(!keys.includes(key))return;for(const value of keys){const panel=$('club-info-'+value);if(panel)panel.hidden=value!==key;}for(const b of document.querySelectorAll('[data-club-info]')){const selected=b.dataset.clubInfo===key;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}render();}
 document.addEventListener('keydown',event=>{if(!event.target.matches('[data-club-info]')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const keys=['dashboard','statutes','penalties'],index=keys.indexOf(event.target.dataset.clubInfo),key=keys[event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3];infoTab(key);document.querySelector('[data-club-info='+key+']').focus();});
 document.addEventListener('change',event=>{if(event.target.matches('[data-note-done]')){const input=event.target;input.checked=!input.checked;void done(input.dataset.noteDone,!input.checked);}});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-note-delete]');if(button)void remove(button.dataset.noteDelete);});
 document.addEventListener('keydown',event=>{
  const kind=['statutes','penalties'].find(key=>drafts[key]);if(!kind||event.defaultPrevented)return;
  if(event.key==='Escape'){event.preventDefault();cancel(kind);return;}
  if(event.key!=='Tab'||event.target===$('club-'+kind+'-text'))return;
  const controls=[...$('club-'+kind+'-stage').querySelectorAll('button,textarea')].filter(el=>!el.disabled&&el.getClientRects().length),first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.addEventListener('online',render);window.addEventListener('offline',renderPanels);
 window.KCClubContentApp=Object.freeze({render,stop,edit,cancel,save,done,remove,toggle,turn,infoTab,schedule});
})();
