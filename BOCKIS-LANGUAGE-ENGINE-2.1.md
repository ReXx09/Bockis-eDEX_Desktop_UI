# BOCKIS Language Engine 2.1 — Migrationsbericht

## Umfang

**English** remains the canonical language and fallback; independent `en.json`, `de.json`, and `zh-Hant.json` files now include **172 common keys** (previously 80).

### Migrated panel areas
- `src/panels/panel-registry.js`: clock, weather, hardware prerequisites, process/RAM/network filters, file search, terminal controls, logs, autostart, dock, and card-toolbar accessibility labels.
- `src/panels/calculator-panel.js`, `ddj-panel.js`, `cpu-rail-panel.js`, `cassette-panel.js`, `hardware-dashboard.js`: selected status texts and accessible control descriptions. Dynamic data values (measurements, usernames, device names, logs, track names) deliberately remain data.
- `src/renderer.js`: freshly generated panel DOM is translated when rebuilding the workspace.
- `src/theme-studio.js`: standalone editor reads the saved locale from bootstrap settings and translates the existing view (and subscribes to settings updates from other display windows to retranslate without losing the unsaved draft; requires Windows/Electron validation).

### Installer
- `build/tron_bootstrap.cs`: major WinForms install-page text, selectable component descriptions, confirmations, and Windhawk explanations use `InstallerLanguage.T()`/`Format()` instead of German literals.
- `scripts/i18n-installer-build.js`: generates `build/installer-language.generated.cs` directly from **the same three JSON files**. The build script compiles this additional source with the Bootstrapper. The installer selects via Windows `CurrentUICulture` (German, Chinese -> Traditional, all others English). The installer locale and eDEX user preference remain independent.
- NSIS core messages, console progress lines, and other older status labels are **not fully migrated**; do not claim the installer is entirely translated.

## Maintenance

1. Add a stable `panel.*` or `installer.*` ID to `src/locales/en.json`.
2. Translate the exact same ID in `de.json` and `zh-Hant.json` with matching `{placeholders}`.
3. Run `npm run i18n:build` (updates browser JS and C# resources).
4. Run `npm run i18n:check` and `node --test test/i18n-migration.test.js`.
5. Migrate other module labels only after a UI review; **never translate user data, filesystem names, system logs, or technical identifiers**.

## Important limitations

- No Windows C# compiler or Electron runtime is available in this test environment. Build and visual acceptance must be checked on Windows 11, including font fallback for Chinese text.
- Dynamic runtime errors and non-migrated older panels still use the legacy text translation compatibility layer. Avoid removing it yet.
- Standalone Theme Studio now receives locale changes from the main process. A complete language-update review across all dynamically created dialogs remains open.
- Keep the exact names of technical components (`Windhawk`, `PawnIO`, `Rainmeter`) in every locale.
