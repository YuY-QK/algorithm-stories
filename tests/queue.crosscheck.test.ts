import { describe, expect, it } from 'vitest';
import * as q from '../src/engine/queue';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('队列：和 Python 参考实现对拍', () => {
  it('每个操作的返回值和最后的数组、head、tail、size 都一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => {
      const cap = 1 + (k % 6);
      return { cap, ops: q.randomOps(cap, 1 + (k % 24)) };
    });
    const py = runPython(
      'queue',
      'import json,sys\nfrom ring_queue import run\nprint(json.dumps([run(c["cap"], c["ops"]) for c in json.load(sys.stdin)]))',
      cases,
    );
    const ts = cases.map(({ cap, ops }) => {
      const last = q.buildTrace(cap, ops).at(-1)!;
      return { results: q.simulate(cap, ops).results, cells: last.cells, head: last.head, tail: last.tail, size: last.size };
    });
    expect(ts).toEqual(py);
  });
});
