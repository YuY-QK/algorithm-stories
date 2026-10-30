import { m } from '../core/i18n';
import { PAUSE_BEAT, PAUSE_HOLD, PAUSE_ROUND, PAUSE_SHORT } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

/* ---------- 看、玩：排队拍合照 ---------- */

/** 一个排队的小伙伴：头像、身高（厘米）。名字在文案表里：kid.<id> */
export interface Kid {
  id: string;
  face: string;
  h: number;
}

/**
 * 「看」和故事稿用的固定队伍：小兔 120、小熊 145、小猫 118、小狗 132、小猴 138。
 * 第 1 轮最高的小熊从第 2 个一路换到最右边（换 3 次），第 2 轮换 1 次就排好了，
 * 第 3 轮一次都没换，摄影师提前拍照，省下第 4 轮。一共比 9 次、换 4 次。
 */
export const STORY_KIDS: Kid[] = [
  { id: 'rabbit', face: '🐰', h: 120 },
  { id: 'bear', face: '🐻', h: 145 },
  { id: 'cat', face: '🐱', h: 118 },
  { id: 'dog', face: '🐶', h: 132 },
  { id: 'monkey', face: '🐵', h: 138 },
];

const FACES: [string, string][] = [
  ['rabbit', '🐰'], ['bear', '🐻'], ['cat', '🐱'], ['dog', '🐶'],
  ['monkey', '🐵'], ['panda', '🐼'], ['fox', '🦊'], ['tiger', '🐯'],
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
      const [id, face] = faces.splice(Math.floor(rand() * faces.length), 1)[0];
      const h = hs.splice(Math.floor(rand() * hs.length), 1)[0];
      out.push({ id, face, h });
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
  /** 猜「结束后谁站在 end」答错时的解释 */
  whyTop: Msg;
  /** 猜「这一轮换几次」答错时的解释 */
  why: Msg;
}

/** 带「一轮没换就停」的冒泡排序，按轮输出（猜下一步的题，也是「玩」和「看」的底稿）。key 取比较用的值 */
export function rounds<T>(input: T[], key: (x: T) => number): Round<T>[] {
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
    const vals = before.map(key);
    const ks = passedOver(vals, end);
    const whyTop = m('why.top', { end, max: key(a[end]) });
    const why = m('why.swaps', {
      swaps,
      detail: ks.length ? m('why.some', { list: ks.map((k) => vals[k]).join('、') }) : m('why.none'),
    });
    out.push({ i, before, after: a.slice(), compares, swaps, end, top: a[end], quiet: swaps === 0, whyTop, why });
    if (swaps === 0) break;
  }
  return out;
}

/* ---------- 看：绘本画面 ---------- */

export interface LookPage extends LookFrame {
  line: Kid[];
  /** 正在比较的一对（左边下标），没有是 null */
  pair: number | null;
  /** 这一对刚刚换过 */
  swapped: boolean;
  /** 从这个下标开始已经站好 */
  fixedFrom: number;
  /** 摄影师拍照了 */
  photo: boolean;
}

/** 绘本的全部画面，由 rounds 生成，和真实的冒泡过程一致 */
export function lookFrames(kids: Kid[]): LookPage[] {
  const n = kids.length;
  const rs = rounds(kids, (k) => k.h);
  const out: LookPage[] = [];
  const f = (say: Msg, line: Kid[], extra: Partial<LookPage> = {}) =>
    out.push({ say, line, pair: null, swapped: false, fixedFrom: n, photo: false, ...extra });

  f(m('look.start'), kids);
  f(m('look.rule'), kids);
  f(m('look.pairs'), kids, { pair: 0 });
  let fixedFrom = n;
  let compares = 0;
  for (const r of rs) {
    if (r.i > 0) f(m('look.round', { n: r.i + 1 }), r.before, { pair: 0, fixedFrom });
    let prev = r.before;
    for (const c of r.compares) {
      compares++;
      const L = prev[c.j];
      const R = prev[c.j + 1];
      f(m(c.swap ? 'look.swap' : 'look.keep', { l: L.face, r: R.face }), c.after, { pair: c.j, swapped: c.swap, fixedFrom });
      prev = c.after;
    }
    if (r.quiet) {
      fixedFrom = 0;
      f(m('look.quiet'), r.after, { fixedFrom });
    } else {
      fixedFrom = r.end;
      if (r.i === 0) f(m('look.top.first', { face: r.top.face }), r.after, { fixedFrom });
      else f(m('look.top.next', { face: r.top.face }), r.after, { fixedFrom });
      if (fixedFrom <= 1) fixedFrom = 0;
    }
  }
  const last = rs.length ? rs[rs.length - 1].after : kids;
  f(m('look.end', { n: compares }), last, { fixedFrom: 0, photo: true });
  return out;
}

