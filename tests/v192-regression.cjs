const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const now = Date.parse('2026-11-08T11:00:00Z');
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}

function profileFixture(person = {name:'Anna', present:true}) {
  const {document, window:dom} = parseHTML(read('getraenke-abrechnung.html'));
  // linkedom has no native select.value setter; model browser selection for this fixture.
  const select = document.getElementById('member-profile-role');
  Object.defineProperty(select, 'value', {value:'', writable:true});
  let cloud, local, writes = 0;
  const messages = [];
  const c = {document, window:{firestoreApi:{}}, Date:FixedDate, console:{error(){}},
    persons:[person], clubTermine:[], ACTIVE_CLUB:'club', navigator:{onLine:true}, lastLocalChangeAt:1,
    showToast:(...args) => messages.push(args), kcRenderTermine(){}, saveClubSystem(){},
    saveToFirestore:async() => {writes++; cloud=copy(c.persons); return true;},
    persistState:() => {local=copy(c.persons);}};
  vm.createContext(c);
  vm.runInContext(read('js/birthdays.js'), c); c.KCBirthdays=c.window.KCBirthdays;
  vm.runInContext(read('js/persons.js'), c);
  vm.runInContext(read('js/member-profiles.js'), c);
  return {c, document, dom, messages, get:id=>document.getElementById('member-profile-'+id),
    cloud:()=>cloud, local:()=>local, writes:()=>writes};
}

test('member profiles offer five named roles and default existing members to Bahnheld without changing them', () => {
  const f=profileFixture(); f.c.openMemberProfile('Anna');
  assert.equal(f.get('role').querySelectorAll('option').length,5);
  assert.equal(f.get('role').value,'member');
  assert(f.get('role').textContent.includes('Kegel-Kaiser'));
  assert(f.get('role').textContent.includes('Moneten-Magier'));
  assert(f.get('role').textContent.includes('Strafen-Sheriff'));
  assert(f.get('role').textContent.includes('Zapfhahn-Zar'));
  assert(f.get('role').textContent.includes('Bahnheld'));
  assert.equal(f.c.persons[0].memberRole,undefined);
  assert.equal(f.get('since').max,'2026-11-08'); assert.equal(f.writes(),0);
});

test('birthday, membership date and each role save together to cloud and local state and reopen', async() => {
  for(const role of ['administrator','cashier','penalties','drinks','member']) {
    const f=profileFixture(); f.c.openMemberProfile('Anna');
    f.get('birthdate').value='1989-02-03'; f.get('since').value='2012-04-06'; f.get('role').value=role;
    await f.c.saveMemberProfile();
    assert.equal(f.writes(),1); assert.deepEqual(f.cloud(),f.local());
    assert.equal(f.cloud()[0].memberRole,role); assert.equal(f.cloud()[0].memberSince,'2012-04-06');
    assert.equal(f.cloud()[0].birthDate,'1989-02-03'); assert.equal(f.cloud()[0].present,true);
    f.c.openMemberProfile('Anna'); assert.equal(f.get('role').value,role); assert.equal(f.get('since').value,'2012-04-06');
  }
});

test('clearing membership date preserves birthday and the assigned role; cards show date and role safely', async() => {
  const f=profileFixture({name:'Anna <img>',birthDate:'1989-02-03',memberSince:'2012-04-06',memberRole:'cashier'});
  f.c.renderMemberManagement(); const root=f.document.getElementById('member-management-list');
  assert(root.textContent.includes('Mitglied seit 06.04.2012')); assert(root.textContent.includes('Moneten-Magier'));
  assert(root.textContent.includes('Anna <img>')); assert.equal(root.querySelectorAll('img').length,0);
  f.c.openMemberProfile('Anna <img>'); f.get('since').value=''; await f.c.saveMemberProfile();
  assert.equal(f.cloud()[0].memberSince,''); assert.equal(f.cloud()[0].birthDate,'1989-02-03');
  assert.equal(f.cloud()[0].memberRole,'cashier'); assert(!root.textContent.includes('Mitglied seit'));
});

test('invalid/future membership dates and unknown roles cannot write profile data', async() => {
  for(const value of ['2026-02-30','2026-11-09','not-a-date']) {
    const f=profileFixture(); f.c.openMemberProfile('Anna'); f.get('since').value=value;
    await f.c.saveMemberProfile(); assert.equal(f.writes(),0); assert.equal(f.c.persons[0].memberSince,undefined);
  }
  const f=profileFixture(); f.c.openMemberProfile('Anna'); f.get('role').value='superadmin';
  await f.c.saveMemberProfile(); assert.equal(f.writes(),0);
});

