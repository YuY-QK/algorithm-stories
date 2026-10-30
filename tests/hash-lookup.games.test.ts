import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { FILL_STEP, FLASH_MS, PAUSE_BEAT, PAUSE_START } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BIG_FROM, CHALLENGE_CAPS, CHALLENGE_LIMIT, CLASH_BOOKS, CLASH_FETCH, KID_CAP, PLAY_BOOKS, askRound, bucketOf, challengeRules,
  chainStats, clashRules, level, restText, rounds, walkRules,
  type ChallengeAction, type ChallengeState, type ClashAction, type ClashState, type WalkAction, type WalkState,
} from '../src/engine/hash-lookup';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const labels = <A>(cs: Control<A>[]) => buttons(cs).map((b) => b.label);

describe('玩法一「直接走到书架」', () => {
  const start = () => driver(walkRules, seeded(1));
  type G = ReturnType<typeof start>;
  const s = (g: G) => g.state as WalkState;
  const tap = (i: number): WalkAction => ({ type: 'tap', i });
  const right = (g: G) => bucketOf(PLAY_BOOKS[s(g).r]);
  const wrongShelf = (g: G) => (right(g) + 1) % KID_CAP;
  /** 放对当前这本并点「下一本」 */
  const place = (g: G) => {
    g.act(tap(right(g)));
    g.act({ type: 'next' });
  };

  it('开局：第一本书，只有「数给我看」按钮，台词让孩子点书架', () => {
    const g = start();
    expect(s(g)).toMatchObject({ r: 0, placed: false, walking: false, finished: false, count: 0 });
    expect(s(g).say).toEqual(m('walk.say.ask', { book: PLAY_BOOKS[0] }));
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.count')]);
    expect(walkRules.clickable(g.state)).toBe(true);
  });

  it('放对：出对的声音，只有这一架有书，管理员站过去，出现「下一本」', () => {
    const g = start();
    g.act(tap(right(g)));
    expect(g.sounds.at(-1)).toBe('right');
    expect(s(g).piles[right(g)]).toEqual([PLAY_BOOKS[0]]);
    expect(s(g).keeper).toBe(right(g));
    expect(s(g).say).toEqual(m('walk.say.placed', { book: PLAY_BOOKS[0], i: right(g) }));
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.next')]);
    expect(walkRules.clickable(g.state)).toBe(false);
    expect(g.act(tap(0))).toBe(false);
  });

  it('点错一次：晃一下、错误音、提示点「数给我看」；后半段提示点「余数」', () => {
    const g = start();
    g.act(tap(wrongShelf(g)));
    expect(s(g).shake).toEqual([wrongShelf(g), 1]);
    expect(s(g).wrong).toBe(1);
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(s(g).say).toEqual(m('walk.say.againCount'));
    for (let k = 0; k < BIG_FROM; k++) place(g);
    g.act(tap(wrongShelf(g)));
    expect(s(g).say).toEqual(m('walk.say.againRest'));
  });

  it('点错两次：管理员自己从 0 号架一格格数，每格一拍；数完停在答案那一架并透光，稍后熄灭', () => {
    const g = start();
    g.act(tap(wrongShelf(g)));
    g.act(tap((wrongShelf(g) + 1) % KID_CAP));
    expect(s(g)).toMatchObject({ walking: true, keeper: 0, count: 0 });
    expect(s(g).say).toEqual(m('walk.say.count', { book: 4, last: KID_CAP - 1 }));
    expect(g.after).toBe(FILL_STEP);
    expect(walkRules.clickable(g.state)).toBe(false);
    expect(g.act(tap(0))).toBe(false);
    for (let k = 1; k < 4; k++) {
      g.tick();
      expect(s(g)).toMatchObject({ count: k, walking: true });
      expect(g.after).toBe(FILL_STEP);
    }
    g.tick();
    expect(s(g)).toMatchObject({ count: 4, walking: false, keeper: 4, glow: 4 });
    expect(s(g).say).toEqual(m('walk.say.arrive', { book: 4, i: 4 }));
    expect(g.after).toBe(FLASH_MS);
    g.tick();
    expect(s(g).glow).toBeNull();
    expect(g.after).toBeUndefined();
  });

  it('「数给我看」按钮：数的时候灰着；数一圈后落在余数架（大数绕圈）', () => {
    const g = start();
    for (let k = 0; k < BIG_FROM; k++) place(g);
    expect(PLAY_BOOKS[3]).toBe(23);
    g.act({ type: 'count' });
    expect(s(g).hops).toHaveLength(23);
    g.settle();
    expect(s(g).keeper).toBe(23 % KID_CAP);
    expect(s(g).count).toBe(23);
  });

  it('后半段换成「余数」按钮：透光提示转了几圈、还剩几格；点错过才多出「数给我看」', () => {
    const g = start();
    for (let k = 0; k < BIG_FROM; k++) place(g);
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.rest')]);
    g.act({ type: 'rest' });
    expect(s(g)).toMatchObject({ glow: 23 % KID_CAP, keeper: null });
    expect(s(g).say).toEqual(m('walk.say.rest', { text: restText(23) }));
    expect(restText(23)).toEqual(m('rest.laps', { key: 23, laps: 3, r: 2 }));
    expect(restText(4)).toEqual(m('rest.zero', { key: 4, r: 4 }));
    expect(g.after).toBe(FLASH_MS);
    g.tick();
    expect(s(g).glow).toBeNull();
    g.act(tap(wrongShelf(g)));
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.rest'), m('walk.btn.count')]);
  });

  it('六本放完：win 声，最后一本按钮写「完成」，结算后可以再放六本（换一组随机的书）', () => {
    const g = start();
    for (let k = 0; k < 5; k++) place(g);
    g.act(tap(right(g)));
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.done')]);
    g.act({ type: 'next' });
    expect(s(g).finished).toBe(true);
    expect(g.sounds.at(-1)).toBe('win');
    expect(walkRules.result!(g.state)).toEqual({ title: m('walk.done.title'), body: m('walk.done.body', { cap: KID_CAP }) });
    expect(labels(walkRules.controls(g.state))).toEqual([m('walk.btn.again')]);
    expect(g.act(tap(0))).toBe(false);
    g.act({ type: 'again' });
    expect(s(g)).toMatchObject({ finished: false, r: 0, placed: false });
    expect(s(g).books).toHaveLength(6);
    expect(s(g).books[5] % KID_CAP).toBe(0);
  });

  it('切标签：数数停下、透光熄灭，孩子可以继续点', () => {
    const g = start();
    g.act({ type: 'count' });
    g.tick();
    g.interrupt();
    expect(s(g)).toMatchObject({ walking: false, glow: null });
    expect(g.after).toBeUndefined();
    expect(walkRules.clickable(g.state)).toBe(true);
  });
});

