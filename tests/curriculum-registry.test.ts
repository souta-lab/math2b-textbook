import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { units } from '../src/data/curriculum';

/**
 * `scripts/new-lesson.mjs` reads the registry with the regex
 * `/id: '([^']+)',\s*lessonDir: '([^']+)'/g`, so every unit object literal must
 * declare `lessonDir` on the line immediately after `id`. These tests lock that
 * contract and the global uniqueness of `lessonDir`.
 */
const source = readFileSync(
  fileURLToPath(new URL('../src/data/curriculum.ts', import.meta.url)),
  'utf8',
);

describe('curriculum registry contract', () => {
  it('places lessonDir immediately after id for the new-lesson regex', () => {
    const pairs = [...source.matchAll(/id: '([^']+)',\s*lessonDir: '([^']+)'/g)].map(
      (match) => [match[1], match[2]] as const,
    );
    expect(pairs).toHaveLength(units.length);

    const fromSource = new Map(pairs);
    for (const unit of units) {
      expect(fromSource.get(unit.id), `${unit.id} is not adjacent to its lessonDir`).toBe(
        unit.lessonDir,
      );
    }
  });

  it('never writes an id line without lessonDir on the next line', () => {
    const lines = source.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      if (!/^\s*id: '[^']+',\s*$/.test(lines[index])) continue;
      expect(
        lines[index + 1],
        `id on line ${index + 1} is not immediately followed by lessonDir`,
      ).toMatch(/^\s*lessonDir: '[^']+',\s*$/);
    }
  });

  it('has globally unique lessonDir values', () => {
    const dirs = units.map((unit) => unit.lessonDir);
    expect(new Set(dirs).size).toBe(dirs.length);
  });
});
