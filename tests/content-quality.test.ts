import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { units } from '../src/data/curriculum';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const lessonsDir = `${projectRoot}src/content/lessons`;

interface Lesson {
  id: string;
  dir: string;
  order: number;
  unit: string;
  prerequisites: string[];
  body: string;
}

function readLessons(): Lesson[] {
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
      const text = readFileSync(`${lessonsDir}/${entry}`, 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
      const data = (match ? parseYaml(match[1]) : {}) as Record<string, unknown>;
      return {
        id,
        dir: id.split('/')[0],
        order: Number(data.order),
        unit: String(data.unit ?? ''),
        prerequisites: Array.isArray(data.prerequisites) ? (data.prerequisites as string[]) : [],
        body: text.slice(match ? match[0].length : 0),
      };
    });
}

const lessons = readLessons();

function registeredComponents(): Set<string> {
  const source = readFileSync(`${projectRoot}src/layouts/LessonLayout.astro`, 'utf8');
  const names = new Set<string>();
  for (const match of source.matchAll(/import\s+([A-Z][A-Za-z0-9]*)\s+from\s+'@\/components\/[^']+\.astro'/g)) {
    names.add(match[1]);
  }
  return names;
}

const REQUIRED_COMPONENTS = [
  '<Hook>',
  '<Prediction',
  '<Why>',
  '<WorkedExample',
  '<Misconception>',
  '<CheckUnderstanding>',
];

describe('lesson body quality', () => {
  it('has lessons to check', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('every lesson contains the required pedagogical components', () => {
    for (const { id, body } of lessons) {
      for (const marker of REQUIRED_COMPONENTS) {
        expect(body.includes(marker), `${id} is missing ${marker}`).toBe(true);
      }
    }
  });

  it('every Prediction answer is one of its options', () => {
    for (const { id, body } of lessons) {
      for (const match of body.matchAll(/<Prediction([\s\S]*?)\/>/g)) {
        const attrs = match[1];
        const options = [...attrs.matchAll(/'([^']*)'/g)].map((m) => m[1]);
        const answer = /answer="([^"]*)"/.exec(attrs)?.[1];
        expect(answer, `${id}: Prediction without an answer`).toBeTruthy();
        expect(options, `${id}: Prediction options`).toContain(answer);
      }
    }
  });

  it('every Step explains itself with a non-empty reason', () => {
    for (const { id, body } of lessons) {
      for (const match of body.matchAll(/<Step\b([^>]*)>/g)) {
        expect(/reason="[^"]+"/.test(match[1]), `${id}: Step without a reason`).toBe(true);
      }
    }
  });

  it('every Reveal has visible content', () => {
    for (const { id, body } of lessons) {
      for (const match of body.matchAll(/<Reveal\b[^>]*>([\s\S]*?)<\/Reveal>/g)) {
        expect(match[1].trim().length, `${id}: empty Reveal`).toBeGreaterThan(0);
      }
    }
  });

  it('contains no placeholder or dodge text', () => {
    const bad = /TODO|FIXME|lorem ipsum|ここに書|あとで書|仮の内容|以下同様|（略）/;
    for (const { id, body } of lessons) {
      expect(bad.test(body), `${id}: placeholder or dodge text`).toBe(false);
    }
  });

  it('does not copy long prose paragraphs between lessons', () => {
    const seen = new Map<string, string>();
    for (const { id, body } of lessons) {
      for (const block of body.split(/\n\s*\n/)) {
        const paragraph = block.replace(/\s+/g, '').trim();
        if (paragraph.length < 120) continue;
        if (paragraph.startsWith('|') || paragraph.startsWith('<')) continue;
        const previous = seen.get(paragraph);
        expect(previous, `${id} duplicates prose from ${previous}`).toBeUndefined();
        seen.set(paragraph, id);
      }
    }
  });

  it('uses only components that are registered for MDX', () => {
    const registered = registeredComponents();
    for (const { id, body } of lessons) {
      for (const match of body.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
        expect(registered.has(match[1]), `${id}: <${match[1]}> is not registered in LessonLayout`).toBe(true);
      }
    }
  });

  it('uses base-relative internal links only', () => {
    for (const { id, body } of lessons) {
      expect(/\]\(\/(?![\/])/.test(body), `${id}: markdown link to a root-absolute path`).toBe(false);
      expect(/href="\/(?![\/])/.test(body), `${id}: href to a root-absolute path`).toBe(false);
    }
  });

  it('uses multi-line fences for display math', () => {
    for (const { id, body } of lessons) {
      for (const line of body.split('\n')) {
        expect(
          /^\s*\$\$.+\$\$\s*$/.test(line),
          `${id}: single-line $$...$$ is inline math; use its own lines for display math`,
        ).toBe(false);
      }
    }
  });
});

describe('lesson metadata quality', () => {
  it('every lesson unit maps to its directory', () => {
    for (const lesson of lessons) {
      const unit = units.find((candidate) => candidate.id === lesson.unit);
      expect(unit, `${lesson.id}: unknown unit ${lesson.unit}`).toBeDefined();
      expect(unit?.lessonDir, `${lesson.id}: directory does not match unit.lessonDir`).toBe(lesson.dir);
    }
  });

  it('lesson prerequisites within a unit are ordered before the lesson', () => {
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    for (const lesson of lessons) {
      for (const prerequisite of lesson.prerequisites) {
        const target = byId.get(prerequisite);
        if (!target || target.dir !== lesson.dir) continue;
        expect(
          target.order,
          `${lesson.id} (order ${lesson.order}) requires ${prerequisite} (order ${target.order})`,
        ).toBeLessThan(lesson.order);
      }
    }
  });
});
