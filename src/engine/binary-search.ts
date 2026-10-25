import type { BugInfo, LookFrame, Step, Trace } from './types';

/* ---------- 看、玩：小邮差找信箱 ---------- */

/** 信箱个数。15 = 2⁴ − 1，每次都点正中间时剩下的总是奇数个，正中间唯一，最多 4 次找到 */
export const KID_N = 15;

/** 信箱门上的提示：信在左边、右边，还是就在这里 */
export type Dir = 'left' | 'right' | 'hit';

/** 打开第 at 个信箱（从 1 开始）时门上显示什么 */
export function pointTo(secret: number, at: number): Dir {
  return at === secret ? 'hit' : secret < at ? 'left' : 'right';
}

/** 看过 at 并得到提示 dir 之后，还可能藏信的范围 [lo, hi] */
export function narrow(lo: number, hi: number, at: number, dir: Dir) {
  if (dir === 'left') return { lo, hi: Math.min(hi, at - 1) };
  if (dir === 'right') return { lo: Math.max(lo, at + 1), hi };
  return { lo: at, hi: at };
}

export function middle(lo: number, hi: number): number {
  return Math.floor((lo + hi) / 2);
}

export interface Probe {
  lo: number;
  hi: number;
  at: number;
  dir: Dir;
}

/** 小邮差每次都看剩下范围的正中间，直到找到 secret */
export function postmanTrace(n: number, secret: number): Probe[] {
  const out: Probe[] = [];
  let lo = 1;
  let hi = n;
  for (;;) {
    const at = middle(lo, hi);
    const dir = pointTo(secret, at);
    out.push({ lo, hi, at, dir });
    if (dir === 'hit') return out;
    ({ lo, hi } = narrow(lo, hi, at, dir));
  }
}

/** 随机藏信：1 到 n 里挑一个信箱，可以指定不能和 except 一样 */
export function pickSecret(rand: () => number = Math.random, except?: number, n: number = KID_N): number {
  let s = 1 + Math.floor(rand() * n);
  while (s === except) s = 1 + Math.floor(rand() * n);
  return s;
}

/** 「看」的一页：台词加画面（范围、小邮差位置、已开的门、信） */
export interface LookPage extends LookFrame {
  lo: number;
  hi: number;
  postman: number;
  doors: Record<number, Dir>;
  letter: number | null;
}

/** 「看」的全部页：小邮差每次都去剩下范围的正中间，直到找到信。画面和 postmanTrace 一致 */
export function lookFrames(secret: number): LookPage[] {
  const probes = postmanTrace(KID_N, secret);
  const out: LookPage[] = [];
  let doors: Record<number, Dir> = {};
  out.push({ say: '信藏在一个信箱里 ✉️ 小邮差 🐰 要找到它', lo: 1, hi: KID_N, postman: 0, doors, letter: null });
  out.push({ say: '一个一个找？太慢啦 🐢 小邮差的秘诀：先去正中间！', lo: 1, hi: KID_N, postman: middle(1, KID_N), doors, letter: null });
  for (const p of probes) {
    doors = { ...doors, [p.at]: p.dir };
    if (p.dir === 'hit') {
      out.push({ say: '找到啦 🎉 只看了 ' + probes.length + ' 次！', lo: p.at, hi: p.at, postman: p.at, doors, letter: p.at });
      break;
    }
    out.push({ say: '门上说：信在' + (p.dir === 'left' ? '左边 ⬅️' : '右边 ➡️'), lo: p.lo, hi: p.hi, postman: p.at, doors, letter: null });
    const r = narrow(p.lo, p.hi, p.at, p.dir);
    out.push({ say: (p.dir === 'left' ? '右' : '左') + '边一半都不用看了 👋 再去剩下的正中间', lo: r.lo, hi: r.hi, postman: middle(r.lo, r.hi), doors, letter: null });
  }
  return out;
}

/** 玩法二的星星：最多 4 次是三颗，6 次以内两颗，其余一颗 */
export function stars(tries: number): 1 | 2 | 3 {
  return tries <= 4 ? 3 : tries <= 6 ? 2 : 1;
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun binarySearch(arr: IntArray, target: Int): Int {',
  '    var lo = 0',
  '    var hi = arr.size - 1',
  '    while (lo <= hi) {',
  '        val mid = lo + (hi - lo) / 2',
  '        when {',
  '            arr[mid] == target -> return mid',
  '            arr[mid] < target -> lo = mid + 1',
  '            else -> hi = mid - 1',
  '        }',
  '    }',
  '    return -1',
  '}',
];

export interface BinaryStep extends Step {
  lo: number;
  hi: number;
  mid: number | null;
  /** 已经检查过的元素个数 */
  count: number;
  /** 找到的下标，没找到是 -1 */
  found: number;
}

/** 生成一个严格递增的随机数组 */
export function genArray(n: number, rand: () => number = Math.random): number[] {
  let v = Math.floor(rand() * 8) + 2;
  const a: number[] = [];
  for (let i = 0; i < n; i++) {
    a.push(v);
    v += Math.floor(rand() * 9) + 1;
  }
  return a;
}

/** 在数组里随机挑一个值 */
export function pickTarget(arr: number[], rand: () => number = Math.random): number {
  return arr[Math.floor(rand() * arr.length)];
}

/** 找一个不在数组里的值 */
export function missingValue(arr: number[]): number {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i + 1] - arr[i] > 1) return arr[i] + 1;
  }
  return arr[arr.length - 1] + 1;
}

