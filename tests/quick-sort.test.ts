import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_N, CHALLENGE_OPTIONS, CODE, INPUT_NAME, PICK_N, STORY_ROW, averageCompares, bugVerdict, buildTrace,
  countCompares, dealLine, dealStand, genArray, genChallenge, isBalanced, isSorted, lookFrames, makeInput, medianIdx,
  permutation, rounds, runBug, seeded, sideOf, simulate, splitOf, stars, worstCompares, zoneOf,
} from '../src/engine/quick-sort';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

describe('快速排序 看：体育课排队', () => {
  it('绘本最后一页全部站定，每页同学不多不少', () => {
    for (let k = 0; k < 300; k++) {
      const values = k === 0 ? STORY_ROW : permutation(2 + (k % 8));
      const frames = lookFrames(values);
      const last = frames.at(-1)!;
      expect(last.order.map((id) => values[id])).toEqual(sortNum(values));
      expect(last.kinds.every((x) => x === 'placed')).toBe(true);
      expect(last.say).toContain('比了 ' + buildTrace(values).at(-1)!.compares + ' 次');
      for (const f of frames) {
        expect([...f.order].sort((a, b) => a - b)).toEqual(values.map((_, id) => id));
        expect(f.kinds).toHaveLength(values.length);
        // 站定（placed）的同学一定在最终位置上
        const fin = sortNum(values);
        f.kinds.forEach((kd, pos) => {
          if (kd === 'placed') expect(values[f.order[pos]]).toBe(fin[pos]);
        });
      }
    }
  });

  it('故事用的那排同学：16 页，和标杆比 14 次', () => {
    expect(STORY_ROW).toEqual([6, 2, 8, 4, 1, 7, 3, 5]);
    const frames = lookFrames(STORY_ROW);
    expect(frames).toHaveLength(16);
    expect(frames.at(-1)!.say).toContain('14 次');
    // 第一次分区后：标杆 5 站到下标 4，左边都比它矮，右边都比它高
    const f = frames.find((x) => x.say.includes('都问完啦'))!;
    const h = f.order.map((id) => STORY_ROW[id]);
    expect(h[4]).toBe(5);
    expect(h.slice(0, 4).every((x) => x < 5)).toBe(true);
    expect(h.slice(5).every((x) => x > 5)).toBe(true);
  });
});

