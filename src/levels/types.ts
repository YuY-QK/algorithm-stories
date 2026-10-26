/**
 * 关卡配置和流程的类型。这一层和平台无关：不碰 DOM、不依赖 Vue，换平台时原样复用。
 *
 * 一关由四样东西组成：
 *   - 引擎 src/engine/<slug>.ts：算法本身，纯函数
 *   - 流程（Flow）：玩法、猜下一步、挑战的规则，写成状态机，也是纯函数
 *   - 文案 src/locales/<语言>/<slug>.json：所有给人看的文字
 *   - 配置 src/levels/<slug>/level.ts：四步里各有哪些块、顺序、图标、用哪个流程和画面
 * 平台层只需要实现「放映机」（src/runtime/）和每关的画面（src/demos/<slug>/views.ts）。
 */
import type { Msg } from '../i18n/format';
import type { BugInfo, Step } from '../engine/types';
import type { Stage } from '../content.config';

/** 随机源。流程和引擎里不许直接用 Math.random，一律从参数拿，测试时可以固定种子 */
export type Rand = () => number;

/** 声音的名字，和 src/components/shared/sound.ts 一致 */
export type SoundName = 'tap' | 'tick' | 'page' | 'right' | 'wrong' | 'win';

/**
 * 流程执行一步后附带的效果，由放映机执行：
 *   - sound：放一个声音
 *   - after：停 ms 毫秒后自动派发动作 then（ms 一律用 timing.ts 的常量）。切换标签时没触发的 after 全部取消
 */
export type Effect<A> = { sound: SoundName } | { after: number; then: A };

/** step 的返回：只有新状态，或者新状态加效果 */
export type Next<S, A> = S | { state: S; effects: Effect<A>[] };

/**
 * 一个流程：状态机。界面只负责画出 state、把点击变成动作 A 交给 step，自己不写规则。
 * 状态里要显示的文字一律是 Msg。
 */
export interface Flow<S, A> {
  init(rand: Rand): S;
  step(state: S, action: A, rand: Rand): Next<S, A>;
  /** 切换标签时调用：正在自动播放的动画停下后，状态怎么收拾（比如复位到可以重新操作）。缺省不变 */
  interrupt?(state: S): S;
}

/** 放映机用：把 Next 拆开 */
export function unpack<S, A>(next: Next<S, A>): { state: S; effects: Effect<A>[] } {
  return typeof next === 'object' && next !== null && 'state' in next && 'effects' in next
    ? (next as { state: S; effects: Effect<A>[] })
    : { state: next as S, effects: [] };
}

/* ---------- 各种块 ---------- */

/** 每个块都有的：图标、标题、可选的一行说明（都是语言文件里的键） */
interface BlockHead {
  icon: string;
  title: string;
  intro?: string;
}

/** 看：会动的绘本。seed 是这一遍故事的随机部分（比如信藏在哪），「再看一次」时换一个 */
export interface BookBlock<Seed = unknown, F extends { say: Msg } = { say: Msg }> extends BlockHead {
  kind: 'book';
  initSeed(rand: Rand): Seed;
  frames(seed: Seed): F[];
  nextSeed(seed: Seed, rand: Rand): Seed;
  /** 「再看一次」按钮的文字，缺省用 common 的 book.again */
  again?: string;
  /** 画面组件的名字（views.ts 里的键），收到 { frame } */
  view: string;
}

/**
 * 玩、挑战：一个流程配一个画面组件。
 * 放映机先显示目标（goal）和 state.say（若有），再放画面组件，画面组件收到 { s, send }。
 */
export interface GameBlock<S = unknown, A = unknown> extends BlockHead {
  kind: 'game';
  /** 游戏目标，一行小字 */
  goal?: string;
  flow: Flow<S, A>;
  view: string;
}

/** 猜下一步的状态：放映机用这些字段画外框（连对、题干、答错提示、下一题），其余字段归画面 */
/** 一个小标签：名字和值。字符串原样显示（变量名、数字），Msg 翻译（如「已检查」） */
export type Chip = [label: string | Msg, value: string | number | Msg];

export interface PredictState {
  streak: number;
  /** 连对几次过关 */
  goal: number;
  passed: boolean;
  prompt: Msg;
  wrong: Msg | null;
  /** 答对也要讲解的关卡用 */
  right?: Msg | null;
  ended: boolean;
  /** 外框里额外的小标签，如 target。字符串原样显示（变量名、数字），Msg 翻译 */
  chips?: Chip[];
  /** 答错提示、答对说明里按钮的文字（键），缺省「知道了，继续」「下一题」 */
  continueLabel?: string;
  nextLabel?: string;
}

/** 猜下一步外框上的按钮发出的动作 */
export type PredictFrameAction = { type: 'continue' } | { type: 'next' };

/** 猜下一步。画面组件收到 { s, send, part }，part 是 'board'（题目画面）或 'answers'（答案按钮） */
export interface PredictBlock<S extends PredictState = PredictState, A = unknown> extends BlockHead {
  kind: 'predict';
  flow: Flow<S, A | PredictFrameAction>;
  view: string;
}

