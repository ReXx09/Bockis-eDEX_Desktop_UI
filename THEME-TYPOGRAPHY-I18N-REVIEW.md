# BOCKIS Theme Typography & Language Review

## Neue Schriftfarben

Die Farben `colors.text`, `colors.heading`, `colors.secondaryText` und `colors.buttonText` sind getrennt speicherbar. Für vorhandene Themes fallen die zusätzlichen Felder bei der Normalisierung auf `colors.text` (und dann die Akzentfarbe) zurück. Rahmen und Diagramme bleiben an der Akzentfarbe. Die Farbkategorien wirken auf unterstützte eDEX-Einstellungen, Navigation und die Theme-Vorschau; nicht alle Spezialmodule und eingebetteten Drittanwendungen übernehmen sie.

## Übersetzungen

`src/i18n.js` enthält zusätzliche Zuordnungen für Deutsch als kanonische Ausgangssprache, Englisch und traditionelles Chinesisch (`zh-Hant`). `版本 / Updates` wurde in `src/renderer.js` durch `Version / Updates` ersetzt. Die Textknoten-Übersetzung hält nun eine kanonische Ursprungsfassung vor, damit der Wechsel Deutsch → Englisch → Chinesisch → Deutsch ohne schrittweise Übersetzungsverluste möglich ist.

## Weitere Vorschläge

- Kontrastwarnung nach WCAG für Haupttext und Hintergrund.
- Individuelle Farbprofile pro Modul statt ausschließlich globale Rollen.
- Vererbungsmodus mit sichtbarem Hinweis „Aus Theme-Akzent übernehmen“.
- Umfassender i18n-Schlüssel-Katalog statt freier HTML-Textübersetzung und automatisierte Übersetzungs-Vollständigkeitsprüfung.
- Regressionstests in einer echten Windows-11-Electron-Laufzeit für UI-Farben und alle drei Sprachen.

## Grenzen

Dies ist eine gezielte Quellcode- und Testüberprüfung, keine vollständige linguistische Qualitätsprüfung aller Zeichenketten und keine visuelle Windows-11-Laufzeitprüfung. Bereits bestehende Module mit eigenen Labels oder Übersetzungsregeln können weiterhin Lücken enthalten.
