<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { parseMaze, type BfsStep, type Bug } from '../../../../engine/bfs';
import Maze from './Maze.vue';
import QueueRow from './QueueRow.vue';
import { stepLabels, stepTones } from './view';

// 做：找 bug 的画面。有 bug 的代码在这个迷宫上怎么跑。
const props = defineProps<{ step: BfsStep; bug: Bug; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(props.bug.maze));
</script>

<template>
  <div class="mini">
    <Maze :maze="maze" :tones="stepTones(step)" :labels="stepLabels(step)" :mouse="maze.start" coords :t="t" />
  </div>
  <QueueRow :maze="maze" :queue="step.queue" :dist="step.dist" :max="16" :t="t" />
</template>

<style scoped>
.mini { max-width: 280px; width: 100%; }
</style>
