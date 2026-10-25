import type { Step, Trace } from './types';

/* ---------- 看、玩：小兔子爬楼梯 ---------- */

/** 绘本里的楼梯一共几级。6 级有 13 种跳法，数字不大，又能看出规律 */
export const KID_N = 6;

/** 到第 n 级有几种跳法（每次跳 1 级或 2 级）。ways(0) = 1：站着不动算一种 */
export function ways(n: number): number {
  let a = 1; // ways(0)
  let b = 1; // ways(1)
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return n <= 0 ? 1 : b;
}

/** 便签表：第 0 级到第 n 级各有几种跳法 */
export function waysTable(n: number): number[] {
  const t: number[] = [];
  for (let i = 0; i <= n; i++) t.push(ways(i));
  return t;
}

/** 到第 n 级的所有跳法，每种是一串 1 和 2。按字典序，先小跳后大跳 */
export function allPaths(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of allPaths(n - 1)) out.push([1, ...p]);
  if (n >= 2) for (const p of allPaths(n - 2)) out.push([2, ...p]);
  return out;
}

export const pathKey = (p: number[]) => p.join(',');
export const pathSum = (p: number[]) => p.reduce((a, b) => a + b, 0);

/** 已经跳了 sofar，目标是第 level 级，这一跳 hop 级会不会跳过头 */
export function canHop(level: number, sofar: number[], hop: 1 | 2): boolean {
  return pathSum(sofar) + hop <= level;
}

/** 看：绘本的一个画面 */
export interface LookFrame {
  say: string;
  /** 小兔子站在第几级 */
  bunny: number;
  /** 每一级台阶上的便签，null 表示还没写 */
  notes: (number | null)[];
  /** 高亮的台阶：这一级的答案是从哪几级来的 */
  from: number[];
  /** 正在回答的那一级 */
  ask: number | null;
}

export function lookFrames(n: number = KID_N): LookFrame[] {
  const t = waysTable(n);
  const blank = (): (number | null)[] => Array(n + 1).fill(null);
  const notes = blank();
  const out: LookFrame[] = [];
  const add = (say: string, bunny: number, from: number[], ask: number | null) =>
    out.push({ say, bunny, notes: [...notes], from, ask });

  add('小兔子 🐰 爬楼梯：一次跳 1 级，或者跳 2 级', 0, [], null);
  notes[0] = 1;
  notes[1] = 1;
  add('第 1 级：只有 1 种跳法，贴一张便签 📝', 1, [], null);
  notes[2] = 2;
  add('第 2 级：跳 1+1，或者直接跳 2，一共 2 种', 2, [], null);
  add('第 3 级的最后一步，不是从第 2 级来，就是从第 1 级来', 3, [2, 1], 3);
  notes[3] = t[3];
  add('把下面两张便签加起来：' + t[2] + ' + ' + t[1] + ' = ' + t[3] + ' 📝', 3, [2, 1], null);
  for (let i = 4; i <= n; i++) {
    notes[i] = t[i];
    add('第 ' + i + ' 级：' + t[i - 1] + ' + ' + t[i - 2] + ' = ' + t[i] + '，不用重新数', i, [i - 1, i - 2], null);
  }
  add('第 ' + n + ' 级有 ' + t[n] + ' 种跳法 🎉 每一级都只算了一次', n, [], null);
  return out;
}

/** 玩法一：孩子自己点出所有跳法的台阶 */
export const FIND_LEVELS = [1, 2, 3];
/** 玩法一：看着便签，猜这一级该写几 */
export const GUESS_LEVELS = [4, 5, 6];

/** 便签数字的选项：正确答案加三个常见的误会（少一、多一、只抄了一张便签） */
export function noteOptions(level: number): number[] {
  const right = ways(level);
  const cand = [right + 1, right - 1, ways(level - 1), ways(level - 1) + 2, right + 2, right * 2];
  const set = new Set<number>([right]);
  for (const c of cand) if (set.size < 4 && c > 0) set.add(c);
  return [...set].sort((a, b) => a - b);
}

