const test = require("node:test");
const assert = require("node:assert/strict");
const { scanHwinfoPrerequisites } = require("../lib/hwinfo-prerequisites");

test("Reports HWiNFO as running when its process is detected", async () => {
  const result = await scanHwinfoPrerequisites({
    platform: "win32",
    execFileImpl: (_file, _args, _options, callback) => callback(null, JSON.stringify({
      running: { name: "HWiNFO64", path: "C:\\Tools\\HWiNFO64.exe", version: "8.42" },
      installed: []
    }))
  });

  assert.equal(result.state, "running");
  assert.equal(result.installed, true);
  assert.equal(result.running, true);
  assert.equal(result.version, "8.42");
  assert.equal(result.sensorBridgeAvailable, false);
});

test("Reports installed but stopped HWiNFO distinctly", async () => {
  const result = await scanHwinfoPrerequisites({
    platform: "win32",
    execFileImpl: (_file, _args, _options, callback) => callback(null, JSON.stringify({
      running: [],
      installed: { name: "HWiNFO64", path: "C:\\Program Files\\HWiNFO64", version: "8.42" }
    }))
  });

  assert.equal(result.state, "installed");
  assert.equal(result.running, false);
  assert.equal(result.version, "8.42");
});

test("Does not run a Windows scan on unsupported platforms", async () => {
  let called = false;
  const result = await scanHwinfoPrerequisites({
    platform: "linux",
    execFileImpl: () => { called = true; }
  });

  assert.equal(result.state, "unsupported");
  assert.equal(called, false);
});

test("Surfaces prerequisite scan failures", async () => {
  const result = await scanHwinfoPrerequisites({
    platform: "win32",
    execFileImpl: (_file, _args, _options, callback) => callback(new Error("PowerShell unavailable"))
  });

  assert.equal(result.state, "error");
  assert.match(result.error, /PowerShell unavailable/);
});
