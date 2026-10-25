import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_N, CODE, STORY_KIDS, buildQuestions, buildTrace, compareBounds, countChoices, dealKids, dealQueues,
  genArray, halve, isSorted, isStable, judgeCut, judgeHeads, mergeCompares, nextRow, pickOrder, runBug, simulate,
  splitRounds, stars, storyFrames, type Piece,
} from '../src/engine/merge-sort';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

describe('归并排序 看：小动物排队', () => {
  it('故事用的那队：6 个，前一半合并比 4 次', () => {
    expect(STORY_KIDS).toEqual([5, 2, 6, 1, 4, 3]);
    const frames = storyFrames(STORY_KIDS);
    expect(frames.filter((f) => f.cmp !== null)).toHaveLength(4);
    expect(frames.some((f) => f.say.includes('只比了 4 次'))).toBe(true);
    // 16 页上下，别太长
    expect(frames.length).toBeGreaterThanOrEqual(12);
    expect(frames.length).toBeLessThanOrEqual(18);
  });

  it('随机队伍：每一页小动物不多不少，每次走出去的是较矮的队头，最后一页排好', () => {
    for (let k = 0; k < 600; k++) {
      const n = 2 + (k % 8);
      const values = k % 3 === 0 ? genArray(n, 4) : dealKids(n);
      const frames = storyFrames(values);
      const ids = values.map((_, id) => id);
      const mid = halve(n);
      let prev: number[] | null = null;
      for (const f of frames) {
        const all = [...f.queues.flat(), ...(f.out ?? [])].sort((a, b) => a - b);
        // 第一章：两队加新队伍一共 n 个；第二章：所有队合起来 n 个
        expect(all).toEqual(ids);
        for (const q of f.queues) {
          if (f.out === null) continue;
          expect(isSorted(q.map((id) => values[id]))).toBe(true);
        }
        if (f.cmp) {
          const [a, b] = f.cmp;
          expect(f.moved).toBe(values[a] <= values[b] ? a : b);
          // 走出去的不比另一个高
          const other = f.moved === a ? b : a;
          expect(values[f.moved!]).toBeLessThanOrEqual(values[other]);
          expect(f.out!.at(-1)).toBe(f.moved);
        }
        if (f.out) {
          if (prev) expect(f.out.slice(0, prev.length)).toEqual(prev);
          prev = f.out;
        }
      }
      // 第一章的新队伍最后就是整队排好
      const withOut = frames.filter((f) => f.out !== null);
      expect(withOut.at(-1)!.out!.map((id) => values[id])).toEqual(sortNum(values));
      expect(withOut[0].out).toEqual([]);
      // 第一章前两页是两个排好的班：前一半和后一半
      expect(frames[0].queues.flat().sort((a, b) => a - b)).toEqual(ids);
      expect(frames[0].queues[0].every((id) => id < mid)).toBe(true);
      // 最后一页：整队排好
      const last = frames.at(-1)!;
      expect(last.queues).toHaveLength(1);
      expect(last.queues[0].map((id) => values[id])).toEqual(sortNum(values));
      // 第二章分到每队一个再合并回去：中间有一页全是单人队
      expect(frames.some((f) => f.out === null && f.queues.length === n && f.queues.every((q) => q.length === 1))).toBe(true);
    }
  });
});

