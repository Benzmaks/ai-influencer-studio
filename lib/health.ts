import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { db } from './db';
import { readEnvironment } from './env';
export async function health() {
  const checks: Record<string, string> = {};
  try {
    readEnvironment();
    checks.configuration = 'ready';
  } catch (e) {
    checks.configuration = e instanceof Error ? e.message : 'Invalid configuration';
  }
  try {
    await db.$queryRaw`SELECT 1`;
    await db.project.count();
    await db.storyboard.count();
    await db.videoAsset.count();
    checks.postgresql = 'ready';
  } catch {
    checks.postgresql = 'Start PostgreSQL, check DATABASE_URL and run npm run db:migrate.';
  }
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  redis.on('error', () => {});
  try {
    await redis.connect();
    await redis.ping();
    checks.redis = 'ready';
  } catch {
    checks.redis = 'Start Redis and check REDIS_URL.';
  } finally {
    redis.disconnect();
  }
  try {
    const root = path.resolve(process.env.LOCAL_STORAGE_DIR ?? '.local/assets');
    await mkdir(root, { recursive: true });
    const probe = path.join(root, `.probe-${randomUUID()}`);
    await writeFile(probe, 'health', { flag: 'wx', mode: 0o600 });
    await unlink(probe);
    checks.storage = 'ready';
  } catch {
    checks.storage = 'Check LOCAL_STORAGE_DIR exists and is writable.';
  }
  return { ready: Object.values(checks).every((s) => s === 'ready'), checks };
}
