import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { LocalStorage } from '@/storage/local';
import { mockVideo } from '@/ai/mock';
import { requireCapability, type VideoProvider } from '@/ai/contracts';
import type { StorageProvider } from '@/storage/contracts';
import { videoGenerationInput, shotSchema } from '@/features/videos/schema';
const LEASE_MS = 30000;
export async function processVideoGeneration(
  id: string,
  options: {
    provider?: VideoProvider;
    storage?: StorageProvider;
    afterStore?: () => Promise<void>;
  } = {},
) {
  const token = randomUUID();
  const acquired = await db.generation.updateMany({
    where: {
      id,
      kind: 'video',
      status: { in: ['queued', 'processing'] },
      cancelRequested: false,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    data: { status: 'processing', leaseToken: token, leaseUntil: new Date(Date.now() + LEASE_MS) },
  });
  if (!acquired.count) return;
  const job = await db.generation.findUniqueOrThrow({ where: { id } });
  const actor = { userId: job.createdBy, projectId: job.projectId };
  const fence = {
    id,
    kind: 'video',
    leaseToken: token,
    status: 'processing',
    cancelRequested: false,
  };
  const controller = new AbortController();
  let stopped = false;
  const heartbeat = setInterval(() => {
    void db.generation
      .updateMany({ where: fence, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } })
      .then((r) => {
        if (!r.count) {
          stopped = true;
          controller.abort();
        }
      })
      .catch(() => {
        stopped = true;
        controller.abort();
      });
  }, 5000);
  heartbeat.unref();
  const provider = options.provider ?? mockVideo,
    storage = options.storage ?? new LocalStorage();
  try {
    if (provider.capabilities.id !== 'mock-video' || !provider.capabilities.mock)
      throw new Error('Paid or unregistered providers disabled.');
    await requireMembership(actor.userId, actor.projectId, 'write');
    const input = videoGenerationInput.strip().parse(job.input),
      snapshot = job.input as Record<string, unknown>;
    const shots = snapshot.shots as Record<string, unknown>[];
    if (!Array.isArray(shots) || !shots.length || shots.length > 8)
      throw new Error('Invalid stored shots.');
    let source: Uint8Array | undefined;
    if (input.sourceImageId) {
      const a = await db.imageAsset.findFirstOrThrow({
        where: {
          id: input.sourceImageId,
          projectId: job.projectId,
          status: 'completed',
          review: { not: 'rejected' },
        },
      });
      const final = await db.assetSelection.findFirst({
        where: { projectId: job.projectId, assetId: a.id },
      });
      if (a.review !== 'favourite' && !final) throw new Error('Source approval revoked.');
      source = await storage.read(actor, a.key!);
      if (
        createHash('sha256').update(source).digest('hex') !==
        (snapshot.sourceReference as { checksum?: string })?.checksum
      )
        throw new Error('Source checksum mismatch.');
    }
    const assets = await db.videoAsset.findMany({
      where: { generationId: id },
      orderBy: { index: 'asc' },
    });
    if (assets.length !== shots.length) throw new Error('Missing durable shot slots.');
    for (const asset of assets) {
      if (asset.status !== 'pending') continue;
      if (asset.attempts >= 3) {
        await db.$transaction(async (tx) => {
          const valid = await tx.generation.updateMany({
            where: fence,
            data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
          });
          if (valid.count)
            await tx.videoAsset.updateMany({
              where: { id: asset.id, status: 'pending' },
              data: {
                status: 'failed',
                error: 'Interrupted at the attempt limit. Retry explicitly.',
              },
            });
        });
        continue;
      }
      const shot = shotSchema.strip().parse(shots[asset.index]);
      for (let attempt = asset.attempts; attempt < 3; attempt++) {
        if (stopped) return;
        const claim = await db.generation.updateMany({
          where: fence,
          data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
        });
        if (!claim.count) return;
        await db.videoAsset.updateMany({
          where: { id: asset.id, status: 'pending' },
          data: { attempts: attempt + 1 },
        });
        let stored: Awaited<ReturnType<StorageProvider['put']>> | undefined;
        try {
          const request = {
            prompt: String(shots[asset.index].positive),
            negativePrompt: String(snapshot.negative),
            model: input.model,
            count: 1,
            seed: input.seed + asset.index,
            durationSeconds: shot.duration,
            source,
            references: {
              preservation: snapshot.preservation,
              sourceImage: snapshot.sourceReference,
              storyboardRevisionId: input.storyboardRevisionId,
              shot: shots[asset.index],
            },
          };
          requireCapability(provider.capabilities, input.operation, request);
          const outputs = await provider.generate(request, { signal: controller.signal });
          if (outputs.length !== 1 || !outputs[0].mock || outputs[0].mimeType !== 'video/mp4')
            throw new Error('Unexpected mock video output.');
          stored = await storage.put(actor, outputs[0].bytes, outputs[0].mimeType);
          await options.afterStore?.();
          const committed = await db.$transaction(async (tx) => {
            const valid = await tx.generation.updateMany({
              where: fence,
              data: { leaseUntil: new Date(Date.now() + LEASE_MS) },
            });
            if (!valid.count) return false;
            await requireMembership(actor.userId, actor.projectId, 'write', tx);
            await tx.videoAsset.updateMany({
              where: { id: asset.id, status: 'pending' },
              data: { ...stored, status: 'completed', error: null },
            });
            const done = await tx.videoAsset.count({
              where: { generationId: id, status: { in: ['completed', 'failed'] } },
            });
            await tx.generation.updateMany({
              where: fence,
              data: { progress: Math.floor((done / shots.length) * 100) },
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
                await tx.videoAsset.updateMany({
                  where: { id: asset.id, status: 'pending' },
                  data: {
                    status: 'failed',
                    error:
                      'Mock video or storage failed after 3 attempts. Check worker/storage and retry.',
                  },
                });
            });
        }
      }
    }
    const completed = await db.videoAsset.count({
      where: { generationId: id, status: 'completed' },
    });
    await db.generation.updateMany({
      where: fence,
      data: {
        status: completed === shots.length ? 'completed' : completed ? 'partial' : 'failed',
        progress: 100,
        leaseToken: null,
        leaseUntil: null,
        error:
          completed === shots.length
            ? null
            : 'Some mock shots failed. Completed clips are preserved; retry failed slots only.',
      },
    });
  } catch {
    await db.$transaction(async (tx) => {
      const changed = await tx.generation.updateMany({
        where: fence,
        data: {
          status: 'failed',
          error:
            'Video preparation failed. Check project permissions, source approval/checksum, provider and storage; then retry.',
          leaseToken: null,
          leaseUntil: null,
        },
      });
      if (changed.count)
        await tx.videoAsset.updateMany({
          where: { generationId: id, status: 'pending' },
          data: { status: 'failed', error: 'Video preparation failed.' },
        });
    });
  } finally {
    clearInterval(heartbeat);
  }
}
