<script setup lang="ts">
import type { Msg } from '../../../../core/types';
import type { BubbleStep, TraceInput } from '../../../../engine/bubble-sort';
import Bars from './Bars.vue';

// 做：逐步执行的柱子。黄色是正在比较的一对，红框是正在交换的一对，绿色是已经站好的。
defineProps<{ input: TraceInput; step: BubbleStep; t: (msg: Msg) => string }>();
</script>

<template>
  <Bars :items="step.a" :j="step.j" :hl="step.hl" :sorted-from="step.sortedFrom" />
</template>
