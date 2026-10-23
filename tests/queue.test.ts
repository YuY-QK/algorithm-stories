import { describe, expect, it } from 'vitest';
import {
  BIG, BUGS, CHALLENGE_CAP, CODE, PRESETS, SEATS, applyCard, buildTrace, cardAnswer, challenge, clerkGame,
  countWraps, emptyRing, isLive, lineAt, lineScript, lookFrames, nextUp, randomOps, ringItems, ringOffer,
  ringPoll, rounds, runBug, simulate, stars, type Op,
} from '../src/engine/queue';

/** 用 JS 数组的 push/shift 当标准答案：最朴素的队列 */
function naive(cap: number, ops: Op[]) {
  const q: number[] = [];
  return ops.map((o) => {
    if (o.kind === 'offer') {
      if (q.length === cap) return false;
      q.push(o.x);
      return true;
    }
    return q.length ? q.shift()! : null;
  });
}

/** 一个简单的可复现随机数 */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('队列 通用：循环队列', () => {
  it('3000 串随机操作，和 push/shift 的结果一致，指针始终在数组里', () => {
    for (let k = 0; k < 3000; k++) {
      const cap = 1 + (k % 7);
      const ops = randomOps(cap, 1 + (k % 30));
      const { results, ring } = simulate(cap, ops);
      expect(results).toEqual(naive(cap, ops));
      expect(ring.head).toBeGreaterThanOrEqual(0);
      expect(ring.head).toBeLessThan(cap);
      expect(ring.tail).toBe((ring.head + ring.size) % cap);
      // 队里的元素就是还没被 poll 出来的那些
      const q: number[] = [];
      for (const o of ops) {
        if (o.kind === 'offer') { if (q.length < cap) q.push(o.x); } else q.shift();
      }
      expect(ringItems(ring)).toEqual(q);
    }
  });

  it('isLive 正好标出 size 个格子', () => {
    let r = emptyRing<number>(5);
    for (let k = 0; k < 200; k++) {
      r = Math.random() < 0.55 ? ringOffer(r, k).ring : ringPoll(r).ring;
      expect(r.cells.filter((_, i) => isLive(r, i))).toHaveLength(r.size);
    }
  });

  it('randomOps：值互不相同，够长时 head、tail 都绕回过', () => {
    for (let k = 0; k < 500; k++) {
      const cap = 3 + (k % 4);
      const ops = randomOps(cap, 3 * cap);
      const xs = ops.flatMap((o) => (o.kind === 'offer' ? [o.x] : []));
      expect(new Set(xs).size).toBe(xs.length);
      const w = countWraps(cap, ops);
      expect(w.tail).toBeGreaterThan(0);
      expect(w.head).toBeGreaterThan(0);
    }
  });
});

describe('队列 看：奶茶店', () => {
  const frames = lookFrames();

  it('每一页一句话，画面来自真实的入队出队', () => {
    expect(frames.length).toBeGreaterThanOrEqual(10);
    for (const f of frames) {
      expect(f.say).not.toContain('\n');
      expect(f.seats).toHaveLength(SEATS);
      expect(f.seats.filter(Boolean)).toHaveLength(f.size);
      // 坐着的人从队头开始连成一段
      for (let k = 0; k < f.size; k++) expect(f.seats[(f.head + k) % SEATS]).not.toBeNull();
    }
  });

  it('先排成一排，再围成一圈；围起来以后才有人坐回 0 号椅子', () => {
    const firstRing = frames.findIndex((f) => f.ring);
    expect(firstRing).toBeGreaterThan(0);
    expect(frames.slice(firstRing).every((f) => f.ring)).toBe(true);
    const before = frames[firstRing - 1];
    expect(before.glow.length).toBeGreaterThan(0);
    for (const k of before.glow) expect(before.seats[k]).toBeNull();
    // 排成一排时，队伍不会跨过最后一把椅子
    for (const f of frames.slice(0, firstRing)) expect(f.head + f.size).toBeLessThanOrEqual(SEATS);
    expect(frames.some((f) => f.ring && f.head + f.size > SEATS)).toBe(true);
    // 有一页坐满了
    expect(frames.some((f) => f.size === SEATS)).toBe(true);
  });

  it('买到奶茶的顺序就是来的顺序', () => {
    const served = frames.at(-1)!.served;
    expect(served).toEqual(['🐼', '🐰', '🐱', '🐶', '🦊', '🐸']);
  });
});

