import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_CAPS, CHALLENGE_LIMIT, CLASH_BOOKS, CLASH_FETCH, CODE, KID_CAP, PLAY_BOOKS, TOMB,
  bucketOf, bugVerdict, buildTrace, chainFind, chainPut, chainStats, clashFetch, clashPut, clashSpot, clashStart, clashes,
  clashKey, emptyChains, emptySlots, genChallenge, genTable, lookFrames, playBooks, probeFind, probePlace, probePut,
  probeRemove, rounds, runBug, tableKey, walkHops, type Op, type Slot,
} from '../src/engine/hash-lookup';

/** 可复现的随机数 */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 独立的桶号：一格一格往下数，不用 % */
function slowBucket(key: number, cap: number) {
  let r = key;
  while (r < 0) r += cap;
  while (r >= cap) r -= cap;
  return r;
}

describe('哈希查找 基础', () => {
  it('桶号总在 0 到 cap-1，和朴素算法一致，负数也对', () => {
    for (let cap = 1; cap <= 20; cap++) {
      for (let key = -100; key <= 100; key++) {
        const b = bucketOf(key, cap);
        expect(b).toBe(slowBucket(key, cap));
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(cap);
      }
    }
    expect(bucketOf(15, 7)).toBe(1);
    expect(bucketOf(-3, 7)).toBe(4);
    expect(bucketOf(-7, 7)).toBe(0);
  });

  it('线性探测表和 Set 对拍：随机放、查、删，结果一致，表里没有重复的键', () => {
    const rand = seeded(1);
    for (let round = 0; round < 300; round++) {
      const cap = 3 + Math.floor(rand() * 8);
      let slots: Slot[] = emptySlots(cap);
      const model = new Set<number>();
      for (let n = 0; n < 60; n++) {
        const key = Math.floor(rand() * 50) - 10;
        const r = rand();
        if (r < 0.45) {
          const next = probePut(slots, key);
          if (next === null) {
            // 只有真的放不下时才失败：没有空桶也没有墓碑，而且键不在表里
            expect(slots.every((s) => typeof s === 'number')).toBe(true);
            expect(model.has(key)).toBe(false);
          } else {
            slots = next;
            model.add(key);
          }
        } else if (r < 0.7) {
          slots = probeRemove(slots, key);
          model.delete(key);
        }
        expect(probeFind(slots, key).at >= 0).toBe(model.has(key));
        const keys = slots.filter((s): s is number => typeof s === 'number');
        expect(new Set(keys).size).toBe(keys.length);
        expect(new Set(keys)).toEqual(model);
        // 表里每个键都能查到，包括排在墓碑后面的
        for (const k of model) expect(slots[probeFind(slots, k).at]).toBe(k);
      }
    }
  });

  it('查找不存在的键，满表也不会卡住，看的桶不超过 cap', () => {
    let slots: Slot[] = emptySlots(3);
    for (const k of [0, 1, 2]) slots = probePut(slots, k)!;
    expect(probePut(slots, 9)).toBeNull();
    const r = probeFind(slots, 9);
    expect(r.at).toBe(-1);
    expect(r.path).toHaveLength(3);
  });

  it('回绕、墓碑复用', () => {
    let slots: Slot[] = emptySlots(7);
    slots = probePut(slots, 6)!;
    slots = probePut(slots, 13)!;
    expect(slots[0]).toBe(13);
    expect(probePlace(slots, 20).path).toEqual([6, 0, 1]);
    slots = probePut(emptySlots(7), 1)!;
    slots = probePut(slots, 8)!;
    slots = probePut(slots, 15)!;
    slots = probeRemove(slots, 1);
    expect(slots[1]).toBe(TOMB);
    expect(slots[probeFind(slots, 15).at]).toBe(15);
    slots = probePut(slots, 22)!; // 复用墓碑
    expect(slots[1]).toBe(22);
    expect(probeFind(slots, 8).at).toBe(2);
  });

  it('链地址表和 Map 对拍', () => {
    const rand = seeded(2);
    for (let round = 0; round < 200; round++) {
      const cap = 1 + Math.floor(rand() * 9);
      let chains = emptyChains(cap);
      const model = new Set<number>();
      for (let n = 0; n < 40; n++) {
        const key = Math.floor(rand() * 60) - 15;
        chains = chainPut(chains, key);
        model.add(key);
        const probe = Math.floor(rand() * 60) - 15;
        const r = chainFind(chains, probe);
        expect(r.found).toBe(model.has(probe));
        expect(r.bucket).toBe(slowBucket(probe, cap));
        expect(r.looks).toBeGreaterThanOrEqual(1);
        expect(r.looks).toBeLessThanOrEqual(Math.max(1, chains[r.bucket].length));
      }
      expect(chains.flat().sort((a, b) => a - b)).toEqual([...model].sort((a, b) => a - b));
    }
  });
});

