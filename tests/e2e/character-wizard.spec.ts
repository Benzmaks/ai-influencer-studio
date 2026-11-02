import { test, expect } from '@playwright/test';
test('complete creator: blank draft, resume, choices, review, immutable edit and duplicate', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEV_AUTH_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEV_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to studio' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/projects');
  const project = 'DNA studio ' + Math.random().toString(36).slice(2, 8);
  await page.getByLabel('Project name').fill(project);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(project);
  await page.goto('/characters/new');
  await page.getByRole('button', { name: 'Save & close' }).click();
  await expect(page.getByRole('heading', { name: 'Your unfinished characters' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Untitled character' }).click();
  await page.getByLabel('Character name', { exact: true }).fill('Sofia Laurent');
  await page.getByLabel('Display name', { exact: true }).fill('Sofia');
  await page.getByLabel('Nationality', { exact: true }).fill('French');
  await page.getByLabel('Location', { exact: true }).fill('Lyon');
  await page.getByLabel('Background', { exact: true }).fill('An original character background.');
  const next = async () => {
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          Math.ceil(visualViewport?.width ?? innerWidth) + 1,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  };
  await next();
  await page.getByRole('button', { name: 'Fashion', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Reflective', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fashion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await next();
  await expect(page.getByRole('button', { name: 'Reflective', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await next();
  await page.getByRole('button', { name: 'Green', exact: true }).click();
  await page.getByLabel('Face shape', { exact: true }).fill('Heart-oval custom shape');
  await next();
  await page.getByRole('button', { name: 'Small gold hoops', exact: true }).click();
  await next();
  await page.getByRole('button', { name: /Candid.*Spontaneous/ }).click();
  await next();
  await page.getByRole('button', { name: 'Beauty mark below left eye', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Travel diaries', exact: true }).click();
  await next();
  await page
    .getByLabel('Social voice', { exact: true })
    .fill('Warm observations with a little French wit.');
  await next();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save character', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Visual Bible', exact: true }).click();
  await expect(page.getByText('Beauty mark below left eye', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save & close' }).click();
  await page
    .getByRole('link')
    .filter({ hasText: 'Sofia' })
    .filter({ hasText: 'Resume draft' })
    .click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Save character', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Rebuild mock profile' }).click();
  await expect(page.getByRole('button', { name: 'Save character', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save character', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sofia', exact: true, level: 1 })).toBeVisible();
  const original = page.url();
  await page.getByRole('button', { name: 'Visual Bible', exact: true }).click();
  await expect(page.getByText('Beauty mark below left eye', { exact: true })).toBeVisible();
  await expect(page.getByText(/Heart-oval custom shape face/)).toBeVisible();
  await page.getByRole('button', { name: 'Social Voice', exact: true }).click();
  await expect(
    page.getByText('Warm observations with a little French wit.', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= Math.ceil(visualViewport?.width ?? innerWidth) + 1,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Edit character', exact: true }).click();
  await page.getByLabel('Occupation', { exact: true }).fill('Editorial storyteller');
  await page.getByRole('button', { name: /10.*Review/ }).click();
  await expect(page.getByRole('button', { name: 'Save new character version' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save new character version' }).click();
  await expect(page.getByText('Version 2 · Current')).toBeVisible();
  await page.getByText('Version 1', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Version history' })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate character' }).click();
  await expect(page.getByRole('heading', { name: 'Sofia (copy)', exact: true })).toBeVisible();
  expect(page.url()).not.toBe(original);
  await page.getByRole('button', { name: 'Visual Bible', exact: true }).click();
  await expect(page.getByText('Beauty mark below left eye', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/creator-${test.info().project.name}.png`,
    fullPage: true,
  });
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Archive character' }).click();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await page.goto(original);
  await expect(page.getByRole('link', { name: 'Edit character', exact: true })).toBeVisible();
});
test('unauthenticated draft and preview access are denied', async ({ request }) => {
  expect((await request.get('/api/projects/unknown/drafts')).status()).toBe(401);
  expect(
    (
      await request.post('/api/projects/unknown/character-preview', {
        headers: { origin: 'http://localhost:3000' },
        data: {},
      })
    ).status(),
  ).toBe(401);
});
