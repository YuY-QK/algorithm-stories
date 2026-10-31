import { m } from '../core/i18n';
import { PAUSE_LONG, PAUSE_MID, PAUSE_RETRY } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Step, Trace, TraceRules, Var,
} from '../core/types';

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

/** 「看」的一页：台词，加上小卖部的画面 */
export interface LookPage extends LookFrame {
  /** 柜台上的面值，从大到小 */
  coins: number[];
  /** 还要找多少 */
  left: number;
  /** 找零盘里已经放的硬币 */
  plate: number[];
  /** 正在看的面值 */
  focus: number | null;
  /** 已经跳过（比剩下的大）的面值 */
  dim: number[];
  /** 最少拿法，贪心失灵时在最后两页展示 */
  compare: number[] | null;
}

/** 一段找零过程的画面：每看一枚硬币一页 */
function coinPages(coins: number[], amount: number): LookPage[] {
  const out: LookPage[] = [];
  let plate: number[] = [];
  let dim: number[] = [];
  for (const mv of cashierTrace(coins, amount)) {
    if (mv.action === 'skip') {
      dim = [...dim, mv.coin];
      out.push({ say: m('look.skip', { coin: mv.coin, left: mv.left }), coins, left: mv.left, plate, focus: mv.coin, dim, compare: null });
    } else {
      plate = [...plate, mv.coin];
      const left = mv.left - mv.coin;
      out.push({ say: m('look.take', { coin: mv.coin, tail: m(left ? 'look.more' : 'look.finish', { left }) }), coins, left, plate, focus: mv.coin, dim, compare: null });
    }
  }
  return out;
}

/** 「看」的全部页：小卖部找 46，再换一盒奇怪的硬币找 6，台词和画面都由真实的贪心过程生成 */
export function lookFrames(): LookPage[] {
  const kid = desc(KID_COINS);
  const odd = desc(ODD.coins);
  const a = coinPages(kid, LOOK_AMOUNT);
  const b = coinPages(odd, ODD.amount);
  const lastA = a[a.length - 1];
  const lastB = b[b.length - 1];
  const best = bestPicks(odd, ODD.amount)!;
  return [
    { say: m('look.start', { amount: LOOK_AMOUNT }), coins: kid, left: LOOK_AMOUNT, plate: [], focus: null, dim: [], compare: null },
    { say: m('look.how'), coins: kid, left: LOOK_AMOUNT, plate: [], focus: kid[0], dim: [], compare: null },
    ...a,
    { ...lastA, say: m('look.best', { n: lastA.plate.length }), focus: null, dim: [] },
    { say: m('look.odd', { amount: ODD.amount }), coins: odd, left: ODD.amount, plate: [], focus: null, dim: [], compare: null },
    ...b,
    { ...lastB, say: m('look.oddGreedy', { n: lastB.plate.length }), focus: null, dim: [] },
    { ...lastB, say: m('look.oddBest', { picks: best.join(' + '), n: best.length }), focus: null, dim: [], compare: best },
    { ...lastB, say: m('look.end'), focus: null, dim: [], compare: best },
  ];
}

/** 看的规则：故事是固定的，「再看一次」从头再来 */
const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: (prev) => prev,
  frames: () => lookFrames(),
};

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
export interface RobotPuzzle {
  coins: number[];
  amount: number;
}
export const PUZZLES: RobotPuzzle[] = [
  { coins: [4, 3, 1], amount: 6 },
  { coins: [5, 4, 1], amount: 8 },
  { coins: [10, 7, 1], amount: 14 },
  { coins: [9, 6, 5, 1], amount: 11 },
];

/** 孩子凑好之后的判定：凑齐了没有、比贪心少没有 */
export function judgePuzzle(p: RobotPuzzle, picks: number[]): 'short' | 'over' | 'beat' | 'tie' {
  const s = sum(picks);
  if (s < p.amount) return 'short';
  if (s > p.amount) return 'over';
  return picks.length < greedyPicks(p.coins, p.amount).length ? 'beat' : 'tie';
}

/* ---------- 玩法一：当收银员（游戏状态） ---------- */

