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
    Write-Tron '' [ConsoleColor]::DarkGray
    Read-Host $Message | Out-Null
}

Clear-Host
Write-Tron '============================================================' ([ConsoleColor]::Cyan)
Write-Tron '  B O C K I S - e D E X   D E S K T O P   U I' ([ConsoleColor]::Cyan)
Write-Tron '  T R O N   S Y S T E M   C O N S O L E' ([ConsoleColor]::Cyan)
Write-Tron '============================================================' ([ConsoleColor]::Cyan)
Write-Tron '' [ConsoleColor]::DarkGray

Beep-Tron 440 80
Write-Tron '  [BOOT] Power management online'
Start-Sleep -Milliseconds 100
Beep-Tron 660 80
Write-Tron '  [CORE] Electron runtime detected'
Start-Sleep -Milliseconds 100
Beep-Tron 880 110
Write-Tron '  [LINK] IPC channel ready'

if (-not (Test-Path -LiteralPath $AppPath)) {
    Write-Tron '' [ConsoleColor]::DarkGray
    Write-Tron ('  [FAIL] GUI nicht gefunden: ' + $AppPath) [ConsoleColor]::Red
    Pause-Tron 'Press Enter to close'
    exit 1
}

$app = (Resolve-Path -LiteralPath $AppPath).Path
Write-Tron ('  [EXEC] ' + [IO.Path]::GetFileName($app)) [ConsoleColor]::Cyan
Write-Tron '  [HUD ] Starting desktop interface ...'
Write-Tron '' [ConsoleColor]::DarkGray

try {
    $process = Start-Process -FilePath $app -WorkingDirectory (Split-Path $app) -PassThru
    Write-Tron '  [ OK ] GUI process active' [ConsoleColor]::Cyan
    Write-Tron '  [WAIT] Console remains linked until GUI shutdown' [ConsoleColor]::DarkGray
    Wait-Process -Id $process.Id
} catch {
    Write-Tron ('  [FAIL] ' + $_.Exception.Message) [ConsoleColor]::Red
    Pause-Tron 'Press Enter to close'
    exit 1
}

Beep-Tron 660 80
Write-Tron '' [ConsoleColor]::DarkGray
Write-Tron '  [HALT] GUI process ended' [ConsoleColor]::Cyan
Write-Tron '  [DONE] TRON system console shutting down' [ConsoleColor]::Cyan
Start-Sleep -Milliseconds 350
