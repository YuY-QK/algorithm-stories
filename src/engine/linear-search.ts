import type { BugInfo, LookFrame, Step, Trace } from './types';

/* ---------- 参考代码与步骤轨迹 ---------- */

/** 参考代码（Kotlin），行号和 Step.line 对应 */
export const CODE = [
  'fun linearSearch(arr: IntArray, target: Int): Int {',
  '    for (i in arr.indices) {',
  '        if (arr[i] == target) {',
  '            return i',
  '        }',
  '    }',
  '    return -1',
  '}',
];

export interface LinearStep extends Step {
  /** 当前看的下标；-1 还没开始，等于 arr.length 表示已经走出末尾 */
  i: number;
  /** 到这一步为止比较过几次 */
  checks: number;
  /** 返回值；没结束时是 null */
  result: number | null;
  /** 已经命中的下标（正确的代码最多一个） */
  hits: number[];
}

/** 顺序查找：从头往后一个个比，返回第一个等于 target 的下标，没有返回 -1 */
export function linearSearch(arr: readonly number[], target: number): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}

/** 顺序查找要比较几次：命中就是下标加 1，找不到是 n 次 */
export function countChecks(arr: readonly number[], target: number): number {
  let n = 0;
  for (const v of arr) {
    n++;
    if (v === target) break;
  }
  return n;
}

export function buildTrace(arr: readonly number[], target: number): Trace<LinearStep> {
  const steps: LinearStep[] = [];
  let i = -1;
  let checks = 0;
  const add = (line: number, note: string, extra: Partial<LinearStep> = {}) => {
    steps.push({ line, i, checks, result: null, hits: [], note, done: false, ...extra });
  };
  add(1, '在 ' + arr.length + ' 个数里找 ' + target + '：第一个相等的下标；一个也没有就返回 -1。');
  for (i = 0; i < arr.length; i++) {
    add(2, '轮到下标 ' + i + '。');
    checks++;
    const same = arr[i] === target;
    add(3, 'arr[' + i + '] = ' + arr[i] + '，目标 ' + target + '：' + (same ? '相等。' : '不相等，什么也不做。'), same ? { hits: [i] } : {});
    if (same) {
      add(4, '找到了：return ' + i + '，循环马上结束，后面的不用看。', { result: i, hits: [i], done: true });
      return steps;
    }
  }
  add(7, arr.length === 0
    ? '数组是空的，一个都没得看：返回 -1。'
    : arr.length + ' 个都看完了，没有等于 ' + target + ' 的：返回 -1。', { result: -1, done: true });
  return steps;
}

/* ---------- 箱子的画面数据 ---------- */

/** closed 盖着；seen 开过又盖上；now 正在开；hit 找到了 */
export type CellState = 'closed' | 'seen' | 'now' | 'hit';
export interface Cell {
  /** 空字符串表示盖着盖子，画面显示成箱子 */
  label: string;
  state: CellState;
}

function stateOf(k: number, i: number, hits: readonly number[]): CellState {
  if (hits.includes(k)) return 'hit';
  if (k < i) return 'seen';
  if (k === i) return 'now';
  return 'closed';
}

/** 数组版的格子：数字一直看得见，状态按当前这一步 */
export function arrayCells(arr: readonly number[], step: Pick<LinearStep, 'i' | 'hits'>): Cell[] {
  return arr.map((v, k) => ({ label: String(v), state: stateOf(k, step.i, step.hits) }));
}

/* ---------- 看、玩：玩具箱 ---------- */

/** 玩具的图案，下标就是玩具的编号 */
export const TOYS = ['🧱', '🚗', '🎈', '🪀', '🐻', '🥁', '🎺', '🧩', '🎨'] as const;
export const TOY_NAMES = ['积木', '小汽车', '气球', '悠悠球', '小熊', '小鼓', '小喇叭', '拼图', '颜料盘'] as const;
export const BEAR = 4;
export const KID_N = 8;

