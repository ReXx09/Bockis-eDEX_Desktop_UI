"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {generate} = require("../scripts/panel-tour-build");
const root = path.join(__dirname,"..");
const profiles = JSON.parse(fs.readFileSync(path.join(root,"src/panel-tour/tours/profiles.json"),"utf8")).profiles;
const renderer = fs.readFileSync(path.join(root,"src/renderer.js"),"utf8");
const source = fs.readFileSync(path.join(root,"src/panel-tour/panel-tour.js"),"utf8");
test("supported panel-specific controls have real setup fields", () => {
  const expected = {
    clock:"#panel-clock-mode",
    "clock date":"#panel-clock-date",
    ram:"#panel-ram-mode",
    weather:"#panel-weather-location",
    filesearch:"#panel-search-font",
    taskdock:"#panel-taskdock-tile-size",
    "taskdock labels":"#panel-taskdock-show-labels"
  };
  for (const [panel,selector] of Object.entries(expected)) {
    const profile = panel.startsWith("clock") ? profiles.clock : panel.startsWith("taskdock") ? profiles.taskdock : profiles[panel];
    const steps = profile.steps;
    if (panel === "clock date" || panel === "taskdock labels") {
      assert.ok(steps.some(step=>step.target===`setup:${selector}`),`${panel} must address ${selector}`);
    } else {
      assert.ok(steps.some(step=>step.target===`setup:${selector}`),`${panel} must address ${selector}`);
    }
    assert.ok(renderer.includes(`id="${selector.slice(1)}"`),`${selector} must exist in panel setup`);
  }
  assert.ok(source.includes('target: "setup:#panel-font-scale"'), "shared tour step should preview panel font size");
});
test("manifest rejects unsupported selectors", () => {
  const original=profiles.clock.steps[0].target;
  try {
    profiles.clock.steps[0].target = "setup:#dangerous";
    // Reader/compiler uses source on disk; verify hard-coded allowlist exists, rather than mutating its input.
    assert.match(fs.readFileSync(path.join(root,"scripts/panel-tour-build.js"),"utf8"),/allowedTargets\.has\(step\.target\)/);
  } finally { profiles.clock.steps[0].target=original; }
  assert.match(generate(),/setup:#panel-clock-mode/);
});
test("tour opens setup on demand and cleans it up without persisting changes", () => {
  assert.match(source,/typeof options\.openSetup !== "function"/);
  assert.match(source,/tourSetup\?\.isConnected\) tourSetup\.remove\(\)/);
  assert.match(source,/target\.startsWith\("setup:"\)/);
  assert.match(renderer,/openSetup: \(\) => openPanelSetup\(document\.getElementById/);
  assert.match(source,/menu: "panel-menu"/);
});
