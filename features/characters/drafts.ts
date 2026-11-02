import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { compileCharacter } from '@/ai/character-engine';
import { answersSchema } from './dna';
export const draftInput = z
  .object({
    answers: answersSchema,
    step: z.number().int().min(0).max(9),
    characterId: z.string().min(1).optional(),
    baseRevision: z.number().int().positive().optional(),
  })
  .refine(
    (d) => Boolean(d.characterId) === Boolean(d.baseRevision),
    'Edit drafts require a character and its revision.',
  );
export async function listDrafts(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return db.characterDraft.findMany({
    where: { projectId, createdBy: userId, completedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}
export async function getDraft(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const draft = await db.characterDraft.findFirst({
    where: { id, projectId, createdBy: userId, completedAt: null },
  });
  if (!draft) throw new AppError(404, 'Draft not found.');
  return draft;
}
export async function saveDraft(
  userId: string,
  projectId: string,
  input: unknown,
  id?: string,
  revision?: number,
) {
  const data = draftInput.parse(input);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    if (id) {
      z.number().int().positive().parse(revision);
      const result = await tx.characterDraft.updateMany({
        where: { id, projectId, createdBy: userId, completedAt: null, revision },
        data: { answers: data.answers, step: data.step, revision: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new AppError(409, 'Draft changed in another tab. Reload before saving.');
      return tx.characterDraft.findUniqueOrThrow({ where: { id } });
    }
    if (data.characterId) {
      const target = await tx.character.findFirst({
        where: { id: data.characterId, projectId, revision: data.baseRevision, archivedAt: null },
      });
      if (!target)
        throw new AppError(
          409,
          'Character changed or was archived. Open its current profile to start an edit.',
        );
    }
    return tx.characterDraft.create({
      data: {
        projectId,
        createdBy: userId,
        answers: data.answers,
        step: data.step,
        characterId: data.characterId,
        baseRevision: data.baseRevision,
      },
    });
  });
}
export async function discardDraft(
  userId: string,
  projectId: string,
  id: string,
  revision: number,
) {
  await requireMembership(userId, projectId, 'write');
  z.number().int().positive().parse(revision);
  const result = await db.characterDraft.deleteMany({
    where: { id, projectId, createdBy: userId, completedAt: null, revision },
  });
  if (!result.count) throw new AppError(409, 'Draft changed or is no longer available.');
  return { discarded: true };
}
export async function publishDraft(
  userId: string,
  projectId: string,
  id: string,
  revision: number,
) {
  z.number().int().positive().parse(revision);
  await requireMembership(userId, projectId, 'write');
  const draft = await getDraft(userId, projectId, id);
  if (draft.revision !== revision) throw new AppError(409, 'Draft changed. Reload before saving.');
  const snapshot = await compileCharacter(draft.answers);
  const a = snapshot.answers;
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const claimed = await tx.characterDraft.updateMany({
      where: { id, projectId, createdBy: userId, completedAt: null, revision },
      data: { completedAt: new Date(), revision: { increment: 1 } },
    });
    if (claimed.count !== 1) throw new AppError(409, 'Draft changed or was already saved.');
    let characterId = draft.characterId;
    let versionNumber = 1;
    if (characterId) {
      const changed = await tx.character.updateMany({
        where: { id: characterId, projectId, revision: draft.baseRevision!, archivedAt: null },
        data: { name: a.name, revision: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new AppError(
          409,
          'Character changed or was archived. Original versions and your draft are preserved.',
        );
      versionNumber = draft.baseRevision! + 1;
    } else characterId = (await tx.character.create({ data: { projectId, name: a.name } })).id;
    const version = await tx.characterVersion.create({
      data: {
        projectId,
        characterId,
        versionNumber,
        schemaVersion: 2,
        name: a.name,
        displayName: a.displayName,
        age: a.age,
        location: a.location,
        occupation: a.occupation,
        bio: a.bio,
        snapshot: snapshot as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
    await tx.auditEvent.create({
      data: {
        projectId,
        actorId: userId,
        action: 'character.dna_version_created',
        resourceId: characterId,
      },
    });
    return tx.character.update({
      where: { id: characterId },
      data: { currentVersionId: version.id },
      include: { currentVersion: true },
    });
  });
}
