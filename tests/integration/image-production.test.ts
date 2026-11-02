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
import {
  createGeneration,
  getGeneration,
  cancelGeneration,
  retryGeneration,
  readAsset,
  reviewAsset,
} from '@/features/generation/service';
import { processGeneration } from '@/workers/processor';
import { deliverOutbox, redisConnection } from '@/workers/queue';
import { mockImage } from '@/ai/mock';
import { LocalStorage } from '@/storage/local';
const prefix = 'images-' + randomUUID();
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
it('atomically records outbox, deduplicates concurrent requests and rejects changed payloads', async () => {
  const key = randomUUID();
  const results = await Promise.all([
    createGeneration(owner, projectId, input(), key),
    createGeneration(editor, projectId, input(), key),
  ]);
  expect(results[0].id).toBe(results[1].id);
  expect(await db.generationOutbox.count({ where: { generationId: results[0].id } })).toBe(1);
  await expect(
    createGeneration(owner, projectId, { ...input(), seed: 99 }, key),
  ).rejects.toMatchObject({ status: 409 });
  await cancelGeneration(owner, projectId, results[0].id);
});
it('rejects viewers, outsiders, mismatched versions, conflicts and unauthorized downloads', async () => {
  await expect(createGeneration(viewer, projectId, input(), randomUUID())).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    createGeneration(outsider, otherProject, input(), randomUUID()),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    createGeneration(owner, projectId, { ...input(), characterVersionId: 'wrong' }, randomUUID()),
  ).rejects.toMatchObject({ status: 409 });
  const v = await db.sceneVersion.findUniqueOrThrow({ where: { id: sceneVersionId } });
  const bad = await saveScene(owner, projectId, {
    characterVersionId,
    choices: {
      ...defaultScene(),
      overrides: [{ field: 'faceShape', value: 'Different face', resolution: 'scene' }],
    },
  });
  await expect(
    createGeneration(
      owner,
      projectId,
      { ...input(), sceneVersionId: bad.versions[0].id },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(await db.sceneVersion.findUnique({ where: { id: sceneVersionId } })).toEqual(v);
  await expect(readAsset(outsider, projectId, 'unknown')).rejects.toMatchObject({ status: 404 });
});
it('generates all supported batch sizes, preserves exact metadata and supports review/download/variations', async () => {
  const char = await db.characterVersion.findUniqueOrThrow({ where: { id: characterVersionId } }),
    scene = await db.sceneVersion.findUniqueOrThrow({ where: { id: sceneVersionId } });
  for (const count of [1, 2, 4, 8]) {
    const job = await createGeneration(owner, projectId, { ...input(), count }, randomUUID());
    await processGeneration(job.id);
    const done = await getGeneration(viewer, projectId, job.id);
    expect(done.status).toBe('completed');
    expect(done.assets).toHaveLength(count);
    expect(new Set(done.assets.map((a) => a.checksum)).size).toBe(count);
    expect(done.input).toMatchObject({
      characterVersionId,
      sceneVersionId,
      mock: true,
      realism: 3,
    });
    expect((done.input as { positive: string }).positive).toContain('Right brow scar');
    const a = done.assets[0],
      download = await readAsset(viewer, projectId, a.id);
    expect(download.bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(createHash('sha256').update(download.bytes).digest('hex')).toBe(a.checksum);
    await reviewAsset(editor, projectId, a.id, 'favourite');
    await reviewAsset(editor, projectId, a.id, 'rejected');
    await expect(reviewAsset(viewer, projectId, a.id, 'favourite')).rejects.toMatchObject({
      status: 403,
    });
    await expect(readAsset(outsider, otherProject, a.id)).rejects.toMatchObject({ status: 404 });
    if (count === 1) {
      const variation = await createGeneration(
        owner,
        projectId,
        { ...input(), count: 2, sourceAssetId: a.id, variationStrength: 'bold' },
        randomUUID(),
      );
      await processGeneration(variation.id);
      expect(
        (await getGeneration(owner, projectId, variation.id)).assets.every(
          (x) => x.sourceAssetId === a.id,
        ),
      ).toBe(true);
      expect((await readAsset(owner, projectId, a.id)).asset.checksum).toBe(a.checksum);
    }
  }
  expect(await db.characterVersion.findUnique({ where: { id: characterVersionId } })).toEqual(char);
  expect(await db.sceneVersion.findUnique({ where: { id: sceneVersionId } })).toEqual(scene);
});
it('cancels queued jobs, fences late results and preserves completed originals', async () => {
  const j = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
  await cancelGeneration(editor, projectId, j.id);
  await processGeneration(j.id);
  expect((await getGeneration(owner, projectId, j.id)).assets[0].status).toBe('cancelled');
  const processing = await createGeneration(
    owner,
    projectId,
    { ...input(), count: 2 },
    randomUUID(),
  );
  let n = 0;
  await processGeneration(processing.id, {
    afterStore: async () => {
      n++;
      if (n === 2) await cancelGeneration(owner, projectId, processing.id);
    },
  });
  const result = await getGeneration(owner, projectId, processing.id);
  expect(result.status).toBe('cancelled');
  expect(result.assets.map((a) => a.status)).toEqual(['completed', 'cancelled']);
  await expect(cancelGeneration(viewer, projectId, processing.id)).rejects.toMatchObject({
    status: 403,
  });
});
it('handles partial failure with bounded attempts and retries only failed slots', async () => {
  const j = await createGeneration(owner, projectId, { ...input(), count: 2 }, randomUUID());
  const flaky = {
    ...mockImage,
    generate: async (i: Parameters<typeof mockImage.generate>[0]) => {
      if (i.seed === 43) throw new Error('Injected failure');
      return mockImage.generate(i);
    },
  };
  await processGeneration(j.id, { provider: flaky });
  const partial = await getGeneration(owner, projectId, j.id);
  expect(partial.status).toBe('partial');
  expect(partial.assets.map((a) => a.attempts)).toEqual([1, 3]);
  const original = partial.assets[0];
  await retryGeneration(owner, projectId, j.id);
  await processGeneration(j.id);
  const done = await getGeneration(owner, projectId, j.id);
  expect(done.status).toBe('completed');
  expect(done.assets[0]).toEqual(original);
  await expect(retryGeneration(owner, projectId, j.id)).rejects.toMatchObject({ status: 409 });
});
it('recovers abandoned leases without duplicating stored results and rejects competing consumers', async () => {
  const j = await createGeneration(owner, projectId, { ...input(), count: 2 }, randomUUID());
  await db.generation.update({
    where: { id: j.id },
    data: {
      status: 'processing',
      leaseToken: 'dead-worker',
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  await Promise.all([processGeneration(j.id), processGeneration(j.id)]);
  expect((await getGeneration(owner, projectId, j.id)).status).toBe('completed');
  expect(await db.imageAsset.count({ where: { generationId: j.id, status: 'completed' } })).toBe(2);
  const exhausted = await createGeneration(
    owner,
    projectId,
    { ...input(), count: 1 },
    randomUUID(),
  );
  await db.imageAsset.updateMany({ where: { generationId: exhausted.id }, data: { attempts: 3 } });
  await processGeneration(exhausted.id);
  expect((await getGeneration(owner, projectId, exhausted.id)).assets[0].status).toBe('failed');
});
it('delivers the transactional outbox through real Redis/BullMQ and repairs lost deliveries', async () => {
  const queueName = 'test-images-' + randomUUID();
  const queue = new Queue(queueName, { connection: redisConnection() });
  const worker = new Worker(
    queueName,
    async (job) => {
      await processGeneration(job.data.generationId);
    },
    { connection: redisConnection() },
  );
  try {
    const j = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
    await deliverOutbox(queue);
    await deliverOutbox(queue);
    await expect
      .poll(async () => (await getGeneration(owner, projectId, j.id)).status, { timeout: 15000 })
      .toBe('completed');
    const lost = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
    await db.generationOutbox.update({
      where: { generationId: lost.id },
      data: { deliveredAt: new Date(Date.now() - 20000) },
    });
    await deliverOutbox(queue);
    await expect
      .poll(async () => (await getGeneration(owner, projectId, lost.id)).status, { timeout: 15000 })
      .toBe('completed');
  } finally {
    await worker.close();
    await queue.obliterate({ force: true });
    await queue.close();
  }
});

it('recovers a real killed worker process through BullMQ stalled-job recovery', async () => {
  const queueName = 'killed-worker-' + randomUUID();
  const queue = new Queue(queueName, { connection: redisConnection() });
  const start = (delay: string) =>
    spawn(process.execPath, ['--import', 'tsx', 'workers/run.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, IMAGE_QUEUE_NAME: queueName, MOCK_IMAGE_DELAY_MS: delay },
      stdio: 'ignore',
    });
  let worker: ReturnType<typeof start> | undefined;
  try {
    const j = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
    worker = start('10000');
    await expect
      .poll(async () => (await getGeneration(owner, projectId, j.id)).status, { timeout: 15000 })
      .toBe('processing');
    worker.kill('SIGKILL');
    await new Promise<void>((resolve) => worker!.once('exit', () => resolve()));
    expect((await getGeneration(owner, projectId, j.id)).assets[0].status).toBe('pending');
    worker = start('0');
    await expect
      .poll(async () => (await getGeneration(owner, projectId, j.id)).status, {
        timeout: 50000,
        interval: 500,
      })
      .toBe('completed');
    const completed = await getGeneration(owner, projectId, j.id);
    expect(completed.assets).toHaveLength(1);
    expect(completed.assets[0].attempts).toBeLessThanOrEqual(3);
  } finally {
    if (worker && worker.exitCode === null) {
      worker.kill('SIGKILL');
      await new Promise<void>((resolve) => worker!.once('exit', () => resolve()));
    }
    await queue.obliterate({ force: true });
    await queue.close();
  }
}, 65000);
it('bounds manual retries and zero-cost active batch quotas', async () => {
  const j = await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID());
  const failing = {
    ...mockImage,
    generate: async () => {
      throw new Error('Always fails');
    },
  };
  await processGeneration(j.id, { provider: failing });
  for (let n = 0; n < 3; n++) {
    await retryGeneration(owner, projectId, j.id);
    await processGeneration(j.id, { provider: failing });
  }
  await expect(retryGeneration(owner, projectId, j.id)).rejects.toMatchObject({ status: 409 });
  const queued = [];
  try {
    for (let n = 0; n < 10; n++)
      queued.push(await createGeneration(owner, projectId, { ...input(), count: 1 }, randomUUID()));
    await expect(createGeneration(owner, projectId, input(), randomUUID())).rejects.toMatchObject({
      status: 429,
    });
  } finally {
    for (const row of queued) await cancelGeneration(owner, projectId, row.id);
  }
});
