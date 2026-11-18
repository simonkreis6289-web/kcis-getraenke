/* Ein führendes Tablet: sofort lokal buchen, bestätigte Stände im Hintergrund zum TV. */
(() => {
  if(window.KC_TABLET_MODE===false)return;
  const C=window.KCSharedCore,sessions=new Map(),modalBases=new Map();
  let api,raw,current=null,ready=false,unit=null,localTail=Promise.resolve(),timer=null,server=null,sharedOriginalToast=null;
  const id=()=> 'sync_'+crypto.randomUUID(),snapshot=()=>C.clean(getFirestoreState()),key=club=>'kcis_tablet_outbox_'+club;
  const toast=(text,type='error')=>typeof showToast==='function'&&showToast(text,type);
  async function cloudRequest(request){
    let deadline;
    try{
      return await Promise.race([request,new Promise((_,reject)=>{
        deadline=setTimeout(()=>reject(Object.assign(Error('Keine Cloud-Antwort innerhalb von 30 Sekunden'),{code:'deadline-exceeded'})),30000);
      })]);
    }finally{clearTimeout(deadline);}
  }
  function status(){
    const el=document.getElementById('shared-sync-status');
    if(!el)return;
    const count=Number(!!current?.inflight)+Number(!!current?.pending),direct=!!current?.linkStatus?.direct;
    const offline=!navigator.onLine,error=String(current?.error||'');
    el.dataset.mode=offline?'offline':error?'error':!ready?'blocked':count?'saving':'ready';
    const cloud=offline?'Cloud offline':error?'Cloudspeicherung ausstehend':!ready?'Tablet lädt den gespeicherten Stand …':count?'Cloudspeicherung läuft …':'Cloudspeicherung bestätigt';
    const label=direct?'TV direkt verbunden · '+cloud:cloud;
    const indicator=el.querySelector('summary');
    indicator.title=label;
    el.querySelector('.shared-sync-caption').textContent=direct?'TV direkt · '+cloud:cloud;
    indicator.setAttribute('aria-label','Cloud-Status: '+label);
    el.querySelector('.shared-sync-label').textContent=label;
    const detail=el.querySelector('.shared-sync-error-details');
    detail.textContent=[error?'Firebase: '+error.slice(0,250):'',count?`${count} ausstehende Übertragung${count===1?'':'en'} · lokal gespeichert`:''].filter(Boolean).join(' · ');
    detail.hidden=!detail.textContent;
    const retry=el.querySelector('.shared-sync-retry');
    retry.textContent='Übertragung erneut versuchen';
    retry.hidden=!error&&!offline;
    retry.disabled=offline||!!current?.uploading;
    retry.onclick ||= ()=>void window.KCSharedSync?.reconnect();
    const copy=el.querySelector('.shared-sync-copy-error');
    copy.hidden=!error;
    copy.onclick ||= ()=>{
      const message=JSON.stringify(window.KCSharedSync?.diagnostics?.()||{},null,2);
      const manual=()=>showToast('Bitte den sichtbaren Fehlertext aus den Cloud-Details kopieren','error');
      if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(message).catch(manual);
      else manual();
    };
  }
  function store(s){localStorage.setItem(key(s.club),JSON.stringify({seq:s.seq,pending:s.pending,inflight:s.inflight}));}
  function cache(){try{if(typeof syncCurrentClubToStore==='function'){syncCurrentClubToStore();saveClubSystem();}}catch{/* Die dauerhafte Übertragungswarteschlange bleibt maßgeblich. */}}
  function project(state,render=false){
    const old=isApplyingRemoteState;try{isApplyingRemoteState=true;const previousPeople=new Map(persons.map(p=>[C.norm(p.name),p]));applyLoadedState(C.clone(state));persons=persons.map(p=>{const old=previousPeople.get(C.norm(p.name));if(!old)return p;for(const k of Object.keys(old))if(!Object.hasOwn(p,k))delete old[k];return Object.assign(old,p);});livePersonCounters.clear();for(const p of state.persons||[])livePersonCounters.set(p.name,C.clone(p));liveCountersReady=true;if(render)renderAll();cache();}finally{isApplyingRemoteState=old;}
  }
  function stage(state,docs=[]){
    const s=current;if(!ready||!s)return false;
    const comparison={...state,tabletSequence:s.root?.tabletSequence};if(!docs.length&&C.equal(C.clean(s.root),C.clean(comparison)))return true;
    const previous={seq:s.seq,pending:s.pending,root:s.root};
    const merged=new Map((s.pending?.documents||[]).map(x=>[x.path,x]));for(const doc of docs)merged.set(doc.path,doc);
    const predecessor=s.inflight;
    s.seq++;s.root={...state,tabletSequence:s.seq};s.pending={sequence:s.seq,opId:id(),baseSequence:predecessor?.sequence??s.cloudSequence,expectedEvening:predecessor?predecessor.state.currentEveningStartedAt||'':s.cloudEvening,state:C.clean(s.root),documents:[...merged.values()]};
    try{store(s);}catch(error){s.seq=previous.seq;s.pending=previous.pending;s.root=previous.root;throw Error('Tablet-Speicher voll. Buchung wurde nicht übernommen.');}
    server=s.root;s.link?.publish(s.root,s.seq,s.cloudEvening);cache();status();clearTimeout(timer);
    timer=setTimeout(()=>{if(Date.now()>=(s.nextRetryAt||0))void drain(s);},40);return true;
  }
  async function drain(s,force=false){
    if(s.uploading)return s.uploading;
    if(!force&&Date.now()<(s.nextRetryAt||0))return false;
    s.uploading=Promise.resolve().then(async()=>{
      while(s.inflight||s.pending){
        if(!navigator.onLine){s.error='Tablet ist offline';break;}
        try{
          if(!s.inflight){const pending=s.pending;s.inflight=pending;s.pending=null;
            try{store(s);}catch(error){s.pending=pending;s.inflight=null;throw error;}
          }
          const batch=s.inflight;
          const ctx={method:'commitTabletBatch',opId:batch.opId,eveningStartedAt:batch.expectedEvening??s.cloudEvening??'',base:{},sideOperations:[],metaBase:{}};
          const confirmed=await cloudRequest(raw.commitTabletBatch(s.club,batch,ctx));
          if(confirmed?.sequence!==batch.sequence)throw Error('Firebase hat diese Übertragung nicht bestätigt.');
          s.inflight=null;
          try{store(s);}catch(error){s.inflight=batch;throw error;}
          s.cloudSequence=batch.sequence;s.cloudEvening=batch.state.currentEveningStartedAt||'';s.error='';s.retryFailures=0;s.nextRetryAt=0;
        }catch(error){s.retryFailures=(s.retryFailures||0)+1;s.error=(error?.code?'['+error.code+'] ':'')+String(error?.message||error);s.nextRetryAt=Date.now()+Math.min(300000,5000*Math.pow(2,Math.min(6,s.retryFailures-1)));console.error('Tablet-Cloudspeicherung gescheitert (lokale Warteschlange bleibt erhalten):',error);break;}
      }
      return !s.inflight&&!s.pending;
    }).finally(()=>{s.uploading=null;if(s===current)status();});
    return s.uploading;
  }
  function begin(club){current?.link?.close();ready=false;current=sessions.get(club)||{club,root:null,seq:0,pending:null,inflight:null,uploading:null,error:'',docCache:new Map()};sessions.set(club,current);unit=null;status();}
  async function prepare(club,defaults){
    if(current?.club!==club)begin(club);const s=current;
    try{
      const saved=C.normalizeGameData(await cloudRequest(raw.initializeSharedState(club,defaults,id())));if(current!==s)return false;
      s.cloudEvening=saved.currentEveningStartedAt||'';s.cloudSequence=Number(saved.tabletSequence)||0;
      const outbox=C.normalizeGameData(JSON.parse(localStorage.getItem(key(club))||'null'));
      s.seq=Math.max(s.cloudSequence,Number(outbox?.seq)||0);
      if(!s.uploading){s.inflight=outbox?.inflight||null;s.pending=outbox?.pending||null;}
      for(const batch of [s.inflight,s.pending])for(const row of batch?.documents||[])s.docCache.set(row.path,row.deleted?null:C.clone(row.value));
      s.root=C.clone(s.pending?.state||s.inflight?.state||saved);server=s.root;ready=true;s.link?.close();s.link=window.KCDashboardLink?.create({role:'publisher',club,api:raw,getBase:()=>s.root,onStatus:value=>{s.linkStatus=value;if(current===s)status();}});s.link?.publish(s.root,s.seq,s.cloudEvening);project(s.root,true);store(s);s.error='';status();void drain(s);return true;
    }catch(error){if(current!==s)return false;s.error=error.message;ready=false;status();toast('Gespeicherter Stand konnte nicht geladen werden: '+error.message);return false;}
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
  function write(method,args){
    if(method==='saveClubMeta'&&(!ready||args[0]!==current?.club))return (async()=>{const base=await raw.loadClubState(args[0])||{},meta=await raw.readTabletDocument(args[0],'clubs/'+args[0])||{};return raw.saveClubMeta(...args,{method,opId:id(),base,metaBase:meta,sideOperations:[],eveningStartedAt:base.currentEveningStartedAt||''});})();
    if(unit)return localCall(method,args);
    return local(async()=>{if(!ready)throw Error('Tabletstand noch nicht geladen');
      if(method==='startNewEvening'&&(current.inflight||current.pending))throw Error('Buchungen warten auf Cloudbestätigung.');
      const action={session:current,before:method==='startNewEvening'?C.clone(current.root):{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await localCall(method,args);await Promise.all(action.promises);finish(action,undefined,method);return result;}catch(error){if(current===action.session)project(action.before,true);throw error;}finally{unit=null;status();}
    });
  }
  function legacyAction(key,fn,args,self){
    if(unit)return fn.apply(self,args);
    return local(async()=>{if(!ready)return;const action={session:current,before:{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await fn.apply(self,args);let n=0;while(n<action.promises.length){const chunk=action.promises.slice(n);n=action.promises.length;await Promise.all(chunk);}window.KCKranzUI?.freeze(key,action.before);const after=snapshot();finish(action,window.KCGameStopwatch?.updateLegacy(key,action.before,after)||after);for(const msg of action.messages.slice(-2))sharedOriginalToast?.(...msg);return result;}
      catch(error){if(current===action.session)project(action.before,true);sharedOriginalToast?.(error.message,'error');return undefined;}finally{unit=null;status();}
    });
  }
  function persist(){if(!ready||unit)return;try{stage({...current.root,...snapshot()});}catch(error){toast(error.message);}}
  async function flush(){if(unit)return true;persist();return ready;}
  async function waitForUpload(){await localTail;if(!ready)return false;persist();return drain(current,true);}
  async function reconnect(){if(!current)return false;if(!ready)return prepare(current.club,createEmptyClubData());current.nextRetryAt=0;return drain(current,true);}
  function install(value){api=value;raw={...value};for(const name of Object.keys(api.__syncArity||{}))if(name!=='commitTabletBatch')api[name]=(...args)=>write(name,args);installActions();status();}
  function installActions(){
    const entries={
      tannenbaum:['startTannenbaumSetup','handleTannenbaumThrow','confirmTannenbaumPenaltyPlayer','confirmTannenbaumKranzNumber','confirmTannenbaumRestore','finishTannenbaumGame','resetTannenbaumGame','undoLastTannenbaumThrow','startTannenbaumGame'],darts:['startDartsGame','resetDartsGame','handleDartsThrow','confirmDartsPenaltyPlayer','finishDartsRound','undoDartsRound','finishDartsGame','confirmDartsScoreSetup','deleteDartsThrow'],lotterie:['startLotterieGame','startLotterieGameFinal','generateLotterieAmounts','resetLotterieGame','confirmLotterieThrow','confirmLotterieThrower','applyLotterieThrow','saveLotterieThrow','deleteLotterieThrow','finishLotterieGame','updateLotterieAmount','prepareLotterieColumns','updateLotteriePreStartAmount'],tiberius:['startTiberiusGameFinal','resetTiberiusGame','confirmTiberiusThrower','continueTiberiusAfterThrower','handleTiberiusThrow','undoLastTiberiusThrow','confirmTiberiusHitPenalty','finishTiberiusGame','prepareTiberiusColumns','updateTiberiusPreStartTarget','generateTiberiusTargets','updateTiberiusTarget'],mensch:['startMenschGameFinal','applyMenschThrow','finishMenschGame','undoMenschThrow','resetMenschGame'],plusminus:['startPlusminusGame','applyPlusminusThrow','undoPlusminusThrow','confirmPlusminusSlotEdit','finishPlusminusGame','resetPlusminusGame','togglePlusminusSmartGosse','choosePlusminusSlot'],sichern:['startSichernGame','sichernThrow','sichernSave','finishSichernGame','undoSichernThrow'],fuchsjagd:['startFuchsjagdGame','applyFuchsjagdThrow','finishFuchsjagd','undoFuchsjagdThrow'],tor:['startTorGame','torThrow']
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

  window.KCTabletSync=Object.freeze({install,begin,prepare,persist,flush,reconnect,waitForUpload,receive(){},capture(){return true;},status,get server(){return C.clone(server);},get ready(){return ready;},get directConnected(){return !!current?.linkStatus?.direct;},get inUnit(){return !!unit;},get working(){return false;},get originalApi(){return raw;},diagnostics(){const s=current;return {ready,online:navigator.onLine,clubSet:!!s,sequence:s?.seq||0,cloudSequence:s?.cloudSequence||0,uploading:!!s?.uploading,inflightSequence:s?.inflight?.sequence||null,pendingSequence:s?.pending?.sequence||null,pendingDocuments:s?.pending?.documents?.length||0,inflightDocuments:s?.inflight?.documents?.length||0,error:s?.error||'',retryFailures:s?.retryFailures||0,nextRetryAt:s?.nextRetryAt?new Date(s.nextRetryAt).toISOString():null};}});
  document.addEventListener('click',e=>{if(ready&&!unit)return;if(e.target?.closest?.('#shared-sync-status,.tor-person-backdrop,.kc-kranz-backdrop,.modal-overlay,.haus-modal-overlay'))return;const b=e.target?.closest?.('button,input,select,textarea');if(!b||b.closest('#club-start-screen'))return;const code=b.getAttribute('onclick')||'';if(/^(showMainTab|showSideTab|goToClubSelection|close|kcClose|KCSharedSync)/.test(code))return;e.preventDefault();e.stopImmediatePropagation();},true);
  window.addEventListener('online',()=>{status();void reconnect();});
  window.addEventListener('offline',()=>{if(current?.pending||current?.inflight)current.error='Tablet ist offline';status();});
  setInterval(()=>{for(const s of sessions.values())if((s.error||s.pending)&&Date.now()>=(s.nextRetryAt||0))void drain(s);},5000);
  // Zeitanker für laufende Spieluhren auffrischen.
  setInterval(()=>{
    if(!ready||unit||!navigator.onLine)return;
    const state={...current.root,...snapshot()},now=window.KCSharedClock?.now()??Date.now(),ball=state.ballermannState;
    const running=C.games.some(key=>state[key+'State']?.active&&window.KCGameStopwatch?.clock(key,state[key+'State'],state.teamStopwatchActive)?.runningSince!=null);
    if(!running&&!state.teamStopwatchRunning&&!(ball?.active&&ball.timer?.running&&ball.timer.endsAt>now))return;
    try{stage({...state,tabletClock:{time:now}});}catch(error){toast(error.message);}
  },10000);
})();
