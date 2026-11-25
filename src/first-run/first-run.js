/* BOCKIS First Run Experience. No installation or Windows styling side effects. */
(() => {
  "use strict";
  const STEPS = ["welcome", "language", "monitors", "theme", "features", "finish"];
  const escape = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const tr = (key, params) => window.edexI18n?.t?.(`firstRun.${key}`, params) || key;
  let active = false;
  async function open({ state, previewTheme, force = false } = {}) {
    if (active || !state?.settings || (!force && state.settings.firstRun?.completed !== false)) return;
    if (document.getElementById("bockis-first-run")) return;
    active = true;
    const oldLocale = state.settings.locale || "en";
    const initial = state.settings.firstRun || {};
    const choices = {
      locale: oldLocale, theme: String(state.settings.theme || state.themeName || "tron"),
      startWithWindows: !!state.settings.startWithWindows,
      windowsIntegrationRequested: initial.windowsIntegrationRequested === true,
      showTips: initial.showTips !== false
    };
    const priorThemeName = String(state.themeName || choices.theme);
    const originalTheme = state.theme;
    let step = 0;
    let saving = false;
    const root = document.createElement("div");
    root.id = "bockis-first-run";
    root.className = "bockis-first-run";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", tr("title"));
    const previouslyHeld = document.body.classList.contains("is-ui-hold");
    document.body.classList.add("is-ui-hold");
    window.edex?.setMouseIgnore?.(false);
    document.body.appendChild(root);
    const close = (restore = true) => {
      root.remove();
      active = false;
      if (!previouslyHeld) document.body.classList.remove("is-ui-hold");
      if (restore) {
        window.edexI18n?.setLocale?.(oldLocale);
        window.edexI18n?.translatePage?.(document.body);
        if (originalTheme && typeof previewTheme === "function") previewTheme(originalTheme, state.settings.wallpaper || "grid", {preview:true});
      }
    };
    async function preview(name) {
      try {
        const theme = await window.edex.getTheme(name);
        if (!active || choices.theme !== name) return;
        if (theme && typeof previewTheme === "function") previewTheme(theme, state.settings.wallpaper || "grid", {preview:true});
      } catch { /* A missing theme must never block the wizard. */ }
    }
    const checkbox = (id, label, checked) => `<label class="fr-check"><input type="checkbox" data-field="${id}" ${checked?"checked":""}> <span>${escape(label)}</span></label>`;
    const row = (label, value) => `<div class="fr-summary-row"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
    function render() {
      if (!active) return;
      const name = STEPS[step];
      const yesNo = (x) => x ? tr("yes") : tr("no");
      let content = "";
      if (name === "welcome") content = `<p>${escape(tr("welcomeText"))}</p><div class="fr-highlight">CPU / GPU · PANELS · THEME STUDIO · WINDOWS</div>`;
      if (name === "language") content = `<p>${escape(tr("languageText"))}</p><label class="fr-label">${escape(tr("language"))}<select data-field="locale"><option value="en" ${choices.locale==="en"?"selected":""}>English</option><option value="de" ${choices.locale==="de"?"selected":""}>Deutsch</option><option value="zh-Hant" ${choices.locale==="zh-Hant"?"selected":""}>繁體中文</option></select></label>`;
      if (name === "monitors") {
        const displays = Array.isArray(state.displays) ? state.displays : [];
        content = `<p>${escape(tr("monitorsText"))}</p><div class="fr-displays">${displays.length ? displays.map((d,i)=>`<div class="fr-display"><b>${escape(tr("display"))} ${i+1}</b><span>${escape(tr("resolution"))}: ${escape(d.physicalSize?.width || d.bounds?.width || d.size?.width || "?")} × ${escape(d.physicalSize?.height || d.bounds?.height || d.size?.height || "?")}</span>${d.primary?`<small>${escape(tr("primary"))}</small>`:""}</div>`).join("") : escape(tr("noDisplays"))}</div>`;
      }
      if (name === "theme") content = `<p>${escape(tr("themeText"))}</p><label class="fr-label">${escape(tr("theme"))}<select data-field="theme">${[...new Set([choices.theme,...(state.themes||[])])].map(t=>`<option value="${escape(t)}" ${choices.theme===t?"selected":""}>${escape(t)}</option>`).join("")}</select></label>`;
      if (name === "features") content = `<p>${escape(tr("featuresText"))}</p>${checkbox("startWithWindows",tr("autostart"),choices.startWithWindows)}${checkbox("windowsIntegrationRequested",tr("windows"),choices.windowsIntegrationRequested)}${checkbox("showTips",tr("tips"),choices.showTips)}`;
      if (name === "finish") content = `<p>${escape(tr("finishText"))}</p><div class="fr-summary">${row(tr("summaryLang"), choices.locale)}${row(tr("summaryTheme"),choices.theme)}${row(tr("summaryWindows"),yesNo(choices.windowsIntegrationRequested))}${row(tr("summaryStart"),yesNo(choices.startWithWindows))}${row(tr("summaryTips"),yesNo(choices.showTips))}</div><small>${escape(tr("note"))}</small>`;
      root.innerHTML = `<div class="fr-card"><div class="fr-top"><span>BOCKIS // ${escape(tr("title"))}</span><span>${step+1} / ${STEPS.length}</span></div><div class="fr-progress">${STEPS.map((_,i)=>`<i class="${i<=step?"on":""}"></i>`).join("")}</div><div class="fr-content"><h2>${escape(tr(name))}</h2>${content}<p class="fr-error" role="alert" aria-live="polite"></p></div><div class="fr-footer"><button type="button" data-action="skip">${escape(tr("skip"))}</button><span></span><button type="button" data-action="back" ${step===0?"disabled":""}>${escape(tr("back"))}</button><button type="button" data-action="next">${escape(step===STEPS.length-1?tr("complete"):tr("next"))}</button></div></div>`;
      root.querySelector("[data-field='locale']")?.addEventListener("change",e=>{
        choices.locale=e.target.value;
        window.edexI18n?.setLocale?.(choices.locale);
        render();
      });
      root.querySelector("[data-field='theme']")?.addEventListener("change",e=>{choices.theme=e.target.value;preview(choices.theme);});
      for(const key of ["startWithWindows","windowsIntegrationRequested","showTips"])
        root.querySelector(`[data-field='${key}']`)?.addEventListener("change",e=>{choices[key]=e.target.checked;});
      root.querySelector("[data-action='back']").addEventListener("click",()=>{if(step>0){step--;render();}});
      root.querySelector("[data-action='skip']").addEventListener("click",async()=>{
        if (saving) return;
        saving=true;
        try {
          // Skip should not resurface on every launch; preserve all existing preferences.
          const result=await window.edex.saveSettings({firstRun:{schemaVersion:1,completed:true,showTips:false,windowsIntegrationRequested:false}});
          if (!result?.settings) throw new Error("Settings update failed");
          close(true);
        } catch(err) {
          const error=root.querySelector(".fr-error");
          if(error)error.textContent=tr("saveError",{message:err?.message||String(err)});
        } finally {saving=false;}
      });
      root.querySelector("[data-action='next']").addEventListener("click",async()=>{
        if(saving) return;
        if(step < STEPS.length-1){step++;render();return;}
        saving=true;
        root.querySelectorAll("button").forEach(b=>b.disabled=true);
        try {
          // Only save eDEX preferences. Installing/enabling Windhawk is a separate consent flow.
          const patch = {locale:choices.locale,theme:choices.theme,startWithWindows:choices.startWithWindows,
            firstRun:{schemaVersion:1,completed:true,showTips:choices.showTips,windowsIntegrationRequested:choices.windowsIntegrationRequested}};
          const updated=await window.edex.saveSettings(patch);
          if (!updated || !updated.settings) throw new Error("Settings update failed");
          close(false);
          if (choices.showTips) showTour();
        } catch(err){
          const error=root.querySelector(".fr-error");
          if(error)error.textContent=tr("saveError",{message:err?.message||String(err)});
          root.querySelectorAll("button").forEach(b=>b.disabled=false);
        } finally {saving=false;}
      });
      root.querySelector("[data-action='next']")?.focus();
    }
    function showTour() { window.edexFirstRun?.showTour?.(); }
    render();
  }
  // Independently launchable, dismissible spotlight tour. Never modifies user preferences.
  function showTour() {
    if (document.getElementById("bockis-desktop-tour") || document.getElementById("bockis-first-run")) return;
    const steps = [
      {key:"introPanels", selectors:["#card_cpuinfo", "#card_hardwareInspector", "#card_ramwatcher", ".hud-card"]},
      {key:"introThemes", selectors:["#settings-fab"]},
      {key:"introDisplays", selectors:["#card_desktop", "#card_dock"]},
      {key:"introWindows", selectors:["#settings-fab"]}
    ];
    const previouslyHeld = document.body.classList.contains("is-ui-hold");
    const oldFocus = document.activeElement;
    let step = 0;
    const tour = document.createElement("div");
    tour.id = "bockis-desktop-tour";
    tour.className = "bockis-desktop-tour";
    tour.setAttribute("role", "dialog");
    tour.setAttribute("aria-modal", "true");
    tour.setAttribute("aria-label", tr("introTitle"));
    const spotlight = document.createElement("div");
    spotlight.className = "fr-spotlight";
    const card = document.createElement("div");
    card.className = "fr-tour-card";
    tour.append(spotlight, card);
    const getTarget = () => steps[step].selectors.map(sel => document.querySelector(sel)).find(el => {
      if (!el?.isConnected) return false;
      const r = el.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    });
    const layout = () => {
      if (!tour.isConnected) return;
      const target = getTarget();
      if (!target) {
        spotlight.hidden = true;
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = "translate(-50%, -50%)";
        return;
      }
      const r = target.getBoundingClientRect();
      const gap = 7;
      const x = Math.max(5, r.left-gap);
      const y = Math.max(5, r.top-gap);
      const w = Math.min(innerWidth-x-5, r.width+gap*2);
      const h = Math.min(innerHeight-y-5, r.height+gap*2);
      spotlight.hidden = false;
      Object.assign(spotlight.style, {left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
      card.style.transform = "none";
      const cardWidth = Math.min(390, innerWidth-28);
      const below = r.bottom + 18;
      const top = below + 210 < innerHeight ? below : Math.max(14, r.top - 224);
      card.style.top = `${Math.min(Math.max(top,14),Math.max(14,innerHeight-230))}px`;
      card.style.left = `${Math.min(Math.max(r.left,14),innerWidth-cardWidth-14)}px`;
    };
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); dismiss(); }
      else if (event.key === "Tab") {
        const buttons = [...card.querySelectorAll("button:not([disabled])")];
        if (!buttons.length) return;
        const first=buttons[0], last=buttons[buttons.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const dismiss = () => {
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", layout, true);
      document.removeEventListener("keydown", onKey, true);
      tour.remove();
      if (!previouslyHeld) document.body.classList.remove("is-ui-hold");
      if (oldFocus?.isConnected && typeof oldFocus.focus === "function") oldFocus.focus();
    };
    const render = () => {
      card.innerHTML = `<div class="fr-tour-top">BOCKIS // ${escape(tr("introTitle"))}<span>${step+1} / ${steps.length}</span></div><h2>${escape(tr("introStep"+String(step+1)))}</h2><p>${escape(tr(steps[step].key))}</p><div class="fr-tour-actions"><button type="button" data-skip>${escape(tr("introSkip"))}</button><button type="button" data-next>${escape(step===steps.length-1 ? tr("introDone") : tr("introNext"))}</button></div>`;
      card.querySelector("[data-skip]").addEventListener("click", dismiss);
      card.querySelector("[data-next]").addEventListener("click", () => {if (++step === steps.length) dismiss(); else render();});
      layout();
      card.querySelector("[data-next]")?.focus();
    };
    document.body.classList.add("is-ui-hold");
    window.edex?.setMouseIgnore?.(false);
    document.body.appendChild(tour);
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", layout, true);
    document.addEventListener("keydown", onKey, true);
    render();
  }
  window.edexFirstRun={open,showTour};
})();
