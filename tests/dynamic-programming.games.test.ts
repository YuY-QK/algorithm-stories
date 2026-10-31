import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { resultOf } from '../src/core/flows/game';
import { PAUSE_BRIEF, PAUSE_LONG, PAUSE_MID, PAUSE_SHORT, PAUSE_START, PAUSE_TICK } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BIG_STAIRS, BUGS, FIND_LEVELS, GRID_COLS, GRID_ROWS, GUESS_LEVELS, KID_N, NOTES_MAX, NOTES_START,
  bugVerdict, buildTrace, callTree, cellHint, cellsToFill, countRules, flatten, gridCur, gridDone, gridFilled, gridRules, gridSources, gridTable,
  level, makePuzzle, naiveCalls, memoCalls, noteOptions, notesLookups, notesRoot, notesRules, playStars, rounds, runBug, traceRules, twinOf, ways, whyFrom,
  type CountAction, type CountGame, type GridAction, type GridGame, type NotesAction, type NotesGame,
} from '../src/engine/dynamic-programming';
import { driver } from './helpers/game';
import { seeded } from './helpers/seeded';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');

describe('玩法一「数跳法」', () => {
  type D = ReturnType<typeof driver<CountGame, CountAction>>;
  /** 把当前这一级所有跳法按顺序点出来（每跳完一种，让收起来的 tick 走完） */
  function findAll(d: D) {
    const level = d.state.li + 1;
    for (const p of allPathsOf(level)) {
      for (const h of p) d.act({ type: 'hop', h: h as 1 | 2 });
      d.settle();
    }
  }
  const allPathsOf = (n: number): number[][] => (n === 0 ? [[]] : [...allPathsOf(n - 1).map((p) => [1, ...p]), ...(n >= 2 ? allPathsOf(n - 2).map((p) => [2, ...p]) : [])]);

  it('开局：第 1 级，楼梯上只有地面的便签，台词让孩子点 1 或 2；没有按钮（画面里有小跳大跳）', () => {
    const d = driver(countRules);
    expect(d.state).toMatchObject({ li: 0, path: [], found: [], busy: false, levelDone: false, allDone: false, wrongs: 0 });
    expect(d.state.notes).toEqual([1, null, null, null, null, null, null]);
    expect(d.say).toEqual(m('count.say.find0', { n: 1 }));
    expect(countRules.clickable(d.state)).toBe(true);
    expect(countRules.controls(d.state)).toEqual([]);
  });

  it('跳过头：摇头、出错声、说已经跳到第几级；不算跳法', () => {
    const d = driver(countRules);
    d.act({ type: 'hop', h: 2 });
    expect(d.state.shake).toEqual(['h2', 1]);
    expect(d.say).toEqual(m('count.say.over', { sofar: 0, h: 2, n: 1 }));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.state.path).toEqual([]);
    d.act({ type: 'hop', h: 2 });
    expect(d.state.shake).toEqual(['h2', 2]);
  });

  it('找到第一种跳法：出声，PAUSE_SHORT 后收起来；第 1 级只有一种，贴便签、出现「下一级」', () => {
    const d = driver(countRules);
    d.act({ type: 'hop', h: 1 });
    expect(d.state).toMatchObject({ busy: true, levelDone: true, found: [[1]] });
    expect(d.state.notes[1]).toBe(1);
    expect(d.say).toEqual(m('count.say.levelDone', { n: 1, total: 1 }));
    expect(d.sounds).toContain('right');
    expect(d.after).toBe(PAUSE_SHORT);
    expect(countRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'hop', h: 1 })).toBe(false);
    d.tick();
    expect(d.state).toMatchObject({ path: [], busy: false });
    expect(buttons(countRules.controls(d.state)).map((b) => b.label)).toEqual([m('count.next')]);
  });

  it('第 3 级有 3 种：找到一种说第几种、PAUSE_MID 后收起来；重复的说已经有啦、出错声、PAUSE_LONG 后收起来', () => {
    const d = driver(countRules);
    findAll(d);
    d.act({ type: 'next' });
    findAll(d);
    d.act({ type: 'next' });
    expect(d.state.li).toBe(2);
    d.act({ type: 'hop', h: 1 });
    d.act({ type: 'hop', h: 1 });
    d.act({ type: 'hop', h: 1 });
    expect(d.say).toEqual(m('count.say.found', { path: '1 + 1 + 1', k: 1, total: 3 }));
    expect(d.after).toBe(PAUSE_MID);
    d.tick();
    d.act({ type: 'hop', h: 1 });
    d.act({ type: 'hop', h: 1 });
    d.act({ type: 'hop', h: 1 });
    expect(d.say).toEqual(m('count.say.dup', { path: '1 + 1 + 1' }));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.after).toBe(PAUSE_LONG);
    expect(d.state.found).toHaveLength(1);
    d.tick();
    expect(d.state).toMatchObject({ path: [], busy: false });
  });

  it('找跳法的三级走完：便签是 1、1、2、3；便签格里每一级都贴上', () => {
    const d = driver(countRules);
    for (let k = 0; k < FIND_LEVELS.length; k++) {
      findAll(d);
      expect(d.state.levelDone).toBe(true);
      expect(d.state.found).toHaveLength(ways(k + 1));
      d.act({ type: 'next' });
    }
    expect(d.state.notes.slice(0, 4)).toEqual([1, 1, 2, 3]);
    expect(d.state.li).toBe(3);
    expect(d.say).toEqual(m('count.say.look', { n: 4 }));
    expect(countRules.clickable(d.state)).toBe(true);
    expect(d.act({ type: 'hop', h: 1 })).toBe(false);
  });

  it('猜便签：猜错不说「错了」，下面两级闪光（每次重新闪）、摇头、出错声；第二次换更直白的提示；猜过的数不能再点；猜对讲算式', () => {
    const d = driver(countRules);
    for (let k = 0; k < FIND_LEVELS.length; k++) {
      findAll(d);
      d.act({ type: 'next' });
    }
    const right = ways(4);
    const wrongs = noteOptions(4).filter((o) => o !== right);
    d.act({ type: 'choose', v: wrongs[0] });
    expect(d.state).toMatchObject({ wrongs: 1, levelWrongs: 1, glow: [3, 2], glowN: 1, shake: ['o' + wrongs[0], 1] });
    expect(d.say).toEqual(m('count.say.wrong1', { v: wrongs[0] }));
    expect(d.sounds.at(-1)).toBe('wrong');
    expect(d.act({ type: 'choose', v: wrongs[0] })).toBe(false);
    d.act({ type: 'choose', v: wrongs[1] });
    expect(d.state).toMatchObject({ wrongs: 2, glowN: 2 });
    expect(d.say).toEqual(m('count.say.wrong2'));
    d.act({ type: 'choose', v: right });
    expect(d.state).toMatchObject({ levelDone: true, glow: [] });
    expect(d.state.notes[4]).toBe(right);
    expect(d.say).toEqual(m('count.say.right', { a: 3, b: 2, v: right }));
    expect(d.sounds.at(-1)).toBe('right');
    expect(d.act({ type: 'choose', v: wrongs[2] })).toBe(false);
  });

  it('全走完：说你发现啦、出赢声；星星按答错次数；再玩一次回到第 1 级', () => {
    const run = (mistakes: number) => {
      const d = driver(countRules);
      let left = mistakes;
      for (let k = 0; k < FIND_LEVELS.length + GUESS_LEVELS.length; k++) {
        if (k < FIND_LEVELS.length) findAll(d);
        else {
          const lv = d.state.li + 1;
          if (left > 0) {
            left--;
            d.act({ type: 'choose', v: noteOptions(lv).find((o) => o !== ways(lv))! });
          }
          d.act({ type: 'choose', v: ways(lv) });
        }
        if (k === FIND_LEVELS.length + GUESS_LEVELS.length - 1) expect(buttons(countRules.controls(d.state)).map((b) => b.label)).toEqual([m('count.finish')]);
        d.act({ type: 'next' });
      }
      return d;
    };
    const d = run(0);
    expect(d.state.allDone).toBe(true);
    expect(d.say).toEqual(m('count.say.all'));
    expect(d.sounds.at(-1)).toBe('win');
    expect(resultOf(countRules, d.run)).toEqual({ stars: 3, body: m('count.all.body') });
    expect(buttons(countRules.controls(d.state)).map((b) => b.label)).toEqual([m('count.again')]);
    expect(resultOf(countRules, run(2).run)!.stars).toBe(2);
    expect(resultOf(countRules, run(3).run)!.stars).toBe(1);
    expect([playStars(0), playStars(2), playStars(3)]).toEqual([3, 2, 1]);
    d.act({ type: 'again' });
    expect(d.state).toMatchObject({ li: 0, allDone: false, wrongs: 0, notes: [1, null, null, null, null, null, null] });
  });

  it('切标签：等着收起来的跳法直接收起来；其他时候什么都不变', () => {
    const d = driver(countRules);
    d.act({ type: 'hop', h: 1 });
    expect(d.state.busy).toBe(true);
    d.interrupt();
    expect(d.state).toMatchObject({ busy: false, path: [] });
    expect(d.state.levelDone).toBe(true);
    const keep = d.state;
    d.interrupt();
    expect(d.state).toEqual(keep);
  });
});

