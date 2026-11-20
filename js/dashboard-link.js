/* Anzeige direkt übertragen. Empfangene Ansichten werden niemals zurück in die Kasse geschrieben. */
(()=>{
 const games=['tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend','abschreibung','lottokoenig','tageskurs','swingerclub'];
 const fields=['dashboardSettings','persons','DRINKS','prices','STRAFEN','strafPrices','STRAFEN_LIMIT','timePenaltySettings','wurfSettings','TANNENBAUM_BASE','hausnummerSettings','seatingOrder','groupSettings','clubCalendarData','clubTermine','clubKegelSerie','dashboardActiveGame','dashboardGameOverview','dashboardCashView','dashboardClubContent','dashboardRules','dashboardDraw','dashboardRandomDraw','dashboardAnnouncement','gameOptions','bahnTimerStart','bahnTimerRunning','bahnElapsedSeconds','bahnPreisProStunde','teamStopwatchActive','teamStopwatchRunning','teamStopwatchStart','teamCountdownDuration','teamCountdownRemainingBefore','currentEveningStartedAt','eveningResetRevision',...games.map(k=>k+'State')];
 const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>('0'+n.toString(16)).slice(-2)).join(''),stamp=()=>window.KCSharedClock?.now()??Date.now();
 function lean(value){if(Array.isArray(value))return value.map(lean);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['undoStack','commands','receipts'].includes(k)).map(([k,v])=>[k,lean(v)]));return value;}
 function project(state){
  const out={};
  for(const key of fields)if(state[key]!==undefined)out[key]=lean(state[key]);
  const log=Array.isArray(state.penaltyStatsLog)?state.penaltyStatsLog:[];
  // Quick bookings prepend entries, while some game transactions append them.
  const recent=log.map(event=>({event,at:Date.parse(event?.createdAt)||0})).sort((a,b)=>b.at-a.at).slice(0,64);
  out.penaltyStatsLog=lean(recent.map(({event})=>event));
  return out;
 }
 function valid(frame,club){return (frame?.operations===undefined||Array.isArray(frame.operations)&&frame.operations.length<=4)&&frame?.v===1&&frame.club===club&&typeof frame.source==='string'&&frame.source.length<100&&Number.isSafeInteger(frame.sequence)&&frame.sequence>=0&&frame.state&&typeof frame.state==='object'&&!Array.isArray(frame.state)&&typeof frame.baseEvening==='string';}
 function reconcile(base,frame){
  if(!base||!frame||frame.conflict||frame.sequence<=Number(base.tabletSequence||0))return base;
  if(Number.isSafeInteger(frame.baseRevision)&&Number(base.syncRevision||0)>frame.baseRevision&&
     !frame.operations?.includes(base.syncOperation))return base;
  const evening=String(base.currentEveningStartedAt||''),next=String(frame.state.currentEveningStartedAt||'');
  if(evening!==next&&(evening!==frame.baseEvening||Number(frame.state.eveningResetRevision||0)<=Number(base.eveningResetRevision||0)))return base;
  const view={...base};for(const k of [...fields,'penaltyStatsLog'])if(Object.hasOwn(frame.state,k))view[k]=frame.state[k];return {...view,directClubDocuments:frame.content||{},tabletClock:{...frame.clock,sequence:frame.sequence}};
 }
 // Host-only ICE: keep mDNS names and private/link-local addresses, including tablet hotspot interfaces.
 function localAddress(address){
  if(/^::ffff:\d/i.test(address))address=address.slice(7);
  if(/^[a-z0-9-]+\.local$/i.test(address))return true;
  const octets=address.split('.').map(Number);
  if(/^\d+\.\d+\.\d+\.\d+$/.test(address)&&octets.every(n=>n>=0&&n<=255)){
   const [a,b]=octets;
   return a===10||a===172&&b>=16&&b<=31||a===192&&b===168||a===169&&b===254;
  }
  return address.includes(':')&&/^(?:f[cd][a-f0-9]{2}|fe[89ab][a-f0-9]):/i.test(address);
 }
 function lanDescription(description){
  const lines=description?.sdp?.split(/\r?\n/);
  if(!lines)return null;
  let count=0;
  const sdp=lines.filter(line=>{
   if(!line.startsWith('a=candidate:'))return !line.startsWith('a=remote-candidates:');
   const candidate=line.trim().split(/\s+/);
   const allowed=candidate[6]==='typ'&&candidate[7]==='host'&&localAddress(candidate[4]||'');
   if(allowed)count++;
   return allowed;
  }).join('\r\n');
  return count?{type:description.type,sdp}:null;
 }
 async function route(pc){
  if(typeof pc?.getStats!=='function')return 'unknown';
  try{
   const stats=await pc.getStats();let selected=null,nominated=null;
   stats.forEach(row=>{
    if(row.type==='transport'&&row.selectedCandidatePairId)selected=stats.get(row.selectedCandidatePairId);
    if(row.type==='candidate-pair'&&(row.selected||row.nominated&&row.state==='succeeded'))nominated=row;
   });
   const pair=selected||nominated;
   const a=stats.get(pair?.localCandidateId),b=stats.get(pair?.remoteCandidateId);
   const local=a?.candidateType,remote=b?.candidateType;
   if(local==='relay'||remote==='relay')return 'relay';
   if(local==='host'&&remote==='host')return [a,b].every(candidate=>{const ip=candidate.address||candidate.ip;return !ip||localAddress(ip);})?'local':'public';
   return local&&remote?'peer':'unknown';
  }catch{return 'unknown';}
 }
 function create({role,club,api,getBase=()=>null,onFrame=()=>{},onStatus=()=>{}}){
  const BC=window.BroadcastChannel,PC=window.RTCPeerConnection||window.webkitRTCPeerConnection;
  if(!BC&&!PC&&!api?.subscribeDashboardDiagnostic)return {publish(){},close(){}};
  let closed=false,latest=null,bc=null,unsub=null,viewerUnsub=null,busy=false,nextOfferAt=0,viewerPeer=null,serial=0,version=0,attempts=0;
  const created=Date.now(),monotonic=()=>window.performance?.now()??Date.now();
  const diagnosticOff=[];
  let lastViaPeer=false,presence=null,lastPresence=0,presenceBusy=false,lastProbe='',probe=null;
  const diagnosticAvailable=!!(api?.subscribeDashboardDiagnostic&&api?.sendDashboardDiagnostic);
  const source=uid(),peers=new Map(),acks=new Map(),assembling=new Map();let viewerId=uid();
  try{if(role==='viewer'&&window.sessionStorage){const key='kcis_tv_peer_'+club,saved=window.sessionStorage.getItem(key);if(/^[a-zA-Z0-9_-]{1,80}$/.test(saved||''))viewerId=saved;else window.sessionStorage.setItem(key,viewerId);}}catch{}
  function report(){
   const now=Date.now();
   for(const [id,row] of acks)if(now-row.at>8000)acks.delete(id);
   const acknowledged=[...acks.values()].sort((a,b)=>Number(!!b.peer)-Number(!!a.peer))[0];
   const cloud=!!(presence?.expiresAt>stamp()&&window.navigator?.onLine!==false);
   const direct=acknowledged?.peer?.local===true||role==='viewer'&&viewerPeer?.local===true&&viewerPeer.heard>0&&now-viewerPeer.heard<10000&&lastViaPeer;
   const mode=direct?'direct':cloud?'firebase':now-created<12000?'connecting':'disconnected';
   try{onStatus({mode,direct,peers:acks.size,webrtc:typeof PC==='function',
    tvWebrtc:acknowledged?.webrtc??(cloud?presence.webrtc:undefined),
    route:acknowledged?(acknowledged.peer?acknowledged.peer.route||'unknown':'browser'):null});}catch{}
  }
  const post=msg=>{try{bc?.postMessage(msg);}catch{}};
  const channelSend=(peer,msg)=>{if(peer?.dc?.readyState!=='open')return;try{peer.dc.send(JSON.stringify(msg));}catch{}};
  function received(frame,via,peer){
   if(!valid(frame,club)||peer&&(!peer.local||frame.source!==peer.source))return;
   lastViaPeer=!!peer;
   onFrame(frame,via);
   const ack={kind:'ack',club,viewerId,source:frame.source,sequence:frame.sequence,version:frame.version,webrtc:typeof PC==='function'};
   if(peer){peer.heard=Date.now();peer.sequence=frame.sequence;peer.version=frame.version;attempts=0;nextOfferAt=0;channelSend(peer,ack);}else post(ack);
   report();
  }
  function settleProbe(id,result){
   if(probe?.id!==id)return;
   const pending=probe;probe=null;clearTimeout(pending.timer);
   pending.resolve(result?{...result,ms:Math.max(0,monotonic()-pending.started)}:null);
  }
  function peerMessage(msg,peer){
   if(msg?.club!==club)return false;
   if(peer&&!peer.local)return false;
   if(role==='publisher'&&peer&&msg.kind==='hello'&&msg.connectionId===peer.id&&msg.viewerId===peer.viewerId){
    peer.hello=true;peer.heard=Date.now();if(latest)send(peer,latest);return true;
   }
   if(role==='publisher'&&msg.kind==='ack'&&msg.source===source&&typeof msg.viewerId==='string'&&msg.viewerId.length<=80&&(!peer||peer.hello&&msg.viewerId===peer.viewerId)){
    if(peer){peer.heard=Date.now();peer.sequence=msg.sequence;peer.version=msg.version;}
    acks.set(msg.viewerId,{at:Date.now(),webrtc:msg.webrtc===true,peer});
    report();return true;
   }
   if(role==='viewer'&&msg.kind==='ping'&&typeof msg.id==='string'&&msg.id.length<=80){
    const pong={kind:'pong',club,id:msg.id,webrtc:typeof PC==='function'};
    if(peer){
     peer.heard=Date.now();channelSend(peer,pong);
     if(peer.sequence!==undefined)channelSend(peer,{kind:'ack',club,viewerId,source:peer.source,sequence:peer.sequence,version:peer.version,webrtc:true});
    }else post(pong);
    return true;
   }
   if(role==='publisher'&&msg.kind==='pong'&&probe?.via==='direct'&&probe.peer===peer){
    settleProbe(msg.id,{via:peer?'webrtc':'browser',route:peer?.route||'unknown'});return true;
   }
   return false;
  }
  function measure(via,peer){
   return new Promise(resolve=>{
    const id=uid(),started=monotonic(),timer=setTimeout(()=>settleProbe(id,null),via==='direct'?2500:10000);
    probe={id,started,timer,resolve,via,peer};
    const msg={kind:'ping',club,id};
    if(via==='direct'){
     if(peer)channelSend(peer,msg);else post(msg);
    }else void Promise.resolve().then(()=>api.sendDashboardDiagnostic(club,msg)).then(ok=>{if(!ok)settleProbe(id,null);},()=>settleProbe(id,null));
   });
  }
  let testing=false;
  async function test(){
   if(closed||role!=='publisher'||testing)return null;
   testing=true;
   try{
    const live=[...acks.values()].filter(row=>Date.now()-row.at<=8000);
    const peer=live.find(row=>row.peer?.local&&row.peer.dc?.readyState==='open')?.peer;
    if(peer||live.some(row=>!row.peer)){
     const result=await measure('direct',peer);
     if(result||closed)return result;
    }
    return diagnosticAvailable&&window.navigator?.onLine!==false?await measure('firebase'):null;
   }finally{testing=false;}
  }
  function sendPresence(){
   const now=Date.now();
   if(closed||!diagnosticAvailable||!getBase()?.syncProtocol||window.navigator?.onLine===false||
      presenceBusy||now-lastPresence<45000)return;
   presenceBusy=true;lastPresence=now;
   void Promise.resolve().then(()=>api.sendDashboardDiagnostic(club,{kind:'presence',id:viewerId,webrtc:typeof PC==='function'})).catch(()=>{}).finally(()=>presenceBusy=false);
  }
  function send(peer,frame){
   if(!peer.local||!peer.hello||peer.dc?.readyState!=='open')return;
   if(peer.dc.bufferedAmount>262144){peer.pending=frame;return;}
   peer.pending=null;
   const data=JSON.stringify(frame);if(data.length>2097152)return;const n=Math.ceil(data.length/8000),id=source+'_'+(++serial);
   try{for(let i=0;i<n;i++)peer.dc.send(JSON.stringify({kind:'chunk',id,index:i,total:n,data:data.slice(i*8000,(i+1)*8000)}));}catch{peer.pending=frame;}
  }
  function input(raw,peer){
   if(typeof raw!=='string'||raw.length>50000)return;let msg;try{msg=JSON.parse(raw);}catch{return;}
   if(peerMessage(msg,peer))return;
   if(!peer.local||role!=='viewer'||msg.kind!=='chunk'||typeof msg.id!=='string'||msg.id.length>160||!Number.isInteger(msg.total)||msg.total<1||msg.total>263||!Number.isInteger(msg.index)||msg.index<0||msg.index>=msg.total||typeof msg.data!=='string'||msg.data.length>8000)return;
   const now=Date.now();for(const [id,row] of assembling)if(now-row.at>10000)assembling.delete(id);if(!assembling.has(msg.id)){if(assembling.size>=3)assembling.delete(assembling.keys().next().value);assembling.set(msg.id,{at:now,total:msg.total,parts:new Map()});}const row=assembling.get(msg.id);if(row.total!==msg.total)return;row.parts.set(msg.index,msg.data);
   if(row.parts.size===row.total){assembling.delete(msg.id);try{received(JSON.parse(Array.from({length:row.total},(_,i)=>row.parts.get(i)).join('')),'peer',peer);}catch{}}
  }
  function hello(peer){channelSend(peer,{kind:'hello',club,connectionId:peer.id,viewerId});}
  function drop(peer){
   if(peer===viewerPeer){viewerPeer=null;lastViaPeer=false;}
   if(peers.get(peer.viewerId)===peer)peers.delete(peer.viewerId);
   for(const [id,row] of acks)if(row.peer===peer)acks.delete(id);
   closePeer(peer);report();
  }
  function attach(peer,dc){
   peer.dc=dc;dc.bufferedAmountLowThreshold=65536;
   dc.onmessage=e=>input(e.data,peer);
   dc.onopen=()=>{void verifyRoute(peer);};
   dc.onclose=()=>drop(peer);
   dc.onbufferedamountlow=()=>{if(peer.pending){const next=peer.pending;peer.pending=null;send(peer,next);}};
  }
  async function verifyRoute(peer){
   if(peer.checking||!peer.localLan||!peer.remoteLan||peer.dc?.readyState!=='open')return;
   const dc=peer.dc;
   peer.checking=true;peer.checkedAt=Date.now();
   try{
    const selected=await route(peer.pc);
    if(closed||peer.dc!==dc||dc.readyState!=='open')return;
    if(selected==='unknown'&&!peer.local)return; // Older engines may report the pair after opening the channel.
    if(selected!=='local'){drop(peer);return;}
    if(!peer.local){
     peer.local=true;peer.route='local';peer.heard=Date.now();
     if(role==='viewer')hello(peer);
     report();
    }
   }finally{peer.checking=false;}
  }
  function makePeer(){
   const pc=new PC({iceServers:[]}),peer={pc,dc:null,pending:null,created:Date.now()};
   const check=()=>{if(['failed','closed'].includes(pc.connectionState)||['failed','closed'].includes(pc.iceConnectionState))drop(peer);};
   pc.onconnectionstatechange=check;pc.oniceconnectionstatechange=check;
   return peer;
  }
  function closePeer(peer){
   const dc=peer.dc;peer.dc=null;peer.local=false;
   peer.pc.onconnectionstatechange=null;peer.pc.oniceconnectionstatechange=null;peer.pc.ondatachannel=null;
   if(dc){dc.onopen=null;dc.onclose=null;dc.onmessage=null;dc.onbufferedamountlow=null;try{dc.close();}catch{}}
   try{peer.pc.close();}catch{}
  }
  async function gather(pc){if(pc.iceGatheringState==='complete')return;await new Promise(resolve=>{let timer;const done=()=>{if(pc.iceGatheringState!=='complete')return;clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',done);resolve();};pc.addEventListener('icegatheringstatechange',done);timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',done);resolve();},2500);done();});}
  async function signal(request){
   let timeout;
   try{return await Promise.race([api.sendDashboardSignal(club,request),new Promise(resolve=>{timeout=setTimeout(()=>resolve(false),8000);})]);}
   finally{clearTimeout(timeout);}
  }
  async function answer(row){
   if(closed||typeof PC!=='function'||!/^[a-zA-Z0-9_-]{1,80}$/.test(row.viewerId||'')||!/^[a-zA-Z0-9_-]{1,80}$/.test(row.connectionId||'')||!Number.isFinite(row.expiresAt)||row.expiresAt<stamp()||row.offer?.type!=='offer'||peers.get(row.viewerId)?.id===row.connectionId)return;
   const remote=lanDescription(row.offer);
   if(!remote)return;
   const previous=peers.get(row.viewerId);if(previous)drop(previous);if(peers.size>=4)return;
   let peer;try{peer=makePeer();}catch{return;}
   Object.assign(peer,{id:row.connectionId,viewerId:row.viewerId,remoteLan:true});peers.set(row.viewerId,peer);
   peer.pc.ondatachannel=e=>{if(e.channel.label==='kcis-display'&&!peer.dc)attach(peer,e.channel);else e.channel.close();};
   try{
    await peer.pc.setRemoteDescription(remote);await peer.pc.setLocalDescription(await peer.pc.createAnswer());await gather(peer.pc);
    if(closed||peers.get(row.viewerId)!==peer)return;
    const description=lanDescription(peer.pc.localDescription);if(!description){drop(peer);return;}
    peer.localLan=true;
    if(!await signal({action:'answer',viewerId:row.viewerId,connectionId:row.connectionId,source,description}))drop(peer);
   }catch{drop(peer);}
  }
  async function offer(){
   const now=Date.now();
   if(closed||typeof PC!=='function'||busy||window.navigator?.onLine===false||!getBase()?.syncProtocol||
      viewerPeer||now<nextOfferAt)return;
   busy=true;nextOfferAt=now+Math.min(60000,2000*2**Math.min(attempts++,5));let peer;const connectionId=uid();
   try{
    peer=viewerPeer=makePeer();peer.id=connectionId;
    attach(peer,peer.pc.createDataChannel('kcis-display',{ordered:true}));
    await peer.pc.setLocalDescription(await peer.pc.createOffer());await gather(peer.pc);
    if(closed||viewerPeer!==peer)return;
    const description=lanDescription(peer.pc.localDescription);if(!description){drop(peer);return;}
    peer.localLan=true;
    if(!await signal({action:'offer',viewerId,connectionId,description}))drop(peer);
   }catch{if(peer)drop(peer);}finally{busy=false;}
  }
  try{if(BC){bc=new BC('kcis_dashboard_'+club);bc.onmessage=e=>{const msg=e.data;if(msg?.club!==club)return;if(role==='publisher'&&msg.kind==='hello'&&latest)post({kind:'frame',club,frame:latest});else if(role==='viewer'&&msg.kind==='frame'&&!viewerPeer?.local)received(msg.frame,'local');else peerMessage(msg,undefined);};}}catch{}
  if(PC&&api?.sendDashboardSignal){try{
   if(role==='publisher')unsub=api.subscribeDashboardOffers(club,rows=>{for(const row of rows)void answer(row);});
   else viewerUnsub=api.subscribeDashboardAnswer(club,viewerId,async row=>{
    const peer=viewerPeer;
    if(closed||!peer||row?.connectionId!==peer.id||!row.answer||peer.answering||peer.pc.remoteDescription)return;
    const description=lanDescription(row.answer);
    if(!description||typeof row.source!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(row.source))return;
    peer.source=row.source;peer.answering=true;peer.remoteLan=true;
    try{await peer.pc.setRemoteDescription(description);}catch{drop(peer);}
   });
  }catch{}}
  if(diagnosticAvailable)try{
   if(role==='publisher')diagnosticOff.push(api.subscribeDashboardDiagnostic(club,'presence',row=>{presence=row;report();}));
   diagnosticOff.push(api.subscribeDashboardDiagnostic(club,'probe',row=>{
    if(closed||!row||!(row.expiresAt>stamp()))return;
    if(role==='publisher'&&row.kind==='pong'&&probe?.via==='firebase'){
     presence=row;report();settleProbe(row.id,{via:'firebase',route:null});
    }else if(role==='viewer'&&row.kind==='ping'&&row.id!==lastProbe){
     lastProbe=row.id;
     void Promise.resolve().then(()=>api.sendDashboardDiagnostic(club,{kind:'pong',id:row.id,webrtc:typeof PC==='function'})).catch(()=>{});
    }
   }));
  }catch{}
  if(role==='viewer')post({kind:'hello',club,viewerId});
  function refresh(){if(role==='viewer'&&api?.sendDashboardSignal)void offer();}
  function resume(){if(!viewerPeer){nextOfferAt=0;refresh();}}
  const network=window.navigator?.connection;
  window.addEventListener?.('online',resume);network?.addEventListener?.('change',resume);
  const interval=setInterval(()=>{
   if(closed)return;
   const now=Date.now();
   for(const peer of [...peers.values(),...(viewerPeer?[viewerPeer]:[])]){
    if(now-(peer.heard||peer.created)>12000){drop(peer);continue;}
    if(peer.dc?.readyState==='open'&&now-(peer.checkedAt||0)>(peer.local?10000:1000))void verifyRoute(peer);
    if(!peer.local)continue;
    if(role==='viewer'&&peer.sequence===undefined)hello(peer);
    if(role==='publisher'&&peer.hello&&latest){
     if(peer.version!==latest.version)send(peer,latest);
     else channelSend(peer,{kind:'ping',club,id:'heartbeat'});
    }
   }
   report();
   if(role==='viewer'){post({kind:'hello',club,viewerId});refresh();sendPresence();}
  },2000);
  refresh();
  return {
   test,refresh,
   publish(state,sequence,baseEvening='',content={},basis={}){if(closed||role!=='publisher'||!Number.isSafeInteger(sequence)||sequence<0)return;latest={v:1,club,source,version:++version,sequence,baseEvening:String(baseEvening||''),...basis,clock:window.KCSharedClock?.captureTablet?.()||{time:stamp()},state:project(state),content:lean(content)};post({kind:'frame',club,frame:latest});for(const peer of peers.values())send(peer,latest);},
   close(){if(closed)return;closed=true;clearInterval(interval);window.removeEventListener?.('online',resume);network?.removeEventListener?.('change',resume);if(probe)settleProbe(probe.id,null);try{bc?.close();unsub?.();viewerUnsub?.();for(const off of diagnosticOff)off?.();}catch{}for(const peer of peers.values())closePeer(peer);if(viewerPeer)closePeer(viewerPeer);peers.clear();assembling.clear();acks.clear();}
  };
 }
 window.KCDashboardLink=Object.freeze({create,project,reconcile,valid,lanDescription});
})();
