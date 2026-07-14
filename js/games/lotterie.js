// ──-───────────────────────────────────────────────────────────────────────
// ── LOTTERIE ──   
function getActivePlayersForSoloGame() {
  return persons
    .filter(p => p.present && !p.left)
    .sort((a, b) => {
      if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
      return a.name.localeCompare(b.name, 'de');
    });
}

function roundTo10Cent(value) {
  return Math.round((parseFloat(value || 0) || 0) * 10) / 10;
}

function getLotteriePlayerCount() {
  return getActivePlayersForSoloGame().length;
}

function startLotterieGame() {
  ensureLotterieState();
  saveLotterieSettings(false);

  const players =
    getActivePlayersForSoloGame();

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

  lotterieState.columnCount = colCount;

  lotterieState.columns = Array.from(
    { length: colCount },
    (_, index) => {
      return roundTo10Cent(
        lotterieState.columns[index] || 0
      );
    }
  );

  const missingAmounts =
    lotterieState.columns.some(
      value => !value || value <= 0
    );

  if (missingAmounts) {
    showToast(
      'Bitte alle Beträge eingeben oder zufällig erzeugen',
      'error'
    );
    return;
  }

  lotterieState.active = true;
  lotterieState.finished = false;
  lotterieState.throws = {};
  lotterieState.throwMeta = {};
  lotterieState.amountsGenerated = true;

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

  renderLotterie();
  persistState();

  showToast(
    '🎰 Lotterie gestartet',
    'success'
  );
}

function resetLotterieGame() {
  if (!confirm('Lotterie wirklich neu starten?')) return;

  lotterieState = createLotterieState();

  renderLotterie();
  renderLotterieAmountEditor();
  persistState();

  showToast('↻ Lotterie zurückgesetzt', 'success');
}

function toggleLotterieOnTop() {
  const check = document.getElementById('lotterie-ontop-check');
  lotterieState.onTop = !!check?.checked;

  renderLotterie();
  persistState();
}

function generateLotterieAmounts() {
  ensureLotterieState();

  if (lotterieState.active) {
    showToast('Beträge können nach Spielstart nicht mehr geändert werden', 'error');
    return;
  }

  const colCount = lotterieState.columnCount || getLotterieColumnCountInput();

  if (!colCount) {
    showToast('Bitte zuerst Spaltenanzahl eingeben', 'error');
    return;
  }

  lotterieState.columnCount = colCount;

  const min = roundTo10Cent(lotterieSettings.minAmount || 0.10);
  const max = roundTo10Cent(lotterieSettings.maxAmount || min);

  const low = Math.min(min, max);
  const high = Math.max(min, max);

  const amounts = [];

  if (colCount === 1) {
    amounts.push(high);
  } else {
    for (let i = 0; i < colCount; i++) {
      const t = i / (colCount - 1);
      const base = low + (high - low) * t;
      const jitter = (Math.random() - 0.5) * 0.20;
      amounts.push(roundTo10Cent(base + jitter));
    }

    amounts[0] = low;
    amounts[colCount - 1] = high;
  }

  lotterieState.columns = amounts
    .map(v => Math.min(high, Math.max(low, roundTo10Cent(v))))
    .sort((a, b) => a - b);

  lotterieState.amountsGenerated = true;

  renderLotterieAmountEditor();
  renderLotterie();
  persistState();

  showToast('🎲 Lotterie-Beträge verteilt', 'success');
}

