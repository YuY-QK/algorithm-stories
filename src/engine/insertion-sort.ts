import { m } from '../core/i18n';
import { MOVE_NEXT, MOVE_SETTLE, MOVE_STEP, RACE_STRIDE, RACE_TICK } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

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
  /** 这一手牌（画面按 id 摆放） */
  cards: Card[];
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
  const cards = toCards(values);
  const slots: (number | null)[] = values.map((_, id) => id);
  const out: LookPage[] = [];
  const push = (say: Msg, extra: Partial<LookPage>) =>
    out.push({ say, cards, slots: [...slots], held: null, heldAt: 0, inHand: 0, cmp: null, ...extra });

  push(m('look.start', { n }), {});
  push(m('look.first', { v: v(0) }), { inHand: 1 });
  let moves = 0;
  for (let i = 1; i < n; i++) {
    const key = slots[i]!;
    slots[i] = null;
    let j = i - 1;
    push(m('look.draw', { v: v(key) }), { held: key, heldAt: i, inHand: i + 1 });
    while (j >= 0 && v(slots[j]!) > v(key)) {
      const c = slots[j]!;
      slots[j + 1] = c;
      slots[j] = null;
      moves++;
      push(m('look.shift', { c: v(c), k: v(key) }), { held: key, heldAt: j, inHand: i + 1, cmp: c });
      j--;
    }
    slots[j + 1] = key;
    if (j < 0) push(m('look.front', { k: v(key) }), { inHand: i + 1 });
    else if (j === i - 1) push(m('look.stay', { c: v(slots[j]!), k: v(key) }), { inHand: i + 1, cmp: slots[j] });
    else push(m('look.stop', { c: v(slots[j]!), k: v(key) }), { inHand: i + 1, cmp: slots[j] });
  }
  push(m('look.end', { moves }), { inHand: n });
  return out;
}

/** 看的规则：种子是一手牌，「再看一次」换一手 */
const lookRules: LookRules<number[], LookPage> = {
  first: STORY_HAND,
  next: (_prev, rand) => dealHand(5, rand),
  frames: lookFrames,
};

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

/* ---------- 玩法一：找位置 ---------- */

/** 摸牌找位置：6 张牌 */
export const PLACE_N = 6;

/**
 * 玩法一的状态。牌一开始就发好了（values），改不了。
 * phase：pick 等孩子点空隙；moving 牌自己挪（step 是下一个自动步骤：shift 挪一张，settle 放下，next 摸下一张）；done 理好了。
 * shake、glow 是 [牌 id, 第几次]，次数变了才重新晃、重新亮；glow 的 id 是 -1 表示空位。
 */
export interface PlaceGame {
  values: number[];
  slots: (number | null)[];
  /** 手上这张牌原来的下标，也是手里已经排好的张数 */
  i: number;
  heldAt: number;
  phase: 'pick' | 'moving' | 'done';
  step: 'shift' | 'settle' | 'next';
  /** 孩子选中的空隙，和下一张要挪的牌的位置 */
  gap: number;
  at: number;
  mistakes: number;
  shake: [number, number] | null;
  glow: [number, number] | null;
}

export type PlaceAction = { type: 'gap'; g: number } | { type: 'again' };

/** 摸起第 i 张：它的位置空出来，拿在手上 */
function placeLift(g: PlaceGame, i: number): Outcome<PlaceGame> {
  const key = g.values[i];
  return {
    state: { ...g, slots: g.slots.map((id, s) => (s === i ? null : id)), i, heldAt: i, phase: 'pick' },
    say: i === 1 ? m('place.say.first', { key }) : m('place.say.next', { key }),
  };
}

function placeStart(rand?: Rand): Outcome<PlaceGame> {
  const values = dealHand(PLACE_N, rand);
  return placeLift(
    { values, slots: values.map((_, id) => id), i: 1, heldAt: 1, phase: 'pick', step: 'next', gap: 0, at: 0, mistakes: 0, shake: null, glow: null },
    1,
  );
}

