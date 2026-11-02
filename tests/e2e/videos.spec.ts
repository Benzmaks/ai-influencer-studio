import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('character to scene to approved image to storyboard, mock video previews and download', async ({
  page,
}) => {
  test.setTimeout(210000);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEV_AUTH_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEV_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to studio' }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  await page.goto('/projects');
  const project = 'Video ' + Math.random().toString(36).slice(2, 8);
  await page.getByLabel('Project name').fill(project);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(project);
  await page.goto('/characters/new');
  await page.getByLabel('Character name', { exact: true }).fill('Video Sofia');
  await page.getByLabel('Display name', { exact: true }).fill('Video Sofia');
  await page.getByRole('button', { name: /10.*Review/ }).click();
  await page.getByRole('button', { name: 'Save character', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Video Sofia', exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto('/scenes/new');
  await page.getByLabel('Scene title', { exact: true }).fill('Video café');
  await page.getByRole('button', { name: /5.*Continuity & review/ }).click();
  await page.getByRole('button', { name: 'Check continuity & prepare prompts' }).click();
  await page.getByRole('button', { name: 'Save ready scene' }).click();
  await expect(page).toHaveURL(/\/scenes\/(?!new)[a-z0-9]+$/);
  await page.goto('/images');
  await page.getByLabel('Variations', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Generate mock images', exact: true }).click();
  const imageBatch = page.getByRole('region', { name: /Batch/ }).first();
  await expect(imageBatch.getByText('completed', { exact: true })).toBeVisible({ timeout: 30000 });
  await imageBatch.getByRole('button', { name: /Favourite/ }).click();
  await expect(imageBatch.getByRole('button', { name: /Favourite/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/videos');
  await expect(page.getByRole('heading', { name: 'Videos', exact: true })).toBeVisible();
  await page.getByLabel('Storyboard title', { exact: true }).fill('Café story');
  await page.getByLabel('Action', { exact: true }).fill('Looks toward the camera');
  await page.getByText('Facial expression & motion planning', { exact: true }).click();
  await page
    .getByLabel('Smile-to-laughter transition', { exact: true })
    .fill('Soft smile opens into a gentle laugh');
  await page.getByRole('button', { name: 'Add shot', exact: true }).click();
  await page.getByLabel('Framing', { exact: true }).fill('Close-up');
  await page.getByLabel('Expression', { exact: true }).fill('Smile to laughter');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('immutable revision 1');
  await page.reload();
  await expect(page.getByLabel('Storyboard title', { exact: true })).toHaveValue('Café story');
  await page.getByRole('button', { name: 'Shot 2', exact: false }).click();
  await expect(page.getByLabel('Framing', { exact: true })).toHaveValue('Close-up');
  await page.getByRole('button', { name: 'Move shot earlier', exact: true }).click();
  await page.getByRole('button', { name: 'Save storyboard', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('immutable revision 2');
  await page.getByRole('button', { name: 'Generate mock video', exact: true }).click();
  let batch = page.getByRole('article', { name: /Video batch/ }).first();
  await expect(batch.getByText('completed · 100%', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(batch.locator('video')).toHaveCount(2);
  await expect(batch.getByText(/Repeated fixed, silent 2-second sample/)).toBeVisible();
  const playback = batch.locator('video').first();
  await expect
    .poll(() => playback.evaluate((v) => (v as HTMLVideoElement).readyState), { timeout: 15000 })
    .toBeGreaterThanOrEqual(1);
  expect(await playback.evaluate((v) => (v as HTMLVideoElement).duration)).toBeCloseTo(2, 1);
  const downloadEvent = page.waitForEvent('download');
  await batch.getByRole('link', { name: 'Download shot 1', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('mock-shot-1.mp4');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(4, 8).toString()).toBe('ftyp');
  const projectId = await page.getByLabel('Active project').inputValue();
  const jobs = await (await page.request.get(`/api/projects/${projectId}/videos`)).json();
  const source = jobs[0],
    sourceAsset = source.videoAssets[0];
  const file = await page.request.get(
    `/api/projects/${projectId}/video-assets/${sourceAsset.id}/file`,
    { headers: { Range: 'bytes=0-31' } },
  );
  expect(file.status()).toBe(206);
  expect((await file.body()).length).toBe(32);
  expect(file.headers()['cache-control']).toBe('private, no-store');
  await page.getByRole('button', { name: 'Image-to-video', exact: false }).click();
  const approved = page.getByLabel('Approved source image', { exact: true });
  const value = await approved.locator('option').nth(1).getAttribute('value');
  await approved.selectOption(value!);
  await page.getByRole('button', { name: 'Generate mock video', exact: true }).click();
  batch = page.getByRole('article', { name: /Video batch/ }).first();
  await expect(batch.getByText('completed · 100%', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const all = await (await page.request.get(`/api/projects/${projectId}/videos`)).json();
  expect(all[0].input.sourceReference.id).toBe(value);
  expect(all[0].input.storyboardVersion).toBe(2);
  await page.getByLabel('Action', { exact: true }).fill('Walks slowly');
  await page.getByRole('button', { name: 'Save storyboard', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('immutable revision 3');
  expect(
    (await (await page.request.get(`/api/projects/${projectId}/generations/${source.id}`)).json())
      .input,
  ).toEqual(source.input);
  await page.goto('/assets');
  await expect(page.getByRole('region', { name: 'Video generation history' })).toBeVisible();
  await expect(page.getByRole('article', { name: /Video batch/ })).toHaveCount(2);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= Math.ceil(visualViewport?.width ?? innerWidth) + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/video-library-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('video and storyboard APIs reject unauthenticated access', async ({ request }) => {
  for (const path of ['storyboards', 'storyboards/missing', 'videos', 'video-assets/missing/file'])
    expect((await request.get(`/api/projects/missing/${path}`)).status()).toBe(401);
  expect(
    (
      await request.post('/api/projects/missing/videos', {
        headers: { Origin: new URL(process.env.AUTH_URL!).origin },
        data: {},
      })
    ).status(),
  ).toBe(401);
});
