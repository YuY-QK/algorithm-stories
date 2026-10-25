import type { BugInfo, LookFrame, Step, Trace } from './types';

/*
 * 深度优先搜索（DFS）：探险家走山洞。
 *
 * 山洞是一组字符串，'#' 岩石（墙）、'.' 空地、'S' 起点（探险家）、'E' 终点（宝藏）。
 * 格子用一个整数 id = r * w + c 表示，r 是行、c 是列，都从 0 开始。
 * 每到一个路口，按固定的顺序选方向：上、右、下、左。
 */

export interface Maze {
  rows: string[];
  w: number;
  h: number;
  start: number;
  end: number;
}

export function parseMaze(rows: string[]): Maze {
  const h = rows.length;
  const w = rows[0].length;
  let start = -1;
  let end = -1;
  rows.forEach((row, r) => {
    if (row.length !== w) throw new Error('山洞每一行要一样长');
    for (let c = 0; c < w; c++) {
      if (row[c] === 'S') start = r * w + c;
      if (row[c] === 'E') end = r * w + c;
    }
  });
  if (start < 0 || end < 0) throw new Error('山洞要有 S 和 E');
  return { rows, w, h, start, end };
}

export const rowOf = (m: { w: number }, id: number) => Math.floor(id / m.w);
export const colOf = (m: { w: number }, id: number) => id % m.w;
export const isWall = (m: Maze, id: number) => m.rows[rowOf(m, id)][colOf(m, id)] === '#';
/** 「(行,列)」，和 Kotlin 里的 Pair 写法一致 */
export const coord = (m: { w: number }, id: number) => '(' + rowOf(m, id) + ',' + colOf(m, id) + ')';

/** 四个方向，顺序和 Kotlin 代码里的 DIRS 一致：上、右、下、左 */
export const DIRS: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
export const DIR_NAMES = ['上', '右', '下', '左'];
export const DIR_ARROWS = ['⬆️', '➡️', '⬇️', '⬅️'];

/** id 的四个方向上的格子，出界的是 null */
export function around(m: { w: number; h: number }, id: number): (number | null)[] {
  const r = rowOf(m, id);
  const c = colOf(m, id);
  return DIRS.map(([dr, dc]) => {
    const nr = r + dr;
    const nc = c + dc;
    return nr < 0 || nr >= m.h || nc < 0 || nc >= m.w ? null : nr * m.w + nc;
  });
}

/** 能走过去的邻居（不出界、不是墙），按 DIRS 的顺序 */
export function neighbors(m: Maze, id: number): number[] {
  return around(m, id).filter((x): x is number => x !== null && !isWall(m, x));
}

/** 山洞里有几个不是墙的格子 */
export function openCount(m: Maze): number {
  return m.rows.join('').split('').filter((ch) => ch !== '#').length;
}

/* ---------- 看、玩：探险家走一遍 ---------- */

export interface TourMove {
  /** start 出发；go 往前走进一个新格子；back 死路，退回上一格；found 到宝藏；stuck 退到起点也没路了 */
  kind: 'start' | 'go' | 'back' | 'found' | 'stuck';
  /** 走完这一步，探险家站的格子 */
  cell: number;
  /** go：走的方向（DIRS 下标）；其他是 -1 */
  dir: number;
  /** 走完这一步，从起点到现在的路（栈，栈顶是 cell） */
  path: number[];
  /** 走完这一步，撒过面包屑（来过）的格子 */
  visited: boolean[];
}

/**
 * 探险家的整个行程：一条路走到底，没路了就退回上一格，换下一个方向。
 * 用显式的栈和「每个格子试到第几个方向」两个记录实现，访问顺序和递归写法完全一样。
 * 走到宝藏就停（found）；宝藏走不到，最后退回起点（stuck）。
 */
export function tour(m: Maze): TourMove[] {
  const n = m.w * m.h;
  const visited = new Array<boolean>(n).fill(false);
  const tried = new Array<number>(n).fill(0);
  const path = [m.start];
  visited[m.start] = true;
  const moves: TourMove[] = [];
  const snap = (kind: TourMove['kind'], dir = -1) =>
    moves.push({ kind, cell: path[path.length - 1], dir, path: [...path], visited: [...visited] });
  snap('start');
  for (;;) {
    const cur = path[path.length - 1];
    if (cur === m.end) {
      snap('found');
      return moves;
    }
    const near = around(m, cur);
    let k = tried[cur];
    while (k < 4 && (near[k] === null || isWall(m, near[k]!) || visited[near[k]!])) k++;
    if (k < 4) {
      tried[cur] = k + 1;
      const nb = near[k]!;
      visited[nb] = true;
      path.push(nb);
      snap('go', k);
    } else if (path.length > 1) {
      path.pop();
      snap('back');
    } else {
      snap('stuck');
      return moves;
    }
  }
}

