!include "MUI2.nsh"
!include "nsDialogs.nsh"

Var EDEXTransparencyNotice
Var EDEXConPtyDependency
Var EDEXXtermDependency
Var EDEXNativeDependency
Var EDEXNetworkDependency
Var EDEXRainmeter

Page custom EDEXComponentsPageCreate EDEXComponentsPageLeave

Function EDEXComponentsPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 14u "Bockis-eDEX Desktop UI - Hinweise und Abhaengigkeiten"
  Pop $0
  ${NSD_CreateLabel} 0 18u 100% 24u "Die Anwendung verwendet transparente Overlay-Fenster. Die Oberflaeche kann dadurch ueber dem Windows-Desktop liegen und Desktop-Symbole ausblenden."
  Pop $0

  ${NSD_CreateCheckBox} 0 46u 100% 12u "Transparente Overlay-Fenster akzeptieren"
  Pop $EDEXTransparencyNotice
  ${NSD_Check} $EDEXTransparencyNotice

  ${NSD_CreateLabel} 0 64u 100% 12u "Enthaltene bzw. benoetigte Komponenten:"
  Pop $0
  ${NSD_CreateCheckBox} 0 78u 100% 12u "PowerShell / ConPTY - interaktives Shell-Terminal"
  Pop $EDEXConPtyDependency
  ${NSD_Check} $EDEXConPtyDependency
  ${NSD_SetState} $EDEXConPtyDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 94u 100% 12u "xterm.js - Terminaldarstellung"
  Pop $EDEXXtermDependency
  ${NSD_Check} $EDEXXtermDependency
  ${NSD_SetState} $EDEXXtermDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 110u 100% 12u "node-pty - native Windows-Terminalanbindung"
  Pop $EDEXNativeDependency
  ${NSD_Check} $EDEXNativeDependency
  ${NSD_SetState} $EDEXNativeDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 126u 100% 12u "Open-Meteo - optionale Wetterdaten ueber Internet"
  Pop $EDEXNetworkDependency
  ${NSD_Check} $EDEXNetworkDependency

  ${NSD_CreateCheckBox} 0 142u 100% 12u "Rainmeter installieren (optionales Desktop-HUD)"
  Pop $EDEXRainmeter
  ${NSD_Check} $EDEXRainmeter

  ${NSD_CreateLabel} 0 160u 100% 24u "Visual Studio Build Tools, Node.js und npm werden auf dem Zielrechner nicht benoetigt. Die Laufzeitkomponenten werden mit der Anwendung installiert. Rainmeter wird nur bei Auswahl dieser Option installiert."
  Pop $0

  nsDialogs::Show
FunctionEnd

!macro customInstall
  SetShellVarContext current
  CreateShortCut "$DESKTOP\Bockis-eDEX Desktop UI.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\start-tron.ps1" -AppPath "$INSTDIR\Bockis-eDEX Desktop UI.exe"' "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  CreateDirectory "$SMPROGRAMS\Bockis-eDEX Desktop UI"
  CreateShortCut "$SMPROGRAMS\Bockis-eDEX Desktop UI\Bockis-eDEX Desktop UI.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\start-tron.ps1" -AppPath "$INSTDIR\Bockis-eDEX Desktop UI.exe"' "$INSTDIR\Bockis-eDEX Desktop UI.exe" 0 SW_SHOWNORMAL
  ${If} ${Silent}
    ReadEnvStr $0 EDEX_INSTALL_RAINMETER
    ${If} $0 == "1"
      File /oname=$PLUGINSDIR\Rainmeter-Setup.exe "${BUILD_RESOURCES_DIR}\Rainmeter-Setup.exe"
      ExecWait '"$PLUGINSDIR\Rainmeter-Setup.exe" /S'
    ${EndIf}
  ${Else}
    ${If} $EDEXRainmeter == ${BST_CHECKED}
      File /oname=$PLUGINSDIR\Rainmeter-Setup.exe "${BUILD_RESOURCES_DIR}\Rainmeter-Setup.exe"
      ExecWait '"$PLUGINSDIR\Rainmeter-Setup.exe" /S'
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\Bockis-eDEX Desktop UI.lnk"
  Delete "$SMPROGRAMS\Bockis-eDEX Desktop UI\Bockis-eDEX Desktop UI.lnk"
  RMDir "$SMPROGRAMS\Bockis-eDEX Desktop UI"
!macroend

Function EDEXComponentsPageLeave
  ${NSD_GetState} $EDEXTransparencyNotice $0
  ${If} $0 == ${BST_UNCHECKED}
    MessageBox MB_ICONEXCLAMATION|MB_OK "Bitte bestaetigen Sie den Hinweis zu den transparenten Overlay-Fenstern."
    Abort
  ${EndIf}
FunctionEnd
