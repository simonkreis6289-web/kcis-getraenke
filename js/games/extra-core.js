/* Zusätzliche Rundenspiele: Beträge in Cent, halbe Punkte bleiben exakt erhalten. */
(() => {
 const keys=['parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend'],titles={poker:'Poker',pfaelzer:'Pfälzerspiel',tausend:'1000 in 9 Würfen',parteienspiel:'Parteienspiel',dreieuro:'3-Euro-Spiel',ebbeflut:'Ebbe und Flut',hochsprung:'Hochsprung'},icons={poker:'🃏',pfaelzer:'🎯',tausend:'🔢',parteienspiel:'⚖️',dreieuro:'💶',ebbeflut:'🌊',hochsprung:'🏅'},clone=x=>JSON.parse(JSON.stringify(x));
 const int=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<=hi;
 function defaults(key){if(classicKeys.includes(key))return classicDefaults(key);return {kranzMode:'fixed',kranzValue:8,...(key==='parteienspiel'?{rounds:5,mode:'fixed',lead:5}:key==='dreieuro'?{throws:5,startCents:300,pinCents:10,penaltyCents:50}:key==='ebbeflut'?{rounds:5}:{targets:[12,14,16,17,18,19,20],missingPinCents:10})};}
 function validSettings(key,c){
  if(classicKeys.includes(key))return classicValid(key,c);
  if(!keys.includes(key)||!c||!['fixed','choose'].includes(c.kranzMode)||!int(c.kranzValue,1,12))return false;
  if(key==='parteienspiel')return int(c.rounds,1,100)&&['fixed','lead'].includes(c.mode)&&int(c.lead,1,10000);
  if(key==='dreieuro')return int(c.throws,1,100)&&int(c.startCents,0,100000)&&int(c.pinCents,0,10000)&&int(c.penaltyCents,0,100000);
  if(key==='ebbeflut')return int(c.rounds,1,100);
  return Array.isArray(c.targets)&&c.targets.length<=7&&c.targets.every(n=>int(n,1,36))&&int(c.missingPinCents,0,10000);
 }
 const classicKeys=['poker','pfaelzer','tausend'];
 function classicDefaults(key){return {kranzMode:'fixed',kranzValue:8,...(key==='poker'?{maxExchange:5,tieThrows:3}:key==='pfaelzer'?{rounds:10,strichCents:0,tieThrows:3}:{rounds:3,target:1000,gutterValue:9})};}
 function classicValid(key,c){return c&&['fixed','choose'].includes(c.kranzMode)&&int(c.kranzValue,key==='tausend'?0:1,key==='tausend'?9:12)&&(key==='poker'?int(c.maxExchange,0,5):key==='pfaelzer'?int(c.rounds,1,50)&&int(c.strichCents,0,10000)&&int(c.tieThrows,1,9):int(c.rounds,1,9)&&int(c.target,1,9999)&&int(c.gutterValue,0,9));}
 function pokerHand(cards){
  const numbers=cards.map(c=>c.pins).filter(n=>n>0),counts=new Map();for(const n of numbers)counts.set(n,(counts.get(n)||0)+1);
  const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),five=groups[0]?.[1]===5,four=groups[0]?.[1]===4,three=groups[0]?.[1]===3,pairs=groups.filter(g=>g[1]===2),sorted=[...counts.keys()].sort((a,b)=>a-b),straight=sorted.length===5&&sorted[4]-sorted[0]===4;
  const level=five?7:straight?6:four?5:three&&pairs.length?4:three?3:pairs.length===2?2:pairs.length===1?1:0,value=straight?sorted[4]:groups[0]?.[0]||0;
  return {level,value,label:['Nichts','Zwilling','Doppelzwilling','Drilling','Full House','Vierling','Straße','Fünfling'][level]};
 }
 function classicSetup(s){
  s.phase=s.gameKey==='poker'?'deal':s.gameKey==='pfaelzer'?'numbers':'throws';s.rankingGroups=[];s.tieRound=0;s.tiePlayers=[];s.tieScores={};s.tieHistory=[];
  if(s.gameKey==='poker'){s.pokerSharedRanks=true;s.pokerSequential=true;s.hands=Object.fromEntries(s.players.map(n=>[n,[]]));s.exchanges={};s.handRanks={};}
  if(s.gameKey==='pfaelzer')s.ownNumbers={};
  if(s.gameKey==='tausend'){s.results=Object.fromEntries(s.players.map(n=>[n,[]]));s.pendingArrange=false;}
 }
 function groupsBy(names,value,ascending=false){const values=[...new Set(names.map(value))].sort((a,b)=>ascending?a-b:b-a);return values.map(v=>names.filter(n=>value(n)===v));}
 function classicFinish(s){
  const noPokerHand=s.gameKey==='poker'&&s.pokerSharedRanks&&s.players.every(n=>s.handRanks[n].level===0);s.winners=noPokerHand?[]:s.rankingGroups[0]||[];s.loserGroups=s.rankingGroups.slice(noPokerHand?0:1).reverse().slice(0,3).map((names,i)=>({rank:i+1,names}));s.phase='finished';
  if(s.gameKey==='pfaelzer')s.bookings=s.players.filter(n=>s.scores[n]*s.config.strichCents>0).map(n=>book(s,n,s.scores[n]*s.config.strichCents,s.scores[n]+' Striche × '+s.config.strichCents+' Cent'));
 }
 function checkClassicTies(s){
  if(s.gameKey==='tausend'||s.gameKey==='poker'&&s.pokerSharedRanks||s.rankingGroups.every(g=>g.length===1)){finish(s);return;}
  s.phase='tiebreak';s.tieRound++;s.tiePlayers=s.rankingGroups.filter(g=>g.length>1).flat();s.tieScores=Object.fromEntries(s.tiePlayers.map(n=>[n,0]));s.index=0;s.turn=[];
 }
 function evaluateClassic(s){
  if(s.gameKey==='poker'){s.handRanks=Object.fromEntries(s.players.map(n=>[n,pokerHand(s.hands[n])]));s.scores=Object.fromEntries(s.players.map(n=>[n,s.handRanks[n].level*100+(s.pokerSharedRanks&&s.handRanks[n].level===0?0:s.handRanks[n].value)]));s.rankingGroups=groupsBy(s.players,n=>s.scores[n]);}
  else s.rankingGroups=groupsBy(s.players,n=>s.gameKey==='tausend'?Math.abs(s.config.target-s.scores[n]):s.scores[n],true);
  checkClassicTies(s);
 }

 function nextPokerRedraw(s){while(s.index<s.players.length&&!s.exchanges[s.players[s.index]].length)s.index++;if(s.index===s.players.length)evaluateClassic(s);}
 function finishThousandTurn(s,order){
  const value=order.reduce((sum,index,i)=>sum+s.turn[index].pins*10**(2-i),0),name=s.players[s.index];s.results[name].push({round:s.round,value,throws:clone(s.turn),order:order.slice()});s.scores[name]+=value;s.turn=[];s.pendingArrange=false;s.index++;
  if(s.index===s.players.length){s.index=0;if(s.round===s.config.rounds)evaluateClassic(s);else s.round++;}
 }
 function classicPlay(s,e){
  const key=s.gameKey,name=e.name;
  if(e.action==='exchange'){
   if(key!=='poker'||s.phase!=='select'||!Array.isArray(e.indices)||e.indices.length>s.config.maxExchange||e.indices.some(n=>!int(n,0,4))||new Set(e.indices).size!==e.indices.length)throw Error('Gültige Tauschpositionen wählen.');
   s.exchanges[name]=e.indices.slice().sort((a,b)=>a-b);if(!s.pokerSequential){s.index++;if(s.index===s.players.length){s.phase='redraw';s.index=0;nextPokerRedraw(s);}}else if(s.exchanges[name].length)s.phase='redraw';else{s.index++;if(s.index===s.players.length)evaluateClassic(s);}return;
  }
  if(e.action==='arrange'){
   if(key!=='tausend'||!s.pendingArrange||!Array.isArray(e.order)||e.order.length!==3||new Set(e.order).size!==3||e.order.some(n=>!int(n,0,2)))throw Error('Alle drei Würfe einmal anordnen.');finishThousandTurn(s,e.order);return;
  }
  if(e.action!=='throw'||s.phase==='select'||s.pendingArrange)throw Error('Zuerst die Auswahl bestätigen.');
  s.rows[name].push({phase:s.phase,pins:e.pins,kind:e.kind});
  if(s.phase==='tiebreak'){
   s.tieScores[name]+=e.pins;s.turn.push(e.pins);e.tieRound=s.tieRound;
   if(s.turn.length===s.config.tieThrows){s.turn=[];s.index++;if(s.index===s.tiePlayers.length){s.tieHistory.push({round:s.tieRound,scores:clone(s.tieScores)});s.rankingGroups=s.rankingGroups.flatMap(group=>group.length===1?[group]:groupsBy(group,n=>s.tieScores[n]));checkClassicTies(s);}}return;
  }
  if(key==='poker'){
   if(s.phase==='deal'){s.hands[name].push({pins:e.pins,kind:e.kind});if(s.hands[name].length===5){s.index++;if(s.index===s.players.length){s.phase='select';s.index=0;}}}
   else{const index=s.exchanges[name][s.turn.length];s.hands[name][index]={pins:e.pins,kind:e.kind};s.turn.push(e.pins);if(s.turn.length===s.exchanges[name].length){s.turn=[];s.index++;if(!s.pokerSequential)nextPokerRedraw(s);else if(s.index===s.players.length)evaluateClassic(s);else s.phase='select';}}return;
  }
  if(key==='pfaelzer'){
   if(s.phase==='numbers'){if(e.pins===0){s.scores[name]++;return;}s.ownNumbers[name]=e.pins;s.index++;if(s.index===s.players.length){s.index=0;s.phase='rounds';}return;}
   const targets=s.players.filter(n=>s.ownNumbers[n]===e.pins);e.struck=e.pins===0||!targets.length?[name]:targets;for(const n of e.struck)s.scores[n]++;s.index++;if(s.index===s.players.length){s.index=0;if(s.round===s.config.rounds)evaluateClassic(s);else s.round++;}return;
  }
  const pins=e.kind==='gosse'?s.config.gutterValue:e.pins;s.turn.push({pins,kind:e.kind});e.scoringPins=pins;if(s.turn.length===3){const mode=(s.round-1)%3;if(mode===0)s.pendingArrange=true;else finishThousandTurn(s,mode===1?[2,1,0]:[0,1,2]);}
 }

 function setup(s,ctx){
  if(classicKeys.includes(s.gameKey)){classicSetup(s);return;}
  if(s.gameKey==='parteienspiel'){
   const groups={T1:s.players.filter(n=>ctx.people.find(p=>p.name===n)?.tisch==='T1'),T2:s.players.filter(n=>ctx.people.find(p=>p.name===n)?.tisch==='T2')};
   if(groups.T1.length+groups.T2.length!==s.players.length||!groups.T1.length||!groups.T2.length)throw Error('Bitte alle Kegler beiden Gruppen zuordnen.');
   s.participantTeams=groups;s.teamNames={T1:ctx.groups?.T1?.name||'Wand',T2:ctx.groups?.T2?.name||'TV'};s.teams=['T1','T2'].map(id=>({id,name:s.teamNames[id],players:groups[id]}));s.scores={T1:0,T2:0};s.roundTotals={T1:0,T2:0};s.roundResults=[];s.partyAlternating=true;s.teamOrder=[s.startTeam,s.startTeam==='T1'?'T2':'T1'];
  }else if(s.gameKey==='dreieuro')s.scores=Object.fromEntries(s.players.map(n=>[n,s.config.startCents]));
  else if(s.gameKey==='ebbeflut')s.tide='normal';
  else if(s.gameKey==='hochsprung'){
   if(!s.config.targets.length)throw Error('Bitte mindestens eine Hürde einstellen.');
   s.jumps=Object.fromEntries(s.players.map(n=>[n,{cleared:0,totalThrows:0,eliminated:false,outAt:null,missing:0,feeCents:0}]));
  }
 }
 function rank(s,lower=false){
  const value=n=>lower?Math.max(0,s.scores[n]):s.scores[n],best=(lower?Math.min:Math.max)(...s.players.map(value));
  s.winners=s.players.filter(n=>value(n)===best);const bad=[...new Set(s.players.map(value).filter(v=>v!==best))].sort((a,b)=>lower?b-a:a-b);
  s.loserGroups=bad.slice(0,3).map((v,i)=>({rank:i+1,names:s.players.filter(n=>value(n)===v)}));
 }
 function book(s,name,cents,detail){return {id:'indcharge_'+s.id+'_finish_'+s.players.indexOf(name),personName:name,amountCents:cents,reason:titles[s.gameKey]+' · '+detail,gameKey:s.gameKey,gameId:s.id,eveningStartedAt:s.eveningStartedAt,onTop:s.onTop===true};}
 function finish(s){
  if(classicKeys.includes(s.gameKey))classicFinish(s);
  else if(s.gameKey==='parteienspiel'){
   const best=Math.max(s.scores.T1,s.scores.T2);s.winners=['T1','T2'].filter(t=>s.scores[t]===best);const losers=['T1','T2'].filter(t=>!s.winners.includes(t));
   s.teamLoserGroups=losers.length?[{rank:1,teamIds:losers}]:[];s.loserGroups=losers.length?[{rank:1,names:losers.flatMap(t=>s.participantTeams[t])}]:[];
  }else if(s.gameKey==='dreieuro'){
   rank(s,true);s.loserGroups=[];s.bookings=s.players.filter(n=>s.scores[n]>0).map(n=>book(s,n,s.scores[n],'Restbetrag nach '+s.config.throws+' Würfen'));
  }else if(s.gameKey==='ebbeflut')rank(s);
  else{
   const survivors=s.players.filter(n=>!s.jumps[n].eliminated);if(survivors.length)s.winners=survivors;
   else{const best=Math.max(...s.players.map(n=>s.jumps[n].cleared)),contenders=s.players.filter(n=>s.jumps[n].cleared===best),fewest=Math.min(...contenders.map(n=>s.jumps[n].totalThrows));s.winners=contenders.filter(n=>s.jumps[n].totalThrows===fewest);}
   const eliminated=s.players.filter(n=>s.jumps[n].eliminated);s.loserGroups=eliminated.length?[{rank:1,names:eliminated}]:[];
   s.bookings=eliminated.filter(n=>s.jumps[n].feeCents>0).map(n=>{const p=s.jumps[n],factor=s.config.targets.length-p.outAt;return book(s,n,p.feeCents,factor+' × '+p.missing+' fehlende Pin × '+s.config.missingPinCents+' Cent');});
  }
  s.active=false;s.finished=true;s.readyToFinish=true;
 }
 function play(s,e){
  const key=s.gameKey;if(classicKeys.includes(key)){classicPlay(s,e);s.history.push(e);return;}if(e.action!=='throw')throw Error('Ungültige Spielaktion.');
  if(key==='hochsprung'){
   const p=s.jumps[e.name],i=s.round-1,target=s.config.targets[i];let cell=s.rows[e.name][i];if(!cell)cell=s.rows[e.name][i]={target,throws:[],pins:0,cleared:false,missing:0,amountCents:0};
   cell.throws.push({pins:e.pins,kind:e.kind});cell.pins+=e.pins;p.totalThrows++;s.turn.push(e.pins);e.hurdle=i;e.target=target;
   if(cell.pins>=target){cell.cleared=true;p.cleared++;s.scores[e.name]=p.cleared;}
   else if(cell.throws.length===3){p.eliminated=true;p.outAt=i;p.missing=target-cell.pins;p.feeCents=(s.config.targets.length-i)*s.config.missingPinCents*p.missing;cell.missing=p.missing;cell.amountCents=p.feeCents;e.eliminated=true;}
   if(cell.cleared||p.eliminated){
    s.turn=[];let next=s.index+1;while(next<s.players.length&&s.jumps[s.players[next]].eliminated)next++;
    if(next<s.players.length)s.index=next;
    else{const active=s.players.filter(n=>!s.jumps[n].eliminated);if(!active.length||s.round===s.config.targets.length)finish(s);else{s.round++;s.index=s.players.findIndex(n=>!s.jumps[n].eliminated);}}
   }
  }else{
   if(key==='parteienspiel'){
    e.team=s.participantTeams.T1.includes(e.name)?'T1':'T2';s.roundTotals[e.team]+=e.pins;s.rows[e.name].push({pins:e.pins,kind:e.kind});
   }else if(key==='dreieuro'){
    const raised=e.kind==='gosse'||e.kind==='pins'&&e.pins===5,delta=raised?s.config.penaltyCents:-e.pins*s.config.pinCents;s.scores[e.name]+=delta;e.deltaCents=delta;s.rows[e.name].push({pins:e.pins,kind:e.kind,deltaCents:delta,balance:s.scores[e.name]});
   }else{
    const physical=e.kind==='pins';e.tideBefore=s.tide;if(physical&&e.pins===7)s.tide='flut';const factor=s.tide==='ebbe'?.5:s.tide==='flut'?2:1,result=e.pins*factor;e.factor=factor;e.result=result;
    s.scores[e.name]+=result;if(physical&&e.pins===3)s.tide='ebbe';else if(physical&&e.pins===5)s.tide='normal';e.tideAfter=s.tide;s.rows[e.name].push({pins:e.pins,kind:e.kind,result,factor});
   }
   s.index++;
   if(s.index===(key==='parteienspiel'&&s.partyAlternating?2*Math.max(s.participantTeams.T1.length,s.participantTeams.T2.length):s.players.length)){
    s.index=0;
    if(key==='parteienspiel'){
     const difference=s.roundTotals.T1-s.roundTotals.T2,winner=difference>0?'T1':difference<0?'T2':'';if(winner)s.scores[winner]+=Math.abs(difference);
     s.roundResults.push({round:s.round,totals:clone(s.roundTotals),winner,points:Math.abs(difference)});s.roundTotals={T1:0,T2:0};
     if(s.round>=s.config.rounds&&(s.config.mode==='fixed'||Math.abs(s.scores.T1-s.scores.T2)>=s.config.lead))finish(s);
    }else if(s.round>=(key==='dreieuro'?s.config.throws:s.config.rounds))finish(s);
    if(!s.finished)s.round++;
   }
  }
  s.history.push(e);
 }
 function summary(key,c){if(key==='poker')return '5 Würfe · bis zu '+c.maxExchange+' tauschen · Blattwertung ohne Stechen · Gleichstand teilt den Verliererrang';if(key==='pfaelzer')return c.rounds+' Runden · '+(c.strichCents/100).toFixed(2)+' € pro Strich · Stechen mit '+c.tieThrows+' Würfen';if(key==='tausend')return c.rounds+' Runden à 3 Würfe · Ziel '+c.target+' · Gosse '+c.gutterValue+' · frei / rechts nach links / links nach rechts';return key==='parteienspiel'?(c.mode==='lead'?'Mindestens '+c.rounds+' Runden · '+c.lead+' Punkte Vorsprung':c.rounds+' Runden')+' · Differenzpunkte je Runde':key==='dreieuro'?c.throws+' Würfe · Start '+(c.startCents/100).toFixed(2)+' € · '+(c.pinCents/100).toFixed(2)+' € pro Pin · +'+(c.penaltyCents/100).toFixed(2)+' € bei 5/Gosse':key==='ebbeflut'?c.rounds+' Runden · Ebbe ×½ · Normal ×1 · Flut ×2':c.targets.length+' Hürden: '+(c.targets.join(' → ')||'keine')+' · je höchstens 3 Würfe · '+(c.missingPinCents/100).toFixed(2)+' € je fehlendem Pin × verbleibende Hürden';}
 window.KCRoundGames=Object.freeze({keys,titles,icons,defaults,validSettings,setup,play,summary,pokerHand});
})();

