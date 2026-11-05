// V169: zentrale, in Firebase gespeicherte Terminarten und Termine.
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
function kcRenderTermine(){
 const box=document.getElementById('kc-termine-list'),select=document.getElementById('kc-event-type');if(!box||!select)return;
 const selected=select.value;select.replaceChildren();
 for(const type of kcTerminArten().filter(type=>type.id!=='geburtstag')){const opt=document.createElement('option');opt.value=type.id;opt.textContent=(type.emoji||'📅')+' '+type.name;select.append(opt)}
 if([...select.options].some(x=>x.value===selected))select.value=selected;
 box.replaceChildren();
 const events=[...(clubTermine||[]).filter(e=>e.type!=='geburtstag'),...KCBirthdays.events(persons,clubTermine)]
  .sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
 for(const event of events){
  const type=kcTerminArten().find(x=>x.id===event.type);
  const row=document.createElement('div');row.className='kc-event-row';
  const label=document.createElement('span');
  const date=kcSafeDate(event);
  const when=date?(event.recurring?date.toLocaleDateString('de-DE'):date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})):event.date;
  label.textContent=(event.type==='geburtstag'?'🎂':type?.emoji||'📅')+' '+(event.type==='geburtstag'?'Geburtstag':type?.name||event.type)+' · '+when+(event.note?' · '+event.note:'')+(event.recurring?' · jährlich':'');
  if(event.memberBirthday){
    const edit=document.createElement('button');edit.type='button';edit.className='secondary-btn';edit.textContent='👤 Mitglied bearbeiten';
    edit.onclick=()=>openMemberProfile(event.personName);row.append(label,edit);box.append(row);continue;
  }
  const del=document.createElement('button');del.type='button';del.className='kc-icon-delete';del.textContent='🗑️';del.title='Termin löschen';del.setAttribute('aria-label','Termin löschen');
  del.onclick=()=>{if(!confirm('Diesen Termin löschen?'))return;clubTermine=clubTermine.filter(x=>x.id!==event.id);kcRenderTermine();persistState()};
  row.append(label,del);box.append(row);
 }
 if(!events.length)box.textContent='Noch keine Termine angelegt.';
}
function kcAddTermin(){
 const type=document.getElementById('kc-event-type').value,date=document.getElementById('kc-event-date').value,time=document.getElementById('kc-event-time').value,note=document.getElementById('kc-event-note').value.trim();
 if(!date||!time){showToast('Datum und Uhrzeit eingeben','error');return}
 if(type==='geburtstag'){showToast('Geburtstage bitte in der Mitgliederverwaltung eintragen.','error');return}
 clubTermine.push({id:'kc'+Date.now(),type,date,time,note});kcRenderTermine();persistState();showToast('Termin gespeichert','success');
}
function kcShowInfo(){const input=document.getElementById('kc-dashboard-url');if(!input)return;const url=new URL('dashboard.html',location.href);const club=new URLSearchParams(location.search).get('club');if(club)url.searchParams.set('club',club);input.value=url.href;document.getElementById('kc-dashboard-link').href=url.href}
function kcCopyDashboard(){const input=document.getElementById('kc-dashboard-url');input.select();navigator.clipboard?.writeText(input.value).then(()=>showToast('Link kopiert','success')).catch(()=>document.execCommand('copy'))}

setInterval(()=>{if(!document.getElementById('tab-termine')?.classList.contains('hidden'))kcRenderTermine();},60000);

