import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 每个算法一个目录 content/algorithms/<slug>/，id 就是目录名
const bySlug = ({ entry }: { entry: string }) => entry.split('/')[0];

/** 关卡的四步：看、玩、做、延伸（见 docs/overview.md 4a） */
export const STAGES = ['look', 'play', 'do', 'more'] as const;
export type Stage = (typeof STAGES)[number];

const algorithms = defineCollection({
  loader: glob({ pattern: '*/meta.json', base: './content/algorithms', generateId: bySlug }),
  schema: z.object({
    title: z.string(),
    storyTitle: z.string(),
    category: z.string(),
    /** 已经做好的步骤 */
    stages: z.array(z.enum(STAGES)).min(1),
    lede: z.string(),
    summary: z.string(),
    order: z.number(),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: '*/story.md', base: './content/algorithms', generateId: bySlug }),
});

export const collections = { algorithms, stories };
