/* Gemeinsame Auswertung für App und TV. Nur abgerechnete Abende zählen dauerhaft. */
(() => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v||'').trim().normalize('NFKC').toLocaleLowerCase('de');
 const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v/100);
 const resultTypes=new Set(['game_result','tannenbaum','darts','lotterie','tiberius','mensch','plusminus','haushoch','haustief','sichern','fuchsjagd','tor','sechstage','blackjack','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun','guterschnitt','parteienspiel','dreieuro','ebbeflut','hochsprung','poker','pfaelzer','tausend']);
 const count=v=>Math.max(0,Math.floor(Number(v)||0));
 function drinkSession(snapshot){
  const day=window.KCPenaltyStats.date(snapshot.eveningStartedAt)||window.KCPenaltyStats.date(snapshot.date),key=window.KCPenaltyStats.key(snapshot.eveningStartedAt,day);
  return {key,date:day,stamp:Date.parse(snapshot.eveningStartedAt||snapshot.closedAt||snapshot.date),people:(snapshot.persons||[]).map(p=>{
   const values=Object.fromEntries((snapshot.drinks||[]).map(d=>[d.key,count(p.drinks?.[d.key])])),units=Object.values(values).reduce((a,b)=>a+b,0);
   const base=(snapshot.drinks||[]).reduce((sum,d)=>sum+count(p.drinks?.[d.key])*Math.round((Number(d.price)||0)*100),0);
   const cents=p.total!==undefined?Math.round((Number(p.total)||0)*100):base+Math.round(((Number(p.teamExtra)||0)+(Number(p.roundExtra)||0))*100);
   return {name:p.name,values,units,cents};
  })};
 }
 function drinkData(entries=[],current=null){
  const chosen=new Map(),catalog=new Map();
  for(const e of entries.filter(e=>e.category==='getraenke'&&e.status!=='deleted').slice().sort((a,b)=>String(a.closedAt||a.date).localeCompare(String(b.closedAt||b.date)))){
   const s=drinkSession(e);if(s.date)chosen.set(s.key,s);for(const d of e.drinks||[])catalog.set(d.key,{key:d.key,label:d.label});
  }
  return {sessions:[...chosen.values()],catalog:[...catalog.values()],current:current?drinkSession(current):null};
 }
 function drinkSummary(data,{settings=null,custom=false,from='',to='',people=[]}={}){
  if(from&&!KCBirthdays.parse(from)||to&&!KCBirthdays.parse(to)||from&&to&&from>to)throw Error('Bitte einen gültigen Zeitraum wählen.');
  const rows=new Map(),get=name=>{const key=norm(name);if(!rows.has(key))rows.set(key,{name,values:{},units:0,cents:0,evenings:0});return rows.get(key);};
  people.filter(p=>!p.inactive).forEach(p=>get(p.name));
  for(const s of data.sessions){
   if(custom?(from&&s.date<from||to&&s.date>to):settings?.mode==='date'&&s.date<settings.startDate)continue;
   const partial=!custom&&settings?.mode==='now'&&s.key===settings.baseline?.key;
   if(!custom&&settings?.mode==='now'&&!partial&&(!Number.isFinite(s.stamp)||s.stamp<Date.parse(settings.startAt)))continue;
   for(const p of s.people){const r=get(p.name),base=partial?settings.baseline.people.find(b=>norm(b.name)===norm(p.name)):null;
    for(const [k,v] of Object.entries(p.values))r.values[k]=(r.values[k]||0)+Math.max(0,v-count(base?.values?.[k]));
    r.units+=Math.max(0,p.units-count(base?.units));r.cents+=Math.max(0,p.cents-count(base?.cents));r.evenings+=base?0:1;
   }
  }
  return [...rows.values()].sort((a,b)=>b.units-a.units||a.name.localeCompare(b.name,'de'));
 }
 function table(rows,columns,caption='Statistik'){
  return '<table class="cash-year-table activity-table"><caption>'+esc(caption)+'</caption><thead><tr><th scope="col">Name</th>'+columns.map(c=>'<th scope="col">'+esc(c.label)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th scope="row">'+esc(r.name)+'</th>'+columns.map(c=>'<td>'+esc(c.money?money(r[c.key]||0):c.drink?r.values?.[c.key]||0:r[c.key]||0)+'</td>').join('')+'</tr>').join('')+'</tbody><tfoot><tr><th scope="row">Gesamt</th>'+columns.map(c=>{const total=rows.reduce((s,r)=>s+Number(c.drink?r.values?.[c.key]||0:r[c.key]||0),0);return '<td>'+(c.money?money(total):total)+'</td>';}).join('')+'</tr></tfoot></table>';
 }
 const penaltyColumns=[{key:'present',label:'Abende'},{key:'gosse',label:'Gossen'},{key:'nine',label:'🎯 9er'},{key:'kranz',label:'👑 Kränze'},{key:'loser1',label:'1. Verlierer'},{key:'loser2',label:'2. Verlierer'},{key:'loser3',label:'3. Verlierer'}];
 function penaltyRows(state,entries,range={}){
  const data=KCPenaltyStats.build({people:state.persons||[],catalog:state.STRAFEN||[],logs:state.penaltyStatsLog||[],archives:entries,eveningStartedAt:state.currentEveningStartedAt||'',archivedOnly:true,statementsOnly:true});
  return KCPenaltyStats.summary(data,{settings:state.penaltyStatsSettings,...range,people:state.persons||[]});
 }
 function games(state,entries,range={}){
  const rows=penaltyRows(state,entries,range),byName=new Map(rows.map(r=>[norm(r.name),r])),seen=new Set();
  for(const e of entries.filter(e=>e.category==='strafen')){
   const day=KCPenaltyStats.date(e.eveningStartedAt)||KCPenaltyStats.date(e.date),settings=state.penaltyStatsSettings;
   if(range.custom?(range.from&&day<range.from||range.to&&day>range.to):settings?.mode==='date'&&day<settings.startDate)continue;
   for(const g of e.history||[]){if(!resultTypes.has(g.type)||seen.has(g.id))continue;seen.add(g.id);
    if(!range.custom&&settings?.mode==='now'&&Date.parse(g.createdAt||e.eveningStartedAt||e.closedAt)<Date.parse(settings.startAt))continue;
    const names=new Set(g.participants||[]);if(!names.size)continue;
    for(const name of names){let r=byName.get(norm(name));if(!r){r={name};rows.push(r);byName.set(norm(name),r);}r.played=(r.played||0)+1;if((g.winnerNames||[]).some(n=>norm(n)===norm(name)))r.won=(r.won||0)+1;}
   }
  }return rows;
 }
 function evening(state){
  const people=(state.persons||[]).filter(p=>p.present||p.left),drink=drinkSession({persons:people,drinks:(state.DRINKS||[]).map(d=>({...d,price:state.prices?.[d.key]||0})),date:new Date().toISOString(),eveningStartedAt:state.currentEveningStartedAt});
  const results=(state.strafenHistory||[]).filter(e=>resultTypes.has(e.type)),stats=KCPenaltyStats.build({people,catalog:state.STRAFEN||[],logs:state.penaltyStatsLog||[],eveningStartedAt:state.currentEveningStartedAt});
  const rows=stats.sessions.find(s=>s.key===stats.currentKey)?.people||[],gutters=Math.max(0,...rows.map(r=>r.gosse)),kings=rows.filter(r=>gutters&&r.gosse===gutters).map(r=>r.name);
  const drinkCents=drink.people.reduce((s,p)=>s+p.cents,0),penalty=people.reduce((s,p)=>s+Math.round((Number(p.strafTotal)||0)*100),0);
  const now=window.KCSharedClock?.now?.()||Date.now(),seconds=state.bahnTimerRunning?Math.max(0,Math.floor((now-Date.parse(state.bahnTimerStart))/1000)):Number(state.bahnElapsedSeconds)||0;
  const lane=seconds?Math.ceil(seconds/3600)*Math.round((Number(state.bahnPreisProStunde)||0)*100):0;
  const cards=[['Mit dabei',String(people.filter(p=>!p.isDrinksOnly).length)],['Getränke',money(drinkCents)],['Strafen',money(penalty)],['Bahnkosten',money(lane)],['Spiele',String(results.length)],['Gossenkönig',kings.join(', ')||'—']];
  return {summary:cards.map(([l,v])=>'<div><span>'+esc(l)+'</span><strong>'+esc(v)+'</strong></div>').join(''),html:table(rows,penaltyColumns,'Aktueller Kegelabend · laufender Stand')+'<div class="evening-results">'+(results.map(g=>'<article><strong>'+esc(g.title||window.KCGameFinePolicy?.titles?.[g.type]||g.gameKey||g.type)+'</strong><span>Gewonnen: '+esc((g.winnerNames?.length?g.winnerNames:g.winners?.length?g.winners:g.winner?[g.winner]:[]).join(', ')||'—')+'</span><span>'+esc((g.ranking||[]).map(r=>r.rank+'. Verlierer: '+(r.names||[]).join(', ')).join(' · '))+'</span></article>').join('')||'<p>Noch keine abgeschlossenen Spiele.</p>')+'</div>'};
 }
 window.KCActivityReports=Object.freeze({esc,money,norm,table,penaltyColumns,penaltyRows,drinkSession,drinkData,drinkSummary,games,evening});
})();
