/* Kassenhistorie V103 – zeigt archivierte Strafenabschlüsse an und erlaubt gezieltes Löschen. */
let cashHistoryEntries = [];
let cashExpenseEntries = [];
let cashHistoryBusy = false;
let cashHistoryClub = '';
let cashHistoryUnsubscribe = null, cashHistorySubscriptionClub = '', cashHistoryGeneration = 0;
function stopCashHistorySync() {
  cashHistoryGeneration++;
  cashHistoryUnsubscribe?.();cashHistoryUnsubscribe=null;cashHistorySubscriptionClub='';
  cashHistoryEntries=[];cashExpenseEntries=[];cashHistoryClub='';
  cashHistoryBusy=false;
}

function escapeCashText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function cashHistoryDate(entry) {
  return KCCashBook.date(entry);
}

async function refreshCashHistory() {
  const status = document.getElementById('cash-history-status');
  const container = document.getElementById('cash-history-list');
  if (!status || !container) return;
  if (!ACTIVE_CLUB) { status.textContent = 'Bitte erst einen Club auswählen.'; container.innerHTML = ''; return; }
  if (!window.firestoreApi?.listCashBookEntries) { status.textContent = 'Kassenzugriff noch nicht verfügbar. Bitte die App aktualisieren.'; return; }
  if (cashHistoryBusy) return;
  if(cashHistoryClub && cashHistoryClub!==getClubFirestoreId(ACTIVE_CLUB))stopCashHistorySync();
  const generation=++cashHistoryGeneration;
  cashHistoryBusy = true;
  status.textContent = 'Archiv wird geladen …';
  try {
    const clubId = getClubFirestoreId(ACTIVE_CLUB);
    const entries = await window.firestoreApi.listCashBookEntries(clubId);
    if (getClubFirestoreId(ACTIVE_CLUB) !== clubId || generation!==cashHistoryGeneration) return;
    cashHistoryEntries = entries.filter(entry=>entry.category==='strafen');
    cashExpenseEntries = entries.filter(entry=>entry.category==='expense');
    cashHistoryClub = clubId;
    status.textContent = '';
    renderCashHistory();
    if(cashHistorySubscriptionClub!==clubId && window.firestoreApi.subscribeCashBookEntries){
      cashHistoryUnsubscribe?.();cashHistorySubscriptionClub=clubId;
      cashHistoryUnsubscribe=window.firestoreApi.subscribeCashBookEntries(clubId,entries=>{
        if(cashHistorySubscriptionClub!==clubId||getClubFirestoreId(ACTIVE_CLUB)!==clubId)return;
        cashHistoryEntries=entries.filter(entry=>entry.category==='strafen');cashExpenseEntries=entries.filter(entry=>entry.category==='expense');cashHistoryClub=clubId;renderCashHistory();
      },error=>{console.error('Kassenarchiv-Live-Sync',error);if(cashHistorySubscriptionClub===clubId){cashHistorySubscriptionClub='';cashHistoryUnsubscribe=null;status.textContent='Archiv-Live-Verbindung unterbrochen. Bitte aktualisieren.';}});
    }
  } catch (error) {
    if(generation!==cashHistoryGeneration)return;
    console.error('Kassenhistorie konnte nicht geladen werden:', error);
    status.textContent = '❌ Kassenhistorie konnte nicht geladen werden. Verbindung oder Firestore-Berechtigungen prüfen.';
    if(typeof renderPenaltyStats==='function')renderPenaltyStats();
  } finally {
    if(generation===cashHistoryGeneration)cashHistoryBusy = false;
  }
}

