<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { emojisOf, parseMaze, stepLabels, stepTones, wallsOf, type Bug, type DfsStep } from '../../../../engine/dfs';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';

// 做：找 bug 的画面。有 bug 的代码在这个山洞里怎么跑。
const props = defineProps<{ step: DfsStep; bug: Bug; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(props.bug.maze));
</script>

<template>
  <div class="mini">
    <Grid
      :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="stepTones(step, maze)" :labels="stepLabels(step)"
      :emojis="emojisOf(maze, step.cur)" coords :t="t"
    />
  </div>
  <StackRow :stack="step.stack" :max="12" :t="t" />
</template>

<style scoped>
.mini { max-width: 280px; width: 100%; }
</style>
