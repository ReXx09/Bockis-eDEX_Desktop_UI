# Theme Studio

Theme Studio is available in **Einstellungen → Theme Studio**. The four areas
are **eDEX Design**, **Windows 11**, **Desktop**, and **Profile & Sicherheit**.
It can edit eDEX colors, panel styles, and terminal fonts; preview changes on
all open displays; and save or activate custom themes.

Choosing a theme in the studio loads it for further editing. Unsaved changes
must be confirmed before switching themes or closing settings. Save the draft
before activating it; saved custom themes immediately appear in the general
theme selection without restarting eDEX. Activating a theme in the studio also
updates the open settings selection.

The **Eigenes Fenster** button opens the same editor in a separate Electron
window. Built-in themes remain read-only. Custom themes are stored below
Electron's `userData` directory in `custom-themes`; overwritten or deleted
custom themes are copied to `custom-themes-backups`. The **Speichername**
field determines the save destination and is populated when a theme is
selected. Changing it saves a copy; replacing a different existing theme
requires confirmation. Editing controls are temporarily locked while the
editor loads or saves a theme so later changes cannot be lost. On
case-insensitive filesystems, use the exact capitalization shown in the theme
list to avoid overwriting a different name unintentionally.

If the activity log cannot be updated, the studio reports that warning
separately after the theme has been saved or activated; the saved theme and
the existing activity file are not discarded.

Windows synchronization is managed per feature: accent color, app/system dark
mode, Start/taskbar accent, title-bar accent, transparency, taskbar alignment,
and taskbar size can be enabled, tested, and restored independently. Accent
colors are written to the DWM and Explorer accent values; Start/taskbar and
title-bar display switches are separate. Enabled features are reapplied when
eDEX synchronizes the active theme and at startup; a Windows update may reset
a value, so use **Testen** to check it again. Live preview never changes
Windows settings. `TaskbarSi` is explicitly experimental because Windows 11
versions may ignore it or reset it.

**BOCKIS Windows Style Integration 1.0** detects the installed Windhawk
version and lists the File Explorer Styler and Taskbar Styler pilot modules.
The eDEX Windows installer embeds the official Windhawk 1.7.3 online setup and
asks before running it; an existing registered Windhawk installation is left
untouched. Windhawk is a required installer component for this integration:
declining or canceling its setup also cancels the eDEX installation.
With the stable Windhawk 1.x line, pilot-mod installation and settings are
manually managed in Windhawk. eDEX does not install, update, enable, disable,
or overwrite mod settings. Mod compatibility must be checked on each official
Windhawk page; unregistered/portable Windhawk installations may not be detected.

The Windows registry backup is a versioned snapshot of every registry value
an enabled or tested feature changes. A durable transaction journal and backup
are written before changes; failed operations roll back, and an interrupted
operation is checked and recovered at the next app start. **Profile &
Sicherheit** shows backup/recovery status and offers a manual restore of all
Theme-Studio-managed values. This is not a Windows-wide backup: unmanaged
personalization settings are outside the registry manager's scope.

The Windows `.theme` importer reads theme colors, wallpaper references, cursor
schemes, sounds, and visual-style metadata into the eDEX theme draft. It does
not apply Windows settings or copy assets. Save the draft as a custom theme to
keep the imported metadata. Theme normalization also preserves properties not
currently exposed by the editor, so editing known fields does not discard
additional theme data.

The **Desktop** area manages eDEX wallpaper per display, shared or independent
display settings, grid/gradient backgrounds, icon/cursor presets, panel
opacity, and contrast. Profile tools export/import validated `.json` theme
packages, compare the loaded theme with the current draft, create and restore
local snapshots, and show a bounded activity log. Package imports are limited
to 1 MB and built-in themes remain read-only.
