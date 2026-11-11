/* Dauerhafte Clubunterlagen; unabhängig von Abrechnung und Kegelabend. */
(() => {
 const placeholder='Satzung des Kegelclubs\n\nPlatzhalter\n\nHier kann die Satzung des Clubs eingetragen werden. Über „Satzung bearbeiten“ lässt sich dieser Text jederzeit ersetzen und ergänzen.';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const validId=id=>typeof id==='string'&&/^note_[a-zA-Z0-9_-]{1,100}$/.test(id);
 const sort=items=>(Array.isArray(items)?items:[]).filter(item=>item&&validId(item.id)&&typeof item.text==='string'&&Number.isFinite(Date.parse(item.createdAt))).slice().sort((a,b)=>Number(a.done)-Number(b.done)||Date.parse(a.createdAt)-Date.parse(b.createdAt)||a.id.localeCompare(b.id));
 function value(kind,data){return kind==='notes'?{items:sort(data?.items),revision:Number(data?.revision)||0}:{text:typeof data?.text==='string'?data.text:placeholder,revision:Number(data?.revision)||0};}
 function change(kind,before,request,now=new Date().toISOString()){
  if(!['notes','statutes'].includes(kind)||!/^content_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||'')||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)throw Error('Ungültige Änderung.');
  if((before?.commands||[]).includes(request.opId))return before;
  const current=value(kind,before);if(current.revision!==request.expectedRevision)throw Error('Inzwischen geändert. Bitte den aktuellen Stand prüfen und erneut speichern.');
  let result;
  if(kind==='notes'){
   let items=current.items;
   if(request.action==='add'){
    if(!validId(request.id)||typeof request.text!=='string'||!request.text.trim()||request.text.length>10000)throw Error('Bitte eine Notiz mit 1 bis 10.000 Zeichen eingeben.');
    if(items.some(n=>n.id===request.id))throw Error('Diese Notiz ist bereits gespeichert.');
    items=[...items,{id:request.id,text:request.text.trim(),done:false,createdAt:now}];
   }else if(['done','delete'].includes(request.action)){
    if(!validId(request.id)||!items.some(n=>n.id===request.id)||request.action==='done'&&typeof request.done!=='boolean')throw Error('Notiz nicht gefunden. Bitte die Liste aktualisieren.');
    items=request.action==='delete'?items.filter(n=>n.id!==request.id):items.map(n=>n.id===request.id?{...n,done:request.done}:n);
   }else throw Error('Unbekannte Notizaktion.');
   if(items.length>1000||items.reduce((n,item)=>n+item.text.length,0)>180000)throw Error('Die Notizsammlung ist voll. Bitte alte Einträge löschen.');
   result={items:sort(items)};
  }else{
   if(request.action!=='save'||typeof request.text!=='string'||request.text.length>100000)throw Error('Die Satzung darf höchstens 100.000 Zeichen enthalten.');
   result={text:request.text};
  }
  return {...result,revision:current.revision+1,commands:[...(before?.commands||[]),request.opId].slice(-128),changedAt:now};
 }
 function view(before,request){
  if(!['open','close','turn'].includes(request.action)||!['notes','statutes'].includes(request.kind)||!/^content_[a-zA-Z0-9_-]{1,100}$/.test(request.opId||'')||!Number.isSafeInteger(request.expectedRevision)||request.expectedRevision<0)throw Error('Ungültige Dashboard-Ansicht.');
  if((before?.commands||[]).includes(request.opId))return before;
  if(Number(before?.revision||0)!==request.expectedRevision)throw Error('Die Dashboard-Ansicht wurde inzwischen geändert. Bitte erneut versuchen.');
  if(request.action!=='open'&&(!before?.open||before.kind!==request.kind))throw Error('Diese Ansicht ist auf dem Dashboard bereits geschlossen.');
  if(request.action==='turn'&&![1,-1].includes(request.delta))throw Error('Ungültiger Seitenwechsel.');
  return {open:request.action!=='close',kind:request.kind,session:request.action==='open'?request.opId:before.session,turn:request.action==='open'?0:Number(before.turn||0)+(request.action==='turn'?1:0),delta:request.action==='turn'?request.delta:0,revision:Number(before?.revision||0)+1,commands:[...(before?.commands||[]),request.opId].slice(-128)};
 }
 function noteMarkup(note,text,continued=false,controls=true){return '<article class="club-note'+(note.done?' is-done':'')+'"><div class="club-note-heading">'+(controls?'<label class="club-note-check"><input type="checkbox" data-note-done="'+esc(note.id)+'" '+(note.done?'checked':'')+' aria-label="Notiz '+(note.done?'wieder öffnen':'abhaken')+'"><span>'+(note.done?'Erledigt':'Offen')+'</span></label>':'<strong>'+(note.done?'✓ Erledigt':'○ Offen')+'</strong>')+'<time datetime="'+esc(note.createdAt)+'">'+esc(new Date(note.createdAt).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'}))+(continued?' · Fortsetzung':'')+'</time>'+(controls?'<button type="button" class="club-note-delete" data-note-delete="'+esc(note.id)+'" aria-label="Notiz löschen">Löschen</button>':'')+'</div><div class="club-note-text">'+esc(text)+'</div></article>';}
 // Wortgrenzen bevorzugen, sämtliche Zeichen erhalten (auch Leerzeilen und Emoji).
 function take(text,fits){
  if(fits(text))return text.length;
  let low=0,high=text.length;
  while(low<high){let end=Math.ceil((low+high)/2);if(fits(text.slice(0,end)))low=end;else high=end-1;}
  if(low>0&&/[\uD800-\uDBFF]/.test(text[low-1])&&/[\uDC00-\uDFFF]/.test(text[low]||''))low--;
  if(low<1)low=/[\uD800-\uDBFF]/.test(text[0])?2:1;
  const prefix=text.slice(0,low),boundary=Math.max(prefix.lastIndexOf('\n'),prefix.lastIndexOf(' '));return boundary>low*.65?boundary+1:low;
 }
 function textPages(text,fits){if(!text)return [''];const pages=[];for(let offset=0;offset<text.length;){const count=take(text.slice(offset),fits);pages.push(text.slice(offset,offset+count));offset+=count;}return pages;}
 function notePages(items,fits){
  const pages=[];let page=[];
  for(const note of sort(items)){let rest=note.text,offset=0;do{
   const fragment={note,text:rest,continued:offset>0};
   if(fits([...page,fragment])){page.push(fragment);break;}
   if(page.length){pages.push(page);page=[];continue;}
   const count=take(rest,text=>fits([{...fragment,text}]));page.push({...fragment,text:rest.slice(0,count)});rest=rest.slice(count);offset+=count;
   if(rest){pages.push(page);page=[];}
  }while(rest);}
  if(page.length)pages.push(page);return pages.length?pages:[[]];
 }
 window.KCClubContent=Object.freeze({placeholder,esc,sort,value,change,view,noteMarkup,take,textPages,notePages});
})();
