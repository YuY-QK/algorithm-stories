import type { Step, Trace } from './types';

/* ---------- 看、玩：排队拍合照 ---------- */

/** 一个排队的小伙伴：头像、名字、身高（厘米） */
export interface Kid {
  id: string;
  face: string;
  name: string;
  h: number;
}

/**
 * 「看」和故事稿用的固定队伍：小兔 120、小熊 145、小猫 118、小狗 132、小猴 138。
 * 第 1 轮最高的小熊从第 2 个一路换到最右边（换 3 次），第 2 轮换 1 次就排好了，
 * 第 3 轮一次都没换，摄影师提前拍照，省下第 4 轮。一共比 9 次、换 4 次。
 */
export const STORY_KIDS: Kid[] = [
  { id: 'rabbit', face: '🐰', name: '小兔', h: 120 },
  { id: 'bear', face: '🐻', name: '小熊', h: 145 },
  { id: 'cat', face: '🐱', name: '小猫', h: 118 },
  { id: 'dog', face: '🐶', name: '小狗', h: 132 },
  { id: 'monkey', face: '🐵', name: '小猴', h: 138 },
];

const FACES: [string, string, string][] = [
  ['rabbit', '🐰', '小兔'], ['bear', '🐻', '小熊'], ['cat', '🐱', '小猫'], ['dog', '🐶', '小狗'],
  ['monkey', '🐵', '小猴'], ['panda', '🐼', '熊猫'], ['fox', '🦊', '狐狸'], ['tiger', '🐯', '老虎'],
];

export const KID_N = 5;
export const KID_MIN_H = 110;
export const KID_MAX_H = 150;

/** 随机挑 n 个小伙伴，身高互不相同、至少差 4 厘米；队伍没排好，最高的也不在最右边 */
export function randomKids(n = KID_N, rand: () => number = Math.random): Kid[] {
  for (;;) {
    const faces = FACES.slice();
    const hs: number[] = [];
    for (let h = 112; h <= 148; h += 4) hs.push(h);
    const out: Kid[] = [];
    for (let k = 0; k < n; k++) {
      const [id, face, name] = faces.splice(Math.floor(rand() * faces.length), 1)[0];
      const h = hs.splice(Math.floor(rand() * hs.length), 1)[0];
      out.push({ id, face, name, h });
    }
    const max = Math.max(...out.map((x) => x.h));
    if (out[n - 1].h !== max) return out;
  }
}

/** 相邻两人要不要换：左边的比右边高就换 */
export type Choice = 'swap' | 'keep';
export function need(left: number, right: number): Choice {
  return left > right ? 'swap' : 'keep';
}

/** 一轮里的一次比较 */
export interface Compare<T> {
  j: number;
  swap: boolean;
  /** 比较（和可能的交换）之后的队伍 */
  after: T[];
}

/** 冒泡排序的一轮 */
export interface Round<T> {
  /** 第几轮，从 0 开始，和代码里的 i 一致 */
  i: number;
  before: T[];
  after: T[];
  compares: Compare<T>[];
  swaps: number;
  /** 这一轮结束后固定下来的位置 n - 1 - i */
  end: number;
  /** 这一轮结束后站在 end 的那个 */
  top: T;
  /** 这一轮一次都没换：提前结束 */
  quiet: boolean;
}

/** 带「一轮没换就停」的冒泡排序，按轮输出。key 取比较用的值 */
export function bubbleRounds<T>(input: T[], key: (x: T) => number): Round<T>[] {
  const a = input.slice();
  const n = a.length;
  const out: Round<T>[] = [];
  for (let i = 0; i < n - 1; i++) {
    const before = a.slice();
    const compares: Compare<T>[] = [];
    let swaps = 0;
    for (let j = 0; j < n - 1 - i; j++) {
      const swap = key(a[j]) > key(a[j + 1]);
      if (swap) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
      }
      compares.push({ j, swap, after: a.slice() });
    }
    const end = n - 1 - i;
    out.push({ i, before, after: a.slice(), compares, swaps, end, top: a[end], quiet: swaps === 0 });
    if (swaps === 0) break;
  }
  return out;
}

/* ---------- 看：绘本画面 ---------- */

