/* Statistik bleibt erhalten; Neustarts setzen eine eigene Zeitgrenze und Baseline. */
(() => {
  const zone='Europe/Berlin',norm=n=>String(n||'').trim().normalize('NFKC').toLocaleLowerCase('de-DE');
  const dateCache=new Map(),dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
  const timeFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const count=n=>Math.max(0,Number.isFinite(Number(n))?Math.floor(Number(n)):0);
  function stamp(value){
    const text=String(value||''),m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
    if(!m)return Date.parse(text);
    const wanted=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));let guess=wanted;
    for(let i=0;i<3;i++){
      const parts=timeFormatter.formatToParts(new Date(guess)),get=t=>Number(parts.find(p=>p.type===t).value);
      const shown=Date.UTC(get('year'),get('month')-1,get('day'),get('hour'),get('minute'),get('second'));guess-=shown-wanted;
    }
    return guess;
  }
  function date(value){
    const cached=dateCache.get(String(value||''));if(cached!==undefined)return cached;
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return KCBirthdays.parse(value)?value:'';
    const time=stamp(value);if(!Number.isFinite(time))return '';
    const parts=dayFormatter.formatToParts(new Date(time)),get=t=>parts.find(p=>p.type===t).value,day=get('year')+'-'+get('month')+'-'+get('day');
    if(dateCache.size>2048)dateCache.clear();dateCache.set(String(value||''),day);return day;
  }
  function kind(value){const t=String(value||'').toLowerCase();return /gosse|pudel/.test(t)?'gosse':/kranz/.test(t)?'kranz':/9|durch/.test(t)?'nine':'';}
  function key(value,day){const time=stamp(value);return value&&Number.isFinite(time)?'evening:'+time:'day:'+day;}
  function build({people=[],catalog=[],evenings=[],logs=[],archives=[],eveningStartedAt='',archivedOnly=false,statementsOnly=false,today=KCBirthdays.today()}={}){
    const closedKeys=new Set(),archiveLogLimits=new Map(),sessions=new Map(),get=(id,day,value='')=>{if(!sessions.has(id))sessions.set(id,{key:id,date:day,stamp:value?stamp(value):NaN,people:new Map()});return sessions.get(id);};
    function person(s,name){const n=norm(name);if(!n)return null;if(!s.people.has(n))s.people.set(n,{name:String(name).trim(),present:0,gosse:0,nine:0,kranz:0,loser1:0,loser2:0,loser3:0,gKnown:false,eventCounts:{gosse:0,nine:0,kranz:0}});return s.people.get(n);}
    function gutters(p,cat){
      const keys=[...new Set((cat||[]).filter(s=>/gosse|pudel/i.test(s.label||'')&&!/könig|koenig/i.test(s.label||'')).map(s=>s.key))];
      return {known:keys.some(k=>Object.hasOwn(p.strafen||{},k)),value:keys.reduce((sum,k)=>sum+count(p.strafen?.[k]),0)};
    }
    function losses(p,item,cat){for(let rank=1;rank<=3;rank++){const keys=(cat||[]).filter(s=>new RegExp('^'+rank+'[. ]*\\s*verlierer','i').test(String(s.label||'').trim())).map(s=>s.key);p['loser'+rank]=keys.reduce((sum,key)=>sum+count(item.strafen?.[key]),0);}}
    for(const e of statementsOnly?[]:evenings){
      const day=date(e.eveningStartedAt)||date(e.date);if(!day)continue;const sessionKey=key(e.eveningStartedAt,day);closedKeys.add(sessionKey);const s=get(sessionKey,day,e.eveningStartedAt);
      for(const name of new Set(e.attendees||[])){const p=person(s,name);if(p)p.present=1;}
      for(const item of e.statsPeople||[]){const p=person(s,item.name);if(!p)continue;Object.assign(p,{present:item.present?1:p.present,gosse:count(item.gosse),nine:count(item.nine),kranz:count(item.kranz),loser1:count(item.loser1??p.loser1),loser2:count(item.loser2??p.loser2),loser3:count(item.loser3??p.loser3),gKnown:true,archiveStats:true});}
    }
    const seenArchives=new Set();
    for(const e of archives.slice().sort((a,b)=>(Date.parse(b.closedAt||b.date)||0)-(Date.parse(a.closedAt||a.date)||0))){
      if(e.category&&e.category!=='strafen'||e.kind==='cancelled'||e.status==='deleted')continue;
      const day=date(e.eveningStartedAt)||date(e.date);if(!day)continue;const id=key(e.eveningStartedAt,day);if(seenArchives.has(id))continue;seenArchives.add(id);closedKeys.add(id);archiveLogLimits.set(id,Date.parse(e.closedAt||e.date));
      const s=get(id,day,e.eveningStartedAt);
      for(const item of [...(e.members||[]),...(e.guests||[])]){
        const p=person(s,item.name);if(!p)continue;
        if(['present','excused','unexcused','cancelled'].includes(item.status)){p.present=item.status==='present'?1:0;p.archiveAttendanceKnown=true;}else if(typeof item.present==='boolean'){p.present=item.present?1:0;p.archiveAttendanceKnown=true;}
        losses(p,item,e.strafen?.length?e.strafen:catalog);const g=gutters(item,e.strafen?.length?e.strafen:catalog);if(g.known){p.gosse=g.value;p.gKnown=true;}
      }
      for(const item of e.statsPeople||[]){const p=person(s,item.name);if(!p)continue;Object.assign(p,{present:p.archiveAttendanceKnown?p.present:item.present?1:0,gosse:p.gKnown?p.gosse:count(item.gosse),nine:count(item.nine),kranz:count(item.kranz),loser1:count(item.loser1??p.loser1),loser2:count(item.loser2??p.loser2),loser3:count(item.loser3??p.loser3),gKnown:true,archiveStats:true});}
    }
    const seen=new Set();
    for(const entry of logs){
      const type=kind(entry.type);if(!type||!entry.thrower)continue;
      if(entry.id&&seen.has(entry.id))continue;if(entry.id)seen.add(entry.id);
      const day=date(entry.eveningStartedAt)||date(entry.eventDate)||date(entry.createdAt);if(!day)continue;
      const sessionKey=key(entry.eveningStartedAt,day),limit=archiveLogLimits.get(sessionKey),eventTime=Date.parse(entry.createdAt);
      // Ein Datum allein darf Testwürfe keinem echten PDF-Abend zuordnen.
      if(statementsOnly&&(!entry.eveningStartedAt||!closedKeys.has(sessionKey)||Number.isFinite(limit)&&Number.isFinite(eventTime)&&eventTime>limit))continue;
      const s=get(sessionKey,day,entry.eveningStartedAt),p=person(s,entry.thrower);if(p&&!p.archiveStats){p.eventCounts[type]++;p.present=1;}
    }
    const currentKey=key(eveningStartedAt,date(eveningStartedAt)||today);
    if(!statementsOnly&&people.some(p=>(p.present||p.left)&&!p.isDrinksOnly)){
      const s=get(currentKey,date(eveningStartedAt)||today,eveningStartedAt);
      for(const item of people.filter(p=>!p.isDrinksOnly&&(p.present||p.left))){
        const p=person(s,item.name);if(!p||p.archiveStats)continue;p.present=1;losses(p,item,catalog);const g=gutters(item,catalog);if(g.known){p.gosse=g.value;p.gKnown=true;}
      }
    }
    // Old attendance records had only a calendar date; merge them once where a precise evening is known.
    for(const s of [...sessions.values()])if(!statementsOnly&&s.key.startsWith('day:')){
      const candidates=[...sessions.values()].filter(e=>e.date===s.date&&!e.key.startsWith('day:'));
      if(candidates.length){const target=candidates[0];for(const item of s.people.values()){const p=person(target,item.name);p.present=Math.max(p.present,item.present);for(const k of ['gosse','nine','kranz'])p.eventCounts[k]+=item.eventCounts[k];if(!p.gKnown&&item.gKnown){p.gosse=item.gosse;p.gKnown=true;}}sessions.delete(s.key);}
    }
    return {currentKey,sessions:[...sessions.values()].filter(s=>!archivedOnly||closedKeys.has(s.key)||!statementsOnly&&[...closedKeys].some(k=>k==='day:'+s.date)).map(s=>({...s,people:[...s.people.values()].map(p=>({name:p.name,present:p.present,gosse:p.gKnown?p.gosse:p.eventCounts.gosse,nine:p.eventCounts.nine||p.nine,kranz:p.eventCounts.kranz||p.kranz,...(p.loser1?{loser1:p.loser1}:{}),...(p.loser2?{loser2:p.loser2}:{}),...(p.loser3?{loser3:p.loser3}:{})}))}))};
  }
  function baseline(data){return {sessionKey:data.currentKey,people:data.sessions.find(s=>s.key===data.currentKey)?.people||[]};}
  function summary(data,{settings=null,custom=false,from='',to='',people=[]}={}){
    if(from&&!KCBirthdays.parse(from)||to&&!KCBirthdays.parse(to)||from&&to&&from>to)throw new Error('Bitte einen gültigen Zeitraum wählen: Von darf nicht nach Bis liegen.');
    const rows=new Map(),rowFor=name=>{const n=norm(name);if(!rows.has(n))rows.set(n,{name:String(name).trim(),present:0,gosse:0,nine:0,kranz:0});return rows.get(n);};
    people.filter(p=>!p.isDrinksOnly&&!p.inactive).forEach(p=>rowFor(p.name));
    for(const session of data.sessions){
      if(custom?from&&session.date<from||to&&session.date>to:settings?.mode==='date'&&settings.startDate&&session.date<settings.startDate)continue;
      const partial=!custom&&settings?.mode==='now'&&session.key===settings.baseline?.sessionKey;
      if(!custom&&settings?.mode==='now'&&!partial&&(!Number.isFinite(session.stamp)||session.stamp<Date.parse(settings.startAt)))continue;
      for(const p of session.people){
        const row=rowFor(p.name),base=partial?settings.baseline.people.find(b=>norm(b.name)===norm(p.name)):null;
        for(const metric of ['present','gosse','nine','kranz','loser1','loser2','loser3']){const delta=Math.max(0,count(p[metric])-count(base?.[metric]));if(!metric.startsWith('loser')||delta)row[metric]=(row[metric]||0)+delta;}
      }
    }
    return [...rows.values()].sort((a,b)=>b.present-a.present||a.name.localeCompare(b.name,'de'));
  }
  window.KCPenaltyStats=Object.freeze({date,key,kind,build,baseline,summary,stamp});
})();
let penaltyStatsCustom=false,penaltyStatsViewClub='',penaltyStatsBusy=false,penaltyStatsPending=null;
function normalizePenaltyStatsType(type){const k=KCPenaltyStats.kind(type);return k==='nine'?'9er':k;}
function penaltyStatsSource(includeCurrent=false){
  const ready=typeof cashHistoryClub!=='undefined'&&cashHistoryClub===getClubFirestoreId(ACTIVE_CLUB);
  return KCPenaltyStats.build({people:persons,catalog:STRAFEN,evenings:kegelAbende,logs:penaltyStatsLog,archives:ready?cashHistoryEntries:[],eveningStartedAt:currentEveningStartedAt,archivedOnly:!includeCurrent,statementsOnly:!includeCurrent});
}
function applyPenaltyStatsSettings(value,cache=false){
  if(!value)return;if(Number(value.revision||0)<Number(penaltyStatsSettings?.revision||0))return;
  penaltyStatsSettings=JSON.parse(JSON.stringify(value));renderPenaltyStats();
  if(cache&&ACTIVE_CLUB&&typeof syncCurrentClubToStore==='function'){syncCurrentClubToStore();saveClubSystem();}
}
function getPenaltyStatsRange(){return {from:document.getElementById('penalty-stats-from')?.value||'',to:document.getElementById('penalty-stats-to')?.value||''};}
function isPenaltyStatsEntryInRange(entry,from,to){const day=KCPenaltyStats.date(entry.eveningStartedAt)||KCPenaltyStats.date(entry.eventDate)||KCPenaltyStats.date(entry.createdAt);return !!day&&(!from||day>=from)&&(!to||day<=to);}
function statsEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderPenaltyStats(){
  const body=document.getElementById('penalty-stats-body');if(!body)return;
  if(penaltyStatsViewClub!==ACTIVE_CLUB){penaltyStatsViewClub=ACTIVE_CLUB;penaltyStatsCustom=false;for(const id of ['penalty-stats-from','penalty-stats-to']){const input=document.getElementById(id);if(input)input.value='';}}
  const settings=penaltyStatsSettings,input=document.getElementById('penalty-stats-start'),period=document.getElementById('penalty-stats-period');
  if(input){const stamp=ACTIVE_CLUB+'|'+(settings?.revision||0);if(input.dataset.loaded!==stamp&&(input.dataset.club!==String(ACTIVE_CLUB)||document.activeElement!==input)){input.value=settings?.startDate||KCBirthdays.today();input.dataset.loaded=stamp;input.dataset.club=String(ACTIVE_CLUB);}}
  if(period)period.textContent=settings?.mode==='now'?'Zähler seit '+new Date(settings.startAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin'}):settings?.startDate?'Zähler seit '+settings.startDate.split('-').reverse().join('.'):'Zähler: PDF-Abschlüsse und nachgetragene Abende';
  const {from,to}=getPenaltyStatsRange(),label=document.getElementById('penalty-stats-range-label');
  const dataStatus=document.getElementById('penalty-stats-data-status');if(dataStatus)dataStatus.textContent=typeof cashHistoryClub==='undefined'||cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB)?(document.getElementById('cash-history-status')?.textContent||'Archiv wird beim Öffnen geladen; bisher fehlen die bestätigten Abrechnungen.'):'';
  if(label)label.textContent=penaltyStatsCustom?'Freier Zeitraum: '+(from||'Anfang')+' bis '+(to||'heute'):'Anzeige seit Zählbeginn';
  try{
    const rows=KCPenaltyStats.summary(penaltyStatsSource(),{settings,custom:penaltyStatsCustom,from:penaltyStatsCustom?from:'',to:penaltyStatsCustom?to:'',people:persons});
    if(window.KCActivityReports){const table=body.closest('table');if(table){const holder=table.parentElement;holder.innerHTML=KCActivityReports.table(rows,KCActivityReports.penaltyColumns,'Strafen- und Wurfstatistik');holder.querySelector('tbody').id='penalty-stats-body';}window.KCReportApp?.renderGames();return;}
    body.innerHTML=rows.map(p=>'<tr><th scope="row" class="sticky-col">'+statsEscape(p.name)+'</th><td>'+p.present+'</td><td>'+p.gosse+'</td><td>'+p.nine+'</td><td>'+p.kranz+'</td></tr>').join('')||'<tr><td colspan="5">Keine Statistikdaten vorhanden.</td></tr>';
  }catch(error){body.innerHTML='<tr><td colspan="5">'+statsEscape(error.message)+'</td></tr>';}
}
function usePenaltyStatsRange(){penaltyStatsCustom=true;renderPenaltyStats();}
function setPenaltyStatsRangeCycle(){penaltyStatsCustom=false;renderPenaltyStats();}
function setPenaltyStatsRangeToday(){const today=KCBirthdays.today();document.getElementById('penalty-stats-from').value=today;document.getElementById('penalty-stats-to').value=today;usePenaltyStatsRange();}
function setPenaltyStatsRangeMonth(){const today=KCBirthdays.today();document.getElementById('penalty-stats-from').value=today.slice(0,7)+'-01';document.getElementById('penalty-stats-to').value=today;usePenaltyStatsRange();}
function setPenaltyStatsRangeAll(){document.getElementById('penalty-stats-from').value='';document.getElementById('penalty-stats-to').value='';usePenaltyStatsRange();}
async function changePenaltyStatsSettings(mode){
  if(!ACTIVE_CLUB||penaltyStatsBusy)return false;
  if(!navigator.onLine||!window.firestoreApi?.updatePenaltyStatsSettings){showToast('Zum Speichern des Statistikstarts bitte verbinden.','error');return false;}
  const startDate=document.getElementById('penalty-stats-start').value;
  if(mode==='date'&&!KCBirthdays.parse(startDate)){showToast('Bitte ein gültiges Startdatum wählen','error');return false;}
  const club=ACTIVE_CLUB,signature=club+'|'+mode+'|'+(mode==='date'?startDate:'');
  if(penaltyStatsPending?.signature!==signature||penaltyStatsPending.request.expectedRevision!==(Number(penaltyStatsSettings?.revision)||0)&&penaltyStatsPending.request.id!==penaltyStatsSettings?.lastRequestId){
    if(mode==='now'&&!confirm('Statistik ab jetzt auf 0 setzen? Frühere Daten bleiben über „Gesamte Historie“ oder einen freien Zeitraum abrufbar.'))return false;
    penaltyStatsPending={signature,request:{id:'stats_'+crypto.randomUUID(),mode,startDate,expectedRevision:Number(penaltyStatsSettings?.revision)||0}};
  }
  penaltyStatsBusy=true;const controls=[...document.querySelectorAll('#penalty-stats-cycle-controls input,#penalty-stats-cycle-controls button')];controls.forEach(el=>el.disabled=true);
  try{
    if(typeof saveToFirestore==='function'&&!(await saveToFirestore(false)))throw new Error('Aktueller Stand konnte nicht synchronisiert werden');
    const settings=await window.firestoreApi.updatePenaltyStatsSettings(getClubFirestoreId(club),penaltyStatsPending.request);
    if(ACTIVE_CLUB!==club)return false;applyPenaltyStatsSettings(settings);penaltyStatsCustom=false;penaltyStatsPending=null;persistState();renderPenaltyStats();showToast('Statistik-Zählbeginn gespeichert','success');return true;
  }catch(error){if(ACTIVE_CLUB===club)showToast('Statistikstart konnte nicht gespeichert werden: '+error.message,'error');return false;}
  finally{penaltyStatsBusy=false;controls.forEach(el=>el.disabled=false);}
}
function savePenaltyStatsStart(){return changePenaltyStatsSettings('date');}
function resetPenaltyStatsCounter(){return changePenaltyStatsSettings('now');}
