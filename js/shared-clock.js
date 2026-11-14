/* Abgeglichene Uhr; das Dashboard folgt für Countdowns dem Zeitanker des Tablets. */
(() => {
  const create=({wall=()=>Date.now(),mono=()=>performance.now(),fetcher=typeof fetch==='function'?fetch.bind(globalThis):null}={})=>{
    let config=null,club='',pending=null,anchor=null,tablet=null,lastSync=-Infinity,lastTry=-Infinity;
    const now=()=>anchor?anchor.time+mono()-anchor.mono:wall();
    // Compare reference times captured together; a Firestore commit can finish seconds later.
    const timerNow=()=>tablet?anchor&&Number.isFinite(tablet.reference)?tablet.time+Math.max(0,now()-tablet.reference):tablet.time+mono()-tablet.mono:now();
    const captureTablet=()=>({time:timerNow(),...(anchor?{serverTime:now()}:{})});
    function followTablet(value){
      if(!value||!Number.isFinite(value.time)||!Number.isSafeInteger(value.sequence)||value.sequence<1||tablet&&value.sequence<=tablet.sequence)return false;
      const stamp=value.serverAt,written=typeof stamp?.toMillis==='function'?stamp.toMillis():typeof stamp==='string'?Date.parse(stamp):Number(stamp?.seconds??stamp?._seconds)*1000+Number(stamp?.nanoseconds??stamp?._nanoseconds??0)/1e6;
      const reference=Number.isFinite(value.serverTime)?value.serverTime:written;
      tablet={sequence:value.sequence,time:value.time,reference,mono:mono()};return true;
    }
    function resetTablet(){tablet=null;}
    async function sample(target){
      const database='projects/'+config.projectId+'/databases/(default)',path=database+'/documents/clubs/'+target+'/state/current';
      const controller=typeof AbortController==='function'?new AbortController():null,timeout=controller?setTimeout(()=>controller.abort(),4000):null;
      try{
        const start=mono(),response=await fetcher('https://firestore.googleapis.com/v1/'+database+'/documents:batchGet?key='+encodeURIComponent(config.apiKey),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({documents:[path],mask:{fieldPaths:['syncRevision']}}),...(controller?{signal:controller.signal}:{})});
        if(!response.ok)throw Error('Zeitabgleich nicht erreichbar');
        const data=await response.json(),end=mono(),rows=Array.isArray(data)?data:[data],time=Date.parse(rows.find(row=>row.readTime)?.readTime);
        if(!Number.isFinite(time)||end-start>4000||end<start)throw Error('Zeitabgleich ungültig oder zu langsam');
        return {time:time+(end-start)/2,mono:end,rtt:end-start};
      }finally{if(timeout!==null)clearTimeout(timeout);}
    }
    async function sync(force=false){
      if(!config||!club||!fetcher)return !fetcher;
      if(pending)return pending;
      if(!force&&anchor&&mono()-lastSync<300000)return true;
      if(!force&&mono()-lastTry<10000)return !!anchor;
      const target=club;lastTry=mono();
      pending=(async()=>{
        const results=await Promise.all([sample(target).catch(()=>null),sample(target).catch(()=>null),sample(target).catch(()=>null)]),best=results.filter(Boolean).sort((a,b)=>a.rtt-b.rtt)[0];
        if(best){anchor=best;lastSync=mono();return true;}
        return !!anchor;
      })().finally(()=>pending=null);
      return pending;
    }
    function useClub(value){club=String(value||'');return sync();}
    function configure(value){config=value;}
    function seconds({active,running,start,remaining,duration},at=timerNow()){
      if(!active)return 0;
      let ms=Math.max(0,Number(remaining??duration)||0)*1000;
      const stamp=Date.parse(start);if(running&&Number.isFinite(stamp))ms-=Math.max(0,at-stamp);
      return Math.max(0,Math.ceil(ms/1000));
    }
    return Object.freeze({configure,useClub,sync,now,timerNow,captureTablet,followTablet,resetTablet,seconds,get enabled(){return !!fetcher&&!!config;},get ready(){return !!anchor;}});
  };
  const clock=create();window.KCSharedClock=Object.freeze({...clock,configure:clock.configure,useClub:clock.useClub,sync:clock.sync,now:clock.now,timerNow:clock.timerNow,captureTablet:clock.captureTablet,followTablet:clock.followTablet,resetTablet:clock.resetTablet,seconds:clock.seconds,create,get enabled(){return clock.enabled;},get ready(){return clock.ready;}});
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void clock.sync(true);});
  window.addEventListener?.('online',()=>void clock.sync(true));
  if(typeof setInterval==='function')setInterval(()=>void clock.sync(),300000);
})();
