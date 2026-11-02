const MENSCH_TARGET_SCORE = 36;

function createMenschState() {
  return {
    active: false,
    finished: false,
    playerOrder: [],
    currentIndex: 0,
    scores: {},
    throws: {},
    history: [],
    winner: '',
    ranking: [],
    startedAt: ''
  };
}

function ensureMenschState() {
  if (!menschState) menschState = createMenschState();
  if (!Array.isArray(menschState.playerOrder)) menschState.playerOrder = [];
  if (!menschState.scores || typeof menschState.scores !== 'object') menschState.scores = {};
  if (!menschState.throws || typeof menschState.throws !== 'object') menschState.throws = {};
  if (!Array.isArray(menschState.history)) menschState.history = [];
  menschState.active = !!menschState.active;
  menschState.finished = !!menschState.finished;
  menschState.currentIndex = parseInt(menschState.currentIndex || 0, 10) || 0;
}

function getMenschPlayers() {
  ensureMenschState();
  const active = getActivePlayersForSoloGame();
  const activeNames = active.map(p => p.name);
  const existing = menschState.playerOrder.filter(name => activeNames.includes(name));
  const missing = activeNames.filter(name => !existing.includes(name));
  menschState.playerOrder = [...existing, ...missing];
  const indexMap = new Map(menschState.playerOrder.map((name, index) => [name, index]));
  return active.slice().sort((a, b) => (indexMap.get(a.name) ?? 999) - (indexMap.get(b.name) ?? 999));
}

function moveMenschOrder(index, delta) {
  getMenschPlayers();
  const target = index + delta;
  if (target < 0 || target >= menschState.playerOrder.length) return;
  const arr = menschState.playerOrder.slice();
  [arr[index], arr[target]] = [arr[target], arr[index]];
  menschState.playerOrder = arr;
  renderMenschOrderEditor();
  persistState();
}

function resetMenschOrder() {
  menschState.playerOrder = getActivePlayersForSoloGame().map(p => p.name);
  renderMenschOrderEditor();
  persistState();
}

