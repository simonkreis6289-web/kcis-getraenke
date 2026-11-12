# Synchronisation V216 (Protokoll 1)

## Verhalten

Firestore führt den bestätigten Stand. Ein Gerät lädt diesen zuerst vom Server;
ein lokaler Cache wird bei einem Ladefehler niemals als Ersatz hochgeladen.
Ohne bestätigten Serverstand bleibt die App im Lesemodus. Der Statusstreifen
zeigt „Live synchronisiert“, eine laufende Bestätigung oder den Lesemodus.

- Getränke und Strafzähler werden als einzelne Buchungen in Transaktionen verarbeitet.
- Unabhängige Personen-, Preis- und Einstellungsänderungen werden zusammengeführt.
- Widersprüchliche Änderungen am selben Feld oder älteren Spielstand werden abgewiesen und angezeigt. Der Benutzer prüft den aktuellen Stand und gibt erneut ein.
- Bei den älteren Spielen werden Spielzug, zugehörige Zähler und Ergebniseinträge zusammen bestätigt. Die vorhandenen neueren Spiel-Engines behalten ihre zusätzlichen Spielrevisionen.
- Jede Änderung besitzt eine eindeutige Kennung. Bei Verbindungsabbruch wird zuerst geprüft, ob genau diese Änderung bereits bestätigt wurde; eine Wiederholung erzeugt keine zweite Buchung.
- Ein neuer Kegelabend leert die Sitzordnung in App und Dashboard und öffnet dort die Spielübersicht. Dabei gilt eine neue Abendkennung. Eingaben zum alten Abend dürfen nicht in den neuen gelangen.
- App und Dashboard verwenden beim neuen Protokoll denselben Clubstand, einschließlich Spielständen, Gästen, Sitzordnung, Getränken und Strafen. Die bisherigen Live-Dokumente werden innerhalb derselben Transaktion mitgeführt.

Die erste Öffnung übernimmt bestehende Serverdaten und zugehörige Live-Daten in
einer Transaktion. Bei widersprüchlichen Alt-Spielständen wird der vorhandene
Server-Zeitstempel berücksichtigt. Geräteeigene Uhren bestimmen anschließend
keine Rangfolge mehr. Diese Migration löscht keine archivierten Abrechnungen.
Nicht auf den Server übertragene historische Gerätesicherungen werden nicht
automatisch importiert.

## Erforderlicher Firebase-Schritt vor der Freigabe

Der App-Umbau allein kann einen bereits geöffneten Browser mit altem JavaScript
nicht stoppen. Dafür müssen die Firestore-Sicherheitsregeln das neue
Transaktionsprotokoll verlangen. Erst mit diesen aktiven Regeln gilt die
Absicherung auch gegenüber alten App-Versionen.

Der Nutzer hat die bisherigen produktiven Regeln bereitgestellt: eine globale
Freigabe `allow read, write: if true`. `firestore.rules` ersetzt diese vollständig.
Die bisherigen öffentlichen Leserechte bleiben erhalten; Schreiben ist nur auf
bekannten App-Pfaden im Zusammenhang mit einem neuen Clubstand und einem neuen,
unveränderlichen Befehlsbeleg erlaubt. Andere Schreibpfade und das direkte
Löschen von Clubs/Clubständen sind gesperrt.

1. Alle Geräte kurz aus dem Schreibbetrieb nehmen. Die bisherigen Regeln separat sichern.
2. den Pull Request für V216 bereitstellen und auf dem Hauptgerät laden. Ohne die V216-Dateien würden die neuen Regeln auch eure normalen Eingaben der alten Version ablehnen.
3. Firebase-Konsole → Projekt `kegelclub-invaliden-schwadron` → Firestore Database → Regeln öffnen. Den vollständigen bisherigen Text durch den Inhalt von `firestore.rules` ersetzen. Die bisherige globale Schreibfreigabe darf nicht zusätzlich stehen bleiben, weil eine überlappende Freigabe den Schutz umgehen würde.
4. Den Regeltext in Firebase auf Fehler prüfen und veröffentlichen. Hier wurde kein Zugriff auf die produktive Firebase-Konsole verwendet und kein Firestore-Emulator ausgeführt; die lokalen Guard-Tests ersetzen diese Prüfung nicht.
5. Alle App-/Dashboard-Tabs neu laden. Auf einem Gerät zuerst den bestätigten Serverstand öffnen, danach die übrigen Geräte.
6. Mit zwei Geräten verschiedene Getränke auf dieselbe Person buchen, unabhängige Einstellungen ändern, denselben Spielzug parallel versuchen und ein Gerät kurz trennen. Beide Geräte sowie das Dashboard müssen nach Bestätigung denselben Stand zeigen.

