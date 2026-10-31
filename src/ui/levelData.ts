import { mergeCopy } from '../core/i18n';
import { parseLevel, type Level } from '../core/level';
import coreCopy from '../core/copy.zh.json';
import type { Copy } from '../core/types';
import { getLevel } from './vue/levels';

// 读 content/algorithms/<slug>/ 里的 level.json、copy.zh.json、more.zh.md（构建时，Astro 页面用）
const levels = import.meta.glob('/content/algorithms/*/level.json', { eager: true, import: 'default' });
const copies = import.meta.glob('/content/algorithms/*/copy.zh.json', { eager: true, import: 'default' });
const mores = import.meta.glob<{ compiledContent(): string | Promise<string> }>('/content/algorithms/*/more.zh.md', { eager: true });

const path = (slug: string, file: string) => '/content/algorithms/' + slug + '/' + file;

/** 这一关有没有 level.json */
export const hasLevel = (slug: string) => path(slug, 'level.json') in levels;

export interface LevelData {
  level: Level;
  /** 共用文案加本关文案，本关覆盖共用 */
  copy: Copy;
  /** 引擎模块，延伸里的 compareRows 等从这里取 */
  engine: Record<string, unknown>;
  /** 延伸阅读的 HTML（按 more.zh.md 渲染），key 是 markdown 块的 src */
  html: Record<string, string>;
}

export async function loadLevel(slug: string): Promise<LevelData> {
  const own = (copies[path(slug, 'copy.zh.json')] ?? {}) as Copy;
  const bundle = getLevel(slug);
  const level = parseLevel(levels[path(slug, 'level.json')], { slug, rules: bundle.engine.level, scenes: Object.keys(bundle.scenes), copy: own });
  const html: Record<string, string> = {};
  for (const block of Object.values(level).flat()) {
    if (block.kind !== 'markdown') continue;
    const mod = mores[path(slug, block.src + '.zh.md')];
    if (!mod) throw new Error('content/algorithms/' + slug + '/' + block.src + '.zh.md 不存在（level.json 的 markdown 块引用了它）');
    html[block.src] = await mod.compiledContent();
  }
  return { level, copy: mergeCopy(coreCopy, own), engine: bundle.engine as unknown as Record<string, unknown>, html };
}
