import { m } from '../core/i18n';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

/* ---------- 看、玩：书桌上的书 ---------- */

/** 书桌最多放 4 本书 */
export const KID_CAP = 4;

/** 书的图案，下标就是书的编号（从 1 开始） */
export const BOOK_EMOJI = ['', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📖'];

export type Policy = 'lru' | 'fifo';

export interface Access {
  /** 要借的书 */
  book: number;
  /** 桌上本来就有吗 */
  hit: boolean;
  /** 因为桌子满了放回书架的书，没有就是 null */
  evicted: number | null;
  /** 借之前桌上的书，从左（最久没碰）到右（刚碰过） */
  before: number[];
  /** 借之后桌上的书 */
  desk: number[];
}

/**
 * 按顺序借书。lru：每碰一本就挪到最右边，满了放回最左边；
 * fifo：不管碰不碰，满了放回最先上桌的那本（只有上桌顺序，没有「碰」）。
 */
export function simulate(seq: number[], cap: number, policy: Policy = 'lru'): Access[] {
  const out: Access[] = [];
  let desk: number[] = [];
  for (const book of seq) {
    const before = desk.slice();
    const hit = desk.includes(book);
    let evicted: number | null = null;
    if (hit) {
      if (policy === 'lru') desk = [...desk.filter((b) => b !== book), book];
    } else {
      if (desk.length === cap) evicted = desk[0];
      desk = [...(evicted === null ? desk : desk.slice(1)), book];
    }
    out.push({ book, hit, evicted, before, desk: desk.slice() });
  }
  return out;
}

export function countHits(seq: number[], cap: number, policy: Policy = 'lru'): number {
  return simulate(seq, cap, policy).filter((a) => a.hit).length;
}

/** 「看」的借书顺序：第 5 本书一出现，桌子就放不下了 */
export const LOOK_SEQ = [1, 2, 3, 4, 2, 5, 3, 1];

/** 「看」里一共有几本书 */
export const LOOK_BOOKS = Math.max(...LOOK_SEQ);

/** 「看」的一页：台词，加上书桌的画面 */
export interface BookFrame extends LookFrame {
  /** 桌上的书，从最久没碰（左）到刚碰过（右） */
  desk: number[];
  /** 一闪一闪：刚被借的书 */
  pulse: number | null;
  /** 透光：要被放回书架的书 */
  glow: number | null;
  /** 到这一页为止跑了几趟书架 */
  trips: number;
}

/** 书的名字，如「📕1 号」：图案加编号，是数据不是文案 */
const bookName = (b: number) => BOOK_EMOJI[b] + b + ' 号';

/** 「看」的全部页：真的跑一遍 simulate，台词和画面都由结果生成 */
export function lookFrames(seq: number[] = LOOK_SEQ, cap: number = KID_CAP): BookFrame[] {
  const acc = simulate(seq, cap);
  const out: BookFrame[] = [];
  let tripCount = 0;
  const add = (say: Msg, desk: number[], extra: Partial<BookFrame> = {}) =>
    out.push({ say, desk, pulse: null, glow: null, trips: tripCount, ...extra });

  add(m('look.start', { cap }), []);
  tripCount = cap;
  add(m('look.first', { books: acc.slice(0, cap).map((a) => a.book).join(' ') }), acc[cap - 1].desk);

  let firstHit = true;
  let firstMiss = true;
  for (const a of acc.slice(cap)) {
    if (a.hit) {
      if (firstHit) {
        add(m('look.hit1', { book: bookName(a.book) }), a.before, { pulse: a.book });
        add(m('look.hit1b'), a.desk);
        firstHit = false;
      } else {
        add(m('look.hit', { book: bookName(a.book) }), a.desk);
      }
      continue;
    }
    tripCount++;
    if (firstMiss) {
      add(m('look.miss1', { book: bookName(a.book) }), a.before, { pulse: a.book });
      add(m('look.full1', { ev: bookName(a.evicted!) }), a.before, { glow: a.evicted });
      add(m('look.sit', { book: bookName(a.book) }), a.desk);
      firstMiss = false;
    } else {
      add(m('look.miss', { book: bookName(a.book), ev: bookName(a.evicted!) }), a.before, { glow: a.evicted, pulse: a.book });
      add(m('look.sit', { book: bookName(a.book) }), a.desk);
    }
  }
  add(m('look.end', { n: tripCount }), acc[acc.length - 1].desk);
  return out;
}

const lookRules: LookRules<null, BookFrame> = {
  first: null,
  next: () => null,
  frames: () => lookFrames(),
};

/** 玩法一：4 次要放回书架。第 2 次放回的是 3 号而不是 2 号，因为 2 号刚被翻过 */
export const EVICT_SEQ = [1, 2, 3, 4, 5, 2, 6, 3, 5, 1];
export const EVICT_BOOKS = 6;

/** 玩法二：猜每一本在不在桌上，数跑几趟书架 */
export const TRIP_SEQ = [1, 2, 3, 1, 2, 4, 1, 5, 2, 3];
export const TRIP_CAP = 3;
export const TRIP_BIG_CAP = 5;
export const TRIP_BOOKS = 5;

export type EvictVerdict = 'right' | 'oldest-is-left' | 'just-touched' | 'other';

/** 玩法一：孩子点了 tapped，要放回的应该是桌上最左边（最久没碰）的那本 */
export function judgeEvict(desk: number[], tapped: number): EvictVerdict {
  if (tapped === desk[0]) return 'right';
  if (tapped === desk[desk.length - 1]) return 'just-touched';
  return 'other';
}

/** 玩法一的星星：一次没点错三颗，错两次以内两颗，其余一颗 */
export function playStars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}