/** 玩法一的星星：没答错 3 颗，答错 1～2 次 2 颗，再多 1 颗 */
export function playStars(wrongs: number): 1 | 2 | 3 {
  return wrongs === 0 ? 3 : wrongs <= 2 ? 2 : 1;
}

/* ---------- 玩：便签有多省事（调用树） ---------- */

export interface CallNode {
  id: number;
  /** 这次调用问的是第几级 */
  n: number;
  /**
   * call：真的要算（第 0、1 级直接知道答案，也算 call）；
   * lookup：这一级之前已经算过，有便签，直接抄；
   * skipped：在 lookup 的下面，有便签以后根本不会发生的调用
   */
  kind: 'call' | 'lookup' | 'skipped';
  children: CallNode[];
}

/**
 * 不用便签的递归调用树，同时标出「有便签以后哪些调用可以省掉」。
 * 调用顺序：先算 ways(n-1)，再算 ways(n-2)，算完才在便签上记下答案。
 */
export function callTree(n: number): CallNode {
  const done = new Set<number>();
  let id = 0;
  const build = (k: number, skipped: boolean): CallNode => {
    const node: CallNode = { id: id++, n: k, kind: skipped ? 'skipped' : 'call', children: [] };
    if (k <= 1) return node;
    let below = skipped;
    if (!skipped && done.has(k)) {
      node.kind = 'lookup';
      below = true;
    }
    node.children = [build(k - 1, below), build(k - 2, below)];
    if (!skipped) done.add(k);
    return node;
  };
  return build(n, false);
}

export function flatten(root: CallNode): CallNode[] {
  return [root, ...root.children.flatMap(flatten)];
}

/** 不用便签：ways(n) 被调用的总次数 = 2·ways(n) − 1 */
export function naiveCalls(n: number): number {
  return 2 * ways(n) - 1;
}

/** 用便签：每一级只算一次，其余都是抄便签，一共 2n − 1 次调用（n ≥ 1） */
export function memoCalls(n: number): number {
  return n <= 1 ? 1 : 2 * n - 1;
}

