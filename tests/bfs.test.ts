import { describe, expect, it } from 'vitest';
import {
  BUGS, CHALLENGE_ROOMS, CODE, PREDICT_ROOMS, EXPLODE_AT, KID_MAZES, L, TRACE_MAZES,
  applyDrawTap, around, bestSteps, bugVerdict, buildTrace, genChallenge, genMaze, genPredict, lookFrames, isNeighbor, isWall, judgeDrawTap, judgeRingTap,
  neighbors, openCount, parseMaze, pathTo, ringStars, rounds, routeStars, runBug, seeded, waves, type Maze,
} from '../src/engine/bfs';

/** 随机迷宫：大小随机，三成是墙，S、E 位置随机 */
function randomGrid(rand: () => number): string[] {
  const h = 1 + Math.floor(rand() * 8);
  const w = 2 + Math.floor(rand() * 8);
  const cells = Array.from({ length: h }, () => Array.from({ length: w }, (): string => (rand() < 0.3 ? '#' : '.')));
  const a = Math.floor(rand() * h * w);
  let b = a;
  while (b === a) b = Math.floor(rand() * h * w);
  cells[Math.floor(a / w)][a % w] = 'S';
  cells[Math.floor(b / w)][b % w] = 'E';
  return cells.map((r) => r.join(''));
}

/** 笨办法：反复松弛直到不再变化，和 BFS 的 dist 核对 */
function slowDist(m: Maze): number[] {
  const n = m.w * m.h;
  const d = new Array<number>(n).fill(Infinity);
  d[m.start] = 0;
  for (let changed = true; changed;) {
    changed = false;
    for (let id = 0; id < n; id++) {
      if (isWall(m, id) || d[id] === Infinity) continue;
      for (const nb of neighbors(m, id)) {
        if (d[id] + 1 < d[nb]) {
          d[nb] = d[id] + 1;
          changed = true;
        }
      }
    }
  }
  return d.map((x) => (x === Infinity ? -1 : x));
}

const rand = seeded(20261022);
const GRIDS = Array.from({ length: 1500 }, () => randomGrid(rand));

describe('BFS 看、玩：一圈一圈的水波', () => {
  it('waves 的 dist 和笨办法一致，每一圈的格子 dist 都等于圈号', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const full = waves(m, false);
      expect(full.dist).toEqual(slowDist(m));
      full.rings.forEach((ring, k) => {
        for (const id of ring) expect(full.dist[id]).toBe(k);
      });
      // 每个走得到的格子正好在一圈里
      expect(full.rings.flat().length).toBe(full.dist.filter((d) => d >= 0).length);
    }
  });

  it('pathTo 是一条从起点到终点、一步一格、长度最短的路', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const wv = waves(m);
      const p = pathTo(wv, m.end);
      const best = slowDist(m)[m.end];
      expect(bestSteps(m)).toBe(best);
      if (best < 0) {
        expect(p).toEqual([]);
        continue;
      }
      expect(p[0]).toBe(m.start);
      expect(p.at(-1)).toBe(m.end);
      expect(p.length - 1).toBe(best);
      for (let k = 1; k < p.length; k++) {
        expect(isNeighbor(m, p[k - 1], p[k])).toBe(true);
        expect(isWall(m, p[k])).toBe(false);
      }
    }
  });

  it('stopAtEnd：碰到奶酪的那一圈走完就停', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const wv = waves(m);
      if (wv.dist[m.end] >= 0) expect(wv.rings.length - 1).toBe(wv.dist[m.end]);
    }
  });

  it('孩子的迷宫：7×7，最短 6 步，每个空格子都走得到', () => {
    for (const g of KID_MAZES) {
      const m = parseMaze(g);
      expect([m.w, m.h]).toEqual([7, 7]);
      expect(bestSteps(m)).toBe(6);
      // 没有关起来的空格子：走不到的只有墙
      expect(waves(m, false).dist.filter((d) => d < 0).length).toBe(m.rows.join('').split('#').length - 1);
    }
  });

  it('玩法一：按圈涂色，乱点会被拦住', () => {
    for (const g of [...KID_MAZES, ...GRIDS.slice(0, 300)]) {
      const m = parseMaze(g);
      const wv = waves(m);
      if (wv.dist[m.end] < 0) continue;
      for (let ring = 1; ring < wv.rings.length; ring++) {
        const painted = new Set<number>();
        for (let id = 0; id < m.w * m.h; id++) {
          const j = judgeRingTap(m, wv.dist, ring, painted, id);
          if (isWall(m, id)) expect(j).toBe('wall');
          else if (wv.dist[id] === ring) expect(j).toBe(id === m.end ? 'cheese' : 'ok');
          else if (wv.dist[id] >= 0 && wv.dist[id] < ring) expect(j).toBe('painted');
          else expect(j).toBe('far');
        }
        for (const id of wv.rings[ring]) {
          painted.add(id);
          expect(judgeRingTap(m, wv.dist, ring, painted, id)).toBe('painted');
        }
      }
    }
    expect([0, 1, 2, 4, 5, 9].map(ringStars)).toEqual([3, 3, 2, 2, 1, 1]);
  });

  it('玩法二：画路只能一格一格走，点回路上的格子会退回去', () => {
    for (const g of GRIDS.slice(0, 500)) {
      const m = parseMaze(g);
      let path = [m.start];
      for (let k = 0; k < 60; k++) {
        const id = Math.floor(rand() * m.w * m.h);
        const j = judgeDrawTap(m, path, id);
        const next = applyDrawTap(m, path, id);
        if (j === 'wall' || j === 'far') expect(next).toEqual(path);
        if (j === 'ok') expect(next).toEqual([...path, id]);
        if (j === 'back') expect(next.at(-1)).toBe(id);
        path = next;
        expect(path[0]).toBe(m.start);
        expect(new Set(path).size).toBe(path.length);
        for (let i = 1; i < path.length; i++) expect(isNeighbor(m, path[i - 1], path[i])).toBe(true);
      }
    }
    expect([[6, 6], [7, 6], [8, 6], [9, 6]].map(([s, b]) => routeStars(s, b))).toEqual([3, 2, 2, 1]);
  });
});

