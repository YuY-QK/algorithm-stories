import { m } from '../core/i18n';
import { initPlayer, type PlayerState } from '../core/flows/player';
import { applyTransport, resetTransport, tickTransport } from '../core/flows/transport';
import { PAUSE_LONG, SPEEDS } from '../core/timing';
import type {
  BugInfo, BugRules, Control, GameRules, LevelModule, LookFrame, LookRules, Msg, Outcome, PredictRules, Puzzle, Rand,
  Step, Trace, TraceRules, TransportOp, Var,
} from '../core/types';

/* ---------- 看、玩一：小熊叠盘子 ---------- */

/** 盘子上的图案，下标就是盘子的编号 */
export const PLATE_ICONS = ['⭐', '🌙', '❤️', '🌸', '🍀', '🐟'] as const;

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
    let say = m('look.start');
    if (s.op?.kind === 'push') {
      say = pushed++ === 0 ? m('look.pushFirst', { icon }) : m('look.pushNext', { icon });
    } else if (s.op?.kind === 'pop') {
      const prev = states[k - 1];
      const justPut = prev.op?.kind === 'push' && prev.moved === s.moved;
      if (popped++ === 0) say = m('look.popFirst', { icon });
      else if (s.stack.length === 0) say = m('look.popLast', { icon });
      else if (justPut) say = m('look.popJustPut', { icon });
      else say = m('look.popNext', { icon });
    }
    return { ...s, say };
  });
  const last = states[states.length - 1];
  out.push({ ...last, say: m('look.end') });
  return out;
}

/** 看：故事就是固定的一串放和拿，「再看一次」原样重来 */
export const lookRules: LookRules<PlateOp[], LookPage> = {
  first: LOOK_OPS,
  next: (prev) => prev,
  frames: (ops) => lookFrames(ops),
};

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

/* ---------- 玩一：拿盘子（GameRules） ---------- */

/** 玩的操作：点盘子、回答「最先放的盘子什么时候拿到」、再玩一局 */
export type PlatesAction =
  | { type: 'pick'; plate: number }
  | { type: 'quiz'; when: 'first' | 'last' }
  | { type: 'again' };

export interface PlatesGame {
  ops: PlateOp[];
  /** 已经做完几个操作 */
  at: number;
  /** moving：小熊在放盘子；ask：等孩子点会被拿走的那个；done：全拿完了 */
  phase: 'moving' | 'ask' | 'done';
  misses: number;
  /** 画面照着画的盘子（由 ops 和 at 算出） */
  stack: number[];
  taken: number[];
  /** 透光提示的次数，0 是没有；点错一次加一，次数变了画面就重新亮一次 */
  glow: number;
  /** 晃一下：[盘子, 第几次] */
  shake: [number, number] | null;
  /** 追问「最先放的盘子什么时候拿到」；一开始问一次，问过就不再问 */
  quiz: 'ask' | 'wrong' | 'right' | null;
  asked: boolean;
}

function settlePlates(s: PlatesGame): PlatesGame {
  const now = runPlates(s.ops)[s.at];
  return { ...s, stack: now.stack, taken: now.taken };
}

/** 放上盘子后说清楚：放了哪个、现在叠了几个 */
const putSay = (plate: number, n: number): Msg => m('plates.say.put', { icon: PLATE_ICONS[plate], n });

/** 小熊自动往下放盘子，遇到「拿」就停下来问孩子；剧本走完就收尾 */
function platesStep(s: PlatesGame): Outcome<PlatesGame> {
  if (s.at >= s.ops.length) {
    return {
      state: { ...s, phase: 'done', glow: 0, quiz: s.asked ? null : 'ask', asked: true },
      say: m('plates.say.done'),
      sound: 'win',
    };
  }
  const op = s.ops[s.at];
  if (op.kind === 'push') {
    const state = settlePlates({ ...s, at: s.at + 1 });
    return { state, say: putSay(op.plate, state.stack.length), sound: 'tick', after: PAUSE_LONG };
  }
  return { state: { ...s, phase: 'ask' }, say: m('plates.say.ask') };
}

