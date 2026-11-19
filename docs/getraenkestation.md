# KC Getränkestation

Die Getränkestation ist eine eigene installierbare Web-App. Tablet und Getränkestation buchen in dieselbe Getränkeabrechnung. Das TV-Dashboard liest denselben bestätigten Kegelabendstand.

## Firebase einmalig einrichten

1. Im Projekt **kegelclub-invaliden-schwadron** unter Authentication die Anmeldeverfahren **E-Mail/Passwort** und **Anonym** aktivieren. Für die Spielleitung ein eigenes Firebase-Authentication-Konto mit E-Mail und Passwort anlegen. Anonyme Nutzer nicht automatisch nach kurzer Zeit löschen lassen, wenn die Kopplung für längere Pausen zwischen zwei Kegelabenden erhalten bleiben soll.
2. Die UID dieses Spielleitungskontos aus Firebase Authentication übernehmen. Mit einem berechtigten Google-Konto für Application Default Credentials anmelden und die Rolle setzen. Es werden nur die Rollen dieses Kontos ergänzt.
   ```sh
   npm ci
   gcloud auth application-default login
   node scripts/provision-station-operator.cjs kegelclub-invaliden-schwadron AUTH-UID
   ```
3. Aktive Firestore-Regeln in der Konsole mit der Repository-Fassung vergleichen und vor dem Wechsel sichern. Die Repository-Regeln im Emulator prüfen und dann mit einem berechtigten Firebase-CLI-Konto deployen.
   ```sh
   npm run test:station-rules
   npx --yes firebase-tools@14.12.0 login
   npx --yes firebase-tools@14.12.0 deploy --only firestore:rules --project kegelclub-invaliden-schwadron
   ```
4. Haupt-App, Dashboard und Getränkestation gemeinsam über die bestehende HTTPS-Adresse ausliefern und auf allen Geräten neu laden. Vor der ersten Kopplung prüfen, dass der Login der Spielleitung, die normalen Tablet-Buchungen und die TV-Anzeige funktionieren.

Erst die erste erfolgreiche Gerätefreigabe aktiviert die zusätzliche Schreibabsicherung für den jeweiligen Club. Ab dann braucht die Haupt-App zum Schreiben ein Spielleitungskonto, auch nach einem Widerruf der Station. Bei einem Gerätewechsel bleibt diese Absicherung bestehen. Das Dashboard braucht zum Anzeigen keine Anmeldung. Seine Verbindungsdiagnose schreibt ausschließlich in die vorgesehenen TV-Dokumente.

## Auf dem Getränkehandy installieren

1. Haupt-App auf dem Tablet öffnen, Club auswählen und unter **Verwaltung → Getränkestation** als Spielleitung anmelden.
2. **Getränkehandy verbinden** auswählen. Den QR-Code auf dem Android-Gerät mit der Kamera scannen. Das Gerät mit einem erkennbaren Namen anfragen.
3. Am Tablet den Gerätenamen prüfen und **Gerät freigeben** auswählen. Eine neue Freigabe ersetzt die bisherige.
4. Auf dem Getränkehandy im Chrome-Menü **App installieren** bzw. **Zum Startbildschirm hinzufügen** auswählen. Danach die Kachel **KC Theke** vom Startbildschirm aus öffnen. Die App verwendet beim Start die gespeicherte Geräteidentität. Wenn der Browser seine Website-Daten gelöscht hat, das Gerät neu koppeln.

Tablet, TV und Getränkehandy können denselben Hotspot nutzen. Für die Station muss Firebase über das Internet erreichbar sein. Lass die Haupt-App mit dem Club und der Spielleitungsanmeldung auf dem Tablet geöffnet. Ist das Tablet vorübergehend offline, wartet der Auftrag bei Firebase auf die Abrechnung und bleibt in der Station als ausstehend sichtbar. Wenn schon die Anfrage Firebase nicht erreicht, behält die Station ihre Buchungs-ID lokal für einen erneuten Versuch. Erst wenn Firebase die Buchung zusammen mit der Abrechnung gespeichert hat, erscheint die Bestätigung.

Ein Abschluss der Getränkeabrechnung sperrt die Station für den aktuellen Abend. Der nächste neue Kegelabend hat eine eigene Kennung. Nach einem Wechsel werden ausstehende Aufträge des alten Abends abgelehnt. Stornos in der Station beziehen sich auf die dort protokollierten Buchungen. Runden gehen wie in der Haupt-App zu Lasten des Gastgebers, und Mannschaftsbuchungen werden auf das ausgewählte Team verteilt.

## Prüfungen

- `npm run test:station-rules` prüft echte Firestore-Regeln mit emulierten Identitäten, einschließlich Ablauf, Einmaligkeit, Freigabe, widerrufener Geräte, unberechtigter Direktzugriffe und Abendsperre.
- `node --test tests/v270-station.cjs` prüft UI-Zustände, die PWA-Dateien und den gemeinsamen Buchungsweg mit den lokalen Firestore-Testdoubles.
- Der Android-Installationsdialog und die Verbindung zwischen dem tatsächlichen Tablet, TV und Smartphone werden beim ersten Aufbau vor Ort geprüft.
