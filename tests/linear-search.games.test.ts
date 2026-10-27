import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { FOLLOW_STEP } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BEAR, CHALLENGE_GAMES, CHALLENGE_MAX, CHALLENGE_MIN, KID_N, PLAY_QUIZ, PREDICT_GOAL, TOYS, askPuzzle, binaryWorst,
  challengeAverage, challengeRules, findCells, findRules, level, makePuzzle, robotFrames, robotNote, robotRules, robotView, rounds,
  type ChallengeAction, type ChallengeState, type FindAction, type FindState, type RobotAction, type RobotState,
} from '../src/engine/linear-search';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
type Num<A> = Extract<Control<A>, { type: 'number' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「开箱子找小熊」', () => {
  const start = (seed = 1) => driver(findRules, seeded(seed));
  type G = ReturnType<typeof start>;
  const s = (g: G) => g.state as FindState;
  const tap = (k: number): FindAction => ({ type: 'tap', k });
  /** 随便挑一个不是小熊也没开过的箱子 */
  const otherThanBear = (g: G) => [...Array(KID_N).keys()].find((k) => k !== s(g).row.bear && !s(g).opened.includes(k))!;
  /** 从左往右开，直到找到小熊，一次重复都没有 */
  const solve = (g: G) => {
    for (let k = 0; !s(g).found; k++) g.act(tap(k));
  };

  it('开局：箱子都盖着、都能点，没有按钮；台词让孩子开箱子；小熊恰好藏在一个箱子里', () => {
    const g = start();
    expect(g.say).toEqual(m('find.say.start'));
    expect(findRules.clickable(g.state)).toBe(true);
    expect(findRules.controls(g.state)).toEqual([]);
    expect(findRules.result!(g.state)).toBeNull();
    expect(findCells(s(g)).every((c) => c.state === 'closed' && c.label === '')).toBe(true);
    expect(s(g).row.ids.filter((id) => id === BEAR)).toHaveLength(1);
    expect(s(g).row.ids[s(g).row.bear]).toBe(BEAR);
  });

  it('开一个不是小熊的箱子：出「对」的声音，说出里面的玩具，箱子翻开变淡', () => {
    const g = start();
    const k = otherThanBear(g);
    const id = s(g).row.ids[k];
    g.act(tap(k));
    expect(g.say).toEqual(m('find.say.open', { toy: TOYS[id], name: m('toy.' + id) }));
    expect(g.sounds.at(-1)).toBe('right');
    expect(findCells(s(g))[k]).toEqual({ label: TOYS[id], state: 'seen' });
    expect(s(g).opened).toEqual([k]);
    expect(g.after).toBeUndefined();
  });

  it('重复点开过的箱子：它晃一下（次数加一）、出错误音、提示换一个，重复次数加一但不算多开', () => {
    const g = start();
    const k = otherThanBear(g);
    const id = s(g).row.ids[k];
    g.act(tap(k));
    g.act(tap(k));
    expect(s(g).shake).toEqual([k, 1]);
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(g.say).toEqual(m('find.say.repeat', { toy: TOYS[id], name: m('toy.' + id) }));
    expect(s(g)).toMatchObject({ repeats: 1, opened: [k] });
    g.act(tap(k));
    expect(s(g).shake).toEqual([k, 2]);
    expect(s(g).repeats).toBe(2);
    // 再开别的箱子，晃的记录保留到下一局
    g.act(tap(otherThanBear(g)));
    expect(s(g).shake).toEqual([k, 2]);
  });

  it('找到小熊：出 win 声，小熊亮起来，不能再点；星星只看重复次数，不看运气', () => {
    for (const [repeats, stars] of [[0, 3], [1, 2], [2, 1], [5, 1]] as const) {
      const g = start(7);
      const k = otherThanBear(g);
      g.act(tap(k));
      for (let r = 0; r < repeats; r++) g.act(tap(k));
      g.act(tap(s(g).row.bear));
      expect(s(g).found).toBe(true);
      expect(g.say).toEqual(m('find.say.found'));
      expect(g.sounds.at(-1)).toBe('win');
      expect(findCells(s(g))[s(g).row.bear]).toEqual({ label: TOYS[BEAR], state: 'hit' });
      expect(findRules.result!(g.state)!.stars).toBe(stars);
      expect(findRules.clickable(g.state)).toBe(false);
      expect(g.act(tap(0))).toBe(false);
    }
  });

  it('结算：说你开了几个、从左往右一个个开要几个', () => {
    const g = start();
    g.act(tap(otherThanBear(g)));
    g.act(tap(s(g).row.bear));
    expect(findRules.result!(g.state)!.body).toEqual(m('find.summary', { n: 2, robot: s(g).row.bear + 1 }));
  });

  it('前两局不追问；第三局找到后追问「最倒霉要开几个」，选项 1、4、8', () => {
    const g = start();
    for (let round = 1; round <= 2; round++) {
      solve(g);
      expect(findRules.result!(g.state)!.quiz).toBeUndefined();
      g.act({ type: 'again' });
    }
    solve(g);
    const q = findRules.result!(g.state)!.quiz!;
    expect(q.prompt).toEqual(PLAY_QUIZ[0].ask);
    const opts = buttons(q.options);
    expect(opts.map((o) => o.label)).toEqual([1, 4, 8].map((n) => m('find.quiz.n', { n })));
    expect(opts.every((o) => o.look === 'choice')).toBe(true);
  });

  /** 玩到第三局找到，停在第一个追问 */
  const quizGame = () => {
    const g = start();
    for (let round = 1; round <= 2; round++) {
      solve(g);
      g.act({ type: 'again' });
    }
    solve(g);
    return g;
  };

  it('追问答错：出错误音，选项还在，灰字提示再想想；答对：选项收起，出「对」的声音，讲出道理', () => {
    const g = quizGame();
    g.act({ type: 'answer', n: 1 });
    let q = findRules.result!(g.state)!.quiz!;
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(q.note).toEqual(PLAY_QUIZ[0].why);
    expect(q.options).toHaveLength(3);
    expect(q.ok).toBeUndefined();
    g.act({ type: 'answer', n: 8 });
    q = findRules.result!(g.state)!.quiz!;
    expect(g.sounds.at(-1)).toBe('right');
    expect(q.options).toEqual([]);
    expect(q.note).toBeUndefined();
    expect(q.ok).toEqual(m('find.quiz.ok', { text: PLAY_QUIZ[0].right }));
    // 答对以后不能再答
    expect(g.act({ type: 'answer', n: 4 })).toBe(false);
  });

  it('答对后出「再问一个」，问「没有小熊呢」；问完最后一个就没有这个按钮了', () => {
    const g = quizGame();
    expect(g.act({ type: 'nextQuiz' })).toBe(false); // 还没答对
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.again')]);
    g.act({ type: 'answer', n: 8 });
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.nextQuiz'), m('find.again')]);
    expect(buttons(findRules.controls(g.state))[0].look).toBe('small');
    g.act({ type: 'nextQuiz' });
    const q = findRules.result!(g.state)!.quiz!;
    expect(q.prompt).toEqual(PLAY_QUIZ[1].ask);
    expect(q.options).toHaveLength(3);
    g.act({ type: 'answer', n: 0 });
    expect(findRules.result!(g.state)!.quiz!.note).toEqual(PLAY_QUIZ[1].why);
    g.act({ type: 'answer', n: 8 });
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.again')]);
    expect(g.act({ type: 'nextQuiz' })).toBe(false);
  });

  it('再藏一次：新的一局从头开始，台词换成「再藏一次」；追问问到哪里、玩过几局保留；没找到时不接受', () => {
    const g = quizGame();
    g.act({ type: 'answer', n: 8 });
    g.act({ type: 'nextQuiz' });
    g.act({ type: 'again' });
    expect(s(g)).toMatchObject({ found: false, opened: [], repeats: 0, shake: null, games: 3, quizAt: 1, quizState: 'ask' });
    expect(g.say).toEqual(m('find.say.again'));
    expect(g.act({ type: 'again' })).toBe(false);
    expect(findRules.result!(g.state)).toBeNull();
    // 下一局找到后，接着问第二个追问
    solve(g);
    expect(findRules.result!(g.state)!.quiz!.prompt).toEqual(PLAY_QUIZ[1].ask);
  });
});