describe('BFS 看：绘本', () => {
  it('lookFrames：台词在引擎里，圈数和 waves 一致，最后一页小老鼠到奶酪', () => {
    for (const g of [...KID_MAZES, ...GRIDS.slice(0, 300)]) {
      const m = parseMaze(g);
      const wv = waves(m);
      const frames = lookFrames(m);
      // 开场 2 页 + 每圈 1 页 + 倒数 + 吃到
      expect(frames).toHaveLength(2 + (wv.rings.length - 1) + 2);
      for (const f of frames) expect(f.say.length).toBeGreaterThan(0);
      expect(frames[0].mouse).toBe(m.start);
      expect(frames.at(-1)!.mouse).toBe(m.end);
      // 数字标签就是 waves 的 dist
      for (const [id, d] of Object.entries(frames.at(-1)!.labels)) expect(wv.dist[Number(id)]).toBe(d);
    }
    for (const g of KID_MAZES) {
      const f = lookFrames(parseMaze(g));
      expect(f.at(-1)!.say).toContain('6 步');
      expect(f.at(-2)!.say).toBe('从奶酪倒着数回去：6 → 5 → 4 → 3 → 2 → 1 → 0');
    }
  });
});

describe('BFS 做：逐步执行', () => {
  it('1500 个随机迷宫：返回值和笨办法一致，只有最后一步 done', () => {
    for (const g of GRIDS) {
      const m = parseMaze(g);
      const steps = buildTrace(m);
      const last = steps.at(-1)!;
      expect(last.done).toBe(true);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      expect(last.outcome).toBe('ok');
      expect(last.result).toBe(slowDist(m)[m.end]);
      expect(last.line).toBe(last.result! >= 0 ? L.isEnd : L.fail);
    }
  });

  it('每一步：行号在范围里，队列里的格子都 visited、不重复、dist 不递减且最多差 1', () => {
    for (const g of GRIDS.slice(0, 400)) {
      const m = parseMaze(g);
      const truth = slowDist(m);
      let pushes = 0;
      for (const s of buildTrace(m)) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(CODE.length);
        expect(CODE[s.line - 1].trim()).not.toBe('}');
        expect(new Set(s.queue).size).toBe(s.queue.length);
        for (const id of s.queue) expect(s.visited[id]).toBe(true);
        const ds = s.queue.map((id) => s.dist[id]);
        for (let k = 1; k < ds.length; k++) {
          expect(ds[k]).toBeGreaterThanOrEqual(ds[k - 1]);
        }
        if (ds.length) expect(ds.at(-1)! - ds[0]).toBeLessThanOrEqual(1);
        // visited 的格子 dist 已经是最短距离
        // （第 18 行刚标记、下一行才写 dist 的那个邻居除外）
        s.visited.forEach((v, id) => v && !(s.line === L.mark && id === s.nb) && expect(s.dist[id]).toBe(truth[id]));
        expect(s.pushes).toBeGreaterThanOrEqual(pushes);
        pushes = s.pushes;
      }
      // 每个走得到的格子正好入队一次
      expect(pushes).toBeLessThanOrEqual(truth.filter((d) => d >= 0).length);
    }
  });

  it('关键行号指向对应的代码', () => {
    expect(CODE[L.init - 1]).toContain('visited[start');
    expect(CODE[L.loop - 1]).toContain('while');
    expect(CODE[L.pop - 1]).toContain('removeFirst');
    expect(CODE[L.isEnd - 1]).toContain("'E'");
    expect(CODE[L.bounds - 1]).toContain('until');
    expect(CODE[L.skip - 1]).toContain('visited[nr][nc]');
    expect(CODE[L.mark - 1]).toContain('= true');
    expect(CODE[L.dist - 1]).toContain('+ 1');
    expect(CODE[L.push - 1]).toContain('addLast');
    expect(CODE[L.fail - 1]).toContain('return -1');
  });

  it('逐步执行的迷宫：三个走得到，一个走不到', () => {
    expect(TRACE_MAZES.map((t) => bestSteps(parseMaze(t.rows)))).toEqual([6, 6, 6, -1]);
  });
});

