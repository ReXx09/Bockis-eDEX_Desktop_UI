const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const {
  cardToolsHtml,
  closeCardMenus,
  openCardMenu,
  deskIconAt,
  setupDesktopClickThrough,
  itemFromDeskNode
} = window.edexRendererPanels || {};

const FILE_FORMAT_FILTERS = [
  { id: "documents", label: "Dokumente" },
  { id: "images", label: "Bilder" },
  { id: "videos", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "archives", label: "Archive" },
  { id: "apps", label: "Anwendungen" },
  { id: "other", label: "Sonstige" }
];

const DESK_FILTERS = [
  { id: "all", label: "Alle" },
  { id: "folders", label: "Ordner" },
  { id: "icons", label: "Symbole" },
  ...FILE_FORMAT_FILTERS
];

const REMOVED_PANELS = new Set(["sysinfo", "hw", "netstat", "shortcuts"]);

const DEFAULT_WIDGETS_PRIMARY = {
  clock: { x: 1.2, y: 2, w: 16, h: 8 },
  cpu: { x: 1.2, y: 13, w: 16, h: 20 },
  ram: { x: 1.2, y: 34, w: 16, h: 16 },
  toplist: { x: 1.2, y: 51, w: 16, h: 18 },
  globe: { x: 82, y: 2, w: 16.5, h: 48 },
  conninfo: { x: 82, y: 52, w: 16.5, h: 23 },
  calendar: { x: 66, y: 2, w: 15, h: 38 },
  drives: { x: 66, y: 42, w: 15, h: 38 },
  filesearch: { x: 18, y: 82, w: 47, h: 16 },
  dock: { x: 25, y: 94, w: 50, h: 6, locked: true },
  taskdock: { x: 25, y: 86, w: 50, h: 7 }
};

// Plugins only default on primary — secondary starts empty.
const DEFAULT_WIDGETS_SECONDARY = {};

const DEFAULT_DESKTOP_PRIMARY = { x: 18, y: 2, w: 47, h: 78 };
const DEFAULT_DESKTOP_SECONDARY = { x: 8, y: 8, w: 84, h: 84 };

const PANEL_META = {
  clock: { title: "Uhr", box: { x: 1.2, y: 2, w: 16, h: 8 } },
  coderain: { title: "Code-Hintergrund", box: { x: 34, y: 64, w: 16, h: 22 } },
  cpu: { title: "Prozessor", box: { x: 1.2, y: 13, w: 16, h: 20 } },
  ram: { title: "Arbeitsspeicher", box: { x: 1.2, y: 34, w: 16, h: 16 } },
  toplist: { title: "Prozesse", box: { x: 1.2, y: 51, w: 16, h: 18 } },
  globe: { title: "Weltansicht", box: { x: 82, y: 2, w: 16.5, h: 48 } },
  conninfo: { title: "Netzwerkverkehr", box: { x: 82, y: 52, w: 16.5, h: 23 } },
  calendar: { title: "Kalender", icon: "calendar", box: { x: 66, y: 2, w: 15, h: 38 } },
  drives: { title: "Laufwerke", box: { x: 66, y: 42, w: 15, h: 38 } },
  filesearch: { title: "Schnellsuche", box: { x: 18, y: 82, w: 47, h: 16 } },
  terminal: { title: "Terminal", box: { x: 19, y: 42, w: 31, h: 36 } },
  weather: { title: "Wetter", box: { x: 52, y: 42, w: 13, h: 28 } },
  cockpit: { title: "Cockpit", box: { x: 20, y: 22, w: 38, h: 54 } },
  cassette: { title: "Musikkassette", box: { x: 28, y: 28, w: 36, h: 38 } },
  ddj: { title: "DDJ-1000", box: { x: 8, y: 6, w: 84, h: 86 } },
  cpuRail: { title: "CPU-Versorgung", box: { x: 20, y: 28, w: 42, h: 40 } },
  calculator: { title: "Rechner", icon: "calculator", box: { x: 40, y: 18, w: 18, h: 48 } },
  autostart: { title: "Autostart", icon: "processes", box: { x: 20, y: 28, w: 42, h: 36 } },
  log: { title: "Log", box: { x: 52, y: 42, w: 29, h: 38 } },
  dock: { title: "Dock", box: { x: 25, y: 94, w: 50, h: 6 } },
  taskdock: { title: "Task-Panel", box: { x: 25, y: 86, w: 50, h: 7 } }
};

const MACOS_TAGS = [
  { id: "red", label: "紅色", color: "#ff3b30" },
  { id: "orange", label: "橙色", color: "#ff9500" },
  { id: "yellow", label: "黃色", color: "#ffcc00" },
  { id: "green", label: "綠色", color: "#28cd41" },
  { id: "blue", label: "藍色", color: "#007aff" },
  { id: "purple", label: "紫色", color: "#af52de" },
  { id: "gray", label: "灰色", color: "#8e8e93" }
];

const fileStageCtx = new WeakMap();
let terminalGridMode = "1x1";
let terminalNextPane = 1;
const terminalPaneIds = [];
const terminalBuffers = new Map();
const terminalStarted = new Set();
const terminalNativePanes = new Map();
const terminalInstances = new Map();
const terminalCwds = new Map();
const terminalShells = new Map();
const terminalBrowserState = new Map();
const terminalBrowserTimers = new Map();
let terminalBridgeBound = false;
let taskbarDockItems = [];
let taskbarDockLoaded = false;
let taskbarDockLoadPromise = null;
let taskbarDockRetryTimer = null;
let taskbarDockLoadAttempts = 0;

function logUiAction(event, message, details) {
  window.edex?.logAction?.(event, message, details);
}

function bindUiErrorLogging() {
  window.addEventListener("error", (event) => {
    window.edex?.logError?.("renderer.error", event.message || "Unbekannter Renderer-Fehler", {
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.edex?.logError?.("renderer.unhandledrejection", String(event.reason?.message || event.reason || "Unbehandelte Promise-Ablehnung"));
  });
}

const state = {
  bootstrap: null,
  settings: {},
  displays: [],
  displayId: null,
  displayIndex: 0,
  primary: true,
  displayDockEnabled: null,
  displayDockSettings: null,
  bounds: null,
  scaleFactor: 1,
  physicalSize: null,
  themes: [],
  wallpapers: [],
  themeName: "tron",
  theme: null,
  windowsColors: null,
  scan: null,
  plan: null,
  includeFolders: false,
  iconView: "grid",
  busy: false,
  pathCards: [],
  activePathId: null,
  fileClipboard: { paths: [], cut: false },
  layout: { ...DEFAULT_WIDGETS_PRIMARY },
  desktopStage: { ...DEFAULT_DESKTOP_PRIMARY },
  desktopEnabled: true,
  desktopLocked: false,
  desktopFilter: "all",
  desktopGrouped: false,
  desktopTabId: "classify",
  desktopFolderTabs: [],
  iconPositions: {},
  zTop: 10,
  clockTimer: null,
  calCursor: new Date(),
  calSelected: null,
  calNotes: {},
  desktopListing: null,
  cockpitRaf: null,
  cockpitMatrixTimer: null,
  cassetteRaf: null,
  ddjRaf: null,
  ddjResizeObs: null,
  cpuRailRaf: null,
  dockTimer: null,
  dockRaf: null
  ,weatherTimer: null
};

function defaultWidgets() {
  return JSON.parse(JSON.stringify(state.primary ? DEFAULT_WIDGETS_PRIMARY : DEFAULT_WIDGETS_SECONDARY));
}

function defaultDesktop() {
  return { ...(state.primary ? DEFAULT_DESKTOP_PRIMARY : DEFAULT_DESKTOP_SECONDARY) };
}

function panelBody(id) {
  return window.edexRendererPanels.panelBody(id);
}
function bindDesktopIconClicks() {
  if (document.documentElement.dataset.iconClicksBound === "1") return;
  document.documentElement.dataset.iconClicksBound = "1";
  let pairCtrl = false;
  let lastPath = "";
  let lastAt = 0;
  const runActivate = (icon, ctrl) => {
    if (!icon) return;
    holdOverlayHits(500);
    const pathStage = icon.closest(".path-stage");
    const cardId = pathStage?.dataset.pathStage;
    const card = cardId ? state.pathCards.find((item) => item.id === cardId) : null;
    const item = itemFromDeskNode(icon);
    if (card && item?.isDirectory && !ctrl) {
      navigatePathCard(card, item.path, item.name);
      return;
    }
    activateDesktopItem(item, { ctrl });
  };
  // Prefer native detail===2; also accept a timed second click (some overlay builds drop detail).
  document.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    const icon = event.target?.closest?.(".desk-icon[data-path]") || deskIconAt(event.clientX, event.clientY);
    if (!icon) return;
    holdOverlayHits(1500);
    if (event.ctrlKey || event.metaKey) pairCtrl = true;
    const path = icon.dataset.path || "";
    const now = Date.now();
    const timedDbl = now - lastAt < 500 && lastPath === path;
    lastAt = now;
    lastPath = path;
    if (event.detail !== 2 && !timedDbl) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ctrl = event.ctrlKey || event.metaKey || pairCtrl;
    pairCtrl = false;
    runActivate(icon, ctrl);
  }, true);
  document.addEventListener("dblclick", (event) => {
    const icon = event.target?.closest?.(".desk-icon[data-path]") || deskIconAt(event.clientX, event.clientY);
    if (!icon) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runActivate(icon, event.ctrlKey || event.metaKey || pairCtrl);
    pairCtrl = false;
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const selected = document.querySelector(
      "#desktop-stage .desk-icon.selected[data-path], .path-stage .desk-icon.selected[data-path]"
    );
    if (!selected) return;
    event.preventDefault();
    runActivate(selected, event.ctrlKey || event.metaKey);
  }, true);
}

let overlayHoldTimer = 0;
function holdOverlayHits(ms = 800) {
  document.body.classList.add("is-ui-hold");
  window.edex?.setMouseIgnore?.(false);
  clearTimeout(overlayHoldTimer);
  overlayHoldTimer = setTimeout(() => {
    document.body.classList.remove("is-ui-hold");
  }, ms);
}

function activateDesktopItem(item, { ctrl = false } = {}) {
  if (!item?.path && !item?.targetPath) {
    toast("Dieser Eintrag kann nicht geöffnet werden");
    return;
  }
  document.body.classList.remove("is-file-drag-armed", "is-file-dragging");
  window.edex?.setFileDragArmed?.(false);
  window.edex?.cancelFileDragPrepare?.();
  hideFileDragGhost();
  holdOverlayHits(500);
  const folder = resolveFolderForTab(item);
  if (ctrl) {
    if (folder) {
      openFolderInDesktopTab(folder);
      return;
    }
    toast("請對資料夾（或資料夾捷徑）使用 Ctrl+雙擊");
    return;
  }
  const openPath = folder?.path || item.targetPath || item.path;
  if (!openPath) {
    toast("Dieser Eintrag kann nicht geöffnet werden");
    return;
  }
  const title = folder?.name || itemLabel(item) || "項目";
  if (folder) {
    addPathCardAt(openPath, { name: title, promptName: false }).catch((err) => {
      toast(err?.message || "Ordner-Panel konnte nicht geöffnet werden");
    });
    return;
  }
  // Fire-and-forget: no “正在開啟” toast; only report hard failures.
  Promise.resolve(window.edex.openPath(openPath))
    .then((result) => {
      if (result && result.ok === false) {
        toast(result.message || `„${title}“ konnte nicht geöffnet werden`);
      }
    })
    .catch((err) => {
      toast(err?.message || "開啟失敗");
    });
}

async function openInVsCode(target) {
  const value = String(target || "").trim();
  if (!value || !window.edex?.openInVsCode) return;
  try {
    const result = await window.edex.openInVsCode(value);
    if (!result?.ok) toast(result?.message || "VS Code konnte nicht geöffnet werden");
  } catch (err) {
    toast(err?.message || "VS Code konnte nicht geöffnet werden");
  }
}

function toast(message) {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = window.edexI18n?.translateDynamic?.(message) || message;
  document.body.appendChild(el);
  el.style.left = "50%";
  el.style.top = "auto";
  el.style.bottom = "9vh";
  el.style.transform = "translateX(-50%)";
  setTimeout(() => el.remove(), 2400);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function gridSize() {
  const cell = settingsGridSize();
  const fit = layoutFitScale();
  return Math.max(4, Math.round(cell * fit));
}

function settingsGridSize() {
  const raw = Number(state.settings?.gridSize);
  if (!Number.isFinite(raw)) return 32;
  return Math.max(12, Math.min(96, Math.round(raw)));
}

function clockScale() {
  const raw = Number(state.settings?.clockScale);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0.25, Math.min(2, Math.round(raw * 20) / 20));
}

function clockLedColor() {
  return toHex6(state.settings?.clockLedColor || "#ffffff");
}

function clockShowDate() {
  return state.settings?.clockShowDate !== false;
}

function clockDisplayMode() {
  return state.settings?.clockDisplayMode === "analog" ? "analog" : "digital";
}

function analogClockMinimum() {
  const cells = 5;
  return { cells, px: cellsPx(cells) };
}

function clockTimeFormat() {
  const value = String(state.settings?.clockTimeFormat || "24h-seconds");
  return ["24h-seconds", "24h-short", "12h-seconds", "12h-short"].includes(value) ? value : "24h-seconds";
}

function clockDateFormat() {
  const value = String(state.settings?.clockDateFormat || "yy/m/d");
  return ["yy/m/d", "dd/mm/yy", "mm/dd/yy", "dd.mm.yy", "yyyy/mm/dd"].includes(value) ? value : "yy/m/d";
}

function ramGaugeMode() {
  const value = String(state.settings?.ramGaugeMode || "used");
  return ["used", "free", "cached", "available", "total"].includes(value) ? value : "used";
}

async function setRamGaugeMode(mode) {
  const next = ["used", "free", "cached", "available", "total"].includes(mode) ? mode : "used";
  state.settings = { ...state.settings, ramGaugeMode: next };
  document.documentElement.dataset.ramGaugeMode = next;
  const result = await window.edex.saveSettings({ ramGaugeMode: next });
  if (result?.settings) state.settings = result.settings;
}

function wallpaperGridPx() {
  const raw = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--grid-size"));
  if (Number.isFinite(raw) && raw > 4) return raw;
  return gridSize();
}

function searchFontSize() {
  const raw = Number(state.settings?.searchFontSize);
  if (!Number.isFinite(raw)) return 12;
  return Math.max(8, Math.min(72, Math.round(raw)));
}

function rainFontSize() {
  const raw = Number(state.settings?.rainFontSize);
  if (!Number.isFinite(raw)) return 14;
  return Math.max(8, Math.min(72, Math.round(raw)));
}

function rainSpeed() {
  const raw = Number(state.settings?.rainSpeed);
  if (!Number.isFinite(raw)) return 1;
  return Math.max(0.1, Math.min(8, Math.round(raw * 10) / 10));
}

function applyClockMetrics() {
  const cell = Math.max(2, Math.round(gridSize() * clockScale()));
  document.documentElement.style.setProperty("--clock-scale", String(clockScale()));
  document.documentElement.style.setProperty("--clock-cell", `${cell}px`);
  document.documentElement.style.setProperty("--clock-led", clockLedColor());
  const host = document.getElementById("mod_clock_led");
  if (host) host.style.setProperty("--clock-led", clockLedColor());
}

function applyRainMetrics() {
  const font = rainFontSize();
  const speed = rainSpeed();
  document.documentElement.style.setProperty("--rain-font", `${font}px`);
  document.documentElement.style.setProperty("--rain-speed", String(speed));
  window.edexEffects?.setRainOptions?.({
    fontSize: font,
    speed
  });
  const meta = document.getElementById("mod_coderain_meta");
  if (meta) meta.textContent = `${font}PX · ${speed.toFixed(1)}×`;
}

/* 5×7 LED glyphs — lit cells map onto the wallpaper grid. */
const LED_GLYPHS = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ":": ["0", "1", "0", "1", "0"],
  ".": ["0", "0", "0", "0", "1"],
  "/": ["001", "001", "010", "100", "100"],
  "-": ["000", "000", "111", "000", "000"],
  " ": ["0", "0", "0", "0", "0"]
};

const LED_ROWS = 5;

function snapGap() {
  return gridSize();
}

function alignGrid(value) {
  const g = gridSize();
  return Math.round(value / g) * g;
}

function gridCells(px) {
  return Math.max(0, Math.round(px / gridSize()));
}

function cellsPx(count) {
  return Math.max(0, Math.round(count)) * gridSize();
}

function alignGridSpan(size, minCells = 2) {
  const g = gridSize();
  const cells = Math.max(minCells, Math.round(Math.max(0, size) / g));
  return cells * g;
}

function snapExclusiveEdge(px) {
  return Math.round(px / gridSize()) * gridSize();
}

function gridLineOf(exclusiveEdge) {
  return snapExclusiveEdge(exclusiveEdge) - 1;
}

function pxFromBox(box) {
  const g = gridSize();
  if (Number.isFinite(Number(box?.gx)) && Number.isFinite(Number(box?.gw))) {
    return {
      x: cellsPx(box.gx),
      y: cellsPx(box.gy),
      w: cellsPx(Math.max(2, box.gw)),
      h: cellsPx(Math.max(2, box.gh))
    };
  }
  const x = alignGrid(pxFromVw(box?.x || 0));
  const y = alignGrid(pxFromVh(box?.y || 0));
  return {
    x,
    y,
    w: alignGridSpan(pxFromVw(box?.w || 16), 2),
    h: alignGridSpan(pxFromVh(box?.h || 10), 2)
  };
}

function boxToPx(box) {
  return pxFromBox(box);
}

function snapBoxVwVh(box) {
  const px = pxFromBox(box);
  return { ...box, ...pxToGridFields(px.x, px.y, px.w, px.h) };
}

function pxToGridFields(x, y, w, h) {
  const g = gridSize();
  const gx = gridCells(x);
  const gy = gridCells(y);
  const gw = Math.max(2, gridCells(w));
  const gh = Math.max(2, gridCells(h));
  return {
    gx,
    gy,
    gw,
    gh,
    x: vw(gx * g),
    y: vh(gy * g),
    w: vw(gw * g),
    h: vh(gh * g)
  };
}

function applyBoxPx(target, x, y, w, h) {
  Object.assign(target, pxToGridFields(x, y, w, h));
  return target;
}

function rectsTooClose(a, b) {
  const gap = gridSize();
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function otherCardRects(excludeEl) {
  return [...document.querySelectorAll(".hud-card, .path-card, .desktop-card")]
    .filter((el) => el && el !== excludeEl)
    .map((el) => ({
      x: alignGrid(el.offsetLeft),
      y: alignGrid(el.offsetTop),
      w: alignGridSpan(el.offsetWidth, 2),
      h: alignGridSpan(el.offsetHeight, 2)
    }));
}

function overlapsAny(rect, others) {
  return others.some((other) => rectsTooClose(rect, other));
}

function resolveMoveNoOverlap(el, x, y, w, h, fallback) {
  const g = gridSize();
  const ws = workspaceRect();
  const others = otherCardRects(el);
  x = alignGrid(x);
  y = alignGrid(y);
  w = alignGridSpan(w, 2);
  h = alignGridSpan(h, 2);
  const wanted = { x, y, w, h };
  if (!overlapsAny(wanted, others)) return { x, y, w, h };

  const candidates = [];
  if (fallback) candidates.push({ x: alignGrid(fallback.x), y: alignGrid(fallback.y) });
  others.forEach((o) => {
    candidates.push(
      { x: alignGrid(o.x + o.w + g), y: alignGrid(o.y) },
      { x: alignGrid(o.x - w - g), y: alignGrid(o.y) },
      { x: alignGrid(o.x), y: alignGrid(o.y + o.h + g) },
      { x: alignGrid(o.x), y: alignGrid(o.y - h - g) },
      { x: alignGrid(o.x + o.w + g), y },
      { x: alignGrid(o.x - w - g), y },
      { x, y: alignGrid(o.y + o.h + g) },
      { x, y: alignGrid(o.y - h - g) }
    );
  });

  let best = fallback ? { x: alignGrid(fallback.x), y: alignGrid(fallback.y), w, h } : wanted;
  let bestD = Infinity;
  candidates.forEach((c) => {
    if (c.x < 0 || c.y < 0 || c.x + w > ws.width + g || c.y + h > ws.height + g) return;
    const rect = { x: c.x, y: c.y, w, h };
    if (overlapsAny(rect, others)) return;
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = rect;
    }
  });
  if (overlapsAny(best, others) && fallback) {
    return { x: alignGrid(fallback.x), y: alignGrid(fallback.y), w, h };
  }
  return best;
}

function clampResizeNoOverlap(el, left, top, w, h, minW, minH) {
  const g = gridSize();
  w = alignGridSpan(w, gridCells(minW || g * 2));
  h = alignGridSpan(h, gridCells(minH || g * 2));
  const others = otherCardRects(el);
  others.forEach((o) => {
    const hitsX = left < o.x + o.w + g && left + w + g > o.x;
    const hitsY = top < o.y + o.h + g && top + h + g > o.y;
    if (!hitsX || !hitsY) return;
    if (left <= o.x && left + w + g > o.x) {
      w = alignGridSpan(Math.min(w, o.x - g - left), gridCells(minW || g * 2));
    }
    if (top <= o.y && top + h + g > o.y) {
      h = alignGridSpan(Math.min(h, o.y - g - top), gridCells(minH || g * 2));
    }
  });
  while (w > (minW || g * 2) && overlapsAny({ x: left, y: top, w, h }, others)) w -= g;
  while (h > (minH || g * 2) && overlapsAny({ x: left, y: top, w, h }, others)) h -= g;
  return {
    w: Math.max(minW || g * 2, w),
    h: Math.max(minH || g * 2, h)
  };
}

function snapAllLayoutToGrid() {
  Object.keys(state.layout).forEach((id) => {
    state.layout[id] = { ...state.layout[id], ...snapBoxVwVh(state.layout[id]) };
  });
  if (state.desktopStage) {
    state.desktopStage = { ...state.desktopStage, ...snapBoxVwVh(state.desktopStage) };
  }
  state.pathCards.forEach((card) => {
    Object.assign(card, snapBoxVwVh(card));
  });
}

function separateLayoutRects() {
  const g = gridSize();
  const ws = workspaceRect();
  const entries = [];
  Object.keys(state.layout).forEach((id) => {
    if (!state.layout[id] || id === "status" || state.layout[id].minimized) return;
    entries.push({
      px: pxFromBox(state.layout[id]),
      apply: (px) => applyBoxPx(state.layout[id], px.x, px.y, px.w, px.h)
    });
  });
  if (state.desktopEnabled !== false && state.desktopStage && !state.desktopStage.minimized) {
    entries.push({
      px: pxFromBox(state.desktopStage),
      apply: (px) => applyBoxPx(state.desktopStage, px.x, px.y, px.w, px.h)
    });
  }
  state.pathCards.forEach((card) => {
    if (card.minimized) return;
    entries.push({
      px: pxFromBox(card),
      apply: (px) => applyBoxPx(card, px.x, px.y, px.w, px.h)
    });
  });
  entries.forEach((entry, index) => {
    const others = entries.filter((_, i) => i !== index).map((item) => item.px);
    let { x, y, w, h } = entry.px;
    x = alignGrid(x);
    y = alignGrid(y);
    w = alignGridSpan(w, 2);
    h = alignGridSpan(h, 2);
    if (overlapsAny({ x, y, w, h }, others)) {
      let found = false;
      for (let dy = 0; dy < 48 && !found; dy += 1) {
        for (let dx = 0; dx < 48 && !found; dx += 1) {
          const cx = x + dx * g;
          const cy = y + dy * g;
          if (cx < 0 || cy < 0 || cx + w > ws.width || cy + h > ws.height) continue;
          if (!overlapsAny({ x: cx, y: cy, w, h }, others)) {
            x = cx;
            y = cy;
            found = true;
          }
        }
      }
    }
    entry.px = { x, y, w, h };
    entry.apply(entry.px);
  });
}

/** Occupied card rects from layout state (DOM may not exist yet during add). */
function occupiedLayoutRects(exclude = {}) {
  const rects = [];
  Object.keys(state.layout).forEach((id) => {
    if (id === "status" || !state.layout[id]) return;
    if (state.layout[id].minimized) return;
    if (exclude.panelId === id) return;
    rects.push(pxFromBox(state.layout[id]));
  });
  if (state.desktopEnabled !== false && state.desktopStage && !state.desktopStage.minimized && !exclude.desktop) {
    rects.push(pxFromBox(state.desktopStage));
  }
  (state.pathCards || []).forEach((card) => {
    if (card.minimized) return;
    if (exclude.pathId === card.id) return;
    rects.push(pxFromBox(card));
  });
  return rects;
}

/**
 * Place a new card in the first free grid slot (row-major), preferring the
 * suggested box when it does not overlap existing containers/plugins.
 */
function findEmptyBox(preferredBox, exclude = {}) {
  const g = gridSize();
  const ws = workspaceRect();
  const base = snapBoxVwVh({ ...(preferredBox || {}) });
  let { x, y, w, h } = pxFromBox(base);
  w = alignGridSpan(w, 2);
  h = alignGridSpan(h, 2);
  const others = occupiedLayoutRects(exclude);
  const fits = (rect) => (
    rect.x >= 0
    && rect.y >= 0
    && rect.x + rect.w <= ws.width + g
    && rect.y + rect.h <= ws.height + g
    && !overlapsAny(rect, others)
  );
  if (fits({ x, y, w, h })) {
    return snapBoxVwVh({ ...base, ...pxToGridFields(x, y, w, h) });
  }
  const maxDx = Math.max(0, Math.floor(Math.max(0, ws.width - w) / g));
  const maxDy = Math.max(0, Math.floor(Math.max(0, ws.height - h) / g));
  for (let dy = 0; dy <= maxDy; dy += 1) {
    for (let dx = 0; dx <= maxDx; dx += 1) {
      const rect = { x: dx * g, y: dy * g, w, h };
      if (!fits(rect)) continue;
      return snapBoxVwVh({ ...base, ...pxToGridFields(rect.x, rect.y, rect.w, rect.h) });
    }
  }
  // Workspace full — keep preferred snapped position (user can drag later).
  return snapBoxVwVh({ ...base, ...pxToGridFields(x, y, w, h) });
}

function workspaceRect() {
  const ws = document.getElementById("workspace");
  return {
    width: ws?.clientWidth || window.innerWidth,
    height: ws?.clientHeight || Math.floor(window.innerHeight * 0.86)
  };
}

function panelZoneMode(el) {
  const id = el?.dataset?.panelId;
  return id && state.layout[id]?.zone === "edge" ? "edge" : "workspace";
}

function centralZoneRect() {
  const ws = workspaceRect();
  const margins = state.settings.windowZoneMargins || {};
  const left = ws.width * Math.max(0, Math.min(45, Number(margins.left) || 0)) / 100;
  const top = ws.height * Math.max(0, Math.min(45, Number(margins.top) || 0)) / 100;
  const right = ws.width * (1 - Math.max(0, Math.min(45, Number(margins.right) || 0)) / 100);
  const bottom = ws.height * (1 - Math.max(0, Math.min(45, Number(margins.bottom) || 0)) / 100);
  return {
    x: left,
    y: top,
    width: Math.max(40, right - left),
    height: Math.max(40, bottom - top)
  };
}

function panelZoneRect(el) {
  const ws = workspaceRect();
  if (panelZoneMode(el) === "edge" || state.settings.windowZoneEnabled === false) {
    return { x: 0, y: 0, width: ws.width, height: ws.height };
  }
  return centralZoneRect();
}

function constrainPanelPosition(el, x, y, w, h) {
  const ws = workspaceRect();
  if (state.settings.windowZoneEnabled === false) {
    return {
      x: Math.max(0, Math.min(ws.width - w, x)),
      y: Math.max(0, Math.min(ws.height - h, y))
    };
  }
  if (panelZoneMode(el) === "workspace") {
    const zone = centralZoneRect();
    return {
      x: Math.max(zone.x, Math.min(zone.x + zone.width - w, x)),
      y: Math.max(zone.y, Math.min(zone.y + zone.height - h, y))
    };
  }
  const central = centralZoneRect();
  const regions = [
    { x: 0, y: 0, width: central.x, height: ws.height },
    { x: central.x + central.width, y: 0, width: ws.width - central.x - central.width, height: ws.height },
    { x: 0, y: 0, width: ws.width, height: central.y },
    { x: 0, y: central.y + central.height, width: ws.width, height: ws.height - central.y - central.height }
  ];
  const candidates = regions
    .filter((region) => region.width >= w && region.height >= h)
    .map((region) => ({
      x: Math.max(region.x, Math.min(region.x + region.width - w, x)),
      y: Math.max(region.y, Math.min(region.y + region.height - h, y))
    }));
  return candidates.sort(
    (a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2)
  )[0] || { x: 0, y: 0 };
}

function findPanelZonePosition(el) {
  const id = el?.dataset?.panelId;
  if (!id || !state.layout[id]) return null;
  const current = pxFromBox(state.layout[id]);
  const ws = workspaceRect();
  const central = centralZoneRect();
  const regions = panelZoneMode(el) === "edge"
    ? [
      { x: 0, y: 0, width: central.x, height: ws.height },
      { x: central.x + central.width, y: 0, width: ws.width - central.x - central.width, height: ws.height },
      { x: 0, y: 0, width: ws.width, height: central.y },
      { x: 0, y: central.y + central.height, width: ws.width, height: ws.height - central.y }
    ]
    : [central];
  const others = occupiedLayoutRects({ panelId: id });
  const g = gridSize();
  const fitsZone = (x, y) => regions.some((region) => (
    x >= region.x && y >= region.y
    && x + current.w <= region.x + region.width + g
    && y + current.h <= region.y + region.height + g
  ));
  const currentPosition = constrainPanelPosition(el, current.x, current.y, current.w, current.h);
  if (fitsZone(current.x, current.y) && !overlapsAny(current, others)) return current;

  let best = null;
  let bestDistance = Infinity;
  for (const region of regions) {
    if (region.width < current.w || region.height < current.h) continue;
    const maxX = Math.max(region.x, region.x + region.width - current.w);
    const maxY = Math.max(region.y, region.y + region.height - current.h);
    for (let y = alignGrid(region.y); y <= maxY; y += g) {
      for (let x = alignGrid(region.x); x <= maxX; x += g) {
        const candidate = { x, y, w: current.w, h: current.h };
        if (overlapsAny(candidate, others)) continue;
        const distance = (x - currentPosition.x) ** 2 + (y - currentPosition.y) ** 2;
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
    }
  }
  return best;
}

function repositionPanelInZone(el) {
  const id = el?.dataset?.panelId;
  if (!id || !state.layout[id]) return false;
  const current = pxFromBox(state.layout[id]);
  const next = findPanelZonePosition(el);
  if (!next) return false;
  el.style.left = `${next.x}px`;
  el.style.top = `${next.y}px`;
  applyBoxPx(state.layout[id], next.x, next.y, next.w, next.h);
  return next.x !== current.x || next.y !== current.y;
}

function clampPanelToZone(el) {
  const id = el?.dataset?.panelId;
  if (!id || !state.layout[id]) return false;
  return repositionPanelInZone(el);
}

function vw(px) {
  const den = layoutProfile().w * layoutFitScale();
  return den > 0 ? (px / den) * 100 : 0;
}

function vh(px) {
  const den = layoutProfile().h * layoutFitScale();
  return den > 0 ? (px / den) * 100 : 0;
}

function pxFromVw(v) {
  return (v / 100) * layoutProfile().w * layoutFitScale();
}

function pxFromVh(v) {
  return (v / 100) * layoutProfile().h * layoutFitScale();
}

const LAYOUT_PROFILES = {
  "2k": { id: "2k", label: "2K（2560×1440）", w: 2560, h: 1440 },
  "4k": { id: "4k", label: "4K（3840×2160）", w: 3840, h: 2160 }
};

function pageSize() {
  const phys = state.physicalSize;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  return {
    width: Math.max(cssW, phys?.width || 0),
    height: Math.max(cssH, phys?.height || 0)
  };
}

function defaultLayoutMode() {
  const primary = (state.displays || []).find((d) => d.primary) || state.displays?.[0];
  const width = Number(primary?.physicalSize?.width) || pageSize().width;
  const height = Number(primary?.physicalSize?.height) || pageSize().height;
  return (width >= 3200 || height >= 2000) ? "4k" : "2k";
}

function layoutMode() {
  const raw = state.settings?.layoutMode;
  if (raw === "4k" || raw === "2k") return raw;
  return defaultLayoutMode();
}

function layoutProfile() {
  return LAYOUT_PROFILES[layoutMode()];
}

function layoutFitScale() {
  const primary = (state.displays || []).find((d) => d.primary) || state.displays?.[0];
  const pw = Number(primary?.physicalSize?.width);
  const ph = Number(primary?.physicalSize?.height);
  const mine = state.physicalSize;
  const width = Number(mine?.width) || pageSize().width;
  const height = Number(mine?.height) || pageSize().height;
  if (!(pw > 4 && ph > 4 && width > 4 && height > 4)) return 1;
  const short = Math.min(width, height) / Math.min(pw, ph);
  const long = Math.max(width, height) / Math.max(pw, ph);
  const scale = Math.min(short, long);
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  return Math.min(1, scale);
}

function displayUiScale() {
  const raw = Number(state.settings?.uiScale);
  if (raw === 0.72 || !Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(0.4, Math.min(1.5, raw));
}

function applyUiMetrics() {
  const user = displayUiScale();
  const design = layoutProfile();
  const fit = layoutFitScale();
  document.documentElement.style.setProperty("--ui-scale", String(user * fit));
  document.documentElement.style.setProperty("--disp-h", `${design.h}px`);
  document.documentElement.style.setProperty("--disp-w", `${design.w}px`);
  document.documentElement.style.setProperty("--grid-size", `${gridSize()}px`);
  document.documentElement.style.setProperty("--snap-gap", `${gridSize()}px`);
  document.documentElement.style.setProperty("--search-font", `${searchFontSize()}px`);
  applyClockMetrics();
}

function mixThemeColor(base, accent, amount) {
  const baseMatch = String(base || "").replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const accentMatch = String(accent || "").replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!baseMatch || !accentMatch) return base;
  const values = baseMatch.slice(1).map((part, index) => Math.round(
    parseInt(part, 16) * (1 - amount) + parseInt(accentMatch[index + 1], 16) * amount
  ));
  return rgbToHex(...values);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function panelDisplayTitle(id) {
  return state.layout[id]?.title || PANEL_META[id]?.title || id;
}

function applyTheme(theme, wallpaperId) {
  state.theme = theme;
  const c = theme.colors || {};
  const mode = state.settings.windowsColorMode || "subtle";
  const rawAccent = state.windowsColors?.accent || "#00eaff";
  const match = rawAccent.replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  const windowsRgb = match ? match.slice(1).map((part) => parseInt(part, 16)) : [0, 234, 255];
  const blend = mode === "strong" ? 0.55 : mode === "subtle" ? 0.22 : 0;
  const r = Math.round((c.r ?? 170) * (1 - blend) + windowsRgb[0] * blend);
  const g = Math.round((c.g ?? 207) * (1 - blend) + windowsRgb[1] * blend);
  const b = Math.round((c.b ?? 209) * (1 - blend) + windowsRgb[2] * blend);
  document.documentElement.style.setProperty("--color_r", r);
  document.documentElement.style.setProperty("--color_g", g);
  document.documentElement.style.setProperty("--color_b", b);
  document.documentElement.style.setProperty("--color_black", c.black || "#000000");
  document.documentElement.style.setProperty("--color_light_black", mixThemeColor(c.light_black || "#05080d", rawAccent, blend * 0.18));
  document.documentElement.style.setProperty("--color_grey", mixThemeColor(c.grey || "#262828", rawAccent, blend * 0.35));
  document.documentElement.style.setProperty("--color_red", c.red || "#ff3c3c");
  document.documentElement.style.setProperty("--color_yellow", c.yellow || "#ffd23c");
  document.documentElement.style.setProperty("--snap-gap", `${snapGap()}px`);
  applyUiMetrics();
  window.__edexTheme = theme;

  const wp = wallpaperId || state.settings.wallpaper || "grid";
  document.body.className = `desktop-shell wp-${wp}`;
  const windowsThemeSync = window.edex?.applyWindowsTheme?.({
    mode,
    rgb: { r: c.r ?? 170, g: c.g ?? 207, b: c.b ?? 209 }
  });
  windowsThemeSync?.catch?.(() => {});
}

function ledGlyph(ch) {
  return LED_GLYPHS[ch] || LED_GLYPHS[" "];
}

function pushLedCols(rows, count) {
  for (let i = 0; i < count; i += 1) rows.forEach((row) => row.push(0));
}

function buildLedLine(text) {
  const rows = Array.from({ length: LED_ROWS }, () => []);
  [...String(text || "")].forEach((ch, i) => {
    const glyph = ledGlyph(ch);
    const w = glyph[0].length;
    const prev = i ? text[i - 1] : "";
    if (ch === ":" || ch === ".") pushLedCols(rows, 2);
    else if (prev === ":" || prev === ".") pushLedCols(rows, 2);
    else if (i) pushLedCols(rows, 1);
    for (let r = 0; r < LED_ROWS; r += 1) {
      const bits = glyph[r] || "".padEnd(w, "0");
      for (let c = 0; c < w; c += 1) rows[r].push(bits[c] === "1" ? 1 : 0);
    }
  });
  return rows;
}

function buildLedMatrix(lines) {
  const blocks = (lines || []).filter(Boolean).map((line) => buildLedLine(line));
  if (!blocks.length) return [[]];
  const width = Math.max(...blocks.map((block) => block[0].length));
  const pad = (block) => block.map((row) => {
    const next = row.slice();
    while (next.length < width) next.push(0);
    return next;
  });
  const grid = [];
  blocks.forEach((block, i) => {
    if (i) grid.push(Array(width).fill(0));
    grid.push(...pad(block));
  });
  return grid;
}

function parseLedColor(color) {
  const s = String(color || "#ffffff").trim();
  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
  }
  const fill = colorToFill(s) || "rgb(255,255,255)";
  const m = fill.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
  }
  return { r: 255, g: 255, b: 255, css: "rgb(255, 255, 255)" };
}

