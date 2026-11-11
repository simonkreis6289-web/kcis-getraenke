/* Gemessene Seiten statt Scrollflächen; App und Dashboard verwenden dieselbe Aufteilung. */
(() => {
 const model=window.KCClubContent;
 function create(root,{notes=false,controls=false,onPage}={}){
  let source=notes?[]:'',pages=[notes?[]:''],index=0,stamp='',frame=0,editing=false,disposed=false,laidOut=false,pendingTurn=0,targetNote='';
  const body=root.querySelector('[data-content-body]'),measure=root.querySelector('[data-content-measure]'),label=root.querySelector('[data-content-page]'),prev=root.querySelector('[data-content-prev]'),next=root.querySelector('[data-content-next]');
  function paint(){body.innerHTML=notes?pages[index].map(f=>model.noteMarkup(f.note,f.text,f.continued,controls)).join('')||'<p class="club-content-empty">Noch keine Notizen. Über „Neue Notiz“ einen Eintrag anlegen.</p>':'<div class="club-statutes-text">'+model.esc(pages[index])+'</div>';label.textContent='Seite '+(index+1)+' von '+pages.length;prev.disabled=index===0;next.disabled=index===pages.length-1;onPage?.(index,pages.length);}
  function fits(html){measure.innerHTML=html;return measure.scrollHeight<=measure.clientHeight+1&&measure.scrollWidth<=measure.clientWidth+1;}
  function layout(){
   frame=0;if(disposed||!body.clientWidth||!body.clientHeight||editing)return;
   measure.style.width=body.clientWidth+'px';measure.style.height=body.clientHeight+'px';
   pages=notes?model.notePages(source,rows=>fits(rows.map(f=>model.noteMarkup(f.note,f.text,f.continued,controls)).join(''))):model.textPages(source,text=>fits('<div class="club-statutes-text">'+model.esc(text)+'</div>'));
   if(targetNote&&notes){const found=pages.findIndex(page=>page.some(f=>f.note.id===targetNote));if(found>=0)index=found;targetNote='';}
   index=Math.max(0,Math.min(index+pendingTurn,pages.length-1));pendingTurn=0;laidOut=true;paint();
  }
  function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(layout);}
  function update(value,reset=false){const key=JSON.stringify(value);if(key!==stamp||reset){source=value;stamp=key;if(reset)index=0;schedule();}}
  function turn(delta){if(!laidOut){pendingTurn+=delta;return;}index=Math.max(0,Math.min(pages.length-1,index+delta));paint();}
  const back=()=>turn(-1),forward=()=>turn(1);prev.addEventListener('click',back);next.addEventListener('click',forward);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(body);window.addEventListener('resize',schedule);document.fonts?.ready?.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
  return {update,layout,schedule,turn,showNote(id){targetNote=id;schedule();},reset(){index=0;stamp='';laidOut=false;pendingTurn=0;targetNote='';},destroy(){disposed=true;observer?.disconnect();if(frame)cancelAnimationFrame(frame);prev.removeEventListener('click',back);next.removeEventListener('click',forward);window.removeEventListener('resize',schedule);document.fonts?.removeEventListener('loadingdone',schedule);},get page(){return index;},get count(){return pages.length;},pause(value){const was=editing;editing=value;if(was&&!value)schedule();}};
 }
 function editor(root,{onInput}={}){
  const input=root.querySelector('textarea'),measure=root.querySelector('[data-editor-measure]'),label=root.querySelector('[data-editor-page]'),prev=root.querySelector('[data-editor-prev]'),next=root.querySelector('[data-editor-next]');let text='',chunks=[''],page=0,frame=0,composing=false;
  function split(){
   if(!input.clientWidth||!input.clientHeight)return;
   measure.style.width=input.clientWidth+'px';measure.style.height=input.clientHeight+'px';
   chunks=model.textPages(text,value=>{measure.textContent=value+'\u200b';return measure.scrollHeight<=measure.clientHeight&&measure.scrollWidth<=measure.clientWidth;});
  }
  function paint(){page=Math.min(page,chunks.length-1);input.value=chunks[page];input.scrollTop=0;input.scrollLeft=0;label.textContent='Seite '+(page+1)+' von '+chunks.length;prev.disabled=page===0;next.disabled=page===chunks.length-1;}
  function reflow(){frame=0;if(composing)return;const focused=document.activeElement===input,offset=chunks.slice(0,page).join('').length+input.selectionStart;split();if(focused){let n=0;page=chunks.findIndex((chunk,i)=>offset<=n+chunk.length||i===chunks.length-1?(true):(n+=chunk.length,false));paint();input.setSelectionRange(Math.max(0,offset-n),Math.max(0,offset-n));}else paint();}
  function schedule(){if(!frame)frame=requestAnimationFrame(reflow);}
  input.addEventListener('input',event=>{if(event.isComposing)return;const offset=chunks.slice(0,page).join('').length,caret=offset+input.selectionStart;chunks[page]=input.value;text=chunks.join('');split();let total=0;page=chunks.findIndex((chunk,i)=>caret<total+chunk.length||i===chunks.length-1?true:(total+=chunk.length,false));paint();input.setSelectionRange(Math.max(0,caret-total),Math.max(0,caret-total));onInput?.(text);});
  input.addEventListener('compositionstart',()=>{composing=true;});
  input.addEventListener('compositionend',()=>{composing=false;input.dispatchEvent(new Event('input'));});
  function turn(delta){page=Math.max(0,Math.min(chunks.length-1,page+delta));paint();input.focus();input.setSelectionRange(0,0);}
  prev.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(input);window.addEventListener('resize',schedule);document.fonts?.ready?.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
  return {open(value){text=value;chunks=[value];page=0;schedule();},schedule,get text(){return text;},focus(){input.focus();input.setSelectionRange(0,0);}};
 }
 window.KCContentPager=Object.freeze({create,editor});
})();