export interface LookFrame<T> {
  say: string;
  line: T[];
  /** 正在比较的一对（左边下标），没有是 null */
  pair: number | null;
  /** 这一对刚刚换过 */
  swapped: boolean;
  /** 从这个下标开始已经站好 */
  fixedFrom: number;
  /** 摄影师拍照了 */
  photo: boolean;
}

/** 绘本的全部画面，由 bubbleRounds 生成，和真实的冒泡过程一致 */
export function lookFrames(kids: Kid[]): LookFrame<Kid>[] {
  const n = kids.length;
  const rounds = bubbleRounds(kids, (k) => k.h);
  const out: LookFrame<Kid>[] = [];
  const f = (say: string, line: Kid[], extra: Partial<LookFrame<Kid>> = {}) =>
    out.push({ say, line, pair: null, swapped: false, fixedFrom: n, photo: false, ...extra });

  f('要拍合照啦 📸 可是大家站得乱糟糟', kids);
  f('摄影师说：矮的站左边，高的站右边 ↗️', kids);
  f('他的办法：每次只看挨着的两个 👀', kids, { pair: 0 });
  let fixedFrom = n;
  let compares = 0;
  for (const r of rounds) {
    if (r.i > 0) f('第 ' + (r.i + 1) + ' 轮：再从最左边开始看 👀', r.before, { pair: 0, fixedFrom });
    let prev = r.before;
    for (const c of r.compares) {
      compares++;
      const L = prev[c.j];
      const R = prev[c.j + 1];
      f(c.swap ? L.face + ' 比 ' + R.face + ' 高，换！🔄' : L.face + ' 比 ' + R.face + ' 矮，不用换 👍', c.after, { pair: c.j, swapped: c.swap, fixedFrom });
      prev = c.after;
    }
    if (r.quiet) {
      fixedFrom = 0;
      f('这一轮谁也没换 🤫 说明已经排好啦', r.after, { fixedFrom });
    } else {
      fixedFrom = r.end;
      if (r.i === 0) f('最高的 ' + r.top.face + ' 像泡泡一样冒到了最右边 🫧', r.after, { fixedFrom });
      else f(r.top.face + ' 也冒到位置上了 ⭐ 站好不动', r.after, { fixedFrom });
      if (fixedFrom <= 1) fixedFrom = 0;
    }
  }
  const last = rounds.length ? rounds[rounds.length - 1].after : kids;
  f('咔嚓 📸 比了 ' + compares + ' 次，就排好啦！', last, { fixedFrom: 0, photo: true });
  return out;
}

/* ---------- 玩法一：当摄影师 ---------- */

export interface ShootState<T> {
  line: T[];
  /** 正在看的一对的左边下标 */
  j: number;
  /** 这个下标及之后已经站好 */
  end: number;
  round: number;
  roundSwaps: number;
  compares: number;
  swaps: number;
  /** pair：在看一对；next：一轮结束，有人换过；quiet：一轮没人换，等孩子决定拍照；done：拍好了 */
  phase: 'pair' | 'next' | 'quiet' | 'done';
}

export function shootInit<T>(line: T[]): ShootState<T> {
  return { line: line.slice(), j: 0, end: line.length, round: 0, roundSwaps: 0, compares: 0, swaps: 0, phase: line.length < 2 ? 'done' : 'pair' };
}

/** 孩子判断眼前这一对换不换。答错返回 null，状态不变 */
export function shootAnswer<T>(s: ShootState<T>, ans: Choice, key: (x: T) => number): ShootState<T> | null {
  if (s.phase !== 'pair') return null;
  const right = need(key(s.line[s.j]), key(s.line[s.j + 1]));
  if (ans !== right) return null;
  const line = s.line.slice();
  let { roundSwaps, swaps } = s;
  if (right === 'swap') {
    [line[s.j], line[s.j + 1]] = [line[s.j + 1], line[s.j]];
    roundSwaps++;
    swaps++;
  }
  const n: ShootState<T> = { ...s, line, roundSwaps, swaps, compares: s.compares + 1, j: s.j + 1 };
  if (n.j >= n.end - 1) {
    n.end--;
    if (roundSwaps === 0) n.phase = 'quiet';
    else if (n.end <= 1) {
      n.end = 0;
      n.phase = 'done';
    } else n.phase = 'next';
  }
  return n;
}

