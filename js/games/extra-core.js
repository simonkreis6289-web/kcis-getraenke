/* Berg und Tal, Ballermann 6 und Lattenzaun. Zeitpunkte sind absolut, Geldbeträge ganze Cent. */
(() => {
 const keys=['bergundtal','ballermann','lattenzaun','guterschnitt'],titles={bergundtal:'Berg und Tal',ballermann:'Ballermann 6',lattenzaun:'Lattenzaun',guterschnitt:'Der gute Schnitt'},icons={bergundtal:'🏔️',ballermann:'🏖️',lattenzaun:'🪵',guterschnitt:'✂️'},clone=x=>JSON.parse(JSON.stringify(x)),norm=x=>String(x).trim().toLocaleLowerCase('de');
 function defaults(key){if(key==='guterschnitt')return {kranzMode:'fixed',kranzValue:8,targets:[3,5,6,7,5,6,4,2,7]};return {kranzMode:'fixed',kranzValue:8,...(key==='bergundtal'?{rounds:4,gutterHigh:0,gutterLow:9}:key==='ballermann'?{seconds:360}:{slats:21,slatCents:10})};}
 function validSettings(key,c){if(key==='guterschnitt')return !!c&&(c.kranzMode===undefined||['target','choose','fixed'].includes(c.kranzMode))&&(c.kranzValue===undefined||Number.isInteger(c.kranzValue)&&c.kranzValue>=1&&c.kranzValue<=12)&&Array.isArray(c.targets)&&c.targets.length>=1&&c.targets.length<=50&&c.targets.every(n=>Number.isInteger(n)&&n>=1&&n<=9);return keys.includes(key)&&!!c&&['fixed','choose'].includes(c.kranzMode)&&Number.isInteger(c.kranzValue)&&c.kranzValue>=1&&c.kranzValue<=12&&(key==='bergundtal'?Number.isInteger(c.rounds)&&c.rounds>=1&&c.rounds<=50&&((c.gutterHigh===undefined&&c.gutterLow===undefined)||[c.gutterHigh,c.gutterLow].every(n=>Number.isInteger(n)&&n>=0&&n<=12)):key==='ballermann'?Number.isInteger(c.seconds)&&c.seconds>=1&&c.seconds<=3600:Number.isInteger(c.slats)&&c.slats>=1&&c.slats<=50&&Number.isInteger(c.slatCents)&&c.slatCents>=0&&c.slatCents<=20);}
 function settings(key,c){return clone(validSettings(key,c)?{...defaults(key),...c}:defaults(key));}
 function empty(gameKey){return {gameKey,id:'',revision:0,active:false,finished:false,readyToFinish:false,players:[],index:0,round:1,turn:[],scores:{},rows:{},history:[],bookings:[],commands:[],receipts:[],winners:[],loserGroups:[],finishPenalties:[],config:defaults(gameKey),startedAt:'',eveningStartedAt:'',previous:null,participantTeams:null,teamNames:null,teamOrder:[],phase:0,teamIndexes:{T1:0,T2:0},timer:{running:false,endsAt:0,remainingMs:0}};}
 function team(s){return s.teamOrder[s.phase]||'';}
 function current(s){if(s.gameKey==='ballermann'){const t=team(s),names=s.participantTeams?.[t]||[];return names[(s.teamIndexes[t]||0)%names.length]||'';}return s.players[s.index]||'';}
 function remaining(s,now=Date.now()){return Math.max(0,s.timer.running?s.timer.endsAt-now:s.timer.remainingMs);}
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
  }else if(req.starter){const i=names.indexOf(req.starter);if(i<0)throw Error('Startspieler fehlt.');s.players=[...names.slice(i),...names.slice(0,i)];}
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
    if(!s.history.length||s.finished&&!['lattenzaun','guterschnitt'].includes(s.gameKey))throw Error('Keine Aktion zum Zurücknehmen.');
    const events=s.history.slice(0,-1),base=start({gameKey:s.gameKey,gameId:s.id,players:s.players,config:s.config,kranzRule:s.kranzRule,onTop:s.onTop,startTeam:s.teamOrder[0]},{...ctx,now:s.startedAt,people:s.players.map(name=>({...ctx.people.find(p=>p.name===name),name,present:true,left:false,inactive:false,isDrinksOnly:false,tisch:s.participantTeams?.T1.includes(name)?'T1':s.participantTeams?.T2.includes(name)?'T2':''})),groups:s.teamNames?{T1:{name:s.teamNames.T1},T2:{name:s.teamNames.T2}}:ctx.groups});
    for(const e of events)play(base,e);s=base;
   }else{
    if(!s.active||s.finished)throw Error('Spiel bereits beendet.');
    if(req.action==='finish'){if(!s.readyToFinish||s.gameKey!=='bergundtal')throw Error('Zuerst alle Durchgänge spielen.');finish(s);}
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
      const pins=req.kind==='gosse'&&s.gameKey==='bergundtal'&&s.config.gutterHigh!==undefined?(s.turn.length===0?s.config.gutterHigh:s.config.gutterLow):req.kind==='kranz'?(s.kranzRule&&window.KCKranzPolicy?KCKranzPolicy.resolve(s.kranzRule,req.kranzValue,s.config.targets?.[s.scores[current(s)]]):s.gameKey==='guterschnitt'&&s.config.kranzMode==='target'?s.config.targets[s.scores[current(s)]]:s.config.kranzMode==='choose'?req.kranzValue:s.config.kranzValue):['gosse','miss'].includes(req.kind)?0:req.pins;
      if(!Number.isInteger(pins)||pins<0||pins>12||req.kind==='pins'&&(pins<1||pins>9)||req.kind==='kranz'&&pins<1)throw Error('Gültigen Wurf bzw. Kranzwert (1 bis 12) wählen.');
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
  s.revision=before.revision+1;s.commands=[...before.commands,req.opId].slice(-2048);s.receipts=(before.receipts||[]).slice(-63);return {state:s,repeat:false};
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
