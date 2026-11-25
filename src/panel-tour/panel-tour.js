/* BOCKIS contextual panel guides 2.0: shared basics once, type-specific steps afterwards. */
(() => {
  "use strict";
  let running = false;
  // Only these known, panel-owned inputs may participate in a learning exercise.
  const PRACTICE = Object.freeze({
    "setup:#panel-clock-mode": "select",
    "setup:#panel-ram-mode": "select",
    "setup:#panel-weather-location": "select",
    "setup:#panel-search-font": "number",
    "setup:#panel-taskdock-tile-size": "select"
  });
  const t = (key) => window.edexI18n?.t?.(key) || key;
  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const COMMON = ["panel", "scale", "edge", "menu"].map((name) => ({
    id: `common-${name}`, titleKey: `panelGuide.common.${name}.title`,
    descriptionKey: `panelGuide.common.${name}.body`, target: name === "menu" ? "panel-menu" : name === "scale" || name === "edge" ? "panel" : "panel"
  }));
  function getSteps(id, includeCommon) {
    const profile = window.edexPanelTourProfiles?.[id];
    if (!profile || !Array.isArray(profile.steps) || !profile.steps.length) return [];
    return [...(includeCommon ? COMMON : []), ...profile.steps];
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
        control.value = original;
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
      return control;
    }
    function practiceMarkup(control) {
      if (!control) return "";
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
    async function applyPractice() {
      if (saving || !pending?.control?.isConnected || !tourSetup?.isConnected) return;
      const save = tourSetup.querySelector("#panel-setup-save");
      if (!save) return;
      saving = true;
      const apply = card.querySelector("[data-apply]");
      if (apply) apply.disabled = true;
      for (const button of card.querySelectorAll("[data-skip], [data-next], [data-discard]")) button.disabled = true;
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
        for (const button of card.querySelectorAll("[data-skip], [data-next], [data-discard]")) button.disabled = false;
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
    const card = document.createElement("div");
    card.className = "panel-tour-card";
    root.append(spot, card);
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
    function getTarget() {
      const el = stepTarget();
      if (!el?.isConnected) return null;
      const rect = el.getBoundingClientRect();
      return rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0 && rect.left < innerWidth && rect.top < innerHeight ? el : null;
    }
    function layout() {
      const el = getTarget();
      root.classList.toggle("panel-tour-no-target", !el);
      if (!el) {
        spot.hidden = true;
        Object.assign(card.style, {left: "50%", top: "50%", transform: "translate(-50%,-50%)"});
        return;
      }
      const r = el.getBoundingClientRect();
      const x = Math.max(6, r.left - 5), y = Math.max(6, r.top - 5);
      Object.assign(spot.style, {
        left:`${x}px`, top:`${y}px`,
        width:`${Math.max(0, Math.min(innerWidth-x-6,r.width+10))}px`,
        height:`${Math.max(0, Math.min(innerHeight-y-6,r.height+10))}px`
      });
      spot.hidden = false;
      const width = Math.min(400,innerWidth-28);
      Object.assign(card.style, {
        transform:"none",
        left:`${Math.max(14,Math.min(innerWidth-width-14,r.left))}px`,
        top:`${Math.max(14,Math.min(innerHeight-240,r.bottom+256<innerHeight?r.bottom+16:r.top-240))}px`
      });
    }
    function close() {
      if (saving) return;
      restorePending();
      window.removeEventListener("resize",layout);
      window.removeEventListener("scroll",layout,true);
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
        const buttons = [...card.querySelectorAll("button")];
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault();buttons.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault();buttons[0].focus(); }
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
      const hasTarget = Boolean(getTarget());
      card.innerHTML = `<div class="panel-tour-kicker">BOCKIS // ${esc(group)}<span>${index+1} / ${steps.length}</span></div><h2>${esc(heading)}</h2><p>${esc(body)}</p>${hasTarget?"":`<small>${esc(t("panelTour.unavailable"))}</small>`}${practiceMarkup(practice)}<small data-practice-error role="status"></small><div class="panel-tour-actions"><button type="button" data-skip>${esc(t("panelTour.skip"))}</button><button type="button" data-next>${esc(t(index===steps.length-1?"panelTour.done":"panelTour.next"))}</button></div>`;
      card.querySelector("[data-skip]").addEventListener("click",close);
      card.querySelector("[data-next]").addEventListener("click", next);
      if (practice) {
        const input = card.querySelector("#panel-tour-try");
        input?.addEventListener("input", () => {
          if (input.type === "number" && (!input.checkValidity() || !Number.isFinite(Number(input.value)))) return;
          if (!pending || pending.control !== practice) pending = {control: practice, original: practice.value};
          practice.value = input.value;
          practice.dispatchEvent(new Event("change", {bubbles:true}));
          setVisualPreview(steps[index].target, practice.value);
        });
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
    document.addEventListener("keydown",onKey,true);
    render();return true;
  }
  window.edexPanelTour = Object.freeze({show, getSteps, isRunning:()=>running});
})();
