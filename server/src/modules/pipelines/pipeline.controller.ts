import type { FastifyReply, FastifyRequest } from 'fastify';
import { pipelineRunner } from './pipeline.runner.js';
import { RunPipelineSchema } from '@larv/shared';
import { ValidationError } from '../../core/errors/app-error.js';
import { logger } from '../../core/logger.js';

export class PipelineController {
  public async list(_request: FastifyRequest, reply: FastifyReply) {
    const list = pipelineRunner.getPipelines();
    return reply.status(200).send(list);
  }

  public async run(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const body = (request.body as any) || {};

    const parseResult = RunPipelineSchema.safeParse({
      pipelineId: id,
      params: body.params,
    });

    if (!parseResult.success) {
      throw new ValidationError('Invalid pipeline parameters', parseResult.error.format());
    }

    const executionId = await pipelineRunner.executePipeline(id, parseResult.data.params);
    return reply.status(202).send({
      pipelineId: id,
      executionId,
      status: 'started',
      message: `Pipeline '${id}' execution initiated.`,
    });
  }

  public async streamLogs(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    pipelineRunner.getPipelineById(id); // Validates existence or throws 404

    const rawRes = reply.raw;
    rawRes.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    logger.info({ pipelineId: id, ip: request.ip }, 'Client connected to pipeline logs SSE stream');

    rawRes.write(`: connected to pipeline ${id} log stream\n\n`);

    const onStart = (data: any) => {
      rawRes.write(`event: pipeline:start\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const onChunk = (data: any) => {
      rawRes.write(`event: pipeline:chunk\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const onEnd = (data: any) => {
      rawRes.write(`event: pipeline:end\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const startEvent = `pipeline:${id}:start`;
    const chunkEvent = `pipeline:${id}:chunk`;
    const endEvent = `pipeline:${id}:end`;

    pipelineRunner.on(startEvent, onStart);
    pipelineRunner.on(chunkEvent, onChunk);
    pipelineRunner.on(endEvent, onEnd);

    request.raw.on('close', () => {
      pipelineRunner.off(startEvent, onStart);
      pipelineRunner.off(chunkEvent, onChunk);
      pipelineRunner.off(endEvent, onEnd);
      logger.info({ pipelineId: id, ip: request.ip }, 'Client disconnected from pipeline logs SSE stream');
    });
  }
}

export const pipelineController = new PipelineController();
