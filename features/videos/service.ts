import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { compileStoryboard } from '@/ai/video-engine';
import { providerRegistry } from '@/ai/mock';
import { requireCapability } from '@/ai/contracts';
import { LocalStorage } from '@/storage/local';
import { policy, activeStatuses } from '@/features/generation/schema';
import { storyboardInput, videoGenerationInput, shotSchema } from './schema';
const versions = {
  orderBy: { versionNumber: 'desc' as const },
  include: { shots: { orderBy: { shotNumber: 'asc' as const } } },
};
export async function listStoryboards(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return db.storyboard.findMany({
    where: { projectId },
    include: { versions },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
}
export async function getStoryboard(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const board = await db.storyboard.findFirst({ where: { id, projectId }, include: { versions } });
  if (!board) throw new AppError(404, 'Storyboard not found.');
  return board;
}
export async function saveStoryboard(
  userId: string,
  projectId: string,
  input: unknown,
  id?: string,
) {
  const data = storyboardInput.parse(input);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const scene = await tx.sceneVersion.findFirst({
      where: { id: data.sceneVersionId, projectId },
      include: { characterVersion: { include: { character: true } } },
    });
    if (!scene || scene.characterVersionId !== data.characterVersionId)
      throw new AppError(409, 'Choose the exact character version pinned by the selected scene.');
    if (scene.characterVersion.character.archivedAt)
      throw new AppError(409, 'Choose an active character.');
    const compiled = compileStoryboard(scene.characterVersion.snapshot, scene.choices, data.shots);
    if (data.status === 'ready' && !compiled.ready)
      throw new AppError(
        409,
        'Resolve scene/shot identity conflicts before marking ready. ' +
          compiled.conflicts.join(' '),
      );
    let boardId = id;
    if (id) {
      if (!data.revision) throw new AppError(400, 'Storyboard revision is required.');
      const changed = await tx.storyboard.updateMany({
        where: { id, projectId, revision: data.revision },
        data: { title: data.title, status: data.status, revision: { increment: 1 } },
      });
      if (!changed.count)
        throw new AppError(
          409,
          'Storyboard changed. Reload before saving; unsaved shots remain on screen.',
        );
    } else
      boardId = (
        await tx.storyboard.create({ data: { projectId, title: data.title, status: data.status } })
      ).id;
    await tx.storyboardRevision.create({
      data: {
        projectId,
        storyboardId: boardId!,
        title: data.title,
        versionNumber: id ? data.revision! + 1 : 1,
        characterId: scene.characterId,
        characterVersionId: scene.characterVersionId,
        sceneId: scene.sceneId,
        sceneVersionId: scene.id,
        createdBy: userId,
        shots: { create: data.shots.map((s, index) => ({ ...s, shotNumber: index + 1 })) },
      },
    });
    return tx.storyboard.findUniqueOrThrow({ where: { id: boardId! }, include: { versions } });
  });
}
export async function duplicateStoryboard(userId: string, projectId: string, id: string) {
  const original = await getStoryboard(userId, projectId, id),
    latest = original.versions[0];
  return saveStoryboard(userId, projectId, {
    title: original.title.slice(0, 490) + ' (copy)',
    characterVersionId: latest.characterVersionId,
    sceneVersionId: latest.sceneVersionId,
    status: 'draft',
    shots: latest.shots.map((s) =>
      shotSchema.parse(
        Object.fromEntries(
          Object.entries(s).filter(([k]) => !['id', 'revisionId', 'shotNumber'].includes(k)),
        ),
      ),
    ),
  });
}
export const videoInclude = { videoAssets: { orderBy: { index: 'asc' as const } } };
export async function listVideoGenerations(userId: string, projectId: string, cursor?: string) {
  await requireMembership(userId, projectId);
  if (
    cursor &&
    !(await db.generation.findFirst({ where: { id: cursor, projectId, kind: 'video' } }))
  )
    throw new AppError(404, 'Video history cursor not found.');
  return db.generation.findMany({
    where: { projectId, kind: 'video' },
    include: videoInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}
export async function createVideoGeneration(
  userId: string,
  projectId: string,
  input: unknown,
  key: string,
) {
  const data = videoGenerationInput.parse(input);
  z.string()
    .min(8)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .parse(key);
  const requestHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  for (let attempt = 0; attempt < 3; attempt++)
    try {
      return await db.$transaction(
        async (tx) => {
          await requireMembership(userId, projectId, 'write', tx);
          const existing = await tx.generation.findUnique({
            where: { projectId_idempotencyKey: { projectId, idempotencyKey: key } },
            include: videoInclude,
          });
          if (existing) {
            if (existing.kind !== 'video' || existing.requestHash !== requestHash)
              throw new AppError(409, 'Idempotency key already belongs to a different request.');
            return existing;
          }
          const capabilities = providerRegistry().video.capabilities;
          if (!capabilities.operations.includes(data.operation))
            throw new AppError(
              409,
              'This mock video provider does not support variations, editing or extension. Originals remain unchanged.',
            );
          if ((data.operation === 'image-to-video') !== !!data.sourceImageId)
            throw new AppError(
              400,
              'Image-to-video requires an approved image; text-to-video must not include an image source.',
            );
          if (
            (await tx.generation.count({ where: { projectId, status: { in: activeStatuses } } })) >=
            policy.maxActivePerProject
          )
            throw new AppError(429, 'This project has 10 active batches. Wait or cancel a batch.');
          const revision = await tx.storyboardRevision.findFirst({
            where: { id: data.storyboardRevisionId, projectId },
            include: {
              shots: { orderBy: { shotNumber: 'asc' } },
              sceneVersion: true,
              characterVersion: { include: { character: true } },
            },
          });
          if (!revision) throw new AppError(404, 'Storyboard revision not found in this project.');
          if (revision.characterVersion.character.archivedAt)
            throw new AppError(409, 'This character is archived.');
          const shots = revision.shots.map((s) =>
            shotSchema.parse(
              Object.fromEntries(
                Object.entries(s).filter(([k]) => !['id', 'revisionId', 'shotNumber'].includes(k)),
              ),
            ),
          );
          if (!shots.length || shots.length > 8)
            throw new AppError(400, 'Choose a storyboard with 1–8 shots.');
          if (
            (await tx.videoAsset.count({ where: { projectId } })) + shots.length >
            policy.maxStoredResultsPerProject
          )
            throw new AppError(429, 'Development video storage quota reached.');
          const compiled = compileStoryboard(
            revision.characterVersion.snapshot,
            revision.sceneVersion.choices,
            shots,
          );
          if (!compiled.ready)
            throw new AppError(
              409,
              'Resolve continuity conflicts in a new storyboard revision before generating. ' +
                compiled.conflicts.join(' '),
            );
          if (compiled.shots.some((s) => s.positive.length > 10000))
            throw new AppError(400, 'Shot prompt too long. Shorten custom text.');
          if (shots.some((s) => s.duration !== 2))
            throw new AppError(
              409,
              'This mock provider supports exactly two seconds per shot. Save other durations as drafts.',
            );
          let sourceReference: Prisma.InputJsonValue | null = null;
          if (data.sourceImageId) {
            const source = await tx.imageAsset.findFirst({
              where: {
                id: data.sourceImageId,
                projectId,
                status: 'completed',
                review: { not: 'rejected' },
              },
              include: { generation: true },
            });
            const final = await tx.assetSelection.findFirst({
              where: { projectId, assetId: data.sourceImageId },
            });
            if (!source?.checksum || !source.key || (source.review !== 'favourite' && !final))
              throw new AppError(
                409,
                'Approve a completed image by favouriting it or selecting it as final.',
              );
            if (
              source.generation.characterVersionId !== revision.characterVersionId ||
              source.generation.sceneVersionId !== revision.sceneVersionId
            )
              throw new AppError(
                409,
                'Source image must pin these exact character and scene versions.',
              );
            sourceReference = {
              id: source.id,
              checksum: source.checksum,
              metadata: source.metadata,
              approval: source.review === 'favourite' ? 'favourite' : 'final',
              createdAt: source.createdAt.toISOString(),
            };
          }
          for (const shot of compiled.shots)
            requireCapability(capabilities, data.operation, {
              prompt: shot.positive,
              negativePrompt: compiled.negative,
              count: 1,
              seed: data.seed,
              durationSeconds: shot.duration,
              model: data.model,
              ...(data.sourceImageId ? { source: new Uint8Array([1]) } : {}),
            });
          const snapshot = {
            ...data,
            count: shots.length,
            storyboardId: revision.storyboardId,
            storyboardTitle: revision.title,
            storyboardVersion: revision.versionNumber,
            characterVersionId: revision.characterVersionId,
            characterId: revision.characterId,
            sceneVersionId: revision.sceneVersionId,
            sceneId: revision.sceneId,
            characterName: revision.characterVersion.name,
            characterVersion: revision.characterVersion.versionNumber,
            sceneVersion: revision.sceneVersion.versionNumber,
            ...compiled,
            sourceReference,
            mock: true,
            width: 320,
            height: 400,
            aspectRatio: '4:5',
            clipDurationSeconds: 2,
            fixture: 'mock-video.mp4/v1',
            audioRendered: false,
            cost: { currency: 'USD', estimated: 0, charged: 0 },
            label:
              'Mock storyboard preview · repeated fixed silent two-second sample per shot; not AI animation or a stitched film',
          };
          return tx.generation.create({
            data: {
              kind: 'video',
              projectId,
              createdBy: userId,
              storyboardId: revision.storyboardId,
              storyboardRevisionId: revision.id,
              characterId: revision.characterId,
              characterVersionId: revision.characterVersionId,
              sceneId: revision.sceneId,
              sceneVersionId: revision.sceneVersionId,
              input: snapshot,
              requestHash,
              idempotencyKey: key,
              outbox: { create: {} },
              videoAssets: {
                create: compiled.shots.map((shot, index) => ({
                  index,
                  sourceImageId: data.sourceImageId,
                  metadata: { ...snapshot, shot, seed: data.seed + index },
                })),
              },
            },
            include: videoInclude,
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
  throw new AppError(409, 'Concurrent video request changed; try again.');
}
export async function approvedImages(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return db.imageAsset.findMany({
    where: {
      projectId,
      status: 'completed',
      review: { not: 'rejected' },
      OR: [{ review: 'favourite' }, { finalSelections: { some: { projectId } } }],
    },
    select: {
      id: true,
      checksum: true,
      generation: { select: { characterVersionId: true, sceneVersionId: true } },
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
export async function readVideoAsset(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const asset = await db.videoAsset.findFirst({ where: { id, projectId, status: 'completed' } });
  if (!asset?.key) throw new AppError(404, 'Video not found.');
  const bytes = await new LocalStorage().read({ userId, projectId }, asset.key);
  if (createHash('sha256').update(bytes).digest('hex') !== asset.checksum)
    throw new AppError(503, 'Stored video integrity check failed.');
  return { asset, bytes };
}