function toHex6(color) {
  const parsed = parseLedColor(color);
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(parsed.r)}${h(parsed.g)}${h(parsed.b)}`;
}

function wallpaperGridCell() {
  return Math.max(1, Math.round(gridSize()));
}

function alignClockToWallpaperGrid() {
  const card = document.getElementById("card_clock");
  const host = document.getElementById("mod_clock_led");
  if (!card || !host || card.classList.contains("dragging")) return;
  if (!card.classList.contains("clock-bare")) {
    host.style.left = "auto";
    host.style.top = "auto";
    return;
  }
  const g = wallpaperGridCell();
  const scale = Number(state.scaleFactor) || 1;
  const originX = (Number(state.bounds?.x) || 0) * scale;
  const originY = (Number(state.bounds?.y) || 0) * scale;
  const rect = host.getBoundingClientRect();
  const worldX = originX + rect.left;
  const worldY = originY + rect.top;
  const dx = Math.round(worldX / g) * g - worldX;
  const dy = Math.round(worldY / g) * g - worldY;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
    host.style.left = host.style.left || "0px";
    host.style.top = host.style.top || "0px";
    return;
  }
  const left = Number.parseFloat(host.style.left) || 0;
  const top = Number.parseFloat(host.style.top) || 0;
  host.style.left = `${Math.round(left + dx)}px`;
  host.style.top = `${Math.round(top + dy)}px`;
}

function renderClock() {
  const host = document.getElementById("mod_clock_led");
  const analog = document.getElementById("mod_clock_analog");
  const analogDate = document.getElementById("mod_clock_analog_date");
  if (!host || !analog || !analogDate) return;
  applyClockMetrics();
  const now = new Date();
  const isAnalog = clockDisplayMode() === "analog";
  host.hidden = isAnalog;
  analog.hidden = !isAnalog;
  analogDate.hidden = !isAnalog || !clockShowDate();
  if (isAnalog) {
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minute = now.getMinutes() + seconds / 60;
    const hour = (now.getHours() % 12) + minute / 60;
    analog.style.setProperty("--clock-hour-angle", `${hour * 30}deg`);
    analog.style.setProperty("--clock-minute-angle", `${minute * 6}deg`);
    analog.style.setProperty("--clock-second-angle", `${seconds * 6}deg`);
    analogDate.textContent = `${String(now.getFullYear()).slice(-2)}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    return;
  }
  const timeMode = clockTimeFormat();
  const hour24 = now.getHours();
  const hour12 = hour24 % 12 || 12;
  const timeHour = timeMode.startsWith("12h") ? hour12 : hour24;
  const time = `${pad(timeHour)}:${pad(now.getMinutes())}${timeMode.endsWith("seconds") ? `:${pad(now.getSeconds())}` : ""}`;
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const dateFormats = {
    "yy/m/d": `${String(year).slice(-2)}/${Number(month)}/${Number(day)}`,
    "dd/mm/yy": `${day}/${month}/${String(year).slice(-2)}`,
    "mm/dd/yy": `${month}/${day}/${String(year).slice(-2)}`,
    "dd.mm.yy": `${day}.${month}.${String(year).slice(-2)}`,
    "yyyy/mm/dd": `${year}/${month}/${day}`
  };
  const date = dateFormats[clockDateFormat()];
  const matrix = buildLedMatrix(clockShowDate() ? [time, date] : [time]);
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;
  if (!cols) return;

  const cell = Math.max(2, Math.round(wallpaperGridCell() * clockScale()));
  const led = clockLedColor();
  host.style.setProperty("--led-cell", `${cell}px`);
  host.style.setProperty("--clock-led", led);
  host.style.width = `${cols * cell}px`;
  host.style.height = `${rows * cell}px`;
  host.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
  host.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;

  const total = rows * cols;
  const layoutKey = `${cols}x${rows}`;
  if (host.dataset.ledLayout !== layoutKey || host.childElementCount !== total) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i += 1) {
      frag.appendChild(document.createElement("span"));
    }
    host.replaceChildren(frag);
    host.dataset.ledLayout = layoutKey;
  }
  const nodes = host.children;
  let i = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const on = Boolean(matrix[r][c]);
      nodes[i].className = on ? "on" : "";
      if (on) nodes[i].style.setProperty("background-color", led, "important");
      else nodes[i].style.removeProperty("background-color");
      i += 1;
    }
  }
  alignClockToWallpaperGrid();
}

function iconSvg(icon) {
  if (!icon) return "";
  if (icon.dataUrl) {
    const dataUrl = String(icon.dataUrl);
    if (!/^data:image\//i.test(dataUrl)) return "";
    return `<img class="sys-icon" src="${escapeHtml(dataUrl)}" alt="" width="${escapeHtml(icon.width || 32)}" height="${escapeHtml(icon.height || 32)}" draggable="false" />`;
  }
  if (!icon.svg) return "";
  const color = "rgb(var(--color_r), var(--color_g), var(--color_b))";
  return `<svg viewBox="0 0 ${icon.width} ${icon.height}" fill="${color}">${icon.svg}</svg>`;
}

const FILE_BROWSER_ICON_DIR = "assets/file-icons/";
const FILE_BROWSER_ICON_BY_EXTENSION = {
  ".css": "datei_css.png",
  ".exe": "datei_exe.png",
  ".appx": "datei_exe.png",
  ".bat": "datei_exe.png",
  ".cmd": "datei_exe.png",
  ".dll": "datei_exe.png",
  ".7z": "datei_7z.png",
  ".avi": "datei_avi.png",
  ".csv": "datei_csv.png",
  ".doc": "datei_docx.png",
  ".docx": "datei_docx.png",
  ".flac": "datei_flac.png",
  ".gif": "datei_gif.png",
  ".html": "datei_html.png",
  ".htm": "datei_html.png",
  ".iso": "datei_iso.png",
  ".jpg": "datei_jpg.png",
  ".jpeg": "datei_jpg.png",
  ".js": "datei_js.png",
  ".json": "datei_json.png",
  ".lnk": "datei_exe.png",
  ".md": "datei_md.png",
  ".mkv": "datei_mkv.png",
  ".mp3": "datei_mp3.png",
  ".mp4": "datei_mp4.png",
  ".msi": "datei_exe.png",
  ".pdf": "datei_pdf.png",
  ".png": "datei_png.png",
  ".ppt": "datei_pptx.png",
  ".pptx": "datei_pptx.png",
  ".ps1": "datei_exe.png",
  ".rar": "datei_rar.png",
  ".txt": "datei_txt.png",
  ".url": "datei_html.png",
  ".wav": "datei_wav.png",
  ".webp": "datei_webp.png",
  ".xls": "datei_xls.png",
  ".xlsx": "datei_xlsx.png",
  ".zip": "datei_zip.png"
};

function fileBrowserIcon(item) {
  if (!item) return "";
  const name = String(item.displayName || item.name || "").trim();
  const fileName = String(item.name || name).trim();
  const normalized = name.toLocaleLowerCase();
  const normalizedFileName = fileName.toLocaleLowerCase();
  let asset = item.isDirectory ? "ordner.png" : "";
  if (item.isDirectory) {
    if (normalized === "downloads" || normalized === "download") asset = "downloads.png";
    else if (normalized === "home" || normalized === "desktop") asset = "home.png";
    else if (normalized.includes("favorit")) asset = "favoriten.png";
    else if (normalized.includes("papierkorb") || normalized === "recycle.bin") asset = "papierkorb.png";
    else if (normalized.includes("geschützt") || normalized.includes("protected")) asset = "geschuetzt.png";
    else if (normalized.includes("shared") || normalized.includes("freigegeben")) asset = "shared.png";
    else if (normalized.includes("setting") || normalized.includes("einstellung")) asset = "einstellungen.png";
  } else {
    const dot = normalizedFileName.lastIndexOf(".");
    asset = FILE_BROWSER_ICON_BY_EXTENSION[dot >= 0 ? normalizedFileName.slice(dot) : ""] || "datei_txt.png";
  }
  return `<img class="sys-icon file-browser-icon" src="${FILE_BROWSER_ICON_DIR}${asset}" alt="" draggable="false">`;
}

function fileBrowserTreeIcon(name, root = false) {
  return fileBrowserIcon({
    name: name || "",
    isDirectory: true
  }).replace("file-browser-icon", "file-browser-icon file-browser-tree-icon")
    .replace(' alt=""', ` alt="${root ? "Ordner" : "Unterordner"}"`);
}

function itemLabel(item) {
  return item?.displayName || item?.name || "";
}

function currentDisplayLayout() {
  return {
    displayIndex: state.displayIndex,
    dockEnabled: dockEnabled(),
    dockPosition: state.displayDockSettings?.position || state.settings?.dockPosition || "bottom",
    dockWidth: state.displayDockSettings?.width || state.settings?.dockWidth || 720,
    dockHeight: state.displayDockSettings?.height || state.settings?.dockHeight || 72,
    dockFrameStyle: state.displayDockSettings?.frameStyle || state.settings?.dockFrameStyle || "rounded",
    layout: state.layout,
    desktopStage: state.desktopStage,
    desktopEnabled: state.desktopEnabled !== false,
    desktopLocked: Boolean(state.desktopLocked),
    desktopFilter: state.desktopFilter || "all",
    desktopGrouped: Boolean(state.desktopGrouped),
    desktopTabId: state.desktopTabId || "classify",
    desktopFolderTabs: (state.desktopFolderTabs || []).map((tab) => ({
      id: tab.id,
      path: tab.path,
      name: tab.name
    })),
    pathCards: state.pathCards.map((card) => ({
      id: card.id,
      path: card.path,
      name: card.name || "",
      x: card.x,
      y: card.y,
      w: card.w,
      h: card.h,
      treeWidth: Number.isFinite(Number(card.treeWidth)) ? Number(card.treeWidth) : 192,
      gx: card.gx,
      gy: card.gy,
      gw: card.gw,
      gh: card.gh,
      locked: Boolean(card.locked),
      minimized: Boolean(card.minimized),
      fixedDisplayId: Number.isFinite(Number(card.fixedDisplayId)) ? Number(card.fixedDisplayId) : null,
      iconView: card.iconView === "list" ? "list" : "grid",
      bg: card.bg || "",
      activeTabId: card.activeTabId || `${card.id}:root`,
      tabs: ensurePathTabs(card).map((tab) => ({
        id: tab.id,
        path: tab.path,
        name: tab.name || "",
        iconView: tab.iconView === "list" ? "list" : "grid"
      }))
    })),
    desktopBg: state.desktopStage?.bg || "",
    iconPositions: state.iconPositions,
    iconView: state.iconView
  };
}

function persistLayout() {
  return window.edex.saveDisplayLayout(currentDisplayLayout());
}

function clearSnapGuides() {
  const box = document.getElementById("snap-guides");
  if (!box) return;
  box.classList.remove("on");
  box.innerHTML = "";
  const zone = document.getElementById("zone-overlay");
  if (zone) {
    zone.classList.remove("on");
    zone.classList.remove("edge");
  }
}

function showPanelZone(el) {
  const overlay = document.getElementById("zone-overlay");
  if (!overlay) return;
  const edge = panelZoneMode(el) === "edge" && state.settings.windowZoneEnabled !== false;
  const zone = edge ? centralZoneRect() : panelZoneRect(el);
  overlay.classList.toggle("edge", edge);
  overlay.classList.add("on");
  overlay.style.left = `${zone.x}px`;
  overlay.style.top = `${zone.y}px`;
  overlay.style.width = `${zone.width}px`;
  overlay.style.height = `${zone.height}px`;
}

function showWindowZonePreview(settingsModal) {
  const overlay = document.getElementById("zone-overlay");
  const guides = document.getElementById("snap-guides");
  if (!overlay || !guides) return;
  const enabled = Boolean(settingsModal.querySelector("#set-window-zone-enabled")?.checked);
  if (!enabled) {
    overlay.classList.remove("on", "edge", "preview");
    guides.classList.remove("on");
    return;
  }
  const readMargin = (id, fallback) => {
    const value = Number(settingsModal.querySelector(id)?.value);
    return Number.isFinite(value) ? Math.max(0, Math.min(45, value)) : fallback;
  };
  const ws = workspaceRect();
  const left = ws.width * readMargin("#set-zone-left", 18) / 100;
  const top = ws.height * readMargin("#set-zone-top", 8) / 100;
  const right = ws.width * (1 - readMargin("#set-zone-right", 18) / 100);
  const bottom = ws.height * (1 - readMargin("#set-zone-bottom", 8) / 100);
  const zone = {
    x: left,
    y: top,
    width: Math.max(40, right - left),
    height: Math.max(40, bottom - top)
  };
  overlay.classList.remove("edge");
  overlay.classList.add("on", "preview");
  overlay.style.left = `${zone.x}px`;
  overlay.style.top = `${zone.y}px`;
  overlay.style.width = `${zone.width}px`;
  overlay.style.height = `${zone.height}px`;
  guides.classList.add("on");
  const grid = gridSize();
  guides.style.backgroundSize = `${grid}px ${grid}px`;
}

function showSnapGuides(guides) {
  const box = document.getElementById("snap-guides");
  if (!box) return;
  const g = gridSize();
  box.classList.add("on");
  box.style.backgroundSize = `${g}px ${g}px`;
  box.innerHTML = (guides || []).map((item) => {
    const pos = gridLineOf(item.line == null ? item.pos : item.line + 1);
    const cls = `snap-guide ${item.type}${item.ref ? " ref" : ""}${item.match ? " match" : ""}`;
    const label = item.label
      ? `<span class="snap-label">${escapeHtml(item.label)}</span>`
      : "";
    return item.type === "v"
      ? `<div class="${cls}" style="left:${pos}px">${label}</div>`
      : `<div class="${cls}" style="top:${pos}px">${label}</div>`;
  }).join("");
}

function collectSnapTargets(excludeEl) {
  const gap = snapGap();
  const ws = workspaceRect();
  const edgesX = [];
  const edgesY = [];
  document.querySelectorAll(".hud-card, .path-card, .desktop-card").forEach((el) => {
    if (el === excludeEl) return;
    const left = alignGrid(el.offsetLeft);
    const top = alignGrid(el.offsetTop);
    const right = left + alignGridSpan(el.offsetWidth, 2);
    const bottom = top + alignGridSpan(el.offsetHeight, 2);
    edgesX.push({ left, right });
    edgesY.push({ top, bottom });
  });
  return { edgesX, edgesY, gap, ws };
}

function referenceGuides(ws) {
  const midX = snapExclusiveEdge(ws.width / 2);
  const midY = snapExclusiveEdge(ws.height / 2);
  return [
    { type: "v", pos: midX, ref: true, label: "中" },
    { type: "h", pos: midY, ref: true, label: "中" }
  ];
}

function neighborDisplay(direction) {
  const mine = state.displays.find((d) => d.id === state.displayId);
  if (!mine) return null;
  const candidates = state.displays.filter((d) => d.id !== state.displayId);
  if (direction === "left") {
    return candidates
      .filter((d) => d.bounds.x + d.bounds.width <= mine.bounds.x + 48)
      .sort((a, b) => b.bounds.x - a.bounds.x)[0] || null;
  }
  if (direction === "right") {
    return candidates
      .filter((d) => d.bounds.x >= mine.bounds.x + mine.bounds.width - 48)
      .sort((a, b) => a.bounds.x - b.bounds.x)[0] || null;
  }
  if (direction === "up") {
    return candidates
      .filter((d) => d.bounds.y + d.bounds.height <= mine.bounds.y + 48)
      .sort((a, b) => b.bounds.y - a.bounds.y)[0] || null;
  }
  return candidates
    .filter((d) => d.bounds.y >= mine.bounds.y + mine.bounds.height - 48)
    .sort((a, b) => a.bounds.y - b.bounds.y)[0] || null;
}

async function maybeTransferCard(el, x, y, w, h, opts) {
  const g = gridSize();
  const ws = workspaceRect();
  let target = null;
  let placeX = g;
  let placeY = g;
  const outLeft = x <= -g || (opts.clientX != null && opts.clientX < 12);
  const outRight = x + w >= ws.width + g || (opts.clientX != null && opts.clientX > window.innerWidth - 12);
  const outUp = y <= -g || (opts.clientY != null && opts.clientY < 12);
  const outDown = y + h >= ws.height + g || (opts.clientY != null && opts.clientY > window.innerHeight - 12);
  if (outLeft) {
    target = neighborDisplay("left");
    placeX = Math.max(g, alignGrid(ws.width - w - g));
  } else if (outRight) {
    target = neighborDisplay("right");
    placeX = g;
  } else if (outUp) {
    target = neighborDisplay("up");
    placeY = Math.max(g, alignGrid(ws.height - h - g));
  } else if (outDown) {
    target = neighborDisplay("down");
    placeY = g;
  }
  if (!target || !opts.widgetType) return false;
  if (opts.widgetType === "desktop" && !target.primary) {
    toast("系統桌面僅能顯示在主顯示器");
    return false;
  }

  const placed = pxToGridFields(placeX, placeY, w, h);
  const widget = {
    type: opts.widgetType,
    id: opts.widgetId,
    data: opts.widgetData,
    ...placed
  };
  const result = await window.edex.transferWidget(target.id, widget);
  if (result?.ok) {
    opts.onTransferred?.();
    toast(`已移至 ${target.label}`);
    return true;
  }
  if (result?.message) toast(result.message);
  return false;
}

function magneticSnap(el, x, y, w, h, pointer) {
  const { edgesX, edgesY, gap, ws } = collectSnapTargets(el);
  const nearLeft = pointer && pointer.x < 40;
  const nearRight = pointer && pointer.x > window.innerWidth - 40;
  const nearTop = pointer && pointer.y < 40;
  const nearBottom = pointer && pointer.y > window.innerHeight - 40;
  w = alignGridSpan(w, 2);
  h = alignGridSpan(h, 2);
  let nextX = alignGrid(x);
  let nextY = alignGrid(y);
  const guides = [];
  const threshold = gap * 0.55;

  for (const edge of edgesX) {
    const dockRight = edge.right + gap;
    const dockLeft = edge.left - gap - w;
    if (Math.abs(nextX - dockRight) <= threshold) {
      nextX = dockRight;
      guides.push({ type: "v", pos: dockRight });
    } else if (Math.abs(nextX - dockLeft) <= threshold) {
      nextX = dockLeft;
      guides.push({ type: "v", pos: nextX + w });
    }
  }
  for (const edge of edgesY) {
    const dockBelow = edge.bottom + gap;
    const dockAbove = edge.top - gap - h;
    if (Math.abs(nextY - dockBelow) <= threshold) {
      nextY = dockBelow;
      guides.push({ type: "h", pos: dockBelow });
    } else if (Math.abs(nextY - dockAbove) <= threshold) {
      nextY = dockAbove;
      guides.push({ type: "h", pos: nextY + h });
    }
  }

  const constrained = constrainPanelPosition(el, nextX, nextY, w, h);
  nextX = constrained.x;
  nextY = constrained.y;
  nextX = alignGrid(nextX);
  nextY = alignGrid(nextY);
  if (!(nearLeft || nearRight || nearTop || nearBottom)) {
    const resolved = resolveMoveNoOverlap(el, nextX, nextY, w, h, {
      x: el.offsetLeft,
      y: el.offsetTop
    });
    nextX = resolved.x;
    nextY = resolved.y;
    const reclamped = constrainPanelPosition(el, nextX, nextY, w, h);
    nextX = alignGrid(reclamped.x);
    nextY = alignGrid(reclamped.y);
  }
  guides.push(
    { type: "v", pos: nextX, match: true },
    { type: "v", pos: nextX + w, match: true },
    { type: "h", pos: nextY, match: true },
    { type: "h", pos: nextY + h, match: true }
  );
  return { x: nextX, y: nextY, guides: [...referenceGuides(ws), ...guides] };
}

function gridMinSize(px) {
  const g = gridSize();
  return Math.max(g * 2, alignGridSpan(px, 2));
}

function magneticResize(el, w, h, left, top, minWPx, minHPx) {
  const { edgesX, edgesY, gap, ws } = collectSnapTargets(el);
  const zone = panelZoneRect(el);
  const g = gridSize();
  const threshold = g * 0.55;
  const minW = gridMinSize(minWPx || g * 2);
  const minH = gridMinSize(minHPx || g * 2);
  let right = left + w;
  let bottom = top + h;
  const guides = [...referenceGuides(ws)];

  for (const edge of edgesX) {
    const dockToLeft = edge.left - gap;
    if (Math.abs(right - dockToLeft) <= threshold) {
      right = dockToLeft;
      guides.push({ type: "v", pos: dockToLeft, match: true });
    }
  }
  for (const edge of edgesY) {
    const dockAbove = edge.top - gap;
    if (Math.abs(bottom - dockAbove) <= threshold) {
      bottom = dockAbove;
      guides.push({ type: "h", pos: dockAbove, match: true });
    }
  }

  right = snapExclusiveEdge(right);
  bottom = snapExclusiveEdge(bottom);
  let nextW = Math.max(minW, right - left);
  let nextH = Math.max(minH, bottom - top);
  nextW = alignGridSpan(nextW, gridCells(minW));
  nextH = alignGridSpan(nextH, gridCells(minH));
  const maxW = alignGridSpan(Math.max(minW, snapExclusiveEdge(zone.x + zone.width) - left), gridCells(minW));
  const maxH = alignGridSpan(Math.max(minH, snapExclusiveEdge(zone.y + zone.height) - top), gridCells(minH));
  nextW = Math.min(maxW, nextW);
  nextH = Math.min(maxH, nextH);
  const clamped = clampResizeNoOverlap(el, left, top, nextW, nextH, minW, minH);
  nextW = clamped.w;
  nextH = clamped.h;
  guides.push({ type: "v", pos: left + nextW, match: true });
  guides.push({ type: "h", pos: top + nextH, match: true });
  return { w: nextW, h: nextH, guides };
}

function isCardLocked(el) {
  return el?.classList.contains("locked");
}

function makeInteractive(el, opts) {
  const handle = el.classList.contains("clock-bare") ? el : (el.querySelector(".card-title") || el);
  const resize = el.querySelector(".resize-handle");

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest(
      "button, .resize-handle, .view-toggle, .card-tools, .card-tool, input, " +
      ".cockpit-root, .cockpit-knob, .cockpit-pad-btn, .cockpit-fader, .cockpit-radar-wrap, .cockpit-sector, " +
      "#mod_ddj, .ddj-jog, .ddj-knob, .ddj-tempo, .ddj-ch-fader, .ddj-h-fader, .ddj-xfader, .ddj-pad, .ddj-round, .ddj-chcue, " +
      "#mod_cassette, .cass-btn, .cass-reel"
    )) return;
    if (isCardLocked(el)) return;
    event.preventDefault();
    el.classList.add("dragging");
    showPanelZone(el);
    el.style.zIndex = String(++state.zTop);
    const startX = event.clientX;
    const startY = event.clientY;
    const origX = alignGrid(el.offsetLeft);
    const origY = alignGrid(el.offsetTop);
    const w = alignGridSpan(el.offsetWidth, 2);
    const h = alignGridSpan(el.offsetHeight, 2);
    document.body.classList.add("is-card-dragging");
    el.style.left = `${origX}px`;
    el.style.top = `${origY}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    let lastRawX = 0;
    let lastClientX = startX;
    let lastClientY = startY;
    let lastX = origX;
    let lastY = origY;

    const move = (ev) => {
      let x = origX + (ev.clientX - startX);
      let y = origY + (ev.clientY - startY);
      lastRawX = ev.clientX - startX;
      lastClientX = ev.clientX;
      lastClientY = ev.clientY;
      const snapped = magneticSnap(el, x, y, w, h, { x: ev.clientX, y: ev.clientY });
      lastX = snapped.x;
      lastY = snapped.y;
      el.style.left = `${snapped.x}px`;
      el.style.top = `${snapped.y}px`;
      showSnapGuides(snapped.guides);
      opts.onMove?.(snapped.x, snapped.y, w, h);
    };
    const up = async () => {
      el.classList.remove("dragging");
      document.body.classList.remove("is-card-dragging");
      clearSnapGuides();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const x = lastX;
      const y = lastY;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const transferred = await maybeTransferCard(el, x, y, w, h, {
        rawX: lastRawX,
        clientX: lastClientX,
        clientY: lastClientY,
        widgetType: opts.widgetType,
        widgetId: opts.widgetId,
        widgetData: opts.widgetData?.(),
        onTransferred: opts.onTransferred
      });
      if (!transferred) {
        opts.onEnd?.();
        persistLayout();
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  if (resize && opts.resizable !== false) {
    resize.addEventListener("pointerdown", (event) => {
      if (isCardLocked(el)) return;
      event.preventDefault();
      event.stopPropagation();
      window.edex?.setMouseIgnore?.(false);
      el.style.zIndex = String(++state.zTop);
      el.classList.add("dragging");
      showPanelZone(el);
      document.body.classList.add("is-card-dragging");
      const startX = event.clientX;
      const startY = event.clientY;
      const g = gridSize();
      const left = alignGrid(el.offsetLeft);
      const top = alignGrid(el.offsetTop);
      const minW = gridMinSize(opts.minW || g * 4);
      const minH = gridMinSize(opts.minH || g * 3);
      const origW = alignGridSpan(el.offsetWidth, gridCells(minW));
      const origH = alignGridSpan(el.offsetHeight, gridCells(minH));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${origW}px`;
      el.style.height = `${origH}px`;
      let lastW = origW;
      let lastH = origH;

      const move = (ev) => {
        const right = snapExclusiveEdge(left + origW + (ev.clientX - startX));
        const bottom = snapExclusiveEdge(top + origH + (ev.clientY - startY));
        const snapped = magneticResize(el, right - left, bottom - top, left, top, minW, minH);
        lastW = snapped.w;
        lastH = snapped.h;
        el.style.width = `${snapped.w}px`;
        el.style.height = `${snapped.h}px`;
        showSnapGuides(snapped.guides);
        opts.onMove?.(left, top, snapped.w, snapped.h);
      };
      const up = () => {
        el.classList.remove("dragging");
        document.body.classList.remove("is-card-dragging");
        clearSnapGuides();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        const finalW = snapExclusiveEdge(left + lastW) - left;
        const finalH = snapExclusiveEdge(top + lastH) - top;
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${Math.max(minW, finalW)}px`;
        el.style.height = `${Math.max(minH, finalH)}px`;
        opts.onMove?.(left, top, Math.max(minW, finalW), Math.max(minH, finalH));
        opts.onEnd?.();
        persistLayout();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
  }
}

function bootBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "?";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = bytes;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount.toFixed(index ? 1 : 0)} ${units[index]}`;
}

async function loadBootSnapshot() {
  const api = window.edex;
  if (!api) return null;
  const results = await Promise.allSettled([
    api.getCpuMetrics?.(),
    api.getMemMetrics?.(),
    api.getHardwareInfo?.(),
    api.getTopProcesses?.(),
    api.getNetStatus?.(),
    api.listDrives?.()
  ]);
  const value = (result) => result?.status === "fulfilled" ? result.value : null;
  return {
    cpu: value(results[0]),
    mem: value(results[1]),
    hardware: value(results[2]),
    processes: value(results[3]),
    network: value(results[4]),
    drives: value(results[5])
  };
}

async function boot() {
  const bootScreen = document.getElementById("boot_screen");
  if (!bootScreen) return;

  const started = performance.now();
  let fast = false;
  let resolveSkip;
  const skipPromise = new Promise((resolve) => {
    resolveSkip = resolve;
  });
  let done = 0;
  let total = 1;
  const withTimeout = (promise) => Promise.race([promise, delay(9000).then(() => null)]);
  const snapshotPromise = withTimeout(loadBootSnapshot());
  const diagPromise = withTimeout(Promise.resolve(window.edex?.getBootDiagnostics?.()).catch(() => null));

  bootScreen.className = "boot_terminal";
  bootScreen.innerHTML = `
    <button type="button" class="boot-skip" data-boot-skip>SKIP &gt;</button>
    <div class="boot-shell">
      <section class="boot-terminal-pane">
        <div class="boot-pane-title">SYSTEM INITIALIZATION <span>LIVE CHANNEL</span></div>
        <div class="boot-log" data-boot-log aria-live="polite"></div>
      </section>
      <aside class="boot-brand-pane">
        <img class="boot-logo" src="assets/misc/bockis-logo.png" alt="Bockis eDEX">
        <pre class="boot-ascii">${BOOT_ASCII_LOGO}</pre>
        <div class="boot-tagline">DESKTOP UI / TRON SYSTEM</div>
        <div class="boot-progress-panel">
          <div class="boot-progress-meta">
            <span data-boot-percent>BOOT 0%</span>
            <span>${state.primary ? "PRIMARY" : "SECONDARY"} / DISPLAY ${state.displayIndex + 1}</span>
          </div>
          <div class="boot-track" role="progressbar" aria-label="Boot-Fortschritt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i data-boot-fill></i></div>
        </div>
      </aside>
    </div>
    <div class="boot-final" data-boot-final>
      <img src="assets/misc/bockis-logo.png" alt="Bockis eDEX">
      <h1>BOCKIS-eDEX</h1>
      <div class="sub">SYSTEM ONLINE</div>
      <div class="count" data-boot-count>starte Dashboard ...</div>
    </div>`;

  const log = bootScreen.querySelector("[data-boot-log]");
  const fill = bootScreen.querySelector("[data-boot-fill]");
  const percent = bootScreen.querySelector("[data-boot-percent]");
  const finalScreen = bootScreen.querySelector("[data-boot-final]");
  const countdown = bootScreen.querySelector("[data-boot-count]");

  const wait = (ms) => (fast ? Promise.resolve() : delay(ms));
  let bootAudioContext = null;
  let bootAudioOut = null;
  let bootNoise = null;
  let bootVoices = 0;
  const bootLast = {};
  const bootAudio = () => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!bootAudioContext) {
      const ctx = new AudioContextCtor();
      const master = ctx.createGain();
      master.gain.value = 0.55;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4800;
      // Compressor catches overlapping voices so peaks cannot clip.
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;
      master.connect(lowpass).connect(compressor).connect(ctx.destination);
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      bootNoise = buffer;
      bootAudioOut = master;
      bootAudioContext = ctx;
    }
    if (bootAudioContext.state === "suspended") bootAudioContext.resume().catch(() => {});
    return bootAudioContext;
  };
  // Linear attack avoids the click of an instant start; exponential decay avoids a hard cut-off.
  const bootEnvelope = (ctx, node, peak, start, attack, duration) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    node.connect(gain).connect(bootAudioOut);
  };
  const bootTone = (freq, duration, { type = "sine", peak = 0.12, attack = 0.006, to = freq, delay: offset = 0 } = {}) => {
    const ctx = fast ? null : bootAudio();
    if (!ctx || bootVoices > 14) return;
    const start = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    bootEnvelope(ctx, osc, peak, start, attack, duration);
    bootVoices += 1;
    osc.onended = () => { bootVoices -= 1; };
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };
  const bootNoiseBurst = (duration, freq, q, peak, offset = 0, attack = 0.002) => {
    const ctx = fast ? null : bootAudio();
    if (!ctx || bootVoices > 14) return;
    const start = ctx.currentTime + offset;
    const source = ctx.createBufferSource();
    source.buffer = bootNoise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = q;
    source.connect(filter);
    bootEnvelope(ctx, filter, peak, start, attack, duration);
    bootVoices += 1;
    source.onended = () => { bootVoices -= 1; };
    source.start(start, Math.random() * 0.15, duration + 0.02);
  };
  const bootThrottle = (name, gap) => {
    const now = performance.now();
    if (now - (bootLast[name] || 0) < gap) return false;
    bootLast[name] = now;
    return true;
  };
  const bootSfx = {
    key() {
      if (!bootThrottle("key", 38)) return;
      bootNoiseBurst(0.022, 2400 + Math.random() * 900, 1.4, 0.16);
      bootTone(150 + Math.random() * 30, 0.03, { peak: 0.07, to: 100 });
    },
    seek() {
      if (!bootThrottle("seek", 90)) return;
      const clicks = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < clicks; i += 1) {
        const at = i * (0.035 + Math.random() * 0.03);
        bootNoiseBurst(0.04, 700 + Math.random() * 500, 2.5, 0.2, at);
        bootTone(95, 0.05, { peak: 0.1, to: 60, delay: at });
      }
    },
    ok() { bootTone(1175, 0.09, { peak: 0.07 }); },
    warn() {
      bootTone(554, 0.12, { type: "triangle", peak: 0.1, to: 494 });
      bootTone(466, 0.14, { type: "triangle", peak: 0.1, to: 415, delay: 0.14 });
    },
    error() {
      for (let i = 0; i < 3; i += 1) bootTone(220, 0.14, { type: "triangle", peak: 0.14, to: 196, delay: i * 0.2 });
    },
    section() {
      bootTone(659.25, 0.1, { peak: 0.08 });
      bootTone(880, 0.16, { peak: 0.08, delay: 0.09 });
      bootSfx.seek();
    },
    power() {
      bootTone(55, 1.1, { peak: 0.2, attack: 0.25, to: 110 });
      bootTone(110.5, 1.1, { peak: 0.08, attack: 0.3, to: 220 });
      bootNoiseBurst(0.9, 260, 0.8, 0.08, 0, 0.3);
    },
    online() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => {
        bootTone(freq, 0.9, { peak: 0.1, attack: 0.02, delay: index * 0.12 });
        bootTone(freq / 2, 0.9, { type: "triangle", peak: 0.04, attack: 0.03, delay: index * 0.12 });
      });
    }
  };
  const bootSound = (name) => {
    try { bootSfx[name]?.(); } catch { /* boot audio is optional */ }
  };
  const span = (cls, text) => `<span class="${cls}">${escapeHtml(text)}</span>`;
  const stamp = () => `<span class="d">[${((performance.now() - started) / 1000).toFixed(6).padStart(11, " ")}]</span> `;
  const setProgress = (value) => {
    const clamped = Math.max(0, Math.min(100, value));
    if (fill) fill.style.width = `${clamped}%`;
    if (percent) percent.textContent = `BOOT ${Math.round(clamped)}%`;
  };
  const tick = (count = 1) => {
    done = Math.min(done + count, total);
    setProgress((done / total) * 100);
  };
  const line = (html = "") => {
    const row = document.createElement("div");
    row.className = "boot-line";
    row.innerHTML = html;
    log?.appendChild(row);
    while (log && log.scrollHeight > log.clientHeight + 4 && log.firstChild && log.firstChild !== row) {
      log.removeChild(log.firstChild);
    }
    return row;
  };
  const typeCmd = async (command, speed = 20) => {
    const row = line(`${span("ok", "root")}${span("d", "@bockis-edex")}:${span("w", "~")}# `);
    const typed = document.createElement("span");
    row.appendChild(typed);
    for (const char of command) {
      if (fast) {
        typed.textContent = command;
        return;
      }
      typed.textContent += char;
      if (char.trim()) bootSound("key");
      await delay(speed + Math.random() * 12);
    }
  };

  bootScreen.querySelector("[data-boot-skip]")?.addEventListener("click", () => {
    fast = true;
    resolveSkip();
  });

  bootSound("power");
  applyTheme(state.theme || state.bootstrap?.theme, state.settings.wallpaper || "grid");
  document.documentElement.dataset.ramGaugeMode = ramGaugeMode();

  line(`${stamp()}Bockis-eDEX Boot-Loader  ${span("d", new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }))}`);
  line(`${stamp()}Electron IPC-Bridge: ${window.edex ? span("ok", "online") : span("er", "nicht verfügbar")}`);
  const size = state.physicalSize || {};
  line(`${stamp()}Anzeige: ${span("b", `Monitor ${state.displayIndex + 1}`)} ${state.primary ? "(Hauptmonitor)" : "(Zusatzmonitor)"} ${span("d", `${size.width || "?"}x${size.height || "?"}`)}`);
  const pending = line(`${stamp()}Sammle Systemdaten (live) ...`);
  await wait(450);

  const [snapshot, diag] = await Promise.race([
    Promise.all([snapshotPromise, diagPromise]),
    skipPromise.then(() => [null, null])
  ]);
  pending.innerHTML = `${stamp()}Sammle Systemdaten (live) ... ${snapshot ? span("ok", "fertig") : span("w", "keine Daten")}`;

  const cpu = snapshot?.cpu || {};
  const mem = snapshot?.mem || {};
  const hardware = snapshot?.hardware || {};
  const processes = Array.isArray(snapshot?.processes?.list) ? snapshot.processes.list : [];
  const network = snapshot?.network || {};
  const drives = Array.isArray(snapshot?.drives?.items) ? snapshot.drives.items : [];
  const sys = diag?.system || {};
  const versions = diag?.versions || {};
  const deps = Array.isArray(diag?.deps) ? diag.deps : [];
  const packages = Array.isArray(diag?.packages) ? diag.packages : [];
  const modules = [
    ["EFFECTS", Boolean(window.edexEffects)],
    ["I18N", Boolean(window.edexI18n)],
    ["COCKPIT", Boolean(window.cockpitPanel)],
    ["CPU RAIL", Boolean(window.cpuRailPanel)],
    ["DOCK", Boolean(window.dockPanel)]
  ];
  const liveChecks = 3;

  total = 8 + modules.length + 2 + 1 + Math.max(1, drives.length) + Math.min(5, processes.length)
    + deps.length + liveChecks + packages.length + 2;
  done = 0;

  // Phase 1: Hardware
  bootSound("section");
  line(`${stamp()}Kernel: ${span("b", sys.kernel || "?")}  Host: ${span("b", sys.hostname || hardware.model || "?")}`); tick();
  await wait(60);
  line(`${stamp()}OS: ${span("b", sys.os || "Windows")}  Build ${span("d", sys.build || "?")}  ${sys.arch || ""}`); tick();
  await wait(60);
  line(`${stamp()}Board: ${span("b", `${hardware.manufacturer || "UNKNOWN"} ${hardware.model || ""}`.trim())}  ${span("d", hardware.chassis || "")}`); tick();
  await wait(50);
  if (sys.bios) line(`${stamp()}BIOS: ${escapeHtml(sys.bios)}`);
  tick();
  await wait(50);
  const cpuSpeed = Number.isFinite(cpu.speedMax) ? ` ${cpu.speedMax.toFixed(1)} GHz` : "";
  line(`${stamp()}CPU:  ${span("b", cpu.fullName || cpu.name || "unbekannt")}  ${cpu.cores || "?"} Threads${cpuSpeed}  ${span("d", `Last ${Number(cpu.avg || 0).toFixed(1)}%`)}`); tick();
  await wait(70);
  const memFilled = mem.total ? Math.round((Number(mem.used || 0) / Number(mem.total)) * 20) : 0;
  const memBar = `${span("boot-bar ok", "▓".repeat(memFilled))}${span("boot-bar d", "░".repeat(20 - memFilled))}`;
  line(`${stamp()}RAM:  [${memBar}]  ${span("b", `${bootBytes(mem.used)} / ${bootBytes(mem.total)}`)}  ${span("d", `${bootBytes(mem.free)} frei`)}`); tick();
  await wait(60);
  if (sys.gpu) {
    line(`${stamp()}GPU:  ${span("b", sys.gpu)}${sys.vram > 0 ? `  ${bootBytes(sys.vram)} VRAM` : ""}${sys.gpuDriver ? `  ${span("d", `Treiber ${sys.gpuDriver}`)}` : ""}`);
  }
  tick();
  await wait(60);
  bootSound(snapshot ? "ok" : "warn");
  line(`${stamp()}Daten: ${snapshot ? span("ok", "echte Systemdaten via window.edex") : span("w", "keine Systemdaten verfügbar")}`); tick();
  await wait(80);
  line();

  // Phase 2: Module und Dienste
  bootSound("section");
  const services = [
    ["Loading HUD effects", modules[0]],
    ["Loading i18n bridge", modules[1]],
    ["Loading cockpit radar", modules[2]],
    ["Loading CPU supply rail", modules[3]],
    ["Loading task dock", modules[4]]
  ];
  for (const [label, [, loaded]] of services) {
    bootSound(loaded ? "ok" : "warn");
    line(`[${loaded ? span("ok", "  OK  ") : span("w", " WAIT ")}] ${span("d", label)}`);
    tick();
    await wait(70 + Math.random() * 90);
  }
  bootSound("ok");
  line(`[${span("ok", "  OK  ")}] ${span("d", `Theme ${String(state.themeName || "tron").toUpperCase()} synchronisiert`)}`); tick();
  await wait(80);
  bootSound("ok");
  line(`[${span("ok", "  OK  ")}] ${span("d", `Workspace Display ${state.displayIndex + 1} (${state.primary ? "primary" : "secondary"})`)}`); tick();
  await wait(80);
  line();

  // Phase 3: Netzwerk
  bootSound("section");
  line(span("w", ":: Netzwerk-Schnittstelle"));
  bootSound(network.iface && network.ip4 ? "ok" : "warn");
  if (network.iface && network.ip4) {
    const ping = Number.isFinite(network.ping) ? `  ${network.ping} ms` : "";
    line(`   ${span("ok", "↑")}  ${escapeHtml(String(network.iface).padEnd(16, " "))} ${span("b", String(network.ip4).padEnd(16, " "))} ${span("d", `${network.mac ? `MAC ${network.mac}` : ""}${ping}  ${network.state || ""}`)}`);
  } else {
    line(`   ${span("w", "keine aktive Schnittstelle")}`);
  }
  tick();
  await wait(120);
  line();

  // Phase 4: Laufwerke
  bootSound("section");
  line(span("w", ":: Dateisystem / Laufwerke"));
  if (drives.length) {
    for (const drive of drives) {
      const usedPct = Math.max(0, Math.min(100, Number(drive.pct) || 0));
      const filled = Math.round((usedPct / 100) * 22);
      const tone = usedPct > 85 ? "er" : usedPct > 65 ? "w" : "ok";
      line(`   ${span("b", String(drive.letter || "").padEnd(4, " "))}  [${span(`boot-bar ${tone}`, "▓".repeat(filled))}${span("boot-bar d", "░".repeat(22 - filled))}] ${span(tone, `${String(usedPct).padStart(3, " ")}%`)}  ${span("d", `${drive.usedLabel || bootBytes(drive.used)} / ${drive.totalLabel || bootBytes(drive.total)}  ${drive.volumeName ? `(${drive.volumeName})` : ""}  ${drive.fs || ""}`)}`);
      bootSound("seek");
      tick();
      await wait(65);
    }
  } else {
    bootSound("warn");
    line(`   ${span("w", "keine Laufwerke gefunden")}`);
    tick();
  }
  line();
  await wait(120);

  // Phase 5: Prozesse
  if (processes.length) {
    bootSound("section");
    line(span("w", `:: Top-Prozesse (RAM)  ${snapshot?.processes?.tasks || processes.length} aktiv`));
    for (const proc of processes.slice(0, 5)) {
      bootSound("key");
      line(`   ${span("d", String(proc.pid ?? 0).padStart(6, " "))}  ${span("b", String(proc.name || "?").padEnd(20, " "))} MEM ${span("ok", `${Number(proc.mem || 0).toFixed(1).padStart(5, " ")}%`)}  ${span("d", `${proc.conn || 0} conn`)}`);
      tick();
      await wait(40);
    }
    line();
  }

  // Phase 6: Systemdiagnose
  bootSound("section");
  line(span("w", ":: Systemdiagnose"));
  if (!deps.length) line(`   ${span("w", "Diagnose nicht verfügbar")}`);
  for (const dep of deps) {
    bootSound(dep.ok ? "ok" : "error");
    line(`   prüfe ${span("d", dep.label.padEnd(32, " "))} ${dep.ok ? span("ok", "bestanden") : span("er", "FEHLT")}`);
    tick();
    await wait(80 + Math.random() * 80);
  }
  const liveResults = [
    ["Electron IPC-Bridge", Boolean(window.edex)],
    ["Netzwerk-Interface", Boolean(network.iface)],
    ["Dateisystem-Zugriff", drives.length > 0]
  ];
  for (const [label, ok] of liveResults) {
    bootSound(ok ? "ok" : "warn");
    line(`   prüfe ${span("d", label.padEnd(32, " "))} ${ok ? span("ok", "bestanden") : span("w", "WARNUNG")}`);
    tick();
    await wait(80 + Math.random() * 80);
  }
  line();
  await wait(180);

  // Phase 7: Komponenten
  bootSound("section");
  await typeCmd("bockis-install --verify --source bundle", 20);
  await wait(220);
  line(span("d", "Reading component manifest... Done"));
  line(span("d", `Resolving dependencies... Done${versions.electron ? `  (Electron ${versions.electron} / Chromium ${versions.chrome} / Node ${versions.node})` : ""}`));
  await wait(180);

  for (const pkg of packages) {
    bootSound("seek");
    const row = line();
    const label = pkg.name.padEnd(18, " ");
    const detail = pkg.version ? `v${pkg.version}` : bootBytes(pkg.size);
    for (let step = 0; step <= 20; step += 1) {
      if (fast) step = 20;
      else await delay(10 + Math.random() * 16);
      row.innerHTML = `Verifiziere ${span("b", label)} [${span("ok", "#".repeat(step))}${span("d", ".".repeat(20 - step))}] ${String(step * 5).padStart(3, " ")}%  ${span("d", detail)}`;
    }
    row.innerHTML = pkg.ok
      ? `Verifiziere ${span("b", label)} [${span("ok", "#".repeat(20))}] ${span("ok", "fertig")}  ${span("d", `${detail}  sha256:${pkg.sha}`)}`
      : `Verifiziere ${span("b", label)} [${span("er", "!".repeat(20))}] ${span("er", "FEHLT")}`;
    bootSound(pkg.ok ? "ok" : "error");
    tick();
    await wait(25);
  }

  const missing = packages.filter((pkg) => !pkg.ok).length;
  const failedDeps = deps.filter((dep) => !dep.ok).length;
  line();
  bootSound(missing || failedDeps ? "warn" : "ok");
  line(missing || failedDeps
    ? `${span("w", "Abhängigkeiten geprüft.")}  ${span("d", `${missing} Komponenten fehlen, ${failedDeps} Systemvoraussetzungen nicht erfüllt`)}`
    : `${span("ok", "Abhängigkeiten installiert und verifiziert.")}  ${span("d", "0 Fehler  0 Warnungen")}`);
  await wait(300);
  await typeCmd("systemctl start bockis-edex", 22);
  tick(2);
  setProgress(100);
  await wait(600);

  // Abschluss
  bootSound("online");
  finalScreen?.classList.add("is-visible");
  for (let seconds = 2; seconds > 0 && !fast; seconds -= 1) {
    if (countdown) countdown.textContent = `starte Dashboard in ${seconds} ...`;
    await delay(550);
  }
  if (countdown) countdown.textContent = "bereit.";
  if (!fast) await delay(250);
  try { await bootAudioContext?.close?.(); } catch { /* optional audio cleanup */ }
  bootScreen.remove();
}

