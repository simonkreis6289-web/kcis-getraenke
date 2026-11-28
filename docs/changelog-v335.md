# V335 – Tatsächliche Würfe, Strafbuchungen und helles TV-Dashboard

Ausgangsbasis: `main` bei `424c0b8` (V334), einschließlich V331–V333.

## Änderungen

- „Hauptapp“ bleibt in beiden TV-Einstiegen entfernt (bereits mit V334 umgesetzt).
- Gemeinsame Wurfdefinition in `KCThrows`: tatsächliche Wurfart und tatsächlich gefallene Pins werden separat von Spielpunkten gespeichert. `physicalThrow` ergänzt vorhandene Datensätze kompatibel; ältere, untypisierte Würfe behalten ihre bisherige Interpretation.
- Sämtliche 31 Spiele verwenden für neue Buchungen die tatsächliche Wurfart. Zentraler Strafkatalog bevorzugt getrennte Strafen für 9er, Kranz und Durchwurf; vorhandene kombinierte Kategorien bleiben nutzbar.
- 0 ist Durchwurf; Gosse bleibt eine eigene Taste. Die Eingabe 0 kopiert niemals mehr die Gossenaktion.
- Hausnummer: neue Gossen zählen hoch 0 / tief 9, Durchwürfe 0, echte Neuner 9. Der Spielwert wird beim Wurf eingefroren. Bestehende gespeicherte Spielwerte bleiben erhalten.
- Kranzstatistik immer 8 Pins, auch bei Spielwert 0, 9, 12 oder anderer konfigurierter Wertung.
- Abend- und persönliche Statistik verwenden dieselben physischen Einträge. Unbekannte Teamwerfer bleiben ohne persönliche Statistik; für Pin-Meilensteine wird kein zusätzlicher Werferdialog geöffnet. Bereits vorhandene Auswahl bei persönlichen Wurfstrafen bleibt erhalten.
- Rückgängig und Korrektur verwenden gespeicherte Strafbelege und die bestehenden atomaren Firebase-/Tablet-Buchungen. Spielabschluss, Wiederholung, verlorene Bestätigung, Direktübertragung und Neuladen erzeugen keine weitere Buchung.
- Gastzahlungen: Auswahl vorhandener Gastkegler, kanonische Personenkennung und Name im Zahlungsbeleg, Gastzeile mit Eingang und Saldo, Bearbeiten/Löschen und korrekter Ist-Kassenstand. Keine Mitgliedschaft und kein Monatsauftrag werden angelegt.
- „+ − × ÷“: gemeinsamer Rechenkern für App und TV. Neue Spiele werten Gosse hinter sämtlichen sauberen Ergebnissen; Korrekturen aktualisieren Gewinner und Verlierer. TV mit hellen Zahlenfeldern, Operatoren, Avataren, Spielerfarben, aktuellem Werfer, nächstem Feld, Ergebnisanimation und Abschluss-Rangsortierung.
- Pfälzerspiel: Strich-/Schrägstrichgrafik vor der Anzahl entfernt; Zahlen und Buchungsmechanik unverändert.
- Zentrale animierte Strafbestätigung ausschließlich in der Hauptapp. Sie verwendet bestätigte Anwendungsänderungen und gemeinsame Betragsdaten der Strafentabelle, zeigt alle Kategorien, freie Beträge, Extras und Gesamt, zählt Änderungen auf/ab und gruppiert abhängig von der verfügbaren Tablethöhe höchstens sechs Spieler pro Anzeige für jeweils 2,7 Sekunden; jede angezeigte Zeile bleibt vollständig sichtbar. Eine Liste pro Spieler ersetzt eine unbegrenzte Buchungswarteschlange. Synchronisierungs- und Neuladevorgänge lösen keine Toasts aus; wiederholte Operationsbestätigungen werden unterdrückt. Darstellungsfehler können keine erfolgreiche Buchung zurückrollen.
- Helle Spieloberflächen, Anpassung langer Namen und Ergebniswerte, Schutz schmaler Seitentabellen vor herausgeschobenen Beträgen; Tabellenpositionen, Rotation, Sichtbarkeit, Ton und Vollbild bleiben erhalten.
- Versionsanzeigen, Asset-URLs, Service-Worker-Cache und Samsung-kompatibles Dashboard aktualisiert.

## Wurfvertrag

| Eingabe | Strafempfänger | Gossen | 9er | Kränze | Würfe | Pins |
|---|---|---:|---:|---:|---:|---:|
| 0 / Durchgeworfen | alle anderen | 0 | 0 | 0 | 1 | 0 |
| 1–8 | keine allgemeine Wurfstrafe | 0 | 0 | 0 | 1 | 1–8 |
| 9 | alle anderen | 0 | 1 | 0 | 1 | 9 |
| Kranz | alle anderen | 0 | 0 | 1 | 1 | 8 |
| Gosse | tatsächlicher Werfer | 1 | 0 | 0 | 1 | 0 |

