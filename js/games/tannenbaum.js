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

  if (title) title.textContent = `Wurf für ${getTeamLabel(team)}`;
  if (!grid) return;

  grid.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'tannenbaum-number-btn';
    btn.textContent = n;
    btn.onclick = () => handleTannenbaumThrow(n);
    grid.appendChild(btn);
  }

  document.getElementById('tannenbaum-throw-modal').classList.remove('hidden');
}

function closeTannenbaumThrowModal() {
  document.getElementById('tannenbaum-throw-modal').classList.add('hidden');
  tannenbaumThrowTeam = null;
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
            <th>Striche Wand</th>
            <th class="wand">⚫ Wand</th>
            <th>Zahl</th>
            <th class="tv">🔴 TV</th>
            <th>Striche TV</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="tannenbaum-price-wrap">
      ${renderTannenbaumPriceTable()}
    </div>
  `;
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
    createdAt: new Date().toISOString()
  });

  closeTannenbaumThrowModal();
  renderTannenbaum();
  persistState();
  showToast(action, 'success');
}

function getOtherTeam(team) {
  return team === 'T1' ? 'T2' : 'T1';
}

function getTeamLabel(team) {
  return team === 'T1' ? '⚫ Wand' : '🔴 TV';
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

  if (hardCheck) {
    hardCheck.checked = !!tannenbaumHardRule;
  }
}

function saveTannenbaumSettings() {
  for (let n = 1; n <= 9; n++) {
    const input = document.getElementById('tannenbaum-count-' + n);
    if (input) {
      TANNENBAUM_BASE[n] = Math.max(0, parseInt(input.value || '0', 10) || 0);
    }
  }

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
