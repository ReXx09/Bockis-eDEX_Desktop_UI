# BOCKIS Panel-Tour 2.1 – Gezielte Bedienelemente

## Ziel
Die Tour zeigt bei geeigneten Panels nicht nur die gesamte Panel-Kachel, sondern das relevante Eingabefeld in der vorhandenen Panel-Setup-Ansicht. Die Einführung wird weiterhin freiwillig angeboten und kann jederzeit über `Tour überspringen` oder Escape geschlossen werden.

## Implementierte Ziele

| Panel | Tour-Schritt | Markiertes UI-Element |
| --- | --- | --- |
| Uhr (`clock`) | Darstellung/Zeitformat | `#panel-clock-mode` |
| RAM (`ram`) | Anzeigemodi | `#panel-ram-mode` |
| Wetter (`weather`) | Standort | `#panel-weather-location` |
| Dateisuche (`filesearch`) | Schriftgröße | `#panel-search-font` |
| Task-Dock (`taskdock`) | Kachelgröße | `#panel-taskdock-tile-size` |
| Allgemeine Grundlagen | Panelmenü | `[data-card-act="settings"]` innerhalb des jeweiligen Panels |

Alle übrigen Panel-Typen behalten ihre **individuellen** erklärenden Tour-Schritte mit einer Markierung des Panels. Neue Controls können über das Manifest ergänzt werden, wenn die entsprechenden tatsächlichen Setup-Elemente vorhanden sind und in der Ziel-Whitelist freigegeben werden.

## Ablauf
1. Der Tour-Controller lädt die panelspezifischen Schritte aus `src/panel-tour/tours/profiles.json`.
2. Für einen `setup:#...`-Schritt öffnet der Renderer die **bestehende** Panel-Setup-Oberfläche über `openPanelSetup`. Es wird kein zweiter Settings-Dialog programmiert.
3. Der Spotlight-Rahmen markiert das betreffende Feld. Die Tour blockiert bewusst die eigentliche Eingabe, um keine versehentlichen Änderungen zu erzeugen; zum Bearbeiten kann man nach dem Beenden das Panel-Setup regulär öffnen.
4. Beim Wechsel zu einem Schritt ohne Setup-Ziel oder beim Beenden entfernt die Tour das von ihr geöffnete Setup-Fenster.
5. Ist ein Ziel nicht vorhanden oder nicht sichtbar, erscheint der vorhandene Hinweis statt eines Absturzes.

## Dateien
- `src/panel-tour/tours/profiles.json`: Konkrete Ziele für fünf Paneltypen.
- `scripts/panel-tour-build.js`: Erlaubte Selektoren werden pro Panel validiert.
- `src/panel-tour/panel-tour-profiles.js`: Generierte Browser-Profile.
- `src/panel-tour/panel-tour.js`: Zielauflösung, Setup-Eröffnung, Spotlight, Aufräumen.
- `src/renderer.js`: Übergabe eines vertrauten `openSetup`-Callbacks, Setup-Funktion liefert DOM-Element zurück.
- `test/panel-tour-controls.test.js`: Regressionstests.

## Prüfstatus
- `node --test test/panel-tour-controls.test.js test/panel-tour.test.js`: 10/10 bestanden.
- `npm run i18n:check`: 335 Schlüssel pro Sprache, erfolgreich.
- Vollständige Node-Testsuite: 81 bestanden, 2 fehlgeschlagen, 6 abgebrochen. Fehler und Abbrüche im Hardware-/Electron-Umfeld.
- Kein Windows-11-Electron-Laufzeittest durchgeführt.

## Weitere Verbesserung
Ein späterer *interaktiver* Lernmodus könnte explizit freigeschaltete UI-Eingaben während des Overlays erlauben, Änderungen aber zunächst nur in einer temporären Vorschau übernehmen. Die aktuelle Version ist bewusst eine geführte, rein erklärende Spotlight-Tour.
