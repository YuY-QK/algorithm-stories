import { m } from '../core/i18n';
import { PAUSE_BRIEF, PAUSE_LONG, PAUSE_MID, PAUSE_SHORT } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

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
export interface LookPage extends LookFrame {
  /** 小兔子站在第几级 */
  bunny: number;
  /** 每一级台阶上的便签，null 表示还没写 */
  notes: (number | null)[];
  /** 高亮的台阶：这一级的答案是从哪几级来的 */
  from: number[];
  /** 正在回答的那一级 */
  ask: number | null;
}

export function lookFrames(n: number = KID_N): LookPage[] {
  const t = waysTable(n);
  const blank = (): (number | null)[] => Array(n + 1).fill(null);
  const notes = blank();
  const out: LookPage[] = [];
  const add = (say: Msg, bunny: number, from: number[], ask: number | null) =>
    out.push({ say, bunny, notes: [...notes], from, ask });

  add(m('look.start'), 0, [], null);
  notes[0] = 1;
  notes[1] = 1;
  add(m('look.one'), 1, [], null);
  notes[2] = 2;
  add(m('look.two'), 2, [], null);
  add(m('look.threeAsk'), 3, [2, 1], 3);
  notes[3] = t[3];
  add(m('look.threeAdd', { a: t[2], b: t[1], c: t[3] }), 3, [2, 1], null);
  for (let i = 4; i <= n; i++) {
    notes[i] = t[i];
    add(m('look.next', { i, a: t[i - 1], b: t[i - 2], c: t[i] }), i, [i - 1, i - 2], null);
  }
  add(m('look.end', { n, c: t[n] }), n, [], null);
  return out;
}

/** 看的规则：故事是固定的，「再看一次」从头再来 */
const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: (prev) => prev,
  frames: () => lookFrames(KID_N),
};

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

/* ---------- 玩法一：数跳法（游戏状态） ---------- */

const COUNT_LEVELS = [...FIND_LEVELS, ...GUESS_LEVELS];

/**
 * 先自己点出第 1～3 级的所有跳法，再看着便签猜第 4～6 级该写几。
 * 引导：跳过头会摇头；重复的跳法提醒「已经有啦」；猜错时下面两级的便签闪光，不说「错了」。
 * busy：跳到了，稍等一下把这一跳收起来（tick）。
 */
export interface CountGame {
  /** 第几级任务（COUNT_LEVELS 的下标） */
  li: number;
  notes: (number | null)[];
  path: number[];
  found: number[][];
  busy: boolean;
  levelDone: boolean;
  allDone: boolean;
  /** 全部答错的次数（算星星）和这一级答错的次数（决定给哪句提示） */
  wrongs: number;
  levelWrongs: number;
  /** 这一级已经猜过的数，不能再点 */
  tried: number[];
  /** 闪光的两级，glowN 每猜错一次加一（让画面重新闪） */
  glow: number[];
  glowN: number;
  /** 摇头的按钮：[按钮名（h1、h2、o＋数字）, 第几次] */
  shake: [string, number] | null;
}

export type CountAction = { type: 'hop'; h: 1 | 2 } | { type: 'choose'; v: number } | { type: 'next' } | { type: 'again' };

const blankNotes = (): (number | null)[] => {
  const a: (number | null)[] = Array(KID_N + 1).fill(null);
  a[0] = 1;
  return a;
};

export const countLevel = (g: CountGame) => COUNT_LEVELS[g.li];
export const countFinding = (g: CountGame) => FIND_LEVELS.includes(countLevel(g));

/** 开始第 li 级任务：跳法、猜过的数都清掉，便签和答错次数留着 */
function countBegin(base: Pick<CountGame, 'li' | 'notes' | 'wrongs'>): Outcome<CountGame> {
  const level = COUNT_LEVELS[base.li];
  const say = FIND_LEVELS.includes(level)
    ? m(base.li === 0 ? 'count.say.find0' : 'count.say.find', { n: level })
    : m(base.li === FIND_LEVELS.length ? 'count.say.look' : 'count.say.note', { n: level });
  return {
    state: {
      ...base, path: [], found: [], busy: false, levelDone: false, allDone: false, levelWrongs: 0, tried: [], glow: [], glowN: 0, shake: null,
    },
    say,
  };
}

