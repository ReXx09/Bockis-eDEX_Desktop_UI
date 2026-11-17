# Theme Studio

Theme Studio is available in **Einstellungen → Theme Studio**. It can edit the
main eDEX colors, preview changes on all open eDEX displays, save custom themes,
and activate a saved theme.

The **Eigenes Fenster** button opens the same editor in a separate Electron
window. Built-in themes remain read-only. Custom themes are stored below
Electron's `userData` directory in `custom-themes`; overwritten or deleted
custom themes are copied to `custom-themes-backups`.

Windows synchronization is optional. `subtle` changes the accent color while
preserving the current light/dark settings; `strong` also enables Windows dark
mode. Before the first change, the existing Windows values are backed up.
**Windows-Original wiederherstellen** restores that backup. Live preview never
changes Windows settings.
