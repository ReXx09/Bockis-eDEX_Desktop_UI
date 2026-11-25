const fs = require("fs");
const path = require("path");
const { FEATURES } = require("./windows-theme-manager");

const LEGACY_VALUE_LOCATIONS = Object.freeze({
  AccentColor: ["HKCU\\Software\\Microsoft\\Windows\\DWM", "AccentColor"],
  ColorPrevalence: ["HKCU\\Software\\Microsoft\\Windows\\DWM", "ColorPrevalence"],
  AppsUseLightTheme: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "AppsUseLightTheme"],
  SystemUsesLightTheme: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "SystemUsesLightTheme"],
  EnableTransparency: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "EnableTransparency"],
  TaskbarAl: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "TaskbarAl"],
  TaskbarSi: ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", "TaskbarSi"]
});
const MANAGED_ENTRY_IDS = new Set(Object.values(FEATURES)
  .flatMap((feature) => feature.values.map((entry) => entryId(entry.key, entry.name))));

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

function normalizeTransaction(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1 || typeof raw.backupExisted !== "boolean"
    || !raw.previous || typeof raw.previous !== "object" || Array.isArray(raw.previous)) {
    throw new Error("Windows-Theme-Transaktionsjournal hat ein ungültiges Format.");
  }
  const previous = {};
  for (const [id, value] of Object.entries(raw.previous)) {
    if (!value || typeof value !== "object" || typeof value.key !== "string" || typeof value.name !== "string") {
      throw new Error("Windows-Theme-Transaktionsjournal enthält einen ungültigen Registry-Eintrag.");
    }
    if (id !== entryId(value.key, value.name) || !MANAGED_ENTRY_IDS.has(id)) {
      throw new Error("Windows-Theme-Transaktionsjournal enthält einen nicht verwalteten Registry-Eintrag.");
    }
    previous[id] = { key: value.key, name: value.name, ...normalizeValue(value) };
  }
  return {
    version: 1,
    backupExisted: raw.backupExisted,
    backupBefore: normalizeBackup(raw.backupBefore),
    previous
  };
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

  function journalPath(file) {
    return `${file}.transaction.json`;
  }

  function restoreBackupDocument(file, backup, existed) {
    if (existed) writeJsonAtomically(file, backup);
    else if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  async function recoverPending(file) {
    const transactionFile = journalPath(file);
    if (!fs.existsSync(transactionFile)) return false;
    const transaction = normalizeTransaction(JSON.parse(fs.readFileSync(transactionFile, "utf8")));
    const entries = Object.values(transaction.previous);
    await writeValues(entries, transaction.previous);
    restoreBackupDocument(file, transaction.backupBefore, transaction.backupExisted);
    fs.unlinkSync(transactionFile);
    return true;
  }

  async function rollbackTransaction(file, transactionFile, transaction, entries, cause) {
    const failures = [];
    try {
      await writeValues(entries, transaction.previous);
    } catch (error) {
      failures.push(`Registry: ${error.message || error}`);
    }
    try {
      restoreBackupDocument(file, transaction.backupBefore, transaction.backupExisted);
    } catch (error) {
      failures.push(`Backup: ${error.message || error}`);
    }
    if (failures.length) {
      throw new Error(`${cause.message || cause}; Rollback unvollständig (${failures.join("; ")}). Transaktionsjournal bleibt zur Wiederherstellung erhalten.`);
    }
    try {
      if (fs.existsSync(transactionFile)) fs.unlinkSync(transactionFile);
    } catch (error) {
      throw new Error(`${cause.message || cause}; Rollback abgeschlossen, aber das Journal konnte nicht entfernt werden: ${error.message || error}`);
    }
    throw cause;
  }

  async function apply(file, entries, targets, commit) {
    await recoverPending(file);
    const previous = await snapshot(entries);
    const backupBefore = readBackup(file);
    const backup = JSON.parse(JSON.stringify(backupBefore));
    for (const entry of entries) {
      const id = entryId(entry.key, entry.name);
      if (!Object.prototype.hasOwnProperty.call(backup.entries, id)) {
        backup.entries[id] = previous[id];
      }
    }
    const transactionFile = journalPath(file);
    const transaction = {
      version: 1,
      backupExisted: true,
      backupBefore: backup,
      previous
    };
    writeJsonAtomically(transactionFile, transaction);
    try {
      writeJsonAtomically(file, backup);
      await writeValues(entries, targets);
      if (commit) await commit();
      fs.unlinkSync(transactionFile);
    } catch (error) {
      await rollbackTransaction(file, transactionFile, transaction, entries, error);
    }
  }

  async function restore(file, entries, commit, emergency = false) {
    if (!emergency) await recoverPending(file);
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
    const transactionFile = journalPath(file);
    const transaction = {
      version: 1,
      backupExisted: fs.existsSync(file),
      backupBefore: JSON.parse(JSON.stringify(backup)),
      previous
    };
    const originals = Object.fromEntries(ids.map((id) => [id, backup.entries[id]]));
    writeJsonAtomically(transactionFile, transaction);
    try {
      await writeValues(restorableEntries, originals);
      for (const id of ids) delete backup.entries[id];
      if (Object.keys(backup.entries).length) writeJsonAtomically(file, backup);
      else if (fs.existsSync(file)) fs.unlinkSync(file);
      if (commit) await commit();
      fs.unlinkSync(transactionFile);
      return true;
    } catch (error) {
      await rollbackTransaction(file, transactionFile, transaction, restorableEntries, error);
    }
  }

  function inspect(file) {
    const transactionFile = journalPath(file);
    let backupValid = true;
    let backupEntries = 0;
    let backupError = null;
    try {
      backupEntries = Object.keys(readBackup(file).entries).length;
    } catch (error) {
      backupValid = false;
      backupError = error.message || String(error);
    }
    let transactionValid = true;
    let transactionError = null;
    if (fs.existsSync(transactionFile)) {
      try {
        normalizeTransaction(JSON.parse(fs.readFileSync(transactionFile, "utf8")));
      } catch (error) {
        transactionValid = false;
        transactionError = error.message || String(error);
      }
    }
    return {
      backupExists: fs.existsSync(file),
      backupValid,
      backupEntries,
      pendingRecovery: fs.existsSync(transactionFile),
      transactionValid,
      error: backupError || transactionError
    };
  }

  let queue = Promise.resolve();
  function serialize(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  return {
    apply: (...args) => serialize(() => apply(...args)),
    restore: (...args) => serialize(() => restore(...args)),
    emergencyRestore: (file, entries, commit) => serialize(() => restore(file, entries, commit, true)),
    recover: (file) => serialize(() => recoverPending(file)),
    inspect
  };
}

module.exports = {
  createWindowsThemeRegistryStore,
  entryId,
  normalizeBackup,
  writeJsonAtomically
};
