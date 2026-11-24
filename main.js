const { app, BrowserWindow, ipcMain, dialog, shell, screen, Tray, Menu, nativeImage, clipboard, desktopCapturer, systemPreferences, nativeTheme } = require("electron");
const APP_VERSION = String(require("./package.json").displayVersion || app.getVersion());
const { execFile, spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
let nodePty = null;
try {
  nodePty = require("node-pty");
} catch (error) {
  console.warn("node-pty konnte nicht geladen werden:", error.message);
}

// A packaged GUI app can outlive the console that launched it.
for (const stream of [process.stdout, process.stderr]) {
  stream?.on("error", () => {});
}

const { scanRoot, listFolder, importFiles, buildPlan, executePlan, undoLast } = require("./lib/organizer");
const { dirIcon } = require("./lib/icons");
const { loadSettings, refreshPresetForSave, saveSettings } = require("./lib/settings-store");
const { FEATURES, normalizeFeatures, normalizeWindowsOptions } = require("./lib/windows-theme-manager");
const { createWindowsThemeRegistryStore, entryId, writeJsonAtomically } = require("./lib/windows-theme-registry");
const { parseWindowsThemeFile } = require("./lib/windows-theme-importer");
const { assessWindhawk, windhawkLink } = require("./lib/windows-style-integration");
const { WALLPAPERS, listThemes, loadTheme, resolveThemeName, themesDir, configureThemeStore } = require("./lib/themes");
const { createStore: createThemeStudioStore } = require("./lib/theme-studio-store");
const {
  applyAppWallpaper,
  restoreWallpaper,
  setWindowsWallpaper,
  hideDesktopIcons,
  restoreDesktopIcons
} = require("./lib/system-desktop");
const appLog = require("./lib/app-log");
const {
  pinWindowBottom,
  stopZOrderDaemon,
  ensureDaemon,
  prepareWindowForFileDrag,
  prepareWindowForFileDragSync,
  restoreWindowAfterFileDrag,
  cancelPreparedFileDrag,
  isFileDragActive,
  allowForeground,
  raiseOverlayWindow,
  raiseExplorerPath
} = require("./lib/win32-zorder");
const { listDesktopShortcuts } = require("./lib/desktop-shortcuts");
const { listDrives } = require("./lib/drives");
const fileSearch = require("./lib/file-search");
const { loadNotes, addNote, updateNote, removeNote } = require("./lib/calendar-store");
const { getNetStatus, getLiveConnections, getTrafficSample, getCpuMetrics, getMemMetrics, getSysMetrics, loadGlobeGrid, getHardwareInfo, getTopProcesses, getWeather } = require("./lib/net-info");
const { createHardwareMonitor } = require("./lib/hardware-monitor");
const hardwareMonitor = createHardwareMonitor({
  platform: process.platform,
  isPackaged: app.isPackaged,
  appPath: app.getAppPath(),
  resourcesPath: process.resourcesPath
});
const fileOps = require("./lib/file-ops");
const { PathPolicy } = require("./lib/path-policy");
const { compareVersions, fetchLatestRelease } = require("./lib/update-checker");
const { remotePathExpression } = require("./lib/ssh-path");
const clipboardFiles = require("./lib/clipboard-files");
const win32Embed = require("./lib/win32-embed");
const taskbarDock = require("./lib/taskbar-dock");
const { listAutostartItems } = require("./lib/autostart");
const {
  startOleFileDrag,
  warmOleDragDaemon,
  stopOleDragDaemon
} = require("./lib/win32-file-drag");

function journalPath() {
  return path.join(app.getPath("userData"), "organizer-journal.json");
}

function makeDragIcon() {
  // Opaque RGBA bitmap — reliable for Electron startDrag on Windows.
  const size = 32;
  const buf = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const edge = x <= 1 || y <= 1 || x >= size - 2 || y >= size - 2;
      const body = x >= 7 && x <= 24 && y >= 5 && y <= 26;
      if (!edge && !body) continue;
      buf[i] = 170;
      buf[i + 1] = 210;
      buf[i + 2] = 230;
      buf[i + 3] = 255;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

const dragIcon = makeDragIcon();
let dragIconPath = "";
/** Pointer-down arming: capture hits so Chromium can fire dragstart. */
let fileDragArmed = false;
/** Inside startDrag/OLE: click-through so Explorer/WeChat under cursor get DragEnter. */
let fileDragInFlight = false;

function applyFileDragMouseMode(win) {
  if (!win || win.isDestroyed()) return;
  if (fileDragInFlight || isFileDragActive()) {
    // Fullscreen overlay must not steal OLE hit-tests from Explorer.
    win.setIgnoreMouseEvents(true, { forward: true });
    return;
  }
  if (fileDragArmed) {
    win.setIgnoreMouseEvents(false);
    return;
  }
  win.setIgnoreMouseEvents(true, { forward: true });
}

function ensureDragIconPath() {
  if (dragIconPath && fs.existsSync(dragIconPath)) return dragIconPath;
  try {
    dragIconPath = path.join(os.tmpdir(), "edex-file-drag-icon.png");
    fs.writeFileSync(dragIconPath, dragIcon.toPNG());
  } catch {
    dragIconPath = "";
  }
  return dragIconPath;
}

app.commandLine.appendSwitch("enable-transparent-visuals");

/** @type {Map<number, BrowserWindow>} */
const windows = new Map();
let themeStudioWindow = null;
let themeStudioStore = null;
let currentRoot;
let settings;
let syncing = false;
let syncTimer = null;
let updateTimer = null;
let updateCheckInFlight = null;
let quitting = false;
let exitDesktopRestore = null;
let desktopOverlayReady = false;

function activateDesktopOverlay() {
  if (desktopOverlayReady || quitting) return;
  desktopOverlayReady = true;
  hideDesktopIcons(app.getPath("userData")).catch((err) => console.error("desktop icons", err));
  scheduleWallpaper();
}

function restoreDesktopStateOnExit() {
  if (!exitDesktopRestore) {
    const userData = app.getPath("userData");
    exitDesktopRestore = Promise.all([
      restoreDesktopIcons(userData),
      restoreWallpaper(userData)
    ]);
  }
  return exitDesktopRestore;
}
let tray = null;
const terminalSessions = new Map();
const terminalSessionShells = new Map();
const terminalSessionStopping = new Set();
const remoteListingRequests = new Map();

function stopTerminalSession(key, session) {
  if (!session || terminalSessionStopping.has(session)) return;
  terminalSessionStopping.add(session);
  if (terminalSessions.get(key) === session) terminalSessions.delete(key);
  terminalSessionShells.delete(key);
  const pending = remoteListingRequests.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    pending.resolve({ root: pending.root, items: [], error: "SSH-Sitzung wurde beendet" });
    remoteListingRequests.delete(key);
  }
  try {
    session.kill();
  } catch (error) {
    appLog.warn("terminal.stop", "Terminal-Sitzung konnte nicht beendet werden", {
      paneId: key,
      error: error.message
    });
  }
}

async function stopAllTerminalSessions() {
  const active = [...terminalSessions.entries()];
  active.forEach(([key, session]) => stopTerminalSession(key, session));
  if (active.length) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (terminalSessions.size) {
    appLog.warn("terminal.stop", "Terminal-Sitzungen wurden vor dem Beenden nicht vollständig bestätigt", {
      count: terminalSessions.size
    });
  }
}

ipcMain.handle("pick-windows-wallpaper", async (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const desktopPath = path.join(os.homedir(), "Desktop");
  const result = await dialog.showOpenDialog(win, {
    title: "Bild vom Desktop auswählen",
    defaultPath: fs.existsSync(desktopPath) ? desktopPath : os.homedir(),
    properties: ["openFile"],
    filters: [{ name: "Bilder", extensions: ["jpg", "jpeg", "png", "bmp"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});
const approvedPathRoots = new PathPolicy();

function systemText(de, en, zh) {
  const locale = settings?.locale || "de";
  return locale === "zh-Hant" ? zh : locale === "en" ? en : de;
}

function approvePathRoot(root) {
  return approvedPathRoots.add(root);
}

function requireApprovedPath(target) {
  if (!approvedPathRoots.allows(target)) {
    throw new Error("Pfad wurde nicht über einen freigegebenen Ordner ausgewählt");
  }
  return String(target);
}

function approveLayoutRoots(layout) {
  const roots = [
    ...(Array.isArray(layout?.pathCards) ? layout.pathCards.flatMap((card) => [
      card?.path,
      ...(Array.isArray(card?.tabs) ? card.tabs.map((tab) => tab?.path) : [])
    ]) : []),
    ...(Array.isArray(layout?.desktopFolderTabs) ? layout.desktopFolderTabs.map((tab) => tab?.path) : [])
  ];
  for (const root of roots) {
    if (typeof root === "string" && fs.existsSync(root) && fs.statSync(root).isDirectory()) {
      approvePathRoot(root);
    }
  }
}

function makeTrayIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const edge = x <= 1 || y <= 1 || x >= size - 2 || y >= size - 2;
      buf[i] = edge ? 170 : 5;
      buf[i + 1] = edge ? 207 : 8;
      buf[i + 2] = edge ? 209 : 13;
      buf[i + 3] = 255;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

function createTray() {
  if (tray) return;
  tray = new Tray(makeTrayIcon());
  tray.setToolTip("Bockis-eDEX Desktop UI");
  const menu = Menu.buildFromTemplate([
    {
      label: systemText("Container anzeigen", "Show containers", "顯示容器"),
      click: () => {
        for (const win of windows.values()) {
          if (!win.isDestroyed()) showBehindApps(win);
        }
        refitExistingWindows();
      }
    },
    {
      label: systemText("Monitore neu ausrichten", "Realign monitors", "重新對齊顯示器"),
      click: () => syncAllWindows()
    },
    { type: "separator" },
    {
      label: "Beenden",
      click: () => {
        if (windows.size > 0) broadcast("shutdown-request");
        else app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    for (const win of windows.values()) {
      if (!win.isDestroyed()) showBehindApps(win);
    }
    refitExistingWindows();
  });
}

function resolveDesktop() {
  try {
    const dir = app.getPath("desktop");
    if (dir && fs.existsSync(dir)) return dir;
  } catch {
    // fall through
  }
  const fallback = path.join(os.homedir(), "Desktop");
  return fs.existsSync(fallback) ? fallback : (app.getPath("desktop") || fallback);
}

function listDisplays() {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display, index) => {
    const { x, y, width, height } = display.bounds;
    const scale = display.scaleFactor || 1;
    const physW = Math.round(width * scale);
    const physH = Math.round(height * scale);
    return {
      appVersion: APP_VERSION,
      index,
      id: display.id,
      primary: display.id === primaryId,
      bounds: { x, y, width, height },
      size: { width, height },
      physicalSize: { width: physW, height: physH },
      scaleFactor: scale,
      label: `Monitor ${index + 1} (${physW}×${physH}${display.id === primaryId ? ", Hauptmonitor" : ""})`
    };
  });
}

function displayScale(display) {
  return display?.scaleFactor || 1;
}

function applyPhysicalZoom(win, display) {
  if (!win || win.isDestroyed()) return;
  const sf = displayScale(display || findDisplay(getWindowDisplayId(win)));
  // Undo Windows DPI so a 4K panel is 3840×2160 CSS px, not 2K DIP.
  win.webContents.setZoomFactor(1 / sf);
  win.webContents.setVisualZoomLevelLimits(1, 1);
}

function findDisplay(displayId) {
  const id = Number(displayId);
  return screen.getAllDisplays().find((d) => d.id === id) || screen.getPrimaryDisplay();
}

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function requireTrustedWindow(event) {
  const win = getSenderWindow(event);
  if (!win || win.isDestroyed() || ![...windows.values(), themeStudioWindow].includes(win)) {
    throw new Error("Nicht autorisierter IPC-Absender");
  }
  return win;
}

function getWindowDisplayId(win) {
  for (const [id, w] of windows.entries()) {
    if (w === win) return id;
  }
  return screen.getPrimaryDisplay().id;
}

function fitWindowToDisplay(win, display) {
  if (!win || win.isDestroyed() || !display) return;
  const { x, y, width, height } = display.bounds;
  win.setFullScreen(false);
  win.setBounds({ x, y, width, height });
  applyPhysicalZoom(win, display);
  pinAndKeepBounds(win, display);
  console.log(`[edex] fit display=${display.id} ${x},${y} ${width}x${height}`);
}

async function pinAndKeepBounds(win, display) {
  if (!win || win.isDestroyed()) return;
  if (isFileDragActive()) return;
  const target = display || findDisplay(getWindowDisplayId(win));
  await pinWindowBottom(win);
  if (win.isDestroyed() || !target) return;
  win.setBounds({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height
  });
  applyPhysicalZoom(win, target);
}

function showBehindApps(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.showInactive();
  } catch {
    win.show();
  }
  pinAndKeepBounds(win);
}

function softPinWindow(win) {
  if (!win || win.isDestroyed() || isFileDragActive()) return;
  pinWindowBottom(win, { force: true }).catch(() => {});
}

/** Burst re-pin after taskbar / app switches raise our overlay above Explorer. */
function burstPinBottom(win) {
  softPinWindow(win);
  for (const ms of [50, 120, 280, 600, 1200]) {
    setTimeout(() => softPinWindow(win), ms);
  }
}

function bindDesktopZOrder(win) {
  win.on("show", () => pinAndKeepBounds(win));
  // Focus fires on every click — only re-pin z-order, never setBounds (that stuttered the UI).
  win.on("focus", () => {
    if (isFileDragActive()) return;
    burstPinBottom(win);
  });
  win.on("blur", () => {
    if (isFileDragActive()) return;
    softPinWindow(win);
  });
}

let zOrderKeepalive = null;
function startZOrderKeepalive() {
  if (zOrderKeepalive) return;
  zOrderKeepalive = setInterval(() => {
    if (isFileDragActive()) return;
    for (const win of BrowserWindow.getAllWindows()) {
      softPinWindow(win);
    }
  }, 900);
}

function createWindowForDisplay(display, index) {
  const existing = windows.get(display.id);
  if (existing && !existing.isDestroyed()) {
    fitWindowToDisplay(existing, display);
    return existing;
  }

  const { x, y, width, height } = display.bounds;
  const scale = display.scaleFactor || 1;
  const win = new BrowserWindow({
    title: `Bockis-eDEX Desktop UI - Monitor ${index + 1}`,
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    thickFrame: false,
    transparent: true,
    // Near-clear (not fully 00): Windows layered windows ignore hits on 0-alpha pixels,
    // which breaks file drag gestures on "transparent" icon boxes.
    backgroundColor: "#01000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    skipTaskbar: display.id !== screen.getPrimaryDisplay().id,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      zoomFactor: 1 / scale,
      additionalArguments: [
        `--edex-display-id=${display.id}`,
        `--edex-display-index=${index}`,
        `--edex-primary=${display.id === screen.getPrimaryDisplay().id ? "1" : "0"}`,
        `--edex-width=${width}`,
        `--edex-height=${height}`,
        `--edex-scale=${scale}`
      ]
    }
  });

  windows.set(display.id, win);
  bindDesktopZOrder(win);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!String(url || "").startsWith("file://")) event.preventDefault();
  });

  win.loadFile(path.join(__dirname, "src", "index.html"), {
    query: {
      displayId: String(display.id),
      index: String(index),
      primary: display.id === screen.getPrimaryDisplay().id ? "1" : "0",
      width: String(width),
      height: String(height),
      scale: String(scale)
    }
  });

  win.webContents.on("did-finish-load", () => {
    applyPhysicalZoom(win, findDisplay(display.id));
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error("did-fail-load", display.id, code, desc);
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("render-process-gone", display.id, details);
    if (!quitting && !win.isDestroyed()) {
      setTimeout(() => {
        if (!quitting && !win.isDestroyed()) win.webContents.reload();
      }, 750);
    }
  });

  win.once("ready-to-show", () => {
    fitWindowToDisplay(win, findDisplay(display.id));
    if (!win.isDestroyed()) {
      win.setBackgroundColor("#01000000");
      win.setIgnoreMouseEvents(true, { forward: true });
      showBehindApps(win);
      activateDesktopOverlay();
    }
  });

  if (process.platform === "win32") {
    win.on("session-end", () => {
      restoreDesktopStateOnExit().catch((err) => {
        console.error("restore desktop on session-end", err);
      });
    });
  }

  win.on("closed", () => {
    if (windows.get(display.id) === win) windows.delete(display.id);
  });

  return win;
}

function notifyDisplay(win, display, index) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("display-info", {
    displays: listDisplays(),
    displayId: display.id,
    index,
    bounds: display.bounds,
    scaleFactor: display.scaleFactor || 1,
    physicalSize: {
      width: Math.round(display.bounds.width * (display.scaleFactor || 1)),
      height: Math.round(display.bounds.height * (display.scaleFactor || 1))
    }
  });
}