describe('玩法二「藏小熊，看机器人找」', () => {
  const start = () => driver(robotRules);
  type G = ReturnType<typeof start>;
  const s = (g: G) => g.state as RobotState;
  const hide = (at: number | null): RobotAction => ({ type: 'hide', at });
  /** 藏好并让机器人走完 */
  const run = (g: G, at: number | null) => {
    g.act(hide(at));
    g.settle();
  };

  it('开局：箱子盖着、没有箭头，按钮都能按，台词让孩子选箱子，引导语说怎么玩', () => {
    const g = start();
    expect(g.say).toEqual(m('robot.say.idle'));
    expect(robotRules.clickable(g.state)).toBe(true);
    expect(robotRules.controls(g.state)).toEqual([]);
    expect(robotView(s(g))).toEqual({ cells: Array.from({ length: KID_N }, () => ({ label: '', state: 'closed' })), pointer: -1 });
    expect(robotNote([])).toEqual(m('robot.note.none'));
  });

  it('藏好：出「嗒」声，机器人开始找；走的时候按钮灰着、不接受新的藏法；每一步停顿一样长', () => {
    const g = start();
    g.act(hide(2));
    expect(g.sounds.at(-1)).toBe('tap');
    expect(g.say).toEqual(m('robot.say.start'));
    expect(g.after).toBe(FOLLOW_STEP);
    expect(robotRules.clickable(g.state)).toBe(false);
    expect(g.act(hide(5))).toBe(false);
    g.tick();
    expect(g.sounds.at(-1)).toBe('tick');
    expect(g.say).toEqual(m('robot.say.open', { n: 1, toy: TOYS[0] }));
    expect(robotView(s(g)).pointer).toBe(0);
    expect(g.after).toBe(FOLLOW_STEP);
  });

  it('机器人从左往右一个个开，开到小熊为止；最后一帧停一拍再出 win 声、记下结果、按钮重新能按', () => {
    for (let at = 0; at < KID_N; at++) {
      const g = start();
      g.act(hide(at));
      g.settle();
      expect(g.afters.every((a) => a === FOLLOW_STEP)).toBe(true);
      expect(g.afters).toHaveLength(at + 2); // 开始 + 每一帧 + 最后一帧各一拍
      expect(g.sounds.slice(1, -1).every((x) => x === 'tick')).toBe(true);
      expect(g.sounds.at(-1)).toBe('win');
      expect(g.say).toEqual(m('robot.say.found', { n: at + 1 }));
      expect(s(g)).toMatchObject({ running: false, tally: [{ at, count: at + 1 }] });
      expect(robotRules.clickable(g.state)).toBe(true);
      expect(g.after).toBeUndefined();
    }
  });

  it('不藏：全部开完，台词说没有小熊，箱子全部翻开，记成「不藏」开了 8 个', () => {
    const g = start();
    run(g, null);
    expect(g.say).toEqual(m('robot.say.none', { n: KID_N }));
    expect(robotView(s(g)).pointer).toBe(-1);
    expect(robotView(s(g)).cells.every((c) => c.state === 'seen')).toBe(true);
    expect(s(g).tally).toEqual([{ at: null, count: KID_N }]);
    expect(robotFrames(null)).toHaveLength(KID_N + 1);
  });

  it('试过的结果按位置排好（不藏排最后），同一种藏法只留最新的一条', () => {
    const g = start();
    run(g, null);
    run(g, 6);
    run(g, 0);
    run(g, 6);
    expect(s(g).tally).toEqual([{ at: 0, count: 1 }, { at: 6, count: 7 }, { at: null, count: KID_N }]);
  });

  it('引导语：没试过 → 提示怎么玩；试了最前面和最后面（或不藏）→ 说出「没有捷径」；差得多 → 再试两头；其余 → 再换个地方', () => {
    expect(robotNote([])).toEqual(m('robot.note.none'));
    expect(robotNote([{ at: 0, count: 1 }, { at: 7, count: 8 }])).toEqual(m('robot.note.got', { n: KID_N }));
    expect(robotNote([{ at: 1, count: 2 }, { at: null, count: 8 }])).toEqual(m('robot.note.got', { n: KID_N }));
    expect(robotNote([{ at: 3, count: 4 }, { at: 5, count: 6 }])).toEqual(m('robot.note.differ'));
    expect(robotNote([{ at: 3, count: 4 }])).toEqual(m('robot.note.more'));
    expect(robotNote([{ at: 3, count: 4 }, { at: 4, count: 5 }])).toEqual(m('robot.note.more'));
  });

  it('切标签：机器人停在当前这一帧，不记结果，按钮重新能按', () => {
    const g = start();
    g.act(hide(5));
    g.tick();
    g.tick();
    g.interrupt();
    expect(s(g)).toMatchObject({ running: false, at: 2, tally: [] });
    expect(g.after).toBeUndefined();
    expect(robotRules.clickable(g.state)).toBe(true);
    run(g, 1);
    expect(s(g).tally).toEqual([{ at: 1, count: 2 }]);
  });
});

