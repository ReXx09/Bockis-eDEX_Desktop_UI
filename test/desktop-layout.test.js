const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
