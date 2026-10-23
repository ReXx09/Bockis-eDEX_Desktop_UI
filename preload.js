const { contextBridge, ipcRenderer, webUtils } = require("electron");

function argValue(prefix) {
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const displayId = Number(argValue("--edex-display-id=") || 0);
const displayIndex = Number(argValue("--edex-display-index=") || 0);
const isPrimary = argValue("--edex-primary=") === "1";
const launchWidth = Number(argValue("--edex-width=") || 0);
const launchHeight = Number(argValue("--edex-height=") || 0);
const launchScale = Number(argValue("--edex-scale=") || 1);

contextBridge.exposeInMainWorld("edex", {
  displayId,
  displayIndex,
  isPrimary,
  launchWidth,
  launchHeight,
  launchScale,
  bootstrap: () => ipcRenderer.invoke("get-bootstrap"),
  getWindowsColors: () => ipcRenderer.invoke("get-windows-colors"),
  applyWindowsTheme: (payload) => ipcRenderer.invoke("apply-windows-theme", payload || {}),
  getStartWithWindows: () => ipcRenderer.invoke("get-start-with-windows"),
  setStartWithWindows: (enabled) => ipcRenderer.invoke("set-start-with-windows", Boolean(enabled)),
  logAction: (event, message, details) => ipcRenderer.send("ui-log", { level: "info", event, message, details }),
  logError: (event, message, details) => ipcRenderer.send("ui-log", { level: "error", event, message, details }),
  getAppLog: (limit) => ipcRenderer.invoke("get-app-log", limit),
  saveSettings: (patch) => ipcRenderer.invoke("save-settings", patch),
  saveDisplayLayout: (layout) => ipcRenderer.invoke("save-display-layout", layout),
  raiseOverlay: () => ipcRenderer.invoke("raise-overlay"),
  transferWidget: (targetDisplayId, widget) =>
    ipcRenderer.invoke("transfer-widget", { targetDisplayId, widget }),
  getTheme: (name) => ipcRenderer.invoke("get-theme", name),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  pickWindowsWallpaper: () => ipcRenderer.invoke("pick-windows-wallpaper"),
  scan: (root) => ipcRenderer.invoke("scan", root),
  listFolder: (root, options) => ipcRenderer.invoke("list-folder", root, options || {}),
  listDesktopShortcuts: (options) => ipcRenderer.invoke("list-desktop-shortcuts", options),
  listDesktopFiles: () => ipcRenderer.invoke("list-desktop-files"),
  getFileTags: () => ipcRenderer.invoke("get-file-tags"),
  listDrives: () => ipcRenderer.invoke("list-drives"),
	runTerminalCommand: (command, cwd) => ipcRenderer.invoke("terminal-run", command, cwd),
  createTerminal: (paneId, cwd, shellType, options) => ipcRenderer.invoke("terminal-create", paneId, cwd, shellType, options),
  writeTerminal: (paneId, data) => ipcRenderer.send("terminal-input", paneId, data),
  changeTerminalDirectory: (paneId, target) => ipcRenderer.send("terminal-cd", paneId, target),
  listRemoteTerminalFolder: (paneId, target) => ipcRenderer.invoke("terminal-list-remote", paneId, target),
  openAdminTerminal: (cwd) => ipcRenderer.invoke("terminal-admin", cwd),
  resizeTerminal: (paneId, cols, rows) => ipcRenderer.send("terminal-resize", paneId, cols, rows),
  closeTerminal: (paneId) => ipcRenderer.send("terminal-close", paneId),
  onTerminalData: (fn) => ipcRenderer.on("terminal-data", (_event, payload) => fn(payload)),
  onTerminalCwd: (fn) => ipcRenderer.on("terminal-cwd", (_event, payload) => fn(payload)),
  onTerminalExit: (fn) => ipcRenderer.on("terminal-exit", (_event, payload) => fn(payload)),
  searchFiles: (query, limit) => ipcRenderer.invoke("search-files", query, limit),
  searchStatus: () => ipcRenderer.invoke("search-status"),
  searchRebuild: () => ipcRenderer.invoke("search-rebuild"),
  pickSearchRoot: () => ipcRenderer.invoke("pick-search-root"),
  addSearchRoot: (target) => ipcRenderer.invoke("add-search-root", target),
  removeSearchRoot: (target) => ipcRenderer.invoke("remove-search-root", target),
  setSearchLocal: (enabled) => ipcRenderer.invoke("set-search-local", enabled),
  revealPath: (target) => ipcRenderer.invoke("reveal-path", target),
  openInVsCode: (target) => ipcRenderer.invoke("open-in-vscode", target),
  plan: (scan, options) => ipcRenderer.invoke("plan", scan, options),
  organize: (scan, options) => ipcRenderer.invoke("organize", scan, options),
  undo: () => ipcRenderer.invoke("undo"),
  importFiles: (dest, files) => ipcRenderer.invoke("import-files", dest, files),
  readFilePreview: (target) => ipcRenderer.invoke("read-file-preview", target),
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return file?.path || "";
    }
  },
  getCalendarNotes: () => ipcRenderer.invoke("get-calendar-notes"),
  addCalendarNote: (dateKey, text) => ipcRenderer.invoke("add-calendar-note", dateKey, text),
  updateCalendarNote: (dateKey, id, text) => ipcRenderer.invoke("update-calendar-note", dateKey, id, text),
  removeCalendarNote: (dateKey, id) => ipcRenderer.invoke("remove-calendar-note", dateKey, id),
  copyText: (text) => ipcRenderer.invoke("copy-text", text),
  clipboardWriteFiles: (paths) => ipcRenderer.invoke("clipboard-write-files", paths),
  clipboardReadFiles: () => ipcRenderer.invoke("clipboard-read-files"),
  prepareFileDrag: () => ipcRenderer.invoke("prepare-file-drag"),
  cancelFileDragPrepare: () => ipcRenderer.send("cancel-file-drag-prepare"),
  /** Async OLE file drag fallback. Call while primary button is still down. */
  startFileDrag: (paths) => ipcRenderer.invoke("start-file-drag", paths),
  /** Official Electron startDrag — MUST be sync from inside dragstart. */
  startFileDragElectron: (paths) => {
    try {
      return Boolean(ipcRenderer.sendSync("start-file-drag-electron", paths));
    } catch {
      return false;
    }
  },
  setFileDragArmed: (armed) => ipcRenderer.send("set-file-drag-armed", Boolean(armed)),
  createFolder: (parent, folderName) => ipcRenderer.invoke("create-folder", parent, folderName),
  renameItem: (target, name) => ipcRenderer.invoke("rename-item", target, name),
  trashItem: (target) => ipcRenderer.invoke("trash-item", target),
  setItemTags: (target, tags) => ipcRenderer.invoke("set-item-tags", target, tags),
  openPath: (target) => ipcRenderer.invoke("open-path", target),
  pickProgram: () => ipcRenderer.invoke("pick-program"),
  getTaskbarMetrics: () => ipcRenderer.invoke("get-taskbar-metrics"),
  pinOverlaysBottom: (opts) => ipcRenderer.invoke("pin-overlays-bottom", opts || {}),
  pinOverlaysBottomSoft: () => ipcRenderer.invoke("pin-overlays-bottom-soft"),
  listTaskbarPinned: () => ipcRenderer.invoke("list-taskbar-pinned"),
  listAutostartItems: () => ipcRenderer.invoke("list-autostart-items"),
  getPathIcon: (target) => ipcRenderer.invoke("get-path-icon", target),
  listPinnedPrograms: () => ipcRenderer.invoke("list-pinned-programs"),
  savePinnedPrograms: (items) => ipcRenderer.invoke("save-pinned-programs", items),
  listEmbedWindows: () => ipcRenderer.invoke("list-embed-windows"),
  listTaskbarWindows: () => ipcRenderer.invoke("list-taskbar-windows"),
  activateTaskbarWindow: (hwnd) => ipcRenderer.invoke("activate-taskbar-window", hwnd),
  minimizeTaskbarWindow: (hwnd) => ipcRenderer.invoke("minimize-taskbar-window", hwnd),
  embedLaunch: (payload) => ipcRenderer.invoke("embed-launch", payload),
  embedFileBrowser: (payload) => ipcRenderer.invoke("embed-file-browser", payload),
  embedAttach: (payload) => ipcRenderer.invoke("embed-attach", payload),
  embedBounds: (payload) => ipcRenderer.invoke("embed-bounds", payload),
  embedRelease: (payload) => ipcRenderer.invoke("embed-release", payload),
  embedFocus: (payload) => ipcRenderer.invoke("embed-focus", payload),
  embedCapture: (payload) => ipcRenderer.invoke("embed-capture", payload),
  refitDisplay: () => ipcRenderer.invoke("refit-display"),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  setMouseIgnore: (ignore) => ipcRenderer.send("set-mouse-ignore", ignore),
  /** Sync cursor in CSS client space — usable while setIgnoreMouseEvents(true). */
  getCursorClientPoint: () => {
    try {
      return ipcRenderer.sendSync("get-cursor-client-point");
    } catch {
      return null;
    }
  },
  getNetStatus: () => ipcRenderer.invoke("get-net-status"),
  getLiveConnections: () => ipcRenderer.invoke("get-live-connections"),
  getNetTraffic: () => ipcRenderer.invoke("get-net-traffic"),
  getCpuMetrics: () => ipcRenderer.invoke("get-cpu-metrics"),
  getMemMetrics: () => ipcRenderer.invoke("get-mem-metrics"),
  getSysMetrics: () => ipcRenderer.invoke("get-sys-metrics"),
  getHardwareInfo: () => ipcRenderer.invoke("get-hardware-info"),
  getTopProcesses: () => ipcRenderer.invoke("get-top-processes"),
  getBootDiagnostics: () => ipcRenderer.invoke("get-boot-diagnostics"),
  getWeather: (location) => ipcRenderer.invoke("get-weather", location),
  getGlobeGrid: () => ipcRenderer.invoke("get-globe-grid"),
  onDisplaysChanged: (fn) => {
    ipcRenderer.on("display-info", (_e, payload) => fn(payload));
  },
  onSettingsUpdated: (fn) => {
    ipcRenderer.on("settings-updated", (_e, payload) => fn(payload));
  },
  onReceiveWidget: (fn) => {
    ipcRenderer.on("receive-widget", (_e, widget) => fn(widget));
  },
  onShutdownRequested: (fn) => {
    ipcRenderer.on("shutdown-request", () => fn());
  }
});
