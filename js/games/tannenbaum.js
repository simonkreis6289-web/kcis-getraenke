let pendingTannenbaumPenaltyThrow = null;
let pendingTannenbaumKranzChoice = null;

function createTannenbaumState() {
  return {
    teams: {
      T1: {
        remaining: { ...TANNENBAUM_BASE },
        strikes: [],
        bonus: 0,
        finished: false
      },
      T2: {
        remaining: { ...TANNENBAUM_BASE },
        strikes: [],
        bonus: 0,
        finished: false
      }
    },
    history: []
  };
}

// ── ENSURE GAME ──    
function ensureTannenbaumState() {
  if (!tannenbaumState || !tannenbaumState.teams) {
    tannenbaumState = createTannenbaumState();
  }

  ['T1', 'T2'].forEach(team => {
    if (!tannenbaumState.teams[team]) {
      tannenbaumState.teams[team] = createTannenbaumState().teams[team];
    }

    if (!tannenbaumState.teams[team].remaining) {
      tannenbaumState.teams[team].remaining = { ...TANNENBAUM_BASE };
    }

    if (!Array.isArray(tannenbaumState.teams[team].strikes)) {
      tannenbaumState.teams[team].strikes = [];
    }

    tannenbaumState.teams[team].bonus = parseFloat(tannenbaumState.teams[team].bonus || 0) || 0;
    tannenbaumState.teams[team].finished = !!tannenbaumState.teams[team].finished;

    Object.keys(TANNENBAUM_BASE).forEach(n => {
      if (tannenbaumState.teams[team].remaining[n] === undefined) {
        tannenbaumState.teams[team].remaining[n] = TANNENBAUM_BASE[n];
      }
    });
  });

  if (!Array.isArray(tannenbaumState.history)) {
    tannenbaumState.history = [];
  }
}

function openTannenbaumThrowModal(team) {
  ensureTannenbaumState();

  tannenbaumThrowTeam = team;

  const title = document.getElementById('tannenbaum-throw-title');
  const grid = document.getElementById('tannenbaum-number-grid');

  if (title) {
    title.textContent = `Wurf für ${getTannenbaumTeamDisplay(team)}`;
  }

  if (!grid) return;

  grid.innerHTML = '';

  // Normale Zahlen 1 bis 9
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'tannenbaum-number-btn';
    btn.textContent = n;

    if (n === 9) {
      btn.onclick = () => {
        openTannenbaumPenaltyPlayerModal('9er', team, 9);
      };
    } else {
      btn.onclick = () => handleTannenbaumThrow(n);
    }

    grid.appendChild(btn);
  }

  // Kranz
  const kranzBtn = document.createElement('button');
  kranzBtn.className = 'tannenbaum-number-btn special kranz';
  kranzBtn.innerHTML = '👑<br><span>Kranz</span>';
  kranzBtn.onclick = () => {
    openTannenbaumPenaltyPlayerModal('kranz', team, null);
  };
  grid.appendChild(kranzBtn);

  // Gosse
  const gosseBtn = document.createElement('button');
  gosseBtn.className = 'tannenbaum-number-btn special gosse';
  gosseBtn.innerHTML = '💀<br><span>Gosse</span>';
  gosseBtn.onclick = () => {
    openTannenbaumPenaltyPlayerModal('gosse', team, null);
  };
  grid.appendChild(gosseBtn);

  document
    .getElementById('tannenbaum-throw-modal')
    ?.classList.remove('hidden');
}
  
function openTannenbaumPenaltyPlayerModal(type, team, number = null) {
  pendingTannenbaumPenaltyThrow = {
    type,
    team,
    number
  };

  const title = document.getElementById(
    'tannenbaum-penalty-player-title'
  );

  const sub = document.getElementById(
    'tannenbaum-penalty-player-sub'
  );

  const select = document.getElementById(
    'tannenbaum-penalty-player-select'
  );

  const labels = {
    '9er': '🎯 9er geworfen',
    kranz: '👑 Kranz geworfen',
    gosse: '💀 Gosse geworfen'
  };

  if (title) {
    title.textContent = labels[type] || 'Wer hat geworfen?';
  }

  if (sub) {
    sub.textContent = type === 'gosse'
      ? 'Wer bekommt die Gosse-Strafe?'
      : 'Wer hat geworfen und bleibt straffrei?';
  }

  if (select) {
    select.innerHTML =
      '<option value="">Bitte Person auswählen</option>';

    persons
      .filter(p => p.present && !p.left)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .forEach(p => {
        const option = document.createElement('option');
        option.value = p.name;
        option.textContent = p.name;
        select.appendChild(option);
      });
  }

  document
    .getElementById('tannenbaum-throw-modal')
    ?.classList.add('hidden');

  document
    .getElementById('tannenbaum-penalty-player-modal')
    ?.classList.remove('hidden');
}
  
