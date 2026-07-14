function playSound(sound) {
  if (!sound) return;
  const s = sound.cloneNode();
  s.volume = 0.5;
  s.play().catch(() => {});
}
	
// ── AUTH / START ──
async function startApp() {
  loadClubSystem();
  setupClubAvatarUpload();

  renderClubList();
  updateVersionInfo();

  const clubsLoaded = await loadClubListFromFirestore();

  document.getElementById('loading-screen').style.display = 'none';

  appReady = true;

  if (ACTIVE_CLUB && CLUBS[ACTIVE_CLUB]) {
    document.getElementById('club-start-screen').classList.add('hidden');
    document.getElementById('app').style.display = 'block';

    await selectClub(ACTIVE_CLUB);
  } else {
    document.getElementById('club-start-screen').classList.remove('hidden');
    document.getElementById('app').style.display = 'none';
  }

  if (!navigator.onLine) {
    showToast('📴 Offline-Modus aktiv. Änderungen werden lokal gespeichert.', 'success');
    return;
  }

  if (clubsLoaded) {
    showToast('☁️ Clubs aus Firestore geladen', 'success');
  }

	 // document.body.classList.add('view-only');
}

// ── LOCAL STORAGE ──
function getSerializableState() {
  return {
    persons,
      groupSettings,
    spiele,
    DRINKS,
    prices,
    SPIELE_KATALOG,
    RUNDEN_GRUENDE,
    selectedLoser,
    teamDrinks,
    bahnPreisProStunde,
    tannenbaumState,
    TANNENBAUM_BASE,
    tannenbaumHardRule,
    dartsState,
      kegelAbende,
      lotterieState,
    tiberiusState,
    lotterieSettings,
    tiberiusSettings,
      strafenHistory,
    bahnTimerStart,
    bahnTimerRunning,
    teamStopwatchActive,
    teamStopwatchRunning,
    teamStopwatchStart,
    teamCountdownDuration,
    teamCountdownRemainingBefore,
      timePenaltySettings,
      penaltyStatsLog,
      STRAFEN,
      STRAFEN_LIMIT,
    strafPrices,
      wurfSettings,
    lastLocalChangeAt
  };
}
    
const FIRESTORE_EVENT_DOC_ID = 'current';

function getTodayMeta() {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: 'open'
  };
}

function getFirestoreState() {
  recalcTeamExtras();

  return {
    ...getTodayMeta(),
    persons,
    spiele,
    DRINKS,
      groupSettings,
    prices,
    SPIELE_KATALOG,
    RUNDEN_GRUENDE,
    selectedLoser,
    teamDrinks,
    bahnPreisProStunde,
    bahnTimerStart,
    bahnTimerRunning,
      timePenaltySettings,
      penaltyStatsLog,
      kegelAbende,
    teamStopwatchActive,
    teamStopwatchRunning,
    teamStopwatchStart,
    teamCountdownDuration,
    teamCountdownRemainingBefore,

    tannenbaumState,
      TANNENBAUM_BASE,
      tannenbaumHardRule,
      dartsState,
      lotterieState,
        tiberiusState,
        lotterieSettings,
        tiberiusSettings,
      STRAFEN,
      STRAFEN_LIMIT,
      strafPrices,
      strafenHistory,
      wurfSettings,

    updatedFrom: 'app',
    updatedClientAt: lastLocalChangeAt,
    updatedClientId: CLIENT_ID
  };
}

function applyLoadedState(state) {
  if (!state) return false;

  persons = Array.isArray(state.persons) ? state.persons : [];
  spiele = Array.isArray(state.spiele) ? state.spiele : [];
  DRINKS = Array.isArray(state.DRINKS) && state.DRINKS.length ? state.DRINKS : DRINKS;
  prices = state.prices || {};
  SPIELE_KATALOG = Array.isArray(state.SPIELE_KATALOG) && state.SPIELE_KATALOG.length ? state.SPIELE_KATALOG : SPIELE_KATALOG;
  RUNDEN_GRUENDE = Array.isArray(state.RUNDEN_GRUENDE) && state.RUNDEN_GRUENDE.length ? state.RUNDEN_GRUENDE : RUNDEN_GRUENDE;
  selectedLoser = state.selectedLoser || null;
  teamDrinks = state.teamDrinks || {};
    STRAFEN_LIMIT = parseFloat(state.STRAFEN_LIMIT || 30) || 30;
  bahnPreisProStunde = parseFloat(state.bahnPreisProStunde || 0) || 0;
  bahnTimerStart = state.bahnTimerStart || null;
  bahnTimerRunning = !!state.bahnTimerRunning;
    dartsState = state.dartsState || createDartsState();
    ensureDartsState();
    
    lotterieState = state.lotterieState || createLotterieState();
    tiberiusState = state.tiberiusState || createTiberiusState();

    lotterieSettings = state.lotterieSettings || {
      minAmount: 0.10,
      maxAmount: 10.00
    };
    
    timePenaltySettings = state.timePenaltySettings || {
      startTime: '20:00',
      endTime: '23:00'
    };
    
        groupSettings = state.groupSettings || {
          T1: { name: 'Wand', color: 'black' },
          T2: { name: 'TV', color: 'red' }
        };

        if (!groupSettings.T1) groupSettings.T1 = { name: 'Wand', color: 'black' };
        if (!groupSettings.T2) groupSettings.T2 = { name: 'TV', color: 'red' };

        groupSettings.T1.color = normalizeGroupColorKey(groupSettings.T1.color, 'black');
        groupSettings.T2.color = normalizeGroupColorKey(groupSettings.T2.color, 'red');
    
    tiberiusSettings = state.tiberiusSettings || {
      minPins: 10,
      maxPins: 300
    };
    
    wurfSettings = state.wurfSettings || {
      maxBuys: 3
    };
    
    penaltyStatsLog = Array.isArray(state.penaltyStatsLog)
      ? state.penaltyStatsLog
      : [];

    ensureLotterieState();
    ensureTiberiusState();

  teamStopwatchActive = !!state.teamStopwatchActive;
  teamStopwatchRunning = !!state.teamStopwatchRunning;
  teamStopwatchStart = state.teamStopwatchStart || null;
  teamCountdownDuration = parseInt(state.teamCountdownDuration || 0, 10) || 0;
  teamCountdownRemainingBefore = parseInt(state.teamCountdownRemainingBefore || 0, 10) || 0;    
  strafenHistory = Array.isArray(state.strafenHistory) ? state.strafenHistory : [];
    
    STRAFEN = Array.isArray(state.STRAFEN) && state.STRAFEN.length ? state.STRAFEN : STRAFEN;
    strafPrices = state.strafPrices || {};
    
    TANNENBAUM_BASE = state.TANNENBAUM_BASE || { ...TANNENBAUM_DEFAULT_BASE };
    tannenbaumHardRule = state.tannenbaumHardRule !== undefined ? !!state.tannenbaumHardRule : true;
    
  tannenbaumState = state.tannenbaumState || createTannenbaumState();
  ensureTannenbaumState();
    
    kegelAbende = Array.isArray(state.kegelAbende)
  ? state.kegelAbende
  : [];
    
  if (state.updatedClientAt) {
    lastRemoteChangeAt = Number(state.updatedClientAt || 0);
  }
    
  hydrateState();
  return true;
}

function archiveCurrentKegelabendForStats() {
  const today = new Date().toISOString().slice(0, 10);

  if (!Array.isArray(kegelAbende)) kegelAbende = [];

  const attendees = persons
    .filter(p => p.present && !p.isGuest)
    .map(p => p.name);

  if (!attendees.length) return;

  const existing = kegelAbende.find(x => x.date === today);

  if (existing) {
    existing.attendees = attendees;
    existing.updatedAt = new Date().toISOString();
    return;
  }

  kegelAbende.unshift({
    id: 'abend_' + today,
    date: today,
    club: ACTIVE_CLUB || '',
    attendees,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function loadFromFirestore() {
  if (!window.firestoreApi || !ACTIVE_CLUB) return false;

  try {
    const clubId = getClubFirestoreId(ACTIVE_CLUB);
    const state = await window.firestoreApi.loadClubState(clubId);
    if (!state) return false;

    applyLoadedState(state);
    console.log('Firestore geladen:', ACTIVE_CLUB, state);
    return true;
  } catch (e) {
    console.error('Fehler beim Laden aus Firestore:', e);
    return false;
  }
}

async function saveToFirestore(showSuccessToast = false) {
  if (!window.firestoreApi || !ACTIVE_CLUB) return false;

  try {
    const clubId = getClubFirestoreId(ACTIVE_CLUB);
    await window.firestoreApi.saveClubState(clubId, getFirestoreState());

    if (showSuccessToast) {
      showToast(`☁️ ${ACTIVE_CLUB} gespeichert`, 'success');
    }

    return true;
  } catch (e) {
    console.error('Fehler beim Speichern in Firestore:', e);

    if (showSuccessToast) {
      showToast('❌ Firestore-Speichern fehlgeschlagen', 'error');
    }

    return false;
  }
}

async function manualSaveAll() {
  saveClubSystem();
  await saveToFirestore(true);
}
    
function renderBoughtThrowsDots(person) {
  const max = Math.max(0, parseInt(wurfSettings.maxBuys || 3, 10) || 3);
  const used = Math.max(0, parseInt(person.boughtThrows || 0, 10) || 0);

  let html = '<div class="wurf-dots">';

  for (let i = 0; i < max; i++) {
    html += `<span class="wurf-dot ${i < used ? 'used' : 'free'}"></span>`;
  }

  html += '</div>';
  return html;
}
    
function hydrateState() {
  DRINKS.forEach(d => {
    if (prices[d.key] === undefined) prices[d.key] = 0;
  });

  persons.forEach(p => {
    if (!p.drinks) p.drinks = {};
    if (!Array.isArray(p.rounds)) p.rounds = [];
    (p.rounds || []).forEach(r => {
      if (!r.reason) r.reason = '';
    });
    if (p.roundExtra === undefined) p.roundExtra = 0;

    DRINKS.forEach(d => {
      if (p.drinks[d.key] === undefined) p.drinks[d.key] = 0;
        if (!p.strafen) p.strafen = {};
    });
          
    STRAFEN.forEach(s => {
      if (p.strafen[s.key] === undefined) p.strafen[s.key] = 0;
    });
    if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];
    if (!Array.isArray(p.tannenbaumCharges)) p.tannenbaumCharges = [];
    p.present = !!p.present;
    p.isGuest = !!p.isGuest;
    p.tisch = normalizeTisch(p.tisch);
    p.teamExtra = parseFloat(p.teamExtra || 0) || 0;
    p.roundExtra = parseFloat(p.roundExtra || 0) || 0;
    p.paid = parseFloat(p.paid || 0) || 0;
    p.left = !!p.left;
    p.leftAt = p.leftAt || '';
      p.arrivalTime = p.arrivalTime || '';
      p.leftEarlyAt = p.leftEarlyAt || '';
      p.boughtThrows = parseInt(p.boughtThrows || 0, 10) || 0;
  });
    STRAFEN.forEach(s => {
      if (strafPrices[s.key] === undefined) strafPrices[s.key] = 0;
    });
}

function persistState() {
  if (!appReady || !ACTIVE_CLUB || isApplyingRemoteState) return;

  lastLocalChangeAt = Date.now();

  syncCurrentClubToStore();
  saveClubSystem();

  if (navigator.onLine) {
    queueAutoSave();
  }
}
    
function getKranzStrafeKey() {
  const found = STRAFEN.find(s =>
    String(s.label || '').toLowerCase().includes('9er') ||
    String(s.label || '').toLowerCase().includes('kranz')
  );

  return found ? found.key : null;
}

function openKranzModal() {
  const key = getKranzStrafeKey();

  if (!key) {
    showToast('Bitte zuerst eine Strafe "9er/Kranz" anlegen', 'error');
    return;
  }

  const list = document.getElementById('kranz-person-list');
  list.innerHTML = '';

  const presentPeople = persons
    .filter(p => p.present && !p.left)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (!presentPeople.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Niemand anwesend</div>';
    return;
  }

  presentPeople.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'team-btn';
    btn.textContent = p.name;
    btn.onclick = () => confirmKranzThrow(p.name);
    list.appendChild(btn);
  });

  document.getElementById('kranz-modal').classList.remove('hidden');
}

function closeKranzModal() {
  document.getElementById('kranz-modal').classList.add('hidden');
}

function confirmKranzThrow(winnerName) {
  const key = getKranzStrafeKey();

  if (!key) {
    showToast('Strafe 9er/Kranz nicht gefunden', 'error');
    return;
  }

  persons.forEach(p => {
    if (!p.present || p.left) return;
    if (p.name === winnerName) return;

    if (!p.strafen) p.strafen = {};
    p.strafen[key] = (p.strafen[key] || 0) + 1;
  });

  closeKranzModal();
  renderAll();
  persistState();

  showToast(`🎯 ${winnerName} bekommt nichts, alle anderen +1`, 'success');
}
    
function openFreeStrafeModal() {
  const select = document.getElementById('free-strafe-person-select');
  const reason = document.getElementById('free-strafe-reason');
  const amount = document.getElementById('free-strafe-amount');

  if (!select) return;

  const presentPeople = persons
    .filter(p => p.present && !p.left)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  select.innerHTML = '<option value="">Bitte Person wählen</option>';

  presentPeople.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  if (reason) reason.value = '';
  if (amount) amount.value = '';

  document.getElementById('free-strafe-modal').classList.remove('hidden');
}

function closeFreeStrafeModal() {
  document.getElementById('free-strafe-modal').classList.add('hidden');
}

function confirmFreeStrafe() {
  const personName = document.getElementById('free-strafe-person-select')?.value || '';
const reason = (document.getElementById('free-strafe-reason')?.value || '').trim();
const amount = parseFloat(String(document.getElementById('free-strafe-amount')?.value || '0').replace(',', '.')) || 0;
  const onTop = !!document.getElementById('free-strafe-ontop-check')?.checked;

  if (!personName) {
    showToast('Bitte Person auswählen', 'error');
    return;
  }

  if (!reason) {
    showToast('Bitte Grund eingeben', 'error');
    return;
  }

  if (amount <= 0) {
    showToast('Bitte Betrag eingeben', 'error');
    return;
  }

  const p = persons.find(x => x.name === personName);
  if (!p) {
    showToast('Person nicht gefunden', 'error');
    return;
  }

  const id = 'free_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];
  if (!Array.isArray(strafenHistory)) strafenHistory = [];

  const entry = {
    id,
    type: 'free',
    person: personName,
    reason,
    amount,
    onTop,
    createdAt: new Date().toISOString()
  };

  p.freeStrafen.push({
    id,
    reason,
    amount,
    onTop,
    createdAt: entry.createdAt
  });

  strafenHistory.unshift(entry);

  closeFreeStrafeModal();
  renderAll();
  persistState();

  showToast('💸 Freier Betrag gebucht', 'success');
}

function addPenaltyStatsEntry(type, throwerName, punishedNames) {
  if (!Array.isArray(penaltyStatsLog)) penaltyStatsLog = [];

  const now = new Date();

  penaltyStatsLog.unshift({
    id: 'penalty_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    type,
    thrower: throwerName,
    punished: punishedNames || [],
    club: ACTIVE_CLUB || '',
    createdAt: now.toISOString(),
    eventDate: now.toISOString().slice(0, 10)
  });
}
    
function deleteFreeStrafe(personName, freeId) {
  const p = persons.find(x => x.name === personName);
  if (!p || !Array.isArray(p.freeStrafen)) return;

  const item = p.freeStrafen.find(x => x.id === freeId);
  if (!item) return;

  if (!confirm(`Freien Betrag "${item.reason || 'Ohne Grund'}" wirklich löschen?`)) return;

  p.freeStrafen = p.freeStrafen.filter(x => x.id !== freeId);

  renderAll();
  persistState();

  showToast('🗑️ Freier Betrag gelöscht', 'success');
}

function makeStrafeKey(label) {
  const key = label.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return key || ('strafe_' + Date.now());
}

function calcFreeStrafenTotal(p) {
  return (p.freeStrafen || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount || 0) || 0);
  }, 0);
}

function calcTannenbaumChargesTotal(p) {
  return (p.tannenbaumCharges || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount || 0) || 0);
  }, 0);
}

function calcStrafenTotal(p) {
  if (!p.strafen) p.strafen = {};

  const normalTotal = STRAFEN.reduce((sum, s) => {
    return sum + ((p.strafen[s.key] || 0) * (strafPrices[s.key] || 0));
  }, 0);

  return normalTotal + calcFreeStrafenTotal(p) + calcTannenbaumChargesTotal(p);
}

async function changeStrafe(personName, key, delta) {
  await changeSyncedPersonCounter(
    personName,
    'strafen',
    key,
    delta
  );
}