describe('队列 玩法一：谁先买到', () => {
  it('每问一次答案都是队头，大象第一次被问到时不在队头，最后所有人都买到', () => {
    for (let k = 0; k < 500; k++) {
      const script = lineScript(seeded(k));
      const asks = script.map((e, i) => ('ask' in e ? i : -1)).filter((i) => i >= 0);
      let bigSeen = false;
      for (const i of asks) {
        const line = lineAt(script, i);
        expect(line.length).toBeGreaterThanOrEqual(i === asks.at(-1) ? 1 : 2);
        expect(line.length).toBeLessThanOrEqual(4);
        expect(nextUp(line)).toBe(line[0]);
        if (!bigSeen && line.includes(BIG)) {
          bigSeen = true;
          expect(line[0]).not.toBe(BIG);
        }
      }
      expect(bigSeen).toBe(true);
      expect(lineAt(script, script.length)).toEqual([]);
      const names = script.flatMap((e) => ('arrive' in e ? [e.arrive] : []));
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('队列 玩法二：我是店员', () => {
  it('每张卡都有唯一答案，不会满了还来人、空了还卖，而且一定绕回 0 号椅子', () => {
    for (let k = 0; k < 500; k++) {
      const g = clerkGame(seeded(k));
      let r = g.start;
      let wrapped = false;
      for (const c of g.cards) {
        const at = cardAnswer(r, c);
        if ('arrive' in c) {
          expect(r.size).toBeLessThan(SEATS);
          expect(r.cells[at]).toBeNull();
          if (at === 0) wrapped = true;
        } else {
          expect(r.size).toBeGreaterThan(0);
          expect(r.cells[at]).not.toBeNull();
        }
        const next = applyCard(r, c);
        expect(next.cells.filter(Boolean)).toHaveLength(next.size);
        r = next;
      }
      expect(wrapped).toBe(true);
    }
  });
});

describe('队列 做：逐步执行', () => {
  it('2000 串随机操作，每一步的状态和最终结果都对', () => {
    for (let k = 0; k < 2000; k++) {
      const cap = 1 + (k % 6);
      const ops = randomOps(cap, 1 + (k % 25));
      const steps = buildTrace(cap, ops);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(steps.at(-1)!.done).toBe(true);
      const { results, ring } = simulate(cap, ops);
      const last = steps.at(-1)!;
      expect(last.cells).toEqual(ring.cells);
      expect([last.head, last.tail, last.size]).toEqual([ring.head, ring.tail, ring.size]);
      // 每个操作的返回值出现在 ret 里，顺序一致
      const rets = steps.filter((s) => s.ret !== null).map((s) => s.ret);
      expect(rets).toEqual(results.map((v) => (v === null ? 'null' : String(v))));
      expect(last.out).toEqual(results.filter((v): v is number => typeof v === 'number'));
      // 逐步检查用普通判断，几万步逐个 expect 太慢
      const bad = steps.filter((s) => {
        const text = CODE[s.line - 1]?.trim();
        return !text || text === '}'
          || s.head < 0 || s.head >= cap || s.tail < 0 || s.tail >= cap
          || s.size < 0 || s.size > cap || s.tail !== (s.head + s.size) % cap && s.line !== 9 && s.line !== 17
          || (s.touched !== null && (s.touched < 0 || s.touched >= cap));
      });
      expect(bad).toEqual([]);
    }
  });

  it('步骤里的行号指向对应的代码', () => {
    expect(CODE[7]).toContain('size == items.size');
    expect(CODE[8]).toContain('items[tail] = x');
    expect(CODE[9]).toContain('% items.size');
    expect(CODE[15]).toContain('size == 0');
    expect(CODE[16]).toContain('items[head]');
    expect(CODE[17]).toContain('head = (head + 1) % items.size');
    const steps = buildTrace(4, PRESETS[0].ops);
    const wrapStep = steps.find((s) => s.line === 10 && s.tail === 0)!;
    expect(wrapStep.note).toContain('绕回');
  });

  it('预设：绕一圈的会绕回，满了、空了的会返回 false 和 null', () => {
    const wrap = PRESETS.find((p) => p.id === 'wrap')!;
    expect(countWraps(wrap.cap, wrap.ops).tail).toBeGreaterThan(0);
    const full = PRESETS.find((p) => p.id === 'full')!;
    const r = simulate(full.cap, full.ops).results;
    expect(r).toContain(false);
    expect(r).toContain(null);
  });
});

describe('队列 做：猜下一步', () => {
  it('rounds 和 buildTrace 走的是同一条路', () => {
    for (let k = 0; k < 2000; k++) {
      const cap = 2 + (k % 5);
      const ops = randomOps(cap, 1 + (k % 20));
      const rs = rounds(cap, ops);
      const steps = buildTrace(cap, ops);
      const touched = steps.filter((s) => s.touched !== null).map((s) => s.touched);
      expect(rs.filter((r) => typeof r.at === 'number').map((r) => r.at)).toEqual(touched);
      for (const r of rs) {
        if (r.op.kind === 'offer') {
          expect(r.at === 'full').toBe(r.before.size === cap);
          if (r.at !== 'full') expect(r.next).toBe((r.before.tail + 1) % cap);
        } else {
          expect(r.at === 'empty').toBe(r.before.size === 0);
          if (r.at !== 'empty') expect(r.next).toBe((r.before.head + 1) % cap);
        }
      }
      expect(rs.map((r) => r.ret)).toEqual(simulate(cap, ops).results);
    }
  });
});

describe('队列 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错，正确的代码不会', () => {
    const end = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(end['tail-mod'].outcome).toBe('crash');
    expect(end['tail-mod'].line).toBe(9);
    expect(end['head-tail'].outcome).toBe('wrong');
    expect(end['head-tail'].ret).toBe('null');
    expect(end['head-tail'].size).toBe(4);
    expect(end['full-check'].outcome).toBe('wrong');
    expect(end['full-check'].ret).toBe('55');
    for (const b of BUGS) {
      // 同样的操作，正确的队列不会越界，也能给出正确结果
      const steps = buildTrace(b.cap, b.ops);
      expect(steps.at(-1)!.done).toBe(true);
    }
  });

  it('runBug 的行号指向 bug 版代码里对应的行，只有最后一步 done', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
        expect(b.code[s.line - 1].trim()).not.toBe('');
      }
    }
  });
});

describe('队列 做：挑战', () => {
  it('题目里 tail 绕回过、有残留的旧值、队里不空', () => {
    for (let k = 0; k < 300; k++) {
      const ops = challenge(seeded(k));
      expect(ops.length).toBeGreaterThanOrEqual(9);
      expect(ops.length).toBeLessThanOrEqual(11);
      const { ring } = simulate(CHALLENGE_CAP, ops);
      expect(ring.size).toBeGreaterThan(0);
      expect(countWraps(CHALLENGE_CAP, ops).tail).toBeGreaterThan(0);
      expect(ring.cells.some((c, i) => c !== null && !isLive(ring, i))).toBe(true);
    }
  });
});
