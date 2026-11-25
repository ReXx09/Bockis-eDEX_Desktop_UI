"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..", "src");
const langs = ["en", "de", "zh-Hant"];
const data = Object.fromEntries(langs.map(lang => [lang, require(path.join(root, "locales", `${lang}.json`))]));
test("English canonical dictionary is fully represented across locales", () => {
  const expected = Object.keys(data.en).sort();
  assert.ok(expected.length >= 75);
  for (const lang of langs) assert.deepEqual(Object.keys(data[lang]).sort(), expected);
});
test("Keyed text uses selected locale and English fallback", () => {
  const context = {window: {}, document: {documentElement: {}}};
  for (const file of ["locales/legacy-compat.js", "i18n.js", ...langs.map(lang => `locales/${lang}.js`)]) {
    vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  const i18n = context.window.edexI18n;
  assert.equal(i18n.BASE, "en");
  i18n.setLocale("zh-Hant");
  assert.equal(i18n.t("settings.nav.startup"), "啟動與更新");
  i18n.setLocale("fr");
  assert.equal(i18n.t("settings.nav.startup"), "Startup & Updates");
  assert.equal(i18n.t("missing.key"), "[missing:missing.key]");
  assert.equal(i18n.missingKeys()[0], "missing.key");
});
