import { describe, expect, it } from 'vitest';
import * as dfs from '../src/engine/dfs';
import { hasPython, runPython } from './helpers/python';

describe.skipIf(!hasPython())('DFS：和 Python 参考实现对拍', () => {
  it('访问顺序、能不能走到都一致', () => {
    const rand = dfs.seeded(11);
    const cases: string[][] = [...dfs.KID_MAZES, ...dfs.PLAY_MAZES, ...dfs.TRACE_MAZES.map((t) => t.rows)];
    for (let k = 0; k < 300; k++) {
      if (k % 3 === 0) cases.push(dfs.genMaze(2 + (k % 5), 0.25, rand));
      else {
        const h = 1 + Math.floor(rand() * 7);
        const w = 2 + Math.floor(rand() * 7);
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
      'dfs',
      'import json,sys\nfrom dfs import dfs_order, has_path\nprint(json.dumps([[dfs_order(g), has_path(g)] for g in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((g) => {
      const m = dfs.parseMaze(g);
      const tr = dfs.buildTrace(m).at(-1)!;
      return [tr.order, tr.result];
    })).toEqual(py);
  });

  it('岛屿个数一致', () => {
    const rand = dfs.seeded(5);
    const cases: string[][] = dfs.ISLAND_MAPS.map((r) => r);
    for (let k = 0; k < 300; k++) {
      const h = 1 + Math.floor(rand() * 7);
      const w = 1 + Math.floor(rand() * 7);
      cases.push(Array.from({ length: h }, () => Array.from({ length: w }, () => (rand() < 0.5 ? '1' : '0')).join('')));
    }
    const py = runPython(
      'dfs',
      'import json,sys\nfrom dfs import num_islands\nprint(json.dumps([num_islands(g) for g in json.load(sys.stdin)]))',
      cases,
    );
    expect(cases.map((g) => dfs.countIslands(g))).toEqual(py);
  });
});
