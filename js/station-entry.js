import {stationClient, validClub, validCode} from './station-client.js';
const $=id=>document.getElementById('station-'+id);
const client=stationClient(true),ledger=window.KCDrinkLedger;
const storageKey='kc-theke-pending-v1',clubKey='kc-theke-club',pairKey='kc-theke-pairing';
const currency=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const money=amount=>currency.format(Number(amount)||0);
let root=null,config=null,history=[],club='',pending=null,pairing=null,view='people',person='',draft=null;
let sending=false,rootOnline=false,pairBusy=false,connectionError='',lastContext='',feedbackTimer=null;
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
  if(balance)item.append(element('small',money(total(row))));
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
function addDrinks(section,onValid){
 const list=root?.DRINKS||[],prices=root?.prices||{};
 for(const drink of list){
  const number=draft.drinks[drink.key]||0;
  const row=element('div',undefined,'station-counter'),label=element('div',drink.label);
  label.append(element('small',money(prices[drink.key])));
  const step=delta=>{draft.drinks[drink.key]=Math.min(99,Math.max(0,number+delta));render();};
  const less=button('−',()=>step(-1),{disabled:!number}),more=button('+',()=>step(1),{disabled:number===99});
  less.setAttribute('aria-label',drink.label+' weniger');more.setAttribute('aria-label',drink.label+' mehr');
  row.append(label,less,element('output',String(number)),more);section.append(row);
 }
 const priced=ledger.total(list,prices,draft.drinks);
 section.append(amountLine('Summe der Buchung',priced));
 const actions=element('div',undefined,'station-actions');
 actions.append(button('Buchen',onValid,{disabled:!canBook()||!Object.values(draft.drinks).some(Boolean),className:'station-primary'}));
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
 const section=card('Runde geben');
 section.append(element('h3','Wer gibt die Runde?'),tiles(list,name=>{draft.host=name;render();},{selected:[draft.host]}));
 if(draft.host){
  section.append(element('h3','Empfänger'),tiles(list,name=>{
   draft.recipients=draft.recipients.includes(name)?draft.recipients.filter(n=>n!==name):[...draft.recipients,name];render();
  },{selected:draft.recipients}));
  section.append(choices('Rundengrund',(root.RUNDEN_GRUENDE||[]).map(value=>({value,label:value})),draft.reason,value=>{draft.reason=value;render();}));
  if(draft.reason&&draft.recipients.length)addDrinks(section,()=>submit('round',{person:draft.host,reason:draft.reason,recipients:draft.recipients,drinks:drinksPayload()}));
 }
 out.append(section);
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
function newDraft(){draft={drinks:{},host:'',reason:'',recipients:[],game:'',team:''};}
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
 $('workspace').hidden=!paired||!root;
 const out=$('content');out.replaceChildren();
 if(!paired||!root)return;
 for(const item of $('nav').querySelectorAll('button'))item.setAttribute('aria-current',item.dataset.view===view?'page':'false');
 if(pending){const notice=card('Buchung wird geprüft');notice.append(button('Status prüfen / erneut senden',retry,{disabled:off||sending}));out.append(notice);}
 const list=people();
 if(view==='history')showHistory(out);
 else if(view==='round')showRound(out,list);
 else if(view==='team')showTeam(out);
 else currentOverview(out,list);
}
function loadClub(next){
 stopControl?.();stopRoot?.();stopRecent?.();stopCommand?.();
 club=next;config=null;root=null;history=[];rootOnline=false;connectionError='';
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
    if(evening!==lastContext){lastContext=evening;person='';view='people';newDraft();}
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
function lost(){config=null;rootOnline=false;root=null;stopRoot?.();stopRecent?.();render();}
function finish(row){
 if(!pending||!['applied','rejected','reversed'].includes(row?.status))return;
 const performed=row.status!=='rejected';pending=null;stopCommand?.();localStorage.removeItem(storageKey);
 if(performed){person='';view='people';newDraft();}
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
 sending=true;render();
 try{
  const row=await client.submit(current.club,current.id,current.entry);
  if(pending?.id!==current.id)return;
  connectionError='';watchPending();finish(row);
 }catch(error){
  if(pending?.id===current.id){
   try{finish(await client.readCommand(current.club,current.id));}catch{/* Keep the original durable receipt ID. */}
   if(pending?.id===current.id){
    connectionError=errorMessage(error)+' Der Auftrag bleibt zur Prüfung gespeichert.';
    if(error.code==='permission-denied'&&config?.uid&&rootOnline&&
       (config.generation!==current.entry.generation||root?.currentEveningStartedAt!==current.entry.evening||!activeEvening())){
     pending=null;stopCommand?.();localStorage.removeItem(storageKey);
     message('Buchung abgelehnt. Abend oder Gerätefreigabe wurde gewechselt.',true);
    }
   }
  }
 }finally{sending=false;render();}
}
async function submit(kind,payload){
 if(!canBook())return;
 const value={club,id:'station_'+crypto.randomUUID(),entry:{evening:root.currentEveningStartedAt,generation:config.generation,kind,payload}};
 try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{message('Die Buchung konnte auf diesem Gerät nicht gesichert werden.',true);return;}
 pending=value;message('');connectionError='';watchPending();await retry();
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
for(const item of $('nav').querySelectorAll('button'))item.onclick=()=>{view=item.dataset.view;person='';newDraft();render();};
window.addEventListener('offline',()=>{rootOnline=false;render();});
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
