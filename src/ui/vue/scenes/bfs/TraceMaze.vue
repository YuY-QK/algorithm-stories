<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { TRACE_MAZES, parseMaze, type BfsStep, type TraceInput } from '../../../../engine/bfs';
import Maze from './Maze.vue';
import QueueRow from './QueueRow.vue';
import { stepLabels, stepTones } from './view';

// 做：逐步执行的画面。迷宫和队列同步，队列里每个格子下面写它的 dist。
const props = defineProps<{ input: TraceInput; step: BfsStep; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(TRACE_MAZES[props.input.which].rows));
</script>

<template>
  <Maze :maze="maze" :tones="stepTones(step)" :labels="stepLabels(step)" :mouse="maze.start" coords :t="t" />
  <QueueRow :maze="maze" :queue="step.queue" :dist="step.dist" :t="t" />
</template>