function refitExistingWindows() {
  for (const [id, win] of windows.entries()) {
    if (win.isDestroyed()) {
      windows.delete(id);
      continue;
    }
    const display = screen.getAllDisplays().find((d) => d.id === id);
    if (display) fitWindowToDisplay(win, display);
  }
}

function syncAllWindows() {
  if (quitting) return;
  syncing = true;
  try {
    const displays = screen.getAllDisplays();
    if (!displays.length) return;

    const liveIds = new Set(displays.map((d) => d.id));
    for (const [id, win] of [...windows.entries()]) {
      if (!liveIds.has(id)) {
        if (!win.isDestroyed()) win.close();
        windows.delete(id);
      }
    }

    displays.forEach((display, index) => {
      const win = createWindowForDisplay(display, index);
      fitWindowToDisplay(win, display);
      // Ensure hidden windows become visible after load/refit.
      if (!win.isDestroyed() && !win.isVisible()) {
        win.once("ready-to-show", () => {
          if (!win.isDestroyed()) showBehindApps(win);
        });
        // ready-to-show may have already fired
        setTimeout(() => {
          if (!win.isDestroyed() && !win.isVisible()) showBehindApps(win);
        }, 300);
      }
      notifyDisplay(win, display, index);
    });

    console.log(`[edex] displays=${displays.length} windows=${windows.size}`);
  } finally {
    setTimeout(() => {
      syncing = false;
    }, 500);
  }
}

function scheduleSync(reason) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    console.log(`[edex] sync (${reason})`);
    syncAllWindows();
    scheduleWallpaper();
  }, reason === "metrics" ? 250 : 50);
}

function scheduleWallpaper() {
  clearTimeout(scheduleWallpaper.timer);
  scheduleWallpaper.timer = setTimeout(() => {
    applyAppWallpaper(
      app.getPath("userData"),
      loadTheme(settings.theme || "tron"),
      settings.wallpaper || "grid",
      settings.gridSize
    ).then(async () => {
      const custom = String(settings.windowsWallpaper || "").trim();
      if (custom && fs.existsSync(custom)) await setWindowsWallpaper(custom, "fill");
    }).catch((err) => console.error("desktop wallpaper", err));
  }, 400);
}

function windowsAccentHex() {
  let accent = "#00eaff";
  try {
    const raw = String(systemPreferences.getAccentColor?.() || "").replace(/^#/, "");
    const hex = raw.length === 8 ? raw.slice(2) : raw;
    if (/^[0-9a-f]{6}$/i.test(hex)) accent = `#${hex}`;
  } catch {
    // Keep the cyan fallback when Windows cannot provide its accent color.
  }
  return accent;
}

function broadcast(channel, payload) {
  for (const win of windows.values()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

async function checkForUpdates(source = "manual") {
  if (updateCheckInFlight) return updateCheckInFlight;
  updateCheckInFlight = (async () => {
    try {
      const currentVersion = APP_VERSION;
      const release = await fetchLatestRelease("ReXx09", "Bockis-eDEX_Desktop_UI");
      const comparison = compareVersions(release.version, currentVersion);
      if (comparison == null) throw new Error("Versionsformat konnte nicht verglichen werden");
      const result = {
        ok: true,
        source,
        currentVersion,
        latestVersion: release.version,
        updateAvailable: comparison > 0,
        release
      };
      broadcast("update-check-result", result);
      if (result.updateAvailable) broadcast("update-available", result);
      return result;
    } catch (error) {
      const result = { ok: false, source, currentVersion: APP_VERSION, error: error.message };
      broadcast("update-check-result", result);
      return result;
    } finally {
      updateCheckInFlight = null;
    }
  })();
  return updateCheckInFlight;
}

function rezoomAllWindows() {
  for (const [id, win] of windows.entries()) {
    if (win.isDestroyed()) continue;
    const display = screen.getAllDisplays().find((d) => d.id === id);
    applyPhysicalZoom(win, display);
    pinWindowBottom(win);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    scheduleSync("second-instance");
    for (const win of windows.values()) {
      if (!win.isDestroyed()) showBehindApps(win);
    }
  });

  app.whenReady().then(async () => {
    appLog.init(app.getPath("userData"));
    themeStudioStore = createThemeStudioStore(app.getPath("userData"), themesDir);
    configureThemeStore(themeStudioStore);
    settings = loadSettings(app.getPath("userData"));
    if (process.platform === "win32") {
      const backupFile = path.join(app.getPath("userData"), "windows-theme-backup.json");
      const recoveryStatus = windowsThemeRegistryStore.inspect(backupFile);
      if (!recoveryStatus.backupValid) {
        appLog.error("windows-theme.backup-check", "Windows-Theme-Backup ist beim Start ungültig", {
          error: recoveryStatus.error
        });
      }
      let recoveredTransaction = false;
      if (recoveryStatus.pendingRecovery) {
        try {
          await windowsThemeRegistryStore.recover(backupFile);
          recoveredTransaction = true;
          appLog.warn("windows-theme.recovery", "Unvollständige Windows-Theme-Transaktion beim Start zurückgerollt", {
            backupEntries: recoveryStatus.backupEntries
          });
        } catch (error) {
          appLog.error("windows-theme.recovery", "Windows-Theme-Transaktion konnte beim Start nicht wiederhergestellt werden", {
            error: error.message || String(error)
          });
        }
      }
      if (recoveredTransaction && !Object.values(normalizeFeatures(settings.windowsThemeFeatures)).some(Boolean)) {
        try {
          const restored = await windowsThemeRegistryStore.restore(
            backupFile,
            windowsThemeEntries(Object.keys(FEATURES))
          );
          if (restored) {
            appLog.warn("windows-theme.recovery", "Verwaltete Windows-Werte nach abgebrochener Deaktivierung wiederhergestellt");
          }
        } catch (error) {
          appLog.error("windows-theme.recovery", "Windows-Werte konnten nach der Recovery nicht wiederhergestellt werden", {
            error: error.message || String(error)
          });
        }
      }
      try {
        const startupTheme = loadTheme(resolveThemeName(settings.theme || "tron"));
        await syncWindowsThemeSettings(app.getPath("userData"), settings, startupTheme.colors);
      } catch (error) {
        appLog.error("windows-theme.startup", "Windows-Theme konnte beim Start nicht synchronisiert werden", {
          error: error.message || String(error)
        });
      }
    }
    if (process.platform === "win32") app.setLoginItemSettings(loginItemOptions(settings.startWithWindows));
    try {
      await restoreDesktopIcons(app.getPath("userData"));
      await restoreWallpaper(app.getPath("userData"));
    } catch (err) {
      console.error("recover desktop", err);
    }
    currentRoot = resolveDesktop();
    approvePathRoot(currentRoot);
    createTray();
    await ensureDaemon();
    warmOleDragDaemon();
    startZOrderKeepalive();
    fileSearch.configure({
      roots: settings.searchRoots || [],
      includeLocal: settings.searchLocalDrives !== false
    });
    fileSearch.rebuild().catch((err) => console.error("file-search", err));
    syncAllWindows();
    setTimeout(() => syncAllWindows(), 600);
    [1500, 3500, 7000].forEach((delay) => {
      setTimeout(() => {
        if (!desktopOverlayReady && !quitting) syncAllWindows();
      }, delay);
    });
    setTimeout(() => {
      if (!desktopOverlayReady && !quitting) {
        restoreDesktopStateOnExit().catch((err) => {
          console.error("restore desktop after startup timeout", err);
        });
      }
    }, 12000);
    setTimeout(() => { checkForUpdates("startup"); }, 5000);
    updateTimer = setInterval(() => { checkForUpdates("interval"); }, 6 * 60 * 60 * 1000);

    screen.on("display-added", () => scheduleSync("added"));
    screen.on("display-removed", () => scheduleSync("removed"));
    screen.on("display-metrics-changed", () => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => {
        refitExistingWindows();
        scheduleWallpaper();
      }, 200);
    });
  });

  app.on("before-quit", async (event) => {
    if (!quitting) {
      event.preventDefault();
      quitting = true;
      clearTimeout(syncTimer);
      clearTimeout(scheduleWallpaper.timer);
      clearInterval(updateTimer);
      try { tray?.destroy(); } catch { /* ignore */ }
      tray = null;
      stopZOrderDaemon();
      stopOleDragDaemon();
      try { await hardwareMonitor.stop(); } catch (error) {
        console.error("stop hardware monitor", error);
      }
      try { await stopAllTerminalSessions(); } catch (error) {
        console.error("stop terminal sessions", error);
      }
      try { await win32Embed.releaseAllEmbeds(); } catch { /* ignore */ }
      try { win32Embed.stopEmbedDaemon(); } catch { /* ignore */ }
      appLog.close();
      try {
        await restoreDesktopStateOnExit();
      } catch (err) {
        console.error("restore desktop", err);
      }
      app.quit();
      return;
    }
  });

  app.on("window-all-closed", () => {
    if (syncing || quitting) return;
    console.warn(`[edex] window-all-closed windows=${windows.size}; keeping tray process alive`);
    // Display embedding can briefly close every overlay during startup or reconfiguration.
    setTimeout(() => {
      if (!quitting && windows.size === 0 && !syncing) syncAllWindows();
    }, 400);
  });
}

ipcMain.handle("get-bootstrap", (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const displayId = getWindowDisplayId(win);
  const display = findDisplay(displayId);
  const displays = listDisplays();
  const meta = displays.find((d) => d.id === displayId) || displays[0];
  const themeName = resolveThemeName(settings.theme || "tron");
  if (settings.theme !== themeName) {
    settings = saveSettings(app.getPath("userData"), { theme: themeName });
  }
  const exactLayout = settings.displayLayouts?.[String(displayId)] || null;
  const indexedLayout = Object.values(settings.displayLayouts || {})
    .find((candidate) => Number(candidate?.displayIndex) === Number(meta?.index));
  const layout = exactLayout || indexedLayout || null;
  approveLayoutRoots(layout);

  return {
    appVersion: APP_VERSION,
    username: os.userInfo().username,
    desktop: resolveDesktop(),
    root: currentRoot,
    hostname: os.hostname(),
    platform: process.platform,
    settings,
    displays,
    displayId,
    displayIndex: meta?.index ?? 0,
    primary: Boolean(meta?.primary),
    bounds: display.bounds,
    scaleFactor: display.scaleFactor || 1,
    physicalSize: {
      width: Math.round(display.bounds.width * (display.scaleFactor || 1)),
      height: Math.round(display.bounds.height * (display.scaleFactor || 1))
    },
    displayLayout: layout,
    dirIcon: dirIcon(),
    themes: listThemes(),
    wallpapers: WALLPAPERS,
    theme: loadTheme(themeName),
    themeName
  };
});

