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
      ${If} ${Silent}
        ReadEnvStr $0 EDEX_WINDHAWK_CONSENT
        ${If} $0 != "1"
          Abort "Windhawk is required by this Bockis-eDEX installer. Run the interactive setup and approve Windhawk installation."
        ${EndIf}
      ${Else}
        MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "BOCKIS Windows Style Integration benötigt Windhawk.$\r$\n$\r$\nWindhawk kann Windows-Programme mit Mods anpassen. Bockis-eDEX installiert keine Mods und ändert keine bestehenden Windhawk-Einstellungen. Die offizielle stabile Windhawk-Installation wird nur nach deiner Zustimmung gestartet.$\r$\n$\r$\nWenn du Nein wählst, wird auch die Bockis-eDEX-Installation abgebrochen.$\r$\n$\r$\nWindhawk jetzt installieren?" IDYES installWindhawk
        Abort "Windhawk installation was declined."
        installWindhawk:
          SetOutPath "$PLUGINSDIR"
          File /oname=Windhawk-Setup.exe "${BUILD_RESOURCES_DIR}\Windhawk-Setup.exe"
          ExecWait '"$PLUGINSDIR\Windhawk-Setup.exe"' $R0
          ${If} $R0 != 0
            Abort "Windhawk setup did not complete successfully. Bockis-eDEX was not installed."
          ${EndIf}
          Call DetectWindhawk
          ${If} $WindhawkInstalled != "1"
            Abort "Windhawk was not detected after setup. Bockis-eDEX was not installed."
          ${EndIf}
      ${EndIf}
    ${EndIf}
  !endif
!macroend

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
