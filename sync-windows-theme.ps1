[CmdletBinding()]
param(
    [string]$StatePath = (Join-Path $env:APPDATA 'Bockis-eDEX Desktop UI\windows-theme-state.json')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $StatePath)) {
    Write-Output 'SYNC_SKIPPED_NO_STATE'
    exit 2
}

try {
    $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    $mode = [string]$state.mode
    if ($mode -notin @('subtle', 'strong')) {
        Write-Output 'SYNC_SKIPPED_MODE_OFF'
        exit 2
    }

    $r = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.r))
    $g = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.g))
    $b = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.b))
    $accent = ('0xFF{0:X2}{1:X2}{2:X2}' -f $b, $g, $r)
    $dwm = 'HKCU\Software\Microsoft\Windows\DWM'
    $personalize = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'

    & reg.exe ADD $dwm /v AccentColor /t REG_DWORD /d $accent /f *> $null
    & reg.exe ADD $dwm /v ColorPrevalence /t REG_DWORD /d 1 /f *> $null
    if ($mode -eq 'strong') {
        & reg.exe ADD $personalize /v AppsUseLightTheme /t REG_DWORD /d 0 /f *> $null
        & reg.exe ADD $personalize /v SystemUsesLightTheme /t REG_DWORD /d 0 /f *> $null
    }
    & rundll32.exe user32.dll,UpdatePerUserSystemParameters *> $null
    Write-Output 'SYNC_APPLIED'
    exit 0
} catch {
    Write-Output ('SYNC_FAILED ' + $_.Exception.Message)
    exit 1
}
