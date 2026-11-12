// ──-───────────────────────────────────────────────────────────────────────
// ── LOTTERIE ──   

let liveLotterieUnsubscribe = null;
let isApplyingLiveLotterie = false;

function getLiveLotteriePayload() {
  ensureLotterieState();
  syncLotteriePlayerOrder();

  return {
    active: !!lotterieState.active,
    customOrder: !!lotterieState.customOrder,
    restoreCustomOrder: !!lotterieState.restoreCustomOrder,
    startedAt: lotterieState.startedAt || '',
    gameFineFrozen:true,onTop: !!lotterieState.onTop,
    amountsGenerated:
      !!lotterieState.amountsGenerated,

    columnCount:
      parseInt(
        lotterieState.columnCount || 0,
        10
      ) || 0,

    columns: Array.isArray(
      lotterieState.columns
    )
      ? [...lotterieState.columns]
      : [],

    playerOrder: Array.isArray(
      lotterieState.playerOrder
    )
      ? [...lotterieState.playerOrder]
      : [],

    startPlayer:
      lotterieState.startPlayer || '',

    throws: {
      ...(lotterieState.throws || {})
    },

    throwMeta: {
      ...(lotterieState.throwMeta || {})
    },

    finished:
      !!lotterieState.finished,

    history: Array.isArray(
      lotterieState.history
    )
      ? [...lotterieState.history]
      : []
  };
}

async function saveLiveLotterieState() {
  if (
    isApplyingLiveLotterie ||
    !ACTIVE_CLUB ||
    !navigator.onLine ||
    typeof window.firestoreApi
      ?.saveLiveLotterie !== 'function'
  ) {
    return false;
  }

  try {
    const clubId =
      getClubFirestoreId(ACTIVE_CLUB);

    await window.firestoreApi
      .saveLiveLotterie(
        clubId,
        getLiveLotteriePayload()
      );

    return true;
  } catch (error) {
    console.error(
      'Lotterie-Livestand konnte nicht gespeichert werden:',
      error
    );

    showToast(
      '❌ Lotterie konnte nicht synchronisiert werden',
      'error'
    );

    return false;
  }
}

function applyLiveLotterieState(
  remoteState
) {
  if (!remoteState) return;
  // Legacy records had top-level fields; current records use `state`.
  const incoming = remoteState.state && typeof remoteState.state === 'object'
    ? remoteState.state : remoteState;

  isApplyingLiveLotterie = true;

  try {
    lotterieState = {
      ...createLotterieState(),
      ...incoming,

      columns: Array.isArray(
        incoming.columns
      )
        ? [...incoming.columns]
        : [],

      playerOrder: Array.isArray(incoming.playerOrder)
        ? [...incoming.playerOrder]
        : [],

      startPlayer: incoming.startPlayer || '',

      throws:
        incoming.throws &&
        typeof incoming.throws ===
          'object'
          ? incoming.throws
          : {},

      throwMeta:
        incoming.throwMeta &&
        typeof incoming.throwMeta ===
          'object'
          ? incoming.throwMeta
          : {},

      history: Array.isArray(
        incoming.history
      )
        ? [...incoming.history]
        : []
    };

    ensureLotterieState();
    renderLotterie();
    renderLotterieAmountEditor();
    renderLotteriePlayerOrderEditor();
    renderLotterieHistory();
  } finally {
    isApplyingLiveLotterie = false;
  }
}

async function startLiveLotterieSync() {
  if (
    liveLotterieUnsubscribe
  ) {
    liveLotterieUnsubscribe();
    liveLotterieUnsubscribe = null;
  }

  if (
    !ACTIVE_CLUB ||
    typeof window.firestoreApi
      ?.subscribeToLiveLotterie !==
      'function'
  ) {
    return;
  }

  const clubId =
    getClubFirestoreId(ACTIVE_CLUB);

  const existing =
    await window.firestoreApi
      .loadLiveLotterie(clubId);

  if (existing) {
    applyLiveLotterieState(existing);
  } else {
    await window.firestoreApi
      .saveLiveLotterie(
        clubId,
        getLiveLotteriePayload()
      );
  }

  liveLotterieUnsubscribe =
    window.firestoreApi
      .subscribeToLiveLotterie(
        clubId,
        remoteState => {
          if (!remoteState) return;

          applyLiveLotterieState(
            remoteState
          );
        },
        error => {
          console.error(
            'Lotterie-Live-Sync fehlgeschlagen:',
            error
          );
        }
      );
}

