# BOCKIS Panel-Tour 2.2 – Interaktiver Lernmodus

## Ziel
Die vorhandene Panel-Tour 2.1 wurde um praktische Übungen ergänzt. Nutzer können ausgewählte Panel-Einstellungen in der Tour verändern, bevor sie diese ausdrücklich übernehmen. Englisch ist die technische Ausgangssprache; die Texte liegen außerdem in Deutsch und traditionellem Chinesisch vor.

## Bedienablauf
1. Ein Panel erstmalig hinzufügen oder im panelinternen Setup die Einführung starten.
2. Bei einer unterstützten Einstellung zeigt die Tour das jeweilige echte Einstellungsfeld hervorgehoben sowie eine separate Testauswahl im Tour-Fenster.
3. **Ausprobieren:** Die Testauswahl schreibt den neuen Wert ausschließlich in das geöffnete Setup-Formular. Das normale Speichern wird nicht ausgelöst.
4. **Übernehmen:** Die Tour löst den bestehenden Setup-Speichervorgang aus. Erst dessen Erfolg führt zum nächsten Tour-Schritt.
5. **Verwerfen**, **Weiter**, **Tour überspringen** oder **Escape:** Nicht gespeicherte Testwerte werden auf ihren ursprünglichen Formularwert zurückgesetzt. Das Tour-eigene Setup wird geschlossen.

## Unterstützte praktische Übungen
| Panel | Einstellungsfeld | Eingabetyp |
|---|---|---|
| Uhr | `#panel-clock-mode` | Auswahl digital/analog |
| RAM | `#panel-ram-mode` | Anzeige-Modus |
| Wetter | `#panel-weather-location` | Vorgegebener Standort (individuelle Eingabe bleibt im normalen Setup) |
| Dateisuche | `#panel-search-font` | Schriftgröße (mit Feldvalidierung) |
| Task-Dock | `#panel-taskdock-tile-size` | Kachelgröße |

Andere Panel-Typen behalten die individuelle erläuternde Tour 2.1. Das System behandelt Tour-Konfigurationen nicht als ausführbare Skripte; Änderungen sind nur an explizit freigegebenen Feldern erlaubt.

## Technische Implementierung
- `src/panel-tour/panel-tour.js`: Whitelist von Übungsfeldern, temporärer Zustand, Verwerfen, Bestätigung und Behandlung von Speicherfehlern.
- `src/renderer.js`: Das vorhandene Panel-Setup meldet per `edex:panel-setup-saved` / `edex:panel-setup-error` das Ergebnis an die Tour. Die bestehende Validierung und Speicherung bleiben maßgeblich.
- `src/panel-tour/panel-tour.css`: Design der Übungsfelder und Aktionen.
- `src/locales/{en,de,zh-Hant}.json` und generierte Sprachmodule: Fünf neue lokalisierte Texte.
- `test/panel-tour-learning.test.js`: Vier neue Regressionstests.

## Sicherheit und Grenzen
- Diese Lernübungen sind **Formular-Vorschauen**. Eine unmittelbare Live-Änderung der laufenden Panel-Darstellung erfolgt erst nach regulärem Speichern und Neuaufbau des Workspace.
- Das Speichern betrifft den vorhandenen Panel-Setup-Dialog und damit dessen aktuelle Werte. Die Tour ändert außer dem ausgewählten Übungsfeld keine weiteren Formularfelder.
- Wetter-Standorte mit Freitexteingabe sind nicht Teil der Tour-Übung; sie bleiben über die normale Panel-Einstellung nutzbar.
- Die Tour selbst installiert keine Komponenten und verändert keine Windows-Systemeinstellungen.
- Windows-11-Electron-Laufzeit und visuelle Positionierung konnten in dieser Linux-Umgebung nicht überprüft werden.

## Prüfung
`node --test test/panel-tour-learning.test.js test/panel-tour-controls.test.js test/panel-tour.test.js`
`npm run i18n:check`
`npm run panel-tour:check`
