const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseWindowsTheme, parseWindowsThemeFile } = require("../lib/windows-theme-importer");

const sampleTheme = [
  "[Theme]",
  "DisplayName=Night eDEX",
  "[Control Panel\\Desktop]",
  "Wallpaper=C:\\Windows\\Web\\Wallpaper\\theme.jpg",
  "WallpaperStyle=10",
  "TileWallpaper=0",
  "[Control Panel\\Colors]",
  "Hilight=0 120 215",
  "Window=24 32 40",
  "WindowText=240 245 250",
  "ButtonFace=40 48 56",
  "[Control Panel\\Cursors]",
  "Scheme Name=Windows Default",
  "Arrow=%SystemRoot%\\cursors\\aero_arrow.cur",
  "[AppEvents\\Schemes\\Apps\\.Default\\SystemAsterisk\\.Current]",
  "@=%SystemRoot%\\media\\Windows Notify.wav",
  "[VisualStyles]",
  "Path=%ResourceDir%\\Themes\\Aero\\Aero.msstyles",
  "ColorStyle=NormalColor",
  "Size=NormalSize"
].join("\r\n");

test("Reads supported Windows theme data without applying it", () => {
  const parsed = parseWindowsTheme(sampleTheme, "night.theme");

  assert.equal(parsed.format, "bockis-windows-theme-import");
  assert.equal(parsed.displayName, "Night eDEX");
  assert.equal(parsed.colors.accent, "#0078d7");
  assert.equal(parsed.colors.background, "#182028");
  assert.equal(parsed.colors.foreground, "#f0f5fa");
  assert.equal(parsed.wallpaper.path, "C:\\Windows\\Web\\Wallpaper\\theme.jpg");
  assert.equal(parsed.cursorScheme.name, "Windows Default");
  assert.equal(parsed.cursorScheme.cursors.arrow, "%SystemRoot%\\cursors\\aero_arrow.cur");
  assert.deepEqual(parsed.sounds, [{ event: "SystemAsterisk", path: "%SystemRoot%\\media\\Windows Notify.wav" }]);
  assert.equal(parsed.visualStyle.path, "%ResourceDir%\\Themes\\Aero\\Aero.msstyles");
});

test("Reads UTF-16LE theme files and rejects non-theme or oversized files", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-import-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "night.theme");
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(sampleTheme, "utf16le")]));

  assert.equal(parseWindowsThemeFile(file).displayName, "Night eDEX");
  assert.throws(() => parseWindowsThemeFile(path.join(directory, "night.txt")), /\.theme/);

  fs.writeFileSync(file, Buffer.alloc(1024 * 1024 + 1));
  assert.throws(() => parseWindowsThemeFile(file), /größer als 1 MB/);
});
