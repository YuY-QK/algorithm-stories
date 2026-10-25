import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

/**
 * 算法目录名 → 关卡页组件。自动收集 src/demos/<slug>/Demo.astro，新增算法不用在这里登记。
 */
const modules = import.meta.glob<{ default: AstroComponentFactory }>('./*/Demo.astro', { eager: true });

export const DEMOS: Record<string, AstroComponentFactory> = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.split('/')[1], mod.default]),
);
