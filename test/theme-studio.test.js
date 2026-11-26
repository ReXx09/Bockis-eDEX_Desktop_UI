const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createStore, normalizeTheme } = require("../lib/theme-studio-store");

test("Theme Studio submenu routes to independent pages without remounting", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const window = {};
  vm.runInNewContext(source, { window, document: { addEventListener() {} } });
  const calls = [];
  const root = { __bockisShowPage: (page) => { calls.push(page); return true; } };
  for (const [section, anchor, page] of [
    ["edex", "theme-library", "library"],
    ["edex", "edex-colors", "colors"],
    ["edex", "panel-design", "panels"],
    ["edex", "live-preview", "preview"],
    ["windows", "windows-manager", "windows"],
    ["windows", "windhawk", "windhawk"],
    ["desktop", "desktop", "desktop"],
    ["profiles", "profiles", "profiles"]
  ]) {
    assert.equal(window.BockisThemeStudio.selectSection(root, section, anchor), true);
    assert.equal(calls.at(-1), page);
  }
  assert.equal(window.BockisThemeStudio.selectSection({}, "edex"), false);
  assert.equal(window.BockisThemeStudio.selectSection(root, "edex"), true);
  assert.equal(calls.at(-1), "library");
  const tourCalls = [];
  assert.equal(window.BockisThemeStudio.startTour({
    __bockisStartStudioTour: (kind) => { tourCalls.push(kind); return true; }
  }, "windows"), true);
  assert.deepEqual(tourCalls, ["windows"]);
});

test("Theme Studio includes separate guided tours for theme editing and Windows recovery", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  assert.match(source,/startStudioTour\(kind\)/);
  assert.match(source,/data-id="windows-features"/);
  assert.match(source,/data-id="windows-style-status"/);
  assert.match(source,/data-id="windows-style-mods"/);
  assert.match(source,/data-id="windows-recovery-status"/);
  assert.match(source,/data-theme-setting="panelStyle"/);
  assert.match(source,/studioBootstrap\?\.settings/);
});

test("Theme Studio keeps a shared draft and moves controls into separate pages", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  assert.match(source, /while \(right\.firstChild\) previewPage\.append/);
  assert.match(source, /colorsPage\.append\(colorFields\)/);
  assert.match(source, /while \(controls\.firstChild\) panelsPage\.append/);
  assert.match(source, /previewPage\.append\(comparison\)/);
  assert.match(source, /JSON\.stringify\(theme\) !== JSON\.stringify\(originalTheme\)/);
  const css = fs.readFileSync(path.join(__dirname, "..", "src", "organizer.css"), "utf8");
  assert.match(css, /\.settings-submenu\.active/);
  assert.match(css, /\.settings-navigation-children/);
});

test("Theme Studio attaches Windows pages and their moved controls to the root", () => {
  class Element {
    constructor() {
      this.children = [];
      this.dataset = {};
      this.classList = { toggle() {} };
    }
    append(...elements) {
      for (const element of elements) {
        element.remove();
        element.parent = this;
        this.children.push(element);
      }
    }
    remove() {
      if (this.parent) {
        this.parent.children.splice(this.parent.children.indexOf(this), 1);
        this.parent = null;
      }
    }
    before(element) {
      if (!this.parent) return;
      element.remove();
      element.parent = this.parent;
      this.parent.children.splice(this.parent.children.indexOf(this), 0, element);
    }
    get firstChild() { return this.children[0]; }
    querySelector(selector) {
      return this.children.find(child => child.selector === selector)
        || this.children.map(child => child.querySelector(selector)).find(Boolean)
        || null;
    }
    querySelectorAll() { return []; }
    matches(selector) { return this.selector === selector; }
  }
  const root = new Element();
  const add = (parent, selector) => {
    const element = new Element();
    element.selector = selector;
    parent.append(element);
    return element;
  };
  const edex = add(root, '[data-section-panel="edex"]');
  const controls = add(edex, ".studio-controls");
  add(controls, '[data-studio-anchor="edex-colors"]');
  add(controls, ".studio-colors");
  add(controls, '[data-studio-anchor="panel-design"]');
  add(edex, ".studio-right");
  const windows = add(root, '[data-section-panel="windows"]');
  const imported = add(windows, '[data-id="windows-import-preview"]');
  add(windows, '[data-studio-anchor="windhawk"]');
  const mods = add(windows, '[data-id="windows-style-mods"]');
  add(root, '[data-section-panel="desktop"]');
  const profiles = add(root, '[data-section-panel="profiles"]');
  add(profiles, '[data-id="compare"]');
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  vm.runInNewContext(source.slice(source.indexOf("const legacyEdex ="), source.indexOf("const get =")),
    { root, document: { createElement: () => new Element() } });

  assert.equal(root.querySelector('[data-id="windows-import-preview"]'), imported);
  assert.equal(root.querySelector('[data-id="windows-style-mods"]'), mods);
  assert.equal(imported.parent.dataset.studioPage, "windows");
  assert.equal(mods.parent.dataset.studioPage, "windhawk");
  root.__bockisShowPage("windows");
  assert.equal(imported.parent.hidden, false);
  assert.equal(mods.parent.hidden, true);
  root.__bockisShowPage("windhawk");
  assert.equal(imported.parent.hidden, true);
  assert.equal(mods.parent.hidden, false);
});

