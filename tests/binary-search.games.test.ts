import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import { PAUSE_LONG, PAUSE_MID, PAUSE_SHORT } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  CHALLENGE_LIMIT, CHALLENGE_MAX, KID_N, challengeRules, findRules, hideRules, middle, pointTo, postmanTrace, stars,
  type ChallengeAction, type ChallengeState, type FindState, type HideState, type PlayAction,
} from '../src/engine/binary-search';
import { driver } from './helpers/game';

/** 让 pickSecret 选出 secret（1 到 KID_N）的随机源 */
const secretRand = (secret: number) => () => (secret - 0.5) / KID_N;
const pick = (i: number): PlayAction => ({ type: 'pick', i });
type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「藏信」', () => {
  /** 藏好信，走完小邮差走过来的动画，停在等孩子指路 */
  function hidden(secret: number) {
    const g = driver(hideRules);
    g.act(pick(secret));
    g.settle();
    return g;
  }

  it('开局：只有信箱能点，没有按钮，台词让孩子藏信', () => {
    const g = driver(hideRules);
    expect(g.say).toEqual(m('hide.say.start'));
    expect(hideRules.clickable(g.state)).toBe(true);
    expect(hideRules.controls(g.state)).toEqual([]);
    expect(g.act({ type: 'answer', dir: 'left' })).toBe(false);
  });

  it('藏好：信露出来、出「嗒」声、稍后盖上叶子，小邮差走到正中间再问；全程按停顿常量走', () => {
    const g = driver(hideRules);
    g.act(pick(5));
    expect(g.state).toMatchObject({ phase: 'hiding', letter: 5, covered: null });
    expect(g.say).toEqual(m('hide.say.hidden'));
    expect(g.after).toBe(PAUSE_LONG);
    expect(hideRules.clickable(g.state)).toBe(false);
    g.tick();
    expect(g.state).toMatchObject({ phase: 'walking', at: 8, letter: null, covered: 5 });
    expect(g.say).toEqual(m('hide.say.come'));
    expect(g.after).toBe(PAUSE_SHORT);
    g.tick();
    expect(g.state).toMatchObject({ phase: 'guide', tries: 1 });
    expect(g.say).toEqual(m('hide.say.ask'));
    expect(g.after).toBeUndefined();
    expect(g.sounds).toEqual(['tap', 'tick']);
  });

  it('走路和藏信时指路按钮灰着、不接受回答；轮到孩子才能按', () => {
    const g = driver(hideRules);
    g.act(pick(5));
    g.tick();
    const pads = buttons(hideRules.controls(g.state));
    expect(pads.map((b) => b.disabled)).toEqual([true, true, true]);
    expect(g.act({ type: 'answer', dir: 'left' })).toBe(false);
    g.tick();
    const now = buttons(hideRules.controls(g.state));
    expect(now.map((b) => b.disabled)).toEqual([false, false, false]);
    expect(now.every((b) => b.look === 'pad' && b.aria)).toBe(true);
  });

  it('指错方向：藏信的信箱透光，台词让孩子看叶子，局面不变；再错一次透光的次数加一；指对后清掉', () => {
    const g = hidden(5); // 小邮差在 8，信在左边
    const before = g.state as HideState;
    expect(pointTo(5, before.at)).toBe('left');
    g.act({ type: 'answer', dir: 'right' });
    let s = g.state as HideState;
    expect(s.glow).toEqual([5, 1]);
    expect(g.say).toEqual(m('hide.say.glow'));
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(s).toMatchObject({ phase: 'guide', tries: 1, at: before.at, lo: 1, hi: KID_N });
    g.act({ type: 'answer', dir: 'hit' });
    expect((g.state as HideState).glow).toEqual([5, 2]);
    g.act({ type: 'answer', dir: 'left' });
    s = g.state as HideState;
    expect(s.glow).toBeNull();
    expect(g.sounds.at(-1)).toBe('right');
  });

  it('指对：排除一半、门上留箭头，稍后小邮差走到剩下的正中间再问', () => {
    const g = hidden(5);
    g.act({ type: 'answer', dir: 'left' });
    expect(g.state).toMatchObject({ phase: 'leaving', hi: 7, lo: 1, covered: 5 });
    expect((g.state as HideState).doors[8]).toBe('left');
    expect(g.say).toEqual(m('hide.say.skip', { side: m('side.right') }));
    expect(g.after).toBe(PAUSE_MID);
    g.tick();
    expect(g.state).toMatchObject({ phase: 'walking', at: 4 });
    expect(g.say).toEqual(m('hide.say.near'));
    g.tick();
    expect(g.state).toMatchObject({ phase: 'guide', tries: 2 });
  });

  it('每个位置都能玩到底：次数和小邮差的正中间路线一致，结束后可以再藏一次', () => {
    for (let secret = 1; secret <= KID_N; secret++) {
      const g = hidden(secret);
      for (;;) {
        const s = g.state as HideState;
        g.act({ type: 'answer', dir: pointTo(secret, s.at) });
        if ((g.state as HideState).phase === 'done') break;
        g.settle();
      }
      const s = g.state as HideState;
      expect(s.tries).toBe(postmanTrace(KID_N, secret).length);
      expect(s).toMatchObject({ letter: secret, covered: null });
      expect(g.say).toEqual(m('hide.say.found', { n: s.tries }));
      expect(g.sounds.slice(-2)).toEqual(['right', 'win']);
      expect(hideRules.controls(s)).toMatchObject([{ look: 'primary', label: m('hide.again') }]);
      g.act({ type: 'again' });
      expect(g.state).toMatchObject({ phase: 'hide', secret: null, tries: 0, doors: {}, lo: 1, hi: KID_N, at: 0 });
      expect(g.say).toEqual(m('hide.say.start'));
    }
  });

  it('切标签：藏信和走路中途的局作废回到开头，等孩子指路时保持原样', () => {
    for (const steps of [0, 1]) {
      const g = driver(hideRules);
      g.act(pick(5));
      for (let k = 0; k < steps; k++) g.tick();
      g.interrupt();
      expect(g.state).toMatchObject({ phase: 'hide', secret: null, letter: null, covered: null, at: 0 });
      expect(g.say).toEqual(m('hide.say.start'));
    }
    const g = hidden(5);
    const before = g.state;
    g.interrupt();
    expect(g.state).toEqual(before);
  });
});