export const CUSTOMERS = ['🐰', '🦊', '🐼', '🐱', '🐸', '🦉'];

/**
 * 孩子一枚一枚点硬币放进找零盘，金额一开始就定好。
 * 引导：太大的硬币弹回、摇头；凑齐后数枚数，比最少的多就问「能更少吗？」，
 * 同一个金额再找时，最大能拿的那枚一闪一闪；第一次拿到三颗星后问「每次先拿哪个？」。
 */
export interface CashierGame {
  amount: number;
  customer: string;
  plate: number[];
  /** 同一个金额已经再找了几次 */
  tries: number;
  /** 追问过了没有 */
  asked: boolean;
  quiz: 'ask' | 'right' | 'wrong' | null;
  /** 摇头：[面值, 第几次] */
  shake: [number, number] | null;
}

export type CashierAction =
  | { type: 'tap'; coin: number }
  | { type: 'undo' }
  | { type: 'quiz'; right: boolean }
  | { type: 'retry' }
  | { type: 'next' };

const CASHIER_COINS = desc(KID_COINS);
export const cashierLeft = (g: CashierGame) => g.amount - sum(g.plate);
export const cashierDone = (g: CashierGame) => cashierLeft(g) === 0;
const cashierBest = (g: CashierGame) => minCoins(CASHIER_COINS, g.amount);
const greet = (g: CashierGame): Msg => m('cashier.say.greet', { who: g.customer, amount: g.amount });
const wiggle = (prev: [number, number] | null, coin: number): [number, number] => [coin, (prev?.[1] ?? 0) + 1];

/** 同一个金额第二次找时给提示：最大能拿的那枚一闪一闪 */
export function cashierPulse(g: CashierGame): number | null {
  return g.tries >= 1 && !cashierDone(g) ? greedyNext(CASHIER_COINS, cashierLeft(g)) : null;
}

export const cashierRules: GameRules<CashierGame, CashierAction> = {
  start(rand) {
    const g: CashierGame = { amount: cashierAmount(rand), customer: CUSTOMERS[0], plate: [], tries: 0, asked: false, quiz: null, shake: null };
    return { state: g, say: greet(g) };
  },

  act(g, a, rand) {
    switch (a.type) {
      case 'tap': {
        if (cashierDone(g)) return null;
        const left = cashierLeft(g);
        if (!canTake(left, a.coin)) {
          return { state: { ...g, shake: wiggle(g.shake, a.coin) }, say: m('cashier.say.big', { coin: a.coin, left }), sound: 'wrong' };
        }
        const n: CashierGame = { ...g, plate: [...g.plate, a.coin] };
        if (!cashierDone(n)) return { state: n, say: m('cashier.say.put', { coin: a.coin, left: cashierLeft(n) }), sound: 'right' };
        // 凑齐了
        const used = n.plate.length;
        if (used <= cashierBest(n)) {
          return { state: n.asked ? n : { ...n, asked: true, quiz: 'ask' }, say: m('cashier.say.best', { n: used }), sound: 'win' };
        }
        return { state: n, say: m('cashier.say.more', { n: used }), sound: 'win' };
      }
      case 'undo': {
        if (cashierDone(g) || !g.plate.length) return null;
        const back = g.plate[g.plate.length - 1];
        const n = { ...g, plate: g.plate.slice(0, -1) };
        return { state: n, say: m('cashier.say.undo', { coin: back, left: cashierLeft(n) }) };
      }
      case 'quiz':
        if (g.quiz !== 'ask') return null;
        return { state: { ...g, quiz: a.right ? 'right' : 'wrong' }, sound: a.right ? 'right' : 'wrong' };
      case 'retry':
        if (!cashierDone(g)) return null;
        return { state: { ...g, tries: g.tries + 1, plate: [] }, say: m('cashier.say.retry', { amount: g.amount }) };
      case 'next': {
        if (!cashierDone(g)) return null;
        let amount = g.amount;
        while (amount === g.amount) amount = cashierAmount(rand);
        const n: CashierGame = {
          ...g, amount, customer: CUSTOMERS[(CUSTOMERS.indexOf(g.customer) + 1) % CUSTOMERS.length], plate: [], tries: 0,
          // 追问还没答就留着，答过了（对或错）就收起来
          quiz: g.quiz === 'ask' ? 'ask' : null,
        };
        return { state: n, say: greet(n) };
      }
    }
  },

  clickable: (g) => !cashierDone(g),

  controls(g) {
    if (!cashierDone(g)) {
      return [{ type: 'button', action: { type: 'undo' }, label: m('cashier.undo'), aria: m('cashier.aria.undo'), look: 'small', disabled: !g.plate.length }];
    }
    const out: Control<CashierAction>[] = [];
    const over = g.plate.length > cashierBest(g);
    if (over) out.push({ type: 'button', action: { type: 'retry' }, label: m('cashier.retry'), look: 'primary' });
    out.push({ type: 'button', action: { type: 'next' }, label: m('cashier.next'), look: over ? undefined : 'primary' });
    return out;
  },

  result(g) {
    if (!cashierDone(g)) return null;
    const stars = cashierStars(g.plate.length, cashierBest(g));
    if (g.quiz === 'ask') {
      const choice = (kind: string, right: boolean): Control<CashierAction> => ({
        type: 'button', action: { type: 'quiz', right }, look: 'choice', label: m('cashier.quiz.' + kind), art: { scene: 'MiniCoins', props: { kind } },
      });
      return { stars, quiz: { prompt: m('cashier.quiz.ask'), options: [choice('small', false), choice('any', false), choice('big', true)] } };
    }
    if (g.quiz === 'right') return { stars, quiz: { prompt: m('cashier.quiz.right'), options: [] } };
    if (g.quiz === 'wrong') return { stars, quiz: { prompt: m('cashier.quiz.wrong'), options: [] } };
    return { stars };
  },
};

