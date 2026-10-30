import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_N, CODE, PREDICT_MAX, PREDICT_N, STORY_HAND, bugVerdict, buildTrace, countChoices, dealHand, genArray,
  genChallenge, genPredict, insertPos, inversions, isSorted, isStable, judgeGap, lookFrames, nearlySorted, nextAction,
  rounds, runBug, showCards, simulate, stars,
} from '../src/engine/insertion-sort';
import { mergeCopy, t } from '../src/core/i18n';
import type { Msg } from '../src/core/types';
import coreCopy from '../src/core/copy.zh.json';
import levelCopy from '../content/algorithms/insertion-sort/copy.zh.json';
import { seeded } from './helpers/seeded';

const copy = mergeCopy(coreCopy, levelCopy);
const T = (msg: Msg | string) => t(msg, copy);

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

describe('插入排序 看：小熊理纸牌', () => {
  it('绘本最后一页是排好的牌，挪动次数等于逆序对数', () => {
    for (let k = 0; k < 500; k++) {
      const values = k === 0 ? STORY_HAND : dealHand(2 + (k % 6));
      const frames = lookFrames(values);
      const last = frames.at(-1)!;
      expect(last.slots.map((id) => values[id!])).toEqual(sortNum(values));
      expect(T(last.say)).toContain('挪了 ' + inversions(values) + ' 次');
      expect(frames.filter((f) => T(f.say).includes('往右挪'))).toHaveLength(inversions(values));
      for (const f of frames) {
        // 每张牌要么在某个位置上，要么拿在手上，不多不少
        const ids = [...f.slots.filter((x) => x !== null), ...(f.held !== null ? [f.held] : [])].sort();
        expect(ids).toEqual(values.map((_, id) => id));
        // 拿着牌时，它悬在唯一的空位上方
        if (f.held !== null) {
          expect(f.slots.filter((x) => x === null)).toHaveLength(1);
          expect(f.slots[f.heldAt]).toBeNull();
        } else expect(f.slots).not.toContain(null);
        // 手里（空位除外）的牌是排好的
        const hand = f.slots.slice(0, f.inHand).filter((x) => x !== null).map((id) => values[id!]);
        expect(isSorted(hand)).toBe(true);
      }
    }
  });

  it('故事用的那手牌：17 页，挪 6 次', () => {
    expect(STORY_HAND).toEqual([4, 2, 5, 1, 3]);
    expect(lookFrames(STORY_HAND)).toHaveLength(17);
    expect(inversions(STORY_HAND)).toBe(6);
  });
});

