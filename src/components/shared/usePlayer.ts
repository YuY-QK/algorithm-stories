import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { play } from './sound';
import { SPEEDS, type Speed } from '../../core/timing';
import * as flow from '../../core/flows/player';

export type { Speed };

/** 切换步骤（看、玩、做、延伸）时页面会派发这个事件，正在播放的演示应停下 */
export const STAGE_CHANGE_EVENT = 'algo:stagechange';

/**
 * 任何自己开 setTimeout / setInterval 的组件都要调用：切换标签（看、玩、做、延伸）时 stop 会被调用，
 * 卸载时自动清理监听。stop 里负责清掉自己的定时器。
 */
export function useStageStop(stop: () => void) {
  onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
  onBeforeUnmount(() => window.removeEventListener(STAGE_CHANGE_EVENT, stop));
}

/**
 * 播放一条步骤轨迹：单步、自动播放、调速、跳转。
 * 所有算法的逐步执行面板都用它，自己只负责画出 step。
 * 状态机在 core/flows/player.ts，这里只把它接到 Vue 的响应式和定时器上。
 */
export function usePlayer<S>(steps: Ref<S[]>, speeds: Speed[] = SPEEDS, defaultSpeed = 1) {
  const state = ref(flow.initPlayer(steps.value.length, speeds[defaultSpeed].ms));
  let timer: ReturnType<typeof setInterval> | null = null;

  /** 总步数以轨迹为准，状态机收到的永远是最新的 */
  const cur = () => ({ ...state.value, total: steps.value.length });
  function clear() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function apply(out: flow.PlayerOut) {
    state.value = out.state;
    if (out.sound) play(out.sound);
    if (out.timer) clear();
    if (out.timer === 'start') timer = setInterval(() => apply(flow.tick(cur())), out.state.speed);
  }

  const idx = computed(() => state.value.idx);
  const speed = computed({
    get: () => state.value.speed,
    set: (ms: number) => apply(flow.setSpeed(cur(), ms)),
  });
  const step = computed(() => steps.value[idx.value]);
  const total = computed(() => steps.value.length);
  const atStart = computed(() => flow.atStart(state.value));
  const atEnd = computed(() => flow.atEnd(cur()));
  const manual = computed(() => flow.isManual(state.value));
  const playing = computed(() => state.value.playing);

  const toggle = () => apply(flow.toggle(cur()));
  const next = () => apply(flow.next(cur()));
  const prev = () => apply(flow.prev(cur()));
  const reset = () => apply(flow.reset(cur()));
  const stop = () => apply(flow.stop(cur()));
  /** 往后跳到第一个满足条件的步骤，找不到就停在最后一步 */
  const jumpTo = (pred: (s: S) => boolean) => apply(flow.jumpTo(cur(), (i) => pred(steps.value[i])));

  watch(steps, reset);

  onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
  onBeforeUnmount(() => {
    clear();
    window.removeEventListener(STAGE_CHANGE_EVENT, stop);
  });

  return { idx, speed, speeds, step, total, atStart, atEnd, playing, manual, toggle, next, prev, reset, jumpTo, stop };
}

export type Player = ReturnType<typeof usePlayer>;
