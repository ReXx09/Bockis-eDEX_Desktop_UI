const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough, Writable } = require("node:stream");
const { createHardwareMonitor } = require("../lib/hardware-monitor");

function fakeSpawn(onRequest = () => ({}), { respond = true } = {}) {
  const requests = [];
  const child = new EventEmitter();
  child.killed = false;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(String(chunk).trim());
      requests.push(request);
      if (request.type === "stop") {
        setImmediate(() => child.emit("exit", 0, null));
      } else if (respond) {
        setImmediate(() => child.stdout.write(`${JSON.stringify({ ...onRequest(request), id: request.id })}\n`));
      }
      callback();
    }
  });
  child.kill = () => {
    child.killed = true;
    setImmediate(() => child.emit("exit", null, "SIGTERM"));
  };
  return { child, requests };
}

test("Requests live hardware snapshots from the bundled helper", async () => {
  const spawned = fakeSpawn((request) => ({
    state: "ready",
    pawnIoInstalled: true,
    pawnIoVersion: "1.0",
    sensors: [{ name: "CPU: Temperature", value: 55.5, unit: "°C" }]
  }));
  let executable;
  const monitor = createHardwareMonitor({
    platform: "win32",
    appPath: "C:\\app",
    spawnImpl: (file) => {
      executable = file;
      return spawned.child;
    }
  });

  const snapshot = await monitor.getSnapshot();

  assert.equal(executable, "C:\\app\\build\\hardware-monitor\\BockisHardwareMonitor.exe");
  assert.equal(spawned.requests.length, 1);
  assert.equal(snapshot.state, "ready");
  assert.equal(snapshot.sensors[0].value, 55.5);
  await monitor.stop();
});

test("Coalesces overlapping sensor requests", async () => {
  const spawned = fakeSpawn(() => ({ state: "waiting", sensors: [] }));
  const monitor = createHardwareMonitor({
    platform: "win32",
    spawnImpl: () => spawned.child
  });

  const first = monitor.getSnapshot();
  const second = monitor.getSnapshot();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(spawned.requests.filter((request) => request.type === "snapshot").length, 1);
  await monitor.stop();
});

test("Uses the prerequisite scan command when requested", async () => {
  const spawned = fakeSpawn(() => ({ state: "missing-driver", sensors: [] }));
  const monitor = createHardwareMonitor({
    platform: "win32",
    spawnImpl: () => spawned.child
  });

  await monitor.getSnapshot("scan");

  assert.equal(spawned.requests[0].type, "scan");
  await monitor.stop();
});

test("Reports unsupported platforms without starting the helper", async () => {
  let spawnCalled = false;
  const monitor = createHardwareMonitor({
    platform: "linux",
    spawnImpl: () => { spawnCalled = true; }
  });

  const result = await monitor.getSnapshot();

  assert.equal(result.state, "unsupported");
  assert.equal(spawnCalled, false);
});

test("Surfaces a missing helper executable", async () => {
  const monitor = createHardwareMonitor({
    platform: "win32",
    spawnImpl: () => { throw new Error("helper missing"); }
  });

  await assert.rejects(monitor.getSnapshot(), /helper missing/);
});

test("Stops a helper that times out while reading sensors", async () => {
  const spawned = fakeSpawn(() => ({}), { respond: false });
  const monitor = createHardwareMonitor({
    platform: "win32",
    timeoutMs: 5,
    spawnImpl: () => spawned.child
  });

  await assert.rejects(monitor.getSnapshot(), /Zeitüberschreitung/);
  assert.equal(spawned.child.killed, true);
  await monitor.stop();
});

test("Renders both hardware panel variants without CSV setup", () => {
  global.window = {};
  require("../src/panels/panel-registry");
  const { panelBody } = global.window.edexRendererPanels;
  const standalone = panelBody("hwinfo");
  const inspector = panelBody("hw");
  delete global.window;

  for (const markup of [standalone, inspector]) {
    assert.match(markup, /data-hardware-sensors/);
    assert.match(markup, /data-hardware-scan/);
    assert.doesNotMatch(markup, /HWiNFO|CSV wählen|data-hwinfo-csv-status/);
  }
});
