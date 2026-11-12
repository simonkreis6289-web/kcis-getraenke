/* Gemessene Seiten statt Scrollflächen; App und Dashboard verwenden dieselbe Aufteilung. */
(() => {
 const model=window.KCClubContent;
 function create(root,{notes=false,penalties=false,controls=false,onPage}={}){
  let source=notes?[]:penalties?{schema:1,groups:[]}:'' ,pages=[source],index=0,stamp='',frame=0,editing=false,disposed=false,laidOut=false,pendingTurn=0,targetNote='';
  const body=root.querySelector('[data-content-body]'),measure=root.querySelector('[data-content-measure]'),label=root.querySelector('[data-content-page]'),prev=root.querySelector('[data-content-prev]'),next=root.querySelector('[data-content-next]');
  function paint(){body.innerHTML=penalties?window.KCPenaltyTable.markup(pages[index]):notes?pages[index].map(f=>model.noteMarkup(f.note,f.text,f.continued,controls)).join('')||'<p class="club-content-empty">Noch keine Notizen. Über „Neue Notiz“ einen Eintrag anlegen.</p>':model.statutesMarkup(pages[index],{before:source.slice(0,pages.slice(0,index).join('').length)});label.textContent='Seite '+(index+1)+' von '+pages.length;prev.disabled=index===0;next.disabled=index===pages.length-1;onPage?.(index,pages.length);}
  function fits(html){measure.innerHTML=html;return measure.scrollHeight<=measure.clientHeight+1&&measure.scrollWidth<=measure.clientWidth+1;}
  function layout(){
   frame=0;if(disposed||!body.clientWidth||!body.clientHeight||editing)return;
   measure.style.width=body.clientWidth+'px';measure.style.height=body.clientHeight+'px';
   pages=penalties?window.KCPenaltyTable.pages(source,fits):notes?model.notePages(source,rows=>fits(rows.map(f=>model.noteMarkup(f.note,f.text,f.continued,controls)).join(''))):model.statutesPages(source,fits);
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
 function editor(root,{onInput,formatted=false}={}){
  const input=root.querySelector('textarea'),measure=root.querySelector('[data-editor-measure]'),label=root.querySelector('[data-editor-page]'),prev=root.querySelector('[data-editor-prev]'),next=root.querySelector('[data-editor-next]'),preview=root.querySelector('[data-editor-preview]');
  let text='',chunks=[''],page=0,frame=0,composing=false,previewing=false,busy=false,beforeInput=null,undo=[],redo=[];
  const offset=()=>chunks.slice(0,page).join('').length;
  function snapshot(){const n=offset();return {text,start:n+(input.selectionStart||0),end:n+(input.selectionEnd??input.selectionStart??0)};}
  function split(){
   if(!input.clientWidth||!input.clientHeight)return;
   measure.style.width=input.clientWidth+'px';measure.style.height=input.clientHeight+'px';measure.classList.toggle('is-document-preview',previewing);
   chunks=previewing?model.statutesPages(text,html=>{measure.innerHTML=html;return measure.scrollHeight<=measure.clientHeight&&measure.scrollWidth<=measure.clientWidth;}):model.textPages(text,value=>{measure.textContent=value+'\u200b';return measure.scrollHeight<=measure.clientHeight&&measure.scrollWidth<=measure.clientWidth;});
  }
  function tools(){for(const b of root.querySelectorAll('[data-editor-command]')){const action=b.dataset.editorCommand;b.disabled=busy||(previewing&&!['preview','undo','redo'].includes(action))||(action==='undo'&&!undo.length)||(action==='redo'&&!redo.length);if(action==='preview'){b.setAttribute('aria-pressed',String(previewing));b.textContent=previewing?'✏️ Weiter bearbeiten':'◉ Vorschau';}}}
  function paint(){
   page=Math.max(0,Math.min(page,chunks.length-1));input.value=chunks[page];input.scrollTop=0;input.scrollLeft=0;
   root.classList.toggle('is-previewing',previewing);input.tabIndex=previewing?-1:0;if(preview){preview.hidden=!previewing;if(previewing)preview.innerHTML=model.statutesMarkup(chunks[page],{before:text.slice(0,offset())});}
   label.textContent='Seite '+(page+1)+' von '+chunks.length;prev.disabled=page===0;next.disabled=page===chunks.length-1;tools();
  }
  function reveal(state,focus=false){
   split();let total=0;page=chunks.findIndex((chunk,i)=>state.start<=total+chunk.length||i===chunks.length-1?true:(total+=chunk.length,false));paint();
   const a=Math.max(0,Math.min(chunks[page].length,state.start-total)),b=Math.max(a,Math.min(chunks[page].length,state.end-total));input.setSelectionRange(a,b);if(focus&&!previewing)input.focus();
  }
  function remember(state){if(!formatted)return;if(undo.at(-1)?.text!==state.text)undo.push(state);undo=undo.slice(-80);redo=[];}
  function apply(result,previous=snapshot()){
   if(!result||busy||result.text===text)return;remember(previous);text=result.text;reveal(result,true);onInput?.(text);
  }
  function history(back){if(busy)return;const from=back?undo:redo,to=back?redo:undo;if(!from.length)return;to.push(snapshot());const value=from.pop();text=value.text;reveal(value,true);onInput?.(text);}
  function command(action){
   if(busy||composing)return;
   if(action==='undo'||action==='redo'){history(action==='undo');return;}
   if(action==='preview'&&preview){const current=snapshot();previewing=!previewing;reveal(current,!previewing);return;}
   if(previewing)return;const current=snapshot();apply(model.editStatutes(text,current.start,current.end,action),current);
  }
  function reflow(){frame=0;if(composing)return;const current=snapshot();reveal(current,document.activeElement===input);}
  function schedule(){if(!frame)frame=requestAnimationFrame(reflow);}
  input.addEventListener('beforeinput',event=>{if(!formatted)return;if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();history(event.inputType==='historyUndo');}else beforeInput=snapshot();});
  input.addEventListener('input',event=>{
   if(event.isComposing||composing)return;const prior=beforeInput||snapshot(),n=offset(),start=n+(input.selectionStart||0),end=n+(input.selectionEnd??input.selectionStart??0);beforeInput=null;chunks[page]=input.value;const changed=chunks.join('');if(changed!==text)remember({...prior,text});text=changed;reveal({start,end});onInput?.(text);
  });
  input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;input.dispatchEvent(new Event('input'));});
  if(formatted){
   input.addEventListener('keydown',event=>{
    if(event.isComposing||composing||busy)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();history(!event.shiftKey);return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();history(false);return;}
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key==='Tab'){event.preventDefault();command(event.shiftKey?'outdent':'indent');}
    if(event.key==='Enter'&&!event.shiftKey){const current=snapshot(),result=model.editStatutes(text,current.start,current.end,'enter');if(result){event.preventDefault();apply(result,current);}}
   });
   root.addEventListener('mousedown',event=>{if(event.target.closest('[data-editor-command]'))event.preventDefault();});
   root.addEventListener('click',event=>{const b=event.target.closest('[data-editor-command]');if(b&&!b.disabled)command(b.dataset.editorCommand);});
  }
  function turn(delta){page=Math.max(0,Math.min(chunks.length-1,page+delta));paint();if(!previewing){input.focus();input.setSelectionRange(0,0);}}
  prev.addEventListener('click',()=>turn(-1));next.addEventListener('click',()=>turn(1));
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(input);window.addEventListener('resize',schedule);document.fonts?.ready?.then(schedule);document.fonts?.addEventListener('loadingdone',schedule);
  return {open(value){text=value;chunks=[value];page=0;previewing=false;undo=[];redo=[];beforeInput=null;input.setSelectionRange(0,0);schedule();},schedule,get text(){return text;},focus(){input.focus();input.setSelectionRange(0,0);},setBusy(value){busy=value;input.readOnly=value;tools();}};
 }
 window.KCContentPager=Object.freeze({create,editor});
})();