test("Custom theme creation, loading, listing and deletion", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const saved = store.save("my_cyan", {
    colors: { r: 12, g: 200, b: 255, black: "#010203", light_black: "#030405" }
  });
  assert.equal(saved.name, "my_cyan");
  assert.ok(store.list().includes("my_cyan"));
  assert.equal(store.load("my_cyan").terminal.foreground, "#0cc8ff");
  store.save("my_cyan", { colors: { r: 222, g: 0, b: 5 } });
  assert.equal(fs.readdirSync(path.join(dir, "custom-themes-backups")).length, 1);
  assert.equal(store.load("my_cyan").colors.r, 222);
  store.remove("my_cyan");
  assert.ok(!store.list().includes("my_cyan"));
  assert.equal(fs.readdirSync(path.join(dir, "custom-themes-backups")).length, 2);
});

test("Editing a selected custom theme saves to that theme and leaves the original unchanged", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-edit-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const original = fs.readFileSync(path.join(assets, "blade.json"), "utf8");
  store.save("blade-rexx", store.load("blade"));

  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const loadStart = source.indexOf("    async function load(name) {");
  const loadEnd = source.indexOf('    root.querySelectorAll(".studio-nav [data-section]")', loadStart);
  const saveStart = source.indexOf('      if (action === "save") {');
  const saveEnd = source.indexOf('      if (action === "delete") {', saveStart);
  assert.ok(loadStart !== -1 && loadEnd > loadStart && saveStart !== -1 && saveEnd > saveStart);

  let onChange;
  const nameInput = { value: "blade", disabled: false };
  const themeDropdown = {
    value: "blade",
    disabled: false,
    options: store.list().map((name) => ({ value: name })),
    addEventListener(type, handler) { if (type === "change") onChange = handler; }
  };
  const api = {
    themeStudioLoad: async (name) => store.load(name),
    themeStudioSave: async (name, theme) => store.save(name, theme)
  };
  const context = {
    theme: store.load("blade"),
    originalTheme: store.load("blade"),
    selected: "blade",
    importedDesktop: null,
    inProgress: false,
    themeDropdown,
    root: { querySelectorAll: () => [themeDropdown, nameInput] },
    get: () => nameInput,
    api: () => api,
    window: { confirm: () => true },
    confirmDiscardDraft: () => true,
    renderWindowsImport: () => {},
    refreshInputs: () => {},
    updateDraftStatus: () => {},
    refreshList: async () => {},
    refreshProfileHistory: async () => {},
    refreshHistoryAfterCommit: async () => "",
    setThemeOptions: (themes, name) => { themeDropdown.options = themes.map((item) => ({ value: item })); themeDropdown.value = name; },
    errorMessage: (error) => error.message,
    status: () => {}
  };
  vm.runInNewContext(source.slice(loadStart, loadEnd), context);
  vm.runInNewContext(`async function saveDraft() { const action = "save"; ${source.slice(saveStart, saveEnd)} }`, context);

  themeDropdown.value = "blade-rexx";
  onChange();
  await new Promise(setImmediate);
  assert.equal(context.selected, "blade-rexx");
  assert.equal(nameInput.value, "blade-rexx");
  context.theme.colors.r = 229;
  context.theme.colors.text = "#e5cfc8";
  await context.saveDraft();

  const reopened = createStore(dir, assets).load("blade-rexx");
  assert.equal(reopened.colors.r, 229);
  assert.equal(reopened.colors.text, "#e5cfc8");
  assert.equal(fs.readFileSync(path.join(assets, "blade.json"), "utf8"), original);
  assert.equal(fs.readdirSync(path.join(dir, "custom-themes-backups")).length, 1);
});

