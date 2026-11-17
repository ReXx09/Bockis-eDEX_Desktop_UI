const test = require("node:test");
const assert = require("node:assert/strict");
const { compareVersions, versionParts } = require("../lib/update-checker");

test("Compare semantic application versions", () => {
  assert.deepEqual(versionParts("v1.2.7"), [1, 2, 7]);
  assert.equal(compareVersions("1.2.8", "1.2.7"), 1);
  assert.equal(compareVersions("1.2.7", "1.2.7"), 0);
  assert.equal(compareVersions("1.2.6", "1.2.7"), -1);
  assert.equal(compareVersions("invalid", "1.2.7"), null);
});
