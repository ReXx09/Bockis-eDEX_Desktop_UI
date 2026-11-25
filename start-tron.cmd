@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tron.ps1" -AppPath "%~dp0Bockis-eDEX Desktop UI.exe" %*
endlocal
