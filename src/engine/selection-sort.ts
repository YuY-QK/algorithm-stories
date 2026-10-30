import { m } from '../core/i18n';
import { PAUSE_NOTE, PAUSE_SHORT } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

/* ---------- 看、玩：小熊排糖果 ---------- */

/**
 * 绘本用的一排糖果，数字是糖果的大小。
 * 选这一组是因为五轮里有两轮「最小的已经在最前面，不用换」，正好讲到这种情况。
 */
export const STORY = [5, 2, 6, 1, 4, 3];

/** 玩的时候几颗糖果 */
export const KID_N = 6;
/** 「小熊的手」几颗糖果：3 + 2 + 1 = 6 次比一比，孩子玩得完 */
export const HAND_N = 4;
/** 糖果最大是几号 */
export const CANDY_MAX = 9;

/** 从下标 i 开始往后，最小的那个在哪里。有几个一样小时取最前面的（和代码里的 < 一致） */
export function minFrom(a: number[], i: number): number {
  let m = i;
  for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
  return m;
}

/** 交换两个位置，返回新数组 */
export function swapAt<T>(a: T[], x: number, y: number): T[] {
  const b = a.slice();
  [b[x], b[y]] = [b[y], b[x]];
  return b;
}

/** 选择排序的一轮：从 i 开始挑最小的（在 min），和 i 换位置 */
export interface Pick {
  i: number;
  min: number;
  before: number[];
  after: number[];
}

/** 一轮一轮挑，一共 n − 1 轮，最后一个不用挑 */
export function selectRounds(input: number[]): Pick[] {
  const out: Pick[] = [];
  let a = input.slice();
  for (let i = 0; i < a.length - 1; i++) {
    const min = minFrom(a, i);
    const after = swapAt(a, i, min);
    out.push({ i, min, before: a, after });
    a = after;
  }
  return out;
}

/** 绘本的一页：台词加画面（一排糖果、已排好几颗、小熊指着谁、谁在发光） */
export interface LookPage extends LookFrame {
  values: number[];
  sorted: number;
  bear: number | null;
  glow: number | null;
}

/** 「看」的全部页，由 selectRounds 生成，和真实的选择排序一致 */
export function lookFrames(a: number[]): LookPage[] {
  const rs = selectRounds(a);
  const out: LookPage[] = [];
  out.push({ say: m('look.start'), values: a, sorted: 0, bear: null, glow: null });
  out.push({ say: m('look.how'), values: a, sorted: 0, bear: null, glow: null });
  for (const r of rs) {
    out.push({ say: m(r.i === 0 ? 'look.min.first' : 'look.min.rest'), values: r.before, sorted: r.i, bear: r.min, glow: r.min });
    out.push({ say: m(r.min !== r.i ? 'look.swap' : 'look.keep'), values: r.after, sorted: r.i + 1, bear: r.i, glow: null });
  }
  const end = rs.length ? rs[rs.length - 1].after : a;
  out.push({ say: m('look.end', { n: rs.length }), values: end, sorted: end.length, bear: null, glow: null });
  return out;
}

/** 看的规则：种子是一排糖果，「再看一次」换一排 */
const lookRules: LookRules<number[], LookPage> = {
  first: STORY,
  next: (_prev, rand) => genCandies(KID_N, rand),
  frames: lookFrames,
};

/** n 颗大小互不相同的糖果（1 到 CANDY_MAX 号），打乱顺序 */
export function genCandies(n: number, rand: () => number = Math.random): number[] {
  const pool = Array.from({ length: CANDY_MAX }, (_, k) => k + 1);
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  // 已经排好的太没意思，再洗一次
  if (n > 2 && out.every((v, k) => k === 0 || out[k - 1] < v)) return genCandies(n, rand);
  return out;
}

/** 玩的星星：一次没看错三颗，看错一两次两颗，再多一颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/* ---------- 玩法二：小熊的手 ---------- */

/**
 * 小熊手里拿着「目前最小的」那颗（held），一颗一颗看后面的（j）。
 * 看到更小的就换一颗拿，看完一轮，手里的就是最小的，再把它放到最前面（i）。
 * 这正是代码里的 minIdx 和内层循环。
 */
