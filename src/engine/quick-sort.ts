import type { BugInfo, LookFrame, Step, Trace } from './types';

/* 快速排序：Lomuto 分区，每次拿区间最后一个当标杆（pivot）。
 * 「看」用体育课排队讲：标杆矮的站左边、高的站右边，标杆就站到了最终的位置。 */

/* ---------- 看：体育课排队 ---------- */

/** 「看」用的一排同学（身高），和 story.md 里的数字一致 */
export const STORY_ROW = [6, 2, 8, 4, 1, 7, 3, 5];

/** 一个位置上的同学现在是什么状态 */
export type Kind = 'plain' | 'unseen' | 'low' | 'high' | 'pivot' | 'placed' | 'dim';

export interface StoryFrame extends LookFrame {
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
  const push = (say: string, kinds: Kind[], cmp: number | null = null) =>
    out.push({ say, order: [...order], kinds, cmp });
  let compares = 0;

  push(n + ' 个同学排成一排，高矮不齐 👀', base(0, n - 1));

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
    if (top) push('体育老师点了最右边的 ' + pv + ' 当标杆 🚩', kinds(lo));
    for (let j = lo; j < hi; j++) {
      compares++;
      const x = v(j);
      if (x < pv) {
        i++;
        swap(i, j);
        if (top) push(x + ' 比标杆 ' + pv + ' 矮，去左边那队 ⬅️', kinds(j + 1), i);
      } else if (top) push(x + ' 比标杆 ' + pv + ' 高，先留在右边 ➡️', kinds(j + 1), j);
    }
    swap(i + 1, hi);
    const p = i + 1;
    placed[p] = true;
    const done = values.map((_, k) => (k < lo || k > hi ? (placed[k] ? 'placed' : 'dim') : k === p ? 'placed' : k < p ? 'low' : 'high')) as Kind[];
    if (top) {
      push('问完啦！标杆站到中间，不用再动 ✨', done);
      push('左右两队，各自再选一位标杆 🚩', values.map((_, k) => (placed[k] ? 'placed' : 'plain')));
    } else {
      const len = hi - lo + 1;
      push('这队 ' + len + ' 人，' + pv + ' 当标杆，分好队，' + pv + ' 站定 ✨', done);
    }
    sort(lo, p - 1, false);
    sort(p + 1, hi, false);
  }
  sort(0, n - 1, true);
  push('每个人都站到了自己的位置 🎉 一共和标杆比了 ' + compares + ' 次身高', values.map(() => 'placed'));
  return out;
}

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

  const push = (line: number, note: string, extra: Partial<QuickStep> = {}) => {
    steps.push({
      line, note, done: false, arr: [...arr], lo, hi, i, j, pivot, pivotAt, pdone, placed: [...placed],
      stack: stack.map((s) => [...s] as [number, number]), compares, swaps, calls, maxDepth, swapped,
      outcome: 'running', ...extra,
    });
    swapped = null;
    if (steps.length > MAX_STEPS && !extra.done) {
      push(line, '步数太多，判定为死循环！', { done: true, outcome: 'stuck' });
      throw new Abort();
    }
  };
  const fail = (line: number, note: string, outcome: QuickStep['outcome']): never => {
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
      fail(line, 'quickSort(' + l + ', ' + h + ') 又调用了自己，区间一模一样，递归越叠越深：StackOverflowError！', 'overflow');
    }
    if (l >= h) {
      if (l === h) placed[l] = true;
      push(2, l === h ? 'lo = hi = ' + l + '：区间只剩 1 个，它就在最终位置上，直接返回。' : 'lo = ' + l + ' > hi = ' + h + '：空区间，直接返回。');
      stack.pop();
      return;
    }
    push(2, 'quickSort(' + l + ', ' + h + ')：lo < hi，区间有 ' + (h - l + 1) + ' 个，继续。');
    push(3, 'p = partition(arr, ' + l + ', ' + h + ')：先分区。');
    // partition
    pivot = arr[h];
    pivotAt = h;
    push(9, 'pivot = arr[' + h + '] = ' + pivot + '：最右边的当标杆。');
    i = l - 1;
    push(10, 'i = lo - 1 = ' + i + '：i 是「比标杆小的那一队」的最右边，现在队里还没人。');
    const lt = variant === 'reversed' ? '>' : '<';
    for (let jj = l; jj < h; jj++) {
      j = jj;
      push(11, 'j = ' + jj + '：看 arr[' + jj + '] = ' + arr[jj] + '。');
      compares++;
      const hit = variant === 'reversed' ? arr[jj] > pivot : arr[jj] < pivot;
      push(12, 'arr[' + jj + '] = ' + arr[jj] + ' ' + lt + ' pivot = ' + pivot + (hit ? '，成立。' : '，不成立，什么也不做，j 往右走。'));
      if (hit) {
        i++;
        push(13, 'i++，i = ' + i + '：小的那一队多了一个位置。');
        [arr[i], arr[jj]] = [arr[jj], arr[i]];
        swaps++;
        push(14, 'swap(arr, ' + i + ', ' + jj + ')：' + (i === jj ? '自己和自己换，位置不变。' : '把 ' + arr[i] + ' 换到小队的末尾。'), { swapped: [i, jj] });
      }
    }
    j = h;
    push(11, 'j 走到 hi = ' + h + '，循环结束。');
    j = null;
    const t = variant === 'swap-i' ? i : i + 1;
    const tText = variant === 'swap-i' ? 'i' : 'i + 1';
    if (t < 0) fail(17, 'swap(arr, ' + tText + ', ' + h + ')：下标 ' + t + ' 越界，程序崩溃！', 'crash');
    [arr[t], arr[h]] = [arr[h], arr[t]];
    swaps++;
    const p = i + 1;
    const pa = variant === 'swap-i' ? t : p;
    pivotAt = pa;
    pdone = true;
    placed[p] = true;
    push(17, 'swap(arr, ' + tText + ', ' + h + ')：标杆 ' + pivot + ' ' + (t === h ? '本来就在最右边，位置不变。' : '换到下标 ' + t + '。'), { swapped: [t, h] });
    push(18, 'return i + 1 = ' + p + '：标杆站定在下标 ' + p + '，它不用再动了。');
    // 递归
    const leftHi = variant === 'incl-pivot' ? p : p - 1;
    push(4, '左边：quickSort(' + l + ', ' + leftHi + ')' + (variant === 'incl-pivot' ? '，区间把标杆也包进去了！' : '。'));
    qs(l, leftHi, 4);
    enter(l, h);
    pdone = true;
    pivotAt = pa;
    push(5, '右边：quickSort(' + (p + 1) + ', ' + h + ')。');
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
    push(6, ok ? '最外层 quickSort 返回，全部排好了。' : '最外层 quickSort 返回，可是没排好！', { done: true, outcome: ok ? 'ok' : 'wrong' });
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