/** 走到宝藏的那条路（栈里的格子）；走不到是 [] */
export function routeOf(m: Maze): number[] {
  const last = tour(m).at(-1)!;
  return last.kind === 'found' ? last.path : [];
}

/** 探险家一共走了几步（往前走和退回都算一步），到宝藏为止 */
export function walkedSteps(moves: TourMove[]): number {
  return moves.filter((x) => x.kind === 'go' || x.kind === 'back').length;
}

/** 起点到宝藏最少几步（BFS），走不到是 -1 */
export function bestSteps(m: Maze): number {
  return bfsDist(m)[m.end];
}

/** 每个格子离起点几步，走不到是 -1 */
export function bfsDist(m: Maze): number[] {
  const dist = new Array<number>(m.w * m.h).fill(-1);
  dist[m.start] = 0;
  const queue = [m.start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const nb of neighbors(m, cur)) {
      if (dist[nb] !== -1) continue;
      dist[nb] = dist[cur] + 1;
      queue.push(nb);
    }
  }
  return dist;
}

/** 一条最短路（BFS 找的，同样按上右下左的顺序），走不到是 [] */
export function shortestRoute(m: Maze): number[] {
  const parent = new Array<number>(m.w * m.h).fill(-2);
  parent[m.start] = -1;
  const queue = [m.start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const nb of neighbors(m, cur)) {
      if (parent[nb] !== -2) continue;
      parent[nb] = cur;
      queue.push(nb);
    }
  }
  if (parent[m.end] === -2) return [];
  const out = [m.end];
  while (parent[out[out.length - 1]] !== -1) out.push(parent[out[out.length - 1]]);
  return out.reverse();
}

/** 能走到的格子，按「第一次碰到（标记 visited）」的先后排，碰到宝藏就停（宝藏包括在内） */
export function visitOrder(m: Maze, how: 'dfs' | 'bfs'): number[] {
  if (how === 'dfs') {
    const order = [m.start];
    for (const mv of tour(m)) if (mv.kind === 'go') order.push(mv.cell);
    return order;
  }
  const seen = new Array<boolean>(m.w * m.h).fill(false);
  seen[m.start] = true;
  const order = [m.start];
  const queue = [m.start];
  for (let head = 0; head < queue.length && !seen[m.end]; head++) {
    for (const nb of neighbors(m, queue[head])) {
      if (seen[nb]) continue;
      seen[nb] = true;
      order.push(nb);
      queue.push(nb);
      if (nb === m.end) break;
    }
  }
  return order;
}

/**
 * 看用的 7×7 山洞。每个都有死胡同，而且按「上右下左」走出来的路比最短路绕远
 * （测试里检查）。探险家在左上角，宝藏在别处。
 */
export const KID_MAZES: string[][] = [
  [
    'S.#...#',
    '.##.#.#',
    '...#...',
    '.#...#.',
    '.#.#.#.',
    '...#..E',
    '.#.....',
  ],
  [
    'S...#..',
    '.##.#.#',
    '.#...#.',
    '.#.###.',
    '...#...',
    '.#...#.',
    '.#.#..E',
  ],
  [
    'S..#...',
    '##.###.',
    '.#.....',
    '.###.#.',
    '...#...',
    '.#.#.##',
    '......E',
  ],
];

/* ---------- 看：绘本 ---------- */

/** 看里格子的色调：面包屑、现在这条路、最近的路（Grid.vue 的 Tone 包含这三个） */
export type LookTone = 'crumb' | 'path' | 'best';

export interface LookPage extends LookFrame {
  tones: Record<number, LookTone>;
  /** 探险家站在哪一格 */
  hero: number;
  /** 撒过面包屑的格子，没有就是空数组 */
  crumbs: boolean[];
}

/** 一口气往前走最多这么多步就翻一页，免得一页走太长看不清 */
export const LOOK_CHUNK = 5;

/**
 * 绘本的全部页，台词也在这里。每一页都从 tour（探险家的完整行程，和真实的 DFS 一致）里截一段：
 * 一口气往前走几步，或者碰壁以后退回几步。最后和 BFS 的最短路比一比。
 */
