"use strict";

const fs = require("fs");
const path = require("path");

const MAX_THEME_FILE_BYTES = 1024 * 1024;
const CURSOR_KEYS = new Set([
  "arrow", "help", "appstarting", "wait", "crosshair", "ibeam", "nwpen", "no",
  "sizeall", "sizens", "sizenesw", "sizenwse", "sizewe", "uparrow", "hand"
]);

function decodeThemeBuffer(buffer) {
  if (buffer.length > MAX_THEME_FILE_BYTES) {
    throw new Error("Windows-Theme-Datei ist größer als 1 MB.");
  }
  let text;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = buffer.subarray(2).toString("utf16le");
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    const bytes = Buffer.from(buffer.subarray(2));
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      const current = bytes[index];
      bytes[index] = bytes[index + 1];
      bytes[index + 1] = current;
    }
    text = bytes.toString("utf16le");
  } else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    text = buffer.subarray(3).toString("utf8");
  } else {
    const sample = buffer.subarray(0, Math.min(buffer.length, 512));
    let evenNulls = 0;
    let oddNulls = 0;
    for (let index = 0; index < sample.length; index += 1) {
      if (sample[index] === 0) {
        if (index % 2 === 0) evenNulls += 1;
        else oddNulls += 1;
      }
    }
    if (oddNulls > sample.length / 8 && evenNulls === 0) {
      text = buffer.toString("utf16le");
    } else if (evenNulls > sample.length / 8 && oddNulls === 0) {
      const bytes = Buffer.from(buffer);
      for (let index = 0; index + 1 < bytes.length; index += 2) {
        const current = bytes[index];
        bytes[index] = bytes[index + 1];
        bytes[index + 1] = current;
      }
      text = bytes.toString("utf16le");
    } else {
      text = buffer.toString("utf8");
    }
  }
  if (text.includes("\0")) throw new Error("Windows-Theme-Datei enthält ungültige Textdaten.");
  return text.replace(/^\uFEFF/, "");
}

function cleanText(value, maxLength = 512) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength);
}

function parseIni(text) {
  if (typeof text !== "string" || text.length > MAX_THEME_FILE_BYTES) {
    throw new Error("Windows-Theme-Datei ist ungültig oder größer als 1 MB.");
  }
  const sections = new Map();
  const sectionNames = new Map();
  let current = "";
  sections.set(current, new Map());
  sectionNames.set(current, current);
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      const originalName = line.slice(1, -1).trim();
      current = originalName.toLowerCase();
      if (!sections.has(current)) sections.set(current, new Map());
      sectionNames.set(current, originalName);
      continue;
    }
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = cleanText(line.slice(separator + 1), 2048);
    sections.get(current).set(key, value);
  }
  return { sections, sectionNames };
}

function parseColor(value) {
  const hexMatch = /^#?([0-9a-f]{6})$/i.exec(value || "");
  if (hexMatch) return `#${hexMatch[1].toLowerCase()}`;
  const channels = String(value || "").trim().split(/\s+/).map(Number);
  if (channels.length !== 3 || channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) {
    return null;
  }
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function sectionValues(sections, name) {
  return sections.get(name.toLowerCase()) || new Map();
}

function parseWindowsTheme(text, sourceName = "Windows.theme") {
  const parsed = parseIni(text);
  const { sections, sectionNames } = parsed;
  const themeSection = sectionValues(sections, "Theme");
  const desktop = sectionValues(sections, "Control Panel\\Desktop");
  const cursorSection = sectionValues(sections, "Control Panel\\Cursors");
  const visualStyle = sectionValues(sections, "VisualStyles");
  const rawColors = sectionValues(sections, "Control Panel\\Colors");
  const parsedColors = {};
  for (const key of ["hilight", "hottrackingcolor", "window", "windowtext", "buttonface", "buttontext", "hilighttext"]) {
    if (rawColors.has(key)) parsedColors[key] = parseColor(rawColors.get(key));
  }
  const cursors = {};
  for (const [key, value] of cursorSection) {
    if (CURSOR_KEYS.has(key) && value) cursors[key] = value;
  }
  const sounds = [];
  for (const [name, values] of sections) {
    const parts = (sectionNames.get(name) || name).split("\\");
    const appsIndex = parts.findIndex((part) => part.toLowerCase() === "apps");
    if (appsIndex < 0 || parts.length < appsIndex + 4
      || parts[parts.length - 1].toLowerCase() !== ".current") continue;
    const event = parts[appsIndex + 2];
    const sound = values.get("defaultvalue") || values.get("@") || values.get("") || "";
    if (event && sound) sounds.push({ event: cleanText(event, 128), path: cleanText(sound, 1024) });
  }

  const displayName = cleanText(themeSection.get("displayname") || path.basename(sourceName, path.extname(sourceName)));
  return {
    format: "bockis-windows-theme-import",
    version: 1,
    sourceName: cleanText(path.basename(sourceName), 255),
    displayName: displayName || "Windows-Theme",
    colors: {
      accent: parsedColors.hilight || parsedColors.hottrackingcolor || null,
      background: parsedColors.window || null,
      foreground: parsedColors.windowtext || null,
      panel: parsedColors.buttonface || null,
      entries: parsedColors
    },
    wallpaper: {
      path: cleanText(desktop.get("wallpaper"), 1024) || null,
      style: cleanText(desktop.get("wallpaperstyle"), 64) || null,
      tile: cleanText(desktop.get("tilewallpaper"), 16) || null
    },
    cursorScheme: {
      name: cleanText(cursorSection.get("scheme name"), 128) || null,
      cursors
    },
    sounds,
    visualStyle: {
      path: cleanText(visualStyle.get("path"), 1024) || null,
      colorStyle: cleanText(visualStyle.get("colorstyle"), 128) || null,
      size: cleanText(visualStyle.get("size"), 128) || null
    }
  };
}

function parseWindowsThemeFile(filePath) {
  if (typeof filePath !== "string" || path.extname(filePath).toLowerCase() !== ".theme") {
    throw new Error("Bitte eine Windows-Theme-Datei mit der Endung .theme auswählen.");
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error("Windows-Theme-Datei wurde nicht gefunden.");
  if (stat.size > MAX_THEME_FILE_BYTES) throw new Error("Windows-Theme-Datei ist größer als 1 MB.");
  return parseWindowsTheme(decodeThemeBuffer(fs.readFileSync(filePath)), path.basename(filePath));
}

module.exports = { decodeThemeBuffer, parseWindowsTheme, parseWindowsThemeFile };