test("Locks theme inputs during asynchronous operations and restores their previous disabled states", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const start = source.indexOf("    function busy(fn) {");
  const end = source.indexOf('    themeDropdown.addEventListener("change"', start);
  assert.ok(start !== -1 && end > start);
  const themeDropdown = { disabled: false };
  const nameInput = { disabled: false };
  const colorInput = { disabled: false };
  const previouslyDisabled = { disabled: true };
  const controls = [themeDropdown, nameInput, colorInput, previouslyDisabled];
  const context = {
    inProgress: false,
    themeDropdown,
    root: { querySelectorAll: () => controls },
    errorMessage: (error) => error.message,
    status: () => {}
  };
  vm.runInNewContext(source.slice(start, end), context);

  let finish;
  const wait = new Promise((resolve) => { finish = resolve; });
  const operation = context.busy(() => wait)();
  assert.ok(controls.every((control) => control.disabled));
  finish();
  await operation;
  assert.deepEqual(controls.map((control) => control.disabled), [false, false, false, true]);
});

test("Requires confirmation before overwriting a different custom theme", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const start = source.indexOf('      if (action === "save") {');
  const end = source.indexOf('      if (action === "delete") {', start);
  assert.ok(start !== -1 && end > start);
  let confirmed = false;
  const savedNames = [];
  const nameInput = { value: "other-custom" };
  const context = {
    selected: "blade-rexx",
    theme: { colors: { r: 12, g: 34, b: 56 } },
    originalTheme: {},
    themeDropdown: { options: [{ value: "blade-rexx" }, { value: "other-custom" }] },
    get: () => nameInput,
    window: { confirm: () => confirmed },
    api: () => ({
      themeStudioSave: async (name, theme) => {
        savedNames.push(name);
        return { name, theme, themes: ["blade-rexx", "other-custom"] };
      }
    }),
    setThemeOptions: () => {},
    refreshInputs: () => {},
    refreshList: async () => {},
    refreshProfileHistory: async () => {},
    refreshHistoryAfterCommit: async () => "",
    updateDraftStatus: () => {},
    status: () => {}
  };
  vm.runInNewContext(`async function saveDraft() { const action = "save"; ${source.slice(start, end)} }`, context);

  await context.saveDraft();
  assert.deepEqual(savedNames, []);
  confirmed = true;
  await context.saveDraft();
  assert.deepEqual(savedNames, ["other-custom"]);
});

test("Rejects case-only custom theme name collisions on case-insensitive filesystems", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-case-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  store.save("myTheme", { colors: { r: 12, g: 34, b: 56 } });
  if (!fs.existsSync(path.join(dir, "custom-themes", "MYTHEME.json"))) {
    return t.skip("The test filesystem distinguishes name casing");
  }

  assert.throws(
    () => store.save("MYTHEME", { colors: { r: 65, g: 43, b: 21 } }),
    /genauso schreiben/
  );
  assert.equal(store.load("myTheme").colors.r, 12);
  assert.ok(store.list().includes("myTheme"));
});

test("Shows a successful save and its warning when history cannot be updated", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const historyStart = source.indexOf("    async function refreshHistoryAfterCommit(warning) {");
  const historyEnd = source.indexOf("    async function refreshWindowsRecovery()", historyStart);
  const saveStart = source.indexOf('      if (action === "save") {');
  const saveEnd = source.indexOf('      if (action === "delete") {', saveStart);
  assert.ok(historyStart !== -1 && historyEnd > historyStart && saveStart !== -1 && saveEnd > saveStart);

  let warning = "Änderungsprotokoll konnte nicht aktualisiert werden.";
  let historyRequests = 0;
  const messages = [];
  const nameInput = { value: "myTheme" };
  const context = {
    selected: "myTheme",
    theme: { colors: { r: 12 } },
    themeDropdown: { options: [{ value: "myTheme" }] },
    get: () => nameInput,
    window: {},
    api: () => ({
      themeStudioSave: async (name, theme) => ({ name, theme, themes: [name], warning })
    }),
    setThemeOptions: () => {},
    refreshInputs: () => {},
    refreshProfileHistory: async () => { historyRequests++; throw new Error("history unavailable"); },
    errorMessage: (error) => error.message,
    status: (message, error) => messages.push({ message, error })
  };
  vm.runInNewContext(source.slice(historyStart, historyEnd), context);
  vm.runInNewContext(`async function saveDraft() { const action = "save"; ${source.slice(saveStart, saveEnd)} }`, context);

  await context.saveDraft();
  assert.equal(context.selected, "myTheme");
  assert.match(messages[0].message, /gespeichert.*Änderungsprotokoll/);
  assert.equal(messages[0].error, true);
  assert.equal(historyRequests, 0);

  warning = undefined;
  await context.saveDraft();
  assert.match(messages[1].message, /gespeichert.*history unavailable/);
  assert.equal(messages[1].error, true);
  assert.equal(historyRequests, 1);
});

