/* Einzelspiele: 7er-Spiel und Hindernislauf. Alle Geldbeträge werden in Cent geführt. */
(() => {
 const clone=x=>JSON.parse(JSON.stringify(x)),keys=['siebener','hindernis'],columns=[14,21,28,35,42,49],norm=n=>String(n).trim().toLocaleLowerCase('de-DE');
 const specs=[['start',0,0,'start',0],['pause',5,5,'skip',1],['pay11',11,11,'pay',20],['minus',17,17,'subtract',0],['reset19',19,19,'reset',0],['leader',28,28,'leader',0],['pay35',35,35,'pay',20],['back43',43,43,'move',20],['forward47',47,47,'move',66],['double',50,50,'double',0],['pay54',54,54,'pay',20],['pay60',60,65,'pay',20],['back69',69,69,'move',59],['others',70,70,'others',8],['forward77',77,77,'move',84],['back83',83,83,'move',66],['choice',89,89,'choice',100]];
 function ruleLabel(r){return r.kind==='start'?'Fehlstart – zurück auf 0':r.kind==='skip'?'Einmal aussetzen':r.kind==='pay'?(r.value<100?r.value+' Cent':(r.value/100).toFixed(2).replace('.',',')+' €')+' in die Kasse':r.kind==='subtract'?'Nächsten Wurf abziehen · Gosse = 9':r.kind==='reset'?'Von vorn bei 0 beginnen':r.kind==='leader'?'Zum Führenden aufschließen minus 1':r.kind==='move'?'Versetzen auf '+r.value+' Punkte':r.kind==='double'?'Zusatzwurf – zählt doppelt':r.kind==='others'?'Alle anderen verlieren 8 Punkte':'Neustart bei 0 oder 1 € zahlen';}
 function defaults(){return {target:90,baseCents:100,rules:specs.map(([id,from,to,kind,value])=>({id,from,to,kind,value,enabled:true}))};}
 function validSettings(v){
  if(!v||!Number.isInteger(v.target)||v.target<20||v.target>500||!Number.isInteger(v.baseCents)||v.baseCents<0||v.baseCents>10000||!Array.isArray(v.rules)||v.rules.length>17)return false;
  const seen=new Set();
  return v.rules.every(r=>{const spec=specs.find(x=>x[0]===r.id);if(!spec||seen.has(r.id)||r.kind!==spec[3]||typeof r.enabled!=='boolean'||!Number.isInteger(r.from)||!Number.isInteger(r.to)||r.from<0||r.to<r.from||r.to>=v.target||!Number.isInteger(r.value)||r.value<0||(r.kind==='move'?r.value>=v.target:r.kind==='pay'?r.value>10000:r.value!==spec[4]))return false;seen.add(r.id);return true;})&&v.rules.every((r,i)=>!r.enabled||!v.rules.some((q,j)=>j<i&&q.enabled&&q.from<=r.to&&r.from<=q.to));
 }
 function settings(v){return clone(validSettings(v)?v:defaults());}
 function makeRules(target,random=Math.random){
  if(!Number.isInteger(target)||target<20||target>500)throw Error('Ziel: 20 bis 500 Punkte eingeben');
  if(target===90)return defaults().rules;
  const pool=defaults().rules.slice(1);for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const count=Math.min(16,Math.max(3,Math.floor(16*target/90))),chosen=pool.slice(0,count),points=Array.from({length:target-1},(_,i)=>i+1);
  for(let i=points.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[points[i],points[j]]=[points[j],points[i]];}
  const rules=chosen.map((r,i)=>({...r,from:points[i],to:points[i],value:r.kind==='move'?Math.max(1,Math.min(target-1,Math.round(r.value*target/90))):r.value}));
  return [defaults().rules[0],...rules].sort((a,b)=>a.from-b.from);
 }
 function shiftRule(config,index,delta){
  if(!validSettings(config))throw Error('Ungültige Hindernisverteilung');const next=clone(config),target=index+delta;
  if(!Number.isInteger(index)||!Number.isInteger(delta)||Math.abs(delta)!==1||index<0||index>=next.rules.length||target<0||target>=next.rules.length)return next;
  for(const key of ['id','kind','value']){const value=next.rules[index][key];next.rules[index][key]=next.rules[target][key];next.rules[target][key]=value;}return next;
 }
 function recommendedCount(target){return Math.min(specs.length,Math.max(3,Math.round(specs.length*target/90)));}
 function randomRules(target,count=recommendedCount(target),random=Math.random,previous=[]){
  if(!Number.isInteger(target)||target<20||target>500)throw Error('Ziel: 20 bis 500 Punkte eingeben');
  if(!Number.isInteger(count)||count<1||count>specs.length)throw Error('Anzahl: 1 bis '+specs.length+' Hindernisse eingeben');
  const pool=defaults().rules.map(rule=>{const saved=previous.find(r=>r.id===rule.id);return saved&&rule.kind==='pay'?{...rule,value:saved.value}:rule;});
  const points=Array.from({length:target-1},(_,i)=>i+1);
  for(const list of [pool,points])for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return pool.slice(0,count).map((rule,i)=>({...rule,from:points[i],to:points[i],enabled:true,value:rule.kind==='move'?Math.max(1,Math.min(target-1,Math.round(rule.value*target/90))):rule.value})).sort((a,b)=>a.from-b.from);
 }
 function randomizeEvents(config,random=Math.random){
  return rebuildSettings(config,config.target,recommendedCount(config.target),random);
 }
 function rebuildSettings(config,target,count,random=Math.random){
  if(!validSettings(config))throw Error('Ungültige Hindernisverteilung');
  const amounts={},pool=defaults().rules;
  for(const rule of pool.filter(r=>r.kind==='pay')){const saved=config.payAmounts?.[rule.id];amounts[rule.id]=Number.isInteger(saved)&&saved>=0&&saved<=10000?saved:rule.value;}
  for(const rule of config.rules.filter(r=>r.kind==='pay'))amounts[rule.id]=rule.value;
  return {...clone(config),target,payAmounts:amounts,rules:randomRules(target,count,random,pool.map(rule=>rule.kind==='pay'?{...rule,value:amounts[rule.id]}:rule))};
 }
 function hurdleEndCents(config,score){
  const remaining=Math.max(0,config.target-Math.max(0,Number(score)||0));
  // Mit ganzen Cent rechnen; erst den gesamten Endbetrag aufrunden.
  return Math.floor((config.baseCents*remaining+config.target-1)/config.target);
 }
 function settlementCents(s,name){
  if(s.winners.includes(name))return 0;
  if(s.finished){
   const booked=s.bookings.find(b=>b.personName===name&&b.reason==='Hindernislauf · Endabrechnung');
   if(booked)return booked.amountCents;
   if(s.settlementVersion!==2)return Math.max(0,s.config.baseCents-s.scores[name]);
  }
  return hurdleEndCents(s.config,s.scores[name]);
 }
 function empty(gameKey){return {gameKey,id:'',revision:0,active:false,finished:false,readyToFinish:false,players:[],index:0,round:1,turn:[],scores:{},sheet:{},addUsed:{},skip:{},subtract:{},double:{},pendingChoice:null,finalRound:0,winners:[],history:[],events:[],bookings:[],lastRules:[],config:defaults(),commands:[],receipts:[],startedAt:'',eveningStartedAt:''};}
 function current(s){return s.players[s.index]||'';}
 function reachedTarget(s){return s.gameKey==='hindernis'&&s.players.some(name=>s.scores[name]>=s.config.target);}
 function finish(s){
  const values=Object.values(s.scores),best=s.gameKey==='siebener'?Math.min(...values):Math.max(...values);
  s.winners=s.players.filter(n=>s.scores[n]===best);
  const e={id:'finish'};if(s.gameKey==='hindernis')s.settlementVersion=2;
  for(const n of s.players){const cents=s.gameKey==='siebener'?s.scores[n]:settlementCents(s,n);booking(s,e,n,cents,s.gameKey==='siebener'?'7er-Spiel · Abweichungen':'Hindernislauf · Endabrechnung');}
  s.active=false;s.finished=true;s.readyToFinish=true;
 }
 const active=p=>p.present&&!p.left&&!p.inactive&&!p.isDrinksOnly;
 function start(req,ctx){
  const names=req.players;if(!Array.isArray(names)||names.length<2||names.length>16||names.some(n=>typeof n!=='string'||!n.trim())||new Set(names.map(norm)).size!==names.length||names.some(n=>!ctx.people.some(p=>p.name===n&&active(p))))throw Error('Bitte 2 bis 16 unterschiedliche aktive Kegler auswählen');
  if(typeof req.gameId!=='string'||!/^indgame_[a-zA-Z0-9_-]{1,100}$/.test(req.gameId))throw Error('Ungültige Spielkennung');
  if(req.gameKey==='hindernis'&&!validSettings(req.config))throw Error('Ziel, Betrag und Hindernispunkte prüfen');
  const s=empty(req.gameKey);s.id=req.gameId;s.active=true;s.players=names.slice();s.config=req.gameKey==='hindernis'?settings(req.config):defaults();s.scores=Object.fromEntries(names.map(n=>[n,0]));s.sheet=Object.fromEntries(names.map(n=>[n,{}]));s.startedAt=ctx.now;s.eveningStartedAt=ctx.eveningStartedAt;return s;
 }
 function booking(s,e,name,cents,reason){if(cents>0)s.bookings.push({id:'indcharge_'+s.id+'_'+e.id+'_'+s.players.indexOf(name),personName:name,amountCents:cents,reason,onTop:true,eveningStartedAt:s.eveningStartedAt,gameId:s.id});}
 function next(s){
  s.index++;
  for(let i=0;i<=s.players.length;i++){
   if(s.index===s.players.length){if(s.gameKey==='siebener'&&s.players.every(n=>Object.keys(s.sheet[n]).length===6)){s.readyToFinish=true;return;}s.index=0;s.round++;}
   const n=current(s);if(!s.skip[n])return;s.skip[n]=false;s.events.push({name:n,text:'Setzt diesen Zug aus',round:s.round});s.index++;
  }
 }
 function hurdle(s,e){
  const n=e.name,old=s.scores[n],factor=s.double[n]?2:1,minus=!!s.subtract[n],wood=minus&&e.kind==='gosse'?9:e.pins;s.double[n]=false;s.subtract[n]=false;
  s.scores[n]=Math.max(0,old+(minus?-1:1)*wood*factor);s.lastRules=[];let again=false;
  const r=s.config.rules.find(r=>r.enabled&&s.scores[n]>=r.from&&s.scores[n]<=r.to&&(s.scores[n]!==old||old===0&&e.pins===0));
  if(r){
   s.lastRules=[r.id];const point=s.scores[n];
   if(r.kind==='start')s.scores[n]=0;
   else if(r.kind==='skip')s.skip[n]=true;
   else if(r.kind==='pay')booking(s,e,n,r.value,'Hindernislauf · Hindernis '+point);
   else if(r.kind==='subtract')s.subtract[n]=true;
   else if(r.kind==='reset')s.scores[n]=0;
   else if(r.kind==='leader')s.scores[n]=Math.max(0,Math.max(...Object.values(s.scores))-1);
   else if(r.kind==='move')s.scores[n]=r.value;
   else if(r.kind==='double'){s.double[n]=true;again=true;}
   else if(r.kind==='others'){for(const other of s.players)if(other!==n)s.scores[other]=Math.max(0,s.scores[other]-8);}
   else if(r.kind==='choice')s.pendingChoice={name:n,point,ruleId:r.id};
   s.events.push({name:n,text:ruleLabel(r),point,round:s.round,ruleId:r.id});
  }
  if(s.scores[n]>=s.config.target){s.readyToFinish=true;return;}
  if(!again&&!s.pendingChoice)next(s);
 }
 function play(s,e){
  const n=current(s);if(e.name!==n)throw Error('Spieler am Wurf wurde inzwischen geändert');
  if(e.action==='throw'){
   if(s.pendingChoice||s.gameKey==='siebener'&&s.turn.length===2)throw Error('Zuerst die offene Auswahl abschließen');
   if(s.gameKey==='siebener')s.turn.push(e.pins);else hurdle(s,e);
  }else if(e.action==='place'){
   if(s.gameKey!=='siebener'||s.turn.length!==2||!columns.includes(e.column)||Object.hasOwn(s.sheet[n],e.column)||e.add&&s.addUsed[n])throw Error('Zwei Würfe, eine freie Spalte und die noch ungenutzte Addition wählen');
   const value=e.add?s.turn[0]+s.turn[1]:s.turn[0]*s.turn[1],diff=Math.abs(e.column-value);Object.defineProperty(s.sheet[n],e.column,{value:{value,diff,cents:diff*10,add:!!e.add,throws:s.turn.slice()},writable:true,enumerable:true,configurable:true});s.scores[n]+=diff*10;if(e.add)s.addUsed[n]=true;s.turn=[];next(s);
  }else if(e.action==='choose'){
   if(!s.pendingChoice||s.pendingChoice.name!==n||!['reset','pay'].includes(e.choice))throw Error('Neustart oder 1 € Zahlung auswählen');
   if(e.choice==='reset')s.scores[n]=0;else booking(s,e,n,100,'Hindernislauf · Neustart vermieden');s.pendingChoice=null;next(s);
  }else throw Error('Ungültige Spielaktion');
  s.history.push(e);
 }
 function command(previous,req,ctx){
  if(!keys.includes(req.gameKey)||typeof req.opId!=='string'||!/^ind_[a-zA-Z0-9_-]{1,100}$/.test(req.opId))throw Error('Ungültige Spielaktion');
  const before=previous||empty(req.gameKey);if(before.commands.includes(req.opId))return {state:clone(before),repeat:true};
  if((Number(before.revision)||0)!==req.expectedRevision)throw Error('Spielstand wurde inzwischen geändert. Bitte Serverstand laden');
  let s=clone(before);
  if(req.action==='start'){if(s.active)throw Error('Das laufende Spiel erst abschließen oder abbrechen');s=start(req,ctx);}
  else{
   if(!s.id||s.id!==req.gameId)throw Error('Das Spiel wurde inzwischen gewechselt');
   if(req.action==='reset'){s=empty(req.gameKey);s.eveningStartedAt=ctx.eveningStartedAt;}
   else{
    if(!s.active||s.finished)throw Error('Dieses Spiel ist bereits beendet');
    if(req.action==='finish'){
     if(!s.readyToFinish&&!reachedTarget(s))throw Error(s.gameKey==='hindernis'?'Zuerst die Zielpunktzahl erreichen':'Zuerst die Runde zu Ende spielen');finish(s);
    }else if(req.action==='undo'){
     if(!s.history.length)throw Error('Noch keine Aktion zum Zurücknehmen');const history=s.history.slice(0,-1),rebuilt=start({gameKey:s.gameKey,gameId:s.id,players:s.players,config:s.config},{...ctx,people:s.players.map(name=>({name,present:true})),now:s.startedAt,eveningStartedAt:s.eveningStartedAt});for(const e of history)play(rebuilt,e);s=rebuilt;
    }else{
     if(s.readyToFinish||reachedTarget(s))throw Error('Das Ziel oder Rundenende ist erreicht. Abschließen oder zurücknehmen');
     if(s.history.length>=2000)throw Error('Maximale Spiellänge erreicht');
     const n=current(s),e={id:req.opId,name:n,action:req.action,at:ctx.now};
     if(req.action==='throw'){
      if(!ctx.people.some(p=>p.name===n&&active(p)))throw Error('Der Werfer ist nicht mehr aktiv');if(!['pins','kranz','gosse','miss'].includes(req.kind))throw Error('Ungültiger Wurf');
      const pins=req.kind==='kranz'?(s.gameKey==='hindernis'?12:8):['gosse','miss'].includes(req.kind)?0:Number(req.pins);if(!Number.isInteger(pins)||pins<0||req.kind==='pins'&&(pins<1||pins>9))throw Error('1 bis 9 Holz, Gosse, Vorbei oder Kranz eingeben');Object.assign(e,{kind:req.kind,pins});
     }else if(req.action==='place')Object.assign(e,{column:req.column,add:!!req.add});else if(req.action==='choose')e.choice=req.choice;else throw Error('Ungültige Spielaktion');play(s,e);
     // Zielwurf und Endabrechnung sind eine einzige, wiederholsichere Spielaktion.
     if(reachedTarget(s))finish(s);
    }
   }
  }
  s.revision=(Number(before.revision)||0)+1;s.commands=[...before.commands,req.opId].slice(-2048);s.receipts=(before.receipts||[]).slice(-63);return {state:s,repeat:false};
 }
 function effects(before,s,req,ctx){
  const changes=[],added=[],removed=[];
  if(req.action==='throw'){
   const e=s.history[s.history.length-1],type=e.kind==='gosse'?'gosse':e.kind==='kranz'?'kranz':e.pins===9?'9er':'';
   if(type){const key=ctx.catalog.find(x=>type==='gosse'?/gosse|pudel/i.test(x.label):/9er|kranz|durchgeworfen/i.test(x.label))?.key;if(!key)throw Error('Strafenart '+type+' fehlt');const names=type==='gosse'?[e.name]:ctx.people.filter(p=>active(p)&&p.name!==e.name).map(p=>p.name);for(const personName of names)changes.push({personName,key,delta:1});e.statId='individual_'+s.id+'_'+e.id;added.push({id:e.statId,individualGameId:s.id,type,thrower:e.name,punished:names,eveningStartedAt:s.eveningStartedAt,eventDate:ctx.now.slice(0,10),createdAt:ctx.now,club:ctx.club});}e.penalties=clone(changes);
  }else if(req.action==='undo'){const e=before.history[before.history.length-1];for(const x of e.penalties||[])changes.push({...x,delta:-x.delta});if(e.statId)removed.push(e.statId);}
  const old=new Set((before.bookings||[]).map(x=>x.id)),next=new Set(s.bookings.map(x=>x.id));
  return {changes,added,removed,moneyAdded:req.action==='reset'?[]:s.bookings.filter(x=>!old.has(x.id)),moneyRemoved:req.action==='reset'?[]:(before.bookings||[]).filter(x=>!next.has(x.id)).map(x=>x.id)};
 }
 window.KCIndividual=Object.freeze({empty,defaults,settings,hurdleEndCents,settlementCents,reachedTarget,validSettings,makeRules,recommendedCount,randomRules,rebuildSettings,shiftRule,randomizeEvents,ruleLabel,current,command,effects,columns});
})();
