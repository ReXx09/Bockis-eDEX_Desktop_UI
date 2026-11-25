const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { undoLast } = require("../lib/organizer");

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