/** 玩具版的格子：开过和正在开的看得见玩具，没开的盖着 */
export function toyCells(ids: readonly number[], step: Pick<LinearStep, 'i' | 'hits'>): Cell[] {
  return ids.map((id, k) => ({ label: k <= step.i ? TOYS[id] : '', state: stateOf(k, step.i, step.hits) }));
}

/** 看：绘本的一页 */
export interface LookPage extends LookFrame {
  cells: Cell[];
  /** 小箭头指着第几个箱子，-1 不显示 */
  pointer: number;
  /** 小朋友的表情 */
  kid: string;
}

/** 绘本第一排：小熊在第 5 个箱子里 */
export const LOOK_ROW_A = [0, 1, 2, 3, BEAR, 5, 6, 7];
/** 绘本第二排：没有小熊 */
export const LOOK_ROW_B = [7, 2, 8, 0, 6, 1, 3, 5];

/** 看：每一页的画面由 buildTrace 真正执行得到，台词按这一步发生的事来写 */
export function lookFrames(): LookPage[] {
  const out: LookPage[] = [];
  const a = buildTrace(LOOK_ROW_A, BEAR).filter((s) => s.line === 3);
  const closedA = LOOK_ROW_A.map(() => ({ label: '', state: 'closed' as CellState }));
  out.push({ say: '8 个玩具箱都盖着盖子，小熊 🐻 藏在其中一个里面。从第 1 个开始，一个一个开。', cells: closedA, pointer: 0, kid: '🧒' });
  for (const s of a) {
    const id = LOOK_ROW_A[s.i];
    const found = s.hits.length > 0;
    out.push({
      say: found ? '开第 ' + (s.i + 1) + ' 个：小熊跳出来啦！🎉' : '开第 ' + (s.i + 1) + ' 个：' + TOYS[id] + TOY_NAMES[id] + '，不是小熊。盖上，往右挪一格。',
      cells: toyCells(LOOK_ROW_A, s), pointer: s.i, kid: found ? '🥳' : '🧒',
    });
  }
  const last = a[a.length - 1];
  out.push({
    say: '找到就停！后面 ' + (KID_N - 1 - last.i) + ' 个箱子不用再开。一共开了 ' + last.checks + ' 次。',
    cells: toyCells(LOOK_ROW_A, last), pointer: last.i, kid: '🧒',
  });

  const b = buildTrace(LOOK_ROW_B, BEAR).filter((s) => s.line === 3);
  out.push({ say: '换一排，这次没有小熊。还是从第 1 个开始。', cells: LOOK_ROW_B.map(() => ({ label: '', state: 'closed' as CellState })), pointer: 0, kid: '🧒' });
  out.push({ say: '开了 ' + b[3].checks + ' 个，都不是小熊……', cells: toyCells(LOOK_ROW_B, b[3]), pointer: 3, kid: '🧒' });
  const end = b[b.length - 1];
  out.push({
    say: '开到第 ' + (end.i + 1) + ' 个，也不是。' + KID_N + ' 个全开完才敢说：没有！',
    cells: toyCells(LOOK_ROW_B, { i: end.i + 1, hits: [] }), pointer: -1, kid: '🤷',
  });
  return out;
}

/* ---------- 玩一：开箱子找小熊 ---------- */

export interface PlayRow {
  /** 每个箱子里的玩具编号 */
  ids: number[];
  /** 小熊在第几个箱子（从 0 开始） */
  bear: number;
}

const NON_BEAR = TOYS.map((_, k) => k).filter((k) => k !== BEAR);

function shuffled<T>(a: readonly T[], rand: () => number): T[] {
  const b = [...a];
  for (let k = b.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [b[k], b[j]] = [b[j], b[k]];
  }
  return b;
}

