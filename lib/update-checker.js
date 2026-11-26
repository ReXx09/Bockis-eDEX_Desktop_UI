"use strict";

const https = require("https");

function versionParts(value) {
  const match = String(value || "").trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?(?:[-+].*)?$/);
  return match ? match.slice(1, 5).filter((part) => part !== undefined).map(Number) : null;
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const leftPart = a[index] || 0;
    const rightPart = b[index] || 0;
    if (leftPart !== rightPart) return leftPart > rightPart ? 1 : -1;
  }
  return 0;
}

function fetchLatestRelease(owner, repo, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (release) => {
      if (settled) return;
      settled = true;
      resolve(release);
    };
    const request = https.get({
      hostname: "api.github.com",
      path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`,
      headers: { "User-Agent": "Bockis-eDEX-Desktop-UI", Accept: "application/vnd.github+json" }
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("aborted", () => fail(new Error("GitHub-Updateantwort wurde vorzeitig abgebrochen")));
      response.on("error", fail);
      response.on("close", () => {
        if (!response.complete) fail(new Error("GitHub-Updateantwort wurde unvollständig übertragen"));
      });
      response.on("data", (chunk) => {
        body += chunk;
        if (body.length > 1024 * 1024) {
          fail(new Error("GitHub-Antwort ist zu groß"));
          response.destroy();
        }
      });
      response.on("end", () => {
        if (settled) return;
        if (response.statusCode < 200 || response.statusCode >= 300) {
          fail(new Error(`GitHub antwortete mit HTTP ${response.statusCode}`));
          return;
        }
        try {
          const release = JSON.parse(body);
          const version = String(release.tag_name || "").replace(/^v/i, "");
          if (!versionParts(version)) throw new Error("Ungültige Release-Version");
          succeed({
            version,
            tag: release.tag_name,
            name: release.name || release.tag_name,
            url: release.html_url || "",
            publishedAt: release.published_at || ""
          });
        } catch (error) {
          fail(new Error(`Ungültige GitHub-Release-Antwort: ${error.message}`));
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Zeitüberschreitung bei der Updateprüfung")));
    request.on("error", fail);
  });
}

module.exports = { compareVersions, fetchLatestRelease, versionParts };
