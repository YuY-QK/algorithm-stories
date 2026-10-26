/**
 * 引擎层的统一约定：每个算法写成纯函数，输入数据，输出「步骤轨迹」。
 * 界面只负责播放这些步骤，不自己推演算法，所以动画永远和真实执行一致。
 * 引擎不碰 DOM、不依赖框架，网页、PWA、App 都能直接复用。
 * 引擎里不写给人看的文字，只产出 Msg（语言文件里的键加参数），由界面层翻译。
 * 迁移期间旧关卡的引擎还直接给中文：文字字段的类型是参数 T，旧关卡默认 string，迁移后的关卡写 Step<Msg>。
 */
import type { Msg } from '../i18n/format';

/** 给人看的一句话：迁移完成后只剩 Msg，T 参数也一起去掉 */
export type Say = string | Msg;

export interface Step<T extends Say = string> {
  /** 对应参考代码（从 1 开始）的行号，用于高亮 */
  line: number;
  /** 这一步发生了什么，给人看的一句话 */
  note: T;
  /** 是否是最后一步 */
  done: boolean;
}

/** 一个算法的步骤轨迹：Step 加上该算法自己的状态字段 */
export type Trace<S extends Step<Say>> = S[];

/** 看：绘本的一页。各关用交叉类型加自己的画面字段，台词一律由引擎生成 */
export interface LookFrame<T extends Say = string> {
  say: T;
}

/** 找 bug 的一个坑。输入数据（数组、迷宫、操作序列等）放各关自己的扩展字段 */
export interface BugInfo<T extends Say = string> {
  id: string;
  title: T;
  /** 有坑的 Kotlin 代码，行号从 1 开始 */
  code: string[];
  wrongLine: number;
  /** 该行的正确写法 */
  fixed: string;
  explain: T;
  /** 正确的结果应该是什么 */
  expect: T;
}
