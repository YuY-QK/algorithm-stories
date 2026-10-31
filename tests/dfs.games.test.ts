import { describe, expect, it } from 'vitest';
import { m } from '../src/core/i18n';
import * as pr from '../src/core/flows/predict';
import { resultOf } from '../src/core/flows/game';
import { FILL_END, FILL_STEP } from '../src/core/timing';
import type { Control } from '../src/core/types';
import {
  BACK, ISLAND_MAPS, PLAY_MAZES, around, bugRules, challengeRules, challengeView, exploreRules, exploreView, expectedChoice, floodFill, islands,
  islandsRules, islandsView, isLand, isWall, parseIslands, parseMaze, predictRules, seeded, traceRules, visitOrder,
  type ChallengeAction, type ChallengeState, type Choice, type ExploreAction, type ExploreState, type IslandsAction, type IslandsState,
} from '../src/engine/dfs';
import { driver } from './helpers/game';

type Button<A> = Extract<Control<A>, { type: 'button' }>;
const buttons = <A>(cs: Control<A>[]) => cs.filter((c): c is Button<A> => c.type === 'button');
const go = (c: Choice): ExploreAction => ({ type: 'choose', c });

describe('玩法一「下一步往哪走」', () => {
  const setup = () => {
    const g = driver<ExploreState, ExploreAction>(exploreRules);
    return { g, maze: parseMaze(PLAY_MAZES[0]) };
  };
  /** 一路按规则走完，返回走的步数 */
  function solve(g: ReturnType<typeof driver<ExploreState, ExploreAction>>) {
    for (let guard = 0; guard < 200 && !g.state.done; guard++) {
      const mz = parseMaze(PLAY_MAZES[g.state.which]);
      g.act(go(expectedChoice(mz, g.state.visited, g.state.path.at(-1)!)));
    }
  }

  it('开局：说按 ①②③④ 的顺序走，探险家在起点，起点有面包屑；没有按钮', () => {
    const { g, maze } = setup();
    expect(g.say).toEqual(m('explore.start'));
    expect(g.state).toMatchObject({ which: 0, path: [maze.start], misses: 0, steps: 0, backs: 0, done: false });
    expect(g.state.visited[maze.start]).toBe(true);
    expect(exploreRules.controls(g.state)).toEqual([]);
    expect(exploreRules.result!(g.state)).toBeNull();
  });

  it('往洞外走：说已经是洞外，方向键晃一下，出错音，记一次错；格子不晃', () => {
    const { g } = setup();
    g.act(go(0)); // 起点在左上角，上边出界
    expect(g.say).toEqual(m('explore.wallOut', { dir: m('dir.0') }));
    expect(g.state).toMatchObject({ misses: 1, padShake: [0, 1], shake: null, path: g.state.path });
    expect(g.sounds.at(-1)).toBe('wrong');
  });

  it('往岩石、往面包屑走：对应的格子晃一下、方向键晃一下，各说各的话', () => {
    const { g, maze } = setup();
    g.act(go(1)); // 往右走到 (0,1)，那里是死路：右边是岩石，左边是面包屑
    const here = g.state.path.at(-1)!;
    g.act(go(1));
    const rock = around(maze, here)[1]!;
    expect(isWall(maze, rock)).toBe(true);
    expect(g.say).toEqual(m('explore.wall', { dir: m('dir.1') }));
    expect(g.state).toMatchObject({ shake: [rock, 1], padShake: [1, 1], misses: 1 });
    g.act(go(3));
    expect(g.say).toEqual(m('explore.crumb', { dir: m('dir.3') }));
    expect(g.state).toMatchObject({ shake: [maze.start, 2], padShake: [3, 2], misses: 2 });
    expect(g.sounds.slice(-2)).toEqual(['wrong', 'wrong']);
  });

  it('选了排在后面的方向：该走的方向键和格子透出光，说先走前面那个', () => {
    const { g, maze } = setup();
    g.act(go(2)); // 起点右边（②）和下边（③）都能走，下边排在后面
    expect(g.say).toEqual(m('explore.skip', { dir: m('dir.2'), better: m('dir.1') }));
    expect(g.state).toMatchObject({ misses: 1, padShake: [2, 1], padGlow: [1, 1], glow: [around(maze, maze.start)[1]], glowKey: 1, path: [maze.start] });
    expect(g.sounds.at(-1)).toBe('wrong');
  });

  it('还有路可走却点了「退回」：说不用退回，能走的方向透出光', () => {
    const { g, maze } = setup();
    g.act(go(BACK));
    expect(g.say).toEqual(m('explore.notBack', { better: m('dir.1') }));
    expect(g.state).toMatchObject({ misses: 1, padShake: [BACK, 1], padGlow: [1, 1], glow: [around(maze, maze.start)[1]] });
  });

  it('走对一步：撒面包屑、出「对」音；走进死路时说怎么办，「退回」键闪光；退回后说换下一个方向', () => {
    const { g, maze } = setup();
    expect(exploreView(g.state).stuck).toBe(false);
    g.act(go(1));
    expect(g.say).toEqual(m('explore.dead', { dir: m('dir.1') }));
    expect(g.state).toMatchObject({ steps: 1, backs: 0, misses: 0 });
    expect(g.state.visited[g.state.path.at(-1)!]).toBe(true);
    expect(g.sounds.at(-1)).toBe('right');
    expect(exploreView(g.state).stuck).toBe(true);
    g.act(go(BACK));
    expect(g.state).toMatchObject({ path: [maze.start], steps: 2, backs: 1 });
    expect(g.say).toEqual(m('explore.backFork'));
    expect(exploreView(g.state).stuck).toBe(false);
    g.act(go(2)); // 回到路口，右边已经有面包屑，轮到下边
    expect(g.say).toEqual(m('explore.go', { dir: m('dir.2') }));
  });

  it('连退两步的话：路口也没路了，说再退一步', () => {
    // 第二个山洞：从起点一直走进死路，再退
    const g = driver<ExploreState, ExploreAction>(exploreRules);
    solve(g);
    g.act({ type: 'again' });
    const mz = parseMaze(PLAY_MAZES[g.state.which]);
    // 一路按规则走，遇到「退回」后紧接着还要退回的，说法是 backAgain
    const said: string[] = [];
    for (let guard = 0; guard < 200 && !g.state.done; guard++) {
      const c = expectedChoice(mz, g.state.visited, g.state.path.at(-1)!);
      g.act(go(c));
      if (c === BACK) said.push(g.say!.key);
    }
    expect(said.every((k) => k === 'explore.backAgain' || k === 'explore.backFork')).toBe(true);
  });

  it('走到宝藏：出「赢」音，说找到宝藏，三颗星，结算里有一段说回溯的话，只剩「换个山洞再来」', () => {
    const { g } = setup();
    solve(g);
    expect(g.state.done).toBe(true);
    expect(g.say).toEqual(m('explore.found'));
    expect(g.sounds.at(-1)).toBe('win');
    // 走到宝藏那一步不出「对」音
    expect(g.sounds.slice(-2)).not.toContain('right-after-win');
    const r = resultOf(exploreRules, g.run)!;
    expect(r.stars).toBe(3);
    expect(r.art).toEqual({
      scene: 'Note',
      props: { before: m('explore.winA', { steps: g.state.steps, backs: g.state.backs }), bold: m('explore.winB'), after: m('explore.winC') },
    });
    expect(buttons(exploreRules.controls(g.state)).map((b) => b.label)).toEqual([m('explore.again')]);
    expect(g.act(go(1))).toBe(false);
  });

  it('星星：点错 0～2 次三颗，3～6 次两颗，再多一颗', () => {
    const stars = (misses: number) => {
      const { g } = setup();
      for (let k = 0; k < misses; k++) g.act(go(0));
      solve(g);
      return resultOf(exploreRules, g.run)!.stars;
    };
    expect([0, 2, 3, 6, 7].map(stars)).toEqual([3, 3, 2, 2, 1]);
  });

  it('「换个山洞再来」：换下一个山洞，重新开始；没走完时不接受；三个山洞轮一圈', () => {
    const { g } = setup();
    expect(g.act({ type: 'again' })).toBe(false);
    for (let k = 1; k <= PLAY_MAZES.length; k++) {
      solve(g);
      expect(g.state.done).toBe(true);
      g.act({ type: 'again' });
      expect(g.state).toMatchObject({ which: k % PLAY_MAZES.length, misses: 0, steps: 0, backs: 0, done: false });
      expect(g.say).toEqual(m('explore.start'));
    }
  });
});

