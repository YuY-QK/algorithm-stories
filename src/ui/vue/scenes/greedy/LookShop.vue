<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/greedy';
import Shop from './Shop.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画小卖部。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Shop
    :coins="frame.coins" :left="frame.left" :plate="frame.plate" :focus="frame.focus" :dim="frame.dim"
    :compare="frame.compare" compare-icon="✨" :t="t"
  />
</template>
