import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { PAUSE_MID, PAUSE_SHORT } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BIG, CHALLENGE_CAP, ringItems, PREDICT_CAP, SEATS, arrivedOf, cardAnswer, challengeRules, challengeView, clerkCard, clerkRules, makePuzzle,
  nextRules, nextUp, predictRules, rounds, simulate, stars, traceRules, type ChallengeState, type ClerkAction, type ClerkState, type NextAction,
  type NextGame,
} from '../src/engine/queue';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「谁先买到？」', () => {
  const pick = (who: string): NextAction => ({ type: 'pick', who });
  /** 客人陆续来，停在第一次要孩子点的时候 */
  function asking(seed = 1) {
    const g = driver(nextRules, seeded(seed));
    g.settle();
    return g;
  }
  /** 一路点对，直到进入追问 */
  function toQuiz(g: ReturnType<typeof driver<NextGame, NextAction>>) {
    for (let guard = 0; guard < 200 && g.state.phase !== 'quiz'; guard++) {
      if (g.state.phase === 'ask') g.act(pick(g.state.line[0]));
      else g.settle();
    }
  }

  it('开局：说奶茶店开门了，客人过一会儿才来；只有排队的人能点，现在还不能点', () => {
    const g = driver(nextRules, seeded(1));
    expect(g.say).toEqual(m('next.say.open'));
    expect(g.after).toBe(PAUSE_SHORT);
    expect(g.state).toMatchObject({ phase: 'walk', at: 0, line: [], served: [], mistakes: 0 });
    expect(nextRules.clickable(g.state)).toBe(false);
    expect(g.act(pick('🐼'))).toBe(false);
  });

  it('客人一个个来：排进队尾、出「嗒」声、说现在队里有几位；遇到店员发问就停下等孩子点', () => {
    const g = driver(nextRules, seeded(2));
    g.tick();
    expect(g.state.line).toHaveLength(1);
    expect(g.say).toEqual(m('next.say.arrive', { who: g.state.line[0], n: 1 }));
    expect(g.sounds.at(-1)).toBe('tick');
    expect(g.after).toBe(PAUSE_SHORT);
    g.settle();
    expect(g.state.phase).toBe('ask');
    expect(g.say).toEqual(m('next.say.ask'));
    expect(g.after).toBeUndefined();
    expect(nextRules.clickable(g.state)).toBe(true);
    expect(g.state.line.length).toBeGreaterThanOrEqual(2);
    expect(g.state.line.length).toBeLessThanOrEqual(4);
  });

  it('点了不是队头的人：他晃一下，队头举手，说他不是最先来的；点大象有专门的一句；再点计数加一', () => {
    const g = asking();
    const head = g.state.line[0];
    const other = g.state.line.find((x) => x !== head && x !== BIG)!;
    g.act(pick(other));
    expect(g.state).toMatchObject({ mistakes: 1, shake: [other, 1], raise: head, phase: 'ask' });
    expect(g.say).toEqual(m('next.say.notFirst', { who: other }));
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act(pick(BIG));
    expect(g.state).toMatchObject({ mistakes: 2, shake: [BIG, 2], raise: head });
    expect(g.say).toEqual(m('next.say.big'));
    expect(g.state.line[0]).toBe(head); // 队伍没变
  });

  it('点对队头：举手收起、出「对」声，他离开队伍；一会儿后进队伍里的下一件事', () => {
    const g = asking();
    g.act(pick(g.state.line[1])); // 先错一次，让队头举手
    expect(g.state.raise).not.toBeNull();
    const head = g.state.line[0];
    g.act(pick(head));
    expect(g.state).toMatchObject({ raise: null, phase: 'serve', leaving: head });
    expect(g.say).toEqual(m('next.say.serve', { who: head }));
    expect(g.sounds.at(-1)).toBe('right');
    expect(g.after).toBe(PAUSE_MID);
    expect(g.act(pick(head))).toBe(false); // 正在离开，不能再点
    g.tick();
    expect(g.state.served).toEqual([head]);
    expect(g.state.line).not.toContain(head);
    expect(g.state.leaving).toBeNull();
  });

  it('剧本走完：队里的人全买到，买到的顺序就是来的顺序；追问「谁能先买到」', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = driver(nextRules, seeded(seed));
      toQuiz(g);
      expect(g.state.phase).toBe('quiz');
      expect(g.say).toEqual(m('next.say.quiz'));
      expect(g.state.line).toEqual([]);
      expect(g.state.served).toEqual(arrivedOf(g.state.script));
      expect(nextRules.clickable(g.state)).toBe(false);
      expect(nextRules.controls(g.state)).toEqual([]);
    }
  });

  it('追问有三个选项，没有问题句（问题在台词里）；答错：出「错」声，把来的顺序和买到的顺序摆出来比；答对：出「赢」声，三星', () => {
    const g = driver(nextRules, seeded(3));
    toQuiz(g);
    let r = nextRules.result!(g.state)!;
    expect(r.quiz!.prompt).toBeUndefined();
    expect(buttons(r.quiz!.options).map((b) => b.label)).toEqual([m('next.quiz.first'), m('next.quiz.last'), m('next.quiz.big')]);
    expect(r.art).toBeUndefined();
    expect(r.stars).toBeUndefined();
    g.act({ type: 'quiz', c: 'big' });
    expect(g.state.quiz).toBe('wrong');
    expect(g.say).toEqual(m('next.say.wrong'));
    expect(g.sounds.at(-1)).toBe('wrong');
    r = nextRules.result!(g.state)!;
    expect(r.art).toEqual({ scene: 'ServedCompare', props: { arrived: arrivedOf(g.state.script), served: g.state.served } });
    expect(r.quiz!.options).toHaveLength(3);
    g.act({ type: 'quiz', c: 'last' });
    expect(g.state.phase).toBe('quiz');
    g.act({ type: 'quiz', c: 'first' });
    expect(g.state.phase).toBe('done');
    expect(g.say).toEqual(m('next.say.right'));
    expect(g.sounds.at(-1)).toBe('win');
    r = nextRules.result!(g.state)!;
    expect(r).toEqual({ stars: 3 });
    expect(buttons(nextRules.controls(g.state)).map((b) => b.label)).toEqual([m('next.again')]);
    expect(g.act({ type: 'quiz', c: 'first' })).toBe(false);
  });

  it('星星：错 0 次三颗，1～2 次两颗，更多一颗', () => {
    for (const misses of [0, 1, 2, 3]) {
      const g = asking(4);
      for (let k = 0; k < misses; k++) g.act(pick(g.state.line[1]));
      toQuiz(g);
      g.act({ type: 'quiz', c: 'first' });
      expect(nextRules.result!(g.state)!.stars).toBe(stars(misses));
    }
  });

  it('再来一局：换一批客人，台词说又来了一批；只有答对以后才能再来', () => {
    const g = asking(5);
    expect(g.act({ type: 'again' })).toBe(false);
    toQuiz(g);
    g.act({ type: 'quiz', c: 'first' });
    const old = g.state.script;
    expect(g.act({ type: 'again' })).toBe(true);
    expect(g.say).toEqual(m('next.say.again'));
    expect(g.after).toBe(PAUSE_SHORT);
    expect(g.state).toMatchObject({ phase: 'walk', at: 0, line: [], served: [], mistakes: 0 });
    expect(g.state.script).not.toBe(old);
  });

  it('切标签：客人还在来或者正在离开的局重新开一局；等孩子点和追问中的不动', () => {
    const g = driver(nextRules, seeded(6));
    g.tick();
    g.interrupt();
    expect(g.state).toMatchObject({ phase: 'walk', at: 0, line: [] });
    expect(g.say).toEqual(m('next.say.again'));
    g.settle();
    g.act(pick(g.state.line[0]));
    expect(g.state.phase).toBe('serve');
    g.interrupt();
    expect(g.state).toMatchObject({ phase: 'walk', at: 0 });
    g.settle();
    const waiting = g.state;
    g.interrupt();
    expect(g.state).toBe(waiting);
    toQuiz(g);
    const quiz = g.state;
    g.interrupt();
    expect(g.state).toBe(quiz);
  });

  it('每次被问到答案都是队头；大象第一次进队伍时排在后面，不是队头', () => {
    for (let seed = 1; seed < 20; seed++) {
      const g = driver(nextRules, seeded(seed));
      let bigSeen = false;
      for (let guard = 0; guard < 200 && g.state.phase !== 'quiz'; guard++) {
        if (g.state.phase === 'ask') {
          expect(nextUp(g.state.line)).toBe(g.state.line[0]);
          if (!bigSeen && g.state.line.includes(BIG)) {
            bigSeen = true;
            expect(g.state.line[0]).not.toBe(BIG);
          }
          g.act(pick(g.state.line[0]));
        } else g.settle();
      }
    }
  });
});

