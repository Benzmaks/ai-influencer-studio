import { Queue, Worker } from 'bullmq';
import { db } from '@/lib/db';
import { processGeneration } from './processor';
export const QUEUE_NAME = process.env.IMAGE_QUEUE_NAME ?? 'studio-images';
export function redisConnection() {
  const value = process.env.REDIS_URL;
  if (!value) throw new Error('REDIS_URL is missing. Start Redis and configure the worker.');
  const u = new URL(value);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: Number(u.pathname.slice(1) || 0),
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    connectTimeout: 3000,
  };
}
export async function deliverOutbox(queue: Queue) {
  const rows = await db.generationOutbox.findMany({
    where: {
      generation: { status: { in: ['queued', 'processing'] } },
      OR: [{ deliveredAt: null }, { deliveredAt: { lt: new Date(Date.now() - 15000) } }],
    },
    take: 50,
    include: { generation: true },
  });
  for (const row of rows) {
    if (row.generation.leaseUntil && row.generation.leaseUntil > new Date()) continue;
    await queue.add(
      'generate',
      { generationId: row.generationId },
      {
        jobId: row.generationId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    // A crash before this update only repeats queue delivery. DB fencing prevents duplicate output commits.
    await db.generationOutbox.updateMany({
      where: { id: row.id },
      data: { deliveredAt: new Date() },
    });
  }
}
export function imageWorker() {
  return new Worker(
    QUEUE_NAME,
    async (job) => {
      await processGeneration(job.data.generationId);
    },
    {
      connection: redisConnection(),
      concurrency: 2,
      lockDuration: 30000,
      stalledInterval: 5000,
      maxStalledCount: 2,
    },
  );
}
