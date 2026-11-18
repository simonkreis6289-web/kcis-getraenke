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
function renderVerticalHurdleTrack(s,current){
 const milestones=new Map([[0,{label:'Start',points:'0'}],[s.config.target,{label:'Ziel',points:String(s.config.target)}]]);
 const rules=s.config.rules.filter(rule=>rule.enabled).sort((a,b)=>a.from-b.from);
 let hurdle=0;
 for(const rule of rules)milestones.set(rule.from,{label:'Hürde '+(rule.from===0?0:++hurdle),points:rule.from===rule.to?String(rule.from):rule.from+'–'+rule.to});
 const positions=new Map(),thrown=new Set((s.history||[]).filter(entry=>entry.action==='throw').map(entry=>entry.name));
 for(const player of s.players){
  if(!thrown.has(player))continue;
  const score=Number(s.scores[player])||0,position=Math.min(s.config.target,score);
  if(!positions.has(position))positions.set(position,[]);
  positions.get(position).push({player,score});
 }
 const step=s.config.target<=65?1:s.config.target<=150?5:10;
 const rows=Array.from({length:s.config.target+1},(_,i)=>s.config.target-i).map(score=>{
  const milestone=milestones.get(score),players=positions.get(score)||[],labeled=milestone||players.length||score%step===0;
  if(!labeled)return '<li class="hurdle-tick" aria-hidden="true" title="'+score+' Punkte"></li>';
  const boxes=players.map(({player,score})=>'<span class="hurdle-runner'+(player===current?' hurdle-current':'')+'"><strong>'+indEscape(player)+'</strong><small>'+score+' Pkt.</small></span>').join('');
  return '<li class="'+(milestone?'hurdle-milestone':'hurdle-position')+(players.length>1?' hurdle-position-shared':'')+'"><span class="hurdle-level">'+(milestone?'<strong>'+milestone.label+'</strong><small>'+milestone.points+' Pkt.</small>':score)+'</span><div class="hurdle-position-runners">'+boxes+'</div></li>';
 }).join('');
 return '<section class="hurdle-track-vertical" aria-label="Position aller Kegler auf der Strecke"><h3>Strecke</h3><ol>'+rows+'</ol></section>';
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
function renderHurdleTables(s,rowPlayers,{dashboard,preview}){
 const status=n=>s.skip[n]?'⏸ Einmal aussetzen':s.subtract[n]?'− Nächster Wurf':s.double[n]?'×2 Zusatzwurf':s.finished&&s.winners.includes(n)?'🏆 Sieger':'';
 const scores='<section class="hurdle-scores"><h3>Punktestand · Ziel '+s.config.target+'</h3><div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th><th>Punkte</th><th title="Gebuchte Hinderniszahlungen und Endabrechnung">Strafen</th><th>Status</th></tr></thead><tbody>'+rowPlayers.map(n=>'<tr><th>'+indEscape(n)+'</th><td><strong>'+s.scores[n]+'</strong></td><td class="ind-penalty"><strong>'+indEuro(indBookedCents(s,n))+'</strong></td><td>'+status(n)+'</td></tr>').join('')+'</tbody></table></div>'+(!dashboard?'<p class="ind-help">'+(s.finished&&s.settlementVersion!==2?'Gespeicherte Endabrechnung nach bisheriger Wertung.':'Abrechnung: '+indEuro(s.config.baseCents)+' × fehlende Punkte / '+s.config.target+'; auf volle Cent aufgerundet. Sieger zahlen keinen Endbetrag.')+'</p>':'')+'</section>';
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
 else body='<div class="ind-hurdle-split">'+(dashboard?renderVerticalHurdleTrack(s,running?name:''):'')+renderHurdleTables(s,rowPlayers,{dashboard,preview})+'</div>';
 const events=seven||dashboard?'':(s.events||[]).slice(-3).reverse().map(e=>'<div class="ind-event">'+indEscape(e.name)+' · '+(e.point??'')+' · '+indEscape(e.text)+'</div>').join('');
 return '<section class="ind-board'+(!seven?' ind-hindernis-board':'')+(dashboard?' ind-hurdle-tv':'')+'"><h2>'+head+'</h2>'+(!seven&&s.startPlayer?'<div class="ind-drawn-starter">🎲 Startspieler ausgelost: <strong>'+indEscape(s.startPlayer)+'</strong></div>':'')+turn+(seven?'<p class="ind-help">'+indEuro(KCIndividual.sevenSettings(s.config?.seven).pinCents)+' je Pin Abstand · '+indEscape(KCIndividual.sevenKranzLabel(s.config?.seven))+'</p>':'')+(options.controls||'')+(seven||dashboard?'':renderHurdleTrack(s,name))+body+events+'</section>';
}