function renderStrafen() {
  const header = document.getElementById('strafen-header');
  const body = document.getElementById('strafen-body');
  if (!header || !body) return;

  const visibleStrafen = getVisibleStrafen();

  const present = persons
    .filter(p => p.present)
    .sort((a, b) => {
      if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
      return a.name.localeCompare(b.name, 'de');
    });

  const hasExtraPenaltyColumn = present.some(p => getPersonPenaltyExtraLines(p).length > 0);

  let headerHtml = '<th class="sticky-col name-col">Name</th>';
  headerHtml += visibleStrafen.map(s => `<th class="drink-col">${s.label}</th>`).join('');
  headerHtml += '<th class="drink-col">Freie Beträge</th>';

  if (hasExtraPenaltyColumn) {
    headerHtml += '<th class="drink-col">Extras</th>';
  }

  headerHtml += '<th class="sum-col">Gesamt</th>';
  header.innerHTML = headerHtml;

  const totalCols = 1 + visibleStrafen.length + 2 + (hasExtraPenaltyColumn ? 1 : 0);
  body.innerHTML = '';

  if (!present.length) {
    body.innerHTML = `
      <tr>
        <td colspan="${totalCols}" style="text-align:center;padding:24px;color:var(--muted)">
          Niemand anwesend
        </td>
      </tr>
    `;
    return;
  }

  present.forEach((p, rowIndex) => {
    if (!p.strafen) p.strafen = {};
    if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];
    if (!Array.isArray(p.tannenbaumCharges)) p.tannenbaumCharges = [];

    const tr = document.createElement('tr');
    tr.className = rowIndex % 2 === 1 ? 'alt-row' : '';

    const manualFree = p.freeStrafen.filter(item => {
      const reason = String(item.reason || '');
      return reason !== 'Lotterie' && reason !== 'Tiberius';
    });

    const freeNormalTotal = manualFree
      .filter(item => !item.onTop)
      .reduce((sum, item) => sum + (parseFloat(item.amount || 0) || 0), 0);

    const freeOnTopTotal = manualFree
      .filter(item => item.onTop)
      .reduce((sum, item) => sum + (parseFloat(item.amount || 0) || 0), 0);

    const freeDetails = manualFree
      .map(item => `${item.reason || 'Ohne Grund'}: +${euros(item.amount)}${item.onTop ? ' 🔥' : ''}`)
      .join('<br>');

    const freeDisplayTotal = freeNormalTotal + freeOnTopTotal;
    const extraLines = getPersonPenaltyExtraLines(p);

    let html = `
      <td class="sticky-col">
        <div class="person-cell">
          <div class="table-person-inline">
            <div class="gosse-king-wrap ${isGosseKing(p.name) ? 'is-king' : ''}">
              ${getAvatarHtml(p.name).replace('class="person-avatar"', 'class="table-avatar"')}
            </div>

            <div style="min-width:0;">
              <span class="pname">${p.name}</span>
              ${p.isGuest ? '<span class="prole">Gastkegler</span>' : ''}
              <span class="ptisch">
                ${p.tisch ? getGroupLabel(p.tisch) : 'Kein Team'}
              </span>
              ${renderBoughtThrowsDots(p)}
            </div>
          </div>
        </div>
      </td>
    `;

    visibleStrafen.forEach(s => {
      const v = p.strafen[s.key] || 0;

      html += `
        <td>
          <div class="counter">
            <button
              type="button"
              class="counter-btn minus"
              onclick="changeStrafe('${escapeForJs(p.name)}','${escapeForJs(s.key)}',-1)"
            >−</button>

            <span class="counter-val">${v}</span>

            <button
              type="button"
              class="counter-btn plus"
              onclick="changeStrafe('${escapeForJs(p.name)}','${escapeForJs(s.key)}',1)"
            >+</button>
          </div>
        </td>
      `;
    });

    html += `
      <td class="total-cell">
        ${
          freeDisplayTotal > 0
            ? `
              +${euros(freeDisplayTotal)}
              <div style="font-family:'DM Sans';font-size:0.58rem;color:var(--muted);line-height:1.25;margin-top:3px;">
                ${freeDetails}
              </div>
            `
            : '—'
        }
      </td>
    `;

    if (hasExtraPenaltyColumn) {
      html += `
        <td class="total-cell strafen-extra-cell">
          ${
            extraLines.length
              ? `
                <div class="strafen-extra-lines">
                  ${extraLines.join('<br>')}
                </div>
              `
              : '—'
          }
        </td>
      `;
    }

    html += `
      <td class="total-cell">
        ${euros(calcPersonStrafenTotalCapped(p))}
      </td>
    `;

    tr.innerHTML = html;
    body.appendChild(tr);
  });
}
    
function openArrivalModal(person) {
  arrivalEditPerson = person;

  const sub = document.getElementById('arrival-modal-sub');
  const nowCheck = document.getElementById('arrival-now-check');
  const timeInput = document.getElementById('arrival-time-input');

  if (sub) sub.textContent = `${person.name} ist angekommen.`;
  if (nowCheck) nowCheck.checked = true;
  if (timeInput) timeInput.value = getNowTimeString();

  toggleArrivalTimeInput();

  document.getElementById('arrival-modal')?.classList.remove('hidden');
}

function closeArrivalModal() {
  document.getElementById('arrival-modal')?.classList.add('hidden');
  arrivalEditPerson = null;
}

function toggleArrivalTimeInput() {
  const nowCheck = document.getElementById('arrival-now-check');
  const row = document.getElementById('arrival-time-row');

  if (row) {
    row.style.display = nowCheck?.checked ? 'none' : 'block';
  }
}

function confirmArrivalTime() {
  if (!arrivalEditPerson) return;

  const nowCheck = document.getElementById('arrival-now-check');
  const timeInput = document.getElementById('arrival-time-input');

  arrivalEditPerson.arrivalTime = nowCheck?.checked
    ? getNowTimeString()
    : (timeInput?.value || getNowTimeString());

  closeArrivalModal();
  renderAll();
  persistState();

  showToast(`✅ Ankunftszeit gespeichert: ${arrivalEditPerson.arrivalTime}`, 'success');
}

function openLeftEarlyModal(person) {
  leftEarlyEditPerson = person;

  const sub = document.getElementById('left-early-modal-sub');
  const nowCheck = document.getElementById('left-early-now-check');
  const timeInput = document.getElementById('left-early-time-input');

  if (sub) sub.textContent = `${person.name} geht.`;
  if (nowCheck) nowCheck.checked = true;
  if (timeInput) timeInput.value = getNowTimeString();

  toggleLeftEarlyTimeInput();

  document.getElementById('left-early-modal')?.classList.remove('hidden');
}

function closeLeftEarlyModal() {
  document.getElementById('left-early-modal')?.classList.add('hidden');
  leftEarlyEditPerson = null;
}

function toggleLeftEarlyTimeInput() {
  const nowCheck = document.getElementById('left-early-now-check');
  const row = document.getElementById('left-early-time-row');

  if (row) {
    row.style.display = nowCheck?.checked ? 'none' : 'block';
  }
}

function confirmLeftEarlyTime() {
  if (!leftEarlyEditPerson) return;

  const nowCheck = document.getElementById('left-early-now-check');
  const timeInput = document.getElementById('left-early-time-input');

  leftEarlyEditPerson.leftEarlyAt = nowCheck?.checked
    ? getNowTimeString()
    : (timeInput?.value || getNowTimeString());

  leftEarlyEditPerson.left = true;
  leftEarlyEditPerson.leftAt = new Date().toISOString();

  closeLeftEarlyModal();
  renderAll();
  persistState();

  showToast(`✅ Gehzeit gespeichert: ${leftEarlyEditPerson.leftEarlyAt}`, 'success');
}

function renderStrafenHistory() {
  const el = document.getElementById('strafen-history-list');
  if (!el) return;

  if (!Array.isArray(strafenHistory) || !strafenHistory.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:20px">Noch keine Straf-Historie vorhanden</div>';
    return;
  }

  el.innerHTML = strafenHistory.map(entry => {
    if (entry.type === 'tannenbaum') {
      const assigned = (entry.assignedTo || [])
        .map(x => `${x.name} (${x.team === 'T1' ? 'Wand' : 'TV'}): ${euros(x.amount)}`)
        .join('<br>');

      const openT1 = (entry.openNumbers?.T1 || [])
        .map(x => `${x.count}× ${x.number} = ${euros(x.amount)}`)
        .join('<br>') || '—';

      const openT2 = (entry.openNumbers?.T2 || [])
        .map(x => `${x.count}× ${x.number} = ${euros(x.amount)}`)
        .join('<br>') || '—';

      return `
        <div class="spiel-card">
          <div class="spiel-info">
            <div class="spiel-verlierer round">🌲 Tannenbaum abgeschlossen</div>
            <div class="spiel-detail">${entry.createdAt ? formatDateTime(entry.createdAt) : ''}</div>
            <div class="spiel-detail"><strong>Wand:</strong> ${euros(entry.totals?.T1 || 0)}</div>
            <div class="spiel-detail"><strong>TV:</strong> ${euros(entry.totals?.T2 || 0)}</div>
            <div class="spiel-detail"><strong>Offene Zahlen Wand:</strong><br>${openT1}</div>
            <div class="spiel-detail"><strong>Offene Zahlen TV:</strong><br>${openT2}</div>
            <div class="spiel-detail"><strong>Zugeordnet:</strong><br>${assigned || '—'}</div>
          </div>

          <button class="del-spiel-btn" onclick="deleteStrafenHistoryEntry('${escapeForJs(entry.id)}')">✕</button>
        </div>
      `;
    }

    if (entry.type === 'free') {
      return `
        <div class="spiel-card">
          <div class="spiel-info">
            <div class="spiel-verlierer round">💸 Freier Betrag</div>
            <div class="spiel-detail">${entry.createdAt ? formatDateTime(entry.createdAt) : ''}</div>
            <div class="spiel-detail"><strong>Person:</strong> ${entry.person || '—'}</div>
            <div class="spiel-detail"><strong>Grund:</strong> ${entry.reason || '—'}</div>
            <div class="spiel-detail">
              <strong>Betrag:</strong> ${euros(entry.amount || 0)}
              ${entry.onTop ? ' · On Top' : ''}
            </div>
          </div>

          <div>
            <div class="spiel-betrag round">${euros(entry.amount || 0)}</div>
          </div>

          <button class="del-spiel-btn" onclick="deleteStrafenHistoryEntry('${escapeForJs(entry.id)}')">✕</button>
        </div>
      `;
    }

    if (entry.type === 'lotterie') {
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
    }

    if (entry.type === 'tiberius') {
      const assigned = (entry.assignedTo || [])
        .map(x => `${x.name}: ${euros(x.amount)}${x.onTop ? ' · On Top' : ''}`)
        .join('<br>');

      return `
        <div class="spiel-card">
          <div class="spiel-info">
            <div class="spiel-verlierer round">🏛️ Tiberius abgeschlossen</div>
            <div class="spiel-detail">${entry.createdAt ? formatDateTime(entry.createdAt) : ''}</div>
            <div class="spiel-detail"><strong>Gebucht:</strong><br>${assigned || '—'}</div>
          </div>

          <button class="del-spiel-btn" onclick="deleteStrafenHistoryEntry('${escapeForJs(entry.id)}')">✕</button>
        </div>
      `;
    }

    return '';
  }).join('');
}
        
function calcNormalStrafenRaw(p) {
  if (!p.strafen) p.strafen = {};
  if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];

  const counted = STRAFEN.reduce((sum, s) => {
    return sum + ((p.strafen[s.key] || 0) * (strafPrices[s.key] || 0));
  }, 0);

    const lateKey = getLateStrafeKey();
    const earlyKey = getEarlyLeaveStrafeKey();

    const lateAmount = lateKey
      ? calcLateCount(p) * (strafPrices[lateKey] || 0)
      : 0;

    const earlyAmount = earlyKey
      ? calcLeftEarlyCount(p) * (strafPrices[earlyKey] || 0)
      : 0;

  const freeNormal = p.freeStrafen
    .filter(x => !x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const tannenbaum = getPersonTannenbaumTotal(p) || 0;

return counted + lateAmount + earlyAmount + freeNormal + tannenbaum;
}

function calcOnTopStrafenTotal(p) {
  if (!Array.isArray(p.freeStrafen)) p.freeStrafen = [];

  return p.freeStrafen
    .filter(x => x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);
}

function calcPersonStrafenTotalCapped(p) {
  const normal = Math.min(calcNormalStrafenRaw(p), STRAFEN_LIMIT);
  const onTop = calcOnTopStrafenTotal(p);
  return normal + onTop;
}

function calcHighestPresentStrafenTotal() {
  const present = persons.filter(p => p.present);
  if (!present.length) return 0;

  return Math.max(...present.map(p => calcPersonStrafenTotalCapped(p)));
}

function calcAbsentStrafenTotal() {
  const highest = calcHighestPresentStrafenTotal();
  if (highest <= 0) return 0;

  return persons
    .filter(p => !p.present && !p.isGuest)
    .reduce((sum) => sum + highest + ABSENT_STRAFE_EXTRA, 0);
}

function calcAllStrafenTotal() {
  const presentTotal = persons
    .filter(p => p.present)
    .reduce((sum, p) => sum + calcPersonStrafenTotalCapped(p), 0);

  return presentTotal + calcAbsentStrafenTotal();
}
    
function renderStrafpreisEditor() {
  const ed = document.getElementById('strafpreise-editor');
  if (!ed) return;

  ed.innerHTML = '';

  STRAFEN.forEach(s => {
    const c = document.createElement('div');
    c.className = 'price-edit-card';
    c.innerHTML = `
      <label>${s.label}</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" step="0.10" min="0" class="price-input" id="straf-price-input-${s.key}" value="${(strafPrices[s.key] || 0).toFixed(2)}" placeholder="0.00">
        <button class="delete-drink-btn" onclick="deleteStrafe('${escapeForJs(s.key)}')" title="Strafe löschen">✕</button>
      </div>
    `;
    ed.appendChild(c);
  });
}
    
function deleteStrafenHistoryEntry(id) {
  if (!Array.isArray(strafenHistory)) strafenHistory = [];

  const entry = strafenHistory.find(x => x.id === id)
    || lotterieState?.history?.find(x => x.id === id)
    || tiberiusState?.history?.find(x => x.id === id);

  if (!entry) return;

  if (!confirm('Diesen Historien-Eintrag wirklich löschen?')) return;

  if (entry.type === 'tannenbaum') {
    persons.forEach(p => {
      if (Array.isArray(p.tannenbaumCharges)) {
        p.tannenbaumCharges = p.tannenbaumCharges.filter(x => x.id !== id);
      }
    });
  }

  if (entry.type === 'free') {
    persons.forEach(p => {
      if (Array.isArray(p.freeStrafen)) {
        p.freeStrafen = p.freeStrafen.filter(x => x.id !== id);
      }
    });
  }

  if (entry.type === 'lotterie' || entry.type === 'tiberius') {
    const chargeIds = (entry.assignedTo || [])
      .map(x => x.id)
      .filter(Boolean);

    persons.forEach(p => {
      if (Array.isArray(p.freeStrafen)) {
        p.freeStrafen = p.freeStrafen.filter(x => !chargeIds.includes(x.id));
      }
    });
  }

  strafenHistory = strafenHistory.filter(x => x.id !== id);

  if (lotterieState && Array.isArray(lotterieState.history)) {
    lotterieState.history = lotterieState.history.filter(x => x.id !== id);
  }

  if (tiberiusState && Array.isArray(tiberiusState.history)) {
    tiberiusState.history = tiberiusState.history.filter(x => x.id !== id);
  }

  renderAll();
  persistState();

  showToast('🗑️ Historien-Eintrag gelöscht', 'success');
}

function getGosseKings() {
  const gosseKey = getGosseStrafeKey();
  if (!gosseKey) return [];

  const candidates = persons
    .filter(p => p.present)
    .map(p => ({
      name: p.name,
      count: (p.strafen && p.strafen[gosseKey]) || 0
    }));

  const max = Math.max(0, ...candidates.map(x => x.count));

  if (max <= 0) return [];

  return candidates
    .filter(x => x.count === max)
    .map(x => x.name);
}

function isGosseKing(personName) {
  return getGosseKings().includes(personName);
}

function saveStrafPrices() {
  STRAFEN.forEach(s => {
    const el = document.getElementById('straf-price-input-' + s.key);
    if (el) strafPrices[s.key] = parseFloat(String(el.value).replace(',', '.')) || 0;
  });

  renderStrafen();
  persistState();
  showToast('✅ Strafpreise gespeichert!', 'success');
}

function addStrafe() {
  const nameInput = document.getElementById('new-strafe-name');
  const priceInput = document.getElementById('new-strafe-price');

  const name = (nameInput?.value || '').trim();
  const price = parseFloat(String(priceInput?.value || '0').replace(',', '.')) || 0;

  if (!name) {
    showToast('Bitte Strafnamen eingeben', 'error');
    return;
  }

  if (STRAFEN.find(s => s.label.toLowerCase() === name.toLowerCase())) {
    showToast('Strafe existiert bereits', 'error');
    return;
  }

  let key = makeStrafeKey(name);
  while (STRAFEN.find(s => s.key === key)) {
    key = key + '_' + Math.floor(Math.random() * 1000);
  }

  STRAFEN.push({ key, label: name });
  strafPrices[key] = price;

  persons.forEach(p => {
    if (!p.strafen) p.strafen = {};
    p.strafen[key] = 0;
  });

  nameInput.value = '';
  priceInput.value = '';

  renderAll();
  persistState();
  showToast('✅ Strafe hinzugefügt', 'success');
}

function deleteStrafe(key) {
  const strafe = STRAFEN.find(s => s.key === key);
  if (!strafe) return;

  const used = persons.some(p => p.strafen && (p.strafen[key] || 0) > 0);

  if (used) {
    showToast('Strafe kann nicht gelöscht werden, weil sie bereits gezählt wurde', 'error');
    return;
  }

  if (!confirm(`Strafe "${strafe.label}" wirklich löschen?`)) return;

  STRAFEN = STRAFEN.filter(s => s.key !== key);
  delete strafPrices[key];

  persons.forEach(p => {
    if (p.strafen && key in p.strafen) delete p.strafen[key];
  });

  renderAll();
  persistState();
  showToast('🗑️ Strafe gelöscht', 'success');
}
    
function queueAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    saveClubSystem();
    await saveToFirestore(false);
  }, 800);
}
    
function getDrinksSnapshot() {
  recalcTeamExtras();

  const relevantPersons = persons.filter(p =>
    p.present ||
    p.left ||
    calcDrinksTotal(p) > 0 ||
    (p.teamExtra || 0) > 0 ||
    (p.roundExtra || 0) > 0 ||
    (p.rounds || []).length > 0
  );

  return {
    date: new Date().toISOString(),
    drinks: DRINKS.map(d => ({
      key: d.key,
      label: d.label,
      price: prices[d.key] || 0
    })),
    persons: relevantPersons.map(p => ({
      name: p.name,
      isGuest: !!p.isGuest,
      tisch: p.tisch || '',
      drinks: { ...p.drinks },
      drinksTotal: calcDrinksTotal(p),
      teamExtra: p.teamExtra || 0,
      roundExtra: p.roundExtra || 0,
      total: calcTotal(p),
      paid: p.paid || 0,
      left: !!p.left,
      leftAt: p.leftAt || '',
      rounds: Array.isArray(p.rounds) ? [...p.rounds] : []
    })),
    spiele: spiele.map(s => ({
      spieltyp: s.spieltyp || '',
      loser: s.loser || '',
      drinks: { ...(s.drinks || {}) },
      total: s.total || 0,
      proKopf: s.proKopf || 0,
      members: Array.isArray(s.members) ? [...s.members] : []
    }))
  };
}

