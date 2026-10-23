import type { Step, Trace } from './types';

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

export interface Frame {
  say: string;
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
const LOOK_SCRIPT: { ops: LookOp[]; say: (s: { last: string[]; ring: Ring<string> }) => string }[] = [
  { ops: [], say: () => '奶茶店开门啦 🧋 门口摆着 6 把椅子' },
  { ops: [{ offer: '🐼' }], say: () => '🐼 第一个来，坐 0 号椅子' },
  { ops: [{ offer: '🐰' }, { offer: '🐱' }], say: () => '🐰 🐱 也来了，一个接一个往后坐' },
  { ops: [{ poll: true }], say: ({ last }) => '店员只叫队头：' + last[0] + ' 先买到 🧋' },
  { ops: [{ offer: '🐶' }], say: () => '新来的 🐶 坐到队尾' },
  { ops: [{ poll: true }], say: ({ last }) => '下一个是 ' + last[0] + '，先来的先买' },
  { ops: [{ offer: '🦊' }, { offer: '🐸' }], say: () => '🦊 🐸 坐上了最后两把椅子' },
  { ops: [{ glowEmpty: true }], say: () => '🐨 来了：后面没椅子，前面却空着两把！' },
  { ops: [{ bend: true }], say: () => '把椅子围成一圈 ⭕ 5 号后面就是 0 号' },
  { ops: [{ offer: '🐨' }], say: ({ ring }) => '🐨 坐到 ' + ((ring.tail - 1 + SEATS) % SEATS) + ' 号椅子，排在 🐸 后面' },
  { ops: [{ poll: true }], say: ({ last }) => '队头 ' + last[0] + ' 买到 🧋，队头往前挪一把' },
  { ops: [{ offer: '🐵' }, { offer: '🐯' }], say: () => '🐵 🐯 接着坐，6 把椅子全坐满啦' },
  { ops: [{ offer: '🐷' }], say: () => '🐷 来晚了：坐满了，请等一等 ✋' },
  { ops: [{ poll: true }, { poll: true }, { poll: true }], say: ({ last }) => last.join(' ') + ' 依次买到 🧋，谁先来谁先买' },
  { ops: [], say: () => '椅子转着圈用，一直有得坐：这就是循环队列 🎉' },
];

/** 看：生成绘本的每一页。椅子上的状态由真实的循环队列操作得到 */
export function lookFrames(): Frame[] {
  let ring = emptyRing<string>(SEATS);
  let bent = false;
  const served: string[] = [];
  const out: Frame[] = [];
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
}

export function buildTrace(cap: number, ops: Op[]): Trace<QueueStep> {
  const steps: QueueStep[] = [];
  let ring = emptyRing<number>(cap);
  const out: number[] = [];
  let op = -1;
  const push = (line: number, note: string, extra: Partial<QueueStep> = {}) => {
    steps.push({
      line, note, done: false,
      cells: ring.cells.slice(), head: ring.head, tail: ring.tail, size: ring.size,
      op, touched: null, out: out.slice(), ret: null, ...extra,
    });
  };

  push(5, '新建容量为 ' + cap + ' 的队列：数组 ' + cap + ' 格，head = tail = size = 0。');
  ops.forEach((o, k) => {
    op = k;
    const name = opText(o);
    if (o.kind === 'offer') {
      if (ring.size === cap) {
        push(8, name + '：size = ' + cap + '，和容量一样，满了，返回 false。', { ret: 'false' });
        return;
      }
      push(8, name + '：size = ' + ring.size + ' < ' + cap + '，还有空位。');
      const t = ring.tail;
      const r = ringOffer(ring, o.x);
      ring = { ...ring, cells: r.ring.cells };
      push(9, '写进队尾：items[' + t + '] = ' + o.x + '。', { touched: t });
      ring = r.ring;
      push(10, ring.tail === 0
        ? 'tail = (' + t + ' + 1) % ' + cap + ' = 0，走到数组末尾，绕回 0 号格。'
        : 'tail = (' + t + ' + 1) % ' + cap + ' = ' + ring.tail + '。');
      push(11, 'size++，现在队里有 ' + ring.size + ' 个。');
      push(12, '返回 true。', { ret: 'true' });
    } else {
      if (ring.size === 0) {
        push(16, name + '：size = 0，队列是空的，返回 null。', { ret: 'null' });
        return;
      }
      push(16, name + '：size = ' + ring.size + '，不是空的。');
      const h = ring.head;
      const x = ring.cells[h] as number;
      push(17, '读队头：x = items[' + h + '] = ' + x + '。', { touched: h });
      ring = ringPoll(ring).ring;
      push(18, (ring.head === 0
        ? 'head = (' + h + ' + 1) % ' + cap + ' = 0，绕回 0 号格。'
        : 'head = (' + h + ' + 1) % ' + cap + ' = ' + ring.head + '。')
        + 'items[' + h + '] 里的 ' + x + ' 不用擦，它已经不在队里了。');
      push(19, 'size--，现在队里有 ' + ring.size + ' 个。');
      out.push(x);
      push(20, '返回 ' + x + '。', { ret: String(x) });
    }
  });
  steps[steps.length - 1].done = true;
  return steps;
}

/** 几个固定的演示：绕一圈、装满、出空 */
export const PRESETS: { id: string; label: string; cap: number; ops: Op[] }[] = [
  {
    id: 'wrap',
    label: '绕一圈',
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
    label: '满了、空了',
    cap: 3,
    ops: [
      { kind: 'offer', x: 21 }, { kind: 'offer', x: 43 }, { kind: 'offer', x: 65 }, { kind: 'offer', x: 87 },
      { kind: 'poll' }, { kind: 'poll' }, { kind: 'poll' }, { kind: 'poll' },
    ],
  },
];

/* ---------- 做：猜下一步 ---------- */

export interface Round {
  before: Ring<number>;
  op: Op;
  /** 第一问：写进 / 读出哪一格；满了或空了时是 'full' / 'empty' */
  at: number | 'full' | 'empty';
  /** 第二问：tail（offer）或 head（poll）接下来指向哪一格；满了或空了时没有第二问 */
  next: number | null;
  after: Ring<number>;
  ret: Ret;
}

export function rounds(cap: number, ops: Op[]): Round[] {
  let ring = emptyRing<number>(cap);
  return ops.map((op) => {
    const before = ring;
    if (op.kind === 'offer') {
      const r = ringOffer(ring, op.x);
      ring = r.ring;
      return r.ok
        ? { before, op, at: before.tail, next: ring.tail, after: ring, ret: true }
        : { before, op, at: 'full' as const, next: null, after: ring, ret: false };
    }
    const r = ringPoll(ring);
    ring = r.ring;
    return r.x !== null
      ? { before, op, at: before.head, next: ring.head, after: ring, ret: r.x }
      : { before, op, at: 'empty' as const, next: null, after: ring, ret: null };
  });
}

/* ---------- 做：找 bug ---------- */

export interface Bug {
  id: 'tail-mod' | 'head-tail' | 'full-check';
  title: string;
  /** 有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  code: string[];
  wrongLine: number;
  fixed: string;
  cap: number;
  ops: Op[];
  expect: string;
  explain: string;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: Bug[] = [
  {
    id: 'tail-mod',
    title: '排着排着，程序崩溃了',
    code: variant(10, '        tail = tail + 1'),
    wrongLine: 10,
    fixed: '        tail = (tail + 1) % items.size',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 },
      { kind: 'poll' }, { kind: 'poll' },
      { kind: 'offer', x: 44 }, { kind: 'offer', x: 55 },
    ],
    expect: '队里最多 3 个，从没超过容量 4，每个 offer 都应该成功',
    explain: 'tail 走到最后一格之后没有绕回 0，下一次就写到数组外面去了。数组前面明明空着两格，却用不上。加上 % items.size，走到头就回到 0 号格。',
  },
  {
    id: 'head-tail',
    title: '满满一队人，却说队列是空的',
    code: variant(16, '        if (head == tail) return null'),
    wrongLine: 16,
    fixed: '        if (size == 0) return null',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'poll' },
      { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 }, { kind: 'offer', x: 44 }, { kind: 'offer', x: 55 },
      { kind: 'poll' },
    ],
    expect: '最后一次 poll 时队里有 4 个，应该返回队头的 22',
    explain: '空的时候 head == tail，可是装满的时候 tail 绕了一圈追上 head，也是 head == tail。光看两个指针分不清空和满。用 size 判断；或者故意空出一格不用，满的条件改成 (tail + 1) % 容量 == head。',
  },
  {
    id: 'full-check',
    title: '满了还往里塞，排在前面的人不见了',
    code: variant(8, '        if (size > items.size) return false'),
    wrongLine: 8,
    fixed: '        if (size == items.size) return false',
    cap: 4,
    ops: [
      { kind: 'offer', x: 11 }, { kind: 'offer', x: 22 }, { kind: 'offer', x: 33 }, { kind: 'offer', x: 44 },
      { kind: 'offer', x: 55 },
      { kind: 'poll' },
    ],
    expect: '第 5 个 offer 时已经满了，应该返回 false；之后的 poll 应该返回最早来的 11',
    explain: 'size 永远不会超过容量，size > items.size 一直是假，满了也照样写。tail 绕回来正好落在 head 上，把还没出队的 11 盖掉了。满的条件是 size == items.size。',
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
  let op = -1;
  const push = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({
      line, note, done: false, cells: cells.slice(), head, tail, size,
      op, touched: null, out: out.slice(), ret: null, outcome: 'running', ...extra,
    });
  };
  const liveAt = (k: number) => size > 0 && (k - head + cap) % cap < size;

  push(5, '新建容量为 ' + cap + ' 的队列。');
  for (let k = 0; k < bug.ops.length; k++) {
    op = k;
    const o = bug.ops[k];
    const name = opText(o);
    const want = expected[k];
    if (o.kind === 'offer') {
      const full = bug.id === 'full-check' ? size > cap : size === cap;
      const cond = bug.id === 'full-check' ? size + ' > ' + cap : size + ' == ' + cap;
      if (full) {
        push(8, name + '：' + cond + ' 是真，返回 false。', { ret: 'false' });
        continue;
      }
      push(8, name + '：' + cond + ' 是假，往里写。' + (want === false ? '可是队列已经满了！' : ''));
      if (tail < 0 || tail >= cap) {
        push(9, 'items[' + tail + '] = ' + o.x + '：数组只有 0～' + (cap - 1) + ' 号格，下标越界，程序崩溃！', { outcome: 'crash', done: true });
        return steps;
      }
      const t = tail;
      const lost = liveAt(t) ? cells[t] : null;
      cells[t] = o.x;
      push(9, 'items[' + t + '] = ' + o.x + '。' + (lost !== null ? '这一格里还没出队的 ' + lost + ' 被盖掉了！' : ''), { touched: t });
      tail = bug.id === 'tail-mod' ? t + 1 : (t + 1) % cap;
      push(10, bug.id === 'tail-mod'
        ? 'tail = ' + t + ' + 1 = ' + tail + '。' + (tail >= cap ? '已经走出数组了！' : '')
        : 'tail = (' + t + ' + 1) % ' + cap + ' = ' + tail + '。');
      size++;
      push(11, 'size++，size = ' + size + '。');
      push(12, '返回 true。', { ret: 'true' });
    } else {
      const empty = bug.id === 'head-tail' ? head === tail : size === 0;
      const cond = bug.id === 'head-tail' ? 'head == tail（' + head + ' == ' + tail + '）' : 'size == 0';
      if (empty) {
        if (want !== null) {
          push(16, name + '：' + cond + ' 是真，返回 null。可队里明明还有 ' + size + ' 个，应该返回 ' + want + '！', { ret: 'null', outcome: 'wrong', done: true });
          return steps;
        }
        push(16, name + '：' + cond + ' 是真，返回 null。', { ret: 'null' });
        continue;
      }
      push(16, name + '：' + cond + ' 是假。');
      const h = head;
      const x = cells[h] as number;
      push(17, 'x = items[' + h + '] = ' + x + '。', { touched: h });
      head = (h + 1) % cap;
      push(18, 'head = (' + h + ' + 1) % ' + cap + ' = ' + head + '。');
      size--;
      push(19, 'size--，size = ' + size + '。');
      out.push(x);
      if (x !== want) {
        push(20, '返回 ' + x + '。可是应该返回 ' + retText(want) + '！', { ret: String(x), outcome: 'wrong', done: true });
        return steps;
      }
      push(20, '返回 ' + x + '。', { ret: String(x) });
    }
  }
  steps[steps.length - 1] = { ...steps[steps.length - 1], outcome: 'ok', done: true };
  return steps;
}

/* ---------- 做：挑战 ---------- */

export const CHALLENGE_CAP = 5;

/**
 * 挑战题：一串 9～11 个操作，容量 5。保证 tail 绕回过、有出过队但还留在数组里的旧值、
 * 最后队里不空，这样数组最后的样子不容易一眼看出来。
 */
export function challenge(rand: () => number = Math.random): Op[] {
  for (;;) {
    const ops = randomOps(CHALLENGE_CAP, 9 + Math.floor(rand() * 3), rand);
    const { ring } = simulate(CHALLENGE_CAP, ops);
    const stale = ring.cells.some((c, k) => c !== null && !isLive(ring, k));
    if (countWraps(CHALLENGE_CAP, ops).tail > 0 && stale && ring.size > 0) return ops;
  }
}

/* ---------- 延伸：两种出队方式要挪动几次 ---------- */

/** 用普通数组当队列、每次从头部删除：后面的 n - 1 个都要往前挪一格 */
export function shiftCost(n: number): number {
  return n - 1;
}
