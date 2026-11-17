"use strict";

const https = require("https");

function versionParts(value) {
  const match = String(value || "").trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  return match ? match.slice(1, 4).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function fetchLatestRelease(owner, repo, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get({
      hostname: "api.github.com",
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
      headers: { "User-Agent": "Bockis-eDEX-Desktop-UI", Accept: "application/vnd.github+json" }
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) response.destroy(new Error("GitHub-Antwort ist zu groß"));
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GitHub antwortete mit HTTP ${response.statusCode}`));
          return;
        }
        try {
          const release = JSON.parse(body);
          const version = String(release.tag_name || "").replace(/^v/i, "");
          if (!versionParts(version)) throw new Error("Ungültige Release-Version");
          resolve({
            version,
            tag: release.tag_name,
            name: release.name || release.tag_name,
            url: release.html_url || "",
            publishedAt: release.published_at || ""
          });
        } catch (error) {
          reject(new Error(`Ungültige GitHub-Release-Antwort: ${error.message}`));
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Zeitüberschreitung bei der Updateprüfung")));
    request.on("error", reject);
  });
}

module.exports = { compareVersions, fetchLatestRelease, versionParts };