/** 玩法二：书桌换大以后少跑几趟 */
export function trips(seq: number[], cap: number): number {
  return simulate(seq, cap).filter((a) => !a.hit).length;
}

/* ---------- 玩法一：当管理员（GameRules） ---------- */

const EVICT_ACC = simulate(EVICT_SEQ, KID_CAP);

export interface EvictGame {
  /** 现在在借第几本 */
  i: number;
  desk: number[];
  /** fetch：把要的书拿上桌（或翻一翻）；evict：桌子满了，挑一本放回书架；done：借完了 */
  phase: 'fetch' | 'evict' | 'done';
  mistakes: number;
  /** 已经放回对的次数 */
  evicted: number;
  /** 透光提示：桌上最久没碰的那本 */
  glow: number | null;
  /** 点错的书摇一下，格式 [书, 计数] */
  shake: [number, number] | null;
}

export type EvictAction = { type: 'desk'; book: number } | { type: 'shelf'; book: number } | { type: 'again' };

/** 现在要借的这一次（借完以后停在最后一次） */
export const evictAccess = (g: EvictGame): Access => EVICT_ACC[Math.min(g.i, EVICT_ACC.length - 1)];
/** 每一本的借书记录，画面画进度条用 */
export const EVICT_BOOKS_SEQ = EVICT_ACC.map((a) => a.book);

/** 刻度「最久没碰 ←→ 刚碰过」：点错过一次，或已经放回对了两次以后才出现 */
export const evictRuler = (g: EvictGame) => g.mistakes > 0 || g.evicted >= 2;

/** 第 i 本要借时的台词和阶段 */
function askEvict(i: number): { phase: 'fetch' | 'evict'; say: Msg } {
  const a = EVICT_ACC[i];
  const book = bookName(a.book);
  if (a.hit) return { phase: 'fetch', say: m('evict.ask.hit', { book }) };
  if (a.evicted !== null) return { phase: 'evict', say: m('evict.ask.full', { book }) };
  return { phase: 'fetch', say: m('evict.ask.shelf', { book }) };
}

function startEvict(): { state: EvictGame; say: Msg } {
  const a = askEvict(0);
  return { state: { i: 0, desk: [], phase: a.phase, mistakes: 0, evicted: 0, glow: null, shake: null }, say: a.say };
}

/** 借好了这一本：桌子换成借之后的样子，进入下一本（或借完）。prefix 是这一步的结果，接在下一句前面 */
function advanceEvict(g: EvictGame, prefix: Msg): { state: EvictGame; say: Msg; sound: 'right' | 'win' } {
  const a = evictAccess(g);
  const desk = a.desk;
  if (g.i >= EVICT_ACC.length - 1) {
    return { state: { ...g, desk, phase: 'done', glow: null }, say: m('evict.join', { a: prefix, b: m('evict.done') }), sound: 'win' };
  }
  const next = askEvict(g.i + 1);
  return { state: { ...g, desk, i: g.i + 1, phase: next.phase, glow: null }, say: m('evict.join', { a: prefix, b: next.say }), sound: 'right' };
}

export const evictRules: GameRules<EvictGame, EvictAction> = {
  start: () => startEvict(),
  act(g, a) {
    if (a.type === 'again') return g.phase === 'done' ? startEvict() : null;
    if (g.phase === 'done') return null;
    const cur = evictAccess(g);
    const book = bookName(cur.book);
    const wiggle = (extra: Partial<EvictGame>, say: Msg) => ({
      state: { ...g, ...extra, shake: [a.book, (g.shake?.[1] ?? 0) + 1] as [number, number] },
      say,
      sound: 'wrong' as const,
    });
    if (g.phase === 'fetch') {
      if (cur.hit && a.type === 'desk' && a.book === cur.book) return advanceEvict(g, m('evict.say.hit', { book }));
      if (!cur.hit && a.type === 'shelf' && a.book === cur.book) return advanceEvict(g, m('evict.say.shelf', { book }));
      // 点错了书：不扣分，晃一下，提示一闪一闪的那本
      return wiggle({}, m('evict.say.want', { book }));
    }
    if (a.type !== 'desk') return null;
    const v = judgeEvict(g.desk, a.book);
    if (v === 'right') {
      const out = advanceEvict({ ...g, evicted: g.evicted + 1 }, m('evict.say.evict', { ev: bookName(cur.evicted!), book }));
      return out;
    }
    // 点错了要放回的书：透出桌上最久没碰的那本
    return wiggle({ mistakes: g.mistakes + 1, glow: g.desk[0] }, m(v === 'just-touched' ? 'evict.say.touched' : 'evict.say.again'));
  },
  clickable: (g) => g.phase !== 'done',
  controls: (g): Control<EvictAction>[] =>
    g.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('again'), look: 'primary' }] : [],
  result: (g) => {
    if (g.phase !== 'done') return null;
    const stars = playStars(g.mistakes);
    return { stars, art: { scene: 'EvictDone', props: { retry: stars < 3 } } };
  },
};

