# BOCKIS eDEX – Einstellungsfenster: Prüfung und Layout-Korrektur

Stand: 25. November 2026. Grundlage: `Bockis-eDEX-Installer-Windhawk-Navigation-Fix.zip` und Screenshot des Theme Studios.

## Befunde

1. **Zu schmales Hauptfenster (behoben):** `openSettings()` rief `placeCentered(modal)` ohne Breitenvorgabe auf. Die allgemeine Funktion `modalDialogWidth()` begrenzte das Fenster auf höchstens 760 px, obwohl `.settings-modal` in CSS deutlich breiter definiert war. Jetzt verlangt das Einstellungsfenster bis zu 1420 px beziehungsweise 94 % der Renderer-Breite; durch die generelle Platzierungsfunktion wird es auf maximal 92 % des Viewports begrenzt. Andere Dialoge bleiben unverändert.
2. **Überlaufende Theme-Studio-Spalten (behoben):** `.studio-layout` besitzt feste Mindestbreiten von 250 + 290 px. Im schmalen Detailbereich wurden Controls rechts abgeschnitten. Eine CSS-Containerabfrage schaltet die eingebettete Ansicht bei weniger als 760 px Inhaltsbreite auf eine Spalte. Das separate Theme-Studio-Fenster bleibt von dieser Anpassung unberührt.
3. **Zu breite Seitenleiste (verbessert):** Seitenleiste dynamisch auf 21 % mit Obergrenze 18 rem statt fest bis 22 rem. Unter 1100 px wird der Anteil angepasst.
4. **Fehlende Inhaltsgrenzen (behoben):** zusätzliche `min-width: 0` / `max-width: 100%` für Theme Studio und Inhalte. Tabellenfelder dürfen umbrechen; Eingabefelder bleiben innerhalb ihrer Zellen.
5. **Falsches Untermenü (behoben):** „Fenster & Panels“ zeigte zuvor auf die Desktop-Sektion. Es führt jetzt zum Panel-Design in der eDEX-Sektion; entsprechender Anker ergänzt.
6. **Untermenü-Wechsel (verbessert):** Scrollposition des Inhalts wird beim Umschalten zurückgesetzt, bevor gegebenenfalls ein Studio-Anker angesprungen wird.
7. **Irreführender Speichern-Knopf (verbessert):** Der allgemeine Knopf heißt jetzt „Einstellungen speichern“, um ihn vom eigenen Theme-Speichern des Studios zu unterscheiden. Theme-Änderungen sind nicht Teil des allgemeinen Settings-Speicherns.

## Tests / Grenzen

- Syntaxprüfung der geänderten JavaScript-Dateien bestanden.
- 14 von 15 ausgeführten Tests bestanden. Der einzige fehlgeschlagene Test (`organizer.test.js`) bricht wegen einer fehlenden Electron-Abhängigkeit in der Linux-Umgebung ab, nicht aufgrund einer fehlgeschlagenen Layoutprüfung.
- Die tatsächlichen Fenstergrößen, DPI-Skalierung, Breite der Untermenüs und Navigation müssen unter Windows 11 / Electron getestet werden. CSS-Containerqueries werden von aktuellen Electron/Chromium-Versionen unterstützt; die eingesetzte Electron-Version und deren Laufzeitverhalten sind dabei gesondert zu überprüfen.
- **Noch offen:** Eine vollständige, automatische Suchindexierung aller Untermenü-Einstellungen; konsistente Dirty-State-Verwaltung über Theme Studio und allgemeine Einstellungen hinweg; umfassende Tastaturnavigation/Fokusmanagement; Windhawk-Mod-Steuerung (noch keine tatsächliche Windows-Oberflächenübertragung).

## Geänderte Dateien

- `src/renderer.js` – Modalbreite, Untermenü-Ziel, Scrollposition und Speicherbezeichnung.
- `src/organizer.css` – dynamische Navigation-/Inhaltsbreite und responsive Theme-Studio-Darstellung.
- `src/theme-studio.js` – Anker für Panel-Design; präzisere Speichern-Rückmeldung.
- `test/settings-responsive-layout.test.js` – vier neue gezielte Regressionstests.

## Manuelle Gegenprüfung

1. Einstellungen auf 3440×1440 öffnen; prüfen, ob die Hauptansicht mittig mit ausreichend Breite erscheint.
2. Theme Studio > eDEX-Farben öffnen; beide Spalten dürfen nicht rechts abgeschnitten werden.
3. Renderer-Fenster auf ca. 1000 px und anschließend 800 px Breite verkleinern; Studio muss unterhalb der verfügbaren Inhaltsbreite einspaltig werden.
4. Fenster & Panels öffnen; Panel-Schrift und Rahmenstil müssen sichtbar sein.
5. Alle Hauptkategorien auf-/zuklappen; Wechsel zwischen Untermenüs prüfen.
6. Nach Theme-Änderungen sowohl Studio-Speichern als auch den allgemeinen Settings-Button prüfen; keine stillschweigende gemeinsame Speicherung annehmen.