function bookTannenbaumPenalty(type, personName) {
  const penaltyKey = getPenaltyKeyByType(type);

  if (!penaltyKey) {
    showToast(`Strafe "${type}" nicht gefunden`, 'error');
    return null;
  }

  const activePlayers = persons.filter(
    p => p.present && !p.left
  );

  const punishedNames = [];

  if (type === 'gosse') {
    const thrower = persons.find(
      p => p.name === personName
    );

    if (!thrower) {
      showToast('Person nicht gefunden', 'error');
      return null;
    }

    if (!thrower.strafen) {
      thrower.strafen = {};
    }

    thrower.strafen[penaltyKey] =
      (thrower.strafen[penaltyKey] || 0) + 1;

    punishedNames.push(personName);
  } else {
    activePlayers.forEach(person => {
      if (person.name === personName) return;

      if (!person.strafen) {
        person.strafen = {};
      }

      person.strafen[penaltyKey] =
        (person.strafen[penaltyKey] || 0) + 1;

      punishedNames.push(person.name);
    });
  }

  if (typeof addPenaltyStatsEntry === 'function') {
    addPenaltyStatsEntry(
      type,
      personName,
      punishedNames
    );
  }

  return {
    penaltyKey,
    punishedNames
  };
}
  
function refreshTannenbaumPenaltyUI() {
  if (typeof renderStrafen === 'function') {
    renderStrafen();
  }

  if (typeof updateStats === 'function') {
    updateStats();
  }
}
  
function confirmTannenbaumPenaltyPlayer() {
  ensureTannenbaumState();

  if (!pendingTannenbaumPenaltyThrow) return;

  const select = document.getElementById(
    'tannenbaum-penalty-player-select'
  );

  const personName = select?.value || '';

  if (!personName) {
    showToast('Bitte Person auswählen', 'error');
    return;
  }

  const {
    type,
    team,
    number
  } = pendingTannenbaumPenaltyThrow;

  document
    .getElementById('tannenbaum-penalty-player-modal')
    ?.classList.add('hidden');

  if (type === 'kranz') {
    pendingTannenbaumKranzChoice = {
      type,
      team,
      thrower: personName
    };

    pendingTannenbaumPenaltyThrow = null;

    openTannenbaumKranzNumberModal();
    return;
  }

  const booking = bookTannenbaumPenalty(
    type,
    personName
  );

  if (!booking) return;

  pendingTannenbaumPenaltyThrow = null;

  if (type === '9er' && number === 9) {
    handleTannenbaumThrow(9);

      const latestEntry = tannenbaumState.history?.[0];

    if (latestEntry) {
      latestEntry.specialType = '9er';
      latestEntry.thrower = personName;
      latestEntry.penaltyKey = booking.penaltyKey;
      latestEntry.punishedNames = booking.punishedNames;
    }
      
refreshTannenbaumPenaltyUI();

    persistState();

    showToast(
      `🎯 9er von ${personName} gebucht`,
      'success'
    );

    return;
  }

  tannenbaumState.history.unshift({
    team,
    number: 'gosse',
    action:
      `${getTannenbaumTeamDisplay(team)}: Gosse durch ${personName}`,
    type: 'penalty-gosse',
    thrower: personName,
    penaltyKey: booking.penaltyKey,
    punishedNames: booking.punishedNames,
    createdAt: new Date().toISOString()
  });

  tannenbaumThrowTeam = null;

    renderTannenbaum();
    refreshTannenbaumPenaltyUI();
    persistState();

  showToast(
    `💀 Gosse für ${personName} gebucht`,
    'success'
  );
}

