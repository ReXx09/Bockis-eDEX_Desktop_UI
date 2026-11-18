const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.resolve(process.env.TRON_DIST_DIR || path.join(root, 'dist'));
const metadata = require(path.join(root, 'package.json'));
const version = metadata.displayVersion || metadata.build?.buildVersion || metadata.version;
const buildVersion = metadata.build?.buildVersion || version;
const installer = path.join(dist, `Bockis-eDEX-Desktop-UI-Setup-${version}.exe`);
const payload = `${installer}.payload.exe`;
const blockmap = `${installer}.blockmap`;
const latest = path.join(dist, 'latest.yml');
const assemblyInfo = path.join(dist, 'tron-assembly-info.cs');
const bootstrapSource = path.join(root, 'build', 'tron_bootstrap.cs');
const bootstrapManifest = path.join(root, 'build', 'tron_bootstrap.manifest');
const icon = path.join(root, 'assets', 'icons', 'branding', 'app.ico');
const cscCandidates = [
  path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
];
const csc = cscCandidates.find(candidate => fs.existsSync(candidate));

if (!fs.existsSync(installer)) throw new Error(`NSIS installer not found: ${installer}`);
if (!csc) throw new Error('csc.exe (.NET Framework 4) not found');

fs.renameSync(installer, payload);
try {
  fs.writeFileSync(assemblyInfo, [
    '[assembly: System.Reflection.AssemblyTitle("Bockis-eDEX Desktop UI Setup")]',
    '[assembly: System.Reflection.AssemblyProduct("Bockis-eDEX Desktop UI")]',
    `[assembly: System.Reflection.AssemblyVersion("${buildVersion}")]`,
    `[assembly: System.Reflection.AssemblyFileVersion("${buildVersion}")]`,
    `[assembly: System.Reflection.AssemblyInformationalVersion("${version}")]`,
    ''
  ].join('\n'), 'utf8');
  const args = [
    '/nologo',
    '/target:exe',
    '/optimize+',
    `/out:${installer}`,
    `/resource:${payload},TRON_PAYLOAD.exe`,
    '/reference:System.dll',
    bootstrapSource,
    assemblyInfo
  ];
  if (fs.existsSync(icon)) args.unshift(`/win32icon:${icon}`);
  if (fs.existsSync(bootstrapManifest)) args.unshift(`/win32manifest:${bootstrapManifest}`);

  const result = spawnSync(csc, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`csc failed with exit code ${result.status}`);
  if (fs.existsSync(blockmap)) fs.unlinkSync(blockmap);
  const installerBuffer = fs.readFileSync(installer);
  const sha512 = crypto.createHash('sha512').update(installerBuffer).digest('base64');
  const latestContent = [
    `version: ${version}`,
    'files:',
    `  - url: ${path.basename(installer)}`,
    `    sha512: ${sha512}`,
    `    size: ${installerBuffer.length}`,
    `path: ${path.basename(installer)}`,
    `sha512: ${sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
    ''
  ].join('\n');
  const latestTemp = `${latest}.tmp`;
  fs.writeFileSync(latestTemp, latestContent, 'utf8');
  fs.renameSync(latestTemp, latest);
  fs.unlinkSync(assemblyInfo);
  fs.unlinkSync(payload);
  console.log(`[tron-bootstrap] created ${installer}`);
} catch (error) {
  if (fs.existsSync(installer)) fs.unlinkSync(installer);
  fs.renameSync(payload, installer);
  if (fs.existsSync(assemblyInfo)) fs.unlinkSync(assemblyInfo);
  throw error;
}
