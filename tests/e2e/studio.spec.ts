import { test, expect } from '@playwright/test';
const token = () => Math.random().toString(36).slice(2, 10);
test('unauthenticated requests cannot access projects or studio', async ({ page, request }) => {
  await page.goto('/characters');
  await expect(page).toHaveURL(/\/login/);
  expect((await request.get('/api/projects')).status()).toBe(401);
});
test('authenticated projects, immutable character history, navigation and archiving', async ({
  page,
}) => {
  const name = `Editorial ${token()}`;
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEV_AUTH_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEV_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to studio' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/projects');
  await page.getByLabel('Project name').fill(name);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(name);
  const firstProjectId = await page.getByLabel('Active project').inputValue();
  const alternate = `Second project ${token()}`;
  await page.getByLabel('Project name').fill(alternate);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(alternate);
  await page.getByLabel('Active project').selectOption(firstProjectId);
  await expect(page.locator('#project-picker option:checked')).toHaveText(name);

  await page.goto('/characters/new?mode=basic');
  await page.getByLabel('Character name', { exact: true }).fill('Sofia Laurent');
  await page.getByLabel('Display name', { exact: true }).fill('Sofia');
  await page.getByLabel('Location', { exact: true }).fill('London');
  await page.getByLabel('Background', { exact: true }).fill('Original character history.');
  await page.getByRole('button', { name: 'Create character', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sofia', exact: true })).toBeVisible();
  const characterUrl = page.url();
  await page.getByRole('link', { name: 'Edit character', exact: true }).click();
  await page.getByLabel('Background', { exact: true }).fill('A new chapter in Paris.');
  await page.getByRole('button', { name: 'Save new version' }).click();
  await expect(page.getByText('Version 2 · Current')).toBeVisible();
  await page.getByText('Version 1', { exact: true }).click();
  await expect(page.getByText('Original character history.', { exact: true })).toBeVisible();
  for (const label of ['Scenes', 'Images', 'Videos', 'Content', 'Assets', 'Automations']) {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: label, exact: false })
      .click();
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    if (!['Scenes', 'Images', 'Assets'].includes(label))
      await expect(page.getByText('Planned', { exact: true }).first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  const health = await page.request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(
    (
      await page.request.post('/api/projects', {
        data: { name: 'Forbidden origin' },
        headers: { origin: 'https://untrusted.example' },
      })
    ).status(),
  ).toBe(403);
  await page.goto(characterUrl);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Archive character' }).click();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit character', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Version 2 · Current')).toBeVisible();
  await page.screenshot({
    path: `test-results/studio-${test.info().project.name}.png`,
    fullPage: true,
  });
});