function openTannenbaumKranzNumberModal() {
  if (!pendingTannenbaumKranzChoice) return;

  const grid = document.getElementById(
    'tannenbaum-kranz-number-grid'
  );

  const sub = document.getElementById(
    'tannenbaum-kranz-number-sub'
  );

  if (!grid) return;

  const {
    team,
    thrower
  } = pendingTannenbaumKranzChoice;

  if (sub) {
    sub.textContent =
      `${thrower} hat einen Kranz geworfen. ` +
      `Welche Zahl soll für ${getTannenbaumTeamDisplay(team)} gelten?`;
  }

  grid.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');

    btn.className = 'tannenbaum-number-btn';
    btn.textContent = n;

    btn.onclick = () => {
      confirmTannenbaumKranzNumber(n);
    };

    grid.appendChild(btn);
  }

  document
    .getElementById('tannenbaum-kranz-number-modal')
    ?.classList.remove('hidden');
}

function closeTannenbaumPenaltyPlayerModal() {
  document
    .getElementById('tannenbaum-penalty-player-modal')
    ?.classList.add('hidden');

  pendingTannenbaumPenaltyThrow = null;
  tannenbaumThrowTeam = null;
}

function closeTannenbaumKranzNumberModal() {
  document
    .getElementById('tannenbaum-kranz-number-modal')
    ?.classList.add('hidden');

  pendingTannenbaumKranzChoice = null;
  pendingTannenbaumPenaltyThrow = null;
  tannenbaumThrowTeam = null;
}
  
function closeTannenbaumThrowModal() {
  document.getElementById('tannenbaum-throw-modal').classList.add('hidden');
  tannenbaumThrowTeam = null;
}

function getTannenbaumTeamDisplay(team) {
  const fallback = team === 'T1'
    ? { emoji: '⚫', name: 'Team 1' }
    : { emoji: '🔴', name: 'Team 2' };

  const settings = groupSettings?.[team] || fallback;
  const emoji = settings.emoji || fallback.emoji;
  const name = settings.name || fallback.name;

  return `${emoji} ${name}`;
}

function updateTannenbaumPageHeader() {
  const throwT1 = document.getElementById('tannenbaum-throw-btn-t1');
  const throwT2 = document.getElementById('tannenbaum-throw-btn-t2');

  const currentT1Team = document.getElementById('tannenbaum-current-t1-team');
  const openT1Team = document.getElementById('tannenbaum-open-t1-team');
  const currentT2Team = document.getElementById('tannenbaum-current-t2-team');
  const openT2Team = document.getElementById('tannenbaum-open-t2-team');

  const historyT1Title = document.getElementById('tannenbaum-history-t1-title');
  const historyT2Title = document.getElementById('tannenbaum-history-t2-title');

  const labelT1 = getTannenbaumTeamDisplay('T1');
  const labelT2 = getTannenbaumTeamDisplay('T2');

  if (throwT1) throwT1.textContent = `${labelT1} Wurf`;
  if (throwT2) throwT2.textContent = `${labelT2} Wurf`;

  if (currentT1Team) currentT1Team.textContent = labelT1;
  if (openT1Team) openT1Team.textContent = labelT1;
  if (currentT2Team) currentT2Team.textContent = labelT2;
  if (openT2Team) openT2Team.textContent = labelT2;

  if (historyT1Title) historyT1Title.textContent = labelT1;
  if (historyT2Title) historyT2Title.textContent = labelT2;
}

function renderTannenbaumSummary() {
  ensureTannenbaumState();

  const currentT1 = document.getElementById('tannenbaum-current-t1');
  const openT1 = document.getElementById('tannenbaum-open-t1');
  const currentT2 = document.getElementById('tannenbaum-current-t2');
  const openT2 = document.getElementById('tannenbaum-open-t2');

  const currentAmountT1 = getTannenbaumTeamTotal('T1');
  const currentAmountT2 = getTannenbaumTeamTotal('T2');

  const openAmountT1 = getTannenbaumOpenNumbersTotal('T1').total;
  const openAmountT2 = getTannenbaumOpenNumbersTotal('T2').total;

  if (currentT1) currentT1.textContent = euros(currentAmountT1);
  if (openT1) openT1.textContent = euros(openAmountT1);
  if (currentT2) currentT2.textContent = euros(currentAmountT2);
  if (openT2) openT2.textContent = euros(openAmountT2);
}

