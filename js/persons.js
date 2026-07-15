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

    card.className =
      'person-card' +
      (
        person.present
          ? ' present'
          : ' absent'
      ) +
      (
        person.isGuest
          ? ' guest'
          : ''
      );

    let badgeClass =
      person.present
        ? 'present-badge'
        : 'absent-badge';

    let badgeText =
      person.present
        ? 'DA'
        : 'FEHLT';

    if (
      person.present &&
      person.left
    ) {
      badgeClass =
        'left-badge';

      badgeText =
        'RAUS';
    }

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

        <div class="person-attendance-status">
          ${getAttendanceStatusLabel(person)}
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

      <div class="${badgeClass}">
        ${badgeText}
      </div>
    `;

    card.onclick = () => {
      const wasPresent =
        !!person.present;

      person.present =
        !person.present;

      if (!person.present) {
        person.tisch = '';
        person.left = false;
        person.leftAt = '';
        person.arrivalTime = '';
        person.leftEarlyAt = '';
      }

      renderAll();
      persistState();

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

function addPerson(isGuest) {
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

  persons.push({
    name,
    isGuest:
      !!isGuest,

    present: true,
      
    attendanceStatus: 'present',

    tisch: '',

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
  });

  input.value = '';

  renderAll();
  persistState();

  showToast(
    `✅ ${name} hinzugefügt`,
    'success'
  );
}

function deletePerson(name) {
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

function confirmArrivalTime() {
  if (!arrivalEditPerson) {
    return;
  }

  const person =
    arrivalEditPerson;

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

  closeArrivalModal();

  renderAll();
  persistState();

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

function confirmLeftEarlyTime() {
  if (!leftEarlyEditPerson) {
    return;
  }

  const person =
    leftEarlyEditPerson;

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

  closeLeftEarlyModal();

  renderAll();
  persistState();

  showToast(
    `✅ Gehzeit gespeichert: ${savedTime}`,
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