describe('玩法二「数一数小岛」', () => {
  const map = (which = 0) => parseIslands(ISLAND_MAPS[which]);
  const landOf = (which: number, k: number) => islands(map(which))[k][0];
  const seaOf = (which: number) => Array.from({ length: 36 }, (_, id) => id).find((id) => !isLand(map(which), id))!;
  const setup = () => driver<IslandsState, IslandsAction>(islandsRules);
  const tap = (id: number): IslandsAction => ({ type: 'tap', id });
  /** 点第 k 座岛并等它涂完 */
  function paint(g: ReturnType<typeof setup>, k: number) {
    g.act(tap(landOf(g.state.which, k)));
    g.settle();
  }

  it('开局：说点一块陆地，没有按钮，海图可以点', () => {
    const g = setup();
    expect(g.say).toEqual(m('islands.start'));
    expect(g.state).toMatchObject({ which: 0, painted: [], filling: null, misses: 0, phase: 'pick', wrongNum: null });
    expect(islandsRules.clickable(g.state)).toBe(true);
    expect(islandsRules.controls(g.state)).toEqual([]);
  });

  it('点到海：海格晃一下、出错音、记一次错，说点灰色的陆地', () => {
    const g = setup();
    const sea = seaOf(0);
    g.act(tap(sea));
    expect(g.say).toEqual(m('islands.sea'));
    expect(g.state).toMatchObject({ misses: 1, shake: [sea, 1], filling: null });
    expect(g.sounds.at(-1)).toBe('wrong');
  });

  it('点一块陆地：出「嗒」音，探险家一格一格涂整座岛（顺序就是洪水填充的访问顺序），涂完出「对」音', () => {
    const g = setup();
    const start = landOf(0, 0);
    const cells = floodFill(map(0), start);
    g.act(tap(start));
    expect(g.say).toEqual(m('islands.fill', { n: cells.length }));
    expect(g.sounds.at(-1)).toBe('tap');
    expect(g.state.filling).toEqual({ cells, lit: 0 });
    expect(islandsRules.clickable(g.state)).toBe(false);
    expect(g.act(tap(landOf(0, 1)))).toBe(false); // 涂的时候不能再点
    g.tick();
    expect(g.state.filling!.lit).toBe(1);
    expect(islandsView(g.state).emojis).toEqual({ [cells[0]]: '🧭' });
    g.settle();
    // 每格一个节拍，最后一格之后多停一会儿
    expect(g.afters).toEqual([...Array(cells.length).fill(FILL_STEP), FILL_END]);
    expect(g.state.painted).toEqual([cells]);
    expect(g.state.filling).toBeNull();
    expect(g.say).toEqual(m('islands.oneDone', { k: 1 }));
    expect(g.sounds.at(-1)).toBe('right');
    expect(islandsView(g.state).labels).toEqual({ [cells[0]]: 1 });
    expect(islandsRules.clickable(g.state)).toBe(true);
  });

  it('点已经涂过的岛：那座岛透光、出错音，但不记错', () => {
    const g = setup();
    paint(g, 0);
    const again = landOf(0, 0);
    g.act(tap(again));
    expect(g.say).toEqual(m('islands.done'));
    expect(g.state).toMatchObject({ misses: 0, glow: g.state.painted[0], glowKey: 1 });
    expect(g.sounds.at(-1)).toBe('wrong');
  });

  it('涂到一半切标签：这座岛按没点过算，回到「点陆地」，说开场白', () => {
    const g = setup();
    g.act(tap(landOf(0, 0)));
    g.tick();
    g.interrupt();
    expect(g.state.filling).toBeNull();
    expect(g.state.painted).toEqual([]);
    expect(g.say).toEqual(m('islands.start'));
    expect(islandsRules.clickable(g.state)).toBe(true);
  });

  it('涂完所有的岛：进入数岛，说一共有几座；给三个数字（真实答案前后各一个）', () => {
    const g = setup();
    const total = islands(map(0)).length;
    for (let k = 0; k < total; k++) paint(g, k);
    expect(g.state.phase).toBe('count');
    expect(g.say).toEqual(m('islands.allDone'));
    expect(islandsRules.clickable(g.state)).toBe(false);
    expect(islandsView(g.state).choices).toEqual([total - 1, total, total + 1]);
  });

  it('数错：数字晃一下、出错音、记一次错，说数颜色；数对：出「赢」音、说对啦、给星星和一段说深度优先的话', () => {
    const g = setup();
    const total = islands(map(0)).length;
    for (let k = 0; k < total; k++) paint(g, k);
    g.act({ type: 'count', n: total + 1 });
    expect(g.say).toEqual(m('islands.notN', { n: total + 1 }));
    expect(g.state).toMatchObject({ misses: 1, wrongNum: [total + 1, 1], phase: 'count' });
    expect(g.sounds.at(-1)).toBe('wrong');
    g.act({ type: 'count', n: total });
    expect(g.state.phase).toBe('won');
    expect(g.say).toEqual(m('islands.right', { n: total }));
    expect(g.sounds.at(-1)).toBe('win');
    const r = resultOf(islandsRules, g.run)!;
    expect(r.stars).toBe(3);
    expect(r.art).toEqual({ scene: 'Note', props: { before: m('islands.winA'), bold: m('islands.winB'), after: m('islands.winC') } });
    expect(buttons(islandsRules.controls(g.state)).map((b) => b.label)).toEqual([m('islands.again')]);
    expect(g.act({ type: 'count', n: total })).toBe(false);
  });

  it('「换一张海图再来」：换下一张海图重新开始，三张轮一圈；没数完时不接受', () => {
    const g = setup();
    expect(g.act({ type: 'again' })).toBe(false);
    for (let w = 0; w < ISLAND_MAPS.length; w++) {
      const total = islands(map(w)).length;
      for (let k = 0; k < total; k++) paint(g, k);
      g.act({ type: 'count', n: total });
      expect(g.act({ type: 'again' })).toBe(true);
      expect(g.state).toMatchObject({ which: (w + 1) % ISLAND_MAPS.length, painted: [], phase: 'pick', misses: 0 });
      expect(g.say).toEqual(m('islands.start'));
    }
  });
});

