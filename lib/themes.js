const fs = require("fs");
const path = require("path");

function resolveThemesDir() {
  const candidates = [
    path.join(__dirname, "..", "assets", "themes"),
    path.join(__dirname, "../../src/assets/themes")
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "tron.json"))) return dir;
  }
  return candidates[0];
}

const themesDir = resolveThemesDir();

const WALLPAPERS = [
  { id: "grid", label: "原版網格" },
  { id: "solid", label: "純色背景" },
  { id: "scanlines", label: "掃描線" },
  { id: "radial", label: "輻射光暈" },
  { id: "hex", label: "六角場域" }
];

function listThemes() {
  try {
    return fs.readdirSync(themesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => entry.name.slice(0, -5))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function resolveThemeName(name) {
  const n = String(name || "tron").trim();
  if (listThemes().includes(n)) {
    return n;
  }
  return "tron";
}

function loadTheme(name) {
  const resolved = resolveThemeName(name);
  const file = path.join(themesDir, `${resolved}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

module.exports = { WALLPAPERS, listThemes, loadTheme, resolveThemeName, themesDir };
