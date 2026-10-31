<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { DpStep, TraceInput } from '../../../../engine/dynamic-programming';
import DpRow from './DpRow.vue';

// 做：逐步执行的 dp 表。当前要填的 i、正在读的两格、刚刚写进去的那一格跟着步骤走。
defineProps<{ input: TraceInput; step: DpStep; t: (msg: Msg) => string }>();
</script>

<template>
  <DpRow :dp="step.dp.slice(0, input.n + 1)" :cur="step.i !== null && step.i <= input.n ? step.i : null" :from="step.from" :fresh="step.fresh" :t="t" />
</template>
