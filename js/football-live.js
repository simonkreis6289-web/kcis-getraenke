/* Bundesliga 1+2: sparsames OpenLigaDB-Polling ohne API-Schluessel. */
(()=>{
 const base='https://api.openligadb.de',leagues=['bl1','bl2'];
 const state=new Map(),seen=new Map();let settings=null,timer=null,busy=false,lastGroup=0,initialized=false,toastTimer=null,demoSeen=null,demoMatch=null,demoTeams=null,demoTeamsLoading=false;
 const season=()=>{const d=new Date(),year=d.getFullYear();return d.getMonth()<6?year-1:year;};
 const fetchJSON=async path=>{const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9000);try{const response=await fetch(base+path,{signal:ctrl.signal,cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timeout);}};
 const enabled=league=>settings?.[league]===true;
 const score=m=>{const results=Array.isArray(m.matchResults)?m.matchResults:[],end=results.find(x=>x.resultTypeID===2)||results.at(-1);const goals=Array.isArray(m.goals)?m.goals:[];if(end&&Number.isFinite(+end.pointsTeam1)&&Number.isFinite(+end.pointsTeam2))return [+end.pointsTeam1,+end.pointsTeam2];if(goals.length)return [goals.filter(x=>!x.isOvertime&&x.scoreTeam1!=null).at(-1)?.scoreTeam1??0,goals.filter(x=>!x.isOvertime&&x.scoreTeam2!=null).at(-1)?.scoreTeam2??0];return [0,0];};
 const label=(m)=>{const s=score(m);return (m.leagueShortcut==='bl2'?'2. BL':'1. BL')+' · '+(m.team1?.shortName||m.team1?.teamName||'?')+' '+s[0]+':'+s[1]+' '+(m.team2?.shortName||m.team2?.teamName||'?')+(m.matchIsFinished?' (Ende)':'');};
 function announce(m,old,next){
  if(!settings?.goalToastSeconds||document.hidden)return;
  const box=document.getElementById('dashboard-football-toast')||document.createElement('div');box.id='dashboard-football-toast';box.className='dashboard-throw-popup is-nine dashboard-football-toast';box.setAttribute('role','status');box.setAttribute('aria-live','polite');document.body.append(box);
  const stage=document.querySelector('main.dashboard .stage'),rect=stage?.getBoundingClientRect();if(rect){box.style.left=(rect.left+rect.width/2)+'px';box.style.width=Math.max(200,Math.min(rect.width-24,760))+'px';}
  const scoring=next[0]>old[0]?m.team1:m.team2,goal=(m.goals||[]).at(-1);
  const row=document.createElement('div'),crest=document.createElement('div'),caption=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');
  row.className='dashboard-football-toast-content';crest.className='dashboard-football-crest';caption.className='dashboard-football-toast-copy';
  const short=String(scoring?.shortName||scoring?.teamName||'⚽').trim(),initials=short.length<=4?short:short.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
  const fallback=document.createElement('span');fallback.className='dashboard-football-crest-fallback';fallback.textContent=initials||'⚽';
  const candidate=String(scoring?.teamIconUrl||'').trim();
  if(/^https:\/\/[^\s<>"']+$/i.test(candidate)){const logo=document.createElement('img');logo.src=candidate;logo.alt='Wappen '+String(scoring?.teamName||short);logo.loading='eager';logo.referrerPolicy='no-referrer';logo.onerror=()=>{logo.remove();fallback.hidden=false;};fallback.hidden=true;crest.append(logo);}
  crest.append(fallback);title.textContent='⚽ TOR! '+next[0]+':'+next[1];detail.textContent=(scoring?.teamName||'Bundesliga')+(goal?.goalGetterName?' · '+goal.goalGetterName:'');
  caption.append(title,detail);row.append(crest,caption);box.replaceChildren(row);
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
 function mockMatch(demo){return {matchID:'test-'+demo.id,leagueShortcut:demo.league,team1:{teamName:'Borussia Dortmund',shortName:'BVB',teamIconUrl:demoTeams?.bvb||''},team2:{teamName:'FC Schalke 04',shortName:'S04',teamIconUrl:demoTeams?.schalke||''},matchDateTimeUTC:new Date().toISOString(),matchIsFinished:false,goals:demo.home+demo.away?[{scoreTeam1:demo.home,scoreTeam2:demo.away,goalGetterName:'Testtor'}]:[],matchResults:[]};}
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
  const next={bl1:value?.bl1===true,bl2:value?.bl2===true,goalToastSeconds:Math.max(0,Math.min(30,Number(value?.goalToastSeconds??5)||0)),demo:value?.demo?.active?value.demo:null};
  const sourceChanged=!settings||settings.bl1!==next.bl1||settings.bl2!==next.bl2;
  const demoChanged=JSON.stringify(settings?.demo??null)!==JSON.stringify(next.demo??null);
  settings=next;if(!timer)timer=setInterval(refresh,30000);
  if(sourceChanged){initialized=false;seen.clear();state.clear();refresh();}
  if(demoChanged)syncDemo(next.demo);
 }
 function ticker(){if(!settings)return [];const live=leagues.filter(enabled).flatMap(league=>(state.get(league)||[]).map(m=>['football-'+league+'-'+m.matchID,'⚽ '+label(m)]));if(demoMatch)live.unshift(['football-demo','🧪 TESTSPIEL · '+label(demoMatch)]);return live;}
 window.KCFootballLive=Object.freeze({configure,ticker,refresh});
})();