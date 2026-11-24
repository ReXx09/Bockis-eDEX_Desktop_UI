const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { FEATURES, normalizeFeatures } = require("../lib/windows-theme-manager");
const { createWindowsThemeRegistryStore, entryId, normalizeBackup } = require("../lib/windows-theme-registry");

function makeRegistryStore(t, initial = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-windows-theme-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const backupFile = path.join(directory, "windows-theme-backup.json");
  const values = new Map(Object.entries(initial));
  const failures = new Map();
  const store = createWindowsThemeRegistryStore({
    read: async (key, name) => values.get(entryId(key, name)) || { exists: false },
    write: async (key, name, data) => {
      const id = entryId(key, name);
      if (failures.get(id)) {
        failures.delete(id);
        return false;
      }
      values.set(id, { exists: true, type: "REG_DWORD", data });
      return true;
    },
    remove: async (key, name) => {
      values.delete(entryId(key, name));
      return true;
    }
  });
  return { backupFile, failures, store, values };
}

test("Migrates the previous flat registry backup to versioned key/value entries", () => {
  const backup = normalizeBackup({
    AccentColor: 4278255615,
    ColorPrevalence: 1,
    AppsUseLightTheme: null
  });
  assert.equal(backup.version, 2);
  assert.equal(backup.entries[entryId("HKCU\\Software\\Microsoft\\Windows\\DWM", "AccentColor")].data, 4278255615);
  assert.equal(backup.entries[entryId("HKCU\\Software\\Microsoft\\Windows\\DWM", "ColorPrevalence")].data, 1);
  assert.equal(backup.entries[entryId("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "AppsUseLightTheme")].exists, false);
});

test("Applies multiple registry values with one original snapshot and restores them", async (t) => {
  const key = "HKCU\\Software\\BockisTest";
  const entries = [
    { key, name: "Existing", value: 1 },
    { key, name: "Missing", value: 2 }
  ];
  const { backupFile, store, values } = makeRegistryStore(t, {
    [entryId(key, "Existing")]: { exists: true, type: "REG_DWORD", data: 7 }
  });
  const targets = {
    [entryId(key, "Existing")]: { exists: true, type: "REG_DWORD", data: 1 },
    [entryId(key, "Missing")]: { exists: true, type: "REG_DWORD", data: 2 }
  };

  await store.apply(backupFile, entries, targets);
  await store.apply(backupFile, entries, targets);
  assert.equal(values.get(entryId(key, "Existing")).data, 1);
  assert.equal(JSON.parse(fs.readFileSync(backupFile, "utf8")).version, 2);

  assert.equal(await store.restore(backupFile, entries), true);
  assert.equal(values.get(entryId(key, "Existing")).data, 7);
  assert.equal(values.has(entryId(key, "Missing")), false);
  assert.equal(fs.existsSync(backupFile), false);
});

test("Restores values from a legacy partial backup without touching newer values", async (t) => {
  const key = "HKCU\\Software\\Microsoft\\Windows\\DWM";
  const legacyEntry = { key, name: "ColorPrevalence", value: 1 };
  const newEntry = { key: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "ColorPrevalence", value: 1 };
  const { backupFile, store, values } = makeRegistryStore(t, {
    [entryId(key, "ColorPrevalence")]: { exists: true, type: "REG_DWORD", data: 1 },
    [entryId(newEntry.key, newEntry.name)]: { exists: true, type: "REG_DWORD", data: 0 }
  });
  fs.writeFileSync(backupFile, JSON.stringify({ ColorPrevalence: 0 }));

  assert.equal(await store.restore(backupFile, [legacyEntry, newEntry]), true);
  assert.equal(values.get(entryId(key, "ColorPrevalence")).data, 0);
  assert.equal(values.get(entryId(newEntry.key, newEntry.name)).data, 0);
});

test("Rolls back every value when a later registry write fails", async (t) => {
  const key = "HKCU\\Software\\BockisRollbackTest";
  const entries = [
    { key, name: "First", value: 1 },
    { key, name: "Second", value: 2 }
  ];
  const { backupFile, failures, store, values } = makeRegistryStore(t, {
    [entryId(key, "First")]: { exists: true, type: "REG_DWORD", data: 9 }
  });
  failures.set(entryId(key, "Second"), true);
  const targets = {
    [entryId(key, "First")]: { exists: true, type: "REG_DWORD", data: 1 },
    [entryId(key, "Second")]: { exists: true, type: "REG_DWORD", data: 2 }
  };

  await assert.rejects(store.apply(backupFile, entries, targets), /Registry-Wert konnte nicht geschrieben werden/);
  assert.equal(values.get(entryId(key, "First")).data, 9);
  assert.equal(values.has(entryId(key, "Second")), false);
  assert.equal(JSON.parse(fs.readFileSync(backupFile, "utf8")).entries[entryId(key, "First")].data, 9);
});

test("Rolls back a partial restore and preserves its backup when a restore write fails", async (t) => {
  const key = "HKCU\\Software\\BockisRestoreRollbackTest";
  const entries = [
    { key, name: "First", value: 1 },
    { key, name: "Second", value: 2 }
  ];
  const { backupFile, failures, store, values } = makeRegistryStore(t, {
    [entryId(key, "First")]: { exists: true, type: "REG_DWORD", data: 9 },
    [entryId(key, "Second")]: { exists: true, type: "REG_DWORD", data: 8 }
  });
  const targets = {
    [entryId(key, "First")]: { exists: true, type: "REG_DWORD", data: 1 },
    [entryId(key, "Second")]: { exists: true, type: "REG_DWORD", data: 2 }
  };
  await store.apply(backupFile, entries, targets);
  failures.set(entryId(key, "Second"), true);

  await assert.rejects(store.restore(backupFile, entries), /Registry-Wert konnte nicht geschrieben werden/);
  assert.equal(values.get(entryId(key, "First")).data, 1);
  assert.equal(values.get(entryId(key, "Second")).data, 2);
  assert.equal(fs.existsSync(backupFile), true);
});

test("Rolls registry values and backup state back when restore commit fails", async (t) => {
  const key = "HKCU\\Software\\BockisRestoreCommitTest";
  const entry = { key, name: "Color", value: 1 };
  const id = entryId(key, "Color");
  const { backupFile, store, values } = makeRegistryStore(t, {
    [id]: { exists: true, type: "REG_DWORD", data: 4 }
  });
  await store.apply(backupFile, [entry], {
    [id]: { exists: true, type: "REG_DWORD", data: 9 }
  });

  await assert.rejects(
    store.restore(backupFile, [entry], () => { throw new Error("settings commit failed"); }),
    /settings commit failed/
  );
  assert.equal(values.get(id).data, 9);
  assert.equal(JSON.parse(fs.readFileSync(backupFile, "utf8")).entries[id].data, 4);
});

test("Covers distinct Windows switches and migrates the former combined toggle", () => {
  assert.deepEqual(normalizeFeatures({ taskbarWindowAccent: true }).startTaskbarAccent, true);
  assert.deepEqual(normalizeFeatures({ taskbarWindowAccent: true }).windowTitleAccent, true);
  assert.ok(FEATURES.accentColor.values.some((entry) => entry.name === "AccentColorMenu"));
  assert.ok(FEATURES.accentColor.values.some((entry) => entry.name === "StartColorMenu"));
  assert.ok(FEATURES.startTaskbarAccent.values.some((entry) => entry.name === "ColorPrevalence"
    && entry.key.endsWith("\\Themes\\Personalize")));
  assert.ok(FEATURES.windowTitleAccent.values.some((entry) => entry.name === "ColorPrevalence"
    && entry.key.endsWith("\\Windows\\DWM")));
});
