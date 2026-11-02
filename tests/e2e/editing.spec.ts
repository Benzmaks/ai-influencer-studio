import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('complete image editing, branch history, comparison, final selection and download', async ({
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
  const project = 'Editing ' + Math.random().toString(36).slice(2, 8);
  await page.getByLabel('Project name').fill(project);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(project);
  await page.goto('/characters/new');
  await page.getByLabel('Character name', { exact: true }).fill('Editor Sofia');
  await page.getByLabel('Display name', { exact: true }).fill('Editor Sofia');
  await page.getByRole('button', { name: /10.*Review/ }).click();
  await page.getByRole('button', { name: 'Save character', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Editor Sofia', exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto('/scenes/new');
  await page.getByLabel('Scene title', { exact: true }).fill('Editing café');
  await page.getByRole('button', { name: /5.*Continuity & review/ }).click();
  await page.getByRole('button', { name: 'Check continuity & prepare prompts' }).click();
  await page.getByRole('button', { name: 'Save ready scene' }).click();
  await expect(page).toHaveURL(/\/scenes\/(?!new)[a-z0-9]+$/);
  await page.goto('/images');
  await page.getByLabel('Variations', { exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Generate mock images', exact: true }).click();
  const batch = page.getByRole('region', { name: /Batch/ }).first();
  await expect(batch.getByText('completed', { exact: true })).toBeVisible({ timeout: 30000 });
  await batch.getByRole('link', { name: 'Edit & history', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Image editor', exact: true })).toBeVisible();
  const sourceUrl = page.url(),
    sourceId = sourceUrl.split('/').at(-1)!,
    projectId = await page.getByLabel('Active project').inputValue();
  const original = await page.request.get(`/api/projects/${projectId}/assets/${sourceId}/file`);
  const before = await original.body();
  await page
    .getByLabel('Editing instructions', { exact: true })
    .fill('Remove freckles and change face shape.');
  await page.getByRole('button', { name: 'Request mock edit', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'protected identity' })).toBeVisible();
  await page.getByRole('button', { name: 'Golden hour', exact: true }).click();
  await page.getByLabel('Edited results', { exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Request mock edit', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Mock edit queued');
  await expect(page.locator('.version-tree li')).toHaveCount(3);
  await expect(page.locator('.version-tree li').getByText(/^completed/)).toHaveCount(3, {
    timeout: 30000,
  });
  expect(
    await (await page.request.get(`/api/projects/${projectId}/assets/${sourceId}/file`)).body(),
  ).toEqual(before);
  await page
    .locator('.version-tree')
    .getByRole('link', { name: 'Compare with source', exact: true })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Compare versions', exact: true })).toBeVisible();
  await expect(page.locator('.comparison-card')).toHaveCount(2);
  await page.getByLabel('Zoom image 2', { exact: true }).fill('2');
  await expect(page.getByLabel('Zoom image 2', { exact: true })).toHaveValue('2');
  const edited = page.locator('.comparison-card').nth(1);
  await edited.getByRole('button', { name: 'Select preferred final', exact: true }).click();
  await expect(edited.getByText('Final selection', { exact: true })).toBeVisible();
  const event = page.waitForEvent('download');
  await edited.getByRole('link', { name: 'Download', exact: true }).click();
  const download = await event;
  expect((await readFile((await download.path())!)).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/editing-compare-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto('/assets');
  await page.getByLabel('Search images', { exact: true }).fill('golden hour');
  await page.getByLabel('Gallery filter', { exact: true }).selectOption('final');
  await expect(page.locator('.library-card')).toHaveCount(1);
  await expect(page.getByText('Final selection', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Gallery filter', { exact: true }).selectOption('final');
  await expect(page.locator('.library-card')).toHaveCount(1);
  await page.goto(sourceUrl);
  await page.getByRole('button', { name: 'Duplicate image', exact: true }).click();
  await expect(page.locator('.version-tree li')).toHaveCount(4);
  await expect(page.locator('.version-tree li').getByText(/^completed/)).toHaveCount(4, {
    timeout: 30000,
  });
});
test('unauthenticated editor, library, comparison and final APIs are rejected', async ({
  page,
  request,
}) => {
  await page.goto('/assets/unknown');
  await expect(page).toHaveURL(/login/);
  for (const path of ['assets/library', 'assets/unknown/history', 'assets/compare?ids=a,b'])
    expect((await request.get('/api/projects/unknown/' + path)).status()).toBe(401);
  expect(
    (
      await request.post('/api/projects/unknown/assets/unknown/edit', {
        headers: { origin: 'http://localhost:3000' },
        data: {},
      })
    ).status(),
  ).toBe(401);
});
