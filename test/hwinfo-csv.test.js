const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseHwinfoCsv, getHwinfoCsvSnapshot } = require("../lib/hwinfo-csv");

test("Parses HWiNFO two-row headers and uses the latest sensor row", () => {
  const csv = [
    'Date,Time,"CPU [#0]: AMD, Ryzen","CPU [#0]: AMD, Ryzen","GPU [#0]: NVIDIA"',
    ',,"CPU (Tctl/Tdie) [°C]","CPU Package Power [W]","GPU Temperature [°C]"',
    "2026-11-19,16:30:00,55.25,44.1,62.5",
    "2026-11-19,16:30:02,56.5,50.2,63.0"
  ].join("\r\n");
  const result = parseHwinfoCsv(csv);

  assert.equal(result.sampleAt, "2026-11-19 16:30:02");
  assert.equal(result.sensors.find((sensor) => sensor.name.includes("Tctl/Tdie")).value, 56.5);
  assert.equal(result.sensors.find((sensor) => sensor.name.includes("GPU Temperature")).unit, "°C");
  assert.equal(result.sensors.find((sensor) => sensor.name.includes("Package Power")).value, 50.2);
});

test("Parses semicolon-delimited logs with decimal commas", () => {
  const result = parseHwinfoCsv([
    "Date;Time;CPU Temperature [°C];CPU Load [%]",
    "2026-11-19;16:31:00;54,5;12,25"
  ].join("\n"));

  assert.equal(result.sensors.find((sensor) => sensor.name.includes("Temperature")).value, 54.5);
  assert.equal(result.sensors.find((sensor) => sensor.name.includes("Load")).value, 12.25);
});

test("Reads the latest record from the bounded tail of a large HWiNFO log", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-hwinfo-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "sensors.csv");
  const rows = ["Date,Time,CPU Temperature [°C]"];
  for (let index = 0; index < 12000; index += 1) {
    rows.push(`2026-11-19,16:30:${String(index % 60).padStart(2, "0")},${40 + (index % 10)}.5`);
  }
  fs.writeFileSync(file, rows.join("\r\n"), "utf8");

  const result = await getHwinfoCsvSnapshot(file);
  assert.equal(result.state, "ready");
  assert.equal(result.fileName, "sensors.csv");
  assert.equal(result.sensors[0].value, 49.5);
});

test("Reports missing and invalid HWiNFO log paths", async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-hwinfo-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  assert.equal((await getHwinfoCsvSnapshot(path.join(directory, "missing.csv"))).state, "missing");
  assert.equal((await getHwinfoCsvSnapshot(path.join(directory, "not-a-log.txt"))).state, "invalid");
});
