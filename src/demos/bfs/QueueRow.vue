<script setup lang="ts">
import { computed } from 'vue';
import { coord, type Maze } from '../../engine/bfs';

// 队列内容：队首在左，每个格子写成 (行,列)，下面一行小字是它的 dist。太长时只画前 max 个。
const props = withDefaults(defineProps<{ maze: Maze; queue: number[]; dist: number[]; max?: number }>(), { max: 24 });
const shown = computed(() => props.queue.slice(0, props.max));
</script>

<template>
  <div class="qrow" :aria-label="'队列里有 ' + queue.length + ' 个格子'">
    <span class="qhead">队首 →</span>
    <span v-if="!queue.length" class="qempty">（空）</span>
    <span v-for="(id, k) in shown" :key="k" class="qitem" :class="{ front: k === 0 }">
      {{ coord(maze, id) }}<small>{{ dist[id] }}</small>
    </span>
    <span v-if="queue.length > max" class="qmore">… 共 {{ queue.length }} 个</span>
  </div>
</template>

<style scoped>
.qrow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 2.6em; }
.qhead, .qempty, .qmore { font-size: 13px; color: var(--muted); }
.qitem {
  display: flex; flex-direction: column; align-items: center; line-height: 1.2;
  padding: 3px 6px; border-radius: 6px; border: 1.5px dashed var(--accent); background: var(--bg);
  font: 600 12px var(--mono); font-variant-numeric: tabular-nums;
}
.qitem small { font: 400 10px var(--mono); color: var(--muted); }
.qitem.front { border-style: solid; background: color-mix(in srgb, var(--accent) 18%, var(--bg)); }
</style>
