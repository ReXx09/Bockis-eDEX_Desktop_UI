const test = require("node:test");
const assert = require("node:assert/strict");
const {
  PILOT_MODS,
  WINDHAWK_STABLE_VERSION,
  assessWindhawk,
  compareVersions,
  parseVersion,
  windhawkLink
} = require("../lib/windows-style-integration");

test("Parses and compares supported Windhawk versions", () => {
  assert.deepEqual(parseVersion("v1.7.3"), [1, 7, 3]);
  assert.equal(compareVersions("1.8.0", WINDHAWK_STABLE_VERSION), 1);
  assert.equal(compareVersions("1.7.2", WINDHAWK_STABLE_VERSION), -1);
  assert.equal(compareVersions("2.0.0-alpha.8", WINDHAWK_STABLE_VERSION), 1);
  assert.equal(compareVersions("unknown", WINDHAWK_STABLE_VERSION), null);
});

test("Requires a stable Windhawk 1.x runtime and leaves pilot mods for manual management", () => {
  const missing = assessWindhawk("win32", null);
  assert.equal(missing.runtime, "missing");
  assert.ok(missing.mods.every((mod) => mod.status === "requires-windhawk"));

  const stable = assessWindhawk("win32", { version: "1.7.3", installLocation: "C:\\Windhawk" });
  assert.equal(stable.runtime, "compatible");
  assert.equal(stable.mods.length, 2);
  assert.ok(stable.mods.every((mod) => mod.status === "manual-verification-required"));

  const preview = assessWindhawk("win32", { version: "2.0.0-alpha.8" });
  assert.equal(preview.runtime, "incompatible");
  assert.ok(preview.mods.every((mod) => mod.status === "blocked-by-runtime"));

  assert.equal(assessWindhawk("linux", null).runtime, "unsupported-platform");
});

test("Only opens the known official Windhawk and pilot-mod pages", () => {
  assert.equal(windhawkLink("install"), "https://windhawk.net/");
  for (const mod of PILOT_MODS) assert.equal(windhawkLink(mod.id), mod.url);
  assert.throws(() => windhawkLink("https://example.invalid"), /Unbekannter Windhawk-Link/);
});
