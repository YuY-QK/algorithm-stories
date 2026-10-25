<script setup lang="ts">
import { computed } from 'vue';
import { KID_N, lookFrames } from '../../engine/dynamic-programming';
import BookPager from '../../components/shared/BookPager.vue';
import Stairs from './Stairs.vue';

// 看：会动的绘本。台词和画面全部由 lookFrames 生成，数字和真实的 dp 表一致。
const frames = computed(() => lookFrames(KID_N));
</script>

<template>
  <BookPager :frames="frames" again-label="🔁 从头再看一次">
    <template #default="{ frame: f }">
      <Stairs :n="KID_N" :bunny="f.bunny" :notes="f.notes" :from="f.from" :ask="f.ask" />
    </template>
  </BookPager>
</template>
