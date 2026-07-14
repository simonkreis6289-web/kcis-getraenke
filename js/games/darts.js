// ── DARTS ── 

let pendingDartsPenalty = null;

function createDartsState() {
  return {
    active: false,
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
  if (!dartsState.startValue) dartsState.startValue = 301;
}

function startDartsGame() {
  const input = document.getElementById('darts-start-input');
  const startValue = parseInt(input?.value || '301', 10) || 301;

  dartsState = createDartsState();
  dartsState.active = true;
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
  kranzBtn.innerHTML = `Kranz<br><span style="font-size:0.72rem;">${kranzValue} Punkte</span>`;
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

  if (title) title.textContent = `${type} geworfen`;
  if (sub) sub.textContent = 'Wer hat geworfen?';

  if (select) {
    select.innerHTML = '<option value="">Bitte Person wählen</option>';

    persons
      .filter(p => p.present && !p.left)
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
  if (!pendingDartsPenalty) return;

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
    points
  } = pendingDartsPenalty;

  const key = getPenaltyKeyByType(type);

  if (!key) {
    showToast(
      `Strafe "${type}" nicht gefunden`,
      'error'
    );
    return;
  }

  const activePlayers = persons.filter(
    p => p.present && !p.left
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

  const success =
    await changeMultipleSyncedPersonCounters(
      changes
    );

  if (!success) return;

  if (
    typeof addPenaltyStatsEntry === 'function'
  ) {
    addPenaltyStatsEntry(
      type,
      personName,
      punishedNames
    );
  }

  if (!dartsState.roundThrows[team]) {
    dartsState.roundThrows[team] = [];
  }

  dartsState.roundThrows[team].push({
    hit: type,
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

  closeDartsPenaltyPlayerModal();

  renderDarts();
  persistState();

  showToast(
    type === 'gosse'
      ? `💀 Gosse für ${personName} gebucht`
      : `✅ ${type}: ${personName} ist straffrei`,
    'success'
  );
}

function handleDartsThrow(hitKey) {
  ensureDartsState();

  const team = dartsThrowTeam;

  if (!team) return;

  const value = parseInt(
    dartsState.valueMap[hitKey] ??
    DARTS_DEFAULT_VALUES[hitKey] ??
    0,
    10
  ) || 0;

  dartsState.roundThrows[team].push({
    hit: hitKey,
    value,
    createdAt: new Date().toISOString()
  });

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

function finishDartsRound() {
  ensureDartsState();

  if (!dartsState.active || dartsState.winner) return;

  const t1Round = getDartsRoundTotal('T1');
  const t2Round = getDartsRoundTotal('T2');

  if (t1Round <= 0 && t2Round <= 0) {
    showToast('Keine Würfe in dieser Runde eingetragen', 'error');
    return;
  }

  if (t1Round === t2Round) {
    dartsState.buffer += t1Round + t2Round;

    dartsState.history.unshift({
      type: 'draw',
      t1Round,
      t2Round,
      bufferAdded: t1Round + t2Round,
      bufferAfter: dartsState.buffer,
      createdAt: new Date().toISOString()
    });

    dartsState.roundThrows.T1 = [];
    dartsState.roundThrows.T2 = [];

    renderDarts();
    persistState();

    showToast(`🤝 Gleichstand. ${t1Round + t2Round} Punkte in den Puffer`, 'success');
    return;
  }

  const winningTeam = t1Round > t2Round ? 'T1' : 'T2';
  const winningPoints = t1Round + t2Round + dartsState.buffer;

  dartsState.scores[winningTeam] = Math.max(0, dartsState.scores[winningTeam] - winningPoints);

  dartsState.history.unshift({
    type: 'round',
    winner: winningTeam,
    t1Round,
    t2Round,
    bufferUsed: dartsState.buffer,
    pointsSubtracted: winningPoints,
    scoreAfter: dartsState.scores[winningTeam],
    createdAt: new Date().toISOString()
  });

  dartsState.buffer = 0;
  dartsState.roundThrows.T1 = [];
  dartsState.roundThrows.T2 = [];

  if (dartsState.scores[winningTeam] <= 0) {
    dartsState.winner = winningTeam;
    dartsState.active = false;
    showToast(`🏆 ${getTeamLabel(winningTeam)} gewinnt Darts!`, 'success');
  } else {
    showToast(`${getTeamLabel(winningTeam)} gewinnt die Runde: -${winningPoints}`, 'success');
  }

  renderDarts();
  persistState();
}

function renderDarts() {
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
    card.className = 'darts-setting-card';
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

async function deleteDartsThrow(
  team,
  index
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
    !confirm(
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
        reverseChanges
      );

    if (!success) {
      showToast(
        '❌ Strafe konnte nicht zurückgenommen werden. Wurf bleibt bestehen.',
        'error'
      );
      return;
    }
  }

  dartsState.roundThrows[team].splice(
    index,
    1
  );

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
 
