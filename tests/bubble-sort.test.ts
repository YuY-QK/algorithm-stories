import { describe, expect, it } from 'vitest';
import { mergeCopy, t } from '../src/core/i18n';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/bubble-sort/copy.zh.json';
import type { Copy } from '../src/core/types';
import {
  BUGS, CHALLENGE_N, PREDICT_N, bugVerdict, genPredict, CODE, KID_N, ROUND_END_LINE, STORY_KIDS, rounds, buildTrace, genChallenge, distinctArray,
  genArray, inversions, isSorted, lookFrames, need, passedOver, randomKids, runBug, sameItems, shootAnswer, shootInit,
  shootNextRound, shootQuiet, stableSorted, stars, swapsInRound, type Kid, type Shape, type ShootState,
} from '../src/engine/bubble-sort';
import { seeded } from './helpers/seeded';

const copy = mergeCopy(coreCopy as Copy, levelCopy as Copy);
const byH = (k: Kid) => k.h;
const asc = (a: number[]) => [...a].sort((x, y) => x - y);

describe('冒泡排序 看：排队拍合照', () => {
  it('故事里的队伍：3 轮、比 9 次、换 4 次，第 3 轮没人换提前拍照', () => {
    const rs = rounds(STORY_KIDS, byH);
    expect(rs).toHaveLength(3);
    expect(rs.map((r) => r.swaps)).toEqual([3, 1, 0]);
    expect(rs.flatMap((r) => r.compares)).toHaveLength(9);
    expect(rs[0].top.id).toBe('bear');
    expect(rs[2].quiet).toBe(true);
    expect(rs.at(-1)!.after.map((k) => k.h)).toEqual([118, 120, 132, 138, 145]);
  });

  it('绘本画面：每个画面一行字，最后一页排好并拍照', () => {
    for (let k = 0; k < 300; k++) {
      const kids = k === 0 ? STORY_KIDS : randomKids();
      const frames = lookFrames(kids);
      const last = frames.at(-1)!;
      expect(last.photo).toBe(true);
      expect(last.line.map(byH)).toEqual(asc(kids.map(byH)));
      expect(last.fixedFrom).toBe(0);
      for (const f of frames) {
        expect(t(f.say, copy)).not.toContain('\n');
        expect(t(f.say, copy)).not.toContain('⟦');
        expect(f.line).toHaveLength(kids.length);
        if (f.pair !== null) expect(f.pair + 1).toBeLessThan(f.fixedFrom);
        // 已经站好的部分不会再变
        for (let p = f.fixedFrom; p < kids.length; p++) expect(f.line[p].h).toBe(last.line[p].h);
      }
    }
  });

  it('随机队伍：5 个、身高互不相同、没排好、最高的不在最右边', () => {
    for (let k = 0; k < 500; k++) {
      const kids = randomKids();
      expect(kids).toHaveLength(KID_N);
      expect(new Set(kids.map(byH)).size).toBe(KID_N);
      expect(new Set(kids.map((x) => x.id)).size).toBe(KID_N);
      expect(kids[KID_N - 1].h).not.toBe(Math.max(...kids.map(byH)));
    }
  });
});

