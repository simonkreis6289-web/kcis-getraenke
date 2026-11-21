/* Bundesliga 1+2: sparsames OpenLigaDB-Polling ohne API-Schluessel. */
(()=>{
 const base='https://api.openligadb.de',leagues=['bl1','bl2'];
 const state=new Map(),seen=new Map(),groups=new Map(),stamps=new Map(),initialized=new Set(),refreshing=new Set(),clocks=new Map();
 let settings=null,timer=null,clockTimer=null,toastTimer=null,scoreTimer=null,demoSeen=null,demoMatch=null,demoTeams=null,demoTeamsLoading=false,seenPhases=new Map(),seenKickoffs=new Set();
 const minuteMs=60000,breakMs=15*minuteMs;
 const finalScoreWindow=120*minuteMs,typicalMatchDuration=105*minuteMs;
 const finishedAt=new Map();
 const matchKey=(league,match)=>league+':'+match.matchID;
 const season=()=>{const d=new Date(),year=d.getFullYear();return d.getMonth()<6?year-1:year;};
 const fetchJSON=async path=>{
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  try{
   const response=await fetch(base+path,{signal:ctrl.signal,cache:'no-store',mode:'cors'});
   if(!response.ok)throw Error('HTTP '+response.status+' bei '+path);
   return await response.json();
  }finally{clearTimeout(timeout);}
 };
 const failures=new Map(),lastWarning=new Map(),backoff=[30000,60000,120000,300000,600000];
 const retryAfter=league=>(failures.get(league)?.next||0);
 const recover=league=>{if(failures.has(league)){failures.delete(league);window.dispatchEvent(new Event('kc-football-updated'));}};
 const fail=(league,error,now)=>{
  const prev=failures.get(league),tries=(prev?.tries||0)+1;
  failures.set(league,{tries,next:now+backoff[Math.min(tries-1,backoff.length-1)],message:String(error?.message||error)});
  if(!lastWarning.has(league)||now-lastWarning.get(league)>300000){
   console.warn('Bundesliga '+league+': Datenquelle zeitweise nicht erreichbar. Automatischer Wiederholungsversuch.',error);
   lastWarning.set(league,now);
  }
 };
 const enabled=league=>settings?.[league]===true;
 const score=m=>{
  const results=Array.isArray(m.matchResults)?m.matchResults:[],goals=Array.isArray(m.goals)?m.goals:[];
  const full=results.find(x=>x.resultTypeID===2),half=results.find(x=>x.resultTypeID===1),last=goals.at(-1);
  const valid=x=>x&&Number.isFinite(Number(x.pointsTeam1))&&Number.isFinite(Number(x.pointsTeam2));
  if(m.matchIsFinished&&valid(full))return [Number(full.pointsTeam1),Number(full.pointsTeam2)];
  if(last&&Number.isFinite(Number(last.scoreTeam1))&&Number.isFinite(Number(last.scoreTeam2)))return [Number(last.scoreTeam1),Number(last.scoreTeam2)];
  if(valid(half))return [Number(half.pointsTeam1),Number(half.pointsTeam2)];
  if(valid(full))return [Number(full.pointsTeam1),Number(full.pointsTeam2)];
  return [0,0];
 };
 const kickoff=m=>Date.parse(m.matchDateTimeUTC||m.matchDateTime||'');
 function observeClock(previous,match,now){
  const start=kickoff(match);
  if(!Number.isFinite(start))return null;
  const half=(match.matchResults||[]).find(result=>result.resultTypeID===1);
  const goals=(match.goals||[]).filter(goal=>Number(goal.matchMinute)>0&&Number(goal.matchMinute)<=125);
  const goalTotal=goal=>(Number(goal.scoreTeam1)||0)+(Number(goal.scoreTeam2)||0);
  const goalKey=goal=>[goal.goalID??goal.goalId,goal.matchMinute,goal.scoreTeam1,goal.scoreTeam2].join('/');
  const secondHalf=goal=>!!half&&Number(goal.scoreTeam1)+Number(goal.scoreTeam2)>Number(half.pointsTeam1)+Number(half.pointsTeam2);
  const sameMatch=previous?.start===start?previous:null;
  const latest=goals.reduce((last,goal)=>!last||goalTotal(goal)>=goalTotal(last)?goal:last,null);
  const halfAt=half?(sameMatch?.halfAt??(sameMatch?now:Math.min(now,start+45*minuteMs))):null;
  let anchor=sameMatch?.anchor||null;
  if(latest&&goalKey(latest)!==sameMatch?.goal){
   const minute=Number(latest.matchMinute),second=secondHalf(latest);
   const observedAt=sameMatch?now:Math.min(now,start+(minute+(second?15:0))*minuteMs);
   if(!anchor||second||!anchor.second)anchor={minute,at:observedAt,second};
  }
  return {start,halfAt,anchor,goal:latest?goalKey(latest):null};
 }
 function clockLabel(match,clock,now=Date.now()){
  if(match.matchIsFinished||!clock||now<clock.start)return '';
  const {start,halfAt,anchor}=clock,second=anchor?.second||halfAt!==null&&now>=halfAt+breakMs;
  if(halfAt!==null&&!second)return 'Halbzeit';
  const base=second?Math.max(start+45*minuteMs,halfAt+breakMs):start;
  const usable=anchor&&anchor.second===!!second;
  const minute=Math.max(1,usable?anchor.minute+Math.floor(Math.max(0,now-anchor.at)/minuteMs):Math.floor(Math.max(0,now-base)/minuteMs)+(second?46:1));
  const limit=second?90:45;
  // Die laufende Uhr ist geschätzt. Ohne bestätigte Halbzeit wird kein Wiederanpfiff unterstellt.
  if(minute>limit)return minute>limit+15?'≈'+limit+'′+':'≈'+limit+'+'+(minute-limit)+'′';
  return '≈'+minute+'′';
 }
 function visibleMatch(league,match,now){
  const start=kickoff(match);
  if(!Number.isFinite(start)||start>=now+60*minuteMs||start<=now-24*60*minuteMs)return false;
  return !match.matchIsFinished||now<(finishedAt.get(matchKey(league,match))??start+typicalMatchDuration)+finalScoreWindow;
 }
 const clockMinutes=label=>label.match(/\d+/g).reduce((sum,part)=>sum+Number(part),0);
 function tickerClock(match,clock,peers,now){
  const own=clockLabel(match,clock,now);
  if(match.matchIsFinished||!clock||now<clock.start||clock.anchor||own==='Halbzeit')return own;
  const nearby=peers.filter(peer=>peer.match!==match&&!peer.match.matchIsFinished&&peer.clock&&
   now>=peer.clock.start&&Math.abs(peer.clock.start-clock.start)<=2*minuteMs);
  const synced=nearby.filter(peer=>peer.clock.anchor||peer.clock.halfAt!==null);
  if(!synced.length)return own;
  const half=clock.halfAt!==null;
  const candidates=synced
   .filter(peer=>!half||peer.label==='Halbzeit'||peer.clock.anchor?.second||peer.clock.halfAt!==null&&now>=peer.clock.halfAt+breakMs)
   .filter(peer=>peer.label);
  if(!candidates.length)return own;
  const breaks=candidates.filter(peer=>peer.label==='Halbzeit');
  if(breaks.length>candidates.length/2)return '≈Halbzeit';
  const running=candidates.filter(peer=>peer.label!=='Halbzeit');
  running.sort((a,b)=>clockMinutes(a.label)-clockMinutes(b.label));
  return running[Math.floor(running.length/2)]?.label||own;
 }
 const label=(m)=>{const s=score(m);return (m.leagueShortcut==='bl2'?'2. BL':'1. BL')+' · '+(m.team1?.shortName||m.team1?.teamName||'?')+' '+s[0]+':'+s[1]+' '+(m.team2?.shortName||m.team2?.teamName||'?')+(m.matchIsFinished?' (Ende)':'');};
 function toastElement(tag,className,text){
  const element=document.createElement(tag);
  element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
 }
 function toastClub(team){
  const short=String(team?.shortName||team?.teamName||'⚽').trim();
  const name=team?.teamName||short||'Verein unbekannt';
  const initials=short.length<=4?short:short.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
  const club=toastElement('div','football-goal-club'),crest=toastElement('div','dashboard-football-crest');
  const fallback=toastElement('span','dashboard-football-crest-fallback',initials||'⚽');
  const url=String(team?.teamIconUrl||'').trim();
  if(/^https:\/\/[^\s<>"']+$/i.test(url)){
   const logo=document.createElement('img');
   logo.alt='';logo.loading='eager';logo.referrerPolicy='no-referrer';
   logo.onerror=()=>{logo.remove();fallback.hidden=false;};
   fallback.hidden=true;crest.append(logo);logo.src=url;
  }
  crest.append(fallback);
  crest.setAttribute('aria-hidden','true');
  club.append(crest,toastElement('strong','football-goal-club-name',name));
  return club;
 }
 function goalMinute(goal,estimate){
  const minute=String(goal?.matchMinute??'').trim();
  if(/^[1-9]\d{0,2}(?:\s*\+\s*[1-9]\d?)?$/.test(minute))return minute.replace(/\s+/g,'')+'′';
  return estimate.startsWith('≈')?estimate:'';
 }
 function announce(m,old,next,estimatedMinute=''){
  if(!settings?.goalToastSeconds||!settings.events?.goal||document.hidden)return;
  const box=document.getElementById('dashboard-football-toast')||document.createElement('div');
  box.id='dashboard-football-toast';box.className='dashboard-throw-popup is-nine dashboard-football-toast';
  box.style.left='50%';box.style.width='calc(100vw - 32px)';
  const goal=(m.goals||[]).slice().reverse().find(g=>Number(g.scoreTeam1)===next[0]&&Number(g.scoreTeam2)===next[1]);
  const minute=goalMinute(goal,estimatedMinute);
  const row=toastElement('div','dashboard-football-toast-content');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const duration=settings.goalToastSeconds*1000;
  const animate=!reduced&&duration>250;
  const shown=(animate?old:next).slice();
  const digits=shown.map(value=>toastElement('span','football-goal-digit',String(value)));
  const scoreBox=toastElement('div','football-goal-score');
  scoreBox.setAttribute('aria-hidden','true');
  scoreBox.append(digits[0],toastElement('span','football-goal-separator',':'),digits[1]);
  const center=toastElement('div','football-goal-center');
  center.append(toastElement('strong','football-goal-heading','⚽ Tor!'+(minute?' · '+minute:'')),scoreBox);
  if(goal?.goalGetterName)center.append(toastElement('span','football-goal-scorer',goal.goalGetterName));
  row.append(toastClub(m.team1),center,toastClub(m.team2));
  const announcement=toastElement('span','football-goal-announcement',
   'Tor'+(minute?' in der '+minute:'')+'. '+[m.team1?.teamName||m.team1?.shortName||'Heim',next[0]+' zu '+next[1],m.team2?.teamName||m.team2?.shortName||'Gast'].join(' '));
  announcement.setAttribute('role','status');
  box.replaceChildren(row,announcement);
  if(!box.isConnected)document.body.append(box);
  clearTimeout(toastTimer);clearTimeout(scoreTimer);
  box.hidden=true;box.classList.remove('toast-visible','toast-leaving');box.hidden=false;void box.offsetHeight;
  requestAnimationFrame(()=>{
   if(row.parentNode!==box)return;
   box.classList.add('toast-visible');
   if(!animate)return;
   const start=Math.min(550,duration/2);
   const largestChange=Math.max(...next.map((value,index)=>value-shown[index]));
   const step=Math.max(80,Math.min(180,(duration-start-100)/Math.max(1,largestChange)));
   const count=()=>{
    if(row.parentNode!==box||!box.classList.contains('toast-visible'))return;
    digits.forEach((digit,index)=>{
     if(shown[index]===next[index])return;
     if(shown[index]<next[index]){
      digit.classList.remove('football-goal-pop');
      void digit.offsetWidth;
      digit.classList.add('football-goal-pop');
      shown[index]++;
     }else shown[index]=next[index];
     digit.textContent=String(shown[index]);
    });
    if(shown.some((value,index)=>value!==next[index]))scoreTimer=setTimeout(count,step);
   };
   scoreTimer=setTimeout(count,start);
  });
  toastTimer=setTimeout(()=>{
   clearTimeout(scoreTimer);
   box.classList.remove('toast-visible');box.classList.add('toast-leaving');
   setTimeout(()=>{if(row.parentNode===box&&!box.classList.contains('toast-visible'))box.hidden=true;},450);
  },duration);
 }
 function announceStatus(m,kind){
  if(!settings?.goalToastSeconds||!settings.events?.[kind]||document.hidden)return;
  const box=document.getElementById('dashboard-football-status-toast')||document.createElement('div');box.id='dashboard-football-status-toast';box.className='dashboard-throw-popup dashboard-football-toast is-wreath';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.append(box);
  const title=document.createElement('strong'),detail=document.createElement('span');
  title.textContent={kickoff:'▶ Anstoßzeit erreicht',halftime:'⏸ Halbzeit',fulltime:'■ Abpfiff'}[kind];detail.textContent=label(m);
  box.style.left='50%';box.style.width='calc(100vw - 32px)';box.replaceChildren(title,detail);box.hidden=true;box.classList.remove('toast-visible','toast-leaving');box.hidden=false;void box.offsetHeight;
  requestAnimationFrame(()=>box.classList.add('toast-visible'));
  clearTimeout(box._hideTimer);box._hideTimer=setTimeout(()=>{box.classList.remove('toast-visible');box.classList.add('toast-leaving');setTimeout(()=>{if(!box.classList.contains('toast-visible'))box.hidden=true;},450);},settings.goalToastSeconds*1000);
 }
 const phase=m=>({half:Array.isArray(m.matchResults)&&m.matchResults.some(x=>x.resultTypeID===1),finished:!!m.matchIsFinished});
 function ingest(league,matches){
  const now=Date.now(),list=matches;state.set(league,list.filter(m=>{const start=Date.parse(m.matchDateTimeUTC||m.matchDateTime||'');return Number.isFinite(start)&&start<now+3600000&&start>now-86400000;}));
  for(const m of list){const id=matchKey(league,m),next=score(m),old=seen.get(id);clocks.set(id,observeClock(clocks.get(id),m,now));if(old&&initialized.has(league)&&enabled(league)&&!m.matchIsFinished&&(next[0]>old[0]||next[1]>old[1]))announce(m,old,next,clockLabel(m,clocks.get(id),now));
   seen.set(id,next);
   const previous=seenPhases.get(id),current=phase(m);
   if(current.finished&&!finishedAt.has(id)){
    const estimatedEnd=kickoff(m)+typicalMatchDuration;
    // Ein beobachteter Abpfiff zählt ab Empfang. Beim Öffnen nach dem Spiel dient die Anstoßzeit als Schätzung.
    finishedAt.set(id,previous&&!previous.finished?now:Number.isFinite(estimatedEnd)?Math.min(now,estimatedEnd):now);
   }else if(!current.finished)finishedAt.delete(id);
   if(previous&&initialized.has(league)&&enabled(league)){
    if(!previous.finished&&current.finished)announceStatus(m,'fulltime');
    else if(!previous.half&&current.half)announceStatus(m,'halftime');
   }
   seenPhases.set(id,current);}
  window.dispatchEvent(new Event('kc-football-updated'));
 }
 function checkKickoffs(now=Date.now()){
  for(const league of leagues.filter(enabled))for(const m of state.get(league)||[]){
   const id=league+':'+m.matchID,start=Date.parse(m.matchDateTimeUTC||m.matchDateTime||'');
   if(!Number.isFinite(start)||seenKickoffs.has(id))continue;
   if(start<now-90000){seenKickoffs.add(id);continue;}
   if(start<=now&&now-start<=90000){seenKickoffs.add(id);if(!m.matchIsFinished)announceStatus(m,'kickoff');}
  }
 }
 async function refreshLeague(league,now){
  if(refreshing.has(league)||now<retryAfter(league))return;
  refreshing.add(league);
  try{
   if(!groups.has(league)||now-groups.get(league).checkedAt>=300000){
    const result=await fetchJSON('/getcurrentgroup/'+league);
    const group=Number(result?.groupOrderID??result?.groupOrderId??result?.groupOrder??0);
    if(!Number.isInteger(group)||group<1)throw Error('Aktueller Spieltag konnte nicht ermittelt werden');
    groups.set(league,{group,checkedAt:now});
   }
   const matchday=league+'/'+season()+'/'+groups.get(league).group;
   const changed=await fetchJSON('/getlastchangedate/'+matchday).then(stamp=>matchday+':'+JSON.stringify(stamp),()=>null);
   if(changed===null||stamps.get(league)!==changed){
    const matches=await fetchJSON('/getmatchdata/'+matchday);
    if(!Array.isArray(matches))throw Error('Ungültige Spieltagsdaten');
    ingest(league,matches);
    stamps.set(league,changed);
   }
   initialized.add(league);recover(league);
  }catch(error){fail(league,error,Date.now());}
  finally{refreshing.delete(league);checkKickoffs();}
 }
 async function refresh(){
  if(!settings||document.hidden)return;
  await Promise.all(leagues.filter(enabled).map(league=>refreshLeague(league,Date.now())));
 }
 function mockMatch(demo){return {matchID:'test-'+demo.id,leagueShortcut:demo.league,team1:{teamName:'Borussia Dortmund',shortName:'BVB',teamIconUrl:demoTeams?.bvb||''},team2:{teamName:'FC Schalke 04',shortName:'S04',teamIconUrl:demoTeams?.schalke||''},matchDateTimeUTC:new Date().toISOString(),matchIsFinished:false,goals:demo.home+demo.away?[{scoreTeam1:demo.home,scoreTeam2:demo.away,matchMinute:Math.min(90,12+(demo.home+demo.away-1)*11),goalGetterName:'Testtor'}]:[],matchResults:[]};}
 async function loadDemoCrests(){
  if(demoTeamsLoading||demoTeams)return;demoTeamsLoading=true;
  try{
   const matches=(await Promise.allSettled(leagues.map(l=>fetchJSON('/getavailableteams/'+l+'/'+season())))).filter(r=>r.status==='fulfilled').flatMap(r=>Array.isArray(r.value)?r.value:[]);
   const lookup=(pattern)=>matches.find(t=>pattern.test(String(t.teamName||'')))?.teamIconUrl||'';
   demoTeams={bvb:lookup(/dortmund/i),schalke:lookup(/schalke/i)};
   if(settings?.demo?.active){demoMatch=mockMatch(settings.demo);window.dispatchEvent(new Event('kc-football-updated'));}
  }catch(error){console.warn('Test-Wappen konnten nicht geladen werden',error);}
  finally{demoTeamsLoading=false;}
 }
 function syncDemo(demo){
  if(!demo?.active){demoSeen=null;demoMatch=null;window.dispatchEvent(new Event('kc-football-updated'));return;}
  const match=mockMatch(demo),next=[demo.home,demo.away];
  if(demoSeen?.id===demo.id&&(next[0]>demoSeen.home||next[1]>demoSeen.away))announce(match,[demoSeen.home,demoSeen.away],next);
  demoSeen={id:demo.id,home:next[0],away:next[1]};demoMatch=match;
  if(!demoTeams)void loadDemoCrests();
  window.dispatchEvent(new Event('kc-football-updated'));
 }
 function configure(value){
  const next={bl1:value?.bl1===true,bl2:value?.bl2===true,goalToastSeconds:Math.max(0,Math.min(30,Number(value?.goalToastSeconds??5)||0)),events:value?.events||{goal:true,kickoff:true,halftime:true,fulltime:true},demo:value?.demo?.active?value.demo:null};
  const sourceChanged=!settings||settings.bl1!==next.bl1||settings.bl2!==next.bl2;
  const demoChanged=JSON.stringify(settings?.demo??null)!==JSON.stringify(next.demo??null);
  settings=next;if(!timer)timer=setInterval(refresh,30000);
  if(!clockTimer)clockTimer=setInterval(()=>{
   if(!document.hidden&&leagues.some(league=>enabled(league)&&state.get(league)?.length))window.dispatchEvent(new Event('kc-football-clock'));
  },5000);
  if(sourceChanged)void refresh();
  if(demoChanged)syncDemo(next.demo);
 }
 function ticker(now=Date.now()){
  if(!settings)return [];
  const matches=leagues.filter(enabled).flatMap(league=>(state.get(league)||[])
   .filter(match=>visibleMatch(league,match,now))
   .map(match=>{
    const clock=clocks.get(matchKey(league,match));
    return {league,match,clock,label:clockLabel(match,clock,now)};
   }));
  const live=matches.map(({league,match,clock})=>['football-'+league+'-'+match.matchID,'⚽ '+label(match),tickerClock(match,clock,matches,now)]);
  if(demoMatch)live.unshift(['football-demo','🧪 TESTSPIEL · '+label(demoMatch)]);
  return live;
 }
 window.KCFootballLive=Object.freeze({configure,ticker,refresh,observeClock,clockLabel,status:()=>Object.fromEntries([...failures].map(([league,v])=>[league,{tries:v.tries,retryAt:new Date(v.next).toISOString(),message:v.message}]))});
})();
