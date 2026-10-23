import type { Step, Trace } from './types';

/* ---------- 通用：贪心找零和动态规划的最少枚数 ---------- */

/** 从大到小排好的面值（去重） */
export function desc(coins: number[]): number[] {
  return [...new Set(coins)].sort((a, b) => b - a);
}

/** 贪心找零：从大到小，每种面值能拿就一直拿。返回按拿的顺序排列的硬币；凑不齐时剩下的金额没有找出去 */
export function greedyPicks(coins: number[], amount: number): number[] {
  const out: number[] = [];
  let left = amount;
  for (const c of desc(coins)) {
    while (left >= c) {
      out.push(c);
      left -= c;
    }
  }
  return out;
}

/**
 * 动态规划：凑出 amount 最少要几枚，以及一种最少的拿法（从大到小）。
 * 凑不出来返回 null。best[x] = min(best[x - c] + 1)。
 */
export function bestPicks(coins: number[], amount: number): number[] | null {
  const INF = Number.MAX_SAFE_INTEGER;
  const best = new Array<number>(amount + 1).fill(INF);
  const from = new Array<number>(amount + 1).fill(0);
  best[0] = 0;
  const cs = desc(coins);
  for (let x = 1; x <= amount; x++) {
    for (const c of cs) {
      if (c <= x && best[x - c] !== INF && best[x - c] + 1 < best[x]) {
        best[x] = best[x - c] + 1;
        from[x] = c;
      }
    }
  }
  if (best[amount] === INF) return null;
  const out: number[] = [];
  for (let x = amount; x > 0; x -= from[x]) out.push(from[x]);
  return out.sort((a, b) => b - a);
}

/** 最少枚数，凑不出来返回 -1（和 Kotlin 练习里的 minCoins 一致） */
export function minCoins(coins: number[], amount: number): number {
  const p = bestPicks(coins, amount);
  return p ? p.length : -1;
}

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

/* ---------- 看、玩：小熊的小卖部 ---------- */

/** 小卖部的硬币：1、2、5 一组往上翻十倍，和人民币分、角的面值一样 */
export const KID_COINS = [50, 20, 10, 5, 2, 1];
/** 「看」里要找的零钱 */
export const LOOK_AMOUNT = 46;
/** 「看」的第二页：奇怪的硬币，贪心失灵 */
export const ODD = { coins: [4, 3, 1], amount: 6 };

/** 收银员看一枚硬币时做了什么：拿走它，或者它比剩下的大、跳过 */
export interface CashierMove {
  coin: number;
  /** 这一下之前还要找多少 */
  left: number;
  action: 'take' | 'skip';
}

/**
 * 「看」的绘本用：从大到小看每种硬币，比剩下的大就跳过，否则一枚一枚拿，直到它比剩下的大。
 * 只记录「一枚都没拿就跳过」的面值，拿过几枚之后的那次比较不单独记。
 */
export function cashierTrace(coins: number[], amount: number): CashierMove[] {
  const out: CashierMove[] = [];
  let left = amount;
  for (const c of desc(coins)) {
    if (left === 0) break;
    if (c > left) {
      out.push({ coin: c, left, action: 'skip' });
      continue;
    }
    while (left >= c) {
      out.push({ coin: c, left, action: 'take' });
      left -= c;
    }
  }
  return out;
}

/** 能不能把这枚硬币放进找零盘：比剩下的大就找多了 */
export function canTake(left: number, coin: number): boolean {
  return coin <= left;
}

/** 剩下 left 时，贪心会拿哪一枚（最大的、不超过 left 的） */
export function greedyNext(coins: number[], left: number): number | null {
  return desc(coins).find((c) => c <= left) ?? null;
}

/** 收银员游戏的星星：和最少枚数一样多三颗，多一枚两颗，再多一颗 */
export function cashierStars(used: number, best: number): 1 | 2 | 3 {
  return used <= best ? 3 : used === best + 1 ? 2 : 1;
}

/** 收银员游戏每局要找的钱：至少要拿三枚，免得太简单 */
export function cashierAmount(rand: () => number = Math.random): number {
  for (;;) {
    const a = 11 + Math.floor(rand() * 89);
    if (greedyPicks(KID_COINS, a).length >= 3) return a;
  }
}

/** 玩法二「打败贪心机器人」：每一关贪心都会多拿，孩子要找出更少的拿法 */
export interface Puzzle {
  coins: number[];
  amount: number;
}
export const PUZZLES: Puzzle[] = [
  { coins: [4, 3, 1], amount: 6 },
  { coins: [5, 4, 1], amount: 8 },
  { coins: [10, 7, 1], amount: 14 },
  { coins: [9, 6, 5, 1], amount: 11 },
];

