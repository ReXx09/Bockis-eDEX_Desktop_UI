const { execFile } = require("child_process");

let cache = { at: 0, items: [] };

function listAutostartItems() {
  const now = Date.now();
  if (now - cache.at < 5000) return Promise.resolve(cache.items);
  if (process.platform !== "win32") return Promise.resolve([]);

  const script = [
    "$items = @(Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | ForEach-Object {",
    "  [pscustomobject]@{",
    "    name = [string]$_.Name",
    "    command = [string]$_.Command",
    "    location = [string]$_.Location",
    "    user = [string]$_.User",
    "    caption = [string]$_.Caption",
    "  }",
    "})",
    "$items | ConvertTo-Json -Compress -Depth 3"
  ].join("\n");

  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "RemoteSigned", "-Command", script],
      { windowsHide: true, timeout: 10000, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          resolve(cache.items);
          return;
        }
        try {
          const parsed = stdout.trim() ? JSON.parse(stdout) : [];
          const items = (Array.isArray(parsed) ? parsed : [parsed])
            .filter((item) => item && (item.name || item.command))
            .map((item, index) => ({
              id: `startup_${index}_${String(item.name || "item").replace(/[^a-z0-9]+/gi, "_")}`,
              name: item.name || "Unbenannter Autostart",
              command: item.command || "",
              location: item.location || "",
              user: item.user || "",
              caption: item.caption || ""
            }));
          cache = { at: now, items };
          resolve(items);
        } catch {
          resolve(cache.items);
        }
      }
    );
  });
}

module.exports = { listAutostartItems };
