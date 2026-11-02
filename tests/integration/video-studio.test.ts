import { spawn } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { Queue, Worker } from 'bullmq';
import { db } from '@/lib/db';
import { createProject } from '@/features/projects/service';
import { saveDraft, publishDraft } from '@/features/characters/drafts';
import { defaultAnswers } from '@/features/characters/dna';
import { defaultScene } from '@/features/scenes/schema';
import { saveScene } from '@/features/scenes/service';
import { defaultShot } from '@/features/videos/schema';
import {
  saveStoryboard,
  getStoryboard,
  duplicateStoryboard,
  createVideoGeneration,
  listVideoGenerations,
  readVideoAsset,
  approvedImages,
} from '@/features/videos/service';
import {
  createGeneration,
  getGeneration,
  cancelGeneration,
  retryGeneration,
  reviewAsset,
  readAsset,
} from '@/features/generation/service';
import { processGeneration } from '@/workers/processor';
import { processVideoGeneration } from '@/workers/video-processor';
import { deliverOutbox, redisConnection } from '@/workers/queue';
import { mockVideo } from '@/ai/mock';
import type { MediaInput } from '@/ai/contracts';
import { LocalStorage } from '@/storage/local';
const prefix = 'video-' + randomUUID();
let owner: string,
  editor: string,
  viewer: string,
  outsider: string,
  projectId: string,
  otherProject: string,
  characterVersionId: string,
  sceneVersionId: string;
