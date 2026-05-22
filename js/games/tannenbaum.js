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