describe('玩法二「便签有多省事」', () => {
  type D = ReturnType<typeof driver<NotesGame, NotesAction>>;
  const findLookups = (d: D) => {
    for (const n of notesLookups(d.state)) d.act({ type: 'pick', id: n.id });
  };
  const nodeOf = (d: D, f: (n: ReturnType<typeof flatten>[number]) => boolean) => flatten(notesRoot(d.state)).find(f)!;

  it('开局：第 5 级的调用树，台词让孩子点前面已经算过的圆圈；没有按钮', () => {
    const d = driver(notesRules);
    expect(d.state).toMatchObject({ n: NOTES_START, phase: 'tap', found: [], misses: 0 });
    expect(d.say).toEqual(m('notes.say.start'));
    expect(notesRules.clickable(d.state)).toBe(true);
    expect(notesRules.controls(d.state)).toEqual([]);
  });

  it('点对一个贴便签：出对声，说第几级前面算过了；点过的再点没反应', () => {
    const d = driver(notesRules);
    const look = notesLookups(d.state)[0];
    d.act({ type: 'pick', id: look.id });
    expect(d.state.found).toEqual([look.id]);
    expect(d.say).toEqual(m('notes.say.found', { n: look.n }));
    expect(d.sounds.at(-1)).toBe('right');
    expect(d.act({ type: 'pick', id: look.id })).toBe(false);
  });

  it('点错：摇头、出错声，按种类说原因（第 0、1 级本来就知道 / 第一次出现 / 上面还有没贴便签的）', () => {
    const d = driver(notesRules);
    const leaf = nodeOf(d, (n) => n.n <= 1 && n.kind !== 'skipped');
    d.act({ type: 'pick', id: leaf.id });
    expect(d.say).toEqual(m('notes.say.known', { n: leaf.n }));
    expect(d.state.shake).toEqual([leaf.id, 1]);
    expect(d.sounds.at(-1)).toBe('wrong');
    const e = driver(notesRules);
    const first = nodeOf(e, (n) => n.kind === 'call' && n.n >= 2);
    e.act({ type: 'pick', id: first.id });
    expect(e.say).toEqual(m('notes.say.first', { n: first.n }));
    expect(e.state.shake).toEqual([first.id, 1]);
  });

  it('连续点错两次：数字相同的两个圆圈闪光（每次重新闪），台词指路；找对一个后清零', () => {
    const d = driver(notesRules);
    const first = nodeOf(d, (n) => n.kind === 'call' && n.n >= 2);
    d.act({ type: 'pick', id: first.id });
    expect(d.state.glow).toEqual([]);
    d.act({ type: 'pick', id: first.id });
    const target = notesLookups(d.state)[0];
    expect(d.state.glow).toEqual([target.id, twinOf(notesRoot(d.state), target.id)]);
    expect(d.state.glowN).toBe(1);
    expect(d.say).toEqual(m('notes.say.glow'));
    d.act({ type: 'pick', id: first.id });
    expect(d.state.glowN).toBe(2);
    d.act({ type: 'pick', id: target.id });
    expect(d.state).toMatchObject({ glow: [], misses: 0 });
  });

  it('树下面被抄便签的整棵子树（skipped）点了说先看上面', () => {
    const d = driver(notesRules);
    const sk = nodeOf(d, (n) => n.kind === 'skipped');
    d.act({ type: 'pick', id: sk.id });
    expect(d.say).toEqual(m('notes.say.skipped'));
  });

  it('全找出来：出赢声，说 N 次算成了 M 次；出现「再爬高一级」「再玩一次」，树不能再点', () => {
    const d = driver(notesRules);
    findLookups(d);
    expect(d.state.phase).toBe('explore');
    expect(d.say).toEqual(m('notes.say.done', { naive: naiveCalls(5), memo: memoCalls(5) }));
    expect(d.sounds.at(-1)).toBe('win');
    expect(notesRules.clickable(d.state)).toBe(false);
    expect(d.act({ type: 'pick', id: 0 })).toBe(false);
    const bs = buttons(notesRules.controls(d.state));
    expect(bs.map((b) => b.label)).toEqual([m('notes.higher'), m('notes.again')]);
    expect(bs[0].aria).toEqual(m('notes.aria.higher'));
  });

  it('再爬高一级：到第 6 级为止，按钮灰掉；每次说两种次数；再玩一次回到第 5 级', () => {
    const d = driver(notesRules);
    expect(d.act({ type: 'higher' })).toBe(false);
    findLookups(d);
    d.act({ type: 'higher' });
    expect(d.state.n).toBe(NOTES_MAX);
    expect(d.say).toEqual(m('notes.say.higher', { n: 6, naive: naiveCalls(6), memo: memoCalls(6) }));
    expect(d.sounds.at(-1)).toBe('tick');
    expect(buttons(notesRules.controls(d.state))[0].disabled).toBe(true);
    expect(d.act({ type: 'higher' })).toBe(false);
    d.act({ type: 'again' });
    expect(d.state).toEqual({ n: NOTES_START, phase: 'tap', found: [], misses: 0, glow: [], glowN: 0, shake: null });
    expect(d.say).toEqual(m('notes.say.again'));
  });

  it('大楼梯表里的数字：不记便签 2·ways(n) − 1，记便签 2n − 1', () => {
    expect(BIG_STAIRS.map((n) => naiveCalls(n))).toEqual(BIG_STAIRS.map((n) => 2 * ways(n) - 1));
    expect(BIG_STAIRS.map((n) => memoCalls(n))).toEqual(BIG_STAIRS.map((n) => 2 * n - 1));
    expect(callTree(NOTES_START).n).toBe(5);
  });
});

