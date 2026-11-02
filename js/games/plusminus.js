function createPlusminusState() {
  return {
    active: false,
    finished: false,
    playerOrder: [],
    currentPlayerIndex: 0,
    currentThrowIndex: 0,
    rows: {},
    smartGosse: false,
    history: [],
    startedAt: ''
  };
}

function ensurePlusminusState() {
  if (!plusminusState) plusminusState = createPlusminusState();
  if (!Array.isArray(plusminusState.playerOrder)) plusminusState.playerOrder = [];
  if (!plusminusState.rows || typeof plusminusState.rows !== 'object') plusminusState.rows = {};
  if (!Array.isArray(plusminusState.history)) plusminusState.history = [];
  plusminusState.active = !!plusminusState.active;
  plusminusState.finished = !!plusminusState.finished;
  plusminusState.currentPlayerIndex = parseInt(plusminusState.currentPlayerIndex || 0, 10) || 0;
  plusminusState.currentThrowIndex = parseInt(plusminusState.currentThrowIndex || 0, 10) || 0;
  plusminusState.smartGosse = !!plusminusState.smartGosse;
}

function getPlusminusPlayers() {
  ensurePlusminusState();
  const active = getActivePlayersForSoloGame();
  const activeNames = active.map(p => p.name);
  const existing = plusminusState.playerOrder.filter(name => activeNames.includes(name));
  const missing = activeNames.filter(name => !existing.includes(name));
  plusminusState.playerOrder = [...existing, ...missing];
  const indexMap = new Map(plusminusState.playerOrder.map((name, index) => [name, index]));
  return active.slice().sort((a, b) => (indexMap.get(a.name) ?? 999) - (indexMap.get(b.name) ?? 999));
}

function movePlusminusOrder(index, delta) {
  getPlusminusPlayers();
  const target = index + delta;
  if (target < 0 || target >= plusminusState.playerOrder.length) return;
  const arr = plusminusState.playerOrder.slice();
  [arr[index], arr[target]] = [arr[target], arr[index]];
  plusminusState.playerOrder = arr;
  renderPlusminusOrderEditor();
  persistState();
}

function resetPlusminusOrder() {
  plusminusState.playerOrder = getActivePlayersForSoloGame().map(p => p.name);
  renderPlusminusOrderEditor();
  persistState();
}

