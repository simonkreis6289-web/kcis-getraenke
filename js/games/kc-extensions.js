/* KC Erweiterungen V103, ergänzende Spiel- und Kassenlogik. */
function kcClubKey() {
  return String(typeof ACTIVE_CLUB === 'string' ? ACTIVE_CLUB : (ACTIVE_CLUB?.id || ACTIVE_CLUB?.name || 'default'));
}
function kcOrderKey(game) { return 'kc_sitzordnung_v103_' + kcClubKey() + '_' + game; }
function getKCSoloPlayers(game) {
  const available = getActivePlayersForSoloGame().filter(p => !p.drinksOnly);
  let selected = [];
  try { selected = JSON.parse(localStorage.getItem(kcOrderKey(game)) || '[]'); } catch (_) {}
  const positions = new Map(selected.map((name, i) => [name, i]));
  return available.sort((a, b) => (positions.get(a.name) ?? 9999) - (positions.get(b.name) ?? 9999));
}
function renderKCSoloOrder(game) {
  const panel = document.getElementById(game + '-order-panel');
  if (!panel) return;
  const players = getKCSoloPlayers(game);
  const active = game === 'lotterie' ? !!lotterieState?.active : !!tiberiusState?.active;
  panel.innerHTML = '<h3>🪑 Sitz- und Spielreihenfolge</h3>' +
    '<p style="color:var(--muted)">Oben beginnt. Mit den Pfeilen die Reihenfolge an eure Sitzplätze anpassen.</p>' +
    (players.length ? players.map((person, i) => `<div class="kc-order-row"><strong>${i+1}.</strong><span>${kcEscape(person.name)}</span><button ${active || !i ? 'disabled' : ''} onclick="moveKCSoloPlayer('${game}',${i},-1)">↑</button><button ${active || i===players.length-1 ? 'disabled' : ''} onclick="moveKCSoloPlayer('${game}',${i},1)">↓</button></div>`).join('') : '<p>Keine aktiven Kegler.</p>') +
    (active ? '<small>Reihenfolge während des laufenden Spiels gesperrt.</small>' : '');
}
function kcEscape(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function moveKCSoloPlayer(game, index, direction) {
  const active = game === 'lotterie' ? lotterieState?.active : tiberiusState?.active;
  if (active) return;
  const order = getKCSoloPlayers(game).map(p => p.name);
  const target = index + direction;
  if (target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  localStorage.setItem(kcOrderKey(game), JSON.stringify(order));
  renderKCSoloOrder(game);
}
let kcDrawRunning = false;
async function drawSoloStarter(game) {
  if (kcDrawRunning) return;
  const players = getKCSoloPlayers(game);
  if (!players.length) { showToast('Keine aktiven Kegler zur Auslosung','error'); return; }
  kcDrawRunning = true;
  const modal = document.getElementById('kc-starter-modal');
  const display = document.getElementById('kc-starter-name');
  const info = document.getElementById('kc-starter-info');
  const randomBytes = new Uint32Array(1);
  if (crypto?.getRandomValues) crypto.getRandomValues(randomBytes);
  else randomBytes[0] = Math.floor(Math.random()*0xffffffff);
  const winner = players[randomBytes[0] % players.length];
  modal?.classList.remove('hidden');
  if (info) info.textContent = '🎲 Startspieler wird ausgelost …';
  const sequence = players.map(p => p.name);
  let tick = 0;
  const timer = setInterval(() => { if (display) display.textContent = sequence[tick++ % sequence.length]; }, 85);
  await new Promise(resolve => setTimeout(resolve, 1850));
  clearInterval(timer);
  if (display) display.textContent = '🏆 ' + winner.name;
  if (info) info.textContent = winner.name + ' beginnt!';
  const order = players.map(p => p.name);
  const pos = order.indexOf(winner.name);
  localStorage.setItem(kcOrderKey(game), JSON.stringify([...order.slice(pos),...order.slice(0,pos)]));
  await new Promise(resolve => setTimeout(resolve, 1100));
  modal?.classList.add('hidden');
  try {
    if (game === 'lotterie') await startLotterieGame();
    else startTiberiusGame();
    renderKCSoloOrder(game);
  } finally { kcDrawRunning = false; }
}
// Buchungen als Snapshot speichern; Beträge in Cent, damit Rundungen konsistent sind.
const kcCents = v => Math.round((Number(v) || 0)*100);
function recordKCCashClosure(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.members)) return;
  const date = snapshot.date || new Date().toISOString();
  const id = 'cash_' + date + '_' + Math.random().toString(36).slice(2,7);
  kcCashClosures.push({ id, date, kind:'regular', members:snapshot.members.map(p => ({name:p.name, penaltyCents:kcCents(p.penaltyTotal), feeCents:kcCents(p.monthlyFee), chargedCents:kcCents(p.total)})) });
  persistState();
  renderKCCashHistory();
}
function renderKCCashHistory() {
  const el = document.getElementById('kc-cash-history'); if (!el) return;
  const from = document.getElementById('kc-cash-from')?.value || '';
  const to = document.getElementById('kc-cash-to')?.value || '';
  const history = [...(kcCashClosures || [])].sort((a,b)=>a.date.localeCompare(b.date));
  const balance = {};
  const rows = history.map(entry => {
    const members = (entry.members || []).map(m => {
      const cents = Number(m.chargedCents || 0);
      balance[m.name] = (balance[m.name] || 0) - cents;
      return {...m, balanceCents:balance[m.name]};
    });
    return {...entry, members};
  }).filter(e => (!from || e.date.slice(0,10)>=from) && (!to || e.date.slice(0,10)<=to)).reverse();
  el.innerHTML = rows.length ? rows.map(e => `<details class="kc-cash-entry"><summary><strong>${e.kind==='cancelled'?'🚫 Ausgefallen':'🚨 Strafenabschluss'}</strong> · ${kcEscape(e.date.slice(0,10))} · ${e.members.length} Mitglieder</summary><table><thead><tr><th>Mitglied</th><th>Strafen</th><th>Beitrag</th><th>Saldo aus Abschlüssen</th></tr></thead><tbody>${e.members.map(m=>`<tr><td>${kcEscape(m.name)}</td><td>${(m.penaltyCents/100).toFixed(2)} €</td><td>${(m.feeCents/100).toFixed(2)} €</td><td>${(m.balanceCents/100).toFixed(2)} €</td></tr>`).join('')}</tbody></table><small>Saldo enthält nur dokumentierte Strafabschlüsse ab Einführung dieser Historie, keine separaten Einzahlungen oder Getränke.</small></details>`).join('') : '<p style="color:var(--muted)">Keine Abschlüsse im gewählten Zeitraum gespeichert.</p>';
}
async function createCancelledKegelabend() {
  const date = document.getElementById('kc-cancel-date')?.value;
  if (!date) { showToast('Bitte Datum auswählen','error');return; }
  const members = persons.filter(p=>!p.isGuest&&!p.isDrinksOnly&&!p.inactive).map(p=>({name:p.name,penaltyCents:5000,feeCents:0,chargedCents:5000}));
  if (!members.length) {showToast('Keine Mitglieder vorhanden','error');return;}
  if (kcCashClosures.some(e=>e.kind==='cancelled' && e.date.slice(0,10)===date)) {showToast('Ausfalltermin bereits erfasst','error');return;}
  if (!confirm(`Kegeltermin ${date} als ausgefallen buchen? ${members.length} Mitglieder zahlen jeweils 50,00 €.`)) return;
  try {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    doc.setFontSize(18);doc.text('Strafenabrechnung: Kegeltermin ausgefallen',14,20);
    doc.setFontSize(11);doc.text('Termin: '+date,14,31);
    doc.setFontSize(11);doc.text('Strafentabelle (keine Einzelstrafen)',14,45);
    doc.rect(14,50,268,90);doc.line(14,60,282,60);
    doc.text('Mitglied',18,57);doc.text('Einzelstrafen',155,57);
    doc.setFont('helvetica','bold');doc.text('Der Kegeltermin ist ausgefallen. Jedes Clubmitglied zahlt 50,00 EUR.',14,162);
    doc.text(`Mitglieder: ${members.length} · Gesamtbetrag: ${(members.length*50).toFixed(2)} EUR`,14,173);
    doc.save(`KC_Ausfalltermin_${date}.pdf`);
    const entry = {id:'cancelled_'+date,date:date+'T12:00:00',kind:'cancelled',members};
    kcCashClosures.push(entry);persistState();renderKCCashHistory();
    if (window.firestoreApi && ACTIVE_CLUB) {
      await window.firestoreApi.archiveClubEvent(getClubFirestoreId(ACTIVE_CLUB),entry.id,{...entry,category:'strafen',status:'closed',club:ACTIVE_CLUB});
    }
    showToast('✅ Ausfalltermin und PDF erstellt','success');
  } catch(err) {console.error(err);showToast('PDF erstellt, aber Archivierung prüfen','error');}
}
