"use strict";

const fs = require("fs");
const path = require("path");

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
  return {
    colors,
    cssvars: { font_main: "United Sans Medium", font_main_light: "United Sans Light" },
    terminal: {
      fontFamily: "Fira Mono",
      cursorStyle: "block",
      foreground: accent,
      background: colors.light_black,
      cursor: accent,
      cursorAccent: accent,
      selection: `rgba(${r},${g},${b},0.3)`
    },
    globe: { base: colors.black, marker: accent, pin: accent, satellite: accent }
  };
}

function createStore(userData, builtInDir) {
  const userDir = path.join(userData, "custom-themes");
  const backupDir = path.join(userData, "custom-themes-backups");
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
    return list();
  }
  return { list, load, save, remove, normalizeTheme };
}

module.exports = { createStore, normalizeTheme, validName };
