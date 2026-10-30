import { m } from '../core/i18n';
import { PAUSE_MID, PAUSE_SHORT } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand,
  Step, Trace, TraceRules, Var,
} from '../core/types';

/*
 * 队列：先进先出。这里讲的是最常用的实现「循环队列」：
 * 一个固定容量的数组，head 指向下一个出队的格子，tail 指向下一个入队的格子，size 记人数。
 * head、tail 走到数组末尾就绕回 0 号格，空出来的格子循环使用。
 */

/* ---------- 通用：循环队列的状态 ---------- */

export interface Ring<T> {
  /** 数组本身。null 表示这一格从来没写过 */
  cells: (T | null)[];
  head: number;
  tail: number;
  size: number;
}

export function emptyRing<T>(cap: number): Ring<T> {
  return { cells: Array.from({ length: cap }, () => null), head: 0, tail: 0, size: 0 };
}

/** 第 k 格现在有没有排在队里的元素（从 head 开始数 size 个） */
export function isLive(r: Ring<unknown>, k: number): boolean {
  const cap = r.cells.length;
  return (k - r.head + cap) % cap < r.size;
}

/** 入队。满了返回 ok = false，状态不变 */
export function ringOffer<T>(r: Ring<T>, x: T): { ring: Ring<T>; ok: boolean } {
  const cap = r.cells.length;
  if (r.size === cap) return { ring: r, ok: false };
  const cells = r.cells.slice();
  cells[r.tail] = x;
  return { ring: { cells, head: r.head, tail: (r.tail + 1) % cap, size: r.size + 1 }, ok: true };
}

/**
 * 出队。空的返回 x = null。
 * clear = false 时和真实数组一样，出队的值还留在格子里（只是 head 已经走过去了）；
 * 给孩子看的画面用 clear = true，买到奶茶的人离开座位。
 */
export function ringPoll<T>(r: Ring<T>, clear = false): { ring: Ring<T>; x: T | null } {
  const cap = r.cells.length;
  if (r.size === 0) return { ring: r, x: null };
  const x = r.cells[r.head];
  const cells = r.cells.slice();
  if (clear) cells[r.head] = null;
  return { ring: { cells, head: (r.head + 1) % cap, tail: r.tail, size: r.size - 1 }, x };
}

/** 从队头到队尾依次列出队里的元素 */
export function ringItems<T>(r: Ring<T>): T[] {
  const cap = r.cells.length;
  return Array.from({ length: r.size }, (_, k) => r.cells[(r.head + k) % cap] as T);
}

/* ---------- 看：奶茶店的椅子 ---------- */

/** 椅子数（看、玩法二） */
export const SEATS = 6;

export interface LookPage extends LookFrame {
  /** false：椅子排成一排；true：围成一圈 */
  ring: boolean;
  seats: (string | null)[];
  head: number;
  size: number;
  /** 这一页要透光提示的椅子 */
  glow: number[];
  /** 已经买到奶茶的，按顺序 */
  served: string[];
}

type LookOp = { offer: string } | { poll: true } | { bend: true } | { glowEmpty: true };

/** 看：每一页做哪些操作、说哪句话。画面由 lookFrames 真正执行这些操作得到 */
const LOOK_SCRIPT: { ops: LookOp[]; say: (s: { last: string[]; ring: Ring<string> }) => Msg }[] = [
  { ops: [], say: () => m('look.open') },
  { ops: [{ offer: '🐼' }], say: () => m('look.first') },
  { ops: [{ offer: '🐰' }, { offer: '🐱' }], say: () => m('look.more') },
  { ops: [{ poll: true }], say: ({ last }) => m('look.pollFirst', { who: last[0] }) },
  { ops: [{ offer: '🐶' }], say: () => m('look.newcomer') },
  { ops: [{ poll: true }], say: ({ last }) => m('look.nextUp', { who: last[0] }) },
  { ops: [{ offer: '🦊' }, { offer: '🐸' }], say: () => m('look.lastTwo') },
  { ops: [{ glowEmpty: true }], say: () => m('look.noChair') },
  { ops: [{ bend: true }], say: () => m('look.bend') },
  { ops: [{ offer: '🐨' }], say: ({ ring }) => m('look.sitWrap', { i: (ring.tail - 1 + SEATS) % SEATS }) },
  { ops: [{ poll: true }], say: ({ last }) => m('look.headMoves', { who: last[0] }) },
  { ops: [{ offer: '🐵' }, { offer: '🐯' }], say: () => m('look.full') },
  { ops: [{ offer: '🐷' }], say: () => m('look.late') },
  { ops: [{ poll: true }, { poll: true }, { poll: true }], say: ({ last }) => m('look.serveAll', { who: last.join(' ') }) },
  { ops: [], say: () => m('look.end') },
];

/** 看：生成绘本的每一页。椅子上的状态由真实的循环队列操作得到 */
export function lookFrames(): LookPage[] {
  let ring = emptyRing<string>(SEATS);
  let bent = false;
  const served: string[] = [];
  const out: LookPage[] = [];
  for (const page of LOOK_SCRIPT) {
    const last: string[] = [];
    let glow: number[] = [];
    for (const op of page.ops) {
      if ('offer' in op) {
        // 排成一排时，走到最后一把椅子就没有下一把了
        if (!bent && ring.tail === 0 && ring.size > 0) throw new Error('排成一排时不能绕回');
        ring = ringOffer(ring, op.offer).ring;
      } else if ('poll' in op) {
        const r = ringPoll(ring, true);
        ring = r.ring;
        if (r.x) {
          last.push(r.x);
          served.push(r.x);
        }
      } else if ('bend' in op) {
        bent = true;
      } else {
        glow = ring.cells.map((c, k) => (c === null ? k : -1)).filter((k) => k >= 0);
      }
    }
    out.push({
      say: page.say({ last, ring }),
      ring: bent,
      seats: ring.cells.slice(),
      head: ring.head,
      size: ring.size,
      glow,
      served: served.slice(),
    });
  }
  return out;
}

