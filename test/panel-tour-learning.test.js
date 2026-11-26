"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname,"..");
const read = file => fs.readFileSync(path.join(root,file),"utf8");
const tour=read("src/panel-tour/panel-tour.js");
const renderer=read("src/renderer.js");
const definitions=JSON.parse(read("src/panel-tour/tours/profiles.json")).profiles;
const supported={
  clock:"setup:#panel-clock-mode",
  ram:"setup:#panel-ram-mode",
  weather:"setup:#panel-weather-location",
  filesearch:"setup:#panel-search-font",
  taskdock:"setup:#panel-taskdock-tile-size"
};
test("interactive learning limits edits to existing trusted setup controls",()=>{
  for(const [panel,target] of Object.entries(supported)) {
    assert.ok(definitions[panel].steps.some(x=>x.target===target));
    assert.ok(tour.includes(`"${target}"`));
    assert.ok(renderer.includes(`id="${target.slice(7)}"`));
  }
  assert.match(tour,/Object\.hasOwn\(PRACTICE, target\)/);
  assert.match(tour,/opt\.value !== "__custom__"/);
});
test("preview is staged in setup and discarded when navigating or closing",()=>{
  assert.match(tour,/pending = \{control: practice, original: practice\.type === "checkbox" \? practice\.checked : practice\.value\}/);
  assert.match(tour,/control\.value = original/);
  assert.match(tour,/function close\(\) \{\s*if \(saving\) return;\s*restorePending\(\)/);
  assert.match(tour,/function next\(\) \{\s*if \(saving\) return;\s*restorePending\(\)/);
  assert.match(tour,/card\.querySelector\("\[data-discard\]"\)/);
});
test("only confirmed learning changes trigger normal validated panel-save action",()=>{
  assert.match(tour,/save\.click\(\)/);
  assert.match(tour,/edex:panel-setup-saved/);
  assert.match(tour,/edex:panel-setup-error/);
  assert.match(renderer,/modal\.dispatchEvent\(new Event\("edex:panel-setup-saved"\)\)/);
  assert.match(renderer,/modal\.dispatchEvent\(new Event\("edex:panel-setup-error"\)\)/);
});
test("learning UI is localized in English, German and Traditional Chinese",()=>{
  const canonical=JSON.parse(read("src/locales/en.json"));
  const keys=Object.keys(canonical).filter(key=>key.startsWith("panelTour.practice."));
  assert.equal(keys.length,6);
  for(const locale of ["en","de","zh-Hant"]) {
    const messages=JSON.parse(read(`src/locales/${locale}.json`));
    for(const key of keys) assert.ok(messages[key],`${locale}: missing ${key}`);
  }
});
