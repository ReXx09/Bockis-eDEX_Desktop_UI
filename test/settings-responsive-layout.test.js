'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'src/renderer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/organizer.css'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'src/theme-studio.js'), 'utf8');
test('settings window overrides 760px default modal width for large studio', () => {
  assert.match(renderer, /placeCentered\(modal, \{ width: Math\.min\(1420, window\.innerWidth \* 0\.94\) \}\);/);
});
test('settings view constrains embedded studio based on actual content width', () => {
  assert.match(css, /container-name: settings-detail;/);
  assert.match(css, /@container settings-detail \(max-width: 760px\)/);
  assert.match(css, /\.theme-studio-in-settings \.studio-layout\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
});
test('panel design submenu actually opens panel design instead of desktop tab', () => {
  assert.match(renderer, /id: "studio-panels"[^\n]*section: "edex", anchor: "panel-design"/);
  assert.match(studio, /data-studio-anchor="panel-design"/);
});
test('general settings save explicitly distinguishes theme-studio save', () => {
  assert.match(renderer, /id="set-save"[^>]*>Einstellungen speichern<\/button>/);
});