describe('挑战：DFS 的第 k 个格子', () => {
  const setup = (seed = 4) => driver<ChallengeState, ChallengeAction>(challengeRules, seeded(seed));
  const tap = (id: number): ChallengeAction => ({ type: 'tap', id });

  it('开局：9×9 的山洞，k 在 5 到 14 之间，没有台词，可以点格子，只有「提示」按钮', () => {
    const g = setup();
    const v = challengeView(g.state);
    expect(g.say).toBeNull();
    expect([v.maze.w, v.maze.h]).toEqual([9, 9]);
    expect(g.state.k).toBeGreaterThanOrEqual(5);
    expect(g.state.k).toBeLessThanOrEqual(14);
    expect(challengeRules.clickable(g.state)).toBe(true);
    const bs = buttons(challengeRules.controls(g.state));
    expect(bs.map((b) => b.label)).toEqual([m('chal.hint', { n: Math.ceil((g.state.k - 1) / 2) })]);
    expect(bs[0].disabled).toBe(false);
  });

  it('提示：亮出 DFS 的前一半，按钮变灰；答完以后亮出前 k 个', () => {
    const g = setup();
    const v = challengeView(g.state);
    expect(Object.keys(v.labels)).toHaveLength(0);
    g.act({ type: 'hint' });
    const hinted = challengeView(g.state);
    expect(Object.keys(hinted.labels)).toHaveLength(v.hintCount);
    expect(Object.values(hinted.labels).sort((a, b) => a - b)).toEqual(Array.from({ length: v.hintCount }, (_, i) => i + 1));
    expect(buttons(challengeRules.controls(g.state))[0].disabled).toBe(true);
    expect(g.act({ type: 'hint' })).toBe(false);
  });

  it('点岩石：晃一下并提示，不算答题；之后点别的格子提示消失', () => {
    const g = setup();
    const { maze } = challengeView(g.state);
    const rock = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => isWall(maze, id))!;
    g.act(tap(rock));
    expect(g.state).toMatchObject({ phase: 'ask', hint: m('chal.rock'), shake: [rock, 1], picked: null });
    const wrong = Array.from({ length: maze.w * maze.h }, (_, id) => id).find((id) => !isWall(maze, id) && id !== challengeView(g.state).target)!;
    g.act(tap(wrong));
    expect(g.state.hint).toBeNull();
  });

  it('点对：答对次数加一，亮出前 k 个，标出 BFS 的第 k 个，结算有标题、说明、两种访问个数；可以同一个山洞换一题或换山洞', () => {
    const g = setup();
    const v = challengeView(g.state);
    g.act(tap(v.target));
    expect(g.state).toMatchObject({ phase: 'right', wins: 1, picked: v.target });
    const after = challengeView(g.state);
    expect(after.tones[v.target]).toBe('best');
    expect(after.tones[v.bfsTarget]).toBe(v.bfsTarget === v.target ? 'best' : 'nb');
    expect(Object.keys(after.labels)).toHaveLength(g.state.k);
    const r = resultOf(challengeRules, g.run)!;
    expect(r.title).toEqual(m('chal.right', { k: g.state.k, c: v.targetCoord }));
    expect(r.body).toEqual(m('chal.rightBody', { k: g.state.k, c: v.bfsCoord, same: m(v.bfsTarget === v.target ? 'chal.same' : 'chal.differ') }));
    expect(r.art).toEqual({ scene: 'Note', props: { before: m('chal.count', { dfs: v.dfsOrder.length, bfs: v.bfsOrder.length }), small: true } });
    expect(buttons(challengeRules.controls(g.state)).map((b) => b.label)).toEqual([m('chal.sameCave'), m('chal.newCave')]);
    expect(challengeRules.clickable(g.state)).toBe(false);
    expect(g.act(tap(v.target))).toBe(false);
    // 同一个山洞换一题
    const rows = g.state.rows;
    g.act({ type: 'again', newMaze: false });
    expect(g.state).toMatchObject({ phase: 'ask', hinted: false, picked: null, wins: 1, rows });
    // 换山洞
    g.act(tap(challengeView(g.state).target));
    g.act({ type: 'again', newMaze: true });
    expect(g.state.rows).not.toEqual(rows);
    expect(g.state).toMatchObject({ phase: 'ask', wins: 2 });
  });

  it('点错：不加答对次数，说 DFS 的第 k 个是哪一格；点中的恰好是 BFS 的第 k 个时讲两种顺序的不同', () => {
    let seen = { bfs: false, other: false };
    for (let seed = 1; seed < 200 && !(seen.bfs && seen.other); seed++) {
      const g = setup(seed);
      const v = challengeView(g.state);
      const choice = !seen.bfs && v.bfsTarget !== v.target ? v.bfsTarget : Array.from({ length: 81 }, (_, id) => id).find((id) => !isWall(v.maze, id) && id !== v.target && id !== v.bfsTarget)!;
      g.act(tap(choice));
      expect(g.state).toMatchObject({ phase: 'wrong', wins: 0, picked: choice });
      const r = resultOf(challengeRules, g.run)!;
      expect(r.title).toEqual(m('chal.wrong', { k: g.state.k, c: v.targetCoord }));
      const pickedBfs = choice === v.bfsTarget;
      expect(r.body).toEqual(m('chal.wrongBody', { k: g.state.k, who: m(pickedBfs ? 'chal.pickedBfs' : 'chal.otherBfs', { k: g.state.k }) }));
      expect(challengeView(g.state).tones[choice]).toBe('miss'); // 点错的格子用警示色，盖在 BFS 的粗框上
      seen = { bfs: seen.bfs || pickedBfs, other: seen.other || !pickedBfs };
    }
    expect(seen).toEqual({ bfs: true, other: true });
  });

  it('第 k 个格子就是 DFS 访问顺序里的第 k 个', () => {
    for (let seed = 0; seed < 30; seed++) {
      const g = setup(seed);
      expect(challengeView(g.state).target).toBe(visitOrder(parseMaze(g.state.rows), 'dfs')[g.state.k - 1]);
    }
  });
});

