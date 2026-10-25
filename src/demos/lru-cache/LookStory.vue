<script setup lang="ts">
import { computed } from 'vue';
import { KID_CAP, LOOK_BOOKS, lookFrames } from '../../engine/lru-cache';
import BookPager from '../../components/shared/BookPager.vue';
import Desk from './Desk.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的 LRU 过程一致。
const frames = computed(() => lookFrames());
</script>

<template>
  <BookPager :frames="frames" again-label="📖 再看一遍">
    <template #default="{ frame: f }">
      <Desk :cap="KID_CAP" :desk="f.desk" :books="LOOK_BOOKS" :pulse="f.pulse" :glow="f.glow" />
      <p class="trips" :aria-label="'已经跑了 ' + f.trips + ' 趟书架'">
        <span v-for="t in f.trips" :key="t">🚶</span>
        <small v-if="!f.trips">还没跑书架</small>
      </p>
    </template>
  </BookPager>
</template>

<style scoped>
.trips { min-height: 1.8em; font-size: 1.2rem; display: flex; flex-wrap: wrap; gap: 2px; align-items: center; }
.trips small { font-size: 13px; color: var(--muted); }
</style>
