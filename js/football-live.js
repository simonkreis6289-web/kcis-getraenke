/* Bundesliga 1+2: sparsames OpenLigaDB-Polling ohne API-Schluessel. */
(()=>{
 const base='https://api.openligadb.de',leagues=['bl1','bl2'];
 const state=new Map(),seen=new Map();let settings=null,timer=null,busy=false,lastGroup=0,initialized=false,toastTimer=null;
 const season=()=>{const d=new Date(),year=d.getFullYear();return d.getMonth()<6?year-1:year;};
 const fetchJSON=async path=>{const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9000);try{const response=await fetch(base+path,{signal:ctrl.signal,cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timeout);}};
 const enabled=league=>settings?.[league]===true;
 const score=m=>{
  const results=Array.isArray(m.matchResults)?m.matchResults:[],goals=Array.isArray(m.goals)?m.goals:[];
  const end=results.find(x=>x.resultTypeID===2),half=results.find(x=>x.resultTypeID===1);
  const lastGoal=goals.at(-1);
  const pair=x=>x&&Number.isFinite(Number(x.pointsTeam1))&&Number.isFinite(Number(x.pointsTeam2))?[Number(x.pointsTeam1),Number(x.pointsTeam2)]:null;
  if(m.matchIsFinished)return pair(end)||pair(results.at(-1))||[Number(lastGoal?.scoreTeam1)||0,Number(lastGoal?.scoreTeam2)||0];
  // OpenLigaDB liefert waehrend der zweiten Halbzeit oft weiterhin ein Halbzeitergebnis.
  // Der aktuellste Toreintrag hat bei laufenden Spielen Vorrang.
  if(lastGoal)return [Number(lastGoal.scoreTeam1)||0,Number(lastGoal.scoreTeam2)||0];
  return pair(end)||pair(half)||[0,0];
 };
 const label=(m)=>{const s=score(m);return (m.leagueShortcut==='bl2'?'2. BL':'1. BL')+' · '+(m.team1?.shortName||m.team1?.teamName||'?')+' '+s[0]+':'+s[1]+' '+(m.team2?.shortName||m.team2?.teamName||'?')+(m.matchIsFinished?' (Ende)':'');};
 function announce(m,old,next){
  if(!settings?.goalToastSeconds||document.hidden)return;
  const box=document.getElementById('dashboard-football-toast')||document.createElement('div');box.id='dashboard-football-toast';box.className='dashboard-throw-popup is-nine dashboard-football-toast';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.append(box);
  const stage=document.querySelector('main.dashboard .stage'),rect=stage?.getBoundingClientRect();if(rect){box.style.left=(rect.left+rect.width/2)+'px';box.style.width=Math.max(200,Math.min(rect.width-24,760))+'px';}
  const scoring=next[0]>old[0]?m.team1:m.team2,goal=(m.goals||[]).at(-1),title=document.createElement('strong'),detail=document.createElement('span');title.textContent='⚽ TOR! '+next[0]+':'+next[1];detail.textContent=(scoring?.teamName||'Bundesliga')+(goal?.goalGetterName?' · '+goal.goalGetterName:'');box.replaceChildren(title,detail);
  clearTimeout(toastTimer);box.hidden=true;box.classList.remove('toast-visible','toast-leaving');box.hidden=false;void box.offsetHeight;requestAnimationFrame(()=>box.classList.add('toast-visible'));toastTimer=setTimeout(()=>{box.classList.remove('toast-visible');box.classList.add('toast-leaving');setTimeout(()=>{if(!box.classList.contains('toast-visible'))box.hidden=true;},450);},settings.goalToastSeconds*1000);
 }
 function ingest(league,matches){
  const now=Date.now(),list=Array.isArray(matches)?matches:[];state.set(league,list.filter(m=>{const start=Date.parse(m.matchDateTimeUTC||m.matchDateTime||'');return Number.isFinite(start)&&start<now+3600000&&start>now-86400000;}));
  for(const m of list){const id=league+':'+m.matchID,next=score(m),old=seen.get(id);if(old&&initialized&&enabled(league)&&!m.matchIsFinished&&(next[0]>old[0]||next[1]>old[1]))announce(m,old,next);seen.set(id,next);}
  window.dispatchEvent(new Event('kc-football-updated'));
 }
 async function refresh(){
  if(busy||!settings||!leagues.some(enabled)||document.hidden)return;busy=true;
  try{const now=Date.now();for(const league of leagues){if(!enabled(league))continue;
    const current=state.get(league)||[];let group=window['kcGroup_'+league];
    if(!group||now-lastGroup>300000){const g=await fetchJSON('/getcurrentgroup/'+league);group=Number(g?.groupOrderID??g?.groupOrderId??g?.groupOrder??0);if(group)window['kcGroup_'+league]=group;}
    if(!group)continue;
    const stamp=await fetchJSON('/getlastchangedate/'+league+'/'+season()+'/'+group),changed=JSON.stringify(stamp),key='kcStamp_'+league;
    if(!current.length||window[key]!==changed){const matches=await fetchJSON('/getmatchdata/'+league+'/'+season()+'/'+group);ingest(league,matches);window[key]=changed;}
   }lastGroup=now;initialized=true;
  }catch(e){console.warn('Bundesliga-Live-Daten momentan nicht erreichbar',e);}finally{busy=false;}
 }
 function configure(value){
  const next={bl1:value?.bl1===true,bl2:value?.bl2===true,goalToastSeconds:Math.max(0,Math.min(30,Number(value?.goalToastSeconds??5)||0))};
  const changed=JSON.stringify(settings)!==JSON.stringify(next);settings=next;
  if(!timer)timer=setInterval(refresh,30000);if(changed){initialized=false;seen.clear();state.clear();refresh();}
 }
 function ticker(){if(!settings)return [];return leagues.filter(enabled).flatMap(league=>(state.get(league)||[]).map(m=>['football-'+league+'-'+m.matchID,'⚽ '+label(m)]));}
 window.KCFootballLive=Object.freeze({configure,ticker,refresh});
})();