describe('归并排序 玩', () => {
  it('发牌：身高互不相同，在 1 到 9 之间', () => {
    for (let k = 0; k < 500; k++) {
      const h = dealKids(6);
      expect(new Set(h).size).toBe(6);
      for (const v of h) expect(v >= 1 && v <= 9).toBe(true);
    }
  });

  it('玩法一：两队各自排好，来回换几次；照矮的先走就合成排好的一队', () => {
    for (let k = 0; k < 1000; k++) {
      const { left, right } = dealQueues();
      expect(left.length).toBeGreaterThanOrEqual(3);
      expect(left.length).toBeLessThanOrEqual(4);
      expect(right.length).toBeGreaterThanOrEqual(3);
      expect(right.length).toBeLessThanOrEqual(4);
      expect(isSorted(left) && isSorted(right)).toBe(true);
      expect(new Set([...left, ...right]).size).toBe(left.length + right.length);
      const order = pickOrder(left, right);
      let sw = 0;
      for (let x = 1; x < order.length; x++) if (order[x] !== order[x - 1]) sw++;
      expect(sw).toBeGreaterThanOrEqual(3);
      const l = [...left];
      const r = [...right];
      const merged: number[] = [];
      for (const side of order) {
        const j = judgeHeads(l, r, side);
        expect(j.ok).toBe(true);
        // 点另一边就是错的：它的队头更高
        expect(judgeHeads(l, r, side === 'L' ? 'R' : 'L').ok).toBe(false);
        merged.push(side === 'L' ? l.shift()! : r.shift()!);
      }
      merged.push(...l, ...r);
      expect(merged).toEqual(sortNum([...left, ...right]));
    }
  });

  it('玩法二：只有正中间一刀是对的，一轮一轮分到每队一个', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 16]) {
      for (let size = 2; size <= n; size++) {
        for (let at = 1; at < size; at++) {
          const j = judgeCut(size, at);
          expect(j.ok).toBe(at === halve(size));
          expect(j.left + j.right).toBe(size);
        }
      }
      let row: Piece[] = [{ start: 0, size: n }];
      let rounds = 0;
      while (row.some((p) => p.size > 1)) {
        row = nextRow(row);
        rounds++;
        expect(row.reduce((a, p) => a + p.size, 0)).toBe(n);
        // 首尾相接
        row.forEach((p, x) => expect(p.start).toBe(x === 0 ? 0 : row[x - 1].start + row[x - 1].size));
      }
      expect(row).toHaveLength(n);
      expect(rounds).toBe(splitRounds(n));
      expect(rounds).toBe(Math.ceil(Math.log2(n)));
    }
    expect(splitRounds(4)).toBe(2);
    expect(splitRounds(8)).toBe(3);
  });

  it('星星和选项', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
    for (let a = 1; a < 30; a++) {
      const c = countChoices(a);
      expect(c).toHaveLength(3);
      expect(c).toContain(a);
      expect(new Set(c).size).toBe(3);
      for (const x of c) expect(x).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('归并排序 做：逐步执行', () => {
  it('1500 组随机数组：排对、稳定、比较次数对得上', () => {
    for (let k = 0; k < 1500; k++) {
      const n = k % 14;
      const values = genArray(n, k % 2 ? 5 : 30);
      const steps = buildTrace(values);
      const last = steps.at(-1)!;
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.done).toBe(true);
      expect(last.outcome).toBe('ok');
      expect(last.arr).toEqual(sortNum(values));
      expect(isStable(last.arr, last.ids)).toBe(true);
      // 比较次数 = line 11 的比较步数，也等于直接数出来的
      expect(steps.filter((s) => s.cmp !== null)).toHaveLength(last.compares);
      expect(mergeCompares(values).total).toBe(last.compares);
      expect(mergeCompares(values).sorted).toEqual(sortNum(values));
      if (n > 1) {
        const b = compareBounds(n);
        expect(last.compares).toBeGreaterThanOrEqual(b.min);
        expect(last.compares).toBeLessThanOrEqual(b.max);
      }
      // 调用次数：n 个元素正好 2n - 1 次调用
      expect(steps.filter((s) => s.line === 1)).toHaveLength(Math.max(1, 2 * n - 1));
      // 合并次数 n - 1
      expect(steps.filter((s) => s.line === 16)).toHaveLength(Math.max(0, n - 1));
      let maxDepth = 0;
      for (const s of steps) {
        maxDepth = Math.max(maxDepth, s.depth);
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        // 当前区间就是栈顶
        expect(s.stack.at(-1)).toEqual([s.lo, s.hi]);
        expect(s.depth).toBe(s.stack.length);
        // 数组里的元素一直是原来那些
        expect(sortNum(s.arr)).toEqual(sortNum(values));
        // 临时数组只在合并时有，长度 hi - lo；已经放进去的加上还没放的正好是这段的元素
        if (s.tmp.length && s.k !== null) {
          expect(s.tmp).toHaveLength(s.hi - s.lo);
          const k2 = s.k!;
          expect(s.tmp.slice(0, k2).every((x) => x !== null)).toBe(true);
          expect(s.tmp.slice(k2).every((x) => x === null)).toBe(true);
          // 已放进 tmp 的是 [lo,mid) 和 [mid,hi) 里已取走的那些（在 line 16 之前 arr 没动）
          if (s.line !== 16 && s.line !== 17) {
            const taken = [...s.arr.slice(s.lo, s.i!), ...s.arr.slice(s.mid!, s.j!)];
            expect(sortNum(s.tmp.slice(0, k2) as number[])).toEqual(sortNum(taken));
            expect(isSorted(s.tmp.slice(0, k2) as number[])).toBe(true);
            expect(k2).toBe(s.i! - s.lo + s.j! - s.mid!);
          }
        }
        // 两边各自是排好的（调用返回之后标了 sorted 的格子，每一段都有序）
        if (s.line === 6) {
          expect(isSorted(s.arr.slice(s.lo, s.mid!))).toBe(true);
          expect(isSorted(s.arr.slice(s.mid!, s.hi))).toBe(true);
        }
        if (s.line === 17) expect(isSorted(s.arr.slice(s.lo, s.hi))).toBe(true);
      }
      // 递归深度 = 1 + ceil(log2 n)
      if (n >= 1) expect(maxDepth).toBe(1 + Math.ceil(Math.log2(Math.max(1, n))));
    }
  });

  it('行号指向对应的代码', () => {
    const steps = buildTrace([5, 3, 8, 1, 7]);
    for (const l of new Set(steps.map((s) => s.line))) expect(CODE[l - 1].trim()).not.toBe(l === 17 ? '' : '}');
    expect(CODE[1]).toContain('if (hi - lo <= 1) return');
    expect(CODE[2]).toContain('val mid = (lo + hi) / 2');
    expect(CODE[3]).toContain('mergeSort(a, lo, mid)');
    expect(CODE[4]).toContain('mergeSort(a, mid, hi)');
    expect(CODE[5]).toContain('IntArray(hi - lo)');
    expect(CODE[9]).toContain('while (i < mid && j < hi)');
    expect(CODE[10]).toContain('a[i] <= a[j]');
    expect(CODE[11]).toContain('tmp[k++] = a[j++]');
    expect(CODE[15]).toContain('tmp.copyInto(a, lo)');
    // 取左边在 11 行，取右边在 12 行，剩下的在 14、15 行
    for (const s of steps) {
      if (s.line === 12) expect(s.put).not.toBeNull();
      if (s.line === 14) expect(s.src).toBeLessThan(s.mid!);
      if (s.line === 15) expect(s.src).toBeGreaterThanOrEqual(s.mid!);
    }
  });

  it('故事用的那队：9 次比较以内排好', () => {
    const last = buildTrace(STORY_KIDS).at(-1)!;
    expect(last.arr).toEqual([1, 2, 3, 4, 5, 6]);
    expect(last.compares).toBe(mergeCompares(STORY_KIDS).total);
  });

  it('已经有序最少、交错最多：8 个元素 12 到 17 次，穷举核对', () => {
    const counts = new Set<number>();
    const perm = (rest: number[], cur: number[]) => {
      if (!rest.length) {
        counts.add(mergeCompares(cur).total);
        return;
      }
      rest.forEach((x, k) => perm([...rest.slice(0, k), ...rest.slice(k + 1)], [...cur, x]));
    };
    perm(Array.from({ length: CHALLENGE_N }, (_, k) => k + 1), []);
    expect(Math.min(...counts)).toBe(compareBounds(CHALLENGE_N).min);
    expect(Math.max(...counts)).toBe(compareBounds(CHALLENGE_N).max);
    expect(compareBounds(8)).toEqual({ min: 12, max: 17 });
    for (let n = 2; n <= 7; n++) {
      const c2 = new Set<number>();
      const p2 = (rest: number[], cur: number[]) => {
        if (!rest.length) {
          c2.add(mergeCompares(cur).total);
          return;
        }
        rest.forEach((x, k) => p2([...rest.slice(0, k), ...rest.slice(k + 1)], [...cur, x]));
      };
      p2(Array.from({ length: n }, (_, k) => k), []);
      expect([Math.min(...c2), Math.max(...c2)]).toEqual([compareBounds(n).min, compareBounds(n).max]);
    }
  });

  it('空数组和一个元素', () => {
    for (const v of [[], [7]]) {
      const steps = buildTrace(v);
      expect(steps).toHaveLength(2);
      expect(steps.at(-1)!.done).toBe(true);
      expect(steps.at(-1)!.outcome).toBe('ok');
    }
  });
});

describe('归并排序 做：猜下一步', () => {
  it('题目都和轨迹一致，选项里有且只有一个正确答案', () => {
    for (let k = 0; k < 800; k++) {
      const values = genArray(2 + (k % 9), k % 2 ? 4 : 20);
      const steps = buildTrace(values);
      const qs = buildQuestions(steps);
      expect(qs.some((q) => q.kind === 'range')).toBe(true);
      expect(qs.some((q) => q.kind === 'side')).toBe(true);
      for (const q of qs) {
        expect(q.revealAt).toBe(q.at + 1);
        expect(q.options.filter((o) => o.value === q.answer)).toHaveLength(1);
        expect(new Set(q.options.map((o) => o.value)).size).toBe(q.options.length);
        expect(q.why.length).toBeGreaterThan(5);
        const cur = steps[q.at];
        const nx = steps[q.revealAt];
        if (q.kind === 'side') {
          expect(q.options.map((o) => o.value)).toEqual(['L', 'R']);
          expect(cur.cmp).not.toBeNull();
          expect(q.answer).toBe(nx.src! < cur.mid! ? 'L' : 'R');
          // 取走的确实是较小的一个
          const [i, j] = cur.cmp!;
          expect(cur.arr[nx.src!]).toBe(Math.min(cur.arr[i], cur.arr[j]));
        } else {
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(nx.line).toBe(1);
          const [lo, hi] = nx.stack.at(-1)!;
          expect(q.answer).toBe('[' + lo + ', ' + hi + ')');
          // 下一个区间在当前区间里面，而且是左半或右半
          if (cur.line === 4) expect([lo, hi]).toEqual([cur.lo, cur.mid]);
          else expect([lo, hi]).toEqual([cur.mid, cur.hi]);
        }
      }
    }
  });
});

describe('归并排序 做：找 bug', () => {
  const sameLines = (a: string[], b: string[]) => a.map((t, k) => (t !== b[k] ? k + 1 : 0)).filter(Boolean);

  it('每个 bug 版本的代码和 CODE 只差一行，差的就是 wrongLine', () => {
    expect(BUGS.length).toBeGreaterThanOrEqual(2);
    for (const b of BUGS) {
      expect(b.code).toHaveLength(CODE.length);
      expect(sameLines(b.code, CODE)).toEqual([b.wrongLine]);
      expect(b.code[b.wrongLine - 1]).not.toBe(CODE[b.wrongLine - 1]);
      expect(b.fixed).toBe(CODE[b.wrongLine - 1]);
    }
  });

  it('每个 bug 真的会出错，行号都在范围内', () => {
    const want: Record<string, string> = { lt: 'unstable', copy0: 'wrong', base: 'stuck' };
    for (const b of BUGS) {
      const steps = runBug(b);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(last.outcome).toBe(want[b.id]);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
      }
      // 同样的输入，正确版本是对的
      expect(buildTrace(b.values).at(-1)!.outcome).toBe('ok');
    }
  });

  it('<：数字排对了，但两个 3 换了顺序', () => {
    const b = BUGS.find((x) => x.id === 'lt')!;
    const last = runBug(b).at(-1)!;
    expect(isSorted(last.arr)).toBe(true);
    expect(isStable(last.arr, last.ids)).toBe(false);
  });

  it('copyInto(a, 0)：lo 是 0 时碰巧对，lo > 0 时盖住别人', () => {
    const b = BUGS.find((x) => x.id === 'copy0')!;
    const last = runBug(b).at(-1)!;
    expect([...last.arr].sort()).not.toEqual(sortNum(b.values));
    expect(simulate([2, 1], 'copy0').at(-1)!.outcome).toBe('ok');
    // 随机输入：长度 >= 3 时几乎总是错的，但绝不会越界
    let wrong = 0;
    for (let k = 0; k < 500; k++) {
      const v = genArray(3 + (k % 6), 20);
      const o = simulate(v, 'copy0').at(-1)!;
      if (o.outcome !== 'ok') wrong++;
    }
    expect(wrong).toBeGreaterThan(400);
  });

  it('base 少了「只剩 1 个」：递归深度超过 log n 以后判定为无限递归', () => {
    const b = BUGS.find((x) => x.id === 'base')!;
    const steps = runBug(b);
    const last = steps.at(-1)!;
    expect(last.outcome).toBe('stuck');
    expect(last.depth).toBeGreaterThan(Math.ceil(Math.log2(b.values.length)) + 3);
    expect(steps.length).toBeLessThan(500);
    // 空数组、单个元素：原来的写法可以，bug 版本也一样会卡住（单个元素时）
    expect(simulate([5], 'base').at(-1)!.outcome).toBe('stuck');
    expect(simulate([], 'base').at(-1)!.outcome).toBe('ok');
  });
});
