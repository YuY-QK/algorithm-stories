/**
 * 「玩」和「挑战」的流程：执行一份 GameRules，保存状态和台词，把副作用（出声、过多久再自动走一步）交给界面。
 * 孩子的每一下操作、每一次自动步骤都是纯函数调用，所以引导（摇头、追问、秘诀……）都能写单元测试。
 */
import type { GameResult, GameRules, Msg, Outcome, Rand, SoundName } from '../types';

export interface GameRun<S> {
  state: S;
  /** 台词；规则没给新的就保持上一句 */
  say: Msg | null;
}

export interface GameStep<S> {
  run: GameRun<S>;
  sound?: SoundName;
  /** 过多少毫秒后调用 tick；没有就不需要 */
  after?: number;
}

function fold<S>(prev: GameRun<S> | null, o: Outcome<S>): GameStep<S> {
  return { run: { state: o.state, say: o.say ?? prev?.say ?? null }, sound: o.sound, after: o.after };
}

export function startGame<S, A>(rules: GameRules<S, A>, rand?: Rand): GameStep<S> {
  return fold(null, rules.start(rand));
}

/** 孩子操作了一下；此刻不接受就返回 null */
export function actGame<S, A>(rules: GameRules<S, A>, run: GameRun<S>, action: A, rand?: Rand): GameStep<S> | null {
  const o = rules.act(run.state, action, rand);
  return o ? fold(run, o) : null;
}

/** 自动步骤到点了；规则没有 tick 就什么都不变 */
export function tickGame<S, A>(rules: GameRules<S, A>, run: GameRun<S>, rand?: Rand): GameStep<S> {
  return rules.tick ? fold(run, rules.tick(run.state, rand)) : { run };
}

/** 切标签：动画中途的状态复位到能再操作 */
export function interruptGame<S, A>(rules: GameRules<S, A>, run: GameRun<S>): GameStep<S> {
  return rules.interrupt ? fold(run, rules.interrupt(run.state)) : { run };
}

/** 结算：星星、标题、追问。没结束返回 null */
export function resultOf<S, A>(rules: GameRules<S, A>, run: GameRun<S>): GameResult<A> | null {
  return rules.result?.(run.state) ?? null;
}
