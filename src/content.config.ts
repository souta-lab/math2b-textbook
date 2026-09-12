import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Lesson content schema.
 *
 * Content lives in src/content/lessons/**\/*.mdx and is rendered by UI in
 * src/components. Adding a lesson should require an MDX file + a curriculum
 * registry entry only — never new UI code.
 */
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    /** Lesson title (Japanese). */
    title: z.string().min(1),
    /** One-sentence description used in navigation and course map. */
    summary: z.string().min(1),
    /** Curriculum unit id (see src/data/curriculum.ts), e.g. "ii-trigonometric". */
    unit: z.string().min(1),
    /** 0-based order within the unit (0 is used for a prerequisite-review lesson). */
    order: z.number().int().nonnegative(),
    /** Learning objectives, written as observable outcomes. */
    objectives: z.array(z.string().min(1)).min(1),
    /** Prerequisite lesson or external concept ids (validated by tests). */
    prerequisites: z.array(z.string()).default([]),
    /** Free-form tags for future search/filtering. */
    tags: z.array(z.string()).default([]),
    /** Last reviewed date for mathematical accuracy. */
    reviewed: z.coerce.date().optional(),
    /** Hidden from builds when true. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
