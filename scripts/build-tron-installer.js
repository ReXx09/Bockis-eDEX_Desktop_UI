const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const version = require(path.join(root, 'package.json')).version;
const installer = path.join(dist, `Bockis-eDEX-Desktop-UI-Setup-${version}.exe`);
const payload = `${installer}.payload.exe`;
const blockmap = `${installer}.blockmap`;
const bootstrapSource = path.join(root, 'build', 'tron_bootstrap.cs');
const icon = path.join(root, 'build', 'icon.ico');
const cscCandidates = [
  path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(process.env.SystemRoot, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
];
const csc = cscCandidates.find(candidate => fs.existsSync(candidate));

if (!fs.existsSync(installer)) throw new Error(`NSIS installer not found: ${installer}`);
if (!csc) throw new Error('csc.exe (.NET Framework 4) not found');

fs.renameSync(installer, payload);
try {
  const args = [
    '/nologo',
    '/target:exe',
    '/optimize+',
    `/out:${installer}`,
    `/resource:${payload},TRON_PAYLOAD.exe`,
    '/reference:System.dll',
    bootstrapSource
  ];
  if (fs.existsSync(icon)) args.unshift(`/win32icon:${icon}`);

  const result = spawnSync(csc, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`csc failed with exit code ${result.status}`);
  if (fs.existsSync(blockmap)) fs.unlinkSync(blockmap);
  fs.unlinkSync(payload);
  console.log(`[tron-bootstrap] created ${installer}`);
} catch (error) {
  if (fs.existsSync(installer)) fs.unlinkSync(installer);
  fs.renameSync(payload, installer);
  throw error;
}