export function lookFrames(m: Maze): LookPage[] {
  const moves = tour(m);
  const pathTones = (mv: TourMove, extra: Record<number, LookTone> = {}): Record<number, LookTone> => {
    const t: Record<number, LookTone> = {};
    mv.visited.forEach((v, id) => {
      if (v) t[id] = 'crumb';
    });
    for (const id of mv.path) t[id] = 'path';
    return { ...t, ...extra };
  };
  const at = (say: string, mv: TourMove, extra: Record<number, LookTone> = {}): LookPage => ({
    say, tones: pathTones(mv, extra), hero: mv.cell, crumbs: mv.visited,
  });

  const out: LookPage[] = [];
  const first = moves[0];
  out.push({ say: '探险家 🧭 走进山洞，要找宝藏 💎', tones: {}, hero: m.start, crumbs: [] });
  out.push({ say: '遇到岔路口，按顺序选：⬆️ ➡️ ⬇️ ⬅️', tones: { [m.start]: 'path' }, hero: m.start, crumbs: [] });
  out.push(at('走过的地方撒面包屑 🍞，不走回头路', first));

  // 把行程切成「一口气往前走」和「退回」的段，往前走的段太长就再切开
  let k = 1;
  let goRuns = 0;
  let backRuns = 0;
  let afterBack = false;
  while (k < moves.length) {
    const kind = moves[k].kind === 'found' ? 'go' : moves[k].kind;
    let j = k;
    let n = 0;
    while (j < moves.length && (moves[j].kind === 'found' ? 'go' : moves[j].kind) === kind && !(kind === 'go' && n >= LOOK_CHUNK)) {
      if (moves[j].kind !== 'found') n++;
      j++;
    }
    const last = moves[j - 1];
    if (kind === 'back') {
      backRuns++;
      out.push(at(backRuns === 1 ? '碰壁了，是死路！退回上一个路口' : '又是死路，再退回去', last));
      afterBack = true;
    } else {
      goRuns++;
      const found = last.kind === 'found';
      const say = found
        ? '💎 找到宝藏啦！'
        : afterBack ? '回到路口，换下一个方向' : goRuns === 1 ? '一直往前走，走到底' : '继续往前走';
      out.push(at(say, last));
      afterBack = false;
    }
    k = j;
  }

  const end = moves[moves.length - 1];
  const dfsSteps = end.path.length - 1;
  out.push(at('留在路上的 ' + dfsSteps + ' 步，就是它走出来的路', end));
  const bestTones: Record<number, LookTone> = {};
  for (const id of shortestRoute(m)) bestTones[id] = 'best';
  out.push({
    say: '可是最近的路只要 ' + bestSteps(m) + ' 步，深度优先不保证最短',
    tones: pathTones(end, bestTones),
    hero: m.end,
    crumbs: [],
  });
  return out;
}

/** 玩法一用的 5×5 山洞：短一点，孩子一步一步选方向，不会点到烦 */
export const PLAY_MAZES: string[][] = [
  [
    'S.#..',
    '.##.#',
    '....E',
    '#.###',
    '.....',
  ],
  [
    'S..#.',
    '.#.#.',
    '.#...',
    '.###.',
    '...#E',
  ],
  [
    'S#...',
    '.###.',
    '.....',
    '.###.',
    '....E',
  ],
];

/* ---------- 玩法一「下一步往哪走」 ---------- */

/** 孩子的选择：0～3 是方向（上右下左），4 是「退回上一个路口」 */
export type Choice = 0 | 1 | 2 | 3 | 4;
export const BACK: Choice = 4;

/**
 * ok 选对了；
 * wall 那边是岩石或山洞外面；
 * crumb 那边已经有面包屑（来过了）；
 * skip 那边能走，可是排在前面的方向还没试（better 是应该先试的方向）；
 * notBack 还有路可以走，不用退回（better 是应该走的方向）。
 */
export type Verdict =
  | { kind: 'ok' }
  | { kind: 'wall' | 'crumb' }
  | { kind: 'skip' | 'notBack'; better: number };

/** 站在 cur，哪些方向还能走（不出界、不是墙、没有面包屑） */
export function openDirs(m: Maze, visited: boolean[], cur: number): number[] {
  const near = around(m, cur);
  return [0, 1, 2, 3].filter((k) => near[k] !== null && !isWall(m, near[k]!) && !visited[near[k]!]);
}

