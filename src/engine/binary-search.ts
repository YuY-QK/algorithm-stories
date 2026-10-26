import { m } from '../core/i18n';
import {
  PAUSE_LONG, PAUSE_MID, PAUSE_SHORT,
} from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand,
  Step, Trace, TraceRules, Var,
} from '../core/types';

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

/** 门上的提示方向，给 Msg 用 */
const dirMsg = (d: 'left' | 'right') => m('dir.' + d);

/** 「看」的全部页：小邮差每次都去剩下范围的正中间，直到找到信。画面和 postmanTrace 一致 */
export function lookFrames(secret: number): LookPage[] {
  const probes = postmanTrace(KID_N, secret);
  const out: LookPage[] = [];
  let doors: Record<number, Dir> = {};
  out.push({ say: m('look.start'), lo: 1, hi: KID_N, postman: 0, doors, letter: null });
  out.push({ say: m('look.slow'), lo: 1, hi: KID_N, postman: middle(1, KID_N), doors, letter: null });
  for (const p of probes) {
    doors = { ...doors, [p.at]: p.dir };
    if (p.dir === 'hit') {
      out.push({ say: m('look.found', { n: probes.length }), lo: p.at, hi: p.at, postman: p.at, doors, letter: p.at });
      break;
    }
    out.push({ say: m('look.door', { dir: dirMsg(p.dir) }), lo: p.lo, hi: p.hi, postman: p.at, doors, letter: null });
    const r = narrow(p.lo, p.hi, p.at, p.dir);
    out.push({ say: m('look.skip', { side: m(p.dir === 'left' ? 'side.right' : 'side.left') }), lo: r.lo, hi: r.hi, postman: middle(r.lo, r.hi), doors, letter: null });
  }
  return out;
}

/** 看：故事的输入是藏信的信箱，「再看一次」换一个 */
const lookRules: LookRules<number, LookPage> = {
  first: 11,
  next: (prev, rand) => pickSecret(rand, prev),
  frames: lookFrames,
};

/** 玩法二的星星：最多 4 次是三颗，6 次以内两颗，其余一颗 */
export function stars(tries: number): 1 | 2 | 3 {
  return tries <= 4 ? 3 : tries <= 6 ? 2 : 1;
}

/* ---------- 看、玩：藏信、当小邮差 ---------- */

/** 信箱街上要画的东西。两个小游戏的状态都带着这些字段，画面（Street）照着画，不管规则 */
export interface StreetView {
  /** 还可能有信的范围，范围外的信箱变灰 */
  lo: number;
  hi: number;
  /** 小邮差站在第几个信箱上方，0 表示还在街口 */
  at: number;
  doors: Record<number, Dir>;
  /** 信露出来的位置 */
  letter: number | null;
  /** 盖着叶子的信箱 */
  covered: number | null;
  /** 透光提示：[信箱, 第几次]，次数变了才重新亮一次 */
  glow: [number, number] | null;
  /** 一闪一闪：小邮差的秘诀 */
  pulse: number | null;
  /** 摇头：[信箱, 第几次] */
  shake: [number, number] | null;
}

/** 玩的操作：点信箱、回答小邮差、再来一局、回答「点哪里最快」、开关秘诀 */
export type PlayAction =
  | { type: 'pick'; i: number }
  | { type: 'answer'; dir: Dir }
  | { type: 'again' }
  | { type: 'quiz'; where: 'edge' | 'middle' }
  | { type: 'hint'; on: boolean };

const sideOf = (d: 'left' | 'right') => m(d === 'left' ? 'side.right' : 'side.left');

/* 玩法一「藏信」：孩子先把信藏好盖上叶子，再给小邮差指路。
   答案一开始就固定了，指错方向时藏信的信箱会透光，提示孩子自己再看一眼。 */

/** hide：等孩子藏；hiding：信露出来，稍后盖叶子；leaving：刚排除一半，稍后小邮差走；walking：小邮差在走；guide：等孩子指路 */
export type HidePhase = 'hide' | 'hiding' | 'leaving' | 'walking' | 'guide' | 'done';

