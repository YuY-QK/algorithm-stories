import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import type { Control } from '../src/core/types';
import {
  BOOK_EMOJI, CHALLENGE_GOAL, CHALLENGE_LEN, EVICT_SEQ, KID_CAP, TRIP_BIG_CAP, TRIP_CAP, TRIP_SEQ, challengeReveal, challengeRules,
  evictAccess, evictRules, evictRuler, level, predictRules, simulate, traceRules, tripsRules, trips, CLASSIC, buildTrace, genOps,
  type EvictAction, type EvictGame, type TripsAction, type TripsGame,
} from '../src/engine/lru-cache';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const em = (b: number) => BOOK_EMOJI[b] + b + ' 号';
const acc = simulate(EVICT_SEQ, KID_CAP);

describe('玩法一「当管理员」', () => {
  /** 这一步该怎么点才对 */
  function right(g: EvictGame): EvictAction {
    const a = evictAccess(g);
    if (g.phase === 'evict') return { type: 'desk', book: g.desk[0] };
    return a.hit ? { type: 'desk', book: a.book } : { type: 'shelf', book: a.book };
  }
  function playThrough(mistakeAt: number[] = []) {
    const d = driver(evictRules);
    let k = 0;
    while (d.state.phase !== 'done') {
      if (d.state.phase === 'evict' && mistakeAt.includes(k++)) d.act({ type: 'desk', book: d.state.desk.at(-1)! });
      d.act(right(d.state));
    }
    return d;
  }

  it('开局：从第一本开始，台词让孩子去书架拿；桌子空着，画面能点，没有按钮', () => {
    const d = driver(evictRules);
    expect(d.say).toEqual(m('evict.ask.shelf', { book: em(EVICT_SEQ[0]) }));
    expect(d.state).toMatchObject({ i: 0, desk: [], phase: 'fetch', mistakes: 0, evicted: 0, glow: null, shake: null });
    expect(evictRules.clickable(d.state)).toBe(true);
    expect(evictRules.controls(d.state)).toEqual([]);
    expect(evictRules.result!(d.state)).toBeNull();
  });

  it('要的书在书架上：点它拿上桌，出「对」声，台词讲这一步再问下一本', () => {
    const d = driver(evictRules);
    d.act({ type: 'shelf', book: EVICT_SEQ[0] });
    expect(d.sounds).toEqual(['right']);
    expect(d.state.desk).toEqual(acc[0].desk);
    expect(d.say).toEqual(m('evict.join', {
      a: m('evict.say.shelf', { book: em(EVICT_SEQ[0]) }),
      b: m('evict.ask.shelf', { book: em(EVICT_SEQ[1]) }),
    }));
  });

  it('点错书不扣分：晃一下，出「错」声，台词提示一闪一闪的那本；点桌上的书或点别的书都一样', () => {
    const d = driver(evictRules);
    d.act({ type: 'shelf', book: 6 });
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state.mistakes).toBe(0);
    expect(d.state.shake).toEqual([6, 1]);
    expect(d.say).toEqual(m('evict.say.want', { book: em(EVICT_SEQ[0]) }));
    d.act({ type: 'desk', book: 1 });
    expect(d.state.shake).toEqual([1, 2]);
    expect(d.state.i).toBe(0);
  });

  it('要的书就在桌上：点桌上的它才对；点书架上的书（桌上有时书架不能点）不接受', () => {
    const d = driver(evictRules);
    while (!evictAccess(d.state).hit) d.act(right(d.state));
    expect(evictAccess(d.state).hit).toBe(true);
    const book = evictAccess(d.state).book;
    const i = d.state.i;
    d.act({ type: 'shelf', book });
    expect(d.state.i).toBe(i);
    d.act({ type: 'desk', book });
    expect(d.state.i).toBe(i + 1);
  });

  it('桌子满了要放回：点刚碰过的那本，错一次，最久没碰的透光，台词说它刚被翻过；点中间的台词不同', () => {
    const d = driver(evictRules);
    while (d.state.phase !== 'evict') d.act(right(d.state));
    const g = d.state;
    expect(d.say!.params!.b).toEqual(m('evict.ask.full', { book: em(evictAccess(g).book) }));
    d.act({ type: 'desk', book: g.desk.at(-1)! }); // 刚碰过的
    expect(d.state.mistakes).toBe(1);
    expect(d.state.glow).toBe(g.desk[0]);
    expect(d.say).toEqual(m('evict.say.touched'));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.shake).toEqual([g.desk.at(-1), 1]);
    d.act({ type: 'desk', book: g.desk[1] }); // 中间的
    expect(d.state.mistakes).toBe(2);
    expect(d.say).toEqual(m('evict.say.again'));
    // 点对：透光收起
    d.act({ type: 'desk', book: g.desk[0] });
    expect(d.state.glow).toBeNull();
    expect(d.state.evicted).toBe(1);
    expect(d.say!.key).toBe('evict.join');
    expect((d.say!.params!.a as { key: string }).key).toBe('evict.say.evict');
  });

  it('放回的位置不接受点书架；书架和桌子在 phase 对不上时点了没反应', () => {
    const d = driver(evictRules);
    while (d.state.phase !== 'evict') d.act(right(d.state));
    expect(d.act({ type: 'shelf', book: 6 })).toBe(false);
  });

  it('刻度：点错过，或放回对了两次以后才出现', () => {
    const d = driver(evictRules);
    expect(evictRuler(d.state)).toBe(false);
    let evicts = 0;
    while (d.state.phase !== 'done' && evicts < 2) {
      if (d.state.phase === 'evict') evicts++;
      d.act(right(d.state));
    }
    expect(d.state.evicted).toBe(2);
    expect(evictRuler(d.state)).toBe(true);
    const e = driver(evictRules);
    while (e.state.phase !== 'evict') e.act(right(e.state));
    e.act({ type: 'desk', book: e.state.desk.at(-1)! });
    expect(evictRuler(e.state)).toBe(true);
  });

  it('借完：最后一步出「赢」声，台词收尾；全程不错三颗星；结算给秘诀；再来一局回到开局', () => {
    const d = playThrough();
    expect(d.state.phase).toBe('done');
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.sounds.filter((s) => s === 'right')).toHaveLength(EVICT_SEQ.length - 1);
    expect((d.say!.params!.b as { key: string }).key).toBe('evict.done');
    expect(evictRules.clickable(d.state)).toBe(false);
    expect(evictRules.result!(d.state)).toEqual({ stars: 3, art: { scene: 'EvictDone', props: { retry: false } } });
    const bs = buttons(evictRules.controls(d.state));
    expect(bs.map((b) => b.look)).toEqual(['primary']);
    expect(d.act({ type: 'desk', book: 1 })).toBe(false);
    d.act(bs[0].action);
    expect(d.state).toMatchObject({ i: 0, desk: [], mistakes: 0, evicted: 0 });
    expect(d.say).toEqual(m('evict.ask.shelf', { book: em(EVICT_SEQ[0]) }));
  });

  it('星星：错 1、2 次两颗，3 次以上一颗；不到三颗时结算提醒再来一局', () => {
    const stars = (k: number[]) => evictRules.result!(playThrough(k).state)!;
    expect(stars([0]).stars).toBe(2);
    expect(stars([0, 1])).toMatchObject({ stars: 2, art: { props: { retry: true } } });
    expect(stars([0, 1, 2, 3]).stars).toBe(1);
  });

  it('没借完时「再来一局」不接受', () => {
    expect(driver(evictRules).act({ type: 'again' })).toBe(false);
  });
});

