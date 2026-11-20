/* Die Kugeln verwenden den letzten sichtbaren Spielstand vor dem nächsten Wurf. */
(() => {
 function effects(before,after){
  const scores={...before.scores},hits=new Map();
  const result=[];
  for(const shot of after.history.slice(before.history.length)){
   if(shot.action!=='throw')continue;
   const {name,pins}=shot,from=scores[name],to=from+pins;
   scores[name]=to;
   if(!hits.has(name))hits.set(name,new Set(before.tickets[name]?.hits));
   const reached=hits.get(name);
   for(const number of after.tickets[name]?.numbers||[]){
    if(reached.has(number))continue;
    if(number===to){
     reached.add(number);result.push({name,number,kind:'hit'});
    }else if(number>=from&&number<to)result.push({name,number,kind:'miss'});
   }
  }
  return result;
 }
 let previous=null,overlay=null,timer=null,queue=[],endsAt=0;
 function clear(){
  clearTimeout(timer);
  overlay?.remove();
  overlay=null;timer=null;queue=[];endsAt=0;
 }
 function reset(){clear();previous=null;}
 function origin(body,{name,number}){
  for(const panel of body.querySelectorAll('[data-lotto-player]')){
   if(panel.dataset.lottoPlayer!==name)continue;
   const ball=panel.querySelector('[data-lotto-target="'+number+'"]');
   if(ball)return ball.getBoundingClientRect();
  }
  return null;
 }
 function next(){
  overlay?.remove();overlay=null;timer=null;
  const effect=queue.shift();
  if(!effect){endsAt=0;return;}
  const {stage,source,number,kind,ms}=effect,area=stage.getBoundingClientRect();
  const size=Math.min(250,Math.max(64,area.width*.37),Math.max(64,area.height*.43));
  const x=source?source.left+source.width/2-area.left-area.width/2:0;
  const y=source?source.top+source.height/2-area.top-area.height/2:-area.height*.3;
  overlay=document.createElement('div');
  overlay.className='lotto-effect is-'+kind;
  overlay.setAttribute('aria-hidden','true');
  for(const [key,value] of Object.entries({
   size:size+'px',time:ms+'ms',x:x+'px',y:y+'px',fall:area.height*.65+'px',
   scale:String(source?.width?source.width/size:.2)
  }))overlay.style.setProperty('--lotto-'+key,value);
  for(const piece of kind==='hit'?['ball']:['ball','left','right','bottom']){
   const ball=document.createElement('span');
   ball.className='lotto-effect-'+piece;
   ball.textContent=String(number);
   overlay.append(ball);
  }
  stage.append(overlay);
  timer=setTimeout(next,ms);
 }
 function update(state,body,settings){
  const before=previous;
  previous=state;
  const oldLength=before?.history?.length||0,newLength=state?.history?.length||0;
  if(!state?.id||state.id!==before?.id||newLength<oldLength||
     oldLength&&before.history[oldLength-1].id!==state.history[oldLength-1]?.id){
   clear();return 0;
  }
  if(document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
   clear();return 0;
  }
  const stage=body.closest('.stage'),durations=window.KCDashboardLayout.lottoAnimations(settings?.lottoAnimations);
  if(stage&&newLength>oldLength){
   const now=Date.now();
   for(const effect of effects(before,state)){
    const ms=durations[effect.kind]*1000;
    if(!ms)continue;
    queue.push({...effect,stage,source:origin(body,effect),ms});
    endsAt=Math.max(endsAt,now)+ms;
   }
   if(timer===null&&queue.length)next();
  }
  return Math.max(0,endsAt-Date.now());
 }
 window.KCDashboardLotto=Object.freeze({update,reset,effects});
})();
