const fs = require("fs");
const path = require("path");
const { normalizeFeatures, normalizeWindowsOptions } = require("./windows-theme-manager");
const { WALLPAPERS } = require("./themes");
const WALLPAPER_IDS = new Set(WALLPAPERS.map((wallpaper) => wallpaper.id));

const DEFAULTS = {
  locale: "de",
  includeFolders: false,
  snapWidgets: true,
  snapGap: 12,
  theme: "tron",
  windowsThemeFeatures: {
    accentColor: true,
    appsDarkMode: false,
    systemDarkMode: false,
    startTaskbarAccent: true,
    windowTitleAccent: true,
    transparencyEffects: false,
    taskbarAlignment: false,
    taskbarSize: false
  },
  windowsTaskbarAlignment: "center",
  windowsTaskbarSize: "medium",
  wallpaper: "grid",
  displayWallpapers: {},
  desktopSyncAcrossDisplays: true,
  desktopIconPack: "standard",
  desktopCursorPack: "system",
  panelOpacity: 100,
  contrastMode: "standard",
  windowsWallpaper: "",
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
  desktopIconScale: 1,
  desktopFontScale: 1,
  pathIconScale: 1,
  pathFontScale: 1,
  // Shared 2K / 4K layout ruler for every display.
  layoutMode: "2k",
  uiScale: 1,
  // Per-display independent layouts keyed by display.id
  displayLayouts: {},
  // Desktop favorites are shared across display IDs and monitor restarts.
  desktopFavorites: [],
  searchRoots: [],
  searchLocalDrives: true,
  weatherLocation: "Berlin",
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
  taskbarIntegrationEnabled: false,
  taskDockAutoGrow: true,
  taskDockMaxWidth: 90,
  taskDockTileSize: "standard",
  taskDockShowLabels: true,
  dockFrameStyle: "rounded",
  dockPosition: "bottom",
  dockWidth: 720,
  dockHeight: 72,
  // "theme" follows the active theme; otherwise a validated hex color is used.
  dockLabelColor: "theme",
  windowZoneEnabled: true,
  windowZoneMargins: { left: 18, top: 8, right: 18, bottom: 8 },
  windowZoneUnit: "percent",
  connectionProfiles: [],
  cpuRailEffects: {
    flow: true,
    cores: true,
    glow: true,
    waveforms: true,
    scan: true,
    temperature: true,
    hover: true,
    railMeter: true,
    pins: true
  },
  presets: [],
  startupPreset: ""
};

function settingsPath(userData) {
  return path.join(userData, "organizer-settings.json");
}

