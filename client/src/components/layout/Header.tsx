import React from 'react';
import { StatusIndicator, type ConnectionStatus } from './StatusIndicator.js';
import { Shield, Server, Clock } from 'lucide-react';

export interface HeaderProps {
  connectionStatus: ConnectionStatus;
  latencyMs?: number;
  lastHeartbeat?: number;
  nodeVersion?: string;
  platform?: string;
  uptimeSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  latencyMs,
  lastHeartbeat,
  nodeVersion = 'v24.20.0',
  platform = 'win32 (x64)',
  uptimeSeconds = 0,
}) => {
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <header className="h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-6 flex items-center justify-between select-none sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/30">
            <Shield className="w-4 h-4 text-zinc-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-mono font-bold tracking-wider text-zinc-100">
                LARV
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                CORE
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-300 tracking-wider uppercase">
              Local Asset & Resource Vault
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-zinc-800 text-xs font-mono text-zinc-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800">
            <Server className="w-3 h-3 text-cyan-400" />
            <span>{platform}</span>
            <span className="text-zinc-300">•</span>
            <span>{nodeVersion}</span>
          </div>

          {uptimeSeconds > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Uptime: {formatUptime(uptimeSeconds)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <StatusIndicator
          status={connectionStatus}
          latencyMs={latencyMs}
          lastHeartbeat={lastHeartbeat}
        />
      </div>
    </header>
  );
};
