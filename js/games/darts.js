// ── DARTS ── 

let pendingDartsPenalty = null;
let dartsPenaltyBusy = false;

function createDartsState() {
  return {
    active: false,
    currentTeam: 'T1',
    startValue: 301,
    scores: {
      T1: 301,
      T2: 301
    },
    roundThrows: {
      T1: [],
      T2: []
    },
    valueMap: { ...DARTS_DEFAULT_VALUES },
    buffer: 0,
    winner: null,
    history: []
  };
}

function ensureDartsState() {
  if (!dartsState) dartsState = createDartsState();

  if (!dartsState.scores) dartsState.scores = { T1: 301, T2: 301 };
  if (!dartsState.roundThrows) dartsState.roundThrows = { T1: [], T2: [] };
  if (!dartsState.roundThrows.T1) dartsState.roundThrows.T1 = [];
  if (!dartsState.roundThrows.T2) dartsState.roundThrows.T2 = [];
  if (!dartsState.valueMap) dartsState.valueMap = { ...DARTS_DEFAULT_VALUES };
  if (!Array.isArray(dartsState.history)) dartsState.history = [];
  if (dartsState.buffer === undefined) dartsState.buffer = 0;
  if (!['T1','T2'].includes(dartsState.currentTeam)) {
    const all=['T1','T2'].flatMap(team=>dartsState.roundThrows[team].map(entry=>({team,at:entry.createdAt||''}))).sort((a,b)=>a.at.localeCompare(b.at));
    dartsState.currentTeam=all.length?(all.at(-1).team==='T1'?'T2':'T1'):'T1';
  }
  if (!dartsState.startValue) dartsState.startValue = 301;
}

function startDartsGame() {
  if(typeof gameSetupCheckGroups==='function'&&!gameSetupCheckGroups('darts'))return;
  const input = document.getElementById('darts-start-input');
  const startValue = parseInt(input?.value || '301', 10) || 301;

  dartsState = createDartsState();
  if(typeof gameSetupTeamMap==='function')dartsState.participantTeams=gameSetupTeamMap('darts');
  dartsState.active = true;
  dartsState.startedAt = new Date().toISOString();
  dashboardActiveGame = "darts";
  dartsState.startValue = startValue;
  dartsState.scores.T1 = startValue;
  dartsState.scores.T2 = startValue;

  renderDarts();
  persistState();

  showToast('🎯 Darts gestartet', 'success');
}
  
function resetDartsGame() {
  if (!confirm('Darts wirklich neu starten?')) return;

  dartsState = createDartsState();

  renderDarts();
  persistState();

  showToast('↻ Darts zurückgesetzt', 'success');
}

function openDartsThrowModal(team) {
  ensureDartsState();

  if (!dartsState.active) {
    showToast('Bitte zuerst Darts starten', 'error');
    return;
  }

  dartsThrowTeam = team;

  const title = document.getElementById('darts-throw-title');
  const grid = document.getElementById('darts-number-grid');

  if (title) title.textContent = `Wurf für ${getTeamLabel(team)}`;
  if (!grid) return;

  grid.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const value = dartsState.valueMap[n] ?? DARTS_DEFAULT_VALUES[n];

    const btn = document.createElement('button');
    btn.className = 'darts-number-btn';
    btn.innerHTML = `${n}<br><span style="font-size:0.72rem;">${value} Punkte</span>`;

    if (n === 9) {
      btn.onclick = () => openDartsPenaltyPlayerModal('9er', team, value);
    } else {
      btn.onclick = () => handleDartsThrow(String(n));
    }

    grid.appendChild(btn);
  }

  const kranzValue = dartsState.valueMap.kranz ?? 50;

  const kranzBtn = document.createElement('button');
  kranzBtn.className = 'darts-number-btn kranz';
  kranzBtn.textContent = window.KCKranzUI?KCKranzUI.label('darts'):('Kranz ('+kranzValue+')');
  kranzBtn.onclick = () => openDartsPenaltyPlayerModal('kranz', team, kranzValue);
  grid.appendChild(kranzBtn);

  [
    { label: '🎳 Durchgeworfen', type: 'durchgeworfen', points: 0 },
    { label: '💀 Gosse', type: 'gosse', points: 0 }
  ].forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'darts-number-btn kranz';
    btn.innerHTML = `${item.label}<br><span style="font-size:0.72rem;">0 Punkte</span>`;
    btn.onclick = () => openDartsPenaltyPlayerModal(item.type, team, item.points);
    grid.appendChild(btn);
  });

  document.getElementById('darts-throw-modal').classList.remove('hidden');
}

