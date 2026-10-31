import { m as msg } from '../core/i18n';
import { FILL_END, FILL_STEP } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, PredictRules, Puzzle, Step, Trace, TraceRules, Var,
} from '../core/types';

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

/** 格子的色调（画面 Grid.vue 按它上色）；看里只用面包屑、现在这条路、最近的路 */
export type Tone =
  | 'crumb' | 'path' | 'cur' | 'nb' | 'best' | 'pick' | 'miss' | 'dim'
  | 'sea' | 'land' | 'i0' | 'i1' | 'i2' | 'i3';
export type LookTone = 'crumb' | 'path' | 'best';

export interface LookPage extends LookFrame {
  /** 山洞本身（画面据此画格子） */
  rows: string[];
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
  const at = (say: Msg, mv: TourMove, extra: Record<number, LookTone> = {}): LookPage => ({
    say, rows: m.rows, tones: pathTones(mv, extra), hero: mv.cell, crumbs: mv.visited,
  });

  const out: LookPage[] = [];
  const first = moves[0];
  out.push({ say: msg('look.open'), rows: m.rows, tones: {}, hero: m.start, crumbs: [] });
  out.push({ say: msg('look.order'), rows: m.rows, tones: { [m.start]: 'path' }, hero: m.start, crumbs: [] });
  out.push(at(msg('look.crumbs'), first));

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
      out.push(at(msg(backRuns === 1 ? 'look.wall' : 'look.wall2'), last));
      afterBack = true;
    } else {
      goRuns++;
      const found = last.kind === 'found';
      const say = msg(found ? 'look.found' : afterBack ? 'look.fork' : goRuns === 1 ? 'look.straight' : 'look.onward');
      out.push(at(say, last));
      afterBack = false;
    }
    k = j;
  }

  const end = moves[moves.length - 1];
  const dfsSteps = end.path.length - 1;
  out.push(at(msg('look.trail', { n: dfsSteps }), end));
  const bestTones: Record<number, LookTone> = {};
  for (const id of shortestRoute(m)) bestTones[id] = 'best';
  out.push({
    say: msg('look.best', { n: bestSteps(m) }),
    rows: m.rows,
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
  const emit = (line: number, note: Msg, extra: Partial<DfsStep> = {}) => {
    const top = stack[stack.length - 1];
    const inside = top && top[0] >= 0 && top[0] < m.h && top[1] >= 0 && top[1] < m.w;
    steps.push({
      line, note, done: false, stack: stack.map((x) => [x[0], x[1]]), visited: [...visited],
      cur: inside ? top[0] * m.w + top[1] : null, order: [...order], calls, result: null, outcome: 'running', ...extra,
    });
  };
  const stop = (line: number, note: Msg, outcome: DfsStep['outcome']) => {
    emit(line, note, { outcome, done: true });
    halted = true;
  };

  const dfs = (r: number, cc: number): boolean => {
    if (halted) return false;
    stack.push([r, cc]);
    calls++;
    if (steps.length >= MAX_STEPS) {
      stop(L.bounds, msg('trace.tooLong'), 'overflow');
      return false;
    }
    if (stack.length > STACK_LIMIT) {
      stop(L.bounds, msg('trace.overflow', { n: stack.length }), 'overflow');
      return false;
    }
    const tooBig = r >= m.h || cc >= m.w;
    const out = r < 0 || cc < 0 || (f.upperBound && tooBig);
    emit(L.bounds, msg(out ? 'trace.out' : 'trace.inside', { c: c(r, cc) }));
    if (out) {
      stack.pop();
      return false;
    }
    if (tooBig) {
      stop(L.skip, msg('trace.crash', { r, c: cc, what: r >= m.h ? msg('trace.row', { n: r }) : msg('trace.col', { n: cc }) }), 'crash');
      return false;
    }
    const id = r * m.w + cc;
    const wall = isWall(m, id);
    if (wall || visited[id]) {
      emit(L.skip, msg(wall ? 'trace.rock' : 'trace.crumb', { c: c(r, cc) }));
      stack.pop();
      return false;
    }
    emit(L.skip, msg('trace.free', { c: c(r, cc) }));
    if (f.mark) visited[id] = true;
    order.push(id);
    emit(L.mark, f.mark ? msg('trace.mark', { c: c(r, cc) }) : msg('trace.noMark'));
    if (id === m.end) {
      emit(L.isEnd, msg('trace.treasure', { c: c(r, cc) }));
      stack.pop();
      return true;
    }
    for (let k = 0; k < 4; k++) {
      if (halted) return false;
      const nr = r + DIRS[k][0];
      const nc = cc + DIRS[k][1];
      emit(L.call, msg('trace.try', { dir: msg('dir.' + k), c: c(nr, nc) }));
      const ok = dfs(nr, nc);
      if (halted) return false;
      if (ok && f.useReturn) {
        emit(L.call, msg('trace.good', { dir: msg('dir.' + k) }));
        stack.pop();
        return true;
      }
      if (ok) emit(L.call, msg('trace.ignored', { dir: msg('dir.' + k) }));
    }
    emit(L.back, msg('trace.back', { c: c(r, cc) }));
    stack.pop();
    return false;
  };

  emit(L.start, msg('trace.start', { c: coord(m, m.start) }));
  const sr = rowOf(m, m.start);
  const sc = colOf(m, m.start);
  const res = dfs(sr, sc);
  if (!halted) {
    emit(L.start, msg(res ? 'trace.retTrue' : 'trace.retFalse'), { result: res, outcome: 'ok', done: true });
  }
  return steps;
}

/** 正确代码的逐步执行 */
export function buildTrace(m: Maze): Trace<DfsStep> {
  return simulate(m, CORRECT);
}

/** 逐步执行用的山洞：三个看里的山洞，再加一个宝藏被岩石围住、走不到的 */
export const TRACE_MAZES: { label: Msg; rows: string[] }[] = [
  ...KID_MAZES.map((rows, k) => ({ label: msg('trace.maze', { n: k + 1 }), rows })),
  {
    label: msg('trace.mazeNone'),
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
  why: Msg;
  /** 提问：探险家刚站稳时的提示 */
  ask: Msg;
  /** 选了「回溯」以后的提示（要点哪个路口） */
  askBack: Msg;
  /** 答对时的反馈 */
  right: Msg;
  /** 这一题答完、搜索结束时的收尾提示（只有最后一题会用到） */
  endNote: Msg;
}

/** 把几行说明用换行连成一条 Msg（文案里 predict.join 是 "{a}\n{b}"） */
function joinLines(lines: Msg[]): Msg {
  return lines.reduce((acc, x) => msg('predict.join', { a: acc, b: x }));
}

/** 一道题的解释：到了宝藏直接 return true，否则四个方向逐个看，死路再讲回溯 */
function explainRound(m: Maze, cur: number, checks: Check[], answer: Round['answer']): Msg {
  if (answer.kind === 'end') return msg('predict.why.end', { c: coord(m, cur), line: L.isEnd });
  const out: Msg[] = [msg('predict.why.head')];
  for (const c of checks) {
    const name = c.id === null ? msg('predict.name.edge', { dir: msg('dir.' + c.dir) }) : msg('predict.name', { dir: msg('dir.' + c.dir), c: coord(m, c.id) });
    if (c.why === 'out') out.push(msg('predict.why.out', { name }));
    else if (c.why === 'wall') out.push(msg('predict.why.wall', { name }));
    else if (c.why === 'seen') out.push(msg('predict.why.seen', { name }));
    else {
      out.push(msg('predict.why.new', { name }));
      break;
    }
  }
  if (answer.kind === 'back') {
    out.push(answer.to === null ? msg('predict.why.backEnd') : msg('predict.why.back', { c: coord(m, answer.to) }));
  }
  return joinLines(out);
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
        ? msg('predict.right.go', { c: coord(m, answer.to) })
        : answer.kind === 'end'
          ? msg('predict.right.end')
          : answer.to === null
            ? msg('predict.right.stuck')
            : msg('predict.right.back', { c: coord(m, answer.to) });
    out.push({
      cur,
      path: mv.path,
      visited: mv.visited,
      isEnd: cur === m.end,
      checks,
      answer,
      why: explainRound(m, cur, checks, answer),
      ask: msg('predict.ask', { c: coord(m, cur) }),
      askBack: msg('predict.askBack'),
      right,
      endNote: msg(cur === m.end ? 'predict.endFound' : 'predict.endStuck'),
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
    title: msg('bug.noMark.title'),
    code: variant(L.mark, '        // visited[r][c] = true'),
    wrongLine: L.mark,
    fixed: CODE[L.mark - 1],
    maze: [
      'S..',
      '.#.',
      '..E',
    ],
    expect: msg('bug.noMark.expect'),
    explain: msg('bug.noMark.explain'),
  },
  {
    id: 'bounds',
    title: msg('bug.bounds.title'),
    code: variant(L.bounds, '    if (r < 0 || c < 0) return false'),
    wrongLine: L.bounds,
    fixed: CODE[L.bounds - 1],
    maze: [
      'S..',
      '.#.',
      '...',
      'E..',
    ],
    expect: msg('bug.bounds.expect'),
    explain: msg('bug.bounds.explain'),
  },
  {
    id: 'ignore',
    title: msg('bug.ignore.title'),
    code: variant(L.call, '        dfs(grid, visited, r + dr, c + dc)'),
    wrongLine: L.call,
    fixed: CODE[L.call - 1],
    maze: [
      'S..',
      '...',
      '..E',
    ],
    expect: msg('bug.ignore.expect'),
    explain: msg('bug.ignore.explain'),
  },
];

export function runBug(bug: Bug): Trace<DfsStep> {
  return simulate(parseMaze(bug.maze), FLAVORS[bug.id]);
}

/** 找 bug 面板底部的判定：没跑完是 null */
export function bugVerdict(step: DfsStep, _bug: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'overflow') return msg('bug.verdict.overflow', { n: step.stack.length });
  if (step.outcome === 'crash') return msg('bug.verdict.crash');
  return msg('bug.verdict.wrong', { r: String(step.result) });
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

/* ---------- 画面用的小函数：把状态画成格子的色调、小字、表情 ---------- */

/** 山洞里每个格子是不是岩石 */
export function wallsOf(m: Maze): boolean[] {
  return Array.from({ length: m.w * m.h }, (_, id) => isWall(m, id));
}

/** 探险家 🧭、宝藏 💎 的位置；crumbs 里为真的格子（没有别的 emoji 时）画面包屑 🍞 */
export function emojisOf(m: Maze, hero: number | null, crumbs: boolean[] = []): Record<number, string> {
  const e: Record<number, string> = {};
  crumbs.forEach((v, id) => {
    if (v) e[id] = '🍞';
  });
  e[m.end] = '💎';
  if (hero !== null) e[hero] = '🧭';
  return e;
}

/** 逐步执行和找 bug 共用：调用栈里的格子是「现在这条路」，其余 visited 的是走过又退回来的 */
export function stepTones(s: DfsStep, m: Maze): Record<number, Tone> {
  const t: Record<number, Tone> = {};
  s.visited.forEach((v, id) => {
    if (v) t[id] = 'crumb';
  });
  for (const [r, c] of s.stack) {
    if (r >= 0 && r < m.h && c >= 0 && c < m.w) t[r * m.w + c] = 'path';
  }
  if (s.cur !== null) t[s.cur] = 'cur';
  return t;
}

/** 已访问格子上写它是第几个被标记的 */
export function stepLabels(s: DfsStep): Record<number, number> {
  const l: Record<number, number> = {};
  s.order.forEach((id, k) => {
    if (s.visited[id]) l[id] = k + 1;
  });
  return l;
}

/* ---------- 关卡模块：规则（level.json 按名字引用） ---------- */

export const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: (prev) => (prev + 1) % KID_MAZES.length,
  frames: (which) => lookFrames(parseMaze(KID_MAZES[which])),
};

/* 玩法一「下一步往哪走」：孩子替探险家选方向 */

export interface ExploreState {
  which: number;
  /** 从起点到现在的路，最后一个是探险家站的格子 */
  path: number[];
  visited: boolean[];
  misses: number;
  steps: number;
  backs: number;
  done: boolean;
  /** 摇头的格子，[格子, 第几次] */
  shake: [number, number] | null;
  /** 方向键摇头 / 透光，[方向, 第几次]；画面据此晃一下、闪一下 */
  padShake: [Choice, number] | null;
  padGlow: [Choice, number] | null;
  /** 透光提示的格子；glowKey 每加一次就重新闪一遍 */
  glow: number[];
  glowKey: number;
}
export type ExploreAction = { type: 'choose'; c: Choice } | { type: 'again' };

function exploreFresh(which: number, prev?: ExploreState): ExploreState {
  const maze = parseMaze(PLAY_MAZES[which]);
  const visited = new Array<boolean>(maze.w * maze.h).fill(false);
  visited[maze.start] = true;
  return {
    which, path: [maze.start], visited, misses: 0, steps: 0, backs: 0, done: false,
    shake: prev?.shake ?? null, padShake: prev?.padShake ?? null, padGlow: prev?.padGlow ?? null, glow: [], glowKey: prev?.glowKey ?? 0,
  };
}

/** 玩法一画面要画的东西 */
export function exploreView(s: ExploreState) {
  const maze = parseMaze(PLAY_MAZES[s.which]);
  const cur = s.path[s.path.length - 1];
  const tones: Record<number, Tone> = {};
  s.visited.forEach((v, id) => {
    if (v) tones[id] = 'crumb';
  });
  for (const id of s.path) tones[id] = 'path';
  tones[cur] = 'cur';
  return {
    maze, cur, tones,
    walls: wallsOf(maze),
    emojis: emojisOf(maze, cur, s.visited),
    /** 四边都走不通，该退回了：退回键闪光提示 */
    stuck: !s.done && expectedChoice(maze, s.visited, cur) === BACK,
  };
}

export const exploreRules: GameRules<ExploreState, ExploreAction> = {
  start: () => ({ state: exploreFresh(0), say: msg('explore.start') }),
  act(s, a) {
    if (a.type === 'again') {
      if (!s.done) return null;
      return { state: exploreFresh((s.which + 1) % PLAY_MAZES.length, s), say: msg('explore.start') };
    }
    if (s.done) return null;
    const c = a.c;
    const maze = parseMaze(PLAY_MAZES[s.which]);
    const cur = s.path[s.path.length - 1];
    const v = judgeChoice(maze, s.visited, cur, c);
    const nb = c === BACK ? null : around(maze, cur)[c];
    const bump = (old: [Choice, number] | null): [Choice, number] => [c, (old?.[1] ?? 0) + 1];
    const cellShake = (): [number, number] => [nb!, (s.shake?.[1] ?? 0) + 1];
    if (v.kind !== 'ok') {
      const base = { ...s, misses: s.misses + 1, padShake: bump(s.padShake) };
      if (v.kind === 'wall') {
        return {
          state: nb === null ? base : { ...base, shake: cellShake() },
          say: msg(nb === null ? 'explore.wallOut' : 'explore.wall', { dir: msg('dir.' + c) }),
          sound: 'wrong',
        };
      }
      if (v.kind === 'crumb') return { state: { ...base, shake: cellShake() }, say: msg('explore.crumb', { dir: msg('dir.' + c) }), sound: 'wrong' };
      // skip / notBack：该走的方向透出光
      if (v.kind !== 'skip' && v.kind !== 'notBack') return null;
      const better = v.better as Choice;
      return {
        state: { ...base, padGlow: [better, (s.padGlow?.[1] ?? 0) + 1], glow: [around(maze, cur)[better]!], glowKey: s.glowKey + 1 },
        say: v.kind === 'skip' ? msg('explore.skip', { dir: msg('dir.' + c), better: msg('dir.' + better) }) : msg('explore.notBack', { better: msg('dir.' + better) }),
        sound: 'wrong',
      };
    }
    if (c === BACK) {
      const path = s.path.slice(0, -1);
      const open = expectedChoice(maze, s.visited, path[path.length - 1]);
      return {
        state: { ...s, path, steps: s.steps + 1, backs: s.backs + 1 },
        say: msg(open === BACK ? 'explore.backAgain' : 'explore.backFork'),
        sound: 'right',
      };
    }
    const to = nb!;
    const visited = s.visited.map((x, id) => x || id === to);
    const path = [...s.path, to];
    const next: ExploreState = { ...s, path, visited, steps: s.steps + 1 };
    if (to === maze.end) return { state: { ...next, done: true }, say: msg('explore.found'), sound: 'win' };
    const after = expectedChoice(maze, visited, to);
    return { state: next, say: msg(after === BACK ? 'explore.dead' : 'explore.go', { dir: msg('dir.' + c) }), sound: 'right' };
  },
  clickable: () => false,
  controls: (s): Control<ExploreAction>[] => (s.done ? [{ type: 'button', action: { type: 'again' }, label: msg('explore.again'), look: 'primary' }] : []),
  result: (s) => (s.done
    ? {
        stars: exploreStars(s.misses),
        art: {
          scene: 'Note',
          props: { before: msg('explore.winA', { steps: s.steps, backs: s.backs }), bold: msg('explore.winB'), after: msg('explore.winC') },
        },
      }
    : null),
};

/* 玩法二「数一数小岛」：点一块陆地，探险家用 DFS 涂满整座岛 */

export interface IslandsState {
  which: number;
  /** 已经涂好的岛，按点击的先后 */
  painted: number[][];
  /** 正在涂的岛，已经亮了几格 */
  filling: { cells: number[]; lit: number } | null;
  misses: number;
  phase: 'pick' | 'count' | 'won';
  shake: [number, number] | null;
  glow: number[];
  glowKey: number;
  /** 数错的那个数字，[数字, 第几次] */
  wrongNum: [number, number] | null;
}
export type IslandsAction = { type: 'tap'; id: number } | { type: 'count'; n: number } | { type: 'again' };

function islandsFresh(which: number, prev?: IslandsState): IslandsState {
  return {
    which, painted: [], filling: null, misses: 0, phase: 'pick', shake: prev?.shake ?? null, glow: [], glowKey: prev?.glowKey ?? 0, wrongNum: null,
  };
}

/** 玩法二画面要画的东西 */
export function islandsView(s: IslandsState) {
  const map = parseIslands(ISLAND_MAPS[s.which]);
  const total = islands(map).length;
  const tones: Record<number, Tone> = {};
  for (let id = 0; id < map.w * map.h; id++) tones[id] = isLand(map, id) ? 'land' : 'sea';
  s.painted.forEach((isl, k) => isl.forEach((id) => (tones[id] = ('i' + (k % 4)) as Tone)));
  const f = s.filling;
  if (f) f.cells.slice(0, f.lit).forEach((id) => (tones[id] = ('i' + (s.painted.length % 4)) as Tone));
  const emojis: Record<number, string> = {};
  if (f && f.lit > 0 && f.lit <= f.cells.length) emojis[f.cells[f.lit - 1]] = '🧭';
  const labels: Record<number, number> = {};
  s.painted.forEach((isl, k) => (labels[isl[0]] = k + 1));
  return { map, total, tones, emojis, labels, choices: islandChoices(total) };
}

export const islandsRules: GameRules<IslandsState, IslandsAction> = {
  start: () => ({ state: islandsFresh(0), say: msg('islands.start') }),
  act(s, a) {
    if (a.type === 'again') {
      if (s.phase !== 'won') return null;
      return { state: islandsFresh((s.which + 1) % ISLAND_MAPS.length, s), say: msg('islands.start') };
    }
    const map = parseIslands(ISLAND_MAPS[s.which]);
    const total = islands(map).length;
    if (a.type === 'count') {
      if (s.phase !== 'count') return null;
      if (a.n === total) return { state: { ...s, phase: 'won' }, say: msg('islands.right', { n: a.n }), sound: 'win' };
      return {
        state: { ...s, misses: s.misses + 1, wrongNum: [a.n, (s.wrongNum?.[1] ?? 0) + 1] },
        say: msg('islands.notN', { n: a.n }),
        sound: 'wrong',
      };
    }
    if (s.phase !== 'pick' || s.filling) return null;
    const j = judgeIslandTap(map, new Set(s.painted.flat()), a.id);
    if (j === 'sea') {
      return { state: { ...s, misses: s.misses + 1, shake: [a.id, (s.shake?.[1] ?? 0) + 1] }, say: msg('islands.sea'), sound: 'wrong' };
    }
    if (j === 'done') {
      return {
        state: { ...s, glow: s.painted.find((isl) => isl.includes(a.id))!, glowKey: s.glowKey + 1 },
        say: msg('islands.done'),
        sound: 'wrong',
      };
    }
    const cells = floodFill(map, a.id);
    return { state: { ...s, filling: { cells, lit: 0 } }, say: msg('islands.fill', { n: cells.length }), sound: 'tap', after: FILL_STEP };
  },
  tick(s) {
    const f = s.filling;
    if (!f) return { state: s };
    if (f.lit < f.cells.length) {
      const lit = f.lit + 1;
      return { state: { ...s, filling: { cells: f.cells, lit } }, after: lit < f.cells.length ? FILL_STEP : FILL_END };
    }
    // 涂完了这座岛
    const painted = [...s.painted, f.cells];
    const total = islands(parseIslands(ISLAND_MAPS[s.which])).length;
    if (painted.length === total) return { state: { ...s, painted, filling: null, phase: 'count' }, say: msg('islands.allDone'), sound: 'right' };
    return { state: { ...s, painted, filling: null }, say: msg('islands.oneDone', { k: painted.length }), sound: 'right' };
  },
  // 切标签：涂到一半的岛按没点过算，回到「点陆地」
  interrupt: (s) => (s.filling ? { state: { ...s, filling: null, wrongNum: null }, say: msg('islands.start') } : { state: { ...s, wrongNum: null } }),
  clickable: (s) => s.phase === 'pick' && !s.filling,
  controls: (s): Control<IslandsAction>[] => (s.phase === 'won' ? [{ type: 'button', action: { type: 'again' }, label: msg('islands.again'), look: 'primary' }] : []),
  result: (s) => (s.phase === 'won'
    ? {
        stars: exploreStars(s.misses),
        art: { scene: 'Note', props: { before: msg('islands.winA'), bold: msg('islands.winB'), after: msg('islands.winC') } },
      }
    : null),
};

/* 挑战：DFS 的第 k 个格子 */

export interface ChallengeState {
  rows: string[];
  k: number;
  phase: 'ask' | 'right' | 'wrong';
  hinted: boolean;
  picked: number | null;
  shake: [number, number] | null;
  hint: Msg | null;
  wins: number;
}
export type ChallengeAction = { type: 'tap'; id: number } | { type: 'hint' } | { type: 'again'; newMaze: boolean };

/** 挑战画面要画的东西 */
export function challengeView(s: ChallengeState) {
  const maze = parseMaze(s.rows);
  const dfsOrder = visitOrder(maze, 'dfs');
  const bfsOrder = visitOrder(maze, 'bfs');
  const target = dfsOrder[s.k - 1];
  const bfsTarget = bfsOrder[s.k - 1];
  const hintCount = Math.ceil((s.k - 1) / 2);
  const shown = s.phase === 'ask' ? (s.hinted ? hintCount : 0) : s.k;
  const tones: Record<number, Tone> = {};
  dfsOrder.slice(0, shown).forEach((id) => (tones[id] = 'path'));
  if (s.phase !== 'ask') {
    tones[bfsTarget] = 'nb';
    tones[target] = 'best';
    if (s.picked !== null && s.picked !== target) tones[s.picked] = 'miss';
  }
  const labels: Record<number, number> = {};
  dfsOrder.slice(0, shown).forEach((id, i) => (labels[id] = i + 1));
  return {
    maze, dfsOrder, bfsOrder, target, bfsTarget, hintCount, tones, labels,
    walls: wallsOf(maze), emojis: emojisOf(maze, null),
    targetCoord: coord(maze, target), bfsCoord: coord(maze, bfsTarget),
  };
}

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start(rand) {
    const q = genChallenge(rand);
    return { state: { rows: q.maze, k: q.k, phase: 'ask', hinted: false, picked: null, shake: null, hint: null, wins: 0 } };
  },
  act(s, a, rand) {
    if (a.type === 'again') {
      if (s.phase === 'ask') return null;
      const rows = a.newMaze ? genChallenge(rand) : null;
      const base = { ...s, phase: 'ask' as const, hinted: false, picked: null, hint: null };
      if (rows) return { state: { ...base, rows: rows.maze, k: rows.k } };
      return { state: { ...base, k: challengeK(rand) } };
    }
    if (s.phase !== 'ask') return null;
    if (a.type === 'hint') return s.hinted ? null : { state: { ...s, hinted: true } };
    const maze = parseMaze(s.rows);
    if (isWall(maze, a.id)) return { state: { ...s, shake: [a.id, (s.shake?.[1] ?? 0) + 1], hint: msg('chal.rock') } };
    const right = a.id === visitOrder(maze, 'dfs')[s.k - 1];
    return { state: { ...s, hint: null, picked: a.id, phase: right ? 'right' : 'wrong', wins: s.wins + (right ? 1 : 0) } };
  },
  clickable: (s) => s.phase === 'ask',
  controls(s): Control<ChallengeAction>[] {
    if (s.phase === 'ask') {
      return [{ type: 'button', action: { type: 'hint' }, label: msg('chal.hint', { n: Math.ceil((s.k - 1) / 2) }), look: 'small', disabled: s.hinted }];
    }
    return [
      { type: 'button', action: { type: 'again', newMaze: false }, label: msg('chal.sameCave'), look: 'smallPrimary' },
      { type: 'button', action: { type: 'again', newMaze: true }, label: msg('chal.newCave'), look: 'small' },
    ];
  },
  result(s) {
    if (s.phase === 'ask') return null;
    const v = challengeView(s);
    if (s.phase === 'right') {
      return {
        title: msg('chal.right', { k: s.k, c: v.targetCoord }),
        body: msg('chal.rightBody', {
          k: s.k, c: v.bfsCoord, same: msg(v.bfsTarget === v.target ? 'chal.same' : 'chal.differ'),
        }),
        art: { scene: 'Note', props: { before: msg('chal.count', { dfs: v.dfsOrder.length, bfs: v.bfsOrder.length }), small: true } },
      };
    }
    return {
      title: msg('chal.wrong', { k: s.k, c: v.targetCoord }),
      body: msg('chal.wrongBody', {
        k: s.k,
        who: s.picked === v.bfsTarget ? msg('chal.pickedBfs', { k: s.k }) : msg('chal.otherBfs', { k: s.k }),
      }),
    };
  },
};

/* 做：逐步执行 */

export interface TraceInput { which: number }
export type TraceAction = { type: 'which'; which: number };

const traceMaze = (input: TraceInput) => parseMaze(TRACE_MAZES[input.which].rows);
const topOf = (s: DfsStep) => s.stack[s.stack.length - 1];
const coordOfTop = (s: DfsStep) => {
  const top = topOf(s);
  return top ? '(' + top[0] + ',' + top[1] + ')' : '—';
};

export const traceRules: TraceRules<TraceInput, DfsStep, TraceAction> = {
  code: CODE,
  start: () => ({ which: 0 }),
  act: (_input, a) => ({ which: a.which }),
  controls: (input): Control<TraceAction>[] => [{
    type: 'segmented', legend: msg('trace.mazeLegend'), value: input.which,
    options: TRACE_MAZES.map((t, k) => ({ value: k, label: t.label })),
    choose: (v) => ({ type: 'which', which: Number(v) }),
  }],
  trace: (input) => buildTrace(traceMaze(input)),
  vars: (_input, s): Var[] => [
    ['(r, c)', coordOfTop(s)],
    [msg('trace.var.depth'), s.stack.length],
    [msg('trace.var.calls'), s.calls],
    [msg('trace.var.visited'), s.order.length],
  ],
  summary(_input, s) {
    if (!s.done) return null;
    return s.result ? msg('trace.sumTrue', { calls: s.calls, n: s.order.length }) : msg('trace.sumFalse', { n: s.order.length });
  },
  jump: { label: msg('trace.jumpMark'), stop: (x) => x.line === L.mark },
  jumps: [{ label: msg('trace.jumpBack'), stop: (x) => x.line === L.back }],
  foot: msg('trace.foot'),
};

/* 做：猜下一步 */

/** 猜下一步每一问时画面的样子 */
export interface PredictView {
  rows: string[];
  /** 探险家站的格子 */
  cur: number;
  /** 从起点到 cur 的路（调用栈） */
  path: number[];
  visited: boolean[];
  /** 选了「回溯」以后的第二问：要点路上的一个路口 */
  back: boolean;
}
/** 回答：点一个格子（格子号），或者点「回溯」「是宝藏」 */
export type PredictAnswer = number | 'back' | 'end';

export const predictRules: PredictRules<PredictView, PredictAnswer> = {
  goal: 5,
  puzzle(rand): Puzzle<PredictView, PredictAnswer> {
    const rows = genPredict(rand);
    const mz = parseMaze(rows);
    const list = rounds(mz);
    const chips = (k: number): Var[] => [['第', msg('predict.chip', { n: k + 1 })]];
    const view = (r: Round, back: boolean): PredictView => ({ rows, cur: r.cur, path: r.path, visited: r.visited, back });
    const options = [
      { value: 'back' as const, label: msg('predict.back') },
      { value: 'end' as const, label: msg('predict.treasure') },
    ];
    const asks: Puzzle<PredictView, PredictAnswer>['asks'] = [];
    list.forEach((r, k) => {
      const a = r.answer;
      const twoStep = a.kind === 'back' && a.to !== null;
      asks.push({
        view: view(r, false),
        prompt: r.ask,
        kind: 'pick',
        answer: a.kind === 'go' ? a.to : a.kind,
        options,
        why: r.why,
        chips: chips(k),
        ...(twoStep ? { half: true } : { praise: r.right }),
      });
      if (twoStep) {
        asks.push({ view: view(r, true), prompt: r.askBack, kind: 'pick', answer: a.to!, why: r.why, chips: chips(k), praise: r.right });
      }
    });
    const last = list.length - 1;
    return { asks, end: { view: view(list[last], false), prompt: list[last].endNote, chips: chips(last) } };
  },
};

/* 做：找 bug */

export const bugRules: BugRules<Bug, DfsStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => msg('bug.input', { expect: bug.expect }),
  vars: (s): Var[] => [
    ['(r, c)', coordOfTop(s)],
    [msg('trace.var.depth'), s.stack.length],
    [msg('trace.var.calls'), s.calls],
  ],
  verdict: bugVerdict,
  jumps: [
    { label: msg('trace.jumpMark'), stop: (x) => x.line === L.mark },
    { label: msg('bug.jumpEnd'), stop: (x) => x.done },
  ],
};

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { explore: exploreRules, islands: islandsRules, challenge: challengeRules },
};
