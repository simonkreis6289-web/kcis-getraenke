// Clubkalender: feste Serienslots, einzelne Terminänderungen und sichere Synchronisation.
const kcSeriesPending=new Map(),kcSeriesChecked=new Map();
let kcCalendarBusy=false,kcCalendarEdit=null,kcNewEventId='',kcSeriesRequest=null;
function kcCalendarStatus(message){const box=document.getElementById('kc-calendar-status');if(box)box.textContent=message;}
function kcApplyCalendarState(state,cache=true){
  if(state?.clubCalendarData?.calendarRevision)state=state.clubCalendarData;
  if(!Array.isArray(state?.clubTermine))return false;
  const revision=Number(state.calendarRevision)||0;if(revision<kcCalendarRevision)return false;
  clubTermine=JSON.parse(JSON.stringify(state.clubTermine));
  clubKegelSerie=state.clubKegelSerie?JSON.parse(JSON.stringify(state.clubKegelSerie)):null;
  kcCalendarRevision=revision;
  if(cache){if(typeof syncCurrentClubToStore==='function'&&ACTIVE_CLUB){syncCurrentClubToStore();saveClubSystem();}kcRenderTermine();}
  return true;
}
async function kcEnsureKegelSeries(force=false){
  if(!ACTIVE_CLUB)return false;
  const club=ACTIVE_CLUB,today=KCBirthdays.today();
  if(kcSeriesPending.has(club))return kcSeriesPending.get(club);
  if(!force&&kcSeriesChecked.get(club)===today)return true;
  if(!navigator.onLine||!window.firestoreApi?.updateClubCalendar){kcCalendarStatus('Gespeicherte Termine bleiben sichtbar. Zum Ergänzen der Serie bitte verbinden.');return false;}
  const work=(async()=>{
    try{
      const calendar=await window.firestoreApi.updateClubCalendar(getClubFirestoreId(club),{action:'ensure',today,bootstrapEvents:clubTermine});
      kcSeriesChecked.set(club,today);
      if(ACTIVE_CLUB===club){kcApplyCalendarState(calendar);kcCalendarStatus('');}
      return true;
    }catch(error){console.error('Kegelterminserie',error);if(ACTIVE_CLUB===club)kcCalendarStatus('Termine konnten nicht ergänzt werden: '+error.message);return false;}
    finally{kcSeriesPending.delete(club);}
  })();
  kcSeriesPending.set(club,work);return work;
}
async function kcChangeCalendar(request){
  if(kcCalendarBusy||!ACTIVE_CLUB)return false;
  if(!navigator.onLine||!window.firestoreApi?.updateClubCalendar){showToast('Zum Ändern der Termine bitte eine Verbindung herstellen.','error');return false;}
  const club=ACTIVE_CLUB;kcCalendarBusy=true;
  const controls=[...document.querySelectorAll('#kc-series-settings input, #kc-series-settings select, #kc-series-settings button, #kc-event-create-form input, #kc-event-create-form select, #kc-event-create-form button, #kc-event-edit-modal input, #kc-event-edit-modal select, #kc-event-edit-modal button, #kc-termine-list button')];controls.forEach(el=>el.disabled=true);
  try{
    const calendar=await window.firestoreApi.updateClubCalendar(getClubFirestoreId(club),{...request,today:KCBirthdays.today(),bootstrapEvents:clubTermine});
    if(ACTIVE_CLUB===club){kcApplyCalendarState(calendar);kcCalendarStatus('');}
    return ACTIVE_CLUB===club;
  }catch(error){console.error('Kalenderänderung',error);if(ACTIVE_CLUB===club){kcCalendarStatus(error.message);showToast(error.message,'error');}return false;}
  finally{kcCalendarBusy=false;controls.forEach(el=>el.disabled=false);}
}
function kcTerminArten(){return Array.isArray(clubTerminGruende)?clubTerminGruende:[]}
function kcSafeDate(event){const d=new Date(event.date+'T'+(event.time||'00:00'));return Number.isNaN(d.getTime())?null:d}
function kcRenderTerminGruende(){
 const box=document.getElementById('kc-terminarten-list');if(!box)return;box.replaceChildren();
 for(const type of kcTerminArten().filter(type=>type.id!=='geburtstag')){
  const row=document.createElement('div');row.className='kc-event-row';
  const label=document.createElement('strong');label.textContent=(type.emoji||'📅')+' '+type.name;
  const del=document.createElement('button');del.className='kc-icon-delete';del.title='Terminart entfernen';del.setAttribute('aria-label','Terminart '+type.name+' entfernen');del.textContent='🗑️';
  const fixed=type.id==='kegeln'||type.id==='tour';del.disabled=fixed;
  if(fixed)del.title='Kegeln und Kegeltour bleiben als Standard erhalten';
  del.onclick=()=>{if(!confirm('Terminart '+type.name+' entfernen? Bestehende Termine bleiben erhalten.'))return;clubTerminGruende=clubTerminGruende.filter(x=>x.id!==type.id);kcRenderTerminGruende();kcRenderTermine();persistState()};
  row.append(label,del);box.append(row);
 }
}
function kcAddTerminGrund(){
 const input=document.getElementById('kc-new-terminart'),name=input?.value.trim();
 if(!name)return;
 if(name.toLocaleLowerCase('de')==='geburtstag'){showToast('Geburtstage werden in der Mitgliederverwaltung gepflegt.','error');return}
 if(kcTerminArten().some(t=>t.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de'))){showToast('Terminart bereits vorhanden','error');return}
 clubTerminGruende.push({id:'custom_'+Date.now(),name,emoji:'📅'});
 input.value='';kcRenderTerminGruende();kcRenderTermine();persistState();showToast('Terminart gespeichert','success');
}
function kcPopulateEventTypes(select,selected){
  select.replaceChildren();
  const types=kcTerminArten().filter(type=>type.id!=='geburtstag');
  if(selected&&!types.some(type=>type.id===selected)&&selected!=='geburtstag')types.push({id:selected,name:selected,emoji:'📅'});
  const wanted=types.some(type=>type.id===selected)?selected:types[0]?.id;
  for(const type of types){const option=document.createElement('option');option.value=type.id;option.textContent=(type.emoji||'📅')+' '+type.name;option.selected=type.id===wanted;select.append(option);}
}
function kcRenderTermine(){
  const box=document.getElementById('kc-termine-list'),select=document.getElementById('kc-event-type');if(!box||!select)return;
  kcPopulateEventTypes(select,select.value);
  const info=document.getElementById('kc-series-info');
  const config=KCKegelCalendar.seriesFor(clubTermine||[],clubKegelSerie,KCBirthdays.today()),days=['sonntags','montags','dienstags','mittwochs','donnerstags','freitags','samstags'];
  if(info)info.textContent='Automatisch alle '+config.intervalDays/7+' Wochen '+days[new Date(KCKegelCalendar.timestamp(config.anchorDate)).getUTCDay()]+' um '+config.time+' Uhr · Rhythmus ab '+config.anchorDate.split('-').reverse().join('.')+' · Vorschau bis '+KCKegelCalendar.through(KCBirthdays.today()).split('-').reverse().join('.')+'. Einzelne Änderungen verschieben die übrige Serie nicht.';
  kcRenderSeriesSettings(config);
  box.replaceChildren();
  const events=[...(clubTermine||[]).filter(event=>event.type!=='geburtstag'),...KCBirthdays.events(persons,clubTermine)]
    .sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
  for(const event of events){
    const type=kcTerminArten().find(type=>type.id===event.type),row=document.createElement('div');row.className='kc-event-row';
    const label=document.createElement('span'),date=kcSafeDate(event);
    const when=date?(event.recurring?date.toLocaleDateString('de-DE'):date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})):event.date;
    label.textContent=(event.type==='geburtstag'?'🎂':type?.emoji||'📅')+' '+(event.type==='geburtstag'?'Geburtstag':type?.name||event.type)+' · '+when+(event.note?' · '+event.note:'')+(event.recurring?' · jährlich':'');
    if(event.seriesDate){const hint=document.createElement('small');hint.className='kc-series-label';hint.textContent=event.date!==event.seriesDate||event.time!==config.time||event.type!=='kegeln'?'Serientermin · individuell geändert':'Serientermin';label.append(hint);}
    const actions=document.createElement('div');actions.className='kc-event-actions';
    if(event.memberBirthday){
      const edit=document.createElement('button');edit.type='button';edit.className='secondary-btn';edit.textContent='👤 Mitglied bearbeiten';edit.onclick=()=>openMemberProfile(event.personName);actions.append(edit);
    }else{
      if(event.type!=='geburtstag'){const edit=document.createElement('button');edit.type='button';edit.className='secondary-btn';edit.textContent='✏️ Bearbeiten';edit.onclick=()=>kcOpenEventEdit(event.id);actions.append(edit);}
      const remove=document.createElement('button');remove.type='button';remove.className='kc-icon-delete';remove.textContent='🗑️';remove.title='Termin löschen';remove.setAttribute('aria-label','Termin löschen');
      remove.onclick=async()=>{if(!confirm('Diesen Termin löschen?'+(event.seriesDate?' Er wird beim Ergänzen der Serie nicht erneut angelegt.':'')))return;if(await kcChangeCalendar({action:'delete',id:event.id,expectedRevision:Number(event.eventRevision)||0}))showToast('Termin gelöscht','success');};actions.append(remove);
    }
    row.append(label,actions);box.append(row);
  }
  if(!events.length)box.textContent='Noch keine Termine angelegt.';
}
async function kcAddTermin(){
  const event={type:document.getElementById('kc-event-type').value,date:document.getElementById('kc-event-date').value,time:document.getElementById('kc-event-time').value,note:document.getElementById('kc-event-note').value.trim()};
  if(!KCBirthdays.parse(event.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time||'')){showToast('Gültiges Datum und Uhrzeit eingeben','error');return;}
  if(!kcNewEventId)kcNewEventId='kc_manual_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2));
  if(await kcChangeCalendar({action:'add',id:kcNewEventId,event})){kcNewEventId='';document.getElementById('kc-event-note').value='';showToast('Termin gespeichert','success');}
}
function kcOpenEventEdit(id){
  if(kcCalendarBusy)return;const event=clubTermine.find(event=>event.id===id);if(!event)return;
  kcCalendarEdit={id,club:ACTIVE_CLUB,revision:Number(event.eventRevision)||0};
  kcPopulateEventTypes(document.getElementById('kc-edit-event-type'),event.type);
  document.getElementById('kc-edit-event-date').value=event.date;document.getElementById('kc-edit-event-time').value=event.time||'20:00';document.getElementById('kc-edit-event-note').value=event.note||'';
  document.getElementById('kc-edit-event-series').textContent=event.seriesDate?'Ursprünglicher Serientermin: '+event.seriesDate.split('-').reverse().join('.')+'. Verschieben ist auch auf einen anderen Wochentag möglich. Der ursprüngliche Termin wird nicht erneut erstellt.':'Dieser einzelne Termin kann frei geändert werden.';
  document.getElementById('kc-event-edit-modal').classList.remove('hidden');document.getElementById('kc-edit-event-date').focus();
}
function kcCloseEventEdit(){if(!kcCalendarBusy){kcCalendarEdit=null;document.getElementById('kc-event-edit-modal')?.classList.add('hidden');}}
async function kcSaveEventEdit(event){
  event?.preventDefault();const draft=kcCalendarEdit;if(!draft||kcCalendarBusy)return;
  if(draft.club!==ACTIVE_CLUB){showToast('Club gewechselt. Bitte Termin erneut öffnen.','error');return;}
  const fields={type:document.getElementById('kc-edit-event-type').value,date:document.getElementById('kc-edit-event-date').value,time:document.getElementById('kc-edit-event-time').value,note:document.getElementById('kc-edit-event-note').value.trim()};
  if(await kcChangeCalendar({action:'edit',id:draft.id,expectedRevision:draft.revision,event:fields})){kcCloseEventEdit();showToast('Termin geändert','success');}
}
function kcShowInfo(){const input=document.getElementById('kc-dashboard-url');if(!input)return;const url=new URL('dashboard.html',location.href);const club=new URLSearchParams(location.search).get('club');if(club)url.searchParams.set('club',club);input.value=url.href;document.getElementById('kc-dashboard-link').href=url.href}
function kcCopyDashboard(){const input=document.getElementById('kc-dashboard-url');input.select();navigator.clipboard?.writeText(input.value).then(()=>showToast('Link kopiert','success')).catch(()=>document.execCommand('copy'))}
function kcRenderSeriesSettings(config){
  const form=document.getElementById('kc-series-settings');if(!form)return;
  const key=ACTIVE_CLUB+'|'+kcCalendarRevision;
  if(form.dataset.loadedKey===key)return;
  if(form.dataset.club===ACTIVE_CLUB&&form.contains(document.activeElement))return;
  const today=KCBirthdays.today(),start=KCKegelCalendar.timestamp(config.anchorDate),next=start+Math.max(0,Math.ceil((KCKegelCalendar.timestamp(today)-start)/(config.intervalDays*86400000)))*config.intervalDays*86400000;
  document.getElementById('kc-series-weeks').value=config.intervalDays/7;
  document.getElementById('kc-series-weekday').value=new Date(start).getUTCDay();
  document.getElementById('kc-series-first').value=new Date(next).toISOString().slice(0,10);
  document.getElementById('kc-series-time').value=config.time;
  form.dataset.loadedKey=key;form.dataset.club=ACTIVE_CLUB;
}
function kcSeriesWeekdayChanged(){
  const input=document.getElementById('kc-series-first'),value=KCBirthdays.parse(input.value)?input.value:KCBirthdays.today(),day=Number(document.getElementById('kc-series-weekday').value),stamp=KCKegelCalendar.timestamp(value);
  input.value=new Date(stamp+((day-new Date(stamp).getUTCDay()+7)%7)*86400000).toISOString().slice(0,10);
}
function kcSeriesFirstChanged(){const value=document.getElementById('kc-series-first').value;if(KCBirthdays.parse(value))document.getElementById('kc-series-weekday').value=new Date(KCKegelCalendar.timestamp(value)).getUTCDay();}
async function kcSaveSeriesSettings(){
  if(kcCalendarBusy||!ACTIVE_CLUB)return;
  const config={intervalWeeks:Number(document.getElementById('kc-series-weeks').value),weekday:Number(document.getElementById('kc-series-weekday').value),anchorDate:document.getElementById('kc-series-first').value,time:document.getElementById('kc-series-time').value};
  try{KCKegelCalendar.perform({clubTermine,clubKegelSerie,calendarRevision:kcCalendarRevision},{action:'reconfigure',id:'kc_schedule_validate',config,expectedRevision:kcCalendarRevision,today:KCBirthdays.today()});}catch(error){showToast(error.message,'error');return;}
  const signature=ACTIVE_CLUB+'|'+JSON.stringify(config);
  if(kcSeriesRequest&&kcSeriesRequest.request.expectedRevision!==kcCalendarRevision&&clubKegelSerie?.lastRequestId!==kcSeriesRequest.request.id)kcSeriesRequest=null;
  if(kcSeriesRequest?.signature!==signature){
    const count=clubTermine.filter(e=>e.type==='kegeln'&&e.date>=KCBirthdays.today()).length;
    if(!confirm(count+' künftige Kegeltermine durch die neue Serie ersetzen? Auch einzeln verschobene Kegeltermine werden ersetzt. Vergangene Termine, Touren und Geburtstage bleiben erhalten.'))return;
    kcSeriesRequest={signature,request:{action:'reconfigure',id:'kc_schedule_'+crypto.randomUUID(),expectedRevision:kcCalendarRevision,config}};
  }
  if(await kcChangeCalendar(kcSeriesRequest.request)){kcSeriesRequest=null;showToast('Neue Terminserie erstellt','success');}
}

setInterval(()=>{if(!document.getElementById('tab-termine')?.classList.contains('hidden'))kcRenderTermine();if(document.visibilityState!=='hidden')kcEnsureKegelSeries();},60000);
window.addEventListener('online',()=>kcEnsureKegelSeries(true));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')kcEnsureKegelSeries();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')kcCloseEventEdit();});
