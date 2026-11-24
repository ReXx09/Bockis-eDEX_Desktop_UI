"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RESERVED = new Set(["__proto__", "constructor", "prototype"]);

function validName(value) {
  const name = String(value || "").trim();
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(name) || RESERVED.has(name)) {
    throw new Error("Name: 1–48 Zeichen (a-z, 0-9, - oder _)");
  }
  return name;
}

function hex(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : fallback;
}

function normalizeTheme(theme) {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
    throw new Error("Ungültiges Theme");
  }
  const src = theme.colors || {};
  const value = (key, fallback) => (
    Number.isInteger(src[key]) && src[key] >= 0 && src[key] <= 255
      ? src[key]
      : fallback
  );
  const r = value("r", 0);
  const g = value("g", 234);
  const b = value("b", 255);
  const accent = `#${[r, g, b].map((item) => item.toString(16).padStart(2, "0")).join("")}`;
  const colors = {
    r,
    g,
    b,
    black: hex(src.black, "#000000"),
    light_black: hex(src.light_black, "#05080d"),
    grey: hex(src.grey, "#262828"),
    red: hex(src.red, "#ff3c3c"),
    yellow: hex(src.yellow, "#ffd23c")
  };
  const terminal = theme.terminal && typeof theme.terminal === "object" ? theme.terminal : {};
  const cssvars = theme.cssvars && typeof theme.cssvars === "object" ? theme.cssvars : {};
  const fontFamily = ["Fira Mono", "Cascadia Mono", "Consolas"].includes(terminal.fontFamily)
    ? terminal.fontFamily
    : "Fira Mono";
  const mainFont = ["United Sans Medium", "Rajdhani", "Segoe UI", "Consolas"].includes(cssvars.font_main)
    ? cssvars.font_main
    : "United Sans Medium";
  const panelStyle = ["square", "rounded", "glass"].includes(theme.panelStyle) ? theme.panelStyle : "square";
  const cursorStyle = ["block", "underline", "bar"].includes(terminal.cursorStyle) ? terminal.cursorStyle : "block";
  const foreground = hex(terminal.foreground, accent);
  const background = hex(terminal.background, colors.light_black);
  const cursor = hex(terminal.cursor, accent);
  return {
    colors,
    panelStyle,
    cssvars: { font_main: mainFont, font_main_light: "United Sans Light" },
    terminal: {
      fontFamily,
      cursorStyle,
      foreground,
      background,
      cursor,
      cursorAccent: hex(terminal.cursorAccent, background),
      selection: `rgba(${r},${g},${b},0.3)`
    },
    globe: { base: colors.black, marker: accent, pin: accent, satellite: accent }
  };
}

