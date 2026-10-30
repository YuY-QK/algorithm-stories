import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_N, CHALLENGE_OPTIONS, PICK_N, PICK_ROUNDS, TABLE_SIZES, animalOf, bugVerdict, buildTrace, challengeAnswer, challengeRounds, challengeRules,
  challengeTable, isBalanced, level, makePuzzle, makeValues, medianIdx, pickGlow, pickRules, sideOf, splitOf, standDone, standHeights, standRules,
  traceRules, worstCompares, type PickState, type StandState,
} from '../src/engine/quick-sort';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「站两边」', () => {
  const right = (s: StandState) => sideOf(standHeights(s)[s.qi], s.game.pivot);
  const wrong = (s: StandState) => (right(s) === 'left' ? 'right' : 'left');
  function playThrough(seed: number, wrongAt: number[] = []) {
    const d = driver(standRules, seeded(seed));
    let n = 0;
    while (!standDone(d.state)) {
      if (wrongAt.includes(n++)) d.act({ type: 'side', side: wrong(d.state) });
      d.act({ type: 'side', side: right(d.state) });
    }
    return d;
  }

  it('开局：8 个身高各不相同（一位标杆、七位排队），台词点名第一位，两边都能选', () => {
    const d = driver(standRules, seeded(1));
    const s = d.state;
    expect(s.game.queue).toHaveLength(7);
    expect(new Set([...s.game.queue, s.game.pivot]).size).toBe(8);
    expect(d.say).toEqual(m('stand.say.ask', { face: animalOf(0) }));
    expect(standRules.clickable(s)).toBe(true);
    expect(standRules.result!(s)).toBeNull();
    expect(standRules.controls(s)).toEqual([]);
  });

  it('站对：同学站到那一边，出「对」声，台词说他比 🚩 矮/高、站哪边，再点下一位的名', () => {
    const d = driver(standRules, seeded(2));
    const side = right(d.state);
    d.act({ type: 'side', side });
    expect(d.sounds).toEqual(['right']);
    expect(d.state.qi).toBe(1);
    expect(side === 'left' ? d.state.left : d.state.right).toEqual([0]);
    expect(d.say).toEqual(m(side === 'left' ? 'stand.say.placedLeft' : 'stand.say.placedRight', { face: animalOf(0), tail: m('stand.say.ask', { face: animalOf(1) }) }));
  });

  it('站错：不说「错了」，拉出一条和标杆一样高的线，当前同学和标杆晃一晃透光（wiggle 加一），台词让孩子比一比；站对后线收起来', () => {
    const d = driver(standRules, seeded(3));
    d.act({ type: 'side', side: wrong(d.state) });
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state).toMatchObject({ qi: 0, ruler: true, wiggle: 1, mistakes: 1 });
    expect(d.say).toEqual(m('stand.say.ruler', { face: animalOf(0) }));
    d.act({ type: 'side', side: wrong(d.state) });
    expect(d.state.wiggle).toBe(2);
    d.act({ type: 'side', side: right(d.state) });
    expect(d.state.ruler).toBe(false);
    expect(d.state.mistakes).toBe(2);
  });

  it('全对：七位都站好，最后一位出「赢」声，台词夸一句，三颗星，结算写左右各几位和标杆的位置', () => {
    const d = playThrough(4);
    const s = d.state;
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.sounds.filter((x) => x === 'right')).toHaveLength(6);
    expect(d.say!.params!.tail).toEqual(m('stand.say.allDone'));
    const r = standRules.result!(s)!;
    expect(r.stars).toBe(3);
    expect(r.body).toEqual(m('stand.body', { l: s.left.length, r: s.right.length, p: s.left.length + 1 }));
    expect(s.left.length + s.right.length).toBe(7);
    // 左边的都比标杆矮，右边的都比标杆高
    expect(s.left.every((id) => standHeights(s)[id] < s.game.pivot)).toBe(true);
    expect(s.right.every((id) => standHeights(s)[id] > s.game.pivot)).toBe(true);
    expect(r.art).toEqual({ scene: 'StandNote', props: { msg: m('stand.note') } });
    expect(standRules.clickable(s)).toBe(false);
  });

  it('星星：错 1～2 次两颗，再多一颗；结束后不接受再站，「再来一局」换一队新的', () => {
    expect(standRules.result!(playThrough(5, [0]).state)!.stars).toBe(2);
    expect(standRules.result!(playThrough(5, [0, 1]).state)!.stars).toBe(2);
    const d = playThrough(5, [0, 1, 2]);
    expect(standRules.result!(d.state)!.stars).toBe(1);
    expect(d.act({ type: 'side', side: 'left' })).toBe(false);
    expect(buttons(standRules.controls(d.state)).map((b) => b.look)).toEqual(['primary']);
    const old = d.state.game;
    d.act({ type: 'again' });
    expect(d.state.game).not.toEqual(old);
    expect(d.state).toMatchObject({ qi: 0, mistakes: 0, ruler: false });
  });

  it('玩到一半不接受「再来一局」', () => {
    const d = driver(standRules, seeded(6));
    expect(d.act({ type: 'again' })).toBe(false);
  });
});

