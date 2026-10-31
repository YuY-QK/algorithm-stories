import { describe, expect, it } from 'vitest';
import {
  BUGS, CODE, FIND_LEVELS, GRID_COLS, GRID_ROWS, GUESS_LEVELS, KID_N,
  allPaths, bugVerdict, buildTrace, callTree, canHop, cellHint, cellsToFill, flatten, genChallenge, genPredict, gridStars, gridTable,
  lookFrames, memoCalls, naiveCalls, noteOptions, pathKey, playStars, randomRocks, rounds,
  runBug, twinOf, valueOptions, ways, waysTable, whyFrom,
} from '../src/engine/dynamic-programming';
import { mergeCopy, t } from '../src/core/i18n';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/dynamic-programming/copy.zh.json';
import type { Msg } from '../src/core/types';
import { seeded } from './helpers/seeded';

const copy = mergeCopy(coreCopy, levelCopy);
/** Msg 填成文字，断言台词内容用 */
const T = (msg: Msg | null) => t(msg ?? { key: 'none' }, copy);

describe('动态规划 看、玩：小兔子爬楼梯', () => {
  it('跳法数：1, 1, 2, 3, 5, 8, 13', () => {
    expect(waysTable(KID_N)).toEqual([1, 1, 2, 3, 5, 8, 13]);
    for (let n = 2; n < 60; n++) expect(ways(n)).toBe(ways(n - 1) + ways(n - 2));
  });

  it('allPaths 列出所有跳法：个数对、不重复、每种加起来正好是 n', () => {
    for (let n = 0; n <= 10; n++) {
      const ps = allPaths(n);
      expect(ps).toHaveLength(ways(n));
      expect(new Set(ps.map(pathKey)).size).toBe(ps.length);
      for (const p of ps) {
        expect(p.reduce((a, b) => a + b, 0)).toBe(n);
        expect(p.every((h) => h === 1 || h === 2)).toBe(true);
      }
    }
    expect(allPaths(3).map(pathKey)).toEqual(['1,1,1', '1,2', '2,1']);
  });

  it('allPaths(n) 的最后一步：不是从 n-1 来，就是从 n-2 来', () => {
    for (let n = 2; n <= 10; n++) {
      const ps = allPaths(n);
      const last1 = ps.filter((p) => p.at(-1) === 1).length;
      const last2 = ps.filter((p) => p.at(-1) === 2).length;
      expect(last1).toBe(ways(n - 1));
      expect(last2).toBe(ways(n - 2));
    }
  });

  it('canHop：不能跳过头', () => {
    expect(canHop(3, [], 2)).toBe(true);
    expect(canHop(3, [2], 2)).toBe(false);
    expect(canHop(3, [2], 1)).toBe(true);
    expect(canHop(1, [], 2)).toBe(false);
  });

  it('绘本：便签一张一张贴上，数字和 ways 一致', () => {
    const frames = lookFrames(KID_N);
    expect(frames.length).toBeGreaterThanOrEqual(5);
    expect(frames.length).toBeLessThanOrEqual(12);
    const t = waysTable(KID_N);
    for (const f of frames) {
      expect(f.notes).toHaveLength(KID_N + 1);
      f.notes.forEach((v, k) => v !== null && expect(v).toBe(t[k]));
      expect(f.bunny).toBeGreaterThanOrEqual(0);
      expect(f.bunny).toBeLessThanOrEqual(KID_N);
      // 高亮的台阶就是它的便签来源，数字要已经写好
      for (const h of f.from) expect(f.notes[h]).not.toBeNull();
      // 每个画面一行字
      expect(T(f.say)).not.toContain('\n');
      expect(T(f.say)).not.toContain('⟦');
    }
    expect(frames.at(-1)!.notes).toEqual(t);
    // 便签只增不减
    for (let k = 1; k < frames.length; k++) {
      frames[k].notes.forEach((v, i) => frames[k - 1].notes[i] !== null && expect(v).toBe(frames[k - 1].notes[i]));
    }
  });

  it('玩法一的关卡：先自己数 1～3 级，再猜 4～6 级，选项里有正确答案且各不相同', () => {
    expect(FIND_LEVELS).toEqual([1, 2, 3]);
    expect(GUESS_LEVELS).toEqual([4, 5, 6]);
    for (let level = 2; level <= 12; level++) {
      const o = noteOptions(level);
      expect(o).toContain(ways(level));
      expect(o).toHaveLength(4);
      expect(new Set(o).size).toBe(4);
      expect(o.every((x) => x > 0)).toBe(true);
    }
  });

  it('星星', () => {
    expect([0, 1, 2, 3, 9].map(playStars)).toEqual([3, 2, 2, 1, 1]);
  });
});

