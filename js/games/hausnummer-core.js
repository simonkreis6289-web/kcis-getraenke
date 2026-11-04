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
  s.active=true;s.finished=false;s.startedAt=new Date().toISOString();
  s.playerOrder=players.map(p=>p.name);s.rows={};s.undoStack=[];s.currentPlayerIndex=0;
  for(const p of players)s.rows[p.name]=[null,null,null];
  dashboardActiveGame=hausId(mode);
  renderHausGame(mode);persistState();
}
function hausNextPlayer(mode) {
  const s=ensureHausState(mode),names=s.playerOrder;
  const incomplete=names.filter(n=>(s.rows[n]||[]).some(v=>!v));
  if(!incomplete.length){finishHausGame(mode);return;}
  let idx=s.currentPlayerIndex;
  for(let i=0;i<names.length;i++){
    idx=(idx+1)%names.length;
    if(incomplete.includes(names[idx])){s.currentPlayerIndex=idx;break;}
  }
}
async function hausThrow(mode,pins,isGosse=false) {
  const s=ensureHausState(mode);
  if(!s.active||s.busy)return;
  const name=s.playerOrder[s.currentPlayerIndex],row=s.rows[name];
  if(!row||row.every(Boolean))return;
  const n=Number(pins);
  if(!Number.isInteger(n)||n<0||n>12)return;
  const free=row.map((x,i)=>x?null:i).filter(x=>x!==null);
  const place=free.length===1?free[0]:Number(document.getElementById('haus-'+mode+'-place')?.value);
  if(!free.includes(place)){showToast('Bitte eine freie Stelle wählen','error');return;}
  s.busy=true;
  try {
    const throwData={value:n,isGosse:!!isGosse};
    if(!(await changeSoloThrowPenalty(name,null,throwData)))return;
    row[place]=throwData;
    s.undoStack.push({name,place,index:s.currentPlayerIndex});
    hausNextPlayer(mode);renderHausGame(mode);persistState();
  }finally{s.busy=false;}
}
async function undoHausThrow(mode) {
  const s=ensureHausState(mode);
  if(s.busy||!s.undoStack.length)return;
  const last=s.undoStack[s.undoStack.length-1],row=s.rows[last.name];
  if(!row||!row[last.place])return;
  s.busy=true;
  try{
    if(!(await changeSoloThrowPenalty(last.name,row[last.place],null)))return;
    row[last.place]=null;s.undoStack.pop();s.active=true;s.finished=false;
    s.currentPlayerIndex=last.index;
    renderHausGame(mode);persistState();
  }finally{s.busy=false;}
}
function finishHausGame(mode) {
  const s=ensureHausState(mode);
  s.active=false;s.finished=true;
  const results=s.playerOrder.map(name=>({name,number:hausNumber(mode,s.rows[name])}))
    .sort((a,b)=>mode==='hoch'?b.number-a.number:a.number-b.number);
  s.history.unshift({id:hausId(mode)+'_'+Date.now(),createdAt:new Date().toISOString(),
    results,rows:JSON.parse(JSON.stringify(s.rows)),settings:JSON.parse(JSON.stringify(hausnummerSettings[mode]))});
  showToast('Hausnummer-Spiel abgeschlossen','success');
}
function resetHausGame(mode) {
  if(!confirm('Hausnummer-Spiel wirklich zurücksetzen?'))return;
  const old=ensureHausState(mode);
  const fresh=createHausState();fresh.history=old.history;
  setHausState(mode,fresh);renderHausGame(mode);persistState();
}
function renderHausGame(mode) {
  const s=ensureHausState(mode),id=hausId(mode),board=document.getElementById(id+'-board');
  if(!board)return;
  const start=document.getElementById(id+'-start');
  if(start)start.classList.toggle('hidden',s.active);
  const names=s.playerOrder.length?s.playerOrder:hausPlayers(mode).map(p=>p.name);
  const current=s.playerOrder[s.currentPlayerIndex];
  const row=s.rows[current]||[null,null,null];
  const free=row.map((x,i)=>x?null:i).filter(x=>x!==null);
  const label=mode==='hoch'?'🔢 Hohe Hausnummer':'🔽 Tiefe Hausnummer';
  const options=free.map(i=>'<option value="'+i+'">'+['Hunderter','Zehner','Einer'][i]+'</option>').join('');
  const buttons=[1,2,3,4,5,6,7,8,9,12].map(n=>'<button class="pinpad-btn" onclick="hausThrow(\''+mode+'\','+n+')">'+(n===12?'👑 Kranz':n)+'</button>').join('');
  const rows=names.map(name=>{
    const r=s.rows[name]||[null,null,null],num=hausNumber(mode,r);
    return '<tr><td>'+name.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</td><td>'+hausDisplay(mode,r)+'</td><td><strong>'+(num===null?'–':num)+'</strong></td></tr>';
  }).join('');
  board.innerHTML='<div class="game-throw-toolbar"><strong>'+label+(s.active?' · Am Wurf: '+current:'')+'</strong>'+
    (s.undoStack.length?'<button class="secondary-btn" onclick="undoHausThrow(\''+mode+'\')">↩ Rückgängig</button>':'')+
    (s.active?'<label>Stelle <select id="haus-'+mode+'-place">'+options+'</select></label>'+buttons+
      '<button class="pinpad-btn special" onclick="hausThrow(\''+mode+'\',0,true)">💀 Gosse</button>':'')+
    '</div><div class="game-compact-wrap"><table class="game-compact-table"><thead><tr><th>Spieler</th><th>Hunderter | Zehner | Einer</th><th>Hausnummer</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<div class="game-compact-note">Jeder Wurf wird sofort einer freien Stelle zugeordnet. Kranz kann zwei Ziffern ergeben. Sonderwurf-Strafen werden synchron gebucht.</div>'+
    (s.finished?'<div class="game-compact-note">🏆 '+(s.history[0]?.results[0]?.name||'')+' gewinnt!</div>':'');
}