describe('冒泡排序 玩法一：当摄影师', () => {
  /** 一直答对，走完整局 */
  function playRight(kids: Kid[]) {
    let s: ShootState<Kid> = shootInit(kids);
    let guard = 0;
    while (s.phase !== 'done' && guard++ < 100) {
      if (s.phase === 'pair') s = shootAnswer(s, need(s.line[s.j].h, s.line[s.j + 1].h), byH)!;
      else if (s.phase === 'next') s = shootNextRound(s);
      else s = shootQuiet(s, 'photo')!;
    }
    return s;
  }

  it('一直答对就能排好，比较、交换次数和 rounds 一致', () => {
    for (let k = 0; k < 1000; k++) {
      const kids = randomKids();
      const s = playRight(kids);
      const rs = rounds(kids, byH);
      expect(s.phase).toBe('done');
      expect(s.line.map(byH)).toEqual(asc(kids.map(byH)));
      expect(s.compares).toBe(rs.reduce((t, r) => t + r.compares.length, 0));
      expect(s.swaps).toBe(rs.reduce((t, r) => t + r.swaps, 0));
    }
  });

  it('答错状态不变；一轮没人换时只有拍照是对的', () => {
    const s = shootInit(STORY_KIDS);
    expect(shootAnswer(s, 'swap', byH)).toBeNull(); // 小兔 120 比小熊 145 矮
    const s2 = shootAnswer(s, 'keep', byH)!;
    expect(shootAnswer(s2, 'keep', byH)).toBeNull(); // 小熊比小猫高
    let q: ShootState<Kid> = s;
    while (q.phase !== 'quiet') {
      q = q.phase === 'pair' ? shootAnswer(q, need(q.line[q.j].h, q.line[q.j + 1].h), byH)! : shootNextRound(q);
    }
    expect(q.round).toBe(2);
    expect(shootQuiet(q, 'again')).toBeNull();
    expect(shootQuiet(q, 'photo')!.phase).toBe('done');
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('冒泡排序 做：逐步执行', () => {
  const shapes: Shape[] = ['random', 'nearly', 'reversed'];

  it('1500 组随机数组：排对、计数正确、每一步都合理', () => {
    for (let k = 0; k < 1500; k++) {
      const n = [0, 1, 2, 3, 6, 8, 12][k % 7];
      const input = genArray(n, shapes[k % 3]);
      const steps = buildTrace(input);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(last.outcome).toBe('ok');
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.a.map((x) => x.v)).toEqual(asc(input));
      expect(last.compares).toBeLessThanOrEqual((n * (n - 1)) / 2);
      expect(last.swaps).toBe(inversions(input));
      expect(steps.filter((s) => s.line === 6)).toHaveLength(last.compares);
      expect(steps.filter((s) => s.line === 9)).toHaveLength(last.swaps);
      const rs = rounds(input, (v) => v);
      expect(steps.filter((s) => s.line === ROUND_END_LINE)).toHaveLength(rs.length);
      const bad: string[] = [];
      for (const s of steps) {
        if (s.line < 1 || s.line > CODE.length || CODE[s.line - 1].trim() === '}') bad.push('行号 ' + s.line);
        // j 只在没站好的部分里走，j + 1 不越过 n - 1 - i
        if (s.j !== null && (s.i === null || s.j + 1 > n - 1 - s.i)) bad.push('j = ' + s.j);
        // 已经站好的部分就是最终结果
        for (let p = s.sortedFrom; p < n; p++) if (s.a[p].v !== last.a[p].v) bad.push('第 ' + p + ' 位提前固定错了');
      }
      expect(bad).toEqual([]);
    }
  });

  it('逆序是最坏情况，已有序只走一轮', () => {
    const n = 12;
    const rev = Array.from({ length: n }, (_, k) => n - k);
    expect(buildTrace(rev).at(-1)!.compares).toBe((n * (n - 1)) / 2);
    const sorted = Array.from({ length: n }, (_, k) => k);
    const steps = buildTrace(sorted);
    expect(steps.at(-1)!.compares).toBe(n - 1);
    expect(steps.at(-1)!.line).toBe(ROUND_END_LINE);
  });

  it('行号指向对应的代码', () => {
    expect(CODE[2]).toContain('for (i in 0 until n - 1)');
    expect(CODE[4]).toContain('until n - 1 - i');
    expect(CODE[5]).toContain('arr[j] > arr[j + 1]');
    expect(CODE[8]).toContain('arr[j + 1] = t');
    expect(CODE[ROUND_END_LINE - 1]).toContain('if (!swapped) break');
  });
});

describe('冒泡排序 做：猜下一步', () => {
  it('一轮的交换次数 = 左边有更大数的元素个数；落到最右的是这一轮的最大值', () => {
    for (let k = 0; k < 3000; k++) {
      const a = distinctArray(2 + (k % 7));
      for (const r of rounds(a, (v) => v)) {
        expect(swapsInRound(r.before, r.end)).toBe(r.swaps);
        expect(passedOver(r.before, r.end)).toHaveLength(r.swaps);
        expect(r.top).toBe(Math.max(...r.before.slice(0, r.end + 1)));
      }
    }
  });
});

describe('冒泡排序 做：猜下一步的出题和解释', () => {
  it('genPredict：固定种子可复现，PREDICT_N 个互不相同的数', () => {
    expect(genPredict(seeded(5))).toEqual(genPredict(seeded(5)));
    const r = seeded(8);
    for (let k = 0; k < 200; k++) {
      const a = genPredict(r);
      expect(a).toHaveLength(PREDICT_N);
      expect(new Set(a).size).toBe(PREDICT_N);
    }
  });

  it('rounds：每题都有 whyTop 和 why，why 里写着这一轮真实的交换次数', () => {
    const r = seeded(12);
    for (let k = 0; k < 200; k++) {
      for (const rd of rounds(genPredict(r), (v) => v)) {
        expect(t(rd.whyTop, copy)).toContain('下标 0 到 ' + rd.end);
        expect(t(rd.whyTop, copy)).toContain(String(rd.top));
        expect(t(rd.why, copy)).toContain('换了 ' + rd.swaps + ' 次');
      }
    }
  });

  it('lookFrames：每页有台词，最后一页拍照；randomKids 固定种子可复现', () => {
    const a = randomKids(5, seeded(3)), b = randomKids(5, seeded(3));
    expect(a).toEqual(b);
    const fs = lookFrames(a);
    expect(fs.every((f) => t(f.say, copy).length > 0)).toBe(true);
    expect(fs.at(-1)!.photo).toBe(true);
  });
});

describe('冒泡排序 引擎：bugVerdict', () => {
  it('没跑完是空；三个坑跑完各有各的判定', () => {
    const v = Object.fromEntries(BUGS.map((b) => {
      const tr = runBug(b);
      expect(bugVerdict(tr[0], b)).toBeNull();
      return [b.id, t(bugVerdict(tr.at(-1)!, b)!, copy)];
    }));
    expect(v.bound).toBe('💥 下标越界，程序崩溃');
    expect(v.stable).toContain('先后顺序却反了');
    expect(v.temp).toContain('不对');
  });
});

describe('冒泡排序 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      expect(b.code).toHaveLength(CODE.length);
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错，正确代码在同样的输入上是对的', () => {
    const end = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(end.temp.outcome).toBe('ok');
    expect(end.temp.a.map((x) => x.v)).toEqual([1, 1, 1, 1]);
    expect(end.bound.outcome).toBe('crash');
    expect(end.bound.line).toBe(6);
    expect(end.stable.outcome).toBe('ok');
    expect(end.stable.a.map((x) => x.v)).toEqual([1, 3, 5, 5]);
    expect(end.stable.a.map((x) => x.tag ?? '')).toEqual(['', '', 'ᵇ', 'ᵃ']);
    for (const b of BUGS) {
      if (b.id !== 'bound') expect(sameItems(end[b.id].a, stableSorted(b.input))).toBe(false);
      expect(buildTrace(b.input.map((x) => x.v)).at(-1)!.a.map((x) => x.v)).toEqual(stableSorted(b.input).map((x) => x.v));
    }
  });

  it('runBug 的行号在 bug 版代码范围里，只有一个结束步', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
    }
  });
});

