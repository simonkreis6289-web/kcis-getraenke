// ── TIBERIUS ──  
function renderTiberiusSettings() {
  const minInput = document.getElementById('tiberius-min-pins');
  const maxInput = document.getElementById('tiberius-max-pins');

  if (minInput && document.activeElement !== minInput) {
    minInput.value = parseInt(tiberiusSettings.minPins || 10, 10) || 10;
  }

  if (maxInput && document.activeElement !== maxInput) {
    maxInput.value = parseInt(tiberiusSettings.maxPins || 80, 10) || 80;
  }
}

function saveTiberiusSettings(showToastMessage = true) {
  const minInput = document.getElementById('tiberius-min-pins');
  const maxInput = document.getElementById('tiberius-max-pins');

  tiberiusSettings.minPins = parseInt(minInput?.value || '10', 10) || 10;
  tiberiusSettings.maxPins = parseInt(maxInput?.value || '80', 10) || 80;

  if (tiberiusSettings.minPins < 1) tiberiusSettings.minPins = 1;
  if (tiberiusSettings.maxPins < 1) tiberiusSettings.maxPins = 1;

  renderTiberiusSettings();
  persistState();

  if (showToastMessage) {
    showToast('✅ Tiberius-Einstellungen gespeichert', 'success');
  }
}
    
function initTiberiusDefaultsIfNeeded() {
  ensureTiberiusState();

  if (tiberiusState.active) return;

  const playersCount = getActivePlayersForSoloGame().length;

  if (!tiberiusState.columnCount && playersCount > 0) {
    tiberiusState.columnCount = playersCount;
    tiberiusState.targets = Array.from({ length: playersCount }, (_, i) => {
      return parseInt(tiberiusState.targets?.[i] || 0, 10) || 0;
    });
  }
}
                                                    
function getTiberiusColumnCountInput() {
  const input = document.getElementById('tiberius-column-count');
  return Math.max(1, parseInt(input?.value || '0', 10) || 0);
}

function prepareTiberiusColumns() {
  ensureTiberiusState();

  if (tiberiusState.active) return;

  const count = getTiberiusColumnCountInput();

  tiberiusState.columnCount = count;
  tiberiusState.targets = Array.from({ length: count }, (_, i) => {
    return parseInt(tiberiusState.targets[i] || 0, 10) || 0;
  });

  tiberiusState.targetsGenerated = tiberiusState.targets.some(v => v > 0);

  renderTiberiusTargetEditor();
  persistState();
}

function renderTiberiusTargetEditor() {
  ensureTiberiusState();

  const countInput = document.getElementById('tiberius-column-count');
  const editor = document.getElementById('tiberius-target-editor');

  if (!editor) return;

  if (countInput && document.activeElement !== countInput) {
    countInput.value = tiberiusState.columnCount || '';
  }

  if (tiberiusState.active) {
    editor.innerHTML = '';
    return;
  }

  if (!tiberiusState.columnCount) {
    editor.innerHTML = `
      <div style="color:var(--muted);font-size:0.85rem;">
        Bitte Spaltenanzahl eingeben.
      </div>
    `;
    return;
  }

  editor.innerHTML = tiberiusState.targets.map((target, index) => `
    <div class="team-drink-row">
      <span class="team-drink-name">Ziel ${index + 1}</span>
      <input
        type="number"
        min="1"
        step="1"
        class="price-input"
        value="${target || ''}"
        onchange="updateTiberiusTarget(${index}, this.value)"
      >
    </div>
  `).join('');
}

function updateTiberiusPreStartTarget(index, value) {
  ensureTiberiusState();

  if (tiberiusState.active) return;

  tiberiusState.targets[index] = parseInt(value || '0', 10) || 0;
  tiberiusState.targetsGenerated = tiberiusState.targets.some(v => v > 0);

  persistState();
}
    
