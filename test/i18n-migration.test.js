"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const en = require("../src/locales/en.json");
const de = require("../src/locales/de.json");
const zh = require("../src/locales/zh-Hant.json");
test("new panel and installer keys exist in all supported languages", () => {
  for (const key of ["panel.clock.digital", "panel.weather.loading", "panel.actions.settings", "panel.cpu.thread", "installer.confirm.summary", "installer.windhawk.silent"]) {
    for (const dictionary of [en, de, zh]) assert.ok(dictionary[key]);
  }
  assert.equal(en["panel.cpu.thread"], "Thread {number}");
  assert.match(zh["installer.confirm.summary"], /Windhawk/);
});
test("dynamic panels use stable i18n keys and workspace is translated on rebuild", () => {
  const panel = fs.readFileSync(path.join(root,"src/panels/panel-registry.js"),"utf8");
  const renderer = fs.readFileSync(path.join(root,"src/renderer.js"),"utf8");
  assert.match(panel, /data-i18n-placeholder="panel.weather.search"/);
  assert.match(panel, /data-i18n="panel.weather.loading"/);
  assert.match(renderer, /translatePage\?\.\(document.getElementById\("workspace"\)\)/);
});
test("C# installer uses generated resources, not fixed German labels", () => {
  const boot = fs.readFileSync(path.join(root,"build/tron_bootstrap.cs"),"utf8");
  const builder = fs.readFileSync(path.join(root,"scripts/build-tron-installer.js"),"utf8");
  const generated = fs.readFileSync(path.join(root,"build/installer-language.generated.cs"),"utf8");
  assert.match(boot, /InstallerLanguage.T\("installer.shortcut.desktop"\)/);
  assert.match(boot, /InstallerLanguage.Format\("installer.confirm.summary"/);
  assert.match(builder, /languageSource/);
  assert.match(generated, /CultureInfo.CurrentUICulture/);
});
