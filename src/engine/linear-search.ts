import { m } from '../core/i18n';
import { FOLLOW_STEP } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, PredictRules, Puzzle as AskPuzzle, Rand,
  Step, Trace, TraceRules, Var,
} from '../core/types';

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

export interface LinearSearchStep extends Step {
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

export function buildTrace(arr: readonly number[], target: number): Trace<LinearSearchStep> {
  const steps: LinearSearchStep[] = [];
  let i = -1;
  let checks = 0;
  const add = (line: number, note: Msg, extra: Partial<LinearSearchStep> = {}) => {
    steps.push({ line, i, checks, result: null, hits: [], note, done: false, ...extra });
  };
  add(1, m('trace.note.start', { n: arr.length, target }));
  for (i = 0; i < arr.length; i++) {
    add(2, m('trace.note.turn', { i }));
    checks++;
    const same = arr[i] === target;
    add(3, m(same ? 'trace.note.same' : 'trace.note.diff', { i, v: arr[i], target }), same ? { hits: [i] } : {});
    if (same) {
      add(4, m('trace.note.hit', { i }), { result: i, hits: [i], done: true });
      return steps;
    }
  }
  add(7, arr.length === 0 ? m('trace.note.empty') : m('trace.note.miss', { n: arr.length, target }), { result: -1, done: true });
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
export function arrayCells(arr: readonly number[], step: Pick<LinearSearchStep, 'i' | 'hits'>): Cell[] {
  return arr.map((v, k) => ({ label: String(v), state: stateOf(k, step.i, step.hits) }));
}

/* ---------- 看、玩：玩具箱 ---------- */

/** 玩具的图案，下标就是玩具的编号 */
export const TOYS = ['🧱', '🚗', '🎈', '🪀', '🐻', '🥁', '🎺', '🧩', '🎨'] as const;
/** 玩具的名字在文案表里：toy.<编号> */
export const TOY_COUNT = TOYS.length;
export const BEAR = 4;
export const KID_N = 8;

const toyName = (id: number) => m('toy.' + id);

/** 玩具版的格子：开过和正在开的看得见玩具，没开的盖着 */
export function toyCells(ids: readonly number[], step: Pick<LinearSearchStep, 'i' | 'hits'>): Cell[] {
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
  out.push({ say: m('look.start'), cells: closedA, pointer: 0, kid: '🧒' });
  for (const s of a) {
    const id = LOOK_ROW_A[s.i];
    const found = s.hits.length > 0;
    out.push({
      say: found ? m('look.found', { n: s.i + 1 }) : m('look.open', { n: s.i + 1, toy: TOYS[id], name: toyName(id) }),
      cells: toyCells(LOOK_ROW_A, s), pointer: s.i, kid: found ? '🥳' : '🧒',
    });
  }
  const last = a[a.length - 1];
  out.push({
    say: m('look.stop', { rest: KID_N - 1 - last.i, n: last.checks }),
    cells: toyCells(LOOK_ROW_A, last), pointer: last.i, kid: '🧒',
  });

  const b = buildTrace(LOOK_ROW_B, BEAR).filter((s) => s.line === 3);
  out.push({ say: m('look.again'), cells: LOOK_ROW_B.map(() => ({ label: '', state: 'closed' as CellState })), pointer: 0, kid: '🧒' });
  out.push({ say: m('look.four', { n: b[3].checks }), cells: toyCells(LOOK_ROW_B, b[3]), pointer: 3, kid: '🧒' });
  const end = b[b.length - 1];
  out.push({
    say: m('look.none', { n: end.i + 1, total: KID_N }),
    cells: toyCells(LOOK_ROW_B, { i: end.i + 1, hits: [] }), pointer: -1, kid: '🤷',
  });
  return out;
}

/** 看：故事每次一样，「再看一次」只是回到第一页 */
const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: () => 0,
  frames: () => lookFrames(),
};

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
export function hideBear(n = KID_N, rand: () => number = Math.random): PlayRow {
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
export function playSay(outcome: Exclude<TapOutcome, 'over'>, row: PlayRow, k: number): Msg {
  const id = row.ids[k];
  switch (outcome) {
    case 'found': return m('find.say.found');
    case 'repeat': return m('find.say.repeat', { toy: TOYS[id], name: toyName(id) });
    default: return m('find.say.open', { toy: TOYS[id], name: toyName(id) });
  }
}

/** 一局结束后的总结：你开了几个，从左往右一个个开要几个 */
export function playSummary(row: PlayRow, st: PlayState): Msg {
  return m('find.summary', { n: st.opened.length, robot: row.bear + 1 });
}

export interface PlayQuiz {
  id: 'worst' | 'none';
  ask: Msg;
  options: number[];
  correct: number;
  right: Msg;
  why: Msg;
}

/** 玩几局以后追问，让孩子自己说出「最坏要全开」 */
export const PLAY_QUIZ: readonly PlayQuiz[] = [
  {
    id: 'worst', ask: m('find.quiz.worst.ask'), options: [1, 4, 8], correct: 8,
    right: m('find.quiz.worst.right'),
    why: m('find.quiz.worst.why'),
  },
  {
    id: 'none', ask: m('find.quiz.none.ask'), options: [0, 4, 8], correct: 8,
    right: m('find.quiz.none.right'),
    why: m('find.quiz.none.why'),
  },
];

/** 玩过几局以后开始追问 */
export const QUIZ_AFTER = 3;

/** 玩一的操作：点箱子、回答追问、再问一个、再藏一次 */
export type FindAction =
  | { type: 'tap'; k: number }
  | { type: 'answer'; n: number }
  | { type: 'nextQuiz' }
  | { type: 'again' };

export interface FindState extends PlayState {
  row: PlayRow;
  /** [箱子, 第几次]：让这个箱子晃一下 */
  shake: [number, number] | null;
  /** 找到过几次小熊 */
  games: number;
  /** 问到第几个追问 */
  quizAt: number;
  quizState: 'ask' | 'right' | 'wrong';
}

/** 玩一的箱子画面：没开的盖着，开过的看得见玩具，小熊亮起来 */
export function findCells(s: FindState): Cell[] {
  return s.row.ids.map((id, k) => {
    if (!s.opened.includes(k)) return { label: '', state: 'closed' as CellState };
    return { label: TOYS[id], state: id === BEAR ? ('hit' as CellState) : ('seen' as CellState) };
  });
}

const findQuiz = (s: FindState): PlayQuiz | null => (s.games >= QUIZ_AFTER && s.found ? PLAY_QUIZ[s.quizAt] ?? null : null);

/**
 * 玩法一「开箱子找小熊」：小熊由程序藏好，孩子自己点箱子。
 * 引导：点开过的箱子会晃一下并提示；星星只看有没有重复开，不看运气；
 * 玩过三局以后追问「最倒霉要开几个」「没有小熊呢」，让孩子自己说出「最坏要全开」。
 */
export const findRules: GameRules<FindState, FindAction> = {
  start: (rand) => ({
    state: { ...PLAY_START, row: hideBear(KID_N, rand), shake: null, games: 0, quizAt: 0, quizState: 'ask' },
    say: m('find.say.start'),
  }),

  act(s, a, rand) {
    if (a.type === 'tap') {
      if (s.found) return null;
      const { state, outcome } = tapBox(s.row, s, a.k);
      if (outcome === 'over') return null;
      const say = playSay(outcome, s.row, a.k);
      const next: FindState = { ...s, ...state };
      if (outcome === 'repeat') {
        next.shake = [a.k, (s.shake?.[1] ?? 0) + 1];
        return { state: next, say, sound: 'wrong' };
      }
      if (outcome === 'found') return { state: { ...next, games: s.games + 1 }, say, sound: 'win' };
      return { state: next, say, sound: 'right' };
    }
    if (a.type === 'answer') {
      const q = findQuiz(s);
      if (!q || s.quizState === 'right') return null;
      const ok = a.n === q.correct;
      return { state: { ...s, quizState: ok ? 'right' : 'wrong' }, sound: ok ? 'right' : 'wrong' };
    }
    if (a.type === 'nextQuiz') {
      if (!findQuiz(s) || s.quizState !== 'right' || s.quizAt + 1 >= PLAY_QUIZ.length) return null;
      return { state: { ...s, quizAt: s.quizAt + 1, quizState: 'ask' } };
    }
    if (a.type === 'again' && s.found) {
      return { state: { ...s, ...PLAY_START, row: hideBear(KID_N, rand), shake: null, quizState: 'ask' }, say: m('find.say.again') };
    }
    return null;
  },

  clickable: (s) => !s.found,

  controls(s) {
    if (!s.found) return [];
    const out: Control<FindAction>[] = [];
    if (findQuiz(s) && s.quizState === 'right' && s.quizAt + 1 < PLAY_QUIZ.length) {
      out.push({ type: 'button', action: { type: 'nextQuiz' }, label: m('find.nextQuiz'), look: 'small' });
    }
    out.push({ type: 'button', action: { type: 'again' }, label: m('find.again'), look: 'primary' });
    return out;
  },

  result(s) {
    if (!s.found) return null;
    const q = findQuiz(s);
    let quiz;
    if (q) {
      quiz = {
        prompt: q.ask,
        options: s.quizState === 'right'
          ? []
          : q.options.map((n): Control<FindAction> => ({ type: 'button', action: { type: 'answer', n }, label: m('find.quiz.n', { n }), look: 'choice' })),
        after: s.quizState === 'wrong' ? q.why : undefined,
        ok: s.quizState === 'right' ? m('find.quiz.ok', { text: q.right }) : undefined,
      };
    }
    return { stars: playStars(s.repeats), body: playSummary(s.row, s), quiz };
  },
};

/* ---------- 玩二：藏小熊，看机器人找 ---------- */

export interface RobotFrame {
  say: Msg;
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
    say: m('robot.say.start'),
    cells: ids.map(() => ({ label: '', state: 'closed' as CellState })), pointer: 0, count: 0, done: false,
  }];
  for (const s of buildTrace(ids, BEAR).filter((x) => x.line === 3)) {
    const found = s.hits.length > 0;
    out.push({
      say: found ? m('robot.say.found', { n: s.checks }) : m('robot.say.open', { n: s.checks, toy: TOYS[ids[s.i]] }),
      cells: toyCells(ids, s), pointer: s.i, count: s.checks, done: found,
    });
    if (found) return out;
  }
  out[out.length - 1] = {
    ...out[out.length - 1], say: m('robot.say.none', { n }),
    cells: toyCells(ids, { i: n, hits: [] }), pointer: -1, done: true,
  };
  return out;
}

