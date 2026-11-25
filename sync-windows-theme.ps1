[CmdletBinding()]
param(
    [string]$StatePath = (Join-Path $env:APPDATA 'Bockis-eDEX Desktop UI\windows-theme-state.json')
)

$ErrorActionPreference = 'Stop'
$dwm = 'HKCU\Software\Microsoft\Windows\DWM'
$personalize = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
$explorerAccent = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent'
$explorerAdvanced = 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced'
$features = @{
    accentColor = @{
        Values = @(
            @{ Key = $dwm; Name = 'AccentColor'; Value = 'accent' },
            @{ Key = $dwm; Name = 'ColorizationColor'; Value = 'accent' },
            @{ Key = $explorerAccent; Name = 'AccentColorMenu'; Value = 'accent' },
            @{ Key = $explorerAccent; Name = 'StartColorMenu'; Value = 'accent' }
        )
    }
    appsDarkMode = @{
        Values = @(@{ Key = $personalize; Name = 'AppsUseLightTheme'; Value = 0 })
    }
    systemDarkMode = @{
        Values = @(@{ Key = $personalize; Name = 'SystemUsesLightTheme'; Value = 0 })
    }
    startTaskbarAccent = @{
        Values = @(@{ Key = $personalize; Name = 'ColorPrevalence'; Value = 1 })
    }
    windowTitleAccent = @{
        Values = @(@{ Key = $dwm; Name = 'ColorPrevalence'; Value = 1 })
    }
    transparencyEffects = @{
        Values = @(@{ Key = $personalize; Name = 'EnableTransparency'; Value = 1 })
    }
    taskbarAlignment = @{
        Values = @(@{ Key = $explorerAdvanced; Name = 'TaskbarAl'; Value = 'taskbarAlignment' })
    }
    taskbarSize = @{
        Values = @(@{ Key = $explorerAdvanced; Name = 'TaskbarSi'; Value = 'taskbarSize' })
    }
}

function Get-RegistrySubKey([string]$Key) {
    if (-not $Key.StartsWith('HKCU\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsupported registry root: $Key"
    }
    return $Key.Substring(5)
}

function Get-DwordSnapshot([string]$Key, [string]$Name) {
    $subKey = Get-RegistrySubKey $Key
    $registryKey = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($subKey, $false)
    if (-not $registryKey) {
        return @{ Key = $Key; Name = $Name; Exists = $false; Data = 0 }
    }
    try {
        if ($registryKey.GetValueNames() -notcontains $Name) {
            return @{ Key = $Key; Name = $Name; Exists = $false; Data = 0 }
        }
        if ($registryKey.GetValueKind($Name) -ne [Microsoft.Win32.RegistryValueKind]::DWord) {
            throw "Unsupported registry type for $Name"
        }
        $data = [uint32](([long]$registryKey.GetValue($Name)) -band 0xffffffffL)
        return @{ Key = $Key; Name = $Name; Exists = $true; Data = $data }
    } finally {
        $registryKey.Dispose()
    }
}

function Set-Dword([string]$Key, [string]$Name, [uint32]$Data) {
    $hex = '0x{0:X8}' -f $Data
    & reg.exe ADD $Key /v $Name /t REG_DWORD /d $hex /f *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Registry write failed: $Key\$Name"
    }
}

function Restore-DwordSnapshot($Snapshot) {
    if ($Snapshot.Exists) {
        Set-Dword $Snapshot.Key $Snapshot.Name ([uint32]$Snapshot.Data)
        return
    }
    $current = Get-DwordSnapshot $Snapshot.Key $Snapshot.Name
    if ($current.Exists) {
        & reg.exe DELETE $Snapshot.Key /v $Snapshot.Name /f *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Registry delete failed: $($Snapshot.Key)\$($Snapshot.Name)"
        }
    }
}

if (-not (Test-Path -LiteralPath $StatePath)) {
    Write-Output 'SYNC_SKIPPED_NO_STATE'
    exit 2
}

