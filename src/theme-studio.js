(() => {
  "use strict";
  const api = () => window.edex;
  const clamp = (value) => Math.max(0, Math.min(255, Number(value) || 0));
  const toHex = (colors) => `#${["r", "g", "b"].map((key) => clamp(colors[key]).toString(16).padStart(2, "0")).join("")}`;
  const fromHex = (value) => ({ r: parseInt(value.slice(1, 3), 16), g: parseInt(value.slice(3, 5), 16), b: parseInt(value.slice(5, 7), 16) });
  const validHex = (value) => /^#[\da-f]{6}$/i.test(value);
  const defaultTheme = () => ({
    colors: { r: 0, g: 234, b: 255, black: "#000000", light_black: "#05080d", grey: "#262828", red: "#ff3c3c", yellow: "#ffd23c" }
  });

  function mount(root, { embedded = false } = {}) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = "1";
    root.classList.add("bockis-studio");
    if (embedded) root.classList.add("bockis-studio-embedded");
    root.innerHTML = `
      <div class="studio-header"><div><strong>BOCKIS // THEME STUDIO</strong><small>eDEX Theme Editor + Windows 11 Sync</small></div>
      ${embedded ? '<button data-act="popout">↗ Eigenes Fenster</button>' : '<span class="studio-header-label">CUSTOMIZE YOUR DESKTOP</span>'}</div>
      <div class="studio-toolbar">
       <label>Theme <select data-id="themes" aria-label="Theme auswählen"></select></label>
       <button data-act="load">Laden</button><button data-act="new">Neues Theme</button>
       <label>Name <input data-id="name" maxlength="48" placeholder="mein_theme" spellcheck="false"></label>
       <button data-act="save" class="studio-primary">Speichern</button><button data-act="delete">Löschen</button>
      </div>
      <div class="studio-layout"><section class="studio-controls">
        <h3>Farbpalette</h3><div class="studio-colors">
        ${[["accent", "Akzentfarbe"], ["black", "Panel-Hintergrund"], ["light_black", "Oberfläche / Terminal"], ["grey", "Sekundärfarbe"], ["red", "Warnfarbe"], ["yellow", "Hinweisfarbe"]].map(([key, label]) => `<label class="studio-color"><span>${label}</span><input data-color="${key}" type="color"><input data-hex="${key}" maxlength="7" spellcheck="false"></label>`).join("")}
        </div><h3>Windows 11</h3><p class="studio-help">Synchronisierung nutzt die bestehende Windows-Farben-Funktion. Nur unterstützte Systemfarben und Dark Mode; kein Patch von Windows-Systemdateien.</p>
        <label class="studio-choice">Synchronisation <select data-id="sync"><option value="off">Aus</option><option value="subtle">Dezent – Akzent</option><option value="strong">Stark – Akzent + Dark Mode</option></select></label>
        <div class="studio-actions"><button data-act="sync">Windows jetzt synchronisieren</button><button data-act="restore">Windows-Original wiederherstellen</button></div>
        <p class="studio-help">Vor der ersten Windows-Änderung wird automatisch ein Backup angelegt. Theme-Überschreibungen werden separat gesichert.</p>
      </section><section class="studio-right"><h3>Live-Vorschau</h3><div class="studio-preview">
        <div class="studio-preview-top"><span>BOCKIS // SYSTEM</span><span>● ONLINE</span></div>
        <div class="studio-preview-grid"><div><b>CPU / STATUS</b><svg viewBox="0 0 160 40"><polyline points="0,30 20,28 30,5 45,32 60,12 80,24 95,10 110,18 130,6 160,20"/></svg></div><div><b>NETWORK</b><svg viewBox="0 0 160 40"><polyline points="0,30 25,22 45,27 70,10 95,22 120,6 145,14 160,8"/></svg></div></div>
        <div class="studio-preview-terminal">&gt; theme preview --live<br><span>Theme Engine online.</span><br>_</div>
      </div><div class="studio-actions"><button data-act="preview">Auf eDEX live ansehen</button><button data-act="reset">Vorschau zurücksetzen</button><button data-act="apply" class="studio-primary">Theme aktivieren</button></div>
      <p class="studio-help">Live-Vorschau verändert Windows nicht. Erst „Theme aktivieren“ übernimmt das gespeicherte Theme für eDEX und gegebenenfalls Windows.</p><p class="studio-message" role="status" aria-live="polite" data-id="status">Studio bereit.</p></section></div>`;

    const get = (selector) => root.querySelector(selector);
    let theme = defaultTheme();
    let selected = "tron";
    let inProgress = false;
    const status = (message, error = false) => {
      const element = get('[data-id="status"]');
      element.textContent = message;
      element.classList.toggle("studio-error", error);
    };
    function updatePreview() {
      const colors = theme.colors;
      const panel = get(".studio-preview");
      panel.style.setProperty("--studio-accent", toHex(colors));
      panel.style.setProperty("--studio-bg", colors.black);
      panel.style.setProperty("--studio-surface", colors.light_black);
      panel.style.setProperty("--studio-warning", colors.yellow);
    }
    function refreshInputs() {
      const colors = theme.colors;
      for (const key of ["accent", "black", "light_black", "grey", "red", "yellow"]) {
        const value = key === "accent" ? toHex(colors) : colors[key];
        get(`[data-color="${key}"]`).value = value;
        get(`[data-hex="${key}"]`).value = value;
      }
      updatePreview();
    }
    function updateColor(key, value) {
      if (!validHex(value)) return false;
      if (key === "accent") Object.assign(theme.colors, fromHex(value));
      else theme.colors[key] = value.toLowerCase();
      refreshInputs();
      return true;
    }
    for (const input of root.querySelectorAll("[data-color]")) {
      input.addEventListener("input", () => updateColor(input.dataset.color, input.value));
    }
    for (const input of root.querySelectorAll("[data-hex]")) {
      input.addEventListener("change", () => {
        if (!updateColor(input.dataset.hex, input.value)) {
          refreshInputs();
          status("Ungültige Farbe – bitte #RRGGBB verwenden.", true);
        }
      });
    }
    async function refreshList(selectName) {
      const result = await api().themeStudioList();
      const dropdown = get('[data-id="themes"]');
      dropdown.replaceChildren();
      for (const name of result.themes) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        dropdown.append(option);
      }
      dropdown.value = selectName && result.themes.includes(selectName) ? selectName : result.active;
      return result;
    }
    async function load(name) {
      if (!name) throw new Error("Bitte Theme auswählen.");
      theme = await api().getTheme(name);
      selected = name;
      get('[data-id="name"]').value = name;
      refreshInputs();
      status(`Theme „${name}“ geladen. Änderungen sind noch nicht gespeichert.`);
    }
    function busy(fn) {
      return async () => {
        if (inProgress) return;
        inProgress = true;
        try { await fn(); } catch (error) { status(error.message || String(error), true); }
        finally { inProgress = false; }
      };
    }
    root.querySelectorAll("[data-act]").forEach((button) => button.addEventListener("click", busy(async () => {
      const action = button.dataset.act;
      if (action === "popout") return api().themeStudioOpen();
      if (action === "load") return load(get('[data-id="themes"]').value);
      if (action === "new") {
        theme = defaultTheme();
        selected = "";
        get('[data-id="name"]').value = "mein_theme";
        refreshInputs();
        return status("Neues Theme erstellt. Bitte benennen und speichern.");
      }
      if (action === "save") {
        const name = get('[data-id="name"]').value.trim();
        const saved = await api().themeStudioSave(name, theme);
        theme = saved.theme;
        selected = saved.name;
        await refreshList(selected);
        return status(`Theme „${selected}“ gespeichert (bestehende Version gesichert).`);
      }
      if (action === "delete") {
        const name = get('[data-id="themes"]').value;
        if (!window.confirm(`Eigenes Theme „${name}“ löschen? Es wird vorher gesichert.`)) return;
        await api().themeStudioDelete(name);
        const result = await refreshList();
        await load(result.active === "tron" ? "tron" : result.active);
        return status("Theme gelöscht; Sicherung erstellt.");
      }
      if (action === "preview") {
        await api().themeStudioPreview(theme);
        return status("Vorschau in eDEX aktiviert. Windows bleibt unverändert.");
      }
      if (action === "reset") {
        await api().themeStudioResetPreview();
        return status("Live-Vorschau zurückgesetzt.");
      }
      if (action === "apply") {
        const name = get('[data-id="name"]').value.trim();
        if (!name || name !== selected) return status("Bitte das Theme zuerst unter diesem Namen speichern.", true);
        await api().saveSettings({ windowsColorMode: get('[data-id="sync"]').value });
        await api().themeStudioActivate(selected);
        await api().themeStudioResetPreview();
        return status(`Theme „${selected}“ aktiviert – alle eDEX-Monitore synchronisiert.`);
      }
      if (action === "sync") {
        if (!window.confirm("Windows-Akzentfarbe und optional Dark Mode jetzt ändern? Vorher wird ein Backup erstellt.")) return;
        const colors = theme.colors;
        const result = await api().applyWindowsTheme({ mode: get('[data-id="sync"]').value, rgb: { r: colors.r, g: colors.g, b: colors.b } });
        return status(result.applied ? "Windows-Design aktualisiert (Backup vorhanden)." : "Keine Änderung vorgenommen (nur unter Windows 11 möglich).", !result.applied);
      }
      if (action === "restore") {
        if (!window.confirm("Ursprüngliche Windows-Farben und Dark-Mode-Einstellungen wiederherstellen?")) return;
        const result = await api().applyWindowsTheme({ mode: "off" });
        if (result.applied) {
          get('[data-id="sync"]').value = "off";
          await api().saveSettings({ windowsColorMode: "off" });
        }
        status(result.applied ? "Windows-Design aus Backup wiederhergestellt." : "Kein Backup vorhanden oder Wiederherstellung fehlgeschlagen.", !result.applied);
      }
    })));
    (async () => {
      try {
        const result = await refreshList();
        await load(result.active || "tron");
        const bootstrap = await api().bootstrap();
        get('[data-id="sync"]').value = bootstrap?.settings?.windowsColorMode || "subtle";
      } catch (error) {
        status(`Initialisierung fehlgeschlagen: ${error.message}`, true);
      }
    })();
  }
  window.BockisThemeStudio = { mount };
  document.addEventListener("DOMContentLoaded", () => {
    const standalone = document.querySelector("#theme-studio-root");
    if (standalone) mount(standalone);
  });
})();
