import os from 'node:os';
import { performance } from 'node:perf_hooks';
import type { SystemTelemetry, CpuMetrics, MemoryMetrics, SystemInfo } from '@larv/shared';

interface CpuSnapshot {
  idle: number;
  total: number;
}

let lastCpuSnapshot: CpuSnapshot | null = null;

function getCpuSnapshot(): CpuSnapshot {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times];
    }
    idle += cpu.times.idle;
  }

  return { idle, total };
}

function calculateCpuUsage(): number {
  const current = getCpuSnapshot();
  if (!lastCpuSnapshot) {
    lastCpuSnapshot = current;
    return 0;
  }

  const idleDelta = current.idle - lastCpuSnapshot.idle;
  const totalDelta = current.total - lastCpuSnapshot.total;
  lastCpuSnapshot = current;

  if (totalDelta <= 0) return 0;
  const usage = 100 - (100 * idleDelta) / totalDelta;
  return Math.min(100, Math.max(0, Math.round(usage * 10) / 10));
}

let lastEventLoopCheck = performance.now();
let eventLoopLatency = 0;

setInterval(() => {
  const now = performance.now();
  const delta = now - lastEventLoopCheck;
  eventLoopLatency = Math.max(0, Math.round((delta - 500) * 10) / 10);
  lastEventLoopCheck = now;
}, 500).unref();

export class TelemetryService {
  public getTelemetry(): SystemTelemetry {
    const cpus = os.cpus();
    const primaryCpu = cpus[0] || { model: 'Unknown', speed: 0 };
    const loadPercentage = calculateCpuUsage();

    const cpu: CpuMetrics = {
      loadPercentage,
      cores: cpus.length,
      model: primaryCpu.model,
      speedMHz: primaryCpu.speed,
    };

    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const memPercentage = Math.round((usedBytes / totalBytes) * 1000) / 10;

    const memory: MemoryMetrics = {
      totalBytes,
      usedBytes,
      freeBytes,
      percentage: memPercentage,
    };

    const system: SystemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      uptimeSeconds: Math.floor(os.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
    };

    let status: 'nominal' | 'warning' | 'critical' = 'nominal';
    if (memPercentage > 92 || loadPercentage > 92) {
      status = 'critical';
    } else if (memPercentage > 80 || loadPercentage > 80) {
      status = 'warning';
    }

    return {
      timestamp: Date.now(),
      cpu,
      memory,
      system,
      eventLoopLatencyMs: eventLoopLatency,
      status,
    };
  }
}

export const telemetryService = new TelemetryService();
