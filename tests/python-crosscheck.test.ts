/**
 * 和 Python 参考实现对拍：同一批输入，引擎轨迹的最终结果要和 .py 完全一致。
 * 没装 python3 的环境会跳过。
 */
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import * as bs from '../src/engine/binary-search';
import * as bubble from '../src/engine/bubble-sort';

function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
}

function runPython(dir: string, code: string, input: unknown): unknown {
  const out = execFileSync('python3', ['-c', code], {
    cwd: `content/algorithms/${dir}`,
    input: JSON.stringify(input),
  });
  return JSON.parse(out.toString());
}

describe.skipIf(!hasPython())('和 Python 参考实现对拍', () => {
  it('二分查找', () => {
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

  it('冒泡排序：结果、比较次数、交换次数', () => {
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