/** 看：故事是固定的，「再看一次」原样重来 */
export const lookRules: LookRules<null, LookPage> = {
  first: null,
  next: () => null,
  frames: () => lookFrames(),
};

/* ---------- 玩：动物和星星 ---------- */

export const ANIMALS = ['🐼', '🐰', '🐱', '🐶', '🦊', '🐸', '🐨', '🐵', '🐯', '🐷', '🐻', '🐮', '🐧', '🐔', '🦁', '🐹'];

/** 打乱一份数组（不改原数组） */
export function shuffled<T>(a: T[], rand: () => number = Math.random): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** 星星：一次都没点错三颗，错一两次两颗，其余一颗 */
export function stars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/* ---------- 玩法一：谁先买到？ ---------- */

/** 来了一位，或者店员问「下一个是谁」 */
export type LineEvent = { arrive: string } | { ask: true };

/** 大象：个子最大，但来得晚。玩完问「谁能先买到」时用来对比 */
export const BIG = '🐘';

/**
 * 玩法一的剧本：几位顾客陆续来，中间店员问几次「下一个是谁」。
 * 队伍最长 4 位；除了最后一问（只剩一位，正好收尾），问的时候队里至少两位；
 * 大象 🐘 第一次被问到时排在队伍后面，让孩子看到「个子大也要排队」。最后所有人都买到。
 */
export function lineScript(rand: () => number = Math.random): LineEvent[] {
  const pool = shuffled(ANIMALS, rand);
  const arrivals = [pool[0], pool[1], pool[2], BIG, pool[3], pool[4], pool[5]];
  // 固定的骨架：来三位，问；来两位（第二位是大象），问；……保证每次问时队里至少两位
  const shape: ('a' | 'q')[] = ['a', 'a', 'a', 'q', 'a', 'a', 'q', 'q', 'a', 'a', 'q', 'q', 'q', 'q'];
  let k = 0;
  return shape.map((t) => (t === 'a' ? { arrive: arrivals[k++] } : { ask: true }));
}

/** 按剧本走到第 upto 个事件之前，队伍的样子 */
export function lineAt(script: LineEvent[], upto: number): string[] {
  const q: string[] = [];
  for (let k = 0; k < upto; k++) {
    const e = script[k];
    if ('arrive' in e) q.push(e.arrive);
    else q.shift();
  }
  return q;
}

/** 店员问的时候，正确答案永远是队头 */
export function nextUp(line: string[]): string | null {
  return line.length ? line[0] : null;
}

/** 玩法一的操作：点一位顾客、回答「谁能先买到」、再来一局 */
export type NextAction =
  | { type: 'pick'; who: string }
  | { type: 'quiz'; c: 'first' | 'last' | 'big' }
  | { type: 'again' };

export interface NextGame {
  script: LineEvent[];
  /** 剧本走到第几个事件 */
  at: number;
  /** 队伍，第一个是队头 */
  line: string[];
  /** 已经买到奶茶的，按顺序 */
  served: string[];
  /** walk：客人陆续来；ask：等孩子点；serve：买到奶茶的人正在离开；quiz：追问「谁能先买到」；done：答对了 */
  phase: 'walk' | 'ask' | 'serve' | 'quiz' | 'done';
  mistakes: number;
  /** 点错的那位晃一下：[顾客, 第几次] */
  shake: [string, number] | null;
  /** 举手提醒的队头 */
  raise: string | null;
  /** 正在离开的人 */
  leaving: string | null;
  quiz: 'ask' | 'wrong' | 'right';
}

/** 来的顺序（剧本里所有来的人） */
export const arrivedOf = (script: LineEvent[]): string[] => script.flatMap((e) => ('arrive' in e ? [e.arrive] : []));

/** 往下走剧本：来人就排进队尾，遇到「问」就停下等孩子点；走完了就追问 */
function nextStep(s: NextGame): Outcome<NextGame> {
  if (s.at >= s.script.length) return { state: { ...s, phase: 'quiz', quiz: 'ask' }, say: m('next.say.quiz') };
  const e = s.script[s.at];
  if ('arrive' in e) {
    const line = [...s.line, e.arrive];
    return { state: { ...s, line, at: s.at + 1, phase: 'walk' }, say: m('next.say.arrive', { who: e.arrive, n: line.length }), sound: 'tick', after: PAUSE_SHORT };
  }
  return { state: { ...s, phase: 'ask' }, say: m('next.say.ask') };
}

function nextRound(prev: NextGame | null, say: string, rand?: Rand): Outcome<NextGame> {
  return {
    state: {
      script: lineScript(rand), at: 0, line: [], served: [], phase: 'walk', mistakes: 0,
      shake: prev?.shake ?? null, raise: null, leaving: null, quiz: 'ask',
    },
    say: m(say),
    after: PAUSE_SHORT,
  };
}

