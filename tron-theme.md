# Tron-Theme-Farben (Referenz für die Frontend-Entwicklung)

Quelle: `assets/themes/tron.json` (Standard-Theme von eDEX) sowie die CSS-Variablen und semantischen Fallback-Farben, die das Desktop-UI-Frontend verwendet.

Die Hauptfarbe ist ein kühles Cyan-Weiß (cyan-ice), der Hintergrund ist fast schwarzblau. Die Oberfläche baut ihre Ebenen fast ausschließlich aus „Hauptfarbe + Transparenz“ auf; Rot und Gelb sind Fehlern und Warnungen vorbehalten.

---

## Zentrale Farbpalette

| Token | Hex | RGB | Verwendung |
| --- | --- | --- | --- |
| `primary` | `#aacfd1` | `170, 207, 209` | Text, Rahmen, Symbole, Cursor, Hervorhebungen |
| `black` | `#000000` | `0, 0, 0` | Reines Schwarz, Schatten, Globus-Hintergrund |
| `bg` / `light_black` | `#05080d` | `5, 8, 13` | Seiten- und Panel-Hintergrund, Terminal-Hintergrund |
| `grey` | `#262828` | `38, 40, 40` | Rasterlinien, sekundäre Flächen, Trennlinien |
| `danger` / `red` | `#ff3c3c` | `255, 60, 60` | Fehler, Löschen, gefährliche Aktionen (im Theme-JSON nicht definiert, Frontend-Fallback) |
| `warning` / `yellow` | `#ffd23c` | `255, 210, 60` | Warnungen, offene Aufgaben (im Theme-JSON nicht definiert, Frontend-Fallback) |
| `led` | `#ffffff` | `255, 255, 255` | Leuchtende Uhr-LEDs |

RGB-Komponenten der Hauptfarbe (Originalfelder aus dem Theme-JSON):

```
r: 170
g: 207
b: 209
```

---

## CSS-Variablen (zum direkten Kopieren)

```css
:root {
  --font_main: "United Sans Medium", "Rajdhani", "Segoe UI", sans-serif;
  --font_main_light: "United Sans Light", "Rajdhani", "Segoe UI", sans-serif;
  --font_mono: "Fira Mono", "Share Tech Mono", Consolas, monospace;

  --color_r: 170;
  --color_g: 207;
  --color_b: 209;

  --color_black: #000000;
  --color_light_black: #05080d;
  --color_grey: #262828;
  --color_red: #ff3c3c;
  --color_yellow: #ffd23c;

  --color_primary: rgb(var(--color_r), var(--color_g), var(--color_b));
  --color_primary_hex: #aacfd1;
}
```

Die Hauptfarbe sollte aus den RGB-Komponenten zusammengesetzt werden, damit dieselbe Farbe mit unterschiedlichen Transparenzwerten verwendet werden kann:

```css
color: rgb(var(--color_r), var(--color_g), var(--color_b));
border-color: rgba(var(--color_r), var(--color_g), var(--color_b), 0.45);
background: rgba(var(--color_r), var(--color_g), var(--color_b), 0.18);
```

---

## Semantische Zuordnung (Frontend-Komponenten)

| Bedeutung | Empfohlene Schreibweise | Tatsächlicher Wert |
| --- | --- | --- |
| Seitenhintergrund | `var(--color_light_black)` | `#05080d` |
| Haupttext | `rgb(var(--color_r), var(--color_g), var(--color_b))` | `#aacfd1` |
| Kontrasttext (auf gefüllten Buttons) | `var(--color_light_black)` | `#05080d` |
| Panel-Hintergrund | `var(--color_light_black)` | `#05080d` |
| Sekundärfläche / Raster | `var(--color_grey)` | `#262828` |
| Standardrahmen | `rgba(..., 0.45)` | `rgba(170, 207, 209, 0.45)` |
| Schwacher Rahmen | `rgba(..., 0.28)` | `rgba(170, 207, 209, 0.28)` |
| Starker Rahmen / Fokus | Durchgehende Linie in `rgb(...)` | `#aacfd1` |
| Hover-Hintergrund | `rgba(..., 0.18)` ~ `0.25` | — |
| Auswahl / gedrückt | `rgba(..., 0.30)` | Wie die Terminal-Auswahl |
| Leuchteffekt | `box-shadow: 0 0 0.6rem rgba(..., 0.55)` | — |
| Fehler | `var(--color_red)` | `#ff3c3c` |
| Warnung | `var(--color_yellow)` | `#ffd23c` |

### Häufig verwendete Transparenzstufen

Die Oberfläche verwendet folgende Alpha-Werte (von schwach nach stark):

