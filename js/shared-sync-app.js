/* One acknowledged server state for every app instance. Local storage is a read cache only. */
(()=>{
  const C=window.KCSharedCore;
  let api=null,raw=null,club='',epoch=0,ready=false,working=false,server=null,baseline=null,pending=[],unit=null,tail=Promise.resolve(),timer=0,lastError='',metadataOff=null,preparing=false;
  let actionBase=null;
  const formBases=new WeakMap();
  const metaBases=new Map(),modalBases=new Map();
  const id=()=> 'sync_'+crypto.randomUUID(),snapshot=()=>C.clean(typeof getFirestoreState==='function'?getFirestoreState():{}),active=()=>typeof ACTIVE_CLUB!=='undefined'&&ACTIVE_CLUB?getClubFirestoreId(ACTIVE_CLUB):'',toast=(m,t='error')=>{
    if(typeof showToast==='function')showToast(m,t);
  };
  function status(){
    let box=document.getElementById('shared-sync-status');
    if(!box){
      const app=document.getElementById('app');
      if(!app)return;
      box=document.createElement('div');
      box.id='shared-sync-status';
      box.setAttribute('role','status');
      box.innerHTML='<span></span><button type="button" onclick="KCSharedSync.reconnect()">Erneut verbinden</button>';
      app.prepend(box);
    }
    box.dataset.mode=!navigator.onLine?'offline':working?'saving':!ready?'blocked':pending.length?'pending':'ready';
    box.querySelector('span').textContent=!navigator.onLine?'Offline · Nur ansehen':working?'Änderung wird bestätigt …':!ready?(lastError||'Serverstand wird geladen · Nur ansehen'):pending.length?'Änderungen werden übertragen …':'Live synchronisiert';
    box.querySelector('button').hidden=ready||working;
  }
  function cache(){
    if(typeof syncCurrentClubToStore==='function'){
      syncCurrentClubToStore();
      saveClubSystem();
    }
  }
  function project(state){
    const previous=typeof isApplyingRemoteState!=='undefined'?isApplyingRemoteState:false;
    try{
      if(typeof isApplyingRemoteState!=='undefined')isApplyingRemoteState=true;
      applyLoadedState(C.clone(state));
      if(typeof livePersonCounters!=='undefined'){
        livePersonCounters.clear();
        for(const p of state.persons||[])livePersonCounters.set(p.name,C.clone(p));
      }
      if(typeof liveCountersReady!=='undefined')liveCountersReady=true;
      renderAll();
      if(typeof updateAppHeader==='function')updateAppHeader();
      cache();
    }
    finally{
      if(typeof isApplyingRemoteState!=='undefined')isApplyingRemoteState=previous;
    }
  }
  function accept(state){
    if(!state||active()!==club)return;
    if(server&&Number(state.syncRevision||0)<Number(server.syncRevision||0))return;
    const changedEvening=server&&state.currentEveningStartedAt!==server.currentEveningStartedAt,old=pending;
    server=C.clone(state);
    pending=[];
    project(server);
    baseline=snapshot();
    if(old.length&&!changedEvening){
      try{
        const next=C.apply(server,old);
        project(next);
        pending=C.diff(baseline,snapshot(),{
          rawBase:server
        });
      }
      catch(e){
        try{
          localStorage.setItem('kcis_sync_conflict_'+club,JSON.stringify({
            at:new Date().toISOString(),operations:old
          }));
        }
        catch{}
        toast(e.message);
      }
    }
    else if(old.length&&changedEvening)toast('Der Kegelabend wurde gewechselt. Nicht bestätigte Eingaben wurden nicht in den neuen Abend übernommen.');
    status();
  }
  function receive(state,meta={}){
    if(!state||meta.fromCache||meta.pending||working||preparing)return;
    if(!state.syncInitialized){
      ready=false;
      status();
      return;
    }
    capture();
    accept(state);
    ready=true;
    lastError='';
    status();
  }
  function begin(target){
    actionBase=null;
    preparing=false;
    epoch++;
    clearTimeout(timer);
    club=target;
    server=null;
    baseline=null;
    pending=[];
    ready=false;
    working=false;
    unit=null;
    modalBases.clear();
    lastError='';
    status();
  }
  async function prepare(target,defaults){
    if(club!==target)begin(target);
    const token=epoch;
    ready=false;
    preparing=true;
    status();
    try{
      if(!navigator.onLine)throw Error('Offline · Nur ansehen');
      const state=await raw.initializeSharedState(target,defaults,id());
      if(token!==epoch||active()!==target)return false;
      accept(state);
      ready=true;
      lastError='';
      try{
        const marker=JSON.parse(localStorage.getItem('kcis_sync_pending_'+target)||'null');
        if(marker){
          const receipt=await raw.getSharedReceipt(target,marker.opId);
          toast(receipt?'Die letzte Änderung wurde bereits gespeichert.':'Die letzte Änderung ist nicht bestätigt. Bitte den Stand prüfen und gegebenenfalls erneut eingeben.',receipt?'success':'error');
          localStorage.removeItem('kcis_sync_pending_'+target);
        }
      }
      catch{}
      status();
      return true;
    }
    catch(e){
      if(token===epoch){
        lastError='Serverstand nicht erreichbar · Nur ansehen';
        ready=false;
        status();
        toast('Der gespeicherte Gerätestand wird nicht hochgeladen. '+e.message);
      }
      return false;
    }
    finally{
      if(token===epoch)preparing=false;
    }
  }
  function capture(){
    if(!ready||working||unit||active()!==club||!baseline)return false;
    const previous=new Map(pending.map(op=>[JSON.stringify(op.path),op]));
    pending=C.diff(baseline,snapshot(),{
      rawBase:actionBase||server
    }).map(op=>{
      const old=previous.get(JSON.stringify(op.path));
      return old?{
        ...op,existed:old.existed,...(old.existed?{
          before:old.before
        }
        :{})
      }
      :op;
    });
    status();
    return true;
  }
  function persist(){
    if(unit||working)return;
    if(!ready||!navigator.onLine){
      if(server)project(server);
      status();
      return;
    }
    capture();
    cache();
    clearTimeout(timer);
    if(pending.length)timer=setTimeout(()=>{
      void flush();
    },80);
  }
  function context(method,target=club){
    return {
      method,opId:id(),eveningStartedAt:server?.currentEveningStartedAt||'',base:C.clone(actionBase||server||{}),sideOperations:C.clone(pending),metaBase:C.clone(metaBases.get(target)||{})
    };
  }
  function queue(fn){
    const work=tail.catch(()=>{}).then(fn);
    tail=work.catch(()=>{});
    return work;
  }
  async function failed(error,command){
    lastError=(error.code?'['+error.code+'] ':'')+(error.message||'Synchronisierung fehlgeschlagen');
    if(error.code==='sync-conflict'||/inzwischen|entfernt|gewechselt|veraltet/.test(lastError)){
      pending=[];
      try{
        accept(await raw.loadClubState(club));
        ready=true;
      }
      catch{
        ready=false;
      }
      toast(lastError);
      return;
    }
    ready=false;
    try{
      localStorage.setItem('kcis_sync_pending_'+command.club,JSON.stringify({
        opId:command.context.opId,method:command.method,at:new Date().toISOString()
      }));
    }
    catch{}
    window.kcPendingSharedCommand=command;
    toast('Änderung noch nicht bestätigt. Erneut verbinden prüft zuerst, ob sie bereits gespeichert wurde.');
  }
  async function execute(method,args,{
    legacy=false,operations=null,target=club,providedContext=null
  }
  ={}){
    if(!navigator.onLine||(!ready&&method!=='saveClubMeta'))throw Error('Nicht verbunden · Eingaben sind gesperrt');
    const token=epoch;
    if(method!=='startNewEvening'&&method!=='commitSharedChanges')capture();
    const ctx=providedContext||context(method,target);
    if(['startNewEvening','commitSharedChanges'].includes(method))ctx.sideOperations=[];
    if(method==='saveClubMeta'&&target!==club){
      ctx.base=await raw.loadClubState(target)||{};
      ctx.eveningStartedAt=ctx.base.currentEveningStartedAt||'';
      ctx.sideOperations=[];
    }
    working=true;
    status();
    const command={
      club:target,method,args,context:ctx,request:method==='commitSharedChanges'?{
        operations:C.clone(operations||pending),legacy
      }
      :null
    };
    try{
      let result;
      if(method==='commitSharedChanges')result=await raw.commitSharedChanges(target,command.request,ctx);
      else{
        const count=api.__syncArity[method],filled=args.slice();
        while(filled.length<count)filled.push(undefined);
        filled[count]=ctx;
        result=await raw[method](...filled);
      }
      if(token===epoch&&target===club){
        pending=[];
        working=false;
        accept(await raw.loadClubState(target));
        ready=true;
        lastError='';
        try{
          localStorage.removeItem('kcis_sync_pending_'+target);
        }
        catch{}
      }
      return result;
    }
    catch(error){
      working=false;
      if(token===epoch&&target===club)await failed(error,command);
      throw error;
    }
    finally{
      if(token===epoch){
        working=false;
        status();
      }
    }
  }
  async function flushInternal(){
    if(unit)return true;
    capture();
    if(!pending.length){
      status();
      return ready;
    }
    await execute('commitSharedChanges',[]);
    return true;
  }
  function flush(){
    if(unit)return Promise.resolve(true);
    return queue(flushInternal).catch(()=>false);
  }
  function previewStore(){
    const root='clubs/'+club+'/state/current',values={
      [root]:C.clone(server)
    };
    for(const p of snapshot().persons||[])values['clubs/'+club+'/livePersons/'+encodeURIComponent(C.norm(p.name))]=p;
    for(const key of C.games)values['clubs/'+club+'/liveGames/'+key]={
      gameKey:key,state:snapshot()[key+'State']||{},revision:0
    };
    return C.preview(values);
  }
  function localCall(method,args){
    if(method==='saveClubState')return Promise.resolve(null);
    const count=api.__syncArity[method],filled=args.slice();
    while(filled.length<count)filled.push(undefined);
    filled[count]={
      preview:unit.preview
    };
    const result=Promise.resolve(raw[method](...filled));
    unit.promises.push(result);
    return result;
  }
  function write(method,args){
    if(unit)return localCall(method,args);
    capture();
    const frozen=args.map(v=>typeof v==='function'?v:C.clone(v)),ctx=context(method,args[0]);
    return queue(()=>execute(method,frozen,{
      target:frozen[0],providedContext:ctx
    }));
  }
  async function legacyAction(key,fn,args,self){
    if(unit)return fn.apply(self,args);
    const intent=C.clone(modalBases.get(key)||server?.[key+'State']);
    return queue(async()=>{
      if(!ready||!navigator.onLine){
        toast('Nicht verbunden · Bitte erst den Serverstand laden.');
        return;
      }
      if(!C.equal(C.clean(intent),C.clean(server?.[key+'State']))){
        modalBases.delete(key);
        toast('Das Spiel wurde inzwischen geändert. Bitte den aktuellen Spielstand prüfen und erneut eingeben.');
        return;
      }
      const before=C.clone(baseline),rawBefore=C.clone(server);
      unit={
        preview:previewStore(),promises:[],messages:[],opened:new Set()
      };
      working=true;
      status();
      try{
        const result=await fn.apply(self,args);
        let count=0;
        while(count<unit.promises.length){
          const batch=unit.promises.slice(count);
          count=unit.promises.length;
          await Promise.all(batch);
        }
        window.KCKranzUI?.freeze(key,before);
        const after=snapshot(),messages=unit.messages,opened=unit.opened;
        unit=null;
        working=false;
        const operations=C.diff(before,after,{
          includeLive:true,rawBase:rawBefore
        });
        if(operations.length){
          await execute('commitSharedChanges',[],{
            legacy:true,operations
          });
          if(opened.has(key))modalBases.set(key,C.clone(after[key+'State']));
          else modalBases.delete(key);
        }
        else modalBases.set(key,rawBefore[key+'State']);
        for(const item of messages.slice(-2))if(typeof sharedOriginalToast==='function')sharedOriginalToast(...item);
        return result;
      }
      catch(error){
        unit=null;
        working=false;
        if(ready&&server)project(server);
        toast(error.message);
        return undefined;
      }
      finally{
        unit=null;
        working=false;
        status();
      }
    });
  }
  let sharedOriginalToast=null;
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
  async function reconnect(){
    return queue(async()=>{
      if(!navigator.onLine)return;
      const target=active();
      if(!target)return;
      working=true;
      status();
      try{
        const command=window.kcPendingSharedCommand;
        if(command&&command.club===target){
          const done=await raw.getSharedReceipt(target,command.context.opId);
          if(!done){
            const count=api.__syncArity[command.method];
            if(command.method==='commitSharedChanges')await raw.commitSharedChanges(target,command.request,command.context);
            else{
              const args=command.args.slice();
              while(args.length<count)args.push(undefined);
              args[count]=command.context;
              await raw[command.method](...args);
            }
          }
        }
        if(command&&command.club===target)pending=[];
        working=false;
        accept(await raw.initializeSharedState(target,typeof createEmptyClubData==='function'?createEmptyClubData():{},id()));
        ready=true;
        window.kcPendingSharedCommand=null;
        localStorage.removeItem('kcis_sync_pending_'+target);
        lastError='';
        if(pending.length)await flushInternal();
      }
      catch(e){
        pending=[];
        working=false;
        try{
          accept(await raw.initializeSharedState(target,typeof createEmptyClubData==='function'?createEmptyClubData():{},id()));
          ready=true;
          window.kcPendingSharedCommand=null;
          localStorage.removeItem('kcis_sync_pending_'+target);
        }
        catch{
          ready=false;
        }
        lastError=e.message;
        toast(e.message);
      }
      finally{
        working=false;
        status();
      }
    });
  }
  function install(value){
    api=value;
    raw={
      ...value
    };
    for(const method of Object.keys(api.__syncArity||{})){
      api[method]=(...args)=>write(method,args);
    }
    if(raw.loadClubList){
      api.loadClubList=async()=>{
        const list=await raw.loadClubList();
        for(const item of list)metaBases.set(item.id,C.clone(item));
        return list;
      };
    }
    if(raw.subscribeClubList)metadataOff=raw.subscribeClubList(list=>{
      for(const item of list){
        metaBases.set(item.id,C.clone(item));
        if(typeof CLUBS!=='undefined'){
          const name=item.name||item.id;
          if(!CLUBS[name]&&typeof createEmptyClubData==='function')CLUBS[name]=createEmptyClubData();
          if(CLUBS[name])CLUBS[name].avatar=item.avatar||'';
        }
      }
      if(typeof renderClubList==='function')renderClubList();
      if(typeof updateHeaderClubCrest==='function')updateHeaderClubCrest();
    },()=>{});
    installActions();
    installFormBases();
    status();
  }
  function installFormBases(){
    const selector='.modal-overlay,.haus-modal-overlay';
    const visible=el=>!el.hidden&&!el.classList.contains('hidden')&&el.style.display!=='none';
    for(const name of Object.keys(window).filter(name=>/^(open[A-Z]|kcOpen[A-Z])/.test(name))){
      const fn=window[name];
      if(typeof fn!=='function')continue;
      window[name]=function(...args){
        const base=C.clone(server),previous=new Set([...document.querySelectorAll(selector)].filter(visible));
        const mark=()=>{
          for(const el of document.querySelectorAll(selector))if(visible(el)&&!previous.has(el))formBases.set(el,base);
        };
        const result=fn.apply(this,args);
        mark();
        if(result?.then)result.then(mark,()=>{});
        return result;
      };
    }
    function start(event){
      const el=event.target?.closest?.(selector)||event.target?.closest?.('form');
      if(el&&!formBases.has(el))formBases.set(el,C.clone(server));
      actionBase=el?formBases.get(el):null;
    }
    document.addEventListener('focusin',start,true);
    document.addEventListener('click',start,true);
    document.addEventListener('submit',start,true);
    document.addEventListener('change',start,true);
  }
  function blocked(event){
    if(unit&&event.target?.closest?.('.tor-person-backdrop,.kc-kranz-backdrop'))return;
    if(ready&&!working&&navigator.onLine)return;
    const target=event.target?.closest?.('button,input,select,textarea,[onclick]');
    if(!target||target.closest('#club-start-screen'))return;
    const code=target.getAttribute('onclick')||'';
    if(/^(showMainTab|showSideTab|goToClubSelection|toggleSideMenu|close[A-Z]|kcClose[A-Z]|KCSharedSync\.reconnect)/.test(code)||target.matches('[data-main],a'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    status();
  }
  document.addEventListener('submit',blocked,true);
  document.addEventListener('keydown',event=>{
    if(['Enter',' '].includes(event.key))blocked(event);
  },true);
  document.addEventListener('click',blocked,true);
  document.addEventListener('beforeinput',blocked,true);
  document.addEventListener('change',blocked,true);
  window.addEventListener('offline',()=>{
    ready=false;
    clearTimeout(timer);
    status();
  });
  window.addEventListener('online',()=>void reconnect());
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&club&&navigator.onLine)void reconnect();
  });
  window.KCSharedSync=Object.freeze({
    install,begin,prepare,receive,persist,flush,reconnect,capture,status,get originalApi(){
      return raw;
    },get inUnit(){
      return !!unit;
    },get ready(){
      return ready;
    },get working(){
      return working;
    },get server(){
      return C.clone(server);
    }
  });
})();