export function buildTrace(arr: number[], target: number): Trace<BinaryStep> {
  const steps: BinaryStep[] = [];
  let lo = 0;
  let hi = arr.length - 1;
  let count = 0;
  const push = (line: number, note: string, extra: Partial<BinaryStep> = {}) => {
    steps.push({ line, lo, hi, mid: null, count, note, found: -1, done: false, ...extra });
  };

  push(3, '初始化：lo = 0，hi = ' + hi + '，整个数组都是候选范围。');
  while (true) {
    push(4, lo <= hi
      ? 'lo ≤ hi（' + lo + ' ≤ ' + hi + '），候选范围不为空，继续循环。'
      : 'lo > hi（' + lo + ' > ' + hi + '），候选范围已空，退出循环。');
    if (lo > hi) break;
    const mid = lo + Math.floor((hi - lo) / 2);
    count++;
    push(5, '取中点：mid = lo + (hi - lo) / 2 = ' + mid + '。', { mid });
    if (arr[mid] === target) {
      push(7, 'arr[' + mid + '] = ' + arr[mid] + '，等于目标，返回下标 ' + mid + '。', { mid, found: mid, done: true });
      return steps;
    }
    if (arr[mid] < target) {
      lo = mid + 1;
      push(8, 'arr[' + mid + '] = ' + arr[mid] + ' < ' + target + '，目标在右半边：lo = mid + 1 = ' + lo + '。', { mid });
    } else {
      hi = mid - 1;
      push(9, 'arr[' + mid + '] = ' + arr[mid] + ' > ' + target + '，目标在左半边：hi = mid - 1 = ' + hi + '。', { mid });
    }
  }
  push(12, '返回 -1，数组里没有 ' + target + '。', { done: true });
  return steps;
}

/* ---------- 做：猜下一步 ---------- */

/** 每一轮循环要回答的一道题：mid 在哪、接下来怎么走 */
export interface Round {
  lo: number;
  hi: number;
  mid: number;
  /** 'found'：找到了；'right'：lo = mid + 1；'left'：hi = mid - 1 */
  move: 'found' | 'right' | 'left';
  /** 点错 mid 时的解释 */
  whyMid: string;
  /** 选错下一步时的解释 */
  why: string;
}

/** 猜下一步出一道题：长度 10～18 的数组，七成找得到、三成找不到 */
export function genPredict(rand: () => number = Math.random): { arr: number[]; target: number } {
  const n = 10 + Math.floor(rand() * 9);
  const arr = genArray(n, rand);
  const target = rand() < 0.7 ? pickTarget(arr, rand) : missingValue(arr);
  return { arr, target };
}

export function rounds(arr: number[], target: number): Round[] {
  const out: Round[] = [];
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const move = arr[mid] === target ? 'found' : arr[mid] < target ? 'right' : 'left';
    const v = arr[mid];
    const whyMid = 'mid = lo + (hi - lo) / 2 = ' + lo + ' + (' + hi + ' - ' + lo + ') / 2 = ' + mid + '。整数除法向下取整。';
    const why = move === 'found'
      ? 'arr[' + mid + '] = ' + v + '，正好等于 ' + target + '，直接返回 mid。'
      : move === 'right'
        ? 'arr[' + mid + '] = ' + v + ' < ' + target + '，目标只可能在 mid 右边，mid 自己也不是，所以 lo = mid + 1。'
        : 'arr[' + mid + '] = ' + v + ' > ' + target + '，目标只可能在 mid 左边，mid 自己也不是，所以 hi = mid - 1。';
    out.push({ lo, hi, mid, move, whyMid, why });
    if (move === 'found') break;
    if (move === 'right') lo = mid + 1;
    else hi = mid - 1;
  }
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'lt' | 'hi-mid' | 'overflow';
  /** 用来演示出错的输入。size 很大时 arr[i] = i，不真的建数组 */
  size: number;
  values?: number[];
  target: number;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'lt',
    title: '明明在数组里，却说找不到',
    code: variant(4, '    while (lo < hi) {'),
    wrongLine: 4,
    fixed: '    while (lo <= hi) {',
    size: 3,
    values: [2, 5, 8],
    target: 8,
    expect: '8 在下标 2，应该返回 2',
    explain: '循环条件少了等号。lo 和 hi 相等时，范围里还剩最后一个元素没看，循环却已经结束了。',
  },
  {
    id: 'hi-mid',
    title: '转圈圈，停不下来',
    code: variant(9, '            else -> hi = mid'),
    wrongLine: 9,
    fixed: '            else -> hi = mid - 1',
    size: 4,
    values: [1, 3, 5, 7],
    target: 0,
    expect: '0 不在数组里，应该返回 -1',
    explain: 'mid 已经比较过、确定不是答案，却还留在范围里。范围缩到只剩它一个时，lo、hi、mid 再也不变，循环永远停不下来。',
  },
  {
    id: 'overflow',
    title: '数组很大时崩溃',
    code: variant(5, '        val mid = (lo + hi) / 2'),
    wrongLine: 5,
    fixed: '        val mid = lo + (hi - lo) / 2',
    size: 2_100_000_000,
    target: 2_000_000_000,
    expect: '数组有 21 亿个元素，arr[i] = i，应该返回 2000000000',
    explain: 'Int 最大约 21.4 亿。lo + hi 超过它就会溢出成负数，mid 变成负的下标，程序崩溃。Java 标准库的 Arrays.binarySearch 就曾有这个 bug，2006 年才被发现修复。',
  },
];