function renderMenschOrderEditor() {
  const editor = document.getElementById('mensch-order-editor');
  if (!editor) return;
  const players = getMenschPlayers();
  if (!players.length) {
    editor.innerHTML = '<div class="game-order-editor-title">Sitzreihenfolge</div><div style="color:var(--muted);font-size:0.85rem;">Keine aktiven Spieler vorhanden.</div>';
    return;
  }
  editor.innerHTML = `
    <div class="game-order-editor-title">Sitzreihenfolge für Mensch ärgere dich nicht</div>
    <div class="game-order-list">
      ${players.map((player, index) => `
        <div class="game-order-item">
          <div class="game-order-item-name">${index + 1}. ${player.name}</div>
          <div class="game-order-actions">
            <button class="order-move-btn" onclick="moveMenschOrder(${index}, -1)">↑</button>
            <button class="order-move-btn" onclick="moveMenschOrder(${index}, 1)">↓</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:10px;">
      <button type="button" class="secondary-btn" onclick="resetMenschOrder()">↻ Alphabetisch</button>
    </div>
  `;
}

function rotateMenschOrder(starterName) {
  getMenschPlayers();
  const idx = menschState.playerOrder.indexOf(starterName);
  if (idx >= 0) menschState.playerOrder = [...menschState.playerOrder.slice(idx), ...menschState.playerOrder.slice(0, idx)];
}

function startMenschGame() {
  const players = getMenschPlayers();
  if (!players.length) {
    showToast('Keine anwesenden Spieler vorhanden', 'error');
    return;
  }
  openSoloStartDraw({
    title: '🎲 Mensch ärgere dich nicht',
    subtitle: 'Wer startet das Spiel?',
    players: players.map(p => p.name),
    onConfirm: starterName => startMenschGameFinal(starterName)
  });
}

function startMenschGameFinal(starterName) {
  ensureMenschState();
  rotateMenschOrder(starterName);
  menschState.active = true;
  menschState.finished = false;
  menschState.currentIndex = 0;
  menschState.startedAt = new Date().toISOString();
  menschState.winner = '';
  menschState.ranking = [];
  menschState.scores = {};
  menschState.throws = {};
  getMenschPlayers().forEach(player => {
    menschState.scores[player.name] = 0;
    menschState.throws[player.name] = [];
  });
  renderMenschGame();
  persistState();
  showToast(`🎲 ${starterName} beginnt`, 'success');
}

function getLoserPenaltyKeyByRank(rank) {
  const target = `${rank}. verlierer`;
  const found = STRAFEN.find(item => String(item.label || '').trim().toLowerCase().startsWith(target));
  return found ? found.key : null;
}

function applyMenschThrow(value) {
  ensureMenschState();
  const players = getMenschPlayers();
  if (!menschState.active || !players.length) return;
  const current = players[menschState.currentIndex];
  if (!current) return;
  const pins = parseInt(value, 10) || 0;
  const oldScore = parseInt(menschState.scores[current.name] || 0, 10) || 0;
  let newScore = oldScore + pins;
  if (newScore > MENSCH_TARGET_SCORE) {
    newScore = MENSCH_TARGET_SCORE - (newScore - MENSCH_TARGET_SCORE);
  }
  menschState.scores[current.name] = newScore;
  menschState.throws[current.name].push({ pins, at: new Date().toISOString() });

  if (newScore === MENSCH_TARGET_SCORE) {
    finishMenschGame(current.name);
    return;
  }

  if (pins !== 6) {
    menschState.currentIndex = (menschState.currentIndex + 1) % players.length;
  }

  renderMenschGame();
  persistState();
}

function finishMenschGame(winnerName) {
  const players = getMenschPlayers();
  menschState.active = false;
  menschState.finished = true;
  menschState.winner = winnerName;
  const others = players.filter(p => p.name !== winnerName).map(p => ({ name: p.name, score: menschState.scores[p.name] || 0 }));
  others.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'de'));
  const groups = [];
  others.forEach(item => {
    const last = groups[groups.length - 1];
    if (!last || last.score !== item.score) {
      groups.push({ score: item.score, names: [item.name] });
    } else {
      last.names.push(item.name);
    }
  });
  const assigned = [];
  groups.forEach((group, index) => {
    const rank = index + 1;
    const key = getLoserPenaltyKeyByRank(rank);
    if (!key) return;
    group.names.forEach(name => {
      const person = persons.find(p => p.name === name);
      if (!person) return;
      if (!person.strafen) person.strafen = {};
      person.strafen[key] = (parseInt(person.strafen[key] || 0, 10) || 0) + 1;
      assigned.push({ name, rank, score: group.score });
    });
  });
  const entry = {
    id: 'mensch_' + Date.now(),
    type: 'mensch',
    createdAt: new Date().toISOString(),
    winner: winnerName,
    scores: JSON.parse(JSON.stringify(menschState.scores)),
    throws: JSON.parse(JSON.stringify(menschState.throws)),
    ranking: groups,
    assigned
  };
  menschState.history.unshift(entry);
  if (!Array.isArray(strafenHistory)) strafenHistory = [];
  strafenHistory.unshift(entry);
  renderMenschGame();
  persistState();
  showToast(`🏁 ${winnerName} gewinnt Mensch ärgere dich nicht`, 'success');
}

function resetMenschGame() {
  if (!confirm('Mensch ärgere dich nicht wirklich neu starten?')) return;
  menschState = createMenschState();
  renderMenschGame();
  persistState();
}

function renderMenschGame() {
  ensureMenschState();
  renderMenschOrderEditor();
  const startCard = document.getElementById('mensch-start-card');
  const board = document.getElementById('mensch-board');
  const history = document.getElementById('mensch-history-list');
  if (!board || !history || !startCard) return;
  startCard.classList.toggle('hidden', !!menschState.active);
  const players = getMenschPlayers();
  if (!menschState.active) {
    board.innerHTML = '<div class="game-placeholder-card">Noch nicht gestartet. Reihenfolge einstellen und dann auslosen.</div>';
  } else {
    const current = players[menschState.currentIndex];
    board.innerHTML = `
      <div class="mensch-live-head">
        <div class="mensch-current-player">🎳 ${current ? current.name : '—'} ist dran</div>
        <div>${menschState.winner ? `🏁 Sieger: <strong>${menschState.winner}</strong>` : 'Ziel: genau 36 Punkte'}</div>
      </div>
      <div class="mensch-grid">
        ${players.map((player, index) => {
          const score = parseInt(menschState.scores[player.name] || 0, 10) || 0;
          const recent = (menschState.throws[player.name] || []).slice(-5).map(item => item.pins).join(' · ') || '—';
          return `
            <div class="mensch-player-card ${index === menschState.currentIndex ? 'active' : ''}">
              <div class="mensch-player-head">
                <div><strong>${player.name}</strong></div>
                <div class="mensch-player-score">${score}</div>
              </div>
              <div class="mensch-track">
                <div class="mensch-track-fill" style="width:${Math.max(0, Math.min(100, (score / MENSCH_TARGET_SCORE) * 100))}%;"></div>
                <div class="mensch-track-marker"></div>
              </div>
              <div class="mensch-last-throws">Letzte Würfe: ${recent}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top:16px;">
        <div class="section-title">Wurf eingeben</div>
        <div class="pinpad-grid">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pinpad-btn" onclick="applyMenschThrow(${n})">${n}</button>`).join('')}
          <button class="pinpad-btn special" onclick="applyMenschThrow(0)">Gosse</button>
        </div>
      </div>
    `;
  }
  if (!menschState.history.length) {
    history.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:16px;">Noch kein Verlauf vorhanden</div>';
  } else {
    history.innerHTML = menschState.history.map(entry => `
      <div class="spiel-card">
        <div class="spiel-info">
          <div class="spiel-verlierer round">🎲 ${entry.winner} hat gewonnen</div>
          <div class="spiel-detail">${formatDateTime(entry.createdAt)}</div>
          <div class="spiel-detail"><strong>Wertung:</strong><br>${(entry.ranking || []).map((group, index) => `${index + 1}. Verlierer: ${group.names.join(', ')} (${group.score} Punkte)`).join('<br>') || 'Keine Strafgruppen gebucht'}</div>
        </div>
      </div>
    `).join('');
  }
}
