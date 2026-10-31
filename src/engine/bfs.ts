import { m as msg } from '../core/i18n';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, PredictRules, Puzzle, Rand, Step, Trace, TraceRules, Var,
} from '../core/types';

/*
 * 广度优先搜索（BFS）：小老鼠走迷宫。
 *
 * 迷宫是一组字符串，'#' 墙、'.' 空地、'S' 起点（小老鼠）、'E' 终点（奶酪）。
 * 格子用一个整数 id = r * w + c 表示，r 是行、c 是列，都从 0 开始。
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
    if (row.length !== w) throw new Error('迷宫每一行要一样长');
    for (let c = 0; c < w; c++) {
      if (row[c] === 'S') start = r * w + c;
      if (row[c] === 'E') end = r * w + c;
    }
  });
  if (start < 0 || end < 0) throw new Error('迷宫要有 S 和 E');
  return { rows, w, h, start, end };
}

export const rowOf = (m: Maze, id: number) => Math.floor(id / m.w);
export const colOf = (m: Maze, id: number) => id % m.w;
export const isWall = (m: Maze, id: number) => m.rows[rowOf(m, id)][colOf(m, id)] === '#';
/** 「(行, 列)」，和 Kotlin 里的 Pair 写法一致 */
export const coord = (m: Maze, id: number) => '(' + rowOf(m, id) + ',' + colOf(m, id) + ')';

/** 四个方向，顺序和 Kotlin 代码里的 DIRS 一致：上、下、左、右 */
export const DIRS: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export const DIR_NAMES = ['上', '下', '左', '右'];

