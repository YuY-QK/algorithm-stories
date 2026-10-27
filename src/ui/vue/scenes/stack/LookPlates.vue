<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { LookPage } from '../../../../engine/stack';
import Plates from './Plates.vue';

// 看：绘本的一页。盘子的状态由引擎生成的页给出，这里只画。
defineProps<{ frame: LookPage; t: (msg: Msg) => string }>();
</script>

<template>
  <Plates :stack="frame.stack" :taken="frame.taken" :room="3" :t="t" />
</template>
