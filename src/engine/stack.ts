import type { BugInfo, LookFrame, Step, Trace } from './types';

/* ---------- 看、玩一：小熊叠盘子 ---------- */

/** 盘子上的图案，下标就是盘子的编号 */
export const PLATE_ICONS = ['⭐', '🌙', '❤️', '🌸', '🍀', '🐟'] as const;
export const PLATE_NAMES = ['星星', '月亮', '爱心', '小花', '四叶草', '小鱼'] as const;

export type PlateOp = { kind: 'push'; plate: number } | { kind: 'pop' };

export interface PlateState {
  /** 叠着的盘子，最后一个在最上面 */
  stack: number[];
  /** 已经拿走的盘子，按拿走的先后 */
  taken: number[];
  /** 刚做的操作，开头是 null */
  op: PlateOp | null;
  /** 刚放上或刚拿走的盘子 */
  moved: number | null;
}

/** 按顺序放盘子、拿盘子，返回每一步之后的样子（第一项是还没开始） */
export function runPlates(ops: PlateOp[]): PlateState[] {
  let stack: number[] = [];
  let taken: number[] = [];
  const out: PlateState[] = [{ stack, taken, op: null, moved: null }];
  for (const op of ops) {
    if (op.kind === 'push') {
      stack = [...stack, op.plate];
      out.push({ stack, taken, op, moved: op.plate });
    } else {
      if (stack.length === 0) throw new Error('盘子已经拿完了，不能再拿');
      const p = stack[stack.length - 1];
      stack = stack.slice(0, -1);
      taken = [...taken, p];
      out.push({ stack, taken, op, moved: p });
    }
  }
  return out;
}

const push = (plate: number): PlateOp => ({ kind: 'push', plate });
const pop: PlateOp = { kind: 'pop' };

/** 「看」的绘本：放星星、月亮、爱心，拿一个，放小花，再全部拿完 */
export const LOOK_OPS: PlateOp[] = [push(0), push(1), push(2), pop, push(3), pop, pop, pop];

/** 看：绘本的一页。盘子的状态加上这一页的台词 */
export interface LookPage extends LookFrame, PlateState {}

/** 看：生成绘本的每一页。盘子由 runPlates 真正执行得到，台词按这一步做了什么来写 */
export function lookFrames(ops: PlateOp[] = LOOK_OPS): LookPage[] {
  const states = runPlates(ops);
  let pushed = 0;
  let popped = 0;
  const out: LookPage[] = states.map((s, k) => {
    const icon = s.moved === null ? '' : PLATE_ICONS[s.moved];
    let say = '小熊 🐻 洗好了盘子，要一个一个叠起来 🍽️';
    if (s.op?.kind === 'push') {
      say = pushed++ === 0 ? '先放上 ' + icon + ' 盘' : '再放 ' + icon + ' 盘，叠在最上面';
    } else if (s.op?.kind === 'pop') {
      const prev = states[k - 1];
      const justPut = prev.op?.kind === 'push' && prev.moved === s.moved;
      if (popped++ === 0) say = '要拿一个盘子：只能拿最上面的 ' + icon;
      else if (s.stack.length === 0) say = '最先放的 ' + icon + '，最后才拿到';
      else if (justPut) say = '拿走 ' + icon + '：刚放上去的，最先拿走';
      else say = '再拿最上面的 ' + icon;
    }
    return { ...s, say };
  });
  const last = states[states.length - 1];
  out.push({ ...last, say: '后放的先拿，先放的后拿：这就叫「栈」📚' });
  return out;
}

/** 栈顶在数组里的下标，空栈是 -1 */
export function topIndex(stack: readonly unknown[]): number {
  return stack.length - 1;
}

/**
 * 玩法一的一局：5 个不同的盘子，放和拿交错进行，最后全部拿完。
 * 局面一开始就生成好，孩子只负责猜每次拿到哪个。
 * 保证最高叠到 3 个以上，并且拿过之后还会再放（不是简单的全放完再全拿）。
 */
