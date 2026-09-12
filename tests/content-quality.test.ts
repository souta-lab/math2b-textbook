import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const lessonsDir = fileURLToPath(new URL('../src/content/lessons', import.meta.url));

interface Lesson {
  id: string;
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
      const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
      return { id, body };
    });
}

const lessons = readLessons();

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
});
