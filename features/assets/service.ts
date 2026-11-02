import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { createGeneration } from '@/features/generation/service';
import { generationInput } from '@/features/generation/schema';
import { loadGraph, rootOf } from './lineage';
export const editInput = z
  .object({
    instruction: z.string().trim().min(5).max(1500),
    scope: z.literal('scene-only'),
    count: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]).default(1),
    seed: z.number().int().min(0).max(2147483600).optional(),
  })
  .strict();
export async function requestEdit(
  userId: string,
  projectId: string,
  id: string,
  input: unknown,
  key: string,
) {
  const data = editInput.parse(input);
  await requireMembership(userId, projectId, 'write');
  const source = await db.imageAsset.findFirst({
    where: { id, projectId, status: 'completed' },
    include: { generation: true },
  });
  if (!source) throw new AppError(404, 'Source image not found.');
  const settings = generationInput.strip().parse(source.generation.input);
  return createGeneration(
    userId,
    projectId,
    {
      ...settings,
      sourceAssetId: id,
      operation: 'edit',
      instruction: data.instruction,
      editScope: data.scope,
      count: data.count,
      seed:
        data.seed ??
        ((Number((source.metadata as Record<string, unknown>).seed) || settings.seed) + 100) %
          2147483600,
    },
    key,
  );
}
const include = { generation: true } as const;
export async function getAsset(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const asset = await db.imageAsset.findFirst({
    where: { id, projectId, status: 'completed' },
    include,
  });
  if (!asset) throw new AppError(404, 'Image not found.');
  const graph = await loadGraph(projectId),
    rootAssetId = rootOf(graph, id),
    ids = graph.filter((a) => rootOf(graph, a.id) === rootAssetId).map((a) => a.id);
  const history = await db.imageAsset.findMany({
    where: { projectId, id: { in: ids } },
    include,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const selection = await db.assetSelection.findUnique({
    where: { projectId_rootAssetId: { projectId, rootAssetId } },
  });
  return { asset, rootAssetId, history, selection };
}
export async function compareAssets(userId: string, projectId: string, input: unknown) {
  const ids = z
    .array(z.string().min(1))
    .min(2)
    .max(4)
    .refine((a) => new Set(a).size === a.length, 'Choose different images.')
    .parse(input);
  await requireMembership(userId, projectId);
  return Promise.all(ids.map((id) => getAsset(userId, projectId, id)));
}
export async function selectFinal(
  userId: string,
  projectId: string,
  rootAssetId: string,
  input: unknown,
) {
  const data = z
    .object({ assetId: z.string().min(1).nullable(), revision: z.number().int().nonnegative() })
    .strict()
    .parse(input);
  return db.$transaction(
    async (tx) => {
      await requireMembership(userId, projectId, 'write', tx);
      const graph = await loadGraph(projectId, tx);
      if (rootOf(graph, rootAssetId) !== rootAssetId)
        throw new AppError(409, 'Final selection requires an original root image.');
      if (data.assetId) {
        if (rootOf(graph, data.assetId) !== rootAssetId)
          throw new AppError(409, 'Final image belongs to a different lineage.');
        const asset = await tx.imageAsset.findFirst({
          where: { id: data.assetId, projectId, status: 'completed', review: { not: 'rejected' } },
        });
        if (!asset) throw new AppError(409, 'Choose a completed, non-rejected image.');
      }
      const current = await tx.assetSelection.findUnique({
        where: { projectId_rootAssetId: { projectId, rootAssetId } },
      });
      if ((current?.revision ?? 0) !== data.revision)
        throw new AppError(409, 'Final selection changed. Reload before selecting again.');
      if (!data.assetId) {
        if (current)
          await tx.assetSelection.delete({
            where: { projectId_rootAssetId: { projectId, rootAssetId } },
          });
        return null;
      }
      return current
        ? tx.assetSelection.update({
            where: { projectId_rootAssetId: { projectId, rootAssetId } },
            data: { assetId: data.assetId, revision: { increment: 1 }, updatedBy: userId },
          })
        : tx.assetSelection.create({
            data: { projectId, rootAssetId, assetId: data.assetId, updatedBy: userId },
          });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
const searchable = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
export const libraryQuery = z.object({
  q: z.string().max(100).default(''),
  characterId: z.string().max(100).default(''),
  sceneId: z.string().max(100).default(''),
  review: z.enum(['all', 'unreviewed', 'favourite', 'rejected', 'final']).default('all'),
  kind: z.enum(['all', 'original', 'variations', 'edit', 'duplicate']).default('all'),
  page: z.coerce.number().int().min(0).max(100).default(0),
});
export async function assetLibrary(userId: string, projectId: string, input: unknown = {}) {
  const query = libraryQuery.parse(input);
  await requireMembership(userId, projectId);
  const [all, selections] = await Promise.all([
    db.imageAsset.findMany({
      where: { projectId },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
    db.assetSelection.findMany({ where: { projectId } }),
  ]);
  const selected = new Map(selections.map((s) => [s.rootAssetId, s]));
  const characters = new Map<string, string>(),
    scenes = new Map<string, string>();
  const assets = all
    .filter((a) => a.status === 'completed')
    .map((a) => {
      const meta = a.metadata as Record<string, unknown>;
      characters.set(a.generation.characterId, String(meta.characterName ?? 'Character'));
      scenes.set(a.generation.sceneId, String(meta.sceneTitle ?? 'Scene'));
      const rootAssetId = rootOf(all, a.id);
      return { ...a, rootAssetId, selection: selected.get(rootAssetId) ?? null };
    })
    .filter((a) => {
      const meta = a.metadata as Record<string, unknown>,
        operation = meta.operation ?? (a.sourceAssetId ? 'variations' : 'original');
      return (
        (!query.characterId || a.generation.characterId === query.characterId) &&
        (!query.sceneId || a.generation.sceneId === query.sceneId) &&
        (query.review === 'all' ||
          (query.review === 'final' ? a.selection?.assetId === a.id : a.review === query.review)) &&
        (query.kind === 'all' ||
          (query.kind === 'original' ? !a.sourceAssetId : operation === query.kind)) &&
        searchable(
          [
            meta.characterName,
            meta.sceneTitle,
            meta.instruction,
            ...(Array.isArray(meta.editTrail) ? meta.editTrail : []),
            a.id,
          ].join(' '),
        ).includes(searchable(query.q.trim()))
      );
    });
  return {
    assets: assets.slice(query.page * 24, (query.page + 1) * 24),
    total: assets.length,
    page: query.page,
    characters: [...characters].map(([id, name]) => ({ id, name })),
    scenes: [...scenes].map(([id, name]) => ({ id, name })),
  };
}

export async function duplicateAsset(userId: string, projectId: string, id: string, key: string) {
  await requireMembership(userId, projectId, 'write');
  const source = await db.imageAsset.findFirst({
    where: { id, projectId, status: 'completed' },
    include: { generation: true },
  });
  if (!source) throw new AppError(404, 'Source image not found.');
  const settings = generationInput.strip().parse(source.generation.input);
  return createGeneration(
    userId,
    projectId,
    {
      ...settings,
      operation: 'duplicate',
      instruction: undefined,
      editScope: undefined,
      count: 1,
      sourceAssetId: id,
      seed: Number((source.metadata as Record<string, unknown>).seed) || settings.seed,
    },
    key,
  );
}