export const nextRules: GameRules<NextGame, NextAction> = {
  start: (rand) => nextRound(null, 'next.say.open', rand),

  act(s, a, rand) {
    if (a.type === 'pick' && s.phase === 'ask') {
      const right = nextUp(s.line);
      if (a.who !== right) {
        // 点错了：被点的晃一下，队头举手
        return {
          state: { ...s, mistakes: s.mistakes + 1, shake: [a.who, (s.shake?.[1] ?? 0) + 1], raise: right },
          say: a.who === BIG ? m('next.say.big') : m('next.say.notFirst', { who: a.who }),
          sound: 'wrong',
        };
      }
      return {
        state: { ...s, raise: null, phase: 'serve', leaving: a.who },
        say: m('next.say.serve', { who: a.who }),
        sound: 'right',
        after: PAUSE_MID,
      };
    }
    if (a.type === 'quiz' && s.phase === 'quiz') {
      if (a.c === 'first') return { state: { ...s, quiz: 'right', phase: 'done' }, say: m('next.say.right'), sound: 'win' };
      return { state: { ...s, quiz: 'wrong' }, say: m('next.say.wrong'), sound: 'wrong' };
    }
    if (a.type === 'again' && s.phase === 'done') return nextRound(s, 'next.say.again', rand);
    return null;
  },

  tick(s) {
    if (s.phase === 'serve') {
      // 买到奶茶的人离开队伍，接着往下走剧本
      const who = s.leaving as string;
      return nextStep({ ...s, line: s.line.slice(1), served: [...s.served, who], leaving: null, at: s.at + 1, phase: 'walk' });
    }
    if (s.phase === 'walk') return nextStep(s);
    return { state: s };
  },

  // 切标签时，客人还在来或者正在离开的局重新开一局；等孩子点或追问中的不动
  interrupt: (s) => (s.phase === 'walk' || s.phase === 'serve' ? nextRound(s, 'next.say.again') : { state: s }),

  clickable: (s) => s.phase === 'ask',

  controls: (s) => (s.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('next.again'), look: 'primary' }] : []),

  result(s) {
    if (s.phase !== 'quiz' && s.phase !== 'done') return null;
    if (s.quiz === 'right') return { stars: stars(s.mistakes) };
    const choice = (c: 'first' | 'last' | 'big', label: string, icon: string): Control<NextAction> => ({
      type: 'button', action: { type: 'quiz', c }, label: m(label), look: 'choice', art: { scene: 'Icon', props: { icon } },
    });
    return {
      // 答错了：把来的顺序和买到的顺序摆在一起比
      art: s.quiz === 'wrong' ? { scene: 'ServedCompare', props: { arrived: arrivedOf(s.script), served: s.served } } : undefined,
      quiz: { options: [choice('first', 'next.quiz.first', '⏰'), choice('last', 'next.quiz.last', '🏃'), choice('big', 'next.quiz.big', '🐘')] },
    };
  },
};

/* ---------- 玩法二：我是店员 ---------- */

/** 指令卡：来了一位（要给他找椅子），或者卖出一杯（点出买到的人） */
export type Card = { arrive: string } | { sell: true };

export interface ClerkGame {
  /** 开局时椅子上的样子 */
  start: Ring<string>;
  cards: Card[];
}

/**
 * 玩法二的局面：6 把椅子围成一圈，开局 head 在后半圈，几张卡片之后一定会从 5 号绕回 0 号。
 * 不会出现满了还来人、空了还卖的卡片，每张卡都有唯一的正确答案。
 */
export function clerkGame(rand: () => number = Math.random): ClerkGame {
  const pool = shuffled(ANIMALS, rand);
  let p = 0;
  const head = 3 + Math.floor(rand() * 2); // 3 或 4
  let ring = emptyRing<string>(SEATS);
  ring = { ...ring, head, tail: head };
  for (let k = 0; k < 2; k++) ring = ringOffer(ring, pool[p++]).ring;
  const start = ring;
  // 卡片的骨架：来人多、卖得少，先把队尾推过 5 号，再卖几杯
  const shape: ('a' | 's')[] = rand() < 0.5
    ? ['a', 'a', 's', 'a', 's', 'a', 's', 's', 'a', 's']
    : ['a', 's', 'a', 'a', 's', 'a', 'a', 's', 's', 's'];
  const cards: Card[] = [];
  for (const t of shape) {
    if (t === 'a') {
      cards.push({ arrive: pool[p++] });
      ring = ringOffer(ring, pool[p - 1]).ring;
    } else {
      cards.push({ sell: true });
      ring = ringPoll(ring, true).ring;
    }
  }
  return { start, cards };
}

/** 这张卡正确的点法：来人点队尾的空椅子（tail），卖出点队头（head） */
export function cardAnswer(r: Ring<string>, card: Card): number {
  return 'arrive' in card ? r.tail : r.head;
}

/** 执行一张卡 */
export function applyCard(r: Ring<string>, card: Card): Ring<string> {
  return 'arrive' in card ? ringOffer(r, card.arrive).ring : ringPoll(r, true).ring;
}

/** 玩法二的操作：点一把椅子、再来一局 */
export type ClerkAction = { type: 'pick'; i: number } | { type: 'again' };

export interface ClerkState {
  game: ClerkGame;
  ring: Ring<string>;
  /** 做到第几张卡 */
  at: number;
  mistakes: number;
  /** 点错的椅子晃一下：[椅子, 第几次] */
  shake: [number, number] | null;
  /** 来人点错时，正确的椅子透光：[椅子, 第几次] */
  glow: [number, number] | null;
  /** 卖出点错时，队头举手 */
  raise: number | null;
  served: string[];
}

