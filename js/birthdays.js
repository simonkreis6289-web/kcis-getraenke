/* Shared annual birthdays for the app and dashboard. Stored dates stay unchanged. */
(() => {
  const pad = n => String(n).padStart(2, '0');
  const key = name => String(name || '').trim().toLocaleLowerCase('de-DE');
  function parse(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(0); date.setUTCFullYear(year, month - 1, day);
    if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return {year, month, day};
  }
  function today(now = new Date()) {
    const parts = new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
    const get = type => parts.find(p => p.type === type).value;
    return get('year') + '-' + get('month') + '-' + get('day');
  }
  function inYear(value, year) {
    const p = parse(value); if (!p) return '';
    // In non-leap years, a February 29 birthday is displayed on February 28.
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const day = p.month === 2 && p.day === 29 && !leap ? 28 : p.day;
    return String(year).padStart(4,'0') + '-' + pad(p.month) + '-' + pad(day);
  }
  function next(value, from = today()) {
    const year = parse(from)?.year; if (!year || !parse(value)) return '';
    const date = inYear(value, year);
    return date >= from ? date : inYear(value, year + 1);
  }
  function dates(value, from, through) {
    if (!through) return [next(value, from)].filter(Boolean);
    const first = parse(from), last = parse(through);
    if (!first || !last || through < from) return [];
    const out = [];
    for (let year = first.year; year <= last.year; year++) {
      const date = inYear(value, year);
      if (date && date >= from && date <= through) out.push(date);
    }
    return out;
  }
  function events(members = [], entries = [], from = today(), through = '') {
    const people = members.filter(p => !p.isGuest && !p.isDrinksOnly && parse(p.birthDate) && p.birthDate <= from);
    const names = new Set(people.map(p => key(p.name)));
    const birthdays = people.flatMap((person, index) => dates(person.birthDate, from, through).map(date => ({
      id:'member-birthday-' + index + '-' + date, type:'geburtstag', date, time:'',
      note:person.name, personName:person.name, recurring:true, memberBirthday:true
    })));
    for (const entry of entries) {
      if (entry.type !== 'geburtstag') continue;
      if (entry.memberBirthdayName || names.has(key(entry.note))) continue;
      for (const date of dates(entry.date, from, through)) birthdays.push({...entry, date, time:'', recurring:true});
    }
    return birthdays.sort((a,b) => a.date.localeCompare(b.date) || String(a.note||'').localeCompare(String(b.note||''),'de'));
  }
  window.KCBirthdays = Object.freeze({parse, today, next, events, nameKey:key});
})();