describe('动态规划 玩：便签有多省事', () => {
  it('不用便签的调用次数 = 2·ways(n) − 1，调用树的节点数一致', () => {
    for (let n = 0; n <= 12; n++) {
      const all = flatten(callTree(n));
      expect(all).toHaveLength(naiveCalls(n));
      expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    }
    expect([2, 3, 4, 5, 6].map(naiveCalls)).toEqual([3, 5, 9, 15, 25]);
  });

  it('用便签：真正要算的和抄便签的合起来 2n − 1 次', () => {
    for (let n = 1; n <= 14; n++) {
      const all = flatten(callTree(n));
      const real = all.filter((x) => x.kind !== 'skipped');
      expect(real).toHaveLength(memoCalls(n));
      // 每一级（≥2）只算一次，其余是抄便签
      for (let k = 2; k <= n; k++) {
        const same = real.filter((x) => x.n === k);
        expect(same.filter((x) => x.kind === 'call')).toHaveLength(1);
        expect(same.filter((x) => x.kind === 'lookup')).toHaveLength(k === n ? 0 : same.length - 1);
      }
    }
  });

  it('n=5：恰好有两处可以抄便签，而且 lookup 的下面全是 skipped', () => {
    const root = callTree(5);
    const looks = flatten(root).filter((x) => x.kind === 'lookup');
    expect(looks.map((x) => x.n).sort()).toEqual([2, 3]);
    for (const l of looks) {
      for (const d of flatten(l).slice(1)) expect(d.kind).toBe('skipped');
      const twin = flatten(root).find((x) => x.id === twinOf(root, l.id))!;
      expect(twin.n).toBe(l.n);
      expect(twin.kind).toBe('call');
      expect(twin.id).toBeLessThan(l.id);
    }
  });

  it('n=30：不用便签两百多万次，用便签 59 次', () => {
    expect(naiveCalls(30)).toBe(2_692_537);
    expect(memoCalls(30)).toBe(59);
  });
});

describe('动态规划 做：逐步执行', () => {
  it('每个 n 的最终结果和每一步的 dp 表都对', () => {
    for (let n = 2; n <= 40; n++) {
      const steps = buildTrace(n);
      const t = waysTable(n);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.result).toBe(t[n]);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(CODE[s.line - 1].trim()).not.toBe('}');
        // 填过的格子是对的，没填的是空
        s.dp.forEach((v, k) => {
          if (v !== null) expect(v).toBe(t[k]);
        });
        if (s.line === 6) {
          expect(s.dp[s.i!]).toBe(s.dp[s.i! - 1]! + s.dp[s.i! - 2]!);
          expect(s.from).toEqual([s.i! - 1, s.i! - 2]);
        }
      }
      // dp 表只增不减
      for (let k = 1; k < steps.length; k++) {
        steps[k - 1].dp.forEach((v, i) => v !== null && expect(steps[k].dp[i]).toBe(v));
      }
    }
  });

  it('行号指向对应的代码', () => {
    expect(CODE[5]).toContain('dp[i] = dp[i - 1] + dp[i - 2]');
    expect(CODE[7]).toContain('return dp[n]');
    const lines = new Set(buildTrace(6).map((s) => s.line));
    expect([...lines].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 8]);
  });
});

