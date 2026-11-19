"use strict";

const fs = require("fs");
const path = require("path");

const HEAD_BYTES = 128 * 1024;
const TAIL_BYTES = 192 * 1024;
const MAX_SENSORS = 500;

function parseCsvLine(line, delimiter) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      fields.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  fields.push(value.trim());
  return fields;
}

function detectDelimiter(line) {
  return parseCsvLine(line, ";").length > parseCsvLine(line, ",").length ? ";" : ",";
}

function parseRows(text, delimiter) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim())
    .map((line) => parseCsvLine(line, delimiter));
}

function isDateHeader(value) {
  return ["date", "datum"].includes(String(value || "").trim().toLowerCase());
}

function isTimeHeader(value) {
  return ["time", "zeit"].includes(String(value || "").trim().toLowerCase());
}

function parseNumeric(value, delimiter) {
  let input = String(value || "").trim();
  if (delimiter === ";" && /^[+-]?\d+,\d+(?:e[+-]?\d+)?$/i.test(input)) {
    input = input.replace(",", ".");
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input)) return null;
  const number = Number(input);
  return Number.isFinite(number) ? number : null;
}

function parseHwinfoCsv(text) {
  const firstLine = String(text || "").replace(/^\uFEFF/, "").split(/\r\n|\n|\r/, 1)[0] || "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseRows(text, delimiter);
  const headerIndex = rows.findIndex((row) => isDateHeader(row[0]) && isTimeHeader(row[1]));
  if (headerIndex < 0) throw new Error("HWiNFO-CSV-Kopfzeile mit Datum und Uhrzeit nicht gefunden");

  const groups = rows[headerIndex];
  const nextRow = rows[headerIndex + 1];
  const hasSecondHeader = Boolean(
    nextRow
    && !nextRow[0]?.trim()
    && !nextRow[1]?.trim()
    && nextRow.slice(2).some((value) => value.trim())
  );
  const labels = hasSecondHeader
    ? groups.map((group, index) => {
      const label = nextRow[index] || "";
      if (!group) return label;
      if (!label || group.toLowerCase() === label.toLowerCase()) return group;
      return `${group}: ${label}`;
    })
    : groups;
  const dataStart = headerIndex + (hasSecondHeader ? 2 : 1);
  const dataRow = rows.slice(dataStart).reverse().find((row) => (
    row.length >= labels.length
    && row[0]?.trim()
    && row[1]?.trim()
    && !isDateHeader(row[0])
  ));
  if (!dataRow) {
    return { sampleAt: "", sensors: [] };
  }

  const sensors = [];
  for (let index = 2; index < labels.length && sensors.length < MAX_SENSORS; index += 1) {
    const value = parseNumeric(dataRow[index], delimiter);
    if (value == null) continue;
    const name = String(labels[index] || `Sensor ${index - 1}`).replace(/\s+/g, " ").trim().slice(0, 180);
    const unitMatch = name.match(/\[([^\]]{1,24})\]\s*$/);
    sensors.push({
      name,
      value,
      unit: unitMatch ? unitMatch[1].trim() : ""
    });
  }
  return {
    sampleAt: `${dataRow[0].trim()} ${dataRow[1].trim()}`.slice(0, 80),
    sensors: rankSensors(sensors)
  };
}

function sensorCategory(name) {
  const label = String(name || "").toLowerCase();
  if (/temp|temperature|temperatur|tctl|tdie|core max|°c/.test(label)) return "temperature";
  if (/power|leistung|watt|\[w\]/.test(label)) return "power";
  if (/usage|utilization|auslastung|load|last|gpu.*%/.test(label)) return "load";
  if (/fan|lüfter|luefter|rpm|drehzahl/.test(label)) return "fan";
  if (/clock|takt|frequency|frequenz|mhz|ghz/.test(label)) return "clock";
  return "other";
}

function rankSensors(sensors) {
  const categories = ["temperature", "power", "load", "fan", "clock", "other"];
  const grouped = new Map(categories.map((category) => [category, []]));
  sensors.forEach((sensor) => grouped.get(sensorCategory(sensor.name)).push(sensor));
  const ranked = [];
  for (let index = 0; index < Math.max(0, ...[...grouped.values()].map((items) => items.length)); index += 1) {
    categories.forEach((category) => {
      const sensor = grouped.get(category)[index];
      if (sensor) ranked.push(sensor);
    });
  }
  return ranked;
}

async function readRange(file, start, length) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, start);
  return buffer.subarray(0, bytesRead);
}

function decode(buffer, encoding) {
  return buffer.toString(encoding).replace(/^\uFEFF/, "");
}

async function readCsvText(size, file) {
  const headLength = Math.min(size, HEAD_BYTES);
  const head = await readRange(file, 0, headLength);
  const utf16 = head[0] === 0xff && head[1] === 0xfe;
  const encoding = utf16 ? "utf16le" : "utf8";
  const headText = decode(utf16 ? head.subarray(2) : head, encoding);
  if (size <= HEAD_BYTES + TAIL_BYTES) {
    const remaining = size - headLength;
    if (!remaining) return headText;
    return `${headText}\n${decode(await readRange(file, headLength, remaining), encoding)}`;
  }

  let tailStart = size - TAIL_BYTES;
  if (utf16 && tailStart % 2) tailStart -= 1;
  let tailText = decode(await readRange(file, tailStart, size - tailStart), encoding);
  const firstLineBreak = tailText.indexOf("\n");
  tailText = firstLineBreak >= 0 ? tailText.slice(firstLineBreak + 1) : "";
  return `${headText}\n${tailText}`;
}

async function getHwinfoCsvSnapshot(filePath) {
  if (!filePath) {
    return { state: "not-configured", fileName: "", sampleAt: "", sensors: [] };
  }
  if (path.extname(String(filePath)).toLowerCase() !== ".csv") {
    return { state: "invalid", fileName: path.basename(String(filePath)), sampleAt: "", sensors: [], error: "Bitte eine CSV-Datei auswählen" };
  }

  let file;
  try {
    file = await fs.promises.open(filePath, "r");
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("Ausgewählte Datei ist keine normale Datei");
    if (stat.size === 0) {
      return { state: "waiting", fileName: path.basename(filePath), sampleAt: "", sensors: [] };
    }
    const parsed = parseHwinfoCsv(await readCsvText(stat.size, file));
    if (!parsed.sensors.length) {
      return {
        state: "waiting",
        fileName: path.basename(filePath),
        sampleAt: parsed.sampleAt,
        sensors: []
      };
    }
    return {
      state: "ready",
      fileName: path.basename(filePath),
      sampleAt: parsed.sampleAt,
      sensors: parsed.sensors
    };
  } catch (error) {
    return {
      state: error.code === "ENOENT" ? "missing" : "error",
      fileName: path.basename(String(filePath)),
      sampleAt: "",
      sensors: [],
      error: String(error.message || error).slice(0, 240)
    };
  } finally {
    if (file) await file.close();
  }
}

module.exports = { parseHwinfoCsv, getHwinfoCsvSnapshot };