/* Berg und Tal, Ballermann 6 und Lattenzaun. Zeitpunkte sind absolut, Geldbeträge ganze Cent. */
(() => {
 const KCRoundGames=window.KCRoundGames;
 const keys=['bergundtal','ballermann','lattenzaun','guterschnitt',...window.KCRoundGames.keys],titles={...window.KCRoundGames.titles,bergundtal:'Berg und Tal',ballermann:'Ballermann 6',lattenzaun:'Lattenzaun',guterschnitt:'Der gute Schnitt'},icons={...window.KCRoundGames.icons,bergundtal:'🏔️',ballermann:'🏖️',lattenzaun:'🪵',guterschnitt:'✂️'},clone=x=>JSON.parse(JSON.stringify(x)),norm=x=>String(x).trim().toLocaleLowerCase('de');
 function defaults(key){if(KCRoundGames.keys.includes(key))return KCRoundGames.defaults(key);if(key==='guterschnitt')return {kranzMode:'fixed',kranzValue:8,targets:[3,5,6,7,5,6,4,2,7]};return {kranzMode:'fixed',kranzValue:8,...(key==='bergundtal'?{rounds:4,gutterHigh:0,gutterLow:9}:key==='ballermann'?{seconds:360}:{slats:21,slatCents:10})};}
 function validSettings(key,c){if(KCRoundGames.keys.includes(key))return KCRoundGames.validSettings(key,c);if(key==='guterschnitt')return !!c&&(c.kranzMode===undefined||['target','choose','fixed'].includes(c.kranzMode))&&(c.kranzValue===undefined||Number.isInteger(c.kranzValue)&&c.kranzValue>=1&&c.kranzValue<=12)&&Array.isArray(c.targets)&&c.targets.length>=1&&c.targets.length<=50&&c.targets.every(n=>Number.isInteger(n)&&n>=1&&n<=9);return keys.includes(key)&&!!c&&['fixed','choose'].includes(c.kranzMode)&&Number.isInteger(c.kranzValue)&&c.kranzValue>=1&&c.kranzValue<=12&&(key==='bergundtal'?Number.isInteger(c.rounds)&&c.rounds>=1&&c.rounds<=50&&((c.gutterHigh===undefined&&c.gutterLow===undefined)||[c.gutterHigh,c.gutterLow].every(n=>Number.isInteger(n)&&n>=0&&n<=12)):key==='ballermann'?Number.isInteger(c.seconds)&&c.seconds>=1&&c.seconds<=3600:Number.isInteger(c.slats)&&c.slats>=1&&c.slats<=50&&Number.isInteger(c.slatCents)&&c.slatCents>=0&&c.slatCents<=20);}
 function settings(key,c){return clone(validSettings(key,c)?{...defaults(key),...c}:defaults(key));}
 function empty(gameKey){return {gameKey,id:'',revision:0,active:false,finished:false,readyToFinish:false,players:[],index:0,round:1,turn:[],scores:{},rows:{},history:[],bookings:[],commands:[],receipts:[],winners:[],loserGroups:[],finishPenalties:[],config:defaults(gameKey),startedAt:'',eveningStartedAt:'',previous:null,participantTeams:null,teamNames:null,teamOrder:[],phase:0,teamIndexes:{T1:0,T2:0},timer:{running:false,endsAt:0,remainingMs:0}};}
 function team(s){return s.teamOrder[s.phase]||'';}
 function current(s){if(['poker','pfaelzer'].includes(s.gameKey)&&s.phase==='tiebreak')return s.tiePlayers[s.index]||'';if(s.gameKey==='parteienspiel'&&s.partyAlternating){const side=s.teamOrder[s.index%2],names=s.participantTeams[side],slots=Math.max(s.participantTeams.T1.length,s.participantTeams.T2.length);return names[((s.round-1)*slots+Math.floor(s.index/2))%names.length]||'';}if(s.gameKey==='ballermann'){const t=team(s),names=s.participantTeams?.[t]||[];return names[(s.teamIndexes[t]||0)%names.length]||'';}return s.players[s.index]||'';}
 function remaining(s,now=window.KCSharedClock?.now()??Date.now()){return Math.max(0,s.timer.running?s.timer.endsAt-now:s.timer.remainingMs);}
 function start(req,ctx){
  const names=req.players,active=p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly;
  if(!Array.isArray(names)||names.length<2||names.length>16||names.some(n=>typeof n!=='string'||!n.trim()||!ctx.people.some(p=>p.name===n&&active(p)))||new Set(names.map(norm)).size!==names.length)throw Error('Bitte 2 bis 16 aktive Kegler auswählen.');
  if(!/^indgame_[a-zA-Z0-9_-]{1,100}$/.test(req.gameId||'')||!validSettings(req.gameKey,req.config))throw Error('Spieleinstellungen prüfen.');
  const s=empty(req.gameKey);Object.assign(s,{id:req.gameId,active:true,players:names.slice(),config:clone(req.gameKey==='guterschnitt'?{...defaults(req.gameKey),...req.config}:req.config),gameFineFrozen:true,onTop:req.onTop===true,gameFineOnTop:req.onTop===true,startedAt:ctx.now,eveningStartedAt:ctx.eveningStartedAt,scores:Object.fromEntries(names.map(n=>[n,0])),rows:Object.fromEntries(names.map(n=>[n,[]]))});
  if(req.kranzRule){if(!window.KCKranzPolicy?.valid(req.kranzRule,req.gameKey))throw Error('Ungültige Kranzwertung');s.kranzRule=clone(req.kranzRule);Object.assign(s.config,{kranzMode:req.kranzRule.mode,...(req.kranzRule.mode==='fixed'?{kranzValue:req.kranzRule.value}:{})});}
  if(req.gameKey==='ballermann'){
   const groups={T1:names.filter(n=>ctx.people.find(p=>p.name===n)?.tisch==='T1'),T2:names.filter(n=>ctx.people.find(p=>p.name===n)?.tisch==='T2')};
   if(groups.T1.length+groups.T2.length!==names.length||!groups.T1.length||!groups.T2.length)throw Error('Bitte alle Kegler unter Gruppen zuordnen und beide Seiten besetzen.');
   if(!['T1','T2'].includes(req.startTeam))throw Error('Startmannschaft wählen.');
   s.participantTeams=groups;s.teamNames={T1:ctx.groups?.T1?.name||'Wand',T2:ctx.groups?.T2?.name||'TV'};s.scores={T1:0,T2:0};s.teamOrder=[req.startTeam,req.startTeam==='T1'?'T2':'T1'];s.timer.remainingMs=s.config.seconds*1000;
  }else if(req.starter&&req.gameKey!=='parteienspiel'){const i=names.indexOf(req.starter);if(i<0)throw Error('Startspieler fehlt.');s.players=[...names.slice(i),...names.slice(0,i)];}
  if(req.gameKey==='parteienspiel'){if(req.startTeam!==undefined&&!['T1','T2'].includes(req.startTeam))throw Error('Gültige Startseite wählen.');s.startTeam=req.startTeam||'T1';}
  if(KCRoundGames.keys.includes(req.gameKey))KCRoundGames.setup(s,ctx);
  if(req.gameKey==='guterschnitt')s.attempts=Object.fromEntries(names.map(n=>[n,1]));
  return s;
 }
 function finish(s){
  const fence=s.gameKey==='lattenzaun',names=s.gameKey==='ballermann'?['T1','T2']:s.players,values=names.map(n=>s.scores[n]),best=fence?Math.min(...values):Math.max(...values);
  s.winners=names.filter(n=>s.scores[n]===best);
  const bad=[...new Set(values.filter(v=>v!==best))].sort((a,b)=>fence?b-a:a-b);
  s.loserGroups=bad.slice(0,3).map((value,i)=>({rank:i+1,names:names.filter(n=>s.scores[n]===value)}));
  if(fence)s.bookings=s.players.filter(n=>s.scores[n]*s.config.slatCents>0).map((n,i)=>({id:'indcharge_'+s.id+'_finish_'+i,personName:n,amountCents:s.scores[n]*s.config.slatCents,reason:'Lattenzaun · '+s.scores[n]+' Latten × '+s.config.slatCents+' Cent',gameKey:s.gameKey,gameId:s.id,onTop:false,eveningStartedAt:s.eveningStartedAt}));
  s.active=false;s.finished=true;s.readyToFinish=true;
 }
 function advance(s){s.index++;if(s.index>=s.players.length){s.index=0;s.round++;}}
 function play(s,e){
  if(KCRoundGames.keys.includes(s.gameKey))return KCRoundGames.play(s,e);
  if(e.action==='throw'){
   if(s.gameKey==='guterschnitt'){
    const target=s.config.targets[s.scores[e.name]],hit=['pins','kranz'].includes(e.kind)&&e.pins===target;e.target=target;e.hit=hit;s.turn.push(e.pins);s.rows[e.name].push({pins:e.pins,kind:e.kind,target,hit});
    if(hit){s.scores[e.name]++;s.attempts[e.name]=1;s.turn=[];if(s.scores[e.name]===s.config.targets.length)finish(s);else advance(s);}
    else if(s.turn.length>=s.attempts[e.name]){s.attempts[e.name]++;s.turn=[];advance(s);}
   }else if(s.gameKey==='bergundtal'){
    s.turn.push({pins:e.pins,kind:e.kind});if(s.turn.length===2){const [a,b]=s.turn,result=s.config.gutterHigh===undefined&&(a.pins===0||b.pins===0)?0:a.pins-b.pins;s.rows[e.name].push({throws:clone(s.turn),result});s.scores[e.name]+=result;s.turn=[];advance(s);if(s.round>s.config.rounds)s.readyToFinish=true;}
   }else if(s.gameKey==='lattenzaun'){
    if(s.previous){const delta=Math.abs(e.pins-s.previous.pins),loser=e.pins>s.previous.pins?s.previous.name:e.name;s.scores[loser]=Math.min(s.config.slats,s.scores[loser]+delta);e.slatPerson=loser;e.slatDelta=delta;if(s.scores[loser]>=s.config.slats){s.fenceLoser=loser;finish(s);}}
    s.previous={name:e.name,pins:e.pins};s.rows[e.name].push({pins:e.pins,kind:e.kind});if(!s.finished)advance(s);
   }else{const t=team(s);e.team=t;if(e.afterTime)s.timer.lastThrowUsed=true;s.scores[t]+=e.kind==='kranz'||e.pins>=6?e.pins:0;s.rows[e.name].push({pins:e.pins,kind:e.kind,team:t});s.teamIndexes[t]++;}
  }else if(e.action==='timerStart'||e.action==='resume'){s.timer.running=true;s.timer.endsAt=e.atMs+s.timer.remainingMs;}
  else if(e.action==='pause'){s.timer.remainingMs=Math.max(0,s.timer.endsAt-e.atMs);s.timer.running=false;}
  else if(e.action==='expire'){s.timer={running:false,endsAt:0,remainingMs:0,lastThrowUsed:false};s.phase++;if(s.phase===2)finish(s);else s.timer.remainingMs=s.config.seconds*1000;}
  else throw Error('Ungültige Spielaktion.');s.history.push(e);
 }
 function command(previous,req,ctx){
  if(!keys.includes(req.gameKey)||!/^ind_[a-zA-Z0-9_-]{1,100}$/.test(req.opId||''))throw Error('Ungültige Spielaktion.');
  const before=previous||empty(req.gameKey);if(before.commands.includes(req.opId))return {state:clone(before),repeat:true};
  if(before.revision!==req.expectedRevision)throw Error('Spielstand wurde inzwischen geändert. Bitte Serverstand laden.');
  let s=clone(before);const atMs=Date.parse(ctx.now);if(!Number.isFinite(atMs))throw Error('Ungültiger Zeitpunkt.');
  if(req.action==='start'){if(s.active)throw Error('Laufendes Spiel zuerst abschließen oder abbrechen.');s=start(req,ctx);}
  else{
   if(!s.id||req.gameId!==s.id)throw Error('Das Spiel wurde inzwischen gewechselt.');
   if(req.action==='reset'){s=empty(req.gameKey);s.eveningStartedAt=ctx.eveningStartedAt;}
   else if(req.action==='undo'){
    if(!s.history.length||s.finished&&!['lattenzaun','guterschnitt',...KCRoundGames.keys].includes(s.gameKey))throw Error('Keine Aktion zum Zurücknehmen.');
    const events=s.history.slice(0,-1),base=start({gameKey:s.gameKey,gameId:s.id,players:s.players,config:s.config,kranzRule:s.kranzRule,onTop:s.onTop,startTeam:s.teamOrder[0]},{...ctx,now:s.startedAt,people:s.players.map(name=>({...ctx.people.find(p=>p.name===name),name,present:true,left:false,inactive:false,isDrinksOnly:false,tisch:s.participantTeams?.T1.includes(name)?'T1':s.participantTeams?.T2.includes(name)?'T2':''})),groups:s.teamNames?{T1:{name:s.teamNames.T1},T2:{name:s.teamNames.T2}}:ctx.groups});
    // Vor V225 gestartete Parteien behalten ihre Wurfreihenfolge auch bei Rückgängig.
    if(s.gameKey==='poker'){if(!s.pokerSequential)delete base.pokerSequential;if(!s.pokerSharedRanks)delete base.pokerSharedRanks;}
    if(s.gameKey==='parteienspiel'&&!s.partyAlternating){delete base.partyAlternating;base.teamOrder=[];}
    for(const e of events)play(base,e);s=base;
   }else{
    if(!s.active||s.finished)throw Error('Spiel bereits beendet.');
    if(['poker','tausend'].includes(s.gameKey)&&['exchange','arrange'].includes(req.action)){const e={id:req.opId,action:req.action,name:current(s),at:ctx.now,atMs,...(req.action==='exchange'?{indices:req.indices}:{order:req.order})};play(s,e);}
    else if(req.action==='finish'){if(!s.readyToFinish||s.gameKey!=='bergundtal')throw Error('Zuerst alle Durchgänge spielen.');finish(s);}
    else{
     if(s.readyToFinish||s.history.length>=2000)throw Error('Rundenende oder maximale Spiellänge erreicht.');
     const e={id:req.opId,action:req.action,name:current(s),at:ctx.now,atMs};
     if(req.action==='throw'){
      if(s.gameKey==='ballermann'){
       if(!s.timer.running)throw Error('Spielzeit zuerst starten.');
       if(remaining(s,atMs)<=0){if(s.timer.lastThrowUsed)throw Error('Der letzte Wurf nach Zeitablauf wurde bereits gebucht.');e.afterTime=true;}
      }
      if(!ctx.people.some(p=>p.name===e.name&&p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly))throw Error('Werfer ist nicht mehr aktiv.');
      if(!['pins','gosse','miss','kranz'].includes(req.kind))throw Error('Ungültiger Wurf.');
      const pins=req.kind==='gosse'&&s.gameKey==='bergundtal'&&s.config.gutterHigh!==undefined?(s.turn.length===0?s.config.gutterHigh:s.config.gutterLow):req.kind==='kranz'?(s.kranzRule&&window.KCKranzPolicy?KCKranzPolicy.resolve(s.kranzRule,req.kranzValue,s.config.targets?.[s.scores[current(s)]],s.gameKey):s.gameKey==='guterschnitt'&&s.config.kranzMode==='target'?s.config.targets[s.scores[current(s)]]:s.config.kranzMode==='choose'?req.kranzValue:s.config.kranzValue):['gosse','miss'].includes(req.kind)?0:req.pins;
      if(!Number.isInteger(pins)||pins<0||pins>12||s.gameKey==='tausend'&&req.kind==='kranz'&&pins>9||req.kind==='pins'&&(pins<1||pins>9)||req.kind==='kranz'&&pins<(s.gameKey==='tausend'?0:1))throw Error(s.gameKey==='tausend'?'Gültigen Wurf bzw. Kranzwert (0 bis 9) wählen.':'Gültigen Wurf bzw. Kranzwert (1 bis 12) wählen.');
      Object.assign(e,{kind:req.kind,pins});
     }else{
      if(s.gameKey!=='ballermann'||!['timerStart','resume','pause','expire'].includes(req.action))throw Error('Ungültige Zeitaktion.');
      if(req.action==='expire'){if(!s.timer.running||remaining(s,atMs)>0)throw Error('Die Zeit ist noch nicht abgelaufen.');}
      else if(req.action==='pause'){if(!s.timer.running||remaining(s,atMs)<=0)throw Error('Keine laufende Spielzeit.');}
      else if(s.timer.running||s.timer.remainingMs<=0)throw Error('Spielzeit läuft bereits.');
     }
     play(s,e);
    }
   }
  }
  s.lastActionAt=ctx.now;s.revision=before.revision+1;s.commands=[...before.commands,req.opId].slice(-2048);s.receipts=(before.receipts||[]).slice(-63);return {state:s,repeat:false};
 }
 function effects(before,s,req,ctx){
  const changes=[],added=[],removed=[];
  if(req.action==='throw'){
   const e=s.history.at(-1),type=e.kind==='gosse'?'gosse':e.kind==='kranz'?'kranz':e.kind==='pins'&&e.pins===9?'9er':'';
   if(type){const key=ctx.catalog.find(x=>type==='gosse'?/gosse|pudel/i.test(x.label):/9er|kranz|durchgeworfen/i.test(x.label))?.key;if(!key)throw Error('Strafenart '+type+' fehlt.');const names=type==='gosse'?[e.name]:ctx.people.filter(p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly&&p.name!==e.name).map(p=>p.name);for(const personName of names)changes.push({personName,key,delta:1});e.statId='individual_'+s.id+'_'+e.id;added.push({id:e.statId,individualGameId:s.id,type,thrower:e.name,punished:names,eveningStartedAt:s.eveningStartedAt,eventDate:ctx.now.slice(0,10),createdAt:ctx.now,club:ctx.club});}e.penalties=clone(changes);
  }else if(req.action==='undo'){const e=before.history.at(-1);for(const p of e.penalties||[])changes.push({...p,delta:-p.delta});if(e.statId)removed.push(e.statId);if(before.finished)for(const p of before.finishPenalties||[])changes.push({...p,delta:-p.delta});}
  if(!before.finished&&s.finished&&s.gameKey!=='lattenzaun'){
   for(const group of s.loserGroups){const rank=group.rank;if(s.gameKey==='ballermann'&&rank>1)continue;const key=ctx.catalog.find(x=>new RegExp('^'+rank+'\\.?\\s*verlierer','i').test(String(x.label||'').trim()))?.key;if(!key)throw Error('Strafenart '+rank+'. Verlierer fehlt.');for(const name of group.names)for(const personName of s.gameKey==='ballermann'?s.participantTeams[name]:[name])s.finishPenalties.push({personName,key,delta:1});}
   changes.push(...s.finishPenalties);
  }
  const old=new Set((before.bookings||[]).map(b=>b.id)),next=new Set(s.bookings.map(b=>b.id));return {changes,added,removed,moneyAdded:req.action==='reset'?[]:s.bookings.filter(b=>!old.has(b.id)),moneyRemoved:req.action==='reset'?[]:(before.bookings||[]).filter(b=>!next.has(b.id)).map(b=>b.id)};
 }
 window.KCExtraGames=Object.freeze({keys,titles,icons,defaults,validSettings,settings,empty,current,team,remaining,command,effects});
})();