/** 手里排好的牌（不含空位） */
export const placeHand = (g: PlaceGame) => g.slots.slice(0, g.i).map((id) => g.values[id!]);

/** 牌桌此刻的样子：放下的一瞬间手上没有牌 */
export function placeView(g: PlaceGame): HandView & { gaps: number } {
  const held = g.phase === 'done' || (g.phase === 'moving' && g.slots[g.heldAt] === g.i) ? null : g.i;
  return { slots: g.slots, held, heldAt: g.heldAt, inHand: g.phase === 'done' ? PLACE_N : g.i + 1, gaps: g.phase === 'pick' ? g.i + 1 : 0 };
}

/* 玩法一「找位置」：小熊每摸到一张新牌，孩子点出它该插在哪两张牌中间。
   插错时左右两张牌晃一晃、和新牌比一比大小；放对了牌自己一张张挪好，再摸下一张。 */
export const placeRules: GameRules<PlaceGame, PlaceAction> = {
  start: (rand) => placeStart(rand),

  act(g, a, rand) {
    if (a.type === 'again') return g.phase === 'done' ? placeStart(rand) : null;
    if (g.phase !== 'pick' || a.g < 0 || a.g > g.i) return null;
    const key = g.values[g.i];
    const j = judgeGap(placeHand(g), key, a.g);
    if (!j.ok) {
      // 手里是排好的，左边比 key 大和右边比 key 小不会同时发生
      let tell: Msg = m('place.tell.big', { v: 0, key });
      let shake = g.shake;
      let glow = g.glow;
      if (j.leftBig) {
        const id = g.slots[a.g - 1]!;
        shake = [id, (g.shake?.[1] ?? 0) + 1];
        tell = m('place.tell.big', { v: g.values[id], key });
      }
      if (j.rightSmall) {
        const id = g.slots[a.g]!;
        if (!j.leftBig) shake = [id, (g.shake?.[1] ?? 0) + 1];
        glow = [id, (g.glow?.[1] ?? 0) + 1];
        tell = m('place.tell.small', { v: g.values[id], key });
      }
      return {
        state: { ...g, mistakes: g.mistakes + 1, shake, glow },
        say: m('place.say.wrong', { tell, key }),
        sound: 'wrong',
      };
    }
    // 比 key 大的牌从右往左一张张挪，空位跟着往左走
    const shifts = g.i - 1 >= a.g;
    return {
      state: { ...g, glow: null, phase: 'moving', gap: a.g, at: g.i - 1, step: shifts ? 'shift' : 'settle' },
      say: m(a.g === g.i ? 'place.say.here' : 'place.say.make', { key }),
      sound: 'right',
      after: shifts ? MOVE_STEP : MOVE_SETTLE,
    };
  },

  tick(g): Outcome<PlaceGame> {
    if (g.phase !== 'moving') return { state: g };
    if (g.step === 'shift') {
      const slots = [...g.slots];
      slots[g.at + 1] = slots[g.at];
      slots[g.at] = null;
      const more = g.at - 1 >= g.gap;
      return { state: { ...g, slots, heldAt: g.at, at: g.at - 1, step: more ? 'shift' : 'settle' }, after: more ? MOVE_STEP : MOVE_SETTLE };
    }
    if (g.step === 'settle') {
      const slots = [...g.slots];
      slots[g.gap] = g.i;
      return { state: { ...g, slots, heldAt: g.gap, step: 'next' }, say: m('place.say.settled'), sound: 'tick', after: MOVE_NEXT };
    }
    if (g.i + 1 >= PLACE_N) return { state: { ...g, phase: 'done' }, say: m('place.say.done'), sound: 'win' };
    return placeLift(g, g.i + 1);
  },

  // 切标签时，挪到一半的局作废，重新发牌
  interrupt: (g) => (g.phase === 'moving' ? placeStart() : { state: g }),

  clickable: (g) => g.phase === 'pick',

  controls: (g) => (g.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('place.again'), look: 'primary' }] : []),

  result: (g) => (g.phase === 'done' ? { stars: stars(g.mistakes), body: m('place.body') } : null),
};

