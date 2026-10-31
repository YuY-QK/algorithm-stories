import { m } from '../core/i18n';
import { FILL_STEP, FLASH_MS, PAUSE_BEAT, PAUSE_START } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand, Step, Trace,
  TraceRules, Var,
} from '../core/types';

/* ---------- 基础：桶号、线性探测表、链地址表 ---------- */

/** 小图书馆的书架个数（桶数） */
export const KID_CAP = 7;

/** 墓碑：这个桶里放过东西，后来拿走了。查找遇到它不能停 */
export const TOMB = 'T' as const;
/** 一个桶：null 是空桶，数字是键，TOMB 是墓碑 */
export type Slot = number | null | typeof TOMB;
/** 画面里一个书架上的书：从下往上叠。TOMB 画成一个打叉的空位 */
export type Pile = (number | typeof TOMB)[];

/** 桶号 = 键 对 容量 取余，负数键也落在 0 到 cap-1（等价于 Kotlin 的 Math.floorMod） */
export function bucketOf(key: number, cap: number = KID_CAP): number {
  return ((key % cap) + cap) % cap;
}

/** 键 ÷ 容量 = 商 余 余数 的一句话 */
export function divText(key: number, cap: number = KID_CAP): Msg {
  return m('div', { key, cap, q: Math.floor(key / cap), r: bucketOf(key, cap) });
}

export function emptySlots(cap: number = KID_CAP): Slot[] {
  return Array.from({ length: cap }, () => null);
}

/** 把一排桶画成书架（空桶没有书） */
export function slotPiles(slots: readonly Slot[]): Pile[] {
  return slots.map((s) => (s === null ? [] : [s]));
}

export interface ProbeResult {
  /** 依次看过的桶 */
  path: number[];
  /** 找到（或放下）的桶，没有是 -1 */
  at: number;
}

/** 线性探测查找：从桶号开始往后看，遇到空桶就断定没有；墓碑跳过；最多看 cap 个桶 */
export function probeFind(slots: readonly Slot[], key: number): ProbeResult {
  const cap = slots.length;
  const path: number[] = [];
  let i = bucketOf(key, cap);
  for (let n = 0; n < cap; n++) {
    path.push(i);
    const s = slots[i];
    if (s === null) return { path, at: -1 };
    if (s === key) return { path, at: i };
    i = (i + 1) % cap;
  }
  return { path, at: -1 };
}

/** 线性探测放置（假定键不在表里）：放进第一个空桶或墓碑；表满了 at 是 -1 */
export function probePlace(slots: readonly Slot[], key: number): ProbeResult {
  const cap = slots.length;
  const path: number[] = [];
  let i = bucketOf(key, cap);
  for (let n = 0; n < cap; n++) {
    path.push(i);
    if (slots[i] === null || slots[i] === TOMB) return { path, at: i };
    i = (i + 1) % cap;
  }
  return { path, at: -1 };
}

/** 线性探测 put：键已在就不动；放不下返回 null。返回新的一排桶 */
export function probePut(slots: readonly Slot[], key: number): Slot[] | null {
  if (probeFind(slots, key).at >= 0) return [...slots];
  const { at } = probePlace(slots, key);
  if (at < 0) return null;
  const next = [...slots];
  next[at] = key;
  return next;
}

/** 线性探测 remove：找到了就打上墓碑 */
export function probeRemove(slots: readonly Slot[], key: number): Slot[] {
  const { at } = probeFind(slots, key);
  const next = [...slots];
  if (at >= 0) next[at] = TOMB;
  return next;
}

/** 链地址表：每个桶挂一摞（先放的在下面） */
export type Chains = number[][];

export function emptyChains(cap: number = KID_CAP): Chains {
  return Array.from({ length: cap }, () => []);
}

export function chainPut(chains: Chains, key: number): Chains {
  const b = bucketOf(key, chains.length);
  if (chains[b].includes(key)) return chains.map((c) => [...c]);
  return chains.map((c, k) => (k === b ? [...c, key] : [...c]));
}

/** 链地址查找：走到桶，再在这一摞里从下往上比。looks 是看过的书数（空架也算看了一眼） */
export function chainFind(chains: Chains, key: number): { bucket: number; looks: number; found: boolean } {
  const bucket = bucketOf(key, chains.length);
  const idx = chains[bucket].indexOf(key);
  return { bucket, looks: idx >= 0 ? idx + 1 : Math.max(1, chains[bucket].length), found: idx >= 0 };
}


/* ---------- 看：图书馆的绘本 ---------- */

/** 「看」的一页：台词加画面 */
export interface LookPage extends LookFrame {
  piles: Pile[];
  /** 管理员站在哪个书架前 */
  keeper: number | null;
  /** 手里的书 */
  book: number | null;
  /** 算式 */
  calc: Msg | null;
  /** 找到书的书架（亮起） */
  hit: number | null;
  /** 撞了的书架（摇晃） */
  clash: number | null;
  /** 确认没有的空书架 */
  miss: number | null;
}

/** 「看」的全部页：用故事稿的数字（10、23、31，借 23、31、17）。画面由上面的放置和查找函数生成 */
export function lookFrames(): LookPage[] {
  const cap = KID_CAP;
  const none = emptyChains(cap);
  const c1 = chainPut(none, 10);
  const c2 = chainPut(c1, 23);
  const c3 = chainPut(c2, 31);
  const s1 = probePut(emptySlots(cap), 10)!;
  const s2 = probePut(s1, 23)!;
  const s3 = probePut(s2, 31)!;
  const piles = (c: Chains): Pile[] => c.map((x) => [...x]);
  const base: Omit<LookPage, 'say'> = { piles: piles(none), keeper: null, book: null, calc: null, hit: null, clash: null, miss: null };
  const page = (say: Msg, o: Partial<LookPage> = {}): LookPage => ({ say, ...base, ...o });
  const r = (key: number) => bucketOf(key, cap);

  const find17 = probeFind(s3, 17);

  return [
    page(m('look.start', { n: cap, last: cap - 1 })),
    page(m('look.slow', { book: 23 }), { piles: piles(c2), keeper: 0, book: 23 }),
    page(m('look.tired', { n: r(23) + 1 }), { piles: piles(c2), keeper: r(23), book: 23, hit: r(23) }),
    page(m('look.rule', { cap })),
    page(m('look.put', { book: 10, r: r(10) }), { piles: piles(c1), keeper: r(10), book: 10, calc: divText(10, cap) }),
    page(m('look.put', { book: 23, r: r(23) }), { piles: piles(c2), keeper: r(23), book: 23, calc: divText(23, cap) }),
    page(m('look.fetch', { book: 23, r: r(23) }), { piles: piles(c2), keeper: r(23), book: 23, calc: divText(23, cap), hit: r(23) }),
    page(m('look.clash', { book: 31, r: r(31) }), { piles: piles(c2), keeper: r(31), book: 31, calc: divText(31, cap), clash: r(31) }),
    page(m('look.chain'), { piles: piles(c3), keeper: r(31), book: 31 }),
    page(m('look.chainFetch', { book: 31, r: r(31) }), { piles: piles(c3), keeper: r(31), book: 31, hit: r(31) }),
    page(m('look.probe'), { piles: slotPiles(s3), keeper: s3.indexOf(31), book: 31 }),
    page(m('look.probe1', { book: 17, r: r(17), v: s3[find17.path[0]] as number }), { piles: slotPiles(s3), keeper: find17.path[0], book: 17, calc: divText(17, cap) }),
    page(m('look.probe2', { i: find17.path[1], v: s3[find17.path[1]] as number }), { piles: slotPiles(s3), keeper: find17.path[1], book: 17 }),
    page(m('look.probeEmpty', { i: find17.path[2], book: 17 }), { piles: slotPiles(s3), keeper: find17.path[2], book: 17, miss: find17.path[2] }),
    page(m('look.grow'), { piles: slotPiles(s3) }),
  ];
}