export function plateGame(rand: () => number = Math.random): PlateOp[] {
  const N = 5;
  for (;;) {
    const icons = shuffle([...PLATE_ICONS.keys()], rand).slice(0, N);
    const ops: PlateOp[] = [];
    let pushed = 0;
    let height = 0;
    let maxHeight = 0;
    let pushAfterPop = false;
    let popped = false;
    while (ops.length < 2 * N) {
      const canPush = pushed < N;
      // 至少叠两个才开始拿，拿的时候盘子堆里有得选
      const wantPush = height < 2 || rand() < 0.55;
      if (canPush && (height === 0 || wantPush)) {
        ops.push(push(icons[pushed++]));
        height++;
        if (popped) pushAfterPop = true;
      } else {
        ops.push(pop);
        height--;
        popped = true;
      }
      maxHeight = Math.max(maxHeight, height);
    }
    if (maxHeight >= 3 && pushAfterPop) return ops;
  }
}

/** 星星：一次没点错三颗，错一两次两颗，其余一颗 */
export function stars(misses: number): 1 | 2 | 3 {
  return misses === 0 ? 3 : misses <= 2 ? 2 : 1;
}

/* ---------- 玩二：拼积木（括号配对） ---------- */

export const OPENERS = '([{';
export const CLOSERS = ')]}';

export function isOpener(c: string): boolean {
  return OPENERS.includes(c);
}

/** 括号的种类：0 圆、1 方、2 花 */
export function kindOf(c: string): number {
  const k = OPENERS.indexOf(c);
  return k >= 0 ? k : CLOSERS.indexOf(c);
}

/** 左括号对应的右括号 */
export function pairOf(open: string): string {
  return CLOSERS[OPENERS.indexOf(open)];
}

/**
 * 轮到字符 c 时该怎么做：左括号叠上去（push）；
 * 右括号和栈顶是一对就拼上（pop）；栈空或者不是一对就卡住（stuck，return false）。
 */
export type Action = 'push' | 'pop' | 'stuck';

export function bracketAction(stack: readonly string[], c: string): Action {
  if (isOpener(c)) return 'push';
  const top = stack[stack.length - 1];
  return top !== undefined && pairOf(top) === c ? 'pop' : 'stuck';
}

/** 扫完以后：栈空了就是全拼好（clear），还剩左括号就是没拼完（left） */
export function bracketEnd(stack: readonly string[]): 'clear' | 'left' {
  return stack.length === 0 ? 'clear' : 'left';
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 随机生成一个有 pairs 对括号、完全配对的串 */
export function genBalanced(pairs: number, rand: () => number = Math.random): string {
  let s = '';
  const st: string[] = [];
  let opened = 0;
  while (s.length < 2 * pairs) {
    if (opened < pairs && (st.length === 0 || rand() < 0.5)) {
      const o = OPENERS[Math.floor(rand() * 3)];
      st.push(o);
      s += o;
      opened++;
    } else {
      s += pairOf(st.pop()!);
    }
  }
  return s;
}

/** 括号深度为 0 的位置（插在这里不会拆开已有的一对） */
function topLevelSlots(s: string): number[] {
  const out = [0];
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    d += isOpener(s[i]) ? 1 : -1;
    if (d === 0) out.push(i + 1);
  }
  return out;
}

/**
 * 四种题：
 * good 全部配上；cross 形状不对（把某个右括号换成别的种类）；
 * left 多了一个左括号，扫完还剩；extra 多了一个右括号，来的时候栈是空的。
 */
export type PuzzleKind = 'good' | 'cross' | 'left' | 'extra';

