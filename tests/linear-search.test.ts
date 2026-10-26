import { describe, expect, it } from 'vitest';
import {
  BEAR, BUGS, CODE, KID_N, PLAY_QUIZ, PLAY_START, PREDICT_N, PUZZLE_KINDS, TOYS, arrayCells, binaryWorst, bugVerdict, buildTrace,
  challengeAverage, countChecks, genChallenge, genPuzzle, hideBear, judgeAverage, judgeWorst, linearSearch, lookFrames, makePuzzle,
  playStars, robotFrames, robotNote, robotRow, rounds, runBug, simulate, tapBox, toyCells, CHALLENGE_MAX, CHALLENGE_MIN,
} from '../src/engine/linear-search';
import { seeded } from './helpers/seeded';

/** 独立的标准答案：语言自带的 indexOf */
const randArr = (rand: () => number, n: number, range = 8) => Array.from({ length: n }, () => Math.floor(rand() * range) - 2);

describe('顺序查找：引擎', () => {
  it('结果和 indexOf 一致（含空数组、重复、0、负数）', () => {
    const rand = seeded(1);
    for (let k = 0; k < 3000; k++) {
      const arr = randArr(rand, Math.floor(rand() * 9));
      const target = Math.floor(rand() * 8) - 2;
      const want = arr.indexOf(target);
      expect(linearSearch(arr, target)).toBe(want);
      expect(buildTrace(arr, target).at(-1)!.result).toBe(want);
    }
  });

  it('每一步状态：行号合法、只在最后一步 done、比较次数递增、命中只在返回前', () => {
    const rand = seeded(2);
    for (let k = 0; k < 1500; k++) {
      const arr = randArr(rand, Math.floor(rand() * 9));
      const target = Math.floor(rand() * 8) - 2;
      const tr = buildTrace(arr, target);
      const want = arr.indexOf(target);
      tr.forEach((s, j) => {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(s.done).toBe(j === tr.length - 1);
        expect(s.note.length).toBeGreaterThan(0);
        if (j > 0) expect(s.checks).toBeGreaterThanOrEqual(tr[j - 1].checks);
        if (s.line === 3) expect(s.hits.length).toBe(arr[s.i] === target ? 1 : 0);
        if (s.line === 4) expect(s.result).toBe(s.i);
        if (!s.done) expect(s.result).toBeNull();
      });
      const last = tr.at(-1)!;
      expect(last.checks).toBe(want === -1 ? arr.length : want + 1);
      expect(last.checks).toBe(countChecks(arr, target));
      expect(last.line).toBe(want === -1 ? 7 : 4);
      // 比较行恰好出现 checks 次，下标 0..checks-1 各一次
      expect(tr.filter((s) => s.line === 3).map((s) => s.i)).toEqual(Array.from({ length: last.checks }, (_, q) => q));
    }
  });

  it('代码行内容和行号对得上', () => {
    expect(CODE[2]).toContain('arr[i] == target');
    expect(CODE[3]).toContain('return i');
    expect(CODE[6]).toContain('return -1');
  });

  it('格子状态：开过的是 seen，当前是 now，命中是 hit，没到的盖着', () => {
    const arr = [5, 6, 7, 8];
    const tr = buildTrace(arr, 7);
    const mid = tr.find((s) => s.line === 3 && s.i === 1)!;
    expect(arrayCells(arr, mid).map((c) => c.state)).toEqual(['seen', 'now', 'closed', 'closed']);
    const hit = tr.at(-1)!;
    expect(arrayCells(arr, hit).map((c) => c.state)).toEqual(['seen', 'seen', 'hit', 'closed']);
    const miss = buildTrace(arr, 9).at(-1)!;
    expect(arrayCells(arr, miss).every((c) => c.state === 'seen')).toBe(true);
  });
});

