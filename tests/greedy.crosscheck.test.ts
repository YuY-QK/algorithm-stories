import { describe, expect, it } from 'vitest';
import * as g from '../src/engine/greedy';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('贪心找零：和 Python 参考实现对拍', () => {
  it('贪心结果、最少枚数、最小反例一致', () => {
    const cases = Array.from({ length: 300 }, (_, k) => {
      const set = new Set<number>(k % 4 ? [1] : []);
      const n = 1 + (k % 5);
      while (set.size < n) set.add(1 + Math.floor(Math.random() * 40));
      return { coins: [...set], amount: Math.floor(Math.random() * 150) };
    });
    const py = runPython(
      'greedy',
      'import json,sys\nfrom greedy import greedy_change, min_coins, counterexample\n'
        + 'print(json.dumps([[greedy_change(c["coins"], c["amount"]), min_coins(c["coins"], c["amount"]), counterexample(c["coins"]) if 1 in c["coins"] else None] for c in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((c) => [
      c.coins.includes(1) ? g.buildTrace(c.coins, c.amount).at(-1)!.picked : g.greedyPicks(c.coins, c.amount),
      g.minCoins(c.coins, c.amount),
      c.coins.includes(1) ? g.counterexample(c.coins)?.amount ?? null : null,
    ])).toEqual(py);
  });
});
