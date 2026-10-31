import type { Copy, Msg } from '../../src/core/types';

/** 在任意结构（对象、数组）里找出所有 Msg（有字符串 key 的对象），含参数里嵌套的。函数不展开 */
export function collectMsgs(x: unknown, out: Msg[] = []): Msg[] {
  if (Array.isArray(x)) {
    for (const v of x) collectMsgs(v, out);
  } else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.key === 'string') {
      out.push(o as unknown as Msg);
      if (o.params) collectMsgs(Object.values(o.params as object), out);
    } else {
      for (const v of Object.values(o)) collectMsgs(v, out);
    }
  }
  return out;
}

/** 一组 Msg 用到的全部键（含嵌套参数） */
export function keysOf(msgs: Msg[]): Set<string> {
  return new Set(msgs.map((x) => x.key));
}

export const asCopy = (j: unknown) => j as Copy;

/** level.json 里每个块按约定从文案表取的键：<id>.title、.intro、.goal、.body、.again（有没有看文案表） */
export function blockKeys(level: Record<string, unknown>, copy: Copy): string[] {
  const out: string[] = [];
  for (const blocks of Object.values(level)) {
    for (const b of blocks as { id?: string }[]) {
      if (!b.id) continue;
      for (const part of ['title', 'intro', 'goal', 'body', 'again']) if (b.id + '.' + part in copy) out.push(b.id + '.' + part);
    }
  }
  return out;
}

/** 在一段源码里找 fn('键' 这样的调用用到的文案键 */
export function literalKeys(source: string, fn: string): string[] {
  return [...source.matchAll(new RegExp('\\b' + fn + "\\(\\s*'([\\w.-]+)'", 'g'))].map((x) => x[1]);
}
