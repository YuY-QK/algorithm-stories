import type { BugInfo, LookFrame, Step, Trace } from './types';

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
  out.push({ say: '小熊 🐻 想把糖果从小到大排好 🍬', values: a, sorted: 0, bear: null, glow: null });
  out.push({ say: '小熊的办法：每次挑出最小的那颗 👀', values: a, sorted: 0, bear: null, glow: null });
  for (const r of rs) {
    out.push({ say: (r.i === 0 ? '这一排里' : '剩下的里面') + '，最小的是它 👆', values: r.before, sorted: r.i, bear: r.min, glow: r.min });
    if (r.min !== r.i) {
      out.push({ say: '和最前面的换个位置 🔄 放上盘子', values: r.after, sorted: r.i + 1, bear: r.i, glow: null });
    } else {
      out.push({ say: '它已经在最前面，不用换 👍', values: r.after, sorted: r.i + 1, bear: r.i, glow: null });
    }
  }
  const end = rs.length ? rs[rs.length - 1].after : a;
  out.push({ say: '最后一颗不用挑，排好啦 🎉 挑了 ' + rs.length + ' 轮', values: end, sorted: end.length, bear: null, glow: null });
  return out;
}

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
  const push = (line: number, note: string, extra: Partial<SelectionStep> = {}) => {
    steps.push({ line, a: a.slice(), i, j, minIdx, sorted, compares, swaps, note, cmp: false, swap: null, done: false, ...extra });
  };

  push(2, 'n = ' + n + '。');
  for (i = 0; i < n - 1; i++) {
    j = null;
    minIdx = null;
    push(3, '第 ' + (i + 1) + ' 轮：i = ' + i + '。' + (i ? '下标 0 到 ' + (i - 1) + ' 已经排好，' : '') + '从下标 ' + i + ' 往后找最小的。');
    minIdx = i;
    push(4, 'minIdx = ' + i + '：先假设 arr[' + i + '] = ' + a[i] + ' 最小。');
    for (j = i + 1; j < n; j++) {
      compares++;
      const less = a[j] < a[minIdx];
      push(6, 'arr[' + j + '] = ' + a[j] + (less ? ' < ' : ' ≥ ') + 'arr[minIdx] = ' + a[minIdx] + (less ? '，找到更小的。' : '，不比目前最小的小。'), { cmp: true });
      if (less) {
        minIdx = j;
        push(7, 'minIdx = ' + j + '，目前最小的是 ' + a[j] + '。');
      }
    }
    j = null;
    if (minIdx !== i) {
      push(10, 'minIdx = ' + minIdx + ' ≠ i = ' + i + '，最小的不在最前面，要交换。');
      [a[i], a[minIdx]] = [a[minIdx], a[i]];
      swaps++;
      sorted = i + 1;
      push(11, '交换 arr[' + i + '] 和 arr[' + minIdx + ']（三行一起）：' + a[i] + ' 放到下标 ' + i + '，它的位置定了。', { swap: [i, minIdx] });
    } else {
      sorted = i + 1;
      push(10, 'minIdx == i，arr[' + i + '] = ' + a[i] + ' 本来就是最小的，不用交换，位置定了。');
    }
  }
  i = null;
  minIdx = null;
  sorted = n;
  push(3, (n > 1 ? '剩下最后一个，它一定是最大的，不用再挑。' : '') + '排好了：比较 ' + compares + ' 次，交换 ' + swaps + ' 次。', { done: true });
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
  why: string;
}

/** minIdx 在这一轮里依次指过哪些下标 */
function minPath(i: number, before: number[]): number[] {
  const out = [i];
  for (let j = i + 1; j < before.length; j++) if (before[j] < before[out[out.length - 1]]) out.push(j);
  return out;
}