function renderTannenbaumThrowHistory() {
  ensureTannenbaumState();

  renderTannenbaumThrowHistoryForTeam('T1', 'tannenbaum-history-t1');
  renderTannenbaumThrowHistoryForTeam('T2', 'tannenbaum-history-t2');
}

function renderTannenbaumThrowHistoryForTeam(team, elementId) {
  const list = document.getElementById(elementId);
  if (!list) return;

  const entries = (tannenbaumState.history || [])
    .filter(entry => entry.team === team)
    .filter(entry => entry.type !== 'manual-restore')
    .slice(0, 7);

  if (!entries.length) {
    list.innerHTML = `
      <div class="tannenbaum-throw-empty">
        Noch keine Würfe
      </div>
    `;
    return;
  }

  list.innerHTML = entries.map(entry => {
    const displayNumber =
      entry.number === 'gosse'
        ? '💀'
        : entry.specialType === 'kranz'
          ? '👑'
          : entry.specialType === '9er'
            ? '🎯'
            : entry.number;

    const throwerName = entry.thrower || '—';

    return `
      <div class="tannenbaum-history-entry">
        <div class="tannenbaum-history-number">
          ${displayNumber}
        </div>

        <div class="tannenbaum-history-text">
          <div class="tannenbaum-history-action">
            ${getTannenbaumHistoryLabel(entry)}
          </div>

          <div class="tannenbaum-history-thrower">
            ${throwerName}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getTannenbaumHistoryLabel(entry) {
  if (entry.specialType === 'kranz') {
    return '👑 Kranz';
  }

  if (entry.specialType === '9er') {
    return '🎯 9er';
  }

  if (entry.type === 'penalty-gosse') {
    return '💀 Gosse';
  }

  if (entry.type === 'strike-own') {
    return '✅ Gestrichen';
  }

  if (entry.type === 'enemy-strike') {
    return '⚠️ Gegner +1';
  }

  if (entry.type === 'restore') {
    return '↩️ Zurück';
  }

  return '🎳 Wurf';
}

function renderTannenbaum() {
  ensureTannenbaumState();

  const board = document.getElementById('tannenbaum-board');
  if (!board) return;

  const rows = Object.keys(TANNENBAUM_BASE).map(n => `
    <tr>
      <td class="tannenbaum-strich-cell left">
        ${renderTannenbaumStrikeMarks('T1', n)}
      </td>

      <td class="tannenbaum-box-cell">
        ${renderTannenbaumNumberCells('T1', n, 'wand')}
      </td>

      <td class="tannenbaum-middle">${n}</td>

      <td class="tannenbaum-box-cell">
        ${renderTannenbaumNumberCells('T2', n, 'tv')}
      </td>

      <td class="tannenbaum-strich-cell right">
        ${renderTannenbaumStrikeMarks('T2', n)}
      </td>
    </tr>
  `).join('');

  board.innerHTML = `
    <div class="tannenbaum-scroll">
      <table class="tannenbaum-table">
        <thead>
          <tr>
            <th>Striche</th>
            <th class="wand">${getTannenbaumTeamDisplay('T1')}</th>
            <th>Zahl</th>
            <th class="tv">${getTannenbaumTeamDisplay('T2')}</th>
            <th>Striche</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  updateTannenbaumPageHeader();
  renderTannenbaumSummary();
  renderTannenbaumThrowHistory();
  updateTannenbaumCountdownSummary();
}

function openTannenbaumRestoreModal() {
  const teamSelect = document.getElementById('tannenbaum-restore-team');
  const numberSelect = document.getElementById('tannenbaum-restore-number');

  if (!teamSelect || !numberSelect) return;

  teamSelect.innerHTML = `
    <option value="T1">${getGroupLabel('T1')}</option>
    <option value="T2">${getGroupLabel('T2')}</option>
  `;

  numberSelect.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    numberSelect.innerHTML += `<option value="${n}">${n}</option>`;
  }

  document.getElementById('tannenbaum-restore-modal')?.classList.remove('hidden');
}

function closeTannenbaumRestoreModal() {
  document.getElementById('tannenbaum-restore-modal')?.classList.add('hidden');
}

function confirmTannenbaumKranzNumber(number) {
  ensureTannenbaumState();

  if (!pendingTannenbaumKranzChoice) return;

  const {
    team,
    thrower
  } = pendingTannenbaumKranzChoice;

  const booking = bookTannenbaumPenalty(
    'kranz',
    thrower
  );

  if (!booking) return;

  document
    .getElementById('tannenbaum-kranz-number-modal')
    ?.classList.add('hidden');

  pendingTannenbaumKranzChoice = null;

  tannenbaumThrowTeam = team;

  handleTannenbaumThrow(number);

  const latestEntry = tannenbaumState.history?.[0];

  if (latestEntry) {
    latestEntry.specialType = 'kranz';
    latestEntry.thrower = thrower;
    latestEntry.penaltyKey = booking.penaltyKey;
    latestEntry.punishedNames = booking.punishedNames;
    latestEntry.action =
      `👑 Kranz von ${thrower}: Zahl ${number} · ` +
      latestEntry.action;
  }

    renderTannenbaum();
    refreshTannenbaumPenaltyUI();
    persistState();

  showToast(
    `👑 Kranz von ${thrower}: Zahl ${number} gewählt`,
    'success'
  );
}
  
function confirmTannenbaumRestore() {
  ensureTannenbaumState();

  const team = document.getElementById('tannenbaum-restore-team')?.value;
  const number = document.getElementById('tannenbaum-restore-number')?.value;

  if (!team || !number) return;

  const data = tannenbaumState.teams[team];
  data.remaining[number] = (data.remaining[number] || 0) + 1;
  data.finished = false;

  tannenbaumState.history.unshift({
    team,
    number: Number(number),
    action: `${getGroupLabel(team)} bekommt ${number} manuell zurück`,
    type: 'manual-restore',
    createdAt: new Date().toISOString()
  });

  closeTannenbaumRestoreModal();
  renderTannenbaum();
  persistState();

  showToast(`➕ ${getGroupLabel(team)} bekommt ${number} zurück`, 'success');
}

function updateTannenbaumCountdownSummary() {
  ensureTannenbaumState();

  const elT1 = document.getElementById('tannenbaum-countdown-t1');
  const elT2 = document.getElementById('tannenbaum-countdown-t2');

  if (!elT1 || !elT2) return;

  const isTannenbaumVisible =
    !document.getElementById('tab-tannenbaum')?.classList.contains('hidden');

  elT1.classList.toggle('hidden', !isTannenbaumVisible);
  elT2.classList.toggle('hidden', !isTannenbaumVisible);

  if (!isTannenbaumVisible) return;

  ['T1', 'T2'].forEach(team => {
    const el = team === 'T1' ? elT1 : elT2;
    const current = getTannenbaumTeamTotal(team);
    const open = getTannenbaumOpenNumbersTotal(team).total;

    el.innerHTML = `
      <div class="tannenbaum-countdown-label">${getGroupLabel(team)}</div>
      <div class="tannenbaum-countdown-main">${euros(current)}</div>
      <div class="tannenbaum-countdown-open">offen: ${euros(open)}</div>
    `;
  });
}

function finishTannenbaumGame() {
  ensureTannenbaumState();

  if (!confirm('Tannenbaum wirklich abschließen und den Personen zuordnen?')) return;

  const teamTotals = {
    T1: getTannenbaumTeamTotal('T1'),
    T2: getTannenbaumTeamTotal('T2')
  };

  const openT1 = getTannenbaumOpenNumbersTotal('T1');
  const openT2 = getTannenbaumOpenNumbersTotal('T2');

  teamTotals.T1 += openT1.total;
  teamTotals.T2 += openT2.total;

  const membersT1 = persons.filter(p => p.present && !p.left && p.tisch === 'T1');
  const membersT2 = persons.filter(p => p.present && !p.left && p.tisch === 'T2');

  const historyEntry = {
    id: 'tannenbaum_' + Date.now(),
    type: 'tannenbaum',
    createdAt: new Date().toISOString(),
    totals: {
      T1: teamTotals.T1,
      T2: teamTotals.T2
    },
    openNumbers: {
      T1: openT1.details,
      T2: openT2.details
    },
    strikes: {
      T1: JSON.parse(JSON.stringify(tannenbaumState.teams.T1.strikes || [])),
      T2: JSON.parse(JSON.stringify(tannenbaumState.teams.T2.strikes || []))
    },
    bonus: {
      T1: tannenbaumState.teams.T1.bonus || 0,
      T2: tannenbaumState.teams.T2.bonus || 0
    },
    assignedTo: []
  };

  membersT1.forEach(p => {
    if (!Array.isArray(p.tannenbaumCharges)) p.tannenbaumCharges = [];

    p.tannenbaumCharges.push({
      id: historyEntry.id,
      amount: teamTotals.T1,
      reason: 'Tannenbaum',
        onTop: !!tannenbaumOnTop,
      createdAt: historyEntry.createdAt
    });

    historyEntry.assignedTo.push({
      name: p.name,
      team: 'T1',
      amount: teamTotals.T1
    });
  });

  membersT2.forEach(p => {
    if (!Array.isArray(p.tannenbaumCharges)) p.tannenbaumCharges = [];

    p.tannenbaumCharges.push({
      id: historyEntry.id,
      amount: teamTotals.T2,
      reason: 'Tannenbaum',
        onTop: !!tannenbaumOnTop,
      createdAt: historyEntry.createdAt
    });

    historyEntry.assignedTo.push({
      name: p.name,
      team: 'T2',
      amount: teamTotals.T2
    });
  });

  if (!Array.isArray(strafenHistory)) strafenHistory = [];
  strafenHistory.unshift(historyEntry);

  tannenbaumState = createTannenbaumState();

  renderAll();
  persistState();

  showToast('🌲 Tannenbaum abgeschlossen und zugeordnet', 'success');
}

    
function resetTannenbaumGame() {
  if (!confirm('Tannenbaum wirklich zurücksetzen?')) return;

  tannenbaumState = createTannenbaumState();

  renderTannenbaum();
  persistState();

  showToast('↻ Tannenbaum zurückgesetzt', 'success');
}


function handleTannenbaumThrow(number) {
  ensureTannenbaumState();

  const team = tannenbaumThrowTeam;
  if (!team) return;

  const otherTeam = getOtherTeam(team);
  const own = tannenbaumState.teams[team];
  const other = tannenbaumState.teams[otherTeam];

  const n = String(number);
  let action = '';

  if ((own.remaining[n] || 0) > 0) {
    own.remaining[n] -= 1;
    action = `${getTeamLabel(team)} streicht ${number}`;
  } else if ((other.remaining[n] || 0) > 0) {
    const amount = number * 0.10;

    other.strikes.push({
      number,
      amount,
      causedBy: team,
      createdAt: new Date().toISOString()
    });

    action = `${getTeamLabel(otherTeam)} bekommt Strich: +${amount.toFixed(2).replace('.', ',')} €`;
    } else {
      if (tannenbaumHardRule) {
        own.remaining[n] = (own.remaining[n] || 0) + 1;
        action = `${getTeamLabel(team)} bekommt ${number} wieder zurück`;
      } else {
        action = `${number} ist bei beiden Teams weg. Keine Änderung.`;
      }
    }

  if (isTannenbaumTeamEmpty(team) && !own.finished) {
    own.finished = true;
    other.bonus = (other.bonus || 0) + 5;
    action += ` · ${getTeamLabel(team)} ist leer! ${getTeamLabel(otherTeam)} +5,00 €`;
  }

    tannenbaumState.history.unshift({
      team,
      number,
      action,
      type:
        (own.remaining[n] || 0) >= 0
          ? (
              action.includes('streicht')
                ? 'strike-own'
                : action.includes('bekommt Strich')
                  ? 'enemy-strike'
                  : 'restore'
            )
          : 'unknown',
      createdAt: new Date().toISOString()
    });

      closeTannenbaumThrowModal();
      renderTannenbaum();
      persistState();
      showToast(action, 'success');
    }

function undoLastTannenbaumThrow() {
  ensureTannenbaumState();

  const last = tannenbaumState.history?.[0];

  if (!last) {
    showToast('Keine Würfe vorhanden', 'error');
    return;
  }

  const team = last.team;
  const otherTeam = getOtherTeam(team);
  const n = String(last.number);

  const own = tannenbaumState.teams[team];
  const other = tannenbaumState.teams[otherTeam];

  if (last.action.includes('streicht')) {
    own.remaining[n]++;
  }

  else if (last.action.includes('bekommt Strich')) {
    const strikeIndex =
      other.strikes.findIndex(
        s => String(s.number) === n
      );

    if (strikeIndex >= 0) {
      other.strikes.splice(strikeIndex, 1);
    }
  }

  tannenbaumState.history.shift();

  renderTannenbaum();
  persistState();

  showToast('↩ Letzter Wurf rückgängig', 'success');
}

function getOtherTeam(team) {
  return team === 'T1' ? 'T2' : 'T1';
}

function isTannenbaumTeamEmpty(team) {
  ensureTannenbaumState();
  return Object.keys(TANNENBAUM_BASE).every(n => {
    return (tannenbaumState.teams[team].remaining[n] || 0) <= 0;
  });
}

function getTannenbaumTeamTotal(team) {
  ensureTannenbaumState();

  const data = tannenbaumState.teams[team];

  const strikesTotal = data.strikes.reduce((sum, s) => {
    return sum + (parseFloat(s.amount || 0) || 0);
  }, 0);

  return strikesTotal + (data.bonus || 0);
}

function bookTannenbaumTeamCharge(team, total) {
  if (total <= 0) return;

  const members = persons.filter(p =>
    p.present &&
    !p.left &&
    p.tisch === team
  );

  if (!members.length) return;

  const amountPerPerson = total / members.length;

  members.forEach(p => {
    if (!Array.isArray(p.tannenbaumCharges)) p.tannenbaumCharges = [];

    p.tannenbaumCharges.push({
      reason: 'Tannenbaum',
      team,
      amount: amountPerPerson,
      total,
      members: members.map(m => m.name),
      createdAt: new Date().toISOString()
    });
  });
}

function getTannenbaumOpenNumbersTotal(team) {
  ensureTannenbaumState();

  const data = tannenbaumState.teams[team];
  let total = 0;
  const details = [];

  Object.keys(TANNENBAUM_BASE).forEach(n => {
    const openCount = parseInt(data.remaining[n] || 0, 10) || 0;
    if (openCount <= 0) return;

    const amount = Number(n) * 0.10 * openCount;
    total += amount;

    details.push({
      number: Number(n),
      count: openCount,
      amount
    });
  });

  return { total, details };
}

function getPersonTannenbaumTotal(p) {
  return (p.tannenbaumCharges || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount || 0) || 0);
  }, 0);
}

