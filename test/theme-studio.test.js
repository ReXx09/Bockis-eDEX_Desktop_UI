const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createStore, normalizeTheme } = require("../lib/theme-studio-store");

test("Custom theme creation, loading, listing and deletion", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const saved = store.save("my_cyan", {
    colors: { r: 12, g: 200, b: 255, black: "#010203", light_black: "#030405" }
  });
  assert.equal(saved.name, "my_cyan");
  assert.ok(store.list().includes("my_cyan"));
  assert.equal(store.load("my_cyan").terminal.foreground, "#0cc8ff");
  store.save("my_cyan", { colors: { r: 222, g: 0, b: 5 } });
  assert.equal(fs.readdirSync(path.join(dir, "custom-themes-backups")).length, 1);
  assert.equal(store.load("my_cyan").colors.r, 222);
  store.remove("my_cyan");
  assert.ok(!store.list().includes("my_cyan"));
  assert.equal(fs.readdirSync(path.join(dir, "custom-themes-backups")).length, 2);
});

test("Protect built-in themes and reject path traversal", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  assert.throws(() => store.save("tron", { colors: {} }), /schreibgeschützt/);
  assert.throws(() => store.save("../outside", { colors: {} }), /Name/);
  assert.throws(() => store.load("../outside"), /Name/);
  assert.throws(() => store.remove("tron"), /Original/);
});

test("Normalize invalid values without injecting arbitrary style strings", () => {
  const result = normalizeTheme({
    colors: { r: 999, g: 42, b: 14, black: "url(file:///x)", grey: "#AbCdEf" },
    panelStyle: "url(javascript:alert(1))",
    cssvars: { font_main: "url(file:///x)" },
    terminal: { fontFamily: "url(file:///x)", cursorStyle: "url(file:///x)", background: "url(file:///x)" }
  });
  assert.equal(result.colors.r, 0);
  assert.equal(result.colors.grey, "#abcdef");
  assert.equal(result.colors.black, "#000000");
  assert.equal(result.terminal.foreground, "#002a0e");
  assert.equal(result.panelStyle, "square");
  assert.equal(result.cssvars.font_main, "United Sans Medium");
  assert.equal(result.terminal.fontFamily, "Fira Mono");
  assert.equal(result.terminal.cursorStyle, "block");
  assert.equal(result.terminal.background, "#05080d");
});

test("Preserves editor-unmanaged theme fields through normalization and save", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-preserve-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const source = {
    colors: { r: 12, g: 34, b: 56, customPalette: { warning: "#abcdef" } },
    cssvars: { font_main: "Rajdhani", font_main_light: "Rajdhani Light", customFontVar: "preserve-me" },
    terminal: { fontFamily: "Cascadia Mono", cursorStyle: "bar", customTerminalOption: { enabled: true } },
    globe: { base: "#123456", marker: "#234567", pin: "#345678", satellite: "#456789", customGlobeOption: 7 },
    customFeature: { enabled: true, values: ["keep", "all"] }
  };

  const normalized = normalizeTheme(source);
  store.save("preserved_theme", normalized);
  const saved = store.load("preserved_theme");

  assert.deepEqual(saved.customFeature, source.customFeature);
  assert.deepEqual(saved.colors.customPalette, source.colors.customPalette);
  assert.equal(saved.cssvars.font_main_light, "Rajdhani Light");
  assert.equal(saved.cssvars.customFontVar, "preserve-me");
  assert.deepEqual(saved.terminal.customTerminalOption, source.terminal.customTerminalOption);
  assert.equal(saved.globe.customGlobeOption, 7);
  assert.equal(saved.globe.base, "#123456");
});

test("Theme packages import/export validated theme data and desktop options", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-package-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const source = createStore(path.join(dir, "source"), assets);
  const target = createStore(path.join(dir, "target"), assets);
  source.save("custom_cyan", { colors: { r: 12, g: 200, b: 255 } });
  const packageFile = path.join(dir, "custom_cyan.json");

  source.exportPackage("custom_cyan", packageFile, { wallpaper: "gradient", gridSize: 24 });
  const imported = target.importPackage(packageFile);

  assert.equal(imported.name, "custom_cyan");
  assert.equal(imported.theme.colors.r, 12);
  assert.deepEqual(imported.desktop, { wallpaper: "gradient", gridSize: 24 });
  assert.deepEqual(target.listActivity().map((entry) => entry.action), ["import", "save"]);
});

test("Theme profile backups preserve validated themes and activity", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-backup-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  const backup = store.createProfileBackup("tron", store.load("tron"), { wallpaper: "grid" });

  assert.equal(store.listProfileBackups()[0].id, backup.id);
  assert.equal(store.loadProfileBackup(backup.id).theme.colors.r, 170);
  assert.deepEqual(store.loadProfileBackup(backup.id).settings, { wallpaper: "grid" });
  assert.throws(() => store.loadProfileBackup("../outside"), /Backup-ID/);
  assert.equal(store.listActivity()[0].action, "backup");
});