/* ---------- 做：猜下一步 ---------- */

export type Round =
  /** j 指着的元素要不要换？要换的话，换到哪个下标。why：「要不要换」答错的解释；whyTarget：点错下标的解释 */
  | { kind: 'swap'; at: number; step: QuickStep; will: boolean; target: number; prompt: string; targetPrompt: string; why: string; whyTarget: string }
  /** 循环结束，标杆要换到哪个下标 */
  | { kind: 'land'; at: number; step: QuickStep; target: number; prompt: string; why: string }
  /** 分区结束，接着递归哪两个区间 */
  | { kind: 'ranges'; at: number; step: QuickStep; p: number; prompt: string; why: string; options: { text: string; ok: boolean }[] };

const pick = <T>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

/** swap 题答错的解释：j 指着的元素和标杆比一比 */
function whyWill(s: QuickStep): string {
  const v = s.arr[s.j!];
  const pv = s.pivot!;
  return v < pv
    ? v + ' < ' + pv + ' 成立：i++，然后 swap(arr, i, j)，把它换进矮队的末尾。'
    : v + (v === pv ? ' 等于 ' : ' 大于 ') + pv + '，arr[j] < pivot 不成立，什么也不做，j 往右走一格。' + (v === pv ? '相等的不进矮队，会留在右边。' : '');
}

/** swap 题点错下标的解释 */
function whySwapTarget(s: QuickStep, target: number): string {
  return 'i 现在是 ' + s.i + '，i++ 之后是 ' + target + '，也就是矮队后面的第一个位置。arr[j] 要和 arr[' + target + '] 交换' +
    (target === s.j ? '（正好是它自己，位置不变）。' : '，原来在那里的 ' + s.arr[target] + ' 不比标杆小，被换到 j 的位置。');
}

/** land 题答错的解释 */
function whyLand(s: QuickStep, target: number): string {
  return '循环结束时 i = ' + s.i + '，下标 ' + s.lo + ' 到 ' + s.i + ' 都是矮队。矮队后面的第一个位置 i + 1 = ' + target + '，标杆和它交换，就落在下标 ' + target + '。' +
    (target === s.hi ? '这里正好是最右边：标杆是最大的，原地不动。' : '');
}

