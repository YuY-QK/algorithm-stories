import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { resultOf } from '../src/core/flows/game';
import type { Control } from '../src/core/types';
import {
  KID_MAZES, bugRules, challengeRules, challengeView, drawRules, drawView, parseMaze, pathTo, predictRules, ringsRules, ringsView, seeded,
  traceRules, waves, type ChallengeAction, type ChallengeState, type DrawAction, type DrawState, type RingsAction, type RingsState,
} from '../src/engine/bfs';
import { driver } from './helpers/game';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const tap = (id: number) => ({ type: 'tap' as const, id });

describe('玩法一「下一圈」', () => {
  const setup = (which = 0) => {
    const maze = parseMaze(KID_MAZES[which]);
    return { maze, wv: waves(maze), g: driver<RingsState, RingsAction>(ringsRules) };
  };
  it('开局：第 1 圈、说「走 1 步能到哪」，迷宫可以点', () => {
    const { g, wv } = setup();
    expect(g.say).toEqual(m('rings.start'));
    expect(g.state).toMatchObject({ which: 0, ring: 1, painted: [], misses: 0, done: false });
    expect(ringsRules.clickable(g.state)).toBe(true);
    expect(ringsView(g.state).total).toBe(wv.rings[1].length);
    expect(ringsRules.result!(g.state)).toBeNull();
    expect(ringsRules.controls(g.state)).toEqual([]);
  });

  it('点墙：墙摇头、出错音、说是墙、记一次错；点出界的远格子：上一圈透光、说要挨着、记一次错', () => {
    const { g, maze, wv } = setup();
    const wall = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => maze.rows[Math.floor(id / maze.w)][id % maze.w] === '#')!;
    g.act(tap(wall));
    expect(g.say).toEqual(m('rings.wall'));
    expect(g.state).toMatchObject({ misses: 1, shake: [wall, 1] });
    expect(g.sounds.at(-1)).toBe('wrong');
    const far = wv.rings[3][0];
    g.act(tap(far));
    expect(g.say).toEqual(m('rings.far', { k: 0 }));
    expect(g.state).toMatchObject({ misses: 2, shake: [far, 2], glow: wv.rings[0], glowKey: 1 });
    expect(g.sounds.at(-1)).toBe('wrong');
  });

  it('点已经亮过的格子：摇头、出错音，但不记错，说已经亮过了', () => {
    const { g, wv } = setup();
    const first = wv.rings[1][0];
    g.act(tap(first));
    g.act(tap(first));
    expect(g.say).toEqual(m('rings.painted'));
    expect(g.state.misses).toBe(0);
    expect(g.state.shake).toEqual([first, 1]);
    expect(g.sounds.at(-1)).toBe('wrong');
    // 起点和之前的圈也算已经亮过
    g.act(tap(wv.rings[0][0]));
    expect(g.say).toEqual(m('rings.painted'));
    expect(g.state.misses).toBe(0);
  });

  it('点对一格：说亮了几格、一共几格，出「对」音；涂满一圈进入下一圈，那一下不出音', () => {
    const { g, wv } = setup();
    const ring1 = wv.rings[1];
    g.act(tap(ring1[0]));
    expect(g.say).toEqual(m('rings.some', { n: 1, total: ring1.length }));
    expect(g.sounds.at(-1)).toBe('right');
    const before = g.sounds.length;
    for (const id of ring1.slice(1)) g.act(tap(id));
    expect(g.state).toMatchObject({ ring: 2, painted: [] });
    expect(g.say).toEqual(m('rings.ringDone', { k: 1 }));
    expect(g.sounds.length).toBe(before + ring1.length - 2); // 最后一格没出声
    expect(ringsView(g.state).total).toBe(wv.rings[2].length);
  });

  it('一路涂到奶酪：出「赢」音，小老鼠到奶酪，最短路亮起来，按点错次数给星星，只剩「换个迷宫」', () => {
    // 逐个迷宫涂完，涂完用「换个迷宫」走到下一个
    const g = driver<RingsState, RingsAction>(ringsRules);
    for (let which = 0; which < KID_MAZES.length; which++) {
      expect(g.state.which).toBe(which);
      const maze = parseMaze(KID_MAZES[which]);
      const w = waves(maze);
      for (let r = 1; r < w.rings.length; r++) {
        // 奶酪放在这一圈最后点，免得提前结束
        for (const id of [...w.rings[r].filter((x) => x !== maze.end), ...w.rings[r].filter((x) => x === maze.end)]) g.act(tap(id));
      }
      const k = w.rings.length - 1;
      expect(g.state.done).toBe(true);
      expect(g.sounds.at(-1)).toBe('win');
      expect(g.say).toEqual(m('rings.cheese', { k }));
      const v = ringsView(g.state);
      expect(v.mouse).toBe(maze.end);
      for (const id of pathTo(w, maze.end)) expect(v.tones[id]).toBe('path');
      expect(resultOf(ringsRules, g.run)).toEqual({ stars: 3, body: m('rings.win', { k }) });
      expect(ringsRules.clickable(g.state)).toBe(false);
      expect(g.act(tap(0))).toBe(false);
      expect(buttons(ringsRules.controls(g.state)).map((b) => b.label)).toEqual([m('rings.again')]);
      g.act({ type: 'again' });
    }
    expect(g.state.which).toBe(0); // 三个迷宫轮一圈
  });

  it('星星：点错 0～1 次三颗，2～4 次两颗，再多一颗', () => {
    const run = (misses: number) => {
      const { g, maze, wv } = setup();
      const wall = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => maze.rows[Math.floor(id / maze.w)][id % maze.w] === '#')!;
      for (let k = 0; k < misses; k++) g.act(tap(wall));
      for (let r = 1; r < wv.rings.length; r++) for (const id of wv.rings[r]) g.act(tap(id));
      return resultOf(ringsRules, g.run)!.stars;
    };
    expect([0, 1, 2, 4, 5].map(run)).toEqual([3, 3, 2, 2, 1]);
  });

  it('「换个迷宫再来」：换下一个迷宫，从第 1 圈重新开始，说开场白；没涂完时按钮不接受', () => {
    const { g, wv } = setup();
    expect(g.act({ type: 'again' })).toBe(false);
    for (let r = 1; r < wv.rings.length; r++) for (const id of wv.rings[r]) g.act(tap(id));
    expect(g.act({ type: 'again' })).toBe(true);
    expect(g.state).toMatchObject({ which: 1, ring: 1, painted: [], misses: 0, done: false });
    expect(g.say).toEqual(m('rings.start'));
  });
});