test("Reports a saved custom theme even when the activity history is corrupt", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-history-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  const history = path.join(dir, "theme-studio-activity.json");
  fs.writeFileSync(history, "{invalid");
  t.mock.method(console, "error", () => {});

  const saved = store.save("blade-rexx", { colors: { r: 229, g: 207, b: 200 } });

  assert.equal(store.load("blade-rexx").colors.r, 229);
  assert.ok(saved.themes.includes("blade-rexx"));
  assert.match(saved.warning, /Änderungsprotokoll/);
  assert.equal(fs.readFileSync(history, "utf8"), "{invalid");
});

test("Activates a saved custom theme despite a corrupt activity history", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-activate-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  store.save("blade-rexx", { colors: { r: 229, g: 207, b: 200 } });
  fs.writeFileSync(path.join(dir, "theme-studio-activity.json"), "{invalid");
  t.mock.method(console, "error", () => {});

  const handlers = new Map();
  const events = [];
  const context = {
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    requireTrustedWindow: () => ({}),
    resolveThemeName: (name) => store.list().includes(name) ? name : "tron",
    themeStudioStore: store,
    settings: { theme: "blade" },
    app: { getPath: () => dir },
    saveSettings: (_directory, patch) => ({ theme: patch.theme }),
    loadTheme: (name) => store.load(name),
    listDisplays: () => [],
    broadcast: (channel, payload) => events.push({ channel, payload }),
    scheduleWallpaper: () => {}
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  const start = source.indexOf('ipcMain.handle("theme-studio-activate",');
  const end = source.indexOf("\nipcMain.handle(", start + 1);
  assert.ok(start !== -1 && end > start);
  vm.runInNewContext(source.slice(start, end), context);

  const result = handlers.get("theme-studio-activate")({}, "blade-rexx");

  assert.equal(result.themeName, "blade-rexx");
  assert.match(result.warning, /Änderungsprotokoll/);
  assert.equal(events.at(-1).channel, "settings-updated");
  assert.equal(events.at(-1).payload.theme.colors.r, 229);
});

test("Theme picker loads the selected draft and preserves edits when switching is cancelled", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const start = source.indexOf("    async function loadSelection(");
  const end = source.indexOf('    root.querySelectorAll(".studio-nav [data-section]")', start);
  assert.ok(start !== -1 && end > start);
  let onChange;
  let allowDiscard = true;
  let loadError = false;
  const loaded = [];
  const errors = [];
  const themeDropdown = {
    value: "blade",
    disabled: false,
    addEventListener(type, handler) { if (type === "change") onChange = handler; }
  };
  const context = {
    selected: "blade",
    inProgress: false,
    themeDropdown,
    root: { querySelectorAll: () => [themeDropdown] },
    confirmDiscardDraft: () => allowDiscard,
    errorMessage: (error) => error.message,
    status: (message, error) => errors.push({ message, error })
  };
  context.load = async (name) => {
    loaded.push(name);
    if (loadError) throw new Error("Theme nicht gefunden");
    context.selected = name;
    themeDropdown.value = name;
  };
  vm.runInNewContext(source.slice(start, end), context);

  themeDropdown.value = "blade-rexx";
  onChange();
  await new Promise(setImmediate);
  assert.equal(context.selected, "blade-rexx");
  assert.deepEqual(loaded, ["blade-rexx"]);
  assert.equal(themeDropdown.disabled, false);

  allowDiscard = false;
  themeDropdown.value = "blade";
  onChange();
  await new Promise(setImmediate);
  assert.equal(themeDropdown.value, "blade-rexx");
  assert.deepEqual(loaded, ["blade-rexx"]);

  allowDiscard = true;
  loadError = true;
  themeDropdown.value = "missing";
  onChange();
  await new Promise(setImmediate);
  assert.equal(themeDropdown.value, "blade-rexx");
  assert.deepEqual(errors.at(-1), { message: "Theme nicht gefunden", error: true });
});