const BOOT_ASCII_LOGO = [
  "██████╗  ██████╗  ██████╗██╗  ██╗██╗███████╗",
  "██╔══██╗██╔═══██╗██╔════╝██║ ██╔╝██║██╔════╝",
  "██████╔╝██║   ██║██║     █████╔╝ ██║███████╗",
  "██╔══██╗██║   ██║██║     ██╔═██╗ ██║╚════██║",
  "██████╔╝╚██████╔╝╚██████╗██║  ██╗██║███████║",
  "╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝╚══════╝"
].join("\n");

let shutdownInProgress = false;

async function shutdown() {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  document.getElementById("boot_screen")?.remove();
  document.getElementById("shutdown_screen")?.remove();

  const shutdownScreen = document.createElement("section");
  shutdownScreen.id = "shutdown_screen";
  shutdownScreen.innerHTML = `
    <div class="shutdown-shell">
      <div class="shutdown-terminal">
        <div class="shutdown-terminal-head">
          <span>BOCKIS-eDEX / SHUTDOWN CONSOLE</span>
          <strong>POWER MANAGEMENT</strong>
        </div>
        <div class="shutdown-log" data-shutdown-log aria-live="polite"></div>
      </div>
      <aside class="shutdown-brand">
        <img src="assets/misc/bockis-logo.png" alt="Bockis eDEX">
        <strong>BOCKIS-eDEX</strong>
        <span>SYSTEM POWER DOWN</span>
      </aside>
    </div>
    <div class="crt-beam" aria-hidden="true"></div>
    <div class="crt-dot" aria-hidden="true"></div>
    <div class="shutdown-final" data-shutdown-final>
      <img src="assets/misc/bockis-logo.png" alt="Bockis eDEX">
      <strong>BOCKIS-eDEX</strong>
      <span>SYSTEM POWER DOWN</span>
    </div>`;
  document.body.appendChild(shutdownScreen);

  const log = shutdownScreen.querySelector("[data-shutdown-log]");
  const line = (label, message, status = "OK") => {
    const row = document.createElement("div");
    row.className = status === "WAIT" ? "shutdown-row wait" : "shutdown-row";
    row.innerHTML = `<span>${new Date().toLocaleTimeString([], { hour12: false })}</span><b>${escapeHtml(label)}</b><span>${escapeHtml(message)}</span><strong>[${escapeHtml(status)}]</strong>`;
    log?.appendChild(row);
  };
  const step = async (label, message, status = "OK") => {
    line(label, message, status);
    await delay(145);
  };

  document.body.classList.add("is-shutting-down");
  await step("STOP", "User interface input locked");
  try { window.edexEffects?.stop?.(); } catch { /* ignore visual cleanup errors */ }
  await step("EFFECTS", "HUD effects stopped");
  try { window.dockPanel?.unbind?.(state); } catch { /* ignore visual cleanup errors */ }
  await step("DOCK", "Task dock detached");
  try { await closeTaskDockApp(); } catch { /* ignore stale embedded windows */ }
  await step("EMBED", "Embedded windows released");
  await step("PANELS", "Workspace panels released");
  await step("IPC", "Electron shutdown request queued", "WAIT");
  await delay(180);
  shutdownScreen.classList.add("is-crt-off");
  window.setTimeout(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1280, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(420, audio.currentTime + 0.07);
      gain.gain.setValueAtTime(0.035, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.09);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.1);
      oscillator.addEventListener("ended", () => audio.close().catch(() => {}), { once: true });
    } catch { /* audio is optional */ }
  }, 2720);
  await delay(3300);
  window.edex.quitApp();
}

function styleFromBox(box) {
  const px = boxToPx(box);
  return `left:${px.x}px;top:${px.y}px;width:${px.w}px;height:${px.h}px;box-sizing:border-box`;
}

function panelHtml(id) {
  if (!state.layout[id] || !PANEL_META[id] || id === "status" || state.layout[id].minimized) return "";
  const locked = Boolean(state.layout[id].locked);
  const extra = id === "clock" && state.settings.clockPanelFrame !== true
    ? " clock-bare"
    : id === "dock" ? " dock-bare" : "";
  const forceLocked = locked || id === "dock";
  return `
    <section class="hud-card${extra}${forceLocked ? " locked" : ""}" id="card_${id}" data-panel-id="${id}" style="${styleFromBox(state.layout[id])}">
      <h3 class="card-title">
        <span class="card-title-text">${escapeHtml(panelDisplayTitle(id))}</span>
        ${cardToolsHtml({ allowMinimize: id !== "dock" })}
      </h3>
      <div class="card-body">${panelBody(id)}</div>
      <div class="resize-handle"></div>
    </section>`;
}

const PANEL_ICON_CHOICES = [
  { id: "desktop", label: "Desktop" },
  { id: "calendar", label: "Kalender" },
  { id: "calculator", label: "Rechner" },
  { id: "clock", label: "Uhr" },
  { id: "cpu", label: "Prozessor" },
  { id: "ram", label: "Arbeitsspeicher" },
  { id: "network", label: "Netzwerk" },
  { id: "world", label: "Welt" },
  { id: "drive", label: "Laufwerk" },
  { id: "directories", label: "Verzeichnisse" },
  { id: "folders", label: "Ordner" },
  { id: "search", label: "Suche" },
  { id: "browser", label: "Browser" },
  { id: "cloud", label: "Cloud" },
  { id: "terminal", label: "Terminal" },
  { id: "log", label: "Log" },
  { id: "weather", label: "Wetter" },
  { id: "processes", label: "Prozesse" }
];

function setPanelIcon(id, icon) {
  if (!state.layout[id] || !PANEL_ICON_CHOICES.some((item) => item.id === icon)) return;
  state.layout[id] = { ...state.layout[id], icon };
  persistLayout();
  renderDockItems();
  toast(`Icon für „${PANEL_META[id]?.title || id}“ geändert`);
}

function dockIcon(kind, id) {
  if (kind === "desktop" || kind === "path") return "folders";
  const icons = {
    desktop: "desktop",
    clock: "clock", cpu: "cpu", ram: "ram", toplist: "processes", globe: "world", conninfo: "network",
    calendar: "clock", drives: "drive", filesearch: "search", terminal: "terminal", weather: "weather", log: "log",
    cockpit: "world", cassette: "drive", ddj: "cpu", cpuRail: "cpu", calculator: "terminal"
    , autostart: "processes"
  };
  return state.layout[id]?.icon || PANEL_META[id]?.icon || icons[id] || "fallback";
}

function renderDockItems() {
  const host = document.querySelector("[data-dock-items]");
  if (!host) {
    renderTaskDockItems();
    loadTaskbarDockItems();
    return;
  }
  const items = [];
  Object.keys(PANEL_META).forEach((id) => {
    if (id !== "dock" && state.layout[id]?.minimized) {
      items.push({ kind: "panel", id, label: panelDisplayTitle(id) });
    }
  });
  if (state.desktopEnabled !== false && state.desktopStage?.minimized) {
    items.push({ kind: "desktop", id: "desktop", label: "系統桌面" });
  }
  state.pathCards.forEach((card, index) => {
    if (card.minimized) items.push({ kind: "path", id: card.id, label: pathTitle(card, index) });
  });
  host.innerHTML = items.map((item) => `
    <button type="button" class="dock-item" data-dock-kind="${item.kind}" data-dock-restore="${escapeHtml(item.id)}"${item.path ? ` data-dock-taskbar-path="${escapeHtml(item.path)}"` : ""} title="${escapeHtml(item.label)}">
      ${item.iconDataUrl ? `<img class="dock-item-icon dock-item-icon-image" src="${escapeHtml(item.iconDataUrl)}" alt="" draggable="false">` : `<span class="dock-item-icon dock-item-icon-${dockIcon(item.kind, item.id)}" aria-hidden="true"></span>`}
      <span class="dock-item-label">${escapeHtml(item.label)}</span>
    </button>`).join("");
  window.edexI18n?.translatePage?.(host);
  window.dockPanel?.refresh?.(state);
  host.querySelectorAll("[data-dock-restore]").forEach((button) => {
      button.addEventListener("click", async () => {
      const kind = button.dataset.dockKind;
      const id = button.dataset.dockRestore;
      if (!id) return;
      if (kind === "panel" && state.layout[id]) {
        state.layout[id] = { ...state.layout[id], minimized: false };
      } else if (kind === "desktop" && state.desktopStage) {
        state.desktopStage = { ...state.desktopStage, minimized: false };
      } else if (kind === "path") {
        const card = state.pathCards.find((item) => item.id === id);
        if (!card) return;
        card.minimized = false;
      } else {
        return;
      }
      state.dockForeground = true;
      await window.edex?.raiseOverlay?.();
      persistLayout();
      rebuildWorkspace();
    });
  });
  renderTaskDockItems();
  loadTaskbarDockItems();
}

function renderTaskDockItems() {
  const host = document.querySelector("[data-task-dock-items]");
  if (!host) return;
  const root = host.closest("#task-dock-panel");
  const card = host.closest(".hud-card");
  if (card) card.hidden = taskbarDockItems.length === 0;
  if (root) root.hidden = false;
  host.innerHTML = taskbarDockItems.map((item) => `
    <button type="button" class="dock-item" data-task-dock-path="${escapeHtml(item.path || "")}" title="${escapeHtml(item.name)}">
      ${item.iconDataUrl ? `<img class="dock-item-icon dock-item-icon-image" src="${escapeHtml(item.iconDataUrl)}" alt="" draggable="false">` : `<span class="dock-item-icon dock-item-icon-fallback" aria-hidden="true"></span>`}
      <span class="dock-item-label">${escapeHtml(item.name)}</span>
    </button>`).join("");
  window.edexI18n?.translatePage?.(host);
  host.querySelectorAll("[data-task-dock-path]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = taskbarDockItems.find((candidate) => candidate.path === button.dataset.taskDockPath);
      if (item) await openTaskDockItem(item);
    });
  });
}

function taskEmbedLayout() {
  const zone = centralZoneRect();
  const inset = Math.max(6, Math.round(gridSize() * 0.35));
  const header = Math.max(34, Math.round(gridSize() * 1.35));
  const width = Math.max(320, Math.min(zone.width - inset * 2, Math.round(zone.width * 0.68)));
  const height = Math.max(220, Math.min(zone.height - inset * 2, Math.round(zone.height * 0.68)));
  const frame = {
    x: zone.x + Math.max(inset, Math.round((zone.width - width) / 2)),
    y: zone.y + Math.max(inset, Math.round((zone.height - height) / 2)),
    w: width,
    h: height
  };
  return { frame, native: taskEmbedNativeBounds(frame, header) };
}

function taskEmbedNativeBounds(frame) {
  const header = Math.max(34, Math.round(gridSize() * 1.35));
  return {
    x: frame.x,
    y: frame.y + header,
    w: frame.w,
    h: Math.max(80, frame.h - header)
  };
}

function syncTaskEmbedBounds(frame, hwnd) {
  if (!hwnd) return;
  window.edex?.embedBounds?.({ hwnd, bounds: taskEmbedNativeBounds({
    x: frame.offsetLeft,
    y: frame.offsetTop,
    w: frame.offsetWidth,
    h: frame.offsetHeight
  }) });
}

function removeTaskEmbedFrame() {
  state.taskEmbedResizeHandler && window.removeEventListener("resize", state.taskEmbedResizeHandler);
  state.taskEmbedResizeHandler = null;
  document.getElementById("task-embed-frame")?.remove();
}

async function closeTaskDockApp() {
  const hwnd = state.taskDockEmbed?.hwnd;
  if (hwnd) await window.edex?.embedRelease?.({ hwnd });
  delete state.taskDockEmbed;
  removeTaskEmbedFrame();
}

async function openTaskDockItem(item) {
  const target = String(item.path || "").trim();
  if (!target) return;
  await closeTaskDockApp();
  const result = await window.edex?.openPath?.(target);
  if (result?.ok === false) toast(result.message || "Programm konnte nicht geöffnet werden");
}

function loadTaskbarDockItems() {
  if (taskbarDockLoaded || taskbarDockLoadPromise || !window.edex?.listTaskbarPinned) return;
  taskbarDockLoadPromise = window.edex.listTaskbarPinned()
    .then((result) => {
      if (result?.error) throw new Error(result.error);
      taskbarDockItems = Array.isArray(result?.items) ? result.items : [];
      taskbarDockLoaded = true;
      taskbarDockLoadAttempts = 0;
      logUiAction("taskdock.loaded", "Task-Dock geladen", { items: taskbarDockItems.length });
      renderTaskDockItems();
    })
    .catch((error) => {
      taskbarDockItems = [];
      taskbarDockLoadAttempts += 1;
      logUiAction("taskdock.load_failed", "Task-Dock konnte nicht geladen werden", {
        attempt: taskbarDockLoadAttempts,
        message: error?.message || String(error)
      });
      renderTaskDockItems();
      if (taskbarDockLoadAttempts < 3 && !taskbarDockRetryTimer) {
        taskbarDockRetryTimer = setTimeout(() => {
          taskbarDockRetryTimer = null;
          loadTaskbarDockItems();
        }, 3000);
      }
    })
    .finally(() => {
      taskbarDockLoadPromise = null;
    });
}

function setCardLocked(el, locked) {
  el.classList.toggle("locked", locked);
  toast(locked ? "已鎖定容器" : "已解鎖容器");
}

async function setClockScale(value) {
  const next = Math.max(0.25, Math.min(2, Math.round(Number(value) * 20) / 20));
  if (!Number.isFinite(next)) {
    toast("請輸入 0.25–2.0 之間的數字");
    return;
  }
  state.settings = { ...state.settings, clockScale: next };
  applyClockMetrics();
  renderClock();
  try {
    const result = await window.edex.saveSettings({ clockScale: next });
    if (result?.settings) state.settings = { ...result.settings, clockScale: next };
  } catch {
    // Keep local value if save fails.
  }
  toast(`Uhr-Raster ${next.toFixed(2)}×`);
}

async function setClockShowDate(show) {
  const next = Boolean(show);
  state.settings = { ...state.settings, clockShowDate: next };
  const host = document.getElementById("mod_clock_led");
  if (host) host.dataset.ledLayout = "";
  renderClock();
  try {
    const result = await window.edex.saveSettings({ clockShowDate: next });
    if (result?.settings) state.settings = { ...result.settings, clockShowDate: next };
  } catch {
    // keep local
  }
  toast(next ? "Datum angezeigt" : "Datum ausgeblendet");
}

async function setClockLedColor(color) {
  const next = toHex6(color);
  state.settings = { ...state.settings, clockLedColor: next };
  applyClockMetrics();
  renderClock();
  try {
    const result = await window.edex.saveSettings({ clockLedColor: next });
    if (result?.settings) state.settings = { ...result.settings, clockLedColor: next };
  } catch {
    // Keep local value if save fails.
  }
  toast(`Uhr-Hervorhebung auf ${next} geändert`);
}

function pickClockLedColor(ctx) {
  closeCardMenus();
  window.edex?.setMouseIgnore?.(false);
  const palette = document.createElement("div");
  palette.className = "color-palette";
  const swatches = [
    { label: "Weiß", color: "#ffffff" },
    { label: "Theme-Farbe", color: rgbToHex(state.theme?.colors?.r, state.theme?.colors?.g, state.theme?.colors?.b) },
    ...themeColorSwatches().filter((s) => s.label !== "深底" && s.label !== "黑"),
    { label: "Cyan", color: "#2ee6c7" },
    { label: "Amber", color: "#ffb347" }
  ];
  const seen = new Set();
  const list = swatches.filter((item) => {
    const key = toHex6(item.color);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const current = clockLedColor();
  palette.innerHTML = `
    <div class="color-palette-title">Uhr-Hervorhebung</div>
    <label class="color-palette-custom">Benutzerdefiniert
      <input type="color" id="clock_led_picker" value="${escapeHtml(current)}">
    </label>
    <div class="color-palette-grid">
      ${list.map((item, i) => {
        const fill = toHex6(item.color);
        return `<button type="button" class="color-swatch" data-idx="${i}" title="${escapeHtml(item.label)}" style="background:${escapeHtml(fill)}"></button>`;
      }).join("")}
    </div>
  `;
  document.body.appendChild(palette);
  window.edexI18n?.translatePage?.(palette);
  const rect = ctx.el?.getBoundingClientRect?.() || { right: 80, top: 80 };
  const pw = palette.offsetWidth;
  const ph = palette.offsetHeight;
  let left = rect.left;
  let top = rect.top + 36;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, rect.top - ph - 8);
  palette.style.left = `${left}px`;
  palette.style.top = `${top}px`;

  const apply = (color) => {
    if (!color) return;
    setClockLedColor(color);
  };

  window.edexI18n?.translatePage?.(palette);
  palette.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    window.edex?.setMouseIgnore?.(false);
  }, true);
  palette.querySelectorAll("[data-idx]").forEach((btn) => {
    const choose = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const item = list[Number(btn.dataset.idx)];
      if (item?.color) apply(item.color);
      closeCardMenus();
    };
    btn.addEventListener("click", choose);
  });
  const picker = palette.querySelector("#clock_led_picker");
  picker?.addEventListener("input", () => apply(picker.value));
  picker?.addEventListener("change", () => {
    apply(picker.value);
    closeCardMenus();
  });
  const dismiss = (event) => {
    if (palette.contains(event.target)) return;
    closeCardMenus();
    window.removeEventListener("pointerdown", dismiss, true);
  };
  setTimeout(() => window.addEventListener("pointerdown", dismiss, true), 0);
}

function fabBarHtml() {
  const addBtn = `<button type="button" class="round-fab" id="add-fab" title="Container hinzufügen">+</button>`;
  if (!state.primary) return addBtn;
  return `
    ${addBtn}
    <button type="button" class="round-fab" id="settings-fab" title="Einstellungen">⚙</button>
    <button type="button" class="round-fab danger" id="quit-fab" title="Programm beenden">⏻</button>
  `;
}

function snapCardToQuarter(kind, ctx, slot) {
  if (ctx.locked) {
    toast("Bitte zuerst entsperren");
    return;
  }
  const box = kind === "panel"
    ? state.layout[ctx.widgetId]
    : kind === "desktop"
      ? state.desktopStage
      : state.pathCards.find((card) => card.id === ctx.id);
  if (!box) return;
  delete box.gx;
  delete box.gy;
  delete box.gw;
  delete box.gh;
  const bounds = panelZoneRect(ctx.el);
  applyBoxPx(
    box,
    bounds.x + bounds.width * (slot.x / 100),
    bounds.y + bounds.height * (slot.y / 100),
    bounds.width / 2,
    bounds.height / 2
  );
  ctx.el.style.cssText = styleFromBox(box);
  persistLayout();
  toast(`${slot.label} angewendet`);
}

function menuItemsForCard(kind, ctx) {
  const locked = Boolean(ctx.locked);
  const fixedDisplayId = Number.isFinite(Number(ctx.fixedDisplayId)) ? Number(ctx.fixedDisplayId) : null;
  const currentDisplay = state.displays.find((display) => display.id === state.displayId);
  const items = [
    {
      label: locked ? "Entsperren" : "Sperren",
      action: () => ctx.onLock?.()
    },
    ...(ctx.setFixedDisplay ? [{
      label: fixedDisplayId === state.displayId
        ? `Monitorbindung lösen (${currentDisplay?.label || "aktueller Monitor"})`
        : `Auf ${currentDisplay?.label || "aktuellen Monitor"} fixieren`,
      action: () => {
        ctx.setFixedDisplay(fixedDisplayId === state.displayId ? null : state.displayId);
        toast(fixedDisplayId === state.displayId ? "Monitorbindung gelöst" : "Auf diesem Monitor fixiert");
      }
    }] : []),
    {
      label: "Container hinzufügen",
      action: () => openAddPicker()
    }
  ];
  if (kind === "panel" || kind === "desktop" || kind === "path") {
    items.push(
      { sep: true },
      { label: "1/4 links oben", action: () => snapCardToQuarter(kind, ctx, { x: 0, y: 0, label: "Links oben" }) },
      { label: "1/4 rechts oben", action: () => snapCardToQuarter(kind, ctx, { x: 50, y: 0, label: "Rechts oben" }) },
      { label: "1/4 links unten", action: () => snapCardToQuarter(kind, ctx, { x: 0, y: 50, label: "Links unten" }) },
      { label: "1/4 rechts unten", action: () => snapCardToQuarter(kind, ctx, { x: 50, y: 50, label: "Rechts unten" })
      }
    );
  }
  if ((kind === "panel" && ctx.widgetId !== "dock") || kind === "desktop" || kind === "path") {
    items.splice(2, 0, {
      label: "Ins Dock minimieren",
      action: () => minimizeContainer(kind, ctx.widgetId)
    });
  }
  const others = (state.displays || []).filter((d) => {
    if (d.id === state.displayId) return false;
    // 系統桌面 only on the primary monitor.
    if (ctx.widgetType === "desktop" && !d.primary) return false;
    return true;
  });
  if (others.length && ctx.widgetType) {
    items.push({ sep: true });
    others.forEach((d) => {
      items.push({
        label: `Zu ${d.label || `Monitor ${d.id}`}`,
        action: async () => {
          const el = ctx.el;
          if (!el) return;
          if (isCardLocked(el)) {
            toast("Bitte zuerst entsperren");
            return;
          }
          const box = pxToGridFields(el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight);
          const result = await window.edex.transferWidget(d.id, {
            type: ctx.widgetType,
            id: ctx.widgetId,
            data: ctx.widgetData?.(),
            ...box
          });
          if (result?.ok) {
            ctx.onTransferred?.();
            toast(`Zu ${d.label} verschoben`);
          } else {
            toast(result?.message || "Verschieben auf diesen Monitor nicht möglich");
          }
        }
      });
    });
    loadTaskbarDockItems();
  }
  if (kind === "panel" && ctx.widgetId === "clock") {
    const accent = rgbToHex(state.theme?.colors?.r, state.theme?.colors?.g, state.theme?.colors?.b);
    items.push(
      { sep: true },
      {
        label: clockShowDate() ? "Datum ausblenden" : "Datum anzeigen",
        action: () => setClockShowDate(!clockShowDate())
      },
      { label: "Hervorhebung: Weiß", action: () => setClockLedColor("#ffffff") },
      { label: "Hervorhebung: Theme-Farbe", action: () => setClockLedColor(accent) },
      { label: "Hervorhebung: Rot", action: () => setClockLedColor("#ff3c3c") },
      { label: "Hervorhebung: Gelb", action: () => setClockLedColor("#ffd23c") },
      { label: "Hervorhebung: Cyan", action: () => setClockLedColor("#2ee6c7") },
      {
        label: `Benutzerdefinierte Hervorhebung (${clockLedColor()})`,
        action: () => {
          const next = window.prompt("Farbe der Uhr-Hervorhebung (#RRGGBB)", clockLedColor());
          if (next == null) return;
          setClockLedColor(next);
        }
      },
      {
        label: "Uhr kleiner",
        action: () => setClockScale(clockScale() - 0.05)
      },
      {
        label: "Uhr größer",
        action: () => setClockScale(clockScale() + 0.05)
      },
      {
        label: `Raster ${clockScale().toFixed(2)}× (verkleinerbar)`,
        action: () => {
          const next = window.prompt("Uhr-Rasterfaktor (0,25–2,0; 1,0 = eine Wallpaper-Rasterzelle)", String(clockScale()));
          if (next == null) return;
          setClockScale(Number(next));
        }
      }
    );
  }
  if (kind === "panel" && ctx.widgetId === "drives") {
    items.push(
      { sep: true },
      {
        label: "Aktualisieren",
        action: () => fillDrivesStage()
      }
    );
  }
  if (kind === "panel" && ctx.widgetId === "filesearch") {
    items.push(
      { sep: true },
      { label: "Ordner/Netzlaufwerk hinzufügen", action: () => addSearchFolder() },
      { label: "LAN-Pfad hinzufügen", action: () => openLanPathPrompt() },
      { label: "Suchpfade verwalten", action: () => openSearchRootsEditor() },
      { label: "Index neu erstellen", action: () => rebuildFileSearch() }
    );
  }
  if (kind === "desktop") {
    items.push(
      { sep: true },
      {
        label: state.iconView === "list" ? "Als Raster anzeigen" : "Als Liste anzeigen",
        action: () => toggleIconView("desktop")
      },
      {
        label: "Erneut scannen",
        action: () => doScan()
      },
      {
        label: "Desktop-Ordner in VS Code öffnen",
        action: () => openInVsCode(state.bootstrap?.desktop)
      },
      {
        label: "Organisation anzeigen",
        action: async () => {
          try {
            const scan = await window.edex.scan(state.bootstrap.desktop);
            state.scan = scan;
            await refreshPlan();
            const migrate = Boolean(state.settings?.migrateFiles);
            toast(migrate
              ? `Vorschau: ${state.plan?.count || 0} Elemente verschieben`
              : `Vorschau: ${desktopItems().length} Elemente filtern (Dateien werden nicht verschoben)`);
          } catch (err) {
            toast(err.message || "Vorschau nicht möglich");
          }
        }
      },
      {
        label: "Organisation ausführen",
        action: () => runOrganize()
      },
      {
        label: "Organisation konfigurieren",
        action: () => openOrganizerSettings()
      },
      {
        label: "Desktop-Layout speichern",
        action: () => saveDesktopLayout()
      },
      {
        label: "Desktop-Layout zurücksetzen",
        action: () => resetDesktopLayout()
      },
      {
        label: "Letzte Organisation zurücksetzen",
        action: async () => {
          const result = await window.edex.undo();
          toast(result.message);
          await doScan();
        }
      }
    );
  }
  if (kind === "path") {
    const view = ctx.iconView === "list" ? "list" : "grid";
    items.push(
      { sep: true },
      {
        label: view === "list" ? "Als Raster anzeigen" : "Als Liste anzeigen",
        action: () => toggleIconView("path", ctx.id)
      },
      { label: "Diesen Ordner aktivieren", action: () => setActivePath(ctx.id) },
      { label: "Als eDEX-Ordnerfenster öffnen", action: () => setActivePath(ctx.id) },
      { label: "In VS Code öffnen", action: () => openInVsCode(ctx.path) },
      { label: "Pfad ändern", action: () => changePath(ctx.id) },
      { label: "Panel-Namen ändern", action: () => renamePathPanel(ctx.id) },
      { label: "Erneut scannen", action: () => scanCard(state.pathCards.find((c) => c.id === ctx.id)) }
    );
  }
  items.push(
    { sep: true },
    {
      label: "Container schließen",
      action: () => {
        if (locked) {
          toast("Bitte zuerst entsperren, bevor der Container geschlossen wird");
          return;
        }
        ctx.onClose?.();
      }
    }
  );
  return items;
}

function panelSetupId(el) {
  if (el?.dataset?.panelId) return el.dataset.panelId;
  if (el?.id === "card_desktop") return "desktop";
  if (el?.id?.startsWith("path_")) return "path";
  return "panel";
}

