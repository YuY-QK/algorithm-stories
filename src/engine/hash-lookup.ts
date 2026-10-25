import type { BugInfo, LookFrame, Step, Trace } from './types';

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
export function divText(key: number, cap: number = KID_CAP): string {
  const r = bucketOf(key, cap);
  return key + ' ÷ ' + cap + ' = ' + Math.floor(key / cap) + ' 余 ' + r;
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
  calc: string | null;
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
  const page = (say: string, o: Partial<LookPage> = {}): LookPage => ({ say, ...base, ...o });

  const find17 = probeFind(s3, 17);

  return [
    page('图书馆的墙上有 7 个书架，编号 0 到 6 📚'),
    page('笨办法：借 23 号书，从 0 号架开始一个架一个架翻 🐢', { piles: piles(c2), keeper: 0, book: 23 }),
    page('翻了 3 个架才找到。书一多，管理员就累坏啦 😮‍💨', { piles: piles(c2), keeper: bucketOf(23, cap), book: 23, hit: bucketOf(23, cap) }),
    page('新规矩：书号 ÷ 7，余数就是书架号 ✨'),
    page('10 号书：余 3，放 3 号架', { piles: piles(c1), keeper: bucketOf(10, cap), book: 10, calc: divText(10, cap) }),
    page('23 号书：余 2，放 2 号架', { piles: piles(c2), keeper: bucketOf(23, cap), book: 23, calc: divText(23, cap) }),
    page('借 23 号书：心里一算余 2，直接走到 2 号架 🚶', { piles: piles(c2), keeper: bucketOf(23, cap), book: 23, calc: divText(23, cap), hit: bucketOf(23, cap) }),
    page('31 号书：余 3，3 号架已经有书了，撞啦 💥', { piles: piles(c2), keeper: bucketOf(31, cap), book: 31, calc: divText(31, cap), clash: bucketOf(31, cap) }),
    page('办法一：叠起来 📚', { piles: piles(c3), keeper: bucketOf(31, cap), book: 31 }),
    page('借 31 号书：走到 3 号架，只在这一摞里找', { piles: piles(c3), keeper: bucketOf(31, cap), book: 31, hit: bucketOf(31, cap) }),
    page('办法二：放到旁边的空架 ➡️', { piles: slotPiles(s3), keeper: s3.indexOf(31), book: 31 }),
    page('借 17 号书：余 3。先看 3 号架：是 10，不是', { piles: slotPiles(s3), keeper: find17.path[0], book: 17, calc: divText(17, cap) }),
    page('再看 4 号架：是 31，不是', { piles: slotPiles(s3), keeper: find17.path[1], book: 17 }),
    page('5 号架是空的：没有 17 号书 ✋', { piles: slotPiles(s3), keeper: find17.path[2], book: 17, miss: find17.path[2] }),
    page('书太多就换更大的书架，每本书重新排一遍 🏛️', { piles: slotPiles(s3) }),
  ];
}

/* ---------- 玩：直接走到书架、撞了怎么办 ---------- */

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
export function restText(key: number, cap: number = KID_CAP): string {
  const laps = Math.floor(key / cap);
  const r = key % cap;
  return laps === 0
    ? '数 ' + key + ' 下，停在 ' + r + ' 号架'
    : '数 ' + key + ' 下：转了 ' + laps + ' 圈，再数 ' + r + ' 下，停在 ' + r + ' 号架';
}

/** 玩法二：按顺序放的五本书。10、23 不撞，31、17、9 都撞（31、17 撞 3 号架，9 撞 2 号架） */
export const CLASH_BOOKS = [10, 23, 31, 17, 9];
/** 放完以后要借的两本书 */
export const CLASH_FETCH = [17, 9];

export type ClashMode = 'chain' | 'probe';

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

