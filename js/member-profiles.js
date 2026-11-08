const MEMBER_ROLES = Object.freeze([
  {key:'administrator', label:'👑 Kegel-Kaiser', purpose:'Administrator'},
  {key:'cashier', label:'💰 Moneten-Magier', purpose:'Kassierer'},
  {key:'penalties', label:'🤠 Strafen-Sheriff', purpose:'Strafen aufschreiben'},
  {key:'drinks', label:'🍻 Zapfhahn-Zar', purpose:'Getränke aufschreiben'},
  {key:'member', label:'🎳 Bahnheld', purpose:'Normales Mitglied'}
]);
function getMemberRole(person) {
  return MEMBER_ROLES.find(role => role.key === person?.memberRole) || MEMBER_ROLES[4];
}
let memberProfileName = '', memberProfileClub = '', memberProfileBusy = false, memberProfileFocus = null;
function openMemberProfile(name) {
  if (memberProfileBusy) return;
  const person = persons.find(p => p.name === name && !p.isGuest && !p.isDrinksOnly);
  if (!person) return;
  memberProfileName = name; memberProfileClub = ACTIVE_CLUB; memberProfileFocus = document.activeElement;
  document.getElementById('member-profile-title').textContent = '👤 ' + name;
  const input = document.getElementById('member-profile-birthdate');
  input.max = KCBirthdays.today(); input.value = KCBirthdays.parse(person.birthDate) ? person.birthDate : '';
  const since = document.getElementById('member-profile-since');
  since.max = KCBirthdays.today(); since.value = KCBirthdays.parse(person.memberSince) ? person.memberSince : '';
  const role = document.getElementById('member-profile-role');
  role.innerHTML = MEMBER_ROLES.map(item => '<option value="'+item.key+'">'+item.label+' · '+item.purpose+'</option>').join('');
  role.value = getMemberRole(person).key;
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
  const since = document.getElementById('member-profile-since').value;
  if (since && (!KCBirthdays.parse(since) || since > KCBirthdays.today())) {showToast('Bitte ein gültiges Eintrittsdatum bis heute eingeben.','error');return;}
  const role = document.getElementById('member-profile-role').value;
  if (!MEMBER_ROLES.some(item => item.key === role)) {showToast('Bitte eine Rolle auswählen.','error');return;}
  if (!navigator.onLine || !window.firestoreApi) {showToast('Für persönliche Daten bitte eine Verbindung herstellen.','error');return;}
  const previousProfile={birthDate:person.birthDate, memberSince:person.memberSince, memberRole:person.memberRole}, previousEvents=clubTermine, previousChange=lastLocalChangeAt;
  let saved=false;
  memberProfileBusy = true;
  const controls = [...document.querySelectorAll('#member-profile-modal button, #member-profile-modal input, #member-profile-modal select')];
  controls.forEach(el => el.disabled = true);
  try {
    person.birthDate = value;
    person.memberSince = since;
    person.memberRole = role;
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
      if(current)for(const [key,previous] of Object.entries(previousProfile)){if(previous===undefined)delete current[key];else current[key]=previous;}
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
    const items = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  }
});