export interface HandState {
  a: number[];
  /** 这一轮要放到哪个位置，前面 i 个已经排好 */
  i: number;
  /** 小熊手里拿的是第几颗（minIdx） */
  held: number;
  /** 正在看第几颗；等于 a.length 表示这一轮看完了，等着放到最前面 */
  j: number;
  compares: number;
  done: boolean;
}

export type HandChoice = 'take' | 'keep';

export function handInit(a: number[]): HandState {
  return { a: a.slice(), i: 0, held: 0, j: 1, compares: 0, done: a.length < 2 };
}

/** 这一轮是不是看完了 */
export const handRoundOver = (s: HandState) => !s.done && s.j >= s.a.length;

/** 看到的这颗比手里的小，就换（take），否则留着手里的（keep） */
export function handNeed(s: HandState): HandChoice {
  return s.a[s.j] < s.a[s.held] ? 'take' : 'keep';
}

/** 回答这一次比一比。答错返回 null，状态不变 */
export function handStep(s: HandState, answer: HandChoice): HandState | null {
  if (s.done || handRoundOver(s)) return s;
  if (answer !== handNeed(s)) return null;
  return { ...s, held: answer === 'take' ? s.j : s.held, j: s.j + 1, compares: s.compares + 1 };
}

/** 一轮看完：把手里的放到最前面，开始下一轮 */
export function handPlace(s: HandState): HandState {
  if (!handRoundOver(s)) return s;
  const a = swapAt(s.a, s.i, s.held);
  const i = s.i + 1;
  return { a, i, held: i, j: i + 1, compares: s.compares, done: i >= a.length - 1 };
}

/* ---------- 玩法一：挑最小的 ---------- */

/**
 * 玩法一的游戏状态。每一轮孩子从还没排好的糖果里点出最小的，小熊把它换到最前面。
 * 点错了不说错：把点的那颗和真正最小的并排放大（pair），让孩子自己比一比。
 * 只剩一颗时问「还要挑吗」，让孩子自己发现最后一颗不用挑。
 * phase：pick 等孩子点；compare 并排比一比；moving 点对了，小熊拿着它发光；moved 换好了，稍停；last 只剩一颗；done 排好了。
 */
export interface PickGame {
  a: number[];
  i: number;
  phase: 'pick' | 'compare' | 'moving' | 'moved' | 'last' | 'done';
  mistakes: number;
  /** 摇头：[糖果下标, 第几次] */
  shake: [number, number] | null;
  glow: number | null;
  /** 一闪一闪，直到被点 */
  pulse: number | null;
  bear: number | null;
  /** 比一比：点错的那颗和真正最小的那颗（下标）；并排时按队伍里的先后放，不让位置泄露答案 */
  pair: { tapped: number; min: number; left: 'tapped' | 'min' } | null;
  pairShake: ['l' | 'r', number] | null;
}

export type PickAction =
  | { type: 'pick'; k: number }
  | { type: 'side'; side: 'l' | 'r' }
  | { type: 'last'; need: boolean }
  | { type: 'again' };

const pickStart = (rand?: Rand): Outcome<PickGame> => ({
  state: { a: genCandies(KID_N, rand), i: 0, phase: 'pick', mistakes: 0, shake: null, glow: null, pulse: null, bear: null, pair: null, pairShake: null },
  say: m('pick.say.start'),
});

/** 并排比一比时两边的糖果大小 */
export function pairValues(g: PickGame): { l: number; r: number } | null {
  const p = g.pair;
  if (!p) return null;
  const l = p.left === 'tapped' ? p.tapped : p.min;
  const r = p.left === 'tapped' ? p.min : p.tapped;
  return { l: g.a[l], r: g.a[r] };
}

const wiggle = (g: PickGame, k: number): [number, number] => [k, (g.shake?.[1] ?? 0) + 1];

