# BOCKIS-eDEX – Installer- und Settings-Korrektur

## Basis

Ausgangsstand: `Bockis-eDEX-Installer-Redesign.zip`.

## Einstellungsmenü

- `src/organizer.css`: Eine `display:flex`-Regel hat das HTML-Attribut `hidden` der Untermenüs überschrieben. Jetzt gilt eine explizite Regel für `.settings-navigation-children[hidden]` mit `display:none !important`.
- `src/renderer.js`: Das Aufklappen einer Kategorie wechselt nicht länger ungefragt die aktive Seite. Beim Auswählen eines Untermenüs wird nur dessen Kategorie geöffnet; andere Kategorien schließen sich. Nach dem Löschen einer Suche wird der Zustand passend zur aktiven Seite wiederhergestellt.

## Windhawk-Setup

- `build/tron_bootstrap.cs`: Zwei neue Kontrollkästchen: stille Windhawk-Installation und Start ohne Hauptfenster. Beide Optionen sind nur bei ausgewählter Windhawk-Komponente aktiv; die stille Installation gilt nicht für bereits installierte Versionen.
- `build/installer.nsh`: Bei expliziter Zustimmung und aktivierter stiller Installation verwendet der Installer die für Windhawk 1.7.3 dokumentierten Parameter `/S /STANDARD`. UAC kann weiterhin erscheinen. Ohne diese Option startet das reguläre Setup.
- Beim Abschluss startet der Bootstrapper Windhawk auf Wunsch mit `-tray-only`, sofern die Programmdatei an einem bekannten Installationsort gefunden wird. Er installiert/aktiviert dabei keine Windhawk-Mods.
- NSIS zeigt im stillen Installationsmodus keine PawnIO-Rückfrage mehr.

## Grenzen

- Die Tray-Option startet Windhawk **einmal nach dem Setup** und richtet keinen eDEX-Session-Watcher ein. Die automatische Steuerung von Mods durch Theme Studio bleibt ein späteres Projekt.
- Vorhandene Windhawk-Installationen, die nicht in den unterstützten Standardpfaden liegen, lassen sich nicht in jedem Fall zum Tray-Start auflösen.
- Keine native Windows-Kompilierung bzw. GUI-Laufzeitprüfung in dieser Umgebung möglich. Bitte Bootstrapper und NSIS auf Windows 11 testen.
- Eine stille Installation benötigt weiterhin die ausdrückliche Auswahl und abschließende Bestätigung im Bootstrapper.
