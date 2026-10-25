import { describe, expect, it } from 'vitest';
import * as lru from '../src/engine/lru-cache';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('LRU 缓存：和 Python 参考实现对拍', () => {
  it('随机操作：每次 get 的结果和最后的顺序一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => {
      const cap = 1 + (k % 5);
      return { cap, ops: lru.genOps(1 + (k % 30), 1 + (k % 7)) };
    });
    const py = runPython(
      'lru-cache',
      'import json,sys\nfrom lru_cache import run_ops\nprint(json.dumps([run_ops(c["cap"], [[o["t"], o["k"]] + ([o["v"]] if o["t"] == "put" else []) for o in c["ops"]]) for c in json.load(sys.stdin)]))',
      cases,
    ) as [(number | null)[], number[]][];
    const mine = cases.map((c) => {
      const steps = lru.buildTrace(c.cap, c.ops);
      const ends = steps.filter((s) => s.opEnd);
      return [
        c.ops.map((o, i) => (o.t === 'get' ? ends[i].ret : null)),
        steps.length ? steps.at(-1)!.list.map((x) => x.k) : [],
      ];
    });
    expect(mine).toEqual(py);
  });

  it('LRU 和 FIFO 的命中次数一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => ({
      seq: Array.from({ length: 1 + (k % 30) }, () => 1 + Math.floor(Math.random() * 7)),
      cap: 1 + (k % 5),
    }));
    const py = runPython(
      'lru-cache',
      'import json,sys\nfrom lru_cache import hits\nprint(json.dumps([[hits(c["seq"], c["cap"], "lru"), hits(c["seq"], c["cap"], "fifo")] for c in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((c) => [lru.countHits(c.seq, c.cap, 'lru'), lru.countHits(c.seq, c.cap, 'fifo')])).toEqual(py);
  });
});
