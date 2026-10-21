const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  locale: "de",
  includeFolders: false,
  snapWidgets: true,
  snapGap: 12,
  theme: "tron",
  windowsColorMode: "subtle",
  wallpaper: "grid",
  keepThemeWallpaper: false,
  rainmeterEnabled: false,
  startWithWindows: false,
  iconView: "grid",
  gridSize: 32,
  // LED pixel size vs wallpaper grid (1 = one grid cell).
  clockScale: 1,
  // Highlight color for lit LED cells (hex / rgba).
  clockLedColor: "#ffffff",
  // Show YYYY/MM/DD under the time.
  clockShowDate: true,
  clockDisplayMode: "digital",
  clockPanelFrame: false,
  ramGaugeMode: "used",
  // Code-rain glyph size (px) and speed multiplier.
  rainFontSize: 14,
  rainSpeed: 1,
  searchFontSize: 12,
  pathIconScale: 1,
  pathFontScale: 1,
  // Shared 2K / 4K layout ruler for every display.
  layoutMode: "2k",
  uiScale: 1,
  // Per-display independent layouts keyed by display.id
  displayLayouts: {},
  searchRoots: [],
  searchLocalDrives: true,
  migrateFiles: false,
  // Fixed programs that can be opened inside program containers.
  pinnedPrograms: [],
  // Random slow H/V grid-line sweep highlight.
  gridLineSweep: true,
  // Concurrent sweep lines (1–8).
  gridSweepCount: 3,
  // Trail length in grid cells (2–24).
  gridSweepLength: 8,
  // Motion speed multiplier (0.2–3).
  gridSweepSpeed: 1,
  // Bottom dock chrome (primary display).
  dockEnabled: true,
  dockFrameStyle: "rounded",
  dockPosition: "bottom",
  dockWidth: 720,
  dockHeight: 72,
  // "theme" follows the active theme; otherwise a validated hex color is used.
  dockLabelColor: "theme",
  windowZoneEnabled: true,
  windowZoneMargins: { left: 18, top: 8, right: 18, bottom: 8 },
  presets: []
};

function settingsPath(userData) {
  return path.join(userData, "organizer-settings.json");
}

function loadSettings(userData) {
  const file = settingsPath(userData);
  if (!fs.existsSync(file)) return { ...DEFAULTS, displayLayouts: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      ...DEFAULTS,
      ...raw,
      locale: ["zh-Hant", "de", "en"].includes(String(raw.locale)) ? String(raw.locale) : DEFAULTS.locale,
      windowsColorMode: ["off", "subtle", "strong"].includes(String(raw.windowsColorMode))
        ? String(raw.windowsColorMode)
        : DEFAULTS.windowsColorMode,
      keepThemeWallpaper: raw.keepThemeWallpaper === true,
      rainmeterEnabled: raw.rainmeterEnabled === true,
      startWithWindows: raw.startWithWindows === true,
      displayLayouts: raw.displayLayouts && typeof raw.displayLayouts === "object" ? raw.displayLayouts : {},
      uiScale: raw.uiScale === 0.72 ? 1 : (raw.uiScale ?? DEFAULTS.uiScale),
      layoutMode: raw.layoutMode === "4k" ? "4k" : "2k",
      clockScale: Number.isFinite(Number(raw.clockScale))
        ? Math.max(0.25, Math.min(2, Number(raw.clockScale)))
        : DEFAULTS.clockScale,
      clockLedColor: typeof raw.clockLedColor === "string" && raw.clockLedColor
        ? String(raw.clockLedColor).trim()
        : DEFAULTS.clockLedColor,
      clockShowDate: raw.clockShowDate !== false,
      clockDisplayMode: raw.clockDisplayMode === "analog" ? "analog" : DEFAULTS.clockDisplayMode,
      clockPanelFrame: raw.clockPanelFrame === true,
      ramGaugeMode: ["used", "free", "cached", "available", "total"].includes(String(raw.ramGaugeMode))
        ? String(raw.ramGaugeMode)
        : DEFAULTS.ramGaugeMode,
      rainFontSize: Number.isFinite(Number(raw.rainFontSize))
        ? Math.max(8, Math.min(72, Math.round(Number(raw.rainFontSize))))
        : DEFAULTS.rainFontSize,
      rainSpeed: Number.isFinite(Number(raw.rainSpeed))
        ? Math.max(0.1, Math.min(8, Number(raw.rainSpeed)))
        : DEFAULTS.rainSpeed,
      searchFontSize: Number.isFinite(Number(raw.searchFontSize))
        ? Math.max(8, Math.min(72, Math.round(Number(raw.searchFontSize))))
        : DEFAULTS.searchFontSize,
      searchRoots: Array.isArray(raw.searchRoots) ? raw.searchRoots.filter(Boolean) : [],
      searchLocalDrives: raw.searchLocalDrives !== false,
      dockPosition: raw.dockPosition === "top" ? "top" : DEFAULTS.dockPosition,
      dockLabelColor: normalizeDockLabelColor(raw.dockLabelColor),
      migrateFiles: Boolean(raw.migrateFiles),
      pinnedPrograms: Array.isArray(raw.pinnedPrograms)
        ? raw.pinnedPrograms
          .filter((item) => item && item.path)
          .map((item) => ({
            id: String(item.id || `pin${Date.now()}`),
            name: String(item.name || "").trim() || require("path").basename(String(item.path)),
            path: String(item.path)
          }))
        : [],
      gridLineSweep: raw.gridLineSweep !== false,
      gridSweepCount: Number.isFinite(Number(raw.gridSweepCount))
        ? Math.max(1, Math.min(8, Math.round(Number(raw.gridSweepCount))))
        : DEFAULTS.gridSweepCount,
      gridSweepLength: Number.isFinite(Number(raw.gridSweepLength))
        ? Math.max(2, Math.min(24, Math.round(Number(raw.gridSweepLength))))
        : DEFAULTS.gridSweepLength,
      gridSweepSpeed: Number.isFinite(Number(raw.gridSweepSpeed))
        ? Math.max(0.2, Math.min(3, Math.round(Number(raw.gridSweepSpeed) * 20) / 20))
        : DEFAULTS.gridSweepSpeed,
      dockEnabled: raw.dockEnabled !== false,
      dockFrameStyle: ["rounded", "trapezoid", "rect"].includes(String(raw.dockFrameStyle || "").toLowerCase())
        ? String(raw.dockFrameStyle).toLowerCase()
        : DEFAULTS.dockFrameStyle,
      dockWidth: Number.isFinite(Number(raw.dockWidth))
        ? Math.max(200, Math.min(2400, Math.round(Number(raw.dockWidth))))
        : DEFAULTS.dockWidth,
      dockHeight: Number.isFinite(Number(raw.dockHeight))
        ? Math.max(40, Math.min(160, Math.round(Number(raw.dockHeight))))
        : DEFAULTS.dockHeight,
      windowZoneEnabled: raw.windowZoneEnabled !== false,
      windowZoneMargins: normalizeWindowZoneMargins(raw.windowZoneMargins),
      presets: normalizePresets(raw.presets)
    };
  } catch {
    return { ...DEFAULTS, displayLayouts: {} };
  }
}

