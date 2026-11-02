import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { createProject } from '@/features/projects/service';
import { saveDraft, publishDraft } from '@/features/characters/drafts';
import { defaultAnswers } from '@/features/characters/dna';
import { defaultScene } from '@/features/scenes/schema';
import { saveScene } from '@/features/scenes/service';
import {
  createGeneration,
  getGeneration,
  readAsset,
  reviewAsset,
} from '@/features/generation/service';
import {
  requestEdit,
  getAsset,
  selectFinal,
  compareAssets,
  assetLibrary,
  duplicateAsset,
} from '@/features/assets/service';
import { processGeneration } from '@/workers/processor';
import { mockImage } from '@/ai/mock';
import type { MediaInput } from '@/ai/contracts';
import { LocalStorage } from '@/storage/local';
const prefix = 'editing-' + randomUUID();
let owner: string,
  editor: string,
  viewer: string,
  outsider: string,
  projectId: string,
  otherProject: string,
  characterVersionId: string,
  sceneVersionId: string;
const input = () => ({
  characterVersionId,
  sceneVersionId,
  count: 4,
  aspectRatio: '4:5',
  provider: 'mock-image',
  model: 'studio-sample-v1',
  seed: 42,
});
beforeAll(async () => {
  const users = await Promise.all(
    ['owner', 'editor', 'viewer', 'outsider'].map((r) =>
      db.user.create({ data: { email: `${prefix}-${r}@example.test` } }),
    ),
  );
  [owner, editor, viewer, outsider] = users.map((u) => u.id);
  projectId = (await createProject(owner, { name: prefix })).id;
  otherProject = (await createProject(outsider, { name: prefix + ' other' })).id;
  await db.projectMembership.createMany({
    data: [
      { projectId, userId: editor, role: 'EDITOR' },
      { projectId, userId: viewer, role: 'VIEWER' },
    ],
  });
  const draft = await saveDraft(owner, projectId, {
    answers: {
      ...defaultAnswers(),
      name: 'Image Sofia',
      displayName: 'Image Sofia',
      signatureImperfections: ['Right brow scar'],
    },
    step: 9,
  });
  const c = await publishDraft(owner, projectId, draft.id, draft.revision);
  characterVersionId = c.currentVersionId!;
  const s = await saveScene(owner, projectId, {
    characterVersionId,
    choices: defaultScene(),
    status: 'ready',
  });
  sceneVersionId = s.versions[0].id;
});
afterAll(async () => {
  const ids = [projectId, otherProject].filter(Boolean);
  const assets = await db.imageAsset.findMany({
    where: { projectId: { in: ids }, key: { not: null } },
  });
  for (const a of assets)
    await new LocalStorage()
      .delete({ userId: owner, projectId: a.projectId }, a.key!)
      .catch(() => {});
  await db.$transaction(async (tx) => {
    await tx.assetSelection.deleteMany({ where: { projectId: { in: ids } } });
    await tx.imageAsset.deleteMany({ where: { projectId: { in: ids } } });
    await tx.generation.deleteMany({ where: { projectId: { in: ids } } });
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

async function original() {
  const job = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
  await processGeneration(job.id);
  return (await getGeneration(owner, projectId, job.id)).assets[0];
}
it('edits asynchronously with source bytes, exact DNA, effective instructions and idempotency', async () => {
  const source = await original(),
    before = await readAsset(owner, projectId, source.id);
  const key = randomUUID();
  const edit = await requestEdit(
    editor,
    projectId,
    source.id,
    { instruction: 'Change the outfit to a black evening dress.', scope: 'scene-only' },
    key,
  );
  expect(edit.status).toBe('queued');
  expect(
    (
      await requestEdit(
        editor,
        projectId,
        source.id,
        { instruction: 'Change the outfit to a black evening dress.', scope: 'scene-only' },
        key,
      )
    ).id,
  ).toBe(edit.id);
  await expect(
    requestEdit(
      editor,
      projectId,
      source.id,
      { instruction: 'Change background to Paris', scope: 'scene-only' },
      key,
    ),
  ).rejects.toMatchObject({ status: 409 });
  const captured: MediaInput[] = [];
  await processGeneration(edit.id, {
    provider: {
      ...mockImage,
      edit: async (i, o) => {
        captured.push(i);
        return mockImage.edit(i, o);
      },
    },
  });
  expect(captured.length).toBe(1);
  expect(Buffer.from(captured[0].source!)).toEqual(before.bytes);
  expect(captured[0].instruction).toContain('black evening dress');
  expect(captured[0].references?.sourceImage).toMatchObject({
    id: source.id,
    checksum: source.checksum,
  });
  expect(captured[0].references?.signatureImperfections).toEqual(['Right brow scar']);
  const child = (await getGeneration(owner, projectId, edit.id)).assets[0];
  expect(child.status).toBe('completed');
  expect(child.sourceAssetId).toBe(source.id);
  expect(child.checksum).not.toBe(source.checksum);
  expect(child.metadata).toMatchObject({
    originalAssetId: source.id,
    operation: 'edit',
    editScope: 'scene-only',
  });
  expect((await readAsset(owner, projectId, source.id)).bytes).toEqual(before.bytes);
  expect((await readAsset(owner, projectId, source.id)).asset.checksum).toBe(source.checksum);
  const history = await getAsset(viewer, projectId, source.id);
  expect(history.history.map((a) => a.id)).toEqual([source.id, child.id]);
});
it('branches edits and copies while retaining root references and original bytes', async () => {
  const source = await original();
  const edit = await requestEdit(
    owner,
    projectId,
    source.id,
    { instruction: 'Change lighting to golden hour.', scope: 'scene-only' },
    randomUUID(),
  );
  await processGeneration(edit.id);
  const edited = (await getGeneration(owner, projectId, edit.id)).assets[0];
  const next = await requestEdit(
    owner,
    projectId,
    edited.id,
    { instruction: 'Make expression a soft smile.', scope: 'scene-only' },
    randomUUID(),
  );
  await processGeneration(next.id);
  const child = (await getGeneration(owner, projectId, next.id)).assets[0];
  expect((child.metadata as { editTrail: string[] }).editTrail).toHaveLength(2);
  expect(child.metadata).toMatchObject({ originalAssetId: source.id });
  const copy = await duplicateAsset(owner, projectId, edited.id, randomUUID());
  await processGeneration(copy.id);
  expect((await getGeneration(owner, projectId, copy.id)).assets[0].checksum).toBe(edited.checksum);
  expect((await getAsset(owner, projectId, source.id)).history).toHaveLength(4);
});
it('enforces project permissions and protected identity checks', async () => {
  const source = await original();
  const edit = { instruction: 'Change outfit to a black dress.', scope: 'scene-only' };
  await expect(requestEdit(viewer, projectId, source.id, edit, randomUUID())).rejects.toMatchObject(
    { status: 403 },
  );
  await expect(
    requestEdit(outsider, otherProject, source.id, edit, randomUUID()),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    requestEdit(
      owner,
      projectId,
      source.id,
      { instruction: 'Remove the right brow scar.', scope: 'scene-only' },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(compareAssets(outsider, otherProject, [source.id, 'unknown'])).rejects.toMatchObject(
    { status: 404 },
  );
  await expect(compareAssets(owner, projectId, [source.id, source.id])).rejects.toThrow();
  await expect(duplicateAsset(viewer, projectId, source.id, randomUUID())).rejects.toMatchObject({
    status: 403,
  });
});
it('persists preferred final selection, rejects stale/unrelated selections, and clears final on rejection', async () => {
  const source = await original();
  const edit = await requestEdit(
    owner,
    projectId,
    source.id,
    { instruction: 'Change background to a Paris café.', scope: 'scene-only' },
    randomUUID(),
  );
  await processGeneration(edit.id);
  const child = (await getGeneration(owner, projectId, edit.id)).assets[0];
  const results = await Promise.allSettled([
    selectFinal(owner, projectId, source.id, { assetId: child.id, revision: 0 }),
    selectFinal(editor, projectId, source.id, { assetId: source.id, revision: 0 }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const current = (await getAsset(owner, projectId, source.id)).selection!;
  await expect(
    selectFinal(viewer, projectId, source.id, { assetId: child.id, revision: current.revision }),
  ).rejects.toMatchObject({ status: 403 });
  const other = await original();
  await expect(
    selectFinal(owner, projectId, source.id, { assetId: other.id, revision: current.revision }),
  ).rejects.toMatchObject({ status: 409 });
  await selectFinal(owner, projectId, source.id, { assetId: child.id, revision: current.revision });
  expect((await getAsset(owner, projectId, source.id)).selection?.assetId).toBe(child.id);
  await reviewAsset(owner, projectId, child.id, 'rejected');
  expect((await getAsset(owner, projectId, source.id)).selection).toBeNull();
});
it('protects completed records and prevents cyclic, self and invalid parent relationships in SQL', async () => {
  const source = await original();
  await expect(
    db.imageAsset.update({ where: { id: source.id }, data: { metadata: { changed: true } } }),
  ).rejects.toThrow();
  await expect(
    db.imageAsset.update({ where: { id: source.id }, data: { sourceAssetId: source.id } }),
  ).rejects.toThrow();
  expect((await readAsset(owner, projectId, source.id)).asset.checksum).toBe(source.checksum);
  await expect(
    db.imageAsset.create({
      data: {
        id: 'self-' + randomUUID(),
        projectId,
        generationId: source.generationId,
        index: 7,
        metadata: {},
        sourceAssetId: 'missing-source',
      },
    }),
  ).rejects.toThrow();
});
it('searches, filters, compares and selects through the asset library with authorization', async () => {
  const source = await original();
  const edit = await requestEdit(
    owner,
    projectId,
    source.id,
    { instruction: 'Change outfit to unique emerald evening dress.', scope: 'scene-only' },
    randomUUID(),
  );
  await processGeneration(edit.id);
  const child = (await getGeneration(owner, projectId, edit.id)).assets[0];
  const result = await assetLibrary(viewer, projectId, { q: 'unique emerald', kind: 'edit' });
  expect(result.assets.map((a) => a.id)).toEqual([child.id]);
  await reviewAsset(owner, projectId, child.id, 'favourite');
  expect(
    (
      await assetLibrary(owner, projectId, {
        q: 'unique emerald',
        review: 'favourite',
        characterId: result.assets[0].generation.characterId,
        sceneId: result.assets[0].generation.sceneId,
      })
    ).total,
  ).toBe(1);
  const comparison = await compareAssets(viewer, projectId, [source.id, child.id]);
  expect(comparison).toHaveLength(2);
  await selectFinal(owner, projectId, source.id, { assetId: child.id, revision: 0 });
  expect(
    (await assetLibrary(viewer, projectId, { review: 'final', q: 'unique emerald' })).assets[0].id,
  ).toBe(child.id);
  await expect(assetLibrary(outsider, projectId, {})).rejects.toMatchObject({ status: 404 });
});
