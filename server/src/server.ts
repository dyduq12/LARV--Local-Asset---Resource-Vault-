import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { AppError } from './core/errors/app-error.js';
import { initializeDatabase } from './config/database.js';
import { registerRoutes } from './routes/index.js';
import { assetRepository } from './modules/assets/asset.repository.js';
import type { Asset } from '@larv/shared';

export async function buildServer() {
  const server = Fastify({
    logger: false, // Using our own structured pino logger
    trustProxy: true,
  });

  // Enable CORS for local-first desktop/web clients
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and local file/tool origins
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        cb(null, true);
        return;
      }
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global Error Handler
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      logger.warn({ err: error, url: request.url }, `Handled application error [${error.code}]`);
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      logger.warn({ err: error, url: request.url }, `Client request error [${error.statusCode}]`);
      return reply.status(error.statusCode).send({
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }

    logger.error({ err: error, url: request.url }, 'Unhandled server exception');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    });
  });

  // 404 Handler
  server.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${request.method} ${request.url} does not exist.`,
      },
    });
  });

  // Register domain routes
  await registerRoutes(server);

  return server;
}

function seedInitialDataIfEmpty() {
  const { total } = assetRepository.findAll({});
  if (total === 0) {
    logger.info('Vault is empty. Seeding foundational production snippets...');

    const seeds: Asset[] = [
      {
        id: 'seed-docker-compose',
        title: 'Production Docker Compose Template',
        description: 'Multi-stage production setup with Redis, Postgres 16 and healthchecks.',
        category: 'config',
        language: 'yaml',
        content: `version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    restart: always\n    environment:\n      POSTGRES_USER: larv_user\n      POSTGRES_PASSWORD: \${POSTGRES_SECRET}\n      POSTGRES_DB: vault\n    ports:\n      - "5432:5432"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U larv_user"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n\nvolumes:\n  pgdata:\n`,
        tags: ['docker', 'devops', 'postgres', 'production'],
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'seed-fastify-sse',
        title: 'Fastify Resilient SSE Handler Pattern',
        description: 'Zero-dependency Server-Sent Events controller with keep-alive heartbeats and graceful tear down.',
        category: 'snippet',
        language: 'typescript',
        content: `export async function sseHandler(request: FastifyRequest, reply: FastifyReply) {\n  const raw = reply.raw;\n  raw.writeHead(200, {\n    'Content-Type': 'text/event-stream',\n    'Cache-Control': 'no-cache',\n    'Connection': 'keep-alive',\n  });\n\n  const timer = setInterval(() => {\n    raw.write(\`event: tick\\\\ndata: \${JSON.stringify({ now: Date.now() })}\\\\n\\\\n\`);\n  }, 1000);\n\n  request.raw.on('close', () => clearInterval(timer));\n}`,
        tags: ['fastify', 'typescript', 'sse', 'realtime'],
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'seed-security-audit',
        title: 'Local Security Audit & Sanitization Script',
        description: 'PowerShell snippet to audit listening ports and identify unauthorized sockets.',
        category: 'snippet',
        language: 'powershell',
        content: `Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess, @{Name="ProcessName";Expression={(Get-Process -Id $_.OwningProcess).ProcessName}} | Format-Table -AutoSize`,
        tags: ['security', 'windows', 'powershell', 'networking'],
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const seed of seeds) {
      assetRepository.create(seed);
    }
    logger.info(`Seeded ${seeds.length} initial assets.`);
  }
}

async function start() {
  try {
    initializeDatabase();
    seedInitialDataIfEmpty();

    const server = await buildServer();

    await server.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`LARV Core Server running at http://${env.HOST}:${env.PORT}`);
    logger.info(`Telemetry Snapshot: http://${env.HOST}:${env.PORT}/api/v1/telemetry/snapshot`);
    logger.info(`Telemetry Stream (SSE): http://${env.HOST}:${env.PORT}/api/v1/telemetry/stream`);
    logger.info(`Vault Assets: http://${env.HOST}:${env.PORT}/api/v1/assets`);
    logger.info(`Pipelines: http://${env.HOST}:${env.PORT}/api/v1/pipelines`);

    const handleSignal = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      await server.close();
      const db = initializeDatabase();
      db.close();
      logger.info('Clean shutdown completed.');
      process.exit(0);
    };

    process.on('SIGINT', () => handleSignal('SIGINT'));
    process.on('SIGTERM', () => handleSignal('SIGTERM'));
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

// Only start directly if this module is being executed directly
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  start();
}
