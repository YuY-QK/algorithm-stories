import { m } from '../core/i18n';
import { FOLLOW_END, FOLLOW_STEP, PAUSE_SHORT } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, PredictRules, Puzzle, Rand, Step, Trace,
  TraceRules, Var,
} from '../core/types';

/* ---------- 看、玩：小动物排队合并 ---------- */

/** 小动物：id 是它一开始排在第几个（决定模样），身高是它的值 */
export const KIDS = ['🐶', '🐱', '🐰', '🐻', '🐼', '🦊', '🐸', '🐵', '🐯', '🦁'] as const;
export const kidOf = (id: number) => KIDS[id % KIDS.length];

/** 花色只用来区分点数相同的两个元素（看稳定性），按 id 轮流取 */
export const SUITS = ['♥', '♠', '♣', '♦'] as const;
export const suitOf = (id: number) => SUITS[id % SUITS.length];

/** 「看」用的一队小动物（身高），和 story.md 里的数字一致 */
export const STORY_KIDS = [5, 2, 6, 1, 4, 3];

/** 对半分：左半 [lo, mid)，右半 [mid, hi)。奇数个时右边多一个 */
export const halve = (size: number) => Math.floor(size / 2);

const sortIds = (ids: number[], values: number[]) => [...ids].sort((a, b) => values[a] - values[b] || a - b);

export interface LookPage extends LookFrame {
  /** 这一队小动物的身高，下标是小动物的 id（画面用它算柱子高度） */
  values: number[];
  /** 上排：一队一队的小动物（id），队内从左到右就是队头到队尾 */
  queues: number[][];
  /** 下排：正在合成的新队伍；null 表示没有这一排 */
  out: number[] | null;
  /** 正在比身高的两个队头 */
  cmp: [number, number] | null;
  /** 刚走进新队伍的那一个 */
  moved: number | null;
  /** 哪几队是刚合成的（queues 的下标） */
  fresh: number[];
}

/**
 * 「看」的绘本画面，分两章：
 * 一、前一半和后一半各自排好队，合成一队（每次比两个队头）；
 * 二、这两队是怎么排好的：一直对半分到每队一个，再两两合并回去。
 * 真的按归并排序的过程生成。
 */
export function lookFrames(values: number[]): LookPage[] {
  const n = values.length;
  const v = (id: number) => values[id];
  const ids = values.map((_, id) => id);
  const mid = halve(n);
  const left = sortIds(ids.slice(0, mid), values);
  const right = sortIds(ids.slice(mid), values);
  const out: LookPage[] = [];
  const push = (say: Msg, extra: Partial<LookPage>) =>
    out.push({ say, values, queues: [], out: null, cmp: null, moved: null, fresh: [], ...extra });

  // 第一章：合并两队
  const l = [...left];
  const r = [...right];
  const o: number[] = [];
  push(m('look.sorted'), { queues: [[...l], [...r]] });
  push(m('look.merge'), { queues: [[...l], [...r]], out: [] });
  let compares = 0;
  while (l.length && r.length) {
    const a = l[0];
    const b = r[0];
    compares++;
    const takeLeft = v(a) <= v(b);
    const w = takeLeft ? l.shift()! : r.shift()!;
    o.push(w);
    push(m('look.cmp', { a: v(a), b: v(b), w: v(w) }), { queues: [[...l], [...r]], out: [...o], cmp: [a, b], moved: w });
  }
  if (l.length || r.length) {
    o.push(...l, ...r);
    push(m(l.length ? 'look.rest.r' : 'look.rest.l'), { queues: [[], []], out: [...o] });
  }
  push(m('look.done', { n: compares }), { queues: [], out: [...o] });

  // 第二章：往回倒，看这两队怎么排好的
  type Node = [number, number];
  const levels: Node[][] = [[[0, n]]];
  while (levels.at(-1)!.some(([a, b]) => b - a > 1)) {
    levels.push(levels.at(-1)!.flatMap(([a, b]): Node[] => {
      if (b - a <= 1) return [[a, b]];
      const m = a + halve(b - a);
      return [[a, m], [m, b]];
    }));
  }
  const shapes = (lv: Node[]) => lv.map(([a, b]) => ids.slice(a, b));
  push(m('look.back'), { queues: shapes(levels[0]) });
  for (let d = 1; d < levels.length; d++) {
    const last = d === levels.length - 1;
    push(last ? m('look.ones') : m('look.split.' + Math.min(d - 1, 2)), { queues: shapes(levels[d]) });
  }
  for (let d = levels.length - 2; d >= 0; d--) {
    const lv = levels[d];
    const fresh = lv.map(([a, b], x) => (b - a > 1 ? x : -1)).filter((x) => x >= 0);
    push(d === 0 ? m('look.last') : m('look.pairs'), {
      queues: lv.map(([a, b]) => sortIds(ids.slice(a, b), values)),
      fresh,
    });
  }
  return out;
}

/** 「换一队再看一次」发的小动物：STORY_N 个，身高 1 到 STORY_N，顺序打乱 */
export const STORY_N = 6;
export function genStory(rand: () => number = Math.random): number[] {
  return dealKids(STORY_N, rand, STORY_N);
}

const lookRules: LookRules<number[], LookPage> = {
  first: STORY_KIDS,
  next: (_prev, rand) => genStory(rand),
  frames: lookFrames,
};