/** 现在轮到的那张卡；做完了是 null */
export const clerkCard = (s: ClerkState): Card | null => s.game.cards[s.at] ?? null;

/** 说一句：刚才做了什么 + 现在轮到什么 */
function clerkSay(s: ClerkState, done?: Msg): Msg {
  const c = clerkCard(s);
  const next = !c ? m('clerk.say.end') : 'arrive' in c ? m('clerk.say.arrive', { who: c.arrive }) : m('clerk.say.sell');
  return done ? m('clerk.say.joined', { done, next }) : next;
}

function clerkRound(prev: ClerkState | null, rand?: Rand): Outcome<ClerkState> {
  const game = clerkGame(rand);
  const state: ClerkState = { game, ring: game.start, at: 0, mistakes: 0, shake: prev?.shake ?? null, glow: null, raise: null, served: [] };
  return { state, say: clerkSay(state) };
}

export const clerkRules: GameRules<ClerkState, ClerkAction> = {
  start: (rand) => clerkRound(null, rand),

  act(s, a, rand) {
    if (a.type === 'again') return clerkCard(s) === null ? clerkRound(s, rand) : null;
    const c = clerkCard(s);
    if (!c) return null;
    const right = cardAnswer(s.ring, c);
    if (a.i !== right) {
      const shake: [number, number] = [a.i, (s.shake?.[1] ?? 0) + 1];
      if ('arrive' in c) {
        return {
          state: { ...s, mistakes: s.mistakes + 1, shake, glow: [right, (s.glow?.[1] ?? 0) + 1] },
          say: s.ring.cells[a.i] !== null ? m('clerk.say.taken') : m('clerk.say.follow'),
          sound: 'wrong',
        };
      }
      return { state: { ...s, mistakes: s.mistakes + 1, shake, raise: right }, say: m('clerk.say.who'), sound: 'wrong' };
    }
    let done: Msg;
    let served = s.served;
    if ('sell' in c) {
      const who = s.ring.cells[a.i] as string;
      served = [...served, who];
      done = m('clerk.done.sell', { who, i: a.i });
    } else {
      done = m('clerk.done.arrive', { who: c.arrive, i: a.i });
    }
    const state: ClerkState = { ...s, glow: null, raise: null, served, ring: applyCard(s.ring, c), at: s.at + 1 };
    return { state, say: clerkSay(state, done), sound: clerkCard(state) ? 'right' : ['right', 'win'] };
  },

  clickable: (s) => clerkCard(s) !== null,

  controls: (s) => (clerkCard(s) === null ? [{ type: 'button', action: { type: 'again' }, label: m('clerk.again'), look: 'primary' }] : []),

  result: (s) => (clerkCard(s) === null ? { stars: stars(s.mistakes), body: m('clerk.result', { n: SEATS - 1 }) } : null),
};

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'class RingQueue(capacity: Int) {',
  '    private val items = IntArray(capacity)',
  '    private var head = 0  // 下一个出队的格子',
  '    private var tail = 0  // 下一个入队的格子',
  '    private var size = 0',
  '',
  '    fun offer(x: Int): Boolean {',
  '        if (size == items.size) return false',
  '        items[tail] = x',
  '        tail = (tail + 1) % items.size',
  '        size++',
  '        return true',
  '    }',
  '',
  '    fun poll(): Int? {',
  '        if (size == 0) return null',
  '        val x = items[head]',
  '        head = (head + 1) % items.size',
  '        size--',
  '        return x',
  '    }',
  '}',
];

export type Op = { kind: 'offer'; x: number } | { kind: 'poll' };

export function opText(op: Op): string {
  return op.kind === 'offer' ? 'offer(' + op.x + ')' : 'poll()';
}

/** 一个操作的返回值：offer 返回 true/false，poll 返回数或 null */
export type Ret = boolean | number | null;

export function retText(v: Ret): string {
  return v === null ? 'null' : String(v);
}

/** 正确的循环队列跑一串操作，返回每个操作的返回值和最后的数组 */
export function simulate(cap: number, ops: Op[]): { results: Ret[]; ring: Ring<number> } {
  let ring = emptyRing<number>(cap);
  const results: Ret[] = [];
  for (const op of ops) {
    if (op.kind === 'offer') {
      const r = ringOffer(ring, op.x);
      ring = r.ring;
      results.push(r.ok);
    } else {
      const r = ringPoll(ring);
      ring = r.ring;
      results.push(r.x);
    }
  }
  return { results, ring };
}

/**
 * 随机生成一串操作。入队的值两位数、互不相同。
 * 偶尔让队列满了还 offer、空了还 poll，并保证 head、tail 都至少绕回一次（n 足够大时）。
 */
export function randomOps(cap: number, n: number, rand: () => number = Math.random): Op[] {
  for (let attempt = 0; ; attempt++) {
    const vals = shuffled(Array.from({ length: 90 }, (_, k) => k + 10), rand);
    let v = 0;
    let size = 0;
    const ops: Op[] = [];
    for (let k = 0; k < n; k++) {
      // 越满越想出队，越空越想入队；满了或空了时也有小概率硬来一下
      const pOffer = size === cap ? 0.3 : size === 0 ? 0.85 : 0.62 - 0.3 * (size / cap);
      if (rand() < pOffer) {
        ops.push({ kind: 'offer', x: vals[v++] });
        if (size < cap) size++;
      } else {
        ops.push({ kind: 'poll' });
        if (size > 0) size--;
      }
    }
    const wraps = countWraps(cap, ops);
    if (attempt > 200 || n < 2 * cap || (wraps.tail > 0 && wraps.head > 0)) return ops;
  }
}