export const pickRules: GameRules<PickGame, PickAction> = {
  start: (rand) => pickStart(rand),

  act(g, a, rand) {
    if (a.type === 'again') return g.phase === 'done' ? pickStart(rand) : null;
    if (a.type === 'side') {
      const p = g.pair;
      if (!p || g.phase !== 'compare') return null;
      const who = a.side === 'l' ? p.left : p.left === 'tapped' ? 'min' : 'tapped';
      if (who === 'tapped') return { state: { ...g, pairShake: [a.side, (g.pairShake?.[1] ?? 0) + 1] }, sound: 'wrong' };
      return { state: { ...g, pair: null, phase: 'pick', pulse: p.min }, say: m('pick.say.that'), sound: 'right' };
    }
    if (a.type === 'last') {
      if (g.phase !== 'last') return null;
      if (a.need) return { state: { ...g, shake: wiggle(g, g.a.length - 1) }, say: m('pick.say.count'), sound: 'wrong' };
      return { state: { ...g, i: g.a.length, phase: 'done' }, say: m('pick.say.done'), sound: 'win' };
    }
    // 点糖果
    if (g.phase === 'last') return { state: { ...g, shake: wiggle(g, a.k) }, sound: 'wrong' };
    if (g.phase !== 'pick') return null;
    if (a.k < g.i) return { state: { ...g, shake: wiggle(g, a.k) }, say: m('pick.say.plated'), sound: 'wrong' };
    const min = minFrom(g.a, g.i);
    if (a.k !== min) {
      return {
        state: { ...g, mistakes: g.mistakes + 1, pulse: null, pair: { tapped: a.k, min, left: a.k < min ? 'tapped' : 'min' }, phase: 'compare' },
        say: m('pick.say.compare'),
        sound: 'wrong',
      };
    }
    const v = g.a[a.k];
    return {
      state: { ...g, pulse: null, phase: 'moving', bear: a.k, glow: a.k },
      say: m(a.k === g.i ? 'pick.say.stay' : 'pick.say.move', { v }),
      sound: 'right',
      after: PAUSE_SHORT,
    };
  },

  tick(g): Outcome<PickGame> {
    if (g.phase === 'moving') {
      return {
        state: { ...g, glow: null, a: swapAt(g.a, g.i, g.bear!), bear: g.i, i: g.i + 1, phase: 'moved' },
        sound: 'tick',
        after: PAUSE_SHORT,
      };
    }
    if (g.phase === 'moved') {
      const last = g.i >= g.a.length - 1;
      return { state: { ...g, bear: null, phase: last ? 'last' : 'pick' }, say: m(last ? 'pick.say.last' : 'pick.say.next') };
    }
    return { state: g };
  },

  // 切标签时，小熊搬到一半的局作废，换一排新的重新开始
  interrupt: (g) => (g.phase === 'moving' || g.phase === 'moved' ? pickStart() : { state: g }),

  clickable: (g) => g.phase === 'pick' || g.phase === 'last',

  controls(g) {
    if (g.phase === 'last') {
      return [
        { type: 'button', action: { type: 'last', need: true }, look: 'pad', label: m('pick.pad.need'), aria: m('pick.aria.need') },
        { type: 'button', action: { type: 'last', need: false }, look: 'pad', label: m('pick.pad.skip'), aria: m('pick.aria.skip') },
      ];
    }
    if (g.phase === 'done') return [{ type: 'button', action: { type: 'again' }, label: m('pick.again'), look: 'primary' }];
    return [];
  },

  result: (g) =>
    g.phase === 'done'
      ? { stars: stars(g.mistakes), art: { scene: 'PickTally', props: { n: g.a.length, rounds: g.a.length - 1 } } }
      : null,
};

/* ---------- 玩法二：小熊的手（游戏状态） ---------- */

/**
 * 玩法二的游戏状态。phase：ask 等孩子决定；over 一轮看完，稍后把手里的放到最前面；placed 放好了，稍停。
 * glow 是 [更小的一边, 第几次]，答错时那一边透光。
 */
export interface HandGame {
  s: HandState;
  mistakes: number;
  glow: ['l' | 'r', number] | null;
  phase: 'ask' | 'over' | 'placed';
}

export type HandAction = { type: 'answer'; c: HandChoice } | { type: 'again' };

const handStart = (rand?: Rand): Outcome<HandGame> => ({
  state: { s: handInit(genCandies(HAND_N, rand)), mistakes: 0, glow: null, phase: 'ask' },
  say: m('hand.say.start'),
});

