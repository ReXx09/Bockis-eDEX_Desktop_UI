# Bockis-eDEX Desktop UI v1.2.7.5

## Überblick

Der Patchstand 1.2.7.5 ergänzt Live-Hardware-Sensoren über LibreHardwareMonitor
und PawnIO. Der Installer prüft, ob PawnIO vorhanden ist, und bietet bei Bedarf
die offizielle Downloadseite an; der Treiber wird nicht automatisch installiert.

Version 1.2.7 erweitert Bockis-eDEX Desktop UI um eine interaktivere
Arbeitsumgebung, verbesserte Mehrmonitor- und Rasterunterstützung, zusätzliche
Datei- und Terminalfunktionen sowie ein integriertes Theme Studio.

Die Version enthält alle Funktionen aus v1.2.6 und führt diese Änderungen
weiter:

- v1.2.6: Datei-Navigation, Suche, Vorschau, Dateieigenschaften,
  Kontextmenüaktionen und Drag-and-drop.
- v1.2.7: SSH-Terminals, CPU-Rail-Interaktion, Favoriten, Rasterkorrekturen,
  Theme Studio und Updateprüfung.

## Neue Funktionen

### Theme Studio

- Theme Studio direkt in den Einstellungen.
- Dasselbe Studio kann in einem eigenen Fenster geöffnet werden.
- Farbpalette mit Farbwähler und Hex-Eingabefeldern.
- Eigene Themes können erstellt, geladen, gespeichert und gelöscht werden.
- Integrierte Themes bleiben schreibgeschützt.
- Überschriebene oder gelöschte eigene Themes werden automatisch gesichert.
- Live-Vorschau auf den geöffneten eDEX-Monitoren.
- Preview-Reset stellt das aktive Theme wieder her.
- Theme-Aktivierung über den Editor.
- Optionale Windows-11-Synchronisierung:
  - `off`: keine Windows-Änderung
  - `subtle`: Akzentfarbe übernehmen
  - `strong`: Akzentfarbe übernehmen und Dark Mode aktivieren
- Windows-Farbwerte werden vor der ersten Änderung gesichert.

### Version und Updates

- Anzeige der installierten Anwendungsversion in den Einstellungen.
- Updateprüfung über GitHub-Releases.
- Prüfung beim Start.
- Manuelle Prüfung über **Einstellungen → Jetzt prüfen**.
- Periodische Prüfung alle sechs Stunden.
- Benachrichtigung, wenn eine neuere Release-Version verfügbar ist.
- Versionsvergleich mit Schutz gegen ungültige Release-Tags.
- Netzwerkfehler und Zeitüberschreitungen werden sichtbar gemeldet.

Die aktuelle Updatefunktion informiert zunächst nur über verfügbare Releases.
Ein automatischer Download und eine Installation sind nicht aktiviert.

### SSH und Terminal

- OpenSSH-Sitzungen direkt in Terminal-Panes.
- SSH-Modus zusätzlich zum normalen SHELL-Modus.
- Gespeicherte SSH-Profile mit Host, Benutzer, Port und optionaler
  Identitätsdatei.
- Remote-Dateibrowser für SSH-Sitzungen.
- Bis zu vier unabhängig verwaltete Terminal-Panes im 2×2-Raster.
- Geordnete Bereinigung aktiver ConPTY-, PowerShell- und SSH-Sitzungen beim
  Beenden.

### Desktop und Datei-Management

- Ordner, Dateien und Programme können als Favoriten markiert werden.
- Favoritenfilter in der Desktop-Ansicht.
- Favoritenstatus wird pro Display-Layout gespeichert.
- Favoriten funktionieren auch für Programmverknüpfungen und virtuelle
  Programm-Einträge.
- Laufwerke, „Dieser PC“ und Papierkorb bleiben vom Favoritensystem
  ausgeschlossen.
- Verbesserte Tooltips mit Typ, Größe, Änderungsdatum, Kategorie und Pfad.
- Verbesserte Aktivierung von „Dieser PC“ und Papierkorb.
- Zentrale Datei-Tag-Farben werden über IPC an den Renderer geliefert.

## Raster- und Mehrmonitor-Verbesserungen

- Skalierzonen verwenden Rastereinheiten statt Prozentwerte.
- Jeder Einstellungswert entspricht genau einer logischen Rasterzelle.
- Zonenkanten werden auf vollständige Rasterzellen ausgerichtet.
- Rechte und untere Kanten enden zuverlässig auf Rasterlinien.
- Alte Prozentwerte werden beim ersten Start in Rasterwerte migriert.
- Panel-Layouts werden beim Start erneut auf Überschneidungen geprüft.
- Korrigierte Panel-Positionen werden automatisch gespeichert.
- Per-Monitor-Skalierung und Layout-Presets bleiben erhalten.
- Snap-Layout-Berechnung berücksichtigt belegte und angrenzende Rasterzellen.

