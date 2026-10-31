<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import { SHAKE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import { islandsView, type IslandsAction, type IslandsState } from '../../../../engine/dfs';
import { useStageStop } from '../../../../components/shared/usePlayer';
import Grid from './Grid.vue';

// 玩法二「数一数小岛」的画面：海图（涂到哪一格由 state.filling 决定），涂完后数岛的三个数字按钮。
// 数错的数字晃一下（state.wrongNum），晃动的时长由这里的定时器收尾。
const props = defineProps<{ state: IslandsState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: IslandsAction] }>();
const v = computed(() => islandsView(props.state));

const shaking = ref<number | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
function stop() {
  if (timer) clearTimeout(timer);
  timer = null;
  shaking.value = null;
}
watch(() => props.state.wrongNum, (w) => {
  if (!w) return;
  stop();
  requestAnimationFrame(() => (shaking.value = w[0]));
  timer = setTimeout(() => (shaking.value = null), SHAKE_MS);
});
useStageStop(stop);
onBeforeUnmount(stop);
</script>

<template>
  <Grid
    :w="v.map.w" :h="v.map.h" :tones="v.tones" :emojis="v.emojis" :labels="v.labels"
    :clickable="clickable" :shake="state.shake" :glow="state.glow" :glow-key="state.glowKey" :t="t"
    @pick="(id: number) => emit('act', { type: 'tap', id })"
  />
  <div v-if="state.phase === 'count'" class="answers" role="group" :aria-label="t(m('islands.group'))">
    <button
      v-for="n in v.choices" :key="n" type="button" class="num-btn" :class="{ wrong: shaking === n }"
      :aria-label="t(m('islands.count', { n }))" @click="emit('act', { type: 'count', n })"
    >{{ n }}</button>
  </div>
</template>

<style scoped>
.answers { display: flex; gap: 12px; }
.num-btn {
  font: 700 1.8rem var(--mono); width: 3.2rem; height: 3.2rem; cursor: pointer;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg);
}
.num-btn:hover { border-color: var(--accent); }
.num-btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.num-btn.wrong { animation: shake 0.5s ease-in-out; }
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .num-btn.wrong { animation: none; border-color: var(--warn); }
}
</style>
