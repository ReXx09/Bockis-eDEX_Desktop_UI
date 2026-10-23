# Bockis-eDEX Desktop UI

Ein auf [eDEX-UI](https://github.com/GitSquared/edex-ui) basierendes **Windows-Desktop-UI für mehrere Monitore**.
Es übernimmt die futuristische Terminal- und Hacker-Ästhetik von eDEX (fast schwarzer Hintergrund, Cyan-Weiß-Farben, Raster-Hintergrund und HUD-Container) und macht aus der ursprünglichen Vollbildoberfläche eine dauerhaft über dem Systemdesktop nutzbare Arbeitsoberfläche.

## Projektbeschreibung

Dieses Projekt ist kein Terminal-Emulator wie das originale eDEX, sondern:

1. **Übernimmt die visuelle Sprache und die Panel-Struktur von eDEX**
   Theme-Farben, Schriftarten, Rahmen, Globus, Code-Regen sowie CPU-, Speicher- und Netzwerk-Überwachung stammen aus den eDEX-Themes und den Modul-CSS-Dateien.
2. **Erweitert eDEX zu einer Desktop-UI-Oberfläche**
   Transparente Overlay-Fenster bedecken jeden Monitor, blenden die Windows-Desktopsymbole aus und bieten stattdessen Container für Dateien, Verknüpfungen, Laufwerke und Kalenderfunktionen.
3. **Bietet einen durchgängigen Hacker-Desktop-Stil**
   Dunkler Raster-Hintergrund, kantige Rahmen, Monospace- und Sci-Fi-Schriften sowie halbtransparente Panel-Ebenen erzeugen eine terminalartige Desktop-Atmosphäre.

| eDEX-Grundidee | Umsetzung in diesem Tool |
| --- | --- |
| SYSTEM-Seitenleiste | Container für Uhr, Prozessor, Speicher, Prozesse und Netzwerkverkehr |
| Zentrale TERMINAL-Fläche | Systemdesktop und Pfad-Container mit Datei-Raster oder Listenansicht |
| NETWORK-Seitenleiste | Lokale Laufwerke, Globusansicht, Code-Regen und Taschenrechner |
| FILESYSTEM / KEYBOARD | Schnellsuche, Kalendereinträge, Container-Menüs und Einstellungen |

## Screenshots

Die aktuelle Oberfläche kombiniert Terminal, Systemdesktop, Überwachungs-Panels,
Laufwerke, Datei-Container und Plugin-Module in einer frei anpassbaren
Mehrmonitor-Ansicht.

![Bockis-eDEX Desktop UI](docs/screenshots/Screenshot%20Display-UI.png)

## Hauptfunktionen

- **Mehrmonitor-Unterstützung**: Eigenes Fenster pro Monitor; der **Systemdesktop wird nur auf dem Hauptmonitor angezeigt**; die Rasterdichte wird mit dem Maßstab des Hauptmonitors synchronisiert.
- **Per-Monitor-Layout und Wallpaper**: Layouts, Raster und Wallpaper werden pro Display berücksichtigt; beim Beenden werden Windows-Desktop und Symbolsichtbarkeit wiederhergestellt.
- **Container-System**: Verschieben, Skalieren, Sperren und Hintergrundfarbe ändern; neue Container lassen sich nacheinander hinzufügen und suchen automatisch freie Rasterzellen.
- **Container hinzufügen**: Panels, Desktop-Container und Ordner-Container werden über den zentralen Dialog hinzugefügt, automatisch platziert und im aktuellen Monitor-Layout gespeichert.
- **Panel-Setup**: Jedes Panel kann über das Zahnrad eigene Einstellungen, Hintergrundfarbe und Panel-Icon erhalten.
- **Systemdesktop**: Filter, Tabs, Kontextmenü für „Inhalt aktualisieren“ und „Automatisch sortieren“, schnelle Aktualisierung nach externem Drag-and-drop.
- **Pfad-Container**: Ordner als eigenständige Browserbereiche hinzufügen; neue Ordner werden nach Eingabe eines Namens erstellt.
- **Plugins**: Taschenrechner, Musik-Kassette, Cockpit, CPU-Versorgungspfad, Code-Regen, Kalender und weitere.
- **Erweiterte Datei-Darstellung**: Zentrale Datei-Markierungen über IPC, transparente Datei- und Ordner-Icons sowie Raster- und Listenansichten.
- **Kalendereinträge**: Datum doppelt anklicken, um Einträge zu bearbeiten; Einträge können nach WeChat kopiert werden.
- **Schnellsuche**: Dateinamensuche auf lokalen Laufwerken und in zusätzlichen Stammverzeichnissen.
- **Wetter-Panel**: Ortsbasierte aktuelle Wetterdaten und 4-Tage-Prognose über Open-Meteo, ohne API-Key; der Ort kann direkt im Panel gesucht werden.
- **Theme-Hintergründe**: eDEX-Theme-JSON-Dateien sowie Raster-, Scanline- und weitere Hintergrundstile.
- **Task-Dock**: Angeheftete Windows-Taskleisten-Apps werden dynamisch mit ihren Original-Icons übernommen und können direkt aus dem Dock gestartet werden.
- **Autostart-Panel**: Windows-Autostart-Einträge werden dynamisch aus der Startup-Konfiguration gelesen und mit Name, Quelle, Benutzer und Startbefehl angezeigt.
- **Log-Panel**: Das JSON-Lines-Fehlerprotokoll kann als Panel mit Level-Filtern und automatischer Aktualisierung geöffnet werden.
- **Bootloader und Branding**: Transparenter, komprimierter WebP-Bootscreen sowie ein mehrstufiges Windows-ICO für Anwendung, Installer und Verknüpfungen.
- **Persistente Einstellungen**: Theme-, Layout-, Display-, Dock- und Desktop-Einstellungen werden gespeichert und beim Start wieder geladen.

## Terminal

Das Grid-Terminal verwendet unter Windows eine echte interaktive PowerShell-Sitzung über **ConPTY** (`node-pty`). Die Ausgabe wird mit **xterm.js** gerendert; dadurch funktionieren ANSI-Farben, Cursor, History, Tabulator, Pfeiltasten und interaktive PowerShell-Kommandos korrekt. Jede Terminal-Pane kann separat gestartet, geschlossen und skaliert werden.

Zusätzlich stehen im Terminal-Panel zur Verfügung:

- **FILES**: Kann in jeder einzelnen Pane unabhängig zugeschaltet werden und zeigt den Datei-Browser neben SHELL oder SSH an. Bei SSH wird der entfernte Arbeitsordner über die aktive Sitzung gelesen und navigiert; bei SHELL bleibt der lokale Windows-Dateibaum aktiv.
- **SSH**: Startet eine OpenSSH-Sitzung direkt in der xterm.js-/ConPTY-Pane. Host, Benutzer, Port und optional eine private Schlüsseldatei können beim Verbinden angegeben werden.
- **Bis zu vier parallele Grids**: Jede Pane kann unabhängig als SHELL oder SSH betrieben werden. Das 2×2-Layout zeigt vier Sitzungen gleichzeitig; Sitzungen können über `+` hinzugefügt und einzeln geschlossen werden.

Die Terminal-Ausgabe wird ereignisbasiert an den Renderer übertragen. Die übrigen HUD-Panels liefern ihre Live-Systemdaten unabhängig davon.

SSH-Passwörter und Passphrasen werden nicht von Bockis-eDEX gespeichert. Die
Host-Key-Prüfung und die Datei `known_hosts` werden von der lokalen
OpenSSH-Installation verwaltet. Terminaldaten und Zugangsdaten werden nicht
in das Anwendungslog geschrieben.

### Vertrauensgrenze und Windows-Sicherheit

Das Terminal ist absichtlich eine echte interaktive PowerShell- bzw. CMD-Sitzung und kann beliebige Befehle im Benutzerkontext ausführen. Die Anwendung darf deshalb nur lokale, unveränderte Renderer-Inhalte laden; fremde Webseiten oder untrusted HTML-Dateien gehören nicht in diese Oberfläche.

Dateioperationen werden über den Electron-Main-Prozess ausgeführt. Organizer-Verschiebungen prüfen Root-Grenzen und lehnen symbolische Pfadkomponenten ab. PowerShell-Hilfsskripte werden mit `RemoteSigned` gestartet. Die Anwendung ersetzt keine Windows-Code-Signatur; veröffentlichte Installer sollten vor dem Verteilen signiert und ihre Prüfsumme dokumentiert werden.

## Optionale Rainmeter-Integration

Der TRON-Terminal-Installer enthält optional Rainmeter. Im nativen
Terminalmenü kann die Rainmeter-Installation mit den Pfeiltasten und der
Leertaste aktiviert oder abgewählt werden. Die Hinweise zu den transparenten
Overlay-Fenstern und die enthaltenen Komponenten werden dort vor der Auswahl
angezeigt. Eine separate grafische Seite **Hinweise und Abhängigkeiten** wird
nicht mehr verwendet.

Der Build lädt dafür den offiziellen Rainmeter-Installer herunter und bettet ihn
in das NSIS-Paket ein. Die Skin liegt unter
`%USERPROFILE%\\Documents\\Rainmeter\\Skins\\Bockis-eDEX`. Wird die Option
deaktiviert oder die Anwendung beendet, wird die Skin ausgeblendet. Ohne
installierte Rainmeter-Anwendung bleibt die eDEX-Oberfläche vollständig
funktionsfähig.

Der Build verwendet eine festgelegte Rainmeter-Version und prüft den SHA-256-Hash des Installers. Ein abweichendes oder unvollständiges Artefakt wird nicht in das Paket übernommen.

## Ausführen

```powershell
npm install
npm start
```

## Fehlerprotokoll

Die Anwendung schreibt Aktionen und Fehler als JSON-Zeilen in `%APPDATA%\\Bockis-eDEX Desktop UI\\logs\\edex-ui.log`. Das Log wird bei einer Größe von 5 MB automatisch rotiert. Renderer-Fehler, unbehandelte Promise-Fehler, App-Start und Einstellungsänderungen werden erfasst; Terminal-Eingaben, Befehle und Geheimnisse werden nicht protokolliert.

Das Log kann direkt in der UI geöffnet werden: Im zentralen Menü **Plugin-Panels** öffnen, **Log** hinzufügen und anschließend das Log-Panel anzeigen. Dort stehen die Level-Filter **ALLE**, **ERROR**, **WARN** und **INFO** sowie eine Aktualisieren-Schaltfläche zur Verfügung. Die Datei kann zusätzlich im Windows-Explorer über den oben genannten Pfad geöffnet werden.

Das **Autostart-Panel** wird ebenfalls über **Plugin-Panels** hinzugefügt. Es aktualisiert die Windows-Autostart-Einträge automatisch und kann über die Aktualisieren-Schaltfläche sofort neu geladen werden. Das **Task-Dock** übernimmt angeheftete Windows-Apps automatisch; ein Klick auf ein Icon startet die jeweilige Verknüpfung.

## Windows-Installer erstellen

Für die native ConPTY-Komponente `node-pty` benötigt der Rechner, auf dem der Installer gebaut wird, die **Visual Studio Build Tools** mit der Workload **Desktopentwicklung mit C++**. Diese Werkzeuge werden nicht auf dem Zielrechner benötigt.

```powershell
npm install
npm run rebuild-native
npm run dist
```

`npm run dist` führt den nativen Rebuild über den `predist`-Hook automatisch aus. `xterm.js`, das Fit-Addon und `node-pty` werden in die Electron-App und damit in den NSIS-Installer aufgenommen. Der installierte Endanwender benötigt kein Node.js, npm oder Visual Studio.

Ergebnis: `dist/Bockis-eDEX-Desktop-UI-Setup-<version>.exe` (NSIS-Installer, Installationsverzeichnis kann geändert werden).

Nach der Installation starten die Desktop- und Startmenü-Verknüpfungen über
die TRON-Systemkonsole. Sie spielt beim Start kurze Systemtöne, zeigt den
Bootvorgang an und bleibt geöffnet, solange die eDEX-GUI läuft. Beim Beenden
der GUI schließt sich auch die Konsole. Der direkte Start ist weiterhin über
die installierte EXE möglich.

### TRON-Terminal-Installation

Für eine retroartige Installation kann danach `install-tron.cmd` per Doppelklick
gestartet werden. Das Script findet den neuesten Installer unter `dist\` und
startet anschließend den nativen TRON-Installer mit Administratorrechten.
Dieser zeigt zunächst Hinweise und enthaltene Komponenten an und bietet danach
ein tastaturgesteuertes Menü für Installationspfad und Rainmeter-HUD.
Mit Pfeil hoch/runter wird navigiert, mit der Leertaste wird Rainmeter
aktiviert oder deaktiviert und mit Enter wird bestätigt. Alternativ:

```powershell
.\install-tron.ps1
```

Mit einem expliziten Installer-Pfad kann auch eine Release-Datei außerhalb des
Projekts verwendet werden:

```powershell
.\install-tron.ps1 -InstallerPath "C:\Downloads\Bockis-eDEX-Desktop-UI-Setup-1.2.7.exe"
```

Für einen entpackten Test-Build:

```powershell
npm run dist:dir
```

## Tests

```powershell
npm test
```

## Veröffentlichung

- Repository: https://github.com/ReXx09/Bockis-eDEX_Desktop_UI
- Releases: https://github.com/ReXx09/Bockis-eDEX_Desktop_UI/releases
- Aktueller Release: `v1.2.7`

## Lizenz und Quellen

- Dieses Tool ist eine GPL-3.0-Weiterentwicklung auf Basis von [eDEX Desktop Organizer](https://github.com/bananamax9113/edex-desktop-organizer).
- Die visuelle Gestaltung und Teile der Frontend-Ressourcen stammen aus eDEX-UI: https://github.com/GitSquared/edex-ui
- Themes und Modul-Stile liegen unter `assets` und orientieren sich am originalen eDEX-CSS.
- Ergänzende Informationen zur Farbgestaltung stehen in [`tron-theme.md`](tron-theme.md).
- Vollständige Quellen- und Lizenzhinweise stehen in [`NOTICE.md`](NOTICE.md).
