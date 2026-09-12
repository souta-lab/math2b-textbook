import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { allConceptIds, units } from '../src/data/curriculum';

const lessonsDir = fileURLToPath(new URL('../src/content/lessons', import.meta.url));
const REQUIRED_SLICE = [
  'trig/00-review-ratios',
  'trig/01-general-angle',
  'trig/02-radian',
  'trig/03-definition',
  'trig/04-identities',
  'trig/05-properties',
  'trig/06-graphs',
];

interface LessonFile {
  id: string;
  path: string;
  data: Record<string, unknown>;
}

function lessonFiles(): LessonFile[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(lessonsDir, { recursive: true, encoding: 'utf8' });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => {
      const id = entry.replace(/\\/g, '/').replace(/\.mdx$/, '');
      const path = `${lessonsDir}/${entry}`;
      const text = readFileSync(path, 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
      const data = match ? (parseYaml(match[1]) as Record<string, unknown>) : {};
      return { id, path, data };
    });
}

const files = lessonFiles();
const knownUnitIds = new Set(units.map((u) => u.id));
const knownPrerequisites = new Set([...allConceptIds(), ...files.map((f) => f.id)]);

describe('lesson content integrity', () => {
  it('finds lessons', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('has the committed 三角関数 slice', () => {
    const ids = new Set(files.map((f) => f.id));
    for (const required of REQUIRED_SLICE) {
      expect(ids.has(required), `missing lesson ${required}`).toBe(true);
    }
  });

  it('every lesson has valid frontmatter fields', () => {
    for (const file of files) {
      expect(typeof file.data.title, `${file.id} title`).toBe('string');
      expect(typeof file.data.summary, `${file.id} summary`).toBe('string');
      expect(knownUnitIds.has(String(file.data.unit)), `${file.id} unit`).toBe(true);
      expect(typeof file.data.order, `${file.id} order`).toBe('number');
      expect(Array.isArray(file.data.objectives), `${file.id} objectives`).toBe(true);
      expect((file.data.objectives as unknown[]).length, `${file.id} objectives`).toBeGreaterThan(0);
      expect(Array.isArray(file.data.prerequisites), `${file.id} prerequisites`).toBe(true);
    }
  });

  it('every prerequisite references a known concept or lesson', () => {
    for (const file of files) {
      for (const prerequisite of file.data.prerequisites as string[]) {
        expect(knownPrerequisites.has(prerequisite), `${file.id} → ${prerequisite}`).toBe(true);
      }
    }
  });

  it('has unique lesson ids', () => {
    const ids = files.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique order within each unit', () => {
    const byUnit = new Map<string, number[]>();
    for (const file of files) {
      const unit = String(file.data.unit);
      const orders = byUnit.get(unit) ?? [];
      orders.push(Number(file.data.order));
      byUnit.set(unit, orders);
    }
    for (const [unit, orders] of byUnit) {
      expect(new Set(orders).size, `${unit} orders`).toBe(orders.length);
    }
  });
});

describe('published unit lesson plans', () => {
  it('has globally unique unit lessonDir values', () => {
    const dirs = units.map((unit) => unit.lessonDir);
    expect(new Set(dirs).size, 'duplicate lessonDir across units').toBe(dirs.length);
  });

  it('matches unit.lessonPlan exactly for every published unit that declares one', () => {
    // Units without a lessonPlan (the authored 数学II・B slice) are intentionally skipped.
    for (const unit of units) {
      if (unit.status !== 'published' || !unit.lessonPlan) continue;
      const onDisk = files
        .filter((file) => file.id.startsWith(`${unit.lessonDir}/`))
        .map((file) => file.id)
        .sort();
      const planned = unit.lessonPlan.map((slug) => `${unit.lessonDir}/${slug}`).sort();
      expect(onDisk, `${unit.id} lesson files must equal its lessonPlan`).toEqual(planned);
    }
  });

  it('never marks a lesson in a published unit as draft', () => {
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    for (const file of files) {
      if (file.data.draft !== true) continue;
      const unit = unitById.get(String(file.data.unit));
      expect(unit?.status, `${file.id} is draft but belongs to published ${unit?.id ?? 'unknown'}`).not.toBe(
        'published',
      );
    }
  });
});
