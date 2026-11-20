/* V247: Avatare und neue Dashboard-Meldungen aus bestaetigten Clubdaten. */
(()=>{
 const $=id=>document.getElementById(id);
 const norm=name=>String(name||'').normalize('NFKC').trim().toLocaleLowerCase('de');
 const initial=name=>String(name||'').trim().split(/\s+/).filter(Boolean).map(word=>word[0]).join('').slice(0,2).toUpperCase()||'?';
 const safeImage=value=>/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(String(value||''))?value:'';
 const people=root=>Array.isArray(root?.persons)?root.persons:[];
 function avatar(root,name){
  const person=people(root).find(p=>norm(p.name)===norm(name)),container=document.createElement('div');
  container.className='kc-toast-avatar';const fallback=document.createElement('span');fallback.className='kc-toast-avatar-initials';fallback.textContent=initial(name);
  container.append(fallback);
  const uploaded=safeImage(person?.avatarData);
  let candidates=[];
  if(uploaded)candidates=[uploaded];
  else if(person&&!person.isGuest&&!person.isDrinksOnly){
   const slug=norm(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
   if(slug)candidates=['jpg','jpeg','png','webp'].map(ext=>'bilder/'+slug+'.'+ext);
  }
  if(candidates.length){
   const img=document.createElement('img');img.alt='';img.decoding='async';let index=0;
   img.onload=()=>{fallback.hidden=true;};img.onerror=()=>{if(++index<candidates.length)img.src=candidates[index];else{img.remove();fallback.hidden=false;}};
   img.src=candidates[0];container.insertBefore(img,fallback);
  }
  return container;
 }
 function decorate(box,root,title,detail,person){
  const row=document.createElement('div'),copy=document.createElement('div'),headline=document.createElement('strong'),subtitle=document.createElement('span');
  row.className='kc-toast-person-layout';copy.className='kc-toast-person-text';headline.textContent=title;subtitle.textContent=detail||'';
  copy.append(headline,subtitle);if(person)row.append(avatar(root,person));row.append(copy);box.replaceChildren(row);
 }
 let scope='',initialized=false,snapshot=new Map(),historySeen=new Set(),stationSeen=new Set(),queue=[],showing=false,activeTimer=null,exitTimer=null;
 const clear=()=>{queue=[];showing=false;if(activeTimer!==null)clearTimeout(activeTimer);if(exitTimer!==null)clearTimeout(exitTimer);activeTimer=null;exitTimer=null;const box=$('dashboard-club-event-toast');if(box){box.hidden=true;box.classList.remove('toast-visible','toast-leaving');}};
 function toast(entry){if(queue.length<15)queue.push(entry);if(!showing)next();}
 const defaults={arrival:'#40cf88',departure:'#7ba3ed',round:'#f9ba3e',loser:'#df83e7',teamLoss:'#fc977d',station:'#76d5c2'};
 const colorFor=(kind,root)=>{
  const key=kind==='team-loss'?'teamLoss':kind;
  const supplied=root?.dashboardSettings?.eventToasts?.colors?.[key];
  return /^#[0-9a-f]{6}$/i.test(String(supplied||''))?String(supplied):defaults[key]||'#ffffff';
 };
 const contrast=(hex)=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const y=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  return y>.179?'#13243d':'#ffffff';
 };
 function next(){
  if(!queue.length){showing=false;return;}showing=true;
  const event=queue.shift(),box=$('dashboard-club-event-toast')||document.createElement('div');
  box.id='dashboard-club-event-toast';box.className='dashboard-throw-popup kc-club-event-toast is-'+event.kind;box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  const bg=colorFor(event.kind,event.root);box.style.background=bg;box.style.borderColor=bg;box.style.color=contrast(bg);
  if(!box.parentNode)document.body.append(box);
  const stage=document.querySelector('main.dashboard .stage'),bounds=stage?.getBoundingClientRect();
  if(bounds){box.style.left=(bounds.left+bounds.width/2)+'px';box.style.width=Math.max(200,Math.min(bounds.width-24,760))+'px';}
  decorate(box,event.root,event.title,event.detail,event.name);
  box.hidden=true;box.classList.remove('toast-visible','toast-leaving');box.hidden=false;void box.offsetHeight;
  requestAnimationFrame(()=>box.classList.add('toast-visible'));
  activeTimer=setTimeout(()=>{box.classList.remove('toast-visible');box.classList.add('toast-leaving');exitTimer=setTimeout(()=>{box.hidden=true;exitTimer=null;next();},420);},Math.max(1,event.seconds)*1000);
 }
 const euro=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
 const stationQueue=[];
 let stationActive=null,stationTimer=null,stationBox=null;
 function positionStation(){
  if(!stationActive||!stationBox)return;
  const panel=$('dashboard-panel-drinks');
  const slot=panel?.parentElement;
  const active=panel&&!panel.hidden&&(!slot?.dataset.activePanel||slot.dataset.activePanel==='drinks');
  const target=active?panel.getBoundingClientRect():null;
  if(target?.height>0&&target.width>0){
   const {left,top,width,height}=target;
   Object.assign(stationBox.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
   stationBox.classList.toggle('station-from-left',!!panel.closest('.side.left'));
   return;
  }
  const main=document.querySelector('main.dashboard'),bounds=main?.getBoundingClientRect();
  const bottom=main?.querySelector('.dashboard-footer')?.getBoundingClientRect().top||bounds?.bottom||window.innerHeight;
  const width=Math.min(window.innerWidth-16,Math.max(280,(bounds?.width||window.innerWidth)*stationActive.rightWidth/100));
  const height=window.innerHeight/2;
  const right=Math.min(window.innerWidth-8,(bounds?.right||window.innerWidth)-8);
  Object.assign(stationBox.style,{left:(right-width)+'px',top:Math.max(0,bottom-height-8)+'px',width:width+'px',height:height+'px'});
  stationBox.classList.remove('station-from-left');
 }
 function resetStation(){
  stationQueue.length=0;stationActive=null;
  clearTimeout(stationTimer);stationTimer=null;
  stationBox?.remove();stationBox=null;
 }
 function showStation(){
  if(stationActive||!stationQueue.length)return;
  stationActive=stationQueue.shift();
  const {row,root,seconds}=stationActive;
  const viewport=document.createElement('div'),card=document.createElement('article'),title=document.createElement('h2');
  stationBox=viewport;viewport.id='dashboard-station-booking';viewport.className='station-booking-viewport';
  card.className='station-booking-card';card.setAttribute('role','status');
  const bg=colorFor('station',root);card.style.background=bg;card.style.color=contrast(bg);
  title.textContent=row.kind==='undo'?'KC Theke · Storno':row.kind==='adjust'?'KC Theke · Korrektur':'KC Theke · Gebucht';
  card.append(title);
  if(row.detail){const detail=document.createElement('p');detail.className='station-booking-detail';detail.textContent=row.detail;card.append(detail);}
  if(Array.isArray(row.items)&&row.items.length){
   const list=document.createElement('ul');list.className='station-booking-list';list.tabIndex=0;list.setAttribute('aria-label','Buchungspositionen');
   let total=0,previousName;
   for(const item of row.items){
    const line=document.createElement('li'),details=document.createElement('div'),drink=document.createElement('span'),price=document.createElement('strong');
    if(item.name!==previousName){const name=document.createElement('b');name.textContent=item.name;details.append(name);previousName=item.name;}
    drink.textContent=item.quantity+' × '+item.drink;details.append(drink);
    price.textContent=euro.format(item.cents/100);total+=item.cents;
    line.append(details,price);list.append(line);
   }
   const sum=document.createElement('div'),label=document.createElement('span'),amount=document.createElement('strong');
   sum.className='station-booking-total';label.textContent='Gesamt';amount.textContent=euro.format(total/100);
   sum.append(label,amount);card.append(list,sum);
  }else{
   const detail=document.createElement('p');detail.textContent=row.description;card.append(detail);
  }
  viewport.append(card);document.body.append(viewport);positionStation();
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:360;
  void card.offsetWidth;viewport.classList.add('station-booking-visible');
  stationTimer=setTimeout(()=>{
   viewport.classList.remove('station-booking-visible');
   stationTimer=setTimeout(()=>{
    viewport.remove();stationBox=null;stationActive=null;stationTimer=null;showStation();
   },motion);
  },seconds*1000+motion);
 }
 function rankLabel(label){const hit=String(label||'').match(/^\s*([123])\.?\s*verlierer/i);return hit?Number(hit[1]):/erster\s+verlierer/i.test(String(label||''))?1:0;}
 function currentFineRanks(person,root){
  const values=new Map();for(const item of Array.isArray(root?.STRAFEN)?root.STRAFEN:[]){
   const rank=rankLabel(item.label),count=Number(person.strafen?.[item.key]);if(rank&&Number.isFinite(count))values.set(rank,(values.get(rank)||0)+count);
  }return values;
 }
 function identity(entry){return String(entry?.id||entry?.date||entry?.createdAt||'')+'|'+String(entry?.type||'')+'|'+String(entry?.spieltyp||'')+'|'+String(entry?.teamName||'');}
 function makeSnapshot(root){
  const result=new Map();for(const person of people(root))if(person?.name){
   const rounds=new Set((Array.isArray(person.rounds)?person.rounds:[]).map(r=>String(r?.id||r?.createdAt||'')).filter(Boolean));
   result.set(norm(person.name),{name:String(person.name),present:!!person.present,left:!!person.left,rounds,fines:currentFineRanks(person,root)});
  }return result;
 }
 function feed(root,club,now=Date.now()){
  const nextScope=String(club||'')+'|'+String(root?.currentEveningStartedAt||'');
  if(nextScope!==scope){scope=nextScope;initialized=false;snapshot.clear();historySeen.clear();stationSeen.clear();clear();resetStation();}
  if(!root)return;
  const nextSnapshot=makeSnapshot(root),history=Array.isArray(root.strafenHistory)?root.strafenHistory:[],settings=root.dashboardSettings?.eventToasts||{};
  const seconds=Math.max(0,Math.min(30,Number(settings.seconds??4)||0));
  const station=(Array.isArray(root.stationEvents)?root.stationEvents:[]).filter(row=>row.evening===root.currentEveningStartedAt);
  if(!initialized){snapshot=nextSnapshot;historySeen=new Set(history.map(identity));stationSeen=new Set(station.map(row=>row.id));initialized=true;return;}
  const enabled=key=>settings[key]!==false&&seconds>0&&!document.hidden;
  const events=[],ranks=new Map();
  const stationSeconds=Math.max(0,Math.min(30,Number(settings.stationSeconds??settings.seconds??4)||0));
  const rightWidth=Math.max(10,Math.min(35,Number(root.dashboardSettings?.tableWidth?.right)||17));
  for(const row of station){
   if(!row.id||stationSeen.has(row.id))continue;
   stationSeen.add(row.id);
   const at=Date.parse(row.at||'');
   if(settings.station!==false&&stationSeconds>0&&!document.hidden&&row.description&&Number.isFinite(at)&&now-at<=45000&&now-at>=-5000)
    stationQueue.push({row,root,seconds:stationSeconds,rightWidth});
  }
  showStation();
  for(const person of people(root)){
   if(!person?.name)continue;
   const prev=snapshot.get(norm(person.name)),cur=nextSnapshot.get(norm(person.name));if(!prev||!cur)continue;
   if(enabled('arrival')&&!prev.present&&cur.present&&!cur.left)events.push({kind:'arrival',title:'👋 Willkommen!',detail:person.name+' ist da!',name:person.name});
   if(enabled('departure')&&((prev.present&&!cur.present)||(prev.present&&!prev.left&&cur.left)))events.push({kind:'departure',title:'👋 Bis bald!',detail:person.name+' ist weg!',name:person.name});
   if(enabled('round')){
    for(const round of Array.isArray(person.rounds)?person.rounds:[]){
     const id=String(round?.id||round?.createdAt||'');if(!id||id.startsWith('station_')||prev.rounds.has(id))continue;
     const created=Date.parse(round.createdAt||'');
     if(!Number.isFinite(created)||now-created>45000||now-created< -5000)continue;
     events.push({kind:'round',title:'🍻 Prost!',detail:person.name+' gibt eine Runde'+(round.reason?' · '+round.reason:''),name:person.name});
    }
   }
   if(enabled('loser'))for(const [rank,count] of cur.fines){
    const increase=count-(prev.fines.get(rank)||0);if(increase>0){
     if(!ranks.has(rank))ranks.set(rank,new Set());ranks.get(rank).add(person.name);
    }
   }
  }
  for(const entry of history){
   const id=identity(entry);if(historySeen.has(id))continue;historySeen.add(id);
   const at=Date.parse(entry.createdAt||entry.date||'');if(!Number.isFinite(at)||now-at>45000||now-at< -5000)continue;
   if(entry.type==='teamspiel_strafe'&&enabled('teamLoss')){
    events.push({kind:'team-loss',title:'🏆 Verliererteam!',detail:(entry.teamName||entry.loser||'Team')+(entry.spieltyp?' · '+entry.spieltyp:''),name:''});
    for(const name of entry.members||[])ranks.get(1)?.delete(name);
   }
   if(enabled('loser')&&Array.isArray(entry.assigned)){
    for(const assigned of entry.assigned){const rank=Number(assigned.rank);if(rank>=1&&rank<=3&&assigned.name){
     if(!ranks.has(rank))ranks.set(rank,new Set());ranks.get(rank).add(assigned.name);
    }}
   }
  }
  if(enabled('loser'))for(const rank of [1,2,3]){
   const names=[...(ranks.get(rank)||[])];if(!names.length)continue;
   events.push({kind:'loser',title:'🏅 '+rank+'. Verlierer!',detail:names.join(' · '),name:names.length===1?names[0]:''});
  }
  snapshot=nextSnapshot;
  for(const entry of events)toast({...entry,root,seconds});
 }
 window.KCClubToasts=Object.freeze({avatar,decorate,feed,positionStation,resetStation});
})();
