import { describe, expect, it } from 'vitest';
import * as bs from '../src/engine/binary-search';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('二分查找：和 Python 参考实现对拍', () => {
  it('结果一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => {
      const arr = bs.genArray(1 + (k % 32));
      const target = k % 2 ? arr[k % arr.length] : bs.missingValue(arr);
      return { arr, target };
    });
    const py = runPython(
      'binary-search',
      'import json,sys\nfrom binary_search import binary_search\nprint(json.dumps([binary_search(c["arr"], c["target"]) for c in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((c) => bs.buildTrace(c.arr, c.target).at(-1)!.found)).toEqual(py);
  });
});
