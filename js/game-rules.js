/* Gemeinsame Regeltexte für App und Dashboard; der Server speichert nur die Anzeigeauswahl. */
(() => {
  const rules={
  "sechstage": {
    "title": "🏁 Sechs-Tage-Rennen",
    "body": "<ol>\n   <li><strong>Teams:</strong> Je zwei Kegler bilden eine Mannschaft. Bei ungerader Teilnehmerzahl bleibt ein Einzelteam übrig; niemand muss aussetzen. Mindestens zwei Teams spielen mit. Die Teams können ausgelost oder per Avatar-Auswahl zusammengestellt werden.</li>\n   <li><strong>Sechs Tage:</strong> Gespielt werden sechs Runden. Alle Teams kommen pro Tag einmal dran; die Teamreihenfolge bleibt gleich.</li>\n   <li><strong>Vier Würfe:</strong> Jeder Partner wirft zweimal. Ein Einzelteam übernimmt alle vier Würfe des Teams selbst. Die Reihenfolge innerhalb des Teams ist frei wählbar. Standardmäßig wechseln sich die Partner ab; über die Avatare lässt sich der nächste Werfer ändern.</li>\n   <li><strong>Abräumen:</strong> Jedes Team beginnt mit neun Kegeln. Es spielt vier Würfe gemeinsam auf das Bild. Sind alle Kegel gefallen, wird für verbleibende Würfe wieder voll aufgestellt. Das nächste Team beginnt ebenfalls mit neun Kegeln.</li>\n   <li><strong>Punkte:</strong> Jedes gefallene Holz zählt einmal. Die Tagesausbeute wird mit der Tagesnummer multipliziert. Beispiel: 18 Holz am dritten Tag ergeben 54 Punkte.</li>\n   <li><strong>Optionaler Tagessiegerbonus:</strong> Wenn vor dem Start aktiviert, erhalten die besten Teams eines Tages zwei zusätzliche Holz vor der Multiplikation. Bei Gleichstand bekommen alle Tagessieger den Bonus.</li>\n   <li><strong>Sieger:</strong> Nach sechs Tagen gewinnt die höchste Gesamtpunktzahl. Bei Gleichstand gibt es mehrere Siegerteams.</li>\n  </ol>\n  <div class=\"six-rule-days\"><span>Tag 1<strong>×1</strong></span><span>Tag 2<strong>×2</strong></span><span>Tag 3<strong>×3</strong></span><span>Tag 4<strong>×4</strong></span><span>Tag 5<strong>×5</strong></span><span>Tag 6<strong>×6</strong></span></div>\n  <p><strong>Unsere Strafregeln:</strong> Gosse, 9er und Kranz werden wie gewohnt gebucht. Ein Kranz zählt im Rennen <strong>acht Holz</strong> und lässt den König stehen. „Vorbei“ zählt null Holz ohne Gossenbuchung.</p>\n  <p>Nach Tag 6 bestätigt ihr <strong>„Rennen abschließen“</strong>. Dann erhalten die Kegler des schlechtesten Teams <strong>1. Verlierer +1</strong>, des zweitschlechtesten <strong>2. Verlierer +1</strong> und des drittschlechtesten <strong>3. Verlierer +1</strong>. Die Wertung erfolgt nach dem Teamstand, pro Kegler einmal; auch im Einzelteam nur einmal. Punktgleiche Teams teilen sich einen Rang. Geteilte Siegerteams erhalten keine Verliererstrafe.</p>\n  <p>Bis zum Abschluss lässt sich der letzte Wurf einschließlich seiner Strafbuchungen zurücknehmen. Ein neues Rennen löscht keine bereits gebuchten Strafen.</p>\n  <p class=\"six-rule-source\">Regelgrundlage: <a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/sechs-tage-rennen\" target=\"_blank\" rel=\"noopener noreferrer\">KC Mehr wie 9 geht nicht</a>. Die hier erklärten Bonus-, Gleichstands- und Strafregeln gelten für unsere App.</p>"
  },
  "gluecksspirale": {
    "title": "🌀 Glücksspirale",
    "body": "<ol>\n   <li><strong>Zweierteams:</strong> Je zwei Kegler bilden eine Mannschaft. Bei ungerader Teilnehmerzahl bleibt ein Einzelteam übrig; niemand muss aussetzen. Teams aus der Sitzreihenfolge bilden oder auslosen; danach können die Partner getauscht werden.</li>\n   <li><strong>In die Vollen:</strong> Jeder Wurf beginnt mit neun Kegeln. Pro Wurfpaar wirft zunächst der erste Partner, danach der zweite. Im Einzelteam übernimmt derselbe Kegler beide Würfe, auch bei Zusatzwürfen.</li>\n   <li><strong>Zusatzwürfe:</strong> Zusammen mindestens <strong>13 Holz</strong> im Wurfpaar geben diesem Team zwei weitere Würfe, wieder je einen pro Partner. Erreichen auch diese mindestens 13 Holz, geht es weiter. Bei weniger als 13 Holz kommt das nächste Team dran.</li>\n   <li><strong>Punkte:</strong> Alle gefallenen Holz werden zum Teamstand addiert. Gosse und „Vorbei“ zählen null. Ein Kranz zählt acht Holz.</li>\n   <li><strong>Ziel und letzte Runde:</strong> Vorgabe sind <strong>50 Holz</strong>; unter Spiele → Einstellungen ist der Zielwert pro Club für neue Spiele änderbar. Erreicht ein Team das Ziel, läuft seine Serie einschließlich möglicher Zusatzwürfe weiter. Anschließend beenden alle übrigen Teams ihre Serie dieser Runde. So waren alle Teams gleich oft dran.</li>\n   <li><strong>Sieger:</strong> Nach dieser Runde gewinnt der höchste Gesamtstand – auch wenn mehrere Teams über dem Ziel liegen. Beispiel: 64 Holz gewinnen vor 57 Holz. Bei Gleichstand gibt es gemeinsame Siegerteams.</li>\n  </ol>\n  <p><strong>Unsere Strafregeln:</strong> Gosse, 9er und Kranz werden wie gewohnt gebucht. Beim bestätigten Abschluss bekommen die Kegler des schlechtesten Teams <strong>1. Verlierer +1</strong>, des zweitschlechtesten <strong>2. Verlierer +1</strong> und des drittschlechtesten <strong>3. Verlierer +1</strong>. Die Wertung erfolgt nach dem Teamstand, jeder Kegler wird einmal belastet; auch im Einzelteam nur einmal. Siegerteams erhalten keine Verliererstrafe. Punktgleiche Teams teilen sich einen Rang.</p>\n  <p>Bis zum Abschluss kann die letzte Aktion mitsamt ihren Strafbuchungen zurückgenommen werden. Ein neues Spiel entfernt keine bereits gebuchten Strafen.</p>\n  <p><a href=\"https://xn--kegelclub-tddern-tzb.de/kegelspiele/gluecksspirale\" target=\"_blank\" rel=\"noopener noreferrer\">Regelgrundlage: KC Mehr wie 9 geht nicht</a></p>"
  }
};
  function content(key){return rules[key]?.body||'';}
  function fillApp(){for(const [key,prefix] of [['sechstage','sechs'],['gluecksspirale','spiral']]){const box=document.getElementById(prefix+'-rules-content');if(box)box.innerHTML=content(key);}}
  function renderDashboard(value){
    const overlay=document.getElementById('dashboard-rules-overlay');if(!overlay)return;
    const rule=Object.hasOwn(rules,value?.gameKey)?rules[value.gameKey]:null,visible=!!(value?.open&&rule);
    overlay.hidden=!visible;document.documentElement.classList.toggle('kc-rules-visible',visible);
    const main=document.querySelector('main.dashboard');if(main){main.toggleAttribute('inert',visible);if(visible)main.setAttribute('aria-hidden','true');else main.removeAttribute('aria-hidden');}
    if(!visible){overlay.dataset.token='';return;}
    const identity=value.gameKey+'|'+String(value.token||'');
    if(overlay.dataset.token!==identity){
      document.getElementById('dashboard-rules-title').textContent=rule.title+' – Spielregeln';
      document.getElementById('dashboard-rules-content').innerHTML=rule.body;
      const scroll=document.getElementById('dashboard-rules-scroll');if(scroll)scroll.scrollTop=0;
      overlay.dataset.token=identity;
    }
  }
  window.KCGameRules=Object.freeze({content,renderDashboard,fillApp});fillApp();
})();
let kcRulesSession=null;
const kcRulesUpdates=new Map();
function kcRulesId(){return crypto.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2);}
function kcRulesStatus(session,message){
  if(!session||session.clubName!==ACTIVE_CLUB)return;
  const prefix=session.gameKey==='sechstage'?'sechs':'spiral',box=document.getElementById(prefix+'-rules-sync-status');if(box)box.textContent=message;
}
function kcPublishGameRules(gameKey,open){
  if(!['sechstage','gluecksspirale'].includes(gameKey))return;
  let session=kcRulesSession;
  if(open){
    if(!ACTIVE_CLUB)return;
    if(session?.clubName===ACTIVE_CLUB&&session.gameKey===gameKey)return;
    if(session)kcClosePublishedRules();
    session={clubName:ACTIVE_CLUB,clubId:getClubFirestoreId(ACTIVE_CLUB),gameKey,token:'rules_session_'+kcRulesId()};kcRulesSession=session;
    const other=document.getElementById((gameKey==='sechstage'?'spiral':'sechs')+'-rules-modal');other?.classList.add('hidden');
  }else{
    if(!session||session.gameKey!==gameKey)return;kcRulesSession=null;
  }
  let update=kcRulesUpdates.get(session.clubId);if(!update){update={pending:null,running:false,timer:null};kcRulesUpdates.set(session.clubId,update);}
  update.pending={session,request:{action:open?'open':'close',gameKey,token:session.token,opId:'rules_'+kcRulesId()}};
  kcRulesStatus(session,open?'Dashboard wird aktualisiert …':'');void kcFlushGameRules(session.clubId);
}
function kcClosePublishedRules(){
  const session=kcRulesSession;if(!session)return;
  document.getElementById((session.gameKey==='sechstage'?'sechs':'spiral')+'-rules-modal')?.classList.add('hidden');
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
