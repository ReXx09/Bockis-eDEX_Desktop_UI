const FEATURES = Object.freeze({
  accentColor: Object.freeze({
    label: "Windows-Akzentfarbe",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\DWM", name: "AccentColor", value: "accent" },
      { key: "HKCU\\Software\\Microsoft\\Windows\\DWM", name: "ColorizationColor", value: "accent" },
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent", name: "AccentColorMenu", value: "accent" },
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent", name: "StartColorMenu", value: "accent" }
    ])
  }),
  appsDarkMode: Object.freeze({
    label: "Dunkler Modus für Apps",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "AppsUseLightTheme", value: 0 }
    ])
  }),
  systemDarkMode: Object.freeze({
    label: "Dunkler Windows-Modus",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "SystemUsesLightTheme", value: 0 }
    ])
  }),
  startTaskbarAccent: Object.freeze({
    label: "Akzentfarbe auf Startmenü und Taskleiste",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "ColorPrevalence", value: 1 }
    ])
  }),
  windowTitleAccent: Object.freeze({
    label: "Akzentfarbe auf Fenstertiteln",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\DWM", name: "ColorPrevalence", value: 1 }
    ])
  }),
  transparencyEffects: Object.freeze({
    label: "Windows-Transparenzeffekte",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "EnableTransparency", value: 1 }
    ])
  }),
  taskbarAlignment: Object.freeze({
    label: "Taskleisten-Ausrichtung",
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "TaskbarAl", value: "taskbarAlignment" }
    ])
  }),
  taskbarSize: Object.freeze({
    label: "Taskleisten-Größe",
    experimental: true,
    values: Object.freeze([
      { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "TaskbarSi", value: "taskbarSize" }
    ])
  })
});

function normalizeFeatures(value, legacyMode = "off") {
  const source = value && typeof value === "object" ? value : {};
  const legacyTaskbarAccent = source.taskbarWindowAccent === true;
  const legacy = legacyMode === "strong"
    ? { accentColor: true, startTaskbarAccent: true, windowTitleAccent: true, appsDarkMode: true, systemDarkMode: true }
    : legacyMode === "subtle"
      ? { accentColor: true, startTaskbarAccent: true, windowTitleAccent: true, appsDarkMode: false, systemDarkMode: false }
      : {};
  return Object.fromEntries(
    Object.keys(FEATURES).map((id) => {
      const isAccentSwitch = id === "startTaskbarAccent" || id === "windowTitleAccent";
      const fallback = isAccentSwitch && Object.prototype.hasOwnProperty.call(source, "taskbarWindowAccent")
        ? legacyTaskbarAccent
        : legacy[id] === true;
      return [id, source[id] === undefined ? fallback : source[id] === true];
    })
  );
}

function normalizeTaskbarAlignment(value) {
  return value === "left" ? "left" : "center";
}

function normalizeTaskbarSize(value) {
  return ["small", "medium", "large"].includes(value) ? value : "medium";
}

function normalizeWindowsOptions(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    taskbarAlignment: normalizeTaskbarAlignment(source.windowsTaskbarAlignment),
    taskbarSize: normalizeTaskbarSize(source.windowsTaskbarSize)
  };
}

module.exports = { FEATURES, normalizeFeatures, normalizeWindowsOptions };