describe('冒泡排序 做：挑战', () => {
  it('最少相邻交换次数 = 逆序对 = 冒泡的交换次数', () => {
    for (let k = 0; k < 500; k++) {
      const a = genChallenge(CHALLENGE_N, seeded(k));
      expect(a).toHaveLength(CHALLENGE_N);
      expect(asc(a)).toEqual(Array.from({ length: CHALLENGE_N }, (_, x) => x + 1));
      const inv = inversions(a);
      expect(inv).toBeGreaterThanOrEqual(5);
      expect(buildTrace(a).at(-1)!.swaps).toBe(inv);
      // 每次相邻交换，逆序对恰好加一或减一
      const b = a.slice();
      const p = k % (CHALLENGE_N - 1);
      [b[p], b[p + 1]] = [b[p + 1], b[p]];
      expect(Math.abs(inversions(b) - inv)).toBe(1);
    }
    expect(isSorted([1, 2, 2, 3])).toBe(true);
    expect(isSorted([2, 1])).toBe(false);
  });
});

describe('冒泡排序 引擎：固定种子', () => {
  it('genChallenge：固定种子可复现', () => {
    expect(genChallenge(CHALLENGE_N, seeded(9))).toEqual(genChallenge(CHALLENGE_N, seeded(9)));
  });
});
