import { z } from 'zod';
import { db } from '@/lib/db';
import { requireMembership } from '@/lib/access';
import { AppError } from '@/lib/errors';
import { readSnapshot } from './dna';
import { compileCharacter } from '@/ai/character-engine';
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
    const previous = await tx.character.findUniqueOrThrow({
      where: { id },
      include: { currentVersion: true },
    });
    const previousDNA = readSnapshot(previous.currentVersion?.snapshot);
    const snapshot = previousDNA
      ? await compileCharacter({ ...previousDNA.answers, ...data })
      : { identity: data, schemaVersion: 1 };
    const version = await tx.characterVersion.create({
      data: {
        ...data,
        projectId,
        characterId: id,
        versionNumber: revision + 1,
        createdBy: userId,
        snapshot,
        schemaVersion: previousDNA ? 2 : 1,
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

export async function duplicateCharacter(userId: string, projectId: string, id: string) {
  await requireMembership(userId, projectId, 'write');
  const original = await getCharacter(userId, projectId, id);
  const version = original.currentVersion;
  if (!version) throw new AppError(409, 'Character has no saved version.');
  const dna = readSnapshot(version.snapshot);
  const name = version.name.slice(0, 70) + ' (copy)';
  const displayName = version.displayName.slice(0, 70) + ' (copy)';
  if (!dna) return createCharacter(userId, projectId, { ...version, name, displayName });
  const snapshot = await compileCharacter({ ...dna.answers, name, displayName });
  const a = snapshot.answers;
  return db.$transaction(async (tx) => {
    await requireMembership(userId, projectId, 'write', tx);
    const c = await tx.character.create({ data: { projectId, name } });
    const v = await tx.characterVersion.create({
      data: {
        projectId,
        characterId: c.id,
        versionNumber: 1,
        schemaVersion: 2,
        name,
        displayName,
        age: a.age,
        location: a.location,
        occupation: a.occupation,
        bio: a.bio,
        snapshot,
        createdBy: userId,
      },
    });
    return tx.character.update({
      where: { id: c.id },
      data: { currentVersionId: v.id },
      include: { currentVersion: true },
    });
  });
}