test("Theme list updates preserve pending selections and synchronize the embedded studio", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");
  const start = source.indexOf("function updateAvailableThemes(");
  const end = source.indexOf("\nfunction openSettings(", start);
  assert.ok(start !== -1 && end > start);
  const state = { themes: ["blade", "tron"], themeName: "blade" };
  const select = {
    options: [{ value: "blade" }, { value: "tron" }],
    current: "blade",
    get value() { return this.current; },
    set value(value) { this.current = this.options.some((option) => option.value === value) ? value : ""; },
    replaceChildren(...options) { this.options = options; this.current = options[0]?.value || ""; }
  };
  let studioThemes;
  const studio = { __bockisSetThemeList: (themes) => { studioThemes = themes; } };
  const document = {
    querySelector: (selector) => selector === "#set-theme" ? select : studio,
    createElement: () => ({ value: "", textContent: "" })
  };
  const context = { state, document, console };
  vm.runInNewContext(source.slice(start, end), context);

  context.updateAvailableThemes(["blade", "blade-rexx", "tron"]);
  assert.deepEqual(Array.from(state.themes), ["blade", "blade-rexx", "tron"]);
  assert.equal(select.value, "blade");
  assert.deepEqual(studioThemes, ["blade", "blade-rexx", "tron"]);
  select.value = "blade-rexx";
  context.updateAvailableThemes(["blade", "blade-rexx", "new-theme", "tron"]);
  assert.equal(select.value, "blade-rexx");
  context.updateAvailableThemes(["blade", "tron"]);
  assert.equal(select.value, "blade");
});

test("Studio activation updates the open settings selection without losing unrelated pending choices", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");
  const start = source.indexOf("  window.edex.onSettingsUpdated((payload) => {");
  const end = source.indexOf("\n\n  window.edex.onReceiveWidget", start);
  assert.ok(start !== -1 && end > start);
  let onSettingsUpdated;
  const select = { value: "blade" };
  const state = { themes: ["blade", "blade-rexx"], themeName: "blade", settings: { locale: "de" } };
  const noop = () => {};
  const context = {
    state,
    document: { querySelector: () => select },
    window: { edex: { onSettingsUpdated: (handler) => { onSettingsUpdated = handler; } }, edexI18n: { setLocale: noop } },
    gridSize: () => 32, settingsGridSize: () => 32, clockScale: () => 1,
    layoutMode: () => "2k", displayUiScale: () => 1,
    applyTheme: noop, applyTerminalTheme: noop, applyUiMetrics: noop, applyClockMetrics: noop,
    applyRainMetrics: noop, updateDisplayChip: noop, renderClock: noop,
    rebuildWorkspace: noop, snapAllLayoutToGrid: noop
  };
  vm.runInNewContext(source.slice(start, end), context);
  onSettingsUpdated({ themeName: "blade-rexx", settings: { locale: "de" } });
  assert.equal(select.value, "blade-rexx");
  select.value = "blade";
  onSettingsUpdated({ themeName: "blade-rexx", settings: { locale: "de" } });
  assert.equal(select.value, "blade");
  onSettingsUpdated({ themeName: "blade-rexx", settings: { locale: "de" }, themeSelectionCommitted: true });
  assert.equal(select.value, "blade-rexx");
});