/** 把小熊藏好：位置随机，其余箱子放别的玩具（互不相同） */
export function hideBear(rand: () => number = Math.random, n = KID_N): PlayRow {
  const bear = Math.floor(rand() * n);
  const others = shuffled(NON_BEAR, rand).slice(0, n - 1);
  const ids = [...others.slice(0, bear), BEAR, ...others.slice(bear)];
  return { ids, bear };
}

export interface PlayState {
  /** 开过的箱子，按开的先后 */
  opened: number[];
  /** 重复开已经开过的箱子的次数 */
  repeats: number;
  found: boolean;
}

export const PLAY_START: PlayState = { opened: [], repeats: 0, found: false };

export type TapOutcome = 'open' | 'repeat' | 'found' | 'over';

/** 点第 k 个箱子 */
export function tapBox(row: PlayRow, st: PlayState, k: number): { state: PlayState; outcome: TapOutcome } {
  if (st.found) return { state: st, outcome: 'over' };
  if (st.opened.includes(k)) return { state: { ...st, repeats: st.repeats + 1 }, outcome: 'repeat' };
  const opened = [...st.opened, k];
  if (row.ids[k] === BEAR) return { state: { ...st, opened, found: true }, outcome: 'found' };
  return { state: { ...st, opened }, outcome: 'open' };
}

/** 星星看有没有重复开，不看运气 */
export function playStars(repeats: number): 1 | 2 | 3 {
  return repeats === 0 ? 3 : repeats === 1 ? 2 : 1;
}

/** 点箱子之后的一句话 */
export function playSay(outcome: TapOutcome, row: PlayRow, k: number): string {
  switch (outcome) {
    case 'found': return '🎉 小熊在这里！';
    case 'repeat': return '🙅 这个已经开过啦，里面是' + TOYS[row.ids[k]] + TOY_NAMES[row.ids[k]] + '，换一个没开的';
    case 'over': return '小熊已经找到啦';
    default: return TOYS[row.ids[k]] + TOY_NAMES[row.ids[k]] + '，不是小熊。盖上，再开一个';
  }
}

/** 一局结束后的总结：你开了几个，从左往右一个个开要几个 */
export function playSummary(row: PlayRow, st: PlayState): string {
  const robot = row.bear + 1;
  return '你开了 ' + st.opened.length + ' 个箱子。从左往右一个个开的话，要开 ' + robot + ' 个。';
}

export interface PlayQuiz {
  id: 'worst' | 'none';
  ask: string;
  options: number[];
  correct: number;
  right: string;
  why: string;
}

/** 玩几局以后追问，让孩子自己说出「最坏要全开」 */
export const PLAY_QUIZ: readonly PlayQuiz[] = [
  {
    id: 'worst', ask: '🤔 小熊藏在最后一个箱子里，从头开，要开几个？', options: [1, 4, 8], correct: 8,
    right: '对！前面 7 个一个也不能跳过，要开 8 个。',
    why: '再想想：小熊在最后一个，前面 7 个都得先开，再加上最后一个。',
  },
  {
    id: 'none', ask: '🤔 要是根本没有小熊呢？要开几个，才敢说「没有」？', options: [0, 4, 8], correct: 8,
    right: '对！只要有一个没开，小熊就可能在里面，所以要全开完。',
    why: '再想想：留着一个没开，小熊说不定就藏在里面，能下结论吗？',
  },
];

/* ---------- 玩二：藏小熊，看机器人找 ---------- */

export interface RobotFrame {
  say: string;
  cells: Cell[];
  pointer: number;
  /** 到这一帧机器人开了几个 */
  count: number;
  done: boolean;
}

const ROBOT_FILL = [0, 1, 2, 3, 5, 6, 7, 8];

/** 机器人的一排箱子：hideAt 是小熊的位置，null 表示不藏 */
export function robotRow(hideAt: number | null, n = KID_N): number[] {
  const ids = ROBOT_FILL.slice(0, n);
  if (hideAt !== null) ids[hideAt] = BEAR;
  return ids;
}