/** 此刻在等孩子回答（还没看完一轮，也没在放糖果） */
export const handAsking = (g: HandGame) => !g.s.done && !handRoundOver(g.s) && g.phase === 'ask';

export const handRules: GameRules<HandGame, HandAction> = {
  start: (rand) => handStart(rand),

  act(g, a, rand) {
    if (a.type === 'again') return g.s.done ? handStart(rand) : null;
    if (!handAsking(g)) return null;
    const held = g.s.a[g.s.held];
    const look = g.s.a[g.s.j];
    const n = handStep(g.s, a.c);
    if (!n) {
      return {
        state: { ...g, mistakes: g.mistakes + 1, glow: [handNeed(g.s) === 'take' ? 'r' : 'l', (g.glow?.[1] ?? 0) + 1] },
        say: m('hand.say.wrong'),
        sound: 'wrong',
      };
    }
    if (handRoundOver(n)) return { state: { ...g, s: n, glow: null, phase: 'over' }, say: m('hand.say.over'), sound: 'right', after: PAUSE_NOTE };
    return {
      state: { ...g, s: n, glow: null },
      say: m(a.c === 'take' ? 'hand.say.take' : 'hand.say.keep', { look, held }),
      sound: 'right',
    };
  },

  tick(g): Outcome<HandGame> {
    if (g.phase === 'over') {
      const s = handPlace(g.s);
      if (s.done) return { state: { ...g, s, phase: 'ask' }, say: m('hand.say.done'), sound: 'win' };
      return { state: { ...g, s, phase: 'placed' }, say: m('hand.say.placed'), sound: 'tick', after: PAUSE_NOTE };
    }
    if (g.phase === 'placed') return { state: { ...g, phase: 'ask' }, say: m('hand.say.ask') };
    return { state: g };
  },

  // 切标签时，放糖果的等待中途的局作废，换一排新的重新开始
  interrupt: (g) => (g.phase === 'over' || g.phase === 'placed' ? handStart() : { state: g }),

  clickable: () => false,

  controls(g) {
    if (g.s.done) return [{ type: 'button', action: { type: 'again' }, label: m('hand.again'), look: 'primary' }];
    if (!handAsking(g)) return [];
    return [
      { type: 'button', action: { type: 'answer', c: 'take' }, look: 'pad', label: m('hand.pad.take'), aria: m('hand.aria.take') },
      { type: 'button', action: { type: 'answer', c: 'keep' }, look: 'pad', label: m('hand.pad.keep'), aria: m('hand.aria.keep') },
    ];
  },

  result: (g) => (g.s.done ? { stars: stars(g.mistakes), body: m('hand.win', { c: g.s.compares }) } : null),
};

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun selectionSort(arr: IntArray) {',
  '    val n = arr.size',
  '    for (i in 0 until n - 1) {',
  '        var minIdx = i',
  '        for (j in i + 1 until n) {',
  '            if (arr[j] < arr[minIdx]) {',
  '                minIdx = j',
  '            }',
  '        }',
  '        if (minIdx != i) {',
  '            val tmp = arr[i]',
  '            arr[i] = arr[minIdx]',
  '            arr[minIdx] = tmp',
  '        }',
  '    }',
  '}',
];

export interface SelectionStep extends Step {
  a: number[];
  i: number | null;
  j: number | null;
  minIdx: number | null;
  /** 下标 0 到 sorted − 1 已经在最终位置 */
  sorted: number;
  compares: number;
  swaps: number;
  /** 正在比较 arr[j] 和 arr[minIdx] */
  cmp: boolean;
  /** 刚交换的两个位置 */
  swap: [number, number] | null;
}

export type Shape = 'random' | 'dups' | 'sorted' | 'reversed';

/** 生成数组。dups：只有几种值，一定有重复 */
export function genArray(n: number, shape: Shape = 'random', rand: () => number = Math.random): number[] {
  const a: number[] = [];
  for (let k = 0; k < n; k++) a.push(shape === 'dups' ? 1 + Math.floor(rand() * 4) : 5 + Math.floor(rand() * 90));
  if (shape === 'sorted') a.sort((x, y) => x - y);
  if (shape === 'reversed') a.sort((x, y) => y - x);
  return a;
}

