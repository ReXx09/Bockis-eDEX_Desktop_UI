function rows(value) {
  return Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
}

function counterRowsOrTotal(items) {
  const total = items.find((item) => /^(_total|[^,]+,_total)$/i.test(String(item.Name || "")));
  return total ? [total] : items;
}

function sumCounterFields(items, fields) {
  const selected = counterRowsOrTotal(items);
  return selected.reduce((sum, item) => (
    sum + fields.reduce((itemSum, field) => itemSum + Math.max(0, Number(item[field]) || 0), 0)
  ), 0);
}

function normalizeCpuLiveMetrics(value) {
  const source = value && typeof value === "object" ? value : {};
  const cpuRows = rows(source.cpu);
  const totalCpu = cpuRows.find((item) => /^(_total|[^,]+,_total)$/i.test(String(item.Name || "")));
  const selectedCpu = totalCpu ? [totalCpu] : cpuRows;
  const frequencies = selectedCpu.map((item) => {
    const nominalMHz = Number(item.ProcessorFrequency);
    if (!Number.isFinite(nominalMHz) || nominalMHz <= 0) return null;
    const performance = Number(item.PercentProcessorPerformance);
    return nominalMHz * (Number.isFinite(performance) && performance > 0 ? performance / 100 : 1);
  }).filter((value) => Number.isFinite(value) && value > 0);
  const diskRows = rows(source.disk);
  const networkRows = rows(source.network);
  const diskReadBps = diskRows.length ? sumCounterFields(diskRows, ["DiskReadBytesPersec"]) : null;
  const diskWriteBps = diskRows.length ? sumCounterFields(diskRows, ["DiskWriteBytesPersec"]) : null;
  const netRxBps = networkRows.length ? sumCounterFields(networkRows, ["BytesReceivedPersec"]) : null;
  const netTxBps = networkRows.length ? sumCounterFields(networkRows, ["BytesSentPersec"]) : null;

  return {
    currentGHz: frequencies.length
      ? Math.round((frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length) / 10) / 100
      : null,
    diskReadBps,
    diskWriteBps,
    netRxBps,
    netTxBps,
    ioAvailable: diskReadBps !== null || diskWriteBps !== null || netRxBps !== null || netTxBps !== null,
    ioBps: (diskReadBps || 0) + (diskWriteBps || 0) + (netRxBps || 0) + (netTxBps || 0)
  };
}

module.exports = { normalizeCpuLiveMetrics };
