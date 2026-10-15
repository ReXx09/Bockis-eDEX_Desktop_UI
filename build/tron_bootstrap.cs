using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
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

    private static bool Confirm(string prompt, bool defaultValue)
    {
        Console.ForegroundColor = ConsoleColor.DarkCyan;
        Console.Write(prompt + (defaultValue ? " [J/n]: " : " [j/N]: "));
        Console.ResetColor();
        string answer = (Console.ReadLine() ?? string.Empty).Trim().ToLowerInvariant();
        if (answer.Length == 0) return defaultValue;
        return answer == "j" || answer == "ja" || answer == "y" || answer == "yes";
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

        Beep(440, 80);
        WriteLine("  [BOOT] Installation console online", ConsoleColor.DarkCyan);
        Beep(660, 80);
        WriteLine("  [CORE] Electron payload detected", ConsoleColor.DarkCyan);
        Beep(880, 110);
        WriteLine("  [LINK] NSIS installation channel ready", ConsoleColor.DarkCyan);

        string defaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs",
            "Bockis-eDEX Desktop UI");
        string installPath = defaultPath;
        bool installRainmeter = false;
        if (!silent)
        {
            Console.WriteLine();
            WriteLine("  [CONF] Installation settings", ConsoleColor.Cyan);
            Console.ForegroundColor = ConsoleColor.DarkCyan;
            Console.Write("  [PATH] Install directory [" + defaultPath + "]: ");
            Console.ResetColor();
            string requestedPath = (Console.ReadLine() ?? string.Empty).Trim();
            installPath = requestedPath.Length == 0 ? defaultPath : requestedPath;
            installRainmeter = Confirm("  [HUD ] Install optional Rainmeter HUD", true);
        }
        else
        {
            WriteLine("  [AUTO] Silent winget mode: default path, optional HUD skipped", ConsoleColor.DarkGray);
        }
        WriteLine("  [ OK ] Overlay notice accepted", ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] Install path: " + installPath, ConsoleColor.DarkCyan);
        WriteLine("  [ OK ] Rainmeter: " + (installRainmeter ? "enabled" : "disabled"), ConsoleColor.DarkCyan);

        string payloadPath = Path.Combine(Path.GetTempPath(), "Bockis-eDEX-Setup-Payload-" + Guid.NewGuid().ToString("N") + ".exe");
        string logPath = Path.Combine(Path.GetTempPath(), "Bockis-eDEX-Setup-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + ".log");
        try
        {
            using (Stream source = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResource))
            {
                if (source == null) throw new InvalidOperationException("TRON payload resource is missing.");
                using (FileStream target = File.Create(payloadPath)) source.CopyTo(target);
            }

            WriteLine("  [LOAD] Installer payload extracted", ConsoleColor.Cyan);
            WriteLine("  [PROC] Phase 1/4: Installation channel prepared", ConsoleColor.Cyan);
            WriteLine("  [PROC] Phase 2/4: Electron application files are being installed", ConsoleColor.Cyan);
            Console.WriteLine();

            Environment.SetEnvironmentVariable("EDEX_INSTALL_RAINMETER", installRainmeter ? "1" : "0");

            using (Process installer = Process.Start(new ProcessStartInfo
            {
                FileName = payloadPath,
                Arguments = "/S /LOG=\"" + logPath + "\" /D=\"" + installPath + "\"",
                UseShellExecute = true,
                WorkingDirectory = Path.GetTempPath()
            }))
            {
                string[] frames = { "|", "/", "-", "\\" };
                string[] phases =
                {
                    "Phase 2/4: Electron application files are being installed",
                    "Phase 3/4: Shortcuts and configuration are being written",
                    "Phase 4/4: Finalizing installation"
                };
                DateTime started = DateTime.UtcNow;
                int frame = 0;
                int phase = 0;
                while (!installer.WaitForExit(160))
                {
                    TimeSpan elapsed = DateTime.UtcNow - started;
                    int nextPhase = elapsed.TotalSeconds >= 12 ? 2 : elapsed.TotalSeconds >= 4 ? 1 : 0;
                    if (nextPhase != phase)
                    {
                        phase = nextPhase;
                        WriteLine("  [PROC] " + phases[phase], ConsoleColor.Cyan);
                    }
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.Write("\r  [PROC] " + phases[phase] + " {0}  elapsed {1:mm\\:ss}", frames[frame++ % frames.Length], elapsed);
                    Console.ResetColor();
                }
                Console.WriteLine();
                WriteLine("  [PROC] Installation process finished", ConsoleColor.Cyan);
                if (installer.ExitCode != 0)
                {
                    WriteLine("  [FAIL] NSIS installer exit code: " + installer.ExitCode, ConsoleColor.Red);
                    WriteLine("  [LOG ] Saved installer log: " + logPath, ConsoleColor.DarkYellow);
                    ShowLogTail(logPath);
                    WaitForClose();
                    return installer.ExitCode;
                }
            }

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

    private static void WaitForClose()
    {
        Console.WriteLine();
        WriteLine("  Press any key to close this installation console.", ConsoleColor.DarkCyan);
        try { Console.ReadKey(true); } catch { }
    }
}