test("Closing or saving settings cannot silently discard a studio draft", () => {
  const renderer = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");
  const studioSource = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const start = renderer.indexOf("function confirmStudioDraftClose(");
  const end = renderer.indexOf("\nfunction requestPresetName(", start);
  assert.ok(start !== -1 && end > start);
  let allowed = false;
  let removed = false;
  let reset = false;
  const studio = { __bockisConfirmDiscardDraft: () => allowed };
  const modal = {
    querySelector: () => studio,
    remove: () => { removed = true; }
  };
  const context = {
    document: { getElementById: () => ({ closest: () => modal }) },
    window: { edex: { themeStudioResetPreview: () => { reset = true; return Promise.resolve(); } } },
    clearSnapGuides: () => {}
  };
  vm.runInNewContext(renderer.slice(start, end), context);
  assert.equal(context.closeSettings(), false);
  assert.equal(removed, false);
  assert.equal(reset, false);
  allowed = true;
  assert.equal(context.closeSettings(), true);
  assert.equal(removed, true);
  assert.equal(reset, true);
  assert.match(studioSource, /root\.__bockisConfirmDiscardDraft = confirmDiscardDraft/);
  assert.match(renderer, /#set-save"\)\.onclick = async \(\) => \{\s*if \(!confirmStudioDraftClose\(modal\)\) return;/);
  assert.match(renderer, /#set-cancel"\)\.onclick = \(\) => \{\s*if \(!confirmStudioDraftClose\(modal\)\) return;/);
});

test("Activating an edited theme requires saving the current draft first", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const start = source.indexOf('      if (action === "apply") {');
  const end = source.indexOf("\n    })));", start);
  assert.ok(start !== -1 && end > start);
  let dirty = true;
  const activated = [];
  const messages = [];
  const context = {
    selected: "blade-rexx",
    importedDesktop: null,
    get: () => ({ value: "blade-rexx" }),
    isDraftDirty: () => dirty,
    window: { edexI18n: { t: () => "Save changes first" } },
    status: (message, error) => messages.push({ message, error }),
    refreshProfileHistory: async () => {},
    refreshHistoryAfterCommit: async () => "",
    api: () => ({
      themeStudioActivate: async (name) => activated.push(name),
      themeStudioResetPreview: async () => {}
    })
  };
  vm.runInNewContext(`async function applyStudioTheme() { const action = "apply"; ${source.slice(start, end)} }`, context);
  await context.applyStudioTheme();
  assert.deepEqual(activated, []);
  assert.deepEqual(messages.at(-1), { message: "Save changes first", error: true });
  dirty = false;
  await context.applyStudioTheme();
  assert.deepEqual(activated, ["blade-rexx"]);
});

test("Theme IPC persists edits and broadcasts list changes for save, import, restore and delete", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-theme-selection-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const packageStore = createStore(path.join(dir, "package-source"), assets);
  packageStore.save("imported_theme", { colors: { r: 11, g: 22, b: 33 } });
  const packageFile = path.join(dir, "package.json");
  packageStore.exportPackage("imported_theme", packageFile);

  const handlers = new Map();
  const events = [];
  const context = {
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    requireTrustedWindow: () => ({}),
    themeStudioStore: store,
    listThemes: () => store.list(),
    resolveThemeName: (name) => store.list().includes(name) ? name : "tron",
    loadTheme: (name) => store.load(name),
    broadcast: (channel, payload) => events.push({ channel, payload }),
    settings: { theme: "blade" },
    app: { getPath: () => dir },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [packageFile] }) },
    themesDir: assets, fs, path,
    listDisplays: () => [],
    scheduleWallpaper: () => {},
    process: { platform: "linux" }
  };
  context.saveSettings = (_directory, patch) => ({ ...context.settings, ...patch });
  const source = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  for (const name of ["theme-studio-load", "theme-studio-save", "theme-studio-import",
    "theme-studio-restore-backup", "theme-studio-activate", "theme-studio-delete"]) {
    const start = source.indexOf(`ipcMain.handle("${name}",`);
    const end = source.indexOf("\nipcMain.handle(", start + 1);
    assert.ok(start !== -1 && end > start, name);
    vm.runInNewContext(source.slice(start, end), context);
  }
  const lastList = () => events.filter((event) => event.channel === "themes-updated").at(-1).payload;

  handlers.get("theme-studio-save")({}, { name: "blade-rexx", theme: { colors: { r: 100, g: 0, b: 0 } } });
  assert.ok(lastList().includes("blade-rexx"));
  assert.equal(handlers.get("theme-studio-load")({}, "blade-rexx").colors.r, 100);
  handlers.get("theme-studio-save")({}, { name: "blade-rexx", theme: { colors: { r: 200, g: 0, b: 0 } } });
  assert.equal(createStore(dir, assets).load("blade-rexx").colors.r, 200);
  assert.throws(() => handlers.get("theme-studio-load")({}, "missing"), /Theme nicht gefunden/);

  handlers.get("theme-studio-activate")({}, "blade-rexx");
  assert.equal(events.at(-1).payload.themeName, "blade-rexx");
  assert.equal(events.at(-1).payload.themeSelectionCommitted, true);
  await handlers.get("theme-studio-import")({});
  assert.ok(lastList().includes("imported_theme"));

  const backup = store.createProfileBackup("restored_theme", store.load("blade-rexx"), { wallpaper: "grid" });
  await handlers.get("theme-studio-restore-backup")({}, backup.id);
  assert.ok(lastList().includes("restored_theme"));
  assert.equal(context.settings.theme, "restored_theme");
  handlers.get("theme-studio-delete")({}, "blade-rexx");
  assert.ok(!lastList().includes("blade-rexx"));
  handlers.get("theme-studio-delete")({}, "restored_theme");
  assert.equal(context.settings.theme, "tron");
  assert.ok(!lastList().includes("restored_theme"));
});

