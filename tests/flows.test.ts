import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pl from '../src/core/flows/player';
import * as pr from '../src/core/flows/predict';
import * as bh from '../src/core/flows/bughunt';
import { actGame, interruptGame, resultOf, startGame, tickGame } from '../src/core/flows/game';
import { MANUAL, PAUSE_SHORT } from '../src/core/timing';
import type { GameRules, Puzzle } from '../src/core/types';

describe('flows/player：逐步播放', () => {
  const at = (idx: number, total = 4, speed = 1500, playing = false): pl.PlayerState => ({ idx, total, speed, playing });

  it('单步前进后退，到头不越界，往前一步才出声', () => {
    let o = pl.next(at(0));
    expect(o.state.idx).toBe(1);
    expect(o.sound).toBe('tick');
    o = pl.next(at(3));
    expect(o.state.idx).toBe(3);
    expect(o.sound).toBeUndefined();
    o = pl.prev(at(2));
    expect(o.state.idx).toBe(1);
    expect(o.sound).toBeUndefined();
    expect(pl.prev(at(0)).state.idx).toBe(0);
    expect(pl.reset(at(3)).state.idx).toBe(0);
  });

  it('播放：开始时让界面开定时器，到点走一步，走到最后一步后的下一次到点才停', () => {
    let o = pl.toggle(at(0));
    expect(o.timer).toBe('start');
    expect(o.state.playing).toBe(true);
    for (let k = 0; k < 3; k++) {
      o = pl.tick(o.state);
      expect(o.state.idx).toBe(k + 1);
      expect(o.sound).toBe('tick');
      expect(o.timer).toBeUndefined();
    }
    expect(o.state.playing).toBe(true);
    o = pl.tick(o.state);
    expect(o.state.playing).toBe(false);
    expect(o.timer).toBe('stop');
    expect(o.state.idx).toBe(3);
  });

  it('播放中再点是暂停；到头了再点回到开头重新播', () => {
    expect(pl.toggle(at(1, 4, 1500, true))).toMatchObject({ timer: 'stop', state: { playing: false, idx: 1 } });
    expect(pl.toggle(at(3))).toMatchObject({ timer: 'start', state: { playing: true, idx: 0 } });
  });

  it('手动档：点一下走一步，不自动播放；到头了再点回到开头', () => {
    let o = pl.toggle(at(0, 3, MANUAL));
    expect(o.state).toMatchObject({ idx: 1, playing: false });
    o = pl.toggle(o.state);
    expect(o.state.idx).toBe(2);
    o = pl.toggle(o.state);
    expect(o.state).toMatchObject({ idx: 0, playing: false });
    expect(o.timer).toBeUndefined();
  });

  it('换速度档：播放中按新间隔重新开始，换成手动则停下；没在播放只记下', () => {
    expect(pl.setSpeed(at(1, 4, 1500, true), 700)).toMatchObject({ timer: 'start', state: { speed: 700, playing: true } });
    expect(pl.setSpeed(at(1, 4, 1500, true), MANUAL)).toMatchObject({ timer: 'stop', state: { playing: false } });
    expect(pl.setSpeed(at(1), 700)).toEqual({ state: at(1, 4, 700) });
  });

  it('jumpTo：跳到第一个满足条件的步骤，找不到停在最后；一步以内才出声', () => {
    const o = pl.jumpTo(at(0, 6, 1500, true), (i) => i === 3);
    expect(o.state).toMatchObject({ idx: 3, playing: false });
    expect(o.timer).toBe('stop');
    expect(o.sound).toBeUndefined();
    expect(pl.jumpTo(at(0, 6), () => false).state.idx).toBe(5);
    expect(pl.jumpTo(at(0, 6), (i) => i === 1).sound).toBe('tick');
  });

  it('换了轨迹回到第一步并停下；停下不动位置', () => {
    expect(pl.setTotal(at(3, 4, 1500, true), 9)).toMatchObject({ timer: 'stop', state: { idx: 0, total: 9, playing: false } });
    expect(pl.stop(at(2, 4, 1500, true)).state).toMatchObject({ idx: 2, playing: false });
  });
});