describe('逐步执行的规则', () => {
  it('楼梯级数 5、8、12 三档，开局 8；换档就换一条轨迹', () => {
    const tr = traceRules;
    expect(tr.start()).toEqual({ n: 8 });
    const seg = tr.controls(tr.start())[0] as Extract<Control<unknown>, { type: 'segmented' }>;
    expect(seg.options.map((o) => o.value)).toEqual([5, 8, 12]);
    expect(tr.act({ n: 8 }, { type: 'n', n: 12 })).toEqual({ n: 12 });
    expect(tr.trace({ n: 5 }).length).toBeLessThan(tr.trace({ n: 12 }).length);
  });

  it('刚写进去的那一格（fresh）：dp[0]、dp[1]、dp[2]……一格一格出现；其余步骤没有', () => {
    const steps = buildTrace(5);
    const fresh = steps.map((s) => s.fresh).filter((x) => x !== null);
    expect(fresh).toEqual([0, 1, 2, 3, 4, 5]);
    expect(steps[0].fresh).toBeNull();
    for (const s of steps) if (s.fresh !== null) expect(s.dp[s.fresh]).not.toBeNull();
  });

  it('变量标签：i 在循环外是 —；dp[i-1]、dp[i-2] 读前两格；总结讲填了几格', () => {
    const tr = traceRules;
    const input = { n: 5 };
    const steps = tr.trace(input);
    expect(tr.vars(input, steps[0])).toEqual([['n', 5], ['i', '—'], ['dp[i-1]', '—'], ['dp[i-2]', '—']]);
    const fill = steps.find((s) => s.line === 6 && s.i === 3)!;
    expect(tr.vars(input, fill)).toEqual([['n', 5], ['i', 3], ['dp[i-1]', 2], ['dp[i-2]', 1]]);
    expect(tr.summary!(input, steps[0])).toBeNull();
    expect(tr.summary!(input, steps.at(-1)!)).toEqual(m('trace.summary', { n: 5, v: 8, k: 4 }));
  });
});

