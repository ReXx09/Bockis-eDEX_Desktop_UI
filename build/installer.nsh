!include "MUI2.nsh"

!macro customInstall
  SetShellVarContext current
  CreateShortCut "$DESKTOP\Bockis-eDEX Desktop UI.lnk" "$INSTDIR\Bockis-eDEX Desktop UI.exe" "" "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  CreateDirectory "$SMPROGRAMS\Bockis-eDEX Desktop UI"
  CreateShortCut "$SMPROGRAMS\Bockis-eDEX Desktop UI\Bockis-eDEX Desktop UI.lnk" "$INSTDIR\Bockis-eDEX Desktop UI.exe" "" "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  ReadEnvStr $0 EDEX_INSTALL_RAINMETER
  ${If} $0 == "1"
    File /oname=$PLUGINSDIR\Rainmeter-Setup.exe "${BUILD_RESOURCES_DIR}\Rainmeter-Setup.exe"
    ExecWait '"$PLUGINSDIR\Rainmeter-Setup.exe" /S'
  ${EndIf}
  SetRegView 64
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO" "DisplayName"
  ${If} $0 == ""
    SetRegView 32
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO" "DisplayName"
  ${EndIf}
  SetRegView 64
  ${If} $0 == ""
    MessageBox MB_YESNO|MB_ICONQUESTION "PawnIO ist nicht installiert. Ohne den Treiber sind möglicherweise nicht alle Hardware-Sensoren verfügbar.$\r$\n$\r$\nMöchtest du die offizielle PawnIO-Downloadseite öffnen? Bockis-eDEX installiert keine Kernel-Treiber." IDYES openPawnIOPage
    Goto pawnIOCheckDone
    openPawnIOPage:
      ExecShell "open" "https://github.com/namazso/PawnIO/releases"
    pawnIOCheckDone:
  ${EndIf}
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\Bockis-eDEX Desktop UI.lnk"
  Delete "$SMPROGRAMS\Bockis-eDEX Desktop UI\Bockis-eDEX Desktop UI.lnk"
  RMDir "$SMPROGRAMS\Bockis-eDEX Desktop UI"
!macroend
