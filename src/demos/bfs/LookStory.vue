<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_MAZES, lookFrames, parseMaze } from '../../engine/bfs';
import BookPager from '../../components/shared/BookPager.vue';
import Maze from './Maze.vue';

// 看：会动的绘本。每一圈水波都由 lookFrames（按层的 BFS）生成，和真实的搜索过程一致。
const which = ref(0);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));
const frames = computed(() => lookFrames(maze.value));

function another() {
  which.value = (which.value + 1) % KID_MAZES.length;
}
</script>

<template>
  <BookPager :frames="frames" again-label="🧀 换个迷宫再看一次" @again="another">
    <template #default="{ frame: f }">
      <Maze :maze="maze" :tones="f.tones" :labels="f.labels" :mouse="f.mouse" />
    </template>
  </BookPager>
</template>