/** 看：故事每次一样，「再看一次」只是回到第一页 */
const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: () => 0,
  frames: () => lookFrames(),
};

/* ---------- 玩一：直接走到书架 ---------- */

/** 玩法一的六本书：先小数（不用绕圈），再大数（要绕好几圈），最后一本正好绕整圈 */
export const PLAY_BOOKS = [4, 9, 10, 23, 31, 14];

/** 玩法一随机出六本书：前两本小，中间三本大，最后一本是 7 的倍数（回到 0 号架） */
export function playBooks(rand: () => number = Math.random): number[] {
  const r = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
  const out: number[] = [r(2, 6), r(8, 13)];
  while (out.length < 5) {
    const k = r(15, 45);
    if (k % KID_CAP !== 0 && !out.includes(k)) out.push(k);
  }
  out.push(KID_CAP * r(2, 6));
  return out;
}

/** 数一圈：从 0 号架出发，数 key 下，每下走一格，数过 6 号回到 0 号。返回每一下落在哪个架 */
export function walkHops(key: number, cap: number = KID_CAP): number[] {
  return Array.from({ length: key }, (_, k) => (k + 1) % cap);
}

/** 余数按钮的提示：转了几圈、还剩几格 */
export function restText(key: number, cap: number = KID_CAP): Msg {
  const laps = Math.floor(key / cap);
  const r = key % cap;
  return laps === 0 ? m('rest.zero', { key, r }) : m('rest.laps', { key, laps, r });
}

/** 第几本起，「数给我看」换成「余数」按钮 */
export const BIG_FROM = 3;

/** 玩一的操作：点书架、数给我看、余数、下一本、再放六本 */
export type WalkAction =
  | { type: 'tap'; i: number }
  | { type: 'count' }
  | { type: 'rest' }
  | { type: 'next' }
  | { type: 'again' };

export interface WalkState {
  books: number[];
  /** 现在是第几本（从 0 开始） */
  r: number;
  piles: Pile[];
  /** 管理员站在哪个书架前 */
  keeper: number | null;
  /** 数到第几下 */
  count: number;
  /** 透光提示的书架 */
  glow: number | null;
  /** 点错的书架：[下标, 第几次]，晃一下 */
  shake: [number, number] | null;
  /** 这本书点错的次数 */
  wrong: number;
  placed: boolean;
  /** 管理员正在一格一格数 */
  walking: boolean;
  finished: boolean;
  /** 数一圈要经过的架，和已经数了几下 */
  hops: number[];
  hopped: number;
  /** 台词。画在顶栏（手里的书）下面，所以由画面自己画 */
  say: Msg;
}

export const walkBook = (s: WalkState): number => s.books[s.r];
const walkUsesRest = (s: WalkState) => s.r >= BIG_FROM;

/** 换一本书：架子清空，计数清零 */
function walkBegin(s: WalkState): WalkState {
  return {
    ...s, piles: emptyChains(KID_CAP), keeper: null, count: 0, wrong: 0, placed: false, glow: null, walking: false, hops: [], hopped: 0,
    say: m('walk.say.ask', { book: s.books[s.r] }),
  };
}

/** 管理员从 0 号架出发，一格一格数 */
function walkCount(s: WalkState): Outcome<WalkState> {
  const hops = walkHops(walkBook(s));
  return {
    state: { ...s, glow: null, walking: true, keeper: 0, count: 0, hops, hopped: 0, say: m('walk.say.count', { book: walkBook(s), last: KID_CAP - 1 }) },
    after: FILL_STEP,
  };
}

/**
 * 玩法一「直接走到书架」：书上有大数字书号，孩子点书架放书。
 * 引导：点错会晃一下；点「数给我看」管理员从 0 号架一格格数；点错两次自动数给你看；
 * 后半段换成「余数」按钮（转了几圈、还剩几格）。答案固定：书号除以 7 的余数。
 */
