import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { PAUSE_BEAT, PAUSE_HOLD, PAUSE_ROUND, PAUSE_SHORT } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_N, KID_N, STORY_KIDS, challengeRules, guessRules, inversions, isSorted, level, makePuzzle, need, randomKids, rounds, shootRules, stars,
  traceRules, buildTrace, genArray, ROUND_END_LINE, type ChallengeAction, type ChallengeState, type GuessAction, type GuessGame, type Kid,
  type ShootAction, type ShootGame,
} from '../src/engine/bubble-sort';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const byH = (k: Kid) => k.h;

describe('玩法一「当摄影师」', () => {
  /** 按正确答案走一对 */
  function rightAnswer(g: ShootGame): Extract<ShootAction, { type: 'answer' }> {
    const { line, j } = g.s;
    return { type: 'answer', c: need(line[j].h, line[j + 1].h) };
  }
  /** 一直答对，走完整局，返回驱动器 */
  function playThrough(mistakeAt: number[] = []) {
    const d = driver(shootRules);
    let guard = 0;
    let count = 0;
    while (shootRules.result!(d.state) === null && guard++ < 200) {
      const g = d.state;
      if (g.s.phase === 'pair') {
        if (mistakeAt.includes(count++)) d.act({ type: 'answer', c: rightAnswer(g).c === 'swap' ? 'keep' : 'swap' });
        d.act(rightAnswer(d.state));
        d.settle();
      } else if (g.s.phase === 'quiet') d.act({ type: 'quiet', c: 'photo' });
    }
    return d;
  }

  it('开局：用故事里的队伍，台词让孩子看这两个；两个大按钮 换/不换，有图标有文字有读屏名', () => {
    const d = driver(shootRules);
    expect(d.say).toEqual(m('shoot.say.start'));
    expect(d.state.s.line).toEqual(STORY_KIDS);
    expect(shootRules.clickable(d.state)).toBe(false);
    const bs = buttons(shootRules.controls(d.state));
    expect(bs.map((b) => b.look)).toEqual(['pad', 'pad']);
    expect(bs.map((b) => b.caption)).toEqual([m('shoot.cap.swap'), m('shoot.cap.keep')]);
    expect(bs.every((b) => b.aria && !b.disabled)).toBe(true);
  });

  it('判断对：队伍照做，出「对」声，台词讲这一对；换了的话「这一轮」的计数加一', () => {
    const d = driver(shootRules);
    d.act({ type: 'answer', c: 'keep' }); // 小兔 120 比小熊 145 矮，不换
    expect(d.say).toEqual(m('shoot.say.kept', { l: '🐰', r: '🐻' }));
    expect(d.sounds).toEqual(['right']);
    expect(d.state.s.roundSwaps).toBe(0);
    d.act({ type: 'answer', c: 'swap' }); // 小熊 145 比小猫 118 高，换
    expect(d.say).toEqual(m('shoot.say.swapped', { l: '🐻', r: '🐱' }));
    expect(d.state.s.roundSwaps).toBe(1);
    expect(d.state.mistakes).toBe(0);
  });

  it('判断错：状态不变，算一次错，出「错」声；高的那个透光，左边的摇一摇，台词让孩子再比一比', () => {
    const d = driver(shootRules);
    d.act({ type: 'answer', c: 'swap' }); // 小兔矮，不该换
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state.s.j).toBe(0);
    expect(d.state.mistakes).toBe(1);
    expect(d.state.glow).toEqual(['bear', 1]);
    expect(d.state.shake).toEqual(['rabbit', 1]);
    expect(d.say).toEqual(m('shoot.say.short'));
    d.act({ type: 'answer', c: 'swap' });
    expect(d.state.glow).toEqual(['bear', 2]);
    expect(d.state.shake).toEqual(['rabbit', 2]);
    // 答对了，透光就收起来
    d.act({ type: 'answer', c: 'keep' });
    expect(d.state.glow).toBeNull();
    expect(d.state.mistakes).toBe(2);
  });

  it('左边高却选了不换：透光的是左边的，台词问「高的站在左边对吗」', () => {
    const d = driver(shootRules);
    d.act({ type: 'answer', c: 'keep' });
    d.act({ type: 'answer', c: 'keep' }); // 小熊比小猫高，该换
    expect(d.state.glow).toEqual(['bear', 1]);
    expect(d.say).toEqual(m('shoot.say.tall'));
  });

  it('一轮结束：小伙伴冒到右边，按钮灰着等一会儿（PAUSE_ROUND），再自动开始下一轮', () => {
    const d = driver(shootRules);
    for (let k = 0; k < 4; k++) d.act(rightAnswer(d.state));
    expect(d.state.busy).toBe(true);
    expect(d.state.s.phase).toBe('next');
    expect(d.say).toEqual(m('shoot.say.topFirst', { face: '🐻' }));
    expect(d.after).toBe(PAUSE_ROUND);
    expect(buttons(shootRules.controls(d.state)).map((b) => b.disabled)).toEqual([true, true]);
    expect(d.act({ type: 'answer', c: 'keep' })).toBe(false);
    d.tick();
    expect(d.state).toMatchObject({ busy: false });
    expect(d.state.s).toMatchObject({ phase: 'pair', j: 0, round: 1, roundSwaps: 0 });
    expect(d.say).toEqual(m('shoot.say.next'));
    expect(d.after).toBeUndefined();
  });

  it('一轮结束时切标签：等待直接过去，回到能操作', () => {
    const d = driver(shootRules);
    for (let k = 0; k < 4; k++) d.act(rightAnswer(d.state));
    d.interrupt();
    expect(d.state.busy).toBe(false);
    expect(d.state.s.phase).toBe('pair');
    expect(d.act(rightAnswer(d.state))).toBe(true);
  });

  it('一轮谁也没换：问「拍照还是再看」，选再看算错，台词和计数闪光提示；选拍照结束', () => {
    const d = driver(shootRules);
    let guard = 0;
    while (d.state.s.phase !== 'quiet' && guard++ < 50) {
      d.act(rightAnswer(d.state));
      d.settle();
    }
    expect(d.state.s.round).toBe(2);
    expect(d.say).toEqual(m('shoot.say.quiet'));
    const pads = buttons(shootRules.controls(d.state));
    expect(pads.map((b) => b.caption)).toEqual([m('shoot.cap.photo'), m('shoot.cap.more')]);
    d.act({ type: 'quiet', c: 'again' });
    expect(d.state).toMatchObject({ mistakes: 1, hint: 1 });
    expect(d.say).toEqual(m('shoot.say.noOne'));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.s.phase).toBe('quiet');
    d.act({ type: 'quiet', c: 'again' });
    expect(d.state.hint).toBe(2);
    d.act({ type: 'quiet', c: 'photo' });
    expect(d.state.s.phase).toBe('done');
    expect(d.state.hint).toBe(0);
    expect(d.say).toEqual(m('shoot.say.done'));
    expect(d.sounds.at(-1)).toBe('win');
  });

  it('不在拍照的时候不接受拍照/再看，不在判断时不接受换/不换', () => {
    const d = driver(shootRules);
    expect(d.act({ type: 'quiet', c: 'photo' })).toBe(false);
    expect(d.act({ type: 'again' })).toBe(false);
  });

  it('全对：三颗星，结算写比了几次换了几次；再来一局换一队新的', () => {
    const d = playThrough();
    const res = shootRules.result!(d.state)!;
    expect(res.stars).toBe(3);
    const rs = rounds(STORY_KIDS, byH);
    expect(res.body).toEqual(m('shoot.tally', { c: rs.reduce((a, r) => a + r.compares.length, 0), w: rs.reduce((a, r) => a + r.swaps, 0) }));
    expect(shootRules.controls(d.state)).toEqual([{ type: 'button', action: { type: 'again' }, label: m('shoot.again'), look: 'primary' }]);
    d.act({ type: 'again' }, );
    expect(d.state.s.phase).toBe('pair');
    expect(d.state.mistakes).toBe(0);
    expect(d.say).toEqual(m('shoot.say.again'));
  });

  it('星星：错 1～2 次两颗，再多一颗', () => {
    expect(shootRules.result!(playThrough([2]).state)!.stars).toBe(2);
    expect(shootRules.result!(playThrough([0, 3]).state)!.stars).toBe(2);
    expect(shootRules.result!(playThrough([0, 1, 2]).state)!.stars).toBe(1);
    expect([0, 1, 2, 3].map(stars)).toEqual([3, 2, 2, 1]);
  });
});