try {
    $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    $enabledFeatures = @{}
    $legacyFeatureState = $false
    if ($state.features) {
        $savedFeatureNames = @($state.features.PSObject.Properties.Name)
        $legacyFeatureState = ($savedFeatureNames -contains 'taskbarWindowAccent') -and -not ($savedFeatureNames -contains 'startTaskbarAccent') -and -not ($savedFeatureNames -contains 'windowTitleAccent')
        foreach ($featureId in $features.Keys) {
            if ($savedFeatureNames -contains $featureId) {
                $enabledFeatures[$featureId] = [bool]$state.features.$featureId
            } elseif ($featureId -eq 'windowTitleAccent' -and $savedFeatureNames -contains 'taskbarWindowAccent') {
                $enabledFeatures[$featureId] = [bool]$state.features.taskbarWindowAccent
            } else {
                $enabledFeatures[$featureId] = $false
            }
        }
    } elseif ($state.mode -eq 'strong' -or $state.mode -eq 'subtle') {
        $legacyFeatureState = $true
        $enabledFeatures.accentColor = $true
        $enabledFeatures.windowTitleAccent = $true
        $enabledFeatures.appsDarkMode = $state.mode -eq 'strong'
        $enabledFeatures.systemDarkMode = $state.mode -eq 'strong'
    }

    if (-not ($enabledFeatures.Values -contains $true)) {
        Write-Output 'SYNC_SKIPPED_MODE_OFF'
        exit 2
    }

    $r = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.r))
    $g = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.g))
    $b = [Math]::Max(0, [Math]::Min(255, [int]$state.rgb.b))
    $accent = [uint32]::Parse(('FF{0:X2}{1:X2}{2:X2}' -f $b, $g, $r), [Globalization.NumberStyles]::HexNumber)
    $options = $state.options
    $operations = [System.Collections.Generic.List[object]]::new()

    foreach ($featureId in $features.Keys) {
        if (-not $enabledFeatures[$featureId]) { continue }
        $featureValues = $features[$featureId].Values
        if ($legacyFeatureState -and $featureId -eq 'accentColor') {
            $featureValues = @($featureValues | Where-Object { $_.Key -eq $dwm -and $_.Name -eq 'AccentColor' })
        }
        foreach ($item in $featureValues) {
            $value = $item.Value
            if ($value -eq 'accent') { $value = $accent }
            if ($value -eq 'taskbarAlignment') {
                $value = if ($options.taskbarAlignment -eq 'left') { 0 } else { 1 }
            }
            if ($value -eq 'taskbarSize') {
                $value = switch ($options.taskbarSize) {
                    'small' { 0 }
                    'large' { 2 }
                    default { 1 }
                }
            }
            $operations.Add(@{ Key = $item.Key; Name = $item.Name; Data = [uint32]$value })
        }
    }

    $snapshots = @{}
    foreach ($operation in $operations) {
        $id = ('{0}|{1}' -f $operation.Key, $operation.Name).ToLowerInvariant()
        if (-not $snapshots.ContainsKey($id)) {
            $snapshots[$id] = Get-DwordSnapshot $operation.Key $operation.Name
        }
    }

    try {
        foreach ($operation in $operations) {
            Set-Dword $operation.Key $operation.Name ([uint32]$operation.Data)
        }
    } catch {
        $applyError = $_.Exception.Message
        $rollbackFailures = [System.Collections.Generic.List[string]]::new()
        foreach ($snapshot in @($snapshots.Values)) {
            try {
                Restore-DwordSnapshot $snapshot
            } catch {
                $rollbackFailures.Add($_.Exception.Message)
            }
        }
        if ($rollbackFailures.Count -gt 0) {
            throw "Registry sync failed: $applyError; rollback failed: $($rollbackFailures -join '; ')"
        }
        throw "Registry sync failed and was rolled back: $applyError"
    }

    & rundll32.exe user32.dll,UpdatePerUserSystemParameters *> $null
    Write-Output 'SYNC_APPLIED'
    exit 0
} catch {
    Write-Output ('SYNC_FAILED ' + $_.Exception.Message)
    exit 1
}