function stopLiveLotterieSync() {
  if (liveLotterieUnsubscribe) {
    liveLotterieUnsubscribe();
    liveLotterieUnsubscribe = null;
  }
}

function getActivePlayersForSoloGame() {
  return persons
    .filter(p => p.present && !p.left && !p.inactive && !p.isDrinksOnly)
    .sort((a, b) => {
      if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
      return a.name.localeCompare(b.name, 'de');
    });
}

function sortPlayersByNameOrder(players, order) {
  const indexMap = new Map((order || []).map((name, index) => [name, index]));
  return players.slice().sort((a, b) => {
    const ai = indexMap.has(a.name) ? indexMap.get(a.name) : 9999;
    const bi = indexMap.has(b.name) ? indexMap.get(b.name) : 9999;
    if (ai !== bi) return ai - bi;
    if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });
}

function syncLotteriePlayerOrder() {
  ensureLotterieState();
  const activeNames = getActivePlayersForSoloGame().map(p => p.name);
  const existing = Array.isArray(lotterieState.playerOrder) ? lotterieState.playerOrder.filter(name => activeNames.includes(name)) : [];
  const missing = activeNames.filter(name => !existing.includes(name));
  lotterieState.playerOrder = [...existing, ...missing];
  return lotterieState.playerOrder;
}

function getLotteriePlayers() {
  const names=lotterieState.active&&lotterieState.startPlayer?rotateNameOrder(getSoloNames('lotterie'),lotterieState.startPlayer):getSoloNames('lotterie');
  const active=getActivePlayersForSoloGame();
  return names.map(name=>active.find(p=>p.name===name)).filter(Boolean);
}

function moveLotterieOrder(index,delta) { moveSoloName('lotterie',index,delta); }

function resetLotterieOrder() {
  lotterieState.playerOrder = getActivePlayersForSoloGame().map(p => p.name);
  renderLotteriePlayerOrderEditor();
  persistState();
}

function renderLotteriePlayerOrderEditor() { renderSoloOrderSettings('lotterie'); }

function rotateNameOrder(order, starterName) {
  const list = Array.isArray(order) ? order.slice() : [];
  const idx = list.indexOf(starterName);
  if (idx < 0) return list;
  return [...list.slice(idx), ...list.slice(0, idx)];
}

function roundTo10Cent(value) {
  return Math.round((parseFloat(value || 0) || 0) * 10) / 10;
}

function getLotteriePlayerCount() {
  return getLotteriePlayers().length;
}

async function startLotterieGame() {
  ensureLotterieState();
  saveLotterieSettings(false);

  const players = getLotteriePlayers();

  if (!players.length) {
    showToast(
      'Keine anwesenden Spieler für Lotterie',
      'error'
    );
    return;
  }

  const colCount =
    lotterieState.columnCount ||
    getLotterieColumnCountInput();

  if (!colCount || colCount < 1) {
    showToast(
      'Bitte Spaltenanzahl eingeben',
      'error'
    );
    return;
  }

  prepareSoloStarter('lotterie', starterName => startLotterieGameFinal(starterName));
}