/** 逐步执行：在一张线性探测表上做一次 get（find）、put 或 remove。line 对应 CODE 的行号 */
export function buildTrace(start: readonly Slot[], op: Op, key: number): Trace<HashLookupStep> {
  const cap = start.length;
  const slots: Slot[] = [...start];
  const steps: HashLookupStep[] = [];
  let looks = 0;
  const name = (s: Slot) => (s === null ? '空桶' : s === TOMB ? '墓碑' : String(s));
  const push = (line: number, note: string, i: number | null, extra: Partial<HashLookupStep> = {}) => {
    steps.push({ line, note, slots: [...slots], i, looks, result: null, done: false, ...extra });
  };

  /** find 的 4 到 13 行；call 是调用它的那一行（get 直接就是 find） */
  function find(callLine: number, callNote: string): number {
    push(callLine, callNote, null);
    push(6, 'i = floorMod(' + key + ', ' + cap + ') = ' + bucketOf(key, cap) + '：先看算出来的桶。', bucketOf(key, cap));
    let i = bucketOf(key, cap);
    for (let n = 0; n < cap; n++) {
      looks++;
      if (slots[i] === null) {
        push(8, i + ' 号桶是空桶：往后不可能有 ' + key + ' 了，return -1。', i);
        return -1;
      }
      push(8, i + ' 号桶' + (slots[i] === TOMB ? '是墓碑，不是空桶，继续' : '里是 ' + slots[i] + '，不是空桶，继续') + '。', i);
      if (slots[i] === key) {
        push(9, i + ' 号桶里就是 ' + key + '，return ' + i + '。', i);
        return i;
      }
      push(9, name(slots[i]) + ' ≠ ' + key + '，不是它。', i);
      const next = (i + 1) % cap;
      push(10, '往后一格：i = (' + i + ' + 1) % ' + cap + ' = ' + next + (next === 0 ? '（到头了，回到 0 号）' : '') + '。', next);
      i = next;
    }
    push(12, '所有桶都看过了，return -1。', null);
    return -1;
  }

  if (op === 'get') {
    const at = find(4, 'get(' + key + ')：调用 find，从算出的桶开始往后找。');
    const last = steps[steps.length - 1];
    last.done = true;
    last.result = at;
  } else if (op === 'remove') {
    push(29, 'remove(' + key + ')：先用 find 找到它在哪个桶。', null);
    const at = find(30, '调用 find。');
    if (at < 0) {
      push(31, 'find 返回 -1，表里没有 ' + key + '，return false。', null, { done: true, result: false });
    } else {
      push(31, 'find 返回 ' + at + '，不小于 0，继续。', at);
      slots[at] = TOMB;
      push(32, '把 ' + at + ' 号桶标成墓碑，不能清成空桶：排在后面的键会断链。', at);
      push(33, 'return true。', at, { done: true, result: true });
    }
  } else {
    push(15, 'put(' + key + ')：先看表里有没有这个键。', null);
    const at = find(16, '调用 find。');
    if (at >= 0) {
      push(16, 'find 返回 ' + at + '，已经有了，return true，不重复放。', at, { done: true, result: true });
    } else {
      push(16, 'find 返回 -1，表里还没有，继续放。', null);
      push(17, 'cap = ' + cap + '。', null);
      let i = bucketOf(key, cap);
      push(18, 'i = floorMod(' + key + ', ' + cap + ') = ' + i + '。', i);
      let placed = false;
      for (let n = 0; n < cap && !placed; n++) {
        const free = slots[i] === null || slots[i] === TOMB;
        push(20, i + ' 号桶' + (slots[i] === null ? '是空桶' : slots[i] === TOMB ? '是墓碑，可以放' : '被 ' + slots[i] + ' 占了') + '：' + (free ? '放这里。' : '不能放。'), i);
        if (free) {
          slots[i] = key;
          push(21, 'slots[' + i + '] = ' + key + '。', i);
          push(22, 'return true。', i, { done: true, result: true });
          placed = true;
        } else {
          const next = (i + 1) % cap;
          push(24, '往后一格：i = (' + i + ' + 1) % ' + cap + ' = ' + next + (next === 0 ? '（到头了，回到 0 号）' : '') + '。', next);
          i = next;
        }
      }
      if (!placed) push(26, '所有桶都满了，放不下，return false。', null, { done: true, result: false });
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

/* ---------- 做：猜下一步 ---------- */

/** 一道题：点出一个桶 */
export interface Round {
  /** bucket：算桶号；place：撞了往后放，落在哪；find：查到哪个桶能下结论 */
  kind: 'bucket' | 'place' | 'find';
  key: number;
  slots: Slot[];
  prompt: string;
  /** 正确的桶号 */
  correct: number;
  /** 答错的解释 */
  why: string;
  /** 答对以后的一句话 */
  ok: string;
}

function walkText(slots: readonly Slot[], path: number[], endText: (i: number, s: Slot) => string): string {
  const cap = slots.length;
  const parts: string[] = [];
  path.forEach((i, n) => {
    const s = slots[i];
    if (n === path.length - 1) parts.push(endText(i, s));
    else parts.push(i + ' 号桶' + (s === TOMB ? '是墓碑 ✕，不能停' : '被 ' + s + ' 占了') + '，往后看' + (i === cap - 1 ? '（' + (cap - 1) + ' 号后面回到 0 号）' : ''));
  });
  return parts.join('；') + '。';
}

function bucketRound(rand: () => number, cap: number): Round {
  const neg = rand() < 0.35;
  const key = neg ? -(1 + Math.floor(rand() * 20)) : Math.floor(rand() * 41);
  const correct = bucketOf(key, cap);
  const rem = key % cap;
  const why = rem < 0
    ? key + ' % ' + cap + ' 在 Kotlin 里是 ' + rem + '，负数不能当桶号。加上 ' + cap + '：' + rem + ' + ' + cap + ' = ' + correct + '，是 ' + correct + ' 号桶。'
    : neg
      ? key + ' 正好是 ' + cap + ' 的倍数，余 0，是 0 号桶。'
      : divText(key, cap) + '，余数就是桶号，是 ' + correct + ' 号桶。';
  return {
    kind: 'bucket', key, slots: genTable(cap, rand),
    prompt: '键 ' + key + '，它的目标桶是几号？点它。' + (neg ? '（负数也要落在 0 到 ' + (cap - 1) + ' 号里）' : ''),
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
    const why = key + ' 的目标桶是 ' + h + ' 号。' + walkText(slots, path, (i, s) => i + ' 号桶' + (s === TOMB ? '是墓碑，可以放' : '是空桶') + '，放这里');
    return { kind: 'place', key, slots, prompt: '放进 ' + key + '：目标桶被占了，它最后落在几号桶？（空桶和墓碑 ✕ 都能放）', correct: at, why, ok: why };
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
    const why = key + ' 的目标桶是 ' + bucketOf(key, cap) + ' 号。' + walkText(slots, path, (i, s) => (s === null ? i + ' 号桶是空的，再往后不可能有它，到这里就能断定没有' : i + ' 号桶里就是 ' + key + '，找到了'));
    return { kind: 'find', key, slots, prompt: '查找 ' + key + '：到哪个桶就能下结论？（找到了，或碰到空桶）', correct, why, ok: (at >= 0 ? '找到了。' : '没有这个键。') + why };
  }
  return fixedRound('find');
}

/** 随机不到合适的表时的固定题：表里是 8（1 号桶没有，8 挤到 2 号）、1、15 等 */
function fixedRound(kind: 'place' | 'find'): Round {
  let slots = emptySlots();
  for (const k of [1, 8, 15]) slots = probePut(slots, k)!;
  if (kind === 'place') {
    const why = '22 的目标桶是 1 号。1 号桶被 1 占了，往后看；2 号桶被 8 占了，往后看；3 号桶被 15 占了，往后看；4 号桶是空桶，放这里。';
    return { kind, key: 22, slots, prompt: '放进 22：目标桶被占了，它最后落在几号桶？（空桶和墓碑 ✕ 都能放）', correct: 4, why, ok: why };
  }
  const why = '29 的目标桶是 1 号。1、2、3 号桶都不是 29；4 号桶是空的，再往后不可能有它，到这里就能断定没有。';
  return { kind, key: 29, slots, prompt: '查找 29：到哪个桶就能下结论？（找到了，或碰到空桶）', correct: 4, why, ok: '没有这个键。' + why };
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

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'tomb' | 'neg' | 'rehash';
  /** 输入说明 */
  input: string;
  /** 动画跑完以后的判定 */
  verdict: string;
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
    title: '删了一本书，别的书也找不到了',
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
    input: '容量 7，先放 1、8（都算出 1 号桶，8 挤到 2 号桶），remove(1)，再 get(8)',
    expect: '8 还在表里，get(8) 应该找到它，在 2 号桶',
    explain: '把桶直接清成空桶，后面的键就断链了：查 8 先看 1 号桶，一看是空的就以为没有。要标成墓碑，查找遇到墓碑继续往后看。',
    verdict: '❌ get(8) 返回 -1，说没有；可 8 明明在 2 号桶',
  },
  {
    id: 'neg',
    title: '放负数键，程序崩溃',
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
    input: '容量 7，put(-3)',
    expect: '-3 应该放进 4 号桶',
    explain: 'Kotlin 里负数取模还是负数：-3 % 7 = -3，拿它当下标就越界了。要用 Math.floorMod(key, cap)，它的结果总在 0 到 cap-1。',
    verdict: '💥 下标越界，程序崩溃',
  },
  {
    id: 'rehash',
    title: '换了大书架，书都找不到了',
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
    input: '容量 4，表里有 5（1 号桶）和 6（2 号桶），grow 成容量 8，再 get(5)',
    expect: '5 还在表里，get(5) 应该找到它（新桶号是 5 % 8 = 5）',
    explain: '容量变了，键的桶号也变了：5 % 4 = 1，可 5 % 8 = 5。搬家时不能照抄旧下标，要对每个键用新容量重新算桶号，也就是重新 put 一遍。',
    verdict: '❌ get(5) 返回 -1，说没有；可 5 明明还在表里（放错了桶）',
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
  const push = (line: number, note: string, i: number | null, extra: Partial<BugStep> = {}) => {
    steps.push({ line, note, slots: [...slots], i, outcome: 'running', result: null, done: false, ...extra });
  };

  if (bug.id === 'tomb') {
    slots = probePut(probePut(emptySlots(), 1)!, 8)!;
    push(11, '表里有 1（1 号桶）和 8（也算出 1 号，挤到 2 号桶）。remove(1)：先用 find 找到 1。', null);
    const at = probeFind(slots, 1).at;
    push(12, 'find 返回 ' + at + '：1 在 ' + at + ' 号桶。', at);
    slots[at] = null;
    push(14, 'slots[' + at + '] = EMPTY：把 ' + at + ' 号桶清成空桶。', at);
    push(2, 'get(8)：从 find 开始。8 的桶号是 ' + bucketOf(8) + '。', bucketOf(8));
    const r = probeFind(slots, 8);
    push(4, bucketOf(8) + ' 号桶是空桶，return -1：以为表里没有 8。', bucketOf(8), { outcome: 'wrong', result: r.at, done: true });
  } else if (bug.id === 'neg') {
    slots = probePut(emptySlots(), 15)!;
    push(1, 'put(-3)：容量 7，表里已经有 15（在 1 号桶）。', null);
    push(2, 'i = -3 % 7 = ' + (-3 % 7) + '：Kotlin 里负数取模还是负数，不在 0 到 6 之内。', -3);
    push(4, 'slots[' + (-3 % 7) + ']：下标越界，程序崩溃！', -3, { outcome: 'crash', done: true });
  } else {
    slots = emptySlots(4);
    slots[1] = 5;
    slots[2] = 6;
    push(11, 'grow：旧表容量 4，5 在 1 号桶，6 在 2 号桶。', null);
    slots = emptySlots(8);
    push(12, '新建容量 8 的空表。', null);
    slots[1] = 5;
    push(14, 'i = 1：把 5 原样放进新表的 1 号桶。没有重新算桶号！', 1);
    slots[2] = 6;
    push(14, 'i = 2：把 6 原样放进新表的 2 号桶。', 2);
    push(2, 'get(5)：新表容量 8，桶号 = ' + bucketOf(5, 8) + '。', bucketOf(5, 8));
    push(4, bucketOf(5, 8) + ' 号桶是空桶，return -1：以为表里没有 5。', bucketOf(5, 8), { outcome: 'wrong', result: -1, done: true });
  }
  return steps;
}

/** 找 bug 面板底部的判定 */
export function bugVerdict(step: BugStep, bug: Bug): string {
  return step.done ? bug.verdict : '';
}

/* ---------- 做：挑战 ---------- */

/** 挑战里可选的容量 */
export const CHALLENGE_CAPS = [5, 6, 7, 8, 9, 10, 11, 12, 13];
/** 过关：最高的一摞不超过这么多本 */
export const CHALLENGE_LIMIT = 2;
/** 键是某个数 m 的 1 到 8 倍；m 从这里挑 */
const CHALLENGE_STEPS = [6, 10, 12, 15, 20];

/** 挑战出题：8 本书，书号是 m、2m、…、8m（有规律的书号，容量选不好会全挤在一起） */
export function genChallenge(rand: () => number = Math.random): number[] {
  const m = CHALLENGE_STEPS[Math.floor(rand() * CHALLENGE_STEPS.length)];
  return Array.from({ length: 8 }, (_, k) => m * (k + 1));
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