describe('玩法二「挑个好标杆」', () => {
  /** 正中间那位的 id */
  const median = (s: PickState) => medianIdx(s.values);
  /** 一个不均匀的选择（最矮或最高的） */
  const lopsided = (s: PickState) => s.values.indexOf(1);

  it('开局：九位同学，台词让孩子点一位；第一回合，同学们能点', () => {
    const d = driver(pickRules, seeded(1));
    expect(d.state.values).toHaveLength(PICK_N);
    expect([...d.state.values].sort((a, b) => a - b)).toEqual(Array.from({ length: PICK_N }, (_, k) => k + 1));
    expect(d.say).toEqual(m('pick.say.round', { n: 1 }));
    expect(d.state).toMatchObject({ round: 1, phase: 'pick', split: null });
    expect(pickRules.clickable(d.state)).toBe(true);
    expect(pickRules.controls(d.state)).toEqual([]);
  });

  it('挑中间的：左矮右高排好，出「对」声，台词报左右各几人，出「下一回」', () => {
    const d = driver(pickRules, seeded(2));
    d.act({ type: 'pick', id: median(d.state) });
    const s = d.state;
    expect(s.phase).toBe('good');
    expect(s.split).toEqual({ rank: 5, left: 4, right: 4 });
    expect(d.sounds).toEqual(['right']);
    expect(d.say).toEqual(m('pick.say.good', { l: 4, r: 4 }));
    // 排队：矮的在左，标杆在中间，高的在右
    const row = s.order.map((id) => s.values[id]);
    expect(row.slice(0, 4).every((v) => v < 5) && row[4] === 5 && row.slice(5).every((v) => v > 5)).toBe(true);
    expect(s.kinds).toEqual(['low', 'low', 'low', 'low', 'pivot', 'high', 'high', 'high', 'high']);
    expect(pickRules.clickable(s)).toBe(false);
    expect(buttons(pickRules.controls(s)).map((b) => b.label)).toEqual([m('pick.next')]);
  });

  it('挑最矮的：一边一个人都没有，出「错」声，台词说白忙了；点「换一位」回来继续选；最高的同理', () => {
    const d = driver(pickRules, seeded(3));
    d.act({ type: 'pick', id: lopsided(d.state) });
    expect(d.state.phase).toBe('bad');
    expect(d.state.tries).toBe(1);
    expect(d.state.mistakes).toBe(1);
    expect(d.sounds).toEqual(['wrong']);
    expect(d.say).toEqual(m('pick.say.empty'));
    expect(buttons(pickRules.controls(d.state)).map((b) => b.label)).toEqual([m('pick.retry')]);
    d.act({ type: 'retry' });
    expect(d.state.phase).toBe('pick');
    expect(d.state.kinds.every((k) => k === 'plain')).toBe(true);
    expect(d.say).toEqual(m('pick.say.retry'));
  });

  it('挑得偏但不空：台词说一边挤了几人、另一边才几人', () => {
    const d = driver(pickRules, seeded(4));
    const id = d.state.values.indexOf(2);
    d.act({ type: 'pick', id });
    expect(d.say).toEqual(m('pick.say.heavy', { big: 7, small: 1 }));
    expect(isBalanced(splitOf(d.state.values, id))).toBe(false);
  });

  it('试两次还没找到：正中间那位透光，台词请孩子看看透光的；再换一位之前不透光', () => {
    const d = driver(pickRules, seeded(5));
    expect(pickGlow(d.state)).toBeNull();
    d.act({ type: 'pick', id: lopsided(d.state) });
    d.act({ type: 'retry' });
    expect(pickGlow(d.state)).toBeNull();
    expect(d.say).toEqual(m('pick.say.retry'));
    d.act({ type: 'pick', id: d.state.values.indexOf(9) });
    expect(pickGlow(d.state)).toBeNull(); // 正在看结果，不透光
    d.act({ type: 'retry' });
    expect(d.state.tries).toBe(2);
    expect(pickGlow(d.state)).toBe(median(d.state));
    expect(d.say).toEqual(m('pick.say.retryGlow'));
  });

  it('三回合都选中间的：第一、二回合出「下一回」换新的一排，第三回合出「看结果」，出「赢」声，三颗星和结论', () => {
    const d = driver(pickRules, seeded(6));
    const seen = [d.state.values];
    for (let r = 1; r <= PICK_ROUNDS; r++) {
      expect(d.state.round).toBe(r);
      d.act({ type: 'pick', id: median(d.state) });
      expect(buttons(pickRules.controls(d.state)).map((b) => b.label)).toEqual([m(r === PICK_ROUNDS ? 'pick.finish' : 'pick.next')]);
      d.act({ type: 'next' });
      if (r < PICK_ROUNDS) {
        expect(d.say).toEqual(m('pick.say.round', { n: r + 1 }));
        seen.push(d.state.values);
      }
    }
    expect(d.state.phase).toBe('end');
    expect(d.say).toEqual(m('pick.say.end'));
    expect(d.sounds.at(-1)).toBe('win');
    expect(new Set(seen.map((v) => v.join())).size).toBe(PICK_ROUNDS);
    const r = pickRules.result!(d.state)!;
    expect(r.stars).toBe(3);
    expect(r.art!.scene).toBe('PickLesson');
    expect(buttons(pickRules.controls(d.state)).map((b) => b.label)).toEqual([m('pick.again')]);
  });

  it('星星：整局共错几次决定；「再来一局」回到第一回合，次数清零', () => {
    const d = driver(pickRules, seeded(7));
    for (let r = 1; r <= PICK_ROUNDS; r++) {
      d.act({ type: 'pick', id: lopsided(d.state) });
      d.act({ type: 'retry' });
      d.act({ type: 'pick', id: median(d.state) });
      d.act({ type: 'next' });
    }
    expect(d.state.mistakes).toBe(3);
    expect(pickRules.result!(d.state)!.stars).toBe(1);
    d.act({ type: 'again' });
    expect(d.state).toMatchObject({ round: 1, mistakes: 0, phase: 'pick' });
    expect(d.say).toEqual(m('pick.say.round', { n: 1 }));
  });

  it('不在对的阶段，操作都不接受', () => {
    const d = driver(pickRules, seeded(8));
    expect(d.act({ type: 'retry' })).toBe(false);
    expect(d.act({ type: 'next' })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
    d.act({ type: 'pick', id: median(d.state) });
    expect(d.act({ type: 'pick', id: 0 })).toBe(false);
  });
});

describe('挑战：预测比较次数，再看对比表', () => {
  const answerOf = (s: { qs: Parameters<typeof challengeAnswer>[0][]; qi: number }) => challengeAnswer(s.qs[s.qi]);

  it('开局：三道题，答案都是 n(n − 1)/2，选项里有它；对比表的大小是 100', () => {
    const d = driver(challengeRules, seeded(1));
    expect(d.state.qs).toHaveLength(3);
    for (const q of d.state.qs) expect(challengeAnswer(q)).toBe(worstCompares(CHALLENGE_N));
    expect(CHALLENGE_OPTIONS).toContain(worstCompares(CHALLENGE_N));
    expect(d.state).toMatchObject({ qi: 0, picked: null, right: 0, finished: false, size: 100 });
    expect(challengeRules.clickable(d.state)).toBe(true);
  });

  it('选一个答案：记下选的，答对加一题，选了以后不能改；没选不能点「下一题」', () => {
    const d = driver(challengeRules, seeded(2));
    expect(d.act({ type: 'next' })).toBe(false);
    d.act({ type: 'pick', n: 20 });
    expect(d.state).toMatchObject({ picked: 20, right: 0 });
    expect(d.act({ type: 'pick', n: 45 })).toBe(false);
    expect(challengeRules.clickable(d.state)).toBe(false);
    d.act({ type: 'next' });
    expect(d.state).toMatchObject({ qi: 1, picked: null });
    d.act({ type: 'pick', n: answerOf(d.state) });
    expect(d.state.right).toBe(1);
  });

  it('讲解：第一次分区比 n − 1 次，每层少一个，加起来就是答案', () => {
    const d = driver(challengeRules, seeded(3));
    for (const q of d.state.qs) {
      const rs = challengeRounds(q);
      expect(rs[0]).toEqual({ size: CHALLENGE_N, cmp: CHALLENGE_N - 1 });
      expect(rs.reduce((a, r) => a + r.cmp, 0)).toBe(challengeAnswer(q));
    }
  });

  it('三题答完：进入对比表，可以换数组大小（10、100、1000），不在表里的大小不接受；再答一遍换新题', () => {
    const d = driver(challengeRules, seeded(4));
    for (let k = 0; k < 3; k++) {
      d.act({ type: 'pick', n: answerOf(d.state) });
      expect(d.act({ type: 'size', n: 10 })).toBe(false); // 还没到对比表
      d.act({ type: 'next' });
    }
    expect(d.state).toMatchObject({ finished: true, right: 3 });
    expect(d.act({ type: 'pick', n: 9 })).toBe(false);
    expect(d.act({ type: 'size', n: 7 })).toBe(false);
    for (const n of TABLE_SIZES) {
      expect(d.act({ type: 'size', n })).toBe(true);
      expect(d.state.size).toBe(n);
    }
    const old = d.state.qs;
    d.act({ type: 'again' });
    expect(d.state).toMatchObject({ qi: 0, picked: null, right: 0, finished: false, size: 100 });
    expect(d.state.qs).not.toEqual(old);
  });

  it('对比表：固定拿最后一个遇到有序或倒序是 n(n − 1)/2，随机和三数取中少得多；同样的大小结果一样', () => {
    for (const n of TABLE_SIZES) {
      const t = challengeTable(n);
      expect(t[0][0]).toBe(worstCompares(n));
      expect(t[1][0]).toBe(worstCompares(n));
      if (n >= 100) {
        expect(t[0][1]).toBeLessThan(t[0][0] / 2);
        expect(t[0][2]).toBeLessThan(t[0][0] / 2);
      }
      expect(challengeTable(n)).toEqual(t);
    }
  });

  it('没有定时器：所有操作都不带自动步骤', () => {
    const d = driver(challengeRules, seeded(5));
    d.act({ type: 'pick', n: 9 });
    d.act({ type: 'next' });
    expect(d.afters).toEqual([]);
  });
});

describe('猜下一步', () => {
  const rules = level.predict!.main;

  it('每题带「连对 6 次过关」，答错后按钮写「知道了，下一题」；答完最后一问直接换下一题，不停在结局页', () => {
    expect(rules.goal).toBe(6);
    expect(rules.continueLabel).toEqual(m('predict.cont'));
    const puzzle = rules.puzzle(seeded(1));
    expect(puzzle.endless).toBe(true);
  });

  it('「换不换」要换时先问换不换（前半问），答对不计连对也不出声，再问换到哪一格；不换时一问就算数', () => {
    const rand = seeded(2);
    let sawYes = false;
    let sawNo = false;
    for (let k = 0; k < 40; k++) {
      const puzzle = makePuzzle([5, 2, 8, 1, 9, 3, 7], rand);
      puzzle.asks.forEach((a, i) => {
        if (a.kind === 'choose' && a.options!.length === 2 && a.options![0].label.key === 'predict.yes') {
          const will = a.answer === true;
          expect(!!a.half).toBe(will);
          if (will) {
            sawYes = true;
            expect(puzzle.asks[i + 1].kind).toBe('pick');
          } else sawNo = true;
        }
      });
    }
    expect(sawYes && sawNo).toBe(true);
  });

  /** 找一道有「要换」题的题目，返回前半问的下标 */
  function puzzleWithYes() {
    for (let seed = 1; seed < 100; seed++) {
      const puzzle = makePuzzle([5, 2, 8, 1, 9, 3, 7], seeded(seed));
      const at = puzzle.asks.findIndex((a) => a.half);
      if (at >= 0) return { puzzle, at };
    }
    throw new Error('没有找到');
  }

  it('前半问答对：连对不变、没有声音，接着问换到哪一格；答对后一起算 1 次', () => {
    const { puzzle, at } = puzzleWithYes();
    let s = { ...pr.startPredict(puzzle, 6), i: at, streak: 2 };
    const out = pr.answer(s, true)!;
    expect(out.sound).toBeUndefined();
    expect(out.state).toMatchObject({ streak: 2, i: at + 1, phase: 'ask' });
    s = out.state;
    const done = pr.answer(s, puzzle.asks[at + 1].answer)!;
    expect(done.state.streak).toBe(3);
    expect(done.sound).toBe('right');
  });

  it('前半问答错：连对清零，看完解释后跳过「换到哪一格」，直接问下一题', () => {
    const { puzzle, at } = puzzleWithYes();
    const s = { ...pr.startPredict(puzzle, 6), i: at, streak: 3 };
    const out = pr.answer(s, false)!;
    expect(out.sound).toBe('wrong');
    expect(out.state.streak).toBe(0);
    const next = pr.proceed(out.state)!;
    expect(next.i).toBe(at + 2);
    expect(next.phase).toBe('ask');
  });

  it('点错换到哪一格：正确的那格会标出来（reveal 里的 hit），答错后只往下一问走一格', () => {
    const { puzzle, at } = puzzleWithYes();
    const target = puzzle.asks[at + 1];
    expect(target.reveal!.view.hit).toBe(target.answer);
    expect(target.view.hit).toBeNull();
    const s = { ...pr.startPredict(puzzle, 6), i: at + 1 };
    const wrongPick = (target.answer as number) === 0 ? 1 : 0;
    const out = pr.answer(s, wrongPick)!;
    expect(pr.viewOf(out.state)).toMatchObject({ picked: wrongPick, view: target.reveal!.view });
    expect(pr.proceed(out.state)!.i).toBe(at + 2);
  });

  it('每一问的顶上都有 lo, hi 的标签；「标杆落在哪」「递归哪两个区间」各有一问', () => {
    const rand = seeded(3);
    for (let k = 0; k < 30; k++) {
      const puzzle = makePuzzle([4, 9, 2, 7, 1, 8, 3], rand);
      for (const a of puzzle.asks) expect(a.chips![0][0]).toBe('lo, hi');
      expect(puzzle.asks.some((a) => a.kind === 'pick' && !a.half && a.prompt.key === 'predict.land')).toBe(true);
      expect(puzzle.asks.some((a) => a.prompt.key === 'predict.ranges')).toBe(true);
    }
  });
});

describe('逐步执行和找 bug 的规则', () => {
  it('开局 8 个随机数；改大小或初始顺序就换一个新数组；控件是两个分段加一个按钮', () => {
    const rand = seeded(1);
    const input = traceRules.start(rand);
    expect(input).toMatchObject({ size: 8, kind: 'random' });
    const big = traceRules.act(input, { type: 'size', n: 10 }, rand);
    expect(big.values).toHaveLength(10);
    const sorted = traceRules.act(big, { type: 'kind', kind: 'sorted' }, rand);
    expect(sorted.values).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
    const dup = makeValues(8, 'dup', rand);
    expect(new Set(dup).size).toBeLessThanOrEqual(3);
    expect(traceRules.act(sorted, { type: 'fresh' }, rand).values).toEqual(sorted.values);
    expect(traceRules.controls(sorted).map((c) => c.type)).toEqual(['segmented', 'segmented', 'button']);
  });

  it('「下一次分区」停在 return i + 1 那一行；变量标签里栈深是数字；总结按初始顺序补一句', () => {
    const stop = traceRules.jump!.stop;
    const steps = buildTrace([3, 1, 2]);
    expect(steps.filter((x) => stop(x, steps[0])).every((x) => x.line === 18 || x.done)).toBe(true);
    const input = { values: [3, 6, 9], size: 6, kind: 'sorted' as const };
    const last = traceRules.trace(input).at(-1)!;
    expect(traceRules.vars(input, last).map((v) => v[0])).toEqual(['lo', 'hi', 'i', 'j', 'pivot', m('trace.v.compares'), m('trace.v.swaps'), m('trace.v.depth')]);
    expect(traceRules.summary!(input, traceRules.trace(input)[0])).toBeNull();
    expect(traceRules.summary!(input, last)!.params!.tail).toEqual(m('trace.summary.sorted', { depth: last.maxDepth }));
    expect(traceRules.summary!({ ...input, kind: 'dup' }, last)!.params!.tail).toEqual(m('trace.summary.dup'));
    expect(traceRules.summary!({ ...input, kind: 'random' }, last)!.params!.tail).toBe('');
    expect(traceRules.foot).toEqual(m('trace.foot'));
  });

  it('找 bug 有「跳到结果」：往后跳到最后一步', () => {
    const br = level.bugs!.main;
    expect(br.jump!.label).toEqual(m('bug.jump'));
    const steps = br.run(br.bugs[1]);
    expect(steps.filter((x) => br.jump!.stop(x))).toHaveLength(1);
    expect(br.jump!.stop(steps.at(-1)!)).toBe(true);
    expect(bugVerdict(steps[0])).toBeNull();
  });
});