describe('哈希查找 看', () => {
  it('故事稿的数字：10 放 3 号，23 放 2 号，31 撞 3 号，17 看 3、4、5 号后断定没有', () => {
    const f = lookFrames();
    expect(f.length).toBeGreaterThanOrEqual(12);
    for (const p of f) {
      expect(p.say.length).toBeGreaterThan(0);
      expect(p.piles).toHaveLength(KID_CAP);
    }
    const byNum = (frag: string) => f.find((p) => p.say.includes(frag))!;
    expect(byNum('10 号书：余 3').piles[3]).toEqual([10]);
    expect(byNum('23 号书：余 2').piles[2]).toEqual([23]);
    expect(byNum('撞啦').clash).toBe(3);
    expect(byNum('叠起来').piles[3]).toEqual([10, 31]);
    expect(byNum('放到旁边').piles[4]).toEqual([31]);
    expect(f[f.length - 3].keeper).toBe(4);
    const miss = f.find((p) => p.miss !== null)!;
    expect(miss.miss).toBe(5);
    expect(miss.piles[5]).toEqual([]);
  });
});

describe('哈希查找 玩', () => {
  it('数一圈：最后停的架就是余数', () => {
    for (const key of [...PLAY_BOOKS, ...Array.from({ length: 60 }, (_, k) => k + 1)]) {
      const hops = walkHops(key);
      expect(hops).toHaveLength(key);
      expect(hops[hops.length - 1]).toBe(slowBucket(key, KID_CAP));
    }
  });

  it('随机六本书：前两本小，后面大，最后一本是 7 的倍数，互不相同', () => {
    for (let s = 0; s < 200; s++) {
      const b = playBooks(seeded(s));
      expect(b).toHaveLength(6);
      expect(b[0]).toBeLessThan(KID_CAP);
      expect(b[1]).toBeGreaterThan(KID_CAP);
      expect(b[5] % KID_CAP).toBe(0);
      expect(new Set(b).size).toBe(6);
    }
  });

  it('撞了怎么办：固定五本书，31、17、9 撞，借 17 和 9 两种办法的步数', () => {
    for (const mode of ['chain', 'probe'] as const) {
      let t = clashStart();
      const hit: boolean[] = [];
      for (const k of CLASH_BOOKS) {
        hit.push(clashes(t, mode, k));
        t = clashPut(t, mode, k);
      }
      expect(hit).toEqual([false, false, true, true, true]);
      const spots = CLASH_BOOKS.map((k) => k);
      expect(spots).toHaveLength(5);
      const looks = CLASH_FETCH.map((k) => clashFetch(t, mode, k).looks);
      expect(looks).toEqual(mode === 'chain' ? [3, 2] : [3, 5]);
    }
    let t = clashStart();
    t = clashPut(clashPut(t, 'probe', 10), 'probe', 31);
    expect(clashSpot(t, 'probe', 17)).toBe(5);
  });
});

