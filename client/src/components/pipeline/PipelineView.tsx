import React, { useEffect, useState, useRef } from 'react';
import type { PipelineTask, PipelineLogChunk } from '@larv/shared';
import { apiClient } from '../../services/api.client.js';
import { sseClient } from '../../services/sse.client.js';
import {
  Play,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
  Database,
  SearchCode,
  Radio,
} from 'lucide-react';

export const PipelineView: React.FC = () => {
  const [pipelines, setPipelines] = useState<PipelineTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
  const [logs, setLogs] = useState<PipelineLogChunk[]>([]);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const loadPipelines = async () => {
    try {
      const data = await apiClient.listPipelines();
      setPipelines(data);
    } catch (err: unknown) {
      console.error('Falha ao carregar catálogo de pipelines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelines();
  }, []);

  // Auto-scroll terminal on new logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRunPipeline = async (pipelineId: string) => {
    if (runningPipelineId) return;

    setRunningPipelineId(pipelineId);
    setActiveSubscriptionId(pipelineId);

    // Initial system entry
    setLogs((prev) => [
      ...prev,
      {
        pipelineId,
        executionId: 'pending',
        stream: 'system',
        data: `\n[RUNNER] Iniciando disparador para '${pipelineId}'...\n`,
        timestamp: Date.now(),
      },
    ]);

    // Setup SSE subscription
    const unsubscribe = sseClient.subscribePipelineLogs(pipelineId, {
      onStart: (startData) => {
        setLogs((prev) => [
          ...prev,
          {
            pipelineId,
            executionId: startData.executionId,
            stream: 'system',
            data: `[SSE] Canal de logs conectado. Execução: ${startData.executionId}\n`,
            timestamp: startData.timestamp,
          },
        ]);
      },
      onChunk: (chunk) => {
        setLogs((prev) => [...prev, chunk]);
      },
      onEnd: (endData) => {
        setLogs((prev) => [
          ...prev,
          {
            pipelineId,
            executionId: endData.executionId,
            stream: endData.status === 'success' ? 'system' : 'stderr',
            data: `[STATUS] Pipeline finalizado em ${endData.durationMs}ms com código ${endData.exitCode}.\n`,
            timestamp: Date.now(),
          },
        ]);
        setRunningPipelineId(null);
        loadPipelines();
        unsubscribe();
      },
      onError: () => {
        setLogs((prev) => [
          ...prev,
          {
            pipelineId,
            executionId: 'err',
            stream: 'stderr',
            data: `[ERRO] Conexão SSE interrompida ou encerrada.\n`,
            timestamp: Date.now(),
          },
        ]);
        setRunningPipelineId(null);
        unsubscribe();
      },
    });

    try {
      await apiClient.runPipeline(pipelineId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao despachar execução';
      setLogs((prev) => [
        ...prev,
        {
          pipelineId,
          executionId: 'err',
          stream: 'stderr',
          data: `[FATAL] Erro de disparo: ${msg}\n`,
          timestamp: Date.now(),
        },
      ]);
      setRunningPipelineId(null);
      unsubscribe();
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleCopyLogs = async () => {
    const raw = logs.map((l) => l.data).join('');
    try {
      await navigator.clipboard.writeText(raw);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch (e) {
      console.error('Falha ao copiar logs:', e);
    }
  };

  const getPipelineIcon = (id: string) => {
    switch (id) {
      case 'integrity-check':
        return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'local-backup':
        return <Database className="w-4 h-4 text-cyan-400" />;
      case 'text-formatter':
        return <SearchCode className="w-4 h-4 text-purple-400" />;
      default:
        return <Terminal className="w-4 h-4 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Automações & Pipelines de Manutenção
          </h2>
          <p className="text-xs text-zinc-300 mt-0.5">
            Disparadores de scripts locais com saída visual de streaming em tempo real via SSE
          </p>
        </div>

        <button
          type="button"
          onClick={loadPipelines}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-zinc-100 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recarregar Tarefas
        </button>
      </div>

      {/* Pipelines Trigger Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipelines.map((pipeline) => {
          const isRunning = runningPipelineId === pipeline.id;

          return (
            <div
              key={pipeline.id}
              className={`p-5 rounded-2xl bg-zinc-900/60 border transition-all duration-200 flex flex-col justify-between ${
                isRunning
                  ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                      {getPipelineIcon(pipeline.id)}
                    </span>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold">
                      {pipeline.category}
                    </span>
                  </div>

                  {isRunning && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 font-semibold animate-pulse">
                      <Radio className="w-3 h-3 text-cyan-400" />
                      STREAMING
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-zinc-100 mb-1">{pipeline.name}</h3>
                <p className="text-xs text-zinc-300 line-clamp-2 mb-3">
                  {pipeline.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-3">
                <div className="text-[11px] font-mono text-zinc-300 truncate" title={pipeline.command}>
                  <span className="text-zinc-300">$ </span>
                  {pipeline.command}
                </div>

                <button
                  type="button"
                  disabled={Boolean(runningPipelineId)}
                  onClick={() => handleRunPipeline(pipeline.id)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isRunning
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-wait'
                      : runningPipelineId
                      ? 'bg-zinc-800/50 text-zinc-300 border border-zinc-800 cursor-not-allowed'
                      : 'bg-zinc-800 hover:bg-cyan-600 text-zinc-100 hover:text-zinc-950 border border-zinc-700 hover:border-cyan-500 shadow-sm'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Disparar Pipeline</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Terminal Console */}
      <div className="rounded-2xl border border-zinc-800 bg-black/95 shadow-2xl overflow-hidden font-mono">
        {/* Terminal Title Bar */}
        <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-semibold text-zinc-300 ml-2">
              LARV EMBEDDED CONSOLE
            </span>
            {activeSubscriptionId && (
              <span className="text-[10px] text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                Alvo: {activeSubscriptionId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-40"
              title="Copiar saída do console"
            >
              {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 transition-colors disabled:opacity-40"
              title="Limpar console"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Console Screen Output */}
        <div className="p-4 h-80 overflow-y-auto text-xs leading-relaxed space-y-0.5 select-text">
          {logs.length === 0 ? (
            <div className="text-zinc-300 text-center py-24 select-none">
              <Terminal className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Nenhuma execução em andamento. Selecione um pipeline acima para iniciar o streaming.</span>
            </div>
          ) : (
            logs.map((chunk, idx) => {
              let streamClass = 'text-zinc-300';
              if (chunk.stream === 'system') streamClass = 'text-cyan-400 font-semibold';
              if (chunk.stream === 'stderr') streamClass = 'text-rose-400 font-semibold';

              return (
                <div key={idx} className="whitespace-pre-wrap font-mono">
                  <span className={streamClass}>{chunk.data}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Status Footer */}
        <div className="px-4 py-2 bg-zinc-900/60 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sandbox Local Isolada • Stdout/Stderr Redirecionados via SSE</span>
          </div>
          <div>Linhas no buffer: {logs.length}</div>
        </div>
      </div>
    </div>
  );
};
