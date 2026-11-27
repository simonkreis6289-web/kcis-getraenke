/* Abschlussdokumentation: liest Ergebnisse, bucht selbst keine Strafen. */
(() => {
 const titles={abschreibung:'Abschreibung',lottokoenig:'Lottokönig',tageskurs:'Tageskurs',swingerclub:'Swinger Club',tannenbaum:'Tannenbaum',darts:'Darts',lotterie:'Lotterie',tiberius:'Tiberius',mensch:'Mensch ärgere dich nicht',plusminus:'+ − × ÷',haushoch:'Hohe Hausnummer',haustief:'Niedrige Hausnummer',sichern:'Sichern',fuchsjagd:'Fuchsjagd',tor:'Tor',sechstage:'6-Tage-Rennen',blackjack:'17 + 4 / Blackjack',gluecksspirale:'Glücksspirale',siebener:'7er-Spiel',hindernis:'Hindernislauf',bergundtal:'Berg und Tal',ballermann:'Ballermann 6',lattenzaun:'Lattenzaun',guterschnitt:'Der gute Schnitt',parteienspiel:'Parteienspiel',dreieuro:'3-Euro-Spiel',ebbeflut:'Ebbe und Flut',hochsprung:'Hochsprung',poker:'Poker',pfaelzer:'Pfälzerspiel',tausend:'1000 in 9 Würfen'};
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={abschreibung:'📉',lottokoenig:'🍀',tageskurs:'💶',swingerclub:'🤝',tannenbaum:'🌲',darts:'🎯',lotterie:'🎰',tiberius:'🏛️',mensch:'🎲',plusminus:'➕',haushoch:'🔢',haustief:'🔽',sichern:'🔒',fuchsjagd:'🦊',tor:'⚽',sechstage:'🏁',blackjack:'🃏',gluecksspirale:'🌀',siebener:'🎲',hindernis:'🏃',bergundtal:'🏔️',ballermann:'🏖️',lattenzaun:'🪵',guterschnitt:'✂️',parteienspiel:'⚖️',dreieuro:'💶',ebbeflut:'🌊',hochsprung:'🏅',poker:'🃏',pfaelzer:'🎯',tausend:'🔢',free:'💸'};
 const cents=v=>Math.round((Number(v)||0)*100),money=n=>(n>=0?'+':'')+(n/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 function ordered(history){return (Array.isArray(history)?history:[]).filter(e=>e.type==='game_result'||e.type==='free'||e.type==='teamspiel_strafe'||Object.hasOwn(titles,e.type)).slice().sort((a,b)=>(Date.parse(a.createdAt||a.date)||0)-(Date.parse(b.createdAt||b.date)||0));}
 function number(history,entry){const index=ordered(history).findIndex(e=>e===entry||entry?.id&&e.id===entry.id);return index<0?0:index+1;}
 function gameId(entry){if(entry.gameId)return entry.gameId;const prefix='game_result_'+entry.gameKey+'_';return entry.id?.startsWith(prefix)?entry.id.slice(prefix.length):'';}
 function amounts(entry){
  const rows=new Map();for(const item of entry.amounts||[]){if(!item.name)continue;rows.set(item.name,(rows.get(item.name)||0)+(Number(item.amountCents)||0));}
  if(entry.gameKey==='siebener')for(const [name,value] of Object.entries(entry.scores||{}))if(!rows.has(name))rows.set(name,Number(value)||0);
  return [...rows].sort(([a],[b])=>a.localeCompare(b,'de',{sensitivity:'base'})).map(([name,amountCents])=>({name,amountCents}));
 }
 function freeItems(person,items,ledger,history,evening){
  const entries=ordered(history),rows=items.filter(x=>!x.individualChargeId).map(item=>({amountCents:cents(item.amount),reason:item.reason||'Freier Betrag',key:Object.keys(titles).find(k=>String(item.reason||'').toLocaleLowerCase('de').includes(titles[k].toLocaleLowerCase('de')))||'free',entry:entries.find(e=>e.id&&e.id===item.id)}));
  const grouped=new Map();for(const item of ledger||[]){if(String(item.personName||'').trim().toLocaleLowerCase('de')!==String(person.name||'').trim().toLocaleLowerCase('de')||item.eveningStartedAt!==evening)continue;const key=Object.hasOwn(titles,item.gameKey)?item.gameKey:/^7er/.test(item.reason||'')?'siebener':/^Hindernislauf/.test(item.reason||'')?'hindernis':'free',id=item.gameId||item.id;
   if(!grouped.has(id))grouped.set(id,{amountCents:0,reason:titles[key]||item.reason||'Spielbetrag',key,entry:entries.find(e=>gameId(e)===item.gameId&&!!item.gameId)});grouped.get(id).amountCents+=Number(item.amountCents)||0;
  }
  rows.push(...grouped.values());let fallback=entries.length;
  return rows.map(row=>({...row,number:number(history,row.entry)||++fallback})).sort((a,b)=>a.number-b.number);
 }
 function moneyMarkup(person,items,ledger,history,evening){
  const rows=freeItems(person,items,ledger,history,evening);return rows.length?'<ol class="penalty-free-list">'+rows.map(row=>'<li value="'+row.number+'" title="'+esc(row.reason)+'" aria-label="'+esc(row.number+'. '+row.reason+': '+money(row.amountCents))+'"><span class="penalty-free-item"><span aria-hidden="true">'+(icons[row.key]||icons.free)+'</span><span>'+esc(row.reason)+'</span><strong>'+esc(money(row.amountCents))+'</strong>'+((typeof gameFineOnTop==='function'?gameFineOnTop({...row.entry,gameKey:row.key,reason:row.reason}):false)?'<span title="Zusätzlich zur Strafobergrenze">🔥</span>':'')+'</span></li>').join('')+'</ol>':'';
 }
 const groupName=(groups,k)=>String(groups?.[k]?.name||({T1:'Wand',T2:'TV'}[k])||k);
 function placements(key,s,groups){
  const teamName=k=>groupName(groups,k);
  const teams=Array.isArray(s.teams)?s.teams:[];let ranking=[],winners=[];
  if(teams.length){
   winners=teams.filter(t=>(s.winners||[]).includes(t.id)).map(t=>t.name+' ('+t.players.join(', ')+')');
   ranking=(s.teamLoserGroups||[]).slice(0,3).flatMap((g,i)=>(g.teamIds||[]).map(id=>{const t=teams.find(t=>t.id===id);return {rank:g.rank||i+1,team: t?.name||id,names:t?.players||[]};}));
  }else if(['darts','tor','ballermann'].includes(key)||key==='sichern'&&s.mode==='team'){
   if(key==='ballermann'){winners=(s.winners||[]).map(t=>(s.teamNames?.[t]||teamName(t))+' ('+(s.participantTeams[t]||[]).join(', ')+')');ranking=(s.loserGroups||[]).map(g=>({rank:1,team:s.teamNames?.[g.names[0]]||teamName(g.names[0]),names:(s.participantTeams[g.names[0]]||[]).slice()}));}
   const winner=key==='ballermann'?null:s.winner,other=winner==='T1'?'T2':'T1',map=s.participantTeams||s.teams||{};
   if(winner){winners=[teamName(winner)+' ('+(map[winner]||[]).join(', ')+')'];ranking=[{rank:1,team:teamName(other),names:(map[other]||[]).slice()}];}
  }else if(key==='fuchsjagd'){
   ranking=[{rank:1,names:(s.loserNames||[]).slice()}];winners=(s.winnerNames||[]).slice();
  }else{
   ranking=(s.loserGroups||s.ranking||[]).slice(0,3).map((g,i)=>({rank:g.rank||i+1,names:(g.names||[]).slice()}));
   winners=Array.isArray(s.winners)?s.winners.slice():s.winner?[s.winner]:[];
  }
  return {ranking,winners,teams};
 }
 function build(key,s,{now=new Date().toISOString(),groups={},server=false,catalog=[]}={}){
  if(!s||(!s.finished&&!s.winner))return null;
  const {ranking,winners,teams}=placements(key,s,groups),teamName=k=>groupName(groups,k);
  const counterCharges=(s.finishPenalties||[]).map(x=>({...x}));
  if(key==='blackjack'){const penalty=catalog.find(x=>/^1\.?\s*verlierer/i.test(x.label))?.key||(s.history||[]).find(e=>e.action==='card'&&e.penalties?.length)?.penalties[0]?.key;for(const name of s.players||[]){const e=(s.history||[]).filter(e=>e.action==='card'&&e.name===name).at(-1);if(e?.bustPenalty&&penalty)counterCharges.push({personName:name,key:penalty,delta:1});}}
  const participants=[...new Set([...(s.players||[]),...(s.order||[]),...(s.playerOrder||[]),...teams.flatMap(t=>t.players||[]),...(s.fox?[s.fox]:[]),...(s.hunters||[]),...Object.values(s.participantTeams||{}).flat(),...(!Array.isArray(s.teams)?Object.values(s.teams||{}).filter(Array.isArray).flat():[]),...Object.keys(s.scores||{}).filter(n=>!['T1','T2'].includes(n)&&!teams.some(t=>t.id===n))])].filter(n=>typeof n==='string');
  const winnerNames=teams.length?teams.filter(t=>(s.winners||[]).includes(t.id)).flatMap(t=>t.players):(s.participantTeams||!Array.isArray(s.teams)&&s.teams&&Object.values(s.teams).some(Array.isArray))?Object.entries(s.participantTeams||s.teams).filter(([id])=>id===s.winner||(s.winners||[]).includes(id)).flatMap(([,names])=>names):[...(s.winnerNames||[]),...(s.winners||[]).filter(n=>participants.includes(n)),...(participants.includes(s.winner)?[s.winner]:[])];
  const id=s.resultHistoryId||'game_result_'+key+'_'+(s.id||s.startedAt||now);
  return {id,participants,winnerNames,...(s.stopwatch?.finished?{durationMs:s.stopwatch.elapsedMs}:{}),gameFineFrozen:s.gameFineFrozen===true,gameFineOnTop:s.onTop===true,onTop:s.onTop===true,...(counterCharges.length?{counterCharges}:{}),type:'game_result',gameKey:key,title:titles[key]||key,createdAt:now,serverGameResult:server,gameId:s.id||'',winners,ranking,
   results:['bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend','abschreibung','lottokoenig','tageskurs','swingerclub'].includes(key)?Object.entries(s.scores||{}).map(([name,result])=>({name:['ballermann','parteienspiel'].includes(key)?(s.teamNames?.[name]||teamName(name)):name,result:result+(key==='lattenzaun'?' Latten':' Punkte')})):[],
   ...(['parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend'].includes(key)?{configSnapshot:JSON.parse(JSON.stringify(s.config||{})),...(key==='hochsprung'?{jumpResults:JSON.parse(JSON.stringify(s.jumps||{}))}:{}),results:(key==='hochsprung'?(s.players||[]).map(name=>({name,result:(s.jumps[name]?.cleared||0)+' Hürden · '+(s.jumps[name]?.totalThrows||0)+' Würfe'})):key==='dreieuro'?(s.players||[]).map(name=>({name,result:(Math.max(0,s.scores[name])/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+' Restbetrag'})):Object.entries(s.scores||{}).map(([name,result])=>({name:key==='parteienspiel'?(s.teamNames?.[name]||teamName(name)):name,result:result+' Punkte'})))}:{}),
   ...(['poker','pfaelzer','tausend'].includes(key)?{classicResults:JSON.parse(JSON.stringify({hands:s.hands||{},numbers:s.ownNumbers||{},results:s.results||{},ties:s.tieHistory||[]})),results:(s.players||[]).map(name=>({name,result:key==='poker'?(s.handRanks[name]?.label||'')+' · '+s.hands[name].map(c=>c.pins).join(' / '):key==='pfaelzer'?s.scores[name]+' Striche':s.scores[name]+' Punkte · Abstand '+Math.abs(s.config.target-s.scores[name])}))}:{}),
   ...(['abschreibung','lottokoenig','tageskurs','swingerclub'].includes(key)?{
    configSnapshot:JSON.parse(JSON.stringify(s.config||{})),
    results:(s.players||[]).map(name=>({name,result:key==='tageskurs'?money(s.scores[name]):key==='lottokoenig'?s.scores[name]+' Holz · '+(s.tickets?.[name]?.hits.length||0)+' Treffer':s.scores[name]+' Punkte'}))
   }:{}),
   scores:JSON.parse(JSON.stringify(s.scores||{})),amounts:['siebener','hindernis','lattenzaun','dreieuro','hochsprung','pfaelzer'].includes(key)?(s.players||Object.keys(s.scores||{})).map(name=>({name,amountCents:(s.bookings||[]).filter(b=>b.personName===name).reduce((sum,b)=>sum+b.amountCents,0)})):(s.bookings||[]).map(b=>({name:b.personName,amountCents:b.amountCents,reason:b.reason}))};
 }
 function append(history,key,s,context){
  const list=Array.isArray(history)?history:[],entry=build(key,s,context);if(!entry||list.some(e=>e.id===entry.id))return list;
  return [entry,...list];
 }
 function dashboardRanking(key,game,history,groups){
  if(!game?.finished)return [];
  const resultId=game.resultHistoryId||(game.startedAt?'game_result_'+key+'_'+(game.id||game.startedAt):'');
  const recorded=(history||[]).find(entry=>entry.gameKey===key&&((resultId&&entry.id===resultId)||(game.id&&entry.gameId===game.id)));
  const local=Array.isArray(game.history)?game.history.find(entry=>entry.type===key&&Array.isArray(entry.ranking)):null;
  return (recorded?.ranking||local?.ranking||placements(key,game,groups).ranking)
   .map(entry=>({...entry,rank:Number(entry.rank)})).filter(entry=>[1,2,3].includes(entry.rank)&&(entry.team||entry.names?.length));
 }
 function dashboardMarkup(ranking){
  if(!ranking.length)return '';
  return '<aside class="tv-loser-results" aria-label="Verliererwertung">'+[1,2,3].map(rank=>{
   const entries=ranking.filter(entry=>entry.rank===rank);
   if(!entries.length)return '';
   const names=entries.map(entry=>[entry.team,entry.names?.join(' · ')].filter(Boolean).map(esc).join(' · '));
   return '<div><strong>' + ['🥇','🥈','🥉'][rank-1]+' '+rank+'. Verlierer</strong><span>'+names.join(' / ')+'</span></div>';
  }).join('')+'</aside>';
 }
 function markup(entry,position=0){
  if(entry.type==='teamspiel_strafe')entry={...entry,type:'game_result',title:entry.spieltyp||'Teamspiel',createdAt:entry.date,ranking:[{rank:1,team:entry.teamName||({T1:'Wand',T2:'TV'}[entry.loser])||entry.loser,names:entry.members||[]}]};
  const legacy=['mensch','haushoch','haustief','plusminus'].includes(entry.type);if(entry.type!=='game_result'&&!legacy)return null;
  const ranking=entry.ranking||[],winners=entry.winners||(entry.winner?[entry.winner]:[]),title=entry.title||titles[entry.type]||entry.type;
  const rows=ranking.length?'<div class="game-loser-summary">'+[1,2,3].map(rank=>{const entries=ranking.filter((g,i)=>(g.rank||i+1)===rank);return '<div class="spiel-detail"><strong>'+rank+'. Verlierer:</strong> '+(entries.length?entries.map(g=>(g.team?esc(g.team)+' · ':'')+(g.names||[]).map(esc).join(', ')).join(' · '):'—')+'</div>';}).join('')+'</div>':'';
  const results=(entry.results||[]).map(r=>esc(r.name)+': '+esc(r.number??r.result??'–')).join(' · ');
  const priceRows=amounts(entry),prices=priceRows.length?'<ul class="game-result-amounts">'+priceRows.map(row=>'<li><span>'+esc(row.name)+'</span><span>'+esc(row.reason)+'</span><strong>'+esc(money(row.amountCents))+'</strong></li>').join('')+'</ul>':'';
  return '<div class="spiel-card"'+(position?' id="penalty-result-'+position+'"':'')+'><div class="spiel-info"><div class="spiel-verlierer round">'+(position?position+'. ':'')+(icons[entry.gameKey||entry.type]||'🏁')+' '+esc(title)+' abgeschlossen</div><div class="spiel-detail">'+esc(entry.createdAt?new Date(entry.createdAt).toLocaleString('de-DE'):'')+'</div>'+(winners.length?'<div class="spiel-detail"><strong>Gewinner:</strong> '+winners.map(esc).join(' · ')+'</div>':'')+(entry.gameFineOnTop?'<div class="game-fine-mode">🔥 OnTop · zusätzlich zur Strafobergrenze</div>':'')+prices+rows+(results?'<div class="spiel-detail">'+results+'</div>':'')+(!rows&&!prices?'<div class="spiel-detail">Abschluss dokumentiert · Beträge nach den Spielregeln</div>':'')+'</div></div>';
 }
 window.KCGameResults=Object.freeze({build,append,markup,dashboardRanking,dashboardMarkup,titles,icons,ordered,number,amounts,freeItems,moneyMarkup});
})();
function recordCompletedGame(key,s){
 if(!s||(!s.finished&&!s.winner))return;
 s.resultHistoryId=s.resultHistoryId||'game_result_'+key+'_'+(s.id||s.startedAt||crypto.randomUUID());
 strafenHistory=window.KCGameResults.append(strafenHistory,key,s,{groups:typeof groupSettings==='undefined'?{}:groupSettings});
 if(typeof renderStrafenHistory==='function')renderStrafenHistory();if(typeof renderStrafen==='function')renderStrafen();if(typeof updateStats==='function')updateStats();
}
function applyCompletedGameResults(entries){
 if(!Array.isArray(entries))return;
 strafenHistory=[...entries,...(strafenHistory||[]).filter(e=>!e.serverGameResult&&!entries.some(r=>r.id===e.id))];
}

function removeGameFreeChargeResult(entry){
 if(!entry)return;
 const ids=new Set((entry.assignedTo||[]).map(charge=>charge.id).filter(Boolean));
 for(const person of persons)if(Array.isArray(person.freeStrafen))person.freeStrafen=person.freeStrafen.filter(charge=>!ids.has(charge.id));
 strafenHistory=strafenHistory.filter(result=>result.id!==entry.id);
}
