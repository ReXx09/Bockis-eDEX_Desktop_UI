"use strict";
// Build browser scripts from per-language JSON sources. No network required.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..", "src", "locales");
for (const code of ["en", "de", "zh-Hant"]) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `${code}.json`), "utf8"));
  const result = `/* Auto-generated from ${code}.json; edit JSON instead. */\nwindow.edexI18n.register(${JSON.stringify(code)}, ${JSON.stringify(messages, null, 2)});\n`;
  fs.writeFileSync(path.join(root, `${code}.js`), result);
  console.log(`Generated ${code}.js (${Object.keys(messages).length} keys)`);
}