export function bracketPuzzle(kind: PuzzleKind, pairs: number, rand: () => number = Math.random): string {
  if (kind === 'good') return genBalanced(pairs, rand);
  if (kind === 'cross') {
    const b = genBalanced(pairs, rand);
    const closers = [...b].map((c, i) => (isOpener(c) ? -1 : i)).filter((i) => i >= 0);
    const at = closers[Math.floor(rand() * closers.length)];
    const other = (kindOf(b[at]) + 1 + Math.floor(rand() * 2)) % 3;
    return b.slice(0, at) + CLOSERS[other] + b.slice(at + 1);
  }
  const b = genBalanced(pairs - 1, rand);
  const slots = topLevelSlots(b);
  const at = slots[Math.floor(rand() * slots.length)];
  const c = (kind === 'left' ? OPENERS : CLOSERS)[Math.floor(rand() * 3)];
  return b.slice(0, at) + c + b.slice(at);
}

/** 逐步执行里括号串最多几个字符 */
export const TRACE_MAX = 16;
/** 逐步执行里「换一个」的按钮 */
export const TRACE_PRESETS: readonly { label: string; kind: PuzzleKind }[] = [
  { label: '能配上', kind: 'good' },
  { label: '形状不对', kind: 'cross' },
  { label: '多了左括号', kind: 'left' },
  { label: '多了右括号', kind: 'extra' },
];

/** 逐步执行里「换一个」按钮用的串：某一种题，3～5 对 */
export function presetString(kind: PuzzleKind, rand: () => number = Math.random): string {
  return bracketPuzzle(kind, 3 + Math.floor(rand() * 3), rand);
}

/** 玩法二的一局：三串积木，一串能全拼好、一串形状不对、一串多了一块，顺序打乱 */
export function bracketGame(rand: () => number = Math.random): string[] {
  const third: PuzzleKind = rand() < 0.5 ? 'left' : 'extra';
  return shuffle([bracketPuzzle('good', 3, rand), bracketPuzzle('cross', 3, rand), bracketPuzzle(third, 3, rand)], rand);
}

/* ---------- 做：逐步执行 ---------- */

export const CODE = [
  'fun isValid(s: String): Boolean {',
  '    val stack = ArrayDeque<Char>()',
  '    for (c in s) {',
  '        if (c in "([{") {',
  '            stack.addLast(c)',
  '        } else {',
  '            val top = stack.removeLastOrNull() ?: return false',
  '            if (pairOf(top) != c) return false',
  '        }',
  '    }',
  '    return stack.isEmpty()',
  '}',
  '',
  'fun pairOf(open: Char) = when (open) {',
  "    '(' -> ')'",
  "    '[' -> ']'",
  "    else -> '}'",
  '}',
];

export interface StackStep extends Step {
  /** 正在看的字符下标；开始前是 -1，扫完是 s.length */
  i: number;
  /** 栈里的内容，最后一个是栈顶 */
  stack: string[];
  /** 刚弹出来的栈顶 */
  top: string | null;
  /** 返回值，没返回时是 null */
  result: boolean | null;
}

/** 只留下括号字符 */
export function clean(s: string): string {
  return [...s].filter((c) => OPENERS.includes(c) || CLOSERS.includes(c)).join('');
}

export function buildTrace(s: string): Trace<StackStep> {
  const steps: StackStep[] = [];
  let stack: string[] = [];
  let i = -1;
  const add = (line: number, note: string, extra: Partial<StackStep> = {}) => {
    steps.push({ line, i, stack, top: null, result: null, note, done: false, ...extra });
  };

  add(2, '创建一个空栈。');
  for (i = 0; i < s.length; i++) {
    const c = s[i];
    add(3, '取第 ' + i + ' 个字符：' + c + '。');
    if (isOpener(c)) {
      add(4, c + ' 是左括号。');
      stack = [...stack, c];
      add(5, c + ' 入栈，现在栈顶是 ' + c + '。');
      continue;
    }
    add(4, c + ' 是右括号，要和栈顶配对。');
    if (stack.length === 0) {
      add(7, '栈是空的，没有左括号能和 ' + c + ' 配对：返回 false。', { result: false, done: true });
      return steps;
    }
    const top = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    add(7, '弹出栈顶 ' + top + '。', { top });
    if (pairOf(top) !== c) {
      add(8, top + ' 要配 ' + pairOf(top) + '，来的却是 ' + c + '：返回 false。', { top, result: false, done: true });
      return steps;
    }
    add(8, top + ' 和 ' + c + ' 是一对，配上了。', { top });
  }
  i = s.length;
  add(11, stack.length === 0
    ? '扫完了，栈是空的，每个左括号都配上了：返回 true。'
    : '扫完了，栈里还剩 ' + stack.length + ' 个左括号没配上：返回 false。', { result: stack.length === 0, done: true });
  return steps;
}

