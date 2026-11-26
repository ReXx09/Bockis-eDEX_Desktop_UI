"use strict";
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "src", "locales");
const langs = ["en", "de", "zh-Hant"];
const data = Object.fromEntries(langs.map(code => [code, JSON.parse(fs.readFileSync(path.join(root, `${code}.json`), "utf8"))]));
const canon = Object.keys(data.en).sort();
let errors = 0;
const placeholders = value => [...String(value).matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(x => x[1]).sort().join(",");
for (const language of langs) {
  const obj = data[language];
  for (const key of canon) {
    if (!Object.hasOwn(obj, key) || typeof obj[key] !== "string" || !obj[key].trim()) {
      console.error(`[i18n] ${language}: missing/empty ${key}`); errors++; continue;
    }
    if (placeholders(obj[key]) !== placeholders(data.en[key])) {
      console.error(`[i18n] ${language}: placeholder mismatch ${key}`); errors++;
    }
  }
  for (const extra of Object.keys(obj).filter(key => !Object.hasOwn(data.en, key))) {
    console.error(`[i18n] ${language}: unknown key ${extra}`); errors++;
  }
  const generated = fs.readFileSync(path.join(root, `${language}.js`), "utf8");
  const serialized = JSON.stringify(obj, null, 2);
  if (!generated.includes(serialized)) { console.error(`[i18n] ${language}: browser module out of date, run npm run i18n:build`); errors++; }
}
// Validate explicitly keyed DOM references in the migrated screens.
for (const file of ["src/renderer.js", "src/theme-studio.js"]) {
  const content = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  for (const [, key] of content.matchAll(/data-i18n="(settings\.[\w.]+|studio\.[\w.]+)"/g)) {
    if (!Object.hasOwn(data.en, key)) { console.error(`[i18n] ${file}: unknown UI key ${key}`); errors++; }
  }
}
// Every static panel label key must exist in the English canonical file.
for (const file of [
  "src/panels/panel-registry.js", "src/panels/calculator-panel.js",
  "src/panels/ddj-panel.js", "src/panels/cpu-rail-panel.js",
  "src/panels/cassette-panel.js", "src/panels/hardware-dashboard.js"
]) {
  const contents = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  for (const [, key] of contents.matchAll(/(?:data-i18n(?:-[\w-]+)?=|\.t\?\.\(|\.t\()\s*["'](panel\.[\w.]+)["']/g)) {
    if (!Object.hasOwn(data.en, key)) { console.error(`[i18n] ${file}: unknown key ${key}`); errors++; }
  }
}
const installer = fs.readFileSync(path.join(__dirname, "..", "build/tron_bootstrap.cs"), "utf8");
for (const [, key] of installer.matchAll(/InstallerLanguage\.(?:T|Format)\("([^"]+)"/g)) {
  if (!Object.hasOwn(data.en, key)) { console.error(`[i18n] installer: unknown key ${key}`); errors++; }
}
if (errors) { console.error(`[i18n] ${errors} error(s)`); process.exitCode = 1; }
else console.log(`[i18n] OK: ${canon.length} canonical English keys; ${langs.join(", ")} complete`);
