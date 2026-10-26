import { describe, expect, it } from 'vitest';
import {
  BACK, BUGS, CODE, DIRS, ISLAND_MAPS, KID_MAZES, L, PLAY_MAZES, STACK_LIMIT, TRACE_MAZES,
  around, bestSteps, bugVerdict, buildTrace, challengeK, genChallenge, genPredict, lookFrames, PREDICT_ROOMS, countIslands, expectedChoice, floodFill, genMaze, islandChoices, islands,
  isLand, isWall, judgeChoice, judgeIslandTap, neighbors, openCount, parseIslands, parseMaze, reachable, rounds,
  routeOf, runBug, seeded, shortestRoute, tour, visitOrder, walkedSteps, type Choice, type Maze,
} from '../src/engine/dfs';

function randomGrid(rand: () => number): string[] {
  const h = 1 + Math.floor(rand() * 7);
  const w = 2 + Math.floor(rand() * 7);
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, (): string => (rand() < 0.3 ? '#' : '.')));
  const a = Math.floor(rand() * h * w);
  let b = a;
  while (b === a) b = Math.floor(rand() * h * w);
  cells[Math.floor(a / w)][a % w] = 'S';
  cells[Math.floor(b / w)][b % w] = 'E';
  return cells.map((r) => r.join(''));
}

function randomIslands(rand: () => number): string[] {
  const h = 1 + Math.floor(rand() * 7);
  const w = 1 + Math.floor(rand() * 7);
  return Array.from({ length: h }, () => Array.from({ length: w }, () => (rand() < 0.45 ? '1' : '0')).join(''));
}

/** 笨办法：反复扩张，直到不再变化 */
function slowReach(m: Maze): Set<number> {
  const got = new Set<number>([m.start]);
  for (let changed = true; changed;) {
    changed = false;
    for (const id of [...got]) {
      for (const nb of neighbors(m, id)) {
        if (!got.has(nb)) {
          got.add(nb);
          changed = true;
        }
      }
    }
  }
  return got;
}

/** 笨办法：并查集数岛 */
function slowIslands(rows: string[]): number {
  const h = rows.length;
  const w = rows[0].length;
  const parent = Array.from({ length: h * w }, (_, k) => k);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (rows[r][c] !== '1') continue;
      if (c + 1 < w && rows[r][c + 1] === '1') parent[find(r * w + c)] = find(r * w + c + 1);
      if (r + 1 < h && rows[r + 1][c] === '1') parent[find(r * w + c)] = find((r + 1) * w + c);
    }
  }
  const roots = new Set<number>();
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (rows[r][c] === '1') roots.add(find(r * w + c));
  return roots.size;
}

const rand = seeded(20261024);
const GRIDS = Array.from({ length: 1000 }, () => randomGrid(rand));