const withNote = (notes: (number | null)[], level: number, v: number) => notes.map((x, i) => (i === level ? v : x));
const buzz = (g: CountGame, id: string): [string, number] => [id, (g.shake?.[1] ?? 0) + 1];

export const countRules: GameRules<CountGame, CountAction> = {
  start: () => countBegin({ li: 0, notes: blankNotes(), wrongs: 0 }),

  act(g, a) {
    const level = countLevel(g);
    switch (a.type) {
      case 'hop': {
        if (g.busy || !countFinding(g) || g.levelDone || g.allDone) return null;
        if (!canHop(level, g.path, a.h)) {
          return { state: { ...g, shake: buzz(g, 'h' + a.h) }, say: m('count.say.over', { sofar: pathSum(g.path), h: a.h, n: level }), sound: 'wrong' };
        }
        const path = [...g.path, a.h];
        if (pathSum(path) < level) return { state: { ...g, path }, sound: 'tap' };
        // 跳到了：先看是不是已经有的跳法
        const key = pathKey(path);
        const text = path.join(' + ');
        if (g.found.some((p) => pathKey(p) === key)) {
          return { state: { ...g, path, busy: true }, say: m('count.say.dup', { path: text }), sound: ['tap', 'wrong'], after: PAUSE_LONG };
        }
        const found = [...g.found, path];
        const total = ways(level);
        if (found.length === total) {
          return {
            state: { ...g, path, found, busy: true, levelDone: true, notes: withNote(g.notes, level, total) },
            say: m('count.say.levelDone', { n: level, total }),
            sound: ['tap', 'right'],
            after: PAUSE_SHORT,
          };
        }
        return {
          state: { ...g, path, found, busy: true },
          say: m('count.say.found', { path: text, k: found.length, total }),
          sound: ['tap', 'right'],
          after: PAUSE_MID,
        };
      }
      case 'choose': {
        if (countFinding(g) || g.levelDone || g.tried.includes(a.v)) return null;
        if (a.v === ways(level)) {
          return {
            state: { ...g, levelDone: true, notes: withNote(g.notes, level, a.v), glow: [] },
            say: m('count.say.right', { a: ways(level - 1), b: ways(level - 2), v: a.v }),
            sound: 'right',
          };
        }
        const levelWrongs = g.levelWrongs + 1;
        return {
          state: {
            ...g, wrongs: g.wrongs + 1, levelWrongs, tried: [...g.tried, a.v], shake: buzz(g, 'o' + a.v), glow: [level - 1, level - 2], glowN: g.glowN + 1,
          },
          say: levelWrongs === 1 ? m('count.say.wrong1', { v: a.v }) : m('count.say.wrong2'),
          sound: 'wrong',
        };
      }
      case 'next':
        if (!g.levelDone || g.allDone) return null;
        if (g.li >= COUNT_LEVELS.length - 1) return { state: { ...g, allDone: true }, say: m('count.say.all'), sound: 'win' };
        return countBegin({ li: g.li + 1, notes: g.notes, wrongs: g.wrongs });
      case 'again':
        return g.allDone ? countBegin({ li: 0, notes: blankNotes(), wrongs: 0 }) : null;
    }
  },

  // 一跳收起来
  tick: (g): Outcome<CountGame> => ({ state: { ...g, path: [], busy: false } }),

  // 切标签时：等着收起来的跳法也直接收起来
  interrupt: (g) => (g.busy ? { state: { ...g, path: [], busy: false } } : { state: g }),

  clickable: (g) => !g.busy && !g.levelDone && !g.allDone,

  controls(g) {
    if (g.allDone) return [{ type: 'button', action: { type: 'again' }, label: m('count.again'), look: 'primary' }];
    if (g.levelDone) {
      return [{ type: 'button', action: { type: 'next' }, label: m(g.li >= COUNT_LEVELS.length - 1 ? 'count.finish' : 'count.next'), look: 'primary' }];
    }
    return [];
  },

  result: (g) => (g.allDone ? { stars: playStars(g.wrongs), body: m('count.all.body') } : null),
};

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