/* ---------- 玩法二：猜猜去几趟书架（GameRules） ---------- */

export interface TripsGame {
  /** 书桌放得下几本：小书桌或大书桌 */
  cap: number;
  /** 现在在借第几本 */
  i: number;
  desk: number[];
  /** 已经去了几趟书架 */
  count: number;
  /** 一闪一闪：其实在桌上的那本 */
  pulse: number | null;
  /** 猜错的那个按钮晃一下，格式 [哪个, 第几次]，猜对了清掉 */
  wrong: ['hit' | 'miss', number] | null;
  /** 小书桌借完时的趟数，拿来和大书桌比 */
  small: number | null;
}

export type TripsAction = { type: 'guess'; g: 'hit' | 'miss' } | { type: 'start'; cap: number };

const tripsAcc = (cap: number) => simulate(TRIP_SEQ, cap);
export const tripsDone = (g: TripsGame) => g.i >= TRIP_SEQ.length;
export const tripsSaved = (g: TripsGame) => (g.small === null ? 0 : g.small - g.count);

function startTrips(cap: number, small: number | null, wrong: TripsGame['wrong']): { state: TripsGame; say: Msg } {
  return {
    state: { cap, i: 0, desk: [], count: 0, pulse: null, wrong, small },
    say: m('trips.say.start', { book: bookName(TRIP_SEQ[0]) }),
  };
}

export const tripsRules: GameRules<TripsGame, TripsAction> = {
  start: () => startTrips(TRIP_CAP, null, null),
  act(g, a) {
    if (a.type === 'start') return startTrips(a.cap, g.small, g.wrong);
    if (tripsDone(g)) return null;
    const cur = tripsAcc(g.cap)[g.i];
    if ((a.g === 'hit') === cur.hit) {
      const i = g.i + 1;
      const count = cur.hit ? g.count : g.count + 1;
      const done = i >= TRIP_SEQ.length;
      const state: TripsGame = { ...g, i, desk: cur.desk, count, pulse: null, wrong: null, small: done && g.cap === TRIP_CAP ? count : g.small };
      const book = bookName(cur.book);
      return {
        state,
        say: done ? m('trips.say.done') : m(cur.hit ? 'trips.say.hit' : 'trips.say.miss', { book, next: bookName(TRIP_SEQ[i]) }),
        sound: done ? 'win' : 'right',
      };
    }
    // 猜错不扣分：被猜错的按钮晃一下；书其实在桌上时它一闪一闪，其实不在时提醒再数数桌上的书
    const wrong: TripsGame['wrong'] = [a.g, (g.wrong?.[1] ?? 0) + 1];
    return {
      state: { ...g, wrong, pulse: cur.hit ? cur.book : null },
      say: cur.hit ? m('trips.say.look') : m('trips.say.count', { book: bookName(cur.book) }),
      sound: 'wrong',
    };
  },
  clickable: (g) => !tripsDone(g),
  controls: (g): Control<TripsAction>[] => {
    if (!tripsDone(g)) return [];
    const small = g.cap === TRIP_CAP;
    const out: Control<TripsAction>[] = [];
    if (small) out.push({ type: 'button', action: { type: 'start', cap: TRIP_BIG_CAP }, label: m('trips.big'), look: 'primary' });
    out.push({ type: 'button', action: { type: 'start', cap: TRIP_CAP }, label: m('trips.small'), look: small ? undefined : 'primary' });
    return out;
  },
  result: (g) => (tripsDone(g) ? { art: { scene: 'TripsDone', props: { count: g.count, big: g.cap !== TRIP_CAP, saved: tripsSaved(g), hasSmall: g.small !== null } } } : null),
};

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'class LRUCache(private val capacity: Int) {',
  '    private class Node(val key: Int, var value: Int) {',
  '        var prev: Node? = null',
  '        var next: Node? = null',
  '    }',
  '',
  '    private val map = HashMap<Int, Node>()',
  '    private val head = Node(0, 0) // 哨兵：head.next 是最久没用的',
  '    private val tail = Node(0, 0) // 哨兵：tail.prev 是最近用过的',
  '    init { head.next = tail; tail.prev = head }',
  '',
  '    private fun remove(n: Node) {',
  '        n.prev!!.next = n.next',
  '        n.next!!.prev = n.prev',
  '    }',
  '',
  '    private fun addLast(n: Node) {',
  '        n.prev = tail.prev',
  '        n.next = tail',
  '        tail.prev!!.next = n',
  '        tail.prev = n',
  '    }',
  '',
  '    private fun touch(n: Node) { // 挪到最右边：刚用过',
  '        remove(n)',
  '        addLast(n)',
  '    }',
  '',
  '    fun get(key: Int): Int {',
  '        val n = map[key] ?: return -1',
  '        touch(n)',
  '        return n.value',
  '    }',
  '',
  '    fun put(key: Int, value: Int) {',
  '        val old = map[key]',
  '        if (old != null) {',
  '            old.value = value',
  '            touch(old)',
  '            return',
  '        }',
  '        if (map.size == capacity) {',
  '            val eldest = head.next!!',
  '            remove(eldest)',
  '            map.remove(eldest.key)',
  '        }',
  '        val n = Node(key, value)',
  '        map[key] = n',
  '        addLast(n)',
  '    }',
  '}',
];

