import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { createProject, listProjects, setMemberRole } from '@/features/projects/service';
import {
  createCharacter,
  getCharacter,
  updateCharacter,
  archiveCharacter,
  listCharacters,
} from '@/features/characters/service';
import { LocalStorage } from '@/storage/local';
const prefix = `test-${randomUUID()}`;
let owner: string;
let editor: string;
let viewer: string;
let outsider: string;
let projectId: string;
let secondProjectId: string;
const char = {
  name: 'Sofia Laurent',
  displayName: 'Sofia',
  age: 26,
  location: 'London',
  occupation: 'Editorial storyteller',
  bio: 'A fictional character with an eye for ordinary beauty.',
};
beforeAll(async () => {
  const users = await Promise.all(
    ['owner', 'editor', 'viewer', 'outsider'].map((role) =>
      db.user.create({ data: { email: `${prefix}-${role}@example.test` } }),
    ),
  );
  [owner, editor, viewer, outsider] = users.map((u) => u.id);
  const project = await createProject(owner, { name: `${prefix} project` });
  projectId = project.id;
  secondProjectId = (await createProject(outsider, { name: `${prefix} separate` })).id;
  await db.projectMembership.createMany({
    data: [
      { projectId, userId: editor, role: 'EDITOR' },
      { projectId, userId: viewer, role: 'VIEWER' },
    ],
  });
});
afterAll(async () => {
  const projects = [projectId, secondProjectId].filter(Boolean);
  const characters = await db.character.findMany({
    where: { projectId: { in: projects } },
    select: { id: true },
  });
  await db.$transaction(async (tx) => {
    await tx.characterDraft.deleteMany({ where: { projectId: { in: projects } } });
    await tx.character.updateMany({
      where: { projectId: { in: projects } },
      data: { currentVersionId: null },
    });
    for (const c of characters) {
      await tx.$executeRaw`DELETE FROM "CharacterVersion" WHERE "characterId" = ${c.id}`;
    }
    await tx.character.deleteMany({ where: { projectId: { in: projects } } });
    await tx.auditEvent.deleteMany({ where: { projectId: { in: projects } } });
    await tx.project.deleteMany({ where: { id: { in: projects } } });
    await tx.user.deleteMany({ where: { email: { startsWith: prefix } } });
  });
  await db.$disconnect();
});
describe('PostgreSQL foundation and project boundaries', () => {
  it('lists only authorized projects', async () => {
    expect((await listProjects(owner)).map((p) => p.id)).toContain(projectId);
    expect((await listProjects(owner)).map((p) => p.id)).not.toContain(secondProjectId);
    await expect(listCharacters(outsider, projectId)).rejects.toMatchObject({ status: 404 });
  });
  it('allows editors to create/update, preserving every old snapshot', async () => {
    const c = await createCharacter(editor, projectId, char);
    const old = await db.characterVersion.findUniqueOrThrow({ where: { id: c.currentVersionId! } });
    const changed = await updateCharacter(
      editor,
      projectId,
      c.id,
      { ...char, bio: 'An updated background.' },
      c.revision,
    );
    expect(changed.revision).toBe(2);
    expect(await db.characterVersion.findUnique({ where: { id: old.id } })).toEqual(old);
    const detail = await getCharacter(viewer, projectId, c.id);
    expect(detail.versions).toHaveLength(2);
    expect(detail.currentVersion?.bio).toBe('An updated background.');
    await expect(updateCharacter(editor, projectId, c.id, char, c.revision)).rejects.toMatchObject({
      status: 409,
    });
    expect((await getCharacter(owner, projectId, c.id)).versions).toHaveLength(2);
  });
  it('prevents snapshot rewrites at database level', async () => {
    const c = await createCharacter(owner, projectId, char);
    const original = await db.characterVersion.findUniqueOrThrow({
      where: { id: c.currentVersionId! },
    });
    const changed =
      await db.$executeRaw`UPDATE "CharacterVersion" SET bio = 'Must never replace history' WHERE id = ${original.id}`;
    expect(changed).toBe(0);
    expect(await db.characterVersion.findUnique({ where: { id: original.id } })).toEqual(original);
  });
  it('rejects viewer writes and cross-project identifiers for all character actions', async () => {
    await expect(createCharacter(viewer, projectId, char)).rejects.toMatchObject({ status: 403 });
    const c = await createCharacter(owner, projectId, char);
    await expect(updateCharacter(viewer, projectId, c.id, char, 1)).rejects.toMatchObject({
      status: 403,
    });
    await expect(archiveCharacter(viewer, projectId, c.id, 1)).rejects.toMatchObject({
      status: 403,
    });
    await expect(getCharacter(outsider, secondProjectId, c.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(updateCharacter(outsider, secondProjectId, c.id, char, 1)).rejects.toMatchObject({
      status: 409,
    });
    await expect(archiveCharacter(outsider, secondProjectId, c.id, 1)).rejects.toMatchObject({
      status: 409,
    });
  });
  it('allows only one concurrent update of the same revision', async () => {
    const c = await createCharacter(owner, projectId, char);
    const results = await Promise.allSettled([
      updateCharacter(editor, projectId, c.id, { ...char, bio: 'A' }, 1),
      updateCharacter(owner, projectId, c.id, { ...char, bio: 'B' }, 1),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await getCharacter(owner, projectId, c.id)).versions).toHaveLength(2);
  });
  it('archives without destroying historical versions and prevents further edits', async () => {
    const c = await createCharacter(owner, projectId, char);
    await archiveCharacter(editor, projectId, c.id, 1);
    const archived = await getCharacter(viewer, projectId, c.id);
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.versions).toHaveLength(1);
    await expect(updateCharacter(owner, projectId, c.id, char, 2)).rejects.toMatchObject({
      status: 409,
    });
  });
  it('prevents the last owner from demotion/removal and checks membership administration', async () => {
    await expect(setMemberRole(owner, projectId, owner, 'VIEWER')).rejects.toMatchObject({
      status: 409,
    });
    await expect(setMemberRole(owner, projectId, owner, null)).rejects.toMatchObject({
      status: 409,
    });
    await expect(setMemberRole(editor, projectId, viewer, 'EDITOR')).rejects.toMatchObject({
      status: 403,
    });
    await setMemberRole(owner, projectId, editor, 'OWNER');
    const results = await Promise.allSettled([
      setMemberRole(owner, projectId, owner, 'EDITOR'),
      setMemberRole(editor, projectId, editor, 'EDITOR'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.projectMembership.count({ where: { projectId, role: 'OWNER' } })).toBe(1);
  });
  it('enforces actual membership checks for private storage', async () => {
    const store = new LocalStorage();
    await expect(
      store.put({ userId: outsider, projectId }, new Uint8Array([1]), 'image/png'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

it('reinitializes the lazy database client after repeated disconnects', async () => {
  await db.$disconnect();
  await db.$disconnect();
  expect(await db.project.count({ where: { id: projectId } })).toBe(1);
});