function startTiberiusGame() {
  ensureTiberiusState();
  saveTiberiusSettings(false);

  const players = getActivePlayersForSoloGame();
  if (!players.length) {
    showToast('Keine anwesenden Spieler für Tiberius', 'error');
    return;
  }

  const colCount = tiberiusState.columnCount || getTiberiusColumnCountInput();

  if (!colCount || colCount < 1) {
    showToast('Bitte Spaltenanzahl eingeben', 'error');
    return;
  }

  tiberiusState.columnCount = colCount;

  tiberiusState.targets = Array.from({ length: colCount }, (_, i) => {
    return parseInt(tiberiusState.targets[i] || 0, 10) || 0;
  });

  const missingTargets = tiberiusState.targets.some(v => !v || v <= 0);

  if (missingTargets) {
    showToast('Bitte alle Zielwerte eingeben oder zufällig erzeugen', 'error');
    return;
  }

  tiberiusState.active = true;
  tiberiusState.finished = false;
  tiberiusState.score = 0;
  tiberiusState.throws = [];
    tiberiusState.undoStack = [];
  tiberiusState.penalties = {};
  tiberiusState.pendingHit = null;
  tiberiusState.targetsGenerated = true;

  renderTiberius();
  persistState();

  showToast('🏛️ Tiberius gestartet', 'success');
}

function getTiberiusCurrentAmount() {
  ensureTiberiusState();

  return getActivePlayersForSoloGame()
    .reduce((sum, p) => sum + getTiberiusPenaltyForPerson(p.name), 0);
}
    
function resetTiberiusGame() {
  if (!confirm('Tiberius wirklich neu starten?')) return;

  tiberiusState = createTiberiusState();

  renderTiberius();
  renderTiberiusTargetEditor();
  persistState();

  showToast('↻ Tiberius zurückgesetzt', 'success');
}

function toggleTiberiusOnTop() {
  const check = document.getElementById('tiberius-ontop-check');
  tiberiusState.onTop = !!check?.checked;

  renderTiberius();
  persistState();
}

function generateTiberiusTargets() {
  ensureTiberiusState();

  if (tiberiusState.active) {
    showToast('Zielzahlen können nach Spielstart nicht mehr geändert werden', 'error');
    return;
  }

  let colCount = tiberiusState.columnCount || getTiberiusColumnCountInput();

  if (!colCount) {
    showToast('Bitte zuerst Spaltenanzahl eingeben', 'error');
    return;
  }

  tiberiusState.columnCount = colCount;

  const min = parseInt(tiberiusSettings.minPins || 10, 10) || 10;
  const max = parseInt(tiberiusSettings.maxPins || min, 10) || min;

  const low = Math.min(min, max);
  const high = Math.max(min, max);

  const targets = [];

  if (colCount === 1) {
    targets.push(high);
  } else {
    for (let i = 0; i < colCount; i++) {
      const t = i / (colCount - 1);
      const base = low + (high - low) * t;
      const jitter = Math.round((Math.random() - 0.5) * 6);
      targets.push(Math.round(base + jitter));
    }

    targets[0] = low;
    targets[colCount - 1] = high;
  }

  tiberiusState.targets = targets
    .map(v => Math.min(high, Math.max(low, parseInt(v || 0, 10) || 0)))
    .sort((a, b) => a - b);

  tiberiusState.targetsGenerated = true;

  renderTiberiusTargetEditor();
  renderTiberius();
  persistState();

  showToast('🎲 Tiberius-Zielzahlen verteilt', 'success');
}

function updateTiberiusTarget(index, value) {
  ensureTiberiusState();

  tiberiusState.targets[index] = parseInt(value || '0', 10) || 0;
  tiberiusState.targetsGenerated = tiberiusState.targets.some(v => (parseInt(v || 0, 10) || 0) > 0);

  renderTiberius();
  persistState();
}

