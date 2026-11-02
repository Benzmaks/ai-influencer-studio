import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { createProject } from '@/features/projects/service';
import { saveDraft, publishDraft } from '@/features/characters/drafts';
import { defaultAnswers } from '@/features/characters/dna';
import { getCharacter, updateCharacter } from '@/features/characters/service';
import { defaultScene } from '@/features/scenes/schema';
import { saveScene, getScene, duplicateScene, previewScene } from '@/features/scenes/service';
const prefix = 'scene-' + randomUUID();
let owner: string,
  viewer: string,
  outsider: string,
  editor: string,
  projectId: string,
  otherProject: string,
  characterId: string,
  versionId: string;
beforeAll(async () => {
  const users = await Promise.all(
    ['owner', 'viewer', 'outsider', 'editor'].map((r) =>
      db.user.create({ data: { email: `${prefix}-${r}@example.test` } }),
    ),
  );
  [owner, viewer, outsider, editor] = users.map((u) => u.id);
  projectId = (await createProject(owner, { name: prefix })).id;
  otherProject = (await createProject(outsider, { name: prefix + ' other' })).id;
  await db.projectMembership.createMany({
    data: [
      { projectId, userId: viewer, role: 'VIEWER' },
      { projectId, userId: editor, role: 'EDITOR' },
    ],
  });
  const d = await saveDraft(owner, projectId, {
    answers: { ...defaultAnswers(), name: 'Sofia', displayName: 'Sofia' },
    step: 9,
  });
  const c = await publishDraft(owner, projectId, d.id, d.revision);
  characterId = c.id;
  versionId = c.currentVersionId!;
});
afterAll(async () => {
  const ids = [projectId, otherProject].filter(Boolean);
  await db.$transaction(async (tx) => {
    await tx.sceneVersion.deleteMany({ where: { projectId: { in: ids } } });
    await tx.scene.deleteMany({ where: { projectId: { in: ids } } });
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
const input = () => ({ choices: defaultScene(), characterVersionId: versionId });
it('saves structured drafts, resumes, edits and duplicates without modifying old scene or character snapshots', async () => {
  const original = await db.characterVersion.findUniqueOrThrow({ where: { id: versionId } });
  const scene = await saveScene(owner, projectId, input());
  const first = scene.versions[0];
  expect((await getScene(viewer, projectId, scene.id)).versions[0].choices).toEqual(defaultScene());
  const next = await saveScene(
    editor,
    projectId,
    {
      ...input(),
      choices: { ...defaultScene(), location: 'Rome' },
      status: 'ready',
      revision: scene.revision,
    },
    scene.id,
  );
  expect(next.versions).toHaveLength(2);
  expect(next.versions[1]).toEqual(first);
  const copy = await duplicateScene(editor, projectId, scene.id);
  expect(copy.id).not.toBe(scene.id);
  expect(copy.status).toBe('draft');
  await db.$executeRaw`UPDATE "SceneVersion" SET "choices"='{}'::jsonb WHERE "id"=${first.id}`;
  expect(await db.sceneVersion.findUnique({ where: { id: first.id } })).toEqual(first);
  const character = await getCharacter(owner, projectId, characterId);
  await updateCharacter(
    owner,
    projectId,
    characterId,
    {
      name: 'Sofia',
      displayName: 'Sofia',
      age: 28,
      location: 'Rome',
      occupation: 'Creator',
      bio: 'Changed',
    },
    character.revision,
  );
  expect((await getScene(owner, projectId, scene.id)).versions[0].characterVersionId).toBe(
    versionId,
  );
  expect(await db.characterVersion.findUnique({ where: { id: versionId } })).toEqual(original);
});
it('rejects stale and concurrent updates while preserving history', async () => {
  const s = await saveScene(owner, projectId, input());
  const requests = await Promise.allSettled([
    saveScene(owner, projectId, { ...input(), revision: s.revision }, s.id),
    saveScene(editor, projectId, { ...input(), revision: s.revision }, s.id),
  ]);
  expect(requests.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect((await getScene(owner, projectId, s.id)).versions).toHaveLength(2);
});
it('enforces viewer writes and cross-project reads, writes and references', async () => {
  const s = await saveScene(owner, projectId, input());
  await expect(saveScene(viewer, projectId, input())).rejects.toMatchObject({ status: 403 });
  await expect(duplicateScene(viewer, projectId, s.id)).rejects.toMatchObject({ status: 403 });
  await expect(getScene(outsider, projectId, s.id)).rejects.toMatchObject({ status: 404 });
  await expect(getScene(outsider, otherProject, s.id)).rejects.toMatchObject({ status: 404 });
  await expect(saveScene(outsider, otherProject, input())).rejects.toMatchObject({ status: 404 });
  await expect(previewScene(outsider, otherProject, input())).rejects.toMatchObject({
    status: 404,
  });
});
it('allows conflicted drafts but blocks ready scenes, and retains exact protected anchors', async () => {
  const i = {
    ...input(),
    choices: {
      ...defaultScene(),
      overrides: [{ field: 'faceShape', value: 'Different face', resolution: 'scene' }],
    },
  };
  const s = await saveScene(owner, projectId, i);
  expect((s.versions[0].prompt as { ready: boolean }).ready).toBe(false);
  await expect(
    saveScene(owner, projectId, { ...i, status: 'ready', revision: s.revision }, s.id),
  ).rejects.toMatchObject({ status: 409 });
  expect((await getScene(owner, projectId, s.id)).revision).toBe(1);
});
it('rejects cross-project version references at the database boundary', async () => {
  const scene = await saveScene(owner, projectId, input());
  await expect(
    db.sceneVersion.create({
      data: {
        projectId: otherProject,
        sceneId: scene.id,
        versionNumber: 99,
        characterId,
        characterVersionId: versionId,
        choices: defaultScene(),
        prompt: {},
        createdBy: outsider,
      },
    }),
  ).rejects.toMatchObject({ code: 'P2003' });
});
it('round-trips all custom scene fields and denies revoked memberships', async () => {
  const choices = {
    ...defaultScene(),
    location: 'Custom location',
    environment: 'Glass conservatory',
    activity: 'Sketching',
    outfit: 'Blue linen',
    accessories: 'Silver bracelet',
    pose: 'Leaning on a table',
    expression: 'Quiet concentration',
    mood: 'Reflective',
    camera: 'Three-quarter angle',
    framing: 'Waist-up',
    lens: '58mm vintage',
    depthOfField: 'f/2.8',
    lighting: 'Diffused skylight',
    time: 'Dawn',
    weather: 'Light drizzle',
    atmosphere: 'Tranquil',
    composition: 'Leading lines',
    candidness: 'Observed candid',
    realism: 5,
    photographyStyle: 'Analog portrait',
    generationType: 'video' as const,
  };
  const s = await saveScene(editor, projectId, { ...input(), choices });
  expect((await getScene(owner, projectId, s.id)).versions[0].choices).toEqual(choices);
  await db.projectMembership.delete({ where: { projectId_userId: { projectId, userId: editor } } });
  await expect(getScene(editor, projectId, s.id)).rejects.toMatchObject({ status: 404 });
  await expect(
    saveScene(editor, projectId, { ...input(), revision: s.revision }, s.id),
  ).rejects.toMatchObject({ status: 404 });
});
