import { describe, expect, it } from 'vitest';
import * as dp from '../src/engine/dynamic-programming';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('动态规划：和 Python 参考实现对拍', () => {
  it('爬楼梯：整张 dp 表、调用次数一致', () => {
    const ns = Array.from({ length: 40 }, (_, k) => k + 1);
    const py = runPython(
      'dynamic-programming',
      'import json,sys\nfrom dynamic_programming import climb_stairs_table, naive_calls, memo_calls\n'
        + 'print(json.dumps([[climb_stairs_table(n), naive_calls(min(n, 22)), memo_calls(n)] for n in json.load(sys.stdin)]))',
      ns,
    );
    expect(ns.map((n) => [dp.waysTable(n), dp.naiveCalls(Math.min(n, 22)), dp.memoCalls(n)])).toEqual(py);
  });

  it('最后一步的 dp 表和引擎逐步执行的结果一致', () => {
    const ns = Array.from({ length: 30 }, (_, k) => k + 2);
    const py = runPython(
      'dynamic-programming',
      'import json,sys\nfrom dynamic_programming import climb_stairs\nprint(json.dumps([climb_stairs(n) for n in json.load(sys.stdin)]))',
      ns,
    );
    expect(ns.map((n) => dp.buildTrace(n).at(-1)!.result)).toEqual(py);
  });

  it('网格数路线：dp 表一致', () => {
    const cases = Array.from({ length: 200 }, () => dp.randomRocks());
    const py = runPython(
      'dynamic-programming',
      'import json,sys\nfrom dynamic_programming import unique_paths_with_obstacles\n'
        + 'print(json.dumps([unique_paths_with_obstacles([[1 if x else 0 for x in row] for row in g]) for g in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((g) => dp.gridTable(g))).toEqual(py);
  });
});