/** 发牌：n 个身高各不相同的小动物（1 到 max），顺序打乱 */
export function dealKids(n: number, rand: () => number = Math.random, max = 9): number[] {
  const pool = Array.from({ length: max }, (_, k) => k + 1);
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(rand() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }
  return pool.slice(0, n);
}

/* 玩法一：合并两队 */

export interface TwoQueues {
  left: number[];
  right: number[];
}

/** 每次该从哪一队走：两队队头比身高，矮的先走（相等取左）。只记比较阶段，一队走完后剩下的直接跟上 */
export function pickOrder(left: number[], right: number[]): ('L' | 'R')[] {
  const out: ('L' | 'R')[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      out.push('L');
      i++;
    } else {
      out.push('R');
      j++;
    }
  }
  return out;
}

/** 发两队已经排好的小动物：各 3 到 4 个，身高互不相同，而且左右队头会来回换几次，不会一边先走光 */
export function dealQueues(rand: () => number = Math.random): TwoQueues {
  for (;;) {
    const a = 3 + Math.floor(rand() * 2);
    const b = 3 + Math.floor(rand() * 2);
    const pool = dealKids(a + b, rand);
    const left = pool.slice(0, a).sort((x, y) => x - y);
    const right = pool.slice(a).sort((x, y) => x - y);
    const order = pickOrder(left, right);
    let switches = 0;
    for (let k = 1; k < order.length; k++) if (order[k] !== order[k - 1]) switches++;
    if (switches >= 3) return { left, right };
  }
}

/** 孩子点了某一队的队头：矮的才对。picked 是被点的，other 是另一队队头 */
export function judgeHeads(left: number[], right: number[], side: 'L' | 'R') {
  const picked = side === 'L' ? left[0] : right[0];
  const other = side === 'L' ? right[0] : left[0];
  return { ok: picked <= other, picked, other };
}

/* 玩法二：拆一拆 */

export interface Piece {
  start: number;
  size: number;
}

/** 孩子在一队 size 个里的第 at 个后面切一刀（at 从 1 到 size - 1）。对半分才对 */
export function judgeCut(size: number, at: number) {
  return { ok: at === halve(size), left: at, right: size - at };
}

/** 这一排每队都对半切完以后，下一排的样子 */
export function nextRow(row: Piece[]): Piece[] {
  return row.flatMap((p): Piece[] => {
    if (p.size <= 1) return [p];
    const h = halve(p.size);
    return [{ start: p.start, size: h }, { start: p.start + h, size: p.size - h }];
  });
}

/** 从 n 个一直对半分到每队 1 个，要分几轮 */
export function splitRounds(n: number): number {
  let rounds = 0;
  let row: Piece[] = [{ start: 0, size: n }];
  while (row.some((p) => p.size > 1)) {
    row = nextRow(row);
    rounds++;
  }
  return rounds;
}

/** 玩法的星星：一次都没错三颗，错两次以内两颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/** 选择题的三个选项：正确答案和它附近的两个数，从小到大 */
export function countChoices(answer: number): number[] {
  const set = new Set([answer]);
  for (const d of [1, -1, 2, -2, 3]) {
    if (set.size >= 3) break;
    if (answer + d >= 1) set.add(answer + d);
  }
  return [...set].sort((a, b) => a - b);
}

/* ---------- 玩法一：合并两队（GameRules） ---------- */

export interface MergeGame {
  /** 每只小动物的身高，下标就是 id */
  values: number[];
  left: number[];
  right: number[];
  out: number[];
  mistakes: number;
  /** pick：等孩子点；tail：一队走光了，剩下的自动跟上；done：合成一队了 */
  phase: 'pick' | 'tail' | 'done';
  moved: number | null;
  /** 透光提示：更矮的那个队头 */
  glow: number | null;
  /** 点错的小动物摇一下，格式 [id, 计数] */
  shake: [number, number] | null;
}

export type MergeAction = { type: 'pick'; side: 'L' | 'R' } | { type: 'again' };

function freshMerge(rand?: Rand): MergeGame {
  const q = dealQueues(rand);
  return {
    values: [...q.left, ...q.right],
    left: q.left.map((_, k) => k),
    right: q.right.map((_, k) => q.left.length + k),
    out: [],
    mistakes: 0,
    phase: 'pick',
    moved: null,
    glow: null,
    shake: null,
  };
}

/** 队头 id 走进新队伍 */
function goMerge(g: MergeGame, side: 'L' | 'R'): MergeGame {
  const src = side === 'L' ? g.left : g.right;
  const id = src[0];
  return { ...g, left: side === 'L' ? g.left.slice(1) : g.left, right: side === 'R' ? g.right.slice(1) : g.right, out: [...g.out, id], moved: id };
}

