/* Gemeinsames Modell für Dashboard-Anordnung, Werfer und Termin-Ticker. */
(() => {
 const keys=['drinks','fines','gutters','seating'],slots=['left-top','left-bottom','right-top','right-bottom'];
 const labels={drinks:'Getränkestand',fines:'Strafenstand',gutters:'Gossenkönig',seating:'Sitzordnung'};
 const tickerPalette=['#dbeafe','#fef3c7','#dcfce7','#fce7f3','#ede9fe','#cffafe','#ffedd5','#e2e8f0'];
 const tickerColor=(value,fallback)=>/^#[0-9a-fA-F]{6}$/.test(String(value||''))?String(value).toLowerCase():fallback;
 const tickerTypes={birthdays:'Geburtstage',tour:'Kegeltour',kegeln:'Kegeltermin',bl1:'1. Bundesliga',bl2:'2. Bundesliga'};
 const tickerDefaults=()=>({birthdays:'#fce7f3',tour:'#fef3c7',kegeln:'#dcfce7',bl1:'#dbeafe',bl2:'#ede9fe'});
 const eventToastColors=()=>({arrival:'#40cf88',departure:'#7ba3ed',round:'#f9ba3e',loser:'#df83e7',teamLoss:'#fc977d',station:'#76d5c2'});
 const seconds=(value,fallback,min,max)=>{const n=Number(value);return value!==''&&value!=null&&Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;};
 const defaults=()=>({tableWidth:{left:17,right:17},panels:Object.fromEntries(keys.map((key,i)=>[key,{enabled:true,position:slots[i],seconds:5}])),tickerMessages:[],tickerColors:tickerDefaults(),tickerEnabled:true,tickerFontSize:18,tickerStreams:{club:{enabled:true,position:'left',seconds:8},football:{enabled:true,position:'right',seconds:8},leftPercent:50},popupSeconds:3,eventToasts:{arrival:true,departure:true,round:true,loser:true,teamLoss:true,station:true,seconds:4,colors:eventToastColors()},transitionSeconds:0.6,football:{bl1:false,bl2:false,goalToastSeconds:5,events:{goal:true,kickoff:true,halftime:true,fulltime:true,red:false,secondYellow:false},demo:null}});
 function normalize(value){
  const out=defaults();for(const key of keys){const p=value?.panels?.[key];if(typeof p?.enabled==='boolean')out.panels[key].enabled=p.enabled;if(slots.includes(p?.position))out.panels[key].position=p.position;out.panels[key].seconds=seconds(p?.seconds,5,1,300);}
  for(const side of ['left','right'])out.tableWidth[side]=seconds(value?.tableWidth?.[side],17,10,35);
  out.tickerEnabled=value?.tickerEnabled!==false;
  const streamSettings=value?.tickerStreams;
  for(const key of ['club','football']){
   const stream=streamSettings?.[key];
   out.tickerStreams[key].enabled=typeof stream?.enabled==='boolean'?stream.enabled:(key==='club'?out.tickerEnabled:true);
   out.tickerStreams[key].position=['left','right'].includes(stream?.position)?stream.position:(key==='club'?'left':'right');
   out.tickerStreams[key].seconds=seconds(stream?.seconds,8,2,120);
  }
  out.tickerStreams.leftPercent=seconds(streamSettings?.leftPercent,50,25,75);
  for(const type of Object.keys(tickerTypes))out.tickerColors[type]=tickerColor(value?.tickerColors?.[type],out.tickerColors[type]);
  out.tickerFontSize=seconds(value?.tickerFontSize,18,12,30);
  out.popupSeconds=seconds(value?.popupSeconds,3,0,30);
  out.eventToasts={seconds:seconds(value?.eventToasts?.seconds,4,0,30),colors:eventToastColors()};
  for(const key of Object.keys(out.eventToasts.colors))out.eventToasts.colors[key]=tickerColor(value?.eventToasts?.colors?.[key],out.eventToasts.colors[key]);
  for(const key of ['arrival','departure','round','loser','teamLoss','station'])out.eventToasts[key]=value?.eventToasts?.[key]!==false;
  out.football={bl1:value?.football?.bl1===true,bl2:value?.football?.bl2===true,goalToastSeconds:seconds(value?.football?.goalToastSeconds,5,0,30),events:{goal:value?.football?.events?.goal!==false,kickoff:value?.football?.events?.kickoff!==false,halftime:value?.football?.events?.halftime!==false,fulltime:value?.football?.events?.fulltime!==false,red:false,secondYellow:false},demo:null};
  const demo=value?.football?.demo;
  if(demo?.active===true&&/^[a-zA-Z0-9_-]{1,80}$/.test(String(demo.id||''))&&['bl1','bl2'].includes(demo.league))out.football.demo={active:true,id:demo.id,league:demo.league,home:Math.max(0,Math.min(30,Math.trunc(Number(demo.home)||0))),away:Math.max(0,Math.min(30,Math.trunc(Number(demo.away)||0)))};
  const transition=Number(value?.transitionSeconds);out.transitionSeconds=value?.transitionSeconds!=null&&value.transitionSeconds!==''&&Number.isFinite(transition)?Math.max(0,Math.min(3,Math.round(transition*10)/10)):0.6;
  const ids=new Set();out.tickerMessages=(Array.isArray(value?.tickerMessages)?value.tickerMessages:[]).slice(0,20).map((message,i)=>{let id=String(message?.id||'message-'+i).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'message-'+i;while(ids.has(id))id+='-'+i;ids.add(id);return {id,text:String(message?.text||'').replace(/\s+/g,' ').trim().slice(0,500),enabled:message?.enabled!==false,color:tickerColor(message?.color,tickerPalette[i%tickerPalette.length])};});return out;
 }
 function resolve(value){
  const settings=normalize(value),active=keys.filter(key=>settings.panels[key].enabled),left=[],right=[],groups=Object.fromEntries(slots.map(slot=>[slot,[]]));
  if(active.length===2)for(const key of active)settings.panels[key].position=settings.panels[key].position.replace(/^right-/,'left-');
  if(active.length===1)settings.panels[active[0]].position=settings.panels[active[0]].position.startsWith('right')?'right-top':'left-top';
  active.sort((a,b)=>slots.indexOf(settings.panels[a].position)-slots.indexOf(settings.panels[b].position));
  for(const key of active){groups[settings.panels[key].position].push(key);(settings.panels[key].position.startsWith('left')?left:right).push(key);}
  return {settings,left,right,groups,count:active.length};
 }
 function move(value,key,position){const s=normalize(value);if(keys.includes(key)&&s.panels[key].enabled&&slots.includes(position))s.panels[key].position=position;return resolve(s).settings;}
 function cycle(items,settings,elapsed=0){
  if(!items.length)return {key:null,remaining:0};const durations=items.map(key=>settings.panels[key].seconds*1000),total=durations.reduce((a,b)=>a+b,0);let at=Math.max(0,Number(elapsed)||0)%total;
  for(let i=0;i<items.length;i++){if(at<durations[i])return {key:items[i],remaining:durations[i]-at};at-=durations[i];}return {key:items[0],remaining:durations[0]};
 }
 function turn(root,key,s=root?.[key+'State']){
  const empty={name:'',team:'',members:[]};if(!s?.active||s.finished||s.readyToFinish||s.coinPending||s.eveningStartedAt&&root?.currentEveningStartedAt&&s.eveningStartedAt!==root.currentEveningStartedAt)return empty;
  const person=name=>({...empty,name:name||''}),team=id=>!['T1','T2'].includes(id)?empty:({...empty,team:id||'',members:s.participantTeams?.[id]||s.teams?.[id]||(root?.persons||[]).filter(p=>p.tisch===id).map(p=>p.name)});
  if(['tannenbaum','darts'].includes(key))return team(s.currentTeam);
  if(key==='tor')return team(s.current);
  if(key==='sichern'){const who=s.order?.[s.currentIndex];if(s.mode!=='team')return person(who);const players=s.teams?.[who]||[];return person(players[(Number(s.teamTurns?.[who])||0)%Math.max(1,players.length)]);}
  if(key==='sechstage')return person(window.KCSixDays?.thrower(s));
  if(['blackjack','gluecksspirale'].includes(key))return person(window.KCTableGames?.currentName(s));
  if(window.KCExtraGames?.keys.includes(key))return person(window.KCExtraGames.current(s));
  if(key==='fuchsjagd')return person(['start','fox','finalFox'].includes(s.phase)?s.fox:s.hunters?.[s.hunterIndex]);
  if(key==='lotterie'){const names=s.playerOrder||[];for(let col=0;col<(s.columns||[]).length;col++)for(const name of names)if(s.throws?.[name]?.[col]==null)return person(name);return empty;}
  if(key==='tiberius'){const names=s.playerOrder||[];return person(names.length?names[(s.throws||[]).length%names.length]:'');}
  const names=s.playerOrder||s.players||[];return person(names[s.currentPlayerIndex??s.currentIndex??s.index??0]);
 }
 function upcoming(root,now=new Date()){
  const B=window.KCBirthdays;if(!B)return {birthdays:[],tour:null,kegeln:null};const today=B.today(now),calendar=root?.clubCalendarData?.clubTermine||root?.clubTermine||[],all=Array.isArray(calendar)?calendar:[];
  const kegeln=all.filter(e=>e.type==='kegeln'&&B.parse(e.date)&&(e.date>today||e.date===today&&(!e.time||new Date(e.date+'T'+e.time).getTime()>=now.getTime()))).sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0]||null;
  const tour=all.filter(e=>e.type==='tour'&&B.parse(e.date)&&(B.parse(e.endDate)&&e.endDate>=e.date?e.endDate:e.date)>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
  return {kegeln,tour,birthdays:B.events(root?.persons||[],all,today,kegeln?.date||today)};
 }
 window.KCDashboardLayout=Object.freeze({keys,slots,labels,tickerTypes,tickerPalette,tickerColor,defaults,normalize,resolve,move,cycle,turn,upcoming});
})();
