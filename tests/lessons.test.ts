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