/** 站在 cur，按规则下一步该怎么走：往哪个方向，或者退回（-1 表示没路可走要退回） */
export function expectedChoice(m: Maze, visited: boolean[], cur: number): Choice {
  const open = openDirs(m, visited, cur);
  return open.length ? (open[0] as Choice) : BACK;
}

export function judgeChoice(m: Maze, visited: boolean[], cur: number, choice: Choice): Verdict {
  const open = openDirs(m, visited, cur);
  if (choice === BACK) return open.length ? { kind: 'notBack', better: open[0] } : { kind: 'ok' };
  const nb = around(m, cur)[choice];
  if (nb === null || isWall(m, nb)) return { kind: 'wall' };
  if (visited[nb]) return { kind: 'crumb' };
  return choice === open[0] ? { kind: 'ok' } : { kind: 'skip', better: open[0] };
}

/** 点错几次换几颗星：0～2 次三颗，3～6 次两颗，其余一颗（山洞比较长，宽松一点） */
export function exploreStars(misses: number): 1 | 2 | 3 {
  return misses <= 2 ? 3 : misses <= 6 ? 2 : 1;
}

/* ---------- 玩法二「数一数小岛」（洪水填充） ---------- */

export interface IslandMap {
  rows: string[];
  w: number;
  h: number;
}

/** 海图是一组字符串：'1' 陆地、'0' 海 */
export function parseIslands(rows: string[]): IslandMap {
  const w = rows[0].length;
  rows.forEach((r) => {
    if (r.length !== w) throw new Error('海图每一行要一样长');
  });
  return { rows, w, h: rows.length };
}

export const isLand = (g: IslandMap, id: number) => g.rows[rowOf(g, id)][colOf(g, id)] === '1';

/** 从陆地格子 id 出发，DFS 能走到的整座岛，按访问的先后排（洪水填充） */
export function floodFill(g: IslandMap, id: number): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const dfs = (cur: number) => {
    if (seen.has(cur) || !isLand(g, cur)) return;
    seen.add(cur);
    order.push(cur);
    for (const nb of around(g, cur)) if (nb !== null) dfs(nb);
  };
  if (isLand(g, id)) dfs(id);
  return order;
}

/** 所有的岛，每座岛是 DFS 的访问顺序；岛按「从上到下、从左到右先碰到谁」排 */
export function islands(g: IslandMap): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (let id = 0; id < g.w * g.h; id++) {
    if (seen.has(id) || !isLand(g, id)) continue;
    const isl = floodFill(g, id);
    isl.forEach((x) => seen.add(x));
    out.push(isl);
  }
  return out;
}

export const countIslands = (rows: string[]): number => islands(parseIslands(rows)).length;

/** 'ok' 点中新的一座岛；'sea' 点到了海；'done' 这座岛已经涂过 */
export type IslandTap = 'ok' | 'sea' | 'done';

export function judgeIslandTap(g: IslandMap, colored: Set<number>, id: number): IslandTap {
  if (!isLand(g, id)) return 'sea';
  return colored.has(id) ? 'done' : 'ok';
}

/** 数完以后的选项：真实答案前后各一个，固定顺序，不会出现 0 */
export function islandChoices(count: number): number[] {
  return [count - 1, count, count + 1].filter((x) => x >= 1);
}

/** 海图里相邻的陆地都在 4 个方向上连着；孩子的海图不让两块陆地只在斜角碰头，免得看着连、算起来不连 */
export const ISLAND_MAPS: string[][] = [
  [
    '110000',
    '110011',
    '000011',
    '001000',
    '001100',
    '000000',
  ],
  [
    '100011',
    '110011',
    '000000',
    '011000',
    '011001',
    '000001',
  ],
  [
    '011000',
    '011001',
    '000001',
    '110000',
    '110110',
    '000110',
  ],
];

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun hasPath(grid: List<String>): Boolean {',
  '    val h = grid.size',
  '    val w = grid[0].length',
  "    val start = findCell(grid, 'S')",
  '    val visited = Array(h) { BooleanArray(w) }',
  '    return dfs(grid, visited, start.first, start.second)',
  '}',
  '',
  'fun dfs(grid: List<String>, visited: Array<BooleanArray>, r: Int, c: Int): Boolean {',
  '    if (r !in grid.indices || c !in grid[0].indices) return false',
  "    if (grid[r][c] == '#' || visited[r][c]) return false",
  '    visited[r][c] = true',
  "    if (grid[r][c] == 'E') return true",
  '    for ((dr, dc) in DIRS) {',
  '        if (dfs(grid, visited, r + dr, c + dc)) return true',
  '    }',
  '    return false',
  '}',
];

