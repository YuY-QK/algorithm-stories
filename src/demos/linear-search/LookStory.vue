<script setup lang="ts">
import { lookFrames } from '../../engine/linear-search';
import BookPager from '../../components/shared/BookPager.vue';
import Boxes from './Boxes.vue';

// 看：会动的绘本。每一页的箱子、箭头和台词都由 lookFrames 生成。
const frames = lookFrames();
</script>

<template>
  <BookPager :frames="frames" again-label="🔁 再看一次">
    <template #default="{ frame: f }">
      <Boxes :cells="f.cells" :pointer="f.pointer" :kid="f.kid" label="8 个玩具箱" />
    </template>
  </BookPager>
</template>