function createStore(userData, builtInDir) {
  const userDir = path.join(userData, "custom-themes");
  const backupDir = path.join(userData, "custom-themes-backups");
  const profileBackupDir = path.join(userData, "theme-studio-backups");
  const activityFile = path.join(userData, "theme-studio-activity.json");
  const builtin = () => fs.readdirSync(builtInDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5));
  const custom = () => (
    fs.existsSync(userDir)
      ? fs.readdirSync(userDir)
        .filter((name) => /^[a-zA-Z0-9_-]{1,48}\.json$/.test(name))
        .map((name) => name.slice(0, -5))
      : []
  );
  function list() {
    return [...new Set([...builtin(), ...custom()])].sort((a, b) => a.localeCompare(b));
  }
  function load(name) {
    const key = validName(name);
    const file = path.join(custom().includes(key) ? userDir : builtInDir, `${key}.json`);
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  function save(name, theme) {
    const key = validName(name);
    if (builtin().includes(key)) {
      throw new Error("Original-Themes sind schreibgeschützt. Bitte neuen Namen verwenden.");
    }
    const normalized = normalizeTheme(theme);
    fs.mkdirSync(userDir, { recursive: true });
    const file = path.join(userDir, `${key}.json`);
    if (fs.existsSync(file)) {
      fs.mkdirSync(backupDir, { recursive: true });
      const backup = path.join(
        backupDir,
        `${key}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      );
      fs.copyFileSync(file, backup);
    }
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(normalized, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
    recordActivity("save", key);
    return { name: key, theme: normalized, themes: list() };
  }
  function remove(name) {
    const key = validName(name);
    if (builtin().includes(key)) throw new Error("Original-Theme kann nicht gelöscht werden");
    const file = path.join(userDir, `${key}.json`);
    if (!fs.existsSync(file)) throw new Error("Theme nicht gefunden");
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(file, path.join(backupDir, `${key}-${Date.now()}.json`));
    fs.unlinkSync(file);
    recordActivity("delete", key);
    return list();
  }
  function createProfileBackup(name, theme, settings = {}) {
    const key = validName(name);
    const id = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    fs.mkdirSync(profileBackupDir, { recursive: true });
    const file = path.join(profileBackupDir, `${id}.json`);
    const snapshot = {
      format: "bockis-theme-backup",
      version: 1,
      name: key,
      createdAt: new Date().toISOString(),
      theme: normalizeTheme(theme),
      settings
    };
    fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    recordActivity("backup", key);
    return { id, name: key, createdAt: snapshot.createdAt };
  }
  function listProfileBackups() {
    if (!fs.existsSync(profileBackupDir)) return [];
    return fs.readdirSync(profileBackupDir)
      .filter((name) => /^\d{13}-[a-f0-9]{8}\.json$/.test(name))
      .map((file) => {
        const snapshot = JSON.parse(fs.readFileSync(path.join(profileBackupDir, file), "utf8"));
        return {
          id: file.slice(0, -5),
          name: validName(snapshot.name),
          createdAt: String(snapshot.createdAt || "")
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  function loadProfileBackup(id) {
    const key = String(id || "");
    if (!/^\d{13}-[a-f0-9]{8}$/.test(key)) throw new Error("Ungültige Backup-ID");
    const file = path.join(profileBackupDir, `${key}.json`);
    const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
    if (snapshot.format !== "bockis-theme-backup" || snapshot.version !== 1) {
      throw new Error("Nicht unterstütztes Theme-Backup");
    }
    return {
      ...snapshot,
      name: validName(snapshot.name),
      theme: normalizeTheme(snapshot.theme),
      settings: snapshot.settings && typeof snapshot.settings === "object" && !Array.isArray(snapshot.settings)
        ? snapshot.settings
        : {}
    };
  }
  function exportPackage(name, file, desktop = {}) {
    const key = validName(name);
    const payload = {
      format: "bockis-theme-package",
      version: 1,
      name: key,
      theme: normalizeTheme(load(key)),
      desktop
    };
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    recordActivity("export", key);
    return { name: key, file };
  }
  function importPackage(file) {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error("Theme-Paket ist ungültig oder größer als 1 MB");
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    if (payload.format !== "bockis-theme-package" || payload.version !== 1) {
      throw new Error("Nicht unterstütztes Theme-Paket");
    }
    const key = validName(payload.name);
    if (builtin().includes(key)) throw new Error("Paketname kollidiert mit einem schreibgeschützten Theme");
    const saved = save(key, payload.theme);
    recordActivity("import", key);
    return { ...saved, desktop: payload.desktop && typeof payload.desktop === "object" ? payload.desktop : {} };
  }
  function recordActivity(action, name) {
    const entries = fs.existsSync(activityFile)
      ? JSON.parse(fs.readFileSync(activityFile, "utf8"))
      : [];
    if (!Array.isArray(entries)) throw new Error("Theme-Änderungsprotokoll ist ungültig");
    entries.push({ at: new Date().toISOString(), action: String(action).slice(0, 40), name: String(name || "").slice(0, 48) });
    fs.writeFileSync(activityFile, `${JSON.stringify(entries.slice(-500), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }
  function listActivity(limit = 50) {
    if (!fs.existsSync(activityFile)) return [];
    const entries = JSON.parse(fs.readFileSync(activityFile, "utf8"));
    if (!Array.isArray(entries)) throw new Error("Theme-Änderungsprotokoll ist ungültig");
    return entries.slice(-Math.max(1, Math.min(100, Number(limit) || 50))).reverse();
  }
  return {
    list,
    load,
    save,
    remove,
    normalizeTheme,
    createProfileBackup,
    listProfileBackups,
    loadProfileBackup,
    exportPackage,
    importPackage,
    recordActivity,
    listActivity
  };
}

module.exports = { createStore, normalizeTheme, validName };
