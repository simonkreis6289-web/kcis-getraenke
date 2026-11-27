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
  const push=(id,raw,kind,name)=>out.push([prefix+id,roll(raw,kind),name||'']);
  const cells=(rows,convert)=>{for(const [name,row] of Object.entries(rows||{}))for(const [i,x] of row.entries())if(x!=null){const [raw,kind]=convert(x);push(JSON.stringify([name,i]),raw,kind,name);}};
  const list=(rows,convert)=>{for(const [i,x] of (rows||[]).entries()){const v=convert(x);if(v)push(x.id||String(i),v[0],v[1],x.thrower||x.name);}};
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
   for(const [r,round] of rounds.entries())for(const [team,rows] of Object.entries(round||{}))for(const [i,x] of rows.entries())push(JSON.stringify([r,team,x.createdAt||'',x.order??i]),Number(x.hit),['kranz','gosse','9er','miss'].includes(x.hit)?x.hit:undefined,x.thrower);
  }else list(s.history,x=>(key==='sechstage'?!!x.kind:x.action==='throw')?[x.pins,x.kind]:null);
  return out;
 }
 const throws=(key,s)=>entries(key,s).map(x=>x[1]);
 function manual(root){
  return (root.penaltyStatsLog||[]).filter(x=>x.eveningCounterManual&&x.id&&(!x.eveningStartedAt||x.eveningStartedAt===root.currentEveningStartedAt)).map(x=>['manual|'+x.id,roll(null,x.type),x.thrower||'']);
 }
 function allEntries(root,gameKeys){return [...gameKeys.flatMap(key=>entries(key,root[key+'State'])),...manual(root)];}
 function exclude(root,gameKeys,selected=keys){
  const ids=allEntries(root,gameKeys).map(x=>x[0]),out={...root.eveningCounterExcluded};
  for(const key of selected)out[key]=ids.slice();
  return out;
 }
 function milestoneSettings(value){
  const common=(v,defaultText)=>({enabled:v?.enabled===true,text:String(v?.text??defaultText).slice(0,200),color:/^#[0-9a-f]{6}$/i.test(v?.color||'')?v.color:'#f4c66a',seconds:Math.max(1,Math.min(30,Math.round(Number(v?.seconds)||4)))});
  const ids=new Set();
  return {items:(Array.isArray(value?.items)?value.items:[]).slice(0,100).map((v,i)=>{
   let id=String(v.id||'milestone-'+i);while(ids.has(id))id+='-';ids.add(id);
   return {...common(v,'Meilenstein erreicht!'),id,pins:Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(v.pins)||1))),mode:v.mode==='exact'?'exact':'cross'};
  }),repeated:common(value?.repeated,'🥃 Schnapszahl!')};
 }
 function milestones(before,after,gameKeys,pins){
  const old=before.eveningMilestones||{},same=before.currentEveningStartedAt===after.currentEveningStartedAt;
  const journal={seen:same?(old.seen||[]).slice():[],events:same?(old.events||[]).slice():[]};
  if(before.eveningMilestones||after.dashboardSettings?.milestoneToasts)after.eveningMilestones=journal;
  if(!same||before.eveningResetOp!==after.eveningResetOp)return;
  const prior=normalize(before.eveningCounters).pins;
  if(normalize(after.eveningCounters??before.eveningCounters).pins!==prior||pins<=prior)return;
  const existing=new Set(allEntries(before,gameKeys).map(x=>x[0]));
  const fresh=allEntries(after,gameKeys).filter(x=>!existing.has(x[0])&&x[1].pins>0);
  // Only genuine new physical throws, never a changed existing cell or manual preload.
  if(!fresh.length||fresh.reduce((n,x)=>n+x[1].pins,0)!==pins-prior)return;
  const config=milestoneSettings(after.dashboardSettings?.milestoneToasts),seen=new Set(journal.seen);
  let total=prior;
  for(const [,stats,name] of fresh){
   const next=total+stats.pins;
   const hits=config.items.filter(v=>v.enabled&&(v.mode==='exact'?next===v.pins:total<v.pins&&next>=v.pins)).map(v=>[v,'custom:'+v.id+':'+v.pins]);
   if(config.repeated.enabled&&/^([1-9])\1+$/.test(String(next)))hits.push([config.repeated,'repeated:'+next]);
   for(const [v,id] of hits)if(!seen.has(id)){seen.add(id);journal.events.push({id,name,pins:next,text:v.text,color:v.color,seconds:v.seconds,at:Date.now()});}
   total=next;
  }
  journal.seen=[...seen];journal.events=journal.events.slice(-100);
  if(journal.seen.length)after.eveningMilestones=journal;
 }
 function transition(before,after,gameKeys){
  if(before.eveningResetOp!==after.eveningResetOp&&after.eveningResetOp){after.eveningCounterExcluded={};after.eveningMilestones={seen:[],events:[]};return empty();}
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
  const result=normalize(out);milestones(before,after,gameKeys,result.pins);return result;
 }
 window.KCEveningCounters=Object.freeze({keys,labels,empty,normalize,roll,throws,exclude,transition,milestoneSettings});
})();