function loadSettings(userData) {
  const file = settingsPath(userData);
  if (!fs.existsSync(file)) return { ...DEFAULTS, displayLayouts: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const legacyWindowsColorMode = raw.windowsColorMode;
    const windowsThemeFeatures = raw.windowsThemeFeatures === undefined
      ? ["off", "subtle", "strong"].includes(legacyWindowsColorMode)
        ? normalizeFeatures(undefined, legacyWindowsColorMode)
        : DEFAULTS.windowsThemeFeatures
      : normalizeFeatures(raw.windowsThemeFeatures, legacyWindowsColorMode);
    delete raw.hwinfoLogPath;
    delete raw.windowsColorMode;
    return {
      ...DEFAULTS,
      ...raw,
      locale: ["zh-Hant", "de", "en"].includes(String(raw.locale)) ? String(raw.locale) : DEFAULTS.locale,
      windowsThemeFeatures,
      windowsTaskbarAlignment: normalizeWindowsOptions(raw).taskbarAlignment,
      windowsTaskbarSize: normalizeWindowsOptions(raw).taskbarSize,
      wallpaper: normalizeWallpaper(raw.wallpaper),
      displayWallpapers: normalizeDisplayWallpapers(raw.displayWallpapers),
      desktopSyncAcrossDisplays: raw.desktopSyncAcrossDisplays !== false,
      desktopIconPack: normalizeDesktopIconPack(raw.desktopIconPack),
      desktopCursorPack: normalizeDesktopCursorPack(raw.desktopCursorPack),
      panelOpacity: normalizePanelOpacity(raw.panelOpacity),
      contrastMode: raw.contrastMode === "high" ? "high" : "standard",
      keepThemeWallpaper: raw.keepThemeWallpaper === true,
      windowsWallpaper: typeof raw.windowsWallpaper === "string" ? raw.windowsWallpaper.trim() : DEFAULTS.windowsWallpaper,
      rainmeterEnabled: raw.rainmeterEnabled === true,
      startWithWindows: raw.startWithWindows === true,
      displayLayouts: raw.displayLayouts && typeof raw.displayLayouts === "object" ? raw.displayLayouts : {},
      desktopFavorites: Array.isArray(raw.desktopFavorites)
        ? [...new Set(raw.desktopFavorites.map((value) => String(value || "").trim()).filter(Boolean))]
        : [],
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
      desktopIconScale: Number.isFinite(Number(raw.desktopIconScale))
        ? Math.max(0.6, Math.min(2, Number(raw.desktopIconScale)))
        : DEFAULTS.desktopIconScale,
      desktopFontScale: Number.isFinite(Number(raw.desktopFontScale))
        ? Math.max(0.7, Math.min(1.8, Number(raw.desktopFontScale)))
        : DEFAULTS.desktopFontScale,
      searchRoots: Array.isArray(raw.searchRoots) ? raw.searchRoots.filter(Boolean) : [],
      searchLocalDrives: raw.searchLocalDrives !== false,
      weatherLocation: typeof raw.weatherLocation === "string" && raw.weatherLocation.trim()
        ? raw.weatherLocation.trim().slice(0, 128)
        : DEFAULTS.weatherLocation,
      cpuRailEffects: {
        ...DEFAULTS.cpuRailEffects,
        ...(raw.cpuRailEffects && typeof raw.cpuRailEffects === "object" ? Object.fromEntries(
          Object.keys(DEFAULTS.cpuRailEffects).map((key) => [key, raw.cpuRailEffects[key] !== false])
        ) : {})
      },
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
      taskbarIntegrationEnabled: raw.taskbarIntegrationEnabled === true,
      taskDockAutoGrow: raw.taskDockAutoGrow !== false,
      taskDockMaxWidth: Number.isFinite(Number(raw.taskDockMaxWidth))
        ? Math.max(50, Math.min(100, Math.round(Number(raw.taskDockMaxWidth))))
        : DEFAULTS.taskDockMaxWidth,
      taskDockTileSize: ["compact", "standard", "large"].includes(raw.taskDockTileSize)
        ? raw.taskDockTileSize
        : DEFAULTS.taskDockTileSize,
      taskDockShowLabels: raw.taskDockShowLabels !== false,
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
      windowZoneUnit: raw.windowZoneUnit === "raster" ? "raster" : "percent",
      connectionProfiles: normalizeConnectionProfiles(raw.connectionProfiles),
      presets: normalizePresets(raw.presets),
      startupPreset: typeof raw.startupPreset === "string" ? raw.startupPreset.trim().slice(0, 80) : ""
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

function normalizeDisplayWallpapers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([id, wallpaper]) => /^\d{1,20}$/.test(id) && WALLPAPER_IDS.has(String(wallpaper)))
    .map(([id, wallpaper]) => [id, String(wallpaper)]));
}

function normalizeWallpaper(value) {
  return WALLPAPER_IDS.has(value) ? value : DEFAULTS.wallpaper;
}

function normalizeDesktopIconPack(value) {
  return ["standard", "cyan", "mono", "contrast"].includes(value) ? value : "standard";
}

function normalizeDesktopCursorPack(value) {
  return ["system", "precision", "large"].includes(value) ? value : "system";
}

