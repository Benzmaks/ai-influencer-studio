import 'dotenv/config';
import { Queue } from 'bullmq';
import { db } from '@/lib/db';
import { readEnvironment } from '@/lib/env';
import { QUEUE_NAME, redisConnection, deliverOutbox, imageWorker } from './queue';
readEnvironment();
const queue = new Queue(QUEUE_NAME, { connection: redisConnection() });
const worker = imageWorker();
let busy = false,
  closing = false;
worker.on('error', () =>
  console.error('Image worker connection needs attention. Check PostgreSQL and REDIS_URL.'),
);
queue.on('error', () =>
  console.error('Image queue unavailable. Jobs remain durable in PostgreSQL; start Redis.'),
);
async function tick() {
  if (busy || closing) return;
  busy = true;
  try {
    await deliverOutbox(queue);
  } catch {
    console.error('Outbox delivery waiting for PostgreSQL/Redis. Durable requests are retained.');
  } finally {
    busy = false;
  }
}
const timer = setInterval(() => void tick(), 1000);
void tick();
console.log('Mock image worker started. No paid providers enabled.');
async function stop() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  await worker.close();
  await queue.close();
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
