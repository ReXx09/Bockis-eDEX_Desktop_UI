(() => {
  const state = () => window.edexRendererState;
  const fileStageCtx = window.edexFileStageCtx || new WeakMap();
  window.edexFileStageCtx = fileStageCtx;

  function activeDesktopFolderTab() {
    if (!window.edexRendererState?.desktopTabId || window.edexRendererState.desktopTabId === "classify") {
      return null;
    }
    return (window.edexRendererState.desktopFolderTabs || [])
      .find((tab) => tab.id === window.edexRendererState.desktopTabId) || null;
  }

  function activeDesktopDropDir() {
    const tab = activeDesktopFolderTab();
    return tab?.path || window.edexRendererState?.bootstrap?.desktop || "";
  }

  function folderTabTitle(pathValue, fallback = "") {
    const base = String(pathValue || "").split(/[/\\]/).filter(Boolean).pop();
    return base || fallback || "資料夾";
  }

  function renderDeskTabs() {
    const bar = document.getElementById("desk-tab-bar");
    if (!bar) return;
    const current = state();
    const active = current.desktopTabId || "classify";
    const folderTabs = current.desktopFolderTabs || [];
    const closeLabel = window.edexI18n?.translateDynamic?.("關閉") || "Schließen";
    bar.innerHTML = [
      `<button type="button" class="desk-tab${active === "classify" ? " on" : ""}" data-desk-tab="classify"><span class="desk-tab-label">Desktop-Kategorien</span></button>`,
      ...folderTabs.map((tab) => `
        <button type="button" class="desk-tab${active === tab.id ? " on" : ""}" data-desk-tab="${escapeHtml(tab.id)}" title="${escapeHtml(tab.path || "")}">
          <span class="desk-tab-label">${escapeHtml(tab.name || folderTabTitle(tab.path))}</span>
          <span class="desk-tab-close" data-desk-tab-close="${escapeHtml(tab.id)}" title="${escapeHtml(closeLabel)}">×</span>
        </button>
      `)
    ].join("");
  }

  function bindDeskTabs(desk) {
    const bar = desk.querySelector("#desk-tab-bar") || document.getElementById("desk-tab-bar");
    if (!bar) return;
    if (bar.dataset.bound === "1") {
      renderDeskTabs();
      return;
    }
    bar.dataset.bound = "1";
    bar.addEventListener("click", async (event) => {
      const closeBtn = event.target.closest("[data-desk-tab-close]");
      if (closeBtn) {
        event.preventDefault();
        event.stopPropagation();
        await closeDesktopFolderTab(closeBtn.dataset.deskTabClose);
        return;
      }
      const tabBtn = event.target.closest("[data-desk-tab]");
      if (!tabBtn) return;
      event.preventDefault();
      event.stopPropagation();
      state().desktopTabId = tabBtn.dataset.deskTab || "classify";
      persistLayout();
      await arrangeDesktop();
    });
    renderDeskTabs();
  }

  async function openFolderInDesktopTab(item) {
    const current = state();
    const folder = resolveFolderForTab(item) || (
      item?.isDirectory && item?.path && !isVirtualPath(item.path)
        ? { path: item.path, name: itemLabel(item) || item.name, isDirectory: true }
        : null
    );
    const folderPath = String(folder?.path || "").trim();
    if (!folderPath || isVirtualPath(folderPath)) {
      toast("無法在桌面容器開啟此資料夾");
      return;
    }
    if (!ensureDesktopEnabled()) {
      toast("系統桌面容器未啟用");
      return;
    }
    const existing = (current.desktopFolderTabs || []).find(
      (tab) => String(tab.path || "").toLowerCase() === folderPath.toLowerCase()
    );
    if (existing) {
      current.desktopTabId = existing.id;
    } else {
      const id = `ft${Date.now().toString(36)}`;
      current.desktopFolderTabs = [...(current.desktopFolderTabs || []), {
        id,
        path: folderPath,
        name: folder.name || folderTabTitle(folderPath, item?.name),
        listing: null
      }];
      current.desktopTabId = id;
    }
    await persistLayout();
    const desk = document.getElementById("card_desktop");
    if (desk) bindDeskTabs(desk);
    renderDeskTabs();
    await arrangeDesktop();
    toast(`已在系統桌面開啟「${folderTabTitle(folderPath, folder.name)}」`);
  }

  async function closeDesktopFolderTab(tabId) {
    const current = state();
    const id = String(tabId || "");
    if (!id || id === "classify") return;
    current.desktopFolderTabs = (current.desktopFolderTabs || []).filter((tab) => tab.id !== id);
    if (current.desktopTabId === id) current.desktopTabId = "classify";
    persistLayout();
    renderDeskTabs();
    await arrangeDesktop();
  }

  async function refreshActiveDesktopView() {
    const current = state();
    const tab = activeDesktopFolderTab();
    if (tab) {
      tab.listing = null;
      await arrangeDesktop();
      return;
    }
    await loadDesktopListing({ decorate: "fast", includeShell: false });
    arrangeDesktop();
  }

  async function loadFolderTabListing(tab) {
    if (!tab?.path) return { items: [], total: 0 };
    try {
      const listing = await window.edex.listFolder(tab.path, { systemIcons: "fast" });
      tab.listing = listing;
      tab.listingError = listing?.readError || "";
      return listing;
    } catch (err) {
      tab.listing = { items: [], total: 0 };
      tab.listingError = err.message || "無法讀取資料夾";
      return tab.listing;
    }
  }

  function bindFileStage(stage, opts) {
    fileStageCtx.set(stage, opts || {});
    if (stage.tabIndex < 0) stage.tabIndex = 0;
    stage.style.cursor = "default";
    if (stage.dataset.fileMenuBound) return;
    stage.dataset.fileMenuBound = "1";
    stage.addEventListener("pointerdown", (event) => {
      const node = event.target.closest(".desk-icon, .fs-row");
      if (!node || !stage.contains(node)) {
        if (!event.target.closest("input, textarea, button, a, .icon-rename")) {
          clearStageSelection(stage);
        }
        return;
      }
      if (event.button !== 0 || event.target.closest("input, textarea, .icon-rename")) return;
      selectFileNode(stage, node, event);
      fileStageCtx.get(stage)?.onSelectionChange?.();
    });
    stage.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const ctx = fileStageCtx.get(stage) || {};
      const node = event.target.closest(".desk-icon, .fs-row, .drive-row");
      const item = node ? (ctx.itemFromNode?.(node) || itemFromIcon(node)) : null;
      if (node && item && canNativeFileItem(item) && !node.classList.contains("selected")) {
        clearStageSelection(stage);
        node.classList.add("selected");
        stage._fileAnchor = node;
      }
      const menuItems = fileMenuItems(stage, item, ctx);
      if (menuItems.length) openCardMenu(node || stage, menuItems, { x: event.clientX, y: event.clientY });
    });
    stage.addEventListener("dragover", (event) => {
      const ctx = fileStageCtx.get(stage) || {};
      if (ctx.destDir && (event.dataTransfer?.types?.includes("application/x-edex-file") || event.dataTransfer?.types?.includes("Files"))) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        stage.classList.add("drop-target");
      }
    });
    stage.addEventListener("dragleave", (event) => {
      if (!stage.contains(event.relatedTarget)) stage.classList.remove("drop-target");
    });
    stage.addEventListener("drop", async (event) => {
      const ctx = fileStageCtx.get(stage) || {};
      stage.classList.remove("drop-target");
      const encoded = event.dataTransfer?.getData("application/x-edex-file") || "";
      let sources = [];
      try { sources = encoded ? JSON.parse(encoded) : []; } catch { sources = []; }
      if (!sources.length && event.dataTransfer?.files?.length) {
        sources = [...event.dataTransfer.files].map((file) => window.edex.pathForFile(file)).filter(Boolean);
      }
      if (!ctx.destDir || !sources.length) return;
      event.preventDefault();
      try {
        const result = await window.edex.importFiles(ctx.destDir, sources);
        toast(`${result.count || 0} Element(e) eingefügt`);
        await ctx.onRefresh?.();
      } catch (err) {
        toast(err.message || "Dateien konnten nicht eingefügt werden");
      }
    });
  }

  function itemFromIcon(node) {
    if (!node?.dataset?.path) return null;
    let tags = [];
    try { tags = JSON.parse(node.dataset.tags || "[]"); } catch { tags = []; }
    return {
      path: node.dataset.path,
      name: node.dataset.name || node.querySelector("h3")?.textContent || "",
      isDirectory: node.dataset.dir === "1",
      targetPath: node.dataset.targetPath || "",
      targetIsDirectory: node.dataset.targetDir === "1",
      kind: node.dataset.kind || "",
      tags
    };
  }

  function canNativeFileItem(item) {
    if (!item?.path || isVirtualPath(item.path)) return false;
    if (item.kind === "drive" || item.kind === "thispc" || item.kind === "recycle") return false;
    if (isDriveRoot(item.path)) return false;
    return true;
  }

  function fileStageRoot(nodeOrStage) {
    if (!nodeOrStage) return null;
    return nodeOrStage.closest?.(
      "#desktop-stage, #shortcuts-stage, .path-stage, .fs-results, .drives-stage"
    ) || nodeOrStage;
  }

  function stageFileNodes(stage) {
    const root = fileStageRoot(stage) || stage;
    return [...root.querySelectorAll(".desk-icon[data-path], .fs-row[data-path]")];
  }

  function clearStageSelection(stage) {
    stageFileNodes(stage).forEach((el) => el.classList.remove("selected"));
    fileStageCtx.get(stage)?.onSelectionChange?.();
  }

  function selectedPathsInStage(stage) {
    return stageFileNodes(stage)
      .filter((el) => el.classList.contains("selected"))
      .map((el) => el.dataset.path)
      .filter(Boolean);
  }

  function selectFileNode(stage, node, event) {
    const root = fileStageRoot(stage) || stage;
    if (!node || !root.contains(node)) return;
    const item = itemFromIcon(node);
    if (!canNativeFileItem(item) && !node.classList.contains("fs-row")) {
      if (!(event.ctrlKey || event.metaKey || event.shiftKey)) clearStageSelection(root);
      return;
    }
    const nodes = stageFileNodes(root);
    if (event.shiftKey) {
      const anchor = root._fileAnchor && nodes.includes(root._fileAnchor) ? root._fileAnchor : node;
      const a = nodes.indexOf(anchor);
      const b = nodes.indexOf(node);
      if (a >= 0 && b >= 0) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        if (!(event.ctrlKey || event.metaKey)) clearStageSelection(root);
        for (let i = lo; i <= hi; i += 1) nodes[i].classList.add("selected");
        root._fileAnchor = node;
        return;
      }
    }
    if (event.ctrlKey || event.metaKey) node.classList.toggle("selected");
    else {
      clearStageSelection(root);
      node.classList.add("selected");
    }
    root._fileAnchor = node;
  }

  function ensureFileDragGhost() {
    let ghost = document.getElementById("file-drag-ghost");
    if (ghost) return ghost;
    ghost = document.createElement("div");
    ghost.id = "file-drag-ghost";
    ghost.hidden = true;
    document.body.appendChild(ghost);
    return ghost;
  }

  function showFileDragGhost(node, x, y) {
    const ghost = ensureFileDragGhost();
    const face = node.querySelector(".desk-icon-face")?.innerHTML
      || node.querySelector("img, svg")?.outerHTML
      || "";
    const label = node.querySelector("h3")?.textContent || "";
    ghost.innerHTML = `${face}<span>${escapeHtml(label)}</span>`;
    ghost.hidden = false;
    ghost.style.left = `${x + 12}px`;
    ghost.style.top = `${y + 12}px`;
    document.body.classList.add("is-file-dragging");
  }

  function moveFileDragGhost(x, y) {
    const ghost = document.getElementById("file-drag-ghost");
    if (!ghost || ghost.hidden) return;
    ghost.style.left = `${x + 12}px`;
    ghost.style.top = `${y + 12}px`;
  }

  function hideFileDragGhost() {
    const ghost = document.getElementById("file-drag-ghost");
    if (ghost) ghost.hidden = true;
    document.body.classList.remove("is-file-dragging");
  }

  function bindNativeFileDrag(node, item, stage) {
    if (!canNativeFileItem(item)) return;
    const dragStage = fileStageRoot(stage) || stage;
    node.setAttribute("draggable", "false");
    node.style.webkitUserDrag = "none";
    node.style.cursor = "pointer";
    node.querySelectorAll("img, svg, a, .desk-icon-face, h3, .meta, .tag-dots").forEach((el) => {
      el.setAttribute("draggable", "false");
      el.style.webkitUserDrag = "none";
      el.style.pointerEvents = "none";
    });
    const THRESHOLD = 20;
    const HOLD_BEFORE_DRAG_MS = 350;
    let pressing = false;
    let armed = false;
    let started = false;
    let startX = 0;
    let startY = 0;
    let downAt = 0;
    let altDrag = false;

    const collectPaths = () => {
      const paths = selectedPathsInStage(dragStage).filter((path) => canNativeFileItem({ path }));
      return paths.length ? paths : [item.path].filter(Boolean);
    };
    const disarm = () => {
      pressing = false;
      armed = false;
      altDrag = false;
      document.body.classList.remove("is-file-drag-armed");
      node.classList.remove("dragging");
      hideFileDragGhost();
      window.edex?.setFileDragArmed?.(false);
      window.edex?.cancelFileDragPrepare?.();
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
    const armForDrag = () => {
      if (armed || started) return;
      armed = true;
      document.body.classList.add("is-file-drag-armed");
      window.edex?.setFileDragArmed?.(true);
      window.edex?.prepareFileDrag?.()?.catch?.(() => {});
    };
    const beginOleDrag = async () => {
      if (!pressing || started) return;
      const list = collectPaths();
      if (!list.length) {
        toast("無法開始拖放（請確認檔案仍存在）");
        disarm();
        return;
      }
      started = true;
      armForDrag();
      document.body.classList.add("is-file-dragging");
      node.classList.add("dragging");
      showFileDragGhost(node, startX, startY);
      try {
        const result = await window.edex?.startFileDrag?.(list);
        if (!result?.ok) toast(result?.message || "無法開始拖放");
      } catch (err) {
        toast(err?.message || "無法開始拖放");
      } finally {
        started = false;
        disarm();
        document.body.classList.remove("is-file-dragging");
      }
    };
    const onMove = (event) => {
      if (!pressing || started) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy < THRESHOLD * THRESHOLD) return;
      if (!altDrag && Date.now() - downAt < HOLD_BEFORE_DRAG_MS) return;
      if (!node.classList.contains("selected")) {
        clearStageSelection(dragStage);
        node.classList.add("selected");
        dragStage._fileAnchor = node;
      }
      showFileDragGhost(node, event.clientX, event.clientY);
      moveFileDragGhost(event.clientX, event.clientY);
      beginOleDrag();
    };
    const onUp = () => {
      if (!started) disarm();
    };
    node.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target?.closest?.("input, textarea, .icon-rename")) return;
      if (event.detail > 1) {
        disarm();
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      pressing = true;
      armed = false;
      started = false;
      altDrag = Boolean(event.altKey);
      startX = event.clientX;
      startY = event.clientY;
      downAt = Date.now();
      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    });
  }

  function promptTextInput({ title = "輸入", hint = "", value = "", okLabel = "確定", cancelLabel = "取消" } = {}) {
    return new Promise((resolve) => {
      document.getElementById("textInputPrompt")?.closest(".modal_popup")?.remove();
      const modal = document.createElement("div");
      modal.className = "modal_popup info";
      modal.innerHTML = `
        <h1>${escapeHtml(title)}</h1>
        ${hint ? `<h2>${escapeHtml(hint)}</h2>` : ""}
        <table id="textInputPrompt">
          <tr><th>名稱</th><th><input id="text_input_field" type="text" spellcheck="false" /></th></tr>
        </table>
        <div class="settings-footer">
          <button type="button" id="text-input-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" id="text-input-ok">${escapeHtml(okLabel)}</button>
        </div>`;
      document.body.appendChild(modal);
      window.edexI18n?.translatePage?.(modal);
      placeCentered(modal, { width: Math.min(420, window.innerWidth * 0.42), topRatio: 0.22 });
      const input = modal.querySelector("#text_input_field");
      if (input) {
        input.value = value || "";
        input.focus();
        input.select();
      }
      const finish = (result) => {
        modal.remove();
        resolve(result);
      };
      modal.querySelector("#text-input-cancel").onclick = () => finish(null);
      modal.querySelector("#text-input-ok").onclick = () => {
        const next = String(input?.value || "").trim();
        if (!next) {
          toast("請輸入名稱");
          input?.focus();
          return;
        }
        finish(next);
      };
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") modal.querySelector("#text-input-ok")?.click();
        if (event.key === "Escape") finish(null);
      });
    });
  }

  function promptFolderName(defaultName = "未命名資料夾") {
    return promptTextInput({
      title: "新建資料夾",
      hint: "請輸入資料夾名稱",
      value: defaultName,
      okLabel: "建立"
    });
  }

  function promptRename(item, onRefresh) {
    promptTextInput({
      title: "重新命名",
      value: item.name || "",
      okLabel: "確定"
    }).then((next) => {
      if (next == null || next === item.name) return;
      window.edex.renameItem(item.path, next).then(async () => {
        toast("已重新命名");
        await onRefresh?.();
      }).catch((err) => toast(err.message || "無法重新命名"));
    });
  }

  function startRename(node, item, onRefresh) {
    const title = node.querySelector("h3");
    if (!title) {
      promptRename(item, onRefresh);
      return;
    }
    const input = document.createElement("input");
    input.className = "icon-rename";
    input.value = item.name || title.textContent || "";
    title.replaceWith(input);
    input.focus();
    input.select();
    window.edex?.setMouseIgnore?.(false);
    let done = false;
    const finish = async (commit) => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (!commit || !value || value === item.name) {
        await onRefresh?.();
        return;
      }
      try {
        await window.edex.renameItem(item.path, value);
        toast("已重新命名");
        await onRefresh?.();
      } catch (err) {
        toast(err.message || "無法重新命名");
        await onRefresh?.();
      }
    };
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finish(true);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener("blur", () => finish(true));
  }

  function copyFileItem(item, cut = false) {
    const current = state();
    current.fileClipboard = { paths: [item.path], cut };
    const writeResult = window.edex.clipboardWriteFiles?.([item.path]);
    if (writeResult?.catch) {
      writeResult.catch((err) => toast(err.message || "Zwischenablage konnte nicht aktualisiert werden"));
    }
    toast(cut ? "Element zum Verschieben vorgemerkt" : "Element zum Kopieren vorgemerkt");
  }

  async function pasteFileClipboard(destDir, onRefresh) {
    const current = state();
    const clipboard = current.fileClipboard;
    if (!clipboard.paths.length) return;
    try {
      const result = await window.edex.importFiles(destDir, clipboard.paths);
      if (clipboard.cut) {
        for (const source of clipboard.paths) await window.edex.trashItem(source);
      }
      current.fileClipboard = { paths: [], cut: false };
      toast(`${result.count || 0} Element(e) eingefügt`);
      await onRefresh?.();
    } catch (err) {
      toast(err.message || "Einfügen fehlgeschlagen");
    }
  }

  async function trashFileItem(item, onRefresh) {
    try {
      const result = await window.edex.trashItem(item.path);
      if (result?.cancelled) return;
      toast("已移至回收桶");
      await onRefresh?.();
    } catch (err) {
      toast(err.message || "無法刪除");
    }
  }

  function fileMenuItems(stage, item, ctx) {
    const current = state();
    const destDir = ctx.allowCreate === false
      ? ""
      : (ctx.destDir || (item && !isVirtualPath(item.path) ? (item.isDirectory ? item.path : parentDir(item.path)) : ""));
    const items = [];
    const isDesktopStage = Boolean(ctx.desktopActions) || stage?.id === "desktop-stage";
    if (isDesktopStage) {
      items.push(
        { label: "刷新內容", action: async () => {
          try { await refreshActiveDesktopView(); toast("已刷新內容"); }
          catch (err) { toast(err.message || "無法刷新"); }
        } },
        { label: "自動整理", action: () => runOrganize() },
        { label: "Organisation konfigurieren", action: () => openOrganizerSettings() },
        { sep: true }
      );
    }
    const folderTab = resolveFolderForTab(item);
    if (folderTab) {
      items.push(
        { label: "在系統桌面標籤頁開啟", action: () => openFolderInDesktopTab(folderTab) },
        { label: "Als Ordner-Panel hinzufügen", action: () => addPathCardAt(folderTab.path) }
      );
    }
    if (destDir && !isVirtualPath(destDir)) {
      items.push({
        label: "新建資料夾",
        action: async () => {
          const name = await promptFolderName("未命名資料夾");
          if (name == null) return;
          try {
            const created = await window.edex.createFolder(destDir, name);
            toast(`已建立 ${created.name}`);
            await ctx.onRefresh?.();
          } catch (err) { toast(err.message || "無法建立資料夾"); }
        }
      });
      if (current.fileClipboard.paths.length) {
        items.push({
          label: current.fileClipboard.cut ? "Einfügen und Verschieben" : "Einfügen und Kopieren",
          action: () => pasteFileClipboard(destDir, ctx.onRefresh)
        });
      }
    }
    const canEdit = item && !isVirtualPath(item.path) && item.kind !== "drive" && !isDriveRoot(item.path);
    if (!canEdit) return items;
    items.push(
      { label: "Vorschau", action: () => window.edexFilePreview?.showFilePreview(item) },
      { label: "Kopieren", action: () => copyFileItem(item) },
      { label: "Ausschneiden", action: () => copyFileItem(item, true) },
      { label: "Eigenschaften", action: () => {
        const modified = Number(item.mtime) > 0 ? new Date(item.mtime).toLocaleString() : "Nicht verfügbar";
        const size = item.isDirectory ? "Ordner" : (item.sizeLabel || "Nicht verfügbar");
        window.alert(`Name: ${item.name || ""}\nPfad: ${item.path || ""}\nTyp: ${item.isDirectory ? "Ordner" : "Datei"}\nGröße: ${size}\nGeändert: ${modified}`);
      } },
      { sep: true },
      { label: "刪除", action: () => trashFileItem(item, ctx.onRefresh) },
      { label: "重新命名", action: () => {
        const node = [...stage.querySelectorAll(".desk-icon, .fs-row")].find((el) => el.dataset.path === item.path);
        if (node?.classList.contains("desk-icon")) startRename(node, item, ctx.onRefresh);
        else promptRename(item, ctx.onRefresh);
      } }
    );
    if (item.isDirectory) {
      items.push({ sep: true, kind: "tags", tags: item.tags || [], onChange: async (tags) => {
        await window.edex.setItemTags(item.path, tags);
        const node = [...stage.querySelectorAll(".desk-icon")].find((el) => el.dataset.path === item.path);
        if (!node) return;
        node.dataset.tags = JSON.stringify(tags);
        const face = node.querySelector(".desk-icon-face");
        const dots = node.querySelector(".tag-dots");
        const html = tagDotsHtml(tags);
        if (dots && html) dots.outerHTML = html;
        else if (dots) dots.remove();
        else if (html && face) face.insertAdjacentHTML("beforeend", html);
        else if (html) node.querySelector("h3")?.insertAdjacentHTML("beforebegin", html);
      } });
    }
    return items;
  }

  window.edexFolderPanel = {
    activeDesktopFolderTab,
    activeDesktopDropDir,
    folderTabTitle,
    renderDeskTabs,
    bindDeskTabs,
    openFolderInDesktopTab,
    closeDesktopFolderTab,
    refreshActiveDesktopView,
    loadFolderTabListing,
    bindFileStage,
    itemFromIcon,
    canNativeFileItem,
    fileStageRoot,
    stageFileNodes,
    clearStageSelection,
    selectedPathsInStage,
    selectFileNode,
    hideFileDragGhost,
    bindNativeFileDrag,
    fileMenuItems,
    promptTextInput,
    promptFolderName,
    promptRename,
    startRename
  };
})();