function openPanelSetup(el) {
  closeCardMenus();
  const id = panelSetupId(el);
  const title = id === "desktop"
    ? "Systemdesktop"
    : id === "path"
      ? "Ordner-Panel"
      : panelDisplayTitle(id);
  const currentPanelBg = id !== "desktop" && id !== "path" ? colorToFill(state.layout[id]?.bg) : "";
  const bgChoices = [...themeColorSwatches(), { label: "Standard", color: "" }];
  const bgOptions = bgChoices.map((item) => {
    const color = colorToFill(item.color);
    return `<option value="${escapeHtml(item.color || "__default__")}" ${color === currentPanelBg ? "selected" : ""}>${escapeHtml(item.label)}</option>`;
  }).join("");
  const nameSetup = PANEL_META[id] && id !== "desktop"
    ? `<tr><td>Panel-Name / Dock-Beschriftung</td><td><input id="panel-name" type="text" maxlength="48" spellcheck="false" placeholder="${escapeHtml(PANEL_META[id].title)}"></td></tr>`
    : "";
  const body = id === "desktop"
    ? `<tr><td>Ansicht</td><td><select id="panel-desktop-view"><option value="grid">Raster</option><option value="list">Liste</option></select></td></tr>
      <tr><td>Filter</td><td><select id="panel-desktop-filter">
        <option value="all">Alle</option>
        <option value="folders">Ordner</option>
        <option value="icons">Symbole</option>
        <option value="documents">Dokumente</option>
        <option value="images">Bilder</option>
        <option value="videos">Videos</option>
        <option value="audio">Audio</option>
        <option value="archives">Archive</option>
        <option value="apps">Anwendungen</option>
        <option value="other">Sonstige</option>
      </select></td></tr>
      <tr><td>Gruppierung</td><td><input id="panel-desktop-grouped" type="checkbox"> Kategorien gruppieren</td></tr>`
    : id === "clock"
    ? `
      <tr><td>Darstellung</td><td><select id="panel-clock-mode"><option value="digital">Digital</option><option value="analog">Analog</option></select></td></tr>
      <tr><td>Datum</td><td><input id="panel-clock-date" type="checkbox"></td></tr>
      <tr><td>Skalierung</td><td><input id="panel-clock-scale" type="number" min="0.25" max="2" step="0.05"></td></tr>
      <tr><td>Zeitformat</td><td><select id="panel-clock-time-format">
        <option value="24h-seconds">24h · HH:MM:SS</option>
        <option value="24h-short">24h · HH:MM</option>
        <option value="12h-seconds">12h · hh:MM:SS</option>
        <option value="12h-short">12h · hh:MM</option>
      </select></td></tr>
      <tr><td>Datumsformat</td><td><select id="panel-clock-date-format">
        <option value="yy/m/d">YY/M/D</option>
        <option value="dd/mm/yy">DD/MM/YY</option>
        <option value="mm/dd/yy">MM/DD/YY</option>
        <option value="dd.mm.yy">DD.MM.YY</option>
        <option value="yyyy/mm/dd">YYYY/MM/DD</option>
      </select></td></tr>
      <tr><td>Uhr-Hervorhebung</td><td><input id="panel-clock-led" type="color"><input id="panel-clock-led-hex" type="text" spellcheck="false"></td></tr>
      <tr><td>Rastergröße</td><td>${gridSize()} × ${gridSize()} px</td></tr>
      <tr><td>Mindestgröße analog</td><td>${analogClockMinimum().cells} × ${analogClockMinimum().cells} Rasterfelder (${analogClockMinimum().px} × ${analogClockMinimum().px} px)</td></tr>`
    : id === "ram"
      ? `<tr><td>Anzeige</td><td><select id="panel-ram-mode"><option value="used">USED</option><option value="free">FREE</option><option value="cached">CACHED</option><option value="available">AVAILABLE</option><option value="total">TOTAL</option></select></td></tr>`
      : id === "filesearch"
        ? `<tr><td>Schriftgröße</td><td><input id="panel-search-font" type="number" min="8" max="72" step="1"></td></tr>`
        : `<tr><td>Panel-Einstellungen</td><td>Für dieses Panel sind derzeit keine individuellen Optionen vorhanden.</td></tr>`;
  const zoneSetup = PANEL_META[id]
    ? `<tr><td>Positionierungszone</td><td><select id="panel-zone">
        <option value="workspace" ${state.layout[id]?.zone !== "edge" ? "selected" : ""}>Skalierzone</option>
        <option value="edge" ${state.layout[id]?.zone === "edge" ? "selected" : ""}>Randzone</option>
      </select></td></tr>`
    : "";
  const backgroundSetup = id !== "desktop" && id !== "path"
    ? `<tr><td>Hintergrundfarbe</td><td><select id="panel-bg-select">${bgOptions}<option value="__custom__" ${currentPanelBg && !bgChoices.some((item) => colorToFill(item.color) === currentPanelBg) ? "selected" : ""}>Benutzerdefiniert</option></select><input id="panel-bg-custom" type="color" value="${escapeHtml(toHex6(currentPanelBg) || "#05080d")}" title="Benutzerdefinierte Farbe"></td></tr>`
    : "";
  const iconSetup = id !== "desktop" && id !== "path"
    ? `<tr><td>Panel-Icon</td><td><select id="panel-icon-select">${PANEL_ICON_CHOICES.map((icon) => `<option value="${escapeHtml(icon.id)}" ${dockIcon("panel", id) === icon.id ? "selected" : ""}>${escapeHtml(icon.label)}</option>`).join("")}</select></td></tr>`
    : "";
  const modal = document.createElement("div");
  modal.className = "modal_popup info panel-setup-modal";
  modal.innerHTML = `
    <h1>${escapeHtml(title)} - Setup</h1>
    <table><tr><th>Option</th><th>Wert</th></tr>${nameSetup}${zoneSetup}${backgroundSetup}${iconSetup}${body}</table>
    <div class="settings-footer">
      <button type="button" id="panel-setup-save">Speichern</button>
      <button type="button" id="panel-setup-close">Schließen</button>
    </div>`;
  document.body.appendChild(modal);
  placeCentered(modal);
  const clockMode = modal.querySelector("#panel-clock-mode");
  const clockDate = modal.querySelector("#panel-clock-date");
  const clockScaleInput = modal.querySelector("#panel-clock-scale");
  const clockTimeFormatInput = modal.querySelector("#panel-clock-time-format");
  const clockDateFormatInput = modal.querySelector("#panel-clock-date-format");
  const clockLedInput = modal.querySelector("#panel-clock-led");
  const clockLedHexInput = modal.querySelector("#panel-clock-led-hex");
  if (clockMode) clockMode.value = state.settings.clockDisplayMode || "digital";
  if (clockDate) clockDate.checked = state.settings.clockShowDate !== false;
  if (clockScaleInput) clockScaleInput.value = String(state.settings.clockScale || 1);
  if (clockTimeFormatInput) clockTimeFormatInput.value = clockTimeFormat();
  if (clockDateFormatInput) clockDateFormatInput.value = clockDateFormat();
  if (clockLedInput) clockLedInput.value = clockLedColor();
  if (clockLedHexInput) clockLedHexInput.value = clockLedColor();
  const ramMode = modal.querySelector("#panel-ram-mode");
  if (ramMode) ramMode.value = state.settings.ramGaugeMode || "used";
  const searchFont = modal.querySelector("#panel-search-font");
  if (searchFont) searchFont.value = String(state.settings.searchFontSize || 12);
  const desktopView = modal.querySelector("#panel-desktop-view");
  const desktopFilter = modal.querySelector("#panel-desktop-filter");
  const desktopGrouped = modal.querySelector("#panel-desktop-grouped");
  if (desktopView) desktopView.value = state.iconView === "list" ? "list" : "grid";
  if (desktopFilter) desktopFilter.value = state.desktopFilter || "all";
  if (desktopGrouped) desktopGrouped.checked = Boolean(state.desktopGrouped);
  const panelZoneInput = modal.querySelector("#panel-zone");
  const panelNameInput = modal.querySelector("#panel-name");
  const panelIconSelect = modal.querySelector("#panel-icon-select");
  const panelBgSelect = modal.querySelector("#panel-bg-select");
  const panelBgCustom = modal.querySelector("#panel-bg-custom");
  if (panelNameInput) panelNameInput.value = panelDisplayTitle(id);
  panelBgCustom?.addEventListener("input", () => {
    if (panelBgSelect) panelBgSelect.value = "__custom__";
  });
  modal.querySelector("#panel-setup-close")?.addEventListener("click", () => modal.remove());
  modal.querySelector("#panel-setup-save")?.addEventListener("click", async () => {
    const patch = {};
    const panelName = panelNameInput?.value.trim().replace(/\s+/g, " ") || "";
    const previousPanelName = panelDisplayTitle(id);
    const defaultPanelName = PANEL_META[id]?.title || id;
    const nextPanelName = panelName || defaultPanelName;
    const panelNameChanged = Boolean(panelNameInput && nextPanelName !== previousPanelName);
    if (panelNameChanged) {
      state.layout[id] = { ...state.layout[id] };
      if (nextPanelName === defaultPanelName) delete state.layout[id].title;
      else state.layout[id].title = nextPanelName.slice(0, 48);
    }
    const previousZone = state.layout[id]?.zone === "edge" ? "edge" : "workspace";
    const nextZone = panelZoneInput?.value === "edge" ? "edge" : "workspace";
    const zoneChanged = Boolean(PANEL_META[id] && panelZoneInput && nextZone !== previousZone);
    if (zoneChanged) {
      state.layout[id] = { ...state.layout[id], zone: nextZone };
      const zonePosition = findPanelZonePosition(el);
      if (!zonePosition && nextZone === "edge") {
        const movedPanelTitle = panelDisplayTitle(id);
        const target = (state.displays || []).find((display) => display.id !== state.displayId);
        const targetLabel = target?.label || "dem zweiten Monitor";
        const moveToOtherDisplay = Boolean(target && window.confirm(
          `In der Randzone ist kein ausreichender Platz für „${panelDisplayTitle(id)}“. Auf ${targetLabel} verschieben?`
        ));
        if (moveToOtherDisplay) {
          const box = pxToGridFields(el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight);
          const result = await window.edex.transferWidget(target.id, {
            type: "panel",
            id,
            data: { ...state.layout[id] },
            ...box
          });
          if (result?.ok) {
            delete state.layout[id];
            await persistLayout();
            modal.remove();
            rebuildWorkspace();
            toast(`„${movedPanelTitle}“ zu ${targetLabel} verschoben`);
            return;
          }
          toast(result?.message || "Verschieben auf den zweiten Monitor nicht möglich");
        } else {
          toast("Nicht genügend Platz in der Randzone");
        }
        state.layout[id] = { ...state.layout[id], zone: previousZone };
        return;
      }
      repositionPanelInZone(el);
    }
    const previousPanelIcon = id !== "desktop" && id !== "path" ? dockIcon("panel", id) : "";
    const selectedPanelIcon = panelIconSelect?.value || previousPanelIcon;
    const panelIconChanged = selectedPanelIcon && selectedPanelIcon !== previousPanelIcon;
    const selectedBg = panelBgSelect?.value === "__custom__"
      ? (panelBgCustom?.value || "")
      : panelBgSelect?.value === "__default__" ? "" : (panelBgSelect?.value || "");
    const backgroundChanged = id !== "desktop" && id !== "path" && selectedBg !== (state.layout[id]?.bg || "");
    if (backgroundChanged) state.layout[id] = { ...state.layout[id], bg: selectedBg };
    if (id === "clock") {
      patch.clockDisplayMode = clockMode?.value === "analog" ? "analog" : "digital";
      patch.clockShowDate = Boolean(clockDate?.checked);
      patch.clockScale = Math.max(0.25, Math.min(2, Number(clockScaleInput?.value) || 1));
      patch.clockTimeFormat = ["24h-seconds", "24h-short", "12h-seconds", "12h-short"].includes(clockTimeFormatInput?.value)
        ? clockTimeFormatInput.value
        : "24h-seconds";
      patch.clockDateFormat = ["yy/m/d", "dd/mm/yy", "mm/dd/yy", "dd.mm.yy", "yyyy/mm/dd"].includes(clockDateFormatInput?.value)
        ? clockDateFormatInput.value
        : "yy/m/d";
      patch.clockLedColor = toHex6(clockLedHexInput?.value || clockLedInput?.value || clockLedColor());
    } else if (id === "ram") {
      patch.ramGaugeMode = ["used", "free", "cached", "available", "total"].includes(ramMode?.value)
        ? ramMode.value
        : "used";
    } else if (id === "filesearch") {
      patch.searchFontSize = Math.max(8, Math.min(72, Math.round(Number(searchFont?.value) || 12)));
    } else if (id === "desktop") {
      state.iconView = desktopView?.value === "list" ? "list" : "grid";
      state.desktopFilter = desktopFilter?.value || "all";
      state.desktopGrouped = Boolean(desktopGrouped?.checked);
    }
    if (panelIconChanged) state.layout[id] = { ...state.layout[id], icon: selectedPanelIcon };
    const desktopChanged = id === "desktop";
    if (!Object.keys(patch).length && !zoneChanged && !backgroundChanged && !panelIconChanged && !panelNameChanged && !desktopChanged) {
      modal.remove();
      return;
    }
    try {
      if (Object.keys(patch).length) {
        const result = await window.edex.saveSettings(patch);
        state.settings = result.settings || { ...state.settings, ...patch };
      }
      if (zoneChanged) persistLayout();
      if (backgroundChanged || panelIconChanged || panelNameChanged) persistLayout();
      if (desktopChanged) persistLayout();
      if (id === "clock" && patch.clockDisplayMode === "analog" && state.layout.clock) {
        const minimum = analogClockMinimum().px;
        const box = pxFromBox(state.layout.clock);
        applyBoxPx(state.layout.clock, box.x, box.y, Math.max(box.w, minimum), Math.max(box.h, minimum));
        persistLayout();
      }
      modal.remove();
      rebuildWorkspace();
    } catch (error) {
      toast(error?.message || "Panel-Einstellungen konnten nicht gespeichert werden");
    }
  });
}

function bindCardTools(el, getItems) {
  el.querySelectorAll('[data-card-act="minimize"]').forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => event.stopPropagation());
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const cardId = el.id || "";
      if (cardId === "card_desktop") {
        minimizeContainer("desktop", "desktop");
      } else if (cardId.startsWith("path_")) {
        minimizeContainer("path", cardId.slice(5));
      } else if (cardId.startsWith("card_")) {
        minimizeContainer("panel", cardId.slice(5));
      }
    });
    el.querySelectorAll('[data-card-act="snap"]').forEach((btn) => {
      btn.addEventListener("pointerdown", (event) => event.stopPropagation());
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const snapItems = getItems().filter((item) => item.label && /^1\/4 /.test(item.label));
        openCardMenu(btn, snapItems, { x: event.clientX, y: event.clientY });
      });
    });
  });
  el.querySelectorAll('[data-card-act="settings"]').forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => event.stopPropagation());
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPanelSetup(el);
    });
  });
  el.querySelectorAll('[data-card-act="more"]').forEach((btn) => {
    btn.addEventListener("pointerdown", (event) => event.stopPropagation());
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCardMenu(btn, getItems());
    });
  });
  el.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".path-stage, #desktop-stage, #shortcuts-stage, .desk-icon, .fs-row, .drives-stage, .drive-row")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  });
}

function applyCardBg(el, color) {
  if (!el) return;
  const value = colorToFill(color);
  el.classList.toggle("has-custom-bg", Boolean(value));
  if (!value) {
    el.style.removeProperty("--card-bg");
    el.style.removeProperty("background");
    el.style.removeProperty("background-color");
    el.querySelectorAll(".card-title, .card-body, .path-stage, #desktop-stage").forEach((node) => {
      node.style.removeProperty("background");
      node.style.removeProperty("background-color");
    });
    return;
  }
  el.style.setProperty("--card-bg", value);
  el.style.background = value;
  el.style.backgroundColor = value;
  el.querySelectorAll(":scope > .card-title, :scope > .card-body").forEach((node) => {
    node.style.background = value;
    node.style.backgroundColor = value;
  });
}

function colorToFill(color) {
  if (color == null || color === false) return "";
  const s = String(color).trim();
  if (!s || s === "transparent" || s === "none") return "";
  const rgba = s.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (rgba) {
    return `rgba(${Math.round(Number(rgba[1]))}, ${Math.round(Number(rgba[2]))}, ${Math.round(Number(rgba[3]))}, ${Number(rgba[4])})`;
  }
  const rgb = s.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (rgb) {
    return `rgb(${Math.round(Number(rgb[1]))}, ${Math.round(Number(rgb[2]))}, ${Math.round(Number(rgb[3]))})`;
  }
  const hex = s.replace("#", "");
  if (hex.length === 3) {
    const r = hex[0] + hex[0];
    const g = hex[1] + hex[1];
    const b = hex[2] + hex[2];
    return `#${r}${g}${b}`;
  }
  if (hex.length === 6 || hex.length === 8) return `#${hex.slice(0, 6)}`;
  const parsed = parseLedColor(s);
  if (parsed) return rgbToHex(parsed.r, parsed.g, parsed.b);
  return s;
}

function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Number(n) || 0)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function themeColorSwatches() {
  const colors = state.theme?.colors || {};
  const term = state.theme?.terminal || {};
  const globe = state.theme?.globe || {};
  const accent = rgbToHex(colors.r, colors.g, colors.b);
  const list = [
    { label: "Theme-Farbe", color: accent },
    { label: "Theme-Farbe 55%", color: `rgba(${Number(colors.r) || 170}, ${Number(colors.g) || 207}, ${Number(colors.b) || 209}, 0.55)` },
    { label: "Dunkler Hintergrund", color: colors.light_black || "#05080d" },
    { label: "Schwarz", color: colors.black || "#000000" },
    { label: "Grau", color: colors.grey || "#262828" },
    { label: "Terminal-Vordergrund", color: term.foreground },
    { label: "Terminal-Hintergrund", color: term.background },
    { label: "Globus", color: globe.base },
    { label: "Markierung", color: globe.marker },
    { label: "Rot", color: "#ff3c3c" },
    { label: "Gelb", color: "#ffd23c" }
  ].filter((item) => item.color);
  const seen = new Set();
  return list.filter((item) => {
    const key = String(item.color).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickCardBackground(ctx) {
  closeCardMenus();
  window.edex?.setMouseIgnore?.(false);
  const palette = document.createElement("div");
  palette.className = "color-palette";
  const swatches = [...themeColorSwatches(), { label: "Standard", color: "" }];
  const current = colorToFill(ctx.getBg?.()) || "#05080d";
  const pickerValue = current.startsWith("#") ? current : (toHex6(current) || "#05080d");
  palette.innerHTML = `
    <div class="color-palette-title">Panel-Hintergrund</div>
    <label class="color-palette-custom">Benutzerdefiniert
      <input type="color" id="card_bg_picker" value="${escapeHtml(pickerValue)}">
    </label>
    <div class="color-palette-grid">
      ${swatches.map((item, i) => {
        const fill = item.color ? colorToFill(item.color) : "transparent";
        const extra = item.color ? "" : " none";
        return `<button type="button" class="color-swatch${extra}" data-idx="${i}" title="${escapeHtml(item.label)}" style="background:${escapeHtml(fill)}">${item.color ? "" : "×"}</button>`;
      }).join("")}
    </div>
  `;
  document.body.appendChild(palette);
  const rect = ctx.el?.getBoundingClientRect?.() || { right: 80, top: 80 };
  const pw = palette.offsetWidth;
  const ph = palette.offsetHeight;
  let left = rect.right - pw;
  let top = rect.top + 36;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, rect.top - ph - 8);
  palette.style.left = `${left}px`;
  palette.style.top = `${top}px`;
  let picking = false;
  const paint = (color) => {
    ctx.setBg?.(color);
    applyCardBg(ctx.el, color);
    persistLayout();
  };
  palette.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    window.edex?.setMouseIgnore?.(false);
  }, true);
  palette.querySelectorAll("[data-idx]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const item = swatches[Number(btn.dataset.idx)];
      paint(item?.color || "");
      closeCardMenus();
    });
  });
  const picker = palette.querySelector("#card_bg_picker");
  picker?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    picking = true;
    window.edex?.setMouseIgnore?.(false);
  });
  picker?.addEventListener("input", () => paint(picker.value));
  picker?.addEventListener("change", () => {
    paint(picker.value);
    picking = false;
    closeCardMenus();
  });
  const dismiss = (event) => {
    if (picking || palette.contains(event.target)) return;
    closeCardMenus();
    window.removeEventListener("pointerdown", dismiss, true);
  };
  setTimeout(() => window.addEventListener("pointerdown", dismiss, true), 0);
}

function bindFileDrop(el, getDest, onDone) {
  el.addEventListener("dragover", (event) => {
    if (![...event.dataTransfer.types].includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    el.classList.add("drop-target");
  });
  el.addEventListener("dragleave", (event) => {
    if (!el.contains(event.relatedTarget)) el.classList.remove("drop-target");
  });
  el.addEventListener("drop", async (event) => {
    event.preventDefault();
    el.classList.remove("drop-target");
    const dest = getDest?.();
    const files = [...(event.dataTransfer.files || [])]
      .map((f) => window.edex.pathForFile?.(f) || f.path)
      .filter(Boolean);
    if (!dest || !files.length) {
      toast("此容器無法接收檔案");
      return;
    }
    try {
      const result = await window.edex.importFiles(dest, files);
      toast(`已加入 ${result.count} 個項目`);
      // Refresh immediately so dropped files appear without waiting on a slow full scan.
      await onDone?.(result);
    } catch (err) {
      toast(err.message || "加入失敗");
    }
  });
}

function closePanel(id) {
  if (id === "cockpit") {
    if (state.cockpitRaf) cancelAnimationFrame(state.cockpitRaf);
    if (state.cockpitMatrixTimer) clearInterval(state.cockpitMatrixTimer);
    state.cockpitRaf = null;
    state.cockpitMatrixTimer = null;
  }
  if (id === "cassette" && state.cassetteRaf) {
    cancelAnimationFrame(state.cassetteRaf);
    state.cassetteRaf = null;
  }
  if (id === "ddj") {
    if (state.ddjRaf) cancelAnimationFrame(state.ddjRaf);
    state.ddjRaf = null;
    try { state.ddjResizeObs?.disconnect?.(); } catch { /* ignore */ }
    state.ddjResizeObs = null;
  }
  if (id === "cpuRail") {
    if (state.cpuRailRaf) {
      cancelAnimationFrame(state.cpuRailRaf);
      state.cpuRailRaf = null;
    }
    if (state.cpuRailTimer) {
      clearInterval(state.cpuRailTimer);
      state.cpuRailTimer = null;
    }
    try { state.cpuRailResizeObs?.disconnect?.(); } catch { /* ignore */ }
    state.cpuRailResizeObs = null;
    if (state.cpuRailVisHandler) {
      document.removeEventListener("visibilitychange", state.cpuRailVisHandler);
      state.cpuRailVisHandler = null;
    }
  }
  if (id === "dock") {
    window.dockPanel?.unbind?.(state);
    state.settings = { ...state.settings, dockEnabled: false };
    window.edex?.saveSettings?.({ dockEnabled: false }).catch?.(() => {});
  }
  delete state.layout[id];
  document.querySelectorAll(`#card_${id}, [data-panel-id="${id}"]`).forEach((el) => el.remove());
  // Persist current display first, then strip this id from every saved layout.
  Promise.resolve(persistLayout())
    .then(() => purgePanelFromSavedLayouts(id))
    .catch(() => {});
  toast(`已關閉「${PANEL_META[id]?.title || id}」`);
}

function minimizeContainer(kind, id) {
  if (kind === "panel") {
    if (!state.layout[id] || id === "dock") return;
    state.layout[id] = { ...state.layout[id], minimized: true };
  } else if (kind === "desktop") {
    if (!state.desktopStage) return;
    state.desktopStage = { ...state.desktopStage, minimized: true };
  } else if (kind === "path") {
    const card = state.pathCards.find((item) => item.id === id);
    if (!card) return;
    card.minimized = true;
  } else {
    return;
  }
  persistLayout();
  rebuildWorkspace();
  const label = kind === "panel" ? PANEL_META[id]?.title : kind === "desktop" ? "系統桌面" : pathTitle(state.pathCards.find((item) => item.id === id), 0);
  toast(`已最小化「${label || id}」`);
}

function closeDesktopCard() {
  state.desktopEnabled = false;
  document.getElementById("card_desktop")?.remove();
  persistLayout();
  toast("已關閉桌面容器");
}

/** Reopen the picker only after the folder chooser returns. */
let keepAddPicker = false;

function closeAddPicker() {
  keepAddPicker = false;
  document.getElementById("addPickerModal")?.remove();
}

function ensureDesktopCard() {
  if (!state.primary) {
    toast("系統桌面僅能顯示在主顯示器");
    return;
  }
  if (state.desktopEnabled !== false) {
    toast("桌面容器已存在");
    return;
  }
  closeAddPicker();
  state.desktopEnabled = true;
  state.desktopStage = findEmptyBox(state.desktopStage || defaultDesktop(), { desktop: true });
  persistLayout();
  rebuildWorkspace();
  toast("Desktop-Container hinzugefügt");
}

function dockEnabled() {
  return state.displayDockEnabled == null
    ? state.settings?.dockEnabled !== false
    : state.displayDockEnabled;
}

function syncDockLayout(enabled) {
  if (!PANEL_META.dock) {
    if (state.layout.dock) delete state.layout.dock;
    window.dockPanel?.unbind?.(state);
    return;
  }
  if (enabled) {
    if (!state.layout.dock) {
      state.layout.dock = { ...PANEL_META.dock.box, locked: true };
    } else {
      state.layout.dock = { ...state.layout.dock, locked: true };
    }
    if (!state.layout.taskdock) state.layout.taskdock = { ...PANEL_META.taskdock.box };
  } else if (state.layout.dock) {
    delete state.layout.dock;
    delete state.layout.taskdock;
    window.dockPanel?.unbind?.(state);
  }
}

async function setDockEnabled(on) {
  const enabled = Boolean(on);
  state.displayDockEnabled = enabled;
  if (state.primary) state.settings = { ...state.settings, dockEnabled: enabled };
  syncDockLayout(enabled);
  try {
    if (state.primary) await window.edex.saveSettings({ dockEnabled: enabled });
  } catch {
    // keep local
  }
  await persistLayout();
  rebuildWorkspace();
  toast(enabled ? `${state.settings.dockPosition === "top" ? "Oberes" : "Unteres"} Dock aktiviert` : "Dock deaktiviert");
}

async function addPanel(id) {
  if (!PANEL_META[id]) return;
  if (id === "dock") {
    await setDockEnabled(true);
    return;
  }
  if (state.layout[id]) {
    toast("此顯示器已有該插件");
    return;
  }
  closeAddPicker();
  state.layout[id] = findEmptyBox({ ...PANEL_META[id].box }, { panelId: id });
  try {
    await persistLayout();
  } catch (error) {
    delete state.layout[id];
    toast(error?.message || "Panel konnte nicht gespeichert werden");
    return;
  }
  rebuildWorkspace();
  toast(`Panel „${PANEL_META[id].title}“ hinzugefügt`);
}

function openAddPicker() {
  document.getElementById("addPickerModal")?.remove();
  document.getElementById("addPicker")?.closest(".modal_popup")?.remove();
  keepAddPicker = true;
  // Dock is toggled separately — not listed as a placeable panel.
  const panelExistsOnDisplay = (id) => Boolean(
    state.layout[id] || document.getElementById(`card_${id}`)
  );
  const missing = Object.keys(PANEL_META).filter((id) => {
    if (id === "status" || id === "dock" || panelExistsOnDisplay(id)) return false;
    return true;
  });
  const deskDisabled = !state.primary || state.desktopEnabled !== false;
  const dockOn = dockEnabled();
  const dockFrame = String(state.settings?.dockFrameStyle || "rounded");
  const dockPosition = String(state.settings?.dockPosition || "bottom");
  const dockW = window.dockPanel?.dockWidth?.(state)
    ?? (Number(state.settings?.dockWidth) || 720);
  const dockH = window.dockPanel?.dockHeight?.(state)
    ?? (Number(state.settings?.dockHeight) || 72);
  const modal = document.createElement("div");
  modal.id = "addPickerModal";
  modal.className = "modal_popup info central-settings-modal";
  modal.innerHTML = `
    <h1>Container hinzufügen</h1>
    <h2>Plugin-Schalter</h2>
    <div class="action-row" style="align-items:center;gap:0.8rem;flex-wrap:wrap;">
      ${`<label style="display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;">
            <input type="checkbox" id="toggle-dock" ${dockOn ? "checked" : ""}>
            <span data-dock-label>${dockPosition === "top" ? "Oberes Dock (am oberen Bildschirmrand)" : "Unteres Dock (am unteren Bildschirmrand)"}</span>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;opacity:${dockOn ? 1 : 0.45};">
            <span>Position</span>
            <select id="dock-position" ${dockOn ? "" : "disabled"}>
              <option value="bottom" ${dockPosition === "bottom" ? "selected" : ""}>Unten</option>
              <option value="top" ${dockPosition === "top" ? "selected" : ""}>Oben</option>
            </select>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;opacity:${dockOn ? 1 : 0.45};">
            <span>Rahmen</span>
            <select id="dock-frame-style" ${dockOn ? "" : "disabled"}>
              <option value="rounded" ${dockFrame === "rounded" ? "selected" : ""}>Abgerundet</option>
              <option value="trapezoid" ${dockFrame === "trapezoid" ? "selected" : ""}>Trapez</option>
              <option value="rect" ${dockFrame === "rect" ? "selected" : ""}>Rechteckig</option>
            </select>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;opacity:${dockOn ? 1 : 0.45};">
            <span>Breite</span>
            <input id="dock-width" type="number" min="200" max="2400" step="10" value="${dockW}" ${dockOn ? "" : "disabled"} style="width:5.5rem;">
            <span>px</span>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;opacity:${dockOn ? 1 : 0.45};">
            <span>Höhe</span>
            <input id="dock-height" type="number" min="40" max="160" step="2" value="${dockH}" ${dockOn ? "" : "disabled"} style="width:4.5rem;">
            <span>px</span>
          </label>`}
    </div>
    <h2>Windows-Fenstereinbettung</h2>
    <div class="action-row" style="align-items:center;gap:0.5rem;flex-wrap:wrap;">
      <button type="button" id="embed-refresh">Fenster laden</button>
      <select id="embed-window" aria-label="Fenster auswählen" style="min-width:16rem;max-width:100%;">
        <option value="">Noch keine Fenster geladen</option>
      </select>
      <button type="button" id="embed-attach">Andocken</button>
      <button type="button" id="embed-release">Freigeben</button>
    </div>
    <h2>Plugin-Panels${state.primary ? "" : " (für diesen Bildschirm auswählbar)"}</h2>
    <div class="action-row" id="addPicker">
      ${missing.length
        ? missing.map((id) =>
          `<button type="button" data-add-panel="${id}">${escapeHtml(PANEL_META[id].title)}</button>`
        ).join("")
        : "<span style='opacity:.6'>Alle Plugin-Panels wurden bereits hinzugefügt</span>"}
    </div>
    <h2>Sonstige</h2>
    <div class="action-row">
      ${state.primary
        ? `<button type="button" id="add-desktop" ${deskDisabled ? "disabled" : ""}>Desktop-Container</button>`
        : `<span style="opacity:.6">Systemdesktop nur auf dem Hauptbildschirm</span>`}
      <button type="button" id="add-path">Ordner-Panel</button>
    </div>
    <p style="opacity:.55;margin:1vh 0 0;font-size:0.85em;">Du kannst mehrere Elemente hinzufügen und danach schließen.</p>
    <div style="margin-top:1.2vh;display:flex;justify-content:flex-end;">
      <button type="button" id="add-cancel">Schließen</button>
    </div>
  `;

  const wrapSettingsSection = (title, table, open = false) => {
    const details = document.createElement("details");
    details.className = "settings-section";
    details.open = open;
    const summary = document.createElement("summary");
    summary.textContent = title;
    details.append(summary, table);
    return details;
  };
  const languageHeading = modal.querySelector("h2");
  const languageTable = languageHeading?.nextElementSibling;
  if (languageHeading && languageTable?.tagName === "TABLE") {
    languageHeading.replaceWith(wrapSettingsSection(languageHeading.textContent, languageTable, true));
  }
  const appearanceHeading = modal.querySelector("h2");
  const editor = modal.querySelector("#settingsEditor");
  if (appearanceHeading && editor) {
    const rows = [...editor.querySelectorAll("tbody > tr")];
    const header = rows.shift();
    const rowContains = (row, id) => Boolean(row.querySelector(`#${id}`));
    const windowsStart = rows.findIndex((row) => rowContains(row, "set-windows-colors"));
    const displayEnd = rows.findIndex((row) => rowContains(row, "set-grid"));
    const clockEnd = rows.findIndex((row) => rowContains(row, "set-search-font"));
    const cuts = [
      ["Anzeige & Theme", 0, windowsStart < 0 ? displayEnd : windowsStart, true],
      ["Windows-Integration", windowsStart < 0 ? displayEnd : windowsStart, displayEnd < 0 ? rows.length : displayEnd, false],
      ["Uhr", displayEnd < 0 ? rows.length : displayEnd, clockEnd < 0 ? rows.length : clockEnd, false],
      ["Interface & Code-Hintergrund", clockEnd < 0 ? rows.length : clockEnd, rows.length, false]
    ];
    const fragment = document.createDocumentFragment();
    for (const [title, start, end, open] of cuts) {
      const table = editor.cloneNode(false);
      table.removeAttribute("id");
      table.classList.add("settings-section-table");
      const body = document.createElement("tbody");
      if (header) body.appendChild(header.cloneNode(true));
      rows.slice(start, end).forEach((row) => body.appendChild(row));
      table.appendChild(body);
      if (start === 0) table.id = "settingsEditor";
      fragment.appendChild(wrapSettingsSection(title, table, open));
    }
    appearanceHeading.replaceWith(fragment);
    editor.remove();
  }
  document.body.appendChild(modal);
  window.edexI18n?.translatePage?.(modal);
  placeCentered(modal, { width: Math.min(520, window.innerWidth * 0.45), topRatio: 0.18 });
  modal.querySelector("#add-cancel").onclick = () => {
    closeAddPicker();
  };
  modal.querySelector("#toggle-dock")?.addEventListener("change", (event) => {
    setDockEnabled(event.target.checked);
  });
  modal.querySelector("#dock-position")?.addEventListener("change", (event) => {
    const next = event.target.value === "top" ? "top" : "bottom";
    window.dockPanel?.setPosition?.(state, next);
    persistLayout();
    const label = modal.querySelector("[data-dock-label]");
    if (label) label.textContent = next === "top" ? "Oberes Dock (am oberen Bildschirmrand)" : "Unteres Dock (am unteren Bildschirmrand)";
    toast(`Dock-Position: ${next === "top" ? "oben" : "unten"}`);
  });
  modal.querySelector("#dock-frame-style")?.addEventListener("change", (event) => {
    window.dockPanel?.setFrameStyle?.(state, event.target.value);
    persistLayout();
    toast(`Dock 外框：${event.target.selectedOptions?.[0]?.text || event.target.value}`);
  });
  const applyDockSizeFromInputs = () => {
    const wEl = modal.querySelector("#dock-width");
    const hEl = modal.querySelector("#dock-height");
    window.dockPanel?.setSize?.(state, {
      width: Number(wEl?.value),
      height: Number(hEl?.value)
    });
    persistLayout();
  };
  modal.querySelector("#dock-width")?.addEventListener("change", applyDockSizeFromInputs);
  modal.querySelector("#dock-height")?.addEventListener("change", applyDockSizeFromInputs);
  const embedSelect = modal.querySelector("#embed-window");
  const refreshEmbedWindows = async () => {
    if (!embedSelect) return;
    embedSelect.replaceChildren(new Option("Fenster werden geladen ...", ""));
    try {
      const result = await window.edex?.listEmbedWindows?.();
      embedSelect.replaceChildren();
      for (const item of result?.items || []) {
        const option = new Option(`${item.title} (${item.process || "unbekannt"})`, item.hwnd);
        option.dataset.pid = String(item.pid || 0);
        embedSelect.append(option);
      }
      if (!embedSelect.options.length) embedSelect.append(new Option("Keine Fenster gefunden", ""));
    } catch {
      embedSelect.replaceChildren(new Option("Fensterliste nicht verfügbar", ""));
    }
  };
  modal.querySelector("#embed-refresh")?.addEventListener("click", refreshEmbedWindows);
  modal.querySelector("#embed-attach")?.addEventListener("click", async () => {
    const option = embedSelect?.selectedOptions?.[0];
    const bounds = window.dockPanel?.embedBounds?.();
    if (!option?.value || !bounds) return toast("Bitte zuerst ein Fenster laden und auswählen");
    if (state.dockEmbed?.hwnd) await window.edex?.embedRelease?.({ hwnd: state.dockEmbed.hwnd });
    try {
      const result = await window.edex.embedAttach({
        hwnd: option.value,
        pid: Number(option.dataset.pid) || 0,
        bounds
      });
      if (!result?.ok) throw new Error("Andocken fehlgeschlagen");
      state.dockEmbed = { hwnd: option.value, pid: Number(option.dataset.pid) || 0 };
      toast("Fenster im Dock angedockt");
      window.dockPanel?.syncEmbedBounds?.(state);
    } catch (error) {
      toast(error?.message || "Andocken fehlgeschlagen");
    }
  });
  modal.querySelector("#embed-release")?.addEventListener("click", async () => {
    const hwnd = state.dockEmbed?.hwnd;
    if (!hwnd) return toast("Kein Fenster angedockt");
    await window.edex?.embedRelease?.({ hwnd });
    delete state.dockEmbed;
    toast("Fenster freigegeben");
  });
  modal.querySelectorAll("[data-add-panel]").forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      await addPanel(btn.dataset.addPanel);
    };
  });
  modal.querySelector("#add-desktop")?.addEventListener("click", () => {
    ensureDesktopCard();
  });
  modal.querySelector("#add-path").onclick = async () => {
    // Folder dialog steals focus; reopen picker after pick completes.
    modal.style.visibility = "hidden";
    await addPathCard();
    if (keepAddPicker) openAddPicker();
  };
}