async function startLotterieGameFinal(starterName) {
  ensureLotterieState();
  saveLotterieSettings(false);

  const players = getLotteriePlayers();

  if (!players.length) {
    showToast('Keine anwesenden Spieler für Lotterie', 'error');
    return;
  }

  const colCount = lotterieState.columnCount || getLotterieColumnCountInput();

  if (!colCount || colCount < 1) {
    showToast('Bitte Spaltenanzahl eingeben', 'error');
    return;
  }

  lotterieState.columnCount = colCount;
  lotterieState.playerOrder = rotateNameOrder(getSoloNames('lotterie'), starterName || players[0].name);
  lotterieState.restoreCustomOrder = !!lotterieState.customOrder;
  lotterieState.customOrder = true;
  lotterieState.startPlayer = starterName || lotterieState.playerOrder[0] || '';
  lotterieState.active = true;
  lotterieState.startedAt = new Date().toISOString();
  dashboardActiveGame = "lotterie";
  lotterieState.finished = false;
  lotterieState.amountsGenerated = true;
  lotterieState.throws = {};
  lotterieState.throwMeta = {};

  players.forEach(person => {
    lotterieState.throws[person.name] =
      Array.from(
        { length: colCount },
        () => null
      );

    lotterieState.throwMeta[person.name] =
      Array.from(
        { length: colCount },
        () => null
      );
  });

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    showToast(
      '❌ Lotterie konnte nicht gestartet werden',
      'error'
    );
    return;
  }

  renderLotterie();

  showToast(
    '🎰 Lotterie gestartet',
    'success'
  );
}

async function resetLotterieGame() {
  if (
    !confirm(
      'Lotterie wirklich neu starten?'
    )
  ) {
    return;
  }

const previousState =
  JSON.parse(
    JSON.stringify(
      lotterieState
    )
  );

  lotterieState =
    createLotterieState();

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    lotterieState =
      previousState;

    showToast(
      '❌ Lotterie konnte nicht zurückgesetzt werden',
      'error'
    );
    return;
  }

  renderLotterie();
  renderLotterieAmountEditor();

  showToast(
    '↻ Lotterie zurückgesetzt',
    'success'
  );
}

async function toggleLotterieOnTop() {
  if(typeof setGameFineOnTop==='function')return setGameFineOnTop('lotterie',!!document.getElementById('lotterie-ontop-check')?.checked);
  ensureLotterieState();

  const check =
    document.getElementById(
      'lotterie-ontop-check'
    );

  const previousValue =
    !!lotterieState.onTop;

  lotterieState.onTop =
    !!check?.checked;

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    lotterieState.onTop =
      previousValue;

    if (check) {
      check.checked =
        previousValue;
    }

    return;
  }

  renderLotterie();
}

async function generateLotterieAmounts() {
  ensureLotterieState();

  if (lotterieState.active) {
    showToast(
      'Beträge können nach Spielstart nicht mehr geändert werden',
      'error'
    );
    return;
  }

  const colCount =
    lotterieState.columnCount ||
    getLotterieColumnCountInput();

  if (!colCount) {
    showToast(
      'Bitte zuerst Spaltenanzahl eingeben',
      'error'
    );
    return;
  }

  lotterieState.columnCount =
    colCount;

  const min =
    roundTo10Cent(
      lotterieSettings.minAmount || 0.10
    );

  const max =
    roundTo10Cent(
      lotterieSettings.maxAmount || min
    );

  const low =
    Math.min(min, max);

  const high =
    Math.max(min, max);

  const amounts = [];

  if (colCount === 1) {
    amounts.push(high);
  } else {
    for (
      let index = 0;
      index < colCount;
      index++
    ) {
      const progress =
        index / (colCount - 1);

      const base =
        low +
        (high - low) * progress;

      const jitter =
        (Math.random() - 0.5) *
        0.20;

      amounts.push(
        roundTo10Cent(
          base + jitter
        )
      );
    }

    amounts[0] = low;
    amounts[colCount - 1] =
      high;
  }

  lotterieState.columns =
    amounts
      .map(value =>
        Math.min(
          high,
          Math.max(
            low,
            roundTo10Cent(value)
          )
        )
      )
      .sort((a, b) => a - b);

  lotterieState.amountsGenerated =
    true;

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    return;
  }

  renderLotterieAmountEditor();
  renderLotterie();

  showToast(
    '🎲 Lotterie-Beträge verteilt',
    'success'
  );
}

