/**
 * 核心层的统一约定（阶段 R，见 docs/refactor-plan.md）。
 * 这里和 src/core/ 下的一切都是纯 TS：不碰 DOM、不依赖 Vue，换平台时原样复用。
 *
 * 分工：
 * - 引擎（src/engine/<slug>.ts）写规则，只产生 Msg，不产生给人看的文字
 * - 流程（src/core/flows/）是纯的状态机：(状态, 事件) → { 状态, 副作用 }
 * - 界面（src/ui/vue/）执行副作用（出声、定时、切标签停下），把状态画出来
 */

/** 随机源。随机一律由参数注入，放在参数最后，默认 Math.random */
export type Rand = () => number;

/* ---------- 文案 ---------- */

/** 一句要给人看的话：文案键加参数，由 t() 按 copy.<lang>.json 填成文字。参数可以嵌套 Msg */
export interface Msg {
  key: string;
  params?: Record<string, string | number | Msg>;
}

/** 一种语言的文案表：键 → 模板，模板里用 {name} 引用参数 */
export type Copy = Record<string, string>;

/** 变量标签：[名字, 值]。名字是代码里的变量名时直接写字符串，是中文说明时用 Msg */
export type Var = [name: string | Msg, value: string | number | Msg];

/* ---------- 副作用 ---------- */

export type SoundName = 'tap' | 'tick' | 'page' | 'right' | 'wrong' | 'win';

/** 一次操作的结果：新状态，加上界面要执行的副作用 */
export interface Outcome<S> {
  state: S;
  /** 台词（「玩」里大字那一行）；不给就保持上一句 */
  say?: Msg;
  /** 音效；给数组时按顺序一起出（如猜中时先「对」再「赢」） */
  sound?: SoundName | SoundName[];
  /** 过多少毫秒后自动调用 tick（动画步骤）；只能用 src/core/timing.ts 里的常量 */
  after?: number;
}

/* ---------- 控件：界面按这个描述画按钮、输入框、分段选择 ---------- */

export type Control<A> =
  | {
      type: 'button';
      action: A;
      label: Msg;
      /** 读屏文字；label 只有图标时必须给 */
      aria?: Msg;
      /** pad：「玩」里的大图标按钮；primary：主按钮；choice：追问的选项；默认普通按钮 */
      look?: 'pad' | 'primary' | 'choice' | 'small';
      disabled?: boolean;
      /** 按钮上的小画面：画面注册表里的组件名，和传给它的参数 */
      art?: { scene: string; props?: Record<string, unknown> };
    }
  | {
      type: 'number';
      label: Msg;
      /** 输入框里的灰字；不给就用 label。label 很长（当问题用）时单独给一个短的 */
      placeholder?: Msg;
      min?: number;
      max?: number;
      value?: number;
      /** 提交时生成的操作；输入不是整数时界面不提交 */
      submit: (n: number) => A;
      /** 有它就画一个提交按钮；没有就每次输入合法就提交（实时修改，如逐步执行里的目标值） */
      submitLabel?: Msg;
      /** 提交时输入不是整数就提交这个操作（让规则给出「请输入……」的提示）；不给就什么都不做 */
      invalid?: A;
      /** 这个数一变，输入框就清空（如接受了一次猜测） */
      clearOn?: number;
    }
  | {
      type: 'segmented';
      legend: Msg;
      value: string | number;
      options: { value: string | number; label: Msg }[];
      choose: (v: string | number) => A;
    }
  /** 一组小按钮，带一个小标题（如「快速设置」） */
  | { type: 'group'; legend: Msg; items: Control<A>[] };

/* ---------- 看：绘本 ---------- */

/** 绘本的一页。各关用交叉类型加画面字段 */
export interface LookFrame {
  say: Msg;
}

/** 看的规则。seed 是这一遍故事的输入（如藏信的信箱），「再看一次」时换一个 */
export interface LookRules<Seed, F extends LookFrame = LookFrame> {
  first: Seed;
  next(prev: Seed, rand?: Rand): Seed;
  frames(seed: Seed): F[];
}

/* ---------- 做：逐步执行 ---------- */

/** 步骤轨迹的一步：对应代码行、说明、是否最后一步，加各算法自己的状态字段 */
export interface Step {
  /** 参考代码（从 1 开始）的行号 */
  line: number;
  note: Msg;
  done: boolean;
}

export type Trace<S extends Step> = S[];

/** 逐步执行面板的规则。I 是输入（数组、目标值……），由 controls 修改 */
export interface TraceRules<I, S extends Step, A> {
  code: string[];
  start(rand?: Rand): I;
  act(input: I, action: A, rand?: Rand): I;
  controls(input: I): Control<A>[];
  trace(input: I): Trace<S>;
  vars(input: I, step: S): Var[];
  /** 播到最后一步时的总结，可以没有 */
  summary?(input: I, step: S): Msg | null;
}

