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
const { PathPolicy } = require("../lib/path-policy");

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

async function testRejectsInvalidImportSources() {
  const root = await temporaryRoot();
  try {
    const destination = path.join(root, "destination");
    await assert.rejects(() => importFiles(destination, ["relative.txt"]));
    await assert.rejects(() => importFiles(destination, [null]));
    await assert.rejects(() => importFiles(destination, "not-an-array"));
  } finally {
    await removeRoot(root);
  }
}

async function testRejectsOutsideRoot() {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  try {
    const journal = path.join(root, "journal.json");
    const source = path.join(outside, "secret.txt");
    await fsp.writeFile(source, "secret");

    await assert.rejects(() => executePlan({
      root,
      items: [{ name: "secret.txt", path: source, isDirectory: false, category: "documents" }]
    }, {}, journal));
    assert.equal(fs.existsSync(source), true);
  } finally {
    await removeRoot(root);
    await removeRoot(outside);
  }
}

async function testRejectsSymlinkedSource() {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  try {
    const link = path.join(root, "linked");
    try {
      await fsp.symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) return;
      throw error;
    }

    await assert.rejects(() => executePlan({
      root,
      items: [{ name: "linked", path: link, isDirectory: true, category: "folders" }]
    }, { includeFolders: true }, path.join(root, "journal.json")));
  } finally {
    await removeRoot(root);
    await removeRoot(outside);
  }
}

async function testPathPolicy() {
  const root = await temporaryRoot();
  const outside = await temporaryRoot();
  try {
    const nested = path.join(root, "nested");
    await fsp.mkdir(nested);
    const policy = new PathPolicy();
    policy.add(root);

    assert.equal(policy.allows(root), true);
    assert.equal(policy.allows(nested), true);
    assert.equal(policy.allows(outside), false);

    const link = path.join(root, "outside-link");
    try {
      await fsp.symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
      assert.equal(policy.allows(link), false);
    } catch (error) {
      if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    }
  } finally {
    await removeRoot(root);
    await removeRoot(outside);
  }
}

(async () => {
  await testMoveAndUndo();
  await testPartialFailureCanUndo();
  await testImport();
  await testRejectsInvalidImportSources();
  await testRejectsOutsideRoot();
  await testRejectsSymlinkedSource();
  await testPathPolicy();
  console.log("organizer tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