/** 机器人从左往右一个个开，每开一个是一帧 */
export function robotFrames(hideAt: number | null, n = KID_N): RobotFrame[] {
  const ids = robotRow(hideAt, n);
  const out: RobotFrame[] = [{
    say: '🤖 小熊藏好啦，我从第 1 个开始找',
    cells: ids.map(() => ({ label: '', state: 'closed' as CellState })), pointer: 0, count: 0, done: false,
  }];
  for (const s of buildTrace(ids, BEAR).filter((x) => x.line === 3)) {
    const found = s.hits.length > 0;
    out.push({
      say: found ? '🤖 找到啦！开了 ' + s.checks + ' 个' : '🤖 第 ' + s.checks + ' 个：' + TOYS[ids[s.i]] + '，不是',
      cells: toyCells(ids, s), pointer: s.i, count: s.checks, done: found,
    });
    if (found) return out;
  }
  out[out.length - 1] = {
    ...out[out.length - 1], say: '🤖 ' + n + ' 个都开完了，没有小熊。开了 ' + n + ' 个',
    cells: toyCells(ids, { i: n, hits: [] }), pointer: -1, done: true,
  };
  return out;
}

/** 孩子试过的藏法：位置（null 是不藏）对应开的个数 */
export type Tally = { at: number | null; count: number }[];

/** 试了几种以后，对孩子说一句引导的话 */
export function robotNote(tally: Tally, n = KID_N): string {
  if (tally.length === 0) return '点一个箱子，把小熊藏进去；或者选「不藏」。';
  const counts = tally.map((t) => t.count);
  const hasEnd = tally.some((t) => t.at === n - 1 || t.at === null);
  const hasEarly = tally.some((t) => t.at !== null && t.at <= 1);
  if (hasEnd && hasEarly) return '看出来了吗？小熊藏得越靠后，机器人开得越多。藏在最后面和不藏，都要把 ' + n + ' 个开完，没有捷径。';
  if (Math.max(...counts) - Math.min(...counts) >= 2) return '藏在哪里，机器人开的个数就不一样。再试试最前面和最后面？';
  return '再换个地方藏，看机器人要开几个？最靠前、最靠后各试一次。';
}

/* ---------- 做：猜下一步 ---------- */

export type PuzzleKind = 'first' | 'middle' | 'last' | 'missing' | 'dup';
export const PUZZLE_KINDS: readonly PuzzleKind[] = ['first', 'middle', 'last', 'missing', 'dup'];

export interface Puzzle {
  kind: PuzzleKind;
  arr: number[];
  target: number;
}

export const PREDICT_N = 6;
export const PREDICT_GOAL = 5;
export const VALUE_MAX = 40;

/** 出一道题：数组里的数各不相同，只有 dup 题里目标出现两次；数里可能有 0 */
export function makePuzzle(kind: PuzzleKind, rand: () => number = Math.random, n = PREDICT_N): Puzzle {
  const pool = shuffled(Array.from({ length: VALUE_MAX + 1 }, (_, k) => k), rand);
  const arr = pool.slice(0, n);
  const spare = pool[n];
  const pos = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  switch (kind) {
    case 'first': return { kind, arr, target: arr[0] };
    case 'middle': return { kind, arr, target: arr[pos(1, n - 2)] };
    case 'last': return { kind, arr, target: arr[n - 1] };
    case 'missing': return { kind, arr, target: spare };
    default: {
      const p = pos(0, n - 3);
      const q = pos(p + 2, n - 1);
      const dup = [...arr];
      dup[q] = dup[p];
      return { kind, arr: dup, target: dup[p] };
    }
  }
}

export function genPuzzle(rand: () => number = Math.random): Puzzle {
  return makePuzzle(PUZZLE_KINDS[Math.floor(rand() * PUZZLE_KINDS.length)], rand);
}