function stopPluginRuntimes() {
  if (state.cockpitRaf) {
    cancelAnimationFrame(state.cockpitRaf);
    state.cockpitRaf = null;
  }
  if (state.cockpitMatrixTimer) {
    clearInterval(state.cockpitMatrixTimer);
    state.cockpitMatrixTimer = null;
  }
  if (state.cassetteRaf) {
    cancelAnimationFrame(state.cassetteRaf);
    state.cassetteRaf = null;
  }
  if (state.ddjRaf) {
    cancelAnimationFrame(state.ddjRaf);
    state.ddjRaf = null;
  }
  try { state.ddjResizeObs?.disconnect?.(); } catch { /* ignore */ }
  state.ddjResizeObs = null;
  if (state.cpuRailRaf) {
    cancelAnimationFrame(state.cpuRailRaf);
    state.cpuRailRaf = null;
  }
  if (state.cpuRailTimer) {
    clearInterval(state.cpuRailTimer);
    state.cpuRailTimer = null;
  }
  try { state.cpuRailResizeObs?.disconnect?.(); } catch { /* ignore */ }
  state.cpuRailResizeObs = null;
  if (state.cpuRailVisHandler) {
    document.removeEventListener("visibilitychange", state.cpuRailVisHandler);
    state.cpuRailVisHandler = null;
  }
  window.dockPanel?.unbind?.(state);
  if (state.weatherTimer) {
    clearInterval(state.weatherTimer);
    state.weatherTimer = null;
  }
  if (state.dockRaf) {
    cancelAnimationFrame(state.dockRaf);
    state.dockRaf = null;
  }
}

function weatherLabel(code) {
  const labels = {
    de: {
      0: "Klar", 1: "Überwiegend klar", 2: "Teilweise bewölkt", 3: "Bedeckt",
      45: "Nebel", 48: "Reifnebel", 51: "Leichter Nieselregen", 53: "Nieselregen",
      55: "Starker Nieselregen", 61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
      71: "Leichter Schneefall", 73: "Schneefall", 75: "Starker Schneefall",
      80: "Regenschauer", 81: "Regenschauer", 82: "Starke Regenschauer",
      95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel"
    },
    en: {
      0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
      55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
      71: "Light snow", 73: "Snow", 75: "Heavy snow",
      80: "Rain showers", 81: "Rain showers", 82: "Heavy rain showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"
    },
    "zh-Hant": {
      0: "晴朗", 1: "大致晴朗", 2: "局部多雲", 3: "陰天",
      45: "霧", 48: "霜霧", 51: "小毛毛雨", 53: "毛毛雨",
      55: "大毛毛雨", 61: "小雨", 63: "下雨", 65: "大雨",
      71: "小雪", 73: "降雪", 75: "大雪",
      80: "陣雨", 81: "陣雨", 82: "大陣雨",
      95: "雷雨", 96: "雷雨伴隨冰雹", 99: "雷雨伴隨冰雹"
    }
  };
  const locale = window.edexI18n?.locale?.() || "de";
  return labels[locale]?.[Number(code)] || labels.de[Number(code)] || (locale === "en" ? "Unknown" : locale === "zh-Hant" ? "未知" : "Unbekannt");
}

function weatherIcon(code) {
  const value = Number(code);
  if (value === 0) return "☀";
  if (value <= 3) return "☁";
  if (value >= 71 && value <= 77) return "❄";
  if (value >= 95) return "⚡";
  if (value >= 51) return "☂";
  return "◌";
}

function bindWeatherPanel() {
  const root = document.querySelector(".weather-root");
  if (!root || !window.edex?.getWeather) return;
  const locationInput = root.querySelector("[data-weather-location]");
  const status = root.querySelector("[data-weather-status]");
  const current = root.querySelector("[data-weather-current]");
  const days = root.querySelector("[data-weather-days]");
  let request = 0;
  const load = async () => {
    const token = ++request;
    const location = locationInput?.value?.trim() || "Berlin";
    const locale = window.edexI18n?.locale?.() || "de";
    const text = locale === "en"
      ? { loading: "Loading weather …", updated: "updated", unavailable: "Weather unavailable", search: "Search location …", refresh: "Refresh weather", felt: "Feels like", wind: "Wind" }
      : locale === "zh-Hant"
        ? { loading: "正在載入天氣…", updated: "更新於", unavailable: "無法取得天氣", search: "搜尋地點…", refresh: "更新天氣", felt: "體感", wind: "風速" }
        : { loading: "Wetter wird geladen …", updated: "aktualisiert", unavailable: "Wetter nicht verfügbar", search: "Ort suchen …", refresh: "Wetter aktualisieren", felt: "Gefühlt", wind: "Wind" };
    if (locationInput) locationInput.placeholder = text.search;
    root.querySelector("[data-weather-refresh]")?.setAttribute("title", text.refresh);
    status.textContent = text.loading;
    try {
      const data = await window.edex.getWeather(location);
      if (token !== request) return;
      const now = data.current || {};
      const dateLocale = locale === "en" ? "en-US" : locale === "zh-Hant" ? "zh-TW" : "de-DE";
      const todayLabel = new Date().toLocaleDateString(dateLocale, { weekday: "long" });
      current.innerHTML = `
        <div class="weather-current-day">${escapeHtml(todayLabel)}</div>
        <div class="weather-main"><span class="weather-icon">${weatherIcon(now.weather_code)}</span><strong>${Math.round(Number(now.temperature_2m) || 0)}°</strong></div>
        <div class="weather-condition">${escapeHtml(weatherLabel(now.weather_code))}</div>
        <div class="weather-meta">${text.felt} ${Math.round(Number(now.apparent_temperature) || 0)}° · ${Math.round(Number(now.relative_humidity_2m) || 0)}% · ${text.wind} ${Math.round(Number(now.wind_speed_10m) || 0)} km/h</div>`;
      const daily = data.daily || {};
      const dates = daily.time || [];
      days.innerHTML = dates.slice(0, 4).map((date, index) => {
        const day = new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "short" }).toUpperCase();
        return `<div class="weather-day"><span>${escapeHtml(day)}</span><b>${weatherIcon(daily.weather_code?.[index])}</b><strong>${Math.round(Number(daily.temperature_2m_max?.[index]) || 0)}°</strong><small>${Math.round(Number(daily.temperature_2m_min?.[index]) || 0)}°</small></div>`;
      }).join("");
      const timeLocale = locale === "en" ? "en-US" : locale === "zh-Hant" ? "zh-TW" : "de-DE";
      status.textContent = `${data.location} · ${text.updated} ${new Date().toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}`;
    } catch (error) {
      status.textContent = error?.message || text.unavailable;
      current.innerHTML = "";
      days.innerHTML = "";
    }
  };
  locationInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      load();
    }
  });
  root.querySelector("[data-weather-refresh]")?.addEventListener("click", load);
  load();
  state.weatherTimer = setInterval(load, 15 * 60 * 1000);
}

function buildLayout() {
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
    cancelAnimationFrame(state.clockTimer);
    state.clockTimer = null;
  }
  stopPluginRuntimes();
  window.edexEffects?.stop?.();
  if (state.taskDockEmbed?.hwnd) {
    window.edex?.embedRelease?.({ hwnd: state.taskDockEmbed.hwnd });
    delete state.taskDockEmbed;
    removeTaskEmbedFrame();
  }
  delete state.layout.status;

  const panels = Object.keys(PANEL_META).map((id) => panelHtml(id)).join("");
  const deskLocked = Boolean(state.desktopLocked);
  const desktop = state.desktopEnabled === false || state.desktopStage?.minimized ? "" : `
      <section class="desktop-card${deskLocked ? " locked" : ""}" id="card_desktop" style="${styleFromBox(state.desktopStage)}">
        <h3 class="card-title">
          <span class="card-title-text">Systemdesktop</span>
          ${cardToolsHtml()}
        </h3>
        <div class="card-body">
          <p class="path-text" id="desktop-path-text" title="${escapeHtml(state.bootstrap?.desktop || "")}">${escapeHtml(state.bootstrap?.desktop || "")}</p>
          <div class="desk-tab-bar" id="desk-tab-bar"></div>
          <div class="desk-filter-bar" id="desk-filter-bar">
            ${DESK_FILTERS.map((item) => `<button type="button" data-desk-filter="${item.id}">${item.label}</button>`).join("")}
          </div>
          <div id="desktop-stage" class="view-${state.iconView}"></div>
        </div>
        <div class="resize-handle"></div>
      </section>`;

  document.body.innerHTML = `
    <div id="workspace">
      <div id="zone-overlay" aria-hidden="true"></div>
      <div id="snap-guides"></div>
      ${desktop}
      ${panels}
    </div>
    <div id="fab-bar">${fabBarHtml()}</div>
  `;
  renderDockItems();

  let zoneAdjusted = false;
  Object.keys(state.layout).forEach((id) => {
    if (id === "status") return;
    const el = document.getElementById(`card_${id}`);
    if (!el) return;
    zoneAdjusted = clampPanelToZone(el) || zoneAdjusted;
    bindCardTools(el, () => menuItemsForCard("panel", {
      el,
      locked: Boolean(state.layout[id]?.locked),
      widgetType: "panel",
      widgetId: id,
      fixedDisplayId: state.layout[id]?.fixedDisplayId,
      widgetData: () => ({ panelId: id, box: state.layout[id] }),
      getBg: () => state.layout[id]?.bg || "",
      setBg: (color) => {
        state.layout[id] = { ...state.layout[id], bg: color };
        persistLayout();
      },
      onTransferred: () => {
        delete state.layout[id];
        el.remove();
        persistLayout();
        window.edexEffects?.stop?.();
        window.edexEffects?.start?.();
      },
      onLock: () => {
        state.layout[id] = { ...state.layout[id], locked: !state.layout[id].locked };
        setCardLocked(el, Boolean(state.layout[id].locked));
        persistLayout();
      },
          setFixedDisplay: (displayId) => {
            state.layout[id] = { ...state.layout[id], fixedDisplayId: displayId };
            persistLayout();
          },
      onClose: () => closePanel(id)
    }));
    applyCardBg(el, state.layout[id]?.bg);
    makeInteractive(el, {
      widgetType: "panel",
      widgetId: id,
      minW: id === "clock" && clockDisplayMode() === "analog" ? analogClockMinimum().px : undefined,
      minH: id === "clock" && clockDisplayMode() === "analog" ? analogClockMinimum().px : undefined,
      widgetData: () => ({ panelId: id, box: state.layout[id] }),
      onTransferred: () => {
        delete state.layout[id];
        el.remove();
        persistLayout();
        window.edexEffects?.stop?.();
        window.edexEffects?.start?.();
      },
      onMove: (x, y, w, h) => {
        applyBoxPx(state.layout[id], x, y, w, h);
      }
    });
  });
  if (zoneAdjusted) persistLayout();

  const desk = document.getElementById("card_desktop");
  if (desk) {
    bindCardTools(desk, () => menuItemsForCard("desktop", {
      el: desk,
      locked: state.desktopLocked,
      widgetType: "desktop",
      widgetId: "desktop",
      widgetData: () => ({ box: state.desktopStage }),
      getBg: () => state.desktopStage?.bg || "",
      setBg: (color) => {
        state.desktopStage = { ...state.desktopStage, bg: color };
        persistLayout();
      },
      onTransferred: () => {
        state.desktopEnabled = false;
        persistLayout();
        desk.remove();
      },
      onLock: () => {
        state.desktopLocked = !state.desktopLocked;
        setCardLocked(desk, state.desktopLocked);
        persistLayout();
      },
      onClose: () => closeDesktopCard()
    }));
    applyCardBg(desk, state.desktopStage?.bg);
    bindDeskTabs(desk);
    bindDeskFilters(desk);
    bindFileDrop(desk, () => activeDesktopDropDir(), async () => {
      await refreshActiveDesktopView();
    });
    makeInteractive(desk, {
      minW: 280,
      minH: 200,
      widgetType: "desktop",
      widgetId: "desktop",
      widgetData: () => ({ box: state.desktopStage }),
      onTransferred: () => {
        state.desktopEnabled = false;
        persistLayout();
        desk.remove();
      },
      onMove: (x, y, w, h) => {
        applyBoxPx(state.desktopStage, x, y, w, h);
      },
      onEnd: () => persistLayout()
    });
  }

  document.getElementById("add-fab")?.addEventListener("click", () => openAddPicker());
  if (state.primary) {
    document.getElementById("settings-fab")?.addEventListener("click", () => openSettings());
    document.getElementById("quit-fab")?.addEventListener("click", () => {
      if (window.confirm("Bockis-eDEX Desktop UI wirklich beenden?")) shutdown();
    });
  }

  applyClockMetrics();
  renderClock();
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
    cancelAnimationFrame(state.clockTimer);
  }
  // 4Hz is enough for LED tenths; 10Hz was rewriting hundreds of DOM nodes.
  state.clockTimer = setInterval(renderClock, 250);
  window.__edexTheme = state.theme;
  applyRainMetrics();
  window.edexEffects?.start?.();
  applyRainMetrics();
  bindCalendar();
  fillDrivesStage();
  bindFileSearch();
  bindPluginPanels();
}

/** Wire optional plugin modules after their card DOM exists. */
function bindPluginPanels() {
  if (state.layout.cockpit) window.cockpitPanel?.bind?.(state);
  if (state.layout.cassette) window.cassettePanel?.bind?.(state);
  if (state.layout.ddj) window.ddjPanel?.bind?.(state);
  if (state.layout.cpuRail) window.cpuRailPanel?.bind?.(state);
  if (state.layout.calculator) window.calculatorPanel?.bind?.(state);
  if (state.layout.dock) window.dockPanel?.bind?.(state);
  else window.dockPanel?.unbind?.(state);
  if (state.layout.weather) bindWeatherPanel();
  bindLogPanel();
  bindAutostartPanel();
}

let logPanelTimer = null;

function bindLogPanel() {
  if (logPanelTimer) clearInterval(logPanelTimer);
  logPanelTimer = null;
  const root = document.getElementById("mod_log");
  if (!root || !window.edex?.getAppLog) return;
  const list = root.querySelector("[data-log-list]");
  const level = root.querySelector("[data-log-level]");
  const file = root.querySelector("[data-log-file]");
  const load = async () => {
    try {
      const result = await window.edex.getAppLog(300);
      if (file) file.textContent = result.file || "Log-Datei nicht verfügbar";
      const selected = level?.value || "all";
      const entries = (result.entries || []).filter((entry) => selected === "all" || entry.level === selected);
      if (!list) return;
      list.innerHTML = entries.map((entry) => {
        const details = entry.details == null ? "" : ` ${JSON.stringify(entry.details)}`;
        return `<div class="log-entry log-${escapeHtml(entry.level || "info")}"><time>${escapeHtml(String(entry.time || "").replace("T", " ").replace("Z", ""))}</time><b>${escapeHtml(String(entry.level || "INFO").toUpperCase())}</b><span>${escapeHtml(String(entry.event || ""))}</span><em>${escapeHtml(`${entry.message || ""}${details}`)}</em></div>`;
      }).join("") || `<div class="log-empty">Keine Einträge für diesen Filter</div>`;
      list.scrollTop = list.scrollHeight;
    } catch (error) {
      if (list) list.innerHTML = `<div class="log-empty">${escapeHtml(error.message || "Log konnte nicht gelesen werden")}</div>`;
    }
  };
  level?.addEventListener("change", load);
  root.querySelector("[data-log-refresh]")?.addEventListener("click", load);
  load();
  logPanelTimer = setInterval(load, 3000);
}

let autostartPanelTimer = null;

function bindAutostartPanel() {
  if (autostartPanelTimer) clearInterval(autostartPanelTimer);
  autostartPanelTimer = null;
  const root = document.getElementById("mod_autostart");
  if (!root || !window.edex?.listAutostartItems) return;
  const list = root.querySelector("[data-autostart-list]");
  const count = root.querySelector("[data-autostart-count]");
  const load = async () => {
    try {
      const result = await window.edex.listAutostartItems();
      const entries = Array.isArray(result?.items) ? result.items : [];
      if (count) count.textContent = `${entries.length} Autostart-Einträge`;
      if (!list) return;
      list.innerHTML = entries.map((entry) => `
        <div class="autostart-entry" title="${escapeHtml(entry.command || "")}">
          <strong>${escapeHtml(entry.name || "Unbenannt")}</strong>
          <span>${escapeHtml(entry.location || "Unbekannte Quelle")}</span>
          <small>${escapeHtml(entry.user || "")}</small>
          <em>${escapeHtml(entry.command || "Kein Befehl hinterlegt")}</em>
        </div>`).join("") || `<div class="log-empty">Keine Autostart-Einträge gefunden</div>`;
    } catch (error) {
      if (list) list.innerHTML = `<div class="log-empty">${escapeHtml(error.message || "Autostart konnte nicht gelesen werden")}</div>`;
    }
  };
  root.querySelector("[data-autostart-refresh]")?.addEventListener("click", load);
  load();
  autostartPanelTimer = setInterval(load, 10000);
}

function updateDesktopViewToggle() {
  // View toggle moved into the more-actions menu.
}

function toggleIconView(kind, pathId) {
  if (kind === "path") {
    const card = state.pathCards.find((item) => item.id === pathId);
    if (!card) return;
    card.iconView = card.iconView === "list" ? "grid" : "list";
    fillPathStage(card);
    persistLayout();
    toast(card.iconView === "list" ? "已切換為列表" : "已切換為網格");
    return;
  }
  state.iconView = state.iconView === "list" ? "grid" : "list";
  arrangeDesktop();
  persistLayout();
  toast(state.iconView === "list" ? "已切換為列表" : "已切換為網格");
}

function localBounds() {
  return {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function modalDialogWidth() {
  return Math.min(760, window.innerWidth * 0.62);
}

function placeCentered(el, opts = {}) {
  if (!el) return;
  const b = localBounds();
  const width = Math.min(opts.width || modalDialogWidth(), b.width * 0.92);
  const maxH = Math.floor(b.height * 0.9);
  el.style.width = `${width}px`;
  el.style.maxWidth = "92vw";
  el.style.maxHeight = `${maxH}px`;
  el.style.left = `${(b.width - width) / 2}px`;
  el.style.top = `${Math.max(16, (b.height - Math.min(el.offsetHeight || maxH, maxH)) / 2)}px`;
  el.style.transform = "none";
  el.classList.add("scrollable");
  // After layout, re-center using real height.
  requestAnimationFrame(() => {
    const h = Math.min(el.offsetHeight, maxH);
    el.style.top = `${Math.max(16, (b.height - h) / 2)}px`;
  });
}

function pathTitle(card, index) {
  return card?.name?.trim() || (card?.path ? card.path.split(/[/\\]/).filter(Boolean).pop() : `路徑 ${index + 1}`);
}

function ensurePathTabs(card) {
  if (!card) return [];
  if (!Array.isArray(card.tabs) || !card.tabs.length) {
    card.tabs = [{
      id: `${card.id}:root`,
      path: card.path,
      name: card.name,
      listing: card.listing,
      scan: card.scan,
      listingError: card.listingError
    }];
    card.activeTabId = card.tabs[0].id;
  }
  return card.tabs;
}

function syncPathTab(card) {
  const tab = ensurePathTabs(card).find((item) => item.id === card.activeTabId) || ensurePathTabs(card)[0];
  if (!tab) return;
  card.activeTabId = tab.id;
  Object.assign(tab, {
    path: card.path,
    name: card.name,
    listing: card.listing,
    scan: card.scan,
    listingError: card.listingError
  });
}

function activatePathTab(card, tabId) {
  syncPathTab(card);
  const tab = ensurePathTabs(card).find((item) => item.id === tabId);
  if (!tab) return;
  card.activeTabId = tab.id;
  card.path = tab.path;
  card.name = tab.name;
  card.listing = tab.listing;
  card.scan = tab.scan;
  card.listingError = tab.listingError || "";
  state.activePathId = card.id;
  renderPathCards();
  scanCard(card);
}

function closePathTab(card, tabId) {
  const tabs = ensurePathTabs(card);
  const index = tabs.findIndex((tab) => tab.id === tabId);
  if (index < 0) return;
  if (tabs.length === 1) {
    removePath(card.id);
    return;
  }

  const closingActive = card.activeTabId === tabId;
  tabs.splice(index, 1);
  if (closingActive) {
    const next = tabs[Math.min(index, tabs.length - 1)];
    card.activeTabId = next.id;
    card.path = next.path;
    card.name = next.name;
    card.listing = next.listing;
    card.scan = next.scan;
    card.listingError = next.listingError || "";
  }
  persistLayout();
  renderPathCards();
  if (closingActive) scanCard(card);
}

function listingItems(listing) {
  if (!listing) return [];
  return [...(listing.destFolders || []), ...(listing.items || [])];
}

function fillPathTree(card) {
  const tree = document.querySelector(`[data-path-tree="${card.id}"]`);
  if (!tree) return;
  const folders = listingItems(card.listing || card.scan).filter((item) => item.isDirectory);
  const rootLabel = card.name || folderTabTitle(card.path);
  tree.innerHTML = `
    <button type="button" class="path-tree-node root${card.path === card.tabs?.find((tab) => tab.id === card.activeTabId)?.path ? " current" : ""}" data-tree-path="${escapeHtml(card.path)}">
      <span class="path-tree-chevron">⌄</span><span class="path-tree-icon">${fileBrowserTreeIcon(rootLabel, true)}</span><span>${escapeHtml(rootLabel)}</span>
    </button>
    <div class="path-tree-children">
      ${folders.map((folder) => `
        <button type="button" class="path-tree-node${folder.path === card.path ? " current" : ""}" data-tree-path="${escapeHtml(folder.path)}">
          <span class="path-tree-chevron">›</span><span class="path-tree-icon">${fileBrowserTreeIcon(folder.displayName || folder.name)}</span><span>${escapeHtml(folder.displayName || folder.name)}</span>
        </button>`).join("")}
    </div>`;
  tree.querySelectorAll("[data-tree-path]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = button.dataset.treePath;
      if (target && target !== card.path) {
        navigatePathCard(card, target, button.textContent.trim());
      }
    });
  });
}

function navigatePathCard(card, targetPath, name = "") {
  const tab = ensurePathTabs(card).find((item) => item.id === card.activeTabId) || ensurePathTabs(card)[0];
  if (!tab) return;
  if (tab.path && tab.path !== targetPath) {
    tab.backStack = [...(tab.backStack || []), { path: tab.path, name: tab.name }].slice(-50);
    tab.forwardStack = [];
  }
  tab.path = targetPath;
  tab.name = name || folderTabTitle(targetPath);
  tab.listing = null;
  tab.scan = null;
  tab.listingError = "";
  card.path = tab.path;
  card.name = tab.name;
  card.listing = null;
  card.scan = null;
  card.listingError = "";
  syncPathTab(card);
  renderPathCards();
  scanCard(card);
}

function navigatePathCardHistory(card, direction) {
  const tab = ensurePathTabs(card).find((item) => item.id === card.activeTabId);
  if (!tab) return;
  const source = direction === "back" ? tab.backStack : tab.forwardStack;
  const target = source?.pop();
  if (!target) return;
  const current = { path: tab.path, name: tab.name };
  const other = direction === "back" ? tab.forwardStack : tab.backStack;
  other.push(current);
  tab.path = target.path;
  tab.name = target.name;
  tab.listing = null;
  tab.scan = null;
  tab.listingError = "";
  card.path = tab.path;
  card.name = tab.name;
  card.listing = null;
  card.scan = null;
  card.listingError = "";
  syncPathTab(card);
  renderPathCards();
  scanCard(card);
}

function navigatePathCardUp(card) {
  const current = String(card?.path || "").replace(/[\\/]+$/, "");
  const parent = current.replace(/[\\/][^\\/]+$/, "");
  if (!parent || parent === current) return;
  navigatePathCard(card, parent, folderTabTitle(parent));
}

function fillPathStage(card) {
  const stage = document.querySelector(`[data-path-stage="${card.id}"]`);
  if (!stage) return;
  fillPathTree(card);
  const query = String(card.fileSearch || "").trim().toLocaleLowerCase();
  const items = listingItems(card.listing || card.scan)
    .filter((item) => !query || String(item.displayName || item.name || "").toLocaleLowerCase().includes(query));
  const view = card.iconView === "list" ? "list" : "grid";
  const fileOpts = {
    destDir: card.path,
    pathCardId: card.id,
    onRefresh: () => scanCard(card)
  };
  stage.classList.toggle("view-list", view === "list");
  stage.classList.toggle("view-grid", view === "grid");
  if (!items.length) {
    stage.innerHTML = card.listingError
      ? `<p class="path-empty">${escapeHtml(card.listingError)}</p>`
      : `<p class="path-empty">${card.scanning ? "讀取中…" : "此資料夾沒有可顯示的項目"}</p>`;
    window.edexI18n?.translatePage?.(stage);
    bindFileStage(stage, fileOpts);
    return;
  }
  fillIconStage(stage, items, { draggable: false, view, ...fileOpts });
  window.edexI18n?.translatePage?.(stage);
}

async function scanCard(card) {
  if (!card?.path) return;
  if (card.scanning) {
    while (card.scanning) await delay(40);
    return;
  }
  card.scanning = true;
  card.listingError = "";
  fillPathStage(card);
    try {
    card.listing = await window.edex.listFolder(card.path);
    syncPathTab(card);
    fillPathStage(card);
    if (card.id === state.activePathId) {
      try {
        card.scan = await window.edex.scan(card.path);
        syncPathTab(card);
        state.scan = card.scan;
        await refreshPlan();
        renderStats();
        arrangeDesktop();
      } catch {
        // Listing can still show even if organize scan fails.
      }
      log(`掃描 ${card.path}：${card.listing.total} 個項目`);
    }
  } catch (err) {
    card.listing = { items: [], total: 0 };
    card.listingError = err.message || "無法讀取資料夾";
    syncPathTab(card);
    fillPathStage(card);
    toast(card.listingError);
    log(`讀取失敗：${card.listingError}`);
  } finally {
    card.scanning = false;
    fillPathStage(card);
  }
}

function activeCard() {
  return state.pathCards.find((card) => card.id === state.activePathId) || state.pathCards[0];
}

function renderPathCards() {
  document.querySelectorAll(".path-card").forEach((el) => el.remove());
  const workspace = document.getElementById("workspace");
  state.pathCards.forEach((card, index) => {
    if (card.minimized) return;
    ensurePathTabs(card);
    const el = document.createElement("section");
    const locked = Boolean(card.locked);
    el.className = `path-card${card.id === state.activePathId ? " active-path" : ""}${locked ? " locked" : ""}`;
    el.id = `path_${card.id}`;
    el.style.cssText = styleFromBox(card);
    el.innerHTML = `
      <h3 class="card-title path-card-header">
        <div class="path-tab-bar" role="tablist">${ensurePathTabs(card).map((tab) => `<div class="path-tab${tab.id === card.activeTabId ? " active" : ""}" data-path-tab="${escapeHtml(tab.id)}" role="tab" aria-selected="${tab.id === card.activeTabId ? "true" : "false"}" title="${escapeHtml(tab.path || "")}"><span class="path-tab-label">${escapeHtml(tab.name || pathTitle(tab, 0))}</span><button type="button" class="path-tab-close" data-close-path-tab="${escapeHtml(tab.id)}" aria-label="Tab schließen" title="Tab schließen">×</button></div>`).join("")}</div>
        ${cardToolsHtml()}
      </h3>
      <div class="card-body path-browser-body">
        <aside class="path-tree" data-path-tree="${card.id}" aria-label="Arbeitsbaum" style="--path-tree-width:${Number.isFinite(Number(card.treeWidth)) ? Number(card.treeWidth) : 192}px"></aside>
        <div class="path-tree-resizer" data-path-tree-resizer="${card.id}" role="separator" aria-orientation="vertical" aria-label="Breite des Arbeitsbaums ändern" tabindex="0"></div>
        <div class="path-browser-main">
          <div class="path-browser-toolbar">
            <button type="button" data-path-back title="Zurück" ${ensurePathTabs(card).find((tab) => tab.id === card.activeTabId)?.backStack?.length ? "" : "disabled"}>←</button>
            <button type="button" data-path-forward title="Vorwärts" ${ensurePathTabs(card).find((tab) => tab.id === card.activeTabId)?.forwardStack?.length ? "" : "disabled"}>→</button>
            <button type="button" data-path-up title="Übergeordneten Ordner öffnen">↑</button>
            <button type="button" data-path-refresh title="Ordner aktualisieren">↻</button>
            <input type="search" data-path-search placeholder="Dateien suchen …" value="${escapeHtml(card.fileSearch || "")}" aria-label="Dateien in diesem Ordner suchen">
            <span class="path-text" title="${escapeHtml(card.path)}">${escapeHtml(card.path)}</span>
          </div>
          <div class="path-stage view-${card.iconView === "list" ? "list" : "grid"}" data-path-stage="${card.id}"></div>
        </div>
      </div>
      <div class="resize-handle"></div>
    `;
    el.addEventListener("dblclick", () => setActivePath(card.id));
    workspace.appendChild(el);
    fillPathTree(card);
    const browserBody = el.querySelector(".path-browser-body");
    const tree = el.querySelector("[data-path-tree]");
    const resizer = el.querySelector("[data-path-tree-resizer]");
    const applyTreeWidth = (width) => {
      const max = Math.max(180, (browserBody?.clientWidth || 640) * 0.45);
      const next = Math.max(140, Math.min(max, width));
      card.treeWidth = next;
      if (tree) tree.style.setProperty("--path-tree-width", `${next}px`);
    };
    resizer?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resizer.setPointerCapture?.(event.pointerId);
      window.edex?.setMouseIgnore?.(false);
      const move = (moveEvent) => {
        const rect = browserBody.getBoundingClientRect();
        applyTreeWidth(moveEvent.clientX - rect.left);
      };
      const finish = () => {
        resizer.releasePointerCapture?.(event.pointerId);
        resizer.removeEventListener("pointermove", move);
        resizer.removeEventListener("pointerup", finish);
        persistLayout();
      };
      resizer.addEventListener("pointermove", move);
      resizer.addEventListener("pointerup", finish, { once: true });
    });
    el.querySelectorAll("[data-path-tab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        activatePathTab(card, button.dataset.pathTab);
      });
    });
    el.querySelectorAll("[data-close-path-tab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePathTab(card, button.dataset.closePathTab);
      });
    });
    el.querySelector("[data-path-up]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      navigatePathCardUp(card);
    });
    el.querySelector("[data-path-back]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      navigatePathCardHistory(card, "back");
    });
    el.querySelector("[data-path-forward]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      navigatePathCardHistory(card, "forward");
    });
    el.querySelector("[data-path-refresh]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      scanCard(card);
    });
    el.querySelector("[data-path-search]")?.addEventListener("input", (event) => {
      card.fileSearch = String(event.target.value || "");
      fillPathStage(card);
    });
    bindCardTools(el, () => menuItemsForCard("path", {
      el,
      id: card.id,
      path: card.path,
      locked: Boolean(card.locked),
      iconView: card.iconView,
      widgetType: "path",
      widgetId: card.id,
      fixedDisplayId: card.fixedDisplayId,
      widgetData: () => ({ path: card.path, box: { ...card }, locked: card.locked, iconView: card.iconView, bg: card.bg }),
      getBg: () => card.bg || "",
      setBg: (color) => {
        card.bg = color;
        persistLayout();
      },
      onTransferred: () => {
        state.pathCards = state.pathCards.filter((c) => c.id !== card.id);
        if (state.activePathId === card.id) {
          state.activePathId = state.pathCards[0]?.id || null;
        }
        el.remove();
        persistLayout();
        doScan();
      },
      onLock: () => {
        card.locked = !card.locked;
        setCardLocked(el, Boolean(card.locked));
        persistLayout();
      },
      setFixedDisplay: (displayId) => {
        card.fixedDisplayId = displayId;
        persistLayout();
      },
      onClose: () => {
        state.pathCards = state.pathCards.filter((c) => c.id !== card.id);
        if (state.activePathId === card.id) {
          state.activePathId = state.pathCards[0]?.id || null;
        }
        el.remove();
        persistLayout();
        doScan();
        toast("Ordner-Panel geschlossen");
      }
    }));
    makeInteractive(el, {
      minW: 280,
      minH: 220,
      widgetType: "path",
      widgetId: card.id,
      widgetData: () => ({ path: card.path, box: { ...card }, locked: card.locked }),
      onTransferred: () => {
        state.pathCards = state.pathCards.filter((c) => c.id !== card.id);
        if (state.activePathId === card.id) {
          state.activePathId = state.pathCards[0]?.id || null;
        }
        el.remove();
        persistLayout();
        doScan();
      },
      onMove: (x, y, w, h) => {
        applyBoxPx(card, x, y, w, h);
      },
      onEnd: () => {
        fillPathStage(card);
        persistLayout();
      }
    });
    applyCardBg(el, card.bg);
    bindFileDrop(el, () => card.path, async () => scanCard(card));
    fillPathStage(card);
    if (!card.listing) requestAnimationFrame(() => scanCard(card));
    else requestAnimationFrame(() => fillPathStage(card));
  });
}

async function setActivePath(id) {
  state.activePathId = id;
  renderPathCards();
  await doScan();
}

async function changePath(id) {
  const picked = await window.edex.pickFolder();
  if (!picked) return;
  const card = state.pathCards.find((item) => item.id === id);
  card.path = picked;
  persistLayout();
  renderPathCards();
  await scanCard(card);
}

function removePath(id) {
  state.pathCards = state.pathCards.filter((card) => card.id !== id);
  if (state.activePathId === id) state.activePathId = state.pathCards[0]?.id || null;
  persistLayout();
  renderPathCards();
  doScan();
}

async function addPathCard() {
  const picked = await window.edex.pickFolder();
  if (!picked) return;
  await addPathCardAt(picked);
}

async function addPathCardAt(folderPath, options = {}) {
  const picked = String(folderPath || "").trim();
  if (!picked || isVirtualPath(picked)) {
    toast("Dieser Eintrag kann nicht als Ordner-Panel hinzugefügt werden");
    return;
  }
  const comparablePath = (value) => String(value || "")
    .trim()
    .replace(/[\\/]+$/, "")
    .toLowerCase();
  const existing = state.pathCards.find(
    (card) => comparablePath(card.path) === comparablePath(picked)
  );
  if (existing) {
    if (existing.minimized) {
      existing.minimized = false;
      renderPathCards();
    }
    await setActivePath(existing.id);
    toast("Dieses Ordner-Panel ist bereits vorhanden");
    return;
  }
  const defaultName = picked.split(/[/\\]/).filter(Boolean).pop() || "Ordner-Panel";
  const panelName = options.promptName === false
    ? String(options.name || defaultName)
    : await promptTextInput({
      title: "Ordner-Panel anlegen",
      hint: "Panel-Name",
      value: defaultName,
      okLabel: "Hinzufügen"
    });
  if (panelName == null) return;
  const id = `p${Date.now()}`;
  const placed = findEmptyBox({
    id,
    path: picked,
    name: panelName.trim() || defaultName,
    x: 18,
    y: 16,
    w: 46,
    h: 52,
    iconView: "grid"
  }, { pathId: id });
  const occupied = occupiedLayoutRects({ pathId: id });
  if (overlapsAny(pxFromBox(placed), occupied)) {
    const targetCard = activeCard();
    if (targetCard) {
      ensurePathTabs(targetCard);
      syncPathTab(targetCard);
      const tab = {
        id: `${targetCard.id}:${Date.now()}`,
        path: picked,
        name: panelName.trim() || defaultName,
        listing: null,
        scan: null,
        listingError: ""
      };
      targetCard.tabs.push(tab);
      activatePathTab(targetCard, tab.id);
      persistLayout();
      toast(`Ordner als Tab „${tab.name}“ geöffnet`);
      return;
    }
  }
  state.pathCards.push(placed);
  state.activePathId = id;
  persistLayout();
  renderPathCards();
  const card = state.pathCards.find((item) => item.id === id);
  await scanCard(card);
  toast(`Ordner-Panel „${pathTitle(card, state.pathCards.length - 1)}“ hinzugefügt`);
}

async function renamePathPanel(id) {
  const card = state.pathCards.find((item) => item.id === id);
  if (!card) return;
  const next = await promptTextInput({
    title: "Ordner-Panel umbenennen",
    hint: "Panel-Name",
    value: pathTitle(card, 0),
    okLabel: "Speichern"
  });
  if (next == null) return;
  card.name = next.trim() || pathTitle({ path: card.path }, 0);
  persistLayout();
  renderPathCards();
}

