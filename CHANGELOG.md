# Changelog

## [Unreleased]

### Fixed

- **Custom themes:** choosing a theme in Theme Studio now loads the selected
  draft, protects unsaved changes when switching or closing settings and
  requires saving before activation. Theme lists update across open windows
  after saving, importing or deleting, and studio activation no longer leaves
  the general settings selection stale.
- **Desktop tour:** the first step pointed at non-existent panel IDs
  (`#card_cpuinfo`, `#card_hardwareInspector`, `#card_ramwatcher`) and now
  highlights the real CPU, hardware monitor or RAM panel.
- **Panel tour zone basics:** the "Scale zone" and "Edge zone" steps highlighted
  the panel instead of the zones. They now spotlight the central scale zone and
  mark the edge area; with zones disabled they fall back to the panel.
- **Tour card placement:** both tours measure the real card size and place it
  below, above, beside or in a corner, so taller practice cards no longer leave
  the screen or cover the highlighted panel.
- **Keyboard access:** the panel tour focus trap now includes the practice
  field, which was unreachable with Tab before.
- The desktop tour no longer starts while a panel tour is running and follows
  language changes immediately.
- Corrupt settings are preserved for recovery instead of silently replaced;
  settings and organizer journals are written atomically. Windows theme
  transactions now distinguish committed changes during recovery, desktop
  icon restoration requires a valid backup, and interrupted update responses
  fail explicitly.
- Windhawk is verified by its executable, required for the Windows Style
  Integration installer flow, and installed only after explicit consent.

### Added

- Back button in the desktop and panel tours (`firstRun.introBack`,
  `panelTour.back` in en, de and zh-Hant).
- All panel tour entry points use one shared `startPanelTour` helper.
- A **Tours & Help** settings page lists desktop, Theme Studio, Windows
  integration and panel tours, with replay controls, per-panel automatic-start
  switches and a reset for saved tour progress.
- Dedicated Theme Studio and Windows Style Integration walkthroughs highlight
  their relevant pages and explain manual Windhawk mod management without
  automatic mod installation.
- Panel learning now includes temporary date, task-label and font-size previews,
  plus interactive panel moving; settings shortcuts from the desktop tour open
  the matching settings page directly.
- German and Traditional Chinese tour strings repaired; generated locale
  modules are rebuilt from the canonical JSON resources.

## [1.2.7.9] - 2026-11-25

### Added

- **BOCKIS Windows Style Integration 1.0:** required Windhawk 1.7.3 runtime
  detection in Theme Studio, with official setup links for the File Explorer
  Styler and Taskbar Styler pilot mods. Mods and their settings are never
  installed, updated or overwritten automatically.
- **Graphical installer component selection:** dark WinForms bootstrapper with
  categories, descriptions, summary and explicit confirmation. Windhawk,
  Rainmeter, desktop/Start-menu shortcuts and launch-after-install are
  user-selectable. Windhawk requires explicit consent; setup aborts if it is
  declined, and existing installations are reused. Choices are passed to NSIS
  via `EDEX_INSTALL_*` variables. Silent Windhawk setup (`/S /STANDARD`) and
  tray-only start after installation are optional.
- **Automated Windows installer build:** GitHub Actions workflow
  (`windows-release.yml`) validates sources, runs tests, builds the NSIS
  setup and graphical bootstrapper, verifies `latest.yml`, writes
  `SHA256SUMS.txt` and prepares a draft release for `v*` tags. End users no
  longer need Node.js or npm.
- **Three-level settings navigation:** main categories, collapsible submenus
  and dedicated views instead of one long scrolling page, including search.
- **Theme Studio subpages:** library, eDEX colors, windows & panels, live
  preview (with before/after comparison), Windows color manager and Windows
  Style Integration as independent pages sharing one theme draft; unsaved
  theme drafts are flagged in the navigation and settings footer.
- **Text color roles:** separate `colors.text`, `colors.heading`,
  `colors.secondaryText` and `colors.buttonText`, exposed as CSS variables;
  existing themes fall back to the accent color.
- **BOCKIS Language Engine 2.0/2.1:** key-based i18n with English as canonical
  fallback plus German and Traditional Chinese (341 keys). Panels, Theme
  Studio and the installer bootstrapper use stable keys; installer strings are
  generated from the same locale files. `i18n:check` runs before tests and
  builds. A legacy compatibility layer still covers unmigrated texts.
- **First Run Experience 1.0:** six-step setup wizard (language, monitors,
  theme, optional features, summary) on the primary monitor, saved atomically;
  existing profiles are migrated as already set up.
