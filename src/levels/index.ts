import type { Level } from './types';

/** 已经迁移到配置的关卡：目录名 → 配置。自动收集 src/levels/<slug>/level.ts（只在构建页面时用） */
const modules = import.meta.glob<{ default: Level }>('./*/level.ts', { eager: true });

export const LEVELS: Record<string, Level> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.split('/')[1], mod.default]),
);
