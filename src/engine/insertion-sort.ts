import type { BugInfo, LookFrame, Step, Trace } from './types';

/* ---------- 看、玩：小熊理纸牌 ---------- */

/** 一张牌：id 是它一开始在第几个位置（也决定花色），v 是点数 */
export interface Card {
  id: number;
  v: number;
}

/** 花色只用来区分点数相同的两张牌（看稳定性），按 id 轮流取 */
export const SUITS = ['♥', '♠', '♣', '♦'] as const;
export const suitOf = (id: number) => SUITS[id % SUITS.length];
/** 红色花色 */
export const isRed = (id: number) => id % 4 === 0 || id % 4 === 3;

/** 「看」用的一手牌，和 story.md 里的数字一致 */
export const STORY_HAND = [4, 2, 5, 1, 3];

export function toCards(values: number[]): Card[] {
  return values.map((v, id) => ({ id, v }));
}

/** 牌桌上的样子：每个位置放着哪张牌，哪张牌被拿在手上悬在哪个位置上方 */
export interface HandView {
  /** 每个位置上的牌 id，null 是空位 */
  slots: (number | null)[];
  /** 拿在手上的牌，null 表示没拿 */
  held: number | null;
  /** 拿着的牌悬在哪个位置上方（也就是空位） */
  heldAt: number;
  /** 前 inHand 个位置是「手里」（排好的部分，加上空位） */
  inHand: number;
}

export interface LookPage extends LookFrame, HandView {
  /** 正在和新牌比大小的那张牌 */
  cmp: number | null;
}

/**
 * 「看」的绘本画面：真的跑一遍插入排序，每次比较和挪动都是一页。
 * 和下面的 buildTrace 是同一个过程，只是说给孩子听。
 */
export function lookFrames(values: number[]): LookPage[] {
  const n = values.length;
  const v = (id: number) => values[id];
  const slots: (number | null)[] = values.map((_, id) => id);
  const out: LookPage[] = [];
  const push = (say: string, extra: Partial<LookPage>) =>
    out.push({ say, slots: [...slots], held: null, heldAt: 0, inHand: 0, cmp: null, ...extra });

  push('桌上有 ' + n + ' 张牌 🃏 小熊 🐻 要从小到大理好', {});
  push('先拿起第 1 张 ' + v(0) + '，只有一张，已经排好啦 ✋', { inHand: 1 });
  let moves = 0;
  for (let i = 1; i < n; i++) {
    const key = slots[i]!;
    slots[i] = null;
    let j = i - 1;
    push('摸到一张 ' + v(key) + '，从右往左比一比 👀', { held: key, heldAt: i, inHand: i + 1 });
    while (j >= 0 && v(slots[j]!) > v(key)) {
      const c = slots[j]!;
      slots[j + 1] = c;
      slots[j] = null;
      moves++;
      push(v(c) + ' 比 ' + v(key) + ' 大，往右挪一格 ➡️', { held: key, heldAt: j, inHand: i + 1, cmp: c });
      j--;
    }
    slots[j + 1] = key;
    if (j < 0) push('前面没有牌了，' + v(key) + ' 放到最前面 ✨', { inHand: i + 1 });
    else if (j === i - 1) push(v(slots[j]!) + ' 比 ' + v(key) + ' 小，' + v(key) + ' 就放在原地 ✨', { inHand: i + 1, cmp: slots[j] });
    else push(v(slots[j]!) + ' 比 ' + v(key) + ' 小，停！' + v(key) + ' 放进空位 ✨', { inHand: i + 1, cmp: slots[j] });
  }
  push('理好啦 🎉 一共挪了 ' + moves + ' 次', { inHand: n });
  return out;
}

/** 发一手牌：n 张点数各不相同的牌（1 到 9），顺序打乱 */
export function dealHand(n: number, rand: () => number = Math.random): number[] {
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(rand() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }
  return pool.slice(0, n);
}

