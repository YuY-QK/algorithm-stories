import { m } from '../core/i18n';
import type {
  Ask, BugInfo, BugRules, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

/* 快速排序：Lomuto 分区，每次拿区间最后一个当标杆（pivot）。
 * 「看」用体育课排队讲：标杆矮的站左边、高的站右边，标杆就站到了最终的位置。 */

/* ---------- 看：体育课排队 ---------- */

/** 「看」用的一排同学（身高），和 story.md 里的数字一致 */
export const STORY_ROW = [6, 2, 8, 4, 1, 7, 3, 5];

/** 每个同学是一个小动物，按 id 轮流取 */
export const ANIMALS = ['🐻', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🐵', '🐯', '🐷'];
export const animalOf = (id: number) => ANIMALS[id % ANIMALS.length];

/** 一个位置上的同学现在是什么状态 */
export type Kind = 'plain' | 'unseen' | 'low' | 'high' | 'pivot' | 'placed' | 'dim';

export interface StoryFrame extends LookFrame {
  /** 这一排同学的身高（按 id） */
  heights: number[];
  /** 每个位置上站着的同学 id（id 是他一开始站在第几个位置，也决定他是哪个小动物） */
  order: number[];
  /** 每个位置的状态 */
  kinds: Kind[];
  /** 正在和标杆比身高的位置 */
  cmp: number | null;
}

/**
 * 「看」的绘本画面：真的跑一遍 Lomuto 快速排序。
 * 第一次分区一个同学一页，让人看清「矮的去左边、高的留右边」；之后每次分区只放一页结果。
 */
export function lookFrames(values: number[]): StoryFrame[] {
  const n = values.length;
  const order = values.map((_, id) => id);
  const placed = values.map(() => false);
  const out: StoryFrame[] = [];
  const v = (pos: number) => values[order[pos]];
  const swap = (a: number, b: number) => ([order[a], order[b]] = [order[b], order[a]]);
  const base = (lo: number, hi: number): Kind[] =>
    values.map((_, k) => (placed[k] ? 'placed' : k < lo || k > hi ? 'dim' : 'plain'));
  const push = (say: Msg, kinds: Kind[], cmp: number | null = null) =>
    out.push({ say, heights: values, order: [...order], kinds, cmp });
  let compares = 0;

  push(m('look.start', { n }), base(0, n - 1));

  function sort(lo: number, hi: number, top: boolean) {
    if (lo > hi) return;
    if (lo === hi) {
      placed[lo] = true;
      return;
    }
    const pv = v(hi);
    let i = lo - 1;
    const kinds = (j: number): Kind[] =>
      values.map((_, k) => {
        if (placed[k]) return 'placed';
        if (k < lo || k > hi) return 'dim';
        if (k === hi) return 'pivot';
        if (k <= i) return 'low';
        if (k < j) return 'high';
        return 'unseen';
      });
    if (top) push(m('look.pivot', { pv }), kinds(lo));
    for (let j = lo; j < hi; j++) {
      compares++;
      const x = v(j);
      if (x < pv) {
        i++;
        swap(i, j);
        if (top) push(m('look.low', { x, pv }), kinds(j + 1), i);
      } else if (top) push(m('look.high', { x, pv }), kinds(j + 1), j);
    }
    swap(i + 1, hi);
    const p = i + 1;
    placed[p] = true;
    const done = values.map((_, k) => (k < lo || k > hi ? (placed[k] ? 'placed' : 'dim') : k === p ? 'placed' : k < p ? 'low' : 'high')) as Kind[];
    if (top) {
      push(m('look.done'), done);
      push(m('look.next'), values.map((_, k) => (placed[k] ? 'placed' : 'plain')));
    } else {
      push(m('look.sub', { len: hi - lo + 1, pv }), done);
    }
    sort(lo, p - 1, false);
    sort(p + 1, hi, false);
  }
  sort(0, n - 1, true);
  push(m('look.end', { n: compares }), values.map(() => 'placed'));
  return out;
}

/** 看的规则：种子是一排同学的身高，「再看一次」换一排 */
const lookRules: LookRules<number[], StoryFrame> = {
  first: STORY_ROW,
  next: (_prev, rand) => permutation(8, rand),
  frames: lookFrames,
};

/* ---------- 玩 ---------- */

/** 随机数种子（mulberry32），给要重现结果的地方用 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  const r = [...a];
  for (let k = r.length - 1; k > 0; k--) {
    const x = Math.floor(rand() * (k + 1));
    [r[k], r[x]] = [r[x], r[k]];
  }
  return r;
}

/** 玩法一「站两边」：一位标杆，七位排队的同学（身高各不相同） */
export interface StandGame {
  pivot: number;
  queue: number[];
}

/** 从 1 到 9 里取 8 个不同的身高；标杆排第 3 到第 6 矮，保证两边都有人 */
export function dealStand(rand: () => number = Math.random): StandGame {
  const picked = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand).slice(0, 8);
  const sorted = [...picked].sort((a, b) => a - b);
  const pivot = sorted[2 + Math.floor(rand() * 4)];
  return { pivot, queue: shuffle(picked.filter((x) => x !== pivot), rand) };
}

/** 比标杆矮的站左边，高的站右边（身高各不相同） */
export function sideOf(height: number, pivot: number): 'left' | 'right' {
  return height < pivot ? 'left' : 'right';
}

/** 玩法的星星：一次都没错三颗，错两次以内两颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/** 玩法二「挑个好标杆」：一排 9 位同学，身高 1 到 9 打乱 */
export const PICK_N = 9;

export function dealLine(rand: () => number = Math.random): number[] {
  return shuffle(Array.from({ length: PICK_N }, (_, k) => k + 1), rand);
}

export interface Split {
  /** 标杆在这些同学里第几矮（1 起） */
  rank: number;
  left: number;
  right: number;
}

/** 选第 idx 位同学当标杆，左边（比他矮）和右边（比他高）各有几人 */
export function splitOf(values: number[], idx: number): Split {
  const rank = values.filter((x) => x < values[idx]).length + 1;
  return { rank, left: rank - 1, right: values.length - rank };
}

/** 分得够均匀：多的那边不超过 ⌈(n−1)/2⌉ + 1（9 个人时，最多的一边不超过 5 人） */
export function isBalanced(s: Split, n: number = PICK_N): boolean {
  return Math.max(s.left, s.right) <= Math.ceil((n - 1) / 2) + 1;
}

/** 正中间身高的同学在第几个位置 */
export function medianIdx(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return values.indexOf(sorted[(values.length - 1) >> 1]);
}

/* ---------- 玩法一：站两边 ---------- */

/** 站两边的最高身高（画柱子的比例尺） */
export const STAND_MAX = 9;

/**
 * 玩法一的状态。队伍和标杆一开始就发好了（game），改不了；同学 id 是他在队里的位置，标杆的 id 是队伍长度。
 * ruler：点错以后拉出一条和标杆一样高的线，直到点对；wiggle 是点错的次数，画面按它让当前同学和标杆晃一晃、透光。
 */
export interface StandState {
  game: StandGame;
  /** 轮到队里第几位 */
  qi: number;
  left: number[];
  right: number[];
  mistakes: number;
  ruler: boolean;
  wiggle: number;
}

export type StandAction = { type: 'side'; side: 'left' | 'right' } | { type: 'again' };

/** 队里每位同学加上标杆的身高，按 id */
export const standHeights = (s: StandState) => [...s.game.queue, s.game.pivot];
export const standDone = (s: StandState) => s.qi >= s.game.queue.length;

const standAsk = (qi: number): Msg => m('stand.say.ask', { face: animalOf(qi) });

function standStart(rand?: Rand): Outcome<StandState> {
  return {
    state: { game: dealStand(rand), qi: 0, left: [], right: [], mistakes: 0, ruler: false, wiggle: 0 },
    say: standAsk(0),
  };
}

/* 玩法一「站两边」：老师选好了标杆，七位同学排队，孩子一位一位告诉他站标杆的哪一边。
   点错了不说「错了」，而是拉出一条和标杆一样高的线，让孩子自己比一比。 */
export const standRules: GameRules<StandState, StandAction> = {
  start: (rand) => standStart(rand),

  act(s, a, rand) {
    if (a.type === 'again') return standDone(s) ? standStart(rand) : null;
    if (standDone(s)) return null;
    const id = s.qi;
    const face = animalOf(id);
    if (sideOf(standHeights(s)[id], s.game.pivot) !== a.side) {
      return { state: { ...s, mistakes: s.mistakes + 1, ruler: true, wiggle: s.wiggle + 1 }, say: m('stand.say.ruler', { face }), sound: 'wrong' };
    }
    const next: StandState = {
      ...s,
      ruler: false,
      qi: s.qi + 1,
      left: a.side === 'left' ? [...s.left, id] : s.left,
      right: a.side === 'right' ? [...s.right, id] : s.right,
    };
    const done = standDone(next);
    const tail = done ? m('stand.say.allDone') : standAsk(next.qi);
    return {
      state: next,
      say: m(a.side === 'left' ? 'stand.say.placedLeft' : 'stand.say.placedRight', { face, tail }),
      sound: done ? 'win' : 'right',
    };
  },

  clickable: (s) => !standDone(s),

  controls: (s) => (standDone(s) ? [{ type: 'button', action: { type: 'again' }, label: m('stand.again'), look: 'primary' }] : []),

  result: (s) =>
    standDone(s)
      ? {
          stars: stars(s.mistakes),
          body: m('stand.body', { l: s.left.length, r: s.right.length, p: s.left.length + 1 }),
          art: { scene: 'StandNote', props: { msg: m('stand.note') } },
        }
      : null,
};

/* ---------- 玩法二：挑个好标杆 ---------- */

/** 挑好标杆一共三回合 */
export const PICK_ROUNDS = 3;

/**
 * 玩法二的状态。每回合发一排九位同学，孩子点一位当标杆，立刻看到左右各站了几个人。
 * order、kinds 是点了以后同学重新排好的样子；tries 是这一回合点过几次不均匀的，两次以后正中间那位透光。
 * phase：pick 等孩子点；bad 一边挤了，等「换一位」；good 分均匀了，等「下一回」；end 三回合都过关。
 */
export interface PickState {
  values: number[];
  order: number[];
  kinds: Kind[];
  picked: number | null;
  split: Split | null;
  phase: 'pick' | 'bad' | 'good' | 'end';
  round: number;
  tries: number;
  mistakes: number;
}

export type PickAction = { type: 'pick'; id: number } | { type: 'retry' } | { type: 'next' } | { type: 'again' };

const plainLine = (values: number[]) => ({ order: values.map((_, k) => k), kinds: values.map((): Kind => 'plain'), picked: null, split: null });

function pickRound(s: PickState, round: number, rand?: Rand): Outcome<PickState> {
  const values = dealLine(rand);
  return {
    state: { ...s, ...plainLine(values), values, round, tries: 0, phase: 'pick' },
    say: m('pick.say.round', { n: round }),
  };
}

function pickStart(rand?: Rand): Outcome<PickState> {
  const values = dealLine(rand);
  return pickRound(
    { values, ...plainLine(values), phase: 'pick', round: 1, tries: 0, mistakes: 0 },
    1,
    rand,
  );
}

/** 此刻透光的同学：试了两次还没找到，正中间那位 */
export const pickGlow = (s: PickState): number | null => (s.phase === 'pick' && s.tries >= 2 ? medianIdx(s.values) : null);

/* 玩法二「挑个好标杆」：一边挤、一边空就再换一位；试两次还没找到时，正中间那位会透出光。
   三回合，最后自己发现：标杆身高在中间，两边最均匀。 */
export const pickRules: GameRules<PickState, PickAction> = {
  start: (rand) => pickStart(rand),

  act(s, a, rand) {
    switch (a.type) {
      case 'pick': {
        if (s.phase !== 'pick' || a.id < 0 || a.id >= s.values.length) return null;
        const v = s.values;
        const ids = v.map((_, k) => k);
        const lows = ids.filter((x) => v[x] < v[a.id]);
        const highs = ids.filter((x) => v[x] > v[a.id]);
        const split = splitOf(v, a.id);
        const laid = {
          order: [...lows, a.id, ...highs],
          kinds: [...lows.map((): Kind => 'low'), 'pivot' as Kind, ...highs.map((): Kind => 'high')],
          picked: a.id,
          split,
        };
        if (isBalanced(split, PICK_N)) {
          return { state: { ...s, ...laid, phase: 'good' }, say: m('pick.say.good', { l: split.left, r: split.right }), sound: 'right' };
        }
        const small = Math.min(split.left, split.right);
        return {
          state: { ...s, ...laid, phase: 'bad', mistakes: s.mistakes + 1, tries: s.tries + 1 },
          say: small === 0 ? m('pick.say.empty') : m('pick.say.heavy', { big: Math.max(split.left, split.right), small }),
          sound: 'wrong',
        };
      }
      case 'retry':
        if (s.phase !== 'bad') return null;
        return {
          state: { ...s, ...plainLine(s.values), phase: 'pick' },
          say: m(s.tries >= 2 ? 'pick.say.retryGlow' : 'pick.say.retry'),
        };
      case 'next':
        if (s.phase !== 'good') return null;
        if (s.round >= PICK_ROUNDS) return { state: { ...s, phase: 'end' }, say: m('pick.say.end'), sound: 'win' };
        return pickRound(s, s.round + 1, rand);
      case 'again':
        return s.phase === 'end' ? pickStart(rand) : null;
    }
  },

  clickable: (s) => s.phase === 'pick',

  controls(s) {
    if (s.phase === 'bad') return [{ type: 'button', action: { type: 'retry' }, label: m('pick.retry'), look: 'primary' }];
    if (s.phase === 'good') {
      return [{ type: 'button', action: { type: 'next' }, label: m(s.round >= PICK_ROUNDS ? 'pick.finish' : 'pick.next'), look: 'primary' }];
    }
    if (s.phase === 'end') return [{ type: 'button', action: { type: 'again' }, label: m('pick.again'), look: 'primary' }];
    return [];
  },

  result: (s) =>
    s.phase === 'end'
      ? { stars: stars(s.mistakes), art: { scene: 'PickLesson', props: { a: m('pick.lesson1'), b: m('pick.lesson2'), c: m('pick.lesson3'), note: m('pick.note') } } }
      : null,
};

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun quickSort(arr: IntArray, lo: Int = 0, hi: Int = arr.size - 1) {',
  '    if (lo >= hi) return',
  '    val p = partition(arr, lo, hi)',
  '    quickSort(arr, lo, p - 1)',
  '    quickSort(arr, p + 1, hi)',
  '}',
  '',
  'fun partition(arr: IntArray, lo: Int, hi: Int): Int {',
  '    val pivot = arr[hi]',
  '    var i = lo - 1',
  '    for (j in lo until hi) {',
  '        if (arr[j] < pivot) {',
  '            i++',
  '            swap(arr, i, j)',
  '        }',
  '    }',
  '    swap(arr, i + 1, hi)',
  '    return i + 1',
  '}',
  '',
  'fun swap(arr: IntArray, a: Int, b: Int) {',
  '    val t = arr[a]; arr[a] = arr[b]; arr[b] = t',
  '}',
];

export interface QuickStep extends Step {
  arr: number[];
  /** 当前这次 quickSort 调用的区间 [lo, hi]；还没进入任何调用是 null */
  lo: number | null;
  hi: number | null;
  i: number | null;
  j: number | null;
  /** 标杆的值；还没取标杆是 null */
  pivot: number | null;
  /** 标杆现在的下标：分区过程中是 hi，换到中间以后是 p */
  pivotAt: number | null;
  /** 分区已经结束（标杆换到了中间） */
  pdone: boolean;
  /** 已经站在最终位置上的下标 */
  placed: boolean[];
  /** 递归调用栈，栈底是最外层，最后一个是当前调用 */
  stack: [number, number][];
  /** arr[j] < pivot 比较了几次 */
  compares: number;
  /** swap 执行了几次（自己和自己换也算） */
  swaps: number;
  /** quickSort 被调用了几次（空区间也算） */
  calls: number;
  /** 递归栈最深有几层 */
  maxDepth: number;
  /** 这一步刚换过的两个下标 */
  swapped: [number, number] | null;
  /** running：还在跑；ok：排对了；wrong：没排好；crash：下标越界；overflow：递归太深（栈溢出）；stuck：步数太多 */
  outcome: 'running' | 'ok' | 'wrong' | 'crash' | 'overflow' | 'stuck';
}

/** 正确版本和三个 bug 版本，只差一行 */
export type Variant = 'ok' | 'incl-pivot' | 'reversed' | 'swap-i';

const MAX_STEPS = 20000;

export function isSorted(a: number[]): boolean {
  for (let k = 1; k < a.length; k++) if (a[k - 1] > a[k]) return false;
  return true;
}

class Abort extends Error {}

/** 按某个版本的代码逐行执行。行号对应 CODE（bug 版本只改了一行，行号不变） */
export function simulate(values: number[], variant: Variant = 'ok'): Trace<QuickStep> {
  const arr = [...values];
  const n = arr.length;
  const steps: QuickStep[] = [];
  const placed = arr.map(() => false);
  const stack: [number, number][] = [];
  let compares = 0;
  let swaps = 0;
  let calls = 0;
  let maxDepth = 0;
  let lo: number | null = null;
  let hi: number | null = null;
  let i: number | null = null;
  let j: number | null = null;
  let pivot: number | null = null;
  let pivotAt: number | null = null;
  let pdone = false;
  let swapped: [number, number] | null = null;

  const push = (line: number, note: Msg, extra: Partial<QuickStep> = {}) => {
    steps.push({
      line, note, done: false, arr: [...arr], lo, hi, i, j, pivot, pivotAt, pdone, placed: [...placed],
      stack: stack.map((s) => [...s] as [number, number]), compares, swaps, calls, maxDepth, swapped,
      outcome: 'running', ...extra,
    });
    swapped = null;
    if (steps.length > MAX_STEPS && !extra.done) {
      push(line, m('trace.note.stuck'), { done: true, outcome: 'stuck' });
      throw new Abort();
    }
  };
  const fail = (line: number, note: Msg, outcome: QuickStep['outcome']): never => {
    push(line, note, { done: true, outcome });
    throw new Abort();
  };
  const enter = (l: number, h: number) => {
    lo = l; hi = h; i = null; j = null; pivot = null; pivotAt = null; pdone = false;
  };

  function qs(l: number, h: number, line: number) {
    stack.push([l, h]);
    calls++;
    maxDepth = Math.max(maxDepth, stack.length);
    enter(l, h);
    if (stack.length > n + 2) {
      fail(line, m('trace.note.overflow', { l, h }), 'overflow');
    }
    if (l >= h) {
      if (l === h) placed[l] = true;
      push(2, l === h ? m('trace.note.single', { l }) : m('trace.note.empty', { l, h }));
      stack.pop();
      return;
    }
    push(2, m('trace.note.call', { l, h, len: h - l + 1 }));
    push(3, m('trace.note.part', { l, h }));
    // partition
    pivot = arr[h];
    pivotAt = h;
    push(9, m('trace.note.pivot', { h, pivot }));
    i = l - 1;
    push(10, m('trace.note.i0', { i }));
    const lt = variant === 'reversed' ? '>' : '<';
    for (let jj = l; jj < h; jj++) {
      j = jj;
      push(11, m('trace.note.look', { j: jj, v: arr[jj] }));
      compares++;
      const hit = variant === 'reversed' ? arr[jj] > pivot : arr[jj] < pivot;
      push(12, m(hit ? 'trace.note.cmpYes' : 'trace.note.cmpNo', { j: jj, v: arr[jj], lt, pivot }));
      if (hit) {
        i++;
        push(13, m('trace.note.inc', { i }));
        [arr[i], arr[jj]] = [arr[jj], arr[i]];
        swaps++;
        push(14, i === jj ? m('trace.note.swapSelf', { i, j: jj }) : m('trace.note.swapMove', { i, j: jj, v: arr[i] }), { swapped: [i, jj] });
      }
    }
    j = h;
    push(11, m('trace.note.jEnd', { h }));
    j = null;
    const t = variant === 'swap-i' ? i : i + 1;
    const tText = variant === 'swap-i' ? 'i' : 'i + 1';
    if (t < 0) fail(17, m('trace.note.crash', { at: tText, h, t }), 'crash');
    [arr[t], arr[h]] = [arr[h], arr[t]];
    swaps++;
    const p = i + 1;
    const pa = variant === 'swap-i' ? t : p;
    pivotAt = pa;
    pdone = true;
    placed[p] = true;
    push(17, m('trace.note.land', { at: tText, h, pivot, where: t === h ? m('trace.note.landStay') : m('trace.note.landMove', { t }) }), { swapped: [t, h] });
    push(18, m('trace.note.ret', { p }));
    // 递归
    const leftHi = variant === 'incl-pivot' ? p : p - 1;
    push(4, m('trace.note.left', { l, leftHi, tail: m(variant === 'incl-pivot' ? 'trace.note.leftIncl' : 'trace.note.leftOk') }));
    qs(l, leftHi, 4);
    enter(l, h);
    pdone = true;
    pivotAt = pa;
    push(5, m('trace.note.right', { p1: p + 1, h }));
    qs(p + 1, h, 5);
    enter(l, h);
    pdone = true;
    pivotAt = pa;
    stack.pop();
  }

  try {
    qs(0, n - 1, 1);
    lo = hi = null;
    const ok = isSorted(arr);
    push(6, m(ok ? 'trace.note.endOk' : 'trace.note.endBad'), { done: true, outcome: ok ? 'ok' : 'wrong' });
  } catch (e) {
    if (!(e instanceof Abort)) throw e;
  }
  return steps;
}

/** 正确版本的逐步执行 */
export function buildTrace(values: number[]): Trace<QuickStep> {
  return simulate(values, 'ok');
}

/** 某一步里第 k 个位置是什么状态，界面据此上色 */
export function zoneOf(s: QuickStep, k: number): Kind {
  if (s.placed[k] && !(s.pivotAt === k && !s.pdone)) return 'placed';
  if (s.lo === null || s.hi === null || k < s.lo || k > s.hi) return 'dim';
  if (s.pivot === null) return 'plain';
  if (s.pdone) return k === s.pivotAt ? 'pivot' : s.pivotAt === null || k < s.pivotAt ? 'low' : 'high';
  if (k === s.pivotAt) return 'pivot';
  if (s.i === null) return 'unseen';
  // 第 13 行 i++ 刚做完、还没交换：新腾出的位置里还是别人，先不算进小队
  const i = s.line === 13 ? s.i - 1 : s.i;
  if (k <= i) return 'low';
  if (s.j !== null && k < s.j) return 'high';
  return 'unseen';
}

/** 随机数组，值在 1..max，可能有重复 */
export function genArray(n: number, max = 20, rand: () => number = Math.random): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(rand() * max));
}

