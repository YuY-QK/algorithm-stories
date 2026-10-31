import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { resultOf } from '../src/core/flows/game';
import { PAUSE_LONG, PAUSE_MID, PAUSE_RETRY } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BUGS, CHALLENGE, KID_COINS, PUZZLES, SYSTEMS, bestPicks, bugVerdict, cashierAmount, cashierDone, cashierLeft, cashierPulse,
  cashierRules, challengeFinished, challengeReveal, challengeRules, challengeScore, counterexample, desc, greedyNext, greedyPicks, level, makePuzzle,
  minCoins, robotGlow, robotLeft, robotRules, rounds, runBug, traceCoins, traceRules, whyCoin,
  type CashierAction, type CashierGame, type ChallengeAction, type RobotAction, type RobotGame,
} from '../src/engine/greedy';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「当收银员」', () => {
  const rand = () => seeded(5);
  type D = ReturnType<typeof driver<CashierGame, CashierAction>>;
  /** 一直拿最大的，凑到只剩 n 枚没放 */
  function greedyTo(d: D, until = 0) {
    while (cashierLeft(d.state) > until) d.act({ type: 'tap', coin: greedyNext(KID_COINS, cashierLeft(d.state))! });
  }
  /** 故意多拿：先一枚一枚用 1 凑（比最少多），金额总是凑得齐 */
  function sloppy(d: D) {
    while (cashierLeft(d.state) > 0) d.act({ type: 'tap', coin: 1 });
  }

  it('开局：金额 11～99，贪心至少要 3 枚；台词叫出客人和金额；硬币可以点，只有「拿回一枚」（灰着）', () => {
    const d = driver(cashierRules, rand());
    expect(d.state.amount).toBeGreaterThanOrEqual(11);
    expect(greedyPicks(KID_COINS, d.state.amount).length).toBeGreaterThanOrEqual(3);
    expect(d.say).toEqual(m('cashier.say.greet', { who: '🐰', amount: d.state.amount }));
    expect(cashierRules.clickable(d.state)).toBe(true);
    const bs = buttons(cashierRules.controls(d.state));
    expect(bs.map((b) => b.label)).toEqual([m('cashier.undo')]);
    expect(bs[0].disabled).toBe(true);
    expect(bs[0].aria).toEqual(m('cashier.aria.undo'));
  });

  it('太大的硬币放不进去：弹回、摇头（次数累加）、出错声、说明为什么，金额不变', () => {
    for (let k = 0; k < 20; k++) {
      const d = driver(cashierRules, seeded(k));
      const left = cashierLeft(d.state);
      const big = KID_COINS.find((c) => c > left);
      if (big === undefined) continue;
      d.act({ type: 'tap', coin: big });
      expect(d.state.plate).toEqual([]);
      expect(d.state.shake).toEqual([big, 1]);
      expect(d.say).toEqual(m('cashier.say.big', { coin: big, left }));
      expect(d.sounds.at(-1)).toBe('wrong');
      d.act({ type: 'tap', coin: big });
      expect(d.state.shake).toEqual([big, 2]);
      return;
    }
    throw new Error('没找到会放不进去的金额');
  });

  it('放进去：出对声，说还要找多少；拿回一枚：说拿回了哪枚；盘子空了又灰着', () => {
    const d = driver(cashierRules, rand());
    const first = greedyNext(KID_COINS, d.state.amount)!;
    d.act({ type: 'tap', coin: first });
    expect(d.say).toEqual(m('cashier.say.put', { coin: first, left: d.state.amount - first }));
    expect(d.sounds.at(-1)).toBe('right');
    expect(buttons(cashierRules.controls(d.state))[0].disabled).toBe(false);
    d.act({ type: 'undo' });
    expect(d.say).toEqual(m('cashier.say.undo', { coin: first, left: d.state.amount }));
    expect(d.state.plate).toEqual([]);
    expect(d.act({ type: 'undo' })).toBe(false);
  });

  it('贪心凑齐：最少，出赢声，三颗星，第一次追问「每次先拿哪一枚」（三个选项）', () => {
    const d = driver(cashierRules, rand());
    greedyTo(d);
    expect(cashierDone(d.state)).toBe(true);
    expect(d.say).toEqual(m('cashier.say.best', { n: d.state.plate.length }));
    expect(d.sounds.at(-1)).toBe('win');
    expect(cashierRules.clickable(d.state)).toBe(false);
    const res = resultOf(cashierRules, d.run)!;
    expect(res.stars).toBe(3);
    expect(res.quiz!.prompt).toEqual(m('cashier.quiz.ask'));
    expect(res.quiz!.options.map((o) => (o as Button<CashierAction>).label)).toEqual([m('cashier.quiz.small'), m('cashier.quiz.any'), m('cashier.quiz.big')]);
    // 只有「下一位客人」（已经是最少，没有再找一次）
    expect(buttons(cashierRules.controls(d.state)).map((b) => b.label)).toEqual([m('cashier.next')]);
  });

  it('追问：选「能拿的最大的」夸一句；选别的让孩子下一位客人试试；答完不再追问', () => {
    for (const right of [true, false]) {
      const d = driver(cashierRules, rand());
      greedyTo(d);
      d.act({ type: 'quiz', right });
      expect(d.sounds.at(-1)).toBe(right ? 'right' : 'wrong');
      expect(resultOf(cashierRules, d.run)!.quiz).toEqual({ prompt: m(right ? 'cashier.quiz.right' : 'cashier.quiz.wrong'), options: [] });
      expect(d.act({ type: 'quiz', right })).toBe(false);
      // 下一位客人：换金额和客人，追问收起来，以后再拿三颗星也不问了
      const before = d.state;
      d.act({ type: 'next' });
      expect(d.state.amount).not.toBe(before.amount);
      expect(d.state.customer).toBe('🦊');
      expect(d.state).toMatchObject({ plate: [], tries: 0, quiz: null });
      greedyTo(d);
      expect(resultOf(cashierRules, d.run)!.quiz).toBeUndefined();
    }
  });

  it('追问没答就下一位客人：追问留着，下次凑齐还会问', () => {
    const d = driver(cashierRules, rand());
    greedyTo(d);
    d.act({ type: 'next' });
    expect(d.state.quiz).toBe('ask');
    greedyTo(d);
    expect(resultOf(cashierRules, d.run)!.quiz!.prompt).toEqual(m('cashier.quiz.ask'));
  });

  it('比最少的多：说能更少吗、两颗或一颗星、有「再找一次」；再找一次后最大能拿的那枚一闪一闪', () => {
    const d = driver(cashierRules, rand());
    sloppy(d);
    const best = minCoins(desc(KID_COINS), d.state.amount);
    expect(d.state.plate.length).toBeGreaterThan(best);
    expect(d.say).toEqual(m('cashier.say.more', { n: d.state.plate.length }));
    expect(d.state.quiz).toBeNull();
    expect(resultOf(cashierRules, d.run)!.stars).toBe(d.state.plate.length === best + 1 ? 2 : 1);
    expect(buttons(cashierRules.controls(d.state)).map((b) => b.label)).toEqual([m('cashier.retry'), m('cashier.next')]);
    expect(cashierPulse(d.state)).toBeNull();
    d.act({ type: 'retry' });
    expect(d.say).toEqual(m('cashier.say.retry', { amount: d.state.amount }));
    expect(d.state).toMatchObject({ plate: [], tries: 1 });
    expect(cashierPulse(d.state)).toBe(greedyNext(KID_COINS, d.state.amount));
    // 放一枚以后，闪的是下一枚
    const c = greedyNext(KID_COINS, d.state.amount)!;
    d.act({ type: 'tap', coin: c });
    expect(cashierPulse(d.state)).toBe(greedyNext(KID_COINS, d.state.amount - c));
  });

  it('下一位客人：客人轮流换，金额每次不一样', () => {
    const d = driver(cashierRules, rand());
    const seen: string[] = [d.state.customer];
    for (let k = 0; k < 6; k++) {
      greedyTo(d);
      const a = d.state.amount;
      d.act({ type: 'next' });
      expect(d.state.amount).not.toBe(a);
      seen.push(d.state.customer);
    }
    expect(seen).toEqual(['🐰', '🦊', '🐼', '🐱', '🐸', '🦉', '🐰']);
  });

  it('凑齐以后不能再放、不能拿回；没凑齐不能点下一位', () => {
    const d = driver(cashierRules, rand());
    expect(d.act({ type: 'next' })).toBe(false);
    greedyTo(d);
    expect(d.act({ type: 'tap', coin: 1 })).toBe(false);
    expect(d.act({ type: 'undo' })).toBe(false);
    expect(cashierAmount(seeded(1))).toBeGreaterThanOrEqual(11);
  });
});

