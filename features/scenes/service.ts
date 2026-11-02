import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { sceneSchema } from './schema';
import { compileScene } from '@/ai/prompt-engine';
const inputSchema = z
  .object({
    choices: sceneSchema,
    characterVersionId: z.string().min(1),
    status: z.enum(['draft', 'ready']).default('draft'),
    revision: z.number().int().positive().optional(),
  })
  .strict();
export async function listScenes(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return db.scene.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  });
}
export async function getScene(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const s = await db.scene.findFirst({
    where: { id, projectId },
    include: { versions: { orderBy: { versionNumber: 'desc' } } },
  });
  if (!s) throw new AppError(404, 'Scene not found.');
  return s;
}
export async function previewScene(userId: string, projectId: string, input: unknown) {
  const data = inputSchema.parse(input);
  await requireMembership(userId, projectId);
  const v = await db.characterVersion.findFirst({
    where: { id: data.characterVersionId, projectId },
  });
  if (!v) throw new AppError(404, 'Character version not found in this project.');
  return compileScene(v.snapshot, data.choices);
}
export async function saveScene(userId: string, projectId: string, input: unknown, id?: string) {
  const data = inputSchema.parse(input);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const v = await tx.characterVersion.findFirst({
      where: { id: data.characterVersionId, projectId },
      include: { character: true },
    });
    if (!v) throw new AppError(404, 'Character version not found in this project.');
    if (v.character.archivedAt)
      throw new AppError(409, 'Choose an active character before saving.');
    const prompt = compileScene(v.snapshot, data.choices);
    if (data.status === 'ready' && !prompt.ready)
      throw new AppError(409, 'Resolve continuity conflicts before marking this scene ready.');
    let sceneId = id;
    let number = 1;
    if (id) {
      if (!data.revision) throw new AppError(400, 'A scene revision is required.');
      const changed = await tx.scene.updateMany({
        where: { id, projectId, revision: data.revision },
        data: { revision: { increment: 1 }, title: data.choices.title, status: data.status },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          'Scene changed. Reload before saving; your unsaved choices remain on screen.',
        );
      number = data.revision + 1;
    } else
      sceneId = (
        await tx.scene.create({
          data: { projectId, title: data.choices.title, status: data.status },
        })
      ).id;
    await tx.sceneVersion.create({
      data: {
        projectId,
        sceneId: sceneId!,
        versionNumber: number,
        characterId: v.characterId,
        characterVersionId: v.id,
        choices: data.choices,
        prompt,
        createdBy: userId,
      },
    });
    return tx.scene.findUniqueOrThrow({
      where: { id: sceneId! },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });
  });
}
export async function duplicateScene(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId, 'write');
  const original = await getScene(userId, projectId, id),
    v = original.versions[0];
  return saveScene(userId, projectId, {
    characterVersionId: v.characterVersionId,
    choices: { ...sceneSchema.parse(v.choices), title: original.title.slice(0, 490) + ' (copy)' },
    status: 'draft',
  });
}
