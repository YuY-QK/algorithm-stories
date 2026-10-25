<script setup lang="ts">
import { lookFrames } from '../../engine/hash-lookup';
import BookPager from '../../components/shared/BookPager.vue';
import Shelves from './Shelves.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成。
const frames = lookFrames();
</script>

<template>
  <BookPager :frames="frames">
    <template #default="{ frame }">
      <div class="scene">
        <div class="hand">
          <span v-if="frame.book !== null" class="held" aria-label="手里的书">📕 {{ frame.book }}</span>
          <span v-if="frame.calc" class="calc">{{ frame.calc }}</span>
        </div>
        <Shelves :piles="frame.piles" :keeper="frame.keeper" :hit="frame.hit" :clash="frame.clash" :miss="frame.miss" />
      </div>
    </template>
  </BookPager>
</template>

<style scoped>
.scene { width: 100%; display: flex; flex-direction: column; gap: 10px; }
.hand { min-height: 2.2em; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.held { font: 700 1.1rem var(--mono); padding: 2px 10px; border-radius: 8px; border: 1.5px solid var(--line); background: var(--surface); }
.calc { font: 600 1rem var(--mono); color: var(--accent); }
</style>
