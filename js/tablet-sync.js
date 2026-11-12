/* Ein führendes Tablet: sofort lokal buchen, bestätigte Stände im Hintergrund zum TV. */
(() => {
  if(window.KC_TABLET_MODE===false)return;
  const C=window.KCSharedCore,sessions=new Map(),modalBases=new Map();
  let api,raw,current=null,ready=false,unit=null,localTail=Promise.resolve(),timer=null,server=null,sharedOriginalToast=null;
  const id=()=> 'sync_'+crypto.randomUUID(),snapshot=()=>C.clean(getFirestoreState()),key=club=>'kcis_tablet_outbox_'+club;
  const toast=(text,type='error')=>typeof showToast==='function'&&showToast(text,type);
  function status(){
    let el=document.getElementById('shared-sync-status');if(!el){const app=document.getElementById('app');if(!app)return;el=document.createElement('div');el.id='shared-sync-status';el.setAttribute('role','status');el.innerHTML='<span></span><button type="button" onclick="KCSharedSync.reconnect()">Übertragung erneut versuchen</button>';app.prepend(el);}
    const pending=current?.inflight||current?.pending;
    el.dataset.mode=!ready?'blocked':current?.error?'pending':pending?'saving':'ready';
    el.querySelector('span').textContent=!ready?'Tablet lädt den gespeicherten Stand …':current?.error?'Auf Tablet gespeichert · TV-Übertragung ausstehend':pending?'Auf Tablet gespeichert · Übertragung zum TV läuft …':'Tablet bereit · Übertragung bestätigt';
    el.querySelector('button').hidden=!current?.error;
  }
  function store(s){localStorage.setItem(key(s.club),JSON.stringify({seq:s.seq,pending:s.pending,inflight:s.inflight}));}
  function cache(){try{if(typeof syncCurrentClubToStore==='function'){syncCurrentClubToStore();saveClubSystem();}}catch{/* Die dauerhafte Übertragungswarteschlange bleibt maßgeblich. */}}
  function project(state,render=false){
    const old=isApplyingRemoteState;try{isApplyingRemoteState=true;applyLoadedState(C.clone(state));livePersonCounters.clear();for(const p of state.persons||[])livePersonCounters.set(p.name,C.clone(p));liveCountersReady=true;if(render)renderAll();cache();}finally{isApplyingRemoteState=old;}
  }
  function stage(state,docs=[]){
    const s=current;if(!ready||!s)return false;
    const comparison={...state,tabletSequence:s.root?.tabletSequence};if(!docs.length&&C.equal(C.clean(s.root),C.clean(comparison)))return true;
    const previous={seq:s.seq,pending:s.pending,root:s.root};
    const merged=new Map((s.pending?.documents||[]).map(x=>[x.path,x]));for(const doc of docs)merged.set(doc.path,doc);
    s.seq++;s.root={...state,tabletSequence:s.seq};s.pending={sequence:s.seq,opId:id(),state:C.clean(s.root),documents:[...merged.values()]};
    try{store(s);}catch(error){s.seq=previous.seq;s.pending=previous.pending;s.root=previous.root;throw Error('Tablet-Speicher voll. Buchung wurde nicht übernommen.');}
    server=s.root;cache();status();clearTimeout(timer);timer=setTimeout(()=>void drain(s),40);return true;
  }
  async function drain(s){
    if(s.uploading)return s.uploading;
    s.uploading=(async()=>{
      while(s.inflight||s.pending){
        if(!navigator.onLine){s.error='offline';break;}
        if(!s.inflight){s.inflight=s.pending;s.pending=null;store(s);}
        const batch=s.inflight;
        try{
          const ctx={method:'commitTabletBatch',opId:batch.opId,eveningStartedAt:s.cloudEvening||'',base:{},sideOperations:[],metaBase:{}};
          await raw.commitTabletBatch(s.club,batch,ctx);
          s.cloudEvening=batch.state.currentEveningStartedAt||'';s.inflight=null;s.error='';store(s);
        }catch(error){s.error=error.message;break;}
      }
      if(s===current)status();return !s.inflight&&!s.pending;
    })().finally(()=>s.uploading=null);
    return s.uploading;
  }
  function begin(club){ready=false;current=sessions.get(club)||{club,root:null,seq:0,pending:null,inflight:null,uploading:null,error:'',docCache:new Map()};sessions.set(club,current);unit=null;status();}
  async function prepare(club,defaults){
    if(current?.club!==club)begin(club);const s=current;
    try{
      const saved=await raw.initializeSharedState(club,defaults,id());if(current!==s)return false;s.cloudEvening=saved.currentEveningStartedAt||'';
      let outbox;try{outbox=JSON.parse(localStorage.getItem(key(club))||'null');}catch{}
      s.seq=Math.max(Number(saved.tabletSequence)||0,Number(outbox?.seq)||0);
      s.inflight=outbox?.inflight&&outbox.inflight.sequence>Number(saved.tabletSequence||0)?outbox.inflight:null;
      s.pending=outbox?.pending&&outbox.pending.sequence>Number(saved.tabletSequence||0)?outbox.pending:null;
      for(const batch of [s.inflight,s.pending])for(const row of batch?.documents||[])s.docCache.set(row.path,row.deleted?null:C.clone(row.value));
      s.root=C.clone(s.pending?.state||s.inflight?.state||saved);server=s.root;ready=true;project(s.root,true);store(s);status();void drain(s);return true;
    }catch(error){s.error=error.message;ready=false;status();toast('Gespeicherter Stand konnte nicht geladen werden: '+error.message);return false;}
  }
  function preview(before){
    const targetClub=current.club,knownDocs=current.docCache,root='clubs/'+targetClub+'/state/current',data=new Map([[root,C.clone(before)]]),writes=new Map();
    for(const [p,value] of current.docCache||[])if(value!==null)data.set(p,C.clone(value));
    for(const p of before.persons||[])data.set('clubs/'+current.club+'/livePersons/'+encodeURIComponent(C.norm(p.name)),C.clone(p));
    for(const g of C.games)data.set('clubs/'+current.club+'/liveGames/'+g,{gameKey:g,state:before[g+'State']||{},revision:0});
    data.set('clubs/'+current.club+'/live/seating',{seatingOrder:before.seatingOrder||[],groupSettings:before.groupSettings||{}});
    return {data,writes,run:fn=>fn({get:async ref=>{const p=ref.path||ref;if(!data.has(p)&&!knownDocs.has(p)&&!p.startsWith('clubs/'+targetClub+'/livePersons/')&&!p.startsWith('clubs/'+targetClub+'/liveGames/')&&p!=='clubs/'+targetClub+'/live/seating'){const value=await raw.readTabletDocument(targetClub,p);if(value!==null)data.set(p,value);}return {exists:()=>data.has(p),data:()=>C.clone(data.get(p))};},set:(ref,value,options)=>{const p=ref.path||ref,next=options?.merge?{...data.get(p),...C.clean(value)}:C.clean(value);data.set(p,next);writes.set(p,{path:p,value:next});},delete:ref=>{const p=ref.path||ref;data.delete(p);writes.set(p,{path:p,deleted:true});}})};
  }
  async function localCall(method,args){
    if(method==='saveClubState')return null;
    const filled=args.slice(),count=api.__syncArity[method];while(filled.length<count)filled.push(undefined);filled[count]={preview:unit.preview,base:C.clone(unit.before),eveningStartedAt:unit.before.currentEveningStartedAt||''};
    const result=Promise.resolve(raw[method](...filled));unit.promises.push(result);return result;
  }
  function finish(action,globals){
    if(current!==action.session)throw Error('Club wurde gewechselt. Eingabe verworfen.');
    const root='clubs/'+current.club+'/state/current',draft=C.clone(action.preview.data.get(root)),docs=[];
    for(const change of action.preview.writes.values()){
      const parts=change.path.split('/');if(change.path===root)continue;
      if(parts[2]==='livePersons'){const old=draft.persons.find(p=>C.norm(p.name)===decodeURIComponent(parts[3]));if(change.deleted)draft.persons=draft.persons.filter(p=>p!==old);else if(old)Object.assign(old,change.value);else draft.persons.push(change.value);}
      else if(parts[2]==='liveGames')draft[parts[3]+'State']=change.deleted?null:change.value.state;
      else if(parts[2]==='live'&&parts[3]==='seating'&&!change.deleted)Object.assign(draft,change.value);
      else {docs.push(change);current.docCache.set(change.path,change.deleted?null:C.clone(change.value));}
    }
    if(globals)for(const [k,v] of Object.entries(globals))if(!C.equal(action.before[k],v))draft[k]=C.clone(v);
    const started=C.games.find(k=>draft[k+'State']?.active&&(!action.before[k+'State']?.active||draft[k+'State'].startedAt!==action.before[k+'State'].startedAt||draft[k+'State'].id!==action.before[k+'State']?.id));
    if(started){draft.dashboardActiveGame=started;draft.dashboardGameOverview={open:false,revision:Number(draft.dashboardGameOverview?.revision||0)+1};for(const k of ['dashboardCashView','dashboardRules','dashboardClubContent'])if(draft[k]?.open)draft[k]={...draft[k],open:false,revision:Number(draft[k].revision||0)+1};}
    const state=C.totals(draft,window.KCGameFinePolicy);stage(state,docs);project(state);return state;
  }
  function local(fn){const promise=localTail.catch(()=>{}).then(fn);localTail=promise.catch(()=>{});return promise;}
  function write(method,args){
    if(method==='saveClubMeta'&&(!ready||args[0]!==current?.club))return (async()=>{const base=await raw.loadClubState(args[0])||{},meta=await raw.readTabletDocument(args[0],'clubs/'+args[0])||{};return raw.saveClubMeta(...args,{method,opId:id(),base,metaBase:meta,sideOperations:[],eveningStartedAt:base.currentEveningStartedAt||''});})();
    if(unit)return localCall(method,args);
    return local(async()=>{if(!ready)throw Error('Tabletstand noch nicht geladen');const action={session:current,before:{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await localCall(method,args);await Promise.all(action.promises);finish(action);return result;}catch(error){if(current===action.session)project(action.before,true);throw error;}finally{unit=null;status();}
    });
  }
  function legacyAction(key,fn,args,self){
    if(unit)return fn.apply(self,args);
    return local(async()=>{if(!ready)return;const action={session:current,before:{...current.root,...snapshot()},promises:[],messages:[],opened:new Set()};action.preview=preview(action.before);unit=action;
      try{const result=await fn.apply(self,args);let n=0;while(n<action.promises.length){const chunk=action.promises.slice(n);n=action.promises.length;await Promise.all(chunk);}window.KCKranzUI?.freeze(key,action.before);finish(action,snapshot());for(const msg of action.messages.slice(-2))sharedOriginalToast?.(...msg);return result;}
      catch(error){if(current===action.session)project(action.before,true);toast(error.message);return undefined;}finally{unit=null;status();}
    });
  }
  function persist(){if(!ready||unit)return;try{stage({...current.root,...snapshot()});}catch(error){toast(error.message);}}
  async function flush(){if(unit)return true;persist();return ready;}
  async function waitForUpload(){await localTail;if(!ready)return false;persist();return drain(current);}
  async function reconnect(){if(!current)return false;if(!ready)return prepare(current.club,createEmptyClubData());current.error='';return drain(current);}
  function install(value){api=value;raw={...value};for(const name of Object.keys(api.__syncArity||{}))if(name!=='commitTabletBatch')api[name]=(...args)=>write(name,args);installActions();status();}
  function installActions(){
    const entries={
      tannenbaum:['startTannenbaumSetup','handleTannenbaumThrow','confirmTannenbaumPenaltyPlayer','confirmTannenbaumKranzNumber','confirmTannenbaumRestore','finishTannenbaumGame','resetTannenbaumGame','undoLastTannenbaumThrow','startTannenbaumGame'],darts:['startDartsGame','resetDartsGame','handleDartsThrow','confirmDartsPenaltyPlayer','finishDartsRound','finishDartsGame','confirmDartsScoreSetup','deleteDartsThrow'],lotterie:['startLotterieGame','startLotterieGameFinal','generateLotterieAmounts','resetLotterieGame','confirmLotterieThrow','confirmLotterieThrower','applyLotterieThrow','saveLotterieThrow','deleteLotterieThrow','finishLotterieGame','updateLotterieAmount','prepareLotterieColumns','updateLotteriePreStartAmount'],tiberius:['startTiberiusGameFinal','resetTiberiusGame','confirmTiberiusThrower','continueTiberiusAfterThrower','handleTiberiusThrow','undoLastTiberiusThrow','confirmTiberiusHitPenalty','finishTiberiusGame','prepareTiberiusColumns','updateTiberiusPreStartTarget','generateTiberiusTargets','updateTiberiusTarget'],mensch:['startMenschGameFinal','applyMenschThrow','finishMenschGame','undoMenschThrow','resetMenschGame'],plusminus:['startPlusminusGame','applyPlusminusThrow','undoPlusminusThrow','confirmPlusminusSlotEdit','finishPlusminusGame','resetPlusminusGame','togglePlusminusSmartGosse','choosePlusminusSlot'],sichern:['startSichernGame','sichernThrow','sichernSave','finishSichernGame','undoSichernThrow'],fuchsjagd:['startFuchsjagdGame','applyFuchsjagdThrow','finishFuchsjagd','undoFuchsjagdThrow'],tor:['startTorGame','torThrow']
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

  window.KCTabletSync=Object.freeze({install,begin,prepare,persist,flush,reconnect,waitForUpload,receive(){},capture(){return true;},status,get server(){return C.clone(server);},get ready(){return ready;},get inUnit(){return !!unit;},get working(){return false;},get originalApi(){return raw;}});
  document.addEventListener('click',e=>{if(ready&&!unit)return;if(e.target?.closest?.('.tor-person-backdrop,.kc-kranz-backdrop,.modal-overlay,.haus-modal-overlay'))return;const b=e.target?.closest?.('button,input,select,textarea');if(!b||b.closest('#club-start-screen'))return;const code=b.getAttribute('onclick')||'';if(/^(showMainTab|showSideTab|goToClubSelection|close|kcClose|KCSharedSync)/.test(code))return;e.preventDefault();e.stopImmediatePropagation();},true);
  window.addEventListener('online',()=>void reconnect());
  setInterval(()=>{for(const s of sessions.values())if(s.error||s.pending)void drain(s);},5000);
})();
