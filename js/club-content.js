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
 // Die Satzung bleibt als Klartext gespeichert; die Darstellung formatiert Abschnitte und Listen sicher.
 function statuteLine(raw){
  const indent=(raw.match(/^[\t ]*/)||[''])[0],depth=Math.min(6,[...indent].reduce((n,c)=>n+(c==='\t'?4:1),0)/4),line=raw.slice(indent.length).replace(/\r?\n$/,'');
  const list=line.match(/^(?:(\d+)[.)]|([-*+•–]))[\t ]+(.*)$/);
  return {raw,depth,kind:!line.trim()?'blank':/^(?:§\s*\d+|#{1,3}\s)/.test(line)?'heading':list?'list':'paragraph',text:list?list[3]:line.replace(/^#{1,3}\s+/,''),marker:list?(list[1]?list[1]+'.':'•'):'',ordered:!!list?.[1]};
 }
 function statutesMarkup(text,{before=''}={}){
  const lines=String(text).match(/[^\n]*\n|[^\n]+$/g)||[],prefix=before.slice(before.lastIndexOf('\n')+1),continued=prefix?statuteLine(prefix):null;
  let html='',list='',listDepth=-1;
  const close=()=>{if(list){html+='</'+list+'>';list='';}};
  for(let i=0;i<lines.length;i++){
   let row=statuteLine(lines[i]);if(i===0&&continued){row={...row,kind:continued.kind==='blank'?'paragraph':continued.kind,depth:continued.depth,ordered:continued.ordered,marker:'',continued:true,text:lines[i].replace(/\r?\n$/,'')};}
   if(row.kind==='blank'){close();if(html&&!html.endsWith('<div class="statutes-gap" aria-hidden="true"></div>'))html+='<div class="statutes-gap" aria-hidden="true"></div>';continue;}
   const style=' style="--statute-indent:'+row.depth+'"';
   if(row.kind==='list'){
    const tag=row.ordered?'ol':'ul';if(list!==tag||listDepth!==row.depth||row.continued){close();list=tag;listDepth=row.depth;html+='<'+tag+' class="statutes-list"'+style+'>';}
    html+='<li'+(row.ordered&&!row.continued?' value="'+Number.parseInt(row.marker,10)+'"':'')+(row.continued?' class="is-continuation"':'')+'>'+esc(row.text)+'</li>';
   }else{close();const tag=row.kind==='heading'&&!row.continued?'h3':'p';html+='<'+tag+' class="statutes-'+(tag==='h3'?'heading':'paragraph')+'"'+style+'>'+esc(row.text)+'</'+tag+'>';}
  }
  close();return '<article class="club-statutes-text club-statutes-document">'+(html||'<p class="club-content-empty">Noch keine Satzung eingetragen.</p>')+'</article>';
 }
 function statutesPages(text,fits){
  if(!text)return [''];const pages=[];let offset=0;
  while(offset<text.length){
   const rest=text.slice(offset),before=text.slice(0,offset);let count=take(rest,part=>fits(statutesMarkup(part,{before})));
   // Eine neue Abschnittsüberschrift möglichst zusammen mit ihrem ersten Absatz auf der nächsten Seite zeigen.
   const part=rest.slice(0,count),last=part.match(/(?:^|\n)([\t ]*(?:§\s*\d+|#{1,3}\s)[^\n]*\n?[\t \n]*)$/);
   if(last&&last.index>0&&part.slice(0,last.index).trim())count=last.index+1;
   pages.push(rest.slice(0,count));offset+=count;
  }
  return pages;
 }
 function editStatutes(text,start,end,action){
  start=Math.max(0,Math.min(start,text.length));end=Math.max(start,Math.min(end,text.length));
  if(action==='enter'){
   const a=(start===0?0:text.lastIndexOf('\n',start-1)+1),line=text.slice(a,start),match=line.match(/^([\t ]*)(?:(\d+)([.)])|([-*+•–]))[\t ]+(.*)$/);
   if(!match)return null;
   if(!match[5].trim()&&end===start){const value=text.slice(0,a)+text.slice(end);return {text:value,start:a,end:a};}
   const insert='\n'+match[1]+(match[2]?String(Number(match[2])+1)+match[3]:match[4])+' ',value=text.slice(0,start)+insert+text.slice(end);return {text:value,start:start+insert.length,end:start+insert.length};
  }
  const a=(start===0?0:text.lastIndexOf('\n',start-1)+1),anchor=end>start&&text[end-1]==='\n'?end-1:end,b=text.indexOf('\n',anchor),stop=b<0?text.length:b,lines=text.slice(a,stop).split('\n'),allBullets=lines.every(line=>/^[\t ]*[-*+•–][\t ]+/.test(line)),allNumbers=lines.every(line=>/^[\t ]*\d+[.)][\t ]+/.test(line));
  let number=1,heading=1;for(const m of text.slice(0,a).matchAll(/^\s*§\s*(\d+)/gm))heading=Math.max(heading,Number(m[1])+1);
  const changes=lines.map(line=>{
   const indent=(line.match(/^[\t ]*/)||[''])[0],body=line.slice(indent.length),plain=body.replace(/^(?:[-*+•–]|\d+[.)])[\t ]+/,''),old=line;
   if(action==='indent')line='\t'+line;
   else if(action==='outdent')line=line.replace(/^(?:\t| {1,4})/,'');
   else if(action==='bullet')line=indent+(allBullets?plain:'• '+plain);
   else if(action==='number')line=indent+(allNumbers?plain:(number++)+'. '+plain);
   else if(action==='heading')line=indent+(/^§\s*\d+/.test(body)?body.replace(/^§\s*\d+\s*[–—-]?\s*/,''):'§ '+(heading++)+' – '+plain);
   return {old,line,delta:line.length-old.length};
  });
  const replacement=changes.map(c=>c.line).join('\n'),value=text.slice(0,a)+replacement+text.slice(stop);
  if(start===end){const caret=Math.max(a,Math.min(a+replacement.length,start+changes[0].delta));return {text:value,start:caret,end:caret};}
  return {text:value,start:a,end:a+replacement.length};
 }

 window.KCClubContent=Object.freeze({placeholder,esc,sort,value,change,view,noteMarkup,take,textPages,notePages,statuteLine,statutesMarkup,statutesPages,editStatutes});
})();
