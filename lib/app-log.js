const fs = require("fs");
const path = require("path");

const MAX_BYTES = 5 * 1024 * 1024;
let logFile = null;
let originalConsole = null;

function redact(value, key = "") {
  if (/password|passphrase|secret|token|authorization|terminal.?data|command/i.test(key)) return "[redacted]";
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => redact(item));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([name, item]) => [name, redact(item, name)]));
  }
  return String(value);
}

function ensureLogFile(userData) {
  if (logFile) return logFile;
  const directory = path.join(userData, "logs");
  fs.mkdirSync(directory, { recursive: true });
  logFile = path.join(directory, "edex-ui.log");
  return logFile;
}

function rotateIfNeeded() {
  if (!logFile || !fs.existsSync(logFile)) return;
  try {
    if (fs.statSync(logFile).size > MAX_BYTES) {
      fs.renameSync(logFile, `${logFile}.1`);
    }
  } catch {
    // Logging must never interrupt the application.
  }
}

function write(level, event, message, details) {
  if (!logFile) return;
  try {
    rotateIfNeeded();
    const entry = {
      time: new Date().toISOString(),
      level,
      event: String(event || "app"),
      message: String(message || ""),
      ...(details === undefined ? {} : { details: redact(details) })
    };
    fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Logging must never interrupt the application.
  }
}

function init(userData) {
  ensureLogFile(userData);
  info("app.start", "Anwendung gestartet", { pid: process.pid, version: process.env.npm_package_version || "packaged" });
  if (originalConsole) return;
  originalConsole = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args) => {
    originalConsole.log(...args);
    write("info", "console.log", args.map(String).join(" "));
  };
  console.warn = (...args) => {
    originalConsole.warn(...args);
    write("warn", "console.warn", args.map(String).join(" "));
  };
  console.error = (...args) => {
    originalConsole.error(...args);
    write("error", "console.error", args.map(String).join(" "));
  };
}

function info(event, message, details) { write("info", event, message, details); }
function warn(event, message, details) { write("warn", event, message, details); }
function error(event, message, details) { write("error", event, message, details); }

function close() {
  info("app.stop", "Anwendung wird beendet");
}

function file() {
  return logFile;
}

function read(limit = 300) {
  if (!logFile || !fs.existsSync(logFile)) return [];
  try {
    return fs.readFileSync(logFile, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-Math.max(1, Math.min(1000, Number(limit) || 300)))
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { init, info, warn, error, close, file, read };
