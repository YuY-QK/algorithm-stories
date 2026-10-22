import { describe, expect, it } from 'vitest';
import * as bubble from '../src/engine/bubble-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('冒泡排序：和 Python 参考实现对拍', () => {
  it('结果、比较次数、交换次数一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => bubble.genArray(k % 17, (['random', 'nearly', 'reversed'] as const)[k % 3]));
    const py = runPython(
      'bubble-sort',
      'import json,sys\nfrom bubble_sort import bubble_sort, count_ops\nprint(json.dumps([[bubble_sort(list(a)), *count_ops(a)] for a in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((a) => {
      const last = bubble.buildTrace(a).at(-1)!;
      return [last.a, last.compares, last.swaps];
    })).toEqual(py);
  });
});