/** 新开一局，立刻放第一个盘子（和原来一样，页面一打开小熊就开始叠） */
function platesRound(prev: PlatesGame | null, rand?: Rand): Outcome<PlatesGame> {
  const fresh: PlatesGame = {
    ops: plateGame(rand), at: 0, phase: 'moving', misses: 0, stack: [], taken: [], glow: 0,
    shake: prev?.shake ?? null, quiz: null, asked: prev?.asked ?? false,
  };
  return platesStep(fresh);
}

/** 一局里最先放上去的盘子 */
export function firstPlate(ops: PlateOp[]): number {
  const op = ops.find((o) => o.kind === 'push');
  return op && op.kind === 'push' ? op.plate : 0;
}

export const platesRules: GameRules<PlatesGame, PlatesAction> = {
  start: (rand) => platesRound(null, rand),

  act(s, a, rand) {
    if (a.type === 'pick' && s.phase === 'ask') {
      const top = s.stack[topIndex(s.stack)];
      if (a.plate !== top) {
        // 点了被压着的盘子：它晃一下，最上面的盘子透光
        return {
          state: { ...s, misses: s.misses + 1, shake: [a.plate, (s.shake?.[1] ?? 0) + 1], glow: s.glow + 1 },
          say: m('plates.say.under', { icon: PLATE_ICONS[a.plate] }),
          sound: 'wrong',
        };
      }
      const state = settlePlates({ ...s, at: s.at + 1, phase: 'moving', glow: 0 });
      const left = state.stack.length;
      return {
        state,
        say: left ? m('plates.say.took', { icon: PLATE_ICONS[a.plate], n: left }) : m('plates.say.tookAll', { icon: PLATE_ICONS[a.plate] }),
        sound: 'right',
        after: PAUSE_LONG,
      };
    }
    if (a.type === 'quiz' && s.phase === 'done' && (s.quiz === 'ask' || s.quiz === 'wrong')) {
      const last = a.when === 'last';
      return { state: { ...s, quiz: last ? 'right' : 'wrong' }, sound: last ? 'right' : 'wrong' };
    }
    if (a.type === 'again' && s.phase === 'done') return platesRound(s, rand);
    return null;
  },

  tick: (s) => (s.phase === 'moving' ? platesStep(s) : { state: s }),

  // 切标签时，小熊还在叠的局重新开一局；已经停在等孩子点或结束的就不动
  interrupt: (s) => (s.phase === 'moving' ? platesRound(s) : { state: s }),

  clickable: (s) => s.phase === 'ask',

  controls: (s) => (s.phase === 'done' ? [{ type: 'button', action: { type: 'again' }, label: m('plates.again'), look: 'primary' }] : []),

  result(s) {
    if (s.phase !== 'done') return null;
    const icon = PLATE_ICONS[firstPlate(s.ops)];
    const choice = (when: 'first' | 'last', label: string, art: string): Control<PlatesAction> => ({
      type: 'button', action: { type: 'quiz', when }, label: m(label), look: 'choice', art: { scene: 'Icon', props: { icon: art } },
    });
    let quiz;
    if (s.quiz === 'ask' || s.quiz === 'wrong') {
      quiz = {
        prompt: m('plates.quiz.ask', { icon }),
        options: [choice('first', 'plates.quiz.first', '🥇'), choice('last', 'plates.quiz.last', '🐢')],
        after: s.quiz === 'wrong' ? m('plates.quiz.hint', { icon }) : undefined,
      };
    } else if (s.quiz === 'right') {
      quiz = { prompt: m('plates.quiz.right'), options: [] };
    }
    return { stars: stars(s.misses), quiz };
  },
};

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
export const TRACE_PRESETS: readonly { label: Msg; kind: PuzzleKind }[] = [
  { label: m('trace.preset.good'), kind: 'good' },
  { label: m('trace.preset.cross'), kind: 'cross' },
  { label: m('trace.preset.left'), kind: 'left' },
  { label: m('trace.preset.extra'), kind: 'extra' },
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

/* ---------- 玩二：拼积木（GameRules） ---------- */

/** 玩的操作：放进篮子 / 拼上 / 拼不上；一串看完选「都拼好了」或「还剩下」；下一串；再玩一局 */
export type BlocksAction =
  | { type: 'act'; choice: Action }
  | { type: 'finish'; choice: 'clear' | 'left' }
  | { type: 'next' }
  | { type: 'again' };

export interface BlocksGame {
  rounds: string[];
  /** 第几串、这一串看到第几块 */
  r: number;
  i: number;
  /** 篮子里的左半块，最后一个在最上面 */
  basket: string[];
  /** 拼好的整块 */
  made: string[];
  /** act：等孩子选做法；end：一串看完，等孩子选结论；stuck / clear / left：这一串结束了 */
  phase: 'act' | 'end' | 'stuck' | 'clear' | 'left';
  misses: number;
  /** 提示动画的次数，0 是没有；点错一次加一，次数变了画面就闪一下：晃动当前块、篮子最上面一块透光、篮子透光 */
  wiggle: number;
  glowTop: number;
  glowBasket: number;
}

const blocksRoundOver = (s: BlocksGame) => s.phase === 'stuck' || s.phase === 'clear' || s.phase === 'left';
export const blocksGameOver = (s: BlocksGame) => blocksRoundOver(s) && s.r === s.rounds.length - 1;

function blocksRound(s: BlocksGame, r: number): Outcome<BlocksGame> {
  return {
    state: { ...s, r, i: 0, basket: [], made: [], phase: 'act' },
    say: m('blocks.say.round', { n: r + 1 }),
  };
}

/** 点错：记一次，说一句看得见的提示，让对应的东西闪一下 */
function blocksHint(s: BlocksGame, say: string, which: 'wiggle' | 'glowTop' | 'glowBasket'): Outcome<BlocksGame> {
  return { state: { ...s, misses: s.misses + 1, [which]: s[which] + 1 }, say: m(say), sound: 'wrong' };
}

/** 现在这一块是哪个字符 */
export const blockNow = (s: BlocksGame): string => s.rounds[s.r][s.i];

export const blocksRules: GameRules<BlocksGame, BlocksAction> = {
  start: (rand) => ({
    state: { rounds: bracketGame(rand), r: 0, i: 0, basket: [], made: [], phase: 'act', misses: 0, wiggle: 0, glowTop: 0, glowBasket: 0 },
    say: m('blocks.say.first'),
  }),

  act(s, a, rand) {
    if (a.type === 'act' && s.phase === 'act') {
      const c = blockNow(s);
      const right = bracketAction(s.basket, c);
      if (a.choice !== right) {
        if (right === 'push') return blocksHint(s, 'blocks.hint.isLeft', 'wiggle');
        if (a.choice === 'push') return blocksHint(s, 'blocks.hint.rightNotIn', s.basket.length ? 'glowTop' : 'glowBasket');
        if (right === 'pop') return blocksHint(s, 'blocks.hint.compare', 'glowTop');
        return s.basket.length ? blocksHint(s, 'blocks.hint.same', 'glowTop') : blocksHint(s, 'blocks.hint.any', 'glowBasket');
      }
      const calm: BlocksGame = { ...s, wiggle: 0, glowTop: 0, glowBasket: 0 };
      if (right === 'stuck') {
        const top = s.basket[s.basket.length - 1];
        return {
          state: { ...calm, phase: 'stuck' },
          say: top !== undefined ? m('blocks.say.stuck', { c, want: pairOf(top), top }) : m('blocks.say.stuckEmpty', { c }),
          sound: 'right',
        };
      }
      let next: BlocksGame;
      let say: Msg;
      if (right === 'push') {
        const basket = [...s.basket, c];
        next = { ...calm, basket };
        say = m('blocks.say.push', { c, n: basket.length });
      } else {
        const top = s.basket[s.basket.length - 1];
        next = { ...calm, made: [...s.made, top + c], basket: s.basket.slice(0, -1) };
        say = m('blocks.say.pop', { c, top });
      }
      next = { ...next, i: s.i + 1 };
      if (next.i >= s.rounds[s.r].length) return { state: { ...next, phase: 'end' }, say: m('blocks.say.end'), sound: 'right' };
      return { state: next, say, sound: 'right' };
    }
    if (a.type === 'finish' && s.phase === 'end') {
      const right = bracketEnd(s.basket);
      if (a.choice !== right) return blocksHint(s, right === 'clear' ? 'blocks.hint.look' : 'blocks.hint.remain', 'glowBasket');
      const state: BlocksGame = { ...s, phase: right };
      return {
        state,
        say: right === 'clear' ? m('blocks.say.clear') : m('blocks.say.left', { n: s.basket.length }),
        sound: blocksGameOver(state) ? 'win' : 'right',
      };
    }
    if (a.type === 'next' && blocksRoundOver(s) && !blocksGameOver(s)) return blocksRound(s, s.r + 1);
    if (a.type === 'again' && blocksGameOver(s)) return blocksRound({ ...s, rounds: bracketGame(rand), misses: 0 }, 0);
    return null;
  },

  clickable: () => false,

  controls(s) {
    const pad = (action: BlocksAction, name: string): Control<BlocksAction> => ({
      type: 'button', action, look: 'pad', label: m('blocks.icon.' + name), caption: m('blocks.pad.' + name), aria: m('blocks.pad.' + name),
    });
    if (s.phase === 'act') {
      return [pad({ type: 'act', choice: 'push' }, 'push'), pad({ type: 'act', choice: 'pop' }, 'pop'), pad({ type: 'act', choice: 'stuck' }, 'stuck')];
    }
    if (s.phase === 'end') return [pad({ type: 'finish', choice: 'clear' }, 'clear'), pad({ type: 'finish', choice: 'left' }, 'left')];
    if (blocksGameOver(s)) return [{ type: 'button', action: { type: 'again' }, label: m('blocks.again'), look: 'primary' }];
    return [{ type: 'button', action: { type: 'next' }, label: m('blocks.next'), look: 'primary' }];
  },

  result: (s) => (blocksGameOver(s) ? { stars: stars(s.misses), body: m('blocks.result') } : null),
};

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
  const add = (line: number, note: Msg, extra: Partial<StackStep> = {}) => {
    steps.push({ line, i, stack, top: null, result: null, note, done: false, ...extra });
  };

  add(2, m('trace.init'));
  for (i = 0; i < s.length; i++) {
    const c = s[i];
    add(3, m('trace.take', { i, c }));
    if (isOpener(c)) {
      add(4, m('trace.isOpen', { c }));
      stack = [...stack, c];
      add(5, m('trace.push', { c }));
      continue;
    }
    add(4, m('trace.isClose', { c }));
    if (stack.length === 0) {
      add(7, m('trace.emptyFail', { c }), { result: false, done: true });
      return steps;
    }
    const top = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    add(7, m('trace.pop', { top }), { top });
    if (pairOf(top) !== c) {
      add(8, m('trace.mismatch', { top, want: pairOf(top), c }), { top, result: false, done: true });
      return steps;
    }
    add(8, m('trace.paired', { top, c }), { top });
  }
  i = s.length;
  add(11, stack.length === 0 ? m('trace.endOk') : m('trace.endLeft', { n: stack.length }), { result: stack.length === 0, done: true });
  return steps;
}

