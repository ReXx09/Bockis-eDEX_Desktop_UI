"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const meta = require(path.join(root, "package.json"));
const version = meta.displayVersion || meta.build?.buildVersion;
const baseName = `Bockis-eDEX-Desktop-UI-Setup-${version}.exe`;
const REQUIRED_FONTS = [
  "assets/fonts/press-start-2p.ttf",
  "assets/fonts/rajdhani-500.ttf",
  "assets/fonts/rajdhani-600.ttf",
  "assets/fonts/rajdhani-700.ttf",
  "assets/fonts/share-tech-mono.ttf"
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function sha512base64(file) {
  return crypto.createHash("sha512").update(fs.readFileSync(file)).digest("base64");
}
function verifySource(directory = root) {
  const missing = REQUIRED_FONTS.filter(name => !fs.existsSync(path.join(directory, name)));
  if (missing.length) {
    throw new Error(`Release abgebrochen: Schriftdateien fehlen:\n- ${missing.join("\n- ")}\nDie Dateien aus der Original-Projektquelle rechtmaessig wiederherstellen und neu bauen.`);
  }
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(version)) throw new Error(`Ungueltige Windows-Versionsnummer: ${version}`);
  if (meta.build?.buildVersion !== version || meta.shortVersionWindows !== version) {
    throw new Error("displayVersion, build.buildVersion und shortVersionWindows muessen identisch sein.");
  }
  const tag = process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : "";
  if (tag && tag !== `v${version}`) throw new Error(`Tag ${tag} stimmt nicht mit v${version} ueberein.`);
  return { version, fonts: REQUIRED_FONTS.length };
}
function verifyArtifacts(dist = path.join(root, "dist")) {
  const exe = path.join(dist, baseName);
  const manifest = path.join(dist, "latest.yml");
  if (!fs.existsSync(exe) || !fs.existsSync(manifest)) throw new Error("Fertiger BOCKIS-Installer oder latest.yml fehlt.");
  const stat = fs.statSync(exe);
  if (stat.size < 1024 * 1024) throw new Error("Installer ungewoehnlich klein (unter 1 MiB).");
  const header = Buffer.alloc(2);
  const fd = fs.openSync(exe, "r");
  try { fs.readSync(fd, header, 0, 2, 0); } finally { fs.closeSync(fd); }
  if (header.toString("ascii") !== "MZ") throw new Error("Installer ist keine Windows-PE-Datei.");
  const text = fs.readFileSync(manifest, "utf8");
  const digest = sha512base64(exe);
  if (!text.includes(`version: ${version}`) || !text.includes(`url: ${baseName}`) ||
      !text.includes(`path: ${baseName}`) || !text.includes(`sha512: ${digest}`) ||
      !text.includes(`size: ${stat.size}`)) {
    throw new Error("latest.yml passt nicht zum fertigen Bootstrapper. Release gestoppt.");
  }
  const unexpected = fs.readdirSync(dist).filter(x => x.endsWith(".payload.exe"));
  if (unexpected.length) throw new Error(`Unverpackte Installer-Payload gefunden: ${unexpected.join(", ")}`);
  return { exe, manifest, size: stat.size, sha256: sha256(exe) };
}
function writeChecksums(dist = path.join(root, "dist")) {
  const { exe, manifest } = verifyArtifacts(dist);
  const files = [exe, manifest];
  const output = path.join(dist, "SHA256SUMS.txt");
  fs.writeFileSync(output, files.map(file => `${sha256(file)}  ${path.basename(file)}`).join("\n") + "\n", "utf8");
  return output;
}
function main(command) {
  if (command === "preflight") {
    console.log("[release] source OK", verifySource());
  } else if (command === "verify") {
    console.log("[release] installer verified", verifyArtifacts());
  } else if (command === "checksums") {
    console.log("[release] checksum file", writeChecksums());
  } else throw new Error("Usage: node scripts/release-tools.js preflight|verify|checksums");
}
if (require.main === module) {
  try { main(process.argv[2]); } catch (error) { console.error(`[release] ${error.message}`); process.exitCode = 1; }
}
module.exports = { verifySource, verifyArtifacts, writeChecksums, sha256, baseName, version };
