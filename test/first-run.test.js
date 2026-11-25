"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadSettings, saveSettings } = require("../lib/settings-store");

test("new user profile requires onboarding, existing profiles do not", t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bockis-first-run-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  assert.equal(loadSettings(dir).firstRun.completed,false);
  fs.writeFileSync(path.join(dir,"organizer-settings.json"),JSON.stringify({theme:"tron",locale:"de"}));
  assert.equal(loadSettings(dir).firstRun.completed,true);
});
test("first-run state remains intact when other settings are saved", t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bockis-first-run-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  saveSettings(dir,{firstRun:{completed:true,showTips:false,windowsIntegrationRequested:true},locale:"en"});
  saveSettings(dir,{snapGap:20});
  assert.deepEqual(loadSettings(dir).firstRun,{schemaVersion:1,completed:true,showTips:false,windowsIntegrationRequested:true});
});
test("first-run ignores invalid field structures", t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bockis-first-run-"));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  saveSettings(dir,{firstRun:"bad"});
  assert.deepEqual(loadSettings(dir).firstRun,{schemaVersion:1,completed:false,showTips:true,windowsIntegrationRequested:false});
});
test("all three languages contain identical first-run keys", ()=>{
  const locales=["en","de","zh-Hant"].map(lang=>JSON.parse(fs.readFileSync(path.join(__dirname,"..","src","locales",`${lang}.json`),"utf8")));
  const english=Object.keys(locales[0]).filter(k=>k.startsWith("firstRun.")).sort();
  assert.ok(english.length>=30);
  for (const loc of locales) assert.deepEqual(Object.keys(loc).filter(k=>k.startsWith("firstRun.")).sort(),english);
});