/** 直接算结果，测试和挑战里用 */
export function isValid(s: string): boolean {
  return buildTrace(s).at(-1)!.result === true;
}

/** 逐步执行面板的操作：改括号串，或者换一个某种题的串 */
export type TraceAction = { type: 'text'; s: string } | { type: 'preset'; kind: PuzzleKind };

/** 做：逐步执行 isValid。括号串、栈和代码行同步 */
export const traceRules: TraceRules<string, StackStep, TraceAction> = {
  code: CODE,
  start: () => '{[()]}',
  act: (_input, a, rand) => (a.type === 'text' ? clean(a.s).slice(0, TRACE_MAX) : presetString(a.kind, rand)),
  controls: (input) => [
    { type: 'text', label: m('trace.input', { max: TRACE_MAX }), value: input, submit: (s) => ({ type: 'text', s }) },
    {
      type: 'group', legend: m('trace.preset'),
      items: TRACE_PRESETS.map((b) => ({ type: 'button' as const, action: { type: 'preset' as const, kind: b.kind }, label: b.label, look: 'small' as const })),
    },
  ],
  trace: buildTrace,
  vars(input, st): Var[] {
    const c = st.i >= 0 && st.i < input.length ? input[st.i] : '—';
    return [
      ['c', c],
      ['top', st.top ?? '—'],
      [m('vars.stack'), m('vars.count', { n: st.stack.length })],
      [m('vars.result'), st.result === null ? '—' : String(st.result)],
    ];
  },
  summary(input, st) {
    if (!st.done) return null;
    return st.result
      ? m('trace.sumTrue', { n: input.length })
      : m('trace.sumFalse', { n: Math.max(0, ...buildTrace(input).map((y) => y.stack.length)) });
  },
};

