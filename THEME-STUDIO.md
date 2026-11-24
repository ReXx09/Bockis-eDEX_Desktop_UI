# Theme Studio

Theme Studio is available in **Einstellungen → Theme Studio**. The four areas
are **eDEX Design**, **Windows 11**, **Desktop**, and **Profile & Sicherheit**.
It can edit eDEX colors, panel styles, and terminal fonts; preview changes on
all open displays; and save or activate custom themes.

The **Eigenes Fenster** button opens the same editor in a separate Electron
window. Built-in themes remain read-only. Custom themes are stored below
Electron's `userData` directory in `custom-themes`; overwritten or deleted
custom themes are copied to `custom-themes-backups`.

Windows synchronization is managed per feature: accent color, app/system dark
mode, Start/taskbar accent, title-bar accent, transparency, taskbar alignment,
and taskbar size can be enabled, tested, and restored independently. Accent
colors are written to the DWM and Explorer accent values; Start/taskbar and
title-bar display switches are separate. Enabled features are reapplied when
eDEX synchronizes the active theme and at startup; a Windows update may reset
a value, so use **Testen** to check it again. Live preview never changes
Windows settings.

The Windows registry backup is a versioned snapshot of every registry value
an enabled or tested feature changes. It is written atomically before changes;
a failed multi-value apply or restore rolls back the registry writes and
retains the backup. This is a rollback-safe transaction, not a Windows-wide
transaction: unmanaged personalization such as sounds, fonts, and arbitrary
theme files is not part of the registry manager's backup.

The **Desktop** area manages eDEX wallpaper per display, shared or independent
display settings, grid/gradient backgrounds, icon/cursor presets, panel
opacity, and contrast. Profile tools export/import validated `.json` theme
packages, compare the loaded theme with the current draft, create and restore
local snapshots, and show a bounded activity log. Package imports are limited
to 1 MB and built-in themes remain read-only.
