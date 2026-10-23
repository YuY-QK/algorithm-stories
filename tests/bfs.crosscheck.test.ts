import { describe, expect, it } from 'vitest';
import * as bfs from '../src/engine/bfs';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('BFS：和 Python 参考实现对拍', () => {
  it('最短步数和每个格子的距离都一致', () => {
    const rand = bfs.seeded(7);
    const cases: string[][] = [...bfs.KID_MAZES, ...bfs.TRACE_MAZES.map((t) => t.rows)];
    for (let k = 0; k < 300; k++) {
      if (k % 3 === 0) cases.push(bfs.genMaze(2 + (k % 6), 0.25, rand));
      else {
        const h = 1 + Math.floor(rand() * 8);
        const w = 2 + Math.floor(rand() * 8);
        const cells = Array.from({ length: h }, () => Array.from({ length: w }, (): string => (rand() < 0.3 ? '#' : '.')));
        const a = Math.floor(rand() * h * w);
        let b = a;
        while (b === a) b = Math.floor(rand() * h * w);
        cells[Math.floor(a / w)][a % w] = 'S';
        cells[Math.floor(b / w)][b % w] = 'E';
        cases.push(cells.map((r) => r.join('')));
      }
    }
    const py = runPython(
      'bfs',
      'import json,sys\nfrom bfs import shortest_path, bfs_dist\nprint(json.dumps([[shortest_path(g), bfs_dist(g)] for g in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((g) => {
      const m = bfs.parseMaze(g);
      return [bfs.buildTrace(m).at(-1)!.result, bfs.waves(m, false).dist];
    })).toEqual(py);
  });
});