/** tail 和 head 各绕回 0 号格几次 */
export function countWraps(cap: number, ops: Op[]): { head: number; tail: number } {
  let ring = emptyRing<number>(cap);
  let head = 0;
  let tail = 0;
  for (const op of ops) {
    const before = ring;
    ring = op.kind === 'offer' ? ringOffer(ring, op.x).ring : ringPoll(ring).ring;
    if (before.tail === cap - 1 && ring.tail === 0) tail++;
    if (before.head === cap - 1 && ring.head === 0) head++;
  }
  return { head, tail };
}

export interface QueueStep extends Step {
  cells: (number | null)[];
  head: number;
  tail: number;
  size: number;
  /** 正在执行第几个操作，-1 表示还没开始 */
  op: number;
  /** 正在读或写的格子 */
  touched: number | null;
  /** 到目前为止 poll 出来的值 */
  out: number[];
  /** 这一步返回的值（return 那一行才有） */
  ret: string | null;
  /** 到这一步为止，已经返回过的操作：操作序号 → 返回值 */
  rets: Record<number, string>;
}

export function buildTrace(cap: number, ops: Op[]): Trace<QueueStep> {
  const steps: QueueStep[] = [];
  let ring = emptyRing<number>(cap);
  const out: number[] = [];
  const rets: Record<number, string> = {};
  let op = -1;
  const push = (line: number, note: Msg, extra: Partial<QueueStep> = {}) => {
    if (extra.ret) rets[op] = extra.ret;
    steps.push({
      line, note, done: false,
      cells: ring.cells.slice(), head: ring.head, tail: ring.tail, size: ring.size,
      op, touched: null, out: out.slice(), ret: null, rets: { ...rets }, ...extra,
    });
  };

  push(5, m('trace.init', { cap }));
  ops.forEach((o, k) => {
    op = k;
    const name = opText(o);
    if (o.kind === 'offer') {
      if (ring.size === cap) {
        push(8, m('trace.offerFull', { op: name, cap }), { ret: 'false' });
        return;
      }
      push(8, m('trace.offerRoom', { op: name, size: ring.size, cap }));
      const t = ring.tail;
      const r = ringOffer(ring, o.x);
      ring = { ...ring, cells: r.ring.cells };
      push(9, m('trace.write', { t, x: o.x }), { touched: t });
      ring = r.ring;
      push(10, ring.tail === 0 ? m('trace.tailWrap', { t, cap }) : m('trace.tail', { t, cap, tail: ring.tail }));
      push(11, m('trace.sizeUp', { size: ring.size }));
      push(12, m('trace.retTrue'), { ret: 'true' });
    } else {
      if (ring.size === 0) {
        push(16, m('trace.pollEmpty', { op: name }), { ret: 'null' });
        return;
      }
      push(16, m('trace.pollSome', { op: name, size: ring.size }));
      const h = ring.head;
      const x = ring.cells[h] as number;
      push(17, m('trace.read', { h, x }), { touched: h });
      ring = ringPoll(ring).ring;
      push(18, ring.head === 0 ? m('trace.headWrap', { h, cap, x }) : m('trace.head', { h, cap, head: ring.head, x }));
      push(19, m('trace.sizeDown', { size: ring.size }));
      out.push(x);
      push(20, m('trace.retX', { x }), { ret: String(x) });
    }
  });
  steps[steps.length - 1].done = true;
  return steps;
}

/** 几个固定的演示：绕一圈、装满、出空 */
export const PRESETS: { id: 'wrap' | 'full'; label: Msg; cap: number; ops: Op[] }[] = [
  {
    id: 'wrap',
    label: m('trace.which.wrap'),
    cap: 4,
    ops: [
      { kind: 'offer', x: 12 }, { kind: 'offer', x: 35 }, { kind: 'offer', x: 47 },
      { kind: 'poll' }, { kind: 'poll' },
      { kind: 'offer', x: 58 }, { kind: 'offer', x: 61 }, { kind: 'offer', x: 79 },
      { kind: 'poll' }, { kind: 'poll' },
    ],
  },
  {
    id: 'full',
    label: m('trace.which.full'),
    cap: 3,
    ops: [
      { kind: 'offer', x: 21 }, { kind: 'offer', x: 43 }, { kind: 'offer', x: 65 }, { kind: 'offer', x: 87 },
      { kind: 'poll' }, { kind: 'poll' }, { kind: 'poll' }, { kind: 'poll' },
    ],
  },
];

/* ---------- 做：逐步执行里的「随机」序列 ---------- */

/** 「随机」序列的容量和操作数 */
export const TRACE_CAP = 5;
export const TRACE_OPS = 12;

/** 逐步执行面板的输入：选了哪一组，容量，操作序列 */
export interface TraceInput {
  which: 'wrap' | 'full' | 'random';
  cap: number;
  ops: Op[];
}

export type TraceAction = { type: 'which'; which: TraceInput['which'] } | { type: 'again' };

function loadTrace(which: TraceInput['which'], rand?: Rand): TraceInput {
  const p = PRESETS.find((x) => x.id === which);
  return p ? { which, cap: p.cap, ops: p.ops } : { which, cap: TRACE_CAP, ops: randomOps(TRACE_CAP, TRACE_OPS, rand) };
}

