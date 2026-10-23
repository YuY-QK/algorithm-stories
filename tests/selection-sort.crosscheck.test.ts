import { describe, expect, it } from 'vitest';
import * as sel from '../src/engine/selection-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('选择排序：和 Python 参考实现对拍', () => {
  it('结果、比较次数、交换次数一致', () => {
    const shapes = ['random', 'dups', 'sorted', 'reversed'] as const;
    const cases = Array.from({ length: 400 }, (_, k) => sel.genArray(k % 17, shapes[k % 4]));
    const py = runPython(
      'selection-sort',
      'import json,sys\nfrom selection_sort import selection_sort, count_ops\nprint(json.dumps([[selection_sort(list(a)), *count_ops(a)] for a in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((a) => {
      const last = sel.buildTrace(a).at(-1)!;
      return [last.a, last.compares, last.swaps];
    })).toEqual(py);
  });

  it('每一轮 minIdx 停的位置一致（包括有重复时取最前面的）', () => {
    const cases = Array.from({ length: 300 }, (_, k) => sel.genArray(2 + (k % 10), k % 2 ? 'dups' : 'random'));
    const code = [
      'import json,sys',
      'out = []',
      'for a in json.load(sys.stdin):',
      '    a, mins = list(a), []',
      '    for i in range(len(a) - 1):',
      '        m = i',
      '        for j in range(i + 1, len(a)):',
      '            if a[j] < a[m]: m = j',
      '        mins.append(m)',
      '        a[i], a[m] = a[m], a[i]',
      '    out.append(mins)',
      'print(json.dumps(out))',
    ].join('\n');
    const py = runPython('selection-sort', code, cases);
    expect(cases.map((a) => sel.rounds(a).map((r) => r.minIdx))).toEqual(py);
  });
});
