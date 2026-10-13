const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");

const electronPath = require.resolve("electron");
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: { dialog: {}, shell: {} }
};

const { executePlan, importFiles, undoLast } = require("../lib/organizer");

async function temporaryRoot() {
  return fsp.mkdtemp(path.join(os.tmpdir(), "edex-organizer-test-"));
}

async function removeRoot(root) {
  await fsp.rm(root, { recursive: true, force: true });
}

async function testMoveAndUndo() {
  const root = await temporaryRoot();
  try {
    const journal = path.join(root, "journal.json");
    const source = path.join(root, "report.txt");
    await fsp.writeFile(source, "ok");

    const result = await executePlan({
      root,
      items: [{ name: "report.txt", path: source, isDirectory: false, category: "documents" }]
    }, {}, journal);

    assert.equal(result.moved, 1);
    assert.equal(fs.existsSync(source), false);

    const undone = await undoLast(journal);
    assert.equal(undone.undone, 1);
    assert.equal(fs.existsSync(source), true);
  } finally {
    await removeRoot(root);
  }
}

async function testPartialFailureCanUndo() {
  const root = await temporaryRoot();
  try {
    const journal = path.join(root, "journal.json");
    const source = path.join(root, "first.txt");
    await fsp.writeFile(source, "ok");

    await assert.rejects(() => executePlan({
      root,
      items: [
        { name: "first.txt", path: source, isDirectory: false, category: "documents" },
        { name: "missing.txt", path: path.join(root, "missing.txt"), isDirectory: false, category: "documents" }
      ]
    }, {}, journal));

    const saved = JSON.parse(await fsp.readFile(journal, "utf8"));
    assert.equal(saved.applied.length, 1);
    const undone = await undoLast(journal);
    assert.equal(undone.undone, 1);
    assert.equal(fs.existsSync(source), true);
  } finally {
    await removeRoot(root);
  }
}

async function testImport() {
  const root = await temporaryRoot();
  try {
    const destination = path.join(root, "destination");
    const source = path.join(root, "source.txt");
    await fsp.writeFile(source, "ok");

    const result = await importFiles(destination, [source]);
    assert.equal(result.count, 1);
    assert.equal(fs.existsSync(path.join(destination, "source.txt")), true);
  } finally {
    await removeRoot(root);
  }
}

(async () => {
  await testMoveAndUndo();
  await testPartialFailureCanUndo();
  await testImport();
  console.log("organizer tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