/** 做：逐步执行。上面是真实的数组，右边把同一个数组弯成一圈，看 head、tail 怎么绕回 */
export const traceRules: TraceRules<TraceInput, QueueStep, TraceAction> = {
  code: CODE,
  start: () => loadTrace('wrap'),
  act: (_input, a, rand) => loadTrace(a.type === 'which' ? a.which : 'random', rand),
  controls(input) {
    const out: Control<TraceAction>[] = [{
      type: 'segmented', legend: m('trace.ops'), value: input.which,
      options: [
        { value: 'wrap', label: m('trace.which.wrap') },
        { value: 'full', label: m('trace.which.full') },
        { value: 'random', label: m('trace.which.random') },
      ],
      choose: (v) => ({ type: 'which', which: v as TraceInput['which'] }),
    }];
    if (input.which === 'random') out.push({ type: 'button', action: { type: 'again' }, label: m('trace.again'), look: 'small' });
    return out;
  },
  trace: (input) => buildTrace(input.cap, input.ops),
  vars: (input, s): Var[] => [
    ['head', s.head], ['tail', s.tail], ['size', s.size], [m('vars.cap'), input.cap],
    [m('vars.out'), s.out.length ? s.out.join(' ') : '—'],
  ],
};

/* ---------- 做：猜下一步 ---------- */

/** 猜下一步：容量和操作数 */
export const PREDICT_CAP = 5;
export const PREDICT_OPS = 12;

/** 猜下一步的一串操作 */
export function genPredict(rand: () => number = Math.random): Op[] {
  return randomOps(PREDICT_CAP, PREDICT_OPS, rand);
}

export interface Round {
  before: Ring<number>;
  op: Op;
  /** 第一问：写进 / 读出哪一格；满了或空了时是 'full' / 'empty' */
  at: number | 'full' | 'empty';
  /** 第二问：tail（offer）或 head（poll）接下来指向哪一格；满了或空了时没有第二问 */
  next: number | null;
  after: Ring<number>;
  ret: Ret;
  /** 第一问答错时的解释 */
  why: Msg;
  /** 第二问答错时的解释；没有第二问时是 null */
  whyNext: Msg | null;
}

export function rounds(cap: number, ops: Op[]): Round[] {
  let ring = emptyRing<number>(cap);
  return ops.map((op) => {
    const before = ring;
    if (op.kind === 'offer') {
      const r = ringOffer(ring, op.x);
      ring = r.ring;
      return r.ok
        ? {
            before, op, at: before.tail, next: ring.tail, after: ring, ret: true,
            why: m('predict.why.offer', { size: before.size, tail: before.tail }),
            whyNext: m(ring.tail === 0 ? 'predict.whyNext.tailWrap' : 'predict.whyNext.tail', { from: before.tail, cap, to: ring.tail }),
          }
        : {
            before, op, at: 'full' as const, next: null, after: ring, ret: false,
            why: m('predict.why.full', { size: before.size, cap }),
            whyNext: null,
          };
    }
    const r = ringPoll(ring);
    ring = r.ring;
    return r.x !== null
      ? {
          before, op, at: before.head, next: ring.head, after: ring, ret: r.x,
          why: m('predict.why.poll', { size: before.size, head: before.head }),
          whyNext: m(ring.head === 0 ? 'predict.whyNext.headWrap' : 'predict.whyNext.head', { from: before.head, cap, to: ring.head }),
        }
      : {
          before, op, at: 'empty' as const, next: null, after: ring, ret: null,
          why: m('predict.why.empty'),
          whyNext: null,
        };
  });
}

/** 猜下一步画面的样子：操作序列（做到第几个）和数组；touched 是刚写好、指针还没动的那一格 */
export interface QueueView {
  ops: Op[];
  /** 每个操作的返回值（已经做完的才显示） */
  rets: string[];
  /** 现在轮到第几个操作；结局时等于操作个数，全部算做完 */
  r: number;
  cells: (number | null)[];
  head: number;
  tail: number;
  size: number;
  touched: number | null;
}

/** 第一问可以点格子，也可以点「满了」「空了」 */
export type PredictAnswer = number | 'full' | 'empty';

/** 把一串操作排成一问接一问：先点出写进或读出哪一格（满了、空了就点按钮），再点出指针接下来指向哪一格 */
export function makePuzzle(cap: number, ops: Op[]): Puzzle<QueueView, PredictAnswer> {
  const list = rounds(cap, ops);
  const rets = list.map((x) => retText(x.ret));
  const chipsOf = (size: number): Var[] => [[m('vars.cap'), cap], ['size', size]];
  const asks = list.flatMap((x, r) => {
    const view: QueueView = { ops, rets, r, ...x.before, touched: null };
    const first = {
      view, chips: chipsOf(view.size),
      prompt: x.op.kind === 'offer' ? m('predict.at.offer', { op: opText(x.op), x: x.op.x }) : m('predict.at.poll'),
      kind: 'pick' as const, answer: x.at as PredictAnswer, why: x.why,
      options: [
        { value: 'full' as PredictAnswer, label: m('predict.opt.full') },
        { value: 'empty' as PredictAnswer, label: m('predict.opt.empty') },
      ],
    };
    if (typeof x.at !== 'number') return [first];
    // 第二问：数组已经写好，指针还没动
    const second = {
      view: { ...view, cells: x.after.cells, touched: x.at }, chips: chipsOf(view.size),
      prompt: m('predict.next', { ret: retText(x.ret), ptr: x.op.kind === 'offer' ? 'tail' : 'head' }),
      kind: 'pick' as const, answer: x.next as PredictAnswer, why: x.whyNext as Msg,
    };
    return [first, second];
  });
  const last = list[list.length - 1];
  const end: QueueView = { ops, rets, r: list.length, ...last.after, touched: null };
  return { asks, end: { view: end, prompt: m('predict.end', { n: last.after.size }), chips: chipsOf(end.size) } };
}