test('failed saves roll back all profile fields and legacy birthday claims', async() => {
  for(const old of [{name:'Anna'}, {name:'Anna',birthDate:'1989-02-03',memberSince:'2012-04-06',memberRole:'cashier'}]) {
    const f=profileFixture({...old}); f.c.clubTermine=[{type:'geburtstag',date:'1989-02-03',note:'Anna'}];
    f.c.saveToFirestore=async()=>false; f.c.openMemberProfile('Anna');
    f.get('birthdate').value='1990-01-01'; f.get('since').value='2020-01-01'; f.get('role').value='administrator';
    await f.c.saveMemberProfile(); assert.deepEqual(copy(f.c.persons[0]),old);
    assert.equal(f.c.lastLocalChangeAt,1); assert.equal(f.c.clubTermine[0].memberBirthdayName,undefined);
    assert(!f.get('role').disabled); assert(!f.get('modal').classList.contains('hidden'));
  }
});

test('profile writes require a connection and the same club; guest profiles are excluded', async() => {
  const f=profileFixture(); f.c.openMemberProfile('Anna'); f.c.navigator.onLine=false;
  await f.c.saveMemberProfile(); assert.equal(f.writes(),0);
  f.c.navigator.onLine=true; f.c.ACTIVE_CLUB='other'; await f.c.saveMemberProfile(); assert.equal(f.writes(),0);
  for(const flags of [{isGuest:true},{isDrinksOnly:true}]) {
    const g=profileFixture({name:'Anna',...flags}); g.c.openMemberProfile('Anna');
    assert(g.get('modal').classList.contains('hidden'));
  }
});

test('role selection is disabled during a save, duplicate submissions are ignored, and dismissal is blocked', async() => {
  const f=profileFixture(); f.c.openMemberProfile('Anna'); let release, writes=0;
  f.c.saveToFirestore=async()=>{writes++; await new Promise(resolve=>release=resolve); return true;};
  const pending=f.c.saveMemberProfile(); assert(f.get('role').disabled); assert(f.get('since').disabled);
  await f.c.saveMemberProfile(); f.c.closeMemberProfile(); assert.equal(writes,1);
  assert(!f.get('modal').classList.contains('hidden')); release(); await pending;
  assert(!f.get('role').disabled); assert(f.get('modal').classList.contains('hidden'));
});

function dashboardFixture() {
  const html=read('dashboard.html'), {document}=parseHTML(html);
  const c={document,window:{addEventListener(){}},Date:FixedDate,console,localStorage:{getItem:()=>null},
    location:{search:''}, URLSearchParams,requestAnimationFrame(){},setInterval:()=>1,clearInterval(){},
    setTimeout:()=>1,clearTimeout(){},navigator:{onLine:true}};
  vm.createContext(c); vm.runInContext(read('js/birthdays.js'),c); c.KCBirthdays=c.window.KCBirthdays;
  const a=html.indexOf('<script type="module">')+22, b=html.indexOf('</script>',a);
  const script=html.slice(a,b).replace("import './js/firebase.js';",'').replace('void bootstrap();',
    'window.testAPI={renderDashboardSeating,dashboardSeatAvatar,renderNextClubEvents,connect,setState(value){state=value;},setSeating(value){seatingLive=value;}};');
  vm.runInContext(script,c);
  return {c,document,api:c.window.testAPI};
}

test('dashboard seats replace place numbers with uploaded images and preserve seating order, names and teams', () => {
  const f=dashboardFixture(),order=Array(16).fill('');order[0]='Anna';order[7]='Bernd';order[8]='Gast';
  const people=[{name:'Anna',avatarData:'data:image/png;base64,AA==',tisch:'T2'},{name:'Bernd'},{name:'Gast',isGuest:true}];
  f.api.setState({persons:people,seatingOrder:order});f.api.renderDashboardSeating(people);
  const cells=[...f.document.querySelectorAll('.tv-seat')];assert.equal(cells.length,3);
  assert.deepEqual(cells.map(cell=>cell.querySelector('.seat-name').textContent),['Bernd','Anna','Gast']);
  assert.equal(cells[1].querySelector('img').getAttribute('src'),'data:image/png;base64,AA==');
  assert.equal(cells[1].querySelector('.seat-avatar').getAttribute('aria-label'),'Bild von Anna');
  assert.equal(cells[1].getAttribute('aria-label'),'Platz 1 · Anna');assert(!cells[1].querySelector('small'));
  assert(cells.every(cell=>cell.querySelector('.seat-team-dot')));
});