export const walkRules: GameRules<WalkState, WalkAction> = {
  start: () => ({
    state: walkBegin({
      books: [...PLAY_BOOKS], r: 0, piles: [], keeper: null, count: 0, glow: null, shake: null, wrong: 0, placed: false,
      walking: false, finished: false, hops: [], hopped: 0, say: m('walk.say.ask', { book: PLAY_BOOKS[0] }),
    }),
  }),

  act(s, a, rand) {
    if (a.type === 'again') {
      return s.finished ? { state: walkBegin({ ...s, books: playBooks(rand), r: 0, finished: false }) } : null;
    }
    if (s.finished) return null;
    if (a.type === 'next') {
      if (!s.placed) return null;
      if (s.r >= s.books.length - 1) {
        return { state: { ...s, finished: true, glow: null, walking: false, keeper: null, piles: emptyChains(KID_CAP) }, sound: 'win' };
      }
      return { state: walkBegin({ ...s, r: s.r + 1 }) };
    }
    if (s.placed || s.walking) return null;
    const book = walkBook(s);
    if (a.type === 'count') return walkCount(s);
    if (a.type === 'rest') {
      return { state: { ...s, keeper: null, glow: bucketOf(book), say: m('walk.say.rest', { text: restText(book) }) }, after: FLASH_MS };
    }
    // 点书架
    if (a.i === bucketOf(book)) {
      return {
        state: { ...s, glow: null, piles: s.piles.map((_, k) => (k === a.i ? [book] : [])), keeper: a.i, placed: true, say: m('walk.say.placed', { book, i: a.i }) },
        sound: 'right',
      };
    }
    const wrong = s.wrong + 1;
    const hit = { ...s, wrong, shake: [a.i, wrong] as [number, number] };
    // 点错两次：管理员自己数给孩子看
    if (wrong >= 2) return { ...walkCount(hit), sound: 'wrong' };
    return { state: { ...hit, say: m(walkUsesRest(s) ? 'walk.say.againRest' : 'walk.say.againCount') }, sound: 'wrong' };
  },

  tick(s) {
    // 数完以后，透光提示亮一会儿就熄
    if (!s.walking) return { state: { ...s, glow: null } };
    const keeper = s.hops[s.hopped];
    const hopped = s.hopped + 1;
    if (hopped >= s.hops.length) {
      return {
        state: { ...s, keeper, count: hopped, hopped, walking: false, glow: keeper, say: m('walk.say.arrive', { book: walkBook(s), i: keeper }) },
        after: FLASH_MS,
      };
    }
    return { state: { ...s, keeper, count: hopped, hopped }, after: FILL_STEP };
  },

  // 切标签时，数数和透光停下，孩子可以接着点
  interrupt: (s) => ({ state: { ...s, walking: false, glow: null } }),

  clickable: (s) => !s.placed && !s.walking && !s.finished,

  controls(s) {
    if (s.finished) return [{ type: 'button', action: { type: 'again' }, label: m('walk.btn.again') }];
    if (s.placed) {
      return [{ type: 'button', action: { type: 'next' }, label: m(s.r >= s.books.length - 1 ? 'walk.btn.done' : 'walk.btn.next'), look: 'primary' }];
    }
    const count: Control<WalkAction> = { type: 'button', action: { type: 'count' }, label: m('walk.btn.count'), disabled: s.walking };
    const rest: Control<WalkAction> = { type: 'button', action: { type: 'rest' }, label: m('walk.btn.rest'), disabled: s.walking };
    if (!walkUsesRest(s)) return [count];
    return s.wrong >= 1 ? [rest, count] : [rest];
  },

  result: (s) => (s.finished ? { title: m('walk.done.title'), body: m('walk.done.body', { cap: KID_CAP }) } : null),
};

/* ---------- 玩二：撞了怎么办 ---------- */

/** 玩法二：按顺序放的五本书。10、23 不撞，31、17、9 都撞（31、17 撞 3 号架，9 撞 2 号架） */
export const CLASH_BOOKS = [10, 23, 31, 17, 9];
/** 放完以后要借的两本书 */
export const CLASH_FETCH = [17, 9];

export type ClashMode = 'chain' | 'probe';
export const CLASH_MODES: readonly ClashMode[] = ['chain', 'probe'];
/** 两种办法的图标 */
export const CLASH_ICON: Record<ClashMode, string> = { chain: '📚', probe: '➡️' };

/** 玩法二的一次放书：撞了就按所选办法放。返回新状态、落点和是否撞了 */
export interface ClashTable {
  chains: Chains;
  slots: Slot[];
}
export function clashStart(): ClashTable {
  return { chains: emptyChains(), slots: emptySlots() };
}
/** 放一本书。两种办法的表同时更新（撞之前两张表长得一样），画面按所选的办法显示其中一张 */
export function clashPut(t: ClashTable, _mode: ClashMode, key: number): ClashTable {
  return { chains: chainPut(t.chains, key), slots: probePut(t.slots, key) ?? t.slots };
}
/** 这本书落下的位置（桶号）：链地址是目标桶，探测是最终落点 */
export function clashSpot(t: ClashTable, mode: ClashMode, key: number): number {
  return mode === 'chain' ? bucketOf(key) : probePlace(t.slots, key).at;
}
/** 放这本书之前，目标书架上有书吗？（撞了） */
export function clashes(t: ClashTable, mode: ClashMode, key: number): boolean {
  const b = bucketOf(key);
  return mode === 'chain' ? t.chains[b].length > 0 : t.slots[b] !== null;
}
/** 借书：看了几本，经过哪些书架 */
export function clashFetch(t: ClashTable, mode: ClashMode, key: number): { looks: number; path: number[] } {
  if (mode === 'chain') {
    const r = chainFind(t.chains, key);
    return { looks: r.looks, path: Array(r.looks).fill(r.bucket) };
  }
  const r = probeFind(t.slots, key);
  return { looks: r.path.length, path: r.path };
}
export function clashPiles(t: ClashTable, mode: ClashMode): Pile[] {
  return mode === 'chain' ? t.chains.map((c) => [...c]) : slotPiles(t.slots);
}

/** 玩二的操作：放书、选办法、下一本、点书架（借书时）、再玩一局 */
export type ClashAction =
  | { type: 'put' }
  | { type: 'choose'; mode: ClashMode }
  | { type: 'next' }
  | { type: 'shelf'; i: number }
  | { type: 'reset' };

/** place：等放书；choose：撞了，等孩子选办法；placed：放好了；fetch：等孩子点书架；fetching：管理员一本本看；done：借完了 */
export type ClashPhase = 'place' | 'choose' | 'placed' | 'fetch' | 'fetching' | 'done';

export interface ClashState {
  mode: ClashMode | null;
  table: ClashTable;
  /** 已经放了几本 */
  n: number;
  phase: ClashPhase;
  keeper: number | null;
  clash: number | null;
  shake: [number, number] | null;
  /** 借书时点错的次数 */
  wrongs: number;
  /** 借第几本 */
  f: number;
  /** 这一本已经看了几个，和两本一共看了几个 */
  looks: number;
  total: number;
  /** 台词。画在顶栏下面，所以由画面自己画 */
  say: Msg;
  /** 每种办法借两本书一共看了几次（跨局保留，两种都玩过就能比） */
  record: Partial<Record<ClashMode, number>>;
  /** 借书时经过的架、已经看到第几个，stage 为 after 表示最后一个已经看完、等一拍再往下 */
  path: number[];
  stepAt: number;
  stage: 'step' | 'after';
}