/** 孩子试过的藏法：位置（null 是不藏）对应开的个数 */
export type Tally = { at: number | null; count: number }[];

/** 试了几种以后，对孩子说一句引导的话 */
export function robotNote(tally: Tally, n = KID_N): Msg {
  if (tally.length === 0) return m('robot.note.none');
  const counts = tally.map((t) => t.count);
  const hasEnd = tally.some((t) => t.at === n - 1 || t.at === null);
  const hasEarly = tally.some((t) => t.at !== null && t.at <= 1);
  if (hasEnd && hasEarly) return m('robot.note.got', { n });
  if (Math.max(...counts) - Math.min(...counts) >= 2) return m('robot.note.differ');
  return m('robot.note.more');
}

/** 玩二的操作：把小熊藏在第 at 个箱子（null 是不藏） */
export type RobotAction = { type: 'hide'; at: number | null };

export interface RobotState {
  frames: RobotFrame[];
  /** 现在放到第几帧 */
  at: number;
  /** 这一回藏在哪里；还没藏过是 undefined */
  hidden: number | null | undefined;
  running: boolean;
  tally: Tally;
}

const robotClosed: Cell[] = Array.from({ length: KID_N }, () => ({ label: '', state: 'closed' as CellState }));

/** 机器人此刻的箱子和箭头位置；还没开始时箱子全盖着 */
export function robotView(s: RobotState): { cells: Cell[]; pointer: number } {
  const cur = s.frames[s.at];
  return { cells: cur?.cells ?? robotClosed, pointer: cur ? cur.pointer : -1 };
}

