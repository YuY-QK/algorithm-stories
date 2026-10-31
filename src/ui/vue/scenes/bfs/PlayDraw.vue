<script setup lang="ts">
import { computed } from 'vue';
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';
import { drawView, type DrawAction, type DrawState } from '../../../../engine/bfs';
import Maze from './Maze.vue';

// 玩法二「抄近路」的画面：走了几步、退一步的按钮和迷宫。点回路上的格子退回去由规则处理。
const props = defineProps<{ state: DrawState; clickable: boolean; t: (msg: Msg) => string }>();
const emit = defineEmits<{ act: [action: DrawAction] }>();
const v = computed(() => drawView(props.state));
</script>

<template>
  <div class="bar">
    <span class="count" :aria-label="t(m('draw.count'))">👣 {{ v.steps }}</span>
    <button type="button" class="btn small" :disabled="state.done || state.path.length < 2" :aria-label="t(m('draw.undo'))" @click="emit('act', { type: 'undo' })">↩️</button>
  </div>
  <Maze
    :maze="v.maze" :tones="v.tones" :labels="v.labels" :mouse="state.path[state.path.length - 1]" :clickable="clickable"
    :shake="state.shake" :t="t" @pick="(id: number) => emit('act', { type: 'tap', id })"
  />
</template>

<style scoped>
.bar { display: flex; align-items: center; gap: 12px; }
.count { font: 600 1.2rem var(--mono); min-width: 3.5em; }
</style>