/** 看的规则：种子是一队小伙伴，「再看一次」换一群 */
const lookRules: LookRules<Kid[], LookPage> = {
  first: STORY_KIDS,
  next: (_prev, rand) => randomKids(KID_N, rand),
  frames: lookFrames,
};

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

const byH = (k: Kid) => k.h;

/**
 * 玩法一的游戏状态。画面（Lineup 加「这一轮」的计数）照着它画。
 * glow、shake 是 [小伙伴, 第几次]，次数变了才重新亮、重新晃一次；hint 是一轮没人换时答错的次数，计数那一行闪光。
 */
export interface ShootGame {
  s: ShootState<Kid>;
  mistakes: number;
  /** 一轮结束，稍后自动开始下一轮：这时两个按钮灰着 */
  busy: boolean;
  glow: [string, number] | null;
  shake: [string, number] | null;
  hint: number;
}

export type ShootAction = { type: 'answer'; c: Choice } | { type: 'quiet'; c: 'photo' | 'again' } | { type: 'again' };

const shootStart = (kids: Kid[]): ShootGame => ({ s: shootInit(kids), mistakes: 0, busy: false, glow: null, shake: null, hint: 0 });

const shootFinish = (g: ShootGame): Outcome<ShootGame> => ({
  state: { ...g, hint: 0 },
  say: m('shoot.say.done'),
  sound: 'win',
});

/* 玩法一「当摄影师」：孩子看挨着的两个，决定换不换。
   答案由身高决定，孩子改不了；判断不对时高的那个透光、左边的摇一摇，让孩子自己再比一比。
   一轮谁也没换时，问孩子还要不要再看一轮：学到「没人换就是排好了」。 */