describe('玩法二「猜猜去几趟书架」', () => {
  const guess = (hit: boolean): TripsAction => ({ type: 'guess', g: hit ? 'hit' : 'miss' });
  const truth = (g: TripsGame) => simulate(TRIP_SEQ, g.cap)[g.i].hit;
  function playThrough(d = driver(tripsRules)) {
    while (d.state.i < TRIP_SEQ.length) d.act(guess(truth(d.state)));
    return d;
  }

  it('开局：小书桌，从第一本问起，画面能点，没有按钮（回答按钮在画面里）', () => {
    const d = driver(tripsRules);
    expect(d.state).toMatchObject({ cap: TRIP_CAP, i: 0, desk: [], count: 0, pulse: null, wrong: null, small: null });
    expect(d.say).toEqual(m('trips.say.start', { book: em(TRIP_SEQ[0]) }));
    expect(tripsRules.clickable(d.state)).toBe(true);
    expect(tripsRules.controls(d.state)).toEqual([]);
    expect(tripsRules.result!(d.state)).toBeNull();
  });

  it('猜对：出「对」声，没有的话趟数加一；台词讲这一本再问下一本', () => {
    const d = driver(tripsRules);
    d.act(guess(false)); // 第一本一定不在桌上
    expect(d.sounds).toEqual(['right']);
    expect(d.state.count).toBe(1);
    expect(d.state.i).toBe(1);
    expect(d.say).toEqual(m('trips.say.miss', { book: em(TRIP_SEQ[0]), next: em(TRIP_SEQ[1]) }));
    d.act(guess(false)); // 第二本也不在
    d.act(guess(false)); // 第三本也不在
    d.act(guess(true)); // 第四本 1 号在桌上
    expect(d.state.count).toBe(3);
    expect(d.say).toEqual(m('trips.say.hit', { book: em(TRIP_SEQ[3]), next: em(TRIP_SEQ[4]) }));
  });

  it('猜错不扣分：按钮晃（次数加一），出「错」声；书其实在桌上就一闪一闪，其实不在就提醒再数数桌上的书', () => {
    const d = driver(tripsRules);
    d.act(guess(true)); // 第一本其实不在
    expect(d.sounds).toEqual(['wrong']);
    expect(d.state.wrong).toEqual(['hit', 1]);
    expect(d.state.pulse).toBeNull();
    expect(d.state.i).toBe(0);
    expect(d.say).toEqual(m('trips.say.count', { book: em(TRIP_SEQ[0]) }));
    d.act(guess(true));
    expect(d.state.wrong).toEqual(['hit', 2]);
    for (let k = 0; k < 3; k++) d.act(guess(false));
    // 第四本其实在桌上：猜「去书架」是错的，这一本一闪一闪
    d.act(guess(false));
    expect(d.state.wrong).toEqual(['miss', 1]);
    expect(d.state.pulse).toBe(TRIP_SEQ[3]);
    expect(d.say).toEqual(m('trips.say.look'));
    d.act(guess(true));
    expect(d.state.pulse).toBeNull();
    expect(d.state.wrong).toBeNull();
  });

  it('借完：「赢」声，台词收尾；小书桌记下趟数；结算给出趟数；两个按钮，大书桌是主按钮之外的第一个', () => {
    const d = playThrough();
    const small = trips(TRIP_SEQ, TRIP_CAP);
    expect(d.sounds.at(-1)).toBe('win');
    expect(d.say).toEqual(m('trips.say.done'));
    expect(d.state.count).toBe(small);
    expect(d.state.small).toBe(small);
    expect(tripsRules.clickable(d.state)).toBe(false);
    expect(d.act(guess(true))).toBe(false);
    expect(tripsRules.result!(d.state)).toEqual({ art: { scene: 'TripsDone', props: { count: small, big: false, saved: 0, hasSmall: true } } });
    const bs = buttons(tripsRules.controls(d.state));
    expect(bs.map((b) => [b.label, b.look])).toEqual([[m('trips.big'), 'primary'], [m('trips.small'), undefined]]);
  });

  it('换大书桌再借一遍：趟数更少，结算说少跑了几趟；这时主按钮是「小书桌再玩一遍」，没有「大书桌」', () => {
    const d = playThrough();
    const small = d.state.small!;
    d.act({ type: 'start', cap: TRIP_BIG_CAP });
    expect(d.state).toMatchObject({ cap: TRIP_BIG_CAP, i: 0, desk: [], count: 0, small });
    expect(d.say).toEqual(m('trips.say.start', { book: em(TRIP_SEQ[0]) }));
    playThrough(d);
    const big = trips(TRIP_SEQ, TRIP_BIG_CAP);
    expect(d.state.count).toBe(big);
    expect(big).toBeLessThan(small);
    expect(d.state.small).toBe(small); // 大书桌不覆盖
    expect(tripsRules.result!(d.state)!.art!.props).toEqual({ count: big, big: true, saved: small - big, hasSmall: true });
    const bs = buttons(tripsRules.controls(d.state));
    expect(bs.map((b) => [b.label, b.look])).toEqual([[m('trips.small'), 'primary']]);
    d.act(bs[0].action);
    expect(d.state.cap).toBe(TRIP_CAP);
  });
});

