"use strict";

const WINDHAWK_STABLE_VERSION = "1.7.3";
const WINDHAWK_INSTALL_URL = "https://windhawk.net/";
const PILOT_MODS = Object.freeze([
  Object.freeze({
    id: "windows-11-file-explorer-styler",
    name: "Windows 11 File Explorer Styler",
    target: "explorer.exe",
    url: "https://windhawk.net/mods/windows-11-file-explorer-styler"
  }),
  Object.freeze({
    id: "windows-11-taskbar-styler",
    name: "Windows 11 Taskbar Styler",
    target: "explorer.exe",
    url: "https://windhawk.net/mods/windows-11-taskbar-styler"
  })
]);

function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(value || "").trim());
  if (!match) return null;
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function assessWindhawk(platform, installation) {
  if (platform !== "win32") {
    return {
      supportedPlatform: false,
      runtime: "unsupported-platform",
      installed: false,
      compatible: false,
      minimumVersion: WINDHAWK_STABLE_VERSION,
      mods: PILOT_MODS.map((mod) => ({ ...mod, status: "unavailable" }))
    };
  }
  if (!installation || typeof installation !== "object") {
    return {
      supportedPlatform: true,
      runtime: "missing",
      installed: false,
      compatible: false,
      minimumVersion: WINDHAWK_STABLE_VERSION,
      mods: PILOT_MODS.map((mod) => ({ ...mod, status: "requires-windhawk" }))
    };
  }
  const version = String(installation.version || "");
  const comparison = compareVersions(version, WINDHAWK_STABLE_VERSION);
  const compatible = comparison !== null && comparison >= 0 && parseVersion(version)[0] === 1;
  return {
    supportedPlatform: true,
    runtime: compatible ? "compatible" : "incompatible",
    installed: true,
    compatible,
    version,
    installLocation: typeof installation.installLocation === "string" ? installation.installLocation : "",
    minimumVersion: WINDHAWK_STABLE_VERSION,
    mods: PILOT_MODS.map((mod) => ({
      ...mod,
      status: compatible ? "manual-verification-required" : "blocked-by-runtime"
    }))
  };
}

function windhawkLink(linkId) {
  if (linkId === "install") return WINDHAWK_INSTALL_URL;
  const mod = PILOT_MODS.find((entry) => entry.id === linkId);
  if (mod) return mod.url;
  throw new Error("Unbekannter Windhawk-Link.");
}

module.exports = {
  PILOT_MODS,
  WINDHAWK_INSTALL_URL,
  WINDHAWK_STABLE_VERSION,
  assessWindhawk,
  compareVersions,
  parseVersion,
  windhawkLink
};