describe('BFS 做：猜下一步', () => {
  it('rounds：每次出队一题，入队的格子和逐步执行一致', () => {
    for (const g of [...KID_MAZES, ...GRIDS.slice(0, 500)]) {
      const m = parseMaze(g);
      const rs = rounds(m);
      const steps = buildTrace(m);
      expect(rs.map((r) => r.cur)).toEqual(steps.filter((s) => s.line === L.pop).map((s) => s.cur));
      for (const r of rs) {
        expect(r.queue[0]).toBe(r.cur);
        expect(r.checks).toHaveLength(4);
        r.checks.forEach((c, dir) => expect(c.id).toBe(around(m, r.cur)[dir]));
        if (r.isEnd) expect(r.pushed).toEqual([]);
        for (const id of r.pushed) expect(r.visited[id]).toBe(false);
      }
      // 所有入队的格子连起来，就是起点以外所有出过队、还在队里的格子
      const pushed = rs.flatMap((r) => r.pushed);
      expect(new Set(pushed).size).toBe(pushed.length);
      if (bestSteps(m) >= 0) expect(rs.at(-1)!.isEnd).toBe(true);
    }
  });

  it('rounds：每题都带解释，非终点题四个方向各一行', () => {
    for (const g of [...KID_MAZES, ...GRIDS.slice(0, 300)]) {
      const m = parseMaze(g);
      for (const r of rounds(m)) {
        expect(r.why.startsWith('不对，')).toBe(true);
        if (r.isEnd) expect(r.why).toContain('终点');
        else {
          const lines = r.why.split('\n').slice(1);
          expect(lines).toHaveLength(4);
          r.checks.forEach((c, k) => {
            expect(lines[k].startsWith(['上', '下', '左', '右'][c.dir])).toBe(true);
            expect(lines[k].includes('入队')).toBe(c.why === 'new');
          });
        }
      }
    }
  });
});