/** lookup 节点对应的「第一次算它」的节点：同一级、最早出现的 call */
export function twinOf(root: CallNode, lookupId: number): number {
  const all = flatten(root);
  const look = all.find((x) => x.id === lookupId)!;
  return all.find((x) => x.kind === 'call' && x.n === look.n)!.id;
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun climbStairs(n: Int): Long {',
  '    val dp = LongArray(n + 2)',
  '    dp[0] = 1',
  '    dp[1] = 1',
  '    for (i in 2..n) {',
  '        dp[i] = dp[i - 1] + dp[i - 2]',
  '    }',
  '    return dp[n]',
  '}',
];

export interface DpStep extends Step {
  /** dp 表，null 表示还空着 */
  dp: (number | null)[];
  /** 循环变量 i，循环外是 null */
  i: number | null;
  /** 这一步正在读的格子 */
  from: number[];
  /** 返回值，没返回前是 null */
  result: number | null;
}

/** n ≥ 2。每一步对应 CODE 里的一行 */
export function buildTrace(n: number): Trace<DpStep> {
  const dp: (number | null)[] = Array(n + 2).fill(null);
  const steps: DpStep[] = [];
  let i: number | null = null;
  const push = (line: number, note: string, extra: Partial<DpStep> = {}) => {
    steps.push({ line, dp: [...dp], i, from: [], result: null, note, done: false, ...extra });
  };

  push(2, '建一张 dp 表，dp[i] 表示到第 i 级有几种跳法。先全空着（数组多开了一格，n 很小时 dp[1] 才不会越界）。');
  dp[0] = 1;
  push(3, 'dp[0] = 1：站在地面不动，算 1 种。');
  dp[1] = 1;
  push(4, 'dp[1] = 1：第 1 级只有一种跳法。');
  for (i = 2; i <= n; i++) {
    push(5, 'i = ' + i + '，开始填第 ' + i + ' 格。');
    const a = dp[i - 1]!;
    const b = dp[i - 2]!;
    dp[i] = a + b;
    push(6, 'dp[' + i + '] = dp[' + (i - 1) + '] + dp[' + (i - 2) + '] = ' + a + ' + ' + b + ' = ' + dp[i] + '。', { from: [i - 1, i - 2] });
  }
  i = null;
  push(5, 'i 超过 ' + n + '，循环结束。');
  push(8, '返回 dp[' + n + '] = ' + dp[n] + '。', { result: dp[n], done: true });
  return steps;
}

/* ---------- 做：猜下一步 ---------- */

export interface Round {
  /** 要填第几格 */
  i: number;
  /** 它来自哪两格 */
  from: [number, number];
  value: number;
  /** 填之前的 dp 表 */
  dp: (number | null)[];
}

/** n ≥ 2，从 dp[2] 一格一格往后填 */
export function rounds(n: number): Round[] {
  const t = waysTable(n);
  const out: Round[] = [];
  for (let i = 2; i <= n; i++) {
    out.push({ i, from: [i - 1, i - 2], value: t[i], dp: t.map((v, k) => (k < i ? v : null)) });
  }
  return out;
}

/** dp[i] 的四个选项：正确答案，加上常见的错（只抄一格、少一、多一……） */
export function valueOptions(r: Round): number[] {
  const left = r.dp[r.i - 1]!;
  const cand = [left, r.value + 1, r.value - 1, left * 2, r.value + 2];
  const set = new Set<number>([r.value]);
  for (const c of cand) if (set.size < 4 && c > 0) set.add(c);
  return [...set].sort((a, b) => a - b);
}

/* ---------- 做：找 bug ---------- */

export interface Bug {
  id: 'init' | 'from1' | 'size';
  title: string;
  /** 有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  code: string[];
  wrongLine: number;
  fixed: string;
  n: number;
  expect: string;
  explain: string;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: Bug[] = [
  {
    id: 'init',
    title: '数字总是少了',
    code: variant(3, '    dp[0] = 0'),
    wrongLine: 3,
    fixed: '    dp[0] = 1',
    n: 5,
    expect: 'climbStairs(5) 应该是 8',
    explain: 'dp[0] 是「站在地面」的跳法数，站着不动也算 1 种。写成 0 以后，dp[2] = dp[1] + dp[0] 就少了一种（直接跳 2 级），后面每一格都跟着少。初始值错了，整张表都是错的。',
  },
  {
    id: 'from1',
    title: '程序崩溃了',
    code: variant(5, '    for (i in 1..n) {'),
    wrongLine: 5,
    fixed: '    for (i in 2..n) {',
    n: 4,
    expect: 'climbStairs(4) 应该是 5',
    explain: 'dp[0]、dp[1] 已经手写好了，循环该从 2 开始。从 1 开始，第一圈就要读 dp[i - 2] = dp[-1]，下标是负的，直接越界。',
  },
  {
    id: 'size',
    title: 'n 很小的时候崩溃',
    code: variant(2, '    val dp = LongArray(n + 1)'),
    wrongLine: 2,
    fixed: '    val dp = LongArray(n + 2)',
    n: 0,
    expect: 'climbStairs(0) 应该是 1',
    explain: 'n = 0 时数组只有 1 格，可第 4 行还要写 dp[1]，越界了。大多数 n 看不出问题，只有最小的边界才露馅，所以边界一定要自己试一试。',
  },
];

export interface BugStep extends Step {
  dp: (number | null)[];
  i: number | null;
  /** ok 对；wrong 跑完了但答案不对；crash 下标越界 */
  outcome: 'running' | 'ok' | 'wrong' | 'crash';
  result: number | null;
}

/** 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<BugStep> {
  const n = bug.n;
  const size = bug.id === 'size' ? n + 1 : n + 2;
  const dp: (number | null)[] = Array(size).fill(null);
  const val = (k: number) => dp[k] ?? 0; // Kotlin 的 LongArray 默认是 0
  const steps: BugStep[] = [];
  let i: number | null = null;
  const push = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({ line, dp: [...dp], i, note, done: false, outcome: 'running', result: null, ...extra });
  };
  const crash = (line: number, idx: number) =>
    push(line, '读写 dp[' + idx + ']：数组一共 ' + size + ' 格，下标 ' + idx + ' 越界，程序崩溃！', { outcome: 'crash', done: true });

  push(2, '建一张 dp 表，一共 ' + size + ' 格。');
  dp[0] = bug.id === 'init' ? 0 : 1;
  push(3, 'dp[0] = ' + dp[0] + '。');
  if (size < 2) {
    crash(4, 1);
    return steps;
  }
  dp[1] = 1;
  push(4, 'dp[1] = 1。');
  const start = bug.id === 'from1' ? 1 : 2;
  for (i = start; i <= n; i++) {
    push(5, 'i = ' + i + '，开始填第 ' + i + ' 格。');
    if (i - 2 < 0) {
      crash(6, i - 2);
      return steps;
    }
    dp[i] = val(i - 1) + val(i - 2);
    push(6, 'dp[' + i + '] = dp[' + (i - 1) + '] + dp[' + (i - 2) + '] = ' + val(i - 1) + ' + ' + val(i - 2) + ' = ' + dp[i] + '。');
  }
  i = null;
  push(5, 'i 超过 ' + n + '，循环结束。');
  const result = val(n);
  push(8, '返回 dp[' + n + '] = ' + result + '。', { outcome: result === ways(n) ? 'ok' : 'wrong', result, done: true });
  return steps;
}

/* ---------- 做：挑战（网格数路线） ---------- */

export const GRID_ROWS = 4;
export const GRID_COLS = 5;

/** rocks[r][c] 为 true 表示这一格是石头，过不去 */
export type Rocks = boolean[][];

/** dp[r][c] = 从左上角走到这一格（只能向右或向下）有几条路；石头是 0 */
export function gridTable(rocks: Rocks): number[][] {
  const rows = rocks.length;
  const cols = rocks[0].length;
  const dp = rocks.map((row) => row.map(() => 0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rocks[r][c]) continue;
      if (r === 0 && c === 0) dp[r][c] = 1;
      else dp[r][c] = (r > 0 ? dp[r - 1][c] : 0) + (c > 0 ? dp[r][c - 1] : 0);
    }
  }
  return dp;
}

