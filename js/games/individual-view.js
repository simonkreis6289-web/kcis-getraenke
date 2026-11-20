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
function hurdlePlayerDot(color,current=false){
 return '<span class="hurdle-player-dot'+(current?' hurdle-dot-current':'')+'" style="--player-color:'+color+'" aria-hidden="true"></span>';
}
function renderHurdleCircuit(s,colors,current){
 const target=s.config.target;
 const rules=s.config.rules.filter(rule=>rule.enabled&&rule.from>0&&rule.from<target).sort((a,b)=>a.from-b.from);
 const startRange=s.config.rules.find(rule=>rule.enabled&&rule.from===0&&rule.to>0);
 const stops=[{score:0,label:'Start',points:startRange?'0–'+startRange.to:'0',end:startRange?.to},...rules.map((rule,i)=>({
  score:rule.from,end:rule.to,label:'Hürde '+(i+1),points:rule.from===rule.to?String(rule.from):rule.from+'–'+rule.to
 })),{score:target,label:'Ziel',points:String(target)}];
 const marks=new Map(stops.map((stop,index)=>[stop.score,{...stop,progress:index/(stops.length-1),players:[]}]));
 const progressFor=score=>{
  const stop=marks.get(score);
  if(stop)return stop.progress;
  const upper=stops.findIndex(stop=>stop.score>score);
  const low=stops[upper-1].score,high=stops[upper].score;
  return (upper-1+(score-low)/(high-low))/(stops.length-1);
 };
 const ranges=stops.filter(stop=>stop.end>stop.score).map(stop=>'<path data-range-start="'+progressFor(stop.score)+'" data-range-end="'+progressFor(stop.end)+'"></path>').join('');
 const thrown=new Set((s.history||[]).filter(entry=>entry.action==='throw').map(entry=>entry.name));
 for(const player of s.players){
  if(!thrown.has(player))continue;
  const score=Number(s.scores[player])||0;
  const position=Math.max(0,Math.min(target,score));
  if(!marks.has(position))marks.set(position,{score:position,progress:progressFor(position),players:[]});
  const title=indEscape(player+' · '+score+' Pkt.');
  marks.get(position).players.push('<span class="hurdle-circuit-player" title="'+title+'">'+hurdlePlayerDot(colors.get(player),player===current)+
   '<span>'+indEscape(player)+(score!==position?' <small>('+score+' Pkt.)</small>':'')+'</span></span>');
 }
 const markers=[...marks.values()].sort((a,b)=>a.progress-b.progress).map(mark=>{
  const label=mark.label?'<span class="hurdle-circuit-stop"><strong>'+mark.label+'</strong><small>'+mark.points+' Pkt.</small></span>':'';
  const players=mark.players.length?'<span class="hurdle-circuit-pointer" aria-hidden="true"></span><div class="hurdle-circuit-players">'+
   (mark.label?'':'<strong>'+mark.score+'</strong>')+'<div class="hurdle-circuit-names">'+mark.players.join('')+'</div></div>':'';
  return '<div class="hurdle-circuit-mark'+(mark.label?' hurdle-circuit-milestone':'')+'" data-score="'+mark.score+'" data-progress="'+mark.progress+'">'+label+players+'</div>';
 }).join('');
 return '<section class="hurdle-circuit" aria-label="Spielerpositionen auf der Hindernisstrecke"><div class="hurdle-circuit-rail" aria-hidden="true"></div>'+(ranges?'<svg class="hurdle-circuit-ranges" aria-hidden="true">'+ranges+'</svg>':'')+markers+'</section>';
}
function hurdleCircuitPoint(progress,width,height){
 const distance=progress*(width+2*height);
 if(distance<height)return {side:'left',x:0,y:height-distance};
 if(distance<=height+width)return {side:'top',x:distance-height,y:0};
 return {side:'right',x:width,y:distance-height-width};
}
const HURDLE_LABEL_GAP=4;
function positionHurdleLabels(groups,start,end,horizontal,drop=0){
 let edge=start;
 for(const group of groups){
  const size=horizontal?group.width:group.height;
  group.center=Math.max(group.position,edge+size/2);
  edge=group.center+size/2+HURDLE_LABEL_GAP;
 }
 edge=end;
 for(let index=groups.length-1;index>=0;index--){
  const {mark,players,position,width,height,center}=groups[index];
  const size=horizontal?width:height,fit=Math.min(center,edge-size/2),shift=fit-position;
  edge=fit-size/2-HURDLE_LABEL_GAP;
  players.style.setProperty('--shift',shift+'px');
  players.style.setProperty('--drop',drop+'px');
  const pointer=mark.querySelector('.hurdle-circuit-pointer');
  const dx=horizontal?shift:mark.dataset.side==='left'?8:-8,dy=horizontal?8+drop:shift;
  pointer.style.width=Math.hypot(dx,dy)+'px';
  pointer.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
 }
}
function layoutHurdleCircuit(track){
 const rail=track?.querySelector('.hurdle-circuit-rail');
 if(!rail||!rail.offsetWidth||!rail.offsetHeight)return;
 // The middle of the two-pixel rail is the exact position used by every tick.
 const left=rail.offsetLeft+1,top=rail.offsetTop+1,width=rail.offsetWidth-2,height=rail.offsetHeight-1;
 for(const range of track.querySelectorAll('[data-range-start]')){
  const start=Number(range.dataset.rangeStart),end=Number(range.dataset.rangeEnd),length=width+2*height;
  const corners=[height/length,(height+width)/length].filter(step=>step>start&&step<end);
  const path=[start,...corners,end].map(step=>{const {x,y}=hurdleCircuitPoint(step,width,height);return (left+x)+' '+(top+y);});
  range.setAttribute('d','M'+path.join(' L'));
 }
 const field=track.parentElement,padding=parseFloat(window.getComputedStyle?.(field)?.paddingLeft);
 const sideWidth=Number.isFinite(padding)?Math.max(24,padding-left-15):110;
 const topWidth=Math.max(1,width-24),entries={left:[],top:[],right:[]};
 for(const mark of track.querySelectorAll('.hurdle-circuit-mark')){
  const point=hurdleCircuitPoint(Number(mark.dataset.progress),width,height);
  mark.dataset.side=point.side;
  mark.style.left=(left+point.x)+'px';
  mark.style.top=(top+point.y)+'px';
  const players=mark.querySelector('.hurdle-circuit-players');
  if(players){
   const horizontal=point.side==='top';
   players.style.maxWidth=(horizontal?Math.min(320,topWidth):sideWidth)+'px';
   entries[point.side].push({mark,players,position:horizontal?point.x:point.y,width:players.offsetWidth,height:players.offsetHeight});
  }
 }
 // Pack crowded labels into additional rows while keeping their ticks at the actual score.
 let lane=[],laneWidth=0,laneHeight=0,drop=0;
 for(const group of entries.top){
  if(lane.length&&laneWidth+HURDLE_LABEL_GAP+group.width>topWidth){
   positionHurdleLabels(lane,12,width-12,true,drop);
   drop+=laneHeight+HURDLE_LABEL_GAP;
   lane=[];laneWidth=0;laneHeight=0;
  }
  laneWidth+=(lane.length?HURDLE_LABEL_GAP:0)+group.width;
  laneHeight=Math.max(laneHeight,group.height);
  lane.push(group);
 }
 positionHurdleLabels(lane,12,width-12,true,drop);
 const topDepth=drop+laneHeight;
 const sideStart=Math.max(24,topDepth+16);
 let minHeight=0;
 for(const side of ['left','right']){
  const groups=entries[side].sort((a,b)=>a.position-b.position);
  if(!groups.length)continue;
  const stackHeight=groups.reduce((sum,group)=>sum+group.height+HURDLE_LABEL_GAP,0);
  const end=Math.max(height,sideStart+stackHeight);
  positionHurdleLabels(groups,sideStart,end,false);
  minHeight=Math.max(minHeight,top+sideStart+stackHeight+12);
 }
 field.style.setProperty('--hurdle-top-space',Math.max(70,top+topDepth+19)+'px');
 field.style.setProperty('--hurdle-track-min-height',minHeight+'px');
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
 const penalty=n=>'<strong>'+indEuro(indBookedCents(s,n))+'</strong>'+
  (s.active&&!s.finished?'<small class="hurdle-penalty-preview" title="Zusätzliche Strafe nach aktuellem Punktestand">+'+indEuro(KCIndividual.hurdleEndCents(s.config,s.scores[n]))+'</small>':'');
 const scores='<section class="hurdle-scores"><h3>Punktestand · Ziel '+s.config.target+'</h3><div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th><th>Punkte</th><th title="Gebuchte Hinderniszahlungen und Endabrechnung">Strafen</th><th>Status</th></tr></thead><tbody'+(globalThis.window?.KCPlayerRows?.group?.(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>'<tr'+(globalThis.window?.KCPlayerRows?.row?.(n)||'')+(n===current?' class="hurdle-current-row" aria-current="true"':'')+'><th>'+(dashboard?hurdlePlayerDot(colors.get(n)):'')+indEscape(n)+'</th><td><strong'+(globalThis.window?.KCPlayerRows?.score?.(n)||'')+'>'+s.scores[n]+'</strong></td><td class="ind-penalty">'+penalty(n)+'</td><td>'+status(n)+'</td></tr>').join('')+'</tbody></table></div>'+(!dashboard?'<p class="ind-help">'+(s.finished&&s.settlementVersion!==2?'Gespeicherte Endabrechnung nach bisheriger Wertung.':'Abrechnung: '+indEuro(s.config.baseCents)+' × fehlende Punkte / '+s.config.target+'; auf volle Cent aufgerundet. Sieger zahlen keinen Endbetrag.')+'</p>':'')+'</section>';
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
 const openNumbers=seven&&options.dashboard&&running?KCIndividual.sevenColumns(s).filter(number=>!s.sheet[name]?.[number]):[];
 const openTargets=openNumbers.length?'<span class="ind-seven-open"><span>Offen</span>'+
  openNumbers.map(number=>'<b>'+number+'</b>').join('')+'</span>':'';
 const turn=running?'<div class="ind-turn'+(openTargets?' ind-seven-tv-turn':'')+'">'+(openTargets?'<span>':'')+'🎳 <strong>'+indEscape(name)+'</strong>'+(s.pendingChoice?' · Hindernis entscheiden':seven?' · '+s.turn.length+' / 2 Würfe':s.double[name]?' · Zusatzwurf ×2':s.subtract[name]?' · Nächsten Wurf abziehen':' am Wurf')+
  (dashboard?'<span class="hurdle-turn-score"> · <strong>'+s.scores[name]+' Pkt.</strong></span>':'')+(openTargets?'</span>'+openTargets:'')+
  (preview?.help?'<div class="hurdle-next-throws" aria-label="Mit einem Wurf erreichbar">'+preview.help+'</div>':'')+'</div>':'';
 const rowPlayers=(typeof window==='undefined'?null:window.KCPlayerRows)?.order(s.players,name,{running:s.active&&!ready})||s.players;
 let body;
 if(seven)body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th>'+KCIndividual.sevenColumns(s).map(n=>'<th>'+n+'</th>').join('')+'<th>Strafe</th></tr></thead><tbody'+(globalThis.window?.KCPlayerRows?.group?.(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>'<tr'+(globalThis.window?.KCPlayerRows?.row?.(n)||'')+(options.dashboard&&running&&n===name?' class="ind-current" aria-current="true"':'')+'><th>'+indEscape(n)+('<small class="ind-add-count">➕ '+KCIndividual.sevenAddCount(s,n)+' / '+KCIndividual.sevenAddLimit(s)+' genutzt · '+Math.max(0,KCIndividual.sevenAddLimit(s)-KCIndividual.sevenAddCount(s,n))+' übrig</small>')+'</th>'+KCIndividual.sevenColumns(s).map(col=>{const cell=s.sheet[n][col];return '<td>'+(cell?'<strong>'+cell.value+'</strong><small>'+cell.throws.join(cell.add?' + ':' × ')+' · '+indEuro(cell.cents)+'</small>':'—')+'</td>';}).join('')+'<td><strong'+(globalThis.window?.KCPlayerRows?.score?.(n)||'')+'>'+indEuro(s.scores[n])+'</strong></td></tr>').join('')+'</tbody></table></div>';
 else {
  const current=dashboard&&running?name:null;
  const colors=dashboard?new Map(s.players.map((player,i)=>[player,HURDLE_PLAYER_COLORS[i%HURDLE_PLAYER_COLORS.length]])):null;
  body='<div class="ind-hurdle-split">'+(dashboard?renderHurdleCircuit(s,colors,current):'')+
   renderHurdleTables(s,rowPlayers,{dashboard,preview,colors,current})+'</div>';
 }
 if(dashboard){
  return '<div class="hurdle-tv-frame"><div class="hurdle-tv-header"><h2>'+head+'</h2>'+
   '<div class="hurdle-tv-turn">'+turn+'</div></div><div class="hurdle-tv-fit" data-hurdle-game="'+indEscape(s.id)+'">'+
   '<div class="tv-board ind-tv-board hurdle-tv-board"><section class="ind-board ind-hindernis-board ind-hurdle-tv">'+body+'</section></div></div></div>';
 }
 const events=seven?'':(s.events||[]).slice(-3).reverse().map(e=>'<div class="ind-event">'+indEscape(e.name)+' · '+(e.point??'')+' · '+indEscape(e.text)+'</div>').join('');
 return '<section class="ind-board'+(!seven?' ind-hindernis-board':'')+'"><h2>'+head+'</h2>'+turn+(seven?'<p class="ind-help">'+indEuro(KCIndividual.sevenSettings(s.config?.seven).pinCents)+' je Pin Abstand · '+indEscape(KCIndividual.sevenKranzLabel(s.config?.seven))+'</p>':'')+(options.controls||'')+(seven?'':renderHurdleTrack(s,name))+body+events+'</section>';
}