describe('玩法二「打败贪心机器人」', () => {
  type D = ReturnType<typeof driver<RobotGame, RobotAction>>;
  /** 让机器人找完 */
  function robotDone(d: D) {
    d.settle();
  }
  /** 孩子用最少的拿法凑 */
  function beat(d: D) {
    const p = PUZZLES[d.state.level];
    for (const c of bestPicks(p.coins, p.amount)!) d.act({ type: 'tap', coin: c });
  }
  /** 孩子学机器人：每次拿最大的（不会赢） */
  function copyRobot(d: D) {
    for (const c of greedyPicks(PUZZLES[d.state.level].coins, PUZZLES[d.state.level].amount)) d.act({ type: 'tap', coin: c });
  }

  it('开局：机器人先找，台词说金额，出 tick，PAUSE_LONG 后拿第一枚；这时孩子点不了', () => {
    const d = driver(robotRules);
    expect(d.state).toMatchObject({ level: 0, phase: 'robot', robot: [], plate: [] });
    expect(d.say).toEqual(m('robot.say.start', { amount: 6 }));
    expect(d.sounds).toEqual(['tick']);
    expect(d.after).toBe(PAUSE_LONG);
    expect(robotRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'tap', coin: 4 })).toBe(false);
    expect(robotRules.controls(d.state)).toEqual([]);
  });

  it('机器人每隔 PAUSE_MID 拿一枚最大的并报还要找多少，找完说用了几枚、轮到孩子', () => {
    const d = driver(robotRules);
    d.tick();
    expect(d.state.robot).toEqual([4]);
    expect(d.say).toEqual(m('robot.say.took', { coin: 4, left: 2 }));
    expect(d.after).toBe(PAUSE_MID);
    d.settle();
    expect(d.state.robot).toEqual([4, 1, 1]);
    expect(d.state.phase).toBe('me');
    expect(d.say).toEqual(m('robot.say.used', { n: 3 }));
    expect(d.after).toBeUndefined();
    expect(robotRules.clickable(d.state)).toBe(true);
  });

  it('太大的硬币放不进去：摇头、出错声；放得进去：出对声，说还要找多少；拿回一枚', () => {
    const d = driver(robotRules);
    robotDone(d);
    d.act({ type: 'tap', coin: 4 });
    expect(d.say).toEqual(m('robot.say.put', { coin: 4, left: 2 }));
    expect(d.sounds.at(-1)).toBe('right');
    d.act({ type: 'tap', coin: 3 });
    expect(d.state.shake).toEqual([3, 1]);
    expect(d.say).toEqual(m('robot.say.big', { coin: 3, left: 2 }));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.plate).toEqual([4]);
    d.act({ type: 'undo' });
    expect(d.say).toEqual(m('robot.say.undo', { coin: 4, left: 6 }));
    expect(d.act({ type: 'undo' })).toBe(false);
  });

  it('没赢：盘子晃一下（shakePlate）、出错声，PAUSE_RETRY 后清空再来；第二次没赢后，最少拿法的第一枚透光', () => {
    const d = driver(robotRules);
    robotDone(d);
    copyRobot(d);
    expect(d.state).toMatchObject({ phase: 'oops', fails: 1, shakePlate: 1 });
    expect(d.say).toEqual(m('robot.say.oops', { n: 3, r: 3 }));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.after).toBe(PAUSE_RETRY);
    expect(robotGlow(d.state)).toBeNull();
    expect(d.act({ type: 'tap', coin: 1 })).toBe(false);
    d.tick();
    expect(d.state).toMatchObject({ phase: 'me', plate: [] });
    expect(d.say).toEqual(m('robot.say.oops', { n: 3, r: 3 })); // 第一次没赢：台词保持
    copyRobot(d);
    d.tick();
    expect(d.state.fails).toBe(2);
    expect(d.say).toEqual(m('robot.say.glow'));
    expect(robotGlow(d.state)).toBe(bestPicks([4, 3, 1], 6)![0]);
  });

  it('赢了：比机器人少，出赢声，亮一枚奖牌，有「下一关」；下一关机器人重新找', () => {
    const d = driver(robotRules);
    robotDone(d);
    beat(d);
    expect(d.state.phase).toBe('win');
    expect(d.say).toEqual(m('robot.say.win', { n: 2, r: 3 }));
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.state.won).toEqual([true, false, false, false]);
    expect(buttons(robotRules.controls(d.state)).map((b) => b.label)).toEqual([m('robot.nextLevel')]);
    d.act({ type: 'next' });
    expect(d.state).toMatchObject({ level: 1, phase: 'robot', robot: [], fails: 0 });
    expect(d.state.won[0]).toBe(true);
    expect(d.after).toBe(PAUSE_LONG);
    expect(robotLeft(d.state)).toBe(8);
  });

  it('四关都赢：最后一关按钮是「完成」，说打败了几次、结算讲道理，可以再玩一遍', () => {
    const d = driver(robotRules);
    for (let k = 0; k < PUZZLES.length; k++) {
      robotDone(d);
      beat(d);
      if (k < PUZZLES.length - 1) d.act({ type: 'next' });
    }
    expect(buttons(robotRules.controls(d.state)).map((b) => b.label)).toEqual([m('robot.finish')]);
    d.act({ type: 'next' });
    expect(d.state.phase).toBe('all');
    expect(d.say).toEqual(m('robot.say.all', { n: 4 }));
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.state.won).toEqual([true, true, true, true]);
    expect(resultOf(robotRules, d.run)!.quiz!.prompt).toEqual(m('robot.all.q'));
    expect(buttons(robotRules.controls(d.state)).map((b) => b.label)).toEqual([m('robot.again')]);
    d.act({ type: 'restart' });
    expect(d.state).toMatchObject({ level: 0, phase: 'robot', won: [false, false, false, false] });
  });

  it('每一关机器人都比最少的多（所以孩子一定能赢）', () => {
    for (const p of PUZZLES) expect(greedyPicks(p.coins, p.amount).length).toBeGreaterThan(minCoins(p.coins, p.amount));
  });

  it('切标签：机器人没找完就从头再找；晃盘子的等待直接结束；等孩子凑时什么都不变', () => {
    const d = driver(robotRules);
    d.tick();
    d.interrupt();
    expect(d.state).toMatchObject({ phase: 'robot', robot: [], level: 0 });
    expect(d.after).toBe(PAUSE_LONG);
    robotDone(d);
    copyRobot(d);
    d.interrupt();
    expect(d.state).toMatchObject({ phase: 'me', plate: [], fails: 1 });
    const keep = d.state;
    d.interrupt();
    expect(d.state).toEqual(keep);
  });
});

