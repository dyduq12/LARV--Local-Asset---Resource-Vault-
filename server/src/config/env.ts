import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';

// Load .env relative to current working directory or server folder
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('127.0.0.1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_PATH: z.string().default('./data/larv.db'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parseResult = EnvSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:');
  console.error(JSON.stringify(parseResult.error.format(), null, 2));
  process.exit(1);
}

export const env = {
  ...parseResult.data,
  RESOLVED_DB_PATH: path.resolve(process.cwd(), parseResult.data.DATABASE_PATH),
};