/** 代码里几处关键的行号，引擎和界面都用它们，避免写死数字 */
export const L = {
  start: 6,
  bounds: 10,
  skip: 11,
  mark: 12,
  isEnd: 13,
  call: 15,
  back: 17,
} as const;

export interface DfsStep extends Step {
  /** 调用栈，栈底在前、栈顶（正在执行的这一层）在最后；格子可能出界 */
  stack: [number, number][];
  visited: boolean[];
  /** 正在执行的这一层的格子，出界或者栈是空的时候是 null */
  cur: number | null;
  /** 到这一步为止，标记 visited 的先后顺序 */
  order: number[];
  /** 到这一步为止，dfs 一共被调用了几次 */
  calls: number;
  /** 最终返回值，没返回时是 null */
  result: boolean | null;
  /** 'ok' 正常返回；'overflow' 递归停不下来，栈溢出；'crash' 下标越界 */
  outcome: 'running' | 'ok' | 'overflow' | 'crash';
}

/** 一个写法：正确的代码，或者某个 bug 版本 */
interface Flavor {
  /** 第 12 行有没有标记 visited */
  mark: boolean;
  /** 第 10 行有没有检查上界（r < h、c < w） */
  upperBound: boolean;
  /** 第 15 行有没有看子调用的返回值 */
  useReturn: boolean;
}

const CORRECT: Flavor = { mark: true, upperBound: true, useReturn: true };

/** 调用栈超过这么深就判定为栈溢出（真实的 JVM 能撑上万层，这里调低方便看） */
export const STACK_LIMIT = 60;
/** 步数上限，防止任何写法跑不停 */
const MAX_STEPS = 20000;

function simulate(m: Maze, f: Flavor): DfsStep[] {
  const n = m.w * m.h;
  const steps: DfsStep[] = [];
  const visited = new Array<boolean>(n).fill(false);
  const stack: [number, number][] = [];
  const order: number[] = [];
  let calls = 0;
  let halted = false;
  const c = (r: number, cc: number) => '(' + r + ',' + cc + ')';
  const emit = (line: number, note: string, extra: Partial<DfsStep> = {}) => {
    const top = stack[stack.length - 1];
    const inside = top && top[0] >= 0 && top[0] < m.h && top[1] >= 0 && top[1] < m.w;
    steps.push({
      line, note, done: false, stack: stack.map((x) => [x[0], x[1]]), visited: [...visited],
      cur: inside ? top[0] * m.w + top[1] : null, order: [...order], calls, result: null, outcome: 'running', ...extra,
    });
  };
  const stop = (line: number, note: string, outcome: DfsStep['outcome']) => {
    emit(line, note, { outcome, done: true });
    halted = true;
  };

  const dfs = (r: number, cc: number): boolean => {
    if (halted) return false;
    stack.push([r, cc]);
    calls++;
    if (steps.length >= MAX_STEPS) {
      stop(L.bounds, '跑了太多步还没停：判定为跑不完。', 'overflow');
      return false;
    }
    if (stack.length > STACK_LIMIT) {
      stop(L.bounds, '调用栈已经叠了 ' + stack.length + ' 层，还在往下叠：StackOverflowError，程序崩溃！', 'overflow');
      return false;
    }
    const tooBig = r >= m.h || cc >= m.w;
    const out = r < 0 || cc < 0 || (f.upperBound && tooBig);
    emit(L.bounds, out
      ? '进入 dfs' + c(r, cc) + '：出界了，return false。'
      : '进入 dfs' + c(r, cc) + '：没有出界，继续。');
    if (out) {
      stack.pop();
      return false;
    }
    if (tooBig) {
      stop(L.skip, '读 grid[' + r + '][' + cc + ']：' + (r >= m.h ? '第 ' + r + ' 行' : '第 ' + cc + ' 列') + '不存在，下标越界，程序崩溃！', 'crash');
      return false;
    }
    const id = r * m.w + cc;
    const wall = isWall(m, id);
    if (wall || visited[id]) {
      emit(L.skip, wall ? c(r, cc) + ' 是岩石，return false。' : c(r, cc) + ' 已经有面包屑了，return false。');
      stack.pop();
      return false;
    }
    emit(L.skip, c(r, cc) + ' 是空地，也没来过，继续。');
    if (f.mark) visited[id] = true;
    order.push(id);
    emit(L.mark, f.mark
      ? '标记 ' + c(r, cc) + ' visited，撒下面包屑 🍞。'
      : '这一行被注释掉了：没有撒面包屑，下次还会把这里当成新格子。');
    if (id === m.end) {
      emit(L.isEnd, c(r, cc) + ' 是终点 E，宝藏！return true。');
      stack.pop();
      return true;
    }
    for (let k = 0; k < 4; k++) {
      if (halted) return false;
      const nr = r + DIRS[k][0];
      const nc = cc + DIRS[k][1];
      emit(L.call, '试 ' + DIR_NAMES[k] + '边 ' + c(nr, nc) + '：调用 dfs。');
      const ok = dfs(nr, nc);
      if (halted) return false;
      if (ok && f.useReturn) {
        emit(L.call, DIR_NAMES[k] + '边的调用返回了 true，这一层也 return true，一路往回报喜讯。');
        stack.pop();
        return true;
      }
      if (ok) emit(L.call, DIR_NAMES[k] + '边的调用返回了 true，可是这行代码没看它，接着试下一个方向！');
    }
    emit(L.back, c(r, cc) + ' 四个方向都试过了，return false：退回上一层（回溯）。');
    stack.pop();
    return false;
  };

  emit(L.start, '从起点 ' + coord(m, m.start) + ' 调用 dfs，开始探险。');
  const sr = rowOf(m, m.start);
  const sc = colOf(m, m.start);
  const res = dfs(sr, sc);
  if (!halted) {
    emit(L.start, res
      ? 'dfs 返回 true：有路能走到宝藏，hasPath 返回 true。'
      : 'dfs 返回 false：能走的格子都走遍了，没有碰到宝藏，hasPath 返回 false。', { result: res, outcome: 'ok', done: true });
  }
  return steps;
}

