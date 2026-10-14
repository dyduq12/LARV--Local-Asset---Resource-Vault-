export interface CpuMetrics {
  loadPercentage: number;
  cores: number;
  model: string;
  speedMHz: number;
}

export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentage: number;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  release: string;
  uptimeSeconds: number;
  nodeVersion: string;
  pid: number;
}

export interface SystemTelemetry {
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  system: SystemInfo;
  eventLoopLatencyMs: number;
  status: 'nominal' | 'warning' | 'critical';
}
