<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { TRACE_MAZES, emojisOf, parseMaze, stepLabels, stepTones, wallsOf, type DfsStep, type TraceInput } from '../../../../engine/dfs';
import Grid from './Grid.vue';
import StackRow from './StackRow.vue';

// 做：逐步执行的画面。山洞和调用栈同步：栈里的格子是现在这条路，格子上的数字是被标记的先后。
const props = defineProps<{ input: TraceInput; step: DfsStep; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(TRACE_MAZES[props.input.which].rows));
</script>

<template>
  <Grid
    :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="stepTones(step, maze)" :labels="stepLabels(step)"
    :emojis="emojisOf(maze, step.cur)" coords :t="t"
  />
  <StackRow :stack="step.stack" :t="t" />
</template>