## CPU-Rail und Systemüberwachung

- Interaktion mit einzelnen CPU-Kernen per Hover und Klick.
- Live-Auslastung pro Kern.
- Lastabhängiges Pulsieren aktiver Kerne.
- CPU-abhängiger Chip-Glow.
- Steuerung von Pause, Geschwindigkeit und Intensität.
- Manueller Refresh.
- Top-Prozesse-Anzeige.
- Temperatur- und Cache-Anzeige, sofern das System entsprechende Werte
  liefert.
- Live-Wellenform und Diagnose-Scanlinie.
- Lichtpunkte entlang der Leiterbahnen.
- Einzelne Effekte können über das Kontextmenü aktiviert oder deaktiviert
  werden.
- CPU-Effekt-Einstellungen werden gespeichert.
- Fehlende Sensorwerte werden neutral als nicht verfügbar angezeigt und nicht
  künstlich simuliert.

## Benutzeroberfläche und Systemintegration

- Verbesserte Menü-Hover-Kontraste im dunklen Theme.
- Verbessertes Boot-Branding mit transparentem WebP-Logo.
- Mehrauflösendes Windows-Anwendungssymbol.
- Anwendungssymbol wird in die gepackte EXE eingebettet.
- Verbesserte Wiederherstellung ausgeblendeter Windows-Desktopsymbole.
- Erkennung und Bereinigung veralteter Zustände ausgeblendeter Symbole.
- Optionale Rainmeter-Konfiguration über Tastatursteuerung.
- GPL-3.0-Lizenzdatei im Repository.
- Laufzeit-Assets sind zentral unter `assets/` organisiert.

## Behobene Probleme

- Panel-Überlappungen nach dem Start mit gespeicherten Layouts.
- Skalierzonen, die beim Wechsel einzelner Werte mehrere Rasterzellen
  übersprangen.
- Skalierzonen, die nicht exakt auf rechten oder unteren Rasterlinien endeten.
- Falsch verkleinerte Weltansicht nach der Umstellung von Prozent- auf
  Rasterwerte.
- Unlesbare Schriftfarbe beim Überfahren bestimmter Menüs.
- Favoritenaktionen, die für Dateien, Ordner und Programmverknüpfungen nicht
  angeboten wurden.
- Live-Theme-Vorschauen, die beim Zurücksetzen das aktive Theme überschreiben
  konnten.

## Speicherung

Eigene Themes werden im Electron-`userData`-Verzeichnis gespeichert:

```text
custom-themes\
custom-themes-backups\
```

Die konkreten Pfade hängen vom Windows-Benutzer und vom Electron-App-Namen ab.
Einstellungen, Layouts, Favoriten und Theme-Änderungen werden weiterhin
persistent gespeichert.

## Bekannte Einschränkungen

- Die Updatefunktion benachrichtigt derzeit nur; Download und Installation
  erfolgen noch nicht automatisch.
- Für Updateprüfungen muss eine GitHub-Release mit einem gültigen Tag wie
  `v1.2.8` vorhanden sein.
- SSH benötigt eine funktionierende lokale Windows-OpenSSH-Installation sowie
  ein funktionierendes natives `node-pty`-Modul.
- SSH-Passwörter und Passphrasen werden nicht von der Anwendung gespeichert.
- Host-Key-Prüfung und `known_hosts` werden durch OpenSSH verwaltet.
- Theme Studio bearbeitet derzeit hauptsächlich die Farbpalette. Zusätzliche
  Theme-Felder wie individuelle Fonts oder Cursor-Einstellungen besitzen noch
  keine eigenen Editoren.
- Windows-Synchronisierung betrifft unterstützte Akzentfarben und den
  Dark-Mode. Windows-Systemdateien werden nicht verändert.
- Rainmeter bleibt optional und ist für die normale eDEX-Oberfläche nicht
  erforderlich.
- Die Systemdesktop-Ansicht wird nur auf dem primären Monitor angezeigt.
- Datei-Vorschauen sind auf unterstützte Dateitypen und Dateien bis 2 MB
  begrenzt.

## Validierung

- JavaScript-Syntaxprüfungen für die geänderten Laufzeitdateien erfolgreich.
- `npm test` erfolgreich:
  - 7 Tests bestanden
  - 0 Tests fehlgeschlagen
- Tests für Theme-Speicherung, Backup-Verhalten, Pfadschutz,
  Farbnormalisierung und Versionsvergleich enthalten.
- `git diff --check` ohne Whitespace-Fehler.
- Windows-x64-NSIS-Build ist für die Version vorgesehen; ein finaler
  Release-Build sollte vor der Veröffentlichung erneut erstellt werden.
