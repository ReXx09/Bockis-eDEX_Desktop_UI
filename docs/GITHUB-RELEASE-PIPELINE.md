# BOCKIS-eDEX – GitHub Windows Release Pipeline

## Ziel und tatsächlicher Stand

Die neue `.github/workflows/windows-release.yml` baut auf einem GitHub-Windows-Runner einen fertigen **grafischen BOCKIS-Bootstrapper**. Der Nutzer muss kein npm installieren. Ein Tag erzeugt **nur einen GitHub-Release-Entwurf**; er wird nicht ohne menschliche Prüfung veröffentlicht. Ein manueller Actions-Start erstellt ausschließlich ein temporär herunterladbares Workflow-Artefakt.

Die Pipeline wurde als Quellcode erstellt und lokal auf Syntax, Übersetzungsschlüssel, Versionslogik und künstliche Testartefakte geprüft. Ein realer Windows-Build mit C#-Compiler, nativen Electron-Abhängigkeiten, UI und Installationsdialogen kann nur auf einem passenden Windows-Runner bzw. Test-PC validiert werden.

## Vor der ersten Veröffentlichung: verbindliche Aufgaben

1. Das komplette Projekt einschließlich der **fünf lizenzierten Font-Dateien** (`assets/fonts/*.ttf`) ins Repository übernehmen. In den zuletzt übergebenen Quellcode-ZIPs fehlen die Binärdateien; der neue `release:preflight` bricht mit einer konkreten Fehlermeldung ab. Ein unvollständiger Installer darf nicht veröffentlicht werden.
2. In GitHub unter **Actions** die Ausführung von Workflows erlauben und unter **Settings → Actions → General → Workflow permissions** sicherstellen, dass der Release-Job seinen `contents: write`-Token erhalten darf (organisationsweite Regeln können es einschränken).
3. Im Repository eine vollständige `package-lock.json` beibehalten; die Pipeline nutzt reproduzierbar `npm ci`.
4. Im Windows-Build den nativen `node-pty`-Build und .NET-Hardware-Helfer prüfen. `windows-2022`, Node 22 und .NET 8 sind im Workflow festgelegt; je nach verwendeter `node-pty`-Version können zusätzliche Visual-Studio-C++-Voraussetzungen oder Build-Anpassungen nötig sein.
5. Drittanbieter-Lizenzen (Windhawk, Rainmeter, Icons, Fonts, Hardware-Monitor) prüfen. Die bestehenden Prepare-Scripts laden veröffentlichte Versionen mit fixen SHA-256-Werten. Ein Build darf bei falscher Prüfsumme nicht fortgesetzt werden.
6. Release-Installer auf einem echten Windows-11-Testrechner prüfen: Start, Deinstallation, Checkbox-Auswahl, First-Run-Setup, Panels, Sprachen, Multi-Monitor, Windhawk-Ablehnung und Wiederherstellung.
7. Für öffentliches Vertrauen die Code-Signierung einrichten. Die aktuelle Anwendung erzwingt keine Signatur; Windows SmartScreen kann warnen. Die neue Pipeline signiert **nicht** selbstständig. Besonders der nachträglich verpackte C#-Bootstrapper müsste **nach** dem Wrapper-Build signiert werden; die vorhandene Pipeline macht dies nicht.

## Testlauf ohne Veröffentlichung

GitHub → **Actions** → **BOCKIS Windows Installer** → **Run workflow**. Nach erfolgreichem Lauf liegt die EXE als Workflow-Artefakt unter dem Job. Noch kein Release für normale Endnutzer.

## Versions-Release vorbereiten

Die drei Versionsfelder `displayVersion`, `shortVersionWindows`, `build.buildVersion` in `package.json` müssen gleich sein. Dann einen Tag nach Schema `v<displayVersion>` pushen, z.B. `v1.2.7.8` für diese Quelle. Der Preflight blockiert einen falschen Tag.

Nach erfolgreichem Build legt die Pipeline einen **Draft Release** mit folgenden Dateien an:

- `Bockis-eDEX-Desktop-UI-Setup-<version>.exe` – der C#-Bootstrapper mit enthaltenem NSIS-Payload, nicht der rohe NSIS-Installer
- `latest.yml` – aktuell vom Wrapper erzeugte Update-Metadaten; **noch kein Nachweis für einen funktionierenden automatischen Updater**
- `SHA256SUMS.txt` – SHA-256 für EXE und Manifest

Vor dem **Publish release** auf GitHub Release-Notizen ergänzen und den Installer als Nutzer manuell testen. Die Pipeline veröffentlicht niemals automatisch live.

## Technischer Ablauf

1. `release:preflight` prüft Font-Dateien, Versionskonsistenz und Tag.
2. `npm ci` installiert die abhängigen Build-Tools.
3. `npm run i18n:check`, `npm test` müssen bestehen.
4. `npm run dist -- --publish never` führt den vorhandenen `predist`- und `postdist`-Ablauf aus: Assets, native Module, optionale geprüfte Installer, .NET-Helfer, NSIS-Setup und danach den grafischen C#-Bootstrapper.
5. `release:verify` prüft die fertige PE-Datei, deren Größe und die zu ihr passende `latest.yml`.
6. `release:checksums` schreibt Prüfsummen und der Workflow lädt die drei Artefakte hoch.
7. Nur bei einem gepushten Tag legt ein separater Job einen **Entwurf** an.

## Grenzen und bewusst nicht enthalten

- Kein automatischer, unbeaufsichtigter Windows-Update-Installer; die bestehende eDEX-Updateprüfung kann GitHub Releases anzeigen, eine erprobte Selbstaktualisierung braucht weitere Tests.
- Keine automatische Windhawk-Mod-Installation oder Windhawk-Aktivierung durch den GitHub-Build. Die vom Nutzer ausgewählten Optionen im installierten Setup bleiben maßgeblich.
- Windhawk wird im interaktiven Setup nur nach ausdrücklicher Zustimmung installiert; stille Installationen setzen eine bereits vorhandene Windhawk-Installation voraus.
- Keine automatische Freigabe oder Garantie, dass native Tests auf GitHub bestehen: Bei Fehlern gibt es keinen Release-Entwurf.
- GitHub Actions führt Workflows erst aus, nachdem diese Dateien im GitHub-Repository liegen. Das ZIP allein erzeugt noch keinen GitHub-Release.

## Hilfsbefehle

```powershell
npm run release:preflight
npm ci
npm test
npm run dist -- --publish never
npm run release:verify
npm run release:checksums
```
