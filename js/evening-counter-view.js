/* Shared compact scoreboard; the TV never writes counter values. */
(()=>{
 const M=window.KCEveningCounters;
 if(!M)return;
 const pin='<path d="M10 2h4l-.7 5c0 2 3.7 4 3.7 9 0 3-2 6-5 6s-5-3-5-6c0-5 3.7-7 3.7-9z"/><path d="M10 8h4" stroke="currentColor" stroke-width="1.5" fill="none"/>';
 const dot=(x,y,r=1.6)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
 const diamond=[[12,3],[7.5,7.5],[16.5,7.5],[3,12],[12,12],[21,12],[7.5,16.5],[16.5,16.5],[12,21]];
 const icons={
  gutters:'<path d="M4 3L2 21h20L20 3M7 3L6 21M17 3l1 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'+dot(19,15,2.5),
  nines:diamond.map(v=>dot(...v)).join(''),
  wreaths:diamond.filter((_,i)=>i!==4).map(v=>dot(...v)).join('')+'<circle cx="12" cy="12" r="1.8" fill="none" stroke="currentColor"/>',
  throws:'<circle cx="12" cy="12" r="9"/><path d="M8 8h.1M12 6h.1M15 9h.1" stroke="#152334" stroke-width="2.5" stroke-linecap="round"/>',
  pins:pin
 };
 const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">'+icons[k]+'</svg>';
 const markup=()=>M.keys.map(k=>'<div class="kc-counter kc-counter-'+k+'">'+svg(k)+'<span>'+M.labels[k]+'</span><strong data-evening-counter="'+k+'">0</strong></div>').join('');
 function paint(value){
  const counters=M.normalize(value);
  for(const host of document.querySelectorAll('[data-evening-counters]')){
   if(!host.firstElementChild)host.innerHTML=markup();
   for(const el of host.querySelectorAll('[data-evening-counter]')){
    const n=counters[el.dataset.eveningCounter],previous=el.dataset.value;
    if(previous===String(n))continue;
    el.textContent=n.toLocaleString('de-DE');el.dataset.value=String(n);
    if(previous!=null&&n>Number(previous)){el.classList.remove('counter-up');void el.offsetWidth;el.classList.add('counter-up');}
    else el.classList.remove('counter-up');
   }
  }
 }
 function edit(){
  const dialog=document.getElementById('evening-counter-editor');if(!dialog)return;
  dialog.hidden=false;
  const values=M.normalize(eveningCounters),dirty=new Set(),club=ACTIVE_CLUB,evening=currentEveningStartedAt;
  const form=dialog.querySelector('form');form.replaceChildren();
  for(const k of M.keys){
   const row=document.createElement('div');row.className='kc-counter-edit-row kc-counter-edit-'+k;
   const title=document.createElement('label');title.className='kc-counter-edit-label';title.htmlFor='evening-counter-input-'+k;title.innerHTML='<span class="kc-counter-edit-icon">'+svg(k)+'</span><span>'+M.labels[k]+'</span>';const input=document.createElement('input');input.type='number';input.id='evening-counter-input-'+k;input.inputMode='numeric';input.min='0';input.max=String(Number.MAX_SAFE_INTEGER);input.step='1';input.required=true;input.name=k;input.value=String(values[k]);
   const reset=document.createElement('button');reset.type='button';reset.className='kc-counter-edit-reset';reset.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a8 8 0 1 1 2 6M4 4v7h7"/></svg><span>0</span>';reset.title=M.labels[k]+' zurücksetzen';reset.setAttribute('aria-label',M.labels[k]+' zurücksetzen');input.oninput=()=>dirty.add(k);reset.onclick=()=>{input.value='0';dirty.add(k);};row.append(title,input,reset);form.append(row);
  }
  const status=dialog.querySelector('[role=status]');status.textContent='';
  dialog.querySelector('[data-counter-reset]').onclick=()=>{for(const k of M.keys){form.querySelector('input[name="'+k+'"]').value='0';dirty.add(k);}};
  dialog.querySelector('[data-counter-close]').onclick=()=>{dialog.hidden=true;};
  dialog.querySelector('[data-counter-save]').onclick=async()=>{
   if(form.reportValidity&&!form.reportValidity())return;
   // Only explicitly edited fields are overwritten; live counts in other fields survive.
   const next=M.normalize(eveningCounters);
   for(const k of M.keys){const n=Number(form.querySelector('input[name="'+k+'"]').value);if(!Number.isSafeInteger(n)||n<0)return;if(dirty.has(k))next[k]=n;}
   if(ACTIVE_CLUB!==club||currentEveningStartedAt!==evening){status.textContent='Kegelabend gewechselt. Bitte erneut öffnen.';return;}
   if(!window.KCSharedSync?.ready||window.KCSharedSync.inUnit||window.KCSharedSync.working){status.textContent='Keine aktive Synchronisierung oder Buchung läuft.';return;}
   eveningCounterExcluded=M.exclude(getFirestoreState(),KCSharedCore.games,[...dirty]);eveningCounters=next;persistState();paint(eveningCounters);dialog.hidden=true;
  };
 }
 window.KCEveningCounterView=Object.freeze({paint,edit});
})();