/** 新牌 key 应该插在排好的 hand 的第几个空隙（0 是最左边）。相等的牌插在它后面，保持稳定 */
export function insertPos(hand: number[], key: number): number {
  let g = 0;
  while (g < hand.length && hand[g] <= key) g++;
  return g;
}

/** 玩法一：孩子把 key 插在第 gap 个空隙，左右两张牌和它比一比 */
export function judgeGap(hand: number[], key: number, gap: number) {
  const leftBig = gap > 0 && hand[gap - 1] > key;
  const rightSmall = gap < hand.length && hand[gap] < key;
  return { ok: !leftBig && !rightSmall, leftBig, rightSmall };
}

/** 玩法二：空位在 hole，左边那张比 key 大就要挪，否则把 key 放进空位 */
export function nextAction(row: number[], hole: number, key: number): 'shift' | 'drop' {
  return hole > 0 && row[hole - 1] > key ? 'shift' : 'drop';
}

/** 玩法的星星：一次都没错三颗，错两次以内两颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/** 数一数题的三个选项：正确答案和它附近的两个数，从小到大 */
export function countChoices(answer: number): number[] {
  const set = new Set([answer]);
  for (const d of [1, -1, 2, -2, 3]) {
    if (set.size >= 3) break;
    if (answer + d >= 0) set.add(answer + d);
  }
  return [...set].sort((a, b) => a - b);
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun insertionSort(arr: IntArray) {',
  '    for (i in 1 until arr.size) {',
  '        val key = arr[i]',
  '        var j = i - 1',
  '        while (j >= 0 && arr[j] > key) {',
  '            arr[j + 1] = arr[j]',
  '            j--',
  '        }',
  '        arr[j + 1] = key',
  '    }',
  '}',
];

export interface InsertionStep extends Step {
  arr: number[];
  /** 每个位置上的元素原来在哪个下标，用来看稳定性（相等的元素有没有换顺序） */
  ids: number[];
  i: number | null;
  j: number | null;
  key: number | null;
  keyId: number | null;
  /** 正在和 key 比较的下标 */
  cmp: number | null;
  /** key 拿在手上时的空位（j + 1）；没拿着是 null */
  hole: number | null;
  /** 前 sorted 个已经排好 */
  sorted: number;
  /** arr[j] > key 比较了几次 */
  compares: number;
  /** arr[j + 1] = arr[j] 挪了几次 */
  moves: number;
  /** running：还在跑；ok：排对了；wrong：没排好；unstable：排好了但相等元素换了顺序；crash：下标越界；stuck：死循环 */
  outcome: 'running' | 'ok' | 'wrong' | 'unstable' | 'crash' | 'stuck';
}

/** 正确版本和几个 bug 版本，只差一行 */
export type Variant = 'ok' | 'gt0' | 'ge' | 'write-j';

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

/** 按某个版本的代码逐行执行。行号对应 CODE（bug 版本只改了一行，行号不变） */
export function simulate(values: number[], variant: Variant = 'ok'): Trace<InsertionStep> {
  const arr = [...values];
  const ids = values.map((_, k) => k);
  const n = arr.length;
  const steps: InsertionStep[] = [];
  let i: number | null = null;
  let j: number | null = null;
  let key: number | null = null;
  let keyId: number | null = null;
  let hole: number | null = null;
  let sorted = Math.min(1, n);
  let compares = 0;
  let moves = 0;
  const push = (line: number, note: string, extra: Partial<InsertionStep> = {}) => {
    steps.push({
      line, note, done: false, arr: [...arr], ids: [...ids], i, j, key, keyId, cmp: null, hole, sorted,
      compares, moves, outcome: 'running', ...extra,
    });
  };
  const finish = (line: number, note: string, extra: Partial<InsertionStep> = {}) => {
    const outcome = !isSorted(arr) ? 'wrong' : !isStable(arr, ids) ? 'unstable' : 'ok';
    push(line, note, { done: true, outcome, ...extra });
    return steps;
  };

  for (i = 1; ; i++) {
    if (steps.length > MAX_STEPS) {
      push(2, '步数太多，判定为死循环！', { done: true, outcome: 'stuck' });
      return steps;
    }
    if (i >= n) {
      i = null;
      sorted = n;
      return finish(2, n <= 1 ? '只有 ' + n + ' 个元素，不用排。' : 'i 走到了 ' + n + '，循环结束。');
    }
    push(2, 'i = ' + i + '：前 ' + i + ' 个已经排好，摸第 ' + (i + 1) + ' 个。');
    key = arr[i];
    keyId = ids[i];
    hole = i;
    push(3, 'key = arr[' + i + '] = ' + key + '，拿在手上，下标 ' + i + ' 空出来了。');
    j = i - 1;
    push(4, 'j = i - 1 = ' + j + '，从排好部分的最右边开始往左比。');
    for (;;) {
      if (steps.length > MAX_STEPS) {
        push(5, '步数太多，判定为死循环！', { done: true, outcome: 'stuck' });
        return steps;
      }
      const inRange = variant === 'gt0' ? j > 0 : j >= 0;
      const rangeText = variant === 'gt0' ? 'j > 0' : 'j >= 0';
      if (!inRange) {
        push(5, rangeText + ' 不成立（j = ' + j + '），不再比较，退出循环。');
        break;
      }
      compares++;
      const bigger = variant === 'ge' ? arr[j] >= key : arr[j] > key;
      const op = variant === 'ge' ? '>=' : '>';
      if (!bigger) {
        push(5, 'arr[' + j + '] = ' + arr[j] + (variant === 'ge' ? ' < ' : ' ≤ ') + key + '，' + 'arr[j] ' + op + ' key 不成立，停下。', { cmp: j });
        break;
      }
      push(5, 'arr[' + j + '] = ' + arr[j] + ' ' + op + ' key = ' + key + '，要往右挪。', { cmp: j });
      arr[j + 1] = arr[j];
      ids[j + 1] = ids[j];
      moves++;
      hole = j;
      push(6, 'arr[' + (j + 1) + '] = arr[' + j + ']：' + arr[j] + ' 往右挪一格，空位到了下标 ' + j + '。', { cmp: j + 1 });
      j--;
      push(7, 'j-- ，j = ' + j + '。');
    }
    const at = variant === 'write-j' ? j : j + 1;
    const atText = variant === 'write-j' ? 'arr[j]' : 'arr[j + 1]';
    if (at < 0 || at >= n) {
      push(9, atText + ' = key：下标 ' + at + ' 越界，程序崩溃！', { done: true, outcome: 'crash' });
      return steps;
    }
    const lost = arr[at];
    arr[at] = key;
    ids[at] = keyId;
    hole = null;
    sorted = i + 1;
    const lostText = variant === 'write-j' && at !== j + 1 ? '原来的 ' + lost + ' 被盖掉了！' : '';
    push(9, atText + ' = key：把 ' + key + ' 放进下标 ' + at + '。' + lostText, { cmp: at });
    key = null;
    keyId = null;
    j = null;
  }
}

/** 正确版本的逐步执行 */
export function buildTrace(values: number[]): Trace<InsertionStep> {
  return simulate(values, 'ok');
}

/** 逆序对数：前面比后面大的一对算一个。插入排序挪动的次数正好等于它 */
export function inversions(a: number[]): number {
  let c = 0;
  for (let x = 0; x < a.length; x++) for (let y = x + 1; y < a.length; y++) if (a[x] > a[y]) c++;
  return c;
}

/** 随机数组，值在 1..max，可能有重复 */
export function genArray(n: number, max = 20, rand: () => number = Math.random): number[] {
  return Array.from({ length: n }, () => 1 + Math.floor(rand() * max));
}

/** 几乎有序：先排好，再随机交换 swaps 对相邻元素 */
export function nearlySorted(n: number, swaps = 2, rand: () => number = Math.random): number[] {
  const a = Array.from({ length: n }, (_, k) => k + 1);
  for (let s = 0; s < swaps; s++) {
    const k = Math.floor(rand() * (n - 1));
    [a[k], a[k + 1]] = [a[k + 1], a[k]];
  }
  return a;
}

/* ---------- 做：猜下一步 ---------- */

/** 外层循环的一轮：key 最后落在哪、比较几次、挪几次 */
export interface Round {
  i: number;
  /** 这一轮开始时的数组 */
  before: number[];
  key: number;
  /** key 最后放进的下标 */
  pos: number;
  compares: number;
  moves: number;
  /** 点错「key 落在哪一格」时的解释 */
  whyPos: string;
  /** 选错「比较了几次」时的解释 */
  why: string;
}

/** 猜下一步的数组：PREDICT_N 个数，值在 1 到 PREDICT_MAX，可能有重复 */
export const PREDICT_N = 8;
export const PREDICT_MAX = 15;

export function genPredict(rand: () => number = Math.random): number[] {
  return genArray(PREDICT_N, PREDICT_MAX, rand);
}

function whyPos(before: number[], i: number, key: number, pos: number): string {
  const bigger = before.slice(pos, i);
  const head = bigger.length ? '从右往左比：' + [...bigger].reverse().join('、') + ' 比 ' + key + ' 大，依次往右挪；' : '';
  const stop = pos > 0
    ? 'arr[' + (pos - 1) + '] = ' + before[pos - 1] + ' 不比 ' + key + ' 大，停下'
    : '一直挪到了最左边';
  return head + stop + '。key 落在下标 ' + pos + '。' + (before.slice(0, i).includes(key) ? '相等的元素不挪，key 排在它后面。' : '');
}

function whyCompares(before: number[], pos: number, moves: number, compares: number): string {
  return '挪了 ' + moves + ' 次，每挪一次之前都比较过一次。' + (pos > 0
    ? '最后和 arr[' + (pos - 1) + '] = ' + before[pos - 1] + ' 比，不比 key 大，又比了 1 次，一共 ' + compares + ' 次。'
    : '挪到最左边后 j = -1，j >= 0 不成立，&& 短路，arr[j] > key 不再计算，一共 ' + compares + ' 次。');
}

export function rounds(values: number[]): Round[] {
  const out: Round[] = [];
  const arr = [...values];
  for (let i = 1; i < arr.length; i++) {
    const before = [...arr];
    const key = arr[i];
    let j = i - 1;
    let compares = 0;
    while (j >= 0) {
      compares++;
      if (!(arr[j] > key)) break;
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
    const pos = j + 1;
    const moves = i - pos;
    out.push({ i, before, key, pos, compares, moves, whyPos: whyPos(before, i, key, pos), why: whyCompares(before, pos, moves, compares) });
  }
  return out;
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
    id: 'gt0',
    title: '最小的数排不到最前面',
    code: variant(5, '        while (j > 0 && arr[j] > key) {'),
    wrongLine: 5,
    fixed: '        while (j >= 0 && arr[j] > key) {',
    values: [4, 2, 5, 1, 3],
    suits: false,
    expect: '应该排成 [1, 2, 3, 4, 5]',
    explain: 'j > 0 让下标 0 永远不参加比较：新来的数最多只能挪到下标 1，arr[0] 一开始是谁，最后还是谁。循环条件要写 j >= 0。',
  },
  {
    id: 'ge',
    title: '数字排对了，两张 3 却换了位置',
    code: variant(5, '        while (j >= 0 && arr[j] >= key) {'),
    wrongLine: 5,
    fixed: '        while (j >= 0 && arr[j] > key) {',
    values: [3, 1, 3, 2],
    suits: true,
    expect: '应该排成 [1, 2, 3♥, 3♣]，3♥ 本来在 3♣ 前面',
    explain: '写成 >= 后，遇到和 key 相等的元素也会往右挪，key 就跑到了它前面。结果数字是对的，但插入排序不再稳定：按成绩排序时，同分的人原来的先后顺序就乱了。还白白多挪了几次。',
  },
  {
    id: 'write-j',
    title: '数字被吃掉了，最后还崩溃',
    code: variant(9, '        arr[j] = key'),
    wrongLine: 9,
    fixed: '        arr[j + 1] = key',
    values: [3, 5, 1],
    suits: false,
    expect: '应该排成 [1, 3, 5]',
    explain: '循环停下时，j 指着的是「不比 key 大」的那个元素（或者 -1），空位在它右边的 j + 1。写成 arr[j] 会盖掉一个好好的元素；j 是 -1 时直接下标越界。',
  },
];

/** 按 bug 版本的代码执行 */
export function runBug(bug: Bug): Trace<InsertionStep> {
  return simulate(bug.values, bug.id);
}

/** 数组写成文字；suits 为真时点数后面带花色（id 是牌原来的位置） */
export function showCards(arr: number[], ids: number[], suits: boolean): string {
  return '[' + arr.map((v, k) => v + (suits ? suitOf(ids[k]) : '')).join(', ') + ']';
}

/** 找 bug 面板底部的判定：动画跑完后结果是什么 */
export function bugVerdict(step: InsertionStep, bug: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'crash') return '💥 下标越界，程序崩溃';
  if (step.outcome === 'stuck') return '🔁 死循环，程序卡住了';
  if (step.outcome === 'unstable') return '⚠️ 结果 ' + showCards(step.arr, step.ids, bug.suits) + '：数字排好了，但两张 3 换了先后顺序，不稳定';
  if (step.outcome === 'wrong') return '❌ 结果 ' + showCards(step.arr, step.ids, bug.suits) + '，没排好';
  return '✅ 排好了';
}