/** 直接算结果，测试和挑战里用 */
export function isValid(s: string): boolean {
  return buildTrace(s).at(-1)!.result === true;
}

/* ---------- 做：猜下一步 ---------- */

/** 每个字符要做的事，加上扫完以后的返回值 */
export type Move = 'push' | 'pop' | 'fail' | 'true' | 'false';

/** 每个字符三选一的按钮 */
export const CHAR_MOVES: readonly { move: Move; text: string }[] = [
  { move: 'push', text: 'stack.addLast(c)' },
  { move: 'pop', text: '弹出栈顶，配上了' },
  { move: 'fail', text: 'return false' },
];
/** 扫完以后二选一的按钮 */
export const END_MOVES: readonly { move: Move; text: string }[] = [
  { move: 'true', text: 'return stack.isEmpty() → true' },
  { move: 'false', text: 'return stack.isEmpty() → false' },
];

export interface Round {
  /** 字符下标；扫完以后的那一题是 s.length */
  i: number;
  /** 做决定之前栈里的内容 */
  stack: string[];
  /** 正确答案 */
  correct: Move;
  /** 这一题的选项 */
  options: readonly { move: Move; text: string }[];
  /** 答错时的解释 */
  why: string;
}

function whyMove(s: string, i: number, stack: string[], move: Move): string {
  const c = s[i];
  const top = stack[stack.length - 1];
  switch (move) {
    case 'push': return c + ' 是左括号，直接入栈，等后面的右括号来配。';
    case 'pop': return c + ' 是右括号，栈顶 ' + top + ' 正好是它的另一半：弹出栈顶，配上了。';
    case 'fail': return top === undefined
      ? c + ' 是右括号，可栈是空的，没有左括号能配：return false。'
      : '栈顶 ' + top + ' 要配 ' + pairOf(top) + '，来的却是 ' + c + '：return false。';
    case 'true': return '扫完了，栈是空的，每个左括号都配上了：返回 true。';
    default: return '扫完了，栈里还剩 ' + stack.length + ' 个左括号没配上：返回 false。';
  }
}

export function rounds(s: string): Round[] {
  const out: Round[] = [];
  let stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const a = bracketAction(stack, s[i]);
    const correct: Move = a === 'stuck' ? 'fail' : a;
    out.push({ i, stack, correct, options: CHAR_MOVES, why: whyMove(s, i, stack, correct) });
    if (a === 'stuck') return out;
    stack = a === 'push' ? [...stack, s[i]] : stack.slice(0, -1);
  }
  const correct: Move = stack.length === 0 ? 'true' : 'false';
  out.push({ i: s.length, stack, correct, options: END_MOVES, why: whyMove(s, s.length, stack, correct) });
  return out;
}

/** 猜下一步用的串：四种题随机一种，3～5 对 */
export function genPredict(rand: () => number = Math.random): string {
  const kinds: PuzzleKind[] = ['good', 'good', 'cross', 'left', 'extra'];
  return bracketPuzzle(kinds[Math.floor(rand() * kinds.length)], 3 + Math.floor(rand() * 3), rand);
}

/* ---------- 做：找 bug ---------- */

export interface Bug extends BugInfo {
  id: 'no-empty' | 'no-final' | 'no-type';
  /** 演示用的括号串 */
  input: string;
}

function variant(line: number, text: string): string[] {
  return CODE.map((t, k) => (k + 1 === line ? text : t));
}