describe('玩法二「撞了怎么办」', () => {
  const start = () => driver(clashRules);
  type G = ReturnType<typeof start>;
  const s = (g: G) => g.state as ClashState;
  /** 放书、点「下一本」，放前两本不撞 */
  const putNext = (g: G) => {
    g.act({ type: 'put' });
    g.act({ type: 'next' });
  };
  /** 放到第三本，停在要选办法 */
  const toChoose = (g: G) => {
    putNext(g);
    putNext(g);
    g.act({ type: 'put' });
  };
  /** 选好办法，放完五本，停在借书 */
  const toFetch = (g: G, mode: 'chain' | 'probe') => {
    toChoose(g);
    g.act({ type: 'choose', mode });
    g.act({ type: 'next' });
    putNext(g);
    g.act({ type: 'put' });
    g.act({ type: 'next' });
  };
  /** 点对书架，让借书动画走完 */
  const fetch = (g: G) => {
    g.act({ type: 'shelf', i: bucketOf(CLASH_FETCH[s(g).f]) });
    g.settle();
  };

  it('开局：等放书，台词是第一本书', () => {
    const g = start();
    expect(s(g)).toMatchObject({ phase: 'place', n: 0, mode: null });
    expect(s(g).say).toEqual(m('clash.say.first', { book: 10 }));
    expect(labels(clashRules.controls(g.state))).toEqual([m('clash.btn.put')]);
    expect(clashRules.clickable(g.state)).toBe(false);
  });

  it('不撞的书直接放好；第一次撞时摇晃、错误音，让孩子选办法', () => {
    const g = start();
    putNext(g);
    expect(s(g).say).toEqual(m('clash.say.come', { book: 23 }));
    g.act({ type: 'put' });
    expect(s(g).phase).toBe('placed');
    expect(g.sounds).toEqual(['right', 'right']);
    g.act({ type: 'next' });
    g.act({ type: 'put' });
    expect(s(g)).toMatchObject({ phase: 'choose', clash: 3, keeper: 3 });
    expect(g.sounds.at(-1)).toBe('wrong');
    const b = buttons(clashRules.controls(g.state));
    expect(b.map((x) => x.label)).toEqual([m('clash.mode.chain'), m('clash.mode.probe')]);
    expect(b.every((x) => x.look === 'choice' && x.art?.scene === 'ModeIcon')).toBe(true);
    expect(g.act({ type: 'put' })).toBe(false);
  });

  it('选「叠在一起」：叠在 3 号架；选「放旁边」：落在 4 号架；之后这局都用这个办法，不再追问', () => {
    for (const [mode, spot] of [['chain', 3], ['probe', 4]] as const) {
      const g = start();
      toChoose(g);
      g.act({ type: 'choose', mode });
      expect(s(g)).toMatchObject({ phase: 'placed', mode, clash: null, keeper: spot });
      expect(s(g).say).toEqual(m('clash.say.placed', { book: 31, spot, tail: m(mode === 'chain' ? 'clash.say.tailChain' : 'clash.say.tailProbe', { b: 3 }) }));
      g.act({ type: 'next' });
      g.act({ type: 'put' });
      expect(s(g).phase).toBe('placed');
    }
  });

  it('五本放完去借书：点错书架晃一下、提示先算余数；点对后一本本看，节拍和停顿按常量', () => {
    const g = start();
    toFetch(g, 'chain');
    expect(s(g)).toMatchObject({ phase: 'fetch', f: 0 });
    expect(s(g).say).toEqual(m('clash.say.fetch', { book: 17 }));
    expect(clashRules.clickable(g.state)).toBe(true);
    g.act({ type: 'shelf', i: 0 });
    expect(s(g).shake).toEqual([0, 1]);
    expect(g.sounds.at(-1)).toBe('wrong');
    expect(s(g).say.key).toBe('clash.say.wrong');
    g.act({ type: 'shelf', i: 3 });
    expect(s(g)).toMatchObject({ phase: 'fetching' });
    expect(g.after).toBe(PAUSE_START);
    expect(clashRules.clickable(g.state)).toBe(false);
    g.tick();
    expect(s(g)).toMatchObject({ looks: 1, keeper: 3 });
    expect(g.after).toBe(PAUSE_BEAT);
    g.tick();
    g.tick();
    expect(s(g)).toMatchObject({ looks: 3, total: 3, stage: 'after' });
    expect(g.sounds.at(-1)).toBe('right');
    expect(g.after).toBe(PAUSE_BEAT * 2);
    g.tick();
    expect(s(g)).toMatchObject({ phase: 'fetch', f: 1 });
    expect(s(g).say).toEqual(m('clash.say.next', { book: 9 }));
  });

  it('两种办法借两本书的次数：叠起来 3+2，放旁边 3+5；两种都玩过后结算能比一比', () => {
    const g = start();
    toFetch(g, 'chain');
    fetch(g);
    fetch(g);
    expect(s(g)).toMatchObject({ phase: 'done', total: 5 });
    expect(g.sounds.at(-1)).toBe('win');
    let r = clashRules.result!(g.state)!;
    expect(r.title).toEqual(m('clash.done.title', { icon: '📚', name: m('clash.mode.chain'), total: 5 }));
    expect(r.body).toEqual(m('clash.done.other'));
    expect(r.foot).toEqual(m('clash.done.foot', { name: m('clash.mode.probe') }));
    expect(labels(clashRules.controls(g.state))).toEqual([m('clash.btn.other')]);
    g.act({ type: 'reset' });
    expect(s(g)).toMatchObject({ phase: 'place', n: 0, mode: null, total: 0, record: { chain: 5 } });
    toFetch(g, 'probe');
    fetch(g);
    fetch(g);
    expect(s(g).total).toBe(8);
    r = clashRules.result!(g.state)!;
    expect(r.body).toEqual(m('clash.done.both', { chain: 5, probe: 8 }));
    expect(r.foot).toBeUndefined();
    expect(labels(clashRules.controls(g.state))).toEqual([m('clash.btn.again')]);
    expect(CLASH_BOOKS).toHaveLength(5);
  });

  it('切标签：借书动画停在半路就回到「点书架」，不重复计次；已看完最后一步的直接往下走', () => {
    const g = start();
    toFetch(g, 'chain');
    g.act({ type: 'shelf', i: 3 });
    g.tick();
    g.interrupt();
    expect(s(g)).toMatchObject({ phase: 'fetch', f: 0, total: 0, looks: 0 });
    expect(g.after).toBeUndefined();
    g.act({ type: 'shelf', i: 3 });
    g.tick();
    g.tick();
    g.tick();
    expect(s(g).stage).toBe('after');
    g.interrupt();
    expect(s(g)).toMatchObject({ phase: 'fetch', f: 1, total: 3 });
  });
});