/** CODE 里各个位置的行号（从 1 开始），测试会检查它们和 CODE 一致 */
export const L = {
  touchRemove: 25,
  touchAdd: 26,
  getFun: 29,
  getFind: 30,
  getTouch: 31,
  getReturn: 32,
  putFun: 35,
  putFind: 36,
  putIf: 37,
  putSet: 38,
  putTouch: 39,
  putReturn: 40,
  putFull: 42,
  putEldest: 43,
  putRemove: 44,
  putMapRemove: 45,
  putNew: 47,
  putMap: 48,
  putAdd: 49,
} as const;

export type Op = { t: 'put'; k: number; v: number } | { t: 'get'; k: number };

export const opText = (op: Op) => (op.t === 'put' ? 'put(' + op.k + ', ' + op.v + ')' : 'get(' + op.k + ')');

export interface Item {
  k: number;
  v: number;
}

export interface LruStep extends Step {
  /** 第几个操作 */
  op: number;
  /** 这个操作的写法，如 put(3, 3) */
  opLabel: string;
  /** 链表，从最久没用（左）到最近用过（右） */
  list: Item[];
  /** 哈希表里有哪些 key */
  mapKeys: number[];
  /** 手里拿着的、暂时不在链表上的节点 */
  hand: Item | null;
  /** 正在处理的 key */
  focus: number | null;
  /** 刚被淘汰的 key */
  evicted: number | null;
  /** 这个操作的返回值（get 才有），还没算出来是 null */
  ret: number | null;
  /** 这个操作的最后一步 */
  opEnd: boolean;
  /** 到这一步为止，已经做完的 get 的返回值（下标是第几个操作） */
  rets: Record<number, number>;
  /** 操作结束时，和正确的 LRU 对不上（只会出现在 bug 版本里） */
  bad: boolean;
}

/* 正确的 LRU，用最笨的数组写，当作标准答案 */
export interface RefResult {
  ret: number | null;
  evicted: number | null;
  list: Item[];
}

export function refApply(list: Item[], cap: number, op: Op): RefResult {
  const idx = list.findIndex((x) => x.k === op.k);
  if (op.t === 'get') {
    if (idx < 0) return { ret: -1, evicted: null, list };
    return { ret: list[idx].v, evicted: null, list: [...list.slice(0, idx), ...list.slice(idx + 1), list[idx]] };
  }
  if (idx >= 0) {
    return { ret: null, evicted: null, list: [...list.slice(0, idx), ...list.slice(idx + 1), { k: op.k, v: op.v }] };
  }
  const full = list.length === cap;
  return {
    ret: null,
    evicted: full ? list[0].k : null,
    list: [...(full ? list.slice(1) : list), { k: op.k, v: op.v }],
  };
}

export function refRun(cap: number, ops: Op[]): { rets: (number | null)[]; list: Item[] } {
  let list: Item[] = [];
  const rets: (number | null)[] = [];
  for (const op of ops) {
    const r = refApply(list, cap, op);
    rets.push(r.ret);
    list = r.list;
  }
  return { rets, list };
}

export type BugId = 'no-touch' | 'ghost' | 'dup';

interface SimNode {
  key: number;
  value: number;
  prev: SimNode | null;
  next: SimNode | null;
}

/**
 * 一边按 CODE 真的执行（哈希表 + 双向链表），一边记录每一步。
 * bug 不为空时执行 bug 版本的代码，和 CODE 只差一行。
 * 因为是真的在改指针，bug 版本出的错是真的，不是画出来的。
 */
