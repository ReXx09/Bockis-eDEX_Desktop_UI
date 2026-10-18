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
  vm.runInNewContext(source, context, { filename: "src/i18n.js" });
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

test("unknown locales fall back to German", () => {
  const i18n = loadI18n();
  i18n.setLocale("fr");
  assert.equal(i18n.locale(), "de");
});