/** 正确代码的逐步执行 */
export function buildTrace(m: Maze): Trace<DfsStep> {
  return simulate(m, CORRECT);
}

/** 逐步执行用的山洞：三个看里的山洞，再加一个宝藏被岩石围住、走不到的 */
export const TRACE_MAZES: { label: string; rows: string[] }[] = [
  ...KID_MAZES.map((rows, k) => ({ label: '山洞 ' + (k + 1), rows })),
  {
    label: '走不到',
    rows: [
      'S.#...#',
      '.##.#.#',
      '...#...',
      '.#...#.',
      '.#.#.#.',
      '...#.##',
      '.#...#E',
    ],
  },
];

/* ---------- 做：猜下一步 ---------- */

export interface Check {
  /** 方向下标，对应 DIRS */
  dir: number;
  /** 邻居格子，出界是 null */
  id: number | null;
  why: 'out' | 'wall' | 'seen' | 'new';
}

/**
 * 每次探险家站稳（出发、或者走进一个新格子）是一道题：下一步是往前走（去哪个格子），
 * 还是死路要回溯（退回到哪个路口），或者这里就是宝藏。
 */
export interface Round {
  cur: number;
  /** 从起点到 cur 的路（栈），最后一个是 cur */
  path: number[];
  visited: boolean[];
  /** cur 就是宝藏 */
  isEnd: boolean;
  /** 四个方向的情况 */
  checks: Check[];
  /** 答案：往前走去 to；或者回溯，退回到 to（null：退到起点也没有路了，搜索结束） */
  answer: { kind: 'go'; to: number } | { kind: 'back'; to: number | null } | { kind: 'end' };
  /** 答错时的解释：按上右下左的顺序一个方向一行（用换行分隔） */
  why: string;
  /** 提问：探险家刚站稳时的提示 */
  ask: string;
  /** 选了「回溯」以后的提示（要点哪个路口） */
  askBack: string;
  /** 答对时的反馈 */
  right: string;
  /** 这一题答完、搜索结束时的收尾提示（只有最后一题会用到） */
  endNote: string;
}