describe('DFS 看、玩：探险家的行程', () => {
  it('每一步都合法：往前走挨着、没面包屑；退回就是栈弹出；路径始终是一条连着的路', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const moves = tour(m);
      expect(moves[0].kind).toBe('start');
      expect(moves[0].path).toEqual([m.start]);
      for (let k = 1; k < moves.length; k++) {
        const prev = moves[k - 1];
        const mv = moves[k];
        if (mv.kind === 'go') {
          expect(around(m, prev.cell)[mv.dir]).toBe(mv.cell);
          expect(isWall(m, mv.cell)).toBe(false);
          expect(prev.visited[mv.cell]).toBe(false);
          expect(mv.visited[mv.cell]).toBe(true);
          expect(mv.path).toEqual([...prev.path, mv.cell]);
          // 排在前面的方向都不能走
          for (let d = 0; d < mv.dir; d++) {
            const x = around(m, prev.cell)[d];
            expect(x === null || isWall(m, x) || prev.visited[x]).toBe(true);
          }
        } else if (mv.kind === 'back') {
          expect(mv.path).toEqual(prev.path.slice(0, -1));
          expect(mv.cell).toBe(mv.path.at(-1));
          // 退回是因为四边都走不通
          expect(expectedChoice(m, prev.visited, prev.cell)).toBe(BACK);
        }
      }
      const last = moves.at(-1)!;
      expect(['found', 'stuck']).toContain(last.kind);
      expect(last.kind === 'found').toBe(slowReach(m).has(m.end));
    }
  });

  it('访问顺序（first-visit）和 buildTrace 里标记的顺序一致', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const tr = buildTrace(m);
      const last = tr.at(-1)!;
      expect(last.done).toBe(true);
      if (last.result) expect(visitOrder(m, 'dfs')).toEqual(last.order);
      else expect(last.order.length).toBe(slowReach(m).size);
      expect(new Set(last.order).size).toBe(last.order.length);
    }
  });

  it('routeOf 是一条从起点到终点、一步一格的路；走不到时是 []', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const p = routeOf(m);
      if (!reachable(m)) {
        expect(p).toEqual([]);
        continue;
      }
      expect(p[0]).toBe(m.start);
      expect(p.at(-1)).toBe(m.end);
      for (let k = 1; k < p.length; k++) expect(neighbors(m, p[k - 1])).toContain(p[k]);
      expect(p.length).toBeGreaterThanOrEqual(bestSteps(m) + 1);
      const sr = shortestRoute(m);
      expect(sr.length - 1).toBe(bestSteps(m));
    }
  });

  it('看用的山洞：每个都有死胡同，DFS 的路比最短路绕远；走的步数 = 往前 + 退回', () => {
    for (const rows of KID_MAZES) {
      const m = parseMaze(rows);
      const moves = tour(m);
      expect(moves.at(-1)!.kind).toBe('found');
      expect(moves.some((x) => x.kind === 'back')).toBe(true);
      expect(routeOf(m).length - 1).toBeGreaterThan(bestSteps(m));
      expect(walkedSteps(moves)).toBe(moves.filter((x) => x.kind === 'go').length + moves.filter((x) => x.kind === 'back').length);
    }
  });

  it('玩一用的山洞：能走到，有死路要退回', () => {
    for (const rows of PLAY_MAZES) {
      const m = parseMaze(rows);
      expect(m.w).toBe(5);
      expect(tour(m).at(-1)!.kind).toBe('found');
      expect(tour(m).filter((x) => x.kind === 'back').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('judgeChoice：只有「该走的方向」或「没路时退回」是对的，其余都有对应的提示', () => {
    for (const g of GRIDS.slice(0, 300)) {
      const m = parseMaze(g);
      for (const mv of tour(m)) {
        if (mv.kind === 'found' || mv.kind === 'stuck') continue;
        const exp = expectedChoice(m, mv.visited, mv.cell);
        for (const c of [0, 1, 2, 3, 4] as Choice[]) {
          const v = judgeChoice(m, mv.visited, mv.cell, c);
          expect(v.kind === 'ok').toBe(c === exp);
          if (v.kind === 'skip' || v.kind === 'notBack') expect(v.better).toBe(exp);
          if (c !== BACK && v.kind !== 'ok') {
            const nb = around(m, mv.cell)[c];
            if (v.kind === 'wall') expect(nb === null || isWall(m, nb)).toBe(true);
            if (v.kind === 'crumb') expect(mv.visited[nb!]).toBe(true);
          }
        }
      }
    }
  });

  it('按孩子的规则一路选对，正好走完 tour', () => {
    for (const rows of PLAY_MAZES) {
      const m = parseMaze(rows);
      const moves = tour(m);
      let path = [m.start];
      let visited = moves[0].visited;
      for (let k = 1; k < moves.length; k++) {
        if (moves[k].kind === 'found') break;
        const cur = path.at(-1)!;
        const c = expectedChoice(m, visited, cur);
        if (moves[k].kind === 'back') {
          expect(c).toBe(BACK);
          path = path.slice(0, -1);
        } else {
          expect(c).toBe(moves[k].dir);
          path = [...path, moves[k].cell];
          visited = moves[k].visited;
        }
      }
    }
  });
});

describe('DFS 玩二：数岛', () => {
  it('islands 的个数和并查集一致；每座岛是连通的 DFS 顺序；岛互不重叠，盖住所有陆地', () => {
    for (let i = 0; i < 1000; i++) {
      const rows = randomIslands(rand);
      const g = parseIslands(rows);
      const all = islands(g);
      expect(all.length).toBe(slowIslands(rows));
      expect(countIslands(rows)).toBe(all.length);
      const flat = all.flat();
      expect(new Set(flat).size).toBe(flat.length);
      expect(flat.length).toBe(rows.join('').split('').filter((x) => x === '1').length);
      for (const isl of all) {
        expect(isl.every((id) => isLand(g, id))).toBe(true);
        // DFS 顺序：每个格子（除了第一个）挨着前面某个格子
        isl.forEach((id, k) => {
          if (k > 0) expect(isl.slice(0, k).some((p) => around(g, p).includes(id))).toBe(true);
        });
        expect(floodFill(g, isl[Math.floor(isl.length / 2)]).slice().sort()).toEqual(isl.slice().sort());
      }
    }
  });

  it('海图：个数在 3～4 之间，不会有只在斜角相碰的两块陆地，选项里有正确答案', () => {
    for (const rows of ISLAND_MAPS) {
      const g = parseIslands(rows);
      const n = countIslands(rows);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(4);
      expect(islandChoices(n)).toContain(n);
      expect(islandChoices(n).every((x) => x >= 1)).toBe(true);
      for (let r = 0; r + 1 < g.h; r++) {
        for (let c = 0; c + 1 < g.w; c++) {
          const a = rows[r][c] === '1';
          const b = rows[r][c + 1] === '1';
          const d = rows[r + 1][c] === '1';
          const e = rows[r + 1][c + 1] === '1';
          expect(a && e && !b && !d).toBe(false);
          expect(b && d && !a && !e).toBe(false);
        }
      }
    }
    expect(islandChoices(1)).toEqual([1, 2]);
  });

  it('judgeIslandTap', () => {
    const g = parseIslands(['10', '01']);
    expect(judgeIslandTap(g, new Set(), 0)).toBe('ok');
    expect(judgeIslandTap(g, new Set(), 1)).toBe('sea');
    expect(judgeIslandTap(g, new Set([0]), 0)).toBe('done');
  });
});

describe('DFS 做：逐步执行', () => {
  it('CODE 行号：关键行对得上', () => {
    expect(CODE[L.bounds - 1]).toContain('indices');
    expect(CODE[L.skip - 1]).toContain('visited[r][c]');
    expect(CODE[L.mark - 1]).toContain('visited[r][c] = true');
    expect(CODE[L.isEnd - 1]).toContain("'E'");
    expect(CODE[L.call - 1]).toContain('dfs(');
    expect(CODE[L.back - 1]).toContain('return false');
    expect(CODE[L.start - 1]).toContain('dfs(');
  });

  it('随机山洞：返回值正确，栈和 visited 一致，行号在范围内，只有最后一步 done', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const tr = buildTrace(m);
      const last = tr.at(-1)!;
      expect(last.outcome).toBe('ok');
      expect(last.result).toBe(reachable(m));
      tr.forEach((s, k) => {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(s.done).toBe(k === tr.length - 1);
        expect(s.stack.length).toBeLessThanOrEqual(STACK_LIMIT);
        // 栈里在界内的格子都已经 visited（栈顶可能是还没检查的）
        s.stack.slice(0, -1).forEach(([r, c]) => expect(s.visited[r * m.w + c]).toBe(true));
        if (k > 0) expect(Math.abs(s.stack.length - tr[k - 1].stack.length)).toBeLessThanOrEqual(1);
      });
      expect(last.stack.length).toBe(0);
      expect(Math.max(...tr.map((s) => s.stack.length))).toBeLessThanOrEqual(openCount(m) + 1);
    }
  });

  it('用到的山洞都不会触到栈上限，走不到的那个返回 false', () => {
    for (const t of TRACE_MAZES) {
      const m = parseMaze(t.rows);
      const tr = buildTrace(m);
      expect(Math.max(...tr.map((s) => s.stack.length))).toBeLessThan(STACK_LIMIT);
    }
    const last = TRACE_MAZES.at(-1)!;
    expect(buildTrace(parseMaze(last.rows)).at(-1)!.result).toBe(false);
    expect(buildTrace(parseMaze(TRACE_MAZES[0].rows)).at(-1)!.result).toBe(true);
  });

  it('方向表：上右下左', () => {
    expect(DIRS.map((d) => d.join(','))).toEqual(['-1,0', '0,1', '1,0', '0,-1']);
  });
});

