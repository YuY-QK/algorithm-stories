<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { InsertionStep, TraceInput } from '../../../../engine/insertion-sort';
import SortRow from './SortRow.vue';

// 做：逐步执行的一排格子。key 悬在空位上方，标出 i、j、正在比较的格子和排好的部分。
defineProps<{ input: TraceInput; step: InsertionStep; t: (msg: Msg) => string }>();
</script>

<template>
  <SortRow :step="step" />
</template>