export const BUGS: readonly Bug[] = [
  {
    id: 'no-empty',
    title: '右括号一多，程序就崩溃',
    code: variant(7, '            val top = stack.removeLast()'),
    wrongLine: 7,
    fixed: '            val top = stack.removeLastOrNull() ?: return false',
    input: '())',
    expect: '多了一个右括号，应该返回 false',
    explain: '遇到右括号时栈可能是空的：右括号比左括号多，或者开头就是右括号。ArrayDeque.removeLast() 在空栈上会抛 NoSuchElementException。要先确认栈不空，用 removeLastOrNull() 拿不到就返回 false。',
  },
  {
    id: 'no-final',
    title: '左括号没配完，也说合法',
    code: variant(11, '    return true'),
    wrongLine: 11,
    fixed: '    return stack.isEmpty()',
    input: '(()',
    expect: '第一个 ( 没有配上，应该返回 false',
    explain: '一路没出错，只说明来的右括号都配上了，不说明每个左括号都等到了伙伴。扫完以后栈里还剩左括号，就是没配完，所以最后要看栈空不空。',
  },
  {
    id: 'no-type',
    title: '形状不一样，也能配上',
    code: variant(8, '            if (top !in "([{") return false'),
    wrongLine: 8,
    fixed: '            if (pairOf(top) != c) return false',
    input: '([)]',
    expect: '( 被 ] 关上，形状不对，应该返回 false',
    explain: '这一行检查的是「弹出来的是不是左括号」，可栈里只放左括号，这个检查永远通过。要检查的是弹出来的左括号和 c 是不是同一种。只数个数不看种类，用一个计数器就够了，正是因为种类要对上，才需要栈。',
  },
];

export interface BugStep extends StackStep {
  /** 'crash'：空栈上 removeLast() 抛异常 */
  outcome: 'running' | 'ok' | 'crash';
}

/** 按 bug 版本的代码逐行执行，line 对应 bug.code 的行号 */
export function runBug(bug: Bug): Trace<BugStep> {
  const s = bug.input;
  const steps: BugStep[] = [];
  let stack: string[] = [];
  let i = -1;
  const add = (line: number, note: string, extra: Partial<BugStep> = {}) => {
    steps.push({ line, i, stack, top: null, result: null, note, done: false, outcome: 'running', ...extra });
  };

  add(2, '创建一个空栈。');
  for (i = 0; i < s.length; i++) {
    const c = s[i];
    add(3, '取第 ' + i + ' 个字符：' + c + '。');
    if (isOpener(c)) {
      add(4, c + ' 是左括号。');
      stack = [...stack, c];
      add(5, c + ' 入栈，现在栈顶是 ' + c + '。');
      continue;
    }
    add(4, c + ' 是右括号，要和栈顶配对。');
    if (stack.length === 0) {
      if (bug.id === 'no-empty') {
        add(7, '栈是空的，removeLast() 抛出 NoSuchElementException，程序崩溃！', { outcome: 'crash', done: true });
      } else {
        add(7, '栈是空的：返回 false。', { outcome: 'ok', result: false, done: true });
      }
      return steps;
    }
    const top = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    add(7, '弹出栈顶 ' + top + '。', { top });
    if (bug.id === 'no-type') {
      add(8, top + ' 是左括号，检查通过，继续。', { top });
      continue;
    }
    if (pairOf(top) !== c) {
      add(8, top + ' 要配 ' + pairOf(top) + '，来的却是 ' + c + '：返回 false。', { top, outcome: 'ok', result: false, done: true });
      return steps;
    }
    add(8, top + ' 和 ' + c + ' 是一对，配上了。', { top });
  }
  i = s.length;
  if (bug.id === 'no-final') {
    add(11, '扫完了，直接返回 true。栈里其实还剩 ' + stack.length + ' 个左括号。', { outcome: 'ok', result: true, done: true });
  } else {
    add(11, '扫完了，栈' + (stack.length === 0 ? '是空的：返回 true。' : '里还剩 ' + stack.length + ' 个：返回 false。'), { outcome: 'ok', result: stack.length === 0, done: true });
  }
  return steps;
}