function getStrafenSnapshot() {
  const presentPersons = persons
    .filter(p => p.present)
    .sort((a, b) => {
      if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
      return a.name.localeCompare(b.name, 'de');
    });

  const absentMembers = persons
    .filter(p => !p.present && !p.isGuest)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return {
    date: new Date().toISOString(),
    strafen: STRAFEN.map(s => ({
      key: s.key,
      label: s.label,
      price: strafPrices[s.key] || 0
    })),
    presentPersons: presentPersons.map(p => ({
      name: p.name,
      isGuest: !!p.isGuest,
      tisch: p.tisch || '',
      strafen: { ...(p.strafen || {}) },
      freeStrafen: Array.isArray(p.freeStrafen) ? [...p.freeStrafen] : [],
      tannenbaumCharges: Array.isArray(p.tannenbaumCharges) ? [...p.tannenbaumCharges] : [],
      normalRaw: calcNormalStrafenRaw(p),
      onTop: calcOnTopStrafenTotal(p),
      total: calcPersonStrafenTotalCapped(p),
        arrivalTime: p.arrivalTime || '',
        leftEarlyAt: p.leftEarlyAt || '',
        boughtThrows: p.boughtThrows || 0
    })),
    absentMembers: absentMembers.map(p => ({
      name: p.name,
      total: calcHighestPresentStrafenTotal() + ABSENT_STRAFE_EXTRA
    })),
    highestPresent: calcHighestPresentStrafenTotal(),
    absentExtra: ABSENT_STRAFE_EXTRA,
    total: calcAllStrafenTotal(),
    history: Array.isArray(strafenHistory) ? [...strafenHistory] : []
  };
}

function getPdfClubName() {
  return ACTIVE_CLUB || 'Kegelclub';
}

function getSafePdfClubName() {
  return getPdfClubName()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_');
}