export const mergeRules: GameRules<MergeGame, MergeAction> = {
  start: (rand) => ({ state: freshMerge(rand), say: m('merge.say.start') }),
  act(g, a, rand) {
    if (a.type === 'again') return g.phase === 'done' ? { state: freshMerge(rand), say: m('merge.say.start') } : null;
    if (g.phase !== 'pick') return null;
    const vals = (ids: number[]) => ids.map((id) => g.values[id]);
    const j = judgeHeads(vals(g.left), vals(g.right), a.side);
    const pickedId = a.side === 'L' ? g.left[0] : g.right[0];
    const otherId = a.side === 'L' ? g.right[0] : g.left[0];
    if (!j.ok) {
      // 点错了不说错：被点的摇一摇，更矮的那个透出光，让孩子自己再比一比
      return {
        state: { ...g, mistakes: g.mistakes + 1, shake: [pickedId, (g.shake?.[1] ?? 0) + 1], glow: otherId },
        say: m('merge.say.compare', { a: j.picked, b: j.other }),
        sound: 'wrong',
      };
    }
    const next = goMerge({ ...g, glow: null }, a.side);
    if (next.left.length && next.right.length) {
      return { state: next, say: m('merge.say.next', { a: j.picked, b: j.other }), sound: 'right' };
    }
    // 一队走光了：另一队剩下的自动跟上；两队同时走光（不会发生）就直接结束
    const rest = next.left.length ? 'L' : next.right.length ? 'R' : null;
    if (!rest) return { state: { ...next, phase: 'done', moved: null }, say: m('merge.say.done'), sound: 'win' };
    return { state: { ...next, phase: 'tail' }, say: m(rest === 'L' ? 'merge.say.tailR' : 'merge.say.tailL'), sound: 'right', after: FOLLOW_STEP };
  },
  tick(g) {
    const rest = g.left.length ? 'L' : g.right.length ? 'R' : null;
    if (!rest) return { state: { ...g, phase: 'done', moved: null }, say: m('merge.say.done'), sound: 'win' };
    const next = goMerge(g, rest);
    return { state: next, after: next.left.length || next.right.length ? FOLLOW_STEP : FOLLOW_END };
  },
  // 切换标签时剩下的小动物还没跟完：重新开一局
  interrupt: (g) => (g.phase === 'tail' ? { state: freshMerge(), say: m('merge.say.start') } : { state: g }),
  clickable: (g) => g.phase === 'pick',
  controls: (g): Control<MergeAction>[] =>
    g.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('again'), look: 'primary' }] : [],
  result: (g) => (g.phase === 'done' ? { stars: stars(g.mistakes), body: m('merge.done') } : null),
};

/* ---------- 玩法二：拆一拆（GameRules） ---------- */

export interface SplitGame {
  /** 这是第几局（决定 4 个还是 8 个） */
  games: number;
  n: number;
  /** 一排一排的队伍，最后一排是正在切的 */
  rows: Piece[][];
  /** 每一排已经切下去的位置（下标 g 表示在 g 前面切一刀） */
  cuts: number[][];
  phase: 'cut' | 'ask' | 'done';
  /** 这一排切完了，等一下翻到下一排 */
  waiting: boolean;
  mistakes: number;
  /** 切歪的那一刀：哪一队、切在哪、这一队已经歪了几次 */
  probe: { start: number; at: number; misses: number } | null;
  /** 答错的那个选项，加答错的次数（按钮晃一下） */
  wrong: [number, number] | null;
  /** 显示「第几轮」 */
  hintNums: boolean;
}

export type SplitAction = { type: 'cut'; start: number; at: number } | { type: 'answer'; c: number } | { type: 'again' };

function freshSplit(games: number): SplitGame {
  const n = games % 2 === 0 ? 8 : 4;
  return {
    games: games + 1, n, rows: [[{ start: 0, size: n }]], cuts: [[]], phase: 'cut', waiting: false,
    mistakes: 0, probe: null, wrong: null, hintNums: false,
  };
}

/** 这一队在这一排有没有切过；切在哪 */
export const cutAt = (cuts: number[], p: Piece): number | undefined => cuts.find((g) => g > p.start && g < p.start + p.size);

/** 这一局一共要分几轮 */
export const splitTotal = (g: SplitGame) => splitRounds(g.n);