export const shootRules: GameRules<ShootGame, ShootAction> = {
  start: () => ({ state: shootStart(STORY_KIDS), say: m('shoot.say.start') }),

  act(g, a, rand) {
    if (a.type === 'answer') {
      const { s } = g;
      if (g.busy || s.phase !== 'pair') return null;
      const L = s.line[s.j];
      const R = s.line[s.j + 1];
      const n = shootAnswer(s, a.c, byH);
      if (!n) {
        return {
          state: {
            ...g,
            mistakes: g.mistakes + 1,
            glow: [L.h > R.h ? L.id : R.id, (g.glow?.[1] ?? 0) + 1],
            shake: [L.id, (g.shake?.[1] ?? 0) + 1],
          },
          say: m(L.h > R.h ? 'shoot.say.tall' : 'shoot.say.short'),
          sound: 'wrong',
        };
      }
      const next: ShootGame = { ...g, s: n, glow: null };
      if (n.phase === 'pair') {
        return {
          state: next,
          say: m(a.c === 'swap' ? 'shoot.say.swapped' : 'shoot.say.kept', { l: L.face, r: R.face }),
          sound: 'right',
        };
      }
      if (n.phase === 'next') {
        const top = n.line[n.end];
        return { state: { ...next, busy: true }, say: m(n.round === 0 ? 'shoot.say.topFirst' : 'shoot.say.top', { face: top.face }), sound: 'right', after: PAUSE_ROUND };
      }
      if (n.phase === 'quiet') return { state: next, say: m('shoot.say.quiet'), sound: 'right' };
      return shootFinish(next);
    }
    if (a.type === 'quiet') {
      if (g.s.phase !== 'quiet') return null;
      const n = shootQuiet(g.s, a.c);
      if (!n) {
        return { state: { ...g, mistakes: g.mistakes + 1, hint: g.hint + 1 }, say: m('shoot.say.noOne'), sound: 'wrong' };
      }
      return shootFinish({ ...g, s: n });
    }
    if (g.s.phase !== 'done') return null;
    return { state: shootStart(randomKids(KID_N, rand)), say: m('shoot.say.again') };
  },

  tick: (g): Outcome<ShootGame> => ({ state: { ...g, s: shootNextRound(g.s), busy: false }, say: m('shoot.say.next') }),

  // 切标签时，一轮结束后的等待直接过去，回到能再操作
  interrupt: (g) => (g.busy ? { state: { ...g, s: shootNextRound(g.s), busy: false }, say: m('shoot.say.next') } : { state: g }),

  clickable: () => false,

  controls(g) {
    const pad = (action: ShootAction, label: string, caption: string, aria: string, disabled = false): Control<ShootAction> => ({
      type: 'button', action, look: 'pad', disabled, label: m(label), caption: m(caption), aria: m(aria),
    });
    if (g.s.phase === 'pair' || g.s.phase === 'next') {
      const off = g.busy || g.s.phase !== 'pair';
      return [
        pad({ type: 'answer', c: 'swap' }, 'shoot.pad.swap', 'shoot.cap.swap', 'shoot.aria.swap', off),
        pad({ type: 'answer', c: 'keep' }, 'shoot.pad.keep', 'shoot.cap.keep', 'shoot.aria.keep', off),
      ];
    }
    if (g.s.phase === 'quiet') {
      return [
        pad({ type: 'quiet', c: 'photo' }, 'shoot.pad.photo', 'shoot.cap.photo', 'shoot.aria.photo'),
        pad({ type: 'quiet', c: 'again' }, 'shoot.pad.more', 'shoot.cap.more', 'shoot.aria.more'),
      ];
    }
    return [{ type: 'button', action: { type: 'again' }, label: m('shoot.again'), look: 'primary' }];
  },

  result: (g) => (g.s.phase === 'done' ? { stars: stars(g.mistakes), body: m('shoot.tally', { c: g.s.compares, w: g.s.swaps }) } : null),
};

/* ---------- 玩法二：谁会冒到最右边 ---------- */

/**
 * 玩法二的游戏状态。队伍和答案一开始就算好了（kids），改不了。
 * phase：ask 等孩子点；run 摄影师一对一对走这一轮（c 是走到第几次比较）；hold 这一轮走完，稍停；done 排好了。
 */
export interface GuessGame {
  kids: Kid[];
  r: number;
  line: Kid[];
  fixedFrom: number;
  pair: number | null;
  phase: 'ask' | 'run' | 'hold' | 'done';
  c: number;
  mistakes: number;
  /** 这一轮点错了几次 */
  roundMiss: number;
  glow: [string, number] | null;
  shake: [string, number] | null;
}

export type GuessAction = { type: 'pick'; k: number } | { type: 'again' };

const askSay = (r: number): Msg => m(r === 0 ? 'guess.say.first' : 'guess.say.next');

function guessStart(rand?: Rand): Outcome<GuessGame> {
  const kids = randomKids(KID_N, rand);
  return {
    state: { kids, r: 0, line: kids.slice(), fixedFrom: kids.length, pair: null, phase: 'ask', c: 0, mistakes: 0, roundMiss: 0, glow: null, shake: null },
    say: askSay(0),
  };
}

/* 玩法二「谁会冒到最右边」：每一轮开始前，孩子先猜这一轮谁会站到最右边（还没站好的部分），
   猜对了摄影师才走这一轮，看猜的那个一路冒过去。队伍和答案一开始就算好了，改不了。
   点错的会摇一摇；同一轮第二次还点错，答案透一点光。学到的是「这一轮最高的那个一定冒到最右边」。 */
