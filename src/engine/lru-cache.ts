import type { Step, Trace } from './types';

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
export function buildTrace(cap: number, ops: Op[], bug?: BugId): Trace<LruStep> {
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

  const push = (line: number, note: string, extra: Partial<LruStep> = {}) => {
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
      bad: false,
      ...extra,
    });
  };

  const touch = (n: SimNode, remLine: number, addLine: number) => {
    hand = n;
    remove(n);
    push(remLine, 'remove(n)：把节点 ' + n.key + ' 从链表上摘下来（它前后两个邻居直接连在一起）。');
    hand = null;
    addLast(n);
    push(addLine, 'addLast(n)：把节点 ' + n.key + ' 接到 tail 前面，它现在是最近用过的。');
  };

  ops.forEach((op, i) => {
    opIdx = i;
    label = opText(op);
    focus = op.k;
    evicted = null;
    ret = null;
    hand = null;
    const r = refApply(ref, cap, op);
    const finish = (line: number, note: string) => {
      const list = walk();
      const same = list.length === r.list.length && list.every((x, j) => x.k === r.list[j].k && x.v === r.list[j].v);
      const mapOk = map.size === list.length && list.every((x) => map.has(x.k));
      const retOk = op.t !== 'get' || ret === r.ret;
      push(line, note, { opEnd: true, bad: !(same && mapOk && retOk) });
      ref = r.list;
    };

    if (op.t === 'get') {
      push(L.getFun, '调用 ' + label + '。');
      const n = map.get(op.k);
      if (!n) {
        ret = -1;
        finish(L.getFind, 'map[' + op.k + '] 没有，直接 return -1。哈希表一步就知道有没有。');
        return;
      }
      push(L.getFind, 'map[' + op.k + '] 找到节点（值 ' + n.value + '），不用一个个找，O(1)。');
      if (bug === 'no-touch') {
        push(L.getTouch, '（bug 版本）这一行只是注释，什么也没做：节点 ' + op.k + ' 还留在原来的位置。');
      } else {
        push(L.getTouch, 'touch(n)：用过了，要挪到最右边。');
        touch(n, L.touchRemove, L.touchAdd);
      }
      ret = n.value;
      finish(L.getReturn, 'return ' + n.value + '。');
      return;
    }

    push(L.putFun, '调用 ' + label + '。');
    const old = map.get(op.k);
    push(L.putFind, old ? 'map[' + op.k + '] 已经有了。' : 'map[' + op.k + '] 没有，是新 key。');
    let returned = false;
    if (old) {
      push(L.putIf, 'old 不是 null：key 已存在，只需要更新，不用新建。');
      old.value = op.v;
      push(L.putSet, 'old.value = ' + op.v + '：更新值。');
      push(L.putTouch, 'touch(old)：更新也算用过，要挪到最右边。');
      touch(old, L.touchRemove, L.touchAdd);
      if (bug !== 'dup') {
        finish(L.putReturn, 'return：更新完毕，不会淘汰任何人。');
        returned = true;
      } else {
        push(L.putReturn, '（bug 版本）这一行只是注释，没有 return：代码继续往下走，当成新 key 处理！');
      }
    } else {
      push(L.putIf, 'old 是 null：新 key，往下走。');
    }
    if (returned) return;

    const full = map.size === cap;
    push(L.putFull, 'map.size = ' + map.size + (full ? ' 等于 ' : ' 不等于 ') + 'capacity = ' + cap + (full ? '：满了，必须先淘汰一个。' : '：还有空位。'));
    if (full) {
      const eldest = head.next!;
      focus = eldest.key;
      push(L.putEldest, 'head.next 就是最久没用的：节点 ' + eldest.key + '。');
      hand = eldest;
      remove(eldest);
      push(L.putRemove, 'remove(eldest)：把它从链表上摘下来。');
      if (bug === 'ghost') {
        map.delete(op.k);
        evicted = eldest.key;
        hand = null;
        push(L.putMapRemove, '（bug 版本）map.remove(key) 删的是新来的 ' + op.k + '，它还不在 map 里，什么也没删。节点 ' + eldest.key + ' 虽然离开了链表，哈希表里还留着它！');
      } else {
        map.delete(eldest.key);
        evicted = eldest.key;
        hand = null;
        push(L.putMapRemove, 'map.remove(eldest.key)：哈希表里也要删掉 ' + eldest.key + '，两边都删才算淘汰。');
      }
      focus = op.k;
    }
    const n = mk(op.k, op.v);
    push(L.putNew, '新建节点 ' + op.k + '，值 ' + op.v + '。');
    map.set(op.k, n);
    push(L.putMap, 'map[' + op.k + '] = n：哈希表记下它。');
    addLast(n);
    finish(L.putAdd, 'addLast(n)：接到最右边，' + label + ' 完成。');
  });

  if (steps.length) steps[steps.length - 1].done = true;
  return steps;
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

export interface Quiz {
  /** 操作之前链表的样子 */
  before: Item[];
  /** 操作 */
  op: Op;
  prompt: string;
  options: string[];
  correct: number;
  explain: string;
}

const orderText = (l: Item[]) => (l.length ? l.map((x) => x.k).join(' → ') : '（空）');

function shuffleIn(correct: string, wrong: string[], rand: () => number): { options: string[]; correct: number } {
  const uniq = [...new Set(wrong.filter((w) => w !== correct))];
  const at = Math.floor(rand() * (uniq.length + 1));
  const options = [...uniq.slice(0, at), correct, ...uniq.slice(at)];
  return { options, correct: at };
}

