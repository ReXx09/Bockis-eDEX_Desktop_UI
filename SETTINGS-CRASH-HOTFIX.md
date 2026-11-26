# BOCKIS-eDEX – Theme Studio / Einstellungsmenü Hotfix

## Fehlerbild

Die Windows-Protokolle zeigen mehrfach `Uncaught TypeError: Cannot set properties of null (setting 'value')` in `src/theme-studio.js`, Zeile 610, Spalte 48. Das Theme Studio versucht das Feld `[data-id="taskbar-alignment"]` zu beschreiben, obwohl `root.querySelector(...)` an dieser Stelle `null` zurückgibt. Bereits beim Mounten wird eine unbehandelte Ausnahme ausgelöst.

## Geänderte Datei

`src/theme-studio.js`: Die Taskleisten-Eingabefelder werden einmal gesucht und vor dem Setzen von `.value` geprüft. Ebenso prüft der Speicher-Handler, ob sie vorhanden sind, und wirft andernfalls einen kontrollierten Fehler. Beim asynchronen Laden der Einstellungen werden die Werte nur gesetzt, wenn die entsprechenden Felder vorhanden sind. Bei fehlenden Feldern wird ein Hinweis in der Entwicklerkonsole ausgegeben.

## Einschränkung

Dieser Hotfix verhindert den Absturz durch die beiden Taskleistenfelder. Er beweist nicht, weshalb die Felder in deinem installierten DOM fehlen. Die Quellen enthalten sie im HTML-Template. Falls der Fehler nach Neuinstallation weiterhin vorkommt, muss der Runtime-DOM im Electron-DevTools geprüft werden (z. B. `document.querySelectorAll('[data-id="taskbar-alignment"]').length`) und nach weiteren Renderer-Fehlern gesucht werden. Ein Windows-/Electron-Laufzeittest konnte in der vorliegenden Umgebung nicht durchgeführt werden.

## Test

`node --check src/theme-studio.js` erfolgreich. ZIP-Integritätsprüfung erfolgreich. Das installierte Programm muss aus der neu gebauten Version stammen; eine ZIP mit Quellcode aktualisiert die bereits installierte Anwendung nicht automatisch.
