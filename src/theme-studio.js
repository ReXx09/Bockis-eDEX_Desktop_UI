(() => {
  "use strict";
  const api = () => window.edex;
  const clamp = (value) => Math.max(0, Math.min(255, Number(value) || 0));
  const toHex = (colors) => `#${["r", "g", "b"].map((key) => clamp(colors[key]).toString(16).padStart(2, "0")).join("")}`;
  const fromHex = (value) => ({ r: parseInt(value.slice(1, 3), 16), g: parseInt(value.slice(3, 5), 16), b: parseInt(value.slice(5, 7), 16) });
  const validHex = (value) => /^#[\da-f]{6}$/i.test(value);
  const errorMessage = (error) => String(error?.message || error)
    .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, "");
  const defaultTheme = () => ({
    colors: { r: 0, g: 234, b: 255, black: "#000000", light_black: "#05080d", grey: "#262828", text: "#00eaff", heading: "#00eaff", secondaryText: "#00eaff", buttonText: "#00eaff", red: "#ff3c3c", yellow: "#ffd23c" },
    panelStyle: "square",
    cssvars: { font_main: "United Sans Medium" },
    terminal: { fontFamily: "Fira Mono", cursorStyle: "block", foreground: "#00eaff", background: "#05080d" }
  });

  function mount(root, { embedded = false, externalNavigation = false } = {}) {
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = "1";
    root.classList.add("bockis-studio");
    if (embedded) root.classList.add("bockis-studio-embedded");
    if (embedded && externalNavigation) root.classList.add("studio-external-navigation");
    root.innerHTML = `
      <div class="studio-header"><div><strong data-i18n="studio.header">BOCKIS // THEME STUDIO 2.0</strong><small data-i18n="studio.subtitle">Theme-, Windows- und Desktop-Manager</small></div>
      <span class="studio-guide-actions"><button type="button" data-act="guide-theme" data-i18n="studio.tour.theme">Theme-Tour</button><button type="button" data-act="guide-windows" data-i18n="studio.tour.windows">Windows-Tour</button>${embedded ? '<button data-act="popout">↗ Eigenes Fenster</button>' : '<span class="studio-version">2.0</span>'}</span></div>
      <nav class="studio-nav" aria-label="Theme-Studio-Bereiche">
        <button type="button" class="is-active" data-section="edex" aria-pressed="true"><span>▣</span>eDEX Design</button>
        <button type="button" data-section="windows" aria-pressed="false"><span>▱</span>Windows 11</button>
        <button type="button" data-section="desktop" aria-pressed="false"><span>▦</span>Desktop</button>
        <button type="button" data-section="profiles" aria-pressed="false"><span>⛨</span>Profile &amp; Sicherheit</button>
      </nav>
      <div class="studio-toolbar" data-studio-anchor="theme-library">
       <label>Theme <select data-id="themes" aria-label="Theme auswählen"></select></label>
       <button data-act="load" data-i18n="studio.load">Laden</button><button data-act="new" data-i18n="studio.new">Neues Theme</button>
       <label><span data-i18n="studio.name">Speichername</span> <input data-id="name" maxlength="48" placeholder="mein_theme" spellcheck="false"></label>
       <button data-act="save" class="studio-primary" data-i18n="studio.save">Speichern</button><button data-act="delete" data-i18n="studio.delete">Löschen</button>
      </div>
      <section class="studio-section is-active" data-section-panel="edex">
        <div class="studio-layout"><section class="studio-controls">
          <h3 data-i18n="studio.colors.heading" data-studio-anchor="edex-colors">Primär- und Sekundärfarben</h3><div class="studio-colors">
          ${[["accent", "Akzentfarbe"], ["black", "Panel-Hintergrund"], ["light_black", "Oberfläche"], ["grey", "Sekundärfarbe"], ["text", "Haupttext"], ["heading", "Überschriften"], ["secondaryText", "Sekundärer Text"], ["buttonText", "Button-Beschriftung"], ["red", "Warnfarbe"], ["yellow", "Hinweisfarbe"]].map(([key, label]) => `<label class="studio-color"><span data-i18n="${({accent:"studio.colors.accent",black:"studio.colors.background",light_black:"studio.colors.surface",grey:"studio.colors.secondary",text:"studio.colors.text",heading:"studio.colors.headingText",secondaryText:"studio.colors.secondaryText",buttonText:"studio.colors.buttonText",red:"studio.colors.warning",yellow:"studio.colors.notice"})[key]}">${label}</span><input data-color="${key}" type="color"><input data-hex="${key}" maxlength="7" spellcheck="false"></label>`).join("")}
          <label class="studio-color"><span>Terminal-Text</span><input data-color="terminalForeground" type="color"><input data-hex="terminalForeground" maxlength="7" spellcheck="false"></label>
          <label class="studio-color"><span>Terminal-Hintergrund</span><input data-color="terminalBackground" type="color"><input data-hex="terminalBackground" maxlength="7" spellcheck="false"></label>
          </div>
          <h3 data-i18n="studio.panels.heading" data-studio-anchor="panel-design">Panel-Design und Rahmen</h3>
          <label class="studio-setting">Panel-Schrift<select data-theme-setting="font_main"><option>United Sans Medium</option><option>Rajdhani</option><option>Segoe UI</option><option>Consolas</option></select></label>
          <label class="studio-setting">Rahmenstil<select data-theme-setting="panelStyle"><option value="square">Eckig</option><option value="rounded">Abgerundet</option><option value="glass">Glas</option></select></label>
          <h3>Terminal-Schrift</h3>
          <label class="studio-setting">Schriftfamilie<select data-theme-setting="terminalFont"><option>Fira Mono</option><option>Cascadia Mono</option><option>Consolas</option></select></label>
          <label class="studio-setting">Cursor<select data-theme-setting="terminalCursor"><option value="block">Block</option><option value="underline">Unterstrich</option><option value="bar">Balken</option></select></label>
        </section><section class="studio-right"><h3>HUD, Widgets und Hintergrund</h3><div class="studio-preview">
          <div class="studio-preview-top"><span>BOCKIS // SYSTEM</span><span>● ONLINE</span></div>
          <div class="studio-preview-grid"><div><b>CPU / STATUS</b><svg viewBox="0 0 160 40"><polyline points="0,30 20,28 30,5 45,32 60,12 80,24 95,10 110,18 130,6 160,20"/></svg></div><div><b>NETWORK</b><svg viewBox="0 0 160 40"><polyline points="0,30 25,22 45,27 70,10 95,22 120,6 145,14 160,8"/></svg></div></div>
          <div class="studio-preview-color-types"><strong>Überschrift / Heading</strong><span>Nebeninformation / Secondary</span><button type="button" disabled>Beispiel-Button</button></div><div class="studio-preview-terminal">&gt; theme preview --live<br><span>Theme Engine online.</span><br>_</div>
        </div><div class="studio-actions" data-studio-anchor="live-preview"><button data-act="preview" data-i18n="studio.preview">Auf eDEX live ansehen</button><button data-act="compare" data-i18n="studio.compare">Vorher / Nachher</button><button data-act="reset" data-i18n="studio.reset">Vorschau zurücksetzen</button><button data-act="apply" class="studio-primary" data-i18n="studio.activate">Theme aktivieren</button></div>
        <p class="studio-help">Farben, Terminal-Schrift und Rahmenstil werden in deinem Theme-Paket gespeichert.</p></section></div>
      </section>
      <section class="studio-section" data-section-panel="windows" hidden>
        <h3 data-studio-anchor="windows-manager">Windows 11 synchronisieren</h3>
        <p class="studio-help">Akzentfarbe sowie die Schalter für Startmenü/Taskleiste und Fenstertitel sind getrennt. Jede Anpassung lässt sich testen und aus einem atomaren Original-Backup wiederherstellen; bei einem Fehler werden Teiländerungen zurückgerollt. Es werden keine Windows-Systemdateien gepatcht.</p>
        <div class="studio-sync-features" data-id="windows-features"></div>
        <div class="studio-option-row">
          <label>Taskleisten-Ausrichtung<select data-id="taskbar-alignment"><option value="center">Zentriert</option><option value="left">Links</option></select></label>
          <label>Taskleisten-Größe<select data-id="taskbar-size"><option value="small">Klein</option><option value="medium">Mittel</option><option value="large">Groß</option></select></label>
          <button data-act="save-windows-options">Optionen testen / anwenden</button>
        </div>
        <div class="studio-actions"><button data-act="adopt-windows-theme">Windows-Systemtheme übernehmen</button></div>
        <div class="studio-actions"><button data-act="import-windows-theme">.theme-Datei nur einlesen</button></div>
        <div class="studio-windows-import" data-id="windows-import-preview" hidden></div>
        <p class="studio-help">TaskbarSi ist experimentell: Windows 11 kann die Taskleisten-Größe je nach Version ignorieren oder zurücksetzen. Kontrastmodus steuert zusätzlich die eDEX-Oberfläche.</p>
        <h3 data-studio-anchor="windhawk">BOCKIS Windows Style Integration 1.0</h3>
        <p class="studio-help">Die Windows Style Integration benötigt Windhawk. Das eDEX-Setup installiert Windhawk nur nach ausdrücklicher Zustimmung; bestehende Installationen und Mods bleiben unangetastet. Mit der stabilen Windhawk-Version prüft eDEX die Runtime; Mods und ihre Einstellungen müssen manuell in Windhawk geprüft und verwaltet werden. Es werden keine Mods automatisch installiert, aktualisiert oder aktiviert.</p>
        <p class="studio-windhawk-status" data-id="windows-style-status" role="status">Windhawk-Status wird geprüft …</p>
        <div class="studio-windhawk-mods" data-id="windows-style-mods"></div>
        <div class="studio-actions"><button data-act="open-windhawk-install">Offizielle Windhawk-Seite öffnen</button></div>
      </section>
      <section class="studio-section" data-section-panel="desktop" hidden>
        <h3 data-studio-anchor="desktop">Desktop pro Monitor</h3>
        <div class="studio-desktop-grid">
          <label>Monitor<select data-id="desktop-display"></select></label>
          <label>Wallpaper<select data-id="desktop-wallpaper"></select></label>
          <label>Rastergröße (px)<input data-id="desktop-grid" type="number" min="12" max="96" step="1"></label>
          <label>Icon-Paket<select data-id="desktop-icons"><option value="standard">Standard</option><option value="cyan">Tron Cyan</option><option value="mono">Monochrom</option><option value="contrast">Hoher Kontrast</option></select></label>
          <label>Cursor-Paket<select data-id="desktop-cursor"><option value="system">System</option><option value="precision">Präzision (Fadenkreuz)</option><option value="large">Greifen</option></select></label>
          <label>Panel-Deckkraft <span data-id="opacity-label"></span><input data-id="panel-opacity" type="range" min="50" max="100" step="5"></label>
          <label>Kontrast<select data-id="contrast-mode"><option value="standard">Standard</option><option value="high">Hoch</option></select></label>
        </div>
        <label class="studio-check"><input data-id="desktop-sync" type="checkbox"> Wallpaper auf allen Monitoren synchronisieren</label>
        <div class="studio-actions"><button data-act="save-desktop" class="studio-primary">Desktop-Einstellungen anwenden</button></div>
        <p class="studio-help">Raster und Farbverläufe verwenden die Farben des aktiven eDEX-Themes. Änderungen am Wallpaper können pro Monitor getrennt oder synchron erfolgen.</p>
      </section>
      <section class="studio-section" data-section-panel="profiles" hidden>
        <h3 data-studio-anchor="profiles">Theme-Pakete und Wiederherstellung</h3>
        <div class="studio-actions"><button data-act="import-package">Theme-Paket importieren</button><button data-act="export-package">Aktuelles Theme exportieren</button><button data-act="create-backup">Backup erstellen</button></div>
        <label class="studio-setting">Backup auswählen<select data-id="profile-backups"></select></label>
        <button data-act="restore-backup">Backup wiederherstellen</button>
        <h3>Windows-Registry-Notfallwiederherstellung</h3>
        <p class="studio-help" data-id="windows-recovery-status" role="status">Prüfung ausstehend.</p>
        <button data-act="windows-emergency-restore">Verwaltete Windows-Werte wiederherstellen</button>
        <div class="studio-compare" data-id="compare" hidden></div>
        <h3>Änderungsprotokoll</h3><ol class="studio-activity" data-id="activity"><li>Protokoll wird geladen …</li></ol>
        <p class="studio-help">Theme-Pakete enthalten validierte Theme-Daten und Desktop-Optionen. Backups bleiben lokal im Benutzerprofil gespeichert.</p>
      </section>
      <p class="studio-message" role="status" aria-live="polite" data-id="status">Studio bereit.</p>`;

    // Construct real pages by MOVING the existing controls, never cloning them.
    // This preserves every event handler, shared draft and preview reference.
    const legacyEdex = root.querySelector('[data-section-panel="edex"]');
    const legacyWindows = root.querySelector('[data-section-panel="windows"]');
    const createPage = (id, title, description) => {
      const page = document.createElement("section");
      page.className = "studio-section studio-subpage";
      page.dataset.studioPage = id;
      page.hidden = true;
      const heading = document.createElement("h3");
      heading.textContent = title;
      heading.dataset.i18n = `studio.page.${id}`;
      page.append(heading);
      if (description) {
        const help = document.createElement("p");
        help.className = "studio-help";
        const descriptionKey = `studio.page.${id}.description`;
        if (["library", "colors", "panels", "preview"].includes(id)) help.dataset.i18n = descriptionKey;
        help.textContent = description;
        page.append(help);
      }
      legacyEdex.before(page);
      return page;
    };
    const libraryPage = createPage("library", "Theme-Bibliothek", "Themes auswählen, erstellen und speichern. Alle Unterseiten bearbeiten denselben Theme-Entwurf.");
    const libraryDetail = document.createElement("p");
    libraryDetail.className = "studio-library-detail";
    libraryDetail.dataset.id = "library-detail";
    libraryPage.append(libraryDetail);
    const colorsPage = createPage("colors", "eDEX-Farben", "Akzent-, Hintergrund- und Terminalfarben bearbeiten. Die Vorschau bleibt beim Seitenwechsel erhalten.");
    const panelsPage = createPage("panels", "Fenster & Panels", "Schriftarten, Panelrahmen und Terminal-Cursor des aktuellen Themes anpassen.");
    const previewPage = createPage("preview", "Live-Vorschau", "Änderungen unverbindlich ansehen, vergleichen oder nach dem Speichern aktivieren.");
    const controls = legacyEdex.querySelector(".studio-controls");
    const colorHeading = controls.querySelector('[data-studio-anchor="edex-colors"]');
    const colorFields = controls.querySelector(".studio-colors");
    colorHeading.remove();
    colorsPage.append(colorFields);
    const panelHeading = controls.querySelector('[data-studio-anchor="panel-design"]');
    panelHeading.remove();
    while (controls.firstChild) panelsPage.append(controls.firstChild);
    const right = legacyEdex.querySelector(".studio-right");
    while (right.firstChild) previewPage.append(right.firstChild);
    const windowsPage = createPage("windows", "Windows-Farbmanager", "Nur unterstützte Windows-Einstellungen werden verändert. Wiederherstellung bleibt verfügbar.");
    const windhawkPage = createPage("windhawk", "Windows Style Integration", "Windhawk und benötigte Mods prüfen. Keine automatische Mod-Installation.");
    legacyEdex.remove();
    let windhawkStart = false;
    for (const child of Array.from(legacyWindows.children)) {
      if (child.matches('[data-studio-anchor="windhawk"]')) windhawkStart = true;
      (windhawkStart ? windhawkPage : windowsPage).append(child);
    }
    legacyWindows.remove();
    // Comparison belongs to the preview page, not the hidden backup page.
    const comparison = root.querySelector('[data-id="compare"]');
    if (comparison) previewPage.append(comparison);

    const pages = new Map([
      ["library", libraryPage], ["colors", colorsPage], ["panels", panelsPage],
      ["preview", previewPage], ["windows", windowsPage], ["windhawk", windhawkPage],
      ["desktop", root.querySelector('[data-section-panel="desktop"]')],
      ["profiles", root.querySelector('[data-section-panel="profiles"]')]
    ]);
    const pageSections = { library: "edex", colors: "edex", panels: "edex", preview: "edex", windows: "windows", windhawk: "windows", desktop: "desktop", profiles: "profiles" };
    const showPage = (pageName) => {
      const page = pages.get(pageName) ? pageName : "library";
      root.dataset.activeStudioPage = page;
      pages.forEach((element, name) => {
        element.hidden = name !== page;
        element.classList.toggle("is-active", name === page);
      });
      const section = pageSections[page];
      root.querySelectorAll(".studio-nav [data-section]").forEach((button) => {
        const active = button.dataset.section === section;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      // The toolbar remains shared across pages; no extra theme instance is mounted.
      return true;
    };
    root.__bockisShowPage = showPage;
    showPage("library");
    const get = (selector) => root.querySelector(selector);
    function startStudioTour(kind) {
      if (root.__bockisStudioTourClose) root.__bockisStudioTourClose(false);
      const windows = kind === "windows";
      const steps = windows
        ? [
          {page:"windows", selector:'[data-id="windows-features"]', key:"windowsFeatures"},
          {page:"windhawk", selector:'[data-id="windows-style-status"]', key:"windowsStatus"},
          {page:"windhawk", selector:'[data-id="windows-style-mods"]', key:"windowsMods"},
          {page:"profiles", selector:'[data-id="windows-recovery-status"]', key:"windowsRestore"}
        ]
        : [
          {page:"library", selector:'[data-id="themes"]', key:"themeLibrary"},
          {page:"colors", selector:'[data-color="accent"]', key:"themeColors"},
          {page:"panels", selector:'[data-theme-setting="panelStyle"]', key:"themePanels"},
          {page:"preview", selector:'[data-act="preview"]', key:"themePreview"}
        ];
      let index = 0;
      const previousFocus = document.activeElement;
      const overlay = document.createElement("div");
      overlay.className = "studio-tour";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", window.edexI18n?.t?.("studio.tour.title") || "Theme Studio tour");
      const spotlight = document.createElement("div");
      spotlight.className = "studio-tour-spotlight";
      const card = document.createElement("div");
      card.className = "studio-tour-card";
      overlay.append(spotlight, card);
      root.append(overlay);
      const local = (key) => window.edexI18n?.t?.(`studio.tour.${key}`) || key;
      const markComplete = async () => {
        const settings = studioBootstrap?.settings || {};
        const panelTours = settings.panelTours || {seen: {}, disabled: {}, commonSeen: false};
        const seen = {...panelTours.seen, [windows ? "windowsStyle" : "themeStudio"]: true};
        const result = await api().saveSettings({panelTours: {...panelTours, seen}});
        if (!result?.settings) throw new Error("Tour-Fortschritt konnte nicht gespeichert werden.");
        studioBootstrap = {...studioBootstrap, settings: result.settings};
      };
      const close = (completed = false) => {
        if (!overlay.isConnected) return;
        window.removeEventListener("resize", layout);
        window.removeEventListener("scroll", layout, true);
        window.removeEventListener("edex:locale-changed", render);
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        root.__bockisStudioTourClose = null;
        if (previousFocus?.isConnected) previousFocus.focus?.();
        if (completed) markComplete().catch((error) => status(error.message || String(error), true));
      };
      const placeCard = (rect) => {
        const margin = 14, gap = 16;
        const width = card.offsetWidth || Math.min(390, innerWidth - 28);
        const height = card.offsetHeight || 220;
        const clampX = (value) => Math.max(margin, Math.min(innerWidth - width - margin, value));
        const clampY = (value) => Math.max(margin, Math.min(innerHeight - height - margin, value));
        const positions = [
          rect.bottom + gap + height <= innerHeight - margin && {left:clampX(rect.left), top:rect.bottom+gap},
          rect.top - gap - height >= margin && {left:clampX(rect.left), top:rect.top-gap-height},
          rect.right + gap + width <= innerWidth - margin && {left:rect.right+gap, top:clampY(rect.top)},
          rect.left - gap - width >= margin && {left:rect.left-gap-width, top:clampY(rect.top)}
        ].filter(Boolean);
        const position = positions[0] || {left:innerWidth-width-margin, top:innerHeight-height-margin};
        card.style.left = `${Math.max(margin, position.left)}px`;
        card.style.top = `${Math.max(margin, position.top)}px`;
      };
      function layout() {
        const target = root.querySelector(steps[index].selector);
        if (!target?.isConnected) {
          spotlight.hidden = true;
          card.style.left = "50%";
          card.style.top = "50%";
          card.style.transform = "translate(-50%, -50%)";
          return;
        }
        const rect = target.getBoundingClientRect();
        const x = Math.max(6, rect.left - 5), y = Math.max(6, rect.top - 5);
        Object.assign(spotlight.style, {
          left:`${x}px`, top:`${y}px`,
          width:`${Math.max(0, Math.min(innerWidth-x-6, rect.width+10))}px`,
          height:`${Math.max(0, Math.min(innerHeight-y-6, rect.height+10))}px`
        });
        spotlight.hidden = false;
        card.style.transform = "none";
        placeCard(rect);
      }
      function onKey(event) {
        if (event.key === "Escape") { event.preventDefault(); close(false); }
        if (event.key !== "Tab") return;
        const buttons = [...card.querySelectorAll("button:not([disabled])")];
        if (!buttons.length) return;
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
      }
      function render() {
        if (!overlay.isConnected) return;
        showPage(steps[index].page);
        const step = steps[index];
        card.innerHTML = `<div class="studio-tour-kicker">BOCKIS // ${escapeHtml(local(windows ? "windowsTitle" : "themeTitle"))}<span>${index+1} / ${steps.length}</span></div><h3>${escapeHtml(local(`${step.key}.title`))}</h3><p>${escapeHtml(local(`${step.key}.body`))}</p><div class="studio-tour-actions"><button type="button" data-skip>${escapeHtml(local("skip"))}</button><span>${index ? `<button type="button" data-back>${escapeHtml(local("back"))}</button>` : ""}<button type="button" data-next>${escapeHtml(local(index === steps.length-1 ? "done" : "next"))}</button></span></div>`;
        card.querySelector("[data-skip]").addEventListener("click", () => close(false));
        card.querySelector("[data-back]")?.addEventListener("click", () => {if (index > 0) {index--; render();}});
        card.querySelector("[data-next]").addEventListener("click", () => {
          if (index === steps.length - 1) close(true);
          else {index++; render();}
        });
        layout();
        card.querySelector("[data-next]")?.focus();
      }
      root.__bockisStudioTourClose = close;
      window.addEventListener("resize", layout);
      window.addEventListener("scroll", layout, true);
      window.addEventListener("edex:locale-changed", render);
      document.addEventListener("keydown", onKey, true);
      render();
      return true;
    }
    root.__bockisStartStudioTour = startStudioTour;
    let theme = defaultTheme();
    let selected = "tron";
    let inProgress = false;
    let originalTheme = JSON.parse(JSON.stringify(theme));
    let studioBootstrap = null;
    let desktopSettings = {};
    let importedDesktop = null;
    let activeWindowsFeatures = {};
    const themeDropdown = get('[data-id="themes"]');
    const status = (message, error = false) => {
      const element = get('[data-id="status"]');
      element.textContent = message;
      element.classList.toggle("studio-error", error);
    };
    function updatePreview() {
      const colors = theme.colors;
      const panel = get(".studio-preview");
      panel.style.setProperty("--studio-accent", toHex(colors));
      panel.style.setProperty("--studio-text", colors.text || toHex(colors));
      panel.style.setProperty("--studio-heading", colors.heading || colors.text || toHex(colors));
      panel.style.setProperty("--studio-secondary-text", colors.secondaryText || colors.text || toHex(colors));
      panel.style.setProperty("--studio-button-text", colors.buttonText || colors.text || toHex(colors));
      panel.style.setProperty("--studio-bg", colors.black);
      panel.style.setProperty("--studio-surface", colors.light_black);
      panel.style.setProperty("--studio-warning", colors.yellow);
      panel.style.setProperty("--studio-font", theme.terminal?.fontFamily || "Fira Mono");
      panel.dataset.panelStyle = theme.panelStyle || "square";
      root.style.setProperty("--studio-main-font", theme.cssvars?.font_main || "United Sans Medium");
      const terminalPreview = panel.querySelector(".studio-preview-terminal");
      terminalPreview.style.color = theme.terminal?.foreground || toHex(colors);
      terminalPreview.style.backgroundColor = theme.terminal?.background || colors.light_black;
    }
    function isDraftDirty() {
      const name = get('[data-id="name"]').value.trim();
      return JSON.stringify(theme) !== JSON.stringify(originalTheme) || name !== selected;
    }
    function confirmDiscardDraft() {
      return !isDraftDirty() || window.confirm(
        window.edexI18n?.t?.("studio.confirmDiscard") || "Ungespeicherte Theme-Änderungen verwerfen und fortfahren?"
      );
    }
    root.__bockisConfirmDiscardDraft = confirmDiscardDraft;
    function updateDraftStatus() {
      const name = get('[data-id="name"]').value.trim();
      const dirty = isDraftDirty();
      root.dataset.themeDirty = String(dirty);
      const detail = get('[data-id="library-detail"]');
      if (detail) detail.textContent = `${name || "Neues Theme"} · ${dirty ? "Ungespeicherte Theme-Änderungen" : "Theme gespeichert / unverändert"}`;
      root.dispatchEvent(new CustomEvent("bockis-theme-dirty", { bubbles: true, detail: { dirty } }));
    }
    get('[data-id="name"]').addEventListener("input", updateDraftStatus);
    function refreshInputs() {
      const colors = theme.colors;
      for (const key of ["accent", "black", "light_black", "grey", "text", "heading", "secondaryText", "buttonText", "red", "yellow"]) {
        const value = key === "accent" ? toHex(colors) : (key === "text" ? (colors.text || toHex(colors)) : (["heading", "secondaryText", "buttonText"].includes(key) ? (colors[key] || colors.text || toHex(colors)) : (colors[key] || defaultTheme().colors[key])));
        get(`[data-color="${key}"]`).value = value;
        get(`[data-hex="${key}"]`).value = value;
      }
      for (const [key, value] of [
        ["terminalForeground", theme.terminal?.foreground || toHex(colors)],
        ["terminalBackground", theme.terminal?.background || colors.light_black]
      ]) {
        get(`[data-color="${key}"]`).value = value;
        get(`[data-hex="${key}"]`).value = value;
      }
      get('[data-theme-setting="font_main"]').value = theme.cssvars?.font_main || "United Sans Medium";
      get('[data-theme-setting="panelStyle"]').value = theme.panelStyle || "square";
      get('[data-theme-setting="terminalFont"]').value = theme.terminal?.fontFamily || "Fira Mono";
      get('[data-theme-setting="terminalCursor"]').value = theme.terminal?.cursorStyle || "block";
      updatePreview();
      updateDraftStatus();
    }
    function renderWindowsImport(imported) {
      const container = get('[data-id="windows-import-preview"]');
      container.replaceChildren();
      container.hidden = !imported;
      if (!imported) return;
      const cursorCount = Object.keys(imported.cursorScheme?.cursors || {}).length;
      const details = [
        `Importiert: ${imported.displayName || imported.sourceName}`,
        `Wallpaper: ${imported.wallpaper?.path || "nicht enthalten"}`,
        `Cursor-Schema: ${imported.cursorScheme?.name || "nicht enthalten"} (${cursorCount} Cursorpfade)`,
        `Sounds: ${(imported.sounds || []).length}`,
        `Visual-Style: ${imported.visualStyle?.path || "nicht enthalten"}`,
        `Farben: ${Object.values(imported.colors?.entries || {}).filter(Boolean).length} erkannt`
      ];
      for (const text of details) {
        const line = document.createElement("p");
        line.textContent = text;
        container.append(line);
      }
    }
    const windowsFeatures = [
      ["accentColor", "Windows-Akzentfarbe"],
      ["appsDarkMode", "Dunkler Modus für Apps"],
      ["systemDarkMode", "Dunkler Windows-Modus"],
      ["startTaskbarAccent", "Akzentfarbe auf Startmenü und Taskleiste"],
      ["windowTitleAccent", "Akzentfarbe auf Fenstertiteln"],
      ["transparencyEffects", "Windows-Transparenzeffekte"],
      ["taskbarAlignment", "Taskleisten-Ausrichtung"],
      ["taskbarSize", "Taskleisten-Größe (experimentell)"]
    ];
    async function setWindowsFeature(id, enabled) {
      const colors = theme.colors;
      const result = await api().applyWindowsTheme({
        action: "set-feature",
        feature: id,
        enabled,
        rgb: { r: colors.r, g: colors.g, b: colors.b }
      });
      if (!result.applied) throw new Error(result.error || `Anpassung „${id}“ konnte nicht angewendet werden.`);
      await refreshProfileHistory();
      return result;
    }
    function renderWindowsFeatures(features = {}) {
      activeWindowsFeatures = { ...features };
      const container = get('[data-id="windows-features"]');
      container.replaceChildren();
      for (const [id, label] of windowsFeatures) {
        const row = document.createElement("div");
        row.className = "studio-sync-feature";
        const featureDetails = document.createElement("span");
        featureDetails.className = "studio-sync-feature-label";
        const title = document.createElement("label");
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = features[id] === true;
        toggle.addEventListener("change", busy(async () => {
          const enabled = toggle.checked;
          let result;
          try {
            result = await setWindowsFeature(id, enabled);
          } catch (error) {
            toggle.checked = !enabled;
            throw error;
          }
          renderWindowsFeatures(result.features);
          status(`${label} ${enabled ? "aktiviert" : "deaktiviert"}.`);
        }));
        title.append(toggle, document.createTextNode(label));
        featureDetails.append(title);
        const test = document.createElement("button");
        test.type = "button";
        test.textContent = "Testen";
        test.addEventListener("click", busy(async () => {
          const colors = theme.colors;
          const result = await api().applyWindowsTheme({
            action: "test",
            feature: id,
            rgb: { r: colors.r, g: colors.g, b: colors.b }
          });
          if (!result.applied) throw new Error(result.error || `${label} konnte nicht getestet werden.`);
          await refreshProfileHistory();
          status(`${label} getestet. Mit „Wiederherstellen“ wird der Originalwert zurückgesetzt.`);
        }));
        const restore = document.createElement("button");
        restore.type = "button";
        restore.textContent = "Wiederherstellen";
        restore.addEventListener("click", busy(async () => {
          const result = await api().applyWindowsTheme({ action: "restore", feature: id });
          if (!result.applied) throw new Error(result.error || `Kein Backup für „${label}“ vorhanden.`);
          renderWindowsFeatures(result.features);
          await refreshProfileHistory();
          status(`${label} aus dem Backup wiederhergestellt.`);
        }));
        row.append(featureDetails, test, restore);
        container.append(row);
      }
    }
    function renderDesktopSettings(settings = desktopSettings) {
      desktopSettings = { ...settings };
      const displays = studioBootstrap?.displays || [];
      const displaySelect = get('[data-id="desktop-display"]');
      displaySelect.replaceChildren();
      for (const display of displays) {
        const option = document.createElement("option");
        option.value = String(display.id);
        option.textContent = `${display.primary ? "Primär" : "Monitor"} ${display.index + 1} · ${display.bounds.width}×${display.bounds.height}`;
        displaySelect.append(option);
      }
      displaySelect.value = String(studioBootstrap?.displayId ?? displays[0]?.id ?? "");
      const wallpaperSelect = get('[data-id="desktop-wallpaper"]');
      wallpaperSelect.replaceChildren();
      for (const wallpaper of studioBootstrap?.wallpapers || []) {
        const option = document.createElement("option");
        option.value = wallpaper.id;
        option.textContent = wallpaper.label;
        wallpaperSelect.append(option);
      }
      get('[data-id="desktop-sync"]').checked = desktopSettings.desktopSyncAcrossDisplays !== false;
      get('[data-id="desktop-grid"]').value = String(desktopSettings.gridSize || 32);
      get('[data-id="desktop-icons"]').value = desktopSettings.desktopIconPack || "standard";
      get('[data-id="desktop-cursor"]').value = desktopSettings.desktopCursorPack || "system";
      get('[data-id="panel-opacity"]').value = String(desktopSettings.panelOpacity || 100);
      get('[data-id="opacity-label"]').textContent = `${desktopSettings.panelOpacity || 100}%`;
      get('[data-id="contrast-mode"]').value = desktopSettings.contrastMode || "standard";
      updateSelectedWallpaper();
    }
    function updateSelectedWallpaper() {
      const displayId = get('[data-id="desktop-display"]').value;
      const sync = get('[data-id="desktop-sync"]').checked;
      const wallpaper = sync
        ? desktopSettings.wallpaper
        : desktopSettings.displayWallpapers?.[displayId] || desktopSettings.wallpaper;
      get('[data-id="desktop-wallpaper"]').value = wallpaper || "grid";
    }
    function renderProfileBackups(backups) {
      const select = get('[data-id="profile-backups"]');
      select.replaceChildren();
      for (const backup of backups) {
        const option = document.createElement("option");
        option.value = backup.id;
        option.textContent = `${backup.name} · ${new Date(backup.createdAt).toLocaleString()}`;
        select.append(option);
      }
      if (!backups.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Noch keine Backups";
        select.append(option);
      }
    }
    async function refreshProfileHistory() {
      const [backups, activity] = await Promise.all([
        api().themeStudioListBackups(),
        api().themeStudioActivity()
      ]);
      renderProfileBackups(backups);
      const list = get('[data-id="activity"]');
      list.replaceChildren();
      if (!activity.length) {
        const item = document.createElement("li");
        item.textContent = "Noch keine Änderungen protokolliert.";
        list.append(item);
      }
      for (const entry of activity) {
        const item = document.createElement("li");
        item.textContent = `${new Date(entry.at).toLocaleString()} · ${entry.action} · ${entry.name}`;
        list.append(item);
      }
    }
    async function refreshHistoryAfterCommit(warning) {
      if (warning) return warning;
      try {
        await refreshProfileHistory();
        return "";
      } catch (error) {
        const message = errorMessage(error);
        return window.edexI18n?.t?.("studio.historyUnavailable", { error: message })
          || `Verlauf und Backupliste konnten nicht aktualisiert werden: ${message}`;
      }
    }
    async function refreshWindowsRecovery() {
      const indicator = get('[data-id="windows-recovery-status"]');
      const button = get('[data-act="windows-emergency-restore"]');
      const recovery = await api().themeStudioWindowsRecoveryStatus();
      if (!recovery.available) {
        indicator.textContent = "Windows-Registry-Backup ist auf dieser Plattform nicht verfügbar.";
        button.disabled = true;
        return;
      }
      if (!recovery.backupValid) {
        indicator.textContent = `Windows-Backup ist ungültig: ${recovery.error || "Formatfehler"}`;
      } else if (recovery.pendingRecovery) {
        indicator.textContent = recovery.transactionValid
          ? "Eine unterbrochene Transaktion wartet auf Wiederherstellung."
          : `Transaktionsjournal ist beschädigt: ${recovery.error || "Formatfehler"}`;
      } else if (recovery.backupEntries) {
        indicator.textContent = `Backup geprüft: ${recovery.backupEntries} verwaltete Registry-Werte sind gesichert.`;
      } else {
        indicator.textContent = "Kein offenes Registry-Backup vorhanden.";
      }
      button.disabled = !recovery.pendingRecovery && recovery.backupEntries === 0;
    }
    function renderWindowsStyleStatus(integration) {
      const statusElement = get('[data-id="windows-style-status"]');
      const container = get('[data-id="windows-style-mods"]');
      container.replaceChildren();
      if (!integration.supportedPlatform) {
        statusElement.textContent = "BOCKIS Windows Style Integration ist nur unter Windows verfügbar.";
      } else if (integration.runtime === "missing") {
        statusElement.textContent = "Windhawk wurde nicht gefunden. Es wird nichts automatisch installiert.";
      } else if (integration.compatible) {
        statusElement.textContent = `Windhawk ${integration.version} erkannt. Die stabile Runtime ist kompatibel; Mod-Status bitte manuell in Windhawk prüfen.`;
      } else {
        statusElement.textContent = `Windhawk ${integration.version || "unbekannte Version"} erkannt, aber nicht mit dieser Integration geprüft. Benötigt wird eine stabile Version ab ${integration.minimumVersion} aus der 1.x-Reihe.`;
      }
      for (const mod of integration.mods || []) {
        const row = document.createElement("div");
        row.className = "studio-windhawk-mod";
        const details = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = mod.name;
        const note = document.createElement("small");
        note.textContent = mod.status === "manual-verification-required"
          ? "Installations- und Einstellungsstatus ist mit Windhawk 1.x nicht über eine unterstützte CLI prüfbar."
          : mod.status === "requires-windhawk"
            ? "Windhawk wird für dieses Mod benötigt."
            : mod.status === "blocked-by-runtime"
              ? "Runtime-Version nicht kompatibel oder nicht geprüft."
              : "Nur unter Windows verfügbar.";
        details.append(title, note);
        const open = document.createElement("button");
        open.type = "button";
        open.textContent = "Mod-Seite öffnen";
        open.disabled = !integration.supportedPlatform;
        open.addEventListener("click", busy(async () => {
          await api().themeStudioOpenWindowsStyleLink(mod.id);
          status(`${mod.name} auf der offiziellen Windhawk-Seite geöffnet.`);
        }));
        row.append(details, open);
        container.append(row);
      }
    }
    async function refreshWindowsStyleStatus() {
      const statusElement = get('[data-id="windows-style-status"]');
      try {
        renderWindowsStyleStatus(await api().themeStudioWindowsStyleStatus());
      } catch (error) {
        statusElement.textContent = `Windhawk-Status konnte nicht geprüft werden: ${error.message || String(error)}`;
        throw error;
      }
    }
    function renderComparison() {
      const container = get('[data-id="compare"]');
      container.replaceChildren();
      for (const [title, sample] of [["Vorher", originalTheme], ["Nachher", theme]]) {
        const card = document.createElement("div");
        card.className = "studio-compare-card";
        const heading = document.createElement("strong");
        heading.textContent = title;
        card.append(heading);
        for (const [name, color] of [
          ["Akzent", toHex(sample.colors)],
          ["Panel", sample.colors.black],
          ["Terminal", sample.terminal?.background || sample.colors.light_black]
        ]) {
          const swatch = document.createElement("span");
          swatch.className = "studio-swatch";
          swatch.style.backgroundColor = color;
          swatch.textContent = `${name} ${color}`;
          card.append(swatch);
        }
        const typography = document.createElement("small");
        typography.textContent = `${sample.cssvars?.font_main || "United Sans Medium"} · ${sample.terminal?.fontFamily || "Fira Mono"} · ${sample.panelStyle || "square"}`;
        card.append(typography);
        container.append(card);
      }
      container.hidden = false;
    }
    async function saveDesktopSettings() {
      const wallpaper = get('[data-id="desktop-wallpaper"]').value;
      const displayId = get('[data-id="desktop-display"]').value;
      const sync = get('[data-id="desktop-sync"]').checked;
      const displayWallpapers = { ...(desktopSettings.displayWallpapers || {}) };
      const displays = studioBootstrap?.displays || [];
      if (sync) {
        for (const display of displays) displayWallpapers[String(display.id)] = wallpaper;
      } else if (displayId) {
        displayWallpapers[displayId] = wallpaper;
      }
      const gridValue = Number(get('[data-id="desktop-grid"]').value);
      const patch = {
        wallpaper,
        displayWallpapers,
        desktopSyncAcrossDisplays: sync,
        gridSize: Number.isFinite(gridValue) ? Math.max(12, Math.min(96, Math.round(gridValue))) : 32,
        desktopIconPack: get('[data-id="desktop-icons"]').value,
        desktopCursorPack: get('[data-id="desktop-cursor"]').value,
        panelOpacity: Number(get('[data-id="panel-opacity"]').value),
        contrastMode: get('[data-id="contrast-mode"]').value
      };
      const result = await api().saveSettings(patch);
      desktopSettings = result.settings || { ...desktopSettings, ...patch };
      await refreshProfileHistory();
      status("Desktop-Optionen gespeichert und synchronisiert.");
    }
    function updateColor(key, value) {
      if (!validHex(value)) return false;
      if (key === "accent") Object.assign(theme.colors, fromHex(value));
      else if (key === "terminalForeground" || key === "terminalBackground") {
        theme.terminal = { ...(theme.terminal || {}), [key === "terminalForeground" ? "foreground" : "background"]: value.toLowerCase() };
      } else theme.colors[key] = value.toLowerCase();
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
    function setThemeOptions(themes, name) {
      if (!Array.isArray(themes) || themes.some((item) => typeof item !== "string")) {
        throw new Error("Theme-Liste ist ungültig.");
      }
      themeDropdown.replaceChildren();
      for (const item of themes) {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        themeDropdown.append(option);
      }
      themeDropdown.value = themes.includes(name) ? name : "";
    }
    root.__bockisSetThemeList = (themes) => {
      try { setThemeOptions(themes, selected); }
      catch (error) { status(error.message || String(error), true); }
    };
    async function refreshList(selectName) {
      const result = await api().themeStudioList();
      setThemeOptions(result.themes, result.themes.includes(selectName) ? selectName : result.active);
      return result;
    }
    async function load(name) {
      if (!name) throw new Error("Bitte Theme auswählen.");
      theme = await api().themeStudioLoad(name);
      selected = name;
      importedDesktop = null;
      themeDropdown.value = name;
      originalTheme = JSON.parse(JSON.stringify(theme));
      get('[data-id="name"]').value = name;
      renderWindowsImport(theme.windowsThemeImport);
      refreshInputs();
      status(`Theme „${name}“ geladen. Änderungen am Theme bitte hier mit „Speichern“ sichern.`);
    }
    async function loadSelection(name, force = false) {
      if (!force && name === selected) return;
      if (!confirmDiscardDraft()) {
        themeDropdown.value = selected;
        return;
      }
      try { await load(name); }
      catch (error) {
        themeDropdown.value = selected;
        throw error;
      }
    }
    function busy(fn) {
      return async () => {
        try { return await lockThemeFields(fn); }
        catch (error) { status(errorMessage(error), true); }
      };
    }
    async function lockThemeFields(fn) {
      if (inProgress) return;
      inProgress = true;
      const controls = [...root.querySelectorAll('[data-id="themes"], [data-id="name"], [data-color], [data-hex], [data-theme-setting]')];
      const disabled = controls.map((control) => control.disabled);
      controls.forEach((control) => { control.disabled = true; });
      try { return await fn(); }
      finally {
        controls.forEach((control, index) => { control.disabled = disabled[index]; });
        inProgress = false;
      }
    }
    themeDropdown.addEventListener("change", () => {
      const name = themeDropdown.value;
      if (inProgress) {
        themeDropdown.value = selected;
        return;
      }
      void busy(() => loadSelection(name))();
    });
    root.querySelectorAll(".studio-nav [data-section]").forEach((button) => button.addEventListener("click", () => {
      const fallbackPage = { edex: "library", windows: "windows", desktop: "desktop", profiles: "profiles" };
      showPage(fallbackPage[button.dataset.section] || "library");
    }));
    root.querySelectorAll("[data-theme-setting]").forEach((input) => input.addEventListener("change", () => {
        const key = input.dataset.themeSetting;
        if (key === "font_main") theme.cssvars = { ...(theme.cssvars || {}), font_main: input.value };
        if (key === "panelStyle") theme.panelStyle = input.value;
        if (key === "terminalFont") theme.terminal = { ...(theme.terminal || {}), fontFamily: input.value };
        if (key === "terminalCursor") theme.terminal = { ...(theme.terminal || {}), cursorStyle: input.value };
        updatePreview();
        updateDraftStatus();
    }));
    get('[data-id="desktop-display"]').addEventListener("change", updateSelectedWallpaper);
    get('[data-id="desktop-sync"]').addEventListener("change", updateSelectedWallpaper);
    get('[data-id="panel-opacity"]').addEventListener("input", () => {
        get('[data-id="opacity-label"]').textContent = `${get('[data-id="panel-opacity"]').value}%`;
    });
    // Optional Windows controls must not prevent the entire Settings UI from opening.
    const taskbarAlignmentInput = get('[data-id="taskbar-alignment"]');
    const taskbarSizeInput = get('[data-id="taskbar-size"]');
    if (taskbarAlignmentInput) taskbarAlignmentInput.value = "center";
    if (taskbarSizeInput) taskbarSizeInput.value = "medium";
    if (!taskbarAlignmentInput || !taskbarSizeInput) {
      console.warn("[Theme Studio] Windows taskbar controls missing; Windows options are unavailable in this view.");
    }
    root.querySelectorAll("[data-act]").forEach((button) => button.addEventListener("click", busy(async () => {
      const action = button.dataset.act;
      if (action === "popout") return api().themeStudioOpen();
      if (action === "guide-theme") return startStudioTour("theme");
      if (action === "guide-windows") return startStudioTour("windows");
      if (action === "load") return loadSelection(themeDropdown.value, true);
        if (action === "open-windhawk-install") {
          await api().themeStudioOpenWindowsStyleLink("install");
          return status("Offizielle Windhawk-Seite geöffnet. Installation und Mod-Auswahl bleiben deine Entscheidung.");
        }
        if (action === "save-desktop") return saveDesktopSettings();
        if (action === "save-windows-options") {
          if (!taskbarAlignmentInput || !taskbarSizeInput) {
            throw new Error("Windows-Taskleistenoptionen fehlen in dieser Ansicht. Bitte Theme Studio neu öffnen.");
          }
          const patch = {
            windowsTaskbarAlignment: taskbarAlignmentInput.value,
            windowsTaskbarSize: taskbarSizeInput.value
          };
          await api().saveSettings(patch);
          if (!activeWindowsFeatures.taskbarAlignment && !activeWindowsFeatures.taskbarSize) {
            desktopSettings = { ...desktopSettings, ...patch };
            return status("Optionen gespeichert. Aktiviere oben mindestens eine Taskleisten-Anpassung, um sie anzuwenden.");
          }
          const colors = theme.colors;
          const result = await api().applyWindowsTheme({
            action: "sync",
            rgb: { r: colors.r, g: colors.g, b: colors.b }
          });
          if (!result.applied) throw new Error(result.error || "Windows-Optionen konnten nicht angewendet werden.");
          desktopSettings = { ...desktopSettings, ...patch };
          await refreshProfileHistory();
          return status("Windows-Optionen angewendet.");
        }
        if (action === "adopt-windows-theme") {
          const windows = await api().getWindowsColors();
          if (!windows || !validHex(windows.accent)) throw new Error("Windows-Farben konnten nicht gelesen werden.");
          Object.assign(theme.colors, fromHex(windows.accent));
          if (windows.dark) {
            theme.colors.black = "#000000";
            theme.colors.light_black = "#05080d";
          } else {
            theme.colors.black = "#f4f7fa";
            theme.colors.light_black = "#e7edf2";
          }
          theme.terminal = {
            ...(theme.terminal || {}),
            foreground: windows.dark ? windows.accent : "#17232d",
            background: theme.colors.light_black
          };
          refreshInputs();
          return status("Windows-Akzentfarbe und Hell-/Dunkelmodus in den Theme-Entwurf übernommen.");
        }
        if (action === "import-windows-theme") {
          if (!confirmDiscardDraft()) return;
          const result = await api().themeStudioImportWindowsTheme();
          if (result.canceled) return;
          theme = result.theme;
          selected = "";
          importedDesktop = null;
          themeDropdown.value = "";
          originalTheme = JSON.parse(JSON.stringify(theme));
          get('[data-id="name"]').value = result.name;
          renderWindowsImport(result.imported);
          refreshInputs();
          await refreshProfileHistory();
          return status(`Windows-Theme „${result.imported.displayName}“ nur eingelesen. Windows wurde nicht verändert; zum Übernehmen als eDEX-Theme speichern.`);
        }
        if (action === "compare") {
          renderComparison();
          return;
        }
        if (action === "import-package") {
          if (!confirmDiscardDraft()) return;
          const imported = await api().themeStudioImport();
          if (imported.canceled) return;
          theme = imported.theme;
          selected = imported.name;
          originalTheme = JSON.parse(JSON.stringify(theme));
          renderWindowsImport(theme.windowsThemeImport);
          importedDesktop = imported.desktop || null;
          if (importedDesktop) {
            desktopSettings = { ...desktopSettings, ...importedDesktop };
            renderDesktopSettings(desktopSettings);
          }
          get('[data-id="name"]').value = selected;
          await refreshList(selected);
          refreshInputs();
          await refreshProfileHistory();
          return status(`Theme-Paket „${selected}“ importiert. Zum Anwenden Theme aktivieren.`);
        }
        if (action === "export-package") {
          const name = get('[data-id="name"]').value.trim() || selected;
          if (!name || name !== selected || isDraftDirty()) throw new Error("Speichere das Theme vor dem Export unter dem ausgewählten Namen.");
          const result = await api().themeStudioExport(name);
          if (!result.canceled) {
            await refreshProfileHistory();
            status(`Theme-Paket „${result.name}“ exportiert.`);
          }
          return;
        }
        if (action === "create-backup") {
          const backup = await api().themeStudioCreateBackup();
          await refreshProfileHistory();
          return status(`Backup von „${backup.name}“ erstellt.`);
        }
        if (action === "restore-backup") {
          const id = get('[data-id="profile-backups"]').value;
          if (!id) throw new Error("Kein Backup ausgewählt.");
          if (!window.confirm("Theme und gespeicherte Desktop-/Windows-Optionen aus diesem Backup wiederherstellen?")) return;
          const result = await api().themeStudioRestoreBackup(id);
          await refreshList(result.name);
          await load(result.name);
          const bootstrap = await api().bootstrap();
          studioBootstrap = bootstrap;
          desktopSettings = bootstrap.settings || {};
          renderDesktopSettings(desktopSettings);
          renderWindowsFeatures(desktopSettings.windowsThemeFeatures);
          await refreshProfileHistory();
          return status(result.windowsApplied || bootstrap.platform !== "win32"
            ? `Backup als „${result.name}“ wiederhergestellt.`
            : `Backup als „${result.name}“ wiederhergestellt; Windows-Anpassungen konnten nicht synchronisiert werden.`, !result.windowsApplied && bootstrap.platform === "win32");
        }
        if (action === "windows-emergency-restore") {
          if (!window.confirm("Alle vom Theme Studio verwalteten Windows-Registry-Werte aus dem Backup wiederherstellen und die Windows-Anpassungen deaktivieren?")) return;
          const result = await api().themeStudioWindowsEmergencyRestore();
          if (result.restored) {
            renderWindowsFeatures(result.features);
            await refreshProfileHistory();
            await refreshWindowsRecovery();
            return status("Verwaltete Windows-Werte wurden aus dem Backup wiederhergestellt.");
          }
          await refreshWindowsRecovery();
          if (result.recovered) return status(result.error, true);
          throw new Error(result.error || "Windows-Notfallwiederherstellung fehlgeschlagen.");
        }
      if (action === "new") {
        if (!confirmDiscardDraft()) return;
        theme = defaultTheme();
        selected = "";
        importedDesktop = null;
        themeDropdown.value = "";
        originalTheme = JSON.parse(JSON.stringify(theme));
        get('[data-id="name"]').value = "mein_theme";
        renderWindowsImport(null);
        refreshInputs();
        updateDraftStatus();
        return status("Neues Theme erstellt. Bitte benennen und speichern.");
      }
      if (action === "save") {
        const name = get('[data-id="name"]').value.trim();
        if (name !== selected && [...themeDropdown.options].some((option) => option.value === name)) {
          const prompt = window.edexI18n?.t?.("studio.confirmOverwrite", { name })
            || `Das Theme „${name}“ existiert bereits. Soll der aktuelle Entwurf unter diesem Namen gespeichert werden? Eigene Themes werden vorher gesichert; Original-Themes bleiben schreibgeschützt.`;
          if (!window.confirm(prompt)) return;
        }
        const saved = await api().themeStudioSave(name, theme);
        theme = saved.theme;
        selected = saved.name;
        originalTheme = JSON.parse(JSON.stringify(theme));
        get('[data-id="name"]').value = selected;
        setThemeOptions(saved.themes, selected);
        refreshInputs();
        const warning = await refreshHistoryAfterCommit(saved.warning);
        if (warning) {
          return status(window.edexI18n?.t?.("studio.savedWithWarning", { name: selected, warning })
            || `Theme „${selected}“ gespeichert. ${warning}`, true);
        }
        return status(window.edexI18n?.t?.("studio.saved", { name: selected })
          || `Theme „${selected}“ gespeichert.`);
      }
      if (action === "delete") {
        const name = get('[data-id="themes"]').value;
        if (!name) throw new Error("Bitte Theme auswählen.");
        if (!window.confirm(`Eigenes Theme „${name}“ löschen? Es wird vorher gesichert.`)) return;
        await api().themeStudioDelete(name);
        const result = await refreshList();
        await load(result.active === "tron" ? "tron" : result.active);
        await refreshProfileHistory();
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
        if (!name || name !== selected || isDraftDirty()) {
          return status(window.edexI18n?.t?.("studio.saveBeforeActivate") || "Bitte zuerst die Theme-Änderungen speichern.", true);
        }
        if (importedDesktop) {
          const patch = {};
          for (const key of [
            "wallpaper", "displayWallpapers", "desktopSyncAcrossDisplays", "gridSize",
            "desktopIconPack", "desktopCursorPack", "panelOpacity", "contrastMode",
            "windowsThemeFeatures", "windowsTaskbarAlignment", "windowsTaskbarSize"
          ]) {
            if (importedDesktop[key] !== undefined) patch[key] = importedDesktop[key];
          }
          if (Object.keys(patch).length) await api().saveSettings(patch);
          importedDesktop = null;
        }
        const activation = await api().themeStudioActivate(selected);
        await api().themeStudioResetPreview();
        const warning = await refreshHistoryAfterCommit(activation?.warning);
        if (warning) {
          return status(window.edexI18n?.t?.("studio.activatedWithWarning", { name: selected, warning })
            || `Theme „${selected}“ aktiviert. ${warning}`, true);
        }
        return status(`Theme „${selected}“ aktiviert – alle eDEX-Monitore synchronisiert.`);
      }
    })));
    // The stand-alone editor receives shared settings changes from the main process.
    // Re-translate the existing elements without rebuilding its unsaved theme draft.
    if (!embedded) {
      api()?.onSettingsUpdated?.((payload) => {
        const next = payload?.settings?.locale;
        if (next) window.edexI18n?.setLocale?.(next);
        window.edexI18n?.translatePage?.(root);
      });
      api()?.onThemesUpdated?.((themes) => root.__bockisSetThemeList(themes));
    }
    // Localize once after the DOM is assembled; preserve the current theme draft.
    window.edexI18n?.translatePage?.(root);
    if (typeof window.addEventListener === "function") {
      window.addEventListener("edex:locale-changed", () => {
        if (root.isConnected) window.edexI18n?.translatePage?.(root);
      });
    }
    (async () => {
      try {
        await lockThemeFields(async () => {
          const result = await refreshList();
          await load(result.active || "tron");
        });
        const bootstrap = await api().bootstrap();
        studioBootstrap = bootstrap;
        desktopSettings = bootstrap?.settings || {};
        window.edexI18n?.setLocale?.(desktopSettings.locale || "en");
        window.edexI18n?.translatePage?.(root);
        if (taskbarAlignmentInput) taskbarAlignmentInput.value = desktopSettings.windowsTaskbarAlignment || "center";
        if (taskbarSizeInput) taskbarSizeInput.value = desktopSettings.windowsTaskbarSize || "medium";
        renderDesktopSettings(desktopSettings);
        renderWindowsFeatures(bootstrap?.settings?.windowsThemeFeatures);
        await refreshProfileHistory();
        await refreshWindowsRecovery();
        await refreshWindowsStyleStatus();
      } catch (error) {
        status(`Initialisierung fehlgeschlagen: ${errorMessage(error)}`, true);
      }
    })();
  }
  function selectSection(root, section, anchor) {
    if (!root?.__bockisShowPage) return false;
    const pages = {
      "theme-library": "library", "edex-colors": "colors",
      "panel-design": "panels", "live-preview": "preview",
      "windows-manager": "windows", windhawk: "windhawk",
      desktop: "desktop", profiles: "profiles"
    };
    const defaultPage = { edex: "library", windows: "windows", desktop: "desktop", profiles: "profiles" };
    return root.__bockisShowPage(pages[anchor] || defaultPage[section] || "library");
  }
  window.BockisThemeStudio = {
    mount,
    selectSection,
    startTour: (root, kind) => root?.__bockisStartStudioTour?.(kind) === true
  };
  document.addEventListener("DOMContentLoaded", () => {
    const standalone = document.querySelector("#theme-studio-root");
    if (standalone) mount(standalone);
  });
})();