export const splitRules: GameRules<SplitGame, SplitAction> = {
  start: () => ({ state: freshSplit(0), say: m('split.say.start') }),
  act(g, a) {
    if (a.type === 'again') return g.phase === 'done' ? { state: freshSplit(g.games), say: m('split.say.start') } : null;
    if (a.type === 'answer') {
      if (g.phase !== 'ask') return null;
      const total = splitTotal(g);
      if (a.c !== total) {
        return {
          state: { ...g, mistakes: g.mistakes + 1, wrong: [a.c, (g.wrong?.[1] ?? 0) + 1], hintNums: true },
          say: m('split.say.count'),
          sound: 'wrong',
        };
      }
      return { state: { ...g, phase: 'done', hintNums: true }, say: m('split.say.win', { n: g.n, rounds: total }), sound: 'win' };
    }
    if (g.phase !== 'cut' || g.waiting) return null;
    const live = g.rows.length - 1;
    const p = g.rows[live].find((q) => q.start === a.start);
    if (!p || p.size <= 1 || cutAt(g.cuts[live], p) !== undefined) return null;
    const j = judgeCut(p.size, a.at);
    if (!j.ok) {
      const prev = g.probe && g.probe.start === p.start ? g.probe.misses : 0;
      return {
        state: { ...g, mistakes: g.mistakes + 1, probe: { start: p.start, at: a.at, misses: prev + 1 } },
        say: m('split.say.uneven', { l: j.left, r: j.right }),
        sound: 'wrong',
      };
    }
    const cuts = g.cuts.map((c, r) => (r === live ? [...c, p.start + a.at] : c));
    const row = g.rows[live];
    const state = { ...g, probe: null, cuts };
    const say = m('split.say.cut', { l: j.left, r: j.right });
    if (row.every((q) => q.size <= 1 || cutAt(cuts[live], q) !== undefined)) {
      return { state: { ...state, waiting: true }, say, sound: 'right', after: PAUSE_SHORT };
    }
    return { state, say, sound: 'right' };
  },
  // 这一排切完了：翻到下一排；每队都只剩 1 个就问一共分了几轮
  tick(g) {
    const rows = [...g.rows, nextRow(g.rows[g.rows.length - 1])];
    const state: SplitGame = { ...g, rows, cuts: [...g.cuts, []], waiting: false };
    if (rows[rows.length - 1].every((q) => q.size <= 1)) return { state: { ...state, phase: 'ask' }, say: m('split.say.ask'), sound: 'tick' };
    return { state, say: m('split.say.again'), sound: 'tick' };
  },
  interrupt: (g) => (g.phase === 'cut' && g.waiting ? { state: freshSplit(g.games), say: m('split.say.start') } : { state: g }),
  clickable: (g) => g.phase === 'cut' && !g.waiting,
  controls: (g): Control<SplitAction>[] =>
    g.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('again'), look: 'primary' }] : [],
  result: (g) => {
    if (g.phase !== 'done') return null;
    return {
      stars: stars(g.mistakes),
      body: m('split.done', {
        chain: g.rows.map((r) => r[0].size).join(' → '), n: g.n, rounds: splitTotal(g),
        next: m('split.next', { n: g.n === 8 ? 4 : 8 }),
      }),
    };
  },
};

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun mergeSort(a: IntArray, lo: Int = 0, hi: Int = a.size) {',
  '    if (hi - lo <= 1) return',
  '    val mid = (lo + hi) / 2',
  '    mergeSort(a, lo, mid)',
  '    mergeSort(a, mid, hi)',
  '    val tmp = IntArray(hi - lo)',
  '    var i = lo',
  '    var j = mid',
  '    var k = 0',
  '    while (i < mid && j < hi) {',
  '        if (a[i] <= a[j]) tmp[k++] = a[i++]',
  '        else tmp[k++] = a[j++]',
  '    }',
  '    while (i < mid) tmp[k++] = a[i++]',
  '    while (j < hi) tmp[k++] = a[j++]',
  '    tmp.copyInto(a, lo)',
  '}',
];

export interface MergeStep extends Step {
  arr: number[];
  /** 每个位置上的元素原来在哪个下标，用来看稳定性（相等的元素有没有换顺序） */
  ids: number[];
  /** 当前这次调用处理的区间 [lo, hi) */
  lo: number;
  hi: number;
  mid: number | null;
  /** 递归深度，最外层是 1 */
  depth: number;
  /** 调用栈：最外层在前，最后一个就是当前区间 */
  stack: [number, number][];
  /** 临时数组（长度 hi - lo，还没写的是 null）；还没开辟时是空数组 */
  tmp: (number | null)[];
  tmpIds: (number | null)[];
  i: number | null;
  j: number | null;
  k: number | null;
  /** 正在比较的两个下标（i, j） */
  cmp: [number, number] | null;
  /** 这一步刚写进 tmp 的下标，和它来自 arr 的哪个下标 */
  put: number | null;
  src: number | null;
  /** 已经排好的格子（调用返回后标上） */
  sorted: boolean[];
  /** a[i] <= a[j] 一共比较了几次 */
  compares: number;
  /** running：还在跑；ok：排对了；wrong：没排好或数丢了；unstable：排好了但相等元素换了顺序；stuck：无限递归 */
  outcome: 'running' | 'ok' | 'wrong' | 'unstable' | 'stuck';
}

/** 正确版本和几个 bug 版本，只差一行 */
export type Variant = 'ok' | 'lt' | 'copy0' | 'base';

const MAX_DEPTH = 20;
const MAX_STEPS = 20000;

export function isSorted(a: number[]): boolean {
  for (let k = 1; k < a.length; k++) if (a[k - 1] > a[k]) return false;
  return true;
}

/** 排好以后，相等的元素还保持原来的先后顺序吗 */
export function isStable(a: number[], ids: number[]): boolean {
  for (let k = 1; k < a.length; k++) if (a[k - 1] === a[k] && ids[k - 1] > ids[k]) return false;
  return true;
}

const sameItems = (a: number[], b: number[]) => {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  return x.length === y.length && x.every((t, k) => t === y[k]);
};

interface Ctx {
  lo: number;
  hi: number;
  mid: number | null;
  tmp: (number | null)[];
  tmpIds: (number | null)[];
  i: number | null;
  j: number | null;
  k: number | null;
}

class Abort extends Error {}

