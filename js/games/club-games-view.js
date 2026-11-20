/* Shared scoreboards for the app and the TV. */
function clubGameEscape(value){
 return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function clubGameMoney(cents){return (cents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});}
function clubGameRack({standing=window.KCClubGames.pins,selected=[],prices,buttons=false,disabled=false}={}){
 const order=[9,8,7,4,5,6,2,3,1],tag=buttons?'button':'span';
 return '<div class="club-game-rack" aria-label="Kegelbild">'+order.map(n=>{
  const up=standing.includes(n),marked=selected.includes(n),label='Kegel '+n+(prices?' · '+clubGameMoney(prices[n-1]):'')+(up?'':' · gefallen');
  return '<'+tag+' data-rack-pin="'+n+'" class="club-game-pin'+(up?'':' is-down')+(marked?' is-selected':'')+'" aria-label="'+clubGameEscape(label)+'"'+
   (buttons?' type="button" aria-pressed="'+marked+'" data-club-pin="'+n+'" onclick="clubGameTogglePin('+n+',this)"'+(!up||disabled?' disabled':''):'')+
   '><strong>'+n+'</strong>'+(prices?'<small>'+clubGameMoney(prices[n-1])+'</small>':'')+'</'+tag+'>';
 }).join('')+'</div>';
}
function clubGameTable(s,headers,row){
 const games=window.KCClubGames,current=games.current(s);
 const unavailable=n=>s.gameKey==='abschreibung'&&!s.scores[n]||
  s.gameKey==='lottokoenig'&&s.config.lottoEarlyStop&&s.phase==='throw'&&games.lottoDone(s,n);
 const names=window.KCPlayerRows?.order(s.players,current,{running:s.active&&!!current,unavailable})||s.players;
 return '<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Kegler</th>'+headers.map(x=>'<th>'+x+'</th>').join('')+
  '</tr></thead><tbody'+(globalThis.window?.KCPlayerRows?.group?.(s.gameKey,s)||'')+'>'+names.map(n=>'<tr'+(globalThis.window?.KCPlayerRows?.row?.(n)||'')+(s.active&&current===n?' class="club-game-active-row"':'')+'><th>'+clubGameEscape(n)+'</th>'+row(n)+'</tr>').join('')+'</tbody></table></div>';
}
function clubGameImpact(roll,name,before,after,detail){
 const result=roll.kind==='gosse'?'Gosse':roll.kind==='kranz'?'Kranz ('+roll.pins+')':roll.pins+' Holz';
 return '<aside class="club-game-impact" aria-label="Letzter Wurf"><strong>Letzter Wurf · '+clubGameEscape(roll.name)+' · '+result+
  '</strong><span>'+name+': <b>'+before+' → '+after+' Punkte</b></span><small>'+detail+'</small></aside>';
}
function abschreibungEliminated(s,target,badge){
 return s.eliminated.length?'<div class="abschreibung-eliminated"><h3>Ausgeschieden</h3>'+
  s.eliminated.map(({name,place})=>'<span'+(name===target?' class="is-deducted"':'')+'><b>'+clubGameEscape(name)+'</b> · Platz '+place+' · '+
   clubGameMoney(s.bookings.find(b=>b.personName===name)?.amountCents||0)+(name===target?badge:'')+'</span>').join('')+'</div>':'';
}
function abschreibungDisplayOrder(active,current,last){
 const first=last&&last.name!==current?last.name:active.at(-1);
 return [...new Set([first,current,...active].filter(Boolean))];
}
function abschreibungRule(config){
 const numbers=window.KCClubGames.selfPins(config);
 const own=numbers.length?'Gegen dich zählen: '+numbers.join(', ')+'. ':'';
 return own+(config.woodRequired?'Bei einer Gosse wiederholst du den Wurf.':'Eine Gosse kostet dich 9 Punkte.');
}
function abschreibungBoard(s,active,last,impact){
 const escape=clubGameEscape;
 const current=window.KCClubGames.current(s),target=active.at(-1);
 const rows=abschreibungDisplayOrder(active,current,last).map(name=>{
  const role=name===current?'thrower':name===target?'target':'';
  const label=role==='thrower'?'Am Wurf':role==='target'?'Punktabzug bei normalem Wurf':'';
  const points=s.scores[name],percent=Math.round(100*points/s.config.startPoints);
  return '<li'+(globalThis.window?.KCPlayerRows?.row?.(name)||'')+' class="abschreibung-row'+(role?' is-'+role:'')+'"><span class="abschreibung-name"><strong>'+escape(name)+'</strong>'+
   (label?'<small>'+label+'</small>':'')+'</span><span class="abschreibung-meter" aria-hidden="true"><span style="width:'+percent+'%"></span></span>'+
   '<span class="abschreibung-points"><b>'+points+'</b> Pkt.</span></li>';
 }).join('');
 const rule=abschreibungRule(s.config);
 return '<div class="abschreibung-layout"><div><ol class="abschreibung-order" aria-label="Punktestand"'+(globalThis.window?.KCPlayerRows?.group?.('abschreibung',s,{simpleMotion:true})||'')+'>'+rows+'</ol>'+abschreibungEliminated(s)+
  '</div><aside class="abschreibung-details">'+(impact||'')+'<p>'+rule+'</p></aside></div>';
}
// Keep the booked results separate from the turn order held on the TV.
const ABSCHREIBUNG_POINTS_MS=1650,ABSCHREIBUNG_SHRINK_MS=700,ABSCHREIBUNG_RANK_MS=720;
function abschreibungRanking(s){
 return s.players.map((name,index)=>({name,index,points:s.scores[name]}))
  .sort((a,b)=>b.points-a.points||a.index-b.index);
}
function abschreibungRankChanges(before,after){
 const previous=new Map(abschreibungRanking(before).map(({name},index)=>[name,index]));
 if(previous.size!==after.players.length||after.players.some(name=>!previous.has(name)))return new Map();
 return new Map(abschreibungRanking(after).flatMap(({name},index)=>{
  const shift=previous.get(name)-index;
  return shift?[[name,shift]]:[];
 }));
}
function createAbschreibungTvPlayback(schedule=setTimeout,cancel=clearTimeout){
 let previous=null,frame=null,timer=null;
 return function update(state,repaint,reducedMotion=false,pauseMs=2500){
  const old=previous;
  previous=state;
  if(!state||state.id!==old?.id||state.revision<old.revision||reducedMotion){
   cancel(timer);timer=null;frame=null;return null;
  }
  if(state.revision!==old.revision){
   cancel(timer);timer=null;frame=null;
   const shot=state.history.at(-1),ranks=abschreibungRankChanges(old,state);
   const finish=()=>{frame=null;timer=null;repaint();};
   if(old.active&&state.history.length===old.history.length+1&&shot?.action==='throw'&&
      (old.history.at(-1)?.id??null)===(state.history.at(-2)?.id??null)){
    const deducted=old.scores[shot.target]>state.scores[shot.target];
    const pointsMs=deducted?ABSCHREIBUNG_POINTS_MS:0;
    const turnChanged=state.finished||window.KCClubGames.current(old)!==window.KCClubGames.current(state);
    const holdMs=turnChanged?pauseMs+(deducted?ABSCHREIBUNG_SHRINK_MS:0):0;
    frame={before:old,shot,ranks,startedAt:Date.now(),holding:holdMs>0,points:pointsMs>0};
    const first=Math.min(holdMs||Infinity,pointsMs||Infinity);
    const last=Math.max(holdMs,pointsMs);
    if(!last)frame=null;
    else if(first===last)timer=schedule(finish,first);
    else timer=schedule(()=>{
     frame={...frame,holding:holdMs>first,points:pointsMs>first};
     timer=schedule(finish,last-first);
     repaint();
    },first);
   }else if(state.active&&ranks.size){
    frame={before:old,ranks,startedAt:Date.now(),holding:false,points:false};
    timer=schedule(finish,ABSCHREIBUNG_RANK_MS);
   }
  }
  return frame;
 };
}
function abschreibungTvScore(name,shown,s,shot){
 const current=s.scores[name],before=shown.scores[name],percentage=points=>Math.round(100*points/s.config.startPoints);
 const changed=shot?.target===name&&before>current;
 const value='<b'+(globalThis.window?.KCPlayerRows?.score?.(name,'stand')||'')+'>'+current+'</b>';
 const meter='<span class="abschreibung-meter" aria-hidden="true"><span'+(changed?' class="abschreibung-meter-drop"':'')+
  ' style="width:'+percentage(current)+'%;--abschreibung-before:'+percentage(before)+'%"></span></span>';
 return {value,meter,changed};
}
const ABSCHREIBUNG_COLOR_MS=460;
const abschreibungColorFades=new WeakMap();
const abschreibungColorParts=[
 ['.abschreibung-chart-value',['color']],
 ['.abschreibung-chart-track',['background-color','border-bottom-color','box-shadow']],
 ['.abschreibung-chart-fill',['background-color']],
 ['.abschreibung-chart-name',['background-color']]
];
function fadeAbschreibungColumns(previous,next,now=Date.now()){
 if(!previous||!next)return;
 for(const column of next.querySelectorAll('[data-abschreibung-column]')){
  const old=previous.get(column.dataset.abschreibungColumn);
  if(!old)continue;
  const changed=old.role!==column.dataset.abschreibungRole;
  const fade=changed?{started:now,colors:old.colors}:old.fade;
  if(!fade||now-fade.started>=ABSCHREIBUNG_COLOR_MS)continue;
  abschreibungColorFades.set(column,fade);
  column.classList.add('abschreibung-chart-fade');
  column.style.setProperty('--abschreibung-color-duration',ABSCHREIBUNG_COLOR_MS+'ms');
  column.style.setProperty('--abschreibung-color-delay',Math.min(0,fade.started-now)+'ms');
  abschreibungColorParts.forEach(([selector,properties],index)=>{
   const part=column.querySelector(selector);
   properties.forEach((property,i)=>part.style.setProperty('--abschreibung-from-'+property,fade.colors[index][i]));
  });
 }
}
function captureAbschreibungColumns(board){
 if(typeof window.getComputedStyle!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return null;
 return new Map([...board.querySelectorAll('[data-abschreibung-column]')].map(column=>[
  column.dataset.abschreibungColumn,{
   role:column.dataset.abschreibungRole,fade:abschreibungColorFades.get(column),
   colors:abschreibungColorParts.map(([selector,properties])=>{
    const style=window.getComputedStyle(column.querySelector(selector));
    return properties.map(property=>style.getPropertyValue(property));
   })
  }
 ]));
}
function abschreibungTvBoard(s,frame,impact){
 const shown=frame?.holding?frame.before:s,shot=frame?.points?frame.shot:null;
 const scoredBefore=frame?.before||s;
 const last=shown.history.findLast(e=>e.action==='throw');
 const current=window.KCClubGames.current(shown);
 const active=window.KCClubGames.abschreibungOrder(shown);
 const order=abschreibungDisplayOrder(active,current,last);
 const escape=clubGameEscape;
 const target=shot?.target;
 const deduction=target?scoredBefore.scores[target]-s.scores[target]:0;
 const badge=deduction>0?'<b aria-hidden="true" class="abschreibung-flying-points">−'+deduction+'</b>':'';
 const rows=order.map(name=>{
  const score=abschreibungTvScore(name,scoredBefore,s,shot);
  return '<li'+(globalThis.window?.KCPlayerRows?.row?.(name)||'')+' class="abschreibung-row'+(name===current?' is-thrower':'')+(score.changed?' is-deducted':'')+'"><span class="abschreibung-name"><strong>'+
   escape(name)+'</strong>'+(name===current?'<small>Am Wurf</small>':'')+'</span>'+score.meter+
   '<span class="abschreibung-points">'+score.value+' Pkt.'+(score.changed?badge:'')+'</span></li>';
 }).join('');
 const thrower=shown.active&&!shown.finished?current:'';
 const throwTarget=thrower?active.at(-1):'';
 const ranked=abschreibungRanking(s);
 const rankDelay=frame?.shot&&scoredBefore.scores[frame.shot.target]>s.scores[frame.shot.target]?ABSCHREIBUNG_SHRINK_MS:0;
 const percent=points=>100*points/s.config.startPoints+'%';
 const columns=ranked.map(({name,points})=>{
  const isCurrent=name===thrower,isTarget=name===throwTarget&&!isCurrent,shrinking=name===target&&deduction>0;
  const shift=frame?.ranks?.get(name)||0;
  const role=isCurrent?'is-current':isTarget?'is-target':'';
  const label=isCurrent?' · Am Wurf':isTarget?' · Wurfziel':'';
  const from=shrinking?';--abschreibung-before:'+percent(scoredBefore.scores[name]):'';
  const value='<b'+(globalThis.window?.KCPlayerRows?.score?.(name,'column')||'')+'>'+points+'</b>';
  return '<li data-abschreibung-column="'+escape(name)+'" data-abschreibung-role="'+role+'" class="'+role+(shift?' abschreibung-chart-move':'')+'"'+
   (isCurrent?' aria-current="true"':'')+ (shift?' style="--abschreibung-shift:'+(shift*100)+'%"':'')+'>'+
   '<span class="abschreibung-chart-value">'+value+'</span>'+
   '<span class="abschreibung-chart-track"><span class="abschreibung-chart-fill'+(shrinking?' abschreibung-chart-drop':'')+
    '" aria-hidden="true" style="height:'+percent(points)+from+'"></span>'+
   '<span class="abschreibung-chart-name" title="'+escape(name+label)+'">'+escape(name)+'</span></span></li>';
 }).join('');
 const rule=abschreibungRule(s.config);
 return '<div class="abschreibung-layout abschreibung-tv-layout" style="--abschreibung-elapsed:'+Math.max(0,Date.now()-(frame?.startedAt??Date.now()))+'ms;--abschreibung-points-duration:'+ABSCHREIBUNG_POINTS_MS+'ms;--abschreibung-shrink-duration:'+ABSCHREIBUNG_SHRINK_MS+
  'ms;--abschreibung-rank-duration:'+ABSCHREIBUNG_RANK_MS+'ms;--abschreibung-rank-delay:'+rankDelay+'ms"><div class="abschreibung-tv-stand"><ol class="abschreibung-order" aria-label="Punktestand"'+(globalThis.window?.KCPlayerRows?.group?.('abschreibung',shown,{motionOnly:true})||'')+'>'+rows+'</ol>'+abschreibungEliminated(shown,order.includes(target)?undefined:target,badge)+
  '</div><aside class="abschreibung-details"><div class="abschreibung-tv-last">'+(impact||'<p>Noch kein Wurf</p>')+'</div><p>'+rule+'</p>'+
  '<section class="abschreibung-chart" aria-label="Restpunkte je Kegler"><h3>Restpunkte</h3>'+
  '<ul style="--abschreibung-columns:'+s.players.length+'">'+columns+'</ul></section></aside></div>';
}
function clubLottoBalls(ticket,score,next=null){
 if(!ticket)return '—';
 return ticket.numbers.map(number=>{
  const hit=ticket.hits.includes(number),missed=!hit&&number<score;
  const status=hit?'is-hit':missed?'is-missed':number===next?'is-next':'';
  const label=hit?' getroffen':missed?' übersprungen':number===next?' · nächste Glückszahl':'';
  return '<span data-lotto-target="'+number+'" class="'+status+'" aria-label="'+number+label+'">'+number+'</span>';
 }).join('');
}
function clubLottoTurn(s,current,phase){
 const ticket=s.tickets[current],score=s.scores[current];
 const next=ticket.numbers.find(number=>number>score);
 const goal=next===undefined?(s.config.lottoEarlyStop&&score<49?'<span>Noch <b>'+(49-score)+'</b> Holz bis 49</span>':
  '<span>Keine Glückszahl mehr offen</span>'):'<span>Noch <b>'+(next-score)+'</b> Holz bis zur <b>'+next+'</b></span>';
 return '<section class="club-lotto-turn" data-lotto-player="'+clubGameEscape(current)+'" aria-label="Glückszahlen des aktiven Werfers"><header><strong>🎳 '+clubGameEscape(current)+
  '</strong><small>'+phase+'</small></header><div class="club-lotto-turn-body"><div class="club-lotto-balls">'+clubLottoBalls(ticket,score,next)+'</div>'+
  '<div class="club-lotto-turn-stats"><span><b'+(globalThis.window?.KCPlayerRows?.score?.(current,'lotto-turn')||'')+'>'+score+
  '</b> Holz gesamt</span>'+goal+
  '</div></div></section>';
}
function renderClubGameBoard(s,{controls='',dashboard=false,abschreibungFrame=null}={}){
 const g=window.KCClubGames,key=s.gameKey,current=g.current(s),escape=clubGameEscape,money=clubGameMoney;
 const last=s.history.findLast(e=>e.action==='throw');
 let phase='',body='',visual='',impact='',turnDetail='',showTurn=true;
 if(key==='abschreibung'){
  phase='Runde '+s.round;
  if(last){
   const previous=last.beforePoints??Math.max(0,s.config.startPoints-s.history.slice(0,s.history.lastIndexOf(last))
    .filter(e=>e.action==='throw'&&e.target===last.target).reduce((sum,e)=>sum+e.amount,0));
   const points=s.scores[last.target],change=points-previous;
   const detail=last.kind==='gosse'&&!last.amount?'Gosse · Wurf wiederholen':change+' Punkte';
   impact=clubGameImpact(last,escape(last.target),previous,points,detail);
  }
  if(dashboard&&(s.active||abschreibungFrame)){
   phase='Runde '+(abschreibungFrame?.holding?abschreibungFrame.before.round:s.round);
   body=abschreibungTvBoard(s,abschreibungFrame,impact);
   impact='';
  }else if(s.active){
   const order=g.abschreibungOrder(s);
   turnDetail='<span class="abschreibung-target-label">Wurfziel · '+escape(order.at(-1))+'</span>';
   body=abschreibungBoard(s,order,last,impact);
   impact='';
  }else body=clubGameTable(s,['Punkte','Platz','Strafe'],n=>{
   const place=s.eliminated.find(e=>e.name===n)?.place;
   return '<td><strong>'+s.scores[n]+'</strong></td><td>'+(place??'—')+'</td><td>'+money(s.bookings.find(e=>e.personName===n)?.amountCents||0)+'</td>';
  });
 }else if(key==='lottokoenig'){
  phase=s.phase==='numbers'?'Glückszahlen eingeben':'Wurf '+((s.rows[current]?.length||0)+1)+' / 13';
  if(s.active&&s.phase==='throw'&&s.tickets[current]){
   visual=clubLottoTurn(s,current,phase);
   showTurn=false;
  }
  if(last){
   const points=s.scores[last.name],row=s.rows[last.name].at(-1);
   impact=clubGameImpact(last,escape(last.name),points-last.pins,points,row.hit?'Glückszahl '+points+' getroffen':'Keine neue Glückszahl');
  }
  body=clubGameTable(s,['Glückszahlen','Treffer','Holz','Würfe'],n=>{
   const ticket=s.tickets[n],score=s.scores[n];
   return '<td><div class="club-lotto-balls" data-lotto-player="'+escape(n)+'">'+clubLottoBalls(ticket,score)+
    '</div></td><td>'+(ticket?.hits.length||0)+' / 6</td><td><span'+(globalThis.window?.KCPlayerRows?.score?.(n)||'')+'>'+score+'</span>'+(g.lottoQualified(s,n)?' <span title="Ziel erreicht">✓</span>':'')+'</td><td>'+s.rows[n].length+' / 13'+
    (s.config.lottoEarlyStop&&g.lottoDone(s,n)?' <small class="club-lotto-done">Fertig</small>':'')+'</td>';
  });
 }else if(key==='tageskurs'){
  const rounds=s.config.rounds??1;
  phase='Runde '+s.round+' / '+rounds;
  const standing=g.pins.filter(n=>!last?.knocked.includes(n));
  visual='<aside class="club-game-visual"><strong>'+(last?'Letzter Wurf · '+escape(last.name):'Tageskurs je Kegel')+'</strong>'+
   clubGameRack({standing,prices:s.config.pinCents})+(last?'<b>'+money(s.rows[last.name].at(-1).cents)+' für diesen Wurf</b>':'')+'</aside>';
  body=clubGameTable(s,[...(rounds>1?['Würfe']:[]),'Gefallene Kegel','Strafe gesamt'],n=>{
   const row=s.rows[n].at(-1);
   return (rounds>1?'<td>'+s.rows[n].length+' / '+rounds+'</td>':'')+
    (row?'<td>'+row.knocked.length+' / 9</td><td'+(globalThis.window?.KCPlayerRows?.score?.(n)||'')+'>'+money(s.scores[n])+'</td>':'<td>—</td><td>—</td>');
  });
  body='<div class="club-game-score-layout">'+visual+body+'</div>';visual='';
 }else{
  phase=s.phase==='pairs'?'Runde '+s.round+' · Neue Paare bilden':'Runde '+s.round+' / '+s.config.rounds+' · Wurf '+(s.pairThrows+1)+' / '+s.config.throws;
  const shown=s.active?s.pairs:s.pairRounds.at(-1)?.teams||s.pairs;
  visual=!dashboard&&typeof swingerAppTeams==='function'?swingerAppTeams(s):'<div class="extra-team-grid">'+shown.map((pair,i)=>'<article class="extra-team-card'+(s.active&&s.phase!=='pairs'&&s.index===i?' extra-current':'')+
   '"><small>Team '+(i+1)+(pair.names.length===1?' · Einzelteam':'')+'</small><strong'+(globalThis.window?.KCPlayerRows?.score?.(pair.names.join(' / '),'team')||'')+'>'+pair.points+' Holz</strong><span>'+pair.names.map(escape).join(' + ')+'</span></article>').join('')+'</div>';
  if(s.active&&s.phase==='pairs'&&!controls)visual+='<p class="club-game-highlight">Neue Partner für '+s.splitPairs.map(t=>t.names.map(escape).join(' + ')).join(' sowie ')+'</p>';
  body=clubGameTable(s,[...s.pairRounds.map(r=>'R'+r.round),'Gesamt'],n=>
   s.pairRounds.map(r=>'<td>'+r.teams.find(t=>t.names.includes(n)).points+'</td>').join('')+'<td><strong'+(globalThis.window?.KCPlayerRows?.score?.(n)||'')+'>'+s.scores[n]+'</strong></td>');
 }
 const animatedTv=dashboard&&key==='abschreibung'&&(s.active||abschreibungFrame);
 return '<section class="ind-board extra-board club-game-board" data-extra-game="'+key+'">'+(animatedTv?'<div class="abschreibung-tv-round">'+phase+'</div>':s.active?
  !showTurn||key==='swingerclub'&&controls?'':'<div class="ind-turn extra-turn">'+(current?'🎳 '+escape(current)+' · ':'')+phase+turnDetail+'</div>':
  '<p class="club-game-highlight">Spiel beendet'+(key==='swingerclub'&&s.winners.length?' · 🏆 '+s.winners.map(escape).join(' · '):'')+'</p>')+
  controls+visual+body+impact+'<p class="ind-help">'+escape(g.summary(key,s.config))+'</p></section>';
}
