import { describe, expect, it } from 'vitest';
import * as qs from '../src/engine/quick-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('快速排序：和 Python 参考实现对拍', () => {
  it('排序结果、比较、交换、调用次数、最大递归深度一致', () => {
    const rand = qs.seeded(21);
    const cases = Array.from({ length: 400 }, (_, k) =>
      k % 5 === 0 ? qs.makeInput(k % 2 ? 'sorted' : 'reversed', 2 + (k % 20)) : qs.genArray(k % 25, k % 2 ? 5 : 40, rand),
    );
    const py = runPython(
      'quick-sort',
      'import json,sys\nfrom quick_sort import quick_sort\nout=[]\nfor a in json.load(sys.stdin):\n    c,s,k,d=quick_sort(a)\n    out.append([a,c,s,k,d])\nprint(json.dumps(out))',
      cases,
    );
    const ts = cases.map((a) => {
      const last = qs.buildTrace(a).at(-1)!;
      return [last.arr, last.compares, last.swaps, last.calls, last.maxDepth];
    });
    expect(ts).toEqual(py);
  });

  it('已经排好的数组：比较次数是 n(n − 1)/2', () => {
    const sizes = [1, 2, 3, 10, 50];
    const py = runPython(
      'quick-sort',
      'import json,sys\nfrom quick_sort import compares_sorted_last, quick_sort\nout=[]\nfor n in json.load(sys.stdin):\n    out.append([compares_sorted_last(n), quick_sort(list(range(n)))[0]])\nprint(json.dumps(out))',
      sizes,
    );
    expect(py).toEqual(sizes.map((n) => [qs.worstCompares(n), qs.countCompares(qs.makeInput('sorted', n), 'last').compares]));
  });
});