/* ---------- 玩法二：便签有多省事（游戏状态） ---------- */

export const NOTES_START = 5;
export const NOTES_MAX = 6;
/** 爬到最高一级以后，对比表里列的几个大楼梯 */
export const BIG_STAIRS = [10, 20, 30, 50];

/**
 * 不用便签，每个圆圈都要重新算一遍；孩子点出「前面已经算过」的圆圈，它们贴上便签、下面整棵树变灰。
 * 引导：点错只摇一下并说原因，连续两次点错，数字相同的两个圆圈会闪光。
 */
export interface NotesGame {
  n: number;
  phase: 'tap' | 'explore';
  /** 已经被找出来的 lookup 节点 */
  found: number[];
  /** 连续点错几次，找对一个就清零 */
  misses: number;
  glow: number[];
  /** 每次闪光加一（让画面重新闪） */
  glowN: number;
  /** 摇头的圆圈：[节点, 第几次] */
  shake: [number, number] | null;
}

export type NotesAction = { type: 'pick'; id: number } | { type: 'higher' } | { type: 'again' };

export const notesRoot = (g: NotesGame) => callTree(g.n);
export const notesLookups = (g: NotesGame) => flatten(notesRoot(g)).filter((x) => x.kind === 'lookup');

const notesFresh = (): NotesGame => ({ n: NOTES_START, phase: 'tap', found: [], misses: 0, glow: [], glowN: 0, shake: null });

export const notesRules: GameRules<NotesGame, NotesAction> = {
  start: () => ({ state: notesFresh(), say: m('notes.say.start') }),

  act(g, a) {
    switch (a.type) {
      case 'pick': {
        if (g.phase !== 'tap') return null;
        const root = notesRoot(g);
        const node = flatten(root).find((x) => x.id === a.id);
        if (!node) return null;
        if (node.kind === 'lookup') {
          if (g.found.includes(node.id)) return null;
          const found = [...g.found, node.id];
          const n: NotesGame = { ...g, found, glow: [], misses: 0 };
          if (found.length === notesLookups(g).length) {
            return { state: { ...n, phase: 'explore' }, say: m('notes.say.done', { naive: naiveCalls(g.n), memo: memoCalls(g.n) }), sound: 'win' };
          }
          return { state: n, say: m('notes.say.found', { n: node.n }), sound: 'right' };
        }
        const misses = g.misses + 1;
        const shake: [number, number] = [node.id, (g.shake?.[1] ?? 0) + 1];
        let say: Msg = node.kind === 'skipped' ? m('notes.say.skipped') : node.n <= 1 ? m('notes.say.known', { n: node.n }) : m('notes.say.first', { n: node.n });
        let n: NotesGame = { ...g, misses, shake };
        if (misses >= 2) {
          const target = notesLookups(g).find((x) => !g.found.includes(x.id));
          if (target) {
            n = { ...n, glow: [target.id, twinOf(root, target.id)], glowN: g.glowN + 1 };
            say = m('notes.say.glow');
          }
        }
        return { state: n, say, sound: 'wrong' };
      }
      case 'higher':
        if (g.phase !== 'explore' || g.n >= NOTES_MAX) return null;
        return { state: { ...g, n: g.n + 1 }, say: m('notes.say.higher', { n: g.n + 1, naive: naiveCalls(g.n + 1), memo: memoCalls(g.n + 1) }), sound: 'tick' };
      case 'again':
        return g.phase === 'explore' ? { state: notesFresh(), say: m('notes.say.again') } : null;
    }
  },

  clickable: (g) => g.phase === 'tap',

  controls: (g) =>
    g.phase === 'tap'
      ? []
      : [
          { type: 'button', action: { type: 'higher' }, label: m('notes.higher'), aria: m('notes.aria.higher'), look: 'primary', disabled: g.n >= NOTES_MAX },
          { type: 'button', action: { type: 'again' }, label: m('notes.again') },
        ],
};

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
  /** 刚刚写进去的那一格（比上一步多出来的），画面闪一下；找 bug 的轨迹里是 null */
  fresh: number | null;
  /** 'running' 还在跑；'ok' 对；'wrong'（找 bug 时）跑完了但答案不对；'crash'（找 bug 时）下标越界 */
  outcome: 'running' | 'ok' | 'wrong' | 'crash';
}