/** 对每个操作出一道题，题目和选项都由标准答案生成 */
export function quizzes(cap: number, ops: Op[], rand: () => number = Math.random): Quiz[] {
  const out: Quiz[] = [];
  let list: Item[] = [];
  for (const op of ops) {
    const r = refApply(list, cap, op);
    const label = opText(op);
    const exists = list.some((x) => x.k === op.k);
    let q: Omit<Quiz, 'before' | 'op'>;
    if (op.t === 'get' && !exists) {
      const s = shuffleIn('返回 -1', ['返回 ' + (op.k + 1)], rand);
      q = { prompt: label + ' 返回什么？', ...s, explain: 'map 里没有 ' + op.k + '，直接 return -1，链表不动。' };
    } else if (op.t === 'get') {
      const wrongOld = [op.k, ...list.filter((x) => x.k !== op.k).map((x) => x.k)];
      const correct = orderText(r.list);
      const s = shuffleIn(correct, [orderText(list), wrongOld.join(' → '), orderText([...r.list, { k: op.k + 1, v: 0 }])], rand);
      q = {
        prompt: label + ' 命中了。之后链表从最久到最近的顺序是？',
        ...s,
        explain: '命中就是用过了：' + op.k + ' 挪到最右边（最近用过），其他的顺序不变。',
      };
    } else if (exists && list.length === cap) {
      const s = shuffleIn('没人被淘汰', list.map((x) => '淘汰 ' + x.k), rand);
      q = {
        prompt: '桌子满了。' + label + '，key 已经存在，会淘汰谁？',
        ...s,
        explain: op.k + ' 已经在里面了，只更新值并挪到最右边，一个都不用淘汰。',
      };
    } else if (!exists && list.length === cap) {
      const s = shuffleIn('淘汰 ' + list[0].k, [...list.slice(1).map((x) => '淘汰 ' + x.k), '没人被淘汰'], rand);
      q = {
        prompt: '满了。' + label + '，key 是新的，会淘汰谁？',
        ...s,
        explain: '淘汰最久没用的，也就是链表最左边的 ' + list[0].k + '。新来的 ' + op.k + ' 放到最右边。',
      };
    } else {
      const correct = orderText(r.list);
      const wrong = [orderText([{ k: op.k, v: op.t === 'put' ? op.v : 0 }, ...list.filter((x) => x.k !== op.k)])];
      if (exists) wrong.push(orderText(list));
      wrong.push(orderText([...r.list.slice().reverse()]), orderText([...r.list, { k: op.k + 1, v: 0 }]));
      const s = shuffleIn(correct, wrong, rand);
      q = {
        prompt: label + ' 之后，链表从最久到最近的顺序是？',
        ...s,
        explain: exists
          ? op.k + ' 已存在：更新值，并挪到最右边。'
          : '还有空位，不用淘汰。新来的 ' + op.k + ' 放到最右边（最近用过）。',
      };
    }
    out.push({ before: list, op, ...q });
    list = r.list;
  }
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug {
  id: BugId;
  title: string;
  /** 有 bug 的 Kotlin 代码，和 CODE 只差一行 */
  code: string[];
  /** 出错的那一行（从 1 开始） */
  wrongLine: number;
  /** 改对之后的那一行 */
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
    id: 'no-touch',
    title: '刚用过的书，却被先淘汰了',
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
    expect: '容量 2。get(1) 刚用过 1，put(3) 应该淘汰 2，最后 get(1) 应该返回 1',
    explain: 'get 命中以后忘了 touch，链表顺序没变，1 还是最左边（最久没用）。put(3) 就把刚用过的 1 淘汰了。没有这一步，LRU 退化成了 FIFO。',
  },
  {
    id: 'ghost',
    title: '明明淘汰了，却还能 get 到',
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
    expect: '容量 2。put(3) 淘汰了 1，之后 get(1) 应该返回 -1',
    explain: '淘汰要两边一起删：链表里摘掉，哈希表里也要删被淘汰的 eldest.key。这里删的是新来的 key（根本不在 map 里），哈希表里留下了 1 的「幽灵」：get(1) 还能查到，还把它接回了链表，缓存里有了 3 个，超过容量。',
  },
  {
    id: 'dup',
    title: 'put 同一个 key，书反而少了一本',
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
    expect: '容量 2。put(1, 10) 只是更新 1 的值，get(2) 应该返回 2',
    explain: '更新完忘了 return，代码接着往下走，把 1 当成新 key 再插一遍：缓存已满，于是淘汰了无辜的 2，链表里还有了两个 1。',
  },
];

export interface BugRun {
  steps: Trace<LruStep>;
  /** 最后判定出错的那句话 */
  verdict: string;
}

export function runBug(bug: Bug): BugRun {
  const steps = buildTrace(bug.cap, bug.ops, bug.id);
  const expected = refRun(bug.cap, bug.ops);
  const last = steps[steps.length - 1];
  const gets = bug.ops.map((o, i) => ({ o, i })).filter((x) => x.o.t === 'get');
  let verdict = '';
  for (const { o, i } of gets) {
    const end = steps.find((s) => s.op === i && s.opEnd)!;
    if (end.ret !== expected.rets[i]) {
      verdict = '❌ ' + opText(o) + ' 返回了 ' + end.ret + '，应该是 ' + expected.rets[i];
      break;
    }
  }
  if (!verdict && last.bad) verdict = '❌ 缓存的内容和正确的 LRU 对不上';
  return { steps, verdict };
}

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