function desktopItems() {
  return listingItems(state.desktopListing);
}

async function loadDesktopListing(options = {}) {
  const opts = {
    decorate: "fast",
    includeShell: false,
    ...options
  };
  try {
    // Fast FS listing + Electron icons (cached). Avoids PowerShell on every refresh.
    state.desktopListing = await window.edex.listDesktopShortcuts(opts);
  } catch {
    try {
      state.desktopListing = await window.edex.listDesktopFiles();
    } catch {
      state.desktopListing = { items: [], total: 0 };
    }
  }
}

async function fillDrivesStage() {
  const stage = document.getElementById("drives-stage");
  if (!stage) return;
  const translate = (value) => window.edexI18n?.translateDynamic?.(value) || value;
  try {
    const listing = await window.edex.listDrives();
    const items = listing.items || [];
    if (!items.length) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(translate("找不到本機磁碟"))}</p>`;
      return;
    }
    stage.innerHTML = items.map((d) => `
      <button type="button" class="drive-row" data-path="${escapeHtml(d.path)}">
        ${iconSvg(d.icon) || `<svg class="drive-fallback" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="6" width="18" height="12" rx="1.5"/><rect x="5" y="9" width="4" height="2"/></svg>`}
        <div class="drive-main">
          <div class="drive-head">
            <span class="drive-name">${escapeHtml(d.name)}</span>
            <span class="drive-meta">${escapeHtml(d.freeLabel)} ${escapeHtml(translate("可用"))} / ${escapeHtml(d.totalLabel)}</span>
          </div>
          <div class="drive-bar"><i style="width:${d.pct}%"></i></div>
          <div class="drive-foot">${escapeHtml(translate(d.type))}${d.fs ? ` · ${escapeHtml(d.fs)}` : ""} · ${escapeHtml(translate("已用"))} ${d.pct}%</div>
        </div>
      </button>
    `).join("");
    window.edexI18n?.translatePage?.(stage);
    stage.querySelectorAll("[data-path]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const driveName = btn.querySelector(".drive-name")?.textContent?.trim() || btn.dataset.path;
        addPathCardAt(btn.dataset.path, { name: driveName, promptName: false }).catch((err) => {
          toast(err?.message || "Laufwerk-Panel konnte nicht geöffnet werden");
        });
      });
    });
    bindFileStage(stage, {
      destDir: "",
      itemFromNode: (node) => {
        const target = node?.dataset?.path;
        if (!target) return null;
        return { path: target, name: node.querySelector(".drive-name")?.textContent || target, isDirectory: true, kind: "drive" };
      },
      onRefresh: () => fillDrivesStage()
    });
  } catch (err) {
    stage.innerHTML = `<p class="path-empty">${escapeHtml(err.message || translate("無法讀取磁碟"))}</p>`;
  }
}

function terminalParentPath(value) {
  const target = String(value || "").replace(/[\\/]+$/, "");
  const root = /^[A-Za-z]:$/.test(target) ? `${target}\\` : target.slice(0, Math.max(0, target.lastIndexOf("\\")));
  return root || target;
}

async function refreshTerminalFileBrowser(id, pane) {
  const browser = pane?.querySelector("[data-terminal-file-browser]");
  if (!browser || !terminalBrowserState.get(id)?.open) return;
  const state = terminalBrowserState.get(id);
  const target = state.path || terminalCwds.get(id) || "";
  if (!target) {
    browser.innerHTML = `<div class="terminal-file-empty">Warte auf Arbeitsverzeichnis …</div>`;
    return;
  }
  const requestId = (state.requestId || 0) + 1;
  state.requestId = requestId;
  try {
    const listing = await window.edex.listFolder(target, { systemIcons: "fast" });
    if (terminalBrowserState.get(id)?.requestId !== requestId) return;
    state.path = listing.root;
    browser.innerHTML = `
      <div class="terminal-file-head">
        <button type="button" data-terminal-file-up title="Übergeordneten Ordner öffnen">↑</button>
        <span title="${escapeHtml(listing.root)}">${escapeHtml(listing.root)}</span>
        <button type="button" data-terminal-file-refresh title="Ordner aktualisieren">↻</button>
      </div>
      <div class="terminal-file-list">
        ${listing.items.map((item) => `
          <button type="button" class="terminal-file-item" data-terminal-file-path="${escapeHtml(item.path)}" data-terminal-file-directory="${item.isDirectory ? "1" : "0"}">
            <span class="terminal-file-icon">${item.isDirectory ? "▣" : "·"}</span>
            <span class="terminal-file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.displayName || item.name)}</span>
            <span class="terminal-file-meta">${escapeHtml(item.sizeLabel || "")}</span>
          </button>`).join("") || `<div class="terminal-file-empty">Ordner ist leer</div>`}
      </div>`;
    browser.querySelector("[data-terminal-file-up]")?.addEventListener("click", () => {
      state.path = terminalParentPath(state.path);
      terminalCwds.set(id, state.path);
      window.edex.changeTerminalDirectory(id, state.path);
      refreshTerminalFileBrowser(id, pane);
    });
    browser.querySelector("[data-terminal-file-refresh]")?.addEventListener("click", () => refreshTerminalFileBrowser(id, pane));
    browser.querySelectorAll("[data-terminal-file-path]").forEach((item) => item.addEventListener("dblclick", () => {
      const nextPath = item.dataset.terminalFilePath;
      if (item.dataset.terminalFileDirectory === "1") {
        state.path = nextPath;
        terminalCwds.set(id, nextPath);
        window.edex.changeTerminalDirectory(id, nextPath);
        refreshTerminalFileBrowser(id, pane);
      } else {
        window.edex.openPath(nextPath);
      }
    }));
    if (!terminalBrowserTimers.has(id)) {
      terminalBrowserTimers.set(id, setInterval(() => refreshTerminalFileBrowser(id, pane), 2000));
    }
  } catch (error) {
    browser.innerHTML = `<div class="terminal-file-empty">${escapeHtml(error.message || "Ordner konnte nicht gelesen werden")}</div>`;
  }
}

function bindTerminal() {
  const root = document.querySelector(".terminal-root");
  if (!root) return;
  const grid = root.querySelector("[data-terminal-grid]");
  const status = root.querySelector("[data-terminal-status]");
  if (!grid) return;
  if (!terminalBridgeBound) {
    terminalBridgeBound = true;
    window.edex.onTerminalData(({ paneId, data }) => {
      const next = `${terminalBuffers.get(paneId) || ""}${data}`.slice(-100000);
      terminalBuffers.set(paneId, next);
      terminalInstances.get(paneId)?.write(data);
    });
    window.edex.onTerminalCwd(({ paneId, cwd }) => {
      if (!paneId || !cwd) return;
      terminalCwds.set(paneId, cwd);
      const browserState = terminalBrowserState.get(paneId);
      if (browserState) browserState.path = cwd;
      const pane = root.querySelector(`[data-terminal-pane="${CSS.escape(paneId)}"]`);
      if (pane && terminalBrowserState.get(paneId)?.open) refreshTerminalFileBrowser(paneId, pane);
    });
    window.edex.onTerminalExit(({ paneId }) => {
      terminalInstances.get(paneId)?.writeln("\r\n[Terminal beendet]");
    });
  }
  if (!terminalPaneIds.length) terminalPaneIds.push(`terminal-${terminalNextPane++}`);
  grid.style.setProperty("--terminal-columns", terminalGridMode === "1x1" ? "1" : "2");
  terminalInstances.forEach((terminal) => terminal.dispose());
  terminalInstances.clear();
  terminalBrowserTimers.forEach((timer) => clearInterval(timer));
  terminalBrowserTimers.clear();
  grid.innerHTML = terminalPaneIds.map((id, index) => `
    <section class="terminal-pane" data-terminal-pane="${id}">
      <header class="terminal-pane-head"><span>PowerShell-Konsole</span><span class="terminal-pane-actions"><select data-terminal-mode aria-label="Terminalansicht"><option value="shell">SHELL</option><option value="files">SHELL + FILES</option></select><button type="button" class="terminal-mode-action" data-terminal-browser>FILES</button><button type="button" class="terminal-mode-action" data-terminal-shell>SHELL</button></span></header>
      <div class="terminal-pane-body">
        <div class="terminal-output" data-terminal-output aria-label="Terminalausgabe"></div>
        <aside class="terminal-file-browser" data-terminal-file-browser hidden></aside>
        <aside class="terminal-native-slot" data-terminal-native-slot hidden></aside>
      </div>
    </section>`).join("");
  terminalPaneIds.forEach((id) => {
    const pane = grid.querySelector(`[data-terminal-pane="${CSS.escape(id)}"]`);
    const output = pane?.querySelector("[data-terminal-output]");
    const fileBrowser = pane?.querySelector("[data-terminal-file-browser]");
    const nativeSlot = pane?.querySelector("[data-terminal-native-slot]");
    if (!pane || !output || !fileBrowser || !nativeSlot) return;
    if (terminalNativePanes.has(id)) pane.classList.add("terminal-pane-native");
    const existing = terminalInstances.get(id);
    const terminal = existing || (window.Terminal ? new window.Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"Fira Mono", "Share Tech Mono", Consolas, monospace',
      fontSize: 13,
      theme: { background: "#01080b", foreground: "#00eaff", cursor: "#00ff75" },
      scrollback: 5000
    }) : null);
    if (!terminal) return;
    if (!existing) {
      terminalInstances.set(id, terminal);
      terminal.open(output);
      terminal.loadAddon(new window.FitAddon.FitAddon());
      const bufferedOutput = terminalBuffers.get(id);
      if (bufferedOutput) terminal.write(bufferedOutput);
      terminal.onData((data) => window.edex.writeTerminal(id, data));
      terminal.onResize(({ cols, rows }) => window.edex.resizeTerminal(id, cols, rows));
    }
    const syncNativeBounds = () => {
      const embedded = terminalNativePanes.get(id);
      if (!embedded) return;
      const rect = nativeSlot.getBoundingClientRect();
      window.edex.embedBounds({ hwnd: embedded.hwnd, kind: embedded.kind, bounds: { x: rect.left, y: rect.top, w: rect.width, h: rect.height } });
    };
    const browserButton = pane.querySelector("[data-terminal-browser]");
    const shellButton = pane.querySelector("[data-terminal-shell]");
    const modeSelect = pane.querySelector("[data-terminal-mode]");
    browserButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const embedded = terminalNativePanes.get(id);
      if (embedded) {
        await window.edex.embedRelease({ hwnd: embedded.hwnd });
        terminalNativePanes.delete(id);
        nativeSlot.hidden = true;
        pane.classList.remove("terminal-pane-putty");
      }
      const browser = terminalBrowserState.get(id) || { open: false, path: "" };
      browser.open = !browser.open;
      terminalBrowserState.set(id, browser);
      fileBrowser.hidden = !browser.open;
      pane.classList.toggle("terminal-pane-files", browser.open);
      pane.classList.remove("terminal-pane-putty");
      if (modeSelect) modeSelect.value = browser.open ? "files" : "shell";
      browserButton.classList.toggle("on", browser.open);
      if (browser.open) refreshTerminalFileBrowser(id, pane);
    });
    modeSelect?.addEventListener("change", async () => {
      if (modeSelect.value === "files") {
        browserButton?.click();
      } else {
        shellButton?.click();
      }
    });
    shellButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const embedded = terminalNativePanes.get(id);
      if (embedded) await window.edex.embedRelease({ hwnd: embedded.hwnd });
      terminalNativePanes.delete(id);
      const browserState = terminalBrowserState.get(id);
      if (browserState) browserState.open = false;
      nativeSlot.hidden = true;
      pane.classList.remove("terminal-pane-putty");
      pane.classList.remove("terminal-pane-files");
      if (modeSelect) modeSelect.value = "shell";
      terminalStarted.delete(id);
      bindTerminal();
    });
    syncNativeBounds();
    pane.querySelector("[data-terminal-close]")?.addEventListener("click", () => {
      const embedded = terminalNativePanes.get(id);
      if (embedded) window.edex.embedRelease({ hwnd: embedded.hwnd });
      window.edex.closeTerminal(id);
      terminalNativePanes.delete(id);
      terminalStarted.delete(id);
      terminalPaneIds.splice(terminalPaneIds.indexOf(id), 1);
      terminalBuffers.delete(id);
      terminalInstances.get(id)?.dispose();
      terminalInstances.delete(id);
      if (!terminalPaneIds.length) terminalPaneIds.push(`terminal-${terminalNextPane++}`);
      bindTerminal();
    });
    terminal.fit?.();
    requestAnimationFrame(() => terminal.fit?.());
    if (!terminalStarted.has(id) && window.edex?.createTerminal) {
      terminalStarted.add(id);
      window.edex.createTerminal(id, terminalCwds.get(id), "powershell").then((result) => {
        if (!result?.cwd) return;
        terminalCwds.set(id, result.cwd);
        const browserState = terminalBrowserState.get(id);
        if (browserState?.open) {
          browserState.path = result.cwd;
          refreshTerminalFileBrowser(id, pane);
        }
      }).catch?.(() => terminalStarted.delete(id));
    }
    const browserState = terminalBrowserState.get(id);
    if (browserState?.open) {
      fileBrowser.hidden = false;
      pane.classList.add("terminal-pane-files");
      pane.querySelector("[data-terminal-browser]")?.classList.add("on");
      if (modeSelect) modeSelect.value = "files";
      refreshTerminalFileBrowser(id, pane);
    }
    if (terminalNativePanes.has(id)) {
      nativeSlot.hidden = false;
      pane.classList.add("terminal-pane-putty");
      if (modeSelect) modeSelect.value = "putty";
      syncNativeBounds();
    }
  });
  root.querySelector("[data-terminal-add]")?.addEventListener("click", () => {
    if (terminalPaneIds.length >= 4) return;
    terminalPaneIds.push(`terminal-${terminalNextPane++}`);
    bindTerminal();
  });
  root.querySelector("[data-terminal-browser]")?.addEventListener("click", () => {
    root.querySelector("[data-terminal-pane] [data-terminal-browser]")?.click();
  });
  root.querySelector("[data-terminal-layout]")?.addEventListener("change", (event) => {
    terminalGridMode = event.target.value;
    bindTerminal();
  });
  window.addEventListener("resize", () => {
    terminalInstances.forEach((terminal) => terminal.fit?.());
    terminalPaneIds.forEach((id) => {
      const pane = root.querySelector(`[data-terminal-pane="${CSS.escape(id)}"]`);
      const embedded = terminalNativePanes.get(id);
      const nativeSlot = pane?.querySelector("[data-terminal-native-slot]");
      if (!pane || !nativeSlot || !embedded) return;
      const rect = nativeSlot.getBoundingClientRect();
      window.edex.embedBounds({ hwnd: embedded.hwnd, kind: embedded.kind, bounds: { x: rect.left, y: rect.top, w: rect.width, h: rect.height } });
    });
  }, { passive: true });
  if (status) status.textContent = `${terminalPaneIds.length} PowerShell-Sitzung${terminalPaneIds.length === 1 ? "" : "en"}`;
}

function formatSearchEngine(status) {
  const engine = status?.engine === "everything" ? "Everything" : "Lokaler Index";
  const count = Number(status?.count) || 0;
  const extra = (status?.roots || []).length;
  const bits = [engine];
  if (status?.indexing) bits.push("Indexierung läuft");
  else if (count) bits.push(`${count.toLocaleString()} Ergebnisse`);
  if (extra) bits.push(`${extra} LAN-Pfade`);
  if (status?.lastError) bits.push(status.lastError);
  return bits.join(" · ");
}

function bindFileSearch() {
  const input = document.getElementById("fs_query");
  const go = document.getElementById("fs_go");
  const results = document.getElementById("fs_results");
  if (!input || !results) return;
  let timer = 0;
  let token = 0;
  const run = async () => {
    const query = input.value.trim();
    const stamp = ++token;
    if (!query) {
      results.innerHTML = "";
      await refreshSearchStatus();
      return;
    }
    setText("fs_status", "Suche läuft …");
    try {
      const payload = await window.edex.searchFiles(query, 80);
      if (stamp !== token) return;
      renderSearchResults(payload, query);
    } catch (err) {
      if (stamp !== token) return;
      results.innerHTML = `<p class="path-empty">${escapeHtml(err.message || "Suche fehlgeschlagen")}</p>`;
      setText("fs_status", "Suche fehlgeschlagen");
    }
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 160);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimeout(timer);
      run();
    }
  });
  go?.addEventListener("click", () => {
    clearTimeout(timer);
    run();
  });
  results.addEventListener("click", (event) => {
    const row = event.target.closest("[data-path]");
    if (!row) return;
    window.edex.openPath(row.dataset.path);
  });
  bindFileStage(results, {
    destDir: "",
    allowCreate: false,
    itemFromNode: (node) => {
      const target = node?.dataset?.path;
      if (!target) return null;
      const name = node.querySelector(".fs-name")?.textContent || target;
      return { path: target, name, isDirectory: false };
    },
    onRefresh: async () => {
      const q = document.getElementById("fs_query")?.value?.trim();
      if (q) document.getElementById("fs_go")?.click();
    }
  });
  refreshSearchStatus();
}

function renderSearchResults(payload, query) {
  const results = document.getElementById("fs_results");
  if (!results) return;
  const items = payload?.items || [];
  setText("fs_status", `${formatSearchEngine(payload)} · ${items.length} Ergebnisse`);
  if (!items.length) {
    results.innerHTML = `<p class="path-empty">Keine Dateien für „${escapeHtml(query)}“ gefunden</p>`;
    return;
  }
  results.innerHTML = items.map((item) => `
    <button type="button" class="fs-row" data-path="${escapeHtml(item.path)}" title="${escapeHtml(item.path)}">
      <span class="fs-name">${escapeHtml(item.name)}</span>
      <span class="fs-path">${escapeHtml(item.dir || item.path)}</span>
    </button>
  `).join("");
  window.edexI18n?.translatePage?.(results);
}

async function refreshSearchStatus() {
  const el = document.getElementById("fs_status");
  if (!el) return;
  try {
    const status = await window.edex.searchStatus();
    el.textContent = formatSearchEngine(status) + " · Suchbegriff eingeben";
  } catch {
    el.textContent = "Suche noch nicht bereit";
  }
}

async function addSearchFolder() {
  const folder = await window.edex.pickSearchRoot();
  if (!folder) return;
  try {
    await window.edex.addSearchRoot(folder);
    toast(`Suchpfad hinzugefügt: ${folder}`);
    refreshSearchStatus();
  } catch (err) {
    toast(err.message || "Pfad konnte nicht hinzugefügt werden");
  }
}

function openLanPathPrompt() {
  document.getElementById("lanPathEditor")?.closest(".modal_popup")?.remove();
  const modal = document.createElement("div");
  modal.className = "modal_popup info";
  modal.innerHTML = `
    <h1>LAN-Pfad</h1>
    <h2>例如 \\\\NAS\\share 或已對應的網路磁碟資料夾</h2>
    <table id="lanPathEditor">
      <tr><th>路徑</th><th><input id="lan_path_input" type="text" spellcheck="false" placeholder="\\\\伺服器\\分享" /></th></tr>
    </table>
    <div class="settings-footer">
      <button type="button" id="lan-cancel">Abbrechen</button>
      <button type="button" id="lan-ok">Hinzufügen und indizieren</button>
    </div>`;
  document.body.appendChild(modal);
  window.edexI18n?.translatePage?.(modal);
  const input = document.getElementById("lan_path_input");
  if (input && window.edexI18n?.locale?.() !== "zh-Hant") input.placeholder = "\\\\Server\\Share";
  input?.focus();
  document.getElementById("lan-cancel").onclick = () => modal.remove();
  document.getElementById("lan-ok").onclick = async () => {
    const value = input.value.trim();
    if (!value) return toast("Bitte einen Pfad eingeben");
    try {
      await window.edex.addSearchRoot(value);
      modal.remove();
      toast(`Hinzugefügt: ${value}`);
      refreshSearchStatus();
    } catch (err) {
      toast(err.message || "Pfad konnte nicht hinzugefügt werden");
    }
  };
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") document.getElementById("lan-ok")?.click();
  });
}

async function openSearchRootsEditor() {
  document.getElementById("searchRootsEditor")?.closest(".modal_popup")?.remove();
  let status;
  try {
    status = await window.edex.searchStatus();
  } catch (err) {
    toast(err.message || "Suchpfade konnten nicht gelesen werden");
    return;
  }
  const roots = status.roots || [];
  const modal = document.createElement("div");
  modal.className = "modal_popup info";
  modal.innerHTML = `
    <h1>Suchpfade</h1>
    <h2>${status.includeLocal ? "Lokale Laufwerke eingeschlossen" : "Lokale Laufwerke nicht indiziert"} · ${status.engine === "everything" ? "Everything beschleunigt" : "Dateinamen-Index"}</h2>
    <div id="searchRootsEditor" class="fs-roots">
      ${roots.length
        ? roots.map((root) => `
          <div class="fs-root-row">
            <span>${escapeHtml(root)}</span>
            <button type="button" data-del-root="${escapeHtml(root)}">Entfernen</button>
          </div>`).join("")
        : `<p class="cal-editor-empty">Noch keine LAN-Pfade oder zusätzlichen Ordner hinzugefügt.</p>`}
    </div>
    <div class="settings-footer">
      <button type="button" id="fs-local-toggle">${status.includeLocal ? "Lokale Laufwerke deaktivieren" : "Lokale Laufwerke aktivieren"}</button>
      <button type="button" id="fs-roots-close">Schließen</button>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll("[data-del-root]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await window.edex.removeSearchRoot(btn.dataset.delRoot);
        toast("Suchpfad entfernt");
        modal.remove();
        openSearchRootsEditor();
        refreshSearchStatus();
      } catch (err) {
        toast(err.message || "Pfad konnte nicht entfernt werden");
      }
    };
  });
  document.getElementById("fs-local-toggle").onclick = async () => {
    await window.edex.setSearchLocal(!status.includeLocal);
    modal.remove();
    toast(status.includeLocal ? "Index lokaler Laufwerke deaktiviert" : "Index lokaler Laufwerke aktiviert");
    openSearchRootsEditor();
    refreshSearchStatus();
  };
  document.getElementById("fs-roots-close").onclick = () => modal.remove();
}

