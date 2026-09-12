/**
 * Inline math for plain-string component props.
 *
 * MDX/remark-math renders `$...$` only in the MDX body — not inside JSX
 * attribute strings. Props such as `<Step reason="…">` or
 * `<Prediction question="…">` therefore arrive as plain text. This helper
 * renders them to HTML at build time (server-side, no DOM access):
 *
 *   - every `$...$` segment (single-line, non-empty) becomes KaTeX inline HTML
 *     via `katex.renderToString(…, { throwOnError: false, displayMode: false })`;
 *   - all other text is HTML-escaped, so `&`, `<`, `>`, `"` stay literal;
 *   - unmatched `$` is left as escaped text.
 *
 * Display math (`$$...$$`) is intentionally not supported in string props.
 */
import katex from 'katex';

const INLINE_MATH_RE = /\$([^$\n]+)\$/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInlineMath(text: string): string {
  let html = '';
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_MATH_RE)) {
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(lastIndex, index));
    html += katex.renderToString(match[1], {
      throwOnError: false,
      displayMode: false,
    });
    lastIndex = index + match[0].length;
  }

  html += escapeHtml(text.slice(lastIndex));
  return html;
}
