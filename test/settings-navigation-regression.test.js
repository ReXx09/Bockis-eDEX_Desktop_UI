'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/organizer.css'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src/renderer.js'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'build/tron_bootstrap.cs'), 'utf8');
const nsis = fs.readFileSync(path.join(root, 'build/installer.nsh'), 'utf8');
test('collapsed settings children stay hidden even with display:flex', () => {
  assert.match(css, /\.settings-navigation-children\[hidden\][\s\S]*?\{\s*display:\s*none\s*!important/);
});
test('category toggle does not implicitly activate a different settings page', () => {
  assert.doesNotMatch(renderer, /children\.querySelector\("\.settings-submenu:not\(\[hidden\]\)"\)\?\.click\(\)/);
  assert.match(renderer, /children\.hidden = !expanded;/);
});
test('bootstrap consent controls silent Windhawk setup and background launch', () => {
  assert.match(bootstrap, /selection\.WindhawkSilent = selection\.Windhawk && windhawkSilent\.Checked/);
  assert.match(bootstrap, /selection\.WindhawkTray = windhawk\.Checked && windhawkTray\.Checked/);
  assert.match(bootstrap, /Arguments = "-tray-only"/);
  assert.match(nsis, /ReadEnvStr \$1 EDEX_WINDHAWK_SILENT/);
  assert.match(nsis, /\/S \/STANDARD/);
});
