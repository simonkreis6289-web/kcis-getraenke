// ── CLUBS ──

function triggerClubAvatarUpload(clubName) {
  pendingClubAvatarName = clubName;
  const input = document.getElementById('club-avatar-upload');
  if (!input) return;
  input.value = '';
  input.click();
}

function setupClubAvatarUpload() {
  const input = document.getElementById('club-avatar-upload');
  if (!input) return;

  input.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !pendingClubAvatarName) return;

    if (!file.type.startsWith('image/')) {
      showToast('Bitte eine Bilddatei auswählen', 'error');
      return;
    }

    try {
      const resizedDataUrl = await readImageAsResizedDataUrl(file, 320, 320, 0.82);

      if (!CLUBS[pendingClubAvatarName]) return;

      CLUBS[pendingClubAvatarName].avatar = resizedDataUrl;

      if (ACTIVE_CLUB === pendingClubAvatarName) {
        syncCurrentClubToStore();
      }

      saveClubSystem();
      renderClubList();

      await saveClubMetaToFirestore(pendingClubAvatarName);

      showToast('✅ Club-Avatar gespeichert', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Bild konnte nicht geladen werden', 'error');
    } finally {
      pendingClubAvatarName = null;
      input.value = '';
    }
  });
}

function readImageAsResizedDataUrl(file, maxWidth = 320, maxHeight = 320, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        const scale = Math.min(maxWidth / width, maxHeight / height, 1);
        const targetWidth = Math.round(width * scale);
        const targetHeight = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function removeClubAvatar(clubName) {
  if (!CLUBS[clubName]) return;
  if (!confirm(`Clubbild von "${clubName}" wirklich löschen?`)) return;

  CLUBS[clubName].avatar = '';

  if (ACTIVE_CLUB === clubName) {
    syncCurrentClubToStore();
  }

  saveClubSystem();
  renderClubList();

  await saveClubMetaToFirestore(clubName);

  showToast('🗑️ Club-Avatar gelöscht', 'success');
}

async function saveClubMetaToFirestore(clubName) {
  if (!window.firestoreApi || !clubName) return false;

  try {
    const clubId = getClubFirestoreId(clubName);
    const club = CLUBS[clubName] || {};

    await window.firestoreApi.saveClubMeta(clubId, {
      name: clubName,
      avatar: club.avatar || '',
      createdAt: club.createdAt || new Date().toISOString()
    });

    return true;
  } catch (e) {
    console.error('Fehler beim Speichern der Club-Metadaten:', e);
    return false;
  }
}

async function loadClubListFromFirestore() {
  if (!window.firestoreApi) return false;

  try {
    const clubsFromDb = await window.firestoreApi.loadClubList();
    if (!clubsFromDb || !clubsFromDb.length) return false;

    const mergedClubs = { ...CLUBS };

    clubsFromDb.forEach(entry => {
      const clubName = entry.name || entry.id;

      if (!mergedClubs[clubName]) {
        mergedClubs[clubName] = createEmptyClubData();
      }

      if (entry.avatar) {
        mergedClubs[clubName].avatar = entry.avatar;
      }
    });

    CLUBS = mergedClubs;

    renderClubList();
    return true;
  } catch (e) {
    console.error('Fehler beim Laden der Clubliste:', e);
    return false;
  }
}

function getClubFirestoreId(clubName) {
  return String(clubName || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'club';
}

function createEmptyClubData() {
  return {
    avatar: '',
    persons: [],
    prices: {
      kl_bier: 0,
      gr_bier: 0,
      kl_softd: 0,
      gr_softd: 0,
      malz: 0,
      wasser: 0,
      schnaps: 0,
      weizen: 0,
      wein: 0
    },
    DRINKS: [
      { key: 'kl_bier', label: 'Kl. Bier' },
      { key: 'gr_bier', label: 'Gr. Bier' },
      { key: 'kl_softd', label: 'Kl. Fanta/Cola' },
      { key: 'gr_softd', label: 'Gr. Fanta/Cola' },
      { key: 'malz', label: 'Malzbier' },
      { key: 'wasser', label: 'Wasser' },
      { key: 'schnaps', label: 'Schnaps' },
      { key: 'weizen', label: 'Weizen' },
      { key: 'wein', label: 'Wein/Sekt' }
    ],
    STRAFEN: [
      { key: 'pudel', label: 'Pudel' },
      { key: 'klingel', label: 'Klingel' }
    ],
    strafPrices: {
      pudel: 0,
      klingel: 0
    },
    SPIELE_KATALOG: ['Tannenbaum', 'Darts'],
    RUNDEN_GRUENDE: ['1000er-Runde', '2000er-Runde', 'Geburtstag'],
    spiele: [],
    selectedLoser: null,
    teamDrinks: {},
    bahnPreisProStunde: 0,
    bahnTimerStart: null,
    bahnTimerRunning: false,
    teamStopwatchActive: false,
    teamStopwatchRunning: false,
    teamStopwatchStart: null,
    teamCountdownDuration: 0,
    teamCountdownRemainingBefore: 0,
    tannenbaumState: createTannenbaumState(),
    TANNENBAUM_BASE: { ...TANNENBAUM_DEFAULT_BASE },
    tannenbaumHardRule: true,
    dartsState: createDartsState(),
    lotterieState: createLotterieState(),
    tiberiusState: createTiberiusState(),
    lotterieSettings: {
      minAmount: 0.10,
      maxAmount: 10.00
    },
    tiberiusSettings: {
      minPins: 10,
      maxPins: 300
    },
    wurfSettings: {
      maxBuys: 3
    },
    timePenaltySettings: {
      startTime: '20:00',
      endTime: '23:00'
    },
    STRAFEN_LIMIT: 30,
    strafenHistory: [],
    lastLocalChangeAt: 0
  };
}

function syncCurrentClubToStore() {
  if (!ACTIVE_CLUB) return;

  const existingClub = CLUBS[ACTIVE_CLUB] || createEmptyClubData();

  CLUBS[ACTIVE_CLUB] = {
    avatar: existingClub.avatar || '',
    persons: JSON.parse(JSON.stringify(persons)),
    prices: JSON.parse(JSON.stringify(prices)),
    DRINKS: JSON.parse(JSON.stringify(DRINKS)),
    SPIELE_KATALOG: JSON.parse(JSON.stringify(SPIELE_KATALOG)),
    RUNDEN_GRUENDE: JSON.parse(JSON.stringify(RUNDEN_GRUENDE)),
    spiele: JSON.parse(JSON.stringify(spiele)),
    selectedLoser,
    teamDrinks: JSON.parse(JSON.stringify(teamDrinks)),
    bahnPreisProStunde,
    bahnTimerStart,
    bahnTimerRunning,
    teamStopwatchActive,
    teamStopwatchRunning,
    teamStopwatchStart,
    teamCountdownDuration,
    teamCountdownRemainingBefore,
    lastLocalChangeAt,
    lastRemoteChangeAt,
    STRAFEN: JSON.parse(JSON.stringify(STRAFEN)),
    strafPrices: JSON.parse(JSON.stringify(strafPrices)),
    strafenHistory: JSON.parse(JSON.stringify(strafenHistory)),
    tannenbaumState: JSON.parse(JSON.stringify(tannenbaumState)),
    TANNENBAUM_BASE: JSON.parse(JSON.stringify(TANNENBAUM_BASE)),
    lotterieState: JSON.parse(JSON.stringify(lotterieState)),
    tiberiusState: JSON.parse(JSON.stringify(tiberiusState)),
    lotterieSettings: JSON.parse(JSON.stringify(lotterieSettings)),
    tiberiusSettings: JSON.parse(JSON.stringify(tiberiusSettings)),
    tannenbaumHardRule,
    wurfSettings: JSON.parse(JSON.stringify(wurfSettings)),
    timePenaltySettings: JSON.parse(JSON.stringify(timePenaltySettings)),
    STRAFEN_LIMIT,
    dartsState: JSON.parse(JSON.stringify(dartsState))
  };
}

function saveClubSystem() {
  if (appReady && ACTIVE_CLUB && CLUBS[ACTIVE_CLUB]) {
    syncCurrentClubToStore();
  }

  const payload = {
    activeClub: ACTIVE_CLUB,
    clubs: CLUBS
  };

  localStorage.setItem('kcis_club_system_v1', JSON.stringify(payload));
}

function loadClubSystem() {
  try {
    const raw = localStorage.getItem('kcis_club_system_v1');
    if (!raw) return false;

    const data = JSON.parse(raw);
    CLUBS = data.clubs || {};
    ACTIVE_CLUB = data.activeClub || null;
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function renderClubList() {
  const el = document.getElementById('club-list');
  if (!el) return;

  const clubNames = Object.keys(CLUBS).sort((a, b) => a.localeCompare(b, 'de'));
  el.innerHTML = '';

  if (!clubNames.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Noch kein Kegelclub angelegt</div>';
    return;
  }

  clubNames.forEach(name => {
    const card = document.createElement('div');
    card.className = 'club-card';

    const avatar = getClubAvatarHtml(name);
    const memberCount = (CLUBS[name].persons || []).filter(p => !p.isGuest).length;
    const hasAvatar = !!(CLUBS[name] && CLUBS[name].avatar);

    card.innerHTML = `
      ${avatar}
      <div class="club-info">
        <div class="club-name">${name}</div>
        <div class="club-meta">${memberCount} Mitglieder</div>
        <div class="club-actions">
          <button class="club-action-btn" onclick="event.stopPropagation(); triggerClubAvatarUpload('${escapeForJs(name)}')">
            📷 Bild hochladen
          </button>
          ${hasAvatar ? `
            <button class="club-action-btn delete" onclick="event.stopPropagation(); removeClubAvatar('${escapeForJs(name)}')">
              ✕ Bild löschen
            </button>
          ` : ''}
        </div>
      </div>
    `;

    card.onclick = () => selectClub(name);
    el.appendChild(card);
  });
}

function goToClubSelection() {
  if (currentClubUnsubscribe) {
    currentClubUnsubscribe();
    currentClubUnsubscribe = null;
  }

  syncCurrentClubToStore();
  saveClubSystem();

  document.getElementById('app').style.display = 'none';
  document.getElementById('club-start-screen').classList.remove('hidden');

  renderClubList();
  updateAppHeader();
}

async function createClub() {
  const input = document.getElementById('new-club-input');
  const name = (input.value || '').trim();

  if (!name) {
    showToast('Bitte Clubnamen eingeben', 'error');
    return;
  }

  if (CLUBS[name]) {
    showToast('Club existiert bereits', 'error');
    return;
  }

  CLUBS[name] = createEmptyClubData();
  saveClubSystem();
  renderClubList();

  const ok = await saveClubMetaToFirestore(name);

  if (!ok) {
    showToast('⚠️ Club lokal angelegt, aber nicht in Firestore gespeichert', 'error');
  } else {
    showToast(`✅ Club "${name}" angelegt`, 'success');
  }

  input.value = '';
}

function applyLivePersonData(data) {
  if (!data || !data.name) return false;

  const personName = String(data.name);

  livePersonCounters.set(personName, {
    drinks: { ...(data.drinks || {}) },
    strafen: { ...(data.strafen || {}) }
  });

  const person = persons.find(p => p.name === personName);
  if (!person) return false;

  if (data.drinks) {
    person.drinks = {
      ...(person.drinks || {}),
      ...data.drinks
    };
  }

  if (data.strafen) {
    person.strafen = {
      ...(person.strafen || {}),
      ...data.strafen
    };
  }

  return true;
}

function reapplyLivePersonCounters() {
  if (!liveCountersReady) return;

  livePersonCounters.forEach((liveData, personName) => {
    const person = persons.find(p => p.name === personName);
    if (!person) return;

    person.drinks = {
      ...(person.drinks || {}),
      ...(liveData.drinks || {})
    };

    person.strafen = {
      ...(person.strafen || {}),
      ...(liveData.strafen || {})
    };
  });
}

function renderLiveCounterChanges() {
  renderGetraenke();
  renderStrafen();
  renderAbrechnung();
  updateStats();

  syncCurrentClubToStore();
  saveClubSystem();
}

function stopLivePersonSync() {
  if (currentLivePersonsUnsubscribe) {
    currentLivePersonsUnsubscribe();
    currentLivePersonsUnsubscribe = null;
  }

  livePersonCounters.clear();
  liveCountersReady = false;
}

async function startLivePersonSync(clubId) {
  if (!window.firestoreApi || !clubId) return;

  stopLivePersonSync();

  try {
    await window.firestoreApi.seedLivePersons(clubId, persons);
  } catch (error) {
    console.error(
      'Live-Personen konnten nicht initialisiert werden:',
      error
    );
  }

  currentLivePersonsUnsubscribe =
    window.firestoreApi.subscribeToLivePersons(
      clubId,
      changes => {
        let hasChanges = false;

        changes.forEach(change => {
          if (change.type === 'removed') return;

          if (applyLivePersonData(change.data)) {
            hasChanges = true;
          }
        });

        liveCountersReady = true;

        if (hasChanges) {
          renderLiveCounterChanges();
        }
      },
      error => {
        console.error(
          'Live-Personen-Synchronisation fehlgeschlagen:',
          error
        );

        showToast(
          '❌ Getränke- und Strafensynchronisation gestört',
          'error'
        );
      }
    );
}

async function selectClub(clubName) {
  if (!clubName) return;

  if (currentClubUnsubscribe) {
    currentClubUnsubscribe();
    currentClubUnsubscribe = null;
  }

  ACTIVE_CLUB = clubName;
  const clubId = getClubFirestoreId(clubName);

  const localClub = CLUBS[clubName] || createEmptyClubData();

  lastLocalChangeAt = Number(localClub.lastLocalChangeAt || 0);
  lastRemoteChangeAt = Number(localClub.lastRemoteChangeAt || 0);

  persons = JSON.parse(JSON.stringify(localClub.persons || []));
  prices = JSON.parse(JSON.stringify(localClub.prices || {}));

  STRAFEN = JSON.parse(JSON.stringify(localClub.STRAFEN || [
    { key: 'pudel', label: 'Pudel' },
    { key: 'klingel', label: 'Klingel' }
  ]));

  strafPrices = JSON.parse(JSON.stringify(localClub.strafPrices || {}));
  DRINKS = JSON.parse(JSON.stringify(localClub.DRINKS || []));
  SPIELE_KATALOG = JSON.parse(JSON.stringify(localClub.SPIELE_KATALOG || []));
  RUNDEN_GRUENDE = JSON.parse(JSON.stringify(localClub.RUNDEN_GRUENDE || []));
  spiele = JSON.parse(JSON.stringify(localClub.spiele || []));
  selectedLoser = localClub.selectedLoser || null;
  teamDrinks = JSON.parse(JSON.stringify(localClub.teamDrinks || {}));

  bahnPreisProStunde = parseFloat(localClub.bahnPreisProStunde || 0) || 0;
  bahnTimerStart = localClub.bahnTimerStart || null;
  bahnTimerRunning = !!localClub.bahnTimerRunning;
  STRAFEN_LIMIT = parseFloat(localClub.STRAFEN_LIMIT || 30) || 30;

  teamStopwatchActive = !!localClub.teamStopwatchActive;
  teamStopwatchRunning = !!localClub.teamStopwatchRunning;
  teamStopwatchStart = localClub.teamStopwatchStart || null;
  teamCountdownDuration = parseInt(localClub.teamCountdownDuration || 0, 10) || 0;
  teamCountdownRemainingBefore = parseInt(localClub.teamCountdownRemainingBefore || 0, 10) || 0;

  TANNENBAUM_BASE = JSON.parse(JSON.stringify(localClub.TANNENBAUM_BASE || TANNENBAUM_DEFAULT_BASE));
  tannenbaumHardRule = localClub.tannenbaumHardRule !== undefined ? !!localClub.tannenbaumHardRule : true;
  tannenbaumState = JSON.parse(JSON.stringify(localClub.tannenbaumState || createTannenbaumState()));
  ensureTannenbaumState();

  lotterieState = JSON.parse(JSON.stringify(localClub.lotterieState || createLotterieState()));
  tiberiusState = JSON.parse(JSON.stringify(localClub.tiberiusState || createTiberiusState()));
  wurfSettings = JSON.parse(JSON.stringify(localClub.wurfSettings || { maxBuys: 3 }));

  lotterieSettings = JSON.parse(JSON.stringify(localClub.lotterieSettings || {
    minAmount: 0.10,
    maxAmount: 10.00
  }));

  timePenaltySettings = JSON.parse(JSON.stringify(localClub.timePenaltySettings || {
    startTime: '20:00',
    endTime: '23:00'
  }));

  tiberiusSettings = JSON.parse(JSON.stringify(localClub.tiberiusSettings || {
    minPins: 10,
    maxPins: 300
  }));

  ensureLotterieState();
  ensureTiberiusState();

  strafenHistory = JSON.parse(JSON.stringify(localClub.strafenHistory || []));

  dartsState = JSON.parse(JSON.stringify(localClub.dartsState || createDartsState()));
  ensureDartsState();

  hydrateState();
  renderAll();
  updateAppHeader();

  document.getElementById('club-start-screen').classList.add('hidden');
  document.getElementById('app').style.display = 'block';

  const firestoreLoaded = await loadFromFirestore();

  if (!firestoreLoaded) {
    await saveToFirestore(false);
  } else {
    renderAll();
    updateAppHeader();
  }
    
await startLivePersonSync(clubId);

  if (window.firestoreApi && typeof window.firestoreApi.subscribeToClubState === 'function') {
    currentClubUnsubscribe = window.firestoreApi.subscribeToClubState(
      clubId,
      (state) => {
        if (!state) return;

        const incomingClientAt = Number(state.updatedClientAt || 0);
        const incomingClientId = state.updatedClientId || '';

        if (incomingClientId === CLIENT_ID) {
          lastRemoteChangeAt = Math.max(lastRemoteChangeAt, incomingClientAt);
          return;
        }

        if (incomingClientAt && incomingClientAt < lastRemoteChangeAt) {
          console.log('Älteren Firestore-Stand ignoriert', {
            incomingClientAt,
            lastRemoteChangeAt
          });
          return;
        }

        isApplyingRemoteState = true;

        try {
          applyLoadedState(state);

          lastRemoteChangeAt = incomingClientAt;
          lastLocalChangeAt = Math.max(lastLocalChangeAt, incomingClientAt);

          renderAll();
          updateAppHeader();

          syncCurrentClubToStore();
          saveClubSystem();

          console.log('Live-Sync übernommen:', {
            incomingClientAt,
            incomingClientId
          });
        } finally {
          isApplyingRemoteState = false;
        }
      },
      (error) => {
        console.error('Live-Sync Fehler:', error);
        showToast('❌ Live-Sync Fehler. Console prüfen.', 'error');
      }
    );
  }
}

function updateAppHeader() {
  const title = document.querySelector('header h1');
  const subtitle = document.querySelector('header .subtitle');
  const backBtn = document.getElementById('clubBackBtn');

  if (title) title.textContent = ACTIVE_CLUB || 'Kegelclub Manager';
  if (subtitle) subtitle.textContent = ACTIVE_CLUB ? 'Getränkeabrechnung' : 'Club auswählen';

  if (backBtn) {
    backBtn.classList.toggle('hidden', !ACTIVE_CLUB);
  }
}

function getClubAvatarFileCandidates(name) {
  const clean = String(name || '').trim();

  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const base = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return [
    `clubbilder/${base}.jpg`,
    `clubbilder/${base}.jpeg`,
    `clubbilder/${base}.png`,
    `clubbilder/${base}.webp`
  ];
}

function getClubAvatarHtml(name) {
  const initials = String(name || '')
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const club = CLUBS[name] || {};
  const uploadedAvatar = club.avatar || '';

  if (uploadedAvatar) {
    return `
      <div class="club-avatar">
        <img src="${uploadedAvatar}" alt="${name}">
        <span class="club-avatar-fallback" style="display:none;">${initials}</span>
      </div>
    `;
  }

  const candidates = getClubAvatarFileCandidates(name);

  return `
    <div class="club-avatar">
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
              var fb = parent.querySelector('.club-avatar-fallback');
              if (fb) fb.style.display = 'flex';
            }
          }
        "
      >
      <span class="club-avatar-fallback" style="display:none;">${initials}</span>
    </div>
  `;
}
