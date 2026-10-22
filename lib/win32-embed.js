const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { shell } = require("electron");

const embedded = new Map();

async function resolveShortcut(filePath) {
  const value = path.resolve(String(filePath || ""));
  if (!fs.existsSync(value) || !/\.lnk$/i.test(value)) {
    return { ok: true, path: value, target: value, args: "" };
  }
  try {
    const info = shell.readShortcutLink(value);
    const target = String(info?.target || "").trim();
    return {
      ok: Boolean(target),
      path: target || value,
      target: target || value,
      args: String(info?.args || "")
    };
  } catch {
    return { ok: false, path: value, target: value, args: "" };
  }
}

async function listTopWindows(limit = 50, includeUntitled = false) {
  const output = await runNative({ command: "list" });
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [hwnd, pid, process, title64] = line.split("\t");
    let title = "";
    try { title = Buffer.from(title64 || "", "base64").toString("utf8"); } catch {}
    return { hwnd, pid: Number(pid) || 0, process, title };
  }).filter((item) => item.hwnd && (includeUntitled || item.title)).slice(0, limit);
}

async function listTaskbarWindows(limit = 100) {
  const output = await runNative({ command: "taskbar" });
  return output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [hwnd, pid, process, minimized, title64] = line.split("\t");
    let title = "";
    try { title = Buffer.from(title64 || "", "base64").toString("utf8"); } catch {}
    return { hwnd, pid: Number(pid) || 0, process, minimized: minimized === "1", title };
  }).filter((item) => item.hwnd && item.title).slice(0, limit);
}

async function foregroundWindow() {
  const hwnd = await runNative({ command: "foreground" });
  return String(hwnd || "").trim();
}

async function activateWindow(hwnd) {
  return (await runNative({ command: "activate", hwnd: String(hwnd || "") })) === "true";
}

async function minimizeWindow(hwnd) {
  return (await runNative({ command: "minimize", hwnd: String(hwnd || "") })) === "true";
}

function hwndFromBuffer(buffer) {
  if (!buffer || !buffer.length) return "";
  return (buffer.length >= 8 ? buffer.readBigUInt64LE(0) : BigInt(buffer.readUInt32LE(0))).toString();
}