const boardInput = () => ({
  title: 'A café moment',
  characterVersionId,
  sceneVersionId,
  status: 'ready',
  shots: [defaultShot(), { ...defaultShot(), expression: 'Smile to laughter' }],
});
const request = (revision: string, extras: Record<string, unknown> = {}) => ({
  storyboardRevisionId: revision,
  operation: 'generate',
  provider: 'mock-video',
  model: 'studio-video-sample-v1',
  seed: 42,
  ...extras,
});
async function board() {
  return saveStoryboard(owner, projectId, boardInput());
}
beforeAll(async () => {
  const users = await Promise.all(
    ['owner', 'editor', 'viewer', 'outsider'].map((role) =>
      db.user.create({ data: { email: `${prefix}-${role}@example.test` } }),
    ),
  );
  [owner, editor, viewer, outsider] = users.map((u) => u.id);
  projectId = (await createProject(owner, { name: prefix })).id;
  otherProject = (await createProject(outsider, { name: prefix + '-other' })).id;
  await db.projectMembership.createMany({
    data: [
      { projectId, userId: editor, role: 'EDITOR' },
      { projectId, userId: viewer, role: 'VIEWER' },
    ],
  });
  const d = await saveDraft(owner, projectId, {
    answers: {
      ...defaultAnswers(),
      name: 'Video Sofia',
      displayName: 'Sofia',
      signatureImperfections: ['Right brow scar'],
    },
    step: 9,
  });
  characterVersionId = (await publishDraft(owner, projectId, d.id, d.revision)).currentVersionId!;
  sceneVersionId = (
    await saveScene(owner, projectId, {
      characterVersionId,
      choices: defaultScene(),
      status: 'ready',
    })
  ).versions[0].id;
});
afterAll(async () => {
  const ids = [projectId, otherProject].filter(Boolean),
    actor = { userId: owner, projectId };
  const files = [
    ...(await db.videoAsset.findMany({ where: { projectId: { in: ids }, key: { not: null } } })),
    ...(await db.imageAsset.findMany({ where: { projectId: { in: ids }, key: { not: null } } })),
  ];
  for (const a of files) await new LocalStorage().delete(actor, a.key!).catch(() => {});
  await db.$transaction(async (tx) => {
    await tx.videoAsset.deleteMany({ where: { projectId: { in: ids } } });
    await tx.generation.deleteMany({ where: { projectId: { in: ids }, kind: 'video' } });
    await tx.storyboardShot.deleteMany({ where: { revision: { projectId: { in: ids } } } });
    await tx.storyboardRevision.deleteMany({ where: { projectId: { in: ids } } });
    await tx.storyboard.deleteMany({ where: { projectId: { in: ids } } });
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
it('saves every shot field and immutable revisions with concurrency protection and independent duplication', async () => {
  const original = await board(),
    first = original.versions[0];
  const input = {
    ...boardInput(),
    revision: original.revision,
    shots: [
      {
        ...defaultShot(),
        action: 'Walks',
        audio: 'Café ambience',
        dialogue: 'Hello',
        performance: { ...defaultShot().performance, mouthMovement: 'Gentle speech planning' },
      },
    ],
  };
  const results = await Promise.allSettled([
    saveStoryboard(owner, projectId, input, original.id),
    saveStoryboard(editor, projectId, input, original.id),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const updated = await getStoryboard(viewer, projectId, original.id);
  expect(updated.versions).toHaveLength(2);
  expect(updated.versions[1]).toEqual(first);
  expect(updated.versions[0].shots[0]).toMatchObject({
    action: 'Walks',
    audio: 'Café ambience',
    dialogue: 'Hello',
    performance: { mouthMovement: 'Gentle speech planning' },
  });
  const copy = await duplicateStoryboard(editor, projectId, original.id);
  expect(copy.id).not.toBe(original.id);
  expect(copy.status).toBe('draft');
  expect(copy.versions).toHaveLength(1);
});
it('enforces project roles, exact version matching, shot identity protection and provider capabilities', async () => {
  const b = await board();
  await expect(saveStoryboard(viewer, projectId, boardInput())).rejects.toMatchObject({
    status: 403,
  });
  await expect(getStoryboard(outsider, otherProject, b.id)).rejects.toMatchObject({ status: 404 });
  await expect(
    createVideoGeneration(viewer, projectId, request(b.versions[0].id), randomUUID()),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    createVideoGeneration(outsider, otherProject, request(b.versions[0].id), randomUUID()),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    saveStoryboard(owner, projectId, { ...boardInput(), characterVersionId: 'foreign' }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    saveStoryboard(owner, projectId, {
      ...boardInput(),
      shots: [{ ...defaultShot(), action: 'Remove scar and change facial structure' }],
    }),
  ).rejects.toMatchObject({ status: 409 });
  const draft = await saveStoryboard(owner, projectId, {
    ...boardInput(),
    status: 'draft',
    shots: [{ ...defaultShot(), duration: 4 }],
  });
  await expect(
    createVideoGeneration(owner, projectId, request(draft.versions[0].id), randomUUID()),
  ).rejects.toMatchObject({ status: 409 });
  for (const operation of ['edit', 'extend', 'variations'])
    await expect(
      createVideoGeneration(
        owner,
        projectId,
        request(b.versions[0].id, { operation }),
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 409 });
  await expect(
    createVideoGeneration(
      owner,
      projectId,
      request(b.versions[0].id, { operation: 'image-to-video' }),
      randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 400 });
});
it('atomically records outbox and per-shot slots, deduplicates concurrent requests and rejects changed keys', async () => {
  const b = await board(),
    key = randomUUID();
  const jobs = await Promise.all([
    createVideoGeneration(owner, projectId, request(b.versions[0].id), key),
    createVideoGeneration(editor, projectId, request(b.versions[0].id), key),
  ]);
  expect(jobs[0].id).toBe(jobs[1].id);
  expect(jobs[0].videoAssets).toHaveLength(2);
  expect(await db.generationOutbox.count({ where: { generationId: jobs[0].id } })).toBe(1);
  await expect(
    createVideoGeneration(owner, projectId, request(b.versions[0].id, { seed: 43 }), key),
  ).rejects.toMatchObject({ status: 409 });
  await cancelGeneration(owner, projectId, jobs[0].id);
});
it('produces labeled text-to-video shot samples and downloads without changing referenced versions', async () => {
  const b = await board(),
    revision = b.versions[0],
    c = await db.characterVersion.findUnique({ where: { id: characterVersionId } }),
    s = await db.sceneVersion.findUnique({ where: { id: sceneVersionId } });
  const j = await createVideoGeneration(owner, projectId, request(revision.id), randomUUID());
  await saveStoryboard(
    owner,
    projectId,
    { ...boardInput(), revision: b.revision, title: 'A later revision', shots: [defaultShot()] },
    b.id,
  );
  await processGeneration(j.id);
  const done = await getGeneration(viewer, projectId, j.id);
  expect(done.status).toBe('completed');
  expect(done.videoAssets).toHaveLength(2);
  expect(done.assets).toHaveLength(0);
  expect(done.input).toMatchObject({
    storyboardRevisionId: revision.id,
    characterVersionId,
    sceneVersionId,
    audioRendered: false,
    mock: true,
    preservation: { signatureImperfections: ['Right brow scar'] },
  });
  for (const a of done.videoAssets) {
    const download = await readVideoAsset(viewer, projectId, a.id);
    expect(download.bytes.subarray(4, 8).toString()).toBe('ftyp');
    expect(createHash('sha256').update(download.bytes).digest('hex')).toBe(a.checksum);
    await expect(readVideoAsset(outsider, otherProject, a.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      db.videoAsset.update({ where: { id: a.id }, data: { checksum: 'overwritten' } }),
    ).rejects.toThrow();
  }
  expect(await db.characterVersion.findUnique({ where: { id: characterVersionId } })).toEqual(c);
  expect(await db.sceneVersion.findUnique({ where: { id: sceneVersionId } })).toEqual(s);
  expect(
    await db.storyboardRevision.findUnique({
      where: { id: revision.id },
      include: { shots: { orderBy: { shotNumber: 'asc' } } },
    }),
  ).toEqual(revision);
  await expect(
    db.storyboardShot.update({
      where: { id: revision.shots[0].id },
      data: { action: 'overwrite' },
    }),
  ).rejects.toThrow();
  await expect(db.storyboardShot.delete({ where: { id: revision.shots[0].id } })).rejects.toThrow();
  await expect(
    db.generation.update({ where: { id: j.id }, data: { input: { overwritten: true } } }),
  ).rejects.toThrow();
  expect((await listVideoGenerations(viewer, projectId)).some((v) => v.id === j.id)).toBe(true);
});
it('pins approved image source bytes/metadata and rejects unapproved, mismatched and cross-project sources', async () => {
  const image = await createGeneration(
    owner,
    projectId,
    {
      characterVersionId,
      sceneVersionId,
      count: 1,
      aspectRatio: '4:5',
      provider: 'mock-image',
      model: 'studio-sample-v1',
      seed: 42,
    },
    randomUUID(),
  );
  await processGeneration(image.id);
  const source = (await getGeneration(owner, projectId, image.id)).assets[0],
    before = await readAsset(owner, projectId, source.id),
    b = await board();
  const data = request(b.versions[0].id, { operation: 'image-to-video', sourceImageId: source.id });
  await expect(createVideoGeneration(owner, projectId, data, randomUUID())).rejects.toMatchObject({
    status: 409,
  });
  await reviewAsset(owner, projectId, source.id, 'favourite');
  expect((await approvedImages(owner, projectId)).some((a) => a.id === source.id)).toBe(true);
  const j = await createVideoGeneration(editor, projectId, data, randomUUID());
  const calls: MediaInput[] = [];
  await processVideoGeneration(j.id, {
    provider: {
      ...mockVideo,
      generate: async (input) => {
        calls.push(input);
        return mockVideo.generate(input);
      },
    },
  });
  expect(calls).toHaveLength(2);
  expect(Buffer.from(calls[0].source!)).toEqual(before.bytes);
  expect(calls[0].references).toMatchObject({
    preservation: { signatureImperfections: ['Right brow scar'] },
    sourceImage: { id: source.id, checksum: source.checksum },
    storyboardRevisionId: b.versions[0].id,
  });
  expect(
    (await getGeneration(owner, projectId, j.id)).videoAssets.every(
      (a) => a.sourceImageId === source.id,
    ),
  ).toBe(true);
  const after = await readAsset(owner, projectId, source.id);
  expect(after.bytes).toEqual(before.bytes);
  expect(after.asset.checksum).toBe(before.asset.checksum);
  expect(after.asset.metadata).toEqual(before.asset.metadata);
  await expect(
    createVideoGeneration(owner, projectId, { ...data, sourceImageId: 'foreign' }, randomUUID()),
  ).rejects.toMatchObject({ status: 409 });
  const anotherScene = await saveScene(owner, projectId, {
    characterVersionId,
    choices: { ...defaultScene(), title: 'Another scene' },
    status: 'ready',
  });
  const otherBoard = await saveStoryboard(owner, projectId, {
    ...boardInput(),
    sceneVersionId: anotherScene.versions[0].id,
  });
  await expect(
    createVideoGeneration(
      owner,
      projectId,
      request(otherBoard.versions[0].id, { operation: 'image-to-video', sourceImageId: source.id }),
      randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 409 });
  const revoked = await createVideoGeneration(owner, projectId, data, randomUUID());
  await reviewAsset(owner, projectId, source.id, 'rejected');
  await processVideoGeneration(revoked.id);
  expect((await getGeneration(owner, projectId, revoked.id)).status).toBe('failed');
});
it('cancels queued and in-flight video jobs, fences late output and retains completed originals', async () => {
  const b = await board();
  const queued = await createVideoGeneration(
    owner,
    projectId,
    request(b.versions[0].id),
    randomUUID(),
  );
  await cancelGeneration(editor, projectId, queued.id);
  await processVideoGeneration(queued.id);
  expect(
    (await getGeneration(owner, projectId, queued.id)).videoAssets.every(
      (a) => a.status === 'cancelled',
    ),
  ).toBe(true);
  const running = await createVideoGeneration(
    owner,
    projectId,
    request(b.versions[0].id),
    randomUUID(),
  );
  let count = 0;
  await processVideoGeneration(running.id, {
    afterStore: async () => {
      if (++count === 2) await cancelGeneration(owner, projectId, running.id);
    },
  });
  expect(
    (await getGeneration(owner, projectId, running.id)).videoAssets.map((a) => a.status),
  ).toEqual(['completed', 'cancelled']);
  await expect(cancelGeneration(viewer, projectId, queued.id)).rejects.toMatchObject({
    status: 403,
  });
});
it('bounds failed-shot attempts, retries only failed slots and rejects concurrent consumers', async () => {
  const b = await board(),
    j = await createVideoGeneration(owner, projectId, request(b.versions[0].id), randomUUID());
  await processVideoGeneration(j.id, {
    provider: {
      ...mockVideo,
      generate: async (input) => {
        if (input.seed === 43) throw new Error('Injected failure');
        return mockVideo.generate(input);
      },
    },
  });
  const partial = await getGeneration(owner, projectId, j.id);
  expect(partial.status).toBe('partial');
  expect(partial.videoAssets.map((a) => a.attempts)).toEqual([1, 3]);
  const completed = partial.videoAssets[0];
  await retryGeneration(owner, projectId, j.id);
  await Promise.all([processVideoGeneration(j.id), processVideoGeneration(j.id)]);
  const done = await getGeneration(owner, projectId, j.id);
  expect(done.status).toBe('completed');
  expect(done.videoAssets[0]).toEqual(completed);
  await expect(retryGeneration(owner, projectId, j.id)).rejects.toMatchObject({ status: 409 });
});
it('recovers abandoned leases and dispatches repaired video outbox entries through real BullMQ', async () => {
  const b = await board(),
    j = await createVideoGeneration(owner, projectId, request(b.versions[0].id), randomUUID());
  await db.generation.update({
    where: { id: j.id },
    data: {
      status: 'processing',
      leaseToken: 'dead-worker',
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  await processVideoGeneration(j.id);
  expect((await getGeneration(owner, projectId, j.id)).status).toBe('completed');
  const name = 'video-outbox-' + randomUUID(),
    queue = new Queue(name, { connection: redisConnection() });
  const worker = new Worker(
    name,
    async (job) => {
      await processGeneration(job.data.generationId);
    },
    { connection: redisConnection() },
  );
  try {
    const next = await createVideoGeneration(
      owner,
      projectId,
      request(b.versions[0].id),
      randomUUID(),
    );
    await db.generationOutbox.update({
      where: { generationId: next.id },
      data: { deliveredAt: new Date(Date.now() - 20000) },
    });
    await deliverOutbox(queue);
    await deliverOutbox(queue);
    await expect
      .poll(async () => (await getGeneration(owner, projectId, next.id)).status, { timeout: 15000 })
      .toBe('completed');
  } finally {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
  }
});
it('recovers a real killed video worker without duplicating committed clips', async () => {
  const b = await board(),
    name = 'video-kill-' + randomUUID(),
    queue = new Queue(name, { connection: redisConnection() });
  const start = (delay: string) =>
    spawn(process.execPath, ['--import', 'tsx', 'workers/run.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, IMAGE_QUEUE_NAME: name, MOCK_VIDEO_DELAY_MS: delay },
      stdio: 'ignore',
    });
  let worker: ReturnType<typeof start> | undefined;
  try {
    const j = await createVideoGeneration(
      owner,
      projectId,
      request(b.versions[0].id),
      randomUUID(),
    );
    worker = start('10000');
    await expect
      .poll(async () => (await getGeneration(owner, projectId, j.id)).status, { timeout: 15000 })
      .toBe('processing');
    worker.kill('SIGKILL');
    await new Promise<void>((resolve) => worker!.once('exit', () => resolve()));
    worker = start('0');
    await expect
      .poll(async () => (await getGeneration(owner, projectId, j.id)).status, {
        timeout: 50000,
        interval: 500,
      })
      .toBe('completed');
    const done = await getGeneration(owner, projectId, j.id);
    expect(done.videoAssets).toHaveLength(2);
    expect(done.videoAssets.every((a) => a.attempts <= 3)).toBe(true);
  } finally {
    if (worker && worker.exitCode === null) {
      worker.kill('SIGKILL');
      await new Promise<void>((resolve) => worker!.once('exit', () => resolve()));
    }
    await queue.obliterate({ force: true });
    await queue.close();
  }
}, 65000);