/** n ≥ 2。每一步对应 CODE 里的一行 */
export function buildTrace(n: number): Trace<DpStep> {
  const dp: (number | null)[] = Array(n + 2).fill(null);
  const steps: DpStep[] = [];
  let i: number | null = null;
  const push = (line: number, note: Msg, extra: Partial<DpStep> = {}) => {
    steps.push({ line, dp: [...dp], i, from: [], result: null, fresh: null, outcome: 'running', note, done: false, ...extra });
  };

  push(2, m('trace.note.table'));
  dp[0] = 1;
  push(3, m('trace.note.dp0'));
  dp[1] = 1;
  push(4, m('trace.note.dp1'));
  for (i = 2; i <= n; i++) {
    push(5, m('trace.note.i', { i }));
    const a = dp[i - 1]!;
    const b = dp[i - 2]!;
    dp[i] = a + b;
    push(6, m('trace.note.fill', { i, i1: i - 1, i2: i - 2, x: a, y: b, v: dp[i]! }), { from: [i - 1, i - 2] });
  }
  i = null;
  push(5, m('trace.note.endLoop', { n }));
  push(8, m('trace.note.ret', { n, v: dp[n]! }), { result: dp[n], outcome: 'ok', done: true });
  // 刚刚写进去的那一格：这一步比上一步多出来的
  steps.forEach((st, k) => {
    const idx = k === 0 ? -1 : st.dp.findIndex((v, x) => v !== null && steps[k - 1].dp[x] === null);
    st.fresh = idx >= 0 ? idx : null;
  });
  return steps;
}

/** 逐步执行面板的输入：楼梯级数 */
export interface TraceInput {
  n: number;
}

export type TraceAction = { type: 'n'; n: number };

/** 做：逐步执行。dp 表、代码行和变量同步 */
export const traceRules: TraceRules<TraceInput, DpStep, TraceAction> = {
  code: CODE,
  start: () => ({ n: 8 }),
  act: (_input, a) => ({ n: a.n }),
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.n'), value: input.n,
      options: [5, 8, 12].map((v) => ({ value: v, label: m('num', { n: v }) })),
      choose: (v) => ({ type: 'n', n: Number(v) }),
    },
  ],
  trace: (input) => buildTrace(input.n),
  vars(input, st): Var[] {
    const i = st.i;
    return [
      ['n', input.n],
      ['i', i ?? '—'],
      ['dp[i-1]', i !== null && i >= 1 ? (st.dp[i - 1] ?? '—') : '—'],
      ['dp[i-2]', i !== null && i >= 2 ? (st.dp[i - 2] ?? '—') : '—'],
    ];
  },
  summary: (input, st) => (st.done ? m('trace.summary', { n: input.n, v: st.result!, k: input.n - 1 }) : null),
};

/* ---------- 做：猜下一步 ---------- */

export interface Round {
  /** 要填第几格 */
  i: number;
  /** 它来自哪两格 */
  from: [number, number];
  value: number;
  /** 填之前的 dp 表 */
  dp: (number | null)[];
  /** dp[i] 的四个选项 */
  options: number[];
  /** 选错值时的解释 */
  why: Msg;
}

/** n ≥ 2，从 dp[2] 一格一格往后填 */
export function rounds(n: number): Round[] {
  const t = waysTable(n);
  const out: Round[] = [];
  for (let i = 2; i <= n; i++) {
    const dp = t.map((v, k) => (k < i ? v : null));
    const r = {
      i, from: [i - 1, i - 2] as [number, number], value: t[i], dp, options: [] as number[],
      why: m('why.sum', { i, i1: i - 1, i2: i - 2, x: t[i - 1], y: t[i - 2], v: t[i] }),
    };
    r.options = valueOptions(r);
    out.push(r);
  }
  return out;
}

