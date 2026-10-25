<script setup lang="ts">
import { lookFrames } from '../../engine/stack';
import BookPager from '../../components/shared/BookPager.vue';
import Plates from './Plates.vue';

// 看：会动的绘本。每一页的盘子和台词都由 lookFrames 生成。
const frames = lookFrames();
</script>

<template>
  <BookPager :frames="frames" again-label="🔁 再看一次">
    <template #default="{ frame: f }">
      <Plates :stack="f.stack" :taken="f.taken" :room="3" :glow-top="false" />
    </template>
  </BookPager>
</template>