/** 有人换过的一轮结束后，开始下一轮 */
export function shootNextRound<T>(s: ShootState<T>): ShootState<T> {
  if (s.phase !== 'next') return s;
  return { ...s, j: 0, round: s.round + 1, roundSwaps: 0, phase: 'pair' };
}

/** 一轮谁也没换时，孩子选拍照还是再看一轮。只有拍照是对的，选错返回 null */
export function shootQuiet<T>(s: ShootState<T>, ans: 'photo' | 'again'): ShootState<T> | null {
  if (s.phase !== 'quiet' || ans !== 'photo') return null;
  return { ...s, end: 0, phase: 'done' };
}

/** 玩的星星：一次都没错三颗，错 1～2 次两颗，再多一颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun bubbleSort(arr: IntArray) {',
  '    val n = arr.size',
  '    for (i in 0 until n - 1) {',
  '        var swapped = false',
  '        for (j in 0 until n - 1 - i) {',
  '            if (arr[j] > arr[j + 1]) {',
  '                val t = arr[j]',
  '                arr[j] = arr[j + 1]',
  '                arr[j + 1] = t',
  '                swapped = true',
  '            }',
  '        }',
  '        if (!swapped) break',
  '    }',
  '}',
];

/** 「本轮结束」那一行：if (!swapped) break */
export const ROUND_END_LINE = 13;

/** 带一个小标记的元素。标记只用来看清谁是谁（比如两个相等的数），比较时只看 v */
export interface Item {
  v: number;
  tag?: string;
}

export interface BubbleStep extends Step {
  a: Item[];
  i: number | null;
  j: number | null;
  /** 临时变量 t，没有是 null */
  t: number | null;
  /** 这个下标及之后已经在最终位置 */
  sortedFrom: number;
  compares: number;
  swaps: number;
  swapped: boolean | null;
  /** cmp：正在比较 arr[j] 和 arr[j+1]；swap：正在交换它们 */
  hl: 'cmp' | 'swap' | null;
  /** running 还在跑；ok 正常结束；crash 下标越界 */
  outcome: 'running' | 'ok' | 'crash';
}

/** 模拟时可以换掉的三处：内层循环上界、比较符号、交换的第三行 */
interface Variant {
  /** 'n-1-i' 正确；'n-i' 多走一格 */
  bound: 'n-1-i' | 'n-i';
  /** '>' 正确；'>=' 相等也换 */
  cmp: '>' | '>=';
  /** true 正确：arr[j + 1] = t；false：arr[j + 1] = arr[j] */
  temp: boolean;
}

const CORRECT: Variant = { bound: 'n-1-i', cmp: '>', temp: true };

const show = (x: Item) => String(x.v) + (x.tag ?? '');