function normalizePanelOpacity(value) {
  return Number.isFinite(Number(value)) ? Math.max(50, Math.min(100, Math.round(Number(value)))) : 100;
}

function normalizeConnectionProfiles(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((profile) => profile && typeof profile === "object" && profile.name)
    .slice(0, 50)
    .map((profile) => ({
      id: String(profile.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      name: String(profile.name).trim().slice(0, 80),
      type: "ssh",
      host: String(profile.host || "").trim().slice(0, 255),
      user: String(profile.user || "").trim().slice(0, 255),
      port: Number.isInteger(Number(profile.port)) ? Math.max(1, Math.min(65535, Number(profile.port))) : 22,
      identityFile: String(profile.identityFile || "").trim().slice(0, 1024),
      target: ""
    }))
    .filter((profile) => profile.host && profile.user);
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
      layout: { ...preset.layout },
      displayLayouts: preset.displayLayouts && typeof preset.displayLayouts === "object"
        ? { ...preset.displayLayouts }
        : undefined
    }))
    .filter((preset) => preset.name);
}

function refreshPresetForSave(settings, presetName, settingsPatch, displayId) {
  const name = String(presetName || "").trim();
  const presets = Array.isArray(settings.presets) ? settings.presets : [];
  if (!name || !presets.some((preset) => preset.name === name)) return presets;

  const displayLayouts = { ...(settings.displayLayouts || {}) };
  const displayKey = String(displayId);
  const selectedPreset = presets.find((preset) => preset.name === name);
  const layout = displayLayouts[displayKey] || selectedPreset.displayLayouts?.[displayKey] || selectedPreset.layout;
  if (layout) displayLayouts[displayKey] = layout;

  const presetSettings = { ...settings, ...settingsPatch };
  delete presetSettings.displayLayouts;
  delete presetSettings.presets;
  delete presetSettings.displayLayout;
  delete presetSettings.displayLayoutPatch;
  delete presetSettings.refreshStartupPreset;

  return presets.map((preset) => preset.name === name
    ? {
      ...preset,
      createdAt: new Date().toISOString(),
      settings: presetSettings,
      layout,
      displayLayouts
    }
    : preset);
}