export interface HideState extends StreetView {
  phase: HidePhase;
  secret: number | null;
  tries: number;
}

const blankStreet = (): StreetView => ({ lo: 1, hi: KID_N, at: 0, doors: {}, letter: null, covered: null, glow: null, pulse: null, shake: null });

/** 按阶段重算信和叶子在哪 */
function settleHide(s: HideState): HideState {
  const covered = s.phase === 'guide' || s.phase === 'walking' || s.phase === 'leaving';
  return { ...s, letter: s.phase === 'hiding' || s.phase === 'done' ? s.secret : null, covered: covered ? s.secret : null };
}

const hideStart = (): HideState => ({ ...blankStreet(), phase: 'hide', secret: null, tries: 0 });

export const hideRules: GameRules<HideState, PlayAction> = {
  start: () => ({ state: hideStart(), say: m('hide.say.start') }),

  act(s, a) {
    if (a.type === 'pick' && s.phase === 'hide') {
      return { state: settleHide({ ...s, phase: 'hiding', secret: a.i }), say: m('hide.say.hidden'), sound: 'tap', after: PAUSE_LONG };
    }
    if (a.type === 'answer' && s.phase === 'guide' && s.secret !== null) {
      const right = pointTo(s.secret, s.at);
      if (a.dir !== right) {
        // 指错了：藏信的信箱透光，让孩子再看一眼
        return { state: { ...s, glow: [s.secret, (s.glow?.[1] ?? 0) + 1] }, say: m('hide.say.glow'), sound: 'wrong' };
      }
      if (a.dir === 'hit') {
        return {
          state: settleHide({ ...s, phase: 'done', glow: null, doors: { ...s.doors, [s.at]: 'hit' } }),
          say: m('hide.say.found', { n: s.tries }),
          sound: ['right', 'win'],
        };
      }
      const r = narrow(s.lo, s.hi, s.at, a.dir);
      return {
        state: settleHide({ ...s, phase: 'leaving', glow: null, doors: { ...s.doors, [s.at]: a.dir }, ...r }),
        say: m('hide.say.skip', { side: sideOf(a.dir) }),
        sound: 'right',
        after: PAUSE_MID,
      };
    }
    if (a.type === 'again' && s.phase === 'done') return { state: hideStart(), say: m('hide.say.start') };
    return null;
  },

  tick(s): Outcome<HideState> {
    if (s.phase === 'hiding' || s.phase === 'leaving') {
      const first = s.phase === 'hiding';
      return {
        state: settleHide({ ...s, phase: 'walking', at: middle(s.lo, s.hi) }),
        say: m(first ? 'hide.say.come' : 'hide.say.near'),
        sound: 'tick',
        after: PAUSE_SHORT,
      };
    }
    if (s.phase === 'walking') return { state: settleHide({ ...s, phase: 'guide', tries: s.tries + 1 }), say: m('hide.say.ask') };
    return { state: s };
  },

  // 切标签时，动画中途（藏好、走路）的局作废，回到等孩子藏信
  interrupt(s) {
    const mid = s.phase === 'hiding' || s.phase === 'leaving' || s.phase === 'walking';
    return mid ? { state: hideStart(), say: m('hide.say.start') } : { state: s };
  },

  clickable: (s) => s.phase === 'hide',

  controls(s) {
    if (s.phase === 'guide' || s.phase === 'walking' || s.phase === 'leaving') {
      const pad = (dir: Dir): Control<PlayAction> => ({
        type: 'button', action: { type: 'answer', dir }, look: 'pad', disabled: s.phase !== 'guide',
        label: m('pad.' + dir), aria: m('pad.' + dir + 'Aria'),
      });
      return [pad('left'), pad('hit'), pad('right')];
    }
    if (s.phase === 'done') return [{ type: 'button', action: { type: 'again' }, label: m('hide.again'), look: 'primary' }];
    return [];
  },
};