describe('玩法二「当小邮差」', () => {
  const start = (secret = 11) => driver(findRules, secretRand(secret));
  type G = ReturnType<typeof start>;
  const s = (g: G) => g.state as FindState;

  it('开局：信箱都能点，没有按钮', () => {
    const g = start();
    expect(g.say).toEqual(m('find.say.start'));
    expect(s(g)).toMatchObject({ secret: 11, tries: 0, done: false });
    expect(findRules.clickable(g.state)).toBe(true);
    expect(findRules.controls(g.state)).toEqual([]);
    expect(findRules.result!(g.state)).toBeNull();
  });

  it('点灰信箱：摇头、出错误音、说里面没有信，不算次数；再点一次摇头的次数加一', () => {
    const g = start(11);
    g.act(pick(3)); // 3 号 → 信在右边，1 到 3 变灰
    expect(s(g).lo).toBe(4);
    g.act(pick(2));
    expect(s(g).shake).toEqual([2, 1]);
    expect(g.say).toEqual(m('find.say.grey'));
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(s(g).tries).toBe(1);
    g.act(pick(2));
    expect(s(g).shake).toEqual([2, 2]);
    g.act(pick(20)); // 范围右边外也算灰
    expect(s(g).shake).toEqual([20, 3]);
    expect(s(g).tries).toBe(1);
  });

  it('第一次排除时追问「灰色的还要看吗」，之后只说方向', () => {
    const g = start(11);
    g.act(pick(3));
    expect(g.say).toEqual(m('find.say.first', { dir: m('dir.right') }));
    expect(g.sounds.at(-1)).toBe('right');
    g.act(pick(13));
    expect(g.say).toEqual(m('find.say.dir', { dir: m('dir.left') }));
    expect(s(g)).toMatchObject({ lo: 4, hi: 12, tries: 2, at: 13 });
    expect(s(g).doors).toEqual({ 3: 'right', 13: 'left' });
  });

  /** 一直点范围正中间，直到找到 */
  const solveByMiddle = (g: G) => {
    while (!s(g).done) g.act(pick(middle(s(g).lo, s(g).hi)));
  };
  /** 故意从范围最左边一个个点，次数多、星星少 */
  const solveSlowly = (g: G) => {
    while (!s(g).done) g.act(pick(s(g).lo));
  };

  it('找到：出 win 声，信露出来，次数换成星星；正中间路线最多 4 次拿三颗星', () => {
    for (let secret = 1; secret <= KID_N; secret++) {
      const g = start(secret);
      solveByMiddle(g);
      expect(s(g)).toMatchObject({ done: true, letter: secret });
      expect(s(g).tries).toBeLessThanOrEqual(4);
      expect(g.say).toEqual(m('find.say.found', { n: s(g).tries }));
      expect(g.sounds.at(-1)).toBe('win');
      expect(findRules.result!(g.state)!.stars).toBe(3);
      expect(findRules.clickable(g.state)).toBe(false);
      expect(g.act(pick(1))).toBe(false);
    }
  });

  it('三颗星后问「点哪里最快」，只问一次；答「最边上」提示再试；问过不再问', () => {
    const g = start(11);
    solveByMiddle(g);
    const r = findRules.result!(g.state)!;
    expect(r.quiz!.prompt).toEqual(m('find.quiz.ask'));
    const opts = buttons(r.quiz!.options);
    expect(opts.map((o) => o.label)).toEqual([m('find.quiz.edge'), m('find.quiz.middle'), m('find.quiz.other')]);
    expect(opts.map((o) => o.art!.props!.hot)).toEqual([0, 2, 4]); // 小图里亮的是第几个
    expect(opts.map((o) => o.action)).toEqual([{ type: 'quiz', where: 'edge' }, { type: 'quiz', where: 'middle' }, { type: 'quiz', where: 'edge' }]);
    g.act(opts[0].action);
    expect(s(g).quiz).toBe('wrong');
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(findRules.result!(g.state)!.quiz).toEqual({ prompt: m('find.quiz.wrong'), options: [] });
    expect(g.act(opts[1].action)).toBe(false); // 已经答过
    // 再来一局又拿三颗星：不再追问，保持上次的回答
    g.act({ type: 'again' });
    solveByMiddle(g);
    expect(s(g).asked).toBe(true);
    expect(s(g).quiz).toBe('wrong');
  });

  it('答「正中间」：出正确音，说出秘诀', () => {
    const g = start(11);
    solveByMiddle(g);
    g.act({ type: 'quiz', where: 'middle' });
    expect(g.sounds.at(-1)).toBe('right');
    expect(findRules.result!(g.state)!.quiz).toEqual({ prompt: m('find.quiz.right'), options: [] });
  });

  it('不到三颗星不追问；连续两局不到三颗星才出「秘诀」按钮；开了以后正中间一闪一闪，可以关掉', () => {
    const g = start(15);
    solveSlowly(g);
    expect(stars(s(g).tries)).toBeLessThan(3);
    expect(findRules.result!(g.state)!.quiz).toBeUndefined();
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.again')]);
    expect(g.act({ type: 'hint', on: true })).toBe(false); // 一局还不够，不接受
    g.act({ type: 'again' });
    solveSlowly(g);
    expect(s(g).lowRounds).toBe(2);
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.again'), m('find.hintOn')]);

    g.act({ type: 'hint', on: true });
    expect(s(g)).toMatchObject({ hint: true, lowRounds: 0, done: false, tries: 0 });
    expect(s(g).pulse).toBe(8);
    expect(g.say).toEqual(m('find.say.hint'));
    // 点了一个信箱，范围变了，一闪一闪跟着移到新的正中间
    g.act(pick(8));
    expect(s(g).pulse).toBe(middle(s(g).lo, s(g).hi));
    solveByMiddle(g);
    expect(s(g).pulse).toBeNull();
    expect(buttons(findRules.controls(g.state)).map((b) => b.label)).toEqual([m('find.again'), m('find.hintOff')]);
    g.act({ type: 'hint', on: false });
    expect(s(g)).toMatchObject({ hint: false, pulse: null, done: false });
    expect(g.say).toEqual(m('find.say.again'));
  });

  it('三颗星会把「连续不到三颗星」清零', () => {
    const g = start(15);
    solveSlowly(g);
    g.act({ type: 'again' });
    solveByMiddle(g);
    expect(s(g).lowRounds).toBe(0);
  });

  it('再来一局：换新的信，次数和箭头清零；孩子的跨局状态保留；没结束时不接受', () => {
    const g = start(11);
    g.act(pick(1));
    g.act(pick(2));
    expect(s(g).greyTold).toBe(true);
    expect(g.act({ type: 'again' })).toBe(false);
    solveByMiddle(g);
    g.act({ type: 'again' });
    expect(s(g)).toMatchObject({ done: false, tries: 0, doors: {}, lo: 1, hi: KID_N, at: 0, greyTold: true, letter: null });
    expect(g.say).toEqual(m('find.say.again'));
  });

  it('次数显示：hud 给出点了几次', () => {
    const g = start(11);
    g.act(pick(1));
    g.act(pick(3));
    expect(findRules.hud!(g.state)).toEqual({ tries: 2 });
  });
});