function updateLotterieAmount(index, value) {
  ensureLotterieState();

  lotterieState.columns[index] = roundTo10Cent(String(value).replace(',', '.'));
  lotterieState.amountsGenerated = lotterieState.columns.some(v => (parseFloat(v || 0) || 0) > 0);

  renderLotterie();
  persistState();
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

async function confirmLotterieThrow(value) {
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

  if (!lotterieState.throws[personName]) {
    lotterieState.throws[personName] = [];
  }

  if (!lotterieState.throwMeta[personName]) {
    lotterieState.throwMeta[personName] = [];
  }

  const previousMeta =
    lotterieState.throwMeta[personName][colIndex]
    || null;

  const changes = [];

  if (
    previousMeta?.penaltyBooked &&
    previousMeta.penaltyKey &&
    Array.isArray(
      previousMeta.punishedNames
    )
  ) {
    previousMeta.punishedNames.forEach(
      name => {
        changes.push({
          personName: name,
          category: 'strafen',
          key: previousMeta.penaltyKey,
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
      getPenaltyKeyByType(penaltyType);

    if (!penaltyKey) {
      showToast(
        `Strafe "${penaltyType}" nicht gefunden`,
        'error'
      );
      return;
    }

    const activePlayers = persons.filter(
      person =>
        person.present &&
        !person.left
    );

    const punishedNames =
      penaltyType === 'gosse'
        ? [personName]
        : activePlayers
            .filter(
              person =>
                person.name !== personName
            )
            .map(person => person.name);

    punishedNames.forEach(name => {
      changes.push({
        personName: name,
        category: 'strafen',
        key: penaltyKey,
        delta: 1
      });
    });

    nextMeta = {
      penaltyType,
      penaltyKey,
      punishedNames:
        [...punishedNames],

      penaltyBooked:
        punishedNames.length > 0,

      thrower: personName,
      createdAt:
        new Date().toISOString()
    };
  }

  if (changes.length) {
    const success =
      await changeMultipleSyncedPersonCounters(
        changes
      );

    if (!success) {
      return;
    }
  }

  lotterieState.throws[personName][colIndex] =
    value;

  lotterieState.throwMeta[personName][colIndex] =
    nextMeta;

  if (
    nextMeta &&
    typeof addPenaltyStatsEntry === 'function'
  ) {
    addPenaltyStatsEntry(
      nextMeta.penaltyType,
      personName,
      nextMeta.punishedNames
    );
  }

  closeLotterieThrowModal();

  renderAll();
  persistState();

  let message =
    `🎳 ${value} Pins eingetragen`;

  if (value === 0) {
    message =
      `💀 Gosse für ${personName} eingetragen`;
  }

  if (value === 9) {
    message =
      `🎯 9er von ${personName} eingetragen`;
  }

  if (value === 12) {
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

  const players = getActivePlayersForSoloGame();

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

function prepareLotterieColumns() {
  ensureLotterieState();

  if (lotterieState.active) return;

  const count = Math.max(
    1,
    parseInt(document.getElementById('lotterie-column-count')?.value || '0', 10) || 0
  );

  lotterieState.columnCount = count;

  lotterieState.columns = Array.from({ length: count }, (_, i) => {
    return roundTo10Cent(lotterieState.columns[i] || 0);
  });

  renderLotterieAmountEditor();
  persistState();
}

function initLotterieDefaultsIfNeeded() {
  ensureLotterieState();

  if (lotterieState.active) return;

  const playersCount = getActivePlayersForSoloGame().length;

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

function updateLotteriePreStartAmount(index, value) {
  ensureLotterieState();

  if (lotterieState.active) return;

  lotterieState.columns[index] = roundTo10Cent(String(value).replace(',', '.'));
  lotterieState.amountsGenerated = lotterieState.columns.some(v => v > 0);

  persistState();
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

  if (onTopCheck) {
    onTopCheck.checked = !!lotterieState.onTop;
  }

  if (randomBtn) {
    randomBtn.classList.toggle('hidden', !!lotterieState.active);
  }

  const players = getActivePlayersForSoloGame();

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

  const headerCols = lotterieState.columns.map(amount => `
    <th>
      <div style="font-size:1.05rem;font-weight:900;color:var(--accent2);">
        ${euros(amount)}
      </div>
    </th>
  `).join('');

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

      return `
        <td>
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

function finishLotterieGame() {
  ensureLotterieState();

  if (!lotterieState.active) {
    showToast('Lotterie wurde noch nicht gestartet', 'error');
    return;
  }

  const players = getActivePlayersForSoloGame();

  if (!players.length) {
    showToast('Keine Spieler vorhanden', 'error');
    return;
  }

  const assignedTo = [];

  players.forEach(p => {
    const amount = getLotterieLivePenalty(p.name);

    if (amount <= 0) return;

    const id = 'lotterie_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];

    p.freeStrafen.push({
      id,
      reason: 'Lotterie',
      amount,
      onTop: !!lotterieState.onTop,
      createdAt: new Date().toISOString()
    });

    assignedTo.push({
      id,
      name: p.name,
      amount,
      onTop: !!lotterieState.onTop
    });
  });

  if (!assignedTo.length) {
    showToast('Keine Lotterie-Strafen zu buchen', 'error');
    return;
  }

  const historyId = 'lotterie_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  const entry = {
    id: historyId,
    type: 'lotterie',
    createdAt: new Date().toISOString(),
    onTop: !!lotterieState.onTop,
    columns: JSON.parse(JSON.stringify(lotterieState.columns)),
    throws: JSON.parse(JSON.stringify(lotterieState.throws)),
    assignedTo
  };

  if (!Array.isArray(strafenHistory)) strafenHistory = [];
  strafenHistory.unshift(entry);

  lotterieState.history.unshift(entry);
  lotterieState.finished = true;
  lotterieState.active = false;

  renderAll();
  persistState();

  showToast('✅ Lotterie abgeschlossen und Strafen gebucht', 'success');
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
