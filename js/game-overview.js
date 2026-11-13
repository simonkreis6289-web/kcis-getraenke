/* Gemeinsamer Spielkatalog und Sichtbarkeit der Dashboard-Mitte. */
(()=>{
 const catalog=[{key:'poker',icon:'🃏',title:'Poker',description:'Fünf Würfe · Tauschen · Pokerwertung und Stechen'},{key:'pfaelzer',icon:'🎯',title:'Pfälzerspiel',description:'Eigene Zahl · Strafstriche verteilen · wenigste Striche gewinnen'},{key:'tausend',icon:'🔢',title:'1000 in 9 Würfen',description:'Zahlen anordnen · Zielsumme möglichst genau erreichen'},{"key": "parteienspiel", "icon": "⚖️", "title": "Parteienspiel", "description": "Zwei Parteien · Rundendifferenz sammeln · feste Runden oder Vorsprung"}, {"key": "dreieuro", "icon": "💶", "title": "3-Euro-Spiel", "description": "Startbetrag herunterkegeln · Preise und Wurfzahl einstellbar"}, {"key": "ebbeflut", "icon": "🌊", "title": "Ebbe und Flut", "description": "3: Ebbe · 5: Normal · 7: Flut · die Wasserlage zählt mit"}, {"key": "hochsprung", "icon": "🏅", "title": "Hochsprung", "description": "Bis zu sieben Hürden · drei Versuche · fehlende Pins werden abgerechnet"},{key:"guterschnitt",icon:"✂️",title:"Der gute Schnitt",description:"Zahlenfolge treffen · steigende Wurfzahl bei Fehlversuchen"},
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
 const categories=[{key:'pairs',title:'Teamspiele (2er-Teams)',icon:'👥'},{key:'sides',title:'Mannschaftsspiele',icon:'⚔️'},{key:'solo',title:'Einzelspiele',icon:'🎯'}];
 const category=key=>['sechstage','gluecksspirale'].includes(key)?'pairs':['tannenbaum','darts','sichern','tor','ballermann','parteienspiel'].includes(key)?'sides':'solo';
 const gamesIn=kind=>catalog.filter(g=>category(g.key)===kind);
 let hubCategory='solo';
 function showCategory(key){if(!categories.some(c=>c.key===key))return;hubCategory=key;renderHub();}
 function renderHub(){
  const hub=document.querySelector('#tab-spiele-hub .game-hub-grid');if(!hub)return;
  let nav=document.getElementById('game-hub-categories');if(!nav){nav=document.createElement('nav');nav.id='game-hub-categories';nav.className='kc-admin-tabs game-category-tabs';nav.setAttribute('aria-label','Spielkategorien');hub.before(nav);}
  nav.replaceChildren();for(const cat of categories){const b=document.createElement('button');b.type='button';b.className='kc-admin-tab'+(cat.key===hubCategory?' active':'');b.setAttribute('aria-pressed',String(cat.key===hubCategory));b.textContent=cat.icon+' '+cat.title;b.onclick=()=>showCategory(cat.key);nav.append(b);}
  for(const cat of categories){let section=document.getElementById('game-hub-category-'+cat.key);if(!section){section=document.createElement('section');section.id='game-hub-category-'+cat.key;section.className='game-hub-category';const h=document.createElement('h3');h.textContent=cat.icon+' '+cat.title+(cat.key==='sides'?' · Seite gegen Seite':'');const grid=document.createElement('div');grid.className='game-hub-grid game-category-grid';section.append(h,grid);hub.append(section);}section.hidden=hubCategory!==cat.key;}
  for(const card of [...hub.querySelectorAll('.game-hub-card')]){const key=/showSideTab\('spiele','([^']+)'/.exec(card.getAttribute('onclick')||'')?.[1];if(!key||key==='spiele-einstellungen')continue;card.dataset.gameCategory=category(key);document.querySelector('#game-hub-category-'+category(key)+' .game-category-grid').append(card);if(key==='sichern'){const desc=card.querySelector('.desc');if(desc)desc.textContent='Seite gegen Seite oder als Einzelspiel · Punkte sichern bis zum Ziel.';}}
 }
 function renderSelector(){
  if(typeof document==='undefined')return;const select=document.getElementById('game-select');if(!select)return;const selected=select.value||'auto';select.replaceChildren();const auto=document.createElement('option');auto.value='auto';auto.textContent='Automatisch';select.append(auto);for(const cat of categories){const group=document.createElement('optgroup');group.label=cat.title;for(const game of gamesIn(cat.key)){const option=document.createElement('option');option.value=game.key;option.textContent=game.icon+' '+game.title;group.append(option);}select.append(group);}select.value=selected;
 }
 renderSelector();
 function context(state={}){
  const active=catalog.flatMap(g=>{const s=state[g.key+'State'];if(!s||s.finished||s.eveningStartedAt&&state.currentEveningStartedAt&&s.eveningStartedAt!==state.currentEveningStartedAt)return [];return s.active||g.key==='tannenbaum'&&s.history?.length?[g.key+':'+(s.id||s.startedAt||'laufend')]:[];});
  return {running:active.length>0,gameStamp:String(state.currentEveningStartedAt||'')+'|'+active.sort().join('|')};
 }
 // Der manuelle Schalter hat Vorrang vor jedem Spielstand, auch bei getrennten Live-Spielkanälen.
 function requested(state={}){return !!(state.dashboardGameOverview?.revision&&state.dashboardGameOverview.open);}
 function visible(state={}){const view=state.dashboardGameOverview;return view?.revision?!!view.open:!context(state).running;}
 function markup(state={}){const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<section class="tv-game-overview" aria-label="Spielübersicht">'+categories.map(cat=>{const list=gamesIn(cat.key),rows=Math.ceil(list.length/5);return '<section class="tv-game-category" data-overview-category="'+cat.key+'" style="--category-rows:'+rows+'"><h3>'+cat.icon+' '+esc(cat.title)+(cat.key==='sides'?' · Seite gegen Seite':'')+'</h3><div class="tv-category-grid">'+list.map(g=>{const description=g.key==='sichern'?'Seite gegen Seite oder als Einzelspiel':g.key==='gluecksspirale'?'Zweierteams · Ziel '+(Number(state.gluecksspiraleSettings?.target)||50):g.description;return '<article class="tv-game-choice" data-overview-game="'+g.key+'"><span class="tv-game-icon" aria-hidden="true">'+g.icon+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(description)+'</p></article>';}).join('')+'</div></section>';}).join('')+'</section>';}
 window.KCGameOverview=Object.freeze({catalog,categories,category,gamesIn,showCategory,renderHub,context,requested,visible,markup});
})();
