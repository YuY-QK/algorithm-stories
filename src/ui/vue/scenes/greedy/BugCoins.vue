<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { Bug, GreedyStep } from '../../../../engine/greedy';
import CoinRow from './CoinRow.vue';

// 做：找 bug 的面值一排，跟着当前步骤走。
defineProps<{ step: GreedyStep; bug: Bug; t: (msg: Msg) => string }>();
</script>

<template>
  <CoinRow :coins="step.sorted" :c="step.c" :picked="step.picked" />
</template>
