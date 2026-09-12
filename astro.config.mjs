import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const base = process.env.BASE_PATH ?? '/';
const site = process.env.SITE_URL ?? 'https://example.com';

// Shared math macros. Keep this list small and documented.
// NOTE: rehype-katex renders at build time; no client-side math JS is shipped.
export default defineConfig({
  site,
  base,
  integrations: [mdx()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            strict: 'warn',
            throwOnError: true,
            output: 'htmlAndMathml',
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