describe('BFS 做：找 bug', () => {
  it('每个坑只改了一行，改回来就是正确代码', () => {
    for (const b of BUGS) {
      const diff = b.code.map((t, k) => (t === CODE[k] ? -1 : k + 1)).filter((x) => x > 0);
      expect(diff).toEqual([b.wrongLine]);
      expect(CODE[b.wrongLine - 1]).toBe(b.fixed);
    }
  });

  it('每个坑在演示迷宫上都会出错', () => {
    const last = Object.fromEntries(BUGS.map((b) => [b.id, runBug(b).at(-1)!]));
    const best = Object.fromEntries(BUGS.map((b) => [b.id, bestSteps(parseMaze(b.maze))]));
    expect(last['no-visited'].outcome).toBe('explode');
    expect(last['no-visited'].queue.length).toBeGreaterThan(EXPLODE_AT);
    expect(last['no-visited'].queue.length).toBeGreaterThan(openCount(parseMaze(BUGS[0].maze)));
    expect(last.stack.outcome).toBe('ok');
    expect(last.stack.result).toBeGreaterThan(best.stack);
    expect(last.range.outcome).toBe('crash');
    for (const b of BUGS) {
      expect(b.expect).toContain(String(best[b.id]));
      const steps = runBug(b);
      expect(steps.filter((s) => s.done)).toHaveLength(1);
      for (const s of steps) {
        expect(s.line).toBeGreaterThanOrEqual(1);
        expect(s.line).toBeLessThanOrEqual(b.code.length);
      }
    }
  });

  it('栈版本在随机迷宫上常常不是最短，但从不比最短更短', () => {
    let worse = 0;
    const stack = BUGS.find((b) => b.id === 'stack')!;
    for (const g of GRIDS) {
      const res = runBug({ ...stack, maze: g }).at(-1)!.result!;
      const best = bestSteps(parseMaze(g));
      if (best < 0) expect(res).toBe(-1);
      else expect(res).toBeGreaterThanOrEqual(best);
      if (res > best) worse++;
    }
    expect(worse).toBeGreaterThan(50);
  });
});

describe('BFS 找 bug：判定文字', () => {
  it('bugVerdict：没跑完是空，跑完按结果说话', () => {
    for (const b of BUGS) {
      const steps = runBug(b);
      for (const s of steps.slice(0, -1)) expect(bugVerdict(s, b)).toBe('');
      const v = bugVerdict(steps.at(-1)!, b);
      if (b.id === 'no-visited') expect(v).toContain('队列爆炸');
      if (b.id === 'range') expect(v).toContain('越界');
      if (b.id === 'stack') expect(v).toMatch(/^❌ 返回了 \d+，可是最短只要 3 步$/);
    }
  });
});

describe('BFS 出题：固定种子可复现', () => {
  it('genChallenge / genPredict 用 rand 参数，同种子同迷宫，大小固定', () => {
    for (let k = 0; k < 50; k++) {
      expect(genChallenge(seeded(k))).toEqual(genChallenge(seeded(k)));
      expect(genChallenge(seeded(k))).toEqual(genMaze(CHALLENGE_ROOMS, 0.25, seeded(k)));
      expect(genPredict(seeded(k))).toEqual(genPredict(seeded(k)));
      const m = parseMaze(genPredict(seeded(k)));
      expect([m.w, m.h]).toEqual([2 * PREDICT_ROOMS - 1, 2 * PREDICT_ROOMS - 1]);
      expect(bestSteps(m)).toBeGreaterThan(0);
    }
    expect(genChallenge(seeded(1))).not.toEqual(genChallenge(seeded(2)));
  });
});

describe('BFS 做：挑战', () => {
  it('生成的迷宫：11×11，走得到，有绕圈的路', () => {
    for (let k = 0; k < 300; k++) {
      const g = genMaze(CHALLENGE_ROOMS, 0.25, seeded(k));
      const m = parseMaze(g);
      expect([m.w, m.h]).toEqual([11, 11]);
      expect(m.start).toBe(0);
      expect(m.end).toBe(120);
      const full = waves(m, false);
      // 所有房间都连通
      for (let r = 0; r < 11; r += 2) for (let c = 0; c < 11; c += 2) expect(full.dist[r * 11 + c]).toBeGreaterThanOrEqual(0);
      expect(full.dist[m.end]).toBeGreaterThanOrEqual(20);
    }
  });
});