async function updateLotterieAmount(
  index,
  value
) {
  ensureLotterieState();

  if (lotterieState.active) {
    return;
  }

  const previousValue =
    lotterieState.columns[index];

  lotterieState.columns[index] =
    roundTo10Cent(
      String(value).replace(',', '.')
    );

  lotterieState.amountsGenerated =
    lotterieState.columns.some(
      amount =>
        Number(amount || 0) > 0
    );

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    lotterieState.columns[index] =
      previousValue;

    return;
  }

  renderLotterie();
}

function openLotterieThrowModal(personName, colIndex) {
  ensureLotterieState();

  lotterieEdit = {
    person: personName,
    colIndex
  };

  const title = document.getElementById('lotterie-throw-title');
  const grid = document.getElementById('lotterie-number-grid');

  if (title) {
    title.textContent = `Lotterie: ${personName} · Spalte ${colIndex + 1}`;
  }

  if (!grid) return;

  grid.innerHTML = '';

  for (let n = 0; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'darts-number-btn';
    btn.textContent = n === 0 ? '0 / Gosse' : String(n);
    btn.onclick = () => confirmLotterieThrow(n);
    grid.appendChild(btn);
  }

  const kranzBtn = document.createElement('button');
  kranzBtn.className = 'darts-number-btn kranz';
  kranzBtn.textContent = 'Kranz / 12';
  kranzBtn.onclick = () => confirmLotterieThrow(12);
  grid.appendChild(kranzBtn);

  document.getElementById('lotterie-throw-modal').classList.remove('hidden');
}

function closeLotterieThrowModal() {
  document.getElementById('lotterie-throw-modal').classList.add('hidden');
  lotterieEdit = {
    person: null,
    colIndex: null
  };
}

