# Dashboard für ältere TV-Browser

Das Dashboard erkennt fehlende JavaScript-Funktionen beim Aufruf automatisch.
Die Kompatibilitätsseite enthält dieselbe Anzeige und dieselbe Firestore-Version,
gebaut für Chromium 63. WebRTC bleibt von Browser, Firmware und Hotspot abhängig.
Der Verbindungsstatus meldet WebRTC erst nach einer empfangenen Bestätigung.

Nach Änderungen am Dashboard, seinen JavaScript-Dateien oder der Versionsnummer
erzeugt `npm run build:tv` die Kompatibilitätsseite und die drei Dateien unter
`tv-compat/`. GitHub Pages liefert beide Seiten aus. Tablet und TV brauchen
keinen lokalen Server. Der Build prüft die erzeugte JavaScript-Syntax.