function renderPlusminusOrderEditor() {
  const editor = document.getElementById('plusminus-order-editor');
  if (!editor) return;
  const players = getPlusminusPlayers();
  if (!players.length) {
    editor.innerHTML = '<div class="game-order-editor-title">Sitzreihenfolge</div><div style="color:var(--muted);font-size:0.85rem;">Keine aktiven Spieler vorhanden.</div>';
    return;
  }
  editor.innerHTML = `
    <div class="game-order-editor-title">Sitzreihenfolge für + − × ÷</div>
    <div class="game-order-list">
      ${players.map((player, index) => `
        <div class="game-order-item">
          <div class="game-order-item-name">${index + 1}. ${player.name}</div>
          <div class="game-order-actions">
            <button class="order-move-btn" onclick="movePlusminusOrder(${index}, -1)">↑</button>
            <button class="order-move-btn" onclick="movePlusminusOrder(${index}, 1)">↓</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:10px;">
      <button type="button" class="secondary-btn" onclick="resetPlusminusOrder()">↻ Alphabetisch</button>
    </div>
  `;
}

function togglePlusminusSmartGosse() {
  ensurePlusminusState();
  plusminusState.smartGosse = !!document.getElementById('plusminus-smart-gosse')?.checked;
  renderPlusminusGame();
  persistState();
}

function startPlusminusGame() {
  const players = getPlusminusPlayers();
  if (!players.length) {
    showToast('Keine anwesenden Spieler vorhanden', 'error');
    return;
  }
  ensurePlusminusState();
  plusminusState.active = true;
  plusminusState.finished = false;
  plusminusState.currentPlayerIndex = 0;
  plusminusState.currentThrowIndex = 0;
  plusminusState.startedAt = new Date().toISOString();
  plusminusState.rows = {};
  players.forEach(player => {
    plusminusState.rows[player.name] = Array.from({ length: 5 }, () => null);
  });
  renderPlusminusGame();
  persistState();
}

function applyPlusminusThrow(value, isGosse = false) {
  ensurePlusminusState();
  const players = getPlusminusPlayers();
  if (!plusminusState.active || !players.length) return;
  const player = players[plusminusState.currentPlayerIndex];
  if (!player) return;
  const row = plusminusState.rows[player.name] || Array.from({ length: 5 }, () => null);
  row[plusminusState.currentThrowIndex] = { value: parseInt(value, 10) || 0, isGosse: !!isGosse };
  plusminusState.rows[player.name] = row;
  plusminusState.currentPlayerIndex++;
  if (plusminusState.currentPlayerIndex >= players.length) {
    plusminusState.currentPlayerIndex = 0;
    plusminusState.currentThrowIndex++;
  }
  if (plusminusState.currentThrowIndex >= 5) {
    finishPlusminusGame();
    return;
  }
  renderPlusminusGame();
  persistState();
}

function resolvePlusminusValue(slotIndex, slot, partialBefore, smart) {
  if (!slot) return null;
  if (!slot.isGosse) return parseInt(slot.value || 0, 10) || 0;
  if (!smart) return [0, 0, 9, 0, 9][slotIndex];
  if (slotIndex === 0 || slotIndex === 1) return 0;
  if (slotIndex === 2) return 9;
  if (slotIndex === 3) return partialBefore < 0 ? 9 : 0;
  if (slotIndex === 4) return partialBefore < 0 ? 1 : 9;
  return 0;
}

function computePlusminusResult(row, smart = false) {
  const steps = [];
  let a = resolvePlusminusValue(0, row[0], 0, smart);
  let b = resolvePlusminusValue(1, row[1], a, smart);
  if (a === null || b === null) return { complete: false, result: null, display: '—' };
  let value = a + b;
  steps.push(`${a} + ${b} = ${value}`);
  let c = resolvePlusminusValue(2, row[2], value, smart);
  if (c === null) return { complete: false, result: null, display: '—' };
  value = value - c;
  steps.push(`− ${c} = ${value}`);
  let d = resolvePlusminusValue(3, row[3], value, smart);
  if (d === null) return { complete: false, result: null, display: '—' };
  value = value * d;
  steps.push(`× ${d} = ${value}`);
  let e = resolvePlusminusValue(4, row[4], value, smart);
  if (e === null) return { complete: false, result: null, display: '—' };
  value = e === 0 ? 0 : value / e;
  steps.push(`÷ ${e} = ${value}`);
  return { complete: true, result: value, display: String(value), steps };
}

function finishPlusminusGame() {
  const players = getPlusminusPlayers();
  plusminusState.active = false;
  plusminusState.finished = true;
  const results = players.map(player => ({
    name: player.name,
    ...computePlusminusResult(plusminusState.rows[player.name] || [], plusminusState.smartGosse)
  })).sort((a, b) => (b.result ?? -Infinity) - (a.result ?? -Infinity));
  const entry = {
    id: 'plusminus_' + Date.now(),
    type: 'plusminus',
    createdAt: new Date().toISOString(),
    smartGosse: !!plusminusState.smartGosse,
    rows: JSON.parse(JSON.stringify(plusminusState.rows)),
    results
  };
  plusminusState.history.unshift(entry);
  renderPlusminusGame();
  persistState();
  showToast('➕ Spiel abgeschlossen', 'success');
}

function resetPlusminusGame() {
  if (!confirm('+ − × ÷ wirklich neu starten?')) return;
  plusminusState = createPlusminusState();
  renderPlusminusGame();
  persistState();
}

function renderPlusminusGame() {
  ensurePlusminusState();
  renderPlusminusOrderEditor();
  const startCard = document.getElementById('plusminus-start-card');
  const smartCheck = document.getElementById('plusminus-smart-gosse');
  const board = document.getElementById('plusminus-board');
  const history = document.getElementById('plusminus-history-list');
  if (!board || !history || !startCard) return;
  if (smartCheck) smartCheck.checked = !!plusminusState.smartGosse;
  startCard.classList.toggle('hidden', !!plusminusState.active);
  const players = getPlusminusPlayers();
  if (!plusminusState.active) {
    board.innerHTML = '<div class="game-placeholder-card">Noch nicht gestartet. Reihenfolge einstellen und danach das Spiel beginnen.</div>';
  } else {
    const current = players[plusminusState.currentPlayerIndex];
    board.innerHTML = `
      <div class="plusminus-live-head">
        <div class="plusminus-current-player">🎳 ${current ? current.name : '—'} ist dran · Kästchen ${plusminusState.currentThrowIndex + 1}/5</div>
        <div>${plusminusState.smartGosse ? 'Smart-Gosse aktiv' : 'Standard-Gosse aktiv'}</div>
      </div>
      <div class="mensch-grid">
        ${players.map((player, index) => {
          const row = plusminusState.rows[player.name] || Array.from({ length: 5 }, () => null);
          const comp = computePlusminusResult(row, plusminusState.smartGosse);
          return `
            <div class="mensch-player-card ${index === plusminusState.currentPlayerIndex ? 'active' : ''}">
              <div class="mensch-player-head">
                <div><strong>${player.name}</strong></div>
                <div class="plusminus-result">${comp.complete ? comp.display : '—'}</div>
              </div>
              <div class="plusminus-boxes">
                ${row.map((slot, slotIndex) => `<div class="plusminus-box ${!slot ? 'pending' : ''}">${slot ? (slot.isGosse ? 'G' : slot.value) : slotIndex + 1}</div>`).join('')}
              </div>
              <div class="plusminus-op-line"><span>1</span><span>+</span><span>2</span><span>−</span><span>3</span><span>×</span><span>4</span><span>÷</span><span>5</span></div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top:16px;">
        <div class="section-title">Wurf eingeben</div>
        <div class="pinpad-grid">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pinpad-btn" onclick="applyPlusminusThrow(${n}, false)">${n}</button>`).join('')}
          <button class="pinpad-btn special" onclick="applyPlusminusThrow(0, false)">0</button>
          <button class="pinpad-btn special" onclick="applyPlusminusThrow(0, true)">Gosse</button>
        </div>
      </div>
    `;
  }
  if (!plusminusState.history.length) {
    history.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">Noch kein Verlauf vorhanden</div>';
  } else {
    history.innerHTML = plusminusState.history.map(entry => `
      <div class="spiel-card">
        <div class="spiel-info">
          <div class="spiel-verlierer round">➕ Spiel abgeschlossen</div>
          <div class="spiel-detail">${formatDateTime(entry.createdAt)}</div>
          <div class="spiel-detail"><strong>Ergebnisse:</strong><br>${(entry.results || []).map((item, index) => `${index + 1}. ${item.name}: ${item.display}`).join('<br>')}</div>
          <div class="spiel-detail">Modus: ${entry.smartGosse ? 'Smart-Gosse' : 'Standard-Gosse'}</div>
        </div>
      </div>
    `).join('');
  }
}
