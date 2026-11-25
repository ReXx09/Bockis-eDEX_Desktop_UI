const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("Uses the full viewport before the workspace is mounted", () => {
  const context = {
    document: { getElementById: () => null },
    window: { innerWidth: 1530, innerHeight: 860 }
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  vm.runInNewContext(source, context);

  const workspace = context.window.edexDesktopLayout.workspaceRect();
  assert.equal(workspace.width, 1530);
  assert.equal(workspace.height, 860);
});

test("Preserves a saved bottom task position through startup normalization and mounting", () => {
  let mounted = false;
  const savedBox = { gx: 40, gy: 80, gw: 70, gh: 5, zone: "edge" };
  const state = {
    layout: { taskdock: { ...savedBox } },
    desktopEnabled: false,
    pathCards: [],
    settings: { windowZoneMargins: { left: 18, top: 5, right: 17, bottom: 6 } }
  };
  const context = {
    state,
    document: {
      getElementById: () => mounted ? { clientWidth: 1530, clientHeight: 860 } : null
    },
    window: { innerWidth: 1530, innerHeight: 860, edexRendererState: state },
    gridSize: () => 10,
    vw: (px) => px / 1530 * 100,
    vh: (px) => px / 860 * 100,
    occupiedLayoutRects: () => []
  };
  const layoutSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  vm.runInNewContext(layoutSource, context);
  Object.assign(context, context.window.edexDesktopLayout);
  const rendererSource = fs.readFileSync(path.join(__dirname, "..", "src", "renderer.js"), "utf8");
  const normalizationSource = rendererSource.slice(
    rendererSource.indexOf("function findEmptyBox("),
    rendererSource.indexOf("const workspaceRect =")
  );
  vm.runInNewContext(normalizationSource, context);

  assert.equal(context.normalizeSavedLayout(), false);
  mounted = true;
  const panel = { dataset: { panelId: "taskdock" }, style: {} };
  assert.equal(context.window.edexDesktopLayout.clampPanelToZone(panel), false);
  for (const field of ["gx", "gy", "gw", "gh"]) {
    assert.equal(state.layout.taskdock[field], savedBox[field]);
  }
  assert.equal(panel.style.top, "800px");
});

test("Keep a bottom-edge panel sized to its bottom region", () => {
  const context = {
    document: {
      getElementById: () => ({ clientWidth: 1000, clientHeight: 1000 })
    },
    window: {
      edexRendererState: {
        layout: {
          taskdock: { gx: 25, gy: 86, gw: 50, gh: 7, zone: "edge" }
        },
        settings: {
          windowZoneMargins: { left: 20, top: 20, right: 20, bottom: 20 }
        }
      }
    },
    gridSize: () => 10,
    workspaceRect: () => ({ width: 1000, height: 1000 }),
    occupiedLayoutRects: () => []
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  vm.runInNewContext(source, context);

  const panel = { dataset: { panelId: "taskdock" } };
  const result = context.window.edexDesktopLayout.findPanelZonePosition(panel);

  assert.equal(result.w, 500);
  assert.equal(result.h, 70);
});

test("Do not shrink the task panel when no edge zone fits its saved size", () => {
  const context = {
    document: {
      getElementById: () => ({ clientWidth: 1000, clientHeight: 1000 })
    },
    window: {
      edexRendererState: {
        layout: {
          taskdock: { gx: 25, gy: 86, gw: 50, gh: 7, zone: "edge" }
        },
        settings: {
          windowZoneMargins: { left: 30, top: 5, right: 30, bottom: 5 }
        }
      }
    },
    gridSize: () => 10,
    workspaceRect: () => ({ width: 1000, height: 1000 }),
    occupiedLayoutRects: () => []
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  vm.runInNewContext(source, context);

  const panel = { dataset: { panelId: "taskdock" } };
  const result = context.window.edexDesktopLayout.findPanelZonePosition(panel);

  assert.equal(result, null);
});

test("Ignore desktop icon activation for clicks on modal and form controls", () => {
  const context = {
    document: {
      getElementById: () => ({ clientWidth: 1000, clientHeight: 1000 })
    },
    window: {
      edexRendererState: {
        layout: {},
        settings: {}
      }
    },
    gridSize: () => 10,
    workspaceRect: () => ({ width: 1000, height: 1000 }),
    occupiedLayoutRects: () => []
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "renderer", "desktop-layout.js"), "utf8");
  vm.runInNewContext(source, context);

  const interactiveTarget = {
    closest: (selector) => selector.includes(".modal_popup") ? {} : null
  };
  const desktopTarget = { closest: () => null };

  assert.equal(context.window.edexDesktopLayout.isInteractiveClickTarget(interactiveTarget), true);
  assert.equal(context.window.edexDesktopLayout.isInteractiveClickTarget(desktopTarget), false);
});