function openTiberiusThrowModal() {
  ensureTiberiusState();

  if (!tiberiusState.active) {
    showToast('Bitte zuerst Tiberius starten', 'error');
    return;
  }

  const grid = document.getElementById('tiberius-number-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let n = 0; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'darts-number-btn';
    btn.textContent = n === 0 ? '0 / Gosse' : String(n);
    btn.onclick = () => handleTiberiusThrow(n);
    grid.appendChild(btn);
  }

  const kranzBtn = document.createElement('button');
  kranzBtn.className = 'darts-number-btn kranz';
  kranzBtn.textContent = 'Kranz / 12';
  kranzBtn.onclick = () => handleTiberiusThrow(12);
  grid.appendChild(kranzBtn);

  document.getElementById('tiberius-throw-modal').classList.remove('hidden');
}

function closeTiberiusThrowModal() {
  document.getElementById('tiberius-throw-modal').classList.add('hidden');
}
    
    function openTiberiusThrowerModal() {
  const pending = tiberiusPendingThrower;
  if (!pending) return;

  const title = document.getElementById('tiberius-thrower-title');
  const sub = document.getElementById('tiberius-thrower-sub');
  const select = document.getElementById('tiberius-thrower-select');

  if (title) {
    if (pending.value === 0) title.textContent = 'Gosse geworfen';
    else if (pending.value === 9) title.textContent = '9er geworfen';
    else if (pending.value === 12) title.textContent = 'Kranz geworfen';
    else title.textContent = 'Wer hat geworfen?';
  }

  if (sub) {
    if (pending.value === 0) sub.textContent = 'Wer bekommt die Gosse-Strafe?';
    else sub.textContent = 'Wer ist straffrei? Alle anderen bekommen 9er/Kranz.';
  }

  if (select) {
    select.innerHTML = '<option value="">Bitte Person wählen</option>';

    getActivePlayersForSoloGame().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  }

  document.getElementById('tiberius-thrower-modal').classList.remove('hidden');
}

function closeTiberiusThrowerModal() {
  document.getElementById('tiberius-thrower-modal').classList.add('hidden');
}

function confirmTiberiusThrower() {
  const select = document.getElementById('tiberius-thrower-select');
  const personName = select?.value || '';

  if (!personName) {
    showToast('Bitte Spieler auswählen', 'error');
    return;
  }

  if (!tiberiusPendingThrower) return;

  const value = tiberiusPendingThrower.value;

  if (value === 0) {
    const p = persons.find(x => x.name === personName);
    const gosseKey = getGosseStrafeKey();

    if (p && gosseKey) {
      if (!p.strafen) p.strafen = {};
      p.strafen[gosseKey] = (p.strafen[gosseKey] || 0) + 1;
    }
  }

  if (value === 9 || value === 12) {
    const kranzKey = getKranzStrafeKey();

    if (kranzKey) {
      persons.forEach(p => {
        if (!p.present || p.left) return;
        if (p.name === personName) return;

        if (!p.strafen) p.strafen = {};
        p.strafen[kranzKey] = (p.strafen[kranzKey] || 0) + 1;
      });
    }
  }

  closeTiberiusThrowerModal();
  continueTiberiusAfterThrower(personName);
}

function continueTiberiusAfterThrower(personName = '') {
  ensureTiberiusState();

  const pendingThrow = tiberiusPendingThrower;
  if (!pendingThrow) return;

  const hit = getTiberiusHitForScore(pendingThrow.oldScore, pendingThrow.newScore);

  tiberiusPendingThrower = null;

  if (hit) {
    tiberiusState.pendingHit = {
      target: hit.target,
      colIndex: hit.colIndex,
      oldScore: pendingThrow.oldScore,
      newScore: pendingThrow.newScore,
      value: pendingThrow.value,
      thrower: personName || '',
      mode: pendingThrow.newScore === hit.target ? 'exact' : 'over',
      createdAt: new Date().toISOString()
    };

    openTiberiusHitModal();
  } else {
    renderAll();
    persistState();

    showToast(
      pendingThrow.value === 12
        ? '👑 Kranz addiert (+12)'
        : `🎳 +${pendingThrow.value} Pins`,
      'success'
    );
  }
}