/**
 * 玩法二「藏小熊」：孩子选一个箱子藏小熊（或者不藏），小机器人从左往右一个个开。
 * 引导：记下每次开了几个，试过最前面和最后面以后，说出「越靠后越慢，没有捷径」。
 */
export const robotRules: GameRules<RobotState, RobotAction> = {
  start: () => ({ state: { frames: [], at: 0, hidden: undefined, running: false, tally: [] }, say: m('robot.say.idle') }),

  act(s, a) {
    if (s.running) return null;
    const frames = robotFrames(a.at);
    return {
      state: { ...s, frames, at: 0, hidden: a.at, running: true },
      say: frames[0].say,
      sound: 'tap',
      after: FOLLOW_STEP,
    };
  },

  tick(s) {
    if (s.at >= s.frames.length - 1) {
      const last = s.frames[s.at];
      const key = s.hidden ?? null;
      const tally = [...s.tally.filter((t) => t.at !== key), { at: key, count: last.count }].sort((x, y) => (x.at ?? KID_N) - (y.at ?? KID_N));
      return { state: { ...s, running: false, tally }, sound: 'win' };
    }
    const at = s.at + 1;
    return { state: { ...s, at }, say: s.frames[at].say, sound: 'tick', after: FOLLOW_STEP };
  },

  // 切标签时机器人停在当前这一帧，不再往下走
  interrupt: (s) => ({ state: { ...s, running: false } }),

  clickable: (s) => !s.running,
  controls: () => [],
};

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
export function makePuzzle(kind: PuzzleKind, n = PREDICT_N, rand: () => number = Math.random): Puzzle {
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
  return makePuzzle(PUZZLE_KINDS[Math.floor(rand() * PUZZLE_KINDS.length)], PREDICT_N, rand);
}

