<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { MergeStep, TraceInput } from '../../../../engine/merge-sort';
import MergeView from './MergeView.vue';

// 做：逐步执行的画面。当前区间、mid、调用栈、临时数组和 i、j 同步。
defineProps<{ input: TraceInput; step: MergeStep; t: (msg: Msg) => string }>();
</script>

<template>
  <MergeView :step="step" :t="t" />
</template>