/* ---------- 做：猜下一步 ---------- */

/**
 * 一问：要么在画面上点一个东西（pick，画面 emit 的值和 answer 比），要么从选项里选（choose）。
 * view 是这一问时画面的样子，交给画面组件。
 */
export interface Ask<V, T = unknown> {
  view: V;
  prompt: Msg;
  kind: 'pick' | 'choose';
  answer: T;
  options?: { value: T; label: Msg }[];
  /** 答错时的解释 */
  why: Msg;
  /** 答对时也要讲一句的关卡用；有它时答对先停下显示，再点「下一题」 */
  right?: Msg;
  /** 答错、看解释时画面和题干换成这个（如点错 mid 后把 mid 亮出来）；不给就保持原样 */
  reveal?: { view: V; prompt: Msg };
}

/** 一道题：依次回答若干问，最后看结局 */
export interface Puzzle<V, T = unknown> {
  chips?: Var[];
  asks: Ask<V, T>[];
  end: { view: V; prompt: Msg };
}

export interface PredictRules<V, T = unknown> {
  /** 连对几次过关，默认 5 */
  goal?: number;
  puzzle(rand?: Rand): Puzzle<V, T>;
}

/* ---------- 做：找 bug ---------- */

/** 找 bug 的一个坑。输入数据（数组、迷宫、操作序列等）放各关自己的扩展字段 */
export interface BugInfo {
  id: string;
  title: Msg;
  /** 有坑的 Kotlin 代码，行号从 1 开始 */
  code: string[];
  wrongLine: number;
  /** 该行的正确写法 */
  fixed: string;
  explain: Msg;
  /** 正确的结果应该是什么 */
  expect: Msg;
}

export interface BugRules<B extends BugInfo, S extends Step> {
  bugs: readonly B[];
  run(bug: B): Trace<S>;
  /** 「输入：……」那一行 */
  input(bug: B): Msg;
  vars(step: S, bug: B): Var[];
  /** 播完后的判定，没播完返回 null */
  verdict(step: S, bug: B): Msg | null;
}

/* ---------- 玩、挑战：引导式小游戏 ---------- */

/** 结束时的结算 */
export interface GameResult<A> {
  stars?: 1 | 2 | 3;
  title?: Msg;
  body?: Msg;
  /** 追问（如「点哪里最快？」） */
  quiz?: {
    prompt: Msg;
    options: Control<A>[];
    /** 选项后面的一句提示（如答错时的「再想想」，灰色小字） */
    note?: Msg;
    /** 追问答对后的讲解（正文大小，在选项的位置之后） */
    ok?: Msg;
  };
}

/**
 * 一个小游戏的规则。答案在 start 里固定，孩子没法中途改。
 * 画面组件收到 state 自己画，被点时 emit('act', 操作)；操作的形状由各关定。
 * 晃一下、透出光这类提示也是 state 里的字段，由画面组件读。
 */
export interface GameRules<S, A> {
  start(rand?: Rand): Outcome<S>;
  /** 孩子操作了一下；此刻不接受这个操作就返回 null（界面什么都不做） */
  act(state: S, action: A, rand?: Rand): Outcome<S> | null;
  /** 自动步骤：上一个 Outcome 带了 after 时，到点由界面调用 */
  tick?(state: S, rand?: Rand): Outcome<S>;
  /** 切标签时调用：动画中途的状态复位到能再操作；不给就保持原样 */
  interrupt?(state: S): Outcome<S>;
  /** 画面能不能点 */
  clickable(state: S): boolean;
  /** 此刻的按钮、输入框 */
  controls(state: S): Control<A>[];
  /** 画面下方的状态：点了几次、变量标签 */
  hud?(state: S): { tries?: number; chips?: Var[] };
  /** 结束了就返回结算，否则 null */
  result?(state: S): GameResult<A> | null;
}

/* ---------- 关卡模块：每个 src/engine/<slug>.ts 导出一个 ---------- */

/**
 * 一关的全部规则。level.json 里每个块按名字引用这里的一项，如 { "kind": "game", "rules": "hide" }。
 * 类型参数用 any 是因为各关状态不同；各关内部的类型由各自的 GameRules<S, A> 等保证。
 */
export interface LevelModule {
  look?: Record<string, LookRules<any, any>>;
  trace?: Record<string, TraceRules<any, any, any>>;
  predict?: Record<string, PredictRules<any, any>>;
  bugs?: Record<string, BugRules<any, any>>;
  games?: Record<string, GameRules<any, any>>;
}