describe('flows/predict：猜下一步', () => {
  // 两问一题：先点出数字 3（pick），再选 b（choose，答对要讲一句）
  const puzzle = (): Puzzle<string, number | string> => ({
    asks: [
      { view: 'v1', prompt: m('p1'), kind: 'pick', answer: 3, why: m('why1'), reveal: { view: 'v1+', prompt: m('p1+') } },
      { view: 'v2', prompt: m('p2'), kind: 'choose', answer: 'b', why: m('why2'), options: [{ value: 'a', label: m('a') }, { value: 'b', label: m('b') }] },
    ],
    end: { view: 'end', prompt: m('done') },
  });

  it('答对依次往下走，答完看结局', () => {
    let s = pr.startPredict(puzzle(), 5);
    expect(pr.viewOf(s)).toMatchObject({ view: 'v1', pickable: true, options: null });
    let o = pr.answer(s, 3)!;
    expect(o.sound).toBe('right');
    s = o.state;
    expect(pr.viewOf(s)).toMatchObject({ view: 'v2', pickable: false });
    expect(pr.viewOf(s).options).toHaveLength(2);
    o = pr.answer(s, 'b')!;
    s = o.state;
    expect(s).toMatchObject({ phase: 'end', streak: 2 });
    expect(pr.viewOf(s)).toMatchObject({ ended: true, view: 'end', prompt: m('done') });
    expect(pr.answer(s, 3)).toBeNull();
  });

  it('答错：连对清零、出错误音、给解释和揭晓的画面；点了什么记下来，继续后往下走', () => {
    let s = pr.startPredict(puzzle(), 5, { streak: 3, passed: false });
    const o = pr.answer(s, 7)!;
    expect(o.sound).toBe('wrong');
    s = o.state;
    expect(s).toMatchObject({ phase: 'wrong', streak: 0, picked: 7 });
    expect(pr.viewOf(s)).toMatchObject({ wrong: m('why1'), view: 'v1+', prompt: m('p1+'), pickable: false, picked: 7 });
    expect(pr.answer(s, 3)).toBeNull(); // 看解释期间不接受回答
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1, picked: null });
    // 选项类的问答错：不记 picked，继续后进入结局
    s = pr.answer(s, 'a')!.state;
    expect(s.picked).toBeNull();
    expect(pr.viewOf(s).view).toBe('v2');
    s = pr.proceed(s)!;
    expect(s.phase).toBe('end');
  });

  it('连对到目标过关，只在刚到的那一次出 win 声；过关后答错清零但保持过关；换题保留连对', () => {
    let s = pr.startPredict(puzzle(), 3);
    s = pr.answer(s, 3)!.state;
    s = pr.answer(s, 'b')!.state;
    expect(s.passed).toBe(false);
    s = pr.nextPuzzle(s, puzzle());
    expect(s).toMatchObject({ phase: 'ask', i: 0, streak: 2 });
    const o = pr.answer(s, 3)!;
    expect(o.sound).toBe('win');
    expect(o.state).toMatchObject({ passed: true, streak: 3 });
    const o2 = pr.answer(pr.nextPuzzle(o.state, puzzle()), 3)!;
    expect(o2.sound).toBe('right');
    const bad = pr.answer(pr.nextPuzzle(o.state, puzzle()), 9)!.state;
    expect(bad).toMatchObject({ streak: 0, passed: true });
  });

  it('答对也要讲一句的问：先停在 right，点下一题才往下', () => {
    const p = puzzle();
    p.asks[0].right = m('good');
    let s = pr.startPredict(p);
    s = pr.answer(s, 3)!.state;
    expect(s.phase).toBe('right');
    expect(pr.viewOf(s)).toMatchObject({ right: m('good'), wrong: null, view: 'v1' });
    expect(pr.answer(s, 3)).toBeNull();
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1 });
    expect(pr.proceed(s)).toBeNull();
  });
});