/** 按某个版本的代码逐行执行。行号对应 CODE（bug 版本只改了一行，行号不变） */
export function simulate(values: number[], variant: Variant = 'ok'): Trace<MergeStep> {
  const n = values.length;
  const arr = [...values];
  const ids = values.map((_, k) => k);
  const sorted: boolean[] = Array(n).fill(false);
  const stack: [number, number][] = [];
  const steps: MergeStep[] = [];
  let compares = 0;

  const push = (c: Ctx, line: number, note: Msg, extra: Partial<MergeStep> = {}) => {
    if (steps.length > MAX_STEPS) throw new Abort();
    steps.push({
      line, note, done: false, arr: [...arr], ids: [...ids], lo: c.lo, hi: c.hi, mid: c.mid,
      depth: stack.length, stack: stack.map(([a, b]) => [a, b] as [number, number]),
      tmp: [...c.tmp], tmpIds: [...c.tmpIds], i: c.i, j: c.j, k: c.k, cmp: null, put: null, src: null,
      sorted: [...sorted], compares, outcome: 'running', ...extra,
    });
  };

  const baseCond = variant === 'base' ? 'hi - lo < 1' : 'hi - lo <= 1';

  function call(lo: number, hi: number) {
    const c: Ctx = { lo, hi, mid: null, tmp: [], tmpIds: [], i: null, j: null, k: null };
    stack.push([lo, hi]);
    push(c, 1, m('trace.note.call', { lo, hi, n: hi - lo }));
    if (stack.length > MAX_DEPTH) {
      push(c, 1, m('trace.note.stuck', { d: stack.length, lo, hi }), {
        done: true, outcome: 'stuck',
      });
      throw new Abort();
    }
    const size = hi - lo;
    const isBase = variant === 'base' ? size < 1 : size <= 1;
    if (isBase) {
      if (size === 1) sorted[lo] = true;
      push(c, 2, m(size === 1 ? 'trace.note.base1' : 'trace.note.base0', { cond: baseCond, size }));
      stack.pop();
      return;
    }
    push(c, 2, m('trace.note.baseNo', { cond: baseCond, size }));
    const mid = (lo + hi) >> 1;
    c.mid = mid;
    push(c, 3, m('trace.note.mid', { lo, hi, mid }));
    push(c, 4, m('trace.note.left', { lo, mid }));
    call(lo, mid);
    push(c, 5, m('trace.note.right', { mid, hi }));
    call(mid, hi);
    c.tmp = Array(size).fill(null);
    c.tmpIds = Array(size).fill(null);
    push(c, 6, m('trace.note.tmp', { size }));
    c.i = lo;
    push(c, 7, m('trace.note.i', { lo }));
    c.j = mid;
    push(c, 8, m('trace.note.j', { mid }));
    c.k = 0;
    push(c, 9, m('trace.note.k'));

    const take = (from: number, line: number, side: string) => {
      const k = c.k!;
      c.tmp[k] = arr[from];
      c.tmpIds[k] = ids[from];
      if (side === '左') c.i = c.i! + 1;
      else c.j = c.j! + 1;
      c.k = k + 1;
      return { line, k, from };
    };
    while (c.i! < mid && c.j! < hi) {
      const i = c.i!;
      const j = c.j!;
      compares++;
      const left = variant === 'lt' ? arr[i] < arr[j] : arr[i] <= arr[j];
      const op = variant === 'lt' ? '<' : '<=';
      push(c, 11, m(left ? 'trace.note.cmpYes' : 'trace.note.cmpNo', { i, j, x: arr[i], y: arr[j], op }), { cmp: [i, j] });
      if (left) {
        const t = take(i, 11, '左');
        push(c, 11, m('trace.note.putL', { k: t.k, i, x: arr[i] }), { put: t.k, src: i });
      } else {
        const t = take(j, 12, '右');
        push(c, 12, m('trace.note.putR', { k: t.k, j, x: arr[j] }), { put: t.k, src: j });
      }
    }
    push(c, 10, m(c.i! >= mid ? 'trace.note.exitL' : 'trace.note.exitR'));
    while (c.i! < mid) {
      const i = c.i!;
      const t = take(i, 14, '左');
      push(c, 14, m('trace.note.restL', { x: arr[i], k: t.k }), { put: t.k, src: i });
    }
    while (c.j! < hi) {
      const j = c.j!;
      const t = take(j, 15, '右');
      push(c, 15, m('trace.note.restR', { x: arr[j], k: t.k }), { put: t.k, src: j });
    }
    const at = variant === 'copy0' ? 0 : lo;
    for (let x = 0; x < size; x++) {
      arr[at + x] = c.tmp[x]!;
      ids[at + x] = c.tmpIds[x]!;
    }
    for (let x = lo; x < hi; x++) sorted[x] = true;
    const wrong = variant === 'copy0' && lo > 0;
    push(c, 16, m('trace.note.copy', { at, end: at + size, warn: wrong ? m('trace.note.copyWrong', { lo }) : '' }));
    push(c, 17, m('trace.note.end', { lo, hi }));
    stack.pop();
  }

  const c0: Ctx = { lo: 0, hi: n, mid: null, tmp: [], tmpIds: [], i: null, j: null, k: null };
  try {
    call(0, n);
  } catch (e) {
    if (e instanceof Abort) {
      steps.length = Math.min(steps.length, MAX_STEPS); // 超限时 push 自己会再抛，先留出位置
      if (!steps.at(-1)?.done) push(c0, 1, m('trace.note.loop'), { done: true, outcome: 'stuck' });
      return steps;
    }
    throw e;
  }
  const last = steps.at(-1)!;
  last.done = true;
  last.outcome = !sameItems(arr, values) || !isSorted(arr) ? 'wrong' : !isStable(arr, ids) ? 'unstable' : 'ok';
  return steps;
}

/** 正确版本的逐步执行 */
export function buildTrace(values: number[]): Trace<MergeStep> {
  return simulate(values, 'ok');
}

/** 随机数组，值在 1..max，可能有重复 */
export function genArray(n: number, max = 20, rand: () => number = Math.random): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(rand() * max));
}

/* ---------- 做：猜下一步 ---------- */