export interface Round {
  kind: 'cmp' | 'next' | 'end';
  /** 画面上指着的下标；扫完以后的那一题是 arr.length */
  i: number;
  prompt: Msg;
  options: { key: string; text: Msg }[];
  correct: string;
  /** 答错时的解释 */
  why: Msg;
  /** 答对以后这一题就结束了（return 了或走到末尾） */
  ended: boolean;
  /** 答对以后的结果说明（ended 时显示） */
  result: Msg | null;
}

const NO_RESULT = null;

/** 一道题拆成几个小问题：每个位置猜「相等吗」；第一次不相等后猜「i 变成几」；走完猜返回什么 */
export function rounds(p: Puzzle, rand: () => number = Math.random): Round[] {
  const { arr, target } = p;
  const out: Round[] = [];
  let askedNext = false;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    const prompt = m('predict.cmp', { i, v, target });
    const options = () => shuffled([{ key: 'return', text: m('predict.opt.return', { i }) }, { key: 'go', text: m('predict.opt.go') }], rand);
    if (v === target) {
      const later = arr.findIndex((x, k) => k > i && x === target);
      out.push({
        kind: 'cmp', i, ended: true, prompt, options: options(), correct: 'return',
        why: later >= 0 ? m('predict.why.returnDup', { v, i, later, target }) : m('predict.why.return', { v, i }),
        result: i === 0 ? m('predict.result.zero') : m('predict.result.hit', { i, n: i + 1 }),
      });
      return out;
    }
    out.push({
      kind: 'cmp', i, ended: false, prompt, options: options(), correct: 'go',
      why: m('predict.why.go', { v, target }),
      result: NO_RESULT,
    });
    if (!askedNext && i + 1 < arr.length) {
      askedNext = true;
      out.push({
        kind: 'next', i, ended: false,
        prompt: m('predict.next'),
        options: shuffled([
          { key: 'same', text: m('predict.opt.same', { i }) },
          { key: 'plus1', text: m('predict.opt.plus1', { i: i + 1 }) },
          { key: 'plus2', text: m('predict.opt.plus2', { i: i + 2 }) },
        ], rand),
        correct: 'plus1',
        why: m('predict.why.plus1', { i, next: i + 1 }),
        result: NO_RESULT,
      });
    }
  }
  out.push({
    kind: 'end', i: arr.length, ended: true,
    prompt: m('predict.askEnd', { n: arr.length, target }),
    options: shuffled([{ key: 'neg', text: m('predict.opt.neg') }, { key: 'zero', text: m('predict.opt.zero') }, { key: 'size', text: m('predict.opt.size', { n: arr.length }) }], rand),
    correct: 'neg',
    why: m('predict.why.neg'),
    result: m('predict.result.miss', { n: arr.length }),
  });
  return out;
}