describe('猜下一步：把一道题排成一问接一问', () => {
  it('每一格两问：点出两个来源格（点齐才算）、选值；值答对后填上稍停', () => {
    const puzzle = makePuzzle(6);
    const rs = rounds(6);
    expect(puzzle.asks).toHaveLength(rs.length * 2);
    rs.forEach((r, k) => {
      const [from, value] = puzzle.asks.slice(k * 2, k * 2 + 2);
      expect(from.kind).toBe('pick');
      expect([...from.collect!].sort()).toEqual([r.i - 2, r.i - 1].sort());
      expect(from.view).toMatchObject({ cur: r.i, picked: [], fresh: null });
      expect(value.kind).toBe('choose');
      expect(value.answer).toBe(r.value);
      expect(value.view.picked).toEqual(from.collect);
      expect(value.options!.map((o) => o.value)).toEqual(r.options);
      expect(value.anim!.frames).toHaveLength(1);
      expect(value.anim!.frames[0]).toMatchObject({ cur: r.i, fresh: r.i });
      expect(value.anim!.frames[0].dp[r.i]).toBe(r.value);
      expect(value.anim!.hold).toBe(PAUSE_LONG);
      expect(value.anim!.holdWrong).toBe(PAUSE_BRIEF);
    });
    expect(puzzle.end.view).toMatchObject({ cur: 6, fresh: 6 });
  });

  it('点来源格：两格顺序不限；点对一格先记下（不出声、不计连对）；点齐算答对；点过的再点没反应', () => {
    const puzzle = makePuzzle(5);
    for (const order of [[1, 0], [0, 1]]) {
      let s = pr.startPredict(puzzle, 5);
      const first = pr.answer(s, order[0])!;
      expect(first.sound).toBeUndefined();
      s = first.state;
      expect(s).toMatchObject({ phase: 'ask', i: 0, streak: 0, got: [order[0]] });
      expect(pr.viewOf(s).got).toEqual([order[0]]);
      expect(pr.viewOf(s).pickable).toBe(true);
      expect(pr.answer(s, order[0])).toBeNull();
      const second = pr.answer(s, order[1])!;
      expect(second.sound).toBe('right');
      expect(second.state).toMatchObject({ phase: 'ask', i: 1, streak: 1, got: [] });
    }
  });

  it('点错来源格：清零连对、记下点的格子；已经点对的那一格还亮着；解释随点的格子变（还空着 / 不是前两格）；继续后直接问值', () => {
    const puzzle = makePuzzle(6);
    let s = pr.startPredict(puzzle, 5);
    s = pr.answer(s, 1)!.state; // dp[2] 的来源之一
    s = pr.answer(s, 5)!.state; // dp[5] 还空着
    expect(s).toMatchObject({ phase: 'wrong', picked: 5, streak: 0, got: [1] });
    expect(pr.viewOf(s).wrong).toEqual(m('why.empty', { k: 5 }));
    expect(pr.viewOf(s).got).toEqual([1]);
    expect(pr.viewOf(s).pickable).toBe(false);
    s = pr.proceed(s)!;
    expect(s).toMatchObject({ phase: 'ask', i: 1, got: [] });
    expect(pr.viewOf(s).view.picked).toEqual([1, 0]);
    // 填 dp[4] 时点了有数、但不是前两格的 dp[0]
    const r = rounds(6)[2];
    expect(r.i).toBe(4);
    expect(whyFrom(r, 0)).toEqual(m('why.from', { i: 4, i1: 3, i2: 2 }));
    const ask = puzzle.asks[4];
    expect(ask.whyFor!(0)).toEqual(m('why.from', { i: 4, i1: 3, i2: 2 }));
    expect(ask.whyFor!(6)).toEqual(m('why.empty', { k: 6 }));
  });

  it('选值：答对先停下来显示「✅ 算式」和刚填好的格子（PAUSE_LONG），再进入下一格；答错讲算式，继续后同样停一下（PAUSE_BRIEF）', () => {
    const puzzle = makePuzzle(4);
    const rs = rounds(4);
    let s = pr.startPredict(puzzle, 5);
    s = pr.answer(pr.answer(s, 1)!.state, 0)!.state; // dp[2] 的来源：dp[1]、dp[0]
    // 答对值
    const right = pr.answer(s, rs[0].value)!;
    expect(right.state.phase).toBe('anim');
    expect(pr.animDelay(right.state)).toBe(PAUSE_LONG);
    const v = pr.viewOf(right.state);
    expect(v.prompt).toEqual(m('predict.filled', { i: 2, x: 1, y: 1, v: 2 }));
    expect(v.view).toMatchObject({ cur: 2, fresh: 2 });
    expect(v.options).toBeNull();
    expect(v.pickable).toBe(false);
    const next = pr.tickAnim(right.state)!;
    expect(next).toMatchObject({ phase: 'ask', i: 2, streak: 2 });
    // 答错值
    const wrongV = rs[0].options.find((o) => o !== rs[0].value)!;
    let w = pr.answer(s, wrongV)!.state;
    expect(w).toMatchObject({ phase: 'wrong', streak: 0 });
    expect(pr.viewOf(w).wrong).toEqual(rs[0].why);
    w = pr.proceed(w)!;
    expect(w.phase).toBe('anim');
    expect(pr.animDelay(w)).toBe(PAUSE_BRIEF);
    expect(pr.tickAnim(w)).toMatchObject({ phase: 'ask', i: 2 });
    // 动画帧之间的节拍（只有一帧，停完就进入下一问）
    expect([PAUSE_START, PAUSE_TICK].every((x) => x > 0)).toBe(true);
  });

  it('切标签时动画不会泄漏：动画只有一个状态，没有额外定时器（由界面按 animDelay 驱动）', () => {
    const puzzle = makePuzzle(4);
    let s = pr.startPredict(puzzle, 5);
    s = pr.answer(pr.answer(s, 1)!.state, 0)!.state;
    s = pr.answer(s, rounds(4)[0].value)!.state;
    expect(s.phase).toBe('anim');
    // 播完的 tickAnim 之后再调就返回 null
    const n = pr.tickAnim(s)!;
    expect(pr.tickAnim(n)).toBeNull();
    expect(pr.animDelay(n)).toBeNull();
  });

  it('全部答对：连对满 5 过关，看结局；goal 是 5；出的题 6 到 10 级', () => {
    const puzzle = makePuzzle(6);
    let s = pr.startPredict(puzzle, 5);
    for (const ask of puzzle.asks) {
      if (ask.collect) for (const c of ask.collect) s = pr.answer(s, c)!.state;
      else s = pr.answer(s, ask.answer)!.state;
      if (s.phase === 'anim') s = pr.tickAnim(s)!;
    }
    expect(s.phase).toBe('end');
    expect(s).toMatchObject({ streak: 10, passed: true });
    expect(pr.viewOf(s).prompt).toEqual(m('predict.end', { i: 6, v: 13 }));
    const rules = level.predict!.main;
    expect(rules.goal).toBe(5);
    for (let k = 0; k < 50; k++) {
      const n = rules.puzzle(seeded(k)).asks.length / 2 + 1;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(10);
    }
  });
});

