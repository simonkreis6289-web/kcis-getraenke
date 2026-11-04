let soloStartDrawState = {
  open: false,
  players: [],
  title: 'Startspieler',
  subtitle: 'Wer beginnt?',
  selected: '',
  onConfirm: null
};

let soloStartDrawRunning = false;

function openSoloStartDraw(config = {}) {
  const players = Array.isArray(config.players) ? config.players.filter(Boolean) : [];
  if (!players.length) {
    showToast('Keine Spieler für die Auslosung vorhanden', 'error');
    return;
  }

  soloStartDrawState = {
    open: true,
    players,
    title: config.title || '🎲 Startspieler',
    subtitle: config.subtitle || 'Wer beginnt?',
    selected: '',
    onConfirm: typeof config.onConfirm === 'function' ? config.onConfirm : null
  };

  soloStartDrawRunning = false;
  document.getElementById('solo-start-draw-title').textContent = soloStartDrawState.title;
  document.getElementById('solo-start-draw-sub').textContent = soloStartDrawState.subtitle;
  document.getElementById('solo-start-draw-spin').textContent = players[0] || '—';
  document.getElementById('solo-start-draw-result').textContent = '';
  document.getElementById('solo-start-draw-run-btn')?.classList.remove('hidden');
  document.getElementById('solo-start-draw-confirm-btn')?.classList.add('hidden');
  document.getElementById('solo-start-draw-modal')?.classList.remove('hidden');
}

function closeSoloStartDraw() {
  if (soloStartDrawRunning) return;
  document.getElementById('solo-start-draw-modal')?.classList.add('hidden');
  soloStartDrawState.open = false;
}

function runSoloStartDraw() {
  if (soloStartDrawRunning || !soloStartDrawState.open) return;
  const spinEl = document.getElementById('solo-start-draw-spin');
  const resultEl = document.getElementById('solo-start-draw-result');
  const confirmBtn = document.getElementById('solo-start-draw-confirm-btn');
  const runBtn = document.getElementById('solo-start-draw-run-btn');
  soloStartDrawRunning = true;
  if (resultEl) resultEl.textContent = 'Auslosung läuft …';
  if (confirmBtn) confirmBtn.classList.add('hidden');
  if (runBtn) runBtn.classList.add('hidden');
  let ticks = 0;
  const frames = soloStartDrawState.players;
  const timer = setInterval(() => {
    ticks++;
    if (spinEl) spinEl.textContent = frames[ticks % frames.length];
    if (ticks >= 18) {
      clearInterval(timer);
      const winner = frames[Math.floor(Math.random() * frames.length)];
      soloStartDrawState.selected = winner;
      if (spinEl) spinEl.textContent = winner;
      if (resultEl) resultEl.textContent = `🎉 ${winner} beginnt.`;
      if (confirmBtn) confirmBtn.classList.remove('hidden');
      soloStartDrawRunning = false;
    }
  }, 110);
}

function confirmSoloStartDraw() {
  if (!soloStartDrawState.selected) return;
  const callback = soloStartDrawState.onConfirm;
  const starter = soloStartDrawState.selected;
  closeSoloStartDraw();
  if (typeof announceDashboardStarter === 'function') announceDashboardStarter('🎲 ' + starter + ' beginnt!');
  if (typeof callback === 'function') {
    callback(starter);
  }
}
