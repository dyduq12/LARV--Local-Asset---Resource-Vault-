import EventEmitter from 'node:events';
import crypto from 'node:crypto';
import { pipelineRegistry, type RegisteredPipeline } from './pipeline.registry.js';
import { initializeDatabase } from '../../config/database.js';
import { NotFoundError } from '../../core/errors/app-error.js';
import { logger } from '../../core/logger.js';
import type {
  PipelineTask,
  PipelineLogChunk,
  PipelineExecutionResult,
} from '@larv/shared';

class PipelineRunnerService extends EventEmitter {
  private activeExecutions = new Map<string, { pipelineId: string; startedAt: number }>();

  public getPipelines(): PipelineTask[] {
    const list: PipelineTask[] = [];
    for (const p of pipelineRegistry.values()) {
      list.push({
        id: p.id,
        name: p.name,
        description: p.description,
        command: p.command,
        category: p.category,
        status: p.status,
        lastRunAt: p.lastRunAt,
        lastDurationMs: p.lastDurationMs,
      });
    }
    return list;
  }

  public getPipelineById(id: string): RegisteredPipeline {
    const pipeline = pipelineRegistry.get(id);
    if (!pipeline) {
      throw new NotFoundError(`Pipeline with ID '${id}' not found`);
    }
    return pipeline;
  }

  public async executePipeline(pipelineId: string, params?: Record<string, any>): Promise<string> {
    const pipeline = this.getPipelineById(pipelineId);

    if (pipeline.status === 'running') {
      throw new Error(`Pipeline '${pipelineId}' is already running`);
    }

    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    pipeline.status = 'running';
    this.activeExecutions.set(executionId, { pipelineId, startedAt: startTime });

    // Emit start event
    this.emit(`pipeline:${pipelineId}:start`, {
      pipelineId,
      executionId,
      timestamp: startTime,
    });

    // Run asynchronously
    (async () => {
      let exitCode = 0;
      let status: 'success' | 'failed' = 'success';

      const emitChunk = (stream: 'stdout' | 'stderr' | 'system', data: string) => {
        const chunk: PipelineLogChunk = {
          pipelineId,
          executionId,
          stream,
          data,
          timestamp: Date.now(),
        };
        this.emit(`pipeline:${pipelineId}:chunk`, chunk);
      };

      try {
        await pipeline.handler(emitChunk, params);
      } catch (err: any) {
        status = 'failed';
        exitCode = 1;
        emitChunk('stderr', `[FATAL] Pipeline execution failed: ${err.message}\n`);
        logger.error({ err, pipelineId, executionId }, 'Pipeline execution caught error');
      } finally {
        const endTime = Date.now();
        const durationMs = endTime - startTime;

        pipeline.status = status;
        pipeline.lastRunAt = new Date(endTime).toISOString();
        pipeline.lastDurationMs = durationMs;

        this.activeExecutions.delete(executionId);

        const result: PipelineExecutionResult = {
          pipelineId,
          executionId,
          status,
          exitCode,
          durationMs,
          completedAt: pipeline.lastRunAt,
        };

        // Record history in SQLite
        try {
          const db = initializeDatabase();
          db.prepare(
            `INSERT INTO pipeline_history (execution_id, pipeline_id, status, exit_code, duration_ms, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(executionId, pipelineId, status, exitCode, durationMs, pipeline.lastRunAt);
        } catch (dbErr) {
          logger.warn({ dbErr }, 'Failed to record pipeline execution history');
        }

        this.emit(`pipeline:${pipelineId}:end`, result);
      }
    })();

    return executionId;
  }
}

export const pipelineRunner = new PipelineRunnerService();