/** 点错格子时的解释：还空着，或者不是紧挨着的前两格 */
export function whyFrom(r: Round, k: number): Msg {
  return r.dp[k] === null ? m('why.empty', { k }) : m('why.from', { i: r.i, i1: r.i - 1, i2: r.i - 2 });
}

/** 猜下一步每次出一道新题：楼梯 6～10 级 */
export function genPredict(rand: () => number = Math.random): number {
  return 6 + Math.floor(rand() * 5);
}

/** dp[i] 的四个选项：正确答案，加上常见的错（只抄一格、少一、多一……） */
export function valueOptions(r: Pick<Round, 'i' | 'value' | 'dp'>): number[] {
  const left = r.dp[r.i - 1]!;
  const cand = [left, r.value + 1, r.value - 1, left * 2, r.value + 2];
  const set = new Set<number>([r.value]);
  for (const c of cand) if (set.size < 4 && c > 0) set.add(c);
  return [...set].sort((a, b) => a - b);
}

/** 猜下一步画面的样子：dp 表、当前要填的格子、已经选中的来源格、刚刚填好的格子 */
export interface PredictView {
  dp: (number | null)[];
  cur: number;
  picked: number[];
  fresh: number | null;
}

/** 把一道题（楼梯级数）排成一问接一问：每一格先点出它从哪两格来（点齐两格才算对），再选它的值，答对后填上稍停 */
export function makePuzzle(n: number): Puzzle<PredictView, number> {
  const list = rounds(n);
  const asks = list.flatMap((r) => {
    const filled = r.dp.map((v, k) => (k === r.i ? r.value : v));
    const [a, b] = r.from;
    const from: PredictView = { dp: r.dp, cur: r.i, picked: [], fresh: null };
    return [
      {
        view: from, prompt: m('predict.from', { i: r.i }), kind: 'pick' as const, answer: a, collect: [a, b],
        // 点错的解释随点的格子而变（whyFor），why 只是占位
        why: whyFrom(r, a), whyFor: (k: number) => whyFrom(r, k),
      },
      {
        view: { ...from, picked: [a, b] }, prompt: m('predict.value', { i: r.i, i1: a, i2: b, x: r.dp[a]!, y: r.dp[b]! }), kind: 'choose' as const, answer: r.value,
        options: r.options.map((v) => ({ value: v, label: m('num', { n: v }) })), why: r.why,
        anim: {
          frames: [{ dp: filled, cur: r.i, picked: [], fresh: r.i }],
          prompt: m('predict.filled', { i: r.i, x: r.dp[a]!, y: r.dp[b]!, v: r.value }),
          hold: PAUSE_LONG,
          holdWrong: PAUSE_BRIEF,
        },
      },
    ];
  });
  const last = list[list.length - 1];
  return {
    asks,
    end: {
      view: { dp: last.dp.map((v, k) => (k === last.i ? last.value : v)), cur: last.i, picked: [], fresh: last.i },
      prompt: m('predict.end', { i: last.i, v: last.value }),
    },
  };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: 5,
  puzzle: (rand = Math.random) => makePuzzle(genPredict(rand)),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'init' | 'from1' | 'size';
  n: number;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'init',
    title: m('bug.init.title'),
    code: variant(3, '    dp[0] = 0'),
    wrongLine: 3,
    fixed: '    dp[0] = 1',
    n: 5,
    expect: m('bug.init.expect'),
    explain: m('bug.init.explain'),
  },
  {
    id: 'from1',
    title: m('bug.from1.title'),
    code: variant(5, '    for (i in 1..n) {'),
    wrongLine: 5,
    fixed: '    for (i in 2..n) {',
    n: 4,
    expect: m('bug.from1.expect'),
    explain: m('bug.from1.explain'),
  },
  {
    id: 'size',
    title: m('bug.size.title'),
    code: variant(2, '    val dp = LongArray(n + 1)'),
    wrongLine: 2,
    fixed: '    val dp = LongArray(n + 2)',
    n: 0,
    expect: m('bug.size.expect'),
    explain: m('bug.size.explain'),
  },
];