describe('DFS 看：绘本', () => {
  it('lookFrames：台词在引擎里，最后两页是走出来的路和最短路的对比', () => {
    for (const g of [...KID_MAZES, ...GRIDS.slice(0, 300).filter((x) => reachable(parseMaze(x)))]) {
      const m = parseMaze(g);
      const frames = lookFrames(m);
      expect(frames.length).toBeGreaterThanOrEqual(5);
      for (const f of frames) {
        expect(f.say.length).toBeGreaterThan(0);
      }
      for (const f of frames.slice(1)) expect(f.tones[m.start]).toBeDefined();
      expect(frames[0].hero).toBe(m.start);
      expect(frames.at(-1)!.hero).toBe(m.end);
      expect(frames.at(-1)!.say).toContain('只要 ' + bestSteps(m) + ' 步');
      // 倒数第二页：路上的格子数 = 走出来的路 + 1
      const walked = Object.values(frames.at(-2)!.tones).filter((t) => t === 'path').length;
      expect(walked).toBe(routeOf(m).length);
      expect(frames.at(-2)!.say).toContain('留在路上的 ' + (routeOf(m).length - 1) + ' 步');
      // 最后一页亮出的最短路正好是 shortestRoute
      const best = Object.entries(frames.at(-1)!.tones).filter(([, t]) => t === 'best').map(([id]) => Number(id));
      expect(best.sort((a, b) => a - b)).toEqual([...shortestRoute(m)].sort((a, b) => a - b));
    }
  });
});