export interface Round {
  kind: 'cmp' | 'next' | 'end';
  /** 画面上指着的下标；扫完以后的那一题是 arr.length */
  i: number;
  prompt: string;
  options: { key: string; text: string }[];
  correct: string;
  /** 答错时的解释 */
  why: string;
  /** 答对以后这一题就结束了（return 了或走到末尾） */
  ended: boolean;
  /** 答对以后的结果说明（ended 时显示） */
  result: string;
}

/** 一道题拆成几个小问题：每个位置猜「相等吗」；第一次不相等后猜「i 变成几」；走完猜返回什么 */
export function rounds(p: Puzzle, rand: () => number = Math.random): Round[] {
  const { arr, target } = p;
  const out: Round[] = [];
  let askedNext = false;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === target) {
      const later = arr.findIndex((x, k) => k > i && x === target);
      out.push({
        kind: 'cmp', i, ended: true,
        prompt: '轮到下标 ' + i + '：arr[' + i + '] = ' + v + '，目标是 ' + target + '。代码会怎么走？',
        options: shuffled([{ key: 'return', text: '相等：return ' + i }, { key: 'go', text: '不相等：继续看下一个' }], rand),
        correct: 'return',
        why: v + ' 就是目标，if 成立，执行 return ' + i + '，循环马上结束' + (later >= 0 ? '。后面下标 ' + later + ' 也是 ' + target + '，但第一个命中就返回了，不用管它。' : '，后面的不用看。'),
        result: '返回 ' + i + '。' + (i === 0 ? '0 是第 0 个位置，不是「没找到」。' : '共比较了 ' + (i + 1) + ' 次。'),
      });
      return out;
    }
    out.push({
      kind: 'cmp', i, ended: false,
      prompt: '轮到下标 ' + i + '：arr[' + i + '] = ' + v + '，目标是 ' + target + '。代码会怎么走？',
      options: shuffled([{ key: 'return', text: '相等：return ' + i }, { key: 'go', text: '不相等：继续看下一个' }], rand),
      correct: 'go',
      why: v + ' 不等于 ' + target + '，if 不成立，什么也不做，回到 for 看下一个。',
      result: '',
    });
    if (!askedNext && i + 1 < arr.length) {
      askedNext = true;
      out.push({
        kind: 'next', i, ended: false,
        prompt: '不相等，回到 for。下一轮 i 是几？',
        options: shuffled([{ key: 'same', text: 'i = ' + i + '（再看一遍）' }, { key: 'plus1', text: 'i = ' + (i + 1) }, { key: 'plus2', text: 'i = ' + (i + 2) + '（跳一个）' }], rand),
        correct: 'plus1',
        why: 'i 每轮只加 1，一个也不跳：从 ' + i + ' 到 ' + (i + 1) + '。跳过去的那个万一就是目标。',
        result: '',
      });
    }
  }
  out.push({
    kind: 'end', i: arr.length, ended: true,
    prompt: arr.length + ' 个都看完了，没有一个等于 ' + target + '。代码会返回什么？',
    options: shuffled([{ key: 'neg', text: 'return -1' }, { key: 'zero', text: 'return 0' }, { key: 'size', text: 'return ' + arr.length }], rand),
    correct: 'neg',
    why: '循环走完都没命中，落到最后一行 return -1。用 -1 是因为它不是任何一个下标，不会和「在第 0 个」混起来。',
    result: '返回 -1：没找到，比较了 ' + arr.length + ' 次，全都看完才敢下结论。',
  });
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'overrun' | 'zero' | 'last';
  arr: number[];
  target: number;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'overrun',
    title: '找不到时，程序崩溃',
    code: variant(2, '    for (i in 0..arr.size) {'),
    wrongLine: 2,
    fixed: '    for (i in arr.indices) {',
    arr: [4, 8, 2, 6],
    target: 5,
    expect: '数组里没有 5，应该返回 -1',
    explain: 'Kotlin 的 0..arr.size 包含右端点，最后一轮 i 等于 arr.size，arr[i] 越界。目标不存在时一定会走到这一轮，所以崩溃。用 arr.indices 或 0 until arr.size，右端点不包含。',
  },
  {
    id: 'zero',
    title: '找不到时，返回 0',
    code: variant(7, '    return 0'),
    wrongLine: 7,
    fixed: '    return -1',
    arr: [5, 9, 2],
    target: 7,
    expect: '数组里没有 7，应该返回 -1',
    explain: '0 是一个真正的下标，「在第 0 个位置找到」也返回 0，调用方分不清。「找不到」要用一个不可能是下标的值，常见是 -1。',
  },
  {
    id: 'last',
    title: '有重复时，找到的是最后一个',
    code: [
      'fun linearSearch(arr: IntArray, target: Int): Int {',
      '    var found = -1',
      '    for (i in arr.indices) {',
      '        if (arr[i] == target) {',
      '            found = i',
      '        }',
      '    }',
      '    return found',
      '}',
    ],
    wrongLine: 5,
    fixed: '            return i',
    arr: [3, 7, 3],
    target: 3,
    expect: '第一个 3 在下标 0，应该返回 0',
    explain: '命中以后只是记下下标，没有停，循环继续往后扫，后面又碰到一个 3，found 被盖掉。顺序查找要的是第一个，所以命中就要立刻 return。',
  },
];

