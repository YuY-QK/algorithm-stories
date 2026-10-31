import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { PAUSE_NOTE, PAUSE_SHORT } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  HAND_N, KID_N, buildTrace, challengeRules, comparesFor, fewestSwaps, genArray, handNeed, handRoundOver, handRules, handAsking, inversions, isSorted,
  level, makePuzzle, minFrom, pairValues, pickRules, rounds, selectionSwaps, swapAt, traceRules, whyMin,
  type ChallengeAction, type ChallengeState, type HandGame, type PickGame,
} from '../src/engine/selection-sort';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「挑最小的」', () => {
  const rand = () => seeded(11);
  /** 点出真正最小的那颗，让小熊搬完 */
  function pickRight(d: ReturnType<typeof driver<PickGame, any>>) {
    d.act({ type: 'pick', k: minFrom(d.state.a, d.state.i) });
    d.settle();
  }

  it('开局：6 颗没排好的糖果，台词让孩子点最小的；糖果可以点，没有按钮', () => {
    const d = driver(pickRules, rand());
    expect(d.say).toEqual(m('pick.say.start'));
    expect(d.state.a).toHaveLength(KID_N);
    expect(isSorted(d.state.a)).toBe(false);
    expect(pickRules.clickable(d.state)).toBe(true);
    expect(pickRules.controls(d.state)).toEqual([]);
  });

  it('点盘子上已经排好的：摇头，台词让孩子看后面，不算错', () => {
    const d = driver(pickRules, rand());
    pickRight(d);
    d.act({ type: 'pick', k: 0 });
    expect(d.say).toEqual(m('pick.say.plated'));
    expect(d.state.shake).toEqual([0, 1]);
    expect(d.state.mistakes).toBe(0);
    expect(d.sounds.at(-1)).toBe('wrong');
  });

  it('点错：不说错，把点的那颗和最小的并排放大，位置按队伍里的先后放；比一比点对了才回到队伍，最小的一闪一闪', () => {
    const d = driver(pickRules, rand());
    const min = minFrom(d.state.a, 0);
    const wrong = d.state.a.findIndex((_, k) => k !== min);
    d.act({ type: 'pick', k: wrong });
    expect(d.state).toMatchObject({ phase: 'compare', mistakes: 1 });
    expect(d.say).toEqual(m('pick.say.compare'));
    expect(d.state.pair).toEqual({ tapped: wrong, min, left: wrong < min ? 'tapped' : 'min' });
    const vals = pairValues(d.state)!;
    expect(vals.l).toBe(d.state.a[Math.min(wrong, min)]);
    expect(pickRules.clickable(d.state)).toBe(false);
    // 点了较大的那一边：摇一摇，还在比
    const bigSide = vals.l > vals.r ? 'l' : 'r';
    d.act({ type: 'side', side: bigSide });
    expect(d.state.phase).toBe('compare');
    expect(d.state.pairShake).toEqual([bigSide, 1]);
    expect(d.sounds.at(-1)).toBe('wrong');
    d.act({ type: 'side', side: bigSide === 'l' ? 'r' : 'l' });
    expect(d.state).toMatchObject({ phase: 'pick', pair: null, pulse: min });
    expect(d.say).toEqual(m('pick.say.that'));
    // 再点对：一闪一闪停掉
    d.act({ type: 'pick', k: min });
    expect(d.state.pulse).toBeNull();
  });

  it('点对：小熊拿着发光，PAUSE_SHORT 后换到最前面、再 PAUSE_SHORT 后问下一轮', () => {
    const d = driver(pickRules, rand());
    const a0 = d.state.a;
    const min = minFrom(a0, 0);
    d.act({ type: 'pick', k: min });
    expect(d.state).toMatchObject({ phase: 'moving', bear: min, glow: min });
    expect(d.say).toEqual(m(min === 0 ? 'pick.say.stay' : 'pick.say.move', { v: a0[min] }));
    expect(d.after).toBe(PAUSE_SHORT);
    expect(pickRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'pick', k: 1 })).toBe(false);
    d.tick();
    expect(d.state).toMatchObject({ phase: 'moved', i: 1, bear: 0, glow: null });
    expect(d.state.a).toEqual(swapAt(a0, 0, min));
    expect(d.after).toBe(PAUSE_SHORT);
    d.tick();
    expect(d.state).toMatchObject({ phase: 'pick', bear: null });
    expect(d.say).toEqual(m('pick.say.next'));
    expect(d.sounds).toEqual(['right', 'tick']);
  });

  it('搬到只剩一颗：问「还要挑吗」；点糖果摇头，选 👆 提醒数一数，选 🙅 排好、出赢声、三颗星', () => {
    const d = driver(pickRules, rand());
    for (let r = 0; r < KID_N - 1; r++) pickRight(d);
    expect(d.state.phase).toBe('last');
    expect(d.say).toEqual(m('pick.say.last'));
    expect(pickRules.clickable(d.state)).toBe(true);
    const pads = buttons(pickRules.controls(d.state));
    expect(pads.map((b) => b.aria)).toEqual([m('pick.aria.need'), m('pick.aria.skip')]);
    d.act({ type: 'pick', k: 2 });
    expect(d.state.shake).toEqual([2, 1]);
    expect(d.state.phase).toBe('last');
    d.act({ type: 'last', need: true });
    expect(d.say).toEqual(m('pick.say.count'));
    expect(d.state.phase).toBe('last');
    expect(d.sounds.at(-1)).toBe('wrong');
    d.act({ type: 'last', need: false });
    expect(d.state.phase).toBe('done');
    expect(d.say).toEqual(m('pick.say.done'));
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.state.a).toEqual([...d.state.a].sort((x, y) => x - y));
    expect(pickRules.result!(d.state)).toEqual({ stars: 3, art: { scene: 'PickTally', props: { n: KID_N, rounds: KID_N - 1 } } });
    // 点错的次数决定星星；再来一排换新的
    d.act({ type: 'again' });
    expect(d.state).toMatchObject({ phase: 'pick', i: 0, mistakes: 0 });
  });

  it('错 1～2 次两颗、再多一颗', () => {
    const run = (misses: number) => {
      const d = driver(pickRules, rand());
      for (let x = 0; x < misses; x++) {
        const min = minFrom(d.state.a, d.state.i);
        d.act({ type: 'pick', k: d.state.a.findIndex((_, k) => k >= d.state.i && k !== min) });
        const vals = pairValues(d.state)!;
        d.act({ type: 'side', side: vals.l < vals.r ? 'l' : 'r' });
      }
      for (let r = 0; r < KID_N - 1; r++) pickRight(d);
      d.act({ type: 'last', need: false });
      return pickRules.result!(d.state)!.stars;
    };
    expect([run(1), run(2), run(3)]).toEqual([2, 2, 1]);
  });

  it('切标签：小熊搬到一半的局作废，换新糖果重新开始；等孩子点时什么都不变', () => {
    const d = driver(pickRules, rand());
    const idle = d.state;
    d.interrupt();
    expect(d.state).toBe(idle);
    d.act({ type: 'pick', k: minFrom(d.state.a, 0) });
    d.interrupt();
    expect(d.state).toMatchObject({ phase: 'pick', i: 0, glow: null, bear: null });
    expect(d.say).toEqual(m('pick.say.start'));
  });
});

