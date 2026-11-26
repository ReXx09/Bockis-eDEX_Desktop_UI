# BOCKIS Panel Tour 1.0 – Prüf- und Änderungsbericht

## Inhalt

Die Einführung zeigt nach dem ersten erfolgreichen Hinzufügen eines Panel-Typs vier Stationen:

1. **Neues Panel:** Panel erkennen, verschieben und skalieren.
2. **Skalierzone:** Zentraler Arbeitsbereich, dessen Grenzen unter Einstellungen → Raster & Layout konfiguriert werden.
3. **Randzone:** Platz außerhalb der Skalierzone für randnahe Panels; es muss ausreichend Platz vorhanden sein.
4. **Panelmenü:** Im Menü des Panels „Setup“ öffnen und unter „Positionierungszone“ Skalierzone oder Randzone zuweisen, danach speichern.

Jeder Schritt ist freiwillig. „Tour überspringen“ und Escape beenden sie ohne Änderungen. Ist das Panel nicht sichtbar, wird der Erklärungstext ohne Spotlight angezeigt. Touren werden für jeden Panel-Typ einmal angeboten, über alle Displays hinweg, und nicht bei jedem Start. Beim initialen First-Run-Assistenten wird keine zusätzliche Panel-Tour gleichzeitig geöffnet.

Im **Panel-Setup** steht eine Checkbox „Einführung beim ersten Hinzufügen dieses Panels anzeigen“ sowie der Button „Panel-Tour jetzt starten“. Die Checkbox steuert zukünftige automatische Hinweise dieses Panel-Typs; der Button startet die Tour jederzeit unabhängig vom gespeicherten Erledigt-Status.

## Geänderte Dateien

- `src/renderer.js`: Einbindung beim erfolgreichen Hinzufügen, Panel-Setup-Checkbox, manuelle Tour, Speicheranbindung.
- `src/panel-tour/panel-tour.js` (neu): unabhängiger vierstufiger Spotlight-Dialog, Escape/Skip/Weiter, Fokusführung, Fallback bei fehlendem Panel.
- `src/panel-tour/panel-tour.css` (neu): responsives eDEX-Design.
- `src/index.html`: Registrierung der beiden Tour-Dateien.
- `lib/settings-store.js`: validierte `panelTours`-Einstellungen mit `seen` und `disabled` pro Panel-ID.
- `src/locales/en.json`, `de.json`, `zh-Hant.json` und generierte Sprachmodule: 16 neue Übersetzungsschlüssel, Englisch als Basissprache.
- `test/panel-tour.test.js` (neu): Regressionstests.

## Grenzen und Windows-Tests

Das Spotlight markiert das Panel als Orientierungspunkt, **nicht** die exakten Pixelflächen von Skalierzone/Randzone. Die Geometrie und Zonenzuweisung bleiben in der bestehenden Desktop-Layout-Engine. Die Tour führt keine Zonenzuweisung selbst aus, sondern erklärt das vorhandene Panel-Setup. Fenster in Electron und Mehrmonitorkonstellationen müssen visuell getestet werden.

Die Verfügbarkeit eines Panels hängt von seinem tatsächlichen Layout ab; der neu hinzugefügte Typ wird erst nach erfolgreichem Layout-Speichern als „gesehen“ markiert. Scheitert das Speichern des Tourstatus, bleibt das Panel dennoch nutzbar.

**Bekannte Voraussetzung:** Die Quellprojektvorlage enthält nicht alle Schriftdateien; für einen vollständigen Windows-Build gelten die vorhandenen Build-Voraussetzungen und die Release-Vorabprüfung.