function handleTiberiusThrow(value) {
  ensureTiberiusState();
    
    tiberiusState.undoStack.push({
      score: tiberiusState.score,
      throws: JSON.parse(JSON.stringify(tiberiusState.throws || [])),
      penalties: JSON.parse(JSON.stringify(tiberiusState.penalties || {})),
      pendingHit: tiberiusState.pendingHit
        ? JSON.parse(JSON.stringify(tiberiusState.pendingHit))
        : null,
      personsStrafen: persons.map(p => ({
        name: p.name,
        strafen: JSON.parse(JSON.stringify(p.strafen || {}))
      })),
      penaltyStatsLog: JSON.parse(JSON.stringify(penaltyStatsLog || []))
    });

  const oldScore = parseInt(tiberiusState.score || 0, 10) || 0;
  const newScore = oldScore + value;

  tiberiusState.score = newScore;

  const throwEntry = {
    value,
    oldScore,
    newScore,
    createdAt: new Date().toISOString()
  };

  tiberiusState.throws.push(throwEntry);

  closeTiberiusThrowModal();

  tiberiusPendingThrower = {
    ...throwEntry,
    needsThrower: value === 0 || value === 9 || value === 12
  };

  if (tiberiusPendingThrower.needsThrower) {
    openTiberiusThrowerModal();
    return;
  }

  continueTiberiusAfterThrower();
}

function undoLastTiberiusThrow() {
  ensureTiberiusState();

  const last = tiberiusState.undoStack?.pop();

  if (!last) {
    showToast('Kein Tiberius-Wurf zum Rückgängig machen', 'error');
    return;
  }

  tiberiusState.score = last.score || 0;
  tiberiusState.throws = Array.isArray(last.throws) ? last.throws : [];
  tiberiusState.penalties = last.penalties || {};
  tiberiusState.pendingHit = last.pendingHit || null;

  if (Array.isArray(last.personsStrafen)) {
    last.personsStrafen.forEach(snapshot => {
      const p = persons.find(x => x.name === snapshot.name);
      if (p) {
        p.strafen = snapshot.strafen || {};
      }
    });
  }

  penaltyStatsLog = Array.isArray(last.penaltyStatsLog)
    ? last.penaltyStatsLog
    : [];

  tiberiusPendingThrower = null;

  closeTiberiusThrowModal();
  closeTiberiusThrowerModal();
  closeTiberiusHitModal();

  renderAll();
  persistState();

  showToast('↩️ Letzter Tiberius-Wurf rückgängig', 'success');
}

function getTiberiusHitForScore(oldScore, newScore) {
  ensureTiberiusState();

  const candidates = (tiberiusState.targets || [])
    .map((target, colIndex) => ({
      target: parseInt(target || 0, 10) || 0,
      colIndex
    }))
    .filter(x => x.target > 0)
    .filter(x => !tiberiusState.penalties[x.colIndex])
    .filter(x => oldScore < x.target && newScore >= x.target)
    .sort((a, b) => a.target - b.target);

  return candidates[0] || null;
}

function openTiberiusHitModal() {
  ensureTiberiusState();

  const pending = tiberiusState.pendingHit;
  if (!pending) return;

  const title = document.getElementById('tiberius-hit-title');
  const sub = document.getElementById('tiberius-hit-sub');
  const select = document.getElementById('tiberius-hit-person-select');

  if (title) {
    title.textContent = pending.mode === 'exact'
      ? `Ziel ${pending.target} genau erreicht`
      : `Ziel ${pending.target} überschritten`;
  }

  if (sub) {
    sub.textContent = pending.mode === 'exact'
      ? 'Wer hat den letzten Wurf gemacht? Alle anderen zahlen.'
      : 'Wer hat den letzten Wurf gemacht? Diese Person zahlt.';
  }

  if (select) {
    select.innerHTML = '<option value="">Bitte Person wählen</option>';

    getActivePlayersForSoloGame().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  }

  document.getElementById('tiberius-hit-modal').classList.remove('hidden');
}

function closeTiberiusHitModal() {
  document.getElementById('tiberius-hit-modal').classList.add('hidden');
}