describe('哈希查找 做：逐步执行', () => {
  /** 独立的朴素标准答案：用 Set 记着有哪些键 */
  it('3000 组随机表和操作：每一步状态合理，最终结果和 Set 一致', () => {
    const rand = seeded(3);
    for (let k = 0; k < 3000; k++) {
      const cap = 3 + Math.floor(rand() * 6);
      const start = genTable(cap, rand);
      const op: Op = (['get', 'put', 'remove'] as const)[k % 3];
      const key = rand() < 0.5 ? tableKey(start, rand) : Math.floor(rand() * 60) - 10;
      const before = new Set(start.filter((s): s is number => typeof s === 'number'));
      const steps = buildTrace(start, op, key);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      const last = steps[steps.length - 1];
      expect(last.done).toBe(true);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(s.slots).toHaveLength(cap);
        expect(s.note.length).toBeGreaterThan(0);
        if (s.i !== null) expect(s.i >= 0 && s.i < cap).toBe(true);
        expect(s.looks).toBeLessThanOrEqual(cap);
      }
      const after = new Set(last.slots.filter((s): s is number => typeof s === 'number'));
      if (op === 'get') {
        expect(last.slots).toEqual(start);
        expect(last.result !== -1).toBe(before.has(key));
        if (before.has(key)) expect(start[last.result as number]).toBe(key);
      } else if (op === 'remove') {
        expect(last.result).toBe(before.has(key));
        const expected = new Set(before);
        expected.delete(key);
        expect(after).toEqual(expected);
      } else {
        const expected = new Set(before).add(key);
        expect(last.result).toBe(true);
        expect(after).toEqual(expected);
        // 和引擎的放置函数落点一致
        expect(last.slots).toEqual(probePut(start, key));
      }
    }
  });

  it('put 在表满时 return false，步骤里看的桶不超过 cap', () => {
    let slots: Slot[] = emptySlots(3);
    for (const k of [0, 1, 2]) slots = probePut(slots, k)!;
    const steps = buildTrace(slots, 'put', 5);
    const last = steps[steps.length - 1];
    expect(last.result).toBe(false);
    expect(last.line).toBe(26);
  });

  it('remove 之后后面的键仍能 get（墓碑），get 在墓碑上不停', () => {
    let slots: Slot[] = emptySlots(7);
    for (const k of [1, 8, 15]) slots = probePut(slots, k)!;
    const removed = buildTrace(slots, 'remove', 1);
    const afterRemove = removed[removed.length - 1].slots;
    expect(afterRemove[1]).toBe(TOMB);
    const got = buildTrace(afterRemove, 'get', 8);
    expect(got[got.length - 1].result).toBe(2);
  });
});

describe('哈希查找 做：猜下一步', () => {
  it('2000 道题：答案和重新模拟一致，解释和提示不为空，负数键出现', () => {
    let neg = 0;
    let wrapped = 0;
    let seenTomb = 0;
    for (let s = 0; s < 40; s++) {
      for (const r of rounds(50, undefined, seeded(s))) {
        expect(r.prompt.length).toBeGreaterThan(0);
        expect(r.why.length).toBeGreaterThan(0);
        expect(r.slots).toHaveLength(KID_CAP);
        expect(r.slots.filter((x) => x === null).length).toBeGreaterThanOrEqual(2);
        if (r.slots.includes(TOMB)) seenTomb++;
        if (r.kind === 'bucket') {
          expect(r.correct).toBe(slowBucket(r.key, KID_CAP));
          if (r.key < 0) neg++;
        } else if (r.kind === 'place') {
          const res = probePlace(r.slots, r.key);
          expect(r.correct).toBe(res.at);
          expect(typeof r.slots[bucketOf(r.key)]).toBe('number'); // 目标桶被占
          expect(r.slots[r.correct] === null || r.slots[r.correct] === TOMB).toBe(true);
          if (res.path.some((x, k) => k > 0 && x < res.path[k - 1])) wrapped++;
        } else {
          const res = probeFind(r.slots, r.key);
          expect(r.correct).toBe(res.path[res.path.length - 1]);
          // 终点：要么是键自己，要么是空桶（不会停在墓碑上）
          expect(r.slots[r.correct] === r.key || r.slots[r.correct] === null).toBe(true);
        }
      }
    }
    expect(neg).toBeGreaterThan(50);
    expect(wrapped).toBeGreaterThan(10);
    expect(seenTomb).toBeGreaterThan(50);
  });
});

