[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AppPath,
    [switch]$NoSound
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Bockis-eDEX :: TRON SYSTEM CONSOLE'
$Host.UI.RawUI.ForegroundColor = 'DarkCyan'
$Host.UI.RawUI.BackgroundColor = 'Black'

function Write-Tron([string]$Text = '', [ConsoleColor]$Color = [ConsoleColor]::DarkCyan) {
    Write-Host $Text -ForegroundColor $Color
}

function Beep-Tron([int]$Frequency, [int]$Duration) {
    if ($NoSound) { return }
    try { [Console]::Beep($Frequency, $Duration) } catch { }
}

function Pause-Tron([string]$Message) {
    Write-Tron '' ([ConsoleColor]::DarkGray)
    Read-Host $Message | Out-Null
}

Clear-Host
Write-Tron '============================================================' ([ConsoleColor]::Cyan)
Write-Tron '  B O C K I S - e D E X   D E S K T O P   U I' ([ConsoleColor]::Cyan)
Write-Tron '  T R O N   S Y S T E M   C O N S O L E' ([ConsoleColor]::Cyan)
Write-Tron '============================================================' ([ConsoleColor]::Cyan)
Write-Tron '' ([ConsoleColor]::DarkGray)

Beep-Tron 440 80
Write-Tron '  [BOOT] Power management online'
Start-Sleep -Milliseconds 100
Beep-Tron 660 80
Write-Tron '  [CORE] Electron runtime detected'
Start-Sleep -Milliseconds 100
Beep-Tron 880 110
Write-Tron '  [LINK] IPC channel ready'

Write-Tron '  [THEME] Synchronizing Windows color bridge ...' ([ConsoleColor]::Cyan)
$themeBridge = Join-Path $PSScriptRoot 'sync-windows-theme.ps1'
if (Test-Path -LiteralPath $themeBridge) {
    $themeResult = & powershell.exe -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File $themeBridge
    if ($LASTEXITCODE -eq 0 -and ($themeResult -contains 'SYNC_APPLIED')) {
        Write-Tron '  [ OK ] Windows theme state applied' ([ConsoleColor]::Cyan)
    } else {
        Write-Tron '  [WARN] Windows theme state was not applied; GUI will retry' ([ConsoleColor]::Yellow)
    }
} else {
    Write-Tron '  [WARN] Windows theme bridge not installed' ([ConsoleColor]::Yellow)
}
Start-Sleep -Milliseconds 180

if (-not (Test-Path -LiteralPath $AppPath)) {
    Write-Tron '' ([ConsoleColor]::DarkGray)
    Write-Tron ('  [FAIL] GUI nicht gefunden: ' + $AppPath) ([ConsoleColor]::Red)
    Pause-Tron 'Press Enter to close'
    exit 1
}

$app = (Resolve-Path -LiteralPath $AppPath).Path
Write-Tron ('  [EXEC] ' + [IO.Path]::GetFileName($app)) ([ConsoleColor]::Cyan)
Write-Tron '  [HUD ] Starting desktop interface ...'
Write-Tron '' ([ConsoleColor]::DarkGray)

try {
    $runtimeLog = Join-Path $env:TEMP ('Bockis-eDEX-runtime-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    $runtimeErrorLog = $runtimeLog + '.err'
    Write-Tron ('  [LOG ] Runtime output: ' + $runtimeLog) ([ConsoleColor]::DarkGray)
    $process = Start-Process -FilePath $app -WorkingDirectory (Split-Path $app) -PassThru `
        -RedirectStandardOutput $runtimeLog -RedirectStandardError $runtimeErrorLog
    Write-Tron '  [ OK ] GUI process active' ([ConsoleColor]::Cyan)
    Write-Tron '  [WAIT] Console remains linked until GUI shutdown' ([ConsoleColor]::DarkGray)
    Wait-Process -Id $process.Id
    if (Test-Path -LiteralPath $runtimeLog) {
        Get-Content -LiteralPath $runtimeLog -Tail 80 | ForEach-Object {
            Write-Tron ('  [GUI ] ' + $_) ([ConsoleColor]::DarkGray)
        }
    }
    if (Test-Path -LiteralPath $runtimeErrorLog) {
        Get-Content -LiteralPath $runtimeErrorLog -Tail 80 | ForEach-Object {
            Write-Tron ('  [ERR ] ' + $_) ([ConsoleColor]::Red)
        }
    }
} catch {
    Write-Tron ('  [FAIL] ' + $_.Exception.Message) ([ConsoleColor]::Red)
    Pause-Tron 'Press Enter to close'
    exit 1
}

Beep-Tron 660 80
Write-Tron '' ([ConsoleColor]::DarkGray)
if ($process.ExitCode -eq 0) {
    Write-Tron '  [HALT] GUI process ended with exit code 0' ([ConsoleColor]::Yellow)
} else {
    Write-Tron ('  [FAIL] GUI process ended with exit code ' + $process.ExitCode) ([ConsoleColor]::Red)
}
Write-Tron '  [LOG ] The GUI closed before the TRON console was closed.' ([ConsoleColor]::DarkYellow)
Pause-Tron 'Press Enter to close'
