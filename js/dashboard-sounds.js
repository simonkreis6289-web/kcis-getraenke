/* Ausschließlich im Dashboard geladen. Audio wird erst durch eine bewusste Benutzeraktion aktiviert. */
(() => {
 const button=document.getElementById('dashboard-sound-toggle'),slider=document.getElementById('dashboard-sound-volume'),label=document.getElementById('dashboard-sound-status');
 const Audio=window.AudioContext||window.webkitAudioContext;let context=null,master=null,enabled=false,request=0,volume=45,scope='',initialized=false,timerState=null,nextThrow=0;
 const seen=new Set(),voices=new Set(),samples=new Map(),sampleLoads=new Map();
 const sampleUrls={nine:'sounds/bowling-strike.mp3',gutter:'sounds/zonk.mp3'};let playbackEpoch=0;
 try{const saved=window.localStorage?.getItem('kc_dashboard_volume');if(saved!==null&&saved!==undefined&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(100,Number(saved)));}catch(_){}
 function update(message){
  if(button){button.disabled=!Audio;button.textContent=!Audio?'Ton nicht verfügbar':enabled?'Ton aus':'Ton an';button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Dashboard-Töne ausschalten':'Dashboard-Töne aktivieren';}
  if(slider)slider.value=String(volume);
  if(label)label.textContent=message||(!Audio?'Dieser Browser unterstützt keine Dashboard-Töne.':enabled?'Ton eingeschaltet · '+volume+' %':'Ton ausgeschaltet. Zum Aktivieren oben „Ton an“ drücken.');
 }
 function applyVolume(){if(master){master.gain.cancelScheduledValues(context.currentTime);master.gain.setTargetAtTime(enabled?volume/100*.45:0,context.currentTime,.02);}}
 function stop(){
  playbackEpoch++;nextThrow=0;for(const oscillator of voices){try{oscillator.stop();}catch(_){}try{oscillator.disconnect();}catch(_){}}voices.clear();
 }
 function canPlay(){return enabled&&context?.state==='running'&&!document.hidden&&volume>0;}
 async function loadSample(kind){
  if(samples.has(kind))return samples.get(kind);
  if(sampleLoads.has(kind))return sampleLoads.get(kind);
  const task=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch(sampleUrls[kind],{signal:controller.signal});if(!response.ok)throw Error('Audio '+response.status);
    const buffer=await context.decodeAudioData(await response.arrayBuffer());samples.set(kind,buffer);return buffer;
   }finally{clearTimeout(timeout);}
  })();
  sampleLoads.set(kind,task);
  try{return await task;}finally{sampleLoads.delete(kind);}
 }
 function playSample(kind,at){
  const start=buffer=>{
   const source=context.createBufferSource();source.buffer=buffer;source.connect(master);voices.add(source);
   source.onended=()=>{voices.delete(source);source.disconnect();};source.start(Math.max(context.currentTime+.01,at));
   source.stop(Math.max(context.currentTime+.01,at)+buffer.duration+.02);
  };
  if(samples.has(kind)){start(samples.get(kind));return;}
  const epoch=playbackEpoch,requested=Date.now();
  void loadSample(kind).then(buffer=>{if(epoch===playbackEpoch&&canPlay()&&Date.now()-requested<2500)start(buffer);}).catch(()=>{
   if(epoch===playbackEpoch&&enabled)update('Sounddatei konnte nicht geladen werden. Bitte Ton aus- und wieder einschalten.');
  });
 }
 function note(at,length,frequency,end=frequency,type='sine'){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);if(end!==frequency)oscillator.frequency.exponentialRampToValueAtTime(end,at+length);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.2,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  oscillator.connect(gain);gain.connect(master);voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+length+.02);
 }
 function play(kind){
  if(!canPlay())return false;
  try{
   const now=context.currentTime+.02,throwSound=kind==='nine'||kind==='gutter';if(throwSound&&nextThrow>now+1.5)return false;const at=throwSound?Math.max(now,nextThrow):now;
   if(kind==='nine'||kind==='gutter'){playSample(kind,at);nextThrow=at+(samples.get(kind)?.duration||1.6);}
   else if(kind==='tick')note(at,.035,1200,900,'square');
   else if(kind==='finish'){[0,.23,.46].forEach(offset=>{note(at+offset,.19,1046.5);note(at+offset,.19,1318.5);});}
   else return false;
   return true;
  }catch(_){enabled=false;stop();update('Ton konnte nicht abgespielt werden. Bitte erneut aktivieren.');return false;}
 }
 async function toggle(){
  const token=++request;if(enabled){enabled=false;stop();applyVolume();update();return;}
  if(!Audio){update();return;}
  try{
   if(!context){context=new Audio();master=context.createGain();master.connect(context.destination);context.onstatechange=()=>{if(context.state!=='running'){enabled=false;stop();update('Ton pausiert. Bitte oben erneut „Ton an“ drücken.');}};}
   if(context.state!=='running')await context.resume();if(token!==request)return;
   enabled=context.state==='running';applyVolume();update(enabled?'Ton eingeschaltet · Sounddateien werden geladen …':'Ton wurde vom Browser gesperrt. Bitte erneut aktivieren.');
   if(enabled){
    play('tick');const results=await Promise.allSettled(Object.keys(sampleUrls).map(loadSample));
    if(token!==request)return;
    update(results.some(result=>result.status==='rejected')?'Ein Sound konnte nicht geladen werden. Bitte Ton erneut aktivieren.':undefined);
   }
  }catch(_){enabled=false;update('Ton konnte nicht aktiviert werden. Bitte erneut versuchen.');}
 }
 function setVolume(value){volume=Math.max(0,Math.min(100,Number(value)||0));applyVolume();try{window.localStorage?.setItem('kc_dashboard_volume',String(volume));}catch(_){}update();}
 function reset(){scope='';initialized=false;seen.clear();timerState=null;stop();}
 function feed(state,club,now=Date.now()){
  const next=String(club||'')+'|'+String(state?.currentEveningStartedAt||'');if(next!==scope){reset();scope=next;}
  if(!state)return;
  const evening=String(state.currentEveningStartedAt||''),start=Date.parse(evening),fresh=[];
  for(const event of Array.isArray(state.penaltyStatsLog)?state.penaltyStatsLog:[]){
   if(!event?.id||seen.has(event.id))continue;seen.add(event.id);
   const at=Date.parse(event.createdAt);if(event.eveningStartedAt?String(event.eveningStartedAt)!==evening:Number.isFinite(start)&&(!Number.isFinite(at)||at<start))continue;
   if(!initialized||!Number.isFinite(at)||now-at>30000||now-at< -5000)continue;
   const type=String(event.type||'').toLowerCase(),kind=['9er','kranz','durchgeworfen'].includes(type)?'nine':type==='gosse'?'gutter':null;if(kind)fresh.push({kind,at});
  }
  initialized=true;fresh.sort((a,b)=>a.at-b.at);for(const event of fresh.slice(-3))play(event.kind);
 }
 function timer(active,running,seconds,now=Date.now()){
  if(!active){timerState={active:false,seconds:0,at:now,running:false,sounded:new Set()};return;}
  seconds=Math.max(0,Math.ceil(Number(seconds)||0));const before=timerState;
  if(!before){timerState={active:true,seconds,at:now,running:!!running,sounded:new Set([seconds])};return;}
  const sounded=(!before.active||seconds>before.seconds)?new Set():before.sounded;
  if(running&&seconds>0&&seconds<=10&&(!before.active||seconds<before.seconds)&&!sounded.has(seconds)){sounded.add(seconds);play('tick');}
  if(seconds===0&&before.active&&before.running&&before.seconds>0&&now-before.at<=2500&&!sounded.has(0)){sounded.add(0);play('finish');}
  timerState={active:true,seconds,at:now,running:!!running,sounded};
 }
 function test(kind){if(!enabled){update('Zum Testen zuerst oben „Ton an“ drücken.');return false;}return play(kind);}
 button?.addEventListener('click',()=>void toggle());slider?.addEventListener('input',()=>setVolume(slider.value));
 for(const control of document.querySelectorAll('[data-dashboard-sound-test]'))control.addEventListener('click',()=>test(control.dataset.dashboardSoundTest));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.KCDashboardSounds=Object.freeze({feed,timer,reset,toggle,setVolume,test});update();
})();
