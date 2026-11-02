import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { LocalStorage } from '@/storage/local';
import { mockImage } from '@/ai/mock';
import type { ImageProvider } from '@/ai/contracts';
import type { StorageProvider } from '@/storage/contracts';
import { generationInput } from '@/features/generation/schema';
export const LEASE_MS = 30000;
export async function processGeneration(
  id: string,
  options: {
    provider?: ImageProvider;
    storage?: StorageProvider;
    afterStore?: () => Promise<void>;
  } = {},
) {
  const token = randomUUID(),
    now = new Date();
  const acquired = await db.generation.updateMany({
    where: {
      id,
      status: { in: ['queued', 'processing'] },
      cancelRequested: false,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    data: { status: 'processing', leaseToken: token, leaseUntil: new Date(Date.now() + LEASE_MS) },
  });
  if (!acquired.count) return;
  const job = await db.generation.findUniqueOrThrow({ where: { id } });
  const parsed = generationInput.strip().safeParse(job.input);
  if (!parsed.success) {
    await db.generation.updateMany({
      where: { id, leaseToken: token },
      data: {
        status: 'failed',
        error: 'Invalid stored generation settings.',
        leaseToken: null,
        leaseUntil: null,
      },
    });
    await db.imageAsset.updateMany({
      where: { generationId: id, status: 'pending' },
      data: { status: 'failed', error: 'Invalid stored settings.' },
    });
    return;
  }
  const data = parsed.data,
    snapshot = job.input as Record<string, unknown>;
  const provider = options.provider ?? mockImage,
    storage = options.storage ?? new LocalStorage();
  const actor = { userId: job.createdBy, projectId: job.projectId };
  const fence = { id, leaseToken: token, status: 'processing', cancelRequested: false };
  let stopped = false;
  const heartbeat = setInterval(() => {
    void db.generation
      .updateMany({ where: fence, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } })
      .then((r) => {
        if (!r.count) stopped = true;
      })
      .catch(() => {
        stopped = true;
      });
  }, 5000);
  heartbeat.unref();
  try {
    // Only this registered zero-cost mock is enabled. Future paid adapters require durable provider idempotency/reconciliation first.
    if (provider.capabilities.id !== 'mock-image' || !provider.capabilities.mock)
      throw new Error('Paid or unregistered providers are disabled.');
    await requireMembership(actor.userId, actor.projectId, 'write');
    let source: Uint8Array | undefined;
    if (data.sourceAssetId) {
      const a = await db.imageAsset.findFirstOrThrow({
        where: { id: data.sourceAssetId, projectId: job.projectId, status: 'completed' },
      });
      source = await storage.read(actor, a.key!);
    }
    const assets = await db.imageAsset.findMany({
      where: { generationId: id },
      orderBy: { index: 'asc' },
    });
    for (const asset of assets) {
      if (asset.status !== 'pending') continue;
      if (asset.attempts >= 3) {
        await db.$transaction(async (tx) => {
          const valid = await tx.generation.updateMany({
            where: fence,
            data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
          });
          if (valid.count)
            await tx.imageAsset.updateMany({
              where: { id: asset.id, status: 'pending' },
              data: {
                status: 'failed',
                error: 'Interrupted after the attempt limit. Retry explicitly.',
              },
            });
        });
        continue;
      }

      for (let attempt = asset.attempts; attempt < 3; attempt++) {
        if (stopped) return;
        const claimed = await db.generation.updateMany({
          where: fence,
          data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
        });
        if (!claimed.count) return;
        await db.imageAsset.updateMany({
          where: { id: asset.id, status: 'pending' },
          data: { attempts: attempt + 1 },
        });
        let stored: Awaited<ReturnType<StorageProvider['put']>> | undefined;
        try {
          const input = {
            prompt: String(snapshot.positive),
            negativePrompt: String(snapshot.negative),
            model: data.model,
            count: 1,
            seed: data.seed + asset.index,
            aspectRatio: data.aspectRatio,
            variationStrength: data.variationStrength,
            source,
          };
          const outputs = await (source
            ? provider.createVariations(input)
            : provider.generate(input));
          if (outputs.length !== 1 || !outputs[0].mock)
            throw new Error('Unexpected provider output.');
          stored = await storage.put(actor, outputs[0].bytes, outputs[0].mimeType);
          await options.afterStore?.();
          const committed = await db.$transaction(async (tx) => {
            const valid = await tx.generation.updateMany({
              where: fence,
              data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
            });
            if (!valid.count) return false;
            await tx.imageAsset.updateMany({
              where: { id: asset.id, status: 'pending' },
              data: { status: 'completed', ...stored, error: null },
            });
            const done = await tx.imageAsset.count({
              where: { generationId: id, status: { in: ['completed', 'failed'] } },
            });
            await tx.generation.updateMany({
              where: fence,
              data: { progress: Math.floor((done / data.count) * 100) },
            });
            return true;
          });
          if (!committed) {
            await storage.delete(actor, stored.key).catch(() => {});
            return;
          }
          break;
        } catch {
          if (stored) await storage.delete(actor, stored.key).catch(() => {});
          if (attempt === 2)
            await db.$transaction(async (tx) => {
              const valid = await tx.generation.updateMany({
                where: fence,
                data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
              });
              if (valid.count)
                await tx.imageAsset.updateMany({
                  where: { id: asset.id, status: 'pending' },
                  data: {
                    status: 'failed',
                    error:
                      'Mock generation or storage failed after 3 attempts. Retry this batch after checking worker/storage health.',
                  },
                });
            });
        }
      }
    }
    const all = await db.imageAsset.findMany({ where: { generationId: id } }),
      success = all.filter((a) => a.status === 'completed').length;
    await db.generation.updateMany({
      where: fence,
      data: {
        status: success === data.count ? 'completed' : success ? 'partial' : 'failed',
        progress: 100,
        leaseToken: null,
        leaseUntil: null,
        error:
          success === data.count
            ? null
            : 'Some mock results failed. Successful originals are preserved; retry only failed slots.',
      },
    });
  } catch {
    await db.$transaction(async (tx) => {
      const changed = await tx.generation.updateMany({
        where: fence,
        data: {
          status: 'failed',
          error:
            'Worker could not prepare this batch. Check project permissions, provider configuration and storage, then retry.',
          leaseToken: null,
          leaseUntil: null,
        },
      });
      if (changed.count)
        await tx.imageAsset.updateMany({
          where: { generationId: id, status: 'pending' },
          data: { status: 'failed', error: 'Worker preparation failed.' },
        });
    });
  } finally {
    clearInterval(heartbeat);
  }
}