const nativeScript = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Diagnostics;
public static class EdexEmbed {
  const int GWL_STYLE = -16;
  const int GWL_EXSTYLE = -20;
  const long WS_CHILD = 0x40000000L;
  const long WS_POPUP = unchecked((long)0x80000000L);
  const long WS_CAPTION = 0x00C00000L;
  const long WS_THICKFRAME = 0x00040000L;
  const long WS_MINIMIZEBOX = 0x00020000L;
  const long WS_MAXIMIZEBOX = 0x00010000L;
  const long WS_SYSMENU = 0x00080000L;
  const uint SWP_NOZORDER = 0x0004;
  const uint SWP_NOACTIVATE = 0x0010;
  const uint SWP_FRAMECHANGED = 0x0020;
  const int SW_RESTORE = 9;
  const uint GW_OWNER = 4;
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lp);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint cmd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr child, IntPtr parent);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h, int i);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetWindowLongPtr(IntPtr h, int i, IntPtr v);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int hgt, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h, ref Point p);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  static long GetStyle(IntPtr h, int i) { return GetWindowLongPtr(h, i).ToInt64(); }
  static void PutStyle(IntPtr h, int i, long v) { SetWindowLongPtr(h, i, new IntPtr(v)); }
  public static string List() {
    var rows = new System.Collections.Generic.List<string>();
    EnumWindows((hwnd, lp) => {
      if (!IsWindowVisible(hwnd)) return true;
      var text = new StringBuilder(512); GetWindowText(hwnd, text, text.Capacity);
      var title = text.ToString().Trim();
      uint pid; GetWindowThreadProcessId(hwnd, out pid); string proc = "";
      try { proc = Process.GetProcessById((int)pid).ProcessName + ".exe"; } catch {}
      rows.Add(hwnd.ToInt64() + "\\t" + pid + "\\t" + proc + "\\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes(title)));
      return true;
    }, IntPtr.Zero); return string.Join("\\n", rows);
  }
  public static string Taskbar() {
    var rows = new System.Collections.Generic.List<string>();
    EnumWindows((hwnd, lp) => {
      if (!IsWindowVisible(hwnd) || GetWindow(hwnd, GW_OWNER) != IntPtr.Zero) return true;
      var text = new StringBuilder(512); GetWindowText(hwnd, text, text.Capacity);
      var title = text.ToString().Trim();
      if (title.Length == 0) return true;
      uint pid; GetWindowThreadProcessId(hwnd, out pid); string proc = "";
      try { proc = Process.GetProcessById((int)pid).ProcessName + ".exe"; } catch {}
      rows.Add(hwnd.ToInt64() + "\\t" + pid + "\\t" + proc + "\\t" + (IsIconic(hwnd) ? "1" : "0") + "\\t" + Convert.ToBase64String(Encoding.UTF8.GetBytes(title)));
      return true;
    }, IntPtr.Zero); return string.Join("\\n", rows);
  }
  public static string Foreground() { return GetForegroundWindow().ToInt64().ToString(); }
  static bool Local(IntPtr host, ref int x, ref int y) { var p = new Point { X = x, Y = y }; if (!ScreenToClient(host, ref p)) return false; x = p.X; y = p.Y; return true; }
  public static string Dock(IntPtr child, IntPtr host, int x, int y, int w, int h) {
    if (!IsWindow(child) || !IsWindow(host)) return "false";
    if (!Local(host, ref x, ref y)) return "false";
    long style = GetStyle(child, GWL_STYLE), ex = GetStyle(child, GWL_EXSTYLE);
    IntPtr parent = GetParent(child); SetParent(child, host);
    PutStyle(child, GWL_STYLE, (style & ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU)) | WS_CHILD); ShowWindow(child, SW_RESTORE);
    bool ok = SetWindowPos(child, IntPtr.Zero, x, y, w, h, SWP_NOACTIVATE | SWP_FRAMECHANGED);
    return (ok ? "true" : "false") + "|" + parent.ToInt64() + "|" + style + "|" + ex;
  }
  public static bool Bounds(IntPtr child, IntPtr host, int x, int y, int w, int h) {
    return IsWindow(child) && IsWindow(host) && Local(host, ref x, ref y) && SetWindowPos(child, IntPtr.Zero, x, y, w, h, SWP_NOACTIVATE);
  }
  public static bool Release(IntPtr child, IntPtr parent, long style, long ex) {
    if (!IsWindow(child)) return false; SetParent(child, parent); PutStyle(child, GWL_STYLE, style); PutStyle(child, GWL_EXSTYLE, ex); ShowWindow(child, SW_RESTORE); return true;
  }
  public static bool Focus(IntPtr child) { return IsWindow(child) && ShowWindow(child, SW_RESTORE) && SetForegroundWindow(child); }
  public static bool Activate(IntPtr hwnd) { return IsWindow(hwnd) && ShowWindow(hwnd, SW_RESTORE) && SetForegroundWindow(hwnd); }
  public static bool Minimize(IntPtr hwnd) { return IsWindow(hwnd) && ShowWindow(hwnd, 6); }
}
"@
$p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('__PAYLOAD__')) | ConvertFrom-Json
switch ([string]$p.command) {
  'list' { [EdexEmbed]::List() }
  'taskbar' { [EdexEmbed]::Taskbar() }
  'foreground' { [EdexEmbed]::Foreground() }
  'activate' { [EdexEmbed]::Activate([IntPtr][Int64]$p.hwnd) }
  'minimize' { [EdexEmbed]::Minimize([IntPtr][Int64]$p.hwnd) }
  'dock' { [EdexEmbed]::Dock([IntPtr][Int64]$p.hwnd, [IntPtr][Int64]$p.host, [int]$p.x, [int]$p.y, [int]$p.w, [int]$p.h) }
  'bounds' { [EdexEmbed]::Bounds([IntPtr][Int64]$p.hwnd, [IntPtr][Int64]$p.host, [int]$p.x, [int]$p.y, [int]$p.w, [int]$p.h) }
  'release' { [EdexEmbed]::Release([IntPtr][Int64]$p.hwnd, [IntPtr][Int64]$p.parent, [Int64]$p.style, [Int64]$p.exStyle) }
  'focus' { [EdexEmbed]::Focus([IntPtr][Int64]$p.hwnd) }
}
`;

function runNative(command) {
  if (process.platform !== "win32") return Promise.resolve("");
  const payload = Buffer.from(JSON.stringify(command), "utf8").toString("base64");
  const encoded = Buffer.from(nativeScript.replace("__PAYLOAD__", payload), "utf16le").toString("base64");
  return new Promise((resolve) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", () => resolve(""));
    child.on("close", () => resolve(output.trim()));
  });
}

function parseWindowsArgs(value) {
  const args = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|(\S+)/g;
  let match;
  while ((match = pattern.exec(String(value || "")))) args.push(match[1] ?? match[2]);
  return args;
}

async function waitForProcessWindow(pid, timeoutMs) {
  const deadline = Date.now() + Math.max(1000, Math.min(30000, Number(timeoutMs) || 15000));
  while (Date.now() < deadline) {
    const match = (await listTopWindows(50, true)).find((item) => item.pid === pid);
    if (match) return match.hwnd;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "";
}

async function waitForWindowProcess(processName, timeoutMs) {
  const deadline = Date.now() + Math.max(1000, Math.min(30000, Number(timeoutMs) || 15000));
  const wanted = String(processName || "").toLowerCase();
  while (Date.now() < deadline) {
    const match = (await listTopWindows(50, true)).find((item) => String(item.process || "").toLowerCase() === wanted);
    if (match) return match.hwnd;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return "";
}

async function launchAndDock(filePath, bounds, options = {}) {
  const shortcut = await resolveShortcut(filePath);
  if (!shortcut.ok || !shortcut.target || !fs.existsSync(shortcut.target)) return { ok: false, message: "程式或捷徑目標不存在" };
  const launchArgs = Array.isArray(options.args) ? options.args.map((arg) => String(arg)) : parseWindowsArgs(shortcut.args);
  const child = spawn(shortcut.target, launchArgs, { windowsHide: false });
  const hwnd = await waitForProcessWindow(child.pid, options.timeoutMs)
    || await waitForWindowProcess(options.processName, options.timeoutMs);
  if (!hwnd) return { ok: false, pid: child.pid, message: "找不到程式視窗" };
  const ok = await dockWindow(hwnd, options.hostHwnd, bounds.x, bounds.y, bounds.w, bounds.h);
  return ok ? { ok: true, hwnd, pid: child.pid } : { ok: false, hwnd, pid: child.pid, message: "對齊視窗失敗" };
}

async function dockWindow(hwnd, hostHwnd, x, y, w, h) {
  if (!hwnd || !hostHwnd) return false;
  const result = await runNative({ command: "dock", hwnd, host: hostHwnd, x, y, w, h });
  const [ok, parent, style, exStyle] = result.split("|");
  if (ok !== "true") return false;
  embedded.set(String(hwnd), { host: String(hostHwnd), parent: parent || "0", style: Number(style) || 0, exStyle: Number(exStyle) || 0 });
  return true;
}

async function setDockBounds(hwnd, hostHwnd, x, y, w, h) {
  return /^true$/i.test(await runNative({ command: "bounds", hwnd, host: hostHwnd, x, y, w, h }));
}

async function releaseEmbed(hwnd) {
  const state = embedded.get(String(hwnd));
  if (!state) return false;
  const ok = /^true$/i.test(await runNative({ command: "release", hwnd, ...state }));
  if (ok) embedded.delete(String(hwnd));
  return ok;
}

async function focusDock(hwnd) {
  return /^true$/i.test(await runNative({ command: "focus", hwnd }));
}

async function captureWindowPng() {
  return "";
}

async function releaseAllEmbeds() {
  for (const hwnd of [...embedded.keys()]) await releaseEmbed(hwnd);
  return true;
}

function stopEmbedDaemon() {}

module.exports = {
  resolveShortcut,
  listTopWindows,
  listTaskbarWindows,
  foregroundWindow,
  activateWindow,
  minimizeWindow,
  hwndFromBuffer,
  launchAndDock,
  dockWindow,
  setDockBounds,
  releaseEmbed,
  focusDock,
  captureWindowPng,
  releaseAllEmbeds,
  stopEmbedDaemon
};
