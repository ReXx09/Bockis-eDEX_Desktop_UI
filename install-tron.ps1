[CmdletBinding()]
param(
    [string]$InstallerPath,
    [switch]$NoElevation
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Bockis-eDEX :: TRON INSTALL TERMINAL'

$green = 'DarkCyan'
$bright = 'Cyan'
$dim = 'DarkGray'
$warn = 'Yellow'
$red = 'Red'

function Write-Tron([string]$Text = '', [string]$Color = $green) {
    Write-Host $Text -ForegroundColor $Color
}

function Write-Step([string]$Text) {
    Write-Host ('  [ OK ] ' + $Text) -ForegroundColor $green
}

function Stop-Tron([string]$Text) {
    Write-Host ''
    Write-Host ('  [FAIL] ' + $Text) -ForegroundColor $red
    Write-Host ''
    Read-Host 'Press Enter to close' | Out-Null
    exit 1
}

Clear-Host
Write-Tron '============================================================' $bright
Write-Tron '  B O C K I S - e D E X   D E S K T O P   U I' $bright
Write-Tron '  T R O N   I N S T A L L   T E R M I N A L' $bright
Write-Tron '============================================================' $bright
Write-Tron '' $dim
Write-Tron '  [BOOT] Initializing installation sequence ...' $green
Write-Tron ('  [BOOT] Host: ' + $env:COMPUTERNAME) $dim
Write-Tron ('  [BOOT] User: ' + $env:USERNAME) $dim
Write-Tron ('  [BOOT] Time: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) $dim
Write-Tron '' $dim

if (-not $InstallerPath) {
    $candidates = @(
        (Join-Path $PSScriptRoot 'dist\Bockis-eDEX-Desktop-UI-Setup-*.exe'),
        (Join-Path $PSScriptRoot 'Bockis-eDEX-Desktop-UI-Setup-*.exe')
    )
    $InstallerPath = Get-ChildItem $candidates -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $InstallerPath -or -not (Test-Path -LiteralPath $InstallerPath)) {
    Stop-Tron 'Kein Electron-Installer gefunden. Erst "npm run dist" ausfuehren oder -InstallerPath angeben.'
}

$InstallerPath = (Resolve-Path -LiteralPath $InstallerPath).Path
Write-Step ('Installer: ' + [IO.Path]::GetFileName($InstallerPath))
Write-Step ('Groesse:   {0:N1} MB' -f ((Get-Item $InstallerPath).Length / 1MB))

$answer = Read-Host '  [CONF] Installation starten? (J/N)'
if ($answer -notmatch '^(j|ja|y|yes)$') {
    Write-Tron '' $dim
    Write-Tron '  [ABORT] Installation cancelled by operator.' $warn
    exit 0
}

Write-Tron '' $dim
Write-Tron '  [LINK] Opening NSIS installation channel ...' $green

try {
    $arguments = @{
        FilePath = $InstallerPath
        Wait = $true
        PassThru = $true
    }
    if (-not $NoElevation) {
        $arguments.Verb = 'RunAs'
    }
    $process = Start-Process @arguments
    if ($process.ExitCode -ne 0) {
        Stop-Tron ('NSIS-Installer beendet mit Exit-Code ' + $process.ExitCode + '.')
    }
} catch {
    Stop-Tron $_.Exception.Message
}

Write-Tron '' $dim
Write-Tron '  [DONE] Bockis-eDEX Desktop UI installation complete.' $bright
Write-Tron '  [DONE] TRON interface ready.' $bright
Write-Tron '' $dim
Read-Host 'Press Enter to close' | Out-Null
