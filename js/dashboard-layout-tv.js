/* Vorhandene Panels umsetzen; Spiel- und Buchungsdaten bleiben unangetastet. */
(() => {
 const M=window.KCDashboardLayout;let layoutStamp='',tickerStamp='',footballTickerStamp='',tickerLayoutStamp='',resizeQueued=false,lastTickerRoot=null,tickerSwitchTimer=null,tickerSwitchStart=0,tickerConfig=null;
 const $=id=>document.getElementById(id);
 let arrangement=null,rotationStart=0,rotationTimer=null;const fadeTimers=new Map();
 function clearFades(){for(const timer of fadeTimers.values())clearTimeout(timer);fadeTimers.clear();for(const box of document.querySelectorAll('.dashboard-panel-slot')){box.classList.remove('dashboard-is-transitioning');for(const panel of box.querySelectorAll('.panel'))panel.classList.remove('dashboard-fade-in','dashboard-fade-out');}}
 function rotate(now=Date.now()){
  if(rotationTimer!==null){clearTimeout(rotationTimer);rotationTimer=null;}if(!arrangement)return;
  let delay=Infinity;
  for(const slot of M.slots){const items=arrangement.groups[slot],current=M.cycle(items,arrangement.settings,now-rotationStart);
   const box=$('dashboard-slot-'+slot);if(box){
    const previous=box.dataset.activePanel||'',next=current.key||'';
    const duration=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:arrangement.settings.transitionSeconds*1000;
    if(fadeTimers.has(slot)){clearTimeout(fadeTimers.get(slot));fadeTimers.delete(slot);}
    box.classList.remove('dashboard-is-transitioning');
    for(const key of items){const panel=$('dashboard-panel-'+key);if(panel){panel.classList.remove('dashboard-fade-in','dashboard-fade-out');panel.hidden=key!==previous;}}
    if(previous&&next&&previous!==next&&duration>0){
     const outgoing=$('dashboard-panel-'+previous),incoming=$('dashboard-panel-'+next);
     if(outgoing&&incoming){box.style.setProperty('--dashboard-fade-time',duration+'ms');box.classList.add('dashboard-is-transitioning');incoming.hidden=false;incoming.classList.add('dashboard-fade-in');
      // Erzwingt den Startzustand, bevor die Deckkraft animiert wird.
      void incoming.offsetWidth;incoming.classList.remove('dashboard-fade-in');outgoing.classList.add('dashboard-fade-out');
      fadeTimers.set(slot,setTimeout(()=>{outgoing.hidden=true;outgoing.classList.remove('dashboard-fade-out');box.classList.remove('dashboard-is-transitioning');fadeTimers.delete(slot);},duration+35));
     }
    }else for(const key of items){const panel=$('dashboard-panel-'+key);if(panel)panel.hidden=key!==next;}
   box.dataset.activePanel=current.key||'';const dots=box.querySelectorAll('[data-panel-key]');for(const dot of dots){const active=dot.dataset.panelKey===current.key;dot.classList.toggle('active',active);dot.setAttribute('aria-current',String(active));}}
   if(items.length>1)delay=Math.min(delay,current.remaining);
  }
  resizeSeating();
  if(Number.isFinite(delay))rotationTimer=setTimeout(()=>rotate(),Math.max(25,delay));
 }
 function resizeSeating(){
  const panel=$('dashboard-seating'),width=panel?.getBoundingClientRect?.().width||0;
  if(width>0)panel.classList.toggle('seat-avatars-only',width<244);
  const counters=$('dashboard-panel-counters'),counterWidth=counters?.getBoundingClientRect?.().width||0;
  if(counterWidth>0)counters.classList.toggle('counter-compact',counterWidth<170);
  window.KCPersonalThrowsView?.fitTv?.();
 }
 function apply(settings){
  const r=M.resolve(settings),stamp=JSON.stringify({panels:r.settings.panels,transitionSeconds:r.settings.transitionSeconds,tableWidth:r.settings.tableWidth,tableHeight:r.settings.tableHeight});if(stamp===layoutStamp)return r;const main=document.querySelector('main.dashboard'),left=document.querySelector('.side.left'),right=document.querySelector('.side.right');if(!main||!left||!right)return r;layoutStamp=stamp;clearFades();arrangement=r;rotationStart=Date.now();
  let parking=$('dashboard-panel-parking');if(!parking){parking=document.createElement('div');parking.id='dashboard-panel-parking';parking.hidden=true;main.append(parking);}
  const panels=new Map(M.keys.map(key=>[key,$('dashboard-panel-'+key)]));
  for(const key of M.keys){const panel=panels.get(key);if(panel){panel.hidden=true;parking.append(panel);}}
  for(const [side,box] of [['left',left],['right',right]]){
   const occupied=M.slots.filter(slot=>slot.startsWith(side)&&r.groups[slot].length);box.replaceChildren();box.hidden=!occupied.length;box.classList.toggle('dashboard-side-full',occupied.length===1);const top=r.settings.tableHeight[side];
   box.style.gridTemplateRows=occupied.length===2?'minmax(0,'+top+'fr) minmax(0,'+(100-top)+'fr)':'minmax(0,1fr)';
   for(const slot of occupied){const frame=document.createElement('div');frame.className='dashboard-panel-slot';frame.id='dashboard-slot-'+slot;
    for(const key of r.groups[slot])if(panels.get(key))frame.append(panels.get(key));
    if(r.groups[slot].length>1){const dots=document.createElement('div');dots.className='dashboard-rotation-dots';dots.setAttribute('aria-label','Wechselnde Anzeigen');for(const key of r.groups[slot]){const dot=document.createElement('span');dot.dataset.panelKey=key;dot.title=M.labels[key]+' · '+r.settings.panels[key].seconds+' Sekunden';dots.append(dot);}frame.append(dots);}box.append(frame);
   }
  }
  const width=side=>'minmax(0,'+r.settings.tableWidth[side]+'%)',columns=[...(r.left.length?[width('left')]:[]),'minmax(0,1fr)',...(r.right.length?[width('right')]:[])];main.style.gridTemplateColumns=columns.join(' ');main.dataset.panelCount=String(r.count);left.style.gridColumn='1';document.querySelector('.stage').style.gridColumn=String(r.left.length?2:1);right.style.gridColumn=String(columns.length);rotate();
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
  resizeQueued=false;
  for(const [viewportId,trackId] of [['dashboard-ticker','dashboard-ticker-track'],['dashboard-football-ticker','dashboard-football-ticker-track']]){
   const viewport=$(viewportId),track=$(trackId);if(!viewport||!track)return;
   for(const copy of track.children)copy.style.minWidth=Math.max(0,viewport.clientWidth)+'px';
   const distance=track.firstElementChild?.scrollWidth||track.firstElementChild?.getBoundingClientRect?.().width||500;
   track.style.setProperty('--ticker-duration',Math.max(18,distance/42)+'s');
  }
 }
 function switchTickers(now=Date.now()){
  if(tickerSwitchTimer!==null){clearTimeout(tickerSwitchTimer);tickerSwitchTimer=null;}
  if(!tickerConfig)return;
  for(const side of ['left','right']){
   const active=['club','football'].filter(key=>tickerConfig.tickerEnabled&&tickerConfig.tickerStreams[key].enabled&&tickerConfig.tickerStreams[key].position===side);
   let current=active[0],wait=Infinity;
   if(active.length>1){
    const a=tickerConfig.tickerStreams[active[0]].seconds*1000,b=tickerConfig.tickerStreams[active[1]].seconds*1000;
    const elapsed=Math.max(0,now-tickerSwitchStart)%(a+b);
    current=elapsed<a?active[0]:active[1];wait=elapsed<a?a-elapsed:a+b-elapsed;
   }
   for(const key of active){const el=$(key==='club'?'dashboard-ticker':'dashboard-football-ticker');if(el)el.hidden=key!==current;}
   if(Number.isFinite(wait))tickerSwitchTimer=setTimeout(()=>switchTickers(),Math.max(25,wait));
  }
  tickerFit();
 }
 function arrangeTickers(settings){
  const config=JSON.stringify({enabled:settings.tickerEnabled,streams:settings.tickerStreams,fontSize:settings.tickerFontSize});
  if(config===tickerLayoutStamp)return;
  tickerLayoutStamp=config;tickerConfig=settings;tickerSwitchStart=Date.now();
  if(tickerSwitchTimer!==null){clearTimeout(tickerSwitchTimer);tickerSwitchTimer=null;}
  const region=$('dashboard-ticker-region'),left=$('dashboard-ticker-slot-left'),right=$('dashboard-ticker-slot-right'),main=document.querySelector('main.dashboard');
  if(!region||!left||!right)return;
  const active=['club','football'].filter(key=>settings.tickerEnabled&&settings.tickerStreams[key].enabled);
  region.hidden=!active.length;
  const leftKeys=active.filter(key=>settings.tickerStreams[key].position==='left'),rightKeys=active.filter(key=>settings.tickerStreams[key].position==='right');
  for(const key of ['club','football']){
   const el=$(key==='club'?'dashboard-ticker':'dashboard-football-ticker');if(!el)continue;
   el.style.setProperty('--ticker-font-size',settings.tickerFontSize+'px');
   (settings.tickerStreams[key].position==='right'?right:left).append(el);
   el.hidden=!active.includes(key);
  }
  left.hidden=!leftKeys.length;right.hidden=!rightKeys.length;
  const bothSides=leftKeys.length&&rightKeys.length;
  region.style.gridTemplateColumns=bothSides?settings.tickerStreams.leftPercent+'fr '+(100-settings.tickerStreams.leftPercent)+'fr':'minmax(0,1fr)';
  if(main)main.style.setProperty('--ticker-row-height',active.length?Math.max(44,settings.tickerFontSize+20)+'px':'34px');
  switchTickers();
 }
 function renderTickerTrack(trackId,entries,previousStamp){
  const stamp=JSON.stringify(entries.map(([id,text,color])=>[id,text,color])),track=$(trackId);
  if(!track)return stamp;
  if(stamp===previousStamp){
   const minutes=new Map(entries.map(([id,,,clock])=>[id,clock||'']));
   for(const clock of track.querySelectorAll('[data-football-clock]')){
    const text=minutes.get(clock.dataset.footballClock)||'';
    if(clock.textContent!==text){clock.textContent=text;clock.hidden=!text;}
   }
   return stamp;
  }
  track.replaceChildren();const first=document.createElement('div');first.className='dashboard-ticker-copy';
  for(const [id,text,color,clock] of entries){
   const span=document.createElement('span');span.id=id;span.className='dashboard-ticker-chip';span.textContent=text;span.hidden=!text;span.style.backgroundColor=color;
   const rgb=color.match(/[a-f0-9]{2}/gi)?.map(n=>parseInt(n,16))||[255,255,255];
   span.style.color=(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])<145?'#ffffff':'#102239';
   if(id.startsWith('football-')&&id!=='football-empty'){
    const minute=document.createElement('span');minute.className='football-clock';minute.dataset.footballClock=id;minute.textContent=clock||'';minute.hidden=!clock;span.append(minute);
   }
   first.append(span);
  }
  const second=first.cloneNode(true);second.setAttribute('aria-hidden','true');
  for(const el of second.querySelectorAll('[id]'))el.removeAttribute('id');
  track.append(first,second);
  tickerFit();
  return stamp;
 }
 function ticker(root,now=new Date()){
  lastTickerRoot=root;
  const settings=M.normalize(root?.dashboardSettings);
  arrangeTickers(settings);
  window.KCFootballLive?.configure(settings.football,settings.tickerColors);
  const data=M.upcoming(root,now),date=day=>new Date(day+'T12:00:00Z').toLocaleDateString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium'}),
   when=e=>date(e.date)+(e.endDate&&e.endDate>e.date?' – '+date(e.endDate):e.time?', '+e.time+' Uhr':'')+(e.note?' · '+e.note:'');
  const club=[['kc-next-birthdays',data.birthdays.length?'🎂 Geburtstage bis zum nächsten Kegeln: '+data.birthdays.map(e=>e.date.slice(8,10)+'.'+e.date.slice(5,7)+'. '+(e.note||e.personName||'')).join(' · '):'',settings.tickerColors.birthdays],
   ['kc-next-tour',data.tour?'🚌 Kegeltour: '+when(data.tour):'',settings.tickerColors.tour],
   ['kc-next-kegeln',data.kegeln?'🎳 Nächstes Kegeln: '+when(data.kegeln):'🎳 Noch kein nächster Kegeltermin',settings.tickerColors.kegeln]];
  for(const msg of settings.tickerMessages)if(msg.enabled&&msg.text)club.push(['dashboard-message-'+msg.id,msg.text,msg.color]);
  const football=(window.KCFootballLive?.ticker()||[]).map(([id,text,clock])=>[id,text,settings.tickerColors[id.includes('bl2')?'bl2':'bl1'],clock]);
  if(!football.length)football.push(['football-empty','⚽ Momentan keine laufenden Bundesliga-Ergebnisse',settings.tickerColors.bl1]);
  tickerStamp=renderTickerTrack('dashboard-ticker-track',club,tickerStamp);
  footballTickerStamp=renderTickerTrack('dashboard-football-ticker-track',football,footballTickerStamp);
 }
 let popupScope='',popupInitialized=false,popupTimer=null,popupExitTimer=null,popupSeconds=3;const seenThrows=new Set();
 function positionPopup(){const box=$('dashboard-throw-popup'),stage=document.querySelector('main.dashboard .stage');if(!box||!stage)return;const bounds=stage.getBoundingClientRect();box.style.left=(bounds.left+bounds.width/2)+'px';box.style.width=Math.max(200,Math.min(bounds.width-24,760))+'px';}
 function hidePopup(immediate=false){
  if(popupTimer!==null){clearTimeout(popupTimer);popupTimer=null;}
  if(popupExitTimer!==null){clearTimeout(popupExitTimer);popupExitTimer=null;}
  const box=$('dashboard-throw-popup');if(!box)return;
  if(immediate||box.hidden){box.hidden=true;box.classList.remove('toast-visible','toast-leaving');window.KCToastStack?.release(box);return;}
  box.classList.remove('toast-visible');box.classList.add('toast-leaving');
  popupExitTimer=setTimeout(()=>{box.hidden=true;box.classList.remove('toast-leaving');window.KCToastStack?.release(box);popupExitTimer=null;},420);
 }
 function feed(root,club,now=Date.now()){
  const scope=String(club||'')+'|'+String(root?.currentEveningStartedAt||''),seconds=M.normalize(root?.dashboardSettings).popupSeconds;
  if(scope!==popupScope){popupScope=scope;popupInitialized=false;seenThrows.clear();hidePopup(true);}
  if(seconds!==popupSeconds){popupSeconds=seconds;hidePopup(true);}
  if(!root)return;window.KCClubToasts?.feed(root,club,now);const start=Date.parse(root.currentEveningStartedAt||''),fresh=[];
  for(const event of Array.isArray(root.penaltyStatsLog)?root.penaltyStatsLog:[]){
   if(!event?.id||seenThrows.has(event.id))continue;seenThrows.add(event.id);const at=Date.parse(event.createdAt);
   if(event.eveningStartedAt?String(event.eveningStartedAt)!==String(root.currentEveningStartedAt||''):Number.isFinite(start)&&(!Number.isFinite(at)||at<start))continue;
   if(!popupInitialized||!Number.isFinite(at)||now-at>30000||now-at< -5000)continue;
   const type=String(event.type||'').toLowerCase(),kind=type==='gosse'?'gutter':type==='kranz'?'wreath':type==='durchgeworfen'?'through':type==='9er'?'nine':'';
   if(kind)fresh.push({kind,at,name:String(event.thrower||event.name||event.personName||'')});
  }
  popupInitialized=true;if(!popupSeconds||!fresh.length||document.hidden)return;
  const event=fresh.sort((a,b)=>a.at-b.at).at(-1);let box=$('dashboard-throw-popup');
  if(!box){box=document.createElement('div');box.id='dashboard-throw-popup';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.hidden=true;document.body.append(box);}
  hidePopup(true);box.className='dashboard-throw-popup is-'+event.kind;
  const titleText={gutter:'💀 Gosse!',wreath:'👑 Kranz!',nine:'🎯 Alle Neune!',through:'🎳 Durchgeworfen!'}[event.kind];if(window.KCClubToasts)window.KCClubToasts.decorate(box,root,titleText,event.name,event.name);else{const name=document.createElement('span'),title=document.createElement('strong');name.textContent=event.name;name.hidden=!event.name;title.textContent=titleText;box.replaceChildren(title,name);}positionPopup();
  const show=()=>{box.hidden=false;void box.offsetHeight;requestAnimationFrame(()=>box.classList.add('toast-visible'));popupTimer=setTimeout(hidePopup,popupSeconds*1000);};
  if(window.KCToastStack)window.KCToastStack.present(box,show);else show();
 }
 window.addEventListener('kc-football-updated',()=>{if(lastTickerRoot)ticker(lastTickerRoot);});
 window.addEventListener('kc-football-clock',()=>{if(lastTickerRoot)ticker(lastTickerRoot);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hidePopup();else rotate();});
 window.addEventListener('resize',()=>{positionPopup();resizeSeating();window.KCClubToasts?.positionStation?.();if(!resizeQueued){resizeQueued=true;requestAnimationFrame(tickerFit);}});
 window.KCDashboardLayoutTV=Object.freeze({apply,rotate,highlight,ticker,tickerFit,feed});
})();
