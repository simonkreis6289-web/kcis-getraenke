/* Vorhandene Panels umsetzen; Spiel- und Buchungsdaten bleiben unangetastet. */
(() => {
 const M=window.KCDashboardLayout;let layoutStamp='',tickerStamp='',resizeQueued=false;
 const $=id=>document.getElementById(id);
 function apply(settings){
  const r=M.resolve(settings),stamp=JSON.stringify(r.settings);if(stamp===layoutStamp)return r;const main=document.querySelector('main.dashboard'),left=document.querySelector('.side.left'),right=document.querySelector('.side.right');if(!main||!left||!right)return r;layoutStamp=stamp;
  let parking=$('dashboard-panel-parking');if(!parking){parking=document.createElement('div');parking.id='dashboard-panel-parking';parking.hidden=true;main.append(parking);}
  const panels=new Map(M.keys.map(key=>[key,$('dashboard-panel-'+key)]));
  for(const key of M.keys){const panel=panels.get(key);if(!panel)continue;panel.hidden=!r.settings.panels[key].enabled;if(panel.hidden)parking.append(panel);}
  for(const [side,box,items] of [['left',left,r.left],['right',right,r.right]]){box.hidden=!items.length;box.style.gridTemplateRows='repeat('+Math.max(1,items.length)+',minmax(0,1fr))';for(const key of items)if(panels.get(key))box.append(panels.get(key));}
  const width='minmax(190px,17%)',columns=[...(r.left.length?[width]:[]),'minmax(0,1fr)',...(r.right.length?[width]:[])];main.style.gridTemplateColumns=columns.join(' ');main.dataset.panelCount=String(r.count);left.style.gridColumn='1';document.querySelector('.stage').style.gridColumn=String(r.left.length?2:1);right.style.gridColumn=String(columns.length);
  requestAnimationFrame(()=>{if(typeof window.dispatchEvent==='function'&&typeof Event==='function')window.dispatchEvent(new Event('resize'));});return r;
 }
 function highlight(root,key,state){
  const turn=M.turn(root,key,state),norm=n=>String(n||'').trim().normalize('NFKC').toLocaleLowerCase('de'),members=new Set((turn.members||[]).map(norm));
  for(const seat of document.querySelectorAll('#dashboard-seating .tv-seat')){
   const name=seat.dataset.seatName||'',who=!!turn.name&&norm(name)===norm(turn.name),side=!who&&!!turn.team&&(members.size?members.has(norm(name)):seat.dataset.seatTeam===turn.team);
   seat.classList.toggle('is-current-thrower',who);seat.classList.toggle('is-current-team',side);seat.querySelector('.seat-turn-flag')?.remove();const basic=seat.dataset.seatLabel||seat.title;seat.title=(who?'Am Wurf · ':side?'Mannschaft am Wurf · ':'')+basic;seat.setAttribute('aria-label',seat.title);
   if(who||side){const flag=document.createElement('span');flag.className='seat-turn-flag';flag.textContent='▶';flag.setAttribute('aria-hidden','true');seat.append(flag);}
  }
 }
 function tickerFit(){
  resizeQueued=false;const viewport=$('dashboard-ticker'),track=$('dashboard-ticker-track');if(!viewport||!track)return;for(const copy of track.children)copy.style.minWidth=Math.max(0,viewport.clientWidth)+'px';const distance=track.firstElementChild?.scrollWidth||track.firstElementChild?.getBoundingClientRect?.().width||500;track.style.setProperty('--ticker-duration',Math.max(18,distance/42)+'s');
 }
 function ticker(root,now=new Date()){
  const data=M.upcoming(root,now),date=day=>new Date(day+'T12:00:00Z').toLocaleDateString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium'}),when=e=>date(e.date)+(e.endDate&&e.endDate>e.date?' – '+date(e.endDate):e.time?', '+e.time+' Uhr':'')+(e.note?' · '+e.note:'');
  const groups=[['kc-next-birthdays',data.birthdays.length?'🎂 Geburtstage bis zum nächsten Kegeln: '+data.birthdays.map(e=>e.date.slice(8,10)+'.'+e.date.slice(5,7)+'. '+(e.note||e.personName||'')).join(' · '):''],['kc-next-tour',data.tour?'🚌 Kegeltour: '+when(data.tour):''],['kc-next-kegeln',data.kegeln?'🎳 Nächstes Kegeln: '+when(data.kegeln):'🎳 Noch kein nächster Kegeltermin']];
  const stamp=JSON.stringify(groups),track=$('dashboard-ticker-track');if(!track||stamp===tickerStamp)return;tickerStamp=stamp;track.replaceChildren();const first=document.createElement('div');first.className='dashboard-ticker-copy';for(const [id,text] of groups){const span=document.createElement('span');span.id=id;span.textContent=text;span.hidden=!text;first.append(span);}const second=first.cloneNode(true);second.setAttribute('aria-hidden','true');for(const el of second.querySelectorAll('[id]'))el.removeAttribute('id');track.append(first,second);tickerFit();
 }
 window.addEventListener('resize',()=>{if(!resizeQueued){resizeQueued=true;requestAnimationFrame(tickerFit);}});
 window.KCDashboardLayoutTV=Object.freeze({apply,highlight,ticker,tickerFit});
})();