ipcMain.on("ui-log", (event, payload) => {
  requireTrustedWindow(event);
  const item = payload && typeof payload === "object" ? payload : {};
  const level = ["info", "warn", "error"].includes(String(item.level)) ? String(item.level) : "info";
  appLog[level](String(item.event || "ui.action"), String(item.message || ""), item.details);
});

ipcMain.handle("get-app-log", (event, limit) => {
  requireTrustedWindow(event);
  return { file: appLog.file(), entries: appLog.read(limit) };
});

ipcMain.handle("get-windows-colors", (event) => {
  requireTrustedWindow(event);
  return { accent: windowsAccentHex(), dark: Boolean(nativeTheme.shouldUseDarkColors) };
});

function findWindhawkInstallation() {
  if (process.platform !== "win32") return Promise.resolve(null);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$items = @()",
    "foreach ($hive in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {",
    "  foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {",
    "    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)",
    "    try {",
    "      $root = $base.OpenSubKey('Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall')",
    "      if ($null -eq $root) { continue }",
    "      try {",
    "        foreach ($subName in $root.GetSubKeyNames()) {",
    "          $item = $root.OpenSubKey($subName)",
    "          if ($null -eq $item) { continue }",
    "          try {",
    "            $displayName = [string]$item.GetValue('DisplayName', '')",
    "            if ($displayName -match '^Windhawk(?:\\s|$)') {",
    "              $items += [pscustomobject]@{ version = [string]$item.GetValue('DisplayVersion', ''); installLocation = [string]$item.GetValue('InstallLocation', '') }",
    "            }",
    "          } finally { $item.Dispose() }",
    "        }",
    "      } finally { $root.Dispose() }",
    "    } finally { $base.Dispose() }",
    "  }",
    "}",
    "[Console]::Out.WriteLine((ConvertTo-Json -InputObject @($items) -Compress))"
  ].join("\n");
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 8000,
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Windhawk-Installation konnte nicht geprüft werden: ${(stderr || error.message).trim()}`));
        return;
      }
      try {
        const parsed = JSON.parse(String(stdout || "").trim());
        const installations = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
        const installation = installations.find((entry) => entry && typeof entry.version === "string" && entry.version);
        resolve(installation || null);
      } catch (parseError) {
        reject(new Error(`Windhawk-Installationsstatus konnte nicht ausgewertet werden: ${parseError.message}`));
      }
    });
  });
}

ipcMain.handle("theme-studio-windows-style-status", async (event) => {
  requireTrustedWindow(event);
  const installation = await findWindhawkInstallation();
  return assessWindhawk(process.platform, installation);
});

ipcMain.handle("theme-studio-open-windows-style-link", async (event, linkId) => {
  requireTrustedWindow(event);
  const url = windhawkLink(String(linkId || ""));
  await shell.openExternal(url);
  return true;
});

function runRegistry(args) {
  return new Promise((resolve) => {
    const child = spawn("reg.exe", args, { windowsHide: true, stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

function readRegistryDwords(entries) {
  const items = entries.map((entry) => {
    const subKey = String(entry.key).replace(/^HKCU\\/i, "");
    if (subKey === entry.key) throw new Error(`Nicht unterstützter Registry-Pfad: ${entry.key}`);
    return { key: subKey, name: entry.name };
  });
  const encodedItems = Buffer.from(JSON.stringify(items), "utf16le").toString("base64");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$items = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${encodedItems}')) | ConvertFrom-Json`,
    "foreach ($item in $items) {",
    "  $registryKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey([string]$item.key, $false)",
    "  if ($null -eq $registryKey) { [Console]::Out.WriteLine('{\"exists\":false}'); continue }",
    "  try {",
    "    if ($registryKey.GetValueNames() -notcontains [string]$item.name) { [Console]::Out.WriteLine('{\"exists\":false}'); continue }",
    "    if ($registryKey.GetValueKind([string]$item.name) -ne [Microsoft.Win32.RegistryValueKind]::DWord) { throw \"Unsupported registry type for $($item.name)\" }",
    "    $data = ([long]$registryKey.GetValue([string]$item.name)) -band 0xffffffffL",
    "    $result = @{ exists = $true; type = 'REG_DWORD'; data = $data }",
    "    [Console]::Out.WriteLine((ConvertTo-Json -InputObject $result -Compress))",
    "  } finally { $registryKey.Dispose() }",
    "}"
  ].join("\n");
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");
  return new Promise((resolve, reject) => {
    execFile("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript], {
      windowsHide: true,
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Windows-Registrywerte konnten nicht gelesen werden: ${(stderr || error.message).trim()}`));
      }
      try {
        const lines = String(stdout || "").trim().split(/\r?\n/).filter(Boolean);
        if (lines.length !== entries.length) throw new Error("Unvollständige Antwort aus der Windows-Registry.");
        resolve(lines.map((line) => JSON.parse(line)));
      } catch (parseError) {
        reject(new Error(`Windows-Registrywerte konnten nicht ausgewertet werden: ${parseError.message}`));
      }
    });
  });
}

function readRegistryDword(key, name) {
  return readRegistryDwords([{ key, name }]).then((values) => values[0]);
}

function windowsAccentValue(rgb = {}) {
  const red = Math.max(0, Math.min(255, Number(rgb.r) || 0));
  const green = Math.max(0, Math.min(255, Number(rgb.g) || 0));
  const blue = Math.max(0, Math.min(255, Number(rgb.b) || 0));
  return `0xFF${blue.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${red.toString(16).padStart(2, "0")}`;
}

async function writeRegistryDword(key, name, data) {
  return runRegistry(["ADD", key, "/v", name, "/t", "REG_DWORD", "/d", `0x${data.toString(16).padStart(8, "0")}`, "/f"]);
}

async function deleteRegistryValue(key, name) {
  if (!(await readRegistryDword(key, name)).exists) return true;
  return runRegistry(["DELETE", key, "/v", name, "/f"]);
}

const windowsThemeRegistryStore = createWindowsThemeRegistryStore({
  read: readRegistryDword,
  readMany: readRegistryDwords,
  write: writeRegistryDword,
  remove: deleteRegistryValue
});

function windowsAccentDword(rgb) {
  return Number.parseInt(windowsAccentValue(rgb).slice(2), 16) >>> 0;
}

function windowsThemeEntries(featureIds) {
  const entries = new Map();
  for (const featureId of featureIds) {
    const feature = FEATURES[featureId];
    if (!feature) throw new Error("Unbekannte Windows-Anpassung.");
    for (const entry of feature.values) entries.set(entryId(entry.key, entry.name), entry);
  }
  return [...entries.values()];
}

function windowsThemeTargets(entries, rgb, options = {}) {
  const windowsOptions = normalizeWindowsOptions(options);
  return Object.fromEntries(entries.map((entry) => {
    const data = entry.value === "accent"
      ? windowsAccentDword(rgb)
      : entry.value === "taskbarAlignment"
        ? windowsOptions.taskbarAlignment === "left" ? 0 : 1
        : entry.value === "taskbarSize"
          ? ({ small: 0, medium: 1, large: 2 })[windowsOptions.taskbarSize]
          : entry.value;
    return [entryId(entry.key, entry.name), { exists: true, type: "REG_DWORD", data }];
  }));
}

async function applyWindowsThemeFeature(userData, featureId, rgb, options = {}, commit) {
  if (!FEATURES[featureId]) throw new Error("Unbekannte Windows-Anpassung.");
  const entries = windowsThemeEntries([featureId]);
  const backupFile = path.join(userData, "windows-theme-backup.json");
  await windowsThemeRegistryStore.apply(backupFile, entries, windowsThemeTargets(entries, rgb, options), commit);
  spawn("rundll32.exe", ["user32.dll,UpdatePerUserSystemParameters"], { windowsHide: true, stdio: "ignore" });
  return true;
}

async function restoreWindowsThemeFeature(userData, featureId, commit) {
  if (!FEATURES[featureId]) return false;
  const entries = windowsThemeEntries([featureId]);
  const backupFile = path.join(userData, "windows-theme-backup.json");
  const restored = await windowsThemeRegistryStore.restore(backupFile, entries, commit);
  if (!restored) return false;
  spawn("rundll32.exe", ["user32.dll,UpdatePerUserSystemParameters"], { windowsHide: true, stdio: "ignore" });
  return true;
}

function writeWindowsThemeState(file, features, rgb, options = {}) {
  if (!Object.values(features).some(Boolean)) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  writeJsonAtomically(file, { features, rgb, options: normalizeWindowsOptions(options) });
}

function readWindowsThemeState(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function restoreWindowsThemeState(file, state, existed) {
  if (existed) writeJsonAtomically(file, state);
  else if (fs.existsSync(file)) fs.unlinkSync(file);
}

function commitWindowsFeatureSettings(userData, stateFile, features, rgb, options, previousFeatures) {
  const previousStateExists = fs.existsSync(stateFile);
  const previousState = readWindowsThemeState(stateFile);
  let updated;
  try {
    updated = saveSettings(userData, { windowsThemeFeatures: features });
    writeWindowsThemeState(stateFile, features, rgb, options);
  } catch (error) {
    try {
      settings = saveSettings(userData, { windowsThemeFeatures: previousFeatures });
      restoreWindowsThemeState(stateFile, previousState, previousStateExists);
    } catch (rollbackError) {
      throw new Error(`${error.message || error}; Windows-Einstellungen konnten nicht zurückgesetzt werden: ${rollbackError.message || rollbackError}`);
    }
    throw error;
  }
  settings = updated;
  return updated;
}

async function syncWindowsThemeSettings(userData, currentSettings, rgb) {
  const stateFile = path.join(userData, "windows-theme-state.json");
  const features = normalizeFeatures(currentSettings.windowsThemeFeatures);
  const activeIds = Object.keys(FEATURES).filter((id) => features[id]);
  if (!activeIds.length) {
    writeWindowsThemeState(stateFile, features, rgb, currentSettings);
    return true;
  }
  const entries = windowsThemeEntries(activeIds);
  const backupFile = path.join(userData, "windows-theme-backup.json");
  await windowsThemeRegistryStore.apply(
    backupFile,
    entries,
    windowsThemeTargets(entries, rgb, currentSettings),
    () => writeWindowsThemeState(stateFile, features, rgb, currentSettings)
  );
  spawn("rundll32.exe", ["user32.dll,UpdatePerUserSystemParameters"], { windowsHide: true, stdio: "ignore" });
  return true;
}

ipcMain.handle("apply-windows-theme", async (event, payload = {}) => {
  requireTrustedWindow(event);
  if (process.platform !== "win32") return { applied: false, error: "Windows-Anpassungen sind nur unter Windows verfügbar." };
  const userData = app.getPath("userData");
  const stateFile = path.join(userData, "windows-theme-state.json");
  const action = payload.action;
  const featureId = String(payload.feature || "");
  const currentSettings = loadSettings(userData);
  const currentFeatures = normalizeFeatures(currentSettings.windowsThemeFeatures);
  let rgb = payload.rgb && typeof payload.rgb === "object" ? payload.rgb : null;

  try {
    if (!rgb && fs.existsSync(stateFile)) rgb = readWindowsThemeState(stateFile).rgb;
    if (!rgb || typeof rgb !== "object") rgb = { r: 0, g: 234, b: 255 };
    if (action === "sync") {
      if (!(await syncWindowsThemeSettings(userData, currentSettings, rgb))) {
        return { applied: false, error: "Mindestens eine aktive Windows-Anpassung konnte nicht angewendet werden." };
      }
      themeStudioStore?.recordActivity("windows-sync", "active");
      return { applied: true, features: currentFeatures };
    }
    if (action === "test") {
      if (!FEATURES[featureId]) return { applied: false, error: "Unbekannte Windows-Anpassung." };
      const applied = await applyWindowsThemeFeature(userData, featureId, rgb, currentSettings);
      if (applied) themeStudioStore?.recordActivity("windows-test", featureId);
      return { applied, error: applied ? undefined : "Windows hat mindestens einen Registry-Wert abgelehnt." };
    }
    if (action === "restore") {
      if (!FEATURES[featureId]) return { applied: false, error: "Unbekannte Windows-Anpassung." };
      const state = readWindowsThemeState(stateFile);
      const features = { ...currentFeatures, [featureId]: false };
      const applied = await restoreWindowsThemeFeature(userData, featureId, () => {
        commitWindowsFeatureSettings(userData, stateFile, features, rgb, currentSettings, currentFeatures);
      });
      const legacyStartSwitch = featureId === "startTaskbarAccent"
        && state.features?.taskbarWindowAccent === true
        && state.features.startTaskbarAccent === undefined;
      if (!applied && !legacyStartSwitch) return { applied: false, error: "Kein gültiges Backup für diese Anpassung vorhanden." };
      if (!applied) commitWindowsFeatureSettings(userData, stateFile, features, rgb, currentSettings, currentFeatures);
      themeStudioStore?.recordActivity("windows-restore", featureId);
      broadcast("settings-updated", {
        settings,
        theme: loadTheme(settings.theme || "tron"),
        themeName: settings.theme || "tron",
        displays: listDisplays()
      });
      return { applied: true, features };
    }
    if (action !== "set-feature" || !FEATURES[featureId] || typeof payload.enabled !== "boolean") {
      return { applied: false, error: "Ungültige Windows-Anpassung oder Aktion." };
    }
    const enabled = payload.enabled;
    const features = { ...currentFeatures, [featureId]: enabled };
    const commit = () => commitWindowsFeatureSettings(userData, stateFile, features, rgb, currentSettings, currentFeatures);
    if (enabled) {
      await applyWindowsThemeFeature(userData, featureId, rgb, currentSettings, commit);
    } else {
      const state = readWindowsThemeState(stateFile);
      const activeFeatures = normalizeFeatures(state.features, state.mode);
      const restored = await restoreWindowsThemeFeature(userData, featureId, commit);
      const legacyStartSwitch = featureId === "startTaskbarAccent"
        && state.features?.taskbarWindowAccent === true
        && state.features.startTaskbarAccent === undefined;
      if (!restored && activeFeatures[featureId] && !legacyStartSwitch) {
        return { applied: false, error: "Die aktive Windows-Anpassung hat kein wiederherstellbares Backup." };
      }
      if (!restored) commit();
    }
    themeStudioStore?.recordActivity(enabled ? "windows-enable" : "windows-disable", featureId);
    broadcast("settings-updated", {
      settings,
      theme: loadTheme(settings.theme || "tron"),
      themeName: settings.theme || "tron",
      displays: listDisplays()
    });
    return { applied: true, features };
  } catch (error) {
    return { applied: false, error: error.message || String(error) };
  }
});

function loginItemOptions(openAtLogin) {
  return {
    openAtLogin: Boolean(openAtLogin),
    path: process.execPath,
    args: app.isPackaged ? [] : [app.getAppPath()]
  };
}

ipcMain.handle("get-start-with-windows", (event) => {
  requireTrustedWindow(event);
  if (process.platform !== "win32") return false;
  return Boolean(app.getLoginItemSettings(loginItemOptions(true)).openAtLogin);
});

ipcMain.handle("set-start-with-windows", (event, enabled) => {
  requireTrustedWindow(event);
  const next = process.platform === "win32" && Boolean(enabled);
  if (process.platform === "win32") app.setLoginItemSettings(loginItemOptions(next));
  settings = saveSettings(app.getPath("userData"), { startWithWindows: next });
  return next;
});

ipcMain.handle("save-settings", (event, patch) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const displayId = getWindowDisplayId(win);

  if (patch.displayLayout) {
    settings = saveSettings(app.getPath("userData"), {
      displayLayoutPatch: {
        displayId,
        layout: patch.displayLayout
      }
    });
    delete patch.displayLayout;
  }

  const globalPatch = { ...patch };
  delete globalPatch.displayLayout;
  delete globalPatch.displayLayoutPatch;
  const refreshStartupPresetName = String(globalPatch.refreshStartupPreset || "").trim();
  delete globalPatch.refreshStartupPreset;
  if (Object.prototype.hasOwnProperty.call(globalPatch, "theme")) {
    globalPatch.theme = resolveThemeName(globalPatch.theme);
  }
  if (Object.prototype.hasOwnProperty.call(globalPatch, "startWithWindows")) {
    const startWithWindows = process.platform === "win32" && globalPatch.startWithWindows === true;
    if (process.platform === "win32") app.setLoginItemSettings(loginItemOptions(startWithWindows));
    globalPatch.startWithWindows = startWithWindows;
  }
  if (refreshStartupPresetName) {
    globalPatch.presets = refreshPresetForSave(settings, refreshStartupPresetName, globalPatch, displayId);
  }
  if (Object.keys(globalPatch).length) {
    settings = saveSettings(app.getPath("userData"), globalPatch);
  } else {
    settings = loadSettings(app.getPath("userData"));
  }
  if (themeStudioStore && [
    "displayWallpapers", "desktopSyncAcrossDisplays", "gridSize", "desktopIconPack",
    "desktopCursorPack", "panelOpacity", "contrastMode"
  ].some((key) => Object.prototype.hasOwnProperty.call(globalPatch, key))) {
    themeStudioStore.recordActivity("desktop-settings", "display");
  }
  appLog.info("settings.update", "Einstellungen aktualisiert", {
    theme: settings.theme,
    wallpaper: settings.wallpaper,
  });

  const themeName = resolveThemeName(settings.theme || "tron");
  const payload = {
    settings,
    theme: loadTheme(themeName),
    themeName,
    displays: listDisplays()
  };

  // Sync appearance to every independent display page (layouts stay per-display).
  broadcast("settings-updated", payload);
  if (
    Object.prototype.hasOwnProperty.call(globalPatch, "uiScale")
    || Object.prototype.hasOwnProperty.call(globalPatch, "layoutMode")
  ) {
    rezoomAllWindows();
  }
  if (
    Object.prototype.hasOwnProperty.call(globalPatch, "theme")
    || Object.prototype.hasOwnProperty.call(globalPatch, "wallpaper")
    || Object.prototype.hasOwnProperty.call(globalPatch, "displayWallpapers")
    || Object.prototype.hasOwnProperty.call(globalPatch, "gridSize")
    || Object.prototype.hasOwnProperty.call(globalPatch, "windowsWallpaper")
  ) {
    scheduleWallpaper();
  }
  return payload;
});

ipcMain.handle("save-display-layout", (event, layout) => {
  requireTrustedWindow(event);
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    throw new Error("Ungültiges Display-Layout");
  }
  const win = getSenderWindow(event);
  const displayId = getWindowDisplayId(win);
  settings = saveSettings(app.getPath("userData"), {
    displayLayoutPatch: { displayId, layout }
  });
  return true;
});

ipcMain.handle("raise-overlay", async (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  allowForeground();
  return raiseOverlayWindow(win);
});

ipcMain.handle("transfer-widget", (event, payload) => {
  requireTrustedWindow(event);
  const { targetDisplayId, widget } = payload || {};
  const target = windows.get(Number(targetDisplayId));
  if (!target || target.isDestroyed()) {
    return { ok: false, message: "目標顯示器不存在" };
  }
  if (widget?.type === "desktop") {
    const meta = listDisplays().find((d) => d.id === Number(targetDisplayId));
    if (!meta?.primary) {
      return { ok: false, message: "系統桌面僅能顯示在主顯示器" };
    }
  }
  target.webContents.send("receive-widget", widget);
  target.focus();
  return { ok: true };
});

function showThemeStudio() {
  if (themeStudioWindow && !themeStudioWindow.isDestroyed()) {
    themeStudioWindow.show();
    themeStudioWindow.focus();
    return;
  }
  themeStudioWindow = new BrowserWindow({
    title: "Bockis Theme Studio",
    width: 1080,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#07121b",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  themeStudioWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  themeStudioWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  themeStudioWindow.loadFile(path.join(__dirname, "src", "theme-studio.html"));
  themeStudioWindow.on("closed", () => {
    themeStudioWindow = null;
    broadcast("theme-preview-reset", {});
  });
}

ipcMain.handle("theme-studio-open", (event) => {
  requireTrustedWindow(event);
  showThemeStudio();
  return true;
});

ipcMain.handle("theme-studio-list", (event) => {
  requireTrustedWindow(event);
  return { themes: listThemes(), active: settings.theme };
});

ipcMain.handle("theme-studio-save", (event, payload) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  return themeStudioStore.save(payload?.name, payload?.theme);
});

ipcMain.handle("theme-studio-export", async (event, name) => {
  const win = requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const key = resolveThemeName(name);
  const result = await dialog.showSaveDialog(win, {
    title: "Theme-Paket exportieren",
    defaultPath: `${key}.bockis-theme.json`,
    filters: [{ name: "Bockis Theme-Paket", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const desktop = {
    wallpaper: settings.wallpaper,
    displayWallpapers: settings.displayWallpapers,
    desktopSyncAcrossDisplays: settings.desktopSyncAcrossDisplays,
    gridSize: settings.gridSize,
    desktopIconPack: settings.desktopIconPack,
    desktopCursorPack: settings.desktopCursorPack,
    panelOpacity: settings.panelOpacity,
    contrastMode: settings.contrastMode,
    windowsThemeFeatures: settings.windowsThemeFeatures,
    windowsTaskbarAlignment: settings.windowsTaskbarAlignment,
    windowsTaskbarSize: settings.windowsTaskbarSize
  };
  themeStudioStore.exportPackage(key, result.filePath, desktop);
  return { exported: true, name: key };
});

ipcMain.handle("theme-studio-import", async (event) => {
  const win = requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const result = await dialog.showOpenDialog(win, {
    title: "Theme-Paket importieren",
    properties: ["openFile"],
    filters: [{ name: "Bockis Theme-Paket", extensions: ["json"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return themeStudioStore.importPackage(result.filePaths[0]);
});

ipcMain.handle("theme-studio-import-windows-theme", async (event) => {
  const win = requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const result = await dialog.showOpenDialog(win, {
    title: "Windows-Theme-Datei importieren",
    properties: ["openFile"],
    filters: [{ name: "Windows-Theme-Datei", extensions: ["theme"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const imported = parseWindowsThemeFile(result.filePaths[0]);
  const theme = loadTheme(resolveThemeName(settings.theme || "tron"));
  theme.windowsThemeImport = imported;
  const importedAccent = imported.colors.accent;
  if (importedAccent) {
    theme.colors.r = Number.parseInt(importedAccent.slice(1, 3), 16);
    theme.colors.g = Number.parseInt(importedAccent.slice(3, 5), 16);
    theme.colors.b = Number.parseInt(importedAccent.slice(5, 7), 16);
  }
  if (imported.colors.panel || imported.colors.background) {
    theme.colors.black = imported.colors.panel || imported.colors.background;
  }
  if (imported.colors.background) theme.colors.light_black = imported.colors.background;
  if (imported.colors.foreground || imported.colors.background) {
    theme.terminal = {
      ...theme.terminal,
      foreground: imported.colors.foreground || theme.terminal?.foreground,
      background: imported.colors.background || theme.terminal?.background
    };
  }
  themeStudioStore.recordActivity("windows-theme-import", imported.displayName);
  const suggestedName = path.basename(imported.sourceName, path.extname(imported.sourceName))
    .replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "windows_theme";
  return { canceled: false, theme, name: suggestedName, imported };
});

ipcMain.handle("theme-studio-windows-recovery-status", (event) => {
  requireTrustedWindow(event);
  if (process.platform !== "win32") return { available: false };
  const backupFile = path.join(app.getPath("userData"), "windows-theme-backup.json");
  return { available: true, ...windowsThemeRegistryStore.inspect(backupFile) };
});

ipcMain.handle("theme-studio-windows-emergency-restore", async (event) => {
  requireTrustedWindow(event);
  if (process.platform !== "win32") return { restored: false, error: "Nur unter Windows verfügbar." };
  const userData = app.getPath("userData");
  const backupFile = path.join(userData, "windows-theme-backup.json");
  const recoveryStatus = windowsThemeRegistryStore.inspect(backupFile);
  let recoveredTransaction = false;
  try {
    if (recoveryStatus.pendingRecovery && recoveryStatus.transactionValid) {
      await windowsThemeRegistryStore.recover(backupFile);
      recoveredTransaction = true;
    }
    const currentSettings = loadSettings(userData);
    const currentFeatures = normalizeFeatures(currentSettings.windowsThemeFeatures);
    const features = Object.fromEntries(Object.keys(FEATURES).map((id) => [id, false]));
    const theme = loadTheme(resolveThemeName(currentSettings.theme || "tron"));
    const restored = await windowsThemeRegistryStore.emergencyRestore(
      backupFile,
      windowsThemeEntries(Object.keys(FEATURES)),
      () => commitWindowsFeatureSettings(
        userData,
        path.join(userData, "windows-theme-state.json"),
        features,
        theme.colors,
        currentSettings,
        currentFeatures
      )
    );
    if (!restored) {
      return {
        restored: false,
        recovered: recoveredTransaction,
        error: recoveredTransaction
          ? "Unterbrochene Transaktion wurde zurückgesetzt; es gibt kein separates Windows-Backup."
          : "Kein gültiges Backup für verwaltete Windows-Werte vorhanden."
      };
    }
    spawn("rundll32.exe", ["user32.dll,UpdatePerUserSystemParameters"], { windowsHide: true, stdio: "ignore" });
    themeStudioStore?.recordActivity("windows-emergency-restore", "all-managed-values");
    broadcast("settings-updated", {
      settings,
      theme,
      themeName: currentSettings.theme || "tron",
      displays: listDisplays()
    });
    return { restored: true, features };
  } catch (error) {
    return { restored: false, error: error.message || String(error) };
  }
});

ipcMain.handle("theme-studio-create-backup", (event) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const themeName = resolveThemeName(settings.theme || "tron");
  return themeStudioStore.createProfileBackup(themeName, loadTheme(themeName), settings);
});

ipcMain.handle("theme-studio-list-backups", (event) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  return themeStudioStore.listProfileBackups();
});

ipcMain.handle("theme-studio-restore-backup", async (event, id) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const snapshot = themeStudioStore.loadProfileBackup(id);
  let name = snapshot.name;
  const builtInFile = path.join(themesDir, `${name}.json`);
  if (fs.existsSync(builtInFile)) name = `${name}_restored`;
  let suffix = 2;
  while (name !== snapshot.name && listThemes().includes(name)) {
    name = `${snapshot.name}_restored_${suffix++}`;
  }
  themeStudioStore.save(name, snapshot.theme);
  const source = snapshot.settings;
  const restoredSettings = {};
  for (const key of [
    "wallpaper", "displayWallpapers", "desktopSyncAcrossDisplays", "gridSize",
    "desktopIconPack", "desktopCursorPack", "panelOpacity", "contrastMode",
    "windowsThemeFeatures", "windowsTaskbarAlignment", "windowsTaskbarSize", "windowsWallpaper"
  ]) {
    if (source[key] !== undefined) restoredSettings[key] = source[key];
  }
  settings = saveSettings(app.getPath("userData"), { ...restoredSettings, theme: name });
  themeStudioStore.recordActivity("restore", name);
  const theme = loadTheme(name);
  const payload = { settings, theme, themeName: name, displays: listDisplays() };
  broadcast("settings-updated", payload);
  scheduleWallpaper();
  const windowsApplied = process.platform === "win32"
    ? await syncWindowsThemeSettings(app.getPath("userData"), settings, theme.colors)
    : false;
  return { name, windowsApplied };
});

ipcMain.handle("theme-studio-activity", (event) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  return themeStudioStore.listActivity(50);
});

ipcMain.handle("theme-studio-delete", (event, name) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  const names = themeStudioStore.remove(name);
  if (settings.theme === name) {
    settings = saveSettings(app.getPath("userData"), { theme: "tron" });
    broadcast("settings-updated", {
      settings,
      theme: loadTheme("tron"),
      themeName: "tron",
      displays: listDisplays()
    });
  }
  return names;
});

ipcMain.handle("theme-studio-preview", (event, theme) => {
  requireTrustedWindow(event);
  if (!themeStudioStore) throw new Error("Theme Studio ist noch nicht initialisiert");
  broadcast("theme-preview", themeStudioStore.normalizeTheme(theme));
  return true;
});

ipcMain.handle("theme-studio-preview-reset", (event) => {
  requireTrustedWindow(event);
  broadcast("theme-preview-reset", {});
  return true;
});

ipcMain.handle("theme-studio-activate", (event, name) => {
  requireTrustedWindow(event);
  const resolved = resolveThemeName(name);
  if (resolved !== name) throw new Error("Theme nicht gefunden");
  settings = saveSettings(app.getPath("userData"), { theme: resolved });
  themeStudioStore?.recordActivity("activate", resolved);
  const payload = {
    settings,
    theme: loadTheme(resolved),
    themeName: resolved,
    displays: listDisplays()
  };
  broadcast("settings-updated", payload);
  scheduleWallpaper();
  return payload;
});

ipcMain.handle("get-theme", (event, name) => {
  requireTrustedWindow(event);
  return loadTheme(name || settings.theme || "tron");
});

ipcMain.handle("get-app-version", (event) => {
  requireTrustedWindow(event);
  return APP_VERSION;
});

ipcMain.handle("check-for-updates", (event) => {
  requireTrustedWindow(event);
  return checkForUpdates("manual");
});

ipcMain.handle("pick-folder", async (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const result = await dialog.showOpenDialog(win, {
    title: "Ordner für den Organizer auswählen",
    defaultPath: currentRoot,
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  currentRoot = result.filePaths[0];
  approvePathRoot(currentRoot);
  return currentRoot;
});

ipcMain.handle("scan", async (event, root) => {
  const target = root || currentRoot;
  requireTrustedWindow(event);
  if (!target) throw new Error("未選擇路徑");
  requireApprovedPath(target);
  if (root) currentRoot = root;
  return scanRoot(target);
});

ipcMain.handle("list-folder", async (event, root, options) => {
  if (!root) throw new Error("未選擇路徑");
  requireTrustedWindow(event);
  const opts = { systemIcons: "fast", ...(options || {}) };
  try {
    return await listFolder(root, opts);
  } catch (error) {
    if (error?.code === "EACCES" || error?.code === "EPERM") {
      return {
        root,
        items: [],
        destFolders: [],
        total: 0,
        readError: `Ordner kann nicht gelesen werden (keine Berechtigung): ${root}`
      };
    }
    throw error;
  }
});

ipcMain.handle("list-drives", async (event) => {
  requireTrustedWindow(event);
  return listDrives();
});

ipcMain.handle("terminal-run", async (event, command, cwd) => {
  requireTrustedWindow(event);
  const text = String(command || "").trim();
  if (!text) return { ok: true, stdout: "", stderr: "", code: 0, cwd: os.homedir() };
  const workingDirectory = typeof cwd === "string" && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()
    ? cwd
    : os.homedir();
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "RemoteSigned",
      "-Command",
      text
    ], {
      cwd: workingDirectory,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 30000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: error.message || "PowerShell konnte nicht gestartet werden", code: 1, cwd: workingDirectory });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout, stderr, code: code ?? 1, cwd: workingDirectory });
    });
  });
});
function findOpenSsh() {
  const candidates = [
    path.join(process.env.SystemRoot || "C:\\Windows", "System32", "OpenSSH", "ssh.exe"),
    path.join(process.env.SystemRoot || "C:\\Windows", "ssh.exe")
  ];
  const local = candidates.find((candidate) => fs.existsSync(candidate));
  if (local) return local;
  return findExecutable("ssh.exe");
}

function validateSshOptions(options = {}) {
  const host = String(options.host || "").trim();
  const user = String(options.user || "").trim();
  const port = Number(options.port || 22);
  const identityFile = String(options.identityFile || "").trim();
  if (!host || host.length > 253 || /[\r\n\t]/.test(host)) throw new Error("SSH-Ziel ist ungültig");
  if (!user || user.length > 100 || /[\s\r\n@]/.test(user)) throw new Error("SSH-Benutzer ist ungültig");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SSH-Port ist ungültig");
  if (identityFile && (!path.isAbsolute(identityFile) || !fs.existsSync(identityFile) || !fs.statSync(identityFile).isFile())) {
    throw new Error("SSH-Schlüsseldatei wurde nicht gefunden");
  }
  return { host, user, port, identityFile };
}

ipcMain.handle("terminal-create", (event, paneId, cwd, shellType, options = {}) => {
  const win = requireTrustedWindow(event);
  if (quitting) throw new Error("Die Anwendung wird bereits beendet");
  if (!nodePty) throw new Error("ConPTY ist nicht verfügbar. Bitte node-pty für Electron rebuilden.");
  const key = `${win.id}:${String(paneId || "default")}`;
  stopTerminalSession(key, terminalSessions.get(key));
  const workingDirectory = typeof cwd === "string" && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()
    ? cwd
    : os.homedir();
  const selectedShell = shellType === "cmd" ? "cmd" : shellType === "ssh" ? "ssh" : "powershell";
  const sshPath = selectedShell === "ssh" ? findOpenSsh() : "";
  if (selectedShell === "ssh" && !sshPath) throw new Error("OpenSSH (ssh.exe) wurde nicht gefunden");
  const sshOptions = selectedShell === "ssh" ? validateSshOptions(options) : null;
  const shell = selectedShell === "cmd"
    ? (process.env.ComSpec || path.join(process.env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"))
    : selectedShell === "ssh"
      ? sshPath
    : path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const shellArgs = selectedShell === "cmd"
    ? []
    : selectedShell === "ssh"
      ? [
        "-p", String(sshOptions.port),
        ...(sshOptions.identityFile ? ["-i", sshOptions.identityFile] : []),
        `${sshOptions.user}@${sshOptions.host}`
      ]
      : ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "RemoteSigned"];
  const session = nodePty.spawn(shell, shellArgs, {
    cwd: workingDirectory,
    name: "xterm-256color",
    cols: 120,
    rows: 32,
    useConpty: true,
    backend: "conpty",
    env: { ...process.env, TERM: "xterm-256color", EDEX_SHELL: selectedShell }
  });
  terminalSessions.set(key, session);
  terminalSessionShells.set(key, selectedShell);
  appLog.info("terminal.create", "Terminal-Sitzung gestartet", {
    paneId,
    shell: selectedShell,
    cwd: workingDirectory,
    sshHost: sshOptions?.host || ""
  });
  let lastCwd = workingDirectory;
  let promptBuffer = "";
  const sendData = (data) => {
    let suppressTerminalData = false;
    promptBuffer = `${promptBuffer}${String(data || "")}`.slice(-8192);
    const cleanPromptBuffer = promptBuffer.replace(/\x1b(?:\[[0-?]*[ -\/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, "");
    const promptMatches = selectedShell === "cmd"
      ? [...cleanPromptBuffer.matchAll(/(?:^|\r?\n)([A-Za-z]:\\[^\r\n>]*|\\\\[^\r\n>]+)>[ \t]*/g)]
      : selectedShell === "powershell"
        ? [...cleanPromptBuffer.matchAll(/(?:^|\r?\n)PS[ \t]+([^\r\n>]+)>[ \t]*/g)]
        : selectedShell === "ssh"
          ? [...cleanPromptBuffer.matchAll(/(?:^|\r?\n)[^@\r\n]+@[^:\r\n]+:([~\/][^\r\n$#>]*?)[ \t]*[#$>][ \t]*/g)]
          : [];
    const promptMatch = promptMatches[promptMatches.length - 1];
    if (promptMatch) {
      const nextCwd = String(promptMatch[1] || "").trim();
      if (nextCwd && nextCwd !== lastCwd && (selectedShell === "ssh" || fs.existsSync(nextCwd))) {
        lastCwd = nextCwd;
        if (!win.isDestroyed()) win.webContents.send("terminal-cwd", { paneId, cwd: nextCwd });
      }
    }
    const pending = remoteListingRequests.get(key);
    if (pending) {
      suppressTerminalData = true;
      pending.buffer = `${pending.buffer}${String(data || "")}`.slice(-30000);
      const begin = pending.buffer.lastIndexOf(pending.begin);
      const end = pending.buffer.indexOf(pending.end, begin + pending.begin.length);
      if (begin >= 0 && end >= 0) {
        const body = pending.buffer.slice(begin + pending.begin.length, end)
          .replace(/\x1b(?:\[[0-?]*[ -\/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, "")
          .replace(/\r/g, "");
        let items = body.split("\n")
          .map((line) => {
            const tabParts = line.split("\t");
            if (tabParts.length >= 3) return tabParts;
            const match = line.match(/^\s*([df])\s+(\d+)\s+(.+?)\s*$/);
            return match ? [match[1], match[2], match[3]] : [];
          })
          .filter((parts) => parts.length >= 3 && (parts[0] === "d" || parts[0] === "f"))
        if (!items.length) {
          const fallback = [...body.matchAll(/(?:^|\n)\s*([df])\s+(\d+)\s+([^\r\n]+?)(?=\r?$)/gm)];
          items = fallback.map((match) => [match[1], match[2], match[3].trim()]);
        }
        items = items.map(([kind, size, name]) => ({
            name,
            displayName: name,
            path: `${pending.root.replace(/\/+$/, "")}/${name}`,
            isDirectory: kind === "d",
            sizeLabel: kind === "d" ? "Ordner" : `${Number(size) || 0} B`
          }));
        appLog.info("terminal.remote-list", "SSH-Verzeichnis gelesen", {
          paneId,
          root: pending.root,
          itemCount: items.length
        });
        clearTimeout(pending.timer);
        pending.resolve({ root: pending.root, items });
        remoteListingRequests.delete(key);
        const visibleData = `${pending.buffer.slice(0, begin)}${pending.buffer.slice(end + pending.end.length)}`;
        if (!win.isDestroyed() && visibleData) {
          win.webContents.send("terminal-data", { paneId, data: visibleData });
        }
      }
    }
    if (!suppressTerminalData && !win.isDestroyed()) {
      win.webContents.send("terminal-data", { paneId, data });
    }
  };
  session.onData(sendData);
  session.onExit(({ exitCode }) => {
    terminalSessionStopping.delete(session);
    if (terminalSessions.get(key) === session) terminalSessions.delete(key);
    if (terminalSessions.get(key) !== session && !terminalSessions.has(key)) {
      terminalSessionShells.delete(key);
    }
    if (!win.isDestroyed()) win.webContents.send("terminal-exit", { paneId, exitCode: exitCode ?? 1 });
  });
  return { ok: true, paneId, cwd: workingDirectory };
});
ipcMain.on("terminal-cd", (event, paneId, target) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const key = `${win?.id}:${String(paneId || "default")}`;
  const session = terminalSessions.get(key);
  if (!session || typeof target !== "string") return;
  const selectedShell = terminalSessionShells.get(key) || "powershell";
  if (selectedShell === "ssh") {
    session.write(`cd -- ${remotePathExpression(target)}\r`);
    return;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) return;
  if (selectedShell === "cmd") {
    session.write(`cd /d "${target.replace(/"/g, "")}"\r`);
    return;
  }
  const escaped = target.replace(/'/g, "''");
  session.write(`Set-Location -LiteralPath '${escaped}'\r`);
});
ipcMain.handle("terminal-list-remote", (event, paneId, target) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const pane = String(paneId || "default");
  const exactKey = `${win?.id}:${pane}`;
  let key = exactKey;
  let session = terminalSessions.get(key);
  if (!session || terminalSessionShells.get(key) !== "ssh") {
    const candidates = [...terminalSessions.keys()]
      .filter((candidate) => candidate.endsWith(`:${pane}`))
      .filter((candidate) => terminalSessionShells.get(candidate) === "ssh");
    if (candidates.length === 1) {
      key = candidates[0];
      session = terminalSessions.get(key);
    }
  }
  if (!session || terminalSessionShells.get(key) !== "ssh") {
    const sshCandidates = [...terminalSessions.keys()]
      .filter((candidate) => terminalSessionShells.get(candidate) === "ssh");
    if (sshCandidates.length === 1) {
      key = sshCandidates[0];
      session = terminalSessions.get(key);
    }
  }
  if (!session || terminalSessionShells.get(key) !== "ssh") {
    throw new Error("Keine aktive SSH-Sitzung");
  }
  const root = typeof target === "string" && target ? target : ".";
  const token = `__EDEX_REMOTE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}__`;
  const begin = `${token}_BEGIN`;
  const end = `${token}_END`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const pending = remoteListingRequests.get(key);
      if (pending?.token === token) {
        remoteListingRequests.delete(key);
        if (!win.isDestroyed() && pending.buffer) {
          win.webContents.send("terminal-data", { paneId, data: pending.buffer });
        }
      }
      resolve({ root, items: [], error: "SSH-Verzeichnis konnte nicht gelesen werden" });
    }, 10000);
    remoteListingRequests.set(key, { token, begin, end, root, buffer: "", timer, resolve });
    const targetExpression = remotePathExpression(root);
    session.write(`cd -- ${targetExpression} 2>/dev/null && { printf '\\n${begin}\\n'; for item in ./* ./.[!.]* ./..?*; do [ -e "$item" ] || continue; if [ -d "$item" ]; then kind=d; else kind=f; fi; size=$(wc -c < "$item" 2>/dev/null || echo 0); name=\${item##*/}; printf '%s\\t%s\\t%s\\n' "$kind" "$size" "$name"; done; } || printf '\\n${begin}\\n'; printf '${end}\\n'\r`);
  });
});
ipcMain.handle("terminal-admin", (event, cwd) => {
  requireTrustedWindow(event);
  const workingDirectory = typeof cwd === "string" && fs.existsSync(cwd) && fs.statSync(cwd).isDirectory()
    ? cwd
    : os.homedir();
  const escaped = workingDirectory.replace(/'/g, "''");
  const child = spawn("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-Command",
    `Start-Process -FilePath powershell.exe -Verb RunAs -WorkingDirectory '${escaped}'`
  ], { windowsHide: true, stdio: "ignore", detached: true });
  child.unref();
  return { ok: true };
});
ipcMain.on("terminal-input", (event, paneId, data) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const session = terminalSessions.get(`${win?.id}:${String(paneId || "default")}`);
  if (session && typeof data === "string") session.write(data);
});
ipcMain.on("terminal-resize", (event, paneId, cols, rows) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const session = terminalSessions.get(`${win?.id}:${String(paneId || "default")}`);
  if (!session) return;
  const nextCols = Math.max(20, Math.min(240, Number(cols) || 100));
  const nextRows = Math.max(5, Math.min(100, Number(rows) || 30));
  session.resize(nextCols, nextRows);
});
ipcMain.on("terminal-close", (event, paneId) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const key = `${win?.id}:${String(paneId || "default")}`;
  const session = terminalSessions.get(key);
  stopTerminalSession(key, session);
});
ipcMain.handle("search-files", async (event, query, limit) => {
  requireTrustedWindow(event);
  return fileSearch.search(query, limit);
});
ipcMain.handle("search-status", (event) => {
  requireTrustedWindow(event);
  return fileSearch.status();
});
ipcMain.handle("search-rebuild", async (event) => {
  requireTrustedWindow(event);
  return fileSearch.rebuild();
});
ipcMain.handle("pick-search-root", async (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const result = await dialog.showOpenDialog(win, {
    title: "Ordner oder Netzlaufwerk für die Suche auswählen",
    properties: ["openDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});
ipcMain.handle("add-search-root", async (event, target) => {
  requireTrustedWindow(event);
  const normalized = fileSearch.normalizeRoot(target);
  const roots = fileSearch.addRoot(normalized);
  const ok = await fileSearch.pathReachable(normalized);
  if (!ok) {
    fileSearch.removeRoot(normalized);
    throw new Error("無法存取此路徑，請確認本機或局域網磁碟已連線");
  }
  settings = saveSettings(app.getPath("userData"), { searchRoots: roots });
  fileSearch.configure({ roots, includeLocal: settings.searchLocalDrives !== false });
  fileSearch.rebuild().catch((err) => console.error("file-search", err));
  return { roots, ...fileSearch.status() };
});
ipcMain.handle("remove-search-root", async (event, target) => {
  requireTrustedWindow(event);
  const roots = fileSearch.removeRoot(target);
  settings = saveSettings(app.getPath("userData"), { searchRoots: roots });
  fileSearch.configure({ roots, includeLocal: settings.searchLocalDrives !== false });
  fileSearch.rebuild().catch((err) => console.error("file-search", err));
  return { roots, ...fileSearch.status() };
});
ipcMain.handle("set-search-local", async (event, enabled) => {
  requireTrustedWindow(event);
  settings = saveSettings(app.getPath("userData"), { searchLocalDrives: Boolean(enabled) });
  fileSearch.configure({
    roots: settings.searchRoots || [],
    includeLocal: settings.searchLocalDrives !== false
  });
  fileSearch.rebuild().catch((err) => console.error("file-search", err));
  return fileSearch.status();
});
ipcMain.handle("reveal-path", async (event, target) => {
  requireTrustedWindow(event);
  if (!target) return false;
  shell.showItemInFolder(String(target));
  return true;
});

ipcMain.handle("plan", async (event, scan, options) => {
  requireTrustedWindow(event);
  requireApprovedPath(scan?.root);
  return buildPlan(scan, options);
});

ipcMain.handle("organize", async (event, scan, options) => {
  requireTrustedWindow(event);
  requireApprovedPath(scan?.root);
  return executePlan(scan, options, journalPath());
});

ipcMain.handle("undo", async (event) => {
  requireTrustedWindow(event);
  return undoLast(journalPath());
});

ipcMain.handle("import-files", async (event, destDir, sources) => {
  requireTrustedWindow(event);
  requireApprovedPath(destDir);
  if (!Array.isArray(sources)) throw new Error("Quellpfade müssen aus einer Dateiauswahl stammen");
  return importFiles(destDir, sources);
});

ipcMain.handle("read-file-preview", async (event, target) => {
  requireTrustedWindow(event);
  requireApprovedPath(target);
  const stat = await fs.promises.stat(target);
  if (stat.isDirectory()) throw new Error("Ordner haben keine Dateivorschau");
  if (stat.size > 2 * 1024 * 1024) throw new Error("Die Datei ist für eine Vorschau zu groß");
  const ext = path.extname(target).toLowerCase();
  const imageTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp"
  };
  if (imageTypes[ext]) {
    const data = await fs.promises.readFile(target);
    return { kind: "image", mime: imageTypes[ext], data: data.toString("base64") };
  }
  const textTypes = new Set([
    ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".jsx", ".css", ".html", ".htm",
    ".xml", ".yml", ".yaml", ".csv", ".ini", ".log", ".bat", ".cmd", ".ps1"
  ]);
  if (!textTypes.has(ext)) throw new Error("Für diesen Dateityp ist keine Vorschau verfügbar");
  return { kind: "text", text: await fs.promises.readFile(target, "utf8") };
});

ipcMain.handle("get-calendar-notes", (event) => {
  requireTrustedWindow(event);
  return loadNotes(app.getPath("userData"));
});
ipcMain.handle("add-calendar-note", (event, dateKey, text) => {
  requireTrustedWindow(event);
  return addNote(app.getPath("userData"), dateKey, text);
});
ipcMain.handle("update-calendar-note", (event, dateKey, id, text) => {
  requireTrustedWindow(event);
  return updateNote(app.getPath("userData"), dateKey, id, text);
});
ipcMain.handle("remove-calendar-note", (event, dateKey, id) => {
  requireTrustedWindow(event);
  return removeNote(app.getPath("userData"), dateKey, id);
});
ipcMain.handle("copy-text", (event, text) => {
  requireTrustedWindow(event);
  clipboard.writeText(String(text || ""));
  return true;
});

ipcMain.handle("clipboard-write-files", (event, paths) => {
  requireTrustedWindow(event);
  return clipboardFiles.writeFiles(paths || []);
});
ipcMain.handle("clipboard-read-files", (event) => {
  requireTrustedWindow(event);
  return clipboardFiles.readFiles();
});

ipcMain.handle("prepare-file-drag", async (event) => {
  const win = requireTrustedWindow(event);
  try {
    return Boolean(await prepareWindowForFileDrag(win));
  } catch (err) {
    console.error("prepare-file-drag", err);
    return false;
  }
});

ipcMain.on("cancel-file-drag-prepare", (event) => {
  const win = requireTrustedWindow(event);
  cancelPreparedFileDrag(win);
});

/** Official Electron startDrag — must run inside Chromium dragstart (sendSync). */
ipcMain.on("start-file-drag-electron", (event, paths) => {
  const win = requireTrustedWindow(event);
  // Expand .lnk → real targets (WeChat/IM often reject shortcut files).
  const files = clipboardFiles.normalizeDragPaths(paths || []);
  if (!files.length) {
    event.returnValue = false;
    return;
  }
  fileDragArmed = true;
  fileDragInFlight = true;
  try {
    if (win && !win.isDestroyed()) {
      prepareWindowForFileDragSync(win);
      // In-flight: click-through + HWND_BOTTOM so Explorer/WeChat receive DragEnter.
      // (ignore=false here covers the whole display and blocks Explorer drops.)
      applyFileDragMouseMode(win);
    }
    const iconPath = ensureDragIconPath();
    let icon = iconPath || dragIcon;
    // startDrag blocks until the user drops or cancels.
    if (files.length === 1) event.sender.startDrag({ file: files[0], icon });
    else event.sender.startDrag({ files, icon });
    event.returnValue = true;
  } catch (err) {
    console.error("start-file-drag-electron", err);
    event.returnValue = false;
  } finally {
    fileDragInFlight = false;
    fileDragArmed = false;
    if (win && !win.isDestroyed()) {
      restoreWindowAfterFileDrag(win);
      applyFileDragMouseMode(win);
    }
  }
});

/** OLE file drag — primary path for overlay → Explorer / other apps. */
ipcMain.handle("start-file-drag", async (event, paths) => {
  const win = requireTrustedWindow(event);
  const files = clipboardFiles.normalizeDragPaths(paths || []);
  if (!files.length) {
    return { ok: false, message: "沒有可拖放的檔案" };
  }
  fileDragArmed = true;
  fileDragInFlight = false;
  try {
    if (win && !win.isDestroyed()) {
      prepareWindowForFileDragSync(win);
      win.setBackgroundColor("#01000000");
      // Armed: ignore=false so GetAsyncKeyState still sees LBUTTON.
      applyFileDragMouseMode(win);
    }
    const ole = await startOleFileDrag(files, {
      onArmed: () => {
        // Daemon confirmed LBUTTON — now click-through so Explorer/WeChat get DragEnter.
        fileDragInFlight = true;
        if (win && !win.isDestroyed()) applyFileDragMouseMode(win);
      }
    });
    return {
      ok: Boolean(ole.ok),
      message: ole.message || (ole.ok ? "拖放完成" : "拖放失敗"),
      via: "ole"
    };
  } catch (err) {
    console.error("start-file-drag", err);
    return { ok: false, message: err.message || "拖放失敗" };
  } finally {
    fileDragInFlight = false;
    fileDragArmed = false;
    if (win && !win.isDestroyed()) {
      restoreWindowAfterFileDrag(win);
      applyFileDragMouseMode(win);
    }
  }
});

ipcMain.handle("list-desktop-shortcuts", (event, options) => {
  requireTrustedWindow(event);
  return listDesktopShortcuts(resolveDesktop(), options || { decorate: "fast" });
});
ipcMain.handle("list-desktop-files", async (event) => {
  requireTrustedWindow(event);
  const dir = resolveDesktop();
  if (!dir) return { items: [], total: 0, root: "" };
  const listing = await listFolder(dir, { systemIcons: "fast" });
  // Attach .lnk targets (sync, no PowerShell) for OS drag / WeChat drops / Ctrl+dblclick tabs.
  for (const item of listing.items || []) {
    if (!item?.path || !/\.lnk$/i.test(item.path)) continue;
    const target = clipboardFiles.resolveShortcutTarget(item.path);
    if (!target) continue;
    item.targetPath = target;
    try {
      item.targetIsDirectory = fs.statSync(target).isDirectory();
    } catch {
      item.targetIsDirectory = false;
    }
  }
  return listing;
});
ipcMain.handle("get-file-tags", (event) => {
  requireTrustedWindow(event);
  return fileOps.MACOS_TAGS.map((tag) => ({ ...tag }));
});

ipcMain.handle("create-folder", async (event, parent, folderName) => {
  requireTrustedWindow(event);
  requireApprovedPath(parent);
  return fileOps.createFolder(parent, folderName);
});
ipcMain.handle("rename-item", async (event, target, name) => {
  requireTrustedWindow(event);
  requireApprovedPath(target);
  return fileOps.renameItem(target, name);
});
ipcMain.handle("trash-item", async (event, target) => {
  const win = requireTrustedWindow(event);
  requireApprovedPath(target);
  return fileOps.trashItem(target, win, settings?.locale || "de");
});
ipcMain.handle("set-item-tags", async (event, target, tags) => {
  requireTrustedWindow(event);
  requireApprovedPath(target);
  const next = await fileOps.writeTags(target, tags);
  return { ok: true, tags: next, path: target };
});

function explorerExe() {
  return path.join(process.env.SystemRoot || "C:\\Windows", "explorer.exe");
}

/** Fallback open when shell.openPath fails (rare Unicode / association edge cases). */
function invokeItem(targetPath) {
  const literal = String(targetPath).replace(/'/g, "''");
  return new Promise((resolve) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-WindowStyle",
        "Hidden",
        "-Command",
        `[Console]::OutputEncoding = [Text.Encoding]::UTF8; Invoke-Item -LiteralPath '${literal}'`
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
    );
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += String(chunk);
    });
    child.on("exit", (code) => {
      resolve({ ok: code === 0, message: err.trim() });
    });
    child.on("error", (e) => {
      resolve({ ok: false, message: e.message || "Invoke-Item failed" });
    });
  });
}

function pinAllOverlaysBottom({ blur = true } = {}) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win || win.isDestroyed()) continue;
    // blur() while the cursor is over the taskbar fights Explorer and can freeze the UI.
    if (blur) {
      try {
        win.blur();
      } catch {
        // ignore
      }
    }
    pinWindowBottom(win, { force: true }).catch(() => {});
  }
}

