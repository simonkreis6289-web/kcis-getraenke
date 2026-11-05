let memberProfileName = '', memberProfileClub = '', memberProfileBusy = false, memberProfileFocus = null;
function openMemberProfile(name) {
  if (memberProfileBusy) return;
  const person = persons.find(p => p.name === name && !p.isGuest && !p.isDrinksOnly);
  if (!person) return;
  memberProfileName = name; memberProfileClub = ACTIVE_CLUB; memberProfileFocus = document.activeElement;
  document.getElementById('member-profile-title').textContent = '👤 ' + name;
  const input = document.getElementById('member-profile-birthdate');
  input.max = KCBirthdays.today(); input.value = KCBirthdays.parse(person.birthDate) ? person.birthDate : '';
  document.getElementById('member-profile-modal').classList.remove('hidden');
  input.focus();
}
function closeMemberProfile() {
  if (memberProfileBusy) return;
  document.getElementById('member-profile-modal').classList.add('hidden');
  memberProfileName = ''; memberProfileClub = '';
  if (memberProfileFocus?.isConnected) memberProfileFocus.focus();
}
async function saveMemberProfile(event) {
  event?.preventDefault();
  if (memberProfileBusy || !memberProfileName) return;
  if (ACTIVE_CLUB !== memberProfileClub) {closeMemberProfile();showToast('Bitte das Mitglied im aktuellen Club erneut öffnen.','error');return;}
  const person = persons.find(p => p.name === memberProfileName && !p.isGuest && !p.isDrinksOnly);
  if (!person) {closeMemberProfile();return;}
  const value = document.getElementById('member-profile-birthdate').value;
  if (value && (!KCBirthdays.parse(value) || value > KCBirthdays.today())) {showToast('Bitte ein gültiges Geburtsdatum eingeben.','error');return;}
  if (!navigator.onLine || !window.firestoreApi) {showToast('Für persönliche Daten bitte eine Verbindung herstellen.','error');return;}
  const previousDate=person.birthDate, previousEvents=clubTermine, previousChange=lastLocalChangeAt;
  let saved=false;
  memberProfileBusy = true;
  const controls = [...document.querySelectorAll('#member-profile-modal button, #member-profile-modal input')];
  controls.forEach(el => el.disabled = true);
  try {
    person.birthDate = value;
    // Keep legacy records, but let the member profile own this person's birthday.
    if (value) clubTermine = clubTermine.map(entry => entry.type === 'geburtstag' && KCBirthdays.nameKey(entry.note) === KCBirthdays.nameKey(person.name)
      ? {...entry, memberBirthdayName:person.name} : entry);
    lastLocalChangeAt=Date.now();
    if (!(await saveToFirestore(false))) throw new Error('Persönliche Daten konnten nicht synchronisiert werden');
    saved=true;persistState();
    renderMemberManagement(); kcRenderTermine();
    showToast('Persönliche Daten gespeichert','success');
  } catch(error) {
    if(ACTIVE_CLUB===memberProfileClub){
      const current=persons.find(p=>p.name===memberProfileName);
      if(current){if(previousDate===undefined)delete current.birthDate;else current.birthDate=previousDate;}
      clubTermine=previousEvents;lastLocalChangeAt=previousChange;
      if(typeof saveClubSystem==='function')saveClubSystem();
      renderMemberManagement();kcRenderTermine();
    }
    console.error(error);showToast('Persönliche Daten konnten nicht gespeichert werden. Bitte erneut versuchen.','error');
  } finally {
    controls.forEach(el => el.disabled = false);
    memberProfileBusy = false;if(saved)closeMemberProfile();
  }
}
document.addEventListener('keydown', event => {
  const modal = document.getElementById('member-profile-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  if (event.key === 'Escape') {event.preventDefault();closeMemberProfile();}
  if (event.key === 'Tab') {
    const items = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  }
});
