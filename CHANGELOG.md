# Changelog

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
