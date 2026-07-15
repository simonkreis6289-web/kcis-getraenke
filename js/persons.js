// ─────────────────────────────────────────────────────────────
// ── PERSONEN / ANWESENHEIT ──
// ─────────────────────────────────────────────────────────────
const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'present',
  EXCUSED: 'excused',
  UNEXCUSED: 'unexcused',
  UNKNOWN: 'unknown'
});

let attendanceStatusPerson = null;

function normalizeAttendanceStatus(person) {
  if (!person) {
    return ATTENDANCE_STATUS.UNKNOWN;
  }

  if (person.present) {
    return ATTENDANCE_STATUS.PRESENT;
  }

  const validStatuses =
    Object.values(
      ATTENDANCE_STATUS
    );

  return validStatuses.includes(
    person.attendanceStatus
  )
    ? person.attendanceStatus
    : ATTENDANCE_STATUS.UNKNOWN;
}

function normalizePersonForLive(person) {
  if (!person) {
    return null;
  }

  if (
    !person.drinks ||
    typeof person.drinks !== 'object'
  ) {
    person.drinks = {};
  }

  if (
    !person.strafen ||
    typeof person.strafen !== 'object'
  ) {
    person.strafen = {};
  }

  if (!Array.isArray(person.rounds)) {
    person.rounds = [];
  }

  if (
    !Array.isArray(
      person.freeStrafen
    )
  ) {
    person.freeStrafen = [];
  }

  if (
    !Array.isArray(
      person.tannenbaumCharges
    )
  ) {
    person.tannenbaumCharges = [];
  }

  person.present =
    !!person.present;

  person.isGuest =
    !!person.isGuest;

  person.left =
    !!person.left;

  person.tisch =
    normalizeTisch(
      person.tisch
    );

  person.attendanceStatus =
    normalizeAttendanceStatus(
      person
    );

  person.arrivalTime =
    person.arrivalTime || '';

  person.leftAt =
    person.leftAt || '';

  person.leftEarlyAt =
    person.leftEarlyAt || '';

  person.paid =
    parseFloat(
      person.paid || 0
    ) || 0;

  person.boughtThrows =
    parseInt(
      person.boughtThrows || 0,
      10
    ) || 0;

  return person;
}

function getLivePersonStatusPayload(
  person
) {
  normalizePersonForLive(
    person
  );

  return {
    present:
      !!person.present,

    attendanceStatus:
      normalizeAttendanceStatus(
        person
      ),

    left:
      !!person.left,

    tisch:
      normalizeTisch(
        person.tisch
      ),

    arrivalTime:
      person.arrivalTime || '',

    leftAt:
      person.leftAt || '',

    leftEarlyAt:
      person.leftEarlyAt || '',

    isGuest:
      !!person.isGuest
  };
}

function getMembers() {
  return persons.filter(person => !person.isGuest);
}

function getGuests() {
  return persons.filter(person => person.isGuest);
}

function getPresentMembers() {
  return persons.filter(
    person =>
      person.present &&
      !person.isGuest
  );
}

function getPresentGuests() {
  return persons.filter(
    person =>
      person.present &&
      person.isGuest
  );
}

function getPresentNotLeftPeople() {
  return persons.filter(
    person =>
      person.present &&
      !person.left
  );
}

function getAvatarFileCandidates(name) {
  const clean =
    String(name || '').trim();

  const normalized =
    clean
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );

  const base =
    normalized
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      );

  return [
    `bilder/${base}.jpg`,
    `bilder/${base}.jpeg`,
    `bilder/${base}.png`,
    `bilder/${base}.webp`
  ];
}