/* 玩法二「当小邮差」：信由程序藏好，孩子自己点信箱找。
   引导：点灰信箱会摇头；第一次排除时追问「灰色的还要看吗」；连续两局不到三颗星，
   可以看小邮差的秘诀（正中间一闪一闪）；拿到三颗星后问「点哪里最快」，让孩子自己说出「中间」。 */

export interface FindState extends StreetView {
  secret: number;
  tries: number;
  done: boolean;
  /** 连续几局不到三颗星 */
  lowRounds: number;
  /** 秘诀开着：正中间一闪一闪 */
  hint: boolean;
  /** 问过「点哪里最快」了（只问一次） */
  asked: boolean;
  quiz: 'ask' | 'right' | 'wrong' | null;
  /** 已经追问过「灰色的还要看吗」了 */
  greyTold: boolean;
}

/** 重算一闪一闪的位置 */
function settleFind(s: FindState): FindState {
  return { ...s, letter: s.done ? s.secret : null, pulse: s.hint && !s.done ? middle(s.lo, s.hi) : null };
}

/** 新开一局：保留秘诀、追问等跨局的状态 */
function findRound(prev: FindState | null, rand?: Rand): FindState {
  return settleFind({
    ...(prev ?? { lowRounds: 0, hint: false, asked: false, quiz: null, greyTold: false, shake: null }),
    ...blankStreet(),
    shake: prev?.shake ?? null,
    secret: pickSecret(rand),
    tries: 0,
    done: false,
  });
}

const findAgainSay = (s: FindState): Msg => m(s.hint ? 'find.say.hint' : 'find.say.again');

export const findRules: GameRules<FindState, PlayAction> = {
  start: (rand) => ({ state: findRound(null, rand), say: m('find.say.start') }),

  act(s, a, rand) {
    if (a.type === 'pick' && !s.done) {
      if (a.i < s.lo || a.i > s.hi) {
        return { state: { ...s, shake: [a.i, (s.shake?.[1] ?? 0) + 1] }, say: m('find.say.grey'), sound: 'wrong' };
      }
      const tries = s.tries + 1;
      const d = pointTo(s.secret, a.i);
      const next: FindState = { ...s, tries, at: a.i, doors: { ...s.doors, [a.i]: d } };
      if (d === 'hit') {
        const done: FindState = { ...next, done: true };
        if (stars(tries) === 3) {
          done.lowRounds = 0;
          if (!s.asked) {
            done.asked = true;
            done.quiz = 'ask';
          }
        } else {
          done.lowRounds = s.lowRounds + 1;
        }
        return { state: settleFind(done), say: m('find.say.found', { n: tries }), sound: 'win' };
      }
      const dir = dirMsg(d);
      return {
        state: settleFind({ ...next, ...narrow(s.lo, s.hi, a.i, d), greyTold: true }),
        // 第一次排除时追问一句，让孩子想「灰色的还要看吗」
        say: m(s.greyTold ? 'find.say.dir' : 'find.say.first', { dir }),
        sound: 'right',
      };
    }
    if (a.type === 'quiz' && s.quiz === 'ask') {
      const isMid = a.where === 'middle';
      return { state: { ...s, quiz: isMid ? 'right' : 'wrong' }, sound: isMid ? 'right' : 'wrong' };
    }
    if (a.type === 'again' && s.done) {
      const state = findRound(s, rand);
      return { state, say: findAgainSay(state) };
    }
    if (a.type === 'hint' && s.done) {
      // 开秘诀要连续两局不到三颗星；关掉随时可以。换秘诀时马上开新的一局
      if (a.on ? s.hint || s.lowRounds < 2 : !s.hint) return null;
      const state = findRound({ ...s, hint: a.on, lowRounds: a.on ? 0 : s.lowRounds }, rand);
      return { state, say: findAgainSay(state) };
    }
    return null;
  },

  clickable: (s) => !s.done,

  controls(s) {
    if (!s.done) return [];
    const out: Control<PlayAction>[] = [{ type: 'button', action: { type: 'again' }, label: m('find.again'), look: 'primary' }];
    if (s.lowRounds >= 2 && !s.hint) out.push({ type: 'button', action: { type: 'hint', on: true }, label: m('find.hintOn') });
    if (s.hint) out.push({ type: 'button', action: { type: 'hint', on: false }, label: m('find.hintOff') });
    return out;
  },

  hud: (s) => ({ tries: s.tries }),

  result(s) {
    if (!s.done) return null;
    const mini = (hot: number) => ({ scene: 'MiniBoxes', props: { hot } });
    const choice = (where: 'edge' | 'middle', label: string, hot: number): Control<PlayAction> => ({
      type: 'button', action: { type: 'quiz', where }, label: m(label), look: 'choice', art: mini(hot),
    });
    const quiz = s.quiz === 'ask'
      ? {
          prompt: m('find.quiz.ask'),
          options: [choice('edge', 'find.quiz.edge', 0), choice('middle', 'find.quiz.middle', 2), choice('edge', 'find.quiz.other', 4)],
        }
      : s.quiz
        ? { prompt: m(s.quiz === 'right' ? 'find.quiz.right' : 'find.quiz.wrong'), options: [] }
        : undefined;
    return { stars: stars(s.tries), quiz };
  },
};

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
  const push = (line: number, note: Msg, extra: Partial<BinaryStep> = {}) => {
    steps.push({ line, lo, hi, mid: null, count, note, found: -1, done: false, ...extra });
  };

  push(3, m('trace.note.init', { hi }));
  while (true) {
    push(4, lo <= hi ? m('trace.note.loopYes', { lo, hi }) : m('trace.note.loopNo', { lo, hi }));
    if (lo > hi) break;
    const mid = lo + Math.floor((hi - lo) / 2);
    count++;
    push(5, m('trace.note.mid', { mid }), { mid });
    if (arr[mid] === target) {
      push(7, m('trace.note.hit', { mid, v: arr[mid] }), { mid, found: mid, done: true });
      return steps;
    }
    if (arr[mid] < target) {
      lo = mid + 1;
      push(8, m('trace.note.right', { mid, v: arr[mid], target, lo }), { mid });
    } else {
      hi = mid - 1;
      push(9, m('trace.note.left', { mid, v: arr[mid], target, hi }), { mid });
    }
  }
  push(12, m('trace.note.miss', { target }), { done: true });
  return steps;
}

