import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
export const characterInput = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters.').max(80),
  displayName: z.string().trim().min(2).max(80),
  age: z.number().int().min(18, 'Characters must be adults (18+).').max(120),
  location: z.string().trim().max(120),
  occupation: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
});
export async function listCharacters(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return db.character.findMany({
    where: { projectId },
    include: { currentVersion: true },
    orderBy: { createdAt: 'desc' },
  });
}
export async function getCharacter(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId);
  const item = await db.character.findFirst({
    where: { id, projectId },
    include: { currentVersion: true, versions: { orderBy: { versionNumber: 'desc' } } },
  });
  if (!item) throw new AppError(404, 'Character not found.');
  return item;
}
export async function createCharacter(userId: string, projectId: string, input: unknown) {
  const data = characterInput.parse(input);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const character = await tx.character.create({ data: { projectId, name: data.name } });
    const version = await tx.characterVersion.create({
      data: {
        ...data,
        projectId,
        characterId: character.id,
        versionNumber: 1,
        createdBy: userId,
        snapshot: { identity: data, schemaVersion: 1 },
      },
    });
    return tx.character.update({
      where: { id: character.id },
      data: { currentVersionId: version.id },
      include: { currentVersion: true },
    });
  });
}
export async function updateCharacter(
  userId: string,
  projectId: string,
  id: string,
  input: unknown,
  revision: number,
) {
  const data = characterInput.parse(input);
  z.number().int().positive().parse(revision);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const changed = await tx.character.updateMany({
      where: { id, projectId, revision, archivedAt: null },
      data: { revision: { increment: 1 }, name: data.name },
    });
    if (changed.count !== 1)
      throw new AppError(409, 'Character changed or was archived. Refresh before editing.');
    const version = await tx.characterVersion.create({
      data: {
        ...data,
        projectId,
        characterId: id,
        versionNumber: revision + 1,
        createdBy: userId,
        snapshot: { identity: data, schemaVersion: 1 },
      },
    });
    await tx.auditEvent.create({
      data: { projectId, actorId: userId, action: 'character.version_created', resourceId: id },
    });
    return tx.character.update({
      where: { id },
      data: { currentVersionId: version.id },
      include: { currentVersion: true },
    });
  });
}
export async function archiveCharacter(
  userId: string,
  projectId: string,
  id: string,
  revision: number,
) {
  z.number().int().positive().parse(revision);
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const changed = await tx.character.updateMany({
      where: { id, projectId, revision, archivedAt: null },
      data: { archivedAt: new Date(), revision: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new AppError(409, 'Character changed or was already archived. Refresh and try again.');
    return { archived: true };
  });
}