describe('挑战', () => {
  const game = (seed = 3) => driver(challengeRules, seeded(seed));
  type G = ReturnType<typeof game>;
  const st = (g: G) => g.state as ChallengeState;
  const guess = (n: number): ChallengeAction => ({ type: 'guess', n });
  const input = (g: G) => challengeRules.controls(g.state)[0] as Num<ChallengeAction>;
  /** 答完最坏和平均，停在让程序藏 200 次的一步 */
  const toSim = (g: G) => {
    g.act(guess(st(g).n));
    g.act(guess(challengeAverage(st(g).n)));
  };

  it('出题：箱子数是奇数，在范围内', () => {
    const rand = seeded(9);
    for (let k = 0; k < 100; k++) {
      const n = (driver(challengeRules, rand).state as ChallengeState).n;
      expect(n % 2).toBe(1);
      expect(n).toBeGreaterThanOrEqual(CHALLENGE_MIN);
      expect(n).toBeLessThanOrEqual(CHALLENGE_MAX);
    }
  });

  it('开局：先猜最坏要开几个；输入框的问题、灰字和最小值都对，提交的是猜测', () => {
    const g = game();
    expect(st(g)).toMatchObject({ step: 'worst', oops: null, ok: null, result: null });
    expect(g.say).toBeNull();
    expect(challengeRules.clickable(g.state)).toBe(false);
    expect(challengeRules.result!(g.state)).toBeNull();
    expect(input(g)).toMatchObject({
      type: 'number', min: 1, label: m('chal.q.worst'), placeholder: m('chal.placeholder'), submitLabel: m('chal.submit'), clearOn: 0,
    });
    expect(input(g).submit(7)).toEqual(guess(7));
    expect(input(g).invalid).toEqual(guess(NaN));
  });

  it('输入不是正整数：提示请输入大于 0 的整数，不出声，不算猜测，输入框不清空', () => {
    const g = game();
    for (const n of [NaN, 0, -4]) {
      g.act(guess(n));
      expect(st(g).oops).toEqual(m('chal.oops'));
      expect(st(g).step).toBe('worst');
      expect(input(g).clearOn).toBe(0);
    }
    expect(g.sounds).toEqual([]);
  });

  it('最坏猜错：猜多了说比总数还多、猜少了提醒最倒霉的情况；出错误音，输入框清空，仍停在这一步', () => {
    const g = game();
    const n = st(g).n;
    g.act(guess(n + 3));
    expect(st(g).oops).toEqual(m('chal.worst.over', { guess: n + 3 }));
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(input(g).clearOn).toBe(1);
    g.act(guess(n - 1));
    expect(st(g).oops).toEqual(m('chal.worst.low'));
    expect(input(g).clearOn).toBe(2);
    expect(st(g)).toMatchObject({ step: 'worst', ok: null });
  });

  it('最坏猜对：出「对」的声音，留下讲解，提示清掉，进入猜平均', () => {
    const g = game();
    const n = st(g).n;
    g.act(guess(n - 1));
    g.act(guess(n));
    expect(st(g)).toMatchObject({ step: 'avg', oops: null, ok: m('chal.worst.ok', { n }) });
    expect(g.sounds.at(-1)).toBe('right');
    expect(input(g).label).toEqual(m('chal.q.avg'));
  });

  it('平均允许差 1；猜错时讲解不清掉上一步的「对」，只在提示里说', () => {
    const g = game();
    const n = st(g).n;
    const avg = challengeAverage(n);
    g.act(guess(n));
    g.act(guess(n));
    expect(st(g).oops).toEqual(m('chal.avg.low', { n }));
    expect(st(g).ok).toEqual(m('chal.worst.ok', { n }));
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act(guess(avg + 1));
    expect(st(g)).toMatchObject({ step: 'sim', oops: null, ok: m('chal.avg.ok', { n, avg }) });
    expect(g.sounds.at(-1)).toBe('right');
  });

  it('藏 200 次：先只有一个主按钮；点了出 win 声，给结果和四个数；结果出来后换成「再藏」「换一排」', () => {
    const g = game();
    toSim(g);
    expect(buttons(challengeRules.controls(g.state))).toMatchObject([{ look: 'primary', label: m('chal.run', { games: CHALLENGE_GAMES }) }]);
    expect(challengeRules.result!(g.state)).toBeNull();
    expect(challengeRules.hud!(g.state).chips).toEqual([]);
    g.act({ type: 'run' });
    const n = st(g).n;
    expect(g.sounds.at(-1)).toBe('win');
    const r = st(g).result!;
    expect(r.worst).toBeLessThanOrEqual(n);
    expect(r.best).toBeGreaterThanOrEqual(1);
    expect(Math.abs(r.average - challengeAverage(n))).toBeLessThan(n / 4);
    expect(challengeRules.result!(g.state)).toEqual({ title: m('chal.win'), body: m('chal.winBody', { n, bin: binaryWorst(n) }) });
    expect(challengeRules.hud!(g.state).chips).toEqual([
      [m('chal.avgLabel'), m('chal.count', { v: r.average.toFixed(1) })],
      [m('chal.calcLabel'), m('chal.count', { v: challengeAverage(n) })],
      [m('chal.bestLabel'), m('chal.count', { v: r.best })],
      [m('chal.worstLabel'), m('chal.count', { v: r.worst })],
    ]);
    expect(buttons(challengeRules.controls(g.state)).map((b) => [b.label, b.look])).toEqual([
      [m('chal.again', { games: CHALLENGE_GAMES }), 'small'], [m('chal.fresh'), 'small'],
    ]);
    g.act({ type: 'run' });
    expect(st(g).result).not.toBeNull();
  });

  it('还没猜完时不能藏 200 次，猜完以后不再接受猜测', () => {
    const g = game();
    expect(g.act({ type: 'run' })).toBe(false);
    toSim(g);
    expect(g.act(guess(3))).toBe(false);
  });

  it('换一排：重新出题，从猜最坏开始，提示和结果都清掉', () => {
    const g = game();
    toSim(g);
    g.act({ type: 'run' });
    g.act({ type: 'fresh' });
    expect(st(g)).toMatchObject({ step: 'worst', oops: null, ok: null, result: null, guesses: 0 });
  });
});