describe('动态规划 做：猜下一步', () => {
  it('每一题：来源是前两格，答案和选项都对，填之前的表没有答案', () => {
    for (let n = 2; n <= 20; n++) {
      const rs = rounds(n);
      expect(rs).toHaveLength(n - 1);
      for (const r of rs) {
        expect(r.from).toEqual([r.i - 1, r.i - 2]);
        expect(r.value).toBe(r.dp[r.i - 1]! + r.dp[r.i - 2]!);
        expect(r.dp[r.i]).toBeNull();
        expect(r.dp.slice(0, r.i).every((v) => v !== null)).toBe(true);
        const o = valueOptions(r);
        expect(o).toContain(r.value);
        expect(o).toHaveLength(4);
        expect(new Set(o).size).toBe(4);
      }
    }
  });

  it('每题带 options 和 why：options 就是 valueOptions，why 写出两格相加的算式；whyFrom 区分「还空着」和「不是前两格」', () => {
    for (let n = 2; n <= 12; n++) {
      for (const r of rounds(n)) {
        expect(r.options).toEqual(valueOptions(r));
        expect(T(r.why)).toBe('dp[' + r.i + '] = dp[' + (r.i - 1) + '] + dp[' + (r.i - 2) + '] = ' + r.dp[r.i - 1] + ' + ' + r.dp[r.i - 2] + ' = ' + r.value + '。两格都要加上，一格也不能少。');
        expect(T(whyFrom(r, r.i))).toContain('还空着');
        if (r.i >= 3) expect(T(whyFrom(r, 0))).toContain('紧挨着的前两格');
      }
    }
  });

  it('genPredict：固定种子结果固定，n 在 6～10', () => {
    expect(genPredict(seeded(3))).toBe(genPredict(seeded(3)));
    for (let k = 0; k < 300; k++) {
      const n = genPredict(seeded(k));
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(10);
    }
    expect(genPredict(() => 0)).toBe(6);
    expect(genPredict(() => 0.999999)).toBe(10);
  });

  it('rounds 和 buildTrace 填的是同一批数', () => {
    for (let n = 2; n <= 15; n++) {
      const filled = buildTrace(n).filter((s) => s.line === 6).map((s) => s.dp[s.i!]);
      expect(rounds(n).map((r) => r.value)).toEqual(filled);
    }
  });
});

describe('动态规划 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
      expect(b.code).toHaveLength(CODE.length);
    }
  });

  it('每个坑在演示输入上都会出错', () => {
    const last = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(last.init.outcome).toBe('wrong');
    expect(last.init.result).toBe(5); // 少一个，应该是 8（ways(5)）。dp 表 0,1,1,2,3,5
    expect(last.from1.outcome).toBe('crash');
    expect(last.size.outcome).toBe('crash');
    for (const b of BUGS) expect(runBug(b).at(-1)!.done).toBe(true);
  });

  it('同一份输入，改对的版本结果正确（用 buildTrace / ways 对照）', () => {
    expect(ways(BUGS.find((b) => b.id === 'init')!.n)).toBe(8);
    expect(buildTrace(BUGS.find((b) => b.id === 'init')!.n).at(-1)!.result).toBe(8);
  });

  it('bugVerdict：没跑完是空，跑完按结果说话', () => {
    for (const b of BUGS) {
      const tr = runBug(b);
      for (const st of tr.slice(0, -1)) expect(bugVerdict(st, b)).toBeNull();
    }
    const v = Object.fromEntries(BUGS.map((b) => [b.id, T(bugVerdict(runBug(b).at(-1)!, b))]));
    expect(v.init).toBe('❌ 返回了 5，不对');
    expect(v.from1).toContain('下标越界');
    expect(v.size).toContain('下标越界');
  });

  it('runBug 的行号都在 bug 版代码里', () => {
    for (const b of BUGS) {
      for (const s of runBug(b)) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
    }
  });

  it('初始值写错：随便哪个 n ≥ 2 都会错，n 是几错多少', () => {
    for (let n = 2; n <= 15; n++) {
      const bug = { ...BUGS[0], n };
      const end = runBug(bug).at(-1)!;
      expect(end.outcome).toBe('wrong');
      expect(end.result).toBe(ways(n - 1)); // 整张表向后错了一位
    }
  });
});