function traceOf(cap: number, ops: Op[], bug?: BugId): Trace<LruStep> {
  const steps: LruStep[] = [];
  const mk = (key: number, value: number): SimNode => ({ key, value, prev: null, next: null });
  const map = new Map<number, SimNode>();
  const head = mk(0, 0);
  const tail = mk(0, 0);
  head.next = tail;
  tail.prev = head;

  const walk = (): Item[] => {
    const out: Item[] = [];
    let n = head.next;
    // 指针被改坏时也不会死循环
    while (n && n !== tail && out.length < 20) {
      out.push({ k: n.key, v: n.value });
      n = n.next;
    }
    return out;
  };
  const remove = (n: SimNode) => {
    n.prev!.next = n.next;
    n.next!.prev = n.prev;
  };
  const addLast = (n: SimNode) => {
    n.prev = tail.prev;
    n.next = tail;
    tail.prev!.next = n;
    tail.prev = n;
  };

  let ref: Item[] = [];
  let opIdx = 0;
  let label = '';
  let hand: SimNode | null = null;
  let focus: number | null = null;
  let evicted: number | null = null;
  let ret: number | null = null;
  const rets: Record<number, number> = {};

  const push = (line: number, note: Msg, extra: Partial<LruStep> = {}) => {
    steps.push({
      line,
      note,
      done: false,
      op: opIdx,
      opLabel: label,
      list: walk(),
      mapKeys: [...map.keys()],
      hand: hand ? { k: hand.key, v: hand.value } : null,
      focus,
      evicted,
      ret,
      opEnd: false,
      rets: { ...rets },
      bad: false,
      ...extra,
    });
  };

  const touch = (n: SimNode, remLine: number, addLine: number) => {
    hand = n;
    remove(n);
    push(remLine, m('trace.note.remove', { k: n.key }));
    hand = null;
    addLast(n);
    push(addLine, m('trace.note.addLast', { k: n.key }));
  };

  ops.forEach((op, i) => {
    opIdx = i;
    label = opText(op);
    focus = op.k;
    evicted = null;
    ret = null;
    hand = null;
    const r = refApply(ref, cap, op);
    const finish = (line: number, note: Msg) => {
      const list = walk();
      const same = list.length === r.list.length && list.every((x, j) => x.k === r.list[j].k && x.v === r.list[j].v);
      const mapOk = map.size === list.length && list.every((x) => map.has(x.k));
      const retOk = op.t !== 'get' || ret === r.ret;
      if (op.t === 'get' && ret !== null) rets[i] = ret;
      push(line, note, { opEnd: true, bad: !(same && mapOk && retOk) });
      ref = r.list;
    };

    if (op.t === 'get') {
      push(L.getFun, m('trace.note.call', { op: label }));
      const n = map.get(op.k);
      if (!n) {
        ret = -1;
        finish(L.getFind, m('trace.note.getMiss', { k: op.k }));
        return;
      }
      push(L.getFind, m('trace.note.getFound', { k: op.k, v: n.value }));
      if (bug === 'no-touch') {
        push(L.getTouch, m('trace.note.getNoTouch', { k: op.k }));
      } else {
        push(L.getTouch, m('trace.note.getTouch'));
        touch(n, L.touchRemove, L.touchAdd);
      }
      ret = n.value;
      finish(L.getReturn, m('trace.note.getReturn', { v: n.value }));
      return;
    }

    push(L.putFun, m('trace.note.call', { op: label }));
    const old = map.get(op.k);
    push(L.putFind, m(old ? 'trace.note.putHas' : 'trace.note.putNone', { k: op.k }));
    let returned = false;
    if (old) {
      push(L.putIf, m('trace.note.putOld'));
      old.value = op.v;
      push(L.putSet, m('trace.note.putSet', { v: op.v }));
      push(L.putTouch, m('trace.note.putTouch'));
      touch(old, L.touchRemove, L.touchAdd);
      if (bug !== 'dup') {
        finish(L.putReturn, m('trace.note.putReturn'));
        returned = true;
      } else {
        push(L.putReturn, m('trace.note.putNoReturn'));
      }
    } else {
      push(L.putIf, m('trace.note.putNew'));
    }
    if (returned) return;

    const full = map.size === cap;
    push(L.putFull, m(full ? 'trace.note.putFull' : 'trace.note.putRoom', { size: map.size, cap }));
    if (full) {
      const eldest = head.next!;
      focus = eldest.key;
      push(L.putEldest, m('trace.note.putEldest', { k: eldest.key }));
      hand = eldest;
      remove(eldest);
      push(L.putRemove, m('trace.note.putRemove'));
      if (bug === 'ghost') {
        map.delete(op.k);
        evicted = eldest.key;
        hand = null;
        push(L.putMapRemove, m('trace.note.putGhost', { k: op.k, e: eldest.key }));
      } else {
        map.delete(eldest.key);
        evicted = eldest.key;
        hand = null;
        push(L.putMapRemove, m('trace.note.putMapRemove', { e: eldest.key }));
      }
      focus = op.k;
    }
    const n = mk(op.k, op.v);
    push(L.putNew, m('trace.note.putNewNode', { k: op.k, v: op.v }));
    map.set(op.k, n);
    push(L.putMap, m('trace.note.putMap', { k: op.k }));
    addLast(n);
    finish(L.putAdd, m('trace.note.putAdd', { op: label }));
  });

  if (steps.length) steps[steps.length - 1].done = true;
  return steps;
}

/** 正确版本的逐步执行 */
export function buildTrace(cap: number, ops: Op[]): Trace<LruStep> {
  return traceOf(cap, ops);
}

/* ---------- 做：猜下一步 ---------- */

export function genOps(n: number, keys: number, rand: () => number = Math.random): Op[] {
  const out: Op[] = [];
  for (let i = 0; i < n; i++) {
    const k = 1 + Math.floor(rand() * keys);
    out.push(rand() < 0.55 || i < 2 ? { t: 'put', k, v: 1 + Math.floor(rand() * 9) } : { t: 'get', k });
  }
  return out;
}