async function confirmLotterieThrow(
  value
) {
  ensureLotterieState();

  const personName =
    lotterieEdit.person;

  const colIndex =
    lotterieEdit.colIndex;

  if (
    !personName ||
    colIndex === null ||
    colIndex === undefined
  ) {
    return;
  }

  if (
    !ACTIVE_CLUB ||
    !navigator.onLine
  ) {
    showToast(
      '📴 Lotterie-Würfe sind offline nicht möglich',
      'error'
    );
    return;
  }

  if (
    typeof window.firestoreApi
      ?.changeLiveLotterieThrow !==
      'function'
  ) {
    showToast(
      '❌ Lotterie-Synchronisation nicht verfügbar',
      'error'
    );
    return;
  }

  if (!lotterieState.throws[personName]) {
    lotterieState.throws[personName] = [];
  }

  if (
    !lotterieState.throwMeta[personName]
  ) {
    lotterieState.throwMeta[
      personName
    ] = [];
  }

  const previousMeta =
    lotterieState.throwMeta[
      personName
    ][colIndex] || null;

  const changes = [];

  if (
    previousMeta?.penaltyBooked &&
    previousMeta.penaltyKey &&
    Array.isArray(
      previousMeta.punishedNames
    )
  ) {
    previousMeta.punishedNames.forEach(
      punishedName => {
        changes.push({
          personName:
            punishedName,
          category: 'strafen',
          key:
            previousMeta.penaltyKey,
          delta: -1
        });
      }
    );
  }

  let penaltyType = null;

  if (value === 0) {
    penaltyType = 'gosse';
  } else if (value === 9) {
    penaltyType = '9er';
  } else if (value === 12) {
    penaltyType = 'kranz';
  }

  let nextMeta = null;

  if (penaltyType) {
    const penaltyKey =
      getPenaltyKeyByType(
        penaltyType
      );

    if (!penaltyKey) {
      showToast(
        `Strafe „${penaltyType}“ nicht gefunden`,
        'error'
      );
      return;
    }

    const activePlayers =
      persons.filter(
        person =>
          person.present &&
          !person.left && !person.inactive && !person.isDrinksOnly
      );

    const punishedNames =
      penaltyType === 'gosse'
        ? [personName]
        : activePlayers
            .filter(
              person =>
                person.name !==
                personName
            )
            .map(
              person =>
                person.name
            );

    punishedNames.forEach(
      punishedName => {
        changes.push({
          personName:
            punishedName,
          category: 'strafen',
          key: penaltyKey,
          delta: 1
        });
      }
    );

    nextMeta = {
      penaltyType,
      penaltyKey,
      punishedNames: [
        ...punishedNames
      ],
      penaltyBooked:
        punishedNames.length > 0,
      thrower: personName,
      createdAt:
        new Date().toISOString()
    };
  }

const clubId =
  getClubFirestoreId(
    ACTIVE_CLUB
  );

const previousValue =
  lotterieState.throws[
    personName
  ][colIndex] ?? null;

try {
  await window.firestoreApi
    .changeLiveLotterieThrow(
      clubId,
      personName,
      colIndex,
      value,
      nextMeta
    );

  if (changes.length) {
    const success =
      await changeMultipleSyncedPersonCounters(
        changes
      );

    if (!success) {
      throw new Error(
        'Strafbuchung fehlgeschlagen'
      );
    }
  }
} catch (error) {
  console.error(
    'Lotterie-Wurf konnte nicht vollständig gespeichert werden:',
    error
  );

  try {
    await window.firestoreApi
      .changeLiveLotterieThrow(
        clubId,
        personName,
        colIndex,
        previousValue,
        previousMeta
      );
  } catch (rollbackError) {
    console.error(
      'Lotterie-Rollback fehlgeschlagen:',
      rollbackError
    );
  }

  showToast(
    '❌ Wurf oder Strafe konnte nicht synchronisiert werden',
    'error'
  );

  return;
}

  // Sofort lokal anzeigen; der Firestore-Listener gleicht danach alle Geräte ab.
  lotterieState.throws[personName][colIndex] = value;
  lotterieState.throwMeta[personName][colIndex] = nextMeta;
  renderLotterie();

  if (
    nextMeta &&
    typeof addPenaltyStatsEntry ===
      'function'
  ) {
    addPenaltyStatsEntry(
      nextMeta.penaltyType,
      personName,
      nextMeta.punishedNames
    );

    /*
     * Nur die Statistik kommt noch in
     * state/current. Der Wurf selbst nicht.
     */
    persistState();
  }

  closeLotterieThrowModal();

  let message =
    `🎳 ${value} Pins eingetragen`;

  if (value === 0) {
    message =
      `💀 Gosse für ${personName} eingetragen`;
  } else if (value === 9) {
    message =
      `🎯 9er von ${personName} eingetragen`;
  } else if (value === 12) {
    message =
      `👑 Kranz von ${personName} eingetragen`;
  }

  showToast(
    message,
    'success'
  );
}

function getGosseStrafeKey() {
  const found = STRAFEN.find(s => {
    const label = String(s.label || '').toLowerCase();
    return label.includes('gosse') || label.includes('pudel');
  });

  return found ? found.key : null;
}

function getLotterieColumnLosers(colIndex) {
  ensureLotterieState();

  const players = getLotteriePlayers();

  const values = players
    .map(p => ({
      name: p.name,
      value: lotterieState.throws[p.name]?.[colIndex]
    }))
    .filter(x => x.value !== null && x.value !== undefined && x.value !== '');

  if (!values.length) return [];

  const minValue = Math.min(...values.map(x => Number(x.value)));

  return values
    .filter(x => Number(x.value) === minValue)
    .map(x => x.name);
}

function getLotterieLivePenalty(personName) {
  ensureLotterieState();

  return (lotterieState.columns || []).reduce((sum, amount, colIndex) => {
    const losers = getLotterieColumnLosers(colIndex);
    if (losers.includes(personName)) {
      return sum + (parseFloat(amount || 0) || 0);
    }
    return sum;
  }, 0);
}
        
