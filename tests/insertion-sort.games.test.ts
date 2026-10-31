import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { MOVE_NEXT, MOVE_SETTLE, MOVE_STEP, RACE_STRIDE, RACE_TICK } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_N, PLACE_N, SHIFT_N, bugVerdict, buildTrace, challengeRules, countChoices, dealHand, insertPos, inversions, laneDone, level, makePuzzle,
  placeHand, placeRules, placeView, raceFastest, raceRanks, raceSlowest, shiftRules, traceRules, makeValues,
  type PlaceGame, type RaceState, type ShiftAction, type ShiftGame,
} from '../src/engine/insertion-sort';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「找位置」', () => {
  /** 当前这张牌正确的空隙 */
  const rightGap = (g: PlaceGame) => insertPos(placeHand(g), g.values[g.i]);
  /** 一直答对，走完整局；wrongAt 里的轮次先点一个错的空隙 */
  function playThrough(seed: number, wrongAt: number[] = []) {
    const d = driver(placeRules, seeded(seed));
    let round = 0;
    let guard = 0;
    while (!placeRules.result!(d.state) && guard++ < 100) {
      const g = d.state;
      if (g.phase !== 'pick') break;
      const good = rightGap(g);
      if (wrongAt.includes(round++)) {
        const bad = Array.from({ length: g.i + 1 }, (_, x) => x).find((x) => x !== good)!;
        d.act({ type: 'gap', g: bad });
      }
      d.act({ type: 'gap', g: good });
      d.settle();
    }
    return d;
  }

  it('开局：发 6 张牌，第 2 张拿在手上，台词报出它的点数；每个空隙都能点', () => {
    const d = driver(placeRules, seeded(1));
    const g = d.state;
    expect(g.values).toHaveLength(PLACE_N);
    expect(new Set(g.values).size).toBe(PLACE_N);
    expect(g.i).toBe(1);
    expect(d.say).toEqual(m('place.say.first', { key: g.values[1] }));
    expect(placeRules.clickable(g)).toBe(true);
    expect(placeView(g)).toMatchObject({ held: 1, heldAt: 1, inHand: 2, gaps: 2 });
    expect(g.slots[1]).toBeNull();
    expect(placeRules.controls(g)).toEqual([]);
  });

  it('点错：算一次错，出「错」声；左边那张比 key 大就晃它，右边那张比 key 小就晃它并透光，台词说清谁大谁小', () => {
    for (let seed = 1; seed < 40; seed++) {
      const d = driver(placeRules, seeded(seed));
      // 先走到有两张以上牌在手的时候
      d.act({ type: 'gap', g: rightGap(d.state) });
      d.settle();
      const g = d.state;
      const key = g.values[g.i];
      const hand = placeHand(g);
      const good = rightGap(g);
      for (let gap = 0; gap <= g.i; gap++) {
        if (gap === good) continue;
        const e = driver(placeRules, seeded(seed));
        e.act({ type: 'gap', g: rightGap(e.state) });
        e.settle();
        const before = e.state.mistakes;
        expect(e.act({ type: 'gap', g: gap })).toBe(true);
        expect(e.state.mistakes).toBe(before + 1);
        expect(e.state.phase).toBe('pick');
        expect(e.sounds.at(-1)).toBe('wrong');
        const leftBig = gap > 0 && hand[gap - 1] > key;
        const rightSmall = gap < hand.length && hand[gap] < key;
        if (leftBig) expect(e.state.shake?.[0]).toBe(e.state.slots[gap - 1]);
        if (rightSmall) {
          expect(e.state.glow?.[0]).toBe(e.state.slots[gap]);
          if (!leftBig) expect(e.state.shake?.[0]).toBe(e.state.slots[gap]);
        }
        const say = e.say!;
        expect(say.key).toBe('place.say.wrong');
        expect(say.params!.key).toBe(key);
      }
    }
  });

  it('点错两次：晃的次数加到 2，同一个地方也会重新晃、重新亮', () => {
    const d = driver(placeRules, seeded(3));
    d.act({ type: 'gap', g: rightGap(d.state) });
    d.settle();
    const bad = rightGap(d.state) === 0 ? 1 : 0;
    d.act({ type: 'gap', g: bad });
    const first = d.state.shake?.[1] ?? 0;
    d.act({ type: 'gap', g: bad });
    expect(d.state.shake?.[1]).toBe(first + 1);
    expect(d.state.mistakes).toBe(2);
  });

  it('点对：出「对」声，牌一张张往右挪（每张 MOVE_STEP），放下（MOVE_SETTLE）、摸下一张（MOVE_NEXT）；放下时出「嗒」声', () => {
    const d = driver(placeRules, seeded(5));
    d.act({ type: 'gap', g: rightGap(d.state) });
    d.settle();
    // 第二轮：挑一个要挪的局面
    const g = d.state;
    const good = rightGap(g);
    const shifts = g.i - good;
    const mark = d.afters.length;
    const marked = d.sounds.length;
    d.act({ type: 'gap', g: good });
    expect(d.state.phase).toBe('moving');
    expect(placeRules.clickable(d.state)).toBe(false);
    expect(d.sounds.slice(marked)).toEqual(['right']);
    d.settle();
    expect(d.afters.slice(mark)).toEqual([...Array(shifts).fill(MOVE_STEP), MOVE_SETTLE, MOVE_NEXT]);
    expect(d.sounds.slice(marked)).toEqual(['right', 'tick']);
    expect(d.state.i).toBe(3);
    expect(d.state.phase).toBe('pick');
    // 这时前三个位置是排好的
    const row = d.state.slots.slice(0, 3).filter((x) => x !== null).map((id) => d.state.values[id!]);
    expect(row).toEqual([...row].sort((a, b) => a - b));
  });

  it('挪的时候不接受再点；没轮到的时候不接受「再来一局」', () => {
    const d = driver(placeRules, seeded(6));
    d.act({ type: 'gap', g: rightGap(d.state) });
    expect(d.act({ type: 'gap', g: 0 })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
    d.settle();
    expect(d.act({ type: 'gap', g: 99 })).toBe(false);
  });

  it('全对：理好所有牌，出「赢」声，三颗星，台词报喜，牌桌上是排好的', () => {
    const d = playThrough(7);
    const g = d.state;
    expect(g.phase).toBe('done');
    expect(d.say).toEqual(m('place.say.done'));
    expect(d.sounds.at(-1)).toBe('win');
    expect(placeRules.result!(g)).toEqual({ stars: 3, body: m('place.body') });
    expect(g.slots.map((id) => g.values[id!])).toEqual([...g.values].sort((a, b) => a - b));
    expect(placeView(g)).toMatchObject({ held: null, inHand: PLACE_N, gaps: 0 });
    // 挪的次数等于逆序对数
    expect(d.afters.filter((a) => a === MOVE_STEP)).toHaveLength(inversions(g.values));
  });

  it('星星：错 1～2 次两颗，再多一颗；「再来一局」换一手新牌', () => {
    expect(placeRules.result!(playThrough(8, [0]).state)!.stars).toBe(2);
    expect(placeRules.result!(playThrough(8, [0, 1]).state)!.stars).toBe(2);
    const d = playThrough(8, [0, 1, 2]);
    expect(placeRules.result!(d.state)!.stars).toBe(1);
    const before = d.state.values;
    expect(buttons(placeRules.controls(d.state)).map((b) => b.look)).toEqual(['primary']);
    d.act({ type: 'again' });
    expect(d.state.values).not.toEqual(before);
    expect(d.state.phase).toBe('pick');
    expect(d.state.mistakes).toBe(0);
  });

  it('切标签：挪到一半的局作废，重新发牌；等孩子点的时候切标签什么都不变', () => {
    const d = driver(placeRules, seeded(9));
    const before = d.state;
    d.interrupt();
    expect(d.state).toBe(before);
    d.act({ type: 'gap', g: rightGap(d.state) });
    expect(d.state.phase).toBe('moving');
    d.interrupt();
    expect(d.state.phase).toBe('pick');
    expect(d.state.i).toBe(1);
    expect(d.after).toBeUndefined();
  });
});