/** 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<DpStep> {
  const n = bug.n;
  const size = bug.id === 'size' ? n + 1 : n + 2;
  const dp: (number | null)[] = Array(size).fill(null);
  const val = (k: number) => dp[k] ?? 0; // Kotlin 的 LongArray 默认是 0
  const steps: DpStep[] = [];
  let i: number | null = null;
  const push = (line: number, note: Msg, extra: Partial<DpStep> = {}) => {
    steps.push({ line, dp: [...dp], i, from: [], note, done: false, outcome: 'running', result: null, fresh: null, ...extra });
  };
  const crash = (line: number, idx: number) =>
    push(line, m('bug.note.crash', { idx, size }), { outcome: 'crash', done: true });

  push(2, m('bug.note.table', { size }));
  dp[0] = bug.id === 'init' ? 0 : 1;
  push(3, m('bug.note.dp0', { v: dp[0] }));
  if (size < 2) {
    crash(4, 1);
    return steps;
  }
  dp[1] = 1;
  push(4, m('bug.note.dp1'));
  const start = bug.id === 'from1' ? 1 : 2;
  for (i = start; i <= n; i++) {
    push(5, m('trace.note.i', { i }));
    if (i - 2 < 0) {
      crash(6, i - 2);
      return steps;
    }
    dp[i] = val(i - 1) + val(i - 2);
    push(6, m('trace.note.fill', { i, i1: i - 1, i2: i - 2, x: val(i - 1), y: val(i - 2), v: dp[i]! }));
  }
  i = null;
  push(5, m('trace.note.endLoop', { n }));
  const result = val(n);
  push(8, m('trace.note.ret', { n, v: result }), { outcome: result === ways(n) ? 'ok' : 'wrong', result, done: true });
  return steps;
}

/** 找 bug 面板底部的判定：没跑完是空，跑完按结果说话 */
export function bugVerdict(step: DpStep, _bug?: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  return m('bug.verdict.wrong', { v: step.result! });
}

const bugRules: BugRules<Bug, DpStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { n: bug.n, expect: bug.expect }),
  vars: (s, bug): Var[] => [['n', bug.n], ['i', s.i ?? '—']],
  verdict: bugVerdict,
};

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

/** 挑战每次出一张新地图 */
export function genChallenge(rand: () => number = Math.random): Rocks {
  return randomRocks(rand);
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
export function cellHint(rocks: Rocks, r: number, c: number): Msg {
  const t = gridTable(rocks);
  const up = t[r - 1][c];
  const left = t[r][c - 1];
  return m('chal.hint', { r, c, up, left, sum: up + left, tail: m(up === 0 || left === 0 ? 'chal.hint.rock' : 'chal.hint.none') });
}

/** 挑战的星星：填错 0 次三颗，3 次以内两颗，其余一颗 */
export function gridStars(wrongs: number): 1 | 2 | 3 {
  return wrongs === 0 ? 3 : wrongs <= 3 ? 2 : 1;
}

/**
 * 挑战的状态。小兔子从左上走到右下，只能向右或向下，石头过不去。
 * 第一行、第一列直接给出来，其余的格子按顺序自己填：这一格的路数 = 上面那格 + 左边那格。
 * 填错先让上面和左边两格闪光，再错就把算式讲出来。
 */
export interface GridGame {
  rocks: Rocks;
  /** 正在填 cellsToFill 里的第几格 */
  idx: number;
  wrongs: number;
  /** 这一格填错了几次 */
  cellWrongs: number;
  /** 输入框下面的提示 */
  msg: Msg | null;
}

export type GridAction = { type: 'fill'; n: number } | { type: 'empty' } | { type: 'fresh' };

const gridFresh = (rand?: Rand): GridGame => ({ rocks: genChallenge(rand), idx: 0, wrongs: 0, cellWrongs: 0, msg: null });
export const gridCells = (g: GridGame) => cellsToFill(g.rocks);
export const gridDone = (g: GridGame) => g.idx >= gridCells(g).length;
/** 正在填的格子，填完了是 null */
export const gridCur = (g: GridGame) => gridCells(g)[g.idx] ?? null;
/** 已经有数字的格子（第一行、第一列，和已经填对的） */
export function gridFilled(g: GridGame): Set<string> {
  const set = new Set<string>();
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) if (r === 0 || c === 0) set.add(r + ',' + c);
  }
  gridCells(g).slice(0, g.idx).forEach(([r, c]) => set.add(r + ',' + c));
  return set;
}
/** 填错以后闪光的两格：当前格的上面和左边 */
export function gridSources(g: GridGame): Set<string> {
  const c = gridCur(g);
  return c && g.cellWrongs > 0 ? new Set([c[0] - 1 + ',' + c[1], c[0] + ',' + (c[1] - 1)]) : new Set<string>();
}
export const gridTarget = (g: GridGame) => gridTable(g.rocks)[GRID_ROWS - 1][GRID_COLS - 1];

