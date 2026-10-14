const fs = require("fs");
const https = require("https");
const path = require("path");

const output = path.join(__dirname, "..", "build", "Rainmeter-Setup.exe");
const apiUrl = "https://api.github.com/repos/rainmeter/rainmeter/releases/latest";

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

async function download() {
  if (fs.existsSync(output) && fs.statSync(output).size > 1024 * 1024) {
    console.log("[prepare-rainmeter] using cached installer");
    return;
  }

  const release = await request(apiUrl, {
    "User-Agent": "Bockis-eDEX-Desktop-UI-build"
  });
  let metadata = "";
  for await (const chunk of release) metadata += chunk;
  const assets = JSON.parse(metadata).assets || [];
  const asset = assets.find((entry) => /^Rainmeter-.*\.exe$/i.test(entry.name));
  if (!asset) throw new Error("No Rainmeter installer found in the latest release");

  console.log(`[prepare-rainmeter] downloading ${asset.name}`);
  const installer = await request(asset.browser_download_url, {
    "User-Agent": "Bockis-eDEX-Desktop-UI-build"
  });
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(output);
    installer.pipe(file);
    file.on("finish", () => file.close(resolve));
    file.on("error", (error) => {
      file.close(() => fs.rmSync(output, { force: true }));
      reject(error);
    });
  });
}

download().catch((error) => {
  console.error(`[prepare-rainmeter] ${error.message}`);
  process.exitCode = 1;
});