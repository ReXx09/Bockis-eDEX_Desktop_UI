# BOCKIS Language Engine 2.0 — Migrationsstand

## Architektur

- `src/locales/en.json`: **kanonische Basissprache Englisch**. Jede neue UI-Meldung bekommt einen stabilen Schlüssel.
- `src/locales/de.json`, `zh-Hant.json`: Sprachmodule mit identischem Schlüsselsatz.
- `src/i18n.js`: Engine (`t`, `setLocale`, `translatePage`, `missingKeys`). Bei unbekannter Sprache und bei fehlenden Zielsprachen-Einträgen fällt sie auf Englisch zurück.
- `src/locales/*.js`: automatisch erzeugte Browser-Module (direktes Laden ohne Fetch und ohne Änderungen an Electron CSP).
- `src/locales/legacy-compat.js`: **temporäre Kompatibilitätsschicht** für bisherige sichtbare Textschlüssel und dynamische Regex-Regeln.

## Wartung / neue Sprachen

1. Neue Zeichenkette in **en.json** unter einem stabilen Schlüssel anlegen.
2. Gleichen Schlüssel in jeder bestehenden Sprachdatei übersetzen; `{parameter}` identisch lassen.
3. `npm run i18n:build` und `npm run i18n:check` ausführen.
4. Neues DOM-Element mit `data-i18n="bereich.schluessel"` auszeichnen oder in JavaScript `window.edexI18n.t("bereich.schluessel")` nutzen.
5. Neue Sprache durch neue `locales/xx.json` und generiertes `xx.js` registrieren und in beiden HTML-Entrypoints laden; die Engine erweitert `SUPPORTED` automatisch. Auch die Sprach-Auswahlliste erweitern.

## Bereits migriert

- Navigationskategorien und Untermenüs des Settings Managers verwenden stabile Schlüssel.
- Die Suche, Version/Updates, Theme-Studio-Unterseiten und Kernfunktionen des Theme-Editors haben stabile Schlüssel.
- `en`, `de`, `zh-Hant` enthalten jeweils dieselben **80** Schlüssel.
- Sprachvalidator ist in `pretest` und `predist` eingebunden.
- Alle anderen bestehenden Texte werden **weiterhin über die Legacy-Kompatibilitätsschicht** verarbeitet. Hier sind noch unübersetzte Texte möglich; es ist keine vollständige Migration sämtlicher Panels oder Installer.

## Einschränkungen und Tests

- Die neue Engine ist synchron, damit Einstellungen und Studio ohne Netz und ohne Ladeblinken starten.
- Englisch ist **Fallback**, nicht zwingend die vom Nutzer gewählte Sprache: Gespeicherte Einstellungen (z. B. `de`) bleiben erhalten.
- Der separate Theme-Studio-Window-Entry lädt jetzt ebenfalls die Sprachmodule. Er startet mangels eigener gespeicherter Auswahl mit Englisch; ein gemeinsamer Sprachzustand zwischen Fenstern erfordert zusätzlich eine Electron-IPC-Benachrichtigung.
- Der Inspector meldet fehlende **schlüsselbasierte** Texte; die automatische Erkennung sämtlicher alter Hartcodierungen ist noch nicht vollständig.
- UI-Test unter Windows/Electron, inklusive Sprachwechsel mit geöffneten Dialogen und 3-Monitor-Betrieb, steht aus.
