/* Gemeinsame Regeln für Hohe und Tiefe Hausnummer. */
const HAUS_DEFAULTS = {
  hoch: { neun: 9, kranz: 12, gosse: 0 },
  tief: { neun: 0, kranz: 0, gosse: 0 }
};
function hausId(mode) { return mode === 'hoch' ? 'haushoch' : 'haustief'; }
function hausState(mode) { return mode === 'hoch' ? haushochState : haustiefState; }
function setHausState(mode, value) { if (mode === 'hoch') haushochState = value; else haustiefState = value; }
function createHausState() {
  return { active:false, finished:false, playerOrder:[], currentPlayerIndex:0, rows:{},
    undoStack:[], history:[], startedAt:'', customOrder:false };
}
function ensureHausState(mode) {
  let s = hausState(mode);
  if (!s || typeof s !== 'object') { s = createHausState(); setHausState(mode,s); }
  if (!Array.isArray(s.playerOrder)) s.playerOrder=[];
  if (!Array.isArray(s.undoStack)) s.undoStack=[];
  if (!Array.isArray(s.history)) s.history=[];
  if (!s.rows || typeof s.rows !== 'object') s.rows={};
  return s;
}
function hausPlayers(mode) {
  const names=getSoloNames(hausId(mode)),active=getActivePlayersForSoloGame();
  return names.map(n=>active.find(p=>p.name===n)).filter(Boolean);
}
function hausThrowValue(mode,throwData) {
  if (!throwData) return null;
  const settings=hausnummerSettings?.[mode]||HAUS_DEFAULTS[mode];
  const key=throwData.isGosse?'gosse':Number(throwData.value)===12?'kranz':Number(throwData.value)===9?'neun':null;
  if(key==='kranz'&&Number.isInteger(throwData.kranzValue))return throwData.kranzValue;
  return key ? Number(settings[key]) : Number(throwData.value);
}
function hausNumber(mode,row) {
  if (!Array.isArray(row) || row.length!==3 || row.some(x=>!x)) return null;
  return Number(row.map(x=>String(hausThrowValue(mode,x))).join(''));
}
function hausDisplay(mode,row) {
  return row.map(x=>x ? String(hausThrowValue(mode,x)) : '–').join(' | ');
}
function renderHausSettings() {
  for (const mode of ['hoch','tief']) for(const key of ['neun','kranz','gosse']){
    const el=document.getElementById('haus-'+mode+'-'+key);
    if(el)el.value=String(hausnummerSettings?.[mode]?.[key]??HAUS_DEFAULTS[mode][key]);
  }
}
function saveHausSettings() {
  for(const mode of ['hoch','tief']) for(const key of ['neun','kranz','gosse']){
    const value=Number(document.getElementById('haus-'+mode+'-'+key)?.value);
    if(!Number.isInteger(value)||value<0||value>12){showToast('Bitte Werte zwischen 0 und 12 verwenden','error');return;}
    hausnummerSettings[mode][key]=value;
  }
  persistState();
  renderHausGame('hoch');renderHausGame('tief');
  showToast('Hausnummer-Wertungen gespeichert','success');
}
function startHausGame(mode) {
  const players=hausPlayers(mode);
  if(!players.length){showToast('Keine anwesenden Kegler','error');return;}
  const s=ensureHausState(mode);
  s.active=true;s.finished=false;s.closing=false;s.startedAt=new Date().toISOString();
  s.playerOrder=players.map(p=>p.name);s.rows={};s.undoStack=[];s.currentPlayerIndex=0;
  for(const p of players)s.rows[p.name]=[null,null,null];
  dashboardActiveGame=hausId(mode);
  renderHausGame(mode);persistState();
}
function hausNextPlayer(mode) {
  const s=ensureHausState(mode),names=s.playerOrder;
  const incomplete=names.filter(n=>(s.rows[n]||[]).some(v=>!v));
  if(!incomplete.length){s.closing=true;return;}
  let idx=s.currentPlayerIndex;
  for(let i=0;i<names.length;i++){
    idx=(idx+1)%names.length;
    if(incomplete.includes(names[idx])){s.currentPlayerIndex=idx;break;}
  }
}
async function hausThrow(mode,pins,isGosse=false,chosenPlace=null) {
  const s=ensureHausState(mode);
  if(!s.active||s.busy)return;
  const name=s.playerOrder[s.currentPlayerIndex],row=s.rows[name];
  if(!row||row.every(Boolean))return;
  const n=Number(pins);
  if(!Number.isInteger(n)||n<0||n>12)return;
  const free=row.map((x,i)=>x?null:i).filter(x=>x!==null);
  const place=chosenPlace===null ? (free.length===1?free[0]:Number(document.getElementById('haus-'+mode+'-place')?.value)) : Number(chosenPlace);
  if(!free.includes(place)){showToast('Bitte eine freie Stelle wählen','error');return;}
  const scored=n===12&&!isGosse&&window.KCKranzUI?await KCKranzUI.select(hausId(mode)):n;if(scored===null)return;
  s.busy=true;
  try {
    const throwData={value:n,isGosse:!!isGosse,...(n===12&&!isGosse&&window.KCKranzUI?{kranzValue:scored}:{})};
    if(!(await changeSoloThrowPenalty(name,null,throwData)))return false;
    row[place]=throwData;
    s.undoStack.push({name,place,index:s.currentPlayerIndex});
    hausNextPlayer(mode);renderHausGame(mode);persistState();
    if(s.closing){s.closing=false;await finishHausGame(mode);}
    return true;
  }finally{s.busy=false;}
}
async function undoHausThrow(mode) {
  const s=ensureHausState(mode);
  if(s.busy||s.finished||!s.undoStack.length)return;
  const last=s.undoStack[s.undoStack.length-1],row=s.rows[last.name];
  if(!row||!row[last.place])return;
  s.busy=true;
  try{
    if(!(await changeSoloThrowPenalty(last.name,row[last.place],null)))return;
    row[last.place]=null;s.undoStack.pop();s.active=true;s.finished=false;s.closing=false;
    s.currentPlayerIndex=last.index;
    renderHausGame(mode);persistState();
  }finally{s.busy=false;}
}
function hausIsSchnapszahl(row) {
  return Array.isArray(row)&&row.length===3&&row.every(Boolean)&&
    row.every(x=>Number(x.kranzValue??x.value)===Number(row[0].kranzValue??row[0].value)&&!!x.isGosse===!!row[0].isGosse);
}
async function finishHausGame(mode) {
  const s=ensureHausState(mode);
  if(!s.active||s.finished||s.finishing)return false;
  if(s.playerOrder.some(name=>hausNumber(mode,s.rows[name])===null))return false;
  s.finishing=true;
  try{
    const results=s.playerOrder.map(name=>({
      name,number:hausNumber(mode,s.rows[name]),schnapszahl:hausIsSchnapszahl(s.rows[name])
    })).sort((a,b)=>mode==='hoch'?b.number-a.number:a.number-b.number);
    // Gleichstand: dichte Rangfolge, wie bei Mensch ärgere dich nicht.
    // Alle Spieler mit dem besten Wert gewinnen; sie erhalten keine Verlierer-Strafe.
    const winnerNumber=results[0]?.number;
    const losers=results.filter(x=>x.number!==winnerNumber)
      .sort((a,b)=>mode==='hoch'?a.number-b.number:b.number-a.number);
    const groups=[];
    for(const player of losers){
      const last=groups[groups.length-1];
      if(last&&last.score===player.number)last.names.push(player.name);
      else groups.push({score:player.number,names:[player.name]});
    }
    const ranked=groups.slice(0,3);
    const missing=ranked.map((g,i)=>({rank:i+1,key:getLoserPenaltyKeyByRank(i+1)})).filter(x=>!x.key);
    if(missing.length){
      showToast('❌ Strafart fehlt: '+missing.map(x=>x.rank+'. Verlierer').join(', '),'error');
      return false;
    }
    const changes=[],assigned=[];
    ranked.forEach((group,index)=>{
      const rank=index+1,key=getLoserPenaltyKeyByRank(rank);
      for(const name of group.names){
        changes.push({personName:name,category:'strafen',key,delta:1});
        assigned.push({name,rank,score:group.score});
      }
    });
    if(changes.length){
      const ok=await changeMultipleSyncedPersonCounters(changes,'🏁 Hausnummer-Verlierer gebucht');
      if(!ok){showToast('❌ Verlierer-Strafen konnten nicht gebucht werden','error');return false;}
    }
    const entry={id:hausId(mode)+'_'+Date.now(),type:hausId(mode),
      participants:results.map(r=>r.name),winnerNames:results.filter(r=>r.number===winnerNumber).map(r=>r.name),
      createdAt:new Date().toISOString(),winner:results.filter(x=>x.number===winnerNumber).map(x=>x.name).join(', '),
      results,ranking:groups.map((g,i)=>({...g,rank:i+1})),assigned,
      rows:JSON.parse(JSON.stringify(s.rows)),
      settings:JSON.parse(JSON.stringify(hausnummerSettings[mode]))};
    s.history.unshift(entry);
    if(!Array.isArray(strafenHistory))strafenHistory=[];
    strafenHistory.unshift(entry);
    s.active=false;s.finished=true;s.closing=false;
    persistState();
    try{renderAll();}catch(error){console.error('Hausnummer Abschlussansicht',error);renderHausGame(mode);}
    showToast('🏁 Hausnummer beendet: Verlierer-Strafen gebucht','success');
    return true;
  }catch(error){
    console.error('Hausnummer Abschluss',error);
    showToast('❌ Abschluss fehlgeschlagen. Bitte erneut versuchen.','error');
    return false;
  }finally{s.finishing=false;}
}
function resetHausGame(mode) {
  if(!confirm('Hausnummer-Spiel wirklich zurücksetzen?'))return;
  const old=ensureHausState(mode);
  const fresh=createHausState();fresh.history=old.history;
  setHausState(mode,fresh);renderHausGame(mode);persistState();
}
function hausCloseThrowModal(){
  const modal=document.getElementById('haus-throw-modal');
  if(modal)modal.remove();
}
function hausOpenThrowModal(mode,playerIndex,place){
  const s=ensureHausState(mode);
  const name=s.playerOrder[playerIndex];
  if(!s.active||s.busy||s.playerOrder[s.currentPlayerIndex]!==name||s.rows[name]?.[place])return;
  hausCloseThrowModal();
  const overlay=document.createElement('div');
  overlay.id='haus-throw-modal';overlay.className='haus-modal-overlay';
  const card=document.createElement('div');card.className='haus-modal-card';
  const title=document.createElement('h3');title.textContent='🎳 Wurf eintragen';
  const subtitle=document.createElement('p');subtitle.textContent=name+' · '+['Hunderter','Zehner','Einer'][place];
  const grid=document.createElement('div');grid.className='haus-modal-grid';
  const options=[...Array(10).keys()].map(n=>({label:String(n),pins:n,gosse:false}));
  options.push({label:'👑 Kranz',pins:12,gosse:false},{label:'💀 Gosse',pins:0,gosse:true});
  for(const opt of options){
    const button=document.createElement('button');button.type='button';
    button.textContent=opt.label;button.className='haus-modal-option';
    button.onclick=async()=>{if(button.disabled)return;grid.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{const booked=await hausThrow(mode,opt.pins,opt.gosse,place);if(booked)hausCloseThrowModal();else grid.querySelectorAll('button').forEach(b=>b.disabled=false);}
      catch(err){console.error(err);grid.querySelectorAll('button').forEach(b=>b.disabled=false);}
    };
    grid.append(button);
  }
  const cancel=document.createElement('button');cancel.type='button';cancel.className='haus-modal-cancel';cancel.textContent='Abbrechen';cancel.onclick=hausCloseThrowModal;
  card.append(title,subtitle,grid,cancel);overlay.append(card);
  overlay.addEventListener('click',e=>{if(e.target===overlay)hausCloseThrowModal()});
  document.body.append(overlay);
}
function renderHausGame(mode) {
  const s=ensureHausState(mode),id=hausId(mode),board=document.getElementById(id+'-board');
  if(!board)return;
  const start=document.getElementById(id+'-start');
  if(start)start.classList.toggle('hidden',s.active);
  const names=s.playerOrder.length?s.playerOrder:hausPlayers(mode).map(p=>p.name);
  const current=s.playerOrder[s.currentPlayerIndex];
  const label=mode==='hoch'?'🔢 Hohe Hausnummer':'🔽 Tiefe Hausnummer';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=names.map((name,playerIndex)=>{
    const r=s.rows[name]||[null,null,null],num=hausNumber(mode,r);
    const active=s.active&&current===name;
    const cells=[0,1,2].map(i=>{
      const filled=!!r[i],value=filled?String(hausThrowValue(mode,r[i])):'–';
      return `<td class="haus-cell"><button type="button" class="haus-slot ${filled?'haus-slot-filled':active?'haus-slot-active':''}" ${!filled&&active?`onclick="hausOpenThrowModal('${mode}',${playerIndex},${i})"`:'disabled'}>${esc(value)}</button></td>`;
    }).join('');
    return '<tr class="'+(active?'haus-current-row':'')+'"><td class="haus-player">'+esc(name)+(active?' <span class="haus-turn-tag">🎳 Am Wurf</span>':'')+'</td>'+cells+'<td class="haus-score">'+(num===null?'–':num)+'</td></tr>';
  }).join('');
  board.innerHTML='<div class="haus-game-header"><strong>'+label+'</strong><span>'+(s.active?'Am Wurf: '+esc(current):s.finished?'🏁 Beendet':'Spiel starten, um Würfe einzutragen')+'</span>'+(s.undoStack.length&&!s.finished?'<button type="button" class="secondary-btn" onclick="undoHausThrow(\''+mode+'\')">↩ Rückgängig</button>':'')+'</div>'+
  '<div class="haus-table-wrap"><table class="haus-table"><thead><tr><th>Spieler</th><th>Hunderter</th><th>Zehner</th><th>Einer</th><th>Hausnummer</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p class="haus-help">Tippe beim aktuellen Spieler auf ein freies Kästchen und wähle den Wurf. Kranz und Gosse werden automatisch in der Strafentabelle berücksichtigt.</p>'+
  (s.finished?'<div class="haus-winner">🏆 '+esc(s.history[0]?.winner||'')+' gewinnt!'+(s.history[0]?.assigned?.length?' · '+s.history[0].assigned.map(x=>esc(x.name)+' ('+x.rank+'. Verlierer)').join(', '):'')+'</div>':'')+
  (s.active&&s.playerOrder.length&&s.playerOrder.every(name=>hausNumber(mode,s.rows[name])!==null)?'<button type="button" class="secondary-btn" onclick="finishHausGame(\''+mode+'\')">🏁 Abschluss erneut buchen</button>':'');
}