/* ---------- 做：猜下一步 ---------- */

/** 每个字符要做的事，加上扫完以后的返回值 */
export type Move = 'push' | 'pop' | 'fail' | 'true' | 'false';

/** 每个字符三选一的按钮 */
export const CHAR_MOVES: readonly { move: Move; label: Msg }[] = [
  { move: 'push', label: m('predict.opt.push') },
  { move: 'pop', label: m('predict.opt.pop') },
  { move: 'fail', label: m('predict.opt.fail') },
];
/** 扫完以后二选一的按钮 */
export const END_MOVES: readonly { move: Move; label: Msg }[] = [
  { move: 'true', label: m('predict.opt.true') },
  { move: 'false', label: m('predict.opt.false') },
];

export interface Round {
  /** 字符下标；扫完以后的那一题是 s.length */
  i: number;
  /** 做决定之前栈里的内容 */
  stack: string[];
  /** 正确答案 */
  correct: Move;
  /** 这一题的选项 */
  options: readonly { move: Move; label: Msg }[];
  /** 答错时的解释 */
  why: Msg;
}

function whyMove(s: string, i: number, stack: string[], move: Move): Msg {
  const c = s[i];
  const top = stack[stack.length - 1];
  switch (move) {
    case 'push': return m('why.push', { c });
    case 'pop': return m('why.pop', { c, top });
    case 'fail': return top === undefined ? m('why.failEmpty', { c }) : m('why.failMismatch', { top, want: pairOf(top), c });
    case 'true': return m('why.true');
    default: return m('why.false', { n: stack.length });
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

/** 猜下一步和找 bug 的画面：括号串、当前字符、栈 */
export interface BracketView {
  s: string;
  i: number;
  stack: string[];
  top?: string | null;
  bad?: boolean;
}

/** 把一串括号排成一问接一问：每个字符问一次，扫完再问返回值 */
export function makePuzzle(s: string): Puzzle<BracketView, Move> {
  const list = rounds(s);
  const asks = list.map((r) => ({
    view: { s, i: r.i, stack: r.stack, bad: false },
    prompt: r.i >= s.length ? m('predict.askEnd', { n: r.stack.length }) : m('predict.askChar', { i: r.i, c: s[r.i] }),
    kind: 'choose' as const,
    answer: r.correct,
    options: r.options.map((o) => ({ value: o.move, label: o.label })),
    why: r.why,
  }));
  const last = list[list.length - 1];
  const prompt = last.correct === 'true' ? m('predict.endTrue') : last.correct === 'fail' ? m('predict.endFail', { i: last.i }) : m('predict.endLeft');
  return { asks, end: { view: { s, i: last.i, stack: last.stack, bad: last.correct === 'fail' }, prompt } };
}

export const predictRules: PredictRules<BracketView, Move> = {
  goal: 8,
  puzzle: (rand = Math.random) => makePuzzle(genPredict(rand)),
};

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
    title: m('bug.no-empty.title'),
    code: variant(7, '            val top = stack.removeLast()'),
    wrongLine: 7,
    fixed: '            val top = stack.removeLastOrNull() ?: return false',
    input: '())',
    expect: m('bug.no-empty.expect'),
    explain: m('bug.no-empty.explain'),
  },
  {
    id: 'no-final',
    title: m('bug.no-final.title'),
    code: variant(11, '    return true'),
    wrongLine: 11,
    fixed: '    return stack.isEmpty()',
    input: '(()',
    expect: m('bug.no-final.expect'),
    explain: m('bug.no-final.explain'),
  },
  {
    id: 'no-type',
    title: m('bug.no-type.title'),
    code: variant(8, '            if (top !in "([{") return false'),
    wrongLine: 8,
    fixed: '            if (pairOf(top) != c) return false',
    input: '([)]',
    expect: m('bug.no-type.expect'),
    explain: m('bug.no-type.explain'),
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
  const add = (line: number, note: Msg, extra: Partial<BugStep> = {}) => {
    steps.push({ line, i, stack, top: null, result: null, note, done: false, outcome: 'running', ...extra });
  };

  add(2, m('trace.init'));
  for (i = 0; i < s.length; i++) {
    const c = s[i];
    add(3, m('trace.take', { i, c }));
    if (isOpener(c)) {
      add(4, m('trace.isOpen', { c }));
      stack = [...stack, c];
      add(5, m('trace.push', { c }));
      continue;
    }
    add(4, m('trace.isClose', { c }));
    if (stack.length === 0) {
      if (bug.id === 'no-empty') {
        add(7, m('bug.note.crash'), { outcome: 'crash', done: true });
      } else {
        add(7, m('bug.note.emptyFalse'), { outcome: 'ok', result: false, done: true });
      }
      return steps;
    }
    const top = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    add(7, m('trace.pop', { top }), { top });
    if (bug.id === 'no-type') {
      add(8, m('bug.note.passType', { top }), { top });
      continue;
    }
    if (pairOf(top) !== c) {
      add(8, m('trace.mismatch', { top, want: pairOf(top), c }), { top, outcome: 'ok', result: false, done: true });
      return steps;
    }
    add(8, m('trace.paired', { top, c }), { top });
  }
  i = s.length;
  if (bug.id === 'no-final') {
    add(11, m('bug.note.endTrue', { n: stack.length }), { outcome: 'ok', result: true, done: true });
  } else {
    add(11, stack.length === 0 ? m('bug.note.endOk') : m('bug.note.endLeft', { n: stack.length }), { outcome: 'ok', result: stack.length === 0, done: true });
  }
  return steps;
}

/** 找 bug 面板底部的判定文字：没跑完是空 */
export function bugVerdict(step: BugStep, _bug?: Bug): Msg | null {
  if (!step.done) return null;
  if (step.outcome === 'crash') return m('bug.verdict.crash');
  return m('bug.verdict.wrong', { result: String(step.result) });
}

export const bugRules: BugRules<Bug, BugStep> = {
  bugs: BUGS,
  run: runBug,
  input: (bug) => m('bug.inputLine', { s: bug.input, expect: bug.expect }),
  vars: (s, bug): Var[] => [
    ['c', s.i >= 0 && s.i < bug.input.length ? bug.input[s.i] : '—'],
    ['top', s.top ?? '—'],
    [m('vars.stack'), m('vars.count', { n: s.stack.length })],
  ],
  verdict: bugVerdict,
};

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
  note: Msg;
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
  const add = (action: PermStep['action'], note: Msg, done = false) => steps.push({ next, stack, out, action, note, done });
  add('start', m('perm.start', { n, want: want.join(' ') }));
  for (const w of want) {
    while (stack[stack.length - 1] !== w && next <= n) {
      stack = [...stack, next];
      next++;
      add('push', m('perm.push', { w, x: next - 1 }));
    }
    if (stack[stack.length - 1] !== w) {
      add('stuck', m('perm.stuck', { w, top: stack[stack.length - 1] }), true);
      return steps;
    }
    stack = stack.slice(0, -1);
    out = [...out, w];
    add('pop', m('perm.pop', { w }));
  }
  add('done', m('perm.done'), true);
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

/* ---------- 做：挑战（GameRules） ---------- */

/** 挑战的操作：判断能不能做到；播放控制条；下一题；再来一组 */
export type PermAction =
  | { type: 'judge'; yes: boolean }
  | { type: 'play'; op: TransportOp }
  | { type: 'next' }
  | { type: 'restart' };

export interface PermGame {
  puzzles: number[][];
  /** 第几题 */
  q: number;
  /** 孩子的判断；还没判断是 null */
  answer: boolean | null;
  score: number;
  /** 判断之后演一遍的播放状态 */
  p: PlayerState;
}

/** 当前这一题的各种派生信息，画面和规则共用 */
export function permView(s: PermGame) {
  const want = s.puzzles[s.q];
  const steps = permTrace(CHALLENGE_N, want);
  const step = steps[Math.min(s.p.idx, steps.length - 1)];
  const truth = canPop(CHALLENGE_N, want);
  const done = s.answer !== null && step.done;
  return {
    want, steps, step, truth, done,
    finished: s.q === CHALLENGE_COUNT - 1 && done,
    /** 还在排队等入栈的数 */
    waiting: Array.from({ length: CHALLENGE_N - step.next + 1 }, (_, k) => step.next + k),
  };
}

function permFresh(prev: PermGame | null, rand?: Rand): PermGame {
  const puzzles = genChallenge(rand);
  const total = permTrace(CHALLENGE_N, puzzles[0]).length;
  return { puzzles, q: 0, answer: null, score: 0, p: prev ? resetTransport(prev.p, total) : initPlayer(total, SPEEDS[1].ms) };
}

export const permRules: GameRules<PermGame, PermAction> = {
  start: (rand) => ({ state: permFresh(null, rand) }),

  act(s, a, rand) {
    if (a.type === 'judge') {
      if (s.answer !== null) return null;
      const v = permView(s);
      // 判断完马上开始演：先回到第一步，再播放
      const out = applyTransport(resetTransport(s.p, v.steps.length), 'toggle');
      return {
        state: { ...s, answer: a.yes, score: s.score + (a.yes === v.truth ? 1 : 0), p: out.p },
        sound: out.sound,
        after: out.after,
      };
    }
    if (a.type === 'play') {
      if (s.answer === null) return null;
      const out = applyTransport({ ...s.p, total: permView(s).steps.length }, a.op);
      return { state: { ...s, p: out.p }, sound: out.sound, after: out.after };
    }
    if (a.type === 'next') {
      if (!permView(s).done || s.q >= CHALLENGE_COUNT - 1) return null;
      const q = s.q + 1;
      return { state: { ...s, q, answer: null, p: resetTransport(s.p, permTrace(CHALLENGE_N, s.puzzles[q]).length) } };
    }
    if (a.type === 'restart') return permView(s).finished ? { state: permFresh(s, rand) } : null;
    return null;
  },

  tick(s) {
    const out = tickTransport({ ...s.p, total: permView(s).steps.length });
    return { state: { ...s, p: out.p }, sound: out.sound, after: out.after };
  },

  // 切标签：演示停下，位置不动
  interrupt: (s) => ({ state: { ...s, p: { ...s.p, playing: false } } }),

  clickable: () => false,

  controls(s) {
    if (s.answer === null) {
      return [
        { type: 'button', action: { type: 'judge', yes: true }, label: m('perm.yes'), look: 'primary' },
        { type: 'button', action: { type: 'judge', yes: false }, label: m('perm.no') },
      ];
    }
    return [{
      type: 'transport', idx: s.p.idx, total: permView(s).steps.length, playing: s.p.playing, speed: s.p.speed,
      act: (op) => ({ type: 'play', op }),
    }];
  },
};

/* ---------- 延伸：为什么快 ---------- */

/**
 * 最坏情况：((((…)))) 一层套一层。用栈扫一遍是 n 步；
 * 「反复删掉相邻的一对」每轮只删掉最里面一对，却要把剩下的串从头看一遍，约 n²/4 步。
 */
export function compareRows() {
  return [10, 100, 1000, 10000].map((n) => ({
    label: n.toLocaleString('en-US'),
    unit: m('compare.unit'),
    bars: [
      { name: m('compare.slow'), value: (n * n) / 4, tone: 'muted' as const, approx: true },
      { name: m('compare.stack'), value: n, tone: 'accent' as const },
    ],
  }));
}

/* ---------- 关卡模块：level.json 按名字引用这里的规则 ---------- */

export const level: LevelModule = {
  look: { story: lookRules },
  trace: { main: traceRules },
  predict: { main: predictRules },
  bugs: { main: bugRules },
  games: { plates: platesRules, blocks: blocksRules, challenge: permRules },
};
