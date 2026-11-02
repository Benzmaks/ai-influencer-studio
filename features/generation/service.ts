import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { compileScene } from '@/ai/prompt-engine';
import { sceneSchema } from '@/features/scenes/schema';
import { LocalStorage } from '@/storage/local';
import { generationInput, policy, activeStatuses } from './schema';
export async function createGeneration(
  userId: string,
  projectId: string,
  input: unknown,
  idempotencyKey: string,
) {
  const data = generationInput.parse(input);
  z.string()
    .min(8)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .parse(idempotencyKey);
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  for (let attempt = 0; attempt < 3; attempt++)
    try {
      return await db.$transaction(
        async (tx) => {
          await requireMembership(userId, projectId, 'write', tx);
          const previous = await tx.generation.findUnique({
            where: { projectId_idempotencyKey: { projectId, idempotencyKey } },
            include: { assets: { orderBy: { index: 'asc' } } },
          });
          if (previous) {
            if (previous.requestHash !== hash)
              throw new AppError(
                409,
                'This idempotency key belongs to different settings. Start a new request.',
              );
            return previous;
          }
          if (
            (await tx.generation.count({ where: { projectId, status: { in: activeStatuses } } })) >=
            policy.maxActivePerProject
          )
            throw new AppError(
              429,
              'This project has 10 active batches. Wait or cancel a queued batch.',
            );
          if (
            (await tx.imageAsset.count({ where: { projectId } })) + data.count >
            policy.maxStoredResultsPerProject
          )
            throw new AppError(429, 'Development project storage quota reached (2000 results).');
          const scene = await tx.sceneVersion.findFirst({
            where: { id: data.sceneVersionId, projectId },
            include: { characterVersion: { include: { character: true } } },
          });
          if (!scene || scene.characterVersionId !== data.characterVersionId)
            throw new AppError(
              409,
              'Choose the exact character version pinned by this scene version.',
            );
          if (scene.characterVersion.character.archivedAt)
            throw new AppError(409, 'This character is archived. Choose an active character.');
          const choices = sceneSchema.parse(scene.choices);
          if (choices.generationType !== 'image')
            throw new AppError(
              409,
              'Choose a photography/image scene; video generation is a later phase.',
            );
          const prompt = compileScene(scene.characterVersion.snapshot, choices);
          if (!prompt.ready)
            throw new AppError(
              409,
              'Resolve scene continuity conflicts and save a new scene version before generation.',
            );
          if (prompt.positive.length > 10000)
            throw new AppError(
              400,
              'The assembled prompt exceeds the mock provider limit. Shorten custom scene or character text.',
            );
          if (data.sourceAssetId) {
            const source = await tx.imageAsset.findFirst({
              where: { id: data.sourceAssetId, projectId, status: 'completed' },
              include: { generation: true },
            });
            if (
              !source ||
              source.generation.sceneVersionId !== scene.id ||
              source.generation.characterVersionId !== data.characterVersionId
            )
              throw new AppError(
                409,
                'Variation source must be a completed image from these exact character and scene versions.',
              );
          }
          const snapshot = {
            ...data,
            positive: prompt.positive,
            negative: prompt.negative,
            findings: prompt.findings,
            rulesVersion: prompt.rulesVersion,
            realism: choices.realism,
            characterName: scene.characterVersion.name,
            characterVersion: scene.characterVersion.versionNumber,
            sceneTitle: choices.title,
            sceneVersion: scene.versionNumber,
            mock: true,
            cost: { currency: 'USD', estimated: 0, charged: 0 },
            label: 'Mock procedural test patterns — not AI photography',
          };
          return tx.generation.create({
            data: {
              projectId,
              createdBy: userId,
              characterId: scene.characterId,
              characterVersionId: scene.characterVersionId,
              sceneId: scene.sceneId,
              sceneVersionId: scene.id,
              input: snapshot,
              requestHash: hash,
              idempotencyKey,
              outbox: { create: {} },
              assets: {
                create: Array.from({ length: data.count }, (_, index) => ({
                  index,
                  sourceAssetId: data.sourceAssetId,
                  metadata: { ...snapshot, seed: data.seed + index, variationIndex: index },
                })),
              },
            },
            include: { assets: { orderBy: { index: 'asc' } } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(e.code) &&
        attempt < 2
      )
        continue;
      throw e;
    }
  throw new AppError(409, 'Generation changed concurrently. Try again.');
}
export async function listGenerations(userId: string, projectId: string, cursor?: string) {
  await requireMembership(userId, projectId);
  if (cursor && !(await db.generation.findFirst({ where: { id: cursor, projectId } })))
    throw new AppError(404, 'Batch cursor not found.');
  return db.generation.findMany({
    where: { projectId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 30,
    include: { assets: { orderBy: { index: 'asc' } } },
  });
}
export async function getGeneration(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const job = await db.generation.findFirst({
    where: { id, projectId },
    include: { assets: { orderBy: { index: 'asc' } } },
  });
  if (!job) throw new AppError(404, 'Generation not found.');
  return job;
}
export async function cancelGeneration(userId: string, projectId: string, id: string) {
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const changed = await tx.generation.updateMany({
      where: { id, projectId, status: { in: activeStatuses } },
      data: {
        cancelRequested: true,
        status: 'cancelled',
        leaseToken: null,
        leaseUntil: null,
        error: 'Cancelled by project member.',
      },
    });
    if (!changed.count)
      throw new AppError(409, 'This batch is no longer eligible for cancellation.');
    await tx.imageAsset.updateMany({
      where: { generationId: id, projectId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    return { cancelled: true };
  });
}
export async function retryGeneration(userId: string, projectId: string, id: string) {
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const changed = await tx.generation.updateMany({
      where: {
        id,
        projectId,
        status: { in: ['partial', 'failed'] },
        retryCount: { lt: policy.maxManualRetries },
      },
      data: {
        status: 'queued',
        retryCount: { increment: 1 },
        error: null,
        progress: 0,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    if (!changed.count)
      throw new AppError(409, 'Only failed/partial batches can retry, up to three times.');
    await tx.imageAsset.updateMany({
      where: { generationId: id, status: 'failed' },
      data: { status: 'pending', attempts: 0, error: null },
    });
    await tx.generationOutbox.update({ where: { generationId: id }, data: { deliveredAt: null } });
    return { queued: true };
  });
}
export async function reviewAsset(userId: string, projectId: string, id: string, input: unknown) {
  const review = z.enum(['unreviewed', 'favourite', 'rejected']).parse(input);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const result = await tx.imageAsset.updateMany({
      where: { id, projectId, status: 'completed' },
      data: { review },
    });
    if (!result.count) throw new AppError(404, 'Image not found.');
    return { review };
  });
}
export async function readAsset(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const asset = await db.imageAsset.findFirst({ where: { id, projectId, status: 'completed' } });
  if (!asset?.key) throw new AppError(404, 'Image not found.');
  const bytes = await new LocalStorage().read({ userId, projectId }, asset.key);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.checksum)
    throw new AppError(503, 'Stored image integrity check failed.');
  return { asset, bytes };
}
