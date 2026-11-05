/* V172: isolated drafts for cancelled and retrospectively recorded evenings. */
(() => {
  const clone=value=>JSON.parse(JSON.stringify(value));
  function amount(value,label,strict=true){
    const text=String(value??0).replace(',','.');
    if(!/^\d+(?:\.\d{1,2})?$/.test(text)){if(strict)throw new Error(label+': gültigen Eurobetrag eingeben');return 0;}
    const cents=Math.round(Number(text)*100);
    if(!Number.isSafeInteger(cents))throw new Error(label+': Betrag ist zu groß');
    return cents;
  }
  function count(value,label,strict=true){
    if(value==='')return 0;
    const n=Number(value??0);
    if(!Number.isSafeInteger(n)||n<0||n>99999){if(strict)throw new Error(label+': ganze Zahl von 0 bis 99999 eingeben');return 0;}
    return n;
  }
  function minutes(value){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value||''))return null;
    const [h,m]=value.split(':').map(Number);return h*60+m;
  }
  function quarters(kind,time,startTime,endTime){
    const value=minutes(time),start=minutes(startTime),end=minutes(endTime);
    if(value===null||start===null||end===null)return 0;
    const absolute=n=>(n<start&&((end<start)||(start>=720&&n<720)))?n+1440:n;
    const delta=kind==='late'?absolute(value)-start:absolute(end)-absolute(value);
    return Math.max(0,Math.ceil(delta/15));
  }
  function create(mode,people,catalog,prices,settings={}){
    return {schema:1,mode,date:'',startTime:settings.startTime||'20:00',endTime:settings.endTime||'23:00',
      monthlyFee:String(settings.monthlyFee||0),limit:String(settings.limit??30),autoGosseKing:true,note:'',laneFee:'',laneExpenseExcluded:false,
      catalog:catalog.map(s=>({key:s.key,label:s.label,price:String(prices[s.key]||0)})),
      rows:people.filter(p=>!p.isDrinksOnly&&(mode!=='cancelled'||!p.isGuest)).map(p=>({
        name:p.name,isGuest:!!p.isGuest,included:!p.inactive&&!p.isGuest,status:'unknown',
        counts:Object.fromEntries(catalog.map(s=>[s.key,0])),normalExtra:'0',onTopExtra:'0',arrivalTime:'',leftEarlyAt:''
      }))};
  }
  function snapshot(draft,{strict=true,today=KCBirthdays.today(),club=''}={}){
    if(strict&&(!KCBirthdays.parse(draft.date)||draft.date>today))throw new Error('Bitte ein gültiges Datum bis heute auswählen');
    const selected=draft.rows.filter(p=>p.included),cancelled=draft.mode==='cancelled';
    if(strict&&!selected.length)throw new Error('Mindestens eine Person auswählen');
    const names=new Set();
    const monthly=cancelled?0:amount(draft.monthlyFee,'Monatsbeitrag',strict),limit=amount(draft.limit,'Strafobergrenze',strict);
    if(strict&&!cancelled&&(minutes(draft.startTime)===null||minutes(draft.endTime)===null))throw new Error('Beginn und Ende als gültige Uhrzeiten eingeben');
    const catalog=draft.catalog.map(s=>({...s,price:amount(s.price,s.label,strict)/100}));
    const late=catalog.find(s=>/verspät|verspaet/i.test(s.label))?.key;
    const early=catalog.find(s=>/früh|frueh/i.test(s.label))?.key;
    const gosse=catalog.find(s=>/gosse|pudel/i.test(s.label)&&!/könig|koenig/i.test(s.label))?.key;
    const rows=selected.map(row=>{
      const name=String(row.name||'').trim(),key=name.toLocaleLowerCase('de');
      if(strict&&(!name||names.has(key)))throw new Error('Namen dürfen nicht leer oder doppelt sein');names.add(key);
      if(strict&&cancelled&&row.isGuest)throw new Error('Ausfallpauschale gilt nur für Clubmitglieder');
      if(strict&&!cancelled&&!['present','excused','unexcused'].includes(row.status))throw new Error('Anwesenheitsstatus für '+name+' auswählen');
      if(strict&&!cancelled&&row.isGuest&&row.status!=='present')throw new Error('Gastkegler bitte anwesend setzen oder abwählen');
      if(strict&&[row.arrivalTime,row.leftEarlyAt].some(t=>t&&minutes(t)===null))throw new Error('Ungültige Ankunfts-/Gehzeit bei '+name);
      const present=!cancelled&&row.status==='present';
      const counts=Object.fromEntries(catalog.map(s=>[s.key,present?count(row.counts[s.key],name+' / '+s.label,strict):0]));
      if(present&&late&&row.arrivalTime)counts[late]=quarters('late',row.arrivalTime,draft.startTime,draft.endTime);
      if(present&&early&&row.leftEarlyAt)counts[early]=quarters('early',row.leftEarlyAt,draft.startTime,draft.endTime);
      const normal=present?amount(row.normalExtra,name+' / weitere Beträge',strict):0;
      const onTop=present?amount(row.onTopExtra,name+' / Zuschläge',strict):0;
      const raw=catalog.reduce((sum,s)=>sum+counts[s.key]*Math.round(s.price*100),normal);
      return {...row,name,status:cancelled?'cancelled':row.status,counts,normal,onTop,raw,actual:cancelled?5000:Math.min(raw,limit)+onTop,king:false};
    });
    const maxGosse=Math.max(0,...rows.filter(r=>r.status==='present').map(r=>Number(r.counts[gosse])||0));
    if(!cancelled&&draft.autoGosseKing&&maxGosse>0)for(const row of rows){
      if(row.status==='present'&&row.counts[gosse]===maxGosse){
        row.king=true;
        const already=catalog.some(s=>/gossen(könig|koenig)/i.test(s.label)&&row.counts[s.key]>0);
        if(!already)row.actual+=300;
      }
    }
    const highest=Math.max(0,...rows.filter(r=>!r.isGuest&&r.status==='present').map(r=>r.actual));
    const map=row=>{
      const penalty=cancelled?5000:row.status==='excused'?highest+200:row.status==='unexcused'?highest+2200:row.actual;
      const freeStrafen=[];
      if(row.normal)freeStrafen.push({amount:row.normal/100,reason:'Nachtrag: weiterer Betrag',onTop:false});
      if(row.onTop)freeStrafen.push({amount:row.onTop/100,reason:'Nachtrag: Zuschlag',onTop:true});
      if(row.king&&!catalog.some(s=>/gossen(könig|koenig)/i.test(s.label)&&row.counts[s.key]>0))freeStrafen.push({amount:3,reason:'Gossenkönig',onTop:true});
      return {name:row.name,isGuest:!!row.isGuest,status:row.status,statusLabel:({present:'Anwesend',excused:'Abgemeldet',unexcused:'Nicht abgemeldet',cancelled:'Ausgefallen'})[row.status]||'Kein Status',
        strafen:row.counts,freeStrafen,tannenbaumCharges:[],isGosseKing:row.king,actualPenaltyTotal:row.actual/100,
        penaltyTotal:penalty/100,monthlyFee:row.isGuest?0:monthly/100,total:(penalty+(row.isGuest?0:monthly))/100,
        arrivalTime:row.arrivalTime||'',leftEarlyAt:row.leftEarlyAt||'',leftAt:'',left:!!row.leftEarlyAt,tisch:'',boughtThrows:0,
        latePdfData:late&&row.counts[late]?{count:row.counts[late],amount:row.counts[late]*catalog.find(s=>s.key===late).price}:null,
        earlyPdfData:early&&row.counts[early]?{count:row.counts[early],amount:row.counts[early]*catalog.find(s=>s.key===early).price}:null};
    };
    const mapped=rows.map(map),members=mapped.filter(p=>!p.isGuest),guests=mapped.filter(p=>p.isGuest);
    const sum=(list,key)=>list.reduce((n,p)=>n+Math.round(p[key]*100),0)/100;
    const lane=(!cancelled&&draft.laneFee!=null&&draft.laneFee!=='')?{laneCostCents:amount(draft.laneFee,'Bahngebühr',strict),laneExpenseExcluded:!!draft.laneExpenseExcluded}:{};
    return {date:draft.date+'T12:00:00',club,kind:cancelled?'cancelled':'backfill',manualEntry:true,note:String(draft.note||''),...lane,
      monthlyFee:monthly/100,highestPresent:highest/100,strafen:catalog,autoTimeKeys:[late,early].filter(Boolean),members,guests,history:[],
      totals:{memberPenaltyTotal:sum(members,'penaltyTotal'),memberFeeTotal:sum(members,'monthlyFee'),memberTotal:sum(members,'total'),guestTotal:sum(guests,'total'),grandTotal:sum(mapped,'total')},
      manualDraft:clone(draft)};
  }
  window.KCHistorical=Object.freeze({create,snapshot,quarters});
})();