| Alpha | Verwendung |
| --- | --- |
| `0.04` | Scanlines, sehr dezente Texturen |
| `0.08` | Hexagon- und radiale Hintergründe |
| `0.18` | Hover-Hintergrund, zentraler Lichtschein |
| `0.22` ~ `0.25` | Button-Hover, Füllungen |
| `0.28` | Schwache Rahmen |
| `0.30` | Auswahl, gedrückter Zustand |
| `0.32` ~ `0.35` | Hilfslinien, halbtransparente Flächen |
| `0.45` | Gestrichelte und normale Rahmen |
| `0.55` | Hervorgehobene Rahmen, äußerer Leuchteffekt |

---

## Terminal- und Codebereiche

| Element | Wert |
| --- | --- |
| `foreground` | `#aacfd1` |
| `background` | `#05080d` |
| `cursor` | `#aacfd1` |
| `cursorAccent` | `#aacfd1` |
| `selection` | `rgba(170, 207, 209, 0.3)` |
| `cursorStyle` | `block` |
| `fontFamily` | `Fira Mono` |

---

## Globus- und Markierungsfarben

| Element | Wert |
| --- | --- |
| `base` | `#000000` |
| `marker` | `#aacfd1` |
| `pin` | `#aacfd1` |
| `satellite` | `#aacfd1` |

---

## JS-/CSS-in-JS-Objekt

```js
export const tronTheme = {
  name: "tron",
  colors: {
    r: 170,
    g: 207,
    b: 209,
    primary: "#aacfd1",
    black: "#000000",
    background: "#05080d",
    grey: "#262828",
    danger: "#ff3c3c",
    warning: "#ffd23c",
    led: "#ffffff",
  },
  alpha: {
    texture: 0.04,
    wallpaper: 0.08,
    hover: 0.18,
    fill: 0.22,
    borderWeak: 0.28,
    selection: 0.3,
    border: 0.45,
    glow: 0.55,
  },
  fonts: {
    ui: '"United Sans Medium", "Rajdhani", "Segoe UI", sans-serif',
    uiLight: '"United Sans Light", "Rajdhani", "Segoe UI", sans-serif',
    mono: '"Fira Mono", "Share Tech Mono", Consolas, monospace',
  },
  terminal: {
    fontFamily: "Fira Mono",
    cursorStyle: "block",
    foreground: "#aacfd1",
    background: "#05080d",
    cursor: "#aacfd1",
    cursorAccent: "#aacfd1",
    selection: "rgba(170,207,209,0.3)",
  },
};

export const rgb = (a = 1) =>
  a === 1
    ? `rgb(${tronTheme.colors.r}, ${tronTheme.colors.g}, ${tronTheme.colors.b})`
    : `rgba(${tronTheme.colors.r}, ${tronTheme.colors.g}, ${tronTheme.colors.b}, ${a})`;
```

---

## Tailwind-Zuordnung (optional)

```js
// Ausschnitt aus tailwind.config
theme: {
  extend: {
    colors: {
      tron: {
        DEFAULT: "#aacfd1",
        black: "#000000",
        bg: "#05080d",
        grey: "#262828",
        danger: "#ff3c3c",
        warning: "#ffd23c",
      },
    },
    fontFamily: {
      tron: ['"United Sans Medium"', "Rajdhani", "Segoe UI", "sans-serif"],
      "tron-mono": ['"Fira Mono"', '"Share Tech Mono"', "Consolas", "monospace"],
    },
  },
}
```

Verwendungsbeispiel: `bg-tron-bg text-tron border-tron/45 hover:bg-tron/18`

---

## Gestaltungsregeln

1. **Keine zusätzliche Graustufen-Textfarbe einführen.** Sekundäre Informationen werden durch geringere Transparenz der Hauptfarbe dargestellt, nicht durch neutrales Grau.
2. **Für Flächen nur `#05080d` und `#262828` verwenden.** Reine weiße Flächen und hellgraue Karten vermeiden.
3. **Interaktionszustände über Alpha ändern, nicht über den Farbton.** Hover, Active und Focus verwenden dieselbe RGB-Farbgruppe.
4. **Rot und Gelb nur für Statusanzeigen verwenden**, nicht als Markenfarben.
5. **Schriften:** UI mit Sans (United Sans / Rajdhani), Daten und Pfade mit Mono (Fira Mono / Share Tech Mono).

---

## Quelldateien

- Theme-Definition: `assets/themes/tron.json`
- Standard-CSS des Frontends: `src/organizer.css` mit `:root`
- Anwendung zur Laufzeit: `src/renderer.js` → `applyTheme()`
