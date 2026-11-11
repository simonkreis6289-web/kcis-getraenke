/* Gemeinsamer Spielkatalog und Sichtbarkeit der Dashboard-Mitte. */
(()=>{
 const catalog=[
 {
  "key": "tannenbaum",
  "icon": "🌲",
  "title": "Tannenbaum",
  "description": "Teamspiel mit Strafboxen, Strikes und Live-Übersicht."
 },
 {
  "key": "darts",
  "icon": "🎯",
  "title": "Darts",
  "description": "Klassisches Countdown-Spiel für zwei Teams."
 },
 {
  "key": "lotterie",
  "icon": "🎰",
  "title": "Lotterie",
  "description": "Mit Startspieler-Auslosung, Sitzreihenfolge und Spaltenbeträgen."
 },
 {
  "key": "tiberius",
  "icon": "🏛️",
  "title": "Tiberius",
  "description": "Mit Startspieler-Auslosung, Sitzreihenfolge und Zielspalten."
 },
 {
  "key": "mensch",
  "icon": "🎲",
  "title": "Mensch ärgere dich nicht",
  "description": "Reihum bis genau 36 · Treffer setzen Mitspieler zurück."
 },
 {
  "key": "plusminus",
  "icon": "➕",
  "title": "+ − × ÷",
  "description": "5 Würfe pro Spieler, links-nach-rechts gerechnet, optional mit Gosse-Automatik."
 },
 {
  "key": "haushoch",
  "icon": "🔢",
  "title": "Hohe Hausnummer",
  "description": "Drei Würfe zur höchsten Hausnummer"
 },
 {
  "key": "haustief",
  "icon": "🔽",
  "title": "Tiefe Hausnummer",
  "description": "Drei Würfe zur niedrigsten Hausnummer"
 },
 {
  "key": "blackjack",
  "icon": "🃏",
  "title": "17 + 4 / Blackjack",
  "description": "Erst werfen bis Stopp, danach Karten aufdecken und Platzierungen abrechnen."
 },
 {
  "key": "gluecksspirale",
  "icon": "🌀",
  "title": "Glücksspirale",
  "description": "Zweierteams: Ab 13 Holz folgen zwei Zusatzwürfe. Ziel: 50 Holz."
 },
 {
  "key": "siebener",
  "icon": "🎲",
  "title": "7er-Spiel",
  "description": "Zwei Würfe, sieben Zielspalten und bis zu dreimal addieren."
 },
 {
  "key": "hindernis",
  "icon": "🏃",
  "title": "Hindernislauf",
  "description": "Punkte sammeln und Hindernisse meistern · Ende sofort beim Ziel."
 },
 {
  "key": "sechstage",
  "icon": "🏁",
  "title": "Sechs-Tage-Rennen",
  "description": "Zweierteams, sechs Tage und steigende Multiplikatoren."
 },
 {
  "key": "sichern",
  "icon": "🔒",
  "title": "Sichern",
  "description": "Punkte sammeln, sichern und bei Gosse oder 5 nichts riskieren!"
 },
 {
  "key": "tor",
  "icon": "⚽",
  "title": "Tor",
  "description": "Kegel abräumen, Tore erzielen, zwei Tore Vorsprung."
 },
 {
  "key": "fuchsjagd",
  "icon": "🦊",
  "title": "Fuchsjagd",
  "description": "Fuchs wählen, Jäger verfolgen, Vorsprung live mitrechnen."
 },
 {
  "key": "bergundtal",
  "icon": "🏔️",
  "title": "Berg und Tal",
  "description": "Zwei Würfe pro Durchgang · Differenzen und Gesamtsumme"
 },
 {
  "key": "ballermann",
  "icon": "🏖️",
  "title": "Ballermann 6",
  "description": "Gruppe gegen Gruppe · einstellbare Spielzeit"
 },
 {
  "key": "lattenzaun",
  "icon": "🪵",
  "title": "Lattenzaun",
  "description": "Latten sammeln · sofortiges Ende beim ersten vollen Zaun"
 }
];
 function context(state={}){
  const active=catalog.flatMap(g=>{const s=state[g.key+'State'];if(!s||s.finished||s.eveningStartedAt&&state.currentEveningStartedAt&&s.eveningStartedAt!==state.currentEveningStartedAt)return [];return s.active||g.key==='tannenbaum'&&s.history?.length?[g.key+':'+(s.id||s.startedAt||'laufend')]:[];});
  return {running:active.length>0,gameStamp:String(state.currentEveningStartedAt||'')+'|'+active.sort().join('|')};
 }
 function visible(state={}){const c=context(state),view=state.dashboardGameOverview;return view?.revision?!!view.open&&(!c.running||view.gameStamp===c.gameStamp):!c.running;}
 function markup(state={}){const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<section class="tv-game-overview" aria-label="Spielübersicht">'+catalog.map(g=>{const description=g.key==='gluecksspirale'?'Zweierteams: Ab 13 Holz folgen zwei Zusatzwürfe. Ziel: '+(Number(state.gluecksspiraleSettings?.target)||50)+' Holz.':g.description;return '<article class="tv-game-choice" data-overview-game="'+g.key+'"><span class="tv-game-icon" aria-hidden="true">'+g.icon+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(description)+'</p></article>';}).join('')+'</section>';}
 window.KCGameOverview=Object.freeze({catalog,context,visible,markup});
})();