describe('逐步执行的规则', () => {
  it('开局：小卖部的硬币找 46；换面值只换面值；金额超出 0～200 不改；随机金额 10～99；1·3·4 找 6', () => {
    const tr = traceRules;
    let input = tr.start();
    expect(input).toEqual({ sys: 'cny', amount: 46 });
    input = tr.act(input, { type: 'sys', id: 'usd' });
    expect(input).toEqual({ sys: 'usd', amount: 46 });
    expect(tr.act(input, { type: 'amount', n: 201 })).toEqual(input);
    expect(tr.act(input, { type: 'amount', n: -1 })).toEqual(input);
    expect(tr.act(input, { type: 'amount', n: 200 }).amount).toBe(200);
    expect(tr.act(input, { type: 'random' }, seeded(3)).amount).toBeGreaterThanOrEqual(10);
    expect(tr.act(input, { type: 'odd' })).toEqual({ sys: 'odd', amount: 6 });
    expect(traceCoins({ sys: 'odd', amount: 6 })).toEqual([1, 3, 4]);
  });

  it('控件：面值分段选择（三套）、金额输入框（0～200）、快速设置两个按钮', () => {
    const cs = traceRules.controls(traceRules.start());
    expect(cs.map((c) => c.type)).toEqual(['segmented', 'number', 'group']);
    const seg = cs[0] as Extract<Control<unknown>, { type: 'segmented' }>;
    expect(seg.options).toHaveLength(SYSTEMS.length);
    const num = cs[1] as Extract<Control<unknown>, { type: 'number' }>;
    expect([num.min, num.max, num.value]).toEqual([0, 200, 46]);
  });

  it('总结：贪心拿到最少 / 贪心失灵（1·3·4 找 6）；播放条有「跳到结果」', () => {
    const tr = traceRules;
    const last = (input: { sys: string; amount: number }) => tr.trace(input).at(-1)!;
    expect(tr.summary!({ sys: 'cny', amount: 46 }, last({ sys: 'cny', amount: 46 }))).toEqual(m('trace.summary.same', { g: 4, b: 4 }));
    expect(tr.summary!({ sys: 'odd', amount: 6 }, last({ sys: 'odd', amount: 6 }))).toEqual(m('trace.summary.diff', { g: 3, picks: '3 + 3', b: 2 }));
    expect(tr.summary!({ sys: 'odd', amount: 6 }, tr.trace({ sys: 'odd', amount: 6 })[0])).toBeNull();
    expect(tr.jump!.stop(tr.trace({ sys: 'odd', amount: 6 })[3], tr.trace({ sys: 'odd', amount: 6 })[0])).toBe(false);
    expect(tr.jump!.stop(last({ sys: 'odd', amount: 6 }), tr.trace({ sys: 'odd', amount: 6 })[0])).toBe(true);
  });
});

