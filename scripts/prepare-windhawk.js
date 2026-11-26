"use strict";

const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const path = require("path");

const output = path.join(__dirname, "..", "build", "Windhawk-Setup.exe");
const releaseTag = "v1.7.3";
const assetName = "windhawk_setup.exe";
const expectedSha256 = "5116cc1703384aac88b8d7a3b57f172aea5da32b6df7355fb2f8247d23813c8f";
const apiUrl = `https://api.github.com/repos/ramensoftware/windhawk/releases/tags/${releaseTag}`;
const maxInstallerBytes = 20 * 1024 * 1024;

function githubHeaders(url) {
  const headers = { "User-Agent": "Bockis-eDEX-Desktop-UI-build" };
  // Authenticated API calls avoid the shared-IP rate limit on CI runners; never forward the token to download hosts.
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token && url.hostname === "api.github.com") headers.Authorization = `Bearer ${token}`;
  return headers;
}

function request(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error("Too many redirects while downloading Windhawk."));
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") return Promise.reject(new Error("Windhawk download must use HTTPS."));
  return new Promise((resolve, reject) => {
    https.get(parsed, {
      headers: githubHeaders(parsed),
      timeout: 30000
    }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!response.headers.location) {
          reject(new Error("Windhawk download redirect had no location."));
          return;
        }
        request(new URL(response.headers.location, parsed).toString(), redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Windhawk download failed with HTTP ${response.statusCode}.`));
        return;
      }
      resolve(response);
    }).on("timeout", function onTimeout() {
      this.destroy(new Error("Windhawk download timed out."));
    }).on("error", reject);
  });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function isVerifiedInstaller(file) {
  try {
    return fs.existsSync(file) && sha256(file) === expectedSha256;
  } catch {
    return false;
  }
}

async function download() {
  if (isVerifiedInstaller(output)) {
    console.log("[prepare-windhawk] using verified stable installer");
    return;
  }

  const releaseResponse = await request(apiUrl);
  let releaseText = "";
  for await (const chunk of releaseResponse) releaseText += chunk;
  const release = JSON.parse(releaseText);
  if (release.tag_name !== releaseTag || release.draft || release.prerelease) {
    throw new Error(`Windhawk release ${releaseTag} is not a published stable release.`);
  }
  const asset = (release.assets || []).find((entry) => entry.name === assetName);
  if (!asset || asset.digest !== `sha256:${expectedSha256}` || asset.size > maxInstallerBytes) {
    throw new Error("Official Windhawk installer metadata did not match the pinned release.");
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporary = `${output}.download`;
  fs.rmSync(temporary, { force: true });
  console.log(`[prepare-windhawk] downloading official ${releaseTag} installer`);
  const installerResponse = await request(asset.browser_download_url);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(temporary, { flags: "wx" });
    let bytes = 0;
    installerResponse.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxInstallerBytes) {
        installerResponse.destroy(new Error("Windhawk installer exceeded the expected size limit."));
      }
    });
    installerResponse.pipe(file);
    file.on("finish", () => file.close(resolve));
    file.on("error", (error) => {
      file.close(() => fs.rmSync(temporary, { force: true }));
      reject(error);
    });
    installerResponse.on("error", (error) => {
      file.close(() => fs.rmSync(temporary, { force: true }));
      reject(error);
    });
  });
  if (sha256(temporary) !== expectedSha256) {
    fs.rmSync(temporary, { force: true });
    throw new Error(`Windhawk installer checksum mismatch for ${releaseTag}.`);
  }
  fs.rmSync(output, { force: true });
  fs.renameSync(temporary, output);
}

if (require.main === module) {
  download().catch((error) => {
    console.error(`[prepare-windhawk] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { download, expectedSha256, releaseTag, assetName, output };