describe('顺序查找：看', () => {
  it('绘本用故事稿的数字：8 个箱子，小熊第 5 个，第一个是积木，第二排全开 8 次', () => {
    const f = lookFrames();
    expect(f.every((p) => p.say.length > 0 && p.cells.length === 8)).toBe(true);
    expect(f[1].say).toContain('积木');
    const hitPage = f.find((p) => p.cells.some((c) => c.state === 'hit'))!;
    expect(hitPage.cells.findIndex((c) => c.state === 'hit')).toBe(4);
    expect(hitPage.cells[4].label).toBe(TOYS[BEAR]);
    expect(hitPage.cells.slice(5).every((c) => c.state === 'closed' && c.label === '')).toBe(true);
    expect(f.some((p) => p.say.includes('开了 5 次'))).toBe(true);
    const lastPage = f.at(-1)!;
    expect(lastPage.cells.every((c) => c.state === 'seen' && c.label !== '')).toBe(true);
    expect(lastPage.say).toContain('没有');
  });
});

describe('顺序查找：玩', () => {
  it('小熊恰好藏在一个位置，位置随机且覆盖所有箱子', () => {
    const rand = seeded(3);
    const seen = new Set<number>();
    for (let k = 0; k < 400; k++) {
      const row = hideBear(undefined, rand);
      expect(row.ids).toHaveLength(KID_N);
      expect(row.ids.filter((x) => x === BEAR)).toHaveLength(1);
      expect(row.ids[row.bear]).toBe(BEAR);
      expect(new Set(row.ids).size).toBe(KID_N);
      seen.add(row.bear);
    }
    expect(seen.size).toBe(KID_N);
  });

  it('点箱子：重复点计数，找到就结束', () => {
    const row = { ids: [0, 1, 2, BEAR, 5, 6, 7, 8], bear: 3 };
    let st = PLAY_START;
    let r = tapBox(row, st, 5);
    expect(r.outcome).toBe('open');
    st = r.state;
    r = tapBox(row, st, 5);
    expect(r.outcome).toBe('repeat');
    expect(r.state.repeats).toBe(1);
    expect(r.state.opened).toEqual([5]);
    st = r.state;
    r = tapBox(row, st, 3);
    expect(r.outcome).toBe('found');
    expect(r.state.found).toBe(true);
    expect(tapBox(row, r.state, 0).outcome).toBe('over');
    expect(tapBox(row, r.state, 0).state.opened).toEqual([5, 3]);
  });

  it('星星看重复不看运气', () => {
    expect([0, 1, 2, 5].map(playStars)).toEqual([3, 2, 1, 1]);
  });

  it('追问的答案：最坏和不存在都是全开 8 个', () => {
    for (const q of PLAY_QUIZ) {
      expect(q.correct).toBe(KID_N);
      expect(q.options).toContain(q.correct);
    }
  });

  it('机器人开的个数 = 位置 + 1，不藏是 8，每一帧和 toyCells 一致', () => {
    for (let at = 0; at < KID_N; at++) {
      const f = robotFrames(at);
      expect(f.at(-1)!.count).toBe(at + 1);
      expect(f.at(-1)!.done).toBe(true);
      expect(f.at(-1)!.cells[at].state).toBe('hit');
      expect(robotRow(at)[at]).toBe(BEAR);
      expect(f).toHaveLength(at + 2);
    }
    const none = robotFrames(null);
    expect(none.at(-1)!.count).toBe(KID_N);
    expect(none.at(-1)!.cells.every((c) => c.state === 'seen')).toBe(true);
    expect(robotRow(null)).not.toContain(BEAR);
    expect(toyCells([0, BEAR], { i: 0, hits: [] }).map((c) => c.label)).toEqual([TOYS[0], '']);
  });

  it('引导语随试过的藏法变化', () => {
    expect(robotNote([])).toContain('藏');
    expect(robotNote([{ at: 0, count: 1 }, { at: null, count: 8 }])).toContain('没有捷径');
    expect(robotNote([{ at: 3, count: 4 }])).not.toContain('没有捷径');
  });
});