async function generateStrafenPDF(snapshot) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 15;

  const formatEuro = v => (v || 0).toFixed(2).replace('.', ',') + ' €';

  const visiblePdfStrafen = (snapshot.strafen || []).filter(s => !isAutoTimeStrafeKey(s.key));

  const usableWidth = pageWidth - margin * 2;
  const nameWidth = 45;
  const sumWidth = 30;
  const strafeCount = Math.max(1, visiblePdfStrafen.length);
  const strafeWidth = (usableWidth - nameWidth - (3 * sumWidth)) / strafeCount;

  const headerHeight = 34;
  const rowHeight = 8;

  function drawCell(x, yy, w, h, opts = {}) {
    const {
      left = true,
      right = true,
      top = false,
      bottom = false,
      thickTop = false,
      thickBottom = false,
      thickLeft = false,
      thickRight = false
    } = opts;

    if (left) {
      doc.setLineWidth(thickLeft ? 0.35 : 0.15);
      doc.line(x, yy, x, yy + h);
    }
    if (right) {
      doc.setLineWidth(thickRight ? 0.35 : 0.15);
      doc.line(x + w, yy, x + w, yy + h);
    }
    if (top) {
      doc.setLineWidth(thickTop ? 0.35 : 0.15);
      doc.line(x, yy, x + w, yy);
    }
    if (bottom) {
      doc.setLineWidth(thickBottom ? 0.35 : 0.03);
      doc.line(x, yy + h, x + w, yy + h);
    }
  }

  function textCenter(txt, x, top, w, h = null, opts = {}) {
    const yPos = h === null ? top : top + (h / 2) + 1.2;
    doc.text(String(txt), x + w / 2, yPos, { align: "center", ...opts });
  }

  function drawWrappedText(txt, x, yy, w, lineHeight = 3.4) {
    const lines = doc.splitTextToSize(String(txt || ''), w - 3);
    lines.slice(0, 4).forEach((line, idx) => {
      doc.text(line, x + w / 2, yy + idx * lineHeight, { align: "center" });
    });
  }

  function getStrafPrice(s) {
    if (s.price !== undefined) return parseFloat(s.price) || 0;

    if (snapshot.strafPrices && snapshot.strafPrices[s.key] !== undefined) {
      return parseFloat(snapshot.strafPrices[s.key]) || 0;
    }

    if (typeof strafPrices !== 'undefined' && strafPrices[s.key] !== undefined) {
      return parseFloat(strafPrices[s.key]) || 0;
    }

    return 0;
  }

  function drawHeader() {
    let x = margin;
    const top = y;

    doc.setFontSize(8);

    drawCell(x, top, nameWidth, headerHeight, {
      top: true,
      bottom: true,
      thickTop: true,
      thickLeft: true
    });

    doc.text("Name", x + 2, top + headerHeight - 5);
    x += nameWidth;

    visiblePdfStrafen.forEach(s => {
      const price = getStrafPrice(s);

      drawCell(x, top, strafeWidth, headerHeight, {
        top: true,
        bottom: true,
        thickTop: true
      });

      doc.setFontSize(7);
      drawWrappedText(s.label, x, top + 6, strafeWidth);

      doc.setFontSize(6.5);
      textCenter(formatEuro(price), x, top + headerHeight - 4, strafeWidth);

      x += strafeWidth;
    });

    ["Freie Beträge", "On Top", "Gesamt"].forEach((label, idx) => {
      drawCell(x, top, sumWidth, headerHeight, {
        top: true,
        bottom: true,
        thickTop: true,
        thickRight: idx === 2
      });

      doc.setFontSize(7.5);
      drawWrappedText(label, x, top + 13, sumWidth);
      x += sumWidth;
    });

    y += headerHeight;
  }

  function ensureSpace(needed) {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
  }

  doc.setFontSize(18);
  doc.text(`${getPdfClubName()} - Strafabrechnung`, margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(new Date(snapshot.date).toLocaleString('de-DE'), margin, y);

  y += 12;
  drawHeader();

  (snapshot.presentPersons || []).forEach((p, personIndex) => {
    const isLast = personIndex === (snapshot.presentPersons || []).length - 1;

    const tannenbaumNormal = (p.tannenbaumCharges || [])
      .filter(x => !x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const tannenbaumOnTop = (p.tannenbaumCharges || [])
      .filter(x => x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const lotterieNormal = (p.freeStrafen || [])
      .filter(x => String(x.reason || '') === 'Lotterie' && !x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const lotterieOnTop = (p.freeStrafen || [])
      .filter(x => String(x.reason || '') === 'Lotterie' && x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const tiberiusNormal = (p.freeStrafen || [])
      .filter(x => String(x.reason || '') === 'Tiberius' && !x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const tiberiusOnTop = (p.freeStrafen || [])
      .filter(x => String(x.reason || '') === 'Tiberius' && x.onTop)
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const freeManualNormal = (p.freeStrafen || [])
      .filter(x => !x.onTop && !['Lotterie', 'Tiberius'].includes(String(x.reason || '')))
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const freeManualOnTop = (p.freeStrafen || [])
      .filter(x => x.onTop && !['Lotterie', 'Tiberius'].includes(String(x.reason || '')))
      .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

    const pdfFreeNormal = freeManualNormal + tannenbaumNormal + lotterieNormal + tiberiusNormal;
    const pdfOnTop = freeManualOnTop + tannenbaumOnTop + lotterieOnTop + tiberiusOnTop;

    const detailLines = [];

    if (tannenbaumNormal > 0) detailLines.push(`Tannenbaum: +${formatEuro(tannenbaumNormal)}`);
    if (tannenbaumOnTop > 0) detailLines.push(`Tannenbaum: +${formatEuro(tannenbaumOnTop)} On Top`);
    if (lotterieNormal > 0) detailLines.push(`Lotterie: +${formatEuro(lotterieNormal)}`);
    if (lotterieOnTop > 0) detailLines.push(`Lotterie: +${formatEuro(lotterieOnTop)} On Top`);
    if (tiberiusNormal > 0) detailLines.push(`Tiberius: +${formatEuro(tiberiusNormal)}`);
    if (tiberiusOnTop > 0) detailLines.push(`Tiberius: +${formatEuro(tiberiusOnTop)} On Top`);
    if (freeManualNormal > 0) detailLines.push(`Freie Beträge: +${formatEuro(freeManualNormal)}`);
    if (freeManualOnTop > 0) detailLines.push(`Freie Beträge: +${formatEuro(freeManualOnTop)} On Top`);

    const latePenalty = getLatePenaltyDisplay(p);
    const earlyPenalty = getEarlyPenaltyDisplay(p);

    if (latePenalty) detailLines.push(`Verspätet: ${latePenalty.count}x +${formatEuro(latePenalty.amount)}`);
    if (earlyPenalty) detailLines.push(`Zu früh weg: ${earlyPenalty.count}x +${formatEuro(earlyPenalty.amount)}`);

    const dynamicRowHeight = rowHeight + detailLines.length * 4;

    ensureSpace(dynamicRowHeight);

    let x = margin;
    const top = y;

    drawCell(x, top, nameWidth, dynamicRowHeight, {
      bottom: true,
      thickBottom: isLast,
      thickLeft: true
    });

    doc.setFontSize(7.6);
    doc.text(p.name, x + 2, top + 5, { maxWidth: nameWidth - 3 });

    if (detailLines.length) {
      doc.setFontSize(6.1);
      detailLines.forEach((line, idx) => {
        doc.text(line, x + 2, top + 9 + idx * 4, {
          maxWidth: nameWidth - 3
        });
      });
    }

    x += nameWidth;

    visiblePdfStrafen.forEach(s => {
      drawCell(x, top, strafeWidth, dynamicRowHeight, {
        bottom: true,
        thickBottom: isLast
      });

      doc.setFontSize(8);
      textCenter(
        (p.strafen && p.strafen[s.key]) || 0,
        x,
        top,
        strafeWidth,
        dynamicRowHeight
      );

      x += strafeWidth;
    });

    [
      formatEuro(pdfFreeNormal),
      formatEuro(pdfOnTop),
      formatEuro(p.total)
    ].forEach((value, idx) => {
      drawCell(x, top, sumWidth, dynamicRowHeight, {
        bottom: true,
        thickBottom: isLast,
        thickRight: idx === 2
      });

      doc.setFontSize(8);
      textCenter(value, x, top, sumWidth, dynamicRowHeight);

      x += sumWidth;
    });

    y += dynamicRowHeight;
  });

  y += 10;

  const personsWithTimes = (snapshot.presentPersons || [])
    .filter(p => p.arrivalTime || p.leftEarlyAt);

  if (personsWithTimes.length) {
    ensureSpace(14 + personsWithTimes.length * 6);

    doc.setFontSize(13);
    doc.text("Ankunfts- und Gehzeiten", margin, y);
    y += 7;

    doc.setFontSize(10);

    personsWithTimes.forEach(p => {
      ensureSpace(7);

      const arrival = p.arrivalTime || "—";
      const left = p.leftEarlyAt || "—";

      doc.text(`${p.name}: Ankunft ${arrival} | Weg ${left}`, margin, y);
      y += 6;
    });

    y += 4;
  }

  if (snapshot.absentMembers && snapshot.absentMembers.length) {
    ensureSpace(12 + snapshot.absentMembers.length * 6);

    doc.setFontSize(13);
    doc.text("Nicht anwesende Mitglieder", margin, y);
    y += 7;

    doc.setFontSize(10);
    snapshot.absentMembers.forEach(p => {
      ensureSpace(7);
      doc.text(`${p.name}: ${formatEuro(p.total)}`, margin, y);
      y += 6;
    });

    y += 4;
  }

  ensureSpace(22);

  doc.setFontSize(12);
  doc.text(`Höchste Strafe Anwesende: ${formatEuro(snapshot.highestPresent)}`, margin, y);
  y += 6;
  doc.text(`Nicht anwesend Zuschlag: +${formatEuro(snapshot.absentExtra)}`, margin, y);
  y += 6;
  doc.text(`Strafen gesamt: ${formatEuro(snapshot.total)}`, margin, y);

  if (snapshot.history && snapshot.history.length) {
    y += 10;
    ensureSpace(20);

    doc.setFontSize(13);
    doc.text("Historie", margin, y);
    y += 7;

    doc.setFontSize(9);

    snapshot.history.forEach((entry, idx) => {
      ensureSpace(18);

      if (entry.type === 'tannenbaum') {
        doc.text(`${idx + 1}. Tannenbaum abgeschlossen | ${formatDateTime(entry.createdAt)}`, margin, y);
        y += 5;

        doc.text(
          `Wand: ${formatEuro(entry.totals?.T1 || 0)} | TV: ${formatEuro(entry.totals?.T2 || 0)}`,
          margin + 6,
          y
        );
        y += 5;

        const assigned = (entry.assignedTo || [])
          .map(a => `${a.name}: ${formatEuro(a.amount)}${a.onTop ? ' On Top' : ''}`)
          .join(', ');

        doc.text(`Zugeordnet: ${assigned || '-'}`, margin + 6, y, {
          maxWidth: pageWidth - margin * 2 - 6
        });

        y += 8;
        return;
      }

      if (entry.type === 'free') {
        doc.text(`${idx + 1}. Freier Betrag | ${formatDateTime(entry.createdAt)}`, margin, y);
        y += 5;

        doc.text(
          `${entry.person || '-'}: ${entry.reason || '-'} | ${formatEuro(entry.amount)}${entry.onTop ? ' | On Top' : ''}`,
          margin + 6,
          y,
          { maxWidth: pageWidth - margin * 2 - 6 }
        );

        y += 8;
        return;
      }

      if (entry.type === 'lotterie') {
        doc.text(`${idx + 1}. Lotterie abgeschlossen | ${formatDateTime(entry.createdAt)}`, margin, y);
        y += 5;

        const assigned = (entry.assignedTo || [])
          .map(a => `${a.name}: ${formatEuro(a.amount)}${a.onTop ? ' On Top' : ''}`)
          .join(', ');

        doc.text(`Gebucht: ${assigned || '-'}`, margin + 6, y, {
          maxWidth: pageWidth - margin * 2 - 6
        });

        y += 8;
        return;
      }

      if (entry.type === 'tiberius') {
        doc.text(`${idx + 1}. Tiberius abgeschlossen | ${formatDateTime(entry.createdAt)}`, margin, y);
        y += 5;

        doc.text(`Endstand: ${entry.score || 0}`, margin + 6, y);
        y += 5;

        const assigned = (entry.assignedTo || [])
          .map(a => `${a.name}: ${formatEuro(a.amount)}${a.onTop ? ' On Top' : ''}`)
          .join(', ');

        doc.text(`Gebucht: ${assigned || '-'}`, margin + 6, y, {
          maxWidth: pageWidth - margin * 2 - 6
        });

        y += 8;
      }
    });
  }

  return doc;
}

async function closeStrafenAndExportPDF() {
  try {
    const snapshot = getStrafenSnapshot();
    const doc = await generateStrafenPDF(snapshot);

    const dateStr = new Date().toISOString().slice(0, 10);
    const clubName = getSafePdfClubName();
    const filename = `${clubName}_Strafenabrechnung_${dateStr}.pdf`;

    doc.save(filename);

    await archiveStrafenEvent(snapshot);

    showToast('✅ Straf-PDF erstellt und archiviert', 'success');
  } catch (err) {
    console.error(err);
    showToast('❌ Fehler beim Strafabschluss', 'error');
  }
}

async function archiveStrafenEvent(snapshot) {
  if (!window.firestoreApi || !ACTIVE_CLUB) return;

  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  const archiveId = 'strafen_' + new Date().toISOString().replace(/[:.]/g, '-');

  await window.firestoreApi.archiveClubEvent(clubId, archiveId, {
    ...snapshot,
    status: 'closed',
    closedAt: new Date().toISOString(),
    club: ACTIVE_CLUB,
    category: 'strafen'
  });
}
    
async function generateDrinksPDF(snapshot) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 15;

  const formatEuro = v => (v || 0).toFixed(2).replace('.', ',') + ' €';
  const teamLabel = t => t === 'T1' ? 'Wand' : t === 'T2' ? 'TV' : t || '-';

  const usableWidth = pageWidth - margin * 2;
  const nameWidth = 45;
  const sumWidth = 29;
  const drinkCount = Math.max(1, (snapshot.drinks || []).length);
  const drinkWidth = (usableWidth - nameWidth - (5 * sumWidth)) / drinkCount;

  const headerHeight = 34;
  const rowBaseHeight = 8;

  function drawCell(x, yy, w, h, opts = {}) {
    const {
      left = true,
      right = true,
      top = false,
      bottom = false,
      thickTop = false,
      thickBottom = false,
      thickLeft = false,
      thickRight = false
    } = opts;

    if (left) {
      doc.setLineWidth(thickLeft ? 0.35 : 0.15);
      doc.line(x, yy, x, yy + h);
    }
    if (right) {
      doc.setLineWidth(thickRight ? 0.35 : 0.15);
      doc.line(x + w, yy, x + w, yy + h);
    }
    if (top) {
      doc.setLineWidth(thickTop ? 0.35 : 0.15);
      doc.line(x, yy, x + w, yy);
    }
    if (bottom) {
      doc.setLineWidth(thickBottom ? 0.35 : 0.03);
      doc.line(x, yy + h, x + w, yy + h);
    }
  }

  function textCenter(txt, x, top, w, h = null, opts = {}) {
    const yPos = h === null ? top : top + (h / 2) + 1.2;

    doc.text(String(txt), x + w / 2, yPos, {
      align: "center",
      ...opts
    });
  }

  function drawWrappedText(txt, x, yy, w, lineHeight = 3.4) {
    const lines = doc.splitTextToSize(String(txt || ''), w - 3);
    lines.slice(0, 4).forEach((line, idx) => {
      doc.text(line, x + w / 2, yy + idx * lineHeight, { align: "center" });
    });
  }

  function getDrinkPrice(d) {
    if (d.price !== undefined) return parseFloat(d.price) || 0;

    if (snapshot.drinkPrices && snapshot.drinkPrices[d.key] !== undefined) {
      return parseFloat(snapshot.drinkPrices[d.key]) || 0;
    }

    if (typeof prices !== 'undefined' && prices[d.key] !== undefined) {
      return parseFloat(prices[d.key]) || 0;
    }

    return 0;
  }

  function drawHeader() {
    let x = margin;
    const top = y;

    doc.setFontSize(8);

    drawCell(x, top, nameWidth, headerHeight, {
      top: true,
      bottom: true,
      thickTop: true,
      thickLeft: true
    });

    doc.text("Name", x + 2, top + headerHeight - 5);
    x += nameWidth;

    (snapshot.drinks || []).forEach(d => {
      const price = getDrinkPrice(d);

      drawCell(x, top, drinkWidth, headerHeight, {
        top: true,
        bottom: true,
        thickTop: true
      });

      doc.setFontSize(7);
      drawWrappedText(d.label, x, top + 6, drinkWidth);

      doc.setFontSize(6.5);
      textCenter(formatEuro(price), x, top + headerHeight - 4, drinkWidth);

      x += drinkWidth;
    });

    ["Getränke", "Strafen", "Runden", "Gesamt", "Bezahlt"].forEach((label, idx) => {
      drawCell(x, top, sumWidth, headerHeight, {
        top: true,
        bottom: true,
        thickTop: true,
        thickRight: idx === 4
      });

      doc.setFontSize(7.5);
      drawWrappedText(label, x, top + 13, sumWidth);
      x += sumWidth;
    });

    y += headerHeight;
  }

  function ensureSpace(needed) {
    if (y + needed > pageHeight - 15) {
      doc.addPage();
      y = 15;
      drawHeader();
    }
  }

  doc.setFontSize(18);
  doc.text(`${getPdfClubName()} - Getränkeabrechnung`, margin, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(new Date(snapshot.date).toLocaleString('de-DE'), margin, y);

  y += 12;
  drawHeader();

  (snapshot.persons || []).forEach((p, personIndex) => {
    const isLast = personIndex === snapshot.persons.length - 1;

    const teamDetails = (snapshot.spiele || [])
      .filter(s => (s.members || []).includes(p.name))
      .map(s => `Spiel: ${s.spieltyp || 'Teamspiel'} (${teamLabel(s.loser)}) +${formatEuro(s.proKopf || 0)}`);

    const roundDetails = (p.rounds || [])
      .map(r => `Runde: ${r.reason || 'ohne Grund'} +${formatEuro(r.total || 0)}`);

    const detailLines = [...teamDetails, ...roundDetails];
    const rowHeight = rowBaseHeight + detailLines.length * 4;

    ensureSpace(rowHeight);

    let x = margin;
    const top = y;

    drawCell(x, top, nameWidth, rowHeight, {
      bottom: true,
      thickBottom: isLast,
      thickLeft: true
    });

    doc.setFontSize(7.6);
    doc.text(p.name, x + 2, top + 5, { maxWidth: nameWidth - 3 });

    if (detailLines.length) {
      doc.setFontSize(6.1);
      detailLines.forEach((line, idx) => {
        doc.text(line, x + 2, top + 9 + idx * 4, { maxWidth: nameWidth - 3 });
      });
    }

    x += nameWidth;

    (snapshot.drinks || []).forEach(d => {
      drawCell(x, top, drinkWidth, rowHeight, {
        bottom: true,
        thickBottom: isLast
      });

      doc.setFontSize(8);
      textCenter(
        (p.drinks && p.drinks[d.key]) || 0,
        x,
        top,
        drinkWidth,
        rowHeight
      );

      x += drinkWidth;
    });

    [
      formatEuro(p.drinksTotal),
      formatEuro(p.teamExtra),
      formatEuro(p.roundExtra),
      formatEuro(p.total),
      formatEuro(p.paid)
    ].forEach((value, idx) => {
      drawCell(x, top, sumWidth, rowHeight, {
        bottom: true,
        thickBottom: isLast,
        thickRight: idx === 4
      });

      doc.setFontSize(8);
      textCenter(value, x, top, sumWidth, rowHeight);

      x += sumWidth;
    });

    y += rowHeight;
  });

  y += 10;

  const totalDrinks = (snapshot.persons || []).reduce((s, p) => s + (p.drinksTotal || 0), 0);
  const totalStrafen = (snapshot.persons || []).reduce((s, p) => s + (p.teamExtra || 0), 0);
  const totalRunden = (snapshot.persons || []).reduce((s, p) => s + (p.roundExtra || 0), 0);
  const totalGesamt = (snapshot.persons || []).reduce((s, p) => s + (p.total || 0), 0);
  const totalBezahlt = (snapshot.persons || []).reduce((s, p) => s + (p.paid || 0), 0);

  doc.setFontSize(11);
  doc.text(`Getränke gesamt: ${formatEuro(totalDrinks)}`, margin, y); y += 6;
  doc.text(`Strafen gesamt: ${formatEuro(totalStrafen)}`, margin, y); y += 6;
  doc.text(`Runden gesamt: ${formatEuro(totalRunden)}`, margin, y); y += 6;
  doc.text(`Abrechnung gesamt: ${formatEuro(totalGesamt)}`, margin, y); y += 6;
  doc.text(`Bezahlt gesamt: ${formatEuro(totalBezahlt)}`, margin, y);

  y += 10;

  if ((snapshot.spiele || []).length) {
    ensureSpace(20);

    doc.setFontSize(13);
    doc.text("Teamspiele / verlorene Spiele", margin, y);
    y += 7;

    doc.setFontSize(9);

    snapshot.spiele.forEach((s, idx) => {
      ensureSpace(18);

      const loser = s.loser === 'T1' ? 'Wand' : s.loser === 'T2' ? 'TV' : s.loser || '-';

      const drinksText = (snapshot.drinks || [])
        .filter(d => (s.drinks && (s.drinks[d.key] || 0) > 0))
        .map(d => `${s.drinks[d.key]}x ${d.label}`)
        .join(', ');

      doc.text(`${idx + 1}. ${s.spieltyp || 'Teamspiel'} | Verlierer: ${loser}`, margin, y);
      y += 5;

      doc.text(`Getränke: ${drinksText || '-'}`, margin + 6, y, {
        maxWidth: pageWidth - margin * 2 - 6
      });
      y += 5;

      doc.text(
        `Gesamt: ${formatEuro(s.total || 0)} | Pro Kopf: ${formatEuro(s.proKopf || 0)} | Spieler: ${(s.members || []).join(', ') || '-'}`,
        margin + 6,
        y,
        { maxWidth: pageWidth - margin * 2 - 6 }
      );
      y += 7;
    });
  }

  const allRounds = [];

  (snapshot.persons || []).forEach(p => {
    (p.rounds || []).forEach(r => {
      allRounds.push({
        person: p.name,
        reason: r.reason || '',
        drinks: r.drinks || {},
        total: r.total || 0,
        createdAt: r.createdAt || ''
      });
    });
  });

  if (allRounds.length) {
    y += 6;
    ensureSpace(20);

    doc.setFontSize(13);
    doc.text("Gegebene Runden", margin, y);
    y += 7;

    doc.setFontSize(9);

    allRounds
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .forEach((r, idx) => {
        ensureSpace(16);

        const drinksText = (snapshot.drinks || [])
          .filter(d => (r.drinks && (r.drinks[d.key] || 0) > 0))
          .map(d => `${r.drinks[d.key]}x ${d.label}`)
          .join(', ');

        doc.text(`${idx + 1}. ${r.person} | ${r.reason || 'Ohne Grund'} | ${formatEuro(r.total)}`, margin, y);
        y += 5;

        doc.text(`Getränke: ${drinksText || '-'}`, margin + 6, y, {
          maxWidth: pageWidth - margin * 2 - 6
        });
        y += 5;

        if (r.createdAt) {
          doc.text(`Zeit: ${formatDateTime(r.createdAt)}`, margin + 6, y);
          y += 6;
        } else {
          y += 2;
        }
      });
  }

  return doc;
}
    
async function closeDrinksAndExportPDF() {
  try {
    const snapshot = getDrinksSnapshot();
    const doc = await generateDrinksPDF(snapshot);

    const dateStr = new Date().toISOString().slice(0, 10);
    const clubName = getSafePdfClubName();
    const filename = `${clubName}_Getraenkeabrechnung_${dateStr}.pdf`;

    doc.save(filename);

    await archiveEvent(snapshot);

    showToast('✅ PDF erstellt und Abend archiviert', 'success');
  } catch (err) {
    console.error(err);
    showToast('❌ Fehler beim Abschließen', 'error');
  }
}
    
async function archiveEvent(snapshot) {
  if (!window.firestoreApi || !ACTIVE_CLUB) return;

  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  const archiveId = 'archive_' + new Date().toISOString().replace(/[:.]/g, '-');

  try {
    await window.firestoreApi.archiveClubEvent(clubId, archiveId, {
      ...snapshot,
      status: 'closed',
      closedAt: new Date().toISOString(),
      club: ACTIVE_CLUB,
      category: 'getraenke'
    });
  } catch (e) {
    console.error('Archivieren fehlgeschlagen:', e);
    throw e;
  }
}

function startNewKegelabend() {
    archiveCurrentKegelabendForStats();

  persons.forEach(p => {
    p.present = false;
    p.tisch = '';
    p.left = false;
    p.leftAt = '';
    p.arrivalTime = '';
    p.leftEarlyAt = '';
    p.paid = 0;

    p.teamExtra = 0;
    p.roundExtra = 0;
    p.rounds = [];
      p.freeStrafen = [];
      p.tannenbaumCharges = [];

    if (!p.drinks) p.drinks = {};
    DRINKS.forEach(d => {
      p.drinks[d.key] = 0;
    });

    if (!p.strafen) p.strafen = {};
    STRAFEN.forEach(s => {
      p.strafen[s.key] = 0;
    });
    p.boughtThrows = 0;
  });

  spiele = [];
  teamDrinks = {};
  selectedLoser = null;
  roundDraftDrinks = {};
    strafenHistory = [];
  bahnTimerStart = null;
  bahnTimerRunning = false;
  localStorage.removeItem(getBahnStoppedKey());

  teamStopwatchActive = false;
  teamStopwatchRunning = false;
  teamStopwatchStart = null;
  teamCountdownDuration = 0;
  teamCountdownRemainingBefore = 0;

  tannenbaumState = createTannenbaumState();
    dartsState = createDartsState();
    lotterieState = createLotterieState();
    tiberiusState = createTiberiusState();
  renderAll();
  persistState();

  showToast('🆕 Neuer Kegelabend gestartet', 'success');
}

function openBuyThrowModal() {
  const select = document.getElementById('buy-throw-person');
  if (!select) return;

  const max = Math.max(0, parseInt(wurfSettings.maxBuys || 3, 10) || 3);

  const active = persons
    .filter(p => p.present && !p.left)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  select.innerHTML = '<option value="">Bitte Person wählen</option>';

  active.forEach(p => {
    const used = Math.max(0, parseInt(p.boughtThrows || 0, 10) || 0);
    const left = Math.max(0, max - used);

    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = `${p.name} (${left} frei)`;

    if (left <= 0) {
      opt.disabled = true;
      opt.textContent = `${p.name} (keine Würfe frei)`;
    }

    select.appendChild(opt);
  });

  document.getElementById('buy-throw-modal')?.classList.remove('hidden');
}

function closeBuyThrowModal() {
  document.getElementById('buy-throw-modal')?.classList.add('hidden');
}

function confirmBuyThrow() {
  const select = document.getElementById('buy-throw-person');
  const personName = select?.value || '';

  if (!personName) {
    showToast('Bitte Person auswählen', 'error');
    return;
  }

  const p = persons.find(x => x.name === personName);
  if (!p) {
    showToast('Person nicht gefunden', 'error');
    return;
  }

  const max = Math.max(0, parseInt(wurfSettings.maxBuys || 3, 10) || 3);
  p.boughtThrows = Math.max(0, parseInt(p.boughtThrows || 0, 10) || 0);

  if (p.boughtThrows >= max) {
    showToast('Keine Würfe mehr verfügbar', 'error');
    return;
  }

  p.boughtThrows += 1;

  closeBuyThrowModal();
  renderAll();
  persistState();

  showToast(`🎳 ${p.name} hat einen Wurf gekauft`, 'success');
}
    
// ── HELPERS ──
function isAutoTimeStrafeKey(key) {
  return key === getLateStrafeKey() || key === getEarlyLeaveStrafeKey();
}

function openLeftEarlyModalByName(personName) {
  const p = persons.find(x => x.name === personName);

  if (!p) {
    showToast('Person nicht gefunden', 'error');
    return;
  }

  openLeftEarlyModal(p);
}

function getPersonPenaltyExtraLines(p) {
  if (!p) return [];

  const lines = [];

  const tannenbaumNormal = (p.tannenbaumCharges || [])
    .filter(x => !x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const tannenbaumOnTop = (p.tannenbaumCharges || [])
    .filter(x => x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const lotterieNormal = (p.freeStrafen || [])
    .filter(x => String(x.reason || '') === 'Lotterie' && !x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const lotterieOnTop = (p.freeStrafen || [])
    .filter(x => String(x.reason || '') === 'Lotterie' && x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const tiberiusNormal = (p.freeStrafen || [])
    .filter(x => String(x.reason || '') === 'Tiberius' && !x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const tiberiusOnTop = (p.freeStrafen || [])
    .filter(x => String(x.reason || '') === 'Tiberius' && x.onTop)
    .reduce((sum, x) => sum + (parseFloat(x.amount || 0) || 0), 0);

  const latePenalty = getLatePenaltyDisplay(p);
  const earlyPenalty = getEarlyPenaltyDisplay(p);

  if (tannenbaumNormal > 0) lines.push(`🌲 +${euros(tannenbaumNormal)}`);
  if (tannenbaumOnTop > 0) lines.push(`🌲 +${euros(tannenbaumOnTop)} 🔥`);

  if (lotterieNormal > 0) lines.push(`🎰 +${euros(lotterieNormal)}`);
  if (lotterieOnTop > 0) lines.push(`🎰 +${euros(lotterieOnTop)} 🔥`);

  if (tiberiusNormal > 0) lines.push(`🏛️ +${euros(tiberiusNormal)}`);
  if (tiberiusOnTop > 0) lines.push(`🏛️ +${euros(tiberiusOnTop)} 🔥`);

  if (latePenalty) lines.push(`⏰ ${euros(latePenalty.amount)}`);
  if (earlyPenalty) lines.push(`🚪 ${euros(earlyPenalty.amount)}`);

  return lines;
}

function getVisibleStrafen() {
  return STRAFEN.filter(s => !isAutoTimeStrafeKey(s.key));
}
	
function updateVersionInfo() {
  const el = document.getElementById('versionInfo');
  if (!el) return;

  el.textContent = 'Version: ' + APPVersionSelf;
}

function updateHeaderDateTime() {
  const el = document.getElementById('header-datetime');
  if (!el) return;
  el.textContent = new Date().toLocaleString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function makeDrinkKey(label) {
  const key = label.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || ('drink_' + Date.now());
}

function normalizeTisch(value) {
  return value === 'T1' || value === 'T2' ? value : '';
}

function getMembers() { return persons.filter(p => !p.isGuest); }
function getGuests() { return persons.filter(p => p.isGuest); }
function getPresentMembers() { return persons.filter(p => p.present && !p.isGuest); }
function getPresentGuests() { return persons.filter(p => p.present && p.isGuest); }
function getPresentNotLeftPeople() { return persons.filter(p => p.present && !p.left); }
function getSpielDisplayName(spiel) { return spiel.spieltyp || 'Teamspiel'; }

function getPersonOpenAmount(p) {
  return Math.max(0, calcTotal(p) - (p.paid || 0));
}

function getPersonOverpayAmount(p) {
  return Math.max(0, (p.paid || 0) - calcTotal(p));
}

function isFullyPaid(p) {
  return getPersonOpenAmount(p) <= 0.01;
}

function columnLetter(colNum) {
  let temp = '';
  let n = colNum;
  while (n > 0) {
    let rem = (n - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    n = Math.floor((n - 1) / 26);
  }
  return temp;
}

function describeRoundDrinks(drinksObj) {
  return DRINKS
    .filter(d => (drinksObj[d.key] || 0) > 0)
    .map(d => `${drinksObj[d.key]}x ${d.label}`)
    .join(', ');
}

function calcRoundTotal(drinksObj) {
  return DRINKS.reduce((sum, d) => sum + ((drinksObj[d.key] || 0) * (prices[d.key] || 0)), 0);
}

function getPersonTeamspielBreakdown(p) {
  const result = [];
  spiele.forEach(s => {
    if ((s.members || []).includes(p.name)) {
      result.push({ spieltyp: getSpielDisplayName(s), betrag: s.proKopf || 0 });
    }
  });
  return result;
}
    
function getAvatarFileCandidates(name) {
  const clean = String(name || '').trim();

  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const base = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return [
    `bilder/${base}.jpg`,
    `bilder/${base}.jpeg`,
    `bilder/${base}.png`,
    `bilder/${base}.webp`
  ];
}
    
function getAvatarHtml(name) {
  const initials = String(name || '')
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const candidates = getAvatarFileCandidates(name);
  const fallback = `<span class="person-avatar-fallback">${initials}</span>`;

  const imgTag = `
    <img
      src="${candidates[0]}"
      alt="${name}"
      onerror="
        if(this.dataset.tryIndex===undefined){this.dataset.tryIndex='0';}
        var files = ${JSON.stringify(candidates).replace(/"/g, '&quot;')};
        var next = parseInt(this.dataset.tryIndex,10) + 1;
        if(next < files.length){
          this.dataset.tryIndex = String(next);
          this.src = files[next];
        } else {
            var parent = this.parentElement;
            this.remove();
            if (parent) {
              var fb = parent.querySelector('.person-avatar-fallback');
              if (fb) fb.style.display = 'flex';
            }
        }
      "
    >
  `;

  return `
    <div class="person-avatar">
      ${imgTag}
      <span class="person-avatar-fallback" style="display:none;">${initials}</span>
    </div>
  `;
}
 
// ── PREISE SPEICHERN ──
async function savePrices() {
  DRINKS.forEach(d => {
    const el = document.getElementById('price-input-' + d.key);
    if (el) prices[d.key] = parseFloat(String(el.value).replace(',', '.')) || 0;
  });

  recalcTeamExtras();
  renderAll();
  persistState();
  showToast('✅ Preise gespeichert!', 'success');
}

// ── CALC ──
function calcDrinksTotal(p) {
  return DRINKS.reduce((s, d) => s + (p.drinks[d.key] || 0) * (prices[d.key] || 0), 0);
}

function calcRoundsTotal(p) {
  return (p.rounds || []).reduce((sum, r) => sum + (r.total || 0), 0);
}

function calcTotal(p) {
  return calcDrinksTotal(p) + (p.teamExtra || 0) + (p.roundExtra || 0);
}

function recalcTeamExtras() {
  persons.forEach(p => {
    p.teamExtra = 0;
    p.roundExtra = calcRoundsTotal(p);
  });

  spiele.forEach(s => {
    const total = DRINKS.reduce((sum, d) => sum + (s.drinks[d.key] || 0) * (prices[d.key] || 0), 0);
    s.total = total;
    s.proKopf = (s.members && s.members.length) ? total / s.members.length : 0;

    (s.members || []).forEach(name => {
      const p = persons.find(x => x.name === name);
      if (p) p.teamExtra = (p.teamExtra || 0) + s.proKopf;
    });
  });
}
   
function getBahnElapsedSeconds() {
  if (!bahnTimerStart) return 0;

  if (!bahnTimerRunning) {
    return Math.max(0, parseInt(localStorage.getItem(getBahnStoppedKey()) || '0', 10) || 0);
  }

  const start = new Date(bahnTimerStart).getTime();
  if (!start || isNaN(start)) return 0;

  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

function getBahnStoppedKey() {
  return 'kcis_bahn_stopped_seconds_' + getClubFirestoreId(ACTIVE_CLUB || 'club');
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function calcBahnPreis() {
  const seconds = getBahnElapsedSeconds();
  if (seconds <= 0) return 0;

  const startedHalfHours = Math.ceil(seconds / 1800);
  return startedHalfHours * ((bahnPreisProStunde || 0) / 2);
}

function updateBahnDisplay() {
  const seconds = getBahnElapsedSeconds();
  const zeit = formatDuration(seconds);
  const preis = euros(calcBahnPreis());

  const statZeit = document.getElementById('stat-bahnzeit');
  const statPreis = document.getElementById('stat-bahnpreis');
  const settingsZeit = document.getElementById('settings-bahnzeit');
  const settingsPreis = document.getElementById('settings-bahnpreis');
  const btn = document.getElementById('bahnTimerBtn');
  const input = document.getElementById('bahn-preis-input');

  if (statZeit) statZeit.textContent = zeit;
  if (statPreis) statPreis.textContent = preis;
  if (settingsZeit) settingsZeit.textContent = zeit;
  if (settingsPreis) settingsPreis.textContent = preis;

    if (btn) {
      btn.textContent = bahnTimerRunning
        ? '⏸ Bahn stoppen'
        : '▶ Bahn starten';

      btn.classList.remove('bahn-running', 'bahn-stopped');

      if (bahnTimerRunning) {
        btn.classList.add('bahn-running');
      } else {
        btn.classList.add('bahn-stopped');
      }
    }

  if (input && document.activeElement !== input) {
    input.value = (bahnPreisProStunde || 0).toFixed(2);
  }
}

function toggleBahnTimer() {
  if (!bahnTimerRunning) {
    const stoppedSeconds = parseInt(localStorage.getItem(getBahnStoppedKey()) || '0', 10) || 0;
    bahnTimerStart = new Date(Date.now() - stoppedSeconds * 1000).toISOString();
    bahnTimerRunning = true;
    showToast('▶ Bahnzeit gestartet', 'success');
  } else {
    const seconds = getBahnElapsedSeconds();
    localStorage.setItem(getBahnStoppedKey(), String(seconds));
    bahnTimerRunning = false;
    showToast('⏸ Bahnzeit gestoppt', 'success');
  }

  updateBahnDisplay();
  persistState();
}

function saveBahnPreis() {
  const input = document.getElementById('bahn-preis-input');
  bahnPreisProStunde = parseFloat(String(input?.value || '0').replace(',', '.')) || 0;

  updateBahnDisplay();
  persistState();
  showToast('✅ Bahnpreis gespeichert', 'success');
}

function previewBahnPreis() {
  const input = document.getElementById('bahn-preis-input');
  bahnPreisProStunde = parseFloat(String(input?.value || '0').replace(',', '.')) || 0;
  updateBahnDisplay();
}
                                         
function getTeamCountdownRemainingSeconds() {
  if (!teamStopwatchActive) return 0;

  let remaining = teamCountdownRemainingBefore || teamCountdownDuration || 0;

  if (teamStopwatchRunning && teamStopwatchStart) {
    const start = new Date(teamStopwatchStart).getTime();
    if (start && !isNaN(start)) {
      remaining -= Math.floor((Date.now() - start) / 1000);
    }
  }

  return Math.max(0, remaining);
}
                                         
function toggleTeamStopwatch() {
  if (teamStopwatchRunning) {
    pauseTeamStopwatch();
  } else {
    startTeamStopwatch();
  }
}

function formatStopwatch(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  return [m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function updateTeamStopwatchDisplay() {
  const global = document.getElementById('team-stopwatch-global');
  const timeEl = document.getElementById('team-stopwatch-time');
  const check = document.getElementById('team-stopwatch-active-check');
  const settings = document.getElementById('team-countdown-settings');
  const input = document.getElementById('team-countdown-minutes');
  const toggleBtn = document.getElementById('team-stopwatch-toggle-btn');

  const remaining = getTeamCountdownRemainingSeconds();

  if (global) global.classList.toggle('hidden', !teamStopwatchActive);
  if (settings) settings.classList.toggle('hidden', !teamStopwatchActive);
  if (timeEl) timeEl.textContent = formatStopwatch(remaining);
  if (check) check.checked = !!teamStopwatchActive;

  if (input && document.activeElement !== input) {
    input.value =
      teamCountdownDuration > 0
        ? String(Math.ceil(teamCountdownDuration / 60))
        : '';
  }

  if (teamStopwatchRunning && remaining <= 0) {
    teamStopwatchRunning = false;
    teamStopwatchStart = null;
    teamCountdownRemainingBefore = 0;

    showToast('⏰ Tannenbaum-Countdown abgelaufen', 'success');
    persistState();
  }

  if (toggleBtn) {
    if (teamStopwatchRunning) {
      toggleBtn.textContent = '⏸ Pause';
      toggleBtn.classList.remove('start');
      toggleBtn.classList.add('pause');
    } else {
      toggleBtn.textContent = '▶ Start';
      toggleBtn.classList.remove('pause');
      toggleBtn.classList.add('start');
    }
  }

  updateCountdownFixedPosition();

  if (typeof updateTannenbaumCountdownSummary === 'function') {
    updateTannenbaumCountdownSummary();
  }
}

function toggleTeamStopwatchActive() {
  const check = document.getElementById('team-stopwatch-active-check');
  teamStopwatchActive = !!check?.checked;

  if (!teamStopwatchActive) {
    teamStopwatchRunning = false;
    teamStopwatchStart = null;
  }

  updateTeamStopwatchDisplay();
  persistState();
}

function saveTeamCountdownDuration() {
  const input = document.getElementById('team-countdown-minutes');
  const minutes = parseInt(input?.value || '0', 10) || 0;

  teamCountdownDuration = Math.max(0, minutes * 60);
  teamCountdownRemainingBefore = teamCountdownDuration;
  teamStopwatchRunning = false;
  teamStopwatchStart = null;

  updateTeamStopwatchDisplay();
  persistState();
}

function previewTeamCountdownDuration() {
  const input = document.getElementById('team-countdown-minutes');
  const minutes = parseInt(input?.value || '0', 10) || 0;

  teamCountdownDuration = Math.max(0, minutes * 60);
  teamCountdownRemainingBefore = teamCountdownDuration;
  teamStopwatchRunning = false;
  teamStopwatchStart = null;

  updateTeamStopwatchDisplay();
}

function startTeamStopwatch() {
  if (!teamStopwatchActive) teamStopwatchActive = true;

  if (!teamCountdownDuration && !teamCountdownRemainingBefore) {
    showToast('Bitte zuerst eine Countdown-Zeit einstellen', 'error');
    return;
  }

  if (teamStopwatchRunning) return;

  if (getTeamCountdownRemainingSeconds() <= 0) {
    teamCountdownRemainingBefore = teamCountdownDuration;
  }

  teamStopwatchRunning = true;
  teamStopwatchStart = new Date().toISOString();

  updateTeamStopwatchDisplay();
  persistState();
}

function pauseTeamStopwatch() {
  if (!teamStopwatchRunning) return;

  teamCountdownRemainingBefore = getTeamCountdownRemainingSeconds();
  teamStopwatchRunning = false;
  teamStopwatchStart = null;

  updateTeamStopwatchDisplay();
  persistState();
}

function stopTeamStopwatch() {
  teamStopwatchRunning = false;
  teamStopwatchStart = null;
  teamCountdownRemainingBefore = teamCountdownDuration;

  updateTeamStopwatchDisplay();
  persistState();
}

function restartTeamStopwatch() {
  if (!teamCountdownDuration) {
    showToast('Bitte zuerst eine Countdown-Zeit einstellen', 'error');
    return;
  }

  teamCountdownRemainingBefore = teamCountdownDuration;
  teamStopwatchStart = new Date().toISOString();
  teamStopwatchRunning = true;
  teamStopwatchActive = true;

  updateTeamStopwatchDisplay();
  persistState();
}     
  
// ──-───────────────────────────────────────────────────────────────────────
// ── CREATE GAME ──
function createLotterieState() {
  return {
    active: false,
    onTop: false,
    amountsGenerated: false,
    columnCount: 0,
    columns: [],
    throws: {},
    finished: false,
    history: []
  };
}

function createTiberiusState() {
  return {
    active: false,
    onTop: false,
    targetsGenerated: false,
    columnCount: 0,
    targets: [],
    score: 0,
    throws: [],
    undoStack: [],
    penalties: {},
    pendingHit: null,
    finished: false,
    history: []
  };
}

tannenbaumState = createTannenbaumState();
dartsState = createDartsState();
lotterieState = createLotterieState();
tiberiusState = createTiberiusState();
    
// ──-───────────────────────────────────────────────────────────────────────
function ensureLotterieState() {
  if (!lotterieState) lotterieState = createLotterieState();
  if (!Array.isArray(lotterieState.columns)) lotterieState.columns = [];
  if (!lotterieState.throws) lotterieState.throws = {};
  if (!Array.isArray(lotterieState.history)) lotterieState.history = [];
  lotterieState.active = !!lotterieState.active;
    lotterieState.columnCount = parseInt(lotterieState.columnCount || 0, 10) || 0;
  lotterieState.onTop = !!lotterieState.onTop;
  lotterieState.amountsGenerated = !!lotterieState.amountsGenerated;
  lotterieState.finished = !!lotterieState.finished;
}

function ensureTiberiusState() {
  if (!tiberiusState) tiberiusState = createTiberiusState();

  if (!Array.isArray(tiberiusState.targets)) tiberiusState.targets = [];
  if (!Array.isArray(tiberiusState.throws)) tiberiusState.throws = [];
    if (!Array.isArray(tiberiusState.undoStack)) tiberiusState.undoStack = [];
  if (!tiberiusState.penalties) tiberiusState.penalties = {};
  if (!Array.isArray(tiberiusState.history)) tiberiusState.history = [];

  tiberiusState.columnCount = parseInt(tiberiusState.columnCount || 0, 10) || 0;
  tiberiusState.score = parseInt(tiberiusState.score || 0, 10) || 0;
  tiberiusState.active = !!tiberiusState.active;
  tiberiusState.onTop = !!tiberiusState.onTop;
  tiberiusState.targetsGenerated = !!tiberiusState.targetsGenerated;
  tiberiusState.finished = !!tiberiusState.finished;
}
 
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

  const players = getActivePlayersForSoloGame();
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

  lotterieState.columns = Array.from({ length: colCount }, (_, i) => {
    return roundTo10Cent(lotterieState.columns[i] || 0);
  });

  const missingAmounts = lotterieState.columns.some(v => !v || v <= 0);

  if (missingAmounts) {
    showToast('Bitte alle Beträge eingeben oder zufällig erzeugen', 'error');
    return;
  }

  lotterieState.active = true;
  lotterieState.finished = false;
  lotterieState.throws = {};
  lotterieState.amountsGenerated = true;

  players.forEach(p => {
    lotterieState.throws[p.name] = Array.from({ length: colCount }, () => null);
  });

  renderLotterie();
  persistState();

  showToast('🎰 Lotterie gestartet', 'success');
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

function confirmLotterieThrow(value) {
  ensureLotterieState();

  const personName = lotterieEdit.person;
  const colIndex = lotterieEdit.colIndex;

  if (!personName || colIndex === null || colIndex === undefined) return;

  if (!lotterieState.throws[personName]) {
    lotterieState.throws[personName] = [];
  }

  lotterieState.throws[personName][colIndex] = value;

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

  closeLotterieThrowModal();
  renderAll();
  persistState();

  showToast(value === 12 ? '👑 Kranz eingetragen' : `🎳 ${value} Pins eingetragen`, 'success');
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

// ──-───────────────────────────────────────────────────────────────────────
// ── STRAFENLIMIT ──       
function saveStrafenLimit() {
  const input = document.getElementById('strafen-limit-input');
  STRAFEN_LIMIT = parseFloat(String(input?.value || '30').replace(',', '.')) || 30;

  renderAll();
  persistState();

  showToast('✅ Strafen-Deckelung gespeichert', 'success');
}

function previewStrafenLimit() {
  const input = document.getElementById('strafen-limit-input');
  STRAFEN_LIMIT = parseFloat(String(input?.value || '30').replace(',', '.')) || 30;

  updateStats();
  renderStrafen();
}
                                    
function updateStrafenLimitInput() {
  const input = document.getElementById('strafen-limit-input');
  if (!input || document.activeElement === input) return;

  input.value = (STRAFEN_LIMIT || 30).toFixed(2);
}
                                    
// ── RENDER ──
function renderAll() {
  recalcTeamExtras();
applyGroupTheme();
  updateHeaderDateTime();
  updateStats();
  updateBahnDisplay();
  updateTeamStopwatchDisplay();
    renderPenaltyStats();
  renderTannenbaum();
  renderAnwesenheit();
  renderGruppen();
  renderGetraenke();
  renderTeamspiele();
  renderRunden();
  renderAbrechnung();
  renderPreisEditor();
  renderSpieltypSelect();
  renderSpieleKatalog();
  renderRoundReasonSelect();
  renderRoundReasonsKatalog();
    renderWurfSettings();
    renderLotterie();
    renderTiberius();
    renderLotterieSettings();
    renderTiberiusSettings();
    renderStrafenHistory();
  renderDarts();
  renderTannenbaumSettings();
  renderDartsSettings();
  renderStrafen();
  renderStrafpreisEditor();
    renderTimePenaltySettings();
    renderGroupSettings();
                                    
  updateStrafenLimitInput();
}

function updateStats() {
  const present = persons.filter(p => p.present);
  const bezahlt = present.reduce((s, p) => s + (p.paid || 0), 0);
  const offen = present.reduce((s, p) => s + getPersonOpenAmount(p), 0);
  const ueberschuss = present.reduce((s, p) => s + getPersonOverpayAmount(p), 0);
  const gesamt = present.reduce((s, p) => s + calcTotal(p), 0);
    const strafenGesamt = calcAllStrafenTotal();
    const statStrafen = document.getElementById('stat-strafen');
    
    if (statStrafen) statStrafen.textContent = euros(strafenGesamt);
    
  document.getElementById('stat-anwesend').textContent = present.length;
  document.getElementById('stat-t1').textContent = present.filter(p => p.tisch === 'T1').length;
  document.getElementById('stat-t2').textContent = present.filter(p => p.tisch === 'T2').length;
    const statT1Label = document.querySelector('#stat-t1')?.nextElementSibling;
    const statT2Label = document.querySelector('#stat-t2')?.nextElementSibling;

    if (statT1Label) statT1Label.textContent = groupSettings.T1?.name || 'Wand';
    if (statT2Label) statT2Label.textContent = groupSettings.T2?.name || 'TV';
  document.getElementById('stat-offen').textContent = euros(offen);
  document.getElementById('stat-bezahlt').textContent = euros(bezahlt);
  document.getElementById('stat-ueberschuss').textContent = euros(ueberschuss);
  document.getElementById('stat-gesamt').textContent = euros(gesamt);

    const gosseKingEl = document.getElementById('stat-gosseking');
    if (gosseKingEl) {
      const kings = getGosseKings();
      gosseKingEl.textContent = kings.length ? kings.join(', ') : '—';
    }
}

function renderTimePenaltySettings() {
  const startInput = document.getElementById('penalty-start-time');
  const endInput = document.getElementById('penalty-end-time');

  if (startInput && document.activeElement !== startInput) {
    startInput.value = timePenaltySettings.startTime || '20:00';
  }

  if (endInput && document.activeElement !== endInput) {
    endInput.value = timePenaltySettings.endTime || '23:00';
  }
}

function getLateStrafeKey() {
  const found = STRAFEN.find(s => {
    const label = String(s.label || '').toLowerCase();
    return label.includes('verspät') || label.includes('verspaet');
  });

  return found ? found.key : null;
}

function getEarlyLeaveStrafeKey() {
  const found = STRAFEN.find(s => {
    const label = String(s.label || '').toLowerCase();
    return label.includes('früh') || label.includes('frueh') || label.includes('zu früh') || label.includes('zu frueh');
  });

  return found ? found.key : null;
}

function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;

  const [h, m] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function getNowTimeString() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function calcStartedQuarterHours(minutesDiff) {
  if (minutesDiff <= 0) return 0;
  return Math.ceil(minutesDiff / 15);
}

function calcLateCount(p) {
  const start = timeStringToMinutes(timePenaltySettings.startTime || '20:00');
  const arrival = timeStringToMinutes(p.arrivalTime || '');

  if (start === null || arrival === null) return 0;

  return calcStartedQuarterHours(arrival - start);
}

function calcLeftEarlyCount(p) {
  const end = timeStringToMinutes(timePenaltySettings.endTime || '23:00');
  const left = timeStringToMinutes(p.leftEarlyAt || '');

  if (end === null || left === null) return 0;

  return calcStartedQuarterHours(end - left);
}

function saveTimePenaltySettings() {
  const startInput = document.getElementById('penalty-start-time');
  const endInput = document.getElementById('penalty-end-time');

  timePenaltySettings.startTime = startInput?.value || '20:00';
  timePenaltySettings.endTime = endInput?.value || '23:00';

  renderTimePenaltySettings();
  renderStrafen();
  persistState();

  showToast('✅ Zeiten gespeichert', 'success');
}

function renderWurfSettings() {
  const input = document.getElementById('wurf-max-buys');
  if (!input) return;

  if (document.activeElement !== input) {
    input.value = parseInt(wurfSettings.maxBuys || 3, 10) || 3;
  }
}

function saveWurfSettings() {
  const input = document.getElementById('wurf-max-buys');

  wurfSettings.maxBuys = Math.max(
    0,
    parseInt(input?.value || '3', 10) || 3
  );

  renderWurfSettings();
  renderStrafen();
  persistState();

  showToast('✅ Würfe-Einstellung gespeichert', 'success');
}

function renderPersonCards(targetId, list) {
  const g = document.getElementById(targetId);
  if (!g) return;

  g.innerHTML = '';

  const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (!sorted.length) {
    g.innerHTML = `<div style="font-size:0.8rem;color:var(--muted);padding:8px 0;">Noch niemand vorhanden</div>`;
    return;
  }

  sorted.forEach(p => {
    const c = document.createElement('div');
    c.className = 'person-card' + (p.present ? ' present' : ' absent') + (p.isGuest ? ' guest' : '');

    let badgeClass = p.present ? 'present-badge' : 'absent-badge';
    let badgeText = p.present ? 'DA' : 'FEHLT';

    if (p.present && p.left) {
      badgeClass = 'left-badge';
      badgeText = 'RAUS';
    }

    const timeHtml = (p.arrivalTime || p.leftEarlyAt)
      ? `
        <div class="person-times">
          ${p.arrivalTime ? `<div>⏰ Ankunft: <strong>${p.arrivalTime}</strong></div>` : ''}
          ${p.leftEarlyAt ? `<div>🚪 Weg: <strong>${p.leftEarlyAt}</strong></div>` : ''}
        </div>
      `
      : `<div class="person-times empty">Keine Zeit gesetzt</div>`;

    c.innerHTML = `
      <button
        class="person-delete-btn"
        onclick="deletePerson('${escapeForJs(p.name)}'); event.stopPropagation();"
      >✕</button>

      ${getAvatarHtml(p.name)}

      <div class="person-name">${p.name}</div>
      <div class="person-role">${p.isGuest ? 'Gastkegler' : 'Mitglied'}</div>

      ${timeHtml}

      ${p.present ? `
        <button
          type="button"
          class="mini-action-btn"
          onclick="event.stopPropagation(); openLeftEarlyModalByName('${escapeForJs(p.name)}')"
        >
          🚪 Gehzeit
        </button>
      ` : ''}

      <div class="${badgeClass}">${badgeText}</div>
    `;

    c.onclick = () => {
      const wasPresent = !!p.present;
      p.present = !p.present;

      if (!p.present) {
        p.tisch = '';
        p.left = false;
        p.leftAt = '';
        p.arrivalTime = '';
        p.leftEarlyAt = '';
      }

      if (!wasPresent && p.present) {
        playSound(sounds.welcome);

        renderAll();
        persistState();

        openArrivalModal(p);
        return;
      }

      renderAll();
      persistState();
    };

    g.appendChild(c);
  });
}

function renderAnwesenheit() {
  renderPersonCards('persons-grid-members', getMembers());
  renderPersonCards('persons-grid-guests', getGuests());
}

function renderDrinkRows(list, body, startIndex = 0) {
  let rowIndex = startIndex;

  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'default';

    const isAlt = rowIndex % 2 === 1;
    const classes = [];

    if (isAlt) classes.push('alt-row');
    if (p.left) classes.push('left-row');

    tr.className = classes.join(' ');

    const leftClass = p.left ? 'left-state' : '';
    const leftEmoji = p.left ? '<span class="left-emoji">🏡</span>' : '';

    const tl = p.tisch
      ? `<span class="ptisch ${p.tisch.toLowerCase()}">${getGroupLabel(p.tisch)}</span>`
      : `<span class="ptisch">Kein Team</span>`;

    const avatarHtml = getAvatarHtml(p.name)
      .replace('class="person-avatar"', 'class="table-avatar"');

    const te = p.teamExtra || 0;
    const re = p.roundExtra || 0;
    const paid = p.paid || 0;

    const extrasHtml = `
      <div style="font-size:0.58rem;line-height:1.25;margin-top:2px;">
        ${te > 0 ? `<div style="color:var(--accent2);font-weight:800;">🚨 Strafen +${te.toFixed(2).replace('.', ',')}€</div>` : ''}
        ${re > 0 ? `<div style="color:var(--round);font-weight:800;">🍻 Runden +${re.toFixed(2).replace('.', ',')}€</div>` : ''}
      </div>
    `;

    let html = `
<td class="sticky-col">
  <div class="person-cell ${leftClass}">
    <div class="table-person-inline">
      ${avatarHtml}
      <div style="min-width:0;">
        <span class="pname">${leftEmoji}${p.name}</span>
        ${p.isGuest ? '<span class="prole">Gastkegler</span>' : ''}
        ${tl}
        ${extrasHtml}
      </div>
    </div>
  </div>
</td>
    `;

    DRINKS.forEach(d => {
      const v = p.drinks[d.key] || 0;

      html += `
        <td>
          <div class="counter">
            <button type="button" class="counter-btn minus" onclick="changeDrink('${escapeForJs(p.name)}','${escapeForJs(d.key)}',-1)">−</button>
            <span class="counter-val">${v}</span>
            <button type="button" class="counter-btn plus" onclick="changeDrink('${escapeForJs(p.name)}','${escapeForJs(d.key)}',1)">+</button>
          </div>
        </td>
      `;
    });

    html += `
      <td class="total-cell">
        ${calcTotal(p).toFixed(2).replace('.', ',')}€
      </td>
      <td class="paid-cell ${paid > 0 ? '' : 'zero'}">
        ${paid > 0 ? paid.toFixed(2).replace('.', ',') + '€' : '—'}
      </td>
    `;

    tr.innerHTML = html;
    body.appendChild(tr);
    rowIndex++;
  });

  return rowIndex;
}
        
function renderGetraenke() {
  const members = getPresentMembers().sort((a, b) => {
    if (!!a.left !== !!b.left) return a.left ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });

  const guests = getPresentGuests().sort((a, b) => {
    if (!!a.left !== !!b.left) return a.left ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });

  let headerHtml = '<th class="sticky-col name-col">Name</th>';
  headerHtml += DRINKS.map(d => `<th class="drink-col">${d.label}</th>`).join('');

headerHtml += '<th class="sum-col">Gesamt</th><th class="sum-col">Bezahlt</th>';

  document.getElementById('drinks-header').innerHTML = headerHtml;

const totalCols = 1 + DRINKS.length + 2;

  const body = document.getElementById('drinks-body');
  body.innerHTML = '';

  let rowIndex = 0;
rowIndex = renderDrinkRows(members, body, rowIndex);

  if (members.length && guests.length) {
    const sep = document.createElement('tr');
    sep.className = 'guest-separator-row';
    sep.innerHTML = `<td colspan="${totalCols}">Gastkegler</td>`;
    body.appendChild(sep);
  }

rowIndex = renderDrinkRows(guests, body, rowIndex);

  if (!members.length && !guests.length) {
    body.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center;padding:24px;color:var(--muted)">Niemand anwesend</td></tr>`;
  }
}

async function changeSyncedPersonCounter(
  personName,
  category,
  key,
  delta
) {
  if (!ACTIVE_CLUB || !window.firestoreApi) {
    showToast('❌ Keine Firestore-Verbindung verfügbar', 'error');
    return;
  }

  const person = persons.find(p => p.name === personName);

  if (!person || person.left) return;

  if (category === 'strafen' && !person.present) {
    return;
  }

  if (!navigator.onLine) {
    showToast(
      '📴 Diese Eingabe ist offline derzeit nicht möglich',
      'error'
    );
    return;
  }

  try {
    const clubId = getClubFirestoreId(ACTIVE_CLUB);

    await window.firestoreApi.changeLivePersonCounter(
      clubId,
      personName,
      category,
      key,
      delta
    );
  } catch (error) {
    console.error(
      'Synchronisierte Zähleränderung fehlgeschlagen:',
      error
    );

    showToast(
      '❌ Änderung konnte nicht gespeichert werden',
      'error'
    );
  }
}

async function changeDrink(name, key, delta) {
  await changeSyncedPersonCounter(
    name,
    'drinks',
    key,
    delta
  );
}

function openDrinkEditModal() {
  return;
}

function changeDrinkEdit(key, delta) {
  drinkEditDraft[key] = Math.max(0, (drinkEditDraft[key] || 0) + delta);

  const el = document.getElementById('drink-edit-' + key);
  if (el) el.textContent = drinkEditDraft[key];
}
    
function applyDrinkFast(key, delta) {
  if (!drinkEditPerson) return;

  if (!drinkEditPerson.drinks) drinkEditPerson.drinks = {};

  drinkEditPerson.drinks[key] = Math.max(
    0,
    (drinkEditPerson.drinks[key] || 0) + delta
  );

  closeDrinkEditModal();
  renderGetraenke();
  updateStats();
  renderAbrechnung();
  persistState();

  showToast('🍺 Getränk direkt gebucht', 'success');
}
    
function confirmDrinkEdit() {
  if (!drinkEditPerson) return;

  let hasChanges = false;

  DRINKS.forEach(d => {
    const addValue = drinkEditDraft[d.key] || 0;
    if (addValue > 0) hasChanges = true;

    drinkEditPerson.drinks[d.key] = (drinkEditPerson.drinks[d.key] || 0) + addValue;
  });

  closeDrinkEditModal();

  renderGetraenke();
  updateStats();
  renderAbrechnung();
  persistState();

  showToast(hasChanges ? '🍺 Getränke hinzugefügt' : 'Keine Getränke hinzugefügt', 'success');
}

function closeDrinkEditModal() {
  document.getElementById('drink-edit-modal').classList.add('hidden');
  document.getElementById('drink-edit-list').innerHTML = '';
  drinkEditPerson = null;
  drinkEditDraft = {};
}
    
// ── RUNDE GEBEN ──
function openRoundModal() {
  const select = document.getElementById('round-person-select');
  const list = getPresentNotLeftPeople().sort((a, b) => a.name.localeCompare(b.name, 'de'));

	renderRoundReasonSelect();

  roundDraftDrinks = {};
  DRINKS.forEach(d => roundDraftDrinks[d.key] = 0);

  select.innerHTML = '<option value="">Bitte Person wählen</option>';
  list.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  document.getElementById('round-drinks-area').classList.add('hidden');
  document.getElementById('round-total-display').textContent = '0,00 €';
  document.getElementById('round-modal').classList.remove('hidden');
}

function closeRoundModal() {
  document.getElementById('round-modal').classList.add('hidden');
}

function handleRoundPersonChange() {
  const selected = document.getElementById('round-person-select').value;
  const area = document.getElementById('round-drinks-area');
  const grid = document.getElementById('round-drinks-grid');

  if (!selected) {
    area.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }

  area.classList.remove('hidden');
  grid.innerHTML = '';

  DRINKS.forEach(d => {
    const v = roundDraftDrinks[d.key] || 0;
    const row = document.createElement('div');
    row.className = 'round-drink-row';
    row.innerHTML = `
      <span class="round-drink-name">${d.label}</span>
      <div class="counter">
        <button class="counter-btn minus" onclick="changeRoundDrink('${escapeForJs(d.key)}',-1)">−</button>
        <span class="counter-val" id="round-count-${d.key}">${v}</span>
        <button class="counter-btn plus" onclick="changeRoundDrink('${escapeForJs(d.key)}',1)">+</button>
      </div>
    `;
    grid.appendChild(row);
  });

  updateRoundTotalDisplay();
}

function changeRoundDrink(key, delta) {
  roundDraftDrinks[key] = Math.max(0, (roundDraftDrinks[key] || 0) + delta);
  const el = document.getElementById('round-count-' + key);
  if (el) el.textContent = roundDraftDrinks[key];
  updateRoundTotalDisplay();
}

function updateRoundTotalDisplay() {
  document.getElementById('round-total-display').textContent = euros(calcRoundTotal(roundDraftDrinks));
}

function confirmGiveRound() {
  const personName = document.getElementById('round-person-select').value.trim();
  const roundReason = (document.getElementById('round-reason-select')?.value || '').trim();
  if (!personName) {
    showToast('Bitte erst auswählen, wer die Runde gibt', 'error');
    return;
  }

  if (!DRINKS.some(d => (roundDraftDrinks[d.key] || 0) > 0)) {
    showToast('Bitte mindestens ein Getränk eintragen', 'error');
    return;
  }

  const p = persons.find(x => x.name === personName);
  if (!p) {
    showToast('Person nicht gefunden', 'error');
    return;
  }

  if (!Array.isArray(p.rounds)) p.rounds = [];

	if (!roundReason) {
	  showToast('Bitte einen Grund auswählen', 'error');
	  return;
	}

  const roundTotal = calcRoundTotal(roundDraftDrinks);
  p.rounds.push({
	reason: roundReason,
    drinks: { ...roundDraftDrinks },
    total: roundTotal,
    createdAt: new Date().toISOString()
  });

  p.roundExtra = calcRoundsTotal(p);

  closeRoundModal();
  renderAll();
  showToast(`🍻 Runde auf ${p.name} gebucht`, 'success');
  persistState();
}

function renderRunden() {
  const list = document.getElementById('runden-list');
  list.innerHTML = '';

  const entries = [];
  persons.forEach(p => {
    (p.rounds || []).forEach((r, idx) => {
      entries.push({
        person: p.name,
        tisch: p.tisch,
        isGuest: p.isGuest,
        round: r,
        idx
      });
    });
  });

  entries.sort((a, b) => new Date(b.round.createdAt || 0) - new Date(a.round.createdAt || 0));

  if (!entries.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:20px">Noch keine Runden gebucht</div>';
    return;
  }

  entries.forEach(entry => {
    const c = document.createElement('div');
    c.className = 'spiel-card';
    c.innerHTML = `
      <div class="spiel-info">
        <div class="spiel-verlierer round">🍻 ${entry.person} hat eine Runde gegeben</div>
		<div class="spiel-detail"><strong>${entry.round.reason || 'Ohne Grund'}</strong></div>
        <div class="spiel-detail">${describeRoundDrinks(entry.round.drinks) || 'Keine Getränke'}</div>
        <div class="spiel-detail">${entry.round.createdAt ? formatDateTime(entry.round.createdAt) : ''}</div>
      </div>
      <div>
        <div class="spiel-betrag round">${(entry.round.total || 0).toFixed(2).replace('.', ',')}€</div>
      </div>
      <button class="del-spiel-btn" onclick="deleteRound('${escapeForJs(entry.person)}', ${entry.idx})">✕</button>
    `;
    list.appendChild(c);
  });
}

function deleteRound(personName, roundIndex) {
  const p = persons.find(x => x.name === personName);
  if (!p || !Array.isArray(p.rounds)) return;
  p.rounds.splice(roundIndex, 1);
  p.roundExtra = calcRoundsTotal(p);
  renderAll();
  persistState();
  showToast('🗑️ Runde gelöscht', 'success');
}

// ── TEAMSPIELE ──
function selectLoser(t) {
  selectedLoser = t;
  document.getElementById('team-btn-t1').classList.toggle('active', t === 'T1');
  document.getElementById('team-btn-t2').classList.toggle('active', t === 'T2');
  updateTeamInfoBox();
  persistState();
}

function getActiveTeamMembers(teamKey) {
  return persons.filter(p => p.present && p.tisch === teamKey && !p.left);
}

function updateTeamInfoBox() {
  const box = document.getElementById('team-info-box');
  if (!selectedLoser) {
    box.innerHTML = 'Als „weg“ markierte Leute werden bei Teamspielen nicht mehr berücksichtigt.';
    return;
  }

  const members = getActiveTeamMembers(selectedLoser);
  const teamName = selectedLoser === 'T1' ? getGroupLabel('T1') : getGroupLabel('T2');

  box.innerHTML = `<strong>${teamName}</strong><br>Aktive Spieler für Aufteilung: ${members.length ? members.map(m => m.name).join(', ') : 'niemand'}`;
}

function renderTeamspiele() {
  const g = document.getElementById('team-drinks-grid');
  g.innerHTML = '';

  updateTeamInfoBox();
    
    const btnT1 = document.getElementById('team-btn-t1');
    const btnT2 = document.getElementById('team-btn-t2');

    if (btnT1) btnT1.textContent = `${getGroupLabel('T1')} verloren`;
    if (btnT2) btnT2.textContent = `${getGroupLabel('T2')} verloren`;

  DRINKS.forEach(d => {
    const v = teamDrinks[d.key] || 0;
    const r = document.createElement('div');
    r.className = 'team-drink-row';
    r.innerHTML = `
      <span class="team-drink-name">${d.label}</span>
      <div class="counter">
        <button class="counter-btn minus" onclick="changeTeamDrink('${escapeForJs(d.key)}',-1)">−</button>
        <span class="counter-val" id="td-${d.key}">${v}</span>
        <button class="counter-btn plus" onclick="changeTeamDrink('${escapeForJs(d.key)}',1)">+</button>
      </div>
    `;
    g.appendChild(r);
  });

  const list = document.getElementById('spiele-list');
  list.innerHTML = '';

  if (!spiele.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:20px">Noch keine Spiele eingetragen</div>';
    return;
  }

  spiele.forEach((s, i) => {
    const di = DRINKS
      .filter(d => (s.drinks[d.key] || 0) > 0)
      .map(d => `${s.drinks[d.key]}x ${d.label}`)
      .join(', ');

    const displayMembers = (s.members || []).join(', ');

    const c = document.createElement('div');
    c.className = 'spiel-card';
    c.innerHTML = `
      <div class="spiel-info">
        <div class="spiel-verlierer ${s.loser.toLowerCase()}">❌ ${s.loser === 'T1' ? getGroupLabel('T1') : getGroupLabel('T2')} hat verloren</div>
        <div class="spiel-detail"><strong>${getSpielDisplayName(s)}</strong></div>
        <div class="spiel-detail">${di || 'Keine Getränke'}</div>
        <div class="spiel-detail">Aufgeteilt auf: ${displayMembers || '?'}</div>
      </div>
      <div>
        <div class="spiel-betrag">${(s.total || 0).toFixed(2).replace('.', ',')}€</div>
        <div class="spiel-pro-kopf">${(s.proKopf || 0).toFixed(2).replace('.', ',')}€/Person</div>
      </div>
      <button class="del-spiel-btn" onclick="deleteSpiel(${i})">✕</button>
    `;
    list.appendChild(c);
  });
}

function changeTeamDrink(key, delta) {
  teamDrinks[key] = Math.max(0, (teamDrinks[key] || 0) + delta);
  const el = document.getElementById('td-' + key);
  if (el) el.textContent = teamDrinks[key];
  persistState();
}

function addSpiel() {
  if (!selectedLoser) {
    showToast('Bitte zuerst Verlierer-Team wählen!', 'error');
    return;
  }

  const spieltyp = (document.getElementById('spieltyp-select')?.value || '').trim();
  if (!spieltyp) {
    showToast('Bitte zuerst ein Spiel auswählen!', 'error');
    return;
  }

  if (!DRINKS.some(d => (teamDrinks[d.key] || 0) > 0)) {
    showToast('Bitte mindestens ein Getränk eintragen!', 'error');
    return;
  }

  const members = getActiveTeamMembers(selectedLoser);
  if (!members.length) {
    showToast('Keine aktiven Spieler mehr im Verlierer-Team', 'error');
    return;
  }

  const total = DRINKS.reduce((s, d) => s + (teamDrinks[d.key] || 0) * (prices[d.key] || 0), 0);

  spiele.push({
    spieltyp,
    loser: selectedLoser,
    drinks: { ...teamDrinks },
    total,
    proKopf: members.length ? total / members.length : 0,
    members: members.map(m => m.name)
  });

  teamDrinks = {};
  selectedLoser = null;
  document.getElementById('team-btn-t1').classList.remove('active');
  document.getElementById('team-btn-t2').classList.remove('active');

  renderAll();
  showToast('⚽ Spiel hinzugefügt!', 'success');
  persistState();
}

function deleteSpiel(i) {
  spiele.splice(i, 1);
  renderAll();
  persistState();
}

// ── ABRECHNUNG ──
function createAbrechGrid(list) {
  const grid = document.createElement('div');
  grid.className = 'abrech-grid';

  list.forEach(p => {
    const total = calcTotal(p);
    const pd = p.paid || 0;
    const rest = getPersonOpenAmount(p);
    const over = getPersonOverpayAmount(p);
    const fullyPaid = isFullyPaid(p);
    const left = !!p.left;

const c = document.createElement('div');
const abrechAvatarHtml = getAvatarHtml(p.name)
  .replace('class="person-avatar"', 'class="abrech-avatar"');
	  
let statusClass = ' open';
if (fullyPaid) statusClass = ' paid';
if (left) statusClass = ' left';

c.className = 'abrech-card '
  + (p.tisch || '').toLowerCase()
  + (p.isGuest ? ' guest' : '')
  + statusClass;

    const items = DRINKS
      .filter(d => (p.drinks[d.key] || 0) > 0)
      .map(d => `<div class="abrech-item"><span>${p.drinks[d.key]}x ${d.label}</span><span>${((p.drinks[d.key] || 0) * (prices[d.key] || 0)).toFixed(2).replace('.', ',')}€</span></div>`)
      .join('');

    const teamLine = (p.teamExtra || 0) > 0
      ? `<div class="abrech-item"><span>⚽ Strafen</span><span style="color:var(--accent2)">+${(p.teamExtra || 0).toFixed(2).replace('.', ',')}€</span></div>`
      : '';

	const roundLines = (p.rounds || []).map(r => `
	  <div class="abrech-item">
		<span>🍻 ${r.reason || 'Ohne Grund'}: ${describeRoundDrinks(r.drinks)}</span>
		<span style="color:var(--round)">+${(r.total || 0).toFixed(2).replace('.', ',')}€</span>
	  </div>
	`).join('');

    c.innerHTML = `
      <div class="abrech-head">
  ${abrechAvatarHtml}
  <div class="abrech-head-text">
    <div class="abrech-name">${p.name}</div>
    ${p.isGuest ? '<div class="abrech-role">Gastkegler</div>' : ''}
  </div>
</div>
      <div class="abrech-tisch">${p.tisch === 'T1' ? getGroupLabel('T1') : p.tisch === 'T2' ? getGroupLabel('T2') : 'Kein Team'}</div>
      <div class="abrech-total">${total.toFixed(2).replace('.', ',')}€</div>
      ${pd > 0 ? `<div class="abrech-paid-info">✓ Bezahlt: ${pd.toFixed(2).replace('.', ',')}€</div>` : ''}
      ${rest > 0.01 ? `<div class="abrech-rest">Noch offen: ${rest.toFixed(2).replace('.', ',')}€</div>` : ''}
      ${over > 0.01 ? `<div class="abrech-ueberschuss">Überschuss: ${over.toFixed(2).replace('.', ',')}€</div>` : ''}
      ${fullyPaid ? '<div class="abrech-paid-info">✅ Komplett bezahlt</div>' : ''}
      ${left ? `<div class="abrech-left-info">🚪 Weg seit ${formatTime(p.leftAt)}</div>` : ''}
      <div class="abrech-items">${items}${teamLine}${roundLines}${!items && !teamLine && !roundLines ? '<span style="color:var(--muted);font-size:0.7rem">Nichts bestellt</span>' : ''}</div>
      <div class="tap-hint">${left && p.leftAt ? `Weg markiert: ${formatDateTime(p.leftAt)}` : 'Antippen → Zahlung eintragen'}</div>
    `;

    c.onclick = () => openPaymentModal(p);
    grid.appendChild(c);
  });

  return grid;
}

function renderRoundReasonSelect() {
  const sel = document.getElementById('round-reason-select');
  if (!sel) return;

  sel.innerHTML = '<option value="">Bitte Grund wählen</option>';

  if (!RUNDEN_GRUENDE.length) {
    sel.innerHTML = '<option value="">Kein Grund angelegt</option>';
    return;
  }

  RUNDEN_GRUENDE.slice().sort((a, b) => a.localeCompare(b, 'de')).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function renderRoundReasonsKatalog() {
  const el = document.getElementById('rundengruende-katalog-list');
  if (!el) return;

  el.innerHTML = '';

  if (!RUNDEN_GRUENDE.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Noch keine Rundengründe angelegt</div>';
    return;
  }

  RUNDEN_GRUENDE.slice().sort((a, b) => a.localeCompare(b, 'de')).forEach(name => {
    const card = document.createElement('div');
    card.className = 'spiel-edit-card';
    card.innerHTML = `
      <label>${name}</label>
      <button class="delete-drink-btn" onclick="deleteRoundReasonFromKatalog('${escapeForJs(name)}')">✕</button>
    `;
    el.appendChild(card);
  });
}

function renderAbrechnung() {
  const present = persons.filter(p => p.present);

  const offen = present.reduce((s, p) => s + getPersonOpenAmount(p), 0);
  const bezahlt = present.reduce((s, p) => s + (p.paid || 0), 0);
  const ueberschuss = present.reduce((s, p) => s + getPersonOverpayAmount(p), 0);
  const gesamt = present.reduce((s, p) => s + calcTotal(p), 0);

  document.getElementById('sum-offen').textContent = euros(offen);
  document.getElementById('sum-bezahlt').textContent = euros(bezahlt);
  document.getElementById('sum-ueberschuss').textContent = euros(ueberschuss);
  document.getElementById('sum-gesamt').textContent = euros(gesamt);

  const members = getPresentMembers().sort((a, b) => {
    if (!!a.left !== !!b.left) return a.left ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });

  const guests = getPresentGuests().sort((a, b) => {
    if (!!a.left !== !!b.left) return a.left ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });

  const wrap = document.getElementById('abrech-content');
  wrap.innerHTML = '';

  if (members.length) wrap.appendChild(createAbrechGrid(members));

  if (guests.length) {
    const sep = document.createElement('div');
    sep.className = 'abrech-guest-separator';
    sep.textContent = 'Gastkegler';
    wrap.appendChild(sep);
    wrap.appendChild(createAbrechGrid(guests));
  }

  if (!members.length && !guests.length) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:20px">Niemand anwesend</div>';
  }
}

// ── PAYMENT MODAL ──
function renderModalTeamspielBreakdown(p) {
  const el = document.getElementById('modal-teamspiele-breakdown');
  const breakdown = getPersonTeamspielBreakdown(p);

  if (!breakdown.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div style="font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
      Verlorene Teamspiele
    </div>
    <div style="display:grid;gap:6px;">
      ${breakdown.map(item => `
        <div class="modal-meta-row">
          <span>${item.spieltyp}</span>
          <strong style="color:var(--accent2)">+${item.betrag.toFixed(2).replace('.', ',')} €</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function renderModalRoundsBreakdown(p) {
  const el = document.getElementById('modal-runden-breakdown');
  const rounds = p.rounds || [];

  if (!rounds.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div style="font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
      Runde gegeben
    </div>
    <div style="display:grid;gap:6px;">
      ${rounds.map(r => `
        <div class="modal-meta-row" style="align-items:flex-start;">
			<span style="max-width:70%;">${r.reason ? r.reason + ': ' : ''}${describeRoundDrinks(r.drinks)}</span>
          <strong style="color:var(--round)">+${(r.total || 0).toFixed(2).replace('.', ',')} €</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function openPaymentModal(p) {
  modalPerson = p;
  const total = calcTotal(p);
  const paid = p.paid || 0;
  const open = getPersonOpenAmount(p);

  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-due').textContent = total.toFixed(2).replace('.', ',') + ' €';
  document.getElementById('modal-total-display').textContent = euros(total);
  document.getElementById('modal-paid-display').textContent = euros(paid);
  document.getElementById('modal-open-display').textContent = euros(open);
  document.getElementById('modal-leftat-display').textContent = p.leftAt ? formatDateTime(p.leftAt) : '—';
  document.getElementById('modal-paid-input').value = paid > 0 ? paid.toFixed(2) : '';
  document.getElementById('modal-left-check').checked = !!p.left;

  renderModalTeamspielBreakdown(p);
  renderModalRoundsBreakdown(p);
  updateModalRest();

  document.getElementById('payment-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('modal-paid-input').focus(), 100);
}

function closeModal() {
  document.getElementById('payment-modal').classList.add('hidden');
  modalPerson = null;
}

function updateModalRest() {
  if (!modalPerson) return;
  const total = calcTotal(modalPerson);
  const paid = parseFloat(document.getElementById('modal-paid-input').value) || 0;
  const diff = total - paid;
  const el = document.getElementById('modal-rest-display');

  if (Math.abs(diff) <= 0.005) {
    el.textContent = '✅ Exakt bezahlt';
    el.className = 'modal-rest pos';
  } else if (diff > 0) {
    el.textContent = `Noch offen: ${diff.toFixed(2).replace('.', ',')} €`;
    el.className = 'modal-rest neg';
  } else {
    el.textContent = `Überschuss: ${Math.abs(diff).toFixed(2).replace('.', ',')} €`;
    el.className = 'modal-rest over';
  }
}

function getLatePenaltyDisplay(p) {
  const key = getLateStrafeKey();
  if (!key) return null;

  const count = calcLateCount(p);
  const price = strafPrices[key] || 0;
  const amount = count * price;

  if (count <= 0 || amount <= 0) return null;

  return {
    label: 'Verspätet',
    count,
    amount
  };
}

function getEarlyPenaltyDisplay(p) {
  const key = getEarlyLeaveStrafeKey();
  if (!key) return null;

  const count = calcLeftEarlyCount(p);
  const price = strafPrices[key] || 0;
  const amount = count * price;

  if (count <= 0 || amount <= 0) return null;

  return {
    label: 'Zu früh weg',
    count,
    amount
  };
}

function confirmPayment() {
  if (!modalPerson) return;

  const oldPaid = parseFloat(modalPerson.paid || 0) || 0;
  const oldLeft = !!modalPerson.left;

  const newPaid = parseFloat(document.getElementById('modal-paid-input').value) || 0;
  const newLeft = document.getElementById('modal-left-check').checked;

  modalPerson.paid = newPaid;
  modalPerson.left = newLeft;

    if (!oldLeft && newLeft) {
      closeModal();
      openLeftEarlyModal(modalPerson);
      return;
    }
  if (oldLeft && !newLeft) modalPerson.leftAt = '';

  closeModal();
  updateStats();
  renderAbrechnung();
  renderAnwesenheit();
  renderTeamspiele();
  renderRunden();
  renderGetraenke();

  if (newPaid !== oldPaid) {
    playSound(sounds.cash);
  }

  if (!oldLeft && newLeft) {
    playSound(sounds.goodbye);
  }

  showToast('✅ Zahlung gespeichert', 'success');
  persistState();
}

// ── RUNDENGRUENDE ──
function addRoundReasonToKatalog() {
  const input = document.getElementById('new-rundengrund-input');
  const name = (input.value || '').trim();
  if (!name) return;

  if (RUNDEN_GRUENDE.find(s => s.toLowerCase() === name.toLowerCase())) {
    showToast('Grund existiert bereits', 'error');
    return;
  }

  RUNDEN_GRUENDE.push(name);
  input.value = '';
  renderRoundReasonSelect();
  renderRoundReasonsKatalog();
  showToast('✅ Rundengrund hinzugefügt', 'success');
  persistState();
}

function deleteRoundReasonFromKatalog(name) {
  const used = persons.some(p => (p.rounds || []).some(r => (r.reason || '') === name));
  if (used) {
    showToast('Grund kann nicht gelöscht werden, da er bereits verwendet wurde', 'error');
    return;
  }

  if (!confirm(`Rundengrund "${name}" wirklich löschen?`)) return;

  RUNDEN_GRUENDE = RUNDEN_GRUENDE.filter(s => s !== name);
  renderRoundReasonSelect();
  renderRoundReasonsKatalog();
  showToast('🗑️ Rundengrund gelöscht', 'success');
  persistState();
}

// ── PREISE ──
function renderPreisEditor() {
  const ed = document.getElementById('prices-editor');
  ed.innerHTML = '';

  DRINKS.forEach(d => {
    const c = document.createElement('div');
    c.className = 'price-edit-card';
    c.innerHTML = `
      <label>${d.label}</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" step="0.10" min="0" class="price-input" id="price-input-${d.key}" value="${(prices[d.key] || 0).toFixed(2)}" placeholder="0.00">
        <button class="delete-drink-btn" onclick="deleteDrink('${escapeForJs(d.key)}')" title="Getränk löschen">✕</button>
      </div>
    `;
    ed.appendChild(c);
  });
}

function openDrinkModal() {
  document.getElementById('new-drink-name').value = '';
  document.getElementById('new-drink-price').value = '';
  document.getElementById('drink-modal').classList.remove('hidden');
}

function closeDrinkModal() {
  document.getElementById('drink-modal').classList.add('hidden');
}

function confirmAddDrink() {
  const name = document.getElementById('new-drink-name').value.trim();
  const price = parseFloat(String(document.getElementById('new-drink-price').value).replace(',', '.')) || 0;

  if (!name) {
    showToast('Bitte Getränkenamen eingeben', 'error');
    return;
  }

  if (DRINKS.find(d => d.label.toLowerCase() === name.toLowerCase())) {
    showToast('Getränk existiert bereits', 'error');
    return;
  }

  let key = makeDrinkKey(name);
  while (DRINKS.find(d => d.key === key)) key = key + '_' + Math.floor(Math.random() * 1000);

  DRINKS.push({ key, label: name });
  prices[key] = price;

  persons.forEach(p => {
    if (!p.drinks) p.drinks = {};
    p.drinks[key] = 0;
  });

  closeDrinkModal();
  renderAll();
  showToast('✅ Getränk hinzugefügt', 'success');
  persistState();
}

function deleteDrink(key) {
  const drink = DRINKS.find(d => d.key === key);
  if (!drink) return;

  const used = persons.some(p => (p.drinks && (p.drinks[key] || 0) > 0));
  const usedInTeam = spiele.some(s => (s.drinks && (s.drinks[key] || 0) > 0));
  const usedInRounds = persons.some(p => (p.rounds || []).some(r => (r.drinks && (r.drinks[key] || 0) > 0)));

  if (used || usedInTeam || usedInRounds) {
    showToast('Getränk kann nicht gelöscht werden, weil bereits Buchungen existieren', 'error');
    return;
  }

  if (!confirm(`Getränk "${drink.label}" wirklich löschen?`)) return;

  DRINKS = DRINKS.filter(d => d.key !== key);
  delete prices[key];

  persons.forEach(p => {
    if (p.drinks && key in p.drinks) delete p.drinks[key];
  });

  Object.keys(teamDrinks).forEach(k => {
    if (k === key) delete teamDrinks[k];
  });

  renderAll();
  showToast('🗑️ Getränk gelöscht', 'success');
  persistState();
}

// ── SPIELE KATALOG ──
function renderSpieltypSelect() {
  const sel = document.getElementById('spieltyp-select');
  if (!sel) return;

  sel.innerHTML = '';

  if (!SPIELE_KATALOG.length) {
    sel.innerHTML = '<option value="">Kein Spiel angelegt</option>';
    return;
  }

  SPIELE_KATALOG.slice().sort((a, b) => a.localeCompare(b, 'de')).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

function renderSpieleKatalog() {
  const el = document.getElementById('spiele-katalog-list');
  el.innerHTML = '';

  if (!SPIELE_KATALOG.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Noch keine Spiele angelegt</div>';
    return;
  }

  SPIELE_KATALOG.slice().sort((a, b) => a.localeCompare(b, 'de')).forEach(name => {
    const card = document.createElement('div');
    card.className = 'spiel-edit-card';
    card.innerHTML = `
      <label>${name}</label>
      <button class="delete-drink-btn" onclick="deleteSpielFromKatalog('${escapeForJs(name)}')">✕</button>
    `;
    el.appendChild(card);
  });
}

function addSpielToKatalog() {
  const input = document.getElementById('new-spiel-input');
  const name = (input.value || '').trim();
  if (!name) return;

  if (SPIELE_KATALOG.find(s => s.toLowerCase() === name.toLowerCase())) {
    showToast('Spiel existiert bereits', 'error');
    return;
  }

  SPIELE_KATALOG.push(name);
  input.value = '';
  renderSpieltypSelect();
  renderSpieleKatalog();
  showToast('✅ Spiel hinzugefügt', 'success');
  persistState();
}

function deleteSpielFromKatalog(name) {
  const used = spiele.some(s => (s.spieltyp || '') === name);
  if (used) {
    showToast('Spiel kann nicht gelöscht werden, da es bereits verwendet wurde', 'error');
    return;
  }

  if (!confirm(`Spiel "${name}" wirklich löschen?`)) return;

  SPIELE_KATALOG = SPIELE_KATALOG.filter(s => s !== name);
  renderSpieltypSelect();
  renderSpieleKatalog();
  showToast('🗑️ Spiel gelöscht', 'success');
  persistState();
}

// ── PERSONEN ──
function addPerson(isGuest) {
  const input = document.getElementById(isGuest ? 'new-guest-input' : 'new-person-input');
  const name = input.value.trim();
  if (!name) return;

  if (persons.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('Name existiert bereits', 'error');
    return;
  }
    
    const personStrafen = {};
        STRAFEN.forEach(s => {
          personStrafen[s.key] = 0;
        });

  const drinks = {};
  DRINKS.forEach(d => drinks[d.key] = 0);

persons.push({
  name,
  isGuest: !!isGuest,
  present: true,
  tisch: '',
  drinks,
    strafen: personStrafen,
  freeStrafen: [],
  tannenbaumCharges: [],
  paid: 0,
  teamExtra: 0,
  roundExtra: 0,
  rounds: [],
  left: false,
  leftAt: '',
    arrivalTime: '',
    leftEarlyAt: '',
  boughtThrows: 0
});

  input.value = '';
  renderAll();
  showToast(`✅ ${name} hinzugefügt`, 'success');
  persistState();
}

function deletePerson(name) {
  const p = persons.find(x => x.name === name);
  if (!p) return;

  const typeLabel = p.isGuest ? 'Gastkegler' : 'Mitglied';
  if (!confirm(`${typeLabel} "${p.name}" wirklich löschen?`)) return;

  persons = persons.filter(x => x.name !== name);
  spiele = spiele
    .map(s => ({ ...s, members: (s.members || []).filter(m => m !== name) }))
    .filter(s => (s.members || []).length > 0);

  renderAll();
  showToast('🗑️ Person gelöscht', 'success');
  persistState();
}

// ── SIDEBAR / TABS ──
const subTabMap = {
  organisation: ['anwesenheit', 'gruppen', 'gruppen-einstellungen'],
  getraenke: ['getraenke-uebersicht', 'teamspiele', 'runden', 'getraenke-abrechnung'],
  spiele: ['tannenbaum', 'darts', 'lotterie', 'tiberius', 'spiele-einstellungen'],
  strafen: ['strafen-uebersicht', 'strafen-historie', 'strafen-statistik', 'strafen-abrechnung'],
  verwaltung: ['spiele', 'getraenkepreise', 'strafpreise', 'termine', 'einstellungen']
};

const defaultSubTab = {
  organisation: 'anwesenheit',
  getraenke: 'getraenke-uebersicht',
  spiele: 'tannenbaum',
  strafen: 'strafen-uebersicht',
  verwaltung: 'spiele'
};

function toggleOverlayMenu() {
  const nav = document.querySelector('.side-nav');
  if (!nav) return;

  const willOpen = !nav.classList.contains('menu-open');
  nav.classList.toggle('menu-open', willOpen);

  document.querySelectorAll('.side-menu-item').forEach(item => {
    item.classList.remove('expanded');

    const submenu = item.querySelector('.side-submenu');
    if (submenu) submenu.classList.add('hidden');
  });
}

function toggleSideMenu(mainKey) {
  const nav = document.querySelector('.side-nav');
  if (!nav) return;

  nav.classList.add('menu-open');

  document.querySelectorAll('.side-menu-item').forEach(item => {
    const isTarget = item.dataset.main === mainKey;

    item.classList.toggle('expanded', isTarget);

    const submenu = item.querySelector('.side-submenu');
    if (submenu) submenu.classList.toggle('hidden', !isTarget);
  });
}

function showSideTab(mainKey, subKey, el) {
  document.querySelectorAll('.main-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const mainPanel = document.getElementById('main-' + mainKey);
  if (mainPanel) mainPanel.classList.remove('hidden');

  document.querySelectorAll('.side-menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.main === mainKey);
  });

  document.querySelectorAll('.side-submenu button').forEach(btn => {
    btn.classList.remove('active');
  });

  if (el) el.classList.add('active');

  Object.values(subTabMap).flat().forEach(id => {
    const node = document.getElementById('tab-' + id);
    if (node) node.classList.add('hidden');
  });

  const activeNode = document.getElementById('tab-' + subKey);
  if (activeNode) activeNode.classList.remove('hidden');
    
// Nach Auswahl wieder einklappen
document.querySelectorAll('.side-menu-item').forEach(item => {
  item.classList.remove('expanded');

  const submenu = item.querySelector('.side-submenu');
  if (submenu) submenu.classList.add('hidden');
});

document.querySelector('.side-nav')?.classList.remove('menu-open');
    
}

// Rückwärtskompatibilität, falls irgendwo noch alte onclicks stehen
function showMainTab(mainKey, el) {
  toggleSideMenu(mainKey);
}

function showSubTab(mainKey, subKey, el) {
  showSideTab(mainKey, subKey, el);
}

// ── RESET / UNDO ──
function showUndoToast() {
  const t = document.getElementById('toast');
  clearTimeout(toastTimer);
  t.innerHTML = `🧨 Alles gelöscht <button onclick="undoReset()" style="margin-left:10px;padding:4px 8px;border-radius:6px;border:none;background:var(--green);font-weight:700;cursor:pointer;">Undo</button>`;
  t.className = 'show success';

  toastTimer = setTimeout(() => {
    t.className = '';
    setTimeout(() => { t.innerHTML = ''; }, 250);
  }, 5000);
}

function openResetModal() {
  document.getElementById('reset-modal').classList.remove('hidden');
}

function closeResetModal() {
  document.getElementById('reset-modal').classList.add('hidden');
}

function confirmReset() {
  lastState = JSON.stringify({ persons, spiele, DRINKS, prices, SPIELE_KATALOG, RUNDEN_GRUENDE, selectedLoser, teamDrinks });

  persons.forEach(p => {
    Object.keys(p.drinks).forEach(k => p.drinks[k] = 0);
    p.paid = 0;
    p.teamExtra = 0;
    p.roundExtra = 0;
    p.rounds = [];
    p.left = false;
    p.leftAt = '';
    p.present = false;
    p.tisch = '';
  });

  spiele = [];
  teamDrinks = {};
  selectedLoser = null;
  roundDraftDrinks = {};

  closeResetModal();
  renderAll();
  showUndoToast();
  persistState();

  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => { lastState = null; }, 5000);
}

function undoReset() {
  if (!lastState) return;

  const state = JSON.parse(lastState);
  persons = state.persons || [];
  spiele = state.spiele || [];
  DRINKS = state.DRINKS || DRINKS;
  prices = state.prices || prices;
  SPIELE_KATALOG = state.SPIELE_KATALOG || SPIELE_KATALOG;
  RUNDEN_GRUENDE = state.RUNDEN_GRUENDE || RUNDEN_GRUENDE;
  selectedLoser = state.selectedLoser || null;
  teamDrinks = state.teamDrinks || {};

  hydrateState();
  renderAll();
  showToast('↩️ Wiederhergestellt!', 'success');
  lastState = null;
  persistState();
}

// ── NETWORK EVENTS ──
window.addEventListener('online', async () => {
  showToast('🌐 Wieder online. Synchronisiere…', 'success');

  if (!ACTIVE_CLUB || !window.firestoreApi) return;

  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  const remoteState = await window.firestoreApi.loadClubState(clubId);
  const remoteUpdatedAt = Number(remoteState?.updatedClientAt || 0);

  if (!remoteState || lastLocalChangeAt >= remoteUpdatedAt) {
    await saveToFirestore(false);
    showToast('☁️ Lokaler Stand hochgeladen', 'success');
    return;
  }

  isApplyingRemoteState = true;

  applyLoadedState(remoteState);
  lastRemoteChangeAt = remoteUpdatedAt;
  lastLocalChangeAt = Math.max(lastLocalChangeAt, remoteUpdatedAt);

  renderAll();
  syncCurrentClubToStore();
  saveClubSystem();

  isApplyingRemoteState = false;

  showToast('☁️ Firestore-Stand übernommen', 'success');
});

window.addEventListener('offline', () => {
  showToast('📴 Offline. Änderungen werden lokal gespeichert.', 'success');
});

function updateCountdownFixedPosition() {
  const box = document.getElementById('team-stopwatch-global');
  const placeholder = document.getElementById('team-stopwatch-placeholder');

  if (!box || !placeholder || box.classList.contains('hidden')) {
    if (box) box.classList.remove('is-fixed');
    if (placeholder) {
      placeholder.style.display = 'none';
      placeholder.style.height = '0px';
    }
    return;
  }

  const boxHeight = box.offsetHeight;
  const boxTop = placeholder.dataset.originalTop
    ? Number(placeholder.dataset.originalTop)
    : box.getBoundingClientRect().top + window.scrollY;

  placeholder.dataset.originalTop = String(boxTop);

  if (window.scrollY >= boxTop) {
    placeholder.style.display = 'block';
    placeholder.style.height = boxHeight + 'px';
    box.classList.add('is-fixed');
  } else {
    placeholder.style.display = 'none';
    placeholder.style.height = '0px';
    box.classList.remove('is-fixed');
  }
}

window.addEventListener('scroll', updateCountdownFixedPosition);
window.addEventListener('resize', () => {
  const placeholder = document.getElementById('team-stopwatch-placeholder');
  if (placeholder) delete placeholder.dataset.originalTop;
  updateCountdownFixedPosition();
});                                 
                                 
updateHeaderDateTime();
setInterval(updateHeaderDateTime, 1000);
bahnTimerInterval = setInterval(updateBahnDisplay, 1000);
teamStopwatchInterval = setInterval(updateTeamStopwatchDisplay, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js?v=20260318-v13');

      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

let quickPenaltyType = '';

function getPenaltyKeyByType(type) {
  const search = String(type || '').toLowerCase();

  return STRAFEN.find(s => {
    const label = String(s.label || '').toLowerCase();

    if (search === '9er') {
      return label.includes('9er') || label.includes('kranz') || label.includes('durchgeworfen');
    }

    if (search === 'kranz') {
      return label.includes('9er') || label.includes('kranz') || label.includes('durchgeworfen');
    }

    if (search === 'durchgeworfen') {
      return label.includes('9er') || label.includes('kranz') || label.includes('durchgeworfen');
    }

    if (search === 'gosse') {
      return label.includes('gosse') || label.includes('pudel');
    }

    return false;
  })?.key || null;
}

function openPenaltyQuick(type) {
  quickPenaltyType = type;

  const key = getPenaltyKeyByType(type);

  if (!key) {
    showToast(`Bitte zuerst eine Strafe "${type}" anlegen`, 'error');
    return;
  }

  const select = document.getElementById('quick-penalty-person-select');
  const title = document.getElementById('quick-penalty-title');

  if (title) title.textContent = `${type} eintragen`;

  const active = persons
    .filter(p => p.present && !p.left)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  select.innerHTML = '<option value="">Bitte Person wählen</option>';

  active.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  document.getElementById('quick-penalty-modal')?.classList.remove('hidden');
}

function closeQuickPenaltyModal() {
  document.getElementById('quick-penalty-modal')?.classList.add('hidden');
  quickPenaltyType = '';
}

function confirmQuickPenalty() {
  const personName = document.getElementById('quick-penalty-person-select')?.value || '';
  const key = getPenaltyKeyByType(quickPenaltyType);

  if (!personName) {
    showToast('Bitte Person auswählen', 'error');
    return;
  }

  if (!key) {
    showToast('Strafe nicht gefunden', 'error');
    return;
  }

  const type = String(quickPenaltyType || '').toLowerCase();
  const active = persons.filter(p => p.present && !p.left);
  let punishedNames = [];

  if (type === 'gosse') {
    const p = persons.find(x => x.name === personName);
    if (!p) return;

    if (!p.strafen) p.strafen = {};
    p.strafen[key] = (p.strafen[key] || 0) + 1;

    punishedNames = [personName];
  } else {
    active.forEach(p => {
      if (p.name === personName) return;

      if (!p.strafen) p.strafen = {};
      p.strafen[key] = (p.strafen[key] || 0) + 1;

      punishedNames.push(p.name);
    });
  }

  addPenaltyStatsEntry(quickPenaltyType, personName, punishedNames);

  closeQuickPenaltyModal();
  renderAll();
  persistState();

  showToast(
    type === 'gosse'
      ? `✅ Gosse für ${personName} gebucht`
      : `✅ ${personName} ist straffrei, alle anderen +1`,
    'success'
  );
}
function normalizePenaltyStatsType(type) {
  const t = String(type || '').toLowerCase();

  if (t.includes('9')) return '9er';
  if (t.includes('kranz')) return 'kranz';
  if (t.includes('durch')) return 'durchgeworfen';
  if (t.includes('gosse') || t.includes('pudel')) return 'gosse';

  return t;
}

function getPenaltyStatsRange() {
  const from = document.getElementById('penalty-stats-from')?.value || '';
  const to = document.getElementById('penalty-stats-to')?.value || '';

  return { from, to };
}

function isPenaltyStatsEntryInRange(entry, from, to) {
  const date = entry.eventDate || String(entry.createdAt || '').slice(0, 10);

  if (from && date < from) return false;
  if (to && date > to) return false;

  return true;
}

function renderPenaltyStats() {
  const body = document.getElementById('penalty-stats-body');
  if (!body) return;

  const { from, to } = getPenaltyStatsRange();
  const rows = {};

  persons.forEach(p => {
    rows[p.name] = {
      name: p.name,
      anwesend: 0,
      '9er': 0,
      kranz: 0,
      durchgeworfen: 0,
      gosse: 0
    };
  });

  (kegelAbende || [])
    .filter(abend => isPenaltyStatsEntryInRange({ eventDate: abend.date }, from, to))
    .forEach(abend => {
      (abend.attendees || []).forEach(name => {
        if (!rows[name]) {
          rows[name] = {
            name,
            anwesend: 0,
            '9er': 0,
            kranz: 0,
            durchgeworfen: 0,
            gosse: 0
          };
        }

        rows[name].anwesend++;
      });
    });

  (penaltyStatsLog || [])
    .filter(entry => isPenaltyStatsEntryInRange(entry, from, to))
    .forEach(entry => {
      const type = normalizePenaltyStatsType(entry.type);
      const thrower = entry.thrower;

      if (!rows[thrower]) {
        rows[thrower] = {
          name: thrower,
          anwesend: 0,
          '9er': 0,
          kranz: 0,
          durchgeworfen: 0,
          gosse: 0
        };
      }

      if (rows[thrower][type] !== undefined) {
        rows[thrower][type]++;
      }
    });

  const sortedRows = Object.values(rows)
    .sort((a, b) => {
      if ((b.anwesend || 0) !== (a.anwesend || 0)) {
        return (b.anwesend || 0) - (a.anwesend || 0);
      }

      const totalA = a['9er'] + a.kranz + a.durchgeworfen + a.gosse;
      const totalB = b['9er'] + b.kranz + b.durchgeworfen + b.gosse;

      if (totalA !== totalB) return totalB - totalA;
      return a.name.localeCompare(b.name, 'de');
    });

  if (!sortedRows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">
          Keine Statistikdaten vorhanden
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = sortedRows.map(row => `
    <tr>
      <td class="sticky-col">${row.name}</td>
      <td>${row.anwesend || 0}</td>
      <td>${row['9er']}</td>
      <td>${row.kranz}</td>
      <td>${row.durchgeworfen}</td>
      <td>${row.gosse}</td>
    </tr>
  `).join('');
}

function setPenaltyStatsRangeToday() {
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('penalty-stats-from').value = today;
  document.getElementById('penalty-stats-to').value = today;

  renderPenaltyStats();
}

function setPenaltyStatsRangeMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  document.getElementById('penalty-stats-from').value = first;
  document.getElementById('penalty-stats-to').value = today;

  renderPenaltyStats();
}

function setPenaltyStatsRangeAll() {
  document.getElementById('penalty-stats-from').value = '';
  document.getElementById('penalty-stats-to').value = '';

  renderPenaltyStats();
}