function saveSettings(userData, next) {
  const current = loadSettings(userData);
  const merged = {
    ...current,
    ...next,
    locale: ["zh-Hant", "de", "en"].includes(String(next.locale ?? current.locale))
      ? String(next.locale ?? current.locale)
      : current.locale,
    windowsThemeFeatures: next.windowsThemeFeatures !== undefined
      ? normalizeFeatures(next.windowsThemeFeatures)
      : current.windowsThemeFeatures,
    windowsTaskbarAlignment: normalizeWindowsOptions(
      next.windowsTaskbarAlignment !== undefined || next.windowsTaskbarSize !== undefined
        ? {
        windowsTaskbarAlignment: next.windowsTaskbarAlignment ?? current.windowsTaskbarAlignment,
        windowsTaskbarSize: next.windowsTaskbarSize ?? current.windowsTaskbarSize
        }
        : current
    ).taskbarAlignment,
    windowsTaskbarSize: normalizeWindowsOptions(
      next.windowsTaskbarAlignment !== undefined || next.windowsTaskbarSize !== undefined
        ? {
          windowsTaskbarAlignment: next.windowsTaskbarAlignment ?? current.windowsTaskbarAlignment,
          windowsTaskbarSize: next.windowsTaskbarSize ?? current.windowsTaskbarSize
        }
        : current
    ).taskbarSize,
    wallpaper: normalizeWallpaper(next.wallpaper ?? current.wallpaper),
    displayWallpapers: next.displayWallpapers !== undefined
      ? normalizeDisplayWallpapers(next.displayWallpapers)
      : current.displayWallpapers,
    desktopSyncAcrossDisplays: next.desktopSyncAcrossDisplays !== undefined
      ? Boolean(next.desktopSyncAcrossDisplays)
      : current.desktopSyncAcrossDisplays,
    desktopIconPack: normalizeDesktopIconPack(next.desktopIconPack ?? current.desktopIconPack),
    desktopCursorPack: normalizeDesktopCursorPack(next.desktopCursorPack ?? current.desktopCursorPack),
    panelOpacity: normalizePanelOpacity(next.panelOpacity ?? current.panelOpacity),
    contrastMode: (next.contrastMode ?? current.contrastMode) === "high" ? "high" : "standard",
    keepThemeWallpaper: next.keepThemeWallpaper !== undefined
      ? Boolean(next.keepThemeWallpaper)
      : current.keepThemeWallpaper,
    windowsWallpaper: typeof (next.windowsWallpaper ?? current.windowsWallpaper) === "string"
      ? String(next.windowsWallpaper ?? current.windowsWallpaper).trim()
      : current.windowsWallpaper,
    rainmeterEnabled: next.rainmeterEnabled !== undefined
      ? Boolean(next.rainmeterEnabled)
      : current.rainmeterEnabled,
    clockScale: Number.isFinite(Number(next.clockScale ?? current.clockScale))
      ? Math.max(0.25, Math.min(2, Number(next.clockScale ?? current.clockScale)))
      : current.clockScale,
    clockShowDate: next.clockShowDate !== undefined ? Boolean(next.clockShowDate) : current.clockShowDate,
    clockDisplayMode: next.clockDisplayMode === undefined
      ? current.clockDisplayMode
      : next.clockDisplayMode === "analog" ? "analog" : "digital",
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
    weatherLocation: typeof (next.weatherLocation ?? current.weatherLocation) === "string"
      && String(next.weatherLocation ?? current.weatherLocation).trim()
      ? String(next.weatherLocation ?? current.weatherLocation).trim().slice(0, 128)
      : current.weatherLocation,
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
    taskbarIntegrationEnabled: next.taskbarIntegrationEnabled !== undefined
      ? Boolean(next.taskbarIntegrationEnabled)
      : current.taskbarIntegrationEnabled,
    taskDockAutoGrow: next.taskDockAutoGrow !== undefined
      ? Boolean(next.taskDockAutoGrow)
      : current.taskDockAutoGrow,
    taskDockMaxWidth: Number.isFinite(Number(next.taskDockMaxWidth ?? current.taskDockMaxWidth))
      ? Math.max(50, Math.min(100, Math.round(Number(next.taskDockMaxWidth ?? current.taskDockMaxWidth))))
      : current.taskDockMaxWidth,
    taskDockTileSize: ["compact", "standard", "large"].includes(next.taskDockTileSize)
      ? next.taskDockTileSize
      : current.taskDockTileSize,
    taskDockShowLabels: next.taskDockShowLabels !== undefined
      ? Boolean(next.taskDockShowLabels)
      : current.taskDockShowLabels,
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
    windowZoneUnit: next.windowZoneUnit === "raster" ? "raster" : (current.windowZoneUnit || "percent"),
    windowZoneMargins: next.windowZoneMargins !== undefined
      ? normalizeWindowZoneMargins(next.windowZoneMargins)
      : current.windowZoneMargins,
    connectionProfiles: next.connectionProfiles !== undefined
      ? normalizeConnectionProfiles(next.connectionProfiles)
      : current.connectionProfiles,
    presets: next.presets !== undefined
      ? normalizePresets(next.presets)
      : current.presets,
    startupPreset: typeof (next.startupPreset ?? current.startupPreset) === "string"
      ? String(next.startupPreset ?? current.startupPreset).trim().slice(0, 80)
      : "",
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
  if (!merged.presets.some((preset) => preset.name === merged.startupPreset)) {
    merged.startupPreset = "";
  }
  delete merged.windowsColorMode;
  fs.writeFileSync(settingsPath(userData), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = { DEFAULTS, loadSettings, refreshPresetForSave, saveSettings };