export interface Round {
  /** 操作之前链表的样子 */
  before: Item[];
  /** 操作 */
  op: Op;
  prompt: Msg;
  options: Msg[];
  correct: number;
  /** 答完（对或错）都显示的解释 */
  why: Msg;
}

/** 链表从最久到最近的顺序，如「1 → 2 → 3」（出题时链表不会是空的） */
const orderMsg = (l: Item[]) => m('predict.order', { s: l.map((x) => x.k).join(' → ') });

/** 把正确答案插进错误选项里的随机位置；文字一样的选项只留一个 */
function shuffleIn(correct: Msg, wrong: Msg[], rand: () => number): { options: Msg[]; correct: number } {
  const key = (x: Msg) => JSON.stringify(x);
  const seen = new Set([key(correct)]);
  const uniq = wrong.filter((w) => !seen.has(key(w)) && (seen.add(key(w)), true));
  const at = Math.floor(rand() * (uniq.length + 1));
  const options = [...uniq.slice(0, at), correct, ...uniq.slice(at)];
  return { options, correct: at };
}

/** 一局猜下一步：书桌容量 2 或 3，随机 14 个操作 */
export function genPredict(rand: () => number = Math.random): { cap: number; ops: Op[] } {
  const cap = 2 + Math.floor(rand() * 2);
  return { cap, ops: genOps(14, cap + 2, rand) };
}

/** 对每个操作出一道题，题目和选项都由标准答案生成 */
export function rounds(cap: number, ops: Op[], rand: () => number = Math.random): Round[] {
  const out: Round[] = [];
  let list: Item[] = [];
  for (const op of ops) {
    const r = refApply(list, cap, op);
    const label = opText(op);
    const exists = list.some((x) => x.k === op.k);
    let q: Omit<Round, 'before' | 'op'>;
    if (op.t === 'get' && !exists) {
      const s = shuffleIn(m('predict.ret', { v: -1 }), [m('predict.ret', { v: op.k + 1 })], rand);
      q = { prompt: m('predict.getRet', { op: label }), ...s, why: m('predict.why.getMiss', { k: op.k }) };
    } else if (op.t === 'get') {
      const wrongOld = [op.k, ...list.filter((x) => x.k !== op.k).map((x) => x.k)];
      const correct = orderMsg(r.list);
      const s = shuffleIn(correct, [orderMsg(list), m('predict.order', { s: wrongOld.join(' → ') }), orderMsg([...r.list, { k: op.k + 1, v: 0 }])], rand);
      q = { prompt: m('predict.getHit', { op: label }), ...s, why: m('predict.why.getHit', { k: op.k }) };
    } else if (exists && list.length === cap) {
      const s = shuffleIn(m('predict.noEvict'), list.map((x) => m('predict.evict', { k: x.k })), rand);
      q = { prompt: m('predict.putSame', { op: label }), ...s, why: m('predict.why.putSame', { k: op.k }) };
    } else if (!exists && list.length === cap) {
      const s = shuffleIn(m('predict.evict', { k: list[0].k }), [...list.slice(1).map((x) => m('predict.evict', { k: x.k })), m('predict.noEvict')], rand);
      q = { prompt: m('predict.putFull', { op: label }), ...s, why: m('predict.why.putFull', { eldest: list[0].k, k: op.k }) };
    } else {
      const correct = orderMsg(r.list);
      const wrong = [orderMsg([{ k: op.k, v: op.t === 'put' ? op.v : 0 }, ...list.filter((x) => x.k !== op.k)])];
      if (exists) wrong.push(orderMsg(list));
      wrong.push(orderMsg([...r.list.slice().reverse()]), orderMsg([...r.list, { k: op.k + 1, v: 0 }]));
      const s = shuffleIn(correct, wrong, rand);
      q = { prompt: m('predict.putAfter', { op: label }), ...s, why: m(exists ? 'predict.why.putUpdate' : 'predict.why.putNew', { k: op.k }) };
    }
    out.push({ before: list, op, ...q });
    list = r.list;
  }
  return out;
}

/** 猜下一步一问时画面的样子：操作之前的链表，和下一个操作。focus 是答完以后亮出来的那个 key */
export interface PredictView {
  before: Item[];
  cap: number;
  op: Op;
  focus: number | null;
}

/** 一道题：随机出一局的 14 题里的一题。答对答错都讲解，答完直接换下一题 */
function makePuzzle(rand?: Rand): Puzzle<PredictView, number> {
  const g = genPredict(rand);
  const list = rounds(g.cap, g.ops, rand);
  const q = list[Math.floor((rand ?? Math.random)() * list.length)];
  const view = (focus: number | null): PredictView => ({ before: q.before, cap: g.cap, op: q.op, focus });
  const reveal = { view: view(q.op.k), prompt: q.prompt };
  return {
    chips: [['capacity', g.cap]],
    endless: true,
    end: reveal,
    asks: [{
      view: view(null),
      prompt: q.prompt,
      kind: 'choose',
      answer: q.correct,
      options: q.options.map((label, value) => ({ value, label })),
      why: q.why,
      right: q.why,
      reveal,
      revealOnRight: true,
    }],
  };
}

