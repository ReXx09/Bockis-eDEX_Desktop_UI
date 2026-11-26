"use strict";
// Validates and compiles the editable panel-tour manifest for the browser.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const source = path.join(root, "src/panel-tour/tours/profiles.json");
const output = path.join(root, "src/panel-tour/panel-tour-profiles.js");
function generate() {
  const doc = JSON.parse(fs.readFileSync(source,"utf8"));
  if (doc.schemaVersion !== 1 || !doc.profiles || Array.isArray(doc.profiles)) throw new Error("Invalid tour manifest");
  const english = JSON.parse(fs.readFileSync(path.join(root,"src/locales/en.json"),"utf8"));
  for (const [id, profile] of Object.entries(doc.profiles)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id) || !Number.isInteger(profile.version) || profile.version < 1 || !Array.isArray(profile.steps) || !profile.steps.length) throw new Error(`Invalid tour: ${id}`);
    const ids = new Set();
    for (const step of profile.steps) {
      if (ids.has(step.id)) throw new Error(`Duplicate step ${id}/${step.id}`);
      ids.add(step.id);
      if (!step.titleKey || !step.descriptionKey || !english[step.titleKey] || !english[step.descriptionKey]) throw new Error(`Missing English translation for ${id}/${step.id}`);
      // Fixed panel targets only; do not inject selectors or arbitrary HTML from theme files.
      const allowedTargets = new Set(["panel", "panel-menu", "setup:#panel-zone"]);
      const setupTargets = {
        clock: ["#panel-clock-mode", "#panel-clock-date", "#panel-clock-time-format"],
        ram: ["#panel-ram-mode"],
        weather: ["#panel-weather-location"],
        filesearch: ["#panel-search-font"],
        taskdock: ["#panel-taskdock-tile-size", "#panel-taskdock-show-labels"],
        "*": ["#panel-font-scale"]
      };
      for (const selector of setupTargets[id] || []) allowedTargets.add(`setup:${selector}`);
      for (const selector of setupTargets["*"]) allowedTargets.add(`setup:${selector}`);
      if (!allowedTargets.has(step.target)) throw new Error(`Unsupported target in ${id}/${step.id}`);
    }
  }
  return `/* Generated from tours/profiles.json; edit the manifest instead. */\nwindow.edexPanelTourProfiles = Object.freeze(${JSON.stringify(doc.profiles,null,2)});\n`;
}
if (require.main === module) {
  const content = generate();
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(output) || fs.readFileSync(output,"utf8") !== content) throw new Error("Panel guide files stale: run npm run panel-tour:build");
    console.log("[panel-tour] manifest validated");
  } else {
    fs.writeFileSync(output,content);
    console.log("[panel-tour] generated profiles");
  }
}
module.exports = { generate };
