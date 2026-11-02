import { test, expect } from '@playwright/test';
import { defaultAnswers } from '../../features/characters/dna';
test('scene creator: all steps, draft resume, continuity conflicts, prompts, history and duplication', async ({
  page,
}) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.DEV_AUTH_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.DEV_AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to studio' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto('/projects');
  const name = 'Scene studio ' + Math.random().toString(36).slice(2, 8);
  await page.getByLabel('Project name').fill(name);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.locator('#project-picker option:checked')).toHaveText(name);
  const projectId = await page.getByLabel('Active project').inputValue();
  const headers = { origin: 'http://localhost:3000' };
  const draftResponse = await page.request.post(`/api/projects/${projectId}/drafts`, {
    headers,
    data: {
      answers: {
        ...defaultAnswers(),
        name: 'Scene Sofia',
        displayName: 'Scene Sofia',
        signatureImperfections: ['Right brow scar'],
      },
      step: 9,
    },
  });
  expect(draftResponse.status()).toBe(201);
  const draft = await draftResponse.json();
  const published = await page.request.post(
    `/api/projects/${projectId}/drafts/${draft.id}/publish`,
    { headers, data: { revision: draft.revision } },
  );
  expect(published.status()).toBe(200);
  await page.goto('/scenes');
  await page.getByRole('link', { name: 'Create scene', exact: true }).click();
  await page.getByLabel('Scene title', { exact: true }).fill('Golden hour story');
  const next = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  };
  await next();
  await page.getByRole('button', { name: 'Explore 3 mock concepts' }).click();
  await page.getByRole('button', { name: /Golden hour story · coast/ }).click();
  await page.getByLabel('Custom location', { exact: true }).fill('Cannes boardwalk');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/scenes\/(?!new)[a-z0-9]+$/);
  const sceneUrl = page.url();
  await page.reload();
  await page.getByRole('button', { name: /2.*The setting/ }).click();
  await expect(page.getByLabel('Custom location', { exact: true })).toHaveValue('Cannes boardwalk');
  await next();
  await page.getByRole('button', { name: 'Walking mid-stride', exact: true }).click();
  await next();
  await page.getByRole('button', { name: '4 · Candid', exact: true }).click();
  await next();
  await page.getByRole('button', { name: 'Add appearance change' }).click();
  await page.getByLabel('Appearance field', { exact: true }).selectOption('faceShape');
  await page.getByLabel('Requested appearance', { exact: true }).fill('Different jaw');
  await page.getByLabel('Resolution', { exact: true }).selectOption('scene');
  await page.getByRole('button', { name: 'Check continuity & prepare prompts' }).click();
  await expect(
    page.getByText('Resolve conflicts before preparing prompts or marking this scene ready.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save ready scene' })).toBeDisabled();
  await page.getByLabel('Resolution', { exact: true }).selectOption('canonical');
  await page.getByRole('button', { name: 'Check continuity & prepare prompts' }).click();
  await expect(page.getByRole('heading', { name: 'Positive prompt', exact: true })).toBeVisible();
  await expect(page.locator('.scene-prompt').first()).toContainText('Right brow scar');
  await expect(page.locator('.scene-prompt').first()).toContainText('Cannes boardwalk');
  await page.getByRole('button', { name: 'Save ready scene' }).click();
  await expect(page.getByRole('status')).toContainText('Scene ready');
  await expect(page.getByText(/Scene version 1 ·/)).toBeVisible();
  await expect(page.getByText(/Scene version 2 ·/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/scenes-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Duplicate scene', exact: true }).click();
  await expect(page).not.toHaveURL(sceneUrl);
  await expect(
    page.getByRole('heading', { name: 'Golden hour story · coast (copy)', exact: true }),
  ).toBeVisible();
  await page.goto(sceneUrl);
  await page.getByRole('button', { name: /5.*Continuity & review/ }).click();
  await expect(page.locator('.scene-prompt').first()).toContainText('Cannes boardwalk');
  const forbidden = await page.request.post(`/api/projects/${projectId}/scenes`, {
    headers: { origin: 'https://untrusted.example' },
    data: {},
  });
  expect(forbidden.status()).toBe(403);
});
test('unauthenticated scene APIs are denied', async ({ request }) => {
  expect((await request.get('/api/projects/unknown/scenes')).status()).toBe(401);
  expect(
    (
      await request.post('/api/projects/unknown/scenes/preview', {
        headers: { origin: 'http://localhost:3000' },
        data: {},
      })
    ).status(),
  ).toBe(401);
});