describe('玩法二「谁会冒到最右边」', () => {
  const rand = () => seeded(7);
  const top = (g: GuessGame) => rounds(g.kids, byH)[g.r].top;
  const pickTop = (g: GuessGame): Extract<GuessAction, { type: 'pick' }> => ({ type: 'pick', k: g.line.findIndex((k) => k.id === top(g).id) });
  const pickOther = (g: GuessGame): Extract<GuessAction, { type: 'pick' }> => ({ type: 'pick', k: g.line.findIndex((k, i) => k.id !== top(g).id && i < g.fixedFrom) });

  it('开局：队伍随机且没排好，台词让孩子猜；队伍可以点', () => {
    const d = driver(guessRules, rand());
    expect(d.say).toEqual(m('guess.say.first'));
    expect(d.state.kids).toHaveLength(KID_N);
    expect(d.state.line).toEqual(d.state.kids);
    expect(guessRules.clickable(d.state)).toBe(true);
    expect(guessRules.controls(d.state)).toEqual([]);
  });

  it('点错：摇一摇，出「错」声，台词提醒摄影师总把高的往右换；同一轮第二次点错，答案透光', () => {
    const d = driver(guessRules, rand());
    const wrong = pickOther(d.state);
    d.act(wrong);
    expect(d.state).toMatchObject({ mistakes: 1, roundMiss: 1, phase: 'ask', glow: null });
    expect(d.state.shake).toEqual([d.state.line[wrong.k].id, 1]);
    expect(d.sounds).toEqual(['wrong']);
    expect(d.say).toEqual(m('guess.say.wrong'));
    d.act(wrong);
    expect(d.state.roundMiss).toBe(2);
    expect(d.state.glow).toEqual([top(d.state).id, 1]);
    d.act(wrong);
    expect(d.state.glow).toEqual([top(d.state).id, 2]);
    expect(d.state.mistakes).toBe(3);
  });

  it('点对：摄影师才走这一轮，一对一对比（PAUSE_BEAT 之后每 PAUSE_SHORT 一步），走完那个冒到右边', () => {
    const d = driver(guessRules, rand());
    const g0 = d.state;
    const rd = rounds(g0.kids, byH)[0];
    d.act(pickTop(g0));
    expect(d.state).toMatchObject({ phase: 'run', glow: null, c: 0 });
    expect(d.sounds).toEqual(['right', 'tick']);
    expect(d.say).toEqual(m('guess.say.run', { face: rd.top.face }));
    expect(d.after).toBe(PAUSE_BEAT);
    expect(guessRules.clickable(d.state)).toBe(false);
    expect(d.act(pickTop(g0))).toBe(false);
    for (let c = 0; c < rd.compares.length; c++) {
      d.tick();
      expect(d.state.pair).toBe(rd.compares[c].j);
      expect(d.state.line).toEqual(rd.compares[c].after);
      expect(d.after).toBe(PAUSE_SHORT);
    }
    d.tick();
    expect(d.state.pair).toBeNull();
    if (rd.quiet || rd.end <= 1) {
      expect(d.state.phase).toBe('done');
    } else {
      expect(d.state).toMatchObject({ phase: 'hold', fixedFrom: rd.end });
      expect(d.say).toEqual(m('guess.say.good', { face: rd.top.face }));
      expect(d.after).toBe(PAUSE_HOLD);
      d.tick();
      expect(d.state).toMatchObject({ phase: 'ask', r: 1, roundMiss: 0 });
      expect(d.say).toEqual(m('guess.say.next'));
    }
  });

  it('点已经站好的：摇一摇、台词让孩子看没站好的，不算错', () => {
    const d = driver(guessRules, rand());
    d.act(pickTop(d.state));
    d.settle();
    expect(d.state.phase).toBe('ask');
    const fixed = d.state.fixedFrom;
    d.act({ type: 'pick', k: fixed });
    expect(d.say).toEqual(m('guess.say.fixed'));
    expect(d.state.mistakes).toBe(0);
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.shake?.[0]).toBe(d.state.line[fixed].id);
  });

  it('一路猜对到排好：三颗星、拍照、「再来一局」换一队新的', () => {
    const d = driver(guessRules, rand());
    let guard = 0;
    while (d.state.phase !== 'done' && guard++ < 20) {
      d.act(pickTop(d.state));
      d.settle();
    }
    expect(d.state.phase).toBe('done');
    expect(d.state.line.map(byH)).toEqual(d.state.kids.map(byH).sort((a, b) => a - b));
    expect(d.sounds.at(-1)).toBe('win');
    expect(guessRules.result!(d.state)).toEqual({ stars: 3, body: m('guess.win') });
    expect(guessRules.controls(d.state)).toHaveLength(1);
    const before = d.state.kids;
    d.act({ type: 'again' } as GuessAction);
    expect(d.state).toMatchObject({ phase: 'ask', r: 0, mistakes: 0 });
    expect(d.state.kids).not.toBe(before);
    expect(d.say).toEqual(m('guess.say.first'));
  });

  it('错的次数决定星星', () => {
    const d = driver(guessRules, rand());
    d.act(pickOther(d.state));
    let guard = 0;
    while (d.state.phase !== 'done' && guard++ < 20) {
      d.act(pickTop(d.state));
      d.settle();
    }
    expect(guessRules.result!(d.state)!.stars).toBe(2);
  });

  it('切标签时走到一半的局作废，换新队伍重新猜；等孩子点的时候切标签什么都不变', () => {
    const d = driver(guessRules, rand());
    const idle = d.state;
    d.interrupt();
    expect(d.state).toBe(idle);
    d.act(pickTop(d.state));
    d.tick();
    d.interrupt();
    expect(d.state).toMatchObject({ phase: 'ask', r: 0, c: 0, pair: null, mistakes: 0 });
    expect(d.say).toEqual(m('guess.say.first'));
    d.act(pickTop(d.state));
    d.settle();
    // 走完一轮停在「稍停」或已排好；不在稍停的话没东西可作废
    if (d.state.phase === 'ask') expect(d.state.r).toBe(1);
  });
});