export const predictRules: PredictRules<PredictView, number> = {
  goal: 5,
  puzzle: (rand) => makePuzzle(rand),
};

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: BugId;
  /** code 是有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  cap: number;
  ops: Op[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'no-touch',
    title: m('bug.no-touch.title'),
    code: variant(L.getTouch, '        // 找到了，直接返回'),
    wrongLine: L.getTouch,
    fixed: '        touch(n)',
    cap: 2,
    ops: [
      { t: 'put', k: 1, v: 1 },
      { t: 'put', k: 2, v: 2 },
      { t: 'get', k: 1 },
      { t: 'put', k: 3, v: 3 },
      { t: 'get', k: 1 },
    ],
    expect: m('bug.no-touch.expect'),
    explain: m('bug.no-touch.explain'),
  },
  {
    id: 'ghost',
    title: m('bug.ghost.title'),
    code: variant(L.putMapRemove, '            map.remove(key)'),
    wrongLine: L.putMapRemove,
    fixed: '            map.remove(eldest.key)',
    cap: 2,
    ops: [
      { t: 'put', k: 1, v: 1 },
      { t: 'put', k: 2, v: 2 },
      { t: 'put', k: 3, v: 3 },
      { t: 'get', k: 1 },
    ],
    expect: m('bug.ghost.expect'),
    explain: m('bug.ghost.explain'),
  },
  {
    id: 'dup',
    title: m('bug.dup.title'),
    code: variant(L.putReturn, '            // 更新完了'),
    wrongLine: L.putReturn,
    fixed: '            return',
    cap: 2,
    ops: [
      { t: 'put', k: 1, v: 1 },
      { t: 'put', k: 2, v: 2 },
      { t: 'put', k: 1, v: 10 },
      { t: 'get', k: 2 },
    ],
    expect: m('bug.dup.expect'),
    explain: m('bug.dup.explain'),
  },
];

/** 按 bug 版本的代码执行：真的在改指针和哈希表 */
export function runBug(bug: Bug): Trace<LruStep> {
  return traceOf(bug.cap, bug.ops, bug.id);
}

/** 找 bug 面板底部的判定：跑到最后一步才有，指出第一个返回值不对的 get；返回值都对就看内容；没跑完是 null */
export function bugVerdict(step: LruStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  const steps = runBug(bug);
  const expected = refRun(bug.cap, bug.ops);
  for (let i = 0; i < bug.ops.length; i++) {
    if (bug.ops[i].t !== 'get') continue;
    const end = steps.find((s) => s.op === i && s.opEnd)!;
    if (end.ret !== expected.rets[i]) return m('bug.verdict.ret', { op: opText(bug.ops[i]), got: end.ret ?? '—', want: expected.rets[i] ?? '—' });
  }
  return step.bad ? m('bug.verdict.bad') : null;
}

const bugRules: BugRules<Bug, LruStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.input', { expect: bug.expect }),
  vars: (s, bug): Var[] => [[m('trace.v.op'), s.opLabel], ['capacity', bug.cap], [m('trace.v.ret'), s.ret ?? '—']],
  verdict: bugVerdict,
};

/* ---------- 做：挑战 ---------- */

export const CHALLENGE_LEN = 20;
export const CHALLENGE_BOOKS = 6;

export interface Challenge {
  seq: number[];
  cap: number;
}

/** 有「常借的几本」的借书记录：大多数时候借熟悉的那几本，偶尔借一本新的 */
export function genChallenge(rand: () => number = Math.random): Challenge {
  const cap = rand() < 0.5 ? 3 : 4;
  const all = Array.from({ length: CHALLENGE_BOOKS }, (_, i) => i + 1);
  const hot = all.slice().sort(() => rand() - 0.5).slice(0, 3);
  const seq: number[] = [];
  for (let i = 0; i < CHALLENGE_LEN; i++) {
    seq.push(rand() < 0.7 ? hot[Math.floor(rand() * hot.length)] : all[Math.floor(rand() * all.length)]);
  }
  return { seq, cap };
}

export interface Verdict {
  lru: number;
  fifo: number;
  /** 猜的和 LRU 实际命中差多少 */
  diff: number;
}

export function judgeChallenge(c: Challenge, guess: number): Verdict {
  const lru = countHits(c.seq, c.cap, 'lru');
  return { lru, fifo: countHits(c.seq, c.cap, 'fifo'), diff: Math.abs(guess - lru) };
}

/** 猜中几题过关 */
export const CHALLENGE_GOAL = 3;

export interface ChallengeState {
  c: Challenge;
  /** 揭晓过了没有 */
  shown: boolean;
  /** 孩子猜的数（揭晓以后才有意义） */
  guess: number;
  /** 猜中（一次不差）的题数 */
  wins: number;
  /** 输入不对时的提醒，没有就是 null */
  msg: Msg | null;
  /** 每提交一次、换一题加一；输入框看到它变了就清空 */
  round: number;
}

