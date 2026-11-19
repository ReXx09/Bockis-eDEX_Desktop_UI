"use strict";

const { execFile } = require("child_process");

const POWERSHELL_SCAN = [
  "$running = @(Get-Process -Name HWiNFO64,HWiNFO32,HWiNFO -ErrorAction SilentlyContinue | ForEach-Object {",
  "  $processPath = $null; $version = $null;",
  "  try { $processPath = $_.Path } catch {}",
  "  if ($processPath) { try { $version = (Get-Item -LiteralPath $processPath).VersionInfo.ProductVersion } catch {} }",
  "  [pscustomobject]@{ name = $_.ProcessName; path = $processPath; version = $version }",
  "});",
  "$uninstallKeys = @(",
  "  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
  "  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
  "  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'",
  ");",
  "$installed = @(Get-ItemProperty -Path $uninstallKeys -ErrorAction SilentlyContinue |",
  "  Where-Object { $_.DisplayName -match '^HWiNFO(\\s*64|\\s*32)?(\\s|$)' } |",
  "  Select-Object @{Name='name';Expression={$_.DisplayName}}, @{Name='path';Expression={$_.InstallLocation}}, @{Name='version';Expression={$_.DisplayVersion}});",
  "@{ running = $running; installed = $installed } | ConvertTo-Json -Compress -Depth 4"
].join(" ");

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeScanResult(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("HWiNFO-Prüfung lieferte keine gültigen Daten");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("HWiNFO-Prüfung lieferte ein ungültiges Ergebnis");
  }

  const running = asArray(data.running).filter((item) => item && typeof item === "object");
  const installed = asArray(data.installed).filter((item) => item && typeof item === "object");
  const active = running[0];
  const registered = installed[0];
  const present = Boolean(active || registered);

  return {
    supported: true,
    installed: present,
    running: Boolean(active),
    state: active ? "running" : present ? "installed" : "not-found",
    version: String(active?.version || registered?.version || "").slice(0, 40),
    executablePath: String(active?.path || registered?.path || "").slice(0, 512),
    sensorBridgeAvailable: false
  };
}

function scanHwinfoPrerequisites({
  platform = process.platform,
  execFileImpl = execFile
} = {}) {
  if (platform !== "win32") {
    return Promise.resolve({
      supported: false,
      installed: false,
      running: false,
      state: "unsupported",
      version: "",
      executablePath: "",
      sensorBridgeAvailable: false
    });
  }

  return new Promise((resolve) => {
    execFileImpl(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", POWERSHELL_SCAN],
      { windowsHide: true, timeout: 8000, encoding: "utf8" },
      (error, stdout) => {
        if (error) {
          resolve({
            supported: true,
            installed: false,
            running: false,
            state: "error",
            version: "",
            executablePath: "",
            sensorBridgeAvailable: false,
            error: String(error.message || error).slice(0, 240)
          });
          return;
        }
        try {
          resolve(normalizeScanResult(String(stdout || "").trim()));
        } catch (scanError) {
          resolve({
            supported: true,
            installed: false,
            running: false,
            state: "error",
            version: "",
            executablePath: "",
            sensorBridgeAvailable: false,
            error: String(scanError.message || scanError).slice(0, 240)
          });
        }
      }
    );
  });
}

module.exports = { scanHwinfoPrerequisites, normalizeScanResult };
