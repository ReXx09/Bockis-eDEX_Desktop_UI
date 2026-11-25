# Bockis-eDEX – Theme Studio: eigenständige Unterseiten

## Ausgangspunkt

Basis: `Bockis-eDEX-Settings-Layout-Fix.zip` (letzte im Gespräch bereitgestellte Projektversion).
Die bisherige Navigation zeigte auf vier Untermenüs denselben eDEX-Editor, weil alle auf `section: "edex"` verwiesen und nur zu Überschriften scrollten.

## Geänderte Dateien

- `src/theme-studio.js`: Zerlegung der vorhandenen Editor-Oberfläche in echte Unterseiten. Die bestehenden DOM-Steuerelemente werden **verschoben, nicht kopiert**, sodass sie denselben Draft und dieselben Handler nutzen. Neue Seiten: `library`, `colors`, `panels`, `preview`, `windows`, `windhawk`. Desktop und Profile bleiben gesonderte Seiten. `selectSection()` wählt die richtige Seite aus. Vorher/Nachher-Vergleich erscheint auf der Vorschauseite. Theme-Draft-Status wird ermittelt und per Event veröffentlicht.
- `src/renderer.js`: Untermenüs rufen die neuen Theme-Studio-Seiten auf; die Suchfunktion behandelt die Studio-Unterseiten unabhängig. Ein Theme-Draft markiert den Theme-Studio-Navigationseintrag und zeigt einen Hinweis im Einstellungsfußbereich.
- `src/organizer.css`: Unternavigation erhält eigenen gedämpften Hintergrund, stärker eingerückte Elemente und eine klar abgesetzte aktive Auswahl. Farbtöne folgen dem aktiven eDEX-Farbprofil.
- `src/theme-studio.css`: Eigenständige Seitenlayouts für Farben, Panel-Einstellungen und große Live-Vorschau, responsiver zweispaltiger Farb-Editor.
- `test/theme-studio.test.js`: Vorherige Sprungmarken-Prüfung durch Tests der Seitenzuordnung und der gemeinsamen Editor-Datenstruktur ersetzt.

## Bedienkonzept

- **Theme-Bibliothek:** Theme-Auswahl, Name, Laden, Neu, Speichern, Löschen (gemeinsame Toolbar), Status des Theme-Drafts.
- **eDEX-Farben:** Akzent-, Panel-, Sekundär-, Hinweis-, Warn- und Terminalfarben.
- **Fenster & Panels:** Panel-Schrift, Rahmenstil, Terminal-Schriftfamilie und Cursor.
- **Live-Vorschau:** HUD-Vorschau, Live-Anwendung, Vorher/Nachher, Zurücksetzen, Aktivierung.
- **Windows-Farbmanager:** Die bestehenden Registry-/Windows-Funktionen und ihr Import.
- **Windows Style Integration:** Die vorhandene optionale Windhawk-Erkennung und Einrichtungslinks.
- **System & Sicherheit → Profile:** Import/Export, Backup, Wiederherstellung und Protokoll.

## Speichern und offene Änderungen

Alle Unterseiten bearbeiten ein gemeinsames `theme`-Objekt und werden ohne erneutes Mounten umgeschaltet. Ein Vergleich mit `originalTheme` erkennt ungespeicherte Theme-Änderungen. Theme-Änderungen werden weiterhin über die **Theme-Studio-Speichern**-Schaltfläche gespeichert; die allgemeinen eDEX-Einstellungen über die Schaltfläche im Einstellungsfußbereich. Beide Speicherwege bleiben getrennt; es wird kein automatischer Schreibvorgang beim Seitenwechsel ausgelöst.

## Teststatus und Grenzen

- JavaScript-Syntaxprüfungen erfolgreich.
- Gezielte Node.js-Tests für Theme Studio und Windows-Theme-Komponenten erfolgreich.
- Electron-Renderer, visuelle Darstellung, Windows-11-Synchronisierung und ein vollständiger Windows-Build wurden in dieser Linux-Umgebung nicht praxisgetestet.
- Die Änderung ergänzt keine neuen systemweiten Windows-Styling-Funktionen; sie trennt vorhandene UI-Funktionen sinnvoll auf.
