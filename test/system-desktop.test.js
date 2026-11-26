const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const originalExecFile = childProcess.execFile;
let failRegistryWrite = false;
let powershellCalls = 0;
childProcess.execFile = (_file, args, _options, callback) => {
  powershellCalls += 1;
  const command = args[3] || "";
  const error = failRegistryWrite && command.includes("Set-ItemProperty")
    ? new Error("simulated PowerShell failure")
    : null;
  setImmediate(() => callback(error, "", error ? "registry failure" : ""));
};
const { restoreDesktopIcons } = require("../lib/system-desktop");

test.after(() => {
  childProcess.execFile = originalExecFile;
});

test("Does not modify desktop icons when no restore backup exists", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-desktop-icons-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const callsBefore = powershellCalls;

  await restoreDesktopIcons(dir);

  assert.equal(powershellCalls, callsBefore);
});

test("Retains a desktop-icon backup when the Windows restore command fails", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-desktop-icons-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const backup = path.join(dir, "desktop-icons-backup.json");
  fs.writeFileSync(backup, JSON.stringify({ HideIcons: 0, wasHidden: false }));
  failRegistryWrite = true;
  try {
    await assert.rejects(restoreDesktopIcons(dir), /Windows-Desktop konnte nicht wiederhergestellt werden/);
  } finally {
    failRegistryWrite = false;
  }

  assert.equal(fs.existsSync(backup), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(backup, "utf8")), { HideIcons: 0, wasHidden: false });
});
