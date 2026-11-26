const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

function loadI18n() {
  const context = {
    document: { documentElement: {} },
    window: {}
  };
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.js"), "utf8");
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "src", "locales", "legacy-compat.js"), "utf8"), context);
  vm.runInNewContext(source, context, { filename: "src/i18n.js" });
  for (const language of ["en", "de", "zh-Hant"]) vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "src", "locales", `${language}.js`), "utf8"), context);
  return context.window.edexI18n;
}

const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;
const runtimeMessages = [
  "顯示器 2 · 4K",
  "主螢幕",
  "獨立頁面",
  "3 筆",
  "請輸入 0.25–2.0 之間的數字",
  "請對資料夾（或資料夾捷徑）使用 Ctrl+雙擊",
  "文件夾",
  "圖標",
  "沒有需要遷移的項目",
  "已還原 2 個項目",
  "已建立 Test",
  "已接收桌面容器",
  "拒絕經由符號連結存取路徑：C:\\Temp"
];

test("de/en UI translations contain no Chinese characters", () => {
  const i18n = loadI18n();
  for (const locale of ["de", "en"]) {
    i18n.setLocale(locale);
    for (const message of runtimeMessages) {
      assert.doesNotMatch(i18n.translateDynamic(message), CJK, `${locale}: ${message}`);
    }
  }
});

test("zh-Hant keeps Chinese UI translations", () => {
  const i18n = loadI18n();
  i18n.setLocale("zh-Hant");
  assert.match(i18n.translateDynamic("顯示器 2 · 4K"), CJK);
  assert.equal(i18n.locale(), "zh-Hant");
});

test("unknown locales fall back to English", () => {
  const i18n = loadI18n();
  i18n.setLocale("fr");
  assert.equal(i18n.locale(), "en");
});
test("Settings navigation and typography roles translate in all three languages", () => {
  const i18n = loadI18n();
  for (const [locale, expected] of [
    ["de", ["Version / Updates", "Mit Windows starten", "Haupttext"]],
    ["en", ["Version & Updates", "Start with Windows", "Main text"]],
    ["zh-Hant", ["版本與更新", "隨 Windows 啟動", "主要文字"]]
  ]) {
    i18n.setLocale(locale);
    for (const [index, input] of ["Version / Updates", "Mit Windows starten", "Haupttext"].entries()) {
      assert.equal(i18n.translateValue(input), expected[index]);
    }
  }
});

test("Page translations are reversible after a language switch", () => {
  const original = "  Mit Windows starten  ";
  const node = { nodeValue: original };
  const root = { nodeType: 1, hasAttribute: () => false, querySelectorAll: () => [] };
  const document = {
    documentElement: {},
    createTreeWalker: () => ({ currentNode: null, nextNode() { if (this.done) return false; this.done = true; this.currentNode = node; return true; } })
  };
  const context = { document, NodeFilter: { SHOW_TEXT: 4 }, window: {} };
  for (const file of ["locales/legacy-compat.js", "i18n.js", "locales/en.js", "locales/de.js", "locales/zh-Hant.js"]) vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "src", file), "utf8"), context);
  const i18n = context.window.edexI18n;
  i18n.setLocale("en"); i18n.translatePage(root);
  assert.equal(node.nodeValue, "  Start with Windows  ");
  i18n.setLocale("zh-Hant"); i18n.translatePage(root);
  assert.equal(node.nodeValue, "  隨 Windows 啟動  ");
  i18n.setLocale("de"); i18n.translatePage(root);
  assert.equal(node.nodeValue, original);
});