describe('插入排序 玩', () => {
  it('发牌：点数不重复，在 1 到 9 之间', () => {
    for (let k = 0; k < 500; k++) {
      const h = dealHand(6);
      expect(new Set(h).size).toBe(6);
      for (const v of h) expect(v >= 1 && v <= 9).toBe(true);
    }
  });

  it('玩法一：只有一个空隙是对的，就是 insertPos；插错时左右至少一张牌会提醒', () => {
    for (let k = 0; k < 2000; k++) {
      const hand = sortNum(genArray(k % 8, 9));
      const key = 1 + Math.floor(Math.random() * 9);
      const pos = insertPos(hand, key);
      for (let g = 0; g <= hand.length; g++) {
        const j = judgeGap(hand, key, g);
        if (g === pos) expect(j.ok).toBe(true);
        if (!j.ok) expect(j.leftBig || j.rightSmall).toBe(true);
        if (j.ok) {
          const after = [...hand.slice(0, g), key, ...hand.slice(g)];
          expect(isSorted(after)).toBe(true);
        }
      }
    }
  });

  it('玩法二：照 nextAction 一步步做，就是插入排序，挪的次数等于逆序对数', () => {
    for (let k = 0; k < 1000; k++) {
      const values = dealHand(2 + (k % 6));
      const row = [...values];
      let shifts = 0;
      for (let i = 1; i < row.length; i++) {
        const key = row[i];
        let hole = i;
        while (nextAction(row, hole, key) === 'shift') {
          row[hole] = row[hole - 1];
          hole--;
          shifts++;
        }
        row[hole] = key;
      }
      expect(row).toEqual(sortNum(values));
      expect(shifts).toBe(inversions(values));
      expect(shifts).toBe(buildTrace(values).at(-1)!.moves);
    }
  });

  it('星星和数一数的选项', () => {
    expect([0, 1, 2, 3, 9].map(stars)).toEqual([3, 2, 2, 1, 1]);
    for (let a = 0; a < 30; a++) {
      const c = countChoices(a);
      expect(c).toHaveLength(3);
      expect(c).toContain(a);
      expect(new Set(c).size).toBe(3);
      for (const x of c) expect(x).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('插入排序 做：逐步执行', () => {
  it('3000 组随机数组：结果正确、稳定，比较和挪动次数对得上', () => {
    for (let k = 0; k < 3000; k++) {
      const n = k % 13;
      const values = k % 3 === 0 ? nearlySorted(Math.max(n, 2)) : genArray(n, k % 2 ? 5 : 30);
      const steps = buildTrace(values);
      const last = steps.at(-1)!;
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.done).toBe(true);
      expect(last.outcome).toBe('ok');
      expect(last.arr).toEqual(sortNum(values));
      expect(isStable(last.arr, last.ids)).toBe(true);
      expect(last.moves).toBe(inversions(values));
      expect(steps.filter((s) => s.line === 6)).toHaveLength(last.moves);
      expect(steps.filter((s) => s.line === 5 && s.cmp !== null)).toHaveLength(last.compares);
      // 比较次数在 n - 1 和 n(n-1)/2 之间
      const len = values.length;
      if (len > 1) {
        expect(last.compares).toBeGreaterThanOrEqual(len - 1);
        expect(last.compares).toBeLessThanOrEqual((len * (len - 1)) / 2);
      }
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        // 数组里的元素一直是原来那些（挪动时空位上留着旧值，key 在手上）
        if (s.key !== null && s.hole !== null) {
          const live = s.arr.filter((_, x) => x !== s.hole);
          expect(sortNum([...live, s.key])).toEqual(sortNum(values));
          // 空位就是 j + 1（刚挪完、j 还没减的那一步是 j）
          if (s.line === 6) expect(s.hole).toBe(s.j);
          else if (s.line !== 3) expect(s.hole).toBe(s.j! + 1);
        }
        // 前 sorted 个（空位除外）排好了
        const pre = s.arr.slice(0, s.sorted).filter((_, x) => x !== s.hole);
        expect(isSorted(pre)).toBe(true);
      }
    }
  });

  it('行号指向对应的代码', () => {
    const steps = buildTrace([5, 3, 8, 1]);
    for (const l of new Set(steps.map((s) => s.line))) expect(CODE[l - 1].trim()).not.toBe('}');
    expect(CODE[2]).toContain('val key = arr[i]');
    expect(CODE[4]).toContain('while (j >= 0 && arr[j] > key)');
    expect(CODE[5]).toContain('arr[j + 1] = arr[j]');
    expect(CODE[8]).toContain('arr[j + 1] = key');
  });

  it('有序数组一次都不挪，倒序数组挪 n(n-1)/2 次', () => {
    for (let n = 1; n < 30; n++) {
      const up = Array.from({ length: n }, (_, k) => k);
      expect(buildTrace(up).at(-1)!.moves).toBe(0);
      expect(buildTrace(up).at(-1)!.compares).toBe(n - 1);
      expect(buildTrace([...up].reverse()).at(-1)!.moves).toBe((n * (n - 1)) / 2);
    }
    expect(buildTrace([]).at(-1)!.done).toBe(true);
  });
});

describe('插入排序 做：猜下一步', () => {
  it('rounds 和 buildTrace 一致', () => {
    for (let k = 0; k < 2000; k++) {
      const values = genArray(2 + (k % 10), k % 2 ? 6 : 20);
      const rs = rounds(values);
      const steps = buildTrace(values);
      expect(rs).toHaveLength(values.length - 1);
      expect(rs.reduce((a, r) => a + r.moves, 0)).toBe(steps.at(-1)!.moves);
      expect(rs.reduce((a, r) => a + r.compares, 0)).toBe(steps.at(-1)!.compares);
      const placed = steps.filter((s) => s.line === 9).map((s) => s.cmp);
      expect(rs.map((r) => r.pos)).toEqual(placed);
      for (const r of rs) {
        // 比较次数 = 挪动次数 + 1，除非一路挪到了最前面
        expect(r.compares).toBe(r.moves + (r.pos > 0 ? 1 : 0));
        expect(r.pos).toBe(insertPos(r.before.slice(0, r.i), r.key));
      }
    }
  });
});

describe('插入排序 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示输入上都会出错，正确版本在同样的输入上不出错', () => {
    const out = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    expect(out.gt0.outcome).toBe('wrong');
    expect(out.gt0.arr).toEqual([4, 1, 2, 3, 5]);
    expect(out.ge.outcome).toBe('unstable');
    expect(out.ge.arr).toEqual([1, 2, 3, 3]);
    expect(out['write-j'].outcome).toBe('crash');
    expect(runBug(BUGS[2]).some((s) => T(s.note).includes('被盖掉'))).toBe(true);
    for (const b of BUGS) expect(buildTrace(b.values).at(-1)!.outcome).toBe('ok');
  });

  it('随机输入上 bug 版本确实会错（不只是演示输入），且不会死循环', () => {
    const bad = { gt0: 0, ge: 0, 'write-j': 0 };
    for (let k = 0; k < 500; k++) {
      const values = genArray(3 + (k % 6), 5);
      for (const b of BUGS) {
        const last = simulate(values, b.id).at(-1)!;
        expect(last.done).toBe(true);
        expect(last.outcome).not.toBe('stuck');
        if (last.outcome !== 'ok') bad[b.id]++;
        for (const s of simulate(values, b.id)) {
          expect(s.line).toBeGreaterThanOrEqual(1);
          expect(s.line).toBeLessThanOrEqual(b.code.length);
        }
      }
    }
    for (const c of Object.values(bad)) expect(c).toBeGreaterThan(100);
  });
});

describe('插入排序 做：挑战', () => {
  it('四组：几乎有序最快，倒序最慢，挪动次数等于逆序对数', () => {
    for (let k = 0; k < 300; k++) {
      const lanes = genChallenge();
      expect(lanes.map((l) => l.kind).sort()).toEqual(['nearly', 'random', 'reversed', 'tail']);
      const moves = Object.fromEntries(lanes.map((l) => [l.kind, buildTrace(l.values).at(-1)!.moves]));
      for (const l of lanes) {
        expect(sortNum(l.values)).toEqual(Array.from({ length: CHALLENGE_N }, (_, x) => x + 1));
        expect(moves[l.kind]).toBe(inversions(l.values));
      }
      expect(moves.nearly).toBe(2);
      expect(moves.tail).toBe(CHALLENGE_N - 1);
      expect(moves.reversed).toBe((CHALLENGE_N * (CHALLENGE_N - 1)) / 2);
      expect(moves.random).toBeGreaterThan(moves.tail);
      expect(moves.random).toBeLessThan(moves.reversed);
      // 比赛按步数排名：几乎有序 < 最后一个最小 < 随机 < 倒序，没有并列
      const len = Object.fromEntries(lanes.map((l) => [l.kind, buildTrace(l.values).length]));
      expect(len.nearly).toBeLessThan(len.tail);
      expect(len.tail).toBeLessThan(len.random);
      expect(len.random).toBeLessThan(len.reversed);
    }
  });
});

describe('插入排序 引擎：台词、解释和固定种子出题', () => {
  it('lookFrames：每页有台词，固定种子发的牌最后一页排好', () => {
    const r = seeded(31);
    for (let k = 0; k < 100; k++) {
      const hand = dealHand(5, r);
      const fs = lookFrames(hand);
      expect(fs.every((f) => T(f.say).length > 0)).toBe(true);
      expect(fs.at(-1)!.slots.map((id) => hand[id!])).toEqual(sortNum(hand));
    }
  });

  it('dealHand：固定种子可复现', () => {
    expect(dealHand(6, seeded(2))).toEqual(dealHand(6, seeded(2)));
    expect(dealHand(6, seeded(2))).not.toEqual(dealHand(6, seeded(3)));
  });

  it('genPredict：固定种子可复现，长度和范围对', () => {
    expect(genPredict(seeded(5))).toEqual(genPredict(seeded(5)));
    const r = seeded(6);
    for (let k = 0; k < 100; k++) {
      const a = genPredict(r);
      expect(a).toHaveLength(PREDICT_N);
      for (const v of a) expect(v >= 1 && v <= PREDICT_MAX).toBe(true);
    }
  });

  it('rounds 的解释写着真实的下标和次数', () => {
    const r = seeded(14);
    for (let k = 0; k < 200; k++) {
      for (const rd of rounds(genPredict(r))) {
        expect(T(rd.whyPos)).toContain('key 落在下标 ' + rd.pos);
        expect(T(rd.why)).toContain('一共 ' + rd.compares + ' 次');
        expect(T(rd.why)).toContain('挪了 ' + rd.moves + ' 次');
      }
    }
  });

  it('bugVerdict：没跑完是 null，跑完按结果写', () => {
    const text = Object.fromEntries(BUGS.map((b) => [b.id, T(bugVerdict(runBug(b).at(-1)!, b)!)]));
    for (const b of BUGS) expect(bugVerdict(runBug(b)[0], b)).toBeNull();
    expect(text.gt0).toBe('❌ 结果 [4, 1, 2, 3, 5]，没排好');
    expect(text.ge).toContain('不稳定');
    expect(text.ge).toContain('3♥');
    expect(text['write-j']).toBe('💥 下标越界，程序崩溃');
    expect(T(bugVerdict(buildTrace([2, 1]).at(-1)!, BUGS[0])!)).toBe('✅ 排好了');
    expect(showCards([3, 1], [0, 1], true)).toBe('[3♥, 1♠]');
  });

  it('genChallenge：固定种子可复现', () => {
    expect(genChallenge(seeded(9))).toEqual(genChallenge(seeded(9)));
    expect(genChallenge(seeded(9))[0].values).toHaveLength(CHALLENGE_N);
  });
});