function closeDartsThrowModal() {
  document.getElementById('darts-throw-modal').classList.add('hidden');
  dartsThrowTeam = null;
}

function openDartsPenaltyPlayerModal(type, team, points) {
  pendingDartsPenalty = { type, team, points };

  const title = document.getElementById('darts-penalty-player-title');
  const sub = document.getElementById('darts-penalty-player-sub');
  const select = document.getElementById('darts-penalty-player-select');

  if (title) title.textContent = type==='milestone'?'Pin-Meilenstein · Wer hat geworfen?':`${type} geworfen`;
  if (sub) sub.textContent = 'Wer hat geworfen?';

  if (select) {
    select.innerHTML = '<option value="">Bitte Person wählen</option>';

    persons
      .filter(p => p.present && !p.left && !p.inactive && !p.isDrinksOnly)
      .filter(p => typeof gameTeamNames!=='function'||gameTeamNames('darts',team).includes(p.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
  }

  document.getElementById('darts-throw-modal')?.classList.add('hidden');
  document.getElementById('darts-penalty-player-modal')?.classList.remove('hidden');
}

function closeDartsPenaltyPlayerModal() {
  document.getElementById('darts-penalty-player-modal')?.classList.add('hidden');
  pendingDartsPenalty = null;
}

async function confirmDartsPenaltyPlayer() {
  if (!pendingDartsPenalty||dartsPenaltyBusy) return;

  const personName =
    document.getElementById(
      'darts-penalty-player-select'
    )?.value || '';

  if (!personName) {
    showToast(
      'Bitte Person auswählen',
      'error'
    );
    return;
  }

  const {
    type,
    team,
    points:rawPoints
  } = pendingDartsPenalty;
  if(type==='milestone'){
    dartsThrowTeam=team;closeDartsPenaltyPlayerModal();
    return handleDartsThrow(String(rawPoints),personName);
  }
  const points=type==='kranz'&&window.KCKranzUI?await KCKranzUI.select('darts'):rawPoints;if(points===null)return;

  const key = getPenaltyKeyByType(type);

  if (!key) {
    showToast(
      `Strafe "${type}" nicht gefunden`,
      'error'
    );
    return;
  }

  const activePlayers = persons.filter(
    p => p.present && !p.left && !p.inactive && !p.isDrinksOnly
  );

  let punishedNames = [];

  if (type === 'gosse') {
    punishedNames = [personName];
  } else {
    punishedNames = activePlayers
      .filter(p => p.name !== personName)
      .map(p => p.name);
  }

  const changes = punishedNames.map(name => ({
    personName: name,
    category: 'strafen',
    key,
    delta: 1
  }));

  dartsPenaltyBusy=true;
  try{
  const success =
    await changeMultipleSyncedPersonCounters(
      changes
    );

  if (!success) return;

  if (
    typeof addPenaltyStatsEntry === 'function'
  ) {
    var stat=addPenaltyStatsEntry(
      type,
      personName,
      punishedNames
    );
  }

  if (!dartsState.roundThrows[team]) {
    dartsState.roundThrows[team] = [];
  }

  dartsState.roundThrows[team].push({
    order:(Number(dartsLatestThrow(dartsState)?.entry.order)||0)+1,
    hit: type,statId:stat?.id,
    value: points,
    thrower: personName,

    /*
     * Wichtig für späteres Löschen:
     * Damit wissen wir exakt, welche Strafe
     * wieder zurückgenommen werden muss.
     */
    penaltyKey: key,
    punishedNames: [...punishedNames],
    penaltyBooked: true,

    createdAt: new Date().toISOString()
  });

  dartsState.currentTeam=team==='T1'?'T2':'T1';
  closeDartsThrowModal();
  closeDartsPenaltyPlayerModal();

  renderDarts();
  persistState();

  showToast(
    type === 'gosse'
      ? `💀 Gosse für ${personName} gebucht`
      : `✅ ${type}: ${personName} ist straffrei`,
    'success'
  );
  }finally{dartsPenaltyBusy=false;}
}

async function handleDartsThrow(hitKey,personName='') {
  ensureDartsState();

  const team = dartsThrowTeam;

  if (!['T1','T2'].includes(team)||!dartsState.active||dartsState.winner) return;

  if(!personName&&window.KCEveningCounters?.needsThrower?.(window.KCSharedSync?.server||getFirestoreState(),Number(hitKey)))return openDartsPenaltyPlayerModal('milestone',team,Number(hitKey));

  const rawValue = parseInt(
    dartsState.valueMap[hitKey] ??
    DARTS_DEFAULT_VALUES[hitKey] ??
    0,
    10
  ) || 0;

  const value=hitKey==='kranz'&&window.KCKranzUI?await KCKranzUI.select('darts'):rawValue;if(value===null)return;
  dartsState.roundThrows[team].push({
    order:(Number(dartsLatestThrow(dartsState)?.entry.order)||0)+1,
    hit: hitKey,
    ...(personName?{thrower:personName}:{}),
    value,
    createdAt: new Date().toISOString()
  });

  dartsState.currentTeam=team==='T1'?'T2':'T1';
  closeDartsThrowModal();

  renderDarts();
  persistState();

  showToast(
    `${getTeamLabel(team)} +${value} Punkte`,
    'success'
  );
}

function getDartsRoundTotal(team) {
  ensureDartsState();

  return dartsState.roundThrows[team].reduce((sum, entry) => {
    return sum + (parseInt(entry.value || 0, 10) || 0);
  }, 0);
}

function dartsRoundSnapshot(){
  return {
    scores:{...dartsState.scores},buffer:dartsState.buffer,
    roundThrows:JSON.parse(JSON.stringify(dartsState.roundThrows)),
    currentTeam:dartsState.currentTeam,active:dartsState.active,
    winner:dartsState.winner,finished:!!dartsState.finished
  };
}
function dartsRestoreRound(snapshot){
  dartsState.scores={...snapshot.scores};
  dartsState.buffer=snapshot.buffer;
  dartsState.roundThrows=JSON.parse(JSON.stringify(snapshot.roundThrows));
  dartsState.currentTeam=snapshot.currentTeam;
  dartsState.active=snapshot.active;
  dartsState.winner=snapshot.winner;
  dartsState.finished=snapshot.finished;
  delete dartsState.finishPenalties;
  delete dartsState.resultHistoryId;
}
async function finishDartsRound(){
  ensureDartsState();
  if(!dartsState.active||dartsState.winner||dartsState.closing)return;
  const t1Round=getDartsRoundTotal('T1'),t2Round=getDartsRoundTotal('T2');
  if(t1Round<=0&&t2Round<=0){showToast('Keine Würfe in dieser Runde eingetragen','error');return;}
  const before=dartsRoundSnapshot(),now=new Date().toISOString();
  if(t1Round===t2Round){
    dartsState.buffer+=t1Round+t2Round;
    dartsState.history.unshift({type:'draw',t1Round,t2Round,bufferAdded:t1Round+t2Round,bufferAfter:dartsState.buffer,createdAt:now,undoSnapshot:before});
    dartsState.roundThrows.T1=[];dartsState.roundThrows.T2=[];
    renderDarts();persistState();
    showToast('🤝 Gleichstand. '+(t1Round+t2Round)+' Punkte in den Puffer','success');
    return;
  }
  const winningTeam=t1Round>t2Round?'T1':'T2',winningPoints=t1Round+t2Round+dartsState.buffer;
  const nextScore=Math.max(0,dartsState.scores[winningTeam]-winningPoints);
  const final=nextScore<=0;
  let finishPenalties=[];
  if(final){
    const loser=winningTeam==='T1'?'T2':'T1',key=getFirstLoserStrafeKey();
    if(!key){showToast('Strafe „1. Verlierer“ fehlt.','error');return;}
    const names=(dartsState.participantTeams?.[loser]||getActiveTeamMembers(loser).map(p=>p.name));
    finishPenalties=names.map(personName=>({personName,category:'strafen',key,delta:1}));
    if(!finishPenalties.length){showToast('Kein Verliererteam zum Buchen vorhanden','error');return;}
    dartsState.closing=true;
    try{
      if(!(await changeMultipleSyncedPersonCounters(finishPenalties,'🎯 Darts: Verliererteam'))){
        showToast('Darts-Abschluss konnte nicht gebucht werden.','error');return;
      }
    }catch(error){showToast('Darts-Abschluss fehlgeschlagen: '+(error?.message||error),'error');return;}
    finally{dartsState.closing=false;}
  }
  dartsState.scores[winningTeam]=nextScore;
  dartsState.history.unshift({type:'round',winner:winningTeam,t1Round,t2Round,bufferUsed:dartsState.buffer,pointsSubtracted:winningPoints,scoreAfter:nextScore,createdAt:now,undoSnapshot:before});
  dartsState.buffer=0;dartsState.roundThrows.T1=[];dartsState.roundThrows.T2=[];
  if(final){
    dartsState.finishPenalties=finishPenalties.map(({personName,key,delta})=>({personName,key,delta}));
    dartsState.finished=true;dartsState.winner=winningTeam;dartsState.active=false;
    if(typeof recordCompletedGame==='function')recordCompletedGame('darts',dartsState);
    showToast('🏆 '+getTeamLabel(winningTeam)+' gewinnt Darts!','success');
  }else showToast(getTeamLabel(winningTeam)+' gewinnt die Runde: -'+winningPoints,'success');
  renderDarts();persistState();
}
async function undoDartsRound(){
  ensureDartsState();
  const last=dartsState.history[0],snapshot=last?.undoSnapshot;
  if(!last||!snapshot||dartsState.closing)return;
  if(dartsState.roundThrows.T1.length||dartsState.roundThrows.T2.length){
    showToast('Erst die Würfe der aktuellen Runde entfernen, bevor die vorherige Runde zurückgenommen wird.','error');return;
  }
  if(!confirm('Letzte abgeschlossene Darts-Runde rückgängig machen? Punktestand, Puffer und Würfe werden wiederhergestellt.'))return;
  dartsState.closing=true;renderDarts();
  try{
    if(dartsState.finished&&dartsState.finishPenalties?.length){
      const reverse=dartsState.finishPenalties.map(({personName,key,delta})=>({personName,key,category:'strafen',delta:-delta}));
      if(!(await changeMultipleSyncedPersonCounters(reverse,'↩ Darts: Verlierer-Strafen zurückgenommen',{reverse:true}))){
        showToast('Verlierer-Strafen konnten nicht zurückgenommen werden. Runde bleibt abgeschlossen.','error');return;
      }
    }
    if(dartsState.resultHistoryId&&typeof strafenHistory!=='undefined'&&Array.isArray(strafenHistory)){
      strafenHistory=strafenHistory.filter(entry=>entry.id!==dartsState.resultHistoryId);
    }
    dartsState.history.shift();
    dartsRestoreRound(snapshot);
    renderAll();persistState();
    showToast('↩ Darts-Runde zurückgenommen: Würfe, Punkte und Puffer wiederhergestellt','success');
  }catch(error){
    showToast('Rückgängig fehlgeschlagen: '+(error?.message||error),'error');
  }finally{dartsState.closing=false;renderDarts();}
}

function renderDarts() {
  if(typeof renderCommonGameSetups==='function')renderCommonGameSetups();
  ensureDartsState();

  const startInput = document.getElementById('darts-start-input');
  const area = document.getElementById('darts-game-area');

  if (startInput && document.activeElement !== startInput) {
    startInput.value = dartsState.startValue || 301;
  }

  if (area) {
    area.classList.toggle(
      'hidden',
      !dartsState.active && !dartsState.history.length && !dartsState.winner
    );
  }

  const scoreT1 = document.getElementById('darts-score-t1');
  const scoreT2 = document.getElementById('darts-score-t2');
  const roundT1 = document.getElementById('darts-round-t1');
  const roundT2 = document.getElementById('darts-round-t2');
  const buffer = document.getElementById('darts-buffer-display');

  const t1RoundTotal = getDartsRoundTotal('T1');
  const t2RoundTotal = getDartsRoundTotal('T2');

    const projected = getDartsLiveProjectedScores();

    const t1LiveRest = projected.T1;
    const t2LiveRest = projected.T2;

  if (scoreT1) scoreT1.textContent = dartsState.scores.T1;
  if (scoreT2) scoreT2.textContent = dartsState.scores.T2;

  if (roundT1) {
    roundT1.innerHTML = `
      <div>Runde: ${t1RoundTotal}</div>
      <div class="darts-live-rest">Live-Rest: ${t1LiveRest}</div>
    `;
  }

  if (roundT2) {
    roundT2.innerHTML = `
      <div>Runde: ${t2RoundTotal}</div>
      <div class="darts-live-rest">Live-Rest: ${t2LiveRest}</div>
    `;
  }

  if (buffer) {
    const bufferValue = dartsState.buffer || 0;

    if (dartsState.winner) {
      buffer.classList.remove('hidden');
      buffer.textContent = `🏆 Gewinner: ${getTeamLabel(dartsState.winner)}`;
    } else if (bufferValue > 0) {
      buffer.classList.remove('hidden');
      buffer.textContent = `Puffer: ${bufferValue} Punkte`;
    } else {
      buffer.classList.add('hidden');
      buffer.textContent = '';
    }
  }

  const undoButton=document.getElementById('darts-undo-round');
  if(undoButton){undoButton.disabled=!!dartsState.closing||!dartsState.history[0]?.undoSnapshot||dartsState.roundThrows.T1.length>0||dartsState.roundThrows.T2.length>0;undoButton.title=dartsState.roundThrows.T1.length||dartsState.roundThrows.T2.length?'Erst die Würfe der aktuellen Runde entfernen':'Letzte abgeschlossene Runde wiederherstellen';}
  renderDartsRoundList();
  renderDartsHistory();
}
    
function getDartsLiveProjectedScores() {
  ensureDartsState();

  const t1Round = getDartsRoundTotal('T1');
  const t2Round = getDartsRoundTotal('T2');

  const projected = {
    T1: dartsState.scores.T1,
    T2: dartsState.scores.T2,
    leader: null,
    subtractPoints: 0
  };

  if (t1Round === t2Round) {
    return projected;
  }

  const leader = t1Round > t2Round ? 'T1' : 'T2';
  const subtractPoints = t1Round + t2Round + (dartsState.buffer || 0);

  projected.leader = leader;
  projected.subtractPoints = subtractPoints;
  projected[leader] = Math.max(0, dartsState.scores[leader] - subtractPoints);

  return projected;
}
    
function renderDartsSettings() {
  ensureDartsState();

  const grid = document.getElementById('darts-settings-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const entries = [
    ['1', 'Wurf 1'],
    ['2', 'Wurf 2'],
    ['3', 'Wurf 3'],
    ['4', 'Wurf 4'],
    ['5', 'Wurf 5'],
    ['6', 'Wurf 6'],
    ['7', 'Wurf 7'],
    ['8', 'Wurf 8'],
    ['9', 'Wurf 9'],
    ['kranz', 'Kranz']
  ];

  entries.forEach(([key, label]) => {
    const card = document.createElement('div');
    card.className = 'darts-setting-card'+(key==='kranz'&&window.KCKranzUI?' kc-kranz-legacy':'');
    card.innerHTML = `
      <label>${label}</label>
      <input
        type="number"
        min="0"
        step="1"
        id="darts-value-${key}"
        value="${dartsState.valueMap[key] ?? DARTS_DEFAULT_VALUES[key] ?? 0}"
        onchange="saveDartsSettings()"
      >
    `;
    grid.appendChild(card);
  });
}

function saveDartsSettings() {
  ensureDartsState();

  Object.keys(DARTS_DEFAULT_VALUES).forEach(key => {
    const input = document.getElementById('darts-value-' + key);
    if (input) {
      dartsState.valueMap[key] = Math.max(0, parseInt(input.value || '0', 10) || 0);
    }
  });

  renderDarts();
  persistState();

  showToast('🎯 Darts-Wertung gespeichert', 'success');
}

function resetDartsSettings() {
  if (!confirm('Darts-Wertung auf Standard zurücksetzen?')) return;

  ensureDartsState();
  dartsState.valueMap = { ...DARTS_DEFAULT_VALUES };

  renderAll();
  persistState();

  showToast('↻ Darts-Standardwertung wiederhergestellt', 'success');
}

function openDartsScoreSetupModal() {
  ensureDartsState();

  const t1Input = document.getElementById('darts-score-setup-t1');
  const t2Input = document.getElementById('darts-score-setup-t2');

  const t1Label = document.getElementById('darts-score-setup-t1-label');
  const t2Label = document.getElementById('darts-score-setup-t2-label');

  if (t1Input) t1Input.value = dartsState.scores?.T1 ?? dartsState.startValue ?? 301;
  if (t2Input) t2Input.value = dartsState.scores?.T2 ?? dartsState.startValue ?? 301;

  if (t1Label) t1Label.textContent = getTeamLabel('T1');
  if (t2Label) t2Label.textContent = getTeamLabel('T2');

  document.getElementById('darts-score-setup-modal')?.classList.remove('hidden');
}

function closeDartsScoreSetupModal() {
  document.getElementById('darts-score-setup-modal')?.classList.add('hidden');
}

function confirmDartsScoreSetup() {
  ensureDartsState();

  const t1Value = Math.max(
    0,
    parseInt(document.getElementById('darts-score-setup-t1')?.value || '0', 10) || 0
  );

  const t2Value = Math.max(
    0,
    parseInt(document.getElementById('darts-score-setup-t2')?.value || '0', 10) || 0
  );

  if (!dartsState.active) {
    dartsState.startedAt = new Date().toISOString();
    dartsState.finished = false;
  }
  dartsState.active = true;
  dartsState.winner = null;
  dartsState.scores.T1 = t1Value;
  dartsState.scores.T2 = t2Value;
  dartsState.startValue = Math.max(t1Value, t2Value, dartsState.startValue || 301);

  dartsState.roundThrows.T1 = [];
  dartsState.roundThrows.T2 = [];

  closeDartsScoreSetupModal();
  renderDarts();
  persistState();

  showToast('🎯 Darts-Startstand gesetzt', 'success');
}
  

function renderDartsRoundList() {
  const el = document.getElementById('darts-round-list');
  if (!el) return;

  const entries = [];

  ['T1', 'T2'].forEach(team => {
    dartsState.roundThrows[team].forEach((entry, index) => {
      entries.push({
        team,
        index,
        ...entry
      });
    });
  });

  if (!entries.length) {
    el.innerHTML = `
      <div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">
        Noch keine Würfe in dieser Runde
      </div>
    `;
    return;
  }

  el.innerHTML = entries.map(entry => `
    <div class="spiel-card">
      <div class="spiel-info">
        <div class="spiel-verlierer ${entry.team.toLowerCase()}">
          ${getTeamLabel(entry.team)}
        </div>

        <div class="spiel-detail">
          Wurf: ${entry.hit === 'kranz' ? 'Kranz' : entry.hit}
        </div>

        ${entry.thrower ? `
          <div class="spiel-detail">
            Spieler: ${entry.thrower}
          </div>
        ` : ''}
      </div>

      <div style="display:flex;align-items:center;gap:8px;">
        <div class="spiel-betrag">${entry.value}</div>

        <button
          class="secondary-btn"
          style="padding:4px 8px;min-height:auto;"
          onclick="deleteDartsThrow('${entry.team}', ${entry.index})"
        >
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

function dartsLatestThrow(state){
  const current=state.currentTeam==='T1'?'T1':'T2';
  return ['T1','T2'].map(team=>{
    const throws=state.roundThrows?.[team]||[];
    return {team,index:throws.length-1,entry:throws.at(-1)};
  }).filter(row=>row.entry).sort((a,b)=>(Number(b.entry.order)||0)-(Number(a.entry.order)||0)||
    (Date.parse(b.entry.createdAt)||0)-(Date.parse(a.entry.createdAt)||0)||Number(a.team===current)-Number(b.team===current))[0];
}
function undoDartsAction(){
  ensureDartsState();
  if(dartsState.closing||dartsPenaltyBusy||pendingDartsPenalty)return;
  const last=dartsLatestThrow(dartsState);
  return last?deleteDartsThrow(last.team,last.index,{undo:true}):undoDartsRound();
}
async function deleteDartsThrow(
  team,
  index, {undo=false}={}
) {
  ensureDartsState();

  const entry =
    dartsState.roundThrows?.[team]?.[index];

  if (!entry) return;

  const hitLabel =
    entry.hit === 'kranz'
      ? 'Kranz'
      : entry.hit;

  if (
    !undo && !confirm(
      `Wurf "${hitLabel}" (${entry.value} Punkte) löschen?`
    )
  ) {
    return;
  }

  /*
   * Wurde mit diesem Wurf eine Strafe gebucht,
   * wird sie synchron zurückgenommen.
   */
  if (
    entry.penaltyBooked &&
    entry.penaltyKey &&
    Array.isArray(entry.punishedNames) &&
    entry.punishedNames.length
  ) {
    const reverseChanges =
      entry.punishedNames.map(name => ({
        personName: name,
        category: 'strafen',
        key: entry.penaltyKey,
        delta: -1
      }));

    const success =
      await changeMultipleSyncedPersonCounters(
        reverseChanges, '', {reverse:true}
      );

    if (!success) {
      showToast(
        '❌ Strafe konnte nicht zurückgenommen werden. Wurf bleibt bestehen.',
        'error'
      );
      return;
    }
  }

  if(entry.thrower&&typeof removeOneSoloStatsEntry==='function')removeOneSoloStatsEntry(entry.thrower,entry.hit,entry.statId);
  dartsState.roundThrows[team].splice(
    index,
    1
  );
  if(undo)dartsState.currentTeam=team;

  renderDarts();
  persistState();

  showToast(
    entry.penaltyBooked
      ? '🗑️ Wurf und zugehörige Strafe entfernt'
      : '🗑️ Wurf gelöscht',
    'success'
  );
}

function renderDartsHistory() {
  const el = document.getElementById('darts-history-list');
  if (!el) return;

  if (!dartsState.history.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">Noch keine abgeschlossene Runde</div>';
    return;
  }

  el.innerHTML = dartsState.history.map((entry, index) => {
    if (entry.type === 'draw') {
      return `
        <div class="spiel-card">
          <div class="spiel-info">
            <div class="spiel-verlierer round">🤝 Runde ${dartsState.history.length - index}: Gleichstand</div>
            <div class="spiel-detail">Wand ${entry.t1Round} : ${entry.t2Round} TV</div>
            <div class="spiel-detail">Puffer +${entry.bufferAdded}, jetzt ${entry.bufferAfter}</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="spiel-card">
        <div class="spiel-info">
          <div class="spiel-verlierer ${entry.winner.toLowerCase()}">
            ${getTeamLabel(entry.winner)} gewinnt Runde ${dartsState.history.length - index}
          </div>
          <div class="spiel-detail">Wand ${entry.t1Round} : ${entry.t2Round} TV</div>
          <div class="spiel-detail">Puffer genutzt: ${entry.bufferUsed}</div>
          <div class="spiel-detail">Abgezogen: ${entry.pointsSubtracted}</div>
        </div>
        <div class="spiel-betrag">${entry.scoreAfter}</div>
      </div>
    `;
  }).join('');
}
 
