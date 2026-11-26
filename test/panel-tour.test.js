"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const root = path.join(__dirname,"..");
const renderer = fs.readFileSync(path.join(root,"src/renderer.js"),"utf8");
const tour = fs.readFileSync(path.join(root,"src/panel-tour/panel-tour.js"),"utf8");
const { saveSettings, loadSettings } = require("../lib/settings-store");
test("first successful add triggers optional tour only after saving and rendering", () => {
  assert.match(renderer,/await persistLayout\(\);[\s\S]*?rebuildWorkspace\(\);[\s\S]*?state\.settings\?\.panelTours/);
  assert.match(renderer,/!tours\.seen\?\.\[id\] && !tours\.disabled\?\.\[id\]/);
});
test("panel setup has a toggle and explicit replay action", () => {
  assert.match(renderer,/id="panel-tour-auto"/);
  assert.match(renderer,/id="panel-tour-replay"/);
  assert.match(renderer,/patch\.panelTours =/);
});
test("panel tour offers individual steps and optional four common steps", () => {
  assert.match(tour,/"panel", "scale", "edge", "menu"/);
  assert.match(tour,/event\.key === "Escape"/);
  assert.match(tour,/data-skip/);
});
test("panel tour flags survive settings saves and ignore malformed values", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),"edex-tour-"));
  try {
    saveSettings(dir,{panelTours:{seen:{clock:true,"invalid!":true},disabled:{clock:true,ram:false}}});
    const settings = loadSettings(dir);
    assert.deepEqual(settings.panelTours,{seen:{clock:true},disabled:{clock:true},commonSeen:false,desktopSeen:false});
    saveSettings(dir,{theme:"matrix"});
    assert.deepEqual(loadSettings(dir).panelTours,{seen:{clock:true},disabled:{clock:true},commonSeen:false,desktopSeen:false});
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test("all supported locales contain all tour labels", () => {
  const en = JSON.parse(fs.readFileSync(path.join(root,"src/locales/en.json"),"utf8"));
  for (const lang of ["de","zh-Hant"]) {
    const values=JSON.parse(fs.readFileSync(path.join(root,`src/locales/${lang}.json`),"utf8"));
    for(const key of Object.keys(en).filter(x=>x.startsWith("panelTour."))) assert.ok(values[key],`${lang} missing ${key}`);
  }
});

test("all placeable panels have unique localized guide steps", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root,"src/panel-tour/tours/profiles.json"),"utf8"));
  const panelSource = renderer.match(/const PANEL_META = \{([\s\S]*?)\n\};/)[1];
  const expected = [...panelSource.matchAll(/^  (\w+): \{/gm)].map(m=>m[1]).filter(id=>id!=="dock").sort();
  assert.deepEqual(Object.keys(data.profiles).sort(),expected);
  for (const [id,profile] of Object.entries(data.profiles)) {
    assert.ok(profile.version>=1);
    assert.ok(profile.steps.length>=2,`${id} needs a distinct introduction`);
    for (const lang of ["en","de","zh-Hant"]) {
      const messages=JSON.parse(fs.readFileSync(path.join(root,`src/locales/${lang}.json`),"utf8"));
      for (const step of profile.steps) {
        assert.ok(messages[step.titleKey],`${lang}/${id} title missing`);
        assert.ok(messages[step.descriptionKey],`${lang}/${id} text missing`);
      }
    }
  }
});
test("common basics are saved once and manual replay stays available", () => {
  assert.match(renderer,/includeCommon = tours.commonSeen !== true/);
  assert.match(renderer,/commonSeen: true/);
  assert.match(renderer,/id="panel-tour-replay-all"/);
  assert.match(renderer,/includeCommon: false/);
  assert.match(renderer,/includeCommon: true/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"edex-common-tour-"));
  try {
    saveSettings(dir,{panelTours:{seen:{weather:true},disabled:{ram:true},commonSeen:true}});
    assert.equal(loadSettings(dir).panelTours.commonSeen,true);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test("panel guide adds a safe move exercise and a reversible panel-font practice step", () => {
  assert.match(tour,/interaction: "move-panel"/);
  assert.match(tour,/id: "common-font"/);
  assert.match(tour,/target: "setup:#panel-font-scale"/);
  assert.match(tour,/PRACTICE\[target\] === "checkbox"/);
  assert.match(renderer,/setup:#panel-taskdock-show-labels/);
  assert.match(renderer,/setup:#panel-clock-date/);
});

test("settings tour manager can launch and reset the supported guides", () => {
  assert.match(renderer,/data-tour-reset/);
  assert.match(renderer,/commonSeen: false, desktopSeen: false/);
  assert.match(renderer,/startPanelTour\(id, \{includeCommon: true\}\)/);
  assert.match(renderer,/BockisThemeStudio\?\.startTour/);
  assert.match(renderer,/openSettings\(destination\)/);
});
