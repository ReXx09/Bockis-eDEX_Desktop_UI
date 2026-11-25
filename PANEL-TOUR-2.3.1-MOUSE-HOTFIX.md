# BOCKIS eDEX – Panel-Tour Mouse Hotfix 2.3.1

## Symptom
When a panel was added for the first time, the Panel Tour opened and visually highlighted the panel, but the **Weiter** and **Tour überspringen** buttons could not be clicked. The weather panel in the supplied Windows screenshot appeared nearly black despite the cyan highlight.

## Root cause (verified in source)
The full-screen tour element `.bockis-panel-tour` was not included in the desktop overlay's interactive hit-test (`src/panels/panel-registry.js`: `HUD_HIT_SEL` and its blocker selector). The transparent Electron desktop intentionally calls `setIgnoreMouseEvents(true, {forward:true})` when the pointer isn't over a recognized HUD element. The tour's buttons were *outside* the highlighted weather panel and therefore clicks could be routed to Windows instead of the tour. The tour also didn't explicitly claim `is-ui-hold`/`setMouseIgnore(false)` the way the first-run wizard does.

Separately, the full-screen dark overlay was covering the **inside** of the spotlight, making highlighted panels almost unreadable.

## Fix
- Add `.bockis-panel-tour` to the desktop hit-test and global blocking selectors. While the tour is open, the entire Electron window can receive its buttons' clicks, even when the pointer leaves the panel.
- On opening the tour, activate `body.is-ui-hold` and `window.edex.setMouseIgnore(false)` immediately. On close, release only the hold created by the tour. The hit-test also remains effective if another temporary code path clears the hold.
- Change spotlight dimming to a large shadow **outside** the highlighted element. The panel itself remains visible. Add a dark fallback when the target is not visible.
- Preserve panel-specific tours, learning mode, live previews, multilingual content, skip/Escape, and settings behavior.

## Files changed
- `src/panels/panel-registry.js`
- `src/panel-tour/panel-tour.js`
- `src/panel-tour/panel-tour.css`
- `test/panel-tour-mouse-hotfix.test.js` (new)
- `package.json` (include the full panel-tour regression suite in `npm test`)

## Verification
- `node --test` for first-run and panel-tour tests: **27/27 passed**
- `npm run i18n:check`: **341 locale keys, en/de/zh-Hant complete**
- `npm run panel-tour:check`: **manifest validated**
- `node --check` for renderer, panel-registry and tour modules: **passed**
- Full `npm test` run on this Linux sandbox: **99 tests, 91 passed, 2 failed, 6 cancelled**. Known environment-specific failures: missing installed `electron` module for organizer tests and Windows-vs-POSIX path-separator mismatch in the hardware test; six downstream hardware tests were cancelled.
- Windows 11 / actual Electron click interaction still needs on-device verification. The automated hit-test regression uses simulated DOM + Electron API calls.

## Manual Windows 11 verification
1. Add a previously unseen panel (e.g. Weather) and move pointer to **Weiter** below the highlighted panel. Click; it should advance.
2. Select **Tour überspringen**; it should immediately close and normal desktop click-through should resume.
3. Repeat via panel Setup → **Hilfe & Einführung** → Tour starten; test Escape and finish.
4. Verify controls and actual live preview under the Weather, Clock and RAM tours on a primary and secondary monitor.
5. Confirm the panel is readable inside the cyan highlight and the outside remains dimmed.

Note: The source project supplied as 2.3 was missing five font files required by the existing release preflight; they have not been reconstructed. No full Windows installer was built with this patch.
