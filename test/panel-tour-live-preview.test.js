"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const load = file => fs.readFileSync(path.join(root, file), "utf8");
const tour = load("src/panel-tour/panel-tour.js");
const renderer = load("src/renderer.js");

test("all tour entry points pass the same temporary preview adapter", () => {
  assert.equal(renderer.split("preview: previewPanelTourControl").length - 1, 3);
  for (const control of ["clock-mode", "ram-mode", "weather-location", "search-font", "taskdock-tile-size"]) {
    assert.match(renderer, new RegExp(`setup:#panel-${control}`));
  }
});
test("preview is reversible and never calls a persistence API", () => {
  const section = renderer.split("function previewPanelTourControl(target, value)")[1].split("function openPanelSetup(el)")[0];
  assert.ok(section.includes("return () =>"));
  assert.doesNotMatch(section, /saveSettings\(|persistLayout\(|setRamGaugeMode\(|fetch\(/);
  assert.match(tour,/function restorePending\(\) \{\s*clearVisualPreview\(\)/);
  assert.match(tour,/practice\.dispatchEvent\(new Event\("change"/);
  assert.match(tour,/setVisualPreview\(steps\[index\]\.target, practice\.value\)/);
  assert.match(tour,/if \(success\) \{[\s\S]*?clearVisualPreview\(\)/);
});
test("weather location uses an honest temporary badge, without fetching weather", () => {
  const section = renderer.split('if (target === "setup:#panel-weather-location")')[1].split("return null;",2).slice(0,2).join("return null;");
  assert.match(section,/createElement\("div"\)/);
  assert.match(section,/badge\.remove\(\)/);
});

test("confirmed saves refresh the persisted panel appearance after removing the temporary preview", () => {
  assert.match(tour,/clearVisualPreview\(\);\s*try \{ options\.onSaved\?\.\(savedTarget\)/);
  assert.match(renderer,/function syncPanelTourSavedVisual\(target\)/);
  assert.equal(renderer.split("onSaved: syncPanelTourSavedVisual").length - 1, 3);
});