/* ---------- 玩法二：打败贪心机器人（游戏状态） ---------- */

/**
 * 每关的面值和金额是固定的，机器人 🤖 先用贪心找一遍，孩子要找出比它更少的拿法。
 * phase：robot 机器人在找；me 孩子凑；oops 没赢，盘子晃一下稍等；win 赢了；all 四关都赢了。
 * 没赢时盘子晃一下；没赢两次，最少拿法里的第一枚会透光。
 */
export interface RobotGame {
  level: number;
  phase: 'robot' | 'me' | 'oops' | 'win' | 'all';
  robot: number[];
  plate: number[];
  fails: number;
  won: boolean[];
  shake: [number, number] | null;
  shakePlate: number;
}

export type RobotAction = { type: 'tap'; coin: number } | { type: 'undo' } | { type: 'next' } | { type: 'restart' };

export const robotLeft = (g: RobotGame) => PUZZLES[g.level].amount - sum(g.plate);
export const robotRobotLeft = (g: RobotGame) => PUZZLES[g.level].amount - sum(g.robot);
/** 没赢两次以后，最少拿法里的第一枚透光 */
export function robotGlow(g: RobotGame): number | null {
  if (g.phase !== 'me' || g.fails < 2) return null;
  const p = PUZZLES[g.level];
  return bestPicks(p.coins, p.amount)![0];
}

/** 开始（或重新开始）这一关：机器人先找 */
function robotBegin(g: Pick<RobotGame, 'level' | 'won' | 'shake' | 'shakePlate'>): Outcome<RobotGame> {
  return {
    state: { level: g.level, won: g.won, shake: g.shake, shakePlate: g.shakePlate, phase: 'robot', robot: [], plate: [], fails: 0 },
    say: m('robot.say.start', { amount: PUZZLES[g.level].amount }),
    sound: 'tick',
    after: PAUSE_LONG,
  };
}

