"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname,"..","src");
const script = fs.readFileSync(path.join(root,"first-run","first-run.js"),"utf8");
const css = fs.readFileSync(path.join(root,"first-run","first-run.css"),"utf8");
test("guided desktop tour is independently callable and skippable",()=>{
  assert.match(script,/window\.edexFirstRun=\{open,showTour\}/);
  assert.match(script,/data-skip/);
  assert.match(script,/event\.key === "Escape"/);
  assert.match(script,/const dismiss = \(\) =>/);
});
test("spotlight uses guarded target lookup and adapts to absent widgets",()=>{
  assert.match(script,/if \(!target\) \{/);
  assert.match(script,/spotlight\.hidden = true/);
  assert.match(script,/#card_cpuinfo/);
  assert.match(script,/#settings-fab/);
  assert.match(css,/\.fr-spotlight\[hidden\]/);
});
test("every supported locale has guided tour labels",()=>{
  for(const lang of ["en","de","zh-Hant"]){
    const strings=JSON.parse(fs.readFileSync(path.join(root,"locales",lang+".json"),"utf8"));
    for(const key of ["firstRun.introStep1","firstRun.introStep2","firstRun.introStep3","firstRun.introStep4","firstRun.startTour"]){
      assert.ok(strings[key], `${lang} missing ${key}`);
    }
  }
});