describe('玩法二「我是店员」', () => {
  const pick = (i: number): ClerkAction => ({ type: 'pick', i });
  const rightOf = (s: ClerkState) => cardAnswer(s.ring, clerkCard(s)!);
  function finish(g: ReturnType<typeof driver<ClerkState, ClerkAction>>) {
    while (clerkCard(g.state)) g.act(pick(rightOf(g.state)));
  }

  it('开局：椅子围成一圈，开局有两位顾客，第一张卡是来人，台词问他该坐哪把', () => {
    const g = driver(clerkRules, seeded(1));
    const c = clerkCard(g.state)!;
    expect('arrive' in c).toBe(true);
    expect(g.say).toEqual(m('clerk.say.arrive', { who: (c as { arrive: string }).arrive }));
    expect(g.state.ring.size).toBe(2);
    expect(g.state.ring.cells).toHaveLength(SEATS);
    expect(clerkRules.clickable(g.state)).toBe(true);
    expect(clerkRules.controls(g.state)).toEqual([]);
    expect(clerkRules.result!(g.state)).toBeNull();
  });

  it('来人点错椅子：椅子晃一下、正确的椅子透光；点的是有人坐的就说有人坐了，点的是空的就提醒跟着箭头找；次数加一', () => {
    const g = driver(clerkRules, seeded(2));
    const right = rightOf(g.state);
    const taken = g.state.ring.head; // 队头那把有人
    g.act(pick(taken));
    expect(g.state).toMatchObject({ mistakes: 1, shake: [taken, 1], glow: [right, 1], at: 0 });
    expect(g.say).toEqual(m('clerk.say.taken'));
    expect(g.sounds.at(-1)).toBe('wrong');
    const empty = g.state.ring.cells.findIndex((v, i) => v === null && i !== right);
    g.act(pick(empty));
    expect(g.state).toMatchObject({ mistakes: 2, shake: [empty, 2], glow: [right, 2] });
    expect(g.say).toEqual(m('clerk.say.follow'));
    g.act(pick(right));
    expect(g.state.glow).toBeNull();
  });

  it('卖出点错：队头举手，问谁等得最久；点对后举手收起', () => {
    const g = driver(clerkRules, seeded(3));
    while ('arrive' in clerkCard(g.state)!) g.act(pick(rightOf(g.state)));
    const head = rightOf(g.state);
    const wrong = g.state.ring.cells.findIndex((v, i) => v !== null && i !== head);
    g.act(pick(wrong));
    expect(g.state).toMatchObject({ raise: head, mistakes: 1, shake: [wrong, 1] });
    expect(g.say).toEqual(m('clerk.say.who'));
    g.act(pick(head));
    expect(g.state.raise).toBeNull();
    expect(g.state.served).toHaveLength(1);
  });

  it('点对：出「对」声，椅子上的人照卡片坐下或离开，台词先说做了什么再说下一张', () => {
    const g = driver(clerkRules, seeded(4));
    const c = clerkCard(g.state) as { arrive: string };
    const i = rightOf(g.state);
    g.act(pick(i));
    expect(g.state.ring.cells[i]).toBe(c.arrive);
    expect(g.sounds.at(-1)).toBe('right');
    const next = clerkCard(g.state)!;
    const nextSay = 'arrive' in next ? m('clerk.say.arrive', { who: next.arrive }) : m('clerk.say.sell');
    expect(g.say).toEqual(m('clerk.say.joined', { done: m('clerk.done.arrive', { who: c.arrive, i }), next: nextSay }));
  });

  it('最后一张卡做完：出「对」和「赢」两个声，按错的次数给星星，说椅子转着圈用；买到的顺序是先来的先买', () => {
    for (let seed = 1; seed < 20; seed++) {
      const g = driver(clerkRules, seeded(seed));
      finish(g);
      expect(g.sounds.slice(-2)).toEqual(['right', 'win']);
      expect(clerkRules.result!(g.state)).toEqual({ stars: 3, body: m('clerk.result', { n: SEATS - 1 }) });
      expect(g.say).toEqual(m('clerk.say.joined', { done: expect.anything(), next: m('clerk.say.end') }));
      expect(clerkRules.clickable(g.state)).toBe(false);
      expect(buttons(clerkRules.controls(g.state)).map((b) => b.label)).toEqual([m('clerk.again')]);
      // 买到的顺序 = 先坐下的顺序：开局的两位，再加上来的人，依次
      const sells = g.state.game.cards.filter((c) => 'sell' in c).length;
      expect(g.state.served).toHaveLength(sells);
      const order = [...ringItems(g.state.game.start), ...g.state.game.cards.flatMap((c) => ('arrive' in c ? [c.arrive] : []))];
      expect(g.state.served).toEqual(order.slice(0, sells));
    }
  });

  it('星星', () => {
    for (const misses of [0, 1, 2, 3, 5]) {
      const g = driver(clerkRules, seeded(7));
      for (let k = 0; k < misses; k++) g.act(pick(g.state.ring.cells.findIndex((_v, i) => i !== rightOf(g.state))));
      finish(g);
      expect(clerkRules.result!(g.state)!.stars).toBe(stars(misses));
    }
  });

  it('再来一局：新局面，错的次数清零；没做完不能再来', () => {
    const g = driver(clerkRules, seeded(8));
    expect(g.act({ type: 'again' })).toBe(false);
    g.act(pick(g.state.ring.head));
    finish(g);
    const old = g.state.game;
    g.act({ type: 'again' });
    expect(g.state).toMatchObject({ at: 0, mistakes: 0, glow: null, raise: null, served: [] });
    expect(g.state.game).not.toBe(old);
    expect(clerkCard(g.state)).not.toBeNull();
  });

  it('做完以后椅子不能再点', () => {
    const g = driver(clerkRules, seeded(9));
    finish(g);
    expect(g.act(pick(0))).toBe(false);
  });
});

