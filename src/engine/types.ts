/**
 * 引擎层的统一约定：每个算法写成纯函数，输入数据，输出「步骤轨迹」。
 * 界面只负责播放这些步骤，不自己推演算法，所以动画永远和真实执行一致。
 * 引擎不碰 DOM、不依赖框架，网页、PWA、App 都能直接复用。
 */
export interface Step {
  /** 对应参考代码（从 1 开始）的行号，用于高亮 */
  line: number;
  /** 这一步发生了什么，给人看的一句话 */
  note: string;
  /** 是否是最后一步 */
  done: boolean;
}

/** 一个算法的步骤轨迹：Step 加上该算法自己的状态字段 */
export type Trace<S extends Step> = S[];
