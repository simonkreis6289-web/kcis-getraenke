/* Shared compact scoreboard; the TV never writes counter values. */
(()=>{
 const M=window.KCEveningCounters;
 if(!M)return;
 const pin='<path d="M10 2h4l-.7 5c0 2 3.7 4 3.7 9 0 3-2 6-5 6s-5-3-5-6c0-5 3.7-7 3.7-9z"/><path d="M10 8h4" stroke="currentColor" stroke-width="1.5" fill="none"/>';
 const dot=(x,y,r=1.6)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'"/>';
 const diamond=[[12,3],[7.5,7.5],[16.5,7.5],[3,12],[12,12],[21,12],[7.5,16.5],[16.5,16.5],[12,21]];
 const icons={
  gutters:'<path d="M4 3L2 21h20L20 3M7 3L6 21M17 3l1 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'+dot(19,15,2.5),
  nines:diamond.map(v=>dot(...v)).join(''),
  wreaths:diamond.filter((_,i)=>i!==4).map(v=>dot(...v)).join('')+'<circle cx="12" cy="12" r="1.8" fill="none" stroke="currentColor"/>',
  throws:'<circle cx="12" cy="12" r="9"/><path d="M8 8h.1M12 6h.1M15 9h.1" stroke="#152334" stroke-width="2.5" stroke-linecap="round"/>',
  pins:pin
 };
 const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">'+icons[k]+'</svg>';
 const markup=()=>M.keys.map(k=>'<div class="kc-counter kc-counter-'+k+'">'+svg(k)+'<span>'+M.labels[k]+'</span><strong data-evening-counter="'+k+'">0</strong></div>').join('');
 function paint(value){
  const counters=M.normalize(value);
  for(const host of document.querySelectorAll('[data-evening-counters]')){
   if(!host.firstElementChild)host.innerHTML=markup();
   for(const el of host.querySelectorAll('[data-evening-counter]')){
    const n=counters[el.dataset.eveningCounter],previous=el.dataset.value;
    if(previous===String(n))continue;
    el.textContent=n.toLocaleString('de-DE');el.dataset.value=String(n);
    if(previous!=null&&n>Number(previous)){el.classList.remove('counter-up');void el.offsetWidth;el.classList.add('counter-up');}
    else el.classList.remove('counter-up');
   }
  }
 }
 function edit(){
  const dialog=document.getElementById('evening-counter-editor');if(!dialog)return;
  dialog.hidden=false;
  const values=M.normalize(eveningCounters),dirty=new Set(),club=ACTIVE_CLUB,evening=currentEveningStartedAt;
  const form=dialog.querySelector('form');form.replaceChildren();
  for(const k of M.keys){
   const row=document.createElement('label');row.className='kc-counter-edit-row';
   const title=document.createElement('span');title.textContent=M.labels[k];const input=document.createElement('input');input.type='number';input.min='0';input.max=String(Number.MAX_SAFE_INTEGER);input.step='1';input.required=true;input.name=k;input.value=String(values[k]);
   const reset=document.createElement('button');reset.type='button';reset.textContent='0';reset.setAttribute('aria-label',M.labels[k]+' zurücksetzen');input.oninput=()=>dirty.add(k);reset.onclick=()=>{input.value='0';dirty.add(k);};row.append(title,input,reset);form.append(row);
  }
  const status=dialog.querySelector('[role=status]');status.textContent='';
  dialog.querySelector('[data-counter-reset]').onclick=()=>{for(const k of M.keys){form.querySelector('input[name="'+k+'"]').value='0';dirty.add(k);}};
  dialog.querySelector('[data-counter-close]').onclick=()=>{dialog.hidden=true;};
  dialog.querySelector('[data-counter-save]').onclick=async()=>{
   if(form.reportValidity&&!form.reportValidity())return;
   // Only explicitly edited fields are overwritten; live counts in other fields survive.
   const next=M.normalize(eveningCounters);
   for(const k of M.keys){const n=Number(form.querySelector('input[name="'+k+'"]').value);if(!Number.isSafeInteger(n)||n<0)return;if(dirty.has(k))next[k]=n;}
   if(ACTIVE_CLUB!==club||currentEveningStartedAt!==evening){status.textContent='Kegelabend gewechselt. Bitte erneut öffnen.';return;}
   if(!window.KCSharedSync?.ready||window.KCSharedSync.inUnit||window.KCSharedSync.working){status.textContent='Keine aktive Synchronisierung oder Buchung läuft.';return;}
   eveningCounterExcluded=M.exclude(getFirestoreState(),KCSharedCore.games,[...dirty]);eveningCounters=next;persistState();paint(eveningCounters);dialog.hidden=true;
  };
 }
 window.KCEveningCounterView=Object.freeze({paint,edit});
})();