describe('逐步执行的设置栏', () => {
  it('默认是「绕一圈」；选满了、空了换预设；随机每次不同，只有选了随机才有「换一串」', () => {
    const t = traceRules;
    const first = t.start();
    expect(first.which).toBe('wrap');
    expect(t.controls(first).map((c) => c.type)).toEqual(['segmented']);
    const full = t.act(first, { type: 'which', which: 'full' });
    expect(full).toMatchObject({ which: 'full', cap: 3 });
    const a = t.act(full, { type: 'which', which: 'random' }, seeded(1));
    const b = t.act(a, { type: 'again' }, seeded(2));
    expect(a.cap).toBe(5);
    expect(b.which).toBe('random');
    expect(b.ops).not.toEqual(a.ops);
    expect(t.controls(a).map((c) => c.type)).toEqual(['segmented', 'button']);
  });
});

describe('猜下一步', () => {
  it('每个操作两问：先点格子（也可以点「满了」「空了」），再点指针；满了、空了只有一问', () => {
    for (let seed = 1; seed < 40; seed++) {
      const puzzle = predictRules.puzzle(seeded(seed));
      const rs = rounds(PREDICT_CAP, puzzle.asks[0].view.ops);
      expect(puzzle.asks.length).toBe(rs.reduce((n, r) => n + (typeof r.at === 'number' ? 2 : 1), 0));
      for (const ask of puzzle.asks) {
        expect(ask.kind).toBe('pick');
        expect(ask.chips).toHaveLength(2);
      }
      // 第一问带两个补充按钮，第二问没有
      expect(puzzle.asks.filter((a) => a.options).length).toBe(rs.length);
    }
  });

  it('全答对：点格子、点按钮、再点指针，一路走到结局；答案和 simulate 一致', () => {
    for (let seed = 1; seed < 30; seed++) {
      const puzzle = predictRules.puzzle(seeded(seed));
      const ops = puzzle.asks[0].view.ops;
      let s = pr.startPredict(puzzle, 6);
      let guard = 0;
      while (s.phase !== 'end' && guard++ < 100) {
        const v = pr.viewOf(s);
        // 第一问有补充按钮，第二问没有
        expect(v.pickable).toBe(true);
        expect(v.options !== null).toBe(puzzle.asks[s.i].options !== undefined);
        s = pr.answer(s, puzzle.asks[s.i].answer)!.state;
      }
      expect(s.phase).toBe('end');
      const end = pr.viewOf(s);
      expect(end.ended).toBe(true);
      expect(end.view.size).toBe(simulate(PREDICT_CAP, ops).ring.size);
      expect(end.chips).toEqual([[m('vars.cap'), PREDICT_CAP], ['size', end.view.size]]);
    }
  });

  it('点错：算连对清零，讲解里点明原因；点「满了」答案却是格子，也算错', () => {
    const puzzle = predictRules.puzzle(seeded(3));
    let s = pr.startPredict(puzzle, 6);
    const ask = puzzle.asks[0];
    const wrong = typeof ask.answer === 'number' ? 'full' : 0;
    const out = pr.answer(s, wrong)!;
    expect(out.state.phase).toBe('wrong');
    expect(out.state.streak).toBe(0);
    expect(out.sound).toBe('wrong');
    expect(pr.viewOf(out.state).wrong).toEqual(ask.why);
    s = pr.proceed(out.state)!;
    expect(s.i).toBe(1);
  });

  it('连对 6 次过关', () => {
    expect(predictRules.goal).toBe(6);
  });

  it('补充按钮：满了点「满了」、空了点「空了」才对', () => {
    const ops = [{ kind: 'poll' as const }, { kind: 'offer' as const, x: 11 }];
    const p = makePuzzle(3, ops);
    expect(p.asks[0].answer).toBe('empty');
    expect(p.asks[0].options!.map((o) => o.value)).toEqual(['full', 'empty']);
  });
});