export interface Round {
  kind: 'side' | 'range';
  /** 题目画面停在 trace 的哪一步，答完再翻到 revealAt */
  at: number;
  revealAt: number;
  prompt: Msg;
  options: { value: string; label: Msg }[];
  answer: string;
  why: Msg;
}

const rangeText = (r: [number, number]) => '[' + r[0] + ', ' + r[1] + ')';

/** 猜下一步的数组：PREDICT_N 个数，值在 1 到 PREDICT_MAX，可能有重复 */
export const PREDICT_N = 6;
export const PREDICT_MAX = 9;

export function genPredict(rand: () => number = Math.random): number[] {
  return genArray(PREDICT_N, PREDICT_MAX, rand);
}

/**
 * 从题库里随机挑一题，尽量不和上一题停在同一步（lastAt 是上一题的 at，没有就传 -1）。
 * 返回下标；题库是空的返回 -1。
 */
export function pickRound(pool: Round[], lastAt: number, rand: () => number = Math.random): number {
  if (!pool.length) return -1;
  const ok = pool.map((r, k) => (r.at !== lastAt ? k : -1)).filter((k) => k >= 0);
  const from = ok.length ? ok : pool.map((_, k) => k);
  return from[Math.floor(rand() * from.length)];
}

/** 从一条正确的轨迹里挑出所有能出的题：合并时下一个来自哪边、递归下一个处理哪个区间。答错的解释在每题的 why */
export function rounds(steps: Trace<MergeStep>, rand: () => number = Math.random): Round[] {
  const qs: Round[] = [];
  const allRanges = new Map<string, [number, number]>();
  for (const s of steps) for (const r of s.stack) allRanges.set(rangeText(r), r);

  steps.forEach((s, t) => {
    const nx = steps[t + 1];
    if (!nx) return;
    if (s.cmp && s.line === 11) {
      const [i, j] = s.cmp;
      const left = nx.line === 11;
      const tie = s.arr[i] === s.arr[j];
      qs.push({
        kind: 'side',
        at: t,
        revealAt: t + 1,
        prompt: m('predict.side', { x: s.arr[i], y: s.arr[j] }),
        options: [{ value: 'L', label: m('predict.opt.left') }, { value: 'R', label: m('predict.opt.right') }],
        answer: left ? 'L' : 'R',
        why: m(left ? (tie ? 'predict.why.tie' : 'predict.why.left') : 'predict.why.right', { x: s.arr[i], y: s.arr[j] }),
      });
    }
    if (nx.line === 1) {
      const target = nx.stack.at(-1)!;
      const key = rangeText(target);
      const pool = [...allRanges.entries()].filter(([k]) => k !== key).map(([, r]) => r);
      const picked: [number, number][] = [];
      const want = Math.min(3, pool.length);
      while (picked.length < want) {
        const r = pool.splice(Math.floor(rand() * pool.length), 1)[0];
        picked.push(r);
      }
      const opts = [target, ...picked].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const goLeft = s.line === 4;
      qs.push({
        kind: 'range',
        at: t,
        revealAt: t + 1,
        prompt: m('predict.range', { lo: s.lo, hi: s.hi, line: s.line }),
        options: opts.map((r) => ({ value: rangeText(r), label: m('predict.opt.range', { r: rangeText(r) }) })),
        answer: key,
        why: m(goLeft ? 'predict.why.goLeft' : 'predict.why.goRight', { r: key }),
      });
    }
  });
  return qs;
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: Exclude<Variant, 'ok'>;
  values: number[];
  /** 是否要显示花色（看稳定性时用） */
  suits: boolean;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'lt',
    title: m('bug.lt.title'),
    code: variant(11, '        if (a[i] < a[j]) tmp[k++] = a[i++]'),
    wrongLine: 11,
    fixed: '        if (a[i] <= a[j]) tmp[k++] = a[i++]',
    values: [3, 1, 3, 2],
    suits: true,
    expect: m('bug.lt.expect'),
    explain: m('bug.lt.explain'),
  },
  {
    id: 'copy0',
    title: m('bug.copy0.title'),
    code: variant(16, '    tmp.copyInto(a, 0)'),
    wrongLine: 16,
    fixed: '    tmp.copyInto(a, lo)',
    values: [3, 4, 2, 1],
    suits: false,
    expect: m('bug.copy0.expect'),
    explain: m('bug.copy0.explain'),
  },
  {
    id: 'base',
    title: m('bug.base.title'),
    code: variant(2, '    if (hi - lo < 1) return'),
    wrongLine: 2,
    fixed: '    if (hi - lo <= 1) return',
    values: [2, 1, 3],
    suits: false,
    expect: m('bug.base.expect'),
    explain: m('bug.base.explain'),
  },
];

/** 按 bug 版本的代码执行 */
export function runBug(bug: Bug): Trace<MergeStep> {
  return simulate(bug.values, bug.id);
}

/** 数组写成文字；suits 为真时点数后面带花色（id 是元素原来的位置） */
export function showCards(arr: number[], ids: number[], suits: boolean): string {
  return '[' + arr.map((v, k) => v + (suits ? suitOf(ids[k]) : '')).join(', ') + ']';
}