/* ---------- 玩法二：挪一挪 ---------- */

/** 挪一挪：5 张牌 */
export const SHIFT_N = 5;

/**
 * 玩法二的状态。牌一开始就发好了，改不了。
 * phase：play 孩子一张张挪；count 理好了，数罐子里的硬币；done 数对了。
 * pulse 是数错的次数（罐子里的硬币每次跳一跳），shake、glow 同玩法一。
 */
export interface ShiftGame {
  values: number[];
  slots: (number | null)[];
  i: number;
  hole: number;
  coins: number;
  mistakes: number;
  phase: 'play' | 'count' | 'done';
  shake: [number, number] | null;
  glow: [number, number] | null;
  pulse: number;
  /** 最近一次数错时点的数字，它的按钮变淡、晃一下 */
  wrongN: number | null;
}

export type ShiftAction = { type: 'card'; id: number } | { type: 'hole' } | { type: 'count'; n: number } | { type: 'again' };

function shiftLift(g: ShiftGame, i: number): Outcome<ShiftGame> {
  const key = g.values[i];
  return {
    state: { ...g, slots: g.slots.map((id, s) => (s === i ? null : id)), i, hole: i },
    say: m(i === 1 ? 'shift.say.first' : 'shift.say.next', { key }),
  };
}

function shiftStart(rand?: Rand): Outcome<ShiftGame> {
  const values = dealHand(SHIFT_N, rand);
  return shiftLift(
    { values, slots: values.map((_, id) => id), i: 1, hole: 1, coins: 0, mistakes: 0, phase: 'play', shake: null, glow: null, pulse: 0, wrongN: null },
    1,
  );
}

const bump = (x: [number, number] | null, id: number): [number, number] => [id, (x?.[1] ?? 0) + 1];

/** 每个位置上的点数，空位是 0 */
export const shiftRow = (g: ShiftGame) => g.slots.map((id) => (id === null ? 0 : g.values[id]));

/* 玩法二「挪一挪」：孩子自己当小熊。只看空位左边那张：比新牌大就点它，它往右挪一格，罐子里多一枚硬币；
   不大就点空位，把新牌放下。点错时那张牌晃一晃、正确的地方透光；最后数一数罐子里有几枚硬币，就是一共挪了几次。 */