function getLotterieColumnCountInput() {
  const input = document.getElementById('lotterie-column-count');
  return Math.max(1, parseInt(input?.value || '0', 10) || 0);
}

async function prepareLotterieColumns() {
  ensureLotterieState();

  if (lotterieState.active) {
    return;
  }

  const count =
    Math.max(
      1,
      parseInt(
        document.getElementById(
          'lotterie-column-count'
        )?.value || '0',
        10
      ) || 0
    );

  lotterieState.columnCount =
    count;

  lotterieState.columns =
    Array.from(
      { length: count },
      (_, index) =>
        roundTo10Cent(
          lotterieState.columns[index] || 0
        )
    );

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    return;
  }

  renderLotterieAmountEditor();
  renderLotterie();
}

function initLotterieDefaultsIfNeeded() {
  ensureLotterieState();

  if (lotterieState.active) return;

  const playersCount = getLotteriePlayers().length;

  if (!lotterieState.columnCount && playersCount > 0) {
    lotterieState.columnCount = playersCount;
    lotterieState.columns = Array.from({ length: playersCount }, (_, i) => {
      return roundTo10Cent(lotterieState.columns[i] || 0);
    });
  }
}

function renderLotterieAmountEditor() {
  ensureLotterieState();

  const input = document.getElementById('lotterie-column-count');
  const editor = document.getElementById('lotterie-amount-editor');

  if (!editor) return;

  if (input && document.activeElement !== input) {
    input.value = lotterieState.columnCount || '';
  }

  if (lotterieState.active) {
    editor.innerHTML = '';
    return;
  }

  if (!lotterieState.columnCount) {
    editor.innerHTML = `
      <div style="color:var(--muted);font-size:0.85rem;">
        Bitte Spaltenanzahl eingeben.
      </div>
    `;
    return;
  }

  editor.innerHTML = lotterieState.columns.map((amount, index) => `
    <div class="team-drink-row">
      <span class="team-drink-name">Betrag ${index + 1}</span>
      <input
        type="number"
        min="0"
        step="0.10"
        class="price-input"
        value="${amount ? amount.toFixed(2) : ''}"
        onchange="updateLotteriePreStartAmount(${index}, this.value)"
      >
    </div>
  `).join('');
}

async function updateLotteriePreStartAmount(
  index,
  value
) {
  ensureLotterieState();

  if (lotterieState.active) {
    return;
  }

  const previousValue =
    lotterieState.columns[index];

  lotterieState.columns[index] =
    roundTo10Cent(
      String(value).replace(',', '.')
    );

  lotterieState.amountsGenerated =
    lotterieState.columns.some(
      amount =>
        Number(amount || 0) > 0
    );

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    lotterieState.columns[index] =
      previousValue;
  }
}
    
