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

  person.inactive = !!person.inactive;
  person.isDrinksOnly = !!person.isDrinksOnly;

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
  !!person.isGuest,
    inactive: !!person.inactive,
    isDrinksOnly: !!person.isDrinksOnly,

    boughtThrows:
      Math.max(
        0,
        parseInt(
          person.boughtThrows || 0,
          10
        ) || 0
      ),
      
      paid:
          Math.max(
            0,
            parseFloat(
              person.paid || 0
            ) || 0
          )
  };
}

function getMembers() {
  return persons.filter(person => !person.isGuest && !person.isDrinksOnly);
}

function getGuests() {
  return persons.filter(person => person.isGuest && !person.isDrinksOnly);
}

function getPresentMembers() {
  return persons.filter(
    person =>
      person.present &&
      !person.isGuest && !person.inactive
  );
}

function getPresentGuests() {
  return persons.filter(
    person =>
      person.present &&
      person.isGuest && !person.isDrinksOnly && !person.inactive
  );
}

function getPresentDrinkPeople() {
  return persons.filter(person => person.present && !person.inactive);
}

function getPresentNotLeftPeople() {
  return persons.filter(
    person =>
      person.present &&
      !person.left && !person.inactive && !person.isDrinksOnly
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

  // Individuelle Bilder haben Vorrang, sonst Initialen bei Gaesten.
  const person = typeof persons !== 'undefined' ? persons.find(p => p.name === name) : null;
  if (person?.avatarData && /^data:image\/(jpeg|png|webp);base64,/.test(person.avatarData)) {
    return `<div class="person-avatar ${extraClass}"><img src="${person.avatarData}" alt=""><span class="person-avatar-fallback" style="display:none">${initials}</span></div>`;
  }
  if (person?.isGuest || person?.isDrinksOnly) {
    return `<div class="person-avatar ${extraClass}"><span class="person-avatar-fallback" style="display:flex">${initials}</span></div>`;
  }

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

function getPersonTeamCardHtml(person) {
  const teamKey =
    normalizeTisch(
      person.tisch
    );

  if (!teamKey) {
    return `
      <div class="person-team-badge no-team">
        <span class="person-team-emoji">
          ⚪
        </span>

        <span class="person-team-name">
          Kein Team
        </span>
      </div>
    `;
  }

  const settings =
    groupSettings?.[teamKey] || {};

  const teamName =
    stripLeadingTeamEmoji(
      settings.name ||
      getGroupLabel(teamKey) ||
      teamKey
    );

  const theme =
    getGroupTheme(
      settings.color
    );

  return `
    <div
      class="person-team-badge"
      style="
        --person-team-color:
          ${theme.hex};

        --person-team-bg:
          ${theme.bg};
      "
    >
      <span class="person-team-emoji">
        ${theme.emoji}
      </span>

      <span class="person-team-name">
        ${teamName}
      </span>
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

    freeStrafen:
      Array.isArray(
        data.freeStrafen
      )
        ? data.freeStrafen.map(
            entry => ({
              ...entry
            })
          )
        : [],

    rounds: Array.isArray(data.rounds)
      ? data.rounds.map(round => ({
          ...round,
          drinks: {
            ...(round.drinks || {})
          }
        }))
      : [],

    boughtThrows:
      Math.max(
        0,
        parseInt(
          data.boughtThrows || 0,
          10
        ) || 0
      ),

    paid:
      Math.max(
        0,
        parseFloat(
          data.paid || 0
        ) || 0
      ),

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
      Array.isArray(
        data.freeStrafen
      )
    ) {
      person.freeStrafen =
        data.freeStrafen.map(
          entry => ({
            ...entry
          })
        );
    }

    if (Array.isArray(data.rounds)) {
      person.rounds = data.rounds.map(round => ({
        ...round,
        drinks: {
          ...(round.drinks || {})
        }
      }));

      person.roundExtra =
        typeof calcRoundsTotal === 'function'
          ? calcRoundsTotal(person)
          : person.rounds.reduce(
              (sum, round) =>
                sum +
                (parseFloat(round.total || 0) || 0),
              0
            );
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

  if (data.inactive !== undefined) person.inactive = !!data.inactive;
  if (data.isDrinksOnly !== undefined) person.isDrinksOnly = !!data.isDrinksOnly;

  if (
    data.isGuest !== undefined
  ) {
    person.isGuest =
      !!data.isGuest;
  }

    if (
      data.boughtThrows !==
        undefined
    ) {
      person.boughtThrows =
        Math.max(
          0,
          parseInt(
            data.boughtThrows || 0,
            10
          ) || 0
        );
    }

if (
  data.paid !== undefined
) {
  person.paid =
    Math.max(
      0,
      parseFloat(
        data.paid || 0
      ) || 0
    );
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
  if (typeof renderSitzordnung === 'function') renderSitzordnung();
  if (typeof updateStats === 'function') updateStats();

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
      typeof renderRunden ===
        'function'
    ) {
      renderRunden();
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

  modal.classList.toggle('drinks-only-attendance', !!person.isDrinksOnly);
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

  // Trinkgaeste haben nur Da/Keine Rueckmeldung, keine Fehlstrafen.
  if (person.isDrinksOnly && status !== ATTENDANCE_STATUS.PRESENT && status !== ATTENDANCE_STATUS.UNKNOWN) return;

  // Bei "Da" erst die Ankunftszeit bestaetigen. Noch nichts speichern.
  // So kann ein Live-Update das zweite Dialogfenster nicht unterbrechen.
  if (status === ATTENDANCE_STATUS.PRESENT) {
    closeAttendanceStatusModal();
    openArrivalModal(person);
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
          Number(!!first.inactive) - Number(!!second.inactive) || first.name.localeCompare(second.name, 'de')
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
      person.inactive ? 'member-inactive' : '',
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
          person.inactive ? 'Inaktiv' : person.isGuest ? 'Gastkegler' : 'Mitglied'
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
      if (person.inactive) return;
      openAttendanceStatusModal(
        person
      );
    };

    grid.appendChild(card);
  });
}

function renderDrinksOnlyCards() {
  const grid = document.getElementById('persons-grid-drinks-only');
  if (!grid) return;
  grid.replaceChildren();
  const guests = persons.filter(person => person.isDrinksOnly)
    .sort((a,b) => a.name.localeCompare(b.name,'de'));
  for (const person of guests) {
    const card = document.createElement('div');
    card.className = 'person-card drinks-only-card ' + getPersonCardStatusClass(person);
    const avatar = document.createElement('div');
    avatar.innerHTML = getAvatarHtml(person.name, getAttendanceAvatarClass(person));
    const name = document.createElement('div');
    name.className = 'person-name';
    name.textContent = person.name;
    const role = document.createElement('div');
    role.className = 'person-role';
    role.textContent = '🍺 Sauftourist';
    const status = document.createElement('div');
    status.className = 'person-times';
    status.textContent = person.present ? (person.left ? '🚪 Gegangen' : '🟢 Da' + (person.arrivalTime ? ' · ' + person.arrivalTime : '')) : '⚪ Keine Rückmeldung';
    const hint = document.createElement('div');
    hint.className = 'person-times';
    hint.textContent = 'Nur Getränke · keine Kegelstrafen';
    card.append(avatar, name, role, status, hint);
    card.onclick = () => openAttendanceStatusModal(person);
    grid.appendChild(card);
  }
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
  renderDrinksOnlyCards();
  renderMemberManagement();
}

async function addPerson(
  isGuest, isDrinksOnly = false
) {
  const input =
    document.getElementById(
      isDrinksOnly ? 'new-drinks-only-input' : isGuest ? 'new-guest-input' : 'new-person-input'
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
    isDrinksOnly: !!isDrinksOnly,
    inactive: false,

    present: false,

    attendanceStatus: ATTENDANCE_STATUS.UNKNOWN,

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
          },

            rounds: Array.isArray(person.rounds)
              ? person.rounds.map(round => ({
                  ...round,
                  drinks: {
                    ...(round.drinks || {})
                  }
                }))
              : [],

          freeStrafen:
            Array.isArray(
              person.freeStrafen
            )
              ? person.freeStrafen.map(
                  entry => ({
                    ...entry
                  })
                )
              : []
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

  if (!previousState.present) {
    playSound(sounds.welcome);
  }

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

// Nach bestätigtem Firestore-Schreibvorgang sofort den tatsächlichen Serverwert
// anzeigen. Live-Snapshots bleiben für alle anderen Clients zuständig.
function applyConfirmedLiveCounter(personName, category, key, value) {
  const person = persons.find(p => p.name === personName);
  if (!person || !['drinks','strafen'].includes(category)) return;
  if (!person[category] || typeof person[category] !== 'object') person[category] = {};
  person[category][key] = value;
  const cached = livePersonCounters.get(personName) || {};
  const updated = {...(cached[category] || {}), [key]: value};
  livePersonCounters.set(personName, {...cached, [category]: updated});
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

    const newValue = await window.firestoreApi
      .changeLivePersonCounter(
        clubId,
        personName,
        category,
        key,
        Number(delta || 0)
      );

    if (!Number.isFinite(Number(newValue))) {
      throw new Error('Firestore hat keinen gültigen Zählerstand bestätigt');
    }
    applyConfirmedLiveCounter(personName, category, key, Number(newValue));
    renderLivePersonChanges();
    persistState();
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

    const results = await window.firestoreApi
      .changeMultipleLivePersonCounters(
        clubId,
        validChanges
      );
    if (!Array.isArray(results) || results.length !== validChanges.length ||
        results.some(r => !Number.isFinite(Number(r.value)))) {
      throw new Error('Firestore hat die Mehrfachbuchung nicht vollständig bestätigt');
    }
    results.forEach(r => applyConfirmedLiveCounter(r.personName, r.category, r.key, Number(r.value)));
    renderLivePersonChanges();
    persistState();

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

async function balanceTeamsRandomly() {
  const team1 = persons.filter(person =>
    person.present &&
    !person.left &&
    normalizeTisch(person.tisch) === 'T1'
  );

  const team2 = persons.filter(person =>
    person.present &&
    !person.left &&
    normalizeTisch(person.tisch) === 'T2'
  );

  const difference =
    Math.abs(team1.length - team2.length);

  if (difference < 2) {
    const message =
      difference === 0
        ? '⚖️ Die Teams sind bereits gleich groß'
        : '⚖️ Bei einer ungeraden Spielerzahl ist kein vollständiger Ausgleich möglich';

    showToast(
      message,
      'success'
    );

    return;
  }

  const sourceTeam =
    team1.length > team2.length
      ? 'T1'
      : 'T2';

  const targetTeam =
    sourceTeam === 'T1'
      ? 'T2'
      : 'T1';

  const sourceMembers =
    sourceTeam === 'T1'
      ? team1
      : team2;

  if (!sourceMembers.length) {
    showToast(
      'Keine Person zum Wechseln gefunden',
      'error'
    );

    return;
  }

  const randomIndex =
    Math.floor(
      Math.random() *
      sourceMembers.length
    );

  const selectedPerson =
    sourceMembers[randomIndex];

  const oldTeam =
    selectedPerson.tisch;

  selectedPerson.tisch =
    targetTeam;

  renderAll();

  const saved =
    await saveLivePersonStatus(
      selectedPerson
    );

  if (!saved) {
    selectedPerson.tisch =
      oldTeam;

    renderAll();

    showToast(
      '❌ Teamwechsel konnte nicht synchronisiert werden',
      'error'
    );

    return;
  }

  syncCurrentClubToStore();
  saveClubSystem();

  const oldTeamName =
    stripLeadingTeamEmoji(
      getGroupLabel(
        sourceTeam
      )
    );

  const newTeamName =
    stripLeadingTeamEmoji(
      getGroupLabel(
        targetTeam
      )
    );

  showToast(
    `⚖️ ${selectedPerson.name}: ${oldTeamName} → ${newTeamName}`,
    'success'
  );
}

async function saveLivePersonTeam(
  person,
  newTeam
) {
  if (!person) {
    return false;
  }

  const previousTeam =
    normalizeTisch(
      person.tisch
    );

  person.tisch =
    normalizeTisch(
      newTeam
    );

  renderAll();

  const saved =
    await saveLivePersonStatus(
      person
    );

  if (!saved) {
    person.tisch =
      previousTeam;

    renderAll();

    return false;
  }

  syncCurrentClubToStore();
  saveClubSystem();

  return true;
}


// Mitgliederverwaltung: dauerhaftes Aktiv/Inaktiv, unabhaengig von Abend-Anwesenheit.
function renderMemberManagement() {
  const root = document.getElementById('member-management-list');
  if (!root) return;
  root.replaceChildren();
  const sections = [
    {title:'👥 Clubmitglieder', people:persons.filter(p=>!p.isGuest&&!p.isDrinksOnly), canToggle:true},
    {title:'🎳 Gastkegler', people:persons.filter(p=>p.isGuest&&!p.isDrinksOnly), canToggle:false},
    {title:'🍺 Sauftouristen', people:persons.filter(p=>p.isDrinksOnly), canToggle:false}
  ];
  for (const section of sections) {
    const heading=document.createElement('div'); heading.className='subsection-title';heading.textContent=section.title;
    root.appendChild(heading);
    const grid=document.createElement('div');grid.className='member-manage-grid';root.appendChild(grid);
    const ordered=section.people.slice().sort((a,b)=>Number(!!a.inactive)-Number(!!b.inactive)||a.name.localeCompare(b.name,'de'));
    if(!ordered.length){const empty=document.createElement('p');empty.textContent='Noch keine Personen';grid.appendChild(empty);}
    for(const person of ordered){
      const card=document.createElement('div');card.className='member-manage-card'+(person.inactive?' member-manage-inactive':'');
      const avatar=document.createElement('div');avatar.className='member-manage-avatar';
      if(person.avatarData && /^data:image\/(jpeg|png|webp);base64,/.test(person.avatarData)){
        const img=document.createElement('img');img.src=person.avatarData;img.alt='';avatar.appendChild(img);
      }else{
        avatar.textContent=person.name.trim().split(/\s+/).map(part=>part[0]||'').join('').slice(0,2).toUpperCase();
      }
      const info=document.createElement('div');info.className='member-manage-info';
      const name=document.createElement('strong');name.textContent=person.name;
      const kind=document.createElement('small');kind.textContent=section.canToggle?(person.inactive?'Inaktiv':'Aktiv'):section.title.slice(2);
      info.append(name,kind);
      const actions=document.createElement('div');actions.className='member-manage-actions';
      const photo=document.createElement('button');photo.type='button';photo.className='secondary-btn';photo.textContent='📷 Bild';
      photo.onclick=()=>pickMemberAvatar(person.name);
      actions.appendChild(photo);
      if(person.avatarData){
        const remove=document.createElement('button');remove.type='button';remove.className='secondary-btn';remove.textContent='✕ Bild';
        remove.onclick=()=>setMemberAvatar(person.name,'');
        actions.appendChild(remove);
      }
      if(section.canToggle){
        const toggle=document.createElement('button');toggle.type='button';toggle.className='add-btn';
        toggle.textContent=person.inactive?'▶ Aktivieren':'⏸ Inaktiv';
        toggle.onclick=()=>setMemberInactive(person.name,!person.inactive);
        actions.appendChild(toggle);
      }
      if(section.canToggle){
        const profile=document.createElement('button');profile.type='button';profile.className='member-manage-profile';
        profile.setAttribute('aria-label','Persönliche Daten von '+person.name+' bearbeiten');
        profile.onclick=()=>openMemberProfile(person.name);
        const birthday=document.createElement('small');
        birthday.textContent=window.KCBirthdays?.parse(person.birthDate)?'🎂 '+person.birthDate.split('-').reverse().join('.'):'Persönliche Daten bearbeiten';
        info.appendChild(birthday);profile.append(avatar,info);card.append(profile,actions);
      }else card.append(avatar,info,actions);
      grid.appendChild(card);
    }
  }
}

function pickMemberAvatar(name) {
  const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp';
  picker.onchange=async()=>{
    const file=picker.files?.[0];if(!file)return;
    if(file.size>8*1024*1024){showToast('Bild ist zu groß (max. 8 MB)','error');return;}
    try{
      const data=await new Promise((resolve,reject)=>{
        const image=new Image();const url=URL.createObjectURL(file);
        image.onload=()=>{
          try{
            const canvas=document.createElement('canvas');const ratio=Math.min(1,180/Math.max(image.naturalWidth,image.naturalHeight));
            canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
            canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
            const data=canvas.toDataURL('image/jpeg',0.72);URL.revokeObjectURL(url);resolve(data);
          }catch(e){URL.revokeObjectURL(url);reject(e);}
        };
        image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Bild nicht lesbar'));};
        image.src=url;
      });
      if(data.length>100000)throw new Error('Bild zu groß nach Verarbeitung');
      await setMemberAvatar(name,data);
    }catch(e){console.error(e);showToast('Bild konnte nicht gespeichert werden','error');}
  };
  picker.click();
}
async function setMemberAvatar(name,data) {
  const person=persons.find(p=>p.name===name);if(!person)return;
  const previous=person.avatarData||'';
  person.avatarData=data;
  try{
    if(!ACTIVE_CLUB||!window.firestoreApi)throw new Error('Firebase nicht bereit');
    const saved=await saveToFirestore(false);
    if(!saved)throw new Error('Speichern fehlgeschlagen');
    renderAll();
    showToast(data?'Avatar gespeichert':'Avatar entfernt','success');
  }catch(e){
    person.avatarData=previous;renderAll();console.error(e);
    showToast('Avatar konnte nicht gespeichert werden','error');
  }
}
async function setMemberInactive(name,inactive) {
 const person=persons.find(p=>p.name===name&&!p.isGuest);
 if(!person)return;
 const old=!!person.inactive;
 person.inactive=!!inactive;
 if(inactive){person.present=false;person.attendanceStatus=ATTENDANCE_STATUS.UNKNOWN;person.tisch='';}
 try {
  if(!ACTIVE_CLUB || !window.firestoreApi?.saveLivePerson)throw new Error('Firebase nicht bereit');
  await window.firestoreApi.saveLivePerson(getClubFirestoreId(ACTIVE_CLUB),person.name,getLivePersonStatusPayload(person));
  await saveToFirestore(false);
  renderAll();renderMemberManagement();
  showToast(inactive?'Mitglied inaktiv':'Mitglied aktiv','success');
 }catch(e){person.inactive=old;renderAll();renderMemberManagement();showToast('Status konnte nicht gespeichert werden','error');console.error(e);}
}