export const shiftRules: GameRules<ShiftGame, ShiftAction> = {
  start: (rand) => shiftStart(rand),

  act(g, a, rand) {
    if (a.type === 'again') return g.phase === 'done' ? shiftStart(rand) : null;
    const key = g.values[g.i];
    if (a.type === 'count') {
      if (g.phase !== 'count') return null;
      if (a.n !== g.coins) return { state: { ...g, pulse: g.pulse + 1, wrongN: a.n }, say: m('shift.say.count'), sound: 'wrong' };
      return { state: { ...g, phase: 'done' }, say: m('shift.say.right', { n: g.coins }), sound: 'win' };
    }
    if (g.phase !== 'play') return null;
    const action = nextAction(shiftRow(g), g.hole, key);
    if (a.type === 'card') {
      if (g.slots.indexOf(a.id) !== g.hole - 1) {
        return {
          state: { ...g, shake: bump(g.shake, a.id), glow: bump(g.glow, g.slots[g.hole - 1] ?? -1) },
          say: m(g.hole === 0 ? 'shift.say.noLeft' : 'shift.say.look', { key }),
          sound: 'wrong',
        };
      }
      if (action === 'drop') {
        return {
          state: { ...g, mistakes: g.mistakes + 1, shake: bump(g.shake, a.id), glow: bump(g.glow, -1) },
          say: m('shift.say.small', { v: g.values[a.id], key }),
          sound: 'wrong',
        };
      }
      const slots = [...g.slots];
      slots[g.hole] = a.id;
      slots[g.hole - 1] = null;
      const hole = g.hole - 1;
      return {
        state: { ...g, slots, hole, coins: g.coins + 1, glow: null },
        say: m('shift.say.moved', { v: g.values[a.id], key, tail: m(hole === 0 ? 'shift.say.tailEnd' : 'shift.say.tail', { key }) }),
        sound: 'right',
      };
    }
    // 点了空位
    if (action === 'shift') {
      const left = g.slots[g.hole - 1]!;
      return {
        state: { ...g, mistakes: g.mistakes + 1, shake: bump(g.shake, left), glow: bump(g.glow, left) },
        say: m('shift.say.big', { v: g.values[left], key }),
        sound: 'wrong',
      };
    }
    const slots = [...g.slots];
    slots[g.hole] = g.i;
    const dropped = { ...g, slots, glow: null };
    if (g.i + 1 >= SHIFT_N) return { state: { ...dropped, phase: 'count' }, say: m('shift.say.counting'), sound: 'right' };
    return { ...shiftLift(dropped, g.i + 1), sound: 'right' };
  },

  clickable: (g) => g.phase === 'play',

  controls(g) {
    if (g.phase === 'count') {
      return countChoices(g.coins).map((n): Control<ShiftAction> => ({
        type: 'button', action: { type: 'count', n }, look: 'pad', label: m('num', { n }), aria: m('shift.aria.coins', { n }),
        ...(n === g.wrongN ? { nope: g.pulse } : {}),
      }));
    }
    if (g.phase === 'done') return [{ type: 'button', action: { type: 'again' }, label: m('shift.again'), look: 'primary' }];
    return [];
  },

  result: (g) => (g.phase === 'done' ? { stars: stars(g.mistakes), body: m('shift.body') } : null),
};

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
  const push = (line: number, note: Msg, extra: Partial<InsertionStep> = {}) => {
    steps.push({
      line, note, done: false, arr: [...arr], ids: [...ids], i, j, key, keyId, cmp: null, hole, sorted,
      compares, moves, outcome: 'running', ...extra,
    });
  };
  const finish = (line: number, note: Msg, extra: Partial<InsertionStep> = {}) => {
    const outcome = !isSorted(arr) ? 'wrong' : !isStable(arr, ids) ? 'unstable' : 'ok';
    push(line, note, { done: true, outcome, ...extra });
    return steps;
  };

  for (i = 1; ; i++) {
    if (steps.length > MAX_STEPS) {
      push(2, m('trace.note.stuck'), { done: true, outcome: 'stuck' });
      return steps;
    }
    if (i >= n) {
      i = null;
      sorted = n;
      return finish(2, n <= 1 ? m('trace.note.endTiny', { n }) : m('trace.note.end', { n }));
    }
    push(2, m('trace.note.i', { i, k: i + 1 }));
    key = arr[i];
    keyId = ids[i];
    hole = i;
    push(3, m('trace.note.key', { i, key }));
    j = i - 1;
    push(4, m('trace.note.j', { j }));
    for (;;) {
      if (steps.length > MAX_STEPS) {
        push(5, m('trace.note.stuck'), { done: true, outcome: 'stuck' });
        return steps;
      }
      const inRange = variant === 'gt0' ? j > 0 : j >= 0;
      const rangeText = variant === 'gt0' ? 'j > 0' : 'j >= 0';
      if (!inRange) {
        push(5, m('trace.note.range', { range: rangeText, j }));
        break;
      }
      compares++;
      const bigger = variant === 'ge' ? arr[j] >= key : arr[j] > key;
      const op = variant === 'ge' ? '>=' : '>';
      if (!bigger) {
        push(5, m('trace.note.stop', { j, v: arr[j], rel: variant === 'ge' ? '<' : '≤', key, op }), { cmp: j });
        break;
      }
      push(5, m('trace.note.big', { j, v: arr[j], op, key }), { cmp: j });
      arr[j + 1] = arr[j];
      ids[j + 1] = ids[j];
      moves++;
      hole = j;
      push(6, m('trace.note.shift', { j1: j + 1, j, v: arr[j] }), { cmp: j + 1 });
      j--;
      push(7, m('trace.note.dec', { j }));
    }
    const at = variant === 'write-j' ? j : j + 1;
    const atText = variant === 'write-j' ? 'arr[j]' : 'arr[j + 1]';
    if (at < 0 || at >= n) {
      push(9, m('trace.note.crash', { at: atText, k: at }), { done: true, outcome: 'crash' });
      return steps;
    }
    const lost = arr[at];
    arr[at] = key;
    ids[at] = keyId;
    hole = null;
    sorted = i + 1;
    const lostText = variant === 'write-j' && at !== j + 1 ? m('trace.note.lost', { v: lost }) : '';
    push(9, m('trace.note.place', { at: atText, key, k: at, lost: lostText }), { cmp: at });
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

/** 逐步执行面板的输入：数组、数组大小和初始顺序（改大小或顺序就换一个新数组） */
export type Shape = 'random' | 'nearly' | 'reversed';
export interface TraceInput {
  values: number[];
  size: number;
  shape: Shape;
}

export type TraceAction = { type: 'size'; n: number } | { type: 'shape'; shape: Shape } | { type: 'fresh' };

/** 按大小和初始顺序出一个数组 */
export function makeValues(n: number, shape: Shape, rand?: Rand): number[] {
  if (shape === 'nearly') return nearlySorted(n, 2, rand).map((v) => v * 3);
  if (shape === 'reversed') return Array.from({ length: n }, (_, k) => (n - k) * 3);
  return genArray(n, 30, rand);
}

const SHAPES: Shape[] = ['random', 'nearly', 'reversed'];

/** 做：逐步执行。key、空位、j 和代码行同步，记下比较和挪动次数 */
export const traceRules: TraceRules<TraceInput, InsertionStep, TraceAction> = {
  code: CODE,
  start: (rand) => ({ size: 8, shape: 'random', values: makeValues(8, 'random', rand) }),
  act(input, a, rand) {
    switch (a.type) {
      case 'size': return { ...input, size: a.n, values: makeValues(a.n, input.shape, rand) };
      case 'shape': return { ...input, shape: a.shape, values: makeValues(input.size, a.shape, rand) };
      case 'fresh': return { ...input, values: makeValues(input.size, input.shape, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.size'), value: input.size,
      options: [6, 8, 10].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'size', n: Number(v) }),
    },
    {
      type: 'segmented', legend: m('trace.shape'), value: input.shape,
      options: SHAPES.map((s) => ({ value: s, label: m('trace.shape.' + s) })),
      choose: (v) => ({ type: 'shape', shape: v as Shape }),
    },
    { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
  ],
  trace: (input) => buildTrace(input.values),
  vars: (_input, s): Var[] => [
    ['i', s.i ?? '—'], ['j', s.j ?? '—'], ['key', s.key ?? '—'],
    [m('trace.v.compares'), m('trace.times', { n: s.compares })], [m('trace.v.moves'), m('trace.times', { n: s.moves })],
  ],
  summary(input, s) {
    if (!s.done) return null;
    const n = input.values.length;
    return m('trace.summary', { compares: s.compares, moves: s.moves, inv: inversions(input.values), n, min: n - 1, max: (n * (n - 1)) / 2 });
  },
  jump: { label: m('trace.jump'), stop: (x) => x.line === 9 || x.done },
  foot: m('trace.foot'),
};

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
  whyPos: Msg;
  /** 选错「比较了几次」时的解释 */
  why: Msg;
}

/** 猜下一步的数组：PREDICT_N 个数，值在 1 到 PREDICT_MAX，可能有重复 */
export const PREDICT_N = 8;
export const PREDICT_MAX = 15;

export function genPredict(rand: () => number = Math.random): number[] {
  return genArray(PREDICT_N, PREDICT_MAX, rand);
}

function whyPos(before: number[], i: number, key: number, pos: number): Msg {
  const bigger = before.slice(pos, i);
  return m('why.pos', {
    head: bigger.length ? m('why.pos.head', { list: [...bigger].reverse().join('、'), key }) : '',
    stop: pos > 0 ? m('why.pos.stop', { p1: pos - 1, v: before[pos - 1], key }) : m('why.pos.left'),
    pos,
    tail: before.slice(0, i).includes(key) ? m('why.pos.tie') : '',
  });
}

function whyCompares(before: number[], pos: number, moves: number, compares: number): Msg {
  return m('why.cmp', {
    moves,
    tail: pos > 0 ? m('why.cmp.stop', { p1: pos - 1, v: before[pos - 1], compares }) : m('why.cmp.left', { compares }),
  });
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

/**
 * 猜下一步画面的样子：这一排数，key 拿在手上时的空位（hole，没有是 -1）和 key 的点数，
 * 前 sorted 个是排好的，placed 是刚放好的那一格，pickable 以内的格子能点（只有「key 落在哪一格」时）。
 */
export interface PredictView {
  arr: number[];
  hole: number;
  key: number | null;
  sorted: number;
  placed: number;
  maxPick: number;
}

/** 把一道题（一排数）排成一问接一问：每一轮先点出 key 落在哪一格，再选这一轮比较了几次 */
export function makePuzzle(values: number[]): Puzzle<PredictView, number> {
  const list = rounds(values);
  const asks = list.flatMap((r) => {
    const { i, key, before, pos } = r;
    const holdView: PredictView = { arr: before, hole: i, key, sorted: i, placed: -1, maxPick: i };
    const after = [...before.slice(0, pos), key, ...before.slice(pos, i), ...before.slice(i + 1)];
    const placedView: PredictView = { arr: after, hole: -1, key: null, sorted: i + 1, placed: pos, maxPick: -1 };
    return [
      { view: holdView, prompt: m('predict.pos', { i, key }), kind: 'pick' as const, answer: pos, why: r.whyPos },
      {
        view: placedView, prompt: m('predict.cmp', { key, pos }), kind: 'choose' as const, answer: r.compares, why: r.why,
        options: Array.from({ length: i }, (_, c) => ({ value: c + 1, label: m('predict.times', { n: c + 1 }), aria: m('predict.aria', { n: c + 1 }) })),
      },
    ];
  });
  const final: PredictView = { arr: [...values].sort((a, b) => a - b), hole: -1, key: null, sorted: values.length, placed: -1, maxPick: -1 };
  return { asks, end: { view: final, prompt: m('predict.end') } };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: 6,
  puzzle: (rand = Math.random) => makePuzzle(genPredict(rand)),
};

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
    title: m('bug.gt0.title'),
    code: variant(5, '        while (j > 0 && arr[j] > key) {'),
    wrongLine: 5,
    fixed: '        while (j >= 0 && arr[j] > key) {',
    values: [4, 2, 5, 1, 3],
    suits: false,
    expect: m('bug.gt0.expect'),
    explain: m('bug.gt0.explain'),
  },
  {
    id: 'ge',
    title: m('bug.ge.title'),
    code: variant(5, '        while (j >= 0 && arr[j] >= key) {'),
    wrongLine: 5,
    fixed: '        while (j >= 0 && arr[j] > key) {',
    values: [3, 1, 3, 2],
    suits: true,
    expect: m('bug.ge.expect'),
    explain: m('bug.ge.explain'),
  },
  {
    id: 'write-j',
    title: m('bug.write.title'),
    code: variant(9, '        arr[j] = key'),
    wrongLine: 9,
    fixed: '        arr[j + 1] = key',
    values: [3, 5, 1],
    suits: false,
    expect: m('bug.write.expect'),
    explain: m('bug.write.explain'),
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

/** 找 bug 面板底部的判定：动画跑完后结果是什么，没跑完是 null */
export function bugVerdict(step: InsertionStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  if (step.outcome === 'stuck') return m('bug.verdict.stuck');
  if (step.outcome === 'unstable') return m('bug.verdict.unstable', { arr: showCards(step.arr, step.ids, bug.suits) });
  if (step.outcome === 'wrong') return m('bug.verdict.wrong', { arr: showCards(step.arr, step.ids, bug.suits) });
  return m('bug.verdict.ok');
}

const bugRules: BugRules<Bug, InsertionStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { arr: showCards(bug.values, bug.values.map((_, k) => k), bug.suits), expect: bug.expect }),
  vars: (s): Var[] => [['i', s.i ?? '—'], ['j', s.j ?? '—'], ['key', s.key ?? '—'], [m('trace.v.moves'), m('trace.times', { n: s.moves })]],
  verdict: bugVerdict,
};

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