describe('挑战', () => {
  const game = () => driver(challengeRules, seeded(4));
  type G = ReturnType<typeof game>;
  const st = (g: G) => g.state as ChallengeState;
  const cap = (c: number): ChallengeAction => ({ type: 'cap', c });
  const goodCap = (g: G) => CHALLENGE_CAPS.find((c) => chainStats(st(g).keys, c).longest <= CHALLENGE_LIMIT)!;
  const badCap = (g: G) => CHALLENGE_CAPS.find((c) => chainStats(st(g).keys, c).longest > CHALLENGE_LIMIT)!;

  it('开局：8 本书的书号是同一个数的 1 到 8 倍；还没选书架数', () => {
    const g = game();
    expect(st(g).keys).toHaveLength(8);
    expect(st(g).keys[7]).toBe(st(g).keys[0] * 8);
    expect(st(g)).toMatchObject({ cap: null, tries: 0, won: false });
    expect(challengeRules.hud!(g.state).chips).toEqual([[m('chal.tries'), m('chal.times', { n: 0 })]]);
    expect(challengeRules.result!(g.state)).toBeNull();
    expect(challengeRules.controls(g.state)).toEqual([]);
  });

  it('选了会挤的书架数：错误音，记一次，最高一摞超标；统计多出两个小标签', () => {
    const g = game();
    g.act(cap(badCap(g)));
    expect(st(g)).toMatchObject({ tries: 1, won: false });
    expect(g.sounds.at(-1)).toBe('wrong');
    const stats = chainStats(st(g).keys, badCap(g));
    expect(challengeRules.hud!(g.state).chips).toEqual([
      [m('chal.tries'), m('chal.times', { n: 1 })],
      [m('chal.longest'), m('chal.books', { n: stats.longest })],
      [m('chal.looks'), m('chal.books', { n: stats.looks })],
    ]);
    expect(challengeRules.clickable(g.state)).toBe(true);
  });

  it('选了够松的书架数：win 声，过关，结算写次数、书架数和最高一摞；按钮灰掉不能再选；再来一题换新题', () => {
    const g = game();
    g.act(cap(badCap(g)));
    g.act(cap(goodCap(g)));
    expect(st(g)).toMatchObject({ tries: 2, won: true });
    expect(g.sounds.at(-1)).toBe('win');
    const stats = chainStats(st(g).keys, goodCap(g));
    expect(challengeRules.result!(g.state)).toEqual({ title: m('chal.win', { tries: 2, cap: goodCap(g), longest: stats.longest }), body: m('chal.winBody') });
    expect(challengeRules.clickable(g.state)).toBe(false);
    expect(g.act(cap(5))).toBe(false);
    expect(labels(challengeRules.controls(g.state))).toEqual([m('chal.fresh')]);
    g.act({ type: 'fresh' });
    expect(st(g)).toMatchObject({ cap: null, tries: 0, won: false });
  });

  it('没过关时「再来一题」不接受', () => {
    expect(game().act({ type: 'fresh' })).toBe(false);
  });
});