describe('猜下一步：题目按流程走', () => {
  it('随机题：全答对到结局，台词是「✅ 结果」；答错先解释再继续；连对 5 次过关', () => {
    const rand = seeded(11);
    const pd = level.predict!.main;
    expect(pd.goal).toBe(PREDICT_GOAL);
    let s = pr.startPredict(pd.puzzle(rand), PREDICT_GOAL);
    for (let q = 0; q < 6; q++) {
      for (let guard = 0; guard < 30 && s.phase !== 'end'; guard++) {
        const ask = s.puzzle.asks[s.i];
        expect(ask.kind).toBe('choose');
        expect(ask.options!.map((o) => o.value)).toContain(ask.answer);
        s = pr.answer(s, ask.answer)!.state;
      }
      expect(s.phase).toBe('end');
      expect(pr.viewOf(s).prompt.key).toBe('predict.end');
      s = pr.nextPuzzle(s, pd.puzzle(rand));
    }
    expect(s.passed).toBe(true);
    expect(s.streak).toBeGreaterThanOrEqual(PREDICT_GOAL);
  });

  it('答错：连对清零、出错误音、显示解释，点「继续」往下一问', () => {
    const p = askPuzzle(makePuzzle('middle', undefined, seeded(2)), seeded(2));
    let s = pr.startPredict(p, PREDICT_GOAL, { streak: 3, passed: false });
    const wrong = p.asks[0].options!.find((o) => o.value !== p.asks[0].answer)!.value;
    const out = pr.answer(s, wrong)!;
    expect(out.sound).toBe('wrong');
    expect(out.state).toMatchObject({ streak: 0, phase: 'wrong' });
    expect(pr.viewOf(out.state).wrong).toEqual(p.asks[0].why);
    s = pr.proceed(out.state)!;
    expect(s.i).toBe(1);
  });

  it('各种题的问法：每个位置问「相等吗」，第一次不相等后问一次「i 变成几」，最后问返回什么或结束', () => {
    for (const kind of ['first', 'middle', 'last', 'missing', 'dup'] as const) {
      const p = makePuzzle(kind, undefined, seeded(5));
      const list = rounds(p, seeded(5));
      const puzzle = askPuzzle(p, seeded(5));
      expect(puzzle.asks).toHaveLength(list.length);
      expect(puzzle.chips).toEqual([['target', p.target]]);
      list.forEach((r, k) => {
        const view = puzzle.asks[k].view;
        expect(view.i).toBe(r.kind === 'next' ? r.i + 1 : r.i);
        expect(view.pointer).toBe(r.kind === 'cmp' ? r.i : -1);
        expect(view.hits).toEqual([]);
      });
      const last = list[list.length - 1];
      expect(puzzle.end.view.hits).toEqual(last.kind === 'cmp' ? [last.i] : []);
      expect(puzzle.end.view.pointer).toBe(last.kind === 'cmp' ? last.i : -1);
      expect(puzzle.end.prompt).toEqual(m('predict.end', { result: last.result! }));
      expect(list.filter((r) => r.kind === 'next').length).toBe(kind === 'first' ? 0 : 1);
    }
  });
});

