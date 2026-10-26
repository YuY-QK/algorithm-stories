/**
 * 测试里看文案：把引擎、流程产出的 Msg 翻成中文，或者检查一堆数据里的每句 Msg 都能正常翻译。
 */
import { expect } from 'vitest';
import { isMsg, translate, type Msg } from '../../src/i18n/format';
import { loadDict } from '../../src/i18n/load';

/** 这一关的中文翻译函数：zh('binary-search')(msg) → 文字 */
export function zh(slug: string) {
  const dict = loadDict(slug);
  return (m: Msg) => translate(dict, m);
}

/** 找出数据里所有的 Msg（包括 Msg 参数里套的） */
export function collectMsgs(x: unknown, out: Msg[] = []): Msg[] {
  if (isMsg(x)) {
    out.push(x);
    for (const v of Object.values(x.params ?? {})) collectMsgs(v, out);
  } else if (Array.isArray(x)) {
    for (const v of x) collectMsgs(v, out);
  } else if (x && typeof x === 'object') {
    for (const v of Object.values(x)) collectMsgs(v, out);
  }
  return out;
}

/** 数据里每句 Msg 的键都在语言文件里、参数都填上了 */
export function expectTranslatable(x: unknown, slug: string) {
  const dict = loadDict(slug);
  for (const m of collectMsgs(x)) {
    expect(dict[m.key], '缺键 ' + m.key).toBeDefined();
    const text = translate(dict, m);
    expect(text, m.key + ' 有没填的参数').not.toMatch(/\{\w+\}/);
  }
}