Die Regeln prüfen monotone Clubrevisionen, einen neuen Befehlsbeleg und zusammen
mit dem Clubstand bestätigte Schreibvorgänge. Versionen ohne das neue Synchronisationsprotokoll erzeugen diese
Nachweise nicht und dürfen nicht weiter schreiben. Bereits bestehende Daten und
Archive werden durch das Veröffentlichen der Regeln nicht gelöscht.

Dies ist Protokollschutz für die Synchronisation, keine Benutzeranmeldung oder
Rollenprüfung: Daten bleiben entsprechend den bisherigen Regeln öffentlich lesbar;
auch regelkonforme Schreibbefehle sind noch nicht auf bestimmte Personen beschränkt.
Ein vollständiger Konten-/Rollenschutz wäre ein zusätzlicher Umbau.

## Prüfung im Repository

`npm test` führt die bisherigen Regressionen und die neuen Tests in
`tests/v215-shared-sync.cjs` aus. Diese verwenden die tatsächlichen API- und
App-Dateien, zwei simulierte Firestore-Clients sowie ein Transaktionsmodell mit
Konfliktwiederholung und erzwungener Reihenfolge „alle Reads vor Writes“.
Das ersetzt keinen Test gegen produktive Firebase-Regeln und keine Sichtprüfung
in einem echten Browser.

## Technische Grenzen

Der bestätigte Clubstand liegt weiterhin in einem Firestore-Dokument. Damit gilt
dessen Größenlimit; sehr umfangreiche Historien sollten später in separate
Dokumente ausgelagert werden. Der gemeinsame Transaktionspunkt ist für einen
Kegelclub ausgelegt, nicht für eine beliebig große Zahl gleichzeitiger Schreiber.
Belege in `syncCommands` bleiben bestehen, damit Wiederholungen eindeutig sind.
Bei einem nicht bestätigten Vorgang nach einem vollständigen Neuladen prüft die
App den Beleg und bittet gegebenenfalls um erneute Eingabe; sie spielt keine
alten Geräte-Snapshots ein.

