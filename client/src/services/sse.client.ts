import type {
  PipelineExecutionResult,
  PipelineLogChunk,
  SystemTelemetry,
} from '@larv/shared';

export interface PipelineLogStreamHandlers {
  onStart?: (data: { pipelineId: string; executionId: string; timestamp: number }) => void;
  onChunk?: (chunk: PipelineLogChunk) => void;
  onEnd?: (result: PipelineExecutionResult) => void;
  onError?: (event: Event) => void;
}

export type UnsubscribeFn = () => void;

class SseClient {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:3001/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Subscribes to real-time hardware telemetry stream.
   * Emits structured metrics every 1000ms.
   */
  public subscribeTelemetry(
    onTick: (telemetry: SystemTelemetry) => void,
    onError?: (event: Event) => void
  ): UnsubscribeFn {
    const url = `${this.baseUrl}/telemetry/stream`;
    const eventSource = new EventSource(url);

    const handleTick = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as SystemTelemetry;
        onTick(parsed);
      } catch (err: unknown) {
        console.error('Failed to parse SSE telemetry payload:', err);
      }
    };

    const handleError = (event: Event) => {
      if (onError) {
        onError(event);
      }
    };

    eventSource.addEventListener('telemetry:tick', handleTick as EventListener);
    eventSource.addEventListener('error', handleError);

    return () => {
      eventSource.removeEventListener('telemetry:tick', handleTick as EventListener);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }

  /**
   * Subscribes to real-time execution log output for a specific pipeline task.
   * Handles start, streaming stdout/stderr chunks and execution termination.
   */
  public subscribePipelineLogs(
    pipelineId: string,
    handlers: PipelineLogStreamHandlers
  ): UnsubscribeFn {
    const url = `${this.baseUrl}/pipelines/${encodeURIComponent(pipelineId)}/logs/stream`;
    const eventSource = new EventSource(url);

    const handleStart = (event: MessageEvent<string>) => {
      if (!handlers.onStart) return;
      try {
        const parsed = JSON.parse(event.data) as {
          pipelineId: string;
          executionId: string;
          timestamp: number;
        };
        handlers.onStart(parsed);
      } catch (err: unknown) {
        console.error('Failed to parse pipeline:start payload:', err);
      }
    };

    const handleChunk = (event: MessageEvent<string>) => {
      if (!handlers.onChunk) return;
      try {
        const parsed = JSON.parse(event.data) as PipelineLogChunk;
        handlers.onChunk(parsed);
      } catch (err: unknown) {
        console.error('Failed to parse pipeline:chunk payload:', err);
      }
    };

    const handleEnd = (event: MessageEvent<string>) => {
      if (!handlers.onEnd) return;
      try {
        const parsed = JSON.parse(event.data) as PipelineExecutionResult;
        handlers.onEnd(parsed);
      } catch (err: unknown) {
        console.error('Failed to parse pipeline:end payload:', err);
      }
    };

    const handleError = (event: Event) => {
      if (handlers.onError) {
        handlers.onError(event);
      }
    };

    eventSource.addEventListener('pipeline:start', handleStart as EventListener);
    eventSource.addEventListener('pipeline:chunk', handleChunk as EventListener);
    eventSource.addEventListener('pipeline:end', handleEnd as EventListener);
    eventSource.addEventListener('error', handleError);

    return () => {
      eventSource.removeEventListener('pipeline:start', handleStart as EventListener);
      eventSource.removeEventListener('pipeline:chunk', handleChunk as EventListener);
      eventSource.removeEventListener('pipeline:end', handleEnd as EventListener);
      eventSource.removeEventListener('error', handleError);
      eventSource.close();
    };
  }
}

export const sseClient = new SseClient();