/* ---------- 做：挑战 ---------- */

export interface RaceLane {
  kind: 'nearly' | 'random' | 'reversed' | 'tail';
  values: number[];
}

export const CHALLENGE_N = 12;

/** 四组 12 个数：几乎有序、随机、倒序、只有最后一个最小。顺序打乱 */
export function genChallenge(rand: () => number = Math.random): RaceLane[] {
  const n = CHALLENGE_N;
  const sortedArr = Array.from({ length: n }, (_, k) => k + 1);
  // 几乎有序：交换两对不相邻的相邻元素，挪 2 次
  const nearly = [...sortedArr];
  const a = 1 + Math.floor(rand() * 4);
  const b = 6 + Math.floor(rand() * 4);
  [nearly[a], nearly[a + 1]] = [nearly[a + 1], nearly[a]];
  [nearly[b], nearly[b + 1]] = [nearly[b + 1], nearly[b]];
  // 随机：逆序对数落在中间，免得太像另外几组
  let random: number[];
  do {
    random = [...sortedArr];
    for (let k = n - 1; k > 0; k--) {
      const r = Math.floor(rand() * (k + 1));
      [random[k], random[r]] = [random[r], random[k]];
    }
  } while (inversions(random) < 24 || inversions(random) > 42);
  const lanes: RaceLane[] = [
    { kind: 'nearly', values: nearly },
    { kind: 'random', values: random },
    { kind: 'reversed', values: [...sortedArr].reverse() },
    { kind: 'tail', values: [...sortedArr.slice(1), 1] },
  ];
  for (let k = lanes.length - 1; k > 0; k--) {
    const r = Math.floor(rand() * (k + 1));
    [lanes[k], lanes[r]] = [lanes[r], lanes[k]];
  }
  return lanes;
}

export const LANE_NAME: Record<RaceLane['kind'], string> = {
  nearly: '几乎有序',
  random: '随机打乱',
  reversed: '完全倒序',
  tail: '只有最后一个最小',
};
