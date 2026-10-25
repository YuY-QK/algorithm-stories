import type { BugInfo, LookFrame, Step, Trace } from './types';

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

/** 看里格子的色调：走过的、这一圈、最短路（Maze.vue 的 Tone 包含这三个） */
export type LookTone = 'old' | 'ring' | 'path';

export interface LookPage extends LookFrame {
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
  out.push({ say: '小老鼠 🐭 闻到了奶酪 🧀 的香味，可是迷宫弯弯绕绕', tones: {}, labels: {}, mouse: m.start });
  out.push({ say: '它的秘诀：像水波 🌊 一样，一圈一圈往外找', tones: { [m.start]: 'ring' }, labels: { [m.start]: 0 }, mouse: m.start });
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
      say: hit ? '第 ' + k + ' 圈碰到奶酪啦 🧀！' : k === 1 ? '走 1 步能到这 ' + ring.length + ' 格' : '再走 1 步：第 ' + k + ' 圈有 ' + ring.length + ' 格',
      tones: now,
      labels: { ...labels },
      mouse: m.start,
    });
    for (const id of ring) tones[id] = 'old';
  }
  const path = pathTo(wv, m.end);
  const pathTones: Record<number, LookTone> = { ...tones };
  for (const id of path) pathTones[id] = 'path';
  out.push({ say: '从奶酪倒着数回去：' + Array.from({ length: best + 1 }, (_, k) => best - k).join(' → '), tones: pathTones, labels: { ...labels }, mouse: m.start });
  out.push({ say: '沿着这条路，' + best + ' 步就吃到奶酪 🎉 没有更近的路了', tones: pathTones, labels: { ...labels }, mouse: m.end });
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
  const push = (line: number, note: string, extra: Partial<BfsStep> = {}) => {
    steps.push({
      line, note, done: false, queue: [...queue], visited: [...visited], dist: [...dist],
      cur, nb: null, result: null, pushes, outcome: 'running', ...extra,
    });
  };
  const c = (id: number) => coord(m, id);

  queue.push(m.start);
  pushes++;
  visited[m.start] = true;
  push(L.init, '起点 ' + c(m.start) + ' 入队，标记 visited，dist = 0。');

  while (steps.length < MAX_STEPS) {
    push(L.loop, queue.length
      ? '队列里还有 ' + queue.length + ' 个格子，继续。'
      : '队列空了：能走到的格子都走遍了，没碰到终点。');
    if (!queue.length) break;
    cur = f.take === 'first' ? queue.shift()! : queue.pop()!;
    push(L.pop, (f.take === 'first' ? '从队首' : '从队尾') + '取出 ' + c(cur) + '，它离起点 ' + dist[cur] + ' 步。');
    if (cur === m.end) {
      push(L.isEnd, c(cur) + ' 是终点 E，返回 dist = ' + dist[cur] + '。', { result: dist[cur], outcome: 'ok', done: true });
      return steps;
    }
    const r = rowOf(m, cur);
    const cc = colOf(m, cur);
    for (let k = 0; k < 4; k++) {
      const nr = r + DIRS[k][0];
      const nc = cc + DIRS[k][1];
      const name = DIR_NAMES[k] + '边 (' + nr + ',' + nc + ')';
      const inRange = (v: number, size: number) => v >= 0 && (f.range === 'until' ? v < size : v <= size);
      if (!inRange(nr, m.h) || !inRange(nc, m.w)) {
        push(L.bounds, name + ' 出界了，跳过。');
        continue;
      }
      if (nr >= m.h || nc >= m.w) {
        push(L.skip, '读 grid[' + nr + '][' + nc + ']：' + (nr >= m.h ? '第 ' + nr + ' 行' : '第 ' + nc + ' 列') + '不存在，下标越界，程序崩溃！', {
          outcome: 'crash', done: true,
        });
        return steps;
      }
      const id = nr * m.w + nc;
      if (isWall(m, id) || (f.checkVisited && visited[id])) {
        push(L.skip, name + (isWall(m, id) ? ' 是墙，跳过。' : ' 已经访问过，跳过。'), { nb: id });
        continue;
      }
      const again = visited[id];
      visited[id] = true;
      push(L.mark, name + (again ? ' 又一次被标记 visited（它早就访问过了）。' : ' 是新格子，标记 visited。'), { nb: id });
      const before = dist[id];
      dist[id] = dist[cur] + 1;
      push(L.dist, 'dist' + c(id) + ' = ' + dist[cur] + ' + 1 = ' + dist[id] + (again && before !== dist[id] ? '（原来是 ' + before + '，被改掉了）' : '') + '。', { nb: id });
      queue.push(id);
      pushes++;
      if (queue.length > EXPLODE_AT) {
        push(L.push, c(id) + ' 入队。队列已经有 ' + queue.length + ' 个了，迷宫才 ' + openCount(m) + ' 个空格子：队列爆炸！', {
          nb: id, outcome: 'explode', done: true,
        });
        return steps;
      }
      push(L.push, c(id) + ' 入队，排在队尾。', { nb: id });
    }
  }
  if (steps.length >= MAX_STEPS) {
    push(L.loop, '跑了太多步还没停：判定为跑不完。', { outcome: 'explode', done: true });
    return steps;
  }
  push(L.fail, '返回 -1：走不到终点。', { result: -1, outcome: 'ok', done: true });
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
export const TRACE_MAZES: { label: string; rows: string[] }[] = [
  ...KID_MAZES.map((rows, k) => ({ label: '迷宫 ' + (k + 1), rows })),
  {
    label: '走不到',
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
  why: string;
}

/** 一次出队的解释：终点直接返回，否则四个方向逐个看 */
function explainRound(m: Maze, cur: number, isEnd: boolean, dist: number[], checks: Check[]): string {
  if (isEnd) return '不对，' + coord(m, cur) + ' 就是终点 E：第 ' + L.isEnd + ' 行直接返回 dist = ' + dist[cur] + '，不再看邻居。';
  const lines = checks.map((c) => {
    const name = DIR_NAMES[c.dir] + '边' + (c.id === null ? '' : ' ' + coord(m, c.id));
    if (c.why === 'out') return name + '：出界，跳过。';
    if (c.why === 'wall') return name + '：墙，跳过。';
    if (c.why === 'seen') return name + '：已经 visited（它在队列里或者早就出过队），跳过。';
    return name + '：新格子，入队，dist = ' + (dist[cur] + 1) + '。';
  });
  return '不对，四个方向逐个看：\n' + lines.join('\n');
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
    title: '队列越排越长',
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
    expect: '5×5 的空房间，最短 8 步',
    explain: '只挡了墙，没挡走过的格子。每个格子都会把邻居（包括刚刚来的那一格）再塞进队列，同一个格子一遍遍入队，队列长度指数增长，dist 也被反复改写。visited 虽然标了，却没人看它。',
  },
  {
    id: 'stack',
    title: '找到了，但不是最短',
    code: variant(L.pop, '        val (r, c) = queue.removeLast()'),
    wrongLine: L.pop,
    fixed: CODE[L.pop - 1],
    maze: [
      'S...',
      '....',
      '....',
      'E...',
    ],
    expect: '奶酪就在正下方，最短 3 步',
    explain: '从队尾取就成了栈：总是先走最新发现的格子，一条路钻到底（这就是深度优先）。格子第一次被发现时 dist 就定下来了，可那时走的不一定是最近的路。BFS 必须先进先出，离起点近的格子先处理，第一次碰到终点才一定是最短。',
  },
  {
    id: 'range',
    title: '走到边上就崩溃',
    code: variant(L.bounds, '            if (nr !in 0..h || nc !in 0..w) continue'),
    wrongLine: L.bounds,
    fixed: CODE[L.bounds - 1],
    maze: [
      'S..#',
      '.#.E',
      '....',
      '....',
    ],
    expect: '最短 4 步',
    explain: '0..h 包括 h，0 until h 才不包括。下标只能是 0 到 h − 1，走到最下面一行再往下看一格，nr = h 通过了检查，读 grid[h] 就越界了。',
  },
];

export function runBug(bug: Bug): Trace<BfsStep> {
  return simulate(parseMaze(bug.maze), FLAVORS[bug.id]);
}

/** 找 bug 面板底部的判定文字：没跑完是空 */
export function bugVerdict(step: BfsStep, bug: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'explode') return '💥 队列爆炸：' + step.queue.length + ' 个格子在排队，入队了 ' + step.pushes + ' 次，还在涨';
  if (step.outcome === 'crash') return '💥 下标越界，程序崩溃';
  return '❌ 返回了 ' + step.result + '，可是最短只要 ' + bestSteps(parseMaze(bug.maze)) + ' 步';
}