/** 逐步执行面板的输入：数组、目标值和数组大小（改大小就换一个新数组） */
export interface TraceInput {
  arr: number[];
  target: number;
  size: number;
}

export type TraceAction =
  | { type: 'size'; n: number }
  | { type: 'target'; n: number }
  | { type: 'pick' }
  | { type: 'missing' }
  | { type: 'fresh' };

function freshInput(size: number, rand?: Rand): TraceInput {
  const arr = genArray(size, rand);
  return { arr, target: pickTarget(arr, rand), size };
}

/** 做：逐步执行。指针、代码行和比较次数同步 */
export const traceRules: TraceRules<TraceInput, BinaryStep, TraceAction> = {
  code: CODE,
  start: (rand) => freshInput(16, rand),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return freshInput(a.n, rand);
      case 'target': return { ...input, target: a.n };
      case 'pick': return { ...input, target: pickTarget(input.arr, rand) };
      case 'missing': return { ...input, target: missingValue(input.arr) };
      case 'fresh': return freshInput(input.size, rand);
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [8, 16, 32].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    { type: 'number', label: m('trace.target'), value: input.target, submit: (n) => ({ type: 'target', n }) },
    {
      type: 'group', legend: m('trace.quick'),
      items: [
        { type: 'button', action: { type: 'pick' }, label: m('trace.pickIn'), look: 'small' },
        { type: 'button', action: { type: 'missing' }, label: m('trace.pickOut'), look: 'small' },
        { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
      ],
    },
  ],
  trace: (input) => buildTrace(input.arr, input.target),
  vars: (input, s): Var[] => [
    ['lo', s.lo], ['mid', s.mid ?? '—'], ['hi', s.hi], ['target', input.target], [m('trace.checked'), m('trace.count', { n: s.count })],
  ],
  summary(input, s) {
    if (!s.done) return null;
    return s.found >= 0
      ? m('trace.sumFound', { found: s.found, target: input.target, count: s.count, seq: s.found + 1 })
      : m('trace.sumMiss', { target: input.target, count: s.count, n: input.arr.length });
  },
};