/** 手里要放的书（放完了是 undefined）和要借的书 */
export const clashBook = (s: ClashState): number | undefined => CLASH_BOOKS[s.n];
export const clashWant = (s: ClashState): number => CLASH_FETCH[s.f];

function clashFresh(prev: Pick<ClashState, 'record' | 'wrongs' | 'shake'> | null): ClashState {
  return {
    mode: null, table: clashStart(), n: 0, phase: 'place', keeper: null, clash: null, shake: prev?.shake ?? null, wrongs: prev?.wrongs ?? 0,
    f: 0, looks: 0, total: 0, say: m('clash.say.first', { book: CLASH_BOOKS[0] }), record: prev?.record ?? {}, path: [], stepAt: 0, stage: 'step',
  };
}

/** 放下这本书 */
function clashSettle(s: ClashState, mode: ClashMode, key: number): Outcome<ClashState> {
  const hit = clashes(s.table, mode, key);
  const spot = clashSpot(s.table, mode, key);
  const b = bucketOf(key);
  const tail = hit ? m(mode === 'chain' ? 'clash.say.tailChain' : 'clash.say.tailProbe', { b }) : '';
  return {
    state: { ...s, table: clashPut(s.table, mode, key), keeper: spot, clash: null, phase: 'placed', say: m('clash.say.placed', { book: key, spot, tail }) },
    sound: 'right',
  };
}

/** 借完一本书以后：还有下一本就接着借，否则记下成绩 */
function clashAfterFetch(s: ClashState): Outcome<ClashState> {
  if (s.f >= CLASH_FETCH.length - 1) {
    return {
      state: { ...s, phase: 'done', stage: 'step', record: { ...s.record, [s.mode!]: s.total }, say: m('clash.say.done', { total: s.total }) },
      sound: 'win',
    };
  }
  const f = s.f + 1;
  return { state: { ...s, f, phase: 'fetch', stage: 'step', keeper: null, say: m('clash.say.next', { book: CLASH_FETCH[f] }) } };
}

/**
 * 玩法二「撞了同一个书架怎么办」：放五本书，31、17、9 会撞。第一次撞时孩子选办法（叠起来 / 放旁边），
 * 之后这局都用这个办法。放完借两本书，数一数各看了几本；两种办法都玩过，就能比一比。
 */
export const clashRules: GameRules<ClashState, ClashAction> = {
  start: () => ({ state: clashFresh(null) }),

  act(s, a) {
    switch (a.type) {
      case 'put': {
        if (s.phase !== 'place') return null;
        const key = clashBook(s)!;
        const b = bucketOf(key);
        if (s.mode === null && clashes(s.table, 'chain', key)) {
          return {
            state: { ...s, keeper: b, clash: b, phase: 'choose', say: m('clash.say.clash', { div: divText(key), b }) },
            sound: 'wrong',
          };
        }
        return clashSettle({ ...s, keeper: b }, s.mode ?? 'chain', key);
      }
      case 'choose':
        return s.phase === 'choose' ? clashSettle({ ...s, mode: a.mode, clash: null }, a.mode, clashBook(s)!) : null;
      case 'next': {
        if (s.phase !== 'placed') return null;
        const n = s.n + 1;
        if (s.n >= CLASH_BOOKS.length - 1) {
          return { state: { ...s, n, phase: 'fetch', keeper: null, say: m('clash.say.fetch', { book: CLASH_FETCH[s.f] }) } };
        }
        return { state: { ...s, n, phase: 'place', keeper: null, say: m('clash.say.come', { book: CLASH_BOOKS[n] }) } };
      }
      case 'shelf': {
        if (s.phase !== 'fetch') return null;
        const want = clashWant(s);
        if (a.i !== bucketOf(want)) {
          const wrongs = s.wrongs + 1;
          return { state: { ...s, wrongs, shake: [a.i, wrongs], say: m('clash.say.wrong', { div: divText(want) }) }, sound: 'wrong' };
        }
        const res = clashFetch(s.table, s.mode!, want);
        return {
          state: { ...s, phase: 'fetching', looks: 0, path: res.path, stepAt: 0, stage: 'step', say: m('clash.say.looking') },
          after: PAUSE_START,
        };
      }
      case 'reset':
        return s.phase === 'done' ? { state: clashFresh(s) } : null;
    }
  },

  tick(s) {
    if (s.phase !== 'fetching') return { state: s };
    if (s.stage === 'after') return clashAfterFetch(s);
    const keeper = s.path[s.stepAt];
    const stepAt = s.stepAt + 1;
    if (stepAt < s.path.length) return { state: { ...s, keeper, stepAt, looks: stepAt }, after: PAUSE_BEAT };
    const want = clashWant(s);
    return {
      state: { ...s, keeper, stepAt, looks: stepAt, total: s.total + s.path.length, stage: 'after', say: m('clash.say.found', { book: want, n: s.path.length }) },
      sound: 'right',
      after: PAUSE_BEAT * 2,
    };
  },

  // 切标签时，借书的动画停在半路：回到「点书架」重新借这一本；最后一步已经看完的，直接往下走
  interrupt(s) {
    if (s.phase !== 'fetching') return { state: s };
    if (s.stage === 'after') return clashAfterFetch(s);
    return {
      state: { ...s, phase: 'fetch', keeper: null, looks: 0, stage: 'step', say: m(s.f === 0 ? 'clash.say.fetch' : 'clash.say.next', { book: clashWant(s) }) },
    };
  },

  clickable: (s) => s.phase === 'fetch',

  controls(s) {
    switch (s.phase) {
      case 'place':
        return [{ type: 'button', action: { type: 'put' }, label: m('clash.btn.put'), look: 'primary' }];
      case 'placed':
        return [{ type: 'button', action: { type: 'next' }, label: m(s.n >= CLASH_BOOKS.length - 1 ? 'clash.btn.fetch' : 'clash.btn.next'), look: 'primary' }];
      case 'choose':
        return CLASH_MODES.map((mode): Control<ClashAction> => ({
          type: 'button', action: { type: 'choose', mode }, label: m('clash.mode.' + mode), look: 'choice',
          art: { scene: 'ModeIcon', props: { icon: CLASH_ICON[mode] } },
        }));
      case 'done': {
        const both = s.record.chain !== undefined && s.record.probe !== undefined;
        return [{ type: 'button', action: { type: 'reset' }, label: m(both ? 'clash.btn.again' : 'clash.btn.other'), look: 'primary' }];
      }
      default:
        return [];
    }
  },

  result(s) {
    if (s.phase !== 'done') return null;
    const both = s.record.chain !== undefined && s.record.probe !== undefined;
    const mode = s.mode!;
    const other: ClashMode = mode === 'chain' ? 'probe' : 'chain';
    return {
      title: m('clash.done.title', { icon: CLASH_ICON[mode], name: m('clash.mode.' + mode), total: s.total }),
      body: both ? m('clash.done.both', { chain: s.record.chain!, probe: s.record.probe! }) : m('clash.done.other'),
      foot: both ? undefined : m('clash.done.foot', { name: m('clash.mode.' + other) }),
    };
  },
};