Offizielle Grundlagen: [Firestore-Transaktionen](https://firebase.google.com/docs/firestore/manage-data/transactions),
[Regelbedingungen und Zugriffsgrenzen](https://firebase.google.com/docs/firestore/security/rules-conditions),
[existsAfter/getAfter](https://firebase.google.com/docs/reference/rules/rules.firestore).

## Strafentabelle V216

Die Strafentabelle ist ein eigenständiges Tabellendokument mit Abschnitten und
den Spalten Vergehen/Anlass, Betrag/Einsatz und Hinweise. Bestehende Klartexte
werden beim Lesen automatisch aufgeteilt; erst Speichern legt die strukturierte
Tabelle an. Ein lesbarer Klartext bleibt zusätzlich erhalten. App und Dashboard
verwenden dasselbe Tabellenmodell mit wiederholten Spaltenköpfen pro Seite.
Lange Zeilen werden bei Bedarf fortgesetzt. Der Editor bietet Abschnitts- und
Zeilenfelder, Hinzufügen, Entfernen und Rückgängig. Die Satzung bleibt unverändert.

Die vollständigen Regeln liegen in `firestore.rules`. Die bisherigen offenen
Regeln sind durch den Nutzer bestätigt; die Erweiterung muss nicht installiert
werden. Die Regeln wurden lokal auf ihre Guard-Bedingungen geprüft, aber weder
mit einem Firebase-Emulator noch gegen die produktive Datenbank ausgeführt.

## V217: gleichzeitige Buchungen und Dashboard-Spalten

Der Firestore-Transaktionsadapter verwendet zehn SDK-Versuche pro Transaktion.
Vorübergehende Fehler `aborted`, `unavailable` und `deadline-exceeded` werden bei
Bedarf zusätzlich begrenzt wiederholt. Die Buchungskennung bleibt gleich; ein
bereits bestätigter Beleg wird zuerst gelesen. Bei `permission-denied` wird nur
dann erneut versucht, wenn der Serverstand seit dem letzten Transaktions-Read
nachweislich eine höhere Revision erhalten hat. Eine echte Berechtigungsablehnung
bei unverändertem Stand bleibt bestehen. Spielkonflikte umgehen ihre Revisions-
und Vergleichsprüfungen nicht. Fehlercodes erscheinen im Verbindungsstatus und
bei fehlgeschlagenen Einzel-/Mehrfachbuchungen.

Die Serverursache des auf dem Handy gemeldeten Fehlers konnte ohne konkreten
Fehlercode und produktiven Zugriff noch nicht bestätigt werden. Die neuen Tests
erzwingen diese Fehlerpfade im Transaktionsmodell; sie sind kein Live-Test.

Die Dashboard-Strafentabelle hat feste Abschnittsspalten: Geldstrafen links,
andere Abschnitte rechts. Tabellen fließen nicht über CSS-Textspalten ineinander.
Die Zeilen sind kompakter; bei Bedarf wird innerhalb einer begrenzten lesbaren
Schriftgröße verkleinert, bevor weiterhin gemessene Seiten erzeugt werden.
Auch auf Folgeseiten werden Geldstrafen ausschließlich links dargestellt.

## V218: Spielübersicht statt leerem Dashboard-Platzhalter

Ein gespeicherter geschlossener Spiele-Schalter darf bei fehlenden oder leeren
Spieldaten keinen leeren Begrüßungsbildschirm erzwingen. Das Dashboard zeigt dann
alle 20 Spiele in der Mitte. Laufende Spielstände und die ausdrücklich eingeblendete
Übersicht während eines Spiels behalten ihre bisherigen Anzeigewege.


## V219: Einheitliche Kranzwertung für alle 20 Spiele

Unter Spiele → Einstellungen steht bei jedem Spiel dieselbe Kranzwahl: 8, 12 oder frei wählbar. Die freie Wahl öffnet beim Kranzwurf die gemeinsame Zahlenauswahl (1–9 oder 12; Abbrechen und Escape buchen nichts). Beim guten Schnitt bleibt die automatische aktuelle Zielzahl zusätzlich verfügbar. Bestehende Sonderwerte, beispielsweise Darts 50 und tiefe Hausnummer 0, werden als bisheriger Wert erhalten, bis eine neue Einstellung gewählt wird.

Die Vorgabe liegt pro Spiel und Club in `extraGameSettings.kranzRules`. Neue Partien speichern eine Kopie als `kranzRule`; Änderungen gelten erst für die nächste Partie. Die transaktionalen Spielstarts übernehmen die Vorgabe aus dem bestätigten Clubzustand. Alte Partien ohne Regelkopie behalten ihre bisherige Wertung. Beim Tor-Spiel bleibt das vollständige Abräumen ein Tor; der eingestellte Kranzwert wird im Wurf gespeichert. Beim Sechs-Tage-Rennen wird nach jedem Kranz wieder ins volle Bild geworfen.

Wurfart und Spielwert bleiben getrennt. Ein mit 8 oder 9 gewerteter Kranz bleibt in Strafen und Statistik ein Kranz. Die gewählten Werte werden im Wurfverlauf gespeichert und bei Rückgängig wiederverwendet. Hausnummer und + − × ÷ berücksichtigen die gespeicherten Werte auch in der Dashboard-Berechnung. Die Lotterie ist jetzt ebenfalls Teil des gemeinsamen serialisierten Zustands; ihre früher ausschließlich für den Livepfad vorgesehene Auslassung würde sonst Spiel- und Kranzdaten verlieren.

Validierung: 667 Tests bestanden, darunter bestehende Regressionen sowie neue Modell- und vollständige App-/Transaktionsprüfungen in `tests/v219-kranz.cjs` für alle Spiele, Wertwahl, Abbruch, Korrektur, Strafen, Rückgängig, Regelkopie, Zweitgerät und wiederholte Befehle. Kein echter Firebase-Emulator oder Browser-Sichttest.