export interface BugStep extends LinearStep {
  /** crash：崩溃；wrong：返回了错的值；ok：返回对了 */
  outcome: 'running' | 'ok' | 'wrong' | 'crash';
  /** 「记下下标」版里 found 变量的值，其他版本没有 */
  found: number | null;
}

/** 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<BugStep> {
  const { arr, target } = bug;
  const want = arr.indexOf(target);
  const steps: BugStep[] = [];
  let i = -1;
  let checks = 0;
  let hits: number[] = [];
  let found: number | null = null;
  const add = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({ line, i, checks, result: null, hits, note, done: false, outcome: 'running', found, ...extra });
  };
  const finish = (line: number, note: string, result: number) => {
    add(line, note, { result, done: true, outcome: result === want ? 'ok' : 'wrong' });
  };

  add(1, '在 [' + arr.join(', ') + '] 里找 ' + target + '。');
  if (bug.id === 'last') {
    found = -1;
    add(2, '先准备 found = -1，表示还没找到。');
    for (i = 0; i < arr.length; i++) {
      add(3, '轮到下标 ' + i + '。');
      checks++;
      const same = arr[i] === target;
      add(4, 'arr[' + i + '] = ' + arr[i] + '，目标 ' + target + '：' + (same ? '相等。' : '不相等。'));
      if (same) {
        found = i;
        hits = [...hits, i];
        add(5, '记下 found = ' + i + '。注意：这里没有 return，循环还会继续。');
      }
    }
    i = arr.length;
    add(8, '走完了，返回 found = ' + found + '。', { result: found, done: true, outcome: found === want ? 'ok' : 'wrong' });
    return steps;
  }
  const end = bug.id === 'overrun' ? arr.length + 1 : arr.length;
  for (i = 0; i < end; i++) {
    add(2, '轮到下标 ' + i + '。');
    if (i >= arr.length) {
      add(3, 'arr[' + i + '] 不存在，数组只有下标 0 到 ' + (arr.length - 1) + '：抛出 ArrayIndexOutOfBoundsException，程序崩溃！', { done: true, outcome: 'crash' });
      return steps;
    }
    checks++;
    const same = arr[i] === target;
    if (same) hits = [i];
    add(3, 'arr[' + i + '] = ' + arr[i] + '，目标 ' + target + '：' + (same ? '相等。' : '不相等。'));
    if (same) {
      finish(4, '找到了：return ' + i + '。', i);
      return steps;
    }
  }
  i = arr.length;
  finish(7, '都看完了，没有找到：这一行 return ' + (bug.id === 'zero' ? '0' : '-1') + '。', bug.id === 'zero' ? 0 : -1);
  return steps;
}

/** 找 bug 面板底部的判定文字 */
export function bugVerdict(step: BugStep, bug: Bug): string {
  if (!step.done) return '';
  const want = bug.arr.indexOf(bug.target);
  if (step.outcome === 'crash') return '💥 崩溃了。正确的代码找不到时应该返回 -1。';
  if (step.outcome === 'ok') return '✅ 返回 ' + step.result + '，对了。';
  if (bug.id === 'zero') return '❌ 返回 0。可是 0 号位置放的是 ' + bug.arr[0] + '，不是 ' + bug.target + '：调用方会以为在第 0 个。应该返回 -1。';
  return '❌ 返回 ' + step.result + '，应该是 ' + want + '：第一个 ' + bug.target + ' 在下标 ' + want + '。';
}