export function buildTrace(input: number[]): Trace<SelectionStep> {
  const a = input.slice();
  const n = a.length;
  const steps: SelectionStep[] = [];
  let i: number | null = null, j: number | null = null, minIdx: number | null = null;
  let sorted = 0, compares = 0, swaps = 0;
  const push = (line: number, note: Msg, extra: Partial<SelectionStep> = {}) => {
    steps.push({ line, a: a.slice(), i, j, minIdx, sorted, compares, swaps, note, cmp: false, swap: null, done: false, ...extra });
  };

  push(2, m('trace.note.n', { n }));
  for (i = 0; i < n - 1; i++) {
    j = null;
    minIdx = null;
    push(3, i ? m('trace.note.roundSorted', { r: i + 1, i, last: i - 1 }) : m('trace.note.round', { r: i + 1, i }));
    minIdx = i;
    push(4, m('trace.note.minInit', { i, v: a[i] }));
    for (j = i + 1; j < n; j++) {
      compares++;
      const less = a[j] < a[minIdx];
      push(6, m('trace.note.cmp', { j, v: a[j], rel: less ? ' < ' : ' ≥ ', min: a[minIdx], verdict: m(less ? 'trace.note.less' : 'trace.note.notLess') }), { cmp: true });
      if (less) {
        minIdx = j;
        push(7, m('trace.note.update', { j, v: a[j] }));
      }
    }
    j = null;
    if (minIdx !== i) {
      push(10, m('trace.note.needSwap', { min: minIdx, i }));
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      swaps++;
      sorted = i + 1;
      push(11, m('trace.note.swapDone', { i, min: minIdx, v: a[i] }), { swap: [i, minIdx] });
    } else {
      sorted = i + 1;
      push(10, m('trace.note.noSwap', { i, v: a[i] }));
    }
  }
  i = null;
  minIdx = null;
  sorted = n;
  push(3, m(n > 1 ? 'trace.note.finish' : 'trace.note.finishTiny', { compares, swaps }), { done: true });
  return steps;
}

/** 比较次数总是 n(n−1)/2，和数据长什么样无关 */
export const comparesFor = (n: number) => (n < 2 ? 0 : (n * (n - 1)) / 2);

/** 逆序对个数，也就是冒泡排序（和插入排序）要交换的次数 */
export function inversions(a: number[]): number {
  let c = 0;
  for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) if (a[x] > a[y]) c++;
  return c;
}

/** 逐步执行面板的输入：数组、数组大小和初始顺序（改大小或顺序就换一个新数组） */
export interface TraceInput {
  arr: number[];
  size: number;
  shape: Shape;
}

export type TraceAction = { type: 'size'; n: number } | { type: 'shape'; shape: Shape } | { type: 'fresh' };

const SHAPES: Shape[] = ['random', 'dups', 'sorted', 'reversed'];