describe('挑战：相邻交换，最少几次', () => {
  const swap = (k: number): ChallengeAction => ({ type: 'swap', k });
  /** 用冒泡的办法排好，返回交换次数 */
  function solve(d: ReturnType<typeof driver<ChallengeState, ChallengeAction>>) {
    let n = 0;
    for (let guard = 0; guard < 100 && !isSorted(d.state.a); guard++) {
      const k = d.state.a.findIndex((v, i) => i < d.state.a.length - 1 && v > d.state.a[i + 1]);
      d.act(swap(k));
      n++;
    }
    return n;
  }

  it('开局：6 个数没排好，逆序对 5 到 10 个，撤销灰着，可以换一题', () => {
    const d = driver(challengeRules, seeded(4));
    expect(d.state.a).toHaveLength(CHALLENGE_N);
    expect(d.state.a).toEqual(d.state.start);
    expect(isSorted(d.state.a)).toBe(false);
    expect(inversions(d.state.a)).toBeGreaterThanOrEqual(5);
    expect(challengeRules.clickable(d.state)).toBe(true);
    const bs = buttons(challengeRules.controls(d.state));
    expect(bs.map((b) => [b.label, b.disabled ?? false])).toEqual([[m('chal.undo'), true], [m('chal.fresh'), false]]);
  });

  it('换一下：次数加一；换顺了不说话，换反了提醒多了一个「前大后小」', () => {
    const d = driver(challengeRules, seeded(4));
    const a0 = d.state.a;
    const k = a0.findIndex((v, i) => i < a0.length - 1 && v > a0[i + 1]);
    d.act(swap(k));
    expect(d.state.moves).toBe(1);
    expect(d.state.note).toBeNull();
    expect(inversions(d.state.a)).toBe(inversions(a0) - 1);
    d.act(swap(k)); // 换回去：这下换反了
    expect(d.state.note).toEqual(m('chal.backwards', { x: a0[k], y: a0[k + 1] }));
    expect(d.state.moves).toBe(2);
    expect(inversions(d.state.a)).toBe(inversions(a0));
  });

  it('撤销：回到上一步，但也算一次；没得撤时不接受', () => {
    const d = driver(challengeRules, seeded(4));
    expect(d.act({ type: 'undo' })).toBe(false);
    const a0 = d.state.a;
    d.act(swap(0));
    d.act({ type: 'undo' });
    expect(d.state.a).toEqual(a0);
    expect(d.state.moves).toBe(2);
    expect(d.state.note).toEqual(m('chal.undone'));
    expect(buttons(challengeRules.controls(d.state))[0].disabled).toBe(true);
  });

  it('排好：用的次数等于逆序对就是最少，结算夸一句并说出冒泡换了几次；多换了就告诉最少几次', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = driver(challengeRules, seeded(seed));
      const best = inversions(d.state.start);
      expect(solve(d)).toBe(best);
      const res = challengeRules.result!(d.state)!;
      expect(res.title).toEqual(m('chal.best', { moves: best }));
      expect(res.body).toEqual(m('chal.body', { bubble: buildTrace(d.state.start).at(-1)!.swaps, best }));
      expect(res.art).toEqual({ scene: 'Note', props: { msg: m('chal.note') } });
    }
    const d = driver(challengeRules, seeded(3));
    const best = inversions(d.state.start);
    d.act(swap(0));
    d.act({ type: 'undo' });
    solve(d);
    expect(challengeRules.result!(d.state)!.title).toEqual(m('chal.more', { moves: d.state.moves, best }));
  });

  it('排好以后不再接受交换和撤销，只剩「再来一题」；再来一题换新的序列', () => {
    const d = driver(challengeRules, seeded(4));
    solve(d);
    expect(challengeRules.clickable(d.state)).toBe(false);
    expect(d.act(swap(0))).toBe(false);
    expect(d.act({ type: 'undo' })).toBe(false);
    const bs = buttons(challengeRules.controls(d.state));
    expect(bs.map((b) => b.label)).toEqual([m('chal.again')]);
    const done = d.state.start;
    d.act({ type: 'fresh' });
    expect(d.state.moves).toBe(0);
    expect(d.state.start).not.toEqual(done);
    expect(challengeRules.result!(d.state)).toBeNull();
  });
});

