# BOCKIS Panel Tour 2.0 – technische Dokumentation

## Funktionen

- Der erste hinzugefügte Panel-Typ zeigt **einmalig vier allgemeine Schritte** (Panel, Skalierzone, Randzone, Setup/Zonenzuweisung) plus die zwei individuellen Schritte des Panel-Typs.
- Bei weiteren neuen Panel-Typen werden **nur die individuellen Schritte** gezeigt.
- Unter **Panel → Setup → Hilfe & Einführung** stehen ein Schalter für automatische Einführungen und zwei Aktionen: **Panel-Funktionen erklären** sowie **Tour mit Zonen-Grundlagen starten**.
- Escape und **Tour überspringen** schließen die Tour ohne Änderung des Panel-Layouts.
- Bisherige `panelTours.seen` und `panelTours.disabled` bleiben gültig; `panelTours.commonSeen` speichert, ob die allgemeinen Grundlagen schon angeboten wurden.
- Die automatische Tour erscheint nur nach erfolgreichem Erstellen und Speichern eines Panels und nicht während der Ersteinrichtung.

## Erweiterungen und Wartung

`src/panel-tour/tours/profiles.json` enthält eigene Schritte für alle 21 platzierbaren Panel-Typen. Jede Beschreibung verwendet Übersetzungsschlüssel, keine harten deutschen Texte. Änderungen an der Manifest-Datei mit `npm run panel-tour:build` in die Browserversion übernehmen. `npm run panel-tour:check` prüft die generierte Datei und die Schlüssel. `npm run i18n:build` generiert die Sprachmodule aus `src/locales/{en,de,zh-Hant}.json`.

**Achtung:** Die Overlay-Hervorhebung bezieht sich aktuell auf das Panel als Ganzes. Die echten geometrischen Grenzen der Skalier- und Randzone und einzelne Panel-Steuerelemente werden noch nicht pixelgenau hervorgehoben. Die Tour erklärt die vorhandenen Panel-Funktionen, ohne Änderungen vorzunehmen oder nicht vorhandene Funktionen zu versprechen.

## Testhinweise

1. Neue Benutzerkonfiguration: erstes Panel hinzufügen → vier Grundlagen + individuelle Schritte.
2. Zweiten Panel-Typ hinzufügen → nur dessen individuelle Schritte.
3. Panel-Setup öffnen, automatische Tour ausschalten; weitere Neuerstellung desselben Typs darf keine automatische Tour auslösen.
4. Beide manuellen Tour-Schaltflächen prüfen; `Esc` und **Tour überspringen** testen.
5. Sprache in Einstellungen ändern und die Tour erneut öffnen (EN, DE, ZH-Hant).
6. Layout auf mehreren Monitoren visuell testen; bei fehlendem Ziel muss die Erklärung ohne Spotlight sichtbar bleiben.

Laufzeitprüfung in Electron/Windows 11 ist zusätzlich erforderlich.