export const predictRules: PredictRules<QueueView, PredictAnswer> = {
  goal: 6,
  puzzle: (rand = Math.random) => makePuzzle(PREDICT_CAP, genPredict(rand)),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'tail-mod' | 'head-tail' | 'full-check';
  cap: number;
  ops: Op[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'tail-mod',
    title: m('bug.tail-mod.title'),
    code: variant(10, '        tail = tail + 1'),
    wrongLine: 10,
    fixed: '        tail = (tail + 1) % items.size',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 },
      { kind: 'poll' }, { kind: 'poll' },
      { kind: 'offer', x: 44 }, { kind: 'offer', x: 55 },
    ],
    expect: m('bug.tail-mod.expect'),
    explain: m('bug.tail-mod.explain'),
  },
  {
    id: 'head-tail',
    title: m('bug.head-tail.title'),
    code: variant(16, '        if (head == tail) return null'),
    wrongLine: 16,
    fixed: '        if (size == 0) return null',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'poll' },
      { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 }, { kind: 'offer', x: 44 }, { kind: 'offer', x: 55 },
      { kind: 'poll' },
    ],
    expect: m('bug.head-tail.expect'),
    explain: m('bug.head-tail.explain'),
  },
  {
    id: 'full-check',
    title: m('bug.full-check.title'),
    code: variant(8, '        if (size > items.size) return false'),
    wrongLine: 8,
    fixed: '        if (size == items.size) return false',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 }, { kind: 'offer', x: 44 },
      { kind: 'offer', x: 55 },
      { kind: 'poll' },
    ],
    expect: m('bug.full-check.expect'),
    explain: m('bug.full-check.explain'),
  },
];

export interface BugStep extends QueueStep {
  /** 'crash' 下标越界；'wrong' 返回值和正确的队列不一样 */
  outcome: 'running' | 'ok' | 'wrong' | 'crash';
}

/**
 * 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号。
 * 同时用正确的队列跑一遍，poll 的返回值对不上就停下，判为出错。
 */
export function runBug(bug: Bug): Trace<BugStep> {
  const cap = bug.cap;
  const expected = simulate(cap, bug.ops).results;
  const steps: BugStep[] = [];
  const cells: (number | null)[] = Array.from({ length: cap }, () => null);
  let head = 0;
  let tail = 0;
  let size = 0;
  const out: number[] = [];
  const rets: Record<number, string> = {};
  let op = -1;
  const push = (line: number, note: Msg, extra: Partial<BugStep> = {}) => {
    if (extra.ret) rets[op] = extra.ret;
    steps.push({
      line, note, done: false, cells: cells.slice(), head, tail, size,
      op, touched: null, out: out.slice(), ret: null, rets: { ...rets }, outcome: 'running', ...extra,
    });
  };
  const liveAt = (k: number) => size > 0 && (k - head + cap) % cap < size;

  push(5, m('bug.note.init', { cap }));
  for (let k = 0; k < bug.ops.length; k++) {
    op = k;
    const o = bug.ops[k];
    const name = opText(o);
    const want = expected[k];
    if (o.kind === 'offer') {
      const full = bug.id === 'full-check' ? size > cap : size === cap;
      const cond = bug.id === 'full-check' ? size + ' > ' + cap : size + ' == ' + cap;
      if (full) {
        push(8, m('bug.note.fullYes', { op: name, cond }), { ret: 'false' });
        continue;
      }
      push(8, m(want === false ? 'bug.note.roomFull' : 'bug.note.room', { op: name, cond }));
      if (tail < 0 || tail >= cap) {
        push(9, m('bug.note.crash', { t: tail, x: o.x, max: cap - 1 }), { outcome: 'crash', done: true });
        return steps;
      }
      const t = tail;
      const lost = liveAt(t) ? cells[t] : null;
      cells[t] = o.x;
      push(9, lost !== null ? m('bug.note.writeLost', { t, x: o.x, lost }) : m('bug.note.write', { t, x: o.x }), { touched: t });
      tail = bug.id === 'tail-mod' ? t + 1 : (t + 1) % cap;
      push(10, bug.id === 'tail-mod'
        ? m(tail >= cap ? 'bug.note.tailOut' : 'bug.note.tailPlain', { t, tail })
        : m('bug.note.tailMod', { t, cap, tail }));
      size++;
      push(11, m('bug.note.sizeUp', { size }));
      push(12, m('trace.retTrue'), { ret: 'true' });
    } else {
      const empty = bug.id === 'head-tail' ? head === tail : size === 0;
      const cond = bug.id === 'head-tail' ? 'head == tail（' + head + ' == ' + tail + '）' : 'size == 0';
      if (empty) {
        if (want !== null) {
          push(16, m('bug.note.pollWrong', { op: name, cond, size, want: retText(want) }), { ret: 'null', outcome: 'wrong', done: true });
          return steps;
        }
        push(16, m('bug.note.pollEmpty', { op: name, cond }), { ret: 'null' });
        continue;
      }
      push(16, m('bug.note.pollSome', { op: name, cond }));
      const h = head;
      const x = cells[h] as number;
      push(17, m('bug.note.read', { h, x }), { touched: h });
      head = (h + 1) % cap;
      push(18, m('bug.note.head', { h, cap, head }));
      size--;
      push(19, m('bug.note.sizeDown', { size }));
      out.push(x);
      if (x !== want) {
        push(20, m('bug.note.retWrong', { x, want: retText(want) }), { ret: String(x), outcome: 'wrong', done: true });
        return steps;
      }
      push(20, m('trace.retX', { x }), { ret: String(x) });
    }
  }
  steps[steps.length - 1] = { ...steps[steps.length - 1], outcome: 'ok', done: true };
  return steps;
}

