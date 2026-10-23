import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE, CODE, KID_COINS, LOOK_AMOUNT, ODD, PUZZLES, SYSTEMS, bestPicks, buildTrace, canTake,
  cashierAmount, cashierStars, cashierTrace, counterexample, greedyNext, greedyPicks, judgePuzzle, minCoins,
  rounds, runBug,
} from '../src/engine/greedy';

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

/** 一套随机面值，一定有 1 */
function randomCoins(rand = Math.random): number[] {
  const set = new Set([1]);
  const k = 1 + Math.floor(rand() * 5);
  while (set.size < k + 1) set.add(2 + Math.floor(rand() * 40));
  return [...set].sort(() => rand() - 0.5);
}

/** 宽度优先搜索的最少枚数，用来核对动态规划 */
function bruteMin(coins: number[], amount: number): number {
  if (amount === 0) return 0;
  let frontier = [0];
  const seen = new Set([0]);
  for (let depth = 1; frontier.length; depth++) {
    const next: number[] = [];
    for (const s of frontier) {
      for (const c of coins) {
        const t = s + c;
        if (t === amount) return depth;
        if (t < amount && !seen.has(t)) {
          seen.add(t);
          next.push(t);
        }
      }
    }
    frontier = next;
  }
  return -1;
}

describe('贪心 看、玩：小熊的小卖部', () => {
  it('「看」：46 找成 20、20、5、1，跳过 50、10、2', () => {
    const t = cashierTrace(KID_COINS, LOOK_AMOUNT);
    expect(t.filter((m) => m.action === 'take').map((m) => m.coin)).toEqual([20, 20, 5, 1]);
    expect(t.filter((m) => m.action === 'skip').map((m) => m.coin)).toEqual([50, 10, 2]);
    for (const m of t) expect(m.action === 'skip' ? m.coin > m.left : m.coin <= m.left).toBe(true);
  });

  it('「看」第二页：1、3、4 凑 6，贪心 3 枚，最少 2 枚', () => {
    expect(greedyPicks(ODD.coins, ODD.amount)).toEqual([4, 1, 1]);
    expect(bestPicks(ODD.coins, ODD.amount)).toEqual([3, 3]);
  });

  it('cashierTrace 拿的硬币和 greedyPicks 一致，总和正好', () => {
    for (let k = 0; k < 2000; k++) {
      const coins = randomCoins();
      const amount = Math.floor(Math.random() * 150);
      const takes = cashierTrace(coins, amount).filter((m) => m.action === 'take').map((m) => m.coin);
      expect(takes).toEqual(greedyPicks(coins, amount));
      expect(sum(takes)).toBe(amount);
    }
  });

  it('收银员：太大的硬币放不进去，greedyNext 是能放的最大的', () => {
    for (let left = 0; left <= 120; left++) {
      for (const c of KID_COINS) expect(canTake(left, c)).toBe(c <= left);
      const n = greedyNext(KID_COINS, left);
      if (left === 0) expect(n).toBeNull();
      else expect(n).toBe(Math.max(...KID_COINS.filter((c) => c <= left)));
    }
  });

  it('收银员每局的金额：11～99，贪心至少拿 3 枚，小卖部的硬币下贪心就是最少', () => {
    for (let k = 0; k < 500; k++) {
      const a = cashierAmount();
      expect(a).toBeGreaterThanOrEqual(11);
      expect(a).toBeLessThanOrEqual(99);
      expect(greedyPicks(KID_COINS, a).length).toBeGreaterThanOrEqual(3);
      expect(greedyPicks(KID_COINS, a).length).toBe(minCoins(KID_COINS, a));
    }
  });

  it('星星', () => {
    expect([[4, 4], [5, 4], [6, 4], [12, 4]].map(([u, b]) => cashierStars(u, b))).toEqual([3, 2, 1, 1]);
  });

  it('机器人谜题：每一关贪心都比最少的多，判定正确', () => {
    for (const p of PUZZLES) {
      const g = greedyPicks(p.coins, p.amount);
      const b = bestPicks(p.coins, p.amount)!;
      expect(g.length).toBeGreaterThan(b.length);
      expect(judgePuzzle(p, b)).toBe('beat');
      expect(judgePuzzle(p, g)).toBe('tie');
      expect(judgePuzzle(p, [1])).toBe('short');
      expect(judgePuzzle(p, [...g, 1])).toBe('over');
      // 硬币不多，孩子点得过来
      expect(g.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('贪心 动态规划 minCoins', () => {
  it('和宽度优先搜索结果一致（包括凑不出来的 -1）', () => {
    for (let k = 0; k < 400; k++) {
      const coins = [...new Set(Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => 2 + Math.floor(Math.random() * 25)))];
      if (k % 2) coins.push(1);
      for (let a = 0; a < 70; a++) {
        expect(minCoins(coins, a)).toBe(bruteMin(coins, a));
        const p = bestPicks(coins, a);
        if (p) {
          expect(sum(p)).toBe(a);
          for (const c of p) expect(coins).toContain(c);
        }
      }
    }
  });
});

describe('贪心 做：逐步执行', () => {
  it('2000 组随机面值和金额：结果和 greedyPicks 一致，每一步的状态说得通', () => {
    for (let k = 0; k < 2000; k++) {
      const coins = randomCoins();
      const amount = Math.floor(Math.random() * 120);
      const steps = buildTrace(coins, amount);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.line).toBe(11);
      expect(last.picked).toEqual(greedyPicks(coins, amount));
      expect(last.left).toBe(0);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(CODE[s.line - 1].trim()).not.toBe('}');
        // 不变式：已经拿的 + 剩下的 = 总金额（第 7 行刚放进硬币，left 还没减）
        if (s.left !== null) expect(sum(s.picked) + s.left).toBe(amount + (s.line === 7 ? s.c! : 0));
        if (s.line === 7) expect(s.picked.at(-1)).toBe(s.c);
      }
      // 每拿一枚都走 6、7、8 三行
      expect(steps.filter((s) => s.line === 7)).toHaveLength(last.picked.length);
    }
  });

  it('行号指向对应的代码', () => {
    expect(CODE[1]).toContain('sortedDescending');
    expect(CODE[5]).toContain('while (left >= c)');
    expect(CODE[6]).toContain('picked.add(c)');
    expect(CODE[7]).toContain('left -= c');
    expect(CODE[10]).toContain('return picked');
  });

  it('几套面值：只有 1、3、4 会多拿', () => {
    for (const s of SYSTEMS) {
      for (let a = 0; a <= 200; a++) {
        const g = greedyPicks(s.coins, a).length;
        if (s.id === 'odd') expect(g).toBeGreaterThanOrEqual(minCoins(s.coins, a));
        else expect(g).toBe(minCoins(s.coins, a));
      }
    }
  });
});

describe('贪心 做：猜下一步', () => {
  it('rounds 每一题拿的面值和枚数，展开后就是 greedyPicks', () => {
    for (let k = 0; k < 2000; k++) {
      const coins = randomCoins();
      const amount = Math.floor(Math.random() * 200);
      const rs = rounds(coins, amount);
      expect(rs.flatMap((r) => Array<number>(r.count).fill(r.coin))).toEqual(greedyPicks(coins, amount));
      for (const r of rs) {
        expect(r.count).toBeGreaterThan(0);
        expect(r.coin).toBe(greedyNext(coins, r.left));
        expect(r.count).toBe(Math.floor(r.left / r.coin));
      }
    }
  });
});

describe('贪心 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错', () => {
    const end = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    const right = Object.fromEntries(BUGS.map((b) => [b.id, greedyPicks(b.coins, b.amount)]));
    expect(end.ascending.outcome).toBe('ok');
    expect(end.ascending.picked.length).toBeGreaterThan(right.ascending.length);
    expect(end.if.outcome).toBe('ok');
    expect(sum(end.if.picked)).toBeLessThan(BUGS.find((b) => b.id === 'if')!.amount);
    expect(end.reset.outcome).toBe('stuck');
  });

  it('runBug 的行号在范围里，只有最后一步 done', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
    }
  });
});

describe('贪心 做：挑战', () => {
  it('counterexample 是最小的反例；没有反例时往后查很远也找不到', () => {
    const cases = [...CHALLENGE.map((c) => c.coins), ...Array.from({ length: 300 }, () => randomCoins())];
    for (const coins of cases) {
      const ce = counterexample(coins);
      const far = 3 * Math.max(...coins) + 20;
      let first: number | null = null;
      for (let a = 1; a <= far && first === null; a++) {
        if (greedyPicks(coins, a).length > minCoins(coins, a)) first = a;
      }
      expect(ce?.amount ?? null).toBe(first);
      if (ce) {
        expect(sum(ce.best)).toBe(ce.amount);
        expect(ce.greedy.length).toBeGreaterThan(ce.best.length);
      }
    }
  });

  it('题目里有对有错', () => {
    const ok = CHALLENGE.map((c) => counterexample(c.coins) === null);
    expect(ok).toContain(true);
    expect(ok).toContain(false);
  });
});
