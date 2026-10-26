import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { loadDict } from '../src/i18n/load';
import type { Block } from '../src/levels/types';

// 所有迁移到配置的关卡：配置里写的每个键都在语言文件里
function keysOf(b: Block): string[] {
  const keys = [b.title, ...(b.intro ? [b.intro] : [])];
  switch (b.kind) {
    case 'book': if (b.again) keys.push(b.again); break;
    case 'game': if (b.goal) keys.push(b.goal); break;
    case 'trace': for (const j of b.jumps ?? []) keys.push(j.label); break;
    case 'write': keys.push(b.target, ...(b.todos ? [b.todos] : []), ...b.items); break;
    case 'prose':
      for (const l of b.lines) {
        if (typeof l === 'string') keys.push(l);
        else if ('list' in l) keys.push(...l.list);
        else if ('note' in l) keys.push(l.note);
        else for (const r of l.rows) keys.push(r.unit, ...r.bars.map((x) => x.name));
      }
      break;
  }
  return keys;
}

describe('关卡配置', () => {
  for (const [slug, level] of Object.entries(LEVELS)) {
    it(slug + '：目录名和 slug 一致，配置里的键都有文案', () => {
      expect(level.slug).toBe(slug);
      const dict = loadDict(slug);
      for (const blocks of Object.values(level.blocks)) {
        for (const b of blocks ?? []) for (const k of keysOf(b)) expect(dict[k], slug + ' 缺键 ' + k).toBeDefined();
      }
    });
  }
});
