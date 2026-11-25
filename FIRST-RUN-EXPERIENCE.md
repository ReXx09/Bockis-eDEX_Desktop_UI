# BOCKIS First Run Experience 1.0

## Implementierung

Der Assistent erscheint auf dem Hauptmonitor bei erstmaliger Anlage eines Benutzerprofils. `lib/settings-store.js` speichert `firstRun` im vorhandenen `organizer-settings.json`. Bestehende Benutzerprofile ohne dieses Feld gelten als bereits eingerichtet, damit Updates die Ersteinrichtung nicht erzwingen. Die Option zum erneuten Öffnen befindet sich in der Einstellungsnavigation.

Die sechs Schritte sind: Willkommen, Sprache (en/de/zh-Hant), erkannte Monitore, Theme-Auswahl, optionale Funktionen sowie Zusammenfassung/Abschluss. Die optionalen Funktionen sind Windows-Autostart, Hinweise nach der Einrichtung und ein *Wunsch* zur späteren Windows-Styling-Einrichtung; Windhawk oder Mods werden nicht installiert oder aktiviert.

Der Abschluss speichert alle gewählten Werte in einem einzigen `save-settings`-Aufruf. Wird die Einrichtung übersprungen, wird nur `firstRun.completed` gespeichert, ohne die Sprach- oder Theme-Auswahl zu ändern. Der Zustand wird nur bei erfolgreichem Speichern als abgeschlossen betrachtet. Nach erfolgreichem Abschluss erscheint auf Wunsch eine vierteilige Kurzeinführung.

## Dateien

- `src/first-run/first-run.js`: Assistent, Schrittsteuerung und kurze Einführung
- `src/first-run/first-run.css`: dunkles eDEX-Design und responsives Dialoglayout
- `src/index.html`: bindet die Module ein
- `src/renderer.js`: Start auf Hauptmonitor nach Initialisierung und erneutes Öffnen in Einstellungen
- `lib/settings-store.js`: sichere Speicherung und Migration bestehender Benutzerprofile
- `src/locales/{en,de,zh-Hant}.json` und generierte `.js`: Sprachschlüssel
- `test/first-run.test.js`: Migration, Zustandsspeicherung, Validierung und Sprachschlüssel

## Noch unter Windows zu prüfen

1. Neue Installation: Assistent auf Hauptmonitor; auf zwei weiteren Monitoren keine doppelten Dialoge.
2. Sprachwechsel in sechs Schritten; bestehende Panels und Untermenüs.
3. Theme-Vorschau und Zurück beim Überspringen; nach Speichern korrekte Aktivierung.
4. Windows-Autostart nach ausdrücklicher Auswahl; gegebenenfalls Windows-Bestätigung.
5. Anzeige und Bedienbarkeit bei DPI-Skalierung, 1920×1080 und 3440×1440.
6. Nach Crash während der Einrichtung wird sie erneut angeboten.

## Grenzen

Hier wurde nur der JavaScript-Code auf Syntax und das Einstellungsmodell mit automatisierten Tests geprüft. Der Electron-Laufzeittest auf Windows 11 und die visuelle Prüfung des Assistenten stehen noch aus. Die Einführung besteht derzeit aus vier aufeinanderfolgenden Hinweiskarten, nicht aus einer visuellen Spotlight-Führung durch einzelne UI-Elemente.