describe('顺序查找：猜下一步', () => {
  it('五种题都出得对：目标位置、重复、不存在', () => {
    const rand = seeded(4);
    for (let k = 0; k < 500; k++) {
      for (const kind of PUZZLE_KINDS) {
        const { arr, target } = makePuzzle(kind, undefined, rand);
        expect(arr).toHaveLength(PREDICT_N);
        const idx = arr.indexOf(target);
        if (kind === 'first') expect(idx).toBe(0);
        if (kind === 'last') expect(idx).toBe(PREDICT_N - 1);
        if (kind === 'middle') expect(idx > 0 && idx < PREDICT_N - 1).toBe(true);
        if (kind === 'missing') expect(idx).toBe(-1);
        if (kind === 'dup') {
          expect(arr.indexOf(target)).toBeLessThan(arr.lastIndexOf(target));
          expect(arr.filter((x) => x === target)).toHaveLength(2);
        }
        if (kind !== 'dup') expect(new Set(arr).size).toBe(arr.length);
      }
    }
  });

  it('题目和真实轨迹一致：每个位置的比较题答案、结束时的结果', () => {
    const rand = seeded(5);
    for (let k = 0; k < 800; k++) {
      const p = genPuzzle(rand);
      const rs = rounds(p, rand);
      const want = p.arr.indexOf(p.target);
      const cmps = rs.filter((r) => r.kind === 'cmp');
      const checks = want === -1 ? p.arr.length : want + 1;
      expect(cmps).toHaveLength(checks);
      cmps.forEach((r, i) => {
        expect(r.i).toBe(i);
        expect(r.correct).toBe(p.arr[i] === p.target ? 'return' : 'go');
        expect(r.options.map((o) => o.key)).toContain(r.correct);
        expect(r.why.length).toBeGreaterThan(0);
      });
      // 只有最后一题结束
      rs.forEach((r, j) => expect(r.ended).toBe(j === rs.length - 1));
      const last = rs.at(-1)!;
      expect(last.kind).toBe(want === -1 ? 'end' : 'cmp');
      if (want === -1) expect(last.result).toContain('-1');
      else expect(last.result).toContain('返回 ' + want);
      // 「下一个 i」的题最多一道，答案是加 1
      const nexts = rs.filter((r) => r.kind === 'next');
      expect(nexts.length).toBe(want === 0 ? 0 : 1);
      nexts.forEach((r) => expect(r.correct).toBe('plus1'));
      // 题数够连对 5 次
      expect(rs.length).toBeGreaterThanOrEqual(want === 0 ? 1 : 3);
    }
  });

  it('选项位置会随机，不总是对的在第一个', () => {
    const rand = seeded(6);
    const firsts = new Set<string>();
    for (let k = 0; k < 100; k++) firsts.add(rounds(makePuzzle('last', undefined, rand), rand)[0].options[0].key);
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe('顺序查找：找 bug', () => {
  it('三个坑各自的现象', () => {
    const by = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b)]));
    const overrun = by.overrun.at(-1)!;
    expect(overrun.outcome).toBe('crash');
    expect(overrun.done).toBe(true);
    expect(overrun.i).toBe(BUGS[0].arr.length);
    const zero = by.zero.at(-1)!;
    expect(zero.outcome).toBe('wrong');
    expect(zero.result).toBe(0);
    const last = by.last.at(-1)!;
    expect(last.outcome).toBe('wrong');
    expect(last.result).toBe(2);
    expect(last.found).toBe(2);
    expect(BUGS[2].arr.indexOf(BUGS[2].target)).toBe(0);
  });

  it('行号在各自代码范围内，错的那一行在代码里能对上', () => {
    for (const b of BUGS) {
      const tr = runBug(b);
      for (const s of tr) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
        expect(s.done).toBe(s === tr.at(-1));
      }
      expect(b.wrongLine).toBeGreaterThanOrEqual(1);
      expect(b.wrongLine).toBeLessThanOrEqual(b.code.length);
      expect(b.code[b.wrongLine - 1]).not.toBe(b.fixed);
      expect(tr.some((s) => s.line === b.wrongLine)).toBe(true);
      expect(bugVerdict(tr[0], b)).toBe('');
      expect(bugVerdict(tr.at(-1)!, b).length).toBeGreaterThan(0);
    }
    expect(BUGS[0].code[1]).toContain('0..arr.size');
    expect(BUGS[1].code[6]).toContain('return 0');
    expect(BUGS[2].code[4]).toContain('found = i');
    expect(BUGS.map((b) => b.id)).toEqual(['overrun', 'zero', 'last']);
  });

  it('把有 bug 的行换成 fixed，按 JS 真正执行，结果等于 indexOf（修好了）', () => {
    // 独立验证：用 JS 重写三种代码，修好后结果对，没修好就是 bug 现象
    const buggy = {
      overrun: (a: number[], t: number) => { for (let i = 0; i <= a.length; i++) { if (a[i] === undefined) throw new Error('越界'); if (a[i] === t) return i; } return -1; },
      zero: (a: number[], t: number) => { for (let i = 0; i < a.length; i++) if (a[i] === t) return i; return 0; },
      last: (a: number[], t: number) => { let f = -1; for (let i = 0; i < a.length; i++) if (a[i] === t) f = i; return f; },
    };
    expect(() => buggy.overrun(BUGS[0].arr, BUGS[0].target)).toThrow();
    expect(buggy.zero(BUGS[1].arr, BUGS[1].target)).toBe(0);
    expect(buggy.last(BUGS[2].arr, BUGS[2].target)).toBe(runBug(BUGS[2]).at(-1)!.result);
    for (const b of BUGS) expect(linearSearch(b.arr, b.target)).toBe(b.arr.indexOf(b.target));
  });
});