describe('DFS 做：猜下一步', () => {
  it('rounds 每题带解释：宝藏一行，其他以顺序提示开头、死路讲回溯', () => {
    for (let i = 0; i < 100; i++) {
      const m = parseMaze(genPredict(seeded(i)));
      for (const q of rounds(m)) {
        expect(q.why.startsWith('不对，')).toBe(true);
        expect(q.ask).toContain('探险家刚走进');
        expect(q.right.length).toBeGreaterThan(0);
        expect(q.endNote.length).toBeGreaterThan(0);
        if (q.answer.kind === 'end') expect(q.why).toContain('宝藏');
        else {
          expect(q.why).toContain('上、右、下、左');
          if (q.answer.kind === 'back') expect(q.why).toContain('return false');
          if (q.answer.kind === 'go') expect(q.why).toContain('新格子，进去');
        }
      }
    }
  });

  it('rounds 的答案和 tour 一致：前进去哪、回溯退到哪个路口', () => {
    for (let i = 0; i < 300; i++) {
      const m = parseMaze(i % 2 ? genMaze(4, 0.3, rand) : GRIDS[i]);
      const moves = tour(m);
      const rs = rounds(m);
      expect(rs.length).toBe(moves.filter((x) => x.kind === 'start' || x.kind === 'go').length);
      for (const q of rs) {
        expect(q.path.at(-1)).toBe(q.cur);
        const a = q.answer;
        if (a.kind === 'end') {
          expect(q.cur).toBe(m.end);
        } else if (a.kind === 'go') {
          expect(expectedChoice(m, q.visited, q.cur)).not.toBe(BACK);
          expect(neighbors(m, q.cur)).toContain(a.to);
          expect(q.visited[a.to]).toBe(false);
        } else {
          expect(expectedChoice(m, q.visited, q.cur)).toBe(BACK);
          if (a.to === null) {
            for (const id of q.path) expect(neighbors(m, id).every((x) => q.visited[x])).toBe(true);
          } else {
            expect(q.path).toContain(a.to);
            // 它是离栈顶最近的、还有新方向的格子
            const idx = q.path.indexOf(a.to);
            expect(neighbors(m, a.to).some((x) => !q.visited[x])).toBe(true);
            for (const id of q.path.slice(idx + 1)) expect(neighbors(m, id).every((x) => q.visited[x])).toBe(true);
          }
        }
      }
    }
  });
});

