# eDEX Theme Studio: Unabhängige Schriftfarbe

## Änderung
- **Theme Studio → eDEX-Farben → Schriftfarbe (eDEX-UI)**: eigener Farbwähler mit Hex-Eingabe.
- Speicherung unter `theme.colors.text` als `#RRGGBB`.
- In bestehenden Themes ohne `colors.text` wird weiterhin die Akzentfarbe als Textfarbe verwendet. Original-Themes bleiben unverändert; eigene Themes werden wie bisher gesondert gespeichert.
- Der Renderer stellt `--color_text` sowie `--color_text_r`, `--color_text_g`, `--color_text_b` bereit.
- CSS-Textfarbdeklarationen, die bisher unmittelbar die Akzent-RGB-Werte verwendeten, werden an die Text-RGB-Werte gekoppelt. Linien, Grafiken, Hintergründe, Glows und Rahmen bleiben an der Akzentfarbe.
- Terminal-Textfarbe ist **weiterhin separat** über `terminal.foreground` einstellbar.
- Die Theme-Studio-Vorschau zeigt Textfarbe unabhängig von Akzent- und Rahmenfarbe.

## Grenzen
- Manche Module verwenden feste Sonderfarben oder eigene Textfarben; diese behalten ihre spezialisierten Farben. Nicht jedes einzelne Textele­ment wurde auf die neue globale Textvariable umgestellt.
- Windows-Systemfenster werden von dieser Änderung nicht beeinflusst.
- Ein visueller Windows-/Electron-Laufzeittest ist noch notwendig.
