import { describe, expect, it } from 'vitest';
import * as st from '../src/engine/stack';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('栈：和 Python 参考实现对拍', () => {
  it('括号配对结果一致', () => {
    const all = st.OPENERS + st.CLOSERS;
    const cases = Array.from({ length: 600 }, (_, k) =>
      k % 3 === 0
        ? st.predictString()
        : Array.from({ length: k % 14 }, () => all[Math.floor(Math.random() * 6)]).join(''));
    const py = runPython(
      'stack',
      'import json,sys\nfrom stack import is_valid\nprint(json.dumps([is_valid(s) for s in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((s) => st.buildTrace(s).at(-1)!.result)).toEqual(py);
  });

  it('出栈序列：能不能做到一致', () => {
    const perms = (a: number[]): number[][] =>
      a.length <= 1 ? [a] : a.flatMap((x, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map((p) => [x, ...p]));
    const cases = [1, 2, 3, 4, 5, 6].flatMap((n) => perms(Array.from({ length: n }, (_, k) => k + 1)).map((want) => ({ n, want })));
    const py = runPython(
      'stack',
      'import json,sys\nfrom stack import can_pop\nprint(json.dumps([can_pop(c["n"], c["want"]) for c in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((c) => st.canPop(c.n, c.want))).toEqual(py);
  });
});