async function rebuildFileSearch() {
  toast("Index wird neu erstellt …");
  try {
    await window.edex.searchRebuild();
    toast("Index wurde neu erstellt");
    refreshSearchStatus();
  } catch (err) {
    toast(err.message || "Index konnte nicht erstellt werden");
  }
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function bindCalendar() {
  if (!document.getElementById("cal_grid")) return;
  document.getElementById("cal_prev")?.addEventListener("click", () => {
    state.calCursor.setMonth(state.calCursor.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("cal_next")?.addEventListener("click", () => {
    state.calCursor.setMonth(state.calCursor.getMonth() + 1);
    renderCalendar();
  });
  refreshCalendar();
}

async function refreshCalendar() {
  try {
    state.calNotes = await window.edex.getCalendarNotes() || {};
  } catch {
    state.calNotes = {};
  }
  renderCalendar();
}

function mondayIndex(jsDay) {
  return (jsDay + 6) % 7;
}

function renderCalendar() {
  const grid = document.getElementById("cal_grid");
  const title = document.getElementById("cal_title");
  if (!grid || !title) return;
  const y = state.calCursor.getFullYear();
  const m = state.calCursor.getMonth();
  title.textContent = `${y} / ${m + 1}`;
  const start = mondayIndex(new Date(y, m, 1).getDay());
  const days = new Date(y, m + 1, 0).getDate();
  const today = dateKey(new Date());
  const cells = [];
  for (let i = 0; i < start; i++) {
    cells.push({ empty: true, sun: i === 6 });
  }
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${pad(m + 1)}-${pad(d)}`;
    const jsDay = new Date(y, m, d).getDay();
    cells.push({
      empty: false,
      key,
      day: d,
      sun: jsDay === 0,
      holiday: window.edexMacauHolidays?.get(key) || "",
      notes: state.calNotes[key] || [],
      today: key === today,
      selected: key === state.calSelected
    });
  }
  while (cells.length < 42) {
    cells.push({ empty: true, sun: cells.length % 7 === 6 });
  }
  grid.innerHTML = cells.map((cell) => {
    if (cell.empty) {
      return `<span class="cal-cell empty${cell.sun ? " sun" : ""}"></span>`;
    }
    const cls = ["cal-cell"];
    if (cell.sun) cls.push("sun");
    if (cell.today) cls.push("today");
    if (cell.selected) cls.push("selected");
    if (cell.holiday) cls.push("holiday");
    if (cell.notes.length) cls.push("has-notes");
    const holiday = cell.holiday
      ? `<span class="cal-holiday" title="${escapeHtml(cell.holiday)}">${escapeHtml(cell.holiday)}</span>`
      : "";
    const previews = cell.notes.slice(0, 4).map((n, i) =>
      `<span class="cal-preview">${i + 1}. ${escapeHtml(n.text)}</span>`
    ).join("");
    const more = cell.notes.length > 4 ? `<span class="cal-preview more">+${cell.notes.length - 4}</span>` : "";
    return `<button type="button" class="${cls.join(" ")}" data-date="${cell.key}">
      <span class="cal-num">${cell.day}</span>
      ${holiday}
      <span class="cal-previews">${previews}${more}</span>
    </button>`;
  }).join("");
  grid.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calSelected = btn.dataset.date;
      grid.querySelectorAll(".cal-cell.selected").forEach((el) => el.classList.remove("selected"));
      btn.classList.add("selected");
    });
    btn.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCalNoteEditor(btn.dataset.date);
    });
  });
}

function formatNotesForWeChat(dateKey, notes = []) {
  const lines = [`${dateKey} Kalendereinträge`];
  if (!notes.length) {
    lines.push("(Keine Einträge)");
  } else {
    notes.forEach((n, i) => lines.push(`${i + 1}. ${n.text}`));
  }
  return lines.join("\n");
}

function openCalNoteEditor(key) {
  document.getElementById("calNoteEditor")?.closest(".modal_popup")?.remove();
  state.calSelected = key;
  const notes = state.calNotes[key] || [];
  const holiday = window.edexMacauHolidays?.get(key) || "";
  let editingId = null;
  const modal = document.createElement("div");
  modal.className = "modal_popup info cal-editor";
  modal.innerHTML = `
    <div class="cal-editor-head">
      <div class="cal-editor-heading">
        <h1>Kalendereinträge</h1>
        <h2>${escapeHtml(key)}${holiday ? ` · ${escapeHtml(holiday)}` : ""}</h2>
      </div>
      <div class="cal-editor-actions">
        <button type="button" id="cal-note-wechat">Zu WeChat kopieren</button>
        <button type="button" id="cal-note-cancel">Schließen</button>
      </div>
    </div>
    <div class="cal-editor-list" id="calNoteEditor">
      ${notes.length
        ? notes.map((n, i) => `
          <div class="cal-editor-item" data-edit="${escapeHtml(n.id)}">
            <span class="cal-editor-idx">${i + 1}.</span>
            <span class="cal-editor-text">${escapeHtml(n.text)}</span>
            <button type="button" data-edit-btn="${escapeHtml(n.id)}">Bearbeiten</button>
            <button type="button" data-del="${escapeHtml(n.id)}">Löschen</button>
          </div>`).join("")
        : `<p class="cal-editor-empty">Für diesen Tag gibt es noch keine Einträge.</p>`}
    </div>
    <label class="cal-editor-label" for="cal_note_text" id="cal_note_label">Eintrag hinzufügen</label>
    <textarea id="cal_note_text" rows="4" placeholder="Eintrag eingeben …"></textarea>
    <div class="cal-editor-add">
      <button type="button" id="cal-note-save">Eintrag hinzufügen</button>
    </div>
  `;
  document.body.appendChild(modal);
  window.edexI18n?.translatePage?.(modal);
  placeCentered(modal);
  window.edex?.setMouseIgnore?.(false);
  const input = modal.querySelector("#cal_note_text");
  const label = modal.querySelector("#cal_note_label");
  const saveBtn = modal.querySelector("#cal-note-save");
  input?.focus();

  const setEditMode = (id, text) => {
    editingId = id || null;
    modal.querySelectorAll(".cal-editor-item").forEach((el) => {
      el.classList.toggle("active", Boolean(id) && el.dataset.edit === id);
    });
    if (id) {
      label.textContent = "Eintrag bearbeiten";
      saveBtn.textContent = window.edexI18n?.translateDynamic?.("儲存修改") || "Änderungen speichern";
      input.value = text || "";
      input.focus();
    } else {
      label.textContent = "Eintrag hinzufügen";
      saveBtn.textContent = "Eintrag hinzufügen";
      input.value = "";
      input.focus();
    }
  };

  const close = () => modal.remove();
  modal.querySelector("#cal-note-cancel").onclick = close;

  const startEdit = (id) => {
    const note = (state.calNotes[key] || []).find((n) => n.id === id);
    if (note) setEditMode(id, note.text);
  };

  modal.querySelectorAll("[data-edit]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("[data-del]")) return;
      startEdit(row.dataset.edit);
    });
  });

  modal.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = async (event) => {
      event.stopPropagation();
      state.calNotes = await window.edex.removeCalendarNote(key, btn.dataset.del) || {};
      renderCalendar();
      close();
      openCalNoteEditor(key);
    };
  });

  modal.querySelector("#cal-note-wechat").onclick = async () => {
    const list = state.calNotes[key] || [];
    const text = formatNotesForWeChat(key, list);
    await window.edex.copyText(text);
    toast("Kopiert, bereit zum Einfügen in WeChat");
  };

  const save = async () => {
    const text = input.value.trim();
    if (!text) {
      toast("Bitte einen Eintrag eingeben");
      return;
    }
    let result;
    if (editingId) {
      result = await window.edex.updateCalendarNote(key, editingId, text);
    } else {
      result = await window.edex.addCalendarNote(key, text);
    }
    state.calNotes = result?.notes || result || {};
    renderCalendar();
    close();
    openCalNoteEditor(key);
  };
  saveBtn.onclick = save;
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      save();
    }
  });
}

function parentDir(target) {
  const value = String(target || "");
  const idx = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  return idx > 0 ? value.slice(0, idx) : "";
}

function isVirtualPath(target) {
  const value = String(target || "");
  return !value || /^shell:/i.test(value) || value.includes("::{") || value.startsWith("::");
}

function isDriveRoot(target) {
  return /^[a-zA-Z]:\\?$/.test(String(target || "").trim());
}

function tagDotsHtml(tags) {
  const list = Array.isArray(tags) ? tags : [];
  if (!list.length) return "";
  const dots = list.map((id) => {
    const tag = MACOS_TAGS.find((t) => t.id === id);
    if (!tag) return "";
    return `<i class="tag-dot" style="background:${tag.color}" title="${escapeHtml(tag.label)}"></i>`;
  }).join("");
  return dots ? `<span class="tag-dots">${dots}</span>` : "";
}

function canNativeFileItem(item) {
  if (!item?.path || isVirtualPath(item.path)) return false;
  if (item.kind === "drive" || item.kind === "thispc" || item.kind === "recycle") return false;
  if (isDriveRoot(item.path)) return false;
  return true;
}

/** Nearest stage root so grouped 系統桌面 + 桌面捷徑 share selection / drag paths. */
function fileStageRoot(nodeOrStage) {
  if (!nodeOrStage) return null;
  return nodeOrStage.closest?.(
    "#desktop-stage, #shortcuts-stage, .path-stage, .fs-results, .drives-stage"
  ) || nodeOrStage;
}

function stageFileNodes(stage) {
  const root = fileStageRoot(stage) || stage;
  return [...root.querySelectorAll(".desk-icon[data-path], .fs-row[data-path]")];
}

function clearStageSelection(stage) {
  stageFileNodes(stage).forEach((el) => el.classList.remove("selected"));
}

function selectedPathsInStage(stage) {
  return stageFileNodes(stage)
    .filter((el) => el.classList.contains("selected"))
    .map((el) => el.dataset.path)
    .filter(Boolean);
}

function selectFileNode(stage, node, event) {
  const root = fileStageRoot(stage) || stage;
  if (!node || !root.contains(node)) return;
  const item = itemFromIcon(node);
  if (!canNativeFileItem(item) && !node.classList.contains("fs-row")) {
    if (!(event.ctrlKey || event.metaKey || event.shiftKey)) clearStageSelection(root);
    return;
  }
  const nodes = stageFileNodes(root);
  if (event.shiftKey) {
    const anchor = root._fileAnchor && nodes.includes(root._fileAnchor) ? root._fileAnchor : node;
    const a = nodes.indexOf(anchor);
    const b = nodes.indexOf(node);
    if (a >= 0 && b >= 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (!(event.ctrlKey || event.metaKey)) clearStageSelection(root);
      for (let i = lo; i <= hi; i += 1) nodes[i].classList.add("selected");
      root._fileAnchor = node;
      return;
    }
  }
  if (event.ctrlKey || event.metaKey) node.classList.toggle("selected");
  else {
    clearStageSelection(root);
    node.classList.add("selected");
  }
  root._fileAnchor = node;
}

function ensureFileDragGhost() {
  let ghost = document.getElementById("file-drag-ghost");
  if (ghost) return ghost;
  ghost = document.createElement("div");
  ghost.id = "file-drag-ghost";
  ghost.hidden = true;
  document.body.appendChild(ghost);
  return ghost;
}

function showFileDragGhost(node, x, y) {
  const ghost = ensureFileDragGhost();
  const face = node.querySelector(".desk-icon-face")?.innerHTML
    || node.querySelector("img, svg")?.outerHTML
    || "";
  const label = node.querySelector("h3")?.textContent || "";
  ghost.innerHTML = `${face}<span>${escapeHtml(label)}</span>`;
  ghost.hidden = false;
  ghost.style.left = `${x + 12}px`;
  ghost.style.top = `${y + 12}px`;
  document.body.classList.add("is-file-dragging");
}

function moveFileDragGhost(x, y) {
  const ghost = document.getElementById("file-drag-ghost");
  if (!ghost || ghost.hidden) return;
  ghost.style.left = `${x + 12}px`;
  ghost.style.top = `${y + 12}px`;
}

function hideFileDragGhost() {
  const ghost = document.getElementById("file-drag-ghost");
  if (ghost) ghost.hidden = true;
  document.body.classList.remove("is-file-dragging");
}

/**
 * Native OS file drag — OLE-first.
 * Critical: do NOT arm / capture / prepare on pointerdown — that breaks dblclick
 * (open in Explorer + Ctrl+dblclick desktop tabs).
 */
function bindNativeFileDrag(node, item, stage) {
  if (!canNativeFileItem(item)) return;
  const dragStage = fileStageRoot(stage) || stage;
  node.setAttribute("draggable", "false");
  node.style.webkitUserDrag = "none";
  node.style.cursor = "pointer";
  node.querySelectorAll("img, svg, a, .desk-icon-face, h3, .meta, .tag-dots").forEach((el) => {
    el.setAttribute("draggable", "false");
    el.style.webkitUserDrag = "none";
    el.style.pointerEvents = "none";
  });

  // Prefer double-click open / Ctrl+tab. OS drag only after a deliberate gesture:
  // Alt+drag, or press-and-hold >350ms then move past threshold.
  const THRESHOLD = 20;
  const HOLD_BEFORE_DRAG_MS = 350;
  let pressing = false;
  let armed = false;
  let started = false;
  let startX = 0;
  let startY = 0;
  let downAt = 0;
  let altDrag = false;

  const collectPaths = () => {
    const paths = selectedPathsInStage(dragStage).filter((p) => canNativeFileItem({ path: p }));
    return paths.length ? paths : [item.path].filter(Boolean);
  };

  const disarm = () => {
    pressing = false;
    armed = false;
    altDrag = false;
    document.body.classList.remove("is-file-drag-armed");
    node.classList.remove("dragging");
    hideFileDragGhost();
    window.edex?.setFileDragArmed?.(false);
    window.edex?.cancelFileDragPrepare?.();
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);
  };

  const armForDrag = () => {
    if (armed || started) return;
    armed = true;
    document.body.classList.add("is-file-drag-armed");
    window.edex?.setFileDragArmed?.(true);
    window.edex?.prepareFileDrag?.()?.catch?.(() => {});
  };

  const beginOleDrag = async () => {
    if (!pressing || started) return;
    const list = collectPaths();
    if (!list.length) {
      toast("無法開始拖放（請確認檔案仍存在）");
      disarm();
      return;
    }
    started = true;
    armForDrag();
    document.body.classList.add("is-file-dragging");
    node.classList.add("dragging");
    showFileDragGhost(node, startX, startY);
    try {
      const result = await window.edex?.startFileDrag?.(list);
      if (!result?.ok) toast(result?.message || "無法開始拖放");
    } catch (err) {
      toast(err?.message || "無法開始拖放");
    } finally {
      started = false;
      disarm();
      document.body.classList.remove("is-file-dragging");
    }
  };

  const onMove = (event) => {
    if (!pressing || started) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < THRESHOLD * THRESHOLD) return;
    const held = Date.now() - downAt;
    if (!altDrag && held < HOLD_BEFORE_DRAG_MS) return;
    if (!node.classList.contains("selected")) {
      clearStageSelection(dragStage);
      node.classList.add("selected");
      dragStage._fileAnchor = node;
    }
    showFileDragGhost(node, event.clientX, event.clientY);
    moveFileDragGhost(event.clientX, event.clientY);
    beginOleDrag();
  };

  const onUp = () => {
    if (!started) disarm();
  };

  node.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target?.closest?.("input, textarea, .icon-rename")) return;
    if (event.detail > 1) {
      disarm();
      return;
    }
    // Ctrl/Cmd = select / Ctrl+dblclick tabs — never start OLE.
    if (event.ctrlKey || event.metaKey) return;
    pressing = true;
    armed = false;
    started = false;
    altDrag = Boolean(event.altKey);
    startX = event.clientX;
    startY = event.clientY;
    downAt = Date.now();
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
  });
}

function bindFileStage(stage, opts) {
  fileStageCtx.set(stage, opts || {});
  if (stage.tabIndex < 0) stage.tabIndex = 0;
  stage.style.cursor = "default";
  if (stage.dataset.fileMenuBound) return;
  stage.dataset.fileMenuBound = "1";
  stage.addEventListener("pointerdown", (event) => {
    const node = event.target.closest(".desk-icon, .fs-row");
    if (!node || !stage.contains(node)) {
      if (!event.target.closest("input, textarea, button, a, .icon-rename")) {
        clearStageSelection(stage);
      }
      return;
    }
    if (event.button !== 0) return;
    if (event.target.closest("input, textarea, .icon-rename")) return;
    selectFileNode(stage, node, event);
  });
  stage.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const ctx = fileStageCtx.get(stage) || {};
    const node = event.target.closest(".desk-icon, .fs-row, .drive-row");
    const item = node
      ? (ctx.itemFromNode?.(node) || itemFromIcon(node))
      : null;
    if (node && item && canNativeFileItem(item) && !node.classList.contains("selected")) {
      clearStageSelection(stage);
      node.classList.add("selected");
      stage._fileAnchor = node;
    }
    const menuItems = fileMenuItems(stage, item, ctx);
    if (!menuItems.length) return;
    openCardMenu(node || stage, menuItems, { x: event.clientX, y: event.clientY });
  });
  stage.addEventListener("dragover", (event) => {
    const ctx = fileStageCtx.get(stage) || {};
    if (ctx.destDir && (event.dataTransfer?.types?.includes("application/x-edex-file") || event.dataTransfer?.types?.includes("Files"))) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      stage.classList.add("drop-target");
    }
  });
  stage.addEventListener("dragleave", (event) => {
    if (!stage.contains(event.relatedTarget)) stage.classList.remove("drop-target");
  });
  stage.addEventListener("drop", async (event) => {
    const ctx = fileStageCtx.get(stage) || {};
    stage.classList.remove("drop-target");
    const encoded = event.dataTransfer?.getData("application/x-edex-file") || "";
    let sources = [];
    try { sources = encoded ? JSON.parse(encoded) : []; } catch { sources = []; }
    if (!sources.length && event.dataTransfer?.files?.length) {
      sources = [...event.dataTransfer.files].map((file) => window.edex.pathForFile(file)).filter(Boolean);
    }
    if (!ctx.destDir || !sources.length) return;
    event.preventDefault();
    try {
      const result = await window.edex.importFiles(ctx.destDir, sources);
      toast(`${result.count || 0} Element(e) eingefügt`);
      await ctx.onRefresh?.();
    } catch (err) {
      toast(err.message || "Dateien konnten nicht eingefügt werden");
    }
  });
}

function itemFromIcon(node) {
  if (!node?.dataset?.path) return null;
  let tags = [];
  try { tags = JSON.parse(node.dataset.tags || "[]"); } catch { tags = []; }
  return {
    path: node.dataset.path,
    name: node.dataset.name || node.querySelector("h3")?.textContent || "",
    isDirectory: node.dataset.dir === "1",
    targetPath: node.dataset.targetPath || "",
    targetIsDirectory: node.dataset.targetDir === "1",
    kind: node.dataset.kind || "",
    tags
  };
}

function fileMenuItems(stage, item, ctx) {
  const destDir = ctx.allowCreate === false
    ? ""
    : (ctx.destDir || (item && !isVirtualPath(item.path) ? (item.isDirectory ? item.path : parentDir(item.path)) : ""));
  const items = [];
  const isDesktopStage = Boolean(ctx.desktopActions) || stage?.id === "desktop-stage";
  if (isDesktopStage) {
    items.push(
      {
        label: "刷新內容",
        action: async () => {
          try {
            await refreshActiveDesktopView();
            toast("已刷新內容");
          } catch (err) {
            toast(err.message || "無法刷新");
          }
        }
      },
      {
        label: "自動整理",
        action: () => runOrganize()
      },
      {
        label: "Organisation konfigurieren",
        action: () => openOrganizerSettings()
      },
      { sep: true }
    );
  }
  const folderTab = resolveFolderForTab(item);
  if (folderTab) {
    items.push(
      {
        label: "在系統桌面標籤頁開啟",
        action: () => openFolderInDesktopTab(folderTab)
      },
      {
        label: "Als Ordner-Panel hinzufügen",
        action: () => addPathCardAt(folderTab.path)
      }
    );
  }
  if (destDir && !isVirtualPath(destDir)) {
    items.push({
      label: "新建資料夾",
      action: async () => {
        const name = await promptFolderName("未命名資料夾");
        if (name == null) return;
        try {
          const created = await window.edex.createFolder(destDir, name);
          toast(`已建立 ${created.name}`);
          await ctx.onRefresh?.();
        } catch (err) {
          toast(err.message || "無法建立資料夾");
        }
      }
    });
    if (state.fileClipboard.paths.length) {
      items.push({
        label: state.fileClipboard.cut ? "Einfügen und Verschieben" : "Einfügen und Kopieren",
        action: async () => {
          try {
            const result = await window.edex.importFiles(destDir, state.fileClipboard.paths);
            if (state.fileClipboard.cut) {
              for (const source of state.fileClipboard.paths) {
                await window.edex.trashItem(source);
              }
            }
            state.fileClipboard = { paths: [], cut: false };
            toast(`${result.count || 0} Element(e) eingefügt`);
            await ctx.onRefresh?.();
          } catch (err) {
            toast(err.message || "Einfügen fehlgeschlagen");
          }
        }
      });
    }
  }
  const canEdit = item && !isVirtualPath(item.path) && item.kind !== "drive" && !isDriveRoot(item.path);
  if (canEdit) {
    items.push(
      {
        label: "Vorschau",
        action: () => showFilePreview(item)
      },
      {
        label: "Kopieren",
        action: () => {
          state.fileClipboard = { paths: [item.path], cut: false };
          window.edex.clipboardWriteFiles?.([item.path]).catch?.(() => {});
          toast("Element zum Kopieren vorgemerkt");
        }
      },
      {
        label: "Ausschneiden",
        action: () => {
          state.fileClipboard = { paths: [item.path], cut: true };
          window.edex.clipboardWriteFiles?.([item.path]).catch?.(() => {});
          toast("Element zum Verschieben vorgemerkt");
        }
      },
      {
        label: "Eigenschaften",
        action: () => {
          const modified = Number(item.mtime) > 0 ? new Date(item.mtime).toLocaleString() : "Nicht verfügbar";
          const size = item.isDirectory ? "Ordner" : (item.sizeLabel || "Nicht verfügbar");
          window.alert(`Name: ${item.name || ""}\nPfad: ${item.path || ""}\nTyp: ${item.isDirectory ? "Ordner" : "Datei"}\nGröße: ${size}\nGeändert: ${modified}`);
        }
      },
      { sep: true },
      {
        label: "刪除",
        action: async () => {
          try {
            const result = await window.edex.trashItem(item.path);
            if (result?.cancelled) return;
            toast("已移至回收桶");
            await ctx.onRefresh?.();
          } catch (err) {
            toast(err.message || "無法刪除");
          }
        }
      },
      {
        label: "重新命名",
        action: () => {
          const node = [...stage.querySelectorAll(".desk-icon, .fs-row")].find((el) => el.dataset.path === item.path);
          if (node?.classList.contains("desk-icon")) startRename(node, item, ctx.onRefresh);
          else promptRename(item, ctx.onRefresh);
        }
      }
    );
    if (item.isDirectory) {
      items.push(
        { sep: true },
        {
          kind: "tags",
          tags: item.tags || [],
          onChange: async (tags) => {
            await window.edex.setItemTags(item.path, tags);
            const node = [...stage.querySelectorAll(".desk-icon")].find((el) => el.dataset.path === item.path);
            if (node) {
              node.dataset.tags = JSON.stringify(tags);
              const face = node.querySelector(".desk-icon-face");
              const dots = node.querySelector(".tag-dots");
              const html = tagDotsHtml(tags);
              if (dots && html) dots.outerHTML = html;
              else if (dots) dots.remove();
              else if (html && face) face.insertAdjacentHTML("beforeend", html);
              else if (html) node.querySelector("h3")?.insertAdjacentHTML("beforebegin", html);
            }
          }
        }
      );
    }
  }
  return items;
}

/** Modal text prompt — resolves with trimmed string, or null if cancelled. */
function promptTextInput({ title = "輸入", hint = "", value = "", okLabel = "確定", cancelLabel = "取消" } = {}) {
  return new Promise((resolve) => {
    document.getElementById("textInputPrompt")?.closest(".modal_popup")?.remove();
    const modal = document.createElement("div");
    modal.className = "modal_popup info";
    modal.innerHTML = `
      <h1>${escapeHtml(title)}</h1>
      ${hint ? `<h2>${escapeHtml(hint)}</h2>` : ""}
      <table id="textInputPrompt">
        <tr><th>名稱</th><th><input id="text_input_field" type="text" spellcheck="false" /></th></tr>
      </table>
      <div class="settings-footer">
        <button type="button" id="text-input-cancel">${escapeHtml(cancelLabel)}</button>
        <button type="button" id="text-input-ok">${escapeHtml(okLabel)}</button>
      </div>`;
    document.body.appendChild(modal);
    window.edexI18n?.translatePage?.(modal);
    placeCentered(modal, { width: Math.min(420, window.innerWidth * 0.42), topRatio: 0.22 });
    const input = modal.querySelector("#text_input_field");
    if (input) {
      input.value = value || "";
      input.focus();
      input.select();
    }
    const finish = (result) => {
      modal.remove();
      resolve(result);
    };
    modal.querySelector("#text-input-cancel").onclick = () => finish(null);
    modal.querySelector("#text-input-ok").onclick = () => {
      const next = String(input?.value || "").trim();
      if (!next) {
        toast("請輸入名稱");
        input?.focus();
        return;
      }
      finish(next);
    };
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") modal.querySelector("#text-input-ok")?.click();
      if (event.key === "Escape") finish(null);
    });
  });
}

function promptFolderName(defaultName = "未命名資料夾") {
  return promptTextInput({
    title: "新建資料夾",
    hint: "請輸入資料夾名稱",
    value: defaultName,
    okLabel: "建立"
  });
}

function promptRename(item, onRefresh) {
  promptTextInput({
    title: "重新命名",
    value: item.name || "",
    okLabel: "確定"
  }).then((next) => {
    if (next == null || next === item.name) return;
    window.edex.renameItem(item.path, next).then(async () => {
      toast("已重新命名");
      await onRefresh?.();
    }).catch((err) => toast(err.message || "無法重新命名"));
  });
}

async function showFilePreview(item) {
  if (!item || item.isDirectory) return;
  try {
    const preview = await window.edex.readFilePreview(item.path);
    const modal = document.createElement("div");
    modal.className = "modal_popup info file-preview-modal";
    const body = preview.kind === "image"
      ? `<img class="file-preview-image" src="data:${preview.mime};base64,${preview.data}" alt="${escapeHtml(item.name || "Vorschau")}">`
      : `<pre class="file-preview-text">${escapeHtml(preview.text || "")}</pre>`;
    modal.innerHTML = `
      <h2>Vorschau: ${escapeHtml(item.name || "")}</h2>
      <div class="file-preview-content">${body}</div>
      <div class="modal-actions"><button type="button" data-preview-close>Schließen</button></div>`;
    document.body.appendChild(modal);
    placeCentered(modal, { width: Math.min(900, window.innerWidth * 0.8) });
    modal.querySelector("[data-preview-close]")?.addEventListener("click", () => modal.remove());
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") modal.remove();
    });
    modal.tabIndex = 0;
    modal.focus();
  } catch (err) {
    toast(err.message || "Vorschau nicht möglich");
  }
}

function startRename(node, item, onRefresh) {
  const title = node.querySelector("h3");
  if (!title) {
    promptRename(item, onRefresh);
    return;
  }
  const input = document.createElement("input");
  input.className = "icon-rename";
  input.value = item.name || title.textContent || "";
  title.replaceWith(input);
  input.focus();
  input.select();
  window.edex?.setMouseIgnore?.(false);
  let done = false;
  const finish = async (commit) => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (!commit || !value || value === item.name) {
      await onRefresh?.();
      return;
    }
    try {
      await window.edex.renameItem(item.path, value);
      toast("已重新命名");
      await onRefresh?.();
    } catch (err) {
      toast(err.message || "無法重新命名");
      await onRefresh?.();
    }
  };
  input.addEventListener("pointerdown", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
}

function fillIconStage(stage, items, opts = {}) {
  const view = opts.view === "list" ? "list" : "grid";
  const listMode = view === "list";
  const dragRoot = fileStageRoot(stage) || stage;
  stage.classList.toggle("view-list", listMode);
  stage.classList.toggle("view-grid", !listMode);
  stage.innerHTML = "";
  const gap = snapGap();

  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = "desk-icon";
    node.dataset.path = item.path;
    node.dataset.name = item.name || "";
    node.dataset.dir = item.isDirectory ? "1" : "0";
    node.dataset.kind = item.kind || "";
    if (item.targetPath) node.dataset.targetPath = item.targetPath;
    if (item.targetIsDirectory) node.dataset.targetDir = "1";
    node.dataset.tags = JSON.stringify(item.tags || []);
    try {
      node.dataset.itemJson = JSON.stringify({
        path: item.path,
        name: item.name,
        displayName: item.displayName,
        isDirectory: Boolean(item.isDirectory),
        targetPath: item.targetPath || "",
        targetIsDirectory: Boolean(item.targetIsDirectory),
        kind: item.kind || "",
        category: item.category || "",
        size: Number(item.size) || 0,
        sizeLabel: item.sizeLabel || "",
        mtime: Number(item.mtime) || 0,
        tags: item.tags || []
      });
    } catch {
      // ignore
    }
    const label = itemLabel(item);
    node.innerHTML = `<span class="desk-icon-face">${fileBrowserIcon(item)}${tagDotsHtml(item.tags)}</span><h3 title="${escapeHtml(item.name || label)}">${escapeHtml(label)}</h3><span class="meta">${escapeHtml(item.sizeLabel || "")}</span>`;
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      holdOverlayHits(1500);
    }, true);
    // OS file drag — only after a real drag; do not steal double-clicks.
    bindNativeFileDrag(node, item, dragRoot);
    if (opts.pathCardId && item.isDirectory) {
      node.addEventListener("dblclick", (event) => {
        if (event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        event.stopPropagation();
        const card = state.pathCards.find((entry) => entry.id === opts.pathCardId);
        if (card) navigatePathCard(card, item.path, item.name);
      });
    }
    if (opts.draggable && !listMode) bindIconDrag(node, item, gap);
    stage.appendChild(node);
  });
  bindFileStage(stage, {
    destDir: opts.destDir || "",
    allowCreate: opts.allowCreate,
    desktopActions: opts.desktopActions,
    onRefresh: opts.onRefresh
  });
}

function bindIconDrag(node, item, gap) {
  node.addEventListener("pointerdown", (event) => {
    if (event.detail > 1) return;
    event.preventDefault();
    node.classList.add("dragging");
    node.style.zIndex = String(++state.zTop);
    const startX = event.clientX;
    const startY = event.clientY;
    const origX = node.offsetLeft;
    const origY = node.offsetTop;
    const move = (ev) => {
      let x = origX + (ev.clientX - startX);
      let y = origY + (ev.clientY - startY);
      if (state.settings.snapWidgets) {
        x = Math.round(x / gap) * gap;
        y = Math.round(y / gap) * gap;
      }
      x = Math.max(0, x);
      y = Math.max(0, y);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      state.iconPositions[item.path] = { x, y };
    };
    const up = () => {
      node.classList.remove("dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      persistLayout();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

function itemKindBucket(item) {
  if (!item) return "other";
  if (item.kind === "thispc" || item.kind === "recycle") return "icons";
  const name = String(item.name || "");
  if (/\.(lnk|url)$/i.test(name) || item.category === "shortcuts" || item.kind === "shortcut") {
    return "icons";
  }
  if (item.isDirectory) return "folders";
  return item.category || "other";
}

function deskFilterBuckets() {
  return [
    { id: "folders", label: "文件夾" },
    { id: "icons", label: "圖標" },
    ...FILE_FORMAT_FILTERS
  ];
}

function matchesDeskFilter(item, filter) {
  const bucket = itemKindBucket(item);
  if (!filter || filter === "all") return true;
  if (filter === "files") return !["folders", "icons"].includes(bucket);
  return bucket === filter;
}

function activeDesktopFolderTab() {
  if (!state.desktopTabId || state.desktopTabId === "classify") return null;
  return (state.desktopFolderTabs || []).find((tab) => tab.id === state.desktopTabId) || null;
}

function activeDesktopDropDir() {
  const tab = activeDesktopFolderTab();
  if (tab?.path) return tab.path;
  return state.bootstrap?.desktop || "";
}

function folderTabTitle(pathValue, fallback = "") {
  const base = String(pathValue || "").split(/[/\\]/).filter(Boolean).pop();
  return base || fallback || "資料夾";
}

function ensureDesktopEnabled() {
  if (!state.primary) return false;
  if (state.desktopEnabled !== false && document.getElementById("card_desktop")) return true;
  state.desktopEnabled = true;
  if (!state.desktopStage) state.desktopStage = findEmptyBox(defaultDesktop(), { desktop: true });
  persistLayout();
  // rebuildWorkspace keeps state.layout; never assign defaultWidgets() here.
  rebuildWorkspace();
  return Boolean(document.getElementById("card_desktop"));
}

/** Remove panel id(s) from all persisted display layouts (closed = gone forever). */
async function purgePanelFromSavedLayouts(panelIds) {
  const ids = (Array.isArray(panelIds) ? panelIds : [panelIds])
    .map((id) => String(id || "").trim())
    .filter(Boolean);
  if (!ids.length) return;
  const layouts = state.settings?.displayLayouts;
  if (!layouts || typeof layouts !== "object") return;
  const next = {};
  let changed = false;
  for (const [displayId, entry] of Object.entries(layouts)) {
    if (!entry?.layout) {
      next[displayId] = entry;
      continue;
    }
    const layout = { ...entry.layout };
    let local = false;
    for (const id of ids) {
      if (layout[id]) {
        delete layout[id];
        local = true;
      }
    }
    if (local) {
      next[displayId] = { ...entry, layout };
      changed = true;
    } else {
      next[displayId] = entry;
    }
  }
  if (!changed) return;
  try {
    const result = await window.edex.saveSettings({ displayLayouts: next });
    if (result?.settings) state.settings = result.settings;
  } catch {
    // ignore
  }
}

/** Resolve a real folder path for desktop tab open (folder or .lnk → folder). */
function resolveFolderForTab(item) {
  if (!item) return null;
  const pathValue = String(item.path || "").trim();
  const target = String(item.targetPath || "").trim();
  const name = itemLabel(item) || item.name || item.displayName || "";
  if (item.isDirectory && pathValue && !isVirtualPath(pathValue)) {
    return { path: pathValue, name: name || folderTabTitle(pathValue), isDirectory: true };
  }
  if ((item.targetIsDirectory || item.kind === "shortcut") && target && !isVirtualPath(target)) {
    // Folder shortcuts often only set targetPath; treat as folder when target has no file ext
    // or explicit targetIsDirectory flag.
    const base = target.split(/[/\\]/).pop() || "";
    const looksFile = /\.[a-z0-9]{1,8}$/i.test(base);
    if (item.targetIsDirectory || !looksFile) {
      return { path: target, name: name || folderTabTitle(target), isDirectory: true };
    }
  }
  return null;
}

function renderDeskTabs() {
  const bar = document.getElementById("desk-tab-bar");
  if (!bar) return;
  const active = state.desktopTabId || "classify";
  const folderTabs = state.desktopFolderTabs || [];
  const closeLabel = window.edexI18n?.translateDynamic?.("關閉") || "Schließen";
  bar.innerHTML = [
    `<button type="button" class="desk-tab${active === "classify" ? " on" : ""}" data-desk-tab="classify"><span class="desk-tab-label">Desktop-Kategorien</span></button>`,
    ...folderTabs.map((tab) => `
      <button type="button" class="desk-tab${active === tab.id ? " on" : ""}" data-desk-tab="${escapeHtml(tab.id)}" title="${escapeHtml(tab.path || "")}">
        <span class="desk-tab-label">${escapeHtml(tab.name || folderTabTitle(tab.path))}</span>
        <span class="desk-tab-close" data-desk-tab-close="${escapeHtml(tab.id)}" title="${escapeHtml(closeLabel)}">×</span>
      </button>
    `)
  ].join("");
}

function bindDeskTabs(desk) {
  const bar = desk.querySelector("#desk-tab-bar") || document.getElementById("desk-tab-bar");
  if (!bar) return;
  if (bar.dataset.bound === "1") {
    renderDeskTabs();
    return;
  }
  bar.dataset.bound = "1";
  bar.addEventListener("click", async (event) => {
    const closeBtn = event.target.closest("[data-desk-tab-close]");
    if (closeBtn) {
      event.preventDefault();
      event.stopPropagation();
      await closeDesktopFolderTab(closeBtn.dataset.deskTabClose);
      return;
    }
    const tabBtn = event.target.closest("[data-desk-tab]");
    if (!tabBtn) return;
    event.preventDefault();
    event.stopPropagation();
    state.desktopTabId = tabBtn.dataset.deskTab || "classify";
    persistLayout();
    await arrangeDesktop();
  });
  renderDeskTabs();
}

async function openFolderInDesktopTab(item) {
  const folder = resolveFolderForTab(item) || (
    item?.isDirectory && item?.path && !isVirtualPath(item.path)
      ? { path: item.path, name: itemLabel(item) || item.name, isDirectory: true }
      : null
  );
  const folderPath = String(folder?.path || "").trim();
  if (!folderPath || isVirtualPath(folderPath)) {
    toast("無法在桌面容器開啟此資料夾");
    return;
  }
  if (!ensureDesktopEnabled()) {
    toast("系統桌面容器未啟用");
    return;
  }
  const existing = (state.desktopFolderTabs || []).find(
    (tab) => String(tab.path || "").toLowerCase() === folderPath.toLowerCase()
  );
  if (existing) {
    state.desktopTabId = existing.id;
  } else {
    const id = `ft${Date.now().toString(36)}`;
    const tab = {
      id,
      path: folderPath,
      name: folder.name || folderTabTitle(folderPath, item?.name),
      listing: null
    };
    state.desktopFolderTabs = [...(state.desktopFolderTabs || []), tab];
    state.desktopTabId = id;
  }
  await persistLayout();
  const desk = document.getElementById("card_desktop");
  if (desk) bindDeskTabs(desk);
  renderDeskTabs();
  await arrangeDesktop();
  toast(`已在系統桌面開啟「${folderTabTitle(folderPath, folder.name)}」`);
}

async function closeDesktopFolderTab(tabId) {
  const id = String(tabId || "");
  if (!id || id === "classify") return;
  state.desktopFolderTabs = (state.desktopFolderTabs || []).filter((tab) => tab.id !== id);
  if (state.desktopTabId === id) state.desktopTabId = "classify";
  persistLayout();
  renderDeskTabs();
  await arrangeDesktop();
}

async function refreshActiveDesktopView() {
  const tab = activeDesktopFolderTab();
  if (tab) {
    tab.listing = null;
    await arrangeDesktop();
    return;
  }
  await loadDesktopListing({ decorate: "fast", includeShell: false });
  arrangeDesktop();
}

async function loadFolderTabListing(tab) {
  if (!tab?.path) return { items: [], total: 0 };
  try {
    const listing = await window.edex.listFolder(tab.path, { systemIcons: "fast" });
    tab.listing = listing;
    tab.listingError = "";
    return listing;
  } catch (err) {
    tab.listing = { items: [], total: 0 };
    tab.listingError = err.message || "無法讀取資料夾";
    return tab.listing;
  }
}

function bindDeskFilters(desk) {
  desk.querySelectorAll("[data-desk-filter]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.desktopFilter = btn.dataset.deskFilter || "all";
      state.desktopTabId = "classify";
      persistLayout();
      arrangeDesktop();
    });
  });
  syncDeskFilters();
}

function syncDeskFilters() {
  const current = state.desktopFilter || "all";
  document.querySelectorAll("[data-desk-filter]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.deskFilter === current);
  });
}

function syncDesktopChrome() {
  const filterBar = document.getElementById("desk-filter-bar");
  const pathText = document.getElementById("desktop-path-text");
  const folderTab = activeDesktopFolderTab();
  const onClassify = !folderTab;
  if (filterBar) filterBar.hidden = !onClassify;
  if (pathText) {
    const shown = folderTab?.path || state.bootstrap?.desktop || "";
    pathText.textContent = shown;
    pathText.title = shown;
  }
  renderDeskTabs();
  syncDeskFilters();
}

async function arrangeDesktop() {
  const stage = document.getElementById("desktop-stage");
  if (!stage) return;
  syncDesktopChrome();

  const folderTab = activeDesktopFolderTab();
  const view = state.iconView === "list" ? "list" : "grid";

  if (folderTab) {
    stage.classList.remove("view-grouped");
    if (!folderTab.listing) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(window.edexI18n?.translateDynamic?.("讀取中…") || "Loading …")}</p>`;
      await loadFolderTabListing(folderTab);
    }
    const destDir = folderTab.path || "";
    const fileOpts = {
      destDir,
      desktopActions: true,
      onRefresh: async () => {
        folderTab.listing = null;
        await arrangeDesktop();
      }
    };
    if (folderTab.listingError) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(folderTab.listingError)}</p>`;
      bindFileStage(stage, fileOpts);
      return;
    }
    const items = listingItems(folderTab.listing);
    if (!items.length) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(window.edexI18n?.translateDynamic?.("此資料夾沒有可顯示的項目") || "This folder has no items to display")}</p>`;
      bindFileStage(stage, fileOpts);
      return;
    }
    fillIconStage(stage, items, { draggable: false, view, ...fileOpts });
    return;
  }

  const destDir = state.bootstrap?.desktop || "";
  const all = desktopItems();
  const filter = state.desktopFilter || "all";
  const fileOpts = {
    destDir,
    desktopActions: true,
    onRefresh: async () => {
      await loadDesktopListing();
      arrangeDesktop();
    }
  };
  const buckets = deskFilterBuckets();
  if (state.desktopGrouped && filter === "all") {
    stage.classList.remove("view-list", "view-grid");
    stage.classList.add("view-grouped");
    const visibleBuckets = buckets.filter((bucket) => all.some((item) => matchesDeskFilter(item, bucket.id)));
    const list = visibleBuckets.length ? visibleBuckets : buckets;
    stage.innerHTML = list.map((bucket) => {
      const count = all.filter((item) => matchesDeskFilter(item, bucket.id)).length;
      const label = window.edexI18n?.translateDynamic?.(bucket.label) || bucket.label;
      return `<section class="desk-group" data-bucket="${bucket.id}"><h4>${escapeHtml(label)}<em>${count}</em></h4><div class="desk-group-items"></div></section>`;
    }).join("");
    list.forEach((bucket) => {
      const inner = stage.querySelector(`[data-bucket="${bucket.id}"] .desk-group-items`);
      if (!inner) return;
      const items = all.filter((item) => matchesDeskFilter(item, bucket.id));
      if (!items.length) {
        inner.className = "desk-group-items";
        const label = window.edexI18n?.translateDynamic?.(bucket.label) || bucket.label;
        const locale = window.edexI18n?.locale?.() || "de";
        const empty = locale === "zh-Hant" ? `沒有${bucket.label}` : locale === "en" ? `No ${label}` : `Keine ${label}`;
        inner.innerHTML = `<p class="path-empty">${escapeHtml(empty)}</p>`;
        return;
      }
      fillIconStage(inner, items, { draggable: false, view, ...fileOpts });
    });
    bindFileStage(stage, fileOpts);
    return;
  }
  stage.classList.remove("view-grouped");
  const items = all.filter((item) => matchesDeskFilter(item, filter));
  fillIconStage(stage, items, { draggable: false, view, ...fileOpts });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = window.edexI18n?.translateDynamic?.(text) || text;
}

function renderStats() {
  // Category / storage panels removed — keep no-op for existing call sites.
}

function log(text) {
  const node = document.getElementById("op_log");
  if (!node) return;
  const time = new Date().toLocaleTimeString(window.edexI18n?.locale?.() || "zh-Hant", { hour12: false });
  const entry = document.createDocumentFragment();
  entry.append(document.createTextNode(`[${time}] ${window.edexI18n?.translateDynamic?.(text) || String(text)}`));
  entry.append(document.createElement("br"));
  node.prepend(entry);
}

function updateDisplayChip() {
  const chip = document.getElementById("display_chip");
  if (!chip) return;
  const { width, height } = pageSize();
  const role = state.primary ? "主螢幕" : "獨立頁面";
  const who = state.bootstrap?.username || "";
  const monitor = `顯示器 ${state.displayIndex + 1} · ${layoutMode().toUpperCase()}`;
  const localize = (value) => window.edexI18n?.translateDynamic?.(value) || value;
  chip.textContent = `${localize(monitor)} · ${width}×${height} · ${who} · ${localize(role)}`;
}

async function refreshPlan() {
  if (!state.scan) return;
  state.plan = await window.edex.plan(state.scan, { includeFolders: state.includeFolders });
  setText("st_plan", `${state.plan.count} 筆`);
  setText("st_folders", state.includeFolders ? "一併移動" : "略過");
}

async function doScan() {
  const cards = state.pathCards.filter((card) => card.path);
  setText("st_mode", "掃描中");
  try {
    if (!cards.length) {
      state.scan = null;
      state.plan = null;
    } else {
      await Promise.all(cards.map((card) => scanCard(card)));
    }
  } finally {
    setText("st_mode", "待命");
  }
  await loadDesktopListing();
  arrangeDesktop();
}

function closeSettings() {
  clearSnapGuides();
  document.getElementById("settingsEditor")?.closest(".modal_popup")?.remove();
}

function requestPresetName(parent) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.innerHTML = `
      <form method="dialog">
        <h2>Preset speichern</h2>
        <input name="name" type="text" maxlength="80" value="Mein Preset" autofocus />
        <div class="settings-footer">
          <button value="cancel" type="submit">Abbrechen</button>
          <button value="save" type="submit">Speichern</button>
        </div>
      </form>`;
    parent.appendChild(dialog);
    const input = dialog.querySelector("input");
    const finish = () => {
      const value = dialog.returnValue === "save" ? input.value.trim() : "";
      dialog.remove();
      resolve(value || null);
    };
    dialog.addEventListener("close", finish, { once: true });
    dialog.showModal();
    input.select();
  });
}

function presetSettingsSnapshot() {
  const snapshot = { ...state.settings };
  delete snapshot.displayLayouts;
  delete snapshot.presets;
  return snapshot;
}

async function saveDesktopLayout() {
  snapAllLayoutToGrid();
  try {
    await persistLayout();
    toast("Desktop-Layout dieses Monitors gespeichert");
    return true;
  } catch (err) {
    toast(err?.message || "Layout konnte nicht gespeichert werden");
    return false;
  }
}

async function resetDesktopLayout() {
  state.layout = defaultWidgets();
  state.desktopStage = defaultDesktop();
  state.desktopEnabled = true;
  state.pathCards = [];
  state.desktopFolderTabs = [];
  state.desktopTabId = "classify";
  snapAllLayoutToGrid();
  try {
    await persistLayout();
    rebuildWorkspace();
    toast("Desktop-Layout zurückgesetzt");
  } catch (err) {
    toast(err?.message || "Layout konnte nicht zurückgesetzt werden");
  }
}

function openOrganizerSettings() {
  document.getElementById("organizerSettingsModal")?.remove();
  const modal = document.createElement("div");
  modal.id = "organizerSettingsModal";
  modal.className = "modal_popup info central-settings-modal";
  modal.innerHTML = `
    <h1>Desktop organisieren</h1>
    <p>Lege fest, ob die Desktop-Inhalte nur gruppiert angezeigt oder tatsächlich in Kategorie- und Endungsordner verschoben werden.</p>
    <table>
      <tr><th>Option</th><th>Wert</th></tr>
      <tr>
        <td>Dateien verschieben</td>
        <td><label><input id="organizer-migrate" type="checkbox" ${state.settings?.migrateFiles ? "checked" : ""}> Dateien beim Organisieren verschieben</label></td>
      </tr>
      <tr>
        <td>Ordner einbeziehen</td>
        <td><label><input id="organizer-folders" type="checkbox" ${state.includeFolders ? "checked" : ""}> Ordner ebenfalls einbeziehen</label></td>
      </tr>
    </table>
    <div class="settings-footer">
      <button type="button" id="organizer-save">Speichern</button>
      <button type="button" id="organizer-run">Speichern und ausführen</button>
      <button type="button" id="organizer-close">Schließen</button>
    </div>`;
  document.body.appendChild(modal);
  placeCentered(modal, { width: Math.min(620, window.innerWidth * 0.55), topRatio: 0.22 });

  const save = async () => {
    const migrateFiles = Boolean(modal.querySelector("#organizer-migrate")?.checked);
    const includeFolders = Boolean(modal.querySelector("#organizer-folders")?.checked);
    const result = await window.edex.saveSettings({ migrateFiles, includeFolders });
    state.settings = result.settings || { ...state.settings, migrateFiles, includeFolders };
    state.includeFolders = includeFolders;
    toast("Organisations-Einstellungen gespeichert");
  };
  modal.querySelector("#organizer-save")?.addEventListener("click", async () => {
    try {
      await save();
      modal.remove();
    } catch (err) {
      toast(err?.message || "Organisations-Einstellungen konnten nicht gespeichert werden");
    }
  });
  modal.querySelector("#organizer-run")?.addEventListener("click", async () => {
    try {
      await save();
      modal.remove();
      await runOrganize();
    } catch (err) {
      toast(err?.message || "Organisation konnte nicht gestartet werden");
    }
  });
  modal.querySelector("#organizer-close")?.addEventListener("click", () => modal.remove());
}