/** ranges 题答错的解释 */
function whyRanges(p: number): string {
  return '标杆已经站定在下标 ' + p + '，不用再排。左边是 [lo, p − 1]，右边是 [p + 1, hi]：区间里不能再带上标杆，否则可能永远缩不小。';
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
      prompt: 'j = ' + step.j + '，arr[j] = ' + step.arr[step.j!] + '，pivot = ' + step.pivot + '。接下来会发生什么？',
      targetPrompt: 'i++ 之后 i = ' + target + '。arr[j] 要和哪一格交换？点它。',
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
      prompt: '循环结束，j = hi，i = ' + step.i + '。最后一行 swap(arr, i + 1, hi)：标杆 ' + step.pivot + ' 会落在哪一格？点它。',
      why: whyLand(step, target),
    });
  }
  const rs = inner.length ? pick(prefer(inner), rand) : returns.length ? pick(returns, rand) : null;
  if (rs) {
    const l = rs.lo!, h = rs.hi!, p = rs.pivotAt!;
    const text = (a: number, b: number, c: number, d: number) => '[' + a + ', ' + b + '] 和 [' + c + ', ' + d + ']';
    out.push({
      kind: 'ranges', at: steps.indexOf(rs), step: rs, p,
      prompt: 'partition 返回了 p = ' + p + '，标杆 ' + rs.arr[p] + ' 已经站定。接下来两行递归，分别处理哪两个区间？',
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
    title: '程序卡住，最后报栈溢出',
    code: variant(4, '    quickSort(arr, lo, p)'),
    wrongLine: 4,
    fixed: '    quickSort(arr, lo, p - 1)',
    values: [3, 1, 2, 4],
    expect: '应该排成 [1, 2, 3, 4]',
    explain: '标杆已经站定在下标 p，不用再排了。左边区间写成 [lo, p] 把它又包了进去：一旦标杆正好是区间里最大的，p 就等于 hi，递归的区间和上一层一模一样，永远缩不小，最后栈溢出。左边是 [lo, p - 1]，右边是 [p + 1, hi]。',
  },
  {
    id: 'reversed',
    title: '排完了，却是从大到小',
    code: variant(12, '        if (arr[j] > pivot) {'),
    wrongLine: 12,
    fixed: '        if (arr[j] < pivot) {',
    values: [4, 2, 5, 1, 3],
    expect: '应该排成 [1, 2, 3, 4, 5]',
    explain: '分区把「小的一队」放在左边，所以进小队的条件是 arr[j] < pivot。写成 > 以后，左边装的是比标杆大的，每一层都反着来，最后整个数组变成从大到小。',
  },
  {
    id: 'swap-i',
    title: '分区完，标杆站错了地方',
    code: variant(17, '    swap(arr, i, hi)'),
    wrongLine: 17,
    fixed: '    swap(arr, i + 1, hi)',
    values: [3, 5, 1, 4, 2],
    expect: '应该排成 [1, 2, 3, 4, 5]',
    explain: '循环结束时，i 指着小队的最后一个，小队后面的第一个位置是 i + 1，标杆要换到那里。写成 swap(arr, i, hi) 会把小队里的最后一个同学换到最右边，标杆却占了他的位置；i 还是 -1（没有比标杆小的）时，下标 -1 直接越界。',
  },
];

/** 按 bug 版本的代码执行 */
export function runBug(bug: Bug): Trace<QuickStep> {
  return simulate(bug.values, bug.id);
}

/** 找 bug 面板底部的判定文字（跑到最后一步才有） */
export function bugVerdict(s: QuickStep, _bug?: Bug): string {
  if (!s.done) return '';
  if (s.outcome === 'overflow') return '💥 StackOverflowError：调用栈叠到了 ' + s.stack.length + ' 层还停不下来';
  if (s.outcome === 'crash') return '💥 下标越界，程序崩溃';
  if (s.outcome === 'stuck') return '🔁 死循环，程序卡住了';
  if (s.outcome === 'wrong') return '❌ 结果 [' + s.arr.join(', ') + ']，没排好';
  return '✅ 排好了';
}

/* ---------- 做：挑战 ---------- */

/** 挑战预测题里每个数组的长度，和可选的比较次数 */
export const CHALLENGE_N = 10;
export const CHALLENGE_OPTIONS = [9, 20, 45, 90];

export interface ChallengeQ {
  name: string;
  arr: number[];
}

/** 预测题：已排好、完全倒序、全是同一个数（这个数每次随机，2 到 9）。这三种在「固定拿最后一个」下比较次数一样 */
export function genChallenge(rand: () => number = Math.random): ChallengeQ[] {
  const n = CHALLENGE_N;
  const same = 2 + Math.floor(rand() * 8);
  return [
    { name: '已经从小到大排好：1 2 3 … ' + n, arr: Array.from({ length: n }, (_, k) => k + 1) },
    { name: '完全倒过来：' + n + ' ' + (n - 1) + ' ' + (n - 2) + ' … 1', arr: Array.from({ length: n }, (_, k) => n - k) },
    { name: '十个数全是 ' + same, arr: Array.from({ length: n }, () => same) },
  ];
}

export type Strategy = 'last' | 'random' | 'median3';
export const STRATEGY_NAME: Record<Strategy, string> = {
  last: '固定拿最后一个',
  random: '随机挑一个',
  median3: '三数取中',
};
export type InputKind = 'sorted' | 'reversed' | 'random';
export const INPUT_NAME: Record<InputKind, string> = {
  sorted: '已经排好',
  reversed: '完全倒序',
  random: '随机打乱',
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