/** 点错「minIdx 最后停在哪」时的解释：点的是第 k 格 */
export function whyMin(rd: Round, k: number): string {
  const { i, minIdx, before } = rd;
  const v = before[minIdx];
  if (k > i && k !== minIdx && before[k] === v) {
    return 'arr[' + k + '] 也是 ' + v + '，可是判断用的是 <：遇到一样小的不会改 minIdx，所以留在最前面的 ' + minIdx + '。';
  }
  if (k < i) return '下标 ' + k + ' 在 i 前面，已经排好了。这一轮只在 i = ' + i + ' 及以后找，最小的是 arr[' + minIdx + '] = ' + v + '。';
  return '从 i = ' + i + ' 往后，最小的是 arr[' + minIdx + '] = ' + v + '，minIdx 停在 ' + minIdx + '。';
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
    let m = i, updates = 0;
    for (let j = i + 1; j < a.length; j++) {
      if (a[j] < a[m]) {
        m = j;
        updates++;
      }
    }
    const before = a.slice();
    const ps = minPath(i, before);
    const why = ps.length === 1
      ? '后面没有比 arr[' + i + '] = ' + before[i] + ' 更小的，minIdx 一次都没改。'
      : 'minIdx 依次是 ' + ps.join(' → ') + '（值 ' + ps.map((x) => before[x]).join(' → ') + '），改了 ' + updates + ' 次。只有遇到比「目前最小的」还小的才改，不是比 arr[i] 小就改。';
    out.push({ i, before, minIdx: m, updates, why });
    [a[i], a[m]] = [a[m], a[i]];
  }
  return out;
}

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
    title: '排完了，顺序还是不对',
    code: variant(6, '            if (arr[j] < arr[i]) {'),
    wrongLine: 6,
    fixed: '            if (arr[j] < arr[minIdx]) {',
    values: [4, 1, 3, 5, 2],
    expect: '应该得到 [1, 2, 3, 4, 5]',
    explain: '比较的对象错了。每次都和 arr[i] 比，找到的只是「最后一个比 arr[i] 小的」，不一定是最小的。要和「目前最小的」arr[minIdx] 比。',
  },
  {
    id: 'j-zero',
    title: '排好的又被换乱了',
    code: variant(5, '        for (j in 0 until n) {'),
    wrongLine: 5,
    fixed: '        for (j in i + 1 until n) {',
    values: [3, 4, 1, 2],
    expect: '应该得到 [1, 2, 3, 4]',
    explain: '内层循环从 0 开始，把前面已经排好的部分也算了进去。排好的都比剩下的小，minIdx 就被拉回前面，交换把排好的又换走了。应该只在 i 之后找。',
  },
  {
    id: 'no-tmp',
    title: '糖果变多了，有的不见了',
    code: variant(13, '            arr[minIdx] = arr[i]'),
    wrongLine: 13,
    fixed: '            arr[minIdx] = tmp',
    values: [3, 4, 1, 2],
    expect: '应该得到 [1, 2, 3, 4]',
    explain: '上一行已经把 arr[i] 改成了 arr[minIdx]，这里再读 arr[i]，读到的是同一个值，原来的 arr[i] 就丢了。tmp 正是用来先把它存起来的。',
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
  const push = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({ line, a: a.slice(), i, j, minIdx, note, done: false, outcome: 'running', ...extra });
  };

  push(2, 'n = ' + n + '。');
  for (i = 0; i < n - 1; i++) {
    j = null;
    minIdx = null;
    push(3, '第 ' + (i + 1) + ' 轮：i = ' + i + '。');
    minIdx = i;
    push(4, 'minIdx = ' + i + '。');
    for (j = bug.id === 'j-zero' ? 0 : i + 1; j < n; j++) {
      const other = bug.id === 'cmp-i' ? i : minIdx;
      const name = bug.id === 'cmp-i' ? 'arr[i]' : 'arr[minIdx]';
      const less = a[j] < a[other];
      push(6, 'j = ' + j + '：arr[' + j + '] = ' + a[j] + (less ? ' < ' : ' ≥ ') + name + ' = ' + a[other] + (less ? '。' : '，不换。'));
      if (less) {
        minIdx = j;
        push(7, 'minIdx = ' + j + '。' + (j < i ? '这是前面已经排好的位置！' : ''));
      }
    }
    j = null;
    push(10, minIdx !== i ? 'minIdx = ' + minIdx + ' ≠ i，交换。' : 'minIdx == i，不交换。');
    if (minIdx !== i) {
      const tmp = a[i];
      a[i] = a[minIdx];
      a[minIdx] = bug.id === 'no-tmp' ? a[i] : tmp;
      push(bug.id === 'no-tmp' ? 13 : 11, bug.id === 'no-tmp'
        ? 'arr[' + i + '] = ' + a[i] + '，arr[' + minIdx + '] = arr[' + i + '] = ' + a[minIdx] + '：原来的 ' + tmp + ' 不见了。'
        : '交换 arr[' + i + '] 和 arr[' + minIdx + ']。');
    }
  }
  i = null;
  j = null;
  minIdx = null;
  push(3, '循环结束，数组变成 [' + a.join(', ') + ']。', { outcome: 'ok', done: true });
  return steps;
}

/** 找 bug 面板底部的判定：动画跑完后结果是什么 */
export function bugVerdict(step: BugStep, _bug?: Bug): string {
  return step.done ? '❌ 结果是 [' + step.a.join(', ') + ']，没排好' : '';
}

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
