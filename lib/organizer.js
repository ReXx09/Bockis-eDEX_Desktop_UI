const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { CATEGORIES, SKIP_NAMES, MANAGED_FOLDERS, categorize, archiveRel, formatBytes } = require("./categories");
const { resolveIcon, dirIcon } = require("./icons");
const { displayName, decorateItems } = require("./system-icons");
const { readTags } = require("./file-ops");

function isInside(root, target) {
  const resolvedRoot = path.resolve(root).toLowerCase();
  const resolvedTarget = path.resolve(target).toLowerCase();
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + path.sep);
}

async function uniqueDest(destPath) {
  if (!fs.existsSync(destPath)) return destPath;
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);
  let i = 1;
  while (fs.existsSync(path.join(dir, `${base} (${i})${ext}`))) i++;
  return path.join(dir, `${base} (${i})${ext}`);
}

async function isRealPathInside(root, target) {
  const [resolvedRoot, resolvedTarget] = await Promise.all([
    fsp.realpath(root),
    fsp.realpath(target)
  ]);
  return isInside(resolvedRoot, resolvedTarget);
}

async function assertNoSymlinkComponents(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (!isInside(resolvedRoot, resolvedTarget)) {
    throw new Error(`拒絕存取範圍外的路徑：${target}`);
  }

  const relative = path.relative(resolvedRoot, resolvedTarget);
  let current = resolvedRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = await fsp.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error(`拒絕經由符號連結存取路徑：${current}`);
      }
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
  }
}

async function scanRoot(root) {
  await fsp.access(root);
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name.toLowerCase())) continue;
    if (entry.isDirectory() && MANAGED_FOLDERS.has(entry.name)) continue;

    const fullPath = path.join(root, entry.name);
    let size = 0;
    let mtime = 0;
    try {
      const st = await fsp.stat(fullPath);
      size = st.size;
      mtime = st.mtimeMs;
    } catch {
      continue;
    }

    const isDirectory = entry.isDirectory();
    items.push({
      name: entry.name,
      path: fullPath,
      isDirectory,
      size,
      sizeLabel: isDirectory ? "—" : formatBytes(size),
      mtime,
      category: categorize(entry.name, isDirectory),
      icon: resolveIcon(entry.name, isDirectory)
    });
  }

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hant");
  });

  const counts = { folders: 0 };
  CATEGORIES.forEach((c) => { counts[c.id] = 0; });
  let totalSize = 0;
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
    if (!item.isDirectory) totalSize += item.size;
  }

  const destFolders = [];
  for (const name of MANAGED_FOLDERS) {
    const fullPath = path.join(root, name);
    if (!fs.existsSync(fullPath)) continue;
    destFolders.push({
      name,
      path: fullPath,
      isDirectory: true,
      size: 0,
      sizeLabel: "—",
      category: "folders",
      managed: true,
      icon: dirIcon()
    });
  }

  return {
    root,
    items,
    destFolders,
    counts,
    total: items.length,
    totalSize,
    totalSizeLabel: formatBytes(totalSize),
    scannedAt: Date.now()
  };
}

async function listFolder(root, options = {}) {
  if (!root) throw new Error("未選擇路徑");
  await fsp.access(root);
  const entries = await fsp.readdir(root, { withFileTypes: true });
  let items = [];
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name.toLowerCase())) continue;
    const fullPath = path.join(root, entry.name);
    let size = 0;
    let mtime = 0;
    try {
      const st = await fsp.stat(fullPath);
      size = st.size;
      mtime = st.mtimeMs;
    } catch {
      continue;
    }
    const isDirectory = entry.isDirectory();
    const isLnk = /\.(lnk|url)$/i.test(entry.name);
    items.push({
      name: entry.name,
      displayName: displayName(entry.name, isDirectory),
      path: fullPath,
      isDirectory,
      size,
      sizeLabel: isDirectory ? "Ordner" : isLnk ? "Verknüpfung" : formatBytes(size),
      mtime,
      category: categorize(entry.name, isDirectory),
      kind: isLnk ? "shortcut" : "item",
      icon: resolveIcon(entry.name, isDirectory),
      tags: []
    });
  }
  await Promise.all(items.map(async (item) => {
    try {
      item.tags = await readTags(item.path) || [];
    } catch {
      item.tags = [];
    }
  }));
  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
  if (options.systemIcons) {
    const fast = options.systemIcons === "fast" || options.fastIcons;
    items = await decorateItems(items, {
      skipLnkEnrich: Boolean(fast),
      preferElectron: Boolean(fast)
    });
  }
  return { root, items, total: items.length };
}

function isArchivedUnder(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const top = rel.split(path.sep)[0];
  return MANAGED_FOLDERS.has(top);
}

