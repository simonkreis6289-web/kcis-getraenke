function pokerRankingPanel(){
 // Reihenfolge und Bezeichnungen stammen aus KCRoundGames.pokerHand.
 const labels=['Nichts','Zwilling','Doppelzwilling','Drilling','Full House','Vierling','Straße','Fünfling'];
 const examples=['1 · 2 · 3 · 5 · 7','4 · 4 · 2 · 5 · 7','4 · 4 · 6 · 6 · 2','5 · 5 · 5 · 2 · 8','3 · 3 · 3 · 7 · 7','9 · 9 · 9 · 9 · 2','2 · 3 · 4 · 5 · 6','8 · 8 · 8 · 8 · 8'];
 return '<aside class="poker-ranking-panel" aria-label="Rangliste der Pokerwertungen"><h3>🃏 Wertungs-Rangliste</h3><p>Von stark nach schwach</p><ol class="poker-ranking-list">'+labels.map((name,level)=>({name,level,example:examples[level]})).reverse().map((item,i)=>'<li class="poker-ranking-item"><span class="poker-ranking-place">'+(i+1)+'.</span><span class="poker-ranking-description"><strong>'+item.name+'</strong><small>'+item.example+'</small></span></li>').join('')+'</ol></aside>';
}
function pokerCardText(card){
 return card?.kind==='gosse'?'G':card?.kind==='kranz'?'K('+card.pins+')':card?.pins??'—';
}
function pokerTableCards(s,name){
 const starting=(s.rows[name]||[]).filter(roll=>roll.phase==='deal');
 const replacements=(s.rows[name]||[]).filter(roll=>roll.phase==='redraw');
 const positions=s.exchanges[name]||[];
 return Array.from({length:5},(_,i)=>{
  const replacement=positions.indexOf(i),exchanged=replacement>=0&&!!replacements[replacement];
  const old=exchanged&&starting[i]?'<del class="poker-old-card" aria-label="Vorher '+indPokerEscape(pokerCardText(starting[i]))+'">'+indPokerEscape(pokerCardText(starting[i]))+'</del>':'';
  return '<td'+(replacement>=0?' class="poker-exchanged"':'')+'>'+indPokerEscape(pokerCardText(s.hands[name]?.[i]))+old+'</td>';
 }).join('');
}
function indPokerEscape(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function pfaelzerNumberBoard(s,current){
 const last=s.history.at(-1);
 return '<ol class="pfaelzer-numbers" aria-label="Zielzahlen und zugeordnete Kegler">'+Array.from({length:9},(_,i)=>{
  const number=i+1,names=s.players.filter(name=>s.ownNumbers[name]===number);
  const hit=last?.struck?.some(name=>names.includes(name))&&last.pins===number;
  const unassigned=last?.action==='throw'&&last.pins===number&&!names.length&&s.rows[last.name]?.at(-1)?.phase==='rounds';
  const result=hit?' is-hit':unassigned?' is-unassigned':'';
  const label=unassigned?' aria-label="'+number+' · geworfen und unbesetzt"':'';
  return '<li><span class="pfaelzer-ball'+result+'"'+label+'>'+number+'</span>'+
   names.map(name=>'<span class="pfaelzer-name'+(s.active&&name===current?' is-current':'')+'">'+indPokerEscape(name)+'</span>').join('')+'</li>';
 }).join('')+'</ol>';
}
function pfaelzerTable(s,players,current,money){
 return '<table class="ind-table pfaelzer-table"><thead><tr><th>Kegler</th><th>Eigene Zahl</th><th>Striche</th><th>Betrag</th><th>Würfe</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+
  players.map(name=>{
   const count=s.scores[name],number=s.ownNumbers[name];
   const marks=count<=10?'<span aria-hidden="true" class="pfaelzer-marks">'+Array.from({length:count},()=>'<i></i>').join('')+'</span>':'';
   return '<tr'+(window.KCPlayerRows?.row(name)||'')+(s.active&&name===current?' class="pfaelzer-current"':'')+'><th scope="row">'+indPokerEscape(name)+'</th><td>'+
    (number?'<span class="pfaelzer-ball">'+number+'</span>':'—')+'</td><td><span class="pfaelzer-strikes">'+marks+'<strong>'+count+'</strong></span></td><td>'+
    money(count*s.config.strichCents)+'</td><td>'+s.rows[name].length+'</td></tr>';
  }).join('')+'</tbody></table>';
}
function renderClassicGameBoard(s,{controls=''}={}){
 if(!s?.id)return '';const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>(v/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),key=s.gameKey,current=window.KCExtraGames.current(s),g=window.KCRoundGames;
 const rowPlayers=window.KCPlayerRows?.order(s.players,current,{running:s.active&&!s.finished,unavailable:n=>s.phase==='tiebreak'&&!s.tiePlayers.includes(n)})||s.players;
 const phase=s.phase==='tiebreak'?'Stechen '+s.tieRound+' · Wurf '+(s.turn.length+1)+' / '+s.config.tieThrows:key==='poker'?({deal:'Erste Hand · Wurf '+((s.hands[current]?.length||0)+1)+' / 5',select:'Tauschpositionen wählen',redraw:'Tauschen · Wurf '+(s.turn.length+1)+' / '+s.exchanges[current]?.length}[s.phase]||''):key==='pfaelzer'?(s.phase==='numbers'?'Eigene Zahl bestimmen':'Runde '+s.round+' von '+s.config.rounds):'Runde '+s.round+' / '+s.config.rounds+' · '+g.thousandModeLabel(g.thousandMode(s.config,s.round))+' · '+(s.pendingArrange?'Zahl anordnen':'Wurf '+(s.turn.length+1)+' / 3');
 const head=s.finished&&key!=='pfaelzer'?'':s.finished?(s.winners.length?'🏆 '+s.winners.map(esc).join(' · '):'🏁 Alle ohne Kombination'):g.icons[key]+' '+g.titles[key];
 const distanceFee=key==='tausend'&&s.finished&&s.config.distanceFee;let body='';
 if(key==='poker')body='<table class="ind-table"><thead><tr><th>Kegler</th>'+[1,2,3,4,5].map(i=>'<th>'+i+'</th>').join('')+'<th>Wertung</th><th>Würfe</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>'<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+pokerTableCards(s,n)+'<td>'+esc(g.pokerHand(s.hands[n]).label)+'</td><td>'+s.rows[n].length+'</td></tr>').join('')+'</tbody></table>';
 else if(key==='pfaelzer')body=pfaelzerTable(s,rowPlayers,current,money);
 else body='<table class="ind-table"><thead><tr><th>Kegler</th>'+Array.from({length:s.config.rounds},(_,i)=>'<th>R'+(i+1)+'</th>').join('')+'<th>Gesamt</th><th>Abstand</th>'+(distanceFee?'<th>Strafe</th>':'')+'</tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>'<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+Array.from({length:s.config.rounds},(_,i)=>'<td>'+(s.results[n][i]?'<strong>'+s.results[n][i].value+'</strong><small>'+s.results[n][i].throws.map(t=>t.kind==='gosse'?'G('+t.pins+')':t.kind==='kranz'?'K('+t.pins+')':t.pins).join(' · ')+'</small>':'—')+'</td>').join('')+'<td><strong>'+s.scores[n]+'</strong></td><td>'+Math.abs(s.config.target-s.scores[n])+'</td>'+(distanceFee?'<td>'+money((s.bookings||[]).find(b=>b.personName===n)?.amountCents||0)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
 if(s.phase==='tiebreak')body+='<div class="classic-tie"><strong>Stechen · '+s.config.tieThrows+' Würfe pro Kegler</strong><p>'+s.tiePlayers.map(n=>esc(n)+': '+s.tieScores[n]).join(' · ')+'</p></div>';
 if(s.finished){
  const booked=key==='pfaelzer'?['Strichbeträge']:key==='tausend'?[...(s.config.classicLosers!==false?['Verliererwertung']:[]),...(s.config.distanceFee?['Geldbeträge nach Abstand']:[])]:['Verliererwertung'];
  body+='<p class="extra-result">Spiel beendet'+(booked.length?' · '+booked.join(' und ')+' gebucht':'')+'.</p>';
 }
 return '<section class="ind-board extra-board classic-game-board" data-extra-game="'+key+'">'+(head?'<h2>'+head+'</h2>':'')+(s.active?'<div class="extra-turn ind-turn">🎳 '+esc(current)+' · '+esc(phase)+'</div>':'')+controls+(key==='pfaelzer'?pfaelzerNumberBoard(s,current)+(s.finished?'<p class="pfaelzer-final-round">Runde '+s.config.rounds+' von '+s.config.rounds+'</p>':''):'')+'<div class="classic-table-and-ranking"><div class="ind-table-scroll">'+body+'</div>'+(key==='poker'?pokerRankingPanel():'')+'</div><p class="ind-help">'+esc(g.summary(key,s.config))+'</p></section>';
}

/* Die gleiche Spieltafel wird in der App und auf dem TV verwendet. */
function renderRoundGameBoard(s,{controls='',dashboard=false}={}){
 if(!s?.id)return '';if(['poker','pfaelzer','tausend'].includes(s.gameKey))return renderClassicGameBoard(s,{controls});const g=window.KCRoundGames,key=s.gameKey,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=v=>(v/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),number=n=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:2}),current=window.KCExtraGames.current(s),party=key==='parteienspiel',jump=key==='hochsprung',euro=key==='dreieuro',end=s.round,begin=Math.max(1,end-5),rounds=Array.from({length:end-begin+1},(_,i)=>begin+i),name=n=>party?s.teamNames[n]:n;
 const winners=(s.winners||[]).map(name).join(' · '),heading=s.finished?'🏆 '+winners:g.icons[key]+' '+g.titles[key];
 const rowPlayers=window.KCPlayerRows?.order(s.players,current,{running:s.active&&!s.finished,unavailable:n=>jump&&s.jumps[n].eliminated})||s.players;
 let top='',body='',turn=esc(current);
 if(party){
  top='<div class="extra-team-grid">'+['T1','T2'].map(t=>'<article class="extra-team-card '+(s.active&&s.participantTeams[t].includes(current)?'extra-current':'')+'"><small>'+esc(s.teamNames[t])+'</small><strong>'+s.scores[t]+' Punkte</strong><span>Holz in dieser Runde: '+s.roundTotals[t]+'</span><span>'+s.participantTeams[t].map(esc).join(' · ')+'</span></article>').join('')+'</div>';
  body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Runde</th><th>'+esc(s.teamNames.T1)+'</th><th>'+esc(s.teamNames.T2)+'</th><th>Differenzpunkte</th></tr></thead><tbody>'+s.roundResults.slice(-6).map(r=>'<tr><th>'+r.round+'</th><td>'+r.totals.T1+'</td><td>'+r.totals.T2+'</td><td>'+(r.winner?esc(s.teamNames[r.winner])+' +'+r.points:'Gleichstand · 0')+'</td></tr>').join('')+'</tbody></table></div>';
  turn+=' · '+esc(s.teamNames[s.participantTeams.T1.includes(current)?'T1':'T2'])+' · Runde '+s.round;
 }else if(jump){
  const index=s.round-1;turn+=' · Hürde '+s.round+' / '+s.config.targets.length+' · Ziel '+s.config.targets[index]+' · Versuch '+(s.turn.length+1)+' / 3';
  body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Kegler</th>'+s.config.targets.map((n,i)=>'<th>H'+(i+1)+' · '+n+'</th>').join('')+'<th>Würfe</th><th>Status</th><th>Betrag</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>{const p=s.jumps[n];return '<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+s.config.targets.map((target,i)=>{const r=s.rows[n][i];return '<td class="'+(r?.cleared?'round-jump-cleared':r?.missing?'round-jump-failed':'')+'">'+(r?'<strong>'+r.pins+' / '+target+'</strong><small>'+r.throws.map(t=>t.kind==='kranz'?'K('+t.pins+')':t.kind==='gosse'?'G':t.pins).join(' + ')+'</small>':'—')+'</td>';}).join('')+'<td>'+p.totalThrows+'</td><td>'+(p.eliminated?'✕ Hürde '+(p.outAt+1):p.cleared===s.config.targets.length?'✅ Ziel erreicht':'Aktiv')+'</td><td><strong>'+money(p.feeCents)+'</strong>'+(p.eliminated?'<small>'+(s.config.targets.length-p.outAt)+' × '+p.missing+' × '+money(s.config.missingPinCents)+'</small>':'')+'</td></tr>';}).join('')+'</tbody></table></div><p class="ind-help">Ausscheiden: 1. Verlierer. Bei gleicher Ausscheidehürde entscheiden weniger insgesamt benötigte Würfe. Fehlbetrag = verbleibende Hürden einschließlich aktueller Hürde × fehlende Pins × Pinpreis. Abrechnung am Spielende.</p>';
  if(dashboard){
   const last=s.history.findLast(entry=>entry.action==='throw');
   const height=last?s.rows[last.name]?.[last.hurdle??last.round-1]?.pins??0:0;
   const target=s.active?s.config.targets[index]:last?.target??s.config.targets[index];
   const scale=Math.max(1,height,...s.config.targets);
   const meter='<aside class="jump-tv-meter" aria-label="Sprunghöhe"><strong>'+height+' Holz</strong><small>'+esc(last?.name||current)+'</small>'+
    '<div class="jump-tv-scale"><div class="jump-tv-fill" style="--jump-height:'+100*height/scale+'%"></div><span class="jump-tv-bar" style="--jump-bar:'+100*target/scale+'%">Latte · '+target+'</span></div><small>0 Holz</small></aside>';
   body='<div class="jump-tv-stage">'+meter+body+'</div>';
  }
 }else{
  if(key==='ebbeflut')top='<div class="round-tide round-tide-'+s.tide+'"><strong>Aktuell: '+({ebbe:'🌘 Ebbe · × 0,5',normal:'〰️ Normal · × 1',flut:'🌊 Flut · × 2'}[s.tide])+'</strong><span>3 → nächste Würfe halb · 5 → nächste Würfe einfach · 7 → sofort doppelt</span></div><div class="round-tide-legend" aria-label="Farben der Wurfwertung"><span class="round-tide-cell-ebbe">Ebbe · × 0,5</span><span class="round-tide-cell-normal">Normal · × 1</span><span class="round-tide-cell-flut">Flut · × 2</span></div>';
  turn+=' · '+(euro?'Wurf ':'Runde ')+s.round+' / '+(euro?s.config.throws:s.config.rounds);
  body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Kegler</th>'+rounds.map(r=>'<th>'+(euro?'Wurf ':'R')+r+'</th>').join('')+'<th>'+(euro?'Restbetrag':'Gesamt')+'</th><th>Würfe</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowPlayers.map(n=>'<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+rounds.map(r=>{const v=s.rows[n][r-1],tide=key==='ebbeflut'&&v?(v.factor===.5?'ebbe':v.factor===2?'flut':'normal'):'';return '<td'+(tide?' class="round-tide-cell round-tide-cell-'+tide+'"':'')+'>'+(v?'<strong>'+(v.kind==='kranz'?'K('+v.pins+')':v.kind==='gosse'?'G':v.pins)+'</strong><small'+(tide?' class="round-tide-value"':'')+'>'+(euro?(v.deltaCents>0?'+':'')+money(v.deltaCents):(tide?{ebbe:'Ebbe',normal:'Normal',flut:'Flut'}[tide]+' · ':'')+'× '+number(v.factor)+' = '+number(v.result))+'</small>':'—')+'</td>';}).join('')+'<td><strong>'+(euro?money(Math.max(0,s.scores[n])):number(s.scores[n]))+'</strong></td><td>'+s.rows[n].length+'</td></tr>').join('')+'</tbody></table></div>';
 }
 return '<section class="ind-board extra-board round-game-board'+(dashboard&&jump?' jump-tv-board':'')+'" data-extra-game="'+key+'"><h2>'+esc(heading)+'</h2>'+(s.active?'<div class="ind-turn extra-turn">🎳 '+turn+'</div>':'')+controls+top+body+'<p class="ind-help">'+esc(g.summary(key,s.config))+'</p>'+(s.finished?'<p class="extra-result">Spiel beendet · '+(euro?'Restbeträge gebucht.':jump?'Fehlbeträge und 1. Verlierer gebucht.':'Verliererwertung gebucht.')+'</p>':'')+'</section>';
}

function renderExtraGameBoard(s,{controls='',slatColor,dashboard=false,abschreibungFrame=null}={}){
 if(!s?.id)return '';if(window.KCClubGames?.keys.includes(s.gameKey))return renderClubGameBoard(s,{controls,dashboard,abschreibungFrame});if(window.KCRoundGames?.keys.includes(s.gameKey))return renderRoundGameBoard(s,{controls,dashboard});const g=window.KCExtraGames,esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>(n/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'}),key=s.gameKey,ball=key==='ballermann',fence=key==='lattenzaun';
 const names=ball?['T2','T1']:s.players,best=fence?Math.min(...names.map(n=>s.scores[n])):Math.max(...names.map(n=>s.scores[n])),place=n=>[...new Set(names.map(n=>s.scores[n]))].sort((a,b)=>fence?a-b:b-a).indexOf(s.scores[n])+1,label=n=>ball?s.teamNames[n]:n;
 const rowNames=ball?names:window.KCPlayerRows?.order(names,fence?s.previous?.name:g.current(s),{running:fence?!!s.previous:s.active&&!s.readyToFinish})||names;
 const winner=s.winners.map(label).join(' · '),header=s.finished?(ball&&s.winners.length===2?'🤝 Unentschieden':'🏆 '+winner):s.readyToFinish?'🏁 Alle Durchgänge gespielt':g.icons[key]+' '+g.titles[key];
 let body='';
 if(ball){body='<div class="extra-clock" data-extra-clock="'+s.id+'"><small>'+esc(s.teamNames[g.team(s)]||'Spiel beendet')+' · Spielzeit</small><strong data-extra-time>'+extraClockText(g.remaining(s))+'</strong><span data-extra-clock-status>'+(!s.active?'Beendet':s.timer.running?(g.remaining(s)>0?'Zeit läuft':s.timer.lastThrowUsed?'Letzter Wurf gebucht':'Zeit abgelaufen · Ein letzter Wurf möglich'):s.timer.endsAt?'Pausiert':'Bereit · Zeit in der App starten')+'</span></div><div class="extra-team-grid">'+names.map(n=>'<article class="extra-team-card '+(n===g.team(s)&&s.active?'extra-current':'')+'"><small>'+(n==='T1'?'⚫':'🔴')+' '+esc(label(n))+'</small><strong>'+s.scores[n]+'</strong><span>'+s.participantTeams[n].map(esc).join(' · ')+'</span></article>').join('')+'</div>';
 }else if(key==='guterschnitt'){body='<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Kegler</th>'+s.config.targets.map((n,i)=>'<th>'+(i+1)+'.<br><strong>'+n+'</strong></th>').join('')+'<th>Fortschritt</th><th>Würfe</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowNames.map(n=>'<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+s.config.targets.map((v,i)=>'<td>'+(i<s.scores[n]?'✅':i===s.scores[n]?'🎯':'·')+'</td>').join('')+'<td>'+s.scores[n]+' / '+s.config.targets.length+'</td><td><strong>'+(s.rows[n]||[]).length+'</strong></td></tr>').join('')+'</tbody></table></div><p><strong>Bisher '+names.reduce((sum,n)=>sum+(s.rows[n]||[]).length,0)+' Würfe insgesamt.</strong> Exakte Zahl treffen. Nach einem Fehlzug steigt die Wurfzahl für diese Zahl um eins. Ein Treffer beendet den Zug.</p>';
 }else if(fence){
  const color=[slatColor,s.config.slatColor,'#bc7949'].find(value=>/^#[0-9a-f]{6}$/i.test(value));
  body='<div class="extra-fences"'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+' style="--fence-color:'+color+'">'+rowNames.map(n=>{
   const next=dashboard&&s.active&&!s.finished&&!s.readyToFinish&&n===g.current(s);
   return '<article'+(window.KCPlayerRows?.row(n)||'')+' class="extra-fence-row'+(next?' extra-fence-next-thrower':'')+'"'+(next?' aria-label="'+esc(n)+' · Als Nächstes am Wurf"':'')+'><div class="extra-fence-name"><strong>'+esc(n)+'</strong></div>'+
    '<div class="extra-fence" style="--fence-slats:'+s.config.slats+';--fence-groups:'+Math.ceil(s.config.slats/5)+'" aria-label="'+s.scores[n]+' von '+s.config.slats+' Latten">'+Array.from({length:Math.ceil(s.config.slats/5)},(_,group)=>'<span class="extra-fence-group" aria-hidden="true">'+Array.from({length:Math.min(5,s.config.slats-group*5)},(_,offset)=>'<i class="'+(group*5+offset<s.scores[n]?'filled':'')+'"></i>').join('')+'</span>').join('')+'</div>'+
    '<div class="extra-fence-count"><b>'+s.scores[n]+' / '+s.config.slats+'</b><small>Latten</small></div>'+
    '<div class="extra-fence-price">'+money(s.scores[n]*s.config.slatCents)+'</div></article>';
  }).join('')+'</div><p class="ind-help">'+(s.previous?'':'Erster Wurf legt die Vergleichszahl fest. ')+money(s.config.slatCents)+' je Latte.'+(s.fenceLoser?' Voller Zaun: '+esc(s.fenceLoser)+'. Alle Lattenbeträge wurden gebucht.':'')+'</p>';

 }else{const end=Math.min(s.config.rounds,s.round),begin=Math.max(1,end-4),cols=Array.from({length:end-begin+1},(_,i)=>begin+i);body='<div class="ind-table-scroll"><table class="ind-table extra-score-table"><thead><tr><th>Kegler</th>'+cols.map(n=>'<th>D'+n+'</th>').join('')+'<th>Gesamt</th><th>Platz</th></tr></thead><tbody'+(window.KCPlayerRows?.group(s.gameKey,s)||'')+'>'+rowNames.map(n=>'<tr'+(window.KCPlayerRows?.row(n)||'')+'><th>'+esc(n)+'</th>'+cols.map(r=>{const cell=s.rows[n][r-1];return '<td>'+(cell?'<strong class="'+(cell.result<0?'extra-negative':'')+'">'+(cell.result>0?'+':'')+cell.result+'</strong><small>'+cell.throws.map(t=>t.kind==='kranz'?'K('+t.pins+')':t.kind==='gosse'?'G('+t.pins+')':t.pins).join(' − ')+'</small>':'—')+'</td>';}).join('')+'<td><strong>'+s.scores[n]+'</strong></td><td>'+place(n)+'.</td></tr>').join('')+'</tbody></table></div><p class="ind-help">Durchgang '+Math.min(s.round,s.config.rounds)+' von '+s.config.rounds+' · '+(begin>1?'Die letzten fünf Durchgänge sind sichtbar; die Gesamtsumme enthält alle Ergebnisse.':'Erster Wurf minus zweiter Wurf. Negative Ergebnisse zählen mit. '+(s.config.gutterHigh===undefined?'Diese laufende Partie: Gosse oder Vorbei ergibt Durchgang 0.':'Gosse hoch: '+s.config.gutterHigh+' · Gosse runter: '+s.config.gutterLow+' · Vorbei: 0. Auch mit Gosse wird die Differenz gewertet.'))+'</p>';}
 const context=!s.active?'':ball?esc(s.teamNames[g.team(s)])+' · '+esc(g.current(s)):esc(g.current(s))+(key==='guterschnitt'?' · Ziel '+s.config.targets[s.scores[g.current(s)]]+' · Wurf '+(s.turn.length+1)+' / '+s.attempts[g.current(s)]:key==='bergundtal'?' · Wurf '+(s.turn.length+1)+' / 2':'');
 const title=fence?'<div class="extra-fence-heading"><div><h2>🪵 Lattenzaun</h2><p class="extra-fence-next">'+(s.finished?'🏆 '+esc(winner):s.active?'Nächster Werfer: <strong>'+esc(g.current(s))+'</strong>':'Spiel beendet')+'</p></div><div class="extra-fence-last"><small>Letzter Wurf'+(s.previous?' · '+esc(s.previous.name):'')+'</small><b>'+(s.previous?s.previous.pins+' Holz':'—')+'</b></div></div>':'<h2>'+esc(header)+'</h2>'+(s.active&&!s.readyToFinish?'<div class="ind-turn extra-turn">🎳 '+context+'</div>':'');
 return '<section class="ind-board extra-board" data-extra-game="'+key+'">'+title+controls+body+(s.finished&&!ball?'<p class="extra-result">'+(fence?'Abrechnung nach gesammelten Latten.':key==='guterschnitt'?'Zahlenfolge beendet · 1./2./3. Verlierer nach Fortschritt gebucht.':'Gesamtsumme aller '+s.config.rounds+' Durchgänge · 1./2./3. Verlierer gebucht.')+'</p>':'')+'</section>';
}
function extraClockText(ms){const sec=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