/**
 * 随机放 2 块石头。石头只放在中间（第一行、第一列、终点都没有），
 * 这样第一行和第一列一定全是 1，可以直接给出来；并保证至少有一条路。
 */
export function randomRocks(rand: () => number = Math.random, rows = GRID_ROWS, cols = GRID_COLS): Rocks {
  for (;;) {
    const rocks: Rocks = Array.from({ length: rows }, () => Array(cols).fill(false));
    let placed = 0;
    while (placed < 2) {
      const r = 1 + Math.floor(rand() * (rows - 1));
      const c = 1 + Math.floor(rand() * (cols - 1));
      if ((r === rows - 1 && c === cols - 1) || rocks[r][c]) continue;
      rocks[r][c] = true;
      placed++;
    }
    if (gridTable(rocks)[rows - 1][cols - 1] > 0) return rocks;
  }
}

/** 需要玩家填的格子：中间的、不是石头的，按从上到下、从左到右 */
export function cellsToFill(rocks: Rocks): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 1; r < rocks.length; r++) {
    for (let c = 1; c < rocks[0].length; c++) if (!rocks[r][c]) out.push([r, c]);
  }
  return out;
}

/** 填 (r, c) 时的提示：它的数 = 上面那格 + 左边那格 */
export function cellHint(rocks: Rocks, r: number, c: number): string {
  const t = gridTable(rocks);
  const up = t[r - 1][c];
  const left = t[r][c - 1];
  return '到 (' + r + ', ' + c + ') 的最后一步，要么从上面来（' + up + ' 条路），要么从左边来（' + left + ' 条路），合起来 ' + up + ' + ' + left + ' = ' + (up + left) + '。'
    + (up === 0 || left === 0 ? '石头那一格是 0 条路。' : '');
}

/** 挑战的星星：填错 0 次三颗，3 次以内两颗，其余一颗 */
export function gridStars(wrongs: number): 1 | 2 | 3 {
  return wrongs === 0 ? 3 : wrongs <= 3 ? 2 : 1;
}