- **Desktop Spotlight Tour 1.1:** optional four-step guided tour after setup,
  replayable from the settings.
- **Panel Tour 1.0–2.3:** first-add introductions for all 21 panel types with
  common zone basics, targeted spotlights on real setup controls, an
  interactive learning mode and temporary live previews that are only
  persisted through the regular panel-setup save.

### Fixed

- Panel Tour buttons were not clickable because the tour overlay was missing
  from the desktop hit-test; the spotlight no longer darkens the highlighted
  panel (2.3.1 hotfix).
- Theme Studio crashed on mount when the taskbar fields were missing
  (`Cannot set properties of null`).
- Keep Windows and Windhawk subpages attached while assembling Theme Studio,
  fixing initialization failing on `replaceChildren` and leaving colors empty.
- Collapsed settings submenus stayed visible because CSS overrode the `hidden`
  attribute; expanding a category no longer switches the active page.
- Settings dialog was capped at 760 px; it now uses up to 1420 px, and the
  embedded Theme Studio switches to one column in narrow layouts.
- "Windows & panels" submenu pointed to the desktop section.
- Language switching no longer degrades text through repeated translation.
- Saving a theme preserves JSON fields not managed by the editor.
- Windows registry backups recover interrupted transactions after a process
  exit and offer an emergency restore when the journal is damaged.

### Validation

- `npm run i18n:check`, `npm run panel-tour:check` and
  `npm run release:preflight` passed.
- JavaScript syntax checks passed for all runtime files.
- Project tests passed; the Windows installer was built and verified.
- Windows 11/Electron runtime, multi-monitor and installer UI tests are still
  pending.

## [1.2.7.8] - 2026-11-24

### Fixed

- Detect missing Windows registry keys and values without relying on localized
  `reg.exe` error messages, preventing repeated sync failures on non-English
  Windows installations.

## [1.2.7.7] - 2026-11-24

### Fixed

- Sync the accent color to DWM and Explorer accent values, with separate
  Start/taskbar and window-title display switches.
- Save managed Windows registry values in a versioned atomic backup and roll
  back partial apply/restore operations on failure.

## [1.2.7.6] - 2026-11-19

### Added

- Theme-aware hardware dashboard with CPU/GPU gauges, RAM/VRAM, drive capacities, network throughput and fan readings; unavailable sensors remain explicit.

### Fixed

- Use the full workspace height during startup so saved bottom task-panel positions are not moved to the top.

## [1.2.7.5] - 2026-11-19

### Added

- LibreHardwareMonitor/PawnIO sensor panel and an installer prerequisite check.

## [1.2.7] - 2026-10-22

### Added

- Centralized file-tag color definitions delivered to the renderer through IPC.
- GPL-3.0 license text in the repository.
- OpenSSH sessions directly inside terminal panes through the existing ConPTY/xterm.js bridge.
- OpenSSH-only terminal mode with saved SSH profiles.
- Per-monitor UI scaling in the settings dialog, including independently scaling modal and action controls.
- Optional startup preset selection with per-monitor layout and UI-scale restoration.

### Improved

- Consolidated runtime assets under the root `assets/` directory.
- Replaced the oversized boot logo PNG with a transparent WebP asset.
- Regenerated the Windows application icon with multiple resolutions.
- Enabled executable resource editing so the application icon is embedded in the packaged EXE.
- Improved Windows desktop icon restoration and stale hidden-icon recovery.
- Added keyboard-driven TRON terminal configuration for the optional Rainmeter installation.
- Corrected Snap-Grid occupancy for panels touching zone boundaries and adjacent grid cells.
- Added ordered shutdown cleanup for active ConPTY, PowerShell, and SSH terminal sessions.

### Validation

- JavaScript syntax checks passed for the changed runtime files.
- All project tests passed (`4/4`).
- Windows x64 NSIS installer built successfully with the application icon embedded.

## [1.2.6] - 2026-10-20

### Added

- Explorer-style navigation inside folder panels with back, forward, parent-folder, and refresh controls.
- Local folder search.
- Safe previews for supported text, source, structured-data, and image files.
- File properties showing name, path, type, size, and modification date.
- Copy, cut, paste, and move actions in folder-panel context menus.
- Internal drag-and-drop between folder panels and import by dragging files from Windows Explorer.

### Improved

- Opening a subfolder now navigates within the current folder panel instead of always creating another panel.
- Folder listings expose modification timestamps for properties and sorting-related UI needs.
- Preview handling rejects unsupported files and files larger than 2 MB.

### Validation

- JavaScript syntax checks passed for the changed runtime files.
- All project tests passed (`4/4`).
- Windows x64 NSIS installer built successfully.
