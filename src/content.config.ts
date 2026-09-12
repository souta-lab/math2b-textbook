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

/**
 * Reading column ("発展コラム") schema.
 *
 * Columns are reading content, not lessons: they live in their own collection
 * under src/content/columns/**\/*.mdx and are rendered with BaseLayout, so the
 * lesson skeleton components and tests do not apply to them.
 */
const columns = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/columns' }),
  schema: z.object({
    /** Column title (Japanese). */
    title: z.string().min(1),
    /** One-sentence description used in the column list. */
    summary: z.string().min(1),
    /** Reading theme; controls grouping on the column list. */
    category: z.enum(['数学史', '応用', '分野連携', '探究']),
    /** Reading order on the column list. */
    order: z.number().int().nonnegative(),
    /** Free-form tags. */
    tags: z.array(z.string()).default([]),
    /** Last reviewed date for mathematical accuracy. */
    reviewed: z.coerce.date().optional(),
    /** Hidden from builds when true. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons, columns };