/** Soft re-pin (no blur) — safe for dock keepalive while hovering the taskbar. */
ipcMain.handle("pin-overlays-bottom", (event, opts = {}) => {
  requireTrustedWindow(event);
  pinAllOverlaysBottom({ blur: opts?.blur !== false && opts?.soft !== true });
  return { ok: true };
});

ipcMain.handle("pin-overlays-bottom-soft", (event) => {
  requireTrustedWindow(event);
  pinAllOverlaysBottom({ blur: false });
  return { ok: true };
});

ipcMain.handle("open-path", async (event, target) => {
  requireTrustedWindow(event);
  if (!target) return { ok: false, message: "空路徑" };
  let value = String(target).trim();
  if (!value) return { ok: false, message: "空路徑" };
  fileDragArmed = false;
  fileDragInFlight = false;
  allowForeground();
  const win = getSenderWindow(event);
  // Click raised the overlay in z-order — pin every display back to HWND_BOTTOM
  // and click-through so Explorer / apps can take the foreground.
  pinAllOverlaysBottom();
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w || w.isDestroyed()) continue;
    try {
      w.setIgnoreMouseEvents(true, { forward: true });
    } catch {
      // ignore
    }
  }
  console.log("[edex] open-path", value);
  try {
    if (/^shell:/i.test(value) || value.includes("::{") || value.startsWith("::")) {
      spawn(explorerExe(), [value], { detached: true, stdio: "ignore" }).unref();
      setTimeout(() => {
        allowForeground();
        pinAllOverlaysBottom();
      }, 200);
      return { ok: true, path: value };
    }
    if (/\.lnk$/i.test(value)) {
      const dest = clipboardFiles.resolveShortcutTarget(value);
      if (dest) value = dest;
    }
    const resolved = path.resolve(value);
    if (!fs.existsSync(resolved)) {
      return { ok: false, message: `路徑不存在：${resolved}`, path: resolved };
    }
    const isDir = fs.statSync(resolved).isDirectory();
    // ShellExecute first — no PowerShell cold start. Invoke-Item only as fallback.
    let shellErr = "";
    try {
      shellErr = await shell.openPath(resolved);
    } catch (e) {
      shellErr = e?.message || "shell.openPath failed";
    }
    if (shellErr) {
      const invoked = await invokeItem(resolved);
      if (!invoked.ok) {
        console.error("open-path fallback", shellErr || invoked.message);
        return { ok: false, message: shellErr || invoked.message || "開啟失敗", path: resolved };
      }
    }
    allowForeground();
    pinAllOverlaysBottom();
    // Raise Explorer in background via warm z-order daemon (does not block open).
    if (isDir) {
      raiseExplorerPath(resolved).catch(() => {});
      setTimeout(() => {
        allowForeground();
        pinAllOverlaysBottom();
      }, 280);
    }
    console.log("[edex] open-path ok", resolved, isDir ? "(dir)" : "(file)");
    return { ok: true, path: resolved, isDirectory: isDir };
  } catch (err) {
    console.error("open-path", err);
    return { ok: false, message: err.message || "開啟失敗" };
  } finally {
    setTimeout(() => {
      pinAllOverlaysBottom();
      if (fileDragInFlight || isFileDragActive() || fileDragArmed) {
        if (win && !win.isDestroyed()) applyFileDragMouseMode(win);
        return;
      }
      // open-path temporarily makes every overlay click-through so Explorer
      // can take focus. Restore hit-testing afterwards for the next click.
      for (const overlay of BrowserWindow.getAllWindows()) {
        if (!overlay || overlay.isDestroyed()) continue;
        try {
          overlay.setIgnoreMouseEvents(false, { forward: true });
        } catch {
          // ignore destroyed windows during shutdown
        }
      }
    }, 400);
  }
});

