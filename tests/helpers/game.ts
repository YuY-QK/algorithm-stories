import { actGame, interruptGame, startGame, tickGame, type GameRun, type GameStep } from '../../src/core/flows/game';
import type { GameRules, Rand, SoundName } from '../../src/core/types';

/** 把一份 GameRules 当界面一样跑：记下台词、声音、自动步骤的间隔，自动步骤可以一口气走完 */
export function driver<S, A>(rules: GameRules<S, A>, rand?: Rand) {
  let step: GameStep<S> = startGame(rules, rand);
  const sounds: SoundName[] = [];
  const afters: number[] = [];
  const record = (st: GameStep<S>) => {
    step = st;
    sounds.push(...[st.sound ?? []].flat());
    if (st.after !== undefined) afters.push(st.after);
  };
  record(step);
  return {
    get run(): GameRun<S> { return step.run; },
    get state(): S { return step.run.state; },
    get say() { return step.run.say; },
    get after() { return step.after; },
    sounds,
    afters,
    /** 孩子操作一下；返回是否被接受 */
    act(a: A): boolean {
      const st = actGame(rules, step.run, a, rand);
      if (!st) return false;
      record(st);
      return true;
    },
    tick() { record(tickGame(rules, step.run, rand)); },
    /** 自动步骤走完（界面里是定时器一个个触发） */
    settle() {
      let guard = 0;
      while (step.after !== undefined && guard++ < 50) record(tickGame(rules, step.run, rand));
    },
    interrupt() { record(interruptGame(rules, step.run)); },
  };
}
