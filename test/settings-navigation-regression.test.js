'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { loadSettings, refreshPresetForSave, saveSettings } = require('../lib/settings-store');
const { createStore } = require('../lib/theme-studio-store');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/organizer.css'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src/renderer.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'build/tron_bootstrap.cs'), 'utf8');
const nsis = fs.readFileSync(path.join(root, 'build/installer.nsh'), 'utf8');
test('collapsed settings children stay hidden even with display:flex', () => {
  assert.match(css, /\.settings-navigation-children\[hidden\][\s\S]*?\{\s*display:\s*none\s*!important/);
});
test('category toggle does not implicitly activate a different settings page', () => {
  assert.doesNotMatch(renderer, /children\.querySelector\("\.settings-submenu:not\(\[hidden\]\)"\)\?\.click\(\)/);
  assert.match(renderer, /children\.hidden = !expanded;/);
});
test('bootstrap consent controls silent Windhawk setup and background launch', () => {
  assert.match(bootstrap, /selection\.WindhawkSilent = selection\.Windhawk && windhawkSilent\.Checked/);
  assert.match(bootstrap, /selection\.WindhawkTray = windhawk\.Checked && windhawkTray\.Checked/);
  assert.match(bootstrap, /Arguments = "-tray-only"/);
  assert.match(nsis, /ReadEnvStr \$1 EDEX_WINDHAWK_SILENT/);
  assert.match(nsis, /\/S \/STANDARD/);
});

function openSettingsFixture(saveSettings) {
  class Element {
    constructor() {
      this.dataset = {};
      this.classList = { add() {}, remove() {}, toggle() {} };
      this.value = '';
      this.disabled = false;
      this.inert = false;
    }
    addEventListener() {}
    append() {}
    appendChild(child) { return child; }
    insertAdjacentElement() {}
    insertBefore() {}
    setAttribute() {}
    toggleAttribute() {}
    removeAttribute() {}
    querySelector() { return null; }
    querySelectorAll() { return []; }
    remove() {}
    after() {}
  }
  const controls = new Map(Object.entries({
    '#settingsEditor': {},
    '.settings-workspace': {},
    '#settings-save-status': {},
    '#set-save': {},
    '#set-cancel': {},
    '#set-quit': {},
    '#set-icon-view': { value: 'grid' },
    '#set-theme': { value: 'blade-rexx' },
    '#set-keep-theme-wallpaper': { checked: true },
    '#set-rainmeter': { checked: false },
    '#set-wall': { value: 'grid' },
    '#set-windows-wallpaper': { value: '' },
    '#set-ui-scale': { value: '1' },
    '#set-layout-mode': { value: '2k' },
    '#set-grid': { value: '32' },
    '#set-clock-panel': { checked: false },
    '#set-rain-font': { value: '14' },
    '#set-rain-speed': { value: '1' },
    '#set-search-font': { value: '12' },
    '#set-dock': { checked: true },
    '#set-taskbar-integration': { checked: false },
    '#set-dock-frame': { value: 'rounded' },
    '#set-dock-label-color-mode': { value: 'theme' },
    '#set-dock-label-color': { value: '#00eaff' },
    '#set-start-with-windows': { checked: false },
    '#set-window-zone-enabled': { checked: true },
    '#set-zone-left': { value: '18' },
    '#set-zone-top': { value: '8' },
    '#set-zone-right': { value: '18' },
    '#set-zone-bottom': { value: '8' },
    '#set-locale': { value: 'de' },
    '#set-snap': { checked: true }
  }).map(([selector, properties]) => [selector, Object.assign(new Element(), properties)]));
  controls.set('.settings-navigation, .settings-sidebar, .settings-nav', new Element());
  controls.get('#set-save').parentElement = new Element();
  const modal = new Element();
  modal.querySelector = (selector) => controls.get(selector) || null;
  const created = [];
  let firstElement = true;
  const document = {
    getElementById: () => null,
    body: { appendChild() {} },
    createElement() {
      if (firstElement) {
        firstElement = false;
        return modal;
      }
      const element = new Element();
      created.push(element);
      return element;
    }
  };
  const closed = [];
  const messages = [];
  const errors = [];
  const noop = () => {};
  const context = {
    document,
    window: {
      innerWidth: 1920,
      edex: { saveSettings },
      edexI18n: { normalize: (value) => value, setLocale: noop }
    },
    state: {
      themes: ['blade', 'blade-rexx'], themeName: 'blade',
      wallpapers: [{ id: 'grid', label: 'Grid' }], displays: [{ id: 1 }],
      settings: { locale: 'de', wallpaper: 'grid', presets: [] },
      displayIndex: 0, primary: true, iconView: 'grid', layout: {}
    },
    PANEL_META: {},
    taskbarWindowTimer: null,
    escapeHtml: (value) => String(value),
    pageSize: () => ({ width: 1920, height: 1080 }),
    settingsGridSize: () => 32, dockEnabled: () => true,
    searchFontSize: () => 12, rainFontSize: () => 14, rainSpeed: () => 1,
    layoutMode: () => '2k', displayUiScale: () => 1,
    placeCentered: noop, showWindowZonePreview: noop,
    confirmStudioDraftClose: () => true,
    closeSettings: (confirmed) => closed.push(confirmed),
    syncDockLayout: noop, snapAllLayoutToGrid: noop,
    currentDisplayLayout: () => ({ layout: {} }),
    applyTheme: noop, applyUiMetrics: noop, applyClockMetrics: noop,
    applyRainMetrics: noop, rebuildWorkspace: noop,
    toast: (message) => messages.push(message),
    console: { error: (...args) => errors.push(args) }
  };
  const start = renderer.indexOf('function openSettings(focusPanel = "") {');
  const end = renderer.indexOf('\nfunction rebuildWorkspace()', start);
  assert.ok(start !== -1 && end > start);
  vm.runInNewContext(renderer.slice(start, end), context);
  return { context, controls, created, closed, messages, errors };
}

test('opening settings binds the footer and saves the selected custom theme', async () => {
  const patches = [];
  let finishSave;
  const pendingSave = new Promise((resolve) => { finishSave = resolve; });
  const fixture = openSettingsFixture(async (patch) => {
    patches.push(patch);
    await pendingSave;
    return { settings: patch, themeName: patch.theme, theme: {}, displays: [] };
  });
  fixture.context.openSettings('background');

  assert.equal(fixture.created.find((element) => element.className === 'settings-view-title').textContent, 'Theme & Hintergrund');
  assert.equal(typeof fixture.controls.get('#set-cancel').onclick, 'function');
  assert.equal(typeof fixture.controls.get('#set-quit').onclick, 'function');
  const button = fixture.controls.get('#set-save');
  fixture.controls.get('#set-quit').disabled = true;
  const saving = button.onclick();
  assert.equal(button.disabled, true);
  assert.equal(fixture.controls.get('#set-cancel').disabled, true);
  assert.equal(fixture.controls.get('.settings-workspace').inert, true);
  assert.match(fixture.controls.get('#settings-save-status').textContent, /werden gespeichert/);
  finishSave();
  await saving;
  assert.equal(button.disabled, false);
  assert.equal(fixture.controls.get('#set-cancel').disabled, false);
  assert.equal(fixture.controls.get('#set-quit').disabled, true);
  assert.equal(fixture.controls.get('.settings-workspace').inert, false);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].theme, 'blade-rexx');
  assert.equal(patches[0].keepThemeWallpaper, true);
  assert.deepEqual(fixture.closed, [true]);
});

