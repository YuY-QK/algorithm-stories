import { describe, expect, it } from 'vitest';
import { buildTrace, genArray, kidHeights, kidInit, kidNeed, kidStep, ROUND_END_LINE, type Shape } from '../src/engine/bubble-sort';

describe('冒泡排序 初级', () => {
  it('一直答对就能把队伍从矮到高排好', () => {
    for (let k = 0; k < 500; k++) {
      const hs = kidHeights(5);
      let s = kidInit(hs);
      let guard = 0;
      while (!s.done && guard++ < 100) s = kidStep(s, kidNeed(s, (h) => h), (h) => h)!;
      expect(s.done).toBe(true);
      expect(s.a).toEqual([...hs].sort((x, y) => x - y));
    }
  });

  it('答错返回 null', () => {
    const s = kidInit([140, 120]);
    expect(kidStep(s, 'keep', (h) => h)).toBeNull();
  });
});

describe('冒泡排序 高级轨迹', () => {
  const shapes: Shape[] = ['random', 'nearly', 'reversed'];

  it('2000 组随机数组都排对，计数和最坏情况一致', () => {
    for (let k = 0; k < 2000; k++) {
      const n = [1, 2, 6, 10, 16][k % 5];
      const input = genArray(n, shapes[k % 3]);
      const steps = buildTrace(input);
      const last = steps[steps.length - 1];
      expect(last.done).toBe(true);
      expect(last.a).toEqual([...input].sort((x, y) => x - y));
      expect(last.compares).toBeLessThanOrEqual((n * (n - 1)) / 2);
      // 每次交换都伴随一次比较
      expect(steps.filter((s) => s.swap)).toHaveLength(last.swaps);
      expect(steps.filter((s) => s.cmp)).toHaveLength(last.compares);
    }
  });

  it('逆序是最坏情况，已有序只走一轮', () => {
    const n = 12;
    const rev = Array.from({ length: n }, (_, k) => n - k);
    expect(buildTrace(rev).at(-1)!.compares).toBe((n * (n - 1)) / 2);
    const sorted = Array.from({ length: n }, (_, k) => k);
    const steps = buildTrace(sorted);
    expect(steps.at(-1)!.compares).toBe(n - 1);
    expect(steps.filter((s) => s.line === ROUND_END_LINE)).toHaveLength(1);
  });
});
