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
 function apply(root,entry,id,original,at){
  if(!root.currentEveningStartedAt||entry.evening!==root.currentEveningStartedAt||root.stationClosedEvening===entry.evening)
    throw Error('Der Getränkestand dieses Kegelabends ist geschlossen.');
  const people=copy(root.persons||[]),spiel=copy(root.spiele||[]),catalog=root.DRINKS||[],prices=root.prices||{};
  const values=entry.payload||{},find=name=>people.find(person=>name===person.name);
  let effect,description;
  if(entry.kind==='undo'){
   if(original?.status!=='applied'||original.evening!==entry.evening||!original.result?.effect||original.kind==='undo')
     throw Error('Diese Buchung ist bereits storniert oder gehört zu einem anderen Abend.');
   const source=original.result.effect,person=find(source.person);
   if(source.kind==='drink'){
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
  }else{
   const drinks=quantities(catalog,values.drinks);
   if(entry.kind==='team'){
    const game=games(root).find(item=>item.key===values.game);
    const team=game&&availableTeams(root,game).find(item=>item.id===values.team);
    if(!team||!Array.isArray(values.members)||JSON.stringify(team.members.map(p=>p.name).sort())!==JSON.stringify(values.members.slice().sort()))
      throw Error('Die Teamaufstellung wurde geändert. Bitte erneut auswählen.');
    const gameRow=teamEntry(game,team,drinks,catalog,prices,values.roundGiven===true);
    spiel.push({...gameRow,stationBookingId:id});
    effect={kind:'team'};description=team.label+' · '+game.title;
   }else{
    const person=find(values.person);
    if(!active(person))throw Error('Diese Person ist nicht mehr anwesend.');
    if(entry.kind==='drink'){
     person.drinks={...person.drinks};
     for(const [key,n] of Object.entries(drinks))person.drinks[key]=(Number(person.drinks[key])||0)+n;
     description=person.name+' · '+Object.entries(drinks).map(([key,n])=>n+' × '+catalog.find(drink=>drink.key===key).label).join(', ');
    }else if(entry.kind==='round'){
     const allowed=root.RUNDEN_GRUENDE||[];
     if(!allowed.includes(values.reason)||!Array.isArray(values.recipients)||!values.recipients.length||
        new Set(values.recipients).size!==values.recipients.length||values.recipients.some(name=>!active(find(name))))
       throw Error('Rundengrund oder Empfänger wurden geändert. Bitte erneut auswählen.');
     person.rounds=[...(person.rounds||[]),{id,reason:values.reason,drinks,total:total(catalog,prices,drinks),recipients:values.recipients,createdAt:at}];
     description=person.name+' · Runde · '+values.reason;
    }else throw Error('Unbekannte Art der Buchung.');
    effect={kind:entry.kind,person:person.name,drinks};
   }
  }
  recalculate(people,spiel,catalog,prices);
  return {state:{...root,persons:people,spiele:spiel},result:{description,...(effect?{effect}:{})}};
 }
 window.KCDrinkLedger=Object.freeze({active,total,roundTotal,recalculate,teamEntry,availableTeams,games,apply});
})();
