import type { BugInfo, LookFrame, Step, Trace } from './types';

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
  const push = (say: string, extra: Partial<LookPage>) =>
    out.push({ say, queues: [], out: null, cmp: null, moved: null, fresh: [], ...extra });

  // 第一章：合并两队
  const l = [...left];
  const r = [...right];
  const o: number[] = [];
  push('两个班各自排好队啦，矮的在前面 📏', { queues: [[...l], [...r]] });
  push('要合成一队。每次只比两个队头 👀', { queues: [[...l], [...r]], out: [] });
  let compares = 0;
  while (l.length && r.length) {
    const a = l[0];
    const b = r[0];
    compares++;
    const takeLeft = v(a) <= v(b);
    const w = takeLeft ? l.shift()! : r.shift()!;
    o.push(w);
    push(v(a) + ' 和 ' + v(b) + ' 比，' + v(w) + ' 矮，先走 🚶', { queues: [[...l], [...r]], out: [...o], cmp: [a, b], moved: w });
  }
  if (l.length || r.length) {
    o.push(...l, ...r);
    push((l.length ? '右' : '左') + '边没人了，另一边剩下的直接跟上 ➡️', { queues: [[], []], out: [...o] });
  }
  push('合成一队啦 🎉 只比了 ' + compares + ' 次', { queues: [], out: [...o] });

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
  push('这两队是怎么排好的？倒回去看 ⏪', { queues: shapes(levels[0]) });
  const splitSay = ['一队对半分 ✂️', '再对半分 ✂️', '再分 ✂️'];
  for (let d = 1; d < levels.length; d++) {
    const last = d === levels.length - 1;
    push(last ? '每队只剩 1 个。1 个当然是排好的 ✅' : splitSay[Math.min(d - 1, splitSay.length - 1)], { queues: shapes(levels[d]) });
  }
  for (let d = levels.length - 2; d >= 0; d--) {
    const lv = levels[d];
    const fresh = lv.map(([a, b], x) => (b - a > 1 ? x : -1)).filter((x) => x >= 0);
    push(d === 0 ? '最后两队合成一队，排好啦 🎉' : '两两合并，每次比队头 🔀', {
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

  const push = (c: Ctx, line: number, note: string, extra: Partial<MergeStep> = {}) => {
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
    push(c, 1, '调用 mergeSort(a, ' + lo + ', ' + hi + ')：处理区间 [' + lo + ', ' + hi + ')，共 ' + (hi - lo) + ' 个。');
    if (stack.length > MAX_DEPTH) {
      push(c, 1, '递归已经 ' + stack.length + ' 层了，区间却一直是 [' + lo + ', ' + hi + ')，永远走不到头：StackOverflowError！', {
        done: true, outcome: 'stuck',
      });
      throw new Abort();
    }
    const size = hi - lo;
    const isBase = variant === 'base' ? size < 1 : size <= 1;
    if (isBase) {
      if (size === 1) sorted[lo] = true;
      push(c, 2, baseCond + ' 成立（hi - lo = ' + size + '）：' + (size === 1 ? '只剩 1 个，不用排，直接返回。' : '区间是空的，直接返回。'));
      stack.pop();
      return;
    }
    push(c, 2, baseCond + ' 不成立（hi - lo = ' + size + '），还要继续分。');
    const mid = (lo + hi) >> 1;
    c.mid = mid;
    push(c, 3, 'mid = (' + lo + ' + ' + hi + ') / 2 = ' + mid + '。左半 [' + lo + ', ' + mid + ')，右半 [' + mid + ', ' + hi + ')。');
    push(c, 4, '先把左半 [' + lo + ', ' + mid + ') 交给 mergeSort。');
    call(lo, mid);
    push(c, 5, '左半排好了。再把右半 [' + mid + ', ' + hi + ') 交给 mergeSort。');
    call(mid, hi);
    c.tmp = Array(size).fill(null);
    c.tmpIds = Array(size).fill(null);
    push(c, 6, '左右两半都排好了，开一个临时数组 tmp，长度 hi - lo = ' + size + '。');
    c.i = lo;
    push(c, 7, 'i = lo = ' + lo + '：指着左半的队头。');
    c.j = mid;
    push(c, 8, 'j = mid = ' + mid + '：指着右半的队头。');
    c.k = 0;
    push(c, 9, 'k = 0：下一个放进 tmp 的位置。');

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
      push(c, 11, '比较 a[' + i + '] = ' + arr[i] + ' ' + op + ' a[' + j + '] = ' + arr[j] + (left ? ' 成立：取左边的。' : ' 不成立：取右边的。'), { cmp: [i, j] });
      if (left) {
        const t = take(i, 11, '左');
        push(c, 11, 'tmp[' + t.k + '] = a[' + i + ']：' + arr[i] + ' 放进 tmp，i 和 k 各加 1。', { put: t.k, src: i });
      } else {
        const t = take(j, 12, '右');
        push(c, 12, 'tmp[' + t.k + '] = a[' + j + ']：' + arr[j] + ' 放进 tmp，j 和 k 各加 1。', { put: t.k, src: j });
      }
    }
    push(c, 10, 'i < mid && j < hi 不成立：' + (c.i! >= mid ? '左半' : '右半') + '已经用完了。');
    while (c.i! < mid) {
      const i = c.i!;
      const t = take(i, 14, '左');
      push(c, 14, '左半剩下的 ' + arr[i] + ' 直接放进 tmp[' + t.k + ']。', { put: t.k, src: i });
    }
    while (c.j! < hi) {
      const j = c.j!;
      const t = take(j, 15, '右');
      push(c, 15, '右半剩下的 ' + arr[j] + ' 直接放进 tmp[' + t.k + ']。', { put: t.k, src: j });
    }
    const at = variant === 'copy0' ? 0 : lo;
    for (let x = 0; x < size; x++) {
      arr[at + x] = c.tmp[x]!;
      ids[at + x] = c.tmpIds[x]!;
    }
    for (let x = lo; x < hi; x++) sorted[x] = true;
    const wrong = variant === 'copy0' && lo > 0;
    push(c, 16, 'tmp.copyInto(a, ' + at + ')：把 tmp 整个抄回 a，从下标 ' + at + ' 开始，盖住 [' + at + ', ' + (at + size) + ')。' +
      (wrong ? '应该从 lo = ' + lo + ' 开始抄，这样盖住的是别人的位置！' : ''));
    push(c, 17, 'mergeSort(a, ' + lo + ', ' + hi + ') 结束，回到上一层。');
    stack.pop();
  }

  const c0: Ctx = { lo: 0, hi: n, mid: null, tmp: [], tmpIds: [], i: null, j: null, k: null };
  try {
    call(0, n);
  } catch (e) {
    if (e instanceof Abort) {
      if (!steps.at(-1)?.done) push(c0, 1, '步数太多，判定为死循环！', { done: true, outcome: 'stuck' });
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
  prompt: string;
  options: { value: string; label: string }[];
  answer: string;
  why: string;
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
        prompt: 'a[i] = ' + s.arr[i] + '，a[j] = ' + s.arr[j] + '。下一个放进 tmp 的来自哪边？',
        options: [{ value: 'L', label: '左边 a[i]' }, { value: 'R', label: '右边 a[j]' }],
        answer: left ? 'L' : 'R',
        why: left
          ? tie
            ? s.arr[i] + ' <= ' + s.arr[j] + ' 成立（相等时取左边，这就是稳定的关键），取 a[i]。'
            : s.arr[i] + ' <= ' + s.arr[j] + ' 成立，左边更小，取 a[i]。'
          : s.arr[i] + ' <= ' + s.arr[j] + ' 不成立，右边更小，取 a[j]。',
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
        prompt: '现在是 [' + s.lo + ', ' + s.hi + ') 在执行（第 ' + s.line + ' 行）。递归下一个处理哪个区间？',
        options: opts.map((r) => ({ value: rangeText(r), label: rangeText(r) })),
        answer: key,
        why: goLeft
          ? '第 4 行 mergeSort(a, lo, mid)：先递归左半，区间是 [lo, mid) = ' + key + '。'
          : '左半已经排好了，第 5 行 mergeSort(a, mid, hi)：轮到右半，区间是 [mid, hi) = ' + key + '。',
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
    title: '数字排对了，两个 3 却换了位置',
    code: variant(11, '        if (a[i] < a[j]) tmp[k++] = a[i++]'),
    wrongLine: 11,
    fixed: '        if (a[i] <= a[j]) tmp[k++] = a[i++]',
    values: [3, 1, 3, 2],
    suits: true,
    expect: '应该排成 [1, 2, 3♥, 3♣]，3♥ 本来在 3♣ 前面',
    explain: '两边队头相等时，< 不成立，就取了右边的，右边的 3 跑到了左边的 3 前面。结果数字是对的，但归并排序不再稳定。比较要写 <=：相等时取左边的。',
  },
  {
    id: 'copy0',
    title: '排完以后数字丢了',
    code: variant(16, '    tmp.copyInto(a, 0)'),
    wrongLine: 16,
    fixed: '    tmp.copyInto(a, lo)',
    values: [3, 4, 2, 1],
    suits: false,
    expect: '应该排成 [1, 2, 3, 4]',
    explain: 'tmp 里装的是 [lo, hi) 这一段排好的结果，要抄回 a 的 lo 开头。写成 0 的话，处理右半 [2, 4) 时，结果会盖在最左边，把左半原来的 3 和 4 盖掉了。lo 为 0 时碰巧是对的，所以最容易漏测。',
  },
  {
    id: 'base',
    title: '程序一直不结束，最后栈溢出',
    code: variant(2, '    if (hi - lo < 1) return'),
    wrongLine: 2,
    fixed: '    if (hi - lo <= 1) return',
    values: [2, 1, 3],
    suits: false,
    expect: '应该排成 [1, 2, 3]',
    explain: '区间只剩 1 个时，hi - lo = 1，< 1 不成立，没有返回。mid = (lo + hi) / 2 还是 lo，左半 [lo, lo) 是空的，右半 [lo, hi) 依然是原来那 1 个，于是同样的调用无限重复下去，直到 StackOverflowError。递归的出口必须覆盖「只剩 1 个」。',
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

/** 找 bug 面板底部的判定：动画跑完后结果是什么 */
export function bugVerdict(step: MergeStep, bug: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'stuck') return '🔁 区间永远分不完，递归停不下来，最后栈溢出（StackOverflowError）';
  if (step.outcome === 'unstable') return '⚠️ 结果 ' + showCards(step.arr, step.ids, bug.suits) + '：数字排好了，但两个 3 换了先后顺序，不稳定';
  if (step.outcome === 'wrong') return '❌ 结果 ' + showCards(step.arr, step.ids, bug.suits) + '，没排好，还丢了数';
  return '✅ 排好了';
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
