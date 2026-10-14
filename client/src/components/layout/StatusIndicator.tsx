import React from 'react';
import { Wifi, WifiOff, Radio } from 'lucide-react';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  latencyMs?: number;
  lastHeartbeat?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  latencyMs,
  lastHeartbeat,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
          dotColor: 'bg-emerald-500',
          pingColor: 'bg-emerald-400',
          label: 'STREAM ATIVO',
          icon: Wifi,
        };
      case 'connecting':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          dotColor: 'bg-amber-500',
          pingColor: 'bg-amber-400',
          label: 'RECONECTANDO',
          icon: Radio,
        };
      case 'disconnected':
      default:
        return {
          color: 'text-rose-400',
          bgColor: 'bg-rose-500/10',
          borderColor: 'border-rose-500/30',
          dotColor: 'bg-rose-500',
          pingColor: 'bg-rose-400',
          label: 'OFFLINE',
          icon: WifiOff,
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const formattedHeartbeat = lastHeartbeat
    ? new Date(lastHeartbeat).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} transition-colors duration-200 select-none`}
      title={
        formattedHeartbeat
          ? `Status SSE: ${config.label} | Último tick: ${formattedHeartbeat}`
          : `Status SSE: ${config.label}`
      }
    >
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        {status === 'connected' && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.pingColor} opacity-75 animate-ping`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </div>

      <IconComponent className={`w-3.5 h-3.5 ${config.color}`} />

      <span className={`text-xs font-mono font-semibold tracking-wider ${config.color}`}>
        {config.label}
      </span>

      {status === 'connected' && typeof latencyMs === 'number' && (
        <span className="text-[11px] font-mono text-zinc-400 border-l border-zinc-700/60 pl-2">
          {latencyMs.toFixed(1)}ms
        </span>
      )}
    </div>
  );
};
