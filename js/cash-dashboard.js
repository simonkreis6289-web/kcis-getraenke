/* Vollflächige Dashboard-Jahresübersicht, unabhängig von den seitlichen Spieltabellen. */
(() => {
 let currentClub='',unsubscribe=null,entries=null,error='',currentState=null,signature='',generation=0,frame=0;
 const box=()=>document.getElementById('cash-dashboard-overlay');
 function fit(){
  frame=0;const overlay=box(),area=document.getElementById('cash-dashboard-scroll'),table=area?.querySelector('table');if(!overlay||overlay.hidden||!table||!area.clientWidth||!area.clientHeight)return;
  const style=getComputedStyle(area),roomW=area.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-4,roomH=area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-4;
  table.style.zoom='1';let factor=1;
  for(let i=0;i<4;i++){const rect=table.getBoundingClientRect(),ratio=Math.min(1,roomW/Math.max(1,rect.width),roomH/Math.max(1,rect.height));if(ratio>=.999)break;factor*=ratio*.99;table.style.zoom=String(factor);}
 }

 function schedule(){if(!frame)frame=requestAnimationFrame(fit);}
 function reset(){generation++;unsubscribe?.();unsubscribe=null;entries=null;currentClub='';currentState=null;signature='';error='';render();}
 function render(){
  const overlay=box();if(!overlay)return;const visible=!!currentState?.dashboardCashView?.open;overlay.hidden=!visible;
  const main=document.querySelector('main.dashboard'),rules=!!document.getElementById('dashboard-rules-overlay')&&!document.getElementById('dashboard-rules-overlay').hidden;
  if(main){main.toggleAttribute('inert',visible||rules);if(visible||rules)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}
  if(!visible){signature='';return;}
  const area=document.getElementById('cash-dashboard-scroll');
  if(entries===null||error){area.textContent=error||'Jahresübersicht wird geladen …';document.getElementById('cash-dashboard-summary').replaceChildren();document.getElementById('cash-dashboard-period').textContent='';signature='';return;}
  const m=window.KCCashOverview.model(entries.filter(e=>e.category==='strafen'),currentState.cashBookSettings,entries.filter(e=>e.category==='expense'),currentState.persons||[],currentState.cashStandingOrders),stamp=JSON.stringify(m);
  if(signature===stamp)return;signature=stamp;document.getElementById('cash-dashboard-summary').innerHTML=window.KCCashOverview.summary(m);area.innerHTML=window.KCCashOverview.table(m);document.getElementById('cash-dashboard-period').textContent=m.period;schedule();
 }
 function update(state,club){
  if(!state?.dashboardCashView?.open){if(currentClub||currentState)reset();else render();return;}
  if(currentClub!==club){reset();currentClub=club;currentState=state;const epoch=generation;
   if(!window.firestoreApi?.subscribeCashBookEntries){error='Archivzugriff nicht verfügbar. Dashboard bitte aktualisieren.';render();return;}
   try{unsubscribe=window.firestoreApi.subscribeCashBookEntries(club,values=>{if(epoch!==generation||club!==currentClub)return;entries=values;error='';render();},()=>{if(epoch!==generation)return;error='Archiv konnte nicht geladen werden. Ansicht in der App schließen und erneut öffnen.';render();});}catch(e){error='Archiv konnte nicht geladen werden. Ansicht in der App schließen und erneut öffnen.';}
  }
  currentState=state;render();
 }
 window.KCCashDashboard=Object.freeze({update,reset,fit});window.addEventListener('resize',schedule);document.addEventListener('fullscreenchange',schedule);document.fonts?.ready?.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
 if(typeof ResizeObserver==='function'){const area=document.getElementById('cash-dashboard-scroll');if(area)new ResizeObserver(schedule).observe(area);}
 setInterval(()=>{if(currentState?.dashboardCashView?.open)render();},60000);
})();
