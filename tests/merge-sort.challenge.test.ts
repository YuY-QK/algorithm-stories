import { describe, expect, it } from 'vitest';
import { compareBounds, mergeCompares, worstCase } from '../src/engine/merge-sort';

describe('归并排序 挑战', () => {
  it('worstCase 对 2 的幂达到理论最多比较次数', () => {
    for (const n of [2, 4, 8, 16, 32]) {
      const w = worstCase(n);
      expect([...w].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, k) => k + 1));
      expect(mergeCompares(w).total).toBe(compareBounds(n).max);
    }
  });

  it('已经有序和完全倒序都是最少次数', () => {
    const sorted = Array.from({ length: 8 }, (_, k) => k + 1);
    expect(mergeCompares(sorted).total).toBe(12);
    expect(mergeCompares([...sorted].reverse()).total).toBe(12);
  });
});
