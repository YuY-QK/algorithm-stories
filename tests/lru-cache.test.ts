import { describe, expect, it } from 'vitest';
import {
  BUGS, CODE, EVICT_BOOKS, EVICT_SEQ, KID_CAP, L, LOOK_SEQ, TRIP_BIG_CAP, TRIP_BOOKS, TRIP_CAP, TRIP_SEQ,
  bugVerdict, buildTrace, countHits, genChallenge, genOps, genPredict, judgeChallenge, judgeEvict, lookFrames, playStars,
  refApply, refRun, rounds, runBug, simulate, trips, CHALLENGE_BOOKS, CHALLENGE_LEN, type Op,
} from '../src/engine/lru-cache';
import { mergeCopy, t as tr } from '../src/core/i18n';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/lru-cache/copy.zh.json';
import { asCopy } from './helpers/copy';

const copy = mergeCopy(asCopy(coreCopy), asCopy(levelCopy));

/* 带种子的随机数，测试可重复 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('LRU 看、玩：书桌', () => {
  it('看：8 次借书，2 次命中，6 次去书架，淘汰的是最左边那本', () => {
    const acc = simulate(LOOK_SEQ, KID_CAP);
    expect(acc.map((a) => a.hit)).toEqual([false, false, false, false, true, false, true, false]);
    expect(acc.map((a) => a.evicted)).toEqual([null, null, null, null, null, 1, null, 4]);
    expect(acc[7].desk).toEqual([2, 5, 3, 1]);
    expect(trips(LOOK_SEQ, KID_CAP)).toBe(6);
  });

  it('任何时候桌上不超过容量、没有重复，淘汰的永远是最久没碰的', () => {
    const rand = rng(1);
    for (let t = 0; t < 500; t++) {
      const cap = 1 + Math.floor(rand() * 5);
      const seq = Array.from({ length: 30 }, () => 1 + Math.floor(rand() * 8));
      for (const a of simulate(seq, cap, 'lru')) {
        expect(a.desk.length).toBeLessThanOrEqual(cap);
        expect(new Set(a.desk).size).toBe(a.desk.length);
        expect(a.desk[a.desk.length - 1]).toBe(a.book);
        if (a.evicted !== null) expect(a.evicted).toBe(a.before[0]);
        expect(a.hit).toBe(a.before.includes(a.book));
      }
    }
  });

  it('玩法一：4 次要放回，第二次放回的是 3 而不是刚翻过的 2', () => {
    const evicts = simulate(EVICT_SEQ, KID_CAP).filter((a) => a.evicted !== null);
    expect(evicts.map((a) => a.evicted)).toEqual([1, 3, 4, 2]);
    expect(Math.max(...EVICT_SEQ)).toBe(EVICT_BOOKS);
    const second = evicts[1];
    expect(second.before).toEqual([3, 4, 5, 2]);
    expect(judgeEvict(second.before, 3)).toBe('right');
    expect(judgeEvict(second.before, 2)).toBe('just-touched');
    expect(judgeEvict(second.before, 4)).toBe('other');
    // 如果按先来后到（FIFO），第二次会放回 2
    expect(simulate(EVICT_SEQ, KID_CAP, 'fifo').filter((a) => a.evicted !== null)[1].evicted).toBe(2);
  });

  it('星星：错得越多越少', () => {
    expect([0, 1, 2, 3, 9].map(playStars)).toEqual([3, 2, 2, 1, 1]);
  });

  it('玩法二：小桌子跑 7 趟，大桌子只要 5 趟（每本书至少去一次）', () => {
    expect(trips(TRIP_SEQ, TRIP_CAP)).toBe(7);
    expect(trips(TRIP_SEQ, TRIP_BIG_CAP)).toBe(5);
    expect(new Set(TRIP_SEQ).size).toBe(TRIP_BOOKS);
  });

  it('LRU 的命中不会因为桌子变大而变少（栈性质），FIFO 可能会（Belady）', () => {
    const rand = rng(2);
    for (let t = 0; t < 500; t++) {
      const seq = Array.from({ length: 40 }, () => 1 + Math.floor(rand() * 7));
      for (let cap = 1; cap < 6; cap++) {
        expect(countHits(seq, cap + 1, 'lru')).toBeGreaterThanOrEqual(countHits(seq, cap, 'lru'));
      }
    }
    const s = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
    expect(s.length - countHits(s, 3, 'fifo')).toBe(9);
    expect(s.length - countHits(s, 4, 'fifo')).toBe(10);
  });
});

describe('LRU 做：逐步执行', () => {
  it('行号和 CODE 对得上', () => {
    const expectText: Record<keyof typeof L, string> = {
      touchRemove: 'remove(n)',
      touchAdd: 'addLast(n)',
      getFun: 'fun get(',
      getFind: 'map[key] ?: return -1',
      getTouch: 'touch(n)',
      getReturn: 'return n.value',
      putFun: 'fun put(',
      putFind: 'val old = map[key]',
      putIf: 'if (old != null)',
      putSet: 'old.value = value',
      putTouch: 'touch(old)',
      putReturn: 'return',
      putFull: 'map.size == capacity',
      putEldest: 'head.next!!',
      putRemove: 'remove(eldest)',
      putMapRemove: 'map.remove(eldest.key)',
      putNew: 'val n = Node(key, value)',
      putMap: 'map[key] = n',
      putAdd: 'addLast(n)',
    };
    for (const k of Object.keys(L) as (keyof typeof L)[]) {
      expect(CODE[L[k] - 1].trim().startsWith(expectText[k]) || CODE[L[k] - 1].includes(expectText[k])).toBe(true);
    }
  });

  it('经典例子：容量 2，每一步的结果和最笨的数组实现一致', () => {
    const ops: Op[] = [
      { t: 'put', k: 1, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 1 }, { t: 'put', k: 3, v: 3 },
      { t: 'get', k: 2 }, { t: 'put', k: 4, v: 4 }, { t: 'get', k: 1 }, { t: 'get', k: 3 }, { t: 'get', k: 4 },
    ];
    const steps = buildTrace(2, ops);
    const rets = steps.filter((s) => s.opEnd).map((s) => (ops[s.op].t === 'get' ? s.ret : null));
    expect(rets).toEqual([null, null, 1, null, -1, null, -1, 3, 4]);
    expect(steps.at(-1)!.list.map((x) => x.k)).toEqual([3, 4]);
  });

  it('随机操作：每个操作结束时链表、哈希表、返回值都和标准答案一致', () => {
    const rand = rng(3);
    for (let t = 0; t < 400; t++) {
      const cap = 1 + Math.floor(rand() * 4);
      const ops = genOps(1 + Math.floor(rand() * 25), 1 + Math.floor(rand() * 6), rand);
      const steps = buildTrace(cap, ops);
      let list: { k: number; v: number }[] = [];
      for (let i = 0; i < ops.length; i++) {
        const r = refApply(list, cap, ops[i]);
        list = r.list;
        const end = steps.filter((s) => s.op === i && s.opEnd);
        expect(end.length).toBe(1);
        expect(end[0].list).toEqual(r.list);
        expect([...end[0].mapKeys].sort()).toEqual(r.list.map((x) => x.k).sort());
        expect(end[0].bad).toBe(false);
        if (ops[i].t === 'get') expect(end[0].ret).toBe(r.ret);
        expect(end[0].list.length).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('每一步行号在范围内，最后一步才 done，链表加手里的节点不会凭空多出来', () => {
    const rand = rng(4);
    for (let t = 0; t < 200; t++) {
      const cap = 1 + Math.floor(rand() * 4);
      const ops = genOps(12, 5, rand);
      const steps = buildTrace(cap, ops);
      steps.forEach((s, i) => {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(s.done).toBe(i === steps.length - 1);
        expect(s.list.length + (s.hand ? 1 : 0)).toBeLessThanOrEqual(cap + 1);
        expect(tr(s.note, copy).length).toBeGreaterThan(0);
      });
    }
  });

  it('没有操作时没有步骤', () => {
    expect(buildTrace(2, [])).toEqual([]);
  });
});

describe('LRU 做：猜下一步', () => {
  it('每道题的标准答案和选项都是对的', () => {
    const rand = rng(5);
    for (let t = 0; t < 300; t++) {
      const cap = 1 + Math.floor(rand() * 4);
      const ops = genOps(15, 1 + Math.floor(rand() * 6), rand);
      const qs = rounds(cap, ops, rand);
      expect(qs.length).toBe(ops.length);
      let list: { k: number; v: number }[] = [];
      qs.forEach((q, i) => {
        expect(q.before).toEqual(list);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        const texts = q.options.map((o) => tr(o, copy));
        expect(new Set(texts).size).toBe(q.options.length);
        const r = refApply(list, cap, ops[i]);
        const ans = texts[q.correct];
        const order = (l: { k: number }[]) => l.map((x) => x.k).join(' → ');
        const prompt = tr(q.prompt, copy);
        if (prompt.includes('返回什么')) expect(ans).toBe('返回 ' + r.ret);
        else if (prompt.includes('会淘汰谁')) expect(ans).toBe(r.evicted === null ? '没人被淘汰' : '淘汰 ' + r.evicted);
        else expect(ans).toBe(order(r.list));
        list = r.list;
      });
    }
  });
});

describe('LRU 看：lookFrames', () => {
  it('台词由引擎生成：第一页讲桌子容量，最后一页数书架趟数，桌子永远不超容量', () => {
    const frames = lookFrames();
    expect(tr(frames[0].say, copy)).toContain('只放得下 ' + KID_CAP + ' 本');
    expect(tr(frames.at(-1)!.say, copy)).toContain('一共跑了 ' + trips(LOOK_SEQ, KID_CAP) + ' 趟书架');
    expect(frames.at(-1)!.trips).toBe(trips(LOOK_SEQ, KID_CAP));
    for (const f of frames) {
      expect(tr(f.say, copy).length).toBeGreaterThan(0);
      expect(f.desk.length).toBeLessThanOrEqual(KID_CAP);
    }
    // 趟数不会减少
    frames.forEach((f, i) => { if (i) expect(f.trips).toBeGreaterThanOrEqual(frames[i - 1].trips); });
    expect(frames.some((f) => f.glow !== null)).toBe(true);
  });
});

describe('LRU 做：genPredict', () => {
  it('固定种子可重复：容量 2 或 3，14 个操作', () => {
    const a = genPredict(rng(8));
    expect(a).toEqual(genPredict(rng(8)));
    expect(a.ops).toHaveLength(14);
    for (let t = 0; t < 50; t++) expect([2, 3]).toContain(genPredict(rng(t)).cap);
    expect(rounds(a.cap, a.ops, rng(1)).every((q) => tr(q.why, copy).length > 0)).toBe(true);
  });
});

describe('LRU 做：找 bug（运行）', () => {
  it('bug 代码和 CODE 只差一行，且出错的那一行就是 wrongLine', () => {
    for (const b of BUGS) {
      expect(b.code.length).toBe(CODE.length);
      const diff = b.code.map((t, i) => (t === CODE[i] ? -1 : i + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(b.fixed).toBe(CODE[b.wrongLine - 1]);
    }
  });

  it('bug 版本真的出错：返回值或内容和标准答案对不上', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(bugVerdict(steps.at(-1)!, b)).not.toBeNull();
      expect(steps.at(-1)!.done).toBe(true);
      expect(steps.some((s) => s.bad)).toBe(true);
      // 没有 bug 的版本是正常的
      expect(buildTrace(b.cap, b.ops).every((s) => !s.bad)).toBe(true);
    }
  });

  it('三个 bug 的具体症状', () => {
    const [a, g, d] = BUGS.map((b) => ({ steps: runBug(b), verdict: tr(bugVerdict(runBug(b).at(-1)!, b)!, copy) }));
    expect(a.verdict).toBe('❌ get(1) 返回了 -1，应该是 1');
    expect(g.verdict).toBe('❌ get(1) 返回了 1，应该是 -1');
    // 幽灵：哈希表里有 3 个 key，容量只有 2
    expect(g.steps.find((s) => s.op === 2 && s.opEnd)!.mapKeys.length).toBe(3);
    // 重复插入：put(1, 10) 之后链表里有两个 1，2 不见了
    const dup = d.steps.find((s) => s.op === 2 && s.opEnd)!;
    expect(dup.list.map((x) => x.k)).toEqual([1, 1]);
    expect(d.verdict).toBe('❌ get(2) 返回了 -1，应该是 2');
  });

  it('bugVerdict 没跑完是 null', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(bugVerdict(steps[0], b)).toBeNull();
      for (const s of steps.slice(0, -1)) expect(bugVerdict(s, b)).toBeNull();
    }
  });

  it('refRun 和 buildTrace 一致', () => {
    for (const b of BUGS) {
      const ref = refRun(b.cap, b.ops);
      const good = buildTrace(b.cap, b.ops);
      expect(good.at(-1)!.list).toEqual(ref.list);
    }
  });
});

describe('LRU 做：挑战', () => {
  it('生成的借书记录合法，LRU 命中数和手算一致', () => {
    const rand = rng(6);
    let lruWins = 0;
    for (let t = 0; t < 500; t++) {
      const c = genChallenge(rand);
      expect(c.seq.length).toBe(CHALLENGE_LEN);
      expect(c.seq.every((b) => b >= 1 && b <= CHALLENGE_BOOKS)).toBe(true);
      expect([3, 4]).toContain(c.cap);
      const v = judgeChallenge(c, 7);
      expect(v.lru).toBe(simulate(c.seq, c.cap).filter((a) => a.hit).length);
      expect(v.diff).toBe(Math.abs(7 - v.lru));
      if (v.lru > v.fifo) lruWins++;
    }
    // 常借的那几本越多，LRU 越占便宜：大多数局不会比 FIFO 差
    expect(lruWins).toBeGreaterThan(50);
  });
});

describe('refApply', () => {
  it('put 已存在的 key 满了也不淘汰', () => {
    const l = [{ k: 1, v: 1 }, { k: 2, v: 2 }];
    const r = refApply(l, 2, { t: 'put', k: 1, v: 9 });
    expect(r.evicted).toBeNull();
    expect(r.list).toEqual([{ k: 2, v: 2 }, { k: 1, v: 9 }]);
  });
});
