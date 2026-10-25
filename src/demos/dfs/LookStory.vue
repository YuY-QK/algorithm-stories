<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_MAZES, lookFrames, parseMaze } from '../../engine/dfs';
import BookPager from '../../components/shared/BookPager.vue';
import Grid from './Grid.vue';
import { emojisOf, wallsOf } from './view';

// 看：会动的绘本。每一页都由 lookFrames 从 tour（探险家的完整行程，和真实的 DFS 一致）里截一段。
const which = ref(0);
const maze = computed(() => parseMaze(KID_MAZES[which.value]));
const walls = computed(() => wallsOf(maze.value));
const frames = computed(() => lookFrames(maze.value));

function another() {
  which.value = (which.value + 1) % KID_MAZES.length;
}
</script>

<template>
  <BookPager :frames="frames" again-label="🧭 换个山洞再看一次" @again="another">
    <template #default="{ frame: f }">
      <Grid :w="maze.w" :h="maze.h" :walls="walls" :tones="f.tones" :emojis="emojisOf(maze, f.hero, f.crumbs)" />
    </template>
  </BookPager>
</template>
