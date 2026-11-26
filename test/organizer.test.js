const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { executePlan, scanRoot, undoLast } = require("../lib/organizer");

test("Keeps failed undo entries available after a partial restore", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-organizer-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const organized = path.join(root, "organized");
  await fs.promises.mkdir(organized);
  const original = path.join(root, "restored.txt");
  const moved = path.join(organized, "restored.txt");
  await fs.promises.writeFile(moved, "content");
  const missingMove = {
    from: path.join(root, "missing.txt"),
    to: path.join(organized, "missing.txt"),
    name: "missing.txt",
    folder: "documents"
  };
  const journalPath = path.join(root, "journal.json");
  await fs.promises.writeFile(journalPath, JSON.stringify({
    root,
    applied: [
      { from: original, to: moved, name: "restored.txt", folder: "documents" },
      missingMove
    ]
  }));

  const result = await undoLast(journalPath);
  const remaining = JSON.parse(await fs.promises.readFile(journalPath, "utf8"));

  assert.equal(result.undone, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(fs.existsSync(original), true);
  assert.deepEqual(remaining.applied, [missingMove]);
});

test("Undo recovers a file move when writing the completed journal entry fails", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-organizer-pending-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const original = path.join(root, "notes.txt");
  const journalPath = path.join(root, "journal.json");
  await fs.promises.writeFile(original, "keep me");
  const scan = await scanRoot(root);

  const originalWriteFile = fs.promises.writeFile;
  let journalWrites = 0;
  fs.promises.writeFile = async (file, ...args) => {
    if (String(file).startsWith(`${journalPath}.`) && String(file).endsWith(".tmp")) {
      journalWrites += 1;
      if (journalWrites === 3) throw new Error("simulated journal failure");
    }
    return originalWriteFile.call(fs.promises, file, ...args);
  };
  try {
    await assert.rejects(executePlan(scan, {}, journalPath), /simulated journal failure/);
  } finally {
    fs.promises.writeFile = originalWriteFile;
  }

  const result = await undoLast(journalPath);
  assert.equal(result.undone, 1);
  assert.equal(await fs.promises.readFile(original, "utf8"), "keep me");
  assert.equal(fs.existsSync(journalPath), false);
});
