const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const https = require("node:https");
const { compareVersions, versionParts } = require("../lib/update-checker");

test("Compare semantic application versions", () => {
  assert.deepEqual(versionParts("v1.2.7"), [1, 2, 7]);
  assert.deepEqual(versionParts("v1.2.7.1"), [1, 2, 7, 1]);
  assert.equal(compareVersions("1.2.8", "1.2.7"), 1);
  assert.equal(compareVersions("1.2.7.1", "1.2.7"), 1);
  assert.equal(compareVersions("1.2.8", "1.2.7.1"), 1);
  assert.equal(compareVersions("1.2.7.1", "1.2.7.1"), 0);
  assert.equal(compareVersions("1.2.7", "1.2.7"), 0);
  assert.equal(compareVersions("1.2.6", "1.2.7"), -1);
  assert.equal(compareVersions("invalid", "1.2.7"), null);
});

test("Rejects an HTTP response that closes before its body is complete", async () => {
  const { fetchLatestRelease } = require("../lib/update-checker");
  const originalGet = https.get;
  https.get = (_options, callback) => {
    const request = new EventEmitter();
    request.setTimeout = () => {};
    request.destroy = (error) => request.emit("error", error);
    const response = new EventEmitter();
    response.complete = false;
    response.setEncoding = () => {};
    setImmediate(() => {
      callback(response);
      response.emit("data", "{\"tag_name\":");
      response.emit("aborted");
      response.emit("close");
    });
    return request;
  };
  try {
    await assert.rejects(fetchLatestRelease("owner", "repo"), /abgebrochen|unvollständig/);
  } finally {
    https.get = originalGet;
  }
});