describe('猜下一步：一道题就是一问', () => {
  it('答对：结局带 ✅ 并给正确书架描边；答错：先亮出正确书架，继续后的结局没有 ✅', () => {
    const r = rounds(1, KID_CAP, seeded(3))[0];
    const p = askRound(r);
    expect(p.asks).toHaveLength(1);
    expect(p.chips).toEqual([['key', r.key]]);
    let s = pr.startPredict(p, 5);
    const ok = pr.answer(s, r.correct)!;
    expect(ok.state.phase).toBe('end');
    const v = pr.viewOf(ok.state);
    expect(v.prompt).toEqual(m('predict.right', { text: r.ok }));
    expect(v.view).toMatchObject({ hit: r.correct, ring: r.correct });

    const bad = pr.answer(s, (r.correct + 1) % KID_CAP)!;
    expect(bad.state.phase).toBe('wrong');
    expect(pr.viewOf(bad.state)).toMatchObject({ wrong: r.why, picked: (r.correct + 1) % KID_CAP, view: { hit: r.correct } });
    s = pr.proceed(bad.state)!;
    expect(pr.viewOf(s)).toMatchObject({ ended: true, prompt: r.ok });
  });

  it('规则里的题：连对 5 次过关', () => {
    const rand = seeded(8);
    const pd = level.predict!.main;
    expect(pd.goal).toBe(5);
    let s = pr.startPredict(pd.puzzle(rand), 5);
    for (let k = 0; k < 5; k++) {
      s = pr.answer(s, s.puzzle.asks[0].answer)!.state;
      if (k < 4) s = pr.nextPuzzle(s, pd.puzzle(rand));
    }
    expect(s.passed).toBe(true);
  });
});