test("Theme list notifications reach display windows, the standalone studio and the preload bridge", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
  const start = main.indexOf("function broadcast(channel, payload)");
  const end = main.indexOf("\nasync function checkForUpdates", start);
  assert.ok(start !== -1 && end > start);
  const received = [];
  const makeWindow = (id) => ({
    isDestroyed: () => false,
    webContents: { send: (channel, payload) => received.push({ id, channel, payload }) }
  });
  const context = {
    windows: new Map([[1, makeWindow("first")], [2, makeWindow("second")]]),
    themeStudioWindow: makeWindow("studio")
  };
  vm.runInNewContext(main.slice(start, end), context);
  context.broadcast("themes-updated", ["blade", "blade-rexx"]);
  assert.deepEqual(received.map((entry) => entry.id), ["first", "second", "studio"]);

  let api;
  const listeners = new Map();
  const calls = [];
  const preload = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");
  vm.runInNewContext(preload, {
    process: { argv: [] },
    require: () => ({
      contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
      ipcRenderer: {
        invoke: (...args) => { calls.push(args); },
        on: (channel, handler) => listeners.set(channel, handler)
      },
      webUtils: {}
    })
  });
  api.themeStudioLoad("blade-rexx");
  assert.deepEqual(calls.at(-1), ["theme-studio-load", "blade-rexx"]);
  let notification;
  api.onThemesUpdated((themes) => { notification = themes; });
  listeners.get("themes-updated")({}, ["blade", "blade-rexx"]);
  assert.deepEqual(notification, ["blade", "blade-rexx"]);
});

test("Protect built-in themes and reject path traversal", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  assert.throws(() => store.save("tron", { colors: {} }), /schreibgeschützt/);
  assert.throws(() => store.save("../outside", { colors: {} }), /Name/);
  assert.throws(() => store.load("../outside"), /Name/);
  assert.throws(() => store.remove("tron"), /Original/);
});

test("Normalize invalid values without injecting arbitrary style strings", () => {
  const result = normalizeTheme({
    colors: { r: 999, g: 42, b: 14, black: "url(file:///x)", grey: "#AbCdEf" },
    panelStyle: "url(javascript:alert(1))",
    cssvars: { font_main: "url(file:///x)" },
    terminal: { fontFamily: "url(file:///x)", cursorStyle: "url(file:///x)", background: "url(file:///x)" }
  });
  assert.equal(result.colors.r, 0);
  assert.equal(result.colors.grey, "#abcdef");
  assert.equal(result.colors.black, "#000000");
  assert.equal(result.terminal.foreground, "#002a0e");
  assert.equal(result.panelStyle, "square");
  assert.equal(result.cssvars.font_main, "United Sans Medium");
  assert.equal(result.terminal.fontFamily, "Fira Mono");
  assert.equal(result.terminal.cursorStyle, "block");
  assert.equal(result.terminal.background, "#05080d");
});

test("Preserves editor-unmanaged theme fields through normalization and save", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-preserve-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const store = createStore(dir, assets);
  const source = {
    colors: { r: 12, g: 34, b: 56, customPalette: { warning: "#abcdef" } },
    cssvars: { font_main: "Rajdhani", font_main_light: "Rajdhani Light", customFontVar: "preserve-me" },
    terminal: { fontFamily: "Cascadia Mono", cursorStyle: "bar", customTerminalOption: { enabled: true } },
    globe: { base: "#123456", marker: "#234567", pin: "#345678", satellite: "#456789", customGlobeOption: 7 },
    customFeature: { enabled: true, values: ["keep", "all"] }
  };

  const normalized = normalizeTheme(source);
  store.save("preserved_theme", normalized);
  const saved = store.load("preserved_theme");

  assert.deepEqual(saved.customFeature, source.customFeature);
  assert.deepEqual(saved.colors.customPalette, source.colors.customPalette);
  assert.equal(saved.cssvars.font_main_light, "Rajdhani Light");
  assert.equal(saved.cssvars.customFontVar, "preserve-me");
  assert.deepEqual(saved.terminal.customTerminalOption, source.terminal.customTerminalOption);
  assert.equal(saved.globe.customGlobeOption, 7);
  assert.equal(saved.globe.base, "#123456");
});