describe('玩法二「小熊的手」', () => {
  const rand = () => seeded(3);
  const right = (g: HandGame) => ({ type: 'answer', c: handNeed(g.s) }) as const;
  const wrong = (g: HandGame) => ({ type: 'answer', c: handNeed(g.s) === 'take' ? 'keep' : 'take' }) as const;

  it('开局：4 颗糖，小熊拿第一颗，台词问要不要换；两个按钮（换成新的、留着）', () => {
    const d = driver(handRules, rand());
    expect(d.say).toEqual(m('hand.say.start'));
    expect(d.state.s.a).toHaveLength(HAND_N);
    expect(handAsking(d.state)).toBe(true);
    expect(buttons(handRules.controls(d.state)).map((b) => b.aria)).toEqual([m('hand.aria.take'), m('hand.aria.keep')]);
  });

  it('答错：算一次错，更小的那一边透光，台词说小熊只要小的；状态不变；答对后讲这一步', () => {
    const d = driver(handRules, rand());
    const g = d.state;
    const small = handNeed(g.s) === 'take' ? 'r' : 'l';
    d.act(wrong(g));
    expect(d.state.mistakes).toBe(1);
    expect(d.state.glow).toEqual([small, 1]);
    expect(d.state.s).toBe(g.s);
    expect(d.say).toEqual(m('hand.say.wrong'));
    expect(d.sounds).toEqual(['wrong']);
    d.act(wrong(d.state));
    expect(d.state.glow).toEqual([small, 2]);
    const held = g.s.a[g.s.held], look = g.s.a[g.s.j];
    const c = handNeed(g.s);
    d.act(right(d.state));
    expect(d.state.glow).toBeNull();
    expect(d.say).toEqual(m(c === 'take' ? 'hand.say.take' : 'hand.say.keep', { look, held }));
    expect(d.sounds.at(-1)).toBe('right');
  });

  it('一轮看完：按钮收起，稍后（PAUSE_NOTE）把手里的放到最前面，再稍后问下一轮', () => {
    const d = driver(handRules, rand());
    while (!handRoundOver(d.state.s)) d.act(right(d.state));
    expect(d.state.phase).toBe('over');
    expect(d.say).toEqual(m('hand.say.over'));
    expect(d.after).toBe(PAUSE_NOTE);
    expect(handRules.controls(d.state)).toEqual([]);
    expect(d.act(right(d.state))).toBe(false);
    const held = d.state.s.held;
    const a0 = d.state.s.a;
    d.tick();
    expect(d.state.phase).toBe('placed');
    expect(d.state.s.a).toEqual(swapAt(a0, 0, held));
    expect(d.state.s.i).toBe(1);
    expect(d.say).toEqual(m('hand.say.placed'));
    expect(d.after).toBe(PAUSE_NOTE);
    expect(d.sounds.at(-1)).toBe('tick');
    d.tick();
    expect(d.state.phase).toBe('ask');
    expect(d.say).toEqual(m('hand.say.ask'));
    expect(handAsking(d.state)).toBe(true);
  });

  it('全对到底：比较 n(n−1)/2 次、排好、出赢声、三颗星，再来一排换新的；错一次两颗', () => {
    const play = (misses: number) => {
      const d = driver(handRules, rand());
      for (let x = 0; x < misses; x++) d.act(wrong(d.state));
      let guard = 0;
      while (!d.state.s.done && guard++ < 100) {
        if (handAsking(d.state)) d.act(right(d.state));
        d.settle();
      }
      return d;
    };
    const d = play(0);
    expect(d.state.s.compares).toBe(comparesFor(HAND_N));
    expect(d.say).toEqual(m('hand.say.done'));
    expect(d.sounds.at(-1)).toBe('win');
    expect(handRules.result!(d.state)).toEqual({ stars: 3, body: m('hand.win', { c: comparesFor(HAND_N) }) });
    expect(handRules.controls(d.state)).toHaveLength(1);
    expect(handRules.result!(play(1).state)!.stars).toBe(2);
    expect(handRules.result!(play(3).state)!.stars).toBe(1);
    d.act({ type: 'again' });
    expect(d.state.s.done).toBe(false);
    expect(d.state.mistakes).toBe(0);
  });

  it('切标签：放糖果的等待中途作废，换新糖果重新开始', () => {
    const d = driver(handRules, rand());
    while (!handRoundOver(d.state.s)) d.act(right(d.state));
    d.interrupt();
    expect(d.state).toMatchObject({ phase: 'ask', mistakes: 0 });
    expect(d.state.s).toMatchObject({ i: 0, j: 1 });
    expect(d.say).toEqual(m('hand.say.start'));
  });
});

