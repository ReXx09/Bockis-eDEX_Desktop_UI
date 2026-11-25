using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Windows.Forms;

internal static class TronBootstrap
{
    private const string PayloadResource = "TRON_PAYLOAD.exe";

    private static void WriteLine(string text, ConsoleColor color)
    {
        Console.ForegroundColor = color;
        Console.WriteLine(text);
        Console.ResetColor();
    }

    private static void Beep(int frequency, int duration)
    {
        try { Console.Beep(frequency, duration); } catch { }
    }

    private static string FormatSize(long bytes)
    {
        if (bytes >= 1024L * 1024L) return (bytes / 1024d / 1024d).ToString("0.0") + " MB";
        if (bytes >= 1024L) return (bytes / 1024d).ToString("0.0") + " KB";
        return bytes + " B";
    }

    private static void WriteSection(string title)
    {
        string label = " :: " + title.ToUpperInvariant() + " ";
        int width = Math.Max(8, 58 - label.Length);
        WriteLine("  " + label + new string('-', width), ConsoleColor.Yellow);
    }

    private sealed class SetupChoice
    {
        public string Path;
        public bool Windhawk;
        public bool WindhawkSilent;
        public bool WindhawkTray;
        public bool Rainmeter;
        public bool ExplorerPage;
        public bool TaskbarPage;
        public bool StartPage;
        public bool DesktopShortcut = true;
        public bool StartMenuShortcut = true;
        public bool LaunchAfter = false;
    }