/** 逐行执行（可能有 bug 的）冒泡排序，line 对应 CODE 的行号（bug 版和 CODE 行数相同） */
function simulate(input: Item[], vr: Variant): BubbleStep[] {
  const a = input.map((x) => ({ ...x }));
  const n = a.length;
  const steps: BubbleStep[] = [];
  let compares = 0, swaps = 0, sortedFrom = n;
  let i: number | null = null, j: number | null = null, t: number | null = null, swapped: boolean | null = null;
  const push = (line: number, note: string, extra: Partial<BubbleStep> = {}) => {
    steps.push({ line, note, a: a.map((x) => ({ ...x })), i, j, t, sortedFrom, compares, swaps, swapped, hl: null, outcome: 'running', done: false, ...extra });
  };

  push(2, 'n = ' + n + '。');
  for (i = 0; i < n - 1; i++) {
    j = null;
    t = null;
    swapped = null;
    push(3, '第 ' + (i + 1) + ' 轮：i = ' + i + '，前 ' + (n - i) + ' 个还没排好。');
    swapped = false;
    push(4, 'swapped = false，记下这一轮有没有换过。');
    const upper = vr.bound === 'n-i' ? n - i : n - 1 - i;
    for (j = 0; j < upper; j++) {
      t = null;
      if (j + 1 >= n) {
        push(6, '读 arr[' + (j + 1) + ']：数组只有 ' + n + ' 个元素，下标最大是 ' + (n - 1) + '。ArrayIndexOutOfBoundsException，程序崩溃！', { hl: 'cmp', outcome: 'crash', done: true });
        return steps;
      }
      compares++;
      const L = a[j], R = a[j + 1];
      const go = vr.cmp === '>' ? L.v > R.v : L.v >= R.v;
      const rel = L.v > R.v ? ' > ' : L.v === R.v ? ' = ' : ' < ';
      push(6, 'j = ' + j + '：arr[' + j + '] = ' + show(L) + rel + 'arr[' + (j + 1) + '] = ' + show(R) + (go ? '，条件成立，要交换。' : '，条件不成立，不换。'), { hl: 'cmp' });
      if (!go) continue;
      t = L.v;
      const tItem = { ...L };
      push(7, 't = arr[' + j + '] = ' + t + '，先把左边的存起来。', { hl: 'swap' });
      a[j] = { ...a[j + 1] };
      push(8, 'arr[' + j + '] = arr[' + (j + 1) + ']，现在两格都是 ' + a[j].v + '，原来的 ' + t + ' 在 t 里。', { hl: 'swap' });
      if (vr.temp) {
        a[j + 1] = tItem;
        swaps++;
        push(9, 'arr[' + (j + 1) + '] = t = ' + t + '，交换完成。', { hl: 'swap' });
      } else {
        a[j + 1] = { ...a[j] };
        swaps++;
        push(9, 'arr[' + (j + 1) + '] = arr[' + j + '] = ' + a[j].v + '……原来的 ' + t + ' 不见了！', { hl: 'swap' });
      }
      swapped = true;
      push(10, 'swapped = true。');
    }
    j = null;
    t = null;
    sortedFrom = n - 1 - i;
    if (swapped) {
      push(13, 'swapped 是 true，不退出。这一轮最大的 ' + a[sortedFrom].v + ' 冒到了下标 ' + sortedFrom + '，位置定了。');
    } else {
      sortedFrom = 0;
      push(13, 'swapped 是 false：一整轮没换，已经有序，break 提前结束' + (n - 2 - i > 0 ? '，省下 ' + (n - 2 - i) + ' 轮。' : '。'), { outcome: 'ok', done: true });
      return steps;
    }
  }
  i = null;
  sortedFrom = 0;
  push(3, n <= 1 ? 'n - 1 = ' + (n - 1) + '，外层循环一次都不用走，排序结束。' : 'i 走完了 0 until ' + (n - 1) + '，排序结束。一共比较 ' + compares + ' 次，交换 ' + swaps + ' 次。', { outcome: 'ok', done: true });
  return steps;
}

export function buildTrace(arr: number[]): Trace<BubbleStep> {
  return simulate(arr.map((v) => ({ v })), CORRECT);
}

export type Shape = 'random' | 'nearly' | 'reversed';

export function genArray(n: number, shape: Shape, rand: () => number = Math.random): number[] {
  const a: number[] = [];
  for (let i = 0; i < n; i++) a.push(Math.floor(rand() * 90) + 5);
  if (shape === 'reversed') a.sort((x, y) => y - x);
  if (shape === 'nearly' && n >= 2) {
    a.sort((x, y) => x - y);
    const k = Math.floor(rand() * (n - 1));
    [a[k], a[k + 1]] = [a[k + 1], a[k]];
  }
  return a;
}

