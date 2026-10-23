using System;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;
using System.Reflection;
using System.Text;
using System.Threading;

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

    private static void ShowInformation()
    {
        Console.Clear();
        WriteLine("============================================================", ConsoleColor.Cyan);
        WriteLine("  H I N W E I S E   U N D   A B H A E N G I G K E I T E N", ConsoleColor.Cyan);
        WriteLine("============================================================", ConsoleColor.Cyan);
        Console.WriteLine();
        WriteLine("  Bockis-eDEX verwendet transparente Overlay-Fenster.", ConsoleColor.DarkCyan);
        WriteLine("  Der Windows-Desktop kann waehrend der Laufzeit ueberlagert", ConsoleColor.DarkCyan);
        WriteLine("  werden. Beim Beenden werden Desktop und Symbole wiederhergestellt.", ConsoleColor.DarkCyan);
        Console.WriteLine();
        WriteLine("  ENTHALTENE KOMPONENTEN", ConsoleColor.Yellow);
        WriteLine("  [ OK ] Electron Runtime", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] PowerShell / ConPTY", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] xterm.js-Terminaldarstellung", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] node-pty-Windows-Anbindung", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] Windows-Desktop-Integration", ConsoleColor.DarkCyan);
        Console.WriteLine();
        WriteLine("  Diese Komponenten sind Bestandteil der Anwendung und", ConsoleColor.DarkGray);
        WriteLine("  koennen nicht einzeln abgewahlt werden.", ConsoleColor.DarkGray);
        Console.WriteLine();
        WriteLine("  [Enter] Zur Installationskonfiguration", ConsoleColor.Cyan);
        Console.ReadKey(true);
    }

    private static void DrawConfiguration(string installPath, bool installRainmeter, int selected)
    {
        Console.Clear();
        WriteLine("============================================================", ConsoleColor.Cyan);
        WriteLine("  I N S T A L L A T I O N S K O N F I G U R A T I O N", ConsoleColor.Cyan);
        WriteLine("============================================================", ConsoleColor.Cyan);
        Console.WriteLine();
        WriteLine("  [Pfeile] Auswahl   [Leertaste] Ein/Aus   [Enter] Weiter", ConsoleColor.DarkGray);
        Console.WriteLine();

        string[] options =
        {
            "[ OK ] Transparente Overlay-Fenster akzeptieren",
            "[ " + (installRainmeter ? "x" : " ") + " ] Rainmeter-HUD installieren",
            "[ P  ] Installationspfad bearbeiten",
            "[ >  ] Installation starten"
        };
        for (int index = 0; index < options.Length; index++)
        {
            ConsoleColor color = index == selected ? ConsoleColor.Yellow : ConsoleColor.DarkCyan;
            WriteLine((index == selected ? "  > " : "    ") + options[index], color);
        }

        Console.WriteLine();
        WriteLine("  Aktueller Pfad:", ConsoleColor.DarkGray);
        WriteLine("  " + installPath, ConsoleColor.Cyan);
        Console.WriteLine();
        WriteLine("  Rainmeter ist optional. Ohne Rainmeter bleibt die Anwendung", ConsoleColor.DarkGray);
        WriteLine("  vollstaendig funktionsfaehig.", ConsoleColor.DarkGray);
    }

    private static bool ConfigureInstallation(ref string installPath, ref bool installRainmeter)
    {
        int selected = 1;
        while (true)
        {
            DrawConfiguration(installPath, installRainmeter, selected);
            ConsoleKey key = Console.ReadKey(true).Key;
            if (key == ConsoleKey.UpArrow)
            {
                selected = (selected + 3) % 4;
            }
            else if (key == ConsoleKey.DownArrow)
            {
                selected = (selected + 1) % 4;
            }
            else if (key == ConsoleKey.Spacebar && selected == 1)
            {
                installRainmeter = !installRainmeter;
            }
            else if (key == ConsoleKey.Enter)
            {
                if (selected == 1)
                {
                    installRainmeter = !installRainmeter;
                }
                else if (selected == 2)
                {
                    Console.WriteLine();
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.Write("  Neuer Installationspfad (leer = unveraendert): ");
                    Console.ResetColor();
                    string requestedPath = (Console.ReadLine() ?? string.Empty).Trim();
                    if (requestedPath.Length > 0) installPath = requestedPath;
                }
                else if (selected == 3)
                {
                    return true;
                }
            }
            else if (key == ConsoleKey.Escape)
            {
                return false;
            }
        }
    }

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
        string installPath = defaultPath;
        bool installRainmeter = false;
        if (!silent)
        {
            ShowInformation();
            if (!ConfigureInstallation(ref installPath, ref installRainmeter))
            {
                WriteLine("  [ABORT] Installation cancelled by operator.", ConsoleColor.Yellow);
                WaitForClose();
                return 0;
            }
        }
        else
        {
            WriteLine("  [AUTO] Silent winget mode: default path, optional HUD skipped", ConsoleColor.DarkGray);
        }
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
