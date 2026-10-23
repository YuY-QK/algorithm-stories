import { describe, expect, it } from 'vitest';
import * as is from '../src/engine/insertion-sort';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('插入排序：和 Python 参考实现对拍', () => {
  it('排序结果、比较次数、挪动次数一致', () => {
    const cases = Array.from({ length: 400 }, (_, k) =>
      k % 4 === 0 ? is.nearlySorted(2 + (k % 20)) : is.genArray(k % 25, k % 2 ? 5 : 40),
    );
    const py = runPython(
      'insertion-sort',
      'import json,sys\nfrom insertion_sort import insertion_sort\nout=[]\nfor a in json.load(sys.stdin):\n    c,m=insertion_sort(a)\n    out.append([a,c,m])\nprint(json.dumps(out))',
      cases,
    );
    const ts = cases.map((a) => {
      const last = is.buildTrace(a).at(-1)!;
      return [last.arr, last.compares, last.moves];
    });
    expect(ts).toEqual(py);
  });
});