/* ---------- 做：逐步执行（线性探测 + 墓碑） ---------- */

export const CODE = [
  'const val EMPTY = Int.MIN_VALUE      // 空桶',
  'const val TOMB = Int.MIN_VALUE + 1   // 墓碑：放过书，后来拿走了',
  '',
  'fun find(slots: IntArray, key: Int): Int {',
  '    val cap = slots.size',
  '    var i = Math.floorMod(key, cap)',
  '    repeat(cap) {',
  '        if (slots[i] == EMPTY) return -1',
  '        if (slots[i] == key) return i',
  '        i = (i + 1) % cap',
  '    }',
  '    return -1',
  '}',
  '',
  'fun put(slots: IntArray, key: Int): Boolean {',
  '    if (find(slots, key) >= 0) return true   // 已经有了',
  '    val cap = slots.size',
  '    var i = Math.floorMod(key, cap)',
  '    repeat(cap) {',
  '        if (slots[i] == EMPTY || slots[i] == TOMB) {',
  '            slots[i] = key',
  '            return true',
  '        }',
  '        i = (i + 1) % cap',
  '    }',
  '    return false',
  '}',
  '',
  'fun remove(slots: IntArray, key: Int): Boolean {',
  '    val i = find(slots, key)',
  '    if (i < 0) return false',
  '    slots[i] = TOMB',
  '    return true',
  '}',
];

export type Op = 'get' | 'put' | 'remove';

export interface HashLookupStep extends Step {
  slots: Slot[];
  /** 当前看的桶，还没算出来是 null */
  i: number | null;
  /** 看过几个桶 */
  looks: number;
  /** 做完时的返回值：get 是下标（-1 没有），put、remove 是 true/false */
  result: number | boolean | null;
}

/** 往后一格的说明；到头回绕时多一句 */
const nextNote = (i: number, next: number, cap: number): Msg => m(next === 0 ? 'trace.note.nextWrap' : 'trace.note.next', { i, cap, next });

/** 逐步执行：在一张线性探测表上做一次 get（find）、put 或 remove。line 对应 CODE 的行号 */
export function buildTrace(start: readonly Slot[], op: Op, key: number): Trace<HashLookupStep> {
  const cap = start.length;
  const slots: Slot[] = [...start];
  const steps: HashLookupStep[] = [];
  let looks = 0;
  const push = (line: number, note: Msg, i: number | null, extra: Partial<HashLookupStep> = {}) => {
    steps.push({ line, note, slots: [...slots], i, looks, result: null, done: false, ...extra });
  };

  /** find 的 4 到 13 行；call 是调用它的那一行（get 直接就是 find） */
  function find(callLine: number, callNote: Msg): number {
    push(callLine, callNote, null);
    push(6, m('trace.note.floor', { key, cap, b: bucketOf(key, cap) }), bucketOf(key, cap));
    let i = bucketOf(key, cap);
    for (let n = 0; n < cap; n++) {
      looks++;
      const s = slots[i];
      if (s === null) {
        push(8, m('trace.note.emptyRet', { i, key }), i);
        return -1;
      }
      push(8, s === TOMB ? m('trace.note.tomb', { i }) : m('trace.note.taken', { i, v: s }), i);
      if (s === key) {
        push(9, m('trace.note.hit', { i, key }), i);
        return i;
      }
      push(9, m('trace.note.ne', { what: s === TOMB ? m('trace.tomb') : s, key }), i);
      const next = (i + 1) % cap;
      push(10, nextNote(i, next, cap), next);
      i = next;
    }
    push(12, m('trace.note.allSeen'), null);
    return -1;
  }

  if (op === 'get') {
    const at = find(4, m('trace.note.getCall', { key }));
    const last = steps[steps.length - 1];
    last.done = true;
    last.result = at;
  } else if (op === 'remove') {
    push(29, m('trace.note.removeStart', { key }), null);
    const at = find(30, m('trace.note.call'));
    if (at < 0) {
      push(31, m('trace.note.removeNone', { key }), null, { done: true, result: false });
    } else {
      push(31, m('trace.note.removeFound', { at }), at);
      slots[at] = TOMB;
      push(32, m('trace.note.removeTomb', { at }), at);
      push(33, m('trace.note.retTrue'), at, { done: true, result: true });
    }
  } else {
    push(15, m('trace.note.putStart', { key }), null);
    const at = find(16, m('trace.note.call'));
    if (at >= 0) {
      push(16, m('trace.note.putHave', { at }), at, { done: true, result: true });
    } else {
      push(16, m('trace.note.putNone'), null);
      push(17, m('trace.note.cap', { cap }), null);
      let i = bucketOf(key, cap);
      push(18, m('trace.note.floorPut', { key, cap, i }), i);
      let placed = false;
      for (let n = 0; n < cap && !placed; n++) {
        const free = slots[i] === null || slots[i] === TOMB;
        const state = slots[i] === null ? m('trace.slot.empty') : slots[i] === TOMB ? m('trace.slot.tomb') : m('trace.slot.taken', { v: slots[i] as number });
        push(20, m('trace.note.slot', { i, state, verdict: m(free ? 'trace.put' : 'trace.noPut') }), i);
        if (free) {
          slots[i] = key;
          push(21, m('trace.note.set', { i, key }), i);
          push(22, m('trace.note.retTrue'), i, { done: true, result: true });
          placed = true;
        } else {
          const next = (i + 1) % cap;
          push(24, nextNote(i, next, cap), next);
          i = next;
        }
      }
      if (!placed) push(26, m('trace.note.full'), null, { done: true, result: false });
    }
  }
  return steps;
}

