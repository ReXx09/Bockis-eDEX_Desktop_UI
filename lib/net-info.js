const os = require("os");
const fs = require("fs");
const path = require("path");
const net = require("net");
const https = require("https");
const { execFile } = require("child_process");

const geoCache = new Map();

function pickInterface() {
  const ifaces = os.networkInterfaces();
  const skip = /loopback|isatap|teredo|pseudo|vmware|virtualbox|hyper-v|vethernet|wsl|docker|bluetooth/i;
  const scored = [];
  for (const [name, list] of Object.entries(ifaces)) {
    for (const info of list || []) {
      if (info.family !== "IPv4" && info.family !== 4) continue;
      if (info.internal) continue;
      if (String(info.address).startsWith("169.254.")) continue;
      const n = String(name);
      let score = 2;
      if (skip.test(n)) score = 0;
      else if (/ethernet|eth\d|本地連線|區域連線/i.test(n)) score = 4;
      else if (/wi-?fi|wlan|wireless|wi-fi/i.test(n)) score = 3;
      scored.push({
        score,
        iface: n,
        ip4: info.address,
        mac: info.mac || ""
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.find((item) => item.score > 0) || scored[0] || null;
}

function pingMs(host = "1.1.1.1", port = 80, timeout = 1500) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host, port });
    const done = (ms) => {
      try { socket.destroy(); } catch { /* ignore */ }
      resolve(ms);
    };
    socket.setTimeout(timeout);
    socket.on("connect", () => done(Date.now() - started));
    socket.on("timeout", () => done(null));
    socket.on("error", () => done(null));
  });
}

