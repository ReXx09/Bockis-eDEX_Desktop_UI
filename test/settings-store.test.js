const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadSettings, saveSettings } = require("../lib/settings-store");

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