/** 找 bug 画面的格子：越界那一轮没有格子，由画面另外标出 */
export function bugCells(bug: Bug, step: BugStep): Cell[] {
  return arrayCells(bug.arr, step);
}

/* ---------- 做：逐步执行的输入 ---------- */

export const TRACE_PRESETS: readonly { kind: PuzzleKind; label: string }[] = [
  { kind: 'first', label: '在第一个' },
  { kind: 'middle', label: '在中间' },
  { kind: 'last', label: '在最后一个' },
  { kind: 'missing', label: '不存在' },
  { kind: 'dup', label: '有重复' },
];

/* ---------- 做：挑战 ---------- */

/** 挑战的箱子数：奇数，这样平均次数 (n+1)/2 是整数 */
export const CHALLENGE_MIN = 11;
export const CHALLENGE_MAX = 41;
export const CHALLENGE_GAMES = 200;

export function genChallenge(rand: () => number = Math.random): { n: number } {
  const k = Math.floor(rand() * ((CHALLENGE_MAX - CHALLENGE_MIN) / 2 + 1));
  return { n: CHALLENGE_MIN + 2 * k };
}

export function challengeWorst(n: number): number {
  return n;
}
export function challengeAverage(n: number): number {
  return (n + 1) / 2;
}

export function judgeWorst(n: number, guess: number): { ok: boolean; why: string } {
  if (guess === n) return { ok: true, why: '对！小熊在最后一个，或者根本没有，都要把 ' + n + ' 个开完。' };
  if (guess > n) return { ok: false, why: guess + ' 比箱子总数还多，没有那么多可开的。再想想：最倒霉的时候也不过是把每个都开一遍。' };
  return { ok: false, why: '再想想最倒霉的情况：小熊在最后一个，或者根本没有。前面的一个都不能跳。' };
}

/** 平均允许差 1，因为「大概一半」就是这个意思 */
export function judgeAverage(n: number, guess: number): { ok: boolean; why: string } {
  const avg = challengeAverage(n);
  if (Math.abs(guess - avg) <= 1) return { ok: true, why: '差不多！小熊在每个位置的可能一样大，开 1 到 ' + n + ' 次，平均是 (' + n + '+1)/2 = ' + avg + ' 次。' };
  return { ok: false, why: '想想：小熊在第 1 个要开 1 次，在第 ' + n + ' 个要开 ' + n + ' 次，各个位置的可能一样大，平均应该在两头的中间。' };
}

/** 小熊每次随机藏一个位置，模拟 games 局，统计要开几个 */
export function simulate(n: number, games: number, rand: () => number = Math.random): { average: number; best: number; worst: number } {
  const arr = Array.from({ length: n }, (_, k) => k);
  let sum = 0;
  let best = n;
  let worst = 0;
  for (let g = 0; g < games; g++) {
    const c = countChecks(arr, Math.floor(rand() * n));
    sum += c;
    best = Math.min(best, c);
    worst = Math.max(worst, c);
  }
  return { average: sum / games, best, worst };
}

/** 同样 n 个有序的箱子，二分查找最多要看几个 */
export function binaryWorst(n: number): number {
  return Math.floor(Math.log2(n)) + 1;
}