export const guessRules: GameRules<GuessGame, GuessAction> = {
  start: (rand) => guessStart(rand),

  act(g, a, rand) {
    if (a.type === 'again') return g.phase === 'done' ? guessStart(rand) : null;
    if (g.phase !== 'ask') return null;
    const kid = g.line[a.k];
    if (!kid) return null;
    const shake: [string, number] = [kid.id, (g.shake?.[1] ?? 0) + 1];
    if (a.k >= g.fixedFrom) return { state: { ...g, shake }, say: m('guess.say.fixed'), sound: 'wrong' };
    const rd = rounds(g.kids, byH)[g.r];
    if (kid.id !== rd.top.id) {
      const roundMiss = g.roundMiss + 1;
      return {
        state: { ...g, mistakes: g.mistakes + 1, roundMiss, shake, glow: roundMiss >= 2 ? [rd.top.id, (g.glow?.[1] ?? 0) + 1] : g.glow },
        say: m('guess.say.wrong'),
        sound: 'wrong',
      };
    }
    return {
      state: { ...g, glow: null, phase: 'run', c: 0 },
      say: m('guess.say.run', { face: kid.face }),
      sound: ['right', 'tick'],
      after: PAUSE_BEAT,
    };
  },

  tick(g): Outcome<GuessGame> {
    if (g.phase === 'hold') {
      const r = g.r + 1;
      return { state: { ...g, r, phase: 'ask', roundMiss: 0, glow: null }, say: askSay(r) };
    }
    if (g.phase !== 'run') return { state: g };
    const rd = rounds(g.kids, byH)[g.r];
    if (g.c < rd.compares.length) {
      const cmp = rd.compares[g.c];
      return { state: { ...g, pair: cmp.j, line: cmp.after, c: g.c + 1 }, after: PAUSE_SHORT };
    }
    if (rd.quiet || rd.end <= 1) {
      return {
        state: { ...g, pair: null, fixedFrom: 0, phase: 'done' },
        say: m(rd.quiet ? 'guess.say.doneQuiet' : 'guess.say.done'),
        sound: 'win',
      };
    }
    return { state: { ...g, pair: null, fixedFrom: rd.end, phase: 'hold' }, say: m('guess.say.good', { face: rd.top.face }), after: PAUSE_HOLD };
  },

  // 切标签时，走到一半的局作废，换一队新的重新开始
  interrupt(g) {
    return g.phase === 'run' || g.phase === 'hold' ? guessStart() : { state: g };
  },

  clickable: (g) => g.phase === 'ask',

  controls: (g) => (g.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('guess.again'), look: 'primary' }] : []),

  result: (g) => (g.phase === 'done' ? { stars: stars(g.mistakes), body: m('guess.win') } : null),
};

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
  const push = (line: number, note: Msg, extra: Partial<BubbleStep> = {}) => {
    steps.push({ line, note, a: a.map((x) => ({ ...x })), i, j, t, sortedFrom, compares, swaps, swapped, hl: null, outcome: 'running', done: false, ...extra });
  };

  push(2, m('trace.note.n', { n }));
  for (i = 0; i < n - 1; i++) {
    j = null;
    t = null;
    swapped = null;
    push(3, m('trace.note.round', { r: i + 1, i, left: n - i }));
    swapped = false;
    push(4, m('trace.note.swappedFalse'));
    const upper = vr.bound === 'n-i' ? n - i : n - 1 - i;
    for (j = 0; j < upper; j++) {
      t = null;
      if (j + 1 >= n) {
        push(6, m('trace.note.crash', { j1: j + 1, n, last: n - 1 }), { hl: 'cmp', outcome: 'crash', done: true });
        return steps;
      }
      compares++;
      const L = a[j], R = a[j + 1];
      const go = vr.cmp === '>' ? L.v > R.v : L.v >= R.v;
      const rel = L.v > R.v ? ' > ' : L.v === R.v ? ' = ' : ' < ';
      push(6, m('trace.note.cmp', { j, j1: j + 1, l: show(L), r: show(R), rel, verdict: m(go ? 'trace.note.go' : 'trace.note.stay') }), { hl: 'cmp' });
      if (!go) continue;
      t = L.v;
      const tItem = { ...L };
      push(7, m('trace.note.tmp', { j, t }), { hl: 'swap' });
      a[j] = { ...a[j + 1] };
      push(8, m('trace.note.copy', { j, j1: j + 1, v: a[j].v, t }), { hl: 'swap' });
      if (vr.temp) {
        a[j + 1] = tItem;
        swaps++;
        push(9, m('trace.note.write', { j1: j + 1, t }), { hl: 'swap' });
      } else {
        a[j + 1] = { ...a[j] };
        swaps++;
        push(9, m('trace.note.lost', { j1: j + 1, j, v: a[j].v, t }), { hl: 'swap' });
      }
      swapped = true;
      push(10, m('trace.note.swappedTrue'));
    }
    j = null;
    t = null;
    sortedFrom = n - 1 - i;
    if (swapped) {
      push(13, m('trace.note.endRound', { max: a[sortedFrom].v, at: sortedFrom }));
    } else {
      sortedFrom = 0;
      push(13, m('trace.note.break', { tail: m(n - 2 - i > 0 ? 'trace.note.breakSaved' : 'trace.note.breakPlain', { k: n - 2 - i }) }), { outcome: 'ok', done: true });
      return steps;
    }
  }
  i = null;
  sortedFrom = 0;
  push(3, m(n <= 1 ? 'trace.note.finishTiny' : 'trace.note.finish', { n1: n - 1, compares, swaps }), { outcome: 'ok', done: true });
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