describe('看和逐步执行的规则', () => {
  it('看：每次都是同一个故事，再看一次回到开头', () => {
    const r = level.look!.story;
    expect(r.next(r.first)).toBe(r.first);
    expect(r.frames(r.first).length).toBe(r.frames(r.next(r.first)).length);
    expect(r.frames(r.first).length).toBeGreaterThan(8);
  });

  it('逐步执行：默认「在中间」；换题型就换一组数；「换一组数」保持题型；控件是分段选择加一个小按钮', () => {
    const tr = level.trace!.main;
    const rand = seeded(4);
    let input = tr.start(rand);
    expect(input.kind).toBe('middle');
    input = tr.act(input, { type: 'kind', kind: 'missing' }, rand);
    expect(input.kind).toBe('missing');
    expect(input.arr.includes(input.target)).toBe(false);
    const before = input.arr.join();
    input = tr.act(input, { type: 'fresh' }, rand);
    expect(input.kind).toBe('missing');
    expect(input.arr.join()).not.toBe(before);
    const cs = tr.controls(input);
    expect(cs).toMatchObject([
      { type: 'segmented', legend: m('trace.where'), value: 'missing' },
      { type: 'button', look: 'small', label: m('trace.fresh') },
    ]);
    if (cs[0].type === 'segmented') {
      expect(cs[0].options.map((o) => o.label)).toEqual(['first', 'middle', 'last', 'missing', 'dup'].map((k) => m('trace.kind.' + k)));
      expect(cs[0].choose('dup')).toEqual({ type: 'kind', kind: 'dup' });
    }
  });

  it('逐步执行：变量标签和总结跟着步骤走', () => {
    const tr = level.trace!.main;
    const input = { kind: 'middle' as const, arr: [4, 9, 2], target: 9 };
    const steps = tr.trace(input);
    expect(tr.vars(input, steps[0])).toEqual([
      ['target', 9], ['i', '—'], ['arr[i]', '—'], [m('var.checks'), m('var.times', { n: 0 })], [m('var.ret'), '—'],
    ]);
    const last = steps.at(-1)!;
    expect(tr.vars(input, last)[4]).toEqual([m('var.ret'), 1]);
    expect(tr.summary!(input, steps[0])).toBeNull();
    expect(tr.summary!(input, last)).toEqual(m('trace.sumHit', { result: 1, checks: 2 }));
    const miss = { ...input, target: 5 };
    expect(tr.summary!(miss, tr.trace(miss).at(-1)!)).toEqual(m('trace.sumMiss', { n: 3, checks: 3 }));
  });
});