describe('DFS 做：找 bug', () => {
  it('每个 bug 版本和 CODE 只差一行，改的就是 wrongLine，fixed 就是正确那一行', () => {
    for (const b of BUGS) {
      expect(b.code.length).toBe(CODE.length);
      const diff = b.code.map((t, k) => (t !== CODE[k] ? k + 1 : 0)).filter(Boolean);
      expect(diff).toEqual([b.wrongLine]);
      expect(b.fixed).toBe(CODE[b.wrongLine - 1]);
    }
  });

  it('bug 版本确实出错：栈溢出、越界崩溃、返回值错', () => {
    const by = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b)]));
    expect(by['no-mark'].at(-1)!.outcome).toBe('overflow');
    expect(by['no-mark'].at(-1)!.stack.length).toBeGreaterThan(STACK_LIMIT);
    expect(by.bounds.at(-1)!.outcome).toBe('crash');
    const ign = by.ignore.at(-1)!;
    expect(ign.outcome).toBe('ok');
    expect(ign.result).toBe(false);
    for (const b of BUGS) {
      expect(reachable(parseMaze(b.maze))).toBe(true);
      expect(buildTrace(parseMaze(b.maze)).at(-1)!.result).toBe(true);
      const tr = runBug(b);
      expect(tr.filter((s) => s.done).length).toBe(1);
      expect(tr.at(-1)!.done).toBe(true);
    }
  });

  it('忘记 visited 的 bug 在两个格子之间来回', () => {
    const tr = runBug(BUGS.find((b) => b.id === 'no-mark')!);
    const tops = new Set(tr.slice(-20).map((s) => s.cur));
    expect(tops.size).toBeLessThanOrEqual(3);
  });
});

describe('DFS 找 bug：判定文字', () => {
  it('bugVerdict：没跑完是空，跑完按结果说话', () => {
    for (const b of BUGS) {
      const tr = runBug(b);
      for (const s of tr.slice(0, -1)) expect(bugVerdict(s, b)).toBe('');
      const v = bugVerdict(tr.at(-1)!, b);
      if (b.id === 'no-mark') expect(v).toContain('StackOverflowError');
      if (b.id === 'bounds') expect(v).toContain('越界');
      if (b.id === 'ignore') expect(v).toBe('❌ 返回了 false，可是宝藏明明走得到，应该返回 true');
    }
  });
});

describe('DFS 出题：固定种子可复现', () => {
  it('genChallenge / genPredict 用 rand 参数，同种子同结果', () => {
    for (let k = 0; k < 50; k++) {
      const a = genChallenge(seeded(k));
      expect(a).toEqual(genChallenge(seeded(k)));
      const m = parseMaze(a.maze);
      expect([m.w, m.h]).toEqual([9, 9]);
      expect(a.k).toBeGreaterThanOrEqual(5);
      expect(a.k).toBeLessThanOrEqual(14);
      expect(reachable(m)).toBe(true);
      expect(genPredict(seeded(k))).toEqual(genPredict(seeded(k)));
      const p = parseMaze(genPredict(seeded(k)));
      expect([p.w, p.h]).toEqual([2 * PREDICT_ROOMS - 1, 2 * PREDICT_ROOMS - 1]);
    }
    expect(genChallenge(seeded(1)).maze).not.toEqual(genChallenge(seeded(2)).maze);
  });
});

describe('DFS 做：挑战', () => {
  it('DFS 和 BFS 的访问顺序：都从起点开始、不重复、到终点为止；k 的范围合法', () => {
    for (let i = 0; i < 200; i++) {
      const m = parseMaze(genMaze(5, 0.25, rand));
      for (const how of ['dfs', 'bfs'] as const) {
        const o = visitOrder(m, how);
        expect(o[0]).toBe(m.start);
        expect(o.at(-1)).toBe(m.end);
        expect(new Set(o).size).toBe(o.length);
      }
      const k = challengeK(rand);
      expect(k).toBeGreaterThanOrEqual(5);
      expect(k).toBeLessThanOrEqual(14);
      expect(visitOrder(m, 'dfs').length).toBeGreaterThanOrEqual(k);
      expect(visitOrder(m, 'bfs').length).toBeGreaterThanOrEqual(k);
    }
  });

  it('genMaze 的山洞能走到宝藏', () => {
    for (let i = 0; i < 100; i++) {
      const m = parseMaze(genMaze(4, 0.3, rand));
      expect(reachable(m)).toBe(true);
    }
  });
});