describe('玩法二「抄近路」', () => {
  const setup = () => {
    const g = driver<DrawState, DrawAction>(drawRules);
    const maze = parseMaze(KID_MAZES[g.state.which]);
    const wv = waves(maze, false);
    return { g, maze, wv, best: pathTo(wv, maze.end) };
  };

  it('开局：用第 2 个迷宫，只有起点，说点出去奶酪的路', () => {
    const { g, maze } = setup();
    expect(g.state).toMatchObject({ which: 1, path: [maze.start], done: false, numbers: false });
    expect(g.say).toEqual(m('draw.start'));
    expect(drawRules.controls(g.state)).toEqual([]);
  });

  it('点墙、点不挨着的格子：摇头、出错音，路不变；点挨着的格子：走一步，出「对」音', () => {
    const { g, maze, best } = setup();
    const wall = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => maze.rows[Math.floor(id / maze.w)][id % maze.w] === '#')!;
    g.act(tap(wall));
    expect(g.say).toEqual(m('draw.wall'));
    expect(g.state).toMatchObject({ path: [maze.start], shake: [wall, 1] });
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act(tap(maze.end));
    expect(g.say).toEqual(m('draw.far'));
    expect(g.state.shake).toEqual([maze.end, 2]);
    g.act(tap(best[1]));
    expect(g.state.path).toEqual([maze.start, best[1]]);
    expect(g.say).toEqual(m('draw.step', { s: 1 }));
    expect(g.sounds.at(-1)).toBe('right');
  });

  it('点回路上的格子：退回到那里，出「嗒」音；「退一步」按钮去掉最后一格，只剩起点时不接受', () => {
    const { g, maze, best } = setup();
    expect(g.act({ type: 'undo' })).toBe(false);
    for (const id of best.slice(1, 4)) g.act(tap(id));
    g.act(tap(best[1]));
    expect(g.state.path).toEqual(best.slice(0, 2));
    expect(g.say).toEqual(m('draw.back'));
    expect(g.sounds.at(-1)).toBe('tap');
    expect(g.act({ type: 'undo' })).toBe(true);
    expect(g.state.path).toEqual([maze.start]);
  });

  it('走最短路到奶酪：三颗星，说和水波一样近，出「赢」音，只有「换个迷宫」', () => {
    const { g, best } = setup();
    for (const id of best.slice(1)) g.act(tap(id));
    expect(g.state.done).toBe(true);
    expect(g.say).toEqual(m('draw.best', { s: best.length - 1 }));
    expect(g.sounds.at(-1)).toBe('win');
    expect(resultOf(drawRules, g.run)).toEqual({ stars: 3, body: undefined });
    expect(buttons(drawRules.controls(g.state)).map((b) => b.label)).toEqual([m('draw.nextBtn')]);
    expect(g.act({ type: 'undo' })).toBe(false);
    expect(g.act(tap(best[1]))).toBe(false);
    g.act({ type: 'next' });
    expect(g.state).toMatchObject({ which: 2, done: false });
    expect(g.say).toEqual(m('draw.next'));
  });

  it('绕远了：说水波只要几步，最短路亮出来，星星按多走的步数，给「再走一次」和「带着水波数字走」', () => {
    const { g, maze, wv, best } = setup();
    // 先往别的方向走再绕回去：用 BFS 距离不同的另一条路，这里直接找一条更长的路
    const longer = longWay(maze, best.length + 4)!;
    for (const id of longer.slice(1)) g.act(tap(id));
    const steps = longer.length - 1;
    expect(g.state.done).toBe(true);
    expect(g.say).toEqual(m('draw.longer', { s: steps, b: best.length - 1 }));
    const v = drawView(g.state);
    for (const id of best.slice(1, -1)) if (!longer.includes(id)) expect(v.tones[id]).toBe('path');
    expect(resultOf(drawRules, g.run)).toEqual({ stars: steps <= best.length + 1 ? 2 : 1, body: m('draw.body') });
    expect(buttons(drawRules.controls(g.state)).map((b) => b.label)).toEqual([m('draw.retryBtn'), m('draw.numBtn')]);
    g.act({ type: 'retry', numbers: true });
    expect(g.state).toMatchObject({ path: [maze.start], done: false, numbers: true });
    expect(g.say).toEqual(m('draw.retryNum'));
    const nv = drawView(g.state);
    wv.dist.forEach((d, id) => {
      if (d > 0) expect(nv.labels[id]).toBe(d);
    });
    // 还没走完时按钮不接受
    expect(g.act({ type: 'retry', numbers: false })).toBe(false);
    expect(g.state.numbers).toBe(true);
  });
});