function renderLotterie() {
  ensureLotterieState();
    initLotterieDefaultsIfNeeded();

  const board = document.getElementById('lotterie-board');
    const finishBtn = document.querySelector('#tab-lotterie .save-prices-btn');
    const resetBtn = document.querySelector('#tab-lotterie .lotterie-reset-live-btn');
  if (!board) return;

const setupCard = document.getElementById('lotterie-setup-card');
  const onTopCheck = document.getElementById('lotterie-ontop-check');
  const randomBtn = document.getElementById('lotterie-random-btn');

if (setupCard) {
  setupCard.classList.toggle('hidden', !!lotterieState.active);
}
    
if (finishBtn) {
  finishBtn.classList.toggle('hidden', !lotterieState.active);
}

if (resetBtn) {
  resetBtn.classList.toggle('hidden', !lotterieState.active);
}
    
    renderLotterieAmountEditor();
    renderLotteriePlayerOrderEditor();

  if (onTopCheck) {
    onTopCheck.checked = !!lotterieState.onTop;
  }

  if (randomBtn) {
    randomBtn.classList.toggle('hidden', !!lotterieState.active);
  }

  const players = getLotteriePlayers();

  if (!lotterieState.active) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Lotterie noch nicht gestartet.
      </div>
    `;

    renderLotterieHistory();
    return;
  }

  if (!players.length) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Keine anwesenden Spieler.
      </div>
    `;

    renderLotterieHistory();
    return;
  }

  const colCount = lotterieState.columns.length;

  if (!colCount) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Keine Beträge vorhanden. Bitte Lotterie neu starten und Beträge festlegen.
      </div>
    `;

    renderLotterieHistory();
    return;
  }

  players.forEach(p => {
    if (!lotterieState.throws[p.name]) {
      lotterieState.throws[p.name] = [];
    }

    lotterieState.throws[p.name] = Array.from({ length: colCount }, (_, i) => {
      return lotterieState.throws[p.name][i] ?? null;
    });
  });

  const headerCols = lotterieState.columns.map((amount, colIndex) => {
    const isComplete = players.every(p => {
      const value = lotterieState.throws[p.name]?.[colIndex];
      return value !== null && value !== undefined && value !== '';
    });

    return `
    <th class="${isComplete ? 'lotterie-complete-col' : ''}">
      <div style="font-size:1.05rem;font-weight:900;color:var(--accent2);">
        ${euros(amount)}
      </div>
    </th>
  `;
  }).join('');

  const bodyRows = players.map(p => {
    const cells = lotterieState.columns.map((amount, colIndex) => {
      const value = lotterieState.throws[p.name]?.[colIndex];
      const losers = getLotterieColumnLosers(colIndex);
      const isLoser = losers.includes(p.name);

      const label =
        value === null || value === undefined
          ? '—'
          : value === 12
            ? 'K'
            : value;

      const isComplete = players.every(lp => {
        const check = lotterieState.throws[lp.name]?.[colIndex];
        return check !== null && check !== undefined && check !== '';
      });

      return `
        <td class="${isComplete ? 'lotterie-complete-cell' : ''}">
          <button
            class="game-cell-btn ${value === null || value === undefined ? 'empty' : ''} ${isLoser ? 'loser' : ''}"
            onclick="openLotterieThrowModal('${escapeForJs(p.name)}', ${colIndex})"
          >
            <span class="game-throw-big">${label}</span>
          </button>
        </td>
      `;
    }).join('');

    const live = getLotterieLivePenalty(p.name);

    return `
      <tr>
        <td class="sticky-name">
          <strong>${p.name}</strong>
          <div class="game-name-amount">
            ${euros(live)}
          </div>
        </td>
        ${cells}
      </tr>
    `;
  }).join('');

  board.innerHTML = `
    <div class="game-table-scroll">
      <table class="game-table">
        <thead>
          <tr>
            <th class="sticky-name">Spieler</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;

  renderLotterieHistory();
}

