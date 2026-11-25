const fs = require("fs");
const path = require("path");

function canonicalPath(value) {
  const resolved = path.resolve(String(value || ""));
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function comparable(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithin(root, target) {
  const relative = path.relative(comparable(root), comparable(target));
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function hasSymlinkComponent(root, target) {
  const relative = path.relative(root, target);
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) return true;
    } catch (error) {
      if (error.code === "ENOENT") break;
      return true;
    }
  }
  return false;
}

class PathPolicy {
  constructor() {
    this.roots = new Map();
  }

  add(root) {
    if (typeof root !== "string" || !root.trim()) return null;
    const canonical = canonicalPath(root);
    this.roots.set(comparable(canonical), canonical);
    return canonical;
  }

  allows(target) {
    if (typeof target !== "string" || !target.trim()) return false;
    const canonicalTarget = canonicalPath(target);
    return [...this.roots.values()].some((root) => (
      isWithin(root, canonicalTarget)
      && !hasSymlinkComponent(root, path.resolve(target))
    ));
  }
}

module.exports = { PathPolicy, canonicalPath, isWithin };