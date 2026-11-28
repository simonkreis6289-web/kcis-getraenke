/* V331: conservative, idempotent recovery from the canonical Firebase snapshot. */
(()=>{
 const clone=x=>JSON.parse(JSON.stringify(x)),norm=x=>String(x||'').trim().toLocaleLowerCase('de');
 // The owner confirmed the sole genuine nine of this evening. The score-9
 // entries in these two earlier games were gutters, never physical nines.
 // Do not infer a nine from numeric zero or touch reconciled financial rows.
 function repairPhysical332(source,core){
  const evening='2026-11-27T18:17:01.250Z';
  if(source.physicalStatsRepair332?.schema===1||source.currentEveningStartedAt!==evening)return source;
  const root=clone(source),M=window.KCEveningCounters;if(!M)return source;
  const confirmed=[
   {key:'haustief',startedAt:'2026-11-27T19:35:58.800Z',createdAt:'2026-11-27T19:43:27.941Z'},
   {key:'plusminus',startedAt:'2026-11-27T19:46:52.259Z',createdAt:'2026-11-27T20:04:26.417Z'}
  ];
  const changes=[],statIds=new Map();
  for(const game of confirmed){
   const result=(root.strafenHistory||[]).find(x=>x.type===game.key&&x.createdAt===game.createdAt);
   const live=root[game.key+'State'],current=live?.startedAt===game.startedAt?live:null;
   const original=current?.rows||result?.rows;if(!original)continue;
   const corrected=clone(original);
   for(const [name,row] of Object.entries(corrected))for(const [place,roll] of row.entries()){
    if(!roll||roll.physicalThrow)continue;
    const value=Number(roll.value),gutter=roll.isGosse||value===9||value===0;
    const kind=gutter?'gosse':value===12?'kranz':'pins',pins=gutter?0:value===12?8:value;
    const before=M.roll(value,roll.isGosse?'gosse':undefined),after=M.roll(pins,kind);
    if(game.key==='haustief')roll.gameValue=roll.isGosse?9:Number(roll.kranzValue??roll.value);
    roll.physicalThrow={kind,pins,source:'confirmed-game-value-332'};
    const id=JSON.stringify([game.key,game.startedAt])+'|'+JSON.stringify([name,place]);
    changes.push({id,name,place,before,after,statId:roll.penaltyBooking?.statId||null});
    if(roll.penaltyBooking?.statId)statIds.set(roll.penaltyBooking.statId,kind);
   }
   if(current)current.rows=clone(corrected);
   for(const entry of root.strafenHistory||[])if(result&&entry.id===result.id)entry.rows=clone(corrected);
   for(const entry of live?.history||[])if(result&&entry.id===result.id)entry.rows=clone(corrected);
  }
  if(!changes.length)return source;
  const beforeCounters=clone(root.eveningCounters||M.empty());
  const counts=M.normalize(root.eveningCounters),excluded=root.eveningCounterExcluded||{};
  const restoreExcludedNines=(excluded.nines||[]).every(id=>/^\["haus(?:hoch|tief)",/.test(id)||id.startsWith('manual|'));
  const isExcluded=(metric,id)=>(excluded[metric]||[]).includes(id);
  for(const change of changes){
   for(const metric of M.keys){
    if(metric==='nines'){
     // The old zeroing removed bogus score-nines. Include only the confirmed
     // physical nines again; do not subtract entries already excluded earlier.
     if(!isExcluded(metric,change.id)||restoreExcludedNines)counts[metric]+=change.after[metric]-(isExcluded(metric,change.id)?0:change.before[metric]);
    }else if(!(excluded[metric]||[]).includes(change.id))counts[metric]+=change.after[metric]-change.before[metric];
   }
   const personal=root.personalThrows,row=personal?.rows?.find(x=>x.name===change.name);
   if(row&&!(personal.excluded||[]).includes(change.id)&&!(personal.corrections||[]).some(x=>x.name===change.name))for(const metric of M.keys)row[metric]=Math.max(0,(Number(row[metric])||0)+change.after[metric]-change.before[metric]);
  }
  root.eveningCounters=M.normalize(counts);
  const changedIds=new Set(changes.map(x=>x.id));
  if(excluded.nines&&restoreExcludedNines)root.eveningCounterExcluded={...excluded,nines:excluded.nines.filter(id=>!changedIds.has(id))};
  for(const entry of root.penaltyStatsLog||[])if(statIds.has(entry.id)){
   entry.originalType332=entry.type;entry.type=statIds.get(entry.id);entry.physicalCorrection332=true;
  }
  if(root.hausnummerSettings?.tief)root.hausnummerSettings.tief={...root.hausnummerSettings.tief,neun:0,gosse:9};
  root.physicalStatsRepair332={schema:1,eveningStartedAt:evening,gameStartedAt:confirmed[0].startedAt,beforeCounters,afterCounters:root.eveningCounters,changes};
  return root;
 }
 function recover(source,core,{automatic=false}={}){
  if(automatic&&source.currentEveningStartedAt&&Date.parse(source.currentEveningStartedAt)<Date.parse('2026-11-27T23:00:00Z'))return source;
  source=repairPhysical332(source,core);
  if(source.hotfix331?.schema===1)return source;
  const root=clone(source),report={schema:1,restoredMoney:[],statistics:[],review:[]};
  root.hausnummerSettings={hoch:{neun:9,kranz:12,...root.hausnummerSettings?.hoch,gosse:0},tief:{neun:0,kranz:0,...root.hausnummerSettings?.tief,gosse:9}};
  const ledger=root.individualGameLedger||[],ids=new Set(ledger.map(x=>x.id));
  for(const key of core.modern){
   const game=root[key+'State'];
   if(!game||game.eveningStartedAt!==root.currentEveningStartedAt)continue;
   for(const item of game.bookings||[]){
    if(!item.id||ids.has(item.id)||item.eveningStartedAt!==root.currentEveningStartedAt||!Number.isSafeInteger(item.amountCents))continue;
    const person=root.persons?.find(p=>norm(p.name)===norm(item.personName));
    if(!person)continue;
    const free=person.freeStrafen||[];
    if(free.some(x=>x.individualChargeId===item.id))continue;
    if(free.some(x=>x.gameId===game.id||norm(x.reason).startsWith(norm(item.reason).split(' · ')[0])&&Math.round(Number(x.amount)*100)===item.amountCents)){
     report.review.push((item.reason||key)+' · '+item.personName+': Zuordnung zu vorhandenem freien Betrag prüfen.');continue;
    }
    ledger.push(item);ids.add(item.id);report.restoredMoney.push({id:item.id,name:item.personName,amountCents:item.amountCents});
   }
  }
  root.individualGameLedger=ledger;
  const M=window.KCEveningCounters;
  if(M){
   // Older lottery snapshots stored the chosen Kranz score. The receipt still
   // identifies the real throw. Correct only contributions not manually excluded.
   for(const key of ['lotterie','fuchsjagd']){
    const game=root[key+'State'];if(!game)continue;
    const old=new Map(M.entries(key,game,true).map(x=>[x[0],x]));
    const next=new Map(M.entries(key,game).map(x=>[x[0],x]));
    for(const [id,previous] of old){
     const actual=next.get(id),stats=actual?.[1]||M.empty(),name=previous[2];
     for(const metric of M.keys){
      const delta=stats[metric]-previous[1][metric];if(!delta)continue;
      if(root.eveningCounters&&!(root.eveningCounterExcluded?.[metric]||[]).includes(id)){
       const value=Number(root.eveningCounters[metric]||0)+delta;
       if(value>=0){root.eveningCounters[metric]=value;report.statistics.push({id,metric,delta});}
       else report.review.push('Abendzähler '+M.labels[metric]+': vorhandene Werte manuell prüfen.');
      }
      const personal=root.personalThrows,row=personal?.rows?.find(x=>x.name===name);
      if(row&&!(personal.excluded||[]).includes(id)){
       const value=Number(row[metric]||0)+delta;
       if(value>=0)row[metric]=value;else report.review.push(name+' · '+M.labels[metric]+': persönlichen Zähler prüfen.');
      }
     }
    }
   }
  }
  // Never infer whether a documented loser was paid from aggregate counters.
  // Show discrepancies for explicit review instead of overwriting manual entries.
  const expected=new Map();
  for(const entry of root.strafenHistory||[])for(const x of window.KCGameFinePolicy?.counterRows(entry,root.STRAFEN||[])||[]){
   const id=JSON.stringify([x.name,x.key]);expected.set(id,(expected.get(id)||0)+x.count);
  }
  for(const [id,count] of expected){const [name,key]=JSON.parse(id),person=root.persons?.find(p=>norm(p.name)===norm(name)),actual=Number(person?.strafen?.[key]||0);if(person&&actual<count)report.review.push(name+' · '+(root.STRAFEN?.find(x=>x.key===key)?.label||key)+': Historie '+count+', Strafentabelle '+actual+'. Über +/− prüfen und korrigieren.');}
  for(const entry of root.strafenHistory||[]){
   if(entry.type==='haustief'&&Number(entry.settings?.gosse)===0&&Object.values(entry.rows||{}).some(row=>row.some(x=>x?.isGosse)))report.review.push('Tiefe Hausnummer '+(entry.createdAt||'')+': alte Gossenwertung 0. Rangfolge und Verliererstrafen anhand der Würfe prüfen; laufende Buchungen bleiben erhalten.');
   if(entry.type==='plusminus'&&!Array.isArray(entry.assigned)&&entry.results?.length){
    const results=entry.results.filter(x=>Number.isFinite(x.result)),best=Math.max(...results.map(x=>x.result)),values=[...new Set(results.filter(x=>x.result!==best).map(x=>x.result))].sort((a,b)=>a-b);
    values.slice(0,3).forEach((value,index)=>report.review.push('+ − × ÷ '+(entry.createdAt||'')+': '+results.filter(x=>x.result===value).map(x=>x.name).join(', ')+' → '+(index+1)+'. Verlierer. Alte Historie ohne Buchungsbeleg: Strafentabelle manuell prüfen.'));
   }
  }
  root.hotfix331=report;return root;
 }
 function render(report,physical){
  const host=document.getElementById('hotfix331-status');if(!host)return;
  host.replaceChildren();
  const lines=report?.review||[];
  const summary=document.createElement('p');summary.textContent='V331: '+(report?.restoredMoney?.length||0)+' fehlende Geldbuchungen wiederhergestellt; '+(report?.statistics?.length||0)+' Statistikwerte anhand der Wurfbelege korrigiert. '+(lines.length?'Offene Punkte bitte anhand der Historie prüfen. Strafen lassen sich in der Strafentabelle über +/− und freie Beträge korrigieren.':'');host.append(summary);
  if(physical?.schema===1){const row=document.createElement('p');row.textContent='V332: Bestätigte Spielwerte als Gossen statt als echte Neuner in der Statistik korrigiert. Strafbeträge und Platzierungsbuchungen wurden dabei nicht verändert.';host.prepend(row);}
  for(const text of lines){const row=document.createElement('p');row.textContent=text;host.append(row);}
 }
 function editPersonal(){
  if(!window.KCSharedSync?.ready||window.KCSharedSync.inUnit)return;
  document.getElementById('personal-correction-modal')?.remove();
  const evening=currentEveningStartedAt,club=ACTIVE_CLUB,M=window.KCEveningCounters;
  const overlay=document.createElement('div');overlay.id='personal-correction-modal';overlay.className='modal-overlay';
  const form=document.createElement('form');form.className='modal-content';
  const title=document.createElement('h3');title.textContent='Persönliche Wurfstatistik korrigieren';
  const select=document.createElement('select');select.setAttribute('aria-label','Spieler');
  for(const person of persons.filter(p=>!p.isDrinksOnly)){const option=document.createElement('option');option.value=person.name;option.textContent=person.name;option.selected=select.children.length===0;select.append(option);}
  const inputs={};form.append(title,select);
  for(const key of M.keys){const label=document.createElement('label'),input=document.createElement('input');label.textContent=M.labels[key]+' ';Object.assign(input,{type:'number',min:'0',max:String(Number.MAX_SAFE_INTEGER),step:'1',required:true});input.name=key;label.append(input);form.append(label);inputs[key]=input;}
  const fill=()=>{const row=personalThrows?.rows?.find(x=>x.name===select.value);for(const key of M.keys)inputs[key].value=String(row?.[key]||0);};select.onchange=fill;fill();
  const status=document.createElement('p');status.setAttribute('role','status');form.append(status);
  const save=document.createElement('button');save.type='submit';save.textContent='Korrektur speichern';
  const close=document.createElement('button');close.type='button';close.textContent='Abbrechen';close.onclick=()=>overlay.remove();form.append(save,close);
  form.onsubmit=event=>{
   event.preventDefault();
   if(ACTIVE_CLUB!==club||currentEveningStartedAt!==evening||!window.KCSharedSync?.ready||window.KCSharedSync.inUnit){status.textContent='Kegelabend gewechselt oder Buchung läuft. Bitte erneut öffnen.';return;}
   const row=Object.fromEntries(M.keys.map(key=>[key,Number(inputs[key].value)]));
   if(Object.values(row).some(x=>!Number.isSafeInteger(x)||x<0)||row.throws<row.gutters+row.nines+row.wreaths||row.pins<9*row.nines+8*row.wreaths||row.pins>9*(row.throws-row.gutters-row.wreaths)+8*row.wreaths){status.textContent='Bitte zusammenpassende Wurf-, Treffer- und Pinzahlen eingeben.';return;}
   const previous=personalThrows||{schema:1,partial:true,rows:[],excluded:[]},name=select.value;
   const state=getFirestoreState(),ids=new Set(KCSharedCore.games.flatMap(key=>M.entries(key,state[key+'State'])).filter(x=>x[2]===name).map(x=>x[0]));
   personalThrows={...previous,correctionId:'personal_'+crypto.randomUUID(),rows:[...previous.rows.filter(x=>x.name!==name),{name,...row}],excluded:(previous.excluded||[]).filter(id=>!ids.has(id)),corrections:[...(previous.corrections||[]),{name,before:previous.rows.find(x=>x.name===name)||null,after:row,at:new Date().toISOString()}]};
   persistState();renderPenaltyStats();overlay.remove();
  };
  overlay.append(form);document.body.append(overlay);
 }
 window.KCHotfixRecovery=Object.freeze({recover,repairPhysical332,render,editPersonal});
})();
