import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { SUBJECT_ORDER, units } from '../src/data/curriculum';

const lessonsDir = fileURLToPath(new URL('../src/content/lessons', import.meta.url));

const LESSON_IDS = readdirSync(lessonsDir, { recursive: true, encoding: 'utf8' })
  .filter((entry) => entry.endsWith('.mdx'))
  .map((entry) => entry.replace(/\\/g, '/').replace(/\.mdx$/, ''))
  .sort();

const SUBJECT_BY_DIR = new Map(units.map((unit) => [unit.lessonDir, unit.subject]));

function evenlySpacedSample(ids: string[], size: number): string[] {
  if (size <= 0 || ids.length === 0) return [];
  if (ids.length <= size) return [...ids].sort();
  if (size === 1) return [ids[0]];
  const picks = new Set<string>();
  for (let index = 0; index < size; index += 1) {
    picks.add(ids[Math.round((index * (ids.length - 1)) / (size - 1))]);
  }
  return [...picks].sort();
}

function sampleBySubject(size: number): string[] {
  const bySubject = new Map<string, string[]>();
  for (const id of LESSON_IDS) {
    const subject = SUBJECT_BY_DIR.get(id.split('/')[0]);
    if (!subject) continue;
    const bucket = bySubject.get(subject);
    if (bucket) bucket.push(id);
    else bySubject.set(subject, [id]);
  }

  const sample: string[] = [];
  for (const subject of SUBJECT_ORDER) {
    sample.push(...evenlySpacedSample(bySubject.get(subject) ?? [], size));
  }
  return sample;
}

const SAMPLE_SIZE = Math.max(1, Math.trunc(Number(process.env.SMOKE_SAMPLE_SIZE ?? '3')) || 3);

/** Fixed representative lessons; deterministic sampling can miss an authored regression. */
const SPINE = [
  'trig/03-definition',
  'trig/06-graphs',
  'expressions/00-cubic-formulas',
  'coordinate/00-points',
  'exponential/00-power-extension',
  'calculus/05-definite-integral',
  'sequences/05-recurrence',
  'statistics/04-normal-distribution',
  'society/00-mathematize',
];

const SMOKE_LESSON_IDS = [...new Set([...SPINE, ...sampleBySubject(SAMPLE_SIZE)])].sort();

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

for (const id of SMOKE_LESSON_IDS) {
  test(`lesson ${id} renders math with no errors and no overflow`, async ({ page }) => {
    await page.goto(`/lessons/${id}`);
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('.katex-error')).toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