/** id 的四个方向上的格子，出界的是 null */
export function around(m: Maze, id: number): (number | null)[] {
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

export function isNeighbor(m: Maze, a: number, b: number): boolean {
  return around(m, a).includes(b);
}

/* ---------- 看、玩：一圈一圈的水波 ---------- */

export interface Waves {
  /** 每个格子离起点几步，走不到是 -1 */
  dist: number[];
  /** 每个格子是从哪一格走过来的，起点和走不到的是 -1 */
  parent: number[];
  /** rings[k]：正好 k 步能走到的格子，rings[0] = [起点] */
  rings: number[][];
}

/**
 * 按层的 BFS：一次把一整圈都走完，再走下一圈。
 * stopAtEnd 为真时，走到奶酪的那一圈走完就停。
 */
export function waves(m: Maze, stopAtEnd = true): Waves {
  const n = m.w * m.h;
  const dist = new Array<number>(n).fill(-1);
  const parent = new Array<number>(n).fill(-1);
  const rings: number[][] = [[m.start]];
  dist[m.start] = 0;
  for (;;) {
    const last = rings[rings.length - 1];
    if (stopAtEnd && last.includes(m.end)) break;
    const next: number[] = [];
    for (const id of last) {
      for (const nb of neighbors(m, id)) {
        if (dist[nb] !== -1) continue;
        dist[nb] = dist[id] + 1;
        parent[nb] = id;
        next.push(nb);
      }
    }
    if (!next.length) break;
    rings.push(next);
  }
  return { dist, parent, rings };
}

/** 顺着 parent 从 to 倒着走回起点，再翻过来；走不到返回 [] */
export function pathTo(wv: Waves, to: number): number[] {
  if (wv.dist[to] < 0) return [];
  const out = [to];
  while (wv.parent[out[out.length - 1]] !== -1) out.push(wv.parent[out[out.length - 1]]);
  return out.reverse();
}

/** 起点到奶酪最少几步，走不到是 -1 */
export function bestSteps(m: Maze): number {
  return waves(m).dist[m.end];
}

/**
 * 看和玩用的 7×7 迷宫。小老鼠在中间，水波往四面八方扩散；
 * 每个迷宫都有绕圈的岔路，所以「随便走」和「最短」不一样。
 */
export const KID_MAZES: string[][] = [
  [
    '...#...',
    '.#.#.#.',
    '.#...#.',
    '...S.#.',
    '##.#...',
    '...#.#.',
    '.#...#E',
  ],
  [
    'E...#..',
    '.#.....',
    '.#.##.#',
    '...S#..',
    '##.##.#',
    '.......',
    '.###.#.',
  ],
  [
    '.......',
    '.##.##.',
    '.#...#.',
    '.#.S.#.',
    '.#...#.',
    '.##.##.',
    '......E',
  ],
];

/* ---------- 看：绘本 ---------- */

/** 格子的色调（画面 Maze.vue 按它上色）；看里只用走过的、这一圈、最短路 */
export type Tone = 'old' | 'ring' | 'path' | 'mine' | 'queued' | 'cur' | 'nb' | 'pick' | 'best' | 'miss';
export type LookTone = 'old' | 'ring' | 'path';

export interface LookPage extends LookFrame {
  /** 迷宫本身（画面据此画格子） */
  rows: string[];
  tones: Record<number, LookTone>;
  /** 格子里写的数字：离起点几步 */
  labels: Record<number, number>;
  /** 小老鼠站在哪一格 */
  mouse: number;
}

/** 绘本的全部页：每一圈水波都由 waves（按层的 BFS）生成，和真实的搜索过程一致，台词也在这里 */
export function lookFrames(m: Maze): LookPage[] {
  const wv = waves(m);
  const best = wv.dist[m.end];
  const out: LookPage[] = [];
  const rows = m.rows;
  out.push({ say: msg('look.open'), rows, tones: {}, labels: {}, mouse: m.start });
  out.push({ say: msg('look.secret'), rows, tones: { [m.start]: 'ring' }, labels: { [m.start]: 0 }, mouse: m.start });
  const tones: Record<number, LookTone> = { [m.start]: 'old' };
  const labels: Record<number, number> = { [m.start]: 0 };
  for (let k = 1; k < wv.rings.length; k++) {
    const ring = wv.rings[k];
    const now = { ...tones };
    for (const id of ring) {
      now[id] = 'ring';
      labels[id] = k;
    }
    const hit = ring.includes(m.end);
    out.push({
      say: hit ? msg('look.hit', { k }) : k === 1 ? msg('look.first', { n: ring.length }) : msg('look.more', { k, n: ring.length }),
      rows,
      tones: now,
      labels: { ...labels },
      mouse: m.start,
    });
    for (const id of ring) tones[id] = 'old';
  }
  const path = pathTo(wv, m.end);
  const pathTones: Record<number, LookTone> = { ...tones };
  for (const id of path) pathTones[id] = 'path';
  out.push({ say: msg('look.back', { seq: Array.from({ length: best + 1 }, (_, k) => best - k).join(' → ') }), rows, tones: pathTones, labels: { ...labels }, mouse: m.start });
  out.push({ say: msg('look.end', { best }), rows, tones: pathTones, labels: { ...labels }, mouse: m.end });
  return out;
}

/* ---------- 玩法一「下一圈」 ---------- */

/** 'ok' 涂对了；'cheese' 涂对了而且是奶酪；'wall' 是墙；'painted' 已经涂过；'far' 这一圈还到不了 */
export type RingTap = 'ok' | 'cheese' | 'wall' | 'painted' | 'far';

/**
 * 孩子正在涂第 ring 圈（ring 步能到的格子），点了 id。
 * painted 是这一圈里已经涂好的格子。之前的圈都已经涂满。
 */
export function judgeRingTap(m: Maze, dist: number[], ring: number, painted: Set<number>, id: number): RingTap {
  if (isWall(m, id)) return 'wall';
  if (painted.has(id) || (dist[id] >= 0 && dist[id] < ring)) return 'painted';
  if (dist[id] === ring) return id === m.end ? 'cheese' : 'ok';
  return 'far';
}

/** 点错几次换几颗星：0～1 次三颗，2～4 次两颗，其余一颗 */
export function ringStars(misses: number): 1 | 2 | 3 {
  return misses <= 1 ? 3 : misses <= 4 ? 2 : 1;
}

/* ---------- 玩法二、挑战：自己画路 ---------- */

/** 'ok' 往前走一格；'back' 点了路上已有的格子，退回到那里；'wall' 墙；'far' 不挨着路的最后一格 */
export type DrawTap = 'ok' | 'back' | 'wall' | 'far';

/** path 从起点开始，点 id 会发生什么 */
export function judgeDrawTap(m: Maze, path: number[], id: number): DrawTap {
  if (isWall(m, id)) return 'wall';
  if (path.includes(id)) return 'back';
  return isNeighbor(m, path[path.length - 1], id) ? 'ok' : 'far';
}

/** 应用一次点击，返回新的路 */
export function applyDrawTap(m: Maze, path: number[], id: number): number[] {
  const j = judgeDrawTap(m, path, id);
  if (j === 'ok') return [...path, id];
  if (j === 'back') return path.slice(0, path.indexOf(id) + 1);
  return path;
}

/** 自己画的路走了几步，和最短的比：一样三颗星，多 2 步以内两颗，其余一颗 */
export function routeStars(steps: number, best: number): 1 | 2 | 3 {
  return steps <= best ? 3 : steps <= best + 2 ? 2 : 1;
}

/** 可以复现的伪随机数（mulberry32），挑战的迷宫用它生成，测试也用它 */
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
 * 生成一个 (2·rooms − 1) 见方的迷宫：先用随机深度优先挖出一棵树（只有唯一的路），
 * 再随机拆掉 loops 比例的墙，造出绕圈的岔路。起点在左上角，奶酪在右下角。
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

/** 挑战用的迷宫：11×11，保证「顺着墙随便走」通常不是最短 */
export const CHALLENGE_ROOMS = 6;
export const CHALLENGE_LOOPS = 0.25;

/** 挑战出题：一个新的 11×11 迷宫 */
export function genChallenge(rand: () => number = Math.random): string[] {
  return genMaze(CHALLENGE_ROOMS, CHALLENGE_LOOPS, rand);
}

/** 猜下一步用的迷宫：7×7，岔路多一点 */
export const PREDICT_ROOMS = 4;
export const PREDICT_LOOPS = 0.3;

/** 猜下一步出题：一个新的 7×7 迷宫 */
export function genPredict(rand: () => number = Math.random): string[] {
  return genMaze(PREDICT_ROOMS, PREDICT_LOOPS, rand);
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun shortestPath(grid: List<String>): Int {',
  '    val h = grid.size',
  '    val w = grid[0].length',
  "    val start = findCell(grid, 'S')",
  '    val dist = Array(h) { IntArray(w) }',
  '    val visited = Array(h) { BooleanArray(w) }',
  '    val queue = ArrayDeque<Pair<Int, Int>>()',
  '    queue.addLast(start)',
  '    visited[start.first][start.second] = true',
  '    while (queue.isNotEmpty()) {',
  '        val (r, c) = queue.removeFirst()',
  "        if (grid[r][c] == 'E') return dist[r][c]",
  '        for ((dr, dc) in DIRS) {',
  '            val nr = r + dr',
  '            val nc = c + dc',
  '            if (nr !in 0 until h || nc !in 0 until w) continue',
  "            if (grid[nr][nc] == '#' || visited[nr][nc]) continue",
  '            visited[nr][nc] = true',
  '            dist[nr][nc] = dist[r][c] + 1',
  '            queue.addLast(nr to nc)',
  '        }',
  '    }',
  '    return -1',
  '}',
];

/** 代码里几处关键的行号，引擎和界面都用它们，避免写死数字 */
export const L = {
  init: 9,
  loop: 10,
  pop: 11,
  isEnd: 12,
  bounds: 16,
  skip: 17,
  mark: 18,
  dist: 19,
  push: 20,
  fail: 23,
} as const;

export interface BfsStep extends Step {
  /** 队列内容，队首在前 */
  queue: number[];
  visited: boolean[];
  /** visited 为假的格子，dist 没有意义（Kotlin 里是 0） */
  dist: number[];
  /** 刚出队、正在处理的格子 */
  cur: number | null;
  /** 正在看的邻居（可能出界，出界时是 null） */
  nb: number | null;
  /** 返回值，没返回时是 null */
  result: number | null;
  /** 一共入队了几次（起点算一次） */
  pushes: number;
  /** 'ok' 正常返回；'explode' 队列爆炸；'crash' 下标越界 */
  outcome: 'running' | 'ok' | 'explode' | 'crash';
}

/** 一个写法：正确的代码，或者某个 bug 版本 */
interface Flavor {
  /** 第 17 行有没有检查 visited */
  checkVisited: boolean;
  /** 第 11 行从哪头取：队首（队列）还是队尾（栈） */
  take: 'first' | 'last';
  /** 第 16 行的范围：0 until h，还是多了一格的 0..h */
  range: 'until' | 'inclusive';
}

const CORRECT: Flavor = { checkVisited: true, take: 'first', range: 'until' };

/** 队列超过这么长就判定为爆炸（迷宫一共才几十个格子） */
export const EXPLODE_AT = 60;
/** 步数上限，防止任何写法跑不停 */
const MAX_STEPS = 20000;

function simulate(m: Maze, f: Flavor): BfsStep[] {
  const n = m.w * m.h;
  const steps: BfsStep[] = [];
  const visited = new Array<boolean>(n).fill(false);
  const dist = new Array<number>(n).fill(0);
  const queue: number[] = [];
  let pushes = 0;
  let cur: number | null = null;
  const push = (line: number, note: Msg, extra: Partial<BfsStep> = {}) => {
    steps.push({
      line, note, done: false, queue: [...queue], visited: [...visited], dist: [...dist],
      cur, nb: null, result: null, pushes, outcome: 'running', ...extra,
    });
  };
  const c = (id: number) => coord(m, id);
  const nameOf = (k: number, nr: number, nc: number) => msg('trace.nb', { dir: msg('dir.' + k), r: nr, c: nc });

  queue.push(m.start);
  pushes++;
  visited[m.start] = true;
  push(L.init, msg('trace.init', { c: c(m.start) }));

  while (steps.length < MAX_STEPS) {
    push(L.loop, queue.length ? msg('trace.loopMore', { n: queue.length }) : msg('trace.loopEmpty'));
    if (!queue.length) break;
    cur = f.take === 'first' ? queue.shift()! : queue.pop()!;
    push(L.pop, msg(f.take === 'first' ? 'trace.popFirst' : 'trace.popLast', { c: c(cur), d: dist[cur] }));
    if (cur === m.end) {
      push(L.isEnd, msg('trace.end', { c: c(cur), d: dist[cur] }), { result: dist[cur], outcome: 'ok', done: true });
      return steps;
    }
    const r = rowOf(m, cur);
    const cc = colOf(m, cur);
    for (let k = 0; k < 4; k++) {
      const nr = r + DIRS[k][0];
      const nc = cc + DIRS[k][1];
      const name = nameOf(k, nr, nc);
      const inRange = (v: number, size: number) => v >= 0 && (f.range === 'until' ? v < size : v <= size);
      if (!inRange(nr, m.h) || !inRange(nc, m.w)) {
        push(L.bounds, msg('trace.out', { name }));
        continue;
      }
      if (nr >= m.h || nc >= m.w) {
        push(L.skip, msg('trace.crash', { nr, nc, what: nr >= m.h ? msg('trace.row', { n: nr }) : msg('trace.col', { n: nc }) }), {
          outcome: 'crash', done: true,
        });
        return steps;
      }
      const id = nr * m.w + nc;
      if (isWall(m, id) || (f.checkVisited && visited[id])) {
        push(L.skip, msg(isWall(m, id) ? 'trace.wall' : 'trace.seen', { name }), { nb: id });
        continue;
      }
      const again = visited[id];
      visited[id] = true;
      push(L.mark, msg(again ? 'trace.markAgain' : 'trace.markNew', { name }), { nb: id });
      const before = dist[id];
      dist[id] = dist[cur] + 1;
      const changed = again && before !== dist[id];
      push(L.dist, msg(changed ? 'trace.distChanged' : 'trace.dist', { c: c(id), a: dist[cur], b: dist[id], before }), { nb: id });
      queue.push(id);
      pushes++;
      if (queue.length > EXPLODE_AT) {
        push(L.push, msg('trace.explode', { c: c(id), n: queue.length, open: openCount(m) }), {
          nb: id, outcome: 'explode', done: true,
        });
        return steps;
      }
      push(L.push, msg('trace.push', { c: c(id) }), { nb: id });
    }
  }
  if (steps.length >= MAX_STEPS) {
    push(L.loop, msg('trace.tooLong'), { outcome: 'explode', done: true });
    return steps;
  }
  push(L.fail, msg('trace.fail'), { result: -1, outcome: 'ok', done: true });
  return steps;
}

/** 迷宫里有几个不是墙的格子 */
export function openCount(m: Maze): number {
  return m.rows.join('').split('').filter((ch) => ch !== '#').length;
}

/** 正确代码的逐步执行 */
export function buildTrace(m: Maze): Trace<BfsStep> {
  return simulate(m, CORRECT);
}

/** 逐步执行用的迷宫：三个看和玩里的迷宫，再加一个奶酪被墙围住、走不到的 */
export const TRACE_MAZES: { label: Msg; rows: string[] }[] = [
  ...KID_MAZES.map((rows, k) => ({ label: msg('trace.maze', { n: k + 1 }), rows })),
  {
    label: msg('trace.mazeNone'),
    rows: [
      '...#...',
      '.#.#.#.',
      '.#...#.',
      '...S.#.',
      '##.#...',
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

/** 每次出队是一道题：哪些邻居会入队（或者它就是终点） */
export interface Round {
  cur: number;
  /** 出队之前的队列（cur 在队首） */
  queue: number[];
  /** 出队那一刻的 visited 和 dist */
  visited: boolean[];
  dist: number[];
  isEnd: boolean;
  /** 会入队的格子，按入队顺序 */
  pushed: number[];
  checks: Check[];
  /** 答错时的解释：四个方向逐个讲，一行一个方向（用换行分隔） */
  why: Msg;
}

/** 一次出队的解释：终点直接返回，否则四个方向逐个看 */
function explainRound(m: Maze, cur: number, isEnd: boolean, dist: number[], checks: Check[]): Msg {
  if (isEnd) return msg('predict.why.end', { c: coord(m, cur), line: L.isEnd, d: dist[cur] });
  const lines = checks.map((c) => {
    const name = c.id === null ? msg('predict.name.edge', { dir: msg('dir.' + c.dir) }) : msg('predict.name', { dir: msg('dir.' + c.dir), c: coord(m, c.id) });
    if (c.why === 'out') return msg('predict.why.out', { name });
    if (c.why === 'wall') return msg('predict.why.wall', { name });
    if (c.why === 'seen') return msg('predict.why.seen', { name });
    return msg('predict.why.new', { name, d: dist[cur] + 1 });
  });
  return msg('predict.why.dirs', { l0: lines[0], l1: lines[1], l2: lines[2], l3: lines[3] });
}

export function rounds(m: Maze): Round[] {
  const out: Round[] = [];
  const steps = buildTrace(m);
  steps.forEach((s, k) => {
    if (s.line !== L.pop) return;
    const before = steps[k - 1];
    const cur = s.cur!;
    const checks: Check[] = around(m, cur).map((id, dir) => ({
      dir,
      id,
      why: id === null ? 'out' : isWall(m, id) ? 'wall' : s.visited[id] ? 'seen' : 'new',
    }));
    const isEnd = cur === m.end;
    out.push({
      cur, queue: before.queue, visited: s.visited, dist: s.dist, isEnd,
      pushed: isEnd ? [] : checks.filter((x) => x.why === 'new').map((x) => x.id!),
      checks,
      why: explainRound(m, cur, isEnd, s.dist, checks),
    });
  });
  return out;
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'no-visited' | 'stack' | 'range';
  /** 输入：运行这段代码的迷宫 */
  maze: string[];
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

const FLAVORS: Record<Bug['id'], Flavor> = {
  'no-visited': { ...CORRECT, checkVisited: false },
  stack: { ...CORRECT, take: 'last' },
  range: { ...CORRECT, range: 'inclusive' },
};

export const BUGS: readonly Bug[] = [
  {
    id: 'no-visited',
    title: msg('bug.noVisited.title'),
    code: variant(L.skip, "            if (grid[nr][nc] == '#') continue"),
    wrongLine: L.skip,
    fixed: CODE[L.skip - 1],
    maze: [
      'S....',
      '.....',
      '.....',
      '.....',
      '....E',
    ],
    expect: msg('bug.noVisited.expect'),
    explain: msg('bug.noVisited.explain'),
  },
  {
    id: 'stack',
    title: msg('bug.stack.title'),
    code: variant(L.pop, '        val (r, c) = queue.removeLast()'),
    wrongLine: L.pop,
    fixed: CODE[L.pop - 1],
    maze: [
      'S...',
      '....',
      '....',
      'E...',
    ],
    expect: msg('bug.stack.expect'),
    explain: msg('bug.stack.explain'),
  },
  {
    id: 'range',
    title: msg('bug.range.title'),
    code: variant(L.bounds, '            if (nr !in 0..h || nc !in 0..w) continue'),
    wrongLine: L.bounds,
    fixed: CODE[L.bounds - 1],
    maze: [
      'S..#',
      '.#.E',
      '....',
      '....',
    ],
    expect: msg('bug.range.expect'),
    explain: msg('bug.range.explain'),
  },
];

export function runBug(bug: Bug): Trace<BfsStep> {
  return simulate(parseMaze(bug.maze), FLAVORS[bug.id]);
}

/** 找 bug 面板底部的判定：没跑完是 null */
export function bugVerdict(step: BfsStep, bug: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'explode') return msg('bug.verdict.explode', { n: step.queue.length, pushes: step.pushes });
  if (step.outcome === 'crash') return msg('bug.verdict.crash');
  return msg('bug.verdict.wrong', { r: step.result!, best: bestSteps(parseMaze(bug.maze)) });
}

/* ---------- 关卡模块：规则（level.json 按名字引用） ---------- */

const mazeOf = (rows: string[]) => parseMaze(rows);

/* 看 */

export const lookRules: LookRules<number, LookPage> = {
  first: 0,
  next: (prev) => (prev + 1) % KID_MAZES.length,
  frames: (which) => lookFrames(parseMaze(KID_MAZES[which])),
};

/* 玩法一「下一圈」：孩子当水波，一圈一圈涂格子 */

export interface RingsState {
  which: number;
  /** 正在涂第几圈（ring 步能到的格子） */
  ring: number;
  /** 这一圈已经涂好的格子 */
  painted: number[];
  misses: number;
  done: boolean;
  /** 摇头的格子，[格子, 第几次]；画面据此晃一下 */
  shake: [number, number] | null;
  /** 透光提示的格子；glowKey 每加一次就重新闪一遍 */
  glow: number[];
  glowKey: number;
}
export type RingsAction = { type: 'tap'; id: number } | { type: 'again' };

function ringsFresh(which: number, prev?: RingsState): RingsState {
  return { which, ring: 1, painted: [], misses: 0, done: false, shake: prev?.shake ?? null, glow: [], glowKey: prev?.glowKey ?? 0 };
}

/** 玩法一画面要画的东西：迷宫、格子的色调和数字、这一圈一共几格 */
export function ringsView(s: RingsState) {
  const maze = mazeOf(KID_MAZES[s.which]);
  const wv = waves(maze);
  const cells = wv.rings[s.ring] ?? [];
  const tones: Record<number, Tone> = {};
  const labels: Record<number, number> = {};
  for (let k = 0; k < s.ring; k++) {
    for (const id of wv.rings[k]) {
      tones[id] = 'old';
      labels[id] = k;
    }
  }
  for (const id of s.painted) {
    tones[id] = 'ring';
    labels[id] = s.ring;
  }
  if (s.done) for (const id of pathTo(wv, maze.end)) tones[id] = 'path';
  else tones[maze.start] = 'old';
  return { maze, tones, labels, total: cells.length, mouse: s.done ? maze.end : maze.start };
}

export const ringsRules: GameRules<RingsState, RingsAction> = {
  start: () => ({ state: ringsFresh(0), say: msg('rings.start') }),
  act(s, a) {
    if (a.type === 'again') {
      if (!s.done) return null;
      return { state: ringsFresh((s.which + 1) % KID_MAZES.length, s), say: msg('rings.start') };
    }
    if (s.done) return null;
    const maze = mazeOf(KID_MAZES[s.which]);
    const wv = waves(maze);
    const cells = wv.rings[s.ring] ?? [];
    const j = judgeRingTap(maze, wv.dist, s.ring, new Set(s.painted), a.id);
    const shake: [number, number] = [a.id, (s.shake?.[1] ?? 0) + 1];
    if (j === 'painted') return { state: { ...s, shake }, say: msg('rings.painted'), sound: 'wrong' };
    if (j === 'wall') return { state: { ...s, shake, misses: s.misses + 1 }, say: msg('rings.wall'), sound: 'wrong' };
    if (j === 'far') {
      return {
        state: { ...s, shake, misses: s.misses + 1, glow: wv.rings[s.ring - 1] ?? [], glowKey: s.glowKey + 1 },
        say: msg('rings.far', { k: s.ring - 1 }),
        sound: 'wrong',
      };
    }
    const painted = [...s.painted, a.id];
    if (j === 'cheese') return { state: { ...s, painted, done: true }, say: msg('rings.cheese', { k: s.ring }), sound: 'win' };
    if (painted.length === cells.length) {
      return { state: { ...s, painted: [], ring: s.ring + 1 }, say: msg('rings.ringDone', { k: s.ring }) };
    }
    return { state: { ...s, painted }, say: msg('rings.some', { n: painted.length, total: cells.length }), sound: 'right' };
  },
  clickable: (s) => !s.done,
  controls: (s): Control<RingsAction>[] => (s.done ? [{ type: 'button', action: { type: 'again' }, label: msg('rings.again'), look: 'primary' }] : []),
  result: (s) => (s.done ? { stars: ringStars(s.misses), body: msg('rings.win', { k: s.ring }) } : null),
};

/* 玩法二「抄近路」：自己点出一条路，和水波找到的最短路比一比 */

export interface DrawState {
  which: number;
  path: number[];
  done: boolean;
  /** 带着水波数字走 */
  numbers: boolean;
  shake: [number, number] | null;
}
export type DrawAction = { type: 'tap'; id: number } | { type: 'undo' } | { type: 'retry'; numbers: boolean } | { type: 'next' };

const drawStart = (which: number, numbers = false, shake: DrawState['shake'] = null): DrawState => ({
  which, path: [parseMaze(KID_MAZES[which]).start], done: false, numbers, shake,
});

/** 玩法二画面要画的东西 */
export function drawView(s: DrawState) {
  const maze = mazeOf(KID_MAZES[s.which]);
  const wv = waves(maze, false);
  const best = wv.dist[maze.end];
  const steps = s.path.length - 1;
  const tones: Record<number, Tone> = {};
  const labels: Record<number, number> = {};
  if (s.numbers) {
    wv.dist.forEach((d, id) => {
      if (d > 0) {
        tones[id] = 'old';
        labels[id] = d;
      }
    });
  } else s.path.slice(1).forEach((id, k) => (labels[id] = k + 1));
  if (s.done && steps > best) for (const id of pathTo(wv, maze.end)) tones[id] = 'path';
  for (const id of s.path.slice(1)) tones[id] = 'mine';
  return { maze, tones, labels, steps, best };
}

export const drawRules: GameRules<DrawState, DrawAction> = {
  start: () => ({ state: drawStart(1), say: msg('draw.start') }),
  act(s, a) {
    if (a.type === 'undo') {
      if (s.done || s.path.length < 2) return null;
      return { state: { ...s, path: s.path.slice(0, -1) } };
    }
    if (a.type === 'retry') {
      if (!s.done) return null;
      return { state: drawStart(s.which, a.numbers, s.shake), say: msg(a.numbers ? 'draw.retryNum' : 'draw.retry') };
    }
    if (a.type === 'next') {
      if (!s.done) return null;
      return { state: drawStart((s.which + 1) % KID_MAZES.length, false, s.shake), say: msg('draw.next') };
    }
    if (s.done) return null;
    const maze = mazeOf(KID_MAZES[s.which]);
    const j = judgeDrawTap(maze, s.path, a.id);
    if (j === 'wall' || j === 'far') {
      return { state: { ...s, shake: [a.id, (s.shake?.[1] ?? 0) + 1] }, say: msg(j === 'wall' ? 'draw.wall' : 'draw.far'), sound: 'wrong' };
    }
    const path = applyDrawTap(maze, s.path, a.id);
    if (j === 'back') return { state: { ...s, path }, say: msg('draw.back'), sound: 'tap' };
    const steps = path.length - 1;
    const best = waves(maze, false).dist[maze.end];
    if (a.id === maze.end) {
      return {
        state: { ...s, path, done: true },
        say: steps <= best ? msg('draw.best', { s: steps }) : msg('draw.longer', { s: steps, b: best }),
        sound: 'win',
      };
    }
    return { state: { ...s, path }, say: msg('draw.step', { s: steps }), sound: 'right' };
  },
  clickable: (s) => !s.done,
  controls(s): Control<DrawAction>[] {
    if (!s.done) return [];
    const { steps, best } = drawView(s);
    if (steps > best) {
      return [
        { type: 'button', action: { type: 'retry', numbers: false }, label: msg('draw.retryBtn'), look: 'primary' },
        { type: 'button', action: { type: 'retry', numbers: true }, label: msg('draw.numBtn') },
      ];
    }
    return [{ type: 'button', action: { type: 'next' }, label: msg('draw.nextBtn'), look: 'primary' }];
  },
  result(s) {
    if (!s.done) return null;
    const { steps, best } = drawView(s);
    return { stars: routeStars(steps, best), body: steps > best ? msg('draw.body') : undefined };
  },
};

/* 挑战：11×11 的迷宫，不看水波，自己点出一条路 */

export interface ChallengeState {
  rows: string[];
  path: number[];
  phase: 'play' | 'win' | 'lose';
  shake: [number, number] | null;
  /** 点错时的提示 */
  hint: Msg | null;
  wins: number;
}
export type ChallengeAction = { type: 'tap'; id: number } | { type: 'retry' } | { type: 'fresh' };

const challengeFresh = (rand: Rand | undefined, prev?: ChallengeState): ChallengeState => {
  const rows = genChallenge(rand);
  return { rows, path: [parseMaze(rows).start], phase: 'play', shake: prev?.shake ?? null, hint: null, wins: prev?.wins ?? 0 };
};

/** 挑战画面要画的东西 */
export function challengeView(s: ChallengeState) {
  const maze = mazeOf(s.rows);
  const wv = waves(maze);
  const best = wv.dist[maze.end];
  const tones: Record<number, Tone> = {};
  if (s.phase !== 'play') for (const id of pathTo(wv, maze.end)) tones[id] = 'best';
  for (const id of s.path.slice(1)) tones[id] = 'mine';
  return { maze, tones, best, steps: s.path.length - 1 };
}

export const challengeRules: GameRules<ChallengeState, ChallengeAction> = {
  start: (rand) => ({ state: challengeFresh(rand) }),
  act(s, a, rand) {
    if (a.type === 'fresh') return { state: challengeFresh(rand, s) };
    if (a.type === 'retry') {
      if (s.phase !== 'lose') return null;
      return { state: { ...s, path: [parseMaze(s.rows).start], phase: 'play', hint: null } };
    }
    if (s.phase !== 'play') return null;
    const maze = mazeOf(s.rows);
    const j = judgeDrawTap(maze, s.path, a.id);
    if (j === 'wall' || j === 'far') {
      return { state: { ...s, shake: [a.id, (s.shake?.[1] ?? 0) + 1], hint: msg(j === 'wall' ? 'chal.wall' : 'chal.far') } };
    }
    const path = applyDrawTap(maze, s.path, a.id);
    const next: ChallengeState = { ...s, path, hint: null };
    if (a.id === maze.end) {
      const steps = path.length - 1;
      if (steps <= waves(maze).dist[maze.end]) return { state: { ...next, phase: 'win', wins: s.wins + 1 } };
      return { state: { ...next, phase: 'lose' } };
    }
    return { state: next };
  },
  clickable: (s) => s.phase === 'play',
  controls(s): Control<ChallengeAction>[] {
    if (s.phase === 'win') return [{ type: 'button', action: { type: 'fresh' }, label: msg('chal.again'), look: 'small' }];
    if (s.phase === 'lose') {
      return [
        { type: 'button', action: { type: 'retry' }, label: msg('chal.retry'), look: 'small' },
        { type: 'button', action: { type: 'fresh' }, label: msg('chal.fresh'), look: 'small' },
      ];
    }
    return [];
  },
  result(s) {
    if (s.phase === 'play') return null;
    const { steps, best } = challengeView(s);
    return s.phase === 'win'
      ? { title: msg('chal.win', { s: steps }), body: msg('chal.winBody') }
      : { title: msg('chal.lose', { s: steps, b: best }), body: msg('chal.loseBody') };
  },
};

/* 做：逐步执行 */

export interface TraceInput { which: number }
export type TraceAction = { type: 'which'; which: number };

const traceMaze = (input: TraceInput) => parseMaze(TRACE_MAZES[input.which].rows);

export const traceRules: TraceRules<TraceInput, BfsStep, TraceAction> = {
  code: CODE,
  start: () => ({ which: 0 }),
  act: (_input, a) => ({ which: a.which }),
  controls: (input): Control<TraceAction>[] => [{
    type: 'segmented', legend: msg('trace.mazeLegend'), value: input.which,
    options: TRACE_MAZES.map((t, k) => ({ value: k, label: t.label })),
    choose: (v) => ({ type: 'which', which: Number(v) }),
  }],
  trace: (input) => buildTrace(traceMaze(input)),
  vars(input, s): Var[] {
    const mz = traceMaze(input);
    return [
      ['(r, c)', s.cur === null ? '—' : coord(mz, s.cur)],
      ['dist[r][c]', s.cur === null ? '—' : s.dist[s.cur]],
      [msg('trace.var.len'), s.queue.length],
      [msg('trace.var.pushes'), s.pushes],
    ];
  },
  summary(_input, s) {
    if (!s.done) return null;
    return s.result! >= 0
      ? msg('trace.sumOk', { r: s.result!, pushes: s.pushes })
      : msg('trace.sumNo', { n: s.visited.filter(Boolean).length });
  },
  jump: { label: msg('trace.jumpPop'), stop: (x) => x.line === L.pop },
  foot: msg('trace.foot'),
};

/* 做：猜下一步 */

/** 猜下一步每一问时画面的样子 */
export interface PredictView {
  rows: string[];
  cur: number;
  /** 出队之前的队列（cur 在队首） */
  queue: number[];
  visited: boolean[];
  dist: number[];
  /** 会入队的格子（答错后亮出来） */
  pushed: number[];
}

/** 点出来的格子凑成的答案：从小到大用逗号连起来，一个也没有是空字符串；「是终点」的答案是 'end' */
export const predictKey = (ids: Iterable<number>): string => [...ids].sort((a, b) => a - b).join(',');

export const predictRules: PredictRules<PredictView, string> = {
  goal: 5,
  puzzle(rand): Puzzle<PredictView, string> {
    const rows = genPredict(rand);
    const mz = parseMaze(rows);
    const list = rounds(mz);
    const viewOf = (r: Round): PredictView => ({ rows, cur: r.cur, queue: r.queue, visited: r.visited, dist: r.dist, pushed: r.pushed });
    const chips = (k: number): Var[] => [['第', msg('predict.chip', { n: k + 1 })]];
    const last = list.length - 1;
    const views = list.map(viewOf);
    return {
      asks: list.map((r, k) => ({
        view: views[k],
        prompt: msg('predict.ask', { c: coord(mz, r.cur), d: r.dist[r.cur] }),
        kind: 'pick',
        answer: r.isEnd ? 'end' : predictKey(r.pushed),
        why: r.why,
        chips: chips(k),
      })),
      end: {
        view: views[last],
        prompt: list[last].isEnd ? msg('predict.endOk', { d: list[last].dist[list[last].cur] }) : msg('predict.endNo'),
        chips: chips(last),
      },
    };
  },
};

/* 做：找 bug */

export const bugRules: BugRules<Bug, BfsStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => msg('bug.input', { expect: bug.expect }),
  vars: (s, bug): Var[] => [
    ['(r, c)', s.cur === null ? '—' : coord(parseMaze(bug.maze), s.cur)],
    [msg('trace.var.len'), s.queue.length],
    [msg('trace.var.pushes'), s.pushes],
  ],
  verdict: bugVerdict,
  jumps: [
    { label: msg('trace.jumpPop'), stop: (x) => x.line === L.pop },
    { label: msg('bug.jumpEnd'), stop: (x) => x.done },
  ],
};

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { rings: ringsRules, draw: drawRules, challenge: challengeRules },
};
