import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { createProject, setMemberRole } from '@/features/projects/service';
import {
  saveDraft,
  getDraft,
  listDrafts,
  publishDraft,
  discardDraft,
} from '@/features/characters/drafts';
import {
  getCharacter,
  updateCharacter,
  duplicateCharacter,
  archiveCharacter,
} from '@/features/characters/service';
import { defaultAnswers, readSnapshot } from '@/features/characters/dna';
const prefix = `dna-${randomUUID()}`;
let owner: string,
  editor: string,
  viewer: string,
  outsider: string,
  projectId: string,
  otherProject: string;
const answers = {
  ...defaultAnswers(),
  name: 'Sofia',
  displayName: 'Sofia',
  nationality: 'French',
  signatureImperfections: ['Small scar on right brow'],
};
beforeAll(async () => {
  const users = await Promise.all(
    ['owner', 'editor', 'viewer', 'outsider'].map((role) =>
      db.user.create({ data: { email: `${prefix}-${role}@example.test` } }),
    ),
  );
  [owner, editor, viewer, outsider] = users.map((u) => u.id);
  projectId = (await createProject(owner, { name: prefix })).id;
  otherProject = (await createProject(outsider, { name: prefix + ' separate' })).id;
  await db.projectMembership.createMany({
    data: [
      { projectId, userId: editor, role: 'EDITOR' },
      { projectId, userId: viewer, role: 'VIEWER' },
    ],
  });
});
afterAll(async () => {
  const ids = [projectId, otherProject].filter(Boolean);
  await db.$transaction(async (tx) => {
    await tx.characterDraft.deleteMany({ where: { projectId: { in: ids } } });
    await tx.character.updateMany({
      where: { projectId: { in: ids } },
      data: { currentVersionId: null },
    });
    await tx.characterVersion.deleteMany({ where: { projectId: { in: ids } } });
    await tx.character.deleteMany({ where: { projectId: { in: ids } } });
    await tx.auditEvent.deleteMany({ where: { projectId: { in: ids } } });
    await tx.project.deleteMany({ where: { id: { in: ids } } });
    await tx.user.deleteMany({ where: { email: { startsWith: prefix } } });
  });
  await db.$disconnect();
});
describe('DNA drafts, authorization and immutable publication', () => {
  it('saves an incomplete draft, resumes and rejects stale saves without creating a character', async () => {
    const d = await saveDraft(owner, projectId, { answers: defaultAnswers(), step: 0 });
    expect((await getDraft(owner, projectId, d.id)).answers).toMatchObject({ name: '' });
    expect(await db.character.count({ where: { projectId } })).toBe(0);
    const updated = await saveDraft(owner, projectId, { answers, step: 3 }, d.id, d.revision);
    await expect(
      saveDraft(owner, projectId, { answers, step: 1 }, d.id, d.revision),
    ).rejects.toMatchObject({ status: 409 });
    expect((await getDraft(owner, projectId, d.id)).step).toBe(3);
    await discardDraft(owner, projectId, d.id, updated.revision);
  });
  it('enforces private draft ownership, project boundaries and viewer write restrictions', async () => {
    const d = await saveDraft(owner, projectId, { answers, step: 1 });
    expect(await listDrafts(editor, projectId)).toHaveLength(0);
    await expect(getDraft(editor, projectId, d.id)).rejects.toMatchObject({ status: 404 });
    await expect(getDraft(outsider, otherProject, d.id)).rejects.toMatchObject({ status: 404 });
    await expect(publishDraft(editor, projectId, d.id, d.revision)).rejects.toMatchObject({
      status: 404,
    });
    await expect(saveDraft(viewer, projectId, { answers, step: 0 })).rejects.toMatchObject({
      status: 403,
    });
    await expect(discardDraft(editor, projectId, d.id, d.revision)).rejects.toMatchObject({
      status: 409,
    });
  });
  it('publishes exactly once under concurrent requests and stores a comprehensive mock profile', async () => {
    const d = await saveDraft(owner, projectId, { answers, step: 9 });
    const results = await Promise.allSettled([
      publishDraft(owner, projectId, d.id, d.revision),
      publishDraft(owner, projectId, d.id, d.revision),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const completed = results.find((r) => r.status === 'fulfilled');
    if (completed?.status !== 'fulfilled') throw new Error('Publication did not execute');
    const detail = await getCharacter(viewer, projectId, completed.value.id);
    expect(detail.versions).toHaveLength(1);
    expect(
      readSnapshot(detail.currentVersion?.snapshot)?.profile.visualBible.signatureImperfections,
    ).toEqual(answers.signatureImperfections);
    await expect(publishDraft(owner, projectId, d.id, d.revision)).rejects.toMatchObject({
      status: 404,
    });
  });
  it('appends permanent edits and preserves DNA on legacy identity updates', async () => {
    const d = await saveDraft(owner, projectId, { answers, step: 9 });
    const c = await publishDraft(owner, projectId, d.id, d.revision);
    const original = await db.characterVersion.findUniqueOrThrow({
      where: { id: c.currentVersionId! },
    });
    const edit = await saveDraft(editor, projectId, {
      answers: { ...answers, hairColor: 'Red' },
      step: 9,
      characterId: c.id,
      baseRevision: c.revision,
    });
    await publishDraft(editor, projectId, edit.id, edit.revision);
    expect(await db.characterVersion.findUnique({ where: { id: original.id } })).toEqual(original);
    const current = await getCharacter(owner, projectId, c.id);
    await updateCharacter(
      owner,
      projectId,
      c.id,
      {
        name: answers.name,
        displayName: answers.displayName,
        age: 25,
        location: 'Paris',
        occupation: 'Creator',
        bio: 'Updated biography',
      },
      current.revision,
    );
    const latest = await getCharacter(owner, projectId, c.id);
    expect(latest.versions).toHaveLength(3);
    expect(readSnapshot(latest.currentVersion?.snapshot)?.answers.hairColor).toBe('Red');
    expect(readSnapshot(latest.currentVersion?.snapshot)?.answers.signatureImperfections).toEqual(
      answers.signatureImperfections,
    );
  });
  it('retains conflicted edit drafts after concurrent permanent updates and rejects archived targets', async () => {
    const d = await saveDraft(owner, projectId, { answers, step: 9 });
    const c = await publishDraft(owner, projectId, d.id, d.revision);
    const edit = await saveDraft(owner, projectId, {
      answers,
      step: 9,
      characterId: c.id,
      baseRevision: c.revision,
    });
    await archiveCharacter(owner, projectId, c.id, c.revision);
    await expect(publishDraft(owner, projectId, edit.id, edit.revision)).rejects.toMatchObject({
      status: 409,
    });
    expect((await getDraft(owner, projectId, edit.id)).revision).toBe(edit.revision);
    expect((await getCharacter(owner, projectId, c.id)).versions).toHaveLength(1);
  });
  it('duplicates identity anchors into an independent character and respects revoked membership', async () => {
    const d = await saveDraft(editor, projectId, { answers, step: 9 });
    const c = await publishDraft(editor, projectId, d.id, d.revision);
    const copy = await duplicateCharacter(owner, projectId, c.id);
    expect(copy.id).not.toBe(c.id);
    expect(copy.revision).toBe(1);
    expect(readSnapshot(copy.currentVersion?.snapshot)?.answers.signatureImperfections).toEqual(
      answers.signatureImperfections,
    );
    await expect(duplicateCharacter(viewer, projectId, c.id)).rejects.toMatchObject({
      status: 403,
    });
    const pending = await saveDraft(editor, projectId, { answers, step: 0 });
    await setMemberRole(owner, projectId, editor, null);
    await expect(
      publishDraft(editor, projectId, pending.id, pending.revision),
    ).rejects.toMatchObject({ status: 404 });
  });
});
