import { describe, expect, it } from 'vitest';
import { buildTrace, genArray, kidGuess, kidNarrow, missingValue } from '../src/engine/binary-search';

describe('二分查找 初级', () => {
  it('1～100 每个号码最多猜 7 次', () => {
    for (let secret = 1; secret <= 100; secret++) {
      let lo = 1, hi = 100, tries = 1;
      while (kidGuess(lo, hi) !== secret) {
        const r = kidNarrow(lo, hi, secret < kidGuess(lo, hi) ? 'smaller' : 'bigger');
        expect(r.empty).toBe(false);
        lo = r.lo; hi = r.hi; tries++;
      }
      expect(tries).toBeLessThanOrEqual(7);
    }
  });

  it('前后矛盾的回答会让范围变空', () => {
    expect(kidNarrow(5, 5, 'bigger').empty).toBe(true);
  });
});

describe('二分查找 高级轨迹', () => {
  it('2000 组随机数组，命中和未命中结果都正确', () => {
    for (let k = 0; k < 2000; k++) {
      const arr = genArray([1, 2, 8, 16, 32][k % 5]);
      const hit = k % 2 === 0;
      const target = hit ? arr[Math.floor(Math.random() * arr.length)] : missingValue(arr);
      const steps = buildTrace(arr, target);
      const last = steps[steps.length - 1];
      expect(last.done).toBe(true);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      if (hit) expect(arr[last.found]).toBe(target);
      else expect(last.found).toBe(-1);
      // 比较次数不超过 floor(log2 n) + 1
      expect(last.count).toBeLessThanOrEqual(Math.floor(Math.log2(arr.length)) + 1);
      for (const s of steps) {
        // 取中点到比较这几步，mid 一定落在 [lo, hi] 里
        if (s.line >= 4 && s.line <= 7) expect(s.mid! >= s.lo && s.mid! <= s.hi).toBe(true);
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(11);
      }
    }
  });

  it('missingValue 不在数组里', () => {
    for (let k = 0; k < 200; k++) {
      const arr = genArray(16);
      expect(arr).not.toContain(missingValue(arr));
    }
  });
});