describe('挑战：猜 LRU 命中几次', () => {
  it('开局：有一串合法的借书记录，输入框带范围，没有结算', () => {
    const d = driver(challengeRules, seeded(3));
    expect(d.state.c.seq).toHaveLength(CHALLENGE_LEN);
    expect(d.state).toMatchObject({ shown: false, wins: 0, msg: null, guess: 0 });
    const cs = challengeRules.controls(d.state);
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({ type: 'number', min: 0, max: CHALLENGE_LEN, invalid: { type: 'invalid' }, label: m('chal.guessLabel'), placeholder: m('chal.guessPlaceholder'), submitLabel: m('chal.reveal') });
    expect(challengeRules.result).toBeUndefined();
  });

  it('输入不对（不是整数或超出范围）：提醒范围，不揭晓', () => {
    const d = driver(challengeRules, seeded(3));
    d.act({ type: 'invalid' });
    expect(d.state.msg).toEqual(m('chal.range', { max: CHALLENGE_LEN }));
    expect(d.state.shown).toBe(false);
    d.act({ type: 'guess', n: -1 });
    expect(d.state.shown).toBe(false);
    d.act({ type: 'guess', n: CHALLENGE_LEN + 1 });
    expect(d.state.shown).toBe(false);
    expect(d.state.msg).not.toBeNull();
    // 输入对了，提醒收起
    d.act({ type: 'guess', n: 5 });
    expect(d.state.msg).toBeNull();
    expect(d.state.shown).toBe(true);
  });

  it('揭晓：猜中记一次，差几次照实说；输入框收起，只剩画面里的「下一题」；揭晓后不接受再猜', () => {
    const d = driver(challengeRules, seeded(4));
    const lru = challengeReveal({ ...d.state, shown: true, guess: 0 }).lru;
    d.act({ type: 'guess', n: lru });
    expect(d.state.shown).toBe(true);
    expect(d.state.wins).toBe(1);
    const r = challengeReveal(d.state);
    expect(r.diff).toBe(0);
    expect(r.lruRow.filter(Boolean)).toHaveLength(lru);
    expect(challengeRules.controls(d.state)).toEqual([]);
    expect(d.act({ type: 'guess', n: 3 })).toBe(false);
    expect(d.act({ type: 'invalid' })).toBe(false);
    // 下一题：新的记录，不清猜中的数
    d.act({ type: 'next' });
    expect(d.state).toMatchObject({ shown: false, wins: 1, msg: null });
    expect(d.act({ type: 'next' })).toBe(false);
    // 猜错不记
    const e = driver(challengeRules, seeded(4));
    e.act({ type: 'guess', n: lru + 2 });
    expect(e.state.wins).toBe(0);
    expect(challengeReveal(e.state).diff).toBe(2);
  });

  it('比较那句：LRU 多、FIFO 多、一样多三种', () => {
    const rand = seeded(21);
    const seen = new Set<string>();
    for (let k = 0; k < 200; k++) {
      const d = driver(challengeRules, rand);
      d.act({ type: 'guess', n: 0 });
      const r = challengeReveal(d.state);
      seen.add(r.compare.key);
      if (r.lru > r.fifo) expect(r.compare).toEqual(m('chal.cmp.more', { n: r.lru - r.fifo }));
      if (r.lru < r.fifo) expect(r.compare).toEqual(m('chal.cmp.less', { n: r.fifo - r.lru }));
    }
    expect(seen.size).toBe(3);
  });

  it('输入框清空的信号：每提交一次、换一题，round 加一；猜中 3 题过关（计数封顶由画面处理）', () => {
    const d = driver(challengeRules, seeded(5));
    const clearOn = () => (challengeRules.controls(d.state)[0] as { clearOn: number }).clearOn;
    const r0 = clearOn();
    for (let k = 0; k < CHALLENGE_GOAL; k++) {
      const lru = challengeReveal({ ...d.state, shown: true, guess: 0 }).lru;
      d.act({ type: 'guess', n: lru });
      d.act({ type: 'next' });
    }
    expect(d.state.wins).toBe(CHALLENGE_GOAL);
    expect(clearOn()).toBe(r0 + CHALLENGE_GOAL * 2);
  });
});

