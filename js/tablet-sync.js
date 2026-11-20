/* Ein führendes Tablet: sofort lokal buchen, bestätigte Stände im Hintergrund zum TV. */
(() => {
  if(window.KC_TABLET_MODE===false)return;
  const C=window.KCSharedCore,sessions=new Map(),modalBases=new Map();
  let api,raw,current=null,ready=false,unit=null,localTail=Promise.resolve(),timer=null,server=null,sharedOriginalToast=null;
  const id=()=> 'sync_'+crypto.randomUUID(),snapshot=()=>C.clean(getFirestoreState()),key=club=>'kcis_tablet_outbox_'+club;
  const recoveryKey=club=>'kcis_tablet_recovery_'+club;
  const toast=(text,type='error')=>typeof showToast==='function'&&showToast(text,type);
  async function cloudRequest(request){
    let deadline;
    try{
      return await Promise.race([request,new Promise((_,reject)=>{
        deadline=setTimeout(()=>reject(Object.assign(Error('Keine Cloud-Antwort innerhalb von 30 Sekunden'),{code:'deadline-exceeded'})),30000);
      })]);
    }finally{clearTimeout(deadline);}
  }
  const tvLabels={direct:'TV direkt verbunden',relay:'TV über WebRTC-Relay verbunden',firebase:'TV über Firebase verbunden',connecting:'TV-Verbindung wird aufgebaut',disconnected:'TV nicht verbunden'};
  const tvMode=()=>current?.linkStatus?.mode||'connecting';
  const pendingWrites=s=>[s?.inflight,s?.pending].reduce((count,batch)=>count+(batch?1+batch.documents.length:0),0);
  let connectionMeasurement=null;
  function updateDiagnostic(cloud){
    const link=current?.linkStatus;
    const support=value=>value===true?'Verfügbar':value===false?'Nicht verfügbar':'Noch unbekannt';
    const routes={local:'Lokaler WebRTC-Pfad',peer:'WebRTC über einen Netzwerkpfad',relay:'WebRTC über Relay',unknown:'WebRTC-Pfad nicht ermittelbar',browser:'Direkt im selben Browser'};
    const data={
      transport:tvLabels[tvMode()],tablet:support(typeof window.RTCPeerConnection==='function'),
      tv:support(link?.tvWebrtc),path:routes[link?.route]||(tvMode()==='firebase'?'Firebase':'—'),
      cloud,pending:String(pendingWrites(current)),
      confirmed:current?.lastConfirmedAt?new Date(current.lastConfirmedAt).toLocaleString('de-DE'):'—'
    };
    for(const [key,value] of Object.entries(data)){
      const field=document.querySelector('[data-sync-diagnostic="'+key+'"]');
      if(field&&field.textContent!==value)field.textContent=value;
    }
    const button=document.getElementById('dashboard-connection-test');
    if(!button)return;
    button.disabled=!current?.link?.test||connectionMeasurement?.running===true;
    const result=document.getElementById('dashboard-connection-result');
    const message=connectionMeasurement?.message||'Noch nicht gemessen.';
    if(result&&result.textContent!==message)result.textContent=message;
  }
  async function testConnection(){
    const session=current;
    if(!session?.link?.test||connectionMeasurement?.running)return;
    const measurement={running:true,message:'Warte auf Antwort vom TV …'};connectionMeasurement=measurement;status();
    const steps={
      'direct-wait':'Warte auf die Antwort über den direkten Kanal …',
      'firebase-send':'Sende die Testanfrage über Firebase …',
      'firebase-wait':'Anfrage über Firebase gesendet. Warte auf Antwort vom TV …',
      'firebase-failed':'Firebase hat die Testanfrage nicht bestätigt.',
      offline:'Tablet ist offline. Firebase ist nicht erreichbar.',
      unavailable:'Der Firebase-Test ist derzeit nicht verfügbar.'
    };
    const result=await session.link.test(step=>{
      if(session!==current||connectionMeasurement!==measurement)return;
      measurement.message=steps[step];
      status();
    }).catch(()=>null);
    if(session!==current||connectionMeasurement!==measurement)return;
    const names={webrtc:'WebRTC',browser:'gleicher Browser',firebase:'Firebase'};
    connectionMeasurement={running:false,message:result?Math.round(result.ms)+' ms hin und zurück · '+names[result.via]:'Test beendet · '+(measurement.message.endsWith(' …')?measurement.message.slice(0,-2)+'. Zeitlimit erreicht.':measurement.message)};
    status();
  }
  function status(){
    const el=document.getElementById('shared-sync-status');
    if(!el)return;
    const count=Number(!!current?.inflight)+Number(!!current?.pending),tv=tvLabels[tvMode()];
    const offline=!navigator.onLine,error=String(current?.error||'');
    el.dataset.mode=offline?'offline':error?'error':!ready?'blocked':count?'saving':'ready';
    const cloud=offline?(count?'Cloudspeicherung ausstehend · offline':'Firebase offline'):error?'Cloudspeicherung ausstehend':!ready?'Tablet lädt den gespeicherten Stand …':count?'Cloudspeicherung läuft …':'Cloudspeicherung bestätigt';
    el.dataset.tvMode=tvMode();
    updateDiagnostic(cloud);
    const label=tv+' · '+cloud;
    const indicator=el.querySelector('summary');
    indicator.title=label;
    el.querySelector('.shared-sync-caption').textContent=tv;
    const cloudStatus=el.querySelector('.shared-sync-cloud');
    if(cloudStatus)cloudStatus.textContent=cloud;
    indicator.setAttribute('aria-label',label);
    el.querySelector('.shared-sync-label').textContent=label;
    const detail=el.querySelector('.shared-sync-error-details');
    detail.textContent=[error?'Firebase: '+error.slice(0,250):'',count?`${count} ausstehende Übertragung${count===1?'':'en'} · lokal gespeichert`:''].filter(Boolean).join(' · ');
    detail.hidden=!detail.textContent;
    const retry=el.querySelector('.shared-sync-retry');
    retry.textContent='Übertragung erneut versuchen';
    retry.hidden=!error&&!offline;
    retry.disabled=offline||!!current?.uploading||!!current?.recovering;
    retry.onclick ||= ()=>void window.KCSharedSync?.reconnect();
    const copy=el.querySelector('.shared-sync-copy-error');
    copy.hidden=!error;
    copy.onclick ||= ()=>{
      const message=JSON.stringify(window.KCSharedSync?.diagnostics?.()||{},null,2);
      const manual=()=>showToast('Bitte den sichtbaren Fehlertext aus den Cloud-Details kopieren','error');
      if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(message).catch(manual);
      else manual();
    };
    const backup=el.querySelector('.shared-sync-backup');
    backup.hidden=!count||!error;
    backup.onclick ||= async ()=>{
      backup.disabled=true;
      try{
        const data=await collectConflictBackup();
        downloadJson(data,'kegelclub-tablet-abgleich-'+data.exportedAt.slice(0,10)+'.json');
        toast(data.firebaseState.status==='ok'?'Abgleichdatei mit Tablet- und Firebase-Stand erstellt.':'Lokale Warteschlange gesichert. Firebase-Stand war nicht abrufbar.','success');
      }catch(error){
        toast('Abgleichdatei konnte nicht erstellt werden: '+error.message);
      }finally{backup.disabled=false;}
    };
    const adopt=el.querySelector('.shared-sync-adopt-cloud');
    adopt.hidden=!current?.directConflict||!count;
    adopt.disabled=offline||!!current?.uploading||!!current?.recovering;
    adopt.onclick ||= adoptFirebaseState;
    const archive=el.querySelector('.shared-sync-local-archive');
    archive.hidden=!current?.hasRecoveryArchive;
    archive.onclick ||= ()=>{
      try{downloadJson(JSON.parse(localStorage.getItem(recoveryKey(current.club))),'kegelclub-lokale-sicherung.json');}
      catch(error){toast('Lokale Sicherung konnte nicht heruntergeladen werden: '+error.message);}
    };
  }
  function downloadJson(data,name){
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download=name;
    document.body.append(link);
    try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }
  async function collectConflictBackup(){
    const s=current;
    if(!s)throw Error('Kein Club ausgewählt.');
    const tabletOutbox=JSON.parse(localStorage.getItem(key(s.club))||'null');
    const batches=[tabletOutbox?.inflight,tabletOutbox?.pending].filter(Boolean);
    if(!batches.length)throw Error('Keine offenen Übertragungen vorhanden.');
    const read=async request=>{
      try{return {status:'ok',value:await cloudRequest(request())};}
      catch(error){return {status:'unavailable',error:String(error?.code||error?.message||error)};}
    };
    const exportedAt=new Date().toISOString();
    const [firebaseState,...receipts]=await Promise.all([
      read(()=>raw.readTabletDocument(s.club,'clubs/'+s.club+'/state/current')),
      ...batches.map(batch=>read(()=>raw.getSharedReceipt(s.club,batch.opId)))
    ]);
    return {exportedAt,tabletOutbox,firebaseState,receipts:batches.map((batch,index)=>({opId:batch.opId,...receipts[index]}))};
  }
  function store(s){localStorage.setItem(key(s.club),JSON.stringify({seq:s.seq,pending:s.pending,inflight:s.inflight,lastConfirmedAt:s.lastConfirmedAt||null}));}
  function cache(){try{if(typeof syncCurrentClubToStore==='function'){syncCurrentClubToStore();saveClubSystem();}}catch{/* Die dauerhafte Übertragungswarteschlange bleibt maßgeblich. */}}
  function project(state,render=false){
    const old=isApplyingRemoteState;try{isApplyingRemoteState=true;const previousPeople=new Map(persons.map(p=>[C.norm(p.name),p]));applyLoadedState(C.clone(state));persons=persons.map(p=>{const old=previousPeople.get(C.norm(p.name));if(!old)return p;for(const k of Object.keys(old))if(!Object.hasOwn(p,k))delete old[k];return Object.assign(old,p);});livePersonCounters.clear();for(const p of state.persons||[])livePersonCounters.set(p.name,C.clone(p));liveCountersReady=true;if(render)renderAll();cache();}finally{isApplyingRemoteState=old;}
    window.KCClubContentApp?.refreshDashboardControls();
  }
  function publish(s){
    const content={};
    for(const batch of [s.inflight,s.pending])for(const row of batch?.documents||[]){
      const prefix='clubs/'+s.club+'/documents/';
      const kind=row.path.startsWith(prefix)?row.path.slice(prefix.length):'';
      if(['notes','statutes','penalties'].includes(kind))content[kind]=row.deleted?null:row.value;
    }
    const first=s.inflight||s.pending;
    const basis={baseRevision:first?.baseRevision??s.cloudRevision,operations:[first?.baseOperation,s.inflight?.opId,s.pending?.opId,s.lastOperation].filter(Boolean),
      conflict:s.directConflict===true};
    s.link?.publish(s.root,s.seq,s.cloudEvening,content,basis);
  }
  function stage(state,docs=[],clockOnly=false){
    const s=current;if(!ready||!s)return false;
    const comparison={...state,tabletSequence:s.root?.tabletSequence};if(!docs.length&&C.equal(C.clean(s.root),C.clean(comparison)))return true;
    const previous={seq:s.seq,pending:s.pending,root:s.root};
    const merged=new Map((s.pending?.documents||[]).map(x=>[x.path,x]));for(const doc of docs)merged.set(doc.path,doc);
    const predecessor=s.inflight;
    s.seq++;s.root={...state,tabletSequence:s.seq};s.pending={sequence:s.seq,opId:id(),baseSequence:predecessor?.sequence??s.cloudSequence,
      baseRevision:predecessor?.baseRevision??s.pending?.baseRevision??s.cloudRevision,
      baseOperation:predecessor?.opId??s.pending?.baseOperation,expectedEvening:predecessor?predecessor.state.currentEveningStartedAt||'':s.cloudEvening,state:C.clean(s.root),documents:[...merged.values()]};
    try{store(s);}catch(error){s.seq=previous.seq;s.pending=previous.pending;s.root=previous.root;throw Error('Tablet-Speicher voll. Buchung wurde nicht übernommen.');}
    if(!clockOnly)s.ownsClock=true;
    server=s.root;publish(s);cache();status();clearTimeout(timer);
    timer=setTimeout(()=>{if(!s.retryStopped&&Date.now()>=(s.nextRetryAt||0))void drain(s);},40);return true;
  }
  async function drain(s,force=false){
    if(s.recovering)return false;
    if(s.uploading)return s.uploading;
    if(!force&&(s.retryStopped||Date.now()<(s.nextRetryAt||0)))return false;
    s.uploading=Promise.resolve().then(async()=>{
      while(s.inflight||s.pending){
        if(!navigator.onLine){s.error='Tablet ist offline';break;}
        let ctx;
        try{
          if(!s.inflight){const pending=s.pending;s.inflight=pending;s.pending=null;
            try{store(s);}catch(error){s.pending=pending;s.inflight=null;throw error;}
          }
          const batch=s.inflight;
          ctx={method:'commitTabletBatch',opId:batch.opId,eveningStartedAt:batch.expectedEvening??s.cloudEvening??'',base:{},sideOperations:[],metaBase:{}};
          const confirmed=await cloudRequest(raw.commitTabletBatch(s.club,batch,ctx));
          if(confirmed?.sequence!==batch.sequence)throw Error('Firebase hat diese Übertragung nicht bestätigt.');
          const previousConfirmedAt=s.lastConfirmedAt;s.inflight=null;s.lastConfirmedAt=Date.now();
          try{store(s);}catch(error){s.inflight=batch;s.lastConfirmedAt=previousConfirmedAt;throw error;}
          s.cloudSequence=batch.sequence;
          if(Number.isSafeInteger(confirmed.revision))s.cloudRevision=confirmed.revision;
s.cloudEvening=batch.state.currentEveningStartedAt||'';s.error='';s.failureDiagnostic=null;s.retryFailures=0;s.nextRetryAt=0;s.retryStopped=false;
          s.lastOperation=batch.opId;
          s.eveningConflict=false;s.directConflict=false;
          if(!s.pending&&ctx.confirmedState){
            const confirmedRoot=C.normalizeGameData(ctx.confirmedState);
            s.root=confirmedRoot;if(s===current){server=confirmedRoot;publish(s);}
          }
        }catch(error){
          s.retryFailures=(s.retryFailures||0)+1;
          s.directConflict=error?.code==='sync-conflict';
          if(s.directConflict&&s===current)publish(s);
          s.eveningConflict=error?.code==='sync-conflict'&&error.path?.[0]==='Kegelabend';
          s.failureDiagnostic=ctx?{
            batchSequence:s.inflight?.sequence,baseSequence:s.inflight?.baseSequence,
            operation:ctx.method,authentication:ctx.authentication||null,
            ...(ctx.permissionDiagnostic||{}),
            sideDocuments:(s.inflight?.documents||[]).slice(0,60).map(row=>({path:row.path,operation:row.deleted?'delete':'set'}))
          }:null;
          const message=s.eveningConflict
            ?'Dieser Browser hat offene Daten zu einem anderen Kegelabend. Du kannst sie sichern und den aktuellen Firebase-Stand laden.'
            :error?.code==='sync-conflict'&&error.path?.[0]==='Tablet-Warteschlange'
            ?'Tablet und Firebase haben unterschiedliche Speicherstände. Bitte Abgleichdatei sichern und Buchungen bis zum Abgleich nicht erneut eingeben.'
            :String(error?.message||error);
          s.error=(error?.code?'['+error.code+'] ':'')+message;
          s.retryStopped=['permission-denied','unauthenticated','sync-conflict','invalid-argument','failed-precondition'].includes(error?.code);
          s.nextRetryAt=s.retryStopped?0:Date.now()+Math.min(300000,5000*Math.pow(2,Math.min(6,s.retryFailures-1)));
          console.error('Tablet-Cloudspeicherung gescheitert (lokale Warteschlange bleibt erhalten):',error);
          break;
        }
      }
      return !s.inflight&&!s.pending;
    }).finally(()=>{s.uploading=null;if(s===current){applyReceived(s);status();}});
    return s.uploading;
  }
  function begin(club){
    current?.link?.close();ready=false;connectionMeasurement=null;
    current=sessions.get(club)||{club,root:null,seq:0,pending:null,inflight:null,uploading:null,error:'',docCache:new Map()};
    current.directConflict=false;current.hasRecoveryArchive=!!localStorage.getItem(recoveryKey(club));
    sessions.set(club,current);current.linkStatus=null;current.received=null;unit=null;status();
  }
  function receive(state,metadata={}){
    const s=current;
    if(!s||!state?.syncInitialized||metadata.fromCache||metadata.pending)return;
    const revision=Number(state.syncRevision)||0;
    if(revision<=(s.cloudRevision||0)||revision<=Number(s.received?.syncRevision||0))return;
    s.received=state;
    applyReceived(s);
  }
  function applyReceived(s){
    if(current!==s||!ready||unit||s.uploading||s.recovering||s.inflight||s.pending||!s.received)return;
    const saved=s.received;s.received=null;
    const sequence=Number(saved.tabletSequence)||0,revision=Number(saved.syncRevision)||0;
    if(revision<=(s.cloudRevision||0)||sequence<s.cloudSequence)return;
    s.cloudRevision=revision;
    if(s.lastOperation&&saved.syncOperation===s.lastOperation)return;
    s.cloudEvening=saved.currentEveningStartedAt||'';
    s.cloudSequence=sequence;
    s.seq=Math.max(s.seq,sequence);
    s.root=C.normalizeGameData(saved);
    s.ownsClock=false;
    s.docCache.clear();
    s.error='';s.failureDiagnostic=null;s.retryFailures=0;s.nextRetryAt=0;s.retryStopped=false;s.eveningConflict=false;
    server=s.root;
    project(s.root,true);
    publish(s);
    status();
  }
  function activate(s,root){
    s.root={...C.clone(root),syncProtocol:1};server=s.root;ready=true;
    for(const batch of [s.inflight,s.pending])for(const row of batch?.documents||[])s.docCache.set(row.path,row.deleted?null:C.clone(row.value));
    s.link?.close();
    s.link=window.KCDashboardLink?.create({role:'publisher',club:s.club,api:raw,getBase:()=>s.root,onStatus:value=>{s.linkStatus=value;if(current===s)status();}});
    publish(s);
    project(s.root,true);
  }
  async function prepare(club,defaults){
    if(current?.club!==club)begin(club);
    const s=current;
    let outbox;
    try{
      outbox=C.normalizeGameData(JSON.parse(localStorage.getItem(key(club))||'null'));
      if(!navigator.onLine)throw Error('Tablet ist offline');
      const saved=C.normalizeGameData(await cloudRequest(raw.initializeSharedState(club,defaults,id())));
      if(current!==s)return false;
      s.cloudEvening=saved.currentEveningStartedAt||'';s.cloudSequence=Number(saved.tabletSequence)||0;
      s.cloudRevision=Number(saved.syncRevision)||0;
      s.seq=Math.max(s.cloudSequence,Number(outbox?.seq)||0);
      s.lastConfirmedAt=outbox?.lastConfirmedAt||null;
      if(!s.uploading){s.inflight=outbox?.inflight||null;s.pending=outbox?.pending||null;}
      const first=s.inflight||s.pending;
      s.directConflict=!!(first&&s.cloudSequence<(first.sequence||0)&&
       (first.baseSequence!==s.cloudSequence||(first.baseOperation?first.baseOperation!==saved.syncOperation:
        Number.isSafeInteger(first.baseRevision)&&first.baseRevision!==s.cloudRevision)));
      s.error='';activate(s,s.pending?.state||s.inflight?.state||saved);store(s);status();void drain(s);return true;
    }catch(error){
      if(current!==s)return false;
      s.error=error.message;
      const batch=outbox?.pending||outbox?.inflight;
      if(!ready&&batch?.state&&Number.isSafeInteger(batch.sequence)&&batch.sequence>0&&Array.isArray(batch.documents)){
        s.pending=outbox.pending||null;s.inflight=outbox.inflight||null;
        const first=s.inflight||s.pending;
        s.cloudSequence=first.baseSequence||0;s.cloudEvening=first.expectedEvening||'';
        s.seq=Math.max(batch.sequence,Number(outbox.seq)||0);
        s.lastConfirmedAt=outbox.lastConfirmedAt||null;
        activate(s,batch.state);
        status();void drain(s);return true;
      }
      ready=false;status();toast('Gespeicherter Stand konnte nicht geladen werden: '+error.message);return false;
    }
  }
  function preview(before){
    const targetClub=current.club,knownDocs=current.docCache,root='clubs/'+targetClub+'/state/current',data=new Map([[root,C.clone(before)]]),writes=new Map();
    for(const [p,value] of current.docCache||[])if(value!==null)data.set(p,C.clone(value));
    for(const p of before.persons||[])data.set('clubs/'+current.club+'/livePersons/'+encodeURIComponent(C.norm(p.name)),C.clone(p));
    for(const g of C.games)data.set('clubs/'+current.club+'/liveGames/'+g,{gameKey:g,state:before[g+'State']||{},revision:0});
    data.set('clubs/'+current.club+'/live/seating',{seatingOrder:before.seatingOrder||[],groupSettings:before.groupSettings||{}});
    return {data,writes,run:fn=>fn({get:async ref=>{const p=ref.path||ref;if(!data.has(p)&&!knownDocs.has(p)&&!p.startsWith('clubs/'+targetClub+'/livePersons/')&&!p.startsWith('clubs/'+targetClub+'/liveGames/')&&p!=='clubs/'+targetClub+'/live/seating'){const value=await cloudRequest(raw.readTabletDocument(targetClub,p));if(value!==null)data.set(p,value);}return {exists:()=>data.has(p),data:()=>C.clone(data.get(p))};},set:(ref,value,options)=>{const p=ref.path||ref,next=options?.merge?{...data.get(p),...C.clean(value)}:C.clean(value);data.set(p,next);writes.set(p,{path:p,value:next});},delete:ref=>{const p=ref.path||ref;data.delete(p);writes.set(p,{path:p,deleted:true});}})};
  }
  async function localCall(method,args){
    if(method==='saveClubState')return null;
    const filled=args.slice(),count=api.__syncArity[method];while(filled.length<count)filled.push(undefined);filled[count]={preview:unit.preview,base:C.clone(unit.before),eveningStartedAt:unit.before.currentEveningStartedAt||''};
    const result=Promise.resolve().then(()=>raw[method](...filled));unit.promises.push(result);return result;
  }
  function finish(action,globals,method){
    if(current!==action.session)throw Error('Club wurde gewechselt. Eingabe verworfen.');
    const root='clubs/'+current.club+'/state/current',draft=C.clone(action.preview.data.get(root)),docs=[];
    for(const change of action.preview.writes.values()){
      const parts=change.path.split('/');if(change.path===root)continue;
      if(parts[2]==='livePersons'){const old=draft.persons.find(p=>C.norm(p.name)===decodeURIComponent(parts[3]));if(change.deleted)draft.persons=draft.persons.filter(p=>p!==old);else if(old)Object.assign(old,change.value);else draft.persons.push(change.value);}
      else if(parts[2]==='liveGames')draft[parts[3]+'State']=change.deleted?null:change.value.state;
      else if(parts[2]==='live'&&parts[3]==='seating'&&!change.deleted)Object.assign(draft,change.value);
      else docs.push(change);
    }
    if(globals)for(const [k,v] of Object.entries(globals))if(!C.equal(action.before[k],v))draft[k]=C.clone(v);
    const started=C.games.find(k=>draft[k+'State']?.active&&(!action.before[k+'State']?.active||draft[k+'State'].startedAt!==action.before[k+'State'].startedAt||draft[k+'State'].id!==action.before[k+'State']?.id));
    if(started){draft.dashboardActiveGame=started;draft.dashboardGameOverview={open:false,revision:Number(draft.dashboardGameOverview?.revision||0)+1};for(const k of ['dashboardCashView','dashboardRules','dashboardClubContent'])if(draft[k]?.open)draft[k]={...draft[k],open:false,revision:Number(draft[k].revision||0)+1};}
    if(draft.dashboardGameOverview?.selectedGame){
      const changed=C.games.filter(k=>!C.equal(C.clean(action.before[k+'State']),C.clean(draft[k+'State'])));
      if(changed.length===1){draft.dashboardActiveGame=changed[0];draft.dashboardGameOverview={...draft.dashboardGameOverview,selectedGame:changed[0]};}
    }
    const state=C.totals(draft,window.KCGameFinePolicy);stage(state,docs);
    for(const change of docs)current.docCache.set(change.path,change.deleted?null:C.clone(change.value));
    project(state);if(method==='saveLivePersonStatus'){renderAnwesenheit();updateStats();}return state;
  }
  function local(fn){const promise=localTail.catch(()=>{}).then(fn);localTail=promise.catch(()=>{});return promise;}
  async function adoptFirebaseState(){
    const s=current;
    if(!s?.directConflict||s.uploading||s.recovering||!navigator.onLine)return false;
    if(!confirm('Offene lokale Änderungen werden in diesem Browser separat gesichert. Sie werden nicht nach Firebase übertragen. Stattdessen wird der bestätigte Firebase-Stand geladen. Fortfahren?'))return false;
    return local(async()=>{
      if(current!==s||!s.directConflict||s.uploading||s.recovering)return false;
      s.recovering=true;status();
      try{
        const stored=localStorage.getItem(key(s.club)),outbox=JSON.parse(stored||'null'),first=outbox?.inflight;
        if(!first||first.opId!==s.inflight?.opId||outbox.pending?.opId!==s.pending?.opId)
          throw Error('Die Warteschlange hat sich geändert. Bitte Seite neu laden.');
        const saved=await cloudRequest(raw.readTabletDocument(s.club,'clubs/'+s.club+'/state/current'));
        if(current!==s||localStorage.getItem(key(s.club))!==stored)
          throw Error('Der Browserstand hat sich geändert. Bitte erneut abgleichen.');
        if(!saved?.syncInitialized||!Array.isArray(saved.persons)||
           s.eveningConflict&&(!saved.currentEveningStartedAt||saved.currentEveningStartedAt===first.expectedEvening))
          throw Error('Der bestätigte Firebase-Stand konnte nicht ermittelt werden.');
        const archives=JSON.parse(localStorage.getItem(recoveryKey(s.club))||'[]');
        if(!archives.some(row=>row.tabletOutbox.inflight.opId===first.opId&&row.tabletOutbox.pending?.opId===outbox.pending?.opId)){
          archives.push({savedAt:new Date().toISOString(),firebaseEvening:saved.currentEveningStartedAt||'',
            firebaseSequence:Number(saved.tabletSequence)||0,tabletOutbox:outbox});
          localStorage.setItem(recoveryKey(s.club),JSON.stringify(archives));
        }
        s.hasRecoveryArchive=true;
        const cloudSequence=Number(saved.tabletSequence)||0;
        const next={seq:cloudSequence,inflight:null,pending:null,lastConfirmedAt:Date.now()};
        store({...s,...next});
        Object.assign(s,next,{cloudSequence,cloudEvening:saved.currentEveningStartedAt||'',
          cloudRevision:Number(saved.syncRevision)||0,ownsClock:false,
          error:'',failureDiagnostic:null,retryStopped:false,retryFailures:0,nextRetryAt:0,eveningConflict:false,directConflict:false});
        s.docCache.clear();
        activate(s,C.normalizeGameData(saved));
        toast('Firebase-Kegelabend geladen. Die offenen lokalen Änderungen wurden separat gesichert.','success');
        return true;
      }catch(error){toast('Firebase-Abgleich nicht abgeschlossen: '+error.message);return false;}
      finally{s.recovering=false;if(current===s){applyReceived(s);status();}}
    });
  }
  function write(method,args){
    if(method==='saveClubMeta'&&(!ready||args[0]!==current?.club))return (async()=>{const base=await raw.loadClubState(args[0])||{},meta=await raw.readTabletDocument(args[0],'clubs/'+args[0])||{};return raw.saveClubMeta(...args,{method,opId:id(),base,metaBase:meta,sideOperations:[],eveningStartedAt:base.currentEveningStartedAt||''});})();
    if(unit)return localCall(method,args);
    return local(async()=>{if(!ready)throw Error('Tabletstand noch nicht geladen');
      if(method==='startNewEvening'&&(current.inflight||current.pending))throw Error('Buchungen warten auf Cloudbestätigung.');
      const action={session:current,before:method==='startNewEvening'?C.clone(current.root):{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await localCall(method,args);await Promise.all(action.promises);finish(action,undefined,method);return result;}catch(error){if(current===action.session)project(action.before,true);throw error;}finally{unit=null;applyReceived(action.session);status();}
    });
  }
  function legacyAction(key,fn,args,self){
    if(unit)return fn.apply(self,args);
    return local(async()=>{if(!ready)return;const action={session:current,before:{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await fn.apply(self,args);let n=0;while(n<action.promises.length){const chunk=action.promises.slice(n);n=action.promises.length;await Promise.all(chunk);}window.KCKranzUI?.freeze(key,action.before);const after=snapshot();finish(action,window.KCGameStopwatch?.updateLegacy(key,action.before,after)||after);for(const msg of action.messages.slice(-2))sharedOriginalToast?.(...msg);return result;}
      catch(error){if(current===action.session)project(action.before,true);sharedOriginalToast?.(error.message,'error');return undefined;}finally{unit=null;applyReceived(action.session);status();}
    });
  }
  function persist(){if(!ready||unit||current?.recovering)return;try{stage({...current.root,...snapshot()});}catch(error){toast(error.message);}}
  async function flush(){if(unit)return true;persist();return ready;}
  async function waitForUpload(){await localTail;if(!ready)return false;persist();return drain(current,true);}
  async function reconnect(){if(!current)return false;if(!ready)return prepare(current.club,createEmptyClubData());current.nextRetryAt=0;return drain(current,true);}
  function install(value){api=value;raw={...value};for(const name of Object.keys(api.__syncArity||{}))if(name!=='commitTabletBatch')api[name]=(...args)=>write(name,args);installActions();status();}
  function installActions(){
    const entries={
      tannenbaum:['startTannenbaumSetup','handleTannenbaumThrow','confirmTannenbaumPenaltyPlayer','confirmTannenbaumKranzNumber','confirmTannenbaumRestore','finishTannenbaumGame','resetTannenbaumGame','undoLastTannenbaumThrow','startTannenbaumGame'],darts:['startDartsGame','resetDartsGame','handleDartsThrow','confirmDartsPenaltyPlayer','finishDartsRound','undoDartsRound','finishDartsGame','confirmDartsScoreSetup','deleteDartsThrow'],lotterie:['startLotterieGame','startLotterieGameFinal','generateLotterieAmounts','resetLotterieGame','confirmLotterieThrow','confirmLotterieThrower','applyLotterieThrow','saveLotterieThrow','deleteLotterieThrow','finishLotterieGame','updateLotterieAmount','prepareLotterieColumns','updateLotteriePreStartAmount'],tiberius:['startTiberiusGameFinal','resetTiberiusGame','confirmTiberiusThrower','continueTiberiusAfterThrower','handleTiberiusThrow','undoLastTiberiusThrow','confirmTiberiusHitPenalty','finishTiberiusGame','prepareTiberiusColumns','updateTiberiusPreStartTarget','generateTiberiusTargets','updateTiberiusTarget'],mensch:['startMenschGameFinal','applyMenschThrow','finishMenschGame','undoMenschThrow','resetMenschGame'],plusminus:['startPlusminusGame','applyPlusminusThrow','undoPlusminusThrow','confirmPlusminusSlotEdit','finishPlusminusGame','resetPlusminusGame','togglePlusminusSmartGosse','choosePlusminusSlot'],sichern:['startSichernGame','sichernThrow','sichernSave','finishSichernGame','undoSichernThrow'],fuchsjagd:['startFuchsjagdGame','applyFuchsjagdThrow','finishFuchsjagd','undoFuchsjagdThrow'],tor:['startTorGame','torThrow','undoTorThrow']
    };
    for(const [key,names] of Object.entries(entries))for(const name of names){
      const fn=window[name];
      if(typeof fn!=='function'||fn.sharedAction)continue;
      const wrapped=function(...args){
        return legacyAction(key,fn,args,this);
      };
      wrapped.sharedAction=true;
      window[name]=wrapped;
    }
    for(const name of ['startHausGame','hausThrow','undoHausThrow','finishHausGame','resetHausGame']){
      const fn=window[name];
      if(typeof fn==='function'&&!fn.sharedAction){
        const wrapped=function(...args){
          return legacyAction(args[0]==='hoch'?'haushoch':'haustief',fn,args,this);
        };
        wrapped.sharedAction=true;
        window[name]=wrapped;
      }
    }
    const opens={
      hausOpenThrowModal:null,openDartsThrowModal:'darts',openTannenbaumThrowModal:'tannenbaum',openLotterieThrowModal:'lotterie',openTiberiusThrowModal:'tiberius',openTannenbaumPenaltyPlayerModal:'tannenbaum',openDartsPenaltyPlayerModal:'darts',openTiberiusHitModal:'tiberius',openPlusminusSlotEdit:'plusminus'
    };
    for(const [name,key] of Object.entries(opens)){
      const fn=window[name];
      if(typeof fn==='function')window[name]=function(...args){
        modalBases.set(key||(args[0]==='hoch'?'haushoch':'haustief'),C.clone(server?.[(key||(args[0]==='hoch'?'haushoch':'haustief'))+'State']));
        if(unit)unit.opened.add(key||(args[0]==='hoch'?'haushoch':'haustief'));
        return fn.apply(this,args);
      };
    }
    if(typeof showToast==='function'){
      sharedOriginalToast=showToast;
      window.showToast=function(...args){
        if(unit){
          unit.messages.push(args);
          return;
        }
        return sharedOriginalToast(...args);
      };
    }
  }

  window.KCTabletSync=Object.freeze({testConnection,status,install,begin,prepare,persist,flush,reconnect,waitForUpload,receive,capture(){return true;},clubContentView(club){return ready&&current?.club===club?C.clone(current.root.dashboardClubContent||null):undefined;},get server(){return C.clone(server);},get ready(){return ready;},get directConnected(){return !!current?.linkStatus?.direct;},get inUnit(){return !!unit;},get working(){return false;},get originalApi(){return raw;},diagnostics(){const s=current;return {ready,online:navigator.onLine,clubSet:!!s,sequence:s?.seq||0,cloudSequence:s?.cloudSequence||0,uploading:!!s?.uploading,inflightSequence:s?.inflight?.sequence||null,pendingSequence:s?.pending?.sequence||null,retryStopped:!!s?.retryStopped,lastConfirmedAt:s?.lastConfirmedAt||null,link:s?.linkStatus||null,pendingDocuments:s?.pending?.documents?.length||0,inflightDocuments:s?.inflight?.documents?.length||0,error:s?.error||'',failure:s?.failureDiagnostic||null,retryFailures:s?.retryFailures||0,nextRetryAt:s?.nextRetryAt?new Date(s.nextRetryAt).toISOString():null};}});
  document.addEventListener('click',e=>{if(ready&&!unit&&!current?.recovering)return;if(e.target?.closest?.('#shared-sync-status,.tor-person-backdrop,.kc-kranz-backdrop,.modal-overlay,.haus-modal-overlay'))return;const b=e.target?.closest?.('button,input,select,textarea');if(!b||b.closest('#club-start-screen'))return;const code=b.getAttribute('onclick')||'';if(/^(showMainTab|showSideTab|goToClubSelection|close|kcClose|KCSharedSync)/.test(code))return;e.preventDefault();e.stopImmediatePropagation();},true);
  window.addEventListener('online',()=>{status();void reconnect();});
  window.addEventListener('offline',()=>{if(current?.pending||current?.inflight)current.error='Tablet ist offline';status();});
  setInterval(()=>{for(const s of sessions.values())if(!s.retryStopped&&(s.error||s.pending)&&Date.now()>=(s.nextRetryAt||0))void drain(s);},5000);
  // Nur der Browser mit der letzten lokalen Änderung liefert weitere Zeitanker.
  setInterval(()=>{
    if(!ready||unit||!navigator.onLine||!current?.ownsClock||current.recovering||current.eveningConflict)return;
    const state={...current.root,...snapshot()},now=window.KCSharedClock?.now()??Date.now(),ball=state.ballermannState;
    const running=C.games.some(key=>state[key+'State']?.active&&window.KCGameStopwatch?.clock(key,state[key+'State'],state.teamStopwatchActive)?.runningSince!=null);
    if(!running&&!state.teamStopwatchRunning&&!(ball?.active&&ball.timer?.running&&ball.timer.endsAt>now))return;
    try{stage({...state,tabletClock:{time:now}},[],true);}catch(error){toast(error.message);}
  },10000);
})();
