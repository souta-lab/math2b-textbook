import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { stripInlineMath } from '../src/lib/inline-math';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const layoutSource = readFileSync(`${projectRoot}src/layouts/LessonLayout.astro`, 'utf8');

describe('LessonLayout plain-string math surfaces', () => {
  it('renders the lesson summary through renderInlineMath', () => {
    expect(layoutSource).toContain('renderInlineMath(lesson.data.summary)');
  });

  it('renders each objective through renderInlineMath', () => {
    expect(layoutSource).toContain('renderInlineMath(objective)');
  });

  it('uses stripInlineMath for the meta description', () => {
    expect(layoutSource).toContain('description={stripInlineMath(lesson.data.summary)}');
  });
});

describe('stripInlineMath', () => {
  it('removes $ delimiters while keeping the inner source', () => {
    expect(stripInlineMath('$x^2$ のグラフ')).toBe('x^2 のグラフ');
    expect(stripInlineMath('$x^2$ のグラフ')).not.toContain('$');
  });

  it('leaves plain text and unmatched $ untouched', () => {
    expect(stripInlineMath('これは日本語です。')).toBe('これは日本語です。');
    expect(stripInlineMath('価格は $100 です')).toBe('価格は $100 です');
  });
});
