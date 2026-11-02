const MENSCH_TARGET_SCORE = 36;

function createMenschState() {
  return {
    active: false,
    finished: false,
    playerOrder: [],
    currentIndex: 0,
    scores: {},
    throws: {},
    history: [],
    winner: '',
    ranking: [],
    startedAt: ''
  };
}

function ensureMenschState() {
  if (!menschState) menschState = createMenschState();
  if (!Array.isArray(menschState.playerOrder)) menschState.playerOrder = [];
  if (!menschState.scores || typeof menschState.scores !== 'object') menschState.scores = {};
  if (!menschState.throws || typeof menschState.throws !== 'object') menschState.throws = {};
  if (!Array.isArray(menschState.history)) menschState.history = [];
  menschState.active = !!menschState.active;
  menschState.finished = !!menschState.finished;
  menschState.currentIndex = parseInt(menschState.currentIndex || 0, 10) || 0;
}

function getMenschPlayers() {
  const names=getSoloNames('mensch');
  const active=getActivePlayersForSoloGame();
  return names.map(name=>active.find(p=>p.name===name)).filter(Boolean);
}

function moveMenschOrder(index,delta) { moveSoloName('mensch',index,delta); }

function resetMenschOrder() {
  menschState.playerOrder = getActivePlayersForSoloGame().map(p => p.name);
  renderMenschOrderEditor();
  persistState();
}

function renderMenschOrderEditor() { renderSoloOrderSettings('mensch'); }

function rotateMenschOrder(starterName) {
  getMenschPlayers();
  const idx = menschState.playerOrder.indexOf(starterName);
  if (idx >= 0) menschState.playerOrder = [...menschState.playerOrder.slice(idx), ...menschState.playerOrder.slice(0, idx)];
}

function startMenschGame() {
  const players = getMenschPlayers();
  if (!players.length) {
    showToast('Keine anwesenden Spieler vorhanden', 'error');
    return;
  }
  prepareSoloStarter('mensch', starterName => startMenschGameFinal(starterName));
}

function startMenschGameFinal(starterName) {
  ensureMenschState();
  menschState.playerOrder = rotateNameOrder(getSoloNames('mensch'),starterName);
  menschState.restoreCustomOrder = !!menschState.customOrder;
  menschState.customOrder=true;
  menschState.active = true;
  menschState.finished = false;
  menschState.currentIndex = 0;
  menschState.startedAt = new Date().toISOString();
  menschState.winner = '';
  menschState.ranking = [];
  menschState.scores = {};
  menschState.throws = {};
  getMenschPlayers().forEach(player => {
    menschState.scores[player.name] = 0;
    menschState.throws[player.name] = [];
  });
  renderMenschGame();
  persistState();
  showToast(`🎲 ${starterName} beginnt`, 'success');
}

function getLoserPenaltyKeyByRank(rank) {
  const target = `${rank}. verlierer`;
  const found = STRAFEN.find(item => String(item.label || '').trim().toLowerCase().startsWith(target));
  return found ? found.key : null;
}

async function applyMenschThrow(value) {
  ensureMenschState();
  const players=getMenschPlayers();
  if(!menschState.active||!players.length||menschState.busy)return;
  menschState.busy=true;
  try {
    const current=players[menschState.currentIndex];if(!current)return;
    const pins=Number(value); if(!Number.isInteger(pins)||pins<0||pins>12)return;
    const kind=pins===0?'gosse':pins===9?'9er':pins===12?'kranz':null;
    if(kind && !(await bookSoloSpecialThrow(current.name,pins,kind)))return;
    const oldScore=Number(menschState.scores[current.name])||0;
    let newScore=oldScore+pins;
    if(newScore>MENSCH_TARGET_SCORE)newScore=MENSCH_TARGET_SCORE-(newScore-MENSCH_TARGET_SCORE);
    menschState.scores[current.name]=newScore;
    if(!Array.isArray(menschState.throws[current.name]))menschState.throws[current.name]=[];
    menschState.throws[current.name].push({pins,at:new Date().toISOString()});
    // Exakt gleicher Punktestand: bereits dort stehende Spieler werden rausgeworfen.
    const bumped=[];
    if(newScore>0&&newScore!==MENSCH_TARGET_SCORE){
      for(const other of players){
        if(other.name!==current.name && Number(menschState.scores[other.name])===newScore){
          menschState.scores[other.name]=0;bumped.push(other.name);
        }
      }
    }
    if(newScore===MENSCH_TARGET_SCORE){finishMenschGame(current.name);return;}
    if(pins!==6)menschState.currentIndex=(menschState.currentIndex+1)%players.length;
    renderMenschGame();persistState();
    if(bumped.length)showToast(`💥 ${bumped.join(', ')} zurück auf 0!`,'success');
  }catch(error){console.error('Mensch-Wurf:',error);showToast('Wurf konnte nicht gebucht werden','error');}
  finally{menschState.busy=false;}
}

