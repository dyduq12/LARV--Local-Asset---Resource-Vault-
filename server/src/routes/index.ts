import type { FastifyInstance } from 'fastify';
import { telemetryController } from '../modules/telemetry/telemetry.controller.js';
import { assetController } from '../modules/assets/asset.controller.js';
import { pipelineController } from '../modules/pipelines/pipeline.controller.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // System Healthcheck
  app.get('/api/v1/health', async () => ({
    status: 'ok',
    service: 'LARV Core API',
    timestamp: Date.now(),
  }));

  // Telemetry Module
  app.get('/api/v1/telemetry/snapshot', telemetryController.getSnapshot.bind(telemetryController));
  app.get('/api/v1/telemetry/stream', telemetryController.streamTelemetry.bind(telemetryController));

  // Assets Module
  app.get('/api/v1/assets', assetController.list.bind(assetController));
  app.get('/api/v1/assets/:id', assetController.getById.bind(assetController));
  app.post('/api/v1/assets', assetController.create.bind(assetController));
  app.put('/api/v1/assets/:id', assetController.update.bind(assetController));
  app.delete('/api/v1/assets/:id', assetController.delete.bind(assetController));

  // Pipelines Module
  app.get('/api/v1/pipelines', pipelineController.list.bind(pipelineController));
  app.post('/api/v1/pipelines/:id/run', pipelineController.run.bind(pipelineController));
  app.get('/api/v1/pipelines/:id/logs/stream', pipelineController.streamLogs.bind(pipelineController));
}