describe('挑战：预测数组最后的样子', () => {
  const g0 = () => driver(challengeRules, seeded(1));
  const labels = (cs: Control<unknown>[]) => buttons(cs).map((b) => b.label);

  it('开局：每格都选「空」，head、tail 都是 0，两个选择器加「揭晓」「换一题」', () => {
    const g = g0();
    expect(g.state).toMatchObject({ guess: ['', '', '', '', ''], head: 0, tail: 0, shown: false });
    const cs = challengeRules.controls(g.state);
    expect(cs.map((c) => c.type)).toEqual(['segmented', 'segmented', 'button', 'button']);
    expect(labels(cs as Control<unknown>[])).toEqual([m('chal.reveal'), m('chal.fresh')]);
    const seg = cs[0] as Extract<Control<unknown>, { type: 'segmented' }>;
    expect(seg.options).toHaveLength(CHALLENGE_CAP);
    expect(seg.choose(3)).toEqual({ type: 'head', n: 3 });
  });

  it('选格子、选 head、选 tail；揭晓以后格子不能再改，但 head、tail 还能改，成绩跟着变', () => {
    const g = g0();
    const v = challengeView(g.state);
    // 照标准答案选满
    v.answer.cells.forEach((c, k) => g.act({ type: 'cell', k, v: c === null ? '' : String(c) }));
    g.act({ type: 'head', n: v.answer.head });
    g.act({ type: 'tail', n: v.answer.tail });
    expect(challengeView(g.state).score).toBe(CHALLENGE_CAP + 2);
    g.act({ type: 'reveal' });
    expect(g.state.shown).toBe(true);
    expect(labels(challengeRules.controls(g.state) as Control<unknown>[])).toEqual([m('chal.fresh')]);
    expect(g.act({ type: 'reveal' })).toBe(false);
    expect(g.act({ type: 'cell', k: 0, v: '99' })).toBe(false);
    g.act({ type: 'head', n: (v.answer.head + 1) % CHALLENGE_CAP });
    expect(challengeView(g.state).score).toBe(CHALLENGE_CAP + 1);
  });

  it('评分：每一格一项加 head、tail 共 7 项；出队的旧值也算在格子里', () => {
    const g = g0();
    const v = challengeView(g.state);
    expect(v.full).toBe(CHALLENGE_CAP + 2);
    // 一格都不选：只有真的是「从没写过」的格子（空）算对
    const blanks = v.answer.cells.filter((c) => c === null).length;
    const headTail = (v.answer.head === 0 ? 1 : 0) + (v.answer.tail === 0 ? 1 : 0);
    expect(v.score).toBe(blanks + headTail);
    // 答案里有出队后留下的旧值
    expect(v.answer.cells.some((c, k) => c !== null && (k - v.answer.head + CHALLENGE_CAP) % CHALLENGE_CAP >= v.answer.size)).toBe(true);
    // 选项里是操作序列里入队过的值
    expect(v.values).toEqual(g.state.ops.flatMap((o) => (o.kind === 'offer' ? [o.x] : [])));
  });

  it('换一题：新的一串操作，清空选择，收起答案', () => {
    const g = g0();
    g.act({ type: 'cell', k: 0, v: '12' });
    g.act({ type: 'reveal' });
    const old = g.state.ops;
    g.act({ type: 'fresh' });
    expect(g.state).toMatchObject({ guess: ['', '', '', '', ''], head: 0, tail: 0, shown: false });
    expect(g.state.ops).not.toBe(old);
    expect(challengeRules.clickable(g.state as ChallengeState)).toBe(false);
  });
});
