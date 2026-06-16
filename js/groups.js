function getGroupTheme(colorKey) {
  const themes = {
    red:    { hex: '#d62828', bg: 'rgba(214,40,40,0.14)', emoji: '🔴' },
    orange: { hex: '#f77f00', bg: 'rgba(247,127,0,0.16)', emoji: '🟠' },
    yellow: { hex: '#ffcc00', bg: 'rgba(255,204,0,0.20)', emoji: '🟡' },
    green:  { hex: '#2a9d8f', bg: 'rgba(42,157,143,0.16)', emoji: '🟢' },
    blue:   { hex: '#2563eb', bg: 'rgba(37,99,235,0.14)', emoji: '🔵' },
    purple: { hex: '#7b2cbf', bg: 'rgba(123,44,191,0.14)', emoji: '🟣' },
    black:  { hex: '#222222', bg: 'rgba(34,34,34,0.12)', emoji: '⚫' },
    white:  { hex: '#d8d8d8', bg: 'rgba(216,216,216,0.35)', emoji: '⚪' },
    brown:  { hex: '#8b5e3c', bg: 'rgba(139,94,60,0.16)', emoji: '🟤' }
  };

  return themes[colorKey] || themes.black;
}

function normalizeGroupColorKey(value, fallback = 'black') {
  const map = {
    '#d62828': 'red',
    '#f77f00': 'orange',
    '#ffcc00': 'yellow',
    '#2a9d8f': 'green',
    '#2563eb': 'blue',
    '#7b2cbf': 'purple',
    '#222222': 'black',
    '#111111': 'black',
    '#d8d8d8': 'white',
    '#dddddd': 'white',
    '#8b5e3c': 'brown'
  };
     
  return map[String(value || '').toLowerCase()] || value || fallback;
}

function getGroupLabel(teamKey) {
  const g = groupSettings?.[teamKey];

  if (!g) return teamKey === 'T1' ? '⚫ Wand' : '🔴 TV';

  const theme = getGroupTheme(g.color);

  return `${theme.emoji} ${g.name || teamKey}`.trim();
}

function getGroupColor(teamKey) {
  const g = groupSettings?.[teamKey];
  return getGroupTheme(g?.color).hex;
}

function getGroupBg(teamKey) {
  const g = groupSettings?.[teamKey];
  return getGroupTheme(g?.color).bg;
}

function applyGroupTheme() {
  const root = document.documentElement;

  root.style.setProperty('--t1b', getGroupColor('T1'));
  root.style.setProperty('--t1b_bg', getGroupBg('T1'));

  root.style.setProperty('--t2b', getGroupColor('T2'));
  root.style.setProperty('--t2b_bg', getGroupBg('T2'));
}

function getTeamLabel(teamKey) {
  return getGroupLabel(teamKey);
}
  
  
function renderGroupLabelsEverywhere() {
  const teamBtnT1 = document.getElementById('team-btn-t1');
  const teamBtnT2 = document.getElementById('team-btn-t2');

  if (teamBtnT1) teamBtnT1.textContent = `${getGroupLabel('T1')} verloren`;
  if (teamBtnT2) teamBtnT2.textContent = `${getGroupLabel('T2')} verloren`;

  document.querySelectorAll('.tannenbaum-throw-btn.t1').forEach(btn => {
    btn.textContent = `${getGroupLabel('T1')} Wurf`;
  });

  document.querySelectorAll('.tannenbaum-throw-btn.t2').forEach(btn => {
    btn.textContent = `${getGroupLabel('T2')} Wurf`;
  });

  document.querySelectorAll('.darts-score-card.t1 .darts-team-title').forEach(el => {
    el.textContent = getGroupLabel('T1');
  });

  document.querySelectorAll('.darts-score-card.t2 .darts-team-title').forEach(el => {
    el.textContent = getGroupLabel('T2');
  });

  document.querySelectorAll('#assign-modal button[onclick="setAssignTarget(\'T1\')"]').forEach(btn => {
    btn.textContent = getGroupLabel('T1');
  });

  document.querySelectorAll('#assign-modal button[onclick="setAssignTarget(\'T2\')"]').forEach(btn => {
    btn.textContent = getGroupLabel('T2');
  });
}

function renderGroupSettings() {
  const t1Name = document.getElementById('group-t1-name');
  const t1Color = document.getElementById('group-t1-color');
  const t2Name = document.getElementById('group-t2-name');
  const t2Color = document.getElementById('group-t2-color');

  if (!groupSettings) return;

  if (t1Name && document.activeElement !== t1Name) {
    t1Name.value = groupSettings.T1?.name || 'Wand';
  }

  if (t1Color && document.activeElement !== t1Color) {
    t1Color.value = normalizeGroupColorKey(groupSettings.T1?.color, 'black');
  }

  if (t2Name && document.activeElement !== t2Name) {
    t2Name.value = groupSettings.T2?.name || 'TV';
  }

  if (t2Color && document.activeElement !== t2Color) {
    t2Color.value = normalizeGroupColorKey(groupSettings.T2?.color, 'red');
  }
}