/** 找一条从起点到奶酪、不重复格子、至少 len 格长的路（深度优先，够用就行） */
function longWay(maze: ReturnType<typeof parseMaze>, len: number): number[] | null {
  const out: number[] = [];
  const seen = new Set<number>();
  const dfs = (id: number): boolean => {
    out.push(id);
    seen.add(id);
    if (id === maze.end) {
      if (out.length >= len) return true;
    } else {
      const r = Math.floor(id / maze.w);
      const c = id % maze.w;
      for (const [dr, dc] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= maze.h || nc < 0 || nc >= maze.w || maze.rows[nr][nc] === '#' || seen.has(nr * maze.w + nc)) continue;
        if (dfs(nr * maze.w + nc)) return true;
      }
    }
    out.pop();
    seen.delete(id);
    return false;
  };
  return dfs(maze.start) ? out : null;
}

describe('挑战：11×11 的迷宫', () => {
  const setup = (seed = 3) => {
    const g = driver<ChallengeState, ChallengeAction>(challengeRules, seeded(seed));
    return { g, v: () => challengeView(g.state) };
  };

  it('开局：11×11 的新迷宫，没有台词；不可能一步到奶酪', () => {
    const { g, v } = setup();
    expect(g.say).toBeNull();
    expect(v().maze.w).toBe(11);
    expect(g.state).toMatchObject({ phase: 'play', wins: 0, hint: null });
    expect(g.state.path).toEqual([v().maze.start]);
    expect(challengeRules.clickable(g.state)).toBe(true);
    expect(challengeRules.result!(g.state)).toBeNull();
  });

  it('点墙、点不挨着的格子：摇头，给提示，路不变；走对一步提示就消失', () => {
    const { g, v } = setup();
    const { maze } = v();
    const wall = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => maze.rows[Math.floor(id / maze.w)][id % maze.w] === '#')!;
    g.act(tap(wall));
    expect(g.state).toMatchObject({ hint: m('chal.wall'), shake: [wall, 1] });
    g.act(tap(maze.end));
    expect(g.state).toMatchObject({ hint: m('chal.far'), shake: [maze.end, 2] });
    expect(g.state.path).toEqual([maze.start]);
    const best = pathTo(waves(maze), maze.end);
    g.act(tap(best[1]));
    expect(g.state.hint).toBeNull();
    expect(g.state.path).toEqual(best.slice(0, 2));
    // 点回路上的格子退回
    g.act(tap(maze.start));
    expect(g.state.path).toEqual([maze.start]);
  });

  it('走最短路：成功，过关次数加一，亮出最短路，只有「再来一局」；再来一局换新迷宫，过关次数保留', () => {
    const { g, v } = setup();
    const first = v().maze.rows;
    const best = pathTo(waves(v().maze), v().maze.end);
    for (const id of best.slice(1)) g.act(tap(id));
    expect(g.state).toMatchObject({ phase: 'win', wins: 1 });
    const r = resultOf(challengeRules, g.run)!;
    expect(r.title).toEqual(m('chal.win', { s: best.length - 1 }));
    expect(buttons(challengeRules.controls(g.state)).map((b) => b.label)).toEqual([m('chal.again')]);
    expect(v().tones[best[3]]).toBe('mine');
    expect(challengeRules.clickable(g.state)).toBe(false);
    expect(g.act(tap(best[1]))).toBe(false);
    g.act({ type: 'fresh' });
    expect(g.state).toMatchObject({ phase: 'play', wins: 1 });
    expect(g.state.rows).not.toEqual(first);
  });

  it('绕远了：失败，告诉最短几步；可以同一个迷宫再走一次（过关次数不加），或换迷宫', () => {
    // 找一个有绕远路可走的迷宫
    let seed = 3;
    let found = setup(seed);
    while (!longWay(found.v().maze, pathTo(waves(found.v().maze), found.v().maze.end).length + 2)) found = setup(++seed);
    const { g, v } = found;
    const { maze } = v();
    const best = pathTo(waves(maze), maze.end);
    const longer = longWay(maze, best.length + 2)!;
    for (const id of longer.slice(1)) g.act(tap(id));
    expect(g.state).toMatchObject({ phase: 'lose', wins: 0 });
    expect(resultOf(challengeRules, g.run)!.title).toEqual(m('chal.lose', { s: longer.length - 1, b: best.length - 1 }));
    expect(buttons(challengeRules.controls(g.state)).map((b) => b.label)).toEqual([m('chal.retry'), m('chal.fresh')]);
    expect(Object.values(v().tones)).toContain('best');
    g.act({ type: 'retry' });
    expect(g.state).toMatchObject({ phase: 'play', path: [maze.start], rows: maze.rows });
    expect(g.act({ type: 'retry' })).toBe(false);
  });
});