export const robotRules: GameRules<RobotGame, RobotAction> = {
  start: () => robotBegin({ level: 0, won: PUZZLES.map(() => false), shake: null, shakePlate: 0 }),

  act(g, a) {
    switch (a.type) {
      case 'tap': {
        if (g.phase !== 'me') return null;
        const p = PUZZLES[g.level];
        const left = robotLeft(g);
        if (!canTake(left, a.coin)) {
          return { state: { ...g, shake: [a.coin, (g.shake?.[1] ?? 0) + 1] }, say: m('robot.say.big', { coin: a.coin, left }), sound: 'wrong' };
        }
        const n: RobotGame = { ...g, plate: [...g.plate, a.coin] };
        if (robotLeft(n) > 0) return { state: n, say: m('robot.say.put', { coin: a.coin, left: robotLeft(n) }), sound: 'right' };
        const used = n.plate.length;
        if (judgePuzzle(p, n.plate) === 'beat') {
          return {
            state: { ...n, phase: 'win', won: g.won.map((w, k) => w || k === g.level) },
            say: m('robot.say.win', { n: used, r: g.robot.length }),
            sound: 'win',
          };
        }
        return {
          state: { ...n, fails: g.fails + 1, shakePlate: g.shakePlate + 1, phase: 'oops' },
          say: m('robot.say.oops', { n: used, r: g.robot.length }),
          sound: 'wrong',
          after: PAUSE_RETRY,
        };
      }
      case 'undo': {
        if (g.phase !== 'me' || !g.plate.length) return null;
        const back = g.plate[g.plate.length - 1];
        const n = { ...g, plate: g.plate.slice(0, -1) };
        return { state: n, say: m('robot.say.undo', { coin: back, left: robotLeft(n) }) };
      }
      case 'next':
        if (g.phase !== 'win') return null;
        if (g.level >= PUZZLES.length - 1) return { state: { ...g, phase: 'all' }, say: m('robot.say.all', { n: PUZZLES.length }), sound: 'win' };
        return robotBegin({ ...g, level: g.level + 1 });
      case 'restart':
        if (g.phase !== 'all') return null;
        return robotBegin({ ...g, level: 0, won: PUZZLES.map(() => false) });
    }
  },

  tick(g): Outcome<RobotGame> {
    if (g.phase === 'robot') {
      const p = PUZZLES[g.level];
      const picks = greedyPicks(p.coins, p.amount);
      const k = g.robot.length;
      if (k >= picks.length) return { state: { ...g, phase: 'me' }, say: m('robot.say.used', { n: picks.length }) };
      const n = { ...g, robot: [...g.robot, picks[k]] };
      return { state: n, say: m('robot.say.took', { coin: picks[k], left: robotRobotLeft(n) }), sound: 'tick', after: PAUSE_MID };
    }
    if (g.phase === 'oops') {
      return { state: { ...g, plate: [], phase: 'me' }, say: g.fails >= 2 ? m('robot.say.glow') : undefined };
    }
    return { state: g };
  },

  // 切标签时：机器人还没找完就从头再找（这样回到「玩」时能看到它找），晃盘子的等待直接结束
  interrupt(g) {
    if (g.phase === 'robot') return robotBegin(g);
    if (g.phase === 'oops') return robotRules.tick!(g);
    return { state: g };
  },

  clickable: (g) => g.phase === 'me',

  controls(g) {
    if (g.phase === 'me') return [{ type: 'button', action: { type: 'undo' }, label: m('cashier.undo'), aria: m('cashier.aria.undo'), look: 'small', disabled: !g.plate.length }];
    if (g.phase === 'win') {
      return [{ type: 'button', action: { type: 'next' }, label: m(g.level < PUZZLES.length - 1 ? 'robot.nextLevel' : 'robot.finish'), look: 'primary' }];
    }
    if (g.phase === 'all') return [{ type: 'button', action: { type: 'restart' }, label: m('robot.again'), look: 'primary' }];
    return [];
  },

  result: (g) => (g.phase === 'all' ? { quiz: { prompt: m('robot.all.q'), options: [] } } : null),
};

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
  /** 'running' 还在跑；'ok' 正常返回（找bug时结果可能是错的）；'stuck' 判定为死循环 */
  outcome: 'running' | 'ok' | 'stuck';
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

/** 「做」里随机一个金额 */
export function randomAmount(rand: () => number = Math.random): number {
  return 10 + Math.floor(rand() * 90);
}