describe('玩法二「挪一挪」', () => {
  /** 照规则做一步：空位左边比 key 大就点它，否则点空位 */
  function solveStep(d: ReturnType<typeof driver<ShiftGame, ShiftAction>>) {
    const g = d.state;
    const key = g.values[g.i];
    const left = g.hole > 0 ? g.slots[g.hole - 1] : null;
    if (left !== null && g.values[left] > key) d.act({ type: 'card', id: left });
    else d.act({ type: 'hole' });
  }
  function solve(seed: number, extra?: (d: ReturnType<typeof driver<ShiftGame, ShiftAction>>) => void) {
    const d = driver(shiftRules, seeded(seed));
    extra?.(d);
    let guard = 0;
    while (d.state.phase === 'play' && guard++ < 100) solveStep(d);
    return d;
  }

  it('开局：发 5 张牌，台词让孩子点空位左边比它大的牌；牌和空位都能点', () => {
    const d = driver(shiftRules, seeded(1));
    const g = d.state;
    expect(g.values).toHaveLength(SHIFT_N);
    expect(d.say).toEqual(m('shift.say.first', { key: g.values[1] }));
    expect(shiftRules.clickable(g)).toBe(true);
    expect(g.coins).toBe(0);
    expect(g.hole).toBe(1);
  });

  it('照做一遍：硬币数等于逆序对数，理好后进入「数一数」，出三个选项', () => {
    for (let seed = 1; seed < 60; seed++) {
      const d = solve(seed);
      const g = d.state;
      expect(g.phase).toBe('count');
      expect(g.coins).toBe(inversions(g.values));
      expect(g.mistakes).toBe(0);
      expect(d.say).toEqual(m('shift.say.counting'));
      const cs = buttons(shiftRules.controls(g));
      expect(cs.map((b) => b.look)).toEqual(['pad', 'pad', 'pad']);
      expect(cs.map((b) => b.action)).toEqual(countChoices(g.coins).map((n) => ({ type: 'count', n })));
      expect(cs.every((b) => b.aria)).toBe(true);
      expect(g.slots.map((id) => g.values[id!])).toEqual([...g.values].sort((a, b) => a - b));
    }
  });

  it('点的不是紧挨着空位的那张：不算错，那张晃一晃、紧挨着的那张透光，台词让孩子先看紧挨着的', () => {
    // 找一手牌：照做到空位走到下标 2 或更右
    const d = driver(shiftRules, seeded(2));
    for (let guard = 0; guard < 30 && d.state.hole < 2; guard++) solveStep(d);
    const g0 = d.state;
    expect(g0.hole).toBeGreaterThanOrEqual(2);
    const far = g0.slots[0]!;
    d.act({ type: 'card', id: far });
    expect(d.state.mistakes).toBe(0);
    expect(d.state.shake).toEqual([far, 1]);
    expect(d.state.glow?.[0]).toBe(g0.slots[1]);
    expect(d.say).toEqual(m('shift.say.look', { key: g0.values[g0.i] }));
    expect(d.sounds.at(-1)).toBe('wrong');
  });

  it('紧挨着的那张比 key 小却点了它：算一次错，透光的是空位；比 key 大却点了空位：算一次错，透光的是那张牌', () => {
    let sawSmall = false;
    let sawBig = false;
    for (let seed = 1; seed < 80 && !(sawSmall && sawBig); seed++) {
      const d = driver(shiftRules, seeded(seed));
      const g = d.state;
      const left = g.slots[g.hole - 1]!;
      const key = g.values[g.i];
      if (g.values[left] < key) {
        sawSmall = true;
        d.act({ type: 'card', id: left });
        expect(d.state.mistakes).toBe(1);
        expect(d.state.glow?.[0]).toBe(-1);
        expect(d.say).toEqual(m('shift.say.small', { v: g.values[left], key }));
      } else {
        sawBig = true;
        d.act({ type: 'hole' });
        expect(d.state.mistakes).toBe(1);
        expect(d.state.glow?.[0]).toBe(left);
        expect(d.say).toEqual(m('shift.say.big', { v: g.values[left], key }));
        expect(d.state.hole).toBe(1);
      }
      expect(d.sounds.at(-1)).toBe('wrong');
    }
    expect(sawSmall && sawBig).toBe(true);
  });

  it('挪对一张：硬币加一，出「对」声，台词报喜并提示下一步；挪到最左边时提示放下', () => {
    const d = driver(shiftRules, seeded(4));
    for (let guard = 0; guard < 30 && d.state.phase === 'play'; guard++) {
      const before = d.state;
      solveStep(d);
      if (d.state.coins > before.coins) {
        const v = before.values[before.slots[before.hole - 1]!];
        expect(d.say).toEqual(m('shift.say.moved', { v, key: before.values[before.i], tail: m(d.state.hole === 0 ? 'shift.say.tailEnd' : 'shift.say.tail', { key: before.values[before.i] }) }));
        expect(d.sounds.at(-1)).toBe('right');
        expect(d.state.glow).toBeNull();
      }
    }
  });

  it('数错：硬币跳一跳（pulse 加一），出「错」声，台词让孩子一枚一枚数；数对：出「赢」声，报总数', () => {
    const d = solve(5);
    const coins = d.state.coins;
    const wrong = countChoices(coins).find((n) => n !== coins)!;
    d.act({ type: 'count', n: wrong });
    expect(d.state.pulse).toBe(1);
    // 点错的那个数字按钮变淡、晃一下，别的按钮不变
    const pads = shiftRules.controls(d.state) as { action: { n: number }; nope?: number }[];
    expect(pads.find((c) => c.action.n === wrong)!.nope).toBe(1);
    expect(pads.filter((c) => c.nope !== undefined)).toHaveLength(1);
    expect(d.state.phase).toBe('count');
    expect(d.say).toEqual(m('shift.say.count'));
    expect(d.sounds.at(-1)).toBe('wrong');
    d.act({ type: 'count', n: coins });
    expect(d.state.phase).toBe('done');
    expect(d.say).toEqual(m('shift.say.right', { n: coins }));
    expect(d.sounds.at(-1)).toBe('win');
    expect(shiftRules.result!(d.state)).toEqual({ stars: 3, body: m('shift.body') });
  });

  it('星星由挪错放错的次数决定，数错不扣星；「再来一局」换一手新牌', () => {
    const d = solve(6, (x) => {
      // 故意错三次：空位左边比 key 大却点空位，或比 key 小却点它
      for (let k = 0; k < 3; k++) {
        const g = x.state;
        const left = g.slots[g.hole - 1]!;
        if (g.values[left] > g.values[g.i]) x.act({ type: 'hole' });
        else x.act({ type: 'card', id: left });
        solveStep(x);
        void k;
      }
    });
    expect(d.state.mistakes).toBeGreaterThanOrEqual(1);
    d.act({ type: 'count', n: -1 });
    d.act({ type: 'count', n: d.state.coins });
    expect(shiftRules.result!(d.state)!.stars).toBe(d.state.mistakes === 0 ? 3 : d.state.mistakes <= 2 ? 2 : 1);
    const old = d.state.values;
    d.act({ type: 'again' });
    expect(d.state.values).not.toEqual(old);
    expect(d.state.phase).toBe('play');
  });

  it('不在玩的时候点牌、不在数的时候点数字都没反应', () => {
    const d = solve(7);
    expect(d.act({ type: 'card', id: 0 })).toBe(false);
    expect(d.act({ type: 'hole' })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
    const e = driver(shiftRules, seeded(7));
    expect(e.act({ type: 'count', n: 0 })).toBe(false);
  });
});

describe('挑战：四组赛跑', () => {
  /** 赛跑的步数多，自动步骤一直走到没有为止（共用的 settle 最多走 50 步） */
  const runOut = (d: { after: number | undefined; tick(): void }) => {
    for (let guard = 0; d.after !== undefined && guard < 2000; guard++) d.tick();
  };
  const kinds = (s: RaceState) => s.lanes.map((l) => l.kind);
  /** 猜对：最快、最慢各点一次 */
  function guess(d: ReturnType<typeof driver<RaceState, never>>, fast: number, slow: number) {
    d.act({ type: 'choose', k: fast } as never);
    d.act({ type: 'choose', k: slow } as never);
  }

  it('开局：四组 12 个数，先选最快；组可以点，没有按钮；顶上一句话问最快', () => {
    const d = driver(challengeRules, seeded(1));
    const s = d.state;
    expect(s.lanes).toHaveLength(4);
    expect(s.phase).toBe('fast');
    expect(challengeRules.clickable(s)).toBe(true);
    expect(challengeRules.controls(s)).toEqual([]);
    expect(kinds(s).sort()).toEqual(['nearly', 'random', 'reversed', 'tail']);
    expect(challengeRules.result!(s)).toBeNull();
  });

  it('选最快、再选最慢（不能和最快同一组），再出「开跑」；中途可以「重新猜」', () => {
    const d = driver(challengeRules, seeded(2));
    expect(d.act({ type: 'choose', k: 1 })).toBe(true);
    expect(d.state).toMatchObject({ fast: 1, phase: 'slow' });
    expect(d.act({ type: 'choose', k: 1 })).toBe(false); // 最慢不能和最快同一组
    expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.redo')]);
    expect(d.act({ type: 'choose', k: 3 })).toBe(true);
    expect(d.state).toMatchObject({ slow: 3, phase: 'ready' });
    expect(challengeRules.clickable(d.state)).toBe(false);
    expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.go'), m('chal.redo')]);
    d.act({ type: 'redo' });
    expect(d.state).toMatchObject({ fast: null, slow: null, phase: 'fast' });
    expect(d.act({ type: 'go' })).toBe(false);
  });

  it('开跑：每隔 RACE_TICK 前进 RACE_STRIDE 步，最长的一组跑完就结束；中途只有「直接看结果」', () => {
    const d = driver(challengeRules, seeded(3));
    guess(d as never, 0, 1);
    d.act({ type: 'go' });
    expect(d.state.phase).toBe('race');
    expect(d.after).toBe(RACE_TICK);
    expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.skip')]);
    d.tick();
    expect(d.state.t).toBe(RACE_STRIDE);
    runOut(d);
    const longest = Math.max(...d.state.traces.map((t) => t.length));
    expect(d.state.phase).toBe('end');
    expect(d.state.t).toBe(longest);
    expect(d.after).toBeUndefined();
    // 每一组都跑完了，名次是 1 到 4
    expect(d.state.lanes.every((_, k) => laneDone(d.state, k))).toBe(true);
    expect([...raceRanks(d.state)].sort()).toEqual([1, 2, 3, 4]);
    // 定时器次数：跑到 longest 需要的 tick 数
    expect(d.afters.filter((a) => a === RACE_TICK)).toHaveLength(Math.ceil(longest / RACE_STRIDE) - 1 + 1);
  });

  it('「直接看结果」立刻跑完；切标签时赛跑直接跑完，没有定时器留着（原来的计时器泄漏）', () => {
    const d = driver(challengeRules, seeded(4));
    guess(d as never, 0, 1);
    d.act({ type: 'go' });
    d.interrupt();
    expect(d.state.phase).toBe('end');
    expect(d.after).toBeUndefined();
    const e = driver(challengeRules, seeded(4));
    guess(e as never, 0, 1);
    e.act({ type: 'go' });
    e.act({ type: 'skip' });
    expect(e.state.phase).toBe('end');
    expect(e.after).toBeUndefined();
    // 还没开跑时切标签什么都不变
    const f = driver(challengeRules, seeded(4));
    const before = f.state;
    f.interrupt();
    expect(f.state).toBe(before);
  });

  it('一旦已经结束，迟到的定时器不再让它前进', () => {
    const d = driver(challengeRules, seeded(5));
    guess(d as never, 0, 1);
    d.act({ type: 'go' });
    d.act({ type: 'skip' });
    const end = d.state;
    d.tick();
    expect(d.state).toBe(end);
  });

  it('猜对最快和最慢：夸一句「全猜对了」，写出最快最慢是哪一组、挪了几次，再补一段逆序对的解释', () => {
    const d = driver(challengeRules, seeded(6));
    const s = d.state;
    const fast = raceFastest(s);
    const slow = raceSlowest(s);
    expect(s.lanes[fast].kind).toBe('nearly');
    expect(s.lanes[slow].kind).toBe('reversed');
    guess(d as never, fast, slow);
    d.act({ type: 'go' });
    runOut(d);
    const r = challengeRules.result!(d.state)!;
    expect(r.title).toEqual(m('chal.win'));
    expect(r.body!.params).toMatchObject({
      fast: 'ABCD'[fast], fastMoves: 2, slow: 'ABCD'[slow], slowMoves: (CHALLENGE_N * (CHALLENGE_N - 1)) / 2,
    });
    expect(r.art).toEqual({ scene: 'RaceNote', props: { msg: m('chal.note', { n1: CHALLENGE_N - 1, n: CHALLENGE_N, all: 66 }) } });
    expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.again')]);
  });

  it('猜错：说「和你猜的不太一样」；再来一局换四组新的，回到选最快', () => {
    const d = driver(challengeRules, seeded(7));
    const s = d.state;
    const fast = raceFastest(s);
    const wrong = (fast + 1) % 4;
    guess(d as never, wrong, (wrong + 1) % 4 === fast ? (wrong + 2) % 4 : (wrong + 1) % 4);
    d.act({ type: 'go' });
    runOut(d);
    expect(challengeRules.result!(d.state)!.title).toEqual(m('chal.lose'));
    const lanes = d.state.lanes;
    d.act({ type: 'again' });
    expect(d.state.phase).toBe('fast');
    expect(d.state.lanes).not.toEqual(lanes);
    expect(d.state.fast).toBeNull();
  });

  it('不在对的阶段，操作都不接受', () => {
    const d = driver(challengeRules, seeded(8));
    expect(d.act({ type: 'go' })).toBe(false);
    expect(d.act({ type: 'skip' })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
    expect(d.act({ type: 'redo' })).toBe(false);
  });
});

describe('猜下一步', () => {
  it('每一轮两问：先点 key 落在哪一格，再选比较几次；连对 6 次过关', () => {
    const rules = level.predict!.main;
    expect(rules.goal).toBe(6);
    const values = [5, 3, 8, 1, 4, 2, 7, 6];
    const puzzle = makePuzzle(values);
    expect(puzzle.asks).toHaveLength((values.length - 1) * 2);
    expect(puzzle.asks.map((a) => a.kind).slice(0, 4)).toEqual(['pick', 'choose', 'pick', 'choose']);
    let s = pr.startPredict(puzzle, 6);
    for (let k = 0; k < 6; k++) {
      expect(s.passed).toBe(false);
      s = pr.answer(s, puzzle.asks[s.i].answer)!.state;
    }
    expect(s.streak).toBe(6);
    expect(s.passed).toBe(true);
  });

  it('点错 key 的位置：连对清零，看完解释后继续问比较次数；点灰格子（在 key 右边）不能点', () => {
    const values = [5, 3, 8, 1, 4, 2, 7, 6];
    const puzzle = makePuzzle(values);
    let s = pr.startPredict(puzzle, 6);
    const ask = puzzle.asks[0];
    // 第一问：i = 1，只有下标 0、1 能点
    expect(ask.view.maxPick).toBe(1);
    const wrong = ask.answer === 0 ? 1 : 0;
    const out = pr.answer(s, wrong)!;
    expect(out.sound).toBe('wrong');
    expect(out.state.streak).toBe(0);
    expect(pr.viewOf(out.state)).toMatchObject({ picked: wrong, pickable: false });
    s = pr.proceed(out.state)!;
    expect(s.i).toBe(1);
    expect(pr.viewOf(s).options!.map((o) => o.value)).toEqual([1]);
    // 比较次数的选项：1 到 i
    const later = pr.startPredict(puzzle, 6);
    const third = { ...later, i: 5 };
    expect(pr.viewOf(third).options!.map((o) => o.value)).toEqual([1, 2, 3]);
  });

  it('答案和真实执行一致：放好后的数组排好前 i + 1 个，比较次数等于 buildTrace 里的', () => {
    const rand = seeded(12);
    for (let k = 0; k < 100; k++) {
      const values = Array.from({ length: 8 }, () => 1 + Math.floor(rand() * 15));
      const puzzle = makePuzzle(values);
      const steps = buildTrace(values);
      for (let r = 0; r < 7; r++) {
        const placed = puzzle.asks[r * 2 + 1].view;
        const front = placed.arr.slice(0, placed.sorted);
        expect(front).toEqual([...front].sort((a, b) => a - b));
        expect(puzzle.asks[r * 2 + 1].answer).toBe(
          steps.filter((x) => x.i === r + 1 && x.line === 5 && x.cmp !== null).length,
        );
      }
      expect(puzzle.end.view.arr).toEqual([...values].sort((a, b) => a - b));
    }
  });
});

describe('逐步执行的规则', () => {
  it('开局 8 个随机数；改大小或初始顺序就换一个新数组；控件是两个分段加一个按钮', () => {
    const rand = seeded(1);
    const input = traceRules.start(rand);
    expect(input).toMatchObject({ size: 8, shape: 'random' });
    expect(input.values).toHaveLength(8);
    const big = traceRules.act(input, { type: 'size', n: 10 }, rand);
    expect(big.values).toHaveLength(10);
    const rev = traceRules.act(big, { type: 'shape', shape: 'reversed' }, rand);
    expect(rev.values).toEqual([30, 27, 24, 21, 18, 15, 12, 9, 6, 3]);
    expect(traceRules.act(rev, { type: 'fresh' }, rand).values).toEqual(rev.values);
    const nearly = makeValues(8, 'nearly', rand);
    expect(inversions(nearly)).toBeLessThanOrEqual(2);
    expect(traceRules.controls(rev).map((c) => c.type)).toEqual(['segmented', 'segmented', 'button']);
  });

  it('「下一次插入」停在 arr[j + 1] = key 那一行，没有了就停在最后', () => {
    const stop = traceRules.jump!.stop;
    const steps = buildTrace([3, 1, 2]);
    expect(steps.filter((x) => stop(x, steps[0])).every((x) => x.line === 9 || x.done)).toBe(true);
    expect(traceRules.foot).toEqual(m('trace.foot'));
  });

  it('变量标签和总结', () => {
    const input = { values: [3, 1, 2], size: 6, shape: 'random' as const };
    const steps = traceRules.trace(input);
    const last = steps.at(-1)!;
    expect(traceRules.vars(input, steps[0]).map((v) => v[0])).toEqual(['i', 'j', 'key', m('trace.v.compares'), m('trace.v.moves')]);
    expect(traceRules.summary!(input, steps[0])).toBeNull();
    expect(traceRules.summary!(input, last)).toEqual(
      m('trace.summary', { compares: last.compares, moves: last.moves, inv: 2, n: 3, min: 2, max: 3 }),
    );
  });

  it('找 bug 的判定：没跑完是 null', () => {
    const bug = level.bugs!.main.bugs[0];
    expect(bugVerdict(level.bugs!.main.run(bug)[0], bug)).toBeNull();
    expect(dealHand(3).length).toBe(3);
  });
});
