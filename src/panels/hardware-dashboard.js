(function () {
  "use strict";

  const unavailable = "Nicht verf\u00fcgbar";
  const finite = (value) => typeof value === "number" && Number.isFinite(value);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const number = (value, digits = 0) => finite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : unavailable;
  const valueText = (value, unit, digits = 0) => finite(value) ? `${number(value, digits)} ${unit}`.trim() : unavailable;
  const percent = (used, total) => finite(used) && finite(total) && total > 0 ? used / total * 100 : null;
  const clamp = (value) => Math.max(0, Math.min(100, value));

  function buildModel(snapshot, selectedGpuId) {
    // Hardware identifiers and types are authoritative; display names are not device identities.
    const sensors = snapshot.state === "ready" && Array.isArray(snapshot.sensors)
      ? snapshot.sensors.filter((sensor) => finite(sensor.value)) : [];
    const typeOf = (sensor) => sensor.rootHardwareType || sensor.hardwareType || "";
    const idOf = (sensor) => sensor.rootHardwareId || sensor.hardwareId;
    const nameOf = (sensor) => sensor.rootHardwareName || sensor.hardwareName || unavailable;
    const sensorName = (sensor) => sensor.sensorName || "";
    const devices = (pattern) => [...new Map(sensors.filter((sensor) => pattern.test(typeOf(sensor)) && idOf(sensor))
      .map((sensor) => [idOf(sensor), { id: idOf(sensor), name: nameOf(sensor) }])).values()];
    const group = (id) => id ? sensors.filter((sensor) => idOf(sensor) === id) : [];
    const pick = (list, type, patterns) => {
      const candidates = list.filter((sensor) => sensor.sensorType === type);
      for (const pattern of patterns) {
        const found = candidates.find((sensor) => pattern.test(sensorName(sensor)));
        if (found) return found.value;
      }
      return null;
    };
    const dataGb = (list, patterns) => {
      const gb = pick(list, "Data", patterns);
      const mb = pick(list, "SmallData", patterns);
      return gb ?? (mb === null ? null : mb / 1024);
    };
    const cpuDevice = devices(/^Cpu$/)[0];
    const gpus = devices(/^Gpu/);
    const gpuDevice = gpus.find((device) => device.id === selectedGpuId) || gpus[0];
    const cpuSensors = group(cpuDevice?.id);
    const gpuSensors = group(gpuDevice?.id);
    const boardSensors = sensors.filter((sensor) => /^(Motherboard|SuperIO)$/.test(typeOf(sensor)));
    const cpuFan = pick(cpuSensors, "Fan", [/cpu|processor/i])
      ?? pick(boardSensors, "Fan", [/cpu|processor/i]);
    const gpuFan = pick(gpuSensors, "Fan", [/gpu|fan/i]);
    const cpu = {
      name: cpuDevice?.name || unavailable,
      load: pick(cpuSensors, "Load", [/^CPU Total$/i, /^Total$/i]),
      temperature: pick(cpuSensors, "Temperature", [/^CPU Package$/i, /Tctl\/Tdie|Tdie|Tctl/i, /^Core Average$/i]),
      clock: pick(cpuSensors, "Clock", [/^Core Average$/i, /^CPU Core #1$/i, /^Core #1$/i]),
      power: pick(cpuSensors, "Power", [/^CPU Package$/i, /^Package$/i]),
      fan: cpuFan
    };
    const gpu = {
      name: gpuDevice?.name || unavailable,
      load: pick(gpuSensors, "Load", [/^GPU Core$/i, /^GPU Total$/i]),
      temperature: pick(gpuSensors, "Temperature", [/^GPU Core$/i, /^GPU Temperature$/i]),
      clock: pick(gpuSensors, "Clock", [/^GPU Core$/i]),
      power: pick(gpuSensors, "Power", [/^GPU Package$/i, /^GPU Power$/i, /^GPU Total$/i]),
      fan: gpuFan
    };
    const memorySensors = sensors.filter((sensor) => typeOf(sensor) === "Memory");
    const used = dataGb(memorySensors, [/^Memory Used$/i]);
    const available = dataGb(memorySensors, [/^Memory Available$/i]);
    const total = used !== null && available !== null ? used + available : null;
    const ram = {
      used, total,
      load: pick(memorySensors, "Load", [/^Memory$/i]) ?? percent(used, total),
      clock: pick(memorySensors, "Clock", [/memory|dram/i])
    };
    const vramUsed = dataGb(gpuSensors, [/^GPU Memory Used$/i, /^D3D Dedicated Memory Used$/i]);
    const vramTotal = dataGb(gpuSensors, [/^GPU Memory Total$/i, /^D3D Dedicated Memory Total$/i]);
    const vram = {
      used: vramUsed, total: vramTotal,
      load: percent(vramUsed, vramTotal) ?? pick(gpuSensors, "Load", [/^GPU Memory$/i]),
      clock: pick(gpuSensors, "Clock", [/^GPU Memory$/i])
    };
    const networks = devices(/^Network$/).map((device) => {
      const list = group(device.id);
      return {
        name: device.name,
        upload: pick(list, "Throughput", [/upload|sent|send/i]),
        download: pick(list, "Throughput", [/download|received|receive/i])
      };
    });
    const storage = devices(/^Storage$/).map((device) => ({
      name: device.name,
      temperature: pick(group(device.id), "Temperature", [/^Temperature$/i, /temperature/i])
    }));
    const drives = snapshot.state === "ready" && Array.isArray(snapshot.drives) ? snapshot.drives.map((drive) => ({
      name: drive.name,
      free: finite(drive.freeBytes) ? drive.freeBytes / 1024 ** 3 : null,
      total: finite(drive.totalBytes) ? drive.totalBytes / 1024 ** 3 : null,
      load: finite(drive.totalBytes) && finite(drive.freeBytes)
        ? percent(drive.totalBytes - drive.freeBytes, drive.totalBytes) : null,
      error: drive.error
    })) : [];
    return { cpu, gpu, gpus, gpuId: gpuDevice?.id, ram, vram, networks, storage, drives };
  }

  function gauge(label, value, unit = "%", max = 100) {
    const known = finite(value);
    const description = `${label}: ${valueText(value, unit)}`;
    return `<div class="hardware-gauge" role="meter" aria-label="${escape(description)}"
        aria-valuemin="0" aria-valuemax="${max}"${known ? ` aria-valuenow="${Math.max(0, Math.min(max, value))}"` : ""}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path class="hardware-gauge-track" d="M18.18 81.82 A45 45 0 1 1 81.82 81.82" pathLength="100"/>
        <path class="hardware-gauge-fill" d="M18.18 81.82 A45 45 0 1 1 81.82 81.82" pathLength="100"
          stroke-dasharray="${known ? clamp(value / max * 100) : 0} 100"/>
        <text x="50" y="55">${known ? escape(`${number(value)}${unit}`) : "N/V"}</text>
      </svg><span>${escape(label)}</span>${known ? "" : `<small>${unavailable}</small>`}
    </div>`;
  }

  function bar(label, value, unit, scale, digits = 0) {
    const known = finite(value);
    const text = valueText(value, unit, digits);
    const width = known && finite(scale) && scale > 0 ? clamp(value / scale * 100) : 0;
    return `<div class="hardware-metric"${scale ? ` title="Anzeigeskala: 0 bis ${scale} ${escape(unit)}"` : ""}>
      <div><span>${escape(label)}</span><strong>${escape(text)}</strong></div>
      <div class="hardware-bar" aria-hidden="true"><i style="width:${width}%"></i></div>
    </div>`;
  }

  function processor(title, device, selector = "") {
    return `<section class="hardware-tile hardware-${title.toLowerCase()}">
      <header><h2>${title}</h2>${selector || `<span title="${escape(device.name)}">${escape(device.name)}</span>`}</header>
      <div class="hardware-processor">
        ${gauge("Auslastung", device.load)}
        <div class="hardware-metrics">
          ${bar("Takt", device.clock, "MHz", Math.max(6000, device.clock || 0))}
          ${bar("Leistung", device.power, "W", Math.max(500, device.power || 0), 1)}
          ${bar("L\u00fcfter", device.fan, "RPM", Math.max(6000, device.fan || 0))}
        </div>
        ${gauge("Temperatur", device.temperature, "\u00b0C", 110)}
      </div>
    </section>`;
  }

  function memory(title, data) {
    return `<section class="hardware-tile hardware-${title.toLowerCase()}">
      <header><h2>${title}</h2></header>
      <div class="hardware-memory">
        <div><p>Takt <strong>${escape(valueText(data.clock, "MHz"))}</strong></p>
        <p>Belegt <strong>${escape(valueText(data.used, "GB", 1))}</strong></p>
        <p>Gesamt <strong>${escape(valueText(data.total, "GB", 1))}</strong></p></div>
        ${gauge("Auslastung", data.load)}
      </div>
    </section>`;
  }

  function markup() {
    return `<div class="hwinfo-panel" data-hardware-panel>
      <div class="hardware-toolbar">
        <strong>HARDWARE MONITOR</strong><time data-hardware-time>--:--:--</time>
        <button type="button" data-hardware-scan>Pr\u00fcfen</button>
      </div>
      <p data-hardware-status data-state="checking" role="status">Voraussetzungen werden gepr\u00fcft \u2026</p>
      <div class="hardware-dashboard" data-hardware-dashboard></div>
      <small class="hwinfo-panel-hint">LibreHardwareMonitor \u00b7 PawnIO \u00b7 N/V = ${unavailable}</small>
    </div>`;
  }

  function render(root, snapshot) {
    const dashboard = root.querySelector("[data-hardware-dashboard]");
    const selectedGpuId = root.querySelector("[data-hardware-gpu]")?.value || root.dataset.hardwareGpu;
    const model = buildModel(snapshot, selectedGpuId);
    if (model.gpuId) root.dataset.hardwareGpu = model.gpuId;
    const selector = model.gpus.length > 1
      ? `<select data-hardware-gpu aria-label="Grafikkarte" data-i18n-aria-label="panel.hardware.gpu">${model.gpus.map((gpu) =>
        `<option value="${escape(gpu.id)}"${gpu.id === model.gpuId ? " selected" : ""}>${escape(gpu.name)}</option>`).join("")}</select>` : "";
    const template = root.ownerDocument.createElement("template");
    template.innerHTML = processor("CPU", model.cpu) + processor("GPU", model.gpu, selector)
      + memory("RAM", model.ram)
      + `<section class="hardware-tile hardware-storage"><header><h2>LAUFWERKE</h2></header>
        ${model.drives.length ? model.drives.map((drive) =>
        `<div class="hardware-drive"><span>${escape(drive.name)}</span><div>
          ${bar("Belegt", drive.load, "%", 100)}
          <small>${escape(drive.error || `${valueText(drive.free, "GB", 1)} frei / ${valueText(drive.total, "GB", 1)}`)}</small>
        </div></div>`).join("") : `<p>${unavailable}</p>`}
        <h3>Datentr\u00e4ger-Temperaturen</h3>
        ${model.storage.length ? model.storage.map((drive) =>
        `<p class="hardware-storage-temp"><span>${escape(drive.name)}</span><strong>${escape(valueText(drive.temperature, "\u00b0C"))}</strong></p>`).join("") : `<p>${unavailable}</p>`}
      </section>`
      + memory("VRAM", model.vram)
      + `<section class="hardware-tile hardware-network"><header><h2>NETZWERK</h2></header>
        ${model.networks.length ? model.networks.map((network) => `<div class="hardware-network-device">
          <h3>${escape(network.name)}</h3>
          ${bar("Upload", network.upload === null ? null : network.upload / 1024 ** 2, "MB/s", Math.max(100, (network.upload || 0) / 1024 ** 2), 2)}
          ${bar("Download", network.download === null ? null : network.download / 1024 ** 2, "MB/s", Math.max(100, (network.download || 0) / 1024 ** 2), 2)}
        </div>`).join("") : `<p>${unavailable}</p>`}
      </section>`
      + `<section class="hardware-tile hardware-fans"><header><h2>GPU / CPU L\u00dcFTER</h2></header>
        ${bar("GPU", model.gpu.fan, "RPM", Math.max(6000, model.gpu.fan || 0))}
        ${bar("CPU", model.cpu.fan, "RPM", Math.max(6000, model.cpu.fan || 0))}
      </section>`;
    for (const tile of [...template.content.children]) {
      const current = dashboard.querySelector(`.${tile.classList[1]}`);
      if (!current) {
        dashboard.append(tile);
        continue;
      }
      const currentSelect = current.querySelector("[data-hardware-gpu]");
      const nextSelect = tile.querySelector("[data-hardware-gpu]");
      // Keep the native GPU selector mounted while live readings refresh.
      if (currentSelect && nextSelect && currentSelect.options.length === nextSelect.options.length
          && [...currentSelect.options].every((option, index) =>
            option.value === nextSelect.options[index].value && option.text === nextSelect.options[index].text)) {
        currentSelect.value = model.gpuId;
        current.querySelector(".hardware-processor").replaceWith(tile.querySelector(".hardware-processor"));
      } else {
        current.replaceChildren(...tile.childNodes);
      }
    }
    const gpuSelect = dashboard.querySelector("[data-hardware-gpu]");
    if (gpuSelect) gpuSelect.onchange = () => render(root, snapshot);
    const time = root.querySelector("[data-hardware-time]");
    const date = snapshot.sampleAt ? new Date(snapshot.sampleAt) : null;
    time.textContent = date && Number.isFinite(date.getTime()) ? date.toLocaleTimeString() : "--:--:--";
    time.dateTime = date && Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }

  const api = { buildModel, markup, render };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.edexHardwareDashboard = api;
})();