export const gridRules: GameRules<GridGame, GridAction> = {
  start: (rand) => ({ state: gridFresh(rand) }),

  act(g, a, rand) {
    switch (a.type) {
      case 'fresh':
        return { state: gridFresh(rand) };
      case 'empty':
        return gridDone(g) ? null : { state: { ...g, msg: m('chal.empty') } };
      case 'fill': {
        const cur = gridCur(g);
        if (!cur) return null;
        const [r, c] = cur;
        if (a.n === gridTable(g.rocks)[r][c]) return { state: { ...g, idx: g.idx + 1, cellWrongs: 0, msg: null } };
        const cellWrongs = g.cellWrongs + 1;
        return {
          state: { ...g, wrongs: g.wrongs + 1, cellWrongs, msg: cellWrongs === 1 ? m('chal.hint1') : m('chal.hint2', { hint: cellHint(g.rocks, r, c) }) },
        };
      }
    }
  },

  clickable: () => false,

  controls(g) {
    const cur = gridCur(g);
    if (!cur) return [{ type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'small' }];
    return [
      {
        type: 'number', label: m('chal.cellQ', { r: cur[0] + 1, c: cur[1] + 1 }), placeholder: m('chal.cellPh'), min: 0,
        submit: (n) => ({ type: 'fill', n }), submitLabel: m('chal.submit'), invalid: { type: 'empty' }, clearOn: g.idx,
      } as Control<GridAction>,
    ];
  },

  result: (g) =>
    gridDone(g) ? { stars: gridStars(g.wrongs), title: m('chal.done', { target: gridTarget(g) }), body: m('chal.body', { target: gridTarget(g) }) } : null,
};

/* ---------- 延伸 ---------- */

/** 「为什么快」的对比图：不记便签和记便签，ways(n) 被调用的次数（对数刻度画） */
export function compareRows() {
  return [10, 20, 30, 40].map((n) => ({
    label: String(n),
    unit: m('compare.unit'),
    bars: [
      { name: m('compare.naive'), value: naiveCalls(n), tone: 'muted' as const },
      { name: m('compare.memo'), value: memoCalls(n), tone: 'accent' as const },
    ],
  }));
}

/** 延伸 Markdown 里 <!-- code:名字 --> 要放的代码 */
export const moreCode: Record<string, string[]> = {
  memo: [
    'fun climbMemo(n: Int, memo: LongArray = LongArray(n + 2)): Long {',
    '    if (n <= 1) return 1',
    '    if (memo[n] != 0L) return memo[n]          // 有便签，直接抄',
    '    memo[n] = climbMemo(n - 1, memo) + climbMemo(n - 2, memo)',
    '    return memo[n]                             // 算完先贴便签',
    '}',
  ],
  slim: [
    'fun climbStairs(n: Int): Long {',
    '    var prev = 1L   // dp[i - 2]',
    '    var cur = 1L    // dp[i - 1]',
    '    for (i in 2..n) {',
    '        val next = prev + cur',
    '        prev = cur',
    '        cur = next',
    '    }',
    '    return cur',
    '}',
  ],
};

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { count: countRules, notes: notesRules, challenge: gridRules },
};