test('failed settings saves remain open, report the error and can be retried', async () => {
  let shouldFail = true;
  const fixture = openSettingsFixture(async (patch) => {
    if (shouldFail) throw new Error("Error invoking remote method 'save-settings': Error: Zugriff verweigert");
    return { settings: patch, themeName: patch.theme, theme: {}, displays: [] };
  });
  fixture.context.openSettings();
  const button = fixture.controls.get('#set-save');

  await button.onclick();
  assert.equal(button.disabled, false);
  assert.equal(fixture.controls.get('.settings-workspace').inert, false);
  assert.deepEqual(fixture.closed, []);
  assert.match(fixture.controls.get('#settings-save-status').textContent, /Zugriff verweigert/);
  assert.doesNotMatch(fixture.controls.get('#settings-save-status').textContent, /Error invoking remote method/);
  assert.match(fixture.messages.at(-1), /Zugriff verweigert/);
  assert.equal(fixture.errors.length, 1);

  shouldFail = false;
  await button.onclick();
  assert.deepEqual(fixture.closed, [true]);
});

test('settings IPC persists and broadcasts a selected custom theme', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bockis-settings-theme-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(root, 'assets', 'themes'));
  store.save('blade-rexx', store.load('blade'));
  const broadcasts = [];
  let handler;
  const context = {
    ipcMain: { handle: (_channel, callback) => { handler = callback; } },
    requireTrustedWindow() {}, getSenderWindow: () => ({}), getWindowDisplayId: () => 42,
    app: { getPath: () => dir }, process: { platform: 'linux' },
    settings: loadSettings(dir), saveSettings, loadSettings, refreshPresetForSave,
    themeStudioStore: store,
    resolveThemeName: (name) => store.list().includes(name) ? name : 'tron',
    loadTheme: (name) => store.load(name), listDisplays: () => [{ id: 42 }],
    appLog: { info() {} },
    broadcast: (channel, payload) => broadcasts.push({ channel, payload }),
    rezoomAllWindows() {}, scheduleWallpaper() {}
  };
  const start = main.indexOf('ipcMain.handle("save-settings", (event, patch) => {');
  const end = main.indexOf('\nipcMain.handle("save-display-layout"', start);
  assert.ok(start !== -1 && end > start);
  vm.runInNewContext(main.slice(start, end), context);

  const payload = handler({}, {
    theme: 'blade-rexx', keepThemeWallpaper: true, gridSize: 32,
    displayLayout: { layout: {}, uiScale: 1 }
  });
  const saved = loadSettings(dir);
  assert.equal(saved.theme, 'blade-rexx');
  assert.equal(saved.keepThemeWallpaper, true);
  assert.equal(saved.displayLayouts['42'].uiScale, 1);
  assert.equal(payload.themeName, 'blade-rexx');
  assert.equal(broadcasts[0].channel, 'settings-updated');
  assert.equal(broadcasts[0].payload.themeName, 'blade-rexx');
});