/**
 * 逐步执行：输入（数组、目标值等）由一个小流程管，步骤轨迹由引擎的 buildTrace 生成。
 * 画面组件收到 { input, send, step, part }，part 是 'controls'（输入控件）或 'board'（画面）。
 */
export interface TraceBlock<I = unknown, A = unknown, S extends Step<Msg> = Step<Msg>> extends BlockHead {
  kind: 'trace';
  code: string[];
  input: Flow<I, A>;
  build(input: I): S[];
  vars(step: S, input: I): Chip[];
  /** 播放到最后一步时显示的总结 */
  summary?(step: S, input: I): Msg | null;
  /** 播放条上额外的跳转按钮：跳到下一个满足条件的步骤 */
  jumps?: { label: string; to(step: S): boolean }[];
  view: string;
}

/** 找 bug 的一个坑，文字都是 Msg */
export type Bug = BugInfo<Msg>;

/** 找 bug。画面组件收到 { step, bug } */
export interface BugsBlock<B extends Bug = Bug, S extends Step<Msg> = Step<Msg>> extends BlockHead {
  kind: 'bugs';
  bugs: readonly B[];
  // NoInfer：B 只从 bugs 推断，引擎函数的参数类型不参与，否则会推成基础的 Bug
  run(bug: NoInfer<B>): S[];
  vars(step: NoInfer<S>, bug: NoInfer<B>): Chip[];
  verdict(step: NoInfer<S>, bug: NoInfer<B>): Msg | null;
  /** 「输入：」后面那句话 */
  input(bug: NoInfer<B>): Msg;
  view?: string;
}

/**
 * 亲手写：本地 Kotlin 练习。固定的说明在 common.json 的 write.*，本关只给：
 * 要改的文件（target，如「`BinarySearch.kt`」）、TODO 的个数（todos，如「两个」，一个时不写）、要写的函数列表（items）。
 * 都是语言文件里的键，文案里可以用 `代码` 和 [链接](地址)。
 */
export interface WriteBlock extends BlockHead {
  kind: 'write';
  /** 练习的 Kotlin 包名，如 binarysearch，用来拼测试命令 */
  pkg: string;
  target: string;
  todos?: string;
  items: string[];
}

/**
 * 延伸里的一行：
 *   - 字符串：一段正文（键）
 *   - { list }：一个列表，每项一个键
 *   - { note }：一行小字（键）
 *   - LogChart：一张对数对比图
 */
export type ProseLine = string | { list: string[] } | { note: string } | LogChart;

/** 延伸：静态的段落、列表、对比图，构建时就生成好 */
export interface ProseBlock extends BlockHead {
  kind: 'prose';
  lines: ProseLine[];
}

/** 对数刻度的次数对比图（LogCompare）。label 原样显示，unit、name 是键 */
export interface LogChart {
  chart: 'log';
  rows: { label: string; unit: string; bars: { name: string; value: number; tone: 'muted' | 'accent' | 'warn'; approx?: boolean }[] }[];
}

export type Block = BookBlock<any, any> | GameBlock<any, any> | PredictBlock<any, any> | TraceBlock<any, any, any> | BugsBlock<any, any> | WriteBlock | ProseBlock;

/** 一关的配置 */
export interface Level {
  slug: string;
  blocks: Partial<Record<Stage, Block[]>>;
}

/* ---------- 写配置时用的小函数：让每个块内部的类型互相检查，放进 Level 时再擦掉 ---------- */

export const book = <Seed, F extends { say: Msg }>(b: Omit<BookBlock<Seed, F>, 'kind'>): BookBlock<Seed, F> => ({ kind: 'book', ...b });
export const game = <S, A>(b: Omit<GameBlock<S, A>, 'kind'>): GameBlock<S, A> => ({ kind: 'game', ...b });
export const predict = <S extends PredictState, A>(b: Omit<PredictBlock<S, A>, 'kind'>): PredictBlock<S, A> => ({ kind: 'predict', ...b });
export const trace = <I, A, S extends Step<Msg>>(b: Omit<TraceBlock<I, A, S>, 'kind'>): TraceBlock<I, A, S> => ({ kind: 'trace', ...b });
export const bugs = <B extends Bug, S extends Step<Msg>>(b: Omit<BugsBlock<B, S>, 'kind'>): BugsBlock<B, S> => ({ kind: 'bugs', ...b });
export const write = (b: Omit<WriteBlock, 'kind'>): WriteBlock => ({ kind: 'write', ...b });
export const prose = (b: Omit<ProseBlock, 'kind'>): ProseBlock => ({ kind: 'prose', ...b });

/* ---------- 猜下一步的连对计数（纯函数版 useStreak） ---------- */

/** 答对：连对 +1，达到 goal 过关。返回新的计数和该放的声音 */
export function streakHit(s: { streak: number; passed: boolean }, goal: number): { streak: number; passed: boolean; sound: SoundName } {
  const streak = s.streak + 1;
  const passed = s.passed || streak >= goal;
  return { streak, passed, sound: passed && !s.passed ? 'win' : 'right' };
}

/** 答错：连对清零（过关后保持 passed） */
export function streakMiss(s: { streak: number; passed: boolean }): { streak: number; passed: boolean; sound: SoundName } {
  return { streak: 0, passed: s.passed, sound: 'wrong' };
}
