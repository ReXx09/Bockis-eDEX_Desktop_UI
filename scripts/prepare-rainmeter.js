const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const path = require("path");

const output = path.join(__dirname, "..", "build", "Rainmeter-Setup.exe");
const releaseTag = "v4.5.28.3936";
const assetName = "Rainmeter-4.5.28.exe";
const expectedSha256 = "de6e010f8c28882bc28dcd8f319c899f34dfddec51e1e4dd4e7a23f68ebfe14d";
const apiUrl = `https://api.github.com/repos/rainmeter/rainmeter/releases/tags/${releaseTag}`;

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (response) => {
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        response.resume();
        request(response.headers.location, headers).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed with HTTP ${response.statusCode}`));
        return;
      }
      resolve(response);
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
    console.log("[prepare-rainmeter] using cached installer");
    return;
  }
  if (fs.existsSync(output)) fs.rmSync(output, { force: true });

  const release = await request(apiUrl, {
    "User-Agent": "Bockis-eDEX-Desktop-UI-build"
  });
  let metadata = "";
  for await (const chunk of release) metadata += chunk;
  const assets = JSON.parse(metadata).assets || [];
  const asset = assets.find((entry) => entry.name === assetName);
  if (!asset) throw new Error("No Rainmeter installer found in the latest release");

  console.log(`[prepare-rainmeter] downloading ${asset.name}`);
  const installer = await request(asset.browser_download_url, {
    "User-Agent": "Bockis-eDEX-Desktop-UI-build"
  });
  const temporary = `${output}.download`;
  fs.rmSync(temporary, { force: true });
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(temporary);
    installer.pipe(file);
    file.on("finish", () => file.close(resolve));
    file.on("error", (error) => {
      file.close(() => fs.rmSync(temporary, { force: true }));
      reject(error);
    });
    installer.on("error", (error) => {
      file.close(() => fs.rmSync(temporary, { force: true }));
      reject(error);
    });
  });
  if (sha256(temporary) !== expectedSha256) {
    fs.rmSync(temporary, { force: true });
    throw new Error(`Rainmeter installer checksum mismatch for ${asset.name}`);
  }
  fs.renameSync(temporary, output);
}

download().catch((error) => {
  console.error(`[prepare-rainmeter] ${error.message}`);
  process.exitCode = 1;
});