/** 做：逐步执行。i、j、minIdx、代码行、比较和交换次数同步 */
export const traceRules: TraceRules<TraceInput, SelectionStep, TraceAction> = {
  code: CODE,
  start: (rand) => ({ size: 8, shape: 'random', arr: genArray(8, 'random', rand) }),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return { ...input, size: a.n, arr: genArray(a.n, input.shape, rand) };
      case 'shape': return { ...input, shape: a.shape, arr: genArray(input.size, a.shape, rand) };
      case 'fresh': return { ...input, arr: genArray(input.size, input.shape, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [6, 8, 10].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    {
      type: 'segmented', legend: m('trace.shape'), value: input.shape,
      options: SHAPES.map((s) => ({ value: s, label: m('trace.shape.' + s) })),
      choose: (v) => ({ type: 'shape', shape: v as Shape }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.arr),
  vars: (_input, s): Var[] => [
    ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['minIdx', s.minIdx ?? '—'],
    [m('trace.v.compares'), m('trace.times', { n: s.compares })], [m('trace.v.swaps'), m('trace.times', { n: s.swaps })],
  ],
  summary(input, s) {
    if (!s.done) return null;
    const n = input.arr.length;
    return m('trace.summary', { compares: s.compares, exp: comparesFor(n), swaps: s.swaps, max: Math.max(n - 1, 0), bubble: inversions(input.arr) });
  },
  /** 跳到这一轮结束（交换完或判定不用换） */
  jump: { label: m('trace.jump'), stop: (x, cur) => x.sorted > cur.sorted || x.done },
};

/* ---------- 做：猜下一步 ---------- */

/** 每一轮要回答的题：minIdx 最后停在哪、这一轮 minIdx 变了几次 */
export interface Round {
  i: number;
  /** 这一轮开始时的数组 */
  before: number[];
  minIdx: number;
  /** minIdx 被改了几次（第 7 行执行了几次） */
  updates: number;
  /** 选错「minIdx 改了几次」时的解释 */
  why: Msg;
}

/** minIdx 在这一轮里依次指过哪些下标 */
function minPath(i: number, before: number[]): number[] {
  const out = [i];
  for (let j = i + 1; j < before.length; j++) if (before[j] < before[out[out.length - 1]]) out.push(j);
  return out;
}

/** 点错「minIdx 最后停在哪」时的解释：点的是第 k 格 */
export function whyMin(rd: Round, k: number): Msg {
  const { i, minIdx, before } = rd;
  const v = before[minIdx];
  if (k > i && k !== minIdx && before[k] === v) return m('why.dup', { k, v, min: minIdx });
  if (k < i) return m('why.done', { k, i, min: minIdx, v });
  return m('why.min', { i, min: minIdx, v });
}

/** 猜下一步出一道题：6 到 8 颗，三成半有重复的 */
export function genPredict(rand: () => number = Math.random): number[] {
  const n = 6 + Math.floor(rand() * 3);
  return genArray(n, rand() < 0.35 ? 'dups' : 'random', rand);
}

export function rounds(input: number[]): Round[] {
  const a = input.slice();
  const out: Round[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    let mi = i, updates = 0;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[mi]) {
        mi = j;
        updates++;
      }
    }
    const before = a.slice();
    const ps = minPath(i, before);
    const why = ps.length === 1
      ? m('why.none', { i, v: before[i] })
      : m('why.path', { path: ps.join(' → '), vals: ps.map((x) => before[x]).join(' → '), n: updates });
    out.push({ i, before, minIdx: mi, updates, why });
    [a[i], a[mi]] = [a[mi], a[i]];
  }
  return out;
}

/** 猜下一步画面的样子：这一排糖果，前 sorted 个已经排好，i 是这一轮要放的位置，min 是亮出来的 minIdx（还没亮是 null） */
export interface PredictView {
  a: number[];
  sorted: number;
  i: number | null;
  min: number | null;
}

/** 把一道题（一排数）排成一问接一问：每一轮先点出 minIdx 最后停在哪，再选这一轮 minIdx 改了几次 */
export function makePuzzle(arr: number[]): Puzzle<PredictView, number> {
  const list = rounds(arr);
  const asks = list.flatMap((rd) => {
    const view: PredictView = { a: rd.before, sorted: rd.i, i: rd.i, min: null };
    const withMin = { ...view, min: rd.minIdx };
    const minPrompt = m('predict.min', { n: rd.i + 1, i: rd.i });
    return [
      {
        view, prompt: minPrompt, kind: 'pick' as const, answer: rd.minIdx, why: whyMin(rd, rd.i),
        whyFor: (k: number) => whyMin(rd, k),
        // 点错：把真正的 minIdx 亮出来
        reveal: { view: withMin, prompt: minPrompt },
      },
      {
        view: withMin, prompt: m('predict.count', { min: rd.minIdx }), kind: 'choose' as const, answer: rd.updates, why: rd.why,
        options: Array.from({ length: arr.length - rd.i }, (_, c) => ({ value: c, label: m('num', { n: c }), aria: m('predict.times', { n: c }) })),
      },
    ];
  });
  const last = list[list.length - 1];
  const final = swapAt(last.before, last.i, last.minIdx);
  return { asks, end: { view: { a: final, sorted: arr.length, i: null, min: null }, prompt: m('predict.end') } };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: 6,
  puzzle: (rand = Math.random) => makePuzzle(genPredict(rand)),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'cmp-i' | 'j-zero' | 'no-tmp';
  values: number[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'cmp-i',
    title: m('bug.cmp-i.title'),
    code: variant(6, '            if (arr[j] < arr[i]) {'),
    wrongLine: 6,
    fixed: '            if (arr[j] < arr[minIdx]) {',
    values: [4, 1, 3, 5, 2],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4, 5]' }),
    explain: m('bug.cmp-i.explain'),
  },
  {
    id: 'j-zero',
    title: m('bug.j-zero.title'),
    code: variant(5, '        for (j in 0 until n) {'),
    wrongLine: 5,
    fixed: '        for (j in i + 1 until n) {',
    values: [3, 4, 1, 2],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4]' }),
    explain: m('bug.j-zero.explain'),
  },
  {
    id: 'no-tmp',
    title: m('bug.no-tmp.title'),
    code: variant(13, '            arr[minIdx] = arr[i]'),
    wrongLine: 13,
    fixed: '            arr[minIdx] = tmp',
    values: [3, 4, 1, 2],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4]' }),
    explain: m('bug.no-tmp.explain'),
  },
];