/** 猜下一步画面的样子：数组、当前下标、命中的格子、箭头位置 */
export interface PredictView {
  arr: number[];
  i: number;
  hits: number[];
  pointer: number;
}

/** 把一道题排成一问接一问：每一问都是选项题，答案是选项的 key */
export function askPuzzle(p: Puzzle, rand: () => number = Math.random): AskPuzzle<PredictView, string> {
  const list = rounds(p, rand);
  const asks = list.map((r) => ({
    // 「下一个 i」那一题：这一格已经看过，还没轮到下一格
    view: { arr: p.arr, i: r.kind === 'next' ? r.i + 1 : r.i, hits: [], pointer: r.kind === 'cmp' ? r.i : -1 },
    prompt: r.prompt,
    kind: 'choose' as const,
    answer: r.correct,
    options: r.options.map((o) => ({ value: o.key, label: o.text })),
    why: r.why,
  }));
  const last = list[list.length - 1];
  const hit = last.kind === 'cmp';
  return {
    chips: [['target', p.target]],
    asks,
    end: { view: { arr: p.arr, i: last.i, hits: hit ? [last.i] : [], pointer: hit ? last.i : -1 }, prompt: m('predict.end', { result: last.result! }) },
  };
}

const predictRules: PredictRules<PredictView, string> = {
  goal: PREDICT_GOAL,
  puzzle(rand = Math.random) {
    return askPuzzle(genPuzzle(rand), rand);
  },
};

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
    title: m('bug.overrun.title'),
    code: variant(2, '    for (i in 0..arr.size) {'),
    wrongLine: 2,
    fixed: '    for (i in arr.indices) {',
    arr: [4, 8, 2, 6],
    target: 5,
    expect: m('bug.overrun.expect'),
    explain: m('bug.overrun.explain'),
  },
  {
    id: 'zero',
    title: m('bug.zero.title'),
    code: variant(7, '    return 0'),
    wrongLine: 7,
    fixed: '    return -1',
    arr: [5, 9, 2],
    target: 7,
    expect: m('bug.zero.expect'),
    explain: m('bug.zero.explain'),
  },
  {
    id: 'last',
    title: m('bug.last.title'),
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
    expect: m('bug.last.expect'),
    explain: m('bug.last.explain'),
  },
];

export interface BugStep extends LinearSearchStep {
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
  const add = (line: number, note: Msg, extra: Partial<BugStep> = {}) => {
    steps.push({ line, i, checks, result: null, hits, note, done: false, outcome: 'running', found, ...extra });
  };
  const finish = (line: number, note: Msg, result: number) => {
    add(line, note, { result, done: true, outcome: result === want ? 'ok' : 'wrong' });
  };

