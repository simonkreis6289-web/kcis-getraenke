/* Gemeinsamer Platz für Dashboard-Meldungen: ältere unten, neue darüber. */
(()=>{
 const active=[],waiting=[],gap=12;
 let draining=false;
 const viewport=()=>window.innerHeight||document.documentElement.clientHeight||720;
 function bottom(){
  const height=viewport(),footer=document.querySelector('.dashboard-footer')?.getBoundingClientRect();
  return Math.max(Math.max(58,Math.min(height*.09,125)),footer?.top>0&&footer.top<height?height-footer.top+12:0);
 }
 const height=box=>box.offsetHeight||box.getBoundingClientRect().height||100;
 function layout(){
  let offset=bottom();
  for(const {box} of active){
   box.style.setProperty('--toast-stack-bottom',offset+'px');
   offset+=height(box)+gap;
  }
  return offset;
 }
 function measure(box){
  const visibility=box.style.visibility;
  box.style.visibility='hidden';box.hidden=false;
  const size=height(box);
  box.hidden=true;box.style.visibility=visibility;
  return size;
 }
 function drain(){
  if(draining)return;draining=true;
  try{
   while(waiting.length){
    const entry=waiting[0];
    if(!entry.box.isConnected){waiting.shift();continue;}
    if(active.length&&layout()+measure(entry.box)>viewport()-12)break;
    waiting.shift();
    entry.box.style.setProperty('--toast-stack-bottom',layout()+'px');
    active.push(entry);entry.box.hidden=false;
    resize?.observe(entry.box);layout();entry.start();
   }
  }finally{draining=false;}
 }
 function release(box){
  for(const list of [active,waiting]){
   const index=list.findIndex(entry=>entry.box===box);
   if(index>=0)list.splice(index,1);
  }
  resize?.unobserve(box);layout();drain();
 }
 function present(box,start){
  release(box);box.classList.add('toast-stacked');box.hidden=true;
  waiting.push({box,start});drain();
 }
 function reflow(){layout();drain();}
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(reflow):null;
 window.addEventListener('resize',reflow);
 window.KCToastStack=Object.freeze({present,release,reflow});
})();