describe('flows/bughunt：找 bug', () => {
  const bug = { id: 'a', wrongLine: 4 };

  it('点错的行记下来并标红，找到后标绿并不再接受点击', () => {
    let s = bh.startBugHunt('a');
    let o = bh.pick(s, bug, 2)!;
    expect(o.sound).toBe('wrong');
    s = o.state;
    expect(s.miss).toBe(2);
    expect(bh.marks(s, bug)).toEqual({ 2: 'bad' });
    o = bh.pick(s, bug, 4)!;
    expect(o.sound).toBe('right');
    s = o.state;
    expect(s.miss).toBeNull();
    expect(bh.marks(s, bug)).toEqual({ 2: 'bad', 4: 'good' });
    expect(bh.pick(s, bug, 1)).toBeNull();
    expect(bh.solvedCount(s, ['a', 'b'])).toBe(1);
  });

  it('换坑清掉提示，各坑的记录互不影响；选同一个坑不清提示', () => {
    let s = bh.startBugHunt('a');
    s = bh.pick(s, bug, 2)!.state;
    expect(bh.choose(s, 'a').miss).toBe(2);
    s = bh.choose(s, 'b');
    expect(s).toMatchObject({ which: 'b', miss: null });
    expect(bh.marks(s, { id: 'b', wrongLine: 1 })).toEqual({});
    expect(bh.marks(bh.choose(s, 'a'), bug)).toEqual({ 2: 'bad' });
  });
});

describe('flows/game：执行 GameRules', () => {
  // 一个最小的小游戏：点 inc 加一，加到 2 时进入动画，tick 后结束
  interface S { n: number; phase: 'play' | 'anim' | 'done' }
  const rules: GameRules<S, 'inc'> = {
    start: () => ({ state: { n: 0, phase: 'play' }, say: m('go') }),
    act(s) {
      if (s.phase !== 'play') return null;
      const n = s.n + 1;
      return n >= 2 ? { state: { n, phase: 'anim' }, sound: 'right', after: PAUSE_SHORT } : { state: { ...s, n } };
    },
    tick: (s) => ({ state: { ...s, phase: 'done' }, say: m('end'), sound: 'win' }),
    interrupt: (s) => (s.phase === 'anim' ? { state: { n: 0, phase: 'play' }, say: m('go') } : { state: s }),
    clickable: (s) => s.phase === 'play',
    controls: () => [],
    result: (s) => (s.phase === 'done' ? { stars: 3 } : null),
  };

  it('台词保持到规则给新的；副作用原样交给界面', () => {
    let st = startGame(rules);
    expect(st.run.say).toEqual(m('go'));
    st = actGame(rules, st.run, 'inc')!;
    expect(st.run.say).toEqual(m('go'));
    expect(st.after).toBeUndefined();
    st = actGame(rules, st.run, 'inc')!;
    expect(st).toMatchObject({ sound: 'right', after: PAUSE_SHORT });
    expect(actGame(rules, st.run, 'inc')).toBeNull();
    st = tickGame(rules, st.run);
    expect(st.run.say).toEqual(m('end'));
    expect(resultOf(rules, st.run)).toEqual({ stars: 3 });
  });

  it('切标签：动画中途复位，其余不变；没有 tick / interrupt 的规则什么都不做', () => {
    let st = startGame(rules);
    st = actGame(rules, actGame(rules, st.run, 'inc')!.run, 'inc')!;
    expect(interruptGame(rules, st.run).run.state).toEqual({ n: 0, phase: 'play' });
    const idle = startGame(rules).run;
    expect(interruptGame(rules, idle).run).toEqual(idle);
    const bare: GameRules<number, never> = { start: () => ({ state: 1 }), act: () => null, clickable: () => false, controls: () => [] };
    const run = startGame(bare).run;
    expect(tickGame(bare, run).run).toBe(run);
    expect(interruptGame(bare, run).run).toBe(run);
    expect(resultOf(bare, run)).toBeNull();
  });
});
