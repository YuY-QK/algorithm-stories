<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { m } from '../../../../core/i18n';
import { FLASH_MS, SHAKE_MS } from '../../../../core/timing';
import type { Msg } from '../../../../core/types';
import { BACK, DIR_ARROWS, exploreView, type Choice, type ExploreAction, type ExploreState } from '../../../../engine/dfs';
import { useStageStop } from '../../shared/usePlayer';
import Grid from './Grid.vue';

// 玩法一「下一步往哪走」的画面：走了几步、退回几次，山洞，和 ↑←→↓ 加「退回」五个键。
// 选错时方向键晃一下（padShake）、该走的方向键闪光（padGlow）、没路时「退回」键闪光（stuck），都是 state 里的字段；
// 键上的晃动和闪光的时长由这里的定时器收尾。
const props = defineProps<{ state: ExploreState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: ExploreAction] }>();
const v = computed(() => exploreView(props.state));

const shaking = ref<Choice | null>(null);
const glowing = ref<Choice | null>(null);
let timers: ReturnType<typeof setTimeout>[] = [];
function stopTimers() {
  timers.forEach(clearTimeout);
  timers = [];
  shaking.value = null;
  glowing.value = null;
}
function flash(target: typeof shaking, c: Choice, ms: number) {
  target.value = null;
  requestAnimationFrame(() => (target.value = c));
  timers.push(setTimeout(() => (target.value = null), ms));
}
watch(() => props.state.padShake, (p) => p && flash(shaking, p[0], SHAKE_MS));
watch(() => props.state.padGlow, (p) => p && flash(glowing, p[0], FLASH_MS));
useStageStop(stopTimers);
onBeforeUnmount(stopTimers);

const PAD: { c: Choice; area: string }[] = [
  { c: 0, area: 'up' }, { c: 3, area: 'left' }, { c: 1, area: 'right' }, { c: 2, area: 'down' },
];
const DIR = [m('dir.0'), m('dir.1'), m('dir.2'), m('dir.3')];
const ORDER = [1, 2, 3, 4]; // 方向 0～3 对应的顺序号：上右下左 = ①②③④
</script>

<template>
  <div class="bar">
    <span class="count" :aria-label="t(m('explore.steps'))">👣 {{ state.steps }}</span>
    <span class="count" :aria-label="t(m('explore.backs'))">↩️ {{ state.backs }}</span>
  </div>
  <Grid
    :w="v.maze.w" :h="v.maze.h" :walls="v.walls" :tones="v.tones" :emojis="v.emojis"
    :shake="state.shake" :glow="state.glow" :glow-key="state.glowKey" :t="t"
  />
  <div v-if="!state.done" class="pad" role="group" :aria-label="t(m('explore.pad'))">
    <button
      v-for="p in PAD" :key="p.c" type="button" class="key" :style="{ gridArea: p.area }"
      :class="{ shake: shaking === p.c, glow: glowing === p.c }"
      :aria-label="t(m('explore.key', { n: ORDER[p.c], dir: DIR[p.c] }))" @click="emit('act', { type: 'choose', c: p.c })"
    >
      <span class="arrow">{{ DIR_ARROWS[p.c] }}</span>
      <span class="ord" aria-hidden="true">{{ ORDER[p.c] }}</span>
    </button>
    <button
      type="button" class="key back" :class="{ shake: shaking === BACK, hint: v.stuck }"
      style="grid-area: mid" :aria-label="t(m('explore.backKey'))" @click="emit('act', { type: 'choose', c: BACK })"
    >
      <span class="arrow">↩️</span>
    </button>
  </div>
  <p v-if="!state.done" class="small-note">{{ t(m('explore.legend')) }}</p>
</template>

<style scoped>
.bar { display: flex; gap: 16px; }
.count { font: 600 1.2rem var(--mono); }
.pad {
  display: grid; gap: 8px; width: 210px; max-width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas: '. up .' 'left mid right' '. down .';
}
.key {
  font: inherit; position: relative; aspect-ratio: 1; cursor: pointer; display: grid; place-items: center;
  border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); color: var(--fg); padding: 0;
}
.key:hover { border-color: var(--accent); }
.key:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.arrow { font-size: clamp(1.3rem, 6vw, 1.9rem); line-height: 1; }
.ord {
  position: absolute; top: 3px; left: 5px; font: 700 12px var(--mono); color: var(--muted);
}
.key.back { background: var(--bg); }
.key.hint, .key.glow { animation: glow 0.9s ease-in-out infinite; }
.key.glow { animation-iteration-count: 2; }
.key.shake { animation: shake 0.5s ease-in-out; }
@keyframes glow {
  50% { box-shadow: 0 0 0 3px var(--mid), 0 0 14px 4px var(--mid); transform: scale(1.08); }
}
@keyframes shake {
  20%, 60% { transform: translateX(-4px) rotate(-6deg); }
  40%, 80% { transform: translateX(4px) rotate(6deg); }
}
@media (prefers-reduced-motion: reduce) {
  .key.hint, .key.glow, .key.shake { animation: none; }
  .key.hint, .key.glow { box-shadow: 0 0 0 3px var(--mid); }
}
</style>