test("Theme packages import/export validated theme data and desktop options", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-package-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(__dirname, "..", "assets", "themes");
  const source = createStore(path.join(dir, "source"), assets);
  const target = createStore(path.join(dir, "target"), assets);
  source.save("custom_cyan", { colors: { r: 12, g: 200, b: 255 } });
  const packageFile = path.join(dir, "custom_cyan.json");

  source.exportPackage("custom_cyan", packageFile, { wallpaper: "gradient", gridSize: 24 });
  const imported = target.importPackage(packageFile);

  assert.equal(imported.name, "custom_cyan");
  assert.equal(imported.theme.colors.r, 12);
  assert.deepEqual(imported.desktop, { wallpaper: "gradient", gridSize: 24 });
  assert.deepEqual(target.listActivity().map((entry) => entry.action), ["import", "save"]);
});

test("Theme profile backups preserve validated themes and activity", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-studio-backup-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  const backup = store.createProfileBackup("tron", store.load("tron"), { wallpaper: "grid" });

  assert.equal(store.listProfileBackups()[0].id, backup.id);
  assert.equal(store.loadProfileBackup(backup.id).theme.colors.r, 170);
  assert.deepEqual(store.loadProfileBackup(backup.id).settings, { wallpaper: "grid" });
  assert.throws(() => store.loadProfileBackup("../outside"), /Backup-ID/);
  assert.equal(store.listActivity()[0].action, "backup");
});


test("Independent eDEX UI text color is normalized and persisted", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bockis-text-color-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir, path.join(__dirname, "..", "assets", "themes"));
  const oldTheme = normalizeTheme({ colors: { r: 204, g: 94, b: 55 } });
  assert.equal(oldTheme.colors.text, "#cc5e37");
  const customized = store.save("independent_text", { colors: { r: 204, g: 94, b: 55, text: "#AABBCC" } });
  assert.equal(customized.theme.colors.text, "#aabbcc");
  assert.equal(store.load("independent_text").colors.text, "#aabbcc");
  assert.equal(store.load("independent_text").colors.r, 204);
  assert.equal(normalizeTheme({colors:{r:0,g:0,b:0,text:"url(bad)"}}).colors.text, "#000000");
});

test("Theme Studio text color input and runtime CSS variables are independent", () => {
  const studio = fs.readFileSync(path.join(__dirname, "..", "src", "theme-studio.js"), "utf8");
  const layout = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  assert.match(studio, /Haupttext/);
  for (const role of ["Überschriften", "Sekundärer Text", "Button-Beschriftung"]) assert.ok(studio.includes(role));
  assert.match(studio, /--studio-text/);
  assert.match(layout, /--color_text_r/);
  assert.match(layout, /--color_text_g/);
  assert.match(layout, /--color_text_b/);
  const css = fs.readFileSync(path.join(__dirname, "..", "src", "organizer.css"), "utf8");
  assert.match(css, /var\(--color_text_r/);
});

test("Role-specific text colors are backward-compatible and independent", () => {
  const legacy = normalizeTheme({ colors: { r: 20, g: 40, b: 60, text: "#EEDDCC" } });
  assert.equal(legacy.colors.heading, "#eeddcc");
  assert.equal(legacy.colors.secondaryText, "#eeddcc");
  assert.equal(legacy.colors.buttonText, "#eeddcc");
  const theme = normalizeTheme({ colors: { r: 20, g: 40, b: 60, text: "#EEDDCC", heading: "#11AABB", secondaryText: "#445566", buttonText: "#778899" } });
  assert.equal(theme.colors.text, "#eeddcc");
  assert.equal(theme.colors.heading, "#11aabb");
  assert.equal(theme.colors.secondaryText, "#445566");
  assert.equal(theme.colors.buttonText, "#778899");
  assert.equal(normalizeTheme({ colors: { r: 20, g: 40, b: 60, heading: "not-a-color" } }).colors.heading, "#14283c");
});