/* ---------- 做：猜下一步 ---------- */

/** 每一轮循环要回答的一道题：mid 在哪、接下来怎么走 */
export interface Round {
  lo: number;
  hi: number;
  mid: number;
  /** 'found'：找到了；'right'：lo = mid + 1；'left'：hi = mid - 1 */
  move: 'found' | 'right' | 'left';
  /** 点错 mid 时的解释 */
  whyMid: Msg;
  /** 选错下一步时的解释 */
  why: Msg;
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
    const whyMid = m('predict.whyMid', { lo, hi, mid });
    const why = m('predict.why.' + move, { mid, v, target });
    out.push({ lo, hi, mid, move, whyMid, why });
    if (move === 'found') break;
    if (move === 'right') lo = mid + 1;
    else hi = mid - 1;
  }
  return out;
}

/** 猜下一步画面的样子：数组加当前范围；mid 为 null 表示还没亮出来 */
export interface PredictView {
  arr: number[];
  lo: number;
  hi: number;
  mid: number | null;
  found: number;
}

export type Move = Round['move'];

/** 把一道题（数组加目标）排成一问接一问：每一轮先点出 mid，再选接下来怎么走 */
export function makePuzzle(arr: number[], target: number): Puzzle<PredictView, number | Move> {
  const list = rounds(arr, target);
  const asks = list.flatMap((r) => {
    const view = { arr, lo: r.lo, hi: r.hi, mid: null, found: -1 };
    const withMid = { ...view, mid: r.mid };
    const movePrompt = m('predict.move', { mid: r.mid, v: arr[r.mid], target });
    return [
      {
        view, prompt: m('predict.pickMid', { lo: r.lo, hi: r.hi }), kind: 'pick' as const, answer: r.mid, why: r.whyMid,
        // 点错 mid：把 mid 亮出来，接着问下一步
        reveal: { view: withMid, prompt: movePrompt },
      },
      {
        view: withMid, prompt: movePrompt, kind: 'choose' as const, answer: r.move, why: r.why,
        options: (['found', 'right', 'left'] as Move[]).map((value) => ({ value, label: m('predict.opt.' + value) })),
      },
    ];
  });
  // 结局：找到了，或者范围空了
  const last = list[list.length - 1];
  const end = last.move === 'found'
    ? { view: { arr, lo: last.lo, hi: last.hi, mid: null, found: last.mid }, prompt: m('predict.endFound', { i: last.mid }) }
    : (() => {
        const lo = last.move === 'right' ? last.mid + 1 : last.lo;
        const hi = last.move === 'right' ? last.hi : last.mid - 1;
        return { view: { arr, lo, hi, mid: null, found: -1 }, prompt: m('predict.endEmpty', { lo, hi }) };
      })();
  return { chips: [['target', target]], asks, end };
}

