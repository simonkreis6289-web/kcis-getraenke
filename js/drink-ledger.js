/* Shared drink accounting for the tablet, reports and the registered station. */
(()=>{
 const active=person=>!!(person?.present&&!person.left&&!person.inactive);
 const copy=value=>JSON.parse(JSON.stringify(value));
 function total(catalog,prices,quantities){
  return catalog.reduce((sum,drink)=>sum+(Number(quantities?.[drink.key])||0)*(Number(prices[drink.key])||0),0);
 }
 function roundTotal(person){return (person.rounds||[]).reduce((sum,round)=>sum+(Number(round.total)||0),0);}
 function recalculate(people,games,catalog,prices){
  const byName=new Map(people.map(person=>[person.name,person]));
  for(const person of people){person.teamExtra=0;person.roundExtra=roundTotal(person);}
  for(const game of games){
   game.total=total(catalog,prices,game.drinks);
   const members=game.members||[];
   game.proKopf=members.length?game.total/members.length:0;
   for(const name of members){const person=byName.get(name);if(person)person.teamExtra+=game.proKopf;}
  }
 }
 function teamEntry(game,team,drinks,catalog,prices,roundGiven=false){
  const amount=total(catalog,prices,drinks);
  return {spieltyp:game.title,loser:team.id,teamName:team.label,gameId:team.gameId||'',teamId:team.teamId||team.id,roundGiven,
    drinks:{...drinks},total:amount,proKopf:team.members.length?amount/team.members.length:0,members:team.members.map(person=>person.name)};
 }
 function availableTeams(root,game){
  const state=root[game.key+'State'];
  const valid=state&&(!state.eveningStartedAt||state.eveningStartedAt===root.currentEveningStartedAt);
  return window.KCTeamDrinkGames.teams(game,valid?state:null,root.persons||[],id=>root.groupSettings?.[id]?.name||(id==='T1'?'Wand':'TV')).filter(team=>team.available);
 }
 function games(root){return window.KCTeamDrinkGames.list(window.KCGameOverview.catalog,root.SPIELE_KATALOG||[]);}
 function quantities(catalog,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Getränke fehlen.');
  const pairs=Object.entries(input),keys=new Set(catalog.map(drink=>drink.key));
  if(!pairs.length||pairs.length>catalog.length||pairs.some(([key,n])=>!keys.has(key)||!Number.isInteger(n)||n<1||n>99))
    throw Error('Getränk oder Menge ist ungültig.');
  return Object.fromEntries(pairs);
 }
 const count=(person,key)=>Number(person.drinks?.[key])||0;
 function changeCount(person,key,delta){
  person.drinks={...person.drinks,[key]:count(person,key)+delta};
 }
 function validCount(value){return Number.isSafeInteger(value)&&value>=0;}
 function drinkNames(catalog,drinks){
  return Object.entries(drinks).map(([key,n])=>n+' × '+catalog.find(drink=>drink.key===key).label).join(', ');
 }
 function apply(root,entry,id,original,at){
  if(!root.currentEveningStartedAt||entry.evening!==root.currentEveningStartedAt||root.stationClosedEvening===entry.evening)
    throw Error('Der Getränkestand dieses Kegelabends ist geschlossen.');
  const people=copy(root.persons||[]),spiel=copy(root.spiele||[]),catalog=root.DRINKS||[],prices=root.prices||{};
  const values=entry.payload||{},find=name=>people.find(person=>name===person.name);
  let effect,description,name='';
  if(entry.kind==='undo'){
   if(original?.status!=='applied'||original.evening!==entry.evening||!original.result?.effect||original.kind==='undo')
     throw Error('Diese Buchung ist bereits storniert oder gehört zu einem anderen Abend.');
   const source=original.result.effect,person=find(source.person);
   name=source.person||'';
   if(source.kind==='group'){
    const items=Object.entries(source.drinks).flatMap(([key,names])=>names.map(recipient=>({key,person:find(recipient)})));
    if(items.some(({key,person})=>!person||count(person,key)<1))throw Error('Die Getränke wurden inzwischen korrigiert.');
    for(const {key,person} of items)changeCount(person,key,-1);
   }else if(source.kind==='adjust'){
    const key=source.drink;
    if(!person||count(person,key)!==source.quantity)throw Error('Der Getränkestand wurde inzwischen geändert.');
    changeCount(person,key,source.expected-source.quantity);
   }else if(source.kind==='drink'){
    if(!person||Object.entries(source.drinks).some(([key,n])=>(person.drinks?.[key]||0)<n))throw Error('Die Getränke wurden inzwischen korrigiert.');
    for(const [key,n] of Object.entries(source.drinks))person.drinks[key]-=n;
   }else if(source.kind==='round'){
    if(!person?.rounds?.some(round=>round.id===values.target))throw Error('Die Runde wurde bereits entfernt.');
    person.rounds=person.rounds.filter(round=>round.id!==values.target);
   }else if(source.kind==='team'){
    const index=spiel.findIndex(game=>game.stationBookingId===values.target);
    if(index<0)throw Error('Die Mannschaftsbuchung wurde bereits entfernt.');
    spiel.splice(index,1);
   }else throw Error('Unbekannte Art der Buchung.');
   description='Storno · '+original.result.description;
  }else if(entry.kind==='group'){
   const drinks=quantities(catalog,values.drinks),recipients=values.recipients;
   if(!recipients||Object.keys(recipients).length!==Object.keys(drinks).length||
      Object.entries(drinks).some(([key,n])=>{
       const names=Object.hasOwn(recipients,key)?recipients[key]:null;
       return !Array.isArray(names)||names.length!==n||new Set(names).size!==n||names.some(recipient=>!active(find(recipient)));
      }))throw Error('Für jedes Getränk genau die passende Anzahl unterschiedlicher Teilnehmer auswählen.');
   for(const [key,names] of Object.entries(recipients))for(const recipient of names)changeCount(find(recipient),key,1);
   effect={kind:'group',drinks:recipients};
   const names=[...new Set(Object.values(recipients).flat())];
   description=drinkNames(catalog,drinks)+' · '+names.join(', ');
  }else if(entry.kind==='adjust'){
   const person=find(values.person),drink=catalog.find(row=>row.key===values.drink);
   const {expected,quantity}=values;
   if(!person||person.inactive||(!person.present&&!person.left)||!drink||
      !validCount(expected)||!validCount(quantity)||Math.abs(quantity-expected)!==1)
    throw Error('Getränkekorrektur ist ungültig.');
   if(count(person,drink.key)!==expected)throw Error('Der Getränkestand wurde inzwischen geändert. Bitte erneut bearbeiten.');
   changeCount(person,drink.key,quantity-expected);
   effect={kind:'adjust',person:person.name,drink:drink.key,expected,quantity};
   name=person.name;description=name+' · '+drink.label+' von '+expected+' auf '+quantity;
  }else{
   const drinks=quantities(catalog,values.drinks);
   if(entry.kind==='team'){
    const game=games(root).find(item=>item.key===values.game);
    const team=game&&availableTeams(root,game).find(item=>item.id===values.team);
    if(!team||!Array.isArray(values.members)||JSON.stringify(team.members.map(p=>p.name).sort())!==JSON.stringify(values.members.slice().sort()))
      throw Error('Die Teamaufstellung wurde geändert. Bitte erneut auswählen.');
    const gameRow=teamEntry(game,team,drinks,catalog,prices,values.roundGiven===true);
    spiel.push({...gameRow,stationBookingId:id});
    effect={kind:'team'};description=team.label+' · '+game.title+' · '+drinkNames(catalog,drinks);
   }else{
    const person=find(values.person);
    if(!active(person))throw Error('Diese Person ist nicht mehr anwesend.');
    name=person.name;
    if(entry.kind==='drink'){
     person.drinks={...person.drinks};
     for(const [key,n] of Object.entries(drinks))person.drinks[key]=(Number(person.drinks[key])||0)+n;
     description=person.name+' · '+drinkNames(catalog,drinks);
    }else if(entry.kind==='round'){
     const allowed=root.RUNDEN_GRUENDE||[];
     if(!allowed.includes(values.reason)||(values.recipients!==undefined&&(!Array.isArray(values.recipients)||!values.recipients.length||
        new Set(values.recipients).size!==values.recipients.length||values.recipients.some(name=>!active(find(name))))))
       throw Error('Rundengrund oder Empfänger wurden geändert. Bitte erneut auswählen.');
     person.rounds=[...(person.rounds||[]),{id,reason:values.reason,drinks,total:total(catalog,prices,drinks),recipients:values.recipients||[],createdAt:at}];
     description=person.name+' · Runde · '+values.reason+' · '+drinkNames(catalog,drinks);
    }else throw Error('Unbekannte Art der Buchung.');
    effect={kind:entry.kind,person:person.name,drinks};
   }
  }
  recalculate(people,spiel,catalog,prices);
  const stationEvents=(root.stationEvents||[]).filter(row=>row.evening===entry.evening).slice(-19);
  stationEvents.push({id,evening:entry.evening,at,name,description:description.slice(0,600)});
  return {state:{...root,persons:people,spiele:spiel,stationEvents},result:{description,...(effect?{effect}:{})}};
 }
 window.KCDrinkLedger=Object.freeze({active,total,roundTotal,recalculate,teamEntry,availableTeams,games,apply});
})();
