<script setup lang="ts">
import { computed } from 'vue';
import { lookFrames } from '../../engine/greedy';
import BookPager from '../../components/shared/BookPager.vue';
import Shop from './Shop.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，和真实的贪心过程一致。
const frames = computed(() => lookFrames());
</script>

<template>
  <BookPager :frames="frames" again-label="🔁 从头再看">
    <template #default="{ frame: f }">
      <Shop
        :coins="f.coins" :left="f.left" :plate="f.plate" :focus="f.focus" :dim="f.dim"
        :compare="f.compare" compare-icon="✨"
      />
    </template>
  </BookPager>
</template>
