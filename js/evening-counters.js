/* Physical bowling statistics, independent of game scores and financial penalties. */
(()=>{
 const keys=['gutters','nines','wreaths','throws','pins'];
 const labels={gutters:'Gossen',nines:'9er',wreaths:'Kränze',throws:'Würfe',pins:'Pins'};
 const empty=()=>Object.fromEntries(keys.map(k=>[k,0]));
 const normalize=value=>Object.fromEntries(keys.map(k=>[k,Number.isSafeInteger(value?.[k])?Math.max(0,value[k]):0]));
 function roll(raw,kind){
  kind=String(kind||'').toLowerCase();
  if(raw==null&&!kind)return empty();
  const n=Number(raw),wreath=kind==='kranz'||(!kind&&n===12),gutter=kind==='gosse'||(!kind&&n===0),nine=!wreath&&!gutter&&(kind==='9er'||n===9);
  return {gutters:+gutter,nines:+nine,wreaths:+wreath,throws:1,pins:wreath?8:gutter||kind==='miss'||kind==='durchgeworfen'?0:nine?9:Number.isInteger(n)&&n>=0&&n<=9?n:0};
 }
 function session(key,s){const v=key==='tannenbaum'&&s?.closedRound?.state?s.closedRound.state:s;return v?.id||v?.startedAt||'';}
 // IDs are stable under correction and undo, independent of scoring and penalty receipts.
 function entries(key,s){
  if(!s)return [];
  const prefix=JSON.stringify([key,session(key,s)])+'|',out=[];
  const push=(id,raw,kind)=>out.push([prefix+id,roll(raw,kind)]);
  const cells=(rows,convert)=>{for(const [name,row] of Object.entries(rows||{}))for(const [i,x] of row.entries())if(x!=null){const [raw,kind]=convert(x);push(JSON.stringify([name,i]),raw,kind);}};
  const list=(rows,convert)=>{for(const [i,x] of (rows||[]).entries()){const v=convert(x);if(v)push(x.id||String(i),...v);}};
  if(key==='lotterie')cells(s.throws,x=>[x]);
  else if(['haushoch','haustief','plusminus'].includes(key))cells(s.rows,x=>[x.value,x.isGosse?'gosse':undefined]);
  else if(key==='mensch')cells(s.throws,x=>[x.rawPins??x.pins]);
  else if(key==='tiberius')list(s.throws,x=>[x.rawValue??x.value,x.rawValue==='durchgeworfen'?'durchgeworfen':undefined]);
  else if(key==='fuchsjagd')list(s.throws,x=>[x.rawPins??x.pins]);
  else if(key==='sichern')list(s.throwHistory,x=>x.saved?null:[x.rawPins??x.pins]);
  else if(key==='tor')list(s.history,x=>[x.pins,x.kind]);
  else if(key==='tannenbaum')list(((s.closedRound?.state||s).history||[]).slice().reverse(),x=>x.type==='manual-restore'?null:[x.number,x.specialType||(x.type==='penalty-gosse'?'gosse':undefined)]);
  else if(key==='darts'){
   // Finished rounds contain snapshots of exactly their own throws. Reopening
   // a round moves it back into roundThrows without creating any new rolls.
   const rounds=[...(s.history||[]).slice().reverse().map(x=>x.undoSnapshot?.roundThrows),s.roundThrows];
   for(const [r,round] of rounds.entries())for(const [team,rows] of Object.entries(round||{}))for(const [i,x] of rows.entries())push(JSON.stringify([r,team,x.createdAt||'',x.order??i]),Number(x.hit),['kranz','gosse','9er','miss'].includes(x.hit)?x.hit:undefined);
  }else list(s.history,x=>(key==='sechstage'?!!x.kind:x.action==='throw')?[x.pins,x.kind]:null);
  return out;
 }
 const throws=(key,s)=>entries(key,s).map(x=>x[1]);
 function manual(root){
  return (root.penaltyStatsLog||[]).filter(x=>x.eveningCounterManual&&x.id&&(!x.eveningStartedAt||x.eveningStartedAt===root.currentEveningStartedAt)).map(x=>['manual|'+x.id,roll(null,x.type)]);
 }
 function allEntries(root,gameKeys){return [...gameKeys.flatMap(key=>entries(key,root[key+'State'])),...manual(root)];}
 function exclude(root,gameKeys,selected=keys){
  const ids=allEntries(root,gameKeys).map(x=>x[0]),out={...root.eveningCounterExcluded};
  for(const key of selected)out[key]=ids.slice();
  return out;
 }
 function transition(before,after,gameKeys){
  if(before.eveningResetOp!==after.eveningResetOp&&after.eveningResetOp){after.eveningCounterExcluded={};return empty();}
  const out=normalize(after.eveningCounters??before.eveningCounters);
  const excluded=after.eveningCounterExcluded??before.eveningCounterExcluded??(!before.eveningCounters?exclude(before,gameKeys):{}),skip=Object.fromEntries(keys.map(k=>[k,new Set(excluded[k]||[])])),remaining=new Set();
  const add=(rows,sign)=>{for(const [id,stats] of rows)for(const k of keys)if(!skip[k].has(id))out[k]+=sign*stats[k];};
  for(const key of gameKeys){
   const a=before[key+'State'],b=after[key+'State'];
   const old=session(key,a),next=session(key,b),newRows=entries(key,b);
   for(const [id] of newRows)remaining.add(id);
   if(!b||old&&!next||!next&&!b.active&&!b.finished&&!b.closedRound&&!newRows.length)continue;
   // A reset or new game never erases throws already made that evening.
   // Only corrections/undo inside the same game reverse contributions.
   if(old===next)add(entries(key,a),-1);
   add(newRows,1);
  }
  const newManual=manual(after);
  add(manual(before),-1);add(newManual,1);
  for(const [id] of newManual)remaining.add(id);
  after.eveningCounterExcluded=Object.fromEntries(keys.filter(k=>skip[k].size).map(k=>[k,[...skip[k]].filter(id=>remaining.has(id))]).filter(([,ids])=>ids.length));
  return normalize(out);
 }
 window.KCEveningCounters=Object.freeze({keys,labels,empty,normalize,roll,throws,exclude,transition});
})();