ipcMain.handle("pick-program", async (event) => {
  requireTrustedWindow(event);
  const win = getSenderWindow(event);
  const result = await dialog.showOpenDialog(win, {
    title: "Programm zum Einbetten auswählen",
    properties: ["openFile"],
    filters: [
      { name: systemText("Programm/Verknüpfung", "Program/shortcut", "程式／捷徑"), extensions: ["exe", "lnk", "bat", "cmd", "msc"] },
      { name: systemText("Alle Dateien", "All files", "所有檔案"), extensions: ["*"] }
    ]
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  const filePath = result.filePaths[0];
  const resolved = await win32Embed.resolveShortcut(filePath);
  return {
    path: filePath,
    targetPath: resolved.path || filePath,
    name: path.basename(filePath, path.extname(filePath)),
    args: resolved.args || ""
  };

});

ipcMain.handle("open-in-vscode", async (event, target) => {
  requireTrustedWindow(event);
  const value = String(target || "").trim();
  if (!value) return { ok: false, message: "Kein Pfad angegeben" };
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved)) {
    return { ok: false, message: `Pfad nicht gefunden: ${resolved}` };
  }

  return new Promise((resolve) => {
    const child = spawn("code", ["--reuse-window", resolved], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.once("error", (error) => {
      resolve({
        ok: false,
        message: error.code === "ENOENT"
          ? "VS Code CLI 'code' wurde nicht gefunden. Bitte VS Code zum PATH hinzufügen."
          : error.message || "VS Code konnte nicht gestartet werden"
      });
    });
    child.once("spawn", () => {
      child.unref();
      resolve({ ok: true, path: resolved });
    });
  });
});

ipcMain.handle("get-taskbar-metrics", async (event) => {
  const win = requireTrustedWindow(event);
  const display = findDisplay(getWindowDisplayId(win));
  try {
    return await taskbarDock.getTaskbarMetricsForWindow(win, display);
  } catch (err) {
    console.error("get-taskbar-metrics", err);
    return null;
  }
});

ipcMain.handle("list-taskbar-pinned", async (event) => {
  requireTrustedWindow(event);
  try {
    const items = await taskbarDock.listTaskbarPinnedApps();
    console.log("list-taskbar-pinned", {
      directory: taskbarDock.taskbarPinsDir(),
      files: taskbarDock.countTaskbarPinsSync(),
      items: items.length
    });
    return { items, error: "" };
  } catch (err) {
    console.error("list-taskbar-pinned", err);
    return { items: [], error: err?.message || String(err) };
  }
});

ipcMain.handle("list-autostart-items", async (event) => {
  requireTrustedWindow(event);
  try {
    return { items: await listAutostartItems() };
  } catch (err) {
    console.error("list-autostart-items", err);
    return { items: [] };
  }
});

ipcMain.handle("get-path-icon", async (event, target) => {
  requireTrustedWindow(event);
  const dataUrl = await taskbarDock.iconForPath(target);
  return { dataUrl: dataUrl || "" };
});

ipcMain.handle("list-pinned-programs", async (event) => {
  requireTrustedWindow(event);
  const list = Array.isArray(settings?.pinnedPrograms) ? settings.pinnedPrograms : [];
  const items = [];
  for (const item of list) {
    if (!item?.path) continue;
    let iconDataUrl = item.iconDataUrl || "";
    if (!iconDataUrl) iconDataUrl = await taskbarDock.iconForPath(item.path);
    items.push({
      id: String(item.id || item.path),
      name: String(item.name || path.basename(String(item.path))).trim(),
      path: String(item.path),
      iconDataUrl,
      source: item.source || "user"
    });
  }
  return { items };
});

ipcMain.handle("save-pinned-programs", async (event, items) => {
  requireTrustedWindow(event);
  const next = [];
  if (Array.isArray(items)) {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item?.path) continue;
      const target = String(item.path);
      let iconDataUrl = item.iconDataUrl || "";
      if (!iconDataUrl) iconDataUrl = await taskbarDock.iconForPath(target);
      next.push({
        id: String(item.id || `pin${Date.now()}_${index}`),
        name: String(item.name || path.basename(target)).trim(),
        path: target,
        iconDataUrl,
        source: item.source || "user"
      });
    }
  }
  settings = saveSettings(app.getPath("userData"), { pinnedPrograms: next });
  {
    const themeName = resolveThemeName(settings.theme || "tron");
    broadcast("settings-updated", {
      settings,
      theme: loadTheme(themeName),
      themeName,
      displays: listDisplays()
    });
  }
  return { items: next };
});