function renderCashHistory() {
  if(typeof renderCashBook==='function')renderCashBook();
  if(typeof renderPenaltyStats==='function')renderPenaltyStats();
  const container = document.getElementById('cash-history-list');
  if (!container) return;
  const from = document.getElementById('cash-history-from')?.value || '';
  const to = document.getElementById('cash-history-to')?.value || '';
  const entries = cashHistoryEntries.filter(entry => {
    const date = cashHistoryDate(entry);
    return (!from || date >= from) && (!to || date <= to);
  });
  if (!entries.length) {
    container.innerHTML = '<p class="cash-help">Keine abgeschlossenen Strafenabrechnungen im ausgewählten Zeitraum vorhanden.</p>';
    return;
  }
  container.innerHTML = entries.map(entry => {
    const date = cashHistoryDate(entry) || 'Unbekanntes Datum';
    const members = Array.isArray(entry.members) ? entry.members : [];
    const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('.') : date;
    const total = KCCashBook.total(entry)/100;
    const archivedId = encodeURIComponent(entry.id || '').replace(/'/g,'%27');
    const memberRows = members.map(member => `<tr><td>${escapeCashText(member.name)}</td><td>${Number(member.penaltyTotal ?? (member.penaltyCents||0)/100).toFixed(2).replace('.', ',')} €</td><td>${Number(member.monthlyFee ?? (member.feeCents||0)/100).toFixed(2).replace('.', ',')} €</td><td>${Number(member.total ?? (member.chargedCents||0)/100).toFixed(2).replace('.', ',')} €</td></tr>`).join('');
    return `<div class="cash-entry">
      <div class="cash-entry-top">
        <div><strong>📅 ${escapeCashText(dateLabel)}</strong><div class="cash-help">${members.length} Mitglieder · Gesamt ${total.toFixed(2).replace('.', ',')} €</div></div>
        <div class="cash-entry-actions">${entry.manualDraft?`<button class="secondary-btn" type="button" onclick="openHistoricalEvening('backfill',decodeURIComponent('${archivedId}'))">✏️ Bearbeiten / PDF</button>`:''}<button class="cash-delete-btn" type="button" onclick="deleteCashHistoryEntry(decodeURIComponent('${archivedId}'))">🗑️ Löschen</button></div>
      </div>
      <details><summary>Einzelbeträge ansehen</summary><div class="cash-table-scroller"><table class="cash-table"><thead><tr><th>Mitglied</th><th>Strafen</th><th>Beitrag</th><th>Summe</th></tr></thead><tbody>${memberRows || '<tr><td colspan="4">Keine Mitglieder gespeichert</td></tr>'}</tbody></table></div><p class="cash-help">Die Beträge entsprechen dem damaligen Abschluss. Nicht enthalten sind spätere Einzahlungen und Getränkekassenbewegungen.</p></details>
    </div>`;
  }).join('');
}

async function deleteCashHistoryEntry(archiveId) {
  if (cashHistoryBusy || !archiveId || !ACTIVE_CLUB) return;
  const clubId = getClubFirestoreId(ACTIVE_CLUB);
  if (cashHistoryClub !== clubId) { await refreshCashHistory(); return; }
  const entry = cashHistoryEntries.find(item => item.id === archiveId);
  if (!entry) { showToast('Abschluss nicht gefunden. Bitte aktualisieren.', 'error'); return; }
  const dateLabel = cashHistoryDate(entry) || 'unbekannt';
  if (!confirm(`Den abgeschlossenen Kegelabend vom ${dateLabel} wirklich dauerhaft aus dem Archiv löschen?\n\nDie PDF auf deinem Gerät und die laufenden Strafzähler bleiben unverändert.`)) return;
  cashHistoryBusy = true;
  try {
    await window.firestoreApi.deleteArchivedStrafenEvent(clubId, archiveId);
    if(getClubFirestoreId(ACTIVE_CLUB)===clubId){cashHistoryEntries = cashHistoryEntries.filter(item => item.id !== archiveId);renderCashHistory();}
    showToast('🗑️ Archivierter Kegelabend gelöscht', 'success');
  } catch (error) {
    console.error('Fehler beim Löschen des Kegelabends:', error);
    showToast('❌ Kegelabend konnte nicht gelöscht werden: '+(error.code==='permission-denied'?'Keine Firestore-Löschberechtigung.':error.message||'Bitte erneut versuchen.'), 'error');
  } finally {
    cashHistoryBusy = false;
  }
}


