<script setup lang="ts">
import { computed, ref } from 'vue';
import { KID_N, STORY, genCandies, lookFrames } from '../../engine/selection-sort';
import BookPager from '../../components/shared/BookPager.vue';
import Candies from './Candies.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的选择排序一致。
const start = ref<number[]>(STORY.slice());
const frames = computed(() => lookFrames(start.value));

function another() {
  start.value = genCandies(KID_N);
}
</script>

<template>
  <BookPager :frames="frames" again-label="🍬 换一排糖果再看一次" @again="another">
    <template #default="{ frame }">
      <Candies :values="frame.values" :sorted="frame.sorted" :bear="frame.bear" :glow="frame.glow" />
    </template>
  </BookPager>
</template>
