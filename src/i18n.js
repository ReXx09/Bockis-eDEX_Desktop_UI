/* BOCKIS Language Engine 2.0. English is the canonical fallback. */
(() => {
  "use strict";
  const BASE = "en";
  const SUPPORTED = ["en"];
  const dictionaries = Object.create(null);
  const legacy = window.edexI18n;
  const originals = new WeakMap();
  const attributes = new WeakMap();
  let current = BASE;
  const missing = new Set();
  function register(language, entries) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language) || !entries || typeof entries !== "object" || Array.isArray(entries)) throw new TypeError("Invalid language module");
    if (!SUPPORTED.includes(language)) SUPPORTED.push(language);
    dictionaries[language] = Object.freeze({ ...entries });
  }
  function normalize(value) { return SUPPORTED.includes(value) ? value : BASE; }
  function locale() { return current; }
  function t(key, params = {}) {
    const value = dictionaries[current]?.[key] ?? dictionaries[BASE]?.[key];
    if (value === undefined) {
      missing.add(key);
      return `[missing:${key}]`;
    }
    return String(value).replace(/\{([a-zA-Z][\w]*)\}/g, (full, name) => Object.hasOwn(params, name) ? String(params[name]) : full);
  }
  function setLocale(value) {
    const previous = current;
    current = normalize(value);
    legacy?.setLocale?.(["en", "de", "zh-Hant"].includes(current) ? current : "en");
    if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = current;
    if (previous !== current && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("edex:locale-changed", { detail: { locale: current } }));
    }
    return current;
  }
  // Compatibility for screens not migrated to stable IDs yet.
  // Old source text is only a bridge: never use it in new UI code.
  function translateValue(value) {
    const raw = String(value ?? "");
    const index = dictionaries[BASE] || {};
    const canonicalKey = Object.keys(index).find(key => index[key] === raw || dictionaries.de?.[key] === raw || dictionaries["zh-Hant"]?.[key] === raw);
    if (canonicalKey) return t(canonicalKey);
    if (legacy) { legacy.setLocale(["en", "de", "zh-Hant"].includes(current) ? current : "en"); return legacy.translateValue(raw); }
    return raw;
  }
  function translateDynamic(value) {
    const source = String(value ?? "");
    const translated = translateValue(source);
    if (translated !== source) return translated;
    return legacy?.translateDynamic?.(source) ?? source;
  }
  function translatePage(root = document.body) {
    if (!root) return;
    // Stable, explicit keys take priority and are never processed again as legacy text.
    const keyed = [...(root.matches?.("[data-i18n]") ? [root] : []), ...(root.querySelectorAll?.("[data-i18n]") || [])];
    for (const el of keyed) {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.nodeValue.trim() || node.parentElement?.closest?.("[data-i18n], script, style, textarea, option[data-i18n]") ) continue;
      const raw = node.nodeValue;
      const previous = originals.get(node);
      const source = previous?.rendered === raw ? previous.source : raw;
      const trimmed = source.trim();
      const rendered = source.replace(trimmed, translateDynamic(trimmed));
      originals.set(node, { source, rendered });
      if (raw !== rendered) node.nodeValue = rendered;
    }
    for (const el of [root, ...(root.querySelectorAll?.("[title], [placeholder], [aria-label], [data-i18n-attr]") || [])]) {
      if (el.nodeType !== 1) continue;
      const stored = attributes.get(el) || {};
      for (const attr of ["title", "placeholder", "aria-label"]) {
        if (!el.hasAttribute(attr)) continue;
        const key = el.getAttribute(`data-i18n-${attr}`);
        const raw = el.getAttribute(attr);
        const prev = stored[attr];
        const source = prev?.rendered === raw ? prev.source : raw;
        const rendered = key ? t(key) : translateValue(source);
        stored[attr] = { source, rendered };
        if (raw !== rendered) el.setAttribute(attr, rendered);
      }
      attributes.set(el, stored);
    }
  }
  function missingKeys() { return [...missing]; }
  window.edexI18n = { BASE, SUPPORTED, register, t, normalize, setLocale, locale, translateValue, translateDynamic, translatePage, missingKeys };
})();
