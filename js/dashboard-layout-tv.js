/* Vorhandene Panels umsetzen; Spiel- und Buchungsdaten bleiben unangetastet. */
(() => {
 const M=window.KCDashboardLayout;let layoutStamp='',tickerStamp='',resizeQueued=false;
 const $=id=>document.getElementById(id);
 let arrangement=null,rotationStart=0,rotationTimer=null;
 function rotate(now=Date.now()){
  if(rotationTimer!==null){clearTimeout(rotationTimer);rotationTimer=null;}if(!arrangement)return;
  let delay=Infinity;
  for(const slot of M.slots){const items=arrangement.groups[slot],current=M.cycle(items,arrangement.settings,now-rotationStart);
   for(const key of items){const panel=$('dashboard-panel-'+key);if(panel)panel.hidden=key!==current.key;}
   const box=$('dashboard-slot-'+slot);if(box){box.dataset.activePanel=current.key||'';const dots=box.querySelectorAll('[data-panel-key]');for(const dot of dots){const active=dot.dataset.panelKey===current.key;dot.classList.toggle('active',active);dot.setAttribute('aria-current',String(active));}}
   if(items.length>1)delay=Math.min(delay,current.remaining);
  }
  if(Number.isFinite(delay))rotationTimer=setTimeout(()=>rotate(),Math.max(25,delay));
 }
 function apply(settings){
  const r=M.resolve(settings),stamp=JSON.stringify(r.settings.panels);if(stamp===layoutStamp)return r;const main=document.querySelector('main.dashboard'),left=document.querySelector('.side.left'),right=document.querySelector('.side.right');if(!main||!left||!right)return r;layoutStamp=stamp;arrangement=r;rotationStart=Date.now();
  let parking=$('dashboard-panel-parking');if(!parking){parking=document.createElement('div');parking.id='dashboard-panel-parking';parking.hidden=true;main.append(parking);}
  const panels=new Map(M.keys.map(key=>[key,$('dashboard-panel-'+key)]));
  for(const key of M.keys){const panel=panels.get(key);if(panel){panel.hidden=true;parking.append(panel);}}
  for(const [side,box] of [['left',left],['right',right]]){
   const occupied=M.slots.filter(slot=>slot.startsWith(side)&&r.groups[slot].length);box.replaceChildren();box.hidden=!occupied.length;box.classList.toggle('dashboard-side-full',occupied.length===1);box.style.gridTemplateRows='repeat('+Math.max(1,occupied.length)+',minmax(0,1fr))';
   for(const slot of occupied){const frame=document.createElement('div');frame.className='dashboard-panel-slot';frame.id='dashboard-slot-'+slot;
    for(const key of r.groups[slot])if(panels.get(key))frame.append(panels.get(key));
    if(r.groups[slot].length>1){const dots=document.createElement('div');dots.className='dashboard-rotation-dots';dots.setAttribute('aria-label','Wechselnde Anzeigen');for(const key of r.groups[slot]){const dot=document.createElement('span');dot.dataset.panelKey=key;dot.title=M.labels[key]+' · '+r.settings.panels[key].seconds+' Sekunden';dots.append(dot);}frame.append(dots);}box.append(frame);
   }
  }
  const width='minmax(190px,17%)',columns=[...(r.left.length?[width]:[]),'minmax(0,1fr)',...(r.right.length?[width]:[])];main.style.gridTemplateColumns=columns.join(' ');main.dataset.panelCount=String(r.count);left.style.gridColumn='1';document.querySelector('.stage').style.gridColumn=String(r.left.length?2:1);right.style.gridColumn=String(columns.length);rotate();
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
  for(const message of M.normalize(root?.dashboardSettings).tickerMessages)if(message.enabled&&message.text)groups.push(['dashboard-message-'+message.id,message.text]);
  const stamp=JSON.stringify(groups),track=$('dashboard-ticker-track');if(!track||stamp===tickerStamp)return;tickerStamp=stamp;track.replaceChildren();const first=document.createElement('div');first.className='dashboard-ticker-copy';for(const [id,text] of groups){const span=document.createElement('span');span.id=id;span.textContent=text;span.hidden=!text;first.append(span);}const second=first.cloneNode(true);second.setAttribute('aria-hidden','true');for(const el of second.querySelectorAll('[id]'))el.removeAttribute('id');track.append(first,second);tickerFit();
 }
 let popupScope='',popupInitialized=false,popupTimer=null,popupSeconds=3;const seenThrows=new Set();
 function hidePopup(){if(popupTimer!==null){clearTimeout(popupTimer);popupTimer=null;}const box=$('dashboard-throw-popup');if(box)box.hidden=true;}
 function feed(root,club,now=Date.now()){
  const scope=String(club||'')+'|'+String(root?.currentEveningStartedAt||''),seconds=M.normalize(root?.dashboardSettings).popupSeconds;
  if(scope!==popupScope){popupScope=scope;popupInitialized=false;seenThrows.clear();hidePopup();}
  if(seconds!==popupSeconds){popupSeconds=seconds;hidePopup();}
  if(!root)return;const start=Date.parse(root.currentEveningStartedAt||''),fresh=[];
  for(const event of Array.isArray(root.penaltyStatsLog)?root.penaltyStatsLog:[]){
   if(!event?.id||seenThrows.has(event.id))continue;seenThrows.add(event.id);const at=Date.parse(event.createdAt);
   if(event.eveningStartedAt?String(event.eveningStartedAt)!==String(root.currentEveningStartedAt||''):Number.isFinite(start)&&(!Number.isFinite(at)||at<start))continue;
   if(!popupInitialized||!Number.isFinite(at)||now-at>30000||now-at< -5000)continue;
   const type=String(event.type||'').toLowerCase(),kind=type==='gosse'?'gutter':type==='kranz'?'wreath':['9er','durchgeworfen'].includes(type)?'nine':'';
   if(kind)fresh.push({kind,at,name:String(event.thrower||event.name||event.personName||'')});
  }
  popupInitialized=true;if(!popupSeconds||!fresh.length||document.hidden)return;
  const event=fresh.sort((a,b)=>a.at-b.at).at(-1);let box=$('dashboard-throw-popup');
  if(!box){box=document.createElement('div');box.id='dashboard-throw-popup';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.hidden=true;document.body.append(box);}
  hidePopup();box.className='dashboard-throw-popup is-'+event.kind;
  const name=document.createElement('span'),title=document.createElement('strong');name.textContent=event.name;name.hidden=!event.name;title.textContent={gutter:'💀 Gosse!',wreath:'👑 Kranz!',nine:'🎯 Alle Neune!'}[event.kind];box.replaceChildren(title,name);box.hidden=false;
  popupTimer=setTimeout(hidePopup,popupSeconds*1000);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hidePopup();else rotate();});
 window.addEventListener('resize',()=>{if(!resizeQueued){resizeQueued=true;requestAnimationFrame(tickerFit);}});
 window.KCDashboardLayoutTV=Object.freeze({apply,rotate,highlight,ticker,tickerFit,feed});
})();