export interface BugStep extends Step {
  a: number[];
  i: number | null;
  j: number | null;
  minIdx: number | null;
  /** 'ok' 正常结束（结果可能是错的） */
  outcome: 'running' | 'ok';
}

/** 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<BugStep> {
  const a = bug.values.slice();
  const n = a.length;
  const steps: BugStep[] = [];
  let i: number | null = null, j: number | null = null, minIdx: number | null = null;
  const push = (line: number, note: Msg, extra: Partial<BugStep> = {}) => {
    steps.push({ line, a: a.slice(), i, j, minIdx, note, done: false, outcome: 'running', ...extra });
  };

  push(2, m('trace.note.n', { n }));
  for (i = 0; i < n - 1; i++) {
    j = null;
    minIdx = null;
    push(3, m('bug.note.round', { r: i + 1, i }));
    minIdx = i;
    push(4, m('bug.note.minInit', { i }));
    for (j = bug.id === 'j-zero' ? 0 : i + 1; j < n; j++) {
      const other = bug.id === 'cmp-i' ? i : minIdx;
      const name = bug.id === 'cmp-i' ? 'arr[i]' : 'arr[minIdx]';
      const less = a[j] < a[other];
      push(6, m('bug.note.cmp', { j, v: a[j], rel: less ? ' < ' : ' ≥ ', name, o: a[other], tail: m(less ? 'bug.note.yes' : 'bug.note.no') }));
      if (less) {
        minIdx = j;
        push(7, m(j < i ? 'bug.note.updOld' : 'bug.note.upd', { j }));
      }
    }
    j = null;
    push(10, m(minIdx !== i ? 'bug.note.swapYes' : 'bug.note.swapNo', { min: minIdx }));
    if (minIdx !== i) {
      const tmp = a[i];
      a[i] = a[minIdx];
      a[minIdx] = bug.id === 'no-tmp' ? a[i] : tmp;
      push(bug.id === 'no-tmp' ? 13 : 11, bug.id === 'no-tmp'
        ? m('bug.note.lost', { i, v: a[i], min: minIdx, w: a[minIdx], tmp })
        : m('bug.note.swap', { i, min: minIdx }));
    }
  }
  i = null;
  j = null;
  minIdx = null;
  push(3, m('bug.note.end', { arr: a.join(', ') }), { outcome: 'ok', done: true });
  return steps;
}

/** 找 bug 面板底部的判定：动画跑完后结果是什么 */
export function bugVerdict(step: BugStep, _bug?: Bug): Msg | null {
  return step.done ? m('bug.verdict', { arr: step.a.join(', ') }) : null;
}

const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: bug.values.join(', '), expect: bug.expect }),
  vars: (s): Var[] => [['i', s.i ?? '—'], ['j', s.j ?? '—'], ['minIdx', s.minIdx ?? '—']],
  verdict: bugVerdict,
};

/* ---------- 做：挑战 ---------- */

/** 选择排序（minIdx ≠ i 才换）实际要交换几次 */
export function selectionSwaps(input: number[]): number {
  return selectRounds(input).filter((r) => r.min !== r.i).length;
}

