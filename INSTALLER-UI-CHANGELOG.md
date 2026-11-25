# BOCKIS Installer – grafische Komponentenwahl (Prototyp)

## Änderungen gegenüber 1.2.7.8

- `build/tron_bootstrap.cs`: grafisches WinForms-Fenster im dunklen eDEX-Design, mit Kategorien, Checkboxen, Erklärfeld und Statusübersicht. Abhängige Mod-Einrichtungslinks wählen Windhawk mit aus; bei Windhawk-Abwahl werden sie entfernt. Auswahl von Rainmeter, Verknüpfungen, Start nach Installation und Installationspfad. Übersicht und explizite Bestätigung vor Start. Stiller Modus überspringt optionale Komponenten.
- `build/installer.nsh`: Die bisherige verpflichtende Windhawk-Dialogabfrage wird entfernt. Windhawk wird nur installiert, wenn `EDEX_INSTALL_WINDHAWK=1` und noch keine Installation erkannt wurde. Fehlgeschlagene Windhawk-Installation verhindert nicht mehr die eDEX-Installation. Desktop- und Startmenü-Verknüpfungen beachten die neue Auswahl.
- `scripts/build-tron-installer.js`: zusätzliche Referenzen auf `System.Windows.Forms.dll` und `System.Drawing.dll` beim Kompilieren des Bootstrapper-EXE.

## Installationsablauf

1. Bootstrapper zeigt die Komponentenoberfläche vor der NSIS-Nutzlast.
2. Kerninstallation ist Pflicht; Windhawk, Rainmeter und Verknüpfungen sind wählbar.
3. Der Benutzer sieht einen Zusammenfassungsdialog und bestätigt.
4. Die Auswahl wird über `EDEX_INSTALL_WINDHAWK`, `EDEX_INSTALL_RAINMETER`, `EDEX_CREATE_DESKTOP_SHORTCUT` und `EDEX_CREATE_STARTMENU_SHORTCUT` an den untergeordneten NSIS-Installer übergeben.
5. NSIS installiert nur die ausgewählten Komponenten. Bei Auswahl einer Mod-Einrichtungsseite öffnet der Bootstrapper sie **erst nach erfolgreicher eDEX-Installation**; die Mods werden **nicht** automatisch installiert oder aktiviert.

## Grenzen / offener Testbedarf

- **Windows-Build nicht ausgeführt:** Die CI-/Linux-Umgebung hat keinen Windows-C#-Compiler und kann den grafischen Bootstrapper nicht starten. Vor Veröffentlichung bitte `npm run dist` unter Windows ausführen und Checkboxen, NSIS-Ablauf und Installation testen.
- Die Windows-Style-Mods sind zunächst nur geführte Links, noch keine Windhawk-CLI-Integration. Vor der späteren Implementierung müssen Versionen, unterstützte Schnittstellen, Lizenzen, Konfigurations-Backup und Wiederherstellung geprüft werden.
- Bestehende PawnIO-Hinweise und das Verhalten der automatischen VC++-Laufzeitprüfung wurden in dieser Änderung nicht neu gestaltet.
- Die lokale Windhawk-Erkennung ist best-effort; portable oder ungewöhnliche Installationen können fehlen. NSIS prüft beim eigentlichen Setup erneut.
- Das UI verwendet Windows-Systemschriftarten (Segoe UI/Consolas), keine mitgelieferten Schriftdateien.