describe('找 bug', () => {
  it('规则：三个坑；输入那行带上 n 和正确结果；不需要「跳到」按钮', () => {
    const br = level.bugs!.main;
    expect(br.bugs).toBe(BUGS);
    expect(br.input(BUGS[0])).toEqual(m('bug.input', { n: 5, expect: m('bug.init.expect') }));
    expect(br.jump).toBeUndefined();
    expect(br.vars(runBug(BUGS[1])[0], BUGS[1])).toEqual([['n', 4], ['i', '—']]);
  });

  it('判定：没跑完是空；崩溃说下标越界；跑完答案不对说返回了几', () => {
    expect(bugVerdict(runBug(BUGS[0])[0], BUGS[0])).toBeNull();
    expect(bugVerdict(runBug(BUGS[0]).at(-1)!, BUGS[0])).toEqual(m('bug.verdict.wrong', { v: 5 }));
    expect(bugVerdict(runBug(BUGS[1]).at(-1)!, BUGS[1])).toEqual(m('bug.verdict.crash'));
    expect(bugVerdict(runBug(BUGS[2]).at(-1)!, BUGS[2])).toEqual(m('bug.verdict.crash'));
  });
});

describe('挑战：网格数路线', () => {
  type D = ReturnType<typeof driver<GridGame, GridAction>>;
  const fill = (d: D, ok = true) => {
    const cur = gridCur(d.state)!;
    const v = gridTable(d.state.rocks)[cur[0]][cur[1]];
    return d.act({ type: 'fill', n: ok ? v : v + 1 });
  };
  const fresh = () => driver(gridRules, seeded(9));

  it('开局：4 × 5 的网格，两块石头在中间，第一行第一列已经有数；输入框问第一个要填的格子', () => {
    const d = fresh();
    expect(d.state.rocks).toHaveLength(GRID_ROWS);
    expect(d.state.rocks[0]).toHaveLength(GRID_COLS);
    expect(d.state.rocks.flat().filter(Boolean)).toHaveLength(2);
    expect(d.state).toMatchObject({ idx: 0, wrongs: 0, cellWrongs: 0, msg: null });
    expect(d.say).toBeNull();
    const cur = gridCur(d.state)!;
    expect(cur).toEqual(cellsToFill(d.state.rocks)[0]);
    const f = gridFilled(d.state);
    expect(f.has('0,0')).toBe(true);
    expect(f.has('2,0')).toBe(true);
    expect(f.has(cur.join(','))).toBe(false);
    const num = gridRules.controls(d.state)[0] as Extract<Control<GridAction>, { type: 'number' }>;
    expect(num).toMatchObject({ type: 'number', label: m('chal.cellQ', { r: cur[0] + 1, c: cur[1] + 1 }), placeholder: m('chal.cellPh'), submitLabel: m('chal.submit'), invalid: { type: 'empty' }, clearOn: 0 });
    expect(num.submit(7)).toEqual({ type: 'fill', n: 7 });
  });

  it('填对：下一格，提示清空，输入框清空（clearOn 变了）；没有声音', () => {
    const d = fresh();
    fill(d);
    expect(d.state).toMatchObject({ idx: 1, cellWrongs: 0, msg: null });
    expect((gridRules.controls(d.state)[0] as { clearOn: number }).clearOn).toBe(1);
    expect(d.sounds).toEqual([]);
  });

  it('填错：第一次让上面和左边两格闪光并提示看闪光的格子；第二次把算式讲出来；填对后闪光停', () => {
    const d = fresh();
    const [r, c] = gridCur(d.state)!;
    fill(d, false);
    expect(d.state).toMatchObject({ wrongs: 1, cellWrongs: 1, msg: m('chal.hint1'), idx: 0 });
    expect([...gridSources(d.state)].sort()).toEqual([(r - 1) + ',' + c, r + ',' + (c - 1)].sort());
    fill(d, false);
    expect(d.state.msg).toEqual(m('chal.hint2', { hint: cellHint(d.state.rocks, r, c) }));
    expect(d.state.wrongs).toBe(2);
    fill(d);
    expect(gridSources(d.state).size).toBe(0);
    expect(d.state.cellWrongs).toBe(0);
  });

  it('没填数字就点「填上」：提醒先填一个数字；填完了就没有输入框', () => {
    const d = fresh();
    d.act({ type: 'empty' });
    expect(d.state.msg).toEqual(m('chal.empty'));
    while (!gridDone(d.state)) fill(d);
    expect(d.act({ type: 'empty' })).toBe(false);
    expect(d.act({ type: 'fill', n: 1 })).toBe(false);
  });

  it('全填完：一路填对三颗星，标题讲右下角那格的路数；填错 3 次以内两颗、再多一颗；换一张地图再来', () => {
    const play = (mistakes: number) => {
      const d = fresh();
      let left = mistakes;
      while (!gridDone(d.state)) {
        if (left > 0) {
          fill(d, false);
          left--;
        }
        fill(d);
      }
      return d;
    };
    const d = play(0);
    const target = gridTable(d.state.rocks)[GRID_ROWS - 1][GRID_COLS - 1];
    expect(resultOf(gridRules, d.run)).toEqual({ stars: 3, title: m('chal.done', { target }), body: m('chal.body', { target }) });
    expect(resultOf(gridRules, play(3).run)!.stars).toBe(2);
    expect(resultOf(gridRules, play(4).run)!.stars).toBe(1);
    expect(buttons(gridRules.controls(d.state)).map((b) => b.label)).toEqual([m('chal.fresh')]);
    const before = d.state.rocks;
    d.act({ type: 'fresh' });
    expect(d.state).toMatchObject({ idx: 0, wrongs: 0, msg: null });
    expect(d.state.rocks).not.toBe(before);
    expect(gridRules.clickable(d.state)).toBe(false);
  });

  it('网格数的是对的：右下角路数大于 0，石头那格是 0', () => {
    for (let k = 0; k < 50; k++) {
      const d = driver(gridRules, seeded(k));
      const t = gridTable(d.state.rocks);
      expect(t[GRID_ROWS - 1][GRID_COLS - 1]).toBeGreaterThan(0);
      d.state.rocks.forEach((row, r) => row.forEach((rock, c) => rock && expect(t[r][c]).toBe(0)));
    }
    expect(KID_N).toBe(6);
  });
});
