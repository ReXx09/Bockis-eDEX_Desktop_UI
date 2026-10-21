window.edexRendererPanels = (() => {
function panelBody(id) {
  switch (id) {
    case "clock":
      return `
        <div id="mod_clock">
          <div id="mod_clock_led" class="led-matrix" aria-label="點陣時鐘"></div>
          <div id="mod_clock_analog" class="analog-clock" aria-label="Analoge Uhr" hidden>
            <span class="analog-clock-number number-12">12</span>
            <span class="analog-clock-number number-3">3</span>
            <span class="analog-clock-number number-6">6</span>
            <span class="analog-clock-number number-9">9</span>
            <span class="analog-clock-hand analog-clock-hour"></span>
            <span class="analog-clock-hand analog-clock-minute"></span>
            <span class="analog-clock-hand analog-clock-second"></span>
            <span class="analog-clock-center"></span>
          </div>
          <div id="mod_clock_analog_date" class="analog-clock-date" hidden></div>
        </div>`;
    case "coderain":
      return `
        <div id="mod_coderain">
          <div id="mod_coderain_inner">
            <h1>CODE BACKGROUND<i id="mod_coderain_meta">BOOT LOG / CMATRIX</i></h1>
            <section id="mod_coderain_stream">
              <canvas id="mod_coderain_canvas"></canvas>
            </section>
          </div>
        </div>`;
    case "weather":
      return `
        <div class="weather-root">
          <div class="weather-toolbar">
            <input type="search" data-weather-location value="Berlin" placeholder="Ort suchen …" spellcheck="false" />
            <button type="button" data-weather-refresh title="Wetter aktualisieren">↻</button>
          </div>
          <div class="weather-status" data-weather-status>Wetter wird geladen …</div>
          <div class="weather-current" data-weather-current></div>
          <div class="weather-days" data-weather-days></div>
        </div>`;
    case "sysinfo":
      return `
        <div id="mod_sysinfo">
          <div data-edex-sys>
            <h1 id="sys_year">—</h1>
            <h2 id="sys_month">—</h2>
          </div>
          <div data-edex-sys>
            <h1>UPTIME</h1>
            <h2 id="sys_uptime">0:0:0</h2>
          </div>
          <div data-edex-sys>
            <h1>TYPE</h1>
            <h2 id="sys_type">—</h2>
          </div>
          <div data-edex-sys>
            <h1>POWER</h1>
            <h2 id="sys_power">AC</h2>
          </div>
        </div>`;
    case "hw":
      return `
        <div id="mod_hardwareInspector">
          <div id="mod_hardwareInspector_inner">
            <div>
              <h1>MANUFACTURER</h1>
              <h2 id="mod_hardwareInspector_manufacturer">NONE</h2>
            </div>
            <div>
              <h1>MODEL</h1>
              <h2 id="mod_hardwareInspector_model">NONE</h2>
            </div>
            <div>
              <h1>CHASSIS</h1>
              <h2 id="mod_hardwareInspector_chassis">NONE</h2>
            </div>
          </div>
        </div>`;
    case "toplist":
      return `
        <div id="mod_toplist">
          <div class="toplist-filters" role="group" aria-label="Prozessfilter">
            <button type="button" class="toplist-filter on" data-top-sort="cpu">CPU</button>
            <button type="button" class="toplist-filter" data-top-sort="mem">MEM</button>
            <button type="button" class="toplist-filter" data-top-sort="energy">ENERGY</button>
            <button type="button" class="toplist-filter" data-top-sort="conn">CONN</button>
          </div>
          <div class="toplist-columns"><span>PID</span><span>NAME</span><span>VALUE</span></div>
          <table id="mod_toplist_table"></table>
        </div>`;
    case "ram":
      return `
        <div id="mod_ramwatcher">
          <div id="mod_ramwatcher_inner">
            <div class="ram-gauge-filters" role="group" aria-label="RAM-Anzeige">
              ${[["used", "USED"], ["free", "FREE"], ["cached", "CACHED"], ["available", "AVAIL"], ["total", "TOTAL"]].map(([value, label]) => `<button type="button" class="ram-gauge-filter${ramGaugeMode() === value ? " on" : ""}" data-ram-gauge="${value}">${label}</button>`).join("")}
            </div>
            <div class="ramwatcher-meta"><i id="mod_ramwatcher_info"></i></div>
            <div id="mod_ramwatcher_visual">
              <canvas id="mod_ramwatcher_gauge"></canvas>
              <div id="mod_ramwatcher_stack">
                <div class="ram-stack-track">
                  <i id="mod_ramwatcher_used_seg" class="ram-seg used"></i>
                  <i id="mod_ramwatcher_avail_seg" class="ram-seg avail"></i>
                  <i id="mod_ramwatcher_free_seg" class="ram-seg free"></i>
                </div>
                <div class="ram-stack-legend">
                  <span><em class="used"></em>USED <b id="mod_ramwatcher_used_pct">—</b></span>
                  <span><em class="avail"></em>AVAIL <b id="mod_ramwatcher_avail_pct">—</b></span>
                  <span><em class="free"></em>FREE <b id="mod_ramwatcher_free_pct">—</b></span>
                  <span><em class="cached"></em>CACHED <b id="mod_ramwatcher_cached_pct">—</b></span>
                  <span><em class="total"></em>TOTAL <b id="mod_ramwatcher_total_value">—</b></span>
                </div>
              </div>
            </div>
            <canvas id="mod_ramwatcher_wave"></canvas>
            <div id="mod_ramwatcher_swapcontainer">
              <h1>SWAP</h1>
              <progress id="mod_ramwatcher_swapbar" max="100" value="0"></progress>
              <h3 id="mod_ramwatcher_swaptext">0.0 GiB</h3>
            </div>
          </div>
        </div>`;
    case "cpu":
      return `
        <div id="mod_cpuinfo">
          <div id="mod_cpuinfo_innercontainer">
            <div class="cpuinfo-meta"><i id="mod_cpuinfo_name">—</i></div>
            <div class="cpu-total-row">
              <div class="cpu-total-load" data-cpu-level="ok">
                <span class="cpu-total-label">TOTAL LOAD</span>
                <strong id="mod_cpuinfo_total">—%</strong>
              </div>
              <div id="mod_cpuinfo_pointmap" class="edex-pointmap" data-cols="48" data-rows="12" aria-hidden="true"></div>
            </div>
            <div class="cpu-meta-row">
              <div>
                <h1>CORES<br><i id="mod_cpuinfo_temp">—</i></h1>
              </div>
              <div>
                <h1>SPD<br><i id="mod_cpuinfo_speed_min">--GHz</i></h1>
              </div>
              <div>
                <h1>MAX<br><i id="mod_cpuinfo_speed_max">--GHz</i></h1>
              </div>
              <div>
                <h1>TASKS<br><i id="mod_cpuinfo_tasks">—</i></h1>
              </div>
            </div>
          </div>
        </div>`;
    case "netstat":
      return `
        <div id="mod_netstat">
          <div id="mod_netstat_inner">
            <h1>NETWORK STATUS<i id="mod_netstat_iname">Interface: —</i></h1>
            <div id="mod_netstat_innercontainer">
              <div><h1>STATE</h1><h2 id="mod_netstat_state">UNKNOWN</h2></div>
              <div><h1>IPv4</h1><h2 id="mod_netstat_ip">--.--.--.--</h2></div>
              <div><h1>PING</h1><h2 id="mod_netstat_ping">--ms</h2></div>
            </div>
          </div>
        </div>`;
    case "globe":
      return `
        <div id="mod_globe">
          <div id="mod_globe_innercontainer">
            <div class="globe-meta"><i class="mod_globe_headerInfo">0.0000, 0.0000</i></div>
            <div class="globe-view-switch" role="group" aria-label="Ansicht">
              <button type="button" class="globe-filter on" data-globe-view="globe">GLOBE</button>
              <button type="button" class="globe-filter" data-globe-view="list">LISTE</button>
            </div>
            <div id="mod_globe_canvas_placeholder"></div>
            <div class="globe-connections-list" hidden></div>
            <div class="globe-filters" role="group" aria-label="Verbindungsfilter">
              <button type="button" class="globe-filter on" data-globe-filter="world">WORLD</button>
              <button type="button" class="globe-filter" data-globe-filter="outgoing">OUT</button>
              <button type="button" class="globe-filter" data-globe-filter="incoming">IN</button>
              <button type="button" class="globe-filter" data-globe-filter="local">LOCAL</button>
            </div>
            <h3>OFFLINE</h3>
          </div>
        </div>`;
    case "conninfo":
      return `
        <div id="mod_conninfo" data-conn-mode="live">
          <div id="mod_conninfo_innercontainer">
            <div class="conninfo-filters" role="group" aria-label="Netzwerkansicht">
              <button type="button" class="conninfo-filter on" data-conn-view="live">LIVE</button>
              <button type="button" class="conninfo-filter" data-conn-view="total">TOTAL</button>
              <button type="button" class="conninfo-filter" data-conn-view="up">UP</button>
              <button type="button" class="conninfo-filter" data-conn-view="down">DOWN</button>
            </div>
            <div class="conninfo-meta">AKTUELL</div>
            <div class="conninfo-current">
              <div><span>UP</span><strong id="mod_conninfo_up">—/S</strong></div>
              <div><span>DOWN</span><strong id="mod_conninfo_down">—/S</strong></div>
            </div>
            <div class="conninfo-total-label">GESAMT</div>
            <div class="conninfo-totals">
              <div class="conninfo-total out"><span>TOTAL OUT</span><strong id="mod_conninfo_total_out">—</strong></div>
              <div class="conninfo-total in"><span>TOTAL IN</span><strong id="mod_conninfo_total_in">—</strong></div>
            </div>
            <div class="conn-pointmap-block up">
              <div class="conn-pointmap-label"><span>UP</span><strong id="mod_conninfo_up_chart_rate">—/S</strong></div>
              <div id="mod_conninfo_pointmap_up" class="edex-pointmap edex-pointmap-up" data-cols="48" data-rows="10" aria-hidden="true"></div>
            </div>
            <div class="conn-pointmap-block down">
              <div class="conn-pointmap-label"><span>DOWN</span><strong id="mod_conninfo_down_chart_rate">—/S</strong></div>
              <div id="mod_conninfo_pointmap_down" class="edex-pointmap edex-pointmap-down" data-cols="48" data-rows="10" aria-hidden="true"></div>
            </div>
            <h3>OFFLINE</h3>
          </div>
        </div>`;
    case "calendar":
      return `
        <div class="cal-root">
          <div class="cal-toolbar">
            <button type="button" id="cal_prev">‹</button>
            <h1 id="cal_title">—</h1>
            <button type="button" id="cal_next">›</button>
          </div>
          <div class="cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span class="sun">So</span></div>
          <div id="cal_grid" class="cal-grid"></div>
        </div>`;
    case "drives":
      return `<div id="drives-stage" class="drives-stage"></div>`;
    case "filesearch":
      return `
        <div class="fs-root">
          <div class="fs-toolbar">
            <input id="fs_query" type="search" spellcheck="false" placeholder="Lokale/LAN-Dateien suchen …" />
            <button type="button" id="fs_go">Suchen</button>
          </div>
          <div class="fs-status" id="fs_status">Suchbegriff eingeben</div>
          <div class="fs-results" id="fs_results"></div>
        </div>`;
    case "terminal":
      return `
        <div class="terminal-root">
          <div class="terminal-toolbar">
            <span class="terminal-status" data-terminal-status>PowerShell-Konsole bereit</span>
            <button type="button" data-terminal-browser title="Datei-Browser ein- oder ausblenden">FILES</button>
          </div>
          <div class="terminal-grid" data-terminal-grid></div>
        </div>`;
    case "cockpit":
      return window.cockpitPanel?.bodyHtml?.() || `<div class="path-empty">駕駛室模組未載入</div>`;
    case "cassette":
      return window.cassettePanel?.bodyHtml?.() || `<div class="path-empty">磁帶模組未載入</div>`;
    case "ddj":
      return window.ddjPanel?.bodyHtml?.() || `<div class="path-empty">DDJ 模組未載入</div>`;
    case "cpuRail":
      return window.cpuRailPanel?.bodyHtml?.() || `<div class="path-empty">CPU 供電路徑模組未載入</div>`;
    case "calculator":
      return window.calculatorPanel?.bodyHtml?.() || `<div class="path-empty">計算器模組未載入</div>`;
    case "log":
      return `
        <div id="mod_log" class="log-panel">
          <div class="log-toolbar">
            <span data-log-file>Log wird geladen …</span>
            <select data-log-level aria-label="Log-Level">
              <option value="all">ALLE</option>
              <option value="error">ERROR</option>
              <option value="warn">WARN</option>
              <option value="info">INFO</option>
            </select>
            <button type="button" data-log-refresh title="Log aktualisieren">↻</button>
          </div>
          <div class="log-list" data-log-list></div>
        </div>`;
    case "autostart":
      return `
        <div id="mod_autostart" class="autostart-panel">
          <div class="autostart-toolbar">
            <span data-autostart-count>Autostart-Einträge werden geladen …</span>
            <button type="button" data-autostart-refresh title="Autostart aktualisieren">↻</button>
          </div>
          <div class="autostart-list" data-autostart-list></div>
        </div>`;
    case "dock":
      return window.dockPanel?.bodyHtml?.() || `<div class="path-empty">Dock-Modul nicht geladen</div>`;
    case "taskdock":
      return `<div id="task-dock-panel" class="task-dock-panel"><div class="dock-items task-dock-items" data-task-dock-items aria-label="Windows-Taskleistenverknüpfungen"></div></div>`;
    default:
      return "";
  }
}

function panelDisplayTitle(id) {
  return state.layout[id]?.title || PANEL_META[id]?.title || id;
}

function cardToolsHtml({ allowMinimize = true } = {}) {
  return `
    <span class="card-tools">
      ${allowMinimize ? '<button type="button" class="card-tool minimize-btn" data-card-act="minimize" title="In den Dock minimieren">−</button>' : ""}
      <button type="button" class="card-tool snap-btn" data-card-act="snap" title="1/4-Snap-Grid öffnen" aria-label="1/4-Snap-Grid öffnen">▦</button>
      <button type="button" class="card-tool settings-btn" data-card-act="settings" title="Panel-Setup öffnen" aria-label="Panel-Setup öffnen">⚙</button>
      <button type="button" class="card-tool more-btn" data-card-act="more" title="Weitere Aktionen" aria-label="Weitere Aktionen">⋯</button>
    </span>`;
}

function closeCardMenus() {
  document.querySelectorAll(".card-menu, .color-palette").forEach((m) => m.remove());
}

function openCardMenu(anchorBtn, items, pos) {
  closeCardMenus();
  const menu = document.createElement("div");
  menu.className = "card-menu";
  menu.innerHTML = items.map((item, i) => {
    if (item.sep) return `<div class="card-menu-sep"></div>`;
    if (item.kind === "tags") {
      const selected = new Set(item.tags || []);
      const dots = MACOS_TAGS.map((tag) => `
        <button type="button" class="macos-tag${selected.has(tag.id) ? " on" : ""}" data-tag="${tag.id}" title="${escapeHtml(tag.label)}" style="--tag:${tag.color}"></button>
      `).join("");
      return `<div class="macos-tags" data-tags-idx="${i}">
        <div class="macos-tags-label">Markierung</div>
        <div class="macos-tags-row">${dots}<button type="button" class="macos-tag none" data-tag="" title="Keine">×</button></div>
      </div>`;
    }
    return `<button type="button" data-menu-idx="${i}">${escapeHtml(item.label)}</button>`;
  }).join("");
  document.body.appendChild(menu);
  window.edexI18n?.translatePage?.(menu);
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  let left;
  let top;
  if (pos) {
    left = pos.x;
    top = pos.y;
  } else {
    const rect = anchorBtn.getBoundingClientRect();
    left = rect.right - mw;
    top = rect.bottom + 4;
  }
  if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
  if (left < 8) left = 8;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, (pos ? pos.y : top) - mh - 4);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.querySelectorAll("[data-menu-idx]").forEach((btn) => {
    btn.onclick = (event) => {
      event.stopPropagation();
      const item = items[Number(btn.dataset.menuIdx)];
      closeCardMenus();
      item?.action?.();
    };
  });
  menu.querySelectorAll("[data-tags-idx]").forEach((box) => {
    const item = items[Number(box.dataset.tagsIdx)];
    let current = [...(item.tags || [])];
    box.addEventListener("pointerdown", (event) => event.stopPropagation());
    box.querySelectorAll("[data-tag]").forEach((btn) => {
      btn.onclick = async (event) => {
        event.stopPropagation();
        const id = btn.dataset.tag;
        if (!id) current = [];
        else if (current.includes(id)) current = current.filter((t) => t !== id);
        else current = [...current, id];
        box.querySelectorAll("[data-tag]").forEach((dot) => {
          if (!dot.dataset.tag) return;
          dot.classList.toggle("on", current.includes(dot.dataset.tag));
        });
        try {
          await item.onChange?.(current);
          item.tags = current;
        } catch (err) {
          toast(err.message || "Markierung konnte nicht aktualisiert werden");
        }
      };
    });
  });
  const dismiss = (event) => {
    if (!menu.contains(event.target) && event.target !== anchorBtn) {
      closeCardMenus();
      window.removeEventListener("pointerdown", dismiss, true);
    }
  };
  setTimeout(() => window.addEventListener("pointerdown", dismiss, true), 0);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HUD_HIT_SEL = ".hud-card, .path-card, .program-card, .desktop-card, .card-menu, .color-palette, #fab-bar, .modal_popup, .round-fab, .toast";

function pointHitsHud(x, y) {
  if (document.body.classList.contains("is-ui-hold")) return true;
  try {
    const stack = document.elementsFromPoint(x, y) || [];
    for (const el of stack) {
      if (el?.closest?.(HUD_HIT_SEL)) return true;
    }
  } catch {
    // ignore
  }
  for (const node of document.querySelectorAll(HUD_HIT_SEL)) {
    // Dock backdrop is decorative / click-through (under transparent taskbar).
    if (node.classList?.contains("dock-bare") || node.id === "card_dock") continue;
    const r = node.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}

function deskIconAt(x, y) {
  try {
    const stack = document.elementsFromPoint(x, y) || [];
    for (const el of stack) {
      const icon = el?.closest?.(".desk-icon[data-path]");
      if (icon) return icon;
    }
  } catch {
    // ignore
  }
  for (const icon of document.querySelectorAll(".desk-icon[data-path]")) {
    const r = icon.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return icon;
  }
  return null;
}

function setupDesktopClickThrough() {
  if (!window.edex?.setMouseIgnore) return;
  let ignoring = true;
  window.edex.setMouseIgnore(true);
  const forceCapture = () => {
    if (ignoring) {
      ignoring = false;
      window.edex.setMouseIgnore(false);
    }
  };
  const applyAt = (x, y) => {
    if (document.body.classList.contains("is-ui-hold")) {
      forceCapture();
      return;
    }
    if (document.body.classList.contains("is-file-dragging")) return;
    const overHud = pointHitsHud(x, y);
    if (document.body.classList.contains("is-file-drag-armed") && overHud) {
      forceCapture();
      return;
    }
    const blocking = document.querySelector(
      ".dragging, .is-file-dragging, .card-menu, .modal_popup, .drop-target, .color-palette"
    );
    const nextIgnore = !overHud && !blocking;
    if (nextIgnore === ignoring) return;
    ignoring = nextIgnore;
    window.edex.setMouseIgnore(nextIgnore);
  };
  // Poll OS cursor even while click-through — forwarded mousemove alone is unreliable
  // for the first click on desktop icons (ignore still true → click falls to wallpaper).
  const poll = () => {
    if (document.visibilityState === "hidden") return;
    if (fileDragBlocksHitPoll()) return;
    const pt = window.edex.getCursorClientPoint?.();
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return;
    applyAt(pt.x, pt.y);
  };
  clearInterval(setupDesktopClickThrough._timer);
  // ~12Hz is enough for hit-testing; 32ms (~31Hz) burned CPU for little gain.
  setupDesktopClickThrough._timer = setInterval(poll, 80);
  document.addEventListener("pointermove", (event) => {
    applyAt(event.clientX, event.clientY);
  }, { capture: true, passive: true });
  document.addEventListener("pointerdown", (event) => {
    applyAt(event.clientX, event.clientY);
  }, true);
  window.addEventListener("dragover", (event) => {
    if (![...event.dataTransfer.types].includes("Files")) return;
    if (pointHitsHud(event.clientX, event.clientY)) forceCapture();
  }, true);
}

function fileDragBlocksHitPoll() {
  return document.body.classList.contains("is-file-dragging");
}

function itemFromDeskNode(icon) {
  if (!icon) return null;
  try {
    if (icon.dataset.itemJson) return JSON.parse(icon.dataset.itemJson);
  } catch {
    // fall through
  }
  return itemFromIcon(icon);
}

  return {
    panelBody,
    cardToolsHtml,
    closeCardMenus,
    openCardMenu,
    pointHitsHud,
    deskIconAt,
    setupDesktopClickThrough,
    fileDragBlocksHitPoll,
    itemFromDeskNode
  };
})();