/** 找 bug 面板底部的判定文字：没跑完是空 */
export function bugVerdict(step: BugStep, _bug?: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  if (step.outcome === 'wrong') return m('bug.verdict.wrong', { ret: String(step.ret) });
  return null;
}

export const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.inputLine', { cap: bug.cap, expect: bug.expect }),
  vars: (s, bug): Var[] => [['head', s.head], ['tail', s.tail], ['size', s.size], [m('vars.cap'), bug.cap]],
  verdict: bugVerdict,
};

/* ---------- 做：挑战 ---------- */

export const CHALLENGE_CAP = 5;

/**
 * 挑战题：一串 9～11 个操作，容量 5。保证 tail 绕回过、有出过队但还留在数组里的旧值、
 * 最后队里不空，这样数组最后的样子不容易一眼看出来。
 */
export function genChallenge(rand: () => number = Math.random): Op[] {
  for (;;) {
    const ops = randomOps(CHALLENGE_CAP, 9 + Math.floor(rand() * 3), rand);
    const { ring } = simulate(CHALLENGE_CAP, ops);
    const stale = ring.cells.some((c, k) => c !== null && !isLive(ring, k));
    if (countWraps(CHALLENGE_CAP, ops).tail > 0 && stale && ring.size > 0) return ops;
  }
}

/** 挑战的操作：改某一格的猜测、选 head、选 tail、揭晓、换一题 */
export type ChallengeAction =
  | { type: 'cell'; k: number; v: string }
  | { type: 'head'; n: number }
  | { type: 'tail'; n: number }
  | { type: 'reveal' }
  | { type: 'fresh' };

export interface ChallengeState {
  ops: Op[];
  /** 每一格的猜测：'' 表示「从没写过」 */
  guess: string[];
  head: number;
  tail: number;
  shown: boolean;
}

const challengeFresh = (rand?: Rand): ChallengeState => ({
  ops: genChallenge(rand), guess: Array.from({ length: CHALLENGE_CAP }, () => ''), head: 0, tail: 0, shown: false,
});

/** 挑战的评分：正确的数组、每格对不对、一共对了几项（每格一项，加 head、tail） */
export function challengeView(s: ChallengeState) {
  const values = s.ops.flatMap((o) => (o.kind === 'offer' ? [o.x] : []));
  const answer = simulate(CHALLENGE_CAP, s.ops).ring;
  const okCell = (k: number) => (s.guess[k] === '' ? null : Number(s.guess[k])) === answer.cells[k];
  let score = 0;
  for (let k = 0; k < CHALLENGE_CAP; k++) if (okCell(k)) score++;
  if (s.head === answer.head) score++;
  if (s.tail === answer.tail) score++;
  return { values, answer, okCell, score, full: CHALLENGE_CAP + 2 };
}

/** 做：挑战。不看动画，在脑子里跑完一串操作，预测数组每一格最后是什么、head 和 tail 在哪，再和真正的循环队列比一比 */
export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeFresh(rand) }),

  act(s, a, rand) {
    switch (a.type) {
      case 'cell': return s.shown ? null : { state: { ...s, guess: s.guess.map((g, k) => (k === a.k ? a.v : g)) } };
      case 'head': return { state: { ...s, head: a.n } };
      case 'tail': return { state: { ...s, tail: a.n } };
      case 'reveal': return s.shown ? null : { state: { ...s, shown: true } };
      case 'fresh': return { state: challengeFresh(rand) };
    }
  },

  clickable: () => false,

  controls(s) {
    const idx = Array.from({ length: CHALLENGE_CAP }, (_, k) => ({ value: k, label: m('chal.num', { n: k }) }));
    const out: Control<ChallengeAction>[] = [
      { type: 'segmented', legend: m('chal.head'), value: s.head, options: idx, choose: (v) => ({ type: 'head', n: Number(v) }) },
      { type: 'segmented', legend: m('chal.tail'), value: s.tail, options: idx, choose: (v) => ({ type: 'tail', n: Number(v) }) },
    ];
    if (!s.shown) out.push({ type: 'button', action: { type: 'reveal' }, label: m('chal.reveal'), look: 'smallPrimary' });
    out.push({ type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'small' });
    return out;
  },
};

/* ---------- 延伸：两种出队方式要挪动几次 ---------- */

/** 用普通数组当队列、每次从头部删除：后面的 n - 1 个都要往前挪一格 */
export function shiftCost(n: number): number {
  return n - 1;
}

/** 「为什么快」的对比图：出队一次要挪动几个元素（对数刻度画） */
export function compareRows() {
  return [
    { label: '6', unit: m('compare.chairs'), n: 6 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1000000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.shift'), value: shiftCost(r.n), tone: 'muted' as const },
      { name: m('compare.ring'), value: 0, tone: 'accent' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { next: nextRules, clerk: clerkRules, challenge: challengeRules },
};