const listText = (a: number[]) => '[' + a.join(', ') + ']';

export function buildTrace(coins: number[], amount: number): Trace<GreedyStep> {
  const steps: GreedyStep[] = [];
  let sorted: number[] = [];
  let c: number | null = null;
  let left: number | null = null;
  let picked: number[] = [];
  const push = (line: number, note: Msg, done = false) => {
    steps.push({ line, note, done, outcome: done ? 'ok' : 'running', sorted, c, left, picked });
  };

  sorted = [...coins].sort((a, b) => b - a);
  push(2, m('trace.note.sorted', { list: listText(sorted) }));
  push(3, m('trace.note.picked'));
  left = amount;
  push(4, m('trace.note.left0', { amount }));
  for (const coin of sorted) {
    c = coin;
    push(5, m('trace.note.see', { c }));
    for (;;) {
      if (left >= c) {
        push(6, m('trace.note.fit', { left, c }));
        picked = [...picked, c];
        push(7, m('trace.note.put', { c, n: picked.length }));
        left -= c;
        push(8, m('trace.note.sub', { a: left + c, c, left }));
      } else {
        push(6, m('trace.note.big', { left, c }));
        break;
      }
    }
  }
  c = null;
  push(11, left === 0
    ? m('trace.note.retOk', { list: listText(picked), n: picked.length })
    : m('trace.note.retShort', { list: listText(picked), left }), true);
  return steps;
}

/** 逐步执行面板的输入：哪一套面值和金额 */
export interface TraceInput {
  sys: string;
  amount: number;
}

export type TraceAction = { type: 'sys'; id: string } | { type: 'amount'; n: number } | { type: 'random' } | { type: 'odd' };

/** 金额最多填多少 */
export const TRACE_MAX = 200;

export const traceCoins = (input: TraceInput) => SYSTEMS.find((s) => s.id === input.sys)!.coins;

/** 做：逐步执行。面值、剩余金额、每种拿了几枚和代码行同步 */
export const traceRules: TraceRules<TraceInput, GreedyStep, TraceAction> = {
  code: CODE,
  start: () => ({ sys: SYSTEMS[0].id, amount: 46 }),
  act(input, a, rand) {
    switch (a.type) {
      case 'sys': return { ...input, sys: a.id };
      case 'amount': return a.n >= 0 && a.n <= TRACE_MAX ? { ...input, amount: a.n } : input;
      case 'random': return { ...input, amount: randomAmount(rand) };
      case 'odd': return { sys: 'odd', amount: 6 };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.sys'), value: input.sys,
      options: SYSTEMS.map((s) => ({ value: s.id, label: m('trace.sys.' + s.id) })),
      choose: (v) => ({ type: 'sys', id: String(v) }),
    },
    { type: 'number', label: m('trace.amount', { max: TRACE_MAX }), value: input.amount, min: 0, max: TRACE_MAX, submit: (n) => ({ type: 'amount', n }) },
    {
      type: 'group', legend: m('trace.quick'),
      items: [
        { type: 'button', action: { type: 'random' }, label: m('trace.random'), look: 'small' },
        { type: 'button', action: { type: 'odd' }, label: m('trace.odd'), look: 'small' },
      ],
    },
  ],
  trace: (input) => buildTrace(traceCoins(input), input.amount),
  vars: (input, s): Var[] => [['amount', input.amount], ['c', s.c ?? '—'], ['left', s.left ?? '—'], ['picked', m('trace.n', { n: s.picked.length })]],
  summary(input, s) {
    if (!s.done) return null;
    const g = s.picked.length;
    const b = bestPicks(traceCoins(input), input.amount)!;
    return g === b.length ? m('trace.summary.same', { g, b: b.length }) : m('trace.summary.diff', { g, picks: b.join(' + '), b: b.length });
  },
  jump: { label: m('trace.jump'), stop: (x) => x.done },
};

/* ---------- 做：猜下一步 ---------- */