/** 逐步执行面板的输入：数组、数组大小和初始顺序（改大小或顺序就换一个新数组） */
export interface TraceInput {
  arr: number[];
  size: number;
  shape: Shape;
}

export type TraceAction = { type: 'size'; n: number } | { type: 'shape'; shape: Shape } | { type: 'fresh' };

const SHAPE_LABELS: Shape[] = ['random', 'nearly', 'reversed'];

/** 做：逐步执行。柱子、代码行、比较和交换次数同步 */
export const traceRules: TraceRules<TraceInput, BubbleStep, TraceAction> = {
  code: CODE,
  start: (rand) => ({ size: 8, shape: 'random', arr: genArray(8, 'random', rand) }),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return { ...input, size: a.n, arr: genArray(a.n, input.shape, rand) };
      case 'shape': return { ...input, shape: a.shape, arr: genArray(input.size, a.shape, rand) };
      case 'fresh': return { ...input, arr: genArray(input.size, input.shape, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [6, 8, 12].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    {
      type: 'segmented', legend: m('trace.shape'), value: input.shape,
      options: SHAPE_LABELS.map((s) => ({ value: s, label: m('trace.shape.' + s) })),
      choose: (v) => ({ type: 'shape', shape: v as Shape }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.arr),
  vars: (_input, s): Var[] => [
    ['i', s.i ?? '—'],
    ['j', s.j ?? '—'],
    ['t', s.t ?? '—'],
    ['swapped', s.swapped === null ? '—' : String(s.swapped)],
    [m('trace.v.compares'), m('trace.times', { n: s.compares })],
    [m('trace.v.swaps'), m('trace.times', { n: s.swaps })],
  ],
  summary(input, s) {
    if (!s.done) return null;
    const n = input.arr.length;
    return m('trace.summary', { compares: s.compares, worst: (n * (n - 1)) / 2, swaps: s.swaps });
  },
  jump: { label: m('trace.jump'), stop: (x) => x.line === ROUND_END_LINE || x.done },
};

/* ---------- 做：猜下一步 ---------- */

export const PREDICT_N = 6;

/** 猜下一步出一道题：PREDICT_N 个互不相同的数 */
export function genPredict(rand: () => number = Math.random): number[] {
  return distinctArray(PREDICT_N, 30, rand);
}

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

/**
 * 猜下一步画面的样子：这一排数，正在比较的一对（j），从哪格起已经站好，
 * 这一轮的最右位置 end（大于它的格子不用点），要不要在 end 画虚线框，答错后标红框的格子。
 */
export interface PredictView {
  a: number[];
  j: number | null;
  sortedFrom: number;
  end: number;
  goal: boolean;
  over: number[];
}

/** 把一道题（一排数）排成一问接一问：每一轮先点出结束后谁站在最右，再选这一轮换几次，然后播这一轮 */
export function makePuzzle(arr: number[]): Puzzle<PredictView, number> {
  const list = rounds(arr, (v) => v);
  const asks = list.flatMap((r, k) => {
    const prevEnd = k === 0 ? arr.length : list[k - 1].end;
    const base: PredictView = { a: r.before, j: null, sortedFrom: prevEnd, end: r.end, goal: true, over: [] };
    const calm = { ...base, goal: false };
    const countPrompt = m('predict.count', { n: r.i + 1 });
    return [
      {
        view: base, prompt: m('predict.top', { n: r.i + 1, i: r.i, end: r.end }), kind: 'pick' as const,
        answer: r.before.indexOf(r.top), why: r.whyTop,
        reveal: { view: calm, prompt: m('predict.top', { n: r.i + 1, i: r.i, end: r.end }) },
      },
      {
        view: base, prompt: countPrompt, kind: 'choose' as const, answer: r.swaps, why: r.why,
        options: Array.from({ length: r.end + 1 }, (_, c) => ({ value: c, label: m('predict.times', { n: c }) })),
        reveal: { view: { ...calm, over: passedOver(r.before, r.end) }, prompt: countPrompt },
        // 答完后播这一轮：第一帧是开始前，之后每次比较一帧
        anim: { frames: [calm, ...r.compares.map((c) => ({ ...calm, a: c.after, j: c.j }))], prompt: m('predict.running', { n: r.i + 1 }) },
      },
    ];
  });
  const last = list[list.length - 1];
  const end: PredictView = { a: last.after, j: null, sortedFrom: 0, end: last.end, goal: false, over: [] };
  return { asks, end: { view: end, prompt: m(last.quiet ? 'predict.endQuiet' : 'predict.endDone', { n: last.i + 1 }) } };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: 6,
  puzzle: (rand = Math.random) => makePuzzle(genPredict(rand)),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'temp' | 'bound' | 'stable';
  input: Item[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((s, k) => (k + 1 === line ? text : s));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'temp',
    title: m('bug.temp.title'),
    code: variant(9, '                arr[j + 1] = arr[j]'),
    wrongLine: 9,
    fixed: '                arr[j + 1] = t',
    input: [4, 2, 3, 1].map((v) => ({ v })),
    expect: m('bug.expect', { arr: '[1, 2, 3, 4]' }),
    explain: m('bug.temp.explain'),
  },
  {
    id: 'bound',
    title: m('bug.bound.title'),
    code: variant(5, '        for (j in 0 until n - i) {'),
    wrongLine: 5,
    fixed: '        for (j in 0 until n - 1 - i) {',
    input: [3, 1, 2].map((v) => ({ v })),
    expect: m('bug.expect', { arr: '[1, 2, 3]' }),
    explain: m('bug.bound.explain'),
  },
  {
    id: 'stable',
    title: m('bug.stable.title'),
    code: variant(6, '            if (arr[j] >= arr[j + 1]) {'),
    wrongLine: 6,
    fixed: '            if (arr[j] > arr[j + 1]) {',
    input: [{ v: 5, tag: 'ᵃ' }, { v: 3 }, { v: 5, tag: 'ᵇ' }, { v: 1 }],
    expect: m('bug.stable.expect'),
    explain: m('bug.stable.explain'),
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

export const showItems = (xs: Item[]) => '[' + xs.map(show).join(', ') + ']';

/** 找 bug 面板底部的判定：动画跑完后程序到底怎么错的 */
export function bugVerdict(step: BubbleStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  const want = stableSorted(bug.input);
  if (sameItems(step.a, want)) return m('bug.verdict.ok');
  if (step.a.map((x) => x.v).join() === want.map((x) => x.v).join()) return m('bug.verdict.order', { arr: showItems(step.a) });
  return m('bug.verdict.wrong', { arr: showItems(step.a) });
}

export function sameItems(a: Item[], b: Item[]): boolean {
  return a.length === b.length && a.every((x, k) => x.v === b[k].v && (x.tag ?? '') === (b[k].tag ?? ''));
}

const bugRules: BugRules<Bug, BubbleStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: showItems(bug.input), expect: bug.expect }),
  vars: (s): Var[] => [['i', s.i ?? '—'], ['j', s.j ?? '—'], ['t', s.t ?? '—'], ['swapped', s.swapped === null ? '—' : String(s.swapped)]],
  verdict: bugVerdict,
};

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
export function genChallenge(n = CHALLENGE_N, rand: () => number = Math.random): number[] {
  for (;;) {
    const a = distinctArray(n, n, rand);
    const inv = inversions(a);
    if (inv >= 5 && inv <= 10) return a;
  }
}

/**
 * 挑战的状态：只能交换相邻的两个数，用最少的次数排好。撤销也算一步（hist 是之前的样子）。
 * note 是最近一次操作后的提醒（换反了、撤销也算一步）。
 */
export interface ChallengeState {
  start: number[];
  a: number[];
  moves: number;
  hist: number[][];
  note: Msg | null;
}

export type ChallengeAction = { type: 'swap'; k: number } | { type: 'undo' } | { type: 'fresh' };

const challengeStart = (rand?: Rand): ChallengeState => {
  const start = genChallenge(CHALLENGE_N, rand);
  return { start, a: start.slice(), moves: 0, hist: [], note: null };
};

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeStart(rand) }),

  act(s, a, rand) {
    if (a.type === 'fresh') return { state: challengeStart(rand) };
    if (isSorted(s.a)) return null;
    if (a.type === 'undo') {
      const h = s.hist[s.hist.length - 1];
      if (!h) return null;
      return { state: { ...s, a: h, hist: s.hist.slice(0, -1), moves: s.moves + 1, note: m('chal.undone') } };
    }
    if (a.k < 0 || a.k >= s.a.length - 1) return null;
    const b = s.a.slice();
    const backwards = b[a.k] < b[a.k + 1];
    [b[a.k], b[a.k + 1]] = [b[a.k + 1], b[a.k]];
    return {
      state: { ...s, a: b, hist: [...s.hist, s.a], moves: s.moves + 1, note: backwards ? m('chal.backwards', { x: b[a.k], y: b[a.k + 1] }) : null },
    };
  },

  clickable: (s) => !isSorted(s.a),

  controls(s) {
    if (isSorted(s.a)) return [{ type: 'button', action: { type: 'fresh' }, label: m('chal.again'), look: 'small' }];
    return [
      { type: 'button', action: { type: 'undo' }, label: m('chal.undo'), look: 'small', disabled: !s.hist.length },
      { type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'small' },
    ];
  },

  result(s) {
    if (!isSorted(s.a)) return null;
    const best = inversions(s.start);
    return {
      title: s.moves === best ? m('chal.best', { moves: s.moves }) : m('chal.more', { moves: s.moves, best }),
      body: m('chal.body', { bubble: buildTrace(s.start).at(-1)!.swaps, best }),
      art: { scene: 'Note', props: { msg: m('chal.note') } },
    };
  },
};

/* ---------- 延伸：为什么慢 ---------- */

/** 「为什么慢」的对比图：冒泡最坏要比较的次数，和 n·log₂n 比（对数刻度画） */
export function compareRows() {
  return [
    { label: '5', unit: m('compare.kids'), n: 5 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '100,000', unit: m('compare.hundredK'), n: 100000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.bubble'), value: (r.n * (r.n - 1)) / 2, tone: 'warn' as const },
      { name: 'n·log₂n', value: r.n * Math.log2(r.n), tone: 'accent' as const, approx: true },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { shoot: shootRules, guess: guessRules, challenge: challengeRules },
};