function fetchExternalIp(localAddress) {
  return new Promise((resolve) => {
    const req = https.get({
      host: "myexternalip.com",
      path: "/json",
      port: 443,
      timeout: 2500,
      localAddress: localAddress || undefined
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw).ip || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function getNetStatus() {
  const nic = pickInterface();
  if (!nic) {
    return {
      offline: true,
      iface: null,
      ip4: null,
      externalIp: null,
      ping: null,
      state: "OFFLINE"
    };
  }
  const externalIpPromise = process.env.EDEX_EXTERNAL_IP === "1"
    ? fetchExternalIp(nic.ip4)
    : Promise.resolve(null);
  const [ping, externalIp] = await Promise.all([pingMs(), externalIpPromise]);
  return {
    offline: false,
    iface: nic.iface,
    ip4: nic.ip4,
    mac: nic.mac,
    externalIp,
    ping,
    state: ping == null ? "LOCAL" : "ONLINE"
  };
}

function runPs(command, timeout = 4500) {
  return new Promise((resolve) => {
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
      windowsHide: true,
      timeout,
      encoding: "utf8"
    }, (err, stdout) => {
      if (err) return resolve("");
      resolve(String(stdout || "").trim());
    });
  });
}

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPublicIp(address) {
  const value = String(address || "").trim();
  if (!net.isIP(value)) return false;
  if (value.includes(":")) return !value.startsWith("fe80:") && value !== "::1";
  const parts = value.split(".").map(Number);
  return !(parts[0] === 10 || parts[0] === 127
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 169 && parts[1] === 254));
}

function isLocalIp(address) {
  const value = String(address || "").trim().toLowerCase();
  if (!value || value === "localhost" || value === "::1" || value.startsWith("127.")) return true;
  if (value.startsWith("10.") || value.startsWith("192.168.") || value.startsWith("169.254.")) return true;
  const parts = value.split(".").map(Number);
  return parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function localNetworkGeo(address) {
  const octets = String(address || "").split(".").map(Number);
  const seed = octets.reduce((sum, value, index) => sum + (Number.isFinite(value) ? value * (index + 1) : 0), 0);
  return {
    lat: (seed % 9) - 4,
    lon: (Math.floor(seed / 9) % 17) - 8,
    city: "LOCAL NETWORK",
    approximate: true
  };
}

function connectionDirection(localAddress, remoteAddress, localPort, remotePort, listening) {
  if (isLocalIp(remoteAddress)) return "local";
  if (listening) return "incoming";
  const localService = Number(localPort) > 0 && Number(localPort) <= 1024;
  const remoteService = Number(remotePort) > 0 && Number(remotePort) <= 1024;
  if (localService && !remoteService) return "incoming";
  return "outgoing";
}

function lookupGeoIp(address) {
  if (!isPublicIp(address)) return Promise.resolve(null);
  if (geoCache.has(address)) return Promise.resolve(geoCache.get(address));
  return new Promise((resolve) => {
    const req = https.get({
      host: "ipwho.is",
      path: `/${encodeURIComponent(address)}`,
      port: 443,
      timeout: 2500,
      headers: { "User-Agent": "Bockis-eDEX-Desktop-UI/1.1" }
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          const data = JSON.parse(raw);
          const geo = data.success === false || !Number.isFinite(Number(data.latitude))
            ? null
            : { lat: Number(data.latitude), lon: Number(data.longitude), city: data.city, country: data.country };
          geoCache.set(address, geo);
          resolve(geo);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.on("timeout", () => { req.destroy(); resolve(null); });
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Bockis-eDEX-Desktop-UI/1.2" } }, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) throw new Error(`HTTP ${res.statusCode}`);
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.setTimeout(6000, () => req.destroy(new Error("Wetterdienst Timeout")));
    req.on("error", reject);
  });
}

async function getWeather(location = "Berlin") {
  const query = String(location || "Berlin").trim().slice(0, 80) || "Berlin";
  const geo = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=de&format=json`);
  const place = geo?.results?.[0];
  if (!place) throw new Error(`Ort nicht gefunden: ${query}`);
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "4",
    timezone: "auto"
  });
  const forecast = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  return {
    location: [place.name, place.country_code].filter(Boolean).join(", "),
    timezone: forecast.timezone || "",
    current: forecast.current || {},
    daily: forecast.daily || {}
  };
}

async function getLiveConnections() {
  const raw = await runPs(
    "$listeners = @{}; Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $listeners[\"$($_.OwningProcess):$($_.LocalPort)\"] = $true }; Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Where-Object { $_.RemoteAddress -and $_.RemoteAddress -notmatch '^0\\.0\\.0\\.0$' } | Group-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess | ForEach-Object { $parts = $_.Name -split ', '; $p = Get-Process -Id ([int]$parts[4]) -ErrorAction SilentlyContinue; @{ localAddress = $parts[0]; localPort = [int]$parts[1]; remoteAddress = $parts[2]; remotePort = [int]$parts[3]; pid = [int]$parts[4]; process = $p.ProcessName; listening = [bool]$listeners[\"$([int]$parts[4]):$([int]$parts[1])\"]; count = $_.Count } } | Sort-Object count -Descending | Select-Object -First 24 | ConvertTo-Json -Compress",
    4500
  );
  const rows = parseJson(raw);
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const result = [];
  for (const row of list) {
    const address = String(row.remoteAddress || "");
    const direction = connectionDirection(row.localAddress, address, row.localPort, row.remotePort, row.listening === true);
    const geo = direction === "local" ? localNetworkGeo(address) : await lookupGeoIp(address);
    result.push({
      localAddress: String(row.localAddress || ""),
      localPort: Number(row.localPort) || 0,
      address,
      port: Number(row.remotePort) || 0,
      pid: Number(row.pid) || 0,
      process: String(row.process || "UNKNOWN").slice(0, 18),
      count: Number(row.count) || 1,
      direction,
      geo
    });
  }
  return result;
}

let lastTraffic = { t: 0, up: 0, down: 0, totalUp: 0, totalDown: 0 };
async function getTrafficSample() {
  const nic = pickInterface();
  const raw = await runPs(
    "Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface | Where-Object { $_.Name -notmatch 'Loopback|isatap|Teredo|Pseudo' } | Select-Object Name,BytesReceivedPersec,BytesSentPersec | ConvertTo-Json -Compress",
    3500
  );
  const rows = parseJson(raw);
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const wanted = (nic?.iface || "").toLowerCase();
  let row = list.find((item) => String(item.Name || "").toLowerCase().includes(wanted.slice(0, 8))) || null;
  if (!row && list.length) {
    row = list.slice().sort((a, b) =>
      (Number(b.BytesReceivedPersec) + Number(b.BytesSentPersec)) -
      (Number(a.BytesReceivedPersec) + Number(a.BytesSentPersec))
    )[0];
  }
  const down = Number(row?.BytesReceivedPersec) || 0;
  const up = Number(row?.BytesSentPersec) || 0;
  lastTraffic.totalUp += up;
  lastTraffic.totalDown += down;
  lastTraffic = { t: Date.now(), up, down, totalUp: lastTraffic.totalUp, totalDown: lastTraffic.totalDown };
  return { upBps: up, downBps: down, totalUp: lastTraffic.totalUp, totalDown: lastTraffic.totalDown };
}

function cpuSnapshot() {
  return os.cpus().map((c) => {
    const t = c.times;
    return { model: c.model, speed: c.speed, idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq };
  });
}

let prevCpu = null;
let cpuMetricsCache = null;

function sampleCpuMetrics() {
  const snap = cpuSnapshot();
  const cores = snap.length;
  let percents = snap.map(() => 0);
  if (prevCpu && prevCpu.length === cores) {
    percents = snap.map((cur, i) => {
      const dt = cur.total - prevCpu[i].total;
      const di = cur.idle - prevCpu[i].idle;
      if (dt <= 0) return 0;
      return Math.max(0, Math.min(100, (1 - di / dt) * 100));
    });
  }
  prevCpu = snap;
  const avg = percents.reduce((a, b) => a + b, 0) / Math.max(1, cores);
  const speeds = snap.map((c) => c.speed / 1000);
  const fullName = String(snap[0]?.model || "CPU").trim();
  cpuMetricsCache = {
    name: fullName.slice(0, 28),
    fullName,
    cores,
    percents,
    avg,
    speedMin: Math.min(...speeds),
    speedMax: Math.max(...speeds)
  };
  return cpuMetricsCache;
}

const cpuMetricsSampler = setInterval(sampleCpuMetrics, 1000);
cpuMetricsSampler.unref?.();

function getCpuMetrics() {
  return cpuMetricsCache || sampleCpuMetrics();
}

async function getMemMetrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  let cached = 0;
  let available = free;
  if (process.platform === "win32") {
    const raw = await runPs(
      "Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction SilentlyContinue | Select-Object AvailableBytes,CacheBytes | ConvertTo-Json -Compress",
      1800
    );
    const memory = parseJson(raw) || {};
    available = Number(memory.AvailableBytes) || free;
    cached = Number(memory.CacheBytes) || 0;
  }
  return {
    total,
    free,
    used,
    active: used,
    available,
    cached
  };
}

function getSysMetrics() {
  const up = os.uptime();
  const h = Math.floor(up / 3600);
  const m = Math.floor((up % 3600) / 60);
  const s = Math.floor(up % 60);
  const now = new Date();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let type = os.platform();
  if (type === "win32") type = "win";
  if (type === "darwin") type = "macOS";
  return {
    year: now.getFullYear(),
    monthDay: `${months[now.getMonth()]} ${now.getDate()}`,
    uptime: `${h}:${m}:${s}`,
    type,
    power: "AC"
  };
}

let globeGridCache = null;
function loadGlobeGrid() {
  if (globeGridCache) return globeGridCache;
  const candidates = [
    path.join(__dirname, "../assets/misc/grid.json"),
    path.join(__dirname, "../../src/assets/misc/grid.json"),
    path.join(__dirname, "../../../src/assets/misc/grid.json"),
    path.join(__dirname, "../src/assets/misc/grid.json")
  ];
  const file = candidates.find((item) => fs.existsSync(item));
  if (!file) throw new Error("grid.json not found");
  globeGridCache = JSON.parse(fs.readFileSync(file, "utf8"));
  return globeGridCache;
}

const CHASSIS = {
  1: "OTHER", 3: "DESKTOP", 4: "LOW PROFILE", 6: "MINI TOWER", 7: "TOWER",
  8: "PORTABLE", 9: "LAPTOP", 10: "NOTEBOOK", 11: "HAND HELD", 13: "ALL IN ONE",
  14: "SUB NOTEBOOK", 30: "TABLET"
};

async function getHardwareInfo() {
  const raw = await runPs(
    "$cs = Get-CimInstance Win32_ComputerSystem; $ch = Get-CimInstance Win32_SystemEnclosure; @{ manufacturer = $cs.Manufacturer; model = $cs.Model; chassis = @($ch.ChassisTypes)[0] } | ConvertTo-Json -Compress",
    4000
  );
  const info = parseJson(raw) || {};
  const manufacturer = String(info.manufacturer || "UNKNOWN").trim();
  const model = String(info.model || os.hostname() || "UNKNOWN").trim();
  const chassis = CHASSIS[Number(info.chassis)] || (info.chassis ? String(info.chassis) : "DESKTOP");
  const trim = (str, ...filters) => str.split(/\s+/).filter((w) => w && !filters.includes(w)).slice(0, 2).join(" ");
  return {
    manufacturer: (trim(manufacturer) || "NONE").toUpperCase(),
    model: (trim(model, manufacturer) || "NONE").toUpperCase(),
    chassis: chassis.toUpperCase()
  };
}

async function getTopProcesses() {
  const raw = await runPs(
    "$connections = @{}; Get-NetTCPConnection -ErrorAction SilentlyContinue | Group-Object OwningProcess | ForEach-Object { $connections[[int]$_.Name] = $_.Count }; $ioRates = @{}; Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction SilentlyContinue | ForEach-Object { if ([int]$_.IDProcess -gt 0) { $ioRates[[int]$_.IDProcess] = [double]$_.IODataBytesPerSec } }; $all = Get-Process; $top = $all | Sort-Object WorkingSet64 -Descending | Select-Object -First 20; @{ tasks = $all.Count; list = @($top | ForEach-Object { @{ pid = $_.Id; name = $_.ProcessName; cpu = [double]($_.CPU); mem = $_.WorkingSet64; energy = [math]::Round([double]($ioRates[[int]$_.Id]), 0); conn = [int]($connections[[int]$_.Id]) } }) } | ConvertTo-Json -Compress -Depth 4",
    4500
  );
  const data = parseJson(raw) || {};
  const list = Array.isArray(data.list) ? data.list : data.list ? [data.list] : [];
  const total = os.totalmem();
  return {
    tasks: Number(data.tasks) || list.length,
    list: list.map((p) => ({
      pid: p.pid,
      name: String(p.name || "").slice(0, 18),
      cpu: Math.round((Number(p.cpu) || 0) * 10) / 10,
      mem: Math.round(((Number(p.mem) || 0) / Math.max(1, total)) * 1000) / 10,
      energy: Math.max(0, Math.round(Number(p.energy) || 0)),
      conn: Number(p.conn) || 0
    }))
  };
}

module.exports = {
  getNetStatus,
  getLiveConnections,
  getTrafficSample,
  pickInterface,
  getCpuMetrics,
  getMemMetrics,
  getSysMetrics,
  loadGlobeGrid,
  getHardwareInfo,
  getTopProcesses
  ,getWeather
};
