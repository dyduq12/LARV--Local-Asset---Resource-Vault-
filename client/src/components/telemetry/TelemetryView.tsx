import React, { useEffect, useState } from 'react';
import type { SystemTelemetry } from '@larv/shared';
import { sseClient } from '../../services/sse.client.js';
import { apiClient } from '../../services/api.client.js';
import {
  Cpu,
  HardDrive,
  Activity,
  Layers,
  RefreshCw,
  AlertTriangle,
  Clock,
  Gauge,
  Zap,
} from 'lucide-react';

export interface TelemetryViewProps {
  onTelemetryUpdate?: (telemetry: SystemTelemetry) => void;
}

export const TelemetryView: React.FC<TelemetryViewProps> = ({ onTelemetryUpdate }) => {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial snapshot fetch
  const fetchSnapshot = async () => {
    setIsLoadingSnapshot(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getTelemetrySnapshot();
      setTelemetry(data);
      if (onTelemetryUpdate) onTelemetryUpdate(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao obter snapshot de telemetria';
      setErrorMessage(msg);
    } finally {
      setIsLoadingSnapshot(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();

    const unsubscribe = sseClient.subscribeTelemetry(
      (data) => {
        setTelemetry(data);
        setIsConnected(true);
        setErrorMessage(null);
        setTickCount((prev) => prev + 1);
        if (onTelemetryUpdate) onTelemetryUpdate(data);
      },
      () => {
        setIsConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const getLoadColor = (pct: number) => {
    if (pct >= 90) return 'text-rose-400 bg-rose-500';
    if (pct >= 75) return 'text-amber-400 bg-amber-500';
    return 'text-emerald-400 bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Reconnection Warning */}
      {!isConnected && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Stream SSE Desconectado</p>
              <p className="text-xs text-amber-400/80">
                Tentando restabelecer conexão contínua com http://127.0.0.1:3001...
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchSnapshot}
            disabled={isLoadingSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshot ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CPU Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Carga do Processador</h3>
                <p className="text-[11px] font-mono text-zinc-300">
                  {telemetry?.cpu.cores || 0} Núcleos Virtuais
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-zinc-100">
                {telemetry ? `${telemetry.cpu.loadPercentage.toFixed(1)}%` : '--'}
              </span>
            </div>
          </div>

          {/* CPU Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  telemetry ? getLoadColor(telemetry.cpu.loadPercentage).split(' ')[1] : 'bg-zinc-700'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, telemetry?.cpu.loadPercentage || 0))}%` }}
              />
            </div>
            <p className="text-[11px] font-mono text-zinc-300 truncate" title={telemetry?.cpu.model}>
              {telemetry?.cpu.model || 'Identificando modelo...'}
            </p>
          </div>
        </div>

        {/* Memory Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Memória Física (RAM)</h3>
                <p className="text-[11px] font-mono text-zinc-300">
                  {telemetry ? `${formatBytes(telemetry.memory.usedBytes)} / ${formatBytes(telemetry.memory.totalBytes)}` : '--'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-zinc-100">
                {telemetry ? `${telemetry.memory.percentage.toFixed(1)}%` : '--'}
              </span>
            </div>
          </div>

          {/* Memory Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  telemetry ? getLoadColor(telemetry.memory.percentage).split(' ')[1] : 'bg-zinc-700'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, telemetry?.memory.percentage || 0))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-zinc-300">
              <span>Livre: {telemetry ? formatBytes(telemetry.memory.freeBytes) : '--'}</span>
              <span>Total: {telemetry ? formatBytes(telemetry.memory.totalBytes) : '--'}</span>
            </div>
          </div>
        </div>

        {/* Event Loop & Latency Card */}
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 shadow-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Latência do Event Loop</h3>
                <p className="text-[11px] font-mono text-zinc-300">Responsividade do Daemon</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-mono font-bold text-zinc-100">
                {telemetry ? `${telemetry.eventLoopLatencyMs.toFixed(1)}` : '--'}
                <span className="text-xs text-zinc-300 ml-1">ms</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs font-mono">
            <span className="text-zinc-300">Estado Operacional:</span>
            <span
              className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                telemetry?.status === 'nominal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : telemetry?.status === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {telemetry?.status || 'Carregando'}
            </span>
          </div>
        </div>
      </div>

      {/* System Details Card */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-zinc-200">Parâmetros de Ambiente & Host</h4>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ticks recebidos: {tickCount}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-300 block text-[10px] uppercase">Plataforma</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">
              {telemetry?.system.platform} ({telemetry?.system.arch})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-300 block text-[10px] uppercase">Release do SO</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block truncate">
              {telemetry?.system.release}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-300 block text-[10px] uppercase">Node.js Engine</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block">
              {telemetry?.system.nodeVersion} (PID: {telemetry?.system.pid})
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <span className="text-zinc-300 block text-[10px] uppercase">Tempo Ativo (Uptime)</span>
            <span className="text-zinc-200 font-semibold mt-0.5 block flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              {telemetry ? formatUptime(telemetry.system.uptimeSeconds) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