export type ChallengeAction = { type: 'guess'; n: number } | { type: 'invalid' } | { type: 'next' };

const rangeMsg = () => m('chal.range', { max: CHALLENGE_LEN });

/** 揭晓以后的数据：LRU 和 FIFO 各命中几次、每本书是否命中，和一句比较 */
export function challengeReveal(s: ChallengeState) {
  const v = judgeChallenge(s.c, s.guess);
  const compare = v.lru > v.fifo ? m('chal.cmp.more', { n: v.lru - v.fifo }) : v.lru < v.fifo ? m('chal.cmp.less', { n: v.fifo - v.lru }) : m('chal.cmp.same');
  return {
    ...v,
    compare,
    lruRow: simulate(s.c.seq, s.c.cap, 'lru').map((a) => a.hit),
    fifoRow: simulate(s.c.seq, s.c.cap, 'fifo').map((a) => a.hit),
  };
}

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: { c: genChallenge(rand), shown: false, guess: 0, wins: 0, msg: null, round: 0 } }),
  act(s, a, rand) {
    if (a.type === 'next') {
      return s.shown ? { state: { ...s, c: genChallenge(rand), shown: false, msg: null, round: s.round + 1 } } : null;
    }
    if (s.shown) return null;
    if (a.type === 'invalid' || a.n < 0 || a.n > CHALLENGE_LEN) return { state: { ...s, msg: rangeMsg() } };
    const win = judgeChallenge(s.c, a.n).diff === 0;
    return { state: { ...s, shown: true, guess: a.n, wins: s.wins + (win ? 1 : 0), msg: null, round: s.round + 1 } };
  },
  clickable: () => false,
  controls: (s): Control<ChallengeAction>[] =>
    s.shown
      ? []
      : [{
        type: 'number', label: m('chal.guessLabel'), placeholder: m('chal.guessPlaceholder'), min: 0, max: CHALLENGE_LEN,
        submit: (n) => ({ type: 'guess', n }), submitLabel: m('chal.reveal'), invalid: { type: 'invalid' }, clearOn: s.round,
      }],
};

/* ---------- 做：逐步执行（TraceRules） ---------- */

/** 「经典例子」：容量 2，涵盖命中、更新、淘汰 */
export const CLASSIC: Op[] = [
  { t: 'put', k: 1, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 1 }, { t: 'put', k: 3, v: 3 },
  { t: 'get', k: 2 }, { t: 'put', k: 4, v: 4 }, { t: 'get', k: 1 }, { t: 'get', k: 3 }, { t: 'get', k: 4 },
];

export interface TraceInput {
  cap: number;
  ops: Op[];
}
export type TraceAction = { type: 'cap'; n: number } | { type: 'classic' } | { type: 'random' };

export const traceRules: TraceRules<TraceInput, LruStep, TraceAction> = {
  code: CODE,
  start: () => ({ cap: 2, ops: CLASSIC }),
  act(input, a, rand) {
    switch (a.type) {
      // 换容量：容量 2 回到经典例子，别的容量随机一串
      case 'cap': return a.n === input.cap ? input : { cap: a.n, ops: a.n === 2 ? CLASSIC : genOps(9, a.n + 2, rand) };
      case 'classic': return { cap: 2, ops: CLASSIC };
      case 'random': return { ...input, ops: genOps(9, input.cap + 2, rand) };
    }
  },
  controls: (input) => [
    {
      type: 'segmented', legend: m('trace.cap'), value: input.cap,
      options: [2, 3].map((n) => ({ value: n, label: m('num', { n }) })),
      choose: (v) => ({ type: 'cap', n: Number(v) }),
    },
    {
      type: 'group', legend: m('trace.ops'),
      items: [
        { type: 'button', action: { type: 'classic' }, label: m('trace.classic'), look: 'small' },
        { type: 'button', action: { type: 'random' }, label: m('trace.random'), look: 'small' },
      ],
    },
  ],
  trace: (input) => buildTrace(input.cap, input.ops),
  vars: (input, s): Var[] => [[m('trace.v.op'), s.opLabel], ['capacity', input.cap], ['map.size', s.mapKeys.length], [m('trace.v.ret'), s.ret ?? '—']],
};

/* ---------- 延伸：对比图 ---------- */

/** 「为什么要两个数据结构」的对比图：每次操作要「找一找」的次数，列表从头找最坏看遍所有 n 个，哈希表一步 */
export function compareRows() {
  return [
    { label: '100', unit: m('compare.books'), n: 100 },
    { label: '10,000', unit: m('compare.tenK'), n: 10_000 },
    { label: '1,000,000', unit: m('compare.million'), n: 1_000_000 },
  ].map((r) => ({
    label: r.label,
    unit: r.unit,
    bars: [
      { name: m('compare.listOnly'), value: r.n, tone: 'muted' as const },
      { name: m('compare.hashList'), value: 1, tone: 'accent' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { evict: evictRules, trips: tripsRules, challenge: challengeRules },
};
