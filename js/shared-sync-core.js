/* Shared state protocol: targeted changes, stable identities and explicit conflicts. */
(()=>{
  const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x)),own=(x,k)=>x!=null&&Object.prototype.hasOwnProperty.call(x,k),norm=x=>String(x||'').trim().toLocaleLowerCase('de');
  const modern=['sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt'],legacy=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor'],games=[...legacy,...modern];
  const managed=new Set(['syncInitialized','syncProtocol','syncRevision','syncOperation','updatedAt','updatedClientAt','updatedClientId','date','year','month','status','currentEveningStartedAt','eveningResetOp','eveningResetRevision','dashboardClubContent','dashboardCashView','cashStandingOrders','dashboardGameOverview','dashboardRandomDraw','dashboardRules','gameOptions','gameOptionsRevision','gameOptionsCommands','gameFineSettings','gameFineSettingsRevision','gameFineSettingsCommands','penaltyStatsSettings','calendarRevision','clubCalendarData','clubKegelSerie','clubTermine','individualGameLedger','individualGameRevision',...modern.map(k=>k+'State')]);
  const derived=new Set(['strafTotal','gameFineBase','individualChargeCents','teamExtra','roundExtra']);
  const liveOwned=new Set(['drinks','strafen','rounds','freeStrafen','tannenbaumCharges','boughtThrows','paid']);
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x),equal=(a,b)=>{
    if(a===b)return true;
    if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equal(v,b[i]));
    if(object(a)&&object(b)){
      const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
      return equal(aa,bb)&&aa.every(k=>equal(a[k],b[k]));
    }
    return false;
  };
  function clean(x){
    if(Array.isArray(x))return x.map(clean);
    if(!object(x))return x;
    const out={};
    for(const [k,v] of Object.entries(x))if(v!==undefined&&!['busy','closing','syncProtocol','syncRevision','syncOperation','updatedAt','updatedClientId','updatedClientAt'].includes(k))out[k]=clean(v);
    return out;
  }
  function identity(list,path){
    if(!list.length)return null;
    const choices=path.length===1&&path[0]==='persons'?['name']:['id','key','name'];
    return choices.find(k=>list.every(x=>object(x)&&typeof x[k]==='string'&&x[k])&&new Set(list.map(x=>k==='name'?norm(x[k]):x[k])).size===list.length)||null;
  }
  function locate(root,path){
    let v=root;
    for(const p of path){
      if(object(p)){
        if(!Array.isArray(v))return {
          exists:false
        };
        v=v.find(x=>p.by==='name'?norm(x?.[p.by])===norm(p.value):x?.[p.by]===p.value);
        if(v===undefined)return {
          exists:false
        };
      }
      else{
        if(!own(v,p))return {
          exists:false
        };
        v=v[p];
      }
    }
    return {
      exists:true,value:v
    };
  }
  function write(root,path,value,exists=true){
    let v=root;
    for(let i=0;i<path.length-1;i++){
      const p=path[i];
      if(object(p)){
        const found=v.find(x=>p.by==='name'?norm(x?.[p.by])===norm(p.value):x?.[p.by]===p.value);
        if(!found)throw conflict(path);
        v=found;
      }
      else{
        if(!object(v[p])&&!Array.isArray(v[p]))v[p]=object(path[i+1])?[]:{};
        v=v[p];
      }
    }
    const p=path.at(-1);
    if(object(p)){
      const index=v.findIndex(x=>p.by==='name'?norm(x?.[p.by])===norm(p.value):x?.[p.by]===p.value);
      if(!exists){
        if(index>=0)v.splice(index,1);
      }
      else if(index>=0)v[index]=clone(value);
      else v.push(clone(value));
    }
    else if(!exists)delete v[p];
    else v[p]=clone(value);
  }
  function conflict(path){
    const e=Error('Inzwischen auf einem anderen Gerät geändert: '+path.map(p=>object(p)?p.value:p).join(' → ')+'. Der Serverstand bleibt erhalten. Bitte erneut eingeben.');
    e.code='sync-conflict';
    e.path=path;
    return e;
  }
  function diff(before,after,{
    includeLive=false,rawBase=before
  }
  ={}){
    const ops=[];
    function visit(a,b,path){
      if(equal(a,b))return;
      if(!path.length){
        for(const k of new Set([...Object.keys(a||{}),...Object.keys(b||{})]))if(!managed.has(k))visit(a?.[k],b?.[k],[k]);
        return;
      }
      if(path[0]==='persons'&&path.length>=3&&(derived.has(path[2])||!includeLive&&liveOwned.has(path[2])))return;
      const atomic=path.length===1&&(games.some(k=>path[0]===k+'State')||['seatingOrder','teamStopwatchStart','bahnTimerStart'].includes(path[0]));
      if(!atomic&&object(a)&&object(b)){
        for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!['__proto__','prototype','constructor'].includes(k))visit(a[k],b[k],[...path,k]);
        return;
      }
      if(!atomic&&Array.isArray(a)&&Array.isArray(b)){
        const by=identity(a.length?a:b,path);
        if(by&&(!a.length||identity(a,path)===by)&&(!b.length||identity(b,path)===by)){
          const key=x=>by==='name'?norm(x[by]):x[by],aa=new Map(a.map(x=>[key(x),x])),bb=new Map(b.map(x=>[key(x),x]));
          for(const k of new Set([...aa.keys(),...bb.keys()])){
            const value=(bb.get(k)||aa.get(k))[by];
            visit(aa.get(k),bb.get(k),[...path,{
              by,value
            }
            ]);
          }
          return;
        }
      }
      const base=locate(rawBase,path),op={
        path,existed:base.exists,...(base.exists?{
          before:clone(atomic?clean(base.value):base.value)
        }
        :{}),exists:b!==undefined,...(b!==undefined?{
          value:clone(atomic?clean(b):b)
        }
        :{}),atomic
      };
      if(includeLive&&path[0]==='persons'&&['drinks','strafen'].includes(path[2])&&path.length===4&&Number.isFinite(Number(b))){
        op.increment=(Number(b)||0)-(Number(a)||0);
        delete op.before;
        delete op.existed;
      }
      ops.push(op);
    }
    visit(before||{},after||{},[]);
    return ops;
  }
  function apply(current,ops,{
    allowLive=false
  }
  ={}){
    const next=clone(current||{});
    if(!Array.isArray(ops)||ops.length>4096)throw Error('Ungültige Synchronisationsänderungen');
    for(const op of ops){
      const path=op.path;
      if(!Array.isArray(path)||!path.length||path.length>30||path.some(p=>typeof p==='string'?['__proto__','prototype','constructor'].includes(p):!object(p)||!['id','key','name'].includes(p.by)||typeof p.value!=='string')||managed.has(path[0]))throw Error('Geschütztes Synchronisationsfeld');
      if(path[0]==='persons'&&path.length>=3&&(derived.has(path[2])||!allowLive&&liveOwned.has(path[2])))throw Error('Zähler werden einzeln gebucht');
      const actual=locate(next,path),value=op.atomic?clean(actual.value):actual.value;
      if(op.increment!==undefined){
        if(!allowLive||!Number.isSafeInteger(op.increment))throw Error('Ungültige Zählerbuchung');
        const n=(Number(actual.value)||0)+op.increment;
        if(!Number.isSafeInteger(n)||n<0)throw conflict(path);
        write(next,path,n);
        continue;
      }
      if(actual.exists!==op.existed||actual.exists&&!equal(value,op.before)){
        if(!op.atomic&&actual.exists===op.exists&&(!actual.exists||equal(value,op.value)))continue;
        throw conflict(path);
      }
      write(next,path,op.value,op.exists);
    }
    return next;
  }
  function totals(state,policy){
    const names=(state.persons||[]).map(p=>norm(p.name));
    if(names.some(n=>!n)||new Set(names).size!==names.length)throw Error('Personennamen müssen eindeutig sein.');
    if(!policy)return state;
    const people=clone(state.persons||[]),cat=state.STRAFEN||[],prices=state.strafPrices||{},minutes=t=>/^\d\d:\d\d$/.test(t||'')?Number(t.slice(0,2))*60+Number(t.slice(3)):null,start=minutes(state.timePenaltySettings?.startTime||'20:00'),end=minutes(state.timePenaltySettings?.endTime||'23:00'),late=cat.find(x=>/verspät|verspaet/i.test(x.label)),early=cat.find(x=>/früh|frueh/i.test(x.label)),g=cat.find(x=>/gosse|pudel/i.test(x.label)&&!/könig|koenig/i.test(x.label)),max=Math.max(0,...people.filter(p=>p.present&&!p.inactive&&!p.isDrinksOnly).map(p=>Number(p.strafen?.[g?.key])||0));
    for(const p of people){
      const arrival=minutes(p.arrivalTime),left=minutes(p.leftEarlyAt),endAbs=end!==null&&start!==null&&end<start?end+1440:end,leftAbs=left!==null&&start!==null&&left<start?left+1440:left,quarters=n=>Math.ceil(Math.max(0,n)/15),time=(arrival!==null&&start!==null?quarters(arrival-start)*policy.cents(prices[late?.key]):0)+(leftAbs!==null&&endAbs!==null?quarters(endAbs-leftAbs)*policy.cents(prices[early?.key]):0),king=max>0&&p.present&&!p.inactive&&!p.isDrinksOnly&&Number(p.strafen?.[g?.key])===max&&!(p.freeStrafen||[]).some(x=>/gossen(könig|koenig)/i.test(x.reason))?300:0;
      p.gameFineBase={
        otherNormalCents:time,otherTopCents:0,kingCents:king
      };
      p.teamExtra=0;
      p.roundExtra=(p.rounds||[]).reduce((n,r)=>n+(Number(r.total)||0),0);
    }
    for(const game of state.spiele||[]){
      const total=(state.DRINKS||[]).reduce((n,d)=>n+(Number(game.drinks?.[d.key])||0)*(Number(state.prices?.[d.key])||0),0),each=game.members?.length?total/game.members.length:0;
      for(const name of game.members||[]){
        const p=people.find(p=>p.name===name);
        if(p)p.teamExtra+=each;
      }
    }
    return {
      ...state,persons:policy.applyTotals(people,{
        ...state,persons:people
      })
    };
  }
  function preview(initial){
    const data=new Map(Object.entries(initial).map(([p,v])=>[p,clone(v)]));
    return {
      data,async run(fn){
        return fn({
          get:async ref=>({
            exists:()=>data.has(ref.path||ref),data:()=>clone(data.get(ref.path||ref))
          }),set:(ref,value,options)=>{
            const key=ref.path||ref;
            data.set(key,options?.merge?{
              ...data.get(key),...clone(value)
            }
            :clone(value));
          },delete:ref=>data.delete(ref.path||ref)
        });
      }
    };
  }
  window.KCSharedCore=Object.freeze({
    clone,clean,equal,norm,managed,modern,legacy,games,derived,liveOwned,identity,locate,write,diff,apply,conflict,totals,preview
  });
})();
