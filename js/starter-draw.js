/* Ein gemeinsamer Zeitablauf spiegelt die Auslosung ohne Firestore-Schreibzugriff pro Bild. */
(() => {
 function frame(draw,now=Date.now()){
  if(!draw||!Array.isArray(draw.frames)||!draw.frames.length)return null;
  const age=now-Number(draw.startedAt),duration=Number(draw.steps)*Number(draw.interval);
  if(!Number.isFinite(age)||age<0||age>duration+6500)return null;
  const done=age>=duration,index=Math.floor(age/Number(draw.interval));
  return {done,index,value:done?String(draw.winner):String(draw.frames[index%draw.frames.length]),title:String(draw.title||'Auslosung'),kind:draw.kind==='team'?'team':'player'};
 }
 window.KCStarterDraw=Object.freeze({frame});
})();
function beginDashboardDraw(config){
 const draw={...config,frames:config.frames.map(String),id:crypto.randomUUID?.()||String(Date.now()),startedAt:Date.now()};
 window.kcDashboardDraw=draw;
 if(typeof persistState==='function')persistState();
 return draw;
}
function cancelDashboardDraw(id){
 if(window.kcDashboardDraw?.id!==id)return;
 window.kcDashboardDraw=null;
 if(typeof persistState==='function')persistState();
}
function paintDashboardDraw(draw){
 const host=document.getElementById('tv-starter-draw');if(!host)return;
 const frame=window.KCStarterDraw.frame(draw);
 host.hidden=!frame;if(!frame)return;
 host.classList.toggle('is-running',!frame.done);host.dataset.kind=frame.kind;
 document.getElementById('tv-draw-title').textContent=frame.title;
 document.getElementById('tv-draw-value').textContent=frame.value;
 document.getElementById('tv-draw-status').textContent=frame.done?'🎉 '+frame.value+' beginnt!':'Auslosung läuft …';
}
