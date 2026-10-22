import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 每个算法一个目录 content/algorithms/<slug>/，id 就是目录名
const bySlug = ({ entry }: { entry: string }) => entry.split('/')[0];

export const LEVELS = ['kid', 'beginner', 'mid', 'pro'] as const;
export type Level = (typeof LEVELS)[number];

const algorithms = defineCollection({
  loader: glob({ pattern: '*/meta.json', base: './content/algorithms', generateId: bySlug }),
  schema: z.object({
    title: z.string(),
    storyTitle: z.string(),
    category: z.string(),
    /** 已经做好的等级 */
    levels: z.array(z.enum(LEVELS)).min(1),
    lede: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: '*/story.md', base: './content/algorithms', generateId: bySlug }),
});

export const collections = { algorithms, stories };