async function finishLotterieGame() {
  ensureLotterieState();

  if (!lotterieState.active) {
    showToast(
      'Lotterie wurde noch nicht gestartet',
      'error'
    );
    return;
  }

  const players =
    getLotteriePlayers();

  if (!players.length) {
    showToast(
      'Keine Spieler vorhanden',
      'error'
    );
    return;
  }

  const assignedTo = [];
  const createdAt =
    new Date().toISOString();

  players.forEach(person => {
    const amount =
      getLotterieLivePenalty(
        person.name
      );

    if (amount <= 0) {
      return;
    }

    const chargeId =
      'lotterie_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .slice(2);

    if (
      !Array.isArray(
        person.freeStrafen
      )
    ) {
      person.freeStrafen = [];
    }

    person.freeStrafen.push({
      id: chargeId,
      reason: 'Lotterie',
      amount,
      gameFineFrozen:true,onTop: !!lotterieState.onTop,
      createdAt
    });

    assignedTo.push({
      id: chargeId,
      name: person.name,
      amount,
      gameFineFrozen:true,onTop: !!lotterieState.onTop
    });
  });

  if (!assignedTo.length) {
    showToast(
      'Keine Lotterie-Strafen zu buchen',
      'error'
    );
    return;
  }

  const historyId =
    'lotterie_history_' +
    Date.now() +
    '_' +
    Math.random()
      .toString(36)
      .slice(2);

  const entry = {
    id: historyId,
    type: 'lotterie',
    createdAt,
    gameFineFrozen:true,onTop: !!lotterieState.onTop,

    columns:
      JSON.parse(
        JSON.stringify(
          lotterieState.columns
        )
      ),

    throws:
      JSON.parse(
        JSON.stringify(
          lotterieState.throws
        )
      ),

    assignedTo
  };

  if (
    !Array.isArray(
      strafenHistory
    )
  ) {
    strafenHistory = [];
  }

  Object.assign(entry,{gameFineFrozen:lotterieState.gameFineFrozen===true,onTop:lotterieState.onTop===true,gameFineOnTop:lotterieState.onTop===true});
  strafenHistory.unshift(
    entry
  );

  lotterieState.history.unshift(
    entry
  );

  lotterieState.finished = true;
  lotterieState.active = false;
  lotterieState.customOrder = !!lotterieState.restoreCustomOrder;

  const saved =
    await saveLiveLotterieState();

  if (!saved) {
    showToast(
      '❌ Lotterie-Abschluss konnte nicht synchronisiert werden',
      'error'
    );
    return;
  }

  /*
   * Personenbeträge und allgemeine
   * Strafen-Historie speichern.
   */
  renderAll();
  persistState();

  showToast(
    '✅ Lotterie abgeschlossen und Strafen gebucht',
    'success'
  );
}

function renderLotterieHistory() {
  const el = document.getElementById('lotterie-history-list');
  if (!el) return;

  const entries = Array.isArray(lotterieState.history) ? lotterieState.history : [];

  if (!entries.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">Noch kein Lotterie-Verlauf</div>';
    return;
  }

  el.innerHTML = entries.map(entry => {
    const assigned = (entry.assignedTo || [])
      .map(x => `${x.name}: ${euros(x.amount)}${x.onTop ? ' · On Top' : ''}`)
      .join('<br>');

    return `
      <div class="spiel-card">
        <div class="spiel-info">
          <div class="spiel-verlierer round">🎰 Lotterie abgeschlossen</div>
          <div class="spiel-detail">${entry.createdAt ? formatDateTime(entry.createdAt) : ''}</div>
          <div class="spiel-detail"><strong>Gebucht:</strong><br>${assigned || '—'}</div>
        </div>
        <button class="del-spiel-btn" onclick="deleteStrafenHistoryEntry('${escapeForJs(entry.id)}')">✕</button>
      </div>
    `;
  }).join('');
}    
    
function renderLotterieSettings() {
  const minInput = document.getElementById('lotterie-min-amount');
  const maxInput = document.getElementById('lotterie-max-amount');

  if (minInput && document.activeElement !== minInput) {
    minInput.value = (parseFloat(lotterieSettings.minAmount || 0.10) || 0.10).toFixed(2);
  }

  if (maxInput && document.activeElement !== maxInput) {
    maxInput.value = (parseFloat(lotterieSettings.maxAmount || 2.00) || 2.00).toFixed(2);
  }
}

function saveLotterieSettings(showToastMessage = true) {
  const minInput = document.getElementById('lotterie-min-amount');
  const maxInput = document.getElementById('lotterie-max-amount');

  lotterieSettings.minAmount = roundTo10Cent(String(minInput?.value || '0.10').replace(',', '.'));
  lotterieSettings.maxAmount = roundTo10Cent(String(maxInput?.value || '2.00').replace(',', '.'));

  if (lotterieSettings.minAmount < 0) lotterieSettings.minAmount = 0;
  if (lotterieSettings.maxAmount < 0) lotterieSettings.maxAmount = 0;

  renderLotterieSettings();
  persistState();

  if (showToastMessage) {
    showToast('✅ Lotterie-Einstellungen gespeichert', 'success');
  }
}
