import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

export interface Speed {
  label: string;
  ms: number;
}

/** 切换步骤（看、玩、做、延伸）时页面会派发这个事件，正在播放的演示应停下 */
export const STAGE_CHANGE_EVENT = 'algo:stagechange';

/**
 * 播放一条步骤轨迹：单步、自动播放、调速、跳转。
 * 所有算法的逐步执行面板都用它，自己只负责画出 step。
 */
export function usePlayer<S>(steps: Ref<S[]>, speeds: Speed[], defaultSpeed = 1) {
  const idx = ref(0);
  const speed = ref(speeds[defaultSpeed].ms);
  const timer = ref<ReturnType<typeof setInterval> | null>(null);

  const step = computed(() => steps.value[idx.value]);
  const total = computed(() => steps.value.length);
  const atStart = computed(() => idx.value === 0);
  const atEnd = computed(() => idx.value >= total.value - 1);
  const playing = computed(() => timer.value !== null);

  function stop() {
    if (timer.value) clearInterval(timer.value);
    timer.value = null;
  }
  function start() {
    timer.value = setInterval(() => {
      if (atEnd.value) stop();
      else idx.value++;
    }, speed.value);
  }
  function toggle() {
    if (playing.value) return stop();
    if (atEnd.value) idx.value = 0;
    start();
  }
  function next() {
    stop();
    if (!atEnd.value) idx.value++;
  }
  function prev() {
    stop();
    if (!atStart.value) idx.value--;
  }
  function reset() {
    stop();
    idx.value = 0;
  }
  /** 往后跳到第一个满足条件的步骤，找不到就停在最后一步 */
  function jumpTo(pred: (s: S) => boolean) {
    stop();
    while (!atEnd.value) {
      idx.value++;
      if (pred(steps.value[idx.value])) break;
    }
  }

  watch(steps, reset);
  watch(speed, () => {
    if (playing.value) {
      stop();
      start();
    }
  });

  onMounted(() => window.addEventListener(STAGE_CHANGE_EVENT, stop));
  onBeforeUnmount(() => {
    stop();
    window.removeEventListener(STAGE_CHANGE_EVENT, stop);
  });

  return { idx, speed, speeds, step, total, atStart, atEnd, playing, toggle, next, prev, reset, jumpTo, stop };
}

export type Player = ReturnType<typeof usePlayer>;
