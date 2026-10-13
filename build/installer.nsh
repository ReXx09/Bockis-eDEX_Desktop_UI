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

  ${NSD_CreateLabel} 0 0 100% 18u "eDEX Desktop Organizer - Hinweise und Abhaengigkeiten"
  Pop $0
  ${NSD_CreateLabel} 0 22u 100% 32u "Die Anwendung verwendet transparente, rahmenlose Overlay-Fenster. Dadurch kann die Oberflaeche ueber dem Windows-Desktop liegen und Desktop-Symbole ausblenden."
  Pop $0

  ${NSD_CreateCheckBox} 0 60u 100% 14u "Transparente Overlay-Fenster akzeptieren"
  Pop $EDEXTransparencyNotice
  ${NSD_Check} $EDEXTransparencyNotice

  ${NSD_CreateLabel} 0 82u 100% 14u "Enthaltene bzw. benoetigte Komponenten:"
  Pop $0
  ${NSD_CreateCheckBox} 0 100u 100% 14u "PowerShell / ConPTY - interaktives Shell-Terminal"
  Pop $EDEXConPtyDependency
  ${NSD_Check} $EDEXConPtyDependency
  ${NSD_SetState} $EDEXConPtyDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 118u 100% 14u "xterm.js - Terminaldarstellung"
  Pop $EDEXXtermDependency
  ${NSD_Check} $EDEXXtermDependency
  ${NSD_SetState} $EDEXXtermDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 136u 100% 14u "node-pty - native Windows-Terminalanbindung"
  Pop $EDEXNativeDependency
  ${NSD_Check} $EDEXNativeDependency
  ${NSD_SetState} $EDEXNativeDependency ${BST_INDETERMINATE}

  ${NSD_CreateCheckBox} 0 154u 100% 14u "Open-Meteo - optionale Wetterdaten ueber Internet"
  Pop $EDEXNetworkDependency
  ${NSD_Check} $EDEXNetworkDependency

  ${NSD_CreateLabel} 0 178u 100% 24u "Visual Studio Build Tools, Node.js und npm werden auf dem Zielrechner nicht benoetigt. Die benoetigten Laufzeitkomponenten werden mit der Anwendung installiert."
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