describe('猜下一步：把一道题排成一问接一问', () => {
  it('每一种拿过的面值两问：点面值、选枚数；答案和 rounds 一致；顶上的标签是 amount 和 left', () => {
    const puzzle = makePuzzle([25, 10, 5, 1], 37);
    const rs = rounds([25, 10, 5, 1], 37);
    expect(puzzle.asks).toHaveLength(rs.length * 2);
    rs.forEach((r, k) => {
      const [coin, count] = puzzle.asks.slice(k * 2, k * 2 + 2);
      expect(coin.kind).toBe('pick');
      expect(coin.answer).toBe(r.coin);
      expect(coin.view.chosen).toBeNull();
      expect(coin.chips).toEqual([['amount', 37], ['left', r.left]]);
      expect(count.kind).toBe('choose');
      expect(count.answer).toBe(r.count);
      expect(count.view.chosen).toBe(r.coin);
      expect(count.options!.map((o) => o.value)).toEqual(r.options);
    });
    expect(puzzle.end.chips).toEqual([['amount', 37], ['left', 0]]);
    expect(puzzle.end.view.plate).toEqual([{ coin: 25, count: 1 }, { coin: 10, count: 1 }, { coin: 1, count: 2 }]);
  });

  it('点错面值：解释随点的面值变（太大 / 还有更大的），点错的标红；继续后直接问拿几枚，已拿的面值亮起', () => {
    const puzzle = makePuzzle([25, 10, 5, 1], 37);
    const r = rounds([25, 10, 5, 1], 37)[0];
    let s = pr.startPredict(puzzle, 5);
    s = pr.answer(s, 10)!.state;
    expect(s).toMatchObject({ phase: 'wrong', picked: 10, streak: 0 });
    expect(pr.viewOf(s).wrong).toEqual(whyCoin(r, 10));
    expect(pr.viewOf(s).wrong).toEqual(m('why.small', { picked: 10, left: 37, coin: 25 }));
    expect(pr.viewOf(s).pickable).toBe(false);
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1 });
    expect(pr.viewOf(s).view.chosen).toBe(25);
    // 点了比剩下的大的
    let s2 = pr.startPredict(makePuzzle([50, 10, 1], 37), 5);
    s2 = pr.answer(s2, 50)!.state;
    expect(pr.viewOf(s2).wrong).toEqual(m('why.big', { picked: 50, left: 37, coin: 10 }));
  });

  it('拿几枚答错：讲 left ÷ c = 枚数 余 几；继续后进入下一种面值', () => {
    const puzzle = makePuzzle([10, 1], 27);
    let s = pr.startPredict(puzzle, 5);
    s = pr.answer(s, 10)!.state;
    s = pr.answer(s, 5)!.state;
    expect(pr.viewOf(s).wrong).toEqual(m('why.count', { left: 27, c: 10, count: 2, rest: 7 }));
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 2 });
    expect(pr.viewOf(s).chips).toEqual([['amount', 27], ['left', 7]]);
  });

  it('全部答对：连对满 5 过关，看结局讲一共几枚；goal 是 5', () => {
    const puzzle = makePuzzle([25, 10, 5, 1], 37);
    let s = pr.startPredict(puzzle, 5);
    for (const ask of puzzle.asks) s = pr.answer(s, ask.answer)!.state;
    expect(s.phase).toBe('end');
    expect(s).toMatchObject({ streak: 6, passed: true });
    expect(pr.viewOf(s).prompt).toEqual(m('predict.end', { n: 4 }));
    expect(level.predict!.main.goal).toBe(5);
  });

  it('出的题：金额 20～199，面值是三套之一', () => {
    for (let k = 0; k < 100; k++) {
      const p = level.predict!.main.puzzle(seeded(k));
      const coins = p.asks[0].view.coins;
      expect(SYSTEMS.map((s) => desc(s.coins))).toContainEqual(coins);
      const amount = p.asks[0].chips![0][1] as number;
      expect(amount).toBeGreaterThanOrEqual(20);
      expect(amount).toBeLessThan(200);
    }
  });
});

