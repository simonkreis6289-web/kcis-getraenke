/* Gemeinsames Modell für Dashboard-Anordnung, Werfer und Termin-Ticker. */
(() => {
 const keys=['drinks','fines','gutters','seating'],slots=['left-top','left-bottom','right-top','right-bottom'];
 const labels={drinks:'Getränkestand',fines:'Strafenstand',gutters:'Gossenkönig',seating:'Sitzordnung'};
 const defaults=()=>({panels:Object.fromEntries(keys.map((key,i)=>[key,{enabled:true,position:slots[i]}]))});
 function normalize(value){const out=defaults();for(const key of keys){const p=value?.panels?.[key];if(typeof p?.enabled==='boolean')out.panels[key].enabled=p.enabled;if(slots.includes(p?.position))out.panels[key].position=p.position;}return out;}
 function resolve(value){
  const settings=normalize(value),active=keys.filter(key=>settings.panels[key].enabled),left=[],right=[];
  if(active.length===2){active.sort((a,b)=>slots.indexOf(settings.panels[a].position)-slots.indexOf(settings.panels[b].position));active.forEach((key,i)=>settings.panels[key].position=slots[i]);}
  else if(active.length===1)settings.panels[active[0]].position=settings.panels[active[0]].position.startsWith('right')?'right-top':'left-top';
  else{const used=new Set();for(const key of active){const panel=settings.panels[key];if(used.has(panel.position))panel.position=slots.find(slot=>!used.has(slot));used.add(panel.position);}}
  active.sort((a,b)=>slots.indexOf(settings.panels[a].position)-slots.indexOf(settings.panels[b].position));
  for(const key of active)(settings.panels[key].position.startsWith('left')?left:right).push(key);
  return {settings,left,right,count:active.length};
 }
 function move(value,key,position){const r=resolve(value),s=r.settings;if(!keys.includes(key)||!s.panels[key].enabled||!slots.includes(position))return s;const previous=s.panels[key].position,other=keys.find(k=>k!==key&&s.panels[k].enabled&&s.panels[k].position===position);if(other)s.panels[other].position=previous;s.panels[key].position=position;return resolve(s).settings;}
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
 window.KCDashboardLayout=Object.freeze({keys,slots,labels,defaults,normalize,resolve,move,turn,upcoming});
})();