/** 每一种拿过的面值是一道题：剩下 left 时拿哪一种、拿几枚 */
export interface Round {
  left: number;
  coin: number;
  count: number;
  /** 「拿几枚」的四个选项：正确答案和它附近的数 */
  options: number[];
  /** 拿几枚答错时的解释 */
  why: Msg;
}

/** 拿几枚的四个选项：正确答案和它附近的数 */
export function countOptions(n: number): number[] {
  const set = new Set([n]);
  for (const d of [1, -1, 2, -2, 3]) {
    if (set.size >= 4) break;
    if (n + d >= 1) set.add(n + d);
  }
  return [...set].sort((a, b) => a - b);
}

/** 点错面值时的解释：拿大了，或者还有更大的能拿 */
export function whyCoin(r: Round, picked: number): Msg {
  return picked > r.left
    ? m('why.big', { picked, left: r.left, coin: r.coin })
    : m('why.small', { picked, left: r.left, coin: r.coin });
}

export function rounds(coins: number[], amount: number): Round[] {
  const out: Round[] = [];
  let left = amount;
  for (const c of desc(coins)) {
    if (c > left) continue;
    const count = Math.floor(left / c);
    const rest = left - count * c;
    out.push({ left, coin: c, count, options: countOptions(count), why: m('why.count', { left, c, count, rest }) });
    left -= count * c;
  }
  return out;
}

/** 猜下一步每次出一道新题：随机一套面值和金额 */
export function genPredict(rand: () => number = Math.random): { coins: number[]; amount: number } {
  const sys = SYSTEMS[Math.floor(rand() * SYSTEMS.length)];
  return { coins: desc(sys.coins), amount: 20 + Math.floor(rand() * 180) };
}

/** 猜下一步画面的样子：面值一排，已经拿的（面值 × 枚数），已经点对的面值（拿几枚那一问时） */
export interface PredictView {
  coins: number[];
  plate: { coin: number; count: number }[];
  chosen: number | null;
}

/** 把一道题排成一问接一问：每一轮先点出下一枚拿哪种面值，再选这种拿几枚 */
export function makePuzzle(coins: number[], amount: number): Puzzle<PredictView, number> {
  const list = rounds(coins, amount);
  const plate: { coin: number; count: number }[] = [];
  const asks = list.flatMap((r) => {
    const before = [...plate];
    plate.push({ coin: r.coin, count: r.count });
    const chips: Var[] = [['amount', amount], ['left', r.left]];
    return [
      {
        view: { coins, plate: before, chosen: null }, prompt: m('predict.coin', { left: r.left }), kind: 'pick' as const, answer: r.coin,
        // 点错的解释随点的面值而变（whyFor），why 只是占位
        why: whyCoin(r, r.coin), whyFor: (c: number) => whyCoin(r, c), chips,
      },
      {
        view: { coins, plate: before, chosen: r.coin }, prompt: m('predict.count', { left: r.left, c: r.coin }), kind: 'choose' as const, answer: r.count, chips,
        options: r.options.map((n) => ({ value: n, label: m('trace.n', { n }) })), why: r.why,
      },
    ];
  });
  const total = sum(list.map((r) => r.count));
  return {
    asks,
    end: { view: { coins, plate: [...plate], chosen: null }, prompt: m('predict.end', { n: total }), chips: [['amount', amount], ['left', 0]] },
  };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: 5,
  puzzle(rand = Math.random) {
    const q = genPredict(rand);
    return makePuzzle(q.coins, q.amount);
  },
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'ascending' | 'if' | 'reset';
  coins: number[];
  amount: number;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'ascending',
    title: m('bug.ascending.title'),
    code: variant(2, '    val sorted = coins.sorted()'),
    wrongLine: 2,
    fixed: '    val sorted = coins.sortedDescending()',
    coins: [1, 2, 5, 10],
    amount: 12,
    expect: m('bug.ascending.expect'),
    explain: m('bug.ascending.explain'),
  },
  {
    id: 'if',
    title: m('bug.if.title'),
    code: variant(6, '        if (left >= c) {'),
    wrongLine: 6,
    fixed: '        while (left >= c) {',
    coins: [1, 2, 5, 10],
    amount: 27,
    expect: m('bug.if.expect'),
    explain: m('bug.if.explain'),
  },
  {
    id: 'reset',
    title: m('bug.reset.title'),
    code: variant(8, '            left = amount - c'),
    wrongLine: 8,
    fixed: '            left -= c',
    coins: [1, 2, 5, 10],
    amount: 27,
    expect: m('bug.reset.expect'),
    explain: m('bug.reset.explain'),
  },
];