/** 找 bug 面板底部的判定：动画跑完后结果是什么，没跑完是 null */
export function bugVerdict(step: MergeStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  const cards = showCards(step.arr, step.ids, bug.suits);
  if (step.outcome === 'stuck') return m('bug.verdict.stuck');
  if (step.outcome === 'unstable') return m('bug.verdict.unstable', { cards });
  if (step.outcome === 'wrong') return m('bug.verdict.wrong', { cards });
  return m('bug.verdict.ok');
}

/* ---------- 做：挑战 ---------- */

export interface MergeInfo {
  lo: number;
  hi: number;
  compares: number;
}

/** 不画动画，直接数每一次合并比较了几次（和 buildTrace 的比较次数一致） */
export function mergeCompares(values: number[]): { total: number; merges: MergeInfo[]; sorted: number[] } {
  const a = [...values];
  const merges: MergeInfo[] = [];
  let total = 0;
  const rec = (lo: number, hi: number) => {
    if (hi - lo <= 1) return;
    const mid = (lo + hi) >> 1;
    rec(lo, mid);
    rec(mid, hi);
    let i = lo;
    let j = mid;
    let c = 0;
    const t: number[] = [];
    while (i < mid && j < hi) {
      c++;
      if (a[i] <= a[j]) t.push(a[i++]);
      else t.push(a[j++]);
    }
    while (i < mid) t.push(a[i++]);
    while (j < hi) t.push(a[j++]);
    t.forEach((x, k) => (a[lo + k] = x));
    merges.push({ lo, hi, compares: c });
    total += c;
  };
  rec(0, a.length);
  return { total, merges, sorted: a };
}

/** n 个元素排序时，比较次数最少和最多是多少。每次合并两段 l 和 r：最少 min(l, r) 次，最多 l + r - 1 次 */
export function compareBounds(n: number): { min: number; max: number } {
  if (n <= 1) return { min: 0, max: 0 };
  const l = halve(n);
  const r = n - l;
  const a = compareBounds(l);
  const b = compareBounds(r);
  return { min: a.min + b.min + Math.min(l, r), max: a.max + b.max + n - 1 };
}

export const CHALLENGE_N = 8;

/** n 是 2 的幂时，让归并排序比较次数最多的一种排法：每次合并前，左右两半的元素正好交错 */
export function worstCase(n: number): number[] {
  const build = (a: number[]): number[] => {
    if (a.length <= 1) return a;
    return [...build(a.filter((_, k) => k % 2 === 0)), ...build(a.filter((_, k) => k % 2 === 1))];
  };
  return build(Array.from({ length: n }, (_, k) => k + 1));
}

/* ---------- 做：逐步执行（TraceRules） ---------- */

export type TraceKind = 'random' | 'sorted' | 'reversed';
export interface TraceInput {
  size: number;
  kind: TraceKind;
  arr: number[];
}
export type TraceAction = { type: 'size'; n: number } | { type: 'kind'; kind: TraceKind } | { type: 'fresh' };

/** 按数组大小和初始顺序生成一组数 */
export function makeTraceArray(n: number, kind: TraceKind, rand?: Rand): number[] {
  if (kind === 'sorted') return Array.from({ length: n }, (_, k) => (k + 1) * 3);
  if (kind === 'reversed') return Array.from({ length: n }, (_, k) => (n - k) * 3);
  return genArray(n, 30, rand);
}

const KINDS: TraceKind[] = ['random', 'sorted', 'reversed'];

export const traceRules: TraceRules<TraceInput, MergeStep, TraceAction> = {
  code: CODE,
  start: (rand) => ({ size: 6, kind: 'random', arr: makeTraceArray(6, 'random', rand) }),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return { ...input, size: a.n, arr: makeTraceArray(a.n, input.kind, rand) };
      case 'kind': return { ...input, kind: a.kind, arr: makeTraceArray(input.size, a.kind, rand) };
      case 'fresh': return { ...input, arr: makeTraceArray(input.size, input.kind, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [4, 6, 8].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    {
      type: 'segmented', legend: m('trace.kind'), value: input.kind,
      options: KINDS.map((k) => ({ value: k, label: m('trace.kind.' + k) })),
      choose: (v) => ({ type: 'kind', kind: v as TraceKind }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.arr),
  vars: (_input, s): Var[] => [
    ['lo', s.lo], ['hi', s.hi], ['mid', s.mid ?? '—'], [m('trace.v.depth'), s.depth],
    ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['k', s.k ?? '—'], [m('trace.v.compares'), m('trace.times', { n: s.compares })],
  ],
  summary(input, s) {
    if (!s.done) return null;
    const n = input.arr.length;
    const b = compareBounds(n);
    const steps = buildTrace(input.arr);
    return m('trace.summary', {
      compares: s.compares, n, min: b.min, max: b.max,
      calls: steps.filter((x) => x.line === 1).length,
      merges: steps.filter((x) => x.line === 16).length,
      depth: Math.max(...steps.map((x) => x.depth)),
    });
  },
  jumps: [
    { label: m('trace.jump.call'), stop: (x) => x.line === 1 || x.done },
    { label: m('trace.jump.merge'), stop: (x) => x.line === 16 || x.done },
  ],
  foot: m('trace.legend'),
};

/* ---------- 做：猜下一步（PredictRules） ---------- */

/** 一道题：从一条随机数组的轨迹里挑一问。画面是轨迹的一步，答完翻到下一步 */
function makePuzzle(rand?: Rand): Puzzle<MergeStep, string> {
  const steps = buildTrace(genPredict(rand));
  const pool = rounds(steps, rand);
  const q = pool[pickRound(pool, -1, rand)];
  const next = steps[q.revealAt];
  const reveal = { view: next, prompt: m('predict.reveal', { n: q.revealAt + 1, note: next.note }) };
  return {
    endless: true,
    end: reveal,
    asks: [{
      view: steps[q.at],
      prompt: q.prompt,
      kind: 'choose',
      answer: q.answer,
      options: q.options,
      why: m('predict.no', { why: q.why }),
      right: m('predict.yes', { why: q.why }),
      reveal,
      revealOnRight: true,
    }],
  };
}

export const predictRules: PredictRules<MergeStep, string> = {
  goal: 6,
  puzzle: (rand) => makePuzzle(rand),
};

/* ---------- 做：找 bug（BugRules） ---------- */

const bugRules: BugRules<Bug, MergeStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: showCards(bug.values, bug.values.map((_, k) => k), bug.suits), expect: bug.expect }),
  vars: (s): Var[] => [['lo', s.lo], ['hi', s.hi], [m('trace.v.depth'), s.depth], [m('trace.v.compares'), m('trace.times', { n: s.compares })]],
  verdict: bugVerdict,
};

