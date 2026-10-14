!include "MUI2.nsh"
!include "nsDialogs.nsh"

Var EDEXTransparencyNotice
Var EDEXConPtyDependency
Var EDEXXtermDependency
Var EDEXNativeDependency
Var EDEXNetworkDependency

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

  ${NSD_CreateLabel} 0 146u 100% 18u "Visual Studio Build Tools, Node.js und npm werden auf dem Zielrechner nicht benoetigt. Die Laufzeitkomponenten werden mit der Anwendung installiert."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function EDEXComponentsPageLeave
  ${NSD_GetState} $EDEXTransparencyNotice $0
  ${If} $0 == ${BST_UNCHECKED}
    MessageBox MB_ICONEXCLAMATION|MB_OK "Bitte bestaetigen Sie den Hinweis zu den transparenten Overlay-Fenstern."
    Abort
  ${EndIf}
FunctionEnd