describe('猜下一步', () => {
  it('每道题：每次出队一问，答案是入队的格子（从小到大）或「end」；最后一问之后是结局', () => {
    const rand = seeded(11);
    for (let k = 0; k < 100; k++) {
      const p = predictRules.puzzle(rand);
      expect(p.asks.length).toBeGreaterThan(0);
      p.asks.forEach((a, i) => {
        expect(a.kind).toBe('pick');
        expect(a.chips).toEqual([[m('predict.chipName'), m('predict.chip', { n: i + 1 })]]);
        expect(a.answer === 'end' ? a.view.pushed : a.answer.split(',').filter(Boolean).map(Number)).toEqual(a.answer === 'end' ? [] : a.view.pushed.slice().sort((x, y) => x - y));
        expect(a.view.queue[0]).toBe(a.view.cur);
      });
      expect(p.end.view).toBe(p.asks.at(-1)!.view);
    }
  });

  it('答对：连对加一，换下一问；答错：连对清零，讲四个方向，看完继续下一问', () => {
    const rand = seeded(5);
    const p = predictRules.puzzle(rand);
    let s = pr.startPredict(p, predictRules.goal);
    const out = pr.answer(s, p.asks[0].answer)!;
    expect(out.state).toMatchObject({ streak: 1, i: 1, phase: p.asks.length > 1 ? 'ask' : 'end' });
    s = pr.startPredict(p, predictRules.goal);
    const bad = pr.answer(s, p.asks[0].answer === 'end' ? 'x' : 'end')!;
    expect(bad.state.phase).toBe('wrong');
    expect(bad.sound).toBe('wrong');
    expect(pr.viewOf(bad.state).wrong).toEqual(p.asks[0].why);
    // 点错时 picked 是答的内容，画面据此把点错的格子标出来
    expect(bad.state.picked).toBe(p.asks[0].answer === 'end' ? 'x' : 'end');
  });

  it('全部答对：连对 5 次过关', () => {
    const rand = seeded(9);
    let s = pr.startPredict(predictRules.puzzle(rand), predictRules.goal);
    for (let guard = 0; guard < 200 && !s.passed; guard++) {
      if (s.phase === 'end') s = pr.nextPuzzle(s, predictRules.puzzle(rand));
      s = pr.answer(s, s.puzzle.asks[s.i].answer)!.state;
    }
    expect(s.passed).toBe(true);
  });
});

describe('逐步执行、找 bug 的规则', () => {
  it('逐步执行：切换迷宫就是换一份输入；跳转按钮停在下一次出队；播完有总结', () => {
    const rules = traceRules;
    const input = rules.act(rules.start(), { type: 'which', which: 3 });
    const steps = rules.trace(input);
    expect(rules.summary!(input, steps.at(-1)!)).toEqual(m('trace.sumNo', { n: steps.at(-1)!.visited.filter(Boolean).length }));
    expect(rules.summary!(input, steps[0])).toBeNull();
    const pop = steps.findIndex((x) => rules.jump!.stop(x, steps[0]));
    expect(steps[pop].line).toBe(11);
  });

  it('找 bug：每个坑有两个跳转按钮（下一次出队、跳到结尾），输入那一行说明期望', () => {
    expect(bugRules.jumps).toHaveLength(2);
    for (const b of bugRules.bugs) {
      expect(bugRules.input(b)).toEqual(m('bug.input', { expect: b.expect }));
      const steps = bugRules.run(b);
      expect(steps.findIndex((x) => bugRules.jumps![1].stop(x))).toBe(steps.length - 1);
      expect(bugRules.verdict(steps.at(-1)!, b)).not.toBeNull();
    }
  });
});
