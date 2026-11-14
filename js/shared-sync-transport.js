/* Firestore transaction adapter. Every confirmed command updates one canonical root. */
(()=>{
  function create({
    db,doc,runTransaction,getDocFromServer,serverTimestamp,core,policy,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
  }){
    const ref=club=>doc(db,'clubs',club,'state','current'),personRef=(club,name)=>doc(db,'clubs',club,'livePersons',encodeURIComponent(core.norm(name))),receipt=(club,id)=>doc(db,'clubs',club,'syncCommands',id),path=r=>r.path||r;
    function stamp(value,revision,id){
      return {
        ...value,...(value.tabletClock?.serverAt?._methodName==='serverTimestamp'?{tabletClock:{...value.tabletClock,serverAt:serverTimestamp()}}:{}),syncProtocol:1,syncRevision:revision,syncOperation:id,updatedAt:serverTimestamp()
      };
    }
    const transact=handler=>runTransaction(db,handler,{maxAttempts:10});
    async function confirmedCommand(club,context,handler){
      for(let attempt=0;attempt<4;attempt++){
        let observedRevision=null;
        try{return await transact(async tx=>handler(tx,revision=>{observedRevision=revision;}));}
        catch(error){
          const code=String(error.code||'').replace(/^firestore\//,''),transient=['aborted','unavailable','deadline-exceeded'].includes(code);
          if(!context||!transient&&code!=='permission-denied')throw error;
          let advanced=false;
          if(typeof getDocFromServer==='function'){
            try{
              const proof=await getDocFromServer(receipt(club,context.opId));
              if(proof.exists()){if(context)delete context.confirmedState;return proof.data().result;}
              if(code==='permission-denied'){
                const latest=await getDocFromServer(ref(club));
                advanced=observedRevision!==null&&latest.exists()&&Number(latest.data().syncRevision||0)>observedRevision;
              }
            }catch{/* Preserve the original SDK error when confirmation is unreachable. */}
          }
          // A permission failure with an unchanged root is a real denial, not
          // evidence of a race. Never weaken rules or retry it indefinitely.
          if(attempt===3||!transient&&!advanced)throw error;
          await delay(60*Math.pow(2,attempt)+Math.floor(Math.random()*50));
        }
      }
    }
    async function initialize(club,defaults,opId){
      return transact(async tx=>{
        const target=ref(club),snap=await tx.get(target),saved=snap.exists()?snap.data():null;
        if(saved?.syncInitialized===true)return saved;
        let state=core.clone({
          ...defaults,...saved
        });
        const people=[];
        for(const p of state.persons||[]){
          const live=await tx.get(personRef(club,p.name));
          people.push(live.exists()?{
            ...p,...core.clean(live.data()),name:p.name
          }
          :p);
        }
        const gameDocs=[];
        for(const key of core.games){
          const target=doc(db,'clubs',club,'liveGames',key),game=await tx.get(target);
          gameDocs.push({
            target,key,data:game.exists()?game.data():null
          });
        }
        const seatingRef=doc(db,'clubs',club,'live','seating'),seatingSnap=await tx.get(seatingRef),seating=seatingSnap.exists()?seatingSnap.data():null;
        if(seating&&(!saved?.seatingOrder||(seating.updatedAt?.toMillis?.()||0)>(saved?.updatedAt?.toMillis?.()||0))){
          if(seating.seatingOrder)state.seatingOrder=core.clone(seating.seatingOrder);
          if(seating.groupSettings)state.groupSettings=core.clone(seating.groupSettings);
        }
        state.persons=people;
        for(const item of gameDocs){
          const data=item.data,game=data?.state||data,rootGame=state[item.key+'State'];
          if(!game||game.eveningStartedAt&&state.currentEveningStartedAt&&game.eveningStartedAt!==state.currentEveningStartedAt)continue;
          const time=x=>x?.toMillis?.()||0;
          if(!rootGame||time(data.updatedAt)>time(saved?.updatedAt))state[item.key+'State']=core.clean(game);
        }
        state=core.totals(state,policy);
        state=stamp({
          ...state,syncInitialized:true
        },(Number(saved?.syncRevision)||0)+1,opId);
        tx.set(receipt(club,opId),{
          commandId:opId,kind:'initialize',createdAt:serverTimestamp()
        });
        tx.set(target,state);
        tx.set(seatingRef,stamp({
          seatingOrder:state.seatingOrder||[],groupSettings:state.groupSettings||{}
        },state.syncRevision,opId));
        for(const p of state.persons)tx.set(personRef(club,p.name),stamp(p,state.syncRevision,opId));
        for(const item of gameDocs)if(state[item.key+'State'])tx.set(item.target,stamp({
          gameKey:item.key,state:state[item.key+'State'],revision:Number(item.data?.revision||0)+1
        },state.syncRevision,opId));
        return state;
      });
    }
    async function transaction(club,context,fn){
      if(context?.preview)return context.preview.run(fn);
      return confirmedCommand(club,context,async(raw,observed)=>{
        if(context)delete context.confirmedState;
        const rootRef=ref(club),commandRef=context?receipt(club,context.opId):null;
        const [rootSnap,done]=await Promise.all([raw.get(rootRef),commandRef?raw.get(commandRef):Promise.resolve(null)]),root=rootSnap.exists()?rootSnap.data():{};
        observed(Number(root.syncRevision)||0);
        if(!context){
          if(root.syncProtocol)throw Error('Diese App-Version ist veraltet. Bitte neu laden.');
          return fn(raw);
        }
        if(!/^sync_[a-zA-Z0-9_-]{1,120}$/.test(context.opId||''))throw Error('Ungültige Synchronisationskennung');
        if(done.exists())return done.data().result;
        if(String(context.eveningStartedAt||'')!==String(root.currentEveningStartedAt||''))throw core.conflict(['Kegelabend']);
        const cache=new Map([[path(rootRef),rootSnap]]),writes=new Map();
        const facade={
          get:async target=>{
            const k=path(target);
            if(writes.has(k)){
              const row=writes.get(k);
              return {
                exists:()=>!row.deleted,data:()=>core.clone(row.value)
              };
            }
            if(!cache.has(k))cache.set(k,await raw.get(target));
            return cache.get(k);
          },set:(target,value,opts)=>{
            const k=path(target),old=writes.get(k)?.value||(cache.get(k)?.exists()?cache.get(k).data():{});
            writes.set(k,{
              target,value:opts?.merge?{
                ...old,...value
              }
              :value,partial:value,merge:!!opts?.merge
            });
          },delete:target=>writes.set(path(target),{
            target,deleted:true
          })
        };
        const result=await fn(facade);
        if(!writes.size&&!context.sideOperations?.length){context.confirmedState=core.clone(root);return result;}
        let next=writes.get(path(rootRef))?.value||core.clone(root);
        const absolute=['saveLivePersonStatus','saveLivePerson','saveLivePersonPayment'];
        for(const row of writes.values()){
          const parts=path(row.target).split('/');
          if(parts[0]!=='clubs'||parts[1]!==club)throw Error('Falscher Club in Synchronisation');
          if(parts.length===2&&context.method!=='commitTabletBatch'){
            const old=cache.get(path(row.target))?.exists()?core.clean(cache.get(path(row.target)).data()):{},base=core.clean(context.metaBase||{}),partial=core.clean(row.partial);
            delete partial.id;
            if(old.createdAt)partial.createdAt=old.createdAt;
            const proposed={
              ...base,...partial
            };
            row.value=core.apply(old,core.diff(base,proposed));
          }
          else if(parts[2]==='archive'&&context.method==='archiveClubEvent'){
            if(cache.get(path(row.target))?.exists())throw core.conflict(['Archiv',parts[3]]);
          }
          else if(parts[2]==='livePersons'){
            const currentDoc=cache.get(path(row.target))?.exists()?cache.get(path(row.target)).data():{},name=row.value?.name||currentDoc.name;
            if(!name)throw Error('Personenname fehlt');
            const current=(next.persons||[]).find(p=>core.norm(p.name)===core.norm(name));
            if(row.deleted){
              const base=context.base?.persons?.find(p=>core.norm(p.name)===core.norm(name));
              if(!core.equal(core.clean(base),core.clean(current)))throw core.conflict(['persons',name]);
              next.persons=(next.persons||[]).filter(p=>core.norm(p.name)!==core.norm(name));
              continue;
            }
            if(!current&&context.method!=='seedLivePersons'&&context.method!=='saveLivePerson')throw Error('Person wurde inzwischen entfernt.');
            let merged={
              ...current,...core.clean(row.value),name
            };
            if(absolute.includes(context.method)){
              const base=context.base?.persons?.find(p=>core.norm(p.name)===core.norm(name))||{},proposed={
                ...base,...core.clean(row.partial)
              };
              const ops=core.diff({
                person:base
              },{
                person:proposed
              });
              merged=core.apply({
                person:current||{}
              },ops).person;
            }
            next.persons=(next.persons||[]).some(p=>core.norm(p.name)===core.norm(name))?next.persons.map(p=>core.norm(p.name)===core.norm(name)?merged:p):[...(next.persons||[]),merged];
            row.value=merged;
          }
          else if(parts[2]==='liveGames'){
            const key=parts[3],field=key+'State';
            if(!core.games.includes(key))throw Error('Unbekanntes Spiel');
            if(!['startNewEvening','commitSharedChanges'].includes(context.method)&&!core.equal(core.clean(context.base?.[field]),core.clean(root[field])))throw core.conflict([field]);
            next[field]=row.deleted?null:core.clean(row.value.state||{});
          }
          else if(parts[2]==='live'&&parts[3]==='seating'&&context.method!=='startNewEvening'){
            const proposed={
              seatingOrder:row.value.seatingOrder,groupSettings:row.value.groupSettings
            },base={
              seatingOrder:context.base?.seatingOrder,groupSettings:context.base?.groupSettings
            };
            const merged=core.apply({
              seatingOrder:next.seatingOrder,groupSettings:next.groupSettings
            },core.diff(base,proposed));
            Object.assign(next,merged);
          }
        }
        if(context.sideOperations?.length){
          const sides=context.sideOperations.filter(op=>{
            const original=core.locate(root,op.path),actual=core.locate(next,op.path);
            if(op.path[0]==='persons'&&op.path.length===2&&!original.exists&&!op.existed&&actual.exists&&op.exists){
              core.write(next,op.path,{
                ...op.value,...actual.value
              });
              return false;
            }
            return !(original.exists===op.existed&&(!original.exists||core.equal(op.atomic?core.clean(original.value):original.value,op.before))&&actual.exists===op.exists&&(!actual.exists||core.equal(op.atomic?core.clean(actual.value):actual.value,op.value)));
          });
          next=core.apply(next,sides);
        }
        if(!next.currentEveningStartedAt&&(core.legacy.some(k=>next[k+'State']?.active)||next.penaltyStatsLog?.length))next.currentEveningStartedAt=(next.penaltyStatsLog||[]).find(x=>x.eveningStartedAt)?.eveningStartedAt||new Date().toISOString();
        // Tablet batches already contain the final focus after all coalesced actions.
        const started=context.method==='commitTabletBatch'?null:core.games.find(key=>{const a=root[key+'State'],b=next[key+'State'];return b?.active&&(!a?.active||a.id!==b.id||a.startedAt!==b.startedAt);});
        if(started){next.dashboardActiveGame=started;next.dashboardGameOverview={...next.dashboardGameOverview,open:false,revision:Number(next.dashboardGameOverview?.revision||0)+1};for(const key of ['dashboardCashView','dashboardClubContent','dashboardRules'])if(next[key]?.open)next[key]={...next[key],open:false,revision:Number(next[key].revision||0)+1};}
        if(context.method!=='commitTabletBatch'&&next.dashboardGameOverview?.selectedGame){
          const changed=core.games.filter(key=>!core.equal(core.clean(root[key+'State']),core.clean(next[key+'State'])));
          if(changed.length===1){next.dashboardActiveGame=changed[0];next.dashboardGameOverview={...next.dashboardGameOverview,selectedGame:changed[0]};}
        }
        next=core.totals(next,policy);
        const revision=(Number(root.syncRevision)||0)+1,id=context.opId;
        // The root transaction protects these mirrors; do not read rows whose old values are unused.
        const mirrors=[];
        for(const p of next.persons||[]){
          const previous=(root.persons||[]).find(x=>core.norm(x.name)===core.norm(p.name));
          if(!core.equal(previous,p)){
            const target=personRef(club,p.name);
            mirrors.push({
              target,value:p
            });
          }
        }
        for(const p of root.persons||[])if(!(next.persons||[]).some(x=>core.norm(x.name)===core.norm(p.name))){
          const target=personRef(club,p.name);
          mirrors.push({
            target,deleted:true
          });
        }
        await Promise.all(core.games.filter(key=>!core.equal(root[key+'State'],next[key+'State'])).map(async key=>{
          const target=doc(db,'clubs',club,'liveGames',key),old=await facade.get(target);
          mirrors.push({target,value:{gameKey:key,state:next[key+'State']||{},revision:Number(old.exists()?old.data().revision:0)+1}});
        }));
        if(!core.equal(root.seatingOrder,next.seatingOrder)||!core.equal(root.groupSettings,next.groupSettings)){
          const target=doc(db,'clubs',club,'live','seating');
          mirrors.push({
            target,value:{
              seatingOrder:next.seatingOrder||[],groupSettings:next.groupSettings||{}
            }
          });
        }
        for(const row of mirrors)writes.set(path(row.target),row);
        next=stamp(next,revision,id);
        writes.set(path(rootRef),{
          target:rootRef,value:next
        });
        const cleanResult=result===undefined?null:JSON.parse(JSON.stringify(result));
        raw.set(commandRef,{
          commandId:id,kind:context.method,createdAt:serverTimestamp(),result:cleanResult
        });
        for(const row of writes.values()){
          if(row.deleted)raw.delete(row.target);
          else raw.set(row.target,stamp(row.value,revision,id));
        }
        context.confirmedState=core.clone(next);
        return result;
      });
    }
    async function changes(club,request,context){
      return transaction(club,context,async tx=>{
        const target=ref(club),snap=await tx.get(target),current=snap.exists()?snap.data():{},next=core.apply(current,request.operations,{
          allowLive:!!request.legacy
        });
        tx.set(target,next);
        return {
          accepted:true
        };
      });
    }
    return Object.freeze({
      initialize,transaction,changes
    });
  }
  window.KCSharedTransport=Object.freeze({
    create
  });
})();
