!include "MUI2.nsh"

!ifndef BUILD_UNINSTALLER
Var WindhawkInstalled

Function DetectWindhawk
  StrCpy $WindhawkInstalled "0"
  SetRegView 64
  StrCpy $R0 0
windhawk_hkcu_64_loop:
  EnumRegKey $R1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" windhawk_hklm_64
  ReadRegStr $R2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCpy $R3 $R2 8
  StrCmp $R3 "Windhawk" windhawk_found
  IntOp $R0 $R0 + 1
  Goto windhawk_hkcu_64_loop
windhawk_hklm_64:
  StrCpy $R0 0
windhawk_hklm_64_loop:
  EnumRegKey $R1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" windhawk_hkcu_32
  ReadRegStr $R2 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCpy $R3 $R2 8
  StrCmp $R3 "Windhawk" windhawk_found
  IntOp $R0 $R0 + 1
  Goto windhawk_hklm_64_loop
windhawk_hkcu_32:
  SetRegView 32
  StrCpy $R0 0
windhawk_hkcu_32_loop:
  EnumRegKey $R1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" windhawk_hklm_32
  ReadRegStr $R2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCpy $R3 $R2 8
  StrCmp $R3 "Windhawk" windhawk_found
  IntOp $R0 $R0 + 1
  Goto windhawk_hkcu_32_loop
windhawk_hklm_32:
  StrCpy $R0 0
windhawk_hklm_32_loop:
  EnumRegKey $R1 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall" $R0
  StrCmp $R1 "" windhawk_check_known_paths
  ReadRegStr $R2 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\$R1" "DisplayName"
  StrCpy $R3 $R2 8
  StrCmp $R3 "Windhawk" windhawk_found
  IntOp $R0 $R0 + 1
  Goto windhawk_hklm_32_loop
windhawk_check_known_paths:
  IfFileExists "$LOCALAPPDATA\Programs\Windhawk\windhawk.exe" windhawk_found
  IfFileExists "$PROGRAMFILES64\Windhawk\windhawk.exe" windhawk_found
  IfFileExists "$PROGRAMFILES32\Windhawk\windhawk.exe" windhawk_found
  Goto windhawk_detection_done
windhawk_found:
  StrCpy $WindhawkInstalled "1"
windhawk_detection_done:
  SetRegView 64
FunctionEnd
!endif

!macro customInit
  !ifndef BUILD_UNINSTALLER
    Call DetectWindhawk
    ${If} $WindhawkInstalled != "1"
      ReadEnvStr $0 EDEX_INSTALL_WINDHAWK
      ${If} $0 == "1"
        SetOutPath "$PLUGINSDIR"
        File /oname=Windhawk-Setup.exe "${BUILD_RESOURCES_DIR}\Windhawk-Setup.exe"
        ReadEnvStr $1 EDEX_WINDHAWK_SILENT
        ${If} $1 == "1"
          ; Windhawk v1.7.3 supports /S /STANDARD for an unattended standard setup.
          ; Selection and confirmation are handled by the BOCKIS bootstrapper.
          ExecWait '"$PLUGINSDIR\Windhawk-Setup.exe" /S /STANDARD' $R0
        ${Else}
          ExecWait '"$PLUGINSDIR\Windhawk-Setup.exe"' $R0
        ${EndIf}
        ${If} $R0 != 0
          MessageBox MB_OK|MB_ICONEXCLAMATION "Windhawk wurde nicht erfolgreich installiert. Bockis-eDEX wird ohne Windows-Styling-Erweiterung installiert."
        ${Else}
          Call DetectWindhawk
          ${If} $WindhawkInstalled != "1"
            MessageBox MB_OK|MB_ICONEXCLAMATION "Windhawk konnte nach der Installation nicht erkannt werden. Die eDEX-Installation wird fortgesetzt."
          ${EndIf}
        ${EndIf}
      ${EndIf}
    ${EndIf}
  !endif
!macroend

!macro customInstall
  SetShellVarContext current
  ReadEnvStr $0 EDEX_CREATE_DESKTOP_SHORTCUT
  ${If} $0 != "0"
    CreateShortCut "$DESKTOP\Bockis-eDEX Desktop UI.lnk" "$INSTDIR\Bockis-eDEX Desktop UI.exe" "" "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  ${EndIf}
  ReadEnvStr $0 EDEX_CREATE_STARTMENU_SHORTCUT
  ${If} $0 != "0"
    CreateDirectory "$SMPROGRAMS\Bockis-eDEX Desktop UI"
    CreateShortCut "$SMPROGRAMS\Bockis-eDEX Desktop UI\Bockis-eDEX Desktop UI.lnk" "$INSTDIR\Bockis-eDEX Desktop UI.exe" "" "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  ${EndIf}
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
    IfSilent pawnIOCheckDone
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