/**
 * 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号。
 * 在 while 判断处，（面值，left）重复出现就判定为死循环。
 */
export function runBug(bug: Bug): Trace<GreedyStep> {
  const steps: GreedyStep[] = [];
  let sorted: number[] = [];
  let c: number | null = null;
  let left: number | null = null;
  let picked: number[] = [];
  const push = (line: number, note: Msg, outcome: GreedyStep['outcome'] = 'running') => {
    steps.push({ line, note, done: outcome !== 'running', outcome, sorted, c, left, picked });
  };

  sorted = bug.id === 'ascending' ? [...bug.coins].sort((a, b) => a - b) : [...bug.coins].sort((a, b) => b - a);
  push(2, m(bug.id === 'ascending' ? 'bug.note.sortedAsc' : 'bug.note.sortedDesc', { list: listText(sorted) }));
  push(3, m('bug.note.picked'));
  left = bug.amount;
  push(4, m('trace.note.left0', { amount: left }));
  const seen = new Set<string>();
  for (const coin of sorted) {
    c = coin;
    push(5, m('trace.note.see', { c }));
    for (;;) {
      const key = c + ',' + left;
      if (seen.has(key)) {
        push(6, m('bug.note.stuck', { c, left }), 'stuck');
        return steps;
      }
      seen.add(key);
      if (left < c) {
        push(6, m('bug.note.next', { left, c }));
        break;
      }
      push(6, m('bug.note.take', { left, c }));
      picked = [...picked, c];
      push(7, m('bug.note.put', { c, n: picked.length }));
      if (bug.id === 'reset') {
        left = bug.amount - c;
        push(8, m('bug.note.reset', { amount: bug.amount, c, left }));
      } else {
        left -= c;
        push(8, m('bug.note.sub', { left }));
      }
      if (bug.id === 'if') {
        push(9, m('bug.note.if'));
        break;
      }
    }
  }
  c = null;
  push(11, m('bug.note.ret', { list: listText(picked), n: picked.length, total: sum(picked) }), 'ok');
  return steps;
}

/** 找 bug 面板底部的判定：没跑完是空，跑完按结果说话 */
export function bugVerdict(step: GreedyStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'stuck') return m('bug.verdict.stuck');
  const total = sum(step.picked);
  return total !== bug.amount
    ? m('bug.verdict.short', { total, diff: bug.amount - total })
    : m('bug.verdict.many', { n: step.picked.length });
}

const bugRules: BugRules<Bug, GreedyStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { coins: bug.coins.join(', '), amount: bug.amount, expect: bug.expect }),
  vars: (s, bug): Var[] => [['amount', bug.amount], ['c', s.c ?? '—'], ['left', s.left ?? '—'], ['picked', m('trace.n', { n: s.picked.length })]],
  verdict: bugVerdict,
  jump: { label: m('trace.jump'), stop: (x) => x.done },
};

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
export const CHALLENGE: { coins: number[]; note: Msg }[] = [
  { coins: [1, 5, 10, 25], note: m('chal.note.0') },
  { coins: [1, 3, 4], note: m('chal.note.1') },
  { coins: [1, 2, 5, 10, 20, 50], note: m('chal.note.2') },
  { coins: [1, 5, 10, 20, 25], note: m('chal.note.3') },
  { coins: [1, 3, 6, 12, 24, 30], note: m('chal.note.4') },
  { coins: [1, 2, 4, 8, 16, 32], note: m('chal.note.5') },
];

/**
 * 挑战的状态：每套面值先判断贪心是不是对每个金额都拿到最少，答完用动态规划揭晓。
 * answers[k] 是第 k 题孩子的回答（true 是「总是最少」），没答是 null。
 */