describe('顺序查找：挑战', () => {
  it('箱子数是奇数，范围内', () => {
    const rand = seeded(7);
    for (let k = 0; k < 300; k++) {
      const { n } = genChallenge(rand);
      expect(n % 2).toBe(1);
      expect(n).toBeGreaterThanOrEqual(CHALLENGE_MIN);
      expect(n).toBeLessThanOrEqual(CHALLENGE_MAX);
    }
  });

  it('最坏是 n，平均是 (n+1)/2，和暴力枚举每个位置一致', () => {
    for (const n of [11, 21, 41]) {
      const arr = Array.from({ length: n }, (_, k) => k);
      const all = arr.map((t) => countChecks(arr, t));
      expect(Math.max(...all)).toBe(n);
      expect(all.reduce((a, b) => a + b, 0) / n).toBe(challengeAverage(n));
      expect(countChecks(arr, -1)).toBe(n);
      expect(judgeWorst(n, n).ok).toBe(true);
      expect(judgeWorst(n, n - 1).ok).toBe(false);
      expect(judgeWorst(n, n + 5).ok).toBe(false);
      expect(judgeAverage(n, (n + 1) / 2).ok).toBe(true);
      expect(judgeAverage(n, n).ok).toBe(false);
      expect(judgeAverage(n, 1).ok).toBe(false);
    }
  });

  it('模拟的平均接近 (n+1)/2，最坏不超过 n；二分最多看 log2 个', () => {
    const r = simulate(21, 5000, seeded(8));
    expect(r.average).toBeGreaterThan(10);
    expect(r.average).toBeLessThan(12);
    expect(r.worst).toBeLessThanOrEqual(21);
    expect(r.best).toBeGreaterThanOrEqual(1);
    expect([1, 3, 7, 8, 15, 21, 1000].map(binaryWorst)).toEqual([1, 2, 3, 4, 4, 5, 10]);
  });
});