let historicalDraft=null,historicalClub='',historicalBusy=false,historicalRevision=null,historicalOriginalId='';
function openHistoricalEvening(mode='backfill',archiveId=''){
  if(historicalBusy||!ACTIVE_CLUB)return;
  if(archiveId){
    if(cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB))return;
    const entry=cashHistoryEntries.find(e=>e.id===archiveId);
    if(!entry?.manualDraft){showToast('Dieser ältere Abschluss enthält keinen bearbeitbaren Entwurf.','error');return;}
    historicalDraft=JSON.parse(JSON.stringify(entry.manualDraft));historicalDraft.archiveId=entry.id;historicalRevision=entry.manualRevision||0;historicalOriginalId=entry.id;
  }else{
    historicalDraft=KCHistorical.create(mode,persons,STRAFEN,strafPrices,{monthlyFee:monatsbeitrag,limit:STRAFEN_LIMIT,...timePenaltySettings});
    historicalDraft.date=KCBirthdays.today();historicalRevision=null;historicalOriginalId='';
  }
  historicalClub=ACTIVE_CLUB;
  document.getElementById('historical-evening-modal').classList.remove('hidden');
  renderHistoricalEvening();document.getElementById('historical-date').focus();
}
function closeHistoricalEvening(){
  if(historicalBusy)return;
  if(historicalDraft&&!confirm('Eingabe schließen? Nicht gespeicherte Änderungen gehen verloren.'))return;
  historicalDraft=null;document.getElementById('historical-evening-modal').classList.add('hidden');
}
function historicalMoney(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(value);}
function renderHistoricalEvening(){
  const d=historicalDraft;if(!d)return;
  const cancelled=d.mode==='cancelled',esc=escapeCashText;
  document.getElementById('historical-title').textContent=cancelled?'🚫 Kegelabend ausgefallen':'📝 Kegelabend nachtragen';
  const value=(id,val)=>document.getElementById(id).value=val;
  value('historical-date',d.date);document.getElementById('historical-date').max=KCBirthdays.today();
  for(const [id,key] of [['historical-start','startTime'],['historical-end','endTime'],['historical-fee','monthlyFee'],['historical-limit','limit'],['historical-note','note'],['historical-lane-fee','laneFee']])value(id,d[key]??'');
  document.getElementById('historical-lane-excluded').checked=!!d.laneExpenseExcluded;
  document.getElementById('historical-lane-excluded-label').hidden=!d.laneExpenseExcluded||cancelled;
  document.getElementById('historical-gosse').checked=d.autoGosseKing;
  document.getElementById('historical-submit').textContent=cancelled?'Erstellen (je 50 €)':'Strafen-PDF erstellen und archivieren';
  document.querySelectorAll('.historical-played-only').forEach(el=>el.hidden=cancelled);
  const head=['Dabei','Name',...(cancelled?[]:['Status','Ankunft','Früher gegangen',...d.catalog.map((s,i)=>esc(s.label)+'<br><input aria-label="Preis '+esc(s.label)+'" type="number" min="0" step="0.01" value="'+esc(s.price)+'" data-price="'+i+'">'),'Weitere Beträge (€)','Zuschläge ohne Deckel (€)']),'Gesamt'];
  document.getElementById('historical-head').innerHTML=head.map((h,i)=>'<th'+(i===1?' class="historical-name"':'')+'>'+h+'</th>').join('');
  const input=(r,field,value,type='number',extra='')=>'<input aria-label="'+esc(field+' / '+r.name)+'" type="'+type+'" value="'+esc(value)+'" data-field="'+field+'" '+extra+'>';
  document.getElementById('historical-body').innerHTML=d.rows.map((r,i)=>'<tr data-row="'+i+'"><td><input aria-label="'+esc(r.name)+' berücksichtigen" type="checkbox" data-field="included" '+(r.included?'checked':'')+'></td><td class="historical-name">'+input(r,'name',r.name,'text')+'<small>'+(r.isGuest?'Gastkegler':'Clubmitglied')+'</small></td>'+(cancelled?'':'<td><select aria-label="Status '+esc(r.name)+'" data-field="status">'+[['unknown','Bitte auswählen'],['present','Anwesend'],...(!r.isGuest?[['excused','Abgemeldet'],['unexcused','Nicht abgemeldet']]:[])].map(([k,label])=>'<option value="'+k+'" '+(r.status===k?'selected':'')+'>'+label+'</option>').join('')+'</select></td><td>'+input(r,'arrivalTime',r.arrivalTime,'time')+'</td><td>'+input(r,'leftEarlyAt',r.leftEarlyAt,'time')+'</td>'+d.catalog.map(s=>'<td><input aria-label="'+esc(s.label+' / '+r.name)+'" type="number" min="0" max="99999" step="1" data-count="'+esc(s.key)+'" value="'+esc(r.counts[s.key]||0)+'"></td>').join('')+'<td>'+input(r,'normalExtra',r.normalExtra,'number','min="0" step="0.01"')+'</td><td>'+input(r,'onTopExtra',r.onTopExtra,'number','min="0" step="0.01"')+'</td>')+'<td data-historical-total="'+i+'">–</td></tr>').join('');
  updateHistoricalPreview();
}
function updateHistoricalPreview(){
  if(!historicalDraft)return;
  try{
    const s=KCHistorical.snapshot(historicalDraft,{strict:false,club:historicalClub});
    const all=[...s.members,...s.guests];
    historicalDraft.rows.forEach((r,i)=>{
      const result=all.find(p=>p.name===r.name.trim());
      const el=document.querySelector('[data-historical-total="'+i+'"]');if(el)el.textContent=r.included?historicalMoney(result?.total||0):'–';
      for(const input of document.querySelectorAll('[data-row="'+i+'"] [data-count]')){
        const label=historicalDraft.catalog.find(c=>c.key===input.dataset.count)?.label||'';
        const auto=s.autoTimeKeys.includes(input.dataset.count)?(/verspät|verspaet/i.test(label)?r.arrivalTime:r.leftEarlyAt):'';
        const wasAuto=input.readOnly;
        input.readOnly=!!auto;
        if(auto)input.value=result?.strafen[input.dataset.count]||0;
        else if(wasAuto)input.value=r.counts[input.dataset.count]||0;
      }
    });
    document.getElementById('historical-summary').textContent=s.members.length+' Mitglieder · '+s.guests.length+' Gastkegler · Gesamt '+historicalMoney(s.totals.grandTotal);
  }catch(error){document.getElementById('historical-summary').textContent=error.message;}
}
function generateCancelledStrafenPDF(snapshot){
  const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=12;
  const plain=value=>String(value||'').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu,'').trim();
  const day=String(snapshot.date).slice(0,10).split('-').reverse().join('.');
  let offset=0,page=0;
  do{
    if(page++)doc.addPage();
    doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(plain(snapshot.club)+' - Kegelabend ausgefallen',margin,17);
    doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text('Datum: '+day,margin,27);
    let y=39;
    if(page===1&&snapshot.note){const lines=doc.splitTextToSize(plain(snapshot.note),width-margin*2);doc.setFontSize(9);doc.text(lines,margin,y);y+=lines.length*4+7;}
    const cols=[80,width-margin*2-115,35],labels=['Mitglied','Einzelstrafen (leer)','Bezahlt'];
    let x=margin;doc.setFont('helvetica','bold');doc.setFontSize(10);
    cols.forEach((w,i)=>{doc.setFillColor(239,242,248);doc.rect(x,y,w,9,'FD');doc.text(labels[i],x+3,y+6);x+=w;});y+=9;
    const room=Math.max(1,Math.floor((height-48-y)/8));
    const members=snapshot.members.slice(offset,offset+room);offset+=members.length;
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    for(let i=0;i<Math.max(Math.min(5,room),members.length);i++){
      x=margin;cols.forEach(w=>{doc.rect(x,y,w,8);x+=w;});
      if(members[i]){const lines=doc.splitTextToSize(plain(members[i].name),74).slice(0,2);doc.text(lines,margin+3,y+(lines.length===1?5.3:3.2));}
      y+=8;
    }
    if(offset===snapshot.members.length){
      doc.setFont('helvetica','bold');doc.setFontSize(11);
      doc.text('Der Kegelabend ist ausgefallen. Jedes Clubmitglied zahlt 50,00 EUR.',margin,y+11);
      doc.text(snapshot.members.length+' Mitglieder - Gesamtbetrag: '+snapshot.totals.grandTotal.toFixed(2).replace('.',',')+' EUR',margin,y+21);
    }
  }while(offset<snapshot.members.length);
  const pages=doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('Ausfalltermin '+day+' - Seite '+p+' / '+pages,width-margin,height-7,{align:'right'});}
  return doc;
}
function changeHistoricalInput(event){
  const el=event.target,d=historicalDraft;if(!d||historicalBusy)return;
  const index=el.closest('[data-row]')?.dataset.row;
  if(index!==undefined){
    const row=d.rows[Number(index)];
    if(el.dataset.count)row.counts[el.dataset.count]=el.value;
    else if(el.dataset.field)row[el.dataset.field]=el.type==='checkbox'?el.checked:el.value;
  }else if(el.dataset.price!==undefined)d.catalog[Number(el.dataset.price)].price=el.value;
  else if(el.dataset.setting)d[el.dataset.setting]=el.type==='checkbox'?el.checked:el.value;
  if(el.id==='historical-date'&&d.mode==='cancelled'&&historicalRevision===null)delete d.archiveId;
  updateHistoricalPreview();
}
function addHistoricalPerson(){
  const input=document.getElementById('historical-person-name'),name=input.value.trim();if(!name)return;
  if(historicalDraft.rows.some(r=>r.name.trim().toLocaleLowerCase('de')===name.toLocaleLowerCase('de'))){showToast('Name bereits vorhanden','error');return;}
  historicalDraft.rows.push({name,isGuest:historicalDraft.mode!=='cancelled'&&document.getElementById('historical-person-kind').value==='guest',included:true,status:'unknown',counts:{},normalExtra:'0',onTopExtra:'0',arrivalTime:'',leftEarlyAt:''});
  input.value='';renderHistoricalEvening();
}
function addHistoricalPenalty(){
  const input=document.getElementById('historical-penalty-name'),label=input.value.trim();if(!label)return;
  const price=document.getElementById('historical-penalty-price').value||'0';
  const key='manual_'+Date.now()+'_'+historicalDraft.catalog.length;
  historicalDraft.catalog.push({key,label,price});input.value='';renderHistoricalEvening();
}
async function submitHistoricalEvening(event){
  event?.preventDefault();if(historicalBusy||!historicalDraft)return;
  if(historicalClub!==ACTIVE_CLUB){showToast('Club gewechselt. Bitte Eingabe erneut öffnen.','error');return;}
  if(!navigator.onLine||!window.firestoreApi?.saveHistoricalStrafenEvent){showToast('Zum Archivieren bitte eine Verbindung herstellen.','error');return;}
  let snapshot;
  try{snapshot=KCHistorical.snapshot(historicalDraft,{club:historicalClub});}catch(error){showToast(error.message,'error');return;}
  historicalBusy=true;const clubId=getClubFirestoreId(historicalClub);
  const controls=[...document.querySelectorAll('#historical-evening-modal input, #historical-evening-modal select, #historical-evening-modal button')];controls.forEach(el=>el.disabled=true);
  let archived=false;
  try{
    if(snapshot.kind==='cancelled')historicalDraft.archiveId='cancelled_'+historicalDraft.date;
    else if(!historicalDraft.archiveId)historicalDraft.archiveId='strafen_nachtrag_'+(crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2));
    const id=historicalDraft.archiveId;
    if(snapshot.kind==='cancelled'&&historicalRevision===null){
      const existing=await window.firestoreApi.loadArchivedStrafenEvent(clubId,id);
      if(existing){if(!confirm('Für dieses Datum ist bereits ein Ausfalltermin gespeichert. Diesen Eintrag ersetzen?'))return;historicalRevision=existing.manualRevision||0;historicalOriginalId=id;}
    }
    snapshot.manualDraft=JSON.parse(JSON.stringify(historicalDraft));
    const pdf=snapshot.kind==='cancelled'?generateCancelledStrafenPDF(snapshot):await generateStrafenPDF(snapshot);
    const revision=await window.firestoreApi.saveHistoricalStrafenEvent(clubId,id,{...snapshot,laneCostCents:snapshot.laneCostCents??null,category:'strafen',status:'closed',
      eveningStartedAt:historicalDraft.date+'T'+(snapshot.kind==='cancelled'?'00:00:00':historicalDraft.startTime+':00'),closedAt:new Date().toISOString(),source:'manual'},historicalRevision,historicalOriginalId||id);
    historicalRevision=revision;historicalOriginalId=id;archived=true;
    pdf.save((snapshot.club||'Kegelclub').replace(/[^a-zA-Z0-9_-]+/g,'_')+'_'+(snapshot.kind==='cancelled'?'Ausfalltermin_':'Strafen_Nachtrag_')+historicalDraft.date+'.pdf');
    showToast('PDF erstellt und Kegelabend archiviert','success');
    historicalDraft=null;document.getElementById('historical-evening-modal').classList.add('hidden');
  }catch(error){console.error('Kegelabend nachtragen',error);showToast((archived?'Archiv gespeichert; PDF bitte erneut erstellen: ':'Kegelabend konnte nicht gespeichert werden: ')+error.message,'error');}
  finally{historicalBusy=false;controls.forEach(el=>el.disabled=false);if(archived)await refreshCashHistory();}
}
document.addEventListener('DOMContentLoaded',()=>document.getElementById('historical-evening-modal')?.addEventListener('input',changeHistoricalInput));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('historical-evening-modal')?.classList.contains('hidden'))closeHistoricalEvening();});
