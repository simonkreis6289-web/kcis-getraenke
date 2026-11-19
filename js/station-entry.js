import {stationClient, validClub, validCode} from './station-client.js';
const $=id=>document.getElementById('station-'+id);
const client=stationClient(true),ledger=window.KCDrinkLedger;
const storageKey='kc-theke-pending-v1',clubKey='kc-theke-club',pairKey='kc-theke-pairing';
const currency=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const money=amount=>currency.format(Number(amount)||0);
let root=null,config=null,history=[],club='',pending=null,pairing=null,view='people',person='',draft=null,editing=false;
let sending=false,rootOnline=false,pairBusy=false,connectionError='',lastContext='',feedbackTimer=null;
let pendingError='',canRelease=false;
let stopControl,stopRoot,stopRecent,stopPairing,stopCommand;
const q=new URLSearchParams(location.hash.slice(1)),fromQR=validClub(q.get('club'))&&validCode(q.get('code'))?{club:q.get('club'),code:q.get('code')}:null;
function saved(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function errorMessage(error){
 if(error?.code==='permission-denied')return 'Firebase hat keine Freigabe für diese Aktion bestätigt.';
 return error?.message||'Firebase antwortet nicht.';
}
function element(tag,text,className){
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(className)el.className=className;
 return el;
}
function button(label,action,{disabled=false,className='',pressed}={}){
 const el=element('button',label,className);el.type='button';el.disabled=disabled;
 if(pressed!==undefined)el.setAttribute('aria-pressed',String(pressed));
 el.onclick=action;return el;
}
function message(text,error=false){
 clearTimeout(feedbackTimer);
 const feedback=$('feedback');feedback.textContent=text;feedback.hidden=!text;feedback.classList.toggle('error',error);
 if(text&&!error)feedbackTimer=setTimeout(()=>{feedback.hidden=true;},4500);
}
function activeEvening(){return !!(root?.currentEveningStartedAt&&root.stationClosedEvening!==root.currentEveningStartedAt);}
function canBook(){return !!(config?.uid&&rootOnline&&navigator.onLine&&activeEvening()&&!pending&&!sending);}
function people(){return (root?.persons||[]).filter(ledger.active);}
function total(person){
 return ledger.total(root?.DRINKS||[],root?.prices||{},person.drinks)+(Number(person.teamExtra)||0)+ledger.roundTotal(person);
}
function avatar(data){
 const result=element('span',data.name.trim().split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase(),'station-avatar');
 const uploaded=typeof data.avatarData==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(data.avatarData)?data.avatarData:'';
 const slug=data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const candidates=uploaded?[uploaded]:!data.isGuest&&slug?['jpg','jpeg','png','webp'].map(ext=>'bilder/'+slug+'.'+ext):[];
 if(candidates.length){
  const image=element('img');image.alt='';let index=0;
  image.onerror=()=>{if(++index<candidates.length)image.src=candidates[index];else image.remove();};
  image.src=candidates[index];result.append(image);
 }
 return result;
}
function tiles(list,onSelect,{selected=[],balance=false}={}){
 const grid=element('div',undefined,'station-people');
 for(const row of list){
  const item=button('',()=>onSelect(row.name),{className:'station-person',pressed:selected.includes(row.name)});
  item.append(avatar(row),element('span',row.name));
  if(balance){
   item.append(element('small',money(total(row))));
   if(row.paid>0)item.append(element('small','✓ '+money(row.paid)+' bezahlt','station-paid'));
  }
  grid.append(item);
 }
 return grid;
}
function card(title){const section=element('section',undefined,'station-card');section.append(element('h2',title));return section;}
function choices(label,options,current,change){
 const wrapper=element('label',label);
 const select=element('select');
 select.append(element('option','Bitte auswählen'));
 select.firstChild.value='';
 for(const option of options){const node=element('option',option.label);node.value=option.value;select.append(node);}
 select.value=current||'';
 select.onchange=()=>change(select.value);
 wrapper.append(select);return wrapper;
}
function amountLine(text,amount){
 const row=element('div',undefined,'station-total');row.append(element('span',text),element('strong',money(amount)));return row;
}
function counter(drink,number,step,{max=99,disabled=false}={}){
 const row=element('div',undefined,'station-counter'),label=element('div',drink.label);
 label.append(element('small',money(root.prices?.[drink.key])));
 const less=button('−',()=>step(-1),{disabled:disabled||!number});
 const more=button('+',()=>step(1),{disabled:disabled||number>=max});
 less.setAttribute('aria-label',drink.label+' weniger');more.setAttribute('aria-label',drink.label+' mehr');
 row.append(label,less,element('output',String(number)),more);
 return row;
}
function addDrinks(section,onValid,{showAction=true,valid=true,max=99}={}){
 const list=root?.DRINKS||[],prices=root?.prices||{};
 for(const drink of list){
  const number=draft.drinks[drink.key]||0;
  section.append(counter(drink,number,delta=>{
   draft.drinks[drink.key]=Math.min(max,Math.max(0,number+delta));
   if(draft.recipients[drink.key])draft.recipients[drink.key]=draft.recipients[drink.key].slice(0,draft.drinks[drink.key]);
   render();
  },{max,disabled:!!pending}));
 }
 section.append(amountLine('Summe der Buchung',ledger.total(list,prices,draft.drinks)));
 if(showAction)bookingAction(section,onValid,valid);
}
function bookingAction(section,action,valid){
 const actions=element('div',undefined,'station-actions');
 actions.append(button('Buchen',action,{disabled:!valid||!canBook()||!Object.keys(drinksPayload()).length,className:'station-primary'}));
 section.append(actions);
}
function drinksPayload(){return Object.fromEntries(Object.entries(draft.drinks).filter(([,n])=>n>0));}
function currentOverview(out,list){
 if(person){
  const data=list.find(p=>p.name===person);
  if(!data){person='';draft=null;return currentOverview(out,list);}
  const section=card(data.name);
  section.append(button('‹ Teilnehmer',()=>{person='';draft=null;render();}),amountLine('Getränkestand',total(data)));
  const ordered=(root.DRINKS||[]).filter(drink=>data.drinks?.[drink.key]).map(drink=>data.drinks[drink.key]+' × '+drink.label);
  if(ordered.length)section.append(element('p',ordered.join(' · ')));
  section.append(element('h3','Getränke buchen'));
  addDrinks(section,()=>submit('drink',{person,drinks:drinksPayload()}));out.append(section);return;
 }
 const section=card('Teilnehmer');
 section.append(list.length?tiles(list,name=>{person=name;newDraft();render();},{balance:true}):element('p','Für diesen Abend sind noch keine Teilnehmer anwesend.'));
 section.append(amountLine('Getränke gesamt',(root?.persons||[]).reduce((sum,row)=>sum+total(row),0)));out.append(section);
}
function showRound(out,list){
 const section=card('Runde geben'),reasons=root.RUNDEN_GRUENDE||[];
 section.append(element('h3','Wer gibt die Runde?'),tiles(list,name=>{draft.host=name;render();},{selected:[draft.host]}));
 if(list.some(row=>row.name===draft.host)){
  section.append(choices('Rundengrund',reasons.map(value=>({value,label:value})),draft.reason,value=>{draft.reason=value;render();}));
  addDrinks(section,()=>submit('round',{person:draft.host,reason:draft.reason,drinks:drinksPayload()}),{valid:reasons.includes(draft.reason)});
 }
 out.append(section);
}
function showGroup(out,list){
 const section=card('Sammelbuchung');
 section.append(element('p','Getränkemenge wählen. Danach pro Getränk auswählen, wer jeweils eins bekommt.','station-hint'));
 const limit=Math.min(99,list.length);
 addDrinks(section,null,{showAction:false,max:limit});
 const drinks=drinksPayload(),recipients={};
 for(const [key,amount] of Object.entries(drinks)){
  const selected=(draft.recipients[key]||[]).filter(name=>list.some(row=>row.name===name));
  const title=(root.DRINKS||[]).find(row=>row.key===key)?.label;
  if(!title)continue;
  recipients[key]=selected;
  const block=element('section',undefined,'station-allocation');
  block.append(element('h3',title+' · '+selected.length+' von '+amount+' ausgewählt'),tiles(list,name=>{
   if(selected.includes(name))draft.recipients[key]=selected.filter(row=>row!==name);
   else if(selected.length<amount)draft.recipients[key]=[...selected,name];
   render();
  },{selected}));
  section.append(block);
 }
 bookingAction(section,()=>submit('group',{drinks,recipients}),
  Object.entries(drinks).every(([key,amount])=>recipients[key]?.length===amount));
 out.append(section);
}
function showAccount(out){
 const list=(root.persons||[]).filter(row=>row.present||row.left||row.paid>0||total(row)>0);
 const data=list.find(row=>row.name===person),section=card('Getränke pro Person');
 section.append(choices('Person',list.map(row=>({value:row.name,label:row.name+(row.paid>0?' · ✓ '+money(row.paid)+' bezahlt':'')})),person,name=>{
  person=name;editing=false;render();
 }));
 if(!data){out.append(section);return;}
 const identity=element('div',undefined,'station-account');
 identity.append(avatar(data),element('strong',data.name));
 section.append(identity,amountLine('Getränkestand',total(data)));
 if(data.paid>0)section.append(amountLine('Bezahlt laut Haupt-App (gesamt)',data.paid));
 const drinks=card('Einzelgetränke');
 const canEdit=!data.inactive&&(data.present||data.left)&&activeEvening();
 drinks.append(button(editing?'Bearbeitung sperren':'Getränke bearbeiten',()=>{
  if(editing||canBook()&&canEdit){editing=!editing;render();}
 },{className:'station-edit',disabled:!editing&&(!canEdit||!canBook()),pressed:editing}));
 let hasDrinks=false;
 for(const drink of root.DRINKS||[]){
  const n=Number(data.drinks?.[drink.key])||0;
  if(editing)drinks.append(counter(drink,n,delta=>submit('adjust',{person:data.name,drink:drink.key,expected:n,quantity:n+delta}),
   {disabled:!canBook()||!canEdit,max:Number.MAX_SAFE_INTEGER}));
  else if(n){
   hasDrinks=true;
   drinks.append(amountLine(n+' × '+drink.label,n*(Number(root.prices?.[drink.key])||0)));
  }
 }
 if(!editing&&!hasDrinks)drinks.append(element('p','Keine Einzelgetränke gebucht.','station-hint'));
 if(editing)drinks.append(element('p','Jeder Schritt wird direkt gebucht.','station-hint'));
 out.append(section,drinks);
 const drinkList=drinks=>(root.DRINKS||[]).filter(row=>drinks?.[row.key])
  .map(row=>drinks[row.key]+' × '+row.label).join(' · ');
 const rounds=data.rounds||[],teams=(root.spiele||[]).filter(row=>row.members?.includes(data.name));
 if(rounds.length||teams.length){
  const other=card('Runden und Mannschaftsbuchungen');
  for(const [label,amount,drinks] of [
   ...rounds.map(row=>['Runde · '+row.reason,row.total,row.drinks]),
   ...teams.map(row=>[row.spieltyp+' · '+(row.teamName||row.loser),row.proKopf,row.drinks])
  ]){
   const row=amountLine(label,amount),detail=drinkList(drinks);
   if(detail)row.firstChild.append(element('small',detail,'station-item-detail'));
   other.append(row);
  }
  out.append(other);
 }
}
function showTeam(out){
 const section=card('Mannschaftsspiel verloren'),games=ledger.games(root),game=games.find(item=>item.key===draft.game);
 const teams=game?ledger.availableTeams(root,game):[],selected=teams.find(team=>team.id===draft.team);
 section.append(choices('Spiel',games.map(item=>({value:item.key,label:item.title})),draft.game,value=>{draft.game=value;draft.team='';render();}));
 if(game){
  section.append(choices('Zahlende Mannschaft',teams.map(team=>({value:team.id,label:team.label})),draft.team,value=>{draft.team=value;render();}));
  if(!teams.length)section.append(element('p','Für dieses Spiel ist zurzeit kein vollständiges Team verfügbar.'));
 }
 if(selected){
  const members=element('div',undefined,'station-people');
  for(const row of selected.members){const face=element('span');face.append(avatar(row),element('span',row.name));members.append(face);}
  section.append(members);
  addDrinks(section,()=>submit('team',{game:game.key,team:selected.id,members:selected.members.map(row=>row.name),drinks:drinksPayload()}));
 }
 out.append(section);
}
function showHistory(out){
 const section=card('Letzte Stationsbuchungen');
 const latest=history.filter(row=>row.evening===root.currentEveningStartedAt);
 if(!latest.length)section.append(element('p','Für diesen Abend gibt es noch keine Stationsbuchungen.'));
 for(const row of latest){
  const item=element('div',undefined,'station-booking');
  const copy=element('div',row.result?.description||'Buchung wartet auf Bestätigung');
  copy.append(element('small',{queued:'Ausstehend',applied:'Bestätigt',rejected:'Abgelehnt',reversed:'Storniert'}[row.status]||''));
  item.append(copy);
  if(row.status==='applied'&&row.kind!=='undo')item.append(button('Stornieren',()=>{
   if(confirm('Diese Buchung stornieren?'))void submit('undo',{target:row.id});
  },{disabled:!canBook()}));
  section.append(item);
 }
 out.append(section);
}
function newDraft(){draft={drinks:{},host:'',reason:'',recipients:Object.create(null),game:'',team:''};}
function renderPending(off){
 const area=$('pending');area.hidden=!pending;area.replaceChildren();
 if(!pending)return;
 const notice=card('Offene Buchung');
 const text=sending?'Verbindung zu Firebase wird geprüft …':pendingError||'Der Auftrag wartet auf Bestätigung.';
 notice.append(element('p',text,'station-hint'));
 notice.append(button('Status prüfen / erneut senden',retry,{disabled:off||sending}));
 if(canRelease&&!sending)notice.append(button('Nicht gebuchten Auftrag verwerfen',()=>{
  if(!confirm('Firebase hat für diese Buchung keinen Auftrag. Den lokalen Entwurf verwerfen?'))return;
  clearPending();
  message('Nicht gebuchter Entwurf verworfen.');
  render();
 }));
 area.append(notice);
}
function deadline(request){
 let timer;
 return Promise.race([request,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Object.assign(Error('Firebase hat nicht rechtzeitig geantwortet.'),{code:'deadline-exceeded'})),8000);
 })]).finally(()=>clearTimeout(timer));
}
function clearPending(){
 localStorage.removeItem(storageKey);
 pending=null;pendingError='';canRelease=false;stopCommand?.();
}
function render(){
 const off=!navigator.onLine,paired=!!config?.uid,current=$('status');
 const reason=off?'Offline · Keine Buchung möglich.':connectionError||(!paired?
  pairing?.status==='requested'?'Kopplung angefragt · auf Bestätigung der Spielleitung warten.':
  pairing?.status==='rejected'?'Kopplungsanfrage abgelehnt.':'Getränkehandy noch nicht freigegeben. QR-Code in der Haupt-App scannen.':
  !rootOnline?'Verbindung zum Getränkestand wird aufgebaut …':!activeEvening()?'Kein laufender Kegelabend für Getränkebuchungen.':
  pending?'Buchung ausstehend · warte auf Firebase-Bestätigung.':'Verbunden · Buchungen für den aktuellen Kegelabend');
 current.textContent=reason;current.classList.toggle('station-status-error',off||!!connectionError);
 $('pair-form').hidden=!(fromQR&&!pairing?.status&&location.hash);
 $('pair-form').querySelector('button').disabled=pairBusy||off;
 renderPending(off);
 $('workspace').hidden=!paired||!root;
 const out=$('content');out.replaceChildren();
 if(!paired||!root)return;
 for(const item of $('nav').querySelectorAll('button'))item.setAttribute('aria-current',item.dataset.view===view?'page':'false');
 const list=people();
 if(view==='history')showHistory(out);
 else if(view==='account')showAccount(out);
 else if(view==='group')showGroup(out,list);
 else if(view==='round')showRound(out,list);
 else if(view==='team')showTeam(out);
 else currentOverview(out,list);
}
function loadClub(next){
 stopControl?.();stopRoot?.();stopRecent?.();stopCommand?.();
 club=next;canRelease=false;config=null;root=null;history=[];rootOnline=false;connectionError='';
 const target=club;
 stopControl=client.watchControl(club,value=>{
  if(target!==club)return;
  const first=!config,oldGeneration=config?.generation;
  config=value;
  if(!config?.uid){lost();return;}
  connectionError='';
  if(first||oldGeneration!==config.generation){
   stopRoot?.();stopRecent?.();
   stopRoot=client.watchRoot(club,value=>{
    if(target!==club)return;root=value;rootOnline=true;
    const evening=root?.currentEveningStartedAt||'';
    if(evening!==lastContext){lastContext=evening;person='';editing=false;view='people';newDraft();}
    render();
   },error=>{rootOnline=false;connectionError=errorMessage(error);render();},()=>{rootOnline=false;render();});
   stopRecent=client.watchRecent(club,value=>{history=value;render();},()=>{});
   void client.heartbeat(club,config).catch(()=>{});
  }
  render();
 },error=>{
  if(target!==club)return;
  lost();connectionError=error.code==='permission-denied'?'Dieses Getränkehandy hat zurzeit keine Freigabe.':'Verbindung zur Freigabe unterbrochen.';render();
 });
 if(pending?.club===club){watchPending();void retry();}
}
function lost(){editing=false;config=null;rootOnline=false;root=null;stopRoot?.();stopRecent?.();render();}
function finish(row){
 if(!pending||!['applied','rejected','reversed'].includes(row?.status))return;
 const performed=row.status!=='rejected',adjust=pending.entry.kind==='adjust';clearPending();
 if(performed&&!adjust){person='';editing=false;view='people';newDraft();}
 connectionError='';message(row.result?.description||(performed?'Buchung bestätigt.':'Buchung abgelehnt.'),!performed);render();
}
function watchPending(){
 stopCommand?.();
 if(!pending)return;
 const {id,club:target}=pending;
 stopCommand=client.watchCommand(target,id,row=>{if(pending?.id===id)finish(row);},()=>{});
}
async function retry(){
 if(!pending||sending||!navigator.onLine)return;
 const current=pending;
 sending=true;canRelease=false;render();
 try{
  const row=await deadline(client.submit(current.club,current.id,current.entry));
  if(pending?.id!==current.id)return;
  pendingError='';watchPending();finish(row);
 }catch(error){
  if(pending?.id!==current.id)return;
  let receipt;
  try{
   receipt=await deadline(client.readCommand(current.club,current.id));
   if(pending?.id!==current.id)return;
   finish(receipt);
  }catch{/* Ohne Serverantwort bleibt dieselbe Buchungs-ID erhalten. */}
  if(pending?.id!==current.id)return;
  if(receipt?.status==='queued'){
   pendingError='Firebase hat den Auftrag erhalten. Bitte die Haupt-App öffnen und ihre Cloudspeicherung prüfen.';
   watchPending();
  }else if(error.code==='permission-denied'&&current.club===club&&config?.uid&&rootOnline){
   canRelease=receipt===null&&config.generation!==current.entry.generation;
   if(canRelease)pendingError='Der Auftrag stammt aus einer früheren Gerätefreigabe und liegt bei Firebase nicht vor.';
   else if(config.generation!==current.entry.generation||root?.currentEveningStartedAt!==current.entry.evening||!activeEvening())
    pendingError='Abend oder Gerätefreigabe wurde gewechselt. Der Auftrag bleibt zur Prüfung gespeichert.';
   else if(['round','group','adjust'].includes(current.entry.kind))
    pendingError='Firebase hat diese Buchung abgelehnt. Auf dem Tablet prüfen, ob die V272-Firestore-Regeln veröffentlicht sind. Danach hier erneut senden.';
   else pendingError=errorMessage(error)+' Der Auftrag bleibt lokal gespeichert.';
  }else{
   pendingError=errorMessage(error)+' Der Auftrag bleibt lokal gespeichert.';
  }
 }finally{sending=false;render();}
}
async function submit(kind,payload){
 if(!canBook())return;
 const value={club,id:'station_'+crypto.randomUUID(),entry:{evening:root.currentEveningStartedAt,generation:config.generation,kind,payload}};
 try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{message('Die Buchung konnte auf diesem Gerät nicht gesichert werden.',true);return;}
 pending=value;pendingError='';canRelease=false;message('');connectionError='';watchPending();await retry();
}
function trackPair(ref){
 stopPairing?.();pairing={status:'requested'};
 stopPairing=client.watchPairing(ref.club,ref.code,value=>{
  pairing=value||{status:'rejected'};
  if(value?.status==='approved'){
   stopPairing?.();localStorage.setItem(clubKey,JSON.stringify(ref.club));localStorage.removeItem(pairKey);loadClub(ref.club);
  }else if(value?.status==='rejected'){localStorage.removeItem(pairKey);}
  render();
 },error=>{connectionError=errorMessage(error);render();});
}
$('pair-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const label=$('label').value.trim();
 if(!fromQR||!label||pairBusy||!navigator.onLine)return;
 pairBusy=true;connectionError='';render();
 try{
  localStorage.setItem(pairKey,JSON.stringify(fromQR));
  await client.requestPairing(fromQR.club,fromQR.code,label);
  location.hash='';
  trackPair(fromQR);
 }catch(error){localStorage.removeItem(pairKey);connectionError=errorMessage(error);}
 finally{pairBusy=false;render();}
});
for(const item of $('nav').querySelectorAll('button'))item.onclick=()=>{view=item.dataset.view;person='';editing=false;newDraft();render();};
window.addEventListener('offline',()=>{editing=false;rootOnline=false;render();});
window.addEventListener('online',()=>{if(club)loadClub(club);else render();});
setInterval(()=>{if(config?.uid&&navigator.onLine)void client.heartbeat(club,config).catch(()=>{});},30000);
async function initialize(){
 newDraft();pending=saved(storageKey);
 try{
  await client.user();
  const savedClub=saved(clubKey),waiting=saved(pairKey);
  if(validClub(savedClub))loadClub(savedClub);
  else if(pending&&validClub(pending.club))loadClub(pending.club);
  if(waiting&&validClub(waiting.club)&&validCode(waiting.code))trackPair(waiting);
  if(fromQR&&fromQR.club!==savedClub)render();
 }catch(error){connectionError=errorMessage(error)+' Bitte die Firebase-Anmeldung prüfen.';}
 render();
}
void initialize();