function getAvatarHtml(
  name,
  extraClass = ''
) {
  const initials =
    String(name || '')
      .split(' ')
      .map(part => part[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const candidates =
    getAvatarFileCandidates(name);

  const filesJson =
    JSON.stringify(candidates)
      .replace(/"/g, '&quot;');

return `
  <div class="person-avatar ${extraClass}">
      <img
        src="${candidates[0]}"
        alt="${name}"
        onerror="
          if (
            this.dataset.tryIndex ===
            undefined
          ) {
            this.dataset.tryIndex = '0';
          }

          var files = ${filesJson};
          var next =
            parseInt(
              this.dataset.tryIndex,
              10
            ) + 1;

          if (next < files.length) {
            this.dataset.tryIndex =
              String(next);

            this.src =
              files[next];
          } else {
            var parent =
              this.parentElement;

            this.remove();

            if (parent) {
              var fallback =
                parent.querySelector(
                  '.person-avatar-fallback'
                );

              if (fallback) {
                fallback.style.display =
                  'flex';
              }
            }
          }
        "
      >

      <span
        class="person-avatar-fallback"
        style="display:none;"
      >
        ${initials}
      </span>
    </div>
  `;
}

function renderBoughtThrowsDots(person) {
  const max =
    Math.max(
      0,
      parseInt(
        wurfSettings.maxBuys || 3,
        10
      ) || 3
    );

  const used =
    Math.max(
      0,
      parseInt(
        person.boughtThrows || 0,
        10
      ) || 0
    );

  let html =
    '<div class="wurf-dots">';

  for (
    let index = 0;
    index < max;
    index++
  ) {
    html += `
      <span
        class="wurf-dot ${
          index < used
            ? 'used'
            : 'free'
        }"
      ></span>
    `;
  }

  html += '</div>';

  return html;
}

function resolveGroupDisplayColor(
  value,
  fallback = '#78909c'
) {
  const color =
    String(value || '')
      .trim();

  if (!color) {
    return fallback;
  }

  const namedColors = {
    black: '#111111',
    red: '#d62828',
    blue: '#1976d2',
    green: '#2e7d32',
    yellow: '#f9a825',
    orange: '#ef6c00',
    purple: '#7b1fa2',
    pink: '#c2185b',
    gray: '#78909c',
    grey: '#78909c',
    white: '#ffffff'
  };

  return (
    namedColors[
      color.toLowerCase()
    ] ||
    color
  );
}

function getGroupColorEmoji(
  teamKey
) {
  const normalizedTeam =
    normalizeTisch(teamKey);

  if (!normalizedTeam) {
    return '⚪';
  }

  const fallbackColor =
    normalizedTeam === 'T1'
      ? 'black'
      : 'red';

  const colorKey =
    String(
      groupSettings?.[normalizedTeam]
        ?.color ||
      fallbackColor
    )
      .trim()
      .toLowerCase();

  const emojis = {
    red: '🔴',
    orange: '🟠',
    yellow: '🟡',
    green: '🟢',
    blue: '🔵',
    purple: '🟣',
    black: '⚫',
    white: '⚪',
    brown: '🟤',
    gray: '⚪',
    grey: '⚪'
  };

  return emojis[colorKey] || '●';
}

function stripLeadingTeamEmoji(
  value
) {
  return String(value || '')
    .replace(
      /^[⚫⚪🔴🟠🟡🟢🔵🟣🟤●⬤]\s*/u,
      ''
    )
    .trim();
}

function getPersonTeamCardHtml(
  person
) {
  const teamKey =
    normalizeTisch(
      person.tisch
    );

  if (!teamKey) {
    return `
      <div class="person-team-badge no-team">
        <span
          class="person-team-dot no-team-dot"
        ></span>

        <span>Kein Team</span>
      </div>
    `;
  }

  const settings =
    groupSettings?.[teamKey] || {};

  const fallbackColor =
    teamKey === 'T1'
      ? '#111111'
      : '#d62828';

  const color =
    resolveGroupDisplayColor(
      settings.color,
      fallbackColor
    );

  const rawLabel =
    typeof getGroupLabel ===
      'function'
      ? getGroupLabel(teamKey)
      : (
          settings.name ||
          teamKey
        );

  const label =
    stripLeadingTeamEmoji(
      rawLabel
    );

  return `
    <div
      class="person-team-badge ${teamKey.toLowerCase()}"
    >
      <span
        class="person-team-dot"
        style="background:${color};"
        aria-hidden="true"
      ></span>

      <span>${label}</span>
    </div>
  `;
}

function getAttendanceAvatarClass(person) {
  const status =
    normalizeAttendanceStatus(person);

  if (status === 'present') {
    return 'avatar-status-present';
  }

  if (status === 'excused') {
    return 'avatar-status-excused';
  }

  if (status === 'unexcused') {
    return 'avatar-status-unexcused';
  }

  return 'avatar-status-unknown';
}

function getAttendanceStatusLabel(person) {
  const status =
    normalizeAttendanceStatus(person);

  if (status === 'present') {
    return '🟢 Da';
  }

  if (status === 'excused') {
    return '🟡 Abgemeldet';
  }

  if (status === 'unexcused') {
    return '🔴 Nicht abgemeldet';
  }

  return '⚪ Keine Rückmeldung';
}

function applyLivePersonData(
  data
) {
  if (
    !data ||
    !data.name
  ) {
    return false;
  }

  const personName =
    String(data.name);

  livePersonCounters.set(
    personName,
    {
      drinks: {
        ...(data.drinks || {})
      },

      strafen: {
        ...(data.strafen || {})
      },

      present:
        data.present,

      attendanceStatus:
        data.attendanceStatus,

      left:
        data.left,

      tisch:
        data.tisch,

      arrivalTime:
        data.arrivalTime,

      leftAt:
        data.leftAt,

      leftEarlyAt:
        data.leftEarlyAt,

      isGuest:
        data.isGuest
    }
  );

  const person =
    persons.find(
      item =>
        item.name === personName
    );

  if (!person) {
    return false;
  }

  if (
    data.drinks &&
    typeof data.drinks === 'object'
  ) {
    person.drinks = {
      ...(person.drinks || {}),
      ...data.drinks
    };
  }

  if (
    data.strafen &&
    typeof data.strafen === 'object'
  ) {
    person.strafen = {
      ...(person.strafen || {}),
      ...data.strafen
    };
  }

  if (
    data.present !== undefined
  ) {
    person.present =
      !!data.present;
  }

  if (
    data.attendanceStatus !==
      undefined
  ) {
    person.attendanceStatus =
      data.attendanceStatus;
  }

  if (
    data.left !== undefined
  ) {
    person.left =
      !!data.left;
  }

  if (
    data.tisch !== undefined
  ) {
    person.tisch =
      normalizeTisch(
        data.tisch
      );
  }

  if (
    data.arrivalTime !==
      undefined
  ) {
    person.arrivalTime =
      data.arrivalTime || '';
  }

  if (
    data.leftAt !== undefined
  ) {
    person.leftAt =
      data.leftAt || '';
  }

  if (
    data.leftEarlyAt !==
      undefined
  ) {
    person.leftEarlyAt =
      data.leftEarlyAt || '';
  }

  if (
    data.isGuest !== undefined
  ) {
    person.isGuest =
      !!data.isGuest;
  }

  normalizePersonForLive(
    person
  );

  return true;
}

function reapplyLivePersonCounters() {
  if (!liveCountersReady) {
    return;
  }

  livePersonCounters.forEach(
    (
      liveData,
      personName
    ) => {
      applyLivePersonData({
        name: personName,
        ...liveData
      });
    }
  );
}

function renderLivePersonChanges() {
  renderAnwesenheit();

  if (
    typeof renderGruppen ===
      'function'
  ) {
    renderGruppen();
  }

  if (
    typeof renderGetraenke ===
      'function'
  ) {
    renderGetraenke();
  }

  if (
    typeof renderStrafen ===
      'function'
  ) {
    renderStrafen();
  }

  if (
    typeof renderAbrechnung ===
      'function'
  ) {
    renderAbrechnung();
  }

  if (
    typeof renderTeamspiele ===
      'function'
  ) {
    renderTeamspiele();
  }

  if (
    typeof renderLotterie ===
      'function'
  ) {
    renderLotterie();
  }

  if (
    typeof updateStats ===
      'function'
  ) {
    updateStats();
  }

  syncCurrentClubToStore();
  saveClubSystem();
}

/*
 * Rückwärtskompatibilität für ältere
 * Aufrufe aus clubs.js.
 */
function renderLiveCounterChanges() {
  renderLivePersonChanges();
}

function stopLivePersonSync() {
  if (
    currentLivePersonsUnsubscribe
  ) {
    currentLivePersonsUnsubscribe();
    currentLivePersonsUnsubscribe =
      null;
  }

  livePersonCounters.clear();
  liveCountersReady =
    false;
}

async function startLivePersonSync(
  clubId
) {
  if (
    !window.firestoreApi ||
    !clubId ||
    typeof window.firestoreApi
      .subscribeToLivePersons !==
      'function'
  ) {
    return;
  }

  stopLivePersonSync();

  try {
    await window.firestoreApi
      .seedLivePersons(
        clubId,
        persons
      );
  } catch (error) {
    console.error(
      'Live-Personen konnten nicht initialisiert werden:',
      error
    );
  }

  currentLivePersonsUnsubscribe =
    window.firestoreApi
      .subscribeToLivePersons(
        clubId,
        changes => {
          let hasChanges =
            false;

          changes.forEach(
            change => {
              if (
                change.type ===
                'removed'
              ) {
                const removedName =
                  change.data?.name ||
                  '';

                livePersonCounters
                  .delete(
                    removedName
                  );

                return;
              }

              if (
                applyLivePersonData(
                  change.data
                )
              ) {
                hasChanges =
                  true;
              }
            }
          );

          liveCountersReady =
            true;

          if (hasChanges) {
            renderLivePersonChanges();
          }
        },
        error => {
          console.error(
            'Live-Personen-Synchronisation fehlgeschlagen:',
            error
          );

          showToast(
            '❌ Personen-Synchronisation gestört',
            'error'
          );
        }
      );
}

async function saveLivePersonStatus(
  person
) {
  if (
    !person ||
    !ACTIVE_CLUB ||
    !window.firestoreApi ||
    typeof window.firestoreApi
      .saveLivePersonStatus !==
      'function'
  ) {
    showToast(
      '❌ Personen-Synchronisation nicht verfügbar',
      'error'
    );

    return false;
  }

  if (!navigator.onLine) {
    showToast(
      '📴 Statusänderungen sind offline nicht möglich',
      'error'
    );

    return false;
  }

  try {
    const clubId =
      getClubFirestoreId(
        ACTIVE_CLUB
      );

    await window.firestoreApi
      .saveLivePersonStatus(
        clubId,
        person.name,
        getLivePersonStatusPayload(
          person
        )
      );

    return true;
  } catch (error) {
    console.error(
      'Personenstatus konnte nicht synchronisiert werden:',
      error
    );

    showToast(
      '❌ Personenstatus konnte nicht gespeichert werden',
      'error'
    );

    return false;
  }
}
                
function openAttendanceStatusModal(person) {
  if (!person) {
    return;
  }

  attendanceStatusPerson = person;

  const modal =
    document.getElementById(
      'attendance-status-modal'
    );

  const subtitle =
    document.getElementById(
      'attendance-status-subtitle'
    );

  if (!modal) {
    console.error(
      'attendance-status-modal wurde im HTML nicht gefunden'
    );

    showToast(
      'Anwesenheitsfenster nicht gefunden',
      'error'
    );

    return;
  }

  if (subtitle) {
    subtitle.textContent =
      `Status für ${person.name} auswählen`;
  }

  modal.classList.remove('hidden');
}

function closeAttendanceStatusModal() {
  document
    .getElementById(
      'attendance-status-modal'
    )
    ?.classList
    .add('hidden');

  attendanceStatusPerson = null;
}

async function confirmAttendanceStatus(
  status
) {
  const person =
    attendanceStatusPerson;

  if (!person) {
    return;
  }

  const validStatuses =
    Object.values(
      ATTENDANCE_STATUS
    );

  if (
    !validStatuses.includes(
      status
    )
  ) {
    showToast(
      'Ungültiger Status',
      'error'
    );

    return;
  }

  const previousState = {
    present:
      !!person.present,

    attendanceStatus:
      normalizeAttendanceStatus(
        person
      ),

    left:
      !!person.left,

    leftAt:
      person.leftAt || '',

    arrivalTime:
      person.arrivalTime || '',

    leftEarlyAt:
      person.leftEarlyAt || '',

    tisch:
      person.tisch || ''
  };

  const wasPresent =
    !!person.present;

  person.attendanceStatus =
    status;

  person.present =
    status ===
    ATTENDANCE_STATUS.PRESENT;

  if (!person.present) {
    person.left = false;
    person.leftAt = '';
    person.arrivalTime = '';
    person.leftEarlyAt = '';

  }

  renderAll();

  const saved =
    await saveLivePersonStatus(
      person
    );

  if (!saved) {
    Object.assign(
      person,
      previousState
    );

    renderAll();
    return;
  }

  closeAttendanceStatusModal();

  syncCurrentClubToStore();
  saveClubSystem();

  if (
    !wasPresent &&
    person.present
  ) {
    playSound(
      sounds.welcome
    );

    openArrivalModal(
      person
    );
  }
}

function getPersonCardStatusClass(
  person
) {
  if (person.left) {
    return 'left';
  }

  const status =
    normalizeAttendanceStatus(
      person
    );

  if (
    status ===
    ATTENDANCE_STATUS.PRESENT
  ) {
    return 'present';
  }

  if (
    status ===
    ATTENDANCE_STATUS.EXCUSED
  ) {
    return 'excused';
  }

  if (
    status ===
    ATTENDANCE_STATUS.UNEXCUSED
  ) {
    return 'unexcused';
  }

  return 'unknown';
}

function renderPersonCards(
  targetId,
  list
) {
  const grid =
    document.getElementById(
      targetId
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  const sorted =
    list
      .slice()
      .sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
            'de'
          )
      );

  if (!sorted.length) {
    grid.innerHTML = `
      <div
        style="
          font-size:0.8rem;
          color:var(--muted);
          padding:8px 0;
        "
      >
        Noch niemand vorhanden
      </div>
    `;

    return;
  }

  sorted.forEach(person => {
    const card =
      document.createElement(
        'div'
      );

    const cardStatusClass =
      getPersonCardStatusClass(
        person
      );

    card.className = [
      'person-card',
      cardStatusClass,
      person.isGuest
        ? 'guest'
        : ''
    ]
      .filter(Boolean)
      .join(' ');

    const timeHtml =
      person.arrivalTime ||
      person.leftEarlyAt
        ? `
          <div class="person-times">
            ${
              person.arrivalTime
                ? `
                  <div>
                    ⏰ Ankunft:
                    <strong>
                      ${person.arrivalTime}
                    </strong>
                  </div>
                `
                : ''
            }

            ${
              person.leftEarlyAt
                ? `
                  <div>
                    🚪 Weg:
                    <strong>
                      ${person.leftEarlyAt}
                    </strong>
                  </div>
                `
                : ''
            }
          </div>
        `
        : `
          <div
            class="person-times empty"
          >
            Keine Zeit gesetzt
          </div>
        `;

    card.innerHTML = `
      <button
        type="button"
        class="person-delete-btn"
        onclick="
          deletePerson(
            '${escapeForJs(person.name)}'
          );
          event.stopPropagation();
        "
      >
        ✕
      </button>

      ${getAvatarHtml(
          person.name,
          getAttendanceAvatarClass(person)
        )}

      <div class="person-name">
        ${person.name}
      </div>

      <div class="person-role">
        ${
          person.isGuest
            ? 'Gastkegler'
            : 'Mitglied'
        }
      </div>

      ${getPersonTeamCardHtml(person)}

      ${timeHtml}

      ${
        person.present
          ? `
            <button
              type="button"
              class="mini-action-btn"
              onclick="
                event.stopPropagation();
                openLeftEarlyModalByName(
                  '${escapeForJs(person.name)}'
                );
              "
            >
              🚪 Gehzeit
            </button>
          `
          : ''
      }
    `;

    card.onclick = () => {
      openAttendanceStatusModal(
        person
      );
    };

    grid.appendChild(card);
  });
}

function renderAnwesenheit() {
  renderPersonCards(
    'persons-grid-members',
    getMembers()
  );

  renderPersonCards(
    'persons-grid-guests',
    getGuests()
  );
}

async function addPerson(
  isGuest
) {
  const input =
    document.getElementById(
      isGuest
        ? 'new-guest-input'
        : 'new-person-input'
    );

  if (!input) {
    return;
  }

  const name =
    input.value.trim();

  if (!name) {
    return;
  }

  const alreadyExists =
    persons.some(
      person =>
        person.name
          .toLowerCase() ===
        name.toLowerCase()
    );

  if (alreadyExists) {
    showToast(
      'Name existiert bereits',
      'error'
    );

    return;
  }

  const personStrafen = {};

  STRAFEN.forEach(strafe => {
    personStrafen[
      strafe.key
    ] = 0;
  });

  const drinks = {};

  DRINKS.forEach(drink => {
    drinks[drink.key] = 0;
  });

  const person = {
    name,

    isGuest:
      !!isGuest,

    present:
      false,

    attendanceStatus:
      ATTENDANCE_STATUS.UNKNOWN,

    tisch:
      '',

    drinks,

    strafen:
      personStrafen,

    freeStrafen:
      [],

    tannenbaumCharges:
      [],

    paid:
      0,

    teamExtra:
      0,

    roundExtra:
      0,

    rounds:
      [],

    left:
      false,

    leftAt:
      '',

    arrivalTime:
      '',

    leftEarlyAt:
      '',

    boughtThrows:
      0
  };

  persons.push(person);
  input.value = '';

  renderAll();

  if (
    !ACTIVE_CLUB ||
    !navigator.onLine ||
    typeof window.firestoreApi
      ?.saveLivePerson !==
      'function'
  ) {
    persons =
      persons.filter(
        item =>
          item !== person
      );

    renderAll();

    showToast(
      '❌ Person konnte nicht synchronisiert werden',
      'error'
    );

    return;
  }

  try {
    const clubId =
      getClubFirestoreId(
        ACTIVE_CLUB
      );

    await window.firestoreApi
      .saveLivePerson(
        clubId,
        person.name,
        {
          ...getLivePersonStatusPayload(
            person
          ),

          drinks: {
            ...(person.drinks || {})
          },

          strafen: {
            ...(person.strafen || {})
          }
        }
      );
  } catch (error) {
    console.error(
      'Person konnte nicht angelegt werden:',
      error
    );

    persons =
      persons.filter(
        item =>
          item !== person
      );

    renderAll();

    showToast(
      '❌ Person konnte nicht angelegt werden',
      'error'
    );

    return;
  }

  syncCurrentClubToStore();
  saveClubSystem();

  showToast(
    `✅ ${name} hinzugefügt`,
    'success'
  );
}

async function deletePerson(
  name
) {
  const person =
    persons.find(
      item =>
        item.name === name
    );

  if (!person) {
    return;
  }

  const typeLabel =
    person.isGuest
      ? 'Gastkegler'
      : 'Mitglied';

  if (
    !confirm(
      `${typeLabel} "${person.name}" wirklich löschen?`
    )
  ) {
    return;
  }

  if (!navigator.onLine) {
    showToast(
      '📴 Personen können offline nicht gelöscht werden',
      'error'
    );

    return;
  }

  const previousPersons =
    JSON.parse(
      JSON.stringify(
        persons
      )
    );

  const previousSpiele =
    JSON.parse(
      JSON.stringify(
        spiele
      )
    );

  persons =
    persons.filter(
      item =>
        item.name !== name
    );

  spiele =
    spiele
      .map(spiel => ({
        ...spiel,

        members:
          (
            spiel.members ||
            []
          ).filter(
            memberName =>
              memberName !== name
          )
      }))
      .filter(
        spiel =>
          (
            spiel.members ||
            []
          ).length > 0
      );

  renderAll();

  try {
    const clubId =
      getClubFirestoreId(
        ACTIVE_CLUB
      );

    await window.firestoreApi
      .deleteLivePerson(
        clubId,
        name
      );
  } catch (error) {
    console.error(
      'Person konnte nicht gelöscht werden:',
      error
    );

    persons =
      previousPersons;

    spiele =
      previousSpiele;

    renderAll();

    showToast(
      '❌ Person konnte nicht gelöscht werden',
      'error'
    );

    return;
  }

  livePersonCounters.delete(
    name
  );

  syncCurrentClubToStore();
  saveClubSystem();
  persistState();

  showToast(
    '🗑️ Person gelöscht',
    'success'
  );
}

function openArrivalModal(person) {
  arrivalEditPerson =
    person;

  const subtitle =
    document.getElementById(
      'arrival-modal-sub'
    );

  const nowCheck =
    document.getElementById(
      'arrival-now-check'
    );

  const timeInput =
    document.getElementById(
      'arrival-time-input'
    );

  if (subtitle) {
    subtitle.textContent =
      `${person.name} ist angekommen.`;
  }

  if (nowCheck) {
    nowCheck.checked =
      true;
  }

  if (timeInput) {
    timeInput.value =
      getNowTimeString();
  }

  toggleArrivalTimeInput();

  document
    .getElementById(
      'arrival-modal'
    )
    ?.classList
    .remove('hidden');
}

function closeArrivalModal() {
  document
    .getElementById(
      'arrival-modal'
    )
    ?.classList
    .add('hidden');

  arrivalEditPerson =
    null;
}

function toggleArrivalTimeInput() {
  const nowCheck =
    document.getElementById(
      'arrival-now-check'
    );

  const row =
    document.getElementById(
      'arrival-time-row'
    );

  if (row) {
    row.style.display =
      nowCheck?.checked
        ? 'none'
        : 'block';
  }
}

async function confirmArrivalTime() {
  if (!arrivalEditPerson) {
    return;
  }

  const person =
    arrivalEditPerson;

  const previousState = {
    arrivalTime:
      person.arrivalTime || '',

    present:
      !!person.present,

    attendanceStatus:
      person.attendanceStatus
  };

  const nowCheck =
    document.getElementById(
      'arrival-now-check'
    );

  const timeInput =
    document.getElementById(
      'arrival-time-input'
    );

  const savedTime =
    nowCheck?.checked
      ? getNowTimeString()
      : (
          timeInput?.value ||
          getNowTimeString()
        );

  person.arrivalTime =
    savedTime;

  person.present =
    true;

  person.attendanceStatus =
    ATTENDANCE_STATUS.PRESENT;

  renderAll();

  const saved =
    await saveLivePersonStatus(
      person
    );

  if (!saved) {
    Object.assign(
      person,
      previousState
    );

    renderAll();
    return;
  }

  closeArrivalModal();

  syncCurrentClubToStore();
  saveClubSystem();

  showToast(
    `✅ Ankunftszeit gespeichert: ${savedTime}`,
    'success'
  );
}

function openLeftEarlyModal(person) {
  leftEarlyEditPerson =
    person;

  const subtitle =
    document.getElementById(
      'left-early-modal-sub'
    );

  const nowCheck =
    document.getElementById(
      'left-early-now-check'
    );

  const timeInput =
    document.getElementById(
      'left-early-time-input'
    );

  if (subtitle) {
    subtitle.textContent =
      `${person.name} geht.`;
  }

  if (nowCheck) {
    nowCheck.checked =
      true;
  }

  if (timeInput) {
    timeInput.value =
      getNowTimeString();
  }

  toggleLeftEarlyTimeInput();

  document
    .getElementById(
      'left-early-modal'
    )
    ?.classList
    .remove('hidden');
}

function closeLeftEarlyModal() {
  document
    .getElementById(
      'left-early-modal'
    )
    ?.classList
    .add('hidden');

  leftEarlyEditPerson =
    null;
}

function toggleLeftEarlyTimeInput() {
  const nowCheck =
    document.getElementById(
      'left-early-now-check'
    );

  const row =
    document.getElementById(
      'left-early-time-row'
    );

  if (row) {
    row.style.display =
      nowCheck?.checked
        ? 'none'
        : 'block';
  }
}

async function confirmLeftEarlyTime() {
  if (!leftEarlyEditPerson) {
    return;
  }

  const person =
    leftEarlyEditPerson;

  const previousState = {
    leftEarlyAt:
      person.leftEarlyAt || '',

    left:
      !!person.left,

    leftAt:
      person.leftAt || ''
  };

  const nowCheck =
    document.getElementById(
      'left-early-now-check'
    );

  const timeInput =
    document.getElementById(
      'left-early-time-input'
    );

  const savedTime =
    nowCheck?.checked
      ? getNowTimeString()
      : (
          timeInput?.value ||
          getNowTimeString()
        );

  person.leftEarlyAt =
    savedTime;

  person.left =
    true;

  person.leftAt =
    new Date()
      .toISOString();

  renderAll();

  const saved =
    await saveLivePersonStatus(
      person
    );

  if (!saved) {
    Object.assign(
      person,
      previousState
    );

    renderAll();
    return;
  }

  closeLeftEarlyModal();

  syncCurrentClubToStore();
  saveClubSystem();

  const earlyCount =
    typeof calcLeftEarlyCount ===
      'function'
      ? calcLeftEarlyCount(
          person
        )
      : 0;

  showToast(
    earlyCount > 0
      ? `✅ Gehzeit gespeichert: ${savedTime} · ${earlyCount}× zu früh`
      : `✅ Gehzeit gespeichert: ${savedTime}`,
    'success'
  );
}

function openLeftEarlyModalByName(
  personName
) {
  const person =
    persons.find(
      item =>
        item.name === personName
    );

  if (!person) {
    showToast(
      'Person nicht gefunden',
      'error'
    );

    return;
  }

  openLeftEarlyModal(
    person
  );
}

async function changeSyncedPersonCounter(
  personName,
  category,
  key,
  delta
) {
  if (
    !ACTIVE_CLUB ||
    !window.firestoreApi ||
    typeof window.firestoreApi
      .changeLivePersonCounter !== 'function'
  ) {
    showToast(
      '❌ Personen-Synchronisation nicht verfügbar',
      'error'
    );

    return false;
  }

  const person = persons.find(
    item => item.name === personName
  );

  if (!person) {
    showToast(
      `❌ Person nicht gefunden: ${personName}`,
      'error'
    );

    return false;
  }

  if (person.left) {
    showToast(
      `${personName} ist bereits gegangen`,
      'error'
    );

    return false;
  }

  if (
    category === 'strafen' &&
    !person.present
  ) {
    showToast(
      `${personName} ist nicht anwesend`,
      'error'
    );

    return false;
  }

  if (!navigator.onLine) {
    showToast(
      '📴 Live-Buchungen sind offline nicht möglich',
      'error'
    );

    return false;
  }

  try {
    const clubId =
      getClubFirestoreId(
        ACTIVE_CLUB
      );

    await window.firestoreApi
      .changeLivePersonCounter(
        clubId,
        personName,
        category,
        key,
        Number(delta || 0)
      );

    return true;
  } catch (error) {
    console.error(
      'Live-Zähler konnte nicht geändert werden:',
      error
    );

    showToast(
      '❌ Änderung konnte nicht gespeichert werden',
      'error'
    );

    return false;
  }
}

async function changeMultipleSyncedPersonCounters(
  changes = [],
  successMessage = ''
) {
  if (
    !ACTIVE_CLUB ||
    !window.firestoreApi ||
    typeof window.firestoreApi
      .changeMultipleLivePersonCounters !==
      'function'
  ) {
    showToast(
      '❌ Mehrfach-Synchronisation nicht verfügbar',
      'error'
    );

    return false;
  }

  if (!navigator.onLine) {
    showToast(
      '📴 Live-Buchungen sind offline nicht möglich',
      'error'
    );

    return false;
  }

  const validChanges =
    changes.filter(change => {
      if (
        !change ||
        !change.personName ||
        !['drinks', 'strafen'].includes(
          change.category
        ) ||
        !change.key ||
        Number(change.delta || 0) === 0
      ) {
        return false;
      }

      const person =
        persons.find(
          item =>
            item.name ===
            change.personName
        );

      if (
        !person ||
        person.left
      ) {
        return false;
      }

      if (
        change.category === 'strafen' &&
        !person.present
      ) {
        return false;
      }

      return true;
    });

  if (!validChanges.length) {
    showToast(
      'Keine gültigen Buchungen vorhanden',
      'error'
    );

    return false;
  }

  try {
    const clubId =
      getClubFirestoreId(
        ACTIVE_CLUB
      );

    await window.firestoreApi
      .changeMultipleLivePersonCounters(
        clubId,
        validChanges
      );

    if (successMessage) {
      showToast(
        successMessage,
        'success'
      );
    }

    return true;
  } catch (error) {
    console.error(
      'Mehrfachbuchung fehlgeschlagen:',
      error
    );

    showToast(
      '❌ Mehrfachbuchung konnte nicht gespeichert werden',
      'error'
    );

    return false;
  }
}

async function changeDrink(
  personName,
  key,
  delta
) {
  return changeSyncedPersonCounter(
    personName,
    'drinks',
    key,
    delta
  );
}

async function changeStrafe(
  personName,
  key,
  delta
) {
  return changeSyncedPersonCounter(
    personName,
    'strafen',
    key,
    delta
  );
}