describe('动态规划 做：挑战（网格数路线）', () => {
  // 完全独立的写法核对：记忆化递归
  function count(rocks: boolean[][], r: number, c: number, memo = new Map<string, number>()): number {
    if (r < 0 || c < 0 || rocks[r][c]) return 0;
    if (r === 0 && c === 0) return 1;
    const key = r + ',' + c;
    if (!memo.has(key)) memo.set(key, count(rocks, r - 1, c, memo) + count(rocks, r, c - 1, memo));
    return memo.get(key)!;
  }

  it('gridTable 和记忆化递归一致，随机网格', () => {
    for (let k = 0; k < 500; k++) {
      const rows = 2 + (k % 5);
      const cols = 2 + ((k >> 2) % 5);
      const rocks = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (r + c > 0 && r + c < rows + cols - 2 && Math.random() < 0.25)));
      const t = gridTable(rocks);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) expect(t[r][c]).toBe(count(rocks, r, c));
    }
  });

  it('没有石头时就是组合数 C(r+c, r)', () => {
    const rocks = Array.from({ length: 4 }, () => Array(5).fill(false));
    const t = gridTable(rocks);
    expect(t[3][4]).toBe(35); // C(7, 3)
    expect(t[1][1]).toBe(2);
  });

  it('randomRocks：两块石头在中间，第一行第一列都是 1，终点有路，要填的格子不含石头', () => {
    for (let k = 0; k < 2000; k++) {
      const rocks = randomRocks();
      expect(rocks).toHaveLength(GRID_ROWS);
      expect(rocks[0]).toHaveLength(GRID_COLS);
      expect(rocks.flat().filter(Boolean)).toHaveLength(2);
      const t = gridTable(rocks);
      expect(rocks[0].every((x) => !x)).toBe(true);
      expect(rocks.every((row) => !row[0])).toBe(true);
      expect(rocks[GRID_ROWS - 1][GRID_COLS - 1]).toBe(false);
      for (let c = 0; c < GRID_COLS; c++) expect(t[0][c]).toBe(1);
      for (let r = 0; r < GRID_ROWS; r++) expect(t[r][0]).toBe(1);
      expect(t[GRID_ROWS - 1][GRID_COLS - 1]).toBeGreaterThan(0);
      const cells = cellsToFill(rocks);
      expect(cells).toHaveLength((GRID_ROWS - 1) * (GRID_COLS - 1) - 2);
      for (const [r, c] of cells) {
        expect(rocks[r][c]).toBe(false);
        expect(t[r][c]).toBe(t[r - 1][c] + t[r][c - 1]);
        expect(T(cellHint(rocks, r, c))).toContain('= ' + t[r][c]);
      }
      // 按顺序填，填到某格时它上面和左边都已经填好
      const order = new Set(cells.map(([r, c]) => r + ',' + c));
      cells.forEach(([r, c], i) => {
        const before = new Set(cells.slice(0, i).map(([a, b]) => a + ',' + b));
        for (const [pr, pc] of [[r - 1, c], [r, c - 1]]) {
          const k2 = pr + ',' + pc;
          if (order.has(k2)) expect(before.has(k2)).toBe(true);
        }
      });
    }
  });

  it('genChallenge：固定种子结果固定，和 randomRocks 同一批地图', () => {
    expect(genChallenge(seeded(5))).toEqual(genChallenge(seeded(5)));
    expect(genChallenge(seeded(5))).toEqual(randomRocks(seeded(5)));
    for (let k = 0; k < 200; k++) {
      const rocks = genChallenge(seeded(k));
      expect(rocks.flat().filter(Boolean)).toHaveLength(2);
      expect(gridTable(rocks)[GRID_ROWS - 1][GRID_COLS - 1]).toBeGreaterThan(0);
    }
  });

  it('星星', () => {
    expect([0, 1, 3, 4].map(gridStars)).toEqual([3, 2, 2, 1]);
  });
});
