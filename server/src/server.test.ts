import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';
import { buildServer } from './server.js';
import { initializeDatabase } from './config/database.js';
import type { FastifyInstance } from 'fastify';

describe('LARV Core Backend Test Suite', () => {
  let app: FastifyInstance;

  before(async () => {
    initializeDatabase();
    app = await buildServer();
    await app.ready();
  });

  after(async () => {
    // Wait briefly for asynchronous background pipeline tasks to complete before closing db
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await app.close();
    const db = initializeDatabase();
    db.close();
  });

  test('GET /api/v1/health returns status ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'LARV Core API');
    assert.ok(typeof body.timestamp === 'number');
  });

  test('GET /api/v1/telemetry/snapshot returns real hardware metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/telemetry/snapshot',
    });

    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.payload);

    // CPU Metrics validation
    assert.ok(typeof body.cpu.loadPercentage === 'number');
    assert.ok(body.cpu.cores > 0);
    assert.ok(typeof body.cpu.model === 'string');

    // Memory Metrics validation
    assert.ok(body.memory.totalBytes > 0);
    assert.ok(body.memory.usedBytes > 0);
    assert.ok(body.memory.percentage >= 0 && body.memory.percentage <= 100);

    // System info validation
    assert.ok(typeof body.system.platform === 'string');
    assert.ok(body.system.uptimeSeconds >= 0);
    assert.ok(['nominal', 'warning', 'critical'].includes(body.status));
  });

  test('Asset CRUD lifecycle and validation', async () => {
    // 1. List assets
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
    });
    assert.strictEqual(listRes.statusCode, 200);
    const initialList = JSON.parse(listRes.payload);
    assert.ok(Array.isArray(initialList.items));

    // 2. Create asset
    const newAssetPayload = {
      title: 'Automated Test Snippet',
      description: 'Created during test suite run',
      category: 'snippet',
      language: 'typescript',
      content: 'console.log("integration-test-ok");',
      tags: ['Test', 'TypeScript', 'Automated'],
      isPinned: true,
    };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      payload: newAssetPayload,
    });
    assert.strictEqual(createRes.statusCode, 201);
    const created = JSON.parse(createRes.payload);
    assert.ok(created.id);
    assert.strictEqual(created.title, newAssetPayload.title);
    assert.strictEqual(created.language, 'typescript');
    assert.strictEqual(created.isPinned, true);
    // Tags normalized in lowercase
    assert.deepStrictEqual(created.tags, ['test', 'typescript', 'automated']);

    // 3. Get asset by ID
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assets/${created.id}`,
    });
    assert.strictEqual(getRes.statusCode, 200);
    const fetched = JSON.parse(getRes.payload);
    assert.strictEqual(fetched.id, created.id);

    // 4. Update asset
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/assets/${created.id}`,
      payload: {
        title: 'Updated Test Snippet Title',
        isPinned: false,
      },
    });
    assert.strictEqual(updateRes.statusCode, 200);
    const updated = JSON.parse(updateRes.payload);
    assert.strictEqual(updated.title, 'Updated Test Snippet Title');
    assert.strictEqual(updated.isPinned, false);

    // 5. Delete asset
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/assets/${created.id}`,
    });
    assert.strictEqual(deleteRes.statusCode, 200);
    const deleteBody = JSON.parse(deleteRes.payload);
    assert.strictEqual(deleteBody.success, true);
    assert.strictEqual(deleteBody.id, created.id);

    // 6. Verify 404 after deletion
    const verifyNotFoundRes = await app.inject({
      method: 'GET',
      url: `/api/v1/assets/${created.id}`,
    });
    assert.strictEqual(verifyNotFoundRes.statusCode, 404);

    // 7. Validation rejection on invalid creation payload
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      payload: {
        title: '', // Invalid empty title
        category: 'snippet',
        language: 'ts',
        content: '',
      },
    });
    assert.strictEqual(invalidRes.statusCode, 422);
  });

  test('Pipelines catalog and execution trigger', async () => {
    // 1. List pipelines
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/pipelines',
    });
    assert.strictEqual(listRes.statusCode, 200);
    const pipelines = JSON.parse(listRes.payload);
    assert.ok(Array.isArray(pipelines));
    assert.ok(pipelines.some((p: any) => p.id === 'integrity-check'));
    assert.ok(pipelines.some((p: any) => p.id === 'local-backup'));

    // 2. Trigger pipeline execution
    const runRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pipelines/integrity-check/run',
      payload: {},
    });
    assert.strictEqual(runRes.statusCode, 202);
    const runBody = JSON.parse(runRes.payload);
    assert.strictEqual(runBody.status, 'started');
    assert.strictEqual(runBody.pipelineId, 'integrity-check');
    assert.ok(runBody.executionId);
  });
});
