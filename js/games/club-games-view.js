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
 const current=window.KCClubGames.current(s);
 const names=window.KCPlayerRows?.order(s.players,current,{running:s.active&&!!current,unavailable:n=>s.gameKey==='abschreibung'&&!s.scores[n]})||s.players;
 return '<div class="ind-table-scroll"><table class="ind-table"><thead><tr><th>Kegler</th>'+headers.map(x=>'<th>'+x+'</th>').join('')+
  '</tr></thead><tbody>'+names.map(n=>'<tr'+(s.active&&current===n?' class="club-game-active-row"':'')+'><th>'+clubGameEscape(n)+'</th>'+row(n)+'</tr>').join('')+'</tbody></table></div>';
}
function clubGameImpact(roll,name,before,after,detail){
 const result=roll.kind==='gosse'?'Gosse':roll.kind==='kranz'?'Kranz ('+roll.pins+')':roll.pins+' Holz';
 return '<aside class="club-game-impact" aria-label="Letzter Wurf"><strong>Letzter Wurf · '+clubGameEscape(roll.name)+' · '+result+
  '</strong><span>'+name+': <b>'+before+' → '+after+' Punkte</b></span><small>'+detail+'</small></aside>';
}
function abschreibungBoard(s,order,last){
 const escape=clubGameEscape;
 const rows=order.map((name,i)=>{
  const role=i===0?'thrower':i===order.length-1?'target':'';
  const label=role==='thrower'?'Am Wurf':role==='target'?'Punktabzug bei normalem Wurf':'';
  const points=s.scores[name],percent=Math.round(100*points/s.config.startPoints);
  return '<li class="abschreibung-row'+(role?' is-'+role:'')+'"><span class="abschreibung-name"><strong>'+escape(name)+'</strong>'+
   (label?'<small>'+label+'</small>':'')+'</span><span class="abschreibung-meter" aria-hidden="true"><span style="width:'+percent+'%"></span></span>'+
   '<span class="abschreibung-points"><b>'+points+'</b> Pkt.</span></li>';
 }).join('');
 const eliminated=s.eliminated.length?'<div class="abschreibung-eliminated"><h3>Ausgeschieden</h3>'+
  s.eliminated.map(({name,place})=>'<span><b>'+escape(name)+'</b> · Platz '+place+' · '+
   clubGameMoney(s.bookings.find(b=>b.personName===name)?.amountCents||0)+'</span>').join('')+'</div>':'';
 const rule='Eine geworfene 6 zählt gegen dich. '+(s.config.woodRequired?'Bei einer Gosse wiederholst du den Wurf.':'Eine Gosse kostet dich 9 Punkte.');
 return '<div class="abschreibung-layout"><div><ol class="abschreibung-order" aria-label="Wurfreihenfolge">'+rows+'</ol>'+eliminated+
  '</div><aside class="abschreibung-details">'+(last||'')+'<p>'+rule+'</p></aside></div>';
}
function renderClubGameBoard(s,{controls='',dashboard=false}={}){
 const g=window.KCClubGames,key=s.gameKey,current=g.current(s),escape=clubGameEscape,money=clubGameMoney;
 const last=s.history.findLast(e=>e.action==='throw');
 let phase='',body='',visual='',impact='',turnDetail='';
 if(key==='abschreibung'){
  phase='Runde '+s.round;
  if(last){
   const previous=last.beforePoints??Math.max(0,s.config.startPoints-s.history.slice(0,s.history.lastIndexOf(last))
    .filter(e=>e.action==='throw'&&e.target===last.target).reduce((sum,e)=>sum+e.amount,0));
   const points=s.scores[last.target],change=points-previous;
   const detail=last.kind==='gosse'&&!last.amount?'Gosse · Wurf wiederholen':change+' Punkte';
   impact=clubGameImpact(last,escape(last.target),previous,points,detail);
  }
  if(s.active){
   const order=g.abschreibungOrder(s);
   turnDetail='<span class="abschreibung-target-label">↓ Wurfziel · '+escape(order.at(-1))+'</span>';
   body=abschreibungBoard(s,order,impact);
   impact='';
  }else body=clubGameTable(s,['Punkte','Platz','Strafe'],n=>{
   const place=s.eliminated.find(e=>e.name===n)?.place;
   return '<td><strong>'+s.scores[n]+'</strong></td><td>'+(place??'—')+'</td><td>'+money(s.bookings.find(e=>e.personName===n)?.amountCents||0)+'</td>';
  });
 }else if(key==='lottokoenig'){
  phase=s.phase==='numbers'?'Glückszahlen eingeben':'Wurf '+((s.rows[current]?.length||0)+1)+' / 13';
  if(last){
   const points=s.scores[last.name],row=s.rows[last.name].at(-1);
   impact=clubGameImpact(last,escape(last.name),points-last.pins,points,row.hit?'Glückszahl '+points+' getroffen':'Keine neue Glückszahl');
  }
  body=clubGameTable(s,['Glückszahlen','Treffer','Holz','Würfe'],n=>{
   const ticket=s.tickets[n],score=s.scores[n];
   return '<td><div class="club-lotto-balls">'+(ticket?.numbers.map(v=>'<span class="'+(ticket.hits.includes(v)?'is-hit':'')+'" aria-label="'+v+(ticket.hits.includes(v)?' getroffen':'')+'">'+v+'</span>').join('')||'—')+
    '</div></td><td>'+(ticket?.hits.length||0)+' / 6</td><td>'+score+(score>=49?' <span title="Ziel erreicht">✓</span>':'')+'</td><td>'+s.rows[n].length+' / 13</td>';
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
    (row?'<td>'+row.knocked.length+' / 9</td><td>'+money(s.scores[n])+'</td>':'<td>—</td><td>—</td>');
  });
  body='<div class="club-game-score-layout">'+visual+body+'</div>';visual='';
 }else{
  phase=s.phase==='pairs'?'Runde '+s.round+' · Neue Paare bilden':'Runde '+s.round+' / '+s.config.rounds+' · Wurf '+(s.pairThrows+1)+' / '+s.config.throws;
  const shown=s.active?s.pairs:s.pairRounds.at(-1)?.teams||s.pairs;
  visual=!dashboard&&typeof swingerAppTeams==='function'?swingerAppTeams(s):'<div class="extra-team-grid">'+shown.map((pair,i)=>'<article class="extra-team-card'+(s.active&&s.phase!=='pairs'&&s.index===i?' extra-current':'')+
   '"><small>Team '+(i+1)+(pair.names.length===1?' · Einzelteam':'')+'</small><strong>'+pair.points+' Holz</strong><span>'+pair.names.map(escape).join(' + ')+'</span></article>').join('')+'</div>';
  if(s.active&&s.phase==='pairs'&&!controls)visual+='<p class="club-game-highlight">Neue Partner für '+s.splitPairs.map(t=>t.names.map(escape).join(' + ')).join(' sowie ')+'</p>';
  body=clubGameTable(s,[...s.pairRounds.map(r=>'R'+r.round),'Gesamt'],n=>
   s.pairRounds.map(r=>'<td>'+r.teams.find(t=>t.names.includes(n)).points+'</td>').join('')+'<td><strong>'+s.scores[n]+'</strong></td>');
 }
 return '<section class="ind-board extra-board club-game-board" data-extra-game="'+key+'">'+(s.active?
  key==='swingerclub'&&controls?'':'<div class="ind-turn extra-turn">'+(current?'🎳 '+escape(current)+' · ':'')+phase+turnDetail+'</div>':
  '<p class="club-game-highlight">Spiel beendet'+(key==='swingerclub'&&s.winners.length?' · 🏆 '+s.winners.map(escape).join(' · '):'')+'</p>')+
  controls+visual+body+impact+'<p class="ind-help">'+escape(g.summary(key,s.config))+'</p></section>';
}
