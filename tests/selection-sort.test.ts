import { describe, expect, it } from 'vitest';
import {
  BUGS, CANDY_MAX, CODE, HAND_N, KID_N, PUZZLE_N, STORY, buildTrace, comparesFor, fewestSwaps, genArray, genCandies,
  genPuzzle, handInit, handNeed, handPlace, handRoundOver, handStep, inversions, isSorted, minFrom, rounds, runBug,
  selectRounds, selectionSwaps, stars, swapAt, type Shape,
} from '../src/engine/selection-sort';

const sortNum = (a: number[]) => a.slice().sort((x, y) => x - y);
const SHAPES: Shape[] = ['random', 'dups', 'sorted', 'reversed'];

describe('选择排序 看、玩：小熊排糖果', () => {
  it('绘本：5 轮排好，其中两轮不用换', () => {
    const rs = selectRounds(STORY);
    expect(rs).toHaveLength(STORY.length - 1);
    expect(rs.at(-1)!.after).toEqual(sortNum(STORY));
    expect(rs.filter((r) => r.min === r.i)).toHaveLength(2);
    for (const r of rs) {
      // 挑出来的是剩下里面最小的，换到第 i 个
      expect(r.before[r.min]).toBe(Math.min(...r.before.slice(r.i)));
      expect(r.after[r.i]).toBe(r.before[r.min]);
      expect(r.after.slice(0, r.i + 1)).toEqual(sortNum(STORY).slice(0, r.i + 1));
    }
  });

  it('genCandies：大小互不相同，在 1 到 CANDY_MAX 之间，不会一开始就排好', () => {
    for (let k = 0; k < 2000; k++) {
      const a = genCandies(KID_N);
      expect(new Set(a).size).toBe(KID_N);
      expect(Math.min(...a)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...a)).toBeLessThanOrEqual(CANDY_MAX);
      expect(isSorted(a)).toBe(false);
    }
  });

  it('minFrom 有几个一样小时取最前面的', () => {
    expect(minFrom([3, 1, 2, 1], 0)).toBe(1);
    expect(minFrom([3, 1, 2, 1], 2)).toBe(3);
    expect(minFrom([5], 0)).toBe(0);
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
  });

  it('小熊的手：只按正确答案走，比较 n(n−1)/2 次，最后排好；答错状态不变', () => {
    for (let k = 0; k < 2000; k++) {
      const a = genCandies(HAND_N);
      let s = handInit(a);
      let asked = 0;
      while (!s.done) {
        if (handRoundOver(s)) {
          // 一轮看完，手里拿的就是剩下里面最小的
          expect(s.held).toBe(minFrom(s.a, s.i));
          s = handPlace(s);
          continue;
        }
        const need = handNeed(s);
        expect(handStep(s, need === 'take' ? 'keep' : 'take')).toBeNull();
        s = handStep(s, need)!;
        asked++;
      }
      expect(asked).toBe(comparesFor(HAND_N));
      expect(s.compares).toBe(asked);
      expect(s.a).toEqual(sortNum(a));
    }
  });
});

describe('选择排序 做：逐步执行', () => {
  it('3000 组随机数组：结果有序、比较 n(n−1)/2 次、交换 ≤ n−1 次', () => {
    for (let k = 0; k < 3000; k++) {
      const n = k % 13;
      const a = genArray(n, SHAPES[k % 4]);
      const steps = buildTrace(a);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.a).toEqual(sortNum(a));
      expect(last.compares).toBe(comparesFor(n));
      expect(last.swaps).toBe(selectionSwaps(a));
      expect(last.swaps).toBeLessThanOrEqual(Math.max(n - 1, 0));
      if (SHAPES[k % 4] === 'sorted') expect(last.swaps).toBe(0);
      // 每一步的检查先收集起来，最后一起断言（逐个 expect 太慢）
      const bad: string[] = [];
      const want = sortNum(a);
      for (let t = 0; t < steps.length; t++) {
        const s = steps[t];
        const fail = (why: string) => bad.push('[' + a.join(',') + '] 第 ' + (t + 1) + ' 步：' + why);
        if (s.line < 1 || s.line > CODE.length || CODE[s.line - 1].trim() === '}') fail('行号 ' + s.line);
        // 已排好的部分确实是最终结果的前缀
        if (s.a.slice(0, s.sorted).join() !== want.slice(0, s.sorted).join()) fail('sorted = ' + s.sorted);
        if (s.cmp) {
          if (!(s.j! > s.i! && s.minIdx! >= s.i! && s.minIdx! < s.j!)) fail('i、j、minIdx 的位置');
          // minIdx 永远指着 i 到 j−1 里最小的（一样小取最前）
          if (s.minIdx !== minFrom(s.a.slice(0, s.j!), s.i!)) fail('minIdx 不是目前最小的');
        }
        if (s.swap && steps[t - 1].a[s.swap[1]] !== s.a[s.swap[0]]) fail('交换');
        if (t > 0 && s.compares - steps[t - 1].compares > 1) fail('比较次数跳了');
      }
      expect(bad).toEqual([]);
    }
  });

  it('步骤里的行号指向对应的代码', () => {
    expect(CODE[3]).toContain('var minIdx = i');
    expect(CODE[5]).toContain('arr[j] < arr[minIdx]');
    expect(CODE[6]).toContain('minIdx = j');
    expect(CODE[9]).toContain('minIdx != i');
    expect(CODE[10]).toContain('val tmp');
    const lines = new Set(buildTrace(genArray(8)).map((s) => s.line));
    for (const l of [2, 3, 4, 6, 10]) expect(lines.has(l)).toBe(true);
  });

  it('inversions 就是相邻交换（冒泡）的交换次数', () => {
    for (let k = 0; k < 500; k++) {
      const a = genArray(k % 10);
      const b = a.slice();
      let swaps = 0;
      for (let i = 0; i < b.length; i++) for (let j = 0; j + 1 < b.length - i; j++) if (b[j] > b[j + 1]) { [b[j], b[j + 1]] = [b[j + 1], b[j]]; swaps++; }
      expect(inversions(a)).toBe(swaps);
    }
  });
});