/* A separate physical-statistics view: no financial penalty values are reused. */
(()=>{
 const M=window.KCEveningCounters;
 const hint='Es werden ausschließlich Würfe mit eindeutiger Spielerzuordnung berücksichtigt. Teamwürfe ohne festen Werfer sind nicht enthalten.';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sort=(rows,key)=>rows.slice().sort((a,b)=>(key==='name'?0:(b[key]??-1)-(a[key]??-1))||a.name.localeCompare(b.name,'de'));
 let liveSort='pins',yearSort='pins';
 const fields=M.keys.map(key=>[key,M.labels[key]]);
 function table(rows,columns,key,total=false){
  return '<table class="kc-personal-table"><thead><tr><th>Spieler</th>'+columns.map(([,label])=>'<th>'+esc(label)+'</th>').join('')+'</tr></thead><tbody>'+sort(rows,key).map(r=>'<tr data-personal-name="'+esc(r.name)+'"><th scope="row">'+esc(r.name)+'</th>'+columns.map(([k])=>'<td>'+esc(r[k]==null?'Nicht erfasst':typeof r[k]==='number'?r[k].toLocaleString('de-DE',{maximumFractionDigits:2}):r[k])+'</td>').join('')+'</tr>').join('')+'</tbody>'+(total?'<tfoot><tr><th>Gesamt</th>'+columns.map(([k])=>'<td>'+rows.reduce((n,r)=>n+(r[k]||0),0).toLocaleString('de-DE')+'</td>').join('')+'</tr></tfoot>':'')+'</table>';
 }
 function tv(value,people,avatar){
  const host=document.getElementById('dashboard-personal-throws');if(!host)return;
  const rows=liveRows(value,people),stamp=JSON.stringify([value?.partial,rows,people.map(p=>[p.name,p.playerColor,p.avatarData,p.avatar])]);
  if(host.dataset.stamp===stamp){fitTv();return;}host.dataset.stamp=stamp;
  const origins=new Map([...host.querySelectorAll('[data-personal-name]')].map(el=>[el.dataset.personalName,(el.getBoundingClientRect?.().top||0)]));
  host.innerHTML=table(rows,[['nines','9er'],['wreaths','Kränze'],['pins','Pins']],'pins',true)+(value?.partial||!value?'<p class="kc-personal-hint">Erfassung erst ab V328.</p>':'');
  for(const el of host.querySelectorAll('[data-personal-name]')){
   const name=el.dataset.personalName,p=people.find(x=>x.name===name)||{name},th=el.querySelector('th'),color=window.KCPlayerColors?.forPerson(p)||'#8094ad';
   th.style.borderLeft='3px solid '+color;
   const cell=document.createElement('span');cell.className='kc-personal-cell';
   if(avatar)cell.append(avatar(p,name));
   const label=document.createElement('span');label.className='kc-personal-name';label.textContent=name;label.title=name;
   cell.append(label);th.replaceChildren(cell);
   const y=origins.get(name),delta=y==null?0:y-(el.getBoundingClientRect?.().top||0);
   if(delta&&el.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)el.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],{duration:650,easing:'ease-in-out'});
  }
  if(!rows.length){const empty=document.createElement('p');empty.className='kc-personal-empty';empty.textContent='Noch keine persönlichen Würfe erfasst.';host.append(empty);}
  fitTv();
 }
 function fitTv(){
  const host=document.getElementById('dashboard-personal-throws');if(!host||!host.clientWidth||!host.clientHeight)return;
  const count=host.querySelectorAll('[data-personal-name]').length;
  const hint=host.querySelector('.kc-personal-hint'),available=host.clientHeight-12-(hint?.offsetHeight||0)-6;
  const rowHeight=Math.max(14,Math.min(38,Math.floor(available/Math.max(3,count+2))-3));
  const rowGap=rowHeight<23?1:3;
  const font=Math.max(9,Math.min(17,Math.floor(rowHeight*.52),Math.floor(host.clientWidth/20)));
  const avatar=Math.max(9,Math.min(26,rowHeight-5));
  for(const [key,v] of Object.entries({'row-height':rowHeight,'row-gap':rowGap,font,'avatar-size':avatar,'avatar-font':Math.max(8,Math.floor(avatar*.45))}))host.style.setProperty('--personal-'+key,v+'px');
 }
 function liveRows(value,people=[]){
  const rows=(value?.rows||[]).slice();
  if(value?.schema===1&&!value.partial)for(const p of people)if(!p.isDrinksOnly&&(p.present||p.left)&&!rows.some(r=>r.name===p.name))rows.push({name:p.name,...M.empty()});
  return rows;
 }
 function live(value,people=[]){
  const host=document.getElementById('personal-throws-live');if(!host)return;
  const rows=liveRows(value,people),stamp=JSON.stringify([rows,liveSort,value?.partial]);if(host.dataset.stamp===stamp)return;host.dataset.stamp=stamp;
  host.innerHTML=table(rows,fields,liveSort,true)+(value?.partial||!value?'<p>Erfassung erst ab V328; frühere Würfe nicht erfasst.</p>':'');
 }
 function annual(archives,settings,custom,from,to,people){
  if(custom&&(from&&!KCBirthdays.parse(from)||to&&!KCBirthdays.parse(to)||from&&to&&from>to))throw Error('Bitte einen gültigen Zeitraum wählen.');
  const rows=new Map(),seen=new Set(),unknown=new Set();
  for(const e of archives.slice().sort((a,b)=>String(b.closedAt||b.date).localeCompare(String(a.closedAt||a.date)))){
   if(e.category&&e.category!=='strafen'||e.kind==='cancelled'||e.status==='deleted')continue;
   const day=KCPenaltyStats.date(e.eveningStartedAt)||KCPenaltyStats.date(e.date);if(!day)continue;
   const id=KCPenaltyStats.key(e.eveningStartedAt,day);if(seen.has(id))continue;seen.add(id);
   const partial=!custom&&settings?.mode==='now'&&id===settings.baseline?.sessionKey;
   if(custom?(from&&day<from||to&&day>to):settings?.mode==='date'&&settings.startDate&&day<settings.startDate||settings?.mode==='now'&&!partial&&!(KCPenaltyStats.stamp(e.eveningStartedAt)>=Date.parse(settings.startAt)))continue;
   const stats=e.personalThrows, values=stats?.schema===1?stats.rows||[]:null;
   const names=new Set([...(e.members||[]),...(e.guests||[]),...(e.statsPeople||[])].filter(p=>p.status==='present'||p.present||p.left).map(p=>p.name));for(const r of values||[])names.add(r.name);
   if(!values||stats.partial)unknown.add(id);
   for(const name of names){
    const r=rows.get(name)||{name,recorded:0,missing:0};rows.set(name,r);
    const v=values?.find(x=>x.name===name);
    if(!values||stats.partial&&!v){r.missing++;continue;}
    const base=partial?settings.baseline?.personalThrows?.rows?.find(x=>x.name===name):null;
    // A reset during a legacy evening without a baseline cannot reconstruct earlier throws.
    if(partial&&!settings.baseline?.personalThrows){r.missing++;continue;}
    r.recorded++;if(stats.partial)r.missing++;
    const delta=Object.fromEntries(M.keys.map(k=>[k,Math.max(0,(v?.[k]||0)-(base?.[k]||0))]));
    for(const k of M.keys)r[k]=(r[k]||0)+delta[k];if(r.best==null||delta.pins>r.best){r.best=delta.pins;r.bestDate=day.split('-').reverse().join('.');}
   }
  }
  for(const r of rows.values()){r.perThrow=r.throws?r.pins/r.throws:null;r.perEvening=r.recorded?r.pins/r.recorded:null;r.coverage=r.recorded?(r.missing?r.recorded+' erfasst / '+r.missing+' unvollständig':'Erfasst'):'Nicht erfasst';}
  return {rows:[...rows.values()],unknown:unknown.size};
 }
 function yearMarkup(archives,settings,custom,from,to,people){
  const data=annual(archives,settings,custom,from,to,people);
  return table(data.rows,[...fields,['perThrow','Ø Pins/Wurf'],['perEvening','Ø Pins/Abend'],['best','Bester Abend (Pins)'],['bestDate','Datum'],['coverage','Erfassung']],yearSort)+'<p>'+data.unknown+' Abende ohne vollständige persönliche Erfassung. Durchschnittswerte beziehen sich nur auf erfasste Werte.</p>';
 }
 function year(...args){const host=document.getElementById('personal-throws-year');if(host)try{host.innerHTML=yearMarkup(...args);}catch(e){host.textContent=e.message;}}
 window.KCPersonalThrowsView=Object.freeze({tv,fitTv,live,year,yearMarkup,annual,liveMarkup:(value,people)=>table(liveRows(value,people),fields,'pins',true),sortLive:key=>{liveSort=key;live(personalThrows,persons);},sortYear:key=>{yearSort=key;renderPenaltyStats();},hint});
})();