describe('挑战：点两格交换，和选择排序比', () => {
  const tap = (k: number): ChallengeAction => ({ type: 'tap', k });
  /** 每轮把最小的换到前面，就是选择排序的办法 */
  function solve(d: ReturnType<typeof driver<ChallengeState, ChallengeAction>>) {
    for (let i = 0; i < d.state.a.length - 1; i++) {
      const k = minFrom(d.state.a, i);
      if (k !== i) {
        d.act(tap(i));
        d.act(tap(k));
      }
    }
  }

  it('开局：6 个互不相同的数没排好，至少要换 3 次；只有「重来这一局」，灰着', () => {
    const d = driver(challengeRules, seeded(5));
    expect(d.state.a).toHaveLength(6);
    expect(selectionSwaps(d.state.a)).toBeGreaterThanOrEqual(3);
    const bs = buttons(challengeRules.controls(d.state));
    expect(bs.map((b) => [b.label, b.disabled])).toEqual([[m('chal.retry'), true]]);
    expect(challengeRules.hud!(d.state)).toEqual({ chips: [[m('chal.chip'), m('chal.times', { n: 0 })]] });
  });

  it('点两格交换：第一下选中，再点同一格取消，点另一格才交换并算一次', () => {
    const d = driver(challengeRules, seeded(5));
    const a0 = d.state.a;
    d.act(tap(1));
    expect(d.state.sel).toBe(1);
    d.act(tap(1));
    expect(d.state.sel).toBeNull();
    expect(d.state.moves).toBe(0);
    d.act(tap(1));
    d.act(tap(4));
    expect(d.state.a).toEqual(swapAt(a0, 1, 4));
    expect(d.state).toMatchObject({ sel: null, moves: 1, last: [1, 4] });
    expect(buttons(challengeRules.controls(d.state))[0].disabled).toBe(false);
  });

  it('重来这一局：回到起点、次数清零；换一组换新的', () => {
    const d = driver(challengeRules, seeded(5));
    const a0 = d.state.a;
    d.act(tap(0));
    d.act(tap(2));
    d.act({ type: 'retry' });
    expect(d.state).toMatchObject({ a: a0, moves: 0, sel: null, last: null });
    d.act({ type: 'fresh' });
    expect(d.state.start).not.toEqual(a0);
  });

  it('排好：用的次数 ≤ 最少就夸一句；多了说选择排序只要几次，可以再试这一组；结算讲冒泡要换几次', () => {
    const d = driver(challengeRules, seeded(5));
    const start = d.state.start;
    const best = selectionSwaps(start);
    expect(best).toBe(fewestSwaps(start));
    solve(d);
    expect(isSorted(d.state.a)).toBe(true);
    expect(d.state.moves).toBe(best);
    const res = challengeRules.result!(d.state)!;
    expect(res.title).toEqual(m('chal.best', { moves: best }));
    expect(res.body).toEqual(m('chal.body', { bubble: inversions(start) }));
    expect(buttons(challengeRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.fresh')]);
    expect(challengeRules.clickable(d.state)).toBe(false);
    expect(d.act(tap(0))).toBe(false);

    // 多换了几次
    const e = driver(challengeRules, seeded(5));
    e.act(tap(0));
    e.act(tap(1));
    e.act(tap(0));
    e.act(tap(1));
    solve(e);
    expect(challengeRules.result!(e.state)!.title).toEqual(m('chal.more', { moves: e.state.moves, best }));
    expect(buttons(challengeRules.controls(e.state)).map((b) => b.label)).toEqual([m('chal.again'), m('chal.fresh')]);
    e.act({ type: 'retry' });
    expect(challengeRules.result!(e.state)).toBeNull();
  });
});

describe('逐步执行的规则', () => {
  it('开局 8 个随机数；改大小或初始顺序换新数组；四种初始顺序', () => {
    const rand = seeded(2);
    const input = traceRules.start(rand);
    expect(input).toMatchObject({ size: 8, shape: 'random' });
    const big = traceRules.act(input, { type: 'size', n: 10 }, rand);
    expect(big.arr).toHaveLength(10);
    const sorted = traceRules.act(big, { type: 'shape', shape: 'sorted' }, rand).arr;
    expect(sorted).toEqual([...sorted].sort((x, y) => x - y));
    expect(sorted).toHaveLength(10);
    const cs = traceRules.controls(big);
    expect((cs[1] as Extract<Control<unknown>, { type: 'segmented' }>).options).toHaveLength(4);
  });

  it('「跳到本轮结束」：停在这一轮排好一个之后', () => {
    const steps = buildTrace(genArray(8, 'random', seeded(7)));
    const from = steps[3];
    const to = steps.findIndex((x) => traceRules.jump!.stop(x, from));
    expect(steps[to].sorted).toBeGreaterThan(from.sorted);
    expect(steps.slice(4, to).every((x) => x.sorted <= from.sorted)).toBe(true);
  });

  it('总结讲比较次数、交换次数和冒泡的交换次数', () => {
    const input = { size: 6, shape: 'random' as const, arr: [3, 1, 2, 5, 4, 6] };
    const last = buildTrace(input.arr).at(-1)!;
    expect(traceRules.summary!(input, buildTrace(input.arr)[0])).toBeNull();
    expect(traceRules.summary!(input, last)).toEqual(m('trace.summary', { compares: 15, exp: 15, swaps: last.swaps, max: 5, bubble: inversions(input.arr) }));
  });
});

describe('猜下一步：把一道题排成一问接一问', () => {
  const arr = [4, 1, 3, 1, 5, 2];

  it('每一轮两问：点 minIdx、选改了几次；答案和 rounds 一致，选项是 0 到 n − i − 1', () => {
    const puzzle = makePuzzle(arr);
    const rs = rounds(arr);
    expect(puzzle.asks).toHaveLength(rs.length * 2);
    rs.forEach((rd, k) => {
      const [pick, count] = puzzle.asks.slice(k * 2, k * 2 + 2);
      expect(pick.kind).toBe('pick');
      expect(pick.answer).toBe(rd.minIdx);
      expect(pick.view).toMatchObject({ a: rd.before, sorted: rd.i, i: rd.i, min: null });
      expect(pick.reveal!.view.min).toBe(rd.minIdx);
      expect(count.kind).toBe('choose');
      expect(count.answer).toBe(rd.updates);
      expect(count.view.min).toBe(rd.minIdx);
      expect(count.options!.map((o) => o.value)).toEqual(Array.from({ length: arr.length - rd.i }, (_, c) => c));
      expect(count.options!.every((o) => o.aria)).toBe(true);
    });
    expect(puzzle.end.view).toMatchObject({ a: [1, 1, 2, 3, 4, 5], sorted: 6, i: null });
  });

  it('点错：解释随点的格子变（已排好、一样小、一般），点错的格子标红，真正的 minIdx 亮出来；继续后问改了几次', () => {
    const puzzle = makePuzzle([3, 1, 1, 2]);
    const rd = rounds([3, 1, 1, 2])[0];
    let s = pr.startPredict(puzzle, 6);
    s = pr.answer(s, 2)!.state; // 点了第二个 1
    expect(s).toMatchObject({ phase: 'wrong', picked: 2, streak: 0 });
    const v = pr.viewOf(s);
    expect(v.wrong).toEqual(whyMin(rd, 2));
    expect(v.wrong).toEqual(m('why.dup', { k: 2, v: 1, min: 1 }));
    expect(v.view.min).toBe(1);
    expect(v.picked).toBe(2);
    expect(v.pickable).toBe(false);
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1 });
    expect(pr.viewOf(s).options!.length).toBe(4);
    // 第二轮点已经排好的格子
    const p2 = makePuzzle([3, 1, 2]);
    let t2 = pr.startPredict(p2, 6);
    t2 = pr.proceed(pr.answer(pr.proceed(pr.answer(t2, 0)!.state)!, 0)!.state)!;
    t2 = pr.answer(t2, 0)!.state;
    expect(pr.viewOf(t2).wrong).toEqual(m('why.done', { k: 0, i: 1, min: 2, v: 2 }));
  });

  it('全部答对：没有动画，连对满 6 过关，看结局排好', () => {
    const puzzle = makePuzzle(arr);
    let s = pr.startPredict(puzzle, 6);
    for (const ask of puzzle.asks) s = pr.answer(s, ask.answer)!.state;
    expect(s.phase).toBe('end');
    expect(s).toMatchObject({ streak: puzzle.asks.length, passed: true });
    expect(pr.viewOf(s).ended).toBe(true);
  });

  it('goal 是 6；出的题 6 到 8 颗', () => {
    const rules = level.predict!.main;
    expect(rules.goal).toBe(6);
    for (let k = 0; k < 50; k++) {
      const n = rules.puzzle(seeded(k)).asks[0].view.a.length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(8);
    }
  });
});
