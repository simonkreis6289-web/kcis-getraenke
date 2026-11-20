# Dashboard für ältere TV-Browser

Das Dashboard erkennt fehlende JavaScript-Funktionen beim Aufruf automatisch.
Die Kompatibilitätsseite enthält dieselbe Anzeige und dieselbe Firestore-Version,
gebaut für Chromium 63. WebRTC bleibt von Browser, Firmware und Hotspot abhängig.
Der Verbindungsstatus meldet WebRTC erst nach einer empfangenen Bestätigung.

Nach Änderungen am Dashboard, seinen JavaScript-Dateien oder der Versionsnummer
erzeugt `npm run build:tv` die Kompatibilitätsseite und die drei Dateien unter
`tv-compat/`. GitHub Pages liefert beide Seiten aus. Tablet und TV brauchen
keinen lokalen Server. Der Build prüft die erzeugte JavaScript-Syntax.

## Direktverbindung ab V292

Tablet und TV öffnen denselben Club. Sobald der TV den Firebase-Spielstand
geladen hat, schickt er automatisch ein befristetes WebRTC-Angebot an den Club.
Das Tablet beantwortet das Angebot über Firestore. Die eigentlichen Live-Daten
laufen anschließend über einen verschlüsselten WebRTC DataChannel. Die
Browser bleiben unabhängig davon an Firestore angemeldet bzw. verbunden. Ein
BroadcastChannel kann im gleichen Browser eine Vorschau übertragen.

Für die Direktverbindung werden ausschließlich Host-Kandidaten mit privaten
oder linklokalen IP-Adressen bzw. lokalen mDNS-Namen ausgetauscht. Der Browser
muss zusätzlich ein ausgewähltes lokales ICE-Kandidatenpaar nachweisen und der
TV muss einen Datenrahmen bestätigen. STUN-, TURN- und öffentliche
ICE-Kandidaten gehören nicht zu diesem Weg. Ist keine Bestätigung möglich,
zeigt die App die Firebase-Verbindung an, sofern der TV dort erreichbar ist.
Bei Abbruch versucht der TV den Direktaufbau mit begrenztem Backoff erneut.
Die Signalisierung schreibt nur separate, befristete Dashboard-Dokumente.
Die Zugriffsrechte des bestehenden Clubs gelten weiterhin. Die automatische
Erkennung ersetzt keine Mitgliederanmeldung oder Gerätefreigabe im selben LAN.

Die Tablet-App legt jede Änderung mit einer eindeutigen Auftragskennung zuerst
in der dauerhaften Browser-Warteschlange ab. Das Dashboard kann einen offenen
Stand sofort anzeigen. Firestore entscheidet, ob der Auftrag dauerhaft
übernommen wird. Der TV kennzeichnet offene Daten auch während der Rückkehr
auf Firebase. Ein unabhängiger neuerer Firebase-Stand hat Vorrang. Bei einem
echten Konflikt bleibt die lokale Warteschlange erhalten und kann über die
Cloud-Details gesichert werden, bevor der bestätigte Stand übernommen wird.
Vorübergehende Fehler werden erneut versucht. Der bereits aufgebaute
Direktweg kann ohne Internet weiterlaufen. Für einen neuen Verbindungsaufbau
nach einem Neustart oder Abbruch ist Firebase für die Signalisierung nötig.

### Praxisprüfung am Samsung-TV

| Versuch | Erwartung |
| --- | --- |
| Heim-WLAN, Smartphone-Hotspot und Hotspot des Tablets jeweils einzeln | Gleichen Club auf beiden Geräten öffnen. Bei erlaubtem Geräteverkehr und unterstütztem TV-Browser meldet die App „TV direkt verbunden“. |
| Gast-WLAN mit Client-Isolation oder unterschiedliche Netzwerke | Weiterhin Live-Updates über Firebase. Es wird keine Direktverbindung gemeldet. |
| WLAN-Wechsel bei laufendem Spiel | Firebase übernimmt bei erreichbarem Internet. Nach wiederhergestelltem LAN baut der TV den Direktweg neu auf. |
| Internet kurz trennen, LAN und Browser geöffnet lassen | Direkte Anzeige kann weiterlaufen. Die App zeigt offene Speichervorgänge, bis Firebase bestätigt. |
| Tablet und TV separat neu laden, schnelle Würfe sowie Rückgängig testen | Verbindung wird neu aufgebaut. Ein bestätigter Wurf wird genau einmal gebucht. Eine nach Tablet-Neuladen vorhandene offene Warteschlange wird weiterverarbeitet. |
| Einzelnen und letzten 7er-Wurf mit abweichenden Zielzahlen testen | In App und TV stehen dieselben Zielspalten und derselbe erste Wurf. Die Abschlussbuchung entspricht dem geteilten Endbetrag. |

Samsung verwendet je nach Modell und Firmware unterschiedliche Web-Engines.
Die Projekt-Tests prüfen Signalisierung, Transportwechsel, den Abgleich und
die Browser-Syntax. Ein Nachweis für die drei konkreten Netzaufbauten auf
einem Samsung-Gerät erfordert die Praxisprüfung.

- [Samsung Web Engine Specifications](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)
- [MDN: RTCPeerConnection.getStats](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getStats)