/** 找 bug 面板底部的判定文字：没跑完是空 */
export function bugVerdict(step: BugStep, _bug: Bug): string {
  if (!step.done) return '';
  if (step.outcome === 'crash') return '💥 NoSuchElementException，程序崩溃';
  return '❌ 返回了 ' + step.result + '，不对';
}

/* ---------- 做：挑战 ---------- */

/** 挑战用 1..CHALLENGE_N 依次入栈 */
export const CHALLENGE_N = 5;
/** 挑战一组几道题 */
export const CHALLENGE_COUNT = 5;

export interface PermStep {
  /** 还没入栈的下一个数，全进去了是 n + 1 */
  next: number;
  stack: number[];
  /** 已经出栈的数，按顺序 */
  out: number[];
  action: 'start' | 'push' | 'pop' | 'stuck' | 'done';
  note: string;
  done: boolean;
}

/**
 * 1..n 依次入栈，中间随时可以出栈，能不能让出栈顺序正好是 want？
 * 贪心：想要的下一个数不在栈顶，就一直入栈直到它出现；它已经被压在下面，就做不到。
 */
export function permTrace(n: number, want: number[]): PermStep[] {
  const steps: PermStep[] = [];
  let next = 1;
  let stack: number[] = [];
  let out: number[] = [];
  const add = (action: PermStep['action'], note: string, done = false) => steps.push({ next, stack, out, action, note, done });
  add('start', '1 到 ' + n + ' 排队等着入栈，目标出栈顺序是 ' + want.join(' ') + '。');
  for (const w of want) {
    while (stack[stack.length - 1] !== w && next <= n) {
      stack = [...stack, next];
      next++;
      add('push', '想要 ' + w + '，栈顶不是它：' + (next - 1) + ' 入栈。');
    }
    if (stack[stack.length - 1] !== w) {
      add('stuck', '想要 ' + w + '，可它被压在 ' + stack[stack.length - 1] + ' 下面，拿不出来：做不到。', true);
      return steps;
    }
    stack = stack.slice(0, -1);
    out = [...out, w];
    add('pop', w + ' 在栈顶，出栈。');
  }
  add('done', '全部按顺序出栈：做得到。', true);
  return steps;
}

export function canPop(n: number, want: number[]): boolean {
  return permTrace(n, want).at(-1)!.action === 'done';
}

/** 有没有「3…1…2」形状：先出来一个大的，后面先小后中。有就做不到 */
export function has312(want: number[]): boolean {
  const n = want.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        if (want[j] < want[k] && want[k] < want[i]) return true;
  return false;
}

/** 随机按一串合法的入栈、出栈操作得到一个能做到的出栈顺序 */
function reachable(n: number, rand: () => number): number[] {
  const out: number[] = [];
  const st: number[] = [];
  let next = 1;
  while (out.length < n) {
    if (next <= n && (st.length === 0 || rand() < 0.5)) st.push(next++);
    else out.push(st.pop()!);
  }
  return out;
}

/** 挑战的一组题：count 道，能和不能大约各一半，不重复，不出 1 2 3 4 5 这种太简单的 */
export function permPuzzles(count: number, n = CHALLENGE_N, rand: () => number = Math.random): number[][] {
  const plan = shuffle(Array.from({ length: count }, (_, k) => k < Math.ceil(count / 2)), rand);
  const easy = [Array.from({ length: n }, (_, k) => k + 1).join(','), Array.from({ length: n }, (_, k) => n - k).join(',')];
  const seen = new Set<string>(easy);
  return plan.map((wantYes) => {
    for (;;) {
      const p = wantYes ? reachable(n, rand) : shuffle(Array.from({ length: n }, (_, k) => k + 1), rand);
      const key = p.join(',');
      if (seen.has(key) || canPop(n, p) !== wantYes) continue;
      seen.add(key);
      return p;
    }
  });
}

/** 挑战的一组题（CHALLENGE_COUNT 道） */
export function genChallenge(rand: () => number = Math.random): number[][] {
  return permPuzzles(CHALLENGE_COUNT, CHALLENGE_N, rand);
}