ipcMain.handle("list-embed-windows", async (event) => {
  requireTrustedWindow(event);
  const items = await win32Embed.listTopWindows(50);
  return { items };
});

ipcMain.handle("list-taskbar-windows", async (event) => {
  requireTrustedWindow(event);
  const ownPids = new Set(process.platform === "win32" ? [process.pid] : []);
  const ownHwnds = new Set([...windows.values()]
    .filter((window) => window && !window.isDestroyed())
    .map((window) => win32Embed.hwndFromBuffer(window.getNativeWindowHandle())));
  const items = (await win32Embed.listTaskbarWindows(100))
    .filter((item) => !ownPids.has(Number(item.pid)))
    .filter((item) => !ownHwnds.has(String(item.hwnd)));
  return { items, foreground: await win32Embed.foregroundWindow() };
});

ipcMain.handle("activate-taskbar-window", async (event, hwnd) => {
  requireTrustedWindow(event);
  return { ok: await win32Embed.activateWindow(hwnd) };
});

ipcMain.handle("minimize-taskbar-window", async (event, hwnd) => {
  requireTrustedWindow(event);
  return { ok: await win32Embed.minimizeWindow(hwnd) };
});

function parentHwndOf(event) {
  const win = getSenderWindow(event);
  if (!win || win.isDestroyed()) return "";
  return win32Embed.hwndFromBuffer(win.getNativeWindowHandle());
}