export interface BugStep extends Step {
  lo: number;
  hi: number;
  mid: number | null;
  /** 'ok' 正常返回；'stuck' 判定为死循环；'crash' 下标越界 */
  outcome: 'running' | 'ok' | 'stuck' | 'crash';
  result: number | null;
}

/** 把一个 Kotlin Int 运算截成 32 位 */
const int32 = (x: number) => x | 0;

/**
 * 按 bug 版本的代码逐行执行。和 buildTrace 一样输出步骤，line 对应 bug.code 的行号。
 * 状态（lo, hi）重复出现就判定为死循环。
 */
export function runBug(bug: Bug): Trace<BugStep> {
  const get = (i: number) => (bug.values ? bug.values[i] : i);
  const steps: BugStep[] = [];
  let lo = 0;
  let hi = bug.size - 1;
  const seen = new Set<string>();
  const push = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({ line, lo, hi, mid: null, note, done: false, outcome: 'running', result: null, ...extra });
  };
  const cond = bug.id === 'lt' ? (a: number, b: number) => a < b : (a: number, b: number) => a <= b;
  const op = bug.id === 'lt' ? '<' : '<=';

  push(3, '初始化：lo = 0，hi = ' + hi + '。');
  for (;;) {
    const key = lo + ',' + hi;
    if (seen.has(key)) {
      push(4, 'lo = ' + lo + '，hi = ' + hi + '，和上一圈一模一样，再转下去也不会变：死循环！', { outcome: 'stuck', done: true });
      return steps;
    }
    seen.add(key);
    const go = cond(lo, hi);
    push(4, lo + ' ' + op + ' ' + hi + ' 是' + (go ? '真，继续循环。' : '假，退出循环。'));
    if (!go) break;
    const mid = bug.id === 'overflow' ? int32(int32(lo + hi) / 2) : lo + Math.floor((hi - lo) / 2);
    if (bug.id === 'overflow' && lo + hi > 0x7fffffff) {
      push(5, 'lo + hi = ' + (lo + hi) + '，超过了 Int 的上限 2147483647，溢出成 ' + int32(lo + hi) + '，mid = ' + mid + '。', { mid });
    } else {
      push(5, 'mid = ' + mid + '。', { mid });
    }
    if (mid < 0 || mid >= bug.size) {
      push(7, '读 arr[' + mid + ']：下标越界，程序崩溃！', { mid, outcome: 'crash', done: true });
      return steps;
    }
    const v = get(mid);
    if (v === bug.target) {
      push(7, 'arr[' + mid + '] = ' + v + '，找到了，返回 ' + mid + '。', { mid, outcome: 'ok', result: mid, done: true });
      return steps;
    }
    if (v < bug.target) {
      lo = mid + 1;
      push(8, 'arr[' + mid + '] = ' + v + ' < ' + bug.target + '，lo = ' + lo + '。', { mid });
    } else {
      hi = bug.id === 'hi-mid' ? mid : mid - 1;
      push(9, 'arr[' + mid + '] = ' + v + ' > ' + bug.target + '，hi = ' + hi + '。', { mid });
    }
  }
  push(12, '返回 -1：没找到。', { outcome: 'ok', result: -1, done: true });
  return steps;
}

/** 找 bug 面板底部的判定：动画跑完后程序到底怎么错的 */
export function bugVerdict(step: BugStep, _bug?: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'stuck') return '🔁 死循环，程序卡住了';
  if (step.outcome === 'crash') return '💥 下标越界，程序崩溃';
  return '❌ 返回了 ' + step.result + '，不对';
}

/* ---------- 做：挑战 ---------- */

export const CHALLENGE_MAX = 1000;
/** 1 到 1000 用二分最多要猜几次：⌊log₂1000⌋ + 1 = 10 */
export const CHALLENGE_LIMIT = Math.floor(Math.log2(CHALLENGE_MAX)) + 1;

/** 挑战出题：1 到 CHALLENGE_MAX 里藏一个数 */
export function genChallenge(rand: () => number = Math.random): number {
  return 1 + Math.floor(rand() * CHALLENGE_MAX);
}