/** 做逐步执行用的一张随机表：3 到 5 个键，有时留一个墓碑。保证至少两个空桶，查找总会停 */
export function genTable(cap: number = KID_CAP, rand: () => number = Math.random): Slot[] {
  let slots = emptySlots(cap);
  const n = Math.max(1, Math.min(3 + Math.floor(rand() * 3), cap - 2));
  const keys: number[] = [];
  while (keys.length < n) {
    const k = Math.floor(rand() * 40);
    if (!keys.includes(k)) keys.push(k);
  }
  for (const k of keys) slots = probePut(slots, k)!;
  if (rand() < 0.5) slots = probeRemove(slots, keys[Math.floor(rand() * keys.length)]);
  return slots;
}

/** 随机挑一个表里的键 */
export function tableKey(slots: readonly Slot[], rand: () => number = Math.random): number {
  const keys = slots.filter((s): s is number => typeof s === 'number');
  return keys.length ? keys[Math.floor(rand() * keys.length)] : 0;
}

/** 找一个不在表里、而且目标桶已经被占的新键（会撞）。找不到就随便给一个不在表里的 */
export function clashKey(slots: readonly Slot[], rand: () => number = Math.random): number {
  const cap = slots.length;
  const cands: number[] = [];
  for (let k = 0; k < 60; k++) {
    if (!slots.includes(k) && typeof slots[bucketOf(k, cap)] === 'number') cands.push(k);
  }
  if (cands.length) return cands[Math.floor(rand() * cands.length)];
  for (let k = 0; ; k++) if (!slots.includes(k)) return k;
}

/** 逐步执行面板的输入：一张表、一个操作、一个键 */
export interface TraceInput {
  table: Slot[];
  op: Op;
  key: number;
}

export type TraceAction =
  | { type: 'op'; op: Op }
  | { type: 'key'; n: number }
  | { type: 'tableKey' }
  | { type: 'clashKey' }
  | { type: 'fresh' };

const OPS: readonly Op[] = ['get', 'put', 'remove'];

const traceRules: TraceRules<TraceInput, HashLookupStep, TraceAction> = {
  code: CODE,
  start(rand) {
    const table = genTable(KID_CAP, rand);
    return { table, op: 'get', key: tableKey(table, rand) };
  },
  act(input, a, rand) {
    switch (a.type) {
      case 'op': return { ...input, op: a.op };
      case 'key': return { ...input, key: a.n };
      case 'tableKey': return { ...input, key: tableKey(input.table, rand) };
      case 'clashKey': return { ...input, key: clashKey(input.table, rand) };
      case 'fresh': {
        const table = genTable(KID_CAP, rand);
        return { ...input, table, key: tableKey(table, rand) };
      }
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.op'), value: input.op,
      options: OPS.map((op) => ({ value: op, label: m('trace.op.' + op) })),
      choose: (v) => ({ type: 'op', op: v as Op }),
    },
    { type: 'number', label: m('trace.key'), value: input.key, submit: (n) => ({ type: 'key', n }) },
    {
      type: 'group', legend: m('trace.quick'),
      items: [
        { type: 'button', action: { type: 'tableKey' }, label: m('trace.tableKey'), look: 'small' },
        { type: 'button', action: { type: 'clashKey' }, label: m('trace.clashKey'), look: 'small' },
        { type: 'button', action: { type: 'fresh' }, label: m('trace.fresh'), look: 'small' },
      ],
    },
  ],
  trace: (input) => buildTrace(input.table, input.op, input.key),
  vars: (input, s): Var[] => [
    [m('var.key'), input.key],
    ['i', s.i ?? '—'],
    [m('var.looks'), m('var.looksVal', { n: s.looks })],
    [m('var.ret'), s.result === null ? '—' : s.result === true ? 'true' : s.result === false ? 'false' : s.result],
  ],
  summary(input, s) {
    if (!s.done) return null;
    if (input.op === 'get') {
      return s.result === -1 ? m('trace.sum.getNone', { looks: s.looks, key: input.key }) : m('trace.sum.getFound', { at: s.result as number, key: input.key, looks: s.looks });
    }
    if (input.op === 'remove') return s.result ? m('trace.sum.removed') : m('trace.sum.removeNone', { key: input.key });
    return s.result ? m('trace.sum.put') : m('trace.sum.full');
  },
};

/* ---------- 做：猜下一步 ---------- */

/** 一道题：点出一个桶 */
export interface Round {
  /** bucket：算桶号；place：撞了往后放，落在哪；find：查到哪个桶能下结论 */
  kind: 'bucket' | 'place' | 'find';
  key: number;
  slots: Slot[];
  prompt: Msg;
  /** 正确的桶号 */
  correct: number;
  /** 答错的解释 */
  why: Msg;
  /** 答对以后的一句话 */
  ok: Msg;
}

/** 沿着 path 一个个桶走：占着的往后看，最后一个桶用 endText 收尾。拼成一句 Msg（用「；」连起来，句号收尾） */
function walkMsg(slots: readonly Slot[], path: number[], endText: (i: number, s: Slot) => Msg): Msg {
  const cap = slots.length;
  const part = (n: number): Msg => {
    const i = path[n];
    const s = slots[i];
    if (n === path.length - 1) return m('predict.walk.end', { end: endText(i, s) });
    const wrap = i === cap - 1 ? m('predict.walk.wrap', { last: cap - 1 }) : '';
    const here = s === TOMB ? m('predict.walk.tomb', { i, wrap }) : m('predict.walk.taken', { i, v: s as number, wrap });
    return m('predict.walk.cons', { head: here, tail: part(n + 1) });
  };
  return part(0);
}

function bucketRound(rand: () => number, cap: number): Round {
  const neg = rand() < 0.35;
  const key = neg ? -(1 + Math.floor(rand() * 20)) : Math.floor(rand() * 41);
  const correct = bucketOf(key, cap);
  const rem = key % cap;
  const why = rem < 0
    ? m('predict.why.neg', { key, cap, rem, correct })
    : neg
      ? m('predict.why.negZero', { key, cap })
      : m('predict.why.div', { div: divText(key, cap), correct });
  return {
    kind: 'bucket', key, slots: genTable(cap, rand),
    prompt: m(neg ? 'predict.bucketNeg' : 'predict.bucket', { key, max: cap - 1 }),
    correct, why, ok: why,
  };
}

function placeRound(rand: () => number, cap: number): Round {
  for (let tries = 0; tries < 300; tries++) {
    const slots = genTable(cap, rand);
    const key = clashKey(slots, rand);
    const h = bucketOf(key, cap);
    if (typeof slots[h] !== 'number') continue;
    const { path, at } = probePlace(slots, key);
    if (at < 0) continue;
    const why = m('predict.why.place', { key, h, walk: walkMsg(slots, path, (i, s) => m(s === TOMB ? 'predict.walk.putTomb' : 'predict.walk.putEmpty', { i })) });
    return { kind: 'place', key, slots, prompt: m('predict.place', { key }), correct: at, why, ok: why };
  }
  return fixedRound('place');
}