export interface ChallengeGame {
  k: number;
  answers: (boolean | null)[];
}

export type ChallengeAction = { type: 'answer'; alwaysBest: boolean } | { type: 'next' } | { type: 'restart' };

const fresh = (): ChallengeGame => ({ k: 0, answers: CHALLENGE.map(() => null) });
const truthOf = (k: number) => counterexample(CHALLENGE[k].coins);
const rightAt = (g: ChallengeGame, k: number) => g.answers[k] !== null && g.answers[k] === (truthOf(k) === null);
export const challengeScore = (g: ChallengeGame) => g.answers.filter((_, k) => rightAt(g, k)).length;
export const challengeFinished = (g: ChallengeGame) => g.answers.every((a) => a !== null);

/** 答完这一题以后的揭晓：对错，加动态规划查出的结果。还没答返回 null */
export function challengeReveal(g: ChallengeGame): { verdict: Msg; text: Msg } | null {
  if (g.answers[g.k] === null) return null;
  const truth = truthOf(g.k);
  const verdict = m(rightAt(g, g.k) ? 'chal.right' : 'chal.wrong');
  if (truth) {
    return {
      verdict,
      text: m('chal.found', { amount: truth.amount, greedy: truth.greedy.join(' + '), gn: truth.greedy.length, best: truth.best.join(' + '), bn: truth.best.length }),
    };
  }
  const limit = checkLimit(CHALLENGE[g.k].coins);
  return { verdict, text: m('chal.none', { upto: limit - 1, limit }) };
}

export const challengeRules: GameRules<ChallengeGame, ChallengeAction> = {
  start: () => ({ state: fresh() }),

  act(g, a) {
    switch (a.type) {
      case 'answer':
        if (g.answers[g.k] !== null) return null;
        return { state: { ...g, answers: g.answers.map((x, k) => (k === g.k ? a.alwaysBest : x)) } };
      case 'next':
        return g.answers[g.k] !== null && g.k < CHALLENGE.length - 1 ? { state: { ...g, k: g.k + 1 } } : null;
      case 'restart':
        return challengeFinished(g) ? { state: fresh() } : null;
    }
  },

  clickable: () => false,

  controls(g) {
    if (challengeFinished(g)) return [{ type: 'button', action: { type: 'restart' }, label: m('chal.restart'), look: 'small' }];
    if (g.answers[g.k] === null) {
      return [
        { type: 'button', action: { type: 'answer', alwaysBest: true }, label: m('chal.yes'), look: 'small' },
        { type: 'button', action: { type: 'answer', alwaysBest: false }, label: m('chal.no'), look: 'small' },
      ];
    }
    return [{ type: 'button', action: { type: 'next' }, label: m('chal.next'), look: 'smallPrimary' }];
  },

  hud: (g) => ({ chips: [[m('chal.chipQ'), m('chal.qOf', { k: g.k + 1, n: CHALLENGE.length })], [m('chal.chipRight'), challengeScore(g)]] }),

  result(g) {
    if (!challengeFinished(g)) return null;
    const score = challengeScore(g);
    return {
      title: score === CHALLENGE.length ? m('chal.perfect') : m('chal.score', { score, n: CHALLENGE.length }),
      body: m('chal.body'),
    };
  },
};

/* ---------- 延伸 ---------- */

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

/** 延伸 Markdown 里 <!-- code:名字 --> 要放的代码 */
export const moreCode: Record<string, string[]> = { dp: DP_CODE };

/** 「快，但不一定对」的对比图：6 种面值，贪心每种面值算一次，动态规划每个金额 × 每种面值算一次（对数刻度画） */
export function compareRows() {
  const K = 6;
  return [
    { label: '100', unit: m('compare.hundred'), n: 100 },
    { label: '10,000', unit: m('compare.tenK'), n: 10000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.greedy'), value: K, tone: 'accent' as const },
      { name: m('compare.dp'), value: K * r.n, tone: 'muted' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { cashier: cashierRules, robot: robotRules, challenge: challengeRules },
};
