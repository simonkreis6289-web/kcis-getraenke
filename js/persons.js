// ─────────────────────────────────────────────────────────────
// ── PERSONEN / ANWESENHEIT ──
// ─────────────────────────────────────────────────────────────

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

function getAvatarHtml(name) {
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
    <div class="person-avatar">
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

function getPersonTeamCardHtml(person) {
  const teamKey =
    normalizeTisch(
      person.tisch
    );

  if (!teamKey) {
    return `
      <div
        class="person-team-badge no-team"
      >
        ➖ Kein Team
      </div>
    `;
  }

  const settings =
    groupSettings?.[teamKey] || {};

  const emoji =
    settings.emoji ||
    (
      teamKey === 'T1'
        ? '⚫'
        : '🔴'
    );

  const label =
    typeof getGroupLabel ===
      'function'
      ? getGroupLabel(teamKey)
      : (
          settings.name ||
          teamKey
        );

  return `
    <div
      class="person-team-badge ${teamKey.toLowerCase()}"
    >
      ${emoji} ${label}
    </div>
  `;
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

      ${getAvatarHtml(person.name)}

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

    present:
      true,

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