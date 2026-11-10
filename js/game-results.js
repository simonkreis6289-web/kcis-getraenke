/* Abschlussdokumentation: liest Ergebnisse, bucht selbst keine Strafen. */
(() => {
 const titles={tannenbaum:'Tannenbaum',darts:'Darts',lotterie:'Lotterie',tiberius:'Tiberius',mensch:'Mensch ärgere dich nicht',plusminus:'+ − × ÷',haushoch:'Hohe Hausnummer',haustief:'Niedrige Hausnummer',sichern:'Sichern',fuchsjagd:'Fuchsjagd',tor:'Tor',sechstage:'6-Tage-Rennen',blackjack:'17 + 4 / Blackjack',gluecksspirale:'Glücksspirale',siebener:'7er-Spiel',hindernis:'Hindernislauf'};
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function build(key,s,{now=new Date().toISOString(),groups={},server=false}={}){
  if(!s||(!s.finished&&!s.winner))return null;
  const teamName=k=>String(groups[k]?.name||({T1:'Wand',T2:'TV'}[k])||k);
  const teams=Array.isArray(s.teams)?s.teams:[];let ranking=[],winners=[];
  if(teams.length){
   winners=teams.filter(t=>(s.winners||[]).includes(t.id)).map(t=>t.name+' ('+t.players.join(', ')+')');
   ranking=(s.teamLoserGroups||[]).slice(0,3).flatMap((g,i)=>g.teamIds.map(id=>{const t=teams.find(t=>t.id===id);return {rank:i+1,team: t?.name||id,names:t?.players||[]};}));
  }else if(['darts','tor'].includes(key)||key==='sichern'&&s.mode==='team'){
   const winner=s.winner,other=winner==='T1'?'T2':'T1',map=s.participantTeams||s.teams||{};
   if(winner){winners=[teamName(winner)+' ('+(map[winner]||[]).join(', ')+')'];ranking=[{rank:1,team:teamName(other),names:(map[other]||[]).slice()}];}
  }else if(key==='fuchsjagd'){
   ranking=[{rank:1,names:(s.loserNames||[]).slice()}];winners=(s.winnerNames||[]).slice();
  }else{
   ranking=(s.loserGroups||s.ranking||[]).slice(0,3).map((g,i)=>({rank:g.rank||i+1,names:(g.names||[]).slice()}));
   winners=Array.isArray(s.winners)?s.winners.slice():s.winner?[s.winner]:[];
  }
  const id=s.resultHistoryId||'game_result_'+key+'_'+(s.id||s.startedAt||now);
  return {id,type:'game_result',gameKey:key,title:titles[key]||key,createdAt:now,serverGameResult:server,winners,ranking,
   scores:JSON.parse(JSON.stringify(s.scores||{})),amounts:(s.bookings||[]).map(b=>({name:b.personName,amountCents:b.amountCents,reason:b.reason}))};
 }
 function append(history,key,s,context){
  const list=Array.isArray(history)?history:[],entry=build(key,s,context);if(!entry||list.some(e=>e.id===entry.id))return list;
  return [entry,...list];
 }
 function markup(entry){
  if(entry.type==='teamspiel_strafe')entry={...entry,type:'game_result',title:entry.spieltyp||'Teamspiel',createdAt:entry.date,ranking:[{rank:1,team:entry.teamName||({T1:'Wand',T2:'TV'}[entry.loser])||entry.loser,names:entry.members||[]}]};
  const legacy=['mensch','haushoch','haustief','plusminus'].includes(entry.type);if(entry.type!=='game_result'&&!legacy)return null;
  const ranking=entry.ranking||[],winners=entry.winners||(entry.winner?[entry.winner]:[]),title=entry.title||titles[entry.type]||entry.type;
  const rows=ranking.slice(0,3).map((g,i)=>'<div class="spiel-detail"><strong>'+(g.rank||i+1)+'. Verlierer:</strong> '+(g.team?esc(g.team)+' · ':'')+(g.names||[]).map(esc).join(', ')+'</div>').join('');
  const results=(entry.results||[]).map(r=>esc(r.name)+': '+esc(r.number??r.result??'–')).join(' · ');
  return '<div class="spiel-card"><div class="spiel-info"><div class="spiel-verlierer round">🏁 '+esc(title)+' abgeschlossen</div><div class="spiel-detail">'+esc(entry.createdAt?new Date(entry.createdAt).toLocaleString('de-DE'):'')+'</div>'+(winners.length?'<div class="spiel-detail"><strong>Gewinner:</strong> '+winners.map(esc).join(' · ')+'</div>':'')+rows+(results?'<div class="spiel-detail">'+results+'</div>':'')+(!rows?'<div class="spiel-detail">Abschluss dokumentiert · Beträge nach den Spielregeln</div>':'')+'</div></div>';
 }
 window.KCGameResults=Object.freeze({build,append,markup,titles});
})();
function recordCompletedGame(key,s){
 if(!s||(!s.finished&&!s.winner))return;
 s.resultHistoryId=s.resultHistoryId||'game_result_'+key+'_'+(s.id||s.startedAt||crypto.randomUUID());
 strafenHistory=window.KCGameResults.append(strafenHistory,key,s,{groups:typeof groupSettings==='undefined'?{}:groupSettings});
}
function applyCompletedGameResults(entries){
 if(!Array.isArray(entries))return;
 strafenHistory=[...entries,...(strafenHistory||[]).filter(e=>!e.serverGameResult&&!entries.some(r=>r.id===e.id))];
}
