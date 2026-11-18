function indEscape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function indEuro(cents){return (Number(cents||0)/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function indBookedCents(s,name){return (s.bookings||[]).filter(entry=>entry.personName===name).reduce((sum,entry)=>sum+entry.amountCents,0);}
function renderHurdleTrack(s,current){
 const rules=s.config.rules.filter(rule=>rule.enabled).sort((a,b)=>a.from-b.from);
 const stops=[{label:'Start',points:'0'},...rules.map((rule,i)=>({label:'Hürde '+(i+1),points:rule.from===rule.to?String(rule.from):rule.from+'–'+rule.to})),{label:'Ziel',points:String(s.config.target)}];
 const runners=stops.map(()=>[]);
 for(const player of s.players){
  const score=Number(s.scores[player])||0;
  const index=score>=s.config.target?stops.length-1:rules.findLastIndex(rule=>score>=rule.from)+1;
  runners[index].push('<span class="hurdle-runner'+(s.active&&player===current?' hurdle-current':'')+'"><strong>'+indEscape(player)+'</strong> '+score+'</span>');
 }
 const markers=stops.map((stop,i)=>'<li><div class="hurdle-station'+(runners[i].length?' hurdle-occupied':'')+'"><strong>'+stop.label+'</strong><small>'+stop.points+' Pkt.</small></div></li>').join('');
 const groups=stops.map((stop,i)=>runners[i].length?'<div class="hurdle-runners"><span class="hurdle-runner-station">'+stop.label+'</span>'+runners[i].join('')+'</div>':'').join('');
 return '<section class="hurdle-track" aria-label="Position aller Kegler auf der Hindernisstrecke"><ol>'+markers+'</ol><div class="hurdle-runner-groups">'+groups+'</div></section>';
}
const HURDLE_PLAYER_COLORS=[
 '#0072b2','#d14d00','#008463','#993a9b','#e8a000','#c42042','#31a7d3','#563a92',
 '#729000','#a15a19','#df6fa1','#006c74','#566376','#afa300','#825d7d','#423528'
];
function hurdlePlayerDot(color,label='',current=false){
 return '<span class="hurdle-player-dot'+(current?' hurdle-dot-current':'')+'" style="--player-color:'+color+'"'+(label?' role="img" aria-label="'+indEscape(label)+'" title="'+indEscape(label)+'"':' aria-hidden="true"')+'></span>';
}
function renderHurdleCircuit(s,colors,current){
 const target=s.config.target;
 const rules=s.config.rules.filter(rule=>rule.enabled&&rule.from>0&&rule.from<target).sort((a,b)=>a.from-b.from);
 const stops=[{score:0,label:'Start',points:'0'},...rules.map((rule,i)=>({
  score:rule.from,label:'Hürde '+(i+1),points:rule.from===rule.to?String(rule.from):rule.from+'–'+rule.to
 })),{score:target,label:'Ziel',points:String(target)}];
 const marks=new Map(stops.map((stop,index)=>[stop.score,{...stop,progress:index/(stops.length-1),dots:[]}]));
 const thrown=new Set((s.history||[]).filter(entry=>entry.action==='throw').map(entry=>entry.name));
 for(const player of s.players){
  if(!thrown.has(player))continue;
  const score=Number(s.scores[player])||0;
  const position=Math.max(0,Math.min(target,score));
  if(!marks.has(position)){
   const upper=stops.findIndex(stop=>stop.score>position);
   const low=stops[upper-1].score,high=stops[upper].score;
   const progress=(upper-1+(position-low)/(high-low))/(stops.length-1);
   marks.set(position,{score:position,progress,dots:[]});
  }
  marks.get(position).dots.push(hurdlePlayerDot(colors.get(player),player+' · '+score+' Pkt.',player===current));
 }
 const markers=[...marks.values()].sort((a,b)=>a.progress-b.progress).map(mark=>{
  const label=mark.label?'<span class="hurdle-circuit-stop"><strong>'+mark.label+'</strong><small>'+mark.points+' Pkt.</small></span>':'';
  const players=mark.dots.length?'<span class="hurdle-circuit-pointer" aria-hidden="true"></span><div class="hurdle-circuit-players">'+
   (mark.label?'':'<strong>'+mark.score+'</strong>')+'<span class="hurdle-circuit-dots">'+mark.dots.join('')+'</span></div>':'';
  return '<div class="hurdle-circuit-mark'+(mark.label?' hurdle-circuit-milestone':'')+'" data-score="'+mark.score+'" data-progress="'+mark.progress+'">'+label+players+'</div>';
 }).join('');
 return '<section class="hurdle-circuit" aria-label="Spielerpositionen auf der Hindernisstrecke"><div class="hurdle-circuit-rail" aria-hidden="true"></div>'+markers+'</section>';
}
function hurdleCircuitPoint(progress,width,height){
 const distance=progress*(width+2*height);
 if(distance<height)return {side:'left',x:0,y:height-distance};
 if(distance<=height+width)return {side:'top',x:distance-height,y:0};
 return {side:'right',x:width,y:distance-height-width};
}
function layoutHurdleCircuit(track){
 const rail=track?.querySelector('.hurdle-circuit-rail');
 if(!rail||!rail.offsetWidth||!rail.offsetHeight)return;
 // The middle of the two-pixel rail is the exact position used by every tick.
 const left=rail.offsetLeft+1,top=rail.offsetTop+1,width=rail.offsetWidth-2,height=rail.offsetHeight-1;
 const entries={left:[],top:[],right:[]};
 for(const mark of track.querySelectorAll('.hurdle-circuit-mark')){
  const point=hurdleCircuitPoint(Number(mark.dataset.progress),width,height);
  mark.dataset.side=point.side;
  mark.style.left=(left+point.x)+'px';
  mark.style.top=(top+point.y)+'px';
  const players=mark.querySelector('.hurdle-circuit-players');
  if(players){
   const horizontal=point.side==='top';
   entries[point.side].push({mark,players,position:horizontal?point.x:point.y,size:horizontal?players.offsetWidth:players.offsetHeight});
  }
 }
 // Keep adjacent score groups readable while their ticks stay at the actual score.
 for(const [side,groups] of Object.entries(entries)){
  const horizontal=side==='top',extent=horizontal?width:height;
  const start=horizontal?12:48,end=extent-(horizontal?12:0);
  groups.sort((a,b)=>a.position-b.position);
  const gap=3;
  let edge=start;
  for(const group of groups){
   group.center=Math.max(group.position,edge+group.size/2);
   edge=group.center+group.size/2+gap;
  }
  edge=end;
  for(const {mark,players,position,size,center} of groups.reverse()){
   const fit=Math.min(center,edge-size/2),shift=fit-position;
   edge=fit-size/2-gap;
   players.style.setProperty('--shift',shift+'px');
   const pointer=mark.querySelector('.hurdle-circuit-pointer');
   const dx=horizontal?shift:side==='left'?8:-8,dy=horizontal?8:shift;
   pointer.style.width=Math.hypot(dx,dy)+'px';
   pointer.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  }
 }
}
function hurdleThrowPreview(s,name){
 const targets=new Map(),hits=new Map();
 const add=(list,key,label)=>{if(!list.has(key))list.set(key,[]);if(!list.get(key).includes(label))list.get(key).push(label);};
 const rule=window.KCKranzPolicy?.existing('hindernis',s)||s.kranzRule;
 const wreath=rule?.mode==='choose'?(window.KCKranzPolicy?.values('hindernis')||[12]):[rule?.value??12];
 const attempts=Array.from({length:9},(_,i)=>({kind:'pins',pins:i+1,label:i+1+' Holz'}));
 for(const pins of wreath)if(pins>=0&&pins<=12)attempts.push({kind:'kranz',pins,label:'Kranz ('+pins+')'});
 attempts.push({kind:'gosse',pins:0,label:'Gosse'});
 for(const attempt of attempts){
  const {score,rule}=KCIndividual.hurdleLanding(s,name,attempt);
  if(rule){add(hits,rule.id,attempt.label);add(targets,score,attempt.label);}
  else if(score>=s.config.target)add(targets,s.config.target,attempt.label);
 }
 const help=[...targets].sort(([a],[b])=>a-b).map(([score,throws])=>'<span><strong>'+(score===s.config.target?'Ziel':score+' Pkt.')+'</strong> mit '+throws.join(' / ')+'</span>').join('');
 return {hits,help};
}
function renderHurdleTables(s,rowPlayers,{dashboard,preview,colors,current}){
 const status=n=>s.skip[n]?'⏸ Einmal aussetzen':s.subtract[n]?'− Nächster Wurf':s.double[n]?'×2 Zusatzwurf':s.finished&&s.winners.includes(n)?'🏆 Sieger':'';
 const scores='<section class="hurdle-scores"><h3>Punktestand · Ziel '+s.config.target+'</h3><div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th><th>Punkte</th><th title="Gebuchte Hinderniszahlungen und Endabrechnung">Strafen</th><th>Status</th></tr></thead><tbody>'+rowPlayers.map(n=>'<tr'+(n===current?' class="hurdle-current-row" aria-current="true"':'')+'><th>'+(dashboard?hurdlePlayerDot(colors.get(n)):'')+indEscape(n)+'</th><td><strong>'+s.scores[n]+'</strong></td><td class="ind-penalty"><strong>'+indEuro(indBookedCents(s,n))+'</strong></td><td>'+status(n)+'</td></tr>').join('')+'</tbody></table></div>'+(!dashboard?'<p class="ind-help">'+(s.finished&&s.settlementVersion!==2?'Gespeicherte Endabrechnung nach bisheriger Wertung.':'Abrechnung: '+indEuro(s.config.baseCents)+' × fehlende Punkte / '+s.config.target+'; auf volle Cent aufgerundet. Sieger zahlen keinen Endbetrag.')+'</p>':'')+'</section>';
 const obstacles='<section class="hurdle-rules"><h3>Hindernisse</h3><div class="ind-table-scroll ind-obstacles"><table class="ind-table"><thead><tr><th>Punkte</th><th>Aktion</th></tr></thead><tbody>'+s.config.rules.map(r=>{
  const throws=preview?.hits.get(r.id);
  const classes=!r.enabled?'ind-rule-off':throws?'ind-rule-reachable':s.lastRules.includes(r.id)?'ind-rule-hit':'';
  return '<tr class="'+classes+'"><th>'+r.from+(r.to!==r.from?'–'+r.to:'')+'</th><td>'+indEscape(KCIndividual.ruleLabel(r))+(!r.enabled?' · aus':'')+(throws?'<small>🎳 '+throws.join(' / ')+'</small>':'')+'</td></tr>';
 }).join('')+'</tbody></table></div></section>';
 return scores+obstacles;
}
function renderIndividualBoard(s,options={}){
 if(!s?.id)return '';
 const seven=s.gameKey==='siebener',name=KCIndividual.current(s),ready=s.readyToFinish||KCIndividual.reachedTarget(s),head=s.finished?'🏆 '+s.winners.map(indEscape).join(' · '):ready?(seven?'🏁 Runde beendet – Abschließen':'🏁 Ziel erreicht – Abschließen'):(seven?'🎲 7er-Spiel':'🏃 Hindernislauf')+' · Runde '+s.round;
 const dashboard=options.dashboard&&!seven,running=s.active&&!ready;
 const preview=dashboard&&running&&name&&!s.pendingChoice?hurdleThrowPreview(s,name):null;
 const turn=running?'<div class="ind-turn">🎳 <strong>'+indEscape(name)+'</strong>'+(s.pendingChoice?' · Hindernis entscheiden':seven?' · '+s.turn.length+' / 2 Würfe':s.double[name]?' · Zusatzwurf ×2':s.subtract[name]?' · Nächsten Wurf abziehen':' am Wurf')+
  (dashboard?'<span class="hurdle-turn-score"> · <strong>'+s.scores[name]+' Pkt.</strong></span>':'')+
  (preview?.help?'<div class="hurdle-next-throws" aria-label="Mit einem Wurf erreichbar">'+preview.help+'</div>':'')+'</div>':'';
 const rowPlayers=(typeof window==='undefined'?null:window.KCPlayerRows)?.order(s.players,name,{running:s.active&&!ready})||s.players;
 let body;
 if(seven)body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th>'+KCIndividual.sevenColumns(s).map(n=>'<th>'+n+'</th>').join('')+'<th>Strafe</th></tr></thead><tbody>'+rowPlayers.map(n=>'<tr><th>'+indEscape(n)+('<small class="ind-add-count">➕ '+KCIndividual.sevenAddCount(s,n)+' / '+KCIndividual.sevenAddLimit(s)+' genutzt · '+Math.max(0,KCIndividual.sevenAddLimit(s)-KCIndividual.sevenAddCount(s,n))+' übrig</small>')+'</th>'+KCIndividual.sevenColumns(s).map(col=>{const cell=s.sheet[n][col];return '<td>'+(cell?'<strong>'+cell.value+'</strong><small>'+cell.throws.join(cell.add?' + ':' × ')+' · '+indEuro(cell.cents)+'</small>':'—')+'</td>';}).join('')+'<td><strong>'+indEuro(s.scores[n])+'</strong></td></tr>').join('')+'</tbody></table></div>';
 else {
  const current=dashboard&&running?name:null;
  const colors=dashboard?new Map(s.players.map((player,i)=>[player,HURDLE_PLAYER_COLORS[i%HURDLE_PLAYER_COLORS.length]])):null;
  body='<div class="ind-hurdle-split">'+(dashboard?renderHurdleCircuit(s,colors,current):'')+
   renderHurdleTables(s,rowPlayers,{dashboard,preview,colors,current})+'</div>';
 }
 const events=seven||dashboard?'':(s.events||[]).slice(-3).reverse().map(e=>'<div class="ind-event">'+indEscape(e.name)+' · '+(e.point??'')+' · '+indEscape(e.text)+'</div>').join('');
 return '<section class="ind-board'+(!seven?' ind-hindernis-board':'')+(dashboard?' ind-hurdle-tv':'')+'"><h2>'+head+'</h2>'+(!seven&&s.startPlayer?'<div class="ind-drawn-starter">🎲 Startspieler ausgelost: <strong>'+indEscape(s.startPlayer)+'</strong></div>':'')+turn+(seven?'<p class="ind-help">'+indEuro(KCIndividual.sevenSettings(s.config?.seven).pinCents)+' je Pin Abstand · '+indEscape(KCIndividual.sevenKranzLabel(s.config?.seven))+'</p>':'')+(options.controls||'')+(seven||dashboard?'':renderHurdleTrack(s,name))+body+events+'</section>';
}