function confirmTiberiusHitPenalty() {
  ensureTiberiusState();

  const pending = tiberiusState.pendingHit;
  if (!pending) return;

  const select = document.getElementById('tiberius-hit-person-select');
  const throwerName = select?.value || '';

  if (!throwerName) {
    showToast('Bitte Spieler auswählen', 'error');
    return;
  }

  const players = getActivePlayersForSoloGame();
  const amount = (parseInt(pending.target || 0, 10) || 0) * 0.01;

  let payers = [];

  if (pending.mode === 'exact') {
    payers = players
      .filter(p => p.name !== throwerName)
      .map(p => p.name);
  } else {
    payers = [throwerName];
  }

  tiberiusState.penalties[pending.colIndex] = {
    target: pending.target,
    colIndex: pending.colIndex,
    mode: pending.mode,
    thrower: throwerName,
    payers,
    amount,
    createdAt: new Date().toISOString()
  };

  tiberiusState.pendingHit = null;

  closeTiberiusHitModal();
  renderAll();
  persistState();

  showToast(
    pending.mode === 'exact'
      ? `🏛️ Genau getroffen: alle außer ${throwerName} zahlen`
      : `🏛️ Drüber: ${throwerName} zahlt`,
    'success'
  );
}

function getTiberiusPenaltyForPerson(personName) {
  ensureTiberiusState();

  return Object.values(tiberiusState.penalties || {}).reduce((sum, item) => {
    if ((item.payers || []).includes(personName)) {
      return sum + (parseFloat(item.amount || 0) || 0);
    }

    return sum;
  }, 0);
}

