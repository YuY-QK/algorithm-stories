<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { ringsView, type RingsAction, type RingsState } from '../../../../engine/bfs';
import Maze from './Maze.vue';

// 玩法一「下一圈」的画面：这一圈有几格（小圆点）和迷宫。点错时格子摇头、太远时上一圈透光，都是 state 里的字段。
const props = defineProps<{ state: RingsState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: RingsAction] }>();
const v = computed(() => ringsView(props.state));
</script>

<template>
  <div v-if="!state.done" class="left" :aria-label="t(m('rings.left', { total: v.total, rest: v.total - state.painted.length }))">
    <span class="wave" aria-hidden="true">🌊 {{ state.ring }}</span>
    <span v-for="(_, k) in v.total" :key="k" class="dot" :class="{ lit: k < state.painted.length }" aria-hidden="true" />
  </div>
  <Maze
    :maze="v.maze" :tones="v.tones" :labels="v.labels" :mouse="v.mouse" :clickable="clickable"
    :shake="state.shake" :glow="state.glow" :glow-key="state.glowKey" :t="t" @pick="(id: number) => emit('act', { type: 'tap', id })"
  />
</template>

<style scoped>
.left { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 1.6em; }
.wave { font: 600 1rem var(--mono); margin-right: 4px; }
.dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--mid); }
.dot.lit { background: var(--mid); }
</style>
