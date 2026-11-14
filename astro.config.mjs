import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const base = process.env.BASE_PATH ?? '/';
const site = process.env.SITE_URL ?? 'https://example.com';

// Restore the `math-display` class that Astro's syntax highlighter strips from
// remark-math's `<pre><code class="language-math math-display">`, so rehype-katex
// emits block display math (centered, scrollable) instead of inline math.
function restoreMathDisplay() {
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'pre') {
      const code = (node.children ?? []).find(
        (child) => child.type === 'element' && child.tagName === 'code',
      );
      if (code) {
        const classes = Array.isArray(code.properties?.className) ? code.properties.className : [];
        if (classes.includes('language-math') && !classes.includes('math-display')) {
          code.properties = code.properties ?? {};
          code.properties.className = [...classes, 'math-display'];
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  return (tree) => walk(tree);
}

// Shared math macros. Keep this list small and documented.
// NOTE: rehype-katex renders at build time; no client-side math JS is shipped.
export default defineConfig({
  site,
  base,
  integrations: [mdx()],
  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        restoreMathDisplay,
        [
          rehypeKatex,
          {
            strict: 'warn',
            throwOnError: true,
            output: 'mathml',
            macros: {
              '\\R': '\\mathbb{R}',
              '\\Z': '\\mathbb{Z}',
              '\\deg': '^{\\circ}',
            },
          },
        ],
      ],
    }),
  },
});