/** n 个互不相同的数（1 到 max），打乱 */
export function distinctArray(n: number, max = 30, rand: () => number = Math.random): number[] {
  const pool = Array.from({ length: max }, (_, k) => k + 1);
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

/* ---------- 做：猜下一步 ---------- */

/**
 * 这一轮会交换几次。一轮里「目前最大的数」一路往右走，遇到比它小的就换，
 * 所以左边出现过比它大的数的元素，各被换一次。
 */
export function swapsInRound(before: number[], end: number): number {
  let max = -Infinity, s = 0;
  for (let k = 0; k <= end; k++) {
    if (k > 0 && before[k] < max) s++;
    max = Math.max(max, before[k]);
  }
  return s;
}

/** 左边出现过比它大的数、这一轮会被换一次的那些下标 */
export function passedOver(before: number[], end: number): number[] {
  let max = -Infinity;
  const out: number[] = [];
  for (let k = 0; k <= end; k++) {
    if (k > 0 && before[k] < max) out.push(k);
    max = Math.max(max, before[k]);
  }
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug {
  id: 'temp' | 'bound' | 'stable';
  title: string;
  /** 有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  code: string[];
  wrongLine: number;
  /** 改对之后的那一行 */
  fixed: string;
  input: Item[];
  /** 演示输入上正确的结果是什么 */
  expect: string;
  explain: string;
}

function variant(line: number, text: string): string[] {
  return CODE.map((s, k) => (k + 1 === line ? text : s));
}

export const BUGS: Bug[] = [
  {
    id: 'temp',
    title: '数字越排越少',
    code: variant(9, '                arr[j + 1] = arr[j]'),
    wrongLine: 9,
    fixed: '                arr[j + 1] = t',
    input: [4, 2, 3, 1].map((v) => ({ v })),
    expect: '应该排成 [1, 2, 3, 4]',
    explain: '第 8 行已经把 arr[j] 改成了右边的数，第 9 行再读 arr[j]，读到的就是新值，原来左边的数丢了。交换要先用 t 存好，第三步写回 t。',
  },
  {
    id: 'bound',
    title: '第一轮就崩溃',
    code: variant(5, '        for (j in 0 until n - i) {'),
    wrongLine: 5,
    fixed: '        for (j in 0 until n - 1 - i) {',
    input: [3, 1, 2].map((v) => ({ v })),
    expect: '应该排成 [1, 2, 3]',
    explain: '内层循环要读 arr[j + 1]，所以 j 最大只能到 n - 2。写成 until n - i，第一轮 j 走到 n - 1，arr[j + 1] 就是 arr[n]，越界。（写成 until n - 1 不会崩，只是每轮都把已经站好的也比一遍。）',
  },
  {
    id: 'stable',
    title: '同分的两个人换了先后',
    code: variant(6, '            if (arr[j] >= arr[j + 1]) {'),
    wrongLine: 6,
    fixed: '            if (arr[j] > arr[j + 1]) {',
    input: [{ v: 5, tag: 'ᵃ' }, { v: 3 }, { v: 5, tag: 'ᵇ' }, { v: 1 }],
    expect: '两个 5 分别标了 ᵃ、ᵇ，应该排成 [1, 3, 5ᵃ, 5ᵇ]，5ᵃ 原来在前，排完也在前',
    explain: '>= 让相等的两个数也交换，原来在前的 5ᵃ 被换到了 5ᵇ 后面，排序不再稳定。排整数看不出来，排对象时（比如先按姓名排好，再按分数排）同分的人顺序就乱了。另外，有相等的邻居时每轮都会「换过」，提前退出也不灵了。',
  },
];

const BUG_VARIANT: Record<Bug['id'], Variant> = {
  temp: { ...CORRECT, temp: false },
  bound: { ...CORRECT, bound: 'n-i' },
  stable: { ...CORRECT, cmp: '>=' },
};

/** 按 bug 版代码逐行执行。行号对应 bug.code */
export function runBug(bug: Bug): Trace<BubbleStep> {
  return simulate(bug.input, BUG_VARIANT[bug.id]);
}

/** 稳定排序后的正确结果，用来和 bug 版的结果比 */
export function stableSorted(items: Item[]): Item[] {
  return items.map((x, k) => ({ x, k })).sort((p, q) => p.x.v - q.x.v || p.k - q.k).map((p) => p.x);
}

export function sameItems(a: Item[], b: Item[]): boolean {
  return a.length === b.length && a.every((x, k) => x.v === b[k].v && (x.tag ?? '') === (b[k].tag ?? ''));
}

/* ---------- 做：挑战 ---------- */

/** 逆序对个数：i < j 且 a[i] > a[j] 的对数，也就是相邻交换排好最少要换几次 */
export function inversions(a: number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
  return c;
}

export function isSorted(a: number[]): boolean {
  return a.every((v, k) => k === 0 || a[k - 1] <= v);
}

export const CHALLENGE_N = 6;

/** 挑战用的序列：1 到 n 打乱，逆序对在 5 到 10 个之间，不太少也不太累 */
export function challengeArray(n = CHALLENGE_N, rand: () => number = Math.random): number[] {
  for (;;) {
    const a = distinctArray(n, n, rand);
    const inv = inversions(a);
    if (inv >= 5 && inv <= 10) return a;
  }
}
