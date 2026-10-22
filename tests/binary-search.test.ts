import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_LIMIT, CHALLENGE_MAX, CODE, KID_N, buildTrace, genArray, middle, missingValue,
  narrow, pointTo, postmanTrace, rounds, runBug, stars,
} from '../src/engine/binary-search';

describe('二分查找 看、玩：小邮差', () => {
  it('15 个信箱，每个位置最多看 4 次就找到，每次都看剩下范围的正中间', () => {
    for (let secret = 1; secret <= KID_N; secret++) {
      const probes = postmanTrace(KID_N, secret);
      expect(probes.length).toBeLessThanOrEqual(4);
      expect(probes.at(-1)!.at).toBe(secret);
      expect(probes.at(-1)!.dir).toBe('hit');
      for (const p of probes) {
        expect(p.at).toBe(middle(p.lo, p.hi));
        expect(secret >= p.lo && secret <= p.hi).toBe(true);
        // 范围里的个数总是奇数，正中间唯一
        expect((p.hi - p.lo + 1) % 2).toBe(1);
      }
    }
  });

  it('门上的提示和排除范围：信永远留在范围里', () => {
    for (let k = 0; k < 3000; k++) {
      const secret = 1 + Math.floor(Math.random() * KID_N);
      let lo = 1, hi = KID_N, tries = 0;
      // 乱点：只点范围里的信箱，模拟玩法二里的孩子
      for (;;) {
        const at = lo + Math.floor(Math.random() * (hi - lo + 1));
        const d = pointTo(secret, at);
        tries++;
        if (d === 'hit') break;
        expect(d).toBe(secret < at ? 'left' : 'right');
        ({ lo, hi } = narrow(lo, hi, at, d));
        expect(secret >= lo && secret <= hi).toBe(true);
      }
      expect(tries).toBeLessThanOrEqual(KID_N);
    }
  });

  it('星星', () => {
    expect([1, 4, 5, 6, 7, 15].map(stars)).toEqual([3, 3, 2, 2, 1, 1]);
  });
});

describe('二分查找 做：逐步执行', () => {
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
        // 取中点这一步，mid 一定落在 [lo, hi] 里
        if (s.line === 5) expect(s.mid! >= s.lo && s.mid! <= s.hi).toBe(true);
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
      }
    }
  });

  it('步骤里的行号指向对应的代码', () => {
    const arr = genArray(16);
    const lines = new Set(buildTrace(arr, missingValue(arr)).map((s) => s.line));
    for (const l of lines) expect(CODE[l - 1].trim()).not.toBe('}');
    expect(CODE[4]).toContain('val mid');
    expect(CODE[7]).toContain('lo = mid + 1');
    expect(CODE[8]).toContain('hi = mid - 1');
    expect(CODE[11]).toContain('return -1');
  });

  it('missingValue 不在数组里', () => {
    for (let k = 0; k < 200; k++) {
      const arr = genArray(16);
      expect(arr).not.toContain(missingValue(arr));
    }
  });
});

describe('二分查找 做：猜下一步', () => {
  it('rounds 和 buildTrace 走的是同一条路', () => {
    for (let k = 0; k < 2000; k++) {
      const arr = genArray(1 + (k % 20));
      const target = k % 3 ? arr[k % arr.length] : missingValue(arr);
      const rs = rounds(arr, target);
      const mids = buildTrace(arr, target).filter((s) => s.line === 5).map((s) => s.mid);
      expect(rs.map((r) => r.mid)).toEqual(mids);
      const last = rs.at(-1)!;
      if (arr.includes(target)) expect(last.move).toBe('found');
      else expect(last.move).not.toBe('found');
      for (const r of rs) {
        expect(r.move).toBe(arr[r.mid] === target ? 'found' : arr[r.mid] < target ? 'right' : 'left');
      }
    }
  });
});

describe('二分查找 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错', () => {
    const outcome = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(outcome.lt.outcome).toBe('ok');
    expect(outcome.lt.result).toBe(-1); // 8 明明在下标 2
    expect(outcome['hi-mid'].outcome).toBe('stuck');
    expect(outcome.overflow.outcome).toBe('crash');
    expect(outcome.overflow.mid).toBeLessThan(0);
  });

  it('runBug 的行号指向 bug 版代码里对应的行', () => {
    for (const b of BUGS) {
      for (const s of runBug(b)) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
    }
  });
});

describe('二分查找 做：挑战', () => {
  it('1 到 1000 每个数，每次猜正中间都能在限定次数内猜中', () => {
    expect(CHALLENGE_LIMIT).toBe(10);
    for (let secret = 1; secret <= CHALLENGE_MAX; secret++) {
      expect(postmanTrace(CHALLENGE_MAX, secret).length).toBeLessThanOrEqual(CHALLENGE_LIMIT);
    }
  });
});
