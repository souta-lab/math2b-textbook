import { describe, expect, it } from 'vitest';
import { renderInlineMath } from '../src/lib/inline-math';

describe('renderInlineMath', () => {
  it('passes plain Japanese text through unchanged', () => {
    expect(renderInlineMath('これは日本語の文章です。')).toBe('これは日本語の文章です。');
  });

  it('escapes HTML-unsafe characters in non-math text', () => {
    expect(renderInlineMath('a < b & c > d "e"')).toBe(
      'a &lt; b &amp; c &gt; d &quot;e&quot;',
    );
  });

  it('renders $x^2$ as KaTeX markup', () => {
    const html = renderInlineMath('$x^2$');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$x^2$');
  });

  it('escapes text and renders math when mixed', () => {
    const html = renderInlineMath('条件 $a>0$ のとき');
    expect(html.startsWith('条件 ')).toBe(true);
    expect(html.endsWith(' のとき')).toBe(true);
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$a>0$');
  });

  it('leaves an unmatched $ as text', () => {
    expect(renderInlineMath('価格は $100 です')).toBe('価格は $100 です');

    const trailing = renderInlineMath('$x^2$ と $y');
    expect(trailing).toContain('class="katex"');
    expect(trailing.endsWith(' と $y')).toBe(true);
  });

  it('does not throw on invalid LaTeX (throwOnError: false)', () => {
    expect(() => renderInlineMath('$\\frac{1}{$')).not.toThrow();
  });
});
