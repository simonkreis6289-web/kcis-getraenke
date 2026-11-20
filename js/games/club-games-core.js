/* Game rules and replayable events for Abschreibung, Lottokönig, Tageskurs and Swinger Club. */
(() => {
 const titles={abschreibung:'Abschreibung',lottokoenig:'Lottokönig',tageskurs:'Tageskurs',swingerclub:'Swinger Club'};
 const icons={abschreibung:'📉',lottokoenig:'🍀',tageskurs:'💶',swingerclub:'🤝'};
 const keys=Object.keys(titles),pins=Array.from({length:9},(_,i)=>i+1);
 const physical=key=>key==='tageskurs'||key==='swingerclub';
 const int=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
 const selfPins=c=>c.selfPins??[6];
 const defaults=key=>{
  if(key==='abschreibung')return {startPoints:100,lastPlace:4,valuation:'place',placeCents:50,pinCents:10,divisor:1,woodRequired:false,selfPins:[6],kranzMode:'choose',kranzValue:8};
  if(key==='lottokoenig')return {kranzMode:'fixed',kranzValue:8,lottoEarlyStop:true,lottoGoal:'highestOr49'};
  if(key==='tageskurs')return {pinCents:[10,20,30,40,50,60,70,80,90],divisor:2,rounds:1};
  return {rounds:4,throws:4};
 };
 function validSettings(key,c){
  if(!c)return false;
  const kranz=['choose','fixed'].includes(c.kranzMode)&&int(c.kranzValue,1,12);
  if(key==='abschreibung')return kranz&&int(c.startPoints,1,300)&&int(c.lastPlace,2,16)&&int(c.placeCents,0,10000)&&typeof c.woodRequired==='boolean'&&
   (c.valuation===undefined||['place','pins'].includes(c.valuation))&&
   (c.pinCents===undefined?c.valuation!=='pins':int(c.pinCents,0,10000))&&
   (c.divisor===undefined?c.valuation!=='pins':Number.isFinite(c.divisor)&&c.divisor>=1)&&
   (c.selfPins===undefined||Array.isArray(c.selfPins)&&c.selfPins.length<=pins.length&&
    new Set(c.selfPins).size===c.selfPins.length&&c.selfPins.every(n=>pins.includes(n)));
  if(key==='lottokoenig')return kranz&&(c.lottoEarlyStop===undefined||typeof c.lottoEarlyStop==='boolean')&&
   (c.lottoGoal===undefined||['highestOr49','49'].includes(c.lottoGoal));
  if(key==='tageskurs')return Array.isArray(c.pinCents)&&c.pinCents.length===9&&pins.every(n=>int(c.pinCents[n-1],0,10000))&&int(c.divisor,1,100)&&int(c.rounds===undefined?1:c.rounds,1,12);
  return int(c.rounds,1,12)&&int(c.throws,1,12);
 }
 const allNames=(teams)=>teams.flatMap(t=>t.names);
 function pairs(s,teams){
  if(!Array.isArray(teams)||teams.length!==Math.ceil(s.players.length/2)||
     teams.some(t=>!Array.isArray(t?.names)||![1,2].includes(t.names.length))||
     teams.filter(t=>t.names.length===1).length!==s.players.length%2)
   throw Error('Bitte Zweierteams bilden. Bei ungerader Spielerzahl gibt es genau ein Einzelteam.');
  const names=allNames(teams);
  if(new Set(names).size!==s.players.length||s.players.some(n=>!names.includes(n)))throw Error('Jeden Kegler genau einmal zuordnen.');
  return teams.map(t=>({names:t.names.slice(),points:0}));
 }
 function setup(s,req){
  switch(s.gameKey){
   case 'abschreibung':
    for(const name of s.players)s.scores[name]=s.config.startPoints;
    s.eliminated=[];
    s.lastPlace=Math.min(s.players.length,s.config.lastPlace);
    break;
   case 'lottokoenig':s.phase='numbers';s.tickets={};break;
   case 'tageskurs':break;
   case 'swingerclub':
    if(s.players.length<3)throw Error('Mindestens drei Kegler sind nötig.');
    s.startPairs=pairs(s,req.pairs||Array.from({length:Math.ceil(s.players.length/2)},(_,i)=>({names:s.players.slice(i*2,i*2+2)}))).map(t=>({names:t.names}));
    s.pairs=pairs(s,s.startPairs);s.standing=pins.slice();s.pairThrows=0;s.throwerOffset=0;s.pairRounds=[];
    break;
  }
 }
 function current(s){
  if(s.gameKey==='swingerclub'){
   const names=s.pairs?.[s.index]?.names;
   return s.phase==='pairs'||!names?'':names[(s.pairThrows+s.throwerOffset)%names.length];
  }
  return s.players[s.index]||'';
 }
 function validTicket(numbers){
  return Array.isArray(numbers)&&numbers.length===6&&numbers.every(n=>int(n,0,49))&&new Set(numbers).size===6&&new Set(numbers.map(n=>Math.floor(n/10))).size===5;
 }
 function randomTicket(random=Math.random){
  const numbers=Array.from({length:5},(_,block)=>block*10+Math.floor(random()*10));
  const block=Math.floor(random()*5),extra=block*10+Math.floor(random()*9);
  numbers.push(extra+(extra>=numbers[block]?1:0));
  return numbers.sort((a,b)=>a-b);
 }
 function fields(s,req){
  if(req.action==='numbers'&&s.gameKey==='lottokoenig'&&s.phase==='numbers'){
   if(!validTicket(req.numbers))throw Error('Sechs verschiedene Zahlen von 0 bis 49 wählen, mindestens eine je Zehnerblock.');
   return {numbers:req.numbers.slice().sort((a,b)=>a-b)};
  }
  if(req.action==='randomNumbers'&&s.gameKey==='lottokoenig'&&s.phase==='numbers'){
   const tickets=req.tickets;
   if(!Array.isArray(tickets)||tickets.length!==s.players.length||!Array.from(tickets).every(ticket=>validTicket(ticket?.numbers)))
    throw Error('Für jeden Tippschein werden sechs gültige Zielzahlen benötigt.');
   return {tickets:tickets.map(({numbers})=>({numbers:numbers.slice().sort((a,b)=>a-b)}))};
  }
  if(req.action==='pairs'&&s.gameKey==='swingerclub'&&s.phase==='pairs'){
   const next=pairs(s,req.pairs);
   if(next.some(t=>s.splitPairs.some(old=>old.names.length===t.names.length&&old.names.every(n=>t.names.includes(n)))))throw Error('Bestes und schwächstes Paar brauchen neue Partner.');
   return {pairs:next.map(t=>({names:t.names}))};
  }
  if(s.phase==='numbers'||s.phase==='pairs')throw Error('Zuerst die Vorbereitung abschließen.');
  if(req.action==='next')return {};
  if(req.action!=='throw')throw Error('Ungültige Spielaktion.');
  if(!physical(s.gameKey))return null;
  const board=s.gameKey==='swingerclub'?s.standing:pins;
  if(req.kind==='gosse')return {kind:'gosse',pins:0,knocked:[]};
  if(s.gameKey==='tageskurs'&&req.kind==='kranz')return {kind:'kranz',pins:pins.length,knocked:pins.slice()};
  if(req.kind!=='pins'||!Array.isArray(req.knocked)||!req.knocked.length||
     new Set(req.knocked).size!==req.knocked.length||req.knocked.some(n=>!board.includes(n)))throw Error('Bitte die gefallenen Kegel markieren oder Gosse wählen.');
  return {kind:'pins',pins:req.knocked.length,knocked:board.filter(n=>req.knocked.includes(n))};
 }
 function charge(s,name,cents,detail,roundSuffix=''){
  if(cents===0)return;
  s.bookings.push({id:'indcharge_'+s.id+'_finish_'+s.players.indexOf(name)+roundSuffix,personName:name,amountCents:cents,
   reason:titles[s.gameKey]+' · '+detail,gameKey:s.gameKey,gameId:s.id,eveningStartedAt:s.eveningStartedAt,onTop:s.onTop===true});
 }
 function finish(s){s.active=false;s.finished=true;s.readyToFinish=true;}
 function advance(s,eligible){
  do{
   s.index=(s.index+1)%s.players.length;
   if(s.index===0)s.round++;
  }while(eligible&&!eligible(s.players[s.index]));
 }
 function next(s){
  if(s.gameKey==='abschreibung')advance(s,name=>s.scores[name]>0);
  else if(s.gameKey==='swingerclub'){
   if(s.pairs[s.index].names.length===1)throw Error('Das Einzelteam hat keinen zweiten Werfer.');
   s.throwerOffset=1-s.throwerOffset;
  }
  else{
   const nextIndex=s.players.findIndex((name,index)=>index>s.index&&
    (s.gameKey!=='lottokoenig'||!s.config.lottoEarlyStop||!lottoDone(s,name)));
   if(nextIndex<0)throw Error('Den letzten Pflichtwurf der Runde zuerst abschließen.');
   if(!s.originalPlayerOrder)s.originalPlayerOrder=s.players.slice();
   [s.players[s.index],s.players[nextIndex]]=[s.players[nextIndex],s.players[s.index]];
  }
 }
 function settleRanks(s,value,winner){
  const sorted=[...new Set(s.players.map(value))].sort((a,b)=>a-b);
  const best=sorted.at(-1);
  s.winners=s.players.filter(n=>value(n)===best&&winner(n));
  const groups=sorted.filter(v=>v!==best||!s.winners.length);
  s.loserGroups=groups.slice(0,3).map((v,i)=>({rank:i+1,names:s.players.filter(n=>value(n)===v)}));
  finish(s);
 }
 function abschreibungOrder(s){
  return [...s.players.slice(s.index),...s.players.slice(0,s.index)].filter(name=>s.scores[name]>0);
 }
 function abschreibung(s,e){
  const self=e.kind==='gosse'||e.kind==='pins'&&selfPins(s.config).includes(e.pins);
  const name=self?e.name:abschreibungOrder(s).at(-1),amount=e.kind==='gosse'?(s.config.woodRequired?0:9):e.pins;
  e.target=name;e.amount=amount;e.beforePoints=s.scores[name];
  s.rows[e.name].push({amount,target:name,kind:e.kind});
  if(e.kind==='gosse'&&s.config.woodRequired)return;
  s.scores[name]=Math.max(0,s.scores[name]-amount);
  if(!s.scores[name]){
   const place=s.players.length-s.eliminated.length;
   s.eliminated.push({name,place});
   const {valuation,placeCents,pinCents,divisor}=s.config;
   if(valuation==='pins'){
    const highest=Math.max(...s.players.map(player=>s.scores[player]));
    charge(s,name,Math.round(highest*pinCents/divisor),highest+' Restpunkte × '+pinCents+' Cent ÷ '+divisor);
   }else charge(s,name,placeCents*place,'Platz '+place+' × '+placeCents+' Cent');
   if(place===s.lastPlace){s.winners=s.players.filter(n=>s.scores[n]>0);finish(s);return;}
  }
  advance(s,n=>s.scores[n]>0);
 }
 function lottoQualified(s,name){
  const ticket=s.tickets[name];
  return s.scores[name]>=49||!!(s.config.lottoEarlyStop&&s.config.lottoGoal!=='49'&&ticket?.hits.includes(ticket.numbers.at(-1)));
 }
 function lottoDone(s,name){
  return s.rows[name].length>=13||lottoQualified(s,name);
 }
 function lottoRank(s,n){
  const hits=s.tickets[n].hits.length;
  if(s.config.lottoEarlyStop)return (lottoQualified(s,n)?1000:0)+hits*16+13-s.rows[n].length;
  return lottoQualified(s,n)?1000+hits:hits*50+s.scores[n];
 }
 function lottokoenig(s,e){
  if(e.action==='numbers'){
   s.tickets[e.name]={numbers:e.numbers,hits:[]};
   s.index=(s.index+1)%s.players.length;
   if(s.index===0)s.phase='throw';
   return;
  }
  if(e.action==='randomNumbers'){
   e.tickets.forEach(({numbers},offset)=>{
    s.tickets[s.players[offset]]={numbers,hits:[]};
   });
   s.index=0;
   s.phase='throw';
   return;
  }
  s.scores[e.name]+=e.pins;
  const ticket=s.tickets[e.name],score=s.scores[e.name],hit=ticket.numbers.includes(score)&&!ticket.hits.includes(score);
  if(hit)ticket.hits.push(score);
  s.rows[e.name].push({pins:e.pins,score,hit});
  if(s.config.lottoEarlyStop){
   if(s.players.every(name=>lottoDone(s,name)))settleRanks(s,n=>lottoRank(s,n),n=>lottoQualified(s,n));
   else advance(s,name=>!lottoDone(s,name));
  }else{
   advance(s);
   if(s.round>13){s.round=13;settleRanks(s,n=>lottoRank(s,n),n=>lottoQualified(s,n));}
  }
 }
 function tageskurs(s,e){
  const standing=pins.filter(n=>!e.knocked.includes(n));
  const sum=standing.reduce((total,n)=>total+s.config.pinCents[n-1],0),amount=Math.round(sum/s.config.divisor);
  const rounds=s.config.rounds??1;
  s.rows[e.name].push({knocked:e.knocked,cents:amount});
  s.scores[e.name]+=amount;
  const detail=(rounds>1?'Runde '+s.round+' · ':'')+'Stehen gebliebene Kegel · '+sum+' Cent ÷ '+s.config.divisor;
  // Keep round one's booking ID so undo can still find bookings saved by older versions.
  charge(s,e.name,amount,detail,s.round>1?'_r'+s.round:'');
  advance(s);
  if(s.round>rounds){s.round=rounds;finish(s);}
 }
 function swingerclub(s,e){
  if(e.action==='pairs'){
   s.pairs=pairs(s,e.pairs);s.phase='throw';s.index=0;
   return;
  }
  const team=s.pairs[s.index];
  team.points+=e.pins;s.pairThrows++;s.standing=s.standing.filter(n=>!e.knocked.includes(n));
  if(!s.standing.length)s.standing=pins.slice();
  s.rows[e.name].push({pins:e.pins,round:s.round});
  if(s.pairThrows<s.config.throws)return;
  for(const name of team.names)s.scores[name]+=team.points;
  s.pairThrows=0;s.throwerOffset=0;s.standing=pins.slice();
  if(++s.index<s.pairs.length)return;
  s.pairRounds.push({round:s.round,teams:s.pairs});
  s.index=0;
  if(s.round===s.config.rounds){settleRanks(s,n=>s.scores[n],()=>true);return;}
  const ranked=s.pairs.slice().sort((a,b)=>a.points-b.points);
  s.splitPairs=[ranked[0],ranked.at(-1)];s.phase='pairs';s.round++;
 }
 function play(s,e){
  if(e.action==='next')next(s);
  else ({abschreibung,lottokoenig,tageskurs,swingerclub})[s.gameKey](s,e);
  s.history.push(e);
 }
 function summary(key,c){
  if(key==='abschreibung'){
   const valuation=c.valuation==='pins'?'Höchste Restpunkte × '+c.pinCents+' Cent ÷ '+c.divisor:c.placeCents+' Cent × Platz';
   return c.startPoints+' Startpunkte · '+valuation+' · bis Platz '+c.lastPlace+' · '+(c.woodRequired?'mit Holzpflicht':'ohne Holzpflicht');
  }
  if(key==='lottokoenig')return 'Sechs Glückszahlen · '+(c.lottoEarlyStop?'bis zu ':'')+'13 Würfe · '+
   (c.lottoEarlyStop&&c.lottoGoal!=='49'?'höchste Glückszahl treffen oder mindestens 49 Holz':'mindestens 49 Holz');
  if(key==='tageskurs')return ((c.rounds??1)===1?'1 Runde':c.rounds+' Runden')+' · 1 Wurf pro Person und Runde · Summe der stehenden Kegel ÷ '+c.divisor;
  return c.rounds+' Runden · '+c.throws+' Würfe auf Abräumen je Zweierteam · Partnerwechsel nach jeder Runde';
 }
 window.KCClubGames=Object.freeze({titles,icons,keys,pins,physical,defaults,validSettings,selfPins,setup,current,fields,play,summary,validTicket,randomTicket,abschreibungOrder,lottoQualified,lottoDone});
})();
