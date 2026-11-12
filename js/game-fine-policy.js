/* Gemeinsame Deckel-/OnTop-Wertung. Keine zusätzliche Strafbuchung: Zählerbeträge werden bei OnTop nur umgeordnet. */
(() => {
 const titles={tannenbaum:'Tannenbaum',darts:'Darts',lotterie:'Lotterie',tiberius:'Tiberius',mensch:'Mensch ärgere dich nicht',plusminus:'+ − × ÷',haushoch:'Hohe Hausnummer',haustief:'Tiefe Hausnummer',sichern:'Sichern',fuchsjagd:'Fuchsjagd',tor:'Tor',sechstage:'Sechs-Tage-Rennen',blackjack:'17 + 4 / Blackjack',gluecksspirale:'Glücksspirale',siebener:'7er-Spiel',hindernis:'Hindernislauf',bergundtal:'Berg und Tal',ballermann:'Ballermann 6',lattenzaun:'Lattenzaun',guterschnitt:'Der gute Schnitt'};
 const icons={tannenbaum:'🌲',darts:'🎯',lotterie:'🎰',tiberius:'🏛️',mensch:'🎲',plusminus:'➕',haushoch:'🔢',haustief:'🔽',sichern:'🔒',fuchsjagd:'🦊',tor:'⚽',sechstage:'🏁',blackjack:'🃏',gluecksspirale:'🌀',siebener:'🎲',hindernis:'🏃',bergundtal:'🏔️',ballermann:'🏖️',lattenzaun:'🪵',guterschnitt:'✂️'};
 const cents=n=>Math.round((Number(n)||0)*100),name=n=>String(n||'').trim().toLocaleLowerCase('de'),enabled=(settings,key)=>!['haushoch','haustief'].includes(key)&&settings?.[key]===true;
 function key(item,forced){if(Object.hasOwn(titles,forced))return forced;if(Object.hasOwn(titles,item?.gameKey))return item.gameKey;const reason=name(item?.reason||item?.title||item?.spieltyp);return Object.keys(titles).find(k=>reason===name(titles[k])||reason.startsWith(name(titles[k])+' ')||reason.startsWith(name(titles[k])+' ·'))||(/^6-tage-rennen/.test(reason)?'sechstage':'');}
 function onTop(item,settings,forced){if(/gossen(könig|koenig)/i.test(String(item?.reason||'')))return true;const game=key(item,forced);if(['haushoch','haustief'].includes(game))return false;if(item?.gameFineFrozen)return item.onTop===true||item.gameFineOnTop===true;return game?enabled(settings,game):item?.onTop===true;}
 function charges(person,state,ledger=state.individualGameLedger||[]){
  const settings=state.gameFineSettings||{},rows=(person.freeStrafen||[]).map(x=>({...x,amountCents:cents(x.amount),gameKey:key(x),onTop:onTop(x,settings)}));
  rows.push(...(person.tannenbaumCharges||[]).map(x=>({...x,amountCents:cents(x.amount),gameKey:'tannenbaum',onTop:onTop(x,settings,'tannenbaum')})));
  for(const entry of state.strafenHistory||[]){if(!['lotterie','tiberius'].includes(entry.type))continue;for(const x of entry.assignedTo||[]){if(name(x.name)!==name(person.name)||!Number(x.amount))continue;const label=titles[entry.type];if(rows.some(r=>r.gameKey===entry.type&&r.amountCents===cents(x.amount)))continue;rows.push({reason:label,gameKey:entry.type,amountCents:cents(x.amount),onTop:onTop({...entry,...x},settings,entry.type)});}}
  for(const x of ledger){if(x.eveningStartedAt!==state.currentEveningStartedAt||name(x.personName)!==name(person.name))continue;if(rows.some(r=>r.individualChargeId===x.id))continue;rows.push({...x,gameKey:key(x),amountCents:Number(x.amountCents)||0,onTop:onTop(x,settings),individualChargeId:x.id});}
  return rows;
 }
 function counterRows(entry,catalog){
  if(Array.isArray(entry.counterCharges))return entry.counterCharges.map(x=>({name:x.personName||x.name,key:x.key,count:Number(x.count??x.delta)||0}));
  const game=entry.gameKey||entry.type;if(['siebener','hindernis','lattenzaun','tannenbaum','lotterie','tiberius','plusminus'].includes(game))return [];
  const groups=Array.isArray(entry.assigned)?entry.assigned.map(x=>({rank:x.rank,names:[x.name]})):entry.ranking||[];
  return groups.slice(0,Array.isArray(entry.assigned)?100:3).flatMap((g,i)=>{const rank=Number(g.rank||i+1),penalty=catalog.find(x=>new RegExp('^'+rank+'\\.?\\s*verlierer','i').test(String(x.label||'').trim())||rank===1&&/erster verlierer/i.test(x.label));return rank<=3&&penalty?(g.names||[]).map(n=>({name:n,key:penalty.key,count:1})):[];});
 }
 function transfers(person,state){
  const catalog=state.STRAFEN||[],settings=state.gameFineSettings||{},prices=state.strafPrices||{},remaining={...(person.strafen||{})},rows=[],seen=new Set();
  for(const entry of state.strafenHistory||[]){if(entry.id&&seen.has(entry.id))continue;if(entry.id)seen.add(entry.id);const game=entry.gameKey||entry.type;if(!onTop(entry,settings,game))continue;
   for(const x of counterRows(entry,catalog)){if(name(x.name)!==name(person.name)||x.count<=0)continue;const count=Math.min(x.count,Math.max(0,Number(remaining[x.key])||0));remaining[x.key]=(Number(remaining[x.key])||0)-count;if(count)rows.push({...x,count,gameKey:game,amountCents:count*cents(prices[x.key])});}
  }
  const bj=state.blackjackState;if(bj?.active&&onTop(bj,settings,'blackjack')){const events=(bj.history||[]).filter(e=>e.action==='card'&&e.name===person.name),e=events.at(-1),penalty=catalog.find(x=>/^1\.?\s*verlierer/i.test(x.label));if(e?.bustPenalty&&penalty&&remaining[penalty.key]>0)rows.push({name:person.name,key:penalty.key,count:1,gameKey:'blackjack',amountCents:cents(prices[penalty.key])});}
  return {rows,amountCents:rows.reduce((n,r)=>n+r.amountCents,0)};
 }
 function parts(person,state,ledger){const rows=charges(person,state,ledger);return {rows,normal:rows.filter(r=>!r.onTop).reduce((n,r)=>n+r.amountCents,0),top:rows.filter(r=>r.onTop).reduce((n,r)=>n+r.amountCents,0)};}
 function counted(person,state){return (state.STRAFEN||[]).reduce((sum,s)=>sum+(Number(person.strafen?.[s.key])||0)*cents(state.strafPrices?.[s.key]),0);}
 function base(person,state){if(person.gameFineBase&&['otherNormalCents','otherTopCents','kingCents'].every(k=>Number.isSafeInteger(person.gameFineBase[k])))return person.gameFineBase;const old=parts(person,state),known=Math.min(counted(person,state)+old.normal,cents(state.STRAFEN_LIMIT??30))+old.top;return {otherNormalCents:Math.max(0,cents(person.strafTotal)-known),otherTopCents:0,kingCents:0};}
 function applyTotals(people,state,previous=state){return people.map(person=>{const b=base(person,previous),p=parts(person,state),transfer=transfers(person,state).amountCents,normal=counted(person,state)+b.otherNormalCents+p.normal-transfer,top=b.otherTopCents+p.top+transfer,total=Math.min(normal,cents(state.STRAFEN_LIMIT??30))+top+b.kingCents,ledger=(state.individualGameLedger||[]).filter(x=>x.eveningStartedAt===state.currentEveningStartedAt&&name(x.personName)===name(person.name)).reduce((n,x)=>n+(Number(x.amountCents)||0),0);return {...person,gameFineBase:b,individualChargeCents:ledger,strafTotal:Math.round(total)/100};});}
 window.KCGameFinePolicy=Object.freeze({titles,icons,enabled,key,onTop,charges,counterRows,transfers,parts,counted,base,applyTotals,cents});
})();