/** 一道题的解释：到了宝藏直接 return true，否则四个方向逐个看，死路再讲回溯 */
function explainRound(m: Maze, cur: number, checks: Check[], answer: Round['answer']): string {
  if (answer.kind === 'end') return '不对，' + coord(m, cur) + ' 就是宝藏 E：第 ' + L.isEnd + ' 行直接 return true，不用再往下走。';
  const out: string[] = ['不对，按 上、右、下、左 的顺序看：'];
  for (const c of checks) {
    const name = DIR_NAMES[c.dir] + '边' + (c.id === null ? '' : ' ' + coord(m, c.id));
    if (c.why === 'out') out.push(name + '：出界，return false。');
    else if (c.why === 'wall') out.push(name + '：岩石，return false。');
    else if (c.why === 'seen') out.push(name + '：已经有面包屑，return false。');
    else {
      out.push(name + '：新格子，进去！' + (answer.kind === 'go' ? '后面的方向这一轮不用看了。' : ''));
      break;
    }
  }
  if (answer.kind === 'back') {
    out.push(
      answer.to === null
        ? '四个方向都走不通，往回退，栈里每个路口也都没有新路了：一路退到起点，dfs 返回 false。'
        : '四个方向都走不通，这一层 return false，退回上一层；一直退到 ' + coord(m, answer.to) + '，它还有没试过的方向，从那里继续。',
    );
  }
  return out.join('\n');
}

