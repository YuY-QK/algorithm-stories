import { describe, expect, it } from 'vitest';
import * as ms from '../src/engine/merge-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('归并排序：和 Python 参考实现对拍', () => {
  it('排序结果、比较次数一致', () => {
    const cases = Array.from({ length: 400 }, (_, k) => ms.genArray(k % 25, k % 2 ? 5 : 40));
    const py = runPython(
      'merge-sort',
      'import json,sys\nfrom merge_sort import merge_sort\nout=[]\nfor a in json.load(sys.stdin):\n    c=merge_sort(a)\n    out.append([a,c])\nprint(json.dumps(out))',
      cases,
    );
    const ts = cases.map((a) => {
      const last = ms.buildTrace(a).at(-1)!;
      return [last.arr, last.compares];
    });
    expect(ts).toEqual(py);
  });

  it('比较次数的上下限一致', () => {
    const ns = Array.from({ length: 40 }, (_, k) => k);
    const py = runPython(
      'merge-sort',
      'import json,sys\nfrom merge_sort import compare_bounds\nprint(json.dumps([list(compare_bounds(n)) for n in json.load(sys.stdin)]))',
      ns,
    );
    expect(ns.map((n) => [ms.compareBounds(n).min, ms.compareBounds(n).max])).toEqual(py);
  });
});
