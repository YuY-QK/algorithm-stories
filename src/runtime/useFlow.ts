import { onBeforeUnmount, shallowRef } from 'vue';
import { unpack, type Flow, type Next, type Rand } from '../levels/types';
import { play } from '../components/shared/sound';
import { useStageStop } from '../components/shared/usePlayer';

/**
 * 在 Vue 里跑一个流程：state 是当前状态（整体替换，流程里不要原地修改状态），send 派发动作。
 * 效果在这里执行：放声音、按时自动派发动作。切换标签时没到点的自动动作全部取消，再调用流程的 interrupt。
 */
export function useFlow<S, A>(flow: Flow<S, A>, rand: Rand) {
  const state = shallowRef<S>(flow.init(rand));
  const timers = new Set<ReturnType<typeof setTimeout>>();

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
  }

  function apply(next: Next<S, A>) {
    const { state: s, effects } = unpack(next);
    state.value = s;
    for (const e of effects) {
      if ('sound' in e) play(e.sound);
      else {
        const t = setTimeout(() => {
          timers.delete(t);
          send(e.then);
        }, e.after);
        timers.add(t);
      }
    }
  }

  function send(action: A) {
    apply(flow.step(state.value, action, rand));
  }

  useStageStop(() => {
    clearTimers();
    if (flow.interrupt) state.value = flow.interrupt(state.value);
  });
  onBeforeUnmount(clearTimers);

  return { state, send };
}