export function rounds(m: Maze): Round[] {
  const moves = tour(m);
  const out: Round[] = [];
  moves.forEach((mv, i) => {
    if (mv.kind !== 'start' && mv.kind !== 'go') return;
    const cur = mv.cell;
    const checks: Check[] = around(m, cur).map((id, dir) => ({
      dir,
      id,
      why: id === null ? 'out' : isWall(m, id) ? 'wall' : mv.visited[id] ? 'seen' : 'new',
    }));
    const next = moves[i + 1];
    let answer: Round['answer'];
    if (cur === m.end) answer = { kind: 'end' };
    else if (next.kind === 'go') answer = { kind: 'go', to: next.cell };
    else {
      // 一路退回，直到某一步又能往前走，那个路口就是答案
      let j = i + 1;
      while (moves[j].kind === 'back') j++;
      answer = { kind: 'back', to: moves[j].kind === 'go' ? moves[j - 1].cell : null };
    }
    const right =
      answer.kind === 'go'
        ? '走进 ' + coord(m, answer.to) + '，撒面包屑。'
        : answer.kind === 'end'
          ? '到宝藏了，return true。'
          : answer.to === null
            ? '死路，而且所有路口都没新路了：搜索结束，返回 false。'
            : '退回 ' + coord(m, answer.to) + '，从它没试过的方向继续。';
    out.push({
      cur,
      path: mv.path,
      visited: mv.visited,
      isEnd: cur === m.end,
      checks,
      answer,
      why: explainRound(m, cur, checks, answer),
      ask: '探险家刚走进 ' + coord(m, cur) + '，撒了面包屑。接下来呢？往前走就点它要去的格子；四边都走不通就点「回溯」。',
      askBack: '回溯：要一直退到哪个路口，那里还有没试过的方向？点那一格。',
      right,
      endNote: cur === m.end ? '走到宝藏，return true，一层层往回报喜讯。' : '搜索结束，返回 false。',
    });
  });
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'no-mark' | 'bounds' | 'ignore';
  /** 输入：运行这段代码的山洞 */
  maze: string[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

const FLAVORS: Record<Bug['id'], Flavor> = {
  'no-mark': { ...CORRECT, mark: false },
  bounds: { ...CORRECT, upperBound: false },
  ignore: { ...CORRECT, useReturn: false },
};

export const BUGS: readonly Bug[] = [
  {
    id: 'no-mark',
    title: '来回打转停不下来',
    code: variant(L.mark, '        // visited[r][c] = true'),
    wrongLine: L.mark,
    fixed: CODE[L.mark - 1],
    maze: [
      'S..',
      '.#.',
      '..E',
    ],
    expect: '3×3 的小山洞，有路能走到宝藏',
    explain: '没撒面包屑，第 11 行的 visited 检查永远通过，已经走过的格子会被当成新格子再走一遍。两个相邻的格子互相调用，谁也不 return，调用栈越叠越高，最后 StackOverflowError。DFS 的递归能停下来，靠的就是 visited。',
  },
  {
    id: 'bounds',
    title: '走到洞口外面去了',
    code: variant(L.bounds, '    if (r < 0 || c < 0) return false'),
    wrongLine: L.bounds,
    fixed: CODE[L.bounds - 1],
    maze: [
      'S..',
      '.#.',
      '...',
      'E..',
    ],
    expect: '4 行 3 列的山洞，有路能走到宝藏',
    explain: '只挡了小于 0 的一边，没挡 r ≥ h 和 c ≥ w。探险家沿着最上面一行走到右边尽头，下一格 c = 3 通过了检查，第 11 行读 grid[0][3] 就越界了。DFS 先往前走再看路，所以边界检查一个方向都不能少；下标的范围要写成 in grid.indices 这样两头一起管。',
  },
  {
    id: 'ignore',
    title: '找到宝藏还在乱逛',
    code: variant(L.call, '        dfs(grid, visited, r + dr, c + dc)'),
    wrongLine: L.call,
    fixed: CODE[L.call - 1],
    maze: [
      'S..',
      '...',
      '..E',
    ],
    expect: '3×3 的空山洞，有路能走到宝藏，应该返回 true',
    explain: '递归调用的返回值被丢掉了。找到宝藏的那一层 return true，上一层却没看，照样接着试下一个方向，把整个山洞都走遍，最后一路 return false：明明找到了，却报告没有路。要写成 if (dfs(...)) return true，把喜讯一层层往上传。',
  },
];

export function runBug(bug: Bug): Trace<DfsStep> {
  return simulate(parseMaze(bug.maze), FLAVORS[bug.id]);
}

/** 找 bug 面板底部的判定文字：没跑完是空 */
export function bugVerdict(step: DfsStep, _bug: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'overflow') return '💥 StackOverflowError：调用栈叠了 ' + step.stack.length + ' 层，还在涨';
  if (step.outcome === 'crash') return '💥 下标越界，程序崩溃';
  return '❌ 返回了 ' + step.result + '，可是宝藏明明走得到，应该返回 true';
}

/** 山洞里宝藏到底能不能走到（和 hasPath 的正确答案一致） */
export function reachable(m: Maze): boolean {
  return bfsDist(m)[m.end] >= 0;
}

/* ---------- 挑战：DFS 的第 k 个格子 ---------- */

/** 可以复现的伪随机数（mulberry32），挑战的山洞用它生成，测试也用它 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成一个 (2·rooms − 1) 见方的山洞：先随机挖出一棵树（只有唯一的路），
 * 再随机拆掉 loops 比例的墙，造出绕圈的岔路。起点在左上角，宝藏在右下角。
 */
export function genMaze(rooms: number, loops = 0.25, rand: () => number = Math.random): string[] {
  const size = 2 * rooms - 1;
  const g: string[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => (r % 2 === 0 && c % 2 === 0 ? '.' : '#')),
  );
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const cr = Math.floor(cur / rooms);
    const cc = cur % rooms;
    const opts = DIRS.map(([dr, dc]) => [cr + dr, cc + dc] as const)
      .filter(([r, c]) => r >= 0 && r < rooms && c >= 0 && c < rooms && !seen.has(r * rooms + c));
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [nr, nc] = opts[Math.floor(rand() * opts.length)];
    g[cr + nr][cc + nc] = '.'; // 两个房间中间的那一格：(2cr + 2nr) / 2
    seen.add(nr * rooms + nc);
    stack.push(nr * rooms + nc);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (g[r][c] === '#' && (r + c) % 2 === 1 && rand() < loops) g[r][c] = '.';
    }
  }
  g[0][0] = 'S';
  g[size - 1][size - 1] = 'E';
  return g.map((row) => row.join(''));
}

/** 挑战用的山洞：9×9 */
export const CHALLENGE_ROOMS = 5;
export const CHALLENGE_LOOPS = 0.25;
/** 猜下一步用的山洞：7×7，岔路多一点 */
export const PREDICT_ROOMS = 4;
export const PREDICT_LOOPS = 0.3;

/** 猜下一步出题：一个新的 7×7 山洞 */
export function genPredict(rand: () => number = Math.random): string[] {
  return genMaze(PREDICT_ROOMS, PREDICT_LOOPS, rand);
}

/** 挑战的题目：问 DFS 的第 k 个格子，k 在 5 到 14 之间 */
export function challengeK(rand: () => number = Math.random): number {
  return 5 + Math.floor(rand() * 10);
}

/** 挑战出题：一个新的 9×9 山洞，加上要问的 k（先生成山洞，再抽 k） */
export function genChallenge(rand: () => number = Math.random): { maze: string[]; k: number } {
  const maze = genMaze(CHALLENGE_ROOMS, CHALLENGE_LOOPS, rand);
  return { maze, k: challengeK(rand) };
}
