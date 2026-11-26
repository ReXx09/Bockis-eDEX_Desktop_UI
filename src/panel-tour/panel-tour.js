/* BOCKIS contextual panel guides 2.0: shared basics once, type-specific steps afterwards. */
(() => {
  "use strict";
  let running = false;
  // Only these known, panel-owned inputs may participate in a learning exercise.
  const PRACTICE = Object.freeze({
    "setup:#panel-clock-mode": "select",
    "setup:#panel-clock-date": "checkbox",
    "setup:#panel-ram-mode": "select",
    "setup:#panel-weather-location": "select",
    "setup:#panel-search-font": "number",
    "setup:#panel-taskdock-tile-size": "select",
    "setup:#panel-taskdock-show-labels": "checkbox",
    "setup:#panel-font-scale": "number"
  });
  const t = (key) => window.edexI18n?.t?.(key) || key;
  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const COMMON_TARGETS = Object.freeze({panel: "panel", scale: "zone-scale", edge: "zone-edge", menu: "panel-menu"});
  const COMMON = ["panel", "scale", "edge", "menu"].map((name) => ({
    id: `common-${name}`, titleKey: `panelGuide.common.${name}.title`,
    descriptionKey: `panelGuide.common.${name}.body`, target: COMMON_TARGETS[name],
    ...(name === "panel" ? {interaction: "move-panel"} : {}),
    ...(name === "panel" ? {interaction: "move-panel"} : {})
  }));
  const FONT_STEP = Object.freeze({
    id: "common-font", titleKey: "panelGuide.common.font.title",
    descriptionKey: "panelGuide.common.font.body", target: "setup:#panel-font-scale"
  });
  const FOCUSABLE = "button:not([disabled]), select:not([disabled]), input:not([disabled])";
  // Places the card beside the highlighted area using its real size, so taller practice cards stay on screen.
  function placeCard(card, r) {
    const gap = 16, margin = 14;
    const w = card.offsetWidth || Math.min(400, innerWidth - 28);
    const h = card.offsetHeight || 240;
    const clampX = (x) => Math.max(margin, Math.min(innerWidth - w - margin, x));
    const clampY = (y) => Math.max(margin, Math.min(innerHeight - h - margin, y));
    const candidates = [
      {fits: r.bottom + gap + h <= innerHeight - margin, left: clampX(r.left), top: r.bottom + gap},
      {fits: r.top - gap - h >= margin, left: clampX(r.left), top: r.top - gap - h},
      {fits: r.right + gap + w <= innerWidth - margin, left: r.right + gap, top: clampY(r.top)},
      {fits: r.left - gap - w >= margin, left: r.left - gap - w, top: clampY(r.top)}
    ];
    const spot = candidates.find(c => c.fits) || {left: innerWidth - w - margin, top: innerHeight - h - margin};
    return {left: `${Math.max(margin, spot.left)}px`, top: `${Math.max(margin, spot.top)}px`};
  }
  function getSteps(id, includeCommon) {
    const profile = window.edexPanelTourProfiles?.[id];
    if (!profile || !Array.isArray(profile.steps) || !profile.steps.length) return [];
    const specific = profile.steps.map((step, index) => !includeCommon && index === 0
      ? {...step, interaction: "move-panel"}
      : step);
    return [...(includeCommon ? COMMON : []), ...specific, FONT_STEP];
  }
  function show(id, targetGetter, options = {}) {
    if (running || document.querySelector("#bockis-first-run, #bockis-desktop-tour")) return false;
    const steps = getSteps(id, options.includeCommon === true);
    if (!steps.length) return false;
    running = true;
    let index = 0;
    let tourSetup = null;
    let pending = null;
    let previewUndo = null;
    let saving = false;
    let panelMoved = false;
    let dragStart = null;
    function clearVisualPreview() {
      const undo = previewUndo; previewUndo = null;
      if (typeof undo === "function") { try { undo(); } catch (error) { console.warn("Panel tour: preview cleanup failed", error); } }
    }
    function setVisualPreview(target, value) {
      clearVisualPreview();
      if (typeof options.preview !== "function") return;
      try { previewUndo = options.preview(target, value) || null; }
      catch (error) { console.warn("Panel tour: preview unavailable", error); }
    }
    function restorePending() {
      clearVisualPreview();
      if (!pending) return;
      const {control, original} = pending;
      if (control?.isConnected) {
        if (control.type === "checkbox") control.checked = original;
        else control.value = original;
        control.dispatchEvent(new Event("change", {bubbles: true}));
      }
      pending = null;
    }
    function practiceControl() {
      const target = steps[index]?.target;
      if (!Object.hasOwn(PRACTICE, target)) return null;
      const control = stepTarget();
      if (!control || control.matches("[disabled], [readonly]")) return null;
      if (PRACTICE[target] === "select" && control.tagName !== "SELECT") return null;
      if (PRACTICE[target] === "number" && control.type !== "number") return null;
      if (PRACTICE[target] === "checkbox" && control.type !== "checkbox") return null;
      return control;
    }
    function practiceMarkup(control) {
      if (!control) return "";
      if (control.type === "checkbox") {
        return `<div class="panel-tour-practice"><label for="panel-tour-try">${esc(t("panelTour.practice.label"))}</label><label class="panel-tour-practice-check"><input id="panel-tour-try" type="checkbox" ${control.checked ? "checked" : ""}> ${esc(control.parentElement?.textContent?.trim() || "")}</label><small>${esc(t("panelTour.practice.livePreview"))}</small><div class="panel-tour-practice-actions"><button type="button" data-discard>${esc(t("panelTour.practice.discard"))}</button><button type="button" data-apply>${esc(t("panelTour.practice.apply"))}</button></div></div>`;
      }
      if (control.tagName === "SELECT") {
        const opts = [...control.options].filter(opt => !opt.disabled && opt.value !== "__custom__");
        return `<div class="panel-tour-practice"><label for="panel-tour-try">${esc(t("panelTour.practice.label"))}</label><select id="panel-tour-try">${opts.map(o => `<option value="${esc(o.value)}" ${o.value===control.value?"selected":""}>${esc(o.textContent)}</option>`).join("")}</select><small>${esc(t("panelTour.practice.livePreview"))}</small><div class="panel-tour-practice-actions"><button type="button" data-discard>${esc(t("panelTour.practice.discard"))}</button><button type="button" data-apply>${esc(t("panelTour.practice.apply"))}</button></div></div>`;
      }
      return `<div class="panel-tour-practice"><label for="panel-tour-try">${esc(t("panelTour.practice.label"))}</label><input id="panel-tour-try" type="number" min="${esc(control.min)}" max="${esc(control.max)}" step="${esc(control.step)}" value="${esc(control.value)}"><small>${esc(t("panelTour.practice.livePreview"))}</small><div class="panel-tour-practice-actions"><button type="button" data-discard>${esc(t("panelTour.practice.discard"))}</button><button type="button" data-apply>${esc(t("panelTour.practice.apply"))}</button></div></div>`;
    }
    function next() {
      if (saving) return;
      restorePending();
      if (++index >= steps.length) close(); else render();
    }
    function back() {
      if (saving || index === 0) return;
      restorePending();
      index--;
      panelMoved = false;
      render();
    }
    async function applyPractice() {
      if (saving || !pending?.control?.isConnected || !tourSetup?.isConnected) return;
      const save = tourSetup.querySelector("#panel-setup-save");
      if (!save) return;
      saving = true;
      const apply = card.querySelector("[data-apply]");
      if (apply) apply.disabled = true;
      for (const button of card.querySelectorAll("[data-skip], [data-back], [data-next], [data-discard]")) button.disabled = true;
      // Existing setup save handler owns validation and persistence. We only await its result.
      const outcome = new Promise(resolve => {
        let timer;
        const done = (event) => { cleanup(); resolve(event.type === "edex:panel-setup-saved"); };
        const cleanup = () => {
          tourSetup?.removeEventListener("edex:panel-setup-saved", done);
          tourSetup?.removeEventListener("edex:panel-setup-error", done);
          clearTimeout(timer);
        };
        tourSetup.addEventListener("edex:panel-setup-saved", done, {once: true});
        tourSetup.addEventListener("edex:panel-setup-error", done, {once: true});
        timer = setTimeout(() => { cleanup(); resolve(false); }, 8000);
      });
      save.click();
      const success = await outcome;
      saving = false;
      if (success) {
        const savedTarget = steps[index].target;
        clearVisualPreview();
        try { options.onSaved?.(savedTarget); } catch (error) { console.warn("Panel tour: saved view refresh failed", error); }
        pending = null; // Stored explicitly through the existing panel setup.
        tourSetup = null;
        next();
      } else {
        const msg = card.querySelector("[data-practice-error]");
        if (msg) msg.textContent = t("panelTour.practice.error");
        if (apply?.isConnected) apply.disabled = false;
        for (const button of card.querySelectorAll("[data-skip], [data-back], [data-next], [data-discard]")) button.disabled = false;
      }
    }
    const previousFocus = document.activeElement;
    // On Windows the desktop window normally passes clicks through to Explorer.
    // Capture the entire walkthrough, including the card placed outside the panel.
    const previouslyHeld = document.body.classList.contains("is-ui-hold");
    document.body.classList.add("is-ui-hold");
    window.edex?.setMouseIgnore?.(false);
    const root = document.createElement("div");
    root.className = "bockis-panel-tour";
    root.id = "bockis-panel-tour";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", t("panelTour.title"));
    const spot = document.createElement("div");
    spot.className = "panel-tour-spotlight";
    spot.setAttribute("aria-hidden", "true");
    // Dims the central scale zone while the edge zone is explained, leaving the screen edges visible.
    const zoneMask = document.createElement("div");
    zoneMask.className = "panel-tour-zone-mask";
    zoneMask.setAttribute("aria-hidden", "true");
    zoneMask.hidden = true;
    const card = document.createElement("div");
    card.className = "panel-tour-card";
    root.append(spot, zoneMask, card);
    document.body.append(root);
    function getPanel() {
      const el = typeof targetGetter === "function" ? targetGetter() : document.getElementById(`card_${id}`);
      return el?.isConnected ? el : null;
    }
    function ensureSetup() {
      if (tourSetup?.isConnected) return tourSetup;
      // Only a trusted renderer callback can open the existing panel setup.
      // An untrusted tour profile cannot execute script or choose arbitrary selectors.
      if (typeof options.openSetup !== "function") return null;
      try {
        const opened = options.openSetup();
        const element = opened?.isConnected ? opened : document.querySelector(".panel-setup-modal");
        if (element?.isConnected) tourSetup = element;
      } catch (error) { console.warn("Panel guide: setup unavailable", error); }
      return tourSetup;
    }
    function stepTarget() {
      const target = steps[index]?.target || "panel";
      const panel = getPanel();
      if (target === "panel-menu") return panel?.querySelector('[data-card-act="settings"]') || panel;
      if (target.startsWith("setup:")) {
        const modal = ensureSetup();
        return modal?.querySelector(target.slice(6)) || null;
      }
      return panel;
    }
    function zoneRect() {
      if (typeof options.zoneRect !== "function") return null;
      try {
        const z = options.zoneRect();
        const values = [z?.x, z?.y, z?.width, z?.height].map(Number);
        if (!values.every(Number.isFinite) || values[2] <= 8 || values[3] <= 8) return null;
        const [x, y, width, height] = values;
        return {left: x, top: y, right: x + width, bottom: y + height, width, height};
      } catch (error) { console.warn("Panel tour: zone unavailable", error); return null; }
    }
    const visible = (r) => r && r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight;
    // Resolves the current step to a viewport rectangle; zone steps fall back to the panel when zones are off.
    function getTargetRect() {
      const target = steps[index]?.target;
      if (target === "zone-scale" || target === "zone-edge") {
        const zone = zoneRect();
        if (visible(zone)) return {rect: zone, mode: target};
      }
      const el = stepTarget();
      if (!el?.isConnected) return null;
      const rect = el.getBoundingClientRect();
      return visible(rect) ? {rect, mode: "element"} : null;
    }
    function onDragStart(event) {
      if (steps[index]?.interaction !== "move-panel") return;
      const panel = getPanel();
      if (!panel || panel.classList.contains("locked") || !event.target?.closest?.(".card-title")) return;
      if (event.target.closest("button, input, select")) return;
      dragStart = {left: panel.offsetLeft, top: panel.offsetTop};
    }
    function onDragEnd() {
      if (!dragStart) return;
      const initial = dragStart;
      dragStart = null;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const panel = getPanel();
        if (!panel || (Math.abs(panel.offsetLeft - initial.left) < 8 && Math.abs(panel.offsetTop - initial.top) < 8)) return;
        panelMoved = true;
        const status = card.querySelector("[data-interaction-status]");
        if (status) status.textContent = t("panelTour.move.success");
        card.classList.add("panel-tour-practice-complete");
      }));
    }
    function layout() {
      const found = getTargetRect();
      const interactive = steps[index]?.interaction === "move-panel";
      root.classList.toggle("panel-tour-interactive", interactive);
      root.classList.toggle("panel-tour-no-target", !found);
      root.classList.toggle("panel-tour-edge", found?.mode === "zone-edge");
      zoneMask.hidden = found?.mode !== "zone-edge";
      card.style.transform = "none";
      if (!found) {
        spot.hidden = true;
        Object.assign(card.style, {left: "50%", top: "50%", transform: "translate(-50%,-50%)"});
        return;
      }
      const r = found.rect;
      if (found.mode === "zone-edge") {
        spot.hidden = true;
        Object.assign(zoneMask.style, {left:`${r.left}px`, top:`${r.top}px`, width:`${r.width}px`, height:`${r.height}px`});
        const w = card.offsetWidth || Math.min(400, innerWidth - 28), h = card.offsetHeight || 240;
        Object.assign(card.style, {
          left:`${Math.max(14, r.left + (r.width - w) / 2)}px`,
          top:`${Math.max(14, Math.min(innerHeight - h - 14, r.top + (r.height - h) / 2))}px`
        });
        return;
      }
      const x = Math.max(6, r.left - 5), y = Math.max(6, r.top - 5);
      Object.assign(spot.style, {
        left:`${x}px`, top:`${y}px`,
        width:`${Math.max(0, Math.min(innerWidth-x-6,r.width+10))}px`,
        height:`${Math.max(0, Math.min(innerHeight-y-6,r.height+10))}px`
      });
      spot.hidden = false;
      Object.assign(card.style, placeCard(card, r));
    }
    function close() {
      if (saving) return;
      restorePending();
      window.removeEventListener("resize",layout);
      window.removeEventListener("scroll",layout,true);
      document.removeEventListener("pointerdown", onDragStart, true);
      window.removeEventListener("pointerup", onDragEnd, true);
      document.removeEventListener("keydown",onKey,true);
      window.removeEventListener("edex:locale-changed",render);
      root.remove();
      // Keep any preexisting modal's mouse hold, but release our own.
      if (!previouslyHeld) document.body.classList.remove("is-ui-hold");
      // Close only the setup opened by this tour; never remove preexisting dialogs.
      if (tourSetup?.isConnected) tourSetup.remove();
      running = false;
      if (previousFocus?.isConnected) previousFocus.focus?.();
    }
    function onKey(event) {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        // Include the practice field, otherwise keyboard users can never reach it.
        const items = [...card.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault();items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault();items[0].focus(); }
      }
    }
    function render() {
      const step = steps[index];
      if (!step.target?.startsWith("setup:") && tourSetup?.isConnected) {
        tourSetup.remove(); tourSetup = null;
      }
      const heading = t(step.titleKey), body = t(step.descriptionKey);
      const practice = practiceControl();
      const group = step.id.startsWith("common-") ? t("panelTour.title") : t("panelGuide.specificIntro");
      const hasTarget = Boolean(getTargetRect());
      const moveStatus = step.interaction === "move-panel"
        ? `<small data-interaction-status role="status">${esc(t(panelMoved ? "panelTour.move.success" : "panelTour.move.instruction"))}</small>`
        : "";
      card.innerHTML = `<div class="panel-tour-kicker">BOCKIS // ${esc(group)}<span>${index+1} / ${steps.length}</span></div><h2>${esc(heading)}</h2><p>${esc(body)}</p>${moveStatus}${hasTarget?"":`<small>${esc(t("panelTour.unavailable"))}</small>`}${practiceMarkup(practice)}<small data-practice-error role="status"></small><div class="panel-tour-actions"><button type="button" data-skip>${esc(t("panelTour.skip"))}</button><span class="panel-tour-nav">${index>0?`<button type="button" data-back>${esc(t("panelTour.back"))}</button>`:""}<button type="button" data-next>${esc(t(index===steps.length-1?"panelTour.done":"panelTour.next"))}</button></span></div>`;
      card.querySelector("[data-skip]").addEventListener("click",close);
      card.querySelector("[data-back]")?.addEventListener("click", back);
      card.querySelector("[data-next]").addEventListener("click", next);
      if (practice) {
        const input = card.querySelector("#panel-tour-try");
        const updatePractice = () => {
          if (input.type === "number" && (!input.checkValidity() || !Number.isFinite(Number(input.value)))) return;
          if (!pending || pending.control !== practice) {
            pending = {control: practice, original: practice.type === "checkbox" ? practice.checked : practice.value};
          }
          if (input.type === "checkbox") practice.checked = input.checked;
          else practice.value = input.value;
          practice.dispatchEvent(new Event("change", {bubbles:true}));
          setVisualPreview(steps[index].target, practice.type === "checkbox" ? practice.checked : practice.value);
        };
        input?.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", updatePractice);
        card.querySelector("[data-discard]")?.addEventListener("click", () => {
          restorePending();
          next();
        });
        card.querySelector("[data-apply]")?.addEventListener("click", async () => {
          if (!pending) { next(); return; }
          if (input?.type === "number" && !input.checkValidity()) return;
          await applyPractice();
        });
      }
      layout();card.querySelector("[data-next]").focus();
    }
    window.addEventListener("resize",layout);
    window.addEventListener("scroll",layout,true);
    window.addEventListener("edex:locale-changed",render);
    document.addEventListener("pointerdown", onDragStart, true);
    window.addEventListener("pointerup", onDragEnd, true);
    document.addEventListener("keydown",onKey,true);
    render();return true;
  }
  window.edexPanelTour = Object.freeze({show, getSteps, isRunning:()=>running});
})();
