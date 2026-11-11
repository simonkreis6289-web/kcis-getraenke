/* Gemeinsame Regeltexte für App und Dashboard; der Server speichert nur die Anzeigeauswahl. */
(() => {
  const rules={
  "sechstage": {
    "title": "🏁 Sechs-Tage-Rennen",
    "body": "<ol>\n   <li><strong>Teams:</strong> Je zwei Kegler bilden eine Mannschaft. Bei ungerader Teilnehmerzahl bleibt ein Einzelteam übrig; niemand muss aussetzen. Mindestens zwei Teams spielen mit. Die Teams folgen zunächst der Sitzreihenfolge und können ausgelost werden. Mit „Reihenfolge ändern“ lässt sich die Zusammenstellung anpassen.</li>\n   <li><strong>Sechs Tage:</strong> Gespielt werden sechs Runden. Alle Teams kommen pro Tag einmal dran; die Teamreihenfolge bleibt gleich.</li>\n   <li><strong>Vier Würfe:</strong> Jeder Partner wirft zweimal. Ein Einzelteam übernimmt alle vier Würfe des Teams selbst. Die Reihenfolge innerhalb des Teams ist frei wählbar. Standardmäßig wechseln sich die Partner ab; über die Avatare lässt sich der nächste Werfer ändern.</li>\n   <li><strong>Abräumen:</strong> Jedes Team beginnt mit neun Kegeln. Es spielt vier Würfe gemeinsam auf das Bild. Sind alle Kegel gefallen, wird für verbleibende Würfe wieder voll aufgestellt. Das nächste Team beginnt ebenfalls mit neun Kegeln.</li>\n   <li><strong>Punkte:</strong> Jedes gefallene Holz zählt einmal. Die Tagesausbeute wird mit der Tagesnummer multipliziert. Beispiel: 18 Holz am dritten Tag ergeben 54 Punkte.</li>\n   <li><strong>Optionaler Tagessiegerbonus:</strong> Wenn vor dem Start aktiviert, erhalten die besten Teams eines Tages zwei zusätzliche Holz vor der Multiplikation. Bei Gleichstand bekommen alle Tagessieger den Bonus.</li>\n   <li><strong>Sieger:</strong> Nach sechs Tagen gewinnt die höchste Gesamtpunktzahl. Bei Gleichstand gibt es mehrere Siegerteams.</li>\n  </ol>\n  <div class=\"six-rule-days\"><span>Tag 1<strong>×1</strong></span><span>Tag 2<strong>×2</strong></span><span>Tag 3<strong>×3</strong></span><span>Tag 4<strong>×4</strong></span><span>Tag 5<strong>×5</strong></span><span>Tag 6<strong>×6</strong></span></div>\n  <p><strong>Unsere Strafregeln:</strong> Gosse, 9er und Kranz werden wie gewohnt gebucht. Ein Kranz zählt im Rennen <strong>acht Holz</strong> und lässt den König stehen. „Vorbei“ zählt null Holz ohne Gossenbuchung.</p>\n  <p>Nach Tag 6 bestätigt ihr <strong>„Rennen abschließen“</strong>. Dann erhalten die Kegler des schlechtesten Teams <strong>1. Verlierer +1</strong>, des zweitschlechtesten <strong>2. Verlierer +1</strong> und des drittschlechtesten <strong>3. Verlierer +1</strong>. Die Wertung erfolgt nach dem Teamstand, pro Kegler einmal; auch im Einzelteam nur einmal. Punktgleiche Teams teilen sich einen Rang. Geteilte Siegerteams erhalten keine Verliererstrafe.</p>\n  <p>Bis zum Abschluss lässt sich der letzte Wurf einschließlich seiner Strafbuchungen zurücknehmen. Ein neues Rennen löscht keine bereits gebuchten Strafen.</p>\n  <p class=\"six-rule-source\">Regelgrundlage: <a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/sechs-tage-rennen\" target=\"_blank\" rel=\"noopener noreferrer\">KC Mehr wie 9 geht nicht</a>. Die hier erklärten Bonus-, Gleichstands- und Strafregeln gelten für unsere App.</p>"
  },
  "gluecksspirale": {
    "title": "🌀 Glücksspirale",
    "body": "<ol>\n   <li><strong>Zweierteams:</strong> Je zwei Kegler bilden eine Mannschaft. Bei ungerader Teilnehmerzahl bleibt ein Einzelteam übrig; niemand muss aussetzen. Teams aus der Sitzreihenfolge bilden oder auslosen; über „Reihenfolge ändern“ lassen sich die Partner anpassen.</li>\n   <li><strong>In die Vollen:</strong> Jeder Wurf beginnt mit neun Kegeln. Pro Wurfpaar wirft zunächst der erste Partner, danach der zweite. Im Einzelteam übernimmt derselbe Kegler beide Würfe, auch bei Zusatzwürfen.</li>\n   <li><strong>Zusatzwürfe:</strong> Zusammen mindestens <strong>13 Holz</strong> im Wurfpaar geben diesem Team zwei weitere Würfe, wieder je einen pro Partner. Erreichen auch diese mindestens 13 Holz, geht es weiter. Bei weniger als 13 Holz kommt das nächste Team dran.</li>\n   <li><strong>Punkte:</strong> Alle gefallenen Holz werden zum Teamstand addiert. Gosse und „Vorbei“ zählen null. Ein Kranz zählt acht Holz.</li>\n   <li><strong>Ziel und letzte Runde:</strong> Vorgabe sind <strong>50 Holz</strong>; unter Spiele → Einstellungen ist der Zielwert pro Club für neue Spiele änderbar. Erreicht ein Team das Ziel, läuft seine Serie einschließlich möglicher Zusatzwürfe weiter. Anschließend beenden alle übrigen Teams ihre Serie dieser Runde. So waren alle Teams gleich oft dran.</li>\n   <li><strong>Sieger:</strong> Nach dieser Runde gewinnt der höchste Gesamtstand – auch wenn mehrere Teams über dem Ziel liegen. Beispiel: 64 Holz gewinnen vor 57 Holz. Bei Gleichstand gibt es gemeinsame Siegerteams.</li>\n  </ol>\n  <p><strong>Unsere Strafregeln:</strong> Gosse, 9er und Kranz werden wie gewohnt gebucht. Beim bestätigten Abschluss bekommen die Kegler des schlechtesten Teams <strong>1. Verlierer +1</strong>, des zweitschlechtesten <strong>2. Verlierer +1</strong> und des drittschlechtesten <strong>3. Verlierer +1</strong>. Die Wertung erfolgt nach dem Teamstand, jeder Kegler wird einmal belastet; auch im Einzelteam nur einmal. Siegerteams erhalten keine Verliererstrafe. Punktgleiche Teams teilen sich einen Rang.</p>\n  <p>Bis zum Abschluss kann die letzte Aktion mitsamt ihren Strafbuchungen zurückgenommen werden. Ein neues Spiel entfernt keine bereits gebuchten Strafen.</p>\n  <p><a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/gluecksspirale\" target=\"_blank\" rel=\"noopener noreferrer\">Regelgrundlage: KC Mehr wie 9 geht nicht</a></p>"
  },
  "siebener": {
    "title": "🎲 7er-Spiel",
    "body": "<ol><li>Neue Spiele umfassen sieben Züge mit jeweils zwei Würfen in die Vollen.</li><li>Normalerweise werden die beiden Wurfzahlen multipliziert. Pro Person darf stattdessen je nach Einstellung 1 bis 3 Mal die Summe verwendet werden. Die Anzeige zählt verbrauchte und übrige Nutzungen mit.</li><li>Danach wird das Ergebnis einer noch freien Spalte zugeordnet: 7, 14, 21, 28, 35, 42 oder 49. Jede Spalte wird einmal belegt.</li><li>Der absolute Abstand zum Spaltenziel wird mit dem eingestellten Preis pro Pin multipliziert (Standard: 10 Cent). Nach allen Zielspalten gewinnt die niedrigste Gesamtstrafe; gleiche Beträge teilen sich den Sieg.</li></ol><p>Der Kranz zählt je nach Einstellung 8, 12 oder einen eigenen festen Wert. Bei freier Kranzwahl wird pro Kranzwurf eine Zahl von 1 bis 12 gewählt. Gosse und Vorbei zählen null. Unsere üblichen Sonderwurfstrafen gelten zusätzlich. Die Spaltenbeträge werden beim Abschluss zusätzlich zur Strafobergrenze gebucht; bis dahin kann die letzte Aktion zurückgenommen werden.</p><p><a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/7er-spiel\" target=\"_blank\" rel=\"noopener noreferrer\">Regelgrundlage: KC Mehr wie 9 geht nicht</a></p>"
  },
  "hindernis": {
    "title": "🏃 Hindernislauf",
    "body": "<ol><li>Reihum wird einmal in die Vollen geworfen. Holz wird zum persönlichen Punktestand addiert. Kranz zählt bei uns zwölf, Gosse und Vorbei null.</li><li>Beim Erreichen eines eingeschalteten Hindernispunkts wird die in der Hindernistabelle angezeigte Aktion ausgeführt. Die Tabelle der laufenden Partie ist maßgeblich.</li><li>Versetzungen lösen keine weiteren Hindernisse aus. Punktabzüge enden bei null. „Nächsten Wurf abziehen“ wertet eine Gosse mit neun Minuspunkten.</li><li>Der Doppelwurf ist ein sofortiger Zusatzwurf mit doppelter Punktzahl. Bei „Neustart oder 1 €“ wählt der Spieler in der App die gewünschte Möglichkeit.</li><li>Erreicht oder überschreitet jemand die eingestellte Zielpunktzahl, endet das Spiel sofort mit diesem Wurf. Dieser Spieler gewinnt. Die anderen Spieler werfen in dieser Runde nicht mehr; die Endabrechnung wird automatisch gebucht.</li><li>Die übrigen Spieler zahlen Grundbetrag × fehlende Punkte ÷ Zielpunktzahl. Erst der gesamte Endbetrag wird auf den nächsten vollen Cent aufgerundet. Beispiel: 5 € Grundbetrag bei Ziel 100 ergibt 5 Cent pro fehlendem Punkt. Wer das Ziel erreicht oder gewinnt, zahlt keinen Endbetrag. Hinzu kommen Hindernisgebühren und die üblichen Sonderwurfstrafen.</li></ol><p>Unter Spiele → Einstellungen sind Ziel (Standard 90), Grundbetrag (Standard 1 €), aktive Hindernispunkte und die Zahlbeträge der Kassenhindernisse wählbar (Standard 20 Cent je Hindernis). Eine kürzere Strecke erhält weniger Hindernispunkte. Anzahl und Punktnummern der Hindernisse können bearbeitet werden. „Alles zufällig“ erstellt Anzahl, Punkte und Ereignisse neu; die automatische Anzahl orientiert sich an der Zielpunktzahl und beträgt höchstens 17. Die Kassenbeträge bleiben erhalten. Ereignisse können außerdem zwischen den Feldern verschoben werden. Die angezeigte Verteilung wird beim Start fest übernommen. Alle Spielbeträge werden zusätzlich zur Strafobergrenze gebucht.</p><p><a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/hindernislauf\" target=\"_blank\" rel=\"noopener noreferrer\">Regelgrundlage: KC Mehr wie 9 geht nicht</a>. Auswahl, Kurzstrecken-Verteilung und die Erläuterungen zu Kettenreaktionen sind Anpassungen unserer App.</p>"
  },
"bergundtal": {"title": "🏔️ Berg und Tal", "body": "<ol><li>Alle ausgewählten Kegler spielen in der festgelegten Sitzreihenfolge. Die Durchgangszahl ist einstellbar (Standard: vier).</li><li>Pro Durchgang wirft jeder zweimal in die Vollen. Der erste Wurf soll hoch, der zweite niedrig sein. Gewertet wird erster Wurf minus zweiter Wurf.</li><li>Auch negative Differenzen zählen vollständig mit. Gosse oder Vorbei in einem der beiden Würfe macht den Durchgang zu null Punkten.</li><li>Nach allen Durchgängen bestimmt die Summe der Durchgangsergebnisse die Platzierung: die höchste Gesamtsumme gewinnt. Gleiche Summen teilen sich die Platzierung.</li><li>Beim Abschluss werden die bis zu drei schlechtesten unterschiedlichen Ergebnisse außerhalb der Siegergruppe als 1., 2. und 3. Verlierer gebucht. Bei Gleichstand erhalten alle Betroffenen denselben Verliererrang.</li></ol><p>Kranzwertung: 8, 12 oder ein eigener fester Wert. Alternativ wird bei jedem Kranz eine Zahl von 1 bis 12 ausgewählt. Gosse und Vorbei zählen als Wurfwert null. Die üblichen Sonderwurfstrafen für Gosse, 9er und Kranz gelten zusätzlich und werden mit dem gebuchten Werfer erfasst. Einstellungen werden beim Spielstart übernommen.</p>"},
"ballermann": {"title": "🏖️ Ballermann 6", "body": "<ol><li>Gruppe 1 spielt gegen Gruppe 2 gemäß der Einteilung unter Gruppen. Die Mannschaften werden beim Start fest übernommen; es wird nicht neu gemischt.</li><li>Die Startmannschaft kann gewählt oder ausgelost werden. Jede Mannschaft hat ihre eigene einstellbare Spielzeit (Standard: sechs Minuten). Innerhalb der Mannschaft wird in der festgelegten Reihenfolge geworfen.</li><li>Die erste Mannschaft startet ihren Countdown und wirft in die Vollen. Nur 6, 7, 8, 9 und Kranz bringen Punkte. Niedrigere Zahlen, Gosse und Vorbei ergeben null Spielpunkte.</li><li>Kranz zählt mit dem eingestellten bzw. beim Wurf ausgewählten Wert. Nach Ablauf der Zeit sind weitere Würfe gesperrt. Danach startet die andere Mannschaft ihre volle eigene Spielzeit.</li><li>Beide Countdowns sind in der App und auf dem Dashboard sichtbar. Pausieren hält die verbleibende Zeit an; Fortsetzen setzt dort wieder ein.</li><li>Nach der zweiten Spielzeit gewinnt die Mannschaft mit der höchsten Gesamtsumme. Die Mitglieder der unterlegenen Mannschaft erhalten jeweils einmal 1. Verlierer. Bei Gleichstand endet das Spiel unentschieden ohne Verliererbuchung.</li></ol><p>Kranzwertung: 8, 12 oder ein eigener fester Wert. Alternativ wird bei jedem Kranz eine Zahl von 1 bis 12 ausgewählt. Gosse und Vorbei zählen als Wurfwert null. Die üblichen Sonderwurfstrafen für Gosse, 9er und Kranz gelten zusätzlich und werden mit dem gebuchten Werfer erfasst. Einstellungen werden beim Spielstart übernommen.</p>"},
"lattenzaun": {"title": "🪵 Lattenzaun", "body": "<ol><li>Alle ausgewählten Kegler werfen reihum einmal in die Vollen. Der erste Wurf legt die Vergleichszahl fest und verteilt noch keine Latten.</li><li>Ist der nächste Wurf höher, erhält der vorherige Werfer die Differenz als Latten. Ist er niedriger, erhält der aktuelle Werfer die Differenz. Bei gleicher Zahl kommen keine Latten hinzu. Verglichen wird immer mit dem unmittelbar vorangegangenen Wurf, auch beim Wechsel zum ersten Spieler.</li><li>Der volle Zaun ist einstellbar von 1 bis 50 Latten (Standard: 21). Sobald der erste Spieler diese Zahl erreicht oder überschreitet, endet das Spiel sofort. Sein Zaun wird bei der eingestellten Höchstzahl begrenzt; niemand wirft die Runde zu Ende.</li><li>Jeder zahlt seine zu diesem Zeitpunkt gesammelten Latten zum eingestellten Preis (0 bis 20 Cent je Latte). Auch der Spieler mit dem vollen Zaun zahlt. Die geringste Lattenzahl gewinnt; gleiche Zahlen teilen sich die Platzierung.</li><li>Die Lattenbeträge werden einmal pro Spiel und Person zusätzlich zur Strafobergrenze gebucht. Es gibt für die Platzierung keine weitere Verliererstrafe. Rückgängig des letzten Wurfs nimmt auch die dazugehörige Endabrechnung zurück.</li></ol><p>Kranzwertung: 8, 12 oder ein eigener fester Wert. Alternativ wird bei jedem Kranz eine Zahl von 1 bis 12 ausgewählt. Gosse und Vorbei zählen als Wurfwert null. Die üblichen Sonderwurfstrafen für Gosse, 9er und Kranz gelten zusätzlich und werden mit dem gebuchten Werfer erfasst. Einstellungen werden beim Spielstart übernommen.</p>"}
};
  function content(key,config){
    let body=rules[key]?.body||'';
    if(key==='siebener'&&window.KCIndividual){const c=window.KCIndividual.sevenSettings(config?.seven||config);body+='<p><strong>Für dieses Spiel:</strong> '+(c.pinCents/100).toFixed(2).replace('.',',')+' € je Pin Abstand · '+window.KCIndividual.sevenKranzLabel(c)+' · '+c.addLimit+'× Addieren pro Person. Einstellungen unter Spiele → Einstellungen → 7er-Spiel. Änderungen gelten für neue Spiele.</p>';}
    if(key==='hindernis'&&window.KCIndividual){
      const value=window.KCIndividual.settings(config);
      body+='<h3>Hindernisse · Ziel '+value.target+' · Grundbetrag '+(value.baseCents/100).toFixed(2).replace('.',',')+' €</h3><table class="rules-obstacle-table"><thead><tr><th>Punkte</th><th>Aktion</th></tr></thead><tbody>'+value.rules.map(r=>'<tr><th>'+r.from+(r.to!==r.from?'–'+r.to:'')+'</th><td>'+window.KCIndividual.ruleLabel(r)+(!r.enabled?' · deaktiviert':'')+'</td></tr>').join('')+'</tbody></table>';
    }
    if(window.KCExtraGames?.keys.includes(key)){const c=window.KCExtraGames.settings(key,config);body+='<p><strong>Für dieses Spiel:</strong> '+(key==='bergundtal'?c.rounds+' Durchgänge':key==='ballermann'?c.seconds+' Sekunden je Mannschaft':c.slats+' Latten · '+(c.slatCents/100).toFixed(2).replace('.',',')+' € je Latte')+' · Kranz: '+(c.kranzMode==='choose'?'bei jedem Wurf 1–12 wählen':c.kranzValue+' Holz')+'.</p>';}
    return body;
  }
  function fillApp(){for(const [key,prefix] of [['sechstage','sechs'],['gluecksspirale','spiral'],['siebener','siebener'],['hindernis','hindernis']]){const box=document.getElementById(prefix+'-rules-content');if(box)box.innerHTML=content(key);}}
  let fitFrame=0,fitObserver=null;
  function fitDashboard(){
    const overlay=document.getElementById('dashboard-rules-overlay'),box=document.getElementById('dashboard-rules-scroll'),text=document.getElementById('dashboard-rules-content');
    if(!overlay||overlay.hidden||!box||!text||!box.clientWidth||!box.clientHeight)return;
    if(!fitObserver&&typeof window.ResizeObserver==='function'){
      fitObserver=new window.ResizeObserver(scheduleFit);fitObserver.observe(box);
    }
    const max=Math.min(42,Math.max(22,box.clientWidth/50)),choices=[1,...(box.clientWidth>=680?[2]:[]),...(box.clientWidth>=1500?[3]:[])];
    const apply=(size,columns)=>{text.style.fontSize=size+'px';text.style.columnCount=String(columns);};
    const fits=()=>text.scrollWidth<=text.clientWidth&&text.scrollHeight<=text.clientHeight;
    let best={size:1,columns:1};
    for(const columns of choices){
      let low=1,high=max;apply(high,columns);
      if(fits())low=high;
      else for(let i=0;i<12;i++){const size=(low+high)/2;apply(size,columns);if(fits())low=size;else high=size;}
      if(low>best.size+.1)best={size:low,columns};
    }
    // Etwas Reserve für Rundung und das Zeichnen der letzten Textzeile lassen.
    apply(Math.max(1,Math.floor((best.size-.2)*100)/100),best.columns);
    box.scrollTop=0;box.scrollLeft=0;text.scrollTop=0;text.scrollLeft=0;
  }
  function scheduleFit(){
    if(fitFrame||typeof window.requestAnimationFrame!=='function')return;
    fitFrame=window.requestAnimationFrame(()=>{fitFrame=0;fitDashboard();});
  }
  window.addEventListener('resize',scheduleFit);
  window.visualViewport?.addEventListener('resize',scheduleFit);
  document.addEventListener('fullscreenchange',scheduleFit);
  document.fonts?.ready?.then(scheduleFit);
  document.fonts?.addEventListener('loadingdone',scheduleFit);
  function renderDashboard(value){
    const overlay=document.getElementById('dashboard-rules-overlay');if(!overlay)return;
    const rule=Object.hasOwn(rules,value?.gameKey)?rules[value.gameKey]:null,visible=!!(value?.open&&rule);
    overlay.hidden=!visible;document.documentElement.classList.toggle('kc-rules-visible',visible);
    const main=document.querySelector('main.dashboard');if(main){main.toggleAttribute('inert',visible);if(visible)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}
    if(!visible){overlay.dataset.token='';return;}
    const identity=value.gameKey+'|'+String(value.token||'');
    if(overlay.dataset.token!==identity){
      document.getElementById('dashboard-rules-title').textContent=rule.title+' – Spielregeln';
      document.getElementById('dashboard-rules-content').innerHTML=content(value.gameKey,value.rulesConfig);
      const scroll=document.getElementById('dashboard-rules-scroll');if(scroll)scroll.scrollTop=0;
      overlay.dataset.token=identity;
      fitDashboard();scheduleFit();
    }
  }
  window.KCGameRules=Object.freeze({content,renderDashboard,fillApp});fillApp();
})();
let kcRulesSession=null;
const kcRulesUpdates=new Map();
function kcRulesPrefix(key){return ({sechstage:'sechs',gluecksspirale:'spiral',siebener:'siebener',hindernis:'hindernis',bergundtal:'bergundtal',ballermann:'ballermann',lattenzaun:'lattenzaun'})[key];}
function kcRulesId(){return crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2);}
function kcRulesStatus(session,message){
  if(!session||session.clubName!==ACTIVE_CLUB)return;
  const prefix=kcRulesPrefix(session.gameKey),box=document.getElementById(prefix+'-rules-sync-status');if(box)box.textContent=message;
}
function kcPublishGameRules(gameKey,open){
  if(!['sechstage','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun'].includes(gameKey))return;
  let session=kcRulesSession;
  if(open){
    if(!ACTIVE_CLUB)return;
    if(session?.clubName===ACTIVE_CLUB&&session.gameKey===gameKey)return;
    if(session)kcClosePublishedRules();
    session={clubName:ACTIVE_CLUB,clubId:getClubFirestoreId(ACTIVE_CLUB),gameKey,token:'rules_session_'+kcRulesId()};kcRulesSession=session;
    for(const key of ['sechstage','gluecksspirale','siebener','hindernis','bergundtal','ballermann','lattenzaun'])if(key!==gameKey)document.getElementById(kcRulesPrefix(key)+'-rules-modal')?.classList.add('hidden');
  }else{
    if(!session||session.gameKey!==gameKey)return;kcRulesSession=null;
  }
  let update=kcRulesUpdates.get(session.clubId);if(!update){update={pending:null,running:false,timer:null};kcRulesUpdates.set(session.clubId,update);}
  const sevenConfig=gameKey==='siebener'&&window.KCIndividual?window.KCIndividual.sevenSettings(typeof siebenerState!=='undefined'&&siebenerState?.id?siebenerState.config?.seven:typeof siebenerSettings!=='undefined'?siebenerSettings:null):null;
  const extraConfig=window.KCExtraGames?.keys.includes(gameKey)?window.KCExtraGames.settings(gameKey,typeof indGet==='function'&&indGet(gameKey)?.id?indGet(gameKey).config:typeof extraGameSettings==='undefined'?null:extraGameSettings[gameKey]):null;
  const rulesConfig=extraConfig||sevenConfig||(gameKey==='hindernis'&&window.KCIndividual?window.KCIndividual.settings(typeof hindernisState!=='undefined'&&hindernisState?.id?hindernisState.config:typeof hindernisSettings!=='undefined'?hindernisSettings:null):null);
  update.pending={session,request:{action:open?'open':'close',gameKey,...(rulesConfig?{rulesConfig}:{}),token:session.token,opId:'rules_'+kcRulesId()}};
  kcRulesStatus(session,open?'Dashboard wird aktualisiert …':'');void kcFlushGameRules(session.clubId);
}
function kcClosePublishedRules(){
  const session=kcRulesSession;if(!session)return;
  document.getElementById(kcRulesPrefix(session.gameKey)+'-rules-modal')?.classList.add('hidden');
  kcPublishGameRules(session.gameKey,false);
}
async function kcFlushGameRules(clubId){
  const update=kcRulesUpdates.get(clubId);if(!update||update.running||!update.pending)return;
  if(!navigator.onLine||!window.firestoreApi?.setDashboardRules){kcRulesStatus(update.pending.session,'Regeln sind nur in der App sichtbar. Dashboard-Abgleich folgt bei Verbindung.');return;}
  clearTimeout(update.timer);update.timer=null;update.running=true;
  try{
    while(update.pending&&navigator.onLine){
      const pending=update.pending;
      try{
        await window.firestoreApi.setDashboardRules(clubId,pending.request);
        if(update.pending===pending){update.pending=null;if(kcRulesSession?.token===pending.session.token)kcRulesStatus(pending.session,'Auch auf dem Dashboard sichtbar.');}
      }catch(error){
        console.error('Spielregeln-Dashboard',error);
        if(update.pending!==pending)continue;
        kcRulesStatus(pending.session,'Dashboard-Abgleich fehlgeschlagen. Erneuter Versuch folgt automatisch.');
        update.timer=setTimeout(()=>{update.timer=null;void kcFlushGameRules(clubId);},3000);break;
      }
    }
  }finally{update.running=false;}
}
window.addEventListener('online',()=>{for(const clubId of kcRulesUpdates.keys())void kcFlushGameRules(clubId);});