/** 每组的名字：文案键 lane.<kind> */
export const laneName = (kind: RaceLane['kind']): Msg => m('lane.' + kind);

/** 赛跑的状态。四组数组同时跑插入排序，traces 是各组的逐步执行，t 是跑到第几步 */
export interface RaceState {
  lanes: RaceLane[];
  traces: InsertionStep[][];
  fast: number | null;
  slow: number | null;
  /** fast 选最快；slow 选最慢；ready 预测好了，等开跑；race 在跑；end 跑完了 */
  phase: 'fast' | 'slow' | 'ready' | 'race' | 'end';
  t: number;
}

export type RaceAction =
  | { type: 'choose'; k: number }
  | { type: 'redo' }
  | { type: 'go' }
  | { type: 'skip' }
  | { type: 'again' };

function raceStart(rand?: Rand): RaceState {
  const lanes = genChallenge(rand);
  return { lanes, traces: lanes.map((l) => buildTrace(l.values)), fast: null, slow: null, phase: 'fast', t: 0 };
}

/** 最长的一组要走几步，跑到这里全部结束 */
const raceLongest = (s: RaceState) => Math.max(...s.traces.map((tr) => tr.length));

const raceFinish = (s: RaceState): RaceState => ({ ...s, t: raceLongest(s), phase: 'end' });