const predictRules: PredictRules<PredictView, number | Move> = {
  puzzle(rand = Math.random) {
    const q = genPredict(rand);
    return makePuzzle(q.arr, q.target);
  },
};

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
    title: m('bug.lt.title'),
    code: variant(4, '    while (lo < hi) {'),
    wrongLine: 4,
    fixed: '    while (lo <= hi) {',
    size: 3,
    values: [2, 5, 8],
    target: 8,
    expect: m('bug.lt.expect'),
    explain: m('bug.lt.explain'),
  },
  {
    id: 'hi-mid',
    title: m('bug.hi-mid.title'),
    code: variant(9, '            else -> hi = mid'),
    wrongLine: 9,
    fixed: '            else -> hi = mid - 1',
    size: 4,
    values: [1, 3, 5, 7],
    target: 0,
    expect: m('bug.hi-mid.expect'),
    explain: m('bug.hi-mid.explain'),
  },
  {
    id: 'overflow',
    title: m('bug.overflow.title'),
    code: variant(5, '        val mid = (lo + hi) / 2'),
    wrongLine: 5,
    fixed: '        val mid = lo + (hi - lo) / 2',
    size: 2_100_000_000,
    target: 2_000_000_000,
    expect: m('bug.overflow.expect'),
    explain: m('bug.overflow.explain'),
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
  const push = (line: number, note: Msg, extra: Partial<BugStep> = {}) => {
    steps.push({ line, lo, hi, mid: null, note, done: false, outcome: 'running', result: null, ...extra });
  };
  const cond = bug.id === 'lt' ? (a: number, b: number) => a < b : (a: number, b: number) => a <= b;
  const op = bug.id === 'lt' ? '<' : '<=';

  push(3, m('bug.note.init', { hi }));
  for (;;) {
    const key = lo + ',' + hi;
    if (seen.has(key)) {
      push(4, m('bug.note.stuck', { lo, hi }), { outcome: 'stuck', done: true });
      return steps;
    }
    seen.add(key);
    const go = cond(lo, hi);
    push(4, m(go ? 'bug.note.condYes' : 'bug.note.condNo', { lo, op, hi }));
    if (!go) break;
    const mid = bug.id === 'overflow' ? int32(int32(lo + hi) / 2) : lo + Math.floor((hi - lo) / 2);
    if (bug.id === 'overflow' && lo + hi > 0x7fffffff) {
      push(5, m('bug.note.overflow', { sum: lo + hi, wrapped: int32(lo + hi), mid }), { mid });
    } else {
      push(5, m('bug.note.mid', { mid }), { mid });
    }
    if (mid < 0 || mid >= bug.size) {
      push(7, m('bug.note.crash', { mid }), { mid, outcome: 'crash', done: true });
      return steps;
    }
    const v = get(mid);
    if (v === bug.target) {
      push(7, m('bug.note.found', { mid, v }), { mid, outcome: 'ok', result: mid, done: true });
      return steps;
    }
    if (v < bug.target) {
      lo = mid + 1;
      push(8, m('bug.note.right', { mid, v, target: bug.target, lo }), { mid });
    } else {
      hi = bug.id === 'hi-mid' ? mid : mid - 1;
      push(9, m('bug.note.left', { mid, v, target: bug.target, hi }), { mid });
    }
  }
  push(12, m('bug.note.none'), { outcome: 'ok', result: -1, done: true });
  return steps;
}

/** 找 bug 面板底部的判定：动画跑完后程序到底怎么错的 */
export function bugVerdict(step: BugStep, _bug?: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'stuck') return m('bug.verdict.stuck');
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  return m('bug.verdict.wrong', { result: step.result ?? '' });
}

/** 「输入：……」那一行：小数组直接列出来，大数组只说期望 */
function bugInput(bug: Bug): Msg {
  return bug.values
    ? m('bug.input.arr', { arr: bug.values.join(', '), target: bug.target, expect: bug.expect })
    : m('bug.input.big', { expect: bug.expect });
}

const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: bugInput,
  vars: (s, bug): Var[] => [['lo', s.lo], ['mid', s.mid ?? '—'], ['hi', s.hi], ['target', bug.target]],
  verdict: bugVerdict,
};

/* ---------- 做：挑战 ---------- */

export const CHALLENGE_MAX = 1000;
/** 1 到 1000 用二分最多要猜几次：⌊log₂1000⌋ + 1 = 10 */
export const CHALLENGE_LIMIT = Math.floor(Math.log2(CHALLENGE_MAX)) + 1;

/** 挑战出题：1 到 CHALLENGE_MAX 里藏一个数 */
export function genChallenge(rand: () => number = Math.random): number {
  return 1 + Math.floor(rand() * CHALLENGE_MAX);
}