function findRound(rand: () => number, cap: number): Round {
  for (let tries = 0; tries < 300; tries++) {
    const slots = genTable(cap, rand);
    const present = rand() < 0.5;
    const key = present ? tableKey(slots, rand) : clashKey(slots, rand);
    const { path, at } = probeFind(slots, key);
    if (path.length < 2) continue;
    const correct = path[path.length - 1];
    const why = m('predict.why.find', {
      key, h: bucketOf(key, cap),
      walk: walkMsg(slots, path, (i, s) => m(s === null ? 'predict.walk.findNone' : 'predict.walk.findHit', { i, key })),
    });
    return { kind: 'find', key, slots, prompt: m('predict.find', { key }), correct, why, ok: m(at >= 0 ? 'predict.ok.found' : 'predict.ok.none', { why }) };
  }
  return fixedRound('find');
}

/** 随机不到合适的表时的固定题：表里是 8（1 号桶没有，8 挤到 2 号）、1、15 等 */
export function fixedRound(kind: 'place' | 'find'): Round {
  let slots = emptySlots();
  for (const k of [1, 8, 15]) slots = probePut(slots, k)!;
  if (kind === 'place') {
    const path = probePlace(slots, 22).path;
    const why = m('predict.why.place', { key: 22, h: 1, walk: walkMsg(slots, path, (i) => m('predict.walk.putEmpty', { i })) });
    return { kind, key: 22, slots, prompt: m('predict.place', { key: 22 }), correct: 4, why, ok: why };
  }
  const why = m('predict.why.findFixed', { key: 29 });
  return { kind, key: 29, slots, prompt: m('predict.find', { key: 29 }), correct: 4, why, ok: m('predict.ok.none', { why }) };
}

/** 猜下一步的题：三种题型轮流随机出，负数键和回绕都会出现 */
export const PREDICT_GOAL = 5;

export function rounds(n = 12, cap: number = KID_CAP, rand: () => number = Math.random): Round[] {
  const out: Round[] = [];
  for (let k = 0; k < n; k++) {
    const kind = Math.floor(rand() * 3);
    out.push(kind === 0 ? bucketRound(rand, cap) : kind === 1 ? placeRound(rand, cap) : findRound(rand, cap));
  }
  return out;
}

/** 猜下一步画面的样子：一排书架；hit 是亮起的正确书架，ring 是描边的书架 */
export interface PredictView {
  slots: Slot[];
  hit: number | null;
  ring: number | null;
}

/** 一道题就是一问：点出那个桶。答错先亮出正确的书架，再继续；答对直接看结语（带 ✅） */
export function askRound(r: Round): Puzzle<PredictView, number> {
  const view: PredictView = { slots: r.slots, hit: null, ring: null };
  const shown: PredictView = { slots: r.slots, hit: r.correct, ring: null };
  return {
    chips: [['key', r.key]],
    asks: [{ view, prompt: r.prompt, kind: 'pick', answer: r.correct, why: r.why, reveal: { view: shown, prompt: r.prompt } }],
    end: { view: shown, prompt: r.ok },
    endRight: { view: { ...shown, ring: r.correct }, prompt: m('predict.right', { text: r.ok }) },
  };
}

const predictRules: PredictRules<PredictView, number> = {
  goal: PREDICT_GOAL,
  puzzle: (rand = Math.random) => askRound(rounds(1, KID_CAP, rand)[0]),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'tomb' | 'neg' | 'rehash';
  /** 输入说明 */
  input: Msg;
  /** 动画跑完以后的判定 */
  verdict: Msg;
}

const FIND_SNIPPET = [
  'fun find(slots: IntArray, key: Int): Int {',
  '    var i = Math.floorMod(key, slots.size)',
  '    repeat(slots.size) {',
  '        if (slots[i] == EMPTY) return -1',
  '        if (slots[i] == key) return i',
  '        i = (i + 1) % slots.size',
  '    }',
  '    return -1',
  '}',
  '',
];

export const BUGS: readonly Bug[] = [
  {
    id: 'tomb',
    title: m('bug.tomb.title'),
    code: [
      ...FIND_SNIPPET,
      'fun remove(slots: IntArray, key: Int): Boolean {',
      '    val i = find(slots, key)',
      '    if (i < 0) return false',
      '    slots[i] = EMPTY',
      '    return true',
      '}',
    ],
    wrongLine: 14,
    fixed: '    slots[i] = TOMB',
    input: m('bug.tomb.input'),
    expect: m('bug.tomb.expect'),
    explain: m('bug.tomb.explain'),
    verdict: m('bug.tomb.verdict'),
  },
  {
    id: 'neg',
    title: m('bug.neg.title'),
    code: [
      'fun put(slots: IntArray, key: Int): Boolean {',
      '    var i = key % slots.size',
      '    repeat(slots.size) {',
      '        if (slots[i] == EMPTY) {',
      '            slots[i] = key',
      '            return true',
      '        }',
      '        i = (i + 1) % slots.size',
      '    }',
      '    return false',
      '}',
    ],
    wrongLine: 2,
    fixed: '    var i = Math.floorMod(key, slots.size)',
    input: m('bug.neg.input'),
    expect: m('bug.neg.expect'),
    explain: m('bug.neg.explain'),
    verdict: m('bug.neg.verdict'),
  },
  {
    id: 'rehash',
    title: m('bug.rehash.title'),
    code: [
      ...FIND_SNIPPET,
      'fun grow(old: IntArray): IntArray {',
      '    val bigger = IntArray(old.size * 2) { EMPTY }',
      '    for (i in old.indices) {',
      '        if (old[i] != EMPTY) bigger[i] = old[i]',
      '    }',
      '    return bigger',
      '}',
    ],
    wrongLine: 14,
    fixed: '        if (old[i] != EMPTY) put(bigger, old[i])',
    input: m('bug.rehash.input'),
    expect: m('bug.rehash.expect'),
    explain: m('bug.rehash.explain'),
    verdict: m('bug.rehash.verdict'),
  },
];

export interface BugStep extends Step {
  slots: Slot[];
  i: number | null;
  /** 'running' 还在跑；'wrong' 跑完但结果不对；'crash' 下标越界 */
  outcome: 'running' | 'wrong' | 'crash';
  result: number | null;
}

