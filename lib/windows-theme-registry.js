const fs = require("fs");
const path = require("path");

const LEGACY_VALUE_LOCATIONS = Object.freeze({
  AccentColor: ["HKCU\\Software\\Microsoft\\Windows\\DWM", "AccentColor"],
  ColorPrevalence: ["HKCU\\Software\\Microsoft\\Windows\\DWM", "ColorPrevalence"],
  AppsUseLightTheme: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "AppsUseLightTheme"],
  SystemUsesLightTheme: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "SystemUsesLightTheme"],
  EnableTransparency: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "EnableTransparency"],
  TaskbarAl: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "TaskbarAl"],
  TaskbarSi: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "TaskbarSi"]
});

function entryId(key, name) {
  return `${String(key).toLowerCase()}|${String(name).toLowerCase()}`;
}

function normalizeValue(value) {
  if (!value || typeof value !== "object") return { exists: false };
  if (value.exists !== true) return { exists: false };
  if (value.type !== undefined && value.type !== "REG_DWORD") {
    throw new Error(`Nicht unterstützter Registry-Typ: ${value.type}`);
  }
  if (!Number.isInteger(value.data) || value.data < 0 || value.data > 0xffffffff) {
    throw new Error("Ungültiger REG_DWORD-Wert im Windows-Theme-Backup.");
  }
  return { exists: true, type: "REG_DWORD", data: value.data };
}

function normalizeBackup(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Windows-Theme-Backup hat ein ungültiges Format.");
  }
  if (raw.version === 2 && raw.entries && typeof raw.entries === "object" && !Array.isArray(raw.entries)) {
    const entries = {};
    for (const [id, value] of Object.entries(raw.entries)) {
      if (!value || typeof value !== "object" || typeof value.key !== "string" || typeof value.name !== "string") {
        throw new Error("Windows-Theme-Backup enthält einen ungültigen Registry-Eintrag.");
      }
      const expectedId = entryId(value.key, value.name);
      if (id !== expectedId) throw new Error("Windows-Theme-Backup enthält eine ungültige Eintrags-ID.");
      entries[id] = { key: value.key, name: value.name, ...normalizeValue(value) };
    }
    return { version: 2, entries };
  }

  const entries = {};
  for (const [name, rawValue] of Object.entries(raw)) {
    const location = LEGACY_VALUE_LOCATIONS[name];
    if (!location) continue;
    const [key, registryName] = location;
    const value = rawValue === null
      ? { exists: false }
      : { exists: true, type: "REG_DWORD", data: rawValue };
    const id = entryId(key, registryName);
    entries[id] = { key, name: registryName, ...normalizeValue(value) };
  }
  return { version: 2, entries };
}

function readBackup(file) {
  if (!fs.existsSync(file)) return { version: 2, entries: {} };
  return normalizeBackup(JSON.parse(fs.readFileSync(file, "utf8")));
}

function writeJsonAtomically(file, value) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(file)}.${process.pid}.${require("crypto").randomBytes(8).toString("hex")}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, "wx", 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(value, null, 2), "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function createWindowsThemeRegistryStore(adapter) {
  async function snapshot(entries) {
    const result = {};
    const values = adapter.readMany
      ? await adapter.readMany(entries)
      : await Promise.all(entries.map((entry) => adapter.read(entry.key, entry.name)));
    if (!Array.isArray(values) || values.length !== entries.length) {
      throw new Error("Windows-Registrywerte konnten nicht vollständig gelesen werden.");
    }
    for (const [index, entry] of entries.entries()) {
      const value = normalizeValue(values[index]);
      result[entryId(entry.key, entry.name)] = { key: entry.key, name: entry.name, ...value };
    }
    return result;
  }

  async function writeValues(entries, values) {
    for (const entry of entries) {
      const value = values[entryId(entry.key, entry.name)];
      const success = value.exists
        ? await adapter.write(entry.key, entry.name, value.data)
        : await adapter.remove(entry.key, entry.name);
      if (!success) throw new Error(`Registry-Wert konnte nicht geschrieben werden: ${entry.name}`);
    }
  }

  async function rollback(entries, previous, cause) {
    try {
      await writeValues(entries, previous);
    } catch (rollbackError) {
      throw new Error(`${cause.message || cause}; zusätzlich ist die Registry-Wiederherstellung fehlgeschlagen: ${rollbackError.message || rollbackError}`);
    }
    throw cause;
  }

  async function apply(file, entries, targets, commit) {
    const previous = await snapshot(entries);
    const backup = readBackup(file);
    for (const entry of entries) {
      const id = entryId(entry.key, entry.name);
      if (!Object.prototype.hasOwnProperty.call(backup.entries, id)) {
        backup.entries[id] = previous[id];
      }
    }
    writeJsonAtomically(file, backup);
    try {
      await writeValues(entries, targets);
      if (commit) await commit();
    } catch (error) {
      await rollback(entries, previous, error);
    }
  }

  async function restore(file, entries, commit) {
    const backup = readBackup(file);
    const restorableEntries = entries.filter((entry) => Object.prototype.hasOwnProperty.call(
      backup.entries,
      entryId(entry.key, entry.name)
    ));
    const ids = restorableEntries.map((entry) => entryId(entry.key, entry.name));
    if (!ids.length) {
      return false;
    }
    const previous = await snapshot(restorableEntries);
    const originalBackup = JSON.parse(JSON.stringify(backup));
    const backupExisted = fs.existsSync(file);
    const originals = Object.fromEntries(ids.map((id) => [id, backup.entries[id]]));
    try {
      await writeValues(restorableEntries, originals);
      for (const id of ids) delete backup.entries[id];
      if (Object.keys(backup.entries).length) writeJsonAtomically(file, backup);
      else if (fs.existsSync(file)) fs.unlinkSync(file);
      if (commit) await commit();
      return true;
    } catch (error) {
      try {
        if (backupExisted) writeJsonAtomically(file, originalBackup);
        else if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (backupError) {
        error = new Error(`${error.message || error}; zusätzlich konnte das Registry-Backup nicht zurückgesetzt werden: ${backupError.message || backupError}`);
      }
      await rollback(restorableEntries, previous, error);
    }
  }

  let queue = Promise.resolve();
  function serialize(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  return {
    apply: (...args) => serialize(() => apply(...args)),
    restore: (...args) => serialize(() => restore(...args))
  };
}

module.exports = {
  createWindowsThemeRegistryStore,
  entryId,
  normalizeBackup,
  writeJsonAtomically
};