describe('猜下一步', () => {
  const rand = seeded(23);
  const puzzles = Array.from({ length: 80 }, () => predictRules.puzzle(rand));

  it('每次站稳一题：往前走问一次（答案是格子），死路问一次（答案是「回溯」），回溯到路口还要再问一次；宝藏答案是「end」；最后是结局', () => {
    let two = 0;
    for (const p of puzzles) {
      p.asks.forEach((a, i) => {
        expect(a.kind).toBe('pick');
        expect(a.options ?? []).toHaveLength(a.view.back ? 0 : 2);
        if (a.answer === 'back') {
          const next = p.asks[i + 1];
          if (a.half) {
            two++;
            expect(next.view.back).toBe(true);
            expect(typeof next.answer).toBe('number');
            expect(next.view.path).toContain(next.answer);
            expect(a.praise).toBeUndefined();
            expect(next.praise).toBeDefined();
          } else expect(a.praise).toBeDefined();
        } else expect(a.praise).toBeDefined();
      });
      expect(p.end.view.back).toBe(false);
    }
    expect(two).toBeGreaterThan(20);
  });

  it('前半问答对不算连对、不出声，直接问第二问；第二问答对才连对加一，并留下一句「✅」；答错清掉', () => {
    const p = puzzles.find((x) => x.asks.some((a) => a.half))!;
    const i = p.asks.findIndex((a) => a.half);
    let s = pr.startPredict(p, predictRules.goal);
    // 先把前面的问答对
    for (let k = 0; k < i; k++) s = pr.answer(s, p.asks[k].answer)!.state;
    const streak = s.streak;
    const half = pr.answer(s, 'back')!;
    expect(half.sound).toBeUndefined();
    expect(half.state).toMatchObject({ i: i + 1, phase: 'ask', streak });
    expect(pr.viewOf(half.state).view.back).toBe(true);
    const full = pr.answer(half.state, p.asks[i + 1].answer)!;
    expect(full.state.streak).toBe(streak + 1);
    expect(pr.viewOf(full.state).praise).toEqual(p.asks[i + 1].praise);
    // 前半问答错：跳过第二问，清掉那句话
    const bad = pr.answer(s, 'end')!;
    expect(bad.state.phase).toBe('wrong');
    expect(pr.viewOf(bad.state).wrong).toEqual(p.asks[i].why);
    expect(pr.viewOf(bad.state).praise).toBeNull();
    const after = pr.proceed(bad.state)!;
    expect(after.i).toBe(i + 2 < p.asks.length ? i + 2 : p.asks.length);
  });

  it('选项「回溯」和「是宝藏」可以点，点格子是 pick；第二问不给选项', () => {
    const p = puzzles.find((x) => x.asks.some((a) => a.half))!;
    const i = p.asks.findIndex((a) => a.half);
    let s = pr.startPredict(p, predictRules.goal);
    for (let k = 0; k < i; k++) s = pr.answer(s, p.asks[k].answer)!.state;
    expect(pr.viewOf(s).options?.map((o) => o.value)).toEqual(['back', 'end']);
    expect(pr.viewOf(s).pickable).toBe(true);
    s = pr.answer(s, 'back')!.state;
    expect(pr.viewOf(s).options).toBeNull();
    expect(pr.viewOf(s).pickable).toBe(true);
  });

  it('全部答对：连对 5 次过关', () => {
    let s = pr.startPredict(puzzles[0], predictRules.goal);
    for (let guard = 0; guard < 200 && !s.passed; guard++) {
      if (s.phase === 'end') s = pr.nextPuzzle(s, predictRules.puzzle(rand));
      s = pr.answer(s, s.puzzle.asks[s.i].answer)!.state;
    }
    expect(s.passed).toBe(true);
  });
});

describe('逐步执行、找 bug 的规则', () => {
  it('逐步执行：两个跳转按钮（下一个新格子、下一次回溯）；播完才有总结', () => {
    const input = traceRules.start();
    const steps = traceRules.trace(input);
    expect(traceRules.summary!(input, steps[0])).toBeNull();
    expect(traceRules.summary!(input, steps.at(-1)!)).not.toBeNull();
    expect(steps[steps.findIndex((x) => traceRules.jump!.stop(x, steps[0]))].line).toBe(12);
    expect(steps[steps.findIndex((x) => traceRules.jumps![0].stop(x, steps[0]))].line).toBe(17);
  });

  it('找 bug：两个跳转按钮（下一个新格子、跳到结尾）', () => {
    expect(bugRules.jumps).toHaveLength(2);
    for (const b of bugRules.bugs) {
      const steps = bugRules.run(b);
      expect(steps.findIndex((x) => bugRules.jumps![1].stop(x))).toBe(steps.length - 1);
      expect(bugRules.input(b)).toEqual(m('bug.input', { expect: b.expect }));
    }
  });
});
