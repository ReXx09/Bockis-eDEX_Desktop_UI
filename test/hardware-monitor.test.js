const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough, Writable } = require("node:stream");
const { createHardwareMonitor } = require("../lib/hardware-monitor");
const dashboard = require("../src/panels/hardware-dashboard");

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
  global.window = { edexHardwareDashboard: dashboard };
  require("../src/panels/panel-registry");
  const { panelBody } = global.window.edexRendererPanels;
  const standalone = panelBody("hwinfo");
  const inspector = panelBody("hw");
  delete global.window;

  assert.match(standalone, /data-hardware-dashboard/);
  assert.match(inspector, /data-hardware-sensors/);
  for (const markup of [standalone, inspector]) {
    assert.match(markup, /data-hardware-scan/);
    assert.doesNotMatch(markup, /HWiNFO|CSV wählen|data-hwinfo-csv-status/);
  }
});

function sensor(hardwareType, sensorType, sensorName, value, extra = {}) {
  return {
    rootHardwareId: `/${hardwareType}/0`,
    rootHardwareType: hardwareType,
    rootHardwareName: `${hardwareType} device`,
    sensorType, sensorName, value, ...extra
  };
}

test("Assigns metrics by device and sensor type, not ambiguous device names or first matching cores", () => {
  const model = dashboard.buildModel({
    state: "ready",
    sensors: [
      sensor("Cpu", "Load", "CPU Core #1", 99),
      sensor("Cpu", "Load", "CPU Total", 21),
      sensor("Cpu", "Temperature", "CPU Core #1", 67),
      sensor("Cpu", "Temperature", "CPU Package", 39),
      sensor("Cpu", "Clock", "CPU Core #1", 3500),
      sensor("Cpu", "Power", "CPU Package", 55),
      sensor("Motherboard", "Fan", "Fan #1", 1500),
      sensor("Motherboard", "Fan", "CPU Fan", 3813),
      sensor("GpuNvidia", "Load", "GPU Memory", 12),
      sensor("GpuNvidia", "Load", "GPU Core", 4, { rootHardwareName: "Not called GPU" }),
      sensor("GpuNvidia", "Temperature", "GPU Core", 49),
      sensor("GpuNvidia", "SmallData", "GPU Memory Used", 3072),
      sensor("GpuNvidia", "SmallData", "GPU Memory Total", 24576),
      sensor("GpuNvidia", "Clock", "GPU Memory", 1755),
      sensor("Memory", "Data", "Memory Used", 18.9),
      sensor("Memory", "Data", "Memory Available", 13.1),
      sensor("Memory", "Load", "Virtual Memory", 90),
      sensor("Memory", "Load", "Memory", 59)
    ]
  });
  assert.equal(model.cpu.load, 21);
  assert.equal(model.cpu.temperature, 39);
  assert.equal(model.cpu.clock, 3500);
  assert.equal(model.cpu.power, 55);
  assert.equal(model.cpu.fan, 3813);
  assert.equal(model.gpu.load, 4);
  assert.equal(model.gpu.temperature, 49);
  assert.equal(model.vram.used, 3);
  assert.equal(model.vram.total, 24);
  assert.equal(model.vram.load, 12.5);
  assert.equal(model.vram.clock, 1755);
  assert.equal(model.ram.total, 32);
  assert.equal(model.ram.load, 59);
});

test("Keeps multiple GPUs and network adapters isolated and does not invent CPU fan readings", () => {
  const secondGpu = { rootHardwareId: "/gpu/1", rootHardwareName: "Second GPU" };
  const secondNic = { rootHardwareId: "/nic/1", rootHardwareName: "Second NIC" };
  const model = dashboard.buildModel({
    state: "ready",
    sensors: [
      sensor("GpuNvidia", "Load", "GPU Core", 4),
      sensor("GpuNvidia", "Load", "GPU Core", 85, secondGpu),
      sensor("GpuNvidia", "Fan", "GPU Fan", 1108, secondGpu),
      sensor("Network", "Throughput", "Upload Speed", 8 * 1024 ** 2),
      sensor("Network", "Throughput", "Download Speed", 3 * 1024 ** 2),
      sensor("Network", "Throughput", "Upload Speed", 0, secondNic),
      sensor("Network", "Throughput", "Download Speed", 100, secondNic),
      sensor("Motherboard", "Fan", "Fan #1", 4000)
    ]
  }, "/gpu/1");
  assert.equal(model.gpus.length, 2);
  assert.equal(model.gpu.name, "Second GPU");
  assert.equal(model.gpu.load, 85);
  assert.equal(model.gpu.fan, 1108);
  assert.equal(model.cpu.fan, null);
  assert.equal(model.networks.length, 2);
  assert.equal(model.networks[0].upload, 8 * 1024 ** 2);
  assert.equal(model.networks[1].upload, 0);
});

test("Separates logical drive capacity from physical disk temperatures", () => {
  const model = dashboard.buildModel({
    state: "ready",
    sensors: [sensor("Storage", "Temperature", "Temperature", 39)],
    drives: [
      { name: "C:\\", totalBytes: 100 * 1024 ** 3, freeBytes: 45 * 1024 ** 3 },
      { name: "D:\\", totalBytes: null, freeBytes: null, error: "Access denied" }
    ]
  });
  assert.ok(Math.abs(model.drives[0].load - 55) < 0.000001);
  assert.equal(model.drives[0].free, 45);
  assert.equal(model.drives[0].temperature, undefined);
  assert.equal(model.storage[0].temperature, 39);
  assert.equal(model.drives[1].load, null);
  assert.equal(model.drives[1].error, "Access denied");
});

test("Distinguishes zero from missing values and clears stale metrics on sensor failure", () => {
  const sensors = [
    sensor("Cpu", "Load", "CPU Total", 0),
    sensor("Cpu", "Temperature", "CPU Package", NaN),
    sensor("Memory", "Data", "Memory Used", null)
  ];
  const model = dashboard.buildModel({ state: "ready", sensors });
  assert.equal(model.cpu.load, 0);
  assert.equal(model.cpu.temperature, null);
  assert.equal(model.ram.used, null);
  assert.equal(model.ram.total, null);
  const failed = dashboard.buildModel({
    state: "error", sensors,
    drives: [{ name: "C:\\", totalBytes: 100, freeBytes: 50 }]
  });
  assert.equal(failed.cpu.load, null);
  assert.equal(failed.drives.length, 0);
});