/** 按有 bug 的代码一步步执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<BugStep> {
  const steps: BugStep[] = [];
  let slots: Slot[] = [];
  const push = (line: number, note: Msg, i: number | null, extra: Partial<BugStep> = {}) => {
    steps.push({ line, note, slots: [...slots], i, outcome: 'running', result: null, done: false, ...extra });
  };

  if (bug.id === 'tomb') {
    slots = probePut(probePut(emptySlots(), 1)!, 8)!;
    push(11, m('bug.tomb.note.start'), null);
    const at = probeFind(slots, 1).at;
    push(12, m('bug.tomb.note.find', { at }), at);
    slots[at] = null;
    push(14, m('bug.tomb.note.clear', { at }), at);
    push(2, m('bug.tomb.note.get', { b: bucketOf(8) }), bucketOf(8));
    const r = probeFind(slots, 8);
    push(4, m('bug.tomb.note.empty', { b: bucketOf(8) }), bucketOf(8), { outcome: 'wrong', result: r.at, done: true });
  } else if (bug.id === 'neg') {
    slots = probePut(emptySlots(), 15)!;
    push(1, m('bug.neg.note.start'), null);
    push(2, m('bug.neg.note.mod', { v: -3 % 7 }), -3);
    push(4, m('bug.neg.note.crash', { v: -3 % 7 }), -3, { outcome: 'crash', done: true });
  } else {
    slots = emptySlots(4);
    slots[1] = 5;
    slots[2] = 6;
    push(11, m('bug.rehash.note.start'), null);
    slots = emptySlots(8);
    push(12, m('bug.rehash.note.new'), null);
    slots[1] = 5;
    push(14, m('bug.rehash.note.copy5'), 1);
    slots[2] = 6;
    push(14, m('bug.rehash.note.copy6'), 2);
    push(2, m('bug.rehash.note.get', { b: bucketOf(5, 8) }), bucketOf(5, 8));
    push(4, m('bug.rehash.note.empty', { b: bucketOf(5, 8) }), bucketOf(5, 8), { outcome: 'wrong', result: -1, done: true });
  }
  return steps;
}

/** 找 bug 面板底部的判定；没播完是 null */
export function bugVerdict(step: BugStep, bug: Bug): Msg | null {
  return step.done ? bug.verdict : null;
}

const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { input: bug.input, expect: bug.expect }),
  vars: (s): Var[] => [['i', s.i ?? '—'], [m('var.cap'), s.slots.length]],
  verdict: bugVerdict,
};

/* ---------- 做：挑战 ---------- */

/** 挑战里可选的容量 */
export const CHALLENGE_CAPS = [5, 6, 7, 8, 9, 10, 11, 12, 13];
/** 过关：最高的一摞不超过这么多本 */
export const CHALLENGE_LIMIT = 2;
/** 键是某个数 m 的 1 到 8 倍；m 从这里挑 */
const CHALLENGE_STEPS = [6, 10, 12, 15, 20];

/** 挑战出题：8 本书，书号是 m、2m、…、8m（有规律的书号，容量选不好会全挤在一起） */
export function genChallenge(rand: () => number = Math.random): number[] {
  const step = CHALLENGE_STEPS[Math.floor(rand() * CHALLENGE_STEPS.length)];
  return Array.from({ length: 8 }, (_, k) => step * (k + 1));
}

/** 每个桶里挂几本书，最高一摞多高，把每本书都借一遍一共要看几本（一摞 c 本要看 1+2+…+c） */
export function chainStats(keys: readonly number[], cap: number) {
  const counts = Array.from({ length: cap }, () => 0);
  for (const k of keys) counts[bucketOf(k, cap)]++;
  return {
    counts,
    longest: Math.max(...counts),
    looks: counts.reduce((a, c) => a + (c * (c + 1)) / 2, 0),
  };
}

/** 挑战的操作：选一个书架数、再来一题 */
export type ChallengeAction = { type: 'cap'; c: number } | { type: 'fresh' };

export interface ChallengeState {
  keys: number[];
  /** 选的书架数；还没选是 null */
  cap: number | null;
  tries: number;
  won: boolean;
}

/** 当前选的书架数下，每个书架上几本书；没选是 null */
export function challengeStats(s: ChallengeState) {
  return s.cap === null ? null : chainStats(s.keys, s.cap);
}

const challengeStart = (rand?: Rand): ChallengeState => ({ keys: genChallenge(rand), cap: null, tries: 0, won: false });

/** 挑战：8 本书的书号是同一个数的 1 到 8 倍，选一个书架数，让最高的一摞不超过 2 本 */
export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeStart(rand) }),

  act(s, a, rand) {
    if (a.type === 'fresh') return s.won ? { state: challengeStart(rand) } : null;
    if (s.won) return null;
    const won = chainStats(s.keys, a.c).longest <= CHALLENGE_LIMIT;
    return { state: { ...s, cap: a.c, tries: s.tries + 1, won }, sound: won ? 'win' : 'wrong' };
  },

  clickable: (s) => !s.won,

  controls: (s) => (s.won ? [{ type: 'button', action: { type: 'fresh' }, label: m('chal.fresh'), look: 'small' }] : []),

  hud(s) {
    const st = challengeStats(s);
    const chips: Var[] = [[m('chal.tries'), m('chal.times', { n: s.tries })]];
    if (st) {
      chips.push([m('chal.longest'), m('chal.books', { n: st.longest })]);
      chips.push([m('chal.looks'), m('chal.books', { n: st.looks })]);
    }
    return { chips };
  },

  result(s) {
    const st = challengeStats(s);
    if (!s.won || !st) return null;
    return { title: m('chal.win', { tries: s.tries, cap: s.cap!, longest: st.longest }), body: m('chal.winBody') };
  },
};

/* ---------- 延伸：为什么快 ---------- */

/** 平均情况：顺序查找平均大约看一半；哈希查找（装得不满、分得匀）平均只看 1 到 2 个桶，这里按 2 画 */
export function compareRows() {
  return [10, 1000, 1000000].map((n) => ({
    label: n.toLocaleString('en-US'),
    unit: m('compare.books'),
    bars: [
      { name: m('compare.seq'), value: n / 2, tone: 'muted' as const, approx: true },
      { name: m('compare.hash'), value: 2, tone: 'accent' as const, approx: true },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { walk: walkRules, clash: clashRules, challenge: challengeRules },
};