function renderTannenbaumNumberCells(team, number, sideClass) {
  const data = tannenbaumState.teams[team];
  const baseCount = TANNENBAUM_BASE[number];
  const remaining = data.remaining[number] || 0;

  const teamIsEmpty = isTannenbaumTeamEmpty(team);

  if (teamIsEmpty) {
    return `
      <div class="tannenbaum-side ${sideClass} winner-side">
        ${
          Number(number) === 5
            ? `
              <div class="tannenbaum-winner-mark">
                <div class="tannenbaum-winner-emoji">🏆</div>
                <div class="tannenbaum-winner-team">
                  ${getTannenbaumTeamDisplay(team)}
                </div>
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  const visibleCount = Math.max(baseCount, remaining);
  const cells = [];

  for (let i = 0; i < visibleCount; i++) {
    const crossed = team === 'T1'
      ? i < (visibleCount - remaining)
      : i >= remaining;

    cells.push(`
      <span class="tannenbaum-number ${crossed ? 'crossed' : ''}">
        ${number}
      </span>
    `);
  }

  return `
    <div class="tannenbaum-side ${sideClass}">
      ${cells.join('')}
    </div>
  `;
}

function renderTannenbaumStrikeMarks(team, number) {
  const data = tannenbaumState.teams[team];
  const strikes = data.strikes.filter(s => String(s.number) === String(number));

  if (!strikes.length) {
    return '<span class="tannenbaum-zero">0</span>';
  }

  let html = '';
  strikes.forEach((_, index) => {
    html += '|';
    if ((index + 1) % 5 === 0) html += ' ';
  });

  return html;
}

function renderTannenbaumPriceTable() {
  return `
    <div class="tannenbaum-price-grid">
      ${renderTannenbaumPriceCard('T1')}
      ${renderTannenbaumPriceCard('T2')}
    </div>
  `;
}

function renderTannenbaumPriceCard(team) {
  const data = tannenbaumState.teams[team];
  const grouped = {};

  data.strikes.forEach(s => {
    const n = String(s.number);
    if (!grouped[n]) grouped[n] = { count: 0, total: 0 };

    grouped[n].count += 1;
    grouped[n].total += parseFloat(s.amount || 0) || 0;
  });

  const rows = Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .map(n => `
      <tr>
        <td>${grouped[n].count}×</td>
        <td>Strich auf ${n}</td>
        <td>${euros(grouped[n].total)}</td>
      </tr>
    `).join('');

  const bonus = data.bonus || 0;
  const total = getTannenbaumTeamTotal(team);

  return `
    <div class="tannenbaum-price-card ${team === 'T1' ? 'wand' : 'tv'}">
      <div class="tannenbaum-price-title">${getTeamLabel(team)}</div>

      <table>
        <thead>
          <tr>
            <th>Anzahl</th>
            <th>Grund</th>
            <th>Betrag</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `
            <tr>
              <td colspan="3">Noch keine Striche</td>
            </tr>
          `}
          ${bonus > 0 ? `
            <tr>
              <td>1×</td>
              <td>Leer-Bonus Gegner</td>
              <td>${euros(bonus)}</td>
            </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Gesamt</td>
            <td>${euros(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderTannenbaumSettings() {
  const grid = document.getElementById('tannenbaum-settings-grid');
  const hardCheck = document.getElementById('tannenbaum-hard-rule-check');
  const onTopCheck = document.getElementById('tannenbaum-ontop-check');

  if (!grid) return;

  grid.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const card = document.createElement('div');
    card.className = 'tannenbaum-setting-card';
    card.innerHTML = `
      <label>Zahl ${n}</label>
      <input
        type="number"
        min="0"
        step="1"
        id="tannenbaum-count-${n}"
        value="${TANNENBAUM_BASE[n] || 0}"
        onchange="saveTannenbaumSettings()"
      >
    `;
    grid.appendChild(card);
  }

  if (hardCheck) hardCheck.checked = !!tannenbaumHardRule;
  if (onTopCheck) onTopCheck.checked = !!tannenbaumOnTop;
}

function saveTannenbaumSettings() {
  for (let n = 1; n <= 9; n++) {
    const input = document.getElementById('tannenbaum-count-' + n);
    if (input) {
      TANNENBAUM_BASE[n] = Math.max(0, parseInt(input.value || '0', 10) || 0);
    }
  }
    
const onTopCheck = document.getElementById('tannenbaum-ontop-check');
tannenbaumOnTop = !!onTopCheck?.checked;

  const hardCheck = document.getElementById('tannenbaum-hard-rule-check');
  tannenbaumHardRule = !!hardCheck?.checked;

  tannenbaumState = createTannenbaumState();

  renderAll();
  persistState();

  showToast('🌲 Tannenbaum-Einstellungen gespeichert', 'success');
}

function resetTannenbaumSettings() {
  if (!confirm('Tannenbaum-Einstellungen auf Standard zurücksetzen? Das aktuelle Tannenbaum-Spiel wird neu gestartet.')) return;

  TANNENBAUM_BASE = { ...TANNENBAUM_DEFAULT_BASE };
  tannenbaumHardRule = true;
  tannenbaumState = createTannenbaumState();

  renderAll();
  persistState();

  showToast('↻ Tannenbaum-Standardwerte wiederhergestellt', 'success');
}