function renderTiberius() {
  ensureTiberiusState();
    initTiberiusDefaultsIfNeeded();

  const board = document.getElementById('tiberius-board');
  if (!board) return;

  const startCard = document.getElementById('tiberius-start-card');
  const livePanel = document.getElementById('tiberius-live-panel');
  const onTopCheck = document.getElementById('tiberius-ontop-check');
  const randomBtn = document.getElementById('tiberius-random-btn');
  const scoreDisplay = document.getElementById('tiberius-score-display');
    const nextTargetDisplay = document.getElementById('tiberius-next-target-display');
      const amountDisplay = document.getElementById('tiberius-current-amount');
    const finishBtn = document.querySelector('#tab-tiberius .save-prices-btn');
    const resetBtn = document.querySelector('#tab-tiberius .tiberius-reset-live-btn');
    
  if (startCard) startCard.classList.toggle('hidden', !!tiberiusState.active);
  if (livePanel) livePanel.classList.toggle('hidden', !tiberiusState.active);

    if (finishBtn) {
      finishBtn.classList.toggle('hidden', !tiberiusState.active);
    }

    if (resetBtn) {
      resetBtn.classList.toggle('hidden', !tiberiusState.active);
    }
    
  if (onTopCheck) onTopCheck.checked = !!tiberiusState.onTop;

  if (randomBtn) {
    randomBtn.classList.toggle('hidden', !!tiberiusState.active);
  }

  renderTiberiusTargetEditor();

  if (scoreDisplay) {
    scoreDisplay.textContent = tiberiusState.score || 0;
  }
    
    if (nextTargetDisplay) {
      const nextTarget = (tiberiusState.targets || [])
        .map(x => parseInt(x || 0, 10))
        .filter(x => x > tiberiusState.score)
        .sort((a, b) => a - b)[0];

      if (!nextTarget) {
        nextTargetDisplay.textContent =
          '🏁 Alle Ziele erreicht';
      } else {
        nextTargetDisplay.textContent =
          `${nextTarget - tiberiusState.score} bis ${nextTarget}`;
      }
    }

  if (amountDisplay) {
    amountDisplay.textContent = euros(getTiberiusCurrentAmount());
  }

  const players = getActivePlayersForSoloGame();

  if (!tiberiusState.active) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Tiberius noch nicht gestartet.
      </div>
    `;

    renderTiberiusHistory();
    return;
  }

  if (!players.length) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Keine anwesenden Spieler.
      </div>
    `;

    renderTiberiusHistory();
    return;
  }

  const targets = Array.isArray(tiberiusState.targets)
    ? tiberiusState.targets
    : [];

  if (!targets.length) {
    board.innerHTML = `
      <div style="padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--muted);">
        Keine Zielwerte vorhanden. Bitte Tiberius neu starten und Zielwerte festlegen.
      </div>
    `;

    renderTiberiusHistory();
    return;
  }

    const headerCols = targets.map((target) => {
      const targetValue = parseInt(target || 0, 10) || 0;

      return `
        <th>
          <div style="font-size:1.25rem;font-weight:900;">
            ${targetValue}
          </div>
        </th>
      `;
    }).join('');

  const bodyRows = players.map(p => {
    const cells = targets.map((target, colIndex) => {
      const penalty = tiberiusState.penalties?.[colIndex];
      const hasPenalty = penalty && (penalty.payers || []).includes(p.name);

      return `
        <td>
          <div
            class="game-cell-btn ${hasPenalty ? 'loser' : 'empty'}"
            style="display:flex;align-items:center;justify-content:center;"
          >
            ${hasPenalty ? 'X' : '—'}
          </div>
        </td>
      `;
    }).join('');

    const live = getTiberiusPenaltyForPerson(p.name);

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

  renderTiberiusHistory();
}

function finishTiberiusGame() {
  ensureTiberiusState();

  if (!tiberiusState.active) {
    showToast('Tiberius wurde noch nicht gestartet', 'error');
    return;
  }

  const players = getActivePlayersForSoloGame();
  const assignedTo = [];

  players.forEach(p => {
    const amount = getTiberiusPenaltyForPerson(p.name);

    if (amount <= 0) return;

    const id = 'tiberius_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];

    p.freeStrafen.push({
      id,
      reason: 'Tiberius',
      amount,
      onTop: !!tiberiusState.onTop,
      createdAt: new Date().toISOString()
    });

    assignedTo.push({
      id,
      name: p.name,
      amount,
      onTop: !!tiberiusState.onTop
    });
  });

  const historyId = 'tiberius_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  const entry = {
    id: historyId,
    type: 'tiberius',
    createdAt: new Date().toISOString(),
    onTop: !!tiberiusState.onTop,
    score: tiberiusState.score || 0,
    targets: JSON.parse(JSON.stringify(tiberiusState.targets || [])),
    throws: JSON.parse(JSON.stringify(tiberiusState.throws || [])),
    penalties: JSON.parse(JSON.stringify(tiberiusState.penalties || {})),
    assignedTo
  };

  if (!Array.isArray(strafenHistory)) strafenHistory = [];
  strafenHistory.unshift(entry);

  if (!Array.isArray(tiberiusState.history)) tiberiusState.history = [];
  tiberiusState.history.unshift(entry);

  tiberiusState.finished = true;
  tiberiusState.active = false;

  renderAll();
  persistState();

  showToast('✅ Tiberius abgeschlossen', 'success');
}

function renderTiberiusHistory() {
  const el = document.getElementById('tiberius-history-list');
  if (!el) return;

  const entries = Array.isArray(tiberiusState.history) ? tiberiusState.history : [];

  if (!entries.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">Noch kein Tiberius-Verlauf</div>';
    return;
  }

  el.innerHTML = entries.map(entry => {
    const assigned = (entry.assignedTo || [])
      .map(x => `${x.name}: ${euros(x.amount)}${x.onTop ? ' · On Top' : ''}`)
      .join('<br>');

    return `
      <div class="spiel-card">
        <div class="spiel-info">
          <div class="spiel-verlierer round">🏛️ Tiberius abgeschlossen</div>
          <div class="spiel-detail">${entry.createdAt ? formatDateTime(entry.createdAt) : ''}</div>
          <div class="spiel-detail">Endstand: ${entry.score || 0}</div>
          <div class="spiel-detail"><strong>Gebucht:</strong><br>${assigned || '—'}</div>
        </div>
        <button class="del-spiel-btn" onclick="deleteStrafenHistoryEntry('${escapeForJs(entry.id)}')">✕</button>
      </div>
    `;
  }).join('');
}