function finishMenschGame(winnerName) {
  const players = getMenschPlayers();
  menschState.active = false;
  menschState.customOrder = !!menschState.restoreCustomOrder;
  menschState.finished = true;
  menschState.winner = winnerName;
  const others = players.filter(p => p.name !== winnerName).map(p => ({ name: p.name, score: menschState.scores[p.name] || 0 }));
  others.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, 'de'));
  const groups = [];
  others.forEach(item => {
    const last = groups[groups.length - 1];
    if (!last || last.score !== item.score) {
      groups.push({ score: item.score, names: [item.name] });
    } else {
      last.names.push(item.name);
    }
  });
  const assigned = [];
  groups.forEach((group, index) => {
    const rank = index + 1;
    const key = getLoserPenaltyKeyByRank(rank);
    if (!key) return;
    group.names.forEach(name => {
      const person = persons.find(p => p.name === name);
      if (!person) return;
      if (!person.strafen) person.strafen = {};
      person.strafen[key] = (parseInt(person.strafen[key] || 0, 10) || 0) + 1;
      assigned.push({ name, rank, score: group.score });
    });
  });
  const entry = {
    id: 'mensch_' + Date.now(),
    type: 'mensch',
    createdAt: new Date().toISOString(),
    winner: winnerName,
    scores: JSON.parse(JSON.stringify(menschState.scores)),
    throws: JSON.parse(JSON.stringify(menschState.throws)),
    ranking: groups,
    assigned
  };
  menschState.history.unshift(entry);
  if (!Array.isArray(strafenHistory)) strafenHistory = [];
  strafenHistory.unshift(entry);
  renderMenschGame();
  persistState();
  showToast(`🏁 ${winnerName} gewinnt Mensch ärgere dich nicht`, 'success');
}

function resetMenschGame() {
  if (!confirm('Mensch ärgere dich nicht wirklich neu starten?')) return;
  menschState = createMenschState();
  renderMenschGame();
  persistState();
}

function renderMenschGame(){
  ensureMenschState();renderSoloOrderSettings('mensch');
  const setup=document.getElementById('mensch-start-card'),board=document.getElementById('mensch-board'),history=document.getElementById('mensch-history-list');
  if(!setup||!board||!history)return;
  setup.classList.toggle('hidden',!!menschState.active);
  const players=getMenschPlayers();
  if(!menschState.active){
    board.innerHTML=menschState.finished?`<div class="game-throw-toolbar">🏁 Sieger: <strong>${menschState.winner}</strong></div>`:'<div class="game-placeholder-card">Spieler sitzen nach der Sitzordnung. Einfach starten oder optional Startspieler auslosen.</div>';
  } else {
    const current=players[menschState.currentIndex];
    board.innerHTML=`<div class="game-throw-toolbar"><strong>🎳 ${current?.name||'—'} ist dran</strong><span>Ziel: genau 36</span>${[0,1,2,3,4,5,6,7,8,9,12].map(n=>`<button class="pinpad-btn" onclick="applyMenschThrow(${n})">${n===0?'G':n===12?'Kranz':n}</button>`).join('')}</div>
      <div class="game-compact-wrap"><table class="game-compact-table"><thead><tr><th>Spieler</th><th>Punkte</th><th>Fortschritt</th><th>Letzte Würfe</th></tr></thead><tbody>
      ${players.map((p,i)=>{const score=Number(menschState.scores[p.name])||0;const recent=(menschState.throws[p.name]||[]).slice(-5).map(t=>t.pins===0?'G':t.pins===12?'K':t.pins).join(' · ')||'—';return `<tr class="${i===menschState.currentIndex?'current':''}"><td>${p.name}</td><td class="game-compact-score">${score}</td><td style="min-width:170px"><div class="game-compact-progress"><span style="width:${score/36*100}%"></span></div></td><td>${recent}</td></tr>`;}).join('')}
      </tbody></table></div><div class="game-compact-note">Bei 6 nochmal werfen · gleiche Punktzahl wirft den vorherigen Spieler auf 0 · über 36 wird rückwärts gezählt.</div>`;
  }
  history.innerHTML=(menschState.history||[]).map(entry=>`<div class="spiel-card"><div class="spiel-info"><strong>🏁 ${entry.winner} gewinnt</strong><div class="spiel-detail">${(entry.ranking||[]).map((g,i)=>`${i+1}. Verlierer: ${g.names.join(', ')} (${g.score})`).join(' · ')}</div></div></div>`).join('')||'<div class="game-compact-note">Noch kein Verlauf.</div>';
}
