const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCpuLiveMetrics } = require("../lib/cpu-live-metrics");

test("Uses the aggregate Windows CPU frequency and I/O counters", () => {
  const metrics = normalizeCpuLiveMetrics({
    cpu: [
      { Name: "0,0", ProcessorFrequency: 3400, PercentProcessorPerformance: 155 },
      { Name: "_Total", ProcessorFrequency: 3400, PercentProcessorPerformance: 137 }
    ],
    disk: [
      { Name: "0 C:", DiskReadBytesPersec: 100, DiskWriteBytesPersec: 50 },
      { Name: "_Total", DiskReadBytesPersec: 300, DiskWriteBytesPersec: 200 }
    ],
    network: [
      { Name: "Ethernet", BytesReceivedPersec: 400, BytesSentPersec: 250 }
    ]
  });

  assert.equal(metrics.currentGHz, 4.66);
  assert.equal(metrics.diskReadBps, 300);
  assert.equal(metrics.diskWriteBps, 200);
  assert.equal(metrics.netRxBps, 400);
  assert.equal(metrics.netTxBps, 250);
  assert.equal(metrics.ioBps, 1150);
  assert.equal(metrics.ioAvailable, true);
});

test("Leaves live readings unavailable when Windows counters are missing", () => {
  const metrics = normalizeCpuLiveMetrics({});
  assert.equal(metrics.currentGHz, null);
  assert.equal(metrics.ioAvailable, false);
  assert.equal(metrics.ioBps, 0);
});