describe('逐步执行的规则', () => {
  it('开局 8 个随机数；改大小或初始顺序就换一个新数组；控件是两个分段加一个按钮', () => {
    const rand = seeded(2);
    const input = traceRules.start(rand);
    expect(input).toMatchObject({ size: 8, shape: 'random' });
    expect(input.arr).toHaveLength(8);
    const big = traceRules.act(input, { type: 'size', n: 12 }, rand);
    expect(big).toMatchObject({ size: 12, shape: 'random' });
    expect(big.arr).toHaveLength(12);
    const rev = traceRules.act(big, { type: 'shape', shape: 'reversed' }, rand);
    expect(rev.arr).toEqual([...rev.arr].sort((a, b) => b - a));
    expect(rev.size).toBe(12);
    expect(traceRules.act(rev, { type: 'fresh' }, rand).arr).not.toEqual(rev.arr);
    const cs = traceRules.controls(rev);
    expect(cs.map((c) => c.type)).toEqual(['segmented', 'segmented', 'button']);
    expect((cs[0] as Extract<Control<unknown>, { type: 'segmented' }>).options.map((o) => o.value)).toEqual([6, 8, 12]);
  });

  it('「跳到本轮结束」停在 if (!swapped) break 那一行，没有了就停在最后', () => {
    const steps = buildTrace(genArray(8, 'random', seeded(5)));
    const stop = traceRules.jump!.stop;
    const first = steps.findIndex((s) => stop(s, steps[0]));
    expect(steps[first].line === ROUND_END_LINE || steps[first].done).toBe(true);
    expect(steps.slice(0, first).every((s) => s.line !== ROUND_END_LINE)).toBe(true);
  });

  it('变量标签和总结', () => {
    const input = { size: 6, shape: 'random' as const, arr: [3, 1, 2, 5, 4, 6] };
    const steps = buildTrace(input.arr);
    const last = steps.at(-1)!;
    expect(traceRules.vars(input, steps[0]).map((v) => v[0])).toEqual(['i', 'j', 't', 'swapped', m('trace.v.compares'), m('trace.v.swaps')]);
    expect(traceRules.summary!(input, steps[0])).toBeNull();
    expect(traceRules.summary!(input, last)).toEqual(m('trace.summary', { compares: last.compares, worst: 15, swaps: last.swaps }));
  });
});