function openSettings(focusPanel = "") {
  if (document.getElementById("settingsEditor")) return;
  const modal = document.createElement("div");
  modal.className = "modal_popup info settings-modal";
  const themeOpts = state.themes.map((t) =>
    `<option value="${escapeHtml(t)}" ${t === state.themeName ? "selected" : ""}>${escapeHtml(t)}</option>`
  ).join("");
  const wallOpts = state.wallpapers.map((w) =>
    `<option value="${escapeHtml(w.id)}" ${w.id === (state.settings.wallpaper || "grid") ? "selected" : ""}>${escapeHtml(window.edexI18n?.translateDynamic?.(w.label) || w.label)}</option>`
  ).join("");
  const presetOpts = (state.settings.presets || []).map((preset) =>
    `<option value="${escapeHtml(preset.name)}">${escapeHtml(preset.name)}</option>`
  ).join("");
  const dockLabelColor = String(state.settings?.dockLabelColor || "theme");
  const currentLocale = state.settings.locale || "de";
  const zhLanguageLabel = currentLocale === "zh-Hant"
    ? "繁體中文"
    : currentLocale === "en"
      ? "Traditional Chinese"
      : "Chinesisch (traditionell)";

  modal.innerHTML = `
    <h1>Einstellungen</h1>
    <h2>Sprache / 語言</h2>
    <table><tr><td>Sprache</td><td>UI-Sprache der Anwendung</td><td>
      <select id="set-locale">
        <option value="zh-Hant" ${currentLocale === "zh-Hant" ? "selected" : ""}>${zhLanguageLabel}</option>
        <option value="de" ${state.settings.locale === "de" ? "selected" : ""}>Deutsch</option>
        <option value="en" ${state.settings.locale === "en" ? "selected" : ""}>English</option>
      </select>
    </td></tr></table>
    <h2>Presets</h2>
    <div class="settings-footer preset-controls">
      <select id="set-preset" ${presetOpts ? "" : "disabled"}>
        <option value="">Preset auswählen …</option>
        ${presetOpts}
      </select>
      <button type="button" id="set-preset-save">Als Preset speichern</button>
      <button type="button" id="set-preset-load" ${presetOpts ? "" : "disabled"}>Preset laden</button>
      <button type="button" id="set-preset-delete" ${presetOpts ? "" : "disabled"}>Preset löschen</button>
    </div>
    <h2>畫面與外觀（解析度與網格全顯示器同步）</h2>
    <table id="settingsEditor">
      <tr><th>項目</th><th>說明</th><th>值</th></tr>
      <tr>
        <td>本顯示器</td>
        <td>實體解析度（非系統 2K 縮放）</td>
        <td>顯示器 ${state.displayIndex + 1} · ${pageSize().width}×${pageSize().height}</td>
      </tr>
      <tr>
        <td>顯示器數量</td>
        <td>各自獨立視窗，非鏡像</td>
        <td>${state.displays.length || 1} 台</td>
      </tr>
      <tr>
        <td>主題</td>
        <td>原版介面主題</td>
        <td><select id="set-theme">${themeOpts}</select></td>
      </tr>
      <tr>
        <td>Windows-Farben</td>
        <td>Akzentfarbe anwenden; bei „Stark“ zusätzlich den Windows-Dunkelmodus setzen</td>
        <td>
          <select id="set-windows-colors">
            <option value="off" ${state.settings.windowsColorMode === "off" ? "selected" : ""}>Aus</option>
            <option value="subtle" ${state.settings.windowsColorMode !== "off" && state.settings.windowsColorMode !== "strong" ? "selected" : ""}>Dezent</option>
            <option value="strong" ${state.settings.windowsColorMode === "strong" ? "selected" : ""}>Stark</option>
          </select>
        </td>
      </tr>
      <tr>
        <td>Theme-Hintergrund beibehalten</td>
        <td>Theme-Wallpaper auch ohne aktive Desktop-UI-Oberfläche als Windows-Desktop verwenden</td>
        <td><input id="set-keep-theme-wallpaper" type="checkbox" ${state.settings.keepThemeWallpaper === true ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>Rainmeter-HUD</td>
        <td>Optionales Rainmeter-Overlay mit Uhr, CPU und RAM im aktiven Theme verwenden</td>
        <td><input id="set-rainmeter" type="checkbox" ${state.settings.rainmeterEnabled === true ? "checked" : ""}> <span id="rainmeter-status" class="settings-inline-status">Status wird geprüft …</span></td>
      </tr>
      <tr>
        <td>Mit Windows starten</td>
        <td>Desktop UI automatisch bei der Windows-Anmeldung öffnen</td>
        <td><input id="set-start-with-windows" type="checkbox" ${state.settings.startWithWindows === true ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>壁紙</td>
        <td>所有顯示器共用背景</td>
        <td><select id="set-wall">${wallOpts}</select></td>
      </tr>
      <tr>
        <td>圖示顯示</td>
        <td>桌面容器內圖示排列</td>
        <td>
          <select id="set-icon-view">
            <option value="grid" ${state.iconView === "grid" ? "selected" : ""}>圖示網格</option>
            <option value="list" ${state.iconView === "list" ? "selected" : ""}>圖示列表</option>
          </select>
        </td>
      </tr>
      <tr>
        <td>自動吸附</td>
        <td>容器拖曳時自動對齊（含螢幕邊緣）</td>
        <td><input id="set-snap" type="checkbox" ${state.settings.snapWidgets !== false ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>底部 Dock</td>
        <td>主螢幕底邊背景條；寬度跟隨任務欄圖示；不遮擋點擊</td>
        <td><input id="set-dock" type="checkbox" ${dockEnabled() ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>Dock 外框</td>
        <td>圓角 / 梯形 / 直角；邊框帶電路發光點</td>
        <td>
          <select id="set-dock-frame" ${!dockEnabled() ? "disabled" : ""}>
            <option value="rounded" ${(state.settings?.dockFrameStyle || "rounded") === "rounded" ? "selected" : ""}>圓角</option>
            <option value="trapezoid" ${state.settings?.dockFrameStyle === "trapezoid" ? "selected" : ""}>梯形</option>
            <option value="rect" ${state.settings?.dockFrameStyle === "rect" ? "selected" : ""}>直角</option>
          </select>
        </td>
      </tr>
      <tr>
        <td>Dock-Beschriftungsfarbe</td>
        <td>Beschriftungen werden automatisch an die Theme-Farbe angepasst oder verwenden eine eigene Farbe</td>
        <td>
          <select id="set-dock-label-color-mode" ${!dockEnabled() ? "disabled" : ""}>
            <option value="theme" ${dockLabelColor === "theme" ? "selected" : ""}>Automatisch (Theme)</option>
            <option value="custom" ${dockLabelColor !== "theme" ? "selected" : ""}>Benutzerdefiniert</option>
          </select>
          <input id="set-dock-label-color" type="color" value="${escapeHtml(dockLabelColor === "theme" ? "#00eaff" : dockLabelColor)}" ${!dockEnabled() || dockLabelColor === "theme" ? "disabled" : ""} title="Dock-Beschriftungsfarbe">
        </td>
      </tr>
      <tr>
        <td>Windows-Skalierzone</td>
        <td>Geschützter Bereich für eingebettete Windows-Fenster und skalierbare Programme</td>
        <td><input id="set-window-zone-enabled" type="checkbox" ${state.settings.windowZoneEnabled !== false ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>Skalierzone-Ränder</td>
        <td>Abstand der Zone vom linken, oberen, rechten und unteren Bildschirmrand in Prozent</td>
        <td>
          <div class="zone-margin-fields" aria-label="Skalierzone-Ränder in Prozent">
            <label>L <input id="set-zone-left" type="number" min="0" max="45" step="1" value="${Number(state.settings.windowZoneMargins?.left ?? 18)}">%</label>
            <label>O <input id="set-zone-top" type="number" min="0" max="45" step="1" value="${Number(state.settings.windowZoneMargins?.top ?? 8)}">%</label>
            <label>R <input id="set-zone-right" type="number" min="0" max="45" step="1" value="${Number(state.settings.windowZoneMargins?.right ?? 18)}">%</label>
            <label>U <input id="set-zone-bottom" type="number" min="0" max="45" step="1" value="${Number(state.settings.windowZoneMargins?.bottom ?? 8)}">%</label>
          </div>
        </td>
      </tr>
      <tr>
        <td>Rastergröße</td>
        <td>Alle Monitore verwenden denselben Rasterabstand in Pixeln</td>
        <td><input id="set-grid" type="number" min="12" max="96" step="1" value="${settingsGridSize()}"></td>
      </tr>
      <tr>
        <td>Uhr als Panel</td>
        <td>Uhr und Datum mit sichtbarem Rahmen als normales verschiebbares Panel anzeigen</td>
        <td><input id="set-clock-panel" type="checkbox" ${state.settings.clockPanelFrame === true ? "checked" : ""}></td>
      </tr>
      <tr>
        <td>Suchschriftgröße</td>
        <td>Einheitliche Schriftgröße für Dateisuche, Pfade und Eingabefelder (px, Standard 12)</td>
        <td><input id="set-search-font" type="text" inputmode="numeric" spellcheck="false" value="${searchFontSize()}"></td>
      </tr>
      <tr>
        <td>Code-Regen-Schriftgröße</td>
        <td>Schriftgröße des Code-Hintergrunds (px, 8–72)</td>
        <td><input id="set-rain-font" type="text" inputmode="numeric" spellcheck="false" value="${rainFontSize()}"></td>
      </tr>
      <tr>
        <td>Code-Regen-Geschwindigkeit</td>
        <td>Fallgeschwindigkeit (0,1–8,0)</td>
        <td><input id="set-rain-speed" type="text" inputmode="decimal" spellcheck="false" value="${rainSpeed()}"></td>
      </tr>
      <tr>
        <td>Layout-Auflösung</td>
        <td>Für alle Monitore synchron. 2K-Bildschirme werden proportional skaliert</td>
        <td>
          <select id="set-layout-mode">
            <option value="2k" ${layoutMode() === "2k" ? "selected" : ""}>2K（2560×1440）</option>
            <option value="4k" ${layoutMode() === "4k" ? "selected" : ""}>4K（3840×2160）</option>
          </select>
        </td>
      </tr>
      <tr>
        <td>UI-Skalierung</td>
        <td>Für alle Monitore synchron, zusätzlich zur Layout-Auflösung</td>
        <td><input id="set-ui-scale" type="number" min="0.4" max="1.2" step="0.05" value="${displayUiScale()}"></td>
      </tr>
    </table>

    <div class="settings-footer">
      <span id="settings-save-status" class="settings-save-status" aria-live="polite">Keine ungespeicherten Änderungen</span>
      <button type="button" id="set-quit">Programm beenden</button>
      <button type="button" id="set-cancel">Schließen</button>
      <button type="button" id="set-save">Alles speichern</button>
    </div>
  `;
  const settingsTable = modal.querySelector("#settingsEditor");
  if (settingsTable) {
    const rows = [...settingsTable.querySelectorAll("tr")];
    const header = rows.shift();
    const rowContains = (row, id) => Boolean(row.querySelector(`#${id}`));
    const firstRow = (id) => {
      const index = rows.findIndex((row) => rowContains(row, id));
      return index < 0 ? rows.length : index;
    };
    const windowsStart = firstRow("set-windows-colors");
    const cuts = [
      ["Anzeige & Theme", 0, windowsStart, true],
      ["Windows-Integration", windowsStart, firstRow("set-grid"), false],
      ["Uhr", firstRow("set-grid"), firstRow("set-search-font"), false],
      ["Interface & Code-Hintergrund", firstRow("set-search-font"), rows.length, false]
    ];
    const fragment = document.createDocumentFragment();
    cuts.forEach(([title, start, end, open], index) => {
      const table = settingsTable.cloneNode(false);
      table.removeAttribute("id");
      table.classList.add("settings-section-table");
      if (index === 0) table.id = "settingsEditor";
      const body = document.createElement("tbody");
      if (header) body.appendChild(header.cloneNode(true));
      rows.slice(start, end).forEach((row) => body.appendChild(row));
      table.appendChild(body);
      const details = document.createElement("details");
      details.className = "settings-section";
      details.open = open;
      const summary = document.createElement("summary");
      summary.textContent = title;
      details.append(summary, table);
      fragment.appendChild(details);
    });
    settingsTable.replaceWith(fragment);
  }
  document.body.appendChild(modal);
  const saveStatus = modal.querySelector("#settings-save-status");
  const setSaveStatus = (message, dirty = false) => {
    if (!saveStatus) return;
    saveStatus.textContent = message;
    saveStatus.dataset.state = dirty ? "dirty" : "saved";
  };
  modal.querySelectorAll(".settings-section input, .settings-section select, .settings-section textarea")
    .forEach((control) => {
      control.addEventListener("input", () => setSaveStatus("Ungespeicherte Änderungen", true));
      control.addEventListener("change", () => setSaveStatus("Ungespeicherte Änderungen", true));
    });
  window.edexI18n?.translatePage?.(modal);
  placeCentered(modal);
  window.edex?.getStartWithWindows?.().then((enabled) => {
    const checkbox = modal.querySelector("#set-start-with-windows");
    if (checkbox) checkbox.checked = Boolean(enabled);
  }).catch(() => {});
  const updateZonePreview = () => showWindowZonePreview(modal);
  ["#set-zone-left", "#set-zone-top", "#set-zone-right", "#set-zone-bottom", "#set-window-zone-enabled"]
    .forEach((selector) => {
      modal.querySelector(selector)?.addEventListener("input", updateZonePreview);
      modal.querySelector(selector)?.addEventListener("change", updateZonePreview);
    });
  updateZonePreview();
  window.edex?.getRainmeterStatus?.().then((status) => {
    const statusEl = modal.querySelector("#rainmeter-status");
    if (!statusEl) return;
    if (!status?.installed) {
      statusEl.textContent = "Rainmeter nicht gefunden";
      statusEl.dataset.state = "missing";
    } else if (status.enabled) {
      statusEl.textContent = "installiert · aktiviert";
      statusEl.dataset.state = "ready";
    } else {
      statusEl.textContent = "installiert · deaktiviert";
      statusEl.dataset.state = "disabled";
    }
  }).catch(() => {
    const statusEl = modal.querySelector("#rainmeter-status");
    if (statusEl) {
      statusEl.textContent = "Status nicht verfügbar";
      statusEl.dataset.state = "unknown";
    }
  });
  const focusSection = focusPanel === "coderain"
    ? "Interface & Code-Hintergrund"
    : focusPanel === "clock" ? "Uhr" : focusPanel === "desktop" ? "Desktop UI" : "";
  if (focusSection) {
    modal.querySelectorAll(".settings-section").forEach((section) => {
      section.open = section.querySelector("summary")?.textContent === focusSection;
    });
  }

  const presetSelect = modal.querySelector("#set-preset");
  const updatePresetButtons = () => {
    const active = Boolean(presetSelect?.value);
    modal.querySelector("#set-preset-load")?.toggleAttribute("disabled", !active);
    modal.querySelector("#set-preset-delete")?.toggleAttribute("disabled", !active);
  };
  presetSelect?.addEventListener("change", updatePresetButtons);
  modal.querySelector("#set-preset-save")?.addEventListener("click", async () => {
    const name = await requestPresetName(modal);
    if (!name) return;
    await persistLayout();
    const currentLayout = currentDisplayLayout();
    const presetDisplayLayouts = {
      ...(state.settings.displayLayouts || {}),
      [String(state.displayId)]: currentLayout
    };
    const presets = (state.settings.presets || []).filter((preset) => preset.name !== name);
    presets.push({
      name: name.slice(0, 80),
      createdAt: new Date().toISOString(),
      settings: presetSettingsSnapshot(),
      layout: currentLayout,
      displayLayouts: presetDisplayLayouts
    });
    const result = await window.edex.saveSettings({ presets: presets.slice(-20) });
    logUiAction("settings.save", "Einstellungen gespeichert", {
      theme: state.themeName || state.settings.theme || "tron",
      wallpaper: state.settings.wallpaper || "grid",
      rainmeterEnabled: state.settings.rainmeterEnabled === true
    });
    state.settings = result.settings;
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    presetSelect?.appendChild(option);
    if (presetSelect) presetSelect.value = name;
    modal.querySelector("#set-preset-load")?.removeAttribute("disabled");
    modal.querySelector("#set-preset-delete")?.removeAttribute("disabled");
    toast(`Preset „${name}“ gespeichert`);
  });
  modal.querySelector("#set-preset-load")?.addEventListener("click", async () => {
    const preset = (state.settings.presets || []).find((item) => item.name === presetSelect?.value);
    if (!preset) return;
    await window.edex.saveSettings({
      ...preset.settings,
      displayLayouts: preset.displayLayouts || state.settings.displayLayouts,
      presets: state.settings.presets
    });
    await window.edex.saveDisplayLayout(preset.layout);
    location.reload();
  });
  modal.querySelector("#set-preset-delete")?.addEventListener("click", async () => {
    const name = presetSelect?.value;
    if (!name) return;
    const presets = (state.settings.presets || []).filter((preset) => preset.name !== name);
    const result = await window.edex.saveSettings({ presets });
    state.settings = result.settings;
    presetSelect.querySelector(`option[value="${CSS.escape(name)}"]`)?.remove();
    presetSelect.value = "";
    updatePresetButtons();
    toast(`Preset „${name}“ gelöscht`);
  });

  const previewRain = () => {
    const fontRaw = Number(modal.querySelector("#set-rain-font")?.value);
    const speedRaw = Number(modal.querySelector("#set-rain-speed")?.value);
    state.settings = {
      ...state.settings,
      rainFontSize: Number.isFinite(fontRaw) ? Math.max(8, Math.min(72, Math.round(fontRaw))) : rainFontSize(),
      rainSpeed: Number.isFinite(speedRaw) ? Math.max(0.1, Math.min(8, Math.round(speedRaw * 10) / 10)) : rainSpeed()
    };
    applyRainMetrics();
  };
  modal.querySelector("#set-rain-font")?.addEventListener("input", previewRain);
  modal.querySelector("#set-rain-speed")?.addEventListener("input", previewRain);
  modal.querySelector("#set-search-font")?.addEventListener("input", (event) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    state.settings = { ...state.settings, searchFontSize: Math.max(8, Math.min(72, Math.round(next))) };
    applyUiMetrics();
  });

  const prevLayoutMode = layoutMode();
  const prevUiScale = displayUiScale();
  modal.querySelector("#set-layout-mode")?.addEventListener("change", (event) => {
    state.settings = { ...state.settings, layoutMode: event.target.value === "4k" ? "4k" : "2k" };
    applyUiMetrics();
  });
  modal.querySelector("#set-ui-scale")?.addEventListener("input", (event) => {
    const next = Number(event.target.value);
    if (!Number.isFinite(next)) return;
    state.settings = { ...state.settings, uiScale: Math.max(0.4, Math.min(1.5, next)) };
    applyUiMetrics();
  });

  modal.querySelector("#set-dock")?.addEventListener("change", (event) => {
    setDockEnabled(event.target.checked);
    const frameSel = modal.querySelector("#set-dock-frame");
    if (frameSel) frameSel.disabled = !event.target.checked || !state.primary;
  });
  modal.querySelector("#set-dock-frame")?.addEventListener("change", (event) => {
    window.dockPanel?.setFrameStyle?.(state, event.target.value);
  });
  modal.querySelector("#set-dock-label-color-mode")?.addEventListener("change", (event) => {
    const colorInput = modal.querySelector("#set-dock-label-color");
    if (colorInput) colorInput.disabled = event.target.value !== "custom";
  });
  modal.querySelector("#set-cancel").onclick = () => {
    state.settings = { ...state.settings, layoutMode: prevLayoutMode, uiScale: prevUiScale };
    applyUiMetrics();
    closeSettings();
  };
  modal.querySelector("#set-quit").onclick = () => {
    if (window.confirm("Bockis-eDEX Desktop UI wirklich beenden?")) window.edex.quitApp();
  };
  modal.querySelector("#set-save").onclick = async () => {
    state.iconView = modal.querySelector("#set-icon-view").value === "list" ? "list" : "grid";
    const themeName = modal.querySelector("#set-theme").value;
    const windowsColorMode = ["off", "subtle", "strong"].includes(modal.querySelector("#set-windows-colors")?.value)
      ? modal.querySelector("#set-windows-colors").value
      : "subtle";
    const keepThemeWallpaper = Boolean(modal.querySelector("#set-keep-theme-wallpaper")?.checked);
    const rainmeterEnabled = Boolean(modal.querySelector("#set-rainmeter")?.checked);
    const wallpaper = modal.querySelector("#set-wall").value;
    const uiScaleRaw = Number(modal.querySelector("#set-ui-scale").value);
    const uiScale = Number.isFinite(uiScaleRaw) ? Math.max(0.4, Math.min(1.2, uiScaleRaw)) : 1;
    const layoutModeValue = modal.querySelector("#set-layout-mode")?.value === "4k" ? "4k" : "2k";
    state.settings = { ...state.settings, layoutMode: layoutModeValue, uiScale };
    const gridRaw = Number(modal.querySelector("#set-grid").value);
    const gridSizeValue = Number.isFinite(gridRaw) ? Math.max(12, Math.min(96, Math.round(gridRaw))) : 32;
    const clockPanelFrame = Boolean(modal.querySelector("#set-clock-panel")?.checked);
    const rainFontRaw = Number(modal.querySelector("#set-rain-font").value);
    const rainFontValue = Number.isFinite(rainFontRaw)
      ? Math.max(8, Math.min(72, Math.round(rainFontRaw)))
      : 14;
    const rainSpeedRaw = Number(modal.querySelector("#set-rain-speed").value);
    const rainSpeedValue = Number.isFinite(rainSpeedRaw)
      ? Math.max(0.1, Math.min(8, Math.round(rainSpeedRaw * 10) / 10))
      : 1;
    const searchFontRaw = Number(modal.querySelector("#set-search-font")?.value);
    const searchFontValue = Number.isFinite(searchFontRaw)
      ? Math.max(8, Math.min(72, Math.round(searchFontRaw)))
      : 12;
    const dockEnabledValue = Boolean(modal.querySelector("#set-dock")?.checked);
    const dockFrameValue = String(modal.querySelector("#set-dock-frame")?.value || state.settings?.dockFrameStyle || "rounded");
    const dockLabelColorMode = modal.querySelector("#set-dock-label-color-mode")?.value === "custom" ? "custom" : "theme";
    const dockLabelColorInput = modal.querySelector("#set-dock-label-color")?.value || "#00eaff";
    const dockLabelColorValue = dockLabelColorMode === "custom" && /^#[0-9a-f]{6}$/i.test(dockLabelColorInput)
      ? dockLabelColorInput.toLowerCase()
      : "theme";
    const startWithWindows = Boolean(modal.querySelector("#set-start-with-windows")?.checked);
    const zonePercent = (selector, fallback) => {
      const value = Number(modal.querySelector(selector)?.value);
      return Number.isFinite(value) ? Math.max(0, Math.min(45, Math.round(value))) : fallback;
    };
    const windowZoneEnabled = Boolean(modal.querySelector("#set-window-zone-enabled")?.checked);
    const windowZoneMargins = {
      left: zonePercent("#set-zone-left", 18),
      top: zonePercent("#set-zone-top", 8),
      right: zonePercent("#set-zone-right", 18),
      bottom: zonePercent("#set-zone-bottom", 8)
    };
    const localeValue = window.edexI18n?.normalize?.(modal.querySelector("#set-locale")?.value) || "zh-Hant";
    state.settings = {
      ...state.settings,
      dockEnabled: dockEnabledValue,
      dockFrameStyle: dockFrameValue,
      dockLabelColor: dockLabelColorValue,
      startWithWindows,
      windowZoneEnabled,
      windowZoneMargins
    };
    state.displayDockEnabled = dockEnabledValue;
    syncDockLayout(dockEnabledValue);
    window.dockPanel?.setFrameStyle?.(state, dockFrameValue);
    const settingsPatch = {
      snapWidgets: modal.querySelector("#set-snap").checked,
      dockEnabled: dockEnabledValue,
      dockFrameStyle: dockFrameValue,
      dockLabelColor: dockLabelColorValue,
      gridSize: gridSizeValue,
      clockPanelFrame,
      rainFontSize: rainFontValue,
      rainSpeed: rainSpeedValue,
      searchFontSize: searchFontValue,
      layoutMode: layoutModeValue,
      uiScale,
      theme: themeName,
      windowsColorMode,
      keepThemeWallpaper,
      rainmeterEnabled,
      startWithWindows,
      wallpaper,
      iconView: state.iconView,
      windowZoneEnabled,
      windowZoneMargins,
      locale: localeValue
    };
    if (!state.primary) delete settingsPatch.dockEnabled;
    snapAllLayoutToGrid();
    const result = await window.edex.saveSettings({
      ...settingsPatch,
      displayLayout: currentDisplayLayout()
    });
    state.settings = result.settings;
    window.edexI18n?.setLocale?.(state.settings.locale);
    state.themeName = result.themeName;
    if (result.displays) state.displays = result.displays;
    applyTheme(result.theme, wallpaper);
    applyClockMetrics();
    applyRainMetrics();
    closeSettings();
    toast("Einstellungen und Desktop-Layout gespeichert");
    rebuildWorkspace();
  };
}

function rebuildWorkspace() {
  buildLayout();
  updateDisplayChip();
  applyClockMetrics();
  applyRainMetrics();
  window.edexEffects?.start?.();
  applyRainMetrics();
  renderPathCards();
  if (state.scan) renderStats();
  loadDesktopListing().then(() => arrangeDesktop());
  fillDrivesStage();
  bindTerminal();
  bindPluginPanels();
  window.edexI18n?.translatePage?.();
}

function receiveWidget(widget) {
  if (!widget?.type) return;

  if (widget.type === "panel" && widget.id && widget.id !== "status" && PANEL_META[widget.id]) {
    if (widget.id === "dock") {
      setDockEnabled(true);
      return;
    }
    if (state.layout[widget.id]) {
      toast("此顯示器已有該插件");
      return;
    }
    state.layout[widget.id] = findEmptyBox({
      ...(widget.data?.box || {}),
      x: widget.x ?? PANEL_META[widget.id].box?.x ?? 2,
      y: widget.y ?? PANEL_META[widget.id].box?.y ?? 4,
      w: widget.w ?? PANEL_META[widget.id].box?.w ?? 16,
      h: widget.h ?? PANEL_META[widget.id].box?.h ?? 14,
      gx: widget.gx,
      gy: widget.gy,
      gw: widget.gw,
      gh: widget.gh
    }, { panelId: widget.id });
    persistLayout();
    rebuildWorkspace();
    toast(`已接收面板「${PANEL_META[widget.id].title}」`);
    return;
  }

  if (widget.type === "path") {
    const id = widget.id || `p${Date.now()}`;
    if (!state.pathCards.some((c) => c.id === id)) {
      state.pathCards.push(findEmptyBox({
        id,
        path: widget.data?.path || state.bootstrap.root,
        x: widget.x ?? 20,
        y: widget.y ?? 16,
        w: widget.w ?? 46,
        h: widget.h ?? 52,
        gx: widget.gx,
        gy: widget.gy,
        gw: widget.gw,
        gh: widget.gh,
        iconView: widget.data?.iconView === "list" ? "list" : "grid"
        ,fixedDisplayId: widget.data?.fixedDisplayId ?? null
      }, { pathId: id }));
    } else {
      const card = state.pathCards.find((c) => c.id === id);
      Object.assign(card, findEmptyBox({
        ...card,
        path: widget.data?.path || card.path,
        x: widget.x ?? card.x,
        y: widget.y ?? card.y,
        w: widget.w ?? card.w,
        h: widget.h ?? card.h,
        gx: widget.gx ?? card.gx,
        gy: widget.gy ?? card.gy,
        gw: widget.gw ?? card.gw,
        gh: widget.gh ?? card.gh
        ,fixedDisplayId: widget.data?.fixedDisplayId ?? card.fixedDisplayId ?? null
      }, { pathId: id }));
    }
    if (!state.activePathId) state.activePathId = id;
    persistLayout();
    renderPathCards();
    const card = state.pathCards.find((c) => c.id === id);
    scanCard(card);
    toast("Ordner-Panel übernommen");
    return;
  }

  if (widget.type === "desktop") {
    if (!state.primary) {
      toast("系統桌面僅能顯示在主顯示器");
      return;
    }
    state.desktopEnabled = true;
    state.desktopStage = findEmptyBox({
      ...(state.desktopStage || defaultDesktop()),
      x: widget.x ?? state.desktopStage?.x,
      y: widget.y ?? state.desktopStage?.y,
      w: widget.w ?? state.desktopStage?.w ?? DEFAULT_DESKTOP_PRIMARY.w,
      h: widget.h ?? state.desktopStage?.h ?? DEFAULT_DESKTOP_PRIMARY.h,
      gx: widget.gx,
      gy: widget.gy,
      gw: widget.gw,
      gh: widget.gh
    }, { desktop: true });
    persistLayout();
    rebuildWorkspace();
    toast("已接收桌面容器");
  }
}

async function runOrganize() {
  const root = state.bootstrap?.desktop;
  if (!root) {
    toast("找不到系統桌面路徑");
    return;
  }
  const migrate = Boolean(state.settings?.migrateFiles);
  state.busy = true;
  setText("st_mode", migrate ? "整理中" : "篩選中");
  try {
    const scan = await window.edex.scan(root);
    state.scan = scan;
    await refreshPlan();
    renderStats();
    if (!migrate) {
      state.desktopGrouped = true;
      state.desktopFilter = "all";
      persistLayout();
      await loadDesktopListing();
      arrangeDesktop();
      log("Anzeige nach Ordnern, Symbolen und Dateiformaten gefiltert (Dateien nicht verschoben)");
      toast("已按格式大類篩選顯示，檔案仍在系統桌面");
      return;
    }
    if (!state.plan?.count) {
      toast("沒有需要遷移的項目");
      return;
    }
    const confirmText = `將在系統桌面建立分類／副檔名資料夾並遷移 ${state.plan.count} 個項目。確定？`;
    if (!window.confirm(window.edexI18n?.translateDynamic?.(confirmText) || confirmText)) {
      return;
    }
    const result = await window.edex.organize(scan, { includeFolders: state.includeFolders });
    log(`已遷移 ${result.moved} 個項目到分類資料夾`);
    toast(`已遷移 ${result.moved} 個項目`);
    await doScan();
  } catch (err) {
    toast(err.message);
    log(`執行失敗：${err.message}`);
  } finally {
    state.busy = false;
    setText("st_mode", "待命");
  }
}

window.addEventListener("keydown", (event) => {
  if (!state.primary) return;
  if (event.key === "F10" || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s")) {
    event.preventDefault();
    openSettings();
  }
});

(async function start() {
  bindUiErrorLogging();
  logUiAction("ui.start", "Renderer gestartet");
  state.bootstrap = await window.edex.bootstrap();
  state.settings = state.bootstrap.settings || {};
  try {
    state.windowsColors = await window.edex.getWindowsColors?.();
  } catch {
    state.windowsColors = null;
  }
  window.edexI18n?.setLocale?.(state.settings.locale || "de");
  state.displays = state.bootstrap.displays || [];
  state.displayId = state.bootstrap.displayId ?? window.edex.displayId;
  state.displayIndex = state.bootstrap.displayIndex ?? window.edex.displayIndex ?? 0;
  state.primary = Boolean(state.bootstrap.primary ?? window.edex.isPrimary);
  window.edex.onShutdownRequested?.(() => shutdown());
  state.bounds = state.bootstrap.bounds || {
    x: 0,
    y: 0,
    width: window.edex.launchWidth || window.innerWidth,
    height: window.edex.launchHeight || window.innerHeight
  };
  state.scaleFactor = state.bootstrap.scaleFactor || window.edex.launchScale || 1;
  state.physicalSize = state.bootstrap.physicalSize || null;
  state.themes = state.bootstrap.themes || [];
  state.wallpapers = state.bootstrap.wallpapers || [];
  state.themeName = state.bootstrap.themeName || "tron";
  state.includeFolders = Boolean(state.settings.includeFolders);

  // Prefer per-display layout; migrate legacy global layout onto primary once.
  let saved = state.bootstrap.displayLayout;
  if (!saved && state.primary && (state.settings.layout || state.settings.pathCards)) {
    saved = {
      layout: state.settings.layout,
      desktopStage: state.settings.desktopStage,
      pathCards: state.settings.pathCards,
      iconPositions: state.settings.iconPositions,
      iconView: state.settings.iconView
    };
  }

  state.iconView = (saved?.iconView || state.settings.iconView) === "list" ? "list" : "grid";
  state.iconPositions = saved?.iconPositions || {};
  if (state.settings?.layoutMode !== "4k" && state.settings?.layoutMode !== "2k") {
    state.settings = { ...state.settings, layoutMode: defaultLayoutMode() };
  }
  applyTheme(state.bootstrap.theme, state.settings.wallpaper || "grid");

  try {
    const fitted = await window.edex.refitDisplay();
    if (fitted?.bounds) {
      state.bounds = fitted.bounds;
      state.scaleFactor = fitted.scaleFactor || state.scaleFactor;
      state.physicalSize = fitted.physicalSize || state.physicalSize;
    }
  } catch {
    // Keep launch bounds if refit is unavailable.
  }
  applyUiMetrics();

  await boot();

  const defaults = defaultWidgets();
  state.layout = defaults;
  const savedLayout = saved?.layout || null;
  state.displayDockEnabled = typeof saved?.dockEnabled === "boolean"
    ? saved.dockEnabled
    : state.settings?.dockEnabled !== false;
  state.displayDockSettings = {
    position: saved?.dockPosition === "top" ? "top" : String(saved?.dockPosition || state.settings?.dockPosition || "bottom"),
    width: Number(saved?.dockWidth) || Number(state.settings?.dockWidth) || 720,
    height: Number(saved?.dockHeight) || Number(state.settings?.dockHeight) || 72,
    frameStyle: ["rounded", "trapezoid", "rect"].includes(saved?.dockFrameStyle)
      ? saved.dockFrameStyle
      : (state.settings?.dockFrameStyle || "rounded")
  };
  const oldSecondaryMirror = !state.primary && savedLayout && Object.keys(savedLayout).length
    && Object.keys(savedLayout).every((k) => ["clock", "status"].includes(k));

  if (savedLayout && !oldSecondaryMirror) {
    // Trust saved layout exactly — missing keys mean the user closed those panels.
    state.layout = {};
    Object.keys(savedLayout).forEach((key) => {
      if (key === "status" || REMOVED_PANELS.has(key)) return;
      if (!PANEL_META[key]) return;
      state.layout[key] = { ...(PANEL_META[key].box || {}), ...savedLayout[key] };
    });
  } else if (!state.primary) {
    state.layout = {};
  } else {
    state.layout = defaults;
  }

  // Dock is a primary-only backdrop driven by settings.dockEnabled (default on).
  syncDockLayout(dockEnabled());

  // Drop retired panels from memory + disk so they cannot reappear.
  let strippedRemoved = false;
  for (const key of REMOVED_PANELS) {
    if (state.layout[key]) {
      delete state.layout[key];
      strippedRemoved = true;
    }
  }
  if (strippedRemoved || Object.keys(savedLayout || {}).some((k) => REMOVED_PANELS.has(k))) {
    queueMicrotask(async () => {
      await persistLayout();
      await purgePanelFromSavedLayouts([...REMOVED_PANELS]);
    });
  }

  state.desktopStage = saved?.desktopStage
    ? { ...defaultDesktop(), ...saved.desktopStage }
    : defaultDesktop();
  if (saved?.desktopBg && !state.desktopStage.bg) state.desktopStage.bg = saved.desktopBg;
  // 系統桌面 only on the primary monitor — force off on secondaries and persist.
  if (!state.primary) {
    if (saved?.desktopEnabled !== false) {
      queueMicrotask(() => persistLayout());
    }
    state.desktopEnabled = false;
  } else {
    state.desktopEnabled = saved?.desktopEnabled !== false;
  }
  state.desktopLocked = Boolean(saved?.desktopLocked);
  state.desktopGrouped = Boolean(saved?.desktopGrouped);
  state.desktopFilter = saved?.desktopFilter || "all";
  state.desktopTabId = saved?.desktopTabId || "classify";
  state.desktopFolderTabs = Array.isArray(saved?.desktopFolderTabs)
    ? saved.desktopFolderTabs
      .filter((tab) => tab?.id && tab?.path)
      .map((tab) => ({
        id: String(tab.id),
        path: String(tab.path),
        name: String(tab.name || folderTabTitle(tab.path)),
        listing: null
      }))
    : [];
  if (
    state.desktopTabId !== "classify"
    && !(state.desktopFolderTabs || []).some((tab) => tab.id === state.desktopTabId)
  ) {
    state.desktopTabId = "classify";
  }

  if (Array.isArray(saved?.pathCards) && saved.pathCards.length) {
    state.pathCards = saved.pathCards
      .filter((card) => card?.path && card.id !== "desktop")
      .map((card) => {
        const tabs = Array.isArray(card.tabs)
          ? card.tabs.filter((tab) => tab?.id && tab?.path).map((tab) => ({
            id: String(tab.id),
            path: String(tab.path),
            name: String(tab.name || ""),
            listing: null,
            scan: null,
            listingError: ""
          }))
          : [];
        return {
          ...card,
          name: String(card.name || ""),
          tabs,
          activeTabId: String(card.activeTabId || tabs[0]?.id || `${card.id}:root`)
        };
      });
  } else {
    state.pathCards = [];
  }
  state.pathCards.forEach((card) => {
    ensurePathTabs(card);
    const active = card.tabs.find((tab) => tab.id === card.activeTabId) || card.tabs[0];
    card.activeTabId = active.id;
    card.path = active.path;
    card.name = active.name || card.name;
  });
  state.activePathId = state.pathCards[0]?.id || null;

  snapAllLayoutToGrid();
  buildLayout();
  bindTerminal();
  window.edexI18n?.translatePage?.();
  setText("info_user", state.bootstrap.username);
  setText("info_host", state.bootstrap.hostname);
  updateDisplayChip();
  renderPathCards();

  window.edex.onDisplaysChanged((payload) => {
    if (Array.isArray(payload)) {
      state.displays = payload;
    } else {
      state.displays = payload.displays || state.displays;
      if (payload.bounds) state.bounds = payload.bounds;
      if (payload.scaleFactor) state.scaleFactor = payload.scaleFactor;
      if (payload.displayId != null) state.displayId = payload.displayId;
      if (payload.index != null) state.displayIndex = payload.index;
      if (payload.physicalSize) state.physicalSize = payload.physicalSize;
    }
    updateDisplayChip();
  });

  window.edex.onSettingsUpdated((payload) => {
    const prevGrid = gridSize();
    const prevGridSetting = settingsGridSize();
    const prevClock = clockScale();
    const prevMode = layoutMode();
    const prevUi = displayUiScale();
    const previousLocale = state.settings.locale || "de";
    state.settings = payload.settings || state.settings;
    window.edexI18n?.setLocale?.(state.settings.locale || "de");
    state.themeName = payload.themeName || state.themeName;
    if (payload.displays) state.displays = payload.displays;
    if (payload.theme) applyTheme(payload.theme, state.settings.wallpaper || "grid");
    else applyUiMetrics();
    applyClockMetrics();
    applyRainMetrics();
    updateDisplayChip();
    renderClock();
    if (previousLocale !== (state.settings.locale || "de")) {
      rebuildWorkspace();
    } else if (
      settingsGridSize() !== prevGridSetting
      || gridSize() !== prevGrid
      || layoutMode() !== prevMode
      || displayUiScale() !== prevUi
    ) {
      snapAllLayoutToGrid();
      rebuildWorkspace();
    } else if (clockScale() !== prevClock) {
      applyClockMetrics();
      renderClock();
    }
  });

  window.edex.onReceiveWidget((widget) => receiveWidget(widget));
  setupDesktopClickThrough();
  bindDesktopIconClicks();

  window.addEventListener("resize", () => {
    applyUiMetrics();
    updateDisplayChip();
  });

  await loadDesktopListing();
  await arrangeDesktop();
  await doScan();
})();
