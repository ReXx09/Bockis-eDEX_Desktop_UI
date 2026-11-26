"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { verifySource, verifyArtifacts, writeChecksums, baseName, version, sha256 } = require("../scripts/release-tools");

test("release:preflight refuses missing bundled fonts", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-release-src-"));
  try { assert.throws(() => verifySource(dir), /Schriftdateien fehlen/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("release assets verify final binary, metadata and checksums", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-release-"));
  try {
    const exe = path.join(dir, baseName);
    const content = Buffer.alloc(1024 * 1024 + 100, 0);
    content.write("MZ", 0, "ascii");
    fs.writeFileSync(exe, content);
    const digest = crypto.createHash("sha512").update(content).digest("base64");
    fs.writeFileSync(path.join(dir, "latest.yml"), `version: ${version}\nfiles:\n  - url: ${baseName}\n    sha512: ${digest}\n    size: ${content.length}\npath: ${baseName}\nsha512: ${digest}\n`);
    assert.equal(verifyArtifacts(dir).size, content.length);
    const sums = writeChecksums(dir);
    const text = fs.readFileSync(sums, "utf8");
    assert.ok(text.includes(`${sha256(exe)}  ${baseName}`));
    assert.ok(text.includes("latest.yml"));
    fs.writeFileSync(path.join(dir, "latest.yml"), "sha512: bogus\n");
    assert.throws(() => verifyArtifacts(dir), /latest.yml passt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
