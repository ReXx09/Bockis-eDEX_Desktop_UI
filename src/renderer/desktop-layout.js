(() => {
  const state = () => window.edexRendererState;

  function snapGap() {
    return gridSize();
  }

  function alignGrid(value) {
    const g = gridSize();
    return Math.round(value / g) * g;
  }

  function gridCells(px) {
    return Math.max(0, Math.round(px / gridSize()));
  }

  function cellsPx(count) {
    return Math.max(0, Math.round(count)) * gridSize();
  }

  function alignGridSpan(size, minCells = 2) {
    const g = gridSize();
    const cells = Math.max(minCells, Math.round(Math.max(0, size) / g));
    return cells * g;
  }

  function snapExclusiveEdge(px) {
    return Math.round(px / gridSize()) * gridSize();
  }

  function gridLineOf(exclusiveEdge) {
    return snapExclusiveEdge(exclusiveEdge) - 1;
  }

  function pxFromBox(box) {
    const g = gridSize();
    if (Number.isFinite(Number(box?.gx)) && Number.isFinite(Number(box?.gw))) {
      return {
        x: cellsPx(box.gx),
        y: cellsPx(box.gy),
        w: cellsPx(Math.max(2, box.gw)),
        h: cellsPx(Math.max(2, box.gh))
      };
    }
    const x = alignGrid(pxFromVw(box?.x || 0));
    const y = alignGrid(pxFromVh(box?.y || 0));
    return {
      x,
      y,
      w: alignGridSpan(pxFromVw(box?.w || 16), 2),
      h: alignGridSpan(pxFromVh(box?.h || 10), 2)
    };
  }

  function boxToPx(box) {
    return pxFromBox(box);
  }

  function snapBoxVwVh(box) {
    const px = pxFromBox(box);
    return { ...box, ...pxToGridFields(px.x, px.y, px.w, px.h) };
  }

  function pxToGridFields(x, y, w, h) {
    const g = gridSize();
    const gx = gridCells(x);
    const gy = gridCells(y);
    const gw = Math.max(2, gridCells(w));
    const gh = Math.max(2, gridCells(h));
    return {
      gx,
      gy,
      gw,
      gh,
      x: vw(gx * g),
      y: vh(gy * g),
      w: vw(gw * g),
      h: vh(gh * g)
    };
  }

  function applyBoxPx(target, x, y, w, h) {
    Object.assign(target, pxToGridFields(x, y, w, h));
    return target;
  }

  function rectsTooClose(a, b) {
    const gap = gridSize();
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x
      && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }

  function otherCardRects(excludeEl) {
    return [...document.querySelectorAll(".hud-card, .path-card, .desktop-card")]
      .filter((el) => el && el !== excludeEl)
      .map((el) => ({
        x: alignGrid(el.offsetLeft),
        y: alignGrid(el.offsetTop),
        w: alignGridSpan(el.offsetWidth, 2),
        h: alignGridSpan(el.offsetHeight, 2)
      }));
  }

  function overlapsAny(rect, others) {
    return others.some((other) => rectsTooClose(rect, other));
  }

  function resolveMoveNoOverlap(el, x, y, w, h, fallback) {
    const g = gridSize();
    const ws = workspaceRect();
    const others = otherCardRects(el);
    x = alignGrid(x);
    y = alignGrid(y);
    w = alignGridSpan(w, 2);
    h = alignGridSpan(h, 2);
    const wanted = { x, y, w, h };
    if (!overlapsAny(wanted, others)) return { x, y, w, h };

    const candidates = [];
    if (fallback) candidates.push({ x: alignGrid(fallback.x), y: alignGrid(fallback.y) });
    others.forEach((o) => {
      candidates.push(
        { x: alignGrid(o.x + o.w + g), y: alignGrid(o.y) },
        { x: alignGrid(o.x - w - g), y: alignGrid(o.y) },
        { x: alignGrid(o.x), y: alignGrid(o.y + o.h + g) },
        { x: alignGrid(o.x), y: alignGrid(o.y - h - g) },
        { x: alignGrid(o.x + o.w + g), y },
        { x: alignGrid(o.x - w - g), y },
        { x, y: alignGrid(o.y + o.h + g) },
        { x, y: alignGrid(o.y - h - g) }
      );
    });

    let best = fallback ? { x: alignGrid(fallback.x), y: alignGrid(fallback.y), w, h } : wanted;
    let bestD = Infinity;
    candidates.forEach((candidate) => {
      if (candidate.x < 0 || candidate.y < 0 || candidate.x + w > ws.width + g || candidate.y + h > ws.height + g) return;
      const rect = { x: candidate.x, y: candidate.y, w, h };
      if (overlapsAny(rect, others)) return;
      const distance = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
      if (distance < bestD) {
        bestD = distance;
        best = rect;
      }
    });
    if (overlapsAny(best, others) && fallback) {
      return { x: alignGrid(fallback.x), y: alignGrid(fallback.y), w, h };
    }
    return best;
  }

  function clampResizeNoOverlap(el, left, top, w, h, minW, minH) {
    const g = gridSize();
    w = alignGridSpan(w, gridCells(minW || g * 2));
    h = alignGridSpan(h, gridCells(minH || g * 2));
    const others = otherCardRects(el);
    others.forEach((o) => {
      const hitsX = left < o.x + o.w + g && left + w + g > o.x;
      const hitsY = top < o.y + o.h + g && top + h + g > o.y;
      if (!hitsX || !hitsY) return;
      if (left <= o.x && left + w + g > o.x) {
        w = alignGridSpan(Math.min(w, o.x - g - left), gridCells(minW || g * 2));
      }
      if (top <= o.y && top + h + g > o.y) {
        h = alignGridSpan(Math.min(h, o.y - g - top), gridCells(minH || g * 2));
      }
    });
    while (w > (minW || g * 2) && overlapsAny({ x: left, y: top, w, h }, others)) w -= g;
    while (h > (minH || g * 2) && overlapsAny({ x: left, y: top, w, h }, others)) h -= g;
    return {
      w: Math.max(minW || g * 2, w),
      h: Math.max(minH || g * 2, h)
    };
  }

  function snapAllLayoutToGrid() {
    const current = state();
    Object.keys(current.layout).forEach((id) => {
      current.layout[id] = { ...current.layout[id], ...snapBoxVwVh(current.layout[id]) };
    });
    if (current.desktopStage) {
      current.desktopStage = { ...current.desktopStage, ...snapBoxVwVh(current.desktopStage) };
    }
    current.pathCards.forEach((card) => {
      Object.assign(card, snapBoxVwVh(card));
    });
  }

  function currentDisplayLayout() {
    const current = state();
    return {
      displayIndex: current.displayIndex,
      dockEnabled: dockEnabled(),
      dockPosition: current.displayDockSettings?.position || current.settings?.dockPosition || "bottom",
      dockWidth: current.displayDockSettings?.width || current.settings?.dockWidth || 720,
      dockHeight: current.displayDockSettings?.height || current.settings?.dockHeight || 72,
      dockFrameStyle: current.displayDockSettings?.frameStyle || current.settings?.dockFrameStyle || "rounded",
      layout: current.layout,
      desktopStage: current.desktopStage,
      desktopEnabled: current.desktopEnabled !== false,
      desktopLocked: Boolean(current.desktopLocked),
      desktopFilter: current.desktopFilter || "all",
      desktopGrouped: Boolean(current.desktopGrouped),
      desktopIconScale: Math.max(0.6, Math.min(2, Number(current.desktopIconScale) || Number(current.settings.desktopIconScale) || 1)),
      desktopFontScale: Math.max(0.7, Math.min(1.8, Number(current.desktopFontScale) || Number(current.settings.desktopFontScale) || 1)),
      desktopTabId: current.desktopTabId || "classify",
      desktopFolderTabs: (current.desktopFolderTabs || []).map((tab) => ({
        id: tab.id,
        path: tab.path,
        name: tab.name
      })),
      pathCards: current.pathCards.map((card) => ({
        id: card.id,
        path: card.path,
        name: card.name || "",
        x: card.x,
        y: card.y,
        w: card.w,
        h: card.h,
        treeWidth: Number.isFinite(Number(card.treeWidth)) ? Number(card.treeWidth) : 192,
        gx: card.gx,
        gy: card.gy,
        gw: card.gw,
        gh: card.gh,
        locked: Boolean(card.locked),
        minimized: Boolean(card.minimized),
        fixedDisplayId: Number.isFinite(Number(card.fixedDisplayId)) ? Number(card.fixedDisplayId) : null,
        iconView: card.iconView === "list" ? "list" : "grid",
        fileIconScale: Math.max(0.6, Math.min(2, Number(card.fileIconScale) || Number(current.settings.pathIconScale) || 1)),
        fileFontScale: Math.max(0.7, Math.min(1.8, Number(card.fileFontScale) || Number(current.settings.pathFontScale) || 1)),
        bg: card.bg || "",
        activeTabId: card.activeTabId || `${card.id}:root`,
        tabs: ensurePathTabs(card).map((tab) => ({
          id: tab.id,
          path: tab.path,
          name: tab.name || "",
          iconView: tab.iconView === "list" ? "list" : "grid"
        }))
      })),
      desktopBg: current.desktopStage?.bg || "",
      iconPositions: current.iconPositions,
      iconView: current.iconView
    };
  }

  function persistLayout() {
    return window.edex.saveDisplayLayout(currentDisplayLayout());
  }

  function showSnapGuides(guides) {
    const box = document.getElementById("snap-guides");
    if (!box) return;
    const g = gridSize();
    box.classList.add("on");
    box.style.backgroundSize = `${g}px ${g}px`;
    box.innerHTML = (guides || []).map((item) => {
      const pos = gridLineOf(item.line == null ? item.pos : item.line + 1);
      const cls = `snap-guide ${item.type}${item.ref ? " ref" : ""}${item.match ? " match" : ""}`;
      const label = item.label
        ? `<span class="snap-label">${escapeHtml(item.label)}</span>`
        : "";
      return item.type === "v"
        ? `<div class="${cls}" style="left:${pos}px">${label}</div>`
        : `<div class="${cls}" style="top:${pos}px">${label}</div>`;
    }).join("");
  }

  function collectSnapTargets(excludeEl) {
    const gap = snapGap();
    const ws = workspaceRect();
    const edgesX = [];
    const edgesY = [];
    document.querySelectorAll(".hud-card, .path-card, .desktop-card").forEach((el) => {
      if (el === excludeEl) return;
      const left = alignGrid(el.offsetLeft);
      const top = alignGrid(el.offsetTop);
      const right = left + alignGridSpan(el.offsetWidth, 2);
      const bottom = top + alignGridSpan(el.offsetHeight, 2);
      edgesX.push({ left, right });
      edgesY.push({ top, bottom });
    });
    return { edgesX, edgesY, gap, ws };
  }

  function referenceGuides(ws) {
    const midX = snapExclusiveEdge(ws.width / 2);
    const midY = snapExclusiveEdge(ws.height / 2);
    return [
      { type: "v", pos: midX, ref: true, label: "中" },
      { type: "h", pos: midY, ref: true, label: "中" }
    ];
  }

  function magneticSnap(el, x, y, w, h, pointer) {
    const { edgesX, edgesY, gap, ws } = collectSnapTargets(el);
    const nearLeft = pointer && pointer.x < 40;
    const nearRight = pointer && pointer.x > window.innerWidth - 40;
    const nearTop = pointer && pointer.y < 40;
    const nearBottom = pointer && pointer.y > window.innerHeight - 40;
    w = alignGridSpan(w, 2);
    h = alignGridSpan(h, 2);
    let nextX = alignGrid(x);
    let nextY = alignGrid(y);
    const guides = [];
    const threshold = gap * 0.55;

    for (const edge of edgesX) {
      const dockRight = edge.right + gap;
      const dockLeft = edge.left - gap - w;
      if (Math.abs(nextX - dockRight) <= threshold) {
        nextX = dockRight;
        guides.push({ type: "v", pos: dockRight });
      } else if (Math.abs(nextX - dockLeft) <= threshold) {
        nextX = dockLeft;
        guides.push({ type: "v", pos: nextX + w });
      }
    }
    for (const edge of edgesY) {
      const dockBelow = edge.bottom + gap;
      const dockAbove = edge.top - gap - h;
      if (Math.abs(nextY - dockBelow) <= threshold) {
        nextY = dockBelow;
        guides.push({ type: "h", pos: dockBelow });
      } else if (Math.abs(nextY - dockAbove) <= threshold) {
        nextY = dockAbove;
        guides.push({ type: "h", pos: nextY + h });
      }
    }

    const constrained = constrainPanelPosition(el, nextX, nextY, w, h);
    nextX = alignGrid(constrained.x);
    nextY = alignGrid(constrained.y);
    if (!(nearLeft || nearRight || nearTop || nearBottom)) {
      const resolved = resolveMoveNoOverlap(el, nextX, nextY, w, h, {
        x: el.offsetLeft,
        y: el.offsetTop
      });
      const reclamped = constrainPanelPosition(el, resolved.x, resolved.y, w, h);
      nextX = alignGrid(reclamped.x);
      nextY = alignGrid(reclamped.y);
    }
    guides.push(
      { type: "v", pos: nextX, match: true },
      { type: "v", pos: nextX + w, match: true },
      { type: "h", pos: nextY, match: true },
      { type: "h", pos: nextY + h, match: true }
    );
    return { x: nextX, y: nextY, guides: [...referenceGuides(ws), ...guides] };
  }

  function gridMinSize(px) {
    const g = gridSize();
    return Math.max(g * 2, alignGridSpan(px, 2));
  }

  function magneticResize(el, w, h, left, top, minWPx, minHPx) {
    const { edgesX, edgesY, gap, ws } = collectSnapTargets(el);
    const zone = panelZoneRect(el);
    const g = gridSize();
    const threshold = g * 0.55;
    const minW = gridMinSize(minWPx || g * 2);
    const minH = gridMinSize(minHPx || g * 2);
    let right = left + w;
    let bottom = top + h;
    const guides = [...referenceGuides(ws)];
    for (const edge of edgesX) {
      const dockToLeft = edge.left - gap;
      if (Math.abs(right - dockToLeft) <= threshold) {
        right = dockToLeft;
        guides.push({ type: "v", pos: dockToLeft, match: true });
      }
    }
    for (const edge of edgesY) {
      const dockAbove = edge.top - gap;
      if (Math.abs(bottom - dockAbove) <= threshold) {
        bottom = dockAbove;
        guides.push({ type: "h", pos: dockAbove, match: true });
      }
    }
    right = snapExclusiveEdge(right);
    bottom = snapExclusiveEdge(bottom);
    let nextW = alignGridSpan(Math.max(minW, right - left), gridCells(minW));
    let nextH = alignGridSpan(Math.max(minH, bottom - top), gridCells(minH));
    const maxW = alignGridSpan(Math.max(minW, snapExclusiveEdge(zone.x + zone.width) - left), gridCells(minW));
    const maxH = alignGridSpan(Math.max(minH, snapExclusiveEdge(zone.y + zone.height) - top), gridCells(minH));
    nextW = Math.min(maxW, nextW);
    nextH = Math.min(maxH, nextH);
    const clamped = clampResizeNoOverlap(el, left, top, nextW, nextH, minW, minH);
    guides.push({ type: "v", pos: left + clamped.w, match: true });
    guides.push({ type: "h", pos: top + clamped.h, match: true });
    return { w: clamped.w, h: clamped.h, guides };
  }

  function neighborDisplay(direction) {
    const current = state();
    const mine = current.displays.find((display) => display.id === current.displayId);
    if (!mine) return null;
    const candidates = current.displays.filter((display) => display.id !== current.displayId);
    if (direction === "left") {
      return candidates
        .filter((display) => display.bounds.x + display.bounds.width <= mine.bounds.x + 48)
        .sort((a, b) => b.bounds.x - a.bounds.x)[0] || null;
    }
    if (direction === "right") {
      return candidates
        .filter((display) => display.bounds.x >= mine.bounds.x + mine.bounds.width - 48)
        .sort((a, b) => a.bounds.x - b.bounds.x)[0] || null;
    }
    if (direction === "up") {
      return candidates
        .filter((display) => display.bounds.y + display.bounds.height <= mine.bounds.y + 48)
        .sort((a, b) => b.bounds.y - a.bounds.y)[0] || null;
    }
    return candidates
      .filter((display) => display.bounds.y >= mine.bounds.y + mine.bounds.height - 48)
      .sort((a, b) => a.bounds.y - b.bounds.y)[0] || null;
  }

  async function maybeTransferCard(el, x, y, w, h, opts) {
    const g = gridSize();
    const ws = workspaceRect();
    let target = null;
    let placeX = g;
    let placeY = g;
    const outLeft = x <= -g || (opts.clientX != null && opts.clientX < 12);
    const outRight = x + w >= ws.width + g || (opts.clientX != null && opts.clientX > window.innerWidth - 12);
    const outUp = y <= -g || (opts.clientY != null && opts.clientY < 12);
    const outDown = y + h >= ws.height + g || (opts.clientY != null && opts.clientY > window.innerHeight - 12);
    if (outLeft) {
      target = neighborDisplay("left");
      placeX = Math.max(g, alignGrid(ws.width - w - g));
    } else if (outRight) {
      target = neighborDisplay("right");
      placeX = g;
    } else if (outUp) {
      target = neighborDisplay("up");
      placeY = Math.max(g, alignGrid(ws.height - h - g));
    } else if (outDown) {
      target = neighborDisplay("down");
      placeY = g;
    }
    if (!target || !opts.widgetType) return false;
    if (opts.widgetType === "desktop" && !target.primary) {
      toast("系統桌面僅能顯示在主顯示器");
      return false;
    }
    const placed = pxToGridFields(placeX, placeY, w, h);
    const widget = {
      type: opts.widgetType,
      id: opts.widgetId,
      data: opts.widgetData,
      ...placed
    };
    const result = await window.edex.transferWidget(target.id, widget);
    if (result?.ok) {
      opts.onTransferred?.();
      toast(`已移至 ${target.label}`);
      return true;
    }
    if (result?.message) toast(result.message);
    return false;
  }

  function workspaceRect() {
    const workspace = document.getElementById("workspace");
    return {
      width: workspace?.clientWidth || window.innerWidth,
      height: workspace?.clientHeight || Math.floor(window.innerHeight * 0.86)
    };
  }

  function panelZoneMode(el) {
    const id = el?.dataset?.panelId;
    return id && state().layout[id]?.zone === "edge" ? "edge" : "workspace";
  }

  function centralZoneRect() {
    const ws = workspaceRect();
    const margins = state().settings.windowZoneMargins || {};
    const left = ws.width * Math.max(0, Math.min(45, Number(margins.left) || 0)) / 100;
    const top = ws.height * Math.max(0, Math.min(45, Number(margins.top) || 0)) / 100;
    const right = ws.width * (1 - Math.max(0, Math.min(45, Number(margins.right) || 0)) / 100);
    const bottom = ws.height * (1 - Math.max(0, Math.min(45, Number(margins.bottom) || 0)) / 100);
    return {
      x: left,
      y: top,
      width: Math.max(40, right - left),
      height: Math.max(40, bottom - top)
    };
  }

  function panelZoneRect(el) {
    const ws = workspaceRect();
    if (panelZoneMode(el) === "edge" || state().settings.windowZoneEnabled === false) {
      return { x: 0, y: 0, width: ws.width, height: ws.height };
    }
    return centralZoneRect();
  }

  function constrainPanelPosition(el, x, y, w, h) {
    const current = state();
    const ws = workspaceRect();
    if (current.settings.windowZoneEnabled === false) {
      return {
        x: Math.max(0, Math.min(ws.width - w, x)),
        y: Math.max(0, Math.min(ws.height - h, y))
      };
    }
    if (panelZoneMode(el) === "workspace") {
      const zone = centralZoneRect();
      return {
        x: Math.max(zone.x, Math.min(zone.x + zone.width - w, x)),
        y: Math.max(zone.y, Math.min(zone.y + zone.height - h, y))
      };
    }
    const central = centralZoneRect();
    const regions = [
      { x: 0, y: 0, width: central.x, height: ws.height },
      { x: central.x + central.width, y: 0, width: ws.width - central.x - central.width, height: ws.height },
      { x: 0, y: 0, width: ws.width, height: central.y },
      { x: 0, y: central.y + central.height, width: ws.width, height: ws.height - central.y - central.height }
    ];
    const candidates = regions
      .filter((region) => region.width >= w && region.height >= h)
      .map((region) => ({
        x: Math.max(region.x, Math.min(region.x + region.width - w, x)),
        y: Math.max(region.y, Math.min(region.y + region.height - h, y))
      }));
    return candidates.sort(
      (a, b) => ((a.x - x) ** 2 + (a.y - y) ** 2) - ((b.x - x) ** 2 + (b.y - y) ** 2)
    )[0] || { x: 0, y: 0 };
  }

  function findPanelZonePosition(el) {
    const current = state();
    const id = el?.dataset?.panelId;
    if (!id || !current.layout[id]) return null;
    const box = pxFromBox(current.layout[id]);
    const ws = workspaceRect();
    const central = centralZoneRect();
    const regions = panelZoneMode(el) === "edge"
      ? [
        { x: 0, y: 0, width: central.x, height: ws.height },
        { x: central.x + central.width, y: 0, width: ws.width - central.x - central.width, height: ws.height },
        { x: 0, y: 0, width: ws.width, height: central.y },
        { x: 0, y: central.y + central.height, width: ws.width, height: ws.height - central.y - central.height }
      ]
      : [central];
    const others = occupiedLayoutRects({ panelId: id });
    const g = gridSize();
    const usableRegions = regions.filter((region) => region.width >= g * 2 && region.height >= g * 2);
    if (!usableRegions.length) return null;
    const largestRegion = usableRegions.slice().sort(
      (a, b) => (b.width * b.height) - (a.width * a.height)
    )[0];
    const safeW = Math.max(g * 2, Math.min(box.w, Math.floor(largestRegion.width / g) * g));
    const safeH = Math.max(g * 2, Math.min(box.h, Math.floor(largestRegion.height / g) * g));
    const fitsZone = (x, y, w = safeW, h = safeH) => regions.some((region) => (
      x >= region.x && y >= region.y
      && x + w <= region.x + region.width + g
      && y + h <= region.y + region.height + g
    ));
    const currentPosition = constrainPanelPosition(el, box.x, box.y, safeW, safeH);
    const safeCurrent = { x: box.x, y: box.y, w: safeW, h: safeH };
    if (fitsZone(box.x, box.y, safeW, safeH) && !overlapsAny(safeCurrent, others)) return safeCurrent;

    let best = null;
    let bestDistance = Infinity;
    for (const region of regions) {
      if (region.width < safeW || region.height < safeH) continue;
      const maxX = Math.max(region.x, region.x + region.width - safeW);
      const maxY = Math.max(region.y, region.y + region.height - safeH);
      for (let y = alignGrid(region.y); y <= maxY; y += g) {
        for (let x = alignGrid(region.x); x <= maxX; x += g) {
          const candidate = { x, y, w: safeW, h: safeH };
          if (overlapsAny(candidate, others)) continue;
          const distance = (x - currentPosition.x) ** 2 + (y - currentPosition.y) ** 2;
          if (distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
          }
        }
      }
    }
    if (best) return best;
    const fallbackRegion = largestRegion;
    return {
      x: Math.max(fallbackRegion.x, Math.min(fallbackRegion.x + fallbackRegion.width - safeW, currentPosition.x)),
      y: Math.max(fallbackRegion.y, Math.min(fallbackRegion.y + fallbackRegion.height - safeH, currentPosition.y)),
      w: safeW,
      h: safeH
    };
  }

  function repositionPanelInZone(el) {
    const current = state();
    const id = el?.dataset?.panelId;
    if (!id || !current.layout[id]) return false;
    const previous = pxFromBox(current.layout[id]);
    const next = findPanelZonePosition(el);
    if (!next) return false;
    el.style.left = `${next.x}px`;
    el.style.top = `${next.y}px`;
    el.style.width = `${next.w}px`;
    el.style.height = `${next.h}px`;
    applyBoxPx(current.layout[id], next.x, next.y, next.w, next.h);
    return next.x !== previous.x || next.y !== previous.y || next.w !== previous.w || next.h !== previous.h;
  }

  function clampPanelToZone(el) {
    const current = state();
    const id = el?.dataset?.panelId;
    if (!id || !current.layout[id]) return false;
    return repositionPanelInZone(el);
  }

  function syncDesktopChrome() {
    const current = state();
    const filterBar = document.getElementById("desk-filter-bar");
    const pathText = document.getElementById("desktop-path-text");
    const folderTab = activeDesktopFolderTab();
    const onClassify = !folderTab;
    if (filterBar) filterBar.hidden = !onClassify;
    if (pathText) {
      const shown = folderTab?.path || current.bootstrap?.desktop || "";
      pathText.textContent = shown;
      pathText.title = shown;
    }
    renderDeskTabs();
    syncDeskFilters();
  }

  function syncDeskFilters() {
    const current = state().desktopFilter || "all";
    document.querySelectorAll("[data-desk-filter]").forEach((button) => {
      button.classList.toggle("on", button.dataset.deskFilter === current);
    });
  }

  function renderGroupedDesktop(stage, all, buckets, view, fileOpts) {
    stage.classList.remove("view-list", "view-grid");
    stage.classList.add("view-grouped");
    const visibleBuckets = buckets.filter((bucket) => all.some((item) => matchesDeskFilter(item, bucket.id)));
    const list = visibleBuckets.length ? visibleBuckets : buckets;
    stage.innerHTML = list.map((bucket) => {
      const count = all.filter((item) => matchesDeskFilter(item, bucket.id)).length;
      const label = window.edexI18n?.translateDynamic?.(bucket.label) || bucket.label;
      return `<section class="desk-group" data-bucket="${bucket.id}"><h4>${escapeHtml(label)}<em>${count}</em></h4><div class="desk-group-items"></div></section>`;
    }).join("");
    list.forEach((bucket) => {
      const inner = stage.querySelector(`[data-bucket="${bucket.id}"] .desk-group-items`);
      if (!inner) return;
      const items = all.filter((item) => matchesDeskFilter(item, bucket.id));
      if (!items.length) {
        inner.className = "desk-group-items";
        const label = window.edexI18n?.translateDynamic?.(bucket.label) || bucket.label;
        const locale = window.edexI18n?.locale?.() || "de";
        const empty = locale === "zh-Hant" ? `沒有${bucket.label}` : locale === "en" ? `No ${label}` : `Keine ${label}`;
        inner.innerHTML = `<p class="path-empty">${escapeHtml(empty)}</p>`;
        return;
      }
      fillIconStage(inner, items, { draggable: false, view, ...fileOpts });
    });
    bindFileStage(stage, fileOpts);
  }

  async function renderDesktopFolderTab(stage, folderTab, view, arrange) {
    stage.classList.remove("view-grouped");
    if (!folderTab.listing) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(window.edexI18n?.translateDynamic?.("讀取中…") || "Loading …")}</p>`;
      await loadFolderTabListing(folderTab);
    }
    const fileOpts = {
      destDir: folderTab.path || "",
      desktopActions: true,
      onRefresh: async () => {
        folderTab.listing = null;
        await arrange();
      }
    };
    if (folderTab.listingError) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(folderTab.listingError)}</p>`;
      bindFileStage(stage, fileOpts);
      return true;
    }
    const items = listingItems(folderTab.listing);
    if (!items.length) {
      stage.innerHTML = `<p class="path-empty">${escapeHtml(window.edexI18n?.translateDynamic?.("此資料夾沒有可顯示的項目") || "This folder has no items to display")}</p>`;
      bindFileStage(stage, fileOpts);
      return true;
    }
    fillIconStage(stage, items, { draggable: false, view, ...fileOpts });
    return true;
  }

  function applyTheme(theme, wallpaperId) {
    const current = state();
    current.theme = theme;
    const c = theme.colors || {};
    const mode = current.settings.windowsColorMode || "subtle";
    const rawAccent = current.windowsColors?.accent || "#00eaff";
    const match = rawAccent.replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    const windowsRgb = match ? match.slice(1).map((part) => parseInt(part, 16)) : [0, 234, 255];
    const blend = mode === "strong" ? 0.55 : mode === "subtle" ? 0.22 : 0;
    const r = Math.round((c.r ?? 170) * (1 - blend) + windowsRgb[0] * blend);
    const g = Math.round((c.g ?? 207) * (1 - blend) + windowsRgb[1] * blend);
    const b = Math.round((c.b ?? 209) * (1 - blend) + windowsRgb[2] * blend);
    const panelBase = c.black || "#000000";
    const panelLight = c.light_black || "#05080d";
    const panelMatch = String(panelBase).replace(/^#/, "").match(/^([0-9a-f]{6})$/i);
    const panelLuma = panelMatch
      ? (parseInt(panelMatch[1].slice(0, 2), 16) * 0.299
        + parseInt(panelMatch[1].slice(2, 4), 16) * 0.587
        + parseInt(panelMatch[1].slice(4, 6), 16) * 0.114)
      : 0;
    const panelText = panelLuma > 150 ? "#101820" : "#d7f8ff";
    document.documentElement.style.setProperty("--color_r", r);
    document.documentElement.style.setProperty("--color_g", g);
    document.documentElement.style.setProperty("--color_b", b);
    document.documentElement.style.setProperty("--color_black", panelBase);
    document.documentElement.style.setProperty("--color_light_black", mixThemeColor(panelLight, rawAccent, blend * 0.18));
    document.documentElement.style.setProperty("--color_grey", mixThemeColor(c.grey || "#262828", rawAccent, blend * 0.35));
    document.documentElement.style.setProperty("--color_red", c.red || "#ff3c3c");
    document.documentElement.style.setProperty("--color_yellow", c.yellow || "#ffd23c");
    document.documentElement.style.setProperty("--panel-bg", panelBase);
    document.documentElement.style.setProperty("--panel-surface", panelLight);
    document.documentElement.style.setProperty("--panel-content", panelBase);
    document.documentElement.style.setProperty("--panel-text", panelText);
    document.documentElement.style.setProperty("--panel-border", `rgba(${r}, ${g}, ${b}, 0.28)`);
    document.documentElement.style.setProperty("--panel-border-strong", `rgba(${r}, ${g}, ${b}, 0.55)`);
    document.documentElement.style.setProperty("--snap-gap", `${snapGap()}px`);
    applyUiMetrics();
    window.__edexTheme = theme;

    const wp = wallpaperId || current.settings.wallpaper || "grid";
    document.body.className = `desktop-shell wp-${wp}`;
    const windowsThemeSync = window.edex?.applyWindowsTheme?.({
      mode,
      rgb: { r: c.r ?? 170, g: c.g ?? 207, b: c.b ?? 209 }
    });
    windowsThemeSync?.catch?.(() => {});
  }

  window.edexDesktopLayout = {
    applyTheme,
    snapGap,
    alignGrid,
    gridCells,
    cellsPx,
    alignGridSpan,
    snapExclusiveEdge,
    gridLineOf,
    pxFromBox,
    boxToPx,
    snapBoxVwVh,
    pxToGridFields,
    applyBoxPx,
    rectsTooClose,
    otherCardRects,
    overlapsAny,
    resolveMoveNoOverlap,
    clampResizeNoOverlap,
    snapAllLayoutToGrid,
    currentDisplayLayout,
    persistLayout,
    showSnapGuides,
    collectSnapTargets,
    referenceGuides,
    magneticSnap,
    gridMinSize,
    magneticResize,
    neighborDisplay,
    maybeTransferCard,
    workspaceRect,
    panelZoneMode,
    centralZoneRect,
    panelZoneRect,
    constrainPanelPosition,
    findPanelZonePosition,
    repositionPanelInZone,
    clampPanelToZone,
    syncDesktopChrome,
    syncDeskFilters,
    renderGroupedDesktop,
    renderDesktopFolderTab
  };
})();
