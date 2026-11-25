const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
const required = [
  "css/boot_screen.css",
  "file-icons",
  "fonts",
  "icons/branding/logo.webp",
  "icons/file/file-icons.json",
  "misc/boot_log.txt",
  "misc/grid.json",
  "themes/tron.json",
  "vendor/encom-globe.js"
];

const missing = required.filter((entry) => !fs.existsSync(path.join(assets, entry)));
if (missing.length) {
  console.error(`[prepare-assets] missing assets: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`[prepare-assets] canonical asset tree ready (${required.length} checks)`);
