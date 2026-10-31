<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/selection-sort';
import Candies from './Candies.vue';

// 看：绘本一页的画面。台词由 Book 控件显示，这里只画小熊和糖果。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Candies :values="frame.values" :sorted="frame.sorted" :bear="frame.bear" :glow="frame.glow" :t="t" />
</template>
