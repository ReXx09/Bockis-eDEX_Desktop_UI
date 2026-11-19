using System.Text.Json;
using System.Runtime.Versioning;
using Microsoft.Win32;
using LibreHardwareMonitor.Hardware;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static int Main()
    {
        if (!OperatingSystem.IsWindows())
        {
            return 1;
        }

        var computer = new Computer
        {
            IsCpuEnabled = true,
            IsGpuEnabled = true,
            IsMemoryEnabled = true,
            IsMotherboardEnabled = true,
            IsControllerEnabled = true,
            IsNetworkEnabled = true,
            IsStorageEnabled = true,
            IsPowerMonitorEnabled = true
        };
        var opened = false;

        while (Console.ReadLine() is { } line)
        {
            string? requestId = null;
            try
            {
                using var request = JsonDocument.Parse(line);
                var root = request.RootElement;
                requestId = root.TryGetProperty("id", out var id) ? id.GetString() : null;
                if (root.TryGetProperty("type", out var type) && type.GetString() == "stop")
                {
                    break;
                }

                if (!root.TryGetProperty("type", out type)
                    || type.GetString() is not ("snapshot" or "scan"))
                {
                    throw new InvalidOperationException("Unbekannter Hardware-Monitor-Befehl");
                }

                if (!opened)
                {
                    computer.Open();
                    opened = true;
                }

                var visitor = new SensorUpdateVisitor();
                computer.Accept(visitor);
                var sensors = ReadSensors(computer);
                var pawnIo = ReadPawnIoInstallation();
                var state = sensors.Count > 0
                    ? "ready"
                    : !pawnIo.Installed
                        ? "missing-driver"
                        : visitor.Errors.Count > 0
                            ? "error"
                            : "waiting";

                WriteResponse(new HardwareSnapshot(
                    requestId,
                    state,
                    pawnIo.Installed,
                    pawnIo.Version,
                    DateTimeOffset.UtcNow,
                    sensors,
                    MergeErrors(pawnIo.Error, visitor.Errors)));
            }
            catch (Exception error)
            {
                var pawnIo = ReadPawnIoInstallation();
                WriteResponse(new HardwareSnapshot(
                    requestId,
                    pawnIo.Installed ? "error" : "missing-driver",
                    pawnIo.Installed,
                    pawnIo.Version,
                    DateTimeOffset.UtcNow,
                    [],
                    MergeErrors(pawnIo.Error, [error.Message])));
            }
        }

        if (opened)
        {
            computer.Close();
        }

        return 0;
    }

    private static List<SensorReading> ReadSensors(Computer computer)
    {
        var sensors = new List<SensorReading>();
        foreach (var hardware in computer.Hardware)
        {
            CollectSensors(hardware, sensors);
        }

        return sensors;
    }

    private static void CollectSensors(IHardware hardware, List<SensorReading> sensors)
    {
        foreach (var sensor in hardware.Sensors)
        {
            if (sensor.Value is not float value || !float.IsFinite(value))
            {
                continue;
            }

            var name = string.IsNullOrWhiteSpace(sensor.Name)
                ? hardware.Name
                : $"{hardware.Name}: {sensor.Name}";
            sensors.Add(new SensorReading(
                name.Length > 180 ? name[..180] : name,
                value,
                UnitFor(sensor.SensorType.ToString())));
            if (sensors.Count >= 500)
            {
                return;
            }
        }

        foreach (var subHardware in hardware.SubHardware)
        {
            CollectSensors(subHardware, sensors);
            if (sensors.Count >= 500)
            {
                return;
            }
        }
    }

    private static string UnitFor(string sensorType) => sensorType.ToLowerInvariant() switch
    {
        "temperature" => "°C",
        "load" or "control" or "level" => "%",
        "clock" => "MHz",
        "power" => "W",
        "fan" => "RPM",
        "voltage" => "V",
        "current" => "A",
        "data" => "GB",
        "smalldata" => "MB",
        "throughput" => "MB/s",
        "time" => "s",
        "energy" => "Wh",
        "noise" => "dB",
        _ => ""
    };

    [SupportedOSPlatform("windows")]
    private static PawnIoInstallation ReadPawnIoInstallation()
    {
        try
        {
            const string subKeyPath = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PawnIO";
            foreach (var view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
            {
                using var hive = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view);
                using var key = hive.OpenSubKey(subKeyPath);
                if (key is null)
                {
                    continue;
                }

                var version = key.GetValue("DisplayVersion") as string;
                return new PawnIoInstallation(true, version, null);
            }

            return new PawnIoInstallation(false, null, null);
        }
        catch (Exception error)
        {
            return new PawnIoInstallation(false, null, $"PawnIO-Status konnte nicht gelesen werden: {error.Message}");
        }
    }

    private static string? MergeErrors(string? registryError, IReadOnlyCollection<string> errors)
    {
        var messages = new List<string>();
        if (!string.IsNullOrWhiteSpace(registryError))
        {
            messages.Add(registryError);
        }

        messages.AddRange(errors.Where(message => !string.IsNullOrWhiteSpace(message)).Take(4));
        var combined = string.Join(" · ", messages);
        return combined.Length > 600 ? combined[..600] : string.IsNullOrEmpty(combined) ? null : combined;
    }

    private static void WriteResponse(HardwareSnapshot snapshot)
    {
        Console.Out.WriteLine(JsonSerializer.Serialize(snapshot, JsonOptions));
        Console.Out.Flush();
    }

    private sealed class SensorUpdateVisitor : IVisitor
    {
        public List<string> Errors { get; } = [];

        public void VisitComputer(IComputer computer) => computer.Traverse(this);

        public void VisitHardware(IHardware hardware)
        {
            try
            {
                hardware.Update();
            }
            catch (Exception error)
            {
                if (Errors.Count < 4)
                {
                    Errors.Add($"{hardware.Name}: {error.Message}");
                }
            }

            foreach (var subHardware in hardware.SubHardware)
            {
                subHardware.Accept(this);
            }
        }

        public void VisitSensor(ISensor sensor) { }

        public void VisitParameter(IParameter parameter) { }
    }

    private sealed record PawnIoInstallation(bool Installed, string? Version, string? Error);
    private sealed record SensorReading(string Name, float Value, string Unit);
    private sealed record HardwareSnapshot(
        string? Id,
        string State,
        bool PawnIoInstalled,
        string? PawnIoVersion,
        DateTimeOffset SampleAt,
        IReadOnlyList<SensorReading> Sensors,
        string? Error);
}