/** 孩子凑好之后的判定：凑齐了没有、比贪心少没有 */
export function judgePuzzle(p: Puzzle, picks: number[]): 'short' | 'over' | 'beat' | 'tie' {
  const s = sum(picks);
  if (s < p.amount) return 'short';
  if (s > p.amount) return 'over';
  return picks.length < greedyPicks(p.coins, p.amount).length ? 'beat' : 'tie';
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun greedyChange(coins: IntArray, amount: Int): List<Int> {',
  '    val sorted = coins.sortedDescending()',
  '    val picked = mutableListOf<Int>()',
  '    var left = amount',
  '    for (c in sorted) {',
  '        while (left >= c) {',
  '            picked.add(c)',
  '            left -= c',
  '        }',
  '    }',
  '    return picked',
  '}',
];

export interface GreedyStep extends Step {
  /** 排好序的面值，排序之前是空的 */
  sorted: number[];
  /** 正在看的面值 */
  c: number | null;
  /** 还要找多少；初始化之前是 null */
  left: number | null;
  picked: number[];
}

/** 一套面值的名字和内容，「做」里几处共用 */
export const SYSTEMS: { id: string; label: string; coins: number[] }[] = [
  { id: 'cny', label: '1·2·5·10·20·50', coins: [1, 2, 5, 10, 20, 50] },
  { id: 'usd', label: '1·5·10·25', coins: [1, 5, 10, 25] },
  { id: 'odd', label: '1·3·4', coins: [1, 3, 4] },
];

const listText = (a: number[]) => '[' + a.join(', ') + ']';

export function buildTrace(coins: number[], amount: number): Trace<GreedyStep> {
  const steps: GreedyStep[] = [];
  let sorted: number[] = [];
  let c: number | null = null;
  let left: number | null = null;
  let picked: number[] = [];
  const push = (line: number, note: string, done = false) => {
    steps.push({ line, note, done, sorted, c, left, picked });
  };

  sorted = [...coins].sort((a, b) => b - a);
  push(2, '面值从大到小排好：' + listText(sorted) + '。');
  push(3, 'picked 是找零盘，一开始是空的。');
  left = amount;
  push(4, '还要找 left = ' + amount + '。');
  for (const coin of sorted) {
    c = coin;
    push(5, '看面值 c = ' + c + '。');
    for (;;) {
      if (left >= c) {
        push(6, left + ' >= ' + c + '，拿得下，拿一枚。');
        picked = [...picked, c];
        push(7, '把 ' + c + ' 放进找零盘，现在 ' + picked.length + ' 枚。');
        left -= c;
        push(8, 'left = ' + (left + c) + ' - ' + c + ' = ' + left + '。');
      } else {
        push(6, left + ' < ' + c + '，' + c + ' 太大了，换下一种面值。');
        break;
      }
    }
  }
  c = null;
  push(11, left === 0
    ? '返回 ' + listText(picked) + '，一共 ' + picked.length + ' 枚。'
    : '返回 ' + listText(picked) + '，还差 ' + left + ' 没找出去（面值里没有 1）。', true);
  return steps;
}

/* ---------- 做：猜下一步 ---------- */

/** 每一种拿过的面值是一道题：剩下 left 时拿哪一种、拿几枚 */
export interface Round {
  left: number;
  coin: number;
  count: number;
}

export function rounds(coins: number[], amount: number): Round[] {
  const out: Round[] = [];
  let left = amount;
  for (const c of desc(coins)) {
    if (c > left) continue;
    const count = Math.floor(left / c);
    out.push({ left, coin: c, count });
    left -= count * c;
  }
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug {
  id: 'ascending' | 'if' | 'reset';
  title: string;
  /** 有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  code: string[];
  wrongLine: number;
  fixed: string;
  coins: number[];
  amount: number;
  expect: string;
  explain: string;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: Bug[] = [
  {
    id: 'ascending',
    title: '找了一大把硬币',
    code: variant(2, '    val sorted = coins.sorted()'),
    wrongLine: 2,
    fixed: '    val sorted = coins.sortedDescending()',
    coins: [1, 2, 5, 10],
    amount: 12,
    expect: '应该返回 [10, 2]，2 枚',
    explain: 'sorted() 是从小到大排。贪心要先拿最大的，结果却先看 1，一枚一枚把 12 全用 1 凑完了。要从大到小：sortedDescending()。',
  },
  {
    id: 'if',
    title: '钱没找够就收工',
    code: variant(6, '        if (left >= c) {'),
    wrongLine: 6,
    fixed: '        while (left >= c) {',
    coins: [1, 2, 5, 10],
    amount: 27,
    expect: '应该返回 [10, 10, 5, 2]，加起来是 27',
    explain: 'if 只判断一次，每种面值最多拿一枚。27 要两枚 10，拿了一枚就换下一种，最后只找出 18。同一种面值要拿到拿不下为止，所以用 while。',
  },
  {
    id: 'reset',
    title: '一直拿 10，停不下来',
    code: variant(8, '            left = amount - c'),
    wrongLine: 8,
    fixed: '            left -= c',
    coins: [1, 2, 5, 10],
    amount: 27,
    expect: '应该返回 [10, 10, 5, 2]',
    explain: '每次都从总金额 amount 里减，而不是从剩下的 left 里减。拿完第二枚 10，left 又变回 17，永远拿不完。余数要在剩下的基础上更新：left -= c。',
  },
];

export interface BugStep extends GreedyStep {
  /** 'ok' 正常返回（结果可能是错的）；'stuck' 判定为死循环 */
  outcome: 'running' | 'ok' | 'stuck';
}

/**
 * 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号。
 * 在 while 判断处，（面值，left）重复出现就判定为死循环。
 */
export function runBug(bug: Bug): Trace<BugStep> {
  const steps: BugStep[] = [];
  let sorted: number[] = [];
  let c: number | null = null;
  let left: number | null = null;
  let picked: number[] = [];
  const push = (line: number, note: string, outcome: BugStep['outcome'] = 'running') => {
    steps.push({ line, note, done: outcome !== 'running', outcome, sorted, c, left, picked });
  };

  sorted = bug.id === 'ascending' ? [...bug.coins].sort((a, b) => a - b) : [...bug.coins].sort((a, b) => b - a);
  push(2, (bug.id === 'ascending' ? '面值从小到大排：' : '面值从大到小排：') + listText(sorted) + '。');
  push(3, 'picked 一开始是空的。');
  left = bug.amount;
  push(4, '还要找 left = ' + left + '。');
  const seen = new Set<string>();
  for (const coin of sorted) {
    c = coin;
    push(5, '看面值 c = ' + c + '。');
    for (;;) {
      const key = c + ',' + left;
      if (seen.has(key)) {
        push(6, 'c = ' + c + '，left = ' + left + '，和上一圈一模一样，再转下去也不会变：死循环！', 'stuck');
        return steps;
      }
      seen.add(key);
      if (left < c) {
        push(6, left + ' < ' + c + '，换下一种面值。');
        break;
      }
      push(6, left + ' >= ' + c + '，拿一枚。');
      picked = [...picked, c];
      push(7, '放进 ' + c + '，现在 ' + picked.length + ' 枚。');
      if (bug.id === 'reset') {
        left = bug.amount - c;
        push(8, 'left = amount - c = ' + bug.amount + ' - ' + c + ' = ' + left + '。');
      } else {
        left -= c;
        push(8, 'left = ' + left + '。');
      }
      if (bug.id === 'if') {
        push(9, '这是 if，不会回头再判断，直接看下一种面值。');
        break;
      }
    }
  }
  c = null;
  push(11, '返回 ' + listText(picked) + '，' + picked.length + ' 枚，加起来 ' + sum(picked) + '。', 'ok');
  return steps;
}

/* ---------- 做：挑战「贪心靠得住吗」 ---------- */

/** 一个金额：贪心的拿法比最少的多 */
export interface Counterexample {
  amount: number;
  greedy: number[];
  best: number[];
}

/** 要查的金额上界（不含）：最大的两种面值之和 */
export function checkLimit(coins: number[]): number {
  const cs = desc(coins);
  return cs.length >= 2 ? cs[0] + cs[1] : cs[0];
}

/**
 * 找贪心失灵的最小金额。面值里要有 1。
 * Kozen 和 Zaks（1994）证明：如果有反例，最小的反例小于最大的两种面值之和，所以只要查到那里。
 */
export function counterexample(coins: number[]): Counterexample | null {
  const cs = desc(coins);
  const limit = checkLimit(cs);
  for (let x = 1; x < limit; x++) {
    const g = greedyPicks(cs, x);
    const b = bestPicks(cs, x)!;
    if (g.length > b.length) return { amount: x, greedy: g, best: b };
  }
  return null;
}

/** 挑战的题目：判断每套面值下贪心是不是总能拿到最少 */
export const CHALLENGE: { coins: number[]; note: string }[] = [
  { coins: [1, 5, 10, 25], note: '美元硬币：1、5、10、25 美分' },
  { coins: [1, 3, 4], note: '「看」里那套奇怪的硬币' },
  { coins: [1, 2, 5, 10, 20, 50], note: '小卖部的硬币，人民币分、角也是 1、2、5 一组' },
  { coins: [1, 5, 10, 20, 25], note: '在美元里加一枚 20 美分' },
  { coins: [1, 3, 6, 12, 24, 30], note: '英国 1971 年以前的便士、先令、弗罗林、半克朗（单位：便士）' },
  { coins: [1, 2, 4, 8, 16, 32], note: '每种都是上一种的两倍' },
];

/** 延伸里展示的动态规划版本（Kotlin 练习 minCoins 的参考写法） */
export const DP_CODE = [
  'fun minCoins(coins: IntArray, amount: Int): Int {',
  '    val inf = Int.MAX_VALUE',
  '    val best = IntArray(amount + 1) { inf }  // best[x]：凑出 x 最少几枚',
  '    best[0] = 0',
  '    for (x in 1..amount) {',
  '        for (c in coins) {',
  '            if (c <= x && best[x - c] != inf && best[x - c] + 1 < best[x])',
  '                best[x] = best[x - c] + 1  // 最后一枚是 c',
  '        }',
  '    }',
  '    return if (best[amount] == inf) -1 else best[amount]',
  '}',
];