/**
 * 元素互不相同时，把数组排好最少要交换几次：n − 置换里环的个数。
 * 选择排序每次交换都把一个环拆成两个，所以它的交换次数正好是这个最少值。
 */
export function fewestSwaps(a: number[]): number {
  const target = a.slice().sort((x, y) => x - y);
  const seen = new Array(a.length).fill(false);
  let cycles = 0;
  for (let k = 0; k < a.length; k++) {
    if (seen[k]) continue;
    cycles++;
    for (let p = k; !seen[p]; p = target.indexOf(a[p])) seen[p] = true;
  }
  return a.length - cycles;
}

export const CHALLENGE_N = 6;

/** 挑战题：CHALLENGE_N 个互不相同的数，至少要换 3 次 */
export function genChallenge(rand: () => number = Math.random): number[] {
  for (;;) {
    const a = genCandies(CHALLENGE_N, rand);
    if (selectionSwaps(a) >= 3) return a;
  }
}

export function isSorted(a: number[]): boolean {
  return a.every((v, k) => k === 0 || a[k - 1] <= v);
}

/**
 * 挑战的状态：点两格交换，用尽量少的交换把数组排好，再和选择排序比。
 * 元素互不相同时，选择排序的交换次数就是最少的（见 fewestSwaps），所以打平就是满分。
 */
export interface ChallengeState {
  start: number[];
  a: number[];
  /** 已经点中、等着和下一格交换的那一格 */
  sel: number | null;
  moves: number;
  last: [number, number] | null;
}

export type ChallengeAction = { type: 'tap'; k: number } | { type: 'retry' } | { type: 'fresh' };

const challengeFrom = (start: number[]): ChallengeState => ({ start, a: start.slice(), sel: null, moves: 0, last: null });

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeFrom(genChallenge(rand)) }),

  act(s, a, rand) {
    if (a.type === 'fresh') return { state: challengeFrom(genChallenge(rand)) };
    if (a.type === 'retry') return { state: challengeFrom(s.start) };
    if (isSorted(s.a) || a.k < 0 || a.k >= s.a.length) return null;
    if (s.sel === null) return { state: { ...s, sel: a.k } };
    if (s.sel === a.k) return { state: { ...s, sel: null } };
    return { state: { ...s, a: swapAt(s.a, s.sel, a.k), last: [s.sel, a.k], sel: null, moves: s.moves + 1 } };
  },

  clickable: (s) => !isSorted(s.a),

  controls(s) {
    if (!isSorted(s.a)) return [{ type: 'button', action: { type: 'retry' }, label: m('chal.retry'), look: 'small', disabled: s.moves === 0 }];
    const out: Control<ChallengeAction>[] = [];
    if (s.moves > selectionSwaps(s.start)) out.push({ type: 'button', action: { type: 'retry' }, label: m('chal.again'), look: 'small' });
    out.push({ type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'smallPrimary' });
    return out;
  },

  hud: (s) => ({ chips: [[m('chal.chip'), m('chal.times', { n: s.moves })]] }),

  result(s) {
    if (!isSorted(s.a)) return null;
    const best = selectionSwaps(s.start);
    return {
      title: s.moves <= best ? m('chal.best', { moves: s.moves }) : m('chal.more', { moves: s.moves, best }),
      body: m('chal.body', { bubble: inversions(s.start) }),
    };
  },
};

/* ---------- 延伸：比较多，交换少 ---------- */

/** 「比较多，交换少」的对比图：比较次数、选择排序的交换次数、冒泡的平均交换次数（对数刻度画） */
export function compareRows() {
  return [
    { label: '10', unit: m('compare.ten'), n: 10 },
    { label: '100', unit: m('compare.hundred'), n: 100 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '10,000', unit: m('compare.tenK'), n: 10000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.cmp'), value: (r.n * (r.n - 1)) / 2, tone: 'muted' as const },
      { name: m('compare.sel'), value: r.n - 1, tone: 'accent' as const },
      { name: m('compare.bub'), value: (r.n * (r.n - 1)) / 4, tone: 'warn' as const, approx: true },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { pick: pickRules, hand: handRules, challenge: challengeRules },
};
