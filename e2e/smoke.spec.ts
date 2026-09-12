import { expect, test } from '@playwright/test';

const LESSON_SLUGS = [
  '00-review-ratios',
  '01-general-angle',
  '02-radian',
  '03-definition',
  '04-identities',
  '05-properties',
  '06-graphs',
];

test('home page shows the course map', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('三角関数').first()).toBeVisible();
});

test('chapter page lists the lesson spine', async ({ page }) => {
  await page.goto('/chapters/ii-trigonometric');
  await expect(page.getByRole('heading', { level: 1, name: '三角関数' })).toBeVisible();
  await expect(page.getByRole('link', { name: /単位円で三角関数を定義する/ })).toBeVisible();
});

test('core lesson renders math and figures without overflow', async ({ page }) => {
  await page.goto('/lessons/trig/03-definition');
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await expect(page.locator('.viz-uc svg').first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('unit circle responds to keyboard input', async ({ page }) => {
  await page.goto('/lessons/trig/03-definition');
  const plot = page.locator('.viz-uc__plot[role="slider"]').first();
  await plot.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
  const before = Number(await plot.getAttribute('aria-valuenow'));
  await plot.focus();
  await page.keyboard.press('ArrowRight');
  const after = Number(await plot.getAttribute('aria-valuenow'));
  expect(after).not.toBe(before);
});

test('trig graph slider updates the readout', async ({ page }) => {
  await page.goto('/lessons/trig/06-graphs');
  const input = page.locator('[data-graph-input]').first();
  await input.scrollIntoViewIfNeeded();
  const before = await page.locator('.viz-graph [data-graph-out="theta"]').first().textContent();
  await input.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
  const after = await page.locator('.viz-graph [data-graph-out="theta"]').first().textContent();
  expect(after).not.toBe(before);
});

for (const slug of LESSON_SLUGS) {
  test(`lesson ${slug} renders math with no errors and no overflow`, async ({ page }) => {
    await page.goto(`/lessons/trig/${slug}`);
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('.katex-error')).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
