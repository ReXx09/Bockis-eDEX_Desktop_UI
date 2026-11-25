# BOCKIS Desktop Spotlight Tour 1.1

## What's new

- Guided four-step spotlight after first-run completion when **Show tips** is selected.
- Tries to highlight visible Hardware/Panel, Settings, Desktop/Dock, and Settings/Windows Integration affordances.
- Falls back to a centered explanation if a target isn't visible (e.g. another monitor or hidden widget).
- Explicit **Skip tour** on every step; Escape also dismisses immediately.
- **Start desktop tour** button next to **Restart setup** in Settings to replay without changing configuration.
- Existing wizard **Skip** behavior remains unchanged. No additional Windhawk installation, setting mutation, or Windows modifications.
- Five new translation keys are present in English, German and Traditional Chinese; English remains canonical.

## Files changed

- `src/first-run/first-run.js`: tour state, spotlight positioning and cleanup.
- `src/first-run/first-run.css`: guided overlay/spotlight/tooltip styling.
- `src/renderer.js`: button to replay the tour.
- `src/locales/{en,de,zh-Hant}.json`: titles for tour steps and replay action.
- `src/locales/{en,de,zh-Hant}.js`: generated browser translation bundles.
- `test/desktop-tour.test.js`: regression checks.

## Test notes

Code syntax, language validation, and focused Node tests were executed in the development environment. Electron runtime and multimonitor visual positioning need validation on Windows 11. Clicking **Skip tour** ends the overlay without changing user settings; the optional tour is not a substitute for actual OS integration.