describe('快速排序 玩', () => {
  it('站两边：标杆排第 3 到第 6 矮，两边都有人；矮的左高的右', () => {
    for (let k = 0; k < 1000; k++) {
      const g = dealStand();
      expect(g.queue).toHaveLength(7);
      expect(new Set([...g.queue, g.pivot]).size).toBe(8);
      const left = g.queue.filter((x) => sideOf(x, g.pivot) === 'left');
      const right = g.queue.filter((x) => sideOf(x, g.pivot) === 'right');
      expect(left.length).toBeGreaterThanOrEqual(2);
      expect(right.length).toBeGreaterThanOrEqual(2);
      expect(left.every((x) => x < g.pivot) && right.every((x) => x > g.pivot)).toBe(true);
    }
  });

  it('挑个好标杆：左右人数正确，正中间的同学一定分得均匀，最矮最高一边是空的', () => {
    for (let k = 0; k < 500; k++) {
      const line = dealLine();
      expect(sortNum(line)).toEqual(Array.from({ length: PICK_N }, (_, x) => x + 1));
      let balanced = 0;
      for (let idx = 0; idx < PICK_N; idx++) {
        const s = splitOf(line, idx);
        expect(s.left + s.right + 1).toBe(PICK_N);
        expect(s.left).toBe(line[idx] - 1);
        if (isBalanced(s)) balanced++;
        if (line[idx] === 1 || line[idx] === PICK_N) {
          expect(Math.min(s.left, s.right)).toBe(0);
          expect(isBalanced(s)).toBe(false);
        }
      }
      expect(isBalanced(splitOf(line, medianIdx(line)))).toBe(true);
      expect(splitOf(line, medianIdx(line)).left).toBe(4);
      expect(balanced).toBe(3); // 第 4、5、6 矮
    }
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('快速排序 做：逐步执行', () => {
  it('随机输入：最终排对，每一步的行号、不变量都对', () => {
    const rand = seeded(7);
    for (let k = 0; k < 600; k++) {
      const n = k % 12;
      const values = k % 3 === 0 ? permutation(n, rand) : genArray(n, k % 2 ? 4 : 30, rand);
      const steps = buildTrace(values);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(last.outcome).toBe('ok');
      expect(last.arr).toEqual(sortNum(values));
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        // 元素不多不少
        expect(sortNum(s.arr)).toEqual(sortNum(values));
        expect(s.stack.length).toBeLessThanOrEqual(s.maxDepth);
        // 站定的元素在最终位置上
        const fin = sortNum(values);
        s.placed.forEach((pl, x) => {
          if (pl && !(s.pivotAt === x && !s.pdone)) expect(s.arr[x]).toBe(fin[x]);
        });
        if (s.pivot !== null && s.lo !== null && s.hi !== null && !s.pdone) {
          // 分区过程中：标杆在 hi；[lo, i] 都比标杆小；(i, j) 都不比标杆小
          expect(s.pivotAt).toBe(s.hi);
          expect(s.arr[s.hi]).toBe(s.pivot);
          // 第 13 行 i++ 刚做完、还没交换，新腾出的位置先不检查
          const iDone = s.line === 13 ? s.i! - 1 : s.i;
          for (let x = s.lo; x <= (iDone ?? s.lo - 1); x++) expect(s.arr[x]).toBeLessThan(s.pivot);
          if (s.j !== null && iDone !== null) for (let x = iDone + 1; x < s.j; x++) expect(s.arr[x]).toBeGreaterThanOrEqual(s.pivot);
        }
        if (s.pdone && s.pivotAt !== null && s.lo !== null && s.hi !== null) {
          for (let x = s.lo; x < s.pivotAt; x++) expect(s.arr[x]).toBeLessThan(s.arr[s.pivotAt]);
          for (let x = s.pivotAt + 1; x <= s.hi; x++) expect(s.arr[x]).toBeGreaterThanOrEqual(s.arr[s.pivotAt]);
        }
        // 区域颜色：low 的都比标杆小，high 的都不比标杆小
        if (s.pivot !== null && !s.pdone && s.lo !== null) {
          for (let x = 0; x < s.arr.length; x++) {
            const z = zoneOf(s, x);
            if (z === 'low') expect(s.arr[x]).toBeLessThan(s.pivot);
            if (z === 'high') expect(s.arr[x]).toBeGreaterThanOrEqual(s.pivot);
            if (z === 'pivot') expect(s.arr[x]).toBe(s.pivot);
          }
        }
      }
      // 比较、交换次数只增不减，最后的比较次数不超过 n(n-1)/2
      for (let x = 1; x < steps.length; x++) {
        expect(steps[x].compares).toBeGreaterThanOrEqual(steps[x - 1].compares);
        expect(steps[x].swaps).toBeGreaterThanOrEqual(steps[x - 1].swaps);
      }
      expect(last.compares).toBeLessThanOrEqual(worstCompares(n));
    }
  });

  it('每次分区比较 hi − lo 次；比较次数和 countCompares(last) 一致', () => {
    const rand = seeded(11);
    for (let k = 0; k < 300; k++) {
      const values = genArray(1 + (k % 14), 8, rand);
      const last = buildTrace(values).at(-1)!;
      expect(countCompares(values, 'last').compares).toBe(last.compares);
      expect(countCompares(values, 'last').maxDepth).toBe(last.maxDepth);
    }
  });

  it('调用次数：每次分区产生两个孩子调用，一共 2 × 分区次数 + 1 次', () => {
    for (let k = 0; k < 200; k++) {
      const n = 1 + (k % 10);
      const steps = buildTrace(permutation(n));
      const partitions = steps.filter((s) => s.line === 3).length;
      expect(steps.at(-1)!.calls).toBe(2 * partitions + 1);
      // 每个元素恰好当一次标杆，或者在单元素区间里直接站定
      expect(partitions).toBeLessThanOrEqual(n);
    }
  });

  it('已经排好的数组：比较 n(n − 1)/2 次，递归深度 n', () => {
    for (const n of [2, 5, 9]) {
      const last = buildTrace(makeInput('sorted', n)).at(-1)!;
      expect(last.compares).toBe(worstCompares(n));
      expect(last.maxDepth).toBe(n);
    }
  });

  it('行号对应的代码文字', () => {
    expect(CODE[11]).toContain('arr[j] < pivot');
    expect(CODE[16]).toContain('swap(arr, i + 1, hi)');
    expect(CODE[3]).toContain('p - 1');
  });
});

describe('快速排序 做：猜下一步', () => {
  it('每道题的答案和真正的执行结果一致', () => {
    const rand = seeded(5);
    for (let k = 0; k < 400; k++) {
      const values = genArray(7, 12, rand);
      const steps = buildTrace(values);
      const qs = rounds(values, rand);
      expect(qs.length).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        const at = q.at;
        expect(steps[at]).toEqual(q.step);
        expect(at).toBeGreaterThanOrEqual(0);
        if (q.kind === 'swap') {
          const s = q.step;
          expect(s.line).toBe(11);
          const cmp = steps[at + 1];
          expect(cmp.line).toBe(12);
          const after = steps[at + 3]; // 12 → 13 → 14
          if (q.will) {
            expect(steps[at + 2].line).toBe(13);
            expect(after.line).toBe(14);
            expect(after.swapped).toEqual([q.target, s.j]);
          } else {
            expect(steps[at + 2].line).toBe(11);
          }
        } else if (q.kind === 'land') {
          expect(q.step.j).toBe(q.step.hi);
          const sw = steps[at + 1];
          expect(sw.line).toBe(17);
          expect(sw.pivotAt).toBe(q.target);
        } else {
          expect(q.step.line).toBe(18);
          expect(q.options).toHaveLength(3);
          expect(q.options.filter((o) => o.ok)).toHaveLength(1);
          const { lo, hi } = q.step;
          expect(q.options.find((o) => o.ok)!.text).toBe(`[${lo}, ${q.p - 1}] 和 [${q.p + 1}, ${hi}]`);
          // 下一步确实是调用 quickSort(lo, p − 1)
          expect(steps[at + 1].line).toBe(4);
          expect(steps[at + 1].note).toContain(`quickSort(${lo}, ${q.p - 1})`);
        }
      }
    }
  });
});

describe('快速排序 做：猜下一步的 why 和提示', () => {
  it('每题带提示和解释，固定种子可重复', () => {
    const a = rounds([5, 2, 8, 1, 9, 3, 7], seeded(11));
    const b = rounds([5, 2, 8, 1, 9, 3, 7], seeded(11));
    expect(a).toEqual(b);
    for (const q of a) {
      expect(q.prompt.length).toBeGreaterThan(5);
      expect(q.why.length).toBeGreaterThan(5);
      if (q.kind === 'swap') {
        expect(q.targetPrompt).toContain('i++ 之后 i = ' + q.target);
        expect(q.whyTarget).toContain('arr[' + q.target + ']');
        const v = q.step.arr[q.step.j!];
        expect(q.why).toContain(String(v));
      }
      if (q.kind === 'land') expect(q.why).toContain('落在下标 ' + q.target);
      if (q.kind === 'ranges') expect(q.why).toContain('下标 ' + q.p);
    }
  });
});

describe('快速排序 做：找 bug', () => {
  it('bugVerdict：没跑完是空串，三种错的结局各有文字', () => {
    const bug = BUGS[0];
    expect(bugVerdict(runBug(bug)[0], bug)).toBe('');
    expect(bugVerdict(runBug(BUGS[0]).at(-1)!, BUGS[0])).toContain('StackOverflowError');
    expect(bugVerdict(runBug(BUGS[1]).at(-1)!, BUGS[1])).toContain('[5, 4, 3, 2, 1]');
    expect(bugVerdict(simulate([2, 3, 1], 'swap-i').at(-1)!)).toContain('下标越界');
    expect(bugVerdict(buildTrace([3, 1, 2]).at(-1)!)).toBe('✅ 排好了');
  });

  it('每个 bug 版本和 CODE 只差一行，并且在给定输入上出错', () => {
    for (const b of BUGS) {
      expect(b.code).toHaveLength(CODE.length);
      const diff = b.code.map((t, k) => (t !== CODE[k] ? k + 1 : 0)).filter(Boolean);
      expect(diff).toEqual([b.wrongLine]);
      expect(b.fixed.trim()).toBe(CODE[b.wrongLine - 1].trim());
      const steps = runBug(b);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(last.outcome).not.toBe('ok');
      expect(last.outcome).not.toBe('running');
      for (const s of steps) expect(s.line).toBeLessThanOrEqual(CODE.length);
      // 同样的输入，正确版本是对的
      expect(buildTrace(b.values).at(-1)!.outcome).toBe('ok');
    }
  });

  it('把标杆包进递归区间：标杆最大时栈溢出，能检测出来', () => {
    const bug = BUGS.find((b) => b.id === 'incl-pivot')!;
    const last = runBug(bug).at(-1)!;
    expect(last.outcome).toBe('overflow');
    expect(last.stack.length).toBeGreaterThan(bug.values.length + 2);
    // 标杆不是最大的数组也可能出错（比如最后一层），但永远不会无限循环
    for (let k = 0; k < 300; k++) {
      const values = genArray(1 + (k % 8), 9);
      const lastStep = simulate(values, 'incl-pivot').at(-1)!;
      expect(['ok', 'overflow']).toContain(lastStep.outcome);
      if (values.length >= 2 && Math.max(...values.slice(0, -1)) < values.at(-1)!) expect(lastStep.outcome).toBe('overflow');
    }
  });

  it('比较写反：整个数组从大到小', () => {
    const bug = BUGS.find((b) => b.id === 'reversed')!;
    const last = runBug(bug).at(-1)!;
    expect(last.outcome).toBe('wrong');
    expect(last.arr).toEqual([5, 4, 3, 2, 1]);
    for (let k = 0; k < 300; k++) {
      const values = permutation(2 + (k % 8));
      const l = simulate(values, 'reversed').at(-1)!;
      expect(l.arr).toEqual(sortNum(values).reverse());
    }
  });

  it('标杆换错位置：没排好；没有更小的元素时下标越界', () => {
    const bug = BUGS.find((b) => b.id === 'swap-i')!;
    expect(runBug(bug).at(-1)!.outcome).toBe('wrong');
    const crash = simulate([2, 3, 1], 'swap-i').at(-1)!;
    expect(crash.outcome).toBe('crash'); // 最后一个是最小的：i 还是 -1
    for (let k = 0; k < 300; k++) {
      const values = permutation(2 + (k % 7));
      const l = simulate(values, 'swap-i').at(-1)!;
      expect(['ok', 'wrong', 'crash']).toContain(l.outcome);
      if (l.outcome === 'ok') expect(isSorted(l.arr)).toBe(true);
    }
  });
});

describe('快速排序 做：挑战', () => {
  it('genChallenge：三个数组长度一致，答案都是 n(n − 1)/2，固定种子可重复', () => {
    const qs = genChallenge(seeded(4));
    expect(qs).toEqual(genChallenge(seeded(4)));
    expect(qs).toHaveLength(3);
    for (const q of qs) {
      expect(q.arr).toHaveLength(CHALLENGE_N);
      expect(countCompares(q.arr, 'last').compares).toBe(worstCompares(CHALLENGE_N));
    }
    expect(new Set(qs[2].arr).size).toBe(1);
    expect(qs[2].name).toContain(String(qs[2].arr[0]));
    expect(CHALLENGE_OPTIONS).toContain(worstCompares(CHALLENGE_N));
  });

  it('已经排好或倒序、固定拿最后一个：n(n − 1)/2 次', () => {
    for (const n of [2, 10, 100, 1000]) {
      for (const kind of ['sorted', 'reversed'] as const) {
        const r = countCompares(makeInput(kind, n), 'last');
        expect(r.compares).toBe(worstCompares(n));
        expect(r.sorted).toBe(true);
      }
    }
    expect(worstCompares(10)).toBe(45);
  });

  it('不管怎么选标杆都能排对', () => {
    const rand = seeded(3);
    for (let k = 0; k < 300; k++) {
      const values = genArray(k % 30, k % 2 ? 5 : 50, rand);
      for (const s of ['last', 'random', 'median3'] as const) {
        const r = countCompares(values, s, rand);
        expect(r.sorted).toBe(true);
        expect(r.compares).toBeLessThanOrEqual(worstCompares(values.length));
      }
    }
  });

  it('有序数组：随机标杆和三数取中比固定拿最后一个少得多', () => {
    const rand = seeded(9);
    const n = 1000;
    const last = averageCompares('sorted', n, 'last', 1, rand);
    const rnd = averageCompares('sorted', n, 'random', 20, rand);
    const med = averageCompares('sorted', n, 'median3', 1, rand);
    expect(last).toBe(worstCompares(n));
    expect(rnd).toBeLessThan(last / 20);
    expect(med).toBeLessThan(n * Math.log2(n) * 1.3);
    expect(med).toBeGreaterThan(n * Math.log2(n) * 0.5);
  });

  it('随机数据：平均约 2 n ln n 次', () => {
    const rand = seeded(2);
    const n = 1000;
    const avg = averageCompares('random', n, 'last', 30, rand);
    expect(avg).toBeGreaterThan(1.3 * n * Math.log(n));
    expect(avg).toBeLessThan(2.1 * n * Math.log(n));
  });

  it('名字都齐', () => {
    expect(Object.keys(INPUT_NAME)).toEqual(['sorted', 'reversed', 'random']);
  });
});