describe('挑战', () => {
  const game = (secret = 500) => driver(challengeRules, () => (secret - 0.5) / CHALLENGE_MAX);
  type G = ReturnType<typeof game>;
  const st = (g: G) => g.state as ChallengeState;
  const guess = (n: number): ChallengeAction => ({ type: 'guess', n });

  it('输入越界或不是数：提示范围，不算次数，局面不变', () => {
    const g = game();
    for (const n of [NaN, 0, -3, CHALLENGE_MAX + 1]) {
      g.act(guess(n));
      expect(st(g).oops).toEqual(m('chal.oops.range', { max: CHALLENGE_MAX }));
      expect(st(g).log).toHaveLength(0);
    }
    expect(st(g)).toMatchObject({ lo: 1, hi: CHALLENGE_MAX, status: 'play' });
  });

  it('猜已经排除的数：提示答案的范围，这次不算', () => {
    const g = game(500);
    g.act(guess(100)); // 小了，答案在 101 到 1000
    g.act(guess(50));
    expect(st(g).oops).toEqual(m('chal.oops.out', { g: 50, lo: 101, hi: CHALLENGE_MAX }));
    expect(st(g).log).toHaveLength(1);
    g.act(guess(900)); // 大了
    g.act(guess(950));
    expect(st(g).oops).toEqual(m('chal.oops.out', { g: 950, lo: 101, hi: 899 }));
    expect(st(g).log).toHaveLength(2);
    // 下一次有效的猜测清掉提示
    g.act(guess(300));
    expect(st(g).oops).toBeNull();
  });

  it('每次猜测记下方向和当时的正中间；剩余次数和范围同步', () => {
    const g = game(500);
    g.act(guess(250));
    g.act(guess(700));
    expect(st(g).log.map((e) => [e.g, e.dir, e.mid])).toEqual([[250, 'up', 500], [700, 'down', 625]]);
    expect(st(g).log[1].hint).toEqual(m('chal.log.mid', { mid: 625 }));
    expect(challengeRules.hud!(g.state).chips).toEqual([
      [m('chal.range'), m('chal.rangeVal', { lo: 251, hi: 699 })],
      [m('chal.left'), m('chal.leftVal', { n: CHALLENGE_LIMIT - 2 })],
    ]);
  });

  it('猜中：成功，显示次数和答案；猜在正中间的那条没有「当时的正中间」提示', () => {
    const g = game(500);
    g.act(guess(500));
    expect(st(g)).toMatchObject({ status: 'win' });
    expect(st(g).log[0].hint).toBeNull();
    expect(challengeRules.result!(g.state)).toEqual({
      title: m('chal.win', { n: 1, secret: 500 }),
      body: m('chal.winBody', { max: CHALLENGE_MAX, limit: CHALLENGE_LIMIT }),
    });
    expect(g.act(guess(1))).toBe(false);
  });

  it('次数用完还没猜中：失败，告诉答案；之后不再接受猜测', () => {
    const g = game(500);
    for (let k = 1; k <= CHALLENGE_LIMIT; k++) g.act(guess(k)); // 一直猜最小的
    expect(st(g).status).toBe('lose');
    expect(st(g).log).toHaveLength(CHALLENGE_LIMIT);
    expect(challengeRules.result!(g.state)!.title).toEqual(m('chal.lose', { limit: CHALLENGE_LIMIT, secret: 500 }));
    expect(g.act(guess(499))).toBe(false);
  });

  it('第 10 次才猜中算成功，不会因为刚好用完次数就判输', () => {
    const g = game(1000);
    for (let k = 1; k < CHALLENGE_LIMIT; k++) g.act(guess(k));
    g.act(guess(1000));
    expect(st(g).status).toBe('win');
  });

  it('输入框：接受猜测后清空（clearOn 变化），输入不合规时不清；越界时界面提交 invalid', () => {
    const g = game(500);
    const input = () => challengeRules.controls(g.state)[0] as Extract<Control<ChallengeAction>, { type: 'number' }>;
    expect(input()).toMatchObject({ type: 'number', min: 1, max: CHALLENGE_MAX, clearOn: 0, submitLabel: m('chal.guess'), label: m('chal.guessLabel') });
    g.act(input().submit(5000));
    expect(input().clearOn).toBe(0);
    g.act(input().submit(10));
    expect(input().clearOn).toBe(1);
    expect(input().invalid).toEqual(guess(NaN));
  });

  it('结束后按钮是「再来一局」，换一个新的数重新开始；没结束时不接受', () => {
    const g = game(500);
    expect(g.act({ type: 'again' })).toBe(false);
    g.act(guess(500));
    expect(challengeRules.controls(g.state)).toMatchObject([{ type: 'button', look: 'small', label: m('chal.again') }]);
    g.act({ type: 'again' });
    expect(st(g)).toMatchObject({ status: 'play', log: [], lo: 1, hi: CHALLENGE_MAX, oops: null });
  });

  it('1 到 1000 的数，每次猜正中间都能在 10 次内猜中', () => {
    for (let secret = 1; secret <= CHALLENGE_MAX; secret += 7) {
      const g = game(secret);
      while (st(g).status === 'play') g.act(guess(middle(st(g).lo, st(g).hi)));
      expect(st(g).status).toBe('win');
    }
  });
});
