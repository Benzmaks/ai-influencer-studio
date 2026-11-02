import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('character to scene to mock gallery, reviews, download and source variations', async ({
  page,
}) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEV_AUTH_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEV_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to studio' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/projects');
  const project = 'Production ' + Math.random().toString(36).slice(2, 8);
  await page.getByLabel('Project name').fill(project);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(project);
  await page.goto('/characters/new');
  await page.getByLabel('Character name', { exact: true }).fill('Image Sofia');
  await page.getByLabel('Display name', { exact: true }).fill('Image Sofia');
  await page.getByRole('button', { name: /10.*Review/ }).click();
  await page.getByRole('button', { name: 'Save character', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Image Sofia', exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto('/scenes/new');
  await page.getByLabel('Scene title', { exact: true }).fill('Production café');
  await page.getByRole('button', { name: /5.*Continuity & review/ }).click();
  await page.getByRole('button', { name: 'Check continuity & prepare prompts' }).click();
  await page.getByRole('button', { name: 'Save ready scene' }).click();
  await expect(page).toHaveURL(/\/scenes\/(?!new)[a-z0-9]+$/);
  await page.goto('/images');
  await expect(page.getByRole('heading', { name: 'Images', exact: true })).toBeVisible();
  await expect(page.getByText('Positive prompt', { exact: true })).toBeVisible();
  for (const count of [1, 2, 4, 8]) {
    await page.getByLabel('Variations', { exact: true }).selectOption(String(count));
    await page.getByLabel('Aspect ratio', { exact: true }).selectOption('4:5');
    await page.getByRole('button', { name: 'Generate mock images', exact: true }).click();
    const batch = page.getByRole('region', { name: /Batch/ }).first();
    await expect(batch.getByText('completed', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(batch.getByRole('img')).toHaveCount(count);
  }
  const batch = page.getByRole('region', { name: /Batch/ }).first(),
    first = batch.locator('article').first();
  await first.getByRole('button', { name: 'Favourite', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Favourite', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await first.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Reject', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await first.getByText('Generation details', { exact: true }).click();
  await expect(first.locator('pre')).toContainText('generationJob');
  await expect(first.locator('pre')).toContainText('sceneVersionId');
  const downloadEvent = page.waitForEvent('download');
  await first.getByRole('link', { name: 'Download', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('mock-image-1.png');
  const file = await download.path();
  expect((await readFile(file!)).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  await first.getByRole('button', { name: 'Create variations', exact: true }).click();
  await page.getByLabel('Variation strength', { exact: true }).selectOption('bold');
  await page.getByLabel('Variations', { exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Generate mock images', exact: true }).click();
  const variations = page.getByRole('region', { name: /Batch/ }).first();
  await expect(variations.getByText('completed', { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(variations.getByRole('img')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/images-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto('/assets');
  await page.getByLabel('Gallery filter', { exact: true }).selectOption('rejected');
  await expect(page.getByRole('img', { name: /MOCK test pattern/ })).toHaveCount(1);
  const projectId = await page.getByLabel('Active project').inputValue();
  expect(
    (
      await page.request.post(`/api/projects/${projectId}/generations`, {
        headers: { origin: 'https://untrusted.example', 'idempotency-key': 'hostile-origin' },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test('unauthenticated generation and file access are denied', async ({ request }) => {
  expect((await request.get('/api/projects/unknown/generations')).status()).toBe(401);
  expect((await request.get('/api/projects/unknown/assets/unknown/file?download=1')).status()).toBe(
    401,
  );
});