  add(1, m('bug.note.start', { arr: arr.join(', '), target }));
  if (bug.id === 'last') {
    found = -1;
    add(2, m('bug.note.foundInit'));
    for (i = 0; i < arr.length; i++) {
      add(3, m('trace.note.turn', { i }));
      checks++;
      const same = arr[i] === target;
      add(4, m(same ? 'bug.note.same' : 'bug.note.diff', { i, v: arr[i], target }));
      if (same) {
        found = i;
        hits = [...hits, i];
        add(5, m('bug.note.remember', { i }));
      }
    }
    i = arr.length;
    add(8, m('bug.note.foundEnd', { found }), { result: found, done: true, outcome: found === want ? 'ok' : 'wrong' });
    return steps;
  }
  const end = bug.id === 'overrun' ? arr.length + 1 : arr.length;
  for (i = 0; i < end; i++) {
    add(2, m('trace.note.turn', { i }));
    if (i >= arr.length) {
      add(3, m('bug.note.crash', { i, last: arr.length - 1 }), { done: true, outcome: 'crash' });
      return steps;
    }
    checks++;
    const same = arr[i] === target;
    if (same) hits = [i];
    add(3, m(same ? 'bug.note.same' : 'bug.note.diff', { i, v: arr[i], target }));
    if (same) {
      finish(4, m('bug.note.ret', { i }), i);
      return steps;
    }
  }
  i = arr.length;
  finish(7, m('bug.note.end', { v: bug.id === 'zero' ? '0' : '-1' }), bug.id === 'zero' ? 0 : -1);
  return steps;
}

/** 找 bug 面板底部的判定文字；没播完是 null */
export function bugVerdict(step: BugStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  const want = bug.arr.indexOf(bug.target);
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  if (step.outcome === 'ok') return m('bug.verdict.ok', { result: step.result ?? '' });
  if (bug.id === 'zero') return m('bug.verdict.zero', { v: bug.arr[0], target: bug.target });
  return m('bug.verdict.wrong', { result: step.result ?? '', want, target: bug.target });
}

/** 找 bug 画面的格子：越界那一轮没有格子，由画面另外标出 */
export function bugCells(bug: Bug, step: BugStep): Cell[] {
  return arrayCells(bug.arr, step);
}

const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: bug.arr.join(', '), target: bug.target, expect: bug.expect }),
  vars(s, bug): Var[] {
    const out: Var[] = [
      ['target', bug.target],
      ['i', s.i < 0 ? '—' : s.i],
      ['arr[i]', s.i >= 0 && s.i < bug.arr.length ? bug.arr[s.i] : '—'],
    ];
    if (bug.id === 'last') out.push(['found', s.found ?? '—']);
    out.push([m('var.ret'), s.result === null ? '—' : s.result]);
    return out;
  },
  verdict: bugVerdict,
};

/* ---------- 做：逐步执行的输入 ---------- */

export const TRACE_KINDS: readonly PuzzleKind[] = ['first', 'middle', 'last', 'missing', 'dup'];

/** 逐步执行面板的输入：目标在哪里（题型）、数组和目标值 */
export type TraceInput = Puzzle;

export type TraceAction = { type: 'kind'; kind: PuzzleKind } | { type: 'fresh' };

const traceRules: TraceRules<TraceInput, LinearSearchStep, TraceAction> = {
  code: CODE,
  start: (rand) => makePuzzle('middle', PREDICT_N, rand),
  act: (input, a, rand) => makePuzzle(a.type === 'kind' ? a.kind : input.kind, PREDICT_N, rand),
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.where'), value: input.kind,
      options: TRACE_KINDS.map((kind) => ({ value: kind, label: m('trace.kind.' + kind) })),
      choose: (v) => ({ type: 'kind', kind: v as PuzzleKind }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.arr, input.target),
  vars: (input, s): Var[] => [
    ['target', input.target],
    ['i', s.i < 0 ? '—' : s.i],
    ['arr[i]', s.i >= 0 && s.i < input.arr.length ? input.arr[s.i] : '—'],
    [m('var.checks'), m('var.times', { n: s.checks })],
    [m('var.ret'), s.result === null ? '—' : s.result],
  ],
  summary(input, s) {
    if (!s.done) return null;
    return s.result === -1
      ? m('trace.sumMiss', { n: input.arr.length, checks: s.checks })
      : m('trace.sumHit', { result: s.result ?? '', checks: s.checks });
  },
};

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

export function judgeWorst(n: number, guess: number): { ok: boolean; why: Msg } {
  if (guess === n) return { ok: true, why: m('chal.worst.ok', { n }) };
  if (guess > n) return { ok: false, why: m('chal.worst.over', { guess }) };
  return { ok: false, why: m('chal.worst.low') };
}

