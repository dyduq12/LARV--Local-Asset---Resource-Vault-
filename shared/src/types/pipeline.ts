export type PipelineStatus = 'idle' | 'running' | 'success' | 'failed';

export interface PipelineTask {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'maintenance' | 'security' | 'formatting';
  status: PipelineStatus;
  lastRunAt?: string;
  lastDurationMs?: number;
}

export type PipelineStreamType = 'stdout' | 'stderr' | 'system';

export interface PipelineLogChunk {
  pipelineId: string;
  executionId: string;
  stream: PipelineStreamType;
  data: string;
  timestamp: number;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  executionId: string;
  status: 'success' | 'failed';
  exitCode: number;
  durationMs: number;
  completedAt: string;
}