function saveGroupSettings() {
  if (!groupSettings.T1) groupSettings.T1 = {};
  if (!groupSettings.T2) groupSettings.T2 = {};

  groupSettings.T1.name =
    document.getElementById('group-t1-name')?.value.trim() || 'Wand';

  groupSettings.T1.color =
    normalizeGroupColorKey(document.getElementById('group-t1-color')?.value, 'black');

  groupSettings.T2.name =
    document.getElementById('group-t2-name')?.value.trim() || 'TV';

  groupSettings.T2.color =
    normalizeGroupColorKey(document.getElementById('group-t2-color')?.value, 'red');

  applyGroupTheme();
    renderGroupLabelsEverywhere();
  renderAll();
  persistState();

  showToast('✅ Gruppen gespeichert', 'success');
}


function renderGruppen() {
  const present = persons.filter(p => p.present).map(p => {
    p.tisch = normalizeTisch(p.tisch);
    return p;
  });

  const unEl = document.getElementById('unassigned-list');
  const t1El = document.getElementById('gruppe-t1');
  const t2El = document.getElementById('gruppe-t2');

  if (!unEl || !t1El || !t2El) return;

  const titleT1 = document.querySelector('.gruppe-box.t1 .gruppe-title');
  const titleT2 = document.querySelector('.gruppe-box.t2 .gruppe-title');

  if (titleT1) titleT1.textContent = getGroupLabel('T1');
  if (titleT2) titleT2.textContent = getGroupLabel('T2');

  unEl.innerHTML = '';
  t1El.innerHTML = '';
  t2El.innerHTML = '';

  const sortPeople = (a, b) => {
    if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  };

  const unassigned = present.filter(p => !p.tisch).sort(sortPeople);
  const team1 = present.filter(p => p.tisch === 'T1').sort(sortPeople);
  const team2 = present.filter(p => p.tisch === 'T2').sort(sortPeople);

  if (!unassigned.length) {
    unEl.innerHTML = '<span style="font-size:0.75rem;color:var(--green)">✅ Alle zugewiesen</span>';
  } else {
    unassigned.forEach(p => {
      const c = document.createElement('div');
      c.className = 'unassigned-chip' + (p.isGuest ? ' guest' : '');
      c.textContent = p.name;
      c.onclick = () => openAssignModal(p.name);
      unEl.appendChild(c);
    });
  }

  if (!team1.length) {
    t1El.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">Noch niemand</span>';
  } else {
    team1.forEach(p => {
      const c = document.createElement('div');
      c.className = 'gruppe-chip' + (p.isGuest ? ' guest' : '');
      c.innerHTML = `${p.name} <span style="opacity:0.5;font-size:0.7rem">⚙ ändern</span>`;
      c.onclick = () => openAssignModal(p.name);
      t1El.appendChild(c);
    });
  }

  if (!team2.length) {
    t2El.innerHTML = '<span style="font-size:0.75rem;color:var(--muted)">Noch niemand</span>';
  } else {
    team2.forEach(p => {
      const c = document.createElement('div');
      c.className = 'gruppe-chip' + (p.isGuest ? ' guest' : '');
      c.innerHTML = `${p.name} <span style="opacity:0.5;font-size:0.7rem">⚙ ändern</span>`;
      c.onclick = () => openAssignModal(p.name);
      t2El.appendChild(c);
    });
  }
}

    
function openAssignModal(personName) {
  const p = persons.find(x => x.name === personName);
  if (!p) return;

  assignPerson = p;

let current = 'aktuell nicht zugewiesen';
    if (p.tisch === 'T1') current = `aktuell bei ${getGroupLabel('T1')}`;
    if (p.tisch === 'T2') current = `aktuell bei ${getGroupLabel('T2')}`;

  document.getElementById('assign-modal-sub').textContent = `${p.name} ist ${current}`;
  document.getElementById('assign-modal').classList.remove('hidden');
}

function closeAssignModal() {
  document.getElementById('assign-modal').classList.add('hidden');
  assignPerson = null;
}

function setAssignTarget(target) {
  if (!assignPerson) return;

  assignPerson.tisch = normalizeTisch(target);
  closeAssignModal();
  renderAll();
  persistState();
}

    
function randomAssignUnassignedPeople() {
  const candidates = persons.filter(p => p.present && !p.left && !p.tisch);

  if (!candidates.length) {
    showToast('Alle Anwesenden sind bereits zugewiesen', 'success');
    return;
  }

  const shuffled = candidates
    .slice()
    .sort(() => Math.random() - 0.5);

  let t1Count = persons.filter(p => p.present && !p.left && p.tisch === 'T1').length;
  let t2Count = persons.filter(p => p.present && !p.left && p.tisch === 'T2').length;

  shuffled.forEach(p => {
    if (t1Count <= t2Count) {
      p.tisch = 'T1';
      t1Count++;
    } else {
      p.tisch = 'T2';
      t2Count++;
    }
  });

  renderAll();
  persistState();

  showToast('🎲 Personen zufällig verteilt', 'success');
}
   
function getGroupEmoji(teamKey) {
  const g = groupSettings?.[teamKey];
  return getGroupTheme(g?.color).emoji;
}
