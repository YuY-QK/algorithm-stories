<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { parseMaze, type LookPage } from '../../../../engine/bfs';
import Maze from './Maze.vue';

// 看：绘本的一页。每一圈水波都由引擎的 lookFrames（按层的 BFS）生成，这里只画。
const props = defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(props.frame.rows));
</script>

<template>
  <Maze :maze="maze" :tones="frame.tones" :labels="frame.labels" :mouse="frame.mouse" :t="t" />
</template>