describe('哈希查找 做：找 bug', () => {
  it('每个坑的代码只比正确版本错一行，行号、轨迹合理，最后一步带结果', () => {
    for (const bug of BUGS) {
      expect(bug.code[bug.wrongLine - 1]).not.toBe(bug.fixed);
      const steps = runBug(bug);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      const last = steps[steps.length - 1];
      expect(last.done).toBe(true);
      expect(last.outcome).not.toBe('running');
      expect(bugVerdict(last, bug)).toBe(bug.verdict);
      expect(bugVerdict(steps[0], bug)).toBe('');
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(bug.code.length);
        expect(s.note.length).toBeGreaterThan(0);
      }
    }
  });

  it('tomb：有 bug 的版本找不到 8，正确的版本（打墓碑）找得到', () => {
    const bug = BUGS.find((b) => b.id === 'tomb')!;
    const last = runBug(bug).at(-1)!;
    expect(last.outcome).toBe('wrong');
    expect(last.result).toBe(-1);
    let slots: Slot[] = emptySlots(7);
    for (const k of [1, 8]) slots = probePut(slots, k)!;
    expect(probeFind(probeRemove(slots, 1), 8).at).toBe(2);
  });

  it('neg：-3 % 7 在 JS 和 Kotlin 一样是 -3，正确桶号是 4', () => {
    const bug = BUGS.find((b) => b.id === 'neg')!;
    const last = runBug(bug).at(-1)!;
    expect(last.outcome).toBe('crash');
    expect(last.i).toBe(-3);
    expect(bucketOf(-3, 7)).toBe(4);
  });

  it('rehash：照抄旧下标后，5 的新桶号是 5 而不是 1', () => {
    const bug = BUGS.find((b) => b.id === 'rehash')!;
    const steps = runBug(bug);
    const last = steps.at(-1)!;
    expect(last.outcome).toBe('wrong');
    expect(last.slots[1]).toBe(5);
    expect(probeFind(last.slots, 5).at).toBe(-1);
    // 重新放一遍就对了
    let fixed: Slot[] = emptySlots(8);
    for (const k of [5, 6]) fixed = probePut(fixed, k)!;
    expect(probeFind(fixed, 5).at).toBe(5);
    expect(bucketOf(5, 4)).toBe(1);
  });
});

describe('哈希查找 做：挑战', () => {
  it('每道题都有一个能过关的容量，也有会挤成一大摞的容量', () => {
    for (let s = 0; s < 100; s++) {
      const keys = genChallenge(seeded(s));
      expect(keys).toHaveLength(8);
      const stats = CHALLENGE_CAPS.map((c) => chainStats(keys, c));
      expect(stats.some((x) => x.longest <= CHALLENGE_LIMIT)).toBe(true);
      expect(stats.some((x) => x.longest >= 4)).toBe(true);
      for (const [i, c] of CHALLENGE_CAPS.entries()) {
        const st = stats[i];
        expect(st.counts.reduce((a, b) => a + b, 0)).toBe(8);
        // 朴素数法
        const manual = Array.from({ length: c }, (_, b) => keys.filter((k) => slowBucket(k, c) === b).length);
        expect(st.counts).toEqual(manual);
        expect(st.longest).toBe(Math.max(...manual));
      }
    }
  });
});

describe('clashKey', () => {
  it('给出的新键不在表里，而且目标桶被占', () => {
    const rand = seeded(9);
    for (let k = 0; k < 300; k++) {
      const t = genTable(undefined, rand);
      const key = clashKey(t, rand);
      expect(t.includes(key)).toBe(false);
    }
  });
});
