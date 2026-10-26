import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import coreCopy from '../src/core/copy.zh.json';
import { literalKeys } from './helpers/copy';

// 共用文案（src/core/copy.zh.json，ui.* 键）：控件用到的键都有，文案表里没有用不到的键
function sources(dir: URL): string[] {
  return readdirSync(dir).flatMap((f) => {
    const u = new URL(f + (statSync(new URL(f, dir)).isDirectory() ? '/' : ''), dir);
    if (f.endsWith('/')) return [];
    return statSync(u).isDirectory() ? sources(u) : /\.(vue|ts|astro)$/.test(f) ? [readFileSync(u, 'utf8')] : [];
  });
}

describe('共用文案', () => {
  const code = sources(new URL('../src/ui/', import.meta.url)).join('\n');
  const keys = Object.keys(coreCopy);

  it('控件里写的 ui(\'键\') 都在共用文案表里', () => {
    const used = literalKeys(code, 'ui');
    expect(used.length).toBeGreaterThan(10);
    expect(used.filter((k) => !keys.includes(k))).toEqual([]);
  });

  it('共用文案表里每个键都在控件代码里出现过', () => {
    expect(keys.filter((k) => !code.includes("'" + k + "'"))).toEqual([]);
  });

  it('键都以 ui. 开头，不会和各关的键混在一起', () => {
    expect(keys.filter((k) => !k.startsWith('ui.'))).toEqual([]);
  });
});