describe('猜下一步、逐步执行、绘本的规则', () => {
  it('猜下一步：一题一问，选项里只有一个正确答案；答对答错都讲解（同一句），画面亮出被操作的 key，答完直接换下一题', () => {
    expect(predictRules.goal).toBe(5);
    const rand = seeded(12);
    for (let k = 0; k < 300; k++) {
      const puzzle = predictRules.puzzle(rand);
      expect(puzzle.endless).toBe(true);
      expect(puzzle.chips).toEqual([['capacity', puzzle.asks[0].view.cap]]);
      const ask = puzzle.asks[0];
      expect(ask.kind).toBe('choose');
      expect(ask.options!.filter((o) => o.value === ask.answer)).toHaveLength(1);
      expect(ask.right).toEqual(ask.why);
      expect(ask.view.focus).toBeNull();
      expect(ask.reveal!.view).toMatchObject({ focus: ask.view.op.k, before: ask.view.before, op: ask.view.op });
      expect(ask.reveal!.prompt).toEqual(ask.prompt);
      let s = pr.startPredict(puzzle, 5);
      s = pr.answer(s, ask.options!.find((o) => o.value !== ask.answer)!.value)!.state;
      expect(pr.viewOf(s).wrong).toEqual(ask.why);
      expect(pr.viewOf(s).view.focus).toBe(ask.view.op.k);
      expect(pr.isOver(pr.proceed(s)!)).toBe(true);
      const t = pr.answer(pr.startPredict(puzzle, 5), ask.answer)!.state;
      expect(pr.viewOf(t).right).toEqual(ask.why);
      expect(pr.viewOf(t).view.focus).toBe(ask.view.op.k);
    }
  });

  it('逐步执行：默认是经典例子（容量 2）；换容量 3 随机一串，换回 2 是经典例子；换一串只换操作；经典例子回到容量 2', () => {
    const rand = seeded(2);
    const input = traceRules.start(rand);
    expect(input).toEqual({ cap: 2, ops: CLASSIC });
    const three = traceRules.act(input, { type: 'cap', n: 3 }, rand);
    expect(three.cap).toBe(3);
    expect(three.ops).toHaveLength(9);
    expect(traceRules.act(three, { type: 'cap', n: 2 }, rand)).toEqual({ cap: 2, ops: CLASSIC });
    expect(traceRules.act(three, { type: 'cap', n: 3 }, rand)).toBe(three);
    const again = traceRules.act(three, { type: 'random' }, rand);
    expect(again.cap).toBe(3);
    expect(again.ops).toHaveLength(9);
    expect(traceRules.act(three, { type: 'classic' }, rand)).toEqual({ cap: 2, ops: CLASSIC });
    const cs = traceRules.controls(input);
    expect(cs.map((c) => c.type)).toEqual(['segmented', 'group']);
  });

  it('逐步执行：每一步带着到那一步为止 get 的返回值', () => {
    const steps = buildTrace(2, CLASSIC);
    expect(steps[0].rets).toEqual({});
    expect(steps.at(-1)!.rets).toEqual({ 2: 1, 4: -1, 6: -1, 7: 3, 8: 4 });
    for (let k = 1; k < steps.length; k++) expect(Object.keys(steps[k].rets).length).toBeGreaterThanOrEqual(Object.keys(steps[k - 1].rets).length);
    const rnd = genOps(9, 4, seeded(1));
    expect(buildTrace(3, rnd).at(-1)!.rets).toBeDefined();
  });

  it('绘本：不换故事，再看一次还是同一遍', () => {
    const L = level.look!.story;
    expect(L.first).toBeNull();
    expect(L.next(L.first)).toBeNull();
    expect(L.frames(L.first).length).toBeGreaterThan(10);
  });
});
