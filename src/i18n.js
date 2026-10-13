(() => {
  const SUPPORTED = ["zh-Hant", "de", "en"];
  const translations = {
    de: {
      "設定": "Einstellungen",
      "添加容器": "Container hinzufügen",
      "插件開關": "Plugin-Schalter",
      "底部 Dock（貼螢幕底邊）": "Unteres Dock (am Bildschirmrand)",
      "外框": "Rahmen",
      "寬度": "Breite",
      "高度": "Höhe",
      "像素": "Pixel",
      "圓角": "Abgerundet",
      "梯形": "Trapez",
      "直角": "Rechteckig",
      "插件面板": "Plugin-Panels",
      "其他": "Weitere Optionen",
      "桌面容器": "Desktop-Container",
      "路徑容器": "Pfad-Container",
      "可連續添加，完成後按「關閉」": "Du kannst mehrere Elemente hinzufügen und danach schließen.",
      "關閉": "Schließen",
      "保存佈局": "Layout speichern",
      "套用設定並保存佈局": "Einstellungen anwenden und Layout speichern",
      "重設容器位置": "Container-Positionen zurücksetzen",
      "結束程式": "Programm beenden",
      "畫面與外觀（解析度與網格全顯示器同步）": "Anzeige und Darstellung (Auflösung und Raster synchronisiert)",
      "項目": "Element",
      "說明": "Beschreibung",
      "值": "Wert",
      "本顯示器": "Dieser Monitor",
      "實體解析度（非系統 2K 縮放）": "Physische Auflösung (ohne System-2K-Skalierung)",
      "顯示器數量": "Anzahl der Monitore",
      "各自獨立視窗，非鏡像": "Separate Fenster, keine Spiegelung",
      "主題": "Theme",
      "原版介面主題": "Originales Interface-Theme",
      "壁紙": "Hintergrund",
      "所有顯示器共用背景": "Gemeinsamer Hintergrund für alle Monitore",
      "圖示顯示": "Symbolansicht",
      "桌面容器內圖示排列": "Anordnung der Symbole im Desktop-Container",
      "圖示網格": "Symbolraster",
      "圖示列表": "Symbolliste",
      "自動吸附": "Automatisch einrasten",
      "容器拖曳時自動對齊（含螢幕邊緣）": "Container beim Ziehen automatisch ausrichten (inkl. Bildschirmränder)",
      "底部 Dock": "Unteres Dock",
      "主螢幕底邊背景條；寬度跟隨任務欄圖示；不遮擋點擊": "Hintergrundleiste am unteren Rand; verdeckt keine Klicks",
      "Dock 外框": "Dock-Rahmen",
      "邊框帶電路發光點": "Rahmen mit leuchtenden Schaltungspunkten",
      "網格大小": "Rastergröße",
      "時鐘字格": "Uhr-Raster",
      "顯示日期": "Datum anzeigen",
      "時間格式": "Zeitformat",
      "時鐘高亮": "Uhr-Hervorhebung",
      "搜尋字體": "Suchschriftgröße",
      "瀑布字體": "Code-Regen-Schriftgröße",
      "瀑布速度": "Code-Regen-Geschwindigkeit",
      "佈局解析度": "Layout-Auflösung",
      "介面比例": "Interface-Skalierung",
      "遷移檔案": "Dateien verschieben",
      "整理資料夾": "Ordner einbeziehen",
      "桌面佈局": "Desktop-Layout",
      "快速搜尋": "Schnellsuche",
      "文件": "Dokumente",
      "圖片": "Bilder",
      "影片": "Videos",
      "音樂": "Audio",
      "壓縮檔": "Archive",
      "應用程式": "Anwendungen",
      "其他": "Sonstige",
      "全部": "Alle",
      "文件夾": "Ordner",
      "資料夾": "Ordner",
      "圖標": "Symbole",
      "圖示": "Symbole",
      "桌面分類": "Desktop-Kategorien",
      "桌面捷徑": "Desktop-Verknüpfungen",
      "中": "Mitte",
      "路徑": "Pfad",
      "可用": "frei",
      "已用": "belegt",
      "可移除": "Wechseldatenträger",
      "網路": "Netzwerk",
      "本機": "Lokal",
      "找不到本機磁碟": "Keine lokalen Laufwerke gefunden",
      "無法讀取磁碟": "Laufwerke konnten nicht gelesen werden",
      "本機索引": "Lokaler Index",
      "索引中": "Indexierung läuft",
      "搜尋尚未就緒": "Suche noch nicht bereit",
      "沒有符合「": "Keine Dateien entsprechen „",
      "Fenster laden": "Fenster laden",
      "Noch keine Fenster geladen": "Noch keine Fenster geladen",
      "Andocken": "Andocken",
      "Freigeben": "Freigeben",
      "Windows-Fenstereinbettung": "Windows-Fenstereinbettung",
      "時鐘": "Uhr",
      "瀑布代碼": "Code-Regen",
      "處理器": "Prozessor",
      "記憶體": "Arbeitsspeicher",
      "進程": "Prozesse",
      "地球視圖": "Globus",
      "網路流量": "Netzwerkverkehr",
      "日曆": "Kalender",
      "本機磁碟": "Lokale Laufwerke",
      "終端機": "Terminal",
      "駕駛室": "Cockpit",
      "音樂磁帶": "Musikkassette",
      "計算器": "Rechner",
      "底部 Dock": "Unteres Dock",
      "更多操作": "Weitere Aktionen",
      "標記": "Markierung",
      "無": "Keine",
      "點陣時鐘": "Punktmatrix-Uhr",
      "搜尋本機／局域網檔名…": "Lokale/LAN-Dateien suchen …",
      "搜尋": "Suchen",
      "輸入關鍵字開始搜尋": "Suchbegriff eingeben, um zu suchen",
      "駕駛室模組未載入": "Cockpit-Modul nicht geladen",
      "磁帶模組未載入": "Kassetten-Modul nicht geladen",
      "DDJ 模組未載入": "DDJ-Modul nicht geladen",
      "CPU 供電路徑模組未載入": "CPU-Versorgungspfad-Modul nicht geladen",
      "計算器模組未載入": "Rechner-Modul nicht geladen",
      "底部 Dock 模組未載入": "Dock-Modul nicht geladen",
      "背景顏色": "Hintergrundfarbe",
      "添加容器": "Container hinzufügen",
      "解鎖": "Entsperren",
      "鎖定": "Sperren",
      "隱藏日期": "Datum ausblenden",
      "顯示日期": "Datum anzeigen",
      "重新整理": "Aktualisieren",
      "新增資料夾／網路磁碟": "Ordner/Netzlaufwerk hinzufügen",
      "新增局域網路徑": "LAN-Pfad hinzufügen",
      "管理搜尋路徑": "Suchpfade verwalten",
      "重建索引": "Index neu erstellen",
      "切換為網格": "Zu Raster wechseln",
      "切換為列表": "Zu Liste wechseln",
      "重新掃描": "Erneut scannen",
      "在 VS Code 開啟桌面資料夾": "Desktop-Ordner in VS Code öffnen",
      "預覽整理": "Sortierung anzeigen",
      "執行整理": "Sortierung ausführen",
      "還原上次": "Letzte Aktion rückgängig machen",
      "啟用此路徑": "Diesen Pfad aktivieren",
      "開啟資料夾": "Ordner öffnen",
      "在 VS Code 開啟": "In VS Code öffnen",
      "更換路徑": "Pfad ändern",
      "關閉容器": "Container schließen",
      "系統桌面": "Systemdesktop",
      "系統桌面僅能顯示在主顯示器": "Der Systemdesktop kann nur auf dem Hauptmonitor angezeigt werden",
      "確定退出桌面整理？": "Desktop Organizer wirklich beenden?",
      "讀取中…": "Wird geladen …",
      "此資料夾沒有可顯示的項目": "Dieser Ordner enthält keine anzeigbaren Elemente",
      "輸入事項內容…": "Termininhalt eingeben …",
      "新增事項": "Termin hinzufügen",
      "編輯": "Bearbeiten",
      "刪除": "Löschen",
      "重設容器位置": "Container-Positionen zurücksetzen",
      "紅色": "Rot",
      "橙色": "Orange",
      "黃色": "Gelb",
      "綠色": "Grün",
      "藍色": "Blau",
      "紫色": "Violett",
      "灰色": "Grau",
      "白": "Weiß",
      "紅": "Rot",
      "黃": "Gelb",
      "青": "Cyan",
      "預設": "Standard",
      "自訂": "Benutzerdefiniert",
      "容器背景": "Container-Hintergrund",
      "時鐘高亮": "Uhr-Hervorhebung",
      "桌面整理": "Desktop Organizer",
      "最小化到 Dock": "Ins Dock minimieren",
      "原版網格": "Originalraster",
      "純色背景": "Einfarbiger Hintergrund",
      "掃描線": "Scanlines",
      "輻射光暈": "Radialer Schein",
      "六角場域": "Hexagonales Feld",
      "圓角 / 梯形 / 直角；邊框帶電路發光點": "Abgerundet / Trapez / Rechteckig; Rahmen mit leuchtenden Schaltungspunkten",
      "以主顯示器為準，所有顯示器使用同一格距（像素）": "Am Hauptmonitor ausgerichtet; alle Monitore verwenden dasselbe Raster (Pixel)",
      "相對壁紙網格倍率（0.25–2.0，可縮小）": "Relativer Faktor zum Hintergrundraster (0,25–2,0; kann verkleinert werden)",
      "在時間下方另起一行顯示年月日": "Datum in einer eigenen Zeile unter der Uhrzeit anzeigen",
      "點陣點亮顏色（色票或 #RRGGBB）": "Farbe der LED-Punkte (Farbfeld oder #RRGGBB)",
      "快速搜尋檔名、路徑與輸入框統一字級（px，預設 12）": "Einheitliche Schriftgröße für Dateinamen, Pfade und Suchfelder (px, Standard 12)",
      "代碼雨字級（px，8–72，手動輸入後套用）": "Schriftgröße des Code-Regens (px, 8–72; nach Eingabe anwenden)",
      "下落倍率（0.1–8.0，手動輸入後套用）": "Fallgeschwindigkeit (0,1–8,0; nach Eingabe anwenden)",
      "全顯示器同步。2K 螢幕依同一尺縮小，網格密度與 4K 一致": "Auf allen Monitoren synchronisiert. 2K-Bildschirme werden entsprechend skaliert; Rasterdichte wie bei 4K",
      "全顯示器同步，疊加在佈局解析度上": "Auf allen Monitoren synchronisiert und auf die Layout-Auflösung angewendet",
      "開啟後自動整理會把檔案搬到「分類／副檔名」資料夾；關閉則只篩選顯示": "Aktiviert verschiebt die automatische Sortierung Dateien in Kategorie-/Endungsordner; deaktiviert filtert sie nur",
      "遷移時一併把資料夾收到「資料夾」": "Beim Verschieben Ordner zusätzlich in den Ordner „Ordner“ einsortieren",
      "保存本顯示器全部容器：插件開關與位置、系統桌面、路徑卡、桌面標籤。關閉的插件不會在下次啟動復原。": "Alle Container dieses Monitors speichern: Plugins, Positionen, Systemdesktop, Pfadkarten und Desktop-Tabs. Geschlossene Plugins werden beim nächsten Start nicht wiederhergestellt."
    },
    en: {
      "Windows-Farben": "Windows colors", "Windows-Akzentfarbe in das aktive Theme einmischen": "Blend the Windows accent color into the active theme", "Theme-Hintergrund beibehalten": "Keep theme wallpaper", "Theme-Wallpaper auch ohne aktive Organizer-Oberfläche als Windows-Desktop verwenden": "Use the theme wallpaper as the Windows desktop even when the Organizer is closed", "Aus": "Off", "Dezent": "Subtle", "Stark": "Strong",
      "設定": "Settings", "添加容器": "Add container", "插件開關": "Plugin switches",
      "底部 Dock（貼螢幕底邊）": "Bottom Dock (screen edge)", "外框": "Frame", "寬度": "Width", "高度": "Height", "像素": "Pixels",
      "圓角": "Rounded", "梯形": "Trapezoid", "直角": "Square", "插件面板": "Plugin panels", "其他": "Other options",
      "桌面容器": "Desktop container", "路徑容器": "Path container", "可連續添加，完成後按「關閉」": "Add multiple items, then close",
      "關閉": "Close", "保存佈局": "Save layout", "套用設定並保存佈局": "Apply settings and save layout", "重設容器位置": "Reset container positions", "結束程式": "Exit",
      "畫面與外觀（解析度與網格全顯示器同步）": "Display and appearance (resolution and grid synchronized)", "項目": "Item", "說明": "Description", "值": "Value",
      "本顯示器": "This monitor", "實體解析度（非系統 2K 縮放）": "Physical resolution (without system 2K scaling)", "顯示器數量": "Number of monitors", "各自獨立視窗，非鏡像": "Separate windows, not mirrored",
      "主題": "Theme", "原版介面主題": "Original interface theme", "壁紙": "Wallpaper", "所有顯示器共用背景": "Shared background on all monitors",
      "圖示顯示": "Icon view", "桌面容器內圖示排列": "Icon arrangement in desktop containers", "圖示網格": "Icon grid", "圖示列表": "Icon list",
      "自動吸附": "Snap automatically", "底部 Dock": "Bottom Dock", "網格大小": "Grid size", "時鐘字格": "Clock grid", "顯示日期": "Show date",
      "時鐘高亮": "Clock highlight", "搜尋字體": "Search font size", "瀑布字體": "Code rain font size", "瀑布速度": "Code rain speed", "佈局解析度": "Layout resolution", "介面比例": "Interface scale",
      "遷移檔案": "Move files", "整理資料夾": "Include folders", "桌面佈局": "Desktop layout", "快速搜尋": "Quick search",
      "文件": "Documents", "圖片": "Pictures", "影片": "Videos", "音樂": "Audio", "壓縮檔": "Archives", "應用程式": "Applications", "其他": "Other", "全部": "All",
      "文件夾": "Folder", "資料夾": "Folder", "圖標": "Icons", "圖示": "Icons", "桌面分類": "Desktop categories", "桌面捷徑": "Desktop shortcuts", "中": "Center", "路徑": "Path",
      "可用": "free", "已用": "used", "可移除": "Removable", "網路": "Network", "本機": "Local", "找不到本機磁碟": "No local drives found", "無法讀取磁碟": "Could not read drives",
      "本機索引": "Local index", "索引中": "Indexing", "搜尋尚未就緒": "Search is not ready", "時鐘": "Clock", "瀑布代碼": "Code rain", "處理器": "Processor", "記憶體": "Memory", "進程": "Processes",
      "地球視圖": "Globe", "網路流量": "Network traffic", "日曆": "Calendar", "本機磁碟": "Local drives", "終端機": "Terminal", "駕駛室": "Cockpit", "音樂磁帶": "Music cassette", "計算器": "Calculator",
      "更多操作": "More actions", "標記": "Label", "無": "None", "點陣時鐘": "Dot-matrix clock", "搜尋": "Search", "輸入關鍵字開始搜尋": "Enter a search term to begin",
      "重新整理": "Refresh", "新增資料夾／網路磁碟": "Add folder/network drive", "新增局域網路徑": "Add LAN path", "管理搜尋路徑": "Manage search paths", "重建索引": "Rebuild index",
      "切換為網格": "Switch to grid", "切換為列表": "Switch to list", "重新掃描": "Rescan", "在 VS Code 開啟桌面資料夾": "Open desktop folder in VS Code", "預覽整理": "Preview organization", "執行整理": "Organize files",
      "還原上次": "Undo last action", "啟用此路徑": "Enable this path", "開啟資料夾": "Open folder", "在 VS Code 開啟": "Open in VS Code", "更換路徑": "Change path", "關閉容器": "Close container",
      "系統桌面": "System desktop", "讀取中…": "Loading…", "此資料夾沒有可顯示的項目": "This folder has no items to display", "新增事項": "Add event", "編輯": "Edit", "刪除": "Delete",
      "紅色": "Red", "橙色": "Orange", "黃色": "Yellow", "綠色": "Green", "藍色": "Blue", "紫色": "Purple", "灰色": "Gray", "白": "White", "紅": "Red", "黃": "Yellow", "青": "Cyan",
      "預設": "Default", "自訂": "Custom", "容器背景": "Container background", "桌面整理": "Desktop Organizer", "最小化到 Dock": "Minimize to Dock", "原版網格": "Original grid", "純色背景": "Solid background", "掃描線": "Scanlines",
      "解鎖": "Unlock", "鎖定": "Lock", "隱藏日期": "Hide date", "背景顏色": "Background color", "添加容器": "Add container"
    }
  };
  const dynamicRules = [
    [/^顯示器 (\d+) · (.+)$/, "Monitor $1 · $2"],
    [/^(\d+) 台$/, "$1 Monitore"],
    [/^移至 顯示器 (\d+)（(.+?)，主螢幕）$/, "Zu Monitor $1 ($2, Hauptmonitor)"],
    [/^移至 顯示器 (\d+)（(.+?)）$/, "Zu Monitor $1 ($2)"],
    [/^已最小化「(.+)」$/, "„$1“ ins Dock minimiert"],
    [/^已移至 (.+)$/, "Verschoben nach $1"],
    [/^已添加「(.+)」$/, "„$1“ hinzugefügt"],
    [/^已關閉「(.+)」$/, "„$1“ geschlossen"],
    [/^已遷移 (\d+) 個項目到分類資料夾$/, "$1 Elemente in Kategorieordner verschoben"],
    [/^已遷移 (\d+) 個項目$/, "$1 Elemente verschoben"],
    [/^掃描 (.+)：(\d+) 個項目$/, "Scan $1: $2 Elemente"],
    [/^讀取失敗：(.+)$/, "Lesen fehlgeschlagen: $1"],
    [/^執行失敗：(.+)$/, "Ausführung fehlgeschlagen: $1"],
    [/^已加入 (\d+) 個項目$/, "$1 Elemente hinzugefügt"],
    [/^開啟失敗$/, "Öffnen fehlgeschlagen"],
    [/^無法開啟此項目$/, "Element konnte nicht geöffnet werden"],
    [/^無法讀取資料夾$/, "Ordner konnte nicht gelesen werden"],
    [/^已顯示日期$/, "Datum angezeigt"],
    [/^已隱藏日期$/, "Datum ausgeblendet"],
    [/^已鎖定容器$/, "Container gesperrt"],
    [/^已解鎖容器$/, "Container entsperrt"]
  ];
  const dynamicRulesEn = [
    [/^顯示器 (\d+) · (.+)$/, "Monitor $1 · $2"],
    [/^(\d+) 台$/, "$1 monitors"],
    [/^移至 顯示器 (\d+)（(.+?)，主螢幕）$/, "Move to monitor $1 ($2, primary)"],
    [/^移至 顯示器 (\d+)（(.+?)）$/, "Move to monitor $1 ($2)"],
    [/^已最小化「(.+)」$/, "Minimized “$1” to Dock"],
    [/^已移至 (.+)$/, "Moved to $1"],
    [/^已添加「(.+)」$/, "Added “$1”"],
    [/^已關閉「(.+)」$/, "Closed “$1”"],
    [/^已加入 (\d+) 個項目$/, "$1 items added"],
    [/^已遷移 (\d+) 個項目$/, "$1 items moved"],
    [/^掃描 (.+)：(\d+) 個項目$/, "Scanned $1: $2 items"],
    [/^讀取失敗：(.+)$/, "Read failed: $1"],
    [/^執行失敗：(.+)$/, "Execution failed: $1"],
    [/^開啟失敗$/, "Open failed"],
    [/^無法開啟此項目$/, "Could not open item"],
    [/^無法讀取資料夾$/, "Could not read folder"],
    [/^已顯示日期$/, "Date shown"],
    [/^已隱藏日期$/, "Date hidden"],
    [/^已鎖定容器$/, "Container locked"],
    [/^已解鎖容器$/, "Container unlocked"]
  ];
  let current = "de";

  function normalize(locale) {
    return SUPPORTED.includes(locale) ? locale : "zh-Hant";
  }

  function setLocale(locale) {
    current = normalize(locale);
    document.documentElement.lang = current;
    return current;
  }

  function locale() {
    return current;
  }

  function translateValue(value) {
    const text = String(value ?? "");
    return translations[current]?.[text] || text;
  }

  function translateDynamic(value) {
    const text = translateValue(value);
    if (text !== String(value ?? "") || current === "zh-Hant") return text;
    for (const [pattern, replacement] of current === "en" ? dynamicRulesEn : dynamicRules) {
      if (pattern.test(text)) return text.replace(pattern, replacement);
    }
    return text;
  }

  function translatePage(root = document.body) {
    if (current === "zh-Hant" || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const translated = translateDynamic(trimmed);
      if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
    }
    root.querySelectorAll?.("[title], [placeholder], [aria-label]").forEach((element) => {
      for (const attr of ["title", "placeholder", "aria-label"]) {
        if (element.hasAttribute(attr)) element.setAttribute(attr, translateValue(element.getAttribute(attr)));
      }
    });
  }

  window.edexI18n = { SUPPORTED, normalize, setLocale, locale, translateValue, translateDynamic, translatePage };
})();