describe('猜下一步：把一道题排成一问接一问', () => {
  const arr = [5, 3, 6, 1, 4, 2];

  it('每一轮两问（点谁站最右、换几次），换几次答完播放这一轮；播放的第一帧是开始前，之后每次比较一帧', () => {
    const puzzle = makePuzzle(arr);
    const rs = rounds(arr, (v) => v);
    expect(puzzle.asks).toHaveLength(rs.length * 2);
    rs.forEach((r, k) => {
      const [top, count] = puzzle.asks.slice(k * 2, k * 2 + 2);
      expect(top.kind).toBe('pick');
      expect(top.answer).toBe(r.before.indexOf(r.top));
      expect(top.view).toMatchObject({ a: r.before, j: null, end: r.end, goal: true });
      expect(top.reveal!.view.goal).toBe(false);
      expect(count.kind).toBe('choose');
      expect(count.answer).toBe(r.swaps);
      expect(count.options!.map((o) => o.value)).toEqual(Array.from({ length: r.end + 1 }, (_, c) => c));
      expect(count.anim!.frames).toHaveLength(r.compares.length + 1);
      expect(count.anim!.frames[0].a).toEqual(r.before);
      expect(count.anim!.frames.at(-1)!.a).toEqual(r.after);
      expect(count.anim!.frames.every((f) => !f.goal)).toBe(true);
    });
    expect(puzzle.end.view).toMatchObject({ a: [...arr].sort((x, y) => x - y), sortedFrom: 0, goal: false });
  });

  it('答对：先播动画（开头停一下，再每步一帧），播完才问下一轮；站好的部分跟着前一轮', () => {
    const puzzle = makePuzzle(arr);
    const rs = rounds(arr, (v) => v);
    let s = pr.startPredict(puzzle, 6);
    s = pr.answer(s, puzzle.asks[0].answer)!.state;
    expect(s).toMatchObject({ phase: 'ask', i: 1, streak: 1 });
    s = pr.answer(s, puzzle.asks[1].answer)!.state;
    expect(s).toMatchObject({ phase: 'anim', i: 1, frame: 0, streak: 2 });
    expect(pr.animDelay(s)).toBe(pr.animDelay({ ...s, frame: 0 }));
    expect(pr.viewOf(s)).toMatchObject({ prompt: m('predict.running', { n: 1 }), pickable: false, options: null });
    const delays: (number | null)[] = [];
    let guard = 0;
    while (s.phase === 'anim' && guard++ < 50) {
      delays.push(pr.animDelay(s));
      s = pr.tickAnim(s)!;
    }
    expect(delays).toHaveLength(rs[0].compares.length + 1);
    expect(delays[0]).not.toBe(delays[1]);
    expect(new Set(delays.slice(1)).size).toBe(1);
    expect(s).toMatchObject({ phase: 'ask', i: 2 });
    expect(pr.viewOf(s).view).toMatchObject({ a: rs[1].before, sortedFrom: rs[0].end });
  });

  it('答错：讲解后继续，同样播动画；答错换几次时，被越过的数标红', () => {
    const puzzle = makePuzzle(arr);
    let s = pr.startPredict(puzzle, 6);
    s = pr.answer(s, 99)!.state; // 点错
    expect(s).toMatchObject({ phase: 'wrong', streak: 0, picked: 99 });
    expect(pr.viewOf(s).wrong).toEqual(puzzle.asks[0].why);
    expect(pr.viewOf(s).view.goal).toBe(false);
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1 });
    s = pr.answer(s, 99)!.state;
    expect(s.phase).toBe('wrong');
    expect(pr.viewOf(s).view.over.length).toBe(puzzle.asks[1].answer);
    s = pr.proceed(s)!;
    expect(s.phase).toBe('anim');
  });

  it('最后一轮播完看结局：排好了，连对和过关保留到下一题', () => {
    const puzzle = makePuzzle(arr);
    let s = pr.startPredict(puzzle, 6);
    let guard = 0;
    while (s.phase !== 'end' && guard++ < 200) {
      s = s.phase === 'anim' ? pr.tickAnim(s)! : pr.answer(s, puzzle.asks[s.i].answer)!.state;
    }
    expect(s.streak).toBe(puzzle.asks.length);
    expect(s.passed).toBe(true);
    const v = pr.viewOf(s);
    expect(v.ended).toBe(true);
    expect(v.view.sortedFrom).toBe(0);
    const next = pr.nextPuzzle(s, makePuzzle(arr));
    expect(next).toMatchObject({ phase: 'ask', i: 0, streak: s.streak, passed: true });
  });

  it('规则里的 goal 是 6，每次出的题是 6 个互不相同的数', () => {
    const rules = level.predict!.main;
    expect(rules.goal).toBe(6);
    const p = rules.puzzle(seeded(1));
    expect(new Set(p.asks[0].view.a).size).toBe(6);
  });

  it('randomKids 之外：Kid 的头像互不相同', () => {
    const kids = randomKids(KID_N, seeded(9));
    expect(new Set(kids.map((k) => k.face)).size).toBe(KID_N);
  });
});