/** 第 k 组此刻的步骤（跑完就停在最后一步） */
export const laneNow = (s: RaceState, k: number): InsertionStep => s.traces[k][Math.min(s.t, s.traces[k].length - 1)];

/** 第 k 组跑完了吗 */
export const laneDone = (s: RaceState, k: number) => s.t >= s.traces[k].length - 1;

/** 按跑完所需的步数排名，1 最快 */
export function raceRanks(s: RaceState): number[] {
  const order = s.traces.map((tr, k) => [tr.length, k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  return s.traces.map((_, k) => order.indexOf(k) + 1);
}

export const raceFastest = (s: RaceState) => raceRanks(s).indexOf(1);
export const raceSlowest = (s: RaceState) => raceRanks(s).indexOf(s.lanes.length);

/** 每一阶段顶上的一句话（跑完以后没有） */
export function racePrompt(s: RaceState): Msg | null {
  if (s.phase === 'end') return null;
  return m('chal.prompt.' + s.phase, s.phase === 'fast' ? { n: CHALLENGE_N } : undefined);
}

const LETTERS = ['A', 'B', 'C', 'D'];
export const laneLetter = (k: number) => LETTERS[k];

/* 挑战：四组数组同时跑插入排序，先预测谁最快、谁最慢，再开跑，和实际的挪动次数比一比。
   赛跑用 after/tick 驱动，切标签（interrupt）时直接跑完，不会留下定时器。 */
export const challengeRules: GameRules<RaceState, RaceAction> = {
  start: (rand) => ({ state: raceStart(rand) }),

  act(s, a, rand) {
    switch (a.type) {
      case 'choose':
        if (s.phase === 'fast') return { state: { ...s, fast: a.k, phase: 'slow' } };
        if (s.phase === 'slow' && a.k !== s.fast) return { state: { ...s, slow: a.k, phase: 'ready' } };
        return null;
      case 'redo':
        return s.phase === 'slow' || s.phase === 'ready' ? { state: { ...s, fast: null, slow: null, phase: 'fast' } } : null;
      case 'go':
        return s.phase === 'ready' ? { state: { ...s, phase: 'race', t: 0 }, after: RACE_TICK } : null;
      case 'skip':
        return s.phase === 'race' ? { state: raceFinish(s) } : null;
      case 'again':
        return s.phase === 'end' ? { state: raceStart(rand) } : null;
    }
  },

  tick(s): Outcome<RaceState> {
    if (s.phase !== 'race') return { state: s };
    const t = s.t + RACE_STRIDE;
    return t >= raceLongest(s) ? { state: raceFinish(s) } : { state: { ...s, t }, after: RACE_TICK };
  },

  interrupt: (s) => ({ state: s.phase === 'race' ? raceFinish(s) : s }),

  clickable: (s) => s.phase === 'fast' || s.phase === 'slow',

  controls(s) {
    const out: Control<RaceAction>[] = [];
    if (s.phase === 'ready') out.push({ type: 'button', action: { type: 'go' }, label: m('chal.go'), look: 'smallPrimary' });
    if (s.phase === 'race') out.push({ type: 'button', action: { type: 'skip' }, label: m('chal.skip'), look: 'small' });
    if (s.phase === 'slow' || s.phase === 'ready') out.push({ type: 'button', action: { type: 'redo' }, label: m('chal.redo'), look: 'small' });
    if (s.phase === 'end') out.push({ type: 'button', action: { type: 'again' }, label: m('chal.again'), look: 'small' });
    return out;
  },

  result(s) {
    if (s.phase !== 'end') return null;
    const fast = raceFastest(s);
    const slow = raceSlowest(s);
    const win = s.fast === fast && s.slow === slow;
    return {
      title: m(win ? 'chal.win' : 'chal.lose'),
      body: m('chal.body', {
        fast: laneLetter(fast), fastKind: laneName(s.lanes[fast].kind), fastMoves: s.traces[fast].at(-1)!.moves,
        slow: laneLetter(slow), slowKind: laneName(s.lanes[slow].kind), slowMoves: s.traces[slow].at(-1)!.moves,
      }),
      art: {
        scene: 'RaceNote',
        props: { msg: m('chal.note', { n1: CHALLENGE_N - 1, n: CHALLENGE_N, all: (CHALLENGE_N * (CHALLENGE_N - 1)) / 2 }) },
      },
    };
  },
};

/* ---------- 延伸：快还是慢，看数据 ---------- */

/** 比较次数：已经有序 n − 1，随机打乱约 n²/4，完全倒序 n(n − 1)/2 */
export function compareRows() {
  return [
    { label: '10', unit: m('compare.hand'), n: 10 },
    { label: '100', unit: m('compare.hundred'), n: 100 },
    { label: '1,000', unit: m('compare.thousand'), n: 1000 },
    { label: '100,000', unit: m('compare.hundredK'), n: 100000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.sorted'), value: r.n - 1, tone: 'accent' as const },
      { name: m('compare.random'), value: (r.n * r.n) / 4, tone: 'muted' as const, approx: true },
      { name: m('compare.reversed'), value: (r.n * (r.n - 1)) / 2, tone: 'warn' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { place: placeRules, shift: shiftRules, challenge: challengeRules },
};
