import React, { useState, useEffect } from 'react';
import type { SystemTelemetry, PipelineTask } from '@larv/shared';
import { Header } from './components/layout/Header.js';
import { Sidebar, type NavigationTab } from './components/layout/Sidebar.js';
import { TelemetryView } from './components/telemetry/TelemetryView.js';
import { VaultView } from './components/vault/VaultView.js';
import { PipelineView } from './components/pipeline/PipelineView.js';
import { sseClient } from './services/sse.client.js';
import { apiClient } from './services/api.client.js';
import type { ConnectionStatus } from './components/layout/StatusIndicator.js';
import { Terminal, Shield, Workflow, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('telemetry');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [latestTelemetry, setLatestTelemetry] = useState<SystemTelemetry | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | undefined>(undefined);
  const [assetCount, setAssetCount] = useState<number>(0);
  const [pipelines, setPipelines] = useState<PipelineTask[]>([]);

  // Global SSE listener for telemetry and connection heartbeat
  useEffect(() => {
    // Initial healthcheck
    apiClient
      .getHealth()
      .then(() => setConnectionStatus('connected'))
      .catch(() => setConnectionStatus('disconnected'));

    // Fetch initial asset count
    apiClient
      .listAssets()
      .then((res) => setAssetCount(res.total))
      .catch((err) => console.error('Erro ao obter total de assets:', err));

    // Fetch initial pipelines list
    apiClient
      .listPipelines()
      .then((res) => setPipelines(res))
      .catch((err) => console.error('Erro ao carregar catálogo de pipelines:', err));

    const unsubscribe = sseClient.subscribeTelemetry(
      (telemetry) => {
        setLatestTelemetry(telemetry);
        setConnectionStatus('connected');
        setLastHeartbeat(telemetry.timestamp);
      },
      () => {
        setConnectionStatus('connecting');
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const runningPipelinesCount = pipelines.filter((p) => p.status === 'running').length;

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Sticky Operational Header */}
      <Header
        connectionStatus={connectionStatus}
        latencyMs={latestTelemetry?.eventLoopLatencyMs}
        lastHeartbeat={lastHeartbeat}
        nodeVersion={latestTelemetry?.system.nodeVersion}
        platform={
          latestTelemetry
            ? `${latestTelemetry.system.platform} (${latestTelemetry.system.arch})`
            : undefined
        }
        uptimeSeconds={latestTelemetry?.system.uptimeSeconds}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          assetCount={assetCount}
          runningPipelinesCount={runningPipelinesCount}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 overflow-y-auto h-full p-8 pb-16 bg-zinc-950/40">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* View Switching */}
            {activeTab === 'telemetry' && (
              <TelemetryView
                onTelemetryUpdate={(t) => {
                  setLatestTelemetry(t);
                  setConnectionStatus('connected');
                }}
              />
            )}

            {activeTab === 'vault' && (
              <VaultView
                onAssetsChanged={(count) => {
                  setAssetCount(count);
                }}
              />
            )}

            {activeTab === 'pipelines' && <PipelineView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