## Division durch 0

Der bisherige Code in App und TV gab bereits ausdrücklich das Ergebnis **0** zurück, wenn der fünfte Wert 0 ist (`e === 0 ? 0 : value / e`). V335 behält diese vorhandene Spielregel bei. Es entsteht keine neue Strafe und kein Infinity-/NaN-Wert.

## Bestandsschutz

Keine Migration und keine Schreibzugriffe auf abgeschlossene Abrechnungs-/Archivdokumente. Die frühere automatische Hotfix-Wiederherstellung wird bei Initialisierung alter Abende (Beginn vor dem 28.11.2026, Europe/Berlin) nicht erneut ausgeführt. Der abgeschlossene Abend vom 27.11.2026 wird damit weder neu berechnet noch nachträglich korrigiert. Frühere Hotfix-Funktionen bleiben zum Lesen sowie für deren isolierte Regressionstests bestehen.

## Qualitätsprüfung

- Vollständige vorhandene Regression inklusive historischer Finanz-, PDF-, Spiel-, Synchronisierungs-, Offline-/Outbox-, Direktverbindungs- und Reload-Tests.
- Neue `tests/v335-physical-throws.cjs`: alle fünf Wurfarten in allen 20 modernen Spielkernen und allen 11 älteren Spielcontrollern; getrennte Strafkategorien, Kranz mit Spielwert 9, tatsächliche Pinzahl, persönliche Zuordnung, gespeicherte Belege, Undo und Wiederholung.
- Zusätzliche Integration: Hausnummer 0/Gosse/9er mit Reload, Gastzahlung anlegen/ändern/löschen, Plusminus-Abschluss/Korrektur, Gruppierung/Animation/Rückbuchung der Toasts, unveränderte historische Initialisierung, beide TV-Einstiege ohne Hauptapp-Button.
- Syntaxprüfung aller 129 JS-Dateien/Inline-Skripte.
- Samsung-TV-Build mit Babel/esbuild und ES2018-Prüfung; erzeugte Dateien liegen im Commit.
- Firestore-Emulator: Regeln für Station, Tablet und Dashboard-Signal mit tatsächlichem SDK.
- Visuelle Browserprüfung mit synthetischen Daten bei 1920×1080, 1280×720 und 1024×768; zusätzlich native Browsergröße 1363×936. Tests verwenden keine produktiven Buchungsdaten.

Die Ergebnisse der vollständigen Prüfung und die GitHub-Checks stehen im Pull Request. Ein physischer Samsung-TV sowie zwei reale Clubgeräte können hier nicht bedient werden; die vorhandenen automatisierten Tests prüfen beide Synchronisierungswege und das kompatible TV-Bundle.

## Geänderte Dateien

- `css/dashboard-light.css`
- `css/penalty-booking-toasts.css`
- `dashboard-compat.html`
- `dashboard.html`
- `docs/changelog-v335.md`
- `getraenke-abrechnung.html`
- `js/app.js`
- `js/cash-book.js`
- `js/cash-income.js`
- `js/cash-overview.js`
- `js/evening-counters.js`
- `js/firebase.js`
- `js/game-fine-policy.js`
- `js/game-inputs.js`
- `js/games/club-games-core.js`
- `js/games/club-games-ui.js`
- `js/games/darts.js`
- `js/games/extra-core.js`
- `js/games/extra-view.js`
- `js/games/fuchsjagd.js`
- `js/games/hausnummer-core.js`
- `js/games/individual-core.js`
- `js/games/lotterie.js`
- `js/games/mensch.js`
- `js/games/plusminus-score.js`
- `js/games/plusminus.js`
- `js/games/seating.js`
- `js/games/sechstage-core.js`
- `js/games/sichern.js`
- `js/games/table-games-core.js`
- `js/games/tannenbaum.js`
- `js/games/tiberius.js`
- `js/games/tor.js`
- `js/hotfix-recovery.js`
- `js/penalty-booking-toasts.js`
- `js/shared-sync-app.js`
- `js/shared-sync-core.js`
- `js/shared-sync-transport.js`
- `js/state.js`
- `js/tablet-sync.js`
- `sw.js`
- `tests/v178-regression.cjs`
- `tests/v179-regression.cjs`
- `tests/v185-regression.cjs`
- `tests/v187-regression.cjs`
- `tests/v230-player-rows.cjs`
- `tests/v236-fence-lottery.cjs`
- `tests/v252-dashboard-matrix.cjs`
- `tests/v253-tiberius-turns.cjs`
- `tests/v275-club-games.cjs`
- `tests/v331-hotfix.cjs`
- `tests/v332-physical-statistics.cjs`
- `tests/v333-statistics-outbox.cjs`
- `tests/v335-physical-throws.cjs`
- `tv-compat/dashboard.js`
- `tv-compat/firebase.js`
