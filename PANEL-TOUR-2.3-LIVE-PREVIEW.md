# BOCKIS Panel Tour 2.3 – Temporäre Live-Vorschau

## Ziel

Die interaktiven Übungen der Panel-Tour verändern die Darstellung unterstützter Panels **vorübergehend**. Erst `Übernehmen` löst die bestehende validierte Speicherfunktion des Panel-Setups aus. `Verwerfen`, `Weiter`, `Überspringen` und Escape beseitigen die nicht bestätigte Vorschau.

## Unterstützte Übungen

| Panel | Vorschau | Verhalten |
| --- | --- | --- |
| Uhr | Digital/Analog | Temporärer Modus in `clockDisplayMode()`, wird bei jedem `renderClock()` berücksichtigt. |
| RAM | USED/FREE/CACHED/AVAILABLE/TOTAL | Temporäres `data-ram-gauge-mode` am HTML-Element. |
| Dateisuche | Schriftgröße | Temporärer CSS-Wert `--search-font`. |
| Task-Dock | Kachelgröße | Temporäres `data-taskdock-tile-size` am Dock-Panel. |
| Wetter | Standort | Temporärer Standorthinweis im Wetter-Panel; kein Live-Wetterabruf vor Zustimmung. |

Die Tour erfasst nur die fünf fest hinterlegten, bereits vorhandenen Setup-Eingaben. Unbekannte Selektoren oder beliebige Scripts aus Themes werden **nicht** ausgeführt.

## Ablauf

1. Die Tour öffnet bei Bedarf das vorhandene Panel-Setup.
2. Ein Lernwert wird zunächst im Setup-Eingabefeld geändert. Ein separater Renderer-Adapter verändert ausschließlich die temporäre Darstellung am Panel.
3. Der Adapter gibt eine Wiederherstellungsfunktion zurück. Vor einer neuen Vorschau wird immer zuerst die vorige zurückgesetzt.
4. Bei `Verwerfen`, `Weiter`, `Überspringen` und Escape wird die nicht bestätigte Vorschau zurückgesetzt.
5. `Übernehmen` nutzt weiterhin die vorhandene `#panel-setup-save`-Aktion samt deren Validierung und Fehlerereignissen. Nur nach Erfolg wird die Live-Vorschau entfernt und die Anzeige aus gespeicherten Einstellungen synchronisiert.
6. Beim Fehler bleibt der Nutzer im Lernschritt. Ein Fehlerhinweis wird angezeigt; die Live-Vorschau ist weiterhin verwerfbar.

## Technische Änderungen

- `src/renderer.js`: `previewPanelTourControl()`, `syncPanelTourSavedVisual()`, temporäre Uhr-Override und Übergabe des Preview-Adapters an alle drei Startwege.
- `src/panel-tour/panel-tour.js`: Verwaltung der Undo-Funktion, Rücksetzen beim Navigieren/Schließen, Aktualisierung nach erfolgreichem Speichern.
- `src/panel-tour/panel-tour.css`: Standorthinweis für die Wetter-Vorschau.
- `src/locales/{en,de,zh-Hant}.json` und erzeugte `.js`-Module: neuer Live-Vorschau-Hinweis.
- `test/panel-tour-live-preview.test.js`: Regressionstests für Adapter, Rücksetzen, Speichern und Wetterhinweis.

## Grenzen und Windows-Tests

Die Vorschau wurde mit Syntax-, Schema- und Quellcode-Tests geprüft. Ein visueller Electron-Laufzeittest auf Windows 11 steht aus. Besonders prüfen: Uhr-Timer, dynamisch aktualisierte RAM-Daten, Task-Dock bei Auto-Wachstum, andere geöffnete Panel-Setups und die korrekte Rücksetzung beim Abbrechen. Wetterdaten werden nicht im Hintergrund für eine bloße Vorschau nachgeladen.

Die eigentlichen Schriftdateien fehlen wie in der zugrunde liegenden Projekt-ZIP; für einen vollständigen Build müssen sie aus der rechtmäßig vorhandenen Projektquelle ergänzt werden.