describe('找 bug', () => {
  it('规则：三个坑；输入那行带上面值、金额和正确结果；播放条有「跳到结果」', () => {
    const br = level.bugs!.main;
    expect(br.bugs).toBe(BUGS);
    expect(br.input(BUGS[0])).toEqual(m('bug.input', { coins: '1, 2, 5, 10', amount: 12, expect: m('bug.ascending.expect') }));
    const steps = runBug(BUGS[0]);
    expect(br.jump!.stop(steps[0])).toBe(false);
    expect(br.jump!.stop(steps.at(-1)!)).toBe(true);
    expect(br.vars(steps[0], BUGS[0])[0]).toEqual(['amount', 12]);
  });

  it('判定：没跑完是空；跑完按结果说话', () => {
    const v = (i: number) => bugVerdict(runBug(BUGS[i]).at(-1)!, BUGS[i]);
    expect(bugVerdict(runBug(BUGS[0])[0], BUGS[0])).toBeNull();
    expect(v(0)).toEqual(m('bug.verdict.many', { n: 12 }));
    expect(v(1)).toEqual(m('bug.verdict.short', { total: 18, diff: 9 }));
    expect(v(2)).toEqual(m('bug.verdict.stuck'));
  });
});

describe('挑战：贪心靠得住吗', () => {
  const rules = challengeRules;
  const answerRight = (d: ReturnType<typeof driver<any, ChallengeAction>>) =>
    d.act({ type: 'answer', alwaysBest: counterexample(CHALLENGE[d.state.k].coins) === null });

  it('开局：第 1 题，两个回答按钮，标签「第 1 / 6 题」「答对 0」；画面不用点', () => {
    const d = driver(rules);
    expect(d.state.k).toBe(0);
    expect(buttons(rules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.yes'), m('chal.no')]);
    expect(rules.hud!(d.state).chips).toEqual([[m('chal.chipQ'), m('chal.qOf', { k: 1, n: 6 })], [m('chal.chipRight'), 0]]);
    expect(rules.clickable(d.state)).toBe(false);
    expect(challengeReveal(d.state)).toBeNull();
  });

  it('答完揭晓：答对 / 没猜中；有反例讲最小的反例，没有反例讲查了多远；只能答一次；有「下一题」', () => {
    const d = driver(rules);
    // 第 1 题美元：没有反例，查到 34
    d.act({ type: 'answer', alwaysBest: true });
    expect(challengeReveal(d.state)).toEqual({ verdict: m('chal.right'), text: m('chal.none', { upto: 34, limit: 35 }) });
    expect(d.act({ type: 'answer', alwaysBest: false })).toBe(false);
    expect(buttons(rules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.next')]);
    expect(challengeScore(d.state)).toBe(1);
    d.act({ type: 'next' });
    // 第 2 题 1·3·4：有反例 6
    d.act({ type: 'answer', alwaysBest: true });
    expect(challengeReveal(d.state)).toEqual({
      verdict: m('chal.wrong'), text: m('chal.found', { amount: 6, greedy: '4 + 1 + 1', gn: 3, best: '3 + 3', bn: 2 }),
    });
    expect(challengeScore(d.state)).toBe(1);
  });

  it('没答不能点下一题；最后一题答完没有下一题，直接结算', () => {
    const d = driver(rules);
    expect(d.act({ type: 'next' })).toBe(false);
    for (let k = 0; k < CHALLENGE.length; k++) {
      answerRight(d);
      if (k < CHALLENGE.length - 1) expect(d.act({ type: 'next' })).toBe(true);
    }
    expect(d.act({ type: 'next' })).toBe(false);
    expect(challengeFinished(d.state)).toBe(true);
    expect(resultOf(rules, d.run)).toEqual({ title: m('chal.perfect'), body: m('chal.body') });
    expect(buttons(rules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.restart')]);
  });

  it('全答错：答对 0 / 6；再来一遍回到第 1 题', () => {
    const d = driver(rules);
    for (let k = 0; k < CHALLENGE.length; k++) {
      d.act({ type: 'answer', alwaysBest: counterexample(CHALLENGE[k].coins) !== null });
      d.act({ type: 'next' });
    }
    expect(resultOf(rules, d.run)!.title).toEqual(m('chal.score', { score: 0, n: 6 }));
    expect(d.act({ type: 'restart' })).toBe(true);
    expect(d.state).toEqual({ k: 0, answers: CHALLENGE.map(() => null) });
    expect(d.act({ type: 'restart' })).toBe(false);
  });
});
