/**
 * 测试流程用：派发一个动作，并把它带出的定时动作立刻按顺序执行完（不用真的等），记下放过的声音。
 */
import { unpack, type Flow, type SoundName } from '../../src/levels/types';
import { seeded } from './seeded';

export function driver<S, A>(flow: Flow<S, A>, seed = 1) {
  const rand = seeded(seed);
  let state = flow.init(rand);
  const sounds: SoundName[] = [];
  function send(action: A): S {
    const { state: next, effects } = unpack(flow.step(state, action, rand));
    state = next;
    const later: A[] = [];
    for (const e of effects) {
      if ('sound' in e) sounds.push(e.sound);
      else later.push(e.then);
    }
    for (const a of later) send(a);
    return state;
  }
  return {
    get state() { return state; },
    sounds,
    send,
    /** 只执行这一步，不跟着跑定时动作，用来看动画中途的状态 */
    stepOnly(action: A) {
      const r = unpack(flow.step(state, action, rand));
      state = r.state;
      return r;
    },
    interrupt() {
      if (flow.interrupt) state = flow.interrupt(state);
      return state;
    },
  };
}