function normalizeWindowZoneMargins(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    left: clampPercent(source.left, DEFAULTS.windowZoneMargins.left),
    top: clampPercent(source.top, DEFAULTS.windowZoneMargins.top),
    right: clampPercent(source.right, DEFAULTS.windowZoneMargins.right),
    bottom: clampPercent(source.bottom, DEFAULTS.windowZoneMargins.bottom)
  };
}

function clampPercent(value, fallback) {
  return Number.isFinite(Number(value))
    ? Math.max(0, Math.min(45, Math.round(Number(value))))
    : fallback;
}

function normalizeDockLabelColor(value) {
  const color = String(value || "").trim();
  return color === "theme" || /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULTS.dockLabelColor;
}

function normalizePresets(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((preset) => preset && typeof preset === "object" && preset.name && preset.settings && preset.layout)
    .slice(0, 20)
    .map((preset) => ({
      name: String(preset.name).trim().slice(0, 80),
      createdAt: String(preset.createdAt || ""),
      settings: { ...preset.settings },
      layout: { ...preset.layout }
    }))
    .filter((preset) => preset.name);
}

function saveSettings(userData, next) {
  const current = loadSettings(userData);
  const merged = {
    ...current,
    ...next,
    locale: ["zh-Hant", "de", "en"].includes(String(next.locale ?? current.locale))
      ? String(next.locale ?? current.locale)
      : current.locale,
    windowsColorMode: ["off", "subtle", "strong"].includes(String(next.windowsColorMode ?? current.windowsColorMode))
      ? String(next.windowsColorMode ?? current.windowsColorMode)
      : current.windowsColorMode,
    keepThemeWallpaper: next.keepThemeWallpaper !== undefined
      ? Boolean(next.keepThemeWallpaper)
      : current.keepThemeWallpaper,
    rainmeterEnabled: next.rainmeterEnabled !== undefined
      ? Boolean(next.rainmeterEnabled)
      : current.rainmeterEnabled,
    clockScale: Number.isFinite(Number(next.clockScale ?? current.clockScale))
      ? Math.max(0.25, Math.min(2, Number(next.clockScale ?? current.clockScale)))
      : current.clockScale,
    clockShowDate: next.clockShowDate !== undefined ? Boolean(next.clockShowDate) : current.clockShowDate,
    clockDisplayMode: next.clockDisplayMode === "analog" ? "analog" : "digital",
    clockPanelFrame: next.clockPanelFrame !== undefined
      ? Boolean(next.clockPanelFrame)
      : current.clockPanelFrame,
    dockLabelColor: normalizeDockLabelColor(next.dockLabelColor ?? current.dockLabelColor),
    ramGaugeMode: ["used", "free", "cached", "available", "total"].includes(String(next.ramGaugeMode ?? current.ramGaugeMode))
      ? String(next.ramGaugeMode ?? current.ramGaugeMode)
      : current.ramGaugeMode,
    rainFontSize: Number.isFinite(Number(next.rainFontSize ?? current.rainFontSize))
      ? Math.max(8, Math.min(72, Math.round(Number(next.rainFontSize ?? current.rainFontSize))))
      : current.rainFontSize,
    rainSpeed: Number.isFinite(Number(next.rainSpeed ?? current.rainSpeed))
      ? Math.max(0.1, Math.min(8, Number(next.rainSpeed ?? current.rainSpeed)))
      : current.rainSpeed,
    searchFontSize: Number.isFinite(Number(next.searchFontSize ?? current.searchFontSize))
      ? Math.max(8, Math.min(72, Math.round(Number(next.searchFontSize ?? current.searchFontSize))))
      : current.searchFontSize,
    layoutMode: (next.layoutMode ?? current.layoutMode) === "4k" ? "4k" : "2k",
    uiScale: Number.isFinite(Number(next.uiScale ?? current.uiScale))
      && Number(next.uiScale ?? current.uiScale) !== 0.72
      ? Math.max(0.4, Math.min(1.5, Number(next.uiScale ?? current.uiScale)))
      : current.uiScale,
    searchLocalDrives: next.searchLocalDrives !== undefined
      ? Boolean(next.searchLocalDrives)
      : current.searchLocalDrives,
    migrateFiles: next.migrateFiles !== undefined ? Boolean(next.migrateFiles) : current.migrateFiles,
    pinnedPrograms: next.pinnedPrograms !== undefined
      ? (Array.isArray(next.pinnedPrograms) ? next.pinnedPrograms : current.pinnedPrograms)
      : current.pinnedPrograms,
    gridLineSweep: next.gridLineSweep !== undefined
      ? Boolean(next.gridLineSweep)
      : current.gridLineSweep,
    gridSweepCount: Number.isFinite(Number(next.gridSweepCount ?? current.gridSweepCount))
      ? Math.max(1, Math.min(8, Math.round(Number(next.gridSweepCount ?? current.gridSweepCount))))
      : current.gridSweepCount,
    gridSweepLength: Number.isFinite(Number(next.gridSweepLength ?? current.gridSweepLength))
      ? Math.max(2, Math.min(24, Math.round(Number(next.gridSweepLength ?? current.gridSweepLength))))
      : current.gridSweepLength,
    gridSweepSpeed: Number.isFinite(Number(next.gridSweepSpeed ?? current.gridSweepSpeed))
      ? Math.max(0.2, Math.min(3, Math.round(Number(next.gridSweepSpeed ?? current.gridSweepSpeed) * 20) / 20))
      : current.gridSweepSpeed,
    dockEnabled: next.dockEnabled !== undefined ? Boolean(next.dockEnabled) : current.dockEnabled,
    dockFrameStyle: ["rounded", "trapezoid", "rect"].includes(
      String(next.dockFrameStyle ?? current.dockFrameStyle ?? "").toLowerCase()
    )
      ? String(next.dockFrameStyle ?? current.dockFrameStyle).toLowerCase()
      : current.dockFrameStyle,
    dockWidth: Number.isFinite(Number(next.dockWidth ?? current.dockWidth))
      ? Math.max(200, Math.min(2400, Math.round(Number(next.dockWidth ?? current.dockWidth))))
      : current.dockWidth,
    dockHeight: Number.isFinite(Number(next.dockHeight ?? current.dockHeight))
      ? Math.max(40, Math.min(160, Math.round(Number(next.dockHeight ?? current.dockHeight))))
      : current.dockHeight,
    windowZoneEnabled: next.windowZoneEnabled !== undefined
      ? Boolean(next.windowZoneEnabled)
      : current.windowZoneEnabled,
    windowZoneMargins: next.windowZoneMargins !== undefined
      ? normalizeWindowZoneMargins(next.windowZoneMargins)
      : current.windowZoneMargins,
    presets: next.presets !== undefined
      ? normalizePresets(next.presets)
      : current.presets,
    displayLayouts: next.displayLayouts
      ? { ...current.displayLayouts, ...next.displayLayouts }
      : current.displayLayouts
  };
  // Allow full replace of one display layout via displayLayoutPatch
  if (next.displayLayoutPatch) {
    const { displayId, layout } = next.displayLayoutPatch;
    merged.displayLayouts = {
      ...merged.displayLayouts,
      [String(displayId)]: layout
    };
    delete merged.displayLayoutPatch;
  }
  fs.writeFileSync(settingsPath(userData), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = { DEFAULTS, loadSettings, saveSettings };
