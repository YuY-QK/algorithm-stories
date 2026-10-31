<script setup lang="ts">
import { computed } from 'vue';
import type { Msg } from '../../../../core/types';
import { emojisOf, parseMaze, wallsOf, type LookPage } from '../../../../engine/dfs';
import Grid from './Grid.vue';

// 看：绘本的一页。每一页都由引擎的 lookFrames 从 tour（探险家的完整行程，和真实的 DFS 一致）里截一段，这里只画。
const props = defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
const maze = computed(() => parseMaze(props.frame.rows));
</script>

<template>
  <Grid
    :w="maze.w" :h="maze.h" :walls="wallsOf(maze)" :tones="frame.tones" :emojis="emojisOf(maze, frame.hero, frame.crumbs)" :t="t"
  />
</template>