function buildPlan(scan, options = {}) {
  const includeFolders = Boolean(options.includeFolders);
  const destRoot = scan.root;
  const moves = [];

  for (const item of scan.items) {
    if (item.managed || isArchivedUnder(destRoot, item.path)) continue;
    if (item.isDirectory && !includeFolders) continue;
    const parts = archiveRel(item);
    const destDir = path.join(destRoot, ...parts);
    const destPath = path.join(destDir, item.name);
    if (path.resolve(item.path) === path.resolve(destPath)) continue;
    moves.push({
      from: item.path,
      to: destPath,
      destDir,
      name: item.name,
      category: item.isDirectory ? "folders" : item.category,
      folder: parts.join("/")
    });
  }

  const byFolder = {};
  for (const move of moves) {
    byFolder[move.folder] = (byFolder[move.folder] || 0) + 1;
  }

  return { moves, byFolder, count: moves.length };
}

async function executePlan(scan, options, journalPath) {
  const plan = buildPlan(scan, options);
  const realRoot = await fsp.realpath(scan.root);
  const journal = {
    at: Date.now(),
    root: scan.root,
    applied: []
  };
  await fsp.mkdir(path.dirname(journalPath), { recursive: true });
  await fsp.writeFile(journalPath, JSON.stringify(journal, null, 2), "utf8");

  for (const move of plan.moves) {
    if (!isInside(realRoot, path.resolve(move.from)) || !(await isRealPathInside(realRoot, move.from))) {
      throw new Error(`拒絕移動範圍外的檔案：${move.from}`);
    }
    await assertNoSymlinkComponents(realRoot, move.from);
    await assertNoSymlinkComponents(realRoot, move.destDir);
    await fsp.mkdir(move.destDir, { recursive: true });
    const finalTo = await uniqueDest(move.to);
    if (!isInside(realRoot, finalTo) || !(await isRealPathInside(realRoot, move.destDir))) {
      throw new Error(`拒絕寫入範圍外的路徑：${finalTo}`);
    }
    await assertNoSymlinkComponents(realRoot, finalTo);
    await fsp.rename(move.from, finalTo);
    journal.applied.push({ from: move.from, to: finalTo, name: move.name, folder: move.folder });
    await fsp.writeFile(journalPath, JSON.stringify(journal, null, 2), "utf8");
  }

  return { moved: journal.applied.length, applied: journal.applied };
}

async function undoLast(journalPath) {
  if (!fs.existsSync(journalPath)) {
    return { undone: 0, message: "沒有可還原的紀錄" };
  }
  const journal = JSON.parse(await fsp.readFile(journalPath, "utf8"));
  let undone = 0;
  const errors = [];

  for (const move of [...journal.applied].reverse()) {
    try {
      const journalRoot = await fsp.realpath(journal.root);
      if (!isInside(journalRoot, move.to) || !isInside(journalRoot, move.from)) {
        throw new Error(`拒絕還原範圍外的檔案：${move.name}`);
      }
      await assertNoSymlinkComponents(journalRoot, move.to);
      await assertNoSymlinkComponents(journalRoot, path.dirname(move.from));
      if (!fs.existsSync(move.to)) {
        errors.push(`${move.name}：目標已不存在`);
        continue;
      }
      await fsp.mkdir(path.dirname(move.from), { recursive: true });
      const restoreTo = await uniqueDest(move.from);
      await fsp.rename(move.to, restoreTo);
      undone++;
    } catch (err) {
      errors.push(`${move.name}：${err.message}`);
    }
  }

  await fsp.unlink(journalPath).catch(() => {});
  return { undone, errors, message: `已還原 ${undone} 個項目` };
}

async function importFiles(destDir, sources = []) {
  if (!destDir) throw new Error("未指定目標資料夾");
  if (!Array.isArray(sources)) throw new Error("來源檔案清單無效");
  await fsp.mkdir(destDir, { recursive: true });
  const realDestDir = await fsp.realpath(destDir);
  let count = 0;
  const paths = [];
  for (const src of sources) {
    if (typeof src !== "string" || !src.trim() || !path.isAbsolute(src)) {
      throw new Error("來源路徑無效");
    }
    const name = path.basename(src);
    const dest = await uniqueDest(path.join(realDestDir, name));
    const st = await fsp.stat(src).catch(() => null);
    if (!st) continue;
    if (st.isDirectory()) await fsp.cp(src, dest, { recursive: true });
    else await fsp.copyFile(src, dest);
    count += 1;
    paths.push(dest);
  }
  return { count, destDir, paths };
}

module.exports = { scanRoot, listFolder, importFiles, buildPlan, executePlan, undoLast, CATEGORIES, formatBytes };
