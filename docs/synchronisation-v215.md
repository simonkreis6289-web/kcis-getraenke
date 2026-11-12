# Synchronisation V215

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

Die aktuelle produktive Regeldatei ist nicht im Repository enthalten. Deshalb
ist `firebase/shared-sync.rules.fragment` bewusst eine Ergänzung und kein
ungeprüfter Ersatz für die vorhandenen Lese-, Anmelde- und Rollenrechte.

1. Firebase-Konsole → Projekt `kegelclub-invaliden-schwadron` → Firestore Database → Regeln öffnen.
2. Den aktuellen Regeltext sichern und bereitstellen. Die Funktionen aus dem Fragment werden in diesen Text integriert; alle bestehenden Schreibfreigaben einschließlich überlappender Wildcards müssen die passenden zusätzlichen Guards erhalten. Die bestehende Zugriffsprüfung wird mit `&&` beibehalten, niemals durch `true` ersetzt.
3. Regeln im Emulator bzw. Regeltest prüfen: Einzelbuchung und Initialisierung zulassen; alte Snapshot-/Live-Schreibvorgänge, wiederverwendete Belege und direkte Löschungen ohne neuen Clubstand ablehnen. Die Funktionen verwenden gemeinsame, zwischengespeicherte Root-/Belegzugriffe und sollen innerhalb der Firestore-Regelzugriffsgrenzen bleiben.
4. Schreibbetrieb auf allen Geräten kurz beenden. V215 bereitstellen und die integrierten Regeln veröffentlichen. V214 darf anschließend nicht weiter schreiben.
5. Alle App-/Dashboard-Tabs neu laden. Auf einem Gerät zuerst den bestätigten Serverstand öffnen, danach die übrigen Geräte.
6. Mit zwei Geräten verschiedene Getränke auf dieselbe Person buchen, unabhängige Einstellungen ändern, denselben Spielzug parallel versuchen und ein Gerät kurz trennen. Beide Geräte sowie das Dashboard müssen nach Bestätigung denselben Stand zeigen.

Die Regelergänzung ist ein Protokollschutz. Sie ersetzt keine Benutzeranmeldung
oder Rollenprüfung. Ohne die bisherige produktive Regeldatei und Zugriff auf das
Firebase-Projekt wurde sie hier nicht veröffentlicht oder gegen das reale
Projekt geprüft. Der neue Stand bleibt bis dahin zur Überprüfung im Pull Request.

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