/** 挑战里的一次猜测 */
export interface GuessEntry {
  g: number;
  /** up：猜小了，答案更大；down：猜大了；hit：猜中 */
  dir: 'up' | 'down' | 'hit';
  /** 当时剩下范围的正中间 */
  mid: number;
  say: Msg;
  /** 结束后才显示：没猜在正中间时，提醒当时的正中间是多少 */
  hint: Msg | null;
}

export interface ChallengeState {
  secret: number;
  lo: number;
  hi: number;
  log: GuessEntry[];
  status: 'play' | 'win' | 'lose';
  /** 输入不合规时的提示，下一次有效的猜测会清掉 */
  oops: Msg | null;
}

export type ChallengeAction = { type: 'guess'; n: number } | { type: 'again' };

const challengeStart = (rand?: Rand): ChallengeState => ({
  secret: genChallenge(rand), lo: 1, hi: CHALLENGE_MAX, log: [], status: 'play', oops: null,
});

/** 挑战：1 到 1000 里猜一个数，10 次以内猜中过关。输入越界和已排除的数不算次数 */
export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeStart(rand) }),

  act(s, a, rand) {
    if (a.type === 'again') return s.status === 'play' ? null : { state: challengeStart(rand) };
    if (s.status !== 'play') return null;
    const g = a.n;
    if (isNaN(g) || g < 1 || g > CHALLENGE_MAX) {
      return { state: { ...s, oops: m('chal.oops.range', { max: CHALLENGE_MAX }) } };
    }
    if (g < s.lo || g > s.hi) {
      return { state: { ...s, oops: m('chal.oops.out', { g, lo: s.lo, hi: s.hi }) } };
    }
    const dir = g === s.secret ? 'hit' : g < s.secret ? 'up' : 'down';
    const mid = middle(s.lo, s.hi);
    const entry: GuessEntry = { g, dir, mid, say: m('chal.log.' + dir), hint: g === mid ? null : m('chal.log.mid', { mid }) };
    const log = [...s.log, entry];
    const next: ChallengeState = { ...s, log, oops: null };
    if (dir === 'hit') next.status = 'win';
    else {
      if (dir === 'up') next.lo = g + 1;
      else next.hi = g - 1;
      if (log.length >= CHALLENGE_LIMIT) next.status = 'lose';
    }
    return { state: next };
  },

  clickable: () => false,

  controls(s) {
    if (s.status !== 'play') return [{ type: 'button', action: { type: 'again' }, label: m('chal.again'), look: 'small' }];
    return [{
      type: 'number', label: m('chal.guessLabel'), min: 1, max: CHALLENGE_MAX,
      submit: (n) => ({ type: 'guess', n }), submitLabel: m('chal.guess'), invalid: { type: 'guess', n: NaN },
      clearOn: s.log.length,
    }];
  },

  hud: (s) => ({
    chips: [
      [m('chal.range'), m('chal.rangeVal', { lo: s.lo, hi: s.hi })],
      [m('chal.left'), m('chal.leftVal', { n: CHALLENGE_LIMIT - s.log.length })],
    ],
  }),

  result(s) {
    if (s.status === 'win') {
      return { title: m('chal.win', { n: s.log.length, secret: s.secret }), body: m('chal.winBody', { max: CHALLENGE_MAX, limit: CHALLENGE_LIMIT }) };
    }
    if (s.status === 'lose') return { title: m('chal.lose', { limit: CHALLENGE_LIMIT, secret: s.secret }), body: m('chal.loseBody') };
    return null;
  },
};

/* ---------- 延伸：为什么快 ---------- */

/** 「为什么快」的对比图：顺序查找和二分在不同规模下最坏要看几次（对数刻度画） */
export function compareRows() {
  return [
    { label: '15', unit: m('compare.boxes'), n: 15 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
    { label: '1,000,000,000', unit: m('compare.billion'), n: 1000000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.seq'), value: r.n, tone: 'muted' as const },
      { name: m('compare.bin'), value: Math.floor(Math.log2(r.n)) + 1, tone: 'accent' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { hide: hideRules, find: findRules, challenge: challengeRules },
};