function resolveEmbedZone(payload = {}) {
  if (payload.zone === "edge" || payload.zone === "workspace") return payload.zone;
  return settings.windowZoneEnabled !== false ? "workspace" : "edge";
}

/** Map renderer CSS host rect → physical screen pixels for docking. */
function mapCssBoundsToScreen(event, bounds = {}, zone = "workspace") {
  const win = getSenderWindow(event);
  if (!win || win.isDestroyed()) {
    return {
      x: Math.round(Number(bounds.x) || 0),
      y: Math.round(Number(bounds.y) || 0),
      w: Math.max(40, Math.round(Number(bounds.w) || 400)),
      h: Math.max(40, Math.round(Number(bounds.h) || 300))
    };
  }
  const zoom = win.webContents.getZoomFactor() || 1;
  const content = win.getContentBounds();
  const display = screen.getDisplayMatching(win.getBounds());
  const primaryDisplay = screen.getPrimaryDisplay();
  let cssX = Number(bounds.x) || 0;
  let cssY = Number(bounds.y) || 0;
  let cssW = Math.max(40, Number(bounds.w) || 400);
  let cssH = Math.max(40, Number(bounds.h) || 300);
  if (zone === "workspace" && settings.windowZoneEnabled !== false) {
    const margins = settings.windowZoneMargins || {};
    const physicalSize = (item) => ({
      width: Math.round(item.bounds.width * (item.scaleFactor || 1)),
      height: Math.round(item.bounds.height * (item.scaleFactor || 1))
    });
    const currentPhysical = physicalSize(display);
    const primaryPhysical = physicalSize(primaryDisplay);
    const currentShort = Math.min(currentPhysical.width, currentPhysical.height);
    const currentLong = Math.max(currentPhysical.width, currentPhysical.height);
    const primaryShort = Math.min(primaryPhysical.width, primaryPhysical.height);
    const primaryLong = Math.max(primaryPhysical.width, primaryPhysical.height);
    const fitScale = primaryShort > 4 && primaryLong > 4
      ? Math.min(currentShort / primaryShort, currentLong / primaryLong)
      : 1;
    const grid = Math.max(4, Math.round(
      Math.max(12, Math.min(96, Math.round(Number(settings.gridSize) || 32)))
      * Math.min(1, Math.max(0.1, fitScale))
    ));
    const cssWidth = content.width / zoom;
    const cssHeight = content.height / zoom;
    const raster = (value) => Math.max(0, Math.min(45, Math.round(Number(value) || 0)));
    const percent = (value) => Math.max(0, Math.min(45, Number(value) || 0));
    const marginPixels = (value, span) => settings.windowZoneUnit === "raster"
      ? raster(value) * grid
      : span * percent(value) / 100;
    const gridWidth = Math.floor(cssWidth / grid) * grid;
    const gridHeight = Math.floor(cssHeight / grid) * grid;
    const left = marginPixels(margins.left, cssWidth);
    const top = marginPixels(margins.top, cssHeight);
    const right = settings.windowZoneUnit === "raster"
      ? gridWidth - marginPixels(margins.right, cssWidth)
      : cssWidth - marginPixels(margins.right, cssWidth);
    const bottom = settings.windowZoneUnit === "raster"
      ? gridHeight - marginPixels(margins.bottom, cssHeight)
      : cssHeight - marginPixels(margins.bottom, cssHeight);
    const zoneWidth = Math.max(40, right - left);
    const zoneHeight = Math.max(40, bottom - top);
    cssW = Math.min(cssW, zoneWidth);
    cssH = Math.min(cssH, zoneHeight);
    cssX = Math.max(left, Math.min(cssX, right - cssW));
    cssY = Math.max(top, Math.min(cssY, bottom - cssH));
  }
  const dipRect = {
    x: Math.round(content.x + cssX * zoom),
    y: Math.round(content.y + cssY * zoom),
    width: Math.max(40, Math.round(cssW * zoom)),
    height: Math.max(40, Math.round(cssH * zoom))
  };
  try {
    const physical = screen.dipToScreenRect(display, dipRect);
    return {
      x: Math.round(physical.x),
      y: Math.round(physical.y),
      w: Math.max(40, Math.round(physical.width)),
      h: Math.max(40, Math.round(physical.height))
    };
  } catch {
    const sf = display?.scaleFactor || 1;
    return {
      x: Math.round(dipRect.x * sf),
      y: Math.round(dipRect.y * sf),
      w: Math.max(40, Math.round(dipRect.width * sf)),
      h: Math.max(40, Math.round(dipRect.height * sf))
    };
  }
}

