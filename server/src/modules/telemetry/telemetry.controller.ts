import type { FastifyReply, FastifyRequest } from 'fastify';
import { telemetryService } from './telemetry.service.js';
import { logger } from '../../core/logger.js';

export class TelemetryController {
  public async getSnapshot(_request: FastifyRequest, reply: FastifyReply) {
    const data = telemetryService.getTelemetry();
    return reply.status(200).send(data);
  }

  public async streamTelemetry(request: FastifyRequest, reply: FastifyReply) {
    const rawRes = reply.raw;

    rawRes.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    logger.info({ ip: request.ip }, 'SSE client connected to telemetry stream');

    // Send immediate first snapshot
    const initial = telemetryService.getTelemetry();
    rawRes.write(`event: telemetry:tick\ndata: ${JSON.stringify(initial)}\n\n`);

    const interval = setInterval(() => {
      try {
        const metrics = telemetryService.getTelemetry();
        rawRes.write(`event: telemetry:tick\ndata: ${JSON.stringify(metrics)}\n\n`);
      } catch (err) {
        logger.error({ err }, 'Error writing SSE telemetry tick');
        clearInterval(interval);
      }
    }, 1000);

    const heartbeat = setInterval(() => {
      try {
        rawRes.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    request.raw.on('close', () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      logger.info({ ip: request.ip }, 'SSE client disconnected from telemetry stream');
    });
  }
}

export const telemetryController = new TelemetryController();