describe('选择排序 做：猜下一步', () => {
  it('rounds 和 buildTrace 走的是同一条路', () => {
    for (let k = 0; k < 2000; k++) {
      const a = genArray(2 + (k % 9), SHAPES[k % 4]);
      const rs = rounds(a);
      const steps = buildTrace(a);
      expect(rs).toHaveLength(a.length - 1);
      // 每一轮 minIdx 被改的次数 = 第 7 行出现的次数
      const perRound: number[] = [];
      for (const s of steps) {
        if (s.line === 4) perRound.push(0);
        if (s.line === 7) perRound[perRound.length - 1]++;
      }
      expect(rs.map((r) => r.updates)).toEqual(perRound);
      for (const r of rs) {
        expect(r.minIdx).toBe(minFrom(r.before, r.i));
        expect(r.updates).toBeLessThanOrEqual(a.length - 1 - r.i);
      }
      const startOfRound = steps.filter((s) => s.line === 4).map((s) => s.a);
      expect(rs.map((r) => r.before)).toEqual(startOfRound);
    }
  });
});

describe('选择排序 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都排错了，而正确代码能排好', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(last.outcome).toBe('ok');
      expect(last.a).not.toEqual(sortNum(b.values));
      expect(buildTrace(b.values).at(-1)!.a).toEqual(sortNum(b.values));
      expect(b.expect).toContain('[' + sortNum(b.values).join(', ') + ']');
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
        expect(b.code[s.line - 1].trim()).not.toBe('}');
      }
    }
    const byId = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!.a]));
    expect(byId['cmp-i']).toEqual([2, 1, 3, 4, 5]);
    expect(byId['j-zero']).toEqual([4, 3, 1, 2]);
    expect(byId['no-tmp']).toEqual([1, 1, 1, 2]);
  });

  it('bug 版本的执行会走到出错的那一行', () => {
    for (const b of BUGS) {
      const lines = new Set(runBug(b).map((s) => s.line));
      if (b.id !== 'j-zero') expect(lines.has(b.wrongLine)).toBe(true);
      else expect(runBug(b).some((s) => s.j === 0 && s.i! > 0)).toBe(true);
    }
  });
});

describe('选择排序 做：挑战', () => {
  /** 广度优先搜索：真正的最少交换次数 */
  function bfs(a: number[]): number {
    const goal = sortNum(a).join(',');
    let frontier = [a];
    const seen = new Set([a.join(',')]);
    for (let d = 0; ; d++) {
      if (frontier.some((x) => x.join(',') === goal)) return d;
      const next: number[][] = [];
      for (const x of frontier) {
        for (let p = 0; p < x.length; p++) for (let q = p + 1; q < x.length; q++) {
          const y = swapAt(x, p, q);
          const key = y.join(',');
          if (!seen.has(key)) { seen.add(key); next.push(y); }
        }
      }
      frontier = next;
    }
  }

  it('元素互不相同时，选择排序的交换次数就是最少交换次数', () => {
    for (let k = 0; k < 300; k++) {
      const a = genCandies(2 + (k % 5));
      const best = bfs(a);
      expect(fewestSwaps(a)).toBe(best);
      expect(selectionSwaps(a)).toBe(best);
    }
  });

  it('挑战题至少要换 3 次', () => {
    for (let k = 0; k < 500; k++) {
      const a = genPuzzle();
      expect(a).toHaveLength(PUZZLE_N);
      expect(new Set(a).size).toBe(PUZZLE_N);
      expect(selectionSwaps(a)).toBeGreaterThanOrEqual(3);
    }
  });
});