/* ---------- 做：挑战（GameRules） ---------- */

export type ChallengeMode = 'max' | 'min';
export interface ChallengeState {
  mode: ChallengeMode;
  /** 孩子排的队，1 到 CHALLENGE_N 各用一次 */
  line: number[];
  /** 排满过几次 */
  tries: number;
}
export type ChallengeAction =
  | { type: 'mode'; mode: ChallengeMode }
  | { type: 'add'; v: number }
  | { type: 'undo' }
  | { type: 'clear' }
  | { type: 'peek' };

export const challengeFull = (s: ChallengeState) => s.line.length === CHALLENGE_N;
export const challengeTarget = (s: ChallengeState) => compareBounds(CHALLENGE_N)[s.mode];
/** 排满以后的比较情况；没排满是 null */
export const challengeResult = (s: ChallengeState) => (challengeFull(s) ? mergeCompares(s.line) : null);
export const challengeWin = (s: ChallengeState) => challengeResult(s)?.total === challengeTarget(s);
/** 「看一种答案」按钮：试过 3 次还没达成 */
export const challengePeekable = (s: ChallengeState) => s.tries >= 3 && !challengeWin(s);

/** 题干下面那一段：目标，加一句随试了几次变化的提示（排满以后没有提示） */
export function challengeNote(s: ChallengeState): Msg {
  const hint = challengeFull(s)
    ? ''
    : m(s.mode === 'min' ? 'chal.hint.min' : s.tries >= 2 ? 'chal.hint.deep' : 'chal.hint.max');
  return m('chal.note', { n: CHALLENGE_N, goal: m(s.mode === 'max' ? 'chal.goal.max' : 'chal.goal.min'), hint });
}

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: () => ({ state: { mode: 'max', line: [], tries: 0 } }),
  act(s, a) {
    switch (a.type) {
      case 'mode': return { state: { mode: a.mode, line: [], tries: 0 } };
      case 'add': {
        if (challengeFull(s) || s.line.includes(a.v) || a.v < 1 || a.v > CHALLENGE_N) return null;
        const line = [...s.line, a.v];
        return { state: { ...s, line, tries: line.length === CHALLENGE_N ? s.tries + 1 : s.tries } };
      }
      case 'undo': return s.line.length ? { state: { ...s, line: s.line.slice(0, -1) } } : null;
      case 'clear': return s.line.length ? { state: { ...s, line: [] } } : null;
      case 'peek':
        return { state: { ...s, line: s.mode === 'max' ? worstCase(CHALLENGE_N) : Array.from({ length: CHALLENGE_N }, (_, k) => k + 1) } };
    }
  },
  clickable: () => true,
  controls: (s): Control<ChallengeAction>[] => {
    if (!challengeFull(s)) return [];
    const out: Control<ChallengeAction>[] = [{ type: 'button', action: { type: 'clear' }, label: m('chal.again'), look: 'smallPrimary' }];
    if (challengePeekable(s)) out.push({ type: 'button', action: { type: 'peek' }, label: m('chal.peek'), look: 'small' });
    return out;
  },
  // 结算：整块结果由画面 ChallengeResult 画（里面有加粗和列表）
  result: (s) => {
    const r = challengeResult(s);
    if (!r) return null;
    return {
      art: {
        scene: 'ChallengeResult',
        props: {
          line: s.line, mode: s.mode, total: r.total, merges: r.merges, win: challengeWin(s), ...compareBounds(CHALLENGE_N),
        },
      },
    };
  },
};

/* ---------- 延伸：对比图 ---------- */

/** 「快还是慢，看数据」的对比图：归并取最坏情况（精确值），插入排序随机打乱约 n²/4，选择排序固定 n(n − 1)/2 */
export function compareRows() {
  return [
    { label: '10', unit: m('compare.hand'), n: 10 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '100,000', unit: m('compare.hundredK'), n: 100000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.merge'), value: compareBounds(r.n).max, tone: 'accent' as const },
      { name: m('compare.insertion'), value: (r.n * r.n) / 4, tone: 'muted' as const, approx: true },
      { name: m('compare.selection'), value: (r.n * (r.n - 1)) / 2, tone: 'warn' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { merge: mergeRules, split: splitRules, challenge: challengeRules },
};
