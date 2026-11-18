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
function renderIndividualBoard(s,options={}){
 if(!s?.id)return '';
 const seven=s.gameKey==='siebener',name=KCIndividual.current(s),ready=s.readyToFinish||KCIndividual.reachedTarget(s),head=s.finished?'🏆 '+s.winners.map(indEscape).join(' · '):ready?(seven?'🏁 Runde beendet – Abschließen':'🏁 Ziel erreicht – Abschließen'):(seven?'🎲 7er-Spiel':'🏃 Hindernislauf')+' · Runde '+s.round;
 const turn=s.active&&!ready?'<div class="ind-turn">🎳 <strong>'+indEscape(name)+'</strong>'+(s.pendingChoice?' · Hindernis entscheiden':seven?' · '+s.turn.length+' / 2 Würfe':s.double[name]?' · Zusatzwurf ×2':s.subtract[name]?' · Nächsten Wurf abziehen':' am Wurf')+'</div>':'';
 const rowPlayers=(typeof window==='undefined'?null:window.KCPlayerRows)?.order(s.players,name,{running:s.active&&!ready})||s.players;
 let body;
 if(seven)body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th>'+KCIndividual.sevenColumns(s).map(n=>'<th>'+n+'</th>').join('')+'<th>Strafe</th></tr></thead><tbody>'+rowPlayers.map(n=>'<tr><th>'+indEscape(n)+('<small class="ind-add-count">➕ '+KCIndividual.sevenAddCount(s,n)+' / '+KCIndividual.sevenAddLimit(s)+' genutzt · '+Math.max(0,KCIndividual.sevenAddLimit(s)-KCIndividual.sevenAddCount(s,n))+' übrig</small>')+'</th>'+KCIndividual.sevenColumns(s).map(col=>{const cell=s.sheet[n][col];return '<td>'+(cell?'<strong>'+cell.value+'</strong><small>'+cell.throws.join(cell.add?' + ':' × ')+' · '+indEuro(cell.cents)+'</small>':'—')+'</td>';}).join('')+'<td><strong>'+indEuro(s.scores[n])+'</strong></td></tr>').join('')+'</tbody></table></div>';
 else body='<div class="ind-hurdle-split"><section><h3>Punktestand · Ziel '+s.config.target+'</h3><div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Name</th><th>Punkte</th><th title="Gebuchte Hinderniszahlungen und Endabrechnung">Strafen</th><th>Status</th></tr></thead><tbody>'+rowPlayers.map(n=>'<tr><th>'+indEscape(n)+'</th><td><strong>'+s.scores[n]+'</strong></td><td class="ind-penalty"><strong>'+indEuro(indBookedCents(s,n))+'</strong></td><td>'+(s.skip[n]?'⏸ Einmal aussetzen':s.subtract[n]?'− Nächster Wurf':s.double[n]?'×2 Zusatzwurf':s.finished&&s.winners.includes(n)?'🏆 Sieger':'')+'</td></tr>').join('')+'</tbody></table></div><p class="ind-help">'+(s.finished&&s.settlementVersion!==2?'Gespeicherte Endabrechnung nach bisheriger Wertung.':'Abrechnung: '+indEuro(s.config.baseCents)+' × fehlende Punkte / '+s.config.target+'; auf volle Cent aufgerundet. Sieger zahlen keinen Endbetrag.')+'</p>'+'</section><section><h3>Hindernisse</h3><div class="ind-table-scroll ind-obstacles"><table class="ind-table"><thead><tr><th>Punkte</th><th>Aktion</th></tr></thead><tbody>'+s.config.rules.map(r=>'<tr class="'+(!r.enabled?'ind-rule-off':s.lastRules.includes(r.id)?'ind-rule-hit':'')+'"><th>'+r.from+(r.to!==r.from?'–'+r.to:'')+'</th><td>'+indEscape(KCIndividual.ruleLabel(r))+(!r.enabled?' · aus':'')+'</td></tr>').join('')+'</tbody></table></div></section></div>';
 const events=seven?'':(s.events||[]).slice(-3).reverse().map(e=>'<div class="ind-event">'+indEscape(e.name)+' · '+(e.point??'')+' · '+indEscape(e.text)+'</div>').join('');
 return '<section class="ind-board'+(!seven?' ind-hindernis-board':'')+'"><h2>'+head+'</h2>'+(!seven&&s.startPlayer?'<div class="ind-drawn-starter">🎲 Startspieler ausgelost: <strong>'+indEscape(s.startPlayer)+'</strong></div>':'')+turn+(seven?'<p class="ind-help">'+indEuro(KCIndividual.sevenSettings(s.config?.seven).pinCents)+' je Pin Abstand · '+indEscape(KCIndividual.sevenKranzLabel(s.config?.seven))+'</p>':'')+(options.controls||'')+(seven?'':renderHurdleTrack(s,name))+body+events+'</section>';
}