test('member image fallback tries the normal avatar filenames, then initials; guests use initials without static images', () => {
  const f=dashboardFixture(),avatar=f.api.dashboardSeatAvatar({name:'Jörg Kreis'},'Jörg Kreis'),img=avatar.querySelector('img');
  for(const extension of ['jpg','jpeg','png','webp']) {
    assert.equal(img.getAttribute('src'),'bilder/jorg-kreis.'+extension);img.onerror();
  }
  assert(!avatar.querySelector('img'));assert.equal(avatar.textContent,'JK');
  const guest=f.api.dashboardSeatAvatar({isGuest:true},'Gast Kegler');assert(!guest.querySelector('img'));assert.equal(guest.textContent,'GK');
  const uploaded=f.api.dashboardSeatAvatar({isGuest:true,avatarData:'data:image/jpeg;base64,AA=='},'Gast Kegler');
  assert(uploaded.querySelector('img'));uploaded.querySelector('img').onerror();assert.equal(uploaded.textContent,'GK');
});

test('seat live updates use new images and escaped names, and missing people never borrow another member picture', () => {
  const f=dashboardFixture();f.api.setState({seatingOrder:['<img onerror=bad>'],persons:[]});
  f.api.renderDashboardSeating([]);assert.equal(f.document.querySelectorAll('.tv-seat img').length,0);
  assert(f.document.querySelector('.seat-name').textContent.includes('<img onerror=bad>'));
  f.api.setSeating({seatingOrder:['Anna']});f.api.renderDashboardSeating([{name:'Anna',avatarData:'javascript:bad'}]);
  assert.equal(f.document.querySelector('.tv-seat img').getAttribute('src'),'bilder/anna.jpg');
  f.api.renderDashboardSeating([{name:'Anna',avatarData:'data:image/webp;base64,AA=='}]);
  assert.equal(f.document.querySelector('.tv-seat img').getAttribute('src'),'data:image/webp;base64,AA==');
});

test('header birthdays remain visible when the next birthday is after the next club date', () => {
  const f=dashboardFixture();f.api.setState({persons:[{name:'Anna',birthDate:'1989-12-12',present:false}],
    clubTermine:[{type:'kegeln',date:'2026-11-13',time:'20:00'}]});f.api.renderNextClubEvents();
  const text=f.document.getElementById('kc-next-birthdays').textContent;
  assert(text.includes('Nächste Geburtstage:'));assert(text.includes('12.12. Anna'));
});

test('header shows birthdays today and annual rollover, limits long lists and explains missing dates', () => {
  const f=dashboardFixture();f.api.setState({persons:[{name:'Anna',birthDate:'1989-11-08'},{name:'B',birthDate:'1990-01-02'},
    {name:'C',birthDate:'1990-01-03'},{name:'D',birthDate:'1990-01-04'},{name:'Gast',birthDate:'1990-11-09',isGuest:true}]});
  f.api.renderNextClubEvents();let text=f.document.getElementById('kc-next-birthdays').textContent;
  assert(text.includes('Heute Anna'));assert(text.includes('02.01. B'));assert(text.includes('+1 weitere'));assert(!text.includes('Gast'));
  f.api.setState({persons:[]});f.api.renderNextClubEvents();
  assert(f.document.getElementById('kc-next-birthdays').textContent.includes('Noch keine Geburtsdaten hinterlegt'));
});

test('header retains the before-next-event birthday window and legacy calendar birthdays', () => {
  const f=dashboardFixture();f.api.setState({persons:[{name:'Anna',birthDate:'1989-11-10'},{name:'Bernd',birthDate:'1989-12-12'}],
    clubCalendarData:{clubTermine:[{type:'kegeln',date:'2026-11-13',time:'20:00'},{type:'geburtstag',date:'1989-11-11',note:'Celina'}]}});
  f.api.renderNextClubEvents();const text=f.document.getElementById('kc-next-birthdays').textContent;
  assert(text.includes('bis zum nächsten Termin'));assert(text.includes('Anna'));assert(text.includes('Celina'));assert(!text.includes('Bernd'));
});
