import { describe, expect, it } from 'vitest';
import * as bubble from '../src/engine/bubble-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('冒泡排序：和 Python 参考实现对拍', () => {
  it('结果、比较次数、交换次数、轮数、逆序对一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => bubble.genArray(k % 17, (['random', 'nearly', 'reversed'] as const)[k % 3]));
    const py = runPython(
      'bubble-sort',
      'import json,sys\nfrom bubble_sort import bubble_sort, count_ops, inversions\nprint(json.dumps([[bubble_sort(list(a)), *count_ops(a), inversions(a)] for a in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((a) => {
      const last = bubble.buildTrace(a).at(-1)!;
      const rounds = bubble.rounds(a, (v) => v).length;
      return [last.a.map((x) => x.v), last.compares, last.swaps, rounds, bubble.inversions(a)];
    })).toEqual(py);
  });

  it('按 key 稳定排序：带标记的相等元素顺序一致', () => {
    const cases = Array.from({ length: 200 }, (_, k) => Array.from({ length: k % 12 }, (_, x) => [Math.floor(Math.random() * 4), x]));
    const py = runPython(
      'bubble-sort',
      'import json,sys\nfrom bubble_sort import bubble_sort_by\nprint(json.dumps([list(bubble_sort_by(c, key=lambda p: p[0])) for c in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((c) => {
      const rs = bubble.rounds(c, (p) => p[0]);
      const out = rs.length ? rs.at(-1)!.after : c;
      return [out, rs.reduce((t, r) => t + r.swaps, 0)];
    })).toEqual(py);
  });
});