ipcMain.handle("embed-launch", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const requestedPath = String(payload.path || "").trim();
  if (!requestedPath) throw new Error("未指定程式");
  const appPath = path.resolve(requestedPath);
  if (!fs.existsSync(appPath) || !/\.(exe|lnk)$/i.test(appPath)) {
    throw new Error("只允許存在的 .exe 或 .lnk 程式");
  }
  const screenBounds = mapCssBoundsToScreen(event, payload.bounds || {}, resolveEmbedZone(payload));
  return win32Embed.launchAndDock(appPath, screenBounds, {
    timeoutMs: Number(payload.timeoutMs) || 15000,
    hostHwnd: parentHwndOf(event),
    processName: String(payload.processName || "")
  });
});

ipcMain.handle("embed-file-browser", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const explorerPath = path.join(process.env.WINDIR || "C:\\Windows", "explorer.exe");
  if (!fs.existsSync(explorerPath)) throw new Error("Windows-Datei-Explorer wurde nicht gefunden");
  const target = String(payload.target || "").trim();
  if (!target) throw new Error("Kein Datei-Browser-Ziel angegeben");
  const screenBounds = mapCssBoundsToScreen(event, payload.bounds || {}, resolveEmbedZone({ ...payload, kind: "fileBrowser" }));
  return win32Embed.launchAndDock(explorerPath, screenBounds, {
    timeoutMs: 15000,
    hostHwnd: parentHwndOf(event),
    args: ["/n,", "/e,", target],
    processName: "explorer.exe"
  });
});

ipcMain.handle("embed-attach", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const childHwnd = String(payload.hwnd || "").trim();
  if (!childHwnd) throw new Error("視窗無效");
  const screenBounds = mapCssBoundsToScreen(event, payload.bounds || {}, resolveEmbedZone(payload));
  const ok = await win32Embed.dockWindow(
    childHwnd,
    parentHwndOf(event),
    screenBounds.x,
    screenBounds.y,
    screenBounds.w,
    screenBounds.h
  );
  if (!ok) throw new Error("對齊視窗失敗");
  return { ok: true, hwnd: childHwnd, pid: Number(payload.pid) || 0 };
});

ipcMain.handle("embed-bounds", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const childHwnd = String(payload.hwnd || "").trim();
  if (!childHwnd) return { ok: false };
  const screenBounds = mapCssBoundsToScreen(event, payload.bounds || {}, resolveEmbedZone(payload));
  const ok = await win32Embed.setDockBounds(
    childHwnd,
    parentHwndOf(event),
    screenBounds.x,
    screenBounds.y,
    screenBounds.w,
    screenBounds.h
  );
  return { ok };
});

ipcMain.handle("embed-release", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const childHwnd = String(payload?.hwnd || "").trim();
  if (!childHwnd) return { ok: false };
  const ok = await win32Embed.releaseEmbed(childHwnd);
  return { ok };
});

ipcMain.handle("embed-focus", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const childHwnd = String(payload?.hwnd || "").trim();
  if (!childHwnd) return { ok: false };
  const ok = await win32Embed.focusDock(childHwnd);
  return { ok };
});

ipcMain.handle("embed-capture", async (event, payload = {}) => {
  requireTrustedWindow(event);
  const childHwnd = String(payload?.hwnd || "").trim();
  if (!childHwnd) return { ok: false, dataUrl: "" };
  const w = Math.max(80, Math.min(1400, Math.round(Number(payload.w) || 640)));
  const h = Math.max(60, Math.min(1000, Math.round(Number(payload.h) || 420)));
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: w, height: h },
      fetchWindowIcons: false
    });
    const match = sources.find((src) => {
      const id = String(src.id || "");
      return id === `window:${childHwnd}:0`
        || id.startsWith(`window:${childHwnd}:`)
        || id.includes(`:${childHwnd}:`);
    });
    const thumb = match?.thumbnail;
    if (thumb && !thumb.isEmpty()) {
      const dataUrl = thumb.toDataURL();
      if (dataUrl && dataUrl.length > 64) return { ok: true, dataUrl };
    }
  } catch { /* fallback below */ }
  const dataUrl = await win32Embed.captureWindowPng(childHwnd, w, h);
  return { ok: Boolean(dataUrl), dataUrl: dataUrl || "" };
});

ipcMain.handle("refit-display", (event) => {
  const win = requireTrustedWindow(event);
  const displayId = getWindowDisplayId(win);
  const display = findDisplay(displayId);
  fitWindowToDisplay(win, display);
  return {
    bounds: display.bounds,
    scaleFactor: display.scaleFactor || 1,
    physicalSize: {
      width: Math.round(display.bounds.width * (display.scaleFactor || 1)),
      height: Math.round(display.bounds.height * (display.scaleFactor || 1))
    }
  };
});

ipcMain.handle("quit-app", (event) => {
  requireTrustedWindow(event);
  app.quit();
  return true;
});

ipcMain.on("set-file-drag-armed", (event, armed) => {
  requireTrustedWindow(event);
  fileDragArmed = Boolean(armed);
  if (!armed) fileDragInFlight = false;
  applyFileDragMouseMode(getSenderWindow(event));
});

ipcMain.on("set-mouse-ignore", (event, ignore) => {
  const win = requireTrustedWindow(event);
  // Armed / in-flight modes own hit-testing — don't let hover logic override.
  if (fileDragInFlight || isFileDragActive() || fileDragArmed) {
    applyFileDragMouseMode(win);
    return;
  }
  // Only toggle hit-testing — never pinAndKeepBounds here (setBounds on every
  // hover-enter made holding/dragging file icons feel extremely stuttery).
  win.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});

/** Screen cursor → renderer CSS client coords (works even while click-through). */
ipcMain.on("get-cursor-client-point", (event) => {
  const win = requireTrustedWindow(event);
  try {
    const pt = screen.getCursorScreenPoint();
    const bounds = win.getContentBounds();
    const zoom = win.webContents.getZoomFactor() || 1;
    event.returnValue = {
      x: (pt.x - bounds.x) / zoom,
      y: (pt.y - bounds.y) / zoom
    };
  } catch {
    event.returnValue = null;
  }
});

ipcMain.handle("get-net-status", async (event) => {
  requireTrustedWindow(event);
  return getNetStatus();
});
ipcMain.handle("get-live-connections", async (event) => {
  requireTrustedWindow(event);
  return getLiveConnections();
});
ipcMain.handle("get-net-traffic", async (event) => {
  requireTrustedWindow(event);
  return getTrafficSample();
});
ipcMain.handle("get-cpu-metrics", (event) => {
  requireTrustedWindow(event);
  return getCpuMetrics();
});
ipcMain.handle("get-mem-metrics", (event) => {
  requireTrustedWindow(event);
  return getMemMetrics();
});
ipcMain.handle("get-sys-metrics", (event) => {
  requireTrustedWindow(event);
  return getSysMetrics();
});
ipcMain.handle("get-hardware-info", async (event) => {
  requireTrustedWindow(event);
  return getHardwareInfo();
});
ipcMain.handle("scan-hardware-prerequisites", (event) => {
  requireTrustedWindow(event);
  return hardwareMonitor.getSnapshot("scan");
});
ipcMain.handle("get-hardware-sensor-data", (event) => {
  requireTrustedWindow(event);
  return hardwareMonitor.getSnapshot();
});
ipcMain.handle("get-top-processes", async (event) => {
  requireTrustedWindow(event);
  return getTopProcesses();
});

const BOOT_COMPONENTS = [
  ["bockis-core", "main.js"],
  ["bockis-preload", "preload.js"],
  ["hud-renderer", "src/renderer.js"],
  ["edex-effects", "src/edex-effects.js"],
  ["i18n-bridge", "src/i18n.js"],
  ["cockpit-panel", "src/panels/cockpit-panel.js"],
  ["cpu-rail-panel", "src/panels/cpu-rail-panel.js"],
  ["dock-panel", "src/renderer/dock.js"],
  ["net-monitor", "lib/net-info.js"],
  ["fs-organizer", "lib/organizer.js"],
  ["theme-engine", "lib/themes.js"],
  ["node-pty", "node_modules/node-pty/package.json", true],
  ["xterm", "node_modules/@xterm/xterm/package.json", true],
  ["xterm-addon-fit", "node_modules/@xterm/addon-fit/package.json", true]
];

async function describeBootComponent([name, relPath, readVersion]) {
  try {
    const data = await fs.promises.readFile(path.join(__dirname, relPath));
    let version = "";
    if (readVersion) {
      try { version = String(JSON.parse(data.toString("utf8")).version || ""); } catch { /* version stays empty */ }
    }
    return { name, version, ok: true, size: data.length, sha: crypto.createHash("sha256").update(data).digest("hex").slice(0, 8) };
  } catch {
    return { name, version: "", ok: false, size: 0, sha: "" };
  }
}

function queryBootSystem() {
  const script = "$g=Get-CimInstance Win32_VideoController|Select-Object -First 1;$b=Get-CimInstance Win32_BIOS;$o=Get-CimInstance Win32_OperatingSystem;"
    + "@{gpu=$g.Name;driver=$g.DriverVersion;vram=[int64]$g.AdapterRAM;bios=$b.Manufacturer;biosVersion=$b.SMBIOSBIOSVersion;os=$o.Caption;build=$o.BuildNumber}|ConvertTo-Json -Compress";
  return new Promise((resolve) => {
    execFile("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      if (error) return resolve({});
      try { resolve(JSON.parse(String(stdout).trim()) || {}); } catch { resolve({}); }
    });
  });
}

ipcMain.handle("get-boot-diagnostics", async (event) => {
  requireTrustedWindow(event);
  const system32 = path.join(process.env.SystemRoot || "C:\\Windows", "System32");
  const build = Number(String(os.release()).split(".").pop()) || 0;
  let userDataWritable = true;
  try { fs.accessSync(app.getPath("userData"), fs.constants.W_OK); } catch { userDataWritable = false; }

  const [system, packages] = await Promise.all([
    queryBootSystem(),
    Promise.all(BOOT_COMPONENTS.map(describeBootComponent))
  ]);

  return {
    versions: { app: APP_VERSION, electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
    system: {
      hostname: os.hostname(),
      arch: os.arch(),
      kernel: os.release(),
      build: system.build || String(build),
      os: system.os || `Windows ${os.release()}`,
      gpu: system.gpu || "",
      gpuDriver: system.driver || "",
      vram: Number(system.vram) || 0,
      bios: system.bios ? `${system.bios} ${system.biosVersion || ""}`.trim() : "",
      uptime: os.uptime()
    },
    deps: [
      { id: "arch", label: "Windows x64", ok: process.arch === "x64" || os.arch() === "x64" },
      { id: "conpty", label: `ConPTY build ${build}`, ok: build >= 17763 },
      { id: "powershell", label: "Windows PowerShell", ok: fs.existsSync(path.join(system32, "WindowsPowerShell", "v1.0", "powershell.exe")) },
      { id: "vcruntime", label: "Visual C++ runtime", ok: fs.existsSync(path.join(system32, "VCRUNTIME140.dll")) && fs.existsSync(path.join(system32, "VCRUNTIME140_1.dll")) },
      { id: "node-pty", label: "node-pty native module", ok: Boolean(nodePty) },
      { id: "userdata", label: "User data directory writable", ok: userDataWritable }
    ],
    packages
  };
});
ipcMain.handle("get-weather", async (event, location) => {
  requireTrustedWindow(event);
  return getWeather(location);
});
ipcMain.handle("get-globe-grid", (event) => {
  requireTrustedWindow(event);
  try {
    return loadGlobeGrid();
  } catch (err) {
    console.error("globe grid", err);
    return { tiles: [] };
  }
});
