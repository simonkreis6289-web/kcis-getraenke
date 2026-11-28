/* Local successful mutations only: no subscription or reload observers. */
(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=c=>(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 let timer=0,frame=0,host=null,scope='',pending=new Map(),seen=new Set();
 function row(root,p){
  const amounts=window.KCGameFinePolicy?.tableAmounts(p,root)||{freeCents:0,extrasCents:0};
  return [...(root.STRAFEN||[]).map(s=>({key:s.key,label:s.label,value:Number(p.strafen?.[s.key])||0,cents:(Number(p.strafen?.[s.key])||0)*Math.round((Number(root.strafPrices?.[s.key])||0)*100),count:true})),
   {key:'free',label:'Freie Beträge',value:amounts.freeCents},
   {key:'extras',label:'Extras',value:amounts.extrasCents},
   {key:'total',label:'Gesamt',value:Math.round((Number(p.strafTotal)||0)*100)}];
 }
 function diff(before,after){
  if(!before||!after||before.currentEveningStartedAt!==after.currentEveningStartedAt||before.eveningResetOp!==after.eveningResetOp)return [];
  const changes=[];
  for(const p of after.persons||[]){const old=(before.persons||[]).find(x=>x.name===p.name);if(!old)continue;
   const a=row(before,old),b=row(after,p),columns=b.map((x,i)=>({...x,before:a.find(y=>y.key===x.key)?.value??x.value}));
   if(!columns.some(x=>x.key!=='total'&&x.before!==x.value))continue;
   changes.push({name:p.name,person:p,columns,delta:Math.round(((Number(p.strafTotal)||0)-(Number(old.strafTotal)||0))*100),categories:columns.filter(x=>x.key!=='total'&&x.before!==x.value).map(x=>x.label)});
  }return changes;
 }
 function show(){
  if(!pending.size)return;clearTimeout(timer);cancelAnimationFrame(frame);
  host ||= Object.assign(document.createElement('div'),{id:'penalty-booking-toasts',className:'penalty-booking-toasts'});
  host.setAttribute('role','status');host.setAttribute('aria-live','polite');host.style.pointerEvents='none';if(!host.isConnected)document.body.append(host);
  const rows=[...pending.values()],visible=rows.slice(0,6);host.innerHTML=visible.map(r=>{
   const color=window.KCPlayerColors?.forPerson?.(r.person)||r.person.playerColor||'#4e77a8',safeColor=/^#[0-9a-f]{6}$/i.test(color)?color:'#4e77a8';
   const avatar=typeof getAvatarHtml==='function'?getAvatarHtml(r.name):'';
   return '<article class="penalty-booking-card" style="--booking-color:'+safeColor+'"><div class="penalty-booking-person">'+avatar+'<strong>'+esc(r.name)+'</strong><span>'+(r.delta>0?'+':'')+money(r.delta)+' · '+esc(r.categories.join(', '))+'</span></div><div class="penalty-booking-columns">'+r.columns.map(c=>'<div class="'+(c.before!==c.value?'is-changed':'')+'"><small>'+esc(c.label)+'</small><b data-booking-from="'+c.before+'" data-booking-to="'+c.value+'" data-booking-count="'+!!c.count+'">'+esc(c.count?c.before:money(c.before))+'</b></div>').join('')+'</div></article>';
  }).join('')+(rows.length>6?'<p>Weitere '+(rows.length-6)+' Spieler gebucht · Gesamt '+money(rows.reduce((n,r)=>n+r.delta,0))+'</p>':'');
  const started=performance.now(),reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const tick=now=>{const t=reduce?1:Math.min(1,(now-started)/850),ease=1-Math.pow(1-t,3);for(const el of host.querySelectorAll('[data-booking-to]')){const n=Number(el.dataset.bookingFrom)+(Number(el.dataset.bookingTo)-Number(el.dataset.bookingFrom))*ease;el.textContent=el.dataset.bookingCount==='true'?String(Math.round(n)):money(Math.round(n));}if(t<1)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);timer=setTimeout(()=>{host?.remove();for(const r of visible)pending.delete(r.name);if(pending.size)show();},2700);
 }
 function committed(before,after){
  try{
  const nextScope=String(typeof ACTIVE_CLUB==='undefined'?'':ACTIVE_CLUB)+'|'+(after?.currentEveningStartedAt||'');
  if(scope!==nextScope){pending.clear();seen.clear();scope=nextScope;}
  const token=after?.tabletSequence!==before?.tabletSequence?'tablet:'+after?.tabletSequence:after?.syncOperation?'sync:'+after.syncOperation:'';if(token&&seen.has(token))return;
  const changes=diff(before,after);if(!changes.length)return;
  if(token){seen.add(token);if(seen.size>128)seen.delete(seen.values().next().value);}
  for(const change of changes){const old=pending.get(change.name);if(old){change.columns=change.columns.map(c=>({...c,before:old.columns.find(x=>x.key===c.key)?.before??c.before}));change.delta+=old.delta;change.categories=[...new Set([...old.categories,...change.categories])];}pending.set(change.name,change);}
  show();
  }catch(error){console.warn('Buchungsanzeige konnte nicht gezeichnet werden',error);}
 }
 window.KCPenaltyBookingToasts=Object.freeze({row,diff,committed});
})();