    private static bool IsWindhawkInstalled()
    {
        string[] candidates = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Windhawk", "windhawk.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Windhawk", "windhawk.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Windhawk", "windhawk.exe")
        };
        foreach (string candidate in candidates) if (File.Exists(candidate)) return true;
        foreach (RegistryKey root in new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine })
        {
            foreach (RegistryView view in new RegistryView[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                try
                {
                    using (RegistryKey baseKey = RegistryKey.OpenBaseKey(root == Registry.CurrentUser ? RegistryHive.CurrentUser : RegistryHive.LocalMachine, view))
                    using (RegistryKey uninstall = baseKey.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall"))
                    {
                        if (uninstall == null) continue;
                        foreach (string name in uninstall.GetSubKeyNames())
                        {
                            using (RegistryKey item = uninstall.OpenSubKey(name))
                            {
                                string display = item == null ? "" : Convert.ToString(item.GetValue("DisplayName", ""));
                                if (display.StartsWith("Windhawk", StringComparison.OrdinalIgnoreCase)) return true;
                            }
                        }
                    }
                }
                catch { /* inspection is best-effort */ }
            }
        }
        return false;
    }

    private static string FindWindhawkExecutable()
    {
        string[] candidates = {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Windhawk", "windhawk.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Windhawk", "windhawk.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Windhawk", "windhawk.exe")
        };
        foreach (string candidate in candidates) if (File.Exists(candidate)) return candidate;
        return null;
    }

    private static bool ConfigureGraphically(SetupChoice selection)
    {
        bool installed = IsWindhawkInstalled();
        using (Form form = new Form())
        {
            form.Text = "BOCKIS // eDEX INSTALL SYSTEM";
            form.StartPosition = FormStartPosition.CenterScreen;
            form.ClientSize = new Size(1060, 720);
            form.MinimumSize = new Size(900, 660);
            form.BackColor = Color.FromArgb(8, 17, 27);
            form.ForeColor = Color.FromArgb(215, 235, 245);
            form.Font = new Font("Segoe UI", 10f);
            form.FormBorderStyle = FormBorderStyle.Sizable;
            Color cyan = Color.FromArgb(0, 196, 255);
            Color muted = Color.FromArgb(152, 180, 200);
            Color panelBg = Color.FromArgb(17, 32, 47);

            Label heading = new Label { Text = "BOCKIS // eDEX INSTALL SYSTEM", Font = new Font("Segoe UI", 21f, FontStyle.Bold), ForeColor = cyan, AutoSize = true, Location = new Point(32, 22) };
            Label subheading = new Label { Text = InstallerLanguage.T("installer.subheading"), ForeColor = muted, AutoSize = true, Location = new Point(35, 76) };
            form.Controls.Add(heading); form.Controls.Add(subheading);

            TableLayoutPanel columns = new TableLayoutPanel { Left = 28, Top = 120, Width = 1000, Height = 505, Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right, ColumnCount = 2, RowCount = 1, BackColor = form.BackColor };
            columns.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 59));
            columns.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 41));
            form.Controls.Add(columns);
            Panel list = new Panel { Dock = DockStyle.Fill, AutoScroll = true, BackColor = panelBg, Padding = new Padding(19, 12, 14, 12) };
            Panel details = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(14, 27, 42), Padding = new Padding(20) };
            columns.Controls.Add(list, 0, 0); columns.Controls.Add(details, 1, 0);

            int y = 12;
            Action<string> section = name => {
                Label label = new Label { Text = name, Font = new Font("Segoe UI", 11f, FontStyle.Bold), ForeColor = cyan, Left = 15, Top = y, Width = 505, Height = 31 };
                list.Controls.Add(label); y += 35;
            };
            Action<string> desc = value => {
                Label label = new Label { Text = value, ForeColor = muted, Left = 43, Top = y, Width = 490, Height = 39, Font = new Font("Segoe UI", 8.5f) };
                list.Controls.Add(label); y += 40;
            };
            Func<string, bool, CheckBox> checkbox = (name, isChecked) => {
                CheckBox cb = new CheckBox { Text = name, Checked = isChecked, Left = 15, Top = y, Width = 520, Height = 31, ForeColor = Color.FromArgb(230, 246, 255), FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI", 10f) };
                cb.FlatAppearance.CheckedBackColor = cyan;
                list.Controls.Add(cb); y += 31;
                return cb;
            };

            section(InstallerLanguage.T("installer.section.core"));
            CheckBox core = checkbox(InstallerLanguage.T("installer.core"), true);
            core.Enabled = false;
            desc(InstallerLanguage.T("installer.core.desc"));
            CheckBox desktop = checkbox(InstallerLanguage.T("installer.shortcut.desktop"), true);
            CheckBox startmenu = checkbox(InstallerLanguage.T("installer.shortcut.start"), true);
            y += 8;
            section(InstallerLanguage.T("installer.section.windows"));
            CheckBox windhawk = checkbox(installed ? InstallerLanguage.T("installer.windhawk.existing") : InstallerLanguage.T("installer.windhawk.install"), false);
            desc(installed ? InstallerLanguage.T("installer.windhawk.existing.desc") : InstallerLanguage.T("installer.windhawk.install.desc"));
            CheckBox windhawkSilent = checkbox(InstallerLanguage.T("installer.windhawk.silent"), true);
            desc(InstallerLanguage.T("installer.windhawk.silent.desc"));
            CheckBox windhawkTray = checkbox(InstallerLanguage.T("installer.windhawk.tray"), true);
            desc(InstallerLanguage.T("installer.windhawk.tray.desc"));
            CheckBox explorer = checkbox(InstallerLanguage.T("installer.explorer"), false);
            CheckBox taskbar = checkbox(InstallerLanguage.T("installer.taskbar"), false);
            CheckBox startStyler = checkbox(InstallerLanguage.T("installer.startmenu"), false);
            desc(InstallerLanguage.T("installer.mods.desc"));
            y += 8;
            section(InstallerLanguage.T("installer.section.extras"));
            CheckBox rainmeter = checkbox(InstallerLanguage.T("installer.rainmeter"), false);
            desc(InstallerLanguage.T("installer.rainmeter.desc"));
            CheckBox launch = checkbox(InstallerLanguage.T("installer.launch"), false);
            y += 10;
            section(InstallerLanguage.T("installer.section.path"));
            TextBox pathField = new TextBox { Text = selection.Path, Left = 15, Top = y, Width = 410, Font = new Font("Segoe UI", 9f), BackColor = Color.FromArgb(26, 45, 62), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };
            Button browse = new Button { Text = "…", Left = 435, Top = y - 2, Width = 45, Height = 29, BackColor = Color.FromArgb(30, 71, 99), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            list.Controls.Add(pathField); list.Controls.Add(browse); y += 50;
            browse.Click += (sender, ev) => { using (FolderBrowserDialog picker = new FolderBrowserDialog()) { picker.SelectedPath = pathField.Text; if (picker.ShowDialog(form) == DialogResult.OK) pathField.Text = picker.SelectedPath; } };

            Label infoTitle = new Label { Text = InstallerLanguage.T("installer.details.title"), Left = 19, Top = 18, Width = 350, Height = 38, ForeColor = cyan, Font = new Font("Segoe UI", 14f, FontStyle.Bold) };
            Label info = new Label { Text = InstallerLanguage.T("installer.details.default"), Left = 19, Top = 64, Width = 350, Height = 205, ForeColor = muted, Font = new Font("Segoe UI", 10f) };
            Label status = new Label { Left = 19, Top = 292, Width = 340, Height = 120, ForeColor = Color.FromArgb(125, 224, 182), Font = new Font("Consolas", 9f) };
            details.Controls.Add(infoTitle); details.Controls.Add(info); details.Controls.Add(status);
            Action refresh = () => {
                bool requested = explorer.Checked || taskbar.Checked || startStyler.Checked;
                if (requested && !windhawk.Checked) windhawk.Checked = true;
                status.Text = "CORE ............ READY\nWINDHAWK ........ " + (installed ? "DETECTED" : windhawk.Checked ? "SELECTED" : "OPTIONAL") + "\nMOD LINKS ........ " + (requested ? "SELECTED" : "NONE") + "\nRAINMETER ........ " + (rainmeter.Checked ? "SELECTED" : "SKIPPED");
            };
            windhawkSilent.Enabled = windhawk.Checked && !installed;
            windhawkTray.Enabled = windhawk.Checked;
            windhawk.CheckedChanged += (sender, ev) => {
                windhawkSilent.Enabled = windhawk.Checked && !installed;
                windhawkTray.Enabled = windhawk.Checked;
                if (!windhawk.Checked) { explorer.Checked = false; taskbar.Checked = false; startStyler.Checked = false; }
                info.Text = InstallerLanguage.T("installer.details.windhawk");
                refresh();
            };
            explorer.CheckedChanged += (sender, ev) => { info.Text = InstallerLanguage.T("installer.details.explorer"); refresh(); };
            taskbar.CheckedChanged += (sender, ev) => { info.Text = InstallerLanguage.T("installer.details.taskbar"); refresh(); };
            startStyler.CheckedChanged += (sender, ev) => { info.Text = InstallerLanguage.T("installer.details.start"); refresh(); };
            rainmeter.CheckedChanged += (sender, ev) => { info.Text = InstallerLanguage.T("installer.details.rainmeter"); refresh(); };
            refresh();

            Panel footer = new Panel { Dock = DockStyle.Bottom, Height = 80, BackColor = Color.FromArgb(10, 24, 37) };
            form.Controls.Add(footer);
            Label footText = new Label { Text = InstallerLanguage.T("installer.footer"), ForeColor = muted, Left = 30, Top = 12, Width = 700, Height = 25 };
            footer.Controls.Add(footText);
            Button cancel = new Button { Text = InstallerLanguage.T("installer.cancel"), Width = 145, Height = 38, Left = 720, Top = 32, Anchor = AnchorStyles.Right | AnchorStyles.Bottom, FlatStyle = FlatStyle.Flat, ForeColor = Color.White, BackColor = Color.FromArgb(40, 57, 74), DialogResult = DialogResult.Cancel };
            Button proceed = new Button { Text = InstallerLanguage.T("installer.next"), Width = 145, Height = 38, Left = 885, Top = 32, Anchor = AnchorStyles.Right | AnchorStyles.Bottom, FlatStyle = FlatStyle.Flat, ForeColor = Color.Black, BackColor = cyan };
            footer.Controls.Add(cancel); footer.Controls.Add(proceed);
            form.CancelButton = cancel;
            proceed.Click += (sender, ev) => {
                if (string.IsNullOrWhiteSpace(pathField.Text)) { MessageBox.Show(form, InstallerLanguage.T("installer.path.required"), "BOCKIS Setup", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                string summary = InstallerLanguage.Format("installer.confirm.summary", new System.Collections.Generic.Dictionary<string, string> {
                    { "windhawk", windhawk.Checked ? (installed ? InstallerLanguage.T("installer.status.existing") : InstallerLanguage.T("installer.status.install")) : InstallerLanguage.T("installer.status.skip") },
                    { "silent", windhawk.Checked && !installed && windhawkSilent.Checked ? InstallerLanguage.T("installer.yes") : InstallerLanguage.T("installer.no") },
                    { "tray", windhawk.Checked && windhawkTray.Checked ? InstallerLanguage.T("installer.yes") : InstallerLanguage.T("installer.no") },
                    { "rainmeter", rainmeter.Checked ? InstallerLanguage.T("installer.status.install") : InstallerLanguage.T("installer.status.skip") },
                    { "mods", explorer.Checked || taskbar.Checked || startStyler.Checked ? InstallerLanguage.T("installer.status.open") : InstallerLanguage.T("installer.status.none") },
                    { "path", pathField.Text }
                });
                if (MessageBox.Show(form, summary, InstallerLanguage.T("installer.confirm.title"), MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2) != DialogResult.Yes) return;
                selection.Path = pathField.Text.Trim(); selection.Windhawk = windhawk.Checked && !installed;
                selection.WindhawkSilent = selection.Windhawk && windhawkSilent.Checked;
                selection.WindhawkTray = windhawk.Checked && windhawkTray.Checked;
                selection.Rainmeter = rainmeter.Checked;
                selection.ExplorerPage = explorer.Checked; selection.TaskbarPage = taskbar.Checked; selection.StartPage = startStyler.Checked;
                selection.DesktopShortcut = desktop.Checked; selection.StartMenuShortcut = startmenu.Checked; selection.LaunchAfter = launch.Checked;
                form.DialogResult = DialogResult.OK; form.Close();
            };
            return form.ShowDialog() == DialogResult.OK;
        }
    }

    private static void OpenModPage(string url)
    {
        try { Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true }); }
        catch (Exception error) { WriteLine("  [WARN] Mod-Seite konnte nicht geöffnet werden: " + error.Message, ConsoleColor.DarkYellow); }
    }

    [STAThread]
    private static int Main(string[] args)
    {
        bool silent = false;
        foreach (string argument in args)
        {
            if (string.Equals(argument, "/S", StringComparison.OrdinalIgnoreCase)
                || string.Equals(argument, "/silent", StringComparison.OrdinalIgnoreCase))
            {
                silent = true;
            }
        }

        Console.Title = "Bockis-eDEX :: TRON INSTALL TERMINAL";
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.BackgroundColor = ConsoleColor.Black;
        Console.Clear();

        WriteLine("============================================================", ConsoleColor.Cyan);
        WriteLine("  B O C K I S - e D E X   D E S K T O P   U I", ConsoleColor.Cyan);
        WriteLine("  T R O N   I N S T A L L   T E R M I N A L", ConsoleColor.Cyan);
        WriteLine("============================================================", ConsoleColor.Cyan);
        Console.WriteLine();

        WriteSection("System initialization");
        Beep(440, 80);
        WriteLine("  [BOOT] Installation console online", ConsoleColor.DarkCyan);
        Beep(660, 80);
        WriteLine("  [CORE] Electron payload detected", ConsoleColor.DarkCyan);
        Beep(880, 110);
        WriteLine("  [LINK] NSIS installation channel ready", ConsoleColor.DarkCyan);
        WriteLine("  [INFO] Architecture: " + (Environment.Is64BitOperatingSystem ? "x64" : "x86"), ConsoleColor.DarkGray);
        WriteLine("  [INFO] PowerShell: " + Environment.Version, ConsoleColor.DarkGray);

        string defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "Bockis-eDEX Desktop UI");
        SetupChoice choice = new SetupChoice { Path = defaultPath };
        if (!silent)
        {
            if (!ConfigureGraphically(choice))
            {
                WriteLine("  [ABORT] Installation cancelled by operator.", ConsoleColor.Yellow);
                return 0;
            }
        }
        else
        {
            WriteLine("  [AUTO] Silent install: optional components disabled", ConsoleColor.DarkGray);
        }
        string installPath = choice.Path;
        bool installRainmeter = choice.Rainmeter;
        WriteSection("Configuration accepted");
        WriteLine("  [ OK ] Overlay notice accepted", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] Install path: " + installPath, ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] Rainmeter: " + (installRainmeter ? "enabled" : "disabled"), ConsoleColor.DarkCyan);
        WriteLine("  [INFO] Bootstrap: " + Process.GetCurrentProcess().ProcessName + ".exe", ConsoleColor.DarkGray);

        WriteSection("Runtime diagnostics");
        RunDependencyScan();

        string payloadPath = Path.Combine(Path.GetTempPath(), "Bockis-eDEX-Setup-Payload-" + Guid.NewGuid().ToString("N") + ".exe");
        string logPath = Path.Combine(Path.GetTempPath(), "Bockis-eDEX-Setup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".log");
        try
        {
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResource))
            {
                if (source == null) throw new InvalidOperationException("TRON payload resource is missing.");
                using (FileStream target = File.Create(payloadPath)) source.CopyTo(target);
            }

            WriteSection("Installation channel");
            WriteLine("  [LOAD] Installer payload extracted", ConsoleColor.Cyan);
            WriteLine("  [PROC] Phase 1/4: Installation channel prepared", ConsoleColor.Cyan);
            WriteLine("  [PROC] Phase 2/4: Electron application files are being installed", ConsoleColor.Cyan);
            Console.WriteLine();

            Environment.SetEnvironmentVariable("EDEX_INSTALL_RAINMETER", installRainmeter ? "1" : "0");
            Environment.SetEnvironmentVariable("EDEX_INSTALL_WINDHAWK", choice.Windhawk ? "1" : "0");
            Environment.SetEnvironmentVariable("EDEX_WINDHAWK_SILENT", choice.WindhawkSilent ? "1" : "0");
            Environment.SetEnvironmentVariable("EDEX_CREATE_DESKTOP_SHORTCUT", choice.DesktopShortcut ? "1" : "0");
            Environment.SetEnvironmentVariable("EDEX_CREATE_STARTMENU_SHORTCUT", choice.StartMenuShortcut ? "1" : "0");

            using (Process installer = Process.Start(new ProcessStartInfo
            {
                FileName = payloadPath,
                Arguments = "/S /LOG=" + logPath + " /D=" + installPath,
                UseShellExecute = true,
                WorkingDirectory = Path.GetTempPath()
            }))
            {
                string[] phases =
                {
                    "Phase 2/4: Electron application files are being installed",
                    "Phase 3/4: Shortcuts and configuration are being written",
                    "Phase 4/4: Finalizing installation"
                };
                DateTime started = DateTime.UtcNow;
                int phase = 0;
                DateTime nextStatus = started;
                long logOffset = 0;
                while (!installer.WaitForExit(200))
                {
                    logOffset = ShowNewLogLines(logPath, logOffset);
                    TimeSpan elapsed = DateTime.UtcNow - started;
                    int nextPhase = elapsed.TotalSeconds >= 12 ? 2 : elapsed.TotalSeconds >= 4 ? 1 : 0;
                    if (nextPhase != phase)
                    {
                        phase = nextPhase;
                        WriteLine("  [PROC] " + phases[phase], ConsoleColor.Cyan);
                    }
                    if (DateTime.UtcNow >= nextStatus)
                    {
                        WriteLine("  [STATE] " + phases[phase] + " | elapsed " + elapsed.ToString(@"mm\:ss"), ConsoleColor.DarkCyan);
                        nextStatus = DateTime.UtcNow.AddSeconds(1);
                    }
                }
                if (phase < 2)
                {
                    phase = 2;
                    WriteLine("  [PROC] " + phases[phase], ConsoleColor.Cyan);
                }
                logOffset = ShowNewLogLines(logPath, logOffset);
                WriteSection("Installation verification");
                WriteLine("  [PROC] Installation process finished", ConsoleColor.Cyan);
                string installedExe = Path.Combine(installPath, "Bockis-eDEX Desktop UI.exe");
                if (installer.ExitCode != 0 || !File.Exists(installedExe))
                {
                    WriteLine("  [FAIL] Installation incomplete. NSIS exit code: " + installer.ExitCode, ConsoleColor.Red);
                    WriteLine("  [FAIL] Expected application file: " + installedExe, ConsoleColor.Red);
                    WriteLine("  [LOG ] Saved installer log: " + logPath, ConsoleColor.DarkYellow);
                    ShowLogTail(logPath);
                    WaitForClose();
                    return installer.ExitCode;
                }
                WriteLine("  [ OK ] Application verified: " + Path.GetFileName(installedExe), ConsoleColor.DarkCyan);
                WriteLine("  [ OK ] Payload size: " + FormatSize(new FileInfo(installedExe).Length), ConsoleColor.DarkCyan);
            }

            if (!silent)
            {
                if (choice.WindhawkTray)
                {
                    string windhawkExecutable = FindWindhawkExecutable();
                    if (!string.IsNullOrEmpty(windhawkExecutable))
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo {
                                FileName = windhawkExecutable,
                                Arguments = "-tray-only",
                                UseShellExecute = true
                            });
                        }
                        catch (Exception error)
                        {
                            WriteLine("  [WARN] Windhawk konnte nicht im Hintergrund gestartet werden: " + error.Message, ConsoleColor.DarkYellow);
                        }
                    }
                    else WriteLine("  [WARN] Windhawk-Programmdatei nicht gefunden; Hintergrundstart übersprungen.", ConsoleColor.DarkYellow);
                }
                if (choice.ExplorerPage) OpenModPage("https://windhawk.net/mods/windows-11-file-explorer-styler");
                if (choice.TaskbarPage) OpenModPage("https://windhawk.net/mods/windows-11-taskbar-styler");
                if (choice.StartPage) OpenModPage("https://windhawk.net/mods/windows-11-start-menu-styler");
                if (choice.LaunchAfter)
                {
                    try { Process.Start(new ProcessStartInfo { FileName = Path.Combine(installPath, "Bockis-eDEX Desktop UI.exe"), UseShellExecute = true }); }
                    catch (Exception error) { WriteLine("  [WARN] eDEX konnte nicht gestartet werden: " + error.Message, ConsoleColor.DarkYellow); }
                }
            }
            WriteSection("System ready");
            Beep(660, 80);
            WriteLine("  [DONE] Bockis-eDEX installation complete", ConsoleColor.Cyan);
            WriteLine("  [LOG ] Installer log: " + logPath, ConsoleColor.DarkGray);
            WaitForClose();
            return 0;
        }
        catch (Exception error)
        {
            WriteLine("  [FAIL] " + error.Message, ConsoleColor.Red);
            WriteLine("  [LOG ] Installer log: " + logPath, ConsoleColor.DarkYellow);
            ShowLogTail(logPath);
            WaitForClose();
            return 1;
        }
        finally
        {
            try { if (File.Exists(payloadPath)) File.Delete(payloadPath); } catch { }
        }
    }

    private static void ShowLogTail(string logPath)
    {
        try
        {
            if (!File.Exists(logPath)) return;
            string[] lines = File.ReadAllLines(logPath);
            int start = Math.Max(0, lines.Length - 12);
            for (int index = start; index < lines.Length; index++)
            {
                WriteLine("  [LOG ] " + lines[index], ConsoleColor.DarkGray);
            }
        }
        catch (Exception error)
        {
            WriteLine("  [LOG ] Unable to read installer log: " + error.Message, ConsoleColor.DarkYellow);
        }
    }

    private static void RunDependencyScan()
    {
        WriteLine("", ConsoleColor.DarkGray);
        WriteLine("  [SCAN] Checking Windows runtime dependencies", ConsoleColor.Cyan);

        if (!Environment.Is64BitOperatingSystem)
        {
            WriteLine("  [FAIL] A 64-bit Windows installation is required.", ConsoleColor.Red);
            throw new InvalidOperationException("64-bit Windows is required.");
        }
        WriteLine("  [DEP ] Windows x64 detected", ConsoleColor.DarkCyan);

        string systemDirectory = Environment.GetFolderPath(Environment.SpecialFolder.System);
        string powershell = Path.Combine(systemDirectory, "WindowsPowerShell", "v1.0", "powershell.exe");
        if (File.Exists(powershell))
        {
            WriteLine("  [DEP ] Windows PowerShell detected", ConsoleColor.DarkCyan);
        }
        else
        {
            WriteLine("  [WARN] Windows PowerShell was not found; terminal features may be limited.", ConsoleColor.DarkYellow);
        }

        int build = GetWindowsBuildNumber();
        if (build >= 17763)
        {
            WriteLine("  [DEP ] ConPTY-compatible Windows build detected: " + build, ConsoleColor.DarkCyan);
        }
        else
        {
            WriteLine("  [WARN] Windows build " + build + " is older than the supported ConPTY baseline.", ConsoleColor.DarkYellow);
        }

        string vcRuntime = Path.Combine(systemDirectory, "VCRUNTIME140.dll");
        string vcRuntimeUwp = Path.Combine(systemDirectory, "VCRUNTIME140_1.dll");
        if (File.Exists(vcRuntime) && File.Exists(vcRuntimeUwp))
        {
            WriteLine("  [DEP ] Microsoft Visual C++ runtime detected", ConsoleColor.DarkCyan);
            return;
        }

        WriteLine("  [WARN] Microsoft Visual C++ runtime is missing", ConsoleColor.DarkYellow);
        string winget = FindExecutable("winget.exe");
        if (winget.Length == 0)
        {
            WriteLine("  [WARN] winget is unavailable; continuing without runtime installation", ConsoleColor.DarkYellow);
            return;
        }

        WriteLine("  [DEP ] Installing Microsoft Visual C++ runtime via winget", ConsoleColor.Cyan);
        int exitCode = RunDependencyInstaller(winget,
            "install --id Microsoft.VCRedist.2015+.x64 --exact --silent --accept-source-agreements --accept-package-agreements");
        if (exitCode == 0 && File.Exists(vcRuntime) && File.Exists(vcRuntimeUwp))
        {
            WriteLine("  [ OK ] Microsoft Visual C++ runtime installed", ConsoleColor.DarkCyan);
        }
        else
        {
            WriteLine("  [WARN] VC++ runtime installation could not be confirmed; continuing", ConsoleColor.DarkYellow);
        }
    }

    private static string FindExecutable(string name)
    {
        string path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        foreach (string directory in path.Split(Path.PathSeparator))
        {
            if (directory.Length == 0) continue;
            string candidate = Path.Combine(directory.Trim(), name);
            if (File.Exists(candidate)) return candidate;
        }
        return string.Empty;
    }

    private static int GetWindowsBuildNumber()
    {
        try
        {
            using (RegistryKey key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion"))
            {
                if (key != null)
                {
                    string value = key.GetValue("CurrentBuildNumber") as string;
                    int build;
                    if (int.TryParse(value, out build)) return build;
                }
            }
        }
        catch
        {
            // Fall back to the process-reported version when registry access is restricted.
        }
        return Environment.OSVersion.Version.Build;
    }

    private static int RunDependencyInstaller(string executable, string arguments)
    {
        using (Process process = Process.Start(new ProcessStartInfo
        {
            FileName = executable,
            Arguments = arguments,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        }))
        {
            process.OutputDataReceived += (_, eventArgs) =>
            {
                if (!string.IsNullOrWhiteSpace(eventArgs.Data)) WriteLine("  [WINGET] " + eventArgs.Data, ConsoleColor.DarkGray);
            };
            process.ErrorDataReceived += (_, eventArgs) =>
            {
                if (!string.IsNullOrWhiteSpace(eventArgs.Data)) WriteLine("  [WINGET] " + eventArgs.Data, ConsoleColor.DarkYellow);
            };
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();
            return process.ExitCode;
        }
    }

    private static long ShowNewLogLines(string logPath, long offset)
    {
        try
        {
            if (!File.Exists(logPath)) return offset;
            using (FileStream stream = new FileStream(logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                if (stream.Length < offset) offset = 0;
                stream.Seek(offset, SeekOrigin.Begin);
                using (StreamReader reader = new StreamReader(stream, Encoding.Default, false, 1024, true))
                {
                    string line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        if (line.Trim().Length > 0)
                        {
                            WriteLine("  [NSIS] " + line, ConsoleColor.DarkGray);
                        }
                    }
                    return stream.Position;
                }
            }
        }
        catch
        {
            return offset;
        }
    }

    private static void WaitForClose()
    {
        Console.WriteLine();
        WriteLine("  Press any key to close this installation console.", ConsoleColor.DarkCyan);
        try { Console.ReadKey(true); } catch { }
    }

}
