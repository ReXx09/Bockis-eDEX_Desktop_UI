const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadSettings, refreshPresetForSave, saveSettings } = require("../lib/settings-store");

test("Preserves analog clock mode when saving unrelated settings", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-settings-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  saveSettings(dir, { clockDisplayMode: "analog" });
  saveSettings(dir, { wallpaper: "grid" });

  assert.equal(loadSettings(dir).clockDisplayMode, "analog");
});

test("Persists and validates task-panel sizing options", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-taskdock-settings-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.equal(loadSettings(dir).taskDockAutoGrow, true);
  saveSettings(dir, {
    taskDockAutoGrow: false,
    taskDockMaxWidth: 120,
    taskDockTileSize: "large",
    taskDockShowLabels: false
  });

  const settings = loadSettings(dir);
  assert.equal(settings.taskDockAutoGrow, false);
  assert.equal(settings.taskDockMaxWidth, 100);
  assert.equal(settings.taskDockTileSize, "large");
  assert.equal(settings.taskDockShowLabels, false);
});

test("Ignores the legacy HWiNFO CSV setting", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-hwinfo-settings-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const selectedLog = path.join(dir, "hwinfo-sensors.csv");
  saveSettings(dir, { hwinfoLogPath: selectedLog });

  assert.equal("hwinfoLogPath" in loadSettings(dir), false);
});

test("Persists and normalizes the weather location", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-weather-settings-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.equal(loadSettings(dir).weatherLocation, "Berlin");
  saveSettings(dir, { weatherLocation: "  Traunreut  " });
  assert.equal(loadSettings(dir).weatherLocation, "Traunreut");

  saveSettings(dir, { weatherLocation: " " });
  assert.equal(loadSettings(dir).weatherLocation, "Traunreut");
});

test("Refreshes a startup preset with the latest layout from every display", () => {
  const layoutA = { layout: { weather: { x: 10, y: 20, w: 30, h: 40 } }, uiScale: 1 };
  const layoutB = { layout: { clock: { x: 50, y: 60, w: 20, h: 15 } }, uiScale: 0.9 };
  const oldPreset = {
    name: "Desktop",
    settings: { theme: "old" },
    layout: { layout: {} },
    displayLayouts: { "1": { layout: {} } }
  };
  const settings = {
    theme: "tron",
    startupPreset: "Desktop",
    displayLayouts: { "1": layoutA, "2": layoutB },
    presets: [oldPreset, { ...oldPreset, name: "Other" }]
  };

  const updated = refreshPresetForSave(settings, "Desktop", { theme: "custom" }, 1);
  const preset = updated.find((item) => item.name === "Desktop");

  assert.deepEqual(preset.displayLayouts, { "1": layoutA, "2": layoutB });
  assert.deepEqual(preset.layout, layoutA);
  assert.equal(preset.settings.theme, "custom");
  assert.equal("displayLayouts" in preset.settings, false);
  assert.deepEqual(updated.find((item) => item.name === "Other"), settings.presets[1]);
});