/** 随机排列 1..n */
export function permutation(n: number, rand: () => number = Math.random): number[] {
  return shuffle(Array.from({ length: n }, (_, k) => k + 1), rand);
}

/** 逐步执行面板的输入：数组、数组大小和初始顺序（改大小或顺序就换一个新数组） */
export type TraceKind = 'random' | 'sorted' | 'dup';
export interface TraceInput {
  values: number[];
  size: number;
  kind: TraceKind;
}

export type TraceAction = { type: 'size'; n: number } | { type: 'kind'; kind: TraceKind } | { type: 'fresh' };

/** 按大小和初始顺序出一个数组 */
export function makeValues(n: number, kind: TraceKind, rand?: Rand): number[] {
  if (kind === 'sorted') return makeInput('sorted', n).map((v) => v * 3);
  if (kind === 'dup') return genArray(n, 3, rand).map((v) => v * 4);
  return permutation(n, rand).map((v) => v * 3);
}

const KINDS_TRACE: TraceKind[] = ['random', 'sorted', 'dup'];

/** 做：逐步执行。看 partition 里 i、j 怎么走，看标杆站定，看调用栈怎么一层层压下去又弹出来 */
export const traceRules: TraceRules<TraceInput, QuickStep, TraceAction> = {
  code: CODE,
  start: (rand) => ({ size: 8, kind: 'random', values: makeValues(8, 'random', rand) }),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return { ...input, size: a.n, values: makeValues(a.n, input.kind, rand) };
      case 'kind': return { ...input, kind: a.kind, values: makeValues(input.size, a.kind, rand) };
      case 'fresh': return { ...input, values: makeValues(input.size, input.kind, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [6, 8, 10].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    {
      type: 'segmented', legend: m('trace.shape'), value: input.kind,
      options: KINDS_TRACE.map((k) => ({ value: k, label: m('trace.shape.' + k) })),
      choose: (v) => ({ type: 'kind', kind: v as TraceKind }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.values),
  vars: (_input, s): Var[] => [
    ['lo', s.lo ?? '—'], ['hi', s.hi ?? '—'], ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['pivot', s.pivot ?? '—'],
    [m('trace.v.compares'), m('trace.times', { n: s.compares })], [m('trace.v.swaps'), m('trace.times', { n: s.swaps })],
    [m('trace.v.depth'), s.stack.length],
  ],
  summary(input, s) {
    if (!s.done) return null;
    const n = input.values.length;
    return m('trace.summary', {
      compares: s.compares, swaps: s.swaps, calls: s.calls, depth: s.maxDepth, n, max: (n * (n - 1)) / 2,
      tail: input.kind === 'sorted' ? m('trace.summary.sorted', { depth: s.maxDepth }) : input.kind === 'dup' ? m('trace.summary.dup') : '',
    });
  },
  jump: { label: m('trace.jump'), stop: (x) => x.line === 18 || x.done },
  foot: m('trace.foot'),
};

/* ---------- 做：猜下一步 ---------- */

export type Round =
  /** j 指着的元素要不要换？要换的话，换到哪个下标。why：「要不要换」答错的解释；whyTarget：点错下标的解释 */
  | { kind: 'swap'; at: number; step: QuickStep; will: boolean; target: number; prompt: Msg; targetPrompt: Msg; why: Msg; whyTarget: Msg }
  /** 循环结束，标杆要换到哪个下标 */
  | { kind: 'land'; at: number; step: QuickStep; target: number; prompt: Msg; why: Msg }
  /** 分区结束，接着递归哪两个区间 */
  | { kind: 'ranges'; at: number; step: QuickStep; p: number; prompt: Msg; why: Msg; options: { text: Msg; ok: boolean }[] };

const pick = <T>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

/** swap 题答错的解释：j 指着的元素和标杆比一比 */
function whyWill(s: QuickStep): Msg {
  const v = s.arr[s.j!];
  const pv = s.pivot!;
  if (v < pv) return m('why.will.yes', { v, pv });
  return m(v === pv ? 'why.will.eq' : 'why.will.gt', { v, pv });
}

/** swap 题点错下标的解释 */
function whySwapTarget(s: QuickStep, target: number): Msg {
  return m('why.target', {
    i: s.i!, target,
    tail: target === s.j ? m('why.target.self') : m('why.target.other', { x: s.arr[target] }),
  });
}

/** land 题答错的解释 */
function whyLand(s: QuickStep, target: number): Msg {
  return m('why.land', { i: s.i!, lo: s.lo!, target, tail: target === s.hi ? m('why.land.max') : '' });
}

/** ranges 题答错的解释 */
function whyRanges(p: number): Msg {
  return m('why.ranges', { p });
}

/** 用一个数组出四道题：两道「换不换」、一道「标杆落在哪」、一道「递归哪两个区间」 */
export function rounds(values: number[], rand: () => number = Math.random): Round[] {
  const steps = buildTrace(values);
  const big = (s: QuickStep) => s.hi! - s.lo! + 1 >= 4;
  const prefer = <T extends QuickStep>(list: T[]) => (list.some(big) ? list.filter(big) : list);

  const loops = steps.filter((s) => s.line === 11 && s.j !== null && s.j < s.hi!);
  const yes = prefer(loops.filter((s) => s.arr[s.j!] < s.pivot!));
  const no = prefer(loops.filter((s) => !(s.arr[s.j!] < s.pivot!)));
  const chosen: QuickStep[] = [];
  if (yes.length) chosen.push(pick(yes, rand));
  if (no.length) chosen.push(pick(no, rand));
  while (chosen.length < 2 && loops.length) chosen.push(pick(loops, rand));
  const swapQs: Round[] = chosen.map((step) => {
    const target = step.i! + 1;
    return {
      kind: 'swap', at: steps.indexOf(step), step, will: step.arr[step.j!] < step.pivot!, target,
      prompt: m('predict.swap', { j: step.j!, v: step.arr[step.j!], pivot: step.pivot! }),
      targetPrompt: m('predict.target', { target }),
      why: whyWill(step), whyTarget: whySwapTarget(step, target),
    };
  });

  const ends = prefer(steps.filter((s) => s.line === 11 && s.j !== null && s.j === s.hi));
  const returns = steps.filter((s) => s.line === 18);
  const inner = returns.filter((s) => s.pivotAt! > s.lo! && s.pivotAt! < s.hi!);
  const out: Round[] = [...swapQs];
  if (ends.length) {
    const step = pick(ends, rand);
    const target = step.i! + 1;
    out.push({
      kind: 'land', at: steps.indexOf(step), step, target,
      prompt: m('predict.land', { i: step.i!, pivot: step.pivot! }),
      why: whyLand(step, target),
    });
  }
  const rs = inner.length ? pick(prefer(inner), rand) : returns.length ? pick(returns, rand) : null;
  if (rs) {
    const l = rs.lo!, h = rs.hi!, p = rs.pivotAt!;
    const text = (a: number, b: number, c: number, d: number) => m('predict.range', { a, b, c, d });
    out.push({
      kind: 'ranges', at: steps.indexOf(rs), step: rs, p,
      prompt: m('predict.ranges', { p, pv: rs.arr[p] }),
      why: whyRanges(p),
      options: shuffle([
        { text: text(l, p - 1, p + 1, h), ok: true },
        { text: text(l, p, p + 1, h), ok: false },
        { text: text(l, p - 1, p, h), ok: false },
      ], rand),
    });
  }
  return shuffle(out, rand);
}

/** 猜下一步画面的样子：动画停在的那一步，答错后在 hit 那一格标出正确答案 */
export interface PredictView {
  step: QuickStep;
  hit: number | null;
}

/** 猜下一步的数组：7 个数，值在 1 到 12，可能有重复 */
export const PREDICT_N = 7;
export const PREDICT_MAX = 12;

/**
 * 把一道题排成一问接一问。「换不换」答对且要换时，接着问换到哪一格（前半问：不计连对，答错就不用再问了）；
 * 答完最后一问直接换下一道题，没有结局页。
 */
export function makePuzzle(values: number[], rand: () => number = Math.random): Puzzle<PredictView, unknown> {
  const list = rounds(values, rand);
  const asks = list.flatMap((r): Ask<PredictView, unknown>[] => {
    const view: PredictView = { step: r.step, hit: null };
    const chips: Var[] = [['lo, hi', `${r.step.lo}, ${r.step.hi}`]];
    if (r.kind === 'swap') {
      const will = {
        view, chips, prompt: r.prompt, kind: 'choose' as const, answer: r.will as unknown, why: r.why, half: r.will,
        options: [{ value: true as unknown, label: m('predict.yes') }, { value: false as unknown, label: m('predict.no') }],
      };
      const target = {
        view, chips, prompt: r.targetPrompt, kind: 'pick' as const, answer: r.target as unknown, why: r.whyTarget,
        reveal: { view: { step: r.step, hit: r.target }, prompt: r.targetPrompt },
      };
      return r.will ? [will, target] : [will];
    }
    if (r.kind === 'land') {
      return [{
        view, chips, prompt: r.prompt, kind: 'pick' as const, answer: r.target as unknown, why: r.why,
        reveal: { view: { step: r.step, hit: r.target }, prompt: r.prompt },
      }];
    }
    return [{
      view, chips, prompt: r.prompt, kind: 'choose' as const, answer: true as unknown, why: r.why,
      options: r.options.map((o) => ({ value: o.ok as unknown, label: o.text })),
    }];
  });
  const last = asks[asks.length - 1];
  return { asks, end: { view: last.view, prompt: last.prompt }, endless: true };
}

const predictRules: PredictRules<PredictView, unknown> = {
  goal: 6,
  continueLabel: m('predict.cont'),
  puzzle: (rand = Math.random) => makePuzzle(genArray(PREDICT_N, PREDICT_MAX, rand), rand),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: Exclude<Variant, 'ok'>;
  /** code 是有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  values: number[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'incl-pivot',
    title: m('bug.incl.title'),
    code: variant(4, '    quickSort(arr, lo, p)'),
    wrongLine: 4,
    fixed: '    quickSort(arr, lo, p - 1)',
    values: [3, 1, 2, 4],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4]' }),
    explain: m('bug.incl.explain'),
  },
  {
    id: 'reversed',
    title: m('bug.rev.title'),
    code: variant(12, '        if (arr[j] > pivot) {'),
    wrongLine: 12,
    fixed: '        if (arr[j] < pivot) {',
    values: [4, 2, 5, 1, 3],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4, 5]' }),
    explain: m('bug.rev.explain'),
  },
  {
    id: 'swap-i',
    title: m('bug.swap.title'),
    code: variant(17, '    swap(arr, i, hi)'),
    wrongLine: 17,
    fixed: '    swap(arr, i + 1, hi)',
    values: [3, 5, 1, 4, 2],
    expect: m('bug.expect', { arr: '[1, 2, 3, 4, 5]' }),
    explain: m('bug.swap.explain'),
  },
];

/** 按 bug 版本的代码执行 */
export function runBug(bug: Bug): Trace<QuickStep> {
  return simulate(bug.values, bug.id);
}

/** 找 bug 面板底部的判定（跑到最后一步才有，没跑完是 null） */
export function bugVerdict(s: QuickStep, _bug?: Bug): Msg | null {
  if (!s.done) return null;
  if (s.outcome === 'overflow') return m('bug.verdict.overflow', { depth: s.stack.length });
  if (s.outcome === 'crash') return m('bug.verdict.crash');
  if (s.outcome === 'stuck') return m('bug.verdict.stuck');
  if (s.outcome === 'wrong') return m('bug.verdict.wrong', { arr: '[' + s.arr.join(', ') + ']' });
  return m('bug.verdict.ok');
}

const bugRules: BugRules<Bug, QuickStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: '[' + bug.values.join(', ') + ']', expect: bug.expect }),
  vars: (s): Var[] => [
    ['lo', s.lo ?? '—'], ['hi', s.hi ?? '—'], ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['pivot', s.pivot ?? '—'], [m('trace.v.depth'), s.stack.length],
  ],
  verdict: bugVerdict,
  jump: { label: m('bug.jump'), stop: (x) => x.done },
};

/* ---------- 做：挑战 ---------- */

/** 挑战预测题里每个数组的长度，和可选的比较次数 */
export const CHALLENGE_N = 10;
export const CHALLENGE_OPTIONS = [9, 20, 45, 90];

export interface ChallengeQ {
  name: Msg;
  arr: number[];
}

/** 预测题：已排好、完全倒序、全是同一个数（这个数每次随机，2 到 9）。这三种在「固定拿最后一个」下比较次数一样 */
export function genChallenge(rand: () => number = Math.random): ChallengeQ[] {
  const n = CHALLENGE_N;
  const same = 2 + Math.floor(rand() * 8);
  return [
    { name: m('chal.name.sorted', { n }), arr: Array.from({ length: n }, (_, k) => k + 1) },
    { name: m('chal.name.reversed', { n, n1: n - 1, n2: n - 2 }), arr: Array.from({ length: n }, (_, k) => n - k) },
    { name: m('chal.name.same', { v: same }), arr: Array.from({ length: n }, () => same) },
  ];
}

export type Strategy = 'last' | 'random' | 'median3';
export const STRATEGY_NAME: Record<Strategy, Msg> = {
  last: m('strategy.last'),
  random: m('strategy.random'),
  median3: m('strategy.median3'),
};
export type InputKind = 'sorted' | 'reversed' | 'random';
export const INPUT_NAME: Record<InputKind, Msg> = {
  sorted: m('input.sorted'),
  reversed: m('input.reversed'),
  random: m('input.random'),
};

export function makeInput(kind: InputKind, n: number, rand: () => number = Math.random): number[] {
  const asc = Array.from({ length: n }, (_, k) => k + 1);
  if (kind === 'sorted') return asc;
  if (kind === 'reversed') return asc.reverse();
  return permutation(n, rand);
}

/**
 * 数一数快速排序一共比较了几次（只数 arr[j] < pivot）。
 * 用显式的栈，数组再大也不会爆调用栈。strategy 决定标杆怎么选：选好以后先换到最右边，再按 Lomuto 分区。
 */
export function countCompares(values: number[], strategy: Strategy, rand: () => number = Math.random) {
  const a = [...values];
  const todo: [number, number, number][] = [[0, a.length - 1, 1]];
  let compares = 0;
  let maxDepth = 0;
  while (todo.length) {
    const [lo, hi, d] = todo.pop()!;
    maxDepth = Math.max(maxDepth, d);
    if (lo >= hi) continue;
    let at = hi;
    if (strategy === 'random') at = lo + Math.floor(rand() * (hi - lo + 1));
    else if (strategy === 'median3') {
      const mid = (lo + hi) >> 1;
      const cand = [lo, mid, hi].sort((x, y) => a[x] - a[y]);
      at = cand[1];
    }
    [a[at], a[hi]] = [a[hi], a[at]];
    const pv = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      compares++;
      if (a[j] < pv) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    todo.push([lo, i, d + 1], [i + 2, hi, d + 1]);
  }
  return { compares, maxDepth, sorted: isSorted(a) };
}

/** 已经有序（或倒序），每次拿最后一个当标杆：n(n − 1)/2 次 */
export const worstCompares = (n: number) => (n * (n - 1)) / 2;

/** 同一种输入、同一种选标杆的办法，跑 runs 次取平均比较次数（输入是随机的就每次重新打乱） */
export function averageCompares(kind: InputKind, n: number, strategy: Strategy, runs: number, rand: () => number = Math.random): number {
  const times = kind === 'random' || strategy === 'random' ? runs : 1;
  let sum = 0;
  for (let r = 0; r < times; r++) sum += countCompares(makeInput(kind, n, rand), strategy, rand).compares;
  return sum / times;
}

/** 这一题的正确答案：固定拿最后一个当标杆，一共比较几次 */
export const challengeAnswer = (q: ChallengeQ) => countCompares(q.arr, 'last').compares;

/** 这一题每次分区各比较几次（第一次分区的区间大小，和比较次数） */
export function challengeRounds(q: ChallengeQ): { size: number; cmp: number }[] {
  return buildTrace(q.arr).filter((s) => s.line === 3).map((s) => ({ size: s.hi! - s.lo! + 1, cmp: s.hi! - s.lo! }));
}

/** 对比表可选的数组大小 */
export const TABLE_SIZES = [10, 100, 1000];
export const TABLE_KINDS: InputKind[] = ['sorted', 'reversed', 'random'];
export const TABLE_STRATEGIES: Strategy[] = ['last', 'random', 'median3'];

/** 对比表：每种输入（行）、每种选标杆的办法（列）的平均比较次数。固定种子，同样的大小结果一样 */
export function challengeTable(size: number): number[][] {
  const rand = seeded(2024);
  const runs = size >= 1000 ? 5 : 20;
  return TABLE_KINDS.map((kind) => TABLE_STRATEGIES.map((st) => averageCompares(kind, size, st, runs, rand)));
}

/**
 * 挑战的状态：先预测三种输入各要比较几次（qi 是第几题，picked 是选的，right 是答对几题），
 * 全答完（finished）看对比表，size 是表里的数组大小。
 */
export interface ChallengeState {
  qs: ChallengeQ[];
  qi: number;
  picked: number | null;
  right: number;
  finished: boolean;
  size: number;
}

export type ChallengeAction = { type: 'pick'; n: number } | { type: 'next' } | { type: 'size'; n: number } | { type: 'again' };

const challengeStart = (rand?: Rand): ChallengeState => ({ qs: genChallenge(rand), qi: 0, picked: null, right: 0, finished: false, size: 100 });

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeStart(rand) }),

  act(s, a, rand) {
    switch (a.type) {
      case 'pick':
        if (s.finished || s.picked !== null) return null;
        return { state: { ...s, picked: a.n, right: s.right + (a.n === challengeAnswer(s.qs[s.qi]) ? 1 : 0) } };
      case 'next':
        if (s.finished || s.picked === null) return null;
        return s.qi >= s.qs.length - 1 ? { state: { ...s, finished: true } } : { state: { ...s, qi: s.qi + 1, picked: null } };
      case 'size':
        return s.finished && TABLE_SIZES.includes(a.n) ? { state: { ...s, size: a.n } } : null;
      case 'again':
        return s.finished ? { state: challengeStart(rand) } : null;
    }
  },

  // 选项、结果、对比表都在画面里（要标出对错、画条形），按钮和选择由画面发出操作
  clickable: (s) => !s.finished && s.picked === null,

  controls: () => [],
};

/* ---------- 延伸：快还是慢，看标杆选得好不好 ---------- */

/** 比较次数：对已经排好的数组，三种选标杆的办法。固定种子，每次结果一样 */
export function compareRows() {
  const rand = seeded(2024);
  return [
    { label: '10', unit: m('compare.class'), n: 10 },
    { label: '100', unit: m('compare.hundred'), n: 100 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '10,000', unit: m('compare.tenK'), n: 10000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.last'), value: averageCompares('sorted', r.n, 'last', 1, rand), tone: 'warn' as const },
      { name: m('compare.random'), value: averageCompares('sorted', r.n, 'random', 5, rand), tone: 'accent' as const, approx: true },
      { name: m('compare.median3'), value: averageCompares('sorted', r.n, 'median3', 1, rand), tone: 'muted' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { stand: standRules, pick: pickRules, challenge: challengeRules },
};