/** 平均允许差 1，因为「大概一半」就是这个意思 */
export function judgeAverage(n: number, guess: number): { ok: boolean; why: Msg } {
  const avg = challengeAverage(n);
  if (Math.abs(guess - avg) <= 1) return { ok: true, why: m('chal.avg.ok', { n, avg }) };
  return { ok: false, why: m('chal.avg.low', { n }) };
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

/** 挑战的操作：猜一个数、跑模拟、换一排 */
export type ChallengeAction = { type: 'guess'; n: number } | { type: 'run' } | { type: 'fresh' };

export interface ChallengeState {
  n: number;
  /** worst：猜最坏；avg：猜平均；sim：让程序藏 200 次 */
  step: 'worst' | 'avg' | 'sim';
  /** 输入不合规或猜错时的提示 */
  oops: Msg | null;
  /** 猜对时的讲解，留到下一步 */
  ok: Msg | null;
  result: { average: number; best: number; worst: number } | null;
  /** 有效的猜测次数：变了输入框就清空 */
  guesses: number;
}

const challengeStart = (rand?: Rand): ChallengeState => ({ n: genChallenge(rand).n, step: 'worst', oops: null, ok: null, result: null, guesses: 0 });

/** 挑战：先猜最坏要开几个，再猜平均要开几个，最后让程序藏 200 次小熊来验证 */
export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeStart(rand) }),

  act(s, a, rand) {
    if (a.type === 'fresh') return { state: challengeStart(rand) };
    if (a.type === 'run') return s.step === 'sim' ? { state: { ...s, result: simulate(s.n, CHALLENGE_GAMES, rand) }, sound: 'win' } : null;
    if (s.step === 'sim') return null;
    if (isNaN(a.n) || a.n < 1) return { state: { ...s, oops: m('chal.oops') } };
    const j = s.step === 'worst' ? judgeWorst(s.n, a.n) : judgeAverage(s.n, a.n);
    const guesses = s.guesses + 1;
    if (!j.ok) return { state: { ...s, oops: j.why, guesses }, sound: 'wrong' };
    return { state: { ...s, oops: null, ok: j.why, step: s.step === 'worst' ? 'avg' : 'sim', guesses }, sound: 'right' };
  },

  clickable: () => false,

  controls(s) {
    if (s.step === 'sim') {
      if (!s.result) return [{ type: 'button', action: { type: 'run' }, label: m('chal.run', { games: CHALLENGE_GAMES }), look: 'primary' }];
      return [
        { type: 'button', action: { type: 'run' }, label: m('chal.again', { games: CHALLENGE_GAMES }), look: 'small' },
        { type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'small' },
      ];
    }
    return [{
      type: 'number', label: m(s.step === 'worst' ? 'chal.q.worst' : 'chal.q.avg'), placeholder: m('chal.placeholder'), min: 1,
      submit: (n) => ({ type: 'guess', n }), submitLabel: m('chal.submit'), invalid: { type: 'guess', n: NaN }, clearOn: s.guesses,
    }];
  },

  hud: (s) => ({
    chips: s.result
      ? [
          [m('chal.avgLabel'), m('chal.count', { v: s.result.average.toFixed(1) })],
          [m('chal.calcLabel'), m('chal.count', { v: challengeAverage(s.n) })],
          [m('chal.bestLabel'), m('chal.count', { v: s.result.best })],
          [m('chal.worstLabel'), m('chal.count', { v: s.result.worst })],
        ]
      : [],
  }),

  result: (s) => (s.result ? { title: m('chal.win'), body: m('chal.winBody', { n: s.n, bin: binaryWorst(s.n) }) } : null),
};

/* ---------- 延伸：快还是慢 ---------- */

/** 数据已经排好序时，最坏情况下要看的个数：顺序查找是 n，二分查找是 ⌊log₂n⌋+1 */
export function compareRows() {
  return [
    { label: '8', unit: m('compare.boxes'), n: 8 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.seq'), value: r.n, tone: 'muted' as const },
      { name: m('compare.bin'), value: binaryWorst(r.n), tone: 'accent' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { find: findRules, robot: robotRules, challenge: challengeRules